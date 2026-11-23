import {
    computeCategoryStats,
    computeBayesianLevel,
    computeWeightedVariance,
    calculateVolatility,
    getAdaptiveInterSubjectCorrelation,
    computeHierarchicalAdjustment
} from './index.js';
import { getSafeScore, getSyntheticTotal, isPhantomZeroTimeAttempt } from '../utils/scoreHelper.js';
import { getDateKey, normalizeDate } from '../utils/dateHelper.js';
import {
    getConfidenceMultiplier,
    winsorizeSeries,
    computeAdaptiveSignal
} from '../utils/adaptiveMath.js';

export const VOLATILITY_REGULARIZATION_FACTOR = 0.035;
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

const isStrictNum = (value) => (
    value !== null &&
    value !== undefined &&
    typeof value !== 'boolean' &&
    String(value).trim() !== '' &&
    Number.isFinite(Number(value))
);

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
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return 0;
    }
    let numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        numeric = parseInt(String(value), 10);
    }

    if (Number.isNaN(numeric)) return 0;

    return Math.max(0, Math.min(999, Math.round(numeric)));
};

export const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

export function regularizeVolatility(dailySD, projectionDays, historyLength, domain) {
    const safeSD = Number.isFinite(dailySD) ? Math.max(0, dailySD) : 0;
    const safeDomain = Number.isFinite(domain) && domain > 1e-9 ? domain : 100;

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

export function computeCalibrationPenalty(mcHistory, globalHistory, maxScore, summary = null, minScore = 0) {
    if (!Array.isArray(mcHistory) || mcHistory.length === 0 || !Array.isArray(globalHistory) || globalHistory.length === 0) {
        return 0;
    }

    // T-017 FIX: maxScore seguro para evitar divisão por zero
    const safeMaxScore = Number.isFinite(maxScore) && maxScore > 0
        ? maxScore
        : 100;
    const safeMinScore = Number.isFinite(minScore) ? Math.min(minScore, safeMaxScore) : 0;
    const globalDomain = Math.max(1, safeMaxScore - safeMinScore);

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const LAMBDA = Math.log(2) / (CALIBRATION_LAMBDA_DAYS * MS_PER_DAY);
    const now = Date.now();

    let brierWeightSum = 0;
    let brierSum = 0;
    let residualWeightSum = 0;
    let residualSum = 0;

    const todayKey = getDateKey(new Date());

    let resolvedSnapshotCount = 0;

    mcHistory.forEach(snapshot => {
        if (!snapshot || snapshot.categoryId) return;

        const snapshotKey = getDateKey(snapshot.date || snapshot.timestamp);
        if (snapshotKey === todayKey) return;

        const snapTime = normalizeDate(snapshot.date || snapshot.timestamp)?.getTime() || NaN;
        if (isNaN(snapTime)) return;

        const targetTime = snapshot.targetDate ? normalizeDate(snapshot.targetDate)?.getTime() : null;

        let actual = null;

        if (targetTime && !isNaN(targetTime)) {
            // M8 FIX: não avaliar prematuramente projeções cuja data-alvo ainda está longe no futuro.
            if (targetTime > now + 7 * MS_PER_DAY) return;
            const maxToleranceMs = Math.max(14 * MS_PER_DAY, Math.abs(targetTime - snapTime) * 0.4);
            let minDiff = Infinity;

            globalHistory.forEach(h => {
                const hTime = normalizeDate(h.date)?.getTime() || NaN;

                if (hTime > snapTime) {
                    const diff = Math.abs(hTime - targetTime);
                    if (diff <= maxToleranceMs && diff < minDiff) {
                        minDiff = diff;
                        actual = h;
                    }
                }
            });
        } else {
            actual = globalHistory.find(h => (normalizeDate(h.date)?.getTime() || NaN) > snapTime);
        }

        if (!actual) return;

        // FIX: blindagem contra resultado real inválido (suporte a scorePct, value, correct/total)
        const actualScore = getSafeScore(actual, safeMaxScore, safeMinScore);
        if (!Number.isFinite(actualScore)) return;

        resolvedSnapshotCount++;

        const age = Math.max(0, now - snapTime);
        const weight = Math.exp(-LAMBDA * age);

        // FIX: calibrar contra a PREVISÃO REALMENTE FEITA (projectedMean),
        // não contra a média corrente do dia do snapshot.
        // O campo mean era "onde estou", projectedMean era "onde projetei chegar".
        const rawMeanPred = snapshot.projectedMean ?? snapshot.mean;
        const meanPrediction = Number.isFinite(Number(rawMeanPred)) ? Number(rawMeanPred) : NaN;

        const targetVal = Number(snapshot.target);
        if (Number.isFinite(meanPrediction) && meanPrediction >= safeMinScore && Number.isFinite(targetVal) && targetVal >= safeMinScore && globalDomain > 0) {
            const err = Math.abs(meanPrediction - actualScore) / globalDomain;
            residualSum += err * weight;
            residualWeightSum += weight;
        }

        const rawProb = Number(snapshot.probability);
        const p = Number.isFinite(rawProb) ? Math.max(0, Math.min(1, rawProb / 100)) : 0;
        const target = Number(snapshot.target);

        if (Number.isFinite(target) && target >= safeMinScore) {
            const observed = actualScore >= target ? 1 : 0;
            const brierScore = (p - observed) ** 2;
            brierSum += brierScore * weight;
            brierWeightSum += weight;
        }
    });

    let calibrationPenalty = 0;

    // ✅ PATCH-05: Penalidade com amostra insuficiente
    // Conta eventos REAIS resolvidos contra um simulado posterior válido (não snapshots pendentes)
    const actualEventCount = resolvedSnapshotCount;
    
    const hasEffectiveSample =
        actualEventCount >= 3 && // Mínimo de eventos reais
        (brierWeightSum >= CALIBRATION_MIN_EFFECTIVE_SAMPLES ||
         residualWeightSum >= CALIBRATION_MIN_EFFECTIVE_SAMPLES);

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
    simuladoRows = [],
    targetScore = null
}) {
    // FIX: domínios globais seguros
    const safeMaxScore = Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100;
    const safeMinScore = Number.isFinite(minScore) ? Math.min(minScore, safeMaxScore) : 0;
    const globalDomain = Math.max(1e-6, safeMaxScore - safeMinScore);

    let categoryStats = [];
    let totalWeight = 0;

    // FIX (M10): pooling bayesiano ponderado estritamente pelos pesos definidos pelo usuário,
    // evitando que uma matéria com mais questões históricas anule mcWeights.
    let weightedPropSum = 0;

    const scoresByDate = {};
    const weightsByKey = new Map();
    const maxScoreByKey = new Map();
    const bayesianStats = [];

    const todayKey = getDateKey(new Date());
    const cutoffDate = (timeIndex >= 0 && timeIndex < timelineDates.length)
        ? timelineDates[timeIndex]
        : todayKey;

    const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});

    safeCategories.forEach(cat => {
        const historyRaw = cat.simuladoStats?.history || [];
        const historyArray = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});

        if (historyArray.length > 0) {
            const catMaxScore = isStrictNum(cat.maxScore) && Number(cat.maxScore) > 0
                ? Number(cat.maxScore)
                : safeMaxScore;
            const catMinScore = isStrictNum(cat.minScore)
                ? Number(cat.minScore)
                : safeMinScore;
            const rawMinCutoff = cat.minCutoff;
            const hasValidMinCutoff = isStrictNum(rawMinCutoff);
            const catMinCutoff = hasValidMinCutoff ? Number(rawMinCutoff) : null;
            const catDomain = Math.max(1e-6, catMaxScore - catMinScore);

            const history = [...historyArray]
                .filter(h => {
                    if (!h || h.valid === false || h.validated === false) return false;
                    const currentScore = getSafeScore(h, catMaxScore, catMinScore);
                    if (Number.isFinite(currentScore) && isPhantomZeroTimeAttempt(h, currentScore)) return false;
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
            const weight = sanitizeWeightUnit(debouncedWeights[cat.id] ?? debouncedWeights[cat.name] ?? 1);

            // ✅ LOTE-01 FIX (C3): propagar o piso da disciplina para o nível bayesiano
            const baye = computeBayesianLevel(history, 1, 1, catMaxScore, { minScore: catMinScore, referenceDate: cutoffDate });
            const stats = computeCategoryStats(history, weight, 60, catMaxScore, catMinScore);
            const vol = calculateVolatility(history, catMaxScore, catMinScore);

            if (stats && weight > 0) {
                totalWeight += weight;

                const rawBayeMean = Number(baye.mean);
                const safeBayeMean = Number.isFinite(rawBayeMean)
                    ? rawBayeMean
                    : (catMinScore + catDomain * 0.5);

                const catProp = clamp((safeBayeMean - catMinScore) / catDomain, 0, 1);
                weightedPropSum += catProp * weight;

                weightsByKey.set(weightKey, weight);
                maxScoreByKey.set(weightKey, catMaxScore);

                history.forEach(h => {
                    const currentScore = getSafeScore(h, catMaxScore, catMinScore);

                    // RIGOR FIX: Proteção contra Corrupção de Dados e o "0s Bug".
                    if (!Number.isFinite(currentScore)) return;
                    if (isPhantomZeroTimeAttempt(h, currentScore)) return;

                    const dk = getDateKey(getHistoryDate(h));

                    if (dk) {
                        if (!scoresByDate[dk]) scoresByDate[dk] = {};

                        const existing = scoresByDate[dk][weightKey];

                        let rawTotal = Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0;
                        const rawCorrectProp = h.correct ?? h.acertos ?? h.correctCount;
                        let rawCorrectVal = isStrictNum(rawCorrectProp) ? Number(rawCorrectProp) : NaN;
                        if (rawTotal <= 0 && h.topics) {
                            const safeTopics = Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {});
                            rawTotal = safeTopics.reduce((sum, t) => sum + (Number(t?.total ?? t?.questoes ?? t?.totalQuestoes ?? t?.questions) || 0), 0);
                            if (!Number.isFinite(rawCorrectVal) || rawCorrectVal <= 0) {
                                const topicsCorrect = safeTopics.reduce((sum, t) => sum + (Number(t?.correct ?? t?.acertos ?? t?.correctCount) || 0), 0);
                                if (topicsCorrect > 0 || !Number.isFinite(rawCorrectVal)) {
                                    rawCorrectVal = topicsCorrect;
                                }
                            }
                        }

                        // Se não houver total explícito mas houver nota válida, usa volume sintético
                        // para que a nota não seja descartada ao agregar múltiplos registros no mesmo dia.
                        const currentTotal = rawTotal > 0 ? rawTotal : getSyntheticTotal(catMaxScore);
                        const inferredCorrect = ((currentScore - catMinScore) / catDomain) * currentTotal;

                        // M1 FIX: respeita nota líquida Cebraspe (penaltyPerWrong/blanks/netPoints) e TRI/scorePoints.
                        // Só usa rawCorrectVal bruto quando não há divergência com getSafeScore.
                        const hasPenalizedOrAuthoritative =
                            (Number(h.penaltyPerWrong) > 0) ||
                            (Number(h.blanks) > 0) ||
                            isStrictNum(h.netPoints) ||
                            isStrictNum(h.scorePoints) ||
                            isStrictNum(h.scorePct) ||
                            isStrictNum(h.score);
                        const rawCorrectClamped = rawTotal > 0 && Number.isFinite(rawCorrectVal)
                            ? clampCorrectToTotal(rawCorrectVal, currentTotal)
                            : NaN;
                        const currentCorrect = Number.isFinite(rawCorrectClamped) &&
                            !(hasPenalizedOrAuthoritative && Math.abs((inferredCorrect / currentTotal) - (rawCorrectClamped / currentTotal)) > 1e-4)
                            ? rawCorrectClamped
                            : clampCorrectToTotal(inferredCorrect, currentTotal);

                        if (existing) {
                            const newTotal = existing.total + currentTotal;
                            const newCorrect = existing.correct + currentCorrect;

                            // T-011 FIX: clamp também após soma agregada
                            const safeNewCorrect = newTotal > 0
                                ? Math.max(0, Math.min(newTotal, newCorrect))
                                : newCorrect;

                            const newScore = newTotal > 0
                                ? catMinScore + (safeNewCorrect / newTotal) * catDomain
                                : (existing.score + currentScore) / 2;

                            scoresByDate[dk][weightKey] = {
                                score: newScore,
                                correct: safeNewCorrect,
                                total: newTotal,
                                minScore: catMinScore,
                                maxScore: catMaxScore
                            };
                        } else {
                            scoresByDate[dk][weightKey] = {
                                score: currentScore,
                                correct: currentCorrect,
                                total: currentTotal,
                                minScore: catMinScore,
                                maxScore: catMaxScore
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
                    examGroup: cat.examGroup || null,
                    bayesianMean: baye.mean,
                    temporalBayesianMean: baye.mean,
                    temporalBayesianSd: baye.sd,
                    bayesianSd: baye.sd,
                    volatility: vol,
                    weight
                });

                const catScaledBayesSD = globalDomain > 0 && catDomain > 0
                    ? (Number(baye.sd || 0) / catDomain) * globalDomain
                    : Number(baye.sd || 0);
                bayesianStats.push({ sd: catScaledBayesSD, weight, n: history.length });
            }
        }
    });

    if (categoryStats.length === 0 || totalWeight === 0) return null;

    // T-025 FIX: evitar new Date('YYYY-MM-DD') diretamente.
    const sortedDates = Object.keys(scoresByDate).sort((a, b) => {
        const da = normalizeDate(a)?.getTime() ?? 0;
        const db = normalizeDate(b)?.getTime() ?? 0;
        return da - db;
    });
    const subjectNames = categoryStats.map(cat => cat.name || cat.key);

    const estimatedRho = getAdaptiveInterSubjectCorrelation(
        categoryStats.map(cat => ({ sd: cat.sd ?? cat.volatility, weight: cat.weight })),
        simuladoRows,
        subjectNames,
        undefined,
        safeMaxScore,
        safeMinScore,
        cutoffDate
    );

    const scaleCategorySd = (cat, targetDomain) => {
        const rawSD = Number(cat.sd ?? cat.volatility ?? 0);
        if (!Number.isFinite(rawSD) || rawSD < 0) return 0;
        const cMin = isStrictNum(cat?.minScore) ? Number(cat.minScore) : safeMinScore;
        const cMax = isStrictNum(cat?.maxScore) && Number(cat.maxScore) > cMin ? Number(cat.maxScore) : safeMaxScore;
        const cRange = Math.max(1e-6, cMax - cMin);
        return (rawSD / cRange) * targetDomain;
    };

    const pooledVariance = computeWeightedVariance(
        categoryStats.map(cat => ({ sd: scaleCategorySd(cat, globalDomain), weight: cat.weight })),
        totalWeight,
        estimatedRho
    );

    const pooledSD = totalWeight > 0 ? Math.sqrt(Math.max(0, pooledVariance)) : 0;
    const normPooledSD = globalDomain > 0 ? (pooledSD / globalDomain) * 100 : pooledSD;

    categoryStats = computeHierarchicalAdjustment(categoryStats, normPooledSD);

    // FIX (M10): média bayesiana global estritamente ponderada por mcWeights
    const globalProp = totalWeight > 0 ? clamp(weightedPropSum / totalWeight, 0, 1) : 0.5;
    const bayesianMean = safeMinScore + (globalProp * globalDomain);

    const pooledBayesianVar = computeWeightedVariance(bayesianStats, totalWeight, estimatedRho);
    const pooledBayesianSD = Math.sqrt(Math.max(0, pooledBayesianVar));

    const rawGlobalHistory = sortedDates.map(date => {
        let pooledWeightedProp = 0;
        let pooledWeightSum = 0;

        Object.keys(scoresByDate[date]).forEach(name => {
            const w = weightsByKey.get(name) ?? 0;
            const catMaxScore = maxScoreByKey.get(name) || safeMaxScore;
            const metrics = scoresByDate[date][name];

            if (w > 0 && metrics !== undefined) {
                const rawTotal = Number(metrics.total) || getSyntheticTotal(catMaxScore);
                const catMinScore = isStrictNum(metrics.minScore) ? Number(metrics.minScore) : 0;
                const catDomain = Math.max(1e-9, catMaxScore - catMinScore);

                const total = Number.isFinite(rawTotal) && rawTotal > 0
                    ? rawTotal
                    : getSyntheticTotal(catMaxScore);

                const rawCorrect = (metrics.correct !== undefined && metrics.total > 0)
                    ? Number(metrics.correct)
                    : ((Number(metrics.score) - catMinScore) / catDomain) * total;

                // T-011 FIX: clamp final antes de ponderar no histórico global
                const correct = Math.max(
                    0,
                    Math.min(total, Number.isFinite(rawCorrect) ? rawCorrect : 0)
                );

                // M10 FIX: cada matéria contribui proporcionalmente ao seu peso w (não total * w),
                // mantendo ponderação por volume apenas entre tentativas da MESMA matéria no mesmo dia.
                const subProp = total > 0
                    ? clamp(correct / total, 0, 1)
                    : clamp((Number(metrics.score) - catMinScore) / catDomain, 0, 1);

                pooledWeightedProp += subProp * w;
                pooledWeightSum += w;
            }
        });

        return {
            date,
            score: pooledWeightSum > 0 ? safeMinScore + (pooledWeightedProp / pooledWeightSum) * globalDomain : null
        };
    }).filter(item => item.score !== null && Number.isFinite(item.score) && item.score >= safeMinScore);

    const adaptiveSignal = computeAdaptiveSignal(rawGlobalHistory);
    const confidenceMultiplier = getConfidenceMultiplier(adaptiveSignal.effectiveN, { allowFractional: true }) * adaptiveSignal.ciInflation;

    const weightedLow = Math.max(safeMinScore, bayesianMean - confidenceMultiplier * pooledBayesianSD);
    const weightedHigh = Math.min(safeMaxScore, bayesianMean + confidenceMultiplier * pooledBayesianSD);

    const globalHistory = rawGlobalHistory;

    const winsorizedScores = winsorizeSeries(
        globalHistory.map(h => getSafeScore(h, safeMaxScore, safeMinScore)),
        adaptiveSignal.adaptiveWinsor.low,
        adaptiveSignal.adaptiveWinsor.high
    );

    const robustGlobalHistory = globalHistory.map((h, idx) => ({ ...h, score: winsorizedScores[idx] }));

    const temporalVolatility = calculateVolatility(robustGlobalHistory, safeMaxScore, safeMinScore);
    const dailySD = temporalVolatility > 0 ? temporalVolatility : pooledSD;

    const avgCV = totalWeight > 0
        ? categoryStats.reduce((acc, cat) => {
            const domain = Math.max(1e-6, (cat.maxScore ?? safeMaxScore) - (cat.minScore ?? safeMinScore));
            const meanAboveMin = (cat.mean ?? safeMinScore) - (cat.minScore ?? safeMinScore);
            const relativeMean = meanAboveMin > 0.05 * domain ? meanAboveMin : domain * 0.5;
            const cv = (cat.sd / relativeMean) * 100;
            return acc + (cv * (cat.weight / totalWeight));
        }, 0)
        : 0;

    const hLen = robustGlobalHistory.length;
    const seriesSig = robustGlobalHistory
        .map((h) => `${h?.date || ''}:${Number(h?.score || 0).toFixed(3)}:${h?.total ?? ''}:${h?.correct ?? ''}`)
        .join(';');
    const scoreFingerprint = `${hLen}-${seriesSig}`;

    const cutoffs = categoryStats
        .map(c => `${c.minCutoff !== null && c.minCutoff !== undefined && Number.isFinite(Number(c.minCutoff)) ? Number(c.minCutoff) : 'none'}:${c.examGroup || ''}`)
        .join('-');

    // T-016 FIX: incluir pesos no hash.
    // Sem isso, mudar pesos podia não disparar nova simulação se a média global
    // e o fingerprint permanecessem parecidos.
    const weightFingerprint = categoryStats
      .map(c => `${c.key}:${Number(c.weight || 0).toFixed(2)}`)
      .join('|');

    const safeTotalWeight = Number.isFinite(totalWeight)
      ? Number(totalWeight.toFixed(2))
      : 0;

    const safeTargetScore = isStrictNum(targetScore) ? Number(targetScore) : 'na';
    const statsHash = `${bayesianMean.toFixed(4)}-${pooledSD.toFixed(4)}-${safeMinScore}-${safeMaxScore}-${scoreFingerprint}-tw[${safeTotalWeight}]-w[${weightFingerprint}]-cutoffs[${cutoffs}]-tgt[${safeTargetScore}]`;

    return {
        categoryStats,
        bayesianMean,
        pooledSD,
        totalWeight,
        bayesianCI: {
            ciLow: weightedLow,
            ciHigh: weightedHigh,
            n: Number.isFinite(adaptiveSignal.effectiveN) && adaptiveSignal.effectiveN > 0
                ? adaptiveSignal.effectiveN
                : Math.max(1, globalHistory.length)
        },
        globalHistory,
        dailySD,
        estimatedRho,
        consistencyScore: Math.max(0, 100 - avgCV),
        statsHash
    };
}

