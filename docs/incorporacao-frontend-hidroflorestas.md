# Incorporação do frontend HidroFlorestas

Entrega local em 2026-10-09, branch `feat/incorporacao-frontend-hidroflorestas`. Destino único para alterações: `HidroFlorestaStartup/hidroflorestas-frontend-starter`. Sem push, PR, merge ou deploy. Protótipo de demonstração; integração posterior.

## Proveniência e estado inicial

Todos os clones foram identificados pelo remote, nas pastas irmãs do starter, e estavam limpos. O registro detalhado de caminhos, remotes, branches e SHAs está em [estado-inicial.json](validacao/estado-inicial.json). `git ls-remote --heads` confirmou os mesmos SHAs remotos; a tentativa inicial dentro do sandbox falhou por DNS e a consulta autorizada fora dele funcionou. Nenhum fetch, checkout, pull, instalação ou geração foi executado nas três referências.

| Repositório              | Branch inicial | SHA utilizado                              |
| ------------------------ | -------------- | ------------------------------------------ |
| Starter                  | main           | `8984bb80a29973c05a5830cb624c60df6ed5d575` |
| HidroFlorestas-FrontEnd  | main           | `3f55b94fc0989ad45a48b711162e07104912b3b6` |
| screenshot-show-off-18   | main           | `4541c618442ac16a790be322c944cabbf80d2b31` |
| HidroFlorestas-FullStack | development    | `beba96fbf6bbaac8771dbb29abea2f9f8f5b0054` |

FullStack tinha `main` e `development` remotas nesse mesmo SHA. Foram lidos os quatro AGENTS.md e, no FullStack, PROJECT_CONTEXT.md, TECH_DECISIONS.md, o prompt `docs/plans/active/estabilizacao-relatorios-interface/lovable-prompt.md`, os DTOs/handlers IHFR e a validação ambiental atual. Esses arquivos serviram como referência somente de leitura.

## Importação original

Commit `b9f82f3`: código, componentes, assets públicos, adapter, fixtures, tokens, rotas, testes e configurações da principal. Dependências e `bun.lock` originais, sem atualizações gerais. Não foram copiados .git, node_modules, ambientes, logs, dados locais, caches, builds nem .lovable de origem.

O AGENTS.md, o remote e todo o diretório .lovable do destino foram preservados, inclusive o `project.json` com revisão `tanstack_start_ts_current-435fd937eb68`. As fontes usavam revisão `tanstack_start_ts_current-ed7529d09b57`, que não foi transportada. README aponta ao destino. Na adaptação, o nome do package passou a `hidroflorestas-frontend-starter` e apenas Playwright Core 1.61.1 foi acrescentado para validação reproduzível. As demais versões do lockfile permaneceram iguais.

A [validação da importação](validacao/importacao-original.md) distingue o build aprovado das falhas herdadas de lint, TypeScript e montagem de rotas. A interrupção do notebook ocorreu antes do primeiro commit; /tmp e as primeiras capturas foram perdidos, mas o código no starter persistiu. A origem do travamento não foi comprovada. Após a retomada, servidores e browser foram executados um por vez, e os checks técnicos em sequência; Vitest foi limitado a um worker.

## Comparação visual e aproveitamento

As duas aplicações rodaram em cópias temporárias, com instalação congelada. As capturas em [fontes](validacao/fontes) cobrem landing, login, cadastro, workspace, laboratório, áreas, coleta, medições, IHFR e mapa; cadastro de área também em 375px. As imagens foram realmente renderizadas e inspecionadas, não inferidas de inspeção estática.

| Elemento                | Origem                                                             | Avaliação e aplicação                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acesso e cadastro       | Principal: `src/routes/login.tsx`, `register.tsx`                  | Cartão central de login, painel suave no cadastro, rótulos e mostrar senha. Mantidos por clareza e aderência ao prompt; a complementar tem login dividido e campos brancos.                                                                                                                                                                       |
| Navegação e formulários | Principal: AppShell, primitives, routes                            | Base única com contexto explícito, revisão e quatro grupos ambientais. Mantidos; não se importou outro adapter, estado ou sistema de estilos.                                                                                                                                                                                                     |
| Administração           | Complementar: `src/routes/admin.tsx`, `src/routes/admin/users.tsx` | Composição de entrada, busca/filtros, detalhe, revisão e auditoria preencheram a lacuna. Adaptadas ao HidroApi, cursores opacos e auditoria por conta. Cartões selecionáveis por teclado substituem linhas de tabela clicáveis. Totais do `adminOverview` complementar não foram transportados: esse endpoint não pertence ao contrato principal. |
| Histórico clicável      | Complementar: `src/routes/dashboard/laboratories/$labId/index.tsx` | Linha inteira acessível como link, área de toque maior e ocorrência sem truncamento. Reutiliza `history` principal.                                                                                                                                                                                                                               |
| Diálogos de cenários    | Complementar: `src/components/demo/demo-panel.tsx`                 | Referência de uso de primitiva Radix para modal. O painel principal passou a Dialog, com foco contido, Escape e restauração de foco. A entrada fica numa faixa de demonstração, sem cobrir campos.                                                                                                                                                |

