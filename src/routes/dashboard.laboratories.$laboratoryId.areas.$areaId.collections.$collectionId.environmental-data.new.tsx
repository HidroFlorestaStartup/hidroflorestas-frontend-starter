import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, ApiError, newIdempotencyKey } from "@/adapter";
import { Card, ErrorState, ForbiddenState, LoadingState, Notice, PageHeader, SelectField, TextField, focusFirstInvalid } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { erosionLabel, levelLabelF, salinityLabel, soilTextureLabel, waterAvailabilityLabel, waterSourceLabel } from "@/domain/labels";
import { can } from "@/domain/permissions";
import type { EnvironmentalInput } from "@/domain/types";
import { EnvironmentalView, Group } from "@/features/environmental/EnvView";
import { parseDecimal } from "@/features/forms/numbers";
import { labHead, useLabContext } from "@/features/lab/useLab";

export const Route = createFileRoute("/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId/environmental-data/new")({
  head: labHead("Registrar dados ambientais", "Medições de Água, Solo, Vegetação e Terreno com revisão antes da confirmação."),
  component: NewEnv,
});

const opts = (r: Record<string, string>) => Object.entries(r).map(([value, label]) => ({ value, label }));
const yesNo = [{ value: "true", label: "Sim" }, { value: "false", label: "Não" }];

type F = Record<
  | "waterSourceType" | "hasSpring" | "wellDepthMeters" | "waterAvailability" | "salinityIndicator"
  | "soilTexture" | "infiltrationRateMmPerHour" | "compactionLevel" | "erosionSigns" | "soilExposedPercent"
  | "vegetationCoverPercent" | "fragmentationLevel" | "hasRiparianApp" | "landscapeDegradation"
  | "drainageDensityKmPerKm2" | "elevationMeters" | "slopePercent", string>;
const empty = Object.fromEntries(["waterSourceType", "hasSpring", "wellDepthMeters", "waterAvailability", "salinityIndicator", "soilTexture", "infiltrationRateMmPerHour", "compactionLevel", "erosionSigns", "soilExposedPercent", "vegetationCoverPercent", "fragmentationLevel", "hasRiparianApp", "landscapeDegradation", "drainageDensityKmPerKm2", "elevationMeters", "slopePercent"].map((k) => [k, ""])) as F;
const WELLS = ["SHALLOW_WELL", "TUBULAR_WELL"];

function validate(f: F): { errors: Partial<F>; data?: EnvironmentalInput } {
  const e: Partial<F> = {};
  const req = (k: keyof F) => { if (!f[k]) e[k] = "Campo obrigatório."; };
  const num = (k: keyof F, { required = false, min, max }: { required?: boolean; min?: number; max?: number } = {}) => {
    if (!f[k].trim()) { if (required) e[k] = "Campo obrigatório."; return null; }
    const n = parseDecimal(f[k]);
    if (n === null) { e[k] = "Informe um número válido."; return null; }
    if (min !== undefined && max !== undefined && (n < min || n > max)) { e[k] = `Informe um número entre ${min} e ${max}.`; return null; }
    if (min !== undefined && n < min) { e[k] = `Informe um número maior ou igual a ${min}.`; return null; }
    return n;
  };
  ["waterSourceType", "hasSpring", "waterAvailability", "soilTexture", "compactionLevel", "erosionSigns", "fragmentationLevel", "landscapeDegradation"].forEach((k) => req(k as keyof F));
  const well = num("wellDepthMeters", { min: 0 });
  if (f.wellDepthMeters.trim() && f.waterSourceType && !WELLS.includes(f.waterSourceType)) e.wellDepthMeters = "Profundidade é aplicável somente a poços.";
  const infil = num("infiltrationRateMmPerHour", { required: true, min: 0 });
  const exposed = num("soilExposedPercent", { min: 0, max: 100 });
  const cover = num("vegetationCoverPercent", { required: true, min: 0, max: 100 });
  const drainage = num("drainageDensityKmPerKm2", { min: 0 });
  const elevation = num("elevationMeters");
  const slope = num("slopePercent", { min: 0 });
  if (Object.keys(e).length) return { errors: e };
  return {
    errors: e,
    data: {
      water: { waterSourceType: f.waterSourceType as never, hasSpring: f.hasSpring === "true", wellDepthMeters: WELLS.includes(f.waterSourceType) ? well : null, waterAvailability: f.waterAvailability as never, salinityIndicator: (f.salinityIndicator || null) as never },
      soil: { soilTexture: f.soilTexture as never, infiltrationRateMmPerHour: infil!, compactionLevel: f.compactionLevel as never, erosionSigns: f.erosionSigns as never, soilExposedPercent: exposed },
      vegetation: { vegetationCoverPercent: cover!, fragmentationLevel: f.fragmentationLevel as never, hasRiparianApp: f.hasRiparianApp === "" ? null : f.hasRiparianApp === "true", landscapeDegradation: f.landscapeDegradation as never },
      terrain: { drainageDensityKmPerKm2: drainage, elevationMeters: elevation, slopePercent: slope },
    },
  };
}

