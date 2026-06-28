import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { 
    computeCategoryStats, 
    computeBayesianLevel, 
    computeWeightedVariance, 
    calculateVolatility, 
    getAdaptiveInterSubjectCorrelation,
    computeHierarchicalAdjustment
} from '../engine';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo';
import { computeNonLinearTrend } from '../engine/projection';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { normalCDF_complement } from '../engine/math/gaussian';
import { 
    getConfidenceMultiplier, 
    winsorizeSeries, 
    computeAdaptiveSignal 
} from '../utils/adaptiveMath.js';
import { shrinkProbabilityToNeutral, recordPredictionEvent, backfillObservedFromSimulados, computeCalibrationSummary } from '../utils/calibration.js';
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
const BASE_SIMULATIONS = 5000;
const MAX_CALIBRATION_PENALTY = 0.15;
const CALIBRATION_LAMBDA_DAYS = 30; // Meia-vida de decaimento (30 dias)
// -------------------------------

const sanitizeWeightUnit = (value) => {
    const numeric = parseInt(value, 10);
    if (isNaN(numeric)) return 0;
    return Math.max(0, Math.min(999, numeric));
};

const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

function regularizeVolatility(dailySD, projectionDays, historyLength, domain) {
    const safeSD = Number.isFinite(dailySD) ? dailySD : 0;
    const informativeSD = VOLATILITY_REGULARIZATION_FACTOR * domain;
    const priorStrength = Math.max(1.0, INFORMATIVE_PRIOR_MAX_STRENGTH - Math.log2(historyLength + 1));
    const n = Math.max(1, historyLength);
    const regularizedVariance = (safeSD * safeSD * n + informativeSD * informativeSD * priorStrength) / (n + priorStrength);
    return Math.sqrt(regularizedVariance);
}

function computeCalibrationPenalty(mcHistory, globalHistory, maxScore, summary = null) {
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

    const todayKey = getDateKey(new Date());

    mcHistory.forEach(snapshot => {
        // BUG-185 FIX: Ignorar snapshots de "hoje" no cálculo da penalidade.
        // Isso evita o loop infinito onde a projeção de hoje afeta sua própria calibração, 
        // que por sua vez altera a projeção, disparando novo salvamento.
        if (snapshot.date === todayKey) return;

        const snapTime = new Date(snapshot.date).getTime();
        if (isNaN(snapTime)) return;
        
        // BUG-AUDIT-11 & CALIBRATION-HORIZON FIX: 
        // A validação (actual) não pode ser o dia seguinte. Tem de ser o score alcançado na data alvo (targetDate), 
        // ou a nota mais próxima do fim do horizonte de projeção disponível.
        const targetTime = snapshot.targetDate ? new Date(snapshot.targetDate).getTime() : null;
        
        let actual = null;
        if (targetTime && !isNaN(targetTime)) {
            // Busca a nota mais próxima do horizonte (targetDate) para validar a previsão de longo prazo
            let minDiff = Infinity;
            globalHistory.forEach(h => {
                const hTime = new Date(h.date).getTime();
                if (hTime > snapTime) {
                    const diff = Math.abs(hTime - targetTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        actual = h;
                    }
                }
            });
        } else {
            // Fallback: Se não há targetDate, usamos a nota mais RECENTE do histórico (último dado disponível)
            // em vez da primeira nota após o snapshot, para respeitar o conceito de horizonte de proficiência.
            actual = [...globalHistory].reverse().find(h => new Date(h.date).getTime() > snapTime);
        }

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
            // BUG C FIX: Brier Score (escala 0-1) coerente com baseline 0.18
            const brierScore = (p - observed) ** 2;
            brierSum += brierScore * weight;
            brierWeightSum += weight;
        }
    });

    let calibrationPenalty = 0;
    if (brierWeightSum > 0 || residualWeightSum > 0) {
        const avgBrier = brierWeightSum > 0 ? brierSum / brierWeightSum : 0; // 0.18 fallback produced 0 penalty anyway
        const avgResidual = residualWeightSum > 0 ? residualSum / residualWeightSum : 0;
        
        const rawBrierPenalty = Math.max(0, avgBrier - 0.18);
        const combinedPenalty = (rawBrierPenalty * 0.7) + (avgResidual * 0.3);
        calibrationPenalty = Math.min(MAX_CALIBRATION_PENALTY, combinedPenalty);
    }

    // NEW: Blend with live summary for better real-time calibration awareness
    if (summary && summary.avgBrier > 0) {
        const summaryPenalty = Math.max(0, (summary.avgBrier - 0.18) * 0.8);
        calibrationPenalty = Math.max(calibrationPenalty, Math.min(MAX_CALIBRATION_PENALTY * 0.9, summaryPenalty));
    }
    
    return calibrationPenalty;
}

