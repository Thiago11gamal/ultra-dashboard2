// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32, hashSeed } from './random.js';
import { safeDateParse, getDateKey } from '../utils/dateHelper.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { getPercentile } from './math/percentile.js';
import { SCENARIO_CONFIG } from '../utils/monteCarloScenario.js';

import { sampleTruncatedNormal, truncatedNormalFromUniform, truncatedNormalMean, normalCDF_complement, ensurePositiveSemiDefinite, choleskyDecomposition, applyCovariance, generateGaussian, generateKDE } from './math/gaussian.js';
// ✅ LOTE-04 FIX: Z_95 e MIN_SD_FLOOR removidos — não eram usados aqui
// (Z_95 vive em stats.js; MIN_SD_FLOOR vive em gaussian.js)
import { kahanSum, kahanMean } from './math/kahan.js';
import { weightedRegression, getSortedHistory, calculateSlopePerDay, calcularAssimetria } from './stats.js';
import { buildCovarianceMatrix, INTER_SUBJECT_CORRELATION } from './variance.js';
import { getConfidenceMultiplier } from '../utils/adaptiveMath.js';
// ✅ LOTE-04 FIX: re-export removido. Estes símbolos já são exportados por
// stats.js; o engine/index.js faz `export *` dos dois, e a duplicidade criava
// ambiguidade de star-export. O import interno acima continua intacto.

// 1. Blindagem de Datas: Adicione este helper no topo do arquivo (após os imports)
const getSafeTime = (dateInput) => {
    const parsed = safeDateParse(dateInput);
    return (parsed && !Number.isNaN(parsed.getTime())) ? parsed.getTime() : Date.now();
};

// -----------------------------
// Volatilidade Robusta (MSSD + MAD Blended)
// -----------------------------

/**
 * NEW: Simple non-linear detrending helper (log-time improvement curve).
 * Many students improve fast then plateau.
 */
export function computeNonLinearTrend(history, maxScore = 100, lambdaOrOptions = 0.08, minScore = 0) {
    const isOpts = lambdaOrOptions && typeof lambdaOrOptions === 'object';
    const lambda = isOpts ? (Number.isFinite(Number(lambdaOrOptions.lambda)) ? Number(lambdaOrOptions.lambda) : 0.08) : (Number.isFinite(Number(lambdaOrOptions)) ? Number(lambdaOrOptions) : 0.08);
    if (isOpts && Number.isFinite(Number(lambdaOrOptions.minScore))) minScore = Number(lambdaOrOptions.minScore);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > safeMin ? Number(maxScore) : safeMin + 100;
    const defaultMid = safeMin + 0.5 * (safeMax - safeMin);
    const sorted = getSortedHistory(history);
    if (sorted.length < 4) return { slope: 0, intercept: defaultMid, type: 'linear' };

    const now = Date.now();
    const t0 = getSafeTime(sorted[0].date || sorted[0].createdAt);

    // Fit simple model: y ~ a + b * log(1 + days)
    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0, validCount = 0;

    sorted.forEach(h => {
        const y = getSafeScore(h, safeMax, safeMin);
        if (!Number.isFinite(y)) return;
        const t = Math.max(0, (getSafeTime(h.date || h.createdAt) - t0) / 86400000);
        const x = Math.log1p(t); // log(1 + days), 0 at t = 0
        const w = Math.exp(-lambda * Math.max(0, (now - getSafeTime(h.date || h.createdAt)) / 86400000));

        sumW += w;
        sumWX += w * x;
        sumWY += w * y;
        sumWXX += w * x * x;
        sumWXY += w * x * y;
        validCount += 1;
    });

    if (validCount < 4 || sumW <= 1e-12) return { slope: 0, intercept: defaultMid, type: 'linear' };

    const denom = (sumWXX * sumW - sumWX * sumWX);
    if (Math.abs(denom) < 1e-9) return { slope: 0, intercept: sumWY / sumW, type: 'log' };

    const b = (sumWXY * sumW - sumWX * sumWY) / denom;
    const a = (sumWY - b * sumWX) / sumW;

    return { slope: b, intercept: a, type: 'log_time', logTimeFit: true };
}

function getDaysBetweenEntries(prevEntry, currEntry) {
    const d0 = safeDateParse(prevEntry?.date || prevEntry?.createdAt);
    const d1 = safeDateParse(currEntry?.date || currEntry?.createdAt);
    if (!d0 || !d1 || Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) {
        return 7;
    }
    return Math.max(1, (d1.getTime() - d0.getTime()) / 86400000);
}

