import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
    computeCategoryStats
} from "../engine";
import { useChartData } from "../hooks/useChartData";
import { EvolutionHeatmap } from "./charts/EvolutionHeatmap";
import { getDateKey, normalizeDate, toDateMs } from "../utils/dateHelper";
import { getSafeScore, getSyntheticTotal } from "../utils/scoreHelper";
import { exportComponentAsPDF } from "../utils/pdfExport";
import { Download, Loader2, Zap, Target, BarChart3, TrendingUp } from "lucide-react";
import { useMonteCarloWorker } from "../hooks/useMonteCarloWorker";
import { GaussianPlot } from "./charts/GaussianPlot";
import { useAppStore } from "../store/useAppStore";

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

const EMPTY_ARRAY = [];

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
        explain: { titulo: "A sua montanha-russa de resultados", simples: "Sem filtros. Apenas a porcentagem exata de acertos. Excelente para detectar anomalias.", dica: "Picos isolados não definem sua aprovação. O importante é a tendência geral." },
    },
    {
        id: "raw_weekly", label: "Mapa de Calor", emoji: "📅", color: "#f472b6", prefix: null, style: "linear",
        explain: { titulo: "Sua evolução semana a semana", simples: "Visualize cada simulado como uma célula colorida. Verde = acima da meta. Vermelho = abaixo.", dica: "Ideal para ver se você está melhorando ao longo das semanas, sem ruído diário." },
    },
    {
        id: "bayesian", label: "Nível Bayesiano", emoji: "🧠", color: "#34d399", prefix: "bay_", style: "monotoneX",
        explain: { titulo: "Seu nível real — modelo Beta-Binomial", simples: "Atualiza uma crença probabilística sobre sua taxa de acerto a cada simulado. A banda verde é o intervalo de 95% de confiança: quanto mais estreita, mais certeza temos do seu nível.", dica: "Com poucos simulados a banda é larga (incerteza alta). Ela vai fechando conforme você faz mais provas — use isso para decidir se já pode avançar de matéria." },
    },
    {
        id: "stats", label: "Média Histórica", emoji: "📐", color: "#818cf8", prefix: "stats_", style: "monotoneX",
        explain: { titulo: "O peso do seu histórico", simples: "A média de todas as questões já feitas. Serve como uma âncora.", dica: "A média histórica demora a refletir melhorias recentes. Foque no nível Bayesiano." },
    },
    {
        id: "compare", label: "Raio-X + Monte Carlo", emoji: "⚡", color: "#a78bfa", prefix: null, style: "monotoneX",
        explain: { titulo: "Passado, Presente e Futuro", simples: "A visão mais avançada. Sobrepõe o que fez, seu nível real e projeta o futuro com Monte Carlo.", dica: "Use o seletor 'Focar em' para mergulhar nos detalhes da matéria." },
    },
    {
        id: "subtopics", label: "Raio-X de Assuntos", emoji: "🔬", color: "#facc15", prefix: null, style: "linear",
        explain: { titulo: "Sua precisão por Assunto (Micro)", simples: "Mergulhe no nível molecular da sua disciplina. Veja o percentual real de acertos em cada subtópico.", dica: "Ideal para descobrir exatamente qual capítulo ou aula específica você precisa revisar, sem perder tempo com a matéria toda." },
    },
    {
        id: "mc_density", label: "Densidade MC", emoji: "📉", color: "#60a5fa", prefix: null, style: "monotoneX",
        explain: { titulo: "Rastreador de Sucesso", simples: "Evolução temporal da sua projeção de Monte Carlo registrada a cada simulado.", dica: "Ideal para ver se a aprovação está chegando cada vez mais perto." },
    },
    {
        id: "weekly_diff", label: "Semanal", emoji: "📆", color: "#10b981", prefix: null, style: "linear",
        explain: { titulo: "Evolução Semanal de Desempenho", simples: "Compara diretamente o seu desempenho (delta) de uma semana para a outra.", dica: "Foque nas semanas com regressão (valores negativos em vermelho) para entender quais matérias exigem revisão urgente." },
    },
];


