# Correção local: login e UUIDs em HTTP na rede local

Verificação em 2026-10-09, na branch `feat/incorporacao-frontend-hidroflorestas`, sobre `1472166e9b64433bcd6e6cde543035d93ac1692e`. Na conclusão da validação local, ainda não havia commit, push, merge ou deploy desta correção. Somente o starter foi alterado.

## Causa confirmada após o relato persistente

A URL informada pelo usuário foi `http://192.168.18.72:8080/`. Nessa origem HTTP de rede local, Chromium e Firefox reportaram `isSecureContext: false`, `typeof crypto.randomUUID: "undefined"` e `typeof crypto.getRandomValues: "function"`. Ambos reproduziram `TypeError: crypto.randomUUID is not a function` na inicialização de `src/adapter/mock.ts`, antes de conectar os eventos do aplicativo. Entrar, Demonstração e as contas permaneceram desabilitados. O HTML SSR continuava visível, dando a impressão de uma tela carregada.

Os testes anteriores em localhost/127.0.0.1 passaram porque essas origens disponibilizam randomUUID. A primeira correção tratou o clique durante o carregamento, mas não resolveu esse erro de inicialização. Essas evidências anteriores são mantidas abaixo e não comprovam funcionamento na rede local.

`src/lib/random-uuid.ts` agora usa randomUUID nativo quando disponível e, em HTTP na rede local, gera UUID v4 com `crypto.getRandomValues`, preservando aleatoriedade criptográfica e bits de versão/variante. O mock e `newIdempotencyKey` usam a mesma função; isso corrige também operações posteriores, além do login. Não foi usado Math.random nem alterada a política de segurança do navegador.

## Estado e reprodução inicial em localhost

A árvore tinha apenas `package-lock.json` não versionado, criado pelo `npm i` do usuário. Esse arquivo e o `bun.lock` foram preservados, sem reinstalação ou troca de gerenciador. Node inicial: 20.19.2; npm: 9.2.0; o projeto declara Bun 1.3.11 e Node >=22.12.0. O ambiente suportado foi conferido com Node 22.23.2 já disponível localmente.

O servidor foi iniciado com `npm run dev -- --host 127.0.0.1 --port 4173`. Chromium real, executado por Playwright, inspecionou console, respostas/requisições de módulos, script de entrada e elementos atingidos pelo ponteiro.

Após hidratar, clicar em Luciano preenchia email e senha normalmente. Nessa origem localhost, não foi reproduzida uma falha permanente após a hidratação. O hit test confirmou o próprio botão como alvo, sem sobreposição interceptando cliques; não ocorreram erros de módulos, execução ou hidratação.

Na investigação inicial em localhost, foi reproduzido um clique perdido antes da hidratação: numa visita inicial, o HTML SSR mostrava os botões das contas habilitados, enquanto Entrar e Demonstração ainda estavam desabilitados. O clique real em Luciano não preencheu os inputs, que continuaram vazios mesmo após hidratar. Isso foi reproduzido sem atraso artificial em 1440px e 375px; o fluxo até a confirmação da hidratação levou aproximadamente 2,2s e 1,8s respectivamente. A pausa controlada do módulo `virtual:tanstack-start-dev-client-entry` também reproduziu o clique perdido e permitiu testar essa janela de forma determinística.

`src/routes/login.tsx` já possuía `useHydrated`, mas aplicava a proteção somente ao submit. `src/demo/DemoPanel.tsx` já protegia o botão de abertura. A inicialização padrão do TanStack Start usa `hydrateRoot` no cliente; `src/routes/__root.tsx` mantém `<Scripts />` no shell. Não foi necessário alterar painel, shell, inicialização ou configuração Vite.

React/React DOM 19.2.8, TanStack Start 1.168.60, TanStack Router 1.170.41 e Vite 8.1.5 coincidem nos dois lockfiles. A reprodução e a validação usaram a instalação npm existente. Não há evidência para atribuir esta falha ao npm ou ao Node 20; Node 20 permanece abaixo do requisito do projeto.

## Correção

- As contas aguardam hidratação e ficam desabilitadas durante envio, evitando ações aparentemente disponíveis sem eventos conectados.
- A tela explica que selecionar preenche email/senha demo, e que a sessão começa ao acionar Entrar.
- Um status anuncia carregamento, disponibilidade e preenchimento da conta selecionada. Editar manualmente os campos limpa a confirmação anterior.
- Selecionar uma conta limpa erros antigos; preserva `type="button"`, sem autenticar ou navegar automaticamente.

## Evidências da primeira rodada, antes de conhecer a URL de rede

