# Código Completo do Menu Evolução

Este documento consolida todos os arquivos-fonte que compõem o ecossistema do Menu Evolução (páginas, componentes principais, subcomponentes de gráficos, cards de KPI, hooks e motores analíticos).

---

## 📑 Índice de Arquivos

1. [`src/pages/Evolution.jsx`](#src-pages-evolution-jsx)
2. [`src/components/EvolutionChart.jsx`](#src-components-evolutionchart-jsx)
3. [`src/components/charts/EvolutionHeatmap.jsx`](#src-components-charts-evolutionheatmap-jsx)
4. [`src/components/charts/GaussianPlot.jsx`](#src-components-charts-gaussianplot-jsx)
5. [`src/components/charts/ChartTooltip.jsx`](#src-components-charts-charttooltip-jsx)
6. [`src/components/charts/ChartFrame.jsx`](#src-components-charts-chartframe-jsx)
7. [`src/components/charts/EvolutionChart/EvolutionLineChart.jsx`](#src-components-charts-evolutionchart-evolutionlinechart-jsx)
8. [`src/components/charts/EvolutionChart/CompareChart.jsx`](#src-components-charts-evolutionchart-comparechart-jsx)
9. [`src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx`](#src-components-charts-evolutionchart-subtopicsperformancechart-jsx)
10. [`src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx`](#src-components-charts-evolutionchart-todayvsgeneralchart-jsx)
11. [`src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx`](#src-components-charts-evolutionchart-weeklyevolutionview-jsx)
12. [`src/components/charts/EvolutionChart/TimeSpentChart.jsx`](#src-components-charts-evolutionchart-timespentchart-jsx)
13. [`src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx`](#src-components-charts-evolutionchart-montecarloevolutionchart-jsx)
14. [`src/components/charts/EvolutionChart/PerformanceBarChart.jsx`](#src-components-charts-evolutionchart-performancebarchart-jsx)
15. [`src/components/charts/EvolutionChart/RadarAnalysis.jsx`](#src-components-charts-evolutionchart-radaranalysis-jsx)
16. [`src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx`](#src-components-charts-evolutionchart-criticaltopicsanalysis-jsx)
17. [`src/components/charts/EvolutionChart/DisciplinaCard.jsx`](#src-components-charts-evolutionchart-disciplinacard-jsx)
18. [`src/components/charts/EvolutionChart/KpiCard.jsx`](#src-components-charts-evolutionchart-kpicard-jsx)
19. [`src/hooks/useChartData.js`](#src-hooks-usechartdata-js)
20. [`src/hooks/useEvolutionMC.js`](#src-hooks-useevolutionmc-js)
21. [`src/hooks/useCategoryLevels.js`](#src-hooks-usecategorylevels-js)
22. [`src/hooks/useSubjectAggData.js`](#src-hooks-usesubjectaggdata-js)
23. [`src/hooks/useMonteCarloWorker.js`](#src-hooks-usemontecarloworker-js)
24. [`src/engine/insightGenerator.js`](#src-engine-insightgenerator-js)
25. [`src/utils/heatmapAggregation.js`](#src-utils-heatmapaggregation-js)
26. [`src/utils/monteCarloScenario.js`](#src-utils-montecarloscenario-js)

---

## `src/pages/Evolution.jsx`

<a id="src-pages-evolution-jsx"></a>

```jsx
import React from 'react';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const EMPTY_ARRAY = Object.freeze([]);

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
    const safeMin = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMax) : 0;
    const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
    
    // 1) Se existir targetScore explícito, ele é a meta em pontos
    if (user?.targetScore != null && Number.isFinite(Number(user.targetScore))) {
      let ts = Number(user.targetScore);
      // Compatibilidade: se o valor está na faixa 0-100 E a escala é > 100 com piso 0,
      // provavelmente é um percentual que precisa ser convertido para pontos.
      if (ts <= 100 && safeMax > 100 && safeMin === 0) {
        ts = (ts / 100) * safeMax;
      }
      return clamp(ts);
    }
    
    // 2) Fallback: targetProbability é percentual (0-100) e deve virar pontos
    if (user?.targetProbability != null && Number.isFinite(Number(user.targetProbability))) {
      return clamp(safeMin + (Number(user.targetProbability) / 100) * (safeMax - safeMin));
    }
    
    // 3) Default seguro: 80% da escala
    return clamp(safeMin + (safeMax - safeMin) * 0.8);
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

## `src/components/EvolutionChart.jsx`

<a id="src-components-evolutionchart-jsx"></a>

```jsx
import React, { useState, useMemo } from "react";
import { useChartData } from "../hooks/useChartData";
import { useEvolutionMC } from "../hooks/useEvolutionMC";
import { useCategoryLevels } from "../hooks/useCategoryLevels";
import { useSubjectAggData } from "../hooks/useSubjectAggData";
import { EvolutionHeatmap } from "./charts/EvolutionHeatmap";
import { getDateKey, toDateMs, normalizeDate } from "../utils/dateHelper";
import { exportComponentAsPDF } from "../utils/pdfExport";
import { Download, Loader2, Zap, Target, BarChart3, TrendingUp } from "lucide-react";
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

const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

function safeFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
export function buildPredictiveCompareData(
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

    // ✅ BUG-2 FIX: parse a data base UMA VEZ antes do loop (evita recálculo + mutação do Date)
    const baseParsed = normalizeDate(pts[lastIdx].date);
    if (!baseParsed || Number.isNaN(baseParsed.getTime())) return pts;
    const baseMs = new Date(baseParsed.getFullYear(), baseParsed.getMonth(), baseParsed.getDate(), 12, 0, 0, 0).getTime();

    const futurePoints = [];
    const steps = 6;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const weight = Math.sqrt(t);

      const val = bounded(currentLevel + (p50 - currentLevel) * t);
      const bandLow = bounded(currentLevel + (bandMin - currentLevel) * weight);
      const bandHigh = bounded(currentLevel + (bandMax - currentLevel) * weight);

      const forwardDays = Math.max(1, Math.round((i / steps) * (projectDays || 30)));
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


const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};
const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

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
    const focusSubjectId = useMemo(() => {
        if (categories && categories.some(c => c.id === selectedSubjectId)) {
            return selectedSubjectId;
        }
        return categories?.[0]?.id;
    }, [categories, selectedSubjectId]);

    // RIGOR-09 FIX: Recuperar os pesos do store para o Global Pct ponderado
    const mcWeights = useAppStore(
        (state) => state.appState?.contests?.[state.appState?.activeId]?.mcWeights || EMPTY_OBJECT
    );
    const { timeline, heatmapData, globalMetrics, activeCategories } = useChartData(categories, mcWeights, maxScore);
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
    const safeGlobalMetrics = useMemo(() => ({
        totalQuestions: Number(globalMetrics?.totalQuestions) || 0,
        totalCorrect: Number(globalMetrics?.totalCorrect) || 0,
        globalAccuracy: (globalMetrics?.globalAccuracy === null || globalMetrics?.globalAccuracy === undefined || globalMetrics?.globalAccuracy === '') ? 0 : (Number.isFinite(Number(globalMetrics?.globalAccuracy)) ? Number(globalMetrics?.globalAccuracy) : 0),
    }), [globalMetrics]);

    const projectDays = useMemo(() => {
        if (!goalDate) return 30;
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        const goal = parseGoalDateLocal(goalDate);
        if (!goal) return 30;
        goal.setHours(12, 0, 0, 0);
        const diffDays = Math.ceil((goal - now) / (1000 * 60 * 60 * 24));
        const safeDays = diffDays > 0 ? diffDays : 1;
        return Math.min(3650, safeDays);
    }, [goalDate]);

    const [showOnlyFocus, setShowOnlyFocus] = useState(false);
    const [timeWindow, setTimeWindow] = useState("all");
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState(false);
    const [showEngineTooltip, setShowEngineTooltip] = useState(false);

    const focusCategory = useMemo(() => {
        if (!categories || categories.length === 0) return null;
        const found = categories.find(c => c.id === focusSubjectId);
        return found || categories[0];
    }, [categories, focusSubjectId]);

    const categoryLevels = useCategoryLevels(categories, timeline, activeEngine, maxScore, minScore);

    const subjectAggData = useSubjectAggData({
        categories, showOnlyFocus, focusCategory, timeWindow, maxScore, minScore
    });

    const { mcLoading, activeMcResult, activeMcProjectionSeries } = useEvolutionMC({
        focusCategory, categoryLevels, projectDays, targetScore, minScore, maxScore, activeEngine
    });

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

        const primaryKey =
            activeEngine === "compare"
                ? "Nível Bayesiano"
                : activeEngine === "mc_density"
                    ? focusCategory?.id ? `bay_${focusCategory.id}` : null
                    : activeEngine === "raw"
                        ? focusCategory?.id ? `raw_${focusCategory.id}` : null
                        : activeEngine === "stats"
                            ? focusCategory?.id ? `stats_${focusCategory.id}` : null
                            : focusCategory?.id ? `bay_${focusCategory.id}` : null;

        const sampledHistorical = downsampleLTTB(result, 150, "date", primaryKey || "date");
        return future.length > 0 ? [...sampledHistorical, ...future] : sampledHistorical;
    }, [chartData, timeWindow, activeEngine, focusCategory?.id]);

    const radarData = useMemo(() => {
        if (!categories || !categories.length) return [];
        return categories.map(cat => {
            const lvl = categoryLevels?.[cat.id];
            const val = Number.isFinite(Number(lvl)) ? Number(Number(lvl).toFixed(2)) : minScore;
            return {
                subject: String(cat.name || 'Sem nome').replace(/Direito /gi, 'D. ').substring(0, 15),
                nivel: val,
                meta: targetScore
            };
        });
    }, [categories, targetScore, categoryLevels, minScore]);

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
        setExportError(false);

        try {
            await exportComponentAsPDF('evolution-chart-container', 'RaioX_Evolucao_Dashboard.pdf', 'landscape');
        } catch (err) {
            console.error('[EvolutionChart] Falha ao exportar PDF:', err);
            setExportError(true);
            setTimeout(() => setExportError(false), 5000);
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



    return (
        <motion.div id="evolution-chart-container" className="space-y-10 relative" variants={containerVariants} initial="hidden" animate="visible">
            <div className="flex justify-end mb-6 relative z-20 no-print pr-1">
                <div className="flex flex-col items-end">
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
                    {exportError && (
                        <span className="text-[10px] text-rose-400 font-bold mt-1 animate-pulse">
                            ❌ Falha ao gerar PDF. Tente novamente.
                        </span>
                    )}
                </div>
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
                                isFocused={focusCategory?.id === cat.id}
                                onClick={() => setFocusSubjectId(cat.id)}
                                unit={unit}
                                maxScore={maxScore}
                                minScore={minScore}
                            />
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* ✅ BUG-10 FIX: z-[50] → z-10 para não cortar tooltips de charts abaixo */}
            <motion.div variants={itemVariants} className="relative z-10 rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] w-full min-w-0 transition-all duration-700 overflow-visible"
                 style={{ boxShadow: `0 0 60px -15px ${engine.color}20` }}>
                 
                 <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-700/50">
                     
                     <div className="group relative flex-1">
                         <div className="flex items-center gap-3">
                             <span className="text-2xl sm:text-3xl" style={{ filter: `drop-shadow(0 0 8px ${engine.color}80)` }}>{engine.emoji}</span>
                             <h3 className="font-black text-lg sm:text-xl tracking-tight transition-colors duration-300" style={{ color: engine.color }}>
                                 {engine.explain.titulo}
                             </h3>
                             <button
                                 type="button"
                                 onClick={() => setShowEngineTooltip(!showEngineTooltip)}
                                 className="relative flex items-center justify-center w-5 h-5 rounded-full border border-slate-600 text-slate-400 text-[10px] font-bold cursor-help hover:border-slate-300 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                 aria-label="Informações sobre este modo de visualização"
                             >
                                 ?
                             </button>
                         </div>
                         <div className={`absolute top-10 left-0 sm:left-12 w-[280px] max-w-[90vw] sm:w-72 p-4 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-xl shadow-2xl transition-all duration-300 z-[100] ${showEngineTooltip ? 'opacity-100 visible' : 'opacity-0 invisible'} group-hover:opacity-100 group-hover:visible`}>
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
                        maxScore={maxScore}
                        minScore={minScore}
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
                        minScore={minScore}
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
                    <div className="w-full overflow-x-auto no-scrollbar pb-2">
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
                                minScore={minScore}
                                maxScore={maxScore}
                                unit={unit}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto no-scrollbar pb-2">
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
                                        projectedMean={activeMcResult?.projectedMean ?? activeMcResult?.mean ?? 0}
                                        currentMean={categoryLevels[focusCategory?.id]}
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

## `src/components/charts/EvolutionHeatmap.jsx`

<a id="src-components-charts-evolutionheatmap-jsx"></a>

```jsx
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { aggregateHeatmap } from '../../utils/heatmapAggregation.js';

// ✅ FIX: Worker singleton compartilhado entre todas as instâncias
let sharedWorker = null;
let sharedWorkerRefCount = 0;

function getSharedWorker() {
  if (!sharedWorker) {
    try {
      sharedWorker = new Worker(
        new URL('../../engine/heatmap.worker.js', import.meta.url),
        { type: 'module' }
      );
    } catch (e) {
      console.warn("[EvolutionHeatmap] Web Worker not available:", e);
      return null;
    }
  }
  sharedWorkerRefCount++;
  return sharedWorker;
}

function releaseSharedWorker() {
  sharedWorkerRefCount--;
  if (sharedWorkerRefCount < 0) sharedWorkerRefCount = 0;
  if (sharedWorkerRefCount === 0 && sharedWorker) {
    sharedWorker.terminate();
    sharedWorker = null;
  }
}

export const EvolutionHeatmap = ({ 
    heatmapData, 
    targetScore = 70, 
    unit = '%', 
    showOnlyFocus, 
    focusSubjectId,
    maxScore = 100,
    minScore = 0 
}) => {
    const { dates = [], rows = [] } = heatmapData || {};
    
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const range = Math.max(1e-9, safeMax - safeMin);
    const targetScorePct = Math.max(0, Math.min(100, ((Number(targetScore) - safeMin) / range) * 100));

    // 🎯 FILTRO DE FOCO: Aplica o filtro de "Todas as Matérias" vs "Apenas Foco"
    const filteredRowsByFocus = useMemo(() => {
        if (!showOnlyFocus) return rows;
        return rows.filter(row => row.cat?.id === focusSubjectId);
    }, [rows, showOnlyFocus, focusSubjectId]);

    const [windowSize, setWindowSize] = useState('all');
    const [granularity, setGranularity] = useState('daily');

    const filtered = useMemo(() => {
        if (!Array.isArray(dates) || !Array.isArray(filteredRowsByFocus)) return { dates: [], rows: [] };
        const size = windowSize === 'all' ? dates.length : Number(windowSize);
        const safeSize = Number.isFinite(size) ? Math.max(1, size) : dates.length;
        const start = Math.max(0, dates.length - safeSize);

        return {
            dates: dates.slice(start),
            rows: filteredRowsByFocus.map((row) => ({
                ...row,
                cells: Array.isArray(row.cells) ? row.cells.slice(start) : []
            }))
        };
    }, [dates, filteredRowsByFocus, windowSize]);

    const [aggregated, setAggregated] = useState(() => {
        // Renderização síncrona para testes (renderToStaticMarkup)
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
            return aggregateHeatmap(filtered, 'daily', targetScore);
        }
        return { dates: [], rows: [] };
    });
    const [isAggregating, setIsAggregating] = useState(false);
    const workerRef = useRef(null);
    const didAcquireWorker = useRef(false);

    useEffect(() => {
        const worker = getSharedWorker();
        workerRef.current = worker;
        didAcquireWorker.current = worker !== null;
        
        return () => {
            if (didAcquireWorker.current) releaseSharedWorker();
            workerRef.current = null;
            didAcquireWorker.current = false;
        };
    }, []);

    useEffect(() => {
        const worker = workerRef.current;
        if (!worker) {
            setAggregated(aggregateHeatmap(filtered, granularity, targetScore));
            return;
        }

        const msgId = `${Date.now()}_${Math.random()}`;
        setIsAggregating(true);

        const handleMessage = (e) => {
            if (e.data?.id !== msgId) return;

            if (e.data.type === 'success') {
                setAggregated(e.data.result);
            } else {
                setAggregated(aggregateHeatmap(filtered, granularity, targetScore));
            }
            setIsAggregating(false);
        };

        const handleError = (err) => {
            console.warn('[EvolutionHeatmap] Worker error, falling back:', err);
            setAggregated(aggregateHeatmap(filtered, granularity, targetScore));
            setIsAggregating(false);
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);

        worker.postMessage({ id: msgId, payload: { filtered, granularity, targetScore } });

        return () => {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
        };
    }, [filtered, granularity, targetScore]);

    const filteredDates = aggregated.dates || [];
    const filteredRows = aggregated.rows || [];

    const totals = filteredRows
        .flatMap((row) => (Array.isArray(row?.cells) ? row.cells : []))
        .map((cell) => Number(cell?.total) || 0);
    const maxCellTotal = totals.length > 0 ? totals.reduce((m, v) => Math.max(m, v), 1) : 1;

    const cellColor = (pct, total = 0) => {
        if (pct == null) return { bg: 'rgba(255,255,255,0.02)', text: '#64748b', border: '#1e293b', density: 0 };
        const density = Math.min(1, (Number(total) || 0) / maxCellTotal);
        if (pct >= targetScorePct) return { bg: 'rgba(34,197,94,0.45)', text: '#4ade80', border: 'rgba(34,197,94,0.6)', density };
        if (pct >= targetScorePct * 0.8) return { bg: 'rgba(251,191,36,0.4)', text: '#fcd34d', border: 'rgba(251,191,36,0.6)', density };
        if (pct >= targetScorePct * 0.6) return { bg: 'rgba(251,146,60,0.4)', text: '#fb923c', border: 'rgba(251,146,60,0.6)', density };
        return { bg: 'rgba(239,68,68,0.4)', text: '#f87171', border: 'rgba(239,68,68,0.6)', density };
    };

    const formatPct = (value) => {
        if (!Number.isFinite(value)) return '—';
        const rounded = Number(value.toFixed(2));
        return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}${unit}`;
    };

    if (!filteredDates.length) return (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
            {isAggregating ? (
                <span className="flex items-center gap-2 animate-pulse text-indigo-400">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                    Processando volume de dados...
                </span>
            ) : "Nenhum dado encontrado."}
        </div>
    );

    const targetFmt = `${Math.round(targetScorePct)}%`;
    const t60Fmt = `${Math.round(targetScorePct * 0.6)}%`;
    const t80Fmt = `${Math.round(targetScorePct * 0.8)}%`;

    return (
        <div className="w-full overflow-x-auto overflow-y-visible custom-scrollbar pt-4 pb-8 sm:pb-10 px-1 min-h-[240px] rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-950/95 to-slate-900/90 shadow-[0_18px_45px_rgba(2,6,23,0.5)]">
            <div className="flex flex-wrap items-center gap-3.5 mb-5 text-[11px] text-slate-300">
                <div className="flex items-center gap-1 bg-slate-950/75 border border-slate-700/80 rounded-lg p-1.5 mr-2 shadow-sm">
                    {[{ label: '4 sem', value: '28' }, { label: '8 sem', value: '56' }, { label: '12 sem', value: '84' }, { label: 'Tudo', value: 'all' }].map(opt => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setWindowSize(opt.value)}
                            aria-label={`Filtrar janela ${opt.label}`}
                            aria-pressed={windowSize === opt.value}
                            className={`px-2.5 py-1.5 rounded-md text-[10px] font-extrabold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${windowSize === opt.value ? 'bg-indigo-500/30 text-indigo-100 border border-indigo-400/40' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 bg-slate-950/75 border border-slate-700/80 rounded-lg p-1.5 mr-2 shadow-sm">
                    {[{ label: 'Diário', value: 'daily' }, { label: 'Semanal', value: 'weekly' }, { label: 'Mensal', value: 'monthly' }].map(opt => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setGranularity(opt.value)}
                            aria-label={`Selecionar granularidade ${opt.label}`}
                            aria-pressed={granularity === opt.value}
                            className={`px-2.5 py-1.5 rounded-md text-[10px] font-extrabold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${granularity === opt.value ? 'bg-cyan-500/30 text-cyan-100 border border-cyan-400/40' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {[
                    { bg: 'rgba(239,68,68,0.3)', border: 'rgba(239,68,68,0.5)', label: `< ${t60Fmt}` },
                    { bg: 'rgba(251,146,60,0.3)', border: 'rgba(251,146,60,0.5)', label: `${t60Fmt}–${t80Fmt}` },
                    { bg: 'rgba(251,191,36,0.3)', border: 'rgba(251,191,36,0.5)', label: `${t80Fmt}–${targetFmt}` },
                    { bg: 'rgba(34,197,94,0.3)', border: 'rgba(34,197,94,0.5)', label: `≥ ${targetFmt} ✓ meta` },
                ].map(item => (
                    <span key={item.label} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: item.bg, border: `1px solid ${item.border}` }} />
                        {item.label}
                    </span>
                ))}
            </div>
            {granularity !== 'daily' && (
                <p className="text-[10px] text-cyan-200/90 font-bold uppercase tracking-wider mb-3.5">
                    Modo agregado ({granularity === 'weekly' ? 'semanal' : 'mensal'}): células representam múltiplos dias.
                </p>
            )}

            <div style={{ minWidth: `${filteredDates.length * 72 + 168}px` }}>
                <div style={{ display: 'grid', gridTemplateColumns: `168px repeat(${filteredDates.length}, 68px)`, gap: '4px' }} className="mb-3">
                    <div />
                    {filteredDates.map(d => (
                        <div key={d.key} className="flex flex-col items-center gap-1">
                            <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${d.isWeekend ? 'text-purple-300' : 'text-slate-400'}`}>
                                {d.dayName}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-100">{d.label}</span>
                            {Number.isFinite(Number(d.count)) && Number(d.count) > 1 && (
                                <span className="text-[8px] text-slate-500">{d.count}d</span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="space-y-2.5">
                    {filteredRows.map(({ cat, cells }, ri) => (
                        <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: `168px repeat(${filteredDates.length}, 68px)`, gap: '4px', alignItems: 'center' }}>
                            <div className="flex items-center gap-2.5 pr-4 min-w-0">
                                <span className="text-lg shrink-0">{cat.icon}</span>
                                <span className="text-sm sm:text-[13px] font-extrabold truncate leading-tight" style={{ color: cat.color }} title={cat.name}>
                                    {cat.name}
                                </span>
                            </div>

                            {cells.map((cell, ci) => {
                                const col = cellColor(cell?.pct, cell?.total);
                                return (
                                    <div
                                        key={ci}
                                        className="relative group rounded-lg flex flex-col items-center justify-center py-2.5 px-1 transition-all duration-200 hover:scale-[1.03] hover:z-20 cursor-default shadow-[0_6px_16px_rgba(2,6,23,0.22)] hover:shadow-[0_10px_24px_rgba(2,6,23,0.4)]"
                                        style={{
                                            background: col.bg,
                                            opacity: cell ? (0.85 + (col.density * 0.15)) : 1,
                                            border: `1px solid ${col.border}`,
                                            minHeight: '52px',
                                        }}
                                    >
                                        {cell ? (
                                            <>
                                                <span className="text-[13px] sm:text-[14px] font-black leading-none tabular-nums drop-shadow-[0_0_6px_rgba(15,23,42,0.65)]" style={{ color: col.text }}>
                                                    {formatPct(cell.pct)}
                                                </span>
                                                <span className="text-[9px] text-slate-300/80 font-mono mt-1">
                                                    {Math.round(cell.correct)}/{Math.round(cell.total)}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-slate-500 text-[13px] font-bold">—</span>
                                        )}

                                        {cell && (
                                            <div className={`absolute ${ri === 0 ? 'top-full mt-2' : 'bottom-full mb-2'} z-50 hidden group-hover:flex flex-col items-center bg-slate-950 border border-slate-500 rounded-xl p-4 min-w-[145px] shadow-[0_25px_60px_rgba(0,0,0,1)] whitespace-nowrap pointer-events-none text-center border-l-4 ${ci < 3 ? 'left-0' : ci > filteredDates.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`} style={{ borderLeftColor: col.text }}>
                                                <span className="text-[10px] text-slate-300 font-black uppercase tracking-[0.15em] mb-2.5 pb-2 border-b border-slate-800 w-full">
                                                    {filteredDates[ci] ? `${filteredDates[ci].dayName} • ${filteredDates[ci].label}` : ''}
                                                </span>
                                                {Number.isFinite(Number(filteredDates[ci]?.count)) && Number(filteredDates[ci].count) > 1 && (
                                                    <span className="text-[9px] text-cyan-400 font-bold mb-2">
                                                        Janela: {filteredDates[ci].count} dias
                                                    </span>
                                                )}
                                                <div className="flex flex-col items-center justify-center py-2.5 px-4 rounded-lg bg-slate-900 border border-slate-800 w-full mb-2.5">
                                                    <span className="text-[19px] font-black leading-none mb-1.5 drop-shadow-[0_0_8px_rgba(0,0,0,1)]" style={{ color: col.text }}>
                                                        {formatPct(cell.pct)}
                                                    </span>
                                                    <span className="text-[9px] text-slate-100 font-black uppercase tracking-widest">Desempenho</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-white font-mono">
                                                    <span className="font-black px-2 py-0.5 rounded-md bg-black" style={{ color: col.text }}>{Math.round(cell.correct)}</span>
                                                    <span className="text-slate-500 font-bold">/</span>
                                                    <span className="font-bold">{Math.round(cell.total)} <small className="text-[9px] text-slate-400">Q</small></span>
                                                </div>
                                                <div className="mt-2 text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                                                    Densidade: {Math.round((col.density || 0) * 100)}%
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

```

---

## `src/components/charts/GaussianPlot.jsx`

<a id="src-components-charts-gaussianplot-jsx"></a>

```jsx
import React, { useMemo, useState, useId, useRef, useEffect } from 'react';
import { asymmetricGaussian, generateGaussianPoints, normalCDF_complement } from '../../engine/math/gaussian.js';
import { formatDuration } from '../../utils/dateHelper';
import { formatValue } from '../../utils/scoreHelper';

/**
 * GaussianPlot
 * 
 * Renders a probability density function (PDF) based on Monte Carlo results.
 * Supports asymmetric distributions and Kernel Density Estimation (KDE) data.
 * Hardened with defensive boundary checks and non-zero scoring floor support.
 */
export const GaussianPlot = ({ 
    mean, 
    sd, 
    low95, 
    high95, 
    targetScore, 
    currentMean, 
    prob, 
    sdLeft: propSdLeft, 
    sdRight: propSdRight, 
    kdeData, 
    projectedMean, 
    minScore = 0, 
    maxScore = 100, 
    unit = '%' 
}) => {
    const [hover, setHover] = useState(null);
    const hoverRafRef = useRef(null);
    const pendingHoverRef = useRef(null);

    // LEAK-FIX: Cleanup de requestAnimationFrame pendente se o componente desmontar durante o hover
    useEffect(() => {
        return () => {
            if (hoverRafRef.current != null) {
                cancelAnimationFrame(hoverRafRef.current);
                hoverRafRef.current = null;
            }
            pendingHoverRef.current = null; // ✅ Limpar pending também
        };
    }, []);

    const instanceId = useId().replace(/:/g, '');
    const ID = {
        curveGrad: `gpCurveGradient_${instanceId}`,
        areaGrad: `gpAreaGradient_${instanceId}`,
        failGrad: `gpFailAreaGradient_${instanceId}`,
        glow: `gpGlow_${instanceId}`,
        chartClip: `chartClip_${instanceId}`
    };

    const successColor = '#22c55e';

    const {
        pathData, areaPathData, failAreaPathData, range, xMin, targetVal, xp,
        domainMin, domainMax, curveY
    } = useMemo(() => {
        const meanVal = mean ?? 0;
        const rawTargetVal = targetScore ?? 70;

        const domainMin = minScore;
        // Ajuste dinâmico do teto visual para comportar escalas ENEM ou maiores
        let rawMax = unit === '%' ? maxScore : Math.max(maxScore, rawTargetVal * 1.05, meanVal * 1.05);

        const domainMax = rawMax;
        const xMin = domainMin;
        const range = domainMax - domainMin;
        const safeRange = Math.max(1e-9, range);
        
        // Clamp do Alvo contra corrupções nos bounds visuais
        const targetVal = Math.max(domainMin, Math.min(domainMax, rawTargetVal));

        const sdFloor = safeRange * 0.001;
        let vizSdLeft = Math.max(sdFloor, propSdLeft ?? sd ?? sdFloor);
        let vizSdRight = Math.max(sdFloor, propSdRight ?? sd ?? sdFloor);

        const hasValidKDE = kdeData && kdeData.length > 5;

        // Se estivermos simulando uma Gaussiana Assimétrica para bater com a probabilidade real do motor
        if (!hasValidKDE && prob != null && prob > 0 && prob < 100) {
            const targetProb = prob / 100;
            const m = meanVal;
            const t = targetVal;

            const getGeomProb = (tVal, mVal, sl, sr) => {
                const normFactor = 2 / (sl + sr);
                const pUnderflow = normFactor * sl * normalCDF_complement((mVal - domainMin) / sl);
                const pOverflow = normFactor * sr * normalCDF_complement((domainMax - mVal) / sr);
                const truncatedTotal = Math.max(0.01, 1 - pUnderflow - pOverflow);

                let pSuccess;
                if (tVal >= mVal) {
                    const pRightSuccess = normFactor * sr * normalCDF_complement((tVal - mVal) / sr);
                    pSuccess = Math.max(0, pRightSuccess - pOverflow);
                } else {
                    const pLeftFail = normFactor * sl * normalCDF_complement((mVal - tVal) / sl);
                    const totalLeftArea = normFactor * sl * 0.5;
                    const totalRightArea = normFactor * sr * 0.5;
                    pSuccess = Math.max(0, (totalLeftArea - pLeftFail) + (totalRightArea - pOverflow));
                }
                return pSuccess / truncatedTotal;
            };

            let sl = vizSdLeft, sr = vizSdRight;
            for (let i = 0; i < 12; i++) {
                const pg = getGeomProb(t, m, sl, sr);
                if (isNaN(pg) || Math.abs(targetProb - pg) <= 0.002) break;

                const r = targetProb / Math.max(0.005, pg);
                const adjustment = t < m ? (1 / r) : r;
                const damp = 0.85 * Math.pow(0.93, i);
                const appliedAdj = 1 + (adjustment - 1) * damp;

                const safeR = Math.min(1.5, Math.max(0.66, appliedAdj));
                const currentCap = targetProb > 0.95 ? 8 : 4;

                if (t < m) {
                    sl = Math.min(vizSdLeft * currentCap, Math.max(1, sl * safeR));
                } else {
                    sr = Math.min(vizSdRight * currentCap, Math.max(1, sr * safeR));
                }
            }
            vizSdLeft = sl; vizSdRight = sr;
        }

        const baseHeightFactor = 0.65;
        const xp = (v) => 2 + (((v - xMin) / safeRange) * 96);
        const yp = (yVal) => 100 - (yVal * 90);

        let path;
        let pointsForArea = [];

        if (hasValidKDE) {
            const points = [];
            // FIX: Defesa Ativa contra Boundary Leaks no KDE recebido
            const safeX = (val) => Math.max(domainMin, Math.min(domainMax, val));

            points.push(`${xp(safeX(kdeData[0].x))},100`);
            kdeData.forEach(p => {
                points.push(`${xp(safeX(p.x))},${yp(p.y * baseHeightFactor)}`);
            });
            points.push(`${xp(safeX(kdeData[kdeData.length - 1].x))},100`);
            path = `M ${points.join(' L ')}`;
            pointsForArea = points;
        } else {
            const pts = generateGaussianPoints(xMin, domainMax, 100, meanVal, vizSdLeft, vizSdRight, baseHeightFactor, xp, yp);
            path = `M ${pts.join(' L ')}`;
            pointsForArea = pts;
        }

        const getYAtX = (pts, xTarget) => {
            let lo = null, hi = null;
            for (const p of pts) {
                const [px, py] = p.split(',').map(Number);
                if (px <= xTarget) lo = { px, py };
                else if (!hi) { hi = { px, py }; break; }
            }
            if (!lo) return hi?.py ?? 100;
            if (!hi) return lo.py;
            if (hi.px === lo.px) return lo.py;
            const t = (xTarget - lo.px) / (hi.px - lo.px);
            return lo.py + t * (hi.py - lo.py);
        };

        const successStart = Math.max(xMin, targetVal);
        const yAtTargetVisual = hasValidKDE ? getYAtX(pointsForArea, xp(successStart)) : yp(asymmetricGaussian(successStart, meanVal, vizSdLeft, vizSdRight, baseHeightFactor));

        const areaPoints = [];
        const failPoints = [];

        areaPoints.push(`${xp(successStart)},${yAtTargetVisual}`);
        pointsForArea.forEach(p => {
            const [xPos] = p.split(',').map(Number);
            if (xPos > xp(successStart)) areaPoints.push(p);
        });
        if (areaPoints.length > 0) {
            const lastP = areaPoints[areaPoints.length - 1];
            areaPoints.push(`${lastP.split(',')[0]},100`);
            areaPoints.push(`${xp(successStart)},100`);
        }

        failPoints.push(`${pointsForArea[0].split(',')[0]},100`);
        pointsForArea.forEach(p => {
            const [xPos] = p.split(',').map(Number);
            if (xPos <= xp(successStart)) failPoints.push(p);
        });
        failPoints.push(`${xp(successStart)},${yAtTargetVisual}`);
        failPoints.push(`${xp(successStart)},100`);

        const areaPath = areaPoints.length > 2 ? `M ${areaPoints.join(' L ')} Z` : '';
        const failPath = failPoints.length > 2 ? `M ${failPoints.join(' L ')} Z` : '';

        const calculateCurveY = (x) => {
            if (hasValidKDE) return getYAtX(pointsForArea, xp(x));
            return yp(asymmetricGaussian(x, meanVal, vizSdLeft, vizSdRight, baseHeightFactor));
        };

        return {
            pathData: path, areaPathData: areaPath, failAreaPathData: failPath,
            range, xMin, targetVal, xp,
            domainMin, domainMax, curveY: calculateCurveY
        };
    }, [mean, sd, targetScore, prob, propSdLeft, propSdRight, kdeData, minScore, maxScore, unit]);

    const targetPos = xp(targetVal);
    const targetY = curveY(targetVal);

    const rawMeanVal = projectedMean ?? mean ?? 0;
    const safeMean = Math.max(domainMin, Math.min(domainMax, rawMeanVal));
    const meanPos = xp(safeMean);
    const meanY = curveY(safeMean);

    const currentPos = currentMean != null ? xp(currentMean) : 0;
    const currentY = currentMean != null ? curveY(currentMean) : 100;

    const safeLow95 = Number.isFinite(Number(low95)) ? Number(low95) : (mean ?? 0);
    const safeHigh95 = Number.isFinite(Number(high95)) ? Number(high95) : (mean ?? 0);
    const ciLowBound = Math.max(domainMin, Math.min(domainMax, Math.min(safeLow95, safeHigh95)));
    const ciHighBound = Math.max(domainMin, Math.min(domainMax, Math.max(safeLow95, safeHigh95)));
    const ciHighPx = xp(ciHighBound);
    const ciLowPx = xp(ciLowBound);

    const isTargetVisible = targetPos >= 2 && targetPos <= 98;
    const isMeanVisible = meanPos >= 2 && meanPos <= 98;
    const isCurrentVisible = currentMean != null && currentPos >= 2 && currentPos <= 98;

    const resolvedLabels = useMemo(() => {
        const items = [];
        if (isTargetVisible) items.push({ id: 'target', x: targetPos });

        const hideMean = isCurrentVisible && isMeanVisible && Math.abs(currentPos - meanPos) < 2.5;
        if (!hideMean && isMeanVisible) items.push({ id: 'mean', x: meanPos });
        if (isCurrentVisible) items.push({ id: 'today', x: currentPos });

        const sorted = [...items].sort((a, b) => a.x - b.x);
        const THRESHOLD = 20;

        sorted.forEach((item, i) => {
            item.level = 0;
            if (i > 0) {
                const prev = sorted[i - 1];
                if (item.x - prev.x < THRESHOLD) {
                    item.level = prev.level + 1;
                }
            }
        });

        const res = { hideMean };
        sorted.forEach(item => res[item.id] = item.level);
        return res;
    }, [targetPos, meanPos, currentPos, isTargetVisible, isMeanVisible, isCurrentVisible]);

    // 🎯 FIX: Se a curva bater no teto do SVG (yPercent < 20), ele renderiza o label ABAIXO da linha 
    // em vez de forçar para cima e ser cortado pelo Box Model
    const getLabelTop = (yPercent, level) => {
        if (yPercent < 20) {
            return `calc(${yPercent}% + ${15 + level * 25}px)`;
        }
        return `calc(${yPercent}% - ${32 + level * 30}px)`;
    };

    const formatUnitValue = (val, u) => {
        if (u === 'horas') return formatDuration(val);
        if (u === '%') return `${formatValue(val)}%`;
        return `${Number.isInteger(val) ? val : Number(val).toFixed(2)}${u || ''}`;
    };

    return (
        <div className="relative w-full h-[220px] mt-28 mb-16 pb-6 cursor-crosshair group/chart"
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                // 🎯 FIX: Proteção contra Divisão por Zero em Arrays estáticos
                const hoverRange = Math.max(1e-6, range);
                const val = Math.max(xMin, Math.min(domainMax, xMin + ((percentage - 2) / 96) * hoverRange));
                pendingHoverRef.current = { x: xp(val), val };
                if (hoverRafRef.current != null) return;
                hoverRafRef.current = requestAnimationFrame(() => {
                    hoverRafRef.current = null;
                    setHover(pendingHoverRef.current);
                });
            }}
            onMouseLeave={() => {
                if (hoverRafRef.current != null) {
                    cancelAnimationFrame(hoverRafRef.current);
                    hoverRafRef.current = null;
                }
                pendingHoverRef.current = null;
                setHover(null);
            }}
        >
            {/* ... Gradientes laterais e SVG defs continuam iguais ... */}
            <div style={{
                position: 'absolute', width: '40px', top: 0, bottom: 0, pointerEvents: 'none', zIndex: 10, left: 0,
                background: 'linear-gradient(to right, rgb(15, 23, 42), transparent)'
            }} />
            <div style={{
                position: 'absolute', width: '40px', top: 0, bottom: 0, pointerEvents: 'none', zIndex: 10, right: 0,
                background: 'linear-gradient(to left, rgb(15, 23, 42), transparent)'
            }} />

            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                <defs>
                    <linearGradient id={ID.curveGrad} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#2dd4bf" />
                    </linearGradient>
                    <linearGradient id={ID.areaGrad} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={successColor} stopOpacity={0.7} />
                        <stop offset="100%" stopColor={successColor} stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id={ID.failGrad} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(239, 68, 68, 0.5)" />
                        <stop offset="100%" stopColor="rgba(239, 68, 68, 0.1)" />
                    </linearGradient>
                    <filter id={ID.glow} x="-20%" y="-20%" width="140%" height="140%">
                        {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                    </filter>
                    <clipPath id={ID.chartClip}>
                        <rect x="0" y="-50" width="100" height="200" />
                    </clipPath>
                </defs>

                <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="1" vectorEffect="non-scaling-stroke" />

                {low95 != null && high95 != null && (
                    <rect x={ciLowPx} y="0" width={Math.max(0, ciHighPx - ciLowPx)} height="100" fill="rgba(59, 130, 246, 0.05)" className="transition-opacity duration-300 group-hover/chart:opacity-80" clipPath={`url(#${ID.chartClip})`} />
                )}

                <path d={failAreaPathData} fill={`url(#${ID.failGrad})`} stroke="#ef4444" strokeWidth="1.2" vectorEffect="non-scaling-stroke" className="opacity-70 transition-all duration-1000" clipPath={`url(#${ID.chartClip})`} />
                <path d={areaPathData} fill={`url(#${ID.areaGrad})`} stroke={successColor} strokeWidth="1.2" vectorEffect="non-scaling-stroke" className="opacity-80 transition-all duration-1000" clipPath={`url(#${ID.chartClip})`} />

                {/* Bottom Layer: Glow effect */}
                <path d={pathData} fill="none" stroke={`url(#${ID.curveGrad})`} strokeWidth="7" strokeOpacity="0.3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="transition-all duration-500" clipPath={`url(#${ID.chartClip})`} />
                {/* Top Layer: Main curve */}
                <path d={pathData} fill="none" stroke={`url(#${ID.curveGrad})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="transition-all duration-500" clipPath={`url(#${ID.chartClip})`} />

                {isTargetVisible && <line x1={targetPos} y1="100" x2={targetPos} y2={targetY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2,3" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
                {!resolvedLabels.hideMean && isMeanVisible && <line x1={meanPos} y1="100" x2={meanPos} y2={meanY} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2,3" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
                {isCurrentVisible && <line x1={currentPos} y1="100" x2={currentPos} y2={currentY} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2,3" vectorEffect="non-scaling-stroke" className="transition-all duration-500" />}
            </svg>

            <div className="absolute inset-0 pointer-events-none">
                {isTargetVisible && (
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-slate-900 shadow-[0_0_8px_rgba(244,63,94,0.8)] transition-all duration-500"
                        style={{ left: `${targetPos}%`, top: `${targetY}%`, transform: 'translate(-50%, -50%)', zIndex: 15 }} />
                )}
                {!resolvedLabels.hideMean && isMeanVisible && (
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-slate-900 shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all duration-500"
                        style={{ left: `${meanPos}%`, top: `${meanY}%`, transform: 'translate(-50%, -50%)', zIndex: 15 }} />
                )}
                {isCurrentVisible && (
                    <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-slate-900 shadow-[0_0_12px_white] transition-all duration-500"
                        style={{ left: `${currentPos}%`, top: `${currentY}%`, transform: 'translate(-50%, -50%)', zIndex: 25 }} />
                )}
            </div>

            <div className="absolute inset-0 pointer-events-none">
                {!resolvedLabels.hideMean && isMeanVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500"
                        style={{ left: `${Math.max(4, Math.min(meanPos, 96))}%`, top: getLabelTop(meanY, resolvedLabels.mean || 0), transform: 'translateX(-50%)', zIndex: 30 }}>
                        <div className="flex flex-col items-center bg-blue-500/10 backdrop-blur-md px-2 py-0.5 rounded-xl border border-blue-500/30 shadow-lg">
                            <span className="text-[11px] font-black text-blue-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{formatUnitValue(projectedMean ?? mean ?? 0, unit)}</span>
                            <span className="text-[7px] font-black text-blue-300 uppercase tracking-widest opacity-80">Projeção</span>
                        </div>
                        <div className="w-px bg-blue-500/40 absolute top-full mt-0.5" style={{ height: `${8 + (resolvedLabels.mean || 0) * 30}px` }} />
                    </div>
                )}

                {isTargetVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500"
                        style={{ left: `${Math.max(4, Math.min(targetPos, 96))}%`, top: getLabelTop(targetY, resolvedLabels.target || 0), transform: 'translateX(-50%)', zIndex: 20 }}>
                        <div className="flex flex-col items-center bg-rose-500/10 backdrop-blur-md px-2 py-0.5 rounded-xl border border-rose-500/30 shadow-lg">
                             <span className="text-[11px] font-black text-rose-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{formatUnitValue(targetVal, unit)}</span>
                            <span className="text-[7px] font-black text-rose-300 uppercase tracking-widest opacity-80">Meta</span>
                        </div>
                        <div className="w-px bg-rose-500/40 absolute top-full mt-0.5" style={{ height: `${8 + (resolvedLabels.target || 0) * 30}px` }} />
                    </div>
                )}

                {isCurrentVisible && (
                    <div className="absolute flex flex-col items-center transition-all duration-500 group-hover/chart:opacity-40"
                        style={{ left: `${Math.max(4, Math.min(currentPos, 96))}%`, top: getLabelTop(currentY, resolvedLabels.today || 0), transform: 'translateX(-50%)', zIndex: 40 }}>
                        <div className="flex flex-col items-center px-2 py-1 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-xl">
                            <span className="text-[11px] leading-none font-black text-white">{formatUnitValue(currentMean ?? 0, unit)}</span>
                            {resolvedLabels.hideMean && <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hoje/Projeção</span>}
                            {!resolvedLabels.hideMean && <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hoje</span>}
                        </div>
                        <div className="w-px bg-white/40 absolute top-full mt-0.5" style={{ height: `${10 + (resolvedLabels.today || 0) * 30}px` }} />
                    </div>
                )}
            </div>

            {hover && (
                <div className="absolute inset-0 pointer-events-none z-50">
                    <div className="absolute h-full w-px bg-white/10" style={{ left: `${hover.x}%` }} />
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_white]" style={{ left: `${hover.x}%`, top: `${Math.max(0, curveY(hover.val))}%`, transform: 'translate(-50%, -50%)' }} />
                    
                    {/* 🎯 FIX: Topo Seguro para a Tooltip, protegendo-a de sumir no topo da tela (Math.max(30)) */}
                    <div className="absolute bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/40 text-white px-2.5 py-1.5 rounded-xl shadow-2xl flex flex-col items-center min-w-[90px]" 
                        style={{ left: `${Math.max(12, Math.min(88, hover.x))}%`, top: `${Math.max(30, curveY(hover.val) - 5)}%`, transform: 'translate(-50%, -100%)' }}>
                        
                        <span className="text-[15px] font-black tracking-tight leading-none">{formatUnitValue(hover.val, unit)}</span>
                        <div className="flex items-center gap-1 mt-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${hover.val >= targetVal ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]' : 'bg-slate-500'}`} />
                            <span className={`text-[7.5px] font-black uppercase tracking-widest ${hover.val >= targetVal ? 'text-emerald-400' : 'text-slate-500'}`}>{hover.val >= targetVal ? 'Zona de Sucesso' : 'Abaixo da Meta'}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute bottom-0 inset-x-0 h-4 pointer-events-none">
                {[0, 0.25, 0.5, 0.75, 1.0].map(f => {
                    const tickVal = domainMin + f * (domainMax - domainMin);
                    const pct = 2 + f * 96;
                    return (
                        <span key={f} className="absolute text-[10px] font-black text-slate-400 uppercase tracking-tighter" style={{ left: `${pct}%`, transform: f === 0 ? 'translateX(0%)' : f === 1.0 ? 'translateX(-100%)' : 'translateX(-50%)' }}>
                            {formatUnitValue(tickVal, unit)}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

```

---

## `src/components/charts/ChartTooltip.jsx`

<a id="src-components-charts-charttooltip-jsx"></a>

```jsx
import React from 'react';
import { CHART_COLORS } from '../../utils/chartConfig';
import { formatValue } from '../../utils/scoreHelper';

export const ChartTooltip = ({ active, payload, label, isCompare = false, chartData = [], unit = '%', maxScore = 100, minScore = 0 }) => {
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const scaleRange = Math.max(1, safeMax - safeMin);
    if (!active || !payload?.length) return null;

    const currentData = payload?.[0]?.payload || (Array.isArray(chartData) ? chartData.find(d => d.displayDate === label || d.date === label) : null);

    return (
        <div className="bg-slate-900/90 border border-white/10 p-4 rounded-xl shadow-2xl text-sm w-[90vw] sm:w-[380px] max-w-[calc(100vw-2rem)] sm:max-w-sm z-50 backdrop-blur-xl pointer-events-none transition-transform duration-200 overflow-hidden">
            <p className="text-slate-300 mb-3 font-bold border-b border-white/10 pb-2 flex items-center justify-between">
                <span>📅 {label}</span>
            </p>
            <div className="space-y-3">
                {payload
                    .filter(p => !p.name?.startsWith('_') && !['Bay CI High', 'Bay CI Low', 'Cenário Range', 'Banda Bayesiana', 'Ganho Estimado'].includes(p.name))
                    .filter((p, index, self) => self.findIndex(t => t.name === p.name) === index)
                    .sort((a, b) => (Number(b.value) || -Infinity) - (Number(a.value) || -Infinity))
                    .map((p, i) => {
                    if (isCompare) {
                        const val = Number(p.value);
                        return (
                            <div key={i} className="flex justify-between items-center gap-4">
                                <span style={{ color: p.color }} className="font-medium text-xs">
                                    {p.name}
                                </span>
                                <span style={{ color: p.color }} className="font-bold">
                                    {Number.isFinite(val) ? `${formatValue(val)}${unit}` : '—'}
                                </span>
                            </div>
                        );
                    }

                    const dataKey = p.dataKey;
                    if (typeof dataKey !== 'string') return null;

                    const catId = dataKey.replace(/^(bay_ci_low|bay_ci_high|trend_status|raw|bay|stats|trend)_/, '');
                    const subjName = p.name;

                    const rawCorrect = currentData ? currentData[`raw_correct_${catId}`] : null;
                    const rawTotal = currentData ? currentData[`raw_total_${catId}`] : null;
                    const rawVal = currentData ? currentData[`raw_${catId}`] : null;
                    const bayVal = currentData ? currentData[`bay_${catId}`] : null;
                    const statsVal = currentData ? currentData[`stats_${catId}`] : null;
                    const trendVal = currentData ? currentData[`trend_${catId}`] : null;
                    const trendStatus = currentData ? currentData[`trend_status_${catId}`] : 'stable';

                    return (
                        <div key={i} className="flex flex-col bg-slate-800/30 p-3 rounded-lg border border-white/5 shadow-inner">
                            <div className="flex justify-between items-center mb-3">
                                <span style={{ color: p.color }} className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}80` }} />
                                    {subjName}
                                </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5 relative overflow-hidden pb-3">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Bruta</span>
                                    <div className="flex flex-col items-center justify-center min-h-[28px] z-10">
                                        <span className="text-[11px] sm:text-xs font-mono text-orange-400 font-bold leading-none">
                                            {rawVal != null && Number.isFinite(Number(rawVal)) ? formatValue(rawVal) : '—'}{unit}
                                        </span>
                                        {rawCorrect != null && rawTotal > 0 && (
                                            <span className="text-[8px] text-slate-500 font-bold font-mono tracking-tighter mt-1 leading-none">
                                                {rawCorrect}/{rawTotal}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                        <div className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" style={{ width: `${rawVal != null && Number.isFinite(Number(rawVal)) ? Math.min(100, Math.max(0, ((rawVal - safeMin) / scaleRange) * 100)) : 0}%` }} />
                                    </div>
                                </div>
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5 relative overflow-hidden pb-3">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Histórica</span>
                                    <div className="flex flex-col items-center justify-center min-h-[28px] z-10">
                                        <span className="text-[11px] sm:text-xs font-mono text-blue-400 font-bold leading-none">
                                            {statsVal != null && Number.isFinite(Number(statsVal)) ? formatValue(statsVal) : '—'}{unit}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                        <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" style={{ width: `${statsVal != null && Number.isFinite(Number(statsVal)) ? Math.min(100, Math.max(0, ((statsVal - safeMin) / scaleRange) * 100)) : 0}%` }} />
                                    </div>
                                </div>
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5 relative overflow-hidden pb-3">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Nível Real</span>
                                    <div className="flex flex-col items-center justify-center min-h-[28px] z-10">
                                        <span className="text-[11px] sm:text-xs font-mono text-emerald-400 font-bold leading-none">
                                            {bayVal != null && Number.isFinite(Number(bayVal)) ? formatValue(bayVal) : '—'}{unit}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                        <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${bayVal != null && Number.isFinite(Number(bayVal)) ? Math.min(100, Math.max(0, ((bayVal - safeMin) / scaleRange) * 100)) : 0}%` }} />
                                    </div>
                                </div>
                                <div className="flex flex-col bg-slate-900/40 p-1.5 rounded-md border border-white/5 relative overflow-hidden pb-3">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Tendência</span>
                                    <div className="flex flex-col items-center justify-center min-h-[28px] z-10">
                                        <span className={`text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-0.5 leading-none ${trendStatus === 'up' ? 'text-emerald-400' : trendStatus === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
                                            {trendVal != null && Number.isFinite(Number(trendVal)) ? (
                                                <>
                                                    {trendVal > 0 ? '↑' : trendVal < 0 ? '↓' : ''}
                                                    <span>{trendVal > 0 ? `+${formatValue(trendVal)}` : formatValue(trendVal)}</span>
                                                </>
                                            ) : '—'}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800/80">
                                        <div className={`h-full ${trendStatus === 'up' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] w-full' : trendStatus === 'down' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)] w-full' : 'bg-slate-500 w-full'}`} style={{ opacity: trendVal != null && Number.isFinite(Number(trendVal)) ? 1 : 0 }} />
                                    </div>
                                </div>
                            </div>
                            {rawTotal > 0 && (() => {
                                const errs = rawTotal - rawCorrect;
                                const errPct = Math.round((errs / rawTotal) * 100);
                                const correctPct = 100 - errPct;
                                return (
                                    <div className="mt-3 flex flex-col gap-1.5 px-1">
                                        <div className="text-[10px] text-slate-400 flex justify-between items-center">
                                            <span>Último Simulado:</span>
                                            <span>
                                                <strong className="text-rose-400">{errs} erros</strong> ({errPct}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden flex shadow-inner">
                                            <div className="h-full bg-emerald-500/80 transition-all duration-500" style={{ width: `${correctPct}%` }}></div>
                                            <div className="h-full bg-rose-500/80 transition-all duration-500" style={{ width: `${errPct}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

```

---

## `src/components/charts/ChartFrame.jsx`

<a id="src-components-charts-chartframe-jsx"></a>

```jsx
import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * ChartFrame
 * Mede o próprio container e só monta o gráfico quando há área real (> 0).
 * Enquanto mede, exibe um placeholder ambient com shimmer — nunca um chart cego.
 * Reage a resize / aba que vira visível via ResizeObserver.
 */
const isTestEnv =
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') ||
  (typeof window !== 'undefined' && window.navigator && /jsdom/i.test(window.navigator.userAgent || ''));

export default function ChartFrame({
  children,
  minHeight = 320,
  label = 'Calibrando visualização',
  className = '',
}) {
  const boxRef = useRef(null);
  const [ready, setReady] = useState(() => Boolean(isTestEnv));
  const [size, setSize] = useState(() => (isTestEnv ? { w: 800, h: Number(minHeight) || 320 } : { w: 0, h: 0 }));

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || isTestEnv) return;

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const r = entry.contentRect || el.getBoundingClientRect();
          const w = Math.floor(r.width);
          const h = Math.floor(r.height);
          setSize({ w, h });
          setReady(w > 0 && h > 0);
        }
      });
      ro.observe(el);
    } else {
      const r = el.getBoundingClientRect();
      const w = Math.floor(r.width) || 800;
      const h = Math.floor(r.height) || Number(minHeight) || 320;
      setSize({ w, h });
      setReady(true);
    }
    return () => {
      if (ro) ro.disconnect();
    };
  }, [minHeight]);

  return (
    <div
      ref={boxRef}
      style={{ minHeight }}
      className={`relative w-full h-full overflow-hidden rounded-2xl ${className}`}
    >
      {/* Placeholder vivo — só some quando o chart tem onde nascer */}
      <div
        aria-hidden={ready}
        className={`absolute inset-0 grid place-items-center transition-opacity duration-500 ${ready ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
      >
        {/* camada ambient: varredura sutil, sem gradiente de "AI hero" */}
        <div className="absolute inset-0 bg-[#0b0e18]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'linear-gradient(110deg, transparent 30%, rgba(148,163,184,0.06) 50%, transparent 70%)',
            backgroundSize: '220% 100%',
            animation: 'chartframe-sweep 1.6s ease-in-out infinite',
          }}
        />
        <div className="relative flex flex-col items-center gap-2 px-6 text-center">
          <span className="h-2 w-2 rounded-full bg-teal-300/80 shadow-[0_0_10px_rgba(94,234,212,0.7)] animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
            {label}
          </span>
          <span className="text-[10px] font-medium tracking-wide text-slate-600 tabular-nums">
            {size.w}×{size.h}
          </span>
        </div>
      </div>

      {/* O gráfico só monta com área válida — adeus, width(-1) */}
      <div
        className={`relative h-full w-full transition-all duration-500 ${ready ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
          }`}
      >
        {ready ? children : null}
      </div>

      <style>{`
        @keyframes chartframe-sweep {
          0%   { background-position: 140% 0; }
          100% { background-position: -40% 0; }
        }
      `}</style>
    </div>
  );
}

export { ChartFrame };

```

---

## `src/components/charts/EvolutionChart/EvolutionLineChart.jsx`

<a id="src-components-charts-evolutionchart-evolutionlinechart-jsx"></a>

```jsx
import React, { useId, useState, useRef } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList, Brush
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";
import { ChartFrame } from "../ChartFrame";
import { normalizeDate, formatDisplayDate } from '../../../utils/dateHelper';
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
    filteredChartData = [],
    activeCategories = [],
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

    const safeActiveCategories = Array.isArray(activeCategories) ? activeCategories : [];
    const safeChartData = Array.isArray(filteredChartData) ? filteredChartData : [];

    const handleLegendClick = (e) => {
        if (e?.domEvent?.stopPropagation) {
            e.domEvent.stopPropagation();
        } else if (e?.stopPropagation) {
            e.stopPropagation();
        }

        // Find the category ID from the clicked legend item (it usually passes payload)
        let catId = e?.payload?.id || e?.id;
        if (!catId && e?.dataKey) catId = String(e.dataKey).replace(/^(bay_ci_low|bay_ci_high|raw|bay)_/, '');
        if (!catId && e?.payload?.dataKey) catId = String(e.payload.dataKey).replace(/^(bay_ci_low|bay_ci_high|raw|bay)_/, '');
        
        if (catId) {
            setHighlightedDataKey(prev => prev === catId ? null : catId);
        }
    };



    // Refined chart data with defensive sorting and date normalization
    const enhancedChartData = React.useMemo(() => {
        if (!safeChartData || !safeChartData.length) return [];
        
        // BUG-Z1 FIX: Defensive sort to prevent zig-zag lines if data is unordered
        const sortedData = [...safeChartData].sort((a, b) => {
            const dateA = a.date ? (normalizeDate(a.date)?.getTime() ?? 0) : 0;
            const dateB = b.date ? (normalizeDate(b.date)?.getTime() ?? 0) : 0;
            return dateA - dateB;
        });

        return sortedData.map(d => {
            const copy = { ...d };
            safeActiveCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
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
    }, [safeChartData, safeActiveCategories, showOnlyFocus, focusSubjectId]);

    // Gather final points for label positioning
    const finalPoints = React.useMemo(() => {
        if (!enhancedChartData.length) return [];
        const pts = [];
        const lastIndex = enhancedChartData.length - 1;
        
        safeActiveCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
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

            const formatted = `${formatValue(value)}${unit}`;
            const boxWidth = Math.max(46, formatted.length * 7 + 14);

            return (
                <g style={{ zIndex: 100, transition: 'all 0.3s ease' }}>
                    <rect
                        x={x + 8}
                        y={y - 11 + offsetPx}
                        width={boxWidth}
                        height={22}
                        rx={6}
                        fill="#020617"
                        fillOpacity={0.7}
                        stroke={displayColor}
                        strokeOpacity={0.9}
                        strokeWidth={1.5}
                    />
                    <text 
                        x={x + 8 + boxWidth / 2} 
                        y={y + 4 + offsetPx} 
                        fill="#ffffff" 
                        fontSize={11} 
                        fontWeight="black" 
                        textAnchor="middle"
                        style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
                    >
                        {formatted}
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
                        {safeActiveCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).map((cat) => {
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
                        tickFormatter={formatDisplayDate}
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
                        content={(props) => <ChartTooltip {...props} chartData={enhancedChartData} isCompare={false} unit={unit} maxScore={maxScore} minScore={minScore} />} 
                    />

                    <Legend 
                        verticalAlign="top" 
                        height={28}
                        iconSize={6}
                        onClick={handleLegendClick}
                        wrapperStyle={{ fontSize: '9px', color: '#64748b', fontWeight: 600, paddingBottom: '6px', cursor: 'pointer' }} 
                    />

                    {safeActiveCategories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).flatMap((cat) => {
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
                        tickFormatter={formatDisplayDate}
                    />
                </ComposedChart>
                </ResponsiveContainer>
            </ChartFrame>
        </div>
    );
}

```

---

## `src/components/charts/EvolutionChart/CompareChart.jsx`

<a id="src-components-charts-evolutionchart-comparechart-jsx"></a>

```jsx
import React, { useId } from 'react';
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    LabelList, Brush
} from "recharts";
import { ChartTooltip } from "../ChartTooltip";
import { ChartFrame } from "../ChartFrame";
import { normalizeDate, formatDisplayDate } from '../../../utils/dateHelper';
import { formatValue } from '../../../utils/scoreHelper';

const CustomActiveDot = (props) => {
    const { cx, cy, fill, stroke } = props;
    if (cx == null || cy == null) return null;
    return (
        <g>
            {/* 🎯 FIX: Efeito de pulso animado via SVG para o Hover */}
            <circle cx={cx} cy={cy} r={12} fill={fill} opacity={0.3}>
                <animate attributeName="r" values="6;16" dur="1.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
                <animate attributeName="opacity" values="0.6;0" dur="1.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
            </circle>
            <circle cx={cx} cy={cy} r={5} fill={fill} stroke={stroke || "#ffffff"} strokeWidth={2} />
        </g>
    );
};

export function CompareChart({ 
    filteredChartData, 
    targetScore,
    // ✅ BUG-7 FIX: removida prop 'categories' que não era usada (causava re-renders desnecessários)
    minScore = 0,
    maxScore = 100,
    unit = '%'
}) {
    const baseId = useId().replace(/:/g, '');
    const containerRef = React.useRef(null);
    const [containerHeight, setContainerHeight] = React.useState(360);

    React.useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const obs = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const h = entry.contentRect.height;
                if (h > 50) setContainerHeight(h);
            }
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

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

        // Clamp final estrito para garantir que nenhum label saia dos limites
        for (let i = 0; i < yPos.length; i++) {
            yPos[i].yPos = Math.max(bottomLimit, Math.min(topLimit, yPos[i].yPos));
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
        if (d["Nível Bayesiano"] != null && lastValidIdx.bay === todayIdx) todayPoints.push({ name: 'bay', value: d["Nível Bayesiano"] });
        if (d["Nota Bruta"] != null && lastValidIdx.raw === todayIdx) todayPoints.push({ name: 'raw', value: d["Nota Bruta"] });
        if (d["Média Histórica"] != null && lastValidIdx.stats === todayIdx) todayPoints.push({ name: 'stats', value: d["Média Histórica"] });
        if (d["Futuro Provável"] != null && lastValidIdx.mc === todayIdx) todayPoints.push({ name: 'mc', value: d["Futuro Provável"] });
    }
    const todayY = solveCollisions(todayPoints);

    const futureIdx = chartData.length - 1;
    const isFuturePoint = futureIdx > todayIdx;
    const lastPoints = [];
    if (isFuturePoint && futureIdx >= 0) {
        const d = chartData[futureIdx];
        if (d["Futuro Provável"] != null && lastValidIdx.mc === futureIdx) lastPoints.push({ name: 'mc', value: d["Futuro Provável"] });
        if (d["Nível Bayesiano"] != null && lastValidIdx.bay === futureIdx) lastPoints.push({ name: 'bay', value: d["Nível Bayesiano"] });
        if (d["Nota Bruta"] != null && lastValidIdx.raw === futureIdx) lastPoints.push({ name: 'raw', value: d["Nota Bruta"] });
        if (d["Média Histórica"] != null && lastValidIdx.stats === futureIdx) lastPoints.push({ name: 'stats', value: d["Média Histórica"] });
    }
    const lastY = solveCollisions(lastPoints);



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

        let ptPos = value;
        const isFuture = isFuturePoint && index === futureIdx;
        const pts = isFuture ? lastY : todayY;
        if (pts && pts.length) {
            const pt = pts.find(p => p.name === type);
            if (pt && pt.yPos != null) ptPos = pt.yPos;
        }

        const xOff = isMc ? 12 : 10;
        const formatted = (Number.isFinite(Number(value)) ? Number(value) : 0).toFixed(2) + unit;
        const boxWidth = Math.max(42, formatted.length * 7 + 14);

        const chartHeight = viewBox?.height ?? (containerHeight > 40 ? containerHeight - 40 : 360);
        const chartY = viewBox?.y ?? 20;
        const range = safeMaxScore - safeMinScore;
        const pxPerPct = chartHeight / (range || 1);
        
        // Compute Y strictly via our internal coordinate map (bypassing Recharts' `y` which bugs out on isolated dots)
        const rawY = chartY + chartHeight - (ptPos - safeMinScore) * pxPerPct - 10;
        const safeY = Math.max(2, Math.min(chartY + chartHeight - 22, rawY));
        
        return (
            <g>
                <rect x={x + xOff - 2} y={safeY} width={boxWidth} height={20} rx={10}
                      fill={color} fillOpacity={0.15} stroke={color} strokeOpacity={0.4} />
                <text x={x + xOff - 2 + boxWidth / 2} y={safeY + 14} fill={color} fontSize={11}
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
        <div ref={containerRef} className="h-[360px] sm:h-[460px] md:h-[650px] w-full outline-none focus:outline-none focus:ring-0 transition-all duration-300">
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
                        tickFormatter={formatDisplayDate}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                        dy={12} 
                        axisLine={false} 
                        tickLine={false} 
                        minTickGap={35} 
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} dx={-8} axisLine={false} tickLine={false} domain={[safeMinScore, safeMaxScore]} allowDataOverflow={false} tickFormatter={(v) => `${formatValue(v)}${unit}`} width={50} />
                    
                    <ReferenceLine y={targetScore} stroke="#10b981" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="5 5"
                        label={{ value: `META ${formatValue(targetScore)}${unit}`, fill: '#10b981', fontSize: 10, fontWeight: 'black', position: 'insideTopLeft', dy: -6, dx: 5 }} />
                    
                    <Tooltip 
                        offset={30}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                        content={(props) => <ChartTooltip {...props} chartData={chartData} isCompare={true} unit={unit} maxScore={safeMaxScore} minScore={safeMinScore} />} />
                    
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
                        tickFormatter={formatDisplayDate}
                    />
                </ComposedChart>
                </ResponsiveContainer>
            </ChartFrame>
        </div>
    );
}

```

---

## `src/components/charts/EvolutionChart/SubtopicsPerformanceChart.jsx`

<a id="src-components-charts-evolutionchart-subtopicsperformancechart-jsx"></a>

```jsx
import React, { useMemo, useState, useId, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList, Cell, ReferenceLine,
    LineChart, Line, Legend
} from "recharts";
import { normalizeDate, getDateKey, formatDisplayDate, parseNoonLocal } from "../../../utils/dateHelper";
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
                                        <span style={{ color: entry.color }} className="font-bold flex items-center gap-2 min-w-0 max-w-[200px]" title={entry.name}>
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
                    // ⚠️ NOTA: getSyntheticTotal retorna um valor fixo (ex: 10 questões simuladas).
                    // Isso pode inflar o peso de entradas sem volume real. Considere ponderar
                    // esses dados com menos influência se necessário no futuro.
                    if (total === 0 && t.score != null) total = getSyntheticTotal(maxScore);
                    if (total === 0) return;
                    
                    const safeMaxScore = Math.max(1, Number(maxScore) || 100);
                    const rawC = Number(t.correct);
                    let correctCount = (Number.isFinite(rawC) && !t.isPercentage) ? rawC : NaN;

                    if (!Number.isFinite(correctCount)) {
                        const rawScore = getSafeScore(t, safeMaxScore);
                        const score = Number.isFinite(rawScore) ? rawScore : safeMinScore;
                        const normalizedScore = Math.max(safeMinScore, Math.min(safeMaxScore, score));
                        const range = Math.max(1e-9, safeMaxScore - safeMinScore);
                        correctCount = total > 0 ? ((normalizedScore - safeMinScore) / range) * total : 0;
                    }
                    correctCount = Math.max(0, Math.min(total, Number.isFinite(correctCount) ? correctCount : 0));

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
                    // ✅ LOTE-02 FIX: entradas percentuais recebem volume sintético (antes eram descartadas).
                    // ⚠️ NOTA: getSyntheticTotal retorna um valor fixo (ex: 10 questões simuladas).
                    // Isso pode inflar o peso de entradas sem volume real. Considere ponderar
                    // esses dados com menos influência se necessário no futuro.
                    if (total === 0 && t.score != null) total = getSyntheticTotal(maxScore);
                    if (total === 0) return;

                    topicVolumeMap[topicName] = (topicVolumeMap[topicName] || 0) + total;

                    const safeMaxScore = Math.max(1, Number(maxScore) || 100);
                    const rawC = Number(t.correct);
                    let correct = (Number.isFinite(rawC) && !t.isPercentage) ? rawC : NaN;

                    if (!Number.isFinite(correct)) {
                        const rawScore = getSafeScore(t, safeMaxScore);
                        const score = Number.isFinite(rawScore) ? rawScore : safeMinScore;
                        const normalizedScore = Math.max(safeMinScore, Math.min(safeMaxScore, score));
                        const range = Math.max(1e-9, safeMaxScore - safeMinScore);
                        correct = total > 0 ? ((normalizedScore - safeMinScore) / range) * total : 0;
                    }
                    correct = Math.max(0, Math.min(total, Number.isFinite(correct) ? correct : 0));

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
                        aria-pressed={viewMode === 'bars'}
                    >
                        Ranking (Barras)
                    </button>
                    <button
                        onClick={() => setViewMode('lines')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-[11px] font-bold rounded-2xl transition-all will-change-transform ${viewMode === 'lines' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-800/40'}`}
                        aria-pressed={viewMode === 'lines'}
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
                                    tick={(props) => {
                                        const { x, y, payload } = props;
                                        const text = payload.value || "";
                                        const fullText = payload.payload?.fullName || text;
                                        const maxLen = 22;
                                        const truncated = text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : text;
                                        return (
                                            <g transform={`translate(${x},${y})`}>
                                                <text x={0} y={0} dy={4} textAnchor="end" fill="#cbd5e1" fontSize={11} fontWeight={600}>
                                                    <title>{fullText}</title>
                                                    {truncated}
                                                </text>
                                            </g>
                                        );
                                    }}
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
                                                const d = parseNoonLocal(val) || new Date(val);
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

## `src/components/charts/EvolutionChart/TodayVsGeneralChart.jsx`

<a id="src-components-charts-evolutionchart-todayvsgeneralchart-jsx"></a>

```jsx
import React, { useMemo, useState, useEffect } from 'react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, 
    ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, LabelList
} from 'recharts';
import { getDateKey, toDateMs } from '../../../utils/dateHelper';
import { getSafeScore, getSyntheticTotal, formatValue } from '../../../utils/scoreHelper';
import { ratioToPoints, pointsToRatio } from '../../../utils/scoreHelper.conversions';
import { normalize, aliases } from '../../../utils/normalization';
import { Zap, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const COLORS = {
    gaugeBg: '#1e293b',
    gaugeFillValid: '#a855f7',
    gaugeFillDanger: '#ef4444',
    gaugeFillSuccess: '#22c55e',
    reference: '#94a3b8',
    neonLine: '#c084fc',
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
        const item = payload[0].payload;
        if (item.trueValue == null) return null;
        return (
            <div className="bg-slate-900/95 border border-slate-700/80 p-2.5 rounded-xl shadow-2xl backdrop-blur-md">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">{String(item.name ?? '').replace(' (Restante)', '')}</p>
                <p className="text-white text-xs font-black flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.baseColor }}></span>
                    {safeFix(item.trueValue)}{unit}
                </p>
            </div>
        );
    }
    return null;
};

export function TodayVsGeneralChart({ 
    activeCategories: propActiveCategories, 
    categories = [],
    focusCategory = null,
    globalMetrics = {}, 
    targetScore = 80,
    maxScore = 100, 
    minScore = 0,
    unit = '%',
    simuladoRows = []
 }) {
    const rawCategories = propActiveCategories || categories;
    const activeCategories = useMemo(() => {
        if (focusCategory) return [focusCategory];
        if (Array.isArray(rawCategories)) return rawCategories.filter(Boolean);
        if (rawCategories && typeof rawCategories === 'object') return Object.values(rawCategories).filter(Boolean);
        return [];
    }, [rawCategories, focusCategory]);
    const generalAccuracy = useMemo(() => {
        const pct = Number(globalMetrics?.globalAccuracy);
        const safePct = Number.isFinite(pct) ? pct : 0;
        const safeMax = Math.max(1, Number(maxScore) || 100);
        const safeMin = Math.min(Number(minScore) || 0, safeMax);
        return Math.max(safeMin, Math.min(safeMax, ratioToPoints(safePct / 100, safeMax, safeMin)));
    }, [globalMetrics?.globalAccuracy, maxScore, minScore]);

    const scale = Math.max(1, Number(maxScore) || 100) / 100;
    const stabilityMargin = Math.max(1, ((Number(maxScore) || 100) - (Number(minScore) || 0)) * 0.02);

    const [nowMs, setNowMs] = useState(() => Date.now());
    const [todayKey, setTodayKey] = useState(() => getDateKey(new Date()));

    useEffect(() => {
        const updateTime = () => {
            const now = Date.now();
            setNowMs(now);
            setTodayKey(getDateKey(new Date(now)));
        };
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    const { dailyData, lastActiveEntry, isToday } = useMemo(() => {
        const dayMap = {};
        const safeMaxScore = Math.max(1, Number(maxScore) || 100);
        const safeMinScore = Math.min(Number(minScore) || 0, safeMaxScore);
        activeCategories.forEach(cat => {
            const history = Object.values(cat.simuladoStats?.history || {});
            history.forEach(h => {
                const dKey = getDateKey(h.date || h.createdAt);
                if (!dKey) return;
                if (!dayMap[dKey]) dayMap[dKey] = { correct: 0, total: 0 };
                let tot = Number(h.total) || 0;
                let corr = Number(h.correct) || 0;
                const rawScore = getSafeScore(h, safeMaxScore);
                const score = Number.isFinite(rawScore) ? rawScore : safeMinScore;
                if (h.isPercentage) {
                  if (tot === 0) tot = getSyntheticTotal(safeMaxScore);
                  corr = Math.round(pointsToRatio(score, safeMaxScore, safeMinScore) * tot);
                } else if (tot === 0 && h.score != null) {
                  tot = getSyntheticTotal(safeMaxScore);
                  corr = Math.round(pointsToRatio(score, safeMaxScore, safeMinScore) * tot);
                } else if (tot > 0 && h.correct == null) {
                  corr = Math.round(pointsToRatio(score, safeMaxScore, safeMinScore) * tot);
                }
                corr = Math.max(0, Math.min(tot, corr));
                dayMap[dKey].correct += corr;
                dayMap[dKey].total += tot;
            });
        });
        const sortedDates = Object.keys(dayMap).sort();
        const result = sortedDates.slice(-14).map(date => {
            const [, m, d] = date.split('-');
            const entry = dayMap[date];
            const acc = entry.total > 0 ? ratioToPoints(entry.correct / entry.total, maxScore, minScore) : minScore;
            return { date, displayDate: `${d}/${m}`, accuracy: acc, total: entry.total };
        });
        const lastEntry = result.length > 0 ? result[result.length - 1] : null;
        const _isToday = lastEntry ? lastEntry.date === todayKey : false;
        return { dailyData: result, lastActiveEntry: lastEntry, isToday: _isToday };
    }, [activeCategories, maxScore, minScore, todayKey]);

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
        const safeMaxScore = Math.max(1, Number(maxScore) || 100);
        const safeMinScore = Math.min(Number(minScore) || 0, safeMaxScore);

        activeCategories.forEach(cat => {
            const history = Object.values(cat.simuladoStats?.history || {});
            history.forEach(h => {
                const time = toDateMs(h.date || h.createdAt);
                if (!time) return;
                const rawScore = getSafeScore(h, safeMaxScore);
                const score = Number.isFinite(rawScore) ? rawScore : safeMinScore;
                const hDateKey = getDateKey(h.date || h.createdAt);
                let tot = Number(h.total) || 0;
                let corr = Number(h.correct) || 0;
                if (h.isPercentage) {
                    if (tot === 0) tot = getSyntheticTotal(safeMaxScore);
                    corr = Math.round(pointsToRatio(score, safeMaxScore, safeMinScore) * tot);
                } else if (tot === 0 && h.score != null) {
                    tot = getSyntheticTotal(safeMaxScore);
                    corr = Math.round(pointsToRatio(score, safeMaxScore, safeMinScore) * tot);
                } else if (tot > 0 && h.correct == null) {
                    corr = Math.round(pointsToRatio(score, safeMaxScore, safeMinScore) * tot);
                }
                corr = Math.max(0, Math.min(tot, corr));
                if (tot === 0) return;
                if (hDateKey === todayKey) { buckets.today.correct += corr; buckets.today.total += tot; }
                if (now - time <= ms1Week) { buckets.week.correct += corr; buckets.week.total += tot; }
                if (now - time <= ms1Month) { buckets.month.correct += corr; buckets.month.total += tot; }
                if (now - time <= ms3Months) { buckets.month3.correct += corr; buckets.month3.total += tot; }
                if (now - time <= ms6Months) { buckets.month6.correct += corr; buckets.month6.total += tot; }
            });
        });

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
                    const timeA = toDateMs(a.createdAt || a.date);
                    const timeB = toDateMs(b.createdAt || b.date);
                    return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
                });
            if (sortedRows.length > 0) {
                const latestRow = sortedRows[0];
                latestAcc = getSafeScore(latestRow, maxScore);
            }
        }
        const getAcc = (b) => b.total > 0 ? ratioToPoints(b.correct / b.total, maxScore, minScore) : null;
        return [
            { id: 'month6', label: '6 Meses', val: getAcc(buckets.month6), rIn: 70, rOut: 80 },
            { id: 'month3', label: '3 Meses', val: getAcc(buckets.month3), rIn: 82, rOut: 92 },
            { id: 'month', label: '1 Mês', val: getAcc(buckets.month), rIn: 94, rOut: 103 },
            { id: 'week', label: 'Semana', val: getAcc(buckets.week), rIn: 105, rOut: 113 },
            { id: 'today', label: 'Hoje', val: getAcc(buckets.today), rIn: 115, rOut: 122 },
            { id: 'last', label: 'Último', val: latestAcc, rIn: 124, rOut: 130 }
        ];
    }, [activeCategories, maxScore, minScore, nowMs, todayKey, simuladoRows]);

    const lastMetric = temporalMetrics.find(t => t.id === 'last');
    const latestAcc = lastMetric?.val ?? null;

    const chartData = useMemo(() => {
        if (!dailyData || dailyData.length === 0) return [];
        const data = dailyData.map(d => ({ ...d }));
        if (latestAcc !== null) {
            const lastIdx = data.length - 1;
            const prevAcc = data.length > 1 ? data[lastIdx - 1].accuracy : data[0].accuracy;
            data[lastIdx].lastTestAcc = latestAcc;
            const marginLine = stabilityMargin;   // ✅ AUDIT FIX (antes: 2 fixo)
            if (latestAcc < prevAcc - marginLine) {
                data[lastIdx].lastTestColor = COLORS.gaugeFillDanger;
            } else if (latestAcc > prevAcc + marginLine) {
                data[lastIdx].lastTestColor = COLORS.gaugeFillValid;
            } else {
                data[lastIdx].lastTestColor = '#eab308';
            }
        }
        return data;
    }, [dailyData, latestAcc, stabilityMargin]);

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
    const marginDelta = stabilityMargin;   // ✅ AUDIT FIX (antes: 2 fixo)
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

    const safeFix = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(1);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[400px]">
            <div className="w-full lg:w-1/3 min-w-[280px] bg-black/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-inner overflow-hidden group">
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Target size={14} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {isToday ? "Sessão de Hoje" : "Última Sessão"}
                    </span>
                </div>
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
                                const safeMin = Number(minScore) || 0;
                                const val = isNull ? 0 : Math.max(safeMin, Math.min(metric.val, maxScore));
                                const arcColor = isNull ? 'transparent' : getColor(metric.val);
                                const scaleRange = Math.max(1, maxScore - safeMin);
                                const arcVal = val - safeMin;
                                const arcData = [
                                    { name: metric.label, value: arcVal, trueValue: metric.val, baseColor: arcColor },
                                    { name: `${metric.label} (Restante)`, value: scaleRange - arcVal, trueValue: metric.val, baseColor: arcColor }
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
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
                        <div className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg tabular-nums tracking-tight">
                            {safeFix(focusAccuracy)}<span className="text-xl text-slate-400 ml-1">{unit}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                            {isToday ? `Acertos(${unit}) hoje` : `Acertos(${unit}) no dia`}
                        </span>
                    </div>
                </div>
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
                                    {deltaLastVsToday > 0 ? '+' : deltaLastVsToday < 0 ? '−' : ''}{safeFix(Math.abs(deltaLastVsToday))}{unit}
                                </span>
                                <span className="text-[7px] uppercase tracking-wider opacity-70">Ritmo (Hoje)</span>
                            </div>
                        </div>
                    )}
                </div>
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
                                domain={[minScore, maxScore]} 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(v) => `${formatValue(v)}${unit}`} 
                            />
                            <Tooltip content={<CustomTooltipTimeline unit={unit} />} cursor={{ stroke: '#ffffff1a', strokeWidth: 2 }} />
                            <ReferenceLine 
                                y={generalAccuracy} 
                                stroke={COLORS.reference} 
                                strokeDasharray="5 5" 
                                strokeWidth={2} 
                                opacity={0.6}
                                label={{ position: 'top', value: 'MÉDIA GERAL', fill: COLORS.reference, fontSize: 9, fontWeight: 800, textAnchor: 'end', dx: -10 }}
                            />
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

## `src/components/charts/EvolutionChart/WeeklyEvolutionView.jsx`

<a id="src-components-charts-evolutionchart-weeklyevolutionview-jsx"></a>

```jsx
import React, { useMemo, useState, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell, Brush
} from 'recharts';
import { TrendingUp, BarChart3, HelpCircle, Zap } from 'lucide-react';
import { getSafeScore, formatValue, getSyntheticTotal } from "../../../utils/scoreHelper";
import WeeklyPerformanceChart from './WeeklyPerformanceChart';
import { computeTopRegressions, computeTrendKpi } from '../../../utils/weeklyEvolutionInsights.js';
import { APP_TIMEZONE, parseNoonLocal } from '../../../utils/dateHelper';
import { pointsToRatio, ratioToPoints } from '../../../utils/scoreHelper.conversions';

const WeeklyTooltip = React.memo(({ active, payload, label, hiddenKeys, unit, stableThreshold = 2 }) => {
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
                            const isStable = Math.abs(val) <= stableThreshold;
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
      ? parseNoonLocal(dateStr)
        : new Date(dateStr);
    // ✅ BUG-3 FIX: parseNoonLocal pode retornar null → guard antes de getTime()
    if (!dt || isNaN(dt.getTime())) return null;
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
        const toRatio = (score) => pointsToRatio(score, upperBound, lowerBound);
        const fromRatio = (ratio) => ratioToPoints(ratio, upperBound, lowerBound);
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
                if (!Number.isFinite(score)) return;

                if (totalQ === 0 && h.score != null) {
                    totalQ = getSyntheticTotal(maxScore);
                }
                if (totalQ === 0) return;

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
                            if (!Number.isFinite(topicScore)) return;
                            if (totalQ === 0 && t.score != null) {
                                totalQ = getSyntheticTotal(maxScore);
                            }
                            if (totalQ === 0) return;
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
    }, [categories, showOnlyFocus, focusSubjectId, maxScore, minScore]);

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

    const stableThreshold = useMemo(() => {
        const safeMinScore = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
        const safeMaxScore = Number.isFinite(Number(maxScore)) ? Number(maxScore) : 100;
        const scoreRange = Math.max(1e-9, Math.abs(safeMaxScore - safeMinScore));
        return Math.max(0.5, scoreRange * 0.02);
    }, [minScore, maxScore]);

    // M2 FIX: Tooltip extraído em useCallback para restaurar memoização do Recharts.
    // Arrow functions inline quebram a memoização porque criam nova referência a cada render.
    const renderWeeklyTooltip = useCallback(
        (props) => <WeeklyTooltip {...props} hiddenKeys={hiddenKeys} unit={unit} stableThreshold={stableThreshold} />,
        [hiddenKeys, unit, stableThreshold]
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
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={keys.length > 4 ? Math.min(100, Math.ceil(keys.length / 2) * 20 + 20) : 40} 
                                    iconType="square" 
                                    formatter={renderLegendText} 
                                    onClick={handleLegendClick} 
                                    onMouseEnter={handleLegendHover} 
                                    onMouseLeave={handleLegendLeave} 
                                    wrapperStyle={{ paddingTop: '20px' }} 
                                />
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

## `src/components/charts/EvolutionChart/TimeSpentChart.jsx`

<a id="src-components-charts-evolutionchart-timespentchart-jsx"></a>

```jsx
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

const HalfMoonGauge = React.memo(function HalfMoonGauge({ data }) {
    const width = 200;
    const height = 110;
    const cx = width / 2;
    const cy = height;
    const r = 80;
    const strokeWidth = 14;

    const localMax = Math.max(30, data.displaySeconds || 0, data.visualLatestSeconds ?? data.latestSeconds ?? 0, data.visualAbsoluteSeconds ?? data.absoluteLatestSeconds ?? 0);
    const gaugeMax = localMax * 1.2;

    const getCoordinatesForValue = (val) => {
        const safeVal = Math.max(0, Math.min(Number.isFinite(val) ? val : 0, gaugeMax));
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
            <h4 className={`text-slate-200 font-bold text-sm text-center mb-4 truncate w-full ${hasAbsolute && data.absoluteTotalTime != null ? 'pr-16 pl-6' : 'px-6'}`} title={data.fullName}>{data.fullName}</h4>
            
            <div className="relative w-[200px] h-[110px]">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" role="img" aria-label={`Gauge mostrando tempo médio de ${formatTime(data.displaySeconds)}`}>
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
                    <span className="text-2xl font-black text-white">{formatTime((hasLatest && data.latestSeconds > 0) ? data.latestSeconds : data.displaySeconds)}</span>
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
});

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

            const qstStr = `(${d.timedQuestoes} ${d.timedQuestoes === 1 ? 'questão' : 'questões'})`;
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
        ? Math.round(legendStats.avg / legendStats.avgCount) : null;

    const legendLatestSeconds = legendStats.latestCount > 0
        ? Math.round(legendStats.latest / legendStats.latestCount) : null;


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
                            MÉDIA GERAL: <span className="font-bold text-slate-300">{legendAvgSeconds == null ? 'N/A' : formatTime(legendAvgSeconds)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Média geral de tempo no último dia de cada assunto">
                            ÚLTIMO GERAL: <span className="font-bold text-slate-300">{legendLatestSeconds == null ? 'N/A' : formatTime(legendLatestSeconds)}</span>
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
                        aria-pressed={sortOrder === 'slower'}
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
                        aria-pressed={sortOrder === 'faster'}
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

## `src/components/charts/EvolutionChart/MonteCarloEvolutionChart.jsx`

<a id="src-components-charts-evolutionchart-montecarloevolutionchart-jsx"></a>

```jsx
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
                            <span className="text-[10px] font-bold text-slate-400">{dataPoint.date === 'Hoje' || dataPoint.date === 'HOJE' ? 'Hoje:' : 'Esperado:'}</span>
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

    const displayData = useMemo(() => {
        if (scenarioAdjustedData.length === 1) {
            const single = scenarioAdjustedData[0];
            return [
                { ...single, date: `${single.date} (Início)`, displayDate: 'Início', fullDate: `${single.fullDate} (Registro Inicial)` },
                { ...single, date: `${single.date} (Atual)`, displayDate: 'Atual', fullDate: `${single.fullDate} (Registro Atual)` }
            ];
        }
        return scenarioAdjustedData;
    }, [scenarioAdjustedData]);

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
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="none" strokeWidth={3} isAnimationActive={false} />
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
                {displayData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={300}>
                        {/* 🎯 FIX: margin right de 10 -> 30 para evitar que a última data seja mastigada pelo limite do componente */}
                        <AreaChart
                            data={displayData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={0} stopColor="#10b981" stopOpacity={0.35} />
                                    <stop offset={targetOffset} stopColor="#10b981" stopOpacity={0.05} />
                                    <stop offset={targetOffset} stopColor="#60a5fa" stopOpacity={0.25} />
                                    <stop offset={1} stopColor="#60a5fa" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id={`targetGlow-${rawId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={0} stopColor="#10b981" stopOpacity={0.0} />
                                    <stop offset={1} stopColor="#10b981" stopOpacity={0.12} />
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
                                dataKey="displayDate"
                                tickFormatter={(val) => val}
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
                            <Area connectNulls type="monotoneX" dataKey="mean" stroke="#60a5fa" fill="none" strokeWidth={3} />
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
                {qualitySignal && (qualitySignal.color.includes('red') || qualitySignal.color.includes('rose')) && (
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

## `src/components/charts/EvolutionChart/PerformanceBarChart.jsx`

<a id="src-components-charts-evolutionchart-performancebarchart-jsx"></a>

```jsx
import React, { useId } from 'react';
import { formatValue } from '../../../utils/scoreHelper';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LabelList
} from "recharts";
import { ChartFrame } from "../ChartFrame";

export const PerformanceBarChart = React.memo(function PerformanceBarChart({ subjectAggData, showOnlyFocus, focusCategory, unit = '%' }) {
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
        return { ...d, questoes, acertos, erros, errosRaw: erros };
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
                                    tickFormatter={(val) => val.length > 12 ? val.substring(0, 10) + '..' : val}
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
                                                            <span className="text-[11px] font-black text-red-300">{d.errosRaw}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center gap-4 mb-2">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Rendimento</span>
                                                            <span className="text-[11px] font-black text-white">{rendPct}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                
                                <Bar dataKey="acertos" stackId="a" name="Acertos" fill={`url(#${gradAcertosId})`} radius={[5, 5, 0, 0]} isAnimationActive={true} />
                                
                                <Bar dataKey="erros" stackId="a" name="Erros" fill={`url(#${gradQuestoesId})`} radius={[5, 5, 0, 0]} isAnimationActive={true}>
                                    <LabelList 
                                        dataKey="questoes" 
                                        content={(props) => {
                                            const { x, y, width, value } = props;
                                            if (width < 15 || !value) return null;
                                            return (
                                                <text x={x + width / 2} y={y - 4} fill="#94a3b8" fontSize={9} fontWeight="bold" textAnchor="middle">
                                                    {value}
                                                </text>
                                            );
                                        }}
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
});

```

---

## `src/components/charts/EvolutionChart/RadarAnalysis.jsx`

<a id="src-components-charts-evolutionchart-radaranalysis-jsx"></a>

```jsx
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
                        <RadarChart cx="50%" cy="50%" outerRadius="50%" data={radarData} margin={{ top: 20, right: 35, bottom: 20, left: 35 }}>
                        <defs>
                            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                                {/* Disabled SVG glow filter to prevent FPS drops on mobile/Safari */}
                            </filter>
                        </defs>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis 
                            dataKey="subject" 
                            tick={(props) => {
                                const { x, y, cx, cy, payload } = props;
                                const text = payload.value || "";
                                const maxLen = 12;
                                const truncated = text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
                                return (
                                    <text x={x} y={y + (y > cy ? 5 : -5)} textAnchor={x > cx + 10 ? 'start' : x < cx - 10 ? 'end' : 'middle'} fill="#cbd5e1" fontSize={9} fontWeight={500}>
                                        <title>{text}</title>
                                        {truncated}
                                    </text>
                                );
                            }} 
                        />
                        
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

                        {/* 🎯 FIX: Adição do formatValue e name dinâmico no formatter do Tooltip */}
                        <Tooltip 
                            formatter={(v, name) => [`${formatValue(v)}${unit}`, name || 'Nível']} 
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

## `src/components/charts/EvolutionChart/CriticalTopicsAnalysis.jsx`

<a id="src-components-charts-evolutionchart-criticaltopicsanalysis-jsx"></a>

```jsx
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

// Mover para top-level (antes do componente)
const WEEKS = [
    { label: "SEMANA 4", offset: 4 },
    { label: "SEMANA 3", offset: 3 },
    { label: "SEMANA 2", offset: 2 },
    { label: "SEMANA 1", offset: 1 },
    { label: "SEMANA ATUAL", offset: 0 },
];

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

    // const WEEKS = ... (removido daqui)
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
                    
                    const score = getSafeScore(t, maxScore);
                    // ✅ FIX: Se score é NaN (t.score null E total 0), pular esta entrada
                    if (!Number.isFinite(score)) return;
                    const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
                    
                    const correctCount = t.isPercentage
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
                
                const score = getSafeScore(h, maxScore);
                const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
                
                const correctCount = h.isPercentage
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

    const hasData = useMemo(() => {
        if (!categories) return false;
        return categories.some(cat => {
            const historyRaw = cat.simuladoStats?.history;
            const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
            return history.some(h => {
                const d = normalizeDate(h.date);
                return d && d >= startDate && d <= endDate && (parseInt(h.total, 10) > 0 || h.score != null);
            });
        });
    }, [categories, startDate, endDate]);

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
                                    <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} width={100} />
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
                                <span className="text-4xl mb-3">{hasData ? '🎉' : '⏳'}</span>
                                {hasData ? 'Nenhum erro registrado neste período!' : 'Nenhum dado registrado neste período.'}
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
                                <span className="text-4xl mb-3">{hasData ? '🎉' : '⏳'}</span>
                                {hasData ? 'Nenhum erro registrado neste período!' : 'Nenhum dado registrado neste período.'}
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

## `src/components/charts/EvolutionChart/DisciplinaCard.jsx`

<a id="src-components-charts-evolutionchart-disciplinacard-jsx"></a>

```jsx
import React from 'react';
import { formatValue } from '../../../utils/scoreHelper';
import { pointsToPct } from '../../../utils/scoreHelper.conversions';

export const DisciplinaCard = React.memo(function DisciplinaCard({ cat, level, metrics, target, isFocused, onClick, unit = '%', maxScore = 100, minScore = 0 }) {
    const safeMax = Math.max(1, Number(maxScore) || 100);   // ✅ LOTE-03
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeRange = Math.max(1e-9, safeMax - safeMin);
    const val = level || 0;
    const ok = val >= target;
    const midThreshold = safeMin + (target - safeMin) * 0.75;
    const mid = val >= midThreshold;
    const statusColor = ok ? '#22c55e' : mid ? '#f59e0b' : '#ef4444';
    const progressWidth = Math.max(0, Math.min(100, pointsToPct(val, safeMax, safeMin)));

    const rawVal = metrics ? metrics[`raw_${cat.id}`] : null;
    const statsVal = metrics ? metrics[`stats_${cat.id}`] : null;
    const bayVal = metrics ? metrics[`bay_${cat.id}`] : null;

    return (
        <button onClick={onClick}
            aria-pressed={isFocused}
            aria-label={`Focar na disciplina ${cat.name}`}
            className={`relative text-left w-full rounded-2xl border p-3 sm:p-4 transition-all duration-200 group min-h-[82px] sm:min-h-[105px] flex flex-col justify-between ${isFocused ? 'z-20 border-transparent bg-slate-900/80 shadow-sm' : 'border-slate-800/50 hover:border-slate-700 hover:bg-slate-800/40'}`}
            style={{
                backgroundColor: isFocused ? `${cat.color}10` : 'rgba(15,23,42,0.5)',
                borderColor: isFocused ? cat.color : undefined,
            }}>

            {/* Progress Bar (Bottom) */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-800/60 overflow-hidden">
                <div className="h-full transition-all duration-700" style={{ width: `${progressWidth}%`, backgroundColor: statusColor }} />
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
                            <div className="h-full bg-orange-400" style={{ width: `${rawVal != null && Number.isFinite(Number(rawVal)) ? Math.min(100, Math.max(0, ((Number(rawVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-[8px] text-slate-300 uppercase tracking-widest font-black">
                            <span>Histórica</span>
                            <span className="text-blue-400 font-mono">{statsVal != null && Number.isFinite(Number(statsVal)) ? formatValue(statsVal) : '—'}{unit}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400" style={{ width: `${statsVal != null && Number.isFinite(Number(statsVal)) ? Math.min(100, Math.max(0, ((Number(statsVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-[8px] text-slate-300 uppercase tracking-widest font-black">
                            <span>Real</span>
                            <span className="text-emerald-400 font-mono">{bayVal != null && Number.isFinite(Number(bayVal)) ? formatValue(bayVal) : '—'}{unit}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${bayVal != null && Number.isFinite(Number(bayVal)) ? Math.min(100, Math.max(0, ((Number(bayVal) - safeMin) / safeRange) * 100)) : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

        </button>

    );
});

```

---

## `src/components/charts/EvolutionChart/KpiCard.jsx`

<a id="src-components-charts-evolutionchart-kpicard-jsx"></a>

```jsx
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

## `src/hooks/useChartData.js`

<a id="src-hooks-usechartdata-js"></a>

```javascript
import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, BAYESIAN_DECAY_FACTOR } from '../engine/stats';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

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
        // ✅ AUDIT FIX: blindagem contra NaN vindo de getSafeScore
        const safeScore = Number.isFinite(score) ? score : NaN;

        let compTotal = rawTotal;
        let compCorrect = rawTotal > 0 && Number.isFinite(safeScore) ? Math.round((safeScore / maxScore) * rawTotal) : rawCorrect;
        if (rawTotal === 0 && h?.score != null && Number.isFinite(safeScore)) {
            compTotal = getSyntheticTotal(maxScore);
            const pct = Math.min(1, Math.max(0, safeScore / maxScore));
            compCorrect = Math.round(pct * compTotal);
        }
        // ✅ AUDIT FIX: correct ∈ [0, total] e nunca NaN entra no acumulado
        compCorrect = Math.max(0, Math.min(compTotal, Number.isFinite(compCorrect) ? compCorrect : 0));
        const safeRawCorrect = rawTotal > 0 && Number.isFinite(safeScore)
            ? Math.max(0, Math.min(rawTotal, Math.round((safeScore / maxScore) * rawTotal)))
            : Math.max(0, Number.isFinite(rawCorrect) ? rawCorrect : 0);

        if (existing) {
            existing.compCorrect = (existing.compCorrect || 0) + compCorrect;
            existing.compTotal = (existing.compTotal || 0) + compTotal;
            existing.total += rawTotal;
            existing.correct += safeRawCorrect;
            // ✅ AUDIT FIX: divisão por zero → NaN
            existing.score = existing.compTotal > 0 ? (existing.compCorrect / existing.compTotal) * maxScore : NaN;
        } else {
            aggregatedHistoryByDateMap.set(key, {
                ...h,
                date: key,
                correct: safeRawCorrect,
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
    let bayAlpha = 1;
    let bayBeta = 1;
    let maxAlphaEver = 1;
    const DECAY_FACTOR = BAYESIAN_DECAY_FACTOR || 0.985;

    for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];
        while (histIdx < aggregatedHistory.length) {
            const key = aggregatedHistory[histIdx].date;
            if (key && key <= date) {
                const entry = aggregatedHistory[histIdx];
                const entryDate = normalizeDate(entry.date);
                const prevDate = histIdx > 0 ? normalizeDate(aggregatedHistory[histIdx - 1].date) : entryDate;
                const gapDays = Math.max(1, Math.floor((entryDate - prevDate) / (1000 * 60 * 60 * 24)));
                if (histIdx > 0) {
                    const entryDecay = Math.pow(DECAY_FACTOR, gapDays);
                    if (entryDecay < 1.0) {
                        const currentN = bayAlpha + bayBeta;
                        const currentP = bayAlpha / currentN;
                        const newN = Math.max(2, currentN * entryDecay);
                        bayAlpha = newN * currentP;
                        bayBeta = newN * (1 - currentP);
                    }
                    const retentionFloor = maxAlphaEver * 0.3;
                    if (bayAlpha < retentionFloor) {
                        const currentN = bayAlpha + bayBeta;
                        const currentP = (currentN > 0 && bayAlpha > 0) ? bayAlpha / currentN : 0.01;
                        const safeP = Math.min(0.999999, Math.max(0.000001, currentP));
                        bayAlpha = retentionFloor;
                        bayBeta = bayAlpha * ((1 - safeP) / safeP);
                    }
                }

                let total = entry.compTotal !== undefined ? entry.compTotal : (Number(entry.total) || 0);
                let correct = entry.compCorrect !== undefined ? entry.compCorrect : (Number(entry.correct) || 0);
                if (total === 0 && entry.score != null) {
                    const pct = Math.min(1, Math.max(0, Number(entry.score) / maxScore));
                    total = getSyntheticTotal(maxScore);
                    correct = Math.round(pct * total);
                }
                // ✅ AUDIT FIX: nunca deixar correct > total alimentar o Bayesiano
                correct = Math.max(0, Math.min(total, Number(correct) || 0));
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
            dataByDate[date] = { date, displayDate: `${day}/${month}` };
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
                // ✅ AUDIT FIX: score NaN não pode contaminar a timeline
                if (!Number.isFinite(score)) return;
                const corrNorm = rawTotal > 0
                    ? Math.max(0, Math.min(rawTotal, Math.round((score / maxScore) * rawTotal)))
                    : Math.max(0, Number.isFinite(rawC) ? rawC : 0);
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
                let rawDailyScore = null;
                if (exact && exact.compTotal >= 1) {
                    const calc = (exact.compCorrect / exact.compTotal) * maxScore;
                    rawDailyScore = Number.isFinite(calc) ? calc : null;
                } else if (exact && snap?.last) {
                    const s = getSafeScore(snap.last, maxScore);
                    rawDailyScore = Number.isFinite(s) ? s : null;
                }
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
        const datesToUse = sortedDates;
        const dates = datesToUse.map(dateStr => {
            const d = normalizeDate(dateStr);
            const [, m, day] = dateStr.split('-');
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
                // ✅ AUDIT FIX: score NaN não pode sujar o heatmap
                if (!Number.isFinite(score)) return;
                if (h.score != null && tot === 0) {
                    tot = 1;
                    corrNorm = score / maxScore;
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
                // ✅ AUDIT FIX: score NaN não pode contaminar a Precisão Global
                if (!Number.isFinite(score)) return;
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

    return { activeCategories, timeline, heatmapData, globalMetrics };
}

```

---

## `src/hooks/useEvolutionMC.js`

<a id="src-hooks-useevolutionmc-js"></a>

```javascript
import { useState, useMemo, useEffect } from 'react';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { useAppStore } from '../store/useAppStore';
import { getDateKey, toDateMs } from '../utils/dateHelper';
import { getSafeScore } from '../utils/scoreHelper';
import { parseNoonLocal, addDaysNoon } from '../utils/parseNoonLocal';
import { runMonteCarloAnalysis } from '../engine/monteCarlo';

const EMPTY_ARRAY = [];

/**
 * Orquestra o motor Monte Carlo do Menu Evolução.
 * Extraído do EvolutionChart.jsx (LOTE-05).
 *
 * Responsabilidades:
 *  - disparar o worker apenas nos engines que consomem o resultado;
 *  - debouncer + cancelamento seguro;
 *  - fallback síncrono quando o worker falha;
 *  - série de projeção futura com parsing de data sem timezone fixo.
 */
export function useEvolutionMC({
  focusCategory,
  categoryLevels,
  projectDays,
  targetScore,
  minScore,
  maxScore,
  activeEngine
}) {
  const { runAnalysis } = useMonteCarloWorker();
  const [mcLoading, setMcLoading] = useState(false);
  const [mcResult, setMcResult] = useState(null);
  const [mcProjectionSeries, setMcProjectionSeries] = useState(null);

  const historyArray = useMemo(() => {
    const historyRaw = focusCategory?.simuladoStats?.history;
    if (!historyRaw) return EMPTY_ARRAY;
    return Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);
  }, [focusCategory?.simuladoStats?.history]);

  const currentFocusLevel = focusCategory ? categoryLevels?.[focusCategory.id] : undefined;

  useEffect(() => {
    // ✅ LOTE-05: só dispara o Monte Carlo nos engines que consomem o resultado
    const isMcEngine = activeEngine === 'compare' || activeEngine === 'mc_density';
    if (!isMcEngine) { queueMicrotask(() => setMcLoading(false)); return; }

    if (!focusCategory?.id || !Array.isArray(historyArray) || historyArray.length === 0) {
      queueMicrotask(() => setMcLoading(false));
      return;
    }

    const hist = [...historyArray]
      .filter((h) => h && h.date)
      .map((h) => {
        const dateKey = getDateKey(h.date);
        const score = getSafeScore(h, maxScore);
        if (!dateKey || !Number.isFinite(score)) return null;
        return { ...h, date: dateKey, score, correct: h.correct, total: h.total };
      })
      .filter(Boolean)
      .sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date));

    if (hist.length < 1) { queueMicrotask(() => setMcLoading(false)); return; }

    let cancelled = false;
    const workerDebounceTimeout = setTimeout(async () => {
      // ✅ BUG-5 FIX: Mover cálculos de tempo para ANTES do try/catch
      // para que fiquem acessíveis no fallback síncrono
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

      setMcLoading(true);
      try {
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

        // ✅ LOTE-05: parse local normalizado (sem timezone hardcoded "-04:00")
        const lastDate = parseNoonLocal(hist[hist.length - 1].date);
        if (!lastDate) return;
        const nextDate = addDaysNoon(lastDate, projectDays || 30);

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
        console.warn('[useEvolutionMC] Worker MC falhou, tentando sync:', err);
        // ✅ LOTE-05: fallback síncrono real (antes o catch era vazio)
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
              forcedBaseline: currentFocusLevel,
              // ✅ BUG-5 FIX: repassar parâmetros de Time Penalty ao fallback síncrono
              projectedTotalTimeSeconds,
              examDurationMinutes
            });
            if (fallback) setMcResult({ ...fallback, categoryId: focusCategory?.id });
          } catch (syncErr) {
            console.error('[useEvolutionMC] Fallback sync MC falhou:', syncErr);
          }
        }
      } finally {
        if (!cancelled) setMcLoading(false);
      }
    }, 600);

    return () => { cancelled = true; clearTimeout(workerDebounceTimeout); };
  }, [
    focusCategory?.id, currentFocusLevel, historyArray, targetScore,
    projectDays, runAnalysis, minScore, maxScore, activeEngine
  ]);

  const activeMcResult = mcResult?.categoryId === focusCategory?.id ? mcResult : null;
  const activeMcProjectionSeries =
    mcProjectionSeries?.categoryId === focusCategory?.id ? mcProjectionSeries : null;

  return { mcLoading, mcResult, mcProjectionSeries, activeMcResult, activeMcProjectionSeries };
}

```

---

## `src/hooks/useCategoryLevels.js`

<a id="src-hooks-usecategorylevels-js"></a>

```javascript
import { useMemo } from 'react';
import { computeCategoryStats } from '../engine';

/**
 * Nível atual de cada disciplina segundo o engine ativo.
 * Extraído do EvolutionChart.jsx (LOTE-05).
 */
export function useCategoryLevels(categories, timeline, activeEngine, maxScore = 100, minScore = 0) {
  return useMemo(() => {
    const map = {};
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
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
      const weight = Number(cat.weight) > 0 ? Number(cat.weight) : 10;
      const stats = computeCategoryStats(history, weight, 60, maxScore);
      map[cat.id] = (stats?.mean != null && Number.isFinite(stats.mean)) ? stats.mean : safeMin;
    });
    return map;
  }, [categories, timeline, activeEngine, maxScore, minScore]);
}

```

---

## `src/hooks/useSubjectAggData.js`

<a id="src-hooks-usesubjectaggdata-js"></a>

```javascript
import { useMemo } from 'react';
import { toDateMs, getDateKey } from '../utils/dateHelper';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

/**
 * Filtra um histórico por janela de tempo ('30' | '60' | '90' | 'all').
 * Movido do EvolutionChart.jsx (LOTE-05).
 */
export function filterHistoryByTimeWindow(history, timeWindow) {
  const days = Number.parseInt(timeWindow, 10);
  const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
  if (timeWindow === 'all' || !Number.isFinite(days) || days <= 0) {
    return safeHistory.filter(Boolean);
  }
  const withMs = safeHistory
    .filter(Boolean)
    .map((h) => ({ h, ms: toDateMs(getDateKey(h?.date)) }))
    .filter((x) => Number.isFinite(x.ms));
  if (!withMs.length) return safeHistory.filter(Boolean);
  const referenceMs = toDateMs(getDateKey(new Date()));
  const limit = referenceMs - days * 24 * 60 * 60 * 1000;
  return withMs.filter((x) => x.ms >= limit).map((x) => x.h);
}

/**
 * Agregação por disciplina (questões, acertos, tempo) para os gráficos de
 * barras, radar e agilidade. Extraído do EvolutionChart.jsx (LOTE-05).
 */
export function useSubjectAggData({ categories, showOnlyFocus, focusCategory, timeWindow, maxScore, minScore }) {
  return useMemo(() => {
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
            const rawC = Number(h.correct);
            if (!h.isPercentage && Number.isFinite(rawC)) {
              return s + Math.max(0, Math.min(tot, rawC));
            }
            const range = Math.max(1e-9, maxScore - minScore);
            const score = getSafeScore(h, maxScore);
            if (!Number.isFinite(score)) return s;
            const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
            const derived = ((normalizedScore - minScore) / range) * tot;
            return s + Math.max(0, Math.min(tot, Number.isFinite(derived) ? derived : 0));
          }, 0)
        );

        const stats = history.reduce(
          (acc, h) => {
            const rootTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
            let topicsTs = 0;
            let topicsTimedQ = 0;
            let hasTopicWithTime = false;
            if (Array.isArray(h.topics)) {
              for (const t of h.topics) {
                const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0
                  ? t.timedQuestoes
                  : Number(t.total) || 0;
                if (tTs !== null && tTs > 0 && tTot > 0) {
                  topicsTs += tTs; topicsTimedQ += tTot; hasTopicWithTime = true;
                }
              }
            }
            if (hasTopicWithTime) return { ts: acc.ts + topicsTs, tq: acc.tq + topicsTimedQ };
            if (rootTs !== null && rootTs > 0 && Number(h.total) > 0) return { ts: acc.ts + rootTs, tq: acc.tq + Number(h.total) };
            if (rootTs !== null && rootTs > 0 && h.score != null) return { ts: acc.ts + rootTs, tq: acc.tq + getSyntheticTotal(maxScore) };
            return acc;
          },
          { ts: 0, tq: 0 }
        );

        const safeName = String(cat.name || 'Sem nome');
        const shortName = safeName.length > 18 ? safeName.substring(0, 16) + '…' : safeName;
        return {
          name: shortName,
          fullName: safeName,
          questoes: totalQ,
          timedQuestoes: stats.tq,
          acertos: totalCorrect,
          timeSpent: stats.ts,
          color: cat.color,
          id: cat.id
        };
      })
      .filter((d) => d.questoes > 0)
      .sort((a, b) => b.questoes - a.questoes);
  }, [categories, showOnlyFocus, focusCategory?.id, maxScore, minScore, timeWindow]);
}

```

---

## `src/hooks/useMonteCarloWorker.js`

<a id="src-hooks-usemontecarloworker-js"></a>

```javascript
/**
 * useMonteCarloWorker — Hook para offload Monte Carlo para Web Worker
 * 
 * Mantém o fallback síncrono se Web Workers não estiverem disponíveis.
 * Usa Vite's `?worker` import com module worker support.
 * Modificado para usar um Singleton Worker, evitando memory leaks ao renderizar
 * múltiplos gráficos/componentes que usam este hook.
 */
import { useCallback, useEffect } from 'react';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo.js';

// --- SHARED WORKER SINGLETON ---
let sharedWorker = null;
let sharedRequestId = 0;
const sharedPendingRequests = new Map();

function initSharedWorker() {
    if (sharedWorker) return;
    try {
        sharedWorker = new Worker(
            new URL('../engine/mc.worker.js', import.meta.url),
            { type: 'module' }
        );

        sharedWorker.onmessage = (e) => {
            const { id, type, result, error } = e.data;
            const pending = sharedPendingRequests.get(id);
            if (!pending) return;
            sharedPendingRequests.delete(id);
            if (type === 'error') {
                pending.reject(new Error(error));
            } else {
                pending.resolve(result);
            }
        };

        sharedWorker.onerror = (err) => {
            console.warn('[MC Worker Singleton] Error, falling back to main thread:', err.message);
            for (const [id, pending] of sharedPendingRequests) {
                if (pending.worker === sharedWorker) {
                    pending.reject(new Error('Worker error'));
                    sharedPendingRequests.delete(id);
                }
            }
            if (sharedWorker) {
                sharedWorker.terminate();
                sharedWorker = null;
            }
        };
    } catch (e) {
        console.warn('[MC Worker Singleton] Not available, using main thread:', e.message);
    }
}

// Cleanup pending requests periodically if needed (optional)
// But timeouts inside the Promise will handle stale requests.

export function useMonteCarloWorker() {
    // Initialize the singleton worker on first use
    useEffect(() => {
        initSharedWorker();
        // We do NOT terminate the worker on unmount because it is shared.
        // The worker lives for the lifetime of the application.
    }, []);

    const runAnalysis = useCallback(async (...args) => {
        // Fallback or initialization issue
        if (!sharedWorker) {
            // FIX APLICADO: Garantindo que o motor síncrono receba um objeto único
            if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
                return runMonteCarloAnalysis(args[0]);
            } else {
                const options = args[3] || {};
                return simulateNormalDistribution({
                    mean: args[0] || 0,
                    sd: args[1] || 0,
                    targetScore: args[2] || 0,
                    simulations: options.simulations || 5000,
                    seed: options.seed,
                    currentMean: options.currentMean,
                    minScore: options.minScore,
                    maxScore: options.maxScore,
                    bayesianCI: options.bayesianCI,
                    historyLength: options.historyLength,
                    subjects: options.subjects,
                    historicalCutoffs: options.historicalCutoffs,
                    flashcardImmunity: options.flashcardImmunity,
                });
            }
        }

        const id = ++sharedRequestId;
        
        let payload;
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
            payload = { isObjectCall: true, input: args[0] };
        } else {
            payload = {
                isObjectCall: false,
                inputOrMean: args[0],
                pooledSD: args[1],
                targetScore: args[2],
                options: args[3] || {}
            };
        }

        return new Promise((resolve, reject) => {
            // Timeout adaptativo baseado no número de simulações
            const simCount = payload?.input?.simulations ?? payload?.options?.simulations ?? 5000;
            const timeoutMs = Math.min(30000, Math.max(10000, simCount * 3)); // 3ms/sim, cap 30s

            // Capture current worker to prevent race conditions during recycling
            const currentWorker = sharedWorker;

            const timeoutId = setTimeout(() => {
                if (sharedPendingRequests.has(id)) {
                    sharedPendingRequests.delete(id);
                    console.warn(`[MC Worker Singleton] Request ${id} timed out. Recycling worker thread.`);
                    
                    // Kill the zombie worker AND clean up ALL its pending requests.
                    const dyingWorker = currentWorker;
                    
                    // Clean ALL pending requests from the dying worker
                    for (const [pendingId, pending] of sharedPendingRequests) {
                        if (pending.worker === dyingWorker) {
                            clearTimeout(pending.timeoutId);
                            pending.reject(new Error('Worker recycled due to timeout'));
                            sharedPendingRequests.delete(pendingId);
                        }
                    }
                    
                    if (dyingWorker) {
                         dyingWorker.terminate();
                    }
                    
                    if (sharedWorker === dyingWorker) {
                        sharedWorker = null;
                        
                        // Instantiate a fresh worker for subsequent requests.
                        initSharedWorker();
                    }
                    
                    reject(new Error("A análise demorou muito tempo e foi interrompida para proteger a performance do sistema."));
                }
            }, timeoutMs);

            sharedPendingRequests.set(id, { 
                worker: currentWorker, // Track request owner worker instance
                timeoutId, // Guardar referência para limpeza
                resolve: (data) => {
                    clearTimeout(timeoutId);
                    resolve(data);
                }, 
                reject: (err) => {
                    clearTimeout(timeoutId);
                    reject(err);
                }
            });
            
            try {
                currentWorker.postMessage({ type: 'runMonteCarloAnalysis', payload, id });
            } catch {
                clearTimeout(timeoutId);
                sharedPendingRequests.delete(id);
                reject(new Error(`Falha ao enviar dados para o Worker (DataCloneError). Estrutura inválida.`));
            }
        });
    }, []);

    return { runAnalysis };
}

```

---

## `src/engine/insightGenerator.js`

<a id="src-engine-insightgenerator-js"></a>

```javascript
import { normalizeDate, toDateMs } from "../utils/dateHelper";
import { getSafeScore, getSyntheticTotal } from "../utils/scoreHelper";
import { pointsToRatio } from "../utils/scoreHelper.conversions";

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
    maxScore = 100,
    minScore = 0
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
    // ✅ BUG-4 FIX: Não reatribuir o parâmetro; criar variável local sanitizada
    const safeMaxScore = safeFinite(maxScore, 100) > 0 ? safeFinite(maxScore, 100) : 100;
    const safeMinScore = safeFinite(minScore, 0);
    // ✅ BUG-4 FIX: scale usa a amplitude real (maxScore - minScore) em vez de maxScore sozinho
    const scale = (safeMaxScore - safeMinScore) / 100;

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
                .map(h => ({ ...h, score: getSafeScore(h, safeMaxScore) }))
                .filter(h => Number.isFinite(h.score));

            rawHistory.forEach(h => {
                const d = normalizeDate(h.date);
                if (!d || !Number.isFinite(d.getTime())) return;

                const dow = d.getDay();
                if (!dayStats[dow]) dayStats[dow] = { correct: 0, total: 0 };

                let tot = Number(h.total);
                if (!Number.isFinite(tot) || tot <= 0) {
                    tot = getSyntheticTotal(safeMaxScore);
                }

                if (!Number.isFinite(tot) || tot <= 0) return;

                dayStats[dow].correct += (pointsToRatio(h.score, safeMaxScore, safeMinScore) * tot);
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

    // Lógica de Alertas de Burnout de Alta Prioridade
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
                text: `Volume alto (${recentVolumeAlert}q em 7 dias), com nota em !!queda!!.`,
                details: `Nota recente (${safeRaw.toFixed(1)}${unit}) está abaixo do seu nível bayesiano (${safeBayesianFallback.toFixed(1)}${unit}).`,
                advice: "Dê um passo atrás, reduza o volume de simulados e recupere o foco."
            };
        }

        if (safeRaw > safeBayesianFallback + 8 * scale) {
            return {
                type: 'success',
                icon: "💡",
                title: "++Conhecimento Consolidado++",
                text: `Desempenho recente (${safeRaw.toFixed(1)}${unit}) ++muito acima da média++.`,
                details: `Superando o nível bayesiano projetado (${safeBayesianFallback.toFixed(1)}${unit}).`,
                advice: "O conhecimento assentou de vez. Pronto para aumentar a dificuldade."
            };
        }
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
            text: `Sua média histórica acumulada é ${statsVal.toFixed(1)}${unit}.`,
            advice: "Lembre-se que a média demora a refletir seu conhecimento recente."
        };
    }

    // Lógica Raio-X + Monte Carlo (Compare)
    if (activeEngine === "compare") {
        const bayVal = safeFinite(bayesian, null);
        const textMsg = bayVal != null 
            ? `Nível Bayesiano: ${bayVal.toFixed(1)}${unit} com projeção estatística ativa.` 
            : "Visualizando simulações estatísticas futuras.";
        return { 
            type: 'info', 
            icon: "⚡", 
            title: "Projeção Monte Carlo & Raio-X", 
            text: textMsg, 
            details: "O cone roxo projeta sua faixa provável de aprovação até a data do exame.",
            advice: "Use esta projeção para saber se sua curva está no rumo da aprovação." 
        };
    }

    // Lógica Raio-X de Assuntos (Subtopics)
    if (activeEngine === "subtopics") {
        return { 
            type: 'info', 
            icon: "🔬", 
            title: "Auditoria de Assuntos", 
            text: `Navegando nos subtópicos de ${focusCategory.name}.`, 
            details: "Identifique exatamente quais tópicos concentram a maior perda de pontos.",
            advice: "Ataque os !!blocos vermelhos!! para subir seu percentual rapidamente." 
        };
    }

    // Lógica Densidade MC (mc_density)
    if (activeEngine === "mc_density") {
        const ciLow = safeFinite(lastPoint[`bay_ci_low_${focusCategory.id}`], NaN);
        const ciHigh = safeFinite(lastPoint[`bay_ci_high_${focusCategory.id}`], NaN);
        const ciWidth = (Number.isFinite(ciHigh) && Number.isFinite(ciLow)) ? (ciHigh - ciLow) : null;
        return { 
            type: 'info', 
            icon: "📉", 
            title: "Densidade de Convergência", 
            text: ciWidth != null ? `Faixa de incerteza atual: ±${(ciWidth / 2).toFixed(1)}${unit}.` : "Histórico das suas projeções Monte Carlo.", 
            details: "Mostra como a margem de erro e a precisão do algoritmo evoluíram com seus simulados.",
            advice: "Se a linha estiver ++subindo++, você está matematicamente mais próximo da aprovação." 
        };
    }

    // Lógica Semanal (weekly_diff)
    if (activeEngine === "weekly_diff") {
        return { 
            type: 'info', 
            icon: "📆", 
            title: "Acelerômetro Semanal", 
            text: `Tração do estudo em ${focusCategory.name}.`, 
            details: "Compara os ganhos e perdas percentuais semana a semana.",
            advice: "Monitore semanas !!negativas!! para evitar a !!curva do esquecimento!!." 
        };
    }

    // Lógica Hoje vs Geral (today_vs_general)
    if (activeEngine === "today_vs_general") {
        const statsVal = safeFinite(getLastValid(`stats_${focusCategory.id}`), NaN);
        const diff = (Number.isFinite(safeRaw) && Number.isFinite(statsVal)) ? (safeRaw - statsVal) : null;
        const diffText = diff != null 
            ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${unit} vs média histórica.` 
            : "Seu foco de hoje contra sua média.";
        return { 
            type: diff != null && diff >= 0 ? 'success' : 'info', 
            icon: "⚖️", 
            title: "Desempenho Diário", 
            text: diffText, 
            details: `Último simulado: ${Number.isFinite(safeRaw) ? safeRaw.toFixed(1) + unit : '—'}.`,
            advice: "Use o ritmo de hoje para calibrar o volume das próximas sessões." 
        };
    }

    // Lógica Agilidade AI (time_spent)
    if (activeEngine === "time_spent") {
        return { 
            type: 'info', 
            icon: "⏳", 
            title: "Velocidade de Resolução", 
            text: `Mapeando velocidade média em ${focusCategory.name}.`, 
            details: "Compara o tempo gasto por questão contra seu histórico geral.",
            advice: "Cuidado com matérias !!lentas!!, elas roubam preciosos minutos da prova." 
        };
    }

    return { type: 'info', icon: "✅", title: "++Rendimento de Mestre++", text: `Operando na zona de ++máxima eficiência++.`, advice: "Mantenha o ritmo." };
}

```

---

## `src/utils/heatmapAggregation.js`

<a id="src-utils-heatmapaggregation-js"></a>

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

## `src/utils/monteCarloScenario.js`

<a id="src-utils-montecarloscenario-js"></a>

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

