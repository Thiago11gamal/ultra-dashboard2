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

// FIX: piso mínimo de incerteza — nunca afirmar volatilidade próxima de zero
export const VOLATILITY_FLOOR_PCT = 0.03;

// FIX: amostra efetiva mínima (soma dos pesos de decaimento) antes de
// aplicar penalidade de calibração. Evita punir o modelo com 1-2 eventos ruidosos.
export const CALIBRATION_MIN_EFFECTIVE_SAMPLES = 5.0;

const clamp = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
};

// T-011 FIX: clamp defensivo de acertos.
// Impede que correct > total gere accuracy/projeção acima de 100%.
const clampCorrectToTotal = (correct, total) => {
    const t = Number(total);
    if (!Number.isFinite(t) || t <= 0) return 0;

    const c = Number(correct);
    if (!Number.isFinite(c)) return 0;

    return Math.max(0, Math.min(t, c));
};

// FIX: parseInt truncava pesos decimais ("2.5" -> 2).
// Agora aceita decimais e arredonda de forma previsível.
export const sanitizeWeightUnit = (value) => {
    let numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        numeric = parseInt(value, 10);
    }

    if (Number.isNaN(numeric)) return 0;

    return Math.max(0, Math.min(999, numeric));
};

export const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

export function regularizeVolatility(dailySD, projectionDays, historyLength, domain) {
    const safeSD = Number.isFinite(dailySD) ? Math.max(0, dailySD) : 0;
    const safeDomain = Number.isFinite(domain) && domain > 0 ? domain : 100;

    const informativeSD = VOLATILITY_REGULARIZATION_FACTOR * safeDomain;

    // FIX: horizontes de projeção mais longos exigem mais incerteza epistêmica.
    // O prior informativo cresce suavemente com os dias projetados (fator máx. 2x).
    const horizonFactor = Math.min(2, 1 + (Math.max(0, projectionDays) / 180));

    const priorStrength = Math.max(
        1.0,
        (INFORMATIVE_PRIOR_MAX_STRENGTH - Math.log2(historyLength + 1)) * horizonFactor
    );

    const n = Math.max(1, historyLength);

    const regularizedVariance =
        (safeSD * safeSD * n + informativeSD * informativeSD * priorStrength) /
        (n + priorStrength);

    const regularizedSD = Math.sqrt(Math.max(0, regularizedVariance));

    // FIX: piso de 3% do domínio. Sem isso, histórico muito estável + N alto
    // produzia SD quase zero e probabilidades degeneradas (0% ou 100%).
    const floorSD = VOLATILITY_FLOOR_PCT * safeDomain;

    return Math.max(floorSD, regularizedSD);
}

