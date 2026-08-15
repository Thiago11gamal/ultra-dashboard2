import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Gauge, TrendingUp, TrendingDown, Settings2, ChevronDown, AlertTriangle, Activity } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { GaussianPlot } from './charts/GaussianPlot';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { formatValue } from '../utils/scoreHelper';
import { getDateKey, formatDatePtBR, normalizeDate, parseNoonLocal } from '../utils/dateHelper';
import { useMonteCarloStats } from '../hooks/useMonteCarloStats';

const EMPTY_ARRAY = Object.freeze([]);

/**
 * MonteCarloGauge — Componente Principal de Projeção Estatística
 * 
 * Agora refatorado para usar o hook customizado useMonteCarloStats para 
 * desacoplar a lógica matemática da renderização de UI.
 */
// T-039 FIX: memoizar o gauge para reduzir re-renderizações desnecessárias.
const MonteCarloGaugeBase = ({
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
    precomputedStats = null, // ✅ NOVO
}) => {
    const [showConfig, setShowConfig] = useState(false);
    const [localShowPerSubject, setLocalShowPerSubject] = useState(false);
    const [timeIndex, setTimeIndex] = useState(-1);
    const [localTimeIndex, setLocalTimeIndex] = useState(-1);
    const isDraggingTime = useRef(false);
    const debounceTimeoutTime = useRef(null);
    // C5 FIX: Usar useRef em vez de window.mcGaugeDragTimeout para evitar race condition
    // quando o componente é montado mais de uma vez (Strict Mode, navegação).
    const dragDebounceRef = useRef(null);
    const timeSliderRef = useRef(null);

    const timelineDates = useMemo(() => {
        const dates = new Set();
        const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});
        safeCategories.forEach(cat => {
            if (cat.simuladoStats?.history) {
                const safeHistory = Array.isArray(cat.simuladoStats.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats.history);
                safeHistory.forEach(h => {
                    if (!h) return;
                    const normalized = normalizeDate(h.date);
                    const dk = normalized ? getDateKey(normalized) : null;
                    if (dk) dates.add(dk);
                });
            }
        });
        // T-025 FIX: evitar new Date('YYYY-MM-DD') por causa de parsing UTC ambíguo.
        return Array.from(dates).sort((a, b) => {
            const da = parseNoonLocal?.(a)?.getTime() ?? normalizeDate(a)?.getTime() ?? 0;
            const db = parseNoonLocal?.(b)?.getTime() ?? normalizeDate(b)?.getTime() ?? 0;
            return da - db;
        });
    }, [categories]);

    useEffect(() => {
        if (!isDraggingTime.current) {
            setLocalTimeIndex(timeIndex);
            if (timeSliderRef.current) {
                const effectiveValue = timeIndex === -1 || timeIndex >= timelineDates.length ? Math.max(0, timelineDates.length - 1) : timeIndex;
                if (timeSliderRef.current.value !== String(effectiveValue)) {
                    timeSliderRef.current.value = effectiveValue;
                }
            }
        }
    }, [timeIndex, timelineDates.length]);

    useEffect(() => {
        return () => {
            if (debounceTimeoutTime.current) clearTimeout(debounceTimeoutTime.current);
            if (dragDebounceRef.current) clearTimeout(dragDebounceRef.current);
        };
    }, []);

    // C4 FIX: Estado-derivado-de-prop via useEffect eliminado.
    // localSimulateToday era apenas um espelho de simulateToday, causando render extra.
    // resolvedSimulateToday (linha abaixo) já resolve isso diretamente sem estado intermediário.
    const [localSimulateToday, setLocalSimulateToday] = useState(Boolean(simulateToday));

    const activeId = useAppStore(state => state.appState?.activeId);
    const weights = useAppStore(state => state.appState?.contests?.[activeId]?.mcWeights || {});
    const activeUser = useAppStore(state => state.appState?.contests?.[activeId]?.user);
    // T-008 FIX: Normalizar para array antes de passar ao MonteCarloConfig.
    const rawHistoricalCutoffs = useAppStore(
        state => state.appState?.contests?.[activeId]?.historicalCutoffs
    );
    const historicalCutoffs = useMemo(() => {
        if (Array.isArray(rawHistoricalCutoffs)) return rawHistoricalCutoffs;
        if (rawHistoricalCutoffs && typeof rawHistoricalCutoffs === 'object') {
            return Object.values(rawHistoricalCutoffs);
        }
        return EMPTY_ARRAY;
    }, [rawHistoricalCutoffs]);
    const setHistoricalCutoffs = useAppStore(state => state.setHistoricalCutoffs);

    // Prioritize sync prop if provided
    const showPerSubject = syncShowSubjects !== undefined ? syncShowSubjects : localShowPerSubject;
    const setShowPerSubject = onSyncShowSubjects !== undefined ? onSyncShowSubjects : setLocalShowPerSubject;



    const clampedTimeIndex = (timeIndex < 0 || timeIndex >= timelineDates.length) ? -1 : timeIndex;
    const resolvedSimulateToday = typeof onSimulateTodayChange === 'function' ? Boolean(simulateToday) : localSimulateToday;
    const setSimulateToday = typeof onSimulateTodayChange === 'function' ? onSimulateTodayChange : setLocalSimulateToday;
    const effectiveSimulateToday = forcedMode ? (forcedMode === 'today') : resolvedSimulateToday;

    // --- HOOK DE LÓGICA ESTATÍSTICA ---
    // CORRIGIDO: hook sempre é chamado; escolhemos a fonte depois.
    const hookStats = useMonteCarloStats({
        categories,
        goalDate,
        targetScore,
        timeIndex: clampedTimeIndex,
        timelineDates,
        minScore,
        maxScore,
        forcedMode,
        effectiveSimulateToday,
        // T-040 FIX: só calcular subjects quando o painel estiver visível
        enablePerSubject: showPerSubject
    });

    const stats = precomputedStats ?? hookStats;

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
    // T-009 FIX: setWeights da store pode não aceitar função updater.
    // Usamos o valor atual de `weights` diretamente para evitar corrupção de estado.
    const stableUpdateWeight = useCallback((name, p) => {
        setWeights({ ...(weights || {}), [name]: p });
    }, [setWeights, weights]);

    const getEqualWeights = useCallback(() => {
        const newWeights = {};

        // T-018 FIX: normalizar categories
        const safeCategories = Array.isArray(categories)
            ? categories
            : Object.values(categories || {});

        safeCategories.filter(c => {
            const h = c.simuladoStats?.history;
            return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
        }).forEach(cat => {
            newWeights[cat.id || cat.name] = 1;
        });
        return newWeights;
    }, [categories]);

    // T-032 FIX: diagnóstico mais preciso do estado de espera.
    const safeCategories = Array.isArray(categories)
        ? categories
        : Object.values(categories || {});

    const hasHistory = safeCategories.some(cat => {
        const h = cat.simuladoStats?.history;
        return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
    });

    const totalActiveWeight = (() => {
        // No modo pesos iguais sempre existe peso ativo.
        if (equalWeightsMode) return 1;

        return safeCategories.reduce((sum, cat) => {
            const h = cat.simuladoStats?.history;
            const hLen = h
                ? (Array.isArray(h) ? h.length : Object.keys(h).length)
                : 0;

            if (hLen === 0) return sum;

            const rawW = weights?.[cat.id || cat.name];

            // Se o peso não foi definido, o motor assume 1.
            const w = (rawW === undefined || rawW === null)
                ? 1
                : Number(rawW);

            return sum + Math.max(0, Number.isFinite(w) ? w : 0);
        }, 0);
    })();

    // T-026 FIX: unidade dinâmica.
    // Se o componente vier com unidade padrão '%' mas a escala não for 100,
    // assumimos pontos absolutos.
    const resolvedUnit = useMemo(() => {
        if (typeof unit === 'string' && unit.trim() !== '' && unit !== '%') {
            return unit;
        }

        return Number(maxScore) === 100 ? '%' : ' pts';
    }, [unit, maxScore]);

    if (!simulationData || simulationData.status === 'waiting') {
        let waitingKind = 'loading';

        if (!hasHistory) {
            waitingKind = 'empty';
        } else if (totalActiveWeight === 0) {
            waitingKind = 'zeroWeights';
        } else if (simulationData?.missing === 'count') {
            waitingKind = 'insufficient';
        }

        return (
            <div className="glass px-6 pb-6 pt-10 rounded-3xl relative overflow-hidden flex flex-col items-center justify-between border-l-4 border-slate-600 bg-slate-900 w-full min-h-[400px]">
                {waitingKind === 'empty' && <EmptyPredictionState />}
                {waitingKind === 'zeroWeights' && <AllWeightsZeroState />}
                {waitingKind === 'insufficient' && <InsufficientHistoryState />}
                {waitingKind === 'loading' && <MonteCarloLoading />}
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
    const projectionDeltaLabel = `${projectionDelta >= 0 ? '+' : ''}${formatValue(projectionDelta)}${resolvedUnit}`;

    const isTodayMode = forcedMode === 'today';
    const isFutureMode = forcedMode === 'future';

    const cardTheme = isTodayMode
        ? {
            border: 'border-l-4 border-emerald-500',
            glow: 'hover:shadow-emerald-500/10',
            iconBg: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 shadow-emerald-500/10',
            iconColor: 'text-emerald-400',
            title: forcedTitle || 'Status Atual',
            subtitle: 'Dados Consolidados',
            badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
            badgeLabel: 'Empírico'
        }
        : isFutureMode
        ? {
            border: 'border-l-4 border-indigo-500',
            glow: 'hover:shadow-indigo-500/10',
            iconBg: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30 shadow-indigo-500/10',
            iconColor: 'text-indigo-400',
            title: forcedTitle || 'Projeção Futura',
            subtitle: 'Estimativa na Data-Alvo',
            badgeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
            badgeLabel: 'Simulação'
        }
        : {
            border: 'border-l-4 border-blue-500',
            glow: 'hover:shadow-blue-500/10',
            iconBg: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 shadow-blue-500/10',
            iconColor: 'text-blue-400',
            title: 'Monte Carlo',
            subtitle: 'Simulação Probabilística',
            badgeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
            badgeLabel: resolvedSimulateToday ? 'Hoje' : 'Futuro'
        };

    return (
        <div className={`glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl relative flex flex-col ${cardTheme.border} bg-slate-900/90 group transition-all duration-500 shadow-2xl ${cardTheme.glow} w-full h-full ${isFlashing ? 'opacity-90 scale-[0.99]' : ''}`}>
            {isFlashing && (
                <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-3xl">
                    <div className="w-full h-1/2 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent absolute top-0 left-0 animate-scan-fast" />
                </div>
            )}

            <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cardTheme.iconBg} border flex items-center justify-center shadow-lg shrink-0`}>
                        <Gauge size={18} className={cardTheme.iconColor} />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white uppercase tracking-wider leading-none">{cardTheme.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border ${cardTheme.badgeBg}`}>
                                {cardTheme.badgeLabel}
                            </span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 mt-1">{cardTheme.subtitle}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!forcedMode && (
                        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowConfig(true); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                title="Configurar Classificações"
                            >
                                <Settings2 size={16} />
                            </button>
                            <div className="w-px h-4 bg-white/10" />
                            <button
                                onClick={(e) => { e.stopPropagation(); setSimulateToday(!resolvedSimulateToday); }}
                                className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${resolvedSimulateToday ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}
                            >
                                <span>{resolvedSimulateToday ? 'Hoje' : 'Futuro'}</span>
                                <ChevronDown size={12} className={`transition-transform duration-300 ${resolvedSimulateToday ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full flex flex-col items-center justify-center mb-4">
                <div className={`w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-3.5 transition-all duration-700 shadow-xl relative overflow-hidden ${isFlashing ? 'blur-sm' : ''}`}>
                    {/* Gauge Arc Graphic */}
                    <div className="relative w-full max-w-[260px] h-[130px] flex justify-center mt-1">
                        <svg width="100%" height="100%" viewBox="0 -6 140 76" className="overflow-visible relative z-10">
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
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center z-20 translate-y-1">
                            <span className="text-3xl sm:text-4xl font-black leading-none tracking-tight" style={{ color: getGradientColor(prob) }}>
                                <AnimatedProbability value={pAdjustedSafe} />
                            </span>
                        </div>
                    </div>

                    {/* Classification Status Pill */}
                    <span 
                        className="text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full bg-slate-900/90 border shadow-sm transition-all duration-500" 
                        style={{ color: isFlashing ? '#60a5fa' : gradientColor, borderColor: `${gradientColor}40` }}
                    >
                        {isFlashing ? "Simulando..." : message}
                    </span>
                    
                    {/* CONFORMAL PREDICTION HUD (Faixa Provável 95%) */}
                    <div className="w-full bg-slate-900/80 rounded-xl p-3 border border-white/10 shadow-inner flex flex-col items-center justify-center">
                        <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                Faixa Provável (95%)
                            </span>
                            {stats.confidenceObj && (
                                <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border shadow-sm ${
                                    stats.confidenceObj.tier === 'HIGH'
                                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10'
                                        : stats.confidenceObj.tier === 'MEDIUM'
                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-amber-500/10'
                                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-rose-500/10'
                                }`}>
                                    <span className={`w-1 h-1 rounded-full ${
                                        stats.confidenceObj.tier === 'HIGH' ? 'bg-emerald-400 animate-pulse' :
                                        stats.confidenceObj.tier === 'MEDIUM' ? 'bg-amber-400' : 'bg-rose-400'
                                    }`} />
                                    <span>{stats.confidenceObj.label}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-baseline justify-center gap-2 mt-1">
                            <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">{formatValue(ciLowSafe)}</span>
                            <span className="text-slate-500 font-bold text-sm">—</span>
                            <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">{formatValue(ciHighSafe)}</span>
                            <span className="text-xs font-bold text-slate-400">{resolvedUnit}</span>
                        </div>
                    </div>
                    
                    {/* Insights & Drift Alerts Container - Balanced Height */}
                    <div className="w-full bg-slate-900/50 rounded-xl p-3 border border-white/5 flex flex-col gap-1.5 min-h-[76px] justify-center">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            <Activity size={11} className="text-blue-400" />
                            <span>Diagnóstico & Sinais</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {stats.explanations && stats.explanations.map((msg, i) => (
                                <div key={i} className="text-[10.5px] text-slate-300 font-medium leading-snug flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400/80 mt-1.5 shrink-0" />
                                    <span>{msg}</span>
                                </div>
                            ))}
                            {(!stats.explanations || stats.explanations.length === 0) && (
                                <div className="text-[10.5px] text-slate-400 italic">
                                    Desempenho estável conforme o modelo estatístico.
                                </div>
                            )}
                            {stats.driftAlerts && stats.driftAlerts.map((alert, i) => (
                                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${
                                    alert.severity === 'high' 
                                        ? 'bg-rose-500/10 border-rose-500/25 text-rose-300' 
                                        : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                                } mt-0.5`}>
                                    <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-400" />
                                    <span className="text-[10.5px] font-bold leading-tight">{alert.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Guarantee Subtext */}
                    <p className="pt-2 text-[9px] text-slate-500 font-medium uppercase tracking-wider text-center w-full leading-relaxed opacity-80 border-t border-white/5">
                        Em previsões semelhantes, 95% dos resultados reais ficaram dentro desta faixa.
                    </p>
                </div>
            </div>

            {/* Lower Bound Group for perfect horizontal alignment */}
            <div className="w-full flex flex-col mt-auto pt-2">
                {/* Telemetry Metrics 6-Grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-4 w-full">
                {[
                    { 
                        label: "Sua Meta", 
                        badgeClass: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
                        val: `${formatValue(targetSafe)}${resolvedUnit}`, 
                        color: "text-rose-400" 
                    },
                    { 
                        label: isTimeTraveling ? "Nesse Dia" : "Hoje", 
                        badgeClass: "bg-slate-700/40 text-slate-200 border border-white/10",
                        val: `${formatValue(currentSafe)}${resolvedUnit}`, 
                        color: "text-white" 
                    },
                    { 
                        label: "Projeção", 
                        badgeClass: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
                        val: `${formatValue(projectedSafe)}${resolvedUnit}`, 
                        color: "text-blue-400" 
                    },
                    {
                        label: effectiveSimulateToday ? "Δ vs Hoje" : "Δ Futuro vs Hoje",
                        badgeClass: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",
                        val: projectionDeltaLabel,
                        color: isProjectionNearCurrent ? "text-amber-300" : "text-cyan-300"
                    },
                    {
                        label: "Incerteza",
                        badgeClass: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
                        val: safe(sdLeft) === 0 && safe(sdRight) === 0 
                            ? `±0${resolvedUnit}` 
                            : `-${formatValue(safe(sdLeft))} / +${formatValue(safe(sdRight))}${resolvedUnit}`,
                        color: "text-amber-400"
                    },
                    {
                        label: "IC 95%",
                        badgeClass: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
                        val: `${formatValue(ciLowSafe)}–${formatValue(ciHighSafe)}${resolvedUnit}`,
                        color: "text-emerald-400"
                    }
                ].map((m, i) => (
                    <div key={i} className="bg-slate-950/50 p-2 sm:p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center min-h-[58px] transition-all hover:border-white/15 hover:bg-slate-900/60 shadow-sm">
                        <span className={`text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-1 text-center w-auto max-w-full truncate ${m.badgeClass}`}>
                            {m.label}
                        </span>
                        <span className={`text-xs sm:text-sm font-black ${m.color} w-full text-center break-words leading-tight tracking-tight mt-0.5 font-mono`}>
                            {m.val}
                        </span>
                    </div>
                ))}
            </div>

            <div className="w-full bg-slate-950/50 rounded-2xl p-4 sm:p-5 mb-4 border border-white/5 flex flex-col shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Curva de Densidade Probabilística</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1.5"><div className="w-2 h-0.5 bg-white rounded-full"></div>Hoje</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1.5"><div className="w-2 h-0.5 bg-blue-500 rounded-full"></div>Projeção</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1.5"><div className="w-2 h-0.5 bg-rose-500 rounded-full"></div>Meta</span>
                    </div>
                </div>
                <div className="w-full">
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
                        unit={resolvedUnit}
                        minScore={minScore}
                        maxScore={maxScore}
                    />
                </div>
            </div>

            <div className="w-full flex flex-col">
                {timelineDates.length > 1 && (
                    <div className="w-full mb-4 px-4 py-3.5 bg-black/40 rounded-xl border border-white/5 relative z-10 min-h-[72px]">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Máquina do Tempo</span>
                            <span className="text-[10px] font-black text-white bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                                {clampedTimeIndex === -1 || !timelineDates[clampedTimeIndex] ? 'Hoje' : formatDatePtBR(`${timelineDates[clampedTimeIndex]}T12:00:00`)}
                            </span>
                        </div>
                        <input
                            ref={timeSliderRef}
                            type="range"
                            min="0"
                            max={Math.max(1, timelineDates.length - 1)}
                            aria-label="Máquina do tempo"
                            defaultValue={localTimeIndex === -1 || localTimeIndex >= timelineDates.length ? Math.max(0, timelineDates.length - 1) : localTimeIndex}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                const newTimeIndex = val === timelineDates.length - 1 ? -1 : val;
                                setLocalTimeIndex(newTimeIndex);
                                
                                isDraggingTime.current = true;
                                if (dragDebounceRef.current) clearTimeout(dragDebounceRef.current);
                                dragDebounceRef.current = setTimeout(() => { isDraggingTime.current = false; }, 500);

                                if (debounceTimeoutTime.current) clearTimeout(debounceTimeoutTime.current);
                                debounceTimeoutTime.current = setTimeout(() => {
                                    if (React.startTransition) {
                                        React.startTransition(() => {
                                            setTimeIndex(newTimeIndex);
                                        });
                                    } else {
                                        setTimeIndex(newTimeIndex);
                                    }
                                }, 40);
                            }}
                            onPointerDown={() => {
                                isDraggingTime.current = true;
                            }}
                            onPointerUp={() => {
                                isDraggingTime.current = false;
                                if (dragDebounceRef.current) clearTimeout(dragDebounceRef.current);
                            }}
                            onTouchStart={() => { isDraggingTime.current = true; }}
                            onTouchEnd={() => {
                                isDraggingTime.current = false;
                                if (dragDebounceRef.current) clearTimeout(dragDebounceRef.current);
                            }}
                            className="custom-slider w-full h-1.5 rounded-full outline-none"
                            style={{
                                background: `linear-gradient(to right, #6366f1 ${((localTimeIndex === -1 || localTimeIndex >= timelineDates.length ? Math.max(0, timelineDates.length - 1) : localTimeIndex) / Math.max(1, timelineDates.length - 1)) * 100}%, rgba(255,255,255,0.1) ${((localTimeIndex === -1 || localTimeIndex >= timelineDates.length ? Math.max(0, timelineDates.length - 1) : localTimeIndex) / Math.max(1, timelineDates.length - 1)) * 100}%)`,
                                touchAction: 'none'
                            }}
                        />
                    </div>
                )}

                <div className="w-full flex flex-col gap-2">
                <button
                    onClick={() => setShowPerSubject(!showPerSubject)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/50 hover:bg-slate-800 border border-white/10 rounded-xl transition-all"
                >
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Matérias Analisadas</span>
                    <ChevronDown size={12} className={`transition-transform ${showPerSubject ? 'rotate-180' : ''}`} />
                </button>

                {showPerSubject && perSubjectProbs.length > 0 && (
                    <div className="w-full bg-black/30 rounded-xl p-3 border border-white/5 space-y-1.5">
                        {perSubjectProbs.map((s, idx) => {
                            const probColor = s.prob < 40 ? 'text-rose-400' : s.prob < 60 ? 'text-amber-400' : s.prob < 80 ? 'text-blue-400' : 'text-emerald-400';
                            return (
                                <div key={`${s.name}-${idx}`} className="flex flex-col gap-1.5 py-2 border-b border-white/5 last:border-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 truncate">
                                            {s.trend === 'up' && <TrendingUp size={10} className="text-emerald-400" />}
                                            {s.trend === 'down' && <TrendingDown size={10} className="text-rose-400" />}
                                            <span className="text-[10px] text-slate-300 truncate">{s.name}</span>
                                        </div>
                                        <span className={`text-[10px] font-black ${probColor}`}>{formatValue(s.prob)}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${s.prob < 40 ? 'bg-rose-400' : s.prob < 60 ? 'bg-amber-400' : s.prob < 80 ? 'bg-blue-400' : 'bg-emerald-400'}`}
                                            style={{ width: `${Math.min(100, Math.max(0, s.prob))}%`, transition: 'width 1s ease-out' }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                </div>
            </div>
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
                    historicalCutoffs={historicalCutoffs}
                    setHistoricalCutoffs={setHistoricalCutoffs}
                />
            )}
        </div>
    );
};

// T-039 FIX: exportar versão memoizada
export default React.memo(MonteCarloGaugeBase);

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
            if (!document.hidden) {
                setIndex((prev) => (prev + 1) % messages.length);
            }
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

// T-032 FIX: Estado específico para pesos zerados.
function AllWeightsZeroState() {
    return (
        <div className="rounded-3xl p-6 border border-amber-500/20 bg-amber-950/10 flex flex-col items-center justify-center text-center h-full flex-1 w-full my-auto">
            <div className="text-3xl mb-3">⚖️</div>

            <h2 className="text-[12px] font-black text-amber-300 uppercase tracking-widest mb-3">
                Todos os pesos estão zerados
            </h2>

            <p className="text-[10px] text-slate-400 leading-relaxed font-medium max-w-[260px]">
                Há histórico de simulados, mas todas as matérias estão com peso zero.
                Ajuste os pesos em Configuração para calcular a simulação Monte Carlo.
            </p>

            <div className="mt-4 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                Abra Configurar Classificações e Meta
            </div>
        </div>
    );
}

// T-032 FIX: Estado específico para histórico insuficiente.
function InsufficientHistoryState() {
    return (
        <div className="rounded-3xl p-6 border border-blue-500/20 bg-blue-950/10 flex flex-col items-center justify-center text-center h-full flex-1 w-full my-auto">
            <div className="text-3xl mb-3">📉</div>

            <h2 className="text-[12px] font-black text-blue-300 uppercase tracking-widest mb-3">
                Histórico insuficiente
            </h2>

            <p className="text-[10px] text-slate-400 leading-relaxed font-medium max-w-[260px]">
                Há alguns dados, mas ainda não há pontos válidos suficientes para gerar uma projeção confiável.
                Lance mais simulados ou revise os filtros de data/pesos.
            </p>

            <div className="mt-4 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold uppercase tracking-wider">
                Mínimo recomendado: 3 simulados
            </div>
        </div>
    );
}

function AnimatedProbability({ value }) {
    const [display, setDisplay] = useState(value);
    // BUG-AUDIT-05 FIX: Ref que rastreia o valor corrente da animação para evitar stale closure.
    // Sem isso, transições rápidas (60→70 durante animação 50→60) começariam de 50, não de ~58.
    const displayRef = useRef(value);

    useEffect(() => {
        const start = displayRef.current; // Sempre pega o valor visual corrente, não o state stale
        const end = value;
        if (Math.abs(start - end) < 0.1) {
            setDisplay(end);
            displayRef.current = end;
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

            displayRef.current = current;
            setDisplay(current);

            if (progress < 1) {
                frameId = requestAnimationFrame(animate);
            }
        }
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [value]);

    return <span>{display.toFixed(0)}%</span>;
}