A complementar é mais compacta e usa sombras discretas, mas isso não foi tratado como superioridade global. Não se incorporaram seus formulários, DTOs IHFR, wordmark como marca oficial ou roteamento paralelo. A identidade do resultado segue pt-BR, Poppins com fallback, superfícies neutras e acentos verdes, azuis e ocres; o wordmark permanece temporário e substituível.

## Achados e correções

- **Revisão de área complementar:** reproduzida no browser: “Revisar” levou ao error boundary. Inspeção confirmou `validate()` chamando `setErrors` durante renderização. Formulário não importado; o resultado valida apenas em eventos e preserva o preenchimento na revisão.
- **Admin complementar:** ambas as rotas renderizadas exibiram “Administração”. [Registro de rotas](validacao/fontes/complementar-admin-rotas.json) demonstra que `/admin/users` não alcançava a tela filha. No starter, pai com Outlet e conteúdo em `admin.index.tsx` / `admin.users.tsx`.
- **UF e geolocalização:** restrição a duas letras e aplicação tardia incondicional confirmadas estaticamente na complementar, não importadas. A principal aceita texto livre (até 100 caracteres) e possui versão de edição para recusar coordenadas tardias. Esse comportamento foi incluído na jornada de validação.
- **Medições:** teto de 100% da declividade e profundidade fora de poços confirmados estaticamente na complementar. O resultado mantém declividade ≥0 sem teto, elevação negativa e profundidade restrita a SHALLOW_WELL/TUBULAR_WELL. A escolha de outra fonte com profundidade preenchida gera erro explícito, sem apagar silenciosamente o valor.
- **IHFR:** DTO complementar usava operation/landUseSource/landUseObservedAt em vez do contrato real. Não importado. Corrigida também a decomposição da principal para lista tipada; drivers das fixtures têm dois componentes. Request mantém mode, supplement.provenance, versões e ID esperado. Não há cálculo próprio.
- **Tentativas:** chave, body e contexto vinculados no mock; replay diferente retorna IDEMPOTENCY_CONFLICT. Resultados terminais são snapshots. Tentativa incerta IHFR bloqueia edição e novas operações; recuperação 404 mantém a tentativa. Medições consultam a confirmação no mesmo formulário, preservando a tentativa em caso de ausência/falha; correção definitiva abre nova chave. Coleta incerta também bloqueia correção.
- **Feedback:** sucesso explicitamente demonstrativo; falha de atualização do vigente separada de operação já confirmada; erros de elegibilidade/auditoria/registro anterior recuperáveis. Conflito administrativo recarrega a conta e exige nova revisão com estado/revisão atuais.
- **Mapa:** carregamento ClientOnly/lazy, atribuição OSM e lista alternativa mantidos. Captura da principal registrou `_leaflet_pos` ao navegar durante animação; transições de zoom foram desativadas e o mapa ganhou isolamento de empilhamento para não sobrepor cabeçalhos/diálogos.
- **Foco móvel:** navegação por Tab em 48 controles reproduziu oito casos encobertos pela barra inferior/cabeçalho. O AppShell agora centraliza apenas o controle focado que ficaria sob essas barras, incluindo os links de atribuição do mapa; não há rolagem forçada nos demais focos. Teste reproduzível em `scripts/validate-mobile-keyboard.mjs`.
- **Responsividade:** botões podem quebrar texto; pares de descrição têm colunas flexíveis, códigos longos quebram linha; diálogos limitam altura e têm rolagem interna, fechar em português com alvo 44px. A faixa de demonstração deixa o conteúdo livre. Texto de apoio foi escurecido para contraste. Controles de acesso aguardam hidratação antes de aceitar envio.
- **Preview local:** o `vite preview` herdado procurava `dist/server/server.js`, mas Nitro emitia `.output/server/index.mjs`. `build:local` usa `NITRO_PRESET=node-server` e `preview` usa o CLI Nitro, sem mudar o target padrão do Lovable ou criar serviços de domínio.
- **Qualidade técnica:** props opcionais exatas, índices, Promise do mock, generics de mutação e testes de shell SSR corrigidos mantendo as opções estritas de TypeScript. A formatação exigida pelo lint foi aplicada à aplicação importada.

## Validação

Os resultados técnicos finais são registrados em [verificacoes-tecnicas.json](validacao/verificacoes-tecnicas.json). A jornada de browser e dimensões/contrastes constam de [verificacao-navegador.json](validacao/resultado/verificacao-navegador.json), com capturas representativas em [resultado](validacao/resultado). O script reproduzível é `scripts/validate-demo.mjs`.

