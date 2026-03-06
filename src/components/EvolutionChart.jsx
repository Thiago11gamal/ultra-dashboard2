import React, { useState, useMemo, useEffect } from "react";
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
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
        <div className="relative flex flex-col justify-between rounded-2xl border border-slate-800/60 bg-slate-900/60 p-3 sm:p-5 group hover:border-slate-700 transition-all duration-300 hover:shadow-lg"
            style={{ '--glow': color }}>

            {/* Background Layer for Overflow-Hidden elements */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                {/* Glow blob */}
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"
                    style={{ backgroundColor: color }} />
            </div>

            <div className="relative z-10 flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xl sm:text-2xl">{icon}</span>
                {sub != null && Number.isFinite(sub) && (
                    <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${sub >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {sub >= 0 ? `+${sub.toFixed(1)}` : sub.toFixed(1)}
                    </span>
                )}
            </div>
            <div className="relative z-10">
                <p className="text-xl sm:text-3xl font-black tracking-tight truncate break-words" style={{ color }}>{value}</p>
                <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1.5 font-medium leading-normal block">{label}</p>
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
            className={`relative text-left w-full rounded-2xl border p-3 sm:p-5 transition-all duration-300 group min-h-[82px] sm:min-h-[100px] ${isFocused ? 'border-opacity-60 shadow-[0_0_20px_rgba(0,0,0,0.4)]' : 'border-slate-800/70 hover:border-slate-700 hover:shadow-md'}`}
            style={{ borderColor: isFocused ? `${cat.color}60` : undefined, backgroundColor: isFocused ? `${cat.color}08` : 'rgba(15,23,42,0.4)' }}>

            {/* Background/Progress Layer */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute bottom-0 left-0 h-1 sm:h-0.5 transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: statusColor, opacity: 0.7 }} />
            </div>

            <div className="relative z-10 flex items-center justify-between mb-1.5 sm:mb-3">
                <span className="text-base sm:text-lg leading-none">{cat.icon}</span>
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_var(--dot-glow)]"
                    style={{ backgroundColor: statusColor, '--dot-glow': statusColor }} />
            </div>
            <div className="relative z-10">
                <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide break-words leading-[1.3] sm:leading-snug pb-0.5 sm:pb-1 line-clamp-2" title={cat.name}>{cat.name}</p>
                <p className="text-base sm:text-xl font-black leading-none pt-0.5 sm:pt-1" style={{ color: isFocused ? cat.color : '#f1f5f9' }}>
                    {pct.toFixed(1)}%
                </p>
            </div>
        </button>
    );
}