export default function EvolutionChart({
    categories: rawCategories = [],
    targetScore = 80,
    goalDate,
    monteCarloHistory = [],
    studyLogs = [],
    unit = '%',
    minScore = 0,
    maxScore = 100
}) {
    const categories = useMemo(() => {
        const DEFAULT_PALETTE = [
            "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", 
            "#ec4899", "#14b8a6", "#f43f5e", "#84cc16", "#a855f7",
            "#06b6d4", "#eab308", "#6366f1", "#d946ef", "#22c55e"
        ];
        let defaultColorCount = 0;
        return rawCategories.map((cat) => {
            let color = cat.color;
            if (!color || color.toLowerCase() === '#3b82f6') {
                color = DEFAULT_PALETTE[defaultColorCount % DEFAULT_PALETTE.length];
                defaultColorCount++;
            }
            return { ...cat, color };
        });
    }, [rawCategories]);

    // M3 FIX: parseGoalDateLocal movida para fora do componente (ver acima).

    const [activeEngine, setActiveEngine] = useState("bayesian");
    const [focusSubjectId, setFocusSubjectId] = useState(() => categories[0]?.id);
    

    // RIGOR-09 FIX: Recuperar os pesos do store para o Global Pct ponderado
    const mcWeights = useAppStore(state => state.appState?.contests?.[state.appState?.activeId]?.mcWeights || {});
    const { timeline, heatmapData, globalMetrics, activeCategories } = useChartData(categories, mcWeights, maxScore);
    const { runAnalysis } = useMonteCarloWorker();
    const [mcLoading, setMcLoading] = useState(false);
    const safeGlobalMetrics = useMemo(() => ({
        totalQuestions: Number(globalMetrics?.totalQuestions) || 0,
        totalCorrect: Number(globalMetrics?.totalCorrect) || 0,
        globalAccuracy: Number.isFinite(Number(globalMetrics?.globalAccuracy)) ? Number(globalMetrics.globalAccuracy) : 0,
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

    // Redundant validation effects removed to prevent cascading renders. 
    // State integrity is maintained via useMemo and controlled inputs.

    // B-13 & P0 FIX: Removido useEffect que causava re-render duplo.
    // A validação do foco agora é feita de forma reativa no useMemo abaixo.

    const focusCategory = useMemo(() => {
        if (!categories || categories.length === 0) return null;
        const found = categories.find(c => c.id === focusSubjectId);

        // Se não encontrou (ou foi apagado), volta para o primeiro automaticamente 
        // sem precisar disparar um setFocusSubjectId e causar um re-render duplo!
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
            
            // Fallback para quando não há dados no timeline (ex: primeiro simulado do dia ainda não processado no acumulado)
            const history = cat.simuladoStats?.history || [];
            if (!history.length) { map[cat.id] = 0; return; }
            const stats = computeCategoryStats(history, 100, 60, maxScore);
            map[cat.id] = stats?.mean || 0;
        });
        return map;
    }, [categories, timeline, activeEngine, maxScore]);

    // PREMIUM INTEGRATION - Monte Carlo Data State
    const [mcResult, setMcResult] = useState(null);
    const [mcProjectionSeries, setMcProjectionSeries] = useState(null);

    const historyArray = Array.isArray(focusCategory?.simuladoStats?.history)
        ? focusCategory.simuladoStats.history
        : EMPTY_ARRAY;

    useEffect(() => {
        if (!Array.isArray(historyArray) || historyArray.length === 0) {
            // C1 FIX: Chamada direta — o setTimeout sem cleanup vazava estado em componente desmontado.
            setMcLoading(false);
            return;
        }

        const hist = [...historyArray]
            .filter(h => h && h.date)
            .map(h => {
                const dateKey = getDateKey(h.date);
                const score = getSafeScore(h, maxScore);
                if (!dateKey || !Number.isFinite(score)) return null;
                return { date: dateKey, score, correct: h.correct, total: h.total };
            })
            .filter(Boolean).sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date));

        if (hist.length < 2) return;

        let cancelled = false;

        const workerDebounceTimeout = setTimeout(async () => {
            setMcLoading(true);
            try {
                const result = await runAnalysis(hist, targetScore, projectDays, { minScore, maxScore });

                if (cancelled || !result) return;

                setMcResult({ ...result, categoryId: focusCategory?.id });

                const lastDateStr = hist[hist.length - 1].date;
                const lastDate = new Date(`${lastDateStr}T12:00:00`);
                if (Number.isNaN(lastDate.getTime())) return;

                const nextDate = new Date(lastDate);
                nextDate.setDate(nextDate.getDate() + (projectDays || 30));

                const p50 = result.projectedMean ?? result.mean ?? 0;
                const lo = result.ci95Low ?? result.ci95StatLow ?? 0;
                const hi = result.ci95High ?? result.ci95StatHigh ?? 100;

                setMcProjectionSeries({
                    // FIX: Usar getDateKey (hora local) em vez de toISOString (UTC)
                    // para evitar deslocamento de ±1 dia nos fusos negativos (ex: UTC-4)
                    date: getDateKey(nextDate),
                    mc_p50: p50,
                    mc_band: [lo, hi],
                    categoryId: focusCategory?.id
                });
            } catch (err) {
                console.warn('[EvolutionChart] Worker MC falhou, tentando sync:', err);
            } finally {
                if (!cancelled) setMcLoading(false);
            }
        }, 400);

        return () => { 
            cancelled = true; 
            clearTimeout(workerDebounceTimeout);
        };
    }, [focusCategory?.id, historyArray, targetScore, projectDays, runAnalysis, minScore, maxScore]);

    const activeMcResult = mcResult?.categoryId === focusCategory?.id ? mcResult : null;
    const activeMcProjectionSeries = mcProjectionSeries?.categoryId === focusCategory?.id ? mcProjectionSeries : null;

    const compareData = useMemo(() => {
        if (!focusCategory) return timeline;
        let pts = timeline.map((d) => ({
            ...d,
            "Nota Bruta": d[`raw_${focusCategory.id}`],
            "Nível Bayesiano": d[`bay_${focusCategory.id}`],
            "Bay CI Low": d[`bay_ci_low_${focusCategory.id}`],
            "Bay CI High": d[`bay_ci_high_${focusCategory.id}`],
            "Banda Bayesiana": d[`bay_ci_low_${focusCategory.id}`] != null && Number.isFinite(d[`bay_ci_low_${focusCategory.id}`]) 
                ? [d[`bay_ci_low_${focusCategory.id}`], d[`bay_ci_high_${focusCategory.id}`]] 
                : null,
            "Média Histórica": d[`stats_${focusCategory.id}`]
        }));

        if (activeMcProjectionSeries && pts.length > 0) {
            const lastIdx = pts.length - 1;
            const rawLevel = pts[lastIdx]["Nível Bayesiano"] ?? pts[lastIdx]["Nota Bruta"] ?? categoryLevels[focusCategory?.id] ?? activeMcProjectionSeries?.mc_p50 ?? 0;
            const currentLevel = Number.isFinite(Number(rawLevel)) ? Number(rawLevel) : 0;
            const futurePoints = [];
            const steps = 6;
            const bounded = (v) => Math.max(minScore, Math.min(maxScore, v));
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const weight = Math.sqrt(t);
                const val = bounded(currentLevel + (activeMcProjectionSeries.mc_p50 - currentLevel) * t);
                const bandLow = bounded(currentLevel + (activeMcProjectionSeries.mc_band[0] - currentLevel) * weight);
                const bandHigh = bounded(currentLevel + (activeMcProjectionSeries.mc_band[1] - currentLevel) * weight);

                const rawDate = String(pts[lastIdx].date || '');
                const dt = new Date(`${rawDate}T12:00:00`);
                const forwardDays = Math.max(i, Math.round((i / steps) * (projectDays || 30)));
                dt.setDate(dt.getDate() + forwardDays);
                const iso = getDateKey(dt);

                futurePoints.push({
                    date: iso,
                    displayDate: i === steps ? `${iso.split('-')[2]}/${iso.split('-')[1]} ✦` : "",
                    "Futuro Provável": val,
                    "Cenário Range": [bandLow, bandHigh]
                });
            }

            pts[lastIdx] = { ...pts[lastIdx], "Futuro Provável": currentLevel, "Cenário Range": [currentLevel, currentLevel] };
            pts = [...pts, ...futurePoints];
        }
        return pts;
    }, [timeline, focusCategory, activeMcProjectionSeries, categoryLevels, projectDays, minScore, maxScore]);

    const chartData = activeEngine === "compare" ? compareData : timeline;

    const filteredChartData = useMemo(() => {
        if (timeWindow === "all") return chartData;
        const days = Number.parseInt(timeWindow, 10);
        if (!Number.isFinite(days) || days <= 0 || chartData.length === 0) return chartData;
        const getDateMs = (item) => {
            if (!item?.date) return Number.NaN;
            const ms = toDateMs(item.date);
            return Number.isNaN(ms) ? Number.NaN : ms;
        };
        const lastValid = [...chartData].reverse().find(d => Number.isFinite(getDateMs(d)));
        if (!lastValid) return chartData;
        const limit = getDateMs(lastValid) - (days * 24 * 60 * 60 * 1000);
        return chartData.filter(d => { const ms = getDateMs(d); return Number.isFinite(ms) && ms >= limit; });
    }, [chartData, timeWindow]);

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
            .filter(cat => !showOnlyFocus || cat.id === focusCategory?.id)
            .map(cat => {
                const history = cat.simuladoStats?.history || [];

                // 🎯 MATH FIX: Injetar questões sintéticas para simulados sem volume
                const totalQ = history.reduce((s, h) => {
                    let tot = Number(h.total) || 0;
                    // FIX: Use synthetic total dynamically instead of hardcoded 100
                    if (tot === 0 && h.score != null) tot = getSyntheticTotal(maxScore);
                    return s + tot;
                }, 0);

                const totalCorrect = Math.round(history.reduce((s, h) => {
                    let tot = Number(h.total) || 0;
                    if (tot === 0 && h.score != null) tot = getSyntheticTotal(maxScore);
                    const range = Math.max(1e-9, maxScore - minScore);
                    const score = getSafeScore(h, maxScore);
                    const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
                    return s + ((normalizedScore - minScore) / range * tot);
                }, 0));

                const safeName = String(cat.name || 'Sem nome');
                const shortName = safeName.length > 18 ? safeName.substring(0, 16) + '…' : safeName;
                return { name: shortName, fullName: safeName, questoes: totalQ, acertos: totalCorrect, color: cat.color, id: cat.id };
            })
            .filter(d => d.questoes > 0)
            .sort((a, b) => b.questoes - a.questoes);
    }, [categories, showOnlyFocus, focusCategory?.id, maxScore, minScore]);

    // M4 FIX: getInsight memoizado — evita recriação e execução da função a cada render.
    const getInsight = useCallback(() => {
        const defaultTitle = "Análise do Sistema";

        if (!timeline.length || !focusCategory) {
            return {
                type: 'info',
                icon: "📊",
                title: defaultTitle,
                text: "Ainda não existem dados suficientes.",
                details: "Continue realizando simulados para desbloquear insights avançados."
            };
        }

        const lastPoint = timeline[timeline.length - 1];
        const raw = lastPoint[`raw_${focusCategory.id}`];
        const bayesian = lastPoint[`bay_${focusCategory.id}`];
        const scale = maxScore / 100;

        // 1. MAPA DE CALOR / WEEKLY
        if (activeEngine === "raw_weekly") {
            const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const dayStats = {};
            const now = new Date();
            
            categories.forEach(cat => {
                const history = cat.simuladoStats?.history || [];
                const rawHistory = history
                    .filter(h => {
                        const d = normalizeDate(h.date);
                        return d && d.getTime() <= now.getTime();
                    })
                    .map(h => ({ ...h, score: getSafeScore(h, maxScore) }))
                    .sort((a, b) => (normalizeDate(a.date)?.getTime() || 0) - (normalizeDate(b.date)?.getTime() || 0));

                rawHistory.forEach(h => {
                    const d = normalizeDate(h.date);
                    if (!d) return;
                    const dow = d.getDay();
                    if (!dayStats[dow]) dayStats[dow] = { correct: 0, total: 0 };
                    dayStats[dow].correct += (h.score / maxScore * (Number(h.total) || 0));
                    dayStats[dow].total += (Number(h.total) || 0);
                });
            });

            const dayEntries = Object.entries(dayStats)
                .filter(([, s]) => s.total >= 5)
                .map(([dow, s]) => ({ dow: Number(dow), pct: (s.correct / s.total) * 100, total: s.total }));

            if (dayEntries.length >= 2) {
                dayEntries.sort((a, b) => b.pct - a.pct);
                const best = dayEntries[0];
                const worst = dayEntries[dayEntries.length - 1];
                
                return {
                    type: 'success',
                    icon: "📅",
                    title: "Padrão Semanal de Rendimento",
                    text: `Seu rendimento de pico ocorre aos ${DAY_NAMES[best.dow]}s.`,
                    details: `Melhor dia: ${DAY_NAMES[best.dow]} (${best.pct.toFixed(1)}%, ${best.total}q). Pior dia: ${DAY_NAMES[worst.dow]} (${worst.pct.toFixed(1)}%, ${worst.total}q).`,
                    advice: "Alinhe seus simulados mais densos ao dia de melhor rendimento."
                };
            }
            return {
                type: 'info',
                icon: "📅",
                title: "Mapa de Calor",
                text: "Visualize sua constância semanal.",
                details: "Células verdes indicam desempenho acima da meta, vermelhas indicam necessidade de atenção."
            };
        }

        // 2. REALIDADE BRUTA (RAW)
        if (activeEngine === "raw") {
            if (raw == null) return { type: 'info', icon: "📊", title: "Realidade Bruta", text: "Ainda não existem dados suficientes para esta matéria." };
            const history = focusCategory.simuladoStats?.history || [];
            const scores = history.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
            
            if (scores.length < 2) {
                return {
                    type: 'info',
                    icon: "📊",
                    title: "Análise de Volatilidade",
                    text: `Nota atual: ${raw.toFixed(1)}${unit}.`,
                    details: "Realize mais simulados para mapear sua oscilação estatística."
                };
            }

            const recentScores = scores.slice(-5);
            const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
            const maxSwing = Math.max(...recentScores) - Math.min(...recentScores);

            if (maxSwing > 25 * scale) {
                return {
                    type: 'warning',
                    icon: "⚠️",
                    title: "Alta Volatilidade Detectada",
                    text: `Seus resultados oscilam ${maxSwing.toFixed(0)}${unit}.`,
                    details: `Intervalo: ${Math.min(...recentScores).toFixed(0)}${unit} a ${Math.max(...recentScores).toFixed(0)}${unit}.`,
                    advice: "Revise a consistência do seu estudo. Oscilações altas indicam 'chute' ou gaps de base."
                };
            }
            if (maxSwing < 8 * scale) {
                return {
                    type: 'success',
                    icon: "✅",
                    title: "Consistência Sólida",
                    text: `Variação de apenas ${maxSwing.toFixed(0)}${unit} nos últimos simulados.`,
                    details: `Média recente: ${avg.toFixed(1)}${unit}.`,
                    advice: "Você está pronto para subir o nível de dificuldade."
                };
            }
            return {
                type: 'info',
                icon: "📊",
                title: "Desempenho Estável",
                text: `Volatilidade moderada (${maxSwing.toFixed(0)}${unit}).`,
                details: `Média recente: ${avg.toFixed(1)}${unit}.`
            };
        }

        // 3. NÍVEL BAYESIANO
        if (activeEngine === "bayesian") {
            if (bayesian == null) return { type: 'info', icon: "🧠", title: "Nível Bayesiano", text: "Aguardando mais dados..." };
            const ciLow = lastPoint[`bay_ci_low_${focusCategory.id}`];
            const ciHigh = lastPoint[`bay_ci_high_${focusCategory.id}`];
            const ciWidth = (ciHigh != null && ciLow != null) ? (ciHigh - ciLow) : null;

            if (ciWidth != null && ciWidth < 5 * scale) {
                return {
                    type: 'success',
                    icon: "🎯",
                    title: "Alta Precisão Bayesiana",
                    text: `Seu nível real é ${bayesian.toFixed(1)}${unit}.`,
                    details: `IC 95%: [${ciLow.toFixed(1)}, ${ciHigh.toFixed(1)}] (banda de ${ciWidth.toFixed(1)}${unit}).`,
                    advice: "Modelo estatístico com convergência máxima. Seus dados são altamente confiáveis."
                };
            }
            if (ciWidth != null && ciWidth > 20 * scale) {
                return {
                    type: 'warning',
                    icon: "🧠",
                    title: "Incerteza Elevada",
                    text: `Nível estimado: ${bayesian.toFixed(1)}${unit}.`,
                    details: `A banda de confiança é larga (${ciWidth.toFixed(1)}${unit}).`,
                    advice: "Faça mais simulados focados nesta matéria para estreitar a estimativa."
                };
            }
            return {
                type: 'info',
                icon: "🧠",
                title: "Estimativa Bayesiana",
                text: `Nível Real: ${bayesian.toFixed(1)}${unit}.`,
                details: ciWidth != null ? `Margem: ${ciLow.toFixed(1)} a ${ciHigh.toFixed(1)}.` : ""
            };
        }

        // 4. MÉDIA HISTÓRICA
        if (activeEngine === "stats") {
            const stats = lastPoint[`stats_${focusCategory.id}`];
            if (stats == null) return { type: 'info', icon: "📐", title: "Histórico", text: "Sem dados." };
            const trend = lastPoint[`trend_status_${focusCategory.id}`];
            const gap = bayesian != null ? (bayesian - stats) : null;
            
            return {
                type: trend === 'up' ? 'success' : trend === 'down' ? 'warning' : 'info',
                icon: trend === 'up' ? "📈" : trend === 'down' ? "📉" : "📐",
                title: "Tendência Histórica",
                text: `Média de ${stats.toFixed(1)}${unit} com tendência de ${trend === 'up' ? 'ALTA' : trend === 'down' ? 'QUEDA' : 'ESTABILIDADE'}.`,
                details: gap != null ? `Gap vs Bayesiano: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}${unit}.` : "",
                advice: trend === 'up' ? "Sua curva de aprendizado está em aceleração." : trend === 'down' ? "Recomendamos revisão imediata de base." : "Consistência sólida mantida."
            };
        }

        // 5. GENERIC / SMART INSIGHTS
        if (raw != null && bayesian != null) {
            const nowMs = new Date().getTime();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            const recentVolumeAlert = (focusCategory.simuladoStats?.history || [])
                .filter(h => {
                    if (!h || !h.date) return false;
                    const d = new Date(h.date).getTime();
                    return !Number.isNaN(d) && (nowMs - d) <= sevenDaysMs;
                })
                .reduce((sum, h) => {
                    let q = parseInt(h.total, 10) || 0;
                    if (q === 0 && h.score != null) q = getSyntheticTotal(maxScore);
                    return sum + q;
                }, 0);

            if (recentVolumeAlert > 40 && raw < bayesian - 10 * scale) {
                return {
                    type: 'danger',
                    icon: "🚨",
                    title: "Alerta de Burnout",
                    text: `Volume alto (${recentVolumeAlert}q), mas nota (${raw.toFixed(1)}${unit}) em queda livre.`,
                    details: "O cansaço cognitivo está prejudicando sua performance real.",
                    advice: "Dê um passo atrás. Uma pausa de 24h recuperará mais pontos que 10h de estudo hoje."
                };
            }
            if (raw > bayesian + 8 * scale) {
                return {
                    type: 'success',
                    icon: "💡",
                    title: "Conhecimento Consolidado",
                    text: `Sua última nota (${raw.toFixed(1)}${unit}) estourou a previsão estatística.`,
                    details: `Nível Bayesiano: ${bayesian.toFixed(1)}${unit}.`,
                    advice: "O conhecimento assentou de vez. Você está performando acima do seu histórico."
                };
            }
            if (raw < bayesian - 8 * scale) {
                return {
                    type: 'warning',
                    icon: "⚖️",
                    title: "Desvio Atípico",
                    text: `Nota pontual baixa (${raw.toFixed(1)}${unit}), mas nível real sólido (${bayesian.toFixed(1)}${unit}).`,
                    details: "A estatística garante que isso foi apenas um ruído temporário.",
                    advice: "Não deixe um resultado isolado abalar seu psicológico."
                };
            }
        }

        return {
            type: 'info',
            icon: "✅",
            title: "Rendimento de Mestre",
            text: `Nível medido (${raw?.toFixed(1) ?? '0'}${unit}) alinhado ao domínio real (${bayesian?.toFixed(1) ?? '0'}${unit}).`,
            details: "Você está operando na sua zona de máxima eficiência.",
            advice: "Mantenha esse ritmo para garantir a aprovação."
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeline, focusCategory, activeEngine, categories, targetScore, maxScore, unit]);

    const engine = ENGINES.find((e) => e.id === activeEngine) || ENGINES[0];

    // Acima do retorno do JSX no EvolutionChart, extraia o estado dos dados:
    const accountHasData = chartData.length >= 2;
    const filterHasData = filteredChartData.length >= 2;

    const handleExport = async () => {
        setIsExporting(true);
        await exportComponentAsPDF('evolution-chart-container', 'RaioX_Evolucao_Dashboard.pdf', 'landscape');
        setIsExporting(false);
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
        <div id="evolution-chart-container" className="space-y-10 animate-fade-in relative">
            <div className="flex justify-end mb-6 relative z-20 no-print pr-1">
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 text-indigo-300 hover:bg-indigo-600/30 text-xs font-bold transition-all border border-indigo-500/30 disabled:opacity-50"
                >
                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    <span className="hidden sm:inline">{isExporting ? 'Gerando PDF...' : 'Baixar PDF'}</span>
                    <span className="sm:hidden">BAIXAR PDF</span>
                </button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                 .recharts-wrapper:focus, .recharts-surface:focus { outline: none !important; border: none !important; box-shadow: none !important; }
                button:focus-visible { outline: 2px solid rgba(129, 140, 248, 0.8); outline-offset: 2px; }
                .recharts-wrapper { outline: none !important; }
            ` }} />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 min-w-0">
                <KpiCard value={safeGlobalMetrics.totalQuestions.toLocaleString()} label="Questões" color="#818cf8" icon="📚" />
                <KpiCard value={safeGlobalMetrics.totalCorrect.toLocaleString()} label="Acertos" color="#34d399" icon="🎯" />
                <div className="col-span-2 sm:col-span-1">
                    <KpiCard
                        value={`${safeGlobalMetrics.globalAccuracy.toFixed(2)}%`}
                        label="Precisão Global" color="#fb923c" icon="⚡"
                    />
                </div>
            </div>

            <div className="relative z-0 mb-8 sm:mb-12">
                <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-black tracking-[0.15em] leading-loose py-2 sm:py-3 mb-0 pl-1">
                    Nível Bayesiano por Disciplina • clique para focar
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
            </div>

            <div className="relative z-[50] rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] w-full min-w-0 transition-all duration-700 overflow-visible"
                 style={{ boxShadow: `0 0 60px -15px ${engine.color}20` }}>
                 
                 {/* Intense Ambient Glow Removido a pedido do usuário */}

                 {/* Top Toolbar: Engine Header + Filters */}
                 <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-700/50">
                     
                     {/* Insight Header */}
                     <div className="group relative flex-1">
                         <div className="flex items-center gap-3">
                             <span className="text-2xl sm:text-3xl" style={{ filter: `drop-shadow(0 0 8px ${engine.color}80)` }}>{engine.emoji}</span>
                             <h3 className="font-black text-lg sm:text-xl tracking-tight transition-colors duration-300" style={{ color: engine.color }}>
                                 {engine.explain.titulo}
                             </h3>
                             {/* Mini Tooltip Trigger */}
                             <div className="relative flex items-center justify-center w-5 h-5 rounded-full border border-slate-600 text-slate-400 text-[10px] font-bold cursor-help hover:border-slate-300 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                                 ?
                             </div>
                         </div>
                         {/* Hover Popover */}
                         <div className="absolute top-10 -left-2 sm:left-12 w-[85vw] sm:w-72 max-w-sm p-4 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] pointer-events-none">
                             <p className="text-xs text-slate-200 mb-3 leading-relaxed">{engine.explain.simples}</p>
                             <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                                 <p className="text-[10px] text-amber-400 italic font-bold">💡 Dica Prática</p>
                                 <p className="text-[10px] text-slate-400 mt-1">{engine.explain.dica}</p>
                             </div>
                         </div>
                     </div>

                     {/* Filters Toolbar */}
                     <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center justify-between gap-1 bg-slate-950/60 border border-slate-800/70 rounded-xl p-1 shrink-0 overflow-x-auto w-full sm:w-auto shadow-inner">
                            {[{ label: '30d', value: '30' }, { label: '60d', value: '60' }, { label: '90d', value: '90' }, { label: 'Tudo', value: 'all' }].map(w => (
                                <button type="button" key={w.value} onClick={() => setTimeWindow(w.value)}
                                    className={`shrink-0 flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeWindow === w.value ? 'bg-indigo-600/30 text-indigo-300 shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)] border border-indigo-500/50' : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-800/50'}`}>
                                    {w.label}
                                </button>
                            ))}
                        </div>
                        {activeEngine !== 'compare' && activeEngine !== 'mc_density' && (
                            <button type="button" onClick={() => setShowOnlyFocus(!showOnlyFocus)}
                                className={`shrink-0 flex items-center justify-center gap-2 px-5 py-1.5 h-[34px] rounded-xl text-xs font-bold border transition-all ${showOnlyFocus ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)]' : 'bg-slate-950/60 border-slate-800/70 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                                <span>{showOnlyFocus ? '🔍' : '👁'}</span>
                                <span className="hidden sm:inline truncate max-w-[150px]">
                                    {showOnlyFocus ? `Foco: ${focusCategory?.name}` : 'Todas Matérias'}
                                </span>
                            </button>
                        )}
                     </div>
                 </div>

                 {/* Engines Segmented Control */}
                <div className="relative w-full mb-8">
                    <div className="flex overflow-x-auto pt-3 pb-3 px-2 gap-3 w-full no-scrollbar scroll-smooth snap-x">
                        {ENGINES.map((eng) => {
                            const active = activeEngine === eng.id;
                            return (
                                <button
                                    type="button"
                                    key={eng.id}
                                    onClick={() => setActiveEngine(eng.id)}
                                    className={`snap-start shrink-0 group flex flex-col items-center justify-center gap-2 w-32 h-20 rounded-xl transition-all duration-300 border ${active
                                        ? 'shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5)] scale-105 z-10'
                                        : 'bg-white/[0.02] border-white/[0.05] text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 hover:border-white/20'
                                        }`}
                                    style={active ? {
                                        backgroundColor: `${eng.color}15`,
                                        borderColor: `${eng.color}88`,
                                        color: eng.color,
                                        boxShadow: `0 0 25px ${eng.color}25`
                                    } : {}}
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform duration-300" style={{ filter: active ? `drop-shadow(0 0 5px ${eng.color})` : 'none' }}>{eng.emoji}</span>
                                    <span className="text-[10px] uppercase tracking-widest font-black text-center leading-tight px-1">{eng.label}</span>
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
                    />
                ) : activeEngine === "mc_density" ? (
                    <MonteCarloEvolutionChart
                        data={monteCarloHistory}
                        targetScore={targetScore}
                        unit={unit}
                        minScore={minScore}
                        maxScore={maxScore}
                    />
                ) : activeEngine === "weekly_diff" ? (
                    <WeeklyEvolutionView
                        categories={categories}
                        studyLogs={studyLogs}
                        showOnlyFocus={showOnlyFocus}
                        focusSubjectId={focusSubjectId}
                        maxScore={maxScore}
                        unit={unit}
                    />
                ) : !accountHasData ? (
                    <div className="h-[200px] flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-800 bg-slate-950/30">
                        <span className="text-5xl">🔥</span>
                        <div className="text-center">
                            <p className="text-slate-300 font-bold text-base mb-1">Dados insuficientes para desenhar a linha</p>
                            <p className="text-slate-500 text-sm max-w-xs">Registre pelo menos <span className="text-indigo-400 font-bold">2 simulados</span> na sua conta para desbloquear os gráficos.</p>
                        </div>
                    </div>
                ) : !filterHasData ? (
                    <div className="h-[200px] flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-800 bg-slate-950/30">
                        <span className="text-5xl">📅</span>
                        <div className="text-center">
                            <p className="text-slate-300 font-bold text-base mb-1">Nenhuma atividade recente</p>
                            <p className="text-slate-500 text-sm max-w-xs">Não registrou simulados nos últimos <span className="text-amber-400 font-bold">{timeWindow} dias</span>.</p>
                            <button 
                                onClick={() => setTimeWindow("all")} 
                                className="mt-4 px-4 py-2 bg-indigo-600/20 text-indigo-300 border border-indigo-600/40 rounded-lg font-bold text-xs hover:bg-indigo-600/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
                            >
                                Ver Todo o Histórico
                            </button>
                        </div>
                    </div>
                ) : activeEngine === "compare" ? (
                    <div className="relative">
                        {mcLoading && (
                            <div className="absolute inset-0 z-20 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center rounded-xl transition-all duration-300">
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
                ) : (
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
                )}
            </div>

            {/* PREMIUM MC STATS CARD */}
            {isMcEngine && focusCategory && (
                <div className="animate-fade-in-up">
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <TrendingUp size={120} />
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
                            {/* Left: Gaussian Plot */}
                            <div className="w-full md:w-1/2 flex flex-col">
                                <div className="flex items-center gap-2 mb-4 min-w-0">
                                    <Zap size={16} className="text-indigo-400 shrink-0" />
                                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest truncate w-full block" title={focusCategory.name}>
                                        Foco: {focusCategory.name}
                                    </span>
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

                            {/* Right: Detailed Metrics */}
                            <div className="w-full md:w-1/2 grid grid-cols-2 gap-3 self-center">
                                {(() => {
                                    const toFinite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
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
                                     <div key={i} className="flex flex-col p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors min-w-0">
                                         <div className="flex items-center gap-1.5 mb-1 opacity-60">
                                             <span className={stat.color}>{stat.icon}</span>
                                             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                                         </div>
                                         <span className={`text-base sm:text-lg font-black ${stat.color} tracking-tight truncate w-full block`} title={stat.val}>
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

            {/* PREMIUM SYSTEM ANALYSIS CARD */}
            <div className="pt-20 relative z-0">
            {(() => {
                const insight = getInsight();
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
                        {/* Decorative Premium Background */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50`} />
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000 -mr-48 -mt-48" />
                        <div className={`absolute bottom-0 left-0 w-[300px] h-[300px] ${colors.circleBg} rounded-full blur-[100px] pointer-events-none -ml-32 -mb-32`} />
                        
                        <div className="flex flex-col lg:flex-row gap-10 items-start p-10 sm:p-14 relative z-10">
                            {/* Icon & Primary Content */}
                            <div className="flex-1 space-y-6">
                                <div className="flex items-start sm:items-center gap-6">
                                    <div className={`shrink-0 w-16 h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-3xl shadow-2xl transform group-hover:rotate-6 transition-transform duration-500 ${colors.icon}`}>
                                        {insight.icon}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${colors.text} drop-shadow-sm`}>
                                                {insight.title}
                                            </span>
                                            <div className="h-px w-10 bg-white/10 hidden sm:block" />
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[8px] font-black text-slate-500 border border-white/5 uppercase tracking-widest">System Engine v4.0</span>
                                        </div>
                                        <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-none">
                                            {insight.text}
                                        </h3>
                                    </div>
                                </div>
                                
                                <p className="text-slate-400 text-base leading-relaxed max-w-3xl font-medium">
                                    {insight.details}
                                </p>
                            </div>

                            {/* Advice / Action Section - REFINED FONT SIZE */}
                            {insight.advice && (
                                <div className="lg:w-[400px] shrink-0">
                                    <div className={`rounded-[2rem] bg-black/60 border ${colors.border} p-10 sm:p-12 relative shadow-2xl group-hover:bg-black/80 transition-all duration-500`}>
                                        {/* Internal glow */}
                                        <div className={`absolute -right-12 -top-12 w-48 h-48 ${colors.glow} opacity-10 blur-3xl pointer-events-none`} />
                                        
                                        <div className="flex items-center gap-2 mb-4 relative z-10">
                                            <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 ${colors.text}`}>
                                                <Zap size={14} fill="currentColor" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] block">Orientação Estratégica</span>
                                        </div>
                                        
                                        <p className={`text-[15px] sm:text-[17px] font-bold leading-relaxed ${colors.text} relative z-10 drop-shadow-lg`}>
                                            {insight.advice}
                                        </p>
                                        
                                        <div className="absolute bottom-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                            <Zap size={80} className={colors.text} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Status Bar */}
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
                            <div className="ml-auto hidden md:flex items-center gap-2 opacity-40 italic lowercase font-medium tracking-normal">
                                <Loader2 size={10} className="animate-spin" />
                                processando dados históricos em tempo real
                            </div>
                        </div>
                    </div>
                );
            })()}
            </div>

            <div className="pt-4">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center px-2">Galeria de Análises Detalhadas</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    <RadarAnalysis radarData={radarData} maxScore={maxScore} unit={unit} />
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
        </div>
    );
}
