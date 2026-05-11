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
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { normalCDF_complement } from '../engine/math/gaussian';
import { 
    getConfidenceMultiplier, 
    winsorizeSeries, 
    computeAdaptiveSignal 
} from '../utils/adaptiveMath.js';
import { shrinkProbabilityToNeutral } from '../utils/calibration.js';
import { 
    getConfidenceTier, 
    buildHumanExplanation, 
    detectPerformanceDrift,
    humanizeVolatility,
    validatePrediction
} from '../utils/explanationEngine.js';

// --- CONFIGURATION CONSTANTS ---
const VOLATILITY_REGULARIZATION_FACTOR = 0.35;
const INFORMATIVE_PRIOR_MAX_STRENGTH = 5.0;
const LOG_DAMPING_FACTOR = 45;
const SYNCHRONOUS_FALLBACK_SIMULATIONS = 500;
const MAX_CALIBRATION_PENALTY = 0.15;
const CALIBRATION_LAMBDA_DAYS = 30; // Meia-vida de decaimento (30 dias)
// -------------------------------

const sanitizeWeightUnit = (value) => {
    const numeric = parseInt(value, 10);
    if (isNaN(numeric)) return 0;
    return Math.max(0, Math.min(999, numeric));
};

function regularizeVolatility(dailySD, projectionDays, historyLength, domain) {
    const informativeSD = VOLATILITY_REGULARIZATION_FACTOR * domain / Math.sqrt(Math.max(1, projectionDays));
    const priorStrength = Math.max(1.0, INFORMATIVE_PRIOR_MAX_STRENGTH - Math.log2(historyLength + 1));
    const n = Math.max(1, historyLength);
    const regularizedVariance = (dailySD * dailySD * n + informativeSD * informativeSD * priorStrength) / (n + priorStrength);
    return Math.sqrt(regularizedVariance);
}

function computeCalibrationPenalty(mcHistory, globalHistory, maxScore) {
    if (!Array.isArray(mcHistory) || mcHistory.length === 0 || !Array.isArray(globalHistory) || globalHistory.length === 0) {
        return 0;
    }

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const LAMBDA = Math.log(2) / (CALIBRATION_LAMBDA_DAYS * MS_PER_DAY);
    const now = Date.now();
    
    let brierWeightSum = 0;
    let brierSum = 0;
    let residualWeightSum = 0;
    let residualSum = 0;

    mcHistory.forEach(snapshot => {
        const snapTime = new Date(snapshot.date).getTime();
        if (isNaN(snapTime)) return;
        
        const actual = globalHistory.find(h => new Date(h.date).getTime() >= snapTime);
        if (!actual) return;
        
        const age = Math.max(0, now - snapTime);
        const weight = Math.exp(-LAMBDA * age);
        
        const meanPrediction = Number(snapshot.mean) || 0;
        if (meanPrediction > 0 && maxScore > 0) {
            const err = Math.abs(meanPrediction - actual.score) / maxScore;
            residualSum += err * weight;
            residualWeightSum += weight;
        }

        const p = Math.max(0, Math.min(1, (Number(snapshot.probability) || 0) / 100));
        const target = Number(snapshot.target) || 0;
        if (target > 0) {
            const observed = actual.score >= target ? 1 : 0;
            brierSum += ((p - observed) ** 2) * weight;
            brierWeightSum += weight;
        }
    });

    let calibrationPenalty = 0;
    if (brierWeightSum > 0 || residualWeightSum > 0) {
        const avgBrier = brierWeightSum > 0 ? brierSum / brierWeightSum : 0.18;
        const avgResidual = residualWeightSum > 0 ? residualSum / residualWeightSum : 0;
        
        const rawBrierPenalty = Math.max(0, avgBrier - 0.18);
        const combinedPenalty = (rawBrierPenalty * 0.7) + (avgResidual * 0.3);
        calibrationPenalty = Math.min(MAX_CALIBRATION_PENALTY, combinedPenalty);
    }
    
    return calibrationPenalty;
}

