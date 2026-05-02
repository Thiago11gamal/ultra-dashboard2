import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { 
    computeCategoryStats, 
    computeBayesianLevel, 
    computeWeightedVariance, 
    calculateVolatility, 
    estimateInterSubjectCorrelation 
} from '../engine';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo';
import { getSafeScore, getSyntheticTotal, formatValue } from '../utils/scoreHelper';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { normalCDF_complement } from '../engine/math/gaussian';
import { 
    getConfidenceMultiplier, 
    winsorizeSeries, 
    deriveAdaptiveConfig, 
    computeAdaptiveSignal 
} from '../utils/adaptiveMath.js';

const sanitizeWeightUnit = (value) => {
    const numeric = parseInt(value, 10);
    if (isNaN(numeric)) return 0;
    return Math.max(0, Math.min(999, numeric));
};

/**
 * Regularização Bayesiana da Volatilidade (Shrinkage de Tikhonov)
 */
function regularizeVolatility(dailySD, projectionDays, historyLength, domain) {
    const informativeSD = 0.35 * domain / Math.sqrt(Math.max(1, projectionDays));
    const priorStrength = Math.max(1.0, 5.0 - Math.log2(historyLength + 1));
    const n = Math.max(1, historyLength);
    const regularizedVariance = (dailySD * dailySD * n + informativeSD * informativeSD * priorStrength) / (n + priorStrength);
    return Math.sqrt(regularizedVariance);
}

