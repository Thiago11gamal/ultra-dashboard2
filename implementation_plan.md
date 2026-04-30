# Refinamento de Modelagem Estatística

Este plano visa aumentar o rigor estatístico das projeções e cálculos de tendência, corrigindo limites excessivamente liberais e distorções temporais.

## Proposed Changes

### Projection Engine
#### [MODIFY] [projection.js](file:///c:/Users/antun.BOOK-201QO8FPFE/Downloads/fly/ultra-dashboard2/src/engine/projection.js)
- Reduzir `absoluteMax` de 1.5 para 0.4 pp/dia na função [calculateSlope](file:///c:/Users/antun.BOOK-201QO8FPFE/Downloads/fly/ultra-dashboard2/src/engine/projection.js#76-106).
- Ajustar `baseLimit` para 0.4 para manter consistência com o novo teto.

### Variance Module
#### [MODIFY] [variance.js](file:///c:/Users/antun.BOOK-201QO8FPFE/Downloads/fly/ultra-dashboard2/src/engine/variance.js)
- Adicionar documentação/comentário em [computePooledSD](file:///c:/Users/antun.BOOK-201QO8FPFE/Downloads/fly/ultra-dashboard2/src/engine/variance.js#50-66) alertando sobre a mistura conceitual de unidades (variabilidade entre provas vs incerteza de trajetória).

### Stats Module
#### [MODIFY] [stats.js](file:///c:/Users/antun.BOOK-201QO8FPFE/Downloads/fly/ultra-dashboard2/src/engine/stats.js)
- Refatorar [calculateTrend](file:///c:/Users/antun.BOOK-201QO8FPFE/Downloads/fly/ultra-dashboard2/src/engine/stats.js#33-101) para aceitar o histórico completo (com datas) em vez de apenas scores.
- Calcular a regressão linear usando datas reais (em dias) como variável $x$, evitando distorções quando o espaçamento entre simulados é irregular.
- Manter o retorno em "pontos por 10 dias" (equivalente ao "pontos por 10 provas" se houver 1 prova/dia) para preservar a compatibilidade com os thresholds de UI (0.5 = 5 pontos de ganho).

## Verification Plan

### Automated Tests
- Criar um script de teste em `/tmp/test_stats_refinement.js` que:
    1. Verifica se [calculateSlope](file:///c:/Users/antun.BOOK-201QO8FPFE/Downloads/fly/ultra-dashboard2/src/engine/projection.js#76-106) respeita o novo teto de 0.4.
    2. Compara [calculateTrend](file:///c:/Users/antun.BOOK-201QO8FPFE/Downloads/fly/ultra-dashboard2/src/engine/stats.js#33-101) com dados igualmente espaçados vs dados com grandes intervalos para validar a correção temporal.
- Executar via `node /tmp/test_stats_refinement.js`.

### Manual Verification
- Observar os gráficos de projeção no dashboard (Raio-X) para garantir que as linhas de "Futuro Provável" não apresentem inclinações irreais em alunos com melhora acentuada.
