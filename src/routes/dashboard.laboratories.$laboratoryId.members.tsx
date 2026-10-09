import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/adapter";
import { Card, ErrorState, ForbiddenState, LoadingState, Notice, PageHeader, StatusBadge } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { labRoleLabel } from "@/domain/labels";
import { can } from "@/domain/permissions";
import type { Membership } from "@/domain/types";
import { labHead } from "@/features/lab/useLab";

export const Route = createFileRoute("/dashboard/laboratories/$laboratoryId/members")({
  head: labHead("Membros", "Papéis dos vínculos existentes do laboratório."),
  component: Members,
});

function Members() {
  const { laboratoryId } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["members", laboratoryId], queryFn: () => api.listMemberships(laboratoryId) });
  const [target, setTarget] = useState<Membership | null>(null);
  const m = useMutation({
    mutationFn: (t: Membership) => api.updateMembership(laboratoryId, t.id, { expectedRole: t.role as "MEMBER" | "ADMIN", role: t.role === "ADMIN" ? "MEMBER" : "ADMIN" }),
    onSuccess: () => { toast.success("Papel atualizado."); qc.invalidateQueries({ queryKey: ["members", laboratoryId] }); },
    onError: () => qc.invalidateQueries({ queryKey: ["members", laboratoryId] }),
  });

  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (q.data.context.membershipRole !== "OWNER") return <ForbiddenState />;
  const editable = can(q.data.context, "manageMembers");

  return (
    <div className="max-w-3xl">
      <PageHeader title="Membros do laboratório" subtitle="O proprietário promove ou rebaixa vínculos existentes entre Membro e Administrador do laboratório."
        back={{ to: "/dashboard/laboratories/$laboratoryId", params: { laboratoryId }, label: "Voltar ao resumo" }} />
      {m.isError && <div className="mb-4"><Notice tone="danger" role="alert">{(m.error as ApiError).message}</Notice></div>}
      <Card>
        <ul className="divide-y divide-border">
          {q.data.memberships.map((mb) => (
            <li key={mb.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
              <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-bold text-muted-foreground">{mb.initials}</span>
              <div className="min-w-0"><p className="truncate font-semibold">{mb.name}</p>
                <StatusBadge tone={mb.role === "OWNER" ? "ochre" : mb.role === "ADMIN" ? "blue" : "neutral"}>{labRoleLabel[mb.role]}</StatusBadge></div>
              <div className="col-span-2 sm:col-span-1">
                {mb.role === "OWNER" ? <span className="text-xs text-muted-foreground">Proprietário não é alterável</span> : (
                  <Button variant="outline" disabled={!editable || m.isPending} onClick={() => setTarget(mb)}>
                    {mb.role === "ADMIN" ? "Rebaixar a Membro" : "Promover a Administrador"}<span className="sr-only"> — {mb.name}</span>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">Ingresso, convites e remoção de membros não fazem parte desta versão.</p>
      </Card>
      <AlertDialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar papel de {target?.name}?</AlertDialogTitle>
            <AlertDialogDescription>{target && `${labRoleLabel[target.role]} → ${labRoleLabel[target.role === "ADMIN" ? "MEMBER" : "ADMIN"]}`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button onClick={() => { m.mutate(target!); setTarget(null); }}>Confirmar</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
