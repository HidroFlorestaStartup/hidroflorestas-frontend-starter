import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, Droplets, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand, DemoTag } from "@/components/hf/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HidroFlorestas — Monitoramento ambiental por laboratórios" },
      { name: "description", content: "Registre áreas, coletas e medições ambientais e consulte diagnósticos IHFR experimentais." },
      { property: "og:title", content: "HidroFlorestas — Monitoramento ambiental" },
      { property: "og:description", content: "Registro e consulta de monitoramento ambiental por laboratórios." },
    ],
  }),
  component: Home,
});

const steps = [
  { icon: MapPinned, title: "Áreas de monitoramento", text: "Cada laboratório cadastra pontos com coordenadas revisadas antes da confirmação." },
  { icon: ClipboardCheck, title: "Coletas e medições", text: "Coletas confirmadas registram a ocorrência com fuso declarado; medições de Água, Solo, Vegetação e Terreno ficam imutáveis." },
  { icon: Droplets, title: "Diagnóstico IHFR experimental", text: "Quando houver dados suficientes, responsáveis podem solicitar o diagnóstico. Validação científica pendente." },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Brand className="text-xl" />
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/login">Entrar</Link></Button>
            <Button asChild className="hidden sm:inline-flex"><Link to="/register">Criar conta</Link></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="max-w-3xl">
          <DemoTag>Proposta navegável · dados sintéticos</DemoTag>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground sm:text-5xl">
            Monitoramento ambiental organizado por <span className="text-ochre">laboratório</span>.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Do cadastro da área à medição confirmada, cada registro mantém sua origem: quem é o laboratório, onde fica o ponto e quando a coleta ocorreu.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/login">Entrar</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/register">Criar conta</Link></Button>
          </div>
        </div>
        <ol className="mt-16 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-bold text-ochre">{i + 1}</span>
                <s.icon className="h-5 w-5 text-icon" aria-hidden />
              </div>
              <h2 className="mt-4 font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
