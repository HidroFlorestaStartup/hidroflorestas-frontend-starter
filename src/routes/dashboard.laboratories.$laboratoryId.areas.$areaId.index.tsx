import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Plus } from "lucide-react";
import { api } from "@/adapter";
import { MapView } from "@/components/hf/map/MapView";
import { Card, DefRow, EmptyState, ErrorState, LoadingState, NotInformed, PageHeader } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtDateTime, fmtDecimal } from "@/domain/labels";
import { can } from "@/domain/permissions";
import { displayDeclared } from "@/domain/time";
import { labHead, useLabContext } from "@/features/lab/useLab";

export const Route = createFileRoute("/dashboard/laboratories/$laboratoryId/areas/$areaId/")({
  head: labHead("Área de monitoramento", "Localização, informações e coletas confirmadas da área."),
  component: AreaDetailPage,
});

function AreaDetailPage() {
  const { laboratoryId, areaId } = Route.useParams();
  const ctx = useLabContext(laboratoryId);
  const q = useQuery({ queryKey: ["area", laboratoryId, areaId], queryFn: () => api.getArea(laboratoryId, areaId) });
  // Não há listagem de coletas por área: usam-se os dados do mapa territorial.
  const t = useQuery({ queryKey: ["territorial", laboratoryId], queryFn: () => api.territorialMap(laboratoryId) });

  if (q.isPending) return <LoadingState label="Carregando área…" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const a = q.data.area;
  const cols = t.data?.areas.find((x) => x.id === areaId)?.confirmedCollections ?? [];
  const allowed = can(ctx, "registerCollection");

  return (
    <div>
      <PageHeader title={a.name} subtitle={[a.municipality, a.state].filter(Boolean).join(" / ") || undefined}
        back={{ to: "/dashboard/laboratories/$laboratoryId/areas", params: { laboratoryId }, label: "Voltar às áreas" }}
        crumbs={[{ label: "Workspace", to: "/workspace" }, { label: "Áreas", to: "/dashboard/laboratories/$laboratoryId/areas", params: { laboratoryId } }, { label: a.name }]}
        actions={allowed && <Button asChild><Link to="/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/new" params={{ laboratoryId, areaId }}><Plus aria-hidden /> Registrar coleta</Link></Button>} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <MapView label={`Ponto da área ${a.name}`} points={[{ id: a.id, lat: a.latitude, lng: a.longitude, label: a.name }]} selectedId={a.id} height={320} />
          <Card aria-labelledby="cols-title">
            <h2 id="cols-title" className="text-lg font-bold">Coletas confirmadas</h2>
            {t.isPending ? <div className="mt-3"><LoadingState /></div> : t.isError ? <div className="mt-3"><ErrorState error={t.error} onRetry={() => t.refetch()} /></div> : cols.length === 0 ? (
              <div className="mt-3"><EmptyState title="Nenhuma coleta confirmada">{allowed ? "Registre a primeira coleta desta área." : undefined}</EmptyState></div>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {[...cols].sort((x, y) => y.confirmedAt.localeCompare(x.confirmedAt)).map((c) => (
                  <li key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <ClipboardCheck className="h-5 w-5 text-water-strong" aria-hidden />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold">Ocorrência: {displayDeclared(c.occurredAt)}</p>
                      <p className="text-muted-foreground">Confirmada em {fmtDateTime(c.confirmedAt)}</p>
                    </div>
                    <Link to="/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId" params={{ laboratoryId, areaId, collectionId: c.id }}
                      className="min-h-11 content-center text-sm font-semibold text-water-strong underline underline-offset-4">Abrir</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card aria-labelledby="info-title" className="h-fit">
          <h2 id="info-title" className="text-lg font-bold">Informações</h2>
          <dl className="mt-2">
            <DefRow label="Latitude">{fmtDecimal(a.latitude)}</DefRow>
            <DefRow label="Longitude">{fmtDecimal(a.longitude)}</DefRow>
            <DefRow label="Município">{a.municipality ?? <NotInformed />}</DefRow>
            <DefRow label="UF">{a.state ?? <NotInformed />}</DefRow>
            <DefRow label="Tipo de terreno">{a.landType ?? <NotInformed />}</DefRow>
            <DefRow label="Cadastrada em">{fmtDate(a.createdAt)}</DefRow>
            <DefRow label="Laboratório">{a.laboratory.name}</DefRow>
          </dl>
          {a.description && <p className="mt-4 whitespace-pre-line text-sm">{a.description}</p>}
        </Card>
      </div>
    </div>
  );
}
