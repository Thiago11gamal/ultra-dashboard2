import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Gauge, TrendingUp, TrendingDown, Minus, Settings2, Info } from 'lucide-react';
import {
    computeCategoryStats,
    computeBayesianLevel,
    monteCarloSimulation,
    runMonteCarloAnalysis,
    computePooledSD,
    calculateVolatility
} from '../engine';
import { useAppStore } from '../store/useAppStore';
import { GaussianPlot } from './charts/GaussianPlot';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { getSafeScore } from '../utils/scoreHelper';
import { getDateKey } from '../utils/dateHelper';

const sanitizeWeightUnit = (value) => {
    const numeric = Number.parseInt(value, 10);
    if (Number.isNaN(numeric)) return 0;
    return Math.max(0, Math.min(999, numeric));
};

export default function MonteCarloGauge({
    categories = [],
    goalDate,
    targetScore,
    onTargetScoreChange, // Callback to update parent state
    forcedMode = null, // 'today' or 'future'
    forcedTitle = null
}) {
    const [simulateToday, setSimulateToday] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    const activeId = useAppStore(state => state.appState.activeId);
    const weights = useAppStore(state => state.appState.contests[activeId]?.mcWeights || null);
    const equalWeightsMode = useAppStore(state => state.appState.mcEqualWeights ?? true);

    const setWeights = useAppStore(state => state.setMonteCarloWeights);
    const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);
    const activeUser = useAppStore(state => state.appState.contests[activeId]?.user);

    const activeCategories = useMemo(() =>
        categories.filter(c => c.simuladoStats?.history?.length > 0),
        [categories]);

    const catCount = activeCategories.length;

    const effectiveSimulateToday = forcedMode ? (forcedMode === 'today') : simulateToday;

    const projectDays = useMemo(() => {
        if (effectiveSimulateToday) return 0;
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
        const diffTime = goal - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }, [goalDate, effectiveSimulateToday]);

    const getEqualWeights = useCallback(() => {
        if (categories.length === 0) return {};
        const newWeights = {};
        categories.forEach(cat => {
            newWeights[cat.name] = 1; // Default to Peso 1
        });
        return newWeights;
    }, [categories]);

    useEffect(() => {
        if (catCount > 0 && (!weights || Object.keys(weights).length === 0)) {
            const initialWeights = getEqualWeights();
            setWeights(initialWeights);
        }
    }, [catCount, weights, getEqualWeights, setWeights]);

    const effectiveWeights = useMemo(() => {
        if (equalWeightsMode) return getEqualWeights();
        if (!weights) return getEqualWeights();

        const weightsMap = {};
        categories.forEach(cat => {
            // Default to 1 (Peso 1) if weight is missing or 0
            const w = sanitizeWeightUnit(weights[cat.name]);
            weightsMap[cat.name] = w > 0 ? w : 1;
        });
        return weightsMap;
    }, [equalWeightsMode, weights, categories, getEqualWeights]);

    const [debouncedTarget, setDebouncedTarget] = useState(targetScore);
    // BUGFIX M4: inicializar como null para aguardar hidratação do Zustand.
    // Inicializar com effectiveWeights causava um setState com pesos padrão (todos=1)
    // que sobrescrevia os pesos customizados salvos antes do Zustand reidratar.
    const [debouncedWeights, setDebouncedWeights] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedTarget(targetScore), 300);
        return () => clearTimeout(timer);
    }, [targetScore]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedWeights(effectiveWeights), 300);
        return () => clearTimeout(timer);
    }, [effectiveWeights]);


    const statsData = useMemo(() => {
        let categoryStats = [];
        let totalWeight = 0;
        let weightedBayesianSum = 0;

        // Group scores by date for BUG-03 (paths)
        const scoresByDate = {};
        const weightsByName = {};

        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length > 0) {
                const history = [...cat.simuladoStats.history].sort((a, b) => new Date(a.date) - new Date(b.date));
                const weight = sanitizeWeightUnit((debouncedWeights ?? effectiveWeights)[cat.name] ?? 0);
                const stats = computeCategoryStats(history, weight);
                const bayesian = computeBayesianLevel(history);

                if (stats) {
                    if (weight > 0) {
                        totalWeight += weight;
                        weightedBayesianSum += bayesian.mean * weight;
                        weightsByName[cat.name] = weight;

                        history.forEach(h => {
                            const dk = getDateKey(h.date);
                            if (dk) {
                                if (!scoresByDate[dk]) scoresByDate[dk] = {};
                                scoresByDate[dk][cat.name] = getSafeScore(h);
                            }
                        });
                    }
                    categoryStats.push({ name: cat.name, ...stats });
                }
            }
        });

        if (categoryStats.length === 0 || totalWeight === 0) return null;

        // MC-04 FIX: pooledSD is only used for the "Today" (static) simulation.
        // It shouldn't include future time uncertainty.
        const pooledSD = computePooledSD(categoryStats, totalWeight, 0); 
        const bayesianMean = weightedBayesianSum / totalWeight;

        // Calculate weighted Bayesian interval
        let weightedLow = 0;
        let weightedHigh = 0;
        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length > 0) {
                const weight = (debouncedWeights ?? effectiveWeights)[cat.name] || 0;
                if (weight > 0) {
                    const baye = computeBayesianLevel(cat.simuladoStats.history);
                    weightedLow += baye.ciLow * (weight / totalWeight);
                    weightedHigh += baye.ciHigh * (weight / totalWeight);
                }
            }
        });

        // Reconstruct consolidated global history for path simulation
        const sortedDates = Object.keys(scoresByDate).sort((a, b) => new Date(a) - new Date(b));

        // C-04 FIX: Só gerar ponto quando pelo menos 1 matéria foi avaliada naquele dia.
        // BUG-03 RIGOR: Para o histórico visual, mantemos a agregação diária.
        const globalHistory = sortedDates.map(date => {
            let sum = 0;
            let tw = 0;
            Object.keys(scoresByDate[date]).forEach(name => {
                const w = weightsByName[name];
                if (w > 0) {
                    sum += scoresByDate[date][name] * w;
                    tw += w;
                }
            });
            return { date, score: tw > 0 ? sum / tw : 0 };
        }).filter(h => h.score >= 0 && !isNaN(h.score));

        // BUG-03 FIX: Volatilidade Inflada.
        // Não usamos calculateVolatility(globalHistory) pois saltos entre matérias (ex: Português 90 -> Matemática 50)
        // inflariam artificialmente o desvio padrão diário.
        // Usamos a média ponderada das volatilidades REAIS de cada matéria.
        let sumVolatility = 0;
        categoryStats.forEach(cat => {
            const catVol = calculateVolatility(cat.history);
            const w = cat.weight || 0;
            sumVolatility += catVol * (w / totalWeight);
        });

        const dailySD = sumVolatility > 0 ? sumVolatility : calculateVolatility(globalHistory);

        // BUG-11 FIX: Calcular Consistência Real (100% - Coeficiente de Variação Médio)
        const avgCV = categoryStats.length > 0
            ? categoryStats.reduce((acc, cat) => {
                // CV = (SD / Mean) * 100
                return acc + (cat.mean > 0 ? (cat.sd / cat.mean) * 100 : 0);
            }, 0) / categoryStats.length
            : 0;

        return {
            categoryStats,
            bayesianMean,
            pooledSD,
            totalWeight,
            bayesianCI: { ciLow: weightedLow, ciHigh: weightedHigh },
            globalHistory,
            dailySD,
            consistencyScore: Math.max(0, 100 - avgCV)
        };
    }, [categories, debouncedWeights, effectiveWeights]);

    const simulationData = useMemo(() => {
        if (!statsData) return { status: 'waiting', missing: 'data' };

        // 1. Contador de prontidão
        let totalPoints = 0;
        const uniqueDates = new Set();
        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length > 0) {
                const weight = sanitizeWeightUnit((debouncedWeights ?? effectiveWeights)[cat.name] ?? 0);
                if (weight > 0) {
                    cat.simuladoStats.history.forEach(h => {
                        totalPoints++;
                        const dk = getDateKey(h.date);
                        if (dk) uniqueDates.add(dk);
                    });
                }
            }
        });

        if (totalPoints < 5) return { status: 'waiting', missing: 'count', count: totalPoints };
        if (uniqueDates.size < 3) return { status: 'waiting', missing: 'days', days: uniqueDates.size };

        // 2. Motor de Simulação (BUG-03 paths vs BUG-08 pooled)
        const isFuture = projectDays > 0;
        let result;

        if (isFuture && statsData.globalHistory?.length > 0) {
            result = runMonteCarloAnalysis({
                values: statsData.globalHistory.map(h => h.score),
                dates: statsData.globalHistory.map(h => h.date),
                meta: debouncedTarget,
                simulations: 5000,
                projectionDays: projectDays,
                forcedVolatility: statsData.dailySD,
                forcedBaseline: statsData.bayesianMean,
                currentMean: statsData.bayesianMean,
            });
        } else {
            // Hoje: Simulação estática (Normal) - Usando assinatura posicional para disparar engine correto
            result = runMonteCarloAnalysis(
                statsData.bayesianMean,
                statsData.pooledSD,
                debouncedTarget,
                {
                    simulations: 5000,
                    currentMean: statsData.bayesianMean,
                    bayesianCI: statsData.bayesianCI
                }
            );
        }

        return { status: 'ready', data: result };
    }, [statsData, debouncedTarget, projectDays, categories, debouncedWeights, effectiveWeights]);

    const [isCalculating, setIsCalculating] = useState(false);
    useEffect(() => {
        setIsCalculating(true);
        const timer = setTimeout(() => setIsCalculating(false), 600);
        return () => clearTimeout(timer);
    }, [simulationData?.data?.probability, debouncedTarget]);

    if (!simulationData || simulationData.status === 'waiting') {
        const waitingSubtext = simulationData?.missing === 'days'
            ? `Você precisa lançar simulados em pelo menos 3 dias diferentes (tem ${simulationData.days}). Faltam ${3 - simulationData.days} dia(s) para a IA identificar o seu ritmo.`
            : `Continue fazendo simulados! Você tem ${simulationData?.count || 0} de 5 notas necessárias. Faltam ${5 - (simulationData?.count || 0)} registro(s) para ativar a projeção.`;
        return (
            <div className="glass px-6 pb-6 pt-10 rounded-3xl relative overflow-hidden flex flex-col items-center justify-between border-l-4 border-slate-600 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/20">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Gauge size={80} /></div>
                <div className="w-full flex justify-between items-center mb-2 pt-2">
                    <div className="flex items-center gap-2">
                        <Gauge size={16} className="text-slate-600" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Monte Carlo</span>
                    </div>
                </div>
                <div className="relative flex flex-col items-center justify-center py-2 h-full">
                    <svg width="140" height="70" viewBox="0 0 140 70" className="overflow-visible">
                        <path d="M 10 65 A 60 60 0 0 1 130 65" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-end justify-center pb-2">
                        <span className="text-2xl font-black text-slate-600 tracking-tighter">--%</span>
                    </div>
                </div>
                <div className="text-center w-full mt-2">
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Aguardando Dados</p>
                    <p className="text-[9px] text-slate-600 leading-tight px-4">{waitingSubtext}</p>
                </div>

                {/* Subject list visible even in waiting state */}
                <div className="w-full flex flex-wrap justify-center gap-1.5 mt-6 pt-4 border-t border-white/5">
                    {activeCategories?.slice(0, 8).map((cat) => {
                        const catStats = statsData?.categoryStats?.find(s => s.name === cat.name);
                        return (
                            <div key={cat.id || cat.name} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/60 border border-white/5 text-[8px] text-slate-300 uppercase tracking-tight">
                                {catStats?.trend === 'up' && <TrendingUp size={10} className="text-green-400" />}
                                {catStats?.trend === 'down' && <TrendingDown size={10} className="text-red-400" />}
                                {(catStats?.trend === 'stable' || !catStats) && <Minus size={10} className="text-slate-500" />}
                                <span className="max-w-[70px] truncate">
                                    {cat.name.length > 12 ? cat.name.slice(0, 10) + '..' : cat.name}
                                </span>
                            </div>
                        );
                    })}
                    {(activeCategories?.length || 0) > 8 && <span className="px-2 py-1 rounded-lg bg-slate-800/60 border border-white/5 text-[8px] text-slate-500">+{activeCategories.length - 8}</span>}
                    {activeCategories?.length === 0 && <span className="text-[8px] text-slate-600 uppercase">Sem dados históricos</span>}
                </div>
            </div>
        );
    }

    const probability = simulationData.data.probability;
    const mean = simulationData.data.mean;
    const sd = simulationData.data.sd;
    const ci95Low = simulationData.data.ci95Low;
    const ci95High = simulationData.data.ci95High;
    const currentMean = simulationData.data.currentMean;
    const prob = parseFloat(probability);

    const getGradientColor = (percentage) => {
        // AUDIT FIX: Alinhamento com padrões institucionais de risco
        // < 60% (Vermelho), 60-80% (Amarelo/Amber), > 80% (Verde)
        if (percentage < 60) return '#ef4444'; // Red-500
        if (percentage < 80) return '#f59e0b'; // Amber-500 (Yellow)
        return '#22c55e'; // Green-500
    };

    const gradientColor = getGradientColor(prob);

    // Premium Status Messages
    let baseMessage = "";
    if (prob > 95) baseMessage = "DOMÍNIO ESTRATÉGICO";
    else if (prob > 80) baseMessage = "A PROMESSA";
    else if (prob > 60) baseMessage = "NA ZONA DE BRIGA";
    else if (prob > 40) baseMessage = "COMPETITIVO";
    else if (prob > 20) baseMessage = "IMPROVISADOR";
    else baseMessage = "RISCO DE QUEDA";

    const message = baseMessage + (effectiveSimulateToday ? " (HOJE)" : " (FUTURO)");

    return (
        <div className={`glass p-8 rounded-[2.5rem] relative flex flex-col border border-white/10 group transition-all duration-700 shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden w-full max-w-full ${isCalculating ? 'opacity-90 scale-[0.99]' : ''}`}>
            
            {/* Background Glow Effect */}
            <div className={`absolute -top-32 -right-32 w-80 h-80 blur-[130px] rounded-full opacity-10 transition-all duration-1000 ${forcedMode === 'today' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
            <div className={`absolute -bottom-32 -left-32 w-80 h-80 blur-[130px] rounded-full opacity-10 transition-all duration-1000 ${forcedMode === 'today' ? 'bg-emerald-500' : 'bg-blue-500'}`} />

            {/* Scanning Overlay Effect */}
            {isCalculating && (
                <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
                    <div className="w-full h-1/2 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent absolute top-0 left-0 animate-scan-fast" />
                </div>
            )}

            <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border transition-all duration-500 group-hover:rotate-6 ${forcedMode === 'today' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/20 border-blue-500/30 text-blue-400'}`}>
                        <Gauge size={22} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white tracking-widest uppercase">{forcedTitle || 'Monte Carlo'}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${forcedMode === 'today' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-blue-500/20 border-blue-500/30 text-blue-300'}`}>
                                {forcedMode === 'today' ? 'Estado Atual' : 'Projeção Receptiva'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!forcedMode && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowConfig(true); }}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-sm"
                                title="Configurar Pesos"
                            >
                                <Settings2 size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSimulateToday(!simulateToday); }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${simulateToday ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-blue-500/20 border-blue-500/40 text-blue-400'}`}
                            >
                                {simulateToday ? 'Ver Projeção' : 'Ver Agora'}
                            </button>
                        </div>
                    )}
                    {!effectiveSimulateToday && mean === currentMean && projectDays > 0 && (
                        <div className="group/info relative">
                            <div className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center cursor-help"><span className="text-[10px] font-bold text-yellow-500">?</span></div>
                            <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity text-[9px] text-slate-300 leading-tight"><span className="text-yellow-400 font-bold block mb-1">Por que igual a hoje?</span>Para projetar evolução, precisamos de simulados em <strong>dias diferentes</strong>. Com dados de apenas um dia, a tendência é neutra.</div>
                        </div>
                    )}
                </div>
            </div>

            <div className={`w-full bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] p-10 mb-8 border border-white/5 flex flex-col items-center transition-all duration-700 relative overflow-hidden group/gauge shadow-inner ${isCalculating ? 'blur-sm' : ''}`}>
                <div className="relative mb-8">
                    {/* Pulsing Core Glow */}
                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 blur-[50px] transition-all duration-700 ${isCalculating ? 'scale-150 opacity-40' : 'group-hover/gauge:scale-125 group-hover/gauge:opacity-30'}`}><div className="w-32 h-32 rounded-full" style={{ backgroundColor: gradientColor }} /></div>
                    
                    <svg width="240" height="120" viewBox="0 0 140 70" className="overflow-visible relative z-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        <path d="M 10 65 A 60 60 0 0 1 130 65" fill="none" stroke="#ffffff05" strokeWidth="14" strokeLinecap="round" />
                        <path
                            d="M 10 65 A 60 60 0 0 1 130 65"
                            fill="none"
                            stroke={gradientColor}
                            strokeWidth="14"
                            strokeLinecap="round"
                            pathLength="100"
                            strokeDasharray={`${prob} 100`}
                            strokeDashoffset={0}
                            style={{ transition: 'stroke-dasharray 2s cubic-bezier(0.34, 1.56, 0.64, 1)', filter: `drop-shadow(0 0 8px ${gradientColor}50)` }}
                        />
                        {!isCalculating && (
                             <g transform={`rotate(${(prob / 100) * 180}, 70, 65)`} style={{ transition: 'transform 2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                                <circle cx="70" cy="65" r="3" fill="#fff" />
                                <path d="M 5 65 L 15 62 L 15 68 Z" fill="#fff" style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.8))' }} />
                             </g>
                        )}
                    </svg>
                    <div className="absolute inset-x-0 -bottom-2 flex items-end justify-center z-20">
                        <span className={`text-6xl font-black tracking-tighter transition-all duration-700 ${isCalculating ? 'scale-110 blur-sm' : 'drop-shadow-[0_5px_15px_rgba(0,0,0,0.4)]'}`} style={{ color: gradientColor }}>
                            {prob.toFixed(1)}<span className="text-2xl ml-0.5 opacity-70">%</span>
                        </span>
                    </div>
                </div>
                <div className="relative group/msg translate-y-2">
                   <div className="absolute inset-x-0 -top-4 bottom-0 bg-white/5 blur-xl rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity" />
                    <span className={`relative z-10 text-[11px] font-black uppercase tracking-[0.3em] px-8 py-2.5 rounded-full bg-black/40 border border-white/5 shadow-2xl transition-all duration-700 border-b-2`} style={{ borderBottomColor: isCalculating ? '#60a5fa' : gradientColor, color: isCalculating ? '#60a5fa' : gradientColor }}>
                        {isCalculating ? "RECALCULANDO MOTOR..." : message}
                    </span>
                </div>
            </div>

             <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8 px-1 relative z-10">
                {[
                    { label: "Sua Meta", val: `${targetScore}%`, color: "text-rose-500" },
                    { label: "Hoje", val: `${parseFloat(currentMean).toFixed(1)}%`, color: "text-white" },
                    { label: "Projeção", val: `${parseFloat(mean).toFixed(1)}%`, color: "text-blue-400" },
                    { label: "Incerteza", val: `±${parseFloat(sd).toFixed(1)}%`, color: Math.abs(parseFloat(sd)) <= 5 ? 'text-green-400' : Math.abs(parseFloat(sd)) <= 10 ? 'text-yellow-400' : 'text-red-400' },
                    { label: "IC 95%", val: `${ci95Low}-${ci95High}%`, color: "text-emerald-400" }
                ].map((m, i) => (
                    <div key={i} className="bg-white/[0.03] p-3 rounded-2xl border border-white/5 flex flex-col items-center justify-center shadow-lg transition-all hover:bg-white/[0.08] hover:-translate-y-1 duration-300">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{m.label}</span>
                        <span className={`text-[13px] font-black tracking-tight ${m.color}`}>{m.val}</span>
                    </div>
                ))}
            </div>

            <div className="w-full bg-white/[0.02] backdrop-blur-3xl rounded-[2rem] p-6 mb-8 border border-white/5 shadow-inner relative overflow-hidden group/gauss z-10">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-2 mb-4 relative z-10">
                    <TrendingUp size={14} className="text-slate-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Curva de Probabilidade</span>
                </div>
                <div className="w-full h-44 px-2 relative z-10">
                    {(() => {
                        const safeCurrentMean = (currentMean !== undefined && currentMean !== null) ? parseFloat(currentMean) : parseFloat(mean);
                        return (
                            <GaussianPlot
                                mean={parseFloat(mean)}
                                sd={parseFloat(sd)}
                                low95={parseFloat(ci95Low)}
                                high95={parseFloat(ci95High)}
                                targetScore={targetScore}
                                currentMean={safeCurrentMean}
                                prob={prob}
                            />
                        );
                    })()}
                </div>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 pt-5 border-t border-white/5 relative z-10">
                    {[{ bg: "bg-rose-500", lbl: "Meta" }, { bg: "bg-blue-500/50", lbl: "Média" }, { bg: "bg-emerald-500/30 border border-emerald-500/50", lbl: "Sucesso" }, { bg: "bg-white", lbl: "Hoje" }, { bg: "bg-blue-400", lbl: "Projeção" }].map((l, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={`${l.bg} w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]`}></div>
                            <span className="text-[10px] text-slate-500 font-bold tracking-tight">{l.lbl}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full flex flex-col gap-4 mt-6 z-10">
                <div className="flex items-center gap-2 justify-center">
                    <span className="h-px w-8 bg-white/5"></span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Matérias Analisadas</span>
                    <span className="h-px w-8 bg-white/5"></span>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    {activeCategories?.slice(0, 8).map((cat) => {
                        const catStats = statsData?.categoryStats?.find(s => s.name === cat.name);
                        return (
                            <div key={cat.id || cat.name} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] text-slate-300 font-bold tracking-tight hover:bg-white/[0.08] transition-all hover:scale-105 shadow-lg group/tag">
                                {catStats?.trend === 'up' && <TrendingUp size={12} className="text-emerald-400 group-hover/tag:scale-110 transition-transform" />}
                                {catStats?.trend === 'down' && <TrendingDown size={12} className="text-rose-400 group-hover/tag:scale-110 transition-transform" />}
                                {(catStats?.trend === 'stable' || !catStats) && <Minus size={12} className="text-slate-600" />}
                                <span className="max-w-[130px] truncate">
                                    {cat.name}
                                </span>
                            </div>
                        );
                    })}
                    {(activeCategories?.length || 0) > 8 && (
                        <span className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[9px] text-slate-500 font-black flex items-center shadow-lg">
                            +{activeCategories.length - 8}
                        </span>
                    )}
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
                    updateWeight={(name, p) => setWeights({ ...(weights || {}), [name]: p })}
                    categories={categories}
                    user={activeUser}
                />
            )}
        </div>
    );
}
