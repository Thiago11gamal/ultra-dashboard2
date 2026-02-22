import React, { useState, useMemo } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { computeCategoryStats, calculateWeightedProjectedMean, monteCarloSimulation } from "../engine";

// ── CONFIGURAÇÕES DA INTERFACE ─────────────────────────
const ENGINES = [
    {
        id: "raw", label: "📊 Realidade Bruta", color: "#fb923c", prefix: "raw_", style: "linear",
        explain: { titulo: "A sua montanha-russa de resultados", simples: "Sem filtros. Apenas a porcentagem exata de acertos. Excelente para detectar anomalias.", dica: "Picos isolados não definem sua aprovação. O importante é a tendência geral." },
    },
    {
        id: "raw_weekly", label: "📅 Realidade Semanal", color: "#f472b6", prefix: null, style: "linear",
        explain: { titulo: "Sua evolução semana a semana", simples: "Agrupa todos os simulados por semana. Cada barra mostra a sua taxa de acerto bruta naquela semana.", dica: "Ideal para ver se você está melhorando ao longo das semanas, sem ruído diário." },
    },
    {
        id: "bayesian", label: "🧠 Nível Bayesiano", color: "#34d399", prefix: "bay_", style: "monotone",
        explain: { titulo: "A sua sabedoria consolidada", simples: "O algoritmo não se deixa enganar por dias ruins ou sorte. Ele calcula seu nível real.", dica: "Use esta visão para decidir se já pode avançar de matéria." },
    },
    {
        id: "stats", label: "📐 Média Histórica", color: "#818cf8", prefix: "stats_", style: "basis",
        explain: { titulo: "O peso do seu histórico", simples: "A média de todas as questões já feitas. Serve como uma âncora.", dica: "A média histórica demora a refletir melhorias recentes. Foque no nível Bayesiano." },
    },
    {
        id: "compare", label: "⚡ Raio-X Diagnóstico", color: "#a78bfa", prefix: null, style: "monotone",
        explain: { titulo: "Passado, Presente e Futuro", simples: "A visão mais avançada. Sobrepõe o que fez, seu nível real e projeta o futuro com Monte Carlo.", dica: "Use o seletor 'Focar em' para mergulhar nos detalhes da matéria." },
    },
];

const MOCK_ERRORS = [
    { name: "Falta de Atenção", value: 45, color: "#fb923c", desc: "Erro por pressa" },
    { name: "Falta de Base", value: 30, color: "#ef4444", desc: "Ainda não domina" },
    { name: "Esquecimento", value: 15, color: "#a78bfa", desc: "Deu 'branca'" },
    { name: "Dúvida nas Opções", value: 10, color: "#34d399", desc: "Marcou mal" },
];

