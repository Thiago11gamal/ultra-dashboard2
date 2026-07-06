import { 
    computeCategoryStats, 
    computeBayesianLevel, 
    computeWeightedVariance, 
    calculateVolatility, 
    getAdaptiveInterSubjectCorrelation,
    computeHierarchicalAdjustment
} from './index.js';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
import { getDateKey, normalizeDate } from '../utils/dateHelper.js';
import { 
    getConfidenceMultiplier, 
    winsorizeSeries, 
    computeAdaptiveSignal 
} from '../utils/adaptiveMath.js';

export const VOLATILITY_REGULARIZATION_FACTOR = 0.35;
export const INFORMATIVE_PRIOR_MAX_STRENGTH = 5.0;
export const MAX_CALIBRATION_PENALTY = 0.15;
export const CALIBRATION_LAMBDA_DAYS = 30; // Meia-vida de decaimento (30 dias)

export const sanitizeWeightUnit = (value) => {
    const numeric = parseInt(value, 10);
    if (isNaN(numeric)) return 0;
    return Math.max(0, Math.min(999, numeric));
};

export const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

export function regularizeVolatility(dailySD, projectionDays, historyLength, domain) {
    const safeSD = Number.isFinite(dailySD) ? dailySD : 0;
    const informativeSD = VOLATILITY_REGULARIZATION_FACTOR * domain;
    const priorStrength = Math.max(1.0, INFORMATIVE_PRIOR_MAX_STRENGTH - Math.log2(historyLength + 1));
    const n = Math.max(1, historyLength);
    const regularizedVariance = (safeSD * safeSD * n + informativeSD * informativeSD * priorStrength) / (n + priorStrength);
    return Math.sqrt(regularizedVariance);
}

export function computeCalibrationPenalty(mcHistory, globalHistory, maxScore, summary = null) {
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
        if (snapshot.date === todayKey) return;

        const snapTime = normalizeDate(snapshot.date)?.getTime() || NaN;
        if (isNaN(snapTime)) return;
        
        const targetTime = snapshot.targetDate ? normalizeDate(snapshot.targetDate)?.getTime() : null;
        
        let actual = null;
        if (targetTime && !isNaN(targetTime)) {
            let minDiff = Infinity;
            globalHistory.forEach(h => {
                const hTime = normalizeDate(h.date)?.getTime() || NaN;
                if (hTime > snapTime) {
                    const diff = Math.abs(hTime - targetTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        actual = h;
                    }
                }
            });
        } else {
            actual = [...globalHistory].reverse().find(h => (normalizeDate(h.date)?.getTime() || NaN) > snapTime);
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
            const brierScore = (p - observed) ** 2;
            brierSum += brierScore * weight;
            brierWeightSum += weight;
        }
    });

    let calibrationPenalty = 0;
    if (brierWeightSum > 0 || residualWeightSum > 0) {
        const avgBrier = brierWeightSum > 0 ? brierSum / brierWeightSum : 0; 
        const avgResidual = residualWeightSum > 0 ? residualSum / residualWeightSum : 0;
        
        const rawBrierPenalty = Math.max(0, avgBrier - 0.18);
        const combinedPenalty = (rawBrierPenalty * 0.7) + (avgResidual * 0.3);
        calibrationPenalty = Math.min(MAX_CALIBRATION_PENALTY, combinedPenalty);
    }

    if (summary && summary.avgBrier > 0) {
        const summaryPenalty = Math.max(0, (summary.avgBrier - 0.18) * 0.8);
        calibrationPenalty = Math.max(calibrationPenalty, Math.min(MAX_CALIBRATION_PENALTY * 0.9, summaryPenalty));
    }
    
    return calibrationPenalty;
}

export function generateAnalyticsStats({
    categories,
    debouncedWeights,
    timeIndex,
    timelineDates,
    minScore,
    maxScore,
    simuladoRows = []
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
                const CONFIDENCE_CAP = 50;
                const cappedStrength = Math.min(strength, CONFIDENCE_CAP);
                const capFactor = cappedStrength / Math.max(1e-9, strength);
                const normAlpha = baye.alpha * capFactor;   
                const normBeta  = baye.beta  * capFactor;

                weightedBayesianAlpha += normAlpha * weight;
                weightedBayesianBeta += normBeta * weight;
                weightsByKey[weightKey] = weight;
                maxScoreByKey[weightKey] = catMaxScore;

                history.forEach(h => {
                    const currentScore = getSafeScore(h, catMaxScore);
                    
                    // RIGOR FIX: Proteção contra Corrupção de Dados e o "0s Bug".
                    // 1. Evita que um NaN vicie a média do dia e destrua o dia inteiro.
                    if (!Number.isFinite(currentScore)) return;
                    
                    // 2. Filtramos o infame "0s bug" originário do simulado timer
                    // para não desabar artificialmente a projeção do Monte Carlo.
                    const tTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
                    if (tTs !== null && tTs <= 0 && currentScore === 0) return;

                    const dk = getDateKey(getHistoryDate(h));
                    if (dk) {
                        if (!scoresByDate[dk]) scoresByDate[dk] = {};
                        const existing = scoresByDate[dk][weightKey];
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

    const sortedDates = Object.keys(scoresByDate).sort((a, b) => new Date(a) - new Date(b));
    const subjectNames = categoryStats.map(cat => cat.key || cat.name);
    
    const estimatedRho = getAdaptiveInterSubjectCorrelation(
      categoryStats.map(cat => ({ sd: cat.sd ?? cat.volatility, weight: cat.weight })), 
      simuladoRows, 
      subjectNames
    );

    const pooledVariance = computeWeightedVariance(categoryStats.map(cat => ({ sd: cat.sd ?? cat.volatility, weight: cat.weight })), totalWeight, estimatedRho);
    const pooledSD = totalWeight > 0 ? Math.sqrt(pooledVariance) : 0;

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
