<USER_REQUEST>
Abaixo está **apenas o código de correção da última remessa**, organizado por arquivo, no formato de trechos para substituir/adicionar.

---

## 1) Criar utilitários centralizados

### `src/utils/evolutionGuards.js`

```js
export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

export function getHistoryDate(h) {
  return h?.date || h?.createdAt || null;
}

export function isValidScore(value) {
  return value != null && Number.isFinite(Number(value));
}

export function normalizeScoreDomain(minScore, maxScore) {
  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  let safeMax = Number.isFinite(Number(maxScore)) ? Number(maxScore) : 100;

  if (safeMax <= safeMin) {
    safeMax = safeMin + 1;
  }

  const range = Math.max(1e-9, safeMax - safeMin);

  const clamp = (value, fallback = safeMin) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(safeMin, Math.min(safeMax, n));
  };

  return { safeMin, safeMax, range, clamp };
}

export function normalizeTargetScore(targetScore, minScore, maxScore) {
  const { safeMin, safeMax } = normalizeScoreDomain(minScore, maxScore);
  const target = Number(targetScore);

  if (!Number.isFinite(target)) return safeMin;

  return Math.max(safeMin, Math.min(safeMax, target));
}

export function normalizeProbability(value, fallback = 0) {
  let n = Number(value);

  if (!Number.isFinite(n)) return fallback;

  if (n > 0 && n <= 1) {
    n = n * 100;
  }

  return Math.max(0, Math.min(100, n));
}

export function simpleHash(str) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
```

---

# 2) `EvolutionChart.jsx`

## 2.1. Importar `useRef`

Substituir:

```jsx
import React, { useState, useMemo } from "react";
```

Por:

```jsx
import React, { useState, useMemo, useRef } from "react";
```

---

## 2.2. Filtrar categorias nulas

Substituir:

```jsx
const safeCategories = Array.isArray(sourceList) ? sourceList : Object.values(sourceList || {});
```

Por:

```jsx
const safeCategories = (
  Array.isArray(sourceList)
    ? sourceList
    : Object.values(sourceList || {})
).filter(Boolean);
```

---

## 2.3. Corrigir `primaryKey` para não usar chave inexistente

Substituir o bloco do `primaryKey` por:

```jsx
const primaryKey = useMemo(() => {
  const firstPoint = historicalData.result?.[0] || {};
  const candidates = [];

  if (activeEngine === "compare") {
    candidates.push("Nível Bayesiano");
  }

  if (focusCategory?.id) {
    candidates.push(`bay_${focusCategory.id}`);
    candidates.push(`raw_${focusCategory.id}`);
    candidates.push(`stats_${focusCategory.id}`);
  }

  const validKey = candidates.find(
    key => firstPoint[key] != null && Number.isFinite(Number(firstPoint[key]))
  );

  return validKey || "date";
}, [activeEngine, focusCategory?.id, historicalData.result]);
```

---

## 2.4. Corrigir navegação por teclado das tabs

Adicionar depois dos estados:

```jsx
const engineTabRefs = useRef(new Map());

const focusEngineTab = (id) => {
  requestAnimationFrame(() => {
    engineTabRefs.current.get(id)?.focus();
  });
};
```

No map das tabs, adicionar `ref`:

```jsx
ref={(el) => engineTabRefs.current.set(eng.id, el)}
```

Substituir o `onKeyDown` das tabs por:

```jsx
onKeyDown={(e) => {
  const activate = (id) => {
    setActiveEngine(id);
    focusEngineTab(id);
  };

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    activate(arr[(idx + 1) % arr.length].id);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    activate(arr[(idx - 1 + arr.length) % arr.length].id);
  } else if (e.key === 'Home') {
    e.preventDefault();
    activate(arr[0].id);
  } else if (e.key === 'End') {
    e.preventDefault();
    activate(arr[arr.length - 1].id);
  }
}}
```

---

## 2.5. Passar filtros para insights e status

Substituir o `useMemo` do insight por:

```jsx
const insight = useMemo(() => {
  return generateEvolutionInsights({
    timeline,
    filteredChartData,
    focusCategory,
    activeEngine,
    categories,
    unit,
    maxScore,
    minScore,
    timeWindow,
    showOnlyFocus
  });
}, [
  timeline,
  filteredChartData,
  focusCategory,
  activeEngine,
  categories,
  unit,
  maxScore,
  minScore,
  timeWindow,
  showOnlyFocus
]);
```

Substituir o `useMemo` do statusList por:

```jsx
const statusList = useMemo(() => {
  return computeEvolutionStatuses({
    timeline,
    filteredChartData,
    categories,
    focusCategory,
    targetScore,
    unit,
    minScore,
    maxScore,
    activeMcResult,
    subjectAggData,
    heatmapData,
    projectDays,
    timeWindow,
    showOnlyFocus
  });
}, [
  timeline,
  filteredChartData,
  categories,
  focusCategory,
  targetScore,
  unit,
  minScore,
  maxScore,
  activeMcResult,
  subjectAggData,
  heatmapData,
  projectDays,
  timeWindow,
  showOnlyFocus
]);
```

---

## 2.6. Overlay do painel Monte Carlo não deve bloquear clique

Substituir:

```jsx
<div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm">
```

