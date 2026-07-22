import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper.js';
import { normalizeDate, safeDateParse } from '../utils/dateHelper.js';
import { calculateSlope } from './projection.js';
import { Z_95, MIN_SD_FLOOR } from './math/constants.js';
import { kahanSum, kahanMean } from './math/kahan.js';
import { computeAdaptiveLambda } from './diagnostics.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';

export const BAYESIAN_DECAY_FACTOR = 0.985;
export const RETENTION_DECAY_SHORT = 0.94;
export const RETENTION_DECAY_LONG = 0.992;

function toHistoryArray(history) {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
}

function safeFinite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function safeMaxScoreValue(maxScore, fallback = 100) {
    const n = Number(maxScore);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function computeImprovedRetentionProbability(historyLength, lastGapDays = 7, maxAlpha = 0.9) {
    const shortDecay = Math.pow(RETENTION_DECAY_SHORT, Math.max(0, lastGapDays));
    const longDecay = Math.pow(RETENTION_DECAY_LONG, Math.max(0, lastGapDays * 0.6));
    const blended = 0.6 * shortDecay + 0.4 * longDecay;
    return Math.max(0.15, Math.min(maxAlpha, blended * maxAlpha));
}

export function getSortedHistory(history) {
    const histArray = toHistoryArray(history);
    if (!histArray.length) return [];

    return histArray
        .map((h, index) => {
            if (typeof h === 'number') {
                return { original: h, time: index };
            }

            const dateValue = h?.date ?? h?.createdAt;
            const t = dateValue != null ? safeDateParse(dateValue)?.getTime() ?? NaN : NaN;

            return { original: h, time: t };
        })
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => {
            if (a.time !== b.time) return a.time - b.time;
            return String(a.original?.id || '').localeCompare(String(b.original?.id || ''));
        })
        .map(item => item.original);
}

export function pruneHistoryForMemory(history = [], maxPoints = 1500, maxAgeDays = 365 * 5) {
    const sorted = getSortedHistory(history);
    if (!sorted.length) return sorted;

    const now = Date.now();
    const cutoff = now - maxAgeDays * 86400000;

    let filtered = sorted.filter(h => {
        const t = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        return Number.isFinite(t) && t >= cutoff;
    });

    if (filtered.length <= maxPoints) return filtered;

    const recentCount = Math.max(10, Math.floor(maxPoints * 0.2));
    const older = filtered.slice(0, -recentCount);
    const recent = filtered.slice(-recentCount);

    if (older.length <= maxPoints - recentCount) return filtered;

    const targetCount = maxPoints - recentCount;
    const factor = older.length / targetCount;
    const sampledOlder = [];

    for (let i = 0; i < targetCount; i++) {
        sampledOlder.push(older[Math.floor(i * factor)]);
    }

    return [...sampledOlder, ...recent].slice(0, maxPoints);
}

export function weightedRegression(history, lambda = 0.08, maxScore = 100, options = {}) {
    lambda = Math.max(0, Math.min(1, lambda ?? 0.08));
    maxScore = safeMaxScoreValue(maxScore, 100);

    const sorted = getSortedHistory(history);
    if (sorted.length < 2) return { slope: 0, intercept: 0, slopeStdError: 1.5 };

    const parsedReferenceDate = options.referenceDate != null ? safeDateParse(options.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const t0 = safeDateParse(sorted[0]?.date || sorted[0]?.createdAt)?.getTime() ?? NaN;

    let sumW = 0, cW = 0;
    let sumWX = 0, cWX = 0;
    let sumWY = 0, cWY = 0;
    let sumWXX = 0, cWXX = 0;
    let sumWXY = 0, cWXY = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        const t = Math.max(0, (now - timeMs) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const rawWeight = Math.exp(-lambda * t);
        const w = Math.max(EPSILON_WEIGHT, rawWeight);
        const x = (timeMs - t0) / 86400000;

        const yW = w - cW; const tW = sumW + yW; cW = (tW - sumW) - yW; sumW = tW;

        const valWX = w * x;
        const yWX = valWX - cWX; const tWX = sumWX + yWX; cWX = (tWX - sumWX) - yWX; sumWX = tWX;

        const valWY = w * y;
        const yWY = valWY - cWY; const tWY = sumWY + yWY; cWY = (tWY - sumWY) - yWY; sumWY = tWY;

        const valWXX = w * x * x;
        const yWXX = valWXX - cWXX; const tWXX = sumWXX + yWXX; cWXX = (tWXX - sumWXX) - yWXX; sumWXX = tWXX;

        const valWXY = w * x * y;
        const yWXY = valWXY - cWXY; const tWXY = sumWXY + yWXY; cWXY = (tWXY - sumWXY) - yWXY; sumWXY = tWXY;
    }

    const RIDGE_PENALTY = Math.max(1e-8, (sumWXX > 0 ? sumWXX / Math.max(1, sumW) : 1) * 1e-4);
    const safeSumW = Math.max(1e-15, sumW);
    const varianceX = Math.max(0, sumWXX - (sumWX * sumWX) / safeSumW);
    const covXY = sumWXY - (sumWX * sumWY) / safeSumW;
    const regularizedDenominator = varianceX + RIDGE_PENALTY;

    if (safeSumW < 1e-15 || regularizedDenominator < 1e-15) {
        const fallbackScore = getSafeScore(sorted[sorted.length - 1], maxScore);
        return { slope: 0, intercept: Number.isFinite(fallbackScore) ? fallbackScore : 0, slopeStdError: 1.5 };
    }

    let slope = covXY / regularizedDenominator;
    const maxSlopeLimit = maxScore * 0.05;
    slope = Math.max(-maxSlopeLimit, Math.min(maxSlopeLimit, slope));

    const intercept = (sumWY - slope * sumWX) / safeSumW;
    const slopeStdError = calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options);

    return { slope, intercept, slopeStdError };
}