function generateAnalyticsStats({
    categories,
    debouncedWeights,
    timeIndex,
    timelineDates,
    minScore,
    maxScore,
    simuladoRows: rawSimuladoRows = []
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
                    const dateString = getDateKey(getHistoryDate(h));
                    if (!dateString) return false;
                    return dateString <= cutoffDate;
                })
                .map(h => ({ h, t: normalizeDate(getHistoryDate(h))?.getTime() ?? 0 }))
                .sort((a, b) => a.t - b.t)
                .map(item => item.h);

            if (history.length === 0) return;

            const weightKey = cat.id || cat.name;
            const weight = sanitizeWeightUnit(debouncedWeights[weightKey] ?? 0);

            const baye = computeBayesianLevel(history, 1, 1, catMaxScore);
            const stats = computeCategoryStats(history, weight, 60, catMaxScore);
            const vol = calculateVolatility(history, catMaxScore);

            if (stats && weight > 0) {
                totalWeight += weight;
                const strength = baye.alpha + baye.beta;
                // Teto de 50 para evitar que uma matéria com 1000 simulados domine o pool,
                // mas mantém a diferença entre 5 e 50 simulados (informação relevante)
                const CONFIDENCE_CAP = 50;
                const cappedStrength = Math.min(strength, CONFIDENCE_CAP);
                const capFactor = cappedStrength / Math.max(1e-9, strength);
                const normAlpha = baye.alpha * capFactor;   // proporcional à certeza real
                const normBeta  = baye.beta  * capFactor;

                weightedBayesianAlpha += normAlpha * weight;
                weightedBayesianBeta += normBeta * weight;
                weightsByKey[weightKey] = weight;
                maxScoreByKey[weightKey] = catMaxScore;

                history.forEach(h => {
                    const dk = getDateKey(getHistoryDate(h));
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

                categoryStats.push({ key: weightKey, name: cat.name, ...stats, maxScore: catMaxScore, bayesianMean: baye.mean, bayesianSd: baye.sd, volatility: vol, weight, minCutoff: Number(cat.minCutoff) || 0 });
                bayesianStats.push({ sd: baye.sd, weight, n: history.length });
            }
        }
    });

    if (categoryStats.length === 0 || totalWeight === 0) return null;

    // BUG-FIX: Compute pooledSD BEFORE calling computeHierarchicalAdjustment so it can be
    // passed as the second argument. Previously pooledSD was declared after the call, causing
    // the function to fall back to localSD=15 for every category (ignoring actual variance).
    const sortedDates = Object.keys(scoresByDate).sort((a, b) => new Date(a) - new Date(b));
    const subjectNames = categoryStats.map(cat => cat.key || cat.name);
    // NEW: Prefer full adaptive estimator (with blending)
    const estimatedRho = getAdaptiveInterSubjectCorrelation(
      categoryStats.map(cat => ({ sd: cat.sd ?? cat.volatility, weight: cat.weight })), 
      rawSimuladoRows, 
      subjectNames
    );

    const pooledVariance = computeWeightedVariance(categoryStats.map(cat => ({ sd: cat.sd ?? cat.volatility, weight: cat.weight })), totalWeight, estimatedRho);
    const pooledSD = totalWeight > 0 ? Math.sqrt(pooledVariance) : 0;

    // APLICAR MODELO HIERÁRQUICO BAYESIANO (Feature 6)
    // BUG-FIX: Pass pooledSD as second argument. Without it, the function falls back
    // to localSD=15 for every category, completely ignoring the actual pooled variance.
    categoryStats = computeHierarchicalAdjustment(categoryStats, pooledSD);

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

    const adaptiveSignal = computeAdaptiveSignal(rawGlobalHistory);
    const confidenceMultiplier = getConfidenceMultiplier(adaptiveSignal.effectiveN) * adaptiveSignal.ciInflation;
    const weightedLow = Math.max(minScore, bayesianMean - confidenceMultiplier * pooledBayesianSD);
    // BUG-AUDIT-01 FIX: Era Math.max → sempre retornava maxScore, destruindo o CI superior.
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

    const hLen = globalHistory.length;
    const firstScore = hLen > 0 ? globalHistory[0].score.toFixed(4) : '0';
    const lastScore = hLen > 0 ? globalHistory[hLen - 1].score.toFixed(4) : '0';
    const scoreFingerprint = `${hLen}-${firstScore}-${lastScore}`;
    const cutoffs = categoryStats.map(c => c.minCutoff || 0).join('-');
    const statsHash = `${bayesianMean.toFixed(4)}-${pooledSD.toFixed(4)}-${minScore}-${maxScore}-${scoreFingerprint}-cutoffs[${cutoffs}]`;

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

const EMPTY_ARRAY = [];

