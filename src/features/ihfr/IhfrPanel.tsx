import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError, newIdempotencyKey } from "@/adapter";
import { DefRow, DemoTag, ErrorState, LoadingState, Notice, SelectField, StatusBadge, TextAreaField, TextField } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { componentLabel, dataQualityLabel, fmtDateTime, fmtDecimal, IHFR_VERSIONS, ihfrClassLabel, insufficiencyLabel, landUseLabel, lifecycleLabel, provenanceLabel, SCIENTIFIC_NOTICE } from "@/domain/labels";
import { formatOffset, nowLocalParts, buildRfc3339, toUtcIso } from "@/domain/time";
import type { DiagnosisRequest, LabContext, LandUseType, OperationResponse, ProvenanceKind, PublicDiagnosis } from "@/domain/types";
import { can } from "@/domain/permissions";

interface Props { labId: string; areaId: string; collectionId: string; ctx: LabContext | undefined }

type Attempt = { key: string; kind: "diagnosis"; body: DiagnosisRequest } | { key: string; kind: "revoke"; diagnosisId: string; body: { expectedCurrentDiagnosisId: string; reason: string } };
type OpState = { status: "idle" } | { status: "pending"; attempt: Attempt } | { status: "unknown"; attempt: Attempt; recoveryMsg?: string } | { status: "done"; result: OperationResponse; refreshError?: boolean } | { status: "error"; message: string; incompatible?: boolean };

const classTone = { LOW: "green", MODERATE: "ochre", HIGH: "red", CRITICAL: "red" } as const;