Os checks de browser aguardam hidratação e consultas; não consideram build ou testes de utilitários como prova da experiência. Ocorrência com milissegundos/offset, zero/false/null, declividade de 150%, edição posterior à geolocalização, permissões e idempotência têm verificações explícitas. Os 13 testes Vitest incluem os existentes e seis regressões de contratos/permissões do adapter.

## Limitações e próxima integração

- Sem autenticação real, backend, banco, Supabase/Lovable Cloud ou conexão às APIs/contas FullStack. Fixtures são sintéticas; dados de domínio em memória reiniciam com recarregamento. Somente cenário/perfil são guardados em sessionStorage, sem credenciais.
- IHFR continua experimental: CONTRATO_EXPERIMENTAL, VALIDACAO_CIENTIFICA_PENDENTE, SUJEITO_A_RECALIBRACAO e NAO_APROVADO_COMO_CONTRATO_CIENTIFICO_DEFINITIVO. Scores e decomposição são fixtures, não cálculo nem validação científica.
- Adapter demonstra elegibilidade de forma simplificada; a elegibilidade científica completa e a autorização real pertencem ao backend futuro. IDs de fixtures da principal são aliases de demonstração; produção usa UUIDs opacos.
- FullStack usa Next.js App Router, enquanto o protótipo usa TanStack Start. Adaptar roteamento, carregamentos, SSR, autorização contextual, cookies HttpOnly, envelopes de erro, recuperação de operações e mapas cliente antes de integrar.
- FullStack atual tem verificação de e-mail (`email-verification/**`), recuperação (`password-reset/**`), troca de senha (`change-password`) e exclusão da própria conta (`account-deletion`). O prompt anterior não cobre esses avanços; o protótipo mantém cadastro/login sintéticos e não implementa integralmente esses fluxos. Não acrescentar links funcionais até a adaptação autorizada.
- Não foram criados rascunhos persistidos, uploads, convites, polígonos, relatórios PDF, IA, exportações ou históricos IHFR sem contrato.
- Tiles OSM e fonte Poppins externa dependem de rede; coordenadas/lista e fallback sans-serif continuam utilizáveis. Não houve teste com banco, migrations, Prisma generate ou comandos de aplicação no FullStack.
- Verificação automatizada de teclado/contraste/reflow não substitui avaliação humana com leitores de tela, dispositivos físicos e revisão científica. Zoom verificado por reflow equivalente (720 CSS px sobre referência de 1440px) e zoom CSS de 200%; o zoom nativo da interface do navegador não foi acionado no ambiente headless. Leitor de tela, Safari/Firefox e dispositivos físicos permanecem verificações humanas posteriores.

## Resultados finais da rodada estável

- Instalação Bun congelada: aprovada. Build padrão (Cloudflare/Nitro): aprovado. Build local (preset Node): aprovado; preview SSR Node executado e usado na rodada final.
- TypeScript estrito: aprovado. Lint: zero erros e nove avisos herdados de Fast Refresh. Vitest: 3 arquivos / 13 testes aprovados.
- Browser Chromium: 12 grupos aprovados, 33 verificações de dimensões sem rolagem horizontal indevida, zero erros de execução. Inclui login/cadastro, seleção explícita, área, coleta, medições, IHFR, mapa, permissões, administração/auditoria/conflito, vazio/limite, falha de leitura e logout.
- Teclado: foco no primeiro erro, abertura por Enter, contenção em diálogo, Escape e restauração. Inspeção complementar de Tab em 48 controles móveis aprovada, sem foco encoberto; resultados em `teclado-celular.json`.
- Contraste sobre branco (RGB efetivo medido no browser): texto 10,53:1; apoio 6,29:1; verde 4,95:1; azul 6,21:1; ocre login 5,03:1; ocre cadastro 5,19:1; vermelho 6,42:1. Não se declarou uma auditoria WCAG integral a partir desses tokens.
- Corrigida a grade implícita do workspace que excedia 375px em 52px; nomes de laboratórios agora quebram linha. Sair passou ao cabeçalho desktop.
- As primeiras rodadas do browser corrigiram seletores de teste/hidratação e detectaram a grade móvel. Uma atualização HMR durante teste invalidou um módulo dinâmico; a rodada final usou build estável, sem edições concorrentes.
- As três referências permaneceram com branches, SHAs, remotes e status iniciais. Hashes dos 115/117/772 arquivos não gerados conferidos após a retomada: [integridade-referencias.json](validacao/integridade-referencias.json). A fotografia de checksums anterior à interrupção estava em /tmp e foi perdida; a confirmação inicial de Git limpo permaneceu registrada na sessão. A nova leitura final dos remotes também confirmou os mesmos SHAs, sem atualizações remotas: [estado-remoto-final.json](validacao/estado-remoto-final.json).
