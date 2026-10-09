import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crosshair, Loader2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/adapter";
import { MapView } from "@/components/hf/map/MapView";
import { Card, DefRow, ForbiddenState, Notice, NotInformed, PageHeader, TextAreaField, TextField, focusFirstInvalid } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { getScenario } from "@/demo/scenario";
import { fmtDecimal } from "@/domain/labels";
import { can } from "@/domain/permissions";
import type { AreaInput } from "@/domain/types";
import { labHead, useLabContext } from "@/features/lab/useLab";
import { parseDecimal } from "@/features/forms/numbers";

export const Route = createFileRoute("/dashboard/laboratories/$laboratoryId/areas/new")({
  head: labHead("Nova área", "Cadastro de ponto de monitoramento com revisão da localização."),
  component: NewArea,
});

type F = { name: string; latitude: string; longitude: string; municipality: string; state: string; landType: string; description: string };
const empty: F = { name: "", latitude: "", longitude: "", municipality: "", state: "", landType: "", description: "" };

/** Localização do dispositivo. Na demonstração, simulada conforme o cenário. */
function requestLocation(): Promise<{ lat: number; lng: number }> {
  const mode = getScenario().geo;
  return new Promise((resolve, reject) => {
    const delay = mode === "late" ? 4000 : mode === "timeout" ? 2500 : 800;
    setTimeout(() => {
      if (mode === "denied") reject(new Error("denied"));
      else if (mode === "timeout") reject(new Error("timeout"));
      else resolve({ lat: -3.39871, lng: -44.36012 });
    }, delay);
  });
}