function generateAnalyticsStats({
    categories,
    debouncedWeights,
    timeIndex,
    timelineDates,
    minScore,
    maxScore
}) {
    let categoryStats = [];
    let totalWeight = 0;
    let weightedBayesianAlpha = 0;
    let weightedBayesianBeta = 0;

    const scoresByDate = {};
    const weightsByKey = {};
    const maxScoreByKey = {};
    const bayesianStats = [];

    const cutoffDate = (timeIndex >= 0 && timeIndex < timelineDates.length)
        ? timelineDates[timeIndex]
        : null;

    categories.forEach(cat => {
        if (cat.simuladoStats?.history?.length > 0) {
            const catMaxScore = Number(cat.maxScore) || maxScore;

            const history = [...cat.simuladoStats.history]
                .filter(h => {
                    if (!cutoffDate) return true;
                    const dateString = h.date?.includes('T') ? h.date.split('T')[0] : h.date;
                    return dateString <= cutoffDate;
                })
                .sort((a, b) => (normalizeDate(a.date)?.getTime() ?? 0) - (normalizeDate(b.date)?.getTime() ?? 0));

            if (history.length === 0) return;

            const weightKey = cat.id || cat.name;
            const weight = sanitizeWeightUnit(debouncedWeights[weightKey] ?? 0);

            const baye = computeBayesianLevel(history, 1, 1, catMaxScore);
            const stats = computeCategoryStats(history, weight, 60, catMaxScore);
            const vol = calculateVolatility(history, catMaxScore);

            if (stats && weight > 0) {
                totalWeight += weight;
                weightedBayesianAlpha += baye.alpha * weight;
                weightedBayesianBeta += baye.beta * weight;
                weightsByKey[weightKey] = weight;
                maxScoreByKey[weightKey] = catMaxScore;

                history.forEach(h => {
                    const dk = getDateKey(h.date);
                    if (dk) {
                        if (!scoresByDate[dk]) scoresByDate[dk] = {};
                        const existing = scoresByDate[dk][weightKey];
                        const currentScore = getSafeScore(h, catMaxScore);
                        const currentTotal = Number(h.total) || 0;
                        const currentCorrect = Number(h.correct) || 0;

                        if (existing) {
                            const newTotal = existing.total + currentTotal;
                            let newCorrect = existing.correct + currentCorrect;
                            let newScore = newTotal > 0 ? (newCorrect / newTotal) * catMaxScore : (existing.score + currentScore) / 2;
                            scoresByDate[dk][weightKey] = { score: newScore, correct: newCorrect, total: newTotal };
                        } else {
                            scoresByDate[dk][weightKey] = { score: currentScore, correct: currentCorrect, total: currentTotal };
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
            const w = weightsByKey[name];
            const catMaxScore = maxScoreByKey[name] || maxScore;
            const metrics = scoresByDate[date][name];
            if (w > 0 && metrics !== undefined) {
                const total = metrics.total || getSyntheticTotal(catMaxScore);
                const correct = (metrics.correct !== undefined && metrics.total > 0) ? metrics.correct : (metrics.score / catMaxScore) * total;
                pooledCorrect += correct * w;
                pooledTotal += total * w;
            }
        });
        return { date, score: pooledTotal > 0 ? (pooledCorrect / pooledTotal) * maxScore : -1 };
    }).filter(item => item.score >= 0 && !isNaN(item.score));

    const adaptiveSignal = computeAdaptiveSignal(rawGlobalHistory.map(item => item.score));
    const confidenceMultiplier = getConfidenceMultiplier(adaptiveSignal.effectiveN) * adaptiveSignal.ciInflation;
    const weightedLow = Math.max(minScore, bayesianMean - confidenceMultiplier * pooledBayesianSD);
    const weightedHigh = Math.max(maxScore, bayesianMean + confidenceMultiplier * pooledBayesianSD);

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

    const hLen = globalHistory.length;
    const firstScore = hLen > 0 ? globalHistory[0].score.toFixed(4) : '0';
    const lastScore = hLen > 0 ? globalHistory[hLen - 1].score.toFixed(4) : '0';
    const scoreFingerprint = `${hLen}-${firstScore}-${lastScore}`;
    const statsHash = `${bayesianMean.toFixed(4)}-${pooledSD.toFixed(4)}-${minScore}-${maxScore}-${scoreFingerprint}`;

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
}

export function useMonteCarloStats({ categories, goalDate, targetScore, timeIndex, timelineDates, minScore, maxScore, forcedMode: _forcedMode, effectiveSimulateToday }) {
    const activeId = useAppStore(state => state.appState?.activeId);
    const weights = useAppStore(state => state.appState?.contests?.[activeId]?.mcWeights || {});
    const equalWeightsMode = useAppStore(state => state.appState.mcEqualWeights ?? true);
    const mcHistory = useAppStore(state => state.appState?.contests?.[activeId]?.monteCarloHistory || []);
    
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
        const safeDays = diffDays > 0 ? diffDays : 0;
        return Math.min(3650, safeDays);
    }, [goalDate, effectiveSimulateToday, timeIndex, timelineDates]);

    const pureStatsData = useMemo(() => {
        return generateAnalyticsStats({
            categories,
            debouncedWeights,
            timeIndex,
            timelineDates,
            minScore,
            maxScore
        });
    }, [categories, debouncedWeights, timeIndex, timelineDates, minScore, maxScore]);

    const calibrationPenalty = useMemo(() => {
        return computeCalibrationPenalty(mcHistory, pureStatsData?.globalHistory, maxScore);
    }, [mcHistory, pureStatsData?.globalHistory, maxScore]);

    const statsData = useMemo(() => {
        if (!pureStatsData) return null;
        if (calibrationPenalty <= 0) return { ...pureStatsData, calibrationPenalty: 0 };
        
        const aleatoricFloor = maxScore * 0.02;
        const epistemicPooled = Math.max(0, pureStatsData.pooledSD - aleatoricFloor);
        const calibratedPooledSD = aleatoricFloor + (epistemicPooled * (1 + calibrationPenalty * 2.5));
        
        const epistemicDaily = Math.max(0, pureStatsData.dailySD - aleatoricFloor);
        const calibratedDailySD = aleatoricFloor + (epistemicDaily * (1 + calibrationPenalty * 2.5));
        
        return {
            ...pureStatsData,
            pooledSD: calibratedPooledSD,
            dailySD: calibratedDailySD,
            rawPooledSD: pureStatsData.pooledSD,
            calibrationPenalty
        };
    }, [pureStatsData, calibrationPenalty, maxScore]);

    const pureStatsHash = pureStatsData?.statsHash || 'null';

    const { runAnalysis } = useMonteCarloWorker();
    const [simulationData, setSimulationData] = useState({ status: 'waiting', missing: 'data' });

    const [isFlashing, setIsFlashing] = useState(false);

    // Motor roda Cego/Puro para prevenir Feedback Loops (usa pureStatsData)
    useEffect(() => {
        if (!pureStatsData) return;
 
        let totalPoints = 0;
        pureStatsData.categoryStats.forEach(cat => totalPoints += cat.n || 1);
        if (totalPoints < 1) return;
 
        let cancelled = false;
        const isFuture = projectDays > 0;
 
        (async () => {
            try {
                let result;
                if (isFuture && pureStatsData.globalHistory?.length > 0) {
                    const domain = maxScore - minScore;
                    const regularizedSD = regularizeVolatility(pureStatsData.dailySD, projectDays, pureStatsData.globalHistory.length, domain);
 
                    result = await runAnalysis({
                        values: pureStatsData.globalHistory.map(h => h.score),
                        dates: pureStatsData.globalHistory.map(h => h.date),
                        meta: debouncedTarget,
                        simulations: 5000,
                        projectionDays: projectDays,
                        forcedVolatility: regularizedSD,
                        forcedBaseline: pureStatsData.bayesianMean,
                        currentMean: pureStatsData.bayesianMean,
                        minScore,
                        maxScore,
                    });
                } else {
                    result = await runAnalysis(pureStatsData.bayesianMean, pureStatsData.pooledSD, debouncedTarget, {
                        simulations: 5000,
                        currentMean: pureStatsData.bayesianMean,
                        bayesianCI: pureStatsData.bayesianCI,
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
                    if (isFuture && pureStatsData.globalHistory?.length > 0) {
                        const domain = maxScore - minScore;
                        const regularizedSD = regularizeVolatility(pureStatsData.dailySD, projectDays, pureStatsData.globalHistory.length, domain);
                        result = runMonteCarloAnalysis({
                            values: pureStatsData.globalHistory.map(h => h.score),
                            dates: pureStatsData.globalHistory.map(h => h.date),
                            meta: debouncedTarget,
                            simulations: SYNCHRONOUS_FALLBACK_SIMULATIONS,
                            projectionDays: projectDays,
                            forcedVolatility: regularizedSD,
                            forcedBaseline: pureStatsData.bayesianMean,
                            currentMean: pureStatsData.bayesianMean,
                            minScore,
                            maxScore,
                        });
                    } else {
                        result = runMonteCarloAnalysis(pureStatsData.bayesianMean, pureStatsData.pooledSD, debouncedTarget, {
                            simulations: SYNCHRONOUS_FALLBACK_SIMULATIONS,
                            currentMean: pureStatsData.bayesianMean,
                            bayesianCI: pureStatsData.bayesianCI,
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
    }, [pureStatsHash, runAnalysis, debouncedTarget, projectDays, minScore, maxScore, pureStatsData]);
 
    const effectiveSimulationData = useMemo(() => {
        if (!statsData) return { status: 'waiting', missing: 'data' };
        let totalPoints = 0;
        statsData.categoryStats.forEach(cat => { totalPoints += cat.n || 1; });
        if (totalPoints < 1) return { status: 'waiting', missing: 'count', count: totalPoints };
        return simulationData;
    }, [statsData, simulationData]);

    const perSubjectProbs = useMemo(() => {
        if (!statsData?.categoryStats?.length || simulationData?.status !== 'ready') return [];

        return statsData.categoryStats
            .filter(cat => cat.weight > 0)
            .map(cat => {
                const catMaxScore = Number(cat.maxScore) || maxScore;
                const currentBaseline = cat.bayesianMean ?? cat.mean;
                const rawTrend = cat.trendValue || 0;
                
                const projectedDaysAmortized = LOG_DAMPING_FACTOR * Math.log(1 + projectDays / LOG_DAMPING_FACTOR);
                const dailyTrend = rawTrend / 30;
                const totalTrendProjection = dailyTrend * projectedDaysAmortized;

                const baseline = (!effectiveSimulateToday && projectDays > 0)
                    ? Math.max(0, Math.min(catMaxScore, currentBaseline + totalTrendProjection))
                    : currentBaseline;

                const result = simulateNormalDistribution({
                    mean: baseline,
                    sd: cat.bayesianSd ?? cat.sd,
                    targetScore: (maxScore > 0 ? (debouncedTarget / maxScore) * catMaxScore : debouncedTarget),
                    simulations: 500,
                    categoryName: cat.name,
                    minScore: 0,
                    maxScore: catMaxScore,
                });

                return { name: cat.name, prob: result.probability, mean: baseline, trend: cat.trend };
            })
            .sort((a, b) => a.prob - b.prob);
    }, [statsData, debouncedTarget, simulationData?.status, maxScore, effectiveSimulateToday, projectDays]);

    useEffect(() => {
        if (isFlashing) {
            const timer = setTimeout(() => setIsFlashing(false), 800);
            return () => clearTimeout(timer);
        }
    }, [isFlashing]);

    const rawProbability = simulationData?.data?.probability ?? 0;
    const probability = shrinkProbabilityToNeutral(rawProbability, calibrationPenalty, 50, 0.5);
    
    const rawProjectedMean = simulationData?.data?.projectedMean ?? simulationData?.data?.mean ?? 0;
    const projectedMean = Math.max(minScore, Math.min(maxScore, rawProjectedMean));
    
    // 🎯 RIGOR FIX: 'Hoje' vem do Nível Bayesiano estável. 'Projeção' vem da simulação de futuro.
    const currentMean = Number.isFinite(Number(pureStatsData?.bayesianMean)) 
        ? Number(pureStatsData.bayesianMean) 
        : (simulationData?.data?.currentMean ?? projectedMean);



    const derivedMetrics = useMemo(() => {
        let sd = simulationData?.data?.sd ?? 0;
        let sdLeft = simulationData?.data?.sdLeft ?? sd;
        let sdRight = simulationData?.data?.sdRight ?? sd;
        let ci95Low = simulationData?.data?.ci95Low ?? 0;
        let ci95High = simulationData?.data?.ci95High ?? 0;

        // Apply Calibration Expansion visually
        if (calibrationPenalty > 0) {
            const ciMid = (ci95Low + ci95High) / 2;
            const ciExpand = 1 + (calibrationPenalty * 2.5);
            ci95Low = Math.max(0, ciMid - ((ciMid - ci95Low) * ciExpand));
            ci95High = Math.min(maxScore, ciMid + ((ci95High - ciMid) * ciExpand));
            sd = sd * (1 + calibrationPenalty * 2.5);
            sdLeft = sdLeft * (1 + calibrationPenalty * 2.5);
            sdRight = sdRight * (1 + calibrationPenalty * 2.5);
        }

        const domainWidth = maxScore - minScore;
        const icWidth = ci95High - ci95Low;
        const saturation = Math.min(1, domainWidth > 0 ? icWidth / domainWidth : 1);
        const projectionConfidence = Math.max(0, 1 - Math.pow(saturation, 1.5));
        const pBaseline = (domainWidth > 0) ? Math.max(0, (maxScore - debouncedTarget) / domainWidth) * 100 : 0;
        const pAdjusted = probability * projectionConfidence + pBaseline * (1 - projectionConfidence);
        const pTrend = normalCDF_complement((debouncedTarget - projectedMean) / Math.max(1, sd)) * 100;

        // Historico para tamanho da amostra
        const nHistory = Array.isArray(statsData?.history) ? statsData.history.length : (timelineDates?.length || 0);

        // Tier Dinâmico
        const confidenceObj = getConfidenceTier({
            calibrationPenalty,
            volatility: sd,
            sampleSize: nHistory
        });

        const explanations = buildHumanExplanation({
            calibrationPenalty,
            volatility: sd,
            trend: (projectedMean - currentMean),
            confidenceTier: confidenceObj.tier,
            intervalWidth: ci95High - ci95Low
        });

        const driftAlerts = detectPerformanceDrift({
            recentMean: currentMean,
            baselineMean: (statsData?.bayesianMean || currentMean),
            recentVolatility: sdLeft
        });

        const humanVol = humanizeVolatility(sdLeft);

        try {
            validatePrediction({
                probability: pAdjusted,
                interval: { low: ci95Low, high: ci95High },
                confidenceTier: confidenceObj.tier
            });
        } catch (e) {
            console.error("Monte Carlo Validation Error:", e);
        }

        return { 
            sd, sdLeft, sdRight, ci95Low, ci95High, saturation, projectionConfidence, pAdjusted, pTrend, 
            confidenceTier: confidenceObj.label, 
            confidenceColor: confidenceObj.tier === 'HIGH' ? 'text-emerald-400' : confidenceObj.tier === 'MEDIUM' ? 'text-amber-400' : 'text-rose-400',
            confidenceObj,
            explanations,
            humanVol,
            driftAlerts
        };
    }, [simulationData?.data, maxScore, minScore, debouncedTarget, projectedMean, calibrationPenalty, currentMean, statsData, timelineDates, probability]);

    // 🎯 RIGOR FIX: Gravação delegada para garantir que todos os dados derivados (CIs) estejam prontos
    useMonteCarloHistoryRecorder({
        activeId,
        simulationData,
        timeIndex,
        timelineDates,
        effectiveSimulateToday,
        debouncedTarget,
        currentMean,
        projectedMean,
        probability,
        pAdjusted: derivedMetrics.pAdjusted,
        ci95Low: derivedMetrics.ci95Low,
        ci95High: derivedMetrics.ci95High,
        recordMonteCarloSnapshot
    });

    return {
        statsData, // Contains calibrated variances
        simulationData: effectiveSimulationData,
        perSubjectProbs,
        isFlashing,
        projectDays,
        debouncedTarget,
        effectiveWeights,
        setWeights,
        probability, // Calibrated
        projectedMean,
        currentMean,
        ...derivedMetrics, // Calibrated CIs & confidenceTier
        equalWeightsMode,
        setEqualWeightsMode,
        calibrationPenalty // Expose penalty for potential UI badges
    };
}

// 🎯 EFFECT: Persistência de Histórico de Projeção (Snapshots)
function useMonteCarloHistoryRecorder({ 
    activeId, simulationData, timeIndex, timelineDates, effectiveSimulateToday, 
    debouncedTarget, currentMean, projectedMean, pAdjusted, ci95Low, ci95High,
    recordMonteCarloSnapshot 
}) {
        const prob = Number.isFinite(pAdjusted) ? pAdjusted : 0;
        const isTimeTraveling = timeIndex >= 0 && timeIndex < timelineDates.length - 1;

        if (simulationData?.status === 'ready' && Number.isFinite(prob) && prob > 0 && !effectiveSimulateToday && !isTimeTraveling && activeId) {
            const today = getDateKey(new Date());
            const currentProb = Number(prob.toFixed(2));
            const history = useAppStore.getState().appState?.contests?.[activeId]?.monteCarloHistory || [];
            const existing = Array.isArray(history) ? history.find(h => h.date === today) : null;
            const currentTarget = Number(debouncedTarget.toFixed(2));
            const existingProb = existing?.probability ?? existing?.prob ?? 0;
            const targetChanged = !existing || existing.target !== currentTarget;
            
            // 🎯 VERIFICAÇÃO CUIDADOSA: Só atualizar se o dado for NOVO ou se as notas no banco de dados estiverem colapsadas (iguais)
            const needsUpdate = !existing || existing.ci95Low === undefined || Math.abs(existing.mean - (existing.ci95Low || 0)) < 0.01;
            const probChanged = existing && Math.abs(existingProb - currentProb) > 0.05;

            if (probChanged || targetChanged || needsUpdate) {
                // SALVANDO SNAPSHOT COMPLETO: HOJE, FUTURO E INCERTEZA
                recordMonteCarloSnapshot(today, currentProb, { 
                    mean: Number(currentMean.toFixed(2)), 
                    projectedMean: Number(projectedMean.toFixed(2)),
                    ci95Low: Number(ci95Low.toFixed(2)),
                    ci95High: Number(ci95High.toFixed(2)),
                    target: currentTarget 
                });
            }
        }
    }, [
        simulationData?.status, simulationData?.data?.probability, effectiveSimulateToday, 
        recordMonteCarloSnapshot, timeIndex, timelineDates, currentMean, projectedMean, 
        debouncedTarget, activeId, ci95Low, ci95High, probability
    ]);
}
