import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/adapter";
import { Button } from "@/components/ui/button";
import { Brand, Notice } from "@/components/hf/primitives";

export const Route = createFileRoute("/logout")({
  head: () => ({
    meta: [
      { title: "Saindo — HidroFlorestas" },
      { name: "description", content: "Encerrando a sessão." },
      { property: "og:title", content: "Saindo — HidroFlorestas" },
      { property: "og:description", content: "Encerrando a sessão." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Logout,
});

function Logout() {
  const [state, setState] = useState<"pending" | "error">("pending");
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const started = useRef(false);

  const run = useCallback(async () => {
    setState("pending");
    try {
      await api.logout();
      qc.clear();
      navigate({ to: "/login", replace: true }); // sucesso só após resposta confirmada
    } catch {
      setState("error");
    }
  }, [navigate, qc]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-[20px] bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <Brand className="text-xl" />
        {state === "pending" ? (
          <p role="status" className="mt-6 flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Encerrando sessão…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <Notice tone="danger" role="alert">Não foi possível encerrar a sessão. Você continua conectado.</Notice>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={run}>Tentar novamente</Button>
              <Button variant="outline" onClick={() => router.history.back()}>Voltar</Button>
            </div>
            <Link to="/workspace" className="block text-sm text-water-strong underline">Ir ao workspace</Link>
          </div>
        )}
      </div>
    </main>
  );
}