Por:

```jsx
<div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-none">
```

---

## 2.7. Não mostrar cards Monte Carlo zerados quando não há resultado

Substituir o bloco:

```jsx
<div className="w-full md:w-1/2 grid grid-cols-2 gap-3 self-center">
```

Até o fechamento dessa grid por:

```jsx
{activeMcResult ? (
  <div className="w-full md:w-1/2 grid grid-cols-2 gap-3 self-center">
    {(() => {
      const toFinite = (v, fallback = 0) =>
        v === null || v === undefined || v === ''
          ? fallback
          : Number.isFinite(Number(v))
            ? Number(v)
            : fallback;

      const bounded = (v) => Math.max(minScore, Math.min(maxScore, toFinite(v, minScore)));

      const projectedLevel = bounded(
        toFinite(activeMcResult?.projectedMean, toFinite(activeMcResult?.mean, minScore))
      );

      const ciLow = bounded(toFinite(activeMcResult?.ci95Low, projectedLevel));
      const ciHigh = bounded(toFinite(activeMcResult?.ci95High, projectedLevel));

      const ciMin = Math.min(ciLow, ciHigh);
      const ciMax = Math.max(ciLow, ciHigh);
      const marginOfError = Math.max(0, (ciMax - ciMin) / 2);

      return [
        {
          label: 'Caminho Sucesso',
          val: `${normalizeProbability(activeMcResult?.probability).toFixed(2)}%`,
          icon: <Target size={14} />,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10'
        },
        {
          label: 'Nível Projetado',
          val: unit === '%'
            ? `${projectedLevel.toFixed(2)}${unit}`
            : `${Math.round(projectedLevel)}${unit}`,
          icon: <TrendingUp size={14} />,
          color: 'text-blue-400',
          bg: 'bg-blue-500/10'
        },
        {
          label: 'Margem de Erro',
          val: unit === '%'
            ? `±${marginOfError.toFixed(2)}${unit}`
            : `±${Math.round(marginOfError)}${unit}`,
          icon: <BarChart3 size={14} />,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10'
        },
        {
          label: 'Confiança 95%',
          val: unit === '%'
            ? `${ciMin.toFixed(2)}-${ciMax.toFixed(2)}${unit}`
            : `${Math.round(ciMin)}-${Math.round(ciMax)}${unit}`,
          icon: <Zap size={14} />,
          color: 'text-indigo-400',
          bg: 'bg-indigo-500/10'
        }
      ].map((stat, i) => (
        <div
          key={i}
          className="flex flex-col p-3 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors min-w-0"
        >
          <div className="flex items-center gap-1.5 mb-1 opacity-60">
            <span className={stat.color}>{stat.icon}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
              {stat.label}
            </span>
          </div>
          <span
            className={`text-base sm:text-lg font-black ${stat.color} tracking-tight break-words w-full block leading-tight`}
            title={stat.val}
          >
            {stat.val}
          </span>
        </div>
      ));
    })()}
  </div>
) : (
  <div className="w-full md:w-1/2 grid place-items-center self-center px-6">
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
      Sem projeção Monte Carlo disponível
    </span>
  </div>
)}
```

Adicionar no topo do componente principal:

```jsx
import { normalizeProbability } from "../utils/evolutionGuards";
```

---

## 2.8. Passar loading para o MonteCarloEvolutionChart

Substituir:

```jsx
<MonteCarloEvolutionChart
  data={monteCarloHistoryArray}
  targetScore={targetScore}
  unit={unit}
  minScore={minScore}
  maxScore={maxScore}
/>
```

Por:

```jsx
<MonteCarloEvolutionChart
  data={monteCarloHistoryArray}
  targetScore={targetScore}
  unit={unit}
  minScore={minScore}
  maxScore={maxScore}
  loading={mcLoading}
/>
```

---

# 3) `EvolutionHeatmap.jsx`

## 3.1. Corrigir targetScorePct inválido

Substituir:

```jsx
const targetScorePct = Math.max(0, Math.min(100, ((Number(targetScore) - safeMin) / range) * 100));
```

Por:

```jsx
const safeTarget = Number.isFinite(Number(targetScore)) ? Number(targetScore) : safeMin;

const targetScorePct = Math.max(
  0,
  Math.min(100, ((safeTarget - safeMin) / range) * 100)
);
```

---

## 3.2. Corrigir filtro de foco quando focusSubjectId estiver vazio

Substituir:

```jsx
const filteredRowsByFocus = useMemo(() => {
  if (!showOnlyFocus) return rows;

  return rows.filter(row => row.cat?.id === focusSubjectId);
}, [rows, showOnlyFocus, focusSubjectId]);
```

Por:

```jsx
const filteredRowsByFocus = useMemo(() => {
  if (!showOnlyFocus || !focusSubjectId) return rows;

  return rows.filter(row => row.cat?.id === focusSubjectId);
}, [rows, showOnlyFocus, focusSubjectId]);
```

---

## 3.3. Corrigir cellColor contra pct inválido

Substituir:

```jsx
const cellColor = (pct, total = 0) => {
  if (pct == null) return { bg: 'rgba(255,255,255,0.02)', text: '#64748b', border: '#1e293b', density: 0 };

  const density = Math.min(1, (Number(total) || 0) / maxCellTotal);

  if (pct >= targetScorePct) return { bg: 'rgba(34,197,94,0.45)', text: '#4ade80', border: 'rgba(34,197,94,0.6)', density };
  if (pct >= targetScorePct * 0.8) return { bg: 'rgba(251,191,36,0.4)', text: '#fcd34d', border: 'rgba(251,191,36,0.6)', density };
  if (pct >= targetScorePct * 0.6) return { bg: 'rgba(251,146,60,0.4)', text: '#fb923c', border: 'rgba(251,146,60,0.6)', density };

  return { bg: 'rgba(239,68,68,0.4)', text: '#f87171', border: 'rgba(239,68,68,0.6)', density };
};
```

Por:

```jsx
const cellColor = (pct, total = 0) => {
  if (pct == null || !Number.isFinite(Number(pct))) {
    return {
      bg: 'rgba(255,255,255,0.02)',
      text: '#64748b',
      border: '#1e293b',
      density: 0
    };
  }

  const safePct = Number(pct);
  const density = Math.min(1, (Number(total) || 0) / maxCellTotal);

  if (safePct >= targetScorePct) {
    return {
      bg: 'rgba(34,197,94,0.45)',
      text: '#4ade80',
      border: 'rgba(34,197,94,0.6)',
      density
    };
  }

  if (safePct >= targetScorePct * 0.8) {
    return {
      bg: 'rgba(251,191,36,0.4)',
      text: '#fcd34d',
      border: 'rgba(251,191,36,0.6)',
      density
    };
  }

  if (safePct >= targetScorePct * 0.6) {
    return {
      bg: 'rgba(251,146,60,0.4)',
      text: '#fb923c',
      border: 'rgba(251,146,60,0.6)',
      density
    };
  }

  return {
    bg: 'rgba(239,68,68,0.4)',
    text: '#f87171',
    border: 'rgba(239,68,68,0.6)',
    density
  };
};
```

---

## 3.4. Enviar targetScorePct, minScore e maxScore para o worker

Substituir:

```jsx
worker.postMessage({ id: msgId, payload: { filtered, granularity, targetScore } });
```

Por:

```jsx
worker.postMessage({
  id: msgId,
  payload: {
    filtered,
    granularity,
    targetScore: safeTarget,
    targetScorePct,
    minScore: safeMin,
    maxScore: safeMax
  }
});
```

---

# 4) `CompareChart.jsx`

## 4.1. Domínio seguro de score

Substituir:

```jsx
const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
const safeMaxScore = Math.max(1, Number(maxScore) || 100);
const dangerLimit = Math.max(safeMinScore, targetScore - ((safeMaxScore - safeMinScore) * 0.08));
```

Por:

```jsx
const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
const safeMaxScore = Number(maxScore) > safeMinScore ? Number(maxScore) : safeMinScore + 1;

const safeTargetScore = Math.max(
  safeMinScore,
  Math.min(
    safeMaxScore,
    Number.isFinite(Number(targetScore)) ? Number(targetScore) : safeMinScore
  )
);

const dangerLimit = Math.max(
  safeMinScore,
  safeTargetScore - ((safeMaxScore - safeMinScore) * 0.08)
);
```

---

## 4.2. Validar valores finitos

Adicionar antes do `lastValidIdx`:

```jsx
const isValidValue = (value) => value != null && Number.isFinite(Number(value));
```

---

## 4.3. Corrigir lastValidIdx

Substituir:

```jsx
const lastValidIdx = React.useMemo(() => {
  const last = { bay: -1, raw: -1, stats: -1, mc: -1 };

  for (let i = chartData.length - 1; i >= 0; i--) {
    const d = chartData[i];

    if (last.bay < 0 && d["Nível Bayesiano"] != null) last.bay = i;
    if (last.raw < 0 && d["Nota Bruta"] != null) last.raw = i;
    if (last.stats < 0 && d["Média Histórica"] != null) last.stats = i;
    if (last.mc < 0 && d["Futuro Provável"] != null) last.mc = i;

    if (last.bay >= 0 && last.raw >= 0 && last.stats >= 0 && last.mc >= 0) break;
  }

  return last;
}, [chartData]);
```

Por:

```jsx
const lastValidIdx = React.useMemo(() => {
  const last = { bay: -1, raw: -1, stats: -1, mc: -1 };

  for (let i = chartData.length - 1; i >= 0; i--) {
    const d = chartData[i];

    if (last.bay < 0 && isValidValue(d["Nível Bayesiano"])) last.bay = i;
    if (last.raw < 0 && isValidValue(d["Nota Bruta"])) last.raw = i;
    if (last.stats < 0 && isValidValue(d["Média Histórica"])) last.stats = i;
    if (last.mc < 0 && isValidValue(d["Futuro Provável"])) last.mc = i;

    if (last.bay >= 0 && last.raw >= 0 && last.stats >= 0 && last.mc >= 0) break;
  }

  return last;
}, [chartData]);
```

---

## 4.4. Corrigir todayIdx

Substituir:

```jsx
const todayIdx = chartData.reduce((acc, curr, i) => {
  const hasObserved = curr["Nota Bruta"] != null || curr["Nível Bayesiano"] != null || curr["Média Histórica"] != null;
  return hasObserved ? i : acc;
}, -1);
```