export function calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options = {}) {
    maxScore = safeMaxScoreValue(maxScore, 100);

    const parsedReferenceDate = options.referenceDate != null ? safeDateParse(options.referenceDate) : null;
    const now = parsedReferenceDate && Number.isFinite(parsedReferenceDate.getTime())
        ? parsedReferenceDate.getTime()
        : Date.now();

    const t0 = safeDateParse(sorted[0]?.date || sorted[0]?.createdAt)?.getTime() ?? NaN;

    let sumW = 0, cW = 0;
    let sumW2 = 0, cW2 = 0;
    let sumWX = 0, cWX = 0;
    let sumWXX = 0, cWXX = 0;
    let rss = 0, cRSS = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const timeMs = safeDateParse(h?.date || h?.createdAt)?.getTime() ?? NaN;
        if (!Number.isFinite(timeMs)) continue;

        const y = getSafeScore(h, maxScore);
        if (!Number.isFinite(y)) continue;

        const x = (timeMs - t0) / 86400000;
        const t = Math.max(0, (now - timeMs) / 86400000);
        const EPSILON_WEIGHT = 1e-10;
        const w = Math.max(EPSILON_WEIGHT, Math.exp(-lambda * t));
        const pred = intercept + slope * x;
        const residualSq = Math.pow(y - pred, 2);

        const valW = w;
        const yW = valW - cW; const tW = sumW + yW; cW = (tW - sumW) - yW; sumW = tW;

        const valW2 = w * w;
        const yW2 = valW2 - cW2; const tW2 = sumW2 + yW2; cW2 = (tW2 - sumW2) - yW2; sumW2 = tW2;

        const valWX = w * x;
        const yWX = valWX - cWX; const tWX = sumWX + yWX; cWX = (tWX - sumWX) - yWX; sumWX = tWX;

        const valWXX = w * x * x;
        const yWXX = valWXX - cWXX; const tWXX = sumWXX + yWXX; cWXX = (tWXX - sumWXX) - yWXX; sumWXX = tWXX;

        const valRSS = w * residualSq;
        const yRSS = valRSS - cRSS; const tRSS = rss + yRSS; cRSS = (tRSS - rss) - yRSS; rss = tRSS;
    }

    if (sumW2 <= 1e-15) return 1.5 * (maxScore / 100);

    const effectiveN = (sumW * sumW) / sumW2;
    const scaleFactorFallback = maxScore / 100;

    if (effectiveN <= 2.1) return 1.5 * scaleFactorFallback;

    const variance = (rss / sumW) * (effectiveN / (effectiveN - 2));
    const varX = (sumWXX - (sumWX * sumWX) / sumW) / sumW;

    if (varX <= 1e-8) {
        return Math.sqrt(Math.max(0, rss / sumW)) / Math.sqrt(effectiveN);
    }

    const det = sumW * sumWXX - sumWX * sumWX;
    return Math.sqrt(Math.max(0, (variance * sumW) / det));
}

function getHistoryDateValue(entry) {
    return entry?.date ?? entry?.createdAt ?? null;
}

function getHistoryTime(entry) {
    const parsed = normalizeDate(getHistoryDateValue(entry));
    return parsed ? parsed.getTime() : NaN;
}

function getDynamicTrendThreshold(currentScore, maxScore) {
    const safeMaxScore = safeMaxScoreValue(maxScore, 100);
    const safeCurrent = safeFinite(currentScore, 0);
    const currentPct = safeCurrent / safeMaxScore;

    if (!Number.isFinite(currentPct)) return 0.002 * safeMaxScore;

    const damping = Math.max(0, 1 - currentPct);
    const baseRequirement = 0.05;
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002;

    return dynamicPct * safeMaxScore;
}

function getDynamicPriorSD(history, maxScore) {
    const safeMaxScore = safeMaxScoreValue(maxScore, 100);
    const safeHistory = toHistoryArray(history);

    if (safeHistory.length < 5) return safeMaxScore * 0.15;

    const scores = safeHistory.map(h => {
        if (typeof h === 'number') return h;
        return getSafeScore(h, safeMaxScore);
    }).filter(Number.isFinite);

    if (scores.length < 5) return safeMaxScore * 0.15;

    const globalMean = mean(scores);
    const globalVar = scores.length > 1
        ? kahanSum(scores.map(s => Math.pow(s - globalMean, 2))) / (scores.length - 1)
        : 0;

    const empiricalSD = Math.sqrt(Math.max(0, globalVar));
    return Math.max(safeMaxScore * 0.05, Math.min(safeMaxScore * 0.20, empiricalSD));
}

export function mean(arr) {
    return kahanMean(arr);
}

export const calcularMedia = mean;

export function standardDeviation(arr, maxScore = 100, customMean = null) {
    if (!arr || arr.length < 1) return 0;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);

    const clean = arr
        .map(v => typeof v === 'number' ? v : getSafeScore(v, safeMaxScore))
        .filter(Number.isFinite);

    if (clean.length < 1) return 0;

    const n = clean.length;
    const m = customMean !== null && Number.isFinite(Number(customMean)) ? Number(customMean) : mean(clean);

    const sampleVar = n > 1
        ? kahanSum(clean.map(val => Math.pow(val - m, 2))) / (n - 1)
        : 0;

    const sorted = [...clean].sort((a, b) => a - b);

    const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    const absDev = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);

    const mad = absDev.length % 2 === 0
        ? (absDev[absDev.length / 2 - 1] + absDev[absDev.length / 2]) / 2
        : absDev[Math.floor(absDev.length / 2)];

    const robustSigma = 1.4826 * mad;
    const robustVar = robustSigma * robustSigma;
    const blendedSampleVar = (0.8 * sampleVar) + (0.2 * robustVar);

    const POPULATION_SD = getDynamicPriorSD(arr, safeMaxScore);
    const KAPPA = 1;
    const adjustedVar = ((n - 1) * blendedSampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) / ((n - 1) + KAPPA);
    const finalSdFloor = MIN_SD_FLOOR * safeMaxScore;

    return Math.max(finalSdFloor, Math.sqrt(Math.max(0, adjustedVar)));
}

