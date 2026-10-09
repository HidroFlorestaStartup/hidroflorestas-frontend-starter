# HidroFlorestas — frontend de demonstração

[Repositório de destino](https://github.com/HidroFlorestaStartup/hidroflorestas-frontend-starter). Proposta navegável em português brasileiro, conectada ao Lovable, para registro e consulta de monitoramento ambiental por laboratório. React 19, TanStack Start, TypeScript, Tailwind CSS 4, Poppins e Leaflet no cliente.

## Executar

Requisitos: Node.js 22.12+ e Bun 1.3.11. Use somente Bun e o `bun.lock` versionado.

```sh
bun install --frozen-lockfile
bun run dev
```

O terminal informa o endereço local. Para executar numa porta específica:

```sh
bun run dev -- --host 127.0.0.1 --port 4173
```

Para consultar o build local com SSR, sem HMR:

```sh
bun run build:local
bun run preview -- --host 127.0.0.1 --port 4173
```

`build:local` seleciona o preset Node somente nessa execução. `build` mantém a seleção normal do Lovable/Nitro.

## Verificar

Execute em sequência, especialmente em máquinas com pouca memória:

```sh
bun run typecheck
bun run lint
bun run test
bun run build
```

Os testes Vitest usam um worker. Para a jornada no navegador, mantenha apenas um servidor local aberto e instale o Chromium de teste uma vez:

```sh
bunx playwright-core install chromium
DEMO_BASE_URL=http://127.0.0.1:4173 bun run test:browser
DEMO_BASE_URL=http://127.0.0.1:4173 bun run test:keyboard
```

Um Chromium existente pode ser indicado em `CHROMIUM_EXECUTABLE_PATH`. O teste usa uma página de cada vez e grava capturas e relatório em `docs/validacao/resultado/`. Não execute build, browser e vários servidores simultaneamente em notebook com recursos limitados.

## Demonstração

No login, escolha uma das contas fictícias listadas e use qualquer senha não vazia. A faixa “Protótipo · dados sintéticos” abre o painel “Demonstração” com perfis e falhas. Nenhuma senha ou token é guardado.

| Perfil           | Conta sintética                 | Cenário                                                             |
| ---------------- | ------------------------------- | ------------------------------------------------------------------- |
| OWNER            | luciano@demo.hidroflorestas.org | Um laboratório ativo e um inativo; gestão de áreas, membros e IHFR. |
| ADMIN contextual | pedro@demo.hidroflorestas.org   | Gestão de áreas e IHFR, sem administração global.                   |
| MEMBER           | ana@demo.hidroflorestas.org     | Consulta, coleta e medições; sem criar áreas ou gerir IHFR.         |
| ADMIN global     | carla@demo.hidroflorestas.org   | `/admin` e `/admin/users`; sem vínculo com laboratórios.            |
| Sem laboratório  | marcos@demo.hidroflorestas.org  | Workspace vazio e criação de laboratório.                           |
| Limite atingido  | julia@demo.hidroflorestas.org   | Cinco laboratórios acessíveis; criação bloqueada.                   |

Conta bloqueada: rafael@demo.hidroflorestas.org, com mensagem genérica de credenciais inválidas.

Jornada: login → workspace → escolha explícita de laboratório → áreas → registrar/consultar área → coleta com ocorrência e offset → quatro grupos ambientais → IHFR simulado. Coletas existentes também são acessíveis pelo histórico, detalhe da área e mapa. Criar laboratório não o seleciona automaticamente.

O painel simula lentidão, leituras indisponíveis, falha no logout, geolocalização concedida/negada/timeout/tardia, falha nos tiles, conflito administrativo, medições com resultado desconhecido e IHFR insuficiente/incompatível/incerto. Há consultas vazias e laboratórios inativos em somente leitura. As operações incertas mantêm corpo e chave para recuperação ou repetição.

## Limites e continuidade

Todos os dados são sintéticos. O adapter em `src/adapter/index.ts` seleciona `mockApi`, atrás da interface `HidroApi` em `src/adapter/api.ts`. Dados de domínio ficam em memória e reiniciam ao recarregar; somente a escolha de cenário/perfil fica em sessionStorage. Formulários não são rascunhos persistidos.

IHFR usa fixtures com “Resultado simulado — demonstração”. É experimental, com validação científica pendente, sujeito a recalibração e não aprovado como contrato científico definitivo. Não há cálculo próprio, autenticação real, backend, banco, Supabase/Lovable Cloud, conexão ao FullStack, upload ou fluxos inventados.

Mapas têm atribuição OpenStreetMap e lista/coordenadas alternativas quando tiles falham. Poppins vem de Google Fonts com fallback sans-serif. Fontes e cartografia externa dependem da rede.

A integração futura exige adaptação ao Next.js App Router, aos cookies HttpOnly, à autorização e aos contratos reais. Verificação de e-mail, recuperação/troca de senha e exclusão da própria conta já avançaram no FullStack e estão documentadas como trabalho posterior.

Consulte o [relatório da incorporação](docs/incorporacao-frontend-hidroflorestas.md), o [plano](docs/plano-incorporacao-frontend.md) e as [evidências](docs/validacao). Preserve `.lovable`, o remote e o histórico publicado. A incorporação foi validada localmente; publicação da branch e revisão por Pull Request constituem uma etapa posterior.
