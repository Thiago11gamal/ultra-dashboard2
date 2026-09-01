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
function buildPredictiveCompareData(
  timeline,
  focusCategory,
  categoryLevels,
  activeMcProjectionSeries,
  projectDays,
  minScore = 0,
  maxScore = 100
) {
  if (!focusCategory) return timeline;

  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const safeMax = Math.max(safeMin + 1, Number(maxScore) || 100);

  // 1. Prepara os dados históricos mapeando as chaves para leitura no gráfico
  let pts = timeline.map((d) => {
    const lowVal = d[`bay_ci_low_${focusCategory.id}`];
    const highVal = d[`bay_ci_high_${focusCategory.id}`];
    const hasValidBand = lowVal != null && Number.isFinite(Number(lowVal)) && highVal != null && Number.isFinite(Number(highVal));

    return {
      ...d,
      "Nota Bruta": d[`raw_${focusCategory.id}`],
      "Nível Bayesiano": d[`bay_${focusCategory.id}`],
      "Banda Bayesiana": hasValidBand ? [Number(lowVal), Number(highVal)] : null,
      "Média Histórica": d[`stats_${focusCategory.id}`]
    };
  });

  // 2. Acopla os pontos futuros do Monte Carlo com validação robusta
  if (activeMcProjectionSeries && pts.length > 0) {
    const lastIdx = pts.length - 1;

    const rawLevel =
      pts[lastIdx]["Nível Bayesiano"] ??
      categoryLevels?.[focusCategory?.id] ??
      activeMcProjectionSeries?.mc_p50 ??
      safeMin;

    const currentLevel = Math.max(safeMin, Math.min(safeMax, safeFiniteNumber(rawLevel, safeMin)));
    const p50 = Math.max(safeMin, Math.min(safeMax, safeFiniteNumber(activeMcProjectionSeries.mc_p50, currentLevel)));

    const band =
      Array.isArray(activeMcProjectionSeries.mc_band) && activeMcProjectionSeries.mc_band.length >= 2
        ? activeMcProjectionSeries.mc_band
        : [currentLevel, currentLevel];

    const band0 = safeFiniteNumber(band[0], currentLevel);
    const band1 = safeFiniteNumber(band[1], currentLevel);
    const bandMin = Math.max(safeMin, Math.min(band0, band1));
    const bandMax = Math.min(safeMax, Math.max(band0, band1));

    const bounded = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return currentLevel;
      return Math.max(safeMin, Math.min(safeMax, n));
    };

    // Parse a data base UMA VEZ antes do loop
    const baseParsed = normalizeDate(pts[lastIdx].date) || new Date();
    const baseMs = new Date(baseParsed.getFullYear(), baseParsed.getMonth(), baseParsed.getDate(), 12, 0, 0, 0).getTime();

    const futurePoints = [];
    const totalDays = Math.max(1, projectDays || 30);
    const steps = Math.min(6, Math.max(1, totalDays));
    const seenDates = new Set([pts[lastIdx].date]);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const weight = Math.sqrt(t);

      const val = bounded(currentLevel + (p50 - currentLevel) * t);
      const bandLow = bounded(currentLevel + (bandMin - currentLevel) * weight);
      const bandHigh = bounded(currentLevel + (bandMax - currentLevel) * weight);

      const forwardDays = Math.max(1, Math.round((i / steps) * totalDays));
      const dt = new Date(baseMs + forwardDays * 24 * 60 * 60 * 1000);
      const iso = getDateKey(dt);

      if (!seenDates.has(iso)) {
        seenDates.add(iso);
        futurePoints.push({
          date: iso,
          displayDate: i === steps ? `${iso.split('-')[2]}/${iso.split('-')[1]} ✦` : "",
          "Futuro Provável": val,
          "Cenário Range": [bandLow, bandHigh],
          __future: true
        });
      }
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
        id: "mc_density", label: "Rastreador MC", emoji: "🚀", color: "#60a5fa", prefix: null, style: "monotoneX",
        explain: { titulo: "O Seu Rastreador de Aprovação", simples: "Esta linha mostra se o seu ritmo de estudos está te aproximando ou te afastando da aprovação. Ela calcula qual era a sua projeção de nota (Monte Carlo) no final de cada simulado que você já fez.", dica: "A métrica definitiva de convergência. Se a linha está subindo, continue o que está fazendo! Se ela estagnou ou caiu, é hora de mudar a estratégia na aba Foco." },
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
    categories: propCategories = null,
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
        const sourceList = (Array.isArray(propCategories) && propCategories.length > 0) ? propCategories : rawCategories;
        const safeCategories = Array.isArray(sourceList) ? sourceList : Object.values(sourceList || {});
        return safeCategories.map((cat, idx) => {
            // FIX 1A-1: cor por índice (puro, sem mutação de variável externa)
            const color = cat.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
            // FIX 1A-2: normalizar tasks para array
            const tasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
            return { ...cat, color, tasks };
        });
    }, [propCategories, rawCategories]);

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
    const { timeline, heatmapData, globalMetrics, activeCategories } = useChartData(categories, mcWeights, maxScore, minScore);
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

    // 1. Calcular o resultado histórico sem downsampling
    const historicalData = useMemo(() => {
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
        return { result, future };
    }, [chartData, timeWindow]);

    // 2. Determinar a chave de downsampling (memoizada separadamente)
    const primaryKey = useMemo(() => {
        if (activeEngine === "compare") return "Nível Bayesiano";
        if (activeEngine === "mc_density") return focusCategory?.id ? `bay_${focusCategory.id}` : null;
        if (activeEngine === "raw") return focusCategory?.id ? `raw_${focusCategory.id}` : null;
        if (activeEngine === "stats") return focusCategory?.id ? `stats_${focusCategory.id}` : null;
        return focusCategory?.id ? `bay_${focusCategory.id}` : null;
    }, [activeEngine, focusCategory?.id]);

    // 3. Downsampling memoizado separadamente
    const sampledHistorical = useMemo(() => {
        return downsampleLTTB(historicalData.result, 150, "date", primaryKey || "date");
    }, [historicalData.result, primaryKey]);

    // 4. Combinar com dados futuros
    const filteredChartData = useMemo(() => {
        return historicalData.future.length > 0
            ? [...sampledHistorical, ...historicalData.future]
            : sampledHistorical;
    }, [sampledHistorical, historicalData.future]);

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
                <div className="text-6xl mb-4 opacity-80">📊</div>
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">Gráficos de Evolução</h2>
                <p className="text-slate-400 mb-6">Realize simulados para desbloquear a sua Máquina do Tempo Estatística.</p>
                <button
                    onClick={() => window.location.hash = '#/simulados'}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-colors"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    Ir para Simulados
                </button>
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
                        <span className="sm:hidden">{isExporting ? 'Gerando...' : 'Baixar PDF'}</span>
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
                {/* Máscara CSS removida: ela estava causando um gradiente que apagava o início do primeiro card e o fim do último. */}
                <div className="relative">
                    <div className="flex overflow-x-auto snap-x gap-4 px-2 py-4 no-scrollbar scroll-smooth">
                        {activeCategories.map(cat => (
                            <div key={cat.id} className={`snap-center shrink-0 w-[240px] sm:w-[280px] transition-all duration-500 ${showOnlyFocus && focusCategory?.id !== cat.id ? 'opacity-85 hover:opacity-100 grayscale-[10%] scale-[0.96]' : 'opacity-100 scale-100'}`}>
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
                                 onKeyDown={(e) => {
                                     if (e.key === 'Enter' || e.key === ' ') {
                                         e.preventDefault();
                                         setShowEngineTooltip(prev => !prev);
                                     } else if (e.key === 'Escape') {
                                         setShowEngineTooltip(false);
                                     }
                                 }}
                                 onBlur={() => setShowEngineTooltip(false)}
                                 className="relative flex items-center justify-center w-5 h-5 rounded-full border border-slate-600 text-slate-400 text-[10px] font-bold cursor-help hover:border-slate-300 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                 aria-label="Informações sobre este modo de visualização"
                                 aria-expanded={showEngineTooltip}
                             >
                                 ?
                             </button>
                         </div>
                         <div className={`absolute top-10 left-1/2 -translate-x-1/2 sm:left-12 sm:translate-x-0 w-[280px] max-w-[min(90vw,280px)] sm:w-72 p-4 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-xl shadow-2xl transition-all duration-300 z-[100] ${showEngineTooltip ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto'}`}>
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

                {/* Máscara CSS removida: ela estava causando um gradiente que apagava o início do primeiro botão e o fim do último. */}
                <div className="relative w-full mb-8">
                    <div role="tablist" aria-label="Modos de análise do gráfico de evolução" className="flex overflow-x-auto pt-2 pb-4 px-4 gap-3 w-full no-scrollbar scroll-smooth snap-x snap-mandatory">
                        {ENGINES.map((eng, idx) => {
                            const active = activeEngine === eng.id;
                            return (
                                <button
                                    type="button"
                                    role="tab"
                                    id={`engine-tab-${eng.id}`}
                                    aria-selected={active}
                                    aria-controls={`engine-panel-${eng.id}`}
                                    key={eng.id}
                                    onClick={() => setActiveEngine(eng.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowRight') {
                                            e.preventDefault();
                                            setActiveEngine(ENGINES[(idx + 1) % ENGINES.length].id);
                                        } else if (e.key === 'ArrowLeft') {
                                            e.preventDefault();
                                            setActiveEngine(ENGINES[(idx - 1 + ENGINES.length) % ENGINES.length].id);
                                        } else if (e.key === 'Home') {
                                            e.preventDefault();
                                            setActiveEngine(ENGINES[0].id);
                                        } else if (e.key === 'End') {
                                            e.preventDefault();
                                            setActiveEngine(ENGINES[ENGINES.length - 1].id);
                                        }
                                    }}
                                    tabIndex={active ? 0 : -1}
                                    aria-pressed={active}
                                    className={`snap-start shrink-0 group flex flex-col items-center justify-center gap-1.5 w-[100px] sm:w-[118px] h-[70px] sm:h-[78px] rounded-2xl transition-all duration-150 border will-change-transform ${active ? 'shadow-md scale-[1.03] z-10' : 'bg-white/[0.015] border-white/[0.04] text-slate-500 hover:bg-white/[0.04] hover:text-slate-300 hover:border-white/15 hover:scale-[1.015]'}`}
                                    style={active ? { backgroundColor: `${eng.color}12`, borderColor: `${eng.color}55`, color: eng.color, boxShadow: `0 0 20px ${eng.color}20, 0 4px 12px -2px rgba(0,0,0,0.3)` } : {}}
                                >
                                    <span className="text-[22px] group-hover:scale-105 transition-transform duration-150" style={{ filter: active ? `drop-shadow(0 0 4px ${eng.color})` : 'none' }}>{eng.emoji}</span>
                                    <span className="text-[10px] uppercase tracking-[0.05em] font-bold text-center leading-tight px-1 line-clamp-2">{eng.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div
                    id={`engine-panel-${activeEngine}`}
                    role="tabpanel"
                    aria-labelledby={`engine-tab-${activeEngine}`}
                    tabIndex={0}
                >
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
                                minScore={minScore}
                                maxScore={maxScore}
                                unit={unit}
                            />
                        </div>
                    </div>
                )}
                </div>
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
                                        mean={activeMcResult?.projectedMean ?? activeMcResult?.mean ?? minScore}
                                        projectedMean={activeMcResult?.projectedMean ?? activeMcResult?.mean ?? minScore}
                                        currentMean={categoryLevels[focusCategory?.id]}
                                        sd={activeMcResult?.sd ?? 0}
                                        sdLeft={activeMcResult?.sdLeft ?? activeMcResult?.sd ?? 0}
                                        sdRight={activeMcResult?.sdRight ?? activeMcResult?.sd ?? 0}
                                        low95={activeMcResult?.ci95Low ?? minScore}
                                        high95={activeMcResult?.ci95High ?? maxScore}
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
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[8px] font-black text-slate-500 border border-white/5 uppercase tracking-widest whitespace-nowrap">Motor Analítico</span>
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

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
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

