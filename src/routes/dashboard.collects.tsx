import { createFileRoute, redirect } from "@tanstack/react-router";

// Rota legada: redireciona sem criar módulo próprio.
export const Route = createFileRoute("/dashboard/collects")({
  beforeLoad: () => {
    throw redirect({ to: "/workspace", replace: true });
  },
});
