import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPinOff } from "lucide-react";
import { useState } from "react";
import { api } from "@/adapter";
import { MapView } from "@/components/hf/map/MapView";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/hf/primitives";
import { fmtDateTime, fmtDecimal } from "@/domain/labels";
import { displayDeclared } from "@/domain/time";
import { labHead } from "@/features/lab/useLab";

export const Route = createFileRoute("/dashboard/laboratories/$laboratoryId/map")({
  head: labHead("Mapa territorial", "Pontos das áreas monitoradas e suas coletas confirmadas, com lista acessível."),
  component: MapPage,
});

function MapPage() {
  const { laboratoryId } = Route.useParams();
  const q = useQuery({ queryKey: ["territorial", laboratoryId], queryFn: () => api.territorialMap(laboratoryId) });
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Mapa territorial" subtitle="Pontos das áreas do laboratório. Sem classes de risco ou camadas analíticas."
        back={{ to: "/dashboard/laboratories/$laboratoryId", params: { laboratoryId }, label: "Voltar ao resumo" }} />
      {q.isPending ? <LoadingState label="Carregando mapa…" /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.data.areas.length === 0 ? <EmptyState title="Nenhuma área cadastrada" /> : (() => {
        const areas = q.data.areas;
        const sel = areas.find((a) => a.id === selected);
        const points = areas.filter((a) => a.location).map((a) => ({ id: a.id, lat: a.location!.latitude, lng: a.location!.longitude, label: a.name }));
        return (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <MapView label="Mapa de pontos das áreas" points={points} selectedId={selected} onSelect={setSelected} height={460} />
            <div className="space-y-4">
              <Card>
                <h2 id="list-title" className="text-lg font-bold">Áreas (lista alternativa)</h2>
                <ul aria-labelledby="list-title" className="mt-3 space-y-2">
                  {areas.map((a) => (
                    <li key={a.id}>
                      <button type="button" aria-pressed={selected === a.id} onClick={() => setSelected(a.id)}
                        className="flex w-full min-h-11 items-center justify-between gap-2 rounded-[10px] border border-border px-3 py-2 text-left text-sm hover:bg-secondary aria-pressed:border-primary aria-pressed:bg-green-soft">
                        <span className="min-w-0"><span className="block truncate font-semibold">{a.name}</span>
                          <span className="block text-xs text-muted-foreground">{a.location ? `${fmtDecimal(a.location.latitude)}, ${fmtDecimal(a.location.longitude)}` : "Sem localização no mapa"}</span></span>
                        <span className="shrink-0 text-xs text-muted-foreground">{a.confirmedCollections.length} coleta(s)</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
              {sel && (
                <Card aria-live="polite">
                  <h2 className="text-lg font-bold">{sel.name}</h2>
                  {!sel.location && <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPinOff className="h-4 w-4" aria-hidden /> Esta área não possui ponto disponível no mapa.</p>}
                  <Link to="/dashboard/laboratories/$laboratoryId/areas/$areaId" params={{ laboratoryId, areaId: sel.id }} className="mt-2 inline-block min-h-11 content-center text-sm font-semibold text-water-strong underline">Abrir área</Link>
                  <h3 className="mt-3 text-sm font-semibold">Coletas confirmadas</h3>
                  {sel.confirmedCollections.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma.</p> : (
                    <ul className="mt-2 divide-y divide-border">
                      {sel.confirmedCollections.map((c) => (
                        <li key={c.id} className="py-2 text-sm">
                          <Link to="/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId" params={{ laboratoryId, areaId: sel.id, collectionId: c.id }} className="font-semibold text-water-strong underline">{displayDeclared(c.occurredAt)}</Link>
                          <span className="block text-xs text-muted-foreground">Confirmada em {fmtDateTime(c.confirmedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