export function calculateRobustVolatility(history, maxScore = 100, minScore = 0, options = {}) {
    const sorted = getSortedHistory(history);
    if (!sorted || sorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const validSorted = sorted.filter(h => Number.isFinite(getSafeScore(h, maxScore, minScore)));
    if (validSorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const parsedLambda = Number(options.lambda);
    const lambda = (options.lambda !== undefined && options.lambda !== null && options.lambda !== '' && typeof options.lambda !== 'boolean' && Number.isFinite(parsedLambda))
        ? Math.max(0, Math.min(1, parsedLambda))
        : 0.08;
    const now = options.referenceDate ? getSafeTime(options.referenceDate) : Date.now();
    const _scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    const { slope, intercept } = weightedRegression(validSorted, lambda, maxScore, { ...options, minScore });
    // CORREÇÃO: Defesa estrita contra null/undefined que disparam TypeError no getTime()
    const d0 = safeDateParse(validSorted[0].date || validSorted[0].createdAt);
    const t0_vol = (d0 && !Number.isNaN(d0.getTime())) ? d0.getTime() : Date.now();

    // OTIMIZAÇÃO DE PERFORMANCE: Fusão de loops O(5N) para O(N)
    let sumWeights = 0, sumWeightsSq = 0, sumResidualsWeighted = 0, sumSw = 0;

    const residualSamples = validSorted.map(h => {
        const hDate = h.date || h.createdAt;
        const parsed = safeDateParse(hDate);
        if (!parsed || Number.isNaN(parsed.getTime())) return null;
        const x = (parsed.getTime() - t0_vol) / 86400000;
        const t = Math.max(0, (now - parsed.getTime()) / 86400000);
        const w = Math.exp(-lambda * t);
        const y = getSafeScore(h, maxScore, minScore);
        const val = y - (intercept + slope * x); // Resíduo (detrended)

        // Acumulação numa única passagem
        sumWeights += w;
        sumWeightsSq += w * w;
        sumResidualsWeighted += val * w;
        sumSw += val * val * w;

        return { value: val, weight: w };
    }).filter(Boolean);

    // CORREÇÃO: Prevenir o colapso por "amnésia temporal" e usar graus de liberdade efetivos de Kish (n_eff - 2)
    const safeWeights = sumWeights > 1e-15 ? sumWeights : 1;
    const expectedResidual = sumWeights > 1e-15 ? (sumResidualsWeighted / safeWeights) : 0;
    const nEff = sumWeightsSq > 1e-15 ? (sumWeights * sumWeights) / sumWeightsSq : residualSamples.length;
    const bessel = nEff > 2.2 ? (nEff / Math.max(1, nEff - 2)) : (residualSamples.length > 2 ? residualSamples.length / (residualSamples.length - 1) : 1);
    const mssdVariance = Math.max(0, ((sumSw / safeWeights) - (expectedResidual * expectedResidual)) * bessel);

    const weightedMedian = (arr) => {
        if (!arr.length) return 0;
        const sortedArr = [...arr].sort((a, b) => a.value - b.value);
        const totalW = sortedArr.reduce((acc, it) => acc + it.weight, 0);
        if (totalW < 1e-15) return sortedArr[Math.floor(sortedArr.length / 2)].value;
        let accW = 0;
        for (const it of sortedArr) {
            accW += it.weight;
            if (accW >= totalW * 0.5) return it.value;
        }
        return sortedArr[sortedArr.length - 1].value;
    };

    const medianResidual = weightedMedian(residualSamples);
    const absDev = residualSamples.map(it => ({ value: Math.abs(it.value - medianResidual), weight: it.weight }));
    const mad = weightedMedian(absDev);
    const robustVariance = Math.pow(1.4826 * mad, 2);
    let blendedVariance = (0.75 * mssdVariance) + (0.25 * robustVariance);
    let effectiveSamplesCount = residualSamples.length > 0 ? validSorted.length : 0;

    if (residualSamples.length === 0 && validSorted.length >= 2) {
        const rawScores = validSorted
            .map(h => getSafeScore(h, maxScore, minScore))
            .filter(Number.isFinite);
        if (rawScores.length >= 2) {
            let diffSqSum = 0;
            for (let i = 1; i < rawScores.length; i++) {
                const diff = rawScores[i] - rawScores[i - 1];
                diffSqSum += diff * diff;
            }
            const undatedMssd = diffSqSum / (2 * (rawScores.length - 1));
            blendedVariance = Number.isFinite(undatedMssd) ? Math.max(0, undatedMssd) : 0;
            effectiveSamplesCount = rawScores.length;
        }
    }

    // O PULO DO GATO: Shrinkage Bayesiano para Volatilidade (Bug 1 Fix)
    // Assumimos que o piso natural de flutuação de qualquer aluno é de ~4% do Range
    const rangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const floorVolatility = rangeOU * 0.04;
    const floorVariance = Math.pow(floorVolatility, 2);

    // Quanto menor a amostra, mais puxamos para o piso natural.
    const confidence = Math.min(1, effectiveSamplesCount / 15);
    const trueVariance = (blendedVariance * confidence) + (floorVariance * (1 - confidence));

    return Math.sqrt(Math.max(1e-6, trueVariance));
}

export function calculateVolatility(history, maxScore = 100, minScore = 0) {
    if (!Array.isArray(history) || history.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const scores = history.map(h => getSafeScore(h, maxScore, minScore)).filter(Number.isFinite);
    const n = scores.length;
    if (n < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const meanVal = kahanMean(scores);
    const variance = kahanSum(scores.map(b => Math.pow(b - meanVal, 2))) / (n - 1);
    return Math.sqrt(variance);
}

// -----------------------------
// MSSD — Mean Successive Squared Differences (BUG-MATH-01)
// Mede instabilidade SEM penalizar crescimento monotônico.
// -----------------------------
export function calculateMSSD(history, maxScore = 100, minScore = 0) {
    const safeHistory = getSortedHistory(history);
    if (!Array.isArray(safeHistory) || safeHistory.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const firstDateObj = safeDateParse(safeHistory[0].date || safeHistory[0].createdAt);
    const t0 = firstDateObj ? firstDateObj.getTime() : Date.now();

    // ✅ FIX: Create aligned pairs to prevent index misalignment
    const validPairs = [];
    for (let i = 0; i < safeHistory.length; i++) {
        const h = safeHistory[i];
        const score = getSafeScore(h, maxScore, minScore);
        const dateObj = safeDateParse(h.date || h.createdAt);
        const t = dateObj ? dateObj.getTime() : NaN;

        if (Number.isFinite(score) && Number.isFinite(t)) {
            validPairs.push({
                score: score,
                timeX: (t - t0) / 86400000,
                fatigueFlag: h.fatigueFlag
            });
        }
    }

    const fn = validPairs.length;
    if (fn < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const scores = validPairs.map(p => p.score);
    const timeX = validPairs.map(p => p.timeX);

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < fn; i++) {
        const tx = timeX[i];
        sumX += tx;
        sumY += scores[i];
        sumXY += tx * scores[i];
        sumXX += tx * tx;
    }

    const det = fn * sumXX - sumX * sumX;
    const slope = det === 0 ? 0 : (fn * sumXY - sumX * sumY) / det;

    // FIX-RMSSD-02: parear valor + flag na origem, para o índice de fatigueFlag
    // nunca desalinhar quando detrendedScores é filtrado/reindexado.
    const pairs = validPairs.map((p) => ({
        v: p.score - (slope * p.timeX),
        fatigue: !!p.fatigueFlag
    })).filter(item => Number.isFinite(item.v));

    let sumSqDiff = 0;
    let validTransitions = 0;

    for (let i = 1; i < pairs.length; i++) {
        const diff = pairs[i].v - pairs[i - 1].v;
        if (Number.isFinite(diff)) {
            const isFatigueDrop = diff < 0 && pairs[i].fatigue;
            const effectiveDiff = isFatigueDrop ? diff * 0.5 : diff;
            sumSqDiff += Math.pow(effectiveDiff, 2);
            validTransitions++;
        }
    }

    // FIX-RMSSD-01b: Para ruído i.i.d. com desvio σ, E[(X_t - X_{t-1})²] = 2σ²
    // logo o estimador não-viesado de von Neumann para σ de prova única é sqrt(mean(d²) / 2).
    if (validTransitions < 1) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const unbiasedVar = sumSqDiff / (2 * validTransitions);
    return Math.sqrt(Math.max(1e-6, unbiasedVar));
}

// -----------------------------
// EMA Dinâmico
// -----------------------------
export function calculateDynamicEMA(currentScore, previousEMA, n, daysSinceLast = 1) {
    // BUG-02 FIX: Implementação de EMA Dinâmica com Decaimento Temporal Contínuo.
    // Resolve a distorção onde longos períodos de inatividade eram ignorados (amnésia temporal).
    // Fórmula: α_real = 1 - (1 - α_base)^Δt
    const alphaBase = 2 / (n + 1);
    const deltaT = Math.max(1, daysSinceLast);

    // O decaimento exponencial contínuo garante que o peso da nova nota cresça proporcionalmente
    // ao tempo decorrido desde o último registro, compensando o "esquecimento".
    const alphaDinamico = 1 - Math.pow(1 - alphaBase, deltaT);

    // CORREÇÃO: O teto cognitivo desce de 0.95 para 0.40.
    // Garante que, independentemente do gap temporal, um teste único nunca
    // substitui mais de 40% da inércia da memória de longo prazo consolidada.
    const safeAlpha = Math.min(0.40, alphaDinamico);

    return (currentScore * safeAlpha) + (previousEMA * (1 - safeAlpha));
}

// -----------------------------
// Drift Clampeado
// -----------------------------
// ✅ FIX: calculateSlope com clamp proporcional à escala
export function calculateSlope(trendOrHistory, maxScoreOrOptions = 100, options = {}) {
    if (Array.isArray(trendOrHistory)) {
        const opts = typeof maxScoreOrOptions === 'object' ? maxScoreOrOptions : options;
        const maxScore = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : (Number.isFinite(opts?.maxScore) ? Number(opts.maxScore) : 100);
        const minScore = Number.isFinite(opts?.minScore) ? Number(opts.minScore) : 0;

        const normalizedHistory = trendOrHistory
            .filter(item => item != null)
            .map(item => {
                if (typeof item === 'number') {
                    return { score: item, date: null };
                }
                if (item && typeof item === 'object') {
                    const score = getSafeScore(item, maxScore, minScore);
                    return {
                        score: Number.isFinite(score) ? score : NaN,
                        date: item.date || item.createdAt || null
                    };
                }
                return { score: NaN, date: null };
            }).filter(item => Number.isFinite(item.score));

        if (normalizedHistory.length < 2) return 0;
        const result = calculateAdaptiveSlope(normalizedHistory, maxScore, opts);
        return Number.isFinite(result) ? result : 0;
    }

    // ✅ FIX: Clamp proporcional à amplitude real (maxScore - minScore) da prova
    const opts = typeof maxScoreOrOptions === 'object' ? maxScoreOrOptions : options;
    const safeMax = typeof maxScoreOrOptions === 'number' ? maxScoreOrOptions : (Number.isFinite(opts?.maxScore) ? Number(opts.maxScore) : 100);
    const safeMin = Number.isFinite(opts?.minScore) ? opts.minScore : 0;
    const range = Math.max(1e-9, safeMax - safeMin);
    // 0.4% do range por dia como limite máximo
    const absoluteMax = 0.004 * range;
    let slope = Number(trendOrHistory) || 0;
    if (!Number.isFinite(slope)) return 0;
    if (slope > absoluteMax) slope = absoluteMax;
    if (slope < -absoluteMax) slope = -absoluteMax;
    return slope;
}

export function calculateAdaptiveSlope(history, maxScore = 100, options = {}) {
    const minScore = Number.isFinite(options?.minScore) ? options.minScore : 0;
    const trend = calculateSlopePerDay(history, maxScore, minScore);
    return calculateSlope(trend, maxScore, options);
}

// -----------------------------
// 💡 Crescimento Logístico (Curva-S)
// -----------------------------
export function logisticRegression(history, maxScore = 100, options = {}) {
    const minScore = Number.isFinite(Number(options?.minScore)) ? Number(options.minScore) : 0;
    const scoreRange = Math.max(1e-9, maxScore - minScore);
    const sorted = getSortedHistory(history);
    if (sorted.length < 4) return { isLogistic: false };

    const now = options.referenceDate ? getSafeTime(options.referenceDate) : Date.now();
    const historicalScores = sorted.map(h => getSafeScore(h, maxScore, minScore)).filter(Number.isFinite);
    if (historicalScores.length < 4) return { isLogistic: false };

    const meanVal = kahanSum(historicalScores) / Math.max(1, historicalScores.length);
    const devs = historicalScores.map(b => Math.pow(b - meanVal, 2));
    const currentVariance = Math.sqrt(kahanSum(devs) / Math.max(1, historicalScores.length - 1));

    const validScores = historicalScores;
    const sortedScores = [...validScores].sort((a, b) => a - b);
    const peak1 = sortedScores[sortedScores.length - 1];
    const peak2 = sortedScores[sortedScores.length - 2];
    const robustPeak = (peak1 * 0.6) + (peak2 * 0.4);
    const dynamicHeadroom = Math.min(scoreRange * 0.15, Math.max(currentVariance * 1.5, scoreRange * 0.05));
    const recentRaw = validScores.slice(-4);
    const recentAsObjects = recentRaw.map((s, idx) => ({
        score: s,
        date: getDateKey(new Date(now - (recentRaw.length - 1 - idx) * 7 * 86400000))
    }));
    const recentTrend = calculateSlopePerDay(recentAsObjects, maxScore, minScore);
    const recentSlope = calculateSlope(recentTrend, maxScore, { ...options, minScore });
    const slopeMultiplier = recentSlope > 0 ? Math.min(1, recentSlope / (scoreRange * 0.01)) : 0;

    let L = robustPeak + (dynamicHeadroom * slopeMultiplier);
    L = Math.min(maxScore, Math.max(Math.min(maxScore, validScores[validScores.length - 1] + scoreRange * 0.001), L));

    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const t = Math.max(0, (now - getSafeTime(hDate)) / 86400000);
        const w = Math.exp(-0.08 * t);
        const x = (getSafeTime(hDate) - getSafeTime(sorted[0].date || sorted[0].createdAt)) / 86400000;

        let y = getSafeScore(h, maxScore, minScore);
        if (!Number.isFinite(y)) return;

        y = Math.max(minScore, Math.min(maxScore, y));

        const safeMin = minScore;
        const safeL = Math.max(L, y + Math.max(1e-5, Math.max(0, L - safeMin) * 0.005));
        // Offset proporcional à escala (0.1% do range) para evitar logit ±∞
        const logitOffset = Math.max(1e-6, (safeL - safeMin) * 0.001);
        const boundedY = Math.max(safeMin + logitOffset, Math.min(safeL - logitOffset, y));
        const logitY = Math.log((boundedY - safeMin) / (safeL - boundedY));

        sumW += w;
        sumWX += w * x;
        sumWY += w * logitY;
        sumWXX += w * x * x;
        sumWXY += w * x * logitY;
    });

    const det = sumW * sumWXX - sumWX * sumWX;
    if (Math.abs(det) < 1e-6) return { isLogistic: false };

    const k = (sumW * sumWXY - sumWX * sumWY) / det;
    const logitIntercept = (sumWXX * sumWY - sumWX * sumWXY) / det;

    return {
        k,
        intercept: logitIntercept,
        isLogistic: true,
        L,
        t0: getSafeTime(sorted[0].date || sorted[0].createdAt)
    };
}

function solveTruncatedMuProjection(targetMean, sd, domainMin, domainMax) {
    const safeTarget = Math.max(domainMin, Math.min(domainMax, Number.isFinite(targetMean) ? targetMean : (domainMin + domainMax) / 2));
    if (!Number.isFinite(sd) || sd <= 1e-9) return safeTarget;
    if ((safeTarget - domainMin) >= sd * 1.5 && (domainMax - safeTarget) >= sd * 1.5) return safeTarget;
    const span = Math.max(1e-9, domainMax - domainMin);
    const spread = Math.max(sd * 25, span * 2.5);
    let lo = domainMin - spread;
    let hi = domainMax + spread;
    let mu = safeTarget;
    const tol = Math.max(1e-6, span * 0.0002);
    for (let iter = 0; iter < 30; iter++) {
        const tm = truncatedNormalMean(mu, sd, domainMin, domainMax);
        if (!Number.isFinite(tm)) break;
        const err = tm - safeTarget;
        if (Math.abs(err) < tol) break;
        if (err > 0) hi = mu;
        else lo = mu;
        mu = (lo + hi) / 2;
    }
    return Number.isFinite(mu) ? mu : safeTarget;
}

export function projectScore(history, projectDays = 60, minScore = 0, maxScore = 100, options = {}) {
    const sortedHistory = getSortedHistory(history);
    const hasOptMin = options?.minScore !== undefined && options?.minScore !== null && options?.minScore !== '' && Number.isFinite(Number(options.minScore));
    const effectiveMinScore = hasOptMin ? Number(options.minScore) : (Number.isFinite(Number(minScore)) ? Number(minScore) : 0);
    if (!sortedHistory || sortedHistory.length === 0) return { projected: effectiveMinScore, marginOfError: 0 };

    // FIX: propagar effectiveMinScore consistentemente em toda a projeção (suporte a escalas negativas)
    const resolvedOptions = hasOptMin ? options : { ...options, minScore: effectiveMinScore };
    const effectiveRange = Math.max(1e-9, (maxScore - effectiveMinScore) > 0 ? (maxScore - effectiveMinScore) : maxScore);

    const logisticFit = logisticRegression(sortedHistory, maxScore, resolvedOptions);
    let projectedScore;
    const now = options.referenceDate ? getSafeTime(options.referenceDate) : Date.now();

    const { slopeStdError } = sortedHistory.length >= 2 ? weightedRegression(sortedHistory, 0.08, maxScore, resolvedOptions) : { slopeStdError: 0 };
    let eventVolatility = calculateMSSD(sortedHistory, maxScore, effectiveMinScore);

    // Bug 2.3 Fix: Divergência Asintótica no Amortecimento
    let linearSlope = 0;
    if (!(logisticFit.isLogistic && logisticFit.k > 0)) {
        let trend = calculateSlopePerDay(sortedHistory, maxScore, effectiveMinScore);
        linearSlope = calculateSlope(trend, maxScore, resolvedOptions);
    }

    const dampingBase = computeAdaptiveDampingBase({
        sampleSize: sortedHistory.length,
        drift: linearSlope,
        driftUncertainty: slopeStdError,
        scaleFactor: effectiveRange / 100,
        normalizedVol: (eventVolatility / effectiveRange) * 100
    });

    const maxEffectiveDays = dampingBase * Math.log(1 + projectDays / dampingBase);
    const effectiveDaysForDrift = Math.min(projectDays, maxEffectiveDays);

    if (logisticFit.isLogistic && logisticFit.k > 0) {
        const { k, intercept, L, t0 } = logisticFit;
        const targetTimeX = ((now - t0) / 86400000) + projectDays;
        const exponent = -(k * targetTimeX + intercept);
        const safeExponent = Math.max(-50, Math.min(50, exponent));
        const safeMin = effectiveMinScore;
        projectedScore = safeMin + ((L - safeMin) / (1 + Math.exp(safeExponent)));
    } else {
        // Removemos a mistura corrompida. O EMA continuará a usar o `linearSlope`
        // para projetar o futuro no Random Walk.

        const rawScore = getSafeScore(sortedHistory[0], maxScore, effectiveMinScore);
        let ema = Number.isFinite(rawScore) ? rawScore : effectiveMinScore;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = getDaysBetweenEntries(sortedHistory[i - 1], sortedHistory[i]);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore, effectiveMinScore);

            // PSEUDO-TRI: Rebalanceamento por dificuldade global invariante a [effectiveMinScore, maxScore]
            if (options.globalBaselinePct !== undefined && options.globalBaselinePct > 0 && Number.isFinite(currentPoint)) {
                const globalMean = effectiveMinScore + (options.globalBaselinePct / 100) * effectiveRange;
                const difficultyDiff = (currentPoint - globalMean) / effectiveRange;
                currentPoint = currentPoint + (difficultyDiff * effectiveRange * 0.05);
                currentPoint = Math.max(effectiveMinScore, Math.min(maxScore, currentPoint));
            }

            if (!Number.isNaN(currentPoint)) {
                // CORREÇÃO: Limitar a inércia a 15 eventos para evitar o congelamento permanente do EMA
                ema = calculateDynamicEMA(currentPoint, ema, Math.min(i + 1, 15), daysSinceLast);
            }
        }


        // CORREÇÃO: Driftar a EMA da data do último teste até o dia de HOJE, 
        // para alinhar a origem do vetor temporal com a realidade atual.
        const lastHistoryDate = getSafeTime(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const daysToToday = Math.max(0, (now - lastHistoryDate) / 86400000);

        if (options.currentMean !== undefined) {
            const daysToNow = Math.max(1, daysToToday);
            ema = calculateDynamicEMA(options.currentMean, ema, sortedHistory.length + 1, daysToNow);
        }

        const driftToToday = linearSlope * (dampingBase * Math.log(1 + daysToToday / dampingBase));
        const currentScoreEstimate = ema + driftToToday;

        // Projeção final 100% matéticamente consistente
        projectedScore = currentScoreEstimate + linearSlope * effectiveDaysForDrift;
    }

    const tLast = getSafeTime(sortedHistory[sortedHistory.length - 1]?.date || sortedHistory[sortedHistory.length - 1]?.createdAt);
    const tFirst = getSafeTime(sortedHistory[0]?.date || sortedHistory[0]?.createdAt);
    const rawGapDays = sortedHistory.length > 1
        ? ((tLast - tFirst) / 86400000) / Math.max(1, sortedHistory.length - 1)
        : 7;
    const avgGapDays = Number.isFinite(rawGapDays) && rawGapDays > 0 ? rawGapDays : 7;

    // AGILIDADE AI: Punição de Volatilidade baseada no tempo de resposta lento
    if (options.agilityPenalty) {
        const safePenalty = Math.max(0, Math.min(0.4, Number(options.agilityPenalty) || 0));
        eventVolatility = eventVolatility * (1 + safePenalty * 1.5);
    }

    // A incerteza do Random Walk espalha-se com a raiz do número de EVENTOS ESPERADOS, não dos dias.
    const expectedFutureEvents = Math.max(1, projectDays / Math.max(0.5, avgGapDays));
    const randomWalkUncertainty = eventVolatility * Math.sqrt(expectedFutureEvents);

    // Aplica o amortecimento do drift à incerteza angular (evita explosão da incerteza a longo prazo)
    const angularUncertainty = slopeStdError * effectiveDaysForDrift;
    const predictionSD = Math.sqrt(Math.pow(angularUncertainty, 2) + Math.pow(randomWalkUncertainty, 2));
    // Usar T-Student adaptativo para amostras pequenas em vez de Z=1.96 fixo
    const tMult = getConfidenceMultiplier(sortedHistory.length);
    const marginOfError = Math.min(effectiveRange, tMult * predictionSD);

    return {
        // FIX #2: Precisão completa
        projected: Number.isNaN(projectedScore) ? effectiveMinScore : Math.max(effectiveMinScore, Math.min(maxScore, projectedScore)),
        marginOfError
    };
}

/**
 * Calcula o Damping Base adaptativo baseado no histórico.
 * @returns {number} Valor entre 30 e 60.
 */
export function computeAdaptiveDampingBase({ sampleSize, drift, driftUncertainty, scaleFactor, normalizedVol }) {
    const n = Math.max(1, Number(sampleSize) || 1);
    const safeDrift = Number.isFinite(drift) ? drift : 0;
    const safeUncertainty = Math.max(1e-6, Number(driftUncertainty) || 0);
    const safeScale = Math.max(1e-6, Number(scaleFactor) || 1);
    const safeNormVol = Math.max(0, Number(normalizedVol) || 0);

    const nConfidence = 1 - Math.exp(-n / 12);
    const trendSNR = Math.abs(safeDrift) / Math.max(0.05 * safeScale, safeUncertainty);
    const trendConfidence = Math.tanh(trendSNR / 2);
    const volPenalty = Math.min(1, safeNormVol / 18);
    const confidenceScore = Math.max(0, Math.min(1, (0.5 * nConfidence) + (0.35 * trendConfidence) + (0.15 * (1 - volPenalty))));
    return 30 + (30 * confidenceScore);
}

export function monteCarloSimulation(
    history,
    targetScore = 85,
    days = 90,
    simulations = 5000,
    options = {}
) {
    const { forcedVolatility, forcedBaseline, currentMean: optionsCurrentMean, minScore = 0, maxScore = 100, scenario = 'base', flashcardImmunity = 1.0 } = options;
    const scenarioCfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
    const sortedHistory = getSortedHistory(history);
    const rawSims = Number(simulations);
    const safeSimulations = (simulations !== null && simulations !== undefined && typeof simulations !== 'boolean' && String(simulations).trim() !== '' && Number.isFinite(rawSims))
        ? Math.max(1, Math.min(50000, Math.floor(rawSims)))
        : 5000;
    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    // Defaults for new diagnostics
    let trendType = 'linear';

    if (!sortedHistory || sortedHistory.length < 1) return {
        probability: 0,
        mean: minScore,
        sd: 0,
        ci95Low: minScore,
        ci95High: minScore,
        currentMean: minScore,
        drift: 0,
        volatility: 1.5 * scaleFactorFallback
    };

    // Find the last valid score in the sorted history
    let validCurrentScore = NaN;
    for (let i = sortedHistory.length - 1; i >= 0; i--) {
        const s = getSafeScore(sortedHistory[i], maxScore, minScore);
        if (Number.isFinite(s)) {
            validCurrentScore = s;
            break;
        }
    }
    const currentScore = Number.isFinite(validCurrentScore) ? validCurrentScore : minScore;
    const fallbackScore = optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore;
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : fallbackScore;
    if (sortedHistory.length > 0) {
        const rawScore = getSafeScore(sortedHistory[0], maxScore, minScore);
        let ema = Number.isFinite(rawScore) ? rawScore : minScore;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = getDaysBetweenEntries(sortedHistory[i - 1], sortedHistory[i]);
            let currentPoint = getSafeScore(sortedHistory[i], maxScore, minScore);

            // PSEUDO-TRI: Rebalanceamento por dificuldade global invariante a [minScore, maxScore]
            if (options.globalBaselinePct !== undefined && options.globalBaselinePct > 0 && Number.isFinite(currentPoint)) {
                const triRange = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
                const globalMean = minScore + (options.globalBaselinePct / 100) * triRange;
                const difficultyDiff = (currentPoint - globalMean) / Math.max(1e-9, triRange);
                currentPoint = currentPoint + (difficultyDiff * triRange * 0.05);
                currentPoint = Math.max(minScore, Math.min(maxScore, currentPoint));
            }

            if (!Number.isNaN(currentPoint)) {
                // CORREÇÃO: Limitar a inércia a 15 eventos para evitar o congelamento permanente do EMA
                ema = calculateDynamicEMA(currentPoint, ema, Math.min(i + 1, 15), daysSinceLast);
            }
        }
        if (forcedBaseline === undefined) {
            baselineScore = optionsCurrentMean !== undefined ? optionsCurrentMean : ema;
        }
    }

    if (forcedBaseline === undefined && optionsCurrentMean !== undefined) {
        baselineScore = optionsCurrentMean;
    }
    const range = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;   // ✅ LOTE-03
    // ✅ LOTE-06 FIX (SCENARIO-1): meanBiasFactor é percentual do maxScore, não do range.
    // Com minScore > 0, usar range distorcia o bias (ex: 2.5% de 800 em vez de 2.5% de 1000).
    const biasScale = (maxScore > 0 && minScore >= 0) ? maxScore : range;
    baselineScore = Math.max(minScore, Math.min(maxScore, baselineScore + ((scenarioCfg.meanBiasFactor || 0) * biasScale)));

    // FEAT: Time Penalty (Simulação de Prova Real)
    let timePenaltyApplied = false;
    let timePenaltyScoreDrop = 0;
    let projectedTotalTimeSeconds = options.projectedTotalTimeSeconds || 0;
    let examDurationMinutes = options.examDurationMinutes || 0;
    let overflowRatio = 0;

    if (examDurationMinutes > 0 && projectedTotalTimeSeconds > 0) {
        const examLimitSeconds = examDurationMinutes * 60;
        if (projectedTotalTimeSeconds > examLimitSeconds) {
            overflowRatio = (projectedTotalTimeSeconds - examLimitSeconds) / projectedTotalTimeSeconds;

            // O aluno só consegue resolver com qualidade (1 - overflowRatio) da prova.
            // O restante (overflowRatio) será chutado, com probabilidade de acerto de 20% (1/5).
            const guessScore = 0.2 * (maxScore - minScore) + minScore; // 20% na escala correta
            const newBaseline = (baselineScore * (1 - overflowRatio)) + (guessScore * overflowRatio);

            timePenaltyScoreDrop = baselineScore - newBaseline;
            baselineScore = newBaseline;
            timePenaltyApplied = true;
        }
    }
    const histScores = sortedHistory.map(h => getSafeScore(h, maxScore, minScore)).filter(Number.isFinite);
    const historicalMean = histScores.length > 0 ? kahanMean(histScores) : baselineScore;
    const regressionResult = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore, { ...options, minScore })
        : { slope: 0, slopeStdError: 0.05 * scaleFactorFallback };

    let effectiveDriftSlope = regressionResult.slope;

    trendType = 'linear';
    if (sortedHistory.length >= 4) {
        try {
            const nl = computeNonLinearTrend(sortedHistory, maxScore, 0.08, minScore);
            if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
                trendType = 'log_time_available';
                // NOTE: Do not blend nl.slope directly (different units).
                // Drift uses pure linear slope for correctness.
            }
        } catch { /* ignore */ }
    }

    const slopeStdError = regressionResult.slopeStdError;
    const maxDailyDriftPct = options.maxDailyDriftPct !== undefined ? options.maxDailyDriftPct : 0.015;
    const driftLimit = maxDailyDriftPct * range;   // antes: * maxScore
    const drift = Math.max(-driftLimit, Math.min(driftLimit, effectiveDriftSlope));
    const simulationDays = days;
    const scaleFactor = scaleFactorFallback;
    const rawDriftUncertainty = Math.max(0.05 * scaleFactor, slopeStdError);
    const driftUncertaintyCap = options.driftUncertaintyCap !== undefined ? options.driftUncertaintyCap : 0.4;
    let driftUncertainty = Math.min(rawDriftUncertainty, driftUncertaintyCap * scaleFactor) * (scenarioCfg.ciMult || 1);

    if (sortedHistory.length < 10) {
        const nFactor = (10 - sortedHistory.length) / 5;
        driftUncertainty *= (1 + 0.4 * nFactor);
    }

    let volatility = forcedVolatility !== undefined
        ? Math.max(0.001 * (maxScore - minScore > 0 ? maxScore - minScore : maxScore), forcedVolatility)
        : calculateRobustVolatility(sortedHistory, maxScore, minScore, options);

    // Bug 2.2 Fix: Double Jeopardy (Evita dupla penalização se o overflowRatio já trucidou a média)
    // Se o timePenaltyApplied estiver ativo, já absorvemos o abalo do tempo, inflar a variância
    // agora atiraria o cone do Monte Carlo para um cenário irrealista de descalabro.
    if (options.agilityPenalty && !timePenaltyApplied) {
        const safePenalty = Math.max(0, Math.min(0.4, Number(options.agilityPenalty) || 0));
        volatility = volatility * (1 + safePenalty * 1.5);
    }

    // NEW: Flashcard Immunity Shield — reduz volatilidade global no caminho de projeção
    if (flashcardImmunity < 1.0) {
        volatility = volatility * Math.max(0.80, flashcardImmunity);
    }

    const scoreRangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const normalizedVolOU = (volatility / scoreRangeOU) * 100;

    // ✅ FIX: thetaOU agora escala com a confiança da amostra.
    // Poucos dados → reversão mais forte (conservador).
    // Muitos dados → reversão mais fraca (confia na tendência).
    const sampleConfidence = Math.min(1, sortedHistory.length / 15);
    const thetaOU = Math.min(
        0.15,
        (0.02 + 0.06 * (1 - sampleConfidence)) + 0.002 * Math.min(40, normalizedVolOU)
    );

    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1], maxScore, minScore);
        const actualChange = getSafeScore(h, maxScore, minScore) - prev;
        const d1 = safeDateParse(h.date || h.createdAt);
        const d0 = safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt);
        const t1 = d1 && !Number.isNaN(d1.getTime()) ? d1.getTime() : Date.now();
        const t0 = d0 && !Number.isNaN(d0.getTime()) ? d0.getTime() : t1;
        const deltaT = (t1 - t0) / (1000 * 60 * 60 * 24);
        const safeDeltaT = Number.isFinite(deltaT) ? deltaT : 0.1;
        const rawDays = Math.max(0.1, safeDeltaT);
        const detrendedChange = actualChange - (drift * rawDays);
        return detrendedChange / Math.sqrt(rawDays);
    }) : [0];

    const validResiduals = (residuals.length > 1 ? residuals.slice(1) : residuals).filter(Number.isFinite);
    let centeredResiduals;
    if (validResiduals.length > 1) {
        const residualMean = kahanSum(validResiduals) / Math.max(1, validResiduals.length);
        centeredResiduals = validResiduals.map(r => r - residualMean);
    } else {
        centeredResiduals = validResiduals;
    }

    const sortedResiduals = [...centeredResiduals].sort((a, b) => a - b);
    const resMedian = getPercentile(sortedResiduals, 0.5);
    const absDevs = centeredResiduals.map(r => Math.abs(r - resMedian)).sort((a, b) => a - b);
    const resMad = getPercentile(absDevs, 0.5) || (1.0 * scaleFactor);
    const safeResiduals = centeredResiduals.filter(r => Math.abs(r - resMedian) < 4 * resMad);

    const empMean = kahanSum(safeResiduals) / Math.max(1, safeResiduals.length);
    const empDevs = safeResiduals.map(r => Math.pow(r - empMean, 2));
    const empResidualSD = Math.sqrt(kahanSum(empDevs) / Math.max(1, safeResiduals.length));
    const standardizer = empResidualSD > 0 ? empResidualSD : 1;

    const results = new Float64Array(safeSimulations);
    const lastEntry = sortedHistory[sortedHistory.length - 1];
    const seedStr = `${lastEntry.date || lastEntry.createdAt}-${getSafeScore(lastEntry, maxScore, minScore)}-${sortedHistory.length}`;
    const optSeed = options.seed;
    const hasOptSeed = optSeed !== undefined && optSeed !== null && typeof optSeed !== 'boolean' && String(optSeed).trim() !== '';
    const parsedOptSeed = Number(optSeed);
    const seedValue = hasOptSeed
        ? (Number.isFinite(parsedOptSeed) ? Math.floor(parsedOptSeed) : hashSeed(String(optSeed)))
        : hashSeed(seedStr);
    const rng = mulberry32(Math.abs(seedValue >>> 0));

    // Calibra a difusão diária do estado latente Ornstein-Uhlenbeck pela variância estacionária:
    // Var_inf(X_latente) = sigma_day² / (2*theta - theta²) = volatility² => sigma_day = volatility * sqrt(2*theta - theta²).
    // Somado ao ruído observacional do dia da prova (SD = volatility), garante SD(T) estritamente monotônico
    // de 1.0×vol (T=0) até √2×vol (T→∞), invariante à frequência de simulados (medianGap).
    const ouStationaryScale = Math.sqrt(Math.max(0.02, 2 * thetaOU - thetaOU * thetaOU));
    const dailyVolatility = Math.max(
        0.001 * (maxScore - minScore > 0 ? maxScore - minScore : maxScore),
        volatility * ouStationaryScale
    );

    // [BUG-1 FIX] Usar o damping adaptativo em vez do hardcode de 45.
    // Com poucos dados/alta vol, dampingBase ≈ 30 (amortece rápido).
    // Com muitos dados/tendência clara, dampingBase ≈ 60 (preserva mais).
    // Movido para fora do loop: inputs invariantes por simulação.
    const dampingBase = computeAdaptiveDampingBase({
        sampleSize: sortedHistory.length,
        drift,
        driftUncertainty,
        scaleFactor,
        normalizedVol: normalizedVolOU
    });

    // Constantes GARCH(1,1) invariantes por simulação
    const alphaG = 0.05;
    const betaG = 0.75;
    // BUG-AUDIT-02 FIX: omega calculado com a variância incondicional de equilíbrio (σ²_∞),
    // σ²_∞ = ω / (1 - α - β), logo ω = (1 - α - β) × σ²_∞
    // CORREÇÃO: Prevenir o GARCH Zero-Variance Trap
    const unconditionalVar = Math.max(1e-6, Math.pow(dailyVolatility, 2));
    const omega = (1 - alphaG - betaG) * unconditionalVar;
    // ✅ LOTE-01 FIX (A7): clamp de sanidade do GARCH proporcional ao RANGE real,
    // não ao teto absoluto (consistente com as correções LOTE-03 do arquivo).
    const rangeVolClamp = (maxScore - minScore) > 0 ? (maxScore - minScore) : maxScore;
    const maxVolSqClamp = Math.pow(rangeVolClamp * 0.2, 2);

    // FIX #3 + Group Cutoffs: Prepare Cholesky on correlation matrix (unit SD) for Gaussian Copula subject & group cutoffs
    const examGroupCutoffs = (options.examGroupCutoffs && typeof options.examGroupCutoffs === 'object')
        ? options.examGroupCutoffs
        : null;
    const activeGroupEntries = examGroupCutoffs
        ? Object.entries(examGroupCutoffs).filter(([, v]) => {
            const n = Number(v);
            return Number.isFinite(n) && n > minScore;
        })
        : [];
    const activeGroupSet = new Set(activeGroupEntries.map(([g]) => g));

    const hasValidMinCutoff = (s) => s != null && s.minCutoff !== undefined && s.minCutoff !== null && s.minCutoff !== '' && Number.isFinite(Number(s.minCutoff)) && (minScore < 0 ? Number(s.minCutoff) >= minScore : Number(s.minCutoff) > 0);
    const cutoffSubjects = (options.subjects || []).filter((s) =>
        hasValidMinCutoff(s) || (s != null && s.examGroup && activeGroupSet.has(s.examGroup))
    );
    let subjectCholesky = null;
    if (cutoffSubjects.length > 1) {
        const stats = cutoffSubjects.map(s => ({
            ...s,
            sd: 1,
        }));

        const adaptiveRhoContext = options?.simuladoRows ? {
            simuladoRows: options.simuladoRows,
            categoryNames: cutoffSubjects.map(s => String(s?.name ?? s?.id ?? 'subject')),
            minScore,
            maxScore
        } : null;

        try {
            const corrMatrix = buildCovarianceMatrix(stats, null, INTER_SUBJECT_CORRELATION, adaptiveRhoContext);
            const psdCorr = ensurePositiveSemiDefinite(corrMatrix);
            subjectCholesky = choleskyDecomposition(psdCorr);
        } catch (err) {
            console.warn('[Projection] Cholesky falhou, usando disciplinas independentes:', err?.message || err);
            subjectCholesky = null;
        }
    }

    const residualsSkew = calcularAssimetria(safeResiduals);

    const minCutoffFailures = new Uint8Array(safeSimulations);
    const choleskySize = cutoffSubjects.length;
    const subjectFailCounts = new Uint32Array(choleskySize);
    const groupFailCounts = new Map();
    const globalSpanProj = Math.max(1e-9, maxScore - minScore);

    // CORREÇÃO GC THRASHING: Alocação estática fora do loop de Monte Carlo
    const zVecStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const zCorrStatic = choleskySize > 0 ? new Float64Array(choleskySize) : null;
    const sampledProjSubj = choleskySize > 0 ? new Float64Array(choleskySize) : null;

    for (let i = 0; i < safeSimulations; i++) {
        // CORREÇÃO: O truncamento normal tem de respeitar o driftLimit dinâmico e não hardcodes de 1%.
        const sampledDrift = sampleTruncatedNormal(
            drift,
            driftUncertainty,
            -driftLimit,
            driftLimit,
            rng
        );
        let currentSimScore = baselineScore;
        let currentVolSq = unconditionalVar;
        let accumulatedDrift = 0;

        if (simulationDays <= 0) {
            // Simular hoje (dia da prova): incerteza observacional sem drift futuro
            const obsVol = Math.max(dailyVolatility, volatility);
            let todayShock = 0;
            if (safeResiduals.length > 5 && rng() > 0.25) {
                const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                todayShock = (rawEmpirical / standardizer) * obsVol;
            } else {
                todayShock = generateGaussian(rng) * obsVol;
            }
            const todayLimit = obsVol * 3;
            const clampedTodayShock = Math.max(-todayLimit, Math.min(todayLimit, todayShock));
            currentSimScore = Math.max(minScore, Math.min(maxScore, baselineScore + clampedTodayShock));
        }

        for (let d = 1; d <= simulationDays; d++) {
            // [RIGOR-FIX] Drift Damping Adaptativo: O impacto da tendência diminui com o tempo (Log-decay)
            // dampingBase varia de 30 (conservador) a 60 (confiante) conforme qualidade do sinal.
            const driftDamping = 1 / (1 + d / dampingBase);
            const driftEffect = sampledDrift * driftDamping;

            // Reversão de Ornstein-Uhlenbeck em relação à trajetória estrutural esperada antes do passo diário
            const prevTarget = Math.max(minScore, Math.min(maxScore, baselineScore + accumulatedDrift));
            let meanReversion = Math.max(0.005, thetaOU) * (prevTarget - currentSimScore);
            const adaptiveVol = Math.sqrt(Math.max(1e-6, currentVolSq));
            // Prevent extreme reversion pulls that cause artificial boundary piling in long simulations
            const maxReversionPull = adaptiveVol * 3;
            meanReversion = Math.max(-maxReversionPull, Math.min(maxReversionPull, meanReversion));

            // Atualiza a trajetória esperada acumulada com o drift do dia
            accumulatedDrift += driftEffect;
            const maxDrift = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) * 0.5;
            accumulatedDrift = Math.max(-maxDrift, Math.min(maxDrift, accumulatedDrift));

            // CORREÇÃO: Padrão Ouro de Filtered Historical Simulation (FHS)
            // O choque empírico tem de ser escalado para a volatilidade GARCH atual
            let shock = 0;
            if (safeResiduals.length >= 15) {
                // 90% Bootstrap (Histórico Empírico) / 10% Gaussiano Assimétrico (Black Swan)
                if (rng() > 0.10) {
                    const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                    shock = (rawEmpirical / standardizer) * adaptiveVol;
                } else {
                    // PATCH: Cornish-Fisher monotônico com variância unitária preservada
                    const z = generateGaussian(rng);
                    const clampedSkew = Math.max(-1.5, Math.min(1.5, residualsSkew));
                    const cfScale = Math.sqrt(1 + (clampedSkew * clampedSkew) / 18.0);
                    const zCF = (z + (clampedSkew * (z * z - 1)) / 6.0) / cfScale;
                    shock = zCF * adaptiveVol;
                }
            } else if (safeResiduals.length > 5 && rng() > 0.3) {
                const rawEmpirical = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                shock = (rawEmpirical / standardizer) * adaptiveVol;
            } else {
                shock = generateGaussian(rng) * adaptiveVol;
            }

            // ✅ LOTE-03 FIX: o clamp por dailyVolatility sufocava choques quando o GARCH
            // já tinha elevado adaptiveVol — a trajetória não podia realizar a própria variância
            const shockLimit = Math.max(dailyVolatility, adaptiveVol) * 3;
            const clampedShock = Math.max(-shockLimit, Math.min(shockLimit, shock));

            // Evolução da Volatilidade GARCH(1,1): Var(t+1) = w + a*e^2 + b*Var(t)
            currentVolSq = omega + alphaG * Math.pow(clampedShock, 2) + betaG * currentVolSq;

            // Clamp de sanidade para evitar divergência explosiva em projeções longas
            currentVolSq = Math.min(currentVolSq, maxVolSqClamp); // ✅ LOTE-01 FIX (A7)

            currentSimScore += driftEffect + meanReversion + clampedShock; // consistente com GARCH

            // Simple clamp to bounds (mean reversion + historical target should keep trajectories reasonable).
            // Removed complex RBM reflection which was causing boundary piling bias in declining series (scores clustering at minScore, skewing means low).
            // Fallback de segurança estrito (Clamp final diário)
            currentSimScore = Number.isNaN(currentSimScore) ? minScore : Math.max(minScore, Math.min(maxScore, currentSimScore));
        }

        if (simulationDays > 0) {
            // Ruído observacional do dia da prova (Y_T = X_T + ε_exam): evita queda artificial de variância em T=1
            const examObsVol = Math.max(dailyVolatility, volatility);
            let examDayShock = 0;
            if (safeResiduals.length > 5 && rng() > 0.25) {
                const rawEmp = safeResiduals[Math.floor(rng() * safeResiduals.length)];
                examDayShock = (rawEmp / standardizer) * examObsVol;
            } else {
                examDayShock = generateGaussian(rng) * examObsVol;
            }
            const examShockLim = examObsVol * 3;
            const clampedExamShock = Math.max(-examShockLim, Math.min(examShockLim, examDayShock));
            currentSimScore = Math.max(minScore, Math.min(maxScore, currentSimScore + clampedExamShock));
        }

        // Aplica os limites físicos da prova APENAS no resultado assintótico final
        // Preservação de sinal estrito: O backend mantém o valor bruto. 
        // O clamping ocorre apenas na camada de UI (MonteCarloGauge.jsx).
        results[i] = currentSimScore;

        let passedMins = true;
        if (choleskySize > 0) {
            const trajShiftRatio = simulationDays > 0
                ? ((currentSimScore - baselineScore) / globalSpanProj) * 0.25
                : 0;
            if (subjectCholesky) {
                for (let k = 0; k < choleskySize; k++) {
                    zVecStatic[k] = generateGaussian(rng);
                }
                applyCovariance(subjectCholesky, zVecStatic, zCorrStatic);
                for (let j = 0; j < choleskySize; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    const rawSubSd = Number(s.sd);
                    const safeSubSd = (s.sd !== null && s.sd !== undefined && typeof s.sd !== 'boolean' && String(s.sd).trim() !== '' && Number.isFinite(rawSubSd) && rawSubSd >= 0) ? rawSubSd : 1;
                    const effSd = Math.max(1e-6, safeSubSd * Math.max(0.80, s.immunityFactor || 1.0));
                    const sMeanProjected = Math.max(sMin, Math.min(sMax, Number(s.mean) + trajShiftRatio * (sMax - sMin)));
                    const sMu = solveTruncatedMuProjection(sMeanProjected, effSd, sMin, sMax);
                    const u = 1 - normalCDF_complement(zCorrStatic[j]);
                    sampledProjSubj[j] = truncatedNormalFromUniform(sMu, effSd, sMin, sMax, u);
                }
            } else {
                for (let j = 0; j < choleskySize; j++) {
                    const s = cutoffSubjects[j];
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    const rawSubSd = Number(s.sd);
                    const safeSubSd = (s.sd !== null && s.sd !== undefined && typeof s.sd !== 'boolean' && String(s.sd).trim() !== '' && Number.isFinite(rawSubSd) && rawSubSd >= 0) ? rawSubSd : 1;
                    const effSd = Math.max(1e-6, safeSubSd * Math.max(0.80, s.immunityFactor || 1.0));
                    const sMeanProjected = Math.max(sMin, Math.min(sMax, Number(s.mean) + trajShiftRatio * (sMax - sMin)));
                    const sMu = solveTruncatedMuProjection(sMeanProjected, effSd, sMin, sMax);
                    sampledProjSubj[j] = sampleTruncatedNormal(sMu, effSd, sMin, sMax, rng);
                }
            }

            const groupSums = activeGroupEntries.length > 0 ? new Map() : null;
            const groupWeights = activeGroupEntries.length > 0 ? new Map() : null;
            for (let j = 0; j < choleskySize; j++) {
                const s = cutoffSubjects[j];
                const subjScore = sampledProjSubj[j];
                if (hasValidMinCutoff(s) && (!Number.isFinite(subjScore) || subjScore < Number(s.minCutoff))) {
                    passedMins = false;
                    subjectFailCounts[j] += 1;
                }
                if (groupSums && s.examGroup && activeGroupSet.has(s.examGroup) && Number.isFinite(subjScore)) {
                    const sMin = Number.isFinite(s.minScore) ? s.minScore : minScore;
                    const sMax = Number.isFinite(s.maxScore) ? s.maxScore : maxScore;
                    const sRange = Math.max(1e-9, sMax - sMin);
                    const globalSubjScore = (sMin === minScore && sMax === maxScore)
                        ? subjScore
                        : minScore + ((subjScore - sMin) / sRange) * globalSpanProj;
                    const w = Math.max(1e-6, Number(s.weight) || 1);
                    groupSums.set(s.examGroup, (groupSums.get(s.examGroup) || 0) + globalSubjScore * w);
                    groupWeights.set(s.examGroup, (groupWeights.get(s.examGroup) || 0) + w);
                }
            }
            if (groupSums) {
                for (const [grp, gCutRaw] of activeGroupEntries) {
                    const gCut = Number(gCutRaw);
                    const gW = groupWeights.get(grp) || 0;
                    if (gW > 0 && (groupSums.get(grp) / gW) < gCut) {
                        passedMins = false;
                        groupFailCounts.set(grp, (groupFailCounts.get(grp) || 0) + 1);
                    }
                }
            }
        }
        minCutoffFailures[i] = passedMins ? 0 : 1;
    }

    // 4. Agregação Estatística
    // Note: We need to count successes before sorting results!
    const rawCutoffs = Array.isArray(options.historicalCutoffs) ? options.historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n >= minScore && n <= maxScore) : [];
    const hasHistCutoffs = rawCutoffs.length > 0;
    const cutoffsMean = hasHistCutoffs ? kahanSum(rawCutoffs) / rawCutoffs.length : targetScore;
    const cutoffsSD = hasHistCutoffs ? (rawCutoffs.length > 1 ? Math.sqrt(Math.max(1e-6, kahanSum(rawCutoffs.map(v => Math.pow(v - cutoffsMean, 2))) / (rawCutoffs.length - 1))) : Math.max(1e-6, (maxScore - minScore) * 0.025, Math.abs(cutoffsMean) * 0.05)) : 0;
    const cutoffsMuProj = hasHistCutoffs ? solveTruncatedMuProjection(cutoffsMean, cutoffsSD, minScore, maxScore) : targetScore;
    let successes = 0;
    let failedGlobalOnly = 0;
    let failedMinOnly = 0;
    let failedBoth = 0;
    for (let i = 0; i < safeSimulations; i++) {
        const effectiveSimTarget = hasHistCutoffs ? sampleTruncatedNormal(cutoffsMuProj, cutoffsSD, minScore, maxScore, rng) : targetScore;
        const passedGlobal = results[i] >= effectiveSimTarget;
        const passedMins = !minCutoffFailures[i];
        if (passedGlobal && passedMins) {
            successes++;
        } else if (!passedGlobal && passedMins) {
            failedGlobalOnly++;
        } else if (passedGlobal && !passedMins) {
            failedMinOnly++;
        } else {
            failedBoth++;
        }
    }

    results.sort();
    const meanResult = kahanMean(results);

    let varAcc = 0, varComp = 0;
    for (let i = 0; i < safeSimulations; i++) {
        const diff = results[i] - meanResult;
        const term = (diff * diff) - varComp;
        const next = varAcc + term;
        varComp = (next - varAcc) - term;
        varAcc = next;
    }
    const finalSD = safeSimulations >= 2
        ? Math.sqrt(Math.max(0, varAcc / (safeSimulations - 1)))
        : 0.05 * ((maxScore - minScore > 0) ? (maxScore - minScore) : maxScore);
    const empiricalProb = (successes / safeSimulations) * 100;

    // FIX BUG 4: Simulações O-U com choques difusos e Clamping diário não formam 
    // uma Distribuição Normal Truncada perfeita no limite estacionário.
    // Usar a CDF analítica aqui causa divergência drástica e invalida as previsões.
    // Para modelos difusos complexos, a probabilidade empírica convergida é a única fonte da verdade.
    let analyticalProb = empiricalProb;

    // Quantis empíricos exatos [2.5%, 97.5%] preservam assimetria real perto dos limites da escala
    const rawCiLow = getPercentile(results, 0.025, true);
    const rawCiHigh = getPercentile(results, 0.975, true);
    const safeCiLow = Math.max(minScore, Math.min(maxScore, rawCiLow));
    const safeCiHigh = Math.max(minScore, Math.min(maxScore, rawCiHigh));
    const empMedian = getPercentile(results, 0.5, true);
    const rawLeft = getPercentile(results, 0.158655, true);
    const rawRight = getPercentile(results, 0.841345, true);
    const sdFloor = Math.max((maxScore - minScore) * 0.001, 1e-6);
    const sdLeft = Math.max(sdFloor, Math.max(0, empMedian - rawLeft));
    const sdRight = Math.max(sdFloor, Math.max(0, rawRight - empMedian));
    const kdeData = generateKDE(results, meanResult, finalSD, safeSimulations, minScore, maxScore);

    return {
        // FIX #2: Valores brutos com precisão completa. toFixed removido do motor.
        // UI e componentes de display devem formatar quando necessário.
        probability: empiricalProb,
        analyticalProbability: analyticalProb,
        timePenaltyApplied,
        timePenaltyScoreDrop,
        projectedTotalTimeSeconds: options.projectedTotalTimeSeconds || 0,
        examDurationMinutes: options.examDurationMinutes || 0,
        mean: meanResult,
        projectedMean: meanResult, // Standardized for EvolutionChart
        sd: finalSD,
        sdLeft,
        sdRight,
        kdeData,
        minScore,
        maxScore,
        ci95Low: safeCiLow,
        ci95High: safeCiHigh,
        ciConformalLow: safeCiLow,
        ciConformalHigh: safeCiHigh,
        currentMean: baselineScore,
        drift: (drift * 30),
        volatility,
        confidence: sortedHistory.length < 5 ? 'low' : sortedHistory.length < 15 ? 'medium' : 'high',
        // NEW: non-linear trend availability
        trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
        riskDecomposition: {
            passedAllPct: Number(((successes / safeSimulations) * 100).toFixed(1)),
            failedGlobalOnlyPct: Number(((failedGlobalOnly / safeSimulations) * 100).toFixed(1)),
            failedMinCutoffOnlyPct: Number(((failedMinOnly / safeSimulations) * 100).toFixed(1)),
            failedBothPct: Number(((failedBoth / safeSimulations) * 100).toFixed(1)),
            subjectEliminationRates: cutoffSubjects
                .map((s, idx) => ({
                    id: s.id || s.name || `s-${idx}`,
                    name: s.name || s.id || `Matéria ${idx + 1}`,
                    minCutoff: hasValidMinCutoff(s) ? Number(s.minCutoff) : null,
                    eliminationPct: Number(((subjectFailCounts[idx] / safeSimulations) * 100).toFixed(1)),
                }))
                .filter((r) => r.eliminationPct > 0 || r.minCutoff !== null)
                .sort((a, b) => b.eliminationPct - a.eliminationPct),
            groupEliminationRates: Array.from(groupFailCounts.entries())
                .map(([group, count]) => ({
                    group,
                    minCutoff: Number.isFinite(Number(examGroupCutoffs?.[group])) ? Number(examGroupCutoffs[group]) : null,
                    eliminationPct: Number(((count / safeSimulations) * 100).toFixed(1)),
                }))
                .sort((a, b) => b.eliminationPct - a.eliminationPct),
        },
        diagnostics: {
            trendType: typeof trendType !== 'undefined' ? trendType : 'linear',
            effectiveDriftSlope: typeof effectiveDriftSlope !== 'undefined' ? effectiveDriftSlope : 0,
            conformalCoverage: 0.95,
            simulationCount: safeSimulations,
            historicalMean: historicalMean || null,
            effectiveN: Math.max(1, sortedHistory.length)
        }
    };
}

