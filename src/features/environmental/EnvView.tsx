import { ChevronDown, Droplets, Mountain, Sprout, Layers } from "lucide-react";
import type { ReactNode } from "react";
import { DefRow, NotInformed } from "@/components/hf/primitives";
import { erosionLabel, fmtDecimal, levelLabel, levelLabelF, salinityLabel, soilTextureLabel, waterAvailabilityLabel, waterSourceLabel } from "@/domain/labels";
import type { EnvironmentalInput } from "@/domain/types";

export const groupStyle = {
  water: { title: "Água", icon: Droplets, head: "bg-water-strong text-primary-foreground" },
  soil: { title: "Solo", icon: Layers, head: "bg-ochre text-primary-foreground" },
  vegetation: { title: "Vegetação", icon: Sprout, head: "bg-primary text-primary-foreground" },
  terrain: { title: "Terreno", icon: Mountain, head: "bg-secondary text-foreground" },
} as const;

export function Group({ k, children, open = true }: { k: keyof typeof groupStyle; children: ReactNode; open?: boolean }) {
  const g = groupStyle[k];
  return (
    <details open={open} className="group overflow-hidden rounded-[10px] border border-border bg-card">
      <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 font-semibold uppercase tracking-wide ${g.head}`}>
        <span className="flex items-center gap-2"><g.icon className="h-5 w-5" aria-hidden /> {g.title}</span>
        <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-4 py-2">{children}</div>
    </details>
  );
}

const n = (v: number | null, unit = "") => (v === null ? <NotInformed /> : `${fmtDecimal(v)}${unit}`);
const yn = (v: boolean | null) => (v === null ? <NotInformed /> : v ? "Sim" : "Não");

/** Exibição somente leitura dos quatro grupos. */
export function EnvironmentalView({ d }: { d: EnvironmentalInput }) {
  return (
    <div className="space-y-3">
      <Group k="water"><dl>
        <DefRow label="Fonte de água">{waterSourceLabel[d.water.waterSourceType]}</DefRow>
        <DefRow label="Há nascente">{yn(d.water.hasSpring)}</DefRow>
        <DefRow label="Profundidade do poço">{n(d.water.wellDepthMeters, " m")}</DefRow>
        <DefRow label="Disponibilidade hídrica">{waterAvailabilityLabel[d.water.waterAvailability]}</DefRow>
        <DefRow label="Indicador de salinidade">{d.water.salinityIndicator ? salinityLabel[d.water.salinityIndicator] : <NotInformed />}</DefRow>
      </dl></Group>
      <Group k="soil"><dl>
        <DefRow label="Textura do solo">{soilTextureLabel[d.soil.soilTexture]}</DefRow>
        <DefRow label="Taxa de infiltração">{n(d.soil.infiltrationRateMmPerHour, " mm/h")}</DefRow>
        <DefRow label="Compactação">{levelLabelF[d.soil.compactionLevel]}</DefRow>
        <DefRow label="Sinais de erosão">{erosionLabel[d.soil.erosionSigns]}</DefRow>
        <DefRow label="Solo exposto">{n(d.soil.soilExposedPercent, "%")}</DefRow>
      </dl></Group>
      <Group k="vegetation"><dl>
        <DefRow label="Cobertura vegetal">{n(d.vegetation.vegetationCoverPercent, "%")}</DefRow>
        <DefRow label="Fragmentação">{levelLabelF[d.vegetation.fragmentationLevel]}</DefRow>
        <DefRow label="Presença de APP ripária">{yn(d.vegetation.hasRiparianApp)}</DefRow>
        <DefRow label="Degradação da paisagem">{levelLabelF[d.vegetation.landscapeDegradation]}</DefRow>
      </dl></Group>
      <Group k="terrain"><dl>
        <DefRow label="Densidade de drenagem">{n(d.terrain.drainageDensityKmPerKm2, " km/km²")}</DefRow>
        <DefRow label="Elevação">{n(d.terrain.elevationMeters, " m")}</DefRow>
        <DefRow label="Declividade">{n(d.terrain.slopePercent, "%")}</DefRow>
      </dl></Group>
    </div>
  );
}
export { levelLabel };
