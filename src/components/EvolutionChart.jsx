import React, { useState, useMemo, useEffect } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend, Area, ComposedChart,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, LabelList, Cell
} from "recharts";
import { monteCarloSimulation } from "../engine";
import { useChartData } from "../hooks/useChartData";
import { ChartTooltip } from "./charts/ChartTooltip";
import { EvolutionHeatmap } from "./charts/EvolutionHeatmap";
import { getSafeScore } from "../utils/scoreHelper";

// ── HELPERS ──────────────────────────────────────────────
const getDateKey = (rawDate) => {
    if (!rawDate) return null;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return null;
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

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
        id: "bayesian", label: "Nível Bayesiano", emoji: "🧠", color: "#34d399", prefix: "bay_", style: "monotone",
        explain: { titulo: "A sua sabedoria consolidada", simples: "O algoritmo não se deixa enganar por dias ruins ou sorte. Ele calcula seu nível real.", dica: "Use esta visão para decidir se já pode avançar de matéria." },
    },
    {
        id: "stats", label: "Média Histórica", emoji: "📐", color: "#818cf8", prefix: "stats_", style: "basis",
        explain: { titulo: "O peso do seu histórico", simples: "A média de todas as questões já feitas. Serve como uma âncora.", dica: "A média histórica demora a refletir melhorias recentes. Foque no nível Bayesiano." },
    },
    {
        id: "compare", label: "Raio-X + Monte Carlo", emoji: "⚡", color: "#a78bfa", prefix: null, style: "monotone",
        explain: { titulo: "Passado, Presente e Futuro", simples: "A visão mais avançada. Sobrepõe o que fez, seu nível real e projeta o futuro com Monte Carlo.", dica: "Use o seletor 'Focar em' para mergulhar nos detalhes da matéria." },
    },
];