export const calcularDesvioPadrao = (arr) => {
    if (!arr || arr.length <= 1) return 0;

    const clean = arr.map(Number).filter(Number.isFinite);
    if (clean.length <= 1) return 0;

    const m = kahanMean(clean);
    const sumSq = clean.map(x => Math.pow(x - m, 2));
    const v = clean.length > 0 ? kahanSum(sumSq) / clean.length : 0;

    return Math.sqrt(Math.max(0, v));
};

export function calcularAssimetria(arr) {
    if (!arr || arr.length < 3) return 0;

    const clean = toHistoryArray(arr)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, 100))
        .filter(Number.isFinite);

    const n = clean.length;
    if (n < 3) return 0;

    const m = mean(clean);
    const sumSq = kahanSum(clean.map(val => Math.pow(val - m, 2)));
    const sampleVar = sumSq / (n - 1);
    const s = Math.sqrt(Math.max(0, sampleVar));

    if (s < 1e-5) return 0;

    const cubeDiffs = clean.map(val => Math.pow(val - m, 3));
    const sumCube = kahanSum(cubeDiffs);
    const safeS = Math.max(1e-5, s);
    const skewness = (n * sumCube) / ((n - 1) * (n - 2) * Math.pow(safeS, 3));

    if (!Number.isFinite(skewness)) return 0;

    return Math.max(-5, Math.min(5, skewness));
}

