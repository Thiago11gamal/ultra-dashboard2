# Análise técnica do código (`ultra-dashboard2`)

## Resumo executivo

Base funcional e rica em features, mas com sinais claros de **acoplamento elevado no `App.jsx`**, **déficit de qualidade estática (ESLint)** e **peso de bundle alto**. O projeto já compila para produção, porém acumula riscos de manutenção e regressão.

---

## Diagnóstico por prioridade

## P0 — Corrigir erros de lint que podem esconder bugs reais

Resultado de `npm run lint`: **20 erros e 12 warnings**.

Principais pontos:

- `setState` dentro de `useEffect` em múltiplos componentes (ex.: `App.jsx`, `PomodoroTimer.jsx`) com regra `react-hooks/set-state-in-effect`.
- variáveis não utilizadas (`no-unused-vars`) em arquivos de engine e testes auxiliares.
- regra de Fast Refresh em `AuthContext.jsx` (`react-refresh/only-export-components`).
- sinais de memoização instável em `StatsCards.jsx` (`preserve-manual-memoization`).

**Ação sugerida imediata:** zerar erros (não apenas warnings) e bloquear merge com lint quebrado em CI.

---

## P1 — Reduzir complexidade estrutural (manutenibilidade)

Arquivos muito extensos aumentam custo cognitivo e risco de efeito colateral:

- `src/App.jsx`: **~2003 linhas**
- `src/components/MonteCarloGauge.jsx`: **~781 linhas**
- `src/components/PomodoroTimer.jsx`: **~780 linhas**

**Ação sugerida:** modularizar por domínio (autenticação, dashboard, simulações, produtividade), extraindo:

1. hooks de estado/orquestração (`useContestState`, `useCloudSync`, `useGamification`, etc.);
2. reducers para transições complexas;
3. componentes de apresentação mais puros.

---

## P1 — Melhorar performance de build e carregamento

`npm run build` passa, mas há warning de chunk muito grande:

- `dist/assets/index-*.js` próximo de **960 kB** (minificado)
- `vendor-charts` também grande.

**Ação sugerida:**

- code-splitting por rota/aba com `React.lazy` + `Suspense`;
- lazy load de gráficos pesados e módulo de Monte Carlo;
- `manualChunks` no Vite para separar melhor vendors críticos.

---

## P1 — Fortalecer confiabilidade com testes

Há indícios de scripts de reprodução e Playwright, mas sem suíte robusta integrada ao fluxo padrão.

**Ação sugerida:**

- incluir testes unitários para `src/engine/*` (estatística, projeção, Monte Carlo);
- testes de integração para fluxos críticos (login, sincronização, atualização de dados);
- e2e mínimo cobrindo inicialização e persistência principal.

---

## P2 — Higiene de repositório e DX

Foram encontrados artefatos temporários/versionados (logs, relatórios, arquivos de repro) no root.

**Ação sugerida:**

- limpar artefatos transitórios do versionamento;
- reforçar `.gitignore` para outputs de lint/test/build/report;
- manter somente artefatos necessários para documentação oficial.

---

## P2 — Evolução de arquitetura sugerida (incremental)

1. **Camada de estado previsível** (ex.: reducer + actions tipadas por domínio).
2. **Separação de acesso a dados** (serviços Firebase isolados + adapters).
3. **Contratos estáveis de dados** (validação runtime com schema leve, ex. Zod).
4. **Migração gradual para TypeScript** nas áreas mais críticas (`engine`, `services`).

---

## Plano de ação recomendado (2 sprints)

### Sprint 1 (estabilização)
- zerar erros de lint;
- remover artefatos transitórios do repo;
- modularizar `App.jsx` (extrações mínimas);
- adicionar CI com `lint + build + testes unitários engine`.

### Sprint 2 (escala)
- code-splitting de módulos pesados;
- ampliar cobertura de testes (integração/e2e);
- padronizar camada de estado e contratos de dados.

---

## Indicadores de sucesso

- lint: **0 erros**
- build sem warning de chunk crítico (>500k em bloco principal)
- cobertura mínima de testes em `engine/*`
- redução de linhas em `App.jsx` para <700 em etapas