Por:

```jsx
const todayIdx = chartData.reduce((acc, curr, i) => {
  const hasObserved =
    isValidValue(curr["Nota Bruta"]) ||
    isValidValue(curr["Nível Bayesiano"]) ||
    isValidValue(curr["Média Histórica"]);

  return hasObserved ? i : acc;
}, -1);
```

---

## 4.5. Corrigir label contra NaN

No início do `renderLabel`, substituir:

```jsx
if (value === null || value === undefined) return null;
```

Por:

```jsx
if (value === null || value === undefined || !Number.isFinite(Number(value))) {
  return null;
}
```

---

## 4.6. Clamp esquerdo do labelX

Substituir:

```jsx
const labelX = Math.min(x + xOff - 2, maxX - boxWidth - 4);
```

Por:

```jsx
const labelX = Math.max(0, Math.min(x + xOff - 2, maxX - boxWidth - 4));
```

---

## 4.7. Remover código morto e linhas soltas

Remover este bloco:

```jsx
let gainBase = 'dataMin';
let showGainArea = true;

if (todayIdx >= 0) {
  const todayPt = chartData[todayIdx];
  const baseCandidate = todayPt["Nível Bayesiano"] != null ? todayPt["Nível Bayesiano"] : todayPt["Nota Bruta"];

  if (Number.isFinite(Number(baseCandidate))) {
    gainBase = Math.max(safeMinScore, Math.min(safeMaxScore, Number(baseCandidate)));

    const lastPt = chartData[chartData.length - 1];
    const lastProjection = lastPt?.["Futuro Provável"];

    if (Number.isFinite(Number(lastProjection)) && Number(lastProjection) < gainBase) {
      showGainArea = false;
    }
  }
}
```

Remover também:

```jsx
name="Ganho estimado"
name="Intervalo de confiança MC"
```

---

## 4.8. Usar targetScore seguro nas áreas e linhas de meta

Substituir:

```jsx
<ReferenceArea
  y1={targetScore}
  y2={safeMaxScore}
  fill="#10b981"
  fillOpacity={0.05}
/>
```

Por:

```jsx
<ReferenceArea
  y1={safeTargetScore}
  y2={safeMaxScore}
  fill="#10b981"
  fillOpacity={0.05}
/>
```

Substituir:

```jsx
<ReferenceLine y={targetScore} ... />
```

Por:

```jsx
<ReferenceLine
  y={safeTargetScore}
  stroke="#10b981"
  strokeOpacity={0.6}
  strokeWidth={2}
  strokeDasharray="5 5"
  label={{
    value: `Meta ${formatValue(safeTargetScore)}${unit}`,
    fill: '#10b981',
    fontSize: 10,
    fontWeight: 'black',
    position: 'insideTopLeft',
    dy: -6,
    dx: 5
  }}
/>
```

---

# 5) `CriticalTopicsAnalysis.jsx`

## 5.1. Importar utilitários

Adicionar:

```jsx
import { toArray, getHistoryDate } from "../../../utils/evolutionGuards";
```

---

## 5.2. Corrigir uso de data no subtopicsData

Substituir:

```jsx
const d = normalizeDate(h.date);
```

Por:

```jsx
const d = normalizeDate(getHistoryDate(h));
```

Fazer isso dentro do filtro de `recentHistory`.

---

## 5.3. Corrigir uso de topics como objeto

Substituir:

```jsx
(h.topics || []).forEach(t => {
```

Por:

```jsx
toArray(h.topics).forEach(t => {
```

---

## 5.4. Corrigir data no pointLeakageData

Substituir novamente:

```jsx
const d = normalizeDate(h.date);
```

Por:

```jsx
const d = normalizeDate(getHistoryDate(h));
```

---

## 5.5. Corrigir hasData para considerar tópicos

Substituir o `useMemo` de `hasData` por:

```jsx
const hasData = useMemo(() => {
  if (!categories) return false;

  return categories.some(cat => {
    const historyRaw = cat.simuladoStats?.history;
    const history = Array.isArray(historyRaw)
      ? historyRaw
      : Object.values(historyRaw || {});

    return history.some(h => {
      const d = normalizeDate(getHistoryDate(h));
      const topics = toArray(h.topics);

      const hasTopicData = topics.some(
        t => Number(t.total) > 0 || t.score != null
      );

      return (
        d &&
        d >= startDate &&
        d <= endDate &&
        (
          parseInt(h.total, 10) > 0 ||
          h.score != null ||
          hasTopicData
        )
      );
    });
  });
}, [categories, startDate, endDate]);
```

---

# 6) `EvolutionLineChart.jsx`

## 6.1. Domínio seguro

Adicionar no topo do componente:

```jsx
const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
const safeMaxScore = Number(maxScore) > safeMinScore ? Number(maxScore) : safeMinScore + 1;
const safeRange = Math.max(1e-9, safeMaxScore - safeMinScore);

const safeTargetScore = Math.max(
  safeMinScore,
  Math.min(
    safeMaxScore,
    Number.isFinite(Number(targetScore)) ? Number(targetScore) : safeMinScore
  )
);
```

---

## 6.2. Corrigir dangerLimit

