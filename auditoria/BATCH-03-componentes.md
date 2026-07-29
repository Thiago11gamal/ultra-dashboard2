# 📦 BATCH 3 — Componentes de Gráfico

Fechando a entrega de código corrigido. Os dois menores (`DisciplinaCard`, `KpiCard`) vão **inteiros** (drop-in direto); os demais vão como **blocos completos corrigidos** com a âncora exata de substituição, no mesmo padrão do Batch 2.

---

## 🟠 3.1 `CompareChart.jsx` — colisão de labels estoura limites + largura fixa

### Correção A — `solveCollisions`
- Relaxamento iterativo em 15 passos para impedir que resolver colisão no chão estoure o teto (e vice-versa).

### Correção B — largura dinâmica da label
- `const boxWidth = Math.max(42, formatted.length * 7 + 14);`
- Posição do texto centralizada com base no `boxWidth`.

---

## 🟠 3.2 `WeeklyPerformanceChart.jsx` — glow vaza no tooltip como "Horas"

### Correção A — `Area` sem `name` e escondido no tooltip
- `name="_acertos_area"`, `legendType="none"`, `tooltipType="none"`.

### Correção B — linha de glow
- `name="_acertos_glow"`, `legendType="none"`, `tooltipType="none"`.

### Correção C — filtro no `renderTooltip`
- Descartar séries com nomes iniciados em `_` no `payload.filter((v) => !String(v.name || '').startsWith('_'))`.

---

## 🟠 3.3 `TimeSpentChart.jsx` — `formatTime(59.9)` → `"60s"` + acessibilidade

### Correção A — `formatTime`
- Arredondar `s` antes de separar minutos e segundos (`const total = Math.round(Math.max(0, Number(s)));`).

### Correção B — `aria-pressed` nos botões de ordenação
- Suporte para `slower` e `faster`.

---

## 🟠 3.4 `ActivityHeatmap.jsx` — mês não vira com o app aberto

### Correção
- Referenciar `now` como dependência no `currentMonth` (`const base = new Date(now.getFullYear(), now.getMonth(), 1);`).

---

## 🟡 3.5 `SubtopicsPerformanceChart.jsx` — meta fora de [0,100] + volume sintético

### Correção A — import
- Importar `getSyntheticTotal` de `../../../utils/scoreHelper`.

### Correção B — clamp da meta
- Meta percentual restrita a `[0, 100]`.

### Correção C — volume sintético
- Entradas de subtópico em formato percentual sem `total` recebem volume sintético de questão.

### Correção D — `aria-pressed` nos botões de modo
- `aria-pressed={viewMode === 'bars'}` / `'lines'`.

---

## 🟡 3.6 `MonteCarloEvolutionChart.jsx` — meta não clampada

### Correção A & B — `safeTargetScore`
- Domínio restrito entre `[minScore, maxScore]` em tooltips, `ReferenceArea`, `ReferenceLine` e offset.

---

## 🟡 3.7 `WeeklyEvolutionView.jsx` — estabilidade com threshold absoluto

### Correção
- Limite dinâmico e proporcional de estabilidade: `const stableThreshold = Math.max(0.5, scoreRange * 0.02);`.

---

## 🟡 3.8 `CriticalTopicsAnalysis.jsx` — `correct` pode exceder `total`

### Correção A & B — `subtopicsData` e `pointLeakageData`
- Clamp robusto: `correctCount = Math.max(0, Math.min(total, rawCorrect))`.

### Correção C — `aria-pressed` nos botões de semana
- `aria-pressed={isActive}` nos botões de semana.

---

## 🟡 3.9 `EvolutionLineChart.jsx` — índice da label final frágil

### Correção
- Checagem com base em `enhancedChartData.length - 1`.

---

## 🟢 3.10 `DisciplinaCard.jsx` — drop-in completo com proteção contra divisão por zero

### Correção
- `const safeMax = Math.max(1, Number(maxScore) || 100);` na renderização das barras brutas/históricas/reais.

---

## 🟢 3.11 `KpiCard.jsx` — drop-in completo com suporte a string numérica em `sub`

### Correção
- Coerção segura `const safeSub = sub != null ? Number(sub) : Number.NaN;`.

---

## 🔵 3.12 `EvolutionChart.jsx` — passar `minScore` ao `TodayVsGeneralChart`

### Correção
- Prop `minScore={minScore}` na chamada de `TodayVsGeneralChart`.