function NewEnv() {
  const { laboratoryId, areaId, collectionId } = Route.useParams();
  const p = { laboratoryId, areaId, collectionId };
  const ctx = useLabContext(laboratoryId);
  const existing = useQuery({ queryKey: ["env", collectionId], queryFn: () => api.getEnvironmental(laboratoryId, areaId, collectionId) });
  const [f, setF] = useState<F>(empty); // apenas em memória: sem rascunho persistido
  const [errors, setErrors] = useState<Partial<F>>({});
  const [review, setReview] = useState<EnvironmentalInput | null>(null);
  const [key] = useState(() => newIdempotencyKey());
  const [uncertain, setUncertain] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const m = useMutation({
    mutationFn: (b: EnvironmentalInput) => api.createEnvironmental(laboratoryId, areaId, collectionId, b, key),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Dados ambientais confirmados.");
      navigate({ to: "/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId/environmental-data", params: p });
    },
    onError: (e) => setUncertain(e instanceof ApiError && e.isNetwork),
  });

  if (ctx && !can(ctx, "registerEnvironmental")) return <ForbiddenState />;
  if (existing.isPending) return <LoadingState />;
  if (existing.isError) return <ErrorState error={existing.error} onRetry={() => existing.refetch()} />;
  if (existing.data.environmentalData && !m.isPending && !uncertain) {
    return (
      <div className="max-w-3xl">
        <PageHeader title="Dados ambientais já confirmados" back={{ to: "/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId", params: p, label: "Voltar à coleta" }} />
        <Notice tone="info" role="status">Esta coleta já possui um conjunto confirmado. Ele é imutável e está exibido abaixo.</Notice>
        <Card className="mt-4"><EnvironmentalView d={existing.data.environmentalData} /></Card>
      </div>
    );
  }

  const set = (k: keyof F) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const sourceChange = (e: { target: { value: string } }) => {
    const v = e.target.value;
    setF((s) => ({ ...s, waterSourceType: v }));
    if (f.wellDepthMeters.trim() && !WELLS.includes(v)) setErrors((er) => ({ ...er, wellDepthMeters: "Profundidade é aplicável somente a poços. Apague o valor ou escolha um poço." }));
  };
  function submit(e: FormEvent) {
    e.preventDefault();
    const r = validate(f);
    setErrors(r.errors);
    if (!r.data) return focusFirstInvalid(ref.current);
    setReview(r.data);
    window.scrollTo({ top: 0 });
  }
  const back = { to: "/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId", params: p, label: "Voltar à coleta" };
  const hasErrors = Object.keys(errors).length > 0;

  if (review) {
    return (
      <div className="max-w-3xl">
        <PageHeader title="Revise as medições" subtitle="Os quatro grupos serão confirmados juntos e não poderão ser editados." back={back} />
        <Card>
          <EnvironmentalView d={review} />
          {m.isError && (
            <div className="mt-4 space-y-2"><Notice tone="danger" role="alert">
              {uncertain ? "Resultado desconhecido: não sabemos se o servidor registrou as medições. Consulte o registro ou repita a mesma tentativa (não cria duplicata). A edição fica bloqueada enquanto incerto." : (m.error as ApiError).message}
            </Notice></div>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {uncertain ? (
              <Button asChild variant="outline"><Link to="/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId/environmental-data" params={p}>Consultar registro</Link></Button>
            ) : (
              <Button variant="outline" onClick={() => setReview(null)} disabled={m.isPending}>Corrigir</Button>
            )}
            <Button onClick={() => m.mutate(review)} disabled={m.isPending}>{m.isPending && <Loader2 className="animate-spin" aria-hidden />} {uncertain ? "Repetir a mesma tentativa" : "Confirmar medições"}</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Registrar dados ambientais" subtitle="Campos com * são obrigatórios. Vazio em opcionais significa “não informado”; zero e “Não” são valores informados." back={back} />
      <form ref={ref} onSubmit={submit} noValidate className="space-y-4">
        {hasErrors && <Notice tone="danger" role="alert">Verifique os campos indicados.</Notice>}
        <Group k="water"><div className="grid gap-4 py-3 sm:grid-cols-2">
          <SelectField label="Fonte de água" required options={opts(waterSourceLabel)} value={f.waterSourceType} onChange={sourceChange} error={errors.waterSourceType} />
          <SelectField label="Há nascente" required options={yesNo} value={f.hasSpring} onChange={set("hasSpring")} error={errors.hasSpring} />
          <TextField label="Profundidade do poço" unit="m" inputMode="decimal" value={f.wellDepthMeters} onChange={set("wellDepthMeters")} error={errors.wellDepthMeters} hint="Somente para poço raso ou tubular. Número ≥ 0." disabled={!!f.waterSourceType && !WELLS.includes(f.waterSourceType) && !f.wellDepthMeters} />
          <SelectField label="Disponibilidade hídrica" required options={opts(waterAvailabilityLabel)} value={f.waterAvailability} onChange={set("waterAvailability")} error={errors.waterAvailability} />
          <SelectField label="Indicador de salinidade" options={opts(salinityLabel)} placeholder="Não informado" value={f.salinityIndicator} onChange={set("salinityIndicator")} hint="Indicador qualitativo, não medida em g/kg." />
        </div></Group>
        <Group k="soil"><div className="grid gap-4 py-3 sm:grid-cols-2">
          <SelectField label="Textura do solo" required options={opts(soilTextureLabel)} value={f.soilTexture} onChange={set("soilTexture")} error={errors.soilTexture} />
          <TextField label="Taxa de infiltração" unit="mm/h" required inputMode="decimal" value={f.infiltrationRateMmPerHour} onChange={set("infiltrationRateMmPerHour")} error={errors.infiltrationRateMmPerHour} hint="Número ≥ 0." />
          <SelectField label="Compactação" required options={opts(levelLabelF)} value={f.compactionLevel} onChange={set("compactionLevel")} error={errors.compactionLevel} />
          <SelectField label="Sinais de erosão" required options={opts(erosionLabel)} value={f.erosionSigns} onChange={set("erosionSigns")} error={errors.erosionSigns} />
          <TextField label="Solo exposto" unit="%" inputMode="decimal" value={f.soilExposedPercent} onChange={set("soilExposedPercent")} error={errors.soilExposedPercent} hint="Entre 0 e 100." />
        </div></Group>
        <Group k="vegetation"><div className="grid gap-4 py-3 sm:grid-cols-2">
          <TextField label="Cobertura vegetal" unit="%" required inputMode="decimal" value={f.vegetationCoverPercent} onChange={set("vegetationCoverPercent")} error={errors.vegetationCoverPercent} hint="Entre 0 e 100." />
          <SelectField label="Fragmentação" required options={opts(levelLabelF)} value={f.fragmentationLevel} onChange={set("fragmentationLevel")} error={errors.fragmentationLevel} />
          <SelectField label="Presença de APP ripária" options={yesNo} placeholder="Não informado" value={f.hasRiparianApp} onChange={set("hasRiparianApp")} />
          <SelectField label="Degradação da paisagem" required options={opts(levelLabelF)} value={f.landscapeDegradation} onChange={set("landscapeDegradation")} error={errors.landscapeDegradation} />
        </div></Group>
        <Group k="terrain"><div className="grid gap-4 py-3 sm:grid-cols-2">
          <TextField label="Densidade de drenagem" unit="km/km²" inputMode="decimal" value={f.drainageDensityKmPerKm2} onChange={set("drainageDensityKmPerKm2")} error={errors.drainageDensityKmPerKm2} hint="Número ≥ 0. Contextual; não pontua nesta versão." />
          <TextField label="Elevação" unit="m" inputMode="decimal" value={f.elevationMeters} onChange={set("elevationMeters")} error={errors.elevationMeters} hint="Qualquer número, inclusive negativo." />
          <TextField label="Declividade" unit="%" inputMode="decimal" value={f.slopePercent} onChange={set("slopePercent")} error={errors.slopePercent} hint="Número ≥ 0. Opcional aqui, mas necessária ao diagnóstico IHFR." />
        </div></Group>
        <p className="text-sm text-muted-foreground">O preenchimento existe apenas nesta página; não há rascunho salvo.</p>
        <div className="flex justify-end gap-2">
          <Button asChild variant="outline"><Link to="/dashboard/laboratories/$laboratoryId/areas/$areaId/collections/$collectionId" params={p}>Cancelar</Link></Button>
          <Button type="submit">Revisar os quatro grupos</Button>
        </div>
      </form>
    </div>
  );
}
