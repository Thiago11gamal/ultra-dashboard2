# Auditoria de bugs por menu (2026-05-08)

## Escopo
- Revisão funcional dos menus laterais: Navegação, Dados & Análise, Inteligência e Configurações.
- Revisão do menu de cenários Monte Carlo e telas de Evolução.
- Verificação automatizada ampla (lint, unit, math, evolution suite, build e verificação de stack).

## Bugs encontrados e corrigidos

1. **Tooltip Monte Carlo com dependência ausente (stale closure potencial)**
   - `renderCustomTooltip` usava `maxScore`, mas sem `maxScore` no array de dependências do `useCallback`.
   - Correção: inclusão de `maxScore` nas dependências.
   - Arquivo: `src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx`.

2. **Rótulo de concurso podia mostrar nome de usuário no menu “Meus Concursos”**
   - A lógica antiga aceitava fallback `contestData?.user?.name`, gerando rótulo incorreto para o menu.
   - Correção: centralização em utilitário que só aceita `contestName`/`name` e, na ausência, retorna `Sem nome`.
   - Arquivos: `src/components/sidebarUtils.js`, `src/components/Sidebar.jsx`.

3. **Lógica de item ativo do menu sem cobertura dedicada de regressão**
   - Risco de regressão em paths com alias (`/dashboard`) e subrotas (`/stats/...`).
   - Correção: extração de utilitário `isMenuItemActive` + testes unitários cobrindo raiz, alias e subrota.
   - Arquivos: `src/components/sidebarUtils.js`, `src/components/__tests__/sidebar.logic.test.js`, `src/components/Sidebar.jsx`.

4. **Risco de erro em ambiente sem `window` ao fechar menu mobile**
   - `closeMobileSidebar` acessava `window.innerWidth` diretamente.
   - Correção: guard `typeof window === 'undefined'` antes do acesso.
   - Arquivo: `src/components/Sidebar.jsx`.

## Verificações executadas (análise ampla)
1. `npm run lint`
2. `npm run test:all`
3. `npm run test:evolution-suite`
4. `npm run verify:evolution`

## Resultado
- Lint, testes unitários/matemáticos e suite de evolução passaram.
- Build de produção passou.
- E2E falhou por limitação de ambiente (browser do Playwright ausente), não por regressão de código da aplicação.
