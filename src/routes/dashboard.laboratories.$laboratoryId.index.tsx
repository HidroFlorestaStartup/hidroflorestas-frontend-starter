import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ClipboardCheck, MapPinned, RefreshCw } from "lucide-react";
import { api } from "@/adapter";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/domain/labels";
import { displayDeclared } from "@/domain/time";
import { labHead, useLabContext } from "@/features/lab/useLab";

export const Route = createFileRoute("/dashboard/laboratories/$laboratoryId/")({
  head: labHead("Resumo do laboratório", "Totais de áreas e coletas confirmadas e histórico de atividades do laboratório."),
  component: Summary,
});

function Summary() {
  const { laboratoryId } = Route.useParams();
  const ctx = useLabContext(laboratoryId);
  const s = useQuery({ queryKey: ["summary", laboratoryId], queryFn: () => api.summary(laboratoryId) });
  const h = useInfiniteQuery({
    queryKey: ["history", laboratoryId],
    queryFn: ({ pageParam }) => api.history(laboratoryId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.page.nextCursor ?? undefined,
  });
  const items = h.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <PageHeader title="Atividade e gerenciamento" subtitle={ctx?.name}
        crumbs={[{ label: "Workspace", to: "/workspace" }, { label: ctx?.name ?? "Laboratório" }]}
        actions={<Button variant="outline" onClick={() => { s.refetch(); h.refetch(); }}><RefreshCw aria-hidden /> Atualizar</Button>} />

      <section aria-label="Totais" className="mb-8">
        {s.isPending ? <LoadingState label="Carregando totais…" /> : s.isError ? <ErrorState error={s.error} onRetry={() => s.refetch()} /> : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat icon={MapPinned} label="Áreas monitoradas" value={s.data.totals.areas} bar="bg-primary" to="areas" labId={laboratoryId} />
            <Stat icon={ClipboardCheck} label="Coletas confirmadas" value={s.data.totals.confirmedCollections} bar="bg-water-strong" to="map" labId={laboratoryId} />
          </div>
        )}
      </section>

      <Card aria-labelledby="hist-title">
        <h2 id="hist-title" className="text-xl font-bold">Histórico de atividades</h2>
        <p className="mt-1 text-sm text-muted-foreground">Áreas criadas e coletas confirmadas, das mais recentes às mais antigas.</p>
        <div className="mt-4">
          {h.isPending ? <LoadingState label="Carregando histórico…" /> : h.isError ? <ErrorState error={h.error} onRetry={() => h.refetch()} /> : items.length === 0 ? (
            <EmptyState title="Nenhuma atividade ainda">Crie uma área para começar o monitoramento.</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                  <span className={`grid h-10 w-10 place-items-center rounded-full ${it.type === "AREA_CREATED" ? "bg-green-soft text-primary" : "bg-water-soft text-water-strong"}`} aria-hidden>
                    {it.type === "AREA_CREATED" ? <MapPinned className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{it.label}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {it.area.name} · {fmtDateTime(it.eventAt)}
                      {it.occurredAt && <> · ocorrência {displayDeclared(it.occurredAt)}</>}
                    </p>
                  </div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Link to={it.destination as any} className="col-span-2 min-h-11 content-center text-sm font-semibold text-water-strong underline underline-offset-4 sm:col-span-1">
                    {it.type === "AREA_CREATED" ? "Ver área" : "Ver coleta"}<span className="sr-only"> — {it.area.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {h.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => h.fetchNextPage()} disabled={h.isFetchingNextPage}>{h.isFetchingNextPage ? "Carregando…" : "Carregar mais"}</Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, bar, to, labId }: { icon: typeof MapPinned; label: string; value: number; bar: string; to: "areas" | "map"; labId: string }) {
  return (
    <Link to={to === "areas" ? "/dashboard/laboratories/$laboratoryId/areas" : "/dashboard/laboratories/$laboratoryId/map"} params={{ laboratoryId: labId }}
      className="block overflow-hidden rounded-[20px] bg-card shadow-[var(--shadow-card)] hover:ring-2 hover:ring-ring">
      <div className="flex items-center gap-4 p-6">
        <Icon className="h-8 w-8 text-icon" aria-hidden />
        <div><p className="text-3xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
      </div>
      <div className={`h-2 ${bar}`} aria-hidden />
    </Link>
  );
}
