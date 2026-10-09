import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/hf/AppShell";
export const Route = createFileRoute("/admin")({
  component: () => (
    <AppShell requireGlobalAdmin>
      <Outlet />
    </AppShell>
  ),
});
