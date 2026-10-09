import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/adapter";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/domain/labels";
import { can } from "@/domain/permissions";
import { EnvironmentalView } from "@/features/environmental/EnvView";
import { labHead, useLabContext } from "@/features/lab/useLab";

export const Route = createFileRoute("/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId/environmental-data/")({
  head: labHead("Dados ambientais", "Conjunto de medições ambientais confirmado da coleta."),
  component: EnvPage,
});

function EnvPage() {
  const { laboratoryId, areaId, collectionId } = Route.useParams();
  const ctx = useLabContext(laboratoryId);
  const q = useQuery({ queryKey: ["env", collectionId], queryFn: () => api.getEnvironmental(laboratoryId, areaId, collectionId) });
  const p = { laboratoryId, areaId, collectionId };
  return (
    <div className="max-w-3xl">
      <PageHeader title="Dados ambientais" subtitle="Contrato ihfr-measurement-v1"
        back={{ to: "/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId", params: p, label: "Voltar à coleta" }}
        crumbs={[{ label: "Área", to: "/dashboard/laboratories/$laboratoryId/areas/$areaId", params: { laboratoryId, areaId } }, { label: "Coleta", to: "/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId", params: p }, { label: "Dados ambientais" }]} />
      {q.isPending ? <LoadingState /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.data.environmentalData === null ? (
        <EmptyState title="Nenhum conjunto ambiental confirmado"
          action={can(ctx, "registerEnvironmental") && <Button asChild><Link to="/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId/environmental-data/new" params={p}>Registrar medições</Link></Button>}>
          Cada coleta comporta um único conjunto confirmado.
        </EmptyState>
      ) : (
        <Card>
          <p className="mb-4 text-sm text-muted-foreground">Confirmado em {fmtDateTime(q.data.environmentalData.confirmedAt)} · registro imutável.</p>
          <EnvironmentalView d={q.data.environmentalData} />
        </Card>
      )}
    </div>
  );
}