function NewArea() {
  const { laboratoryId } = Route.useParams();
  const ctx = useLabContext(laboratoryId);
  const [f, setF] = useState<F>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof F, string>>>({});
  const [step, setStep] = useState<"form" | "review">("form");
  const [geo, setGeo] = useState<{ state: "idle" | "pending" | "error" | "ignored"; msg?: string }>({ state: "idle" });
  const editVersion = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const m = useMutation({
    mutationFn: (b: AreaInput) => api.createArea(laboratoryId, b),
    onSuccess: ({ area }) => {
      qc.invalidateQueries({ queryKey: ["areas", laboratoryId] });
      qc.invalidateQueries({ queryKey: ["summary", laboratoryId] });
      qc.invalidateQueries({ queryKey: ["history", laboratoryId] });
      toast.success("Área cadastrada.");
      navigate({ to: "/dashboard/laboratories/$laboratoryId/areas/$areaId", params: { laboratoryId, areaId: area.id } });
    },
  });

  if (ctx && !can(ctx, "createArea")) return <ForbiddenState />;

  const setField = (k: keyof F, v: string) => {
    if (k === "latitude" || k === "longitude") editVersion.current++;
    setF((p) => ({ ...p, [k]: v }));
  };
  const setPoint = (lat: number, lng: number) => {
    editVersion.current++;
    setF((p) => ({ ...p, latitude: String(lat).replace(".", ","), longitude: String(lng).replace(".", ",") }));
  };

  async function useDevice() {
    const v = ++editVersion.current;
    setGeo({ state: "pending" });
    try {
      const r = await requestLocation();
      if (editVersion.current !== v) {
        setGeo({ state: "ignored", msg: "A localização do dispositivo chegou depois de você editar as coordenadas e não foi aplicada." });
        return;
      }
      setF((p) => ({ ...p, latitude: String(r.lat).replace(".", ","), longitude: String(r.lng).replace(".", ",") }));
      setGeo({ state: "idle", msg: "Localização do dispositivo aplicada. Revise antes de cadastrar." });
    } catch (e) {
      setGeo({ state: "error", msg: (e as Error).message === "denied"
        ? "Permissão de localização negada. Informe as coordenadas manualmente ou clique no mapa."
        : "Não foi possível obter a localização a tempo. Informe as coordenadas manualmente ou clique no mapa." });
    }
  }

  const lat = parseDecimal(f.latitude);
  const lng = parseDecimal(f.longitude);
  const norm = (s: string) => (s.trim() === "" ? null : s.trim());

  function validate(e: FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    const name = f.name.trim();
    if (!name) errs.name = "Campo obrigatório.";
    else if (name.length > 100) errs.name = "Use no máximo 100 caracteres.";
    if (!f.latitude.trim()) errs.latitude = "Campo obrigatório.";
    else if (lat === null || lat < -90 || lat > 90) errs.latitude = "Informe um número entre -90 e 90.";
    if (!f.longitude.trim()) errs.longitude = "Campo obrigatório.";
    else if (lng === null || lng < -180 || lng > 180) errs.longitude = "Informe um número entre -180 e 180.";
    (["municipality", "state", "landType"] as const).forEach((k) => { if (f[k].trim().length > 100) errs[k] = "Use no máximo 100 caracteres."; });
    if (f.description.trim().length > 2000) errs.description = "Use no máximo 2000 caracteres.";
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstInvalid(formRef.current);
    setStep("review");
  }

  const payload = (): AreaInput => ({
    name: f.name.trim(), latitude: lat!, longitude: lng!,
    municipality: norm(f.municipality), state: norm(f.state), landType: norm(f.landType), description: norm(f.description),
  });

  const crumbs = [{ label: "Workspace", to: "/workspace" }, { label: "Áreas", to: "/dashboard/laboratories/$laboratoryId/areas", params: { laboratoryId } }, { label: "Nova área" }];

  if (step === "review") {
    const p = payload();
    return (
      <div className="max-w-3xl">
        <PageHeader title="Revise a área antes de cadastrar" crumbs={crumbs} />
        <Card>
          <dl>
            <DefRow label="Laboratório">{ctx?.name}</DefRow>
            <DefRow label="Nome">{p.name}</DefRow>
            <DefRow label="Latitude">{fmtDecimal(p.latitude)}</DefRow>
            <DefRow label="Longitude">{fmtDecimal(p.longitude)}</DefRow>
            <DefRow label="Município">{p.municipality ?? <NotInformed />}</DefRow>
            <DefRow label="UF">{p.state ?? <NotInformed />}</DefRow>
            <DefRow label="Tipo de terreno (texto livre)">{p.landType ?? <NotInformed />}</DefRow>
            <DefRow label="Descrição">{p.description ?? <NotInformed />}</DefRow>
          </dl>
          <div className="mt-4"><MapView label="Ponto da área para revisão" points={[{ id: "new", lat: p.latitude, lng: p.longitude, label: p.name }]} selectedId="new" height={260} /></div>
          {m.isError && <div className="mt-4"><Notice tone="danger" role="alert">{(m.error as ApiError).message}</Notice></div>}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setStep("form")} disabled={m.isPending}>Corrigir</Button>
            <Button onClick={() => m.mutate(p)} disabled={m.isPending}>{m.isPending && <Loader2 className="animate-spin" aria-hidden />} Confirmar e cadastrar</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Nova área para monitoramento" subtitle="A área é um ponto. Informe as coordenadas, clique no mapa ou use a localização do dispositivo."
        back={{ to: "/dashboard/laboratories/$laboratoryId/areas", params: { laboratoryId }, label: "Voltar às áreas" }} crumbs={crumbs} />
      <form ref={formRef} onSubmit={validate} noValidate className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <TextField label="Nome da área monitorada" required placeholder="Ex.: Beira Rio" value={f.name} onChange={(e) => setField("name", e.target.value)} error={errors.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Latitude" required inputMode="decimal" placeholder="-2,53073" hint="Entre -90 e 90. Vírgula ou ponto." value={f.latitude} onChange={(e) => setField("latitude", e.target.value)} error={errors.latitude} />
            <TextField label="Longitude" required inputMode="decimal" placeholder="-44,30682" hint="Entre -180 e 180." value={f.longitude} onChange={(e) => setField("longitude", e.target.value)} error={errors.longitude} />
          </div>
          <div className="space-y-2">
            <Button type="button" variant="outline" onClick={useDevice} disabled={geo.state === "pending"}>
              {geo.state === "pending" ? <Loader2 className="animate-spin" aria-hidden /> : <Crosshair aria-hidden />} Usar localização do dispositivo
            </Button>
            {geo.state === "pending" && <p role="status" className="text-sm text-muted-foreground">Aguardando localização… você pode continuar editando.</p>}
            {geo.msg && <Notice tone={geo.state === "error" ? "warning" : "info"} role="status">{geo.msg}</Notice>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Município" value={f.municipality} onChange={(e) => setField("municipality", e.target.value)} error={errors.municipality} hint="Preenchimento manual." />
            <TextField label="UF" value={f.state} onChange={(e) => setField("state", e.target.value)} error={errors.state} hint="Texto livre." />
          </div>
          <TextField label="Tipo de terreno" value={f.landType} onChange={(e) => setField("landType", e.target.value)} error={errors.landType} hint="Texto livre; não substitui o uso predominante do diagnóstico." />
          <TextAreaField label="Descrição" value={f.description} onChange={(e) => setField("description", e.target.value)} error={errors.description} hint="Até 2000 caracteres." />
        </Card>
        <div className="space-y-4">
          <MapView label="Selecione o ponto clicando no mapa" height={420}
            points={lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [{ id: "new", lat, lng, label: f.name || "Novo ponto" }] : []}
            selectedId="new" onPick={setPoint} />
          <p className="text-sm text-muted-foreground">Clique no mapa para preencher latitude e longitude. Nenhum polígono é demarcado.</p>
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline"><Link to="/dashboard/laboratories/$laboratoryId/areas" params={{ laboratoryId }}>Cancelar</Link></Button>
            <Button type="submit">Revisar</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