export function useMonteCarloStats({ categories, goalDate, targetScore, timeIndex, timelineDates, minScore, maxScore, forcedMode, effectiveSimulateToday }) {
    const activeId = useAppStore(state => state.appState.activeId);
    const weights = useAppStore(state => state.appState.contests[activeId]?.mcWeights || {});
    const equalWeightsMode = useAppStore(state => state.appState.mcEqualWeights ?? true);
    
    const setWeights = useAppStore(state => state.setMonteCarloWeights);
    const recordMonteCarloSnapshot = useAppStore(state => state.recordMonteCarloSnapshot);
    const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);

    const activeCategories = useMemo(() =>
        categories.filter(c => {
            const h = c.simuladoStats?.history;
            const hLen = h ? (Array.isArray(h) ? h.length : Object.values(h).length) : 0;
            return hLen > 0;
        }),
        [categories]);

    const getEqualWeights = useCallback(() => {
        if (activeCategories.length === 0) return {};
        const newWeights = {};
        activeCategories.forEach(cat => {
            newWeights[cat.id || cat.name] = 1;
        });
        return newWeights;
    }, [activeCategories]);

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
                goal = new Date(g.getFullYear(), g.getMonth(), g.getDate());
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
        const diffTime = goal.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }, [goalDate, effectiveSimulateToday, timeIndex, timelineDates]);

    const statsData = useMemo(() => {
        let categoryStats = [];
        let totalWeight = 0;
        let weightedBayesianAlpha = 0;
        let weightedBayesianBeta = 0;

        const scoresByDate = {};
        const weightsByName = {};
        const bayesianStats = [];

        const cutoffDate = (timeIndex >= 0 && timeIndex < timelineDates.length)
            ? timelineDates[timeIndex]
            : null;

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
                    weightedBayesianAlpha += baye.alpha * weight;
                    weightedBayesianBeta += baye.beta * weight;
                    weightsByName[cat.name] = weight;

                    history.forEach(h => {
                        const dk = getDateKey(h.date);
                        if (dk) {
                            if (!scoresByDate[dk]) scoresByDate[dk] = {};
                            const existing = scoresByDate[dk][cat.name];
                            const currentScore = getSafeScore(h, maxScore);
                            const currentTotal = Number(h.total) || 0;
                            const currentCorrect = Number(h.correct) || 0;

                            if (existing) {
                                const newTotal = existing.total + currentTotal;
                                let newCorrect = existing.correct + currentCorrect;
                                let newScore = newTotal > 0 ? (newCorrect / newTotal) * maxScore : (existing.score + currentScore) / 2;
                                scoresByDate[dk][cat.name] = { score: newScore, correct: newCorrect, total: newTotal };
                            } else {
                                scoresByDate[dk][cat.name] = { score: currentScore, correct: currentCorrect, total: currentTotal };
                            }
                        }
                    });

                    categoryStats.push({ name: cat.name, ...stats, bayesianMean: baye.mean, bayesianSd: baye.sd, volatility: vol, weight });
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

        const bayesianMean = (weightedBayesianAlpha + weightedBayesianBeta) > 0 ? (weightedBayesianAlpha / (weightedBayesianAlpha + weightedBayesianBeta)) * maxScore : 0;
        const pooledBayesianVar = computeWeightedVariance(bayesianStats, totalWeight, estimatedRho);
        const pooledBayesianSD = Math.sqrt(pooledBayesianVar);

        const rawGlobalHistory = sortedDates.map(date => {
            let pooledCorrect = 0;
            let pooledTotal = 0;
            Object.keys(scoresByDate[date]).forEach(name => {
                const w = weightsByName[name];
                const metrics = scoresByDate[date][name];
                if (w > 0 && metrics !== undefined) {
                    const total = metrics.total || getSyntheticTotal(maxScore);
                    const correct = (metrics.correct !== undefined && metrics.total > 0) ? metrics.correct : (metrics.score / maxScore) * total;
                    pooledCorrect += correct * w;
                    pooledTotal += total * w;
                }
            });
            return { date, score: pooledTotal > 0 ? (pooledCorrect / pooledTotal) * maxScore : -1 };
        }).filter(item => item.score >= 0 && !isNaN(item.score));

        const adaptiveSignal = computeAdaptiveSignal(rawGlobalHistory.map(item => item.score));
        const confidenceMultiplier = getConfidenceMultiplier(adaptiveSignal.effectiveN) * adaptiveSignal.ciInflation;
        const weightedLow = Math.max(minScore, bayesianMean - confidenceMultiplier * pooledBayesianSD);
        const weightedHigh = Math.min(maxScore, bayesianMean + confidenceMultiplier * pooledBayesianSD);

        const globalHistory = rawGlobalHistory;

        const winsorizedScores = winsorizeSeries(
            globalHistory.map(h => h.score),
            adaptiveSignal.adaptiveWinsor.low,
            adaptiveSignal.adaptiveWinsor.high
        );
        const robustGlobalHistory = globalHistory.map((h, idx) => ({ ...h, score: winsorizedScores[idx] }));
        const temporalVolatility = calculateVolatility(robustGlobalHistory, maxScore);
        const dailySD = temporalVolatility > 0 ? temporalVolatility : pooledSD;

        const avgCV = totalWeight > 0 ? categoryStats.reduce((acc, cat) => acc + ((cat.mean > 1 ? (cat.sd / cat.mean) * 100 : 0) * (cat.weight / totalWeight)), 0) : 0;

        // BUG-05 FIX: Include score values in hash to prevent collisions when mean/SD coincide
        const scoreFingerprint = globalHistory.map(h => h.score.toFixed(4)).join(',');
        const statsHash = `${bayesianMean}-${pooledSD}-${globalHistory.length}-${minScore}-${maxScore}-${scoreFingerprint}`;

        return {
            categoryStats,
            bayesianMean,
            pooledSD,
            totalWeight,
            bayesianCI: { ciLow: weightedLow, ciHigh: weightedHigh },
            globalHistory,
            dailySD,
            estimatedRho,
            consistencyScore: Math.max(0, 100 - avgCV),
            statsHash
        };
    }, [categories, debouncedWeights, effectiveWeights, timeIndex, timelineDates, minScore, maxScore]);

    const statsHash = statsData?.statsHash || 'null';

    const { runAnalysis } = useMonteCarloWorker();
    const [simulationData, setSimulationData] = useState({ status: 'waiting', missing: 'data' });

    // BUG-05 FIX: Moved declaration before the useEffect that references setIsFlashing.
    // Previously at line 365 — worked by hoisting but was a maintenance hazard.
    const [isFlashing, setIsFlashing] = useState(false);

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
                        meta: debouncedTarget,
                        simulations: 5000,
                        projectionDays: projectDays,
                        forcedVolatility: regularizedSD,
                        forcedBaseline: statsData.bayesianMean,
                        currentMean: statsData.bayesianMean,
                        minScore,
                        maxScore,
                    });
                } else {
                    result = await runAnalysis(statsData.bayesianMean, statsData.pooledSD, debouncedTarget, {
                        simulations: 5000,
                        currentMean: statsData.bayesianMean,
                        bayesianCI: statsData.bayesianCI,
                        minScore,
                        maxScore,
                    });
                }
                if (!cancelled) {
                    setSimulationData({ status: 'ready', data: result });
                    setIsFlashing(true);
                }
            } catch (err) {
                console.warn('[MC Worker] Simulation failed, using sync fallback:', err);
                if (!cancelled) {
                    let result;
                    if (isFuture && statsData.globalHistory?.length > 0) {
                        const domain = maxScore - minScore;
                        const regularizedSD = regularizeVolatility(statsData.dailySD, projectDays, statsData.globalHistory.length, domain);
                        result = runMonteCarloAnalysis({
                            values: statsData.globalHistory.map(h => h.score),
                            dates: statsData.globalHistory.map(h => h.date),
                            meta: debouncedTarget,
                            simulations: 5000,
                            projectionDays: projectDays,
                            forcedVolatility: regularizedSD,
                            forcedBaseline: statsData.bayesianMean,
                            currentMean: statsData.bayesianMean,
                            minScore,
                            maxScore,
                        });
                    } else {
                        result = runMonteCarloAnalysis(statsData.bayesianMean, statsData.pooledSD, debouncedTarget, {
                            simulations: 5000,
                            currentMean: statsData.bayesianMean,
                            bayesianCI: statsData.bayesianCI,
                            minScore,
                            maxScore,
                        });
                    }
                    setSimulationData({ status: 'ready', data: result });
                    setIsFlashing(true);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [statsHash, runAnalysis, debouncedTarget, projectDays, minScore, maxScore]);

    const perSubjectProbs = useMemo(() => {
        if (!statsData?.categoryStats?.length || simulationData?.status !== 'ready') return [];

        return statsData.categoryStats
            .filter(cat => cat.weight > 0)
            .map(cat => {
                const currentBaseline = cat.bayesianMean ?? cat.mean;
                const rawTrend = cat.trendValue || 0;
                
                // MATH-05 FIX: Apply log-damping to match global MC projection logic (amortized trend)
                // This prevents subjects from projecting 100% too aggressively in long horizons.
                const logDampingFactor = 45; 
                const projectedDaysAmortized = logDampingFactor * Math.log(1 + projectDays / logDampingFactor);
                const dailyTrend = rawTrend / 30;
                const totalTrendProjection = dailyTrend * projectedDaysAmortized;

                const baseline = (!effectiveSimulateToday && projectDays > 0)
                    ? Math.max(minScore, Math.min(maxScore, currentBaseline + totalTrendProjection))
                    : currentBaseline;

                const result = simulateNormalDistribution({
                    mean: baseline,
                    sd: cat.bayesianSd ?? cat.sd,
                    targetScore: debouncedTarget,
                    simulations: 500,
                    categoryName: cat.name,
                    minScore,
                    maxScore,
                });

                return { name: cat.name, prob: result.probability, mean: baseline, trend: cat.trend };
            })
            .sort((a, b) => a.prob - b.prob);
    }, [statsData?.categoryStats, debouncedTarget, simulationData, minScore, maxScore, effectiveSimulateToday, projectDays]);

    // BUG-05 FIX: isFlashing declaration moved above (before first useEffect that uses it)
    useEffect(() => {
        if (isFlashing) {
            const timer = setTimeout(() => setIsFlashing(false), 800);
            return () => clearTimeout(timer);
        }
    }, [isFlashing]);

    const probability = simulationData?.data?.probability ?? 0;
    const rawProjectedMean = simulationData?.data?.projectedMean ?? simulationData?.data?.mean ?? 0;
    const projectedMean = Math.max(minScore, Math.min(maxScore, rawProjectedMean));
    const rawCurrentMean = simulationData?.data?.currentMean ?? 0;
    const currentMean = (rawCurrentMean === 0 && projectedMean > 0) ? projectedMean : rawCurrentMean;

    useEffect(() => {
        const rawProb = Number(simulationData?.data?.probability);
        const prob = Number.isFinite(rawProb) ? rawProb : 0;
        const isTimeTraveling = timeIndex >= 0 && timeIndex < timelineDates.length - 1;

        if (simulationData?.status === 'ready' && Number.isFinite(prob) && prob > 0 && !effectiveSimulateToday && !isTimeTraveling) {
            const today = getDateKey(new Date());
            const currentProb = Number(prob.toFixed(2));
            const history = useAppStore.getState().appState.contests[activeId]?.monteCarloHistory || [];
            const existing = Array.isArray(history) ? history.find(h => h.date === today) : null;
            const currentTarget = Number(debouncedTarget.toFixed(2));
            // Support both .probability (schema) and .prob (legacy/local)
            const existingProb = existing?.probability ?? existing?.prob ?? 0;
            const probChanged = !existing || Math.abs(existingProb - currentProb) > 0.05;
            const targetChanged = !existing || existing.target !== currentTarget;

            if (probChanged || targetChanged) {
                recordMonteCarloSnapshot(today, currentProb, { mean: Number(currentMean.toFixed(2)), target: currentTarget });
            }
        }
    }, [simulationData?.status, simulationData?.data?.probability, effectiveSimulateToday, recordMonteCarloSnapshot, timeIndex, timelineDates, currentMean, debouncedTarget, activeId]);

    const derivedMetrics = useMemo(() => {
        const sd = simulationData?.data?.sd ?? 0;
        const sdLeft = simulationData?.data?.sdLeft ?? sd;
        const sdRight = simulationData?.data?.sdRight ?? sd;
        const ci95Low = simulationData?.data?.ci95Low ?? 0;
        const ci95High = simulationData?.data?.ci95High ?? 0;

        const domainWidth = maxScore - minScore;
        const icWidth = ci95High - ci95Low;
        const saturation = Math.min(1, domainWidth > 0 ? icWidth / domainWidth : 1);
        const projectionConfidence = Math.max(0, 1 - Math.pow(saturation, 1.5));
        const pBaseline = (domainWidth > 0) ? Math.max(0, (maxScore - targetScore) / domainWidth) * 100 : 0;
        const pAdjusted = probability * projectionConfidence + pBaseline * (1 - projectionConfidence);
        const pTrend = normalCDF_complement((targetScore - projectedMean) / Math.max(1, sd)) * 100;

        return { sd, sdLeft, sdRight, ci95Low, ci95High, saturation, projectionConfidence, pAdjusted, pTrend };
    }, [simulationData?.data, maxScore, minScore, targetScore, probability, projectedMean]);

    return {
        statsData,
        simulationData,
        perSubjectProbs,
        isFlashing,
        projectDays,
        debouncedTarget,
        effectiveWeights,
        setWeights,
        probability,
        projectedMean,
        currentMean,
        ...derivedMetrics,
        equalWeightsMode,
        setEqualWeightsMode
    };
}