export function useMonteCarloStats({ categories, goalDate, targetScore, timeIndex, timelineDates, minScore, maxScore, effectiveSimulateToday, simuladoRows: propSimuladoRows }) {
    const activeId = useAppStore(state => state.appState?.activeId);
    const weights = useAppStore(state => state.appState?.contests?.[activeId]?.mcWeights || {});
    const equalWeightsMode = useAppStore(state => state.appState.mcEqualWeights ?? true);
    const mcHistory = useAppStore(state => state.appState?.contests?.[activeId]?.monteCarloHistory || EMPTY_ARRAY);
    const historicalCutoffs = useAppStore(state => {
        const arr = state.appState?.contests?.[activeId]?.historicalCutoffs;
        return Array.isArray(arr) ? arr : EMPTY_ARRAY;
    });
    
    const contest = useAppStore(state => state.appState?.contests?.[activeId]);
    const rawSimuladoRows = useMemo(() => {
        if (propSimuladoRows) return propSimuladoRows;
        return (contest?.simuladoRows) || [];
    }, [propSimuladoRows, contest?.simuladoRows]);
    
    // NEW: Compute live calibration summary early (before other memos that depend on it)
    const calibrationSummary = useMemo(() => {
        const events = (contest && contest.calibrationEvents) || [];
        if (events.length < 3) return null;
        try {
            return computeCalibrationSummary(events, { bins: 6 });
        } catch {
            return null;
        }
    }, [contest]);

    // NEW: Simple model health score (0-1) based on summary + trend
    const modelHealth = useMemo(() => {
        if (!calibrationSummary) return 0.5;
        const brierHealth = Math.max(0, Math.min(1, 1 - (calibrationSummary.avgBrier - 0.12) / 0.2));
        const trendHealth = calibrationSummary.trend === 'improving' ? 0.2 : (calibrationSummary.trend === 'degrading' ? -0.2 : 0);
        return Math.max(0.1, Math.min(1, (brierHealth + 0.5 + trendHealth) / 1.5));
    }, [calibrationSummary]);

    // NEW: Compute blend weight for non-linear / conformal based on calib quality
    const modelWeight = useMemo(() => {
        if (!calibrationSummary || !calibrationSummary.avgBrier) return 0.25;
        const brier = Math.max(0.12, Math.min(0.3, calibrationSummary.avgBrier));
        return Math.max(0.1, Math.min(0.45, 0.25 + (0.18 - brier) * 2.5));
    }, [calibrationSummary]);

    // NEW: Dynamic sim count based on calibration quality (worse = more sims for stability)
    const dynamicSimulations = useMemo(() => {
        let sims = BASE_SIMULATIONS;
        if (calibrationSummary && calibrationSummary.avgBrier > 0.2) {
            sims = Math.min(15000, BASE_SIMULATIONS + Math.floor((calibrationSummary.avgBrier - 0.18) * 20000));
        }
        // High health can reduce sims a bit for speed, low health increases
        if (modelHealth > 0.8) {
            sims = Math.max(2000, Math.floor(sims * 0.8));
        } else if (modelHealth < 0.4) {
            sims = Math.min(20000, Math.floor(sims * 1.3));
        }
        return sims;
    }, [calibrationSummary, modelHealth]);
    
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
            goal = normalizeDate(goalDate);
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
            maxScore,
            simuladoRows: rawSimuladoRows
        });
    }, [categories, debouncedWeights, timeIndex, timelineDates, minScore, maxScore, rawSimuladoRows]);

    const calibrationPenalty = useMemo(() => {
        let pen = computeCalibrationPenalty(mcHistory, pureStatsData?.globalHistory, maxScore, calibrationSummary);
        // Use modelHealth to scale penalty: low health increases penalty (more conservative)
        if (modelHealth < 0.6) {
            pen = Math.min(MAX_CALIBRATION_PENALTY, pen * (1 + (0.6 - modelHealth)));
        }
        return pen;
    }, [mcHistory, pureStatsData?.globalHistory, maxScore, calibrationSummary, modelHealth]);

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

    // C3 FIX: Ref que sempre aponta para o pureStatsData mais recente.
    // Isso permite que o useEffect abaixo leia os dados sem precisar declará-los
    // como dependência — quem controla QUANDO o effect roda é apenas pureStatsHash.
    const pureStatsDataRef = useRef(pureStatsData);
    useEffect(() => { pureStatsDataRef.current = pureStatsData; }, [pureStatsData]);

    const { runAnalysis } = useMonteCarloWorker();
    const [simulationData, setSimulationData] = useState({ status: 'waiting', missing: 'data' });

    const [isFlashing, setIsFlashing] = useState(false);

    // NEW: Backfill observed from actual simulados into calibration events (walk-forward calibration)
    useEffect(() => {
        if (!rawSimuladoRows || rawSimuladoRows.length === 0) return;
        try {
            const events = (contest && contest.calibrationEvents) || [];
            if (events.length === 0) return;
            const backfilled = backfillObservedFromSimulados(events, rawSimuladoRows, statsData?.categoryStats || [], maxScore);
            const changed = JSON.stringify(backfilled.slice(-3)) !== JSON.stringify(events.slice(-3));
            if (changed) {
                const setD = useAppStore.getState().setData;
                if (setD) setD(c => ({...c, calibrationEvents: backfilled}));
            }
        } catch { /* ignore */ }
    }, [rawSimuladoRows, maxScore, contest, statsData?.categoryStats]);

    // Motor roda Cego/Puro para prevenir Feedback Loops (usa pureStatsDataRef)
    useEffect(() => {
        const pureStatsData = pureStatsDataRef.current;
        if (!pureStatsData) return;
 
        let totalPoints = 0;
        pureStatsData.categoryStats.forEach(cat => totalPoints += cat.n || 1);
        if (totalPoints < 1) return;
 
        let cancelled = false;
        const isFuture = projectDays > 0;
 
        // Mecanismo de Throttling/Debouncing (150ms) para proteger contra re-execuções excessivas em tempo real
        const doAnalysis = async () => {
            try {
                let result;
                if (isFuture && pureStatsData.globalHistory?.length > 0) {
                    const domain = maxScore - minScore;
                    const regularizedSD = regularizeVolatility(pureStatsData.dailySD, projectDays, pureStatsData.globalHistory.length, domain);
 
                    const subjectsOpts = pureStatsData.categoryStats.map(c => ({
                        mean: c.bayesianMean ?? c.mean,
                        sd: c.volatility ?? c.sd,
                        minCutoff: c.minCutoff || 0,
                        maxScore: c.maxScore || maxScore,
                        minScore: minScore
                    }));

                    result = await runAnalysis({
                        values: pureStatsData.globalHistory.map(h => h.score),
                        dates: pureStatsData.globalHistory.map(h => h.date),
                        meta: debouncedTarget,
                        simulations: dynamicSimulations,
                        projectionDays: projectDays,
                        forcedVolatility: regularizedSD,
                        forcedBaseline: pureStatsData.bayesianMean,
                        currentMean: pureStatsData.bayesianMean,
                        minScore,
                        maxScore,
                        subjects: subjectsOpts,
                    });
                } else {
                    const subjectsOpts = pureStatsData.categoryStats.map(c => ({
                        mean: c.bayesianMean ?? c.mean,
                        sd: c.bayesianSd ?? c.sd,
                        minCutoff: c.minCutoff || 0,
                        maxScore: c.maxScore || maxScore,
                        minScore: minScore
                    }));

                    result = await runAnalysis(pureStatsData.bayesianMean, pureStatsData.pooledSD, debouncedTarget, {
                        simulations: dynamicSimulations,
                        currentMean: pureStatsData.bayesianMean,
                        bayesianCI: pureStatsData.bayesianCI,
                        minScore,
                        maxScore,
                        subjects: subjectsOpts,
                    });
                }
 
                if (!cancelled) {
                    if (result) {
                        result.diagnostics = {
                            ...(result.diagnostics || {}),
                            trendType: result.trendType || 'linear',
                            rhoUsed: statsData?.estimatedRho
                        };
                        // NEW: If log-time trend available and improving, blend into projected for global
                        // using modelWeight (better calib = higher non-linear influence)
                        if (result.trendType === 'log_time_available' && result.projectedMean > result.currentMean) {
                            const blend = modelWeight;
                            result.projectedMean = result.projectedMean * (1 - blend) + (result.projectedMean * 1.1) * blend;
                        }
                    }
                    setSimulationData({ status: 'ready', data: result });
                    setIsFlashing(true);

                    // NEW: Record MC prediction for continuous calibration / walk-forward analysis
                    try {
                        const setDataFn = useAppStore.getState().setData;
                        if (setDataFn && result?.probability != null) {
                            const ev = recordPredictionEvent(null, {
                                timestamp: Date.now(),
                                probability: Number(result.probability) / 100,
                                targetScore: debouncedTarget,
                                sims: result.simulationCount,
                                effectiveN: result.diagnostics?.effectiveN,
                                category: 'global'
                            });
                            if (ev) {
                                setDataFn(contest => {
                                    const evs = Array.isArray(contest.calibrationEvents) ? contest.calibrationEvents.slice() : [];
                                    evs.push(ev);
                                    return { ...contest, calibrationEvents: evs.slice(-200) };
                                });
                            }
                        }
                    } catch { /* best effort, non blocking */ }
                }
            } catch (err) {
                console.warn('[MC Worker] Simulation failed, using sync fallback:', err);
                if (!cancelled) {
                    let result;
                    const domain = maxScore - minScore;
                    const regularizedSD = isFuture && pureStatsData.globalHistory?.length > 0
                        ? regularizeVolatility(pureStatsData.dailySD, projectDays, pureStatsData.globalHistory.length, domain)
                        : pureStatsData.dailySD;

                    if (isFuture && pureStatsData.globalHistory?.length > 0) {
                        const subjectsOpts = pureStatsData.categoryStats.map(c => ({
                            mean: c.bayesianMean ?? c.mean,
                            sd: c.volatility ?? c.sd,
                            minCutoff: c.minCutoff || 0,
                            maxScore: c.maxScore || maxScore,
                            minScore: minScore
                        }));

                        result = runMonteCarloAnalysis({
                            values: pureStatsData.globalHistory.map(h => h.score),
                            dates: pureStatsData.globalHistory.map(h => h.date),
                            meta: debouncedTarget,
                            simulations: Math.min(dynamicSimulations, 2000),
                            projectionDays: projectDays,
                            forcedVolatility: regularizedSD,
                            forcedBaseline: pureStatsData.bayesianMean,
                            currentMean: pureStatsData.bayesianMean,
                            minScore,
                            maxScore,
                            subjects: subjectsOpts,
                            // Pass for adaptive rho
                            simuladoRows: rawSimuladoRows,
                            categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key)
                        });
                    } else {
                        const subjectsOpts = pureStatsData.categoryStats.map(c => ({
                            mean: c.bayesianMean ?? c.mean,
                            sd: c.bayesianSd ?? c.sd,
                            minCutoff: c.minCutoff || 0,
                            maxScore: c.maxScore || maxScore,
                            minScore: minScore
                        }));

                        result = runMonteCarloAnalysis(pureStatsData.bayesianMean, pureStatsData.pooledSD, debouncedTarget, {
                            simulations: Math.min(dynamicSimulations, 2000),
                            currentMean: pureStatsData.bayesianMean,
                            bayesianCI: pureStatsData.bayesianCI,
                            historicalCutoffs: historicalCutoffs,
                            subjects: subjectsOpts,
                            minScore,
                            maxScore,
                            // For adaptive correlation
                            simuladoRows: rawSimuladoRows,
                            categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key)
                        });
                    }
                    if (result) {
                        result.diagnostics = {
                            ...(result.diagnostics || {}),
                            trendType: result.trendType || 'linear',
                            rhoUsed: statsData?.estimatedRho
                        };
                        if (result.trendType === 'log_time_available' && result.projectedMean > result.currentMean) {
                            const blend = modelWeight;
                            result.projectedMean = result.projectedMean * (1 - blend) + (result.projectedMean * 1.1) * blend;
                        }
                    }
                    setSimulationData({ status: 'ready', data: result });
                    setIsFlashing(true);

                    // Record fallback too
                    try {
                        const setDataFn2 = useAppStore.getState().setData;
                        if (setDataFn2 && result?.probability != null) {
                            const ev2 = recordPredictionEvent(null, {
                                timestamp: Date.now(),
                                probability: Number(result.probability) / 100,
                                targetScore: debouncedTarget,
                                sims: result.simulationCount
                            });
                            if (ev2) {
                                setDataFn2(contest => {
                                    const evs2 = Array.isArray(contest.calibrationEvents) ? [...contest.calibrationEvents] : [];
                                    evs2.push(ev2);
                                    return { ...contest, calibrationEvents: evs2.slice(-200) };
                                });
                            }
                        }
                    } catch { /* ignore */ }
                }
            }
        };
 
        const timerId = setTimeout(doAnalysis, 150);
        return () => {
            cancelled = true;
            clearTimeout(timerId);
        };
    }, [pureStatsHash, runAnalysis, debouncedTarget, projectDays, minScore, maxScore, historicalCutoffs, dynamicSimulations, modelWeight, rawSimuladoRows, statsData?.estimatedRho]);
 
    const probabilityData = useMemo(() => {
        const rawProbability = simulationData?.data?.probability ?? 0;
        const neutralValuePct = (Number.isFinite(pureStatsData?.bayesianMean) && maxScore > 0)
            ? (pureStatsData.bayesianMean / maxScore) * 100
            : 50;
        let adjustedProb = shrinkProbabilityToNeutral(rawProbability, calibrationPenalty, neutralValuePct, 0.5);

        // Continue sequence: if conformal available, blend a conservative adjustment
        // using modelWeight (better calib = less conservative, more trust in raw)
        let confFactor = 0;
        if (simulationData?.data?.ciConformalLow != null && simulationData?.data?.ciConformalHigh != null) {
            const confWidth = simulationData.data.ciConformalHigh - simulationData.data.ciConformalLow;
            if (confWidth > 0) {
                confFactor = Math.min(0.2, confWidth / (maxScore * 1.2)) * (1 - modelWeight);
                const currentProb = Number(adjustedProb);
                if (currentProb > 50) {
                    adjustedProb = currentProb * (1 - confFactor) + 50 * confFactor;
                }
            }
        }
        // High modelHealth means trust the raw more, less shrinkage
        let finalProb = adjustedProb;
        if (modelHealth > 0.7) {
            const trust = (modelHealth - 0.7) / 0.3;
            finalProb = finalProb * (1 - trust * 0.5) + (rawProbability * (1 - calibrationPenalty * 0.5)) * (trust * 0.5);
        }
        let healthProb = finalProb;
        // Best: further modulate with modelHealth for overall trust
        if (modelHealth < 0.5) {
            const healthFactor = (0.5 - modelHealth) / 0.5;
            healthProb = healthProb * (1 - healthFactor * 0.3) + 50 * (healthFactor * 0.3);
        }
        // NEW: compute a health-adjusted probability that factors modelHealth into the final output
        const healthAdjustedProb = Math.max(0, Math.min(100, 
            healthProb * modelHealth + (50 * (1 - modelHealth))
        ));
        const prob = healthProb;
        
        const rawProjectedMean = simulationData?.data?.projectedMean ?? simulationData?.data?.mean ?? 0;
        const pMean = Math.max(minScore, Math.min(maxScore, rawProjectedMean));
        
        const cMean = Number.isFinite(Number(pureStatsData?.bayesianMean)) 
            ? Number(pureStatsData.bayesianMean) 
            : (simulationData?.data?.currentMean ?? pMean);

        return { probability: prob, projectedMean: pMean, currentMean: cMean, healthAdjustedProb };
    }, [simulationData?.data, pureStatsData, maxScore, minScore, calibrationPenalty, modelHealth, modelWeight]);

    const probabilityDataResult = probabilityData;
    const probability = probabilityDataResult.probability;
    const projectedMean = probabilityDataResult.projectedMean;
    const currentMean = probabilityDataResult.currentMean;
    const healthAdjustedProb = probabilityDataResult.healthAdjustedProb ?? Math.max(0, Math.min(100, 
        (probabilityDataResult.probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5)))
    ));

    const effectiveSimulationData = useMemo(() => {
        if (!statsData) return { status: 'waiting', missing: 'data' };
        let totalPoints = 0;
        statsData.categoryStats.forEach(cat => { totalPoints += cat.n || 1; });
        if (totalPoints < 1) return { status: 'waiting', missing: 'count', count: totalPoints };
        const base = simulationData;
        if (base?.status === 'ready' && base.data) {
            return {
                ...base,
                data: {
                    ...base.data,
                    calibrationSummary,
                    diagnostics: { ...(base.data.diagnostics || {}), calibrationSummary, modelHealth, modelWeight },
                    healthAdjustedProb: base.data.healthAdjustedProb || Math.max(0, Math.min(100, 
                        (base.data.probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5)))
                    ))
                }
            };
        }
        return base;
    }, [statsData, simulationData, calibrationSummary, modelHealth, modelWeight]);

    const perSubjectProbs = useMemo(() => {
        if (!statsData?.categoryStats?.length || simulationData?.status !== 'ready') return [];

        return statsData.categoryStats
            .filter(cat => cat.weight > 0)
            .map(cat => {
                const catMaxScore = Number(cat.maxScore) || maxScore;
                const currentBaseline = cat.bayesianMean ?? cat.mean;
                // trendValue = slope × 30 → pontos em 30 dias; converter para pontos/dia antes de projetar
                const trendPer30Days = cat.trendValue || cat.trend || 0;
                const projectedDaysAmortized = LOG_DAMPING_FACTOR * Math.log(1 + projectDays / LOG_DAMPING_FACTOR);
                const dailyTrend = trendPer30Days / 30;
                let totalTrendProjection = dailyTrend * projectedDaysAmortized;

                // FIX: use simuladoStats.history (or fallback) - cat.history was never attached to categoryStats
                try {
                    const simHistory = cat.simuladoStats?.history || cat.history || [];
                    if (Array.isArray(simHistory) && simHistory.length >= 4) {
                        const nl = computeNonLinearTrend(simHistory, catMaxScore);
                        if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
                            const nlWeight = modelWeight;
                            const nlProjection = nl.slope * (projectedDaysAmortized / 30);
                            totalTrendProjection = totalTrendProjection * (1 - nlWeight) + nlProjection * nlWeight;
                        }
                    }
                } catch { /* ignore */ }

                const catMinScore = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : minScore;

                const baseline = (!effectiveSimulateToday && projectDays > 0)
                    ? Math.max(catMinScore, Math.min(catMaxScore, currentBaseline + totalTrendProjection))
                    : currentBaseline;

                const result = simulateNormalDistribution({
                    mean: baseline,
                    sd: cat.bayesianSd ?? cat.sd,
                    targetScore: (maxScore > 0 ? (debouncedTarget / maxScore) * catMaxScore : debouncedTarget),
                    simulations: Math.min(dynamicSimulations || 2000, 3000),
                    categoryName: cat.name,
                    minScore: catMinScore,
                    maxScore: catMaxScore,
                    // Adaptive context
                    simuladoRows: rawSimuladoRows,
                    subjects: [{ name: cat.name }]
                });

                const subjDiag = {
                    ...(result.diagnostics || {}),
                    trendType: result.trendType || 'linear',
                    calibrationSummary, // attach global summary for per-subject context
                    modelHealth,
                    modelWeight
                };

                let subjProb = result.probability;
                if (result.ciConformalLow != null && result.ciConformalHigh != null) {
                    const subjConfWidth = result.ciConformalHigh - result.ciConformalLow;
                    if (subjConfWidth > 0) {
                        let subjConfFactor = Math.min(0.15, subjConfWidth / (catMaxScore * 1.5)) * (1 - modelWeight);
                        if (modelHealth < 0.6) {
                            subjConfFactor = Math.min(0.25, subjConfFactor * 1.4);
                        }
                        if (subjProb > 50) {
                            subjProb = subjProb * (1 - subjConfFactor) + 50 * subjConfFactor;
                        }
                    }
                }
                // High modelHealth for subject: trust raw prob more
                if (modelHealth > 0.7) {
                    const trust = (modelHealth - 0.7) / 0.3;
                    subjProb = subjProb * (1 - trust * 0.4) + result.probability * (trust * 0.4);
                }
                return { 
                    name: cat.name, 
                    prob: subjProb, 
                    mean: baseline, 
                    trend: cat.trend,
                    diagnostics: subjDiag,
                    ciConformalLow: result.ciConformalLow,
                    ciConformalHigh: result.ciConformalHigh,
                    // prefer conformal if available for this subject
                    ciLow: result.ciConformalLow ?? result.ci95Low,
                    ciHigh: result.ciConformalHigh ?? result.ci95High,
                    modelHealth,
                    modelWeight,
                    healthAdjustedProb: Math.max(0, Math.min(100, 
                        subjProb * modelHealth + (50 * (1 - modelHealth))
                    ))
                };
            })
            .sort((a, b) => a.prob - b.prob);
    }, [statsData, debouncedTarget, simulationData?.status, maxScore, effectiveSimulateToday, projectDays, minScore, modelHealth, modelWeight, rawSimuladoRows, calibrationSummary, dynamicSimulations]);

    // NEW: Record per-subject predictions for finer-grained calibration data
    useEffect(() => {
        if (!perSubjectProbs || perSubjectProbs.length === 0 || simulationData?.status !== 'ready') return;
        try {
            const setDataFn = useAppStore.getState().setData;
            if (!setDataFn) return;
            perSubjectProbs.forEach(subj => {
                if (subj.prob == null) return;
                const ev = recordPredictionEvent(null, {
                    timestamp: Date.now(),
                    probability: Number(subj.prob) / 100,
                    targetScore: debouncedTarget,
                    sims: 500,
                    category: subj.name || 'subject',
                    effectiveN: subj.diagnostics?.effectiveN
                });
                if (ev) {
                    setDataFn(contest => {
                        const evs = Array.isArray(contest.calibrationEvents) ? [...contest.calibrationEvents] : [];
                        evs.push(ev);
                        return { ...contest, calibrationEvents: evs.slice(-200) };
                    });
                }
            });
        } catch { /* ignore */ }
    }, [perSubjectProbs, debouncedTarget, simulationData?.status]);

    useEffect(() => {
        if (isFlashing) {
            const timer = setTimeout(() => setIsFlashing(false), 800);
            return () => clearTimeout(timer);
        }
    }, [isFlashing]);

    const derivedMetrics = useMemo(() => {
        let sd = simulationData?.data?.sd ?? 0;
        let sdLeft = simulationData?.data?.sdLeft ?? sd;
        let sdRight = simulationData?.data?.sdRight ?? sd;
        // Prefer conformal CIs when available for more robust intervals
        let ci95Low = simulationData?.data?.ciConformalLow ?? simulationData?.data?.ci95Low ?? 0;
        let ci95High = simulationData?.data?.ciConformalHigh ?? simulationData?.data?.ci95High ?? 0;

        // NEW: also use conformal for the base before expansion if present
        if (simulationData?.data?.ciConformalLow != null) {
            ci95Low = simulationData.data.ciConformalLow;
            ci95High = simulationData.data.ciConformalHigh;
        }

        // Continue: use effective drift slope if provided by engine for better transparency in drift
        const effectiveDrift = simulationData?.data?.diagnostics?.effectiveDriftSlope ?? (simulationData?.data?.drift / 30 || 0);

        // Apply Calibration Expansion visually
        if (calibrationPenalty > 0) {
            const ciMid = (ci95Low + ci95High) / 2;
            const ciExpand = 1 + (calibrationPenalty * 2.5);
            ci95Low = Math.max(minScore, ciMid - ((ciMid - ci95Low) * ciExpand));
            ci95High = Math.min(maxScore, ciMid + ((ci95High - ciMid) * ciExpand));
            sd = sd * (1 + calibrationPenalty * 2.5);
            sdLeft = sdLeft * (1 + calibrationPenalty * 2.5);
            sdRight = sdRight * (1 + calibrationPenalty * 2.5);
        }

        const domainWidth = maxScore - minScore;
        const icWidth = ci95High - ci95Low;
        const saturation = Math.min(1, domainWidth > 0 ? icWidth / domainWidth : 1);
        const projectionConfidence = Math.max(0, 1 - Math.pow(saturation, 1.5));
        
        // BUG FIX: O probability já foi retraído pela penalidade de calibração em shrinkProbabilityToNeutral.
        // Fazer outro blend com pBaseline com base na saturação do IC é duplo encolhimento,
        // o que subestima brutalmente as chances reais do candidato em cenários voláteis.
        const pAdjusted = probability;
        const safeSdForTrend = Number.isFinite(sd) && sd > 0 ? sd : 1;
        const pTrend = normalCDF_complement((debouncedTarget - projectedMean) / safeSdForTrend) * 100;

        // Historico para tamanho da amostra
        const nHistory = Array.isArray(statsData?.globalHistory) ? statsData.globalHistory.length : (timelineDates?.length || 0);

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
            probability: pAdjusted,
            confidenceTier: confidenceObj.label, 
            confidenceColor: confidenceObj.tier === 'HIGH' ? 'text-emerald-400' : confidenceObj.tier === 'MEDIUM' ? 'text-amber-400' : 'text-rose-400',
            confidenceObj,
            explanations,
            humanVol,
            driftAlerts,
            // NEW: conformal CIs for consumers
            ciConformalLow: simulationData?.data?.ciConformalLow,
            ciConformalHigh: simulationData?.data?.ciConformalHigh,
            // NEW: trend and summary
            trendType: simulationData?.data?.trendType || 'linear',
            calibrationSummary,
            effectiveDrift,
            modelHealth,
            modelWeight
        };
    }, [simulationData?.data, maxScore, minScore, debouncedTarget, projectedMean, calibrationPenalty, currentMean, statsData, timelineDates, probability, calibrationSummary, modelHealth, modelWeight]);

    // 🎯 RIGOR FIX: Gravação delegada para garantir que todos os dados derivados (CIs) estejam prontos
    useMonteCarloHistoryRecorder({
        activeId,
        simulationData,
        timeIndex,
        timelineDates,
        effectiveSimulateToday,
        projectDays,
        goalDate,
        debouncedTarget,
        currentMean,
        projectedMean,
        pAdjusted: derivedMetrics.pAdjusted,
        ci95Low: derivedMetrics.ci95Low,
        ci95High: derivedMetrics.ci95High,
        calibrationSummary: derivedMetrics.calibrationSummary,
        trendType: derivedMetrics.trendType,
        effectiveDrift: derivedMetrics.effectiveDrift,
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
        healthAdjustedProb: healthAdjustedProb ?? Math.max(0, Math.min(100, 
            (probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5)))
        )), // NEW: probability modulated by modelHealth
        ...derivedMetrics, // Calibrated CIs & confidenceTier (now with conformal preference + trendType + summary)
        equalWeightsMode,
        setEqualWeightsMode,
        calibrationPenalty, // Expose penalty for potential UI badges (influenced by live summary)
        calibrationSummary, // NEW: Brier/ECE/trend from backfilled events
        trendType: derivedMetrics.trendType || 'linear',
        effectiveDrift: derivedMetrics.effectiveDrift,
        modelHealth: derivedMetrics.modelHealth,
        modelWeight: derivedMetrics.modelWeight
    };
}

