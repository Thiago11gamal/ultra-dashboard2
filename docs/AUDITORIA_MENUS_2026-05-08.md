# Auditoria de bugs por menu (2026-05-08)

## Escopo
- Revisão do menu lateral (Navegação, Dados & Análise, Inteligência e Configurações).
- Verificação de contratos de UI do menu de cenários Monte Carlo.
- Execução de lint + testes para validar lógica de ativação de menu e rótulos de concursos.

## Bugs encontrados e corrigidos

1. **Tooltip Monte Carlo com dependência ausente (stale closure potencial)**
   - `renderCustomTooltip` usava `maxScore`, mas sem `maxScore` no array de dependências do `useCallback`.
   - Correção: inclusão de `maxScore` nas dependências.
   - Arquivo: `src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx`.

2. **Rótulo de concurso podia mostrar nome de usuário no menu “Meus Concursos”**
   - A lógica antiga aceitava fallback `contestData?.user?.name`, gerando rótulo incorreto para o menu.
   - Correção: centralização em utilitário que só aceita `contestName`/`name` e, na ausência, retorna `Sem nome`.
   - Arquivos: `src/components/sidebarUtils.js`, `src/components/Sidebar.jsx`.

3. **Lógica de item ativo do menu não tinha cobertura dedicada de regressão**
   - Risco de regressão em paths com alias (`/dashboard`) e subrotas (`/stats/...`).
   - Correção: extração de utilitário `isMenuItemActive` + testes unitários cobrindo rota raiz, alias e subrota.
   - Arquivos: `src/components/sidebarUtils.js`, `src/components/__tests__/sidebar.logic.test.js`, `src/components/Sidebar.jsx`.

## Verificações executadas
1. `npm run lint`
2. `npm run test:unit`

## Resultado
- Lint passou sem erros.
- Testes unitários passaram (110/110), incluindo novos testes de lógica de menu.
