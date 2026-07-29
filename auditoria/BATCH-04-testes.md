# 📦 BATCH 4 — Suíte de Testes (trava de regressão)

Fechando a série de auditorias e correções dos Batches 1–3, com foco em cobrir todas as blindagens, invariância de escalas e robustez matemática em diferentes concursos.

---

## 🧪 Matriz de Testes Criados/Atualizados

### 1. `src/utils/__tests__/scoreConversions.test.js`
- Testes de conversão de pontuações (`ratioToPoints`, `pctToPoints`, `pointsToRatio`, `pointsToPct`, `toAccuracyRatio`, `ratioToCorrect`).
- Verifica blindagem contra confusão de nota bruta (`1` em escala `0–10` não se transforma erroneamente em `100%`).
- Garante comportamento em escalas com piso diferente de zero (`400–1000`).

### 2. `src/hooks/__tests__/useChartData.test.js`
- Testes de blindagem contra `NaN` e entradas corrompidas na linha do tempo.
- Verifica que `compTotal = 0` não gera divisão por zero.
- Valida que `correct` acumulado não excede `total` em simulados.

### 3. `src/engine/__tests__/stats.test.js`
- Valida regressão com históricos vazios e extremamente longos (`> 2000` simulados).
- Verifica coerência e domínio de intervalo de confiança na escala `0–200`.
- Checa que a inclinação diária `calculateTrend` retorna a taxa real sem multiplicador errôneo (`×10`).

### 4. `src/engine/__tests__/projection.test.js`
- Verifica que o clamp da inclinação (`calculateSlope`) é proporcional à amplitude real da escala (`maxScore - minScore`) e não ao teto absoluto.

### 5. `src/engine/__tests__/monteCarlo.test.js`
- Varredura em diferentes distribuições normais comprovando `prob ∈ [0, 100]` e limites do intervalo de confiança.
- Confirma que `projectionDays = 0` ("simulação para hoje") funciona de maneira coerente e não quebra o motor de simulação.
- Demonstra invariância de escala (`0–100` vs `0–200`) e coerência na composição Cholesky multi-disciplinas.

### 6. `src/__tests__/escala.test.js`
- Matriz unificada testando 6 formatos de escala de concursos:
  - Curta `0–10`
  - Percentual `0–100`
  - Estendida `0–200`
  - CESPE `0–120`
  - Com piso `400–1000` (ex: ENEM/concursos bancários com nota mínima)
  - Com penalidade `-30..100` (questões com saldo negativo)

---

## 🧭 Roteiro de QA manual

| # | Cenário | Resultado esperado |
|---|---------|-------------------|
| 1 | Contest 0–100 completo (baseline) | **Zero diferença visual** vs. antes (sanity de regressão) |
| 2 | Contest 0–200, precisão global 75% | Linha "Média Geral" do Hoje vs Geral em **150** (não 75) |
| 3 | Contest com `minScore = 400` | Prob. por disciplina responde à razão dentro do intervalo; nada abaixo de 400 |
| 4 | Histórico com 2.100 simulados | Nível bayesiano finito, CI coerente |
| 5 | Browser em UTC+9 (Tóquio) | Datas futuras do Raio-X+MC idênticas às de UTC-3 |
| 6 | Worker bloqueado (DevTools) | Painel MC ainda renderiza via fallback sync |
| 7 | `score: "lixo"` injetado no banco | Nenhum `NaN` em KPIs, heatmap ou tooltip |
| 8 | `projectionDays = 0` (simular hoje) | Motor roda e retorna probabilidade finita |
