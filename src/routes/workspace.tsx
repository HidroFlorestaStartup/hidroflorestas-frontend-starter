import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Lock, Plus, Settings } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/adapter";
import { AppShell } from "@/components/hf/AppShell";
import { Card, ErrorState, LoadingState, Notice, StatusBadge, TextField, focusFirstInvalid } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, labStatusLabel } from "@/domain/labels";
import type { LaboratorySummary } from "@/domain/types";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace — HidroFlorestas" },
      { name: "description", content: "Escolha ou crie o laboratório de monitoramento que deseja acessar." },
      { property: "og:title", content: "Workspace — HidroFlorestas" },
      { property: "og:description", content: "Escolha ou crie um laboratório IHFR." },
    ],
  }),
  component: () => <AppShell><Workspace /></AppShell>,
});

const LIMIT = 5;

function Workspace() {
  const { session } = useSession();
  const q = useQuery({ queryKey: ["labs"], queryFn: () => api.listLaboratories() });
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsLab, setSettingsLab] = useState<LaboratorySummary | null>(null);

  if (q.isPending) return <LoadingState label="Carregando laboratórios…" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const labs = q.data;
  const atLimit = labs.length >= LIMIT;

  return (
    <div className="space-y-8">
      <section className="text-center">
        <p className="text-2xl font-bold text-ochre sm:text-3xl">Olá, {session?.user.firstName}!</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-4xl">Bem-vindo ao Ambiente de Análises <span className="text-water-strong">HIDRO</span><span className="text-primary">FLORESTAS</span></h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          {labs.length === 0
            ? "Você ainda não faz parte de um Laboratório IHFR. Um laboratório reúne a equipe, as áreas monitoradas, as coletas e os diagnósticos. Escolha uma opção para começar:"
            : "Escolha explicitamente qual laboratório deseja acessar. Seus dados ficam sempre no contexto do laboratório escolhido."}
        </p>
      </section>

      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="flex min-h-28 flex-col items-center justify-center rounded-[20px] border border-dashed border-input bg-card p-5 text-center">
          <Lock className="h-5 w-5 text-icon" aria-hidden />
          <p className="mt-2 font-semibold">Entrar em Laboratório IHFR</p>
          <StatusBadge tone="neutral">Ainda indisponível</StatusBadge>
          <p className="mt-2 text-xs text-muted-foreground">Ingresso e convites não fazem parte desta versão.</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} disabled={atLimit}
          className="flex min-h-28 flex-col items-center justify-center rounded-[20px] bg-water-strong p-5 text-center text-primary-foreground shadow-[var(--shadow-card)] hover:bg-water-strong/90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none">
          <Plus className="h-6 w-6" aria-hidden />
          <span className="mt-1 text-lg font-semibold">Criar seu Laboratório IHFR</span>
          {atLimit && <span className="mt-1 text-xs">Limite de {LIMIT} laboratórios atingido</span>}
        </button>
      </div>

      {atLimit && (
        <div className="mx-auto max-w-3xl"><Notice tone="warning" role="status">
          Você atingiu o limite de {LIMIT} laboratórios acessíveis (criações e participações, inclusive inativos). Não é possível criar outro.
        </Notice></div>
      )}

      {labs.length > 0 && (
        <section aria-labelledby="labs-title">
          <h2 id="labs-title" className="mb-4 text-xl font-bold">Seus laboratórios <span className="text-sm font-normal text-muted-foreground">({labs.length} de {LIMIT})</span></h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {labs.map((l) => (
              <li key={l.id}>
                <Card as="article" className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Building2 className="h-5 w-5 shrink-0 text-icon" aria-hidden />
                      <h3 className="truncate font-semibold">{l.name}</h3>
                    </div>
                    <StatusBadge tone={l.status === "ACTIVE" ? "green" : "ochre"}>{labStatusLabel[l.status]}</StatusBadge>
                  </div>
                  <p className="text-sm text-muted-foreground">Criado em {fmtDate(l.createdAt)} · {l.isOwner ? "Você é o proprietário" : "Participação"}</p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button asChild className="flex-1"><Link to="/dashboard/laboratories/$laboratoryId" params={{ laboratoryId: l.id }}>Acessar</Link></Button>
                    <Button variant="outline" onClick={() => setSettingsLab(l)} aria-label={`Configurações de ${l.name}`}><Settings aria-hidden /> Configurações</Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CreateLabDialog open={createOpen} onOpenChange={setCreateOpen} />
      {settingsLab && <LabSettingsDialog lab={settingsLab} onClose={() => setSettingsLab(null)} />}
    </div>
  );
}

function CreateLabDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState<string>();
  const ref = useRef<HTMLFormElement>(null);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (n: string) => api.createLaboratory(n),
    onSuccess: (lab) => {
      qc.invalidateQueries({ queryKey: ["labs"] });
      toast.success(`Laboratório “${lab.name}” criado. Escolha-o na lista para acessar.`);
      setName("");
      onOpenChange(false);
    },
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const v = !n ? "Campo obrigatório." : n.length > 100 ? "Use no máximo 100 caracteres." : undefined;
    setErr(v);
    if (v) return focusFirstInvalid(ref.current);
    m.mutate(n);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px]">
        <DialogHeader>
          <DialogTitle>Criar Laboratório IHFR</DialogTitle>
          <DialogDescription>Você será o proprietário. Nomes repetidos são permitidos.</DialogDescription>
        </DialogHeader>
        <form ref={ref} onSubmit={submit} noValidate className="space-y-4">
          <TextField label="Nome do laboratório" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} error={err} hint="Entre 1 e 100 caracteres." />
          {m.isError && <Notice tone="danger" role="alert">{(m.error as ApiError).message}</Notice>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending ? "Criando…" : "Criar laboratório"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LabSettingsDialog({ lab, onClose }: { lab: LaboratorySummary; onClose: () => void }) {
  const qc = useQueryClient();
  const d = useQuery({ queryKey: ["lab", lab.id], queryFn: () => api.getLaboratory(lab.id) });
  const [action, setAction] = useState<"deactivate" | "delete" | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const m = useMutation({
    mutationFn: () => (action === "delete" ? api.deleteLaboratory(lab.id, confirmName) : api.deactivateLaboratory(lab.id, confirmName)),
    onSuccess: (r) => {
      qc.invalidateQueries();
      toast.success(r.action === "DELETED" ? "Laboratório excluído." : "Laboratório desativado. Os dados permanecem em consulta somente leitura.");
      onClose();
    },
  });
  const details = d.data?.details;
  const isOwner = d.data?.context.membershipRole === "OWNER";
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[20px]">
        <DialogHeader>
          <DialogTitle>Configurações do laboratório</DialogTitle>
          <DialogDescription>{lab.name}</DialogDescription>
        </DialogHeader>
        {d.isPending ? <LoadingState /> : d.isError ? <ErrorState error={d.error} onRetry={() => d.refetch()} /> : details && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Criado em</dt><dd className="font-semibold">{fmtDate(details.createdAt)}</dd>
              <dt className="text-muted-foreground">Status</dt><dd className="font-semibold">{labStatusLabel[details.status]}</dd>
            </dl>
            <div>
              <h3 className="text-sm font-semibold">Membros ({details.members.length})</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {details.members.map((mb, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm"><span aria-hidden className="text-xs font-bold text-muted-foreground">{mb.initials}</span>{mb.name}</li>
                ))}
              </ul>
            </div>
            {isOwner ? (
              <div className="space-y-3 rounded-[10px] border border-destructive/30 p-4">
                <h3 className="text-sm font-semibold text-destructive">Zona de risco (somente proprietário)</h3>
                <p className="text-xs text-muted-foreground">Desativar conserva os dados em somente leitura; não há reativação. Excluir é recusado se houver qualquer área cadastrada.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={details.status !== "ACTIVE"} onClick={() => { setAction("deactivate"); setConfirmName(""); m.reset(); }}>Desativar</Button>
                  <Button variant="destructive" onClick={() => { setAction("delete"); setConfirmName(""); m.reset(); }}>Excluir</Button>
                </div>
                {action && (
                  <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
                    <TextField label={`Digite exatamente “${details.name}” para confirmar`} required value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
                    {m.isError && <Notice tone="danger" role="alert">{(m.error as ApiError).message}</Notice>}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setAction(null)}>Cancelar</Button>
                      <Button type="submit" variant="destructive" disabled={confirmName !== details.name || m.isPending}>
                        {action === "delete" ? "Confirmar exclusão" : "Confirmar desativação"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Somente o proprietário pode desativar ou excluir este laboratório.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