Substituir:

```jsx
const dangerLimit = Math.max(minScore, targetScore - ((maxScore - minScore) * 0.08));
```

Por:

```jsx
const dangerLimit = Math.max(safeMinScore, safeTargetScore - (safeRange * 0.08));
```

---

## 6.3. Corrigir range no yAdjustedMap

Substituir:

```jsx
const range = maxScore - minScore;
```

Por:

```jsx
const range = safeRange;
```

---

## 6.4. Usar domínio seguro nos eixos e áreas

Substituir:

```jsx
domain={[minScore, maxScore]}
```

Por:

```jsx
domain={[safeMinScore, safeMaxScore]}
```

Substituir:

```jsx
<ReferenceArea
  y1={targetScore}
  y2={maxScore}
  fill="#10b981"
  fillOpacity={0.045}
/>
```

Por:

```jsx
<ReferenceArea
  y1={safeTargetScore}
  y2={safeMaxScore}
  fill="#10b981"
  fillOpacity={0.045}
/>
```

Substituir:

```jsx
<ReferenceArea
  y1={minScore}
  y2={dangerLimit}
  fill="#ef4444"
  fillOpacity={0.035}
/>
```

Por:

```jsx
<ReferenceArea
  y1={safeMinScore}
  y2={dangerLimit}
  fill="#ef4444"
  fillOpacity={0.035}
/>
```

Substituir:

```jsx
<ReferenceLine y={targetScore} ... />
```

Por:

```jsx
<ReferenceLine
  y={safeTargetScore}
  stroke="#10b981"
  strokeOpacity={0.6}
  strokeWidth={1.5}
  strokeDasharray="4 2"
  label={{
    value: `Meta ${formatValue(safeTargetScore)}${unit}`,
    fill: '#22c55e',
    fontSize: 10,
    position: 'insideTopLeft',
    dy: -12,
    dx: 10
  }}
/>
```

---

## 6.5. Empty state quando nenhuma categoria estiver visível

Adicionar antes do `return` principal:

```jsx
const visibleCategories = safeActiveCategories.filter(
  cat => !showOnlyFocus || cat.id === focusSubjectId
);

if (!enhancedChartData.length || visibleCategories.length === 0) {
  return (
    <div className="h-[360px] flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
      <span className="text-3xl">🔍</span>
      Nenhuma disciplina visível com o filtro atual.
    </div>
  );
}
```

---

# 7) `MonteCarloEvolutionChart.jsx`

## 7.1. Receber loading

Substituir:

```jsx
export const MonteCarloEvolutionChart = ({ 
  data = [], 
  targetScore = 75, 
  unit = 'pts', 
  minScore = 0, 
  maxScore = 100 
}) => {
```

Por:

```jsx
export const MonteCarloEvolutionChart = ({ 
  data = [], 
  targetScore = 75, 
  unit = 'pts', 
  minScore = 0, 
  maxScore = 100,
  loading = false
}) => {
```

---

## 7.2. Domínio seguro

Substituir:

```jsx
const safeTargetScore = useMemo(() => {
  const t = Number(targetScore);
  return Math.max(minScore, Math.min(maxScore, Number.isFinite(t) ? t : minScore));
}, [targetScore, minScore, maxScore]);
```

Por:

```jsx
const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
const safeMax = Number(maxScore) > safeMin ? Number(maxScore) : safeMin + 1;

const safeTargetScore = useMemo(() => {
  const t = Number(targetScore);
  return Math.max(safeMin, Math.min(safeMax, Number.isFinite(t) ? t : safeMin));
}, [targetScore, safeMin, safeMax]);
```

---

## 7.3. targetOffset seguro

Substituir:

```jsx
const targetOffset = useMemo(() => {
  const range = maxScore - minScore;
  if (range <= 0 || !Number.isFinite(range)) return 0;

  const pct = 1 - (safeTargetScore - minScore) / range;
  return Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
}, [safeTargetScore, maxScore, minScore]);
```

Por:

```jsx
const targetOffset = useMemo(() => {
  const range = safeMax - safeMin;

  if (range <= 0 || !Number.isFinite(range)) return 0;

  const pct = 1 - (safeTargetScore - safeMin) / range;

  return Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
}, [safeTargetScore, safeMin, safeMax]);
```

---

## 7.4. Sanitizar ID do targetGlow

Substituir:

```jsx
const rawId = useId();
const gradientId = `colorMonteCarlo-${rawId.replace(/:/g, '')}`;
```

Por:

```jsx
const rawId = useId();
const safeId = rawId.replace(/:/g, '');
const gradientId = `colorMonteCarlo-${safeId}`;
```

Substituir:

```jsx
<linearGradient id={`targetGlow-${rawId}`} x1="0" y1="0" x2="0" y2="1">
```

Por:

```jsx
<linearGradient id={`targetGlow-${safeId}`} x1="0" y1="0" x2="0" y2="1">
```

Substituir:

