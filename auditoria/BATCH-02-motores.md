# 📦 BATCH 2 — Motores Estatísticos

Continuando a entrega de código completo corrigido. Os quatro arquivos deste batch somam ~4.200 linhas, então entrego as **funções/blocos completos corrigidos** com o ponto exato de inserção (âncora de busca), em vez de reproduzir os arquivos inteiros — reproduzir 4 mil linhas verbatim adicionaria risco de erro de transcrição sem valor. Cada bloco é drop-in.

---

## 🔴 2.1 `src/engine/stats.js` — `computeBayesianLevel`

### Bug
`runningPriors` é calculado sobre `historySortedForGaps` (completo), mas o loop itera sobre `historyToProcess` (cortado em 2000). `runningPriors[i-1]` aponta para a entrada errada → regressão ao prior empírico corrompida para históricos longos.

### Correção — Passo 1 & 2
- Definido `historyToProcess` ANTES da declaração dos `runningPriors`.
- Os priors são calculados sobre `historyToProcess`, alinhando o índice com a iteração posterior.

---

## 🔴 2.2 `src/engine/stats.js` — `calculateTrend` (superestimação ×10)

### Bug
Retorna `slopePerDay * 10`, mas todos os consumidores tratam como slope diária. `trendValue` (`slope * 30`) fica até 10× inflado e o clamp do `calculateSlope` satura uma ordem de grandeza antes.

### Correção
- Retornar `slopePerDay` direto sem multiplicar por 10.

---

## 🟠 2.3 `src/engine/projection.js` — `calculateSlope` (clamp ignora `minScore`)

### Bug
`absoluteMax = 0.004 * maxScore`. Numa escala 400–1000 (range 600) o teto vira 4.0 pts/dia em vez de 2.4 — 67% de drift indevido.

### Correção
- Clamp proporcional à AMPLITUDE REAL (`maxScore - minScore`).

---

## 🟠 2.4 `src/engine/projection.js` — `monteCarloSimulation` (limites em `maxScore`)

### Bug
Bias de cenário e limite de drift usam `* maxScore` em vez da amplitude real.

### Correção
- Bias proporcional a `rangeDomain = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore`.
- `driftLimit = maxDailyDriftPct * rangeDomain`.

---

## 🟠 2.5 `src/engine/projection.js` — clamp do choque GARCH

### Bug
O choque é escalado por `adaptiveVol`, mas clampado por `dailyVolatility * 3`.

### Correção
- Clamp pela volatilidade corrente: `Math.max(dailyVolatility, adaptiveVol) * 3`.

---

## 🔴 2.6 `src/engine/monteCarlo.js` — sujeitos Cholesky sem clamp e sem peso

### Bug
No ramo com Cholesky, `raw = mean + zCorr` não é clampado para `[minScore, maxScore]` antes de entrar na média; e `score = subjectSum / length` é média simples de disciplinas com escalas/pesos diferentes.

### Correção
- Preservar `weight` no `sanitizeSubjects`.
- Agregação ponderada e clampada por disciplina em `subjectCholesky` e simulação normal.

---

## 🟡 2.7 `src/engine/monteCarlo.js` — `projectionDays = 0` vira `1`

### Correção
- Alterar para `Math.max(0, Math.floor(toFiniteNumber(projectionDays, 90)))`.

---

## 🔴 2.8 `src/hooks/useMonteCarloStats.js` — meta por disciplina ignora `minScore`

### Correção
- Calcular `subjectTarget` no intervalo real, respeitando `minScore` da disciplina e global.

---

## 🟠 2.9 `src/hooks/useMonteCarloStats.js` — `setData` com API mista

### Correção
- Padronizar chamadas a `setData` para retorno imutável (`return { ...c, ... }`).

---

## 🟠 2.10 `src/hooks/useMonteCarloStats.js` — fallback com API posicional

### Correção
- Fallback de análise síncrona com `simulateNormalDistribution({ ...normalPayload, historicalCutoffs })`.
