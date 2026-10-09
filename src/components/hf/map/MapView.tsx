import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useScenario } from "@/demo/scenario";

export interface MapPoint { id: string; lat: number; lng: number; label: string }

const LeafletMap = lazy(() => import("./LeafletMap"));

/** Mapa somente no cliente. Lista alternativa acessível deve acompanhar cada uso. */
export function MapView(props: { points: MapPoint[]; selectedId?: string | null; onSelect?: (id: string) => void; onPick?: (lat: number, lng: number) => void; height?: number; label: string }) {
  const { tilesFail } = useScenario();
  const height = props.height ?? 360;
  const fallback = <div className="grid place-items-center rounded-[20px] bg-secondary text-sm text-muted-foreground" style={{ height }}>Carregando mapa…</div>;
  return (
    <figure aria-label={props.label} className="space-y-1">
      <ClientOnly fallback={fallback}>
        <Suspense fallback={fallback}>
          <LeafletMap {...props} height={height} tilesFail={tilesFail} />
        </Suspense>
      </ClientOnly>
      <figcaption className="text-xs text-muted-foreground">Mapa de demonstração com dados sintéticos.</figcaption>
    </figure>
  );
}