export function computeCalibrationPenalty(mcHistory, globalHistory, maxScore, summary = null) {
    if (!Array.isArray(mcHistory) || mcHistory.length === 0 || !Array.isArray(globalHistory) || globalHistory.length === 0) {
        return 0;
    }

    // T-017 FIX: maxScore seguro para evitar divisão por zero
    const safeMaxScore = Number.isFinite(maxScore) && maxScore > 0
        ? maxScore
        : 100;

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const LAMBDA = Math.log(2) / (CALIBRATION_LAMBDA_DAYS * MS_PER_DAY);
    const now = Date.now();

    let brierWeightSum = 0;
    let brierSum = 0;
    let residualWeightSum = 0;
    let residualSum = 0;

    const todayKey = getDateKey(new Date());

    mcHistory.forEach(snapshot => {
        if (!snapshot) return;

        const snapshotKey = getDateKey(snapshot.date || snapshot.timestamp);
        if (snapshotKey === todayKey) return;

        const snapTime = normalizeDate(snapshot.date || snapshot.timestamp)?.getTime() || NaN;
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

        // FIX: blindagem contra resultado real inválido
        const actualScore = Number(actual.score);
        if (!Number.isFinite(actualScore)) return;

        const age = Math.max(0, now - snapTime);
        const weight = Math.exp(-LAMBDA * age);

        // FIX: calibrar contra a PREVISÃO REALMENTE FEITA (projectedMean),
        // não contra a média corrente do dia do snapshot.
        // O campo mean era "onde estou", projectedMean era "onde projetei chegar".
        const meanPrediction = Number(snapshot.projectedMean ?? snapshot.mean) || 0;

        if (meanPrediction > 0 && safeMaxScore > 0) {
            const err = Math.abs(meanPrediction - actualScore) / safeMaxScore;
            residualSum += err * weight;
            residualWeightSum += weight;
        }

        const p = Math.max(0, Math.min(1, (Number(snapshot.probability) || 0) / 100));
        const target = Number(snapshot.target) || 0;

        if (target > 0) {
            const observed = actualScore >= target ? 1 : 0;
            const brierScore = (p - observed) ** 2;
            brierSum += brierScore * weight;
            brierWeightSum += weight;
        }
    });

    let calibrationPenalty = 0;

    // FIX: guarda de amostra efetiva mínima.
    // Sem isso, um único evento azarado (ex.: dia de prova ruim) gerava
    // penalidade máxima e o sistema ficava "desconfiado" sem evidência estatística.
    const hasEffectiveSample =
        brierWeightSum >= CALIBRATION_MIN_EFFECTIVE_SAMPLES ||
        residualWeightSum >= CALIBRATION_MIN_EFFECTIVE_SAMPLES;

    if (hasEffectiveSample && (brierWeightSum > 0 || residualWeightSum > 0)) {
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
    // FIX: domínios globais seguros
    const safeMaxScore = Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100;
    const safeMinScore = Number.isFinite(minScore) ? Math.min(minScore, safeMaxScore) : 0;
    const globalDomain = Math.max(1e-6, safeMaxScore - safeMinScore);

    let categoryStats = [];
    let totalWeight = 0;

    // FIX: pooling bayesiano agora é feito em PROPORÇÃO padronizada (0-1),
    // não em alpha/beta absolutos misturados entre domínios diferentes.
    let weightedPropAlpha = 0;
    let weightedPropBeta = 0;

    const scoresByDate = {};
    const weightsByKey = {};
    const maxScoreByKey = {};
    const bayesianStats = [];

    const cutoffDate = (timeIndex >= 0 && timeIndex < timelineDates.length)
        ? timelineDates[timeIndex]
        : null;

    const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});

    safeCategories.forEach(cat => {
        const historyRaw = cat.simuladoStats?.history || [];
        const historyArray = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});

        if (historyArray.length > 0) {
            const catMaxScore = Number(cat.maxScore) || safeMaxScore;
            const catMinScore = Number.isFinite(Number(cat.minScore))
              ? Number(cat.minScore)
              : safeMinScore;
            const catMinCutoff = Number.isFinite(Number(cat.minCutoff))
              ? Number(cat.minCutoff)
              : 0;
            const catDomain = Math.max(1e-6, catMaxScore - catMinScore);

            const history = [...historyArray]
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
            const weight = sanitizeWeightUnit(debouncedWeights[weightKey] ?? 1);

            const baye = computeBayesianLevel(history, 1, 1, catMaxScore);
            const stats = computeCategoryStats(history, weight, 60, catMaxScore);
            const vol = calculateVolatility(history, catMaxScore);

            if (stats && weight > 0) {
                totalWeight += weight;

                // FIX: padronizar a média bayesiana da disciplina em proporção
                // do seu próprio domínio ANTES do pooling global.
                //
                // Antes: alpha/(alpha+beta) * maxScore global.
                // Problema 1: disciplinas com maxScore diferente contaminavam a média.
                // Problema 2: minScore != 0 era ignorado.
                const rawBayeMean = Number(baye.mean);
                const safeBayeMean = Number.isFinite(rawBayeMean)
                    ? rawBayeMean
                    : (catMinScore + catDomain * 0.5);

                const catProp = clamp((safeBayeMean - catMinScore) / catDomain, 0, 1);

                // Força da evidência (pseudo-contagens), limitada para nenhuma
                // disciplina dominar o pooling global sozinha.
                const strength = (Number(baye.alpha) || 0) + (Number(baye.beta) || 0);
                const CONFIDENCE_CAP = 50;
                const cappedStrength = Math.min(Math.max(strength, 1e-9), CONFIDENCE_CAP);

                weightedPropAlpha += catProp * cappedStrength * weight;
                weightedPropBeta += (1 - catProp) * cappedStrength * weight;

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

                        // T-011 FIX: clamp de correct por total antes de agregar
                        const currentCorrect = currentTotal > 0
                            ? clampCorrectToTotal(h.correct, currentTotal)
                            : 0;

                        if (existing) {
                            const newTotal = existing.total + currentTotal;
                            const newCorrect = existing.correct + currentCorrect;

                            // T-011 FIX: clamp também após soma agregada
                            const safeNewCorrect = newTotal > 0
                                ? Math.max(0, Math.min(newTotal, newCorrect))
                                : newCorrect;

                            const newScore = newTotal > 0
                                ? (safeNewCorrect / newTotal) * catMaxScore
                                : (existing.score + currentScore) / 2;

                            scoresByDate[dk][weightKey] = {
                                score: newScore,
                                correct: safeNewCorrect,
                                total: newTotal
                            };
                        } else {
                            scoresByDate[dk][weightKey] = {
                                score: currentScore,
                                correct: currentCorrect,
                                total: currentTotal
                            };
                        }
                    }
                });

                categoryStats.push({
                    key: weightKey,
                    name: cat.name,
                    ...stats,
                    maxScore: catMaxScore,
                    minScore: catMinScore,
                    minCutoff: catMinCutoff,
                    bayesianMean: baye.mean,
                    bayesianSd: baye.sd,
                    volatility: vol,
                    weight
                });

                bayesianStats.push({ sd: baye.sd, weight, n: history.length });
            }
        }
    });

    if (categoryStats.length === 0 || totalWeight === 0) return null;

    // T-025 FIX: evitar new Date('YYYY-MM-DD') diretamente.
    // normalizeDate já é usado no projeto para ancorar datas com mais segurança.
    const sortedDates = Object.keys(scoresByDate).sort((a, b) => {
        const da = normalizeDate(a)?.getTime() ?? 0;
        const db = normalizeDate(b)?.getTime() ?? 0;
        return da - db;
    });
    const subjectNames = categoryStats.map(cat => cat.key || cat.name);

    const estimatedRho = getAdaptiveInterSubjectCorrelation(
        categoryStats.map(cat => ({ sd: cat.sd ?? cat.volatility, weight: cat.weight })),
        simuladoRows,
        subjectNames,
        undefined,
        safeMaxScore
    );

    const pooledVariance = computeWeightedVariance(
        categoryStats.map(cat => ({ sd: cat.sd ?? cat.volatility, weight: cat.weight })),
        totalWeight,
        estimatedRho
    );

    const pooledSD = totalWeight > 0 ? Math.sqrt(Math.max(0, pooledVariance)) : 0;

    categoryStats = computeHierarchicalAdjustment(categoryStats, pooledSD);

    // FIX: média bayesiana global em proporção, mapeada para o domínio global
    // respeitando minScore. Sem dados, assume o ponto médio (não zero).
    const propSum = weightedPropAlpha + weightedPropBeta;
    const globalProp = propSum > 0 ? (weightedPropAlpha / propSum) : 0.5;
    const bayesianMean = safeMinScore + (globalProp * globalDomain);

    const pooledBayesianVar = computeWeightedVariance(bayesianStats, totalWeight, estimatedRho);
    const pooledBayesianSD = Math.sqrt(Math.max(0, pooledBayesianVar));

    const rawGlobalHistory = sortedDates.map(date => {
        let pooledCorrect = 0;
        let pooledTotal = 0;

        Object.keys(scoresByDate[date]).forEach(name => {
            const w = weightsByKey[name];
            const catMaxScore = maxScoreByKey[name] || safeMaxScore;
            const metrics = scoresByDate[date][name];

            if (w > 0 && metrics !== undefined) {
                const rawTotal = Number(metrics.total) || getSyntheticTotal(catMaxScore);

                const total = Number.isFinite(rawTotal) && rawTotal > 0
                    ? rawTotal
                    : getSyntheticTotal(catMaxScore);

                const rawCorrect = (metrics.correct !== undefined && metrics.total > 0)
                    ? Number(metrics.correct)
                    : (Number(metrics.score) / catMaxScore) * total;

                // T-011 FIX: clamp final antes de ponderar no histórico global
                const correct = Math.max(
                    0,
                    Math.min(total, Number.isFinite(rawCorrect) ? rawCorrect : 0)
                );

                pooledCorrect += correct * w;
                pooledTotal += total * w;
            }
        });

        return { date, score: pooledTotal > 0 ? (pooledCorrect / pooledTotal) * safeMaxScore : -1 };
    }).filter(item => item.score >= 0 && !isNaN(item.score));

    const adaptiveSignal = computeAdaptiveSignal(rawGlobalHistory);
    const confidenceMultiplier = getConfidenceMultiplier(adaptiveSignal.effectiveN) * adaptiveSignal.ciInflation;

    const weightedLow = Math.max(safeMinScore, bayesianMean - confidenceMultiplier * pooledBayesianSD);
    const weightedHigh = Math.min(safeMaxScore, bayesianMean + confidenceMultiplier * pooledBayesianSD);

    const globalHistory = rawGlobalHistory;

    const winsorizedScores = winsorizeSeries(
        globalHistory.map(h => getSafeScore(h, safeMaxScore)),
        adaptiveSignal.adaptiveWinsor.low,
        adaptiveSignal.adaptiveWinsor.high
    );

    const robustGlobalHistory = globalHistory.map((h, idx) => ({ ...h, score: winsorizedScores[idx] }));

    const temporalVolatility = calculateVolatility(robustGlobalHistory, safeMaxScore);
    const dailySD = temporalVolatility > 0 ? temporalVolatility : pooledSD;

    const avgCV = totalWeight > 0
        ? categoryStats.reduce((acc, cat) => acc + ((cat.mean > 1 ? (cat.sd / cat.mean) * 100 : 0) * (cat.weight / totalWeight)), 0)
        : 0;

    const hLen = robustGlobalHistory.length;
    const firstScore = hLen > 0 ? (robustGlobalHistory[0].score || 0).toFixed(4) : '0';
    const lastScore = hLen > 0 ? (robustGlobalHistory[hLen - 1].score || 0).toFixed(4) : '0';
    const scoreFingerprint = `${hLen}-${firstScore}-${lastScore}`;

    const cutoffs = categoryStats.map(c => c.minCutoff || 0).join('-');

    // T-016 FIX: incluir pesos no hash.
    // Sem isso, mudar pesos podia não disparar nova simulação se a média global
    // e o fingerprint permanecessem parecidos.
    const weightFingerprint = categoryStats
      .map(c => `${c.key}:${Number(c.weight || 0).toFixed(2)}`)
      .join('|');

    const safeTotalWeight = Number.isFinite(totalWeight)
      ? Number(totalWeight.toFixed(2))
      : 0;

    const statsHash = `${bayesianMean.toFixed(4)}-${pooledSD.toFixed(4)}-${safeMinScore}-${safeMaxScore}-${scoreFingerprint}-tw[${safeTotalWeight}]-w[${weightFingerprint}]-cutoffs[${cutoffs}]`;

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
