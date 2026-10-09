import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/adapter";
import { AppShell } from "@/components/hf/AppShell";
import { ErrorState, LoadingState, ReadOnlyBanner } from "@/components/hf/primitives";

export const Route = createFileRoute("/dashboard/laboratories/$laboratoryId")({
  component: LabLayout,
});

function LabLayout() {
  return <AppShell><LabGate /></AppShell>;
}

function LabGate() {
  const { laboratoryId } = Route.useParams();
  const q = useQuery({ queryKey: ["lab", laboratoryId], queryFn: () => api.getLaboratory(laboratoryId) });
  if (q.isPending) return <LoadingState label="Carregando laboratório…" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      {q.data.context.readOnly && <ReadOnlyBanner />}
      <Outlet />
    </>
  );
}