```jsx
<ReferenceArea y1={safeTargetScore} y2={maxScore} fill={`url(#targetGlow-${rawId})`} />
```

Por:

```jsx
<ReferenceArea y1={safeTargetScore} y2={safeMax} fill={`url(#targetGlow-${safeId})`} />
```

---

## 7.5. Usar domínio seguro no eixo Y

Substituir:

```jsx
<YAxis
  stroke="#475569"
  fontSize={9}
  fontWeight={500}
  tickLine={false}
  axisLine={{ stroke: '#334155' }}
  dx={-5}
  width={45}
  domain={[minScore, maxScore]}
  allowDataOverflow={false}
  tickCount={6}
  tickFormatter={(v) => unit === 'horas' ? formatDuration(v) : `${formatValue(v)}${unit}`}
/>
```

Por:

```jsx
<YAxis
  stroke="#475569"
  fontSize={9}
  fontWeight={500}
  tickLine={false}
  axisLine={{ stroke: '#334155' }}
  dx={-5}
  width={45}
  domain={[safeMin, safeMax]}
  allowDataOverflow={false}
  tickCount={6}
  tickFormatter={(v) => unit === 'horas' ? formatDuration(v) : `${formatValue(v)}${unit}`}
/>
```

---

## 7.6. Mostrar premissas do modelo

Substituir:

```jsx
{mcAssumptions && (
  <div className="px-2 mb-2">
    <p className="text-[9px] uppercase tracking-widest text-slate-500">
      Premissas do modelo
    </p>
  </div>
)}
```

Por:

```jsx
{mcAssumptions && (
  <div className="px-2 mb-2">
    <p className="text-[9px] uppercase tracking-widest text-slate-500">
      Premissas do modelo
    </p>
    <p className="text-[10px] text-slate-400 mt-0.5">
      {mcAssumptions.points} registros · IC 95% de {formatValue(mcAssumptions.ciWidth)} {unit} · Cenário {mcAssumptions.scenario}
    </p>
  </div>
)}
```

---

## 7.7. Mostrar loading

Adicionar imediatamente antes do bloco:

```jsx
<div className="w-full relative h-[360px] flex items-center justify-center">
```

O overlay:

```jsx
{loading && (
  <div className="absolute inset-0 z-20 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
    <div className="flex flex-col items-center gap-3">
      <span className="animate-spin text-indigo-400">
        ↻
      </span>
      <span className="text-[9px] font-black uppercase text-indigo-300 tracking-[0.2em] animate-pulse">
        Recalculando Monte Carlo...
      </span>
    </div>
  </div>
)}
```

---

# 8) `SubtopicsPerformanceChart.jsx`

## 8.1. Importar hash

Adicionar:

```jsx
import { simpleHash } from "../../../utils/evolutionGuards";
```

---

## 8.2. targetScorePct seguro

Substituir:

```jsx
const range = Math.max(1e-9, maxScore - minScore);
const targetScorePct = Math.max(0, Math.min(100, ((targetScore - minScore) / range) * 100));
```

Por:

```jsx
const safeMinScorePct = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
const safeMaxScorePct = Number(maxScore) > safeMinScorePct ? Number(maxScore) : safeMinScorePct + 1;
const safeRangePct = Math.max(1e-9, safeMaxScorePct - safeMinScorePct);

const safeTargetScorePctRaw = Number.isFinite(Number(targetScore))
  ? Number(targetScore)
  : safeMinScorePct;

const safeTargetScorePctClamped = Math.max(
  safeMinScorePct,
  Math.min(safeMaxScorePct, safeTargetScorePctRaw)
);

const targetScorePct = Math.max(
  0,
  Math.min(
    100,
    ((safeTargetScorePctClamped - safeMinScorePct) / safeRangePct) * 100
  )
);
```

---

## 8.3. Corrigir chave de tópico com hash

Substituir:

```jsx
const toTopicKey = (name) => `top_${String(name || '').replace(/[^a-zA-Z0-9_]/g, '_')}`;
```

Por:

```jsx
const toTopicKey = (name) => {
  const normalized = String(name || '').trim().toLowerCase();
  const slug = normalized.replace(/[^a-z0-9]+/g, '_');
  return `top_${slug}_${simpleHash(normalized)}`;
};
```

---

## 8.4. Evitar chaves duplicadas em uniqueTopics

Substituir:

```jsx
const topTopics = topTopicNames.map(name => ({
  name,
  key: toTopicKey(name)
}));
```

Por:

```jsx
const topTopics = topTopicNames
  .map(name => ({
    name,
    key: toTopicKey(name)
  }))
  .filter((topic, index, self) => self.findIndex(t => t.key === topic.key) === index);
```

---

## 8.5. Corrigir tooltip de linhas: data e meta

Substituir o topo do `CustomLineTooltip`:

```jsx
<p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2 flex justify-between items-center">
  <span>📅 {label}</span>
  Meta:
</p>
```

Por:

```jsx
{(() => {
  const parsedLabel = parseNoonLocal(label) || new Date(label);

  const formattedLabel = Number.isFinite(parsedLabel?.getTime?.())
    ? `${String(parsedLabel.getDate()).padStart(2, '0')}/${String(parsedLabel.getMonth() + 1).padStart(2, '0')}`
    : String(label);

  return (
    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2 flex justify-between items-center">
      <span>📅 {formattedLabel}</span>
      <span>Meta: {targetScorePct.toFixed(1)}%</span>
    </p>
  );
})()}
```

---

# 9) `TimeSpentChart.jsx`

## 9.1. Aplicar foco nos dados

Adicionar antes do `chartData`:

```jsx
const relevantSubjectAggData = useMemo(() => {
  const safe = Array.isArray(subjectAggData) ? subjectAggData : [];

  if (!showOnlyFocus || !focusCategory?.id) return safe;

  return safe.filter(d => d.id === focusCategory.id);
}, [subjectAggData, showOnlyFocus, focusCategory?.id]);
```

Substituir:

```jsx
const safeSubjectAggData = Array.isArray(subjectAggData) ? subjectAggData : [];
```

Por:

```jsx
const safeSubjectAggData = relevantSubjectAggData;
```

---

## 9.2. Padronizar KPIs

Substituir o segundo KPI:

```jsx
<div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
  Última média geral
  <span className="text-lg sm:text-2xl font-black text-cyan-400 tracking-tight mt-1">
    {legendLatestSeconds == null ? 'N/A' : formatTime(legendLatestSeconds)}
  </span>
  <span className="text-[9px] text-slate-500 mt-1">Última sessão de cada</span>
</div>
```

Por:

```jsx
<div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
    Última média geral
  </span>
  <span className="text-lg sm:text-2xl font-black text-cyan-400 tracking-tight mt-1">
    {legendLatestSeconds == null ? 'N/A' : formatTime(legendLatestSeconds)}
  </span>
  <span className="text-[9px] text-slate-500 mt-1">
    Última sessão de cada
  </span>
</div>
```

Substituir o terceiro KPI:

```jsx
<div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
  Acima da média
  <span className="text-lg sm:text-2xl font-black text-rose-400 tracking-tight mt-1">
    {legendStats.above} {legendStats.above === 1 ? 'matéria' : 'matérias'}
  </span>
  <span className="text-[9px] text-rose-400/60 mt-1">Ritmo mais lento</span>
</div>
```

Por:

```jsx
<div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
    Acima da média
  </span>
  <span className="text-lg sm:text-2xl font-black text-rose-400 tracking-tight mt-1">
    {legendStats.above} {legendStats.above === 1 ? 'matéria' : 'matérias'}
  </span>
  <span className="text-[9px] text-rose-400/60 mt-1">
    Ritmo mais lento
  </span>
</div>
```

Substituir o quarto KPI:

```jsx
<div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
  Abaixo da média
  <span className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight mt-1">
    {legendStats.below} {legendStats.below === 1 ? 'matéria' : 'matérias'}
  </span>
  <span className="text-[9px] text-emerald-400/60 mt-1">Ritmo acelerado</span>
</div>
```

Por:

```jsx
<div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-col justify-between">
  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
    Abaixo da média
  </span>
  <span className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight mt-1">
    {legendStats.below} {legendStats.below === 1 ? 'matéria' : 'matérias'}
  </span>
  <span className="text-[9px] text-emerald-400/60 mt-1">
    Ritmo acelerado
  </span>
</div>
```

---

# 10) `TodayVsGeneralChart.jsx`

## 10.1. Usar score seguro no dailyData

Dentro do `useMemo` de `dailyData`, substituir:

```jsx
const acc = entry.total > 0 ? ratioToPoints(entry.correct / entry.total, maxScore, minScore) : minScore;
```

Por:

```jsx
const acc = entry.total > 0
  ? ratioToPoints(entry.correct / entry.total, safeMaxScore, safeMinScore)
  : safeMinScore;
```

---

## 10.2. Bloquear futuro nos buckets temporais

Substituir:

```jsx
if (!time || time > now + 86400000) return;
```

Por:

```jsx
if (!time || time > now) return;
```

---

## 10.3. Bloquear futuro no latestAcc

Dentro do filtro de `simuladoRows`, substituir:

```jsx
.filter(r => {
  if (!r || (!r.createdAt && !r.date) || r.validated === false) return false;

  const rSubj = normalize(r.subject);
  const subjMatches = rSubj ? activeCategoryMap.has(rSubj) : false;
  const idMatches = r.categoryId && activeCategoryIdMap.has(r.categoryId);

  return subjMatches || idMatches;
})
```

Por:

```jsx
.filter(r => {
  if (!r || (!r.createdAt && !r.date) || r.validated === false) return false;

  const rowTime = toDateMs(r.createdAt || r.date);

  if (!Number.isFinite(rowTime) || rowTime > now) return false;

  const rSubj = normalize(r.subject);
  const subjMatches = rSubj ? activeCategoryMap.has(rSubj) : false;
  const idMatches = r.categoryId && activeCategoryIdMap.has(r.categoryId);

  return subjMatches || idMatches;
})
```

---

## 10.4. Corrigir Pie para usar domínio seguro

Dentro do map de `temporalMetrics`, substituir:

```jsx
const safeMin = Number(minScore) || 0;
const val = isNull ? 0 : Math.max(safeMin, Math.min(metric.val, maxScore));
const arcColor = isNull ? 'transparent' : getColor(metric.val);
const scaleRange = Math.max(1, maxScore - safeMin);
const arcVal = val - safeMin;
```

Por:

```jsx
const val = isNull ? 0 : Math.max(safeMin, Math.min(metric.val, safeMax));
const arcColor = isNull ? 'transparent' : getColor(metric.val);
const scaleRange = Math.max(1e-9, safeMax - safeMin);
const arcVal = Math.max(0, val - safeMin);
```

---

# 11) `WeeklyEvolutionView.jsx`

## 11.1. Importar utilitários

Substituir:

```jsx
import { APP_TIMEZONE, parseNoonLocal } from '../../../utils/dateHelper';
```

Por:

```jsx
import { parseNoonLocal, getDateKey } from '../../../utils/dateHelper';
import { toArray, getHistoryDate } from '../../../utils/evolutionGuards';
```

---

## 11.2. Corrigir uso de topics como objeto

Substituir:

```jsx
if (h.topics && Array.isArray(h.topics)) {
  h.topics.forEach(t => {
```

Por:

```jsx
const topics = toArray(h.topics);

if (topics.length > 0) {
  topics.forEach(t => {
```

Fazer isso nas duas ocorrências:

- construção do `itemsMap`;
- processamento do histórico em modo foco.

---

## 11.3. Corrigir uso de data

Substituir:

```jsx
const weekStr = getMondayStr(h.date);
```

Por:

```jsx
const weekStr = getMondayStr(getHistoryDate(h));
```

Fazer isso em todas as ocorrências.

---

## 11.4. Delta somente quando a semana anterior for adjacente

Substituir o bloco de cálculo de delta dentro do `finalData` por:

```jsx
const currentWeekDate = parseNoonLocal(weekObj.week);
const expectedPrevDate = new Date(currentWeekDate);
expectedPrevDate.setDate(expectedPrevDate.getDate() - 7);
const expectedPrevKey = getDateKey(expectedPrevDate);

validIds.forEach(id => {
  const currentData = weekObj[id];

  if (currentData && currentData.total > 0) {
    const ratio = currentData.correct / currentData.total;
    const currentScore = fromRatio(ratio);
    const safeCurrentScore = Number.isFinite(currentScore) ? currentScore : 0;
    const currentPct = Number(
      Math.max(lowerBound, Math.min(upperBound, safeCurrentScore)).toFixed(2)
    );

    dataPoint[id] = currentPct;

    const last = memoryByItem[id];

    if (last && last.week === expectedPrevKey) {
      const prevPct = last.pct;
      const safeDelta = Number.isFinite(currentPct - prevPct)
        ? currentPct - prevPct
        : 0;

      const delta = Number(safeDelta.toFixed(2));
      const isStable = Math.abs(delta) <= stableThreshold;

      dataPoint[`delta_${id}`] = delta;
      dataPoint[`deltaColor_${id}`] = isStable
        ? '#eab308'
        : delta > 0
          ? '#10b981'
          : '#ef4444';

      dataPoint[`meta_${id}`] = {
        currTot: currentData.total,
        currPct: currentPct,
        prevPct,
        prevTot: last.total
      };
    } else {
      dataPoint[`delta_${id}`] = null;
      dataPoint[`deltaColor_${id}`] = '#94a3b8';

      dataPoint[`meta_${id}`] = {
        currTot: currentData.total,
        currPct: currentPct,
        prevPct: null,
        prevTot: 0
      };
    }

    memoryByItem[id] = {
      pct: currentPct,
      total: currentData.total,
      week: weekObj.week
    };
  } else {
    dataPoint[id] = null;
    dataPoint[`delta_${id}`] = null;
    dataPoint[`deltaColor_${id}`] = '#94a3b8';
  }
});
```

---

# 12) `WeeklyPerformanceChart.jsx`

## 12.1. Corrigir data do histórico

Substituir:

```jsx
const hDate = getDateKey(h.date);
```

Por:

```jsx
const hDate = getDateKey(h.date || h.createdAt);
```

---

## 12.2. Empty state quando não houver dados nos últimos 7 dias

Adicionar antes do `return` principal:

```jsx
const hasAnyData = chartData.some(
  d => d.minutos > 0 || d.acertos != null
);

if (!hasAnyData) {
  return (
    <div className="w-full h-[320px] sm:h-[400px] flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
      <span className="text-3xl">📭</span>
      Sem atividade nos últimos 7 dias.
    </div>
  );
}
```

</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-09-04T14:33:19-04:00.

The user's current state is as follows:
Active Document: d:\Downloads\ultra-patched\Evolution_Code.md (LANGUAGE_MARKDOWN)
Cursor is on line: 1
Other open documents:
- d:\Downloads\ultra-patched\Evolution_Code.md (LANGUAGE_MARKDOWN)
- d:\Downloads\ultra-patched\src\components\charts\EvolutionChart\CriticalTopicsAnalysis.jsx (LANGUAGE_JAVASCRIPT)
- d:\Downloads\ultra-patched\src\components\charts\EvolutionHeatmap.jsx (LANGUAGE_JAVASCRIPT)
- d:\Downloads\ultra-patched\src\components\charts\EvolutionChart\KpiCard.jsx (LANGUAGE_JAVASCRIPT)
</ADDITIONAL_METADATA>
<USER_SETTINGS_CHANGE>
The user changed setting `Model Selection` from None to Gemini 3.1 Pro (High). No need to comment on this change if the user doesn't ask about it. If reporting what model you are, please use a human readable name instead of the exact string.
</USER_SETTINGS_CHANGE>
