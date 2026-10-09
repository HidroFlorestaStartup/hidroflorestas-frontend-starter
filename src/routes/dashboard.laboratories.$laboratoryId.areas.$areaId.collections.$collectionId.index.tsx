import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Leaf } from "lucide-react";
import { api } from "@/adapter";
import { Card, DefRow, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/domain/labels";
import { can } from "@/domain/permissions";
import { displayDeclared, toUtcIso } from "@/domain/time";
import { IhfrPanel } from "@/features/ihfr/IhfrPanel";
import { labHead, useLabContext } from "@/features/lab/useLab";

export const Route = createFileRoute("/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId/")({
  head: labHead("Coleta confirmada", "Ocorrência, confirmação, dados ambientais e diagnóstico IHFR experimental da coleta."),
  component: CollectionPage,
});

function CollectionPage() {
  const { laboratoryId, areaId, collectionId } = Route.useParams();
  const p = { laboratoryId, areaId, collectionId };
  const ctx = useLabContext(laboratoryId);
  const q = useQuery({ queryKey: ["collection", collectionId], queryFn: () => api.getCollection(laboratoryId, areaId, collectionId) });
  const env = useQuery({ queryKey: ["env", collectionId], queryFn: () => api.getEnvironmental(laboratoryId, areaId, collectionId) });

  if (q.isPending) return <LoadingState label="Carregando coleta…" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const c = q.data.collection;

  return (
    <div>
      <PageHeader title="Coleta confirmada" subtitle={`${c.area.name} · ${c.laboratory.name}`}
        back={{ to: "/dashboard/laboratories/$laboratoryId/areas/$areaId", params: { laboratoryId, areaId }, label: "Voltar à área" }}
        crumbs={[{ label: "Áreas", to: "/dashboard/laboratories/$laboratoryId/areas", params: { laboratoryId } }, { label: c.area.name, to: "/dashboard/laboratories/$laboratoryId/areas/$areaId", params: { laboratoryId, areaId } }, { label: "Coleta" }]} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-bold">Registro</h2><StatusBadge tone="neutral">Imutável</StatusBadge></div>
            <dl className="mt-2">
              <DefRow label="Ocorrência (declarada)">{displayDeclared(c.occurredAt)}</DefRow>
              <DefRow label="Ocorrência em UTC">{toUtcIso(c.occurredAt)}</DefRow>
              <DefRow label="Confirmada pelo sistema em">{fmtDateTime(c.confirmedAt)}</DefRow>
              <DefRow label="Área">{c.area.name}</DefRow>
            </dl>
          </Card>
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold"><Leaf className="h-5 w-5 text-primary" aria-hidden /> Dados ambientais</h2>
            {env.isPending ? <div className="mt-3"><LoadingState /></div> : env.isError ? <div className="mt-3"><ErrorState error={env.error} onRetry={() => env.refetch()} /></div> : env.data.environmentalData ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm">Conjunto confirmado em {fmtDateTime(env.data.environmentalData.confirmedAt)}.</p>
                <Button asChild variant="outline"><Link to="/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId/environmental-data" params={p}>Ver medições</Link></Button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">Nenhum conjunto ambiental confirmado.</p>
                {can(ctx, "registerEnvironmental") && <Button asChild><Link to="/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId/environmental-data/new" params={p}>Registrar medições</Link></Button>}
              </div>
            )}
          </Card>
        </div>
        <IhfrPanel labId={laboratoryId} areaId={areaId} collectionId={collectionId} ctx={ctx} />
      </div>
    </div>
  );
}