export function computeBayesianLevel(
    historyOrScore,
    arg1 = 1,
    arg2 = 1,
    arg3 = 100,
    arg4 = {}
) {
    let history, alpha, beta, safeMaxScore, options;

    if (Array.isArray(historyOrScore)) {
        history = toHistoryArray(historyOrScore);

        const safeAlphaArg = Number(arg1);
        const safeBetaArg = Number(arg2);

        alpha = Number.isFinite(safeAlphaArg) && safeAlphaArg >= 0 ? safeAlphaArg : 1;
        beta = Number.isFinite(safeBetaArg) && safeBetaArg >= 0 ? safeBetaArg : 1;

        safeMaxScore = safeMaxScoreValue(arg3, 100);
        options = arg4 || {};
    } else {
        history = [];

        const score = Math.max(0, Number(historyOrScore) || 0);

        const nEffArg = Number(arg1);
        const n_eff = Number.isFinite(nEffArg) && nEffArg >= 0 ? nEffArg : 1;

        safeMaxScore = safeMaxScoreValue(arg2, 100);
        options = arg3 || {};

        const pct = Math.max(0, Math.min(1, score / safeMaxScore));
        alpha = pct * n_eff;
        beta = (1 - pct) * n_eff;
    }

    const alpha0 = alpha;
    const beta0 = beta;

    let maxNEver = alpha + beta;

    const syntheticTotalValue = getSyntheticTotal(safeMaxScore);
    const safeSyntheticTotal = Number.isFinite(syntheticTotalValue) ? syntheticTotalValue : 20;

    const safeTotalEntry = (h) => {
        const n = Number(h?.total);
        return Number.isFinite(n) && n > 0 ? n : safeSyntheticTotal;
    };

    const gaps = [];

    const historySortedForGaps = history
        .map(h => ({ original: h, time: getHistoryTime(h) }))
        .filter(item => Number.isFinite(item.time))
        .sort((a, b) => a.time - b.time)
        .map(item => item.original);

    if (historySortedForGaps.length > 1) {
        for (let i = 1; i < historySortedForGaps.length; i++) {
            const time1 = getHistoryTime(historySortedForGaps[i]);
            const time0 = getHistoryTime(historySortedForGaps[i - 1]);
            const gap = (time1 - time0) / 86400000;
            if (Number.isFinite(gap) && gap > 0) gaps.push(gap);
        }
    }

    const safeAvgGap = Math.max(0.5, gaps.length > 0 ? kahanSum(gaps) / gaps.length : 7);
    const baseCapacity = 250 / safeAvgGap;
    const totalQuestionsHist = history.length ? kahanSum(history.map(safeTotalEntry)) : 0;

    const historyDays = historySortedForGaps.length > 1
        ? Math.max(1, (getHistoryTime(historySortedForGaps[historySortedForGaps.length - 1]) - getHistoryTime(historySortedForGaps[0])) / 86400000)
        : 1;

    const questionsPerDay = totalQuestionsHist / historyDays;
    const volumeCapacity = questionsPerDay * 30;
    const rawCap = Math.min(baseCapacity, volumeCapacity);
    const dynamicAlphaCap = Math.max(250, Math.floor(Number.isFinite(rawCap) ? rawCap : 250));
    const dynamicEffectiveN = dynamicAlphaCap;

    const refDateObj = options.referenceDate ? normalizeDate(options.referenceDate) : null;
    const now = refDateObj && Number.isFinite(refDateObj.getTime()) ? refDateObj.getTime() : Date.now();

    const runningPriors = new Float64Array(historySortedForGaps.length);

    if (historySortedForGaps.length > 0) {
        let priorSum = 0, priorC = 0, priorCount = 0;

        for (let j = 0; j < historySortedForGaps.length; j++) {
            const sScore = getSafeScore(historySortedForGaps[j], safeMaxScore);

            if (Number.isFinite(sScore)) {
                let rawPct = sScore / safeMaxScore;
                rawPct = options.isPenalizedFormat ? Math.max(0.05, (rawPct + 1) / 2) : Math.max(0, rawPct);
                const validPct = Math.min(1, rawPct);

                const y = validPct - priorC;
                const t = priorSum + y;
                priorC = (t - priorSum) - y;
                priorSum = t;
                priorCount++;
            }

            runningPriors[j] = priorCount > 0 ? priorSum / priorCount : 0.5;
        }
    }

    const avgTotalRaw = history.length > 0
        ? kahanSum(history.map(safeTotalEntry)) / history.length
        : safeSyntheticTotal;

    const avgTotal = Number.isFinite(avgTotalRaw) && avgTotalRaw > 0 ? avgTotalRaw : safeSyntheticTotal;

    const rawBaseLambda = history.length > 0 ? computeAdaptiveLambda(historySortedForGaps) : 0.08;
    const baseAdaptiveLambda = Number.isFinite(rawBaseLambda)
        ? Math.max(0.005, Math.min(1, rawBaseLambda))
        : 0.08;

    if (history.length > 0) {
        const sortedHistory = historySortedForGaps;

        const MAX_ITERATIONS = 2000;
        const historyToProcess = sortedHistory.length > MAX_ITERATIONS
          ? sortedHistory.slice(-MAX_ITERATIONS) // Manter os mais recentes
          : sortedHistory;

        for (let i = 0; i < historyToProcess.length; i++) {
            const h = historyToProcess[i];

            const totalRaw = Number(h?.total);
            const hasTotal = Number.isFinite(totalRaw) && totalRaw > 0;
            const total = hasTotal ? totalRaw : 0;

            const normalizedScore = getSafeScore(h, safeMaxScore);
            if (!Number.isFinite(normalizedScore)) continue;

            const isPurePercentage = !hasTotal;

            let rawPct = normalizedScore / safeMaxScore;
            rawPct = options.isPenalizedFormat ? Math.max(0.05, (rawPct + 1) / 2) : Math.max(0, rawPct);
            const pct = Math.min(1, rawPct);

            const entryDate = normalizeDate(getHistoryDateValue(h));
            const prevDate = i > 0 ? normalizeDate(getHistoryDateValue(historyToProcess[i - 1])) : entryDate;

            const timeEntry = entryDate?.getTime();
            const timePrev = prevDate?.getTime();

            const gapDays = Number.isFinite(timeEntry) && Number.isFinite(timePrev)
                ? Math.max(0, Math.floor((timeEntry - timePrev) / 86400000))
                : 0;

            const rawLambda = baseAdaptiveLambda * Math.exp(-0.15 * i);
            const lambda = Math.max(0.005, Number.isFinite(rawLambda) ? rawLambda : baseAdaptiveLambda);

            const entryDecayRaw = i > 0 ? Math.exp(-lambda * gapDays) : 1.0;
            const entryDecay = Number.isFinite(entryDecayRaw) ? Math.max(0, Math.min(1, entryDecayRaw)) : 1.0;

            const cappedMaxN = Math.min(maxNEver, dynamicAlphaCap);
            const macroDecay = Math.max(0.1, Math.exp(-0.005 * (gapDays || 0)));
            const retentionFloor = (cappedMaxN * 0.3) * macroDecay;

            if (entryDecay < 1.0) {
                const nBeforeDecay = alpha + beta;

                if (Number.isFinite(nBeforeDecay) && nBeforeDecay > 0) {
                    const currentP = alpha / nBeforeDecay;
                    const minN = retentionFloor;
                    const HARD_FLOOR = 3.0;
                    const safeFloor = Math.min(HARD_FLOOR, nBeforeDecay);

                    const nAfterDecayRaw = Math.max(safeFloor, Math.min(nBeforeDecay, Math.max(minN, nBeforeDecay * entryDecay)));
                    const nAfterDecay = Number.isFinite(nAfterDecayRaw) ? nAfterDecayRaw : safeFloor;

                    const priorP = i > 0 ? runningPriors[i - 1] : runningPriors[0] || 0.5;
                    const safePriorP = Number.isFinite(priorP) ? priorP : 0.5;

                    const regressedPRaw = (currentP * entryDecay) + (safePriorP * (1 - entryDecay));
                    const regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;

                    alpha = nAfterDecay * regressedP;
                    beta = nAfterDecay * (1 - regressedP);
                }
            }

            const rawItemWeight = Number(h?.weight ?? h?.difficulty ?? 1.0);
            const itemWeight = Math.max(0.001, Number.isFinite(rawItemWeight) ? rawItemWeight : 1.0);

            const stepCap = dynamicAlphaCap;

            if (isPurePercentage) {
                const syntheticNRaw = avgTotal * itemWeight;
                const syntheticN = Number.isFinite(syntheticNRaw) && syntheticNRaw > 0 ? syntheticNRaw : 0;

                let alphaHoje = pct * syntheticN;
                let betaHoje = (1 - pct) * syntheticN;

                const sumHoje = alphaHoje + betaHoje;
                if (Number.isFinite(sumHoje) && sumHoje > stepCap && sumHoje > 0) {
                    const clampDiario = stepCap / sumHoje;
                    alphaHoje *= clampDiario;
                    betaHoje *= clampDiario;
                }

                alpha += Number.isFinite(alphaHoje) ? alphaHoje : 0;
                beta += Number.isFinite(betaHoje) ? betaHoje : 0;
            } else if (total >= 1) {
                let correct = Math.max(0, Math.round(pct * total));
                const safeCorrect = Math.max(0, Math.min(total, correct));

                let acertosHoje = Math.max(0, safeCorrect * itemWeight);
                let errosHoje = Math.max(0, (total - safeCorrect) * itemWeight);

                const sumHoje = acertosHoje + errosHoje;
                if (Number.isFinite(sumHoje) && sumHoje > stepCap && sumHoje > 0) {
                    const clampDiario = stepCap / sumHoje;
                    acertosHoje *= clampDiario;
                    errosHoje *= clampDiario;
                }

                alpha += Number.isFinite(acertosHoje) ? acertosHoje : 0;
                beta += Number.isFinite(errosHoje) ? errosHoje : 0;
            }

            // ✅ Renormalização incremental a cada 50 iterações
            if (i % 50 === 0 && (alpha + beta) > dynamicAlphaCap * 2) {
              const factor = dynamicAlphaCap / (alpha + beta);
              alpha *= factor;
              beta *= factor;
            }

            // ✅ Sanidade final — se alpha ou beta ficaram NaN/Infinity, resetar
            if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha < 0 || beta < 0) {
              alpha = alpha0;
              beta = beta0;
            }

            const currentN = alpha + beta;
            if (!Number.isFinite(currentN)) {
                alpha = alpha0;
                beta = beta0;
                break;
            }

            if (currentN > maxNEver) {
                maxNEver = Math.min(currentN, dynamicAlphaCap);
            }
        }
    }

    const nAfterLoop = alpha + beta;
    if (Number.isFinite(nAfterLoop) && nAfterLoop > dynamicAlphaCap && nAfterLoop > 0) {
        const globalClamp = dynamicAlphaCap / nAfterLoop;
        alpha *= globalClamp;
        beta *= globalClamp;
    }

    const lastEntry = historySortedForGaps.length > 0 ? historySortedForGaps[historySortedForGaps.length - 1] : null;
    const lastDateStr = lastEntry ? getHistoryDateValue(lastEntry) : options.lastEventDate;

    if (lastDateStr) {
        const lastDate = normalizeDate(lastDateStr);
        const gapToToday = Math.max(0, Math.floor((now - (lastDate ? lastDate.getTime() : now)) / 86400000));

        if (gapToToday > 0) {
            const rawFinalLambda = baseAdaptiveLambda * Math.exp(-0.15 * ((historySortedForGaps.length || 1) || 1));
            const finalLambda = Math.max(0.005, Number.isFinite(rawFinalLambda) ? rawFinalLambda : baseAdaptiveLambda);

            const finalDecayRaw = Math.exp(-finalLambda * gapToToday);
            const finalDecay = Number.isFinite(finalDecayRaw) ? Math.max(0, Math.min(1, finalDecayRaw)) : 1;

            const nBeforeDecay = alpha + beta;

            if (Number.isFinite(nBeforeDecay) && nBeforeDecay > 0) {
                const currentP = alpha / nBeforeDecay;

                const epistemicDecayRaw = Math.pow(finalDecay, 0.35);
                const epistemicDecay = Number.isFinite(epistemicDecayRaw) ? Math.max(0, Math.min(1, epistemicDecayRaw)) : 1;

                const safeMaxNEver = Number.isFinite(maxNEver) ? maxNEver : 0;
                const epistemicFloor = Math.max(3.0, Math.min(10.0, safeMaxNEver * 0.05));

                const nAfterDecayRaw = Math.max(epistemicFloor, Math.min(nBeforeDecay, nBeforeDecay * epistemicDecay));
                const nAfterDecay = Number.isFinite(nAfterDecayRaw) ? nAfterDecayRaw : Math.max(epistemicFloor, Math.min(nBeforeDecay, epistemicFloor));

                const empiricalPriorFinal = runningPriors.length > 0 ? runningPriors[runningPriors.length - 1] : 0.5;
                const safeEmpiricalPriorFinal = Number.isFinite(empiricalPriorFinal) ? empiricalPriorFinal : 0.5;

                const regressedPRaw = (currentP * finalDecay) + (safeEmpiricalPriorFinal * (1 - finalDecay));
                const regressedP = Number.isFinite(regressedPRaw) ? Math.max(0, Math.min(1, regressedPRaw)) : currentP;

                alpha = nAfterDecay * regressedP;
                beta = nAfterDecay * (1 - regressedP);
            }
        }
    }

    // FIX: Sanidade final — se alpha ou beta ficaram NaN/Infinity, resetar para prior
    if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha < 0 || beta < 0) {
      alpha = alpha0;
      beta = beta0;
    }

    const n = alpha + beta;

    if (!Number.isFinite(n) || n <= 0) {
        return { mean: 0, sd: 0, ciLow: 0, ciHigh: 0, alpha: alpha0, beta: beta0, n: 0 };
    }

    const effectiveN = Math.min(n, dynamicEffectiveN);
    const p = alpha / n;
    const effectiveAlpha = p * effectiveN;

    const z2 = Z_95 * Z_95;
    const n_tilde = effectiveN + z2;
    const p_tilde = (effectiveAlpha + z2 / 2) / n_tilde;

    const mediaDeQuestoesDoAlunoRaw = history.length > 0
        ? kahanSum(history.map(safeTotalEntry)) / history.length
        : 100;

    const mediaDeQuestoesDoAluno = Number.isFinite(mediaDeQuestoesDoAlunoRaw) && mediaDeQuestoesDoAlunoRaw > 0
        ? mediaDeQuestoesDoAlunoRaw
        : 100;

    const TAMANHO_PROVA_ESTIMADO = Math.max(20, Math.round(mediaDeQuestoesDoAluno));

    const rawEpistemicVar = (p_tilde * (1 - p_tilde)) / n_tilde;
    const epistemicVar = Number.isFinite(rawEpistemicVar) ? Math.max(1e-6, rawEpistemicVar) : 1e-6;

    const rawAleatoricVar = (p_tilde * (1 - p_tilde)) / TAMANHO_PROVA_ESTIMADO;
    const aleatoricVar = Number.isFinite(rawAleatoricVar) ? Math.max(1e-6, rawAleatoricVar) : 1e-6;

    const predictiveVariance = epistemicVar + aleatoricVar;
    const effectiveSd = Math.sqrt(Math.max(0, predictiveVariance));

    const tMultiplier = getConfidenceMultiplier(effectiveN, { allowFractional: true });
    const marginOfError = tMultiplier * effectiveSd * safeMaxScore;
    const adjustedMarginOfError = Number.isFinite(marginOfError) ? marginOfError : 0;

    const centerForCI = p_tilde * safeMaxScore;
    const trueMean = p * safeMaxScore;

    let ciLow = centerForCI - adjustedMarginOfError;
    let ciHigh = centerForCI + adjustedMarginOfError;

    if (!Number.isFinite(ciLow)) ciLow = Math.max(0, trueMean);
    if (!Number.isFinite(ciHigh)) ciHigh = Math.min(safeMaxScore, trueMean);

    if (trueMean < ciLow) ciLow = trueMean;
    if (trueMean > ciHigh) ciHigh = trueMean;

    const strictLow = Number.isFinite(ciLow) ? Math.max(0, ciLow) : 0;
    const strictHigh = Number.isFinite(ciHigh) ? Math.min(safeMaxScore, ciHigh) : safeMaxScore;

    let alphaOut = alpha;
    let betaOut = beta;

    if (n > dynamicEffectiveN && n > 0) {
        const factor = dynamicEffectiveN / n;
        alphaOut = alpha * factor;
        betaOut = beta * factor;
    }

    return {
        mean: trueMean,
        sd: effectiveSd * safeMaxScore,
        ciLow: strictLow,
        ciHigh: strictHigh,
        unclampedLow: ciLow,
        unclampedHigh: ciHigh,
        alpha: alphaOut,
        beta: betaOut,
        n: n > dynamicEffectiveN ? dynamicEffectiveN : n,
    };
}

