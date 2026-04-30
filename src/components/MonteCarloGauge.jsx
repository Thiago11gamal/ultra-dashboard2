import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Gauge, TrendingUp, TrendingDown, Minus, Settings2, ChevronDown, History, FileText, Loader2, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { GaussianPlot } from './charts/GaussianPlot';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { formatValue, formatPercent } from '../utils/scoreHelper';
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
}) {
    const [simulateToday, setSimulateToday] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [localShowPerSubject, setLocalShowPerSubject] = useState(false);
    const [timeIndex, setTimeIndex] = useState(-1);

    const activeId = useAppStore(state => state.appState.activeId);
    const weights = useAppStore(state => state.appState.contests[activeId]?.mcWeights || {});
    const activeUser = useAppStore(state => state.appState.contests[activeId]?.user);

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

    useEffect(() => {
        if (timeIndex >= timelineDates.length) {
            setTimeIndex(-1);
        }
    }, [timelineDates.length, timeIndex]);

    const effectiveSimulateToday = forcedMode ? (forcedMode === 'today') : simulateToday;

    // --- HOOK DE LÓGICA ESTATÍSTICA ---
    const stats = useMonteCarloStats({
        categories,
        goalDate,
        targetScore,
        timeIndex,
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
        saturation,
        projectionConfidence,
        pAdjusted,
        pTrend,
        probability,
        debouncedTarget,
        equalWeightsMode,
        setEqualWeightsMode,
        setWeights
    } = stats;

    const safe = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
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
        return (
            <div className="glass px-6 pb-6 pt-10 rounded-3xl relative overflow-hidden flex flex-col items-center justify-between border-l-4 border-slate-600 bg-slate-900">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Gauge size={80} /></div>
                <div className="w-full flex justify-between items-center mb-2 pt-2">
                    <div className="flex items-center gap-2">
                        <Gauge size={16} className="text-slate-600" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Monte Carlo</span>
                    </div>
                </div>
                <div className="relative flex flex-col items-center justify-center py-2 h-full">
                    <svg width="200" height="100" viewBox="0 -6 140 76" className="overflow-visible">
                        <path d="M 4 65 A 66 66 0 0 1 136 65" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-end justify-center pb-2">
                        <span className="text-5xl font-black text-slate-600 tracking-tighter opacity-40">--%</span>
                    </div>
                </div>
                <div className="text-center w-full mt-2">
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Aguardando Dados</p>
                    <p className="text-[9px] text-slate-600 leading-tight px-4">Lance seu primeiro simulado para ativar a projeção Monte Carlo!</p>
                </div>
            </div>
        );
    }

    const prob = Math.min(100, Math.max(0, safe(probability)));
    const roundedProb = Math.min(100, Math.max(0, Math.round(prob * 100) / 100));
    const inverseProb = parseFloat((100 - roundedProb).toFixed(2));

    const getGradientColor = (p) => {
        if (p >= 70) return "#22c55e";
        if (p >= 40) return "#f59e0b";
        return "#ef4444";
    };

    const gradientColor = getGradientColor(prob);
    const isTimeTraveling = timeIndex >= 0 && timeIndex < timelineDates.length - 1;

    let baseMessage = "RISCO DE QUEDA";
    if (prob > 95) baseMessage = "DOMÍNIO ESTRATÉGICO";
    else if (prob > 80) baseMessage = "A PROMESSA";
    else if (prob > 60) baseMessage = "NA ZONA DE BRIGA";
    else if (prob > 40) baseMessage = "COMPETITIVO";
    else if (prob > 20) baseMessage = "IMPROVISADOR";

    const message = baseMessage + (effectiveSimulateToday ? " (HOJE)" : " (FUTURO)");

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
                                onClick={(e) => { e.stopPropagation(); setSimulateToday(!simulateToday); }}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${simulateToday ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}
                            >
                                {simulateToday ? 'Ver Projeção' : 'Ver Estatísticas'}
                                <ChevronDown size={12} className={`transition-transform duration-300 ${simulateToday ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] mb-4">
                <div className={`w-full bg-black/40 rounded-2xl p-4 flex flex-col items-center transition-all duration-700 ${isFlashing ? 'blur-sm' : ''}`}>
                    <div className="relative mb-2 w-full max-w-[260px] flex justify-center">
                        <svg width="100%" height="auto" viewBox="0 -6 140 76" className="overflow-visible relative z-10 scale-110">
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
                        <div className="absolute inset-x-0 bottom-1 flex items-end justify-center z-20">
                            <span className="text-3xl sm:text-5xl font-black" style={{ color: getGradientColor(prob) }}>
                                {formatPercent(pAdjusted)}
                            </span>
                        </div>
                    </div>
                    <span className={`mt-3 text-[11px] font-black uppercase tracking-widest px-5 py-2 rounded-full bg-black/40 border border-white/10 transition-all duration-500`} style={{ color: isFlashing ? '#60a5fa' : gradientColor }}>
                        {isFlashing ? "Simulando..." : message}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-6">
                {[
                    { label: "Sua Meta", val: `${formatValue(safe(targetScore))}${unit}`, color: "text-rose-500" },
                    { label: isTimeTraveling ? "Nesse Dia" : "Hoje", val: `${formatValue(safe(currentMean))}${unit}`, color: "text-white" },
                    { label: "Projeção", val: `${formatValue(safe(projectedMean))}${unit}`, color: "text-blue-400" },
                    { label: "Incerteza", val: `-${formatValue(sdLeft)} / +${formatValue(sdRight)}`, color: "text-amber-400", small: true },
                    { label: "IC 95%", val: `${formatValue(safe(ci95Low))}–${formatValue(safe(ci95High))}${unit}`, color: "text-green-500/80", small: true }
                ].map((m, i) => (
                    <div key={i} className="bg-black/30 p-2 rounded-xl border border-white/5 flex flex-col items-center justify-center min-h-[56px]">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">{m.label}</span>
                        <span className={`${m.small ? 'text-[9px] sm:text-[10px]' : 'text-xs sm:text-sm'} font-black ${m.color} truncate w-full text-center`}>{m.val}</span>
                    </div>
                ))}
            </div>

            <div className="w-full bg-black/40 rounded-2xl p-6 mb-4 border border-white/5 flex-1 flex flex-col min-h-[340px]">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Projeção de Desempenho</span>
                    <div className="flex gap-3">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1"><div className="w-2 h-0.5 bg-white/40"></div>Hoje</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1"><div className="w-2 h-0.5 bg-blue-500"></div>Projeção</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1"><div className="w-2 h-0.5 bg-red-500"></div>Meta</span>
                    </div>
                </div>
                <div className="flex-1 w-full h-[260px]">
                    <GaussianPlot
                        mean={safe(projectedMean)}
                        sd={safe(sd)}
                        sdLeft={safe(sdLeft)}
                        sdRight={safe(sdRight)}
                        low95={safe(ci95Low)}
                        high95={safe(ci95High)}
                        targetScore={safe(targetScore)}
                        currentMean={safe(currentMean)}
                        prob={safe(prob)}
                        kdeData={simulationData?.data?.kdeData}
                        projectedMean={safe(projectedMean)}
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
                            {timeIndex === -1 ? 'Hoje' : new Date(timelineDates[timeIndex] + 'T12:00:00').toLocaleDateString()}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={timelineDates.length - 1}
                        value={timeIndex === -1 ? timelineDates.length - 1 : timeIndex}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setTimeIndex(val === timelineDates.length - 1 ? -1 : val);
                        }}
                        className="custom-slider w-full h-1.5 rounded-full outline-none"
                        style={{
                            background: `linear-gradient(to right, #6366f1 ${((timeIndex === -1 ? timelineDates.length - 1 : timeIndex) / (timelineDates.length - 1)) * 100}%, rgba(255,255,255,0.1) ${((timeIndex === -1 ? timelineDates.length - 1 : timeIndex) / (timelineDates.length - 1)) * 100}%)`,
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
                />
            )}
        </div>
    );
}