export default function EvolutionChart({ categories = [], targetScore = 80 }) {
    // Controles do Gráfico
    const [activeEngine, setActiveEngine] = useState("bayesian");
    const [focusSubjectId, setFocusSubjectId] = useState(categories[0]?.id);

    // BUG FIX (1): Memoize activeCategories so useMemo deps below stay stable
    // Without this, a new array is created every render, causing infinite recalculation.
    const activeCategories = useMemo(
        () => categories.filter(c => c.simuladoStats?.history?.length > 0),
        [categories]
    );

    // BUG FIX (5): Reset focusSubjectId when activeCategories changes and selected is gone
    const focusCategory = useMemo(() => {
        const found = activeCategories.find(c => c.id === focusSubjectId);
        return found || activeCategories[0] || null;
    }, [activeCategories, focusSubjectId]);

    // Build timeline data exactly like the mock, but with REAL engine calls
    const timeline = useMemo(() => {
        if (!activeCategories.length) return [];

        // Collect all distinct dates
        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            (cat.simuladoStats?.history || []).forEach(h => {
                if (h.date) {
                    allDatesSet.add(new Date(h.date).toISOString().split('T')[0]);
                }
            });
        });

        const dates = Array.from(allDatesSet).sort();

        // Object structure mapping: Date string -> category values
        const dataByDate = {};

        dates.forEach((date, i) => {
            const [year, month, day] = date.split("-");
            dataByDate[date] = {
                date,
                displayDate: `${day}/${month}`,
                weekLabel: `Sem ${i + 1}`
            };
        });

        // Loop categories and calculate stats up to each date
        activeCategories.forEach(cat => {
            const history = [...(cat.simuladoStats?.history || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
            if (!history.length) return;

            dates.forEach(date => {
                const historyToDate = history.filter(h => new Date(h.date).toISOString().split('T')[0] <= date);
                if (historyToDate.length === 0) return;

                const last = historyToDate[historyToDate.length - 1];

                // BUG FIX (2): computeCategoryStats expects items with a `score` field,
                // but history items only have `correct` and `total`. Normalize here.
                const historyWithScore = historyToDate.map(h => ({
                    ...h,
                    score: h.total > 0 ? (h.correct / h.total) * 100 : 0
                }));
                const stats = computeCategoryStats(historyWithScore, 100);

                dataByDate[date][`raw_correct_${cat.name}`] = last.correct;
                dataByDate[date][`raw_total_${cat.name}`] = last.total;
                dataByDate[date][`raw_${cat.name}`] = last.total > 0 ? (last.correct / last.total) * 100 : 0;

                // Bayesian and Stats (Engine provides these)
                dataByDate[date][`bay_${cat.name}`] = stats ? calculateWeightedProjectedMean([{ ...stats, weight: 100 }], 100, 0) : 0;
                dataByDate[date][`stats_${cat.name}`] = stats ? stats.mean : 0;
            });
        });

        return dates.map(d => dataByDate[d]);
    }, [activeCategories]);


    // ── DADOS DO HEATMAP (por dia individual: linhas=matérias, colunas=datas) ──
    const heatmapData = useMemo(() => {
        if (!activeCategories.length) return { dates: [], rows: [] };

        const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        // Collect all unique dates that have any data
        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            (cat.simuladoStats?.history || []).forEach(h => {
                if (h.date) allDatesSet.add(new Date(h.date).toISOString().split('T')[0]);
            });
        });

        const sortedDates = Array.from(allDatesSet).sort();

        // Build date column metadata
        const dates = sortedDates.map(dateStr => {
            const d = new Date(`${dateStr}T12:00:00`);
            const [_y, m, day] = dateStr.split('-');
            return {
                key: dateStr,
                dayName: DAY_NAMES[d.getDay()],
                label: `${day}/${m}`,
                isWeekend: d.getDay() === 0 || d.getDay() === 6,
            };
        });

        // Build a row per category
        const rows = activeCategories.map(cat => {
            // Map dateStr -> { correct, total, pct }
            const dayMap = {};
            (cat.simuladoStats?.history || []).forEach(h => {
                if (!h.date) return;
                const key = new Date(h.date).toISOString().split('T')[0];
                if (!dayMap[key]) dayMap[key] = { correct: 0, total: 0 };
                dayMap[key].correct += (h.correct || 0);
                dayMap[key].total += (h.total || 0);
            });

            const cells = sortedDates.map(dateStr => {
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
    }, [activeCategories]);

    const globalMetrics = useMemo(() => {
        let totalQuestions = 0;
        let totalCorrect = 0;

        activeCategories.forEach(cat => {
            (cat.simuladoStats?.history || []).forEach(h => {
                totalQuestions += (h.total || 0);
                totalCorrect += (h.correct || 0);
            });
        });

        const globalAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
        return { totalQuestions, totalCorrect, globalAccuracy };
    }, [activeCategories]);

    const mcProjection = useMemo(() => {
        if (!focusCategory?.simuladoStats?.history) return null;
        const hist = [...focusCategory.simuladoStats.history].sort((a, b) => new Date(a.date) - new Date(b.date));
        if (hist.length < 5) return null;

        const globalHistory = hist.map(h => ({
            date: new Date(h.date).toISOString().split('T')[0],
            score: (h.correct / h.total) * 100,
            weight: 100
        }));

        const result = monteCarloSimulation(globalHistory, targetScore, 7, 500); // Project 7 days
        if (!result) return null;

        const lastDate = new Date(hist[hist.length - 1].date);
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 7);

        return {
            date: nextDate.toISOString().split("T")[0],
            mc_p50: parseFloat(result.mean),
            mc_band: [parseFloat(result.ci95Low), parseFloat(result.ci95High)]
        };
    }, [focusCategory, targetScore]);

    const compareData = useMemo(() => {
        // BUG FIX (4): compareData was returning raw `timeline` when engine !== compare,
        // but chartData = compareData when engine === compare and = timeline otherwise.
        // The early return here was harmless but confusing; the real guard is in chartData.
        if (!focusCategory) return timeline;

        const pts = timeline.map((d) => ({
            ...d,
            "Nota Bruta": d[`raw_${focusCategory.name}`],
            "Nível Bayesiano": d[`bay_${focusCategory.name}`],
            "Média Histórica": d[`stats_${focusCategory.name}`],
        }));

        if (mcProjection) {
            const [year, month, day] = mcProjection.date.split("-");
            pts.push({
                date: mcProjection.date,
                displayDate: `${day}/${month} (Futuro)`,
                "Futuro Provável": mcProjection.mc_p50,
                "Cenário Ruim": mcProjection.mc_band[0],
                "Cenário Ótimo": mcProjection.mc_band[1],
            });
        }
        return pts;
    }, [timeline, focusCategory, mcProjection]); // activeEngine removido: compareData não depende dele

    const chartData = activeEngine === "compare" ? compareData : timeline;

    // --- DADOS PARA OS GRÁFICOS EXTRAS ---
    const radarData = useMemo(() => {
        if (!timeline || timeline.length === 0) return [];
        const lastPoint = timeline[timeline.length - 1];
        return activeCategories.map(cat => ({
            subject: cat.name.split(' ')[0], // Short Name
            nivel: Math.round(lastPoint[`bay_${cat.name}`] || 0),
            meta: targetScore,
        }));
    }, [timeline, activeCategories, targetScore]);

    const volumeData = useMemo(() => {
        if (!focusCategory) return [];
        return timeline.map(d => ({
            date: d.displayDate,
            volume: d[`raw_total_${focusCategory.name}`] || 0,
            rendimento: Math.round(d[`raw_${focusCategory.name}`] || 0)
        }));
    }, [timeline, focusCategory]);

    const subtopicsData = useMemo(() => {
        if (!focusCategory) return [];

        const topicMap = {};
        (focusCategory.simuladoStats?.history || []).forEach(h => {
            (h.topics || []).forEach(t => {
                if (!topicMap[t.name]) topicMap[t.name] = { correct: 0, total: 0 };
                topicMap[t.name].correct += parseInt(t.correct, 10) || 0;
                topicMap[t.name].total += parseInt(t.total, 10) || 0;
            });
        });

        return Object.entries(topicMap).map(([name, data]) => ({
            name: name,
            value: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
        })).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5
    }, [focusCategory]);

    // --- INSIGHTS DO ROBÔ ---
    const getInsightText = () => {
        if (activeEngine !== "compare") return "Selecione a aba 'Raio-X Diagnóstico' para que eu possa avaliar detalhadamente a sua evolução nesta matéria.";
        if (!timeline.length || !focusCategory) return "Ainda não existem dados suficientes.";

        const lastPoint = timeline[timeline.length - 1];
        const raw = lastPoint[`raw_${focusCategory.name}`];
        const bayesian = lastPoint[`bay_${focusCategory.name}`];
        const recentVolume = lastPoint[`raw_total_${focusCategory.name}`];

        // BUG FIX (3): raw or bayesian can be undefined if focusCategory has no data
        // at the last timeline point (another category's date). Guard against crash.
        if (raw == null || bayesian == null) return "Ainda não existem dados suficientes para esta matéria.";

        if (recentVolume > 40 && raw < bayesian - 10) {
            return `⚠️ Alerta de Burnout: Estudante, você fez ${recentVolume} questões esta semana, mas a sua nota (${raw.toFixed(1)}%) despencou. O cansaço é real. Recomendo fortemente uma pausa!`;
        }
        if (raw > bayesian + 8) {
            return `💡 Espetacular! Sua última nota (${raw.toFixed(1)}%) estourou a previsão (${bayesian.toFixed(1)}%). O conhecimento assentou de vez. Pode seguir avançando firme.`;
        } else if (raw < bayesian - 8) {
            return `⚠️ Mantenha a calma. A nota da semana foi ${raw.toFixed(1)}%, mas a estatística me garante que o seu nível real é ${bayesian.toFixed(1)}%. Foi apenas um desvio atípico.`;
        } else {
            return `✅ Estabilidade de Mestre! O seu nível medido (${raw.toFixed(1)}%) crava com o seu domínio real (${bayesian.toFixed(1)}%). É esse o ritmo de aprovação.`;
        }
    };

    const CustomTooltip = ({ active, payload, label, isCompare }) => {
        if (!active || !payload?.length) return null;
        const currentData = chartData.find(d => d.displayDate === label);

        return (
            <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-2xl text-sm min-w-[280px] z-50 backdrop-blur-md">
                <p className="text-slate-300 mb-3 font-bold border-b border-slate-700/80 pb-2 flex items-center justify-between">
                    <span>📅 {label}</span>
                    {currentData?.weekLabel && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{currentData.weekLabel}</span>}
                </p>
                <div className="space-y-3">
                    {payload.map((p, i) => {
                        if (isCompare) {
                            return (
                                <div key={i} className="flex justify-between items-center gap-4">
                                    <span style={{ color: p.color }} className="font-medium text-xs">{p.name}</span>
                                    <span style={{ color: p.color }} className="font-bold">{Number(p.value).toFixed(1)}%</span>
                                </div>
                            );
                        }

                        const subjName = p.name; // activeCategories mapping ensures this is name
                        const rawCorrect = currentData ? currentData[`raw_correct_${subjName}`] : null;
                        const rawTotal = currentData ? currentData[`raw_total_${subjName}`] : null;
                        const rawVal = currentData ? currentData[`raw_${subjName}`] : null;
                        const bayVal = currentData ? currentData[`bay_${subjName}`] : null;
                        const statsVal = currentData ? currentData[`stats_${subjName}`] : null;

                        return (
                            <div key={i} className="flex flex-col bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                                <div className="flex justify-between items-center mb-2">
                                    <span style={{ color: p.color }} className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                        {subjName}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="flex flex-col bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/30">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase">Bruta</span>
                                        <span className="text-xs font-mono text-orange-400 font-bold">{rawVal ? rawVal.toFixed(1) : 0}%</span>
                                    </div>
                                    <div className="flex flex-col bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/30">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase">Histórica</span>
                                        <span className="text-xs font-mono text-blue-400 font-bold">{statsVal ? statsVal.toFixed(1) : 0}%</span>
                                    </div>
                                    <div className="flex flex-col bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/30">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase">Nível Real</span>
                                        <span className="text-xs font-mono text-emerald-400 font-bold">{bayVal ? bayVal.toFixed(1) : 0}%</span>
                                    </div>
                                </div>
                                {rawTotal && (
                                    <div className="text-[9px] text-slate-400 text-right mt-2 flex justify-between items-center px-1">
                                        <span>Último Simulado:</span>
                                        <span><strong className="text-slate-200">{rawCorrect}</strong> / {rawTotal} questões</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const engine = ENGINES.find((e) => e.id === activeEngine);

    if (activeCategories.length === 0) {
        return (
            <div className="glass p-8 text-center rounded-3xl animate-fade-in-down border-l-4 border-slate-700">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                    Gráficos de Evolução
                </h2>
                <p className="text-slate-400">
                    Realize simulados para desbloquear a sua Máquina do Tempo Estatística.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* 1. MÉTRICAS GLOBAIS */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-6 transition-all hover:bg-indigo-950/30 hover:border-indigo-500/40">
                <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">📈 Esforço Acumulado (Total Histórico)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col">
                        <span className="text-4xl font-black text-slate-100">{globalMetrics.totalQuestions.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 mt-1">Questões Resolvidas</span>
                    </div>
                    <div className="flex flex-col border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                        <span className="text-4xl font-black text-green-400">{globalMetrics.totalCorrect.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 mt-1">Acertos Conquistados</span>
                    </div>
                    <div className="flex flex-col border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                        <span className="text-4xl font-black text-indigo-300">{globalMetrics.globalAccuracy.toFixed(1)}%</span>
                        <span className="text-xs text-slate-500 mt-1">Precisão Global (Média Bruta)</span>
                    </div>
                </div>
            </div>

            {/* 2. NÍVEL ATUAL POR DISCIPLINA */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {activeCategories.map(cat => {
                    const currentLevel = timeline.length > 0 ? timeline[timeline.length - 1][`bay_${cat.name}`] : 0;
                    return (
                        <div key={cat.id} className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl hover:border-slate-600 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-lg">{cat.icon}</span>
                                <div className={`w-2 h-2 rounded-full ${currentLevel >= targetScore ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : currentLevel >= 55 ? 'bg-yellow-500 shadow-[0_0_8px_#eab308]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
                            </div>
                            <h3 className="text-slate-400 text-[10px] uppercase tracking-wider font-bold truncate" title={cat.name}>
                                {cat.name}
                            </h3>
                            <p className="text-xl font-bold text-slate-100">{currentLevel ? currentLevel.toFixed(1) : 0}%</p>
                        </div>
                    );
                })}
            </div>

            {/* 3. LENTE DO GRÁFICO (Controlos) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-lg">
                <div className="flex flex-wrap gap-2 md:gap-4 mb-4">
                    {ENGINES.map((eng) => (
                        <button
                            key={eng.id}
                            onClick={() => setActiveEngine(eng.id)}
                            className={`px-4 py-3 rounded-xl text-xs md:text-sm font-semibold transition-all duration-300 flex-1 min-w-[140px]
                      ${activeEngine === eng.id
                                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'} 
                      border`}
                        >
                            {eng.label}
                        </button>
                    ))}
                </div>

                <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
                    <div
                        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500"
                        style={{ backgroundColor: engine.color }}
                    />
                    <h3 className="text-sm font-bold mb-1 flex items-center gap-2 transition-colors duration-500" style={{ color: engine.color }}>
                        {engine.explain.titulo}
                    </h3>
                    <p className="text-slate-300 text-sm mb-3">{engine.explain.simples}</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-lg">
                {/* Título + seletor empilhados */}
                <div className="mb-5">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
                        <span className="text-indigo-400">1.</span> Linha do Tempo (Desempenho Geral)
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800 w-full overflow-x-auto custom-scrollbar">
                        <span className="text-[10px] text-slate-400 uppercase font-bold pl-1 mr-1 whitespace-nowrap">Focar em:</span>
                        {activeCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setFocusSubjectId(cat.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap
                        ${focusSubjectId === cat.id
                                        ? 'shadow-sm transform scale-105'
                                        : 'border-transparent text-slate-500 hover:text-slate-300 opacity-60 hover:opacity-100'}`}
                                style={{
                                    backgroundColor: focusSubjectId === cat.id ? `${cat.color}15` : 'transparent',
                                    borderColor: focusSubjectId === cat.id ? `${cat.color}50` : 'transparent',
                                    color: focusSubjectId === cat.id ? cat.color : undefined
                                }}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── ÁREA DO GRÁFICO / HEATMAP ── */}
                {activeEngine === "raw_weekly" ? (
                    /* HEATMAP: renderizado diretamente como JSX, sem ResponsiveContainer */
                    (() => {
                        const { dates, rows } = heatmapData;
                        const cellColor = (pct) => {
                            if (pct == null) return { bg: 'rgba(255,255,255,0.02)', text: '#64748b', border: '#1e293b' };
                            if (pct >= targetScore) return { bg: 'rgba(34,197,94,0.2)', text: '#4ade80', border: 'rgba(34,197,94,0.4)' };
                            if (pct >= targetScore * 0.8) return { bg: 'rgba(251,191,36,0.15)', text: '#fcd34d', border: 'rgba(251,191,36,0.4)' };
                            if (pct >= targetScore * 0.6) return { bg: 'rgba(251,146,60,0.15)', text: '#fb923c', border: 'rgba(251,146,60,0.4)' };
                            return { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.4)' };
                        };

                        if (!dates.length) return (
                            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                                Nenhum dado encontrado.
                            </div>
                        );

                        return (
                            <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                                {/* Legenda de cores */}
                                <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] text-slate-400">
                                    {[
                                        { bg: 'rgba(239,68,68,0.3)', border: 'rgba(239,68,68,0.5)', label: `< ${Math.round(targetScore * 0.6)}%` },
                                        { bg: 'rgba(251,146,60,0.3)', border: 'rgba(251,146,60,0.5)', label: `${Math.round(targetScore * 0.6)}–${Math.round(targetScore * 0.8)}%` },
                                        { bg: 'rgba(251,191,36,0.3)', border: 'rgba(251,191,36,0.5)', label: `${Math.round(targetScore * 0.8)}–${targetScore}%` },
                                        { bg: 'rgba(34,197,94,0.3)', border: 'rgba(34,197,94,0.5)', label: `≥ ${targetScore}% ✓ meta` },
                                    ].map(item => (
                                        <span key={item.label} className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: item.bg, border: `1px solid ${item.border}` }} />
                                            {item.label}
                                        </span>
                                    ))}
                                </div>

                                {/* Grid */}
                                <div style={{ minWidth: `${dates.length * 72 + 168}px` }}>
                                    {/* Cabeçalho: dia da semana + data */}
                                    <div style={{ display: 'grid', gridTemplateColumns: `168px repeat(${dates.length}, 68px)`, gap: '4px' }} className="mb-2">
                                        <div />
                                        {dates.map(d => (
                                            <div key={d.key} className="flex flex-col items-center gap-0.5">
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${d.isWeekend ? 'text-purple-400' : 'text-slate-500'}`}>
                                                    {d.dayName}
                                                </span>
                                                <span className="text-[10px] font-mono font-bold text-slate-300">{d.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Linhas por matéria */}
                                    <div className="space-y-2">
                                        {rows.map(({ cat, cells }) => (
                                            <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: `168px repeat(${dates.length}, 68px)`, gap: '4px', alignItems: 'center' }}>
                                                {/* Label da matéria */}
                                                <div className="flex items-center gap-2 pr-3 min-w-0">
                                                    <span className="text-lg shrink-0">{cat.icon}</span>
                                                    <span className="text-xs font-bold truncate" style={{ color: cat.color }} title={cat.name}>
                                                        {cat.name}
                                                    </span>
                                                </div>

                                                {/* Células */}
                                                {cells.map((cell, ci) => {
                                                    const col = cellColor(cell?.pct);
                                                    return (
                                                        <div
                                                            key={ci}
                                                            className="relative group rounded-lg flex flex-col items-center justify-center py-2 transition-all hover:scale-105 hover:z-20 cursor-default"
                                                            style={{
                                                                background: col.bg,
                                                                border: `1px solid ${col.border}`,
                                                                minHeight: '48px',
                                                            }}
                                                        >
                                                            {cell ? (
                                                                <>
                                                                    <span className="text-[12px] font-black leading-none" style={{ color: col.text }}>
                                                                        {cell.pct.toFixed(0)}%
                                                                    </span>
                                                                    <span className="text-[8px] text-slate-500 font-mono mt-0.5">
                                                                        {cell.correct}/{cell.total}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-700 text-[11px]">—</span>
                                                            )}

                                                            {/* Tooltip hover */}
                                                            {cell && (
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:flex flex-col items-start bg-slate-900 border border-slate-700 rounded-xl p-2.5 shadow-2xl whitespace-nowrap pointer-events-none text-left">
                                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">{dates[ci].dayName}, {dates[ci].label}</span>
                                                                    <span className="text-[11px] font-black" style={{ color: col.text }}>{cell.pct.toFixed(1)}%</span>
                                                                    <span className="text-[9px] text-slate-500">{cell.correct} certos / {cell.total} questões</span>
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
                    })()
                ) : (
                    /* GRÁFICOS RECHARTS: dentro do ResponsiveContainer */
                    <div className="h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {activeEngine !== "compare" ? (
                                <LineChart data={chartData} margin={{ top: 20, right: 10, left: -25, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="displayDate" stroke="#475569" tick={{ fontSize: 10 }} dy={10} axisLine={false} tickLine={false} minTickGap={20} />
                                    <YAxis stroke="#475569" tick={{ fontSize: 11 }} dx={-5} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                    <ReferenceLine y={targetScore} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: `Meta (${targetScore}%)`, fill: "#22c55e", fontSize: 10, position: "insideBottomLeft" }} />
                                    <Tooltip content={<CustomTooltip chartData={chartData} isCompare={false} />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                    {activeCategories.map((cat) => {
                                        const isFocused = focusSubjectId === cat.id;
                                        return (
                                            <Line
                                                key={cat.id}
                                                type={engine.style}
                                                dataKey={engine.prefix ? `${engine.prefix}${cat.name}` : `raw_${cat.name}`}
                                                name={cat.name}
                                                stroke={cat.color}
                                                strokeWidth={isFocused ? 3.5 : 2}
                                                strokeOpacity={isFocused ? 1 : 0.75}
                                                dot={{ r: isFocused ? 5 : 4, fill: cat.color, stroke: "#0f172a", strokeWidth: 1.5 }}
                                                activeDot={{ r: isFocused ? 8 : 7, strokeWidth: 2, stroke: "#0f172a" }}
                                                connectNulls
                                            />
                                        );
                                    })}
                                </LineChart>
                            ) : (
                                <ComposedChart data={compareData} margin={{ top: 20, right: 10, left: -25, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="displayDate" stroke="#475569" tick={{ fontSize: 10 }} dy={10} axisLine={false} tickLine={false} minTickGap={20} />
                                    <YAxis stroke="#475569" tick={{ fontSize: 11 }} dx={-5} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                    <ReferenceLine y={targetScore} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: `Meta (${targetScore}%)`, fill: "#22c55e", fontSize: 10, position: "insideBottomLeft" }} />
                                    <Tooltip content={<CustomTooltip chartData={chartData} isCompare={true} />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="Cenário Ótimo" fill="#818cf815" stroke="none" />
                                    <Area type="monotone" dataKey="Cenário Ruim" fill="#0f172a" stroke="none" />
                                    <Line type="monotone" dataKey="Nota Bruta" stroke="#fb923c" strokeWidth={1.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                                    <Line type="monotone" dataKey="Média Histórica" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                                    <Line type="monotone" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={3.5} dot={{ r: 2 }} connectNulls />
                                    <Line type="monotone" dataKey="Futuro Provável" stroke="#a78bfa" strokeWidth={2.5} strokeDasharray="6 6" dot={{ r: 5, fill: "#a78bfa", stroke: "#0f172a", strokeWidth: 2 }} connectNulls />
                                </ComposedChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* 5. AVALIAÇÃO DO BOT */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🤖</div>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-indigo-300">
                    A Minha Leitura dos Dados
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm md:text-base relative z-10">
                    {getInsightText()}
                </p>
            </div>

            {/* 6. GALERIA DE GRÁFICOS AVANÇADOS REUNIDOS! */}
            <div className="mt-16 pt-8 border-t border-slate-800/80">
                <h2 className="text-2xl font-extrabold text-slate-100 mb-2 flex items-center gap-3">
                    <span className="text-indigo-400">🔍</span> Galeria de Análises Detalhadas
                </h2>
                <p className="text-sm text-slate-400 mb-6">Todos os modelos estatísticos ativos. Os gráficos com o ícone 🎯 respondem à disciplina focada: <strong style={{ color: focusCategory?.color }}>{focusCategory?.name}</strong>.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* 1. GRÁFICO DE RADAR */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg hover:border-slate-700 transition-colors">
                        <h3 className="text-base font-bold text-slate-200 mb-1">🕸️ Raio-X do Equilíbrio Geral</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#334155" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Meta Desejada" dataKey="meta" stroke="#22c55e" strokeDasharray="3 3" fill="none" />
                                    <Radar name="O Teu Nível" dataKey="nivel" stroke="#818cf8" strokeWidth={2} fill="#818cf8" fillOpacity={0.3} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. GRÁFICO BARRA + LINHA */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg hover:border-slate-700 transition-colors">
                        <h3 className="text-base font-bold text-slate-200 mb-1">📊 Volume vs Rendimento 🎯</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={volumeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                                    <YAxis yAxisId="left" stroke="#475569" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#475569" tick={false} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: 10 }} />
                                    <Bar yAxisId="right" name="Qtd. Questões" dataKey="volume" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={14} />
                                    <Line yAxisId="left" name="% Acertos" type="monotone" dataKey="rendimento" stroke={focusCategory?.color} strokeWidth={3} dot={{ r: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. GRÁFICO DE ROSCA */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col items-center hover:border-slate-700 transition-colors">
                        <div className="w-full">
                            <h3 className="text-base font-bold text-slate-200 mb-1">🍩 Mapeamento de Erros</h3>
                        </div>
                        <div className="h-[220px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={MOCK_ERRORS} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                        {MOCK_ERRORS.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `${value}%`} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            {MOCK_ERRORS.map(err => (
                                <div key={err.name} className="flex flex-col gap-1 text-[10px]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: err.color }}></div>
                                        <span className="text-slate-300 font-bold">{err.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. GRÁFICO DE BARRAS HORIZONTAIS */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg hover:border-slate-700 transition-colors">
                        <h3 className="text-base font-bold text-slate-200 mb-1">📏 Subtópicos 🎯</h3>
                        <div className="h-[250px]">
                            {subtopicsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={subtopicsData} layout="vertical" margin={{ top: 0, right: 20, left: 35, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                        <XAxis type="number" domain={[0, 100]} stroke="#475569" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" stroke="#cbd5e1" tick={{ fontSize: 10, fill: '#cbd5e1' }} axisLine={false} tickLine={false} width={110} />
                                        <Tooltip formatter={(value) => [`${value}%`, 'Acerto']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                                        <ReferenceLine x={targetScore} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.3} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                                            {subtopicsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.value < 50 ? '#ef4444' : entry.value < targetScore ? '#fbbf24' : '#22c55e'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum subtópico detalhado ainda.</div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}