export function computeCategoryStats(history, weight, _daysValue = 60, maxScore = 100) {
    const safeHistory = toHistoryArray(history);
    if (!safeHistory.length) return null;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);

    const rawSynthetic = getSyntheticTotal(safeMaxScore);
    const syntheticTotal = Number.isFinite(rawSynthetic) ? rawSynthetic : 20;

    const historyWithSynthetics = safeHistory
        .map(h => {
            const score = getSafeScore(h, safeMaxScore);
            const total = Number(h?.total);

            if ((!Number.isFinite(total) || total <= 0) && Number.isFinite(score)) {
                if (typeof h === 'number') {
                    return { score: h, total: syntheticTotal };
                }

                return {
                    ...(h && typeof h === 'object' ? h : { original: h }),
                    total: syntheticTotal
                };
            }

            return h;
        })
        .filter(Boolean);

    const validHistory = historyWithSynthetics.filter(h => {
        const total = Number(h?.total);
        return Number.isFinite(total) && total > 0;
    });

    const historyToUse = validHistory.length > 0 ? validHistory : historyWithSynthetics;

    const scores = historyToUse
        .map(h => getSafeScore(h, safeMaxScore))
        .filter(Number.isFinite);

    const validHistoryForMean = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore))
    );

    let sumWeightMean = 0;
    let sumScoreMean = 0;

    validHistoryForMean.forEach(h => {
        const totalWeight = Number(h?.total);
        if (!Number.isFinite(totalWeight) || totalWeight <= 0) return;

        const rawDiff = Number(h?.weight ?? h?.difficulty ?? 1.0);
        const diffWeight = Number.isFinite(rawDiff) && rawDiff >= 0 ? Math.max(0.001, rawDiff) : 1.0;
        const effW = totalWeight * diffWeight;

        sumWeightMean += effW;
        sumScoreMean += getSafeScore(h, safeMaxScore) * effW;
    });

    const mRaw = sumWeightMean > 0 ? sumScoreMean / sumWeightMean : mean(scores);
    const m = Number.isFinite(mRaw) ? mRaw : 0;

    let variance = 0;

    if (historyToUse.length > 1) {
        let wVarSum = 0;
        let sumW = 0;
        let sumW2 = 0;

        const sortedScores = [...scores].sort((a, b) => a - b);

        const median = sortedScores.length % 2 === 0
            ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
            : sortedScores[Math.floor(sortedScores.length / 2)];

        const absoluteDeviations = scores
            .map(s => Math.abs(s - median))
            .sort((a, b) => a - b);

        const rawMad = absoluteDeviations.length % 2 === 0
            ? (absoluteDeviations[absoluteDeviations.length / 2 - 1] + absoluteDeviations[absoluteDeviations.length / 2]) / 2
            : absoluteDeviations[Math.floor(absoluteDeviations.length / 2)];

        const mad = Number.isFinite(rawMad) && rawMad > 0 ? rawMad * 1.4826 : 0.001 * safeMaxScore;
        const clampLimit = 3.5 * mad;

        validHistoryForMean.forEach(h => {
            const totalWeight = Number(h?.total);
            if (!Number.isFinite(totalWeight) || totalWeight <= 0) return;

            const safeScore = getSafeScore(h, safeMaxScore);
            if (!Number.isFinite(safeScore)) return;

            const robustScore = Number.isFinite(median) && Number.isFinite(clampLimit)
                ? Math.max(median - clampLimit, Math.min(median + clampLimit, safeScore))
                : safeScore;

            const rawDiff = Number(h?.weight ?? h?.difficulty ?? 1.0);
            const difficultyWeight = Number.isFinite(rawDiff) && rawDiff >= 0 ? Math.max(0.001, rawDiff) : 1.0;
            const effectiveWeight = totalWeight * difficultyWeight;

            wVarSum += effectiveWeight * Math.pow(robustScore - m, 2);
            sumW += effectiveWeight;
            sumW2 += Math.pow(effectiveWeight, 2);
        });

        const kishDifference = sumW - (sumW > 0 ? (sumW2 / sumW) : 0);
        const kishDenom = kishDifference > 1e-4 ? kishDifference : Math.max(1e-4, sumW);

        const rawSampleVar = sumW > 0 ? wVarSum / kishDenom : 0;
        const sampleVar = Number.isFinite(rawSampleVar) ? Math.max(0, rawSampleVar) : 0;

        const POPULATION_SD = getDynamicPriorSD(historyToUse, safeMaxScore);
        const safePopulationSD = Number.isFinite(POPULATION_SD) ? POPULATION_SD : 0;
        const popVar = Math.pow(safePopulationSD, 2);

        const safeStudentVar = Math.max(popVar * 0.05, sampleVar);
        const ratio = safeStudentVar > 0 ? popVar / safeStudentVar : 3.0;

        let KAPPA = Math.max(0.1, Math.min(3.0, Number.isFinite(ratio) ? ratio : 3.0));

        const firstDateParsed = safeDateParse(getHistoryDateValue(historyToUse[0]));
        const lastDateParsed = safeDateParse(getHistoryDateValue(historyToUse[historyToUse.length - 1]));

        const firstDateMs = firstDateParsed && Number.isFinite(firstDateParsed.getTime())
            ? firstDateParsed.getTime()
            : Date.now();

        const lastDateMs = lastDateParsed && Number.isFinite(lastDateParsed.getTime())
            ? lastDateParsed.getTime()
            : Date.now();

        const timeSpreadDays = Math.max(0, (lastDateMs - firstDateMs) / 86400000);

        if (
            historyToUse.length >= 2 &&
            sampleVar < (0.0004 * safeMaxScore * safeMaxScore) &&
            timeSpreadDays > 7
        ) {
            KAPPA = KAPPA * Math.exp(-timeSpreadDays / 14);
        }

        const effectiveN = sumW2 > 0 ? (sumW * sumW) / sumW2 : historyToUse.length;
        const n_eff = Number.isFinite(effectiveN) ? Math.max(1, effectiveN) : 1;
        const kishDenomTerm = n_eff > 1.5 ? (n_eff - 1) : 1;

        const rawVariance = (kishDenomTerm * sampleVar + KAPPA * popVar) / (kishDenomTerm + KAPPA);
        variance = Number.isFinite(rawVariance) ? Math.max(0, rawVariance) : popVar;
    } else {
        const priorSD = getDynamicPriorSD(historyToUse, safeMaxScore);
        variance = Math.pow(Number.isFinite(priorSD) ? priorSD : 0, 2);
    }

    const sd = Math.max(Math.sqrt(Math.max(0, variance)), 0.001 * safeMaxScore);
    const safeSD = Number.isFinite(sd) ? sd : 0.001 * safeMaxScore;

    const slopePerDay = calculateSlope(historyToUse, safeMaxScore);
    const safeSlope = Number.isFinite(slopePerDay) ? slopePerDay : 0;

    const trendThreshold = getDynamicTrendThreshold(m, safeMaxScore);

    const validHistoryForTrend = historyToUse.filter(h =>
        Number.isFinite(getSafeScore(h, safeMaxScore))
    );

    const sortedForTrendCap = getSortedHistory(validHistoryForTrend);

    const lastScoreRaw = sortedForTrendCap.length > 0
        ? getSafeScore(sortedForTrendCap[sortedForTrendCap.length - 1], safeMaxScore)
        : m;

    const safeLastScore = Number.isFinite(lastScoreRaw) ? lastScoreRaw : m;

    const limiteSuperior = safeMaxScore - safeLastScore;
    const limiteInferior = -safeLastScore;

    const rawTrend = Math.max(limiteInferior, Math.min(limiteSuperior, safeSlope * 30));
    const safeRawTrend = Number.isFinite(rawTrend) ? rawTrend : 0;

    let trendLabel = 'stable';
    if (safeRawTrend > trendThreshold) trendLabel = 'up';
    else if (safeRawTrend < -trendThreshold) trendLabel = 'down';

    const level = m > 0.7 * safeMaxScore ? 'ALTO' : m > 0.4 * safeMaxScore ? 'MÉDIO' : 'BAIXO';

    return {
        mean: m,
        sd: safeSD,
        n: historyToUse.length,
        weight,
        history: safeHistory,
        trend: trendLabel,
        trendValue: safeRawTrend,
        level
    };
}

