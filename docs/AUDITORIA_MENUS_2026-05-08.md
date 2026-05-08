# Auditoria de bugs por menu (2026-05-08)

## Escopo
- Verificação de contratos de UI do menu de cenários Monte Carlo e navegação de visualização.
- Execução de lint para detectar erros de lógica/composição com impacto em menus/telas.
- Verificação de regressão matemática e de dados mostrados nas telas.

## Bug encontrado e corrigido

1. **Dependência ausente em `useCallback` no tooltip do menu/gráfico Monte Carlo**
   - Sintoma: `eslint` acusava erro `react-hooks/preserve-manual-memoization` + warning `exhaustive-deps`.
   - Causa: `renderCustomTooltip` usa `maxScore`, mas `maxScore` não estava no array de dependências.
   - Correção aplicada: adicionar `maxScore` ao dependency array de `useCallback`.
   - Arquivo corrigido: `src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx`.

## Verificações executadas
1. `npm run lint`
2. `npm run test:all`
3. `npm run test:mc-scenarios`
4. `npm run test:projection-scenario`
5. `npm run test:heatmap-aggregation`
6. `npm run test:weekly-insights`
7. `npm run test:integration-math`

## Resultado
- Após a correção, lint e testes executados passaram.
- Não foram encontrados erros adicionais de dados mostrados no escopo automatizado.
