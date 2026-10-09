// Busca, filtros, detalhe e revisão adaptados de screenshot-show-off-18/src/routes/admin/users.tsx.
// DTOs, cursores e auditoria por conta usam somente o adapter principal.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/adapter";
import type { AccountStatus, AdminUser, GlobalRole } from "@/domain/types";
import { accountStatusLabel, globalRoleLabel, fmtDateTime } from "@/domain/labels";
import {
  Card,
  DefRow,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  SelectField,
  StatusBadge,
  TextAreaField,
  TextField,
} from "@/components/hf/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { labHead } from "@/features/lab/useLab";
export const Route = createFileRoute("/admin/users")({
  head: labHead("Contas — Administração", "Busca e gestão de contas sintéticas com auditoria."),
  component: UsersPage,
});
const opts = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));
function UsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<GlobalRole | "">("");
  const [status, setStatus] = useState<AccountStatus | "">("");
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const users = useQuery({
    queryKey: ["admin-users", search, role, status, cursors[page]],
    queryFn: () =>
      api.adminListUsers({
        ...(search ? { search } : {}),
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
        limit: 25,
        ...(cursors[page] ? { cursor: cursors[page]! } : {}),
      }),
    retry: false,
  });
  function resetPages() {
    setCursors([undefined]);
    setPage(0);
  }
  const list = users.data?.items ?? [];
  return (
    <>
      <PageHeader
        title="Contas"
        subtitle="Selecione uma conta para consultar detalhes e revisar alterações."
        back={{ to: "/admin", label: "Voltar à administração" }}
        crumbs={[{ label: "Administração", to: "/admin" }, { label: "Contas" }]}
      />
      <Card className="mb-6">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
          <TextField
            label="Buscar por nome ou e-mail"
            value={search}
            maxLength={120}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPages();
            }}
            hint="Até 120 caracteres."
          />
          <SelectField
            label="Filtrar por papel global"
            placeholder="Todos os papéis"
            value={role}
            options={opts(globalRoleLabel)}
            onChange={(e) => {
              setRole(e.target.value as GlobalRole | "");
              resetPages();
            }}
          />
          <SelectField
            label="Filtrar por estado"
            placeholder="Todos os estados"
            value={status}
            options={opts(accountStatusLabel)}
            onChange={(e) => {
              setStatus(e.target.value as AccountStatus | "");
              resetPages();
            }}
          />
        </div>
      </Card>
      {users.isPending ? (
        <LoadingState label="Consultando contas…" />
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="Nenhuma conta encontrada">Ajuste a busca ou os filtros.</EmptyState>
      ) : (
        <>
          <p role="status" className="mb-3 text-sm text-muted-foreground">
            Página {page + 1} · {list.length} conta(s) nesta página.
          </p>
          <ul aria-label="Contas encontradas" className="space-y-3">
            {list.map((u) => (
              <li key={u.id}>
                <Dialog
                  open={selected === u.id}
                  onOpenChange={(open) => setSelected(open ? u.id : null)}
                >
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="grid w-full gap-3 rounded-[20px] border border-border bg-card p-5 text-left shadow-[var(--shadow-card)] hover:border-water-strong md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-center"
                      aria-label={`Ver conta de ${u.firstName} ${u.lastName}`}
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          {u.firstName} {u.lastName}
                        </span>
                        <span className="block break-all text-sm text-muted-foreground">
                          {u.email}
                        </span>
                      </span>
                      <span className="text-sm">
                        {globalRoleLabel[u.role]}
                        <span className="block text-xs text-muted-foreground">Papel global</span>
                      </span>
                      <span>
                        <StatusBadge tone={u.status === "ACTIVE" ? "green" : "neutral"}>
                          {accountStatusLabel[u.status]}
                        </StatusBadge>
                      </span>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Detalhe da conta</DialogTitle>
                      <DialogDescription>
                        Dados fictícios. Toda alteração exige justificativa e confirmação.
                      </DialogDescription>
                    </DialogHeader>
                    {selected === u.id && <UserDetail key={u.id} id={u.id} />}
                  </DialogContent>
                </Dialog>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="text-sm">Página {page + 1}</span>
            <Button
              variant="outline"
              disabled={!users.data?.nextCursor}
              onClick={() => {
                setCursors([...cursors.slice(0, page + 1), users.data!.nextCursor!]);
                setPage(page + 1);
              }}
            >
              Próxima
            </Button>
          </div>
        </>
      )}
    </>
  );
}
type Edit = { field: "role"; value: GlobalRole } | { field: "status"; value: AccountStatus };
function UserDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const user = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => api.adminGetUser(id),
    retry: false,
  });
  const [edit, setEdit] = useState<Edit | null>(null);
  const [reason, setReason] = useState("");
  const [review, setReview] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const audit = useInfiniteQuery({
    queryKey: ["admin-audit", id],
    queryFn: ({ pageParam }) => api.adminAudit(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
  });
  const update = useMutation({
    mutationFn: ({
      current,
      change,
      reason,
    }: {
      current: AdminUser;
      change: Edit;
      reason: string;
    }) =>
      change.field === "role"
        ? api.adminSetRole(id, {
            expectedRole: current.role,
            expectedRevision: current.revision,
            role: change.value,
            reason,
          })
        : api.adminSetStatus(id, {
            expectedStatus: current.status,
            expectedRevision: current.revision,
            status: change.value,
            reason,
          }),
    onSuccess: async (updated) => {
      toast.success("Alteração de conta confirmada na demonstração.");
      qc.setQueryData(["admin-user", id], updated);
      setEdit(null);
      setReview(false);
      setReason("");
      setConflict(false);
      setNotice("Alteração confirmada na demonstração.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
        qc.invalidateQueries({ queryKey: ["admin-audit", id] }),
      ]);
    },
    onError: async (error) => {
      setReview(false);
      if (error instanceof ApiError && error.status === 409) {
        setConflict(true);
        const refreshed = await user.refetch();
        if (refreshed.isSuccess) {
          setConflict(false);
          setNotice("Confira o estado e a revisão atual antes de revisar novamente.");
        }
      }
    },
  });
  if (user.isPending) return <LoadingState label="Carregando detalhe…" />;
  if (user.isError)
    return (
      <ErrorState
        error={user.error}
        onRetry={async () => {
          const r = await user.refetch();
          if (r.isSuccess) setConflict(false);
        }}
      />
    );
  const u = user.data;
  const changed = !!edit && edit.value !== u[edit.field];
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">
        {u.firstName} {u.lastName}
      </h2>
      <dl>
        <DefRow label="E-mail">{u.email}</DefRow>
        <DefRow label="Papel global">{globalRoleLabel[u.role]}</DefRow>
        <DefRow label="Estado">{accountStatusLabel[u.status]}</DefRow>
        <DefRow label="Revisão">{u.revision}</DefRow>
        <DefRow label="Criada em">{fmtDateTime(u.createdAt)}</DefRow>
        <DefRow label="Atualizada em">{fmtDateTime(u.updatedAt)}</DefRow>
      </dl>
      {notice && (
        <Notice tone={update.isError ? "warning" : "success"} role="status">
          {notice}
        </Notice>
      )}
      {update.isError && (
        <Notice tone="danger" role="alert">
          {update.error instanceof ApiError
            ? update.error.message
            : "Não foi possível aplicar a alteração."}
        </Notice>
      )}
      {!edit ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEdit({ field: "role", value: u.role });
              setNotice(null);
              update.reset();
            }}
          >
            Alterar papel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEdit({ field: "status", value: u.status });
              setNotice(null);
              update.reset();
            }}
          >
            Alterar estado
          </Button>
        </div>
      ) : (
        <section
          className="space-y-4 rounded-[10px] border border-border p-4"
          aria-label="Alteração da conta"
        >
          {review ? (
            <>
              <h3 className="font-semibold">Revise a alteração</h3>
              <p className="text-sm">
                {edit.field === "role" ? "Papel" : "Estado"}:{" "}
                <strong>
                  {edit.field === "role" ? globalRoleLabel[u.role] : accountStatusLabel[u.status]}
                </strong>{" "}
                →{" "}
                <strong>
                  {edit.field === "role"
                    ? globalRoleLabel[edit.value]
                    : accountStatusLabel[edit.value]}
                </strong>
                .
              </p>
              <p className="text-sm">Justificativa: {reason.trim()}</p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={update.isPending}
                  onClick={() => setReview(false)}
                >
                  Corrigir
                </Button>
                <Button
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate({ current: { ...u }, change: { ...edit }, reason: reason.trim() })
                  }
                >
                  {update.isPending ? "Aplicando…" : "Confirmar alteração"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <SelectField
                label={edit.field === "role" ? "Novo papel" : "Novo estado"}
                required
                value={edit.value}
                options={opts(edit.field === "role" ? globalRoleLabel : accountStatusLabel)}
                onChange={(e) =>
                  setEdit(
                    edit.field === "role"
                      ? { field: "role", value: e.target.value as GlobalRole }
                      : { field: "status", value: e.target.value as AccountStatus },
                  )
                }
              />
              <TextAreaField
                label="Justificativa"
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                hint={`${reason.trim().length}/500 caracteres.`}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEdit(null);
                    setReview(false);
                    setReason("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  disabled={!changed || !reason.trim() || conflict}
                  onClick={() => setReview(true)}
                >
                  Revisar alteração
                </Button>
              </div>
            </>
          )}
        </section>
      )}
      <section aria-label="Auditoria da conta" className="space-y-3 border-t border-border pt-4">
        <h3 className="font-semibold">Auditoria desta conta</h3>
        {audit.isPending ? (
          <LoadingState label="Carregando auditoria…" />
        ) : audit.isError ? (
          <ErrorState error={audit.error} onRetry={() => audit.refetch()} />
        ) : audit.data.pages.every((p) => p.items.length === 0) ? (
          <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
        ) : (
          <ul className="space-y-3">
            {audit.data.pages
              .flatMap((p) => p.items)
              .map((e) => (
                <li key={e.id} className="rounded-[10px] bg-secondary p-3 text-sm">
                  <p className="font-semibold">
                    {e.action === "GLOBAL_ROLE_CHANGED" ? "Papel global" : "Estado da conta"}:{" "}
                    {e.action === "GLOBAL_ROLE_CHANGED"
                      ? globalRoleLabel[e.beforeValue as GlobalRole]
                      : accountStatusLabel[e.beforeValue as AccountStatus]}{" "}
                    →{" "}
                    {e.action === "GLOBAL_ROLE_CHANGED"
                      ? globalRoleLabel[e.afterValue as GlobalRole]
                      : accountStatusLabel[e.afterValue as AccountStatus]}
                  </p>
                  <p className="mt-1">Justificativa: {e.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fmtDateTime(e.createdAt)} · revisão {e.targetRevision}
                  </p>
                </li>
              ))}
          </ul>
        )}
        {audit.hasNextPage && (
          <Button
            variant="outline"
            disabled={audit.isFetchingNextPage}
            onClick={() => audit.fetchNextPage()}
          >
            Carregar mais auditoria
          </Button>
        )}
      </section>
    </div>
  );
}