// 🎯 EFFECT: Persistência de Histórico de Projeção (Snapshots)
function useMonteCarloHistoryRecorder({ 
    activeId, simulationData, timeIndex, timelineDates, effectiveSimulateToday, projectDays, goalDate,
    debouncedTarget, currentMean, projectedMean, pAdjusted, ci95Low, ci95High,
    calibrationSummary, trendType, effectiveDrift, modelHealth, modelWeight,
    recordMonteCarloSnapshot 
}) {
    const lastRecordTime = useRef(0);

    useEffect(() => {
        const prob = Number.isFinite(pAdjusted) ? pAdjusted : 0;
        const isTimeTraveling = timeIndex >= 0 && timeIndex < timelineDates.length - 1;

        if (simulationData?.status === 'ready' && Number.isFinite(prob) && prob > 0 && !effectiveSimulateToday && !isTimeTraveling && activeId) {
            const doRecord = () => {
                const today = getDateKey(new Date());
                const currentProb = Number(prob.toFixed(1)); 
                const history = useAppStore.getState().appState?.contests?.[activeId]?.monteCarloHistory || [];
                const existing = Array.isArray(history) ? history.find(h => h.date === today) : null;
                const currentTarget = Number(debouncedTarget.toFixed(1));
                
                const existingProb = Number((existing?.probability ?? existing?.prob ?? 0).toFixed(1));
                const existingTarget = Number((existing?.target ?? 0).toFixed(1));

                const targetChanged = !existing || Math.abs(existingTarget - currentTarget) > 0.05;
                const isCICollapsed = existing && Number.isFinite(existing.mean) && Number.isFinite(existing.ci95Low) ? Math.abs(existing.mean - existing.ci95Low) < 0.01 : false;
                const needsUpdate = !existing || existing.ci95Low === undefined || (isCICollapsed && projectDays > 0);
                const probChanged = existing && Math.abs(existingProb - currentProb) > 0.3;

                if (probChanged || targetChanged || needsUpdate) {
                    lastRecordTime.current = Date.now();
                    recordMonteCarloSnapshot(today, prob, { 
                        mean: Number(currentMean.toFixed(2)), 
                        projectedMean: Number(projectedMean.toFixed(2)),
                        ci95Low: Number(ci95Low.toFixed(2)),
                        ci95High: Number(ci95High.toFixed(2)),
                        target: Number(debouncedTarget.toFixed(2)),
                        targetDate: goalDate,
                        trendType: trendType || 'linear',
                        effectiveDrift: Number((effectiveDrift || 0).toFixed(4)),
                        calibrationBrier: calibrationSummary ? Number(calibrationSummary.avgBrier || 0).toFixed(4) : null,
                        modelHealth: Number((modelHealth || 0.5).toFixed(3)),
                        modelWeight: Number((modelWeight || 0.25).toFixed(3))
                    });
                }
            };

            const now = Date.now();
            const timeSinceLast = now - lastRecordTime.current;
            
            if (timeSinceLast < 5000) {
                const timerId = setTimeout(doRecord, 5000 - timeSinceLast);
                return () => clearTimeout(timerId);
            } else {
                doRecord();
            }
        }
    }, [
        simulationData?.status, effectiveSimulateToday, 
        recordMonteCarloSnapshot, timeIndex, timelineDates, currentMean, projectedMean, 
        debouncedTarget, activeId, ci95Low, ci95High, pAdjusted,
        goalDate, projectDays, calibrationSummary, effectiveDrift, modelHealth, modelWeight, trendType
    ]);
}
