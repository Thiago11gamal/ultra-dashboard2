import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Gauge, TrendingUp, TrendingDown, Minus, Settings2, Info, ChevronDown, Clock } from 'lucide-react';
import {
    computeCategoryStats,
    computeBayesianLevel,
    simulateNormalDistribution,
    runMonteCarloAnalysis,
    computePooledSD,
    computeWeightedVariance,
    calculateVolatility
} from '../engine';
import { useAppStore } from '../store/useAppStore';
import { GaussianPlot } from './charts/GaussianPlot';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { getSafeScore } from '../utils/scoreHelper';
import { getDateKey } from '../utils/dateHelper';
import { useMonteCarloWorker } from '../hooks/useMonteCarloWorker';

const sanitizeWeightUnit = (value) => {
    const numeric = Number.parseInt(value, 10);
    if (Number.isNaN(numeric)) return 0;
    return Math.max(0, Math.min(999, numeric));
};

export default function MonteCarloGauge({
    categories = [],
    goalDate,
    targetScore,
    onTargetScoreChange,
    forcedMode = null,
    forcedTitle = null
}) {
    const [simulateToday, setSimulateToday] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [showPerSubject, setShowPerSubject] = useState(false);

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

    // BUG-A1 FIX: Memoizar hash do histórico para evitar re-criação a cada render
    const categoryHistoryHash = useMemo(() =>
        categories.map(c => c.simuladoStats?.history?.length ?? 0).join(','),
        [categories]);

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
        if (activeCategories.length === 0) return {};
        const newWeights = {};
        activeCategories.forEach(cat => {
            newWeights[cat.id || cat.name] = 1; // Default to Peso 1
        });
        return newWeights;
    }, [activeCategories]);

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
        activeCategories.forEach(cat => {
            // LI-03 FIX: Permitir peso 0 se explicitamente definido para excluir matéria do Monte Carlo
            const stored = weights[cat.id || cat.name];
            const w = sanitizeWeightUnit(stored);
            weightsMap[cat.id || cat.name] = (stored !== undefined && stored !== null) ? Math.max(0, w) : 1;
        });
        return weightsMap;
    }, [equalWeightsMode, weights, activeCategories, getEqualWeights]);

    const [debouncedTarget, setDebouncedTarget] = useState(targetScore);
    const [debouncedWeights, setDebouncedWeights] = useState(() => effectiveWeights);

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
        const bayesianStats = [];
        let weightedVolatilitySum = 0;

        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length > 0) {
                const history = [...cat.simuladoStats.history].sort((a, b) => new Date(a.date) - new Date(b.date));
                const weight = sanitizeWeightUnit((debouncedWeights ?? effectiveWeights)[cat.id || cat.name] ?? 0);

                // PERFORMANCE-01 FIX: computeBayesianLevel is expensive O(M). Compute once and re-use.
                const baye = computeBayesianLevel(history);
                const stats = computeCategoryStats(history, weight);
                const vol = calculateVolatility(history);

                if (stats && weight > 0) {
                    totalWeight += weight;
                    weightedBayesianSum += baye.mean * weight;
                    weightedVolatilitySum += vol * weight;
                    weightsByName[cat.name] = weight;

                    history.forEach(h => {
                        const dk = getDateKey(h.date);
                        if (dk) {
                            if (!scoresByDate[dk]) scoresByDate[dk] = {};
                            scoresByDate[dk][cat.name] = getSafeScore(h);
                        }
                    });

                    categoryStats.push({ name: cat.name, ...stats });
                    // BUG-08 FIX: Previne duplo shrinkage na propagação do SD bayesiano
                    // Usa volatilidade do prior Beta (baye.sd) para isolar Incerteza Bayesiana (Bug 2)
                    bayesianStats.push({ sd: baye.sd, weight, n: history.length });
                }
            }
        });

        if (categoryStats.length === 0 || totalWeight === 0) return null;

        // MC-04 FIX: pooledSD is only used for the "Today" (static) simulation.
        const pooledSD = computePooledSD(categoryStats, totalWeight);
        const bayesianMean = weightedBayesianSum / totalWeight;

        // REVISION (Audit-Phase-2): Consolidated Bayesian uncertainty using Quadrature Sum (Pooled Variance).
        // Linear summation of ICs was too conservative (noisy) for students with many subjects.
        const pooledBayesianVar = computeWeightedVariance(bayesianStats, totalWeight);
        const pooledBayesianSD = Math.sqrt(pooledBayesianVar);

        // Final Bayesian CI for the static Today simulation
        // BUG MATEMÁTICO FIX: Não cortar aqui (clipping) para evitar distorção estatística.
        // O corte (0 a 100) deve ocorrer apenas na visualização (UI).
        const weightedLow = bayesianMean - 1.96 * pooledBayesianSD;
        const weightedHigh = bayesianMean + 1.96 * pooledBayesianSD;

        // Reconstruct consolidated global history for path simulation (Carry-Forward Fix)
        const sortedDates = Object.keys(scoresByDate).sort((a, b) => new Date(a) - new Date(b));

        const lastKnownScores = {}; // Armazena a nota mais recente de cada matéria
        
        const globalHistory = sortedDates.map(date => {
            // 1. Atualiza o estado atual APENAS com as matérias feitas neste dia
            Object.keys(scoresByDate[date]).forEach(name => {
                lastKnownScores[name] = scoresByDate[date][name];
            });

            let sum = 0;
            let tw = 0;
            
            // 2. Calcula a média do dia usando o "nível atual" de TODAS as matérias ativas
            Object.keys(weightsByName).forEach(name => {
                const w = weightsByName[name];
                const currentScore = lastKnownScores[name];
                
                // Só inclui no cálculo se a matéria já tiver pelo menos 1 simulado feito no histórico
                if (w > 0 && currentScore !== undefined) {
                    sum += currentScore * w;
                    tw += w;
                }
            });
            
            return { date, score: tw > 0 ? sum / tw : 0 };
        }).filter(h => h.score >= 0 && !isNaN(h.score));

        // BUG-03 FIX: Volatilidade Inflada.
        // Não usamos calculateVolatility(globalHistory) pois saltos entre matérias (ex: Português 90 -> Matemática 50)
        // inflariam artificialmente o desvio padrão diário.
        // Usamos a média ponderada das volatilidades REAIS de cada matéria.
        // POSSÍVEL BUG EM VOLATILIDADE FIX: Priorizar a volatilidade ponderada das matérias
        const sumVolatility = totalWeight > 0 ? weightedVolatilitySum / totalWeight : 0;
        const dailySD = sumVolatility > 0 ? sumVolatility : calculateVolatility(globalHistory);

        // BUG-11 FIX: Calcular Consistência Real (100% - Coeficiente de Variação Médio Ponderado)
        // Usar média ponderada pelos pesos das matérias para evitar que matérias irrelevantes
        // (peso 1) distorçam o score global de consistência.
        const avgCV = totalWeight > 0
            ? categoryStats.reduce((acc, cat) => {
                // CV = (SD / Mean) * 100
                // 🟡 BUG ESTATÍSTICO FIX: Se a média for muito pequena (< 1%), o CV explode.
                const catCV = (cat.mean > 1 ? (cat.sd / cat.mean) * 100 : 0);
                return acc + (catCV * (cat.weight / totalWeight));
            }, 0)
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
        // BUG-D1 FIX: Incluir effectiveWeights nas deps (usado como fallback quando debouncedWeights é null)
    }, [categories, debouncedWeights, effectiveWeights]);

    // MELHORIA: Web Worker para offload Monte Carlo da main thread
    const { runAnalysis } = useMonteCarloWorker();
    const [simulationData, setSimulationData] = useState({ status: 'waiting', missing: 'data' });

    useEffect(() => {
        if (!statsData) {
            setSimulationData({ status: 'waiting', missing: 'data' });
            return;
        }

        // 1. Contador de prontidão
        let totalPoints = 0;
        const uniqueDates = new Set();
        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length > 0) {
                const weight = sanitizeWeightUnit((debouncedWeights ?? effectiveWeights)[cat.id || cat.name] ?? 0);
                if (weight > 0) {
                    cat.simuladoStats.history.forEach(h => {
                        totalPoints++;
                        const dk = getDateKey(h.date);
                        if (dk) uniqueDates.add(dk);
                    });
                }
            }
        });

        if (totalPoints < 1) {
            setSimulationData({ status: 'waiting', missing: 'count', count: totalPoints });
            return;
        }

        // 2. Motor de Simulação via Web Worker (fallback síncrono se indisponível)
        let cancelled = false;
        const isFuture = projectDays > 0;

        (async () => {
            try {
                let result;
                if (isFuture && statsData.globalHistory?.length > 0) {
                    result = await runAnalysis({
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
                    result = await runAnalysis(
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
                if (!cancelled) {
                    setSimulationData({ status: 'ready', data: result });
                }
            } catch (err) {
                console.warn('[MC Worker] Simulation failed, using sync fallback:', err);
                if (!cancelled) {
                    // Fallback síncrono direto
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
                    setSimulationData({ status: 'ready', data: result });
                }
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsData, debouncedTarget, projectDays, debouncedWeights, categoryHistoryHash]);

    // MELHORIA: Probabilidade por matéria individual (mini-tabela)
    const perSubjectProbs = useMemo(() => {
        if (!statsData?.categoryStats?.length || simulationData?.status !== 'ready') return [];
        return statsData.categoryStats
            .filter(cat => cat.weight > 0)
            .map(cat => {
                const result = simulateNormalDistribution(cat.mean, cat.sd, debouncedTarget, 1000);
                return {
                    name: cat.name,
                    prob: result.probability,
                    mean: cat.mean,
                    trend: cat.trend
                };
            })
            .sort((a, b) => a.prob - b.prob);
    }, [statsData?.categoryStats, debouncedTarget, simulationData?.status]);

    const [isCalculating, setIsCalculating] = useState(false);
    useEffect(() => {
        setIsCalculating(true);
        const timer = setTimeout(() => setIsCalculating(false), 600);
        return () => clearTimeout(timer);
    }, [simulationData?.data?.probability, debouncedTarget]);

    if (!simulationData || simulationData.status === 'waiting') {
        const waitingSubtext = simulationData?.missing === 'days'
            ? `Você precisa lançar simulados em pelo menos 3 dias diferentes (tem ${simulationData.days}). Faltam ${3 - simulationData.days} dia(s) para a IA identificar o seu ritmo.`
            : `Lance seu primeiro simulado para ativar a projeção Monte Carlo!`;
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

    const probability = simulationData?.data?.probability ?? 0;
    const mean = simulationData?.data?.mean ?? 0;
    // 🟠 BUG DE POSSÍVEL undefined FIX
    const sd = simulationData?.data?.sd ?? 0;
    const sdLeft = simulationData?.data?.sdLeft ?? sd;
    const sdRight = simulationData?.data?.sdRight ?? sd;
    const ci95Low = simulationData?.data?.ci95Low ?? 0;
    const ci95High = simulationData?.data?.ci95High ?? 0;
    const currentMean = simulationData?.data?.currentMean ?? 0;

    // ✅ CORREÇÃO SEGURA PARA NaN
    const safe = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
    const prob = safe(probability);

    // Bug 4 Fix: Lógica de exibição da Incerteza para distribuições truncadas (teto 100%)
    const isClampedHigh = safe(ci95High) >= 99.5;
    // BUG-B2 FIX: CI low clampado no floor → valor <= 0.5, não >= 0.5
    const isClampedLow = safe(ci95Low) <= 0.5;

    const left = safe(sdLeft);
    const right = safe(sdRight);
    const center = safe(sd);

    let uncertaintyLabel = `±${center.toFixed(1)}%`;

    if (isClampedHigh && !isClampedLow) {
        uncertaintyLabel = `±${left.toFixed(1)}%`;
    } else if (isClampedLow && !isClampedHigh) {
        uncertaintyLabel = `±${right.toFixed(1)}%`;
    } else {
        // VISUAL-02 FIX: Clampar o limite inferior da incerteza para nunca exibir valores negativos (abaixo de 0%).
        // No display, mostramos a dispersão real se houver assimetria
        if (Math.abs(left - right) > 0.2) {
            // BUG-C2 FIX: Colocar % em ambos os valores para clareza
            uncertaintyLabel = `-${left.toFixed(1)}% / +${right.toFixed(1)}%`;
        } else {
            uncertaintyLabel = `±${center.toFixed(1)}%`;
        }
    }

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
        <div className={`glass p-4 rounded-3xl relative flex flex-col border-l-4 border-blue-500 bg-gradient-to-br from-slate-900 via-slate-900 to-black/80 group transition-all duration-500 shadow-2xl overflow-hidden w-full max-w-full ${isCalculating ? 'opacity-90 scale-[0.99]' : ''}`}>

            {/* Scanning Overlay Effect */}
            {isCalculating && (
                <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
                    <div className="w-full h-1/2 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent absolute top-0 left-0 animate-scan-fast" />
                </div>
            )}

            <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    {forcedMode && (
                        <div className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${forcedMode === 'today' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                            {forcedMode === 'today' ? 'Hoje' : 'Futuro'}
                        </div>
                    )}
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg"><Gauge size={16} className="text-white" /></div>
                    {/* Delta Badge - Only in Future mode and if significant */}
                    {/* BUG-A2 FIX: Optional chaining para período async do Worker */}
                    {!effectiveSimulateToday && simulationData?.data?.currentMean != null && (
                        <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-inner transition-all ml-2 group-hover:border-blue-500/30">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Delta</span>
                            <span className={`text-[10px] font-black ${(simulationData?.data?.mean - simulationData?.data?.currentMean) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {(simulationData?.data?.mean - simulationData?.data?.currentMean) > 0 ? `+${(simulationData?.data?.mean - simulationData?.data?.currentMean).toFixed(1)}` : (simulationData?.data?.mean - simulationData?.data?.currentMean).toFixed(1)}
                                <span className="text-[8px] ml-0.5 opacity-70">pp</span>
                            </span>
                        </div>
                    )}
                    {/* MELHORIA: Badge "dias restantes" para urgência temporal */}
                    {!effectiveSimulateToday && projectDays > 0 && (
                        <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-inner transition-all ml-1">
                            <Clock size={10} className={`${projectDays <= 30 ? 'text-rose-400' : projectDays <= 60 ? 'text-amber-400' : 'text-blue-400'}`} />
                            <span className={`text-[10px] font-black ${projectDays <= 30 ? 'text-rose-400' : projectDays <= 60 ? 'text-amber-400' : 'text-blue-400'}`}>
                                {projectDays}d
                            </span>
                        </div>
                    )}
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

            <div className={`w-full bg-black/30 rounded-xl p-6 mb-4 border border-white/5 flex flex-col items-center transition-all duration-700 ${isCalculating ? 'blur-sm' : ''}`}>
                <div className="relative mb-6">
                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 blur-2xl transition-all duration-700 ${isCalculating ? 'scale-150 opacity-40' : ''}`}><div className="w-24 h-24 rounded-full" style={{ backgroundColor: gradientColor }} /></div>
                    <svg width="200" height="100" viewBox="0 0 140 70" className="overflow-visible relative z-10">
                        <path d="M 10 65 A 60 60 0 0 1 130 65" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
                        <path
                            d="M 10 65 A 60 60 0 0 1 130 65"
                            fill="none"
                            stroke={gradientColor}
                            strokeWidth="12"
                            strokeLinecap="round"
                            pathLength="100"
                            strokeDasharray={`${prob} ${100 - prob}`}
                            strokeDashoffset={0}
                            style={{ transition: 'stroke-dasharray 1.5s ease-out' }}
                        />
                        {/* Leading Edge Glow (Modern replacement for the white line) */}
                        {!isCalculating && (
                            <g transform={`rotate(${(prob / 100) * 180}, 70, 65)`}>
                                <circle 
                                    cx="10" cy="65" r="4" 
                                    fill={gradientColor} 
                                    className="drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                                    style={{ filter: `drop-shadow(0 0 6px ${gradientColor})` }}
                                />
                                <circle cx="10" cy="65" r="2" fill="#fff" opacity="0.8" />
                            </g>
                        )}
                    </svg>
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-0 z-20">
                        <span 
                            className={`text-5xl font-black tracking-tighter transition-all duration-500 ${isCalculating ? 'scale-110 blur-[1px]' : ''}`} 
                            style={{ 
                                color: gradientColor, 
                                filter: `drop-shadow(0 0 12px ${gradientColor}55) drop-shadow(0 0 2px ${gradientColor}aa)` 
                            }}
                        >
                            {safe(prob).toFixed(1)}%
                        </span>
                    </div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full bg-black/40 border border-white/10 shadow-lg transition-all duration-500 ${isCalculating ? 'bg-blue-500/20 border-blue-500/50' : ''} group-hover:border-white/20`} style={{ color: isCalculating ? '#60a5fa' : gradientColor }}>
                    {isCalculating ? (
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                            RECALCULANDO...
                        </span>
                    ) : (
                        message
                    )}
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 px-1">
                {[
                    { label: "Sua Meta", val: `${safe(targetScore).toFixed(0)}%`, color: "text-rose-500" },
                    { label: "Hoje", val: `${safe(currentMean).toFixed(1)}%`, color: "text-white" },
                    { label: "Projeção", val: `${safe(mean).toFixed(1)}%`, color: "text-blue-400" },
                    {
                        label: "Incerteza",
                        val: uncertaintyLabel,
                        color: Math.max(left, right) <= 5 ? 'text-emerald-400' : Math.max(left, right) <= 10 ? 'text-yellow-400' : 'text-red-400'
                    },
                    { label: "IC 95%", val: `${safe(ci95Low).toFixed(1)}-${safe(ci95High).toFixed(1)}%`, color: "text-green-500" }
                ].map((m, i) => (
                    <div key={i} className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center overflow-hidden">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">
                            {m.label}
                        </span>
                        <span className={`text-sm font-black ${m.color} truncate w-full text-center`}>
                            {m.val}
                        </span>
                    </div>
                ))}
            </div>

            <div className="w-full bg-black/30 rounded-xl p-4 mb-4 border border-white/5">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 block">Projeção de Desempenho</span>
                <div className="w-full h-44 px-2">
                    {(() => {
                        const safeCurrentMean = (currentMean !== undefined && currentMean !== null) ? parseFloat(currentMean) : parseFloat(mean);
                        return (
                            <GaussianPlot
                                mean={safe(mean)}
                                sd={safe(sd)}
                                sdLeft={safe(sdLeft)}
                                sdRight={safe(sdRight)}
                                low95={safe(ci95Low)}
                                high95={safe(ci95High)}
                                targetScore={safe(targetScore)}
                                currentMean={safe(currentMean)}
                                prob={safe(prob)}
                                kdeData={simulationData?.data?.kdeData} />
                        );
                    })()}
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-white/10">
                    {/* BUG-B5 FIX: Legenda "Sucesso" usa cor dinâmica em vez de verde fixo */}
                    {[{ bg: "bg-red-500", lbl: "Meta" }, { bg: "bg-blue-500 opacity-50", lbl: "Média" }, { bg: "border", lbl: "Sucesso", dynamic: true }, { bg: "bg-white/40", lbl: "Hoje" }, { bg: "bg-blue-500", lbl: "Projeção" }].map((l, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <div className={`${l.bg} w-3 h-1 rounded-full`} style={l.dynamic ? { backgroundColor: gradientColor, opacity: 0.5 } : undefined}></div>
                            <span className="text-[9px] text-slate-400">{l.lbl}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full flex flex-col gap-2 mt-4">
                <button
                    onClick={() => setShowPerSubject(!showPerSubject)}
                    className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                >
                    <span>Matérias Analisadas</span>
                    {perSubjectProbs.length > 0 && (
                        <ChevronDown size={12} className={`transition-transform duration-300 ${showPerSubject ? 'rotate-180' : ''}`} />
                    )}
                </button>

                {/* BUG-C5 FIX: Usar transition nativa em vez de classes shadcn inexistentes */}
                {showPerSubject && perSubjectProbs.length > 0 && (
                    <div className="w-full bg-black/30 rounded-xl p-3 border border-white/5 space-y-1.5 transition-all duration-300">
                        <div className="flex items-center justify-between px-1 mb-2">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Disciplina</span>
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
                                Prob. Individual{!effectiveSimulateToday && <span className="text-amber-500/80 ml-1">(Hoje)</span>}
                            </span>
                        </div>
                        {perSubjectProbs.map(s => {
                            const probColor = s.prob < 40 ? 'text-rose-400' : s.prob < 60 ? 'text-amber-400' : s.prob < 80 ? 'text-blue-400' : 'text-emerald-400';
                            const barColor = s.prob < 40 ? 'bg-rose-500' : s.prob < 60 ? 'bg-amber-500' : s.prob < 80 ? 'bg-blue-500' : 'bg-emerald-500';
                            return (
                                <div key={s.name} className="flex items-center gap-2 group/row hover:bg-white/5 rounded-lg px-1.5 py-1 transition-colors">
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        {s.trend === 'up' && <TrendingUp size={9} className="text-emerald-400 shrink-0" />}
                                        {s.trend === 'down' && <TrendingDown size={9} className="text-rose-400 shrink-0" />}
                                        {(s.trend === 'stable' || !s.trend) && <Minus size={9} className="text-slate-600 shrink-0" />}
                                        <span className="text-[9px] text-slate-400 truncate">{s.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.min(100, s.prob)}%` }} />
                                        </div>
                                        <span className={`text-[10px] font-black w-10 text-right ${probColor}`}>{s.prob.toFixed(0)}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex flex-wrap justify-center gap-2.5 min-h-[24px]">
                    {activeCategories?.slice(0, 8).map((cat) => {
                        const catStats = statsData?.categoryStats?.find(s => s.name === cat.name);
                        return (
                            <div key={cat.id || cat.name} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-white/5 text-[8px] text-slate-300 uppercase tracking-tight leading-relaxed">
                                {catStats?.trend === 'up' && <TrendingUp size={10} className="text-emerald-400" />}
                                {catStats?.trend === 'down' && <TrendingDown size={10} className="text-rose-400" />}
                                {(catStats?.trend === 'stable' || !catStats) && <Minus size={10} className="text-slate-500" />}
                                <span className="max-w-[100px] truncate">
                                    {cat.name}
                                </span>
                            </div>
                        );
                    })}
                    {(activeCategories?.length || 0) > 8 && (
                        <span className="px-2 py-1 rounded-lg bg-slate-800/60 border border-white/5 text-[8px] text-slate-500">
                            +{activeCategories.length - 8}
                        </span>
                    )}
                    {activeCategories?.length === 0 && (
                        <span className="text-[8px] text-slate-600 uppercase">Sem dados históricos</span>
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
