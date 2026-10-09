import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, ApiError, newIdempotencyKey } from "@/adapter";
import { Card, DefRow, ForbiddenState, Notice, PageHeader, SelectField, TextField, focusFirstInvalid } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { can } from "@/domain/permissions";
import { buildRfc3339, deviceTimeZone, displayDeclared, nowLocalParts, parseOffset, parseWall, resolveZoned, rfcToEpoch, toUtcIso } from "@/domain/time";
import { labHead, useLabContext } from "@/features/lab/useLab";

export const Route = createFileRoute("/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/new")({
  head: labHead("Registrar coleta", "Registro da data e hora de ocorrência da coleta com revisão antes da confirmação."),
  component: NewCollection,
});

function NewCollection() {
  const { laboratoryId, areaId } = Route.useParams();
  const ctx = useLabContext(laboratoryId);
  const area = useQuery({ queryKey: ["area", laboratoryId, areaId], queryFn: () => api.getArea(laboratoryId, areaId) });
  // Inicialização ÚNICA com o momento do dispositivo; preservada em renderizações, revisão e falhas.
  const [parts, setParts] = useState(() => nowLocalParts());
  const tz = useMemo(() => deviceTimeZone(), []);
  const [mode, setMode] = useState<"device" | "manual">("device");
  const [manualOffset, setManualOffset] = useState("-03:00");
  const [ambiguousChoice, setAmbiguousChoice] = useState("");
  const [errors, setErrors] = useState<{ date?: string; time?: string; offset?: string }>({});
  const [step, setStep] = useState<"form" | "review">("form");
  const [key, setKey] = useState(() => newIdempotencyKey()); // estável por tentativa
  const ref = useRef<HTMLFormElement>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const zoned = mode === "device" ? resolveZoned(parts, tz) : null;
  const offset = mode === "manual" ? manualOffset.trim() : zoned?.kind === "ok" ? zoned.offset : zoned?.kind === "ambiguous" ? ambiguousChoice : "";
  const rfc = offset ? buildRfc3339(parts, offset) : null;

  const m = useMutation({
    mutationFn: (occurredAt: string) => api.createCollection(laboratoryId, areaId, occurredAt, key),
    onSuccess: ({ collection }) => {
      qc.invalidateQueries();
      toast.success("Coleta confirmada.");
      navigate({ to: "/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId", params: { laboratoryId, areaId, collectionId: collection.id } });
    },
  });

  if (ctx && !can(ctx, "registerCollection")) return <ForbiddenState />;

  function review(e: FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!parts.date) errs.date = "Campo obrigatório.";
    if (!parts.time) errs.time = "Campo obrigatório.";
    if (parts.date && parts.time && !parseWall(parts)) errs.date = "Data ou hora inválida no calendário.";
    if (mode === "manual" && parseOffset(manualOffset) === null) errs.offset = "Offset inválido. Use ±HH:MM entre -14:00 e +14:00 (ex.: -03:00, +05:45). -00:00 não é aceito.";
    if (mode === "device" && zoned?.kind === "gap") errs.time = "Esta hora não existe no fuso do dispositivo (mudança de horário). Ajuste a hora ou informe o offset manualmente.";
    if (mode === "device" && zoned?.kind === "ambiguous" && !ambiguousChoice) errs.offset = "Esta hora se repete na mudança de horário. Escolha o offset.";
    if (!errs.date && !errs.time && !errs.offset && rfc) {
      const ep = rfcToEpoch(rfc);
      if (ep !== null && ep > Date.now()) errs.time = "A ocorrência não pode ser posterior ao momento atual.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstInvalid(ref.current);
    setStep("review");
  }

  const crumbs = [{ label: "Áreas", to: "/dashboard/laboratories/$laboratoryId/areas", params: { laboratoryId } }, { label: area.data?.area.name ?? "Área", to: "/dashboard/laboratories/$laboratoryId/areas/$areaId", params: { laboratoryId, areaId } }, { label: "Registrar coleta" }];
  const err = m.error instanceof ApiError ? m.error : null;

  if (step === "review" && rfc) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Revise a coleta antes de confirmar" crumbs={crumbs} />
        <Card>
          <dl>
            <DefRow label="Laboratório">{ctx?.name}</DefRow>
            <DefRow label="Área">{area.data?.area.name}</DefRow>
            <DefRow label="Ocorrência (hora declarada)">{displayDeclared(rfc)}</DefRow>
            <DefRow label="Offset">{offset === "Z" ? "UTC (Z)" : `UTC${offset}`}</DefRow>
            <DefRow label="Mesmo instante em UTC">{toUtcIso(rfc)}</DefRow>
            <DefRow label="Valor enviado (RFC3339)"><code className="break-all text-xs">{rfc}</code></DefRow>
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">Após confirmar, a coleta não pode ser editada nem apagada. Medições e diagnóstico são registrados depois, separadamente.</p>
          {m.isError && (
            <div className="mt-4"><Notice tone="danger" role="alert">
              {err?.isNetwork ? "Resultado desconhecido: não foi possível confirmar com o servidor. Tente novamente — a mesma tentativa não cria duplicata." : err?.message}
            </Notice></div>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={m.isPending} onClick={() => { setStep("form"); if (!err?.isNetwork) setKey(newIdempotencyKey()); }}>Corrigir</Button>
            <Button disabled={m.isPending} onClick={() => m.mutate(rfc)}>{m.isPending && <Loader2 className="animate-spin" aria-hidden />} Confirmar coleta</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Registrar coleta" subtitle={area.data ? `${ctx?.name} · ${area.data.area.name}` : undefined}
        back={{ to: "/dashboard/laboratories/$laboratoryId/areas/$areaId", params: { laboratoryId, areaId }, label: "Voltar à área" }} crumbs={crumbs} />
      <Card>
        <form ref={ref} onSubmit={review} noValidate className="space-y-5">
          <p className="text-sm text-muted-foreground">Laboratório e área já estão definidos pelo contexto. A autoria é registrada pelo sistema.</p>
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold">Data e hora da ocorrência</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Data" type="date" required value={parts.date} onChange={(e) => { setParts({ ...parts, date: e.target.value }); setAmbiguousChoice(""); }} error={errors.date} />
              <TextField label="Hora" type="time" step="0.001" required value={parts.time} onChange={(e) => { setParts({ ...parts, time: e.target.value }); setAmbiguousChoice(""); }} error={errors.time} hint="Segundos e milissegundos são preservados." />
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-base font-semibold">Fuso horário</legend>
            <label className="flex min-h-11 items-center gap-3 text-sm"><input type="radio" name="tz" className="h-5 w-5 accent-[var(--primary)]" checked={mode === "device"} onChange={() => setMode("device")} /> Fuso do dispositivo ({tz}{zoned?.kind === "ok" ? `, UTC${zoned.offset}` : ""})</label>
            <label className="flex min-h-11 items-center gap-3 text-sm"><input type="radio" name="tz" className="h-5 w-5 accent-[var(--primary)]" checked={mode === "manual"} onChange={() => setMode("manual")} /> Offset UTC manual</label>
            {mode === "manual" && (
              <TextField label="Offset UTC" required value={manualOffset} onChange={(e) => setManualOffset(e.target.value)} error={errors.offset} hint="Formato ±HH:MM, ou Z para UTC. Ex.: -03:00, Z, +05:45." />
            )}
            {mode === "device" && zoned?.kind === "ambiguous" && (
              <SelectField label="Offset para hora repetida" required value={ambiguousChoice} onChange={(e) => setAmbiguousChoice(e.target.value)} error={errors.offset}
                options={zoned.offsets.map((o) => ({ value: o, label: `UTC${o}` }))} hint="Esta hora ocorre duas vezes na mudança de horário." />
            )}
          </fieldset>
          {rfc && <p role="status" className="rounded-[10px] bg-secondary px-3 py-2 text-sm">Será enviado: <code className="break-all">{rfc}</code> = <code>{toUtcIso(rfc)}</code></p>}
          <div className="flex justify-end"><Button type="submit">Revisar</Button></div>
        </form>
      </Card>
    </div>
  );
}
