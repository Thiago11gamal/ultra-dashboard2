import React, { useState, useMemo, useEffect } from "react";
import { 
    monteCarloSimulation, 
    computeCategoryStats, 
    calculateCurrentWeightedMean, 
    computeBayesianLevel, 
    calculateVolatility,
    runMonteCarloAnalysis 
} from "../engine";
import { useChartData } from "../hooks/useChartData";
import { EvolutionHeatmap } from "./charts/EvolutionHeatmap";
import { getDateKey, normalizeDate } from "../utils/dateHelper";
import { getSafeScore } from "../utils/scoreHelper";
import { exportComponentAsPDF } from "../utils/pdfExport";
import { Download, Loader2, Zap, Target, BarChart3, TrendingUp } from "lucide-react";
import { useMonteCarloWorker } from "../hooks/useMonteCarloWorker";
import { GaussianPlot } from "./charts/GaussianPlot";

const EMPTY_ARRAY = [];

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
];

export default function EvolutionChart({ categories = [], targetScore = 80, goalDate, monteCarloHistory = [] }) {
    const [activeEngine, setActiveEngine] = useState("bayesian");
    const [focusSubjectId, setFocusSubjectId] = useState(() => categories[0]?.id);
    const { timeline, heatmapData, globalMetrics, activeCategories } = useChartData(categories);
    const { runAnalysis } = useMonteCarloWorker();
    const [mcLoading, setMcLoading] = useState(false);

    const projectDays = useMemo(() => {
        if (!goalDate) return 30;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let goal;
        if (typeof goalDate === 'string' && goalDate.includes('T')) {
            const g = new Date(goalDate);
            goal = new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate());
        } else {
            goal = new Date(goalDate);
        }
        goal.setHours(0, 0, 0, 0);
        if (isNaN(goal.getTime())) return 30;
        const diffDays = Math.ceil((goal - now) / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }, [goalDate]);
    
    const [showOnlyFocus, setShowOnlyFocus] = useState(false);
    const [timeWindow, setTimeWindow] = useState("all");
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (!categories.length) return;
        if (!focusSubjectId || !categories.some(c => c.id === focusSubjectId)) {
            if (categories.length > 0) {
                setFocusSubjectId(categories[0].id);
            }
        }
    }, [categories, focusSubjectId]);

    const focusCategory = useMemo(() => {
        const found = categories.find(c => c.id === focusSubjectId);
        return found || categories[0] || null;
    }, [categories, focusSubjectId]);

    const categoryLevels = useMemo(() => {
        const map = {};
        const lastPoint = timeline.length > 0 ? timeline[timeline.length - 1] : null;

        categories.forEach(cat => {
            const fromTimeline = lastPoint?.[`bay_${cat.name}`];
            if (fromTimeline != null) { 
                map[cat.id] = fromTimeline;
                return;
            }
            const history = cat.simuladoStats?.history || [];
            if (!history.length) { map[cat.id] = 0; return; }
            const stats = computeCategoryStats(history, 100);
            if (!stats) { map[cat.id] = 0; return; }
            map[cat.id] = calculateCurrentWeightedMean([{ ...stats, weight: 100 }], 100);
        });
        return map;
    }, [categories, timeline]);

    // PREMIUM INTEGRATION - Monte Carlo Data State
    const [mcResult, setMcResult] = useState(null);
    const [mcProjectionSeries, setMcProjectionSeries] = useState(null);

    const historyArray = focusCategory?.simuladoStats?.history ?? EMPTY_ARRAY;
    const historyHash = useMemo(() =>
        historyArray.map(h => `${h.date}:${h.score ?? h.correct}`).join('|'),
        [focusCategory?.id, focusCategory?.simuladoStats?.history]
    );

    useEffect(() => {
        setMcProjectionSeries(null);
        if (!focusCategory?.simuladoStats?.history) return;
        
        const hist = [...focusCategory.simuladoStats.history]
            .map(h => {
                const dateKey = getDateKey(h.date);
                const score = getSafeScore(h);
                if (!dateKey || !Number.isFinite(score)) return null;
                return { date: dateKey, score, correct: h.correct, total: h.total };
            })
            .filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
            
        if (hist.length < 2) return;
        
        let cancelled = false;
        
        (async () => {
            setMcLoading(true);
            try {
                const bayesian = computeBayesianLevel(hist);
                const vol = calculateVolatility(hist);
                
                // WORKER UPGRADE: Using parallel worker with 5000 simulations
                const result = await runAnalysis({
                    values: hist.map(h => h.score),
                    dates: hist.map(h => h.date),
                    meta: targetScore,
                    simulations: 5000,
                    projectionDays: projectDays,
                    forcedVolatility: vol,
                    currentMean: bayesian ? bayesian.mean : undefined,
                    forcedBaseline: bayesian ? bayesian.mean : undefined,
                });

                if (cancelled || !result) return;
                
                setMcResult(result);

                const lastDate = new Date(hist[hist.length - 1].date);
                if (Number.isNaN(lastDate.getTime())) return;
                const nextDate = new Date(lastDate);
                nextDate.setDate(nextDate.getDate() + projectDays);
                
                const p50 = parseFloat(result.projectedMean || result.mean);
                const lo = parseFloat(result.ci95Low);
                const hi = parseFloat(result.ci95High);
                
                if (!Number.isFinite(p50) || !Number.isFinite(lo) || !Number.isFinite(hi)) return;
                
                setMcProjectionSeries({ 
                    date: nextDate.toISOString().split("T")[0], 
                    mc_p50: p50, 
                    mc_band: [lo, hi] 
                });
            } catch (err) {
                console.warn('[EvolutionChart] Worker MC falhou, tentando sync:', err);
                // Sync fallback handled by hook itself, so we just log.
            } finally {
                if (!cancelled) setMcLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [focusCategory?.id, historyHash, targetScore, projectDays, runAnalysis]);

    const compareData = useMemo(() => {
        if (!focusCategory) return timeline;
        let pts = timeline.map((d) => ({ 
            ...d, 
            "Nota Bruta": d[`raw_${focusCategory.name}`], 
            "Nível Bayesiano": d[`bay_${focusCategory.name}`], 
            "Bay CI Low": d[`bay_ci_low_${focusCategory.name}`], 
            "Bay CI High": d[`bay_ci_high_${focusCategory.name}`], 
            "Banda Bayesiana": d[`bay_ci_low_${focusCategory.name}`] != null ? [d[`bay_ci_low_${focusCategory.name}`], d[`bay_ci_high_${focusCategory.name}`]] : null, 
            "Média Histórica": d[`stats_${focusCategory.name}`] 
        }));
        
        if (mcProjectionSeries && pts.length > 0) {
            const lastIdx = pts.length - 1;
            const currentLevel = pts[lastIdx]["Nível Bayesiano"] ?? pts[lastIdx]["Nota Bruta"] ?? categoryLevels[focusCategory?.id] ?? mcProjectionSeries?.mc_p50 ?? 0;
            const futurePoints = [];
            const steps = 6;
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const weight = Math.sqrt(t); 
                const val = currentLevel + (mcProjectionSeries.mc_p50 - currentLevel) * t;
                const bandLow = currentLevel + (mcProjectionSeries.mc_band[0] - currentLevel) * weight;
                const bandHigh = currentLevel + (mcProjectionSeries.mc_band[1] - currentLevel) * weight;

                const [year, month, day] = pts[lastIdx].date.split('-');
                const interDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
                interDate.setDate(interDate.getDate() + Math.round(projectDays * t));

                const yFut = interDate.getFullYear();
                const mFut = String(interDate.getMonth() + 1).padStart(2, '0');
                const dFut = String(interDate.getDate()).padStart(2, '0');
                const iso = `${yFut}-${mFut}-${dFut}`;

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
    }, [timeline, focusCategory, mcProjectionSeries, categoryLevels, projectDays]);

    const chartData = activeEngine === "compare" ? compareData : timeline;

    const filteredChartData = useMemo(() => {
        if (timeWindow === "all") return chartData;
        const days = Number.parseInt(timeWindow, 10);
        if (!Number.isFinite(days) || days <= 0 || chartData.length === 0) return chartData;
        const getDateMs = (item) => { if (!item?.date) return Number.NaN; const ms = new Date(item.date).getTime(); return Number.isNaN(ms) ? Number.NaN : ms; };
        const lastValid = [...timeline].reverse().find(d => Number.isFinite(getDateMs(d)));
        if (!lastValid) return chartData;
        const limit = getDateMs(lastValid) - (days * 24 * 60 * 60 * 1000);
        return chartData.filter(d => { const ms = getDateMs(d); return Number.isFinite(ms) && ms >= limit; });
    }, [chartData, timeWindow, timeline]);

    const radarData = useMemo(() => {
        if (!categories || !categories.length) return [];
        return categories.map(cat => ({
            subject: cat.name.replace(/Direito /gi, 'D. ').substring(0, 15),
            nivel: Math.round(categoryLevels[cat.id] || 0),
            meta: targetScore
        }));
    }, [categories, targetScore, categoryLevels]);

    const subjectAggData = useMemo(() => {
        if (!categories || !categories.length) return [];
        return categories
            .filter(cat => !showOnlyFocus || cat.id === focusSubjectId)
            .map(cat => {
                const history = cat.simuladoStats?.history || [];
                const totalQ = history.reduce((s, h) => s + (Number(h.total) || 0), 0);
                const totalCorrect = Math.round(history.reduce((s, h) => {
                    const raw = Number(h.correct) || 0;
                    const tot = Number(h.total) || 0;
                    return s + (h.isPercentage ? (raw / 100) * tot : raw);
                }, 0));
                const shortName = cat.name.length > 18 ? cat.name.substring(0, 16) + '…' : cat.name;
                return { name: shortName, fullName: cat.name, questoes: totalQ, acertos: totalCorrect, color: cat.color, id: cat.id };
            })
            .filter(d => d.questoes > 0)
            .sort((a, b) => b.questoes - a.questoes);
    }, [categories, showOnlyFocus, focusSubjectId]);

    const getInsightText = () => {
        if (!timeline.length || !focusCategory) return "Ainda não existem dados suficientes.";
        const lastPoint = timeline[timeline.length - 1];
        const raw = lastPoint[`raw_${focusCategory.name}`];
        const bayesian = lastPoint[`bay_${focusCategory.name}`];

        if (activeEngine === "raw") {
            if (raw == null) return "Ainda não existem dados suficientes para esta matéria.";
            const history = focusCategory.simuladoStats?.history || [];
            const scores = history.map(h => getSafeScore(h)).filter(Number.isFinite);
            if (scores.length < 2) return `📊 Nota atual: ${raw.toFixed(1)}%. Faça mais simulados para analisar a volatilidade.`;
            const recentScores = scores.slice(-5);
            const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
            const maxSwing = Math.max(...recentScores) - Math.min(...recentScores);
            if (maxSwing > 25) return `⚠️ Alta volatilidade! Seus últimos resultados oscilam ${maxSwing.toFixed(0)}pp (${Math.min(...recentScores).toFixed(0)}%–${Math.max(...recentScores).toFixed(0)}%). Revise a consistência de estudo.`;
            if (maxSwing < 8) return `✅ Excelente consistência! Variação de apenas ${maxSwing.toFixed(0)}pp nos últimos simulados. Média recente: ${avg.toFixed(1)}%.`;
            return `📊 Volatilidade moderada (${maxSwing.toFixed(0)}pp). Média recente: ${avg.toFixed(1)}%. Continue praticando para estabilizar.`;
        }

        if (activeEngine === "bayesian") {
            if (bayesian == null) return "Ainda não existem dados suficientes para esta matéria.";
            const ciLow = lastPoint[`bay_ci_low_${focusCategory.name}`];
            const ciHigh = lastPoint[`bay_ci_high_${focusCategory.name}`];
            const ciWidth = (ciHigh != null && ciLow != null) ? (ciHigh - ciLow) : null;
            if (ciWidth != null && ciWidth < 5) return `🧠 Alta confiança! IC 95%: [${ciLow.toFixed(1)}%, ${ciHigh.toFixed(1)}%] (banda de ${ciWidth.toFixed(1)}pp). Seu nível real é ${bayesian.toFixed(1)}% com excelente precisão.`;
            if (ciWidth != null && ciWidth > 20) return `🧠 Incerteza elevada. IC 95%: [${ciLow.toFixed(1)}%, ${ciHigh.toFixed(1)}%] (banda de ${ciWidth.toFixed(1)}pp). Faça mais simulados para estreitar a estimativa.`;
            return `🧠 Nível Bayesiano: ${bayesian.toFixed(1)}%. ${ciWidth != null ? `IC 95%: ${ciLow.toFixed(1)}%–${ciHigh.toFixed(1)}% (${ciWidth.toFixed(1)}pp).` : ''} Convergindo bem.`;
        }

        if (activeEngine === "stats") {
            const stats = lastPoint[`stats_${focusCategory.name}`];
            if (stats == null) return "Ainda não existem dados suficientes para esta matéria.";
            const trend = lastPoint[`trend_status_${focusCategory.name}`];
            const gap = bayesian != null ? (bayesian - stats) : null;
            const gapText = gap != null ? ` Gap vs Bayesiano: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}pp.` : '';
            if (trend === 'up') return `📐 Média histórica: ${stats.toFixed(1)}%. Tendência de alta detectada — sua curva de aprendizado está funcionando!${gapText}`;
            if (trend === 'down') return `📐 Média histórica: ${stats.toFixed(1)}%. Tendência de queda detectada. Revise os tópicos mais fracos.${gapText}`;
            return `📐 Média histórica: ${stats.toFixed(1)}%. Tendência estável — consistência sólida.${gapText}`;
        }

        if (activeEngine === "raw_weekly") {
            const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const dayStats = {};
            categories.forEach(cat => {
                (cat.simuladoStats?.history || []).forEach(h => {
                    const d = normalizeDate(h.date);
                    if (!d) return;
                    const dow = d.getDay();
                    if (!dayStats[dow]) dayStats[dow] = { correct: 0, total: 0 };
                    dayStats[dow].correct += (Number(h.correct) || 0);
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
                return `📅 Melhor dia: ${DAY_NAMES[best.dow]} (${best.pct.toFixed(1)}%, ${best.total}q). Pior dia: ${DAY_NAMES[worst.dow]} (${worst.pct.toFixed(1)}%, ${worst.total}q). Alinhe seus simulados mais densos ao dia de melhor rendimento.`;
            }
            return "📅 O Mapa de Calor mostra sua evolução visual semana a semana. Células verdes indicam acima da meta, vermelhas abaixo.";
        }

        if (raw == null || bayesian == null) return "Ainda não existem dados suficientes para esta matéria.";

        const nowMs = new Date().getTime();
        const lastDate = new Date(lastPoint.date);
        const daysAgo = Math.floor((nowMs - lastDate.getTime()) / 86400000);
        const timeText = daysAgo === 0 ? "hoje" : daysAgo === 1 ? "ontem" : daysAgo <= 7 ? "da semana" : daysAgo <= 30 ? "do mês" : `de ${daysAgo} dias atrás`;

        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const recentVolumeAlert = (focusCategory.simuladoStats?.history || [])
            .filter(h => { const d = new Date(h.date).getTime(); return !isNaN(d) && nowMs - d <= sevenDaysMs; })
            .reduce((sum, h) => sum + (parseInt(h.total, 10) || 0), 0);

        if (recentVolumeAlert > 40 && raw < bayesian - 10) return `⚠️ Alerta de Burnout: Você fez ${recentVolumeAlert} questões nos últimos 7 dias, mas a nota (${raw.toFixed(1)}%) despencou. O cansaço é real. Recomendo uma pausa!`;
        if (raw > bayesian + 8) return `💡 Espetacular! Sua última nota (${raw.toFixed(1)}%) estourou a previsão (${bayesian.toFixed(1)}%). O conhecimento assentou de vez. Pode seguir avançando firme.`;
        if (raw < bayesian - 8) return `⚠️ Mantenha a calma. A nota ${timeText} foi ${raw.toFixed(1)}%, mas a estatística garante que o seu nível real é ${bayesian.toFixed(1)}%. Foi apenas um desvio atípico.`;
        return `✅ Estabilidade de Mestre! O seu nível medido (${raw.toFixed(1)}%) crava com o seu domínio real (${bayesian.toFixed(1)}%). É esse o ritmo de aprovação.`;
    };

    const engine = ENGINES.find((e) => e.id === activeEngine);

    const handleExport = async () => {
        setIsExporting(true);
        await exportComponentAsPDF('evolution-chart-container', 'RaioX_Evolucao_Dashboard.pdf', 'landscape');
        setIsExporting(false);
    };

    const isMcEngine = activeEngine === "compare" || activeEngine === "mc_density";

    if (categories.length === 0) {
        return (
            <div className="glass p-12 text-center rounded-3xl animate-fade-in-down border border-slate-800">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">Gráficos de Evolução</h2>
                <p className="text-slate-400">Realize simulados para desbloquear a sua Máquina do Tempo Estatística.</p>
            </div>
        );
    }

    return (
        <div id="evolution-chart-container" className="space-y-6 animate-fade-in relative">
            <div className="flex justify-end mb-[-10px] sm:mb-[-20px] relative z-20 no-print pr-1">
                <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-[10px] sm:text-xs font-bold transition-all border border-indigo-500/30 disabled:opacity-50"
                >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    <span className="hidden sm:inline">{isExporting ? 'Gerando PDF...' : 'Baixar PDF'}</span>
                    <span className="sm:hidden">PDF</span>
                </button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .recharts-wrapper:focus, .recharts-surface:focus, svg:focus { outline: none !important; border: none !important; box-shadow: none !important; }
                .recharts-wrapper { outline: none !important; }
            ` }} />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 min-w-0">
                <KpiCard value={globalMetrics.totalQuestions.toLocaleString()} label="Questões" color="#818cf8" icon="📚" />
                <KpiCard value={globalMetrics.totalCorrect.toLocaleString()} label="Acertos" color="#34d399" icon="🎯" />
                <div className="col-span-2 sm:col-span-1">
                    <KpiCard 
                        value={`${globalMetrics.globalAccuracy.toFixed(1)}%`} 
                        label="Precisão Global" color="#fb923c" icon="⚡"
                    />
                </div>
            </div>

            <div className="relative z-10">
                <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-black tracking-[0.15em] leading-loose py-2 sm:py-4 mb-0 sm:mb-1 pl-1">
                    Nível Bayesiano por Disciplina • clique para focar
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 overflow-visible">
                    {categories.map(cat => (
                        <DisciplinaCard 
                            key={cat.id} 
                            cat={cat} 
                            level={categoryLevels[cat.id] || 0} 
                            target={targetScore} 
                            isFocused={focusSubjectId === cat.id} 
                            onClick={() => setFocusSubjectId(cat.id)} 
                        />
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 backdrop-blur p-3 sm:p-5 shadow-xl w-full min-w-0 transition-all duration-500">
                <div className="flex overflow-x-auto pb-2 sm:pb-4 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 sm:pb-5 sm:flex-wrap gap-2 w-full mobile-edge-fade">
                    {ENGINES.map((eng) => {
                        const active = activeEngine === eng.id;
                        return (
                            <button key={eng.id} onClick={() => setActiveEngine(eng.id)}
                                className={`shrink-0 w-max group flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-300 border ${active ? 'shadow-lg' : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600'}`}
                                style={active ? { backgroundColor: `${eng.color}18`, borderColor: `${eng.color}55`, color: eng.color, boxShadow: `0 0 20px ${eng.color}22` } : {}}>
                                <span className="text-base">{eng.emoji}</span>
                                <span>{eng.label}</span>
                                {active && <span className="w-1.5 h-1.5 rounded-full ml-1 animate-pulse" style={{ backgroundColor: eng.color }} />}
                            </button>
                        );
                    })}
                </div>

                <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-3 sm:p-4 mb-3 sm:mb-5 relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors duration-500" style={{ backgroundColor: engine.color }} />
                    <p className="font-bold text-xs sm:text-sm mb-0.5 sm:mb-1 transition-colors duration-300" style={{ color: engine.color }}>
                        {engine.emoji} {engine.explain.titulo}
                    </p>
                    <p className="text-slate-400 text-[10px] sm:text-xs leading-relaxed">{engine.explain.simples}</p>
                    <p className="text-slate-500 text-[9px] sm:text-xs mt-1 sm:mt-1.5 italic">💡 {engine.explain.dica}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-5 w-full">
                    <div className="flex items-center justify-between gap-1 bg-slate-950/60 border border-slate-800/70 rounded-xl p-1 shrink-0 overflow-x-auto w-full sm:w-auto">
                        <span className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-wider px-2 shrink-0">Período</span>
                        {[{ label: '30d', value: '30' }, { label: '60d', value: '60' }, { label: '90d', value: '90' }, { label: 'Tudo', value: 'all' }].map(w => (
                            <button key={w.value} onClick={() => setTimeWindow(w.value)}
                                className={`shrink-0 flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${timeWindow === w.value ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/40' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                                {w.label}
                            </button>
                        ))}
                    </div>

                    <button onClick={() => setShowOnlyFocus(!showOnlyFocus)}
                        className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold border transition-all w-full sm:w-auto ${showOnlyFocus ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'}`}>
                        <span>{showOnlyFocus ? '🔍' : '👁'}</span>
                        <span className="truncate">
                            {showOnlyFocus ? `Apenas ${focusCategory?.name || 'Foco'}` : 'Todas as Matérias'}
                        </span>
                    </button>
                </div>

                {activeEngine === "raw_weekly" ? (
                    <EvolutionHeatmap heatmapData={heatmapData} targetScore={targetScore} />
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
                    />
                ) : filteredChartData.length < 2 ? (
                    <div className="h-[340px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30">
                        <span className="text-5xl">🔥</span>
                        <div className="text-center">
                            <p className="text-slate-300 font-bold text-base mb-1">Dados insuficientes para desenhar a linha</p>
                            <p className="text-slate-500 text-sm max-w-xs">Registre pelo menos <span className="text-indigo-400 font-bold">2 simulados</span> para desbloquear os gráficos de evolução.</p>
                        </div>
                    </div>
                ) : activeEngine === "compare" ? (
                    <div className="relative">
                        {mcLoading && (
                            <div className="absolute inset-0 z-20 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl transition-all duration-300">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                                    <span className="text-[10px] font-black uppercase text-indigo-300 tracking-[0.2em] animate-pulse">Sincronizando Monte Carlo...</span>
                                </div>
                            </div>
                        )}
                        <CompareChart 
                            filteredChartData={filteredChartData} 
                            targetScore={targetScore} 
                            categories={categories} 
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
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap size={16} className="text-indigo-400" />
                                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                                        Foco: {focusCategory.name}
                                    </span>
                                </div>
                                <div className="h-40 w-full mb-2">
                                    <GaussianPlot 
                                        mean={mcResult?.projectedMean || mcResult?.mean || 0}
                                        sd={mcResult?.sd || 0}
                                        sdLeft={mcResult?.sdLeft || mcResult?.sd}
                                        sdRight={mcResult?.sdRight || mcResult?.sd}
                                        low95={mcResult?.ci95Low || 0}
                                        high95={mcResult?.ci95High || 0}
                                        targetScore={targetScore}
                                        prob={mcResult?.probability || 0}
                                        kdeData={mcResult?.kdeData}
                                    />
                                </div>
                            </div>

                            {/* Right: Detailed Metrics */}
                            <div className="w-full md:w-1/2 grid grid-cols-2 gap-3 self-center">
                                {[
                                    { label: 'Caminho Sucesso', val: `${Number(mcResult?.probability || 0).toFixed(1)}%`, icon: <Target size={14} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                    { label: 'Nível Projetado', val: `${Number(mcResult?.projectedMean || 0).toFixed(1)}%`, icon: <TrendingUp size={14} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                    { label: 'Margem de Erro', val: `±${Number(mcResult?.sd || 0).toFixed(1)}%`, icon: <BarChart3 size={14} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                                    { label: 'Confiança 95%', val: `${Math.round(mcResult?.ci95Low || 0)}-${Math.round(mcResult?.ci95High || 0)}%`, icon: <Zap size={14} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10' }
                                ].map((stat, i) => (
                                    <div key={i} className="flex flex-col p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-1.5 mb-1 opacity-60">
                                            <span className={stat.color}>{stat.icon}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                                        </div>
                                        <span className={`text-lg font-black ${stat.color} tracking-tight`}>{stat.val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {!mcResult && !mcLoading && (
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

            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 p-5 shadow-lg group hover:shadow-[0_0_30px_rgba(99,102,241,0.12)] transition-all duration-500">
                <div className="absolute -top-6 -right-6 text-8xl opacity-[0.06] group-hover:opacity-[0.1] group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 select-none pointer-events-none">🤖</div>
                <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-2">Análise do sistema</p>
                <p className="text-slate-300 leading-relaxed text-sm relative z-10">{getInsightText()}</p>
            </div>

            <div className="pt-4">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Galeria de Análises Detalhadas</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    <RadarAnalysis radarData={radarData} />
                    <PerformanceBarChart 
                        subjectAggData={subjectAggData} 
                        showOnlyFocus={showOnlyFocus} 
                        focusCategory={focusCategory} 
                    />
                    <CriticalTopicsAnalysis 
                        categories={categories} 
                    />
                </div>
            </div>
        </div>
    );
}