export default function EvolutionChart({ categories = [], targetScore = 80 }) {
    const [activeEngine, setActiveEngine] = useState("bayesian");
    const { activeCategories, timeline, heatmapData, globalMetrics } = useChartData(categories, targetScore);
    const [focusSubjectId, setFocusSubjectId] = useState(() => activeCategories[0]?.id ?? categories[0]?.id);
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
            try {
                const result = monteCarloSimulation(hist, targetScore, 30, 2000);
                if (!result || cancelled) return;
                const lastDate = new Date(hist[hist.length - 1].date);
                if (Number.isNaN(lastDate.getTime())) return;
                const nextDate = new Date(lastDate);
                nextDate.setDate(nextDate.getDate() + 30);
                const p50 = parseFloat(result.mean);
                const lo = parseFloat(result.ci95Low);
                const hi = parseFloat(result.ci95High);
                if (!Number.isFinite(p50) || !Number.isFinite(lo) || !Number.isFinite(hi)) return;
                setMcProjection({ date: nextDate.toISOString().split("T")[0], mc_p50: p50, mc_band: [lo, hi] });
            } catch (err) {
                console.warn('[EvolutionChart] Monte Carlo falhou:', err);
            }
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
        // Bug fix: use timeline instead of chartData, so Monte Carlo future dates don't skew the 30/90 days window
        const lastValid = [...timeline].reverse().find(d => Number.isFinite(getDateMs(d)));
        if (!lastValid) return chartData;
        const limit = getDateMs(lastValid) - (days * 24 * 60 * 60 * 1000);
        return chartData.filter(d => { const ms = getDateMs(d); return Number.isFinite(ms) && ms >= limit; });
    }, [chartData, timeWindow, timeline]);

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

    // volumeData and maxVolume removed — no longer used after chart refactor

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
            .map(d => {
                const isLong = d.name.length > 20;
                return {
                    name: isLong ? d.name.substring(0, 18) + '...' : d.name,
                    fullName: d.name,
                    value: d.errors
                };
            })
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
        return data.map((item, i, arr) => {
            const isLong = item.name.length > 20;
            return {
                ...item,
                fullName: item.name,
                name: isLong ? item.name.substring(0, 18) + '...' : item.name,
                color: PALETTE[Math.min(PALETTE.length - 1, Math.floor((i / Math.max(1, arr.length - 1)) * (PALETTE.length - 1)))],
                percentage: totalErrors > 0 ? Math.round((item.value / totalErrors) * 100) : 0
            };
        });
    }, [categories]);

    // Dados agregados por matéria: total questões + número de acertos (para gráfico de barras agrupadas)
    const subjectAggData = useMemo(() => {
        if (!categories || !categories.length || !timeline.length) return [];
        return categories
            .filter(cat => !showOnlyFocus || cat.id === focusSubjectId)
            .map(cat => {
                let totalQ = 0;
                let totalCorrect = 0;
                timeline.forEach(d => {
                    const q = d[`raw_total_${cat.name}`] || 0;
                    const c = d[`raw_correct_${cat.name}`] || 0;
                    totalQ += q;
                    totalCorrect += c;
                });
                const shortName = cat.name.length > 18 ? cat.name.substring(0, 16) + '…' : cat.name;
                return { name: shortName, fullName: cat.name, questoes: totalQ, acertos: totalCorrect, color: cat.color, id: cat.id };
            })
            .filter(d => d.questoes > 0)
            .sort((a, b) => b.questoes - a.questoes);
    }, [categories, timeline, showOnlyFocus, focusSubjectId]);

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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 min-w-0">
                <KpiCard value={globalMetrics.totalQuestions.toLocaleString()} label="Questões" color="#818cf8" icon="📚" />
                <KpiCard value={globalMetrics.totalCorrect.toLocaleString()} label="Acertos" color="#34d399" icon="🎯" />
                <div className="col-span-2 sm:col-span-1">
                    <KpiCard value={`${globalMetrics.globalAccuracy.toFixed(1)}%`} label="Precisão Global" color="#fb923c" icon="⚡"
                        sub={focusSnapshot?.delta} />
                </div>
            </div>

            {/* ── 2. DISCIPLINA CARDS ───────────────────────────── */}
            <div className="relative z-10">
                <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-black tracking-[0.15em] leading-loose py-2 sm:py-4 mb-0 sm:mb-1 pl-1">
                    Nível Bayesiano por Disciplina • clique para focar
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 overflow-visible">
                    {categories.map(cat => {
                        const level = timeline.length > 0 ? timeline[timeline.length - 1][`bay_${cat.name}`] : 0;
                        return <DisciplinaCard key={cat.id} cat={cat} level={level} target={targetScore} isFocused={focusSubjectId === cat.id} onClick={() => setFocusSubjectId(cat.id)} />;
                    })}
                </div>
            </div>

            {/* ── 3. ENGINE TABS ────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 backdrop-blur p-3 sm:p-5 shadow-xl w-full min-w-0">
                {/* Tab bar */}
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

                {/* Engine description strip */}
                <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-3 sm:p-4 mb-3 sm:mb-5 relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors duration-500" style={{ backgroundColor: engine.color }} />
                    <p className="font-bold text-xs sm:text-sm mb-0.5 sm:mb-1 transition-colors duration-300" style={{ color: engine.color }}>
                        {engine.emoji} {engine.explain.titulo}
                    </p>
                    <p className="text-slate-400 text-[10px] sm:text-xs leading-relaxed">{engine.explain.simples}</p>
                    <p className="text-slate-500 text-[9px] sm:text-xs mt-1 sm:mt-1.5 italic">💡 {engine.explain.dica}</p>
                </div>

                {/* Controls row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-5 w-full">
                    {/* Time window */}
                    <div className="flex items-center justify-between gap-1 bg-slate-950/60 border border-slate-800/70 rounded-xl p-1 shrink-0 overflow-x-auto w-full sm:w-auto">
                        <span className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-wider px-2 shrink-0">Período</span>
                        {[{ label: '30d', value: '30' }, { label: '90d', value: '90' }, { label: 'Tudo', value: 'all' }].map(w => (
                            <button key={w.value} onClick={() => setTimeWindow(w.value)}
                                className={`shrink-0 flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${timeWindow === w.value ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/40' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                                {w.label}
                            </button>
                        ))}
                    </div>

                    {/* Visibility toggle */}
                    <button onClick={() => setShowOnlyFocus(!showOnlyFocus)}
                        className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold border transition-all w-full sm:w-auto ${showOnlyFocus ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'}`}>
                        <span>{showOnlyFocus ? '🔍' : '👁'}</span>
                        <span className="truncate">
                            {showOnlyFocus ? `Apenas ${focusCategory?.name || 'Foco'}` : 'Todas as Matérias'}
                        </span>
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
                    <div className="h-[220px] sm:h-[360px] md:h-[460px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {activeEngine !== "compare" ? (
                                <ComposedChart data={filteredChartData} margin={{ top: 20, right: 65, left: 0, bottom: 12 }}>
                                    <defs>
                                        {categories.map(cat => (
                                            <linearGradient key={cat.id} id={`grad_${cat.id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={cat.color} stopOpacity={0.25} />
                                                <stop offset="100%" stopColor={cat.color} stopOpacity={0.01} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="displayDate" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} dy={8} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} minTickGap={35} />
                                    <YAxis stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} dx={-4} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} domain={[0, 100]} allowDataOverflow={true} tickFormatter={(v) => `${v}%`} width={50} />
                                    <ReferenceLine y={targetScore} stroke="#22c55e" strokeDasharray="5 4" strokeOpacity={0.45}
                                        label={{ value: `Meta ${targetScore}%`, fill: '#22c55e', fontSize: 10, position: 'insideBottomLeft', dy: -4, dx: 5 }} />
                                    <Tooltip cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        content={() => null} />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', paddingBottom: '5px' }} />
                                    {(() => {
                                        // 1. Gather all final points to calculate offsets
                                        const finalPoints = [];
                                        categories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).forEach(cat => {
                                            const dataKey = engine?.prefix ? `${engine.prefix}${cat.name}` : `raw_${cat.name}`;
                                            const lastVal = filteredChartData[filteredChartData.length - 1]?.[dataKey];
                                            if (lastVal != null && Number.isFinite(Number(lastVal))) {
                                                finalPoints.push({ id: cat.id, name: cat.name, value: Number(lastVal), color: cat.color });
                                            }
                                        });

                                        // Sort by value descending
                                        finalPoints.sort((a, b) => b.value - a.value);

                                        // Calculate Y offsets (assuming roughly 1% of chart height is needed between labels to prevent overlap, adjusting as needed)
                                        // The SVG Y coordinate is inverted (0 is top), but 'value' is 0-100 (100 is top). Recharts handles the Y prop mapping.
                                        // We will add a pixel offset directly to the Y prop in the render function.
                                        const MIN_PX_DISTANCE = 16;

                                        // Render lines
                                        return categories.filter(cat => !showOnlyFocus || cat.id === focusSubjectId).flatMap((cat) => {
                                            const isFocused = focusSubjectId === cat.id;
                                            const dataKey = engine?.prefix ? `${engine.prefix}${cat.name}` : `raw_${cat.name}`;

                                            // Render a custom label at the end of the line
                                            const renderCustomLabel = (props) => {
                                                const { x, y, index, value } = props;
                                                // Only render at the very last point of the line
                                                if (index === filteredChartData.length - 1 && value != null) {
                                                    const trendVal = filteredChartData[index][`trend_${cat.name}`];
                                                    const trendStatus = filteredChartData[index][`trend_status_${cat.name}`];

                                                    // Apple sweeping offsetPx
                                                    let offsetPx = 0;
                                                    const pt = finalPoints.find(p => p.id === cat.id);
                                                    if (pt) {
                                                        // Calculate the actual array of positions just once.
                                                        // We use the finalPoints array which was sorted descending.
                                                        // To guarantee no overlaps, we do a proper sweep here.
                                                        // Note: in React render we can't easily mutate state between children renders safely without pre-computing.
                                                        // So we pre-compute the collision-free positions.
                                                        const yPositions = [...finalPoints].map(p => ({ ...p, yPos: Number(p.value) || 0 }));
                                                        const MIN_PCT_DISTANCE = 4.5; // Roughly 4.5% difference to prevent overlap (~12px)

                                                        // Sweep from top (highest value) to bottom descending
                                                        for (let i = 1; i < yPositions.length; i++) {
                                                            if (yPositions[i - 1].yPos - yPositions[i].yPos < MIN_PCT_DISTANCE) {
                                                                yPositions[i].yPos = yPositions[i - 1].yPos - MIN_PCT_DISTANCE;
                                                            }
                                                        }

                                                        // Find my adjusted position
                                                        const myAdjPt = yPositions.find(p => p.id === cat.id);
                                                        if (myAdjPt && myAdjPt.yPos !== myAdjPt.value) {
                                                            // Calculate pixels to shift.
                                                            // SVG y axis is inverted. Higher Y value (pixels) means lower on screen.
                                                            const pctShift = value - myAdjPt.yPos;
                                                            offsetPx = pctShift * 1.3; // Approx 1.3px per 1% height
                                                        }
                                                    }

                                                    return (
                                                        <g>
                                                            <text x={x + 8} y={y + 4 + offsetPx} fill={cat.color} fontSize={11} fontWeight="bold">
                                                                {Number(value).toFixed(1)}%
                                                            </text>
                                                        </g>
                                                    );
                                                }
                                            };
                                            return [
                                                isFocused ? (
                                                    <Area key={`area_${cat.id}`} type={engine.style} dataKey={dataKey} name={cat.name} stroke="none"
                                                        fill={`url(#grad_${cat.id})`} legendType="none" connectNulls />
                                                ) : null,
                                                <Line key={cat.id} type={engine.style} dataKey={dataKey} name={cat.name}
                                                    stroke={cat.color} strokeWidth={isFocused ? 3 : 1.5}
                                                    strokeOpacity={isFocused ? 1 : 0.5}
                                                    dot={isFocused ? { r: 4, fill: cat.color, stroke: '#0a0f1e', strokeWidth: 2 } : { r: 2, fill: cat.color, strokeWidth: 0 }}
                                                    activeDot={false}
                                                    connectNulls
                                                    style={{ filter: isFocused ? 'url(#lineShadow)' : 'none' }}
                                                    isAnimationActive={false}
                                                >
                                                    <LabelList content={renderCustomLabel} />
                                                </Line>
                                            ];
                                        }).filter(Boolean);
                                    })()}
                                </ComposedChart>
                            ) : (
                                <ComposedChart data={filteredChartData} margin={{ top: 20, right: 65, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="displayDate" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} dy={8} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} minTickGap={35} />
                                    <YAxis stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} dx={-4} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} domain={[0, 100]} allowDataOverflow={true} tickFormatter={(v) => `${v}%`} width={50} />
                                    <ReferenceLine y={targetScore} stroke="#22c55e" strokeDasharray="5 4" strokeOpacity={0.45}
                                        label={{ value: `Meta ${targetScore}%`, fill: '#22c55e', fontSize: 10, position: 'insideBottomLeft', dy: -4, dx: 5 }} />
                                    <Tooltip cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        content={() => null} />
                                    <Legend wrapperStyle={{ paddingTop: '15px', paddingBottom: '10px', fontSize: '11px' }} />
                                    {(() => {
                                        // 1. Gather points to avoid collision in Compare chart
                                        const finalComparePoints = [];
                                        const lastIdx = filteredChartData.length - 1;
                                        if (lastIdx >= 0) {
                                            const d = filteredChartData[lastIdx];
                                            if (d["Nível Bayesiano"] != null) finalComparePoints.push({ name: 'bay', value: d["Nível Bayesiano"] });
                                            if (d["Nota Bruta"] != null) finalComparePoints.push({ name: 'raw', value: d["Nota Bruta"] });
                                            if (d["Média Histórica"] != null) finalComparePoints.push({ name: 'stats', value: d["Média Histórica"] });
                                            if (d["Futuro Provável"] != null) finalComparePoints.push({ name: 'mc', value: d["Futuro Provável"] });
                                        }

                                        // Sort by value descending
                                        finalComparePoints.sort((a, b) => b.value - a.value);

                                        // Sweep offsets to prevent overlap descending
                                        const MIN_PCT_DISTANCE = 9; // Roughly 9% difference to prevent overlap (~24px)
                                        const yPositions = [...finalComparePoints].map(p => ({ ...p, yPos: Number(p.value) || 0 }));

                                        for (let i = 1; i < yPositions.length; i++) {
                                            if (yPositions[i - 1].yPos - yPositions[i].yPos < MIN_PCT_DISTANCE) {
                                                yPositions[i].yPos = yPositions[i - 1].yPos - MIN_PCT_DISTANCE;
                                            }
                                        }

                                        const getOffset = (name, value) => {
                                            const pt = yPositions.find(p => p.name === name);
                                            if (!pt) return 0;
                                            // Calc pixel shift based on 2.6px per % difference
                                            const pctShift = value - pt.yPos;
                                            return pctShift * 2.6;
                                        };

                                        return (
                                            <>
                                                {/* MC Band */}
                                                <Area type="monotone" dataKey="Cenário Ótimo" fill="url(#cloudGradient)" stroke="none" legendType="none" />
                                                <Area type="monotone" dataKey="Cenário Ruim" fill="#0a0f1e" stroke="none" legendType="none" />
                                                {/* Lines */}
                                                <Area type="monotone" dataKey="Nível Bayesiano" stroke="#34d399" strokeWidth={3}
                                                    fill="url(#greenGradient)" dot={{ r: 3, fill: '#34d399', stroke: '#0a0f1e', strokeWidth: 1.5 }}
                                                    activeDot={false} connectNulls style={{ filter: 'url(#lineShadow)' }} isAnimationActive={false}>
                                                    <LabelList content={(props) => {
                                                        const { x, y, index, value } = props;
                                                        if (value == null) return null;
                                                        const validLastIdx = filteredChartData.reduce((acc, curr, i) => curr["Nível Bayesiano"] != null ? i : acc, -1);
                                                        if (index !== validLastIdx) return null;
                                                        const offset = getOffset('bay', value);
                                                        return <text x={x + 8} y={y + 4 + offset} fill="#34d399" fontSize={11} fontWeight="bold">{Number(value).toFixed(1)}%</text>;
                                                    }} />
                                                </Area>
                                                <Line type="monotone" dataKey="Nota Bruta" stroke="#fb923c" strokeWidth={1.5}
                                                    dot={{ r: 3 }} activeDot={false} connectNulls strokeOpacity={0.85} isAnimationActive={false}>
                                                    <LabelList content={(props) => {
                                                        const { x, y, index, value } = props;
                                                        if (value == null) return null;
                                                        const validLastIdx = filteredChartData.reduce((acc, curr, i) => curr["Nota Bruta"] != null ? i : acc, -1);
                                                        if (index !== validLastIdx) return null;
                                                        const offset = getOffset('raw', value);
                                                        return <text x={x + 8} y={y + 4 + offset} fill="#fb923c" fontSize={11} fontWeight="bold">{Number(value).toFixed(1)}%</text>;
                                                    }} />
                                                </Line>
                                                <Line type="monotone" dataKey="Média Histórica" stroke="#818cf8" strokeWidth={1.5}
                                                    strokeDasharray="5 4" dot={false} connectNulls strokeOpacity={0.6} isAnimationActive={false}>
                                                    <LabelList content={(props) => {
                                                        const { x, y, index, value } = props;
                                                        if (value == null) return null;
                                                        const validLastIdx = filteredChartData.reduce((acc, curr, i) => curr["Média Histórica"] != null ? i : acc, -1);
                                                        if (index !== validLastIdx) return null;
                                                        const offset = getOffset('stats', value);
                                                        return <text x={x + 8} y={y + 4 + offset} fill="#818cf8" fontSize={11} fontWeight="bold">{Number(value).toFixed(1)}%</text>;
                                                    }} />
                                                </Line>
                                                <Line type="monotone" dataKey="Futuro Provável" stroke="#a78bfa" strokeWidth={2.5}
                                                    strokeDasharray="7 5"
                                                    dot={{ r: 6, fill: '#a78bfa', stroke: '#0a0f1e', strokeWidth: 2 }}
                                                    connectNulls strokeOpacity={0.9} style={{ filter: 'url(#glow)' }} isAnimationActive={false}>
                                                    <LabelList content={(props) => {
                                                        const { x, y, index, value } = props;
                                                        if (value == null) return null;
                                                        const validLastIdx = filteredChartData.reduce((acc, curr, i) => curr["Futuro Provável"] != null ? i : acc, -1);
                                                        if (index !== validLastIdx) return null;
                                                        const offset = getOffset('mc', value);
                                                        return <text x={x + 8} y={y + 4 + offset} fill="#a78bfa" fontSize={11} fontWeight="bold">{Number(value).toFixed(1)}%</text>;
                                                    }} />
                                                </Line>
                                            </>
                                        );
                                    })()}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {/* Radar */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all group">
                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Equilíbrio Geral</p>
                        <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-2 sm:mb-4 truncate">🕸️ Raio-X das Disciplinas</h3>
                        <div className="h-[240px] sm:h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.15)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff', fontSize: 9 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Meta" dataKey="meta" stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} fill="none" />
                                    <Radar name="Seu Nível" dataKey="nivel" stroke="#818cf8" strokeWidth={2} fill="#818cf8" fillOpacity={0.2} activeDot={{ r: 4, strokeWidth: 0 }} style={{ filter: 'url(#lineShadow)' }} />
                                    <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Questões vs Acertos por Matéria */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all group w-full min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3 sm:mb-5 min-w-0">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Questões Resolvidas vs Acertos</p>
                                <h3 className="text-sm sm:text-base font-bold text-slate-200 truncate">
                                    📊 {showOnlyFocus ? `Desempenho — ${focusCategory?.name}` : "Desempenho por Matéria — Histórico Completo"}
                                </h3>
                            </div>
                            {/* Legenda manual */}
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block"></span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Questões</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Acertos</span>
                                </div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="h-[320px] sm:h-[380px] w-full">
                            {subjectAggData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={subjectAggData}
                                        margin={{ top: 20, right: 20, left: 10, bottom: showOnlyFocus ? 20 : 60 }}
                                        barCategoryGap="25%"
                                        barGap={4}
                                    >
                                        <defs>
                                            <linearGradient id="gradQuestoes" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                                                <stop offset="100%" stopColor="#4338ca" stopOpacity={0.75} />
                                            </linearGradient>
                                            <linearGradient id="gradAcertos" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                                                <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                                            </linearGradient>
                                        </defs>

                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />

                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            dy={8}
                                            angle={showOnlyFocus ? 0 : -35}
                                            textAnchor={showOnlyFocus ? 'middle' : 'end'}
                                            interval={0}
                                        />

                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                            width={38}
                                            allowDecimals={false}
                                            label={{ value: 'Quantidade', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 10, dx: -2 }}
                                        />

                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 4 }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    const rendPct = d.questoes > 0 ? ((d.acertos / d.questoes) * 100).toFixed(1) : '0.0';
                                                    return (
                                                        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl shadow-2xl min-w-[180px]">
                                                            <p className="font-black text-slate-200 mb-2 border-b border-white/5 pb-1.5 text-xs">{d.fullName}</p>
                                                            <div className="space-y-1.5">
                                                                <div className="flex justify-between items-center gap-4">
                                                                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                        <span className="w-2 h-2 rounded-sm bg-indigo-400 inline-block"></span>
                                                                        Questões
                                                                    </span>
                                                                    <span className="text-[11px] font-black text-indigo-300">{d.questoes}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center gap-4">
                                                                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                        <span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block"></span>
                                                                        Acertos
                                                                    </span>
                                                                    <span className="text-[11px] font-black text-emerald-300">{d.acertos}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center gap-4 pt-1 border-t border-white/5">
                                                                    <span className="text-[9px] text-slate-500 uppercase font-bold">Aproveitamento</span>
                                                                    <span className="text-[11px] font-black text-white">{rendPct}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />

                                        {/* BARRA: Questões Resolvidas */}
                                        <Bar
                                            dataKey="questoes"
                                            name="Questões Resolvidas"
                                            fill="url(#gradQuestoes)"
                                            radius={[5, 5, 0, 0]}
                                            isAnimationActive={false}
                                        >
                                            <LabelList dataKey="questoes" position="top" style={{ fill: '#818cf8', fontSize: 9, fontWeight: 'bold' }} />
                                        </Bar>

                                        {/* BARRA: Número de Acertos */}
                                        <Bar
                                            dataKey="acertos"
                                            name="Número de Acertos"
                                            fill="url(#gradAcertos)"
                                            radius={[5, 5, 0, 0]}
                                            isAnimationActive={false}
                                        >
                                            <LabelList dataKey="acertos" position="top" style={{ fill: '#34d399', fontSize: 9, fontWeight: 'bold' }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
                                    <span className="text-4xl mb-3">📊</span>
                                    Nenhum dado de estudo encontrado.
                                </div>
                            )}
                        </div>

                        {/* Dica */}
                        <div className="mt-3 px-3 py-2 bg-white/3 rounded-xl border border-dashed border-slate-800 text-center">
                            <p className="text-[10px] text-slate-500 italic">
                                📌 Quanto mais a barra verde (acertos) se aproximar da barra roxa (questões), maior o seu aproveitamento na matéria.
                            </p>
                        </div>
                    </div>

                    {/* Matérias Críticas */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all w-full min-w-0">
                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Última semana</p>
                        <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-1 truncate">🩸 Matérias Críticas <span className="text-slate-600 font-normal">({pointLeakageData.length})</span></h3>
                        <p className="text-[9px] sm:text-xs text-slate-500 mb-2 sm:mb-4">Erros absolutos por disciplina nos últimos 7 dias.</p>
                        <div className="min-h-[220px] sm:min-h-[260px] w-full">
                            {pointLeakageData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={Math.max(220, pointLeakageData.length * 36)}>
                                    <BarChart data={pointLeakageData} layout="vertical" margin={{ top: 0, right: 30, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                        <XAxis type="number" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} allowDecimals={false} />
                                        <YAxis type="category" dataKey="name" stroke="#ffffff" tick={{ fontSize: 9, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} width={80} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(v, n, props) => [`${v} erros`, props?.payload?.fullName || 'Matéria']} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} minPointSize={4} style={{ filter: 'url(#barShadow)' }}>
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
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 shadow-lg hover:border-slate-700 transition-all w-full min-w-0">
                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 truncate">Última semana · todos os assuntos</p>
                        <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-1 truncate">📏 Assuntos Críticos <span className="text-slate-600 font-normal">({subtopicsData.length})</span></h3>
                        <p className="text-[9px] sm:text-[11px] text-slate-500 mb-2 sm:mb-4">Tópicos de todas as matérias com mais erros absolutos.</p>
                        <div className="min-h-[220px] sm:min-h-[260px] w-full">
                            {subtopicsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={Math.max(220, subtopicsData.length * 36)}>
                                    <BarChart data={subtopicsData} layout="vertical" margin={{ top: 0, right: 30, left: -5, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                        <XAxis type="number" stroke="#ffffff" tick={{ fontSize: 10, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} allowDecimals={false} />
                                        <YAxis type="category" dataKey="name" stroke="#ffffff" tick={{ fontSize: 9, fill: '#ffffff' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={{ stroke: 'rgba(255,255,255,0.2)' }} width={85} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(v, n, props) => [`${v} erros`, props?.payload?.fullName || 'Assunto']} contentStyle={CustomTooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} minPointSize={4} style={{ filter: 'url(#barShadow)' }}>
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

