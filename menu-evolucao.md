# Código Completo - Menu Evolução (Ultra Dashboard)

Este arquivo reúne todo o código-fonte (página, componentes UI, subcomponentes de gráficos, hooks, utilitários e motores estatísticos) relacionado ao **Menu Evolução** do Ultra Dashboard para auditoria externa.
**Data de Geração**: 2026-07-29T16:19:15.187Z
**Total de Arquivos**: 26

## Índice de Arquivos

1. `src/pages/Evolution.jsx`
2. `src/components/EvolutionChart.jsx`
3. `src/components/ActivityHeatmap.jsx`
4. `src/components/charts/EvolutionChart/CompareChart.jsx`
5. `src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx`
6. `src/components/charts/EvolutionChart/DisciplinaCard.jsx`
7. `src/components/charts/EvolutionChart/EvolutionLineChart.jsx`
8. `src/components/charts/EvolutionChart/KpiCard.jsx`
9. `src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx`
10. `src/components/charts/EvolutionChart/PerformanceBarChart.jsx`
11. `src/components/charts/EvolutionChart/RadarAnalysis.jsx`
12. `src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx`
13. `src/components/charts/EvolutionChart/TimeSpentChart.jsx`
14. `src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx`
15. `src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx`
16. `src/components/charts/EvolutionChart/WeeklyPerformanceChart.jsx`
17. `src/hooks/useChartData.js`
18. `src/hooks/useMonteCarloStats.js`
19. `src/utils/weeklyEvolutionInsights.js`
20. `src/utils/monteCarloScenario.js`
21. `src/utils/heatmapAggregation.js`
22. `src/engine/insightGenerator.js`
23. `src/engine/stats.js`
24. `src/engine/projection.js`
25. `src/engine/variance.js`
26. `src/engine/monteCarlo.js`

---

## File: `src/pages/Evolution.jsx`
*Linhas: 106 | Tamanho: 4.26 KB*

```javascript
import React from 'react';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const EMPTY_ARRAY = [];

export default function Evolution() {
  const { categories, rawStudyLogs, monteCarloHistory, user, unit, minScore, maxScore, simuladoRows } = useAppStore(
    useShallow(state => {
      const contests = state?.appState?.contests || {};
      const activeId = state?.appState?.activeId;
      const contest = contests[activeId] || {};
      return {
        categories: contest.categories ?? EMPTY_ARRAY,
        rawStudyLogs: contest.studyLogs,
        monteCarloHistory: contest.monteCarloHistory ?? EMPTY_ARRAY,
        user: contest.user,
        unit: contest.unit || '%',
        minScore: contest.minScore ?? 0,
        maxScore: contest.maxScore ?? 100,
        simuladoRows: contest.simuladoRows ?? EMPTY_ARRAY
      };
    })
  );

  const studyLogs = React.useMemo(() => {
    return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
  }, [rawStudyLogs]);

  const safeCategories = React.useMemo(() => {
    return Array.isArray(categories) ? categories : Object.values(categories || {});
  }, [categories]);

  const safeSimuladoRows = React.useMemo(() => {
    return Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {});
  }, [simuladoRows]);

  const safeMonteCarloHistory = React.useMemo(() => {
    return Array.isArray(monteCarloHistory) ? monteCarloHistory : Object.values(monteCarloHistory || {});
  }, [monteCarloHistory]);

  const hasEvolutionData = Array.isArray(safeCategories) && safeCategories.some(category => {
    const h = category?.simuladoStats?.history;
    return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
  });

  // ✅ FIX: Converter targetProbability (percentual) para pontos na escala da prova
  const targetScorePoints = React.useMemo(() => {
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Math.min(Number(minScore) || 0, safeMax);
    const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number(value) || 0));
    
    // 1) Se existir targetScore explícito, ele é a meta em pontos
    if (user?.targetScore != null && Number.isFinite(Number(user.targetScore))) {
      let ts = Number(user.targetScore);
      // Compatibilidade: se o valor parecer percentual (ex: 70) e estiver acima do maxScore
      if (ts > safeMax && ts <= 100) {
        ts = (ts / 100) * safeMax;
      }
      return clamp(ts);
    }
    
    // 2) Fallback: targetProbability é percentual (0-100) e deve virar pontos
    if (user?.targetProbability != null && Number.isFinite(Number(user.targetProbability))) {
      return clamp((Number(user.targetProbability) / 100) * safeMax);
    }
    
    // 3) Default seguro: 80% da escala
    return clamp(safeMax * 0.8);
  }, [user, minScore, maxScore]);

  return (
    <ErrorBoundary>
      <div className="animate-fade-in">
        {!hasEvolutionData ? (
          <div className="flex items-center justify-center min-h-[45vh] p-4">
            <div className="glass p-8 sm:p-12 text-center rounded-2xl border border-slate-800/80 bg-slate-900/50 shadow-2xl max-w-md w-full">
              <div className="text-5xl mb-4 opacity-80">📊</div>
              <p className="font-black uppercase tracking-wider text-sm text-slate-200 mb-2">
                Sem histórico de simulados
              </p>
              <p className="text-xs text-slate-400 mb-0 leading-relaxed">
                Registe simulados nas disciplinas para visualizar a sua evolução e previsões do motor Monte Carlo.
              </p>
            </div>
          </div>
        ) : (
          <EvolutionChart
            categories={safeCategories}
            studyLogs={studyLogs}
            targetScore={targetScorePoints}
            goalDate={user?.goalDate}
            monteCarloHistory={safeMonteCarloHistory}
            simuladoRows={safeSimuladoRows}
            unit={unit}
            minScore={minScore}
            maxScore={maxScore}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
```

---

## File: `src/components/EvolutionChart.jsx`
*Linhas: 1231 | Tamanho: 68.25 KB*

```javascript
import React, { useState, useMemo, useEffect } from "react";
import {
    computeCategoryStats
} from "../engine";
import { runMonteCarloAnalysis } from "../engine/monteCarlo";   // ✅ LOTE-02 (fallback)
import { useChartData } from "../hooks/useChartData";
import { EvolutionHeatmap } from "./charts/EvolutionHeatmap";
import { getDateKey, toDateMs, normalizeDate } from "../utils/dateHelper";
import { getSafeScore, getSyntheticTotal } from "../utils/scoreHelper";
import { exportComponentAsPDF } from "../utils/pdfExport";
import { Download, Loader2, Zap, Target, BarChart3, TrendingUp } from "lucide-react";
import { useMonteCarloWorker } from "../hooks/useMonteCarloWorker";
import { GaussianPlot } from "./charts/GaussianPlot";
import { useAppStore } from "../store/useAppStore";
import { downsampleLTTB } from "../utils/downsample";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { useShallow } from 'zustand/react/shallow';

// Sub-components
import { KpiCard } from "./charts/EvolutionChart/KpiCard";
import { DisciplinaCard } from "./charts/EvolutionChart/DisciplinaCard";
import { EvolutionLineChart } from "./charts/EvolutionChart/EvolutionLineChart";
import { CompareChart } from "./charts/EvolutionChart/CompareChart";
import { RadarAnalysis } from "./charts/EvolutionChart/RadarAnalysis";
import { PerformanceBarChart } from "./charts/EvolutionChart/PerformanceBarChart";
import { CriticalTopicsAnalysis } from "./charts/EvolutionChart/CriticalTopicsAnalysis";
import { SubtopicsPerformanceChart } from "./charts/EvolutionChart/SubtopicsPerformanceChart";
import { MonteCarloEvolutionChart } from "./charts/EvolutionChart/MonteCarloEvolutionChart";
import { WeeklyEvolutionView } from "./charts/EvolutionChart/WeeklyEvolutionView";
import { TimeSpentChart } from "./charts/EvolutionChart/TimeSpentChart";
import { TodayVsGeneralChart } from "./charts/EvolutionChart/TodayVsGeneralChart";

import { generateEvolutionInsights } from '../engine/insightGenerator';

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

function safeFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function filterHistoryByTimeWindow(history, timeWindow) {
  const days = Number.parseInt(timeWindow, 10);
  const safeHistory = Array.isArray(history) ? history : Object.values(history || {});

  if (timeWindow === "all" || !Number.isFinite(days) || days <= 0) {
    return safeHistory.filter(Boolean);
  }

  const withMs = safeHistory
    .filter(Boolean)
    .map((h) => ({
      h,
      ms: toDateMs(getDateKey(h?.date))
    }))
    .filter((x) => Number.isFinite(x.ms));

  if (!withMs.length) return safeHistory.filter(Boolean);

  const referenceMs = toDateMs(getDateKey(new Date()));
  const limit = referenceMs - days * 24 * 60 * 60 * 1000;

  return withMs.filter((x) => x.ms >= limit).map((x) => x.h);
}

function renderInsightText(text, textColorClass) {
  if (typeof text !== 'string') return text;

  const parts = text.split(/(\*\*.*?\*\*|!!.*?!!|\+\+.*?\+\+)/g).filter(Boolean);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className={`${textColorClass} font-black drop-shadow-[0_0_8px_currentColor]`}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('!!') && part.endsWith('!!')) {
      return (
        <span key={idx} className="text-rose-500 font-bold drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
          {part.slice(2, -2)}
        </span>
      );
    }

    if (part.startsWith('++') && part.endsWith('++')) {
      return (
        <span key={idx} className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
          {part.slice(2, -2)}
        </span>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

// Função pura fora do componente
function buildPredictiveCompareData(
  timeline,
  focusCategory,
  categoryLevels,
  activeMcProjectionSeries,
  projectDays,
  minScore,
  maxScore
) {
  if (!focusCategory) return timeline;

  // 1. Prepara os dados históricos mapeando as chaves para leitura no gráfico
  let pts = timeline.map((d) => ({
    ...d,
    "Nota Bruta": d[`raw_${focusCategory.id}`],
    "Nível Bayesiano": d[`bay_${focusCategory.id}`],
    "Banda Bayesiana":
      d[`bay_ci_low_${focusCategory.id}`] != null && Number.isFinite(d[`bay_ci_low_${focusCategory.id}`])
        ? [d[`bay_ci_low_${focusCategory.id}`], d[`bay_ci_high_${focusCategory.id}`]]
        : null,
    "Média Histórica": d[`stats_${focusCategory.id}`]
  }));

  // 2. Acopla os pontos futuros do Monte Carlo com validação robusta
  if (activeMcProjectionSeries && pts.length > 0) {
    const lastIdx = pts.length - 1;

    const rawLevel =
      pts[lastIdx]["Nível Bayesiano"] ??
      categoryLevels[focusCategory?.id] ??
      activeMcProjectionSeries?.mc_p50 ??
      0;

    const currentLevel = safeFiniteNumber(rawLevel, 0);
    const p50 = safeFiniteNumber(activeMcProjectionSeries.mc_p50, currentLevel);

    const band =
      Array.isArray(activeMcProjectionSeries.mc_band) && activeMcProjectionSeries.mc_band.length >= 2
        ? activeMcProjectionSeries.mc_band
        : [currentLevel, currentLevel];

    const band0 = safeFiniteNumber(band[0], currentLevel);
    const band1 = safeFiniteNumber(band[1], currentLevel);
    const bandMin = Math.min(band0, band1);
    const bandMax = Math.max(band0, band1);

    const bounded = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return currentLevel;
      return Math.max(minScore, Math.min(maxScore, n));
    };

    const futurePoints = [];
    const steps = 6;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const weight = Math.sqrt(t);

      const val = bounded(currentLevel + (p50 - currentLevel) * t);
      const bandLow = bounded(currentLevel + (bandMin - currentLevel) * weight);
      const bandHigh = bounded(currentLevel + (bandMax - currentLevel) * weight);

      // ✅ LOTE-02 FIX: parse local normalizado (o "-04:00" fixo virava o dia em outros fusos)
      const baseParsed = normalizeDate(pts[lastIdx].date);
      if (!baseParsed || Number.isNaN(baseParsed.getTime())) return pts;
      const baseMs = baseParsed.setHours(12, 0, 0, 0);

      const forwardDays = Math.max(i, Math.round((i / steps) * (projectDays || 30)));
      const dt = new Date(baseMs + forwardDays * 24 * 60 * 60 * 1000);
      const iso = getDateKey(dt);

      futurePoints.push({
        date: iso,
        displayDate: i === steps ? `${iso.split('-')[2]}/${iso.split('-')[1]} ✦` : "",
        "Futuro Provável": val,
        "Cenário Range": [bandLow, bandHigh],
        __future: true
      });
    }

    pts[lastIdx] = {
      ...pts[lastIdx],
      "Futuro Provável": currentLevel,
      "Cenário Range": [currentLevel, currentLevel]
    };

    pts = [...pts, ...futurePoints];
  }

  return pts;
}

// M3 FIX: Função pura extraída para fora do componente — evita recriação a cada render.
function parseGoalDateLocal(input) {
    if (!input) return null;
    try {
        let raw = input;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            const d = new Date(raw);
            raw = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (typeof raw === 'object' && raw !== null && Number.isFinite(raw.seconds)) {
            const d = new Date(raw.seconds * 1000);
            raw = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else {
            raw = String(raw).trim().split('T')[0];
        }

        const p = String(raw).split('-');
        const date = p.length === 3
            ? new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 12, 0, 0, 0)
            : new Date(raw);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(12, 0, 0, 0);
        return date;
    } catch {
        return null;
    }
}

const ENGINES = [
    {
        id: "raw", label: "Realidade Bruta", emoji: "📊", color: "#fb923c", prefix: "raw_", style: "linear",
        explain: { titulo: "Sua Montanha-Russa de Resultados Brutos", simples: "Métricas sem filtros ou suavizações estatísticas. Exibe a porcentagem exata e crua de acertos a cada simulado registrado, revelando a volatilidade real do seu desempenho.", dica: "Picos isolados (sejam altos ou baixos) não definem sua aprovação. Use esta visão apenas para detectar anomalias diárias e foque na tendência geral a longo prazo." },
    },
    {
        id: "raw_weekly", label: "Mapa de Calor", emoji: "📅", color: "#f472b6", prefix: null, style: "linear",
        explain: { titulo: "Frequência e Eficiência Semanal", simples: "Um mapa visual de constância. Cada simulado é uma célula colorida que mapeia seu progresso temporal. Células verdes indicam desempenho consolidado acima da meta; vermelhas indicam risco.", dica: "Excelente para identificar blocos de consistência. Veja se você está mantendo um ritmo de estudos saudável e com qualidade ao longo das semanas, isolando o ruído diário." },
    },
    {
        id: "bayesian", label: "Nível Bayesiano", emoji: "🧠", color: "#34d399", prefix: "bay_", style: "monotoneX",
        explain: { titulo: "Domínio Real Estimado (Modelo Beta-Binomial)", simples: "O motor de inteligência artificial calcula seu domínio probabilístico atual. A banda verde representa o Intervalo de Confiança (95%): quanto mais fina a faixa, mais o algoritmo tem certeza do seu nível de domínio.", dica: "No início, a faixa é larga devido à alta incerteza. Realize mais simulados para 'ensinar' o algoritmo e afinar a linha. Baseie suas decisões de avanço de matéria nesta métrica, e não na média crua." },
    },
    {
        id: "stats", label: "Média Histórica", emoji: "📐", color: "#818cf8", prefix: "stats_", style: "monotoneX",
        explain: { titulo: "Desempenho Acumulado Global", simples: "O reflexo clássico e absoluto de toda a sua jornada. Calcula a média simples de todas as questões resolvidas desde o início do seu uso.", dica: "Atenção: A média histórica sofre da inércia do passado e demora muito a refletir suas evoluções e vitórias recentes. É uma boa âncora de segurança, mas não a métrica primária de avanço." },
    },
    {
        id: "compare", label: "Raio-X + Monte Carlo", emoji: "⚡", color: "#a78bfa", prefix: null, style: "monotoneX",
        explain: { titulo: "Trindade Estatística: Passado, Presente e Futuro", simples: "A visão mais completa do ecossistema. Sobrepõe seus resultados brutos, extrai a curva Bayesiana de domínio real e usa o motor Monte Carlo para prever cenários probabilísticos até a data da sua prova.", dica: "Não analise no escuro. Utilize o seletor 'Foco' para isolar a disciplina que está puxando o seu Monte Carlo para baixo e crie um plano de ação imediato." },
    },
    {
        id: "subtopics", label: "Raio-X de Assuntos", emoji: "🔬", color: "#facc15", prefix: null, style: "linear",
        explain: { titulo: "Auditoria Cirúrgica de Subtópicos", simples: "Desça ao nível molecular do seu aprendizado. Quebra o desempenho disciplinar e expõe a taxa real de acertos e o volume de questões feitas por cada assunto específico.", dica: "O Segredo da Eficiência: Pare de revisar a matéria inteira. Identifique os blocos vermelhos (subtópicos fracos) e direcione todo o seu esforço cirurgicamente para eles." },
    },
    {
        id: "mc_density", label: "Densidade MC", emoji: "📉", color: "#60a5fa", prefix: null, style: "monotoneX",
        explain: { titulo: "Rastreador de Sucesso (Projeção Temporal)", simples: "Registra a flutuação do seu percentual projetado (Monte Carlo) no momento exato em que você finalizou cada simulado no passado.", dica: "A métrica definitiva de convergência. Se essa linha estiver subindo, sua probabilidade matemática de cruzar a nota de corte e conquistar a aprovação está cada vez maior." },
    },
    {
        id: "weekly_diff", label: "Semanal", emoji: "📆", color: "#10b981", prefix: null, style: "linear",
        explain: { titulo: "Acelerômetro Semanal de Desempenho", simples: "Calcula a tração do seu estudo comparando diretamente os ganhos ou perdas (delta) da semana atual em relação à semana imediatamente anterior.", dica: "Aviso Antecipado: Semanas com deltas negativos acentuados alertam para esquecimento (curva do esquecimento). Revise a teoria destas disciplinas antes que a perda se torne definitiva." },
    },
    {
        id: "today_vs_general", label: "Hoje vs Geral", emoji: "⚖️", color: "#a855f7", prefix: null, style: "linear",
        explain: { titulo: "Comparativo Diário vs. Histórico Geral", simples: "Analise seu desempenho de hoje em relação à sua média geral de estudos.", dica: "Use esta visão para calibrar seu foco diário." },
    },
    {
        id: "time_spent", label: "Agilidade AI", emoji: "⏳", color: "#06b6d4", prefix: null, style: "linear",
        explain: { titulo: "Rastreador de Agilidade AI", simples: "Analisa o tempo médio gasto por questão em cada matéria nos Simulados IA, ajudando você a encontrar gargalos que roubam minutos preciosos no dia da prova.", dica: "Matérias muito lentas podem te reprovar mesmo se você souber o conteúdo. Foque nelas para ganhar resistência." },
    },
];


export default React.memo(function EvolutionChart({
    targetScore = 80,
    goalDate,
    monteCarloHistory = [],
    studyLogs = [],
    simuladoRows = [],
    unit = '%',
    minScore = 0,
    maxScore = 100
}) {
    const rawCategories = useAppStore(useShallow(state => {
        const contest = state.appState?.contests?.[state.appState?.activeId];
        return contest?.categories ?? EMPTY_ARRAY;
    }));

    const categories = useMemo(() => {
        const DEFAULT_PALETTE = [
            "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", 
            "#ec4899", "#14b8a6", "#f43f5e", "#84cc16", "#a855f7",
            "#06b6d4", "#eab308", "#6366f1", "#d946ef", "#22c55e"
        ];
        let defaultColorCount = 0;
        const safeCategories = Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {});
        return safeCategories.map((cat) => {
            let color = cat.color;
            if (!color) {
                color = DEFAULT_PALETTE[defaultColorCount % DEFAULT_PALETTE.length];
                defaultColorCount++;
            }
            return { ...cat, color };
        });
    }, [rawCategories]);

    const [activeEngine, setActiveEngine] = useState("bayesian");
    const [selectedSubjectId, setFocusSubjectId] = useState(() => categories[0]?.id);
    
    // Ensure focusSubjectId is valid when categories update (avoid stale/undefined focus)
    const focusSubjectId = (categories && categories.some(c => c.id === selectedSubjectId)) 
        ? selectedSubjectId 
        : categories?.[0]?.id;
    

    // RIGOR-09 FIX: Recuperar os pesos do store para o Global Pct ponderado
    const mcWeights = useAppStore(
        (state) => state.appState?.contests?.[state.appState?.activeId]?.mcWeights || EMPTY_OBJECT
    );
    const { timeline, heatmapData, globalMetrics, activeCategories } = useChartData(categories, mcWeights, maxScore);
    const { runAnalysis } = useMonteCarloWorker();
    const monteCarloHistoryArray = useMemo(
        () => (Array.isArray(monteCarloHistory) ? monteCarloHistory : Object.values(monteCarloHistory || {})),
        [monteCarloHistory]
    );

    const studyLogsArray = useMemo(
        () => (Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {})),
        [studyLogs]
    );

    const simuladoRowsArray = useMemo(
        () => (Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {})),
        [simuladoRows]
    );
    const [mcLoading, setMcLoading] = useState(false);
    const safeGlobalMetrics = useMemo(() => ({
        totalQuestions: Number(globalMetrics?.totalQuestions) || 0,
        totalCorrect: Number(globalMetrics?.totalCorrect) || 0,
        globalAccuracy: (globalMetrics?.globalAccuracy === null || globalMetrics?.globalAccuracy === undefined || globalMetrics?.globalAccuracy === '') ? 0 : (Number.isFinite(Number(globalMetrics?.globalAccuracy)) ? Number(globalMetrics?.globalAccuracy) : 0),
    }), [globalMetrics]);

    const projectDays = useMemo(() => {
        if (!goalDate) return 30;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const goal = parseGoalDateLocal(goalDate);
        if (!goal) return 30;
        goal.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((goal - now) / (1000 * 60 * 60 * 24));
        const safeDays = diffDays > 0 ? diffDays : 1;
        return Math.min(3650, safeDays);
    }, [goalDate]);

    const [showOnlyFocus, setShowOnlyFocus] = useState(false);
    const [timeWindow, setTimeWindow] = useState("all");
    const [isExporting, setIsExporting] = useState(false);

    const focusCategory = useMemo(() => {
        if (!categories || categories.length === 0) return null;
        const found = categories.find(c => c.id === focusSubjectId);
        return found || categories[0];
    }, [categories, focusSubjectId]);

    const categoryLevels = useMemo(() => {
        const map = {};
        const lastPoint = timeline.length > 0 ? timeline[timeline.length - 1] : null;

        categories.forEach(cat => {
            const prefix = activeEngine === 'raw' ? 'raw_' : activeEngine === 'stats' ? 'stats_' : 'bay_';
            const fromTimeline = lastPoint?.[`${prefix}${cat.id}`];
            
            if (fromTimeline != null) {
                map[cat.id] = fromTimeline;
                return;
            }
            
            const historyRaw = cat.simuladoStats?.history;
            const history = historyRaw ? (Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw)) : [];
            if (!history.length) { map[cat.id] = 0; return; }
            const stats = computeCategoryStats(history, 100, 60, maxScore);
            map[cat.id] = stats?.mean || 0;
        });
        return map;
    }, [categories, timeline, activeEngine, maxScore]);

    const [mcResult, setMcResult] = useState(null);
    const [mcProjectionSeries, setMcProjectionSeries] = useState(null);

    const historyRaw = focusCategory?.simuladoStats?.history;

    const historyArray = useMemo(() => {
        if (!historyRaw) return EMPTY_ARRAY;
        return Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);
    }, [historyRaw]);

    const currentFocusLevel = focusCategory ? categoryLevels[focusCategory.id] : undefined;

    useEffect(() => {
        // ✅ LOTE-02 FIX: não disparar o worker em engines que não usam MC
        const isMcEngine = activeEngine === "compare" || activeEngine === "mc_density";
        if (!isMcEngine) { setMcLoading(false); return; }

        if (!focusCategory?.id || !Array.isArray(historyArray) || historyArray.length === 0) {
            setMcLoading(false);
            return;
        }

        const hist = [...historyArray]
            .filter((h) => h && h.date)
            .map((h) => {
                const dateKey = getDateKey(h.date);
                const score = getSafeScore(h, maxScore);

                if (!dateKey || !Number.isFinite(score)) return null;

                return {
                    ...h,
                    date: dateKey,
                    score,
                    correct: h.correct,
                    total: h.total
                };
            })
            .filter(Boolean)
            .sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date));

        if (hist.length < 1) {
            setMcLoading(false);
            return;
        }

        let cancelled = false;

        const workerDebounceTimeout = setTimeout(async () => {
            setMcLoading(true);

            try {
                let totalTimeSpent = 0;
                let totalTimedQuestions = 0;

                historyArray.forEach((rawH) => {
                    if (rawH && rawH.timeSpent != null && rawH.timedQuestoes != null) {
                        totalTimeSpent += Number(rawH.timeSpent);
                        totalTimedQuestions += Number(rawH.timedQuestoes);
                    }
                });

                const avgSeconds = totalTimedQuestions > 0 ? totalTimeSpent / totalTimedQuestions : 0;

                const store = useAppStore.getState();
                const activeId = store.appState?.activeId;
                const contest = store.appState?.contests?.[activeId];

                const defaultExamTotalQuestions = contest?.examTotalQuestions || 100;
                const examDurationMinutes = contest?.examDurationMinutes || 240;
                const projectedTotalTimeSeconds = defaultExamTotalQuestions * avgSeconds;

                const result = await runAnalysis({
                    values: hist,
                    dates: hist.map((h) => h.date),
                    meta: targetScore,
                    projectionDays: projectDays,
                    minScore,
                    maxScore,
                    currentMean: currentFocusLevel,
                    forcedBaseline: currentFocusLevel,
                    projectedTotalTimeSeconds,
                    examDurationMinutes
                });

                if (cancelled || !result) return;

                setMcResult({ ...result, categoryId: focusCategory?.id });

                const lastDateStr = hist[hist.length - 1].date;
                // ✅ LOTE-02 FIX: sem timezone hardcoded
                const lastDate = normalizeDate(lastDateStr);

                if (!lastDate || Number.isNaN(lastDate.getTime())) return;
                lastDate.setHours(12, 0, 0, 0);

                const nextDate = new Date(lastDate);
                nextDate.setDate(nextDate.getDate() + (projectDays || 30));

                const p50 = result.projectedMean ?? result.mean ?? 0;
                const lo = result.ci95Low ?? result.ci95StatLow ?? 0;
                const hi = result.ci95High ?? result.ci95StatHigh ?? 100;

                setMcProjectionSeries({
                    date: getDateKey(nextDate),
                    mc_p50: p50,
                    mc_band: [lo, hi],
                    categoryId: focusCategory?.id
                });
            } catch (err) {
                console.warn('[EvolutionChart] Worker MC falhou, tentando sync:', err);
                // ✅ LOTE-02 FIX: fallback síncrono real (o catch era vazio)
                if (!cancelled) {
                    try {
                        const fallback = runMonteCarloAnalysis({
                            values: hist,
                            dates: hist.map((h) => h.date),
                            meta: targetScore,
                            simulations: 1500,
                            projectionDays: projectDays,
                            minScore,
                            maxScore,
                            currentMean: currentFocusLevel,
                            forcedBaseline: currentFocusLevel
                        });
                        if (fallback) setMcResult({ ...fallback, categoryId: focusCategory?.id });
                    } catch (syncErr) {
                        console.error('[EvolutionChart] Fallback sync MC falhou:', syncErr);
                    }
                }
            } finally {
                if (!cancelled) setMcLoading(false);
            }
        }, 600);

        return () => {
            cancelled = true;
            clearTimeout(workerDebounceTimeout);
        };
    }, [
        focusCategory?.id,
        currentFocusLevel,
        historyArray,
        targetScore,
        projectDays,
        runAnalysis,
        minScore,
        maxScore,
        activeEngine   // ✅ LOTE-02
    ]);

    const activeMcResult = mcResult?.categoryId === focusCategory?.id ? mcResult : null;
    const activeMcProjectionSeries = mcProjectionSeries?.categoryId === focusCategory?.id ? mcProjectionSeries : null;

    const compareData = useMemo(() => {
        return buildPredictiveCompareData(
            timeline, 
            focusCategory, 
            categoryLevels, 
            activeMcProjectionSeries, 
            projectDays, 
            minScore, 
            maxScore
        );
    }, [timeline, focusCategory, activeMcProjectionSeries, categoryLevels, projectDays, minScore, maxScore]);

    const chartData = activeEngine === "compare" ? compareData : timeline;

    const filteredChartData = useMemo(() => {
        const historical = Array.isArray(chartData) ? chartData.filter((d) => !d?.__future) : [];
        const future = Array.isArray(chartData) ? chartData.filter((d) => d?.__future) : [];

        let result = historical;

        if (timeWindow !== "all") {
            const days = Number.parseInt(timeWindow, 10);

            if (Number.isFinite(days) && days > 0 && historical.length > 0) {
                const getDateMs = (item) => {
                    if (!item?.date) return Number.NaN;
                    const ms = toDateMs(item.date);
                    return Number.isNaN(ms) ? Number.NaN : ms;
                };

                const referenceMs = toDateMs(getDateKey(new Date()));
                const limit = referenceMs - days * 24 * 60 * 60 * 1000;
                result = historical.filter((d) => {
                    const ms = getDateMs(d);
                    return Number.isFinite(ms) && ms >= limit;
                });
            }
        }

        const withFuture = result.length > 0 ? [...result, ...future] : result;

        const primaryKey =
            activeEngine === "compare"
                ? "Nível Bayesiano"
                : activeEngine === "mc_density"
                    ? `bay_${focusCategory?.id}`
                    : activeEngine === "raw"
                        ? `raw_${focusCategory?.id}`
                        : activeEngine === "stats"
                            ? `stats_${focusCategory?.id}`
                            : `bay_${focusCategory?.id}`;

        return downsampleLTTB(withFuture, 150, "date", primaryKey);
    }, [chartData, timeWindow, activeEngine, focusCategory?.id]);

    const radarData = useMemo(() => {
        if (!categories || !categories.length) return [];
        return categories.map(cat => ({
            subject: String(cat.name || 'Sem nome').replace(/Direito /gi, 'D. ').substring(0, 15),
            nivel: Math.round(categoryLevels[cat.id] || 0),
            meta: targetScore
        }));
    }, [categories, targetScore, categoryLevels]);

    const subjectAggData = useMemo(() => {
        if (!categories || !categories.length) return [];

        return categories
            .filter((cat) => !showOnlyFocus || cat.id === focusCategory?.id)
            .map((cat) => {
                const history = filterHistoryByTimeWindow(cat.simuladoStats?.history || [], timeWindow)
                    .filter((h) => h && h.materia !== 'Simulado Personalizado');

                const totalQ = history.reduce((s, h) => {
                    let tot = Number(h.total) || 0;
                    if (tot === 0 && h.score != null) tot = getSyntheticTotal(maxScore);

                    const score = getSafeScore(h, maxScore);
                    if (!Number.isFinite(score)) return s;

                    return s + tot;
                }, 0);

                const totalCorrect = Math.round(
                    history.reduce((s, h) => {
                        let tot = Number(h.total) || 0;
                        if (tot === 0 && h.score != null) tot = getSyntheticTotal(maxScore);

                        const range = Math.max(1e-9, maxScore - minScore);
                        const score = getSafeScore(h, maxScore);
                        if (!Number.isFinite(score)) return s;

                        const normalizedScore = Math.max(minScore, Math.min(maxScore, score));

                        return s + ((normalizedScore - minScore) / range) * tot;
                    }, 0)
                );

                const stats = history.reduce(
                    (acc, h) => {
                        let rootTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
                        let topicsTs = 0;
                        let topicsTimedQ = 0;
                        let hasTopicWithTime = false;

                        if (Array.isArray(h.topics)) {
                            for (const t of h.topics) {
                                const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                                const tTot =
                                    typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0
                                        ? t.timedQuestoes
                                        : Number(t.total) || 0;

                                if (tTs !== null && tTs > 0 && tTot > 0) {
                                    topicsTs += tTs;
                                    topicsTimedQ += tTot;
                                    hasTopicWithTime = true;
                                }
                            }
                        }

                        if (hasTopicWithTime) {
                            return { ts: acc.ts + topicsTs, tq: acc.tq + topicsTimedQ };
                        } else if (rootTs !== null && rootTs > 0 && Number(h.total) > 0) {
                            return { ts: acc.ts + rootTs, tq: acc.tq + Number(h.total) };
                        } else if (rootTs !== null && rootTs > 0 && h.score != null) {
                            return { ts: acc.ts + rootTs, tq: acc.tq + getSyntheticTotal(maxScore) };
                        }

                        return acc;
                    },
                    { ts: 0, tq: 0 }
                );

                const timedQuestoes = stats.tq;
                const timeSpent = stats.ts;

                const safeName = String(cat.name || 'Sem nome');
                const shortName = safeName.length > 18 ? safeName.substring(0, 16) + '…' : safeName;

                return {
                    name: shortName,
                    fullName: safeName,
                    questoes: totalQ,
                    timedQuestoes,
                    acertos: totalCorrect,
                    timeSpent,
                    color: cat.color,
                    id: cat.id
                };
            })
            .filter((d) => d.questoes > 0)
            .sort((a, b) => b.questoes - a.questoes);
    }, [categories, showOnlyFocus, focusCategory?.id, maxScore, minScore, timeWindow]);

    const insight = useMemo(() => {
        return generateEvolutionInsights({
            timeline,
            focusCategory,
            activeEngine,
            categories,
            unit,
            maxScore,
            minScore
        });
    }, [timeline, focusCategory, activeEngine, categories, unit, maxScore, minScore]);

    const engine = ENGINES.find((e) => e.id === activeEngine) || ENGINES[0];

    const accountHasData = chartData.length >= 1;
    const filterHasData = filteredChartData.length >= 1;

    const handleExport = async () => {
        setIsExporting(true);

        try {
            await exportComponentAsPDF('evolution-chart-container', 'RaioX_Evolucao_Dashboard.pdf', 'landscape');
        } catch (err) {
            console.error('[EvolutionChart] Falha ao exportar PDF:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const isMcEngine = activeEngine === "compare" || activeEngine === "mc_density";

    if (categories.length === 0) {
        return (
            <div className="glass p-12 text-center rounded-2xl animate-fade-in-down border border-slate-800">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">Gráficos de Evolução</h2>
                <p className="text-slate-400">Realize simulados para desbloquear a sua Máquina do Tempo Estatística.</p>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <motion.div id="evolution-chart-container" className="space-y-10 relative" variants={containerVariants} initial="hidden" animate="visible">
            <div className="flex justify-end mb-6 relative z-20 no-print pr-1">
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 text-indigo-300 hover:bg-indigo-600/30 text-xs font-bold transition-all border border-indigo-500/30 disabled:opacity-50 will-change-transform active:scale-[0.985]"
                >
                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    <span className="hidden sm:inline">{isExporting ? 'Gerando PDF...' : 'Baixar PDF'}</span>
                    <span className="sm:hidden">BAIXAR PDF</span>
                </button>
            </div>

            <style>{`
        /* FIX: Preserva o focus-visible para feedback de acessibilidade por teclado */
        .recharts-wrapper:focus-visible, .recharts-surface:focus-visible { outline: 2px solid #818cf8 !important; outline-offset: 2px; border-radius: 8px; }
        .recharts-wrapper:focus:not(:focus-visible), .recharts-surface:focus:not(:focus-visible) { outline: none !important; border: none !important; box-shadow: none !important; }
        .recharts-cartesian-axis-tick-value { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; }
        .recharts-legend-item-text { font-size: 11px !important; font-weight: 600; }
            `}</style>

            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 min-w-0">
                <KpiCard value={safeGlobalMetrics.totalQuestions.toLocaleString()} label="Questões" color="#818cf8" icon="📚" />
                <KpiCard value={safeGlobalMetrics.totalCorrect.toLocaleString()} label="Acertos" color="#34d399" icon="🎯" />
                <div className="col-span-1">
                    <KpiCard
                        value={`${safeGlobalMetrics.globalAccuracy.toFixed(2)}%`}
                        label="Precisão Global" color="#fb923c" icon="⚡"
                    />
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="relative z-0 mb-8 sm:mb-12">
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-black tracking-[0.25em] leading-loose py-1 sm:py-2 mb-1 pl-1">
                    Nível Bayesiano por Disciplina • toque para focar
                </p>
                <div className="flex overflow-x-auto snap-x gap-4 px-2 py-4 no-scrollbar scroll-smooth">
                    {activeCategories.map(cat => (
                        <div key={cat.id} className={`snap-center shrink-0 w-[240px] sm:w-[280px] transition-all duration-500 ${showOnlyFocus && focusCategory?.id !== cat.id ? 'opacity-30 grayscale-[50%] scale-95' : 'opacity-100 scale-100'}`}>
                            <DisciplinaCard
                                cat={cat}
                                level={categoryLevels[cat.id] || 0}
                                metrics={timeline.length > 0 ? timeline[timeline.length - 1] : null}
                                target={targetScore}
                                isFocused={showOnlyFocus ? focusCategory?.id === cat.id : false}
                                onClick={() => setFocusSubjectId(cat.id)}
                                unit={unit}
                                maxScore={maxScore}
                            />
                        </div>
                    ))}
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="relative z-[50] rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] w-full min-w-0 transition-all duration-700 overflow-visible"
                 style={{ boxShadow: `0 0 60px -15px ${engine.color}20` }}>
                 
                 <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-700/50">
                     
                     <div className="group relative flex-1">
                         <div className="flex items-center gap-3">
                             <span className="text-2xl sm:text-3xl" style={{ filter: `drop-shadow(0 0 8px ${engine.color}80)` }}>{engine.emoji}</span>
                             <h3 className="font-black text-lg sm:text-xl tracking-tight transition-colors duration-300" style={{ color: engine.color }}>
                                 {engine.explain.titulo}
                             </h3>
                             <div className="relative flex items-center justify-center w-5 h-5 rounded-full border border-slate-600 text-slate-400 text-[10px] font-bold cursor-help hover:border-slate-300 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                                 ?
                             </div>
                         </div>
                         <div className="absolute top-10 left-0 sm:left-12 w-[280px] max-w-[90vw] sm:w-72 p-4 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] pointer-events-none">
                             <p className="text-xs text-slate-200 mb-3 leading-relaxed">{engine.explain.simples}</p>
                             <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-700/50">
                                 <p className="text-[10px] text-amber-400 italic font-bold">💡 Dica Prática</p>
                                 <p className="text-[10px] text-slate-400 mt-1">{engine.explain.dica}</p>
                             </div>
                         </div>
                     </div>

                     <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center justify-between gap-1 bg-slate-950/80 border border-slate-700/50 rounded-2xl p-1 shrink-0 overflow-x-auto w-full sm:w-auto shadow-inner backdrop-blur-sm">
                            {[{ label: '30d', value: '30' }, { label: '60d', value: '60' }, { label: '90d', value: '90' }, { label: 'Tudo', value: 'all' }].map(w => (
                                <button type="button" key={w.value} onClick={() => setTimeWindow(w.value)}
                                    aria-pressed={timeWindow === w.value}
                                    className={`shrink-0 flex-1 sm:flex-none px-4 py-1.5 rounded-2xl text-xs font-bold transition-all duration-150 will-change-transform ${timeWindow === w.value ? 'bg-indigo-600/40 text-indigo-200 shadow-sm border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent hover:scale-[1.01]'}`}>
                                    {w.label}
                                </button>
                            ))}
                        </div>
                        {activeEngine !== 'compare' && activeEngine !== 'mc_density' ? (
                            <button type="button" onClick={() => setShowOnlyFocus(!showOnlyFocus)}
                                aria-pressed={showOnlyFocus}
                                className={`shrink-0 flex items-center justify-center gap-2 px-5 py-1.5 h-[34px] rounded-2xl text-xs font-bold border transition-all will-change-transform active:scale-[0.985] ${showOnlyFocus ? 'bg-amber-500/30 border-amber-500/60 text-amber-200 shadow-sm' : 'bg-slate-950/80 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 hover:border-slate-600'}`}>
                                <span className="text-base">{showOnlyFocus ? '🎯' : '👁️'}</span>
                                <span className="hidden sm:inline truncate max-w-[150px] font-semibold">
                                    {showOnlyFocus ? `Foco: ${focusCategory?.name}` : 'Ver Todas'}
                                </span>
                            </button>
                        ) : (
                            <div className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-1.5 h-[34px] rounded-2xl text-xs font-bold border bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-sm transition-all hover:bg-indigo-500/20">
                                <span className="text-base">🎯</span>
                                <select
                                    value={focusCategory?.id || ''}
                                    onChange={(e) => setFocusSubjectId(e.target.value)}
                                    className="bg-transparent outline-none cursor-pointer hover:text-indigo-200 appearance-none pr-5 relative max-w-[150px] truncate font-semibold"
                                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23818cf8\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8 11.5l-5-5h10l-5 5z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}
                                >
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                     </div>
                 </div>

                <div 
                    className="relative w-full mb-8"
                    style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)', WebkitMaskImage: '-webkit-linear-gradient(left, transparent, black 5%, black 95%, transparent)' }}
                >
                    <div className="flex overflow-x-auto pt-2 pb-4 px-4 gap-3 w-full no-scrollbar scroll-smooth snap-x snap-mandatory">
                        {ENGINES.map((eng) => {
                            const active = activeEngine === eng.id;
                            return (
                                <button
                                    type="button"
                                    key={eng.id}
                                    onClick={() => setActiveEngine(eng.id)}
                                    aria-pressed={active}
                                    className={`snap-start shrink-0 group flex flex-col items-center justify-center gap-1.5 w-[118px] h-[78px] rounded-2xl transition-all duration-150 border will-change-transform ${active ? 'shadow-md scale-[1.03] z-10' : 'bg-white/[0.015] border-white/[0.04] text-slate-500 hover:bg-white/[0.04] hover:text-slate-300 hover:border-white/15 hover:scale-[1.015]'}`}
                                    style={active ? { backgroundColor: `${eng.color}12`, borderColor: `${eng.color}55`, color: eng.color, boxShadow: `0 0 20px ${eng.color}20, 0 4px 12px -2px rgba(0,0,0,0.3)` } : {}}
                                >
                                    <span className="text-[22px] group-hover:scale-105 transition-transform duration-150" style={{ filter: active ? `drop-shadow(0 0 4px ${eng.color})` : 'none' }}>{eng.emoji}</span>
                                    {/* FIX: Padronização para text-[10px] e eliminação da mistura entre 9px, 10px e 12px */}
                                    <span className="text-[10px] uppercase tracking-[0.1em] font-bold text-center leading-none px-1">{eng.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {activeEngine === "raw_weekly" ? (
                    <EvolutionHeatmap 
                        heatmapData={heatmapData} 
                        targetScore={targetScore} 
                        unit={unit} 
                        showOnlyFocus={showOnlyFocus}
                        focusSubjectId={focusSubjectId}
                    />
                ) : activeEngine === "subtopics" ? (
                    <SubtopicsPerformanceChart
                        categories={categories}
                        focusSubjectId={focusSubjectId}
                        showOnlyFocus={showOnlyFocus}
                        timeWindow={timeWindow}
                        targetScore={targetScore}
                        minScore={minScore}
                        maxScore={maxScore}
                    />
                ) : activeEngine === "time_spent" ? (
                    <TimeSpentChart 
                        subjectAggData={subjectAggData} 
                        activeCategories={activeCategories}
                        showOnlyFocus={showOnlyFocus}
                        focusCategory={focusCategory}
                        maxScore={maxScore}
                    />
                ) : activeEngine === "mc_density" ? (
                    <MonteCarloEvolutionChart
                        data={monteCarloHistoryArray}
                        targetScore={targetScore}
                        unit={unit}
                        minScore={minScore}
                        maxScore={maxScore}
                    />
                ) : activeEngine === "weekly_diff" ? (
                    <WeeklyEvolutionView
                        categories={categories}
                        studyLogs={studyLogsArray}
                        showOnlyFocus={showOnlyFocus}
                        focusSubjectId={focusSubjectId}
                        maxScore={maxScore}
                        unit={unit}
                    />
                ) : activeEngine === "today_vs_general" ? (
                    <TodayVsGeneralChart
                        activeCategories={activeCategories}
                        globalMetrics={safeGlobalMetrics}
                        targetScore={targetScore}
                        maxScore={maxScore}
                        minScore={minScore}   // ✅ LOTE-01
                        unit={unit}
                        simuladoRows={simuladoRowsArray}
                    />
                ) : !accountHasData ? (
                    <div className="h-[200px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30">
                        <span className="text-5xl">🔥</span>
                        <div className="text-center">
                            <p className="text-slate-300 font-bold text-base mb-1">Dados insuficientes para exibir o gráfico</p>
                            <p className="text-slate-500 text-sm max-w-xs">Registre pelo menos <span className="text-indigo-400 font-bold">1 simulado</span> na sua conta para desbloquear os gráficos.</p>
                        </div>
                    </div>
                ) : !filterHasData ? (
                    <div className="h-[200px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30">
                        <span className="text-5xl">📅</span>
                        <div className="text-center">
                            <p className="text-slate-300 font-bold text-base mb-1">Nenhuma atividade recente</p>
                            <p className="text-slate-500 text-sm max-w-xs">Não registrou simulados nos últimos <span className="text-amber-400 font-bold">{timeWindow} dias</span>.</p>
                            <button 
                                onClick={() => setTimeWindow("all")} 
                                // FIX: Borda arredondada consistente (rounded-xl) e estados hover/focus aprimorados 
                                className="mt-5 px-6 py-2.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 rounded-xl font-bold text-xs hover:bg-indigo-600/30 hover:text-indigo-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-95 shadow-lg shadow-indigo-900/20"
                            >
                                Ver Todo o Histórico
                            </button>
                        </div>
                    </div>
                ) : activeEngine === "compare" ? (
                    <div className="w-full overflow-x-auto overflow-y-hidden no-scrollbar pb-2">
                        <div className="min-w-[700px] lg:min-w-full relative">
                            {mcLoading && (
                                <div className="absolute inset-0 z-20 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl transition-all duration-300">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 size={32} className="animate-spin text-indigo-400" />
                                        <span className="text-[9px] font-black uppercase text-indigo-300 tracking-[0.2em] animate-pulse">Sincronizando Monte Carlo...</span>
                                    </div>
                                </div>
                            )}
                            <CompareChart
                                filteredChartData={filteredChartData}
                                targetScore={targetScore}
                                categories={categories}
                                minScore={minScore}
                                maxScore={maxScore}
                                unit={unit}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto overflow-y-hidden no-scrollbar pb-2">
                        <div className="min-w-[700px] lg:min-w-full relative">
                            <EvolutionLineChart
                                filteredChartData={filteredChartData}
                                activeCategories={activeCategories}
                                engine={engine}
                                targetScore={targetScore}
                                focusSubjectId={focusSubjectId}
                                showOnlyFocus={showOnlyFocus}
                                categories={categories}
                                minScore={minScore}
                                maxScore={maxScore}
                                unit={unit}
                            />
                        </div>
                    </div>
                )}
            </motion.div>

            {isMcEngine && focusCategory && (
                <div className="animate-fade-in-up">
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <TrendingUp size={120} />
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
                            <div className="w-full md:w-1/2 flex flex-col">
                                <div className="flex items-center gap-2 mb-4 min-w-0">
                                    <Zap size={16} className="text-indigo-400 shrink-0" />
                                    <select
                                        value={focusCategory?.id || ''}
                                        onChange={(e) => setFocusSubjectId(e.target.value)}
                                        className="bg-transparent text-[10px] font-black text-indigo-300 uppercase tracking-widest outline-none border-b border-indigo-500/30 pb-1 cursor-pointer hover:text-indigo-200 transition-colors appearance-none pr-4 relative w-auto max-w-full truncate"
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23818cf8\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8 11.5l-5-5h10l-5 5z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                                                FOCO: {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="h-[280px] w-full mb-2">
                                    <GaussianPlot
                                        mean={activeMcResult?.projectedMean ?? activeMcResult?.mean ?? 0}
                                        sd={activeMcResult?.sd ?? 0}
                                        sdLeft={activeMcResult?.sdLeft ?? activeMcResult?.sd ?? 0}
                                        sdRight={activeMcResult?.sdRight ?? activeMcResult?.sd ?? 0}
                                        low95={activeMcResult?.ci95Low ?? 0}
                                        high95={activeMcResult?.ci95High ?? 0}
                                        targetScore={targetScore}
                                        prob={activeMcResult?.probability ?? 0}
                                        kdeData={activeMcResult?.kdeData}
                                        minScore={minScore}
                                        maxScore={maxScore}
                                        unit={unit}
                                    />
                                </div>
                            </div>

                            <div className="w-full md:w-1/2 grid grid-cols-2 gap-3 self-center">
                                {(() => {
                                    const toFinite = (v, fallback = 0) => (v === null || v === undefined || v === '') ? fallback : (Number.isFinite(Number(v)) ? Number(v) : fallback);
                                    const bounded = (v) => Math.max(minScore, Math.min(maxScore, toFinite(v, minScore)));
                                    const projectedLevel = bounded(toFinite(activeMcResult?.projectedMean, toFinite(activeMcResult?.mean, minScore)));
                                    const ciLow = bounded(toFinite(activeMcResult?.ci95Low, projectedLevel));
                                    const ciHigh = bounded(toFinite(activeMcResult?.ci95High, projectedLevel));
                                    const ciMin = Math.min(ciLow, ciHigh);
                                    const ciMax = Math.max(ciLow, ciHigh);
                                    const marginOfError = Math.max(0, (ciMax - ciMin) / 2);

                                    return [
                                        { label: 'Caminho Sucesso', val: `${Math.max(0, Math.min(100, toFinite(activeMcResult?.probability))).toFixed(2)}%`, icon: <Target size={14} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                        { label: 'Nível Projetado', val: unit === '%' ? `${projectedLevel.toFixed(2)}${unit}` : `${Math.round(projectedLevel)}${unit}`, icon: <TrendingUp size={14} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                        { label: 'Margem de Erro', val: unit === '%' ? `±${marginOfError.toFixed(2)}${unit}` : `±${Math.round(marginOfError)}${unit}`, icon: <BarChart3 size={14} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                                        { label: 'Confiança 95%', val: unit === '%' ? `${ciMin.toFixed(2)}-${ciMax.toFixed(2)}${unit}` : `${Math.round(ciMin)}-${Math.round(ciMax)}${unit}`, icon: <Zap size={14} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10' }
                                    ].map((stat, i) => (
                                     <div key={i} className="flex flex-col p-3 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors min-w-0">
                                         <div className="flex items-center gap-1.5 mb-1 opacity-60">
                                             <span className={stat.color}>{stat.icon}</span>
                                             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                                         </div>
                                         <span className={`text-base sm:text-lg font-black ${stat.color} tracking-tight break-words w-full block leading-tight`} title={stat.val}>
                                             {stat.val}
                                         </span>
                                     </div>
                                ));
                                })()}
                            </div>
                        </div>

                        {!activeMcResult && !mcLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                                <span className="text-2xl mb-2">📉</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Simule pelo menos 2 registros para ver a densidade
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="pt-10 relative z-0">
            {(() => {
                const typeColors = {
                    success: {
                        border: 'border-emerald-500/30',
                        bg: 'from-emerald-500/5 via-slate-900 to-slate-900',
                        glow: 'shadow-emerald-500/10',
                        text: 'text-emerald-400',
                        icon: 'text-emerald-400',
                        circleBg: 'bg-emerald-500/10',
                        pingBg: 'bg-emerald-500'
                    },
                    warning: {
                        border: 'border-amber-500/30',
                        bg: 'from-amber-500/5 via-slate-900 to-slate-900',
                        glow: 'shadow-amber-500/10',
                        text: 'text-amber-400',
                        icon: 'text-amber-400',
                        circleBg: 'bg-amber-500/10',
                        pingBg: 'bg-amber-500'
                    },
                    danger: {
                        border: 'border-rose-500/30',
                        bg: 'from-rose-500/5 via-slate-900 to-slate-900',
                        glow: 'shadow-rose-500/10',
                        text: 'text-rose-400',
                        icon: 'text-rose-400',
                        circleBg: 'bg-rose-500/10',
                        pingBg: 'bg-rose-500'
                    },
                    info: {
                        border: 'border-indigo-500/30',
                        bg: 'from-indigo-500/5 via-slate-900 to-slate-900',
                        glow: 'shadow-indigo-500/10',
                        text: 'text-indigo-400',
                        icon: 'text-indigo-400',
                        circleBg: 'bg-indigo-500/10',
                        pingBg: 'bg-indigo-500'
                    }
                };
                const colors = typeColors[insight.type] || typeColors.info;

                return (
                    <div className={`relative overflow-hidden rounded-[2rem] border ${colors.border} bg-slate-900 shadow-2xl transition-all duration-700 group hover:scale-[1.01] ${colors.glow}`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50`} />
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000 -mr-48 -mt-48" />
                        <div className={`absolute bottom-0 left-0 w-[300px] h-[300px] ${colors.circleBg} rounded-full blur-[100px] pointer-events-none -ml-32 -mb-32`} />
                        
                        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:items-center p-6 sm:p-8 md:p-10 relative z-10">
                            <div className="flex-1 space-y-5">
                                <div className="flex items-start sm:items-center gap-5">
                                    <div className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl sm:text-3xl shadow-2xl transform group-hover:rotate-6 transition-transform duration-500 ${colors.icon}`}>
                                        {insight.icon}
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] ${colors.text} drop-shadow-sm truncate`}>
                                                {renderInsightText(insight.title, colors.text)}
                                            </span>
                                            <div className="h-px w-6 sm:w-10 bg-white/10 hidden sm:block" />
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[8px] font-black text-slate-500 border border-white/5 uppercase tracking-widest whitespace-nowrap">System Engine v4.0</span>
                                        </div>
                                        <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight break-words">
                                            {renderInsightText(insight.text, colors.text)}
                                        </h3>
                                    </div>
                                </div>
                                
                                <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-3xl font-medium">
                                    {renderInsightText(insight.details, colors.text)}
                                </p>
                            </div>

                            {insight.advice && (
                                <div className="w-full lg:w-[350px] shrink-0 mt-2 lg:mt-0">
                                    <div className={`rounded-2xl bg-black/60 border ${colors.border} p-6 sm:p-8 relative shadow-2xl group-hover:bg-black/80 transition-all duration-500 overflow-hidden`}>
                                        <div className={`absolute -right-12 -top-12 w-48 h-48 ${colors.glow} opacity-10 blur-3xl pointer-events-none`} />
                                        
                                        <div className="flex items-center gap-2 mb-3 relative z-10">
                                            <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 ${colors.text}`}>
                                                <Zap size={14} fill="currentColor" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block whitespace-nowrap">Orientação Estratégica</span>
                                        </div>
                                        
                                        <p className={`text-sm sm:text-base font-bold leading-relaxed ${colors.text} relative z-10 drop-shadow-lg break-words`}>
                                            {renderInsightText(insight.advice, colors.text)}
                                        </p>
                                        
                                        <div className="absolute -bottom-4 -right-4 p-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                            <Zap size={80} className={colors.text} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-8 sm:px-10 py-5 bg-black/20 border-t border-white/5 flex flex-wrap items-center gap-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="relative flex items-center justify-center">
                                    <div className={`absolute w-3 h-3 rounded-full animate-ping opacity-20 ${colors.pingBg}`} />
                                    <div className={`w-1.5 h-1.5 rounded-full z-10 ${colors.pingBg}`} />
                                </div>
                                Motor Analítico Sincronizado
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="opacity-60">Confiança do Modelo:</span>
                                <span className="text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/5 tracking-normal">{timeline.length >= 2 ? `${Math.min(99.9, 85 + Math.min(14.9, timeline.length * 0.8)).toFixed(1)}%` : '—'}</span>
                            </div>
                            {mcLoading && (
                                <div className="ml-auto hidden md:flex items-center gap-2 opacity-60 text-indigo-300 italic lowercase font-medium tracking-normal">
                                    <Loader2 size={10} className="animate-spin" />
                                    processando projeções em tempo real
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
            </div>

            <div className="pt-4">
                <div className="flex items-center gap-3 mb-5">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center px-2">Galeria de Análises Detalhadas</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    <RadarAnalysis radarData={radarData} maxScore={maxScore} minScore={minScore} unit={unit} />
                    <PerformanceBarChart
                        subjectAggData={subjectAggData}
                        showOnlyFocus={showOnlyFocus}
                        focusCategory={focusCategory}
                        unit={unit}
                        maxScore={maxScore}
                    />
                    <CriticalTopicsAnalysis
                        categories={categories}
                        maxScore={maxScore}
                        minScore={minScore}
                    />
                </div>
            </div>
        </motion.div>
    );
});
```

---

## File: `src/components/ActivityHeatmap.jsx`
*Linhas: 205 | Tamanho: 11.08 KB*

```javascript
import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { normalizeDate, formatDuration, getDateKey } from '../utils/dateHelper';

function ActivityHeatmap({ studyLogs = [] }) {
    const [monthOffset, setMonthOffset] = React.useState(0);
    const [now, setNow] = React.useState(() => new Date());

    React.useEffect(() => {
        const id = setInterval(() => {
            setNow(new Date());
        }, 60 * 1000);
        return () => clearInterval(id);
    }, []);


    const currentMonth = useMemo(() => {
        // ✅ LOTE-02 FIX: base em `now` (o intervalo de 60s já força re-render)
        const base = new Date(now.getFullYear(), now.getMonth(), 1);
        return monthOffset < 0 ? subMonths(base, Math.abs(monthOffset)) :
            monthOffset > 0 ? addMonths(base, monthOffset) : base;
    }, [monthOffset, now]);

    const calendarData = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });

        const studyMap = {};
        const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
        logsArray.forEach(log => {
            const rawDate = normalizeDate(log?.date);
            if (!rawDate) return;
            const dateKey = getDateKey(rawDate) || format(rawDate, 'yyyy-MM-dd');
            const minutes = Math.max(0, Number(log?.minutes) || 0);
            studyMap[dateKey] = (studyMap[dateKey] || 0) + minutes;
        });

        const weeks = [];
        let currentWeek = [];

        const startDay = getDay(start);
        for (let i = 0; i < startDay; i++) {
            currentWeek.push(null);
        }

        const today = getDateKey(now) || format(now, 'yyyy-MM-dd');

        days.forEach(day => {
            const dateKey = getDateKey(day) || format(day, 'yyyy-MM-dd');
            const minutes = studyMap[dateKey] || 0;

            currentWeek.push({
                date: day,
                dateKey,
                minutes,
                isToday: dateKey === today,
                level: minutes === 0 ? 0 :
                    minutes < 30 ? 1 :
                        minutes < 60 ? 2 :
                            minutes < 120 ? 3 : 4
            });

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });

        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeks.push(currentWeek);
        }

        const totalDays = days.length;
        const monthKeys = new Set(days.map(day => getDateKey(day) || format(day, 'yyyy-MM-dd')));
        const studiedDays = days.filter(day => {
            const dateKey = getDateKey(day) || format(day, 'yyyy-MM-dd');
            return studyMap[dateKey] > 0;
        }).length;
        const totalMinutes = Object.entries(studyMap)
            .filter(([key]) => monthKeys.has(key))
            .reduce((acc, [, mins]) => acc + mins, 0);

        const totalTimeStr = formatDuration(totalMinutes / 60);

        return { weeks, totalDays, studiedDays, totalMinutes, totalTimeStr };
    }, [currentMonth, studyLogs, now]);

    const levelColors = [
        'bg-slate-800/40 border-white/5',
        'bg-emerald-900/40 border-emerald-800/50',
        'bg-emerald-600/50 border-emerald-500/50',
        'bg-emerald-500/80 border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
        'bg-emerald-400 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.6)] font-bold text-emerald-900',
    ];

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Visão Mensal
                    <div className="relative group/tooltip cursor-help ml-1 inline-flex">
                        <Info size={14} className="text-slate-500/50 hover:text-slate-400 transition-colors" />
                        <div className="absolute top-full left-0 mt-2 w-56 p-2 bg-yellow-400 text-[10px] text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500 font-normal tracking-normal normal-case">
                            <strong>Mapa de Calor:</strong> Cada quadrado representa um dia. Quanto mais escuro o verde, mais tempo de estudo foi registrado no cronômetro ou adicionado manualmente.
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMonthOffset(m => Math.max(-24, m - 1))}
                        disabled={monthOffset <= -24}
                        className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-base font-black text-white min-w-[120px] text-center capitalize tracking-tight">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button
                        onClick={() => setMonthOffset(m => Math.min(0, m + 1))}
                        disabled={monthOffset >= 0}
                        className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-3">
                {weekDays.map(day => (
                    <div key={day} className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {calendarData.weeks.flatMap((week, weekIndex) =>
                    week.map((day, dayIndex) => (
                        <div
                            key={`${weekIndex}-${dayIndex}`}
                            tabIndex={day ? 0 : -1}
                            role={day ? 'button' : undefined}
                            aria-label={day ? `${Math.round(Number(day.minutes) || 0)} minutos estudados em ${format(day.date, "dd 'de' MMMM", { locale: ptBR })}` : 'Sem dados de estudo'}
                            className={`
                                w-full aspect-square rounded-xl md:rounded-2xl border transition-all duration-300 cursor-default group relative focus:outline-none focus:ring-2 focus:ring-emerald-400
                                ${day ? levelColors[day.level] : 'bg-transparent border-transparent'}
                                ${day?.isToday ? 'ring-2 ring-emerald-500 ring-inset z-10' : ''}
                                ${day ? 'hover:scale-110 hover:z-20 hover:border-white/50' : ''}
                            `}
                        >
                            {day && (
                                <div className={`absolute bottom-full mb-3 px-4 py-3 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl text-center whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 transform translate-y-2 group-hover:translate-y-0 focus-within:opacity-100 focus-within:translate-y-0 ${dayIndex === 0 ? 'left-[-10px]' : dayIndex === 6 ? 'right-[-10px]' : 'left-1/2 -translate-x-1/2'}`}>
                                    <div className={`absolute -bottom-2 w-4 h-4 bg-slate-900 border-b border-r border-white/10 rotate-45 ${dayIndex === 0 ? 'left-6' : dayIndex === 6 ? 'right-6' : 'left-1/2 -translate-x-1/2'}`}></div>
                                    <p className="relative z-10 text-[10px] text-slate-400 font-bold capitalize mb-1 tracking-widest">{format(day.date, "dd 'de' MMMM (EEEE)", { locale: ptBR })}</p>
                                    <p className="relative z-10 text-sm font-black text-white">
                                        {day.minutes > 0
                                            ? <span className="text-emerald-400">{formatDuration(day.minutes / 60)}</span>
                                            : 'Descanso'}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Menos</span>
                    <div className="flex gap-1.5 mx-2">
                        {levelColors.map((color, i) => (
                            <div key={i} className={`w-4 h-4 rounded-md border ${color.split(' ')[0]} ${color.split(' ')[1]}`} />
                        ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Mais</span>
                </div>

                <div className="flex items-center gap-4 bg-slate-900/50 px-5 py-2.5 rounded-2xl border border-white/5">
                    <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Dias Ativos</div>
                        <div className="text-sm text-slate-300"><span className="text-emerald-400 font-black">{calendarData.studiedDays}</span> / {calendarData.totalDays}</div>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Tempo Total</div>
                        <div className="text-sm text-white font-black">{calendarData.totalTimeStr}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(ActivityHeatmap);
```

---

## File: `src/components/charts/EvolutionChart/CompareChart.jsx`
*Linhas: 321 | Tamanho: 18.07 KB*

```javascript
import React, { useId } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList, Brush
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";
import { ChartFrame } from "../ChartFrame";
import { normalizeDate } from '../../../utils/dateHelper';

const CustomActiveDot = (props) => {
    const { cx, cy, fill, stroke } = props;
    if (cx == null || cy == null) return null;
    return (
        <g>
            {/* 🎯 FIX: Efeito de pulso animado via SVG para o Hover */}
            <circle cx={cx} cy={cy} r={12} fill={fill} opacity={0.3}>
                <animate attributeName="r" from="6" to="16" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy} r={5} fill={fill} stroke={stroke || "#ffffff"} strokeWidth={2} />
        </g>
    );
};

export function CompareChart({ 
    filteredChartData, 
    targetScore,
    minScore = 0,
    maxScore = 100,
    unit = '%'
}) {
    const baseId = useId().replace(/:/g, '');
    const CC = React.useMemo(() => ({
        projectionPurpleGradient: `cc_projPurple-${baseId}`,
        cloudGradient: `cc_cloud-${baseId}`,
        bayBandGradient: `cc_bayBand-${baseId}`,
        greenGradient: `cc_green-${baseId}`,
        lineShadow: `cc_lineShadow-${baseId}`,
        glow: `cc_glow-${baseId}`
    }), [baseId]);

    const chartData = React.useMemo(() => {
        const rawData = Array.isArray(filteredChartData) ? filteredChartData : [];
        return [...rawData].sort((a, b) => {
            const dateA = a.date ? (normalizeDate(a.date)?.getTime() ?? 0) : 0;
            const dateB = b.date ? (normalizeDate(b.date)?.getTime() ?? 0) : 0;
            return dateA - dateB;
        });
    }, [filteredChartData]);

    const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > safeMinScore
        ? Number(maxScore)
        : Math.max(100, safeMinScore + 1);

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

    // 🎯 FIX: Algoritmo de Colisão Adaptativo baseado no Range Real
    const solveCollisions = (points) => {
        if (!points.length) return [];
        const sorted = [...points].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
        const yPos = sorted.map(p => ({
            ...p,
            yPos: Number.isFinite(Number(p.value)) ? Number(p.value) : safeMinScore
        }));
        
        const range = safeMaxScore - safeMinScore;
        const topLimit = safeMaxScore - (range * 0.02);
        const bottomLimit = safeMinScore + (range * 0.05);
        const safeSpace = Math.max(0.1, topLimit - bottomLimit);

        const MIN_PCT_DISTANCE = range * 0.085; // 8.5% do escopo visual
        const requiredSpace = (yPos.length - 1) * MIN_PCT_DISTANCE;

        const effectiveDistance = requiredSpace > safeSpace 
            ? safeSpace / Math.max(1, yPos.length - 1) 
            : MIN_PCT_DISTANCE;

        // ✅ LOTE-02 FIX: os 3 passes sequenciais podiam estourar o teto logo após
        // corrigir o chão. Relaxamento iterativo com re-cheque de limites.
        for (let iter = 0; iter < 15; iter++) {
            let moved = false;
            for (let i = 1; i < yPos.length; i++) {
                if (yPos[i - 1].yPos - yPos[i].yPos < effectiveDistance) {
                    const mid = (yPos[i - 1].yPos + yPos[i].yPos) / 2;
                    yPos[i - 1].yPos = mid + effectiveDistance / 2;
                    yPos[i].yPos = mid - effectiveDistance / 2;
                    moved = true;
                }
            }
            if (yPos[0].yPos > topLimit) {
                const shift = yPos[0].yPos - topLimit;
                yPos.forEach(p => p.yPos -= shift);
                moved = true;
            }
            if (yPos[yPos.length - 1].yPos < bottomLimit) {
                const shift = bottomLimit - yPos[yPos.length - 1].yPos;
                yPos.forEach(p => p.yPos += shift);
                moved = true;
            }
            if (!moved) break;
        }

        return yPos;
    };

    const todayIdx = chartData.reduce((acc, curr, i) => {
        const hasObserved = curr["Nota Bruta"] != null || curr["Nível Bayesiano"] != null || curr["Média Histórica"] != null;
        return hasObserved ? i : acc;
    }, -1);
    
    const todayPoints = [];
    if (todayIdx >= 0) {
        const d = chartData[todayIdx];
        if (d["Nível Bayesiano"] != null) todayPoints.push({ name: 'bay', value: d["Nível Bayesiano"] });
        if (d["Nota Bruta"] != null) todayPoints.push({ name: 'raw', value: d["Nota Bruta"] });
        if (d["Média Histórica"] != null) todayPoints.push({ name: 'stats', value: d["Média Histórica"] });
        if (d["Futuro Provável"] != null) todayPoints.push({ name: 'mc', value: d["Futuro Provável"] });
    }
    const todayY = solveCollisions(todayPoints);

    const futureIdx = chartData.length - 1;
    const isFuturePoint = futureIdx > todayIdx;
    const lastPoints = [];
    if (isFuturePoint && futureIdx >= 0) {
        const d = chartData[futureIdx];
        if (d["Futuro Provável"] != null) lastPoints.push({ name: 'mc', value: d["Futuro Provável"] });
    }
    const lastY = solveCollisions(lastPoints);

    const getOffset = (name, value, index, viewBox) => {
        const isFuture = isFuturePoint && index === futureIdx;
        const pts = isFuture ? lastY : todayY;
        if (!pts || !pts.length) return 0;
        const pt = pts.find(p => p.name === name);
        if (!pt) return 0;
        const range = safeMaxScore - safeMinScore;
        const pxPerPct = viewBox?.height != null && viewBox.height > 0 ? viewBox.height / (range || 1) : 4.6;
        return (value - pt.yPos) * pxPerPct;
    };

    const renderLabel = (props, type, color) => {
        const { x, y, index, value, viewBox } = props;
        if (value === null || value === undefined) return null;
        
        const isMc = type === 'mc';
        const isBay = type === 'bay';
        const isRaw = type === 'raw';
        const isStats = type === 'stats';

        let isValid = false;
        if (isMc) isValid = lastValidIdx.mc === index;
        else if (isBay) isValid = lastValidIdx.bay === index;
        else if (isRaw) isValid = lastValidIdx.raw === index;
        else if (isStats) isValid = lastValidIdx.stats === index;

        if (!isValid) return null;

        const offset = getOffset(type, value, index, viewBox);
        const xOff = isMc ? 12 : 10;
        const formatted = (Number.isFinite(Number(value)) ? Number(value) : 0).toFixed(2) + unit;
        const boxWidth = Math.max(42, formatted.length * 7 + 14);   // ✅ LOTE-02 (42px cortava "1200.00%")
        return (
            <g>
                <rect x={x + xOff - 2} y={y - 10 + offset} width={boxWidth} height={20} rx={10}
                      fill={color} fillOpacity={0.15} stroke={color} strokeOpacity={0.4} />
                <text x={x + xOff - 2 + boxWidth / 2} y={y + 4 + offset} fill={color} fontSize={11}
                      fontWeight="black" textAnchor="middle"
                      style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                    {formatted}
                </text>
            </g>
        );    };

    let gainBase = 'dataMin';
    let showGainArea = true;
    if (todayIdx >= 0) {
        const todayPt = chartData[todayIdx];
        const baseCandidate = todayPt["Nível Bayesiano"] != null ? todayPt["Nível Bayesiano"] : todayPt["Nota Bruta"];
        if (Number.isFinite(Number(baseCandidate))) {
            gainBase = Number(baseCandidate);
            // BUG-3 FIX: Não exibir área verde de "ganho" se a projeção final está ABAIXO do nível atual
            const lastPt = chartData[chartData.length - 1];
            const lastProjection = lastPt?.["Futuro Provável"];
            if (Number.isFinite(Number(lastProjection)) && Number(lastProjection) < gainBase) {
                showGainArea = false;
            }
        }
    }

    const animateSeries = false;

    return (
        <div className="h-[360px] sm:h-[460px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300">
            <ChartFrame minHeight={360} label="Comparando evolução">
                <ResponsiveContainer width="100%" height="100%" minHeight={360} className="outline-none focus:outline-none focus:ring-0" minWidth={1}>
                {/* 🎯 FIX: right: 85 impede que as Labels cortem a borda direita na renderização do MC */}
                <ComposedChart data={chartData} syncId="evolutionSync" margin={{ top: 20, right: 85, left: 0, bottom: 20 }} style={{ outline: 'none' }} tabIndex="-1">
                    <defs>
                        <linearGradient id={CC.projectionPurpleGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id={CC.cloudGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id={CC.bayBandGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#34d399" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id={CC.greenGradient} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#34d399" stopOpacity={0.01} />
                        </linearGradient>
                        <filter id={CC.lineShadow} height="200%">
                            {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                        </filter>
                        <filter id={CC.glow} x="-20%" y="-20%" width="140%" height="140%">
                            {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                        </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => {
                            if (!val) return '';
                            const parts = String(val).split('-');
                            return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
                        }}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                        dy={12} 
                        axisLine={false} 
                        tickLine={false} 
                        minTickGap={35} 
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} dx={-8} axisLine={false} tickLine={false} domain={[safeMinScore, safeMaxScore]} allowDataOverflow={false} tickFormatter={(v) => `${v}${unit}`} width={50} />
                    
                    <ReferenceLine y={targetScore} stroke="#10b981" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="5 5"
                        label={{ value: `META ${targetScore}${unit}`, fill: '#10b981', fontSize: 10, fontWeight: 'black', position: 'insideBottomLeft', dy: -6, dx: 5 }} />
                    
                    <Tooltip 
                        offset={30}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                        content={(props) => <ChartTooltip {...props} chartData={filteredChartData} isCompare={true} unit={unit} />} />
                    
                    <Legend wrapperStyle={{ paddingTop: '20px', paddingBottom: '10px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    
                    <Area connectNulls type="monotoneX" dataKey="Banda Bayesiana" stroke="none" fill={`url(#${CC.bayBandGradient})`} legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    <Area connectNulls type="monotoneX" dataKey="Futuro Provável" name="_shadow_projection" fill={`url(#${CC.projectionPurpleGradient})`} stroke="none" legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    
                    {showGainArea && <Area connectNulls type="monotoneX" dataKey="Futuro Provável" name="Ganho Estimado" fill="#10b981" fillOpacity={0.08} stroke="#10b981" strokeWidth={1} strokeOpacity={0.2} legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" baseValue={gainBase} />}
                    <Area type="monotoneX" dataKey="Cenário Range" name="Intervalo de Confiança MC" fill={`url(#${CC.cloudGradient})`} stroke="none" legendType="none" isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out" />
                    
                    {/* Bottom Layer: Glow for Nível Bayesiano */}
                    <Area type="monotoneX" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={8} strokeOpacity={0.25} fill="none" activeDot={false} legendType="none" connectNulls isAnimationActive={false} />
                    {/* Top Layer: Nível Bayesiano */}
                    <Area type="monotoneX" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={4}
                        strokeLinecap="round" strokeLinejoin="round"
                        fill={`url(#${CC.greenGradient})`} dot={{ r: 3, fill: '#0f172a', stroke: '#34d399', strokeWidth: 1.5 }}
                        activeDot={<CustomActiveDot fill="#34d399" />} connectNulls isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'bay', '#34d399')} />
                    </Area>
                    
                    <Line connectNulls type="monotoneX" dataKey="Nota Bruta" stroke="#fb923c" strokeWidth={3}
                        strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" 
                        dot={{ r: 3, fill: '#0f172a', stroke: '#fb923c', strokeWidth: 1.5 }} activeDot={<CustomActiveDot fill="#fb923c" />} strokeOpacity={1} isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'raw', '#fb923c')} />
                    </Line>
                    
                    <Line type="monotoneX" dataKey="Média Histórica" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" dot={false} connectNulls strokeOpacity={0.4} activeDot={<CustomActiveDot fill="#818cf8" />} isAnimationActive={animateSeries} animationDuration={1500} animationEasing="ease-in-out">
                        <LabelList content={(props) => renderLabel(props, 'stats', '#818cf8')} />
                    </Line>
                    
                    <Line connectNulls type="monotoneX" dataKey="Futuro Provável" stroke="#a78bfa" strokeWidth={3}
                        strokeLinecap="round" strokeDasharray="6 4"
                        dot={(props) => {
                            const { cx, cy, index } = props;
                            if (index !== chartData.length - 1) return null;
                            return (
                                <g>
                                    <circle cx={cx} cy={cy} r={5} fill="#a78bfa" stroke="#ffffff" strokeWidth={2} style={{ filter: `url(#${CC.glow})` }}>
                                        <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                                    </circle>
                                    <circle cx={cx} cy={cy} r={8} fill="#a78bfa" opacity="0.3">
                                        <animate attributeName="r" values="7;12;7" dur="2s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                                    </circle>
                                </g>
                            );
                        }}
                        strokeOpacity={1} style={{ filter: `url(#${CC.glow})` }} isAnimationActive={false}>
                        <LabelList content={(props) => renderLabel(props, 'mc', '#a78bfa')} />
                    </Line>

                    <Brush 
                        dataKey="date" 
                        height={30} 
                        stroke="#64748b" 
                        fill="rgba(15, 23, 42, 0.4)" 
                        tickFormatter={(val) => val ? val.split('-').slice(1).reverse().join('/') : ''}
                    />
                </ComposedChart>
                </ResponsiveContainer>
            </ChartFrame>
        </div>
    );
}
```

---

## File: `src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx`
*Linhas: 292 | Tamanho: 17.28 KB*

```javascript
import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell
} from "recharts";
import { normalizeDate } from "../../../utils/dateHelper";
import { getSafeScore, getSyntheticTotal } from "../../../utils/scoreHelper";

const CustomTooltipStyle = {
    backgroundColor: '#0a0f1e',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

export const CriticalTopicsAnalysis = React.memo(({ categories = [], maxScore = 100, minScore = 0 }) => {
    const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

    // Calc time window
    const { startDate, endDate, dateLabel } = useMemo(() => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() - (selectedWeekOffset * 7));

        const start = new Date(end);
        start.setHours(0, 0, 0, 0);
        start.setDate(end.getDate() - 6);

        const format = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

        return {
            startDate: start,
            endDate: end,
            dateLabel: `${format(start)}—${format(end)}`
        };
    }, [selectedWeekOffset]);

    const WEEKS = [
        { label: "SEMANA 4", offset: 4 },
        { label: "SEMANA 3", offset: 3 },
        { label: "SEMANA 2", offset: 2 },
        { label: "SEMANA 1", offset: 1 },
        { label: "SEMANA ATUAL", offset: 0 },
    ];

    const subtopicsData = useMemo(() => {
        if (!categories || !categories.length) return [];
        const topicMap = {};

        categories.forEach(cat => {
            const historyRaw = cat.simuladoStats?.history;
            const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
            if (!history.length) return;

            const recentHistory = history.filter(h => {
                const d = normalizeDate(h.date);
                return d && d >= startDate && d <= endDate;
            });

            const range = Math.max(1e-9, maxScore - minScore);
            for (let i = 0; i < recentHistory.length; i++) {
                const h = recentHistory[i];

                (h.topics || []).forEach(t => {
                    const n = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').trim();
                    if (!n) return;
                    const key = n.toLowerCase();
                    if (!topicMap[key]) topicMap[key] = { name: n, total: 0, correct: 0, criticidade: 0 };

                    let total = parseInt(t.total, 10) || 0;
                    if (total === 0 && t.score != null) {
                        total = getSyntheticTotal(maxScore);
                    } else if (total === 0) {
                        return;
                    }
                    
                    const score = t.score != null ? Number(t.score) : getSafeScore(t, maxScore);
                    // ✅ FIX: Se score é NaN (t.score null E total 0), pular esta entrada
                    if (!Number.isFinite(score)) return;
                    const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
                    
                    const correctCount = (t.isPercentage && t.score != null && total > 0)
                        ? ((normalizedScore - minScore) / range) * total
                        : (t.correct != null ? Number(t.correct) : ((normalizedScore - minScore) / range) * total);

                    // ✅ FIX: Proteger contra NaN propagando para os acumuladores
                    if (!Number.isFinite(correctCount)) return;
                    const safeCorrect = Math.max(0, Math.min(total, correctCount));   // ✅ LOTE-03

                    topicMap[key].total += total;
                    topicMap[key].correct += safeCorrect;
                });
            }
        });

        // Calcular criticidade final consolidada por tópico
        Object.keys(topicMap).forEach(key => {
            const item = topicMap[key];
            const accuracy = item.total > 0 ? item.correct / item.total : 0;
            const erroAbsoluto = item.total - item.correct;
            // Índice de Criticidade Composto: penaliza matérias com baixo rendimento mais pesadamente
            item.criticidade = erroAbsoluto * (1 - accuracy);
        });

        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];
        const result = Object.values(topicMap)
            .filter(d => d.criticidade > 0)
            .sort((a, b) => b.criticidade - a.criticidade);

        return result.slice(0, 15).map((item, i, arr) => {
            const isLong = item.name.length > 20;
            return {
                ...item,
                name: isLong ? item.name.substring(0, 18) + '...' : item.name,
                fullName: item.name,
                value: Math.round(item.criticidade * 10) / 10, // Arredondar para 1 casa decimal para o gráfico
                fill: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))]
            };
        });
    }, [categories, startDate, endDate, maxScore, minScore]);

    const pointLeakageData = useMemo(() => {
        if (!categories || !categories.length) return [];
        let totalCriticidade = 0;
        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];

        const rawData = categories.map(cat => {
            let total = 0;
            let correct = 0;
            const historyRaw = cat.simuladoStats?.history;
            const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});

            const recentHistory = history.filter(h => {
                const d = normalizeDate(h.date);
                return d && d >= startDate && d <= endDate;
            });
            const range = Math.max(1e-9, maxScore - minScore);
            for (const h of recentHistory) {
                let t = parseInt(h.total, 10) || 0;
                if (t === 0 && h.score != null) {
                    t = getSyntheticTotal(maxScore);
                } else if (t === 0) {
                    continue;
                }
                
                const score = h.score != null ? Number(h.score) : getSafeScore(h, maxScore);
                const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
                
                const correctCount = (h.isPercentage && h.score != null && t > 0)
                    ? ((normalizedScore - minScore) / range) * t
                    : (h.correct != null ? Number(h.correct) : ((normalizedScore - minScore) / range) * t);
                
                if (!Number.isFinite(correctCount)) continue;
                const safeCorrect = Math.max(0, Math.min(t, correctCount));   // ✅ LOTE-03
                total += t;
                correct += safeCorrect;
            }
            
            const accuracy = total > 0 ? correct / total : 0;
            const erroAbsoluto = total - correct;
            const criticidade = erroAbsoluto * (1 - accuracy);
            
            return { name: cat.name, value: criticidade, errors: erroAbsoluto };
        });

        const data = rawData.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
        data.forEach(d => { totalCriticidade += d.value; });

        return data.slice(0, 10).map((item, i, arr) => {
            const isLong = item.name.length > 20;
            return {
                ...item,
                fullName: item.name,
                name: isLong ? item.name.substring(0, 18) + '...' : item.name,
                color: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / (arr.length > 1 ? arr.length - 1 : 1)) * (PALETTE.length - 1)))],
                percentage: totalCriticidade > 0 ? Math.round((item.value / totalCriticidade) * 100) : 0,
                displayValue: Math.round(item.value * 10) / 10
            };
        });
    }, [categories, startDate, endDate, maxScore, minScore]);

    const weekTitle = WEEKS.find(w => w.offset === selectedWeekOffset)?.label || "SEMANA";

    return (
        <div className="col-span-1 md:col-span-2 pt-6">
            {/* Week Selector Header */}
            <div className="flex flex-col items-center sm:items-end mb-5 pr-1">
                <div className="flex items-center gap-1 sm:gap-2 mb-2 overflow-x-auto max-w-full no-scrollbar py-2 px-1 bg-slate-900/30 rounded-full border border-slate-800/50 shadow-inner">
                    {WEEKS.map((w, idx) => {
                        const isActive = selectedWeekOffset === w.offset;
                        return (
                            <div key={w.label} className="flex items-center">
                                {!isActive && idx !== 0 && idx !== WEEKS.findIndex(ww => ww.offset === selectedWeekOffset) - 1 && <span className="mx-1.5 text-slate-600 font-bold opacity-60">•</span>}
                                <button
                                    onClick={() => setSelectedWeekOffset(w.offset)}
                                    aria-pressed={isActive}   // ✅ LOTE-03
                                    className={`
                                        relative px-3.5 py-1.5 text-[10px] sm:text-xs font-black tracking-widest rounded-full transition-all shrink-0
                                        ${isActive
                                            ? 'bg-gradient-to-r from-[#9d4edd] to-[#7b2cbf] text-white shadow-[0_0_20px_rgba(157,78,221,0.8)] scale-105 border border-purple-400/30 ring-1 ring-purple-500/20'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 shadow-sm'
                                        }
                                    `}
                                >
                                    {w.label}
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 font-mono tracking-widest mr-3 font-bold bg-slate-900/40 px-3 py-1 rounded-md border border-slate-800">{dateLabel}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Matérias Críticas */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all w-full min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{weekTitle}</p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-1 truncate">🩸 Matérias Críticas <span className="text-slate-600 font-normal">({pointLeakageData.length})</span></h3>
                    <p className="text-[9px] sm:text-xs text-slate-500 mb-2 sm:mb-4">Disciplinas com maior Índice de Criticidade (Erros x Ineficiência).</p>
                    <div className="min-h-[220px] sm:min-h-[260px] w-full">
                        {pointLeakageData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, pointLeakageData.length * 36)} minWidth={1}>
                                <BarChart data={pointLeakageData} layout="vertical" margin={{ top: 0, right: 60, left: -10, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} width={80} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(v, n, props) => [`${v} (Índice)`, `${props?.payload?.fullName || 'Matéria'} (${props?.payload?.errors || 0} erros)`]} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <Bar dataKey="displayValue" radius={[0, 6, 6, 0]} barSize={16} minPointSize={4}>
                                        {pointLeakageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        <LabelList dataKey="displayValue" position="right" offset={8}
                                            content={(props) => {
                                                const { x, y, width, value, index } = props;
                                                const entry = pointLeakageData[index];
                                                if (!entry || value === null || value === undefined) return null;
                                                return (
                                                    <text x={x + width + 10} y={y + 9} fill="#ffffff" fontSize={10} fontWeight="bold">
                                                        {value}{entry.percentage > 0 ? ` (${entry.percentage}%)` : ''}
                                                    </text>
                                                );
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
                                <span className="text-4xl mb-3">🎉</span>
                                Nenhum erro registrado neste período!
                            </div>
                        )}
                    </div>
                </div>

                {/* Assuntos Críticos */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all w-full min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 truncate">{weekTitle} · todos os assuntos</p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-1 truncate">📏 Assuntos Críticos <span className="text-slate-600 font-normal">({subtopicsData.length})</span></h3>
                    <p className="text-[9px] sm:text-[11px] text-slate-500 mb-2 sm:mb-4">Tópicos com maior Índice de Criticidade (Erros x Ineficiência).</p>
                    <div className="min-h-[220px] sm:min-h-[260px] w-full">
                        {subtopicsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(220, subtopicsData.length * 36)} minWidth={1}>
                                <BarChart data={subtopicsData} layout="vertical" margin={{ top: 0, right: 60, left: -5, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                    <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} width={85} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(v, n, props) => {
                                        const total = Number(props?.payload?.total) || 0;
                                        const correct = Number(props?.payload?.correct) || 0;
                                        const errors = Math.max(0, total - correct);
                                        return [`${v} (Índice)`, `${props?.payload?.fullName || 'Assunto'} (${errors} erros)`];
                                    }} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} minPointSize={4}>
                                        {subtopicsData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                        <LabelList dataKey="value" position="right" style={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }} offset={8} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
                                <span className="text-4xl mb-3">🎉</span>
                                Nenhum erro registrado neste período!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
```

---

## File: `src/components/charts/EvolutionChart/DisciplinaCard.jsx`
*Linhas: 82 | Tamanho: 5.23 KB*

```javascript
import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';

export const DisciplinaCard = React.memo(function DisciplinaCard({ cat, level, metrics, target, isFocused, onClick, unit = '%', maxScore = 100 }) {
    const safeMax = Math.max(1, Number(maxScore) || 100);   // ✅ LOTE-03
    const val = level || 0;
    const ok = val >= target;
    const mid = val >= target * 0.75;
    const statusColor = ok ? '#22c55e' : mid ? '#f59e0b' : '#ef4444';

    const rawVal = metrics ? metrics[`raw_${cat.id}`] : null;
    const statsVal = metrics ? metrics[`stats_${cat.id}`] : null;
    const bayVal = metrics ? metrics[`bay_${cat.id}`] : null;

    return (
        <button onClick={onClick}
            aria-pressed={isFocused}
            className={`relative text-left w-full rounded-2xl border p-3 sm:p-4 transition-all duration-200 group min-h-[82px] sm:min-h-[105px] flex flex-col justify-between ${isFocused ? 'z-20 border-transparent bg-slate-900/80 shadow-sm' : 'border-slate-800/50 hover:border-slate-700 hover:bg-slate-800/40'}`}
            style={{
                backgroundColor: isFocused ? `${cat.color}10` : 'rgba(15,23,42,0.5)',
                borderColor: isFocused ? cat.color : undefined,
            }}>

            {/* Progress Bar (Bottom) */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-800/60 overflow-hidden">
                <div className="h-full transition-all duration-700" style={{ width: `${(val / safeMax) * 100}%`, backgroundColor: statusColor }} />
            </div>

            <div className="relative z-10 flex items-center justify-end mb-2 w-full">
                <div className={`w-2 h-2 rounded-full transition-all ${isFocused ? 'scale-110' : ''}`} style={{ backgroundColor: statusColor }} />
            </div>

            <div className="relative z-10 flex flex-col justify-end w-full">
                <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-colors line-clamp-1 ${isFocused ? 'text-white' : 'text-slate-400'}`} title={cat.name}>
                    {cat.name}
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-xl sm:text-3xl font-black tracking-tight transition-all ${isFocused ? 'text-white' : 'text-slate-100'}`}>
                        {formatValue(val)}
                    </span>
                    <span className={`text-[8px] sm:text-[10px] font-bold ${isFocused ? 'text-white/70' : 'text-slate-500'}`}>{unit}</span>
                </div>
            </div>

            {/* Extra Metrics Breakdown */}
            <div className="relative z-10 w-full mt-3">
                <div className="flex flex-col gap-2 pt-3 border-t border-slate-700/50">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-[8px] text-slate-300 uppercase tracking-widest font-black">
                            <span>Bruta</span>
                            <span className="text-orange-400 font-mono">{rawVal != null && Number.isFinite(Number(rawVal)) ? formatValue(rawVal) : '—'}{unit}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400" style={{ width: `${rawVal != null && Number.isFinite(Number(rawVal)) ? Math.min(100, Math.max(0, (rawVal / safeMax) * 100)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-[8px] text-slate-300 uppercase tracking-widest font-black">
                            <span>Histórica</span>
                            <span className="text-blue-400 font-mono">{statsVal != null && Number.isFinite(Number(statsVal)) ? formatValue(statsVal) : '—'}{unit}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400" style={{ width: `${statsVal != null && Number.isFinite(Number(statsVal)) ? Math.min(100, Math.max(0, (statsVal / safeMax) * 100)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-[8px] text-slate-300 uppercase tracking-widest font-black">
                            <span>Real</span>
                            <span className="text-emerald-400 font-mono">{bayVal != null && Number.isFinite(Number(bayVal)) ? formatValue(bayVal) : '—'}{unit}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${bayVal != null && Number.isFinite(Number(bayVal)) ? Math.min(100, Math.max(0, (bayVal / safeMax) * 100)) : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

        </button>

    );
});
```

---

## File: `src/components/charts/EvolutionChart/EvolutionLineChart.jsx`
*Linhas: 426 | Tamanho: 20.60 KB*

```javascript
import React, { useId, useState, useRef } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList, Brush
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";
import { ChartFrame } from "../ChartFrame";
import { normalizeDate } from '../../../utils/dateHelper';
import { formatValue } from '../../../utils/scoreHelper';

const CustomActiveDot = (props) => {
    const { cx, cy, fill, stroke, onClick, isDimmed } = props;
    if (cx == null || cy == null) return null;
    return (
        <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', pointerEvents: 'all' }}>
            {!isDimmed && (
                <>
                    <circle cx={cx} cy={cy} r={12} fill={fill} opacity={0.3}>
                        <animate attributeName="r" from="6" to="16" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={cx} cy={cy} r={5} fill={fill} stroke={stroke || "#ffffff"} strokeWidth={2} />
                </>
            )}
            {/* Dimmed dot - no glow, just a static smaller dot */}
            {isDimmed && (
                <>
                    <circle cx={cx} cy={cy} r={4} fill={fill} opacity={0.5} stroke={stroke || "#ffffff"} strokeWidth={1} strokeOpacity={0.5} />
                    {/* Invisible larger target for easy clicking when dimmed */}
                    <circle cx={cx} cy={cy} r={15} fill="rgba(255,255,255,0.01)" stroke="transparent" />
                </>
            )}
        </g>
    );
};

/**
 * EvolutionLineChart
 * 
 * A premium analytical chart showing performance evolution with Bayesian confidence bands,
 * focus highlighting, and adaptive label anti-collision.
 */
export function EvolutionLineChart({
    filteredChartData,
    activeCategories,
    engine,
    targetScore,
    focusSubjectId,
    showOnlyFocus,
    minScore = 0,
    maxScore = 100,
    unit = '%'
}) {
    const instanceId = useId().replace(/:/g, "");
    const shadowId = `el_lineShadow_${instanceId}`;

    const [highlightedDataKey, setHighlightedDataKey] = useState(null);
    const isLineClicked = useRef(false);

    const handleLegendClick = (e) => {
        // Find the category ID from the clicked legend item (it usually passes payload)
        let catId = e?.payload?.id || e?.id;
        if (!catId && e?.dataKey) catId = String(e.dataKey).replace(/^(raw|bay|bay_ci_low|bay_ci_high)_/, '');
        if (!catId && e?.payload?.dataKey) catId = String(e.payload.dataKey).replace(/^(raw|bay|bay_ci_low|bay_ci_high)_/, '');
        
        if (catId) {
            isLineClicked.current = true;
            setHighlightedDataKey(prev => prev === catId ? null : catId);
            setTimeout(() => { isLineClicked.current = false; }, 50);
        }
    };



    // Refined chart data with defensive sorting and date normalization
    const enhancedChartData = React.useMemo(() => {
        if (!filteredChartData || !filteredChartData.length) return [];
        
        // BUG-Z1 FIX: Defensive sort to prevent zig-zag lines if data is unordered
        const sortedData = [...filteredChartData].sort((a, b) => {
            const dateA = a.date ? (normalizeDate(a.date)?.getTime() ?? 0) : 0;
            const dateB = b.date ? (normalizeDate(b.date)?.getTime() ?? 0) : 0;
            return dateA - dateB;
        });

        return sortedData.map(d => {
            const copy = { ...d };
            activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
                const low = d[`bay_ci_low_${cat.id}`];
                const high = d[`bay_ci_high_${cat.id}`];
                if (low != null && high != null) {
                    copy[`band_${cat.id}`] = [low, high];
                }
            });
            // Fallback defensivo para o eixo X (BUG-T1 Fix)
            copy.displayDate = copy.displayDate || copy.date;
            return copy;
        });
    }, [filteredChartData, activeCategories, showOnlyFocus, focusSubjectId]);

    // Gather final points for label positioning
    const finalPoints = React.useMemo(() => {
        if (!enhancedChartData.length) return [];
        const pts = [];
        const lastIndex = enhancedChartData.length - 1;
        
        activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
            const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
            const lastVal = enhancedChartData[lastIndex]?.[dataKey];
            if (lastVal != null && Number.isFinite(Number(lastVal))) {
                pts.push({ id: cat.id, name: cat.name, value: Number(lastVal), color: cat.color });
            }
        });
        // Sort by value descending (highest values first)
        return pts.sort((a, b) => b.value - a.value);
    }, [enhancedChartData, activeCategories, showOnlyFocus, focusSubjectId, engine]);

    // Adaptive label collision logic (Hardened for variable score scales)
    const yAdjustedMap = React.useMemo(() => {
        if (!finalPoints.length) return {};

        const range = maxScore - minScore;
        const labels = finalPoints.map(p => ({ ...p, yPos: Number(p.value) || 0 }));
        
        const topLimit = maxScore - (range * 0.02);
        const bottomLimit = minScore + (range * 0.05);
        const safeSpace = Math.max(0.1, topLimit - bottomLimit);
        
        const MIN_PCT_DISTANCE = range * 0.075; // 7.5% distance threshold
        const requiredSpace = (labels.length - 1) * MIN_PCT_DISTANCE;
        
        // Dynamic compression if too many labels for the space
        const effectiveDistance = requiredSpace > safeSpace 
            ? safeSpace / Math.max(1, labels.length - 1) 
            : MIN_PCT_DISTANCE;

        // Iterative relaxation algorithm to spread out colliding labels
        const ITERATIONS = 15;
        for (let iter = 0; iter < ITERATIONS; iter++) {
            let overlapFound = false;
            for (let i = 0; i < labels.length - 1; i++) {
                const l1 = labels[i];
                const l2 = labels[i + 1];
                const diff = l1.yPos - l2.yPos; // Expect l1 > l2 since they are sorted descending
                
                if (diff < effectiveDistance) {
                    overlapFound = true;
                    const adjustment = (effectiveDistance - diff) / 2;
                    l1.yPos += adjustment;
                    l2.yPos -= adjustment;
                }
            }
            
            // Apply boundary constraints gently (shift all to maintain separation)
            if (labels.length > 0 && labels[0].yPos > topLimit) {
                const diff = labels[0].yPos - topLimit;
                labels.forEach(l => l.yPos -= diff);
            }
            
            if (labels.length > 0 && labels[labels.length - 1].yPos < bottomLimit) {
                const diff = bottomLimit - labels[labels.length - 1].yPos;
                labels.forEach(l => l.yPos += diff);
            }
            
            if (!overlapFound) break;
        }

        // Force strict limits one last time for safety
        for (let i = 0; i < labels.length; i++) {
            if (labels[i].yPos > topLimit) labels[i].yPos = topLimit;
            if (labels[i].yPos < bottomLimit) labels[i].yPos = bottomLimit;
        }

        const map = {};
        labels.forEach(p => { map[p.id] = p.yPos; });
        return map;
    }, [finalPoints, maxScore, minScore]);

    const renderCustomLabel = (props, catId, displayColor, isFocused, hasFocus) => {
        const { x, y, index, value, viewBox } = props;

        if (hasFocus && !isFocused) return null;

        if (index === enhancedChartData.length - 1 && value != null) {   // ✅ LOTE-03
            let offsetPx = 0;
            const adjustedY = yAdjustedMap[catId];

            if (adjustedY !== undefined && adjustedY !== value) {
                const range = maxScore - minScore;
                const pxPerPct = (viewBox?.height > 0) ? viewBox.height / (range || 1) : 2.5;
                offsetPx = (value - adjustedY) * pxPerPct;
            }

            return (
                <g style={{ zIndex: 100, transition: 'all 0.3s ease' }}>
                    <rect
                        x={x + 8}
                        y={y - 11 + offsetPx}
                        width={46}
                        height={22}
                        rx={6}
                        fill="#020617"
                        fillOpacity={0.7}
                        stroke={displayColor}
                        strokeOpacity={0.9}
                        strokeWidth={1.5}
                    />
                    <text 
                        x={x + 31} 
                        y={y + 4 + offsetPx} 
                        fill="#ffffff" 
                        fontSize={11} 
                        fontWeight="black" 
                        textAnchor="middle"
                        style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
                    >
                        {formatValue(value)}{unit}
                    </text>
                </g>
            );
        }
        return null;
    };

    return (
        <div className="relative h-[360px] sm:h-[460px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300">
            {highlightedDataKey && (
                <button 
                    type="button" 
                    onClick={() => setHighlightedDataKey(null)}
                    className="absolute top-0 right-4 z-10 flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:border-slate-500 text-slate-300 text-[10px] font-bold rounded-lg shadow-lg transition-all"
                >
                    <span>👁️</span> Mostrar Todos
                </button>
            )}
            <ChartFrame minHeight={360} label="Traçando evolução">
                <ResponsiveContainer width="100%" height="100%" minHeight={360} className="outline-none focus:outline-none focus:ring-0" minWidth={1}>
                <ComposedChart 
                    data={enhancedChartData} 
                    syncId="evolutionSync"
                    margin={{ top: 20, right: 110, left: 0, bottom: 20 }} 
                    style={{ outline: 'none', cursor: highlightedDataKey ? 'pointer' : 'default' }} 
                    tabIndex="-1"
                    onClick={() => {
                        if (highlightedDataKey && !isLineClicked.current) {
                            setHighlightedDataKey(null);
                        }
                    }}
                >
                    <defs>
                        {activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).map((cat) => {
                            const displayColor = cat.color || '#3b82f6';
                            return (
                            <React.Fragment key={`defs_${cat.id}`}>
                                <linearGradient id={`grad_${cat.id}_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={displayColor} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={displayColor} stopOpacity={0.01} />
                                </linearGradient>
                                <linearGradient id={`bayBand_${cat.id}_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={displayColor} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={displayColor} stopOpacity={0.02} />
                                </linearGradient>
                            </React.Fragment>
                            );
                        })}
                        <filter id={shadowId} height="200%">
                            {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                        </filter>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" vertical={false} />

                    <XAxis
                        dataKey="date"
                        tickFormatter={(val) => {
                            if (!val) return '';
                            const parts = String(val).split('-');
                            return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
                        }}
                        tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                        dy={10}
                        axisLine={{ stroke: '#334155', strokeWidth: 1 }}
                        tickLine={false}
                        minTickGap={30}
                        padding={{ left: 10, right: 5 }}
                    />

                    <YAxis
                        tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                        dx={-4}
                        axisLine={{ stroke: '#334155', strokeWidth: 1 }}
                        tickLine={false}
                        domain={[minScore, maxScore]}
                        allowDataOverflow={false}
                        tickFormatter={(v) => `${formatValue(v)}${unit}`}
                        width={40}
                    />

                    <ReferenceLine 
                        y={targetScore} 
                        stroke="#10b981" 
                        strokeOpacity={0.6} 
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        label={{ 
                            value: `Meta ${targetScore}${unit}`, 
                            fill: '#22c55e', 
                            fontSize: 10, 
                            position: 'insideBottomLeft', 
                            dy: -4, 
                            dx: 5 
                        }} 
                    />

                    <Tooltip 
                        offset={150}
                        cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '2 2' }}
                        content={(props) => <ChartTooltip {...props} chartData={enhancedChartData} isCompare={false} unit={unit} />} 
                    />

                    <Legend 
                        verticalAlign="top" 
                        height={28}
                        iconSize={6}
                        onClick={handleLegendClick}
                        wrapperStyle={{ fontSize: '9px', color: '#64748b', fontWeight: 600, paddingBottom: '6px', cursor: 'pointer' }} 
                    />

                    {activeCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).flatMap((cat) => {
                        const dataKey = engine?.prefix ? `${engine.prefix}${cat.id}` : `raw_${cat.id}`;
                        const lineType = engine?.style || 'linear';
                        // Determine focus state based on category ID rather than dataKey to survive engine changes
                        const isLegendHighlighted = highlightedDataKey === cat.id;
                        const isAnyHighlighted = !!highlightedDataKey;

                        const isFocused = showOnlyFocus ? (focusSubjectId === cat.id) : isLegendHighlighted;
                        const hasFocus = showOnlyFocus ? !!focusSubjectId : isAnyHighlighted;
                        
                        let displayColor = cat.color || '#3b82f6';
                        if (isLegendHighlighted) {
                            displayColor = '#fbbf24'; // Vivid amber/gold highlight
                        }

                        const lineOpacity = hasFocus ? (isFocused ? 1 : 0.4) : 0.8;
                        const lineWidth = hasFocus ? (isFocused ? 3.5 : 1.5) : 2;

                        return [
                            // Bayesian Confidence Interval Band
                            (isFocused && engine?.id === 'bayesian') ? (
                                <Area connectNulls key={`bay_ci_${cat.id}`} type={lineType}
                                    dataKey={`band_${cat.id}`}
                                    name="_IC 95%" stroke="none"
                                    fill={`url(#bayBand_${cat.id}_${instanceId})`} legendType="none"
                                    isAnimationActive={false}
                                />
                            ) : null,
                            // Background Gradient Area for Focused Line
                            isFocused ? (
                                <Area connectNulls key={`area_${cat.id}`} type={lineType} dataKey={dataKey} name={`_area_${cat.id}`} stroke="none"
                                    fill={`url(#grad_${cat.id}_${instanceId})`} legendType="none" />
                            ) : null,
                            // Bottom layer: Glow effect (thicker, transparent line)
                            <Line connectNulls 
                                key={`glow_${cat.id}`} 
                                type={lineType} 
                                dataKey={dataKey} 
                                name={`_glow_${cat.name}`}
                                stroke={displayColor} 
                                strokeWidth={lineWidth + 4}
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                strokeOpacity={(isFocused || !hasFocus) ? lineOpacity * 0.3 : 0}
                                dot={false}
                                activeDot={false}
                                legendType="none"
                                isAnimationActive={false}
                            />,
                            // Top layer: The Performance Evolution Line
                            <Line connectNulls 
                                key={cat.id} 
                                id={cat.id}
                                type={lineType} 
                                dataKey={dataKey} 
                                name={cat.name}
                                stroke={displayColor} 
                                strokeWidth={lineWidth}
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                strokeOpacity={lineOpacity}
                                dot={{ r: 3, strokeWidth: 1.5, stroke: displayColor, fill: '#0f172a', strokeOpacity: lineOpacity, fillOpacity: lineOpacity }}
                                activeDot={<CustomActiveDot fill={displayColor} stroke="#ffffff" isDimmed={hasFocus && !isFocused} onClick={(e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    isLineClicked.current = true;
                                    setHighlightedDataKey(cat.id);
                                    setTimeout(() => { isLineClicked.current = false; }, 50);
                                }} />}
                                style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                                isAnimationActive={false}
                                onClick={(props, e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    if (props && props.nativeEvent && props.nativeEvent.stopPropagation) props.nativeEvent.stopPropagation();
                                    isLineClicked.current = true;
                                    setHighlightedDataKey(cat.id);
                                    setTimeout(() => { isLineClicked.current = false; }, 50);
                                }}
                            >
                                <LabelList content={(props) => renderCustomLabel(props, cat.id, displayColor, isFocused, hasFocus)} />
                            </Line>
                        ];
                    })}

                    <Brush 
                        dataKey="date" 
                        height={30} 
                        stroke="#64748b" 
                        fill="rgba(15, 23, 42, 0.4)" 
                        tickFormatter={(val) => val ? val.split('-').slice(1).reverse().join('/') : ''}
                    />
                </ComposedChart>
                </ResponsiveContainer>
            </ChartFrame>
        </div>
    );
}
```

---

## File: `src/components/charts/EvolutionChart/KpiCard.jsx`
*Linhas: 25 | Tamanho: 1.53 KB*

```javascript
import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';

export const KpiCard = React.memo(function KpiCard({ value, label, color, icon, sub }) {
    const safeSub = sub != null ? Number(sub) : Number.NaN;   // ✅ LOTE-03
    return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-4 sm:p-5 group hover:border-slate-600 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xl sm:text-2xl">
                    {icon}
                </div>
                {Number.isFinite(safeSub) && (
                    <span className={`text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${safeSub === 0 ? 'bg-slate-800/50 text-slate-400 border-slate-700' : safeSub > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                        {safeSub === 0 ? '—' : safeSub > 0 ? `+${formatValue(safeSub)}` : formatValue(safeSub)}
                    </span>
                )}
            </div>
            <div>
                <p className="text-2xl sm:text-4xl font-mono font-black tracking-tighter truncate" style={{ color }}>{value}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-[0.15em] mt-1 font-semibold">{label}</p>
            </div>
        </div>
    );
});
```

---

## File: `src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx`
*Linhas: 429 | Tamanho: 26.91 KB*

```javascript
import React, { useMemo, useId, useState, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine
} from 'recharts';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDuration, normalizeDate } from '../../../utils/dateHelper';
import { formatValue, formatPercent } from '../../../utils/scoreHelper';
import { applyScenarioAdjustments, classifyScenarioSignal } from '../../../utils/monteCarloScenario.js';

const MonteCarloTooltip = React.memo(({ active, payload, unit, targetScore, maxScore, minScore }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        const fullDate = dataPoint.fullDate;

        // Operador de coalescência nula garante falhas seguras e respeita o piso (minScore)
        const pointTarget = Math.max(minScore, Math.min(maxScore, (dataPoint.target === null || dataPoint.target === undefined || dataPoint.target === '') ? targetScore : (Number.isFinite(Number(dataPoint.target)) ? Number(dataPoint.target) : targetScore)));
        const pointMean = Math.max(minScore, Math.min(maxScore, (dataPoint.mean === null || dataPoint.mean === undefined || dataPoint.mean === '') ? minScore : (Number.isFinite(Number(dataPoint.mean)) ? Number(dataPoint.mean) : minScore)));
        const pointProb = Math.max(0, Math.min(100, (dataPoint.probability === null || dataPoint.probability === undefined || dataPoint.probability === '') ? 0 : (Number.isFinite(Number(dataPoint.probability)) ? Number(dataPoint.probability) : 0)));
        const pointLow = dataPoint.ciRange?.[0] ?? pointMean;
        const pointHigh = dataPoint.ciRange?.[1] ?? pointMean;

        const isGood = pointMean >= pointTarget;

        return (
            <div className="bg-slate-950/80 border border-white/10 p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl min-w-[210px]">
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3 border-b border-white/10 pb-2">{fullDate}</p>

                <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Nota Projetada</span>
                        <span className={`text-3xl font-black leading-none ${isGood ? 'text-green-400' : 'text-blue-400'}`}>
                            {unit === 'horas' ? formatDuration(pointMean) : unit === '%' ? formatValue(pointMean) : pointMean} <span className="text-sm text-slate-500 ml-1">{unit}</span>
                        </span>
                    </div>
                    <div className="mt-2 bg-black/40 rounded-lg border border-white/5 p-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-400">Hoje:</span>
                            <span className="text-[10px] font-mono text-white">
                                {unit === 'horas' ? formatDuration(pointMean) : `${formatValue(pointMean)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-indigo-400">Projeção:</span>
                            <span className="text-[10px] font-mono text-indigo-300">
                                {unit === 'horas' ? formatDuration(dataPoint.projectedMean) : `${formatValue(dataPoint.projectedMean)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-1 border-t border-white/5 pt-1 mt-1">
                            <span className="text-[10px] font-bold text-slate-400">Cone (95% CI):</span>
                            <span className="text-[10px] font-mono text-white">
                                {unit === 'horas' ? `${formatDuration(pointLow)} ~ ${formatDuration(pointHigh)}` : `${formatValue(pointLow)}${unit} ~ ${formatValue(pointHigh)}${unit}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400">Chance de Sucesso:</span>
                            <span className={`text-[10px] font-black ${pointProb >= 70 ? 'text-green-400' : 'text-blue-400'}`}>
                                {formatPercent(pointProb)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
});

const SCENARIO_OPTIONS = [
    { id: 'conservative', label: 'Conserv.', fullLabel: 'Conservador' },
    { id: 'base', label: 'Base', fullLabel: 'Base' },
    { id: 'optimistic', label: 'Otim.', fullLabel: 'Otimista' },
];

/**
 * MonteCarloEvolutionChart
 * 
 * Visualizes the trajectory of projected scores and success probabilities over time.
 * Hardened to support non-zero scoring floors (minScore) and preventing Y-axis overshoot.
 */
export const MonteCarloEvolutionChart = ({ 
    data = [], 
    targetScore = 75, 
    unit = 'pts', 
    minScore = 0, 
    maxScore = 100 
}) => {
    const rawId = useId();
    const gradientId = `colorMonteCarlo-${rawId.replace(/:/g, '')}`;
    const [scenario, setScenario] = useState('base');
    const scenarioLabels = useMemo(() => Object.fromEntries(SCENARIO_OPTIONS.map(opt => [opt.id, opt.fullLabel])), []);

    // ✅ LOTE-02 FIX: ReferenceArea com y1 > maxScore é inválido; meta deve viver no domínio
    const safeTargetScore = useMemo(() => {
        const t = Number(targetScore);
        return Math.max(minScore, Math.min(maxScore, Number.isFinite(t) ? t : minScore));
    }, [targetScore, minScore, maxScore]);

    const targetOffset = useMemo(() => {
        const range = maxScore - minScore;
        if (range <= 0) return 0;
        const pct = 1 - (safeTargetScore - minScore) / range;
        return Math.max(0, Math.min(1, pct));
    }, [safeTargetScore, maxScore, minScore]);

    const formattedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data
            .filter(d => d?.date)
            .map(d => ({ ...d, parsedDate: normalizeDate(d.date) }))
            .filter(d => isValid(d.parsedDate))
            .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
            .map(d => {
                let displayDate = d.date;
                let fullDate = d.date;

                displayDate = format(d.parsedDate, 'dd/MM', { locale: ptBR });
                fullDate = format(d.parsedDate, 'dd MMM yyyy', { locale: ptBR });

                // Sanitização: manter intervalo de confiança dentro do domínio e com ordem válida
                const meanRaw = (d.mean === null || d.mean === undefined || d.mean === '') ? minScore : (Number.isFinite(Number(d.mean)) ? Number(d.mean) : minScore);
                const mean = Math.max(minScore, Math.min(maxScore, meanRaw));
                const rawLow = (d.ci95Low === null || d.ci95Low === undefined || d.ci95Low === '') ? mean : (Number.isFinite(Number(d.ci95Low)) ? Number(d.ci95Low) : mean);
                const rawHigh = (d.ci95High === null || d.ci95High === undefined || d.ci95High === '') ? mean : (Number.isFinite(Number(d.ci95High)) ? Number(d.ci95High) : mean);
                const boundedLow = Math.max(minScore, Math.min(maxScore, rawLow));
                const boundedHigh = Math.max(minScore, Math.min(maxScore, rawHigh));
                const low = Math.min(boundedLow, boundedHigh);
                const high = Math.max(boundedLow, boundedHigh);

                return {
                    ...d,
                    displayDate,
                    fullDate,
                    mean,
                    projectedMean: (d.projectedMean === null || d.projectedMean === undefined || d.projectedMean === '') ? mean : (Number.isFinite(Number(d.projectedMean)) ? Math.max(minScore, Math.min(maxScore, Number(d.projectedMean))) : mean),
                    probability: Math.max(0, Math.min(100, (d.probability === null || d.probability === undefined || d.probability === '') ? 0 : (Number.isFinite(Number(d.probability)) ? Number(d.probability) : 0))),
                    ciRange: [low, high]
                };
            });
    }, [data, minScore, maxScore]);


    const scenarioAdjustedData = useMemo(
        () => applyScenarioAdjustments(formattedData, scenario, maxScore, minScore),
        [formattedData, scenario, maxScore, minScore]
    );
    const qualitySignal = useMemo(() => classifyScenarioSignal(scenarioAdjustedData, maxScore, minScore), [scenarioAdjustedData, maxScore, minScore]);

    const mcAssumptions = useMemo(() => {
        if (!scenarioAdjustedData.length) return null;
        const latest = scenarioAdjustedData[scenarioAdjustedData.length - 1];
        const width = Math.max(0, Number(latest?.ciRange?.[1] ?? 0) - Number(latest?.ciRange?.[0] ?? 0));
        return {
            points: scenarioAdjustedData.length,
            ciWidth: width,
            scenario: scenarioLabels[scenario] || scenario,
        };
    }, [scenarioAdjustedData, scenario, scenarioLabels]);



    // M1 FIX: Callback estável para o Tooltip — arrow function inline criaria nova referência
    // a cada render, quebrando a memoização do Recharts e causando re-renders desnecessários.
    const renderTooltip = useCallback(
        (props) => <MonteCarloTooltip {...props} unit={unit} targetScore={safeTargetScore} maxScore={maxScore} minScore={minScore} />,
        [unit, safeTargetScore, maxScore, minScore]
    );

    if (formattedData.length === 0) {
        return (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-slate-950/40 rounded-2xl border border-white/5 p-6 overflow-hidden relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <AlertCircle size={32} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-black text-slate-200 mb-2 uppercase tracking-widest text-center">Nenhum Ponto Registrado</h3>
                <p className="text-xs text-slate-400 text-center max-w-sm mb-6 leading-relaxed">
                    A evolução do Monte Carlo é registrada gradativamente a cada vez que o motor calcula as projeções diárias. Aguarde o primeiro registro de hoje!
                </p>
                {/* 🎯 FIX: Ajustado h-32 para h-40 para que o minHeight=150 não estoure as bordas do pai */}
                <div className="w-full max-w-md h-40 opacity-20 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%" minWidth={120} minHeight={150}>
                        <AreaChart data={[
                            { date: '1', mean: minScore + (maxScore - minScore) * 0.4 }, 
                            { date: '2', mean: minScore + (maxScore - minScore) * 0.6 }, 
                            { date: '3', mean: minScore + (maxScore - minScore) * 0.85 }
                        ]}>
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={[minScore, maxScore]} />
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="#60a5fa" strokeWidth={3} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-[400px] flex flex-col py-4 mt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-2 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                        <TrendingUp size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-200 uppercase tracking-widest">Evolução da Projeção</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trajetória de Notas e Incerteza</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700/50 rounded-2xl p-1 shadow-inner backdrop-blur-sm">
                    {SCENARIO_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setScenario(opt.id)}
                            aria-label={`Selecionar cenário ${opt.fullLabel}`}
                            aria-pressed={scenario === opt.id}
                            className={`relative px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all duration-150 rounded-2xl will-change-transform ${scenario === opt.id ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 hover:scale-[1.01]'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/40 border border-white/5">
                        <Target size={12} className="text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Meta: <strong className="text-white">{unit === 'horas' ? formatDuration(safeTargetScore) : unit === '%' ? formatValue(safeTargetScore) : safeTargetScore} {unit}</strong>
                            <small className="text-slate-500 ml-1">({scenarioLabels[scenario]})</small>
                        </span>
                    </div>
                    {qualitySignal && (
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md border ${qualitySignal.color}`}>
                            {qualitySignal.label}
                        </span>
                    )}
                </div>
            </div>

            {mcAssumptions && (
                <div className="px-2 mb-2">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">
                        Hipóteses do Modelo ({mcAssumptions.scenario}): <span className="text-slate-300 font-bold">N={mcAssumptions.points}</span> · CI95 largura atual <span className="text-slate-300 font-bold">{unit === 'horas' ? formatDuration(mcAssumptions.ciWidth) : `${formatValue(mcAssumptions.ciWidth)}${unit}`}</span>
                    </p>
                </div>
            )}

            <div className="w-full relative h-[360px] flex items-center justify-center">
                {formattedData.length === 1 && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-md rounded-xl text-center p-6 border border-white/5">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                            <TrendingUp size={32} className="text-blue-500/60" />
                        </div>
                        <p className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Ponto Único Registrado</p>
                        <p className="text-[10px] text-slate-500 mt-2 max-w-[200px] leading-relaxed">
                            Aguardando o próximo registro para traçar a evolução.
                            <br /><strong className="text-blue-400"> Nota Atual: {unit === 'horas' ? formatDuration(scenarioAdjustedData[0]?.mean ?? minScore) : unit === '%' ? formatValue(scenarioAdjustedData[0]?.mean ?? minScore) : scenarioAdjustedData[0]?.mean ?? minScore} {unit}</strong>
                        </p>
                    </div>
                )}

                {formattedData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={300}>
                        {/* 🎯 FIX: margin right de 10 -> 30 para evitar que a última data seja mastigada pelo limite do componente */}
                        <AreaChart
                            data={scenarioAdjustedData}
                            margin={{ top: 20, right: 30, left: -15, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={0} stopColor="#10b981" stopOpacity={0.35} />
                                    <stop offset={targetOffset} stopColor="#10b981" stopOpacity={0.05} />
                                    <stop offset={targetOffset} stopColor="#60a5fa" stopOpacity={0.25} />
                                    <stop offset={1} stopColor="#60a5fa" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id={`targetGlow-${rawId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={0} stopColor="#10b981" stopOpacity={0.12} />
                                    <stop offset={1} stopColor="#10b981" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" vertical={false} />
                            
                            {/* Glowing Target Zone */}
                            <ReferenceArea y1={safeTargetScore} y2={maxScore} fill={`url(#targetGlow-${rawId})`} />
                            <ReferenceLine 
                                y={safeTargetScore} 
                                stroke="#10b981" 
                                strokeDasharray="4 2" 
                                strokeWidth={1.5}
                                label={{ value: `Meta`, fill: '#10b981', fontSize: 9, position: 'insideTopLeft', dy: 2 }}
                            />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => {
                                    if (!val) return '';
                                    const parts = val.split('-');
                                    if (parts.length === 3) {
                                        return `${parts[2]}/${parts[1]}`;
                                    }
                                    return val;
                                }}
                                stroke="#475569"
                                fontSize={9}
                                fontWeight={500}
                                tickLine={false}
                                axisLine={{ stroke: '#334155' }}
                                dy={8}
                                minTickGap={20}
                            />
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
                            <Tooltip
                                offset={200}
                                content={renderTooltip}
                                cursor={{ stroke: '#ffffff33', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />

                            <Area connectNulls
                                type="linear" 
                                dataKey="ciRange"
                                stroke="none"
                                fillOpacity={1}
                                fill={`url(#${gradientId})`}
                                isAnimationActive={false}
                            />

                            <Area connectNulls
                                type="monotoneX"
                                dataKey="mean"
                                stroke="#60a5fa"
                                strokeWidth={3}
                                fill="none"
                                activeDot={{ r: 5, strokeWidth: 2, fill: '#60a5fa', stroke: '#ffffff', className: "animate-pulse shadow-lg" }}
                                dot={scenarioAdjustedData.length < 40 ? { 
                                    r: Math.max(1.5, 4 - (scenarioAdjustedData.length / 12)), 
                                    strokeWidth: 1.5, 
                                    fill: '#0f172a', 
                                    stroke: '#60a5fa' 
                                } : false}
                                isAnimationActive={false}
                            />

                            <Area connectNulls
                                type="monotoneX"
                                dataKey="projectedMean"
                                stroke="#818cf8"
                                strokeWidth={2}
                                strokeDasharray="6 4"
                                fill="none"
                                isAnimationActive={false}
                                dot={false}
                                activeDot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : scenarioAdjustedData.length === 0 ? null : (
                    <div className="w-full h-full opacity-10 pointer-events-none blur-sm">
                    <ResponsiveContainer width="100%" height="100%" minHeight={150} minWidth={1}>
                        <AreaChart data={[{ mean: minScore }, { mean: scenarioAdjustedData[0]?.mean ?? minScore }, { mean: minScore }]}>
                            <YAxis hide domain={[minScore, maxScore]} />
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="#60a5fa" />
                        </AreaChart>
                    </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="mt-4 flex flex-col gap-2 px-2">
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                    <p className="text-xs font-bold text-blue-400 mb-1 flex items-center gap-2">
                        <AlertCircle size={14} /> Entenda este gráfico
                    </p>
                    <div className="flex flex-col gap-3 mt-2">
                        <div className="flex items-start gap-3 bg-blue-500/10 p-3 rounded-lg border-l-4 border-blue-400 border-y border-r border-blue-500/20">
                            <p className="text-[11.5px] text-blue-100 leading-relaxed">
                                <strong className="text-blue-400 text-xs tracking-wide uppercase">Linha Azul (O Seu Passado):</strong> Mostra a sua evolução real. Atenção: este gráfico <strong>não mostra as notas dos seus simulados</strong>. Ele mostra qual era a <strong>previsão da sua nota no dia da prova</strong> a cada dia que passou. Se a linha está subindo, você está ficando mais preparado.
                            </p>
                        </div>
                        
                        <div className="flex items-start gap-3 bg-indigo-500/10 p-3 rounded-lg border-l-4 border-indigo-400 border-dashed border-y border-r border-indigo-500/20">
                            <p className="text-[11.5px] text-indigo-100 leading-relaxed">
                                <strong className="text-indigo-400 text-xs tracking-wide uppercase">Linha Tracejada Roxa (O Seu Futuro):</strong> É para onde você está indo. O robô pega o seu ritmo atual e desenha onde a sua nota vai parar no dia da prova se você continuar estudando desse jeito. 
                            </p>
                        </div>

                        <div className="flex items-start gap-3 bg-emerald-500/10 p-3 rounded-lg border-l-4 border-emerald-400 border-dashed border-y border-r border-emerald-500/20">
                            <p className="text-[11.5px] text-emerald-100 leading-relaxed">
                                <strong className="text-emerald-400 text-xs tracking-wide uppercase">Linha Pontilhada Verde (O Seu Objetivo):</strong> A nota que você quer tirar. O jogo é simples: faça a linha azul e a roxa ultrapassarem essa marca verde.
                            </p>
                        </div>
                    </div>
                </div>
                {qualitySignal && qualitySignal.color.includes('red') && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mt-1 animate-pulse">
                        <p className="text-xs font-bold text-red-400 mb-1 flex items-center gap-2">
                            <AlertCircle size={14} /> Alerta de Tendência
                        </p>
                        <p className="text-[11px] text-red-200 leading-relaxed">
                            Suas projeções recentes estão apontando para baixo. Isso indica que os seus últimos resultados puxaram a expectativa para o dia da prova para um nível crítico. Considere revisar seus métodos de estudo e focar nos tópicos com pior desempenho.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 pt-3 border-t border-white/5 opacity-50 px-2 gap-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                    A área sombreada representa o IC 95% da projeção (Margem de erro e incerteza probabilística).
                </p>
                <span className="text-[9px] font-bold font-mono text-slate-400 bg-black px-2 py-0.5 rounded-md border border-white/5 whitespace-nowrap">
                    N = {scenarioAdjustedData.length} registros
                </span>
            </div>
        </div>
    );
};
```

---

## File: `src/components/charts/EvolutionChart/PerformanceBarChart.jsx`
*Linhas: 165 | Tamanho: 10.78 KB*

```javascript
import React, { useId } from 'react';
import { formatValue } from '../../../utils/scoreHelper';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList
} from "recharts";
import { ChartFrame } from "../ChartFrame";

export function PerformanceBarChart({ subjectAggData, showOnlyFocus, focusCategory, unit = '%' }) {
    const instanceId = useId().replace(/:/g, "");
    const gradQuestoesId = `pb_gradQuestoes_${instanceId}`;
    const gradAcertosId = `pb_gradAcertos_${instanceId}`;

    const sanitizeCount = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.round(n);
    };

    const safeSubjectAggData = Array.isArray(subjectAggData) ? subjectAggData : [];

    const chartData = safeSubjectAggData.map((d) => {
        const questoes = sanitizeCount(d.questoes);
        const acertosBrutos = sanitizeCount(d.acertos);
        const acertos = Math.min(questoes, acertosBrutos);
        const erros = Math.max(0, questoes - acertos);
        return { ...d, questoes, acertos, erros };
    });
    
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all group w-full min-w-0">
            <div className="flex items-center justify-between mb-3 sm:mb-5 min-w-0">
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Questões Resolvidas vs Acertos</p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 truncate">
                        📊 {showOnlyFocus ? `Desempenho — ${focusCategory?.name}` : "Desempenho por Matéria — Histórico Completo"}
                    </h3>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Acertos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-red-500 inline-block"></span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Erros</span>
                    </div>
                </div>
            </div>
 
            <div className="h-[320px] sm:h-[380px] w-full overflow-x-auto custom-scrollbar pb-2">
                {chartData.length > 0 ? (
                    <div className="min-w-[600px] lg:min-w-full h-full">
                        <ChartFrame minHeight={320} label="Distribuindo desempenho">
                            <ResponsiveContainer width="100%" height="100%" minHeight={320} minWidth={1}>
                            <BarChart
                                data={chartData}
                                margin={{ top: 20, right: 20, left: 10, bottom: 85 }}
                                barCategoryGap="25%"
                            >
                                <defs>
                                    <linearGradient id={gradQuestoesId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.7} />
                                    </linearGradient>
                                    <linearGradient id={gradAcertosId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                                        <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                                
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, width: 80 }}
                                    dy={8}
                                    angle={-35}
                                    textAnchor="end"
                                />
                                
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    width={38}
                                    allowDecimals={false}
                                    label={{ value: 'Questões', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 10, dx: -2 }}
                                />
                                
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 4 }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            const rendPctRaw = d.questoes > 0 ? ((d.acertos / d.questoes) * 100) : 0;
                                            const rendPct = formatValue(rendPctRaw);
                                            return (
                                                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl min-w-[180px]">
                                                    <p className="font-black text-slate-200 mb-2 border-b border-white/5 pb-1.5 text-xs">{d.fullName}</p>
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between items-center gap-4">
                                                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                <span className="w-2 h-2 rounded-sm bg-slate-500 inline-block"></span>
                                                                Total de Questões
                                                            </span>
                                                            <span className="text-[11px] font-black text-slate-300">{d.questoes}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center gap-4">
                                                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block"></span>
                                                                Acertos
                                                            </span>
                                                            <span className="text-[11px] font-black text-emerald-300">{d.acertos}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center gap-4">
                                                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                <span className="w-2 h-2 rounded-sm bg-red-400 inline-block"></span>
                                                                Erros
                                                            </span>
                                                            <span className="text-[11px] font-black text-red-300">{d.erros}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center gap-4 mb-2">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Rendimento</span>
                                                            <span className="text-[11px] font-black text-white">{rendPct}{unit}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                
                                <Bar dataKey="acertos" stackId="a" name="Acertos" fill={`url(#${gradAcertosId})`} isAnimationActive={true} />
                                
                                <Bar dataKey="erros" stackId="a" name="Erros" fill={`url(#${gradQuestoesId})`} radius={[5, 5, 0, 0]} isAnimationActive={true}>
                                    <LabelList 
                                        dataKey="questoes" 
                                        position="top" 
                                        style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                                    />
                                </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                        </ChartFrame>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
                        <span className="text-4xl mb-3">📊</span>
                        Nenhum dado de estudo encontrado.
                    </div>
                )}
            </div>

            <div className="mt-3 px-3 py-2 bg-white/3 rounded-xl border border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 italic">
                    📌 O tamanho total da barra representa o volume de questões. A parte <span className="text-emerald-500 font-bold">verde</span> indica seus acertos e a parte <span className="text-red-500 font-bold">vermelha</span> os erros.
                </p>
            </div>
        </div>
    );
}
```

---

## File: `src/components/charts/EvolutionChart/RadarAnalysis.jsx`
*Linhas: 122 | Tamanho: 6.56 KB*

```javascript
import React, { useId } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend
} from "recharts";
// 🎯 FIX: Importação adicionada
import { formatValue } from '../../../utils/scoreHelper';
import { ChartFrame } from "../ChartFrame";

const CustomTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '13px',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

/**
 * RadarAnalysis
 * 
 * A comprehensive disciplinary cross-section (Raio-X) using a Radar chart.
 * Compares current performance levels against target scores.
 */
export function RadarAnalysis({ radarData, maxScore = 100, minScore = 0, unit = '%' }) {
    const rawId = useId();
    const glowId = `ra_glow-${rawId.replace(/:/g, '')}`;

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-lg hover:border-slate-700 transition-all group flex flex-col h-full">
            <div className="mb-2 sm:mb-4 relative group/tooltip">
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Equilíbrio Geral</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 truncate">🕸️ Raio-X das Disciplinas</h3>
                    <div className="relative flex items-center justify-center w-4 h-4 rounded-full border border-slate-600 text-slate-400 text-[9px] font-bold cursor-help hover:border-slate-300 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                        ?
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 sm:-translate-x-0 sm:left-0 w-[240px] p-3 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-50 pointer-events-none text-left">
                            <p className="text-[11px] text-slate-200 font-normal leading-relaxed normal-case tracking-normal">
                                Este gráfico (Radar) avalia o seu <strong className="text-indigo-400">nível de acertos</strong> em cada matéria, revelando o seu equilíbrio. Quanto mais o desenho se expandir e formar um círculo perfeito, mais forte e constante está o seu conhecimento global.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[260px] sm:min-h-[300px] w-full relative">
                <ChartFrame minHeight={260} label="Calibrando radar">
                    <ResponsiveContainer width="100%" height="100%" minHeight={260} minWidth={1}>
                    <RadarChart cx="50%" cy="50%" outerRadius="55%" data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                        <defs>
                            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                                {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                            </filter>
                        </defs>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 500 }} />
                        
                        {/* FIX: Ocultar o tick do "0" central para manter o gráfico limpo */}
                        <PolarRadiusAxis 
                            angle={30} 
                            domain={[minScore, maxScore]} 
                            tick={{ fill: '#475569', fontSize: 9 }} 
                            tickFormatter={(v) => v === minScore ? '' : v} 
                            axisLine={false} 
                        />

                        {/* Reference Line / Target Radar */}
                        <Radar 
                            name="Meta" 
                            dataKey="meta" 
                            stroke="#22c55e" 
                            strokeDasharray="3 3" 
                            strokeOpacity={0.6} 
                            fill="none" 
                            dot={{ r: 2, fill: '#166534', stroke: '#22c55e', strokeWidth: 1 }} 
                        />

                        {/* Bottom Layer: Glow effect */}
                        <Radar 
                            name="Seu Nível_glow" 
                            dataKey="nivel" 
                            stroke="#6366f1" 
                            strokeWidth={6} 
                            strokeOpacity={0.3}
                            fill="none" 
                            dot={false}
                            activeDot={false}
                            legendType="none"
                        />
                        {/* Top Layer: Actual Performance Radar */}
                        <Radar 
                            name="Seu Nível" 
                            dataKey="nivel" 
                            stroke="#6366f1" 
                            strokeWidth={2.5} 
                            fill="#6366f1" 
                            fillOpacity={0.22} 
                            dot={{ r: 2.5, fill: '#0f172a', stroke: '#6366f1', strokeWidth: 2 }} 
                            activeDot={{ r: 4, fill: '#fff' }} 
                        />

                        {/* 🎯 FIX: Adição do formatValue no formatter do Tooltip */}
                        <Tooltip 
                            formatter={(v) => [`${formatValue(v)}${unit}`, 'Nível']} 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '11px' }} 
                        />
                        <Legend 
                            payload={[
                                { value: 'Meta', type: 'line', id: 'meta', color: '#22c55e' },
                                { value: 'Seu Nível', type: 'line', id: 'nivel', color: '#6366f1' }
                            ]}
                            wrapperStyle={{ fontSize: '10px', paddingTop: '8px', color: '#64748b' }} 
                        />
                    </RadarChart>
                    </ResponsiveContainer>
                </ChartFrame>
            </div>
        </div>
    );
}
```

---

## File: `src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx`
*Linhas: 536 | Tamanho: 28.76 KB*

```javascript
import React, { useMemo, useState, useId, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell, ReferenceLine,
    LineChart, Line, Legend
} from "recharts";
import { normalizeDate, getDateKey, formatDisplayDate } from "../../../utils/dateHelper";
import { getSafeScore, formatValue, getSyntheticTotal } from "../../../utils/scoreHelper";
import { ChartFrame } from "../ChartFrame";

const CustomTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
};

const MEGA_PALETTE = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#fb7185", "#34d399", "#fbbf24", "#a3e635"
];

const CustomLineTooltip = React.memo(({ active, payload, label, targetScorePct }) => {
    const safeFix = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v).toFixed(d) : "0");
    
    if (active && payload && payload.length) {
        const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

        return (
            <div className="bg-slate-950/95 border border-white/10 p-4 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl min-w-[320px] z-50">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2 flex justify-between items-center">
                    <span>📅 {label}</span>
                    <span className="text-slate-500 font-bold bg-slate-900/50 px-2 py-0.5 rounded">META: {safeFix(targetScorePct, 0)}%</span>
                </p>
                <div className="space-y-4">
                    {sortedPayload.map((entry, index) => {
                        const pct = Math.max(0, Math.min(100, entry.value));
                        const topicKey = entry.dataKey;
                        const total = entry.payload[`${topicKey}_total`];
                        const correct = entry.payload[`${topicKey}_correct`];
                        const delta = entry.payload[`${topicKey}_delta`];
                        
                        const isTargetMet = pct >= targetScorePct;
                        const gap = isTargetMet ? 0 : Math.max(0, targetScorePct - pct);
                        
                        return (
                            <div key={`item-${index}`} className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col gap-0.5">
                                        <span style={{ color: entry.color }} className="font-bold flex items-center gap-2 truncate max-w-[200px]" title={entry.name}>
                                            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}88` }}></span>
                                            <span className="truncate">{entry.name}</span>
                                            {isTargetMet && <span title="Meta atingida" className="text-[10px] shrink-0 drop-shadow-md">🔥</span>}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono ml-4 flex items-center gap-1.5">
                                            <span className="bg-slate-900 px-1 rounded border border-white/5">Vol: {correct}/{total}</span>
                                            {gap > 0 && <span className="text-rose-400/70">Falta {safeFix(gap, 1)}%</span>}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                        <span className="font-mono font-black text-white text-[13px] drop-shadow-md leading-none">
                                            {safeFix(entry.value, 1)}%
                                        </span>
                                        {delta !== undefined && delta !== null && (
                                            <span className={`text-[9px] font-black font-mono leading-none ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                                {delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '■ '}{safeFix(delta, 1)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-slate-900/80 rounded-full overflow-hidden border border-white/5 shadow-inner mt-0.5">
                                    <div 
                                        className="h-full rounded-full transition-all duration-500 ease-out relative" 
                                        style={{ width: `${pct}%`, backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}88` }}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white/30 to-transparent"></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
});

export const SubtopicsPerformanceChart = React.memo(({ 
    categories = [], 
    focusSubjectId, 
    showOnlyFocus, 
    timeWindow, 
    targetScore = 80, 
    minScore = 0,
    maxScore = 100 
}) => {
    const instanceId = useId().replace(/:/g, "");
    const [viewMode, setViewMode] = useState('bars');
    const accuracyUnit = '%';
    
    const range = maxScore - minScore;
    const targetScorePct = range > 0
        ? Math.max(0, Math.min(100, ((targetScore - minScore) / range) * 100))   // ✅ LOTE-02
        : 0;

    const renderLineTooltip = useCallback(
        (props) => <CustomLineTooltip {...props} targetScorePct={targetScorePct} />,
        [targetScorePct]
    );

    const limitMs = useMemo(() => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        if (timeWindow !== "all") {
            const days = parseInt(timeWindow, 10);
            if (Number.isFinite(days) && days > 0) {
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - days);
                pastDate.setHours(0, 0, 0, 0);
                return pastDate.getTime();
            }
        }
        return 0;
    }, [timeWindow]);

    const relevantCategories = useMemo(() => {
        return categories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId);
    }, [categories, showOnlyFocus, focusSubjectId]);

    const chartData = useMemo(() => {
        const topicMap = {};

        relevantCategories.forEach(cat => {
            const history = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
            if (!history.length) return;

            const recentHistory = history.filter(h => {
                if (!limitMs) return true;
                const d = normalizeDate(h.date);
                return d && d.getTime() >= limitMs;
            });

            for (let i = 0; i < recentHistory.length; i++) {
                const h = recentHistory[i];

                (h.topics || []).forEach(t => {
                    const n = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').trim();
                    if (!n || n.toLowerCase() === 'nenhum') return;
                    const key = n.toLowerCase();

                    if (!topicMap[key]) {
                        topicMap[key] = { name: n, correct: 0, total: 0 };
                    }

                    let total = parseInt(t.total, 10) || 0;
                    // ✅ LOTE-02 FIX: entradas percentuais recebem volume sintético (antes eram descartadas)
                    if (total === 0 && t.score != null) total = getSyntheticTotal(maxScore);
                    if (total === 0) return;
                    
                    const safeMaxScore = Math.max(1, Number(maxScore) || 100);
                    const safeMinScore = Math.min(Number(minScore) || 0, safeMaxScore - 1);

                    const rawScore = getSafeScore(t, safeMaxScore);

                    const score = Number.isFinite(rawScore)
                      ? rawScore
                      : safeMinScore;

                    const normalizedScore = Math.max(
                      safeMinScore,
                      Math.min(safeMaxScore, score)
                    );

                    const range = Math.max(1e-9, safeMaxScore - safeMinScore);

                    const rawCorrect =
                      total > 0
                        ? ((normalizedScore - safeMinScore) / range) * total
                        : (Number(t.correct) || 0);

                    const correctCount = Number.isFinite(rawCorrect)
                      ? rawCorrect
                      : 0;

                    topicMap[key].total += total;
                    topicMap[key].correct += correctCount;
                });
            }
        });

        return Object.values(topicMap)
            .filter(d => d.total > 0)
            .map(d => {
                const rawAcc = (d.correct / d.total) * 100;
                const acc = Number.isFinite(rawAcc) ? rawAcc : 0;
                return {
                    name: d.name.length > 25 ? d.name.substring(0, 23) + '...' : d.name,
                    fullName: d.name,
                    correct: d.correct,
                    total: d.total,
                    accuracy: Number(acc.toFixed(2)),
                };
            })
            .sort((a, b) => a.accuracy - b.accuracy);
    }, [relevantCategories, limitMs, maxScore, minScore]);


    const { timeSeriesData, uniqueTopics } = useMemo(() => {
        const dateMap = {}; 
        const topicVolumeMap = {}; 

        relevantCategories.forEach(cat => {
            const history = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
            if (!history.length) return;

            const recentHistory = history.filter(h => {
                if (!limitMs) return true;
                const d = normalizeDate(h.date);
                return d && d.getTime() >= limitMs;
            });

            for (const h of recentHistory) {
                const d = normalizeDate(h.date);
                if (!d) continue;
                const dateKey = getDateKey(d);
                if (!dateKey) continue;
                const dateLabel = formatDisplayDate(dateKey);

                if (!dateMap[dateKey]) {
                    dateMap[dateKey] = { dateLabel, originalDate: d.getTime() };
                }

                (h.topics || []).forEach(t => {
                    const topicName = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').trim();
                    if (!topicName || topicName.toLowerCase() === 'nenhum') return;
                    
                    let total = parseInt(t.total, 10) || 0;
                    // ✅ LOTE-02 FIX: entradas percentuais recebem volume sintético (antes eram descartadas)
                    if (total === 0 && t.score != null) total = getSyntheticTotal(maxScore);
                    if (total === 0) return;

                    topicVolumeMap[topicName] = (topicVolumeMap[topicName] || 0) + total;

                    const safeMaxScore = Math.max(1, Number(maxScore) || 100);
                    const safeMinScore = Math.min(Number(minScore) || 0, safeMaxScore - 1);

                    const rawScore = getSafeScore(t, safeMaxScore);

                    const score = Number.isFinite(rawScore)
                      ? rawScore
                      : safeMinScore;

                    const normalizedScore = Math.max(
                      safeMinScore,
                      Math.min(safeMaxScore, score)
                    );

                    const range = Math.max(1e-9, safeMaxScore - safeMinScore);

                    const rawCorrect =
                      total > 0
                        ? ((normalizedScore - safeMinScore) / range) * total
                        : (Number(t.correct) || 0);

                    const correct = Number.isFinite(rawCorrect)
                      ? rawCorrect
                      : 0;

                    const totKey = `${topicName}_total`;
                    const corKey = `${topicName}_correct`;

                    if (dateMap[dateKey][totKey] === undefined) {
                        dateMap[dateKey][totKey] = 0;
                        dateMap[dateKey][corKey] = 0;
                    }
                    dateMap[dateKey][totKey] += total;
                    dateMap[dateKey][corKey] += correct;
                });
            }
        });

        const topTopics = Object.entries(topicVolumeMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(entry => entry[0]);

        let series = Object.values(dateMap).sort((a, b) => a.originalDate - b.originalDate);

        let prevAccMap = {};
        series.forEach(entry => {
            topTopics.forEach(topic => {
                const tot = entry[`${topic}_total`];
                const cor = entry[`${topic}_correct`];
                if (tot !== undefined && tot > 0) {
                    const accRaw = (cor / tot) * 100;
                    const safeAccRaw = Number.isFinite(accRaw) ? accRaw : 0;
                    const acc = Number(Math.max(0, Math.min(100, safeAccRaw)).toFixed(2));
                    entry[topic] = acc;
                    
                    if (prevAccMap[topic] !== undefined) {
                        entry[`${topic}_delta`] = Number((acc - prevAccMap[topic]).toFixed(2));
                    } else {
                        entry[`${topic}_delta`] = null;
                    }
                    prevAccMap[topic] = acc;
                }
            });
        });

        series = series.filter(entry => {
            return topTopics.some(topic => entry[topic] !== undefined);
        });

        return { timeSeriesData: series, uniqueTopics: topTopics };
    }, [relevantCategories, limitMs, maxScore, minScore]);


    return (
        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-2 sm:p-5 shadow-xl w-full min-h-[600px]" id={`subtopics_container_${instanceId}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 px-2 gap-3">
                <div>
                    <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-amber-500 mb-0.5">
                        🔬 Raio-X de Tópicos {viewMode === 'lines' ? <span className="text-slate-400 text-sm ml-1">(Evolução Temporal)</span> : <span className="text-amber-400/60 text-sm ml-1">(Ranking de Desempenho)</span>}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Percentual de precisão real de cada pilar da sua disciplina.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/50 p-1 rounded-2xl shadow-inner shrink-0 w-full sm:w-auto">
                    <button
                        onClick={() => setViewMode('bars')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-[11px] font-bold rounded-2xl transition-all will-change-transform ${viewMode === 'bars' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-800/40'}`}
                    >
                        Ranking (Barras)
                    </button>
                    <button
                        onClick={() => setViewMode('lines')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-[11px] font-bold rounded-2xl transition-all will-change-transform ${viewMode === 'lines' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-800/40'}`}
                    >
                        Tempo (Linhas)
                    </button>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30 mt-4">
                    <span className="text-5xl opacity-40">⏳</span>
                    <div className="text-center">
                        <p className="text-slate-300 font-bold text-base mb-1">Nenhum assunto no período atual</p>
                        <p className="text-slate-500 text-sm max-w-xs block">Mude o filtro de "Período" ali em cima para <b>Tudo</b> caso seus simulados sejam mais antigos.</p>
                    </div>
                </div>
            ) : viewMode === 'bars' ? (
                <div className="w-full relative" style={{ height: Math.max(450, chartData.length * 60) }}>
                    <ChartFrame minHeight={450} label="Analisando subtópicos">
                        <ResponsiveContainer width="100%" height="100%" minHeight={450} minWidth={1}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 110, left: -5, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`gradGood_${instanceId}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.6}/>
                                    <stop offset="100%" stopColor="#34d399" stopOpacity={1}/>
                                </linearGradient>
                                <linearGradient id={`gradWarn_${instanceId}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6}/>
                                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={1}/>
                                </linearGradient>
                                <linearGradient id={`gradBad_${instanceId}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6}/>
                                    <stop offset="100%" stopColor="#f87171" stopOpacity={1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" horizontal={false} />

                            <XAxis
                                type="number"
                                domain={[0, 100]}
                                stroke="#ffffff"
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                tickLine={false}
                                tickFormatter={(v) => `${v}${accuracyUnit}`}
                                allowDataOverflow={true}
                            />

                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#ffffff"
                                tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                width={150}
                            />

                            <Tooltip
                                offset={30}
                                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                contentStyle={CustomTooltipStyle}
                                itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                                formatter={(value, name, props) => {
                                    const entry = props?.payload;
                                    if (!entry) return [value, name];
                                    return [`${formatValue(value)}% (${entry.correct || 0}/${entry.total || 0} acertos)`, 'Precisão'];
                                }}
                                labelFormatter={(label) => <span className="font-black text-amber-400 tracking-wider uppercase text-[10px]">{label}</span>}
                            />

                            <ReferenceLine x={targetScorePct} stroke="rgba(52, 211, 153, 0.6)" strokeDasharray="4 4" strokeWidth={2} />

                            <Bar dataKey="accuracy" radius={[0, 8, 8, 0]} barSize={28} fill="#6366f1" background={{ fill: 'rgba(255,255,255,0.04)', radius: [0, 8, 8, 0] }} isAnimationActive={true} animationDuration={800}>
                                {chartData.map((entry, index) => {
                                    let barColor = `url(#gradBad_${instanceId})`;
                                    if (entry.accuracy >= targetScorePct) barColor = `url(#gradGood_${instanceId})`;
                                    else if (entry.accuracy >= 60) barColor = `url(#gradWarn_${instanceId})`;
                                    return <Cell key={`cell-${index}`} fill={barColor} />;
                                })}
                                <LabelList
                                    dataKey="accuracy"
                                    position="right"
                                    content={(props) => {
                                        const { x, y, width, height, value, index } = props;
                                        const entry = chartData[index];
                                        if (!entry) return null;
                                        return (
                                            <g>
                                                <text x={x + width + 8} y={y + height / 2 + 4} fill="#ffffff" fontSize={12} fontWeight="black">
                                                    {formatValue(value)}%
                                                </text>
                                                <text
                                                    x={x + width + 8 + (String(formatValue(value)).length * 7) + 16}
                                                    y={y + height / 2 + 3}
                                                    fill="#64748b"
                                                    fontSize={10}
                                                    fontWeight="bold"
                                                >
                                                    ({entry.correct}/{entry.total})
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </ChartFrame>
                </div>
            ) : (
                // 🎯 FIX: Altura reduzida de 750px para 500px para caber melhor na tela
                <div className="w-full relative min-h-[500px]">
                    <div className="absolute top-0 right-4 text-[10px] text-indigo-400/60 font-mono z-10">
                        {uniqueTopics.length} tópicos plotados simultaneamente.
                    </div>
                    {timeSeriesData.length > 0 ? (
                        <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                            <div className="min-w-[700px] lg:min-w-full">
                                <ChartFrame minHeight={500} label="Analisando subtópicos">
                                    <ResponsiveContainer width="100%" height={500} minWidth={1}>
                                    {/* 🎯 FIX: left de -20 para 0 para evitar corte do eixo Y */}
                                    <LineChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                                        <CartesianGrid strokeDasharray="2 2" stroke="#1e2937" vertical={false} />

                                        <XAxis
                                            dataKey="originalDate"
                                            stroke="#64748b"
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                            tickLine={false}
                                            tickFormatter={(val) => {
                                                const d = new Date(val);
                                                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                                            }}
                                        />

                                        <YAxis
                                            stroke="#64748b"
                                            domain={[0, 100]}
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `${v}%`}
                                            allowDataOverflow={true}
                                        />

                                        <Tooltip
                                            offset={40}
                                            content={renderLineTooltip}
                                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />

                                        <ReferenceLine y={targetScorePct} stroke="rgba(52, 211, 153, 0.4)" strokeDasharray="4 4" label={{ position: 'top', value: 'META', fill: '#6ee7b7', fontSize: 10 }} />

                                        <Legend
                                            wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }}
                                            iconType="circle"
                                        />

                                        {uniqueTopics.map((topicName, index) => {
                                            const color = MEGA_PALETTE[index % MEGA_PALETTE.length];
                                            return (
                                                <Line connectNulls
                                                    key={topicName}
                                                    type="monotoneX"
                                                    dataKey={topicName}
                                                    name={topicName}
                                                    stroke={color}
                                                    strokeWidth={3}
                                                    dot={{ r: 3, fill: '#0f172a', strokeWidth: 1.5, stroke: color }}
                                                    activeDot={{ r: 5, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
                                                    animationDuration={1500}
                                                    animationEasing="ease-in-out"
                                                />
                                            );
                                        })}
                                    </LineChart>
                                    </ResponsiveContainer>
                                </ChartFrame>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 italic">
                            <span className="text-3xl mb-2">📉</span>
                            <p>Dados insuficientes no período.</p>
                            <p className="text-xs">Faça simulados em dias diferentes para formar a linha do tempo.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
```

---

## File: `src/components/charts/EvolutionChart/TimeSpentChart.jsx`
*Linhas: 439 | Tamanho: 23.84 KB*

```javascript
import React, { useState, useMemo } from 'react';

import { Clock } from 'lucide-react';
import { toDateMs, getDateKey } from '../../../utils/dateHelper';
import { getSyntheticTotal } from '../../../utils/scoreHelper';

const formatTime = (s) => {
    if (s == null || !Number.isFinite(Number(s))) return 'N/A';
    // ✅ LOTE-02 FIX: arredondar ANTES de separar minutos/segundos
    const total = Math.round(Math.max(0, Number(s)));
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return m === 0 ? `${sec}s` : sec === 0 ? `${m}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
};

function HalfMoonGauge({ data }) {
    const width = 200;
    const height = 110;
    const cx = width / 2;
    const cy = height;
    const r = 80;
    const strokeWidth = 14;

    const localMax = Math.max(30, data.displaySeconds || 0, data.visualLatestSeconds || data.latestSeconds || 0, data.visualAbsoluteSeconds || data.absoluteLatestSeconds || 0);
    const gaugeMax = localMax * 1.2;

    const getCoordinatesForValue = (val) => {
        const safeVal = Math.max(0, Math.min(val, gaugeMax));
        const angle = Math.PI - (safeVal / gaugeMax) * Math.PI;
        return {
            x: cx + r * Math.cos(angle),
            y: cy - r * Math.sin(angle)
        };
    };

    const makeArc = (startVal, endVal) => {
        const start = getCoordinatesForValue(startVal);
        const end = getCoordinatesForValue(endVal);
        return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
    };

    const displayColor = "#0ea5e9";
    const hasLatest = data.latestSeconds != null;
    const hasAbsolute = data.absoluteLatestSeconds != null;
    const margin = Math.max(1, Math.round((data.displaySeconds || 0) * 0.05));
    
    let latestColor = null;
    if (hasLatest) {
        if (data.latestSeconds === 0) latestColor = "#94a3b8";
        else if (data.latestSeconds > data.displaySeconds + margin) latestColor = "#ef4444";
        else if (data.latestSeconds < data.displaySeconds - margin) latestColor = "#10b981";
        else latestColor = "#eab308";
    }

    let absoluteColor = null;
    if (hasAbsolute) {
        if (data.absoluteLatestSeconds === 0) absoluteColor = "#94a3b8";
        else if (data.absoluteLatestSeconds > data.displaySeconds + margin) absoluteColor = "#ef4444";
        else if (data.absoluteLatestSeconds < data.displaySeconds - margin) absoluteColor = "#10b981";
        else absoluteColor = "#eab308";
    }

    return (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col items-center h-full shadow-lg hover:border-slate-700 transition-all group relative">
            {hasAbsolute && data.absoluteTotalTime != null && (
                <div 
                    className={`absolute top-2 right-2 text-[10px] text-white font-bold px-1.5 py-0.5 rounded border bg-slate-950/50 ${
                        absoluteColor === '#ef4444' ? 'border-rose-500/40' : 
                        (absoluteColor === '#10b981' ? 'border-emerald-500/40' : 
                        (absoluteColor === '#eab308' ? 'border-yellow-500/40' : 
                        'border-slate-600'))
                    }`}
                    title="Tempo Absoluto do Último Simulado"
                >
                    {formatTime(data.absoluteTotalTime)}
                </div>
            )}
            <h4 className="text-slate-200 font-bold text-sm text-center mb-4 truncate w-full px-6" title={data.fullName}>{data.fullName}</h4>
            
            <div className="relative w-[200px] h-[110px]">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                    {/* Track Background */}
                    <path d={makeArc(0, gaugeMax)} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} strokeLinecap="round" />
                    
                    {/* Track 7-Day Average (Translucent) */}
                    {data.displaySeconds > 0 && (
                        <path d={makeArc(0, data.displaySeconds)} fill="none" stroke={displayColor} strokeOpacity={0.25} strokeWidth={strokeWidth} strokeLinecap="round" />
                    )}
                    
                    {/* Track Latest Average (Solid) */}
                    {hasLatest && data.latestSeconds > 0 && (
                        <path d={makeArc(0, (data.visualLatestSeconds ?? data.latestSeconds))} fill="none" stroke={latestColor} strokeWidth={strokeWidth} strokeLinecap="round" />
                    )}
                    
                    {/* Absolute Marker (Pin) */}
                    {hasAbsolute && (
                        <g>
                            {(() => {
                                const pos = getCoordinatesForValue(data.visualAbsoluteSeconds ?? data.absoluteLatestSeconds);
                                return (
                                    <>
                                        <circle cx={pos.x} cy={pos.y} r={6} fill="#ffffff" stroke={absoluteColor} strokeWidth={2.5} className="shadow-lg drop-shadow-md" />
                                    </>
                                );
                            })()}
                        </g>
                    )}
                </svg>

                {/* Inner Text */}
                <div className="absolute bottom-0 left-0 w-full text-center flex flex-col items-center justify-end pb-1">
                    <span className="text-2xl font-black text-white">{formatTime(hasLatest ? data.latestSeconds : data.displaySeconds)}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                        Média: {formatTime(data.displaySeconds)}
                    </span>
                </div>
            </div>

            <div className="w-full mt-auto pt-3 border-t border-slate-800/50 flex flex-col gap-1.5">
                {hasAbsolute && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500" title="Sua média de tempo por questão apenas na última sessão">Última Média</span>
                        <span className={`font-bold ${absoluteColor === '#ef4444' ? 'text-rose-500' : (absoluteColor === '#10b981' ? 'text-emerald-500' : (absoluteColor === '#eab308' ? 'text-yellow-500' : 'text-slate-400'))}`}>{formatTime(data.absoluteLatestSeconds)}</span>
                    </div>
                )}
                {hasLatest && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Média Dia</span>
                        <span className={`font-bold ${latestColor === '#ef4444' ? 'text-rose-400' : (latestColor === '#10b981' ? 'text-emerald-400' : (latestColor === '#eab308' ? 'text-yellow-400' : 'text-slate-400'))}`}>{formatTime(data.latestSeconds)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Média 7 Dias</span>
                    <span className="text-cyan-400 font-bold">{formatTime(data.displaySeconds)}</span>
                </div>
            </div>
        </div>
    );
}

export function TimeSpentChart({ subjectAggData, activeCategories = [], showOnlyFocus, focusCategory, maxScore = 100 }) {
    const [sortOrder, setSortOrder] = useState('slower'); // 'slower' | 'faster'

    const chartData = useMemo(() => {
        const safeSubjectAggData = Array.isArray(subjectAggData) ? subjectAggData : [];
        return safeSubjectAggData
            .filter(d => d.timedQuestoes > 0 && d.timeSpent >= 0)
            .map((d) => {
                // Média Geral
                const avgSeconds = Math.round(d.timeSpent / d.timedQuestoes);

            // Média Recente (Últimos 7 dias)
            let recentAvgSeconds = null;
            const cat = activeCategories.find(c => c.id === d.id);
            if (cat) {
                const nowMs = new Date().getTime();
                const todayKey = getDateKey(new Date());
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                const history = Object.values(cat.simuladoStats?.history || {});

                const recentStats = history.reduce((acc, h) => {
                    const hDateMs = toDateMs(h.date || h.createdAt);
                    const hKey = getDateKey(h.date || h.createdAt);
                    if (Number.isNaN(hDateMs) || (nowMs - hDateMs) > sevenDaysMs || hKey > todayKey) {
                        return acc;
                    }

                    let rootTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
                    let topicsTs = 0;
                    let topicsTimedQ = 0;
                    let hasTopicWithTime = false;

                    const safeTopics = Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {});
                    if (safeTopics.length > 0) {
                        for (const t of safeTopics) {
                            const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                            const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0 ? t.timedQuestoes : (Number(t.total) || 0);
                            if (tTs !== null && tTs > 0 && tTot > 0) { // BUG FIX: Ignora tempos exatos de 0s (origem de banco de dados antigo corrompido)
                                topicsTs += tTs;
                                topicsTimedQ += tTot;
                                hasTopicWithTime = true;
                            }
                        }
                    }

                    if (hasTopicWithTime) {
                        return { ts: acc.ts + topicsTs, tq: acc.tq + topicsTimedQ };
                    } else {
                        let tot = Number(h.total) || 0;
                        if (tot === 0 && h.score != null) tot = getSyntheticTotal(maxScore);
                        if (tot > 0 && rootTs !== null && rootTs > 0) {
                            return { ts: acc.ts + rootTs, tq: acc.tq + tot };
                        }
                    }

                    return acc;
                }, { ts: 0, tq: 0 });

                if (recentStats.tq > 0) {
                    recentAvgSeconds = Math.round(recentStats.ts / recentStats.tq);
                }
            }

            // Define qual métrica usaremos como base (Recente tem prioridade para a barra visual)
            const displaySeconds = recentAvgSeconds !== null ? recentAvgSeconds : avgSeconds;
            const hasRecentData = recentAvgSeconds !== null;
            let latestSeconds = null;
            let absoluteLatestSeconds = null;
            let absoluteTotalTime = null;

            if (cat) {
                // BUG FIX: Garante que o histórico é ordenado cronologicamente antes de buscar o "último"
                const sortedHistory = Object.values(cat.simuladoStats?.history || {}).sort((a, b) => {
                    const da = toDateMs(a.date || a.createdAt) || 0;
                    const db = toDateMs(b.date || b.createdAt) || 0;
                    return da - db;
                });

                const latestEntry = sortedHistory[sortedHistory.length - 1];
                if (latestEntry) {
                    let rootTs = typeof latestEntry.timeSpent === 'number' ? latestEntry.timeSpent : null;
                    let topicsTs = 0;
                    let topicsTimedQ = 0;
                    let hasTopicWithTime = false;

                    const safeLatestTopics = Array.isArray(latestEntry.topics) ? latestEntry.topics : Object.values(latestEntry.topics || {});
                    if (safeLatestTopics.length > 0) {
                        for (const t of safeLatestTopics) {
                            const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                            const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0 ? t.timedQuestoes : (Number(t.total) || 0);
                            if (tTs !== null && tTs > 0 && tTot > 0) { // BUG FIX: Ignora tempos exatos de 0s (origem de banco de dados antigo corrompido)
                                topicsTs += tTs;
                                topicsTimedQ += tTot;
                                hasTopicWithTime = true;
                            }
                        }
                    }

                    if (hasTopicWithTime && topicsTimedQ > 0) {
                        latestSeconds = Math.round(topicsTs / topicsTimedQ);
                    } else {
                        let tot = Number(latestEntry.total) || 0;
                        if (tot === 0 && latestEntry.score != null) tot = getSyntheticTotal(maxScore);
                        if (tot > 0 && rootTs !== null && rootTs > 0) {
                            latestSeconds = Math.round(rootTs / tot);
                        }
                    }

                    if (latestEntry.lastSessionTimeSpent != null && latestEntry.lastSessionTotal > 0) {
                        absoluteLatestSeconds = Math.round(latestEntry.lastSessionTimeSpent / latestEntry.lastSessionTotal);
                        absoluteTotalTime = latestEntry.lastSessionTimeSpent;
                    }
                }
            }

            const timeStr = formatTime(displaySeconds);

            let deltaStr = "";
            let deltaSeconds = 0;
            if (hasRecentData) {
                deltaSeconds = recentAvgSeconds - avgSeconds;
                const margin = Math.max(1, Math.round(avgSeconds * 0.05));
                if (deltaSeconds > margin) {
                    deltaStr = `🐢 +${deltaSeconds}s`;
                } else if (deltaSeconds < -margin) {
                    deltaStr = `⚡ ${deltaSeconds}s`;
                } else {
                    deltaStr = `✨ Estável`;
                }
            }

            const qstStr = `(${d.timedQuestoes} questões)`;
            const latestStr = latestSeconds !== null ? `Média Dia: ${formatTime(latestSeconds)}` : "";
            const parts = [latestStr, deltaStr, qstStr].filter(Boolean);

            const latestSecs = latestSeconds || 0;
            const visualLatestSeconds = displaySeconds > 0
                ? Math.min(latestSecs, Math.max(displaySeconds * 2.5, 120))
                : Math.min(latestSecs, 180); // Capped at 3 mins if display is 0

            const absoluteSecs = absoluteLatestSeconds || 0;
            const visualAbsoluteSeconds = displaySeconds > 0
                ? Math.min(absoluteSecs, Math.max(displaySeconds * 2.5, 120))
                : Math.min(absoluteSecs, 180);

            return {
                ...d,
                displaySeconds,
                avgSeconds, // Geral
                recentAvgSeconds,
                latestSeconds,
                absoluteLatestSeconds,
                absoluteTotalTime,
                visualLatestSeconds,
                visualAbsoluteSeconds,
                maxSeconds: Math.max(displaySeconds, visualLatestSeconds, visualAbsoluteSeconds),
                hasRecentData,
                deltaSeconds,
                avgFormatted: timeStr,
                generalFormatted: formatTime(avgSeconds),
                avgLabelWithDetails: parts.join("   |   ")
            };
        })
        .sort((a, b) => sortOrder === 'slower' ? b.displaySeconds - a.displaySeconds : a.displaySeconds - b.displaySeconds);
    }, [subjectAggData, activeCategories, sortOrder, maxScore]);

    const legendStats = useMemo(() => {
        return chartData.reduce((acc, item) => {
            if (Number.isFinite(Number(item.displaySeconds))) {
            acc.avg += Number(item.displaySeconds);
            acc.avgCount += 1;
        }

        if (item.latestSeconds !== null && Number.isFinite(Number(item.latestSeconds))) {
            acc.latest += Number(item.latestSeconds);
            acc.latestCount += 1;

            if (Number(item.latestSeconds) > Number(item.displaySeconds)) acc.above += 1;
            if (Number(item.latestSeconds) < Number(item.displaySeconds)) acc.below += 1;
        }
        return acc;
    }, { avg: 0, latest: 0, above: 0, below: 0, avgCount: 0, latestCount: 0 });
    }, [chartData]);

    const legendAvgSeconds = legendStats.avgCount > 0
        ? Math.round(legendStats.avg / legendStats.avgCount) : 0;

    const legendLatestSeconds = legendStats.latestCount > 0
        ? Math.round(legendStats.latest / legendStats.latestCount) : 0;


    if (chartData.length === 0) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30 w-full mt-2">
                <span className="text-5xl">⏳</span>
                <div className="text-center">
                    <p className="text-slate-300 font-bold text-base mb-1">Coletando Dados de Agilidade AI</p>
                    <p className="text-slate-500 text-sm max-w-sm px-4">
                        O sistema começou a registrar seus tempos hoje. Faça um <span className="text-cyan-400 font-bold">novo Simulado IA</span> para que seu gráfico de agilidade apareça aqui!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all group w-full min-w-0 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-5 min-w-0">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                            <Clock size={12} className="text-cyan-400" /> Agilidade AI
                        </p>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                            Apenas Simulado IA
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider ml-1 hidden sm:inline-block">
                            Recente vs Geral
                        </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-200 truncate">
                        ⏳ {showOnlyFocus ? `Tempo Médio por Questão — ${focusCategory?.name}` : "Tempo Médio por Questão (Recente vs Histórico)"}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        <span className="inline-flex items-center gap-1.5" title="Sua média de tempo nos últimos 7 dias">
                            <span className="h-2.5 w-3 rounded-[2px] bg-[#0ea5e9]/30" />
                            Média 7 Dias
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Sua média de tempo no último dia estudado">
                            <span className="h-0.5 w-3 rounded-[2px] bg-[#10b981]" />
                            Média do Dia
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Marcador da sua média exata por questão no último simulado (sessão)">
                            <span className="h-2 w-2 rounded-full bg-white ring-1 ring-slate-400" />
                            Última Média
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Cor vermelha significa que você foi mais lento além da margem">
                            <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                            Lento (Piorou)
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Cor amarela significa tempo mantido">
                            <span className="h-2 w-2 rounded-full bg-[#eab308]" />
                            Estável (Manteve)
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Cor verde significa que você foi mais rápido além da margem">
                            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                            Rápido (Melhorou)
                        </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800/50 flex flex-wrap items-center gap-3 sm:gap-5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        <span className="inline-flex items-center gap-1.5" title="Média geral de tempo considerando todos os assuntos">
                            MÉDIA GERAL: <span className="font-bold text-slate-300">{formatTime(legendAvgSeconds)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Média geral de tempo no último dia de cada assunto">
                            ÚLTIMO GERAL: <span className="font-bold text-slate-300">{formatTime(legendLatestSeconds)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Quantos assuntos você piorou no último dia">
                            ACIMA DA MÉDIA: <span className="font-bold text-rose-400">{legendStats.above}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Quantos assuntos você melhorou no último dia">
                            ABAIXO DA MÉDIA: <span className="font-bold text-emerald-400">{legendStats.below}</span>
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                        onClick={() => setSortOrder('slower')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${sortOrder === 'slower'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                : 'bg-slate-800/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'
                            }`}
                        title="Ordenar pelas matérias mais lentas"
                    >
                        🐢 Mais Lentas
                    </button>
                    <button
                        onClick={() => setSortOrder('faster')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${sortOrder === 'faster'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                : 'bg-slate-800/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'
                            }`}
                        title="Ordenar pelas matérias mais rápidas"
                    >
                        ⚡ Mais Rápidas
                    </button>
                </div>
            </div>

            <div className="w-full mt-6 pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {chartData.map((data, index) => (
                        <HalfMoonGauge key={`gauge-${data.id}-${index}`} data={data} />
                    ))}
                </div>
            </div>
        </div>
    );
}
```

---

## File: `src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx`
*Linhas: 561 | Tamanho: 28.54 KB*

```javascript
import React, { useMemo, useState } from 'react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, 
    ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, LabelList
} from 'recharts';
import { getDateKey, toDateMs } from '../../../utils/dateHelper';
import { getSafeScore, getSyntheticTotal } from '../../../utils/scoreHelper';
import { normalize, aliases } from '../../../utils/normalization';
import { Zap, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const COLORS = {
    gaugeBg: '#1e293b',    // slate-800
    gaugeFillValid: '#a855f7', // purple-500
    gaugeFillDanger: '#ef4444',// red-500
    gaugeFillSuccess: '#22c55e',// green-500
    reference: '#94a3b8',  // slate-400
    neonLine: '#c084fc',   // purple-400
};

const CustomTooltipTimeline = ({ active, payload, unit }) => {
    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);

    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl">
                <p className="text-slate-300 text-xs font-bold mb-1">{data.displayDate}</p>
                
                <p className="text-white text-sm font-black flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.neonLine }}></span>
                    Média: {safeFix(data.accuracy)}{unit}
                </p>
                
                {data.lastTestAcc != null && (
                    <p className="text-white text-sm font-black flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.lastTestColor || COLORS.gaugeFillValid }}></span>
                        Último: {safeFix(data.lastTestAcc)}{unit}
                    </p>
                )}

                <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-wider">{data.total} questões</p>
            </div>
        );
    }
    return null;
};

const CustomTooltipPie = ({ active, payload, unit }) => {
    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);

    if (active && payload && payload.length) {
        const data = payload[0].payload;
        if (data.trueValue == null) return null; // Não mostra se o arco for vazio/sem dados
        
        return (
            <div 
                className="bg-slate-900 border border-slate-700 p-2 rounded-xl shadow-xl z-50 pointer-events-none"
                style={{ transform: 'translate(-50%, -130%)', width: 'max-content' }}
            >
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.baseColor }}></span>
                    <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wider">{data.name.replace(' (Restante)', '')}</span>
                </div>
                <p className="text-white text-sm font-black mt-1">
                    {safeFix(data.trueValue)}{unit}
                </p>
            </div>
        );
    }
    return null;
};

export function TodayVsGeneralChart({ 
    activeCategories = [], 
    globalMetrics = {}, 
    targetScore = 80,
    maxScore = 100, 
    minScore = 0,          // ✅ LOTE-01
    unit = '%',
    simuladoRows = []
}) {
    // ✅ LOTE-01 FIX: globalAccuracy chega como PERCENTUAL; o gráfico vive em PONTOS.
    const generalAccuracy = useMemo(() => {
        const pct = Number(globalMetrics?.globalAccuracy);
        const safePct = Number.isFinite(pct) ? pct : 0;
        const safeMax = Math.max(1, Number(maxScore) || 100);
        const safeMin = Math.min(Number(minScore) || 0, safeMax);
        return Math.max(safeMin, Math.min(safeMax, (safePct / 100) * safeMax));
    }, [globalMetrics?.globalAccuracy, maxScore, minScore]);

    const scale = Math.max(1, Number(maxScore) || 100) / 100;
    // ✅ LOTE-01 FIX: margens proporcionais à escala (2 pts fixos só valiam em 0–100)
    const stabilityMargin = Math.max(1, ((Number(maxScore) || 100) - (Number(minScore) || 0)) * 0.02);
    const [nowMs] = useState(() => Date.now());
    const [todayKey] = useState(() => getDateKey(new Date()));

    // 2. Extrair dados diários agregados (Últimos 14 dias)
    const { dailyData, lastActiveEntry, isToday } = useMemo(() => {
        const dayMap = {};
        
        activeCategories.forEach(cat => {
            const history = Object.values(cat.simuladoStats?.history || {});
            history.forEach(h => {
                const dKey = getDateKey(h.date || h.createdAt);
                if (!dKey) return;
                
                if (!dayMap[dKey]) dayMap[dKey] = { correct: 0, total: 0 };
                
                let tot = Number(h.total) || 0;
                let corr = Number(h.correct) || 0;

                const safeMaxScore = Math.max(1, Number(maxScore) || 100);

                const rawScore = getSafeScore(h, safeMaxScore);

                const score = Number.isFinite(rawScore)
                  ? rawScore
                  : 0;

                if (tot === 0 && h.score != null) {
                  tot = getSyntheticTotal(safeMaxScore);
                  corr = Math.round((score / safeMaxScore) * tot);
                } else if (tot > 0 && h.correct == null) {
                  corr = Math.round((score / safeMaxScore) * tot);
                }

                dayMap[dKey].correct += corr;
                dayMap[dKey].total += tot;
            });
        });
        
        const sortedDates = Object.keys(dayMap).sort();
        const result = sortedDates.slice(-14).map(date => {
            const [, m, d] = date.split('-');
            const entry = dayMap[date];
            const acc = entry.total > 0 ? (entry.correct / entry.total) * maxScore : 0;
            return {
                date,
                displayDate: `${d}/${m}`,
                accuracy: acc,
                total: entry.total,
            };
        });

        const lastEntry = result.length > 0 ? result[result.length - 1] : null;
        const _isToday = lastEntry ? lastEntry.date === todayKey : false;

        return { dailyData: result, lastActiveEntry: lastEntry, isToday: _isToday };
    }, [activeCategories, maxScore, todayKey]);

    // Extrair histórico acumulado em múltiplos recortes de tempo
    const temporalMetrics = useMemo(() => {
        const buckets = {
            today: { correct: 0, total: 0 },
            week: { correct: 0, total: 0 },
            month: { correct: 0, total: 0 },
            month3: { correct: 0, total: 0 },
            month6: { correct: 0, total: 0 }
        };

        const now = nowMs;
        const ms1Week = 7 * 24 * 60 * 60 * 1000;
        const ms1Month = 30 * 24 * 60 * 60 * 1000;
        const ms3Months = 90 * 24 * 60 * 60 * 1000;
        const ms6Months = 180 * 24 * 60 * 60 * 1000;

        activeCategories.forEach(cat => {
            const history = Object.values(cat.simuladoStats?.history || {});
            history.forEach(h => {
                const time = toDateMs(h.date || h.createdAt);
                if (!time) return;
                
                const safeMaxScore = Math.max(1, Number(maxScore) || 100);

                const rawScore = getSafeScore(h, safeMaxScore);

                const score = Number.isFinite(rawScore)
                  ? rawScore
                  : 0;
                
                const hDateKey = getDateKey(h.date || h.createdAt);
                
                let tot = Number(h.total) || 0;
                let corr = Number(h.correct) || 0;

                if (tot === 0 && h.score != null) {
                    tot = getSyntheticTotal(safeMaxScore);
                    corr = Math.round((score / safeMaxScore) * tot);
                } else if (tot > 0 && h.correct == null) {
                    corr = Math.round((score / safeMaxScore) * tot);
                }

                if (tot === 0) return;

                if (hDateKey === todayKey) {
                    buckets.today.correct += corr;
                    buckets.today.total += tot;
                }
                if (now - time <= ms1Week) {
                    buckets.week.correct += corr;
                    buckets.week.total += tot;
                }
                if (now - time <= ms1Month) {
                    buckets.month.correct += corr;
                    buckets.month.total += tot;
                }
                if (now - time <= ms3Months) {
                    buckets.month3.correct += corr;
                    buckets.month3.total += tot;
                }
                if (now - time <= ms6Months) {
                    buckets.month6.correct += corr;
                    buckets.month6.total += tot;
                }
            });
        });

        // --- CALCULA "ÚLTIMO" ---
        // Extrai exatamente o percentual do ÚLTIMO simulado real validado (IA ou Manual)
        let latestAcc = null;
        const safeRowsArray = Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {});
        
        if (safeRowsArray.length > 0) {
            const activeCategoryMap = new Set();
            activeCategories.forEach(c => {
                if (c.name) {
                    const normName = normalize(c.name);
                    activeCategoryMap.add(normName);
                    if (aliases[normName]) {
                        aliases[normName].forEach(a => activeCategoryMap.add(normalize(a)));
                    }
                }
            });
            const activeCategoryIdMap = new Set(activeCategories.map(c => c.id).filter(Boolean));
            
            const sortedRows = [...safeRowsArray]
                .filter(r => {
                    if (!r || (!r.createdAt && !r.date) || r.validated === false) return false;
                    const rSubj = normalize(r.subject);
                    const subjMatches = rSubj ? activeCategoryMap.has(rSubj) : false;
                    const idMatches = r.categoryId && activeCategoryIdMap.has(r.categoryId);
                    return subjMatches || idMatches;
                })
                .sort((a, b) => {
                    const timeA = new Date(a.createdAt || a.date).getTime();
                    const timeB = new Date(b.createdAt || b.date).getTime();
                    return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
                });

            if (sortedRows.length > 0) {
                const latestRow = sortedRows[0];
                latestAcc = getSafeScore(latestRow, maxScore);
            }
        }

        const getAcc = (b) => b.total > 0 ? (b.correct / b.total) * maxScore : null;

        return [
            { id: 'month6', label: '6 Meses', val: getAcc(buckets.month6), rIn: 70, rOut: 80 },
            { id: 'month3', label: '3 Meses', val: getAcc(buckets.month3), rIn: 82, rOut: 92 },
            { id: 'month', label: '1 Mês', val: getAcc(buckets.month), rIn: 94, rOut: 103 },
            { id: 'week', label: 'Semana', val: getAcc(buckets.week), rIn: 105, rOut: 113 },
            { id: 'today', label: 'Hoje', val: getAcc(buckets.today), rIn: 115, rOut: 122 },
            { id: 'last', label: 'Último', val: latestAcc, rIn: 124, rOut: 130 }
        ];
    }, [activeCategories, maxScore, nowMs, todayKey, simuladoRows]);

    const lastMetric = temporalMetrics.find(t => t.id === 'last');
    const latestAcc = lastMetric?.val ?? null;

    const chartData = useMemo(() => {
        if (!dailyData || dailyData.length === 0) return [];
        const data = dailyData.map(d => ({ ...d }));
        if (latestAcc !== null) {
            const lastIdx = data.length - 1;
            const prevAcc = data.length > 1 ? data[lastIdx - 1].accuracy : data[0].accuracy;
            data[lastIdx].lastTestAcc = latestAcc;
            
            const marginLine = stabilityMargin; // ✅ LOTE-01 FIX
            if (latestAcc < prevAcc - marginLine) {
                data[lastIdx].lastTestColor = COLORS.gaugeFillDanger;
            } else if (latestAcc > prevAcc + marginLine) {
                data[lastIdx].lastTestColor = COLORS.gaugeFillValid;
            } else {
                data[lastIdx].lastTestColor = '#eab308'; // Stable / Yellow
            }
        }
        return data;
    }, [dailyData, latestAcc]);

    if (!dailyData || dailyData.length === 0) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30">
                <span className="text-4xl opacity-50">⚖️</span>
                <p className="text-slate-400 font-bold text-sm">Dados insuficientes para comparação diária.</p>
            </div>
        );
    }

    const focusAccuracy = lastActiveEntry ? lastActiveEntry.accuracy : 0;
    const delta = focusAccuracy - generalAccuracy;
    const deltaAbs = Math.abs(delta);
    
    // Stable Margin logic for delta
    const marginDelta = stabilityMargin; // ✅ LOTE-01 FIX
    let deltaStatus = 'stable';
    if (delta > marginDelta) deltaStatus = 'positive';
    else if (delta < -marginDelta) deltaStatus = 'negative';

    const todayMetric = temporalMetrics.find(t => t.id === 'today');
    const todayAcc = todayMetric?.val ?? null;

    const deltaLastVsToday = (latestAcc != null && todayAcc != null) ? latestAcc - todayAcc : null;
    let lastVsTodayStatus = 'stable';
    if (deltaLastVsToday !== null) {
        if (deltaLastVsToday > marginDelta) lastVsTodayStatus = 'positive';
        else if (deltaLastVsToday < -marginDelta) lastVsTodayStatus = 'negative';
    }

    const getColor = (val) => {
        if (val == null) return 'transparent';
        if (val >= targetScore) return COLORS.gaugeFillSuccess;
        if (val < targetScore - (15 * scale)) return COLORS.gaugeFillDanger;
        return '#facc15';
    };

    // Usaremos a cor do arco 'Hoje' para o texto central, ou a cor geral.

    // Helper for safe rendering
    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[400px]">
            {/* Painel Esquerdo: O Velocímetro / Dashboard de Hoje */}
            <div className="w-full lg:w-1/3 min-w-[280px] bg-black/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-inner overflow-hidden group">
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Target size={14} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {isToday ? "Sessão de Hoje" : "Última Sessão"}
                    </span>
                </div>

                {/* Legenda dos Anéis */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                    {temporalMetrics.slice().reverse().map(metric => {
                        if (metric.val == null) {
                            return (
                                <div key={metric.id} className="flex items-center gap-1.5 opacity-40">
                                    <span className="text-[7px] text-slate-500 uppercase tracking-widest font-black">{metric.label}</span>
                                    <span className="text-[10px] font-black tracking-tighter text-slate-600">--{unit}</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                                </div>
                            );
                        }
                        const c = getColor(metric.val);
                        return (
                            <div key={metric.id} className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                                <span className="text-[7px] text-slate-500 uppercase tracking-widest font-black">{metric.label}</span>
                                <span className="text-[10px] font-black tracking-tighter" style={{ color: c }}>
                                    {safeFix(metric.val)}{unit}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c, filter: `drop-shadow(0 0 4px ${c}80)` }}></div>
                            </div>
                        );
                    })}
                </div>

                <div className="relative w-[260px] h-[140px] mt-6 flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            {temporalMetrics.map((metric) => {
                                const isNull = metric.val == null;
                                const val = isNull ? 0 : Math.max(0, Math.min(metric.val, maxScore));
                                const arcColor = isNull ? 'transparent' : getColor(metric.val);
                                const arcData = [
                                    { name: metric.label, value: val, trueValue: metric.val, baseColor: arcColor },
                                    { name: `${metric.label} (Restante)`, value: maxScore - val, trueValue: metric.val, baseColor: arcColor }
                                ];
                                return (
                                    <Pie
                                        key={metric.id}
                                        data={arcData}
                                        cx="50%"
                                        cy="100%"
                                        startAngle={180}
                                        endAngle={0}
                                        innerRadius={metric.rIn}
                                        outerRadius={metric.rOut}
                                        paddingAngle={0}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell key={`cell-${metric.id}-0`} fill={arcColor} style={{ filter: isNull ? 'none' : `drop-shadow(0 0 6px ${arcColor}60)` }} />
                                        <Cell key={`cell-${metric.id}-1`} fill={COLORS.gaugeBg} />
                                    </Pie>
                                );
                            })}
                            <Tooltip content={<CustomTooltipPie unit={unit} />} cursor={false} offset={0} isAnimationActive={false} />
                        </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Texto Central do Gauge */}
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
                        <div className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg tabular-nums tracking-tight">
                            {safeFix(focusAccuracy)}<span className="text-xl text-slate-400 ml-1">{unit}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                            {isToday ? "Acertos(%) hoje" : "Acertos(%) no dia"}
                        </span>
                    </div>
                </div>

                {/* Badges de Comparação (Deltas) */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
                    <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-sm ${
                        deltaStatus === 'positive' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        deltaStatus === 'negative' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                        'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    }`}>
                        {deltaStatus === 'positive' ? <TrendingUp size={14} /> : 
                         deltaStatus === 'negative' ? <TrendingDown size={14} /> : 
                         <Minus size={14} />}
                        <div className="flex flex-col">
                            <span className="text-sm font-black">
                                {delta > 0 ? '+' : delta < 0 ? '−' : ''}{safeFix(deltaAbs)}{unit}
                            </span>
                            <span className="text-[7px] uppercase tracking-wider opacity-70">Geral</span>
                        </div>
                    </div>

                    {deltaLastVsToday !== null && (
                        <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-sm ${
                            lastVsTodayStatus === 'positive' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                            lastVsTodayStatus === 'negative' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                            'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        }`}>
                            {lastVsTodayStatus === 'positive' ? <TrendingUp size={14} /> : 
                             lastVsTodayStatus === 'negative' ? <TrendingDown size={14} /> : 
                             <Minus size={14} />}
                            <div className="flex flex-col">
                                <span className="text-xs font-black">
                                    {deltaLastVsToday > 0 ? '+' : ''}{safeFix(Math.abs(deltaLastVsToday))}{unit}
                                </span>
                                <span className="text-[7px] uppercase tracking-wider opacity-70">Ritmo (Hoje)</span>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Info adicional da Meta */}
                <div className="w-full flex justify-between items-center mt-6 pt-4 border-t border-white/5 px-2">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Média Geral</span>
                        <span className="text-sm font-bold text-slate-300">{safeFix(generalAccuracy)}{unit}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Meta</span>
                        <span className="text-sm font-bold text-slate-300">{targetScore}{unit}</span>
                    </div>
                </div>
            </div>

            {/* Painel Direito: Linha do Tempo Analítica */}
            <div className="w-full lg:w-2/3 flex-1 bg-black/20 border border-slate-700/30 rounded-3xl p-4 sm:p-6 flex flex-col relative">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                        <h4 className="text-sm font-black text-slate-200 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Zap size={14} className="text-purple-400" /> Histórico Recente (14 dias)
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Compare suas variações diárias com a linha base
                        </p>
                    </div>
                </div>
                
                <div className="flex-1 w-full min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 10 }}>
                            <defs>
                                <linearGradient id="neonGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={COLORS.neonLine} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={COLORS.neonLine} stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                            <XAxis 
                                dataKey="displayDate" 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                dy={10}
                                fontWeight={600}
                            />
                            <YAxis 
                                domain={[0, maxScore]} 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(v) => `${v}${unit === '%' ? '' : unit}`} 
                            />
                            <Tooltip content={<CustomTooltipTimeline unit={unit} />} cursor={{ stroke: '#ffffff1a', strokeWidth: 2 }} />
                            
                            {/* Linha de Referência da Média Geral */}
                            <ReferenceLine 
                                y={generalAccuracy} 
                                stroke={COLORS.reference} 
                                strokeDasharray="5 5" 
                                strokeWidth={2} 
                                opacity={0.6}
                                label={{ position: 'top', value: 'MÉDIA GERAL', fill: COLORS.reference, fontSize: 9, fontWeight: 800, textAnchor: 'end', dx: -10 }}
                            />
                            
                            {/* Linha da Evolução Diária */}
                            <Line 
                                type="monotoneX" 
                                dataKey="accuracy" 
                                stroke="url(#neonGradient)" 
                                strokeWidth={3} 
                                dot={{ fill: '#1e293b', stroke: COLORS.neonLine, strokeWidth: 2, r: 4 }}
                                activeDot={{ fill: COLORS.neonLine, stroke: '#fff', strokeWidth: 2, r: 6 }}
                                isAnimationActive={true}
                                animationDuration={1200}
                            >
                                <LabelList 
                                    dataKey="accuracy" 
                                    position="top" 
                                    offset={10} 
                                    formatter={(v) => Math.round(v)} 
                                    fill="#94a3b8" 
                                    fontSize={10}
                                    fontWeight={700}
                                />
                            </Line>

                            {/* Barra do Último Simulado (aparece apenas no último dia) */}
                            <Bar dataKey="lastTestAcc" barSize={16} radius={[4,4,0,0]} isAnimationActive={true} animationDuration={1200} fill={COLORS.gaugeFillValid}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.lastTestColor || COLORS.gaugeFillValid} style={{ filter: entry.lastTestColor ? `drop-shadow(0 0 6px ${entry.lastTestColor}80)` : 'none' }} />
                                ))}
                                <LabelList 
                                    dataKey="lastTestAcc" 
                                    position="right" 
                                    offset={10} 
                                    formatter={(v) => v ? Math.round(v) : ''} 
                                    fill="#fff" 
                                    fontSize={10}
                                    fontWeight={900}
                                />
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
```

---

## File: `src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx`
*Linhas: 607 | Tamanho: 33.77 KB*

```javascript
import React, { useMemo, useState, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell, Brush
} from 'recharts';
import { TrendingUp, BarChart3, HelpCircle, Zap } from 'lucide-react';
import { getSafeScore, formatValue, getSyntheticTotal } from "../../../utils/scoreHelper";
import WeeklyPerformanceChart from './WeeklyPerformanceChart';
import { computeTopRegressions, computeTrendKpi } from '../../../utils/weeklyEvolutionInsights.js';
import { APP_TIMEZONE } from '../../../utils/dateHelper';

const WeeklyTooltip = React.memo(({ active, payload, label, hiddenKeys, unit }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-950/80 border border-white/10 p-4 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl min-w-[220px] max-w-[280px] sm:max-w-none break-words whitespace-normal sm:whitespace-nowrap sm:break-normal">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">
                    Semana de {label}
                </p>
                <div className="space-y-3">
                    {payload.map((entry, idx) => {
                        const dataKey = String(entry.dataKey || '');
                        const isDelta = dataKey.startsWith('delta_');
                        const baseKey = isDelta ? dataKey.replace('delta_', '') : dataKey;

                        if (hiddenKeys[baseKey]) return null;

                        const val = entry.value;
                        if (val == null) return null;

                        const meta = entry.payload[`meta_${baseKey}`];

                        if (isDelta) {
                            const isStable = Math.abs(val) <= 2;
                            const color = entry.payload[`deltaColor_${baseKey}`] || (isStable ? '#eab308' : val > 0 ? '#10b981' : val < 0 ? '#ef4444' : '#94a3b8');
                            const prefix = val > 0 ? '+' : '';
                            const currentPct = (meta?.currPct === null || meta?.currPct === undefined || meta?.currPct === '') ? entry.payload?.[baseKey] : (Number.isFinite(Number(meta?.currPct)) ? meta.currPct : entry.payload?.[baseKey]);

                            return (
                                <div key={idx} className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span style={{ color: entry.color || '#fff' }} className="font-bold flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: entry.color }}></span>
                                            {entry.name.replace(' (Var.)', '')}
                                        </span>
                                        <span style={{ color }} className="font-mono font-black text-xs">
                                            {prefix}{formatValue(val)}{unit}
                                        </span>
                                    </div>
                                    {meta && meta.prevPct != null && Number.isFinite(Number(currentPct)) && (
                                        <div className="flex justify-between text-[8px] text-slate-500 pl-3">
                                            <span>De {formatValue(meta.prevPct)}{unit}</span>
                                            <span>
                                                Para {formatValue(currentPct)}{unit} <strong style={{ color }}>(Δ {prefix}{formatValue(val)}{unit})</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        } else {
                            return (
                                <div key={idx} className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span style={{ color: entry.color || '#fff' }} className="font-bold flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }}></span>
                                            {entry.name}
                                        </span>
                                        <span className="font-mono font-bold text-white text-xs">
                                            {formatValue(val)}{unit}
                                        </span>
                                    </div>
                                    {meta && meta.currTot > 0 && (
                                        <span className="text-[8px] text-slate-500 pl-3.5 italic">
                                            Volume: {meta.currTot} questões
                                        </span>
                                    )}
                                </div>
                            );
                        }
                    })}
                </div>
            </div>
        );
    }
    return null;
});

const getMondayStr = (dateStr) => {
    const dt = typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr.trim())
      ? new Date(`${dateStr.trim()}T12:00:00${APP_TIMEZONE}`)
        : new Date(dateStr);
    if (isNaN(dt.getTime())) return null;
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    dt.setDate(diff);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatWeek = (isoString) => {
    if (!isoString || typeof isoString !== 'string') return '--/--';
    const [year, month, day] = isoString.split('-');
    if (!year || !month || !day) return '--/--';
    return `${day}/${month}`;
};

const shortenLabel = (value, max = 18) => {
    const text = String(value || '').trim();
    if (!text) return '—';
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

export const WeeklyEvolutionView = ({
    categories,
    studyLogs = [],
    showOnlyFocus,
    focusSubjectId,
    maxScore = 100,
    minScore = 0,
    unit = '%'
}) => {
    const [viewMode, setViewMode] = useState('performance');

    // A1 FIX: Padrão idiomático do React para resetar estado derivado de props sem useEffect.
    // Em vez de setUserToggles({}) dentro de useEffect (que causa render duplo e dispara a
    // regra react-hooks/set-state-in-effect), rastreamos a "chave de foco" anterior e chamamos
    // setState DURANTE o render quando ela muda. O React descarta o render parcial e reinicia
    // com o novo estado — isso é um render único, sem o ciclo extra do useEffect.
    // Ref: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    const focusKey = `${showOnlyFocus}-${focusSubjectId}`;
    const [lastFocusKey, setLastFocusKey] = useState(focusKey);
    const [userToggles, setUserToggles] = useState({});

    if (lastFocusKey !== focusKey) {
        setLastFocusKey(focusKey);
        setUserToggles({});
    }

    const [hoveredLine, setHoveredLine] = useState(null);

    const categoriesSignature = useMemo(() => categories.map((cat) => {
        const history = Array.isArray(cat?.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat?.simuladoStats?.history || {});
        const tasks = cat?.tasks || [];
        const historyDigest = history.map((h) => [
            getMondayStr(h?.date) || 'nodate',
            Number(h?.score ?? 0),
            Number(h?.correct ?? 0),
            Number(h?.total ?? 0),
            Array.isArray(h?.topics) ? h.topics.length : 0,
            h?.taskId || ''
        ].join(':')).join('|');
        return [
            cat?.id,
            cat?.name || '',
            tasks.length,
            tasks.map((t) => `${t?.id || ''}:${t?.text || ''}`).join(','),
            historyDigest
        ].join('|');
    }).join('||'), [categories]);

    const { chartData, activeKeys, rankedKeys } = useMemo(() => {
        let itemsMap = {};

        if (!showOnlyFocus || !focusSubjectId) {
            categories.forEach(cat => {
                if (!cat?.id) return;
                const fullName = String(cat.name || 'Matéria').replace(/Direito /gi, 'D. ');
                const safeName = shortenLabel(fullName, 18);
                const safeColor = typeof cat.color === 'string' ? cat.color : '#3b82f6';
                itemsMap[cat.id] = { name: safeName, fullName: fullName, color: safeColor };
            });
        } else {
            const cat = categories.find(c => c.id === focusSubjectId);
            if (cat) {
                (cat.tasks || []).forEach(task => {
                    const tName = String(task?.text || '').replace(/^\[(.*?)\]\s*/i, '').trim();
                    if (!tName) return;
                    itemsMap[tName.toLowerCase()] = { name: shortenLabel(tName, 18), color: cat.color || '#3b82f6', fullName: tName };
                });

                const hArray = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
                hArray.forEach(h => {
                    if (h.topics && Array.isArray(h.topics)) {
                        h.topics.forEach(t => {
                            const tName = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').trim();
                            if (!tName) return;
                            if (!itemsMap[tName.toLowerCase()]) {
                                itemsMap[tName.toLowerCase()] = { name: shortenLabel(tName, 18), color: cat.color || '#3b82f6', fullName: tName };
                            }
                        });
                    } else if (h.taskId) {
                        const tName = cat.tasks?.find(task => task.id === h.taskId)?.text || 'Assunto';
                        if (!itemsMap[tName.toLowerCase()]) {
                            itemsMap[tName.toLowerCase()] = { name: shortenLabel(tName, 18), color: cat.color || '#3b82f6', fullName: tName };
                        }
                    } else {
                        if (!itemsMap['geral']) {
                            itemsMap['geral'] = { name: 'Geral', color: cat.color || '#3b82f6', fullName: 'Geral' };
                        }
                    }
                });
            }
        }

        const validIds = Object.keys(itemsMap);
        if (validIds.length === 0) return { chartData: [], activeKeys: {}, rankedKeys: [] };

        const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
        const safeMaxScore = Number.isFinite(Number(maxScore)) ? Number(maxScore) : 100;
        const lowerBound = Math.min(safeMinScore, safeMaxScore);
        const upperBound = Math.max(safeMinScore, safeMaxScore);
        const scoreRange = Math.max(1e-9, upperBound - lowerBound);
        // ✅ LOTE-02 FIX: 2 pts de estabilidade só fazem sentido em 0–100
        const stableThreshold = Math.max(0.5, scoreRange * 0.02);
        const toRatio = (score) => (Math.max(lowerBound, Math.min(upperBound, Number(score) || lowerBound)) - lowerBound) / scoreRange;
        const fromRatio = (ratio) => lowerBound + (Math.max(0, Math.min(1, Number(ratio) || 0)) * scoreRange);
        const weeksTemp = {};

        const processHistory = (historyArray, itemId) => {
            if (!Array.isArray(historyArray) || !itemId) return;
            historyArray.forEach(h => {
                const weekStr = getMondayStr(h.date);
                if (!weekStr) return;

                if (!weeksTemp[weekStr]) weeksTemp[weekStr] = { week: weekStr };
                if (!weeksTemp[weekStr][itemId]) weeksTemp[weekStr][itemId] = { correct: 0, total: 0 };

                let totalQ = Number(h.total) || 0;
                const score = getSafeScore(h, upperBound);

                if (totalQ === 0 && h.score != null) {
                    totalQ = getSyntheticTotal(maxScore);
                }

                weeksTemp[weekStr][itemId].total += totalQ;
                weeksTemp[weekStr][itemId].correct += toRatio(score) * totalQ;
            });
        };

        if (!showOnlyFocus || !focusSubjectId) {
            categories.forEach(cat => {
                const hArray = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
                processHistory(hArray, cat.id);
            });
        } else {
            const cat = categories.find(c => c.id === focusSubjectId);
            if (cat) {
                const hArray2 = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
                hArray2.forEach(h => {
                    if (h.topics && Array.isArray(h.topics)) {
                        h.topics.forEach(t => {
                            const tId = String(t.name || '').replace(/^\[(.*?)\]\s*/i, '').toLowerCase().trim();
                            const weekStr = getMondayStr(h.date);
                            if (!weekStr) return;
                            if (!weeksTemp[weekStr]) weeksTemp[weekStr] = { week: weekStr };
                            if (!weeksTemp[weekStr][tId]) weeksTemp[weekStr][tId] = { correct: 0, total: 0 };

                            let totalQ = Number(t.total) || 0;
                            const topicScore = getSafeScore(t, upperBound);
                            if (totalQ === 0 && t.score != null) {
                                totalQ = getSyntheticTotal(maxScore);
                            }
                            weeksTemp[weekStr][tId].total += totalQ;
                            weeksTemp[weekStr][tId].correct += toRatio(topicScore) * totalQ;
                        });
                    } else if (h.taskId) {
                        const tId = String(cat.tasks?.find(task => task.id === h.taskId)?.text || 'Assunto').toLowerCase().trim();
                        processHistory([h], tId);
                    } else {
                        // BUG 2 FIX: Se não tem topics nem taskId, agrupar em "geral" para não perder os dados na visualização Foco
                        processHistory([h], 'geral');
                    }
                });
            }
        }

        const sortedWeeks = Object.values(weeksTemp).sort((a, b) => a.week.localeCompare(b.week));
        if (sortedWeeks.length === 0) return { chartData: [], activeKeys: {}, rankedKeys: [] };

        const memoryByItem = {}; 

        const finalData = sortedWeeks.map(weekObj => {
            const dataPoint = {
                week: weekObj.week,
                displayDate: formatWeek(weekObj.week)
            };

            validIds.forEach(id => {
                const currentData = weekObj[id];

                if (currentData && currentData.total > 0) {
                    const ratio = currentData.correct / currentData.total;
                    const currentScore = fromRatio(ratio);
                    const safeCurrentScore = Number.isFinite(currentScore) ? currentScore : 0;
                    const currentPct = Number(Math.max(lowerBound, Math.min(upperBound, safeCurrentScore)).toFixed(2));
                    dataPoint[id] = currentPct;

                    if (memoryByItem[id] !== undefined) {
                        const prevPct = memoryByItem[id].pct;
                        const safeDelta = Number.isFinite(currentPct - prevPct) ? (currentPct - prevPct) : 0;
                        const delta = Number(safeDelta.toFixed(2));

                        const isStable = Math.abs(delta) <= stableThreshold;   // antes: <= 2
                        dataPoint[`delta_${id}`] = delta;
                        dataPoint[`deltaColor_${id}`] = isStable ? '#eab308' : (delta > 0 ? '#10b981' : '#ef4444');

                        dataPoint[`meta_${id}`] = {
                            currTot: currentData.total,
                            currPct: currentPct,
                            prevPct: prevPct,
                            prevTot: memoryByItem[id].total
                        };
                    } else {
                        dataPoint[`delta_${id}`] = null;
                        dataPoint[`deltaColor_${id}`] = '#94a3b8';
                        dataPoint[`meta_${id}`] = { currTot: currentData.total, currPct: currentPct, prevPct: null, prevTot: 0 };
                    }

                    memoryByItem[id] = { pct: currentPct, total: currentData.total };
                } else {
                    dataPoint[id] = null;
                    dataPoint[`delta_${id}`] = null;
                    dataPoint[`deltaColor_${id}`] = '#94a3b8';
                }
            });

            return dataPoint;
        });

        const volumeTracker = {};
        validIds.forEach(id => volumeTracker[id] = 0);
        finalData.forEach(week => {
            validIds.forEach(id => {
                const meta = week[`meta_${id}`];
                if (meta && Number.isFinite(Number(meta.currTot))) volumeTracker[id] += Number(meta.currTot);
            });
        });
        const rankedKeys = [...validIds].sort((a, b) => volumeTracker[b] - volumeTracker[a]);

        return { chartData: finalData, activeKeys: itemsMap, rankedKeys };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, showOnlyFocus, focusSubjectId, maxScore, minScore, categoriesSignature]);

    const keys = Object.keys(activeKeys);

    const hiddenKeys = useMemo(() => {
        const result = {};
        rankedKeys?.forEach((key, idx) => {
            const defaultHide = showOnlyFocus ? false : idx >= 6; 
            if (userToggles[key] !== undefined) {
                result[key] = userToggles[key]; 
            } else {
                result[key] = defaultHide;
            }
        });
        return result;
    }, [rankedKeys, userToggles, showOnlyFocus]);

    const topRegressions = useMemo(() => computeTopRegressions({ viewMode, chartData, keys, activeKeys, hiddenKeys }), [viewMode, chartData, keys, activeKeys, hiddenKeys]);
    const trendKpi = useMemo(() => computeTrendKpi({ chartData, keys, hiddenKeys }), [chartData, keys, hiddenKeys]);

    const handleLegendClick = useCallback((e) => {
        const dataKey = e?.dataKey;
        if (!dataKey) return;
        const keyID = String(dataKey).replace('delta_', '');
        setUserToggles(prev => ({
            ...prev,
            [keyID]: !hiddenKeys[keyID] 
        }));
    }, [hiddenKeys]);

    const handleLegendHover = useCallback((e) => {
        if (e && e.dataKey) setHoveredLine(String(e.dataKey).replace('delta_', ''));
    }, []);

    const handleLegendLeave = useCallback(() => {
        setHoveredLine(null);
    }, []);

    const renderLegendText = useCallback((value, entry) => {
        const keyID = String(entry.dataKey || '').replace('delta_', '');
        const isHidden = hiddenKeys[keyID];
        const fullName = activeKeys[keyID]?.fullName || String(value || '');
        return (
            <span 
                className={`text-[10px] font-black uppercase tracking-widest transition-opacity cursor-pointer ${isHidden ? 'opacity-20' : 'opacity-100'}`}
                title={fullName}
            >
                {String(value || '').replace(' (Var.)', '')}
            </span>
        );
    }, [hiddenKeys, activeKeys]);

    // M2 FIX: Tooltip extraído em useCallback para restaurar memoização do Recharts.
    // Arrow functions inline quebram a memoização porque criam nova referência a cada render.
    const renderWeeklyTooltip = useCallback(
        (props) => <WeeklyTooltip {...props} hiddenKeys={hiddenKeys} unit={unit} />,
        [hiddenKeys, unit]
    );


    if (chartData.length < 1) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center bg-slate-900/40 rounded-2xl border border-slate-800 p-6">
                <HelpCircle size={40} className="text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider text-center">Dados Insuficientes</p>
                <p className="text-slate-500 text-[10px] mt-2 text-center max-w-[250px]">
                    Registre pelo menos 1 semana de simulados para visualizar a curva de evolução e a variação de deltas.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full pt-4 animate-fade-in relative flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-2 gap-4 shrink-0">
                <div>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Raio-X Temporal Avançado</h4>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                        {showOnlyFocus ? 'Semanas por Assunto' : 'Semanas por Matéria'}
                    </h3>
                    {trendKpi && (
                        <p className="text-[10px] mt-1 text-slate-400 font-mono">
                            Tendência: <span className={trendKpi.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{trendKpi.delta >= 0 ? '+' : ''}{formatValue(trendKpi.delta)}{unit}</span> 
                            {' '}({trendKpi.previousN} sem. → {trendKpi.recentN} sem.)
                        </p>
                    )}
                </div>

                <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-2xl p-1">
                    <button
                        onClick={() => setViewMode('performance')}
                        aria-label="Alternar para visão de desempenho semanal"
                        aria-pressed={viewMode === 'performance'}
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-bold uppercase transition-all will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${viewMode === 'performance' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}
                    >
                        <Zap size={14} className="shrink-0" /> <span className="hidden sm:inline">Desempenho (7 dias)</span>
                    </button>
                    <button
                        onClick={() => setViewMode('evolution')}
                        aria-label="Alternar para visão de evolução semanal"
                        aria-pressed={viewMode === 'evolution'}
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-bold uppercase transition-all will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${viewMode === 'evolution' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}
                    >
                        <TrendingUp size={14} className="shrink-0" /> <span className="hidden sm:inline">Evolução</span>
                    </button>
                    <button
                        onClick={() => setViewMode('variation')}
                        aria-label="Alternar para visão de variação semanal"
                        aria-pressed={viewMode === 'variation'}
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-bold uppercase transition-all will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${viewMode === 'variation' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}
                    >
                        <BarChart3 size={14} className="shrink-0" /> <span className="hidden sm:inline">Delta</span>
                    </button>
                </div>
            </div>

            <div className="h-[380px] w-full mt-2 relative">
                {viewMode === 'performance' ? (
                    <WeeklyPerformanceChart
                        categories={categories}
                        studyLogs={studyLogs}
                        showOnlyFocus={showOnlyFocus}
                        focusSubjectId={focusSubjectId}
                        maxScore={maxScore}
                        minScore={minScore}
                        unit={unit}
                    />
                ) : (
                    <ResponsiveContainer width="100%" height="100%" minHeight={320} minWidth={1}>
                        {viewMode === 'evolution' ? (
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />

                                <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} minTickGap={15} />
                                <YAxis domain={[minScore, maxScore]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDataOverflow={true} tickFormatter={(v) => `${formatValue(v)}${unit}`} />
                                <Tooltip offset={200} content={renderWeeklyTooltip} cursor={{ stroke: '#ffffff22', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Legend verticalAlign="bottom" height={40} iconType="circle" formatter={renderLegendText} onClick={handleLegendClick} onMouseEnter={handleLegendHover} onMouseLeave={handleLegendLeave} wrapperStyle={{ paddingTop: '20px' }} />

                                {keys.map(key => {
                                    const isHovered = hoveredLine === key;
                                    const isOtherHovered = hoveredLine && hoveredLine !== key;
                                    
                                    return (
                                        <Line connectNulls
                                            key={key}
                                            type="monotoneX"
                                            dataKey={key}
                                            name={activeKeys[key].name}
                                            stroke={activeKeys[key].color}
                                            strokeWidth={isHovered ? 3.5 : (isOtherHovered ? 1.5 : 2)}
                                            strokeOpacity={isOtherHovered ? 0.4 : 1}
                                            dot={{ r: 3, strokeWidth: 1.5, stroke: activeKeys[key].color, fill: '#0f172a', strokeOpacity: isOtherHovered ? 0.4 : 1, fillOpacity: isOtherHovered ? 0.4 : 1 }}
                                            activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff', fill: activeKeys[key].color, className: 'shadow-lg', opacity: isOtherHovered ? 0.4 : 1 }}
                                            hide={hiddenKeys[key]}
                                            isAnimationActive={true}
                                            animationDuration={800}
                                            animationEasing="ease-out"
                                            style={{ transition: 'all 0.3s ease' }}
                                        />
                                    );
                                })}

                                {chartData.length > 8 && (
                                    <Brush
                                        dataKey="week"
                                        height={18}
                                        stroke="#ffffff11"
                                        fill="#0f172a"
                                        tickFormatter={formatWeek}
                                        className="text-[8px]"
                                        travellerWidth={8}
                                    />
                                )}
                            </LineChart>
                        ) : (
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />

                                <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} minTickGap={15} />
                                {/* 🎯 FIX: Uso do formatValue e correcção lógica para o sinal de mais (+) e o Zero perfeito */}
                                <YAxis 
                                    stroke="#64748b" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(v) => {
                                        const formatted = formatValue(v);
                                        if (formatted === "0.00" || formatted === "0") return `${formatted}${unit}`;
                                        return `${v > 0 ? '+' : ''}${formatted}${unit}`;
                                    }} 
                                />
                                <Tooltip offset={200} content={renderWeeklyTooltip} cursor={{ fill: '#ffffff11' }} />
                                <Legend verticalAlign="bottom" height={40} iconType="square" formatter={renderLegendText} onClick={handleLegendClick} onMouseEnter={handleLegendHover} onMouseLeave={handleLegendLeave} wrapperStyle={{ paddingTop: '20px' }} />
                                <ReferenceLine y={0} stroke="#ffffff22" />

                                {chartData.length > 8 && (
                                    <Brush
                                        dataKey="week"
                                        height={18}
                                        stroke="#ffffff11"
                                        fill="#0f172a"
                                        tickFormatter={formatWeek}
                                        className="text-[8px]"
                                        travellerWidth={8}
                                    />
                                )}

                                {keys.map(key => {
                                    const isOtherHovered = hoveredLine && hoveredLine !== key;

                                    return (
                                        <Bar
                                            key={`delta_${key}`}
                                            dataKey={`delta_${key}`}
                                            name={`${activeKeys[key].name} (Var.)`}
                                            fill={activeKeys[key].color}
                                            radius={[0, 0, 0, 0]}
                                            hide={hiddenKeys[key]}
                                            fillOpacity={isOtherHovered ? 0.4 : 1}
                                            style={{ transition: 'all 0.3s ease' }}
                                        >
                                            {chartData.map((entry, index) => {
                                                const barColor = entry[`deltaColor_${key}`] || '#94a3b8';
                                                return <Cell key={`cell-${index}`} fill={barColor} fillOpacity={isOtherHovered ? 0.4 : 0.85} />;
                                            })}
                                        </Bar>
                                    );
                                })}
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                )}
            </div>

            {viewMode === 'variation' && (
                <div className="mt-3 rounded-xl border border-rose-900/40 bg-rose-950/20 p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-300 mb-2">
                        Top Regressões {topRegressions[0]?.week ? `· Semana ${topRegressions[0].week}` : ''}
                    </p>
                    {topRegressions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {topRegressions.map(item => (
                                <div key={item.key} className="rounded-lg bg-black/30 border border-white/5 px-2 py-1.5 text-[10px] flex items-center justify-between">
                                    <span className="truncate" style={{ color: item.color }} title={item.fullName}>{item.name}</span>
                                    <span className="font-mono font-black text-rose-300">{formatValue(item.delta)}{unit}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] text-slate-400">Sem regressões visíveis no filtro atual. ✅</p>
                    )}
                </div>
            )}

            {viewMode !== 'performance' && (
                <div className="flex justify-center mt-3 opacity-60">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-md border border-slate-800 shrink-0 select-none">
                        💡 Dica: Clique nos itens da Legenda para ocultar/isolar o gráfico.
                    </p>
                </div>
            )}
        </div>
    );
};
```

---

## File: `src/components/charts/EvolutionChart/WeeklyPerformanceChart.jsx`
*Linhas: 274 | Tamanho: 12.82 KB*

```javascript
import React, { useId, useCallback } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { getDateKey, formatDuration, formatWeekdayShortPtBR } from '../../../utils/dateHelper.js';
import { getSafeScore, getSyntheticTotal } from '../../../utils/scoreHelper.js';

const WeeklyPerformanceChart = ({
    categories = [],
    studyLogs = [],
    showOnlyFocus = false,
    focusSubjectId = null,
    maxScore = 100,
    unit = '%'
}) => {
    const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const safeUnit = typeof unit === 'string' && unit.length <= 4 ? unit : '%';
    const instanceId = useId().replace(/:/g, "");
    const barGradId = `wp_barGrad_${instanceId}`;
    const neonShadowId = `wp_neonShadow_${instanceId}`;

    const chartData = React.useMemo(() => {
        const days = [];
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateKey = getDateKey(d);

            const dow = formatWeekdayShortPtBR(d);

            const dailyLogs = studyLogs.filter(log => {
                const logDate = getDateKey(log.date);
                if (logDate !== dateKey) return false;
                if (showOnlyFocus && focusSubjectId) {
                    return log.categoryId === focusSubjectId;
                }
                return true;
            });
            // 🎯 FIX: Calcular apenas os minutos puros para entregar ao Recharts
            const minutos = dailyLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);

            let correctTotal = 0;
            let questionsTotal = 0;

            categories.forEach(cat => {
                if (showOnlyFocus && focusSubjectId && cat.id !== focusSubjectId) return;

                const history = Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats?.history || {});
                history.forEach(h => {
                    const hDate = getDateKey(h.date);
                    if (hDate === dateKey) {
                        let q = Number(h.total) || 0;
                        if (q === 0 && h.score != null) {
                            q = getSyntheticTotal(safeMaxScore);
                        }
                        if (q < 1) return; 

                        const score = getSafeScore(h, safeMaxScore);
                        const weightedCorrect = (score / safeMaxScore) * q;
                        if (!Number.isFinite(weightedCorrect)) return;
                        correctTotal += weightedCorrect;
                        questionsTotal += q;
                    }
                });
            });

            const acertosRaw = questionsTotal > 0 ? (correctTotal / questionsTotal) * safeMaxScore : null;
            const safeAcertosRaw = Number.isFinite(acertosRaw) ? acertosRaw : 0;
            const acertos = acertosRaw == null
                ? null
                : Number(Math.max(0, Math.min(safeMaxScore, safeAcertosRaw)).toFixed(2)); // FIX: Clamp preventivo absoluto

            days.push({
                data: i === 0 ? "HOJE" : dow,
                fullDate: dateKey,
                minutos: minutos / 60, // 🎯 FIX: Convertemos para horas decimais para o formatDuration funcionar corretamente
                acertos
            });
        }
        return days;
    }, [categories, studyLogs, showOnlyFocus, focusSubjectId, safeMaxScore]);


    const renderTooltip = useCallback(({ active, payload, label }) => {
        if (!(active && payload && payload.length)) return null;

        // Dedup para evitar que Line e Area sobrepostos com o mesmo dataKey apareçam duas vezes
        const uniquePayload = payload
            .filter((v) => !String(v.name || '').startsWith('_'))   // ✅ LOTE-02
            .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);

        return (
            <div className="bg-slate-950/80 border border-white/10 p-3 sm:p-4 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">
                    {label === "HOJE" ? "Hoje" : label}
                </p>
                <div className="flex flex-col gap-2">
                    {uniquePayload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-6 py-0.5">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${entry.name === 'acertos' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'}`} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {entry.name === 'acertos' ? 'Acertos' : 'Horas'}
                                </span>
                            </div>
                            <span className={`text-sm sm:text-base font-black ${entry.name === 'acertos' ? 'text-emerald-400' : 'text-indigo-300'}`}>
                                {entry.value != null && Number.isFinite(Number(entry.value))
                                    ? (entry.name === 'acertos' ? `${entry.value}${safeUnit}` : formatDuration(entry.value))
                                    : 'N/A'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }, [safeUnit]);

    return (
        <div className="w-full h-[320px] sm:h-[400px] flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-1 gap-2 shrink-0">
                <div>
                    <h3 className="text-white font-black text-sm sm:text-base flex items-center gap-2">
                        📈 {showOnlyFocus ? 'Foco: Últimos 7 Dias' : 'Desempenho: Últimos 7 Dias'}
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
                        Horas de Estudo vs. Taxa de Acerto
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-slate-950/40 p-2 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                        <span className="text-[10px] font-bold text-slate-400 capitalize">Horas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                        <span className="text-[10px] font-bold text-slate-400 capitalize">Acertos</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={1}>
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                    >
                        <defs>
                            <linearGradient id={barGradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.2} />
                            </linearGradient>
                            <linearGradient id={`areaGrad_${instanceId}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#34d399" stopOpacity={0.01} />
                            </linearGradient>
                            <filter id={neonShadowId}>
                                {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                            </filter>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="2 2"
                            stroke="#1e2937"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="data"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                            dy={10}
                        />

                        <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickFormatter={(v) => formatDuration(v)}
                            domain={[0, 'auto']}
                            allowDecimals={true}
                        />

                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            tickFormatter={(v) => `${v}${safeUnit}`}
                            domain={[0, safeMaxScore]}
                            allowDataOverflow={true} // FIX: Evita quebras se o dado estourar (embora já estejamos com clamp)
                        />

                        <Tooltip
                            cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                            content={renderTooltip}
                        />

                        <Bar
                            yAxisId="left"
                            dataKey="minutos"
                            name="Tempo de Estudo"
                            fill={`url(#${barGradId})`}
                            radius={[6, 6, 0, 0]}
                            barSize={28}
                            animationDuration={1500}
                        />

                        <Area
                            yAxisId="right"
                            type="monotoneX"
                            dataKey="acertos"
                            name="_acertos_area"                 // ✅ LOTE-02
                            stroke="none"
                            fill={`url(#areaGrad_${instanceId})`}
                            animationDuration={1500}
                            connectNulls={true}
                            legendType="none"
                            tooltipType="none" // ✅ LOTE-02
                        />

                        {/* Bottom Layer: Glow effect */}
                        <Line
                            yAxisId="right"
                            type="monotoneX"
                            dataKey="acertos"
                            name="_acertos_glow"                 // ✅ LOTE-02
                            stroke="#34d399"
                            strokeWidth={7}
                            strokeOpacity={0.3}
                            dot={false}
                            activeDot={false}
                            strokeLinecap="round"
                            animationDuration={1500}
                            connectNulls={true}
                            legendType="none"
                            tooltipType="none" // ✅ LOTE-02
                        />
                        {/* Top Layer: Main Line */}
                        <Line
                            yAxisId="right"
                            type="monotoneX"
                            dataKey="acertos"
                            name="acertos"
                            stroke="#34d399"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#34d399', strokeWidth: 2, stroke: '#0f172a' }}
                            activeDot={{ r: 7, strokeWidth: 0, fill: '#10b981', className: "animate-pulse shadow-lg" }}
                            strokeLinecap="round"
                            animationDuration={1500}
                            connectNulls={true}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default WeeklyPerformanceChart;
```

---

## File: `src/hooks/useChartData.js`
*Linhas: 385 | Tamanho: 16.88 KB*

```javascript
import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, BAYESIAN_DECAY_FACTOR } from '../engine/stats';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

const getHistoryArray = (cat) => Object.values(cat?.simuladoStats?.history || EMPTY_OBJECT).filter(Boolean);

const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

function buildCumulativeStatsPerDate(history, sortedDates, maxScore = 100) {
    const aggregatedHistoryByDateMap = new Map();

    for (const h of history) {
        const key = getDateKey(getHistoryDate(h));
        if (!key) continue;
        const existing = aggregatedHistoryByDateMap.get(key);
        const rawTotal = Number(h?.total) || 0;
        const rawCorrect = Number(h?.correct) || 0;
        const score = getSafeScore(h, maxScore);
        const safeScore = Number.isFinite(score) ? score : 0;   // ✅ LOTE-01

        let compTotal = rawTotal;
        let compCorrect = rawTotal > 0 ? Math.round((safeScore / maxScore) * rawTotal) : rawCorrect;
        if (rawTotal === 0 && h?.score != null) {
            compTotal = getSyntheticTotal(maxScore);
            const pct = Math.min(1, Math.max(0, safeScore / maxScore));
            compCorrect = Math.round(pct * compTotal);
        }
        // ✅ LOTE-01 FIX: correct ∈ [0, total] e nunca NaN
        compCorrect = Math.max(0, Math.min(compTotal, Number.isFinite(compCorrect) ? compCorrect : 0));

        if (existing) {
            existing.compCorrect = (existing.compCorrect || 0) + compCorrect;
            existing.compTotal = (existing.compTotal || 0) + compTotal;
            existing.total += rawTotal;
            existing.correct += rawTotal > 0
                ? Math.max(0, Math.min(rawTotal, Math.round((safeScore / maxScore) * rawTotal)))
                : Math.max(0, rawCorrect);
            // ✅ LOTE-01 FIX: divisão por zero
            existing.score = existing.compTotal > 0 ? (existing.compCorrect / existing.compTotal) * maxScore : 0;
        } else {
            aggregatedHistoryByDateMap.set(key, {
                ...h,
                date: key,
                correct: rawTotal > 0 ? Math.round((safeScore / maxScore) * rawTotal) : rawCorrect,
                total: rawTotal,
                compCorrect,
                compTotal,
                score: safeScore
            });
        }
    }

    const aggregatedHistory = Array.from(aggregatedHistoryByDateMap.values()).sort((a, b) => {
        const dA = normalizeDate(a.date);
        const dB = normalizeDate(b.date);
        return (dA?.getTime() || 0) - (dB?.getTime() || 0);
    });

    const dateToStats = {};
    let accumulated = [];
    let histIdx = 0;

    // Bayesian accumulators — Prior Beta(1,1) Neutral Laplace
    let bayAlpha = 1;
    let bayBeta = 1;
    let maxAlphaEver = 1;
    const DECAY_FACTOR = BAYESIAN_DECAY_FACTOR || 0.985; // 🎯 MATH SYNC: Fator central do engine (stats.js)

    for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];

        while (histIdx < aggregatedHistory.length) {
            const key = aggregatedHistory[histIdx].date;
            if (key && key <= date) {
                // 🎯 BAYESIAN DECAY: Aplica o decaimento baseado no gap temporal
                const entry = aggregatedHistory[histIdx];
                const entryDate = normalizeDate(entry.date);
                const prevDate = histIdx > 0 ? normalizeDate(aggregatedHistory[histIdx - 1].date) : entryDate;
                const gapDays = Math.max(1, Math.floor((entryDate - prevDate) / (1000 * 60 * 60 * 24)));

                if (histIdx > 0) {
                    const entryDecay = Math.pow(DECAY_FACTOR, gapDays);

                    // 🎯 DRIFT BAYESIANO: Preservar o ratio atual durante o decaimento.
                    if (entryDecay < 1.0) {
                        const currentN = bayAlpha + bayBeta;
                        const currentP = bayAlpha / currentN;
                        const newN = Math.max(2, currentN * entryDecay);
                        bayAlpha = newN * currentP;
                        bayBeta = newN * (1 - currentP);
                    }

                    // AMNÉSIA BAYESIANA: Piso de retenção permanente (30% do maior alpha já alcançado)
                    const retentionFloor = maxAlphaEver * 0.3;
                    if (bayAlpha < retentionFloor) {
                        const currentN = bayAlpha + bayBeta;
                        const currentP = (currentN > 0 && bayAlpha > 0) ? bayAlpha / currentN : 0.01;
                        const safeP = Math.min(0.999999, Math.max(0.000001, currentP));
                        bayAlpha = retentionFloor;
                        bayBeta = bayAlpha * ((1 - safeP) / safeP);
                    }
                }

                // entry já foi declarado acima na linha 55
                // Usa os valores computados (com sintéticos) para estabilidade Bayesiana
                let total = entry.compTotal !== undefined ? entry.compTotal : (Number(entry.total) || 0);
                let correct = entry.compCorrect !== undefined ? entry.compCorrect : (Number(entry.correct) || 0);

                // LOGIC-1 FIX: Fallback para entradas sem total/correct no gráfico
                // BUG 4 FIX: Use maxScore instead of hardcoded 100.
                // FIX BUG 1 (Matemática): Consistência Bayesiana para entradas percentuais
                if (total === 0 && entry.score != null) {
                    const pct = Math.min(1, Math.max(0, Number(entry.score) / maxScore));
                    total = getSyntheticTotal(maxScore);
                    correct = Math.round(pct * total);
                }

                if (total >= 1) {
                    bayAlpha += Number(correct);
                    bayBeta += (Number(total) - Number(correct));
                    if (bayAlpha > maxAlphaEver) maxAlphaEver = bayAlpha;
                }
                accumulated.push(entry);
                histIdx++;
            } else {
                break;
            }
        }
        if (accumulated.length > 0) {
            // BUG 4b FIX: Propagate maxScore to computeCategoryStats and computeBayesianLevel
            const lastEntry = accumulated.length > 0 ? accumulated[accumulated.length - 1] : null;
            const bayStats = computeBayesianLevel(accumulated, bayAlpha, bayBeta, maxScore, {
                referenceDate: date,
                lastEventDate: lastEntry ? lastEntry.date : null
            });
            dateToStats[date] = {
                stats: computeCategoryStats(accumulated, 100, 60, maxScore),
                last: accumulated[accumulated.length - 1],
                bayesian: {
                    mean: bayStats.mean,
                    ciLow: bayStats.ciLow,
                    ciHigh: bayStats.ciHigh,
                    alpha: bayAlpha,
                    beta: bayBeta,
                },
            };
        }
    }
    return dateToStats;
}

export function useChartData(categories = EMPTY_ARRAY, weights = EMPTY_OBJECT, maxScore = 100) {
    const categoriesVersion = useMemo(() => categories.map((cat) => {
        const history = getHistoryArray(cat);
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : EMPTY_ARRAY;
        const histDigest = history.map((h) => [
            getDateKey(getHistoryDate(h)) || 'nodate',
            Number(h?.score ?? 0),
            Number(h?.correct ?? 0),
            Number(h?.total ?? 0),
            Array.isArray(h?.topics) ? h.topics.length : 0,
            h?.taskId || ''
        ].join(':')).join('|');
        return [cat?.id || '', cat?.name || '', tasks.length, histDigest].join('::');
    }).join('||'), [categories]);

    const activeCategories = useMemo(() => {
        let valid = categories.filter(c => {
            const hist = c.simuladoStats?.history;
            return hist && Object.values(hist).length > 0;
        });

        valid.sort((a, b) => {
            const historyA = getHistoryArray(a);
            const historyB = getHistoryArray(b);
            const volA = historyA.reduce((sum, h) => sum + (Number(h.total) || 0), 0);
            const volB = historyB.reduce((sum, h) => sum + (Number(h.total) || 0), 0);
            return volB - volA;
        });

        return valid;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, categoriesVersion]);

    const timeline = useMemo(() => {
        if (!activeCategories.length) return [];

        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            getHistoryArray(cat).forEach(h => {
                const dateKey = getDateKey(getHistoryDate(h));
                if (dateKey) allDatesSet.add(dateKey);
            });
        });

        const sortedDates = Array.from(allDatesSet).sort();
        const dates = sortedDates;
        const dataByDate = {};

        dates.forEach((date) => {
            const [, month, day] = date.split("-");
            dataByDate[date] = {
                date,
                displayDate: `${day}/${month}`
            };
        });

        activeCategories.forEach(cat => {
            const history = getHistoryArray(cat).sort((a, b) => {
                const dA = normalizeDate(getHistoryDate(a));
                const dB = normalizeDate(getHistoryDate(b));
                return (dA?.getTime() || 0) - (dB?.getTime() || 0);
            });
            if (!history.length) return;

            const cumulativeByDate = buildCumulativeStatsPerDate(history, dates, maxScore);

            const exactByDate = {};
            history.forEach(h => {
                const key = getDateKey(getHistoryDate(h));
                if (!key) return;
                if (!exactByDate[key]) exactByDate[key] = { correct: 0, total: 0, compCorrect: 0, compTotal: 0 };

                const rawTotal = Number(h.total) || 0;
                const rawC = Number(h.correct) || 0;
                const score = getSafeScore(h, maxScore);
                if (!Number.isFinite(score)) return;   // ✅ LOTE-01 FIX
                const corrNorm = rawTotal > 0
                    ? Math.max(0, Math.min(rawTotal, Math.round((score / maxScore) * rawTotal)))
                    : Math.max(0, rawC);

                let compTotal = rawTotal;
                let compCorrect = corrNorm;
                if (rawTotal === 0 && h.score != null) {
                    compTotal = getSyntheticTotal(maxScore);
                    const pct = Math.min(1, Math.max(0, score / maxScore));
                    compCorrect = Math.round(pct * compTotal);
                }

                exactByDate[key].correct += corrNorm;
                exactByDate[key].total += rawTotal;
                exactByDate[key].compCorrect += compCorrect;
                exactByDate[key].compTotal += compTotal;
            });

            dates.forEach(date => {
                const snap = cumulativeByDate[date];
                if (!snap) return;

                const { stats } = snap;
                const exact = exactByDate[date];

                const correct = exact ? exact.correct : 0;
                const total = exact ? exact.total : 0;

                const rawDailyScore = exact && exact.compTotal >= 1
                    ? (exact.compCorrect / exact.compTotal) * maxScore
                    : (exact && snap?.last?.score != null ? getSafeScore(snap.last, maxScore) : null);

                dataByDate[date] = {
                    ...dataByDate[date],
                    [`raw_correct_${cat.id}`]: correct,
                    [`raw_total_${cat.id}`]: total,
                    [`raw_${cat.id}`]: rawDailyScore,
                    [`bay_${cat.id}`]: snap.bayesian ? (Number(snap.bayesian.mean) || 0) : null,
                    [`bay_ci_low_${cat.id}`]: snap.bayesian ? (Number(snap.bayesian.ciLow) || 0) : 0,
                    [`bay_ci_high_${cat.id}`]: snap.bayesian ? (Number(snap.bayesian.ciHigh) || 0) : 0,
                    [`stats_${cat.id}`]: stats ? (Number(stats.mean) || 0) : 0,
                    [`trend_${cat.id}`]: stats ? (Number(stats.trendValue) || 0) : 0,
                    [`trend_status_${cat.id}`]: stats ? stats.trend : 'stable',
                    global_total: (Number(dataByDate[date].global_total) || 0) + total
                };
            });

            // 🎯 RIGOR-10 FIX: Removed direct object mutation that caused "object is not extensible" errors.
            // Component-level decoration should happen in the UI layer or via useMemo to preserve immutability.
            // (Decoration logic for currentLevels removed as it was unused and violating prop immutability)

        });


        return dates.map(d => dataByDate[d]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategories, weights, maxScore, categoriesVersion]);

    const heatmapData = useMemo(() => {
        if (!activeCategories.length) return { dates: [], rows: [] };

        const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            getHistoryArray(cat).forEach(h => {
                const dateKey = getDateKey(getHistoryDate(h));
                if (dateKey) allDatesSet.add(dateKey);
            });
        });

        const sortedDates = Array.from(allDatesSet).sort();
        const datesToUse = sortedDates.slice(-60);
        const dates = datesToUse.map(dateStr => {
            const d = normalizeDate(dateStr);
            const [_y, m, day] = dateStr.split('-');
            return {
                key: dateStr,
                dayName: DAY_NAMES[d.getDay()],
                label: `${day}/${m}`,
                isWeekend: d.getDay() === 0 || d.getDay() === 6,
            };
        });

        const rows = activeCategories.map(cat => {
            const dayMap = {};
            getHistoryArray(cat).forEach(h => {
                const key = getDateKey(getHistoryDate(h));
                if (!key) return;
                if (!dayMap[key]) dayMap[key] = { correct: 0, total: 0 };
                let tot = Number(h.total) || 0;
                let raw = Number(h.correct) || 0;
                let corrNorm;
                const score = getSafeScore(h, maxScore);
                if (!Number.isFinite(score)) return;   // ✅ LOTE-01 FIX
                if (h.score != null && tot === 0) {
                    // BUG 4 FIX: No heatmap, não injetamos volume sintético para não sujar o visual
                    // de questões totais, mas mostramos a cor/porcentagem calculada.
                    tot = 1; // Volume mínimo para exibir a cor
                    corrNorm = score / maxScore; // Sem Math.round para preservar a exatidão (ex: 0.75 -> 75%)
                } else {
                    corrNorm = tot > 0 ? Math.round((score / maxScore) * tot) : raw;
                }
                dayMap[key].correct += corrNorm;
                dayMap[key].total += tot;
            });

            const cells = datesToUse.map(dateStr => {
                const entry = dayMap[dateStr];
                if (!entry || entry.total === 0) return null;
                return {
                    pct: (entry.correct / entry.total) * 100,
                    correct: entry.correct,
                    total: entry.total,
                };
            });

            return { cat, cells };
        });

        return { dates, rows };
    }, [activeCategories, maxScore]);

    const globalMetrics = useMemo(() => {
        let totalQuestions = 0;
        let totalCorrect = 0;
        activeCategories.forEach(cat => {
            getHistoryArray(cat).forEach(h => {
                let tot = Number(h.total) || 0;
                const score = getSafeScore(h, maxScore);
                if (!Number.isFinite(score)) return;   // ✅ LOTE-01 FIX
                let corrNorm;
                if (tot === 0 && h.score != null) {
                    tot = 1;
                    corrNorm = (score / maxScore) * tot;
                } else {
                    const raw = Number(h.correct) || 0;
                    corrNorm = tot > 0 ? Math.round((score / maxScore) * tot) : raw;
                }
                totalQuestions += tot;
                totalCorrect += corrNorm;
            });
        });
        const globalAccuracy = (totalQuestions > 0) ? (totalCorrect / totalQuestions) * 100 : 0;
        return { totalQuestions, totalCorrect, globalAccuracy: Number.isFinite(globalAccuracy) ? globalAccuracy : 0 };
    }, [activeCategories, maxScore]);

    return {
        activeCategories,
        timeline,
        heatmapData,
        globalMetrics
    };
}
```

---

## File: `src/hooks/useMonteCarloStats.js`
*Linhas: 1313 | Tamanho: 41.54 KB*

```javascript
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo';
import { computeNonLinearTrend } from '../engine/projection';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { normalCDF_complement } from '../engine/math/gaussian.js';
import {
  shrinkProbabilityToNeutral,
  recordPredictionEvent,
  backfillObservedFromSimulados,
  computeCalibrationSummary
} from '../utils/calibration.js';
import {
  getConfidenceTier,
  buildHumanExplanation,
  detectPerformanceDrift,
  humanizeVolatility,
  validatePrediction
} from '../utils/explanationEngine.js';
import { getFlashcardImmunity } from '../utils/analytics.js';
import {
  VOLATILITY_REGULARIZATION_FACTOR,
  INFORMATIVE_PRIOR_MAX_STRENGTH,
  MAX_CALIBRATION_PENALTY,
  CALIBRATION_LAMBDA_DAYS,
  sanitizeWeightUnit,
  regularizeVolatility,
  computeCalibrationPenalty,
  generateAnalyticsStats
} from '../engine/analyticsStats.js';

const EMPTY_ARRAY = [];
const BASE_SIMULATIONS = 5000;
const LOG_DAMPING_FACTOR = 45;

const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

// FIX: encolhimento simétrico de probabilidade extrema em direção ao neutro
const shrinkToNeutral = (p, factor, neutral = 50) => {
  const safeP = Number.isFinite(p) ? p : neutral;
  const safeFactor = clamp(factor, 0, 1);
  return neutral + (safeP - neutral) * (1 - safeFactor);
};

export function useMonteCarloStats({
  categories,
  goalDate,
  targetScore,
  timeIndex,
  timelineDates,
  minScore,
  maxScore,
  effectiveSimulateToday,
  simuladoRows: propSimuladoRows
}) {
  const activeId = useAppStore(state => state.appState?.activeId);

  const weights = useAppStore(useShallow(state => state.appState?.contests?.[activeId]?.mcWeights || {}));
  const equalWeightsMode = useAppStore(state => state.appState.mcEqualWeights ?? true);

  const mcHistory = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.monteCarloHistory;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const flashcardDecks = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.flashcardDecks;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const historicalCutoffs = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.historicalCutoffs;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const contest = useAppStore(state => state.appState?.contests?.[activeId]);

  const calibrationEvents = useAppStore(useShallow(state => {
    const evs = state.appState?.contests?.[activeId]?.calibrationEvents;
    return Array.isArray(evs) ? evs : Object.values(evs || {});
  }));

  const examDurationMinutes = useAppStore(state => state.appState?.contests?.[activeId]?.examDurationMinutes || 240);
  const defaultExamTotalQuestions = useAppStore(state => state.appState?.contests?.[activeId]?.examTotalQuestions || 100);

  const rawSimuladoRows = useMemo(() => {
    if (propSimuladoRows) return propSimuladoRows;
    return contest?.simuladoRows || [];
  }, [propSimuladoRows, contest?.simuladoRows]);

  const calibrationSummary = useMemo(() => {
    if (calibrationEvents.length < 3) return null;

    try {
      return computeCalibrationSummary(calibrationEvents, { bins: 6 });
    } catch {
      return null;
    }
  }, [calibrationEvents]);

  const modelHealth = useMemo(() => {
    if (!calibrationSummary) return 0.5;

    const brierHealth = Math.max(0, Math.min(1, 1 - (calibrationSummary.avgBrier - 0.12) / 0.2));
    const trendHealth = calibrationSummary.trend === 'improving'
      ? 0.2
      : (calibrationSummary.trend === 'degrading' ? -0.2 : 0);

    return Math.max(0.1, Math.min(1, (brierHealth + 0.5 + trendHealth) / 1.5));
  }, [calibrationSummary]);

  const modelWeight = useMemo(() => {
    if (!calibrationSummary || !calibrationSummary.avgBrier) return 0.25;

    const brier = Math.max(0.12, Math.min(0.3, calibrationSummary.avgBrier));
    return Math.max(0.1, Math.min(0.45, 0.25 + (0.18 - brier) * 2.5));
  }, [calibrationSummary]);

  const dynamicSimulations = useMemo(() => {
    let sims = BASE_SIMULATIONS;

    if (calibrationSummary && calibrationSummary.avgBrier > 0.2) {
      sims = Math.min(15000, BASE_SIMULATIONS + Math.floor((calibrationSummary.avgBrier - 0.18) * 20000));
    }

    if (modelHealth > 0.8) {
      sims = Math.max(2000, Math.floor(sims * 0.8));
    } else if (modelHealth < 0.4) {
      sims = Math.min(20000, Math.floor(sims * 1.3));
    }

    return sims;
  }, [calibrationSummary, modelHealth]);

  const dynamicSimulationsRef = useRef(dynamicSimulations);
  useEffect(() => {
    dynamicSimulationsRef.current = dynamicSimulations;
  }, [dynamicSimulations]);

  const modelWeightRef = useRef(modelWeight);
  useEffect(() => {
    modelWeightRef.current = modelWeight;
  }, [modelWeight]);

  const setWeights = useAppStore(state => state.setMonteCarloWeights);
  const recordMonteCarloSnapshot = useAppStore(state => state.recordMonteCarloSnapshot);
  const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);

  const activeCategories = useMemo(() =>
    categories.filter(c => {
      const h = c.simuladoStats?.history;
      const hLen = h ? (Array.isArray(h) ? h.length : Object.values(h).length) : 0;
      return hLen > 0;
    }),
    [categories]
  );

  const getEqualWeights = useCallback(() => {
    if (activeCategories.length === 0) return {};

    const newWeights = {};
    activeCategories.forEach(cat => {
      newWeights[cat.id || cat.name] = 1;
    });

    return newWeights;
  }, [activeCategories]);

  const effectiveWeights = useMemo(() => {
    if (equalWeightsMode) return getEqualWeights();
    if (!weights) return getEqualWeights();

    const weightsMap = {};

    activeCategories.forEach(cat => {
      const stored = weights[cat.id || cat.name];
      const w = sanitizeWeightUnit(stored);
      weightsMap[cat.id || cat.name] = (stored !== undefined && stored !== null) ? Math.max(0, w) : 1;
    });

    return weightsMap;
  }, [equalWeightsMode, weights, activeCategories, getEqualWeights]);

  const [debouncedTarget, setDebouncedTarget] = useState(targetScore);
  const [debouncedWeights, setDebouncedWeights] = useState(() => effectiveWeights);

  const lastRecordedGlobalPredRef = useRef('');
  const lastRecordedSubjectPredsRef = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTarget(targetScore), 300);
    return () => clearTimeout(timer);
  }, [targetScore]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedWeights(effectiveWeights), 300);
    return () => clearTimeout(timer);
  }, [effectiveWeights]);

  const projectDays = useMemo(() => {
    if (effectiveSimulateToday) return 0;
    if (!goalDate) return 30;

    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (timeIndex >= 0 && timeIndex < timelineDates.length) {
      currentDate = new Date(timelineDates[timeIndex] + 'T12:00:00');
    }

    let goal;
    if (typeof goalDate === 'string') {
      goal = normalizeDate(goalDate);
    } else {
      goal = new Date(goalDate);
    }

    goal.setHours(0, 0, 0, 0);

    if (isNaN(goal.getTime())) return 30;

    const diffTime = goal.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const safeDays = diffDays > 0 ? diffDays : 0;

    return Math.min(3650, safeDays);
  }, [goalDate, effectiveSimulateToday, timeIndex, timelineDates]);

  const pureStatsData = useMemo(() => {
    return generateAnalyticsStats({
      categories,
      debouncedWeights,
      timeIndex,
      timelineDates,
      minScore,
      maxScore,
      simuladoRows: rawSimuladoRows
    });
  }, [categories, debouncedWeights, timeIndex, timelineDates, minScore, maxScore, rawSimuladoRows]);

  const calibrationPenalty = useMemo(() => {
    let pen = computeCalibrationPenalty(
      mcHistory,
      pureStatsData?.globalHistory,
      maxScore,
      calibrationSummary
    );

    if (modelHealth < 0.6) {
      pen = Math.min(MAX_CALIBRATION_PENALTY, pen * (1 + (0.6 - modelHealth)));
    }

    return pen;
  }, [mcHistory, pureStatsData?.globalHistory, maxScore, calibrationSummary, modelHealth]);

  const statsData = useMemo(() => {
    if (!pureStatsData) return null;

    if (calibrationPenalty <= 0) {
      return { ...pureStatsData, calibrationPenalty: 0 };
    }

    const aleatoricFloor = maxScore * 0.02;

    const epistemicPooled = Math.max(0, pureStatsData.pooledSD - aleatoricFloor);
    const calibratedPooledSD = aleatoricFloor + (epistemicPooled * (1 + calibrationPenalty * 2.5));

    const epistemicDaily = Math.max(0, pureStatsData.dailySD - aleatoricFloor);
    const calibratedDailySD = aleatoricFloor + (epistemicDaily * (1 + calibrationPenalty * 2.5));

    return {
      ...pureStatsData,
      pooledSD: calibratedPooledSD,
      dailySD: calibratedDailySD,
      rawPooledSD: pureStatsData.pooledSD,
      calibrationPenalty
    };
  }, [pureStatsData, calibrationPenalty, maxScore]);

  const pureStatsHash = pureStatsData?.statsHash || 'null';

  const pureStatsDataRef = useRef(pureStatsData);
  useEffect(() => {
    pureStatsDataRef.current = pureStatsData;
  }, [pureStatsData]);

  const { runAnalysis } = useMonteCarloWorker();
  const [simulationData, setSimulationData] = useState({ status: 'waiting', missing: 'data' });

  useEffect(() => {
    if (!rawSimuladoRows || rawSimuladoRows.length === 0) return;
    if (!calibrationEvents || calibrationEvents.length === 0) return;

    try {
      const backfilled = backfillObservedFromSimulados(
        calibrationEvents,
        rawSimuladoRows,
        statsData?.categoryStats || [],
        maxScore
      );

      const changed = JSON.stringify(backfilled.slice(-3)) !== JSON.stringify(calibrationEvents.slice(-3));

      if (changed) {
        const setD = useAppStore.getState().setData;
        if (setD) {
          setD(c => ({ ...c, calibrationEvents: backfilled }));
        }
      }
    } catch {
      // ignore
    }
  }, [rawSimuladoRows, maxScore, calibrationEvents, statsData?.categoryStats]);

  useEffect(() => {
    const pureStatsData = pureStatsDataRef.current;
    if (!pureStatsData) return;

    let totalPoints = 0;
    pureStatsData.categoryStats.forEach(cat => totalPoints += cat.n || 1);
    if (totalPoints < 1) return;

    let cancelled = false;

    const isFuture = projectDays > 0;
    const domain = Math.max(1e-6, maxScore - minScore);

    const { globalImmunityFactor, subjectImmunityMap } = getFlashcardImmunity(flashcardDecks);

    const applyConservativeTrendCap = (result) => {
      if (
        result &&
        result.trendType === 'log_time_available' &&
        Number.isFinite(result.projectedMean) &&
        Number.isFinite(result.currentMean) &&
        result.projectedMean > result.currentMean
      ) {
        // FIX: remove o boost otimista de +10% e aplica apenas teto conservador
        result.projectedMean = Math.min(
          result.projectedMean,
          result.currentMean + (domain * 0.15)
        );
      }

      return result;
    };

    const doAnalysis = async () => {
      try {
        let result;

        if (isFuture && pureStatsData.globalHistory?.length > 0) {
          const regularizedSD = regularizeVolatility(
            pureStatsData.dailySD,
            projectDays,
            pureStatsData.globalHistory.length,
            domain
          );

          const subjectsOpts = pureStatsData.categoryStats.map(c => {
            const subjName = c.name || c.key || '';
            const immunity = subjectImmunityMap[subjName.toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.volatility ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScore,
              minScore: minScore,
              immunityFactor: immunity
            };
          });

          let totalGlobalTimeSpent = 0;
          let totalGlobalTimedQuestions = 0;

          pureStatsData.categoryStats.forEach(c => {
            const histArray = (c.simuladoStats && Array.isArray(c.simuladoStats.history))
              ? c.simuladoStats.history
              : [];

            histArray.forEach(h => {
              if (h.timeSpent && h.timedQuestoes) {
                totalGlobalTimeSpent += Number(h.timeSpent);
                totalGlobalTimedQuestions += Number(h.timedQuestoes);
              }
            });
          });

          const globalAvgSeconds = totalGlobalTimedQuestions > 0
            ? (totalGlobalTimeSpent / totalGlobalTimedQuestions)
            : 0;

          const projectedTotalTimeSeconds = defaultExamTotalQuestions * globalAvgSeconds;

          result = await runAnalysis({
            values: pureStatsData.globalHistory,
            dates: pureStatsData.globalHistory.map(h => h.date),
            meta: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            projectionDays: projectDays,
            forcedVolatility: regularizedSD,
            forcedBaseline: pureStatsData.bayesianMean,
            currentMean: pureStatsData.bayesianMean,
            minScore,
            maxScore,
            subjects: subjectsOpts,
            projectedTotalTimeSeconds,
            examDurationMinutes,
            flashcardImmunity: globalImmunityFactor
          });
        } else {
          const subjectsOpts = pureStatsData.categoryStats.map(c => {
            const subjName = c.name || c.key || '';
            const immunity = subjectImmunityMap[subjName.toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.bayesianSd ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScore,
              minScore: minScore,
              immunityFactor: immunity
            };
          });

          const normalPayload = {
            mode: 'normal',
            mean: pureStatsData.bayesianMean,
            sd: pureStatsData.pooledSD,
            targetScore: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            currentMean: pureStatsData.bayesianMean,
            bayesianCI: pureStatsData.bayesianCI,
            minScore,
            maxScore,
            subjects: subjectsOpts,
            flashcardImmunity: globalImmunityFactor
          };

          // Compatibilidade dupla:
          // 1) tenta API por objeto
          // 2) se não retornar probabilidade válida, tenta API posicional antiga
          result = await runAnalysis(normalPayload);

          if (!result || result.probability == null) {
            // ✅ LOTE-01 FIX: fallback síncrono com a MESMA API de objeto
            result = simulateNormalDistribution({ ...normalPayload, historicalCutoffs });
          }
        }

        if (!cancelled) {
          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          setSimulationData({ status: 'ready', data: result });

          try {
            const setDataFn = useAppStore.getState().setData;

            if (setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent(null, {
                  timestamp: Date.now(),
                  probability: Number(result.probability) / 100,
                  targetScore: debouncedTarget,
                  sims: result.simulationCount,
                  effectiveN: result.diagnostics?.effectiveN,
                  category: 'global'
                });

                if (ev) {
                  setDataFn(contest => {
                    const evs = Array.isArray(contest.calibrationEvents) ? contest.calibrationEvents.slice() : [];
                    evs.push(ev);
                    return { ...contest, calibrationEvents: evs.slice(-200) };
                  });
                }
              }
            }
          } catch {
            // best effort
          }
        }
      } catch (err) {
        console.warn('[MC Worker] Simulation failed, using sync fallback:', err);

        if (!cancelled) {
          let result;

          const regularizedSD = isFuture && pureStatsData.globalHistory?.length > 0
            ? regularizeVolatility(
                pureStatsData.dailySD,
                projectDays,
                pureStatsData.globalHistory.length,
                domain
              )
            : pureStatsData.dailySD;

          if (isFuture && pureStatsData.globalHistory?.length > 0) {
            const subjectsOpts = pureStatsData.categoryStats.map(c => {
              const subjName = c.name || c.key || '';
              const immunity = subjectImmunityMap[subjName.toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.volatility ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScore,
                minScore: minScore,
                immunityFactor: immunity
              };
            });

            result = runMonteCarloAnalysis({
              values: pureStatsData.globalHistory,
              dates: pureStatsData.globalHistory.map(h => h.date),
              meta: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              projectionDays: projectDays,
              forcedVolatility: regularizedSD,
              forcedBaseline: pureStatsData.bayesianMean,
              currentMean: pureStatsData.bayesianMean,
              minScore,
              maxScore,
              subjects: subjectsOpts,
              simuladoRows: rawSimuladoRows,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor
            });
          } else {
            const subjectsOpts = pureStatsData.categoryStats.map(c => {
              const subjName = c.name || c.key || '';
              const immunity = subjectImmunityMap[subjName.toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.bayesianSd ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScore,
                minScore: minScore,
                immunityFactor: immunity
              };
            });

            result = simulateNormalDistribution({
              mean: pureStatsData.bayesianMean,
              sd: pureStatsData.pooledSD,
              targetScore: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              currentMean: pureStatsData.bayesianMean,
              bayesianCI: pureStatsData.bayesianCI,
              historicalCutoffs,
              subjects: subjectsOpts,
              minScore,
              maxScore,
              simuladoRows: rawSimuladoRows,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor,
              historyLength: pureStatsData.globalHistory?.length || 0
            });
          }

          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          setSimulationData({ status: 'ready', data: result });

          try {
            const setDataFn = useAppStore.getState().setData;

            if (setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent(null, {
                  timestamp: Date.now(),
                  probability: Number(result.probability) / 100,
                  targetScore: debouncedTarget,
                  sims: result.simulationCount,
                  effectiveN: result.diagnostics?.effectiveN,
                  category: 'global'
                });

                if (ev) {
                  setDataFn(contest => {
                    const evs = Array.isArray(contest.calibrationEvents) ? contest.calibrationEvents.slice() : [];
                    evs.push(ev);
                    return { ...contest, calibrationEvents: evs.slice(-200) };
                  });
                }
              }
            }
          } catch {
            // best effort
          }
        }
      }
    };

    const timerId = setTimeout(doAnalysis, 150);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [
    pureStatsHash,
    runAnalysis,
    debouncedTarget,
    projectDays,
    minScore,
    maxScore,
    historicalCutoffs,
    rawSimuladoRows,
    statsData?.estimatedRho,
    examDurationMinutes,
    defaultExamTotalQuestions,
    flashcardDecks
  ]);

  const probabilityData = useMemo(() => {
    const rawProbability = simulationData?.data?.probability ?? 0;

    // FIX: neutral da probabilidade deve ser 50%, não a média bayesiana da nota
    let adjustedProb = shrinkProbabilityToNeutral(rawProbability, calibrationPenalty, 50, 0.5);

    let confFactor = 0;

    if (
      simulationData?.data?.ciConformalLow != null &&
      simulationData?.data?.ciConformalHigh != null
    ) {
      const confWidth = simulationData.data.ciConformalHigh - simulationData.data.ciConformalLow;

      if (confWidth > 0) {
        confFactor = Math.min(0.2, confWidth / (maxScore * 1.2)) * (1 - modelWeight);

        // FIX: shrink simétrico (tanto >50 quanto <50)
        adjustedProb = shrinkToNeutral(adjustedProb, confFactor, 50);
      }
    }

    let finalProb = adjustedProb;

    if (modelHealth > 0.7) {
      const trust = (modelHealth - 0.7) / 0.3;
      finalProb = finalProb * (1 - trust * 0.5) + (rawProbability * (1 - calibrationPenalty * 0.5)) * (trust * 0.5);
    }

    // FIX: saúde do modelo não deve mascarar risco crítico puxando tudo para 50.
    // Aplicamos apenas uma suavização leve quando a saúde está baixa.
    let healthProb = finalProb;

    if (modelHealth < 0.5) {
      const healthFactor = (0.5 - modelHealth) / 0.5;
      healthProb = shrinkToNeutral(healthProb, healthFactor * 0.15, 50);
    }

    const prob = clamp(healthProb, 0, 100);

    // FIX: expor incerteza e limites para decisão conservadora
    const uncertainty =
      ((1 - modelHealth) * 12) +
      (calibrationPenalty * 35) +
      (confFactor * 20);

    const probabilityLower = clamp(prob - uncertainty, 0, 100);
    const probabilityUpper = clamp(prob + uncertainty, 0, 100);

    const healthAdjustedProb = clamp(
      prob * modelHealth + (50 * (1 - modelHealth)),
      0,
      100
    );

    const rawProjectedMean = simulationData?.data?.projectedMean ?? simulationData?.data?.mean ?? 0;
    const pMean = clamp(rawProjectedMean, minScore, maxScore);

    const cMean = (
      pureStatsData?.bayesianMean === null ||
      pureStatsData?.bayesianMean === undefined ||
      pureStatsData?.bayesianMean === ''
    )
      ? (simulationData?.data?.currentMean ?? pMean)
      : (
          Number.isFinite(Number(pureStatsData.bayesianMean))
            ? Number(pureStatsData.bayesianMean)
            : (simulationData?.data?.currentMean ?? pMean)
        );

    return {
      probability: prob,
      probabilityLower,
      probabilityUpper,
      projectedMean: pMean,
      currentMean: cMean,
      healthAdjustedProb,
      rawProbability,
      uncertainty
    };
  }, [
    simulationData,
    pureStatsData,
    maxScore,
    minScore,
    calibrationPenalty,
    modelHealth,
    modelWeight
  ]);

  const probabilityDataResult = probabilityData;

  const probability = probabilityDataResult.probability;
  const probabilityLower = probabilityDataResult.probabilityLower;
  const probabilityUpper = probabilityDataResult.probabilityUpper;
  const projectedMean = probabilityDataResult.projectedMean;
  const currentMean = probabilityDataResult.currentMean;
  const rawProbability = probabilityDataResult.rawProbability;
  const probabilityUncertainty = probabilityDataResult.uncertainty;

  const healthAdjustedProb = probabilityDataResult.healthAdjustedProb ?? clamp(
    (probabilityDataResult.probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5))),
    0,
    100
  );

  const effectiveSimulationData = useMemo(() => {
    if (!statsData) return { status: 'waiting', missing: 'data' };

    let totalPoints = 0;
    statsData.categoryStats.forEach(cat => {
      totalPoints += cat.n || 1;
    });

    if (totalPoints < 1) return { status: 'waiting', missing: 'count', count: totalPoints };

    const base = simulationData;

    if (base?.status === 'ready' && base.data) {
      return {
        ...base,
        data: {
          ...base.data,
          calibrationSummary,
          diagnostics: {
            ...(base.data.diagnostics || {}),
            calibrationSummary,
            modelHealth,
            modelWeight
          },
          healthAdjustedProb: base.data.healthAdjustedProb ?? healthAdjustedProb,
          probabilityLower: base.data.probabilityLower ?? probabilityLower,
          probabilityUpper: base.data.probabilityUpper ?? probabilityUpper
        }
      };
    }

    return base;
  }, [
    statsData,
    simulationData,
    calibrationSummary,
    modelHealth,
    modelWeight,
    healthAdjustedProb,
    probabilityLower,
    probabilityUpper
  ]);

  const perSubjectProbs = useMemo(() => {
    if (!statsData?.categoryStats?.length || simulationData?.status !== 'ready') return [];

    return statsData.categoryStats
      .filter(cat => cat.weight > 0)
      .map(cat => {
        const catMaxScore = Number(cat.maxScore) || maxScore;
        const catMinScore = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : minScore;

        const currentBaseline = cat.bayesianMean ?? cat.mean;

        const trendPer30Days = cat.trendValue || cat.trend || 0;
        const projectedDaysAmortized = LOG_DAMPING_FACTOR * Math.log(1 + projectDays / LOG_DAMPING_FACTOR);
        const dailyTrend = trendPer30Days / 30;

        let totalTrendProjection = dailyTrend * projectedDaysAmortized;

        try {
          const simHistory = cat.simuladoStats?.history || cat.history || [];

          if (Array.isArray(simHistory) && simHistory.length >= 4) {
            const nl = computeNonLinearTrend(simHistory, catMaxScore);

            if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
              const nlWeight = modelWeight;
              const nlProjection = nl.slope * (projectedDaysAmortized / 30);
              totalTrendProjection = totalTrendProjection * (1 - nlWeight) + nlProjection * nlWeight;
            }
          }
        } catch {
          // ignore
        }

        // FIX: reduzir projeção quando a tendência é fraca perto da incerteza
        const trendUncertainty = Number(cat.bayesianSd ?? cat.sd ?? 0);
        const trendSignificance = Math.abs(trendPer30Days) / Math.max(1e-6, trendUncertainty);

        if (trendSignificance < 0.5) {
          totalTrendProjection *= 0.5;
        }

        // FIX: limitar projeção de tendência a ±15% do domínio da disciplina
        totalTrendProjection = clamp(
          totalTrendProjection,
          -0.15 * catMaxScore,
          0.15 * catMaxScore
        );

        const baseline = (!effectiveSimulateToday && projectDays > 0)
          ? clamp(currentBaseline + totalTrendProjection, catMinScore, catMaxScore)
          : currentBaseline;

        // ✅ LOTE-01 FIX: meta projetada no INTERVALO real, respeitando minScore
        const globalRange = Math.max(1e-9, Number(maxScore) - Number(minScore));
        const catRange = Math.max(1e-9, catMaxScore - catMinScore);
        const targetRatio = clamp((Number(debouncedTarget) - Number(minScore)) / globalRange, 0, 1);
        const subjectTarget = clamp(catMinScore + targetRatio * catRange, catMinScore, catMaxScore);

        const result = simulateNormalDistribution({
          mean: baseline,
          sd: cat.bayesianSd ?? cat.sd,
          targetScore: subjectTarget,   // ✅ LOTE-01 FIX
          simulations: Math.min(dynamicSimulations || 2000, 3000),
          categoryName: cat.name,
          minScore: catMinScore,
          maxScore: catMaxScore,
          simuladoRows: rawSimuladoRows,
          subjects: [{ name: cat.name }],
          historyLength: cat.n || 0,
          bayesianCI: cat.bayesianCI || null
        });

        const subjDiag = {
          ...(result.diagnostics || {}),
          trendType: result.trendType || 'linear',
          calibrationSummary,
          modelHealth,
          modelWeight
        };

        let subjProb = result.probability;
        let subjConfFactor = 0;

        if (result.ciConformalLow != null && result.ciConformalHigh != null) {
          const subjConfWidth = result.ciConformalHigh - result.ciConformalLow;

          if (subjConfWidth > 0) {
            subjConfFactor = Math.min(0.15, subjConfWidth / (catMaxScore * 1.5)) * (1 - modelWeight);

            if (modelHealth < 0.6) {
              subjConfFactor = Math.min(0.25, subjConfFactor * 1.4);
            }

            // FIX: shrink simétrico também por disciplina
            subjProb = shrinkToNeutral(subjProb, subjConfFactor, 50);
          }
        }

        if (modelHealth > 0.7) {
          const trust = (modelHealth - 0.7) / 0.3;
          subjProb = subjProb * (1 - trust * 0.4) + result.probability * (trust * 0.4);
        }

        const subjUncertainty =
          ((1 - modelHealth) * 10) +
          (calibrationPenalty * 30) +
          (subjConfFactor * 18);

        return {
          name: cat.name,
          prob: clamp(subjProb, 0, 100),
          probabilityLower: clamp(subjProb - subjUncertainty, 0, 100),
          probabilityUpper: clamp(subjProb + subjUncertainty, 0, 100),
          mean: baseline,
          trend: cat.trend,
          diagnostics: subjDiag,
          ciConformalLow: result.ciConformalLow,
          ciConformalHigh: result.ciConformalHigh,
          ciLow: result.ciConformalLow ?? result.ci95Low,
          ciHigh: result.ciConformalHigh ?? result.ci95High,
          modelHealth,
          modelWeight,
          healthAdjustedProb: clamp(
            subjProb * modelHealth + (50 * (1 - modelHealth)),
            0,
            100
          )
        };
      })
      .sort((a, b) => a.prob - b.prob);
  }, [
    statsData,
    debouncedTarget,
    simulationData?.status,
    maxScore,
    effectiveSimulateToday,
    projectDays,
    minScore,
    modelHealth,
    modelWeight,
    rawSimuladoRows,
    calibrationSummary,
    dynamicSimulations,
    calibrationPenalty
  ]);

  useEffect(() => {
    if (!perSubjectProbs || perSubjectProbs.length === 0 || simulationData?.status !== 'ready') return;

    try {
      const hash = `${pureStatsHash}-${debouncedTarget}`;
      if (lastRecordedSubjectPredsRef.current === hash) return;

      lastRecordedSubjectPredsRef.current = hash;

      const setDataFn = useAppStore.getState().setData;
      if (!setDataFn) return;

      perSubjectProbs.forEach(subj => {
        if (subj.prob == null) return;

        const ev = recordPredictionEvent(null, {
          timestamp: Date.now(),
          probability: Number(subj.prob) / 100,
          targetScore: debouncedTarget,
          sims: 500,
          category: subj.name || 'subject',
          effectiveN: subj.diagnostics?.effectiveN
        });

        if (ev) {
          setDataFn(contest => {
            const evs = Array.isArray(contest.calibrationEvents)
              ? [...contest.calibrationEvents]
              : [];

            evs.push(ev);

            return {
              ...contest,
              calibrationEvents: evs.slice(-200)
            };
          });
        }
      });
    } catch {
      // ignore
    }
  }, [perSubjectProbs, debouncedTarget, simulationData?.status, pureStatsHash]);

  const derivedMetrics = useMemo(() => {
    let sd = simulationData?.data?.sd ?? 0;
    let sdLeft = simulationData?.data?.sdLeft ?? sd;
    let sdRight = simulationData?.data?.sdRight ?? sd;

    let ci95Low = simulationData?.data?.ciConformalLow ?? simulationData?.data?.ci95Low ?? 0;
    let ci95High = simulationData?.data?.ciConformalHigh ?? simulationData?.data?.ci95High ?? 0;

    if (simulationData?.data?.ciConformalLow != null) {
      ci95Low = simulationData.data.ciConformalLow;
      ci95High = simulationData.data.ciConformalHigh;
    }

    const effectiveDrift = simulationData?.data?.diagnostics?.effectiveDriftSlope ?? (simulationData?.data?.drift / 30 || 0);

    if (calibrationPenalty > 0) {
      const ciMid = (ci95Low + ci95High) / 2;
      const ciExpand = 1 + (calibrationPenalty * 2.5);

      ci95Low = Math.max(minScore, ciMid - ((ciMid - ci95Low) * ciExpand));
      ci95High = Math.min(maxScore, ciMid + ((ci95High - ciMid) * ciExpand));

      sd = sd * (1 + calibrationPenalty * 2.5);
      sdLeft = sdLeft * (1 + calibrationPenalty * 2.5);
      sdRight = sdRight * (1 + calibrationPenalty * 2.5);
    }

    const domainWidth = maxScore - minScore;
    const icWidth = ci95High - ci95Low;

    const saturation = Math.min(1, domainWidth > 0 ? icWidth / domainWidth : 1);
    const projectionConfidence = Math.max(0, 1 - Math.pow(saturation, 1.5));

    const pAdjusted = probability;

    // FIX: piso mínimo de volatilidade para evitar probabilidade degenerada
    const safeSdForTrend = Math.max(
      Number.isFinite(sd) && sd > 0 ? sd : 1,
      maxScore * 0.02
    );

    const pTrend = normalCDF_complement((debouncedTarget - projectedMean) / safeSdForTrend) * 100;

    const nHistory = Array.isArray(statsData?.globalHistory)
      ? statsData.globalHistory.length
      : (timelineDates?.length || 0);

    const confidenceObj = getConfidenceTier({
      calibrationPenalty,
      volatility: sd,
      sampleSize: nHistory
    });

    const explanations = buildHumanExplanation({
      calibrationPenalty,
      volatility: sd,
      trend: (projectedMean - currentMean),
      confidenceTier: confidenceObj.tier,
      intervalWidth: ci95High - ci95Low
    });

    const driftAlerts = detectPerformanceDrift({
      recentMean: currentMean,
      baselineMean: (statsData?.bayesianMean || currentMean),
      recentVolatility: sdLeft
    });

    const humanVol = humanizeVolatility(sdLeft);

    try {
      validatePrediction({
        probability: pAdjusted,
        interval: { low: ci95Low, high: ci95High },
        confidenceTier: confidenceObj.tier
      });
    } catch (e) {
      console.error('Monte Carlo Validation Error:', e);
    }

    return {
      sd,
      sdLeft,
      sdRight,
      ci95Low,
      ci95High,
      saturation,
      projectionConfidence,
      pAdjusted,
      pTrend,
      probability: pAdjusted,
      probabilityLower,
      probabilityUpper,
      rawProbability,
      probabilityUncertainty,
      confidenceTier: confidenceObj.label,
      confidenceColor: confidenceObj.tier === 'HIGH'
        ? 'text-emerald-400'
        : confidenceObj.tier === 'MEDIUM'
          ? 'text-amber-400'
          : 'text-rose-400',
      confidenceObj,
      explanations,
      humanVol,
      driftAlerts,
      ciConformalLow: simulationData?.data?.ciConformalLow,
      ciConformalHigh: simulationData?.data?.ciConformalHigh,
      trendType: simulationData?.data?.trendType || 'linear',
      calibrationSummary,
      effectiveDrift,
      modelHealth,
      modelWeight
    };
  }, [
    simulationData?.data,
    maxScore,
    minScore,
    debouncedTarget,
    projectedMean,
    calibrationPenalty,
    currentMean,
    statsData,
    timelineDates,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    probabilityUncertainty,
    calibrationSummary,
    modelHealth,
    modelWeight
  ]);

  useMonteCarloHistoryRecorder({
    activeId,
    simulationData,
    timeIndex,
    timelineDates,
    effectiveSimulateToday,
    projectDays,
    goalDate,
    debouncedTarget,
    currentMean,
    projectedMean,
    pAdjusted: derivedMetrics.pAdjusted,
    ci95Low: derivedMetrics.ci95Low,
    ci95High: derivedMetrics.ci95High,
    calibrationSummary: derivedMetrics.calibrationSummary,
    trendType: derivedMetrics.trendType,
    effectiveDrift: derivedMetrics.effectiveDrift,
    modelHealth: derivedMetrics.modelHealth,
    modelWeight: derivedMetrics.modelWeight,
    recordMonteCarloSnapshot
  });

  const memoizedStats = useMemo(() => ({
    statsData,
    simulationData: effectiveSimulationData,
    perSubjectProbs,
    projectDays,
    debouncedTarget,
    effectiveWeights,
    setWeights,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    projectedMean,
    currentMean,
    healthAdjustedProb: healthAdjustedProb ?? clamp(
      (probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5))),
      0,
      100
    ),
    ...derivedMetrics,
    equalWeightsMode,
    setEqualWeightsMode,
    calibrationPenalty,
    calibrationSummary,
    trendType: derivedMetrics.trendType || 'linear',
    effectiveDrift: derivedMetrics.effectiveDrift,
    modelHealth: derivedMetrics.modelHealth,
    modelWeight: derivedMetrics.modelWeight
  }), [
    statsData,
    effectiveSimulationData,
    perSubjectProbs,
    projectDays,
    debouncedTarget,
    effectiveWeights,
    setWeights,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    projectedMean,
    currentMean,
    healthAdjustedProb,
    derivedMetrics,
    equalWeightsMode,
    setEqualWeightsMode,
    calibrationPenalty,
    calibrationSummary,
    modelHealth
  ]);

  return useMemo(() => ({
    ...memoizedStats,
    isFlashing: false
  }), [memoizedStats]);
}

function useMonteCarloHistoryRecorder({
  activeId,
  simulationData,
  timeIndex,
  timelineDates,
  effectiveSimulateToday,
  projectDays,
  goalDate,
  debouncedTarget,
  currentMean,
  projectedMean,
  pAdjusted,
  ci95Low,
  ci95High,
  calibrationSummary,
  trendType,
  effectiveDrift,
  modelHealth,
  modelWeight,
  recordMonteCarloSnapshot
}) {
  const lastRecordTime = useRef(0);
  const lastRecordHash = useRef('');

  useEffect(() => {
    const prob = Number.isFinite(pAdjusted) ? pAdjusted : 0;
    const isTimeTraveling = timeIndex >= 0 && timeIndex < timelineDates.length - 1;

    if (
      simulationData?.status === 'ready' &&
      Number.isFinite(prob) &&
      prob > 0 &&
      !effectiveSimulateToday &&
      !isTimeTraveling &&
      activeId
    ) {
      const doRecord = () => {
        const today = getDateKey(new Date());
        const currentProb = Number(prob.toFixed(1));

        const hash = `${activeId}-${today}-${currentProb}-${debouncedTarget.toFixed(1)}`;
        if (hash === lastRecordHash.current) return;

        const history = useAppStore.getState().appState?.contests?.[activeId]?.monteCarloHistory || [];
        const existing = Array.isArray(history) ? history.find(h => h.date === today) : null;

        const currentTarget = Number(debouncedTarget.toFixed(1));
        const existingProb = Number((existing?.probability ?? existing?.prob ?? 0).toFixed(1));
        const existingTarget = Number((existing?.target ?? 0).toFixed(1));

        const targetChanged = !existing || Math.abs(existingTarget - currentTarget) > 0.05;

        const isCICollapsed = existing && Number.isFinite(existing.mean) && Number.isFinite(existing.ci95Low)
          ? Math.abs(existing.mean - existing.ci95Low) < 0.01
          : false;

        const needsUpdate = !existing || existing.ci95Low === undefined || (isCICollapsed && projectDays > 0);
        const probChanged = existing && Math.abs(existingProb - currentProb) > 0.3;

        if (probChanged || targetChanged || needsUpdate) {
          lastRecordTime.current = Date.now();
          lastRecordHash.current = hash;

          recordMonteCarloSnapshot(today, prob, {
            mean: Number(currentMean.toFixed(2)),
            projectedMean: Number(projectedMean.toFixed(2)),
            ci95Low: Number(ci95Low.toFixed(2)),
            ci95High: Number(ci95High.toFixed(2)),
            target: Number(debouncedTarget.toFixed(2)),
            targetDate: goalDate,
            trendType: trendType || 'linear',
            effectiveDrift: Number((effectiveDrift || 0).toFixed(4)),
            calibrationBrier: calibrationSummary ? Number(calibrationSummary.avgBrier || 0).toFixed(4) : null,
            modelHealth: Number((modelHealth || 0.5).toFixed(3)),
            modelWeight: Number((modelWeight || 0.25).toFixed(3))
          });
        }
      };

      const now = Date.now();
      const timeSinceLast = now - lastRecordTime.current;

      if (timeSinceLast < 5000) {
        const timerId = setTimeout(doRecord, 5000 - timeSinceLast);
        return () => clearTimeout(timerId);
      } else {
        doRecord();
      }
    }
  }, [
    simulationData?.status,
    effectiveSimulateToday,
    recordMonteCarloSnapshot,
    timeIndex,
    timelineDates,
    currentMean,
    projectedMean,
    debouncedTarget,
    activeId,
    ci95Low,
    ci95High,
    pAdjusted,
    goalDate,
    projectDays,
    calibrationSummary,
    effectiveDrift,
    modelHealth,
    modelWeight,
    trendType
  ]);
}
```

---

## File: `src/utils/weeklyEvolutionInsights.js`
*Linhas: 99 | Tamanho: 2.83 KB*

```javascript
import { toDateMs } from './dateHelper.js';

export function computeTopRegressions({ viewMode, chartData = [], keys = [], activeKeys = {}, hiddenKeys = {} }) {
  if (viewMode !== 'variation' || !Array.isArray(chartData) || chartData.length === 0) return [];

  const latestWeekWithDelta = [...chartData].reverse().find(point =>
    keys.some(key => Number.isFinite(Number(point?.[`delta_${key}`])))
  );

  if (!latestWeekWithDelta) return [];

  return keys
    .map((key) => {
      const delta = latestWeekWithDelta[`delta_${key}`];

      if (!Number.isFinite(Number(delta)) || Number(delta) >= 0 || hiddenKeys[key]) return null;

      return {
        key,
        name: activeKeys[key]?.name || key,
        fullName: activeKeys[key]?.fullName || activeKeys[key]?.name || key,
        delta: Number(delta),
        color: activeKeys[key]?.color || '#ef4444',
        week: latestWeekWithDelta.displayDate,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);
}

export function computeTrendKpi({ chartData = [], keys = [], hiddenKeys = {} }) {
  if (!Array.isArray(chartData) || chartData.length < 2) return null;

  const visibleKeys = keys.filter((key) => !hiddenKeys[key]);
  if (visibleKeys.length === 0) return null;

  const recentWindow = chartData.slice(-4);
  const previousWindow = chartData.slice(-8, -4);

  if (!previousWindow.length) return null;

  const calculateEMA = (windowData, alphaBase = 0.3) => {
    if (!windowData.length) return null;

    let ema = null;
    let lastTime = null;

    windowData.forEach((week) => {
      const currentTime = toDateMs(week.week);

      if (!Number.isFinite(currentTime)) return;

      const deltaT = lastTime ? Math.max(1, (currentTime - lastTime) / 86400000) : 1;
      const alpha = 1 - Math.pow(1 - alphaBase, deltaT);
      const safeAlpha = Math.min(0.9, alpha);

      let weekSum = 0;
      let weekVol = 0;

      visibleKeys.forEach(key => {
        const meta = week[`meta_${key}`];

        if (meta && meta.currTot > 0 && Number.isFinite(Number(week[key]))) {
          weekSum += (Number(week[key]) * meta.currTot);
          weekVol += meta.currTot;
        }
      });

      if (weekVol > 0) {
        const weekAvg = weekSum / weekVol;

        if (ema === null) {
          ema = weekAvg;
        } else {
          ema = (weekAvg * safeAlpha) + (ema * (1 - safeAlpha));
        }
      }

      lastTime = currentTime;
    });

    return ema;
  };

  const recentAvg = calculateEMA(recentWindow);
  const previousAvg = calculateEMA(previousWindow);

  if (recentAvg === null || previousAvg === null) return null;

  return {
    recentAvg,
    previousAvg,
    delta: recentAvg - previousAvg,
    recentN: recentWindow.length,
    previousN: previousWindow.length,
  };
}
```

---

## File: `src/utils/monteCarloScenario.js`
*Linhas: 52 | Tamanho: 3.27 KB*

```javascript
export const SCENARIO_CONFIG = {
  // BUG-5 FIX: meanBiasFactor é percentual da escala (0.025 = 2.5% do maxScore)
  // Antes era absoluto (±2.5 pts), distorcendo provas fora da escala 0-100.
  conservative: { meanBiasFactor: -0.015, ciMult: 1.5, probMultFactor: 0.045 },
  base: { meanBiasFactor: 0, ciMult: 1, probMultFactor: 0 },
  optimistic: { meanBiasFactor: 0.025, ciMult: 0.85, probMultFactor: 0.045 },
};

export function applyScenarioAdjustments(data = [], scenario = 'base', maxScore = 100, minScore = 0) {
  const cfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const lowerBound = Math.min(safeMinScore, safeMaxScore);
  const upperBound = Math.max(safeMinScore, safeMaxScore);
  
  // CORREÇÃO B3b: Bias proporcional à amplitude real (Range) e não ao Teto absoluto.
  const meanBias = (cfg.meanBiasFactor || 0) * (upperBound - lowerBound);
  // BUG-GLOBAL-09 FIX: Ajuste de probabilidade deve ser baseado em 100 (%), não no maxScore.
  // Antes: 0.045 * 200 = 9pp (errado). Agora: 0.045 * 100 = 4.5pp (correto).
  const probMult = (cfg.probMultFactor || 0) * 100;
  return (data || []).map((d) => {
    const mean = Math.max(lowerBound, Math.min(upperBound, (Number(d.mean) || 0) + meanBias));
    const projectedMean = d.projectedMean !== undefined ? Math.max(lowerBound, Math.min(upperBound, (Number(d.projectedMean) || 0) + meanBias)) : mean;
    const low = Math.max(lowerBound, Math.min(upperBound, mean - ((mean - (d?.ciRange?.[0] ?? mean)) * cfg.ciMult)));
    const high = Math.max(lowerBound, Math.min(upperBound, mean + (((d?.ciRange?.[1] ?? mean) - mean) * cfg.ciMult)));
    const probBase = Number.isFinite(Number(d?.probability)) ? Number(d.probability) : 0;
    const probAdj = Math.max(0, Math.min(100, probBase + (meanBias > 0 ? probMult : meanBias < 0 ? -probMult : 0)));
    return { ...d, mean, projectedMean, probability: probAdj, ciRange: [Math.min(low, high), Math.max(low, high)] };
  });
}

export function classifyScenarioSignal(data = [], maxScore = 100, minScore = 0) {
  if (!data.length) return null;
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const range = Math.max(1, safeMaxScore - safeMinScore); // Prevenção de divisão por zero
  
  const latest = data[data.length - 1];
  const high = Number(latest?.ciRange?.[1]);
  const low = Number(latest?.ciRange?.[0]);
  const width = Number.isFinite(high) && Number.isFinite(low) ? Math.max(0, high - low) : Number.POSITIVE_INFINITY;

  // CORREÇÃO: Eliminar os valores estáticos (12, 6) e usar proporções matemáticas do range (12% e 6%)
  if (data.length < 4 || width >= (range * 0.18)) {
    return { label: 'Sinal Fraco', color: 'text-amber-300 border-amber-500/40 bg-amber-500/10' };
  }
  if (width <= (range * 0.10) && data.length >= 8) {
    return { label: 'Sinal Forte', color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' };
  }
  return { label: 'Sinal Médio', color: 'text-sky-300 border-sky-500/40 bg-sky-500/10' };
}
```

---

## File: `src/utils/heatmapAggregation.js`
*Linhas: 92 | Tamanho: 3.76 KB*

```javascript
import { normalizeDate } from './dateHelper.js';

export function getMondayKey(rawKey = '') {
  const dt = normalizeDate(rawKey) || new Date(0);
  if (Number.isNaN(dt.getTime())) return `sem-${rawKey || 'na'}`;
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function aggregateHeatmap(filtered, granularity = 'daily', _maxScore = 100) {
  if (granularity === 'daily') return filtered;
  const buckets = new Map();
  (filtered?.dates || []).forEach((d, index) => {
    const key = granularity === 'monthly' ? String(d.key || '').slice(0, 7) : getMondayKey(d.key);
    if (!buckets.has(key)) buckets.set(key, { key, indices: [], label: d.label });
    buckets.get(key).indices.push(index);
  });

  const dates = [...buckets.values()].map((b, i) => ({
    key: b.key,
    label: granularity === 'monthly' ? b.key : b.label,
    dayName: granularity === 'monthly' ? 'MÊS' : `Sem ${i + 1}`,
    count: b.indices.length,
    isWeekend: false,
  }));

  const rows = (filtered?.rows || []).map((row) => ({
    ...row,
    cells: [...buckets.values()].map(({ indices }) => {
      const samples = indices.map(i => row.cells?.[i]).filter(Boolean);
      if (!samples.length) return null;
      // CORREÇÃO: Normalizar strings de dados legados com vírgulas ANTES de tentar somar
      const total = samples.reduce((a, c) => {
          let val = c.total;
          if (typeof val === 'string') val = val.replace(',', '.');
          return a + (Number.isFinite(Number(val)) ? Number(val) : 0);
      }, 0);
      
      const correct = samples.reduce((a, c) => {
          let val = c.correct;
          if (typeof val === 'string') val = val.replace(',', '.');
          return a + (Number.isFinite(Number(val)) ? Number(val) : 0);
      }, 0);
      // BUG-GLOBAL-02 FIX: pct deve ser percentual [0,100], não score em [0, maxScore].
      // Antes: (correct/total) * maxScore → para maxScore=120, 8/10 → 96 (errado).
      // Agora: (correct/total) * 100 → 8/10 → 80% (correto, invariante à escala).
      const pct = total > 0 ? (correct / total) * 100 : null;
      return { total, correct, pct };
    })
  }));

  return { dates, rows };
}

/**
 * Agrega a proficiência de uma matéria pai a partir de seus subtópicos.
 * Resolve o Paradoxo de Simpson agregando numeradores e denominadores 
 * antes da divisão final, e aplica Shrinkage Bayesiano (K=5).
 */
export const calculateSubjectMastery = (subtopics) => {
    const safeSubtopics = Array.isArray(subtopics) ? subtopics : Object.values(subtopics || {});
    if (!safeSubtopics || safeSubtopics.length === 0) return 0;

    // BUG-01 FIX: Cálculo Agregado Bruto para eliminar o Paradoxo de Simpson.
    // Nunca tire média de porcentagens ou aplique shrinkage por tópico na agregação macro.
    // Agregamos os valores brutos (acertos/total) para garantir precisão real.
    let totalAcertos = 0;
    let totalQuestoes = 0;

    safeSubtopics.forEach(topic => {
        // Suporte polimórfico para diferentes chaves de dados
        const hits = Number(topic.acertos ?? topic.hits ?? 0);
        const total = Number(topic.total ?? topic.questoes ?? 0);
        
        totalAcertos += hits;
        totalQuestoes += total;
    });

    if (totalQuestoes === 0) return 0;

    // BUG FIX: Aplicação autêntica do Shrinkage Bayesiano (K=5, Prior=0.5) 
    // conforme documentado, para evitar anomalias de baixo volume (ex: 1/1 -> 100%).
    const K = 5;
    const prior = 0.5;
    return ((totalAcertos + K * prior) / (totalQuestoes + K)) * 100;
};
```

---

## File: `src/engine/insightGenerator.js`
*Linhas: 282 | Tamanho: 14.79 KB*

```javascript
import { normalizeDate, toDateMs } from "../utils/dateHelper";
import { getSafeScore, getSyntheticTotal } from "../utils/scoreHelper";

const toHistoryArray = (history) => {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
};

const safeFinite = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const sortByValidDate = (history) => {
    return toHistoryArray(history)
        .filter(h => Number.isFinite(normalizeDate(h?.date)?.getTime()))
        .sort((a, b) => {
            const ta = normalizeDate(a?.date)?.getTime() ?? 0;
            const tb = normalizeDate(b?.date)?.getTime() ?? 0;
            return ta - tb;
        });
};

export function generateEvolutionInsights({
    timeline,
    focusCategory,
    activeEngine,
    categories,
    unit = '%',
    maxScore = 100
}) {
    const defaultTitle = "Análise do Sistema";

    if (!timeline?.length) {
        return {
            type: 'info', icon: "📊", title: defaultTitle,
            text: "Ainda não existem dados suficientes.",
            details: "Continue realizando simulados para desbloquear insights avançados."
        };
    }

    if (!focusCategory) {
        switch (activeEngine) {
            case "raw_weekly":
                return { type: 'info', icon: "📅", title: "Visão Global: Mapa de Calor", text: "Análise da sua frequência e eficiência geral.", details: "Selecione uma disciplina acima para uma análise profunda." };
            case "raw":
                return { type: 'info', icon: "📊", title: "Visão Global: Resultados Brutos", text: "Visão geral da sua volatilidade diária.", details: "Selecione uma disciplina acima para analisar a estabilidade." };
            case "bayesian":
                return { type: 'info', icon: "🧠", title: "Visão Global: Nível Bayesiano", text: "Domínio probabilístico estimado de todas as matérias.", details: "Selecione uma disciplina acima para ver o intervalo de confiança." };
            case "stats":
                return { type: 'info', icon: "📐", title: "Visão Global: Média Histórica", text: "Desempenho acumulado em todas as frentes.", details: "Selecione uma disciplina acima para ver a média específica." };
            case "compare":
                return { type: 'info', icon: "⚡", title: "Visão Global: Projeção Monte Carlo", text: "Visão probabilística global do seu futuro.", details: "Selecione uma disciplina acima para descobrir o que está segurando sua nota." };
            case "subtopics":
                return { type: 'info', icon: "🔬", title: "Visão Global: Auditoria de Assuntos", text: "Mapeamento completo de todos os seus subtópicos.", details: "Selecione uma disciplina acima para auditar pontos fracos." };
            case "mc_density":
                return { type: 'info', icon: "📉", title: "Visão Global: Densidade MC", text: "Acompanhamento global das suas projeções no tempo.", details: "Selecione uma disciplina acima para ver convergência específica." };
            case "time_spent":
                return { type: 'info', icon: "⏳", title: "Visão Global: Agilidade AI", text: "Visão geral da sua velocidade de resolução.", details: "Selecione uma disciplina acima para mapear gargalos de tempo específicos." };
            case "weekly_diff":
                return { type: 'info', icon: "📆", title: "Visão Global: Acelerômetro Semanal", text: "Balanço geral de ganhos e perdas na semana.", details: "Selecione uma disciplina acima para focar no esforço semanal." };
            case "today_vs_general":
                return { type: 'info', icon: "⚖️", title: "Visão Global: Hoje vs Geral", text: "Comparativo do seu dia contra a média histórica geral.", details: "Selecione uma disciplina acima para um comparativo específico." };
            default:
                return {
                    type: 'info', icon: "📊", title: "Visão Global",
                    text: "Selecione uma disciplina acima para insights detalhados.",
                    details: "A inteligência artificial analisa cada disciplina individualmente para gerar conselhos."
                };
        }
    }

    const lastPoint = timeline[timeline.length - 1];
    const getLastValid = (key) => {
        for (let i = timeline.length - 1; i >= 0; i--) {
            if (timeline[i][key] != null) return timeline[i][key];
        }
        return null;
    };

    const raw = getLastValid(`raw_${focusCategory.id}`);
    const bayesian = getLastValid(`bay_${focusCategory.id}`);
    maxScore = safeFinite(maxScore, 100) > 0 ? safeFinite(maxScore, 100) : 100;
    const scale = maxScore / 100;

    // Lógica do Mapa de Calor (Raw Weekly)
    if (activeEngine === "raw_weekly") {
        const DAY_NAMES_SINGULAR = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const DAY_NAMES_PLURAL = ['domingos', 'segundas-feiras', 'terças-feiras', 'quartas-feiras', 'quintas-feiras', 'sextas-feiras', 'sábados'];
        const dayStats = {};
        const now = new Date();
        
        const safeCategories = Array.isArray(categories)
            ? categories.filter(Boolean)
            : Object.values(categories || {}).filter(Boolean);

        safeCategories.forEach(cat => {
            const history = toHistoryArray(cat.simuladoStats?.history);

            const rawHistory = history
                .filter(h => {
                    const d = normalizeDate(h?.date);
                    return d && Number.isFinite(d.getTime()) && d.getTime() <= now.getTime();
                })
                .map(h => ({ ...h, score: getSafeScore(h, maxScore) }))
                .filter(h => Number.isFinite(h.score));

            rawHistory.forEach(h => {
                const d = normalizeDate(h.date);
                if (!d || !Number.isFinite(d.getTime())) return;

                const dow = d.getDay();
                if (!dayStats[dow]) dayStats[dow] = { correct: 0, total: 0 };

                let tot = Number(h.total);
                if (!Number.isFinite(tot) || tot <= 0) {
                    tot = getSyntheticTotal(maxScore);
                }

                if (!Number.isFinite(tot) || tot <= 0) return;

                dayStats[dow].correct += (h.score / maxScore * tot);
                dayStats[dow].total += tot;
            });
        });

        const dayEntries = Object.entries(dayStats)
            .filter(([, s]) => s.total >= 5)
            .map(([dow, s]) => ({ dow: Number(dow), pct: (s.correct / s.total) * 100, total: s.total }))
            .sort((a, b) => b.pct - a.pct);

        if (dayEntries.length >= 2) {
            const best = dayEntries[0];
            const worst = dayEntries[dayEntries.length - 1];
            return {
                type: 'success', icon: "📅", title: "Padrão Semanal de Rendimento",
                text: `Seu rendimento de pico ocorre aos **${DAY_NAMES_PLURAL[best.dow]}**.`,
                details: `++Melhor dia: **${DAY_NAMES_SINGULAR[best.dow]}** (${best.pct.toFixed(1)}%, ${best.total}q).++ !!Pior: ${DAY_NAMES_SINGULAR[worst.dow]} (${worst.pct.toFixed(1)}%).!!`,
                advice: "Alinhe seus simulados mais densos ao dia de ++melhor rendimento++."
            };
        }
        return {
            type: 'info', icon: "📅", title: "Mapa de Calor",
            text: "Visualize sua constância semanal.",
            details: "Células verdes indicam desempenho ++acima da meta++, !!vermelhas!! indicam necessidade de atenção."
        };
    }

    // Lógica da Realidade Bruta (Raw)
    if (activeEngine === "raw") {
        if (raw == null) return { type: 'info', icon: "📊", title: "Realidade Bruta", text: "Aguardando dados..." };
        const history = sortByValidDate(focusCategory.simuladoStats?.history);
        const scores = history.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
        
        if (scores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };

        const recentScores = scores.slice(-5);
        
        // CORREÇÃO M4: Guarda contra array vazio (Math.max(...[]) = -Infinity → crash)
        if (recentScores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };
        
        const maxSwing = Math.max(...recentScores) - Math.min(...recentScores);

        if (maxSwing > 25 * scale) return { type: 'warning', icon: "⚠️", title: "!!Alta Volatilidade Detectada!!", text: `!!Variação de ${maxSwing.toFixed(0)}${unit}.!!`, advice: "Oscilações altas indicam !!'chute'!! ou !!gaps de base!!." };
        if (maxSwing < 8 * scale) return { type: 'success', icon: "✅", title: "++Consistência Sólida++", text: `++Variação mínima de ${maxSwing.toFixed(0)}${unit}.++`, advice: "Pronto para subir a dificuldade." };
        
        return { type: 'info', icon: "📊", title: "Desempenho Estável", text: `Oscilação de ${maxSwing.toFixed(0)}${unit}.` };
    }

    // Lógica do Motor Bayesiano
    if (activeEngine === "bayesian") {
        const safeBayesian = safeFinite(bayesian, NaN);
        if (!Number.isFinite(safeBayesian)) {
            return { type: 'info', icon: "🧠", title: "Nível Bayesiano", text: "Aguardando mais dados..." };
        }

        const ciLow = safeFinite(lastPoint[`bay_ci_low_${focusCategory.id}`], NaN);
        const ciHigh = safeFinite(lastPoint[`bay_ci_high_${focusCategory.id}`], NaN);
        const ciWidth = (Number.isFinite(ciHigh) && Number.isFinite(ciLow)) ? (ciHigh - ciLow) : null;

        if (ciWidth != null && ciWidth < 5 * scale) return { type: 'success', icon: "🎯", title: "++Alta Precisão Bayesiana++", text: `Seu nível real é ${safeBayesian.toFixed(1)}${unit}.`, advice: "++Convergência máxima++ do algoritmo." };
        if (ciWidth != null && ciWidth > 20 * scale) return { type: 'warning', icon: "🧠", title: "!!Incerteza Elevada!!", text: `Nível estimado: ${safeBayesian.toFixed(1)}${unit}.`, advice: "Faça mais simulados para estreitar a estimativa." };
        
        return { type: 'info', icon: "🧠", title: "Estimativa Bayesiana", text: `Nível Real: ${safeBayesian.toFixed(1)}${unit}.` };
    }

    // Lógica da Média Histórica (Stats)
    if (activeEngine === "stats") {
        const statsVal = safeFinite(getLastValid(`stats_${focusCategory.id}`), NaN);
        if (!Number.isFinite(statsVal)) {
            return { type: 'info', icon: "📐", title: "Média Histórica", text: "Aguardando mais dados..." };
        }

        return {
            type: 'info',
            icon: "📐",
            title: "Média Histórica Global",
            text: `Sua média histórica é ${statsVal.toFixed(1)}${unit}.`,
            advice: "Lembre-se que a média demora a refletir seu conhecimento recente."
        };
    }

    // Lógica Raio-X + Monte Carlo (Compare)
    if (activeEngine === "compare") {
        return { type: 'info', icon: "⚡", title: "Projeção Monte Carlo", text: "Visualizando simulações estatísticas futuras.", advice: "Use esta projeção para saber se está na rota da aprovação." };
    }

    // Lógica Raio-X de Assuntos (Subtopics)
    if (activeEngine === "subtopics") {
        return { type: 'info', icon: "🔬", title: "Auditoria de Assuntos", text: "Navegando nos subtópicos da matéria.", advice: "Ataque os !!blocos vermelhos!! para subir seu percentual rapidamente." };
    }

    // Lógica Densidade MC (mc_density)
    if (activeEngine === "mc_density") {
        return { type: 'info', icon: "📉", title: "Densidade de Convergência", text: "Histórico das suas projeções Monte Carlo.", advice: "Se a linha estiver ++subindo++, você está matematicamente mais próximo da aprovação." };
    }

    // Lógica Semanal (weekly_diff)
    if (activeEngine === "weekly_diff") {
        return { type: 'info', icon: "📆", title: "Acelerômetro Semanal", text: "Tração do seu estudo na última semana.", advice: "Monitore semanas !!negativas!! para evitar a !!curva do esquecimento!!." };
    }

    // Lógica Hoje vs Geral (today_vs_general)
    if (activeEngine === "today_vs_general") {
        return { type: 'info', icon: "⚖️", title: "Desempenho Diário", text: "Seu foco de hoje contra sua média.", advice: "Use isso para calibrar o esforço de hoje." };
    }

    // Lógica Agilidade AI (time_spent)
    if (activeEngine === "time_spent") {
        return { type: 'info', icon: "⏳", title: "Velocidade de Resolução", text: "Mapeando gargalos de tempo.", advice: "Cuidado com matérias !!lentas!!, elas roubam preciosos minutos da prova." };
    }

    // Lógica de Alertas de Burnout e Consolidação (Fallback)
    const safeRaw = safeFinite(raw, NaN);
    const safeBayesianFallback = safeFinite(bayesian, NaN);

    if (Number.isFinite(safeRaw) && Number.isFinite(safeBayesianFallback)) {
        const nowMs = new Date().getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        const history = toHistoryArray(focusCategory.simuladoStats?.history);

        const recentVolumeAlert = history
            .filter(h => {
                const d = toDateMs(h?.date);
                return Number.isFinite(d) && (nowMs - d) >= 0 && (nowMs - d) <= sevenDaysMs;
            })
            .reduce((sum, h) => {
                const parsedTotal = parseInt(h?.total, 10);
                const fallbackTotal = h?.score != null ? getSyntheticTotal(maxScore) : 0;
                const safeTotal = Number.isFinite(parsedTotal) && parsedTotal > 0
                    ? parsedTotal
                    : fallbackTotal;

                return sum + Math.max(0, safeFinite(safeTotal, 0));
            }, 0);

        if (recentVolumeAlert > 40 && safeRaw < safeBayesianFallback - 10 * scale) {
            return {
                type: 'danger',
                icon: "🚨",
                title: "!!Alerta de Burnout!!",
                text: `Volume alto, nota em !!queda!!.`,
                advice: "Dê um passo atrás e descanse."
            };
        }

        if (safeRaw > safeBayesianFallback + 8 * scale) {
            return {
                type: 'success',
                icon: "💡",
                title: "++Conhecimento Consolidado++",
                text: `Desempenho ++muito acima da média++.`,
                advice: "O conhecimento assentou de vez."
            };
        }
    }

    return { type: 'info', icon: "✅", title: "++Rendimento de Mestre++", text: `Operando na zona de ++máxima eficiência++.`, advice: "Mantenha o ritmo." };
}
```

---

## File: `src/engine/stats.js`
*Linhas: 1131 | Tamanho: 43.45 KB*

```javascript
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
import { normalizeDate, safeDateParse } from '../utils/dateHelper.js';
import { calculateSlope } from './projection.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';
import { kahanSum, kahanMean } from './math/kahan.js';
import { computeAdaptiveLambda } from './diagnostics.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';

export const BAYESIAN_DECAY_FACTOR = 0.985;
export const RETENTION_DECAY_SHORT = 0.94;
export const RETENTION_DECAY_LONG = 0.992;

function toHistoryArray(history) {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
}

function safeFinite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function safeMaxScoreValue(maxScore, fallback = 100) {
    const n = Number(maxScore);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function computeImprovedRetentionProbability(historyLength, lastGapDays = 7, maxAlpha = 0.9) {
    const shortDecay = Math.pow(RETENTION_DECAY_SHORT, Math.max(0, lastGapDays));
    const longDecay = Math.pow(RETENTION_DECAY_LONG, Math.max(0, lastGapDays * 0.6));
    const blended = 0.6 * shortDecay + 0.4 * longDecay;
    return Math.max(0.15, Math.min(maxAlpha, blended * maxAlpha));
}

export function getSortedHistory(history) {
    const histArray = toHistoryArray(history);
    if (!histArray.length) return [];

    return histArray
        .map((h, index) => {
            if (typeof h === 'number') {
                return { original: h, time: index };
            }

            const dateValue = h?.date ?? h?.createdAt;
            const t = dateValue != null ? safeDateParse(dateValue)?.getTime() ?? NaN : NaN;

            return { original: h, time: t };
        })
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => {
            if (a.time !== b.time) return a.time - b.time;
            return String(a.original?.id || '').localeCompare(String(b.original?.id || ''));
        })
        .map(item => item.original);
}

export function pruneHistoryForMemory(history = [], maxPoints = 1500, maxAgeDays = 365 * 5) {
    const sorted = getSortedHistory(history);
    if (!sorted.length) return sorted;

    const now = Date.now();
    const cutoff = now - maxAgeDays * 86400000;

    let filtered = sorted.filter(h => {
        const t = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        return Number.isFinite(t) && t >= cutoff;
    });

    if (filtered.length <= maxPoints) return filtered;

    const recentCount = Math.max(10, Math.floor(maxPoints * 0.2));
    const older = filtered.slice(0, -recentCount);
    const recent = filtered.slice(-recentCount);

    if (older.length <= maxPoints - recentCount) return filtered;

    const targetCount = maxPoints - recentCount;
    const factor = older.length / targetCount;
    const sampledOlder = [];

    for (let i = 0; i < targetCount; i++) {
        sampledOlder.push(older[Math.floor(i * factor)]);
    }

    return [...sampledOlder, ...recent].slice(0, maxPoints);
}

export function weightedRegression(history, lambda = 0.08, maxScore = 100, options = {}) {
    lambda = Math.max(0, Math.min(1, lambda ?? 0.08));
    maxScore = safeMaxScoreValue(maxScore, 100);

    const sorted = getSortedHistory(history);
    if (sorted.length < 2) return { slope: 0, intercept: 0, slopeStdError: 1.5 };

    const parsedReferenceDate = options.referenceDate != null ? safeDateParse(options.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const t0 = safeDateParse(sorted[0]?.date || sorted[0]?.createdAt)?.getTime() ?? NaN;

    let sumW = 0, cW = 0;
    let sumWX = 0, cWX = 0;
    let sumWY = 0, cWY = 0;
    let sumWXX = 0, cWXX = 0;
    let sumWXY = 0, cWXY = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        const t = Math.max(0, (now - timeMs) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const rawWeight = Math.exp(-lambda * t);
        const w = Math.max(EPSILON_WEIGHT, rawWeight);
        const x = (timeMs - t0) / 86400000;

        const yW = w - cW; const tW = sumW + yW; cW = (tW - sumW) - yW; sumW = tW;

        const valWX = w * x;
        const yWX = valWX - cWX; const tWX = sumWX + yWX; cWX = (tWX - sumWX) - yWX; sumWX = tWX;

        const valWY = w * y;
        const yWY = valWY - cWY; const tWY = sumWY + yWY; cWY = (tWY - sumWY) - yWY; sumWY = tWY;

        const valWXX = w * x * x;
        const yWXX = valWXX - cWXX; const tWXX = sumWXX + yWXX; cWXX = (tWXX - sumWXX) - yWXX; sumWXX = tWXX;

        const valWXY = w * x * y;
        const yWXY = valWXY - cWXY; const tWXY = sumWXY + yWXY; cWXY = (tWXY - sumWXY) - yWXY; sumWXY = tWXY;
    }

    const RIDGE_PENALTY = Math.max(1e-8, (sumWXX > 0 ? sumWXX / Math.max(1, sumW) : 1) * 1e-4);
    const safeSumW = Math.max(1e-15, sumW);
    const varianceX = Math.max(0, sumWXX - (sumWX * sumWX) / safeSumW);
    const covXY = sumWXY - (sumWX * sumWY) / safeSumW;
    const regularizedDenominator = varianceX + RIDGE_PENALTY;

    if (safeSumW < 1e-15 || regularizedDenominator < 1e-15) {
        const fallbackScore = getSafeScore(sorted[sorted.length - 1], maxScore);
        return { slope: 0, intercept: Number.isFinite(fallbackScore) ? fallbackScore : 0, slopeStdError: 1.5 };
    }

    let slope = covXY / regularizedDenominator;
    const maxSlopeLimit = maxScore * 0.05;
    slope = Math.max(-maxSlopeLimit, Math.min(maxSlopeLimit, slope));

    const intercept = (sumWY - slope * sumWX) / safeSumW;
    const slopeStdError = calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options);

    return { slope, intercept, slopeStdError };
}

export function calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options = {}) {
    maxScore = safeMaxScoreValue(maxScore, 100);

    const parsedReferenceDate = options.referenceDate != null ? safeDateParse(options.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const t0 = safeDateParse(sorted[0]?.date || sorted[0]?.createdAt)?.getTime() ?? NaN;

    let sumW = 0, cW = 0;
    let sumW2 = 0, cW2 = 0;
    let sumWX = 0, cWX = 0;
    let sumWXX = 0, cWXX = 0;
    let rss = 0, cRSS = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        const x = (timeMs - t0) / 86400000;
        const t = Math.max(0, (now - timeMs) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const w = Math.max(EPSILON_WEIGHT, Math.exp(-lambda * t));
        const pred = intercept + slope * x;
        const residualSq = Math.pow(y - pred, 2);

        const valW = w;
        const yW = valW - cW; const tW = sumW + yW; cW = (tW - sumW) - yW; sumW = tW;

        const valW2 = w * w;
        const yW2 = valW2 - cW2; const tW2 = sumW2 + yW2; cW2 = (tW2 - sumW2) - yW2; sumW2 = tW2;

        const valWX = w * x;
        const yWX = valWX - cWX; const tWX = sumWX + yWX; cWX = (tWX - sumWX) - yWX; sumWX = tWX;

        const valWXX = w * x * x;
        const yWXX = valWXX - cWXX; const tWXX = sumWXX + yWXX; cWXX = (tWXX - sumWXX) - yWXX; sumWXX = tWXX;

        const valRSS = w * residualSq;
        const yRSS = valRSS - cRSS; const tRSS = rss + yRSS; cRSS = (tRSS - rss) - yRSS; rss = tRSS;
    }

    if (sumW2 <= 1e-15) return 1.5 * (maxScore / 100);

    const effectiveN = (sumW * sumW) / sumW2;
    const scaleFactorFallback = maxScore / 100;

    if (effectiveN <= 2.1) return 1.5 * scaleFactorFallback;

    const variance = (rss / sumW) * (effectiveN / (effectiveN - 2));
    const varX = (sumWXX - (sumWX * sumWX) / sumW) / sumW;

    if (varX <= 1e-8) {
        return Math.sqrt(Math.max(0, rss / sumW)) / Math.sqrt(effectiveN);
    }

    const det = sumW * sumWXX - sumWX * sumWX;
    return Math.sqrt(Math.max(0, (variance * sumW) / det));
}

function getHistoryDateValue(entry) {
    return entry?.date ?? entry?.createdAt ?? null;
}

function getHistoryTime(entry) {
    const parsed = normalizeDate(getHistoryDateValue(entry));
    return parsed ? parsed.getTime() : NaN;
}

function getDynamicTrendThreshold(currentScore, maxScore) {
    const safeMaxScore = safeMaxScoreValue(maxScore, 100);
    const safeCurrent = safeFinite(currentScore, 0);
    const currentPct = safeCurrent / safeMaxScore;

    if (!Number.isFinite(currentPct)) return 0.002 * safeMaxScore;

    const damping = Math.max(0, 1 - currentPct);
    const baseRequirement = 0.05;
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002;

    return dynamicPct * safeMaxScore;
}

// ✅ FIX: getDynamicPriorSD trata array de números nus
function getDynamicPriorSD(history, maxScore) {
  const safeMaxScore = safeMaxScoreValue(maxScore, 100);
  const safeHistory = toHistoryArray(history);
  
  if (safeHistory.length < 5) return safeMaxScore * 0.15;
  
  // ✅ FIX: Trata tanto objetos {score} quanto números nus
  const scores = safeHistory.map(h => {
    if (typeof h === 'number') return h;
    return getSafeScore(h, safeMaxScore);
  }).filter(Number.isFinite);
  
  if (scores.length < 5) return safeMaxScore * 0.15;
  
  const globalMean = mean(scores);
  const globalVar = scores.length > 1
    ? kahanSum(scores.map(s => Math.pow(s - globalMean, 2))) / (scores.length - 1)
    : 0;
  
  const empiricalSD = Math.sqrt(Math.max(0, globalVar));
  return Math.max(safeMaxScore * 0.05, Math.min(safeMaxScore * 0.20, empiricalSD));
}

export function mean(arr) {
    return kahanMean(arr);
}

export const calcularMedia = mean;

// ✅ FIX: standardDeviation aceita array de números nus
export function standardDeviation(arr, maxScore = 100, customMean = null) {
  if (!arr || arr.length < 1) return 0;
  
  const safeMaxScore = safeMaxScoreValue(maxScore, 100);
  
  // ✅ FIX: Trata tanto objetos {score} quanto números nus
  const clean = arr
    .map(v => typeof v === 'number' ? v : getSafeScore(v, safeMaxScore))
    .filter(Number.isFinite);
  
  if (clean.length < 1) return 0;
  
  const n = clean.length;
  const m = customMean !== null && Number.isFinite(Number(customMean)) ? Number(customMean) : mean(clean);
  
  const sampleVar = n > 1
    ? kahanSum(clean.map(val => Math.pow(val - m, 2))) / (n - 1)
    : 0;
  
  const sorted = [...clean].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const absDev = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
  const mad = absDev.length % 2 === 0
    ? (absDev[absDev.length / 2 - 1] + absDev[absDev.length / 2]) / 2
    : absDev[Math.floor(absDev.length / 2)];
  
  const robustSigma = 1.4826 * mad;
  const robustVar = robustSigma * robustSigma;
  
  const blendedSampleVar = (0.8 * sampleVar) + (0.2 * robustVar);
  
  const POPULATION_SD = getDynamicPriorSD(arr, safeMaxScore);
  const KAPPA = 1;
  
  const adjustedVar = ((n - 1) * blendedSampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) / ((n - 1) + KAPPA);
  
  const finalSdFloor = MIN_SD_FLOOR * safeMaxScore;
  return Math.max(finalSdFloor, Math.sqrt(Math.max(0, adjustedVar)));
}

export const calcularDesvioPadrao = (arr) => {
    if (!arr || arr.length <= 1) return 0;

    const clean = arr.map(Number).filter(Number.isFinite);
    if (clean.length <= 1) return 0;

    const m = kahanMean(clean);
    const sumSq = clean.map(x => Math.pow(x - m, 2));
    const v = clean.length > 0 ? kahanSum(sumSq) / clean.length : 0;

    return Math.sqrt(Math.max(0, v));
};

export function calcularAssimetria(arr) {
    if (!arr || arr.length < 3) return 0;

    const clean = toHistoryArray(arr)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, 100))
        .filter(Number.isFinite);

    const n = clean.length;
    if (n < 3) return 0;

    const m = mean(clean);
    const sumSq = kahanSum(clean.map(val => Math.pow(val - m, 2)));
    const sampleVar = sumSq / (n - 1);
    const s = Math.sqrt(Math.max(0, sampleVar));

    if (s < 1e-5) return 0;

    const cubeDiffs = clean.map(val => Math.pow(val - m, 3));
    const sumCube = kahanSum(cubeDiffs);
    const safeS = Math.max(1e-5, s);
    const skewness = (n * sumCube) / ((n - 1) * (n - 2) * Math.pow(safeS, 3));

    if (!Number.isFinite(skewness)) return 0;

    return Math.max(-5, Math.min(5, skewness));
}

export function computeBayesianLevel(
    historyOrScore,
    arg1 = 1,
    arg2 = 1,
    arg3 = 100,
    arg4 = {}
) {
    let history, alpha, beta, safeMaxScore, options;

    if (Array.isArray(historyOrScore)) {
        history = toHistoryArray(historyOrScore);

        const safeAlphaArg = Number(arg1);
        const safeBetaArg = Number(arg2);

        alpha = Number.isFinite(safeAlphaArg) && safeAlphaArg >= 0 ? safeAlphaArg : 1;
        beta = Number.isFinite(safeBetaArg) && safeBetaArg >= 0 ? safeBetaArg : 1;

        safeMaxScore = safeMaxScoreValue(arg3, 100);
        options = arg4 || {};
    } else {
        history = [];

        const score = Math.max(0, Number(historyOrScore) || 0);

        const nEffArg = Number(arg1);
        const n_eff = Number.isFinite(nEffArg) && nEffArg >= 0 ? nEffArg : 1;

        safeMaxScore = safeMaxScoreValue(arg2, 100);
        options = arg3 || {};

        const pct = Math.max(0, Math.min(1, score / safeMaxScore));
        alpha = pct * n_eff;
        beta = (1 - pct) * n_eff;
    }

    const alpha0 = alpha;
    const beta0 = beta;

    let maxNEver = alpha + beta;

    const syntheticTotalValue = getSyntheticTotal(safeMaxScore);
    const safeSyntheticTotal = Number.isFinite(syntheticTotalValue) ? syntheticTotalValue : 20;

    const safeTotalEntry = (h) => {
        const n = Number(h?.total);
        return Number.isFinite(n) && n > 0 ? n : safeSyntheticTotal;
    };

    const gaps = [];

    const historySortedForGaps = history
        .map(h => ({ original: h, time: getHistoryTime(h) }))
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => a.time - b.time)
        .map(item => item.original);

    if (historySortedForGaps.length > 1) {
        for (let i = 1; i < historySortedForGaps.length; i++) {
            const time1 = getHistoryTime(historySortedForGaps[i]);
            const time0 = getHistoryTime(historySortedForGaps[i - 1]);
            const gap = (time1 - time0) / 86400000;
            if (Number.isFinite(gap) && gap > 0) gaps.push(gap);
        }
    }

    const safeAvgGap = Math.max(0.5, gaps.length > 0 ? kahanSum(gaps) / gaps.length : 7);
    const baseCapacity = 250 / safeAvgGap;
    const totalQuestionsHist = history.length ? kahanSum(history.map(safeTotalEntry)) : 0;

    const historyDays = historySortedForGaps.length > 1
        ? Math.max(1, (getHistoryTime(historySortedForGaps[historySortedForGaps.length - 1]) - getHistoryTime(historySortedForGaps[0])) / 86400000)
        : 1;

    const questionsPerDay = totalQuestionsHist / historyDays;
    const volumeCapacity = questionsPerDay * 30;
    const rawCap = Math.min(baseCapacity, volumeCapacity);
    const dynamicAlphaCap = Math.max(250, Math.floor(Number.isFinite(rawCap) ? rawCap : 250));
    const dynamicEffectiveN = dynamicAlphaCap;

    const refDateObj = options.referenceDate ? normalizeDate(options.referenceDate) : null;
    const now = refDateObj && Number.isFinite(refDateObj.getTime()) ? refDateObj.getTime() : Date.now();

    // ✅ LOTE-01 FIX: priors calculados SOBRE O MESMO ARRAY iterado abaixo.
    // Antes o slice(-2000) acontecia depois, desalinhando runningPriors[i].
    const MAX_ITERATIONS = 2000;
    const historyToProcess = historySortedForGaps.length > MAX_ITERATIONS
        ? historySortedForGaps.slice(-MAX_ITERATIONS)
        : historySortedForGaps;

    const runningPriors = new Float64Array(historyToProcess.length);
    if (historyToProcess.length > 0) {
        let priorSum = 0, priorC = 0, priorCount = 0;
        for (let j = 0; j < historyToProcess.length; j++) {
            const sScore = getSafeScore(historyToProcess[j], safeMaxScore);
            if (Number.isFinite(sScore)) {
                let rawPct = sScore / safeMaxScore;
                rawPct = options.isPenalizedFormat ? Math.max(0.05, (rawPct + 1) / 2) : Math.max(0, rawPct);
                const validPct = Math.min(1, rawPct);
                const y = validPct - priorC;
                const t = priorSum + y;
                priorC = (t - priorSum) - y;
                priorSum = t;
                priorCount++;
            }
            runningPriors[j] = priorCount > 0 ? priorSum / priorCount : 0.5;
        }
    }

    const avgTotalRaw = history.length > 0
        ? kahanSum(history.map(safeTotalEntry)) / history.length
        : safeSyntheticTotal;

    const avgTotal = Number.isFinite(avgTotalRaw) && avgTotalRaw > 0 ? avgTotalRaw : safeSyntheticTotal;

    const rawBaseLambda = history.length > 0 ? computeAdaptiveLambda(historySortedForGaps) : 0.08;
    const baseAdaptiveLambda = Number.isFinite(rawBaseLambda)
        ? Math.max(0.005, Math.min(1, rawBaseLambda))
        : 0.08;

    if (history.length > 0) {

        for (let i = 0; i < historyToProcess.length; i++) {
            const h = historyToProcess[i];

            const totalRaw = Number(h?.total);
            const hasTotal = Number.isFinite(totalRaw) && totalRaw > 0;
            const total = hasTotal ? totalRaw : 0;

            const normalizedScore = getSafeScore(h, safeMaxScore);
            if (!Number.isFinite(normalizedScore)) continue;

            const isPurePercentage = !hasTotal;

            let rawPct = normalizedScore / safeMaxScore;
            rawPct = options.isPenalizedFormat ? Math.max(0.05, (rawPct + 1) / 2) : Math.max(0, rawPct);
            const pct = Math.min(1, rawPct);

            const entryDate = normalizeDate(getHistoryDateValue(h));
            const prevDate = i > 0 ? normalizeDate(getHistoryDateValue(historyToProcess[i - 1])) : entryDate;

            const timeEntry = entryDate?.getTime();
            const timePrev = prevDate?.getTime();

            const gapDays = Number.isFinite(timeEntry) && Number.isFinite(timePrev)
                ? Math.max(0, Math.floor((timeEntry - timePrev) / 86400000))
                : 0;

            const rawLambda = baseAdaptiveLambda * Math.exp(-0.15 * i);
            const lambda = Math.max(0.005, Number.isFinite(rawLambda) ? rawLambda : baseAdaptiveLambda);

            const entryDecayRaw = i > 0 ? Math.exp(-lambda * gapDays) : 1.0;
            const entryDecay = Number.isFinite(entryDecayRaw) ? Math.max(0, Math.min(1, entryDecayRaw)) : 1.0;

            const cappedMaxN = Math.min(maxNEver, dynamicAlphaCap);
            const macroDecay = Math.max(0.1, Math.exp(-0.005 * (gapDays || 0)));

            // ✅ FIX: Piso de retenção proporcional ao decaimento, NÃO ao histórico máximo.
            // Usa um piso fixo pequeno (3-10) que decai com o tempo, permitindo
            // que o aluno realmente "esqueça" após longos períodos sem estudo.
            const retentionFloor = Math.max(3.0, Math.min(10.0, cappedMaxN * 0.05)) * macroDecay;

            if (entryDecay < 1.0) {
                const nBeforeDecay = alpha + beta;

                if (Number.isFinite(nBeforeDecay) && nBeforeDecay > 0) {
                    const currentP = alpha / nBeforeDecay;
                    const minN = retentionFloor;
                    const HARD_FLOOR = 3.0;
                    const safeFloor = Math.min(HARD_FLOOR, nBeforeDecay);

                    const nAfterDecayRaw = Math.max(safeFloor, Math.min(nBeforeDecay, Math.max(minN, nBeforeDecay * entryDecay)));
                    const nAfterDecay = Number.isFinite(nAfterDecayRaw) ? nAfterDecayRaw : safeFloor;

                    const priorP = i > 0 ? runningPriors[i - 1] : runningPriors[0] || 0.5;
                    const safePriorP = Number.isFinite(priorP) ? priorP : 0.5;

                    const regressedPRaw = (currentP * entryDecay) + (safePriorP * (1 - entryDecay));
                    const regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;

                    alpha = nAfterDecay * regressedP;
                    beta = nAfterDecay * (1 - regressedP);
                }
            }

            const rawItemWeight = Number(h?.weight ?? h?.difficulty ?? 1.0);
            const itemWeight = Math.max(0.001, Number.isFinite(rawItemWeight) ? rawItemWeight : 1.0);

            const stepCap = dynamicAlphaCap;

            if (isPurePercentage) {
                const syntheticNRaw = avgTotal * itemWeight;
                const syntheticN = Number.isFinite(syntheticNRaw) && syntheticNRaw > 0 ? syntheticNRaw : 0;

                let alphaHoje = pct * syntheticN;
                let betaHoje = (1 - pct) * syntheticN;

                const sumHoje = alphaHoje + betaHoje;
                if (Number.isFinite(sumHoje) && sumHoje > stepCap && sumHoje > 0) {
                    const clampDiario = stepCap / sumHoje;
                    alphaHoje *= clampDiario;
                    betaHoje *= clampDiario;
                }

                alpha += Number.isFinite(alphaHoje) ? alphaHoje : 0;
                beta += Number.isFinite(betaHoje) ? betaHoje : 0;
            } else if (total >= 1) {
                let correct = Math.max(0, Math.round(pct * total));
                const safeCorrect = Math.max(0, Math.min(total, correct));

                let acertosHoje = Math.max(0, safeCorrect * itemWeight);
                let errosHoje = Math.max(0, (total - safeCorrect) * itemWeight);

                const sumHoje = acertosHoje + errosHoje;
                if (Number.isFinite(sumHoje) && sumHoje > stepCap && sumHoje > 0) {
                    const clampDiario = stepCap / sumHoje;
                    acertosHoje *= clampDiario;
                    errosHoje *= clampDiario;
                }

                alpha += Number.isFinite(acertosHoje) ? acertosHoje : 0;
                beta += Number.isFinite(errosHoje) ? errosHoje : 0;
            }

            // ✅ Renormalização incremental a cada 50 iterações
            if (i % 50 === 0 && (alpha + beta) > dynamicAlphaCap * 2) {
              const factor = dynamicAlphaCap / (alpha + beta);
              alpha *= factor;
              beta *= factor;
            }

            // ✅ Sanidade final — se alpha ou beta ficaram NaN/Infinity, resetar
            if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha < 0 || beta < 0) {
              alpha = alpha0;
              beta = beta0;
            }

            const currentN = alpha + beta;
            if (!Number.isFinite(currentN)) {
                alpha = alpha0;
                beta = beta0;
                break;
            }

            if (currentN > maxNEver) {
                maxNEver = Math.min(currentN, dynamicAlphaCap);
            }
        }
    }

    const nAfterLoop = alpha + beta;
    if (Number.isFinite(nAfterLoop) && nAfterLoop > dynamicAlphaCap && nAfterLoop > 0) {
        const globalClamp = dynamicAlphaCap / nAfterLoop;
        alpha *= globalClamp;
        beta *= globalClamp;
    }

    const lastEntry = historySortedForGaps.length > 0 ? historySortedForGaps[historySortedForGaps.length - 1] : null;
    const lastDateStr = lastEntry ? getHistoryDateValue(lastEntry) : options.lastEventDate;

    if (lastDateStr) {
        const lastDate = normalizeDate(lastDateStr);
        const gapToToday = Math.max(0, Math.floor((now - (lastDate ? lastDate.getTime() : now)) / 86400000));

        if (gapToToday > 0) {
            const rawFinalLambda = baseAdaptiveLambda * Math.exp(-0.15 * (historySortedForGaps.length || 1));
            const finalLambda = Math.max(0.005, Number.isFinite(rawFinalLambda) ? rawFinalLambda : baseAdaptiveLambda);

            const finalDecayRaw = Math.exp(-finalLambda * gapToToday);
            const finalDecay = Number.isFinite(finalDecayRaw) ? Math.max(0, Math.min(1, finalDecayRaw)) : 1;

            const nBeforeDecay = alpha + beta;

            if (Number.isFinite(nBeforeDecay) && nBeforeDecay > 0) {
                const currentP = alpha / nBeforeDecay;

                const epistemicDecayRaw = Math.pow(finalDecay, 0.35);
                const epistemicDecay = Number.isFinite(epistemicDecayRaw) ? Math.max(0, Math.min(1, epistemicDecayRaw)) : 1;

                const safeMaxNEver = Number.isFinite(maxNEver) ? maxNEver : 0;
                const epistemicFloor = Math.max(3.0, Math.min(10.0, safeMaxNEver * 0.05));

                const nAfterDecayRaw = Math.max(epistemicFloor, Math.min(nBeforeDecay, nBeforeDecay * epistemicDecay));
                const nAfterDecay = Number.isFinite(nAfterDecayRaw) ? nAfterDecayRaw : Math.max(epistemicFloor, Math.min(nBeforeDecay, epistemicFloor));

                const empiricalPriorFinal = runningPriors.length > 0 ? runningPriors[runningPriors.length - 1] : 0.5;
                const safeEmpiricalPriorFinal = Number.isFinite(empiricalPriorFinal) ? empiricalPriorFinal : 0.5;

                const regressedPRaw = (currentP * finalDecay) + (safeEmpiricalPriorFinal * (1 - finalDecay));
                const regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;

                alpha = nAfterDecay * regressedP;
                beta = nAfterDecay * (1 - regressedP);
            }
        }
    }

    // FIX: Sanidade final — se alpha ou beta ficaram NaN/Infinity, resetar para prior
    if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha < 0 || beta < 0) {
      alpha = alpha0;
      beta = beta0;
    }

    const n = alpha + beta;

    if (!Number.isFinite(n) || n <= 0) {
        return { mean: 0, sd: 0, ciLow: 0, ciHigh: 0, alpha: alpha0, beta: beta0, n: 0 };
    }

    const effectiveN = Math.min(n, dynamicEffectiveN);
    const p = alpha / n;
    const effectiveAlpha = p * effectiveN;

    const z2 = Z_95 * Z_95;
    const n_tilde = effectiveN + z2;
    const p_tilde = (effectiveAlpha + z2 / 2) / n_tilde;

    const mediaDeQuestoesDoAlunoRaw = history.length > 0
        ? kahanSum(history.map(safeTotalEntry)) / history.length
        : 100;

    const mediaDeQuestoesDoAluno = Number.isFinite(mediaDeQuestoesDoAlunoRaw) && mediaDeQuestoesDoAlunoRaw > 0
        ? mediaDeQuestoesDoAlunoRaw
        : 100;

    const TAMANHO_PROVA_ESTIMADO = Math.max(20, Math.round(mediaDeQuestoesDoAluno));

    const rawEpistemicVar = (p_tilde * (1 - p_tilde)) / n_tilde;
    const epistemicVar = Number.isFinite(rawEpistemicVar) ? Math.max(1e-6, rawEpistemicVar) : 1e-6;

    const rawAleatoricVar = (p_tilde * (1 - p_tilde)) / TAMANHO_PROVA_ESTIMADO;
    const aleatoricVar = Number.isFinite(rawAleatoricVar) ? Math.max(1e-6, rawAleatoricVar) : 1e-6;

    const predictiveVariance = epistemicVar + aleatoricVar;
    const effectiveSd = Math.sqrt(Math.max(0, predictiveVariance));

    const tMultiplier = getConfidenceMultiplier(effectiveN, { allowFractional: true });
    const marginOfError = tMultiplier * effectiveSd * safeMaxScore;
    const adjustedMarginOfError = Number.isFinite(marginOfError) ? marginOfError : 0;

    const centerForCI = p_tilde * safeMaxScore;
    const trueMean = p * safeMaxScore;

    let ciLow = centerForCI - adjustedMarginOfError;
    let ciHigh = centerForCI + adjustedMarginOfError;

    if (!Number.isFinite(ciLow)) ciLow = Math.max(0, trueMean);
    if (!Number.isFinite(ciHigh)) ciHigh = Math.min(safeMaxScore, trueMean);

    if (trueMean < ciLow) ciLow = trueMean;
    if (trueMean > ciHigh) ciHigh = trueMean;

    const strictLow = Number.isFinite(ciLow) ? Math.max(0, ciLow) : 0;
    const strictHigh = Number.isFinite(ciHigh) ? Math.min(safeMaxScore, ciHigh) : safeMaxScore;

    let alphaOut = alpha;
    let betaOut = beta;

    if (n > dynamicEffectiveN && n > 0) {
        const factor = dynamicEffectiveN / n;
        alphaOut = alpha * factor;
        betaOut = beta * factor;
    }

    return {
        mean: trueMean,
        sd: effectiveSd * safeMaxScore,
        ciLow: strictLow,
        ciHigh: strictHigh,
        unclampedLow: ciLow,
        unclampedHigh: ciHigh,
        alpha: alphaOut,
        beta: betaOut,
        n: n > dynamicEffectiveN ? dynamicEffectiveN : n,
    };
}

export function computeCategoryStats(history, weight, _daysValue = 60, maxScore = 100) {
    const safeHistory = toHistoryArray(history);
    if (!safeHistory.length) return null;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);

    const rawSynthetic = getSyntheticTotal(safeMaxScore);
    const syntheticTotal = Number.isFinite(rawSynthetic) ? rawSynthetic : 20;

    const historyWithSynthetics = safeHistory
        .map(h => {
            const score = getSafeScore(h, safeMaxScore);
            const total = Number(h?.total);

            if ((!Number.isFinite(total) || total <= 0) && Number.isFinite(score)) {
                if (typeof h === 'number') {
                    return { score: h, total: syntheticTotal };
                }

                return {
                    ...(h && typeof h === 'object' ? h : { original: h }),
                    total: syntheticTotal
                };
            }

            return h;
        })
        .filter(Boolean);

    const validHistory = historyWithSynthetics.filter(h => {
        const total = Number(h?.total);
        return Number.isFinite(total) && total > 0;
    });

    const historyToUse = validHistory.length > 0 ? validHistory : historyWithSynthetics;

    const scores = historyToUse
        .map(h => getSafeScore(h, safeMaxScore))
        .filter(Number.isFinite);

    const validHistoryForMean = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore))
    );

    let sumWeightMean = 0;
    let sumScoreMean = 0;

    validHistoryForMean.forEach(h => {
        const totalWeight = Number(h?.total);
        if (!Number.isFinite(totalWeight) || totalWeight <= 0) return;

        const rawDiff = Number(h?.weight ?? h?.difficulty ?? 1.0);
        const diffWeight = Number.isFinite(rawDiff) && rawDiff >= 0 ? Math.max(0.001, rawDiff) : 1.0;
        const effW = totalWeight * diffWeight;

        sumWeightMean += effW;
        sumScoreMean += getSafeScore(h, safeMaxScore) * effW;
    });

    const mRaw = sumWeightMean > 0 ? sumScoreMean / sumWeightMean : mean(scores);
    const m = Number.isFinite(mRaw) ? mRaw : 0;

    let variance = 0;

    if (historyToUse.length > 1) {
        let wVarSum = 0;
        let sumW = 0;
        let sumW2 = 0;

        const sortedScores = [...scores].sort((a, b) => a - b);

        const median = sortedScores.length % 2 === 0
            ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
            : sortedScores[Math.floor(sortedScores.length / 2)];

        const absoluteDeviations = scores
            .map(s => Math.abs(s - median))
            .sort((a, b) => a - b);

        const rawMad = absoluteDeviations.length % 2 === 0
            ? (absoluteDeviations[absoluteDeviations.length / 2 - 1] + absoluteDeviations[absoluteDeviations.length / 2]) / 2
            : absoluteDeviations[Math.floor(absoluteDeviations.length / 2)];

        const mad = Number.isFinite(rawMad) && rawMad > 0 ? rawMad * 1.4826 : 0.001 * safeMaxScore;
        const clampLimit = 3.5 * mad;

        validHistoryForMean.forEach(h => {
            const totalWeight = Number(h?.total);
            if (!Number.isFinite(totalWeight) || totalWeight <= 0) return;

            const safeScore = getSafeScore(h, safeMaxScore);
            if (!Number.isFinite(safeScore)) return;

            const robustScore = Number.isFinite(median) && Number.isFinite(clampLimit)
                ? Math.max(median - clampLimit, Math.min(median + clampLimit, safeScore))
                : safeScore;

            const rawDiff = Number(h?.weight ?? h?.difficulty ?? 1.0);
            const difficultyWeight = Number.isFinite(rawDiff) && rawDiff >= 0 ? Math.max(0.001, rawDiff) : 1.0;
            const effectiveWeight = totalWeight * difficultyWeight;

            wVarSum += effectiveWeight * Math.pow(robustScore - m, 2);
            sumW += effectiveWeight;
            sumW2 += Math.pow(effectiveWeight, 2);
        });

        const kishDifference = sumW - (sumW > 0 ? (sumW2 / sumW) : 0);
        const kishDenom = kishDifference > 1e-4 ? kishDifference : Math.max(1e-4, sumW);

        const rawSampleVar = sumW > 0 ? wVarSum / kishDenom : 0;
        const sampleVar = Number.isFinite(rawSampleVar) ? Math.max(0, rawSampleVar) : 0;

        const POPULATION_SD = getDynamicPriorSD(historyToUse, safeMaxScore);
        const safePopulationSD = Number.isFinite(POPULATION_SD) ? POPULATION_SD : 0;
        const popVar = Math.pow(safePopulationSD, 2);

        const safeStudentVar = Math.max(popVar * 0.05, sampleVar);
        const ratio = safeStudentVar > 0 ? popVar / safeStudentVar : 3.0;

        let KAPPA = Math.max(0.1, Math.min(3.0, Number.isFinite(ratio) ? ratio : 3.0));

        const sortedForDates = getSortedHistory(historyToUse);
        const firstDateParsed = safeDateParse(getHistoryDateValue(sortedForDates[0]));
        const lastDateParsed = safeDateParse(getHistoryDateValue(sortedForDates[sortedForDates.length - 1]));

        const firstDateMs = firstDateParsed && Number.isFinite(firstDateParsed.getTime())
            ? firstDateParsed.getTime()
            : Date.now();

        const lastDateMs = lastDateParsed && Number.isFinite(lastDateParsed.getTime())
            ? lastDateParsed.getTime()
            : Date.now();

        const timeSpreadDays = Math.max(0, (lastDateMs - firstDateMs) / 86400000);

        if (
            historyToUse.length >= 2 &&
            sampleVar < (0.0004 * safeMaxScore * safeMaxScore) &&
            timeSpreadDays > 7
        ) {
            KAPPA = KAPPA * Math.exp(-timeSpreadDays / 14);
        }

        const effectiveN = sumW2 > 0 ? (sumW * sumW) / sumW2 : historyToUse.length;
        const n_eff = Number.isFinite(effectiveN) ? Math.max(1, effectiveN) : 1;
        const kishDenomTerm = n_eff > 1.5 ? (n_eff - 1) : 1;

        const rawVariance = (kishDenomTerm * sampleVar + KAPPA * popVar) / (kishDenomTerm + KAPPA);
        variance = Number.isFinite(rawVariance) ? Math.max(0, rawVariance) : popVar;
    } else {
        const priorSD = getDynamicPriorSD(historyToUse, safeMaxScore);
        variance = Math.pow(Number.isFinite(priorSD) ? priorSD : 0, 2);
    }

    const sd = Math.max(Math.sqrt(Math.max(0, variance)), 0.001 * safeMaxScore);
    const safeSD = Number.isFinite(sd) ? sd : 0.001 * safeMaxScore;

    const slopePerDay = calculateSlope(historyToUse, safeMaxScore);
    const safeSlope = Number.isFinite(slopePerDay) ? slopePerDay : 0;

    const trendThreshold = getDynamicTrendThreshold(m, safeMaxScore);

    const validHistoryForTrend = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore))
    );

    const sortedForTrendCap = getSortedHistory(validHistoryForTrend);

    const lastScoreRaw = sortedForTrendCap.length > 0
        ? getSafeScore(sortedForTrendCap[sortedForTrendCap.length - 1], safeMaxScore)
        : m;

    const safeLastScore = Number.isFinite(lastScoreRaw) ? lastScoreRaw : m;

    const limiteSuperior = safeMaxScore - safeLastScore;
    const limiteInferior = -safeLastScore;

    const rawTrend = Math.max(limiteInferior, Math.min(limiteSuperior, safeSlope * 30));
    const safeRawTrend = Number.isFinite(rawTrend) ? rawTrend : 0;

    let trendLabel = 'stable';
    if (safeRawTrend > trendThreshold) trendLabel = 'up';
    else if (safeRawTrend < -trendThreshold) trendLabel = 'down';

    const level = m > 0.7 * safeMaxScore ? 'ALTO' : m > 0.4 * safeMaxScore ? 'MÉDIO' : 'BAIXO';

    return {
        mean: m,
        sd: safeSD,
        n: historyToUse.length,
        weight,
        history: safeHistory,
        trend: trendLabel,
        trendValue: safeRawTrend,
        level
    };
}

export const calculateEMA = (scores, alpha = 0.25) => {
    const clean = toHistoryArray(scores)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, 100))
        .filter(Number.isFinite);

    if (!clean.length) return 0;

    let ema = clean[0];
    const maxObserved = clean.reduce((a, b) => Math.max(a, b), 1);

    for (let i = 1; i < clean.length; i++) {
        const delta = clean[i] - ema;
        const range = maxObserved;
        const absDelta = Math.abs(delta);

        const upBonus = Math.min(0.10, 0.05 * (absDelta / range));
        const downBonus = Math.min(0.03, 0.015 * (absDelta / range));
        const trendBonus = delta >= 0 ? upBonus : downBonus;
        const currentAlpha = Math.min(1, alpha + trendBonus);

        ema = (clean[i] * currentAlpha) + (ema * (1 - currentAlpha));
    }

    return Number.isFinite(ema) ? ema : 0;
};

export const calculateTimeWeightedEMA = (historicData, lambda = 0.05) => {
    const safeHistory = toHistoryArray(historicData);
    if (!safeHistory.length) return null;

    const validData = safeHistory.filter(d =>
        Number.isFinite(d?.score) && (d?.timestamp != null || d?.date != null)
    );

    if (!validData.length) return null;

    const getTime = (d) => {
        if (d?.timestamp != null && Number.isFinite(d.timestamp)) return d.timestamp;

        if (d?.date != null) {
            const ms = new Date(d.date).getTime();
            return Number.isFinite(ms) ? ms : NaN;
        }

        return NaN;
    };

    validData.sort((a, b) => getTime(a) - getTime(b));

    let ema = validData[0].score;
    let lastTime = getTime(validData[0]);

    for (let i = 1; i < validData.length; i++) {
        const currentItem = validData[i];
        const currentTime = getTime(currentItem);

        if (!Number.isFinite(currentTime) || !Number.isFinite(lastTime)) continue;

        const deltaDays = Math.max(0, (currentTime - lastTime) / 86400000);
        const dynamicAlpha = 1 - Math.exp(-lambda * deltaDays);
        const safeAlpha = Math.max(0.1, Math.min(1.0, dynamicAlpha));

        ema = safeAlpha * currentItem.score + (1 - safeAlpha) * ema;
        lastTime = currentTime;
    }

    return Number.isFinite(ema) ? ema : null;
};

export {
    computeBrierScore,
    computeLogLoss,
    summarizeCalibration,
    computeCalibrationDiagnostics,
    shrinkProbabilityToNeutral
} from '../utils/calibration.js';

export function computeHierarchicalAdjustment(categories, pooledSD) {
    const safeCategories = toHistoryArray(categories);
    if (!safeCategories.length) return safeCategories;

    const validCategories = safeCategories.filter(c =>
        Number.isFinite(c.mean) && Number.isFinite(c.n) && c.n > 0
    );

    if (!validCategories.length) return safeCategories;

    const globalMean = kahanSum(validCategories.map(c => c.mean || 0)) / Math.max(1, validCategories.length);

    const tau2 = kahanSum(validCategories.map(c => Math.pow((c.mean || 0) - globalMean, 2))) /
        Math.max(1, validCategories.length - 1);

    return safeCategories.map(cat => {
        if (!Number.isFinite(cat.mean) || !cat.n) {
            return { ...cat, bayesianMean: cat.mean, bayesianSd: cat.sd };
        }

        const localSD = Number.isFinite(cat.sd) ? cat.sd : (pooledSD || 15);
        const localVar = Math.pow(localSD, 2) / Math.max(1, cat.n);
        const denom = localVar + tau2;
        const B = denom > 1e-15 ? localVar / denom : 0;

        const bayesianMean = B * globalMean + (1 - B) * cat.mean;
        const popVar = Math.pow(pooledSD || 15, 2);
        const bayesianSd = Math.sqrt(Math.max(0, B * popVar + (1 - B) * Math.pow(localSD, 2)));

        return {
            ...cat,
            bayesianMean,
            bayesianSd,
            shrinkage: B
        };
    });
}

export function computeAgilityMetrics(history, targetSeconds = 120) {
    const safeHistory = toHistoryArray(history);
    if (!safeHistory.length) return { avgSeconds: 0, agilityPenalty: 0 };

    let totalTimeSpent = 0;
    let totalTimedQuestions = 0;

    for (const h of safeHistory) {
        if (h.timeSpent != null && h.timedQuestoes != null) {
            const ts = Number(h.timeSpent);
            const tq = Number(h.timedQuestoes);

            if (Number.isFinite(ts) && Number.isFinite(tq) && ts > 0 && tq > 0) {
                totalTimeSpent += ts;
                totalTimedQuestions += tq;
            }
        }
    }

    const avgSeconds = totalTimedQuestions > 0 ? totalTimeSpent / totalTimedQuestions : 0;
    const safeTarget = Math.max(30, Number(targetSeconds) || 120);

    const agilityPenalty = avgSeconds > safeTarget
        ? Math.min(0.4, (avgSeconds - safeTarget) / (safeTarget * 1.25))
        : 0;

    return {
        avgSeconds: Math.round(avgSeconds),
        agilityPenalty: Number(agilityPenalty.toFixed(4))
    };
}

export function calculateTrend(history, maxScore = 100) {
    const safeHistory = toHistoryArray(history);
    if (safeHistory.length < 2) return 0;

    const sorted = getSortedHistory(safeHistory);
    if (sorted.length < 2) return 0;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);

    // ✅ FIX: Filtrar entradas com datas válidas ANTES de calcular.
    // Isso garante que firstDate sempre seja um timestamp válido.
    const validEntries = [];
    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const dateParsed = safeDateParse(h?.date ?? h?.createdAt);
        const time = dateParsed?.getTime();
        const y = getSafeScore(h, safeMaxScore);
        if (Number.isFinite(time) && Number.isFinite(y)) {
            validEntries.push({ time, y });
        }
    }

    if (validEntries.length < 2) return 0;

    // ✅ FIX: firstDate agora é garantidamente válido
    const firstDate = validEntries[0].time;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const validN = validEntries.length;

    for (let i = 0; i < validN; i++) {
        const x = (validEntries[i].time - firstDate) / 86400000;
        const y = validEntries[i].y;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }

    const denominator = (validN * sumX2) - (sumX * sumX);
    if (Math.abs(denominator) < 1e-12) return 0;

    const slopePerDay = ((validN * sumXY) - (sumX * sumY)) / denominator;
    // ✅ LOTE-01 FIX: slope POR DIA. O "* 10" anterior inflava trendValue em 10×
    // e fazia o clamp do calculateSlope saturar uma ordem de grandeza antes.
    return Number.isFinite(slopePerDay) ? slopePerDay : 0;
}
```

---

## File: `src/engine/projection.js`
*Linhas: 1014 | Tamanho: 48.75 KB*

```javascript
// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32 } from './random.js';
import { safeDateParse, getDateKey } from '../utils/dateHelper.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { getPercentile } from './math/percentile.js';
import { conformalPredictionInterval } from './math/bootstrap.js';
import { SCENARIO_CONFIG } from '../utils/monteCarloScenario.js';

import { sampleTruncatedNormal, ensurePositiveSemiDefinite, choleskyDecomposition, applyCovariance, generateGaussian } from './math/gaussian.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';
import { kahanSum, kahanMean } from './math/kahan.js';
import { weightedRegression, calculateSlopeStdError, getSortedHistory, calculateTrend } from './stats.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
export { weightedRegression, calculateSlopeStdError, getSortedHistory };

// 1. Blindagem de Datas: Adicione este helper no topo do arquivo (após os imports)
const getSafeTime = (dateInput) => {
    const parsed = safeDateParse(dateInput);
    return (parsed && !Number.isNaN(parsed.getTime())) ? parsed.getTime() : Date.now();
};

// -----------------------------
// Volatilidade Robusta (MSSD + MAD Blended)
// -----------------------------

/**
 * NEW: Simple non-linear detrending helper (log-time improvement curve).
 * Many students improve fast then plateau.
 */
export function computeNonLinearTrend(history, maxScore = 100, lambda = 0.08) {
  const sorted = getSortedHistory(history);
  if (sorted.length < 4) return { slope: 0, intercept: 50, type: 'linear' };

  const now = Date.now();
  const t0 = getSafeTime(sorted[0].date || sorted[0].createdAt);

  // Fit simple model: y ~ a + b * log(1 + days)
  let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;

  sorted.forEach(h => {
    const y = getSafeScore(h, maxScore);
    const t = Math.max(0, (getSafeTime(h.date || h.createdAt) - t0) / 86400000);
    const x = Math.log(1 + t + 1); // log time
    const w = Math.exp(-lambda * Math.max(0, (now - getSafeTime(h.date || h.createdAt)) / 86400000));

    sumW += w;
    sumWX += w * x;
    sumWY += w * y;
    sumWXX += w * x * x;
    sumWXY += w * x * y;
  });

  const denom = (sumWXX * sumW - sumWX * sumWX);
  if (Math.abs(denom) < 1e-9) return { slope: 0, intercept: sumWY / sumW, type: 'log' };

  const b = (sumWXY * sumW - sumWX * sumWY) / denom;
  const a = (sumWY - b * sumWX) / sumW;

  return { slope: b, intercept: a, type: 'log_time', logTimeFit: true };
}

export function calculateRobustVolatility(history, maxScore = 100, minScore = 0, options = {}) {
    const sorted = getSortedHistory(history);
    if (!sorted || sorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const validSorted = sorted.filter(h => Number.isFinite(getSafeScore(h, maxScore)));
    if (validSorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const lambda = options.lambda || 0.08;
    const now = options.referenceDate || Date.now();
    const _scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    const { slope, intercept } = weightedRegression(validSorted, lambda, maxScore, options);
    // CORREÇÃO: Defesa estrita contra null/undefined que disparam TypeError no getTime()
    const d0 = safeDateParse(validSorted[0].date || validSorted[0].createdAt);
    const t0_vol = (d0 && !Number.isNaN(d0.getTime())) ? d0.getTime() : Date.now();
    
    // OTIMIZAÇÃO DE PERFORMANCE: Fusão de loops O(5N) para O(N)
    let sumWeights = 0, sumResidualsWeighted = 0, sumSw = 0, sumSw2 = 0;

    const residualSamples = validSorted.map(h => {
        const hDate = h.date || h.createdAt;
        const parsed = safeDateParse(hDate);
        if (!parsed || Number.isNaN(parsed.getTime())) return null;
        const x = (parsed.getTime() - t0_vol) / 86400000;
        const t = Math.max(0, (now - parsed.getTime()) / 86400000);
        const w = Math.exp(-lambda * t);
        const y = getSafeScore(h, maxScore);
        const val = y - (intercept + slope * x); // Resíduo (detrended)
        
        // Acumulação numa única passagem
        sumWeights += w;
        sumResidualsWeighted += val * w;
        sumSw += val * val * w;
        sumSw2 += w * w;

        return { value: val, weight: w }; 
    }).filter(Boolean);

    // CORREÇÃO: Prevenir o colapso por "amnésia temporal". Se os pesos decaírem para zero absoluto,
    // evitamos a divisão por zero para que o aluno mantenha um cone de projeção conservador.
    const safeWeights = sumWeights > 1e-15 ? sumWeights : 1;
    const expectedResidual = sumWeights > 1e-15 ? (sumResidualsWeighted / safeWeights) : 0;
    
    // CORREÇÃO: Calcular o Tamanho Efetivo de Amostra (Kish) dos pesos exponenciais
    const effectiveN = sumSw2 > 1e-15 ? (sumWeights * sumWeights) / sumSw2 : 1;
    
    // O bessel deve responder ao Effective N, não à contagem bruta temporal (n_res)
    const bessel = effectiveN > 1.5 ? effectiveN / (effectiveN - 1) : 1;
    const mssdVariance = sumWeights > 1e-15 ? Math.max(0, ((sumSw / safeWeights) - (expectedResidual * expectedResidual)) * bessel) : 0;

    const weightedMedian = (arr) => {
        if (!arr.length) return 0;
        const sortedArr = [...arr].sort((a, b) => a.value - b.value);
        const totalW = kahanSum(sortedArr.map(it => it.weight));
        if (totalW < 1e-15) return sortedArr[Math.floor(sortedArr.length / 2)].value;
        let accW = 0;
        for (const it of sortedArr) {
            accW += it.weight;
            if (accW >= totalW * 0.5) return it.value;
        }
        return sortedArr[sortedArr.length - 1].value;
    };

    const medianResidual = weightedMedian(residualSamples);
    const absDev = residualSamples.map(it => ({ value: Math.abs(it.value - medianResidual), weight: it.weight }));
    const mad = weightedMedian(absDev);
    const robustSigma = 1.4826 * mad;
    const robustVariance = robustSigma * robustSigma;
    const blendedVariance = (0.75 * mssdVariance) + (0.25 * robustVariance);

    // O PULO DO GATO: Shrinkage Bayesiano para Volatilidade (Bug 1 Fix)
    // Assumimos que o piso natural de flutuação de qualquer aluno é de ~4% do Range
    const rangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const floorVolatility = rangeOU * 0.04; 
    const floorVariance = Math.pow(floorVolatility, 2);
    
    // Quanto menor a amostra, mais puxamos para o piso natural.
    const confidence = Math.min(1, validSorted.length / 15);
    const trueVariance = (blendedVariance * confidence) + (floorVariance * (1 - confidence));

    return Math.sqrt(Math.max(1e-6, trueVariance));
}

export function calculateVolatility(history, maxScore = 100, minScore = 0) {
    if (!Array.isArray(history) || history.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const scores = history.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    const n = scores.length;
    if (n < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const meanVal = kahanMean(scores);
    const variance = kahanSum(scores.map(b => Math.pow(b - meanVal, 2))) / (n - 1);
    return Math.sqrt(variance);
}

// -----------------------------
// MSSD — Mean Successive Squared Differences (BUG-MATH-01)
// Mede instabilidade SEM penalizar crescimento monotônico.
// -----------------------------
export function calculateMSSD(history, maxScore = 100, minScore = 0) {
  const safeHistory = getSortedHistory(history);
  if (!Array.isArray(safeHistory) || safeHistory.length < 2) {
    const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    return 0.05 * range;
  }
  
  const firstDateObj = safeDateParse(safeHistory[0].date || safeHistory[0].createdAt);
  const t0 = firstDateObj ? firstDateObj.getTime() : Date.now();
  
  // ✅ FIX: Create aligned pairs to prevent index misalignment
  const validPairs = [];
  for (let i = 0; i < safeHistory.length; i++) {
    const h = safeHistory[i];
    const score = getSafeScore(h, maxScore);
    const dateObj = safeDateParse(h.date || h.createdAt);
    const t = dateObj ? dateObj.getTime() : NaN;
    
    if (Number.isFinite(score) && Number.isFinite(t)) {
      validPairs.push({
        score: score,
        timeX: (t - t0) / 86400000,
        fatigueFlag: h.fatigueFlag
      });
    }
  }
  
  const fn = validPairs.length;
  if (fn < 2) {
    const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    return 0.05 * range;
  }
  
  const scores = validPairs.map(p => p.score);
  const timeX = validPairs.map(p => p.timeX);
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for(let i = 0; i < fn; i++) {
    const tx = timeX[i];
    sumX += tx;
    sumY += scores[i];
    sumXY += tx * scores[i];
    sumXX += tx * tx;
  }
  
  const det = fn * sumXX - sumX * sumX;
  const slope = det === 0 ? 0 : (fn * sumXY - sumX * sumY) / det;
  
  const detrendedScores = scores.slice(0, fn).map((y, i) => y - (slope * timeX[i])).filter(Number.isFinite);
  const dn = detrendedScores.length;
  
  let sumSqDiff = 0;
  let validTransitions = 0;
  
  for (let i = 1; i < dn; i++) {
    const diff = detrendedScores[i] - detrendedScores[i - 1];
    if (Number.isFinite(diff)) {
      const isFatigueDrop = diff < 0 && validPairs[i]?.fatigueFlag;
      const effectiveDiff = isFatigueDrop ? diff * 0.5 : diff;
      sumSqDiff += Math.pow(effectiveDiff, 2);
      validTransitions++;
    }
  }
  
  const rmssd = (sumSqDiff) / (2 * Math.max(1, validTransitions));
  return Math.sqrt(Math.max(1e-6, rmssd));
}

// -----------------------------
// EMA Dinâmico
// -----------------------------
export function calculateDynamicEMA(currentScore, previousEMA, n, daysSinceLast = 1) {
    // BUG-02 FIX: Implementação de EMA Dinâmica com Decaimento Temporal Contínuo.
    // Resolve a distorção onde longos períodos de inatividade eram ignorados (amnésia temporal).
    // Fórmula: α_real = 1 - (1 - α_base)^Δt
    const alphaBase = 2 / (n + 1);
    const deltaT = Math.max(1, daysSinceLast);
    
    // O decaimento exponencial contínuo garante que o peso da nova nota cresça proporcionalmente
    // ao tempo decorrido desde o último registro, compensando o "esquecimento".
    const alphaDinamico = 1 - Math.pow(1 - alphaBase, deltaT);
    
    // CORREÇÃO: O teto cognitivo desce de 0.95 para 0.40.
    // Garante que, independentemente do gap temporal, um teste único nunca
    // substitui mais de 40% da inércia da memória de longo prazo consolidada.
    const safeAlpha = Math.min(0.40, alphaDinamico);
    
    return (currentScore * safeAlpha) + (previousEMA * (1 - safeAlpha));
}

// -----------------------------
// Drift Clampeado
// -----------------------------
// ✅ FIX: calculateSlope com clamp proporcional à escala
export function calculateSlope(trendOrHistory, maxScoreOrOptions = 100, options = {}) {
  if (Array.isArray(trendOrHistory)) {
    const maxScore = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : 100;
    const opts = typeof maxScoreOrOptions === 'object' ? maxScoreOrOptions : options;
    
    const normalizedHistory = trendOrHistory.map(item => {
      if (typeof item === 'number') {
        return { score: item, date: null };
      }
      if (item && typeof item === 'object') {
        return {
          score: Number.isFinite(item.score) ? item.score : NaN,
          date: item.date || item.createdAt || null
        };
      }
      return { score: NaN, date: null };
    }).filter(item => Number.isFinite(item.score));
    
    if (normalizedHistory.length < 2) return 0;
    return calculateAdaptiveSlope(normalizedHistory, maxScore, opts);
  }
  
  // ✅ FIX: Clamp proporcional à escala da prova
  const maxScore = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : 100;
  const absoluteMax = 0.004 * maxScore; // 0.4% da escala por dia
  
  let slope = Number(trendOrHistory) || 0;
  if (!Number.isFinite(slope)) return 0;
  
  if (slope > absoluteMax) slope = absoluteMax;
  if (slope < -absoluteMax) slope = -absoluteMax;
  
  return slope;
}

export function calculateAdaptiveSlope(history, maxScore = 100, options = {}) {
    const trend = calculateTrend(history, maxScore);
    return calculateSlope(trend, maxScore, options);
}

// -----------------------------
// 💡 Crescimento Logístico (Curva-S)
// -----------------------------
export function logisticRegression(history, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    if (sorted.length < 4) return { isLogistic: false };

    const now = options.referenceDate || Date.now();
    const historicalScores = sorted.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    if (historicalScores.length < 4) return { isLogistic: false };
    
    const meanVal = kahanSum(historicalScores) / Math.max(1, historicalScores.length);
    const devs = historicalScores.map(b => Math.pow(b - meanVal, 2));
    const currentVariance = Math.sqrt(kahanSum(devs) / Math.max(1, historicalScores.length - 1));

    let L = maxScore;
    if (historicalScores.length >= 4) {
        const validScores = historicalScores;
        if (validScores.length >= 4) {
            const sortedScores = [...validScores].sort((a, b) => a - b);
            const peak1 = sortedScores[sortedScores.length - 1];
            const peak2 = sortedScores[sortedScores.length - 2];
            const robustPeak = (peak1 * 0.6) + (peak2 * 0.4);
            const dynamicHeadroom = Math.min(maxScore * 0.15, Math.max(currentVariance * 1.5, maxScore * 0.05));
            // BUG-AUDIT-07 FIX: calculateSlope espera objetos {date, score}, não números puros.
            // Gerar objetos sintéticos com datas espaçadas de 7 dias para manter o contrato.
            const recentRaw = validScores.slice(-4);
            const recentAsObjects = recentRaw.map((s, idx) => ({
                score: s,
                date: getDateKey(new Date(Date.now() - (recentRaw.length - 1 - idx) * 7 * 86400000))
            }));
            const recentTrend = calculateTrend(recentAsObjects, maxScore);
            const recentSlope = calculateSlope(recentTrend, maxScore, options);
            const slopeMultiplier = recentSlope > 0 ? Math.min(1, recentSlope / (maxScore * 0.01)) : 0;
            
            L = robustPeak + (dynamicHeadroom * slopeMultiplier);
            L = Math.max(validScores[validScores.length - 1] + 1, Math.min(maxScore + 0.1, L));
        } else {
            const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
            const peakScore = getPercentile(sortedForPercentile, 0.90);
            L = Math.min(maxScore + 0.1, peakScore + (maxScore * 0.10));
        }
    } else {
        const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
        const peakScore = getPercentile(sortedForPercentile, 0.90);
        const spaceToMax = maxScore - peakScore;
        const dynamicHeadroom = Math.max(currentVariance * 1.5, maxScore * 0.10, spaceToMax * 0.25);
        L = Math.min(maxScore + 0.1, peakScore + dynamicHeadroom);
    }

    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const t = Math.max(0, (now - getSafeTime(hDate)) / 86400000);
        const w = Math.exp(-0.08 * t);
        const x = (getSafeTime(hDate) - getSafeTime(sorted[0].date || sorted[0].createdAt)) / 86400000;
        
        let y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) return;
        
        y = Math.max(maxScore * 0.01, Math.min(maxScore, y));

        const safeMin = options.minScore || 0;
        const safeL = Math.max(L, y + 0.5); 
        // Offset proporcional à escala (0.1% do range) para evitar logit ±∞
        const logitOffset = Math.max(0.01, (safeL - safeMin) * 0.001);
        const boundedY = Math.max(safeMin + logitOffset, Math.min(safeL - logitOffset, y)); 
        const logitY = Math.log((boundedY - safeMin) / (safeL - boundedY));

        sumW += w;
        sumWX += w * x;
        sumWY += w * logitY;
        sumWXX += w * x * x;
        sumWXY += w * x * logitY;
    });

    const det = sumW * sumWXX - sumWX * sumWX;
    if (Math.abs(det) < 1e-6) return { isLogistic: false };

    const k = (sumW * sumWXY - sumWX * sumWY) / det;
    const logitIntercept = (sumWXX * sumWY - sumWX * sumWXY) / det;

    return { 
        k, 
        intercept: logitIntercept, 
        isLogistic: true, 
        L, 
        t0: getSafeTime(sorted[0].date || sorted[0].createdAt) 
    };
}

export function projectScore(history, projectDays = 60, minScore = 0, maxScore = 100, options = {}) {
    const sortedHistory = getSortedHistory(history);
    if (!sortedHistory || sortedHistory.length === 0) return { projected: 0, marginOfError: 0 };

    const logisticFit = logisticRegression(sortedHistory, maxScore, options);
    let projectedScore;
    const now = options.referenceDate || Date.now();
    
    const { slopeStdError } = sortedHistory.length >= 2 ? weightedRegression(sortedHistory, 0.08, maxScore, options) : { slopeStdError: 0 };
    let eventVolatility = calculateMSSD(sortedHistory, maxScore, minScore);

    // Bug 2.3 Fix: Divergência Asintótica no Amortecimento
    let linearSlope = 0;
    if (!(logisticFit.isLogistic && logisticFit.k > 0)) {
        let trend = calculateTrend(sortedHistory, maxScore);
        linearSlope = calculateSlope(trend, maxScore, options);
    }

    const dampingBase = computeAdaptiveDampingBase({
        sampleSize: sortedHistory.length,
        drift: linearSlope,
        driftUncertainty: slopeStdError,
        scaleFactor: maxScore / 100,
        normalizedVol: (eventVolatility / (maxScore - minScore > 0 ? maxScore - minScore : maxScore)) * 100
    });

    const maxEffectiveDays = dampingBase * Math.log(1 + projectDays / dampingBase);
    const effectiveDaysForDrift = Math.min(projectDays, maxEffectiveDays);

    if (logisticFit.isLogistic && logisticFit.k > 0) {
        const { k, intercept, L, t0 } = logisticFit;
        const targetTimeX = ((now - t0) / 86400000) + projectDays;
        const exponent = -(k * targetTimeX + intercept);
        const safeExponent = Math.max(-50, Math.min(50, exponent));
        const safeMin = options.minScore || 0;
        projectedScore = safeMin + ((L - safeMin) / (1 + Math.exp(safeExponent)));
    } else {
        // Removemos a mistura corrompida. O EMA continuará a usar o `linearSlope`
        // para projetar o futuro no Random Walk.

        const rawScore = getSafeScore(sortedHistory[0], maxScore);
        let ema = Number.isFinite(rawScore) ? rawScore : 0;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore);
            
            // PSEUDO-TRI: Rebalanceamento por dificuldade global
            if (options.globalBaselinePct !== undefined && options.globalBaselinePct > 0) {
                const globalMean = (options.globalBaselinePct / 100) * maxScore;
                if (globalMean > 0) {
                    // Se o aluno tira 80 e a média global é 50, a nota "efetiva" puxa o EMA para cima
                    // Limitado a um bônus/punição máximo de 5% para não distorcer a realidade
                    const difficultyDiff = (currentPoint - globalMean) / maxScore;
                    currentPoint = currentPoint + (difficultyDiff * maxScore * 0.05); 
                    currentPoint = Math.max(minScore, Math.min(maxScore, currentPoint));
                }
            }

            if (!Number.isNaN(currentPoint)) {
                // CORREÇÃO: Limitar a inércia a 15 eventos para evitar o congelamento permanente do EMA
                ema = calculateDynamicEMA(currentPoint, ema, Math.min(i + 1, 15), daysSinceLast);
            }
        }

        
        // CORREÇÃO: Driftar a EMA da data do último teste até o dia de HOJE, 
        // para alinhar a origem do vetor temporal com a realidade atual.
        const lastHistoryDate = getSafeTime(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const daysToToday = Math.max(0, (now - lastHistoryDate) / 86400000);

        if (options.currentMean !== undefined) {
            const daysToNow = Math.max(1, daysToToday);
            ema = calculateDynamicEMA(options.currentMean, ema, sortedHistory.length + 1, daysToNow);
        }

        const driftToToday = linearSlope * (dampingBase * Math.log(1 + daysToToday / dampingBase));
        const currentScoreEstimate = ema + driftToToday;

        // Projeção final 100% matéticamente consistente
        projectedScore = currentScoreEstimate + linearSlope * effectiveDaysForDrift;
    }

    const avgGapDays = sortedHistory.length > 1 
        ? ((safeDateParse(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt) - safeDateParse(sortedHistory[0].date || sortedHistory[0].createdAt)) / 86400000) / (sortedHistory.length - 1)
        : 7; // fallback para 7 se só houver 1 teste
        
    // AGILIDADE AI: Punição de Volatilidade baseada no tempo de resposta lento
    if (options.agilityPenalty) {
        const safePenalty = Math.max(0, Math.min(0.4, Number(options.agilityPenalty) || 0));
        eventVolatility = eventVolatility * (1 + safePenalty * 1.5);
    }
    
    // A incerteza do Random Walk espalha-se com a raiz do número de EVENTOS ESPERADOS, não dos dias.
    const expectedFutureEvents = Math.max(1, projectDays / Math.max(0.5, avgGapDays));
    const randomWalkUncertainty = eventVolatility * Math.sqrt(expectedFutureEvents);
    
    // Aplica o amortecimento do drift à incerteza angular (evita explosão da incerteza a longo prazo)
    const angularUncertainty = slopeStdError * effectiveDaysForDrift;
    const predictionSD = Math.sqrt(Math.pow(angularUncertainty, 2) + Math.pow(randomWalkUncertainty, 2));
    // Usar T-Student adaptativo para amostras pequenas em vez de Z=1.96 fixo
    const tMult = getConfidenceMultiplier(sortedHistory.length);
    const marginOfError = tMult * predictionSD; 

    return {
        // FIX #2: Precisão completa
        projected: Number.isNaN(projectedScore) ? minScore : Math.max(minScore, Math.min(maxScore, projectedScore)),
        marginOfError
    };
}

/**
 * Calcula o Damping Base adaptativo baseado no histórico.
 * @returns {number} Valor entre 30 e 60.
 */
export function computeAdaptiveDampingBase({ sampleSize, drift, driftUncertainty, scaleFactor, normalizedVol }) {
    const n = Math.max(1, Number(sampleSize) || 1);
    const safeDrift = Number.isFinite(drift) ? drift : 0;
    const safeUncertainty = Math.max(1e-6, Number(driftUncertainty) || 0);
    const safeScale = Math.max(1e-6, Number(scaleFactor) || 1);
    const safeNormVol = Math.max(0, Number(normalizedVol) || 0);

    const nConfidence = 1 - Math.exp(-n / 12);
    const trendSNR = Math.abs(safeDrift) / Math.max(0.05 * safeScale, safeUncertainty);
    const trendConfidence = Math.tanh(trendSNR / 2);
    const volPenalty = Math.min(1, safeNormVol / 18);
    const confidenceScore = Math.max(0, Math.min(1, (0.5 * nConfidence) + (0.35 * trendConfidence) + (0.15 * (1 - volPenalty))));
    return 30 + (30 * confidenceScore);
}

export function monteCarloSimulation(
    history,
    targetScore = 85,
    days = 90,
    simulations = 5000,
    options = {}
) {
    const { forcedVolatility, forcedBaseline, currentMean: optionsCurrentMean, minScore = 0, maxScore = 100, scenario = 'base', flashcardImmunity = 1.0 } = options;
    const scenarioCfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
    const sortedHistory = getSortedHistory(history);
    const safeSimulations = Math.max(1, simulations);
    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    // Defaults for new diagnostics
    let trendType = 'linear';

    if (!sortedHistory || sortedHistory.length < 1) return {
        probability: 0,
        mean: 0,
        sd: 0,
        ci95Low: 0,
        ci95High: 0,
        currentMean: 0,
        drift: 0,
        volatility: 1.5 * scaleFactorFallback
    };

    // Find the last valid score in the sorted history
    let validCurrentScore = NaN;
    for (let i = sortedHistory.length - 1; i >= 0; i--) {
        const s = getSafeScore(sortedHistory[i], maxScore);
        if (Number.isFinite(s)) {
            validCurrentScore = s;
            break;
        }
    }
    const currentScore = Number.isFinite(validCurrentScore) ? validCurrentScore : 0;
    const fallbackScore = optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore;
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : fallbackScore;
    if (sortedHistory.length > 0) {
        const rawScore = getSafeScore(sortedHistory[0], maxScore);
        let ema = Number.isFinite(rawScore) ? rawScore : 0;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore);

            // PSEUDO-TRI: Rebalanceamento por dificuldade global
            if (options.globalBaselinePct !== undefined && options.globalBaselinePct > 0) {
                const globalMean = (options.globalBaselinePct / 100) * maxScore;
                if (globalMean > 0) {
                    const difficultyDiff = (currentPoint - globalMean) / maxScore;
                    currentPoint = currentPoint + (difficultyDiff * maxScore * 0.05); 
                    currentPoint = Math.max(minScore, Math.min(maxScore, currentPoint));
                }
            }

            if (!Number.isNaN(currentPoint)) {
                // CORREÇÃO: Limitar a inércia a 15 eventos para evitar o congelamento permanente do EMA
                ema = calculateDynamicEMA(currentPoint, ema, Math.min(i + 1, 15), daysSinceLast);
            }
        }
        if (forcedBaseline === undefined) {
            baselineScore = optionsCurrentMean !== undefined ? optionsCurrentMean : ema;
        }
    }

    if (optionsCurrentMean !== undefined) {
        const lastDate = safeDateParse(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const referenceNow = options.referenceDate || Date.now();
        const lastTs = lastDate && !Number.isNaN(lastDate.getTime()) ? lastDate.getTime() : Date.now();
        const daysToNow = Math.max(1, (referenceNow - lastTs) / 86400000);
        baselineScore = calculateDynamicEMA(optionsCurrentMean, baselineScore, sortedHistory.length + 1, daysToNow);
    }
    const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;   // ✅ LOTE-03
    baselineScore = Math.max(minScore, Math.min(maxScore, baselineScore + ((scenarioCfg.meanBiasFactor || 0) * range)));

    // FEAT: Time Penalty (Simulação de Prova Real)
    let timePenaltyApplied = false;
    let timePenaltyScoreDrop = 0;
    let projectedTotalTimeSeconds = options.projectedTotalTimeSeconds || 0;
    let examDurationMinutes = options.examDurationMinutes || 0;
    let overflowRatio = 0;

    if (examDurationMinutes > 0 && projectedTotalTimeSeconds > 0) {
        const examLimitSeconds = examDurationMinutes * 60;
        if (projectedTotalTimeSeconds > examLimitSeconds) {
            overflowRatio = (projectedTotalTimeSeconds - examLimitSeconds) / projectedTotalTimeSeconds;
            
            // O aluno só consegue resolver com qualidade (1 - overflowRatio) da prova.
            // O restante (overflowRatio) será chutado, com probabilidade de acerto de 20% (1/5).
            const guessScore = 0.2 * (maxScore - minScore) + minScore; // 20% na escala correta
            const newBaseline = (baselineScore * (1 - overflowRatio)) + (guessScore * overflowRatio);
            
            timePenaltyScoreDrop = baselineScore - newBaseline;
            baselineScore = newBaseline;
            timePenaltyApplied = true;
        }
    }

    // IMPROVED mean reversion (from Coach+MC analysis): give stronger weight to historical mean when performance is declining.
    // This prevents the projection from collapsing too aggressively on negative drift.
    const histScores = sortedHistory.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
    let historicalMean = histScores.length > 0 ? kahanMean(histScores) : baselineScore;

    // Aplica o esmagamento da métrica no equilíbrio de longo prazo também
    if (timePenaltyApplied && overflowRatio > 0) {
        const guessScore = 0.2 * (maxScore - minScore) + minScore;
        historicalMean = (historicalMean * (1 - overflowRatio)) + (guessScore * overflowRatio);
    }

    const belowHistorical = baselineScore < historicalMean;
    const histWeight = belowHistorical ? 0.95 : 0.80;
    const stableMeanTarget = Math.max(minScore, Math.min(maxScore, (historicalMean * histWeight + baselineScore * (1 - histWeight))));

    const regressionResult = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore, options)
        : { slope: 0, slopeStdError: 1.5 * scaleFactorFallback };

    let effectiveDriftSlope = regressionResult.slope;

    trendType = 'linear';
    if (sortedHistory.length >= 4) {
        try {
            const nl = computeNonLinearTrend(sortedHistory, maxScore, 0.08);
            if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
                trendType = 'log_time_available';
                // NOTE: Do not blend nl.slope directly (different units).
                // Drift uses pure linear slope for correctness.
            }
        } catch { /* ignore */ }
    }

    const slopeStdError = regressionResult.slopeStdError;
    const maxDailyDriftPct = options.maxDailyDriftPct !== undefined ? options.maxDailyDriftPct : 0.015;
    const driftLimit = maxDailyDriftPct * range;   // antes: * maxScore
    const drift = Math.max(-driftLimit, Math.min(driftLimit, effectiveDriftSlope));
    const simulationDays = days;
    const scaleFactor = scaleFactorFallback;
    const rawDriftUncertainty = Math.max(0.05 * scaleFactor, slopeStdError);
    const driftUncertaintyCap = options.driftUncertaintyCap !== undefined ? options.driftUncertaintyCap : 0.4;
    let driftUncertainty = Math.min(rawDriftUncertainty, driftUncertaintyCap * scaleFactor) * (scenarioCfg.ciMult || 1);

    if (sortedHistory.length < 10) {
        const nFactor = (10 - sortedHistory.length) / 5;
        driftUncertainty *= (1 + 0.4 * nFactor);
    }

    let volatility = forcedVolatility !== undefined 
        ? Math.max(0.001 * (maxScore - minScore > 0 ? maxScore - minScore : maxScore), forcedVolatility)
        : calculateRobustVolatility(sortedHistory, maxScore, minScore, options);
    
    // Bug 2.2 Fix: Double Jeopardy (Evita dupla penalização se o overflowRatio já trucidou a média)
    // Se o timePenaltyApplied estiver ativo, já absorvemos o abalo do tempo, inflar a variância
    // agora atiraria o cone do Monte Carlo para um cenário irrealista de descalabro.
    if (options.agilityPenalty && !timePenaltyApplied) {
        const safePenalty = Math.max(0, Math.min(0.4, Number(options.agilityPenalty) || 0));
        volatility = volatility * (1 + safePenalty * 1.5);
    }

    // NEW: Flashcard Immunity Shield — reduz volatilidade global no caminho de projeção
    if (flashcardImmunity < 1.0) {
        volatility = volatility * Math.max(0.80, flashcardImmunity);
    }

    const scoreRangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const normalizedVolOU = (volatility / scoreRangeOU) * 100;
    
    // ✅ FIX: thetaOU agora escala com a confiança da amostra.
    // Poucos dados → reversão mais forte (conservador).
    // Muitos dados → reversão mais fraca (confia na tendência).
    const sampleConfidence = Math.min(1, sortedHistory.length / 15);
    const thetaOU = Math.min(
      0.15,
      (0.02 + 0.06 * (1 - sampleConfidence)) + 0.002 * Math.min(40, normalizedVolOU)
    );

    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1], maxScore);
        const actualChange = getSafeScore(h, maxScore) - prev;
        const d1 = safeDateParse(h.date || h.createdAt);
        const d0 = safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt);
        const t1 = d1 && !Number.isNaN(d1.getTime()) ? d1.getTime() : Date.now();
        const t0 = d0 && !Number.isNaN(d0.getTime()) ? d0.getTime() : t1;
        const deltaT = (t1 - t0) / (1000 * 60 * 60 * 24);
        const safeDeltaT = Number.isFinite(deltaT) ? deltaT : 0.1;
        const rawDays = Math.max(0.1, safeDeltaT);
        const detrendedChange = actualChange - (drift * rawDays);
        return detrendedChange / Math.sqrt(rawDays);
    }) : [0];

    const validResiduals = (residuals.length > 1 ? residuals.slice(1) : residuals).filter(Number.isFinite);
    let centeredResiduals;
    if (validResiduals.length > 1) {
        const residualMean = kahanSum(validResiduals) / Math.max(1, validResiduals.length);
        centeredResiduals = validResiduals.map(r => r - residualMean);
    } else {
        centeredResiduals = validResiduals;
    }
    
    const sortedResiduals = [...centeredResiduals].sort((a, b) => a - b);
    const resMedian = getPercentile(sortedResiduals, 0.5);
    const absDevs = centeredResiduals.map(r => Math.abs(r - resMedian)).sort((a, b) => a - b);
    const resMad = getPercentile(absDevs, 0.5) || (1.0 * scaleFactor);
    const safeResiduals = centeredResiduals.filter(r => Math.abs(r - resMedian) < 4 * resMad);

    const empMean = kahanSum(safeResiduals) / Math.max(1, safeResiduals.length);
    const empDevs = safeResiduals.map(r => Math.pow(r - empMean, 2));
    const empResidualSD = Math.sqrt(kahanSum(empDevs) / Math.max(1, safeResiduals.length));
    const standardizer = empResidualSD > 0 ? empResidualSD : 1;

    const results = [];
    const lastEntry = sortedHistory[sortedHistory.length - 1];
    const seedStr = `${lastEntry.date || lastEntry.createdAt}-${getSafeScore(lastEntry, maxScore)}-${sortedHistory.length}`;
    let seedValue = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
        seedValue ^= seedStr.charCodeAt(i);
        seedValue = Math.imul(seedValue, 16777619);
    }
    const rng = mulberry32(Math.abs(seedValue >>> 0));

    let medianGap = 7;
    if (sortedHistory.length >= 2) {
        const gaps = [];
        for (let j = 1; j < sortedHistory.length; j++) {
            const d1 = safeDateParse(sortedHistory[j].date || sortedHistory[j].createdAt);
            const d0 = safeDateParse(sortedHistory[j - 1].date || sortedHistory[j - 1].createdAt);
            // CORREÇÃO: Impedir que a subtração de Invalid Dates injete NaN na distribuição GARCH
            const g = (d1 && d0 && !Number.isNaN(d1.getTime()) && !Number.isNaN(d0.getTime())) 
                ? (d1.getTime() - d0.getTime()) / 86400000 
                : 7; // Fallback seguro
            gaps.push(Math.max(0.5, g));
        }
        gaps.sort((a, b) => a - b);
        medianGap = gaps.length % 2 === 0
            ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
            : gaps[Math.floor(gaps.length / 2)];
    }
    // A volatilidade estocástica diária deve ser escalada pelo gap médio entre provas
    // para que a variância cresça corretamente como um Random Walk/OU process.
    const dailyVolatility = Math.max(0.001 * (maxScore - minScore > 0 ? maxScore - minScore : maxScore),
      volatility / Math.sqrt(Math.max(1, medianGap)));

    // [BUG-1 FIX] Usar o damping adaptativo em vez do hardcode de 45.
    // Com poucos dados/alta vol, dampingBase ≈ 30 (amortece rápido).
    // Com muitos dados/tendência clara, dampingBase ≈ 60 (preserva mais).
    // Movido para fora do loop: inputs invariantes por simulação.
    const dampingBase = computeAdaptiveDampingBase({
        sampleSize: sortedHistory.length,
        drift,
        driftUncertainty,
        scaleFactor,
        normalizedVol: normalizedVolOU
    });

    // Constantes GARCH(1,1) invariantes por simulação
    const alphaG = 0.05;
    const betaG = 0.75;
    // BUG-AUDIT-02 FIX: omega calculado com a variância incondicional de equilíbrio (σ²_∞),
    // σ²_∞ = ω / (1 - α - β), logo ω = (1 - α - β) × σ²_∞
    // CORREÇÃO: Prevenir o GARCH Zero-Variance Trap
    const unconditionalVar = Math.max(1e-6, Math.pow(dailyVolatility, 2));
    const omega = (1 - alphaG - betaG) * unconditionalVar;

    // FIX #3: Prepare Cholesky for correlated subject minCutoffs (disciplines with minCutoff)
    const cutoffSubjects = (options.subjects || []).filter(s => s && Number(s.minCutoff) > 0);
    let subjectCholesky = null;
    if (cutoffSubjects.length > 1) {
      const stats = cutoffSubjects.map(s => ({
          ...s, // Bug 4.2 Fix: Preserve properties to allow empirical Pearson correlation later
          sd: (Number(s.sd) || 1) * Math.max(0.80, s.immunityFactor || 1.0)
      }));
      
      // FIX APLICADO: Utilizando cutoffSubjects para resgatar os nomes corretamente
      const adaptiveRhoContext = options?.simuladoRows ? { 
          simuladoRows: options.simuladoRows, 
          categoryNames: cutoffSubjects.map(s => s.name) 
      } : null;
      
      const cov = buildCovarianceMatrix(stats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
      const psdCov = ensurePositiveSemiDefinite(cov);
      subjectCholesky = choleskyDecomposition(psdCov);
    }

    function calculateSkewness(residuals, mean) {
        if (!residuals || residuals.length < 3) return 0;
        const n = residuals.length;
        let sumSquared = 0;
        for (let i = 0; i < n; i++) sumSquared += Math.pow(residuals[i] - mean, 2);
        const variance = sumSquared / n;
        const standardizer = Math.sqrt(variance);
        
        if (standardizer === 0) return 0;

        let m3 = 0;
        for (let i = 0; i < n; i++) m3 += Math.pow(residuals[i] - mean, 3);
        m3 /= n;

        return m3 / Math.pow(standardizer, 3);
    }
    
    // PATCH 1: Recalcular a média real do subconjunto filtrado
    const subsetMean = safeResiduals.length > 0 
        ? safeResiduals.reduce((acc, val) => acc + val, 0) / safeResiduals.length 
        : 0;

    const residualsSkew = calculateSkewness(safeResiduals, subsetMean);

    const minCutoffFailures = [];

    // CORREÇÃO GC THRASHING: Alocação estática fora do loop de Monte Carlo
    const choleskySize = cutoffSubjects.length;
    const zVecStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const zCorrStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;

    for (let i = 0; i < safeSimulations; i++) {
        // CORREÇÃO: O truncamento normal tem de respeitar o driftLimit dinâmico e não hardcodes de 1%.
        const sampledDrift = sampleTruncatedNormal(
            drift, 
            driftUncertainty, 
            -driftLimit, 
            driftLimit, 
            rng
        );
        let currentSimScore = baselineScore;
        let currentVolSq = unconditionalVar;

        for (let d = 1; d <= simulationDays; d++) {
            // [RIGOR-FIX] Drift Damping Adaptativo: O impacto da tendência diminui com o tempo (Log-decay)
            // dampingBase varia de 30 (conservador) a 60 (confiante) conforme qualidade do sinal.
            const driftDamping = 1 / (1 + d / dampingBase); 
            const driftEffect = sampledDrift * driftDamping;

            // IMPROVED: Stronger reversion to historical mean, especially on negative drift.
            // The O-U reversion target should be stable to prevent double counting drift.
            let meanReversionTarget = stableMeanTarget;
            meanReversionTarget = Math.min(maxScore, Math.max(minScore, meanReversionTarget));
            let meanReversion = Math.max(0.005, thetaOU) * (meanReversionTarget - currentSimScore);
            const adaptiveVol = Math.sqrt(Math.max(1e-6, currentVolSq));
            // Prevent extreme reversion pulls that cause artificial boundary piling in long simulations
            const maxReversionPull = adaptiveVol * 3;
            meanReversion = Math.max(-maxReversionPull, Math.min(maxReversionPull, meanReversion));
            
            // CORREÇÃO: Padrão Ouro de Filtered Historical Simulation (FHS)
            // O choque empírico tem de ser escalado para a volatilidade GARCH atual
            let shock = 0;
            if (safeResiduals.length >= 15) {
                // 90% Bootstrap (Histórico Empírico) / 10% Gaussiano Assimétrico (Black Swan)
                if (rng() > 0.10) {
                    const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                    shock = (rawEmpirical / standardizer) * adaptiveVol; 
                } else {
                    // PATCH: Gaussian Skew Adjustment (Cornish-Fisher expansion to maintain zero mean)
                    const z = generateGaussian(rng);
                    const zCF = z + (residualsSkew * (z * z - 1)) / 6.0; 
                    shock = zCF * adaptiveVol;
                }
            } else if (safeResiduals.length > 5 && rng() > 0.3) {
                const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                shock = (rawEmpirical / standardizer) * adaptiveVol; 
            } else {
                shock = generateGaussian(rng) * adaptiveVol;
            }
            
            // ✅ LOTE-03 FIX: o clamp por dailyVolatility sufocava choques quando o GARCH
            // já tinha elevado adaptiveVol — a trajetória não podia realizar a própria variância
            const shockLimit = Math.max(dailyVolatility, adaptiveVol) * 3;
            const clampedShock = Math.max(-shockLimit, Math.min(shockLimit, shock));
            
            // Evolução da Volatilidade GARCH(1,1): Var(t+1) = w + a*e^2 + b*Var(t)
            currentVolSq = omega + alphaG * Math.pow(clampedShock, 2) + betaG * currentVolSq;
            
            // Clamp de sanidade para evitar divergência explosiva em projeções longas
            currentVolSq = Math.min(currentVolSq, Math.pow(maxScore * 0.2, 2));
            
            currentSimScore += driftEffect + meanReversion + clampedShock; // consistente com GARCH
            
            // Simple clamp to bounds (mean reversion + historical target should keep trajectories reasonable).
            // Removed complex RBM reflection which was causing boundary piling bias in declining series (scores clustering at minScore, skewing means low).
            // Fallback de segurança estrito (Clamp final diário)
            currentSimScore = Number.isNaN(currentSimScore) ? minScore : Math.max(minScore, Math.min(maxScore, currentSimScore));
        }

        // Aplica os limites físicos da prova APENAS no resultado assintótico final
        // Preservação de sinal estrito: O backend mantém o valor bruto. 
        // O clamping ocorre apenas na camada de UI (MonteCarloGauge.jsx).
        results.push(currentSimScore);
        
        let passedMins = true;
        if (choleskySize > 0) {
            if (subjectCholesky) {
                // Reutilização extrema de memória: mutar o array em vez de re-alocar
                for(let k = 0; k < choleskySize; k++) {
                    zVecStatic[k] = generateGaussian(rng);
                }
                applyCovariance(subjectCholesky, zVecStatic, zCorrStatic);
                for (let j = 0; j < choleskySize; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    // PATCH 2: Cholesky L matrix already contains standard deviations on its diagonal
                    const raw = Number(s.mean) + zCorrStatic[j];
                    const subjScore = Math.max(sMin, Math.min(sMax, raw));
                    if (subjScore < Number(s.minCutoff)) {
                        passedMins = false;
                        break;
                    }
                }
            } else {
                // fallback independent
                for (let j = 0; j < cutoffSubjects.length; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    const effSd = s.sd * Math.max(0.80, s.immunityFactor || 1.0);
                    const subjScore = sampleTruncatedNormal(s.mean, effSd, sMin, sMax, rng);
                    if (subjScore < s.minCutoff) {
                        passedMins = false;
                        break;
                    }
                }
            }
        }
        minCutoffFailures.push(!passedMins);
    }

    // 4. Agregação Estatística
    // Note: We need to count successes before sorting results!
    let successes = 0;
    for (let i = 0; i < safeSimulations; i++) {
        if (results[i] >= targetScore && !minCutoffFailures[i]) {
            successes++;
        }
    }

    results.sort((a, b) => a - b);
    const meanResult = kahanMean(results);

    // BUG-3 FIX: Calcular a probabilidade analítica real usando a Normal Truncada
    // em vez de copiar a empírica como fallback.
    const finalSD = calculateVolatility(results.map(r => ({ score: r })), maxScore, minScore);
    const empiricalProb = (successes / safeSimulations) * 100;

    // FIX BUG 4: Simulações O-U com choques difusos e Clamping diário não formam 
    // uma Distribuição Normal Truncada perfeita no limite estacionário.
    // Usar a CDF analítica aqui causa divergência drástica e invalida as previsões.
    // Para modelos difusos complexos, a probabilidade empírica convergida é a única fonte da verdade.
    let analyticalProb = empiricalProb;

    // NEW: Conformal intervals for more robust, distribution-free CIs
    const mcResiduals = results.map(r => r - meanResult);
    const conformal = conformalPredictionInterval(mcResiduals, 0.05, meanResult); // 95% coverage

    return {
        // FIX #2: Valores brutos com precisão completa. toFixed removido do motor.
        // UI e componentes de display devem formatar quando necessário.
        probability: empiricalProb,
        analyticalProbability: analyticalProb,
        timePenaltyApplied,
        timePenaltyScoreDrop,
        projectedTotalTimeSeconds: options.projectedTotalTimeSeconds || 0,
        examDurationMinutes: options.examDurationMinutes || 0,
        mean: meanResult,
        projectedMean: meanResult, // Standardized for EvolutionChart
        sd: finalSD,
        ci95Low: conformal.lower ?? getPercentile(results, 0.025, true),
        ci95High: conformal.upper ?? getPercentile(results, 0.975, true),
        ciConformalLow: conformal.lower ?? getPercentile(results, 0.025, true),
        ciConformalHigh: conformal.upper ?? getPercentile(results, 0.975, true),
        currentMean: baselineScore,
        drift: (drift * 30),
        volatility,
        confidence: sortedHistory.length < 5 ? 'low' : sortedHistory.length < 15 ? 'medium' : 'high',
        // NEW: non-linear trend availability
        trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
        diagnostics: {
            trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
            effectiveDriftSlope: typeof effectiveDriftSlope !== 'undefined' ? effectiveDriftSlope : 0,
            conformalCoverage: 0.95,
            simulationCount: safeSimulations,
            historicalMean: historicalMean || null,
            effectiveN: Math.max(1, sortedHistory.length)
        }
    };
}
```

---

## File: `src/engine/variance.js`
*Linhas: 476 | Tamanho: 19.16 KB*

```javascript
/**
 * Monte Carlo Engine - Variance Module
 * 
 * Implements weighted variance calculation and time uncertainty
 * All formulas are statistically correct and auditable
 */
import { kahanSum } from './math/kahan.js';
import { getDateKey } from '../utils/dateHelper.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { normalize } from '../utils/normalization.js';

function toHistoryArray(history) {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
}

/**
 * Compute weighted variance from category statistics
 * Formula: Var = (1 - ρ) × [Σ wi² × σi²] + ρ × [Σ (wi × σi)]²
 * Calcula a variância ponderada interpolando entre a hipótese de independência 
 * das disciplinas (ρ = 0) e a hipótese de correlação perfeita (ρ = 1).
 * 
 * BUG-M3: This formula is statistically correct under the assumption of
 * independence between subjects. If subjects are strongly correlated
 * (shared test-day effects), the true variance lies between this value
 * and the correlated formula (Σ w_i*σ_i)².
 * 
 * CONTRACT: totalWeight must be the sum of all raw weights. If stats weights are 
 * already normalized (0-1), totalWeight MUST be passed as 1 for correct computations.
 * 
 * @param {Object[]} stats - Array of { sd, weight } objects
 * @param {number} totalWeight - Sum of all weights (use 1 if stats weights are normalized)
 * @returns {number} Weighted variance
 */
// CORREÇÃO: Alinhamento com Modelos TRI (Teoria de Resposta ao Item).
// 0.25 capta melhor a covariância psicológica (stress do dia) 
// sem esmagar o Desvio Padrão Agregado (Pooled SD) do candidato.
export const INTER_SUBJECT_CORRELATION = 0.25; // Prior / fallback correlation between subjects (stress day effect)

/**
 * Adaptive version of INTER_SUBJECT_CORRELATION.
 * Tries to estimate from real user performance history (simulado rows) when sufficient data exists.
 * Falls back gracefully to the conservative prior.
 */
export function getAdaptiveInterSubjectCorrelation(_stats = [], simuladoRows = [], categoryNames = [], fallback = INTER_SUBJECT_CORRELATION, maxScore = 100) {
  try {
    const safeSimuladoRows = (Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {})).filter(Boolean);
    if (!Array.isArray(safeSimuladoRows) || safeSimuladoRows.length < 5 || !Array.isArray(categoryNames) || categoryNames.length < 2) {
      return fallback;
    }

    // Build aligned score rows: one object per "simulado day" { "Matematica": 82, "Direito": 71, ... }
    const byDate = {};
    safeSimuladoRows.forEach(row => {
      const dateKey = getDateKey(row.date || row.createdAt);
      if (!dateKey) return;
      const subj = normalize(row.subject || row.categoryName || row.name);
      if (!subj) return;
      const score = getSafeScore(row, maxScore);
      if (!Number.isFinite(score)) return;

      if (!byDate[dateKey]) byDate[dateKey] = {};
      byDate[dateKey][subj] = score;
    });

    const alignedRows = Object.values(byDate);
    if (alignedRows.length < 4) return fallback;

    const estimated = estimateInterSubjectCorrelation(alignedRows, categoryNames, fallback);
    // Blend a little toward prior for stability (never go full data-driven with limited history)
    const blend = Math.min(1, alignedRows.length / 12);
    return estimated * blend + fallback * (1 - blend);
  } catch {
    /* ignore */
    return fallback;
  }
}

export function computeEffectiveSampleSizeFromWeights(weights = []) {
    const clean = Array.isArray(weights) ? weights.map(w => Number(w)).filter(w => Number.isFinite(w) && w > 0) : [];
    if (clean.length === 0) return 0;
    const sumW = kahanSum(clean);
    const sumW2 = kahanSum(clean.map(w => w * w));
    return sumW2 > 0 ? (sumW * sumW) / sumW2 : 0;
}

// MELHORIA: Permite a injeção de parâmetros dinâmicos ou cálculo on-the-fly do rho
export function computeWeightedVariance(statsRaw, totalWeight, optionsOrRho = INTER_SUBJECT_CORRELATION) {
    const stats = Array.isArray(statsRaw) ? statsRaw : Object.values(statsRaw || {});
    if (stats.length === 0) return 0;

    let rho = INTER_SUBJECT_CORRELATION;
    let preserveScale = false;

    // Extrai rho dinâmico se um objeto de opções for passado
    if (typeof optionsOrRho === 'object' && optionsOrRho !== null) {
        preserveScale = optionsOrRho.preserveScale || false;
        if (typeof optionsOrRho.rho === 'number') {
            rho = optionsOrRho.rho;
        } else if (optionsOrRho.scoreRows && optionsOrRho.subjectNames) {
            rho = estimateInterSubjectCorrelation(optionsOrRho.scoreRows, optionsOrRho.subjectNames, INTER_SUBJECT_CORRELATION);
        } else if (optionsOrRho.simuladoRows && optionsOrRho.categoryNames) {
            // NEW: Use the full adaptive estimator with blending
            rho = getAdaptiveInterSubjectCorrelation(stats, optionsOrRho.simuladoRows, optionsOrRho.categoryNames, INTER_SUBJECT_CORRELATION);
        }
    } else {
        // Fallback de compatibilidade
        rho = Number.isFinite(optionsOrRho) ? optionsOrRho : INTER_SUBJECT_CORRELATION;
    }

    const toFiniteNonNegative = (value) => {
        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? n : 0;
    };

    const toFiniteSd = (value) => {
        const n = Number(value);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    };

    const calculatedTotalWeight = kahanSum(stats.map(cat => toFiniteNonNegative(cat?.weight)));
    const effectiveTotalWeight = (Number.isFinite(totalWeight) && totalWeight > 0) ? totalWeight : calculatedTotalWeight;

    if (effectiveTotalWeight === 0) return 0;

    // FIX 2: Sincronização do piso com o estimateInterSubjectCorrelation.
    // Permite que o motor explore a variância de disciplinas com correlação inversa.
    // BUG 3.1 FIX: Floor ajustado de -0.15 para 0.0 para garantir Positive Semi-Definiteness (PSD)
    const validRho = Math.max(0.0, Math.min(0.85, rho));
    const rawWeights = stats.map(cat => toFiniteNonNegative(cat?.weight));
    const adjustedSDs = stats.map(cat => toFiniteSd(cat?.sd));

    const sumRawWeights = kahanSum(rawWeights);
    if (!Number.isFinite(sumRawWeights) || sumRawWeights <= 0) return 0;
    
    // Bug 3.2 Fix: Explosão Dimensional na Variância Ponderada
    // Se preserveScale estivesse ativo, os pesos em bruto (e.g. 100) seriam elevados ao quadrado,
    // explodindo a variância (10,000 * SD^2). Normalizamos sempre internamente para manter 
    // estabilidade nas combinações de SDs independentes e coerentes.
    const normalizedWeights = rawWeights.map(w => w / sumRawWeights);

    const independentVar = kahanSum(normalizedWeights.map((w, i) => Math.pow(w, 2) * Math.pow(adjustedSDs[i], 2)));
    const weightedSumSD = kahanSum(normalizedWeights.map((w, i) => w * adjustedSDs[i]));
    const coherentVar = Math.pow(weightedSumSD, 2);

    let finalVar = (1 - validRho) * independentVar + (validRho * coherentVar);

    // Se preserveScale for pedido, escalonamos a variância final linearmente pelo 
    // peso efetivo, prevenindo o colapso quadrático anterior que quebrava o motor.
    if (preserveScale) {
        finalVar *= effectiveTotalWeight;
    }

    return finalVar;
}

/**
 * Computes the pooled standard deviation across subjects.
 * 
 * NOTA CONCEITUAL: Cuidado com a mistura de unidades aqui!
 * Este Pooled SD reflete a variabilidade estática "entre provas" (disciplinas).
 * Ele NÃO representa a incerteza dinâmica da trajetória temporal (Random Walk/Drift).
 * Usar isto isoladamente para calcular o Margin of Error da Projeção subestima
 * drasticamente o cone de incerteza no longo prazo.
 */
export function computePooledSD(stats, totalWeight, rho = INTER_SUBJECT_CORRELATION) {
    // CORREÇÃO B2: Alinhado o clamp com computeWeightedVariance [0.0, 0.85]
    // O piso 0.0 previne matrizes de covariância não-PSD e falhas de Cholesky
    const validRho = Number.isFinite(rho) ? Math.max(0.0, Math.min(0.85, rho)) : INTER_SUBJECT_CORRELATION;
    const weightedVariance = computeWeightedVariance(stats, totalWeight, validRho);
    return Math.sqrt(weightedVariance);
}

/**
 * Estimate inter-subject correlation from historical aligned score rows.
 * Uses pairwise Pearson correlations with overlap checks and shrinkage toward fallback.
 *
 * @param {Object[]} scoreRows - Array of date-aligned rows: { [subjectName]: score }
 * @param {string[]} subjectNames - Subject names to include
 * @param {number} fallback - Fallback correlation when data is insufficient
 * @returns {number} Estimated rho in [0,1]
 */
export function estimateInterSubjectCorrelation(
    scoreRows = [],
    subjectNames = [],
    fallback = INTER_SUBJECT_CORRELATION
) {
    const safeScoreRows = Array.isArray(scoreRows) ? scoreRows : Object.values(scoreRows || {});
    if (safeScoreRows.length < 4 || !Array.isArray(subjectNames) || subjectNames.length < 2) {
        return fallback;
    }

    const pairwise = [];
    for (let i = 0; i < subjectNames.length; i++) {
        for (let j = i + 1; j < subjectNames.length; j++) {
            const aName = normalize(subjectNames[i]);
            const bName = normalize(subjectNames[j]);

            const xs = [];
            const ys = [];
            safeScoreRows.forEach(row => {
                const rawX = row?.[aName];
                const x = typeof rawX === 'object' && rawX !== null ? Number(rawX?.score) : Number(rawX);
                const rawY = row?.[bName];
                const y = typeof rawY === 'object' && rawY !== null ? Number(rawY?.score) : Number(rawY);
                if (Number.isFinite(x) && Number.isFinite(y)) {
                    xs.push(x);
                    ys.push(y);
                }
            });

            const n = xs.length;
            if (n < 4) continue;

            const meanX = kahanSum(xs) / n;
            const meanY = kahanSum(ys) / n;

            let cov = 0.0, c_cov = 0.0;
            let varX = 0.0, c_x = 0.0;
            let varY = 0.0, c_y = 0.0;

            for (let k = 0; k < n; k++) {
                const dx = xs[k] - meanX;
                const dy = ys[k] - meanY;
                
                const y_cov = (dx * dy) - c_cov;
                const t_cov = cov + y_cov;
                c_cov = (t_cov - cov) - y_cov;
                cov = t_cov;

                const y_x = (dx * dx) - c_x;
                const t_x = varX + y_x;
                c_x = (t_x - varX) - y_x;
                varX = t_x;

                const y_y = (dy * dy) - c_y;
                const t_y = varY + y_y;
                c_y = (t_y - varY) - y_y;
                varY = t_y;
            }

            const epsilon = 1e-15;
            const safeVarX = Math.max(0, varX);
            const safeVarY = Math.max(0, varY);
            const denom = Math.sqrt((safeVarX + epsilon) * (safeVarY + epsilon));
            const corr = cov / denom;

            // Mecanismo de Controlo de Effective Sample Size (ESS) para regular o encolhimento de pares com sobreposição fraca (n < 8)
            const essFloor = 8;
            const pairShrink = n / (n + essFloor);
            const robustCorr = (corr * pairShrink) + (fallback * (1 - pairShrink));

            pairwise.push({ corr: robustCorr, n });
        }
    }

    if (pairwise.length === 0) return fallback;

    // Weight by information size (overlap) and use Fisher Z transformation for averaging
    // Pearson correlations (r) are not additive; averaging them directly biases toward zero.
    let sumZ = 0;
    let sumW = 0;
    pairwise.forEach(p => {
        // Peso informacional assintoticamente ótimo para Fisher Z ~ N(0, 1/(n-3))
        const w = Math.max(1, p.n - 3);
        // Fisher Z transform: Z = 0.5 * ln((1+r)/(1-r))
        // BUGFIX GEMINI: Permitir correlações negativas no cálculo para não inflar a média
        const r = Math.max(-0.999, Math.min(0.999, p.corr));
        const z = 0.5 * Math.log((1 + r) / (1 - r));
        sumZ += z * w;
        sumW += w;
    });

    const avgZ = sumW > 0 ? sumZ / sumW : 0;
    // Inverse Fisher Z: r = (exp(2z) - 1) / (exp(2z) + 1)
    const empirical = (Math.exp(2 * avgZ) - 1) / (Math.exp(2 * avgZ) + 1);

    const overlaps = pairwise.map(p => p.n);
    const avgOverlap = kahanSum(overlaps) / overlaps.length;
    const essPairs = computeEffectiveSampleSizeFromWeights(pairwise.map(p => Math.max(1, p.n - 3)));
    
    // Shrinkage empírico-bayesiano
    const shrink = Math.max(0, Math.min(1, (avgOverlap / (avgOverlap + 10)) * (essPairs / (essPairs + 6))));
    const blended = (shrink * empirical) + ((1 - shrink) * fallback);

    // PATCH (Bug 3.1): Limite inferior blindado (0.0) para garantir estabilidade da Matriz PSD.
    // Impede falhas matemáticas no motor de Monte Carlo por autocorrelação não-definitiva
    // quando o sistema tentar realizar a decomposição de Cholesky N > 7.
    return Math.max(0.0, Math.min(0.85, blended));
}

/**
 * Get variance breakdown for debugging/auditing
 * 
 * @param {Object[]} stats - Array of category statistics
 * @param {number} totalWeight - Sum of all weights
 * @returns {Object} Detailed variance breakdown
 */
export function getVarianceBreakdown(stats, totalWeight) {
    const weightedVariance = computeWeightedVariance(stats, totalWeight);
    const pooledVariance = weightedVariance;
    // SAFETY: computeWeightedVariance may return negative due to floating-point rounding
    // in the cross-term subtraction. Clamp to 0 before sqrt to prevent NaN propagation.
    const pooledSD = Math.sqrt(Math.max(0, pooledVariance));

    return {
        weightedVariance: Number(Number.isFinite(weightedVariance) ? weightedVariance.toFixed(4) : 0),
        timeUncertainty: 0,
        timeVariance: 0,
        pooledVariance: Number(Number.isFinite(pooledVariance) ? pooledVariance.toFixed(4) : 0),
        pooledSD: Number(Number.isFinite(pooledSD) ? pooledSD.toFixed(4) : 0)
    };
}

/**
 * PATCH: Calcula a correlação de Pearson empírica entre duas séries de notas.
 * Emparelha os dados apenas onde o usuário estudou ambas as matérias num intervalo <= 24h.
 */
function calculateDynamicCorrelation(historyA, historyB, fallback = 0.15) {
    const safeHistoryA = toHistoryArray(historyA);
    const safeHistoryB = toHistoryArray(historyB);

    if (!safeHistoryA.length || !safeHistoryB.length) return fallback;

    let pairedCount = 0;

    const getScore = (h) => {
        const s = getSafeScore(h);
        return Number.isFinite(s) ? s : 0;
    };

    const getDateStr = (h) => {
        return getDateKey(h?.date || h?.createdAt);
    };

    const mapA = new Map();

    safeHistoryA.forEach(h => {
        if (!h) return;
        const d = getDateStr(h);
        if (d) mapA.set(d, getScore(h));
    });

    const xs = [];
    const ys = [];

    safeHistoryB.forEach(h => {
        if (!h) return;
        const d = getDateStr(h);
        if (d && mapA.has(d)) {
            xs.push(mapA.get(d));
            ys.push(getScore(h));
            pairedCount++;
        }
    });

    if (pairedCount < 5) return fallback;

    const n = pairedCount;
    let meanX = 0;
    let meanY = 0;

    for (let i = 0; i < n; i++) {
        meanX += xs[i];
        meanY += ys[i];
    }

    meanX /= n;
    meanY /= n;

    let cov = 0;
    let varX = 0;
    let varY = 0;

    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        cov += dx * dy;
        varX += dx * dx;
        varY += dy * dy;
    }

    const safeVarX = Math.max(0, varX);
    const safeVarY = Math.max(0, varY);
    const denominator = Math.sqrt(safeVarX * safeVarY);

    if (!Number.isFinite(denominator) || denominator === 0) return fallback;

    const pearsonR = cov / denominator;

    if (!Number.isFinite(pearsonR)) return fallback;

    return Math.max(-0.3, Math.min(0.8, pearsonR));
}

/**
 * Constrói a Matriz de Covariância completa NxN a partir dos desvios padrão
 * individuais e do fator de correlação (Rho). Necessária para alimentar
 * o Cholesky Decomposition para Monte Carlo multidimensional.
 */
export function buildCovarianceMatrix(stats, rhoMatrix = null, defaultRho = INTER_SUBJECT_CORRELATION, adaptiveContext = null) {
    const n = stats.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

    // NEW: Support full adaptive rho from context
    let effectiveDefaultRho = Number.isFinite(defaultRho) ? defaultRho : INTER_SUBJECT_CORRELATION;
    if (adaptiveContext && adaptiveContext.simuladoRows && adaptiveContext.categoryNames) {
      effectiveDefaultRho = getAdaptiveInterSubjectCorrelation(
        stats,
        adaptiveContext.simuladoRows,
        adaptiveContext.categoryNames,
        defaultRho
      );
    }
    
    // FIX 5: Estrutura O(N^2) reduzida via simetria de matriz
    for (let i = 0; i < n; i++) {
        const sdI = Math.max(0, Number.isFinite(stats[i]?.sd) ? Number(stats[i].sd) : 0);
        matrix[i][i] = sdI * sdI; // A variância pura ocupa apenas a diagonal principal

        for (let j = i + 1; j < n; j++) {
            const sdJ = Math.max(0, Number.isFinite(stats[j]?.sd) ? Number(stats[j].sd) : 0);
            
            const rhoIJ = (rhoMatrix && rhoMatrix[i] && rhoMatrix[i][j] != null) ? rhoMatrix[i][j] : effectiveDefaultRho;
            const rhoJI = (rhoMatrix && rhoMatrix[j] && rhoMatrix[j][i] != null) ? rhoMatrix[j][i] : effectiveDefaultRho;
            
            let currentRho = (Number(rhoIJ) + Number(rhoJI)) / 2;
            if (!Number.isFinite(currentRho)) currentRho = effectiveDefaultRho;
            currentRho = Math.max(-0.9, Math.min(0.9, currentRho));

            if (stats[i]?.simuladoStats?.history && stats[j]?.simuladoStats?.history) {
                currentRho = calculateDynamicCorrelation(stats[i].simuladoStats.history, stats[j].simuladoStats.history, currentRho);
            }

            const covariance = currentRho * sdI * sdJ;
            matrix[i][j] = covariance; 
            matrix[j][i] = covariance; // Espelho simétrico, poupa dupla iteração.
        }
    }
    return matrix;
}

export function calcularVariancia(arr) {
    if (!Array.isArray(arr) || arr.length <= 1) return 0;

    // Welford online: estável para magnitudes extremas (evita overflow em v²)
    let count = 0;
    let mean = 0;
    let m2 = 0;
    
    for (let i = 0; i < arr.length; i++) {
        const raw = Number(arr[i]);
        if (!Number.isFinite(raw)) continue;
        
        count += 1;
        const delta = raw - mean;
        mean += delta / count;
        const delta2 = raw - mean;
        m2 += delta * delta2;
    }
    
    const variance = count > 1 ? m2 / (count - 1) : 0;
    return Number.isFinite(variance) ? Math.max(0, variance) : 0;
}

export default {
    computeWeightedVariance,
    computePooledSD,
    getVarianceBreakdown,
    estimateInterSubjectCorrelation,
    computeEffectiveSampleSizeFromWeights,
    calcularVariancia,
    buildCovarianceMatrix
};
```

---

## File: `src/engine/monteCarlo.js`
*Linhas: 771 | Tamanho: 29.58 KB*

```javascript
import { mulberry32 } from './random.js';
import {
    normalCDF_complement,
    generateKDE,
    sampleTruncatedNormal,
    truncatedNormalMean,
    ensurePositiveSemiDefinite,
    choleskyDecomposition,
    applyCovariance
} from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';
export { monteCarloSimulation };

import { getPercentile } from './math/percentile.js';
import { kahanSum } from './math/kahan.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getDateKey } from '../utils/dateHelper.js';

export { getPercentile };

const DEFAULT_SIMULATIONS = 5000;
const MAX_SIMULATIONS = 50000;
const TARGET_PROB_SE = 0.008;
const DEFAULT_DOMAIN_MIN = 0;
const DEFAULT_DOMAIN_MAX = 100;

function toFiniteNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function sanitizeDomain(minScore, maxScore) {
    const rawMin = toFiniteNumber(minScore, DEFAULT_DOMAIN_MIN);
    const rawMax = toFiniteNumber(maxScore, DEFAULT_DOMAIN_MAX);

    if (rawMin <= rawMax) {
        return { minScore: rawMin, maxScore: rawMax };
    }

    return { minScore: rawMax, maxScore: rawMin };
}

function sanitizeSimulations(simulations) {
    const normalized = Math.floor(toFiniteNumber(simulations, DEFAULT_SIMULATIONS));
    return clamp(normalized, 1, MAX_SIMULATIONS);
}

function sanitizeSubjects(subjects) {
    if (!Array.isArray(subjects)) return [];

    return subjects.filter(Boolean).map(s => {
        const safeMean = toFiniteNumber(s?.mean, 0);
        const safeSd = Math.max(1e-6, toFiniteNumber(s?.sd, 1));
        const safeMinCutoff = toFiniteNumber(s?.minCutoff, 0);
        const safeMinScore = toFiniteNumber(s?.minScore, DEFAULT_DOMAIN_MIN);
        const safeMaxScore = toFiniteNumber(s?.maxScore, DEFAULT_DOMAIN_MAX);
        const safeImmunity = toFiniteNumber(s?.immunityFactor, 1.0);
        const safeWeight = Math.max(1e-6, toFiniteNumber(s?.weight, 1));   // ✅ LOTE-01

        return {
            ...s,
            mean: safeMean,
            sd: safeSd,
            minCutoff: safeMinCutoff,
            minScore: safeMinScore,
            maxScore: safeMaxScore,
            immunityFactor: safeImmunity,
            weight: safeWeight                                              // ✅ LOTE-01
        };
    });
}

export function recommendSimulationCount(targetProb = 0.7, targetSE = TARGET_PROB_SE, minSims = 2000, maxSims = MAX_SIMULATIONS) {
    const p = Math.max(0.05, Math.min(0.95, targetProb));
    const varBernoulli = p * (1 - p);
    const needed = Math.ceil(varBernoulli / (targetSE * targetSE));
    return clamp(needed, minSims, maxSims);
}

function generateStableSeed(historyCount, categoryName, _targetScore, _currentMean) {
    let h = 2166136261;

    const safeCatId = typeof categoryName === 'object' && categoryName !== null
        ? String(categoryName.id || categoryName.name || 'global')
        : String(categoryName || 'global');

    const safeHistoryCount = toFiniteNumber(historyCount, 0);
    const safeTarget = toFiniteNumber(_targetScore, 0);
    const safeMeanInt = Number.isFinite(Number(_currentMean)) ? Math.floor(Number(_currentMean) * 10) : 0;

    const seedStr = `${safeHistoryCount}-${safeCatId}-${safeTarget}-${safeMeanInt}`;

    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }

    return h >>> 0;
}

export function simulateNormalDistribution(
    meanOrObj,
    sd,
    targetScore,
    simulations,
    seed,
    currentMean,
    categoryName,
    bayesianCI,
    historyLength = 0
) {
    let mean = typeof meanOrObj === 'number' ? meanOrObj : 0;
    let minScore = DEFAULT_DOMAIN_MIN;
    let maxScore = DEFAULT_DOMAIN_MAX;

    let subjects = [];
    let historicalCutoffs = [];
    let flashcardImmunity = 1.0;

    if (typeof meanOrObj === 'object' && meanOrObj !== null) {
        mean = meanOrObj.mean ?? mean;
        sd = meanOrObj.sd ?? sd;
        targetScore = meanOrObj.targetScore ?? targetScore;
        simulations = meanOrObj.simulations ?? simulations;
        seed = meanOrObj.seed ?? seed;
        currentMean = meanOrObj.currentMean ?? currentMean;
        categoryName = meanOrObj.categoryName ?? categoryName;
        bayesianCI = meanOrObj.bayesianCI ?? bayesianCI;
        minScore = meanOrObj.minScore ?? minScore;
        maxScore = meanOrObj.maxScore ?? maxScore;
        historyLength = meanOrObj.historyLength ?? 0;
        subjects = meanOrObj.subjects ?? [];
        historicalCutoffs = meanOrObj.historicalCutoffs ?? [];
        flashcardImmunity = meanOrObj.flashcardImmunity ?? 1.0;
    }

    subjects = sanitizeSubjects(subjects);

    historicalCutoffs = Array.isArray(historicalCutoffs)
        ? historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
        : [];

    flashcardImmunity = toFiniteNumber(flashcardImmunity, 1.0);
    historyLength = Math.max(0, Math.floor(toFiniteNumber(historyLength, 0)));

    if (!meanOrObj?.simulations && !simulations) {
        const roughProb = Math.max(0.1, Math.min(0.9, (currentMean || mean || 70) / 100));
        simulations = recommendSimulationCount(roughProb);
    }

    const safeDomain = sanitizeDomain(minScore, maxScore);
    minScore = safeDomain.minScore;
    maxScore = safeDomain.maxScore;

    const safeMean = clamp(toFiniteNumber(mean, (minScore + maxScore) / 2), minScore, maxScore);
    const safeCurrentMean = toFiniteNumber(currentMean, safeMean);

    const sdNum = toFiniteNumber(sd, NaN);
    const hasExplicitDeterministicSD = Number.isFinite(sdNum) && sdNum <= 0;
    const isExplicitCoachSD = Number.isFinite(sdNum) && sdNum > 0;

    let safeSD = Number.isFinite(sdNum) && sdNum > 0 ? sdNum : 0;

    if (bayesianCI) {
        let high = bayesianCI.unclampedHigh !== undefined ? bayesianCI.unclampedHigh : bayesianCI.ciHigh;
        let low = bayesianCI.unclampedLow !== undefined ? bayesianCI.unclampedLow : bayesianCI.ciLow;

        high = toFiniteNumber(high, NaN);
        low = toFiniteNumber(low, NaN);

        if (Number.isFinite(high) && Number.isFinite(low) && high < low) {
            const tmp = high;
            high = low;
            low = tmp;
        }

        if (Number.isFinite(high) && Number.isFinite(low)) {
            const effectiveN = Math.max(1, toFiniteNumber(bayesianCI.n, historyLength || 1));
            const tMultiplier = getConfidenceMultiplier(effectiveN, { allowFractional: true });

            let inferredSD = (high - low) / (tMultiplier * 2);
            const distToBoundary = Math.min(safeMean - minScore, maxScore - safeMean);

            if (Number.isFinite(inferredSD) && inferredSD >= 1e-10) {
                if (distToBoundary < inferredSD * 1.5) {
                    const correctionFactor = 1 + (1 - distToBoundary / (inferredSD * 1.5));
                    inferredSD *= Math.min(1.5, correctionFactor);
                }
            }

            if (Number.isFinite(inferredSD) && inferredSD > 0) {
                safeSD = inferredSD;
            }
        }
    }

    if (!Number.isFinite(safeSD) || safeSD < 0) safeSD = 0;

    if (!hasExplicitDeterministicSD && historyLength < 15 && !bayesianCI && !isExplicitCoachSD) {
        const rangeMassa = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
        const floorVolatility = rangeMassa * 0.04;
        const confidence = Math.min(1, historyLength / 8);
        safeSD = (safeSD * confidence) + (floorVolatility * (1 - confidence));
    }

    const safeFlashcardImmunity = toFiniteNumber(flashcardImmunity, 1.0);

    if (safeFlashcardImmunity < 1.0 && safeSD > 0) {
        safeSD = safeSD * Math.max(0.80, safeFlashcardImmunity);
    }

    if (!Number.isFinite(safeSD) || safeSD < 0) safeSD = 0;

    const effectiveTarget = clamp(toFiniteNumber(targetScore, minScore), minScore, maxScore);
    const safeSimulations = sanitizeSimulations(simulations);

    if (safeSD < 1e-5) {
        const prob = safeMean >= effectiveTarget ? 100 : 0;

        return {
            simulationCount: safeSimulations,
            probability: prob,
            analyticalProbability: prob,
            recommendedProbability: prob,
            probabilityPolicy: 'deterministic',
            mean: safeMean,
            sd: 0,
            sdVisual: 0,
            sdLeft: 0,
            sdRight: 0,
            ci95StatLow: safeMean,
            ci95StatHigh: safeMean,
            ci95Low: safeMean,
            ci95High: safeMean,
            ci95VisualLow: safeMean,
            ci95VisualHigh: safeMean,
            ci95VisualClamped: false,
            currentMean: safeCurrentMean,
            projectedMean: safeMean,
            projectedSD: 0,
            kdeData: [
                safeMean > minScore ? { x: safeMean - 0.1, y: 0, density: 0 } : null,
                { x: safeMean, y: 1, density: 1 },
                safeMean < maxScore ? { x: safeMean + 0.1, y: 0, density: 0 } : null
            ].filter(Boolean),
            drift: 0,
            volatility: 0,
            minScore,
            maxScore,
            method: bayesianCI ? 'bayesian_static_hybrid' : 'deterministic'
        };
    }

    const numericSeed = toFiniteNumber(seed, NaN);
    const stableSeed = Number.isFinite(numericSeed)
        ? (numericSeed >>> 0)
        : generateStableSeed(historyLength, categoryName, targetScore, safeCurrentMean);

    const rng = mulberry32(stableSeed);

    let success = 0;
    let welfordMean = 0;
    let welfordM2 = 0;
    let welfordCount = 0;

    const allScores = new Float64Array(safeSimulations);

    let muParam = safeMean;

    if (safeSD > 0) {
        const distMin = safeMean - minScore;
        const distMax = maxScore - safeMean;

        if (distMin < safeSD * 1.5 || distMax < safeSD * 1.5) {
            const spread = Math.max(safeSD * 30, (maxScore - minScore) * 3);
            let muLow = minScore - spread;
            let muHigh = maxScore + spread;

            for (let iter = 0; iter < 20; iter++) {
                const currentTruncMean = truncatedNormalMean(muParam, safeSD, minScore, maxScore);
                if (!Number.isFinite(currentTruncMean)) break;

                const error = currentTruncMean - safeMean;
                if (Math.abs(error) < 0.25) break;

                if (error > 0) muHigh = muParam;
                else muLow = muParam;

                muParam = (muLow + muHigh) / 2;
            }
        }
    }

    if (!Number.isFinite(muParam)) muParam = safeMean;

    let cutoffsMean = 0;
    let cutoffsSD = 0;

    const numericCutoffs = historicalCutoffs;
    const hasCutoffs = numericCutoffs.length > 0;

    if (hasCutoffs) {
        cutoffsMean = kahanSum(numericCutoffs) / numericCutoffs.length;

        if (numericCutoffs.length > 1) {
            const devs = numericCutoffs.map(v => Math.pow(v - cutoffsMean, 2));
            cutoffsSD = Math.sqrt(Math.max(0, kahanSum(devs) / (numericCutoffs.length - 1)));
        } else {
            cutoffsSD = cutoffsMean * 0.05;
        }

        if (!Number.isFinite(cutoffsSD) || cutoffsSD <= 0) {
            cutoffsSD = Math.max(1e-6, cutoffsMean * 0.05);
        }
    }

    const cutoffSubjects = sanitizeSubjects(subjects).filter(s => s.minCutoff > 0);

    const subjectStats = cutoffSubjects.map(s => {
        const safeSd = Math.max(1e-6, toFiniteNumber(s.sd, 1));
        const safeImmunity = toFiniteNumber(s.immunityFactor, 1.0);

        return {
            ...s,
            sd: safeSd * Math.max(0.80, safeImmunity)
        };
    });

    let subjectCholesky = null;

    if (subjectStats.length > 1) {
        const adaptiveRhoContext = meanOrObj?.simuladoRows
            ? {
                simuladoRows: meanOrObj.simuladoRows,
                categoryNames: subjectStats.map(s => String(s?.name ?? s?.id ?? 'subject'))
            }
            : null;

        const cov = buildCovarianceMatrix(subjectStats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
        const psdCov = ensurePositiveSemiDefinite(cov);
        subjectCholesky = choleskyDecomposition(psdCov);

        // ✅ FIX BUG-06: Validar e substituir elementos quase-zero na diagonal da Cholesky
        // Previne singularidades na multiplicação downstream que arruínam as simulações
        if (subjectCholesky) {
            for (let i = 0; i < subjectCholesky.length; i++) {
                if (!Number.isFinite(subjectCholesky[i][i]) || subjectCholesky[i][i] < 1e-8) {
                    subjectCholesky[i][i] = 1e-8;
                }
            }
        }
    }

    const choleskySize = subjectStats.length;
    const zVecStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const zCorrStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;

    for (let i = 0; i < safeSimulations; i++) {
        let currentTarget = effectiveTarget;

        if (hasCutoffs) {
            currentTarget = sampleTruncatedNormal(cutoffsMean, cutoffsSD, minScore, maxScore, rng);
            if (!Number.isFinite(currentTarget)) currentTarget = effectiveTarget;
        }

        let score = sampleTruncatedNormal(muParam, safeSD, minScore, maxScore, rng);
        if (!Number.isFinite(score)) score = clamp(safeMean, minScore, maxScore);

        let passedMins = true;

        if (subjectStats.length > 0) {
            // ✅ LOTE-01 FIX: clamp por disciplina + média ponderada
            let subjectSum = 0;
            let weightSum = 0;
            if (subjectCholesky) {
                for (let k = 0; k < subjectStats.length; k++) {
                    const s = subjectStats[k];
                    const sMin = clamp(toFiniteNumber(s.minScore, minScore), minScore, maxScore);
                    const sMax = clamp(toFiniteNumber(s.maxScore, maxScore), minScore, maxScore);
                    const lower = Math.min(sMin, sMax);
                    const upper = Math.max(sMin, sMax);
                    const safeSubjectMean = toFiniteNumber(s.mean, 0);
                    const safeSubjectSd = Math.max(1e-6, toFiniteNumber(s.sd, 1));
                    let zMin = (lower - safeSubjectMean) / safeSubjectSd;
                    let zMax = (upper - safeSubjectMean) / safeSubjectSd;
                    let zLow = Math.min(zMin, zMax);
                    let zHigh = Math.max(zMin, zMax);
                    if (!Number.isFinite(zLow)) zLow = -6;
                    if (!Number.isFinite(zHigh)) zHigh = 6;
                    zVecStatic[k] = sampleTruncatedNormal(0, 1, zLow, zHigh, rng);
                }
                applyCovariance(subjectCholesky, zVecStatic, zCorrStatic);
                for (let j = 0; j < subjectStats.length; j++) {
                    const s = subjectStats[j];
                    const sMin = clamp(toFiniteNumber(s.minScore, minScore), minScore, maxScore);
                    const sMax = clamp(toFiniteNumber(s.maxScore, maxScore), minScore, maxScore);
                    const weight = Math.max(1e-6, toFiniteNumber(s.weight, 1));
                    const raw = toFiniteNumber(s.mean, 0) + zCorrStatic[j];
                    const subjScore = clamp(raw, Math.min(sMin, sMax), Math.max(sMin, sMax));  // ✅ FIX
                    subjectSum += subjScore * weight;
                    weightSum += weight;
                    if (!Number.isFinite(subjScore) || subjScore < toFiniteNumber(s.minCutoff, 0)) {
                        passedMins = false;
                    }
                }
            } else {
                for (let j = 0; j < subjectStats.length; j++) {
                    const s = subjectStats[j];
                    const sMin = clamp(toFiniteNumber(s.minScore, minScore), minScore, maxScore);
                    const sMax = clamp(toFiniteNumber(s.maxScore, maxScore), minScore, maxScore);
                    const effSd = Math.max(
                        1e-6,
                        toFiniteNumber(s.sd, 1) * Math.max(0.80, toFiniteNumber(s.immunityFactor, 1.0))
                    );
                    const weight = Math.max(1e-6, toFiniteNumber(s.weight, 1));
                    const sScore = sampleTruncatedNormal(
                        toFiniteNumber(s.mean, 0),
                        effSd,
                        Math.min(sMin, sMax),
                        Math.max(sMin, sMax),
                        rng
                    );
                    subjectSum += sScore * weight;
                    weightSum += weight;
                    if (!Number.isFinite(sScore) || sScore < toFiniteNumber(s.minCutoff, 0)) {
                        passedMins = false;
                    }
                }
            }
            score = weightSum > 0 ? subjectSum / weightSum : score;
        }

        if (score >= currentTarget && passedMins) success++;

        allScores[i] = score;

        welfordCount++;
        const delta = score - welfordMean;
        welfordMean += delta / welfordCount;
        welfordM2 += delta * (score - welfordMean);
    }

    const projectedMeanRaw = welfordMean;
    const projectedMean = Number.isFinite(projectedMeanRaw) ? projectedMeanRaw : safeMean;

    const rawProjectedVar = welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0;
    const projectedSD = Math.sqrt(Math.max(0, Number.isFinite(rawProjectedVar) ? rawProjectedVar : 0));

    allScores.sort();

    const nScores = allScores.length;

    const at = (p) => allScores[Math.max(0, Math.min(nScores - 1, Math.floor(nScores * p)))];

    const statisticalCi95Low = at(0.025);
    const statisticalCi95High = at(0.975);
    const empMedian = at(0.5);
    const rawLeft = at(0.16);
    const rawRight = at(0.84);

    let rawLow = statisticalCi95Low;
    let rawHigh = statisticalCi95High;

    const empiricalProbability = (success / safeSimulations) * 100;

    const posteriorAlpha = success + 0.5;
    const posteriorBeta = (safeSimulations - success) + 0.5;
    const bayesEmpiricalProbability = (posteriorAlpha / (posteriorAlpha + posteriorBeta)) * 100;

    const displayMeanRaw = bayesianCI ? safeMean : projectedMean;
    const safeDisplayMean = clamp(toFiniteNumber(displayMeanRaw, safeMean), minScore, maxScore);

    const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
    const MIN_SPREAD = Math.max(0.5, range * 0.005);

    const clampedDisplayMean = safeDisplayMean;
    const wasVisualCIClamped = (rawHigh - rawLow < MIN_SPREAD);

    if (wasVisualCIClamped) {
        const availableSpan = maxScore - minScore;

        if (availableSpan < MIN_SPREAD) {
            rawLow = minScore;
            rawHigh = maxScore;
        } else {
            rawLow = Math.max(minScore, clampedDisplayMean - MIN_SPREAD / 2);
            rawHigh = Math.min(maxScore, clampedDisplayMean + MIN_SPREAD / 2);

            if (rawHigh === maxScore && rawLow < maxScore - MIN_SPREAD) {
                rawLow = maxScore - MIN_SPREAD;
            } else if (rawLow === minScore && rawHigh > minScore + MIN_SPREAD) {
                rawHigh = minScore + MIN_SPREAD;
            }
        }
    }

    if (!Number.isFinite(rawLow)) rawLow = minScore;
    if (!Number.isFinite(rawHigh)) rawHigh = maxScore;

    const displayLow = rawLow;
    const displayHigh = rawHigh;

    const effectiveNForSD = bayesianCI
        ? Math.max(1, toFiniteNumber(bayesianCI.n, historyLength || 1))
        : Math.max(1, historyLength || 1);

    const tMultiplierForSDRaw = getConfidenceMultiplier(effectiveNForSD, { allowFractional: true });
    const tMultiplierForSD = Number.isFinite(tMultiplierForSDRaw) && tMultiplierForSDRaw > 0
        ? tMultiplierForSDRaw
        : 3.92;

    const rawVisualSD = wasVisualCIClamped
        ? (rawHigh - rawLow) / (tMultiplierForSD * 2)
        : projectedSD;

    const visualSD = Number.isFinite(rawVisualSD) ? Math.max(0, rawVisualSD) : projectedSD;

    const safePhi = (v) => Number.isFinite(v) ? v : 0;

    const phiMin = safePhi(normalCDF_complement((minScore - muParam) / safeSD));
    const phiMax = safePhi(normalCDF_complement((maxScore - muParam) / safeSD));
    const phiTarget = safePhi(normalCDF_complement((effectiveTarget - muParam) / safeSD));

    let rawTruncNormFactor = phiMin - phiMax;
    if (!Number.isFinite(rawTruncNormFactor)) rawTruncNormFactor = 0;

    const isUnderflowStress = rawTruncNormFactor < 1e-15;

    const clampedPhiTarget = Number.isFinite(phiTarget)
        ? Math.max(phiMax, Math.min(phiMin, phiTarget))
        : phiMax;

    let truncNormFactor = isUnderflowStress ? 1e-6 : rawTruncNormFactor;
    if (!Number.isFinite(truncNormFactor) || truncNormFactor <= 0) truncNormFactor = 1e-6;

    let analyticalProbability;

    if (effectiveTarget >= maxScore && !hasCutoffs) {
        analyticalProbability = 0;
    } else if (effectiveTarget <= minScore && !hasCutoffs) {
        analyticalProbability = 100;
    } else {
        analyticalProbability = (isUnderflowStress || hasCutoffs)
            ? empiricalProbability
            : ((clampedPhiTarget - phiMax) / truncNormFactor) * 100;
    }

    if (!Number.isFinite(analyticalProbability)) analyticalProbability = empiricalProbability;

    const finalAnalyticalProbability = analyticalProbability;

    const finiteEmpiricalProbability = Number.isFinite(bayesEmpiricalProbability) ? bayesEmpiricalProbability : 0;
    const finiteAnalyticalProbability = Number.isFinite(finalAnalyticalProbability) ? finalAnalyticalProbability : 0;

    const empiricalVsAnalyticalGap = Math.abs(finiteEmpiricalProbability - finiteAnalyticalProbability);

    const lowSimulation = safeSimulations < 1200;
    const highTruncationStress = isUnderflowStress || truncNormFactor < 1e-6;

    const pHat = finiteEmpiricalProbability / 100;
    const empiricalStdErrRaw = Math.sqrt(Math.max(1e-12, (pHat * (1 - pHat)) / Math.max(1, safeSimulations))) * 100;
    const empiricalStdErr = Number.isFinite(empiricalStdErrRaw) ? empiricalStdErrRaw : 0;

    const GOLD_STANDARD_SIMS = 15000;
    const empiricalConfidence = Math.min(1, Math.max(0, safeSimulations / GOLD_STANDARD_SIMS));
    const truncationPenalty = highTruncationStress ? 0.55 : 1;
    const uncertaintyScaledGap = empiricalVsAnalyticalGap / Math.max(1, empiricalStdErr * 2.2);
    const disagreementPenalty = Math.max(0.35, 1 - (uncertaintyScaledGap / 6));

    const analyticalWeight = Math.min(0.9, Math.max(0, (1 - empiricalConfidence) * truncationPenalty * disagreementPenalty));

    const blendedProbability = (finiteAnalyticalProbability * analyticalWeight)
        + (finiteEmpiricalProbability * (1 - analyticalWeight));

    const recommendedProbability = Number.isFinite(blendedProbability) ? blendedProbability : finiteEmpiricalProbability;

    const safeEmpMedian = toFiniteNumber(empMedian, safeMean);
    const safeRawLeft = toFiniteNumber(rawLeft, safeMean);
    const safeRawRight = toFiniteNumber(rawRight, safeMean);

    const diagnostics = {
        simulationCount: safeSimulations,
        empiricalStdErr: Number(empiricalStdErr.toFixed(3)),
        analyticalWeight: Number(analyticalWeight.toFixed(3)),
        rhoUsed: null,
        effectiveN: Math.max(1, toFiniteNumber(historyLength, safeSimulations / 10)),
        shrinkageApplied: null,
        volatilitySources: {
            withinSubject: Number(safeSD.toFixed(2)),
            betweenSubjectContribution: 0
        },
        convergence: {
            targetSE: TARGET_PROB_SE,
            achievedSE: Number(empiricalStdErr.toFixed(4)),
            sufficient: empiricalStdErr < TARGET_PROB_SE * 1.5
        },
        policy: lowSimulation ? 'low_sample' : (highTruncationStress ? 'truncated' : 'standard'),
        flashcardImmunityApplied: safeFlashcardImmunity < 1.0 ? Number(safeFlashcardImmunity.toFixed(3)) : null
    };

    return {
        simulationCount: safeSimulations,
        probability: finiteEmpiricalProbability,
        analyticalProbability: finiteAnalyticalProbability,
        recommendedProbability,
        probabilityPolicy: lowSimulation
            ? 'blended_low_sample_policy'
            : (highTruncationStress ? 'blended_truncated_policy' : 'blended_adaptive_policy'),
        analyticalWeight,
        empiricalStdErr,
        empiricalProbabilityRaw: empiricalProbability,
        empiricalProbabilityBayes: finiteEmpiricalProbability,
        mean: safeDisplayMean,
        sd: projectedSD,
        sdVisual: visualSD,
        sdLeft: Math.max(
            Math.max((maxScore - minScore) * 0.001, 1e-6),
            Math.max(0, safeEmpMedian - safeRawLeft)
        ),
        sdRight: Math.max(
            Math.max((maxScore - minScore) * 0.001, 1e-6),
            Math.max(0, safeRawRight - safeEmpMedian)
        ),
        ci95StatLow: statisticalCi95Low,
        ci95StatHigh: statisticalCi95High,
        ci95Low: displayLow,
        ci95High: displayHigh,
        ci95VisualLow: displayLow,
        ci95VisualHigh: displayHigh,
        ci95VisualClamped: wasVisualCIClamped,
        ciConformalLow: statisticalCi95Low,
        ciConformalHigh: statisticalCi95High,
        currentMean: safeCurrentMean,
        projectedMean,
        projectedSD,
        kdeData: generateKDE(allScores, safeDisplayMean, projectedSD, safeSimulations, minScore, maxScore),
        drift: 0,
        volatility: safeSD,
        minScore,
        maxScore,
        method: bayesianCI ? 'bayesian_static_hybrid' : 'normal',
        diagnostics
    };
}

const mcCache = new Map();
const MAX_CACHE_SIZE = 50;

function hashObject(obj) {
    try {
        return JSON.stringify(obj);
    } catch {
        return null;
    }
}

export function runMonteCarloAnalysis(params = {}) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
        console.warn("[MC Engine] Fallback acionado. 'runMonteCarloAnalysis' requer objeto. Ignorando chamada bruta.");
        return monteCarloSimulation([], 85, 90, 5000, {});
    }

    const cacheKey = hashObject(params);
    if (cacheKey && mcCache.has(cacheKey)) {
        // Move to top (LRU)
        const cached = mcCache.get(cacheKey);
        mcCache.delete(cacheKey);
        mcCache.set(cacheKey, cached);
        return cached;
    }

    const {
        values = [],
        dates = [],
        meta = 0,
        targetScore: objTargetScore,
        simulations = 5000,
        projectionDays = 90,
        forcedVolatility: objForcedVolatility,
        forcedBaseline: objForcedBaseline,
        currentMean: objCurrentMean,
        minScore: objMinScore,
        maxScore: objMaxScore,
        subjects: objSubjects,
        historicalCutoffs: objHistoricalCutoffs,
        ...options
    } = params;

    const safeDomain = sanitizeDomain(objMinScore, objMaxScore);
    const domainMin = safeDomain.minScore;
    const domainMax = safeDomain.maxScore;

    const rawResolvedTarget = objTargetScore ?? Number(meta || 0);
    const resolvedTarget = clamp(toFiniteNumber(rawResolvedTarget, domainMin), domainMin, domainMax);

    const safeSimulations = sanitizeSimulations(simulations);
    // ✅ LOTE-03 FIX: "simular hoje" é um caso de uso válido (effectiveSimulateToday)
    const safeProjectionDays = Math.max(0, Math.floor(toFiniteNumber(projectionDays, 90)));

    const safeSubjects = objSubjects === undefined ? undefined : sanitizeSubjects(objSubjects);

    const safeHistoricalCutoffs = objHistoricalCutoffs === undefined
        ? undefined
        : (Array.isArray(objHistoricalCutoffs)
            ? objHistoricalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
            : []);

    const mergedOptions = {
        forcedVolatility: objForcedVolatility,
        forcedBaseline: objForcedBaseline,
        currentMean: objCurrentMean,
        minScore: domainMin,
        maxScore: domainMax,
        subjects: safeSubjects,
        historicalCutoffs: safeHistoricalCutoffs,
        ...options,
    };

    const extractScore = (value) => {
        if (value && typeof value === 'object') {
            return value.score ?? value.value;
        }
        return value;
    };

    const safeDates = dates || [];
    const safeValues = values || [];

    const history = safeValues
        .map((score, index) => {
            const rawScore = extractScore(score);
            const isNuloOuVazio = rawScore === null || rawScore === undefined || String(rawScore).trim() === '';
            
            const baseObj = (typeof score === 'object' && score !== null) ? score : {};

            return {
                ...baseObj,
                score: isNuloOuVazio ? NaN : Number(rawScore),
                date: safeDates[index] || baseObj.date || getDateKey(new Date())
            };
        })
        .filter(row => Number.isFinite(row.score));

    const result = monteCarloSimulation(history, resolvedTarget, safeProjectionDays, safeSimulations, mergedOptions);
    
    if (cacheKey) {
        if (mcCache.size >= MAX_CACHE_SIZE) {
            const firstKey = mcCache.keys().next().value;
            mcCache.delete(firstKey);
        }
        mcCache.set(cacheKey, result);
    }
    
    return result;
}

export function clearEngineMcCache() {
    mcCache.clear();
}

export default {
    runMonteCarloAnalysis,
    clearEngineMcCache
};
```

---