- `scripts/validate-login.mjs`: dez grupos em Chromium, em 1440x900 e 375x900, tanto com o servidor em Node 20.19.2 quanto em Node 22.23.2. Inclui módulo inicial pausado, hit test, clique nas seis contas, preenchimento sem iniciar sessão, edição manual, conta bloqueada, limpeza do erro, Tab, Enter e Espaço. Membro Ana acessa workspace; administradora global Carla acessa admin. Nenhum erro de execução ou falha de módulo local nas duas rodadas.
- TypeScript: `node node_modules/typescript/bin/tsc --noEmit`, com Node 22.23.2, exit 0.
- Lint: `node node_modules/eslint/bin/eslint.js .`, com Node 22.23.2, exit 0; zero erros e nove avisos herdados de Fast Refresh.
- Vitest: `node node_modules/vitest/vitest.mjs run`, com Node 22.23.2, exit 0; três arquivos, 13 testes aprovados.
- Build padrão: `node node_modules/vite/bin/vite.js build`, com Node 22.23.2 e limite de memória, exit 0; Cloudflare/Nitro, sem deploy.
- `git diff --check`: aprovado. Não foram repetidas as jornadas de áreas, coleta, medições, IHFR e mapa, cujo código não mudou.

Logs desta rodada: [browser Node 20](execucoes/login-browser-node20.txt), [browser Node 22](execucoes/login-browser-node22.txt), [Vitest](execucoes/login-vitest.txt), [build](execucoes/login-build.txt). Não substituem as evidências da incorporação anterior.

Para repetir a regressão de login com Node 22.12+ e um único servidor dev ativo:

```sh
npm run dev -- --host 127.0.0.1 --port 4173
# Em outro terminal, com Chromium já instalado:
DEMO_BASE_URL=http://127.0.0.1:4173 node scripts/validate-login.mjs
```

O script aceita `CHROMIUM_EXECUTABLE_PATH` para usar um Chromium existente. Não instala dependências nem grava nos lockfiles. A pausa controlada do módulo inicial verifica a versão dev, não um preview de produção.

Checksums preservados:

- `package-lock.json`: `e3e1790a8eec7dcb26780cd57ec870783dc41877a56ade101f3e165e0c7f26cb`.
- `bun.lock`: `bc33f785ba6d68485d550d1808b4820bdd0f0e8fc948354cc5e60a2bee62aa0c`.

Pendentes: confirmação pelo usuário após recarregar a página, aparelhos físicos e leitores de tela. Os testes móveis usaram viewport do Chromium; não constituem teste em aparelho físico. Os servidores iniciados nesta tarefa foram encerrados. Nenhuma alteração foi realizada no FullStack ou nos dois repositórios de origem.

## Validação da correção da causa de inicialização

O servidor do usuário em `192.168.18.72:8080` foi identificado como `/usr/bin/node` (20.19.2), executando neste starter. Foi preservado e não foi encerrado. Um servidor adicional iniciado para investigação na porta 8081 foi encerrado. O problema foi reproduzido e corrigido na instalação npm existente, sem reinstalação ou mudança de lockfiles.

- Chromium e Firefox: 12 grupos por navegador, em 1440x900 e 375x900, na URL HTTP de rede local informada. Incluem contas, preenchimento sem sessão automática, login de membro/administradora, conta bloqueada, Tab/Shift+Tab, Enter/Espaço e geração de 100 UUIDs por viewport sem randomUUID. A navegação por teclado parte da página inicial e abre o login pelo link Entrar. Nenhum erro de execução ou falha de módulo local após a correção.
- TypeScript: aprovado com Node 22.23.2. Lint: zero erros e nove avisos herdados, com Node 22.23.2.
- Vitest: quatro arquivos, 15 testes aprovados com Node 22.23.2; os dois novos testes verificam geração nativa e geração criptográfica v4 sem randomUUID.
- Build padrão Cloudflare/Nitro: aprovado com Node 22.23.2, sem deploy.
- `git diff --check`: aprovado; lockfiles com os mesmos checksums registrados acima.

Evidências: [falha antes da correção](execucoes/login-lan-antes.txt), [Chromium na rede local](execucoes/login-lan-chromium.txt), [Firefox na rede local](execucoes/login-lan-firefox.txt), [Vitest após UUID compatível](execucoes/login-lan-vitest.txt), [lint](execucoes/login-lan-lint.txt), [TypeScript](execucoes/login-lan-typecheck.txt), [build](execucoes/login-lan-build.txt).

Para repetir usando seu servidor atual:

```sh
DEMO_BASE_URL=http://192.168.18.72:8080 node scripts/validate-login.mjs
DEMO_BASE_URL=http://192.168.18.72:8080 DEMO_BROWSER=firefox node scripts/validate-login.mjs
```

O teste aceita `CHROMIUM_EXECUTABLE_PATH` e `FIREFOX_EXECUTABLE_PATH`. Node 22.12+ continua sendo o requisito recomendado do projeto, mas não é a causa comprovada dessa falha. Na conclusão desta rodada, a correção ainda estava local, sem commit, push, merge ou deploy.

## Preparação para publicação

A publicação foi autorizada após a validação. O PR de incorporação #1 já havia sido mesclado; a correção foi separada na branch `fix/login-http-rede-local`, a partir de `origin/main` em `570b36d05768fb66abcf627cdefaaeddcccc52d5`. Essa base tem o mesmo conteúdo de aplicação validado sobre `1472166e9b64433bcd6e6cde543035d93ac1692e`, acrescido somente do commit de merge. Não houve reescrita de histórico. As evidências acima foram conferidas para publicação, sem repetição automática dos testes ou builds. O `package-lock.json` do usuário permanece local e não faz parte do commit. O novo PR destina-se à revisão e merge manual, sem auto-merge ou deploy manual.
