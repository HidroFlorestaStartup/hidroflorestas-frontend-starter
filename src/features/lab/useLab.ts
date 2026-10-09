import { useQuery } from "@tanstack/react-query";
import { api } from "@/adapter";

/** Contexto do laboratório já carregado pelo layout. */
export function useLabContext(labId: string) {
  return useQuery({ queryKey: ["lab", labId], queryFn: () => api.getLaboratory(labId) }).data?.context;
}

export const labHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} — HidroFlorestas` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — HidroFlorestas` },
    { property: "og:description", content: description },
  ],
});
