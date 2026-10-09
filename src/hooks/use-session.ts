import { queryOptions, useQuery } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";
import { api } from "@/adapter";
import { useScenario } from "@/demo/scenario";

export const sessionQuery = (userId: string | null) =>
  queryOptions({ queryKey: ["me", userId], queryFn: () => api.me(), retry: false, staleTime: 30_000 });

/** Sessão atual. Na integração real, o cookie HttpOnly é a fonte; aqui o cenário da demonstração. */
export function useSession() {
  const hydrated = useHydrated();
  const { sessionUserId } = useScenario();
  const q = useQuery({ ...sessionQuery(sessionUserId), enabled: hydrated && !!sessionUserId });
  const status: "pending" | "anonymous" | "ready" | "error" =
    !hydrated ? "pending" : !sessionUserId ? "anonymous" : q.isPending ? "pending" : q.isError ? "anonymous" : "ready";
  return { status, session: q.data };
}