export const calculateEMA = (scores, alpha = 0.25) => {
    const clean = toHistoryArray(scores)
        .map(v => typeof v === 'number' ? v : getSafeScore(v, 100))
        .filter(Number.isFinite);

    if (!clean.length) return 0;

    let ema = clean[0];
    const maxObserved = clean.reduce((a, b) => Math.max(a, b), 1);

    for (let i = 1; i < clean.length; i++) {
        const delta = clean[i] - ema;
        const range = maxObserved;
        const absDelta = Math.abs(delta);

        const upBonus = Math.min(0.10, 0.05 * (absDelta / range));
        const downBonus = Math.min(0.03, 0.015 * (absDelta / range));
        const trendBonus = delta >= 0 ? upBonus : downBonus;
        const currentAlpha = Math.min(1, alpha + trendBonus);

        ema = (clean[i] * currentAlpha) + (ema * (1 - currentAlpha));
    }

    return Number.isFinite(ema) ? ema : 0;
};

export const calculateTimeWeightedEMA = (historicData, lambda = 0.05) => {
    const safeHistory = toHistoryArray(historicData);
    if (!safeHistory.length) return null;

    const validData = safeHistory.filter(d =>
        Number.isFinite(d?.score) && (d?.timestamp != null || d?.date != null)
    );

    if (!validData.length) return null;

    const getTime = (d) => {
        if (d?.timestamp != null && Number.isFinite(d.timestamp)) return d.timestamp;

        if (d?.date != null) {
            const ms = new Date(d.date).getTime();
            return Number.isFinite(ms) ? ms : NaN;
        }

        return NaN;
    };

    validData.sort((a, b) => getTime(a) - getTime(b));

    let ema = validData[0].score;
    let lastTime = getTime(validData[0]);

    for (let i = 1; i < validData.length; i++) {
        const currentItem = validData[i];
        const currentTime = getTime(currentItem);

        if (!Number.isFinite(currentTime) || !Number.isFinite(lastTime)) continue;

        const deltaDays = Math.max(0, (currentTime - lastTime) / 86400000);
        const dynamicAlpha = 1 - Math.exp(-lambda * deltaDays);
        const safeAlpha = Math.max(0.1, Math.min(1.0, dynamicAlpha));

        ema = safeAlpha * currentItem.score + (1 - safeAlpha) * ema;
        lastTime = currentTime;
    }

    return Number.isFinite(ema) ? ema : null;
};

