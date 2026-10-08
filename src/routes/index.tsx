import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HidroFlorestas-FrontEnd" },
      { name: "description", content: "Front-end do projeto HidroFlorestas." },
      { property: "og:title", content: "HidroFlorestas-FrontEnd" },
      { property: "og:description", content: "Front-end do projeto HidroFlorestas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        HidroFlorestas-FrontEnd
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Projeto em construção.
      </p>
    </div>
  );
}
