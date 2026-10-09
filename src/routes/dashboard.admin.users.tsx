import { createFileRoute, redirect } from "@tanstack/react-router";

// Rota legada: redireciona sem criar módulo próprio.
export const Route = createFileRoute("/dashboard/admin/users")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/users", replace: true });
  },
});