export {
    computeBrierScore,
    computeLogLoss,
    summarizeCalibration,
    computeCalibrationDiagnostics,
    shrinkProbabilityToNeutral
} from '../utils/calibration.js';

export function computeHierarchicalAdjustment(categories, pooledSD) {
    const safeCategories = toHistoryArray(categories);
    if (!safeCategories.length) return safeCategories;

    const validCategories = safeCategories.filter(c =>
        Number.isFinite(c.mean) && Number.isFinite(c.n) && c.n > 0
    );

    if (!validCategories.length) return safeCategories;

    const globalMean = kahanSum(validCategories.map(c => c.mean || 0)) / Math.max(1, validCategories.length);

    const tau2 = kahanSum(validCategories.map(c => Math.pow((c.mean || 0) - globalMean, 2))) /
        Math.max(1, validCategories.length - 1);

    return safeCategories.map(cat => {
        if (!Number.isFinite(cat.mean) || !cat.n) {
            return { ...cat, bayesianMean: cat.mean, bayesianSd: cat.sd };
        }

        const localSD = Number.isFinite(cat.sd) ? cat.sd : (pooledSD || 15);
        const localVar = Math.pow(localSD, 2) / Math.max(1, cat.n);
        const denom = localVar + tau2;
        const B = denom > 1e-15 ? localVar / denom : 0;

        const bayesianMean = B * globalMean + (1 - B) * cat.mean;
        const popVar = Math.pow(pooledSD || 15, 2);
        const bayesianSd = Math.sqrt(Math.max(0, B * popVar + (1 - B) * Math.pow(localSD, 2)));

        return {
            ...cat,
            bayesianMean,
            bayesianSd,
            shrinkage: B
        };
    });
}

