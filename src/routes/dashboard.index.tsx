import { createFileRoute, redirect } from "@tanstack/react-router";

// Rota legada: redireciona sem criar módulo próprio.
export const Route = createFileRoute("/dashboard/")({
  beforeLoad: () => {
    throw redirect({ to: "/workspace", replace: true });
  },
});