// ── TOOLTIP CUSTOMIZADO ────────────────────────────────────
const CustomTooltipStyle = {
    backgroundColor: '#0a0f1e',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

// ── CARD KPI ─────────────────────────────────────────────
function KpiCard({ value, label, color, icon, sub }) {
    return (
        <div className="relative flex flex-col justify-between rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 group hover:border-slate-700 transition-all duration-300 hover:shadow-lg"
            style={{ '--glow': color }}>

            {/* Background Layer for Overflow-Hidden elements */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                {/* Glow blob */}
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"
                    style={{ backgroundColor: color }} />
            </div>

            <div className="relative z-10 flex items-center justify-between mb-3">
                <span className="text-2xl">{icon}</span>
                {sub != null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sub >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {sub >= 0 ? `+${sub.toFixed(1)}` : sub.toFixed(1)}
                    </span>
                )}
            </div>
            <div className="relative z-10">
                <p className="text-3xl font-black tracking-tight" style={{ color }}>{value}</p>
                <p className="text-[11px] text-slate-500 mt-1 font-medium leading-normal block py-0.5">{label}</p>
            </div>
        </div>
    );
}

// ── DISCIPLINA CARD ───────────────────────────────────────
function DisciplinaCard({ cat, level, target, isFocused, onClick }) {
    const pct = Math.min(100, level || 0);
    const ok = pct >= target;
    const mid = pct >= target * 0.75;
    const statusColor = ok ? '#22c55e' : mid ? '#eab308' : '#ef4444';
    return (
        <button onClick={onClick}
            className={`relative text-left w-full rounded-xl border p-4 transition-all duration-300 group min-h-[90px] ${isFocused ? 'border-opacity-60 shadow-[0_0_20px_rgba(0,0,0,0.4)]' : 'border-slate-800/70 hover:border-slate-700 hover:shadow-md'}`}
            style={{ borderColor: isFocused ? `${cat.color}60` : undefined, backgroundColor: isFocused ? `${cat.color}08` : 'rgba(15,23,42,0.4)' }}>

            {/* Background/Progress Layer */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                <div className="absolute bottom-0 left-0 h-0.5 transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: statusColor, opacity: 0.7 }} />
            </div>

            <div className="relative z-10 flex items-center justify-between mb-2">
                <span className="text-base leading-normal">{cat.icon}</span>
                <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_6px_var(--dot-glow)]"
                    style={{ backgroundColor: statusColor, '--dot-glow': statusColor }} />
            </div>
            <div className="relative z-10">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide break-words leading-[1.6] pb-0.5">{cat.name}</p>
                <p className="text-lg font-black leading-relaxed pt-0.5" style={{ color: isFocused ? cat.color : '#f1f5f9' }}>
                    {pct.toFixed(1)}%
                </p>
            </div>
        </button>
    );
}

export default function EvolutionChart({ categories = [], targetScore = 80 }) {
    const [activeEngine, setActiveEngine] = useState("bayesian");
    const { activeCategories, timeline, heatmapData, globalMetrics } = useChartData(categories, targetScore);
    const [focusSubjectId, setFocusSubjectId] = useState(activeCategories[0]?.id);
    const [showOnlyFocus, setShowOnlyFocus] = useState(false);
    const [timeWindow, setTimeWindow] = useState("all");

    useEffect(() => {
        if (!categories.length) return;
        if (!focusSubjectId || !categories.some(c => c.id === focusSubjectId)) {
            setTimeout(() => setFocusSubjectId(categories[0].id), 0);
        }
    }, [categories, focusSubjectId]);

    const focusCategory = useMemo(() => {
        const found = categories.find(c => c.id === focusSubjectId);
        return found || categories[0] || null;
    }, [categories, focusSubjectId]);

    // Fix 4: Monte Carlo assíncrono
    const [mcProjection, setMcProjection] = useState(null);
    useEffect(() => {
        if (!focusCategory?.simuladoStats?.history) {
            setTimeout(() => setMcProjection(null), 0);
            return;
        }
        const hist = [...focusCategory.simuladoStats.history]
            .map(h => { const dateKey = getDateKey(h.date); const score = getSafeScore(h); if (!dateKey || !Number.isFinite(score)) return null; return { date: dateKey, score }; })
            .filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));
        if (hist.length < 5) { setTimeout(() => setMcProjection(null), 0); return; }
        let cancelled = false;
        const timer = setTimeout(() => {
            if (cancelled) return;
            const result = monteCarloSimulation(hist, targetScore, 30, 2000);
            if (!result || cancelled) return;
            const lastDate = new Date(hist[hist.length - 1].date);
            if (Number.isNaN(lastDate.getTime())) return;
            const nextDate = new Date(lastDate);
            nextDate.setDate(nextDate.getDate() + 30);
            setMcProjection({ date: nextDate.toISOString().split("T")[0], mc_p50: parseFloat(result.mean), mc_band: [parseFloat(result.ci95Low), parseFloat(result.ci95High)] });
        }, 0);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [focusCategory?.id, focusCategory?.simuladoStats?.history, targetScore]);

    const compareData = useMemo(() => {
        if (!focusCategory) return timeline;
        // Bug fix 1: never mutate the memoized timeline array — map to new objects
        let pts = timeline.map((d) => ({ ...d, "Nota Bruta": d[`raw_${focusCategory.name}`], "Nível Bayesiano": d[`bay_${focusCategory.name}`], "Média Histórica": d[`stats_${focusCategory.name}`] }));
        if (mcProjection && pts.length > 0) {
            const lastIdx = pts.length - 1;
            const currentLevel = pts[lastIdx]["Nível Bayesiano"] || pts[lastIdx]["Nota Bruta"] || 0;
            // Immutable replacement of last element
            pts = [
                ...pts.slice(0, lastIdx),
                { ...pts[lastIdx], "Cenário Ruim": currentLevel, "Cenário Ótimo": currentLevel },
                { date: mcProjection.date, displayDate: `${mcProjection.date.split('-')[2]}/${mcProjection.date.split('-')[1]} ✦`, "Futuro Provável": mcProjection.mc_p50, "Cenário Ruim": mcProjection.mc_band[0], "Cenário Ótimo": mcProjection.mc_band[1] }
            ];
        }
        return pts;
    }, [timeline, focusCategory, mcProjection]);

    const chartData = activeEngine === "compare" ? compareData : timeline;

    const filteredChartData = useMemo(() => {
        if (timeWindow === "all") return chartData;
        const days = Number.parseInt(timeWindow, 10);
        if (!Number.isFinite(days) || days <= 0 || chartData.length === 0) return chartData;
        const getDateMs = (item) => { if (!item?.date) return Number.NaN; const ms = new Date(item.date).getTime(); return Number.isNaN(ms) ? Number.NaN : ms; };
        const lastValid = [...chartData].reverse().find(d => Number.isFinite(getDateMs(d)));
        if (!lastValid) return chartData;
        const limit = getDateMs(lastValid) - (days * 24 * 60 * 60 * 1000);
        return chartData.filter(d => { const ms = getDateMs(d); return Number.isFinite(ms) && ms >= limit; });
    }, [chartData, timeWindow]);

    const focusSnapshot = useMemo(() => {
        if (!focusCategory || !timeline.length) return null;
        const last = timeline[timeline.length - 1];
        const prev = timeline.length > 1 ? timeline[timeline.length - 2] : null;
        const currentBay = last[`bay_${focusCategory.name}`] || 0;
        const previousBay = prev ? (prev[`bay_${focusCategory.name}`] || 0) : currentBay;
        return { currentBay, delta: currentBay - previousBay };
    }, [focusCategory, timeline]);

    const radarData = useMemo(() => {
        if (!timeline || timeline.length === 0) return [];
        const lastPoint = timeline[timeline.length - 1];
        return categories.map(cat => ({ subject: cat.name.replace(/Direito /gi, 'D. ').substring(0, 15), nivel: Math.round(lastPoint[`bay_${cat.name}`] || 0), meta: targetScore }));
    }, [timeline, categories, targetScore]);

    const volumeData = useMemo(() => {
        if (!focusCategory) return [];
        return timeline.map(d => ({ date: d.displayDate, volume: d[`raw_total_${focusCategory.name}`] || 0, rendimento: Math.round(d[`raw_${focusCategory.name}`] || 0) }));
    }, [timeline, focusCategory]);

    const maxVolume = useMemo(() => {
        return Math.max(1, ...volumeData.map(d => d.volume));
    }, [volumeData]);

    const subtopicsData = useMemo(() => {
        if (!categories || !categories.length) return [];
        const topicMap = {};
        const now = new Date();
        const rollingLimit = new Date(now);
        rollingLimit.setDate(now.getDate() - 7);
        rollingLimit.setHours(0, 0, 0, 0);
        categories.forEach(cat => {
            if (cat.tasks) { cat.tasks.forEach(t => { const title = String(t.title || t.text || '').trim(); const key = title.toLowerCase(); if (title && !topicMap[key]) topicMap[key] = { name: title, errors: 0 }; }); }
            (cat.simuladoStats?.history || []).filter(h => new Date(h.date) >= rollingLimit).forEach(h => {
                (h.topics || []).forEach(t => { const n = String(t.name || '').trim(); const key = n.toLowerCase(); if (!topicMap[key]) topicMap[key] = { name: n, errors: 0 }; topicMap[key].errors += Math.max(0, (parseInt(t.total, 10) || 0) - (parseInt(t.correct, 10) || 0)); });
            });
        });
        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];
        // Bug fix 2: filter out zero-error entries — tasks with no errors are noise in the critical chart
        return Object.values(topicMap)
            .filter(d => d.errors > 0)
            .map(d => ({ name: d.name, value: d.errors }))
            .sort((a, b) => b.value - a.value)
            .map((item, i, arr) => ({ ...item, fill: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / Math.max(1, arr.length - 1)) * (PALETTE.length - 1)))] }));
    }, [categories]);

    const pointLeakageData = useMemo(() => {
        if (!categories || !categories.length) return [];
        const now = new Date();
        const rollingLimit = new Date(now);
        rollingLimit.setDate(now.getDate() - 7);
        rollingLimit.setHours(0, 0, 0, 0);
        let totalErrors = 0;
        const PALETTE = ["#ef4444", "#f97316", "#fb923c", "#f59e0b", "#facc15"];
        const rawData = categories.map(cat => {
            let errors = 0;
            (cat.simuladoStats?.history || []).filter(h => new Date(h.date) >= rollingLimit).forEach(h => { errors += Math.max(0, (parseInt(h.total, 10) || 0) - (parseInt(h.correct, 10) || 0)); });
            totalErrors += errors;
            return { name: cat.name, value: errors };
        });
        // Bug fix 3: exclude categories with 0 errors — they add misleading zero-bars and distort the color palette
        const data = rawData.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
        return data.map((item, i, arr) => ({ ...item, color: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / Math.max(1, arr.length - 1)) * (PALETTE.length - 1)))], percentage: totalErrors > 0 ? Math.round((item.value / totalErrors) * 100) : 0 }));
    }, [categories]);

    // Fix 5: Extract calculation from insight string construction to avoid clutter
    const getInsightText = () => {
        if (activeEngine !== "compare") return "Selecione a aba 'Raio-X + Monte Carlo' para que eu possa avaliar detalhadamente a sua evolução nesta matéria.";
        if (!timeline.length || !focusCategory) return "Ainda não existem dados suficientes.";
        const lastPoint = timeline[timeline.length - 1];
        const raw = lastPoint[`raw_${focusCategory.name}`];
        const bayesian = lastPoint[`bay_${focusCategory.name}`];
        if (raw == null || bayesian == null) return "Ainda não existem dados suficientes para esta matéria.";

        // We use new Date().getTime() to avoid React Compiler flagging Date.now() as a pure function violation
        const nowMs = new Date().getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const recentVolumeAlert = (focusCategory.simuladoStats?.history || [])
            .filter(h => { const d = new Date(h.date).getTime(); return !isNaN(d) && nowMs - d <= sevenDaysMs; })
            .reduce((sum, h) => sum + (parseInt(h.total, 10) || 0), 0);

        if (recentVolumeAlert > 40 && raw < bayesian - 10) return `⚠️ Alerta de Burnout: Você fez ${recentVolumeAlert} questões esta semana, mas a nota (${raw.toFixed(1)}%) despencou. O cansaço é real. Recomendo uma pausa!`;
        if (raw > bayesian + 8) return `💡 Espetacular! Sua última nota (${raw.toFixed(1)}%) estourou a previsão (${bayesian.toFixed(1)}%). O conhecimento assentou de vez. Pode seguir avançando firme.`;
        if (raw < bayesian - 8) return `⚠️ Mantenha a calma. A nota da semana foi ${raw.toFixed(1)}%, mas a estatística garante que o seu nível real é ${bayesian.toFixed(1)}%. Foi apenas um desvio atípico.`;
        return `✅ Estabilidade de Mestre! O seu nível medido (${raw.toFixed(1)}%) crava com o seu domínio real (${bayesian.toFixed(1)}%). É esse o ritmo de aprovação.`;
    };

    const engine = ENGINES.find((e) => e.id === activeEngine);

    if (categories.length === 0) {
        return (
            <div className="glass p-12 text-center rounded-3xl animate-fade-in-down border border-slate-800">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">Gráficos de Evolução</h2>
                <p className="text-slate-400">Realize simulados para desbloquear a sua Máquina do Tempo Estatística.</p>
            </div>
        );
    }

    // Grid-template gradients for SVG defs
    const focusColor = focusCategory?.color || "#818cf8";

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Global SVG Defs */}
            <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
                <defs>
                    <filter id="lineShadow" height="200%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                        <feOffset in="blur" dx="0" dy="3" result="offsetBlur" />
                        <feComponentTransfer><feFuncA type="linear" slope="0.55" /></feComponentTransfer>
                        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feOffset dx="0" dy="2" result="offsetBlur" />
                        <feMerge><feMergeNode in="offsetBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <linearGradient id="cloudGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={focusColor} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={focusColor} stopOpacity={0.01} />
                    </linearGradient>
                </defs>
            </svg>

            {/* ── 1. KPI CARDS ───────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3 min-w-0">
                <KpiCard value={globalMetrics.totalQuestions.toLocaleString()} label="Questões" color="#818cf8" icon="📚" />
                <KpiCard value={globalMetrics.totalCorrect.toLocaleString()} label="Acertos" color="#34d399" icon="🎯" />
                <KpiCard value={`${globalMetrics.globalAccuracy.toFixed(1)}%`} label="Precisão Global" color="#fb923c" icon="⚡"
                    sub={focusSnapshot?.delta} />
            </div>

            {/* ── 2. DISCIPLINA CARDS ───────────────────────────── */}
            <div className="relative z-10">
                <p className="text-xs text-slate-500 uppercase font-black tracking-[0.15em] leading-loose py-4 mb-1 pl-1">
                    Nível Bayesiano por Disciplina • clique para focar
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 overflow-visible">
                    {categories.map(cat => {
                        const level = timeline.length > 0 ? timeline[timeline.length - 1][`bay_${cat.name}`] : 0;
                        return <DisciplinaCard key={cat.id} cat={cat} level={level} target={targetScore} isFocused={focusSubjectId === cat.id} onClick={() => setFocusSubjectId(cat.id)} />;
                    })}
                </div>
            </div>

            {/* ── 3. ENGINE TABS ────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 backdrop-blur p-5 shadow-xl">
                {/* Tab bar */}
                <div className="flex flex-wrap gap-2 mb-5">
                    {ENGINES.map((eng) => {
                        const active = activeEngine === eng.id;
                        return (
                            <button key={eng.id} onClick={() => setActiveEngine(eng.id)}
                                className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 border ${active ? 'shadow-lg' : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600'}`}
                                style={active ? { backgroundColor: `${eng.color}18`, borderColor: `${eng.color}55`, color: eng.color, boxShadow: `0 0 20px ${eng.color}22` } : {}}>
                                <span className="text-base">{eng.emoji}</span>
                                <span>{eng.label}</span>
                                {active && <span className="w-1.5 h-1.5 rounded-full ml-1 animate-pulse" style={{ backgroundColor: eng.color }} />}
                            </button>
                        );
                    })}
                </div>

                {/* Engine description strip */}
                <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-4 mb-5 relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors duration-500" style={{ backgroundColor: engine.color }} />
                    <p className="font-bold text-sm mb-1 transition-colors duration-300" style={{ color: engine.color }}>
                        {engine.emoji} {engine.explain.titulo}
                    </p>
                    <p className="text-slate-400 text-xs leading-relaxed">{engine.explain.simples}</p>
                    <p className="text-slate-500 text-xs mt-1.5 italic">💡 {engine.explain.dica}</p>
                </div>

                {/* Controls row */}
                {/* Row 1: focus selector */}
                <div className="mb-3">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-2 pl-0.5">Focar em</p>
                    <div className="flex flex-wrap gap-1.5">
                        {categories.map((cat) => (
                            <button key={cat.id} onClick={() => setFocusSubjectId(cat.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${focusSubjectId === cat.id ? 'scale-[1.04] shadow-md' : 'border-slate-800 text-slate-500 bg-slate-900/40 hover:text-slate-300 hover:border-slate-700'}`}
                                style={focusSubjectId === cat.id ? { backgroundColor: `${cat.color}14`, borderColor: `${cat.color}55`, color: cat.color, boxShadow: `0 0 10px ${cat.color}20` } : {}}>
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: view controls */}
                <div className="flex items-center justify-between gap-3 mb-5">
                    {/* Time window */}
                    <div className="flex items-center gap-0.5 bg-slate-950/60 border border-slate-800/70 rounded-xl p-1">
                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider px-2">Período</span>
                        {[{ label: '30d', value: '30' }, { label: '90d', value: '90' }, { label: 'Tudo', value: 'all' }].map(w => (
                            <button key={w.value} onClick={() => setTimeWindow(w.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeWindow === w.value ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/40' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                                {w.label}
                            </button>
                        ))}
                    </div>

                    {/* Visibility toggle */}
                    <button onClick={() => setShowOnlyFocus(!showOnlyFocus)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showOnlyFocus ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'}`}>
                        <span>{showOnlyFocus ? '🔍' : '👁'}</span>
                        <span>{showOnlyFocus ? 'Só foco' : 'Todas'}</span>
                    </button>
                </div>

                {/* ── CHART AREA ── */}
                {activeEngine === "raw_weekly" ? (
                    <EvolutionHeatmap heatmapData={heatmapData} targetScore={targetScore} />
                ) : (activeEngine === "compare" ? timeline.length : filteredChartData.length) < 2 ? (
                    <div className="h-[340px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/30">
                        <span className="text-5xl">🔥</span>
                        <div className="text-center">
                            <p className="text-slate-300 font-bold text-base mb-1">Dados insuficientes para desenhar a linha</p>
                            <p className="text-slate-500 text-sm max-w-xs">Registre pelo menos <span className="text-indigo-400 font-bold">2 simulados</span> para desbloquear os gráficos de evolução.</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            O Mapa de Calor já funciona com 1 registro
                        </div>
                    </div>
                ) : (
                    <div className="h-[460px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {activeEngine !== "compare" ? (
                                <ComposedChart data={filteredChartData} margin={{ top: 20, right: 15, left: -10, bottom: 10 }}>
                                    <defs>
                                        {categories.map(cat => (
                                            <linearGradient key={cat.id} id={`grad_${cat.id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={cat.color} stopOpacity={0.25} />
                                                <stop offset="100%" stopColor={cat.color} stopOpacity={0.01} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="displayDate" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} dy={8} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} minTickGap={22} />
                                    <YAxis stroke="#ffffff" tick={{ fontSize: 11, fill: '#ffffff' }} dx={-4} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                                    <ReferenceLine y={targetScore} stroke="#22c55e" strokeDasharray="5 4" strokeOpacity={0.45}
                                        label={{ value: `Meta ${targetScore}%`, fill: '#22c55e', fontSize: 10, position: 'insideBottomLeft', dy: -4 }} />
                                    <Tooltip cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        content={<ChartTooltip chartData={filteredChartData} isCompare={false} />} />
                                    <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '11px' }} />
                                    {categories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).flatMap((cat) => {
                                        const isFocused = focusSubjectId === cat.id;
                                        const dataKey = engine.prefix ? `${engine.prefix}${cat.name}` : `raw_${cat.name}`;
                                        return [
                                            isFocused ? (
                                                <Area key={`area_${cat.id}`} type={engine.style} dataKey={dataKey} stroke="none"
                                                    fill={`url(#grad_${cat.id})`} legendType="none" connectNulls />
                                            ) : null,
                                            <Line key={cat.id} type={engine.style} dataKey={dataKey} name={cat.name}
                                                stroke={cat.color} strokeWidth={isFocused ? 3 : 1.5}
                                                strokeOpacity={isFocused ? 1 : 0.5}
                                                dot={isFocused ? { r: 4, fill: cat.color, stroke: '#0a0f1e', strokeWidth: 2 } : false}
                                                activeDot={{ r: isFocused ? 7 : 5, strokeWidth: 2, stroke: '#0a0f1e' }}
                                                connectNulls
                                                style={{ filter: isFocused ? 'url(#lineShadow)' : 'none' }}
                                            />
                                        ];
                                    }).filter(Boolean)}
                                </ComposedChart>
                            ) : (
                                <ComposedChart data={filteredChartData} margin={{ top: 20, right: 15, left: -10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="displayDate" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} dy={8} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} minTickGap={22} />
                                    <YAxis stroke="#ffffff" tick={{ fontSize: 11, fill: '#ffffff' }} dx={-4} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                                    <ReferenceLine y={targetScore} stroke="#22c55e" strokeDasharray="5 4" strokeOpacity={0.45}
                                        label={{ value: `Meta ${targetScore}%`, fill: '#22c55e', fontSize: 10, position: 'insideBottomLeft', dy: -4 }} />
                                    <Tooltip cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        content={<ChartTooltip chartData={filteredChartData} isCompare={true} />} />
                                    <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '11px' }} />
                                    {/* MC Band */}
                                    <Area type="monotone" dataKey="Cenário Ótimo" fill="url(#cloudGradient)" stroke="none" legendType="none" />
                                    <Area type="monotone" dataKey="Cenário Ruim" fill="#0a0f1e" stroke="none" legendType="none" />
                                    {/* Lines */}
                                    <Area type="monotone" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={3}
                                        fill="url(#greenGradient)" dot={{ r: 3, fill: '#34d399', stroke: '#0a0f1e', strokeWidth: 1.5 }}
                                        activeDot={{ r: 6, strokeWidth: 2 }} connectNulls style={{ filter: 'url(#lineShadow)' }} />
                                    <Line type="monotone" dataKey="Nota Bruta" stroke="#fb923c" strokeWidth={1.5}
                                        dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls strokeOpacity={0.85} />
                                    <Line type="monotone" dataKey="Média Histórica" stroke="#818cf8" strokeWidth={1.5}
                                        strokeDasharray="5 4" dot={false} connectNulls strokeOpacity={0.6} />
                                    <Line type="monotone" dataKey="Futuro Provável" stroke="#a78bfa" strokeWidth={2.5}
                                        strokeDasharray="7 5"
                                        dot={{ r: 6, fill: '#a78bfa', stroke: '#0a0f1e', strokeWidth: 2 }}
                                        connectNulls strokeOpacity={0.9} style={{ filter: 'url(#glow)' }} />
                                </ComposedChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* ── 4. AI INSIGHT ─────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 p-5 shadow-lg group hover:shadow-[0_0_30px_rgba(99,102,241,0.12)] transition-all duration-500">
                <div className="absolute -top-6 -right-6 text-8xl opacity-[0.06] group-hover:opacity-[0.1] group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 select-none pointer-events-none">🤖</div>
                <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-2">Análise do sistema</p>
                <p className="text-slate-300 leading-relaxed text-sm relative z-10">{getInsightText()}</p>
            </div>

            {/* ── 5. GALERIA AVANÇADA ──────────────────────────── */}
            <div className="pt-4">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Galeria de Análises Detalhadas</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Radar */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg hover:border-slate-700 transition-all group">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Equilíbrio Geral</p>
                        <h3 className="text-base font-bold text-slate-200 mb-4">🕸️ Raio-X das Disciplinas</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.15)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff', fontSize: 9 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Meta" dataKey="meta" stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} fill="none" />
                                    <Radar name="Seu Nível" dataKey="nivel" stroke="#818cf8" strokeWidth={2} fill="#818cf8" fillOpacity={0.2} activeDot={{ r: 4, strokeWidth: 0 }} style={{ filter: 'url(#lineShadow)' }} />
                                    <Tooltip formatter={(v) => [`${v}%`]} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Volume vs Rendimento */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg hover:border-slate-700 transition-all group">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Disciplina em foco 🎯</p>
                        <h3 className="text-base font-bold text-slate-200 mb-4">📊 Volume vs Rendimento — <span style={{ color: focusColor }}>{focusCategory?.name}</span></h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={volumeData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="date" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} minTickGap={20} />
                                    <YAxis yAxisId="left" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} domain={[0, 100]} />
                                    <YAxis yAxisId="right" orientation="right" hide={true} />
                                    <Tooltip cursor={false} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: 10 }} />

                                    {/* Linha invisível apenas para forçar o volume a aparecer na legenda/tooltip principal */}
                                    <Line yAxisId="right" dataKey="volume" name="Qtd. Questões" stroke="transparent" dot={false} activeDot={false} legendType="none" />

                                    <Area yAxisId="left" name="% Acertos" type="monotone" dataKey="rendimento" stroke={focusColor} strokeWidth={2.5} fill="url(#focusGradient)"
                                        dot={(props) => {
                                            const { cx, cy, payload } = props;
                                            if (typeof cx !== 'number' || typeof cy !== 'number') return null;
                                            const vol = payload.volume || 0;
                                            const r = 9 + (vol / maxVolume) * 12;
                                            const isLast = volumeData.length > 0 && payload.date === volumeData[volumeData.length - 1].date;
                                            return (
                                                <g key={`${cx.toFixed(1)}-${cy.toFixed(1)}`}>
                                                    {isLast && (
                                                        <>
                                                            <circle cx={50} cy={cy} r={3.5} fill={focusColor} stroke="#ffffff" strokeWidth={1.5} />
                                                            <line x1={50} y1={cy} x2={cx} y2={cy} stroke={focusColor} strokeDasharray="3 3" strokeOpacity={0.8} />
                                                            <text x={55} y={cy - 8} fill={focusColor} fontSize={10} fontWeight="bold">Atual: {payload.rendimento}%</text>
                                                        </>
                                                    )}
                                                    <circle cx={cx} cy={cy} r={r} fill={focusColor} stroke="#0a0f1e" strokeWidth={1.5} opacity={0.9} style={{ transition: 'all 0.3s ease' }} />
                                                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize={Math.min(12, Math.max(8, r * 0.7))} fontWeight="bold" style={{ pointerEvents: 'none', textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}>
                                                        {vol}
                                                    </text>
                                                </g>
                                            );
                                        }}
                                        activeDot={(props) => {
                                            const { cx, cy, payload } = props;
                                            if (typeof cx !== 'number' || typeof cy !== 'number') return null;
                                            const vol = payload.volume || 0;
                                            const r = 9 + (vol / maxVolume) * 12 + 3;
                                            const isLast = volumeData.length > 0 && payload.date === volumeData[volumeData.length - 1].date;
                                            return (
                                                <g key={`${cx.toFixed(1)}-${cy.toFixed(1)}-active`}>
                                                    <line x1={cx} y1={cy} x2={cx} y2={220} stroke="rgba(255, 255, 255, 0.4)" strokeWidth={1} strokeDasharray="3 3" />
                                                    {isLast && (
                                                        <>
                                                            <circle cx={50} cy={cy} r={3.5} fill={focusColor} stroke="#ffffff" strokeWidth={1.5} />
                                                            <line x1={50} y1={cy} x2={cx} y2={cy} stroke={focusColor} strokeDasharray="3 3" strokeOpacity={0.8} />
                                                            <text x={55} y={cy - 8} fill={focusColor} fontSize={10} fontWeight="bold">Atual: {payload.rendimento}%</text>
                                                        </>
                                                    )}
                                                    <circle cx={cx} cy={cy} r={r} fill={focusColor} stroke="#ffffff" strokeWidth={2} style={{ filter: 'url(#glow)', transition: 'all 0.3s ease' }} />
                                                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize={Math.min(13, Math.max(9, r * 0.7))} fontWeight="black" style={{ pointerEvents: 'none', textShadow: '0px 1px 3px rgba(0,0,0,0.9)' }}>
                                                        {vol}
                                                    </text>
                                                </g>
                                            );
                                        }}
                                        style={{ filter: 'url(#lineShadow)' }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Matérias Críticas */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg hover:border-slate-700 transition-all">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Última semana</p>
                        <h3 className="text-base font-bold text-slate-200 mb-1">🩸 Matérias Críticas <span className="text-slate-600 font-normal">({pointLeakageData.length})</span></h3>
                        <p className="text-[10px] text-slate-500 mb-4">Erros absolutos por disciplina nos últimos 7 dias.</p>
                        <div className="min-h-[260px]">
                            {pointLeakageData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={Math.max(260, pointLeakageData.length * 44)}>
                                    <BarChart data={pointLeakageData} layout="vertical" margin={{ top: 0, right: 50, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                        <XAxis type="number" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} allowDecimals={false} />
                                        <YAxis type="category" dataKey="name" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} width={130} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v) => [`${v} erros`, 'Matéria']} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20} minPointSize={4} style={{ filter: 'url(#barShadow)' }}>
                                            {pointLeakageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                            <LabelList dataKey="value" position="right" style={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }} offset={8} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
                                    <span className="text-4xl mb-3">🎉</span>
                                    Nenhum erro registrado esta semana!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assuntos Críticos */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg hover:border-slate-700 transition-all">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Última semana · todos os assuntos</p>
                        <h3 className="text-base font-bold text-slate-200 mb-1">📏 Assuntos Críticos <span className="text-slate-600 font-normal">({subtopicsData.length})</span></h3>
                        <p className="text-[10px] text-slate-500 mb-4">Tópicos de todas as matérias com mais erros absolutos.</p>
                        <div className="min-h-[260px]">
                            {subtopicsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={Math.max(260, subtopicsData.length * 44)}>
                                    <BarChart data={subtopicsData} layout="vertical" margin={{ top: 0, right: 50, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                        <XAxis type="number" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} allowDecimals={false} />
                                        <YAxis type="category" dataKey="name" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} width={150} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v) => [`${v} erros`, 'Assunto']} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20} minPointSize={4} style={{ filter: 'url(#barShadow)' }}>
                                            {subtopicsData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                            <LabelList dataKey="value" position="right" style={{ fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }} offset={8} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
                                    <span className="text-4xl mb-3">🎉</span>
                                    Nenhum erro registrado esta semana!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