export function computeAgilityMetrics(history, targetSeconds = 120) {
    const safeHistory = toHistoryArray(history);
    if (!safeHistory.length) return { avgSeconds: 0, agilityPenalty: 0 };

    let totalTimeSpent = 0;
    let totalTimedQuestions = 0;

    for (const h of safeHistory) {
        if (h.timeSpent != null && h.timedQuestoes != null) {
            const ts = Number(h.timeSpent);
            const tq = Number(h.timedQuestoes);

            if (Number.isFinite(ts) && Number.isFinite(tq) && ts > 0 && tq > 0) {
                totalTimeSpent += ts;
                totalTimedQuestions += tq;
            }
        }
    }

    const avgSeconds = totalTimedQuestions > 0 ? totalTimeSpent / totalTimedQuestions : 0;
    const safeTarget = Math.max(30, Number(targetSeconds) || 120);

    const agilityPenalty = avgSeconds > safeTarget
        ? Math.min(0.4, (avgSeconds - safeTarget) / (safeTarget * 1.25))
        : 0;

    return {
        avgSeconds: Math.round(avgSeconds),
        agilityPenalty: Number(agilityPenalty.toFixed(4))
    };
}

export function calculateTrend(history, maxScore = 100) {
    const safeHistory = toHistoryArray(history);
    if (safeHistory.length < 2) return 0;

    const sorted = getSortedHistory(safeHistory);
    if (sorted.length < 2) return 0;

    const safeMaxScore = safeMaxScoreValue(maxScore, 100);

    const firstTime = safeDateParse(sorted[0]?.date ?? sorted[0]?.createdAt)?.getTime();
    const firstDate = Number.isFinite(firstTime) ? firstTime : Date.now();

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let validN = 0;

    for (let i = 0; i < sorted.length; i++) {
        const h = sorted[i];

        const dateParsed = safeDateParse(h?.date ?? h?.createdAt);
        const time = dateParsed?.getTime();

        if (!Number.isFinite(time)) continue;

        const x = (time - firstDate) / 86400000;
        const y = getSafeScore(h, safeMaxScore);

        if (!Number.isFinite(y)) continue;

        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        validN++;
    }

    if (validN < 2) return 0;

    const denominator = (validN * sumX2) - (sumX * sumX);
    if (Math.abs(denominator) < 1e-12) return 0;

    const slopePerDay = ((validN * sumXY) - (sumX * sumY)) / denominator;
    const result = slopePerDay * 10;

    return Number.isFinite(result) ? result : 0;
}
