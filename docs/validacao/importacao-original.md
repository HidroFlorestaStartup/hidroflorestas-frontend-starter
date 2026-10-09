# Validação da importação original

Executada antes da interrupção do notebook em 2026-10-09. Logs em /tmp foram perdidos durante a interrupção; resultados constam da saída da sessão.

- Bun 1.3.11: instalação com `--frozen-lockfile` concluída; 525 pacotes, versões do lockfile preservadas.
- Node 22: build aprovado (Vite 8.1.5 / Nitro), sem deploy.
- TypeScript: falhou, 239 linhas de diagnóstico (incluindo props opcionais exatas, índices, rotas administrativas ausentes e Promise aninhada no mock).
- Lint: 925 erros / 9 avisos; 924 erros de formatação corrigíveis automaticamente e uma interface vazia.
- Vitest: 5 testes de datas aprovados; 2 testes de montagem de rotas falharam (shell HTML completo montado dentro de div).
- Telas landing, login e cadastro da principal capturadas e inspecionadas; capturas temporárias perdidas e serão refeitas. Comparação completa ainda pendente.

Estes problemas estavam na aplicação de origem. O commit de importação mantém a base para distinguir as adaptações seguintes.
