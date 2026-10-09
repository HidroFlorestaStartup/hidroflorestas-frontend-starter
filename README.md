# HidroFlorestas — frontend de demonstração

Destino: https://github.com/HidroFlorestaStartup/hidroflorestas-frontend-starter

Aplicação importada de `PedroVitor237/HidroFlorestas-FrontEnd` em `3f55b94fc0989ad45a48b711162e07104912b3b6`. A conexão Lovable e o histórico Git são os do starter.

## Execução

Use Node.js 22.12+ e Bun 1.3.11:

```sh
bun install --frozen-lockfile
bun run dev
bun run build
bun run lint
bunx tsc --noEmit
bun run test
```

React 19, TanStack Start, Tailwind CSS 4, Leaflet no cliente e adapter sintético. Sem backend, banco, autenticação real ou cálculo IHFR. Qualquer senha não vazia funciona para as contas fictícias indicadas no login. Os dados de domínio são mantidos em memória e reiniciam ao recarregar. Apenas escolhas de cenário ficam em sessionStorage, sem senhas ou tokens.

O painel “Demonstração” alterna OWNER, ADMIN contextual, MEMBER, ADMIN global, conta sem laboratório, limite de cinco laboratórios e falhas simuladas. O laboratório é escolhido explicitamente no workspace.

Integração com o FullStack (Next.js App Router) fica para outra etapa. IHFR é experimental, simulado, com validação científica pendente e sujeito a recalibração.
