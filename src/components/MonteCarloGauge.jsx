import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Gauge, TrendingUp, TrendingDown, Minus, Settings2, ChevronDown, Clock } from 'lucide-react';
import {
    computeCategoryStats,
    computeBayesianLevel,
    computeWeightedVariance,
    calculateVolatility,
    estimateInterSubjectCorrelation
} from '../engine';
import {
    simulateNormalDistribution,
    runMonteCarloAnalysis
} from '../engine/monteCarlo';
import { normalCDF_complement } from '../engine/math/gaussian';
import { useAppStore } from '../store/useAppStore';
import { GaussianPlot } from './charts/GaussianPlot';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { getSafeScore } from '../utils/scoreHelper';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { useMonteCarloWorker } from '../hooks/useMonteCarloWorker';

const sanitizeWeightUnit = (value) => {
    const numeric = Number.parseInt(value, 10);
    if (Number.isNaN(numeric)) return 0;
    return Math.max(0, Math.min(999, numeric));
};

/**
 * Regularização Bayesiana da Volatilidade (Shrinkage de Tikhonov)
 */
function regularizeVolatility(dailySD, projectionDays, historyLength, domain) {
    const informativeSD = 0.35 * domain / Math.sqrt(Math.max(1, projectionDays));
    const priorStrength = Math.max(1.0, 5.0 - Math.log2(historyLength + 1));
    const n = Math.max(1, historyLength);
    const regularizedVariance =
        (dailySD * dailySD * n + informativeSD * informativeSD * priorStrength)
        / (n + priorStrength);
    return Math.sqrt(regularizedVariance);
}

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
}) {
    const [simulateToday, setSimulateToday] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [showPerSubject, setShowPerSubject] = useState(false);
    const [timeIndex, setTimeIndex] = useState(-1);

    const activeId = useAppStore(state => state.appState.activeId);
    const weights = useAppStore(state => state.appState.contests[activeId]?.mcWeights || null);
    const equalWeightsMode = useAppStore(state => state.appState.mcEqualWeights ?? true);

    const setWeights = useAppStore(state => state.setMonteCarloWeights);
    const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);
    const recordMonteCarloSnapshot = useAppStore(state => state.recordMonteCarloSnapshot);
    const activeUser = useAppStore(state => state.appState.contests[activeId]?.user);

    const activeCategories = useMemo(() =>
        categories.filter(c => c.simuladoStats?.history?.length > 0),
        [categories]);

    const catCount = activeCategories.length;

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
        setTimeIndex(-1);
    }, [timelineDates.join(',')]);

    const effectiveSimulateToday = forcedMode ? (forcedMode === 'today') : simulateToday;

    const projectDays = useMemo(() => {
        if (effectiveSimulateToday) return 0;
        if (!goalDate) return 30;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        if (timeIndex >= 0 && timeIndex < timelineDates.length) {
            currentDate = new Date(timelineDates[timeIndex] + 'T12:00:00');
        }
        let goal;
        if (typeof goalDate === 'string') {
            if (goalDate.includes('T')) {
                const g = new Date(goalDate);
                goal = new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate());
            } else {
                const p = goalDate.split('-');
                if (p.length === 3) {
                    goal = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
                } else {
                    goal = new Date(goalDate);
                }
            }
        } else {
            goal = new Date(goalDate);
        }
        goal.setHours(0, 0, 0, 0);
        if (isNaN(goal.getTime())) return 30;
        const diffTime = goal - currentDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }, [goalDate, effectiveSimulateToday, timeIndex, timelineDates]);

    const getEqualWeights = useCallback(() => {
        if (activeCategories.length === 0) return {};
        const newWeights = {};
        activeCategories.forEach(cat => {
            newWeights[cat.id || cat.name] = 1;
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
        const scoresByDate = {};
        const weightsByName = {};
        const bayesianStats = [];
        const cutoffDate = (timeIndex >= 0 && timeIndex < timelineDates.length) ? timelineDates[timeIndex] : null;

        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length > 0) {
                const history = [...cat.simuladoStats.history]
                    .filter(h => cutoffDate ? getDateKey(h.date) <= cutoffDate : true)
                    .sort((a, b) => (normalizeDate(a.date)?.getTime() ?? 0) - (normalizeDate(b.date)?.getTime() ?? 0));
                if (history.length === 0) return;
                const weight = sanitizeWeightUnit((debouncedWeights ?? effectiveWeights)[cat.id || cat.name] ?? 0);
                const baye = computeBayesianLevel(history, 1, 1, maxScore);
                const stats = computeCategoryStats(history, weight, 60, maxScore);
                const vol = calculateVolatility(history, maxScore);
                if (stats && weight > 0) {
                    totalWeight += weight;
                    weightedBayesianSum += baye.mean * weight;
                    weightsByName[cat.name] = weight;
                    history.forEach(h => {
                        const dk = getDateKey(h.date);
                        if (dk) {
                            if (!scoresByDate[dk]) scoresByDate[dk] = {};
                            scoresByDate[dk][cat.name] = getSafeScore(h, maxScore);
                        }
                    });
                    categoryStats.push({
                        name: cat.name, ...stats,
                        bayesianMean: baye.mean, bayesianSd: baye.sd, volatility: vol
                    });
                    bayesianStats.push({ sd: baye.sd, weight, n: history.length });
                }
            }
        });

        if (categoryStats.length === 0 || totalWeight === 0) return null;
        const sortedDates = Object.keys(scoresByDate).sort((a, b) => new Date(a) - new Date(b));
        const scoreRows = sortedDates.map(date => scoresByDate[date] || {});
        const subjectNames = categoryStats.map(cat => cat.name);
        const estimatedRho = estimateInterSubjectCorrelation(scoreRows, subjectNames);
        const pooledVariance = computeWeightedVariance(categoryStats.map(cat => ({ sd: cat.volatility, weight: cat.weight })), totalWeight, estimatedRho);
        const pooledSD = totalWeight > 0 ? Math.sqrt(pooledVariance) : 0;
        const bayesianMean = weightedBayesianSum / totalWeight;
        const pooledBayesianVar = computeWeightedVariance(bayesianStats, totalWeight, estimatedRho);
        const pooledBayesianSD = Math.sqrt(pooledBayesianVar);
        const weightedLow = Math.max(minScore, bayesianMean - 1.96 * pooledBayesianSD);
        const weightedHigh = Math.min(maxScore, bayesianMean + 1.96 * pooledBayesianSD);
        const globalHistory = sortedDates.map(date => {
            let sum = 0, tw = 0;
            Object.keys(scoresByDate[date]).forEach(name => {
                const w = weightsByName[name];
                const currentScore = scoresByDate[date][name];
                if (w > 0 && currentScore !== undefined) {
                    sum += currentScore * w; tw += w;
                }
            });
            return { date, score: tw > 0 ? sum / tw : -1 };
        }).filter(h => h.score >= 0 && !isNaN(h.score));

        const temporalVolatility = calculateVolatility(globalHistory, maxScore);
        const dailySD = temporalVolatility > 0 ? temporalVolatility : pooledSD;
        const avgCV = totalWeight > 0 ? categoryStats.reduce((acc, cat) => acc + ((cat.mean > 1 ? (cat.sd / cat.mean) * 100 : 0) * (cat.weight / totalWeight)), 0) : 0;

        return {
            categoryStats, bayesianMean, pooledSD, totalWeight, bayesianCI: { ciLow: weightedLow, ciHigh: weightedHigh },
            globalHistory, dailySD, estimatedRho, consistencyScore: Math.max(0, 100 - avgCV)
        };
    }, [categories, debouncedWeights, effectiveWeights, timeIndex, timelineDates, minScore, maxScore]);

    const statsHash = statsData
        ? `${statsData.bayesianMean}-${statsData.pooledSD}-${statsData.globalHistory.length}-${statsData.globalHistory.map(h => h.date).join('')}`
        : 'null';

    const { runAnalysis } = useMonteCarloWorker();
    const [simulationData, setSimulationData] = useState({ status: 'waiting', missing: 'data' });

    useEffect(() => {
        if (!statsData) {
            setSimulationData({ status: 'waiting', missing: 'data' });
            return;
        }
        let totalPoints = 0;
        statsData.categoryStats.forEach(cat => totalPoints += cat.n || 1);
        if (totalPoints < 1) {
            setSimulationData({ status: 'waiting', missing: 'count', count: totalPoints });
            return;
        }
        let cancelled = false;
        const isFuture = projectDays > 0;
        (async () => {
            try {
                let result;
                if (isFuture && statsData.globalHistory?.length > 0) {
                    const domain = maxScore - minScore;
                    const regularizedSD = regularizeVolatility(statsData.dailySD, projectDays, statsData.globalHistory.length, domain);
                    result = await runAnalysis({
                        values: statsData.globalHistory.map(h => h.score),
                        dates: statsData.globalHistory.map(h => h.date),
                        meta: debouncedTarget, simulations: 5000, projectionDays: projectDays,
                        forcedVolatility: regularizedSD, forcedBaseline: statsData.bayesianMean,
                        currentMean: statsData.bayesianMean, minScore, maxScore
                    });
                } else {
                    result = await runAnalysis(statsData.bayesianMean, statsData.pooledSD, debouncedTarget, {
                        simulations: 5000, currentMean: statsData.bayesianMean, bayesianCI: statsData.bayesianCI, minScore, maxScore
                    });
                }
                if (!cancelled) setSimulationData({ status: 'ready', data: result });
            } catch (err) {
                if (!cancelled) {
                    let result;
                    if (isFuture && statsData.globalHistory?.length > 0) {
                        const domain = maxScore - minScore;
                        const regularizedSD = regularizeVolatility(statsData.dailySD, projectDays, statsData.globalHistory.length, domain);
                        result = runMonteCarloAnalysis({
                            values: statsData.globalHistory.map(h => h.score),
                            dates: statsData.globalHistory.map(h => h.date),
                            meta: debouncedTarget, simulations: 5000, projectionDays: projectDays,
                            forcedVolatility: regularizedSD, forcedBaseline: statsData.bayesianMean,
                            currentMean: statsData.bayesianMean, minScore, maxScore
                        });
                    } else {
                        result = runMonteCarloAnalysis(statsData.bayesianMean, statsData.pooledSD, debouncedTarget, {
                            simulations: 5000, currentMean: statsData.bayesianMean, bayesianCI: statsData.bayesianCI, minScore, maxScore
                        });
                    }
                    setSimulationData({ status: 'ready', data: result });
                }
            }
        })();
        return () => { cancelled = true; };
    }, [statsHash, runAnalysis, debouncedTarget, projectDays, minScore, maxScore]);

    const perSubjectProbs = useMemo(() => {
        if (!statsData?.categoryStats?.length || simulationData?.status !== 'ready') return [];
        return statsData.categoryStats.filter(cat => cat.weight > 0).map(cat => {
            const baseline = cat.bayesianMean ?? cat.mean;
            const result = simulateNormalDistribution({
                mean: baseline, sd: cat.bayesianSd ?? cat.volatility ?? cat.sd,
                targetScore: debouncedTarget, simulations: 500, categoryName: cat.name, minScore, maxScore
            });
            return { name: cat.name, prob: result.probability, mean: baseline, trend: cat.trend };
        }).sort((a, b) => a.prob - b.prob);
    }, [statsData?.categoryStats, debouncedTarget, simulationData?.status, minScore, maxScore]);

    const [isFlashing, setIsFlashing] = useState(false);
    useEffect(() => {
        if (simulationData.status === 'ready') {
            setIsFlashing(true);
            const timer = setTimeout(() => setIsFlashing(false), 800);
            return () => clearTimeout(timer);
        }
    }, [simulationData.status, simulationData.data?.probability]);

    const probability = simulationData?.data?.probability ?? 0;
    const projectedMean = simulationData?.data?.projectedMean ?? simulationData?.data?.mean ?? 0;
    const rawCurrentMean = simulationData?.data?.currentMean ?? 0;
    const currentMean = (rawCurrentMean === 0 && projectedMean > 0) ? projectedMean : rawCurrentMean;

    useEffect(() => {
        const rawProb = Number(simulationData?.data?.probability);
        const prob = Number.isFinite(rawProb) ? rawProb : 0;
        const isTimeTraveling = timeIndex >= 0 && timeIndex < timelineDates.length - 1;
        if (simulationData?.status === 'ready' && Number.isFinite(prob) && prob > 0 && !effectiveSimulateToday && !isTimeTraveling) {
            recordMonteCarloSnapshot(getDateKey(new Date()), Number(prob.toFixed(1)), { mean: Number(currentMean.toFixed(1)), target: Number(debouncedTarget.toFixed(1)) });
        }
    }, [simulationData?.status, simulationData?.data?.probability, effectiveSimulateToday, recordMonteCarloSnapshot, timeIndex, timelineDates, currentMean, debouncedTarget]);

    const stableUpdateWeight = useCallback((name, p) => setWeights({ ...(weights || {}), [name]: p }), [setWeights, weights]);

    const sd = simulationData?.data?.sd ?? 0;
    const sdLeft = simulationData?.data?.sdLeft ?? sd;
    const sdRight = simulationData?.data?.sdRight ?? sd;
    const ci95Low = simulationData?.data?.ci95Low ?? 0;
    const ci95High = simulationData?.data?.ci95High ?? 0;

    const { saturation, projectionConfidence, pAdjusted, pTrend } = useMemo(() => {
        const domainWidth = maxScore - minScore;
        const icWidth = ci95High - ci95Low;
        const sat = Math.min(1, domainWidth > 0 ? icWidth / domainWidth : 1);
        const conf = Math.max(0, 1 - Math.pow(sat, 1.5));
        const pBaseline = (domainWidth > 0) ? Math.max(0, (maxScore - targetScore) / domainWidth) * 100 : 0;
        const adj = probability * conf + pBaseline * (1 - conf);
        const trend = normalCDF_complement((targetScore - projectedMean) / Math.max(1, sd)) * 100;
        return { saturation: sat, projectionConfidence: conf, pAdjusted: adj, pTrend: trend };
    }, [ci95High, ci95Low, maxScore, minScore, targetScore, probability, projectedMean, sd]);

    if (!simulationData || simulationData.status === 'waiting') {
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
                    <svg width="200" height="100" viewBox="0 -6 140 76" className="overflow-visible">
                        <path d="M 4 65 A 66 66 0 0 1 136 65" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-end justify-center pb-2"><span className="text-5xl font-black text-slate-600 tracking-tighter opacity-40">--%</span></div>
                </div>
                <div className="text-center w-full mt-2">
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Aguardando Dados</p>
                    <p className="text-[9px] text-slate-600 leading-tight px-4">Lance seu primeiro simulado para ativar a projeção Monte Carlo!</p>
                </div>
            </div>
        );
    }

    const probValue = Math.min(100, Math.max(0, Number.isFinite(probability) ? probability : 0));
    const gradientColor = probValue >= 70 ? "#22c55e" : probValue >= 40 ? "#f59e0b" : "#ef4444";
    const baseMessage = probValue > 95 ? "DOMÍNIO ESTRATÉGICO" : probValue > 80 ? "A PROMESSA" : probValue > 60 ? "NA ZONA DE BRIGA" : probValue > 40 ? "COMPETITIVO" : probValue > 20 ? "IMPROVISADOR" : "RISCO DE QUEDA";
    const isTimeTraveling = timeIndex >= 0 && timeIndex < timelineDates.length - 1;
    const message = baseMessage + (effectiveSimulateToday ? " (HOJE)" : isTimeTraveling ? " (MÁQUINA DO TEMPO)" : " (FUTURO)");

    return (
        <div className={`glass p-4 rounded-3xl relative flex flex-col border-l-4 border-blue-500 bg-gradient-to-br from-slate-900 via-slate-900 to-black/80 group transition-all duration-500 shadow-2xl w-full max-w-full ${isFlashing ? 'opacity-90 scale-[0.99]' : ''}`}>
            {isFlashing && <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-3xl"><div className="w-full h-1/2 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent absolute top-0 left-0 animate-scan-fast" /></div>}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20"><Gauge size={16} className="text-white" /></div>
                        <div className="flex flex-col"><span className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] leading-none">Monte Carlo</span><span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Simulação Probabilística</span></div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        {forcedMode && <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border ${forcedMode === 'today' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>{forcedTitle || (forcedMode === 'today' ? 'Modo: Hoje' : 'Modo: Futuro')}</div>}
                        {!effectiveSimulateToday && <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 shadow-inner group-hover:border-blue-500/30 transition-all"><span className="text-[8px] font-bold text-slate-500 uppercase">Delta</span><span className={`text-[9px] font-black ${(projectedMean - currentMean) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(projectedMean - currentMean) > 0 ? `+${(projectedMean - currentMean).toFixed(1)}` : (projectedMean - currentMean).toFixed(1)}pp</span></div>}
                        {!effectiveSimulateToday && projectDays > 0 && <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 shadow-inner"><Clock size={10} className={`${projectDays <= 30 ? 'text-rose-400' : projectDays <= 60 ? 'text-amber-400' : 'text-blue-400'}`} /><span className={`text-[9px] font-black ${projectDays <= 30 ? 'text-rose-400' : projectDays <= 60 ? 'text-amber-400' : 'text-blue-400'}`}>{projectDays}d {isTimeTraveling ? 'na projeção' : 'restantes'}</span></div>}
                    </div>
                </div>
                {!forcedMode && (
                    <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5">
                        <button onClick={(e) => { e.stopPropagation(); setShowConfig(true); }} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95 shadow-inner"><Settings2 size={16} /></button>
                        <div className="w-px h-4 bg-white/10" />
                        <button onClick={(e) => { e.stopPropagation(); setSimulateToday(!simulateToday); }} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${simulateToday ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>{simulateToday ? 'Ver Projeção' : 'Ver Estatísticas'}<ChevronDown size={12} className={`transition-transform duration-300 ${simulateToday ? 'rotate-180' : ''}`} /></button>
                    </div>
                )}
            </div>

            <div className={`w-full bg-black/30 rounded-xl p-4 mb-3 border border-white/5 flex flex-col items-center transition-all duration-700 ${isFlashing ? 'blur-sm' : ''}`}>
                <div className="relative mb-2">
                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 blur-2xl transition-all duration-700 ${isFlashing ? 'scale-150 opacity-40' : ''}`}><div className="w-24 h-24 rounded-full" style={{ backgroundColor: gradientColor }} /></div>
                    <svg width="200" height="100" viewBox="0 -6 140 76" className="overflow-visible relative z-10">
                        <path d="M 4 65 A 66 66 0 0 1 136 65" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
                        <path d="M 4 65 A 66 66 0 0 1 136 65" fill="none" stroke={gradientColor} strokeWidth="10" strokeLinecap="round" pathLength="100" strokeDasharray={`${probValue} ${100 - probValue}`} strokeDashoffset={0} style={{ transition: 'stroke-dasharray 1.5s ease-out' }} />
                        <g transform={`rotate(${(probValue / 100) * 180}, 70, 65)`} style={{ transition: 'transform 1.5s ease-out', opacity: isFlashing ? 0.3 : 1 }}><circle cx="4" cy="65" r="4" fill={gradientColor} style={{ filter: `drop-shadow(0 0 6px ${gradientColor})` }} /><circle cx="4" cy="65" r="2" fill="#fff" opacity="0.8" /></g>
                    </svg>
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center z-20"><span className="text-4xl font-black drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]" style={{ color: gradientColor }}>{pAdjusted.toFixed(1)}%</span></div>
                </div>
                <span className={`mt-2 text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full bg-black/40 border border-white/10 shadow-lg transition-all duration-500`} style={{ color: isFlashing ? '#60a5fa' : gradientColor }}>{isFlashing ? "Simulando cenários..." : message}</span>
                {saturation > 0.75 && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-3 px-4 py-2 rounded-xl sm:rounded-full bg-amber-500/10 border border-amber-500/30 shadow-lg w-full max-w-sm mx-auto text-center">
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-amber-400">{saturation > 0.90 ? '⚠ Dados insuficientes' : '⚠ Alta incerteza'}</span>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-center"><div className="w-full sm:w-16 h-1.5 sm:h-1 bg-slate-800 rounded-full overflow-hidden border border-white/5"><div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${projectionConfidence * 100}%` }} /></div><span className="text-[9px] font-black text-amber-400">{(projectionConfidence * 100).toFixed(0)}%</span></div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4 px-1 w-full">
                {[
                    { label: "Sua Meta", val: `${targetScore.toFixed(0)}${unit}`, color: "text-rose-500" },
                    { label: isTimeTraveling ? "Nesse Dia" : "Hoje", val: `${currentMean.toFixed(1)}${unit}`, color: "text-white" },
                    { label: "Projeção", val: `${projectedMean.toFixed(1)}${unit}`, color: "text-blue-400" },
                    { label: "Incerteza", val: `-${sdLeft.toFixed(1)} / +${sdRight.toFixed(1)}`, color: Math.max(sdLeft, sdRight) <= 5 ? 'text-emerald-400' : 'text-yellow-400', small: true },
                    { label: "IC 95%", val: `${ci95Low.toFixed(0)}–${ci95High.toFixed(0)}${unit}`, color: "text-green-500", small: true }
                ].map((m, i) => (
                    <div key={i} className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center justify-center overflow-hidden w-full">
                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">{m.label}</span>
                        <span className={`${m.small ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} font-black ${m.color} truncate w-full text-center`}>{m.val}</span>
                    </div>
                ))}
            </div>

            {saturation > 0.75 && (
                <div className="w-full grid grid-cols-3 bg-black/30 rounded-xl p-2 border border-white/5 mt-2 mb-2 divide-x divide-white/10">
                    <div className="flex flex-col items-center justify-center"><span className="text-[7px] text-slate-500 uppercase mb-0.5">P (tendência)</span><span className="text-xs font-black text-blue-400">{pTrend.toFixed(1)}%</span></div>
                    <div className="flex flex-col items-center justify-center"><span className="text-[7px] text-slate-500 uppercase mb-0.5">P (simulação)</span><span className="text-xs font-black text-slate-400 line-through opacity-60">{probability.toFixed(1)}%</span></div>
                    <div className="flex flex-col items-center justify-center"><span className="text-[7px] text-slate-500 uppercase mb-0.5">P (ajustada)</span><span className="text-xs font-black text-amber-400">{pAdjusted.toFixed(1)}%</span></div>
                </div>
            )}

            <div className="w-full bg-black/30 rounded-xl p-4 mb-4 border border-white/5">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-3 px-1 w-full"><span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider w-full text-center sm:text-left">Projeção de Desempenho</span><div className="flex flex-wrap justify-center sm:justify-end gap-x-3 gap-y-1 w-full"><span className="text-[9px] text-slate-400 flex items-center gap-1 whitespace-nowrap"><div className="w-2 h-0.5 bg-white/40 rounded-full" />{isTimeTraveling ? "Nesse Dia" : "Hoje"}</span><span className="text-[9px] text-slate-400 flex items-center gap-1 whitespace-nowrap"><div className="w-2 h-0.5 bg-blue-500 rounded-full" />Projeção</span><span className="text-[9px] text-slate-400 flex items-center gap-1 whitespace-nowrap"><div className="w-2 h-0.5 bg-red-500 rounded-full" />Meta</span></div></div>
                <div className="w-full h-[240px] px-2 flex items-center"><GaussianPlot mean={projectedMean} sd={sd} sdLeft={sdLeft} sdRight={sdRight} low95={ci95Low} high95={ci95High} targetScore={targetScore} currentMean={currentMean} prob={probValue} kdeData={simulationData?.data?.kdeData} projectedMean={projectedMean} unit={unit} minScore={minScore} maxScore={maxScore} /></div>
                {timelineDates.length > 1 && (
                    <div className="w-full mt-6 px-3 py-4 bg-black/40 rounded-xl border border-white/5 relative group/timeline">
                        <span className="absolute -top-2.5 left-4 px-2 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/30 rounded-full shadow-lg">⏳ Máquina do Tempo</span>
                        <div className="flex justify-between items-end mb-3 px-1"><span className="text-[9px] text-slate-500 uppercase tracking-widest">Evolução Histórica</span><span className="text-[10px] font-black text-white bg-indigo-500/20 px-2 py-0.5 rounded backdrop-blur-sm border border-indigo-500/30">{timeIndex === -1 || timeIndex === timelineDates.length - 1 ? 'Estado Atual (Hoje)' : new Date(timelineDates[timeIndex] + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
                        <div className="relative w-full flex items-center"><input type="range" min="0" max={timelineDates.length - 1} value={timeIndex === -1 ? timelineDates.length - 1 : timeIndex} onChange={(e) => { const v = Number(e.target.value); setTimeIndex(v === timelineDates.length - 1 ? -1 : v); }} className="w-full appearance-none bg-transparent z-10 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-slate-800 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(99,102,241,0.8)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white cursor-pointer" /><div className="absolute inset-x-0 h-2 top-1/2 -translate-y-1/2 pointer-events-none flex justify-between px-2.5 opacity-40">{timelineDates.map((_, i) => <div key={i} className={`w-0.5 h-full rounded-full ${i === (timeIndex === -1 ? timelineDates.length - 1 : timeIndex) ? 'bg-indigo-400' : 'bg-slate-400'}`} />)}</div></div>
                    </div>
                )}
            </div>

            <div className="w-full flex flex-col gap-2 mt-4">
                <button onClick={() => setShowPerSubject(!showPerSubject)} className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"><span>Matérias Analisadas</span>{perSubjectProbs.length > 0 && <ChevronDown size={12} className={`transition-transform duration-300 ${showPerSubject ? 'rotate-180' : ''}`} />}</button>
                {showPerSubject && perSubjectProbs.length > 0 && (
                    <div className="w-full bg-black/30 rounded-xl p-3 border border-white/5 space-y-1.5"><div className="flex items-center justify-between px-1 mb-2"><span className="text-[8px] font-bold text-slate-600 uppercase">Disciplina</span><span className="text-[8px] font-bold text-slate-600 uppercase">Prob. Individual</span></div>{perSubjectProbs.map(s => <div key={s.name} className="flex items-center gap-2 px-1.5 py-1 hover:bg-white/5 rounded-lg transition-colors"><div className="flex items-center gap-1.5 flex-1 min-w-0">{s.trend === 'up' ? <TrendingUp size={9} className="text-emerald-400" /> : s.trend === 'down' ? <TrendingDown size={9} className="text-rose-400" /> : <Minus size={9} className="text-slate-600" />}<span className="text-[9px] text-slate-400 truncate">{s.name}</span></div><div className="flex items-center gap-2 shrink-0"><div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${s.prob < 40 ? 'bg-rose-500' : s.prob < 60 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, s.prob)}%` }} /></div><span className={`text-[10px] font-black w-10 text-right ${s.prob < 40 ? 'text-rose-400' : s.prob < 60 ? 'text-amber-400' : 'text-blue-400'}`}>{s.prob.toFixed(0)}%</span></div></div>)}</div>
                )}
            </div>
            {!forcedMode && <MonteCarloConfig show={showConfig} onClose={setShowConfig} targetScore={targetScore} setTargetScore={onTargetScoreChange} equalWeightsMode={equalWeightsMode} setEqualWeightsMode={setEqualWeightsMode} getEqualWeights={getEqualWeights} weights={weights} setWeights={setWeights} updateWeight={stableUpdateWeight} categories={categories} user={activeUser} />}
        </div>
    );
}

