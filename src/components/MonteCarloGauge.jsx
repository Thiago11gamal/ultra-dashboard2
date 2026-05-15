import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Gauge, TrendingUp, TrendingDown, Settings2, ChevronDown, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { GaussianPlot } from './charts/GaussianPlot';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { formatValue } from '../utils/scoreHelper';
import { getDateKey } from '../utils/dateHelper';
import { useMonteCarloStats } from '../hooks/useMonteCarloStats';

/**
 * MonteCarloGauge — Componente Principal de Projeção Estatística
 * 
 * Agora refatorado para usar o hook customizado useMonteCarloStats para 
 * desacoplar a lógica matemática da renderização de UI.
 */
export default function MonteCarloGauge({
    categories = [],
    goalDate,
    targetScore,
    onTargetScoreChange,
    forcedMode = null,
    forcedTitle = null,
    unit = '%',
    minScore = 0,
    maxScore = 100,
    syncShowSubjects,
    onSyncShowSubjects,
    simulateToday = false,
    onSimulateTodayChange,
}) {
    const [showConfig, setShowConfig] = useState(false);
    const [localShowPerSubject, setLocalShowPerSubject] = useState(false);
    const [timeIndex, setTimeIndex] = useState(-1);

    const [localSimulateToday, setLocalSimulateToday] = useState(Boolean(simulateToday));

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocalSimulateToday(Boolean(simulateToday));
    }, [simulateToday]);

    const activeId = useAppStore(state => state.appState?.activeId);
    const weights = useAppStore(state => state.appState?.contests?.[activeId]?.mcWeights || {});
    const activeUser = useAppStore(state => state.appState?.contests?.[activeId]?.user);

    // Prioritize sync prop if provided
    const showPerSubject = syncShowSubjects !== undefined ? syncShowSubjects : localShowPerSubject;
    const setShowPerSubject = onSyncShowSubjects !== undefined ? onSyncShowSubjects : setLocalShowPerSubject;

    const timelineDates = useMemo(() => {
        const dates = new Set();
        categories.forEach(cat => {
            if (cat.simuladoStats?.history) {
                cat.simuladoStats.history.forEach(h => {
                    const dk = getDateKey(h.date);
                    if (dk) dates.add(dk);
                });
            }
        });
        return Array.from(dates).sort((a, b) => new Date(a) - new Date(b));
    }, [categories]);

    const clampedTimeIndex = timeIndex >= timelineDates.length ? -1 : timeIndex;
    const resolvedSimulateToday = typeof onSimulateTodayChange === 'function' ? Boolean(simulateToday) : localSimulateToday;
    const setSimulateToday = typeof onSimulateTodayChange === 'function' ? onSimulateTodayChange : setLocalSimulateToday;
    const effectiveSimulateToday = forcedMode ? (forcedMode === 'today') : resolvedSimulateToday;

    // --- HOOK DE LÓGICA ESTATÍSTICA ---
    const stats = useMonteCarloStats({
        categories,
        goalDate,
        targetScore,
        timeIndex: clampedTimeIndex,
        timelineDates,
        minScore,
        maxScore,
        forcedMode,
        effectiveSimulateToday
    });

    const {
        simulationData,
        perSubjectProbs,
        isFlashing,
        projectedMean,
        currentMean,
        sd,
        sdLeft,
        sdRight,
        ci95Low,
        ci95High,
        pAdjusted,
        equalWeightsMode,
        setEqualWeightsMode,
        setWeights
    } = stats;

    const safe = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
    const boundedScore = (v) => Math.max(minScore, Math.min(maxScore, safe(v)));
    const projectedSafe = boundedScore(projectedMean);
    const currentSafe = boundedScore(currentMean);
    const targetSafe = boundedScore(targetScore);
    const ciLowSafeRaw = boundedScore(ci95Low);
    const ciHighSafeRaw = boundedScore(ci95High);
    const ciLowSafe = Math.min(ciLowSafeRaw, ciHighSafeRaw);
    const ciHighSafe = Math.max(ciLowSafeRaw, ciHighSafeRaw);
    const pAdjustedSafe = Math.max(0, Math.min(100, safe(pAdjusted)));
    const stableUpdateWeight = useCallback((name, p) => {
        setWeights((prevWeights) => ({ ...(prevWeights || {}), [name]: p }));
    }, [setWeights]);

    const getEqualWeights = useCallback(() => {
        const newWeights = {};
        categories.filter(c => c.simuladoStats?.history?.length > 0).forEach(cat => {
            newWeights[cat.id || cat.name] = 1;
        });
        return newWeights;
    }, [categories]);

    if (!simulationData || simulationData.status === 'waiting') {
        const hasHistory = categories.some(cat => {
            const h = cat.simuladoStats?.history;
            return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
        });
        return (
            <div className="glass px-6 pb-6 pt-10 rounded-3xl relative overflow-hidden flex flex-col items-center justify-between border-l-4 border-slate-600 bg-slate-900 w-full min-h-[400px]">
                {hasHistory ? <MonteCarloLoading /> : <EmptyPredictionState />}
            </div>
        );
    }

    const prob = Math.min(100, Math.max(0, safe(pAdjusted)));
    const roundedProb = Math.min(100, Math.max(0, Math.round(prob * 100) / 100));
    const inverseProb = parseFloat((100 - roundedProb).toFixed(2));

    const getGradientColor = (p) => {
        if (p >= 70) return "#22c55e";
        if (p >= 40) return "#f59e0b";
        return "#ef4444";
    };

    const gradientColor = getGradientColor(prob);
    const isTimeTraveling = clampedTimeIndex >= 0 && clampedTimeIndex < timelineDates.length - 1;

    let baseMessage = "RISCO DE QUEDA";
    if (prob > 95) baseMessage = "DOMÍNIO ESTRATÉGICO";
    else if (prob > 80) baseMessage = "A PROMESSA";
    else if (prob > 60) baseMessage = "NA ZONA DE BRIGA";
    else if (prob > 40) baseMessage = "COMPETITIVO";
    else if (prob > 20) baseMessage = "IMPROVISADOR";

    const message = baseMessage + (effectiveSimulateToday ? " (HOJE)" : " (FUTURO)");
    const projectionDelta = projectedSafe - currentSafe;
    const isProjectionNearCurrent = Math.abs(projectionDelta) < 0.5;
    const projectionDeltaLabel = `${projectionDelta >= 0 ? '+' : ''}${formatValue(projectionDelta)}${unit}`;

    return (
        <div className={`glass p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] relative flex flex-col border-l-4 border-blue-500 bg-slate-900 group transition-all duration-500 shadow-2xl w-full h-fit self-start static lg:sticky lg:top-28 ${isFlashing ? 'opacity-90 scale-[0.99]' : ''}`}>
            {isFlashing && (
                <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-3xl">
                    <div className="w-full h-1/2 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent absolute top-0 left-0 animate-scan-fast" />
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 relative z-10">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <Gauge size={16} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] leading-none">Monte Carlo</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Simulação Probabilística</span>
                        </div>
                    </div>
                    {forcedMode && (
                        <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border ${forcedMode === 'today' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                            {forcedTitle || (forcedMode === 'today' ? 'Modo: Hoje' : 'Modo: Futuro')}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {!forcedMode && (
                        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 w-full sm:w-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowConfig(true); }}
                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                                title="Configurar Pesos"
                            >
                                <Settings2 size={16} />
                            </button>
                            <div className="w-px h-4 bg-white/10" />
                            <button
                                onClick={(e) => { e.stopPropagation(); setSimulateToday(!resolvedSimulateToday); }}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${resolvedSimulateToday ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}
                            >
                                {resolvedSimulateToday ? 'Ver Projeção' : 'Ver Estatísticas'}
                                <ChevronDown size={12} className={`transition-transform duration-300 ${resolvedSimulateToday ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] mb-4">
                <div className={`w-full bg-black/40 rounded-2xl p-4 flex flex-col items-center transition-all duration-700 ${isFlashing ? 'blur-sm' : ''}`}>
                    <div className="relative mb-2 w-full max-w-[260px] h-[140px] flex justify-center">
                        <svg width="100%" height="100%" viewBox="0 -6 140 76" className="overflow-visible relative z-10 scale-110">
                            <path d="M 4 65 A 66 66 0 0 1 136 65" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
                            <path
                                d="M 4 65 A 66 66 0 0 1 136 65"
                                fill="none"
                                stroke={gradientColor}
                                strokeWidth="10"
                                strokeLinecap="round"
                                pathLength="100"
                                strokeDasharray={`${roundedProb} ${inverseProb}`}
                                style={{ transition: 'stroke-dasharray 1.5s ease-out' }}
                            />
                            <g transform={`rotate(${(prob / 100) * 180}, 70, 65)`} style={{ transition: 'transform 1.5s ease-out', opacity: isFlashing ? 0.3 : 1 }}>
                                <circle cx="4" cy="65" r="5" fill={gradientColor} />
                                <circle cx="4" cy="65" r="2.5" fill="#fff" opacity="0.9" />
                            </g>
                        </svg>
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center z-20 translate-y-2">
                            <span className="text-3xl sm:text-5xl font-black leading-none" style={{ color: getGradientColor(prob) }}>
                                <AnimatedProbability value={pAdjustedSafe} />
                            </span>
                        </div>
                    </div>
                    <span className={`mt-4 text-[11px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full bg-black/40 border border-white/10 transition-all duration-500`} style={{ color: isFlashing ? '#60a5fa' : gradientColor }}>
                        {isFlashing ? "Simulando..." : message}
                    </span>
                    
                    {/* CONFORMAL PREDICTION PANEL */}
                    <div className="mt-5 w-full flex flex-col items-center">
                        <div className="w-full sm:w-4/5 md:w-3/4 flex flex-col items-center justify-center p-3 rounded-2xl border border-white/5 bg-black/50 shadow-inner">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                                Faixa Provável (95%)
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-white">{formatValue(ciLowSafe)}</span>
                                <span className="text-slate-600 font-black">—</span>
                                <span className="text-2xl font-black text-white">{formatValue(ciHighSafe)}</span>
                            </div>
                            {stats.confidenceObj && (
                                <div className={`mt-3 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-lg ${stats.confidenceObj.glow}`} style={{ background: stats.confidenceObj.color }}>
                                    {stats.confidenceObj.label}
                                </div>
                            )}
                        </div>
                        
                        {/* Human Explanations */}
                        {stats.explanations && stats.explanations.length > 0 && (
                            <div className="w-full sm:w-4/5 md:w-3/4 mt-3 space-y-1.5 px-2">
                                {stats.explanations.map((msg, i) => (
                                    <div key={i} className="text-[10px] text-slate-300 font-medium leading-tight opacity-90">
                                        • {msg}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Drift Alerts */}
                        {stats.driftAlerts && stats.driftAlerts.length > 0 && (
                            <div className="w-full sm:w-4/5 md:w-3/4 mt-3 space-y-2">
                                {stats.driftAlerts.map((alert, i) => (
                                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${alert.severity === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                        <span className="text-[10px] font-bold leading-tight">{alert.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="mt-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center max-w-[260px] leading-relaxed opacity-80 pt-2 border-t border-white/5">
                            Em previsões semelhantes, 95% dos resultados reais ficaram dentro desta faixa.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                    {[
                        { label: "Sua Meta", val: `${formatValue(targetSafe)}${unit}`, color: "text-rose-500" },
                        { label: isTimeTraveling ? "Nesse Dia" : "Hoje", val: `${formatValue(currentSafe)}${unit}`, color: "text-white" },
                        { label: "Projeção", val: `${formatValue(projectedSafe)}${unit}`, color: "text-blue-400" },
                        { label: "Δ Futuro vs Hoje", val: projectionDeltaLabel, color: isProjectionNearCurrent ? "text-amber-300" : "text-cyan-300" },
                        { label: "Incerteza", val: `-${formatValue(safe(sdLeft))} / +${formatValue(safe(sdRight))}`, color: "text-amber-400", small: true },
                        { label: "IC 95%", val: `${formatValue(ciLowSafe)}–${formatValue(ciHighSafe)}${unit}`, color: "text-green-500/80", small: true }
                    ].map((m, i) => (
                    <div key={i} className="bg-black/30 p-2 rounded-xl border border-white/5 flex flex-col items-center justify-center min-h-[56px]">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">{m.label}</span>
                        <span className={`${m.small ? 'text-[9px] sm:text-[10px]' : 'text-xs sm:text-sm'} font-black ${m.color} truncate w-full text-center`}>{m.val}</span>
                    </div>
                ))}
            </div>

            <div className="w-full bg-black/40 rounded-2xl p-6 mb-4 border border-white/5 flex-1 flex flex-col min-h-[420px]">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Projeção de Desempenho</span>
                    <div className="flex gap-3">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1"><div className="w-2 h-0.5 bg-white/40"></div>Hoje</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1"><div className="w-2 h-0.5 bg-blue-500"></div>Projeção</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1"><div className="w-2 h-0.5 bg-red-500"></div>Meta</span>
                    </div>
                </div>
                <div className="flex-1 w-full h-[320px]">
                    <GaussianPlot
                        mean={projectedSafe}
                        sd={safe(sd)}
                        sdLeft={safe(sdLeft)}
                        sdRight={safe(sdRight)}
                        low95={ciLowSafe}
                        high95={ciHighSafe}
                        targetScore={targetSafe}
                        currentMean={currentSafe}
                        prob={safe(prob)}
                        kdeData={simulationData?.data?.kdeData}
                        projectedMean={projectedSafe}
                        unit={unit}
                        minScore={minScore}
                        maxScore={maxScore}
                    />
                </div>
            </div>

            {timelineDates.length > 1 && (
                <div className="w-full mt-4 px-3 py-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Máquina do Tempo</span>
                        <span className="text-[10px] font-black text-white bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                            {clampedTimeIndex === -1 ? 'Hoje' : new Date(timelineDates[clampedTimeIndex] + 'T12:00:00').toLocaleDateString()}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={Math.max(1, timelineDates.length - 1)}
                        value={clampedTimeIndex === -1 ? timelineDates.length - 1 : clampedTimeIndex}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setTimeIndex(val === timelineDates.length - 1 ? -1 : val);
                        }}
                        className="custom-slider w-full h-1.5 rounded-full outline-none"
                        style={{
                            background: `linear-gradient(to right, #6366f1 ${((clampedTimeIndex === -1 ? timelineDates.length - 1 : clampedTimeIndex) / Math.max(1, timelineDates.length - 1)) * 100}%, rgba(255,255,255,0.1) ${((clampedTimeIndex === -1 ? timelineDates.length - 1 : clampedTimeIndex) / Math.max(1, timelineDates.length - 1)) * 100}%)`,
                            touchAction: 'none'
                        }}
                    />
                </div>
            )}

            <div className="w-full flex flex-col gap-2 mt-4">
                <button
                    onClick={() => setShowPerSubject(!showPerSubject)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/50 hover:bg-slate-800 border border-white/10 rounded-xl transition-all"
                >
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Matérias Analisadas</span>
                    <ChevronDown size={12} className={`transition-transform ${showPerSubject ? 'rotate-180' : ''}`} />
                </button>

                {showPerSubject && perSubjectProbs.length > 0 && (
                    <div className="w-full bg-black/30 rounded-xl p-3 border border-white/5 space-y-1.5">
                        {perSubjectProbs.map(s => {
                            const probColor = s.prob < 40 ? 'text-rose-400' : s.prob < 60 ? 'text-amber-400' : s.prob < 80 ? 'text-blue-400' : 'text-emerald-400';
                            return (
                                <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                                    <div className="flex items-center gap-2 truncate">
                                        {s.trend === 'up' && <TrendingUp size={10} className="text-emerald-400" />}
                                        {s.trend === 'down' && <TrendingDown size={10} className="text-rose-400" />}
                                        <span className="text-[10px] text-slate-300 truncate">{s.name}</span>
                                    </div>
                                    <span className={`text-[10px] font-black ${probColor}`}>{formatValue(s.prob)}%</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {!forcedMode && (
                <MonteCarloConfig
                    show={showConfig}
                    onClose={setShowConfig}
                    targetScore={targetScore}
                    setTargetScore={onTargetScoreChange}
                    equalWeightsMode={equalWeightsMode}
                    setEqualWeightsMode={setEqualWeightsMode}
                    getEqualWeights={getEqualWeights}
                    weights={weights}
                    setWeights={setWeights}
                    updateWeight={stableUpdateWeight}
                    categories={categories}
                    user={activeUser}
                    minScore={minScore}
                    maxScore={maxScore}
                />
            )}
        </div>
    );
}

// ==========================================
// UX HELPERS & ATOMS
// ==========================================

function MonteCarloLoading() {
    const messages = [
        'Analisando estabilidade probabilística...',
        'Calculando intervalo conformal...',
        'Verificando confiabilidade histórica...',
        'Executando simulações Monte Carlo...'
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % messages.length);
        }, 2400);
        return () => clearInterval(interval);
    }, [messages.length]);

    return (
        <div className="flex flex-col items-center justify-center p-6 h-full flex-1">
            <Gauge size={48} className="text-slate-600 animate-pulse mb-6 opacity-30" />
            <div className="animate-pulse text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center max-w-[200px]">
                {messages[index]}
            </div>
        </div>
    );
}

function EmptyPredictionState() {
    return (
        <div className="rounded-3xl p-6 border border-white/5 bg-black/20 flex flex-col items-center justify-center text-center h-full flex-1 w-full my-auto">
            <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Dados insuficientes
            </h2>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                Ainda não há histórico suficiente para gerar uma projeção confiável.
            </p>
            <div className="mt-4 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold uppercase tracking-wider">
                Lance seu 1º simulado
            </div>
        </div>
    );
}

function AnimatedProbability({ value }) {
    const [display, setDisplay] = useState(value);
    const lastValue = React.useRef(value);

    useEffect(() => {
        const start = display;
        const end = value;
        if (Math.abs(start - end) < 0.1) {
            setDisplay(end);
            return;
        }

        const duration = 700;
        const startTime = performance.now();
        let frameId;

        function animate(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            // Easing function outQuint
            const easeOut = 1 - Math.pow(1 - progress, 5);
            const current = start + (end - start) * easeOut;

            setDisplay(current);

            if (progress < 1) {
                frameId = requestAnimationFrame(animate);
            }
        }
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [value]); // REMOVIDO 'display' para evitar loop infinito e explosão de frames

    return <span>{display.toFixed(0)}%</span>;
}