export function IhfrPanel({ labId, areaId, collectionId, ctx }: Props) {
  const qc = useQueryClient();
  const manage = can(ctx, "manageIhfr");
  const current = useQuery({ queryKey: ["ihfr-current", collectionId], queryFn: () => api.currentDiagnosis(labId, areaId, collectionId) });
  const [landUse, setLandUse] = useState<"" | LandUseType>("");
  const [provKind, setProvKind] = useState<ProvenanceKind | "">("");
  const init = nowLocalParts();
  const [obsDate, setObsDate] = useState("");
  const [obsTime, setObsTime] = useState("");
  const [formErr, setFormErr] = useState<Record<string, string>>({});
  const elig = useQuery({ queryKey: ["ihfr-elig", collectionId, landUse], queryFn: () => api.eligibility(labId, areaId, collectionId, landUse || undefined), enabled: manage });
  const [op, setOp] = useState<OpState>({ status: "idle" });
  const [confirm, setConfirm] = useState<null | "CREATE" | "REPLACE">(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [previous, setPrevious] = useState<string[]>([]);

  const diag = current.data?.diagnosis ?? null;

  async function refresh(): Promise<boolean> {
    try {
      await Promise.all([current.refetch({ throwOnError: true }), elig.refetch()]);
      return true;
    } catch { return false; }
  }

  async function finish(result: OperationResponse, prevId?: string | null) {
    if (result.outcome === "SUCCEEDED" && prevId) setPrevious((p) => [prevId, ...p.filter((x) => x !== prevId)]);
    const ok = await refresh();
    qc.invalidateQueries({ queryKey: ["ihfr-elig", collectionId] });
    setOp({ status: "done", result, refreshError: !ok });
    if (result.outcome === "SUCCEEDED") toast.success("Operação IHFR concluída.");
  }

  async function run(attempt: Attempt) {
    setOp({ status: "pending", attempt });
    const prevId = attempt.kind === "revoke" ? attempt.diagnosisId : attempt.body.expectedCurrentDiagnosisId ?? null;
    try {
      const r = attempt.kind === "diagnosis"
        ? await api.createDiagnosis(labId, areaId, collectionId, attempt.body, attempt.key)
        : await api.revokeDiagnosis(labId, areaId, collectionId, attempt.diagnosisId, attempt.body, attempt.key);
      await finish(r, attempt.kind === "revoke" ? attempt.diagnosisId : prevId);
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      if (!err || err.isNetwork) setOp({ status: "unknown", attempt }); // resultado desconhecido: preservar chave e body
      else if (err.code === "INCOMPATIBLE_VERSION") { setOp({ status: "error", message: "Versão incompatível: a combinação de contratos não é aceita pelo servidor. Nenhum diagnóstico foi criado.", incompatible: true }); refresh(); }
      else if (err.status === 409) { setOp({ status: "error", message: `${err.message} Os dados foram atualizados.` }); refresh(); }
      else setOp({ status: "error", message: err.message });
    }
  }

  async function recover(attempt: Attempt) {
    try {
      const r = await api.getOperation(labId, areaId, collectionId, attempt.key);
      await finish(r, attempt.kind === "revoke" ? attempt.diagnosisId : attempt.body.expectedCurrentDiagnosisId ?? null);
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      setOp({ status: "unknown", attempt, recoveryMsg: err?.status === 404 ? "Não há resultado terminal recuperável para esta tentativa. Você pode repetir exatamente a mesma tentativa." : "Não foi possível consultar a operação. Tente novamente." });
    }
  }

  function prepare(mode: "CREATE" | "REPLACE") {
    const errs: Record<string, string> = {};
    if (!provKind) errs.provKind = "Campo obrigatório.";
    if (!obsDate) errs.obsDate = "Campo obrigatório.";
    if (!obsTime) errs.obsTime = "Campo obrigatório.";
    const off = formatOffset(-new Date().getTimezoneOffset());
    const rfc = obsDate && obsTime ? buildRfc3339({ date: obsDate, time: obsTime }, off) : null;
    if (obsDate && obsTime && !rfc) errs.obsDate = "Data ou hora inválida.";
    setFormErr(errs);
    if (Object.keys(errs).length) return;
    setConfirm(mode);
  }

  function buildBody(mode: "CREATE" | "REPLACE"): DiagnosisRequest {
    const off = formatOffset(-new Date().getTimezoneOffset());
    const observedAt = toUtcIso(buildRfc3339({ date: obsDate, time: obsTime }, off)!)!;
    const { inputContractVersion, ...versions } = IHFR_VERSIONS;
    return {
      mode,
      expectedCurrentDiagnosisId: mode === "REPLACE" ? diag!.id : null,
      supplement: { inputContractVersion, ...(landUse ? { landUseType: landUse } : {}), provenance: { kind: provKind as ProvenanceKind, observedAt } },
      versions,
    };
  }

  const busy = op.status === "pending";

  return (
    <section aria-labelledby="ihfr-title" className="space-y-4 rounded-[20px] bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ihfr-title" className="flex items-center gap-2 text-xl font-bold"><FlaskConical className="h-5 w-5 text-ochre" aria-hidden /> Diagnóstico IHFR experimental</h2>
        <DemoTag>Resultado simulado — demonstração</DemoTag>
      </div>
      <Notice tone="warning">{SCIENTIFIC_NOTICE}.</Notice>

      {current.isPending ? <LoadingState label="Consultando diagnóstico vigente…" /> : current.isError ? <ErrorState error={current.error} onRetry={() => current.refetch()} /> : diag ? (
        <DiagnosisCard d={diag} />
      ) : (
        <div role="status" className="rounded-[10px] border border-dashed border-input p-5 text-center">
          <p className="font-semibold">Sem diagnóstico experimental vigente</p>
          <p className="mt-1 text-sm text-muted-foreground">O diagnóstico nunca é calculado automaticamente.</p>
        </div>
      )}

      {previous.map((id) => <PreviousRecord key={id} id={id} labId={labId} areaId={areaId} collectionId={collectionId} />)}

      {op.status === "done" && (
        <div className="space-y-2">
          {op.result.outcome === "INSUFFICIENT_DATA" && (
            <Notice tone="warning" role="alert">
              <p className="font-semibold">Dados insuficientes — nenhum diagnóstico foi criado{diag ? " e o vigente foi mantido" : ""}.</p>
              <ul className="mt-1 list-disc pl-5">{op.result.insufficiencyReasons.map((r) => <li key={r}>{insufficiencyLabel[r]} <code className="text-xs">({r})</code></li>)}</ul>
            </Notice>
          )}
          {op.result.outcome === "SUCCEEDED" && <Notice tone="success" role="status">Operação confirmada pelo servidor.</Notice>}
          {op.refreshError && <Notice tone="danger" role="alert">A operação foi concluída, mas não foi possível atualizar o diagnóstico vigente. <button className="underline" onClick={() => refresh().then((ok) => ok && setOp({ ...op, refreshError: false }))}>Atualizar</button></Notice>}
        </div>
      )}
      {op.status === "error" && <Notice tone="danger" role="alert">{op.message}</Notice>}
      {op.status === "unknown" && (
        <Notice tone="danger" role="alert">
          <p className="font-semibold">Resultado desconhecido</p>
          <p>Não foi possível confirmar com o servidor. Isso não significa sucesso nem ausência de diagnóstico.</p>
          {op.recoveryMsg && <p className="mt-1">{op.recoveryMsg}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => recover(op.attempt)}>Recuperar operação</Button>
            <Button onClick={() => run(op.attempt)}>Repetir a mesma tentativa</Button>
          </div>
          <p className="mt-2 text-xs">Chave da tentativa: <code>{op.attempt.key}</code></p>
        </Notice>
      )}

      {!manage ? (
        <p className="text-sm text-muted-foreground">{ctx?.readOnly ? "Laboratório inativo — somente leitura." : "Somente proprietários e administradores do laboratório gerenciam diagnósticos."}</p>
      ) : (
        <div className="space-y-4 border-t border-border pt-4">
          <h3 className="font-semibold">{diag ? "Substituir ou revogar" : "Solicitar diagnóstico"}</h3>
          <SelectField label="Uso predominante da terra" value={landUse} onChange={(e) => setLandUse(e.target.value as LandUseType | "")} placeholder="Indeterminado ou ausente"
            options={Object.entries(landUseLabel).map(([value, label]) => ({ value, label }))}
            hint="Selecione um único uso predominante. Se não puder determinar, mantenha indeterminado; pode haver insuficiência de dados. Solo exposto aqui é uma categoria territorial, diferente do percentual de solo exposto nos dados ambientais." />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Origem" required value={provKind} onChange={(e) => setProvKind(e.target.value as ProvenanceKind)} error={formErr.provKind} options={Object.entries(provenanceLabel).map(([value, label]) => ({ value, label }))} />
            <TextField label="Data da observação" type="date" required value={obsDate} onChange={(e) => setObsDate(e.target.value)} error={formErr.obsDate} max={init.date} />
            <TextField label="Hora da observação" type="time" step="1" required value={obsTime} onChange={(e) => setObsTime(e.target.value)} error={formErr.obsTime} hint={`Fuso do dispositivo (UTC${formatOffset(-new Date().getTimezoneOffset())}); enviada em UTC.`} />
          </div>
          <p className="text-xs text-muted-foreground">A data da observação é distinta da ocorrência da coleta e não é preenchida automaticamente.</p>
          {elig.data && (
            <div role="status" className="text-sm">
              {elig.data.eligible ? <StatusBadge tone="green">Elegível segundo o servidor</StatusBadge> : (
                <div className="space-y-1"><StatusBadge tone="ochre">Insuficiente no momento</StatusBadge>
                  <ul className="list-disc pl-5 text-muted-foreground">{elig.data.reasons.map((r) => <li key={r}>{insufficiencyLabel[r]}</li>)}</ul></div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {diag ? (
              <>
                <Button disabled={busy} onClick={() => prepare("REPLACE")}>Substituir diagnóstico</Button>
                <Button variant="outline" disabled={busy} onClick={() => { setReason(""); setRevokeOpen(true); }}>Revogar</Button>
              </>
            ) : (
              <Button disabled={busy} onClick={() => prepare("CREATE")}>Solicitar diagnóstico</Button>
            )}
            {busy && <span role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Processando…</span>}
          </div>
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "REPLACE" ? "Substituir o diagnóstico vigente?" : "Solicitar diagnóstico experimental?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "REPLACE" ? "Se houver resultado suficiente, um novo registro será criado e o atual ficará como Substituído. Uma tentativa insuficiente não altera o vigente." : "O servidor verifica a elegibilidade e calcula o resultado. Nada é calculado neste navegador."}
              {" "}Uso: {landUse ? landUseLabel[landUse] : "Indeterminado ou ausente"}. Origem: {provKind ? provenanceLabel[provKind] : "—"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button onClick={() => { const mode = confirm!; setConfirm(null); run({ key: newIdempotencyKey(), kind: "diagnosis", body: buildBody(mode) }); }}>Confirmar</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar o diagnóstico vigente?</AlertDialogTitle>
            <AlertDialogDescription>O registro permanece como Revogado e deixa de ser vigente. Informe o motivo.</AlertDialogDescription>
          </AlertDialogHeader>
          <TextAreaField label="Motivo da revogação" required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} hint={`${reason.trim().length}/500 caracteres.`} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={reason.trim().length < 1 || reason.trim().length > 500}
              onClick={() => { setRevokeOpen(false); run({ key: newIdempotencyKey(), kind: "revoke", diagnosisId: diag!.id, body: { expectedCurrentDiagnosisId: diag!.id, reason: reason.trim() } }); }}>
              Confirmar revogação
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function DiagnosisCard({ d }: { d: PublicDiagnosis }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Score exibido" value={fmtDecimal(d.displayScore, 2)} />
        <Metric label="Classe" value={ihfrClassLabel[d.ihfrClass]} badge={<StatusBadge tone={classTone[d.ihfrClass]}>{d.ihfrClass}</StatusBadge>} />
        <Metric label="Qualidade dos dados" value={dataQualityLabel[d.dataQuality]} />
        <Metric label="Estado" value={lifecycleLabel[d.lifecycleState]} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["W", "S", "V", "T"] as const).map((k) => (
          <div key={k} className="rounded-[10px] bg-secondary p-3">
            <p className="text-xs text-muted-foreground">{k} · {componentLabel[k]}{d.drivers.includes(k) && " · destaque"}</p>
            <p className="text-lg font-bold">{fmtDecimal(d.componentScores[k], 2)}</p>
          </div>
        ))}
      </div>
      <p className="text-sm">{d.explanation}</p>
      <details className="rounded-[10px] border border-border p-3 text-sm">
        <summary className="min-h-11 cursor-pointer content-center font-semibold">Detalhes técnicos e origem</summary>
        <dl className="mt-2">
          <DefRow label="ID do diagnóstico"><code className="break-all text-xs">{d.id}</code></DefRow>
          <DefRow label="Conjunto ambiental"><code className="break-all text-xs">{d.environmentalMeasurementSetId}</code></DefRow>
          <DefRow label="Suplemento"><code className="break-all text-xs">{d.inputSupplementId}</code></DefRow>
          <DefRow label="Score bruto">{fmtDecimal(d.rawScore)}</DefRow>
          <DefRow label="Calculado em">{fmtDateTime(d.calculatedAt)}</DefRow>
          <DefRow label="Vigente desde">{fmtDateTime(d.validFrom)}</DefRow>
          <DefRow label="Transição">{d.transitionedAt ? fmtDateTime(d.transitionedAt) : "—"}</DefRow>
          {Object.entries(d.versions).map(([k, v]) => <DefRow key={k} label={k}><code className="break-all text-xs">{v}</code></DefRow>)}
          <DefRow label="Estado científico">{d.scientificState}</DefRow>
          <DefRow label="Qualificadores"><span className="flex flex-wrap justify-end gap-1">{d.scientificLabels.map((l) => <code key={l} className="text-xs">{l}</code>)}</span></DefRow>
        </dl>
      </details>
    </div>
  );
}

function Metric({ label, value, badge }: { label: string; value: string; badge?: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {badge}
    </div>
  );
}

function PreviousRecord({ id, labId, areaId, collectionId }: { id: string; labId: string; areaId: string; collectionId: string }) {
  const q = useQuery({ queryKey: ["ihfr", id], queryFn: () => api.getDiagnosis(labId, areaId, collectionId, id) });
  if (!q.data) return null;
  const d = q.data.diagnosis;
  return (
    <details className="rounded-[10px] border border-border bg-secondary/50 p-3 text-sm">
      <summary className="min-h-11 cursor-pointer content-center font-semibold">Registro anterior conhecido — {lifecycleLabel[d.lifecycleState]} em {d.transitionedAt ? fmtDateTime(d.transitionedAt) : "—"}</summary>
      <div className="mt-3"><DiagnosisCard d={d} /></div>
    </details>
  );
}
