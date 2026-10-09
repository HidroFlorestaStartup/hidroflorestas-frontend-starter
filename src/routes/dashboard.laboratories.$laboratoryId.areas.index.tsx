import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Plus, Trees } from "lucide-react";
import { api } from "@/adapter";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/hf/primitives";
import { Button } from "@/components/ui/button";
import { fmtDecimal } from "@/domain/labels";
import { can } from "@/domain/permissions";
import { labHead } from "@/features/lab/useLab";

export const Route = createFileRoute("/dashboard/laboratories/$laboratoryId/areas/")({
  head: labHead("Áreas monitoradas", "Áreas de monitoramento ambiental cadastradas no laboratório."),
  component: Areas,
});

function Areas() {
  const { laboratoryId } = Route.useParams();
  const q = useQuery({ queryKey: ["areas", laboratoryId], queryFn: () => api.listAreas(laboratoryId) });
  const allowed = can(q.data?.context, "createArea");
  const newBtn = allowed && (
    <Button asChild><Link to="/dashboard/laboratories/$laboratoryId/areas/new" params={{ laboratoryId }}><Plus aria-hidden /> Nova área</Link></Button>
  );

  return (
    <div>
      <PageHeader title="Áreas monitoradas" subtitle="Gerencie áreas de monitoramento, registre coletas de campo e consulte diagnósticos IHFR experimentais."
        back={{ to: "/dashboard/laboratories/$laboratoryId", params: { laboratoryId }, label: "Voltar ao resumo" }} actions={newBtn} />
      {q.isPending ? <LoadingState label="Carregando áreas…" /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.data.areas.length === 0 ? (
        <EmptyState title="Nenhuma área cadastrada" action={newBtn}>
          {allowed ? "Cadastre o primeiro ponto de monitoramento." : "Proprietários e administradores do laboratório podem cadastrar áreas."}
        </EmptyState>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.areas.map((a) => (
            <li key={a.id} className="flex flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-[var(--shadow-card)]">
              <div className="grid h-28 place-items-center bg-secondary" aria-hidden><Trees className="h-10 w-10 text-icon" /></div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h2 className="text-lg font-semibold">{a.name}</h2>
                <p className="text-sm text-muted-foreground">{a.municipality || a.state ? [a.municipality, a.state].filter(Boolean).join(" / ") : "Município/UF não informados"}</p>
                <p className="flex items-center gap-1.5 text-sm"><MapPin className="h-4 w-4 text-ochre" aria-hidden />
                  <span>{fmtDecimal(a.latitude)}, {fmtDecimal(a.longitude)}</span></p>
                <Button asChild className="mt-auto w-full"><Link to="/dashboard/laboratories/$laboratoryId/areas/$areaId" params={{ laboratoryId, areaId: a.id }}>Ver detalhes<span className="sr-only"> de {a.name}</span></Link></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
