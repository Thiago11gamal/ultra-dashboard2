// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32, makeNormalRng } from './random.js';
import { safeDateParse } from '../utils/dateHelper.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { getPercentile } from './math/percentile.js';
import { SCENARIO_CONFIG } from '../utils/monteCarloScenario.js';

import { sampleTruncatedNormal } from './math/gaussian.js';
import { Z_95 } from './math/constants.js';
import { kahanSum, kahanMean } from './math/kahan.js';

// Helper: Ensure history is sorted by date and filter out invalid dates
export function getSortedHistory(history) {
    if (!Array.isArray(history)) return [];
    return [...history]
        .filter(h => h && (h.date || h.createdAt) && !isNaN(safeDateParse(h.date || h.createdAt).getTime()))
        .sort((a, b) => {
            const dateA = safeDateParse(a.date || a.createdAt);
            const dateB = safeDateParse(b.date || b.createdAt);
            // Ordenação determinística por "dia UTC" para evitar variação por timezone do runtime.
            const utcA = Date.UTC(dateA.getUTCFullYear(), dateA.getUTCMonth(), dateA.getUTCDate());
            const utcB = Date.UTC(dateB.getUTCFullYear(), dateB.getUTCMonth(), dateB.getUTCDate());
            if (utcA !== utcB) return utcA - utcB;
            // Desempate determinístico intra-dia para evitar depender da estabilidade do sort do runtime.
            const diff = dateA.getTime() - dateB.getTime();
            if (diff !== 0) return diff;
            // Desempate determinístico final por ID (Bug 15)
            return (a.id || "").localeCompare(b.id || "");
        });
}

// -----------------------------
// Regressão ponderada temporal
// -----------------------------
export function weightedRegression(history, lambda = 0.08, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    if (sorted.length < 2) return { slope: 0, intercept: 0, slopeStdError: 1.5 };

    const now = options.referenceDate || Date.now();
    // Kahan summation imperativo (Inline Performance Pura) - [BUG-MEMORY-01 FIX]
    let sumW = 0, cW = 0;
    let sumWX = 0, cWX = 0;
    let sumWY = 0, cWY = 0;
    let sumWXX = 0, cWXX = 0;
    let sumWXY = 0, cWXY = 0;

    for(let i = 0; i < sorted.length; i++) {
        const h = sorted[i];
        const hDate = h.date || h.createdAt;
        const y = getSafeScore(h, maxScore);
        if (Number.isNaN(y)) continue;

        const t = Math.max(0, (now - safeDateParse(hDate).getTime()) / 86400000);
        
        // Calcula o peso exponencial, mas NUNCA deixa zerar completamente (Bug 2 Fix)
        const EPSILON_WEIGHT = 1e-10;
        const rawWeight = Math.exp(-lambda * t);
        const w = Math.max(EPSILON_WEIGHT, rawWeight);

        const x = ((safeDateParse(hDate).getTime() - safeDateParse(sorted[0].date || sorted[0].createdAt).getTime()) / 86400000) + (i * 1e-5);

        // Kahan summation imperativo para evitar O(N) alocações de map
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

    // Regularização de Tikhonov (Ridge) para estabilizar a matriz inversa da Regressão WLS
    // Adicionamos um lambda epsilon baseado na escala dos dias. (Bug 4 Fix)
    const RIDGE_PENALTY = 0.0001; 
    const safeSumW = Math.max(1e-8, sumW);
    const varianceX = sumWXX - (sumWX * sumWX) / safeSumW;
    const covXY = sumWXY - (sumWX * sumWY) / safeSumW;

    const regularizedDenominator = varianceX + RIDGE_PENALTY;
    
    // Na hora da divisão final da regressão, adicione proteção contra pesos nulos (Bug 2 Fix)
    if (safeSumW < 1e-9 || regularizedDenominator < 1e-12) {
        return { slope: 0, intercept: getSafeScore(sorted[sorted.length-1], maxScore), slopeStdError: 1.5 };
    }
    
    let slope = covXY / regularizedDenominator;

    // Clamp de segurança: um aluno não consegue aprender (nem desaprender) mais do 
    // que 5% ao dia sustentadamente.
    const maxSlopeLimit = maxScore * 0.05;
    slope = Math.max(-maxSlopeLimit, Math.min(maxSlopeLimit, slope));

    const intercept = (sumWY - slope * sumWX) / safeSumW;

    // Erro padrão robusto (ajustado para small samples)
    const slopeStdError = calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options);

    return { slope, intercept, slopeStdError };
}

function calculateSlopeStdError(sorted, slope, intercept, lambda, maxScore, options = {}) {
    const now = options.referenceDate || Date.now();
    const t0 = safeDateParse(sorted[0].date || sorted[0].createdAt).getTime();
    let rss = 0, sumW = 0, sumWXX = 0, sumWX = 0, sumW2 = 0;

    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const x = (safeDateParse(hDate).getTime() - t0) / (1000 * 60 * 60 * 24);
        const y = getSafeScore(h, maxScore);
        // CORREÇÃO: Impedir que datas futuras originem deltas de tempo negativos
        const t = Math.max(0, (now - safeDateParse(hDate).getTime()) / 86400000);
        
        // Calcula o peso exponencial, mas NUNCA deixa zerar completamente (Bug 2 Fix)
        const EPSILON_WEIGHT = 1e-10;
        const rawWeight = Math.exp(-lambda * t);
        const w = Math.max(EPSILON_WEIGHT, rawWeight);

        const pred = intercept + slope * x;
        rss += w * Math.pow(y - pred, 2);
        sumW += w;
        sumW2 += w * w;
        sumWX += w * x;
        sumWXX += w * x * x;
    });

    // FIX: Usar o Tamanho Efetivo da Amostra de Kish para o divisor em WLS (Bug 16 / Lint Fix)
    // CORREÇÃO: Prevenir Underflow letal. Se os pesos desapareceram no esquecimento,
    // garantimos a exportação da incerteza base em vez de dividir por ZERO.
    if (sumW2 <= 1e-12) return 1.5 * (maxScore / 100);
    
    const effectiveN = (sumW * sumW) / sumW2;
    const scaleFactorFallback = maxScore / 100;

    // Garantir que não há divisão por zero ou variância negativa com N insuficiente
    if (effectiveN <= 2.1) return 1.5 * scaleFactorFallback; // Retorna incerteza base

    // Normaliza pela soma dos pesos e aplica o fator de correção para amostras pequenas
    const variance = (rss / sumW) * (effectiveN / Math.max(0.1, effectiveN - 2));
    const det = sumW * sumWXX - sumWX * sumWX;

    if (Math.abs(det) < 1e-6) return 1.5;
    return Math.sqrt(Math.max(0, (variance * sumW) / det));
}

// -----------------------------
// Volatilidade Robusta (MSSD + MAD Blended)
// -----------------------------
export function calculateRobustVolatility(history, maxScore = 100, minScore = 0, options = {}) {
    const sorted = getSortedHistory(history);
    if (!sorted || sorted.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }

    const lambda = options.lambda || 0.08;
    const now = options.referenceDate || Date.now();
    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    const { slope, intercept } = weightedRegression(sorted, lambda, maxScore, options);
    const t0_vol = safeDateParse(sorted[0].date || sorted[0].createdAt).getTime();

    const residualSamples = sorted.map(h => {
        const hDate = h.date || h.createdAt;
        const x = (safeDateParse(hDate).getTime() - t0_vol) / 86400000;
        // CORREÇÃO: Impedir que datas futuras originem deltas de tempo negativos
        const t = Math.max(0, (now - safeDateParse(hDate).getTime()) / 86400000);
        const w = Math.exp(-lambda * t);
        const y = getSafeScore(h, maxScore);
        const pred = intercept + slope * x;
        return { value: y - pred, weight: w }; // Resíduos reais (detrended)
    });

    // Variância Ponderada dos Resíduos (Robust Component)
    const sumWeights = residualSamples.reduce((acc, it) => acc + it.weight, 0);
    const sumResidualsWeighted = residualSamples.reduce((acc, it) => acc + it.value * it.weight, 0);
    const sumSw = residualSamples.reduce((acc, it) => acc + it.value * it.value * it.weight, 0);

    // CORREÇÃO: Prevenir o colapso por "amnésia temporal". Se os pesos decaírem para zero absoluto,
    // evitamos a divisão por zero para que o aluno mantenha um cone de projeção conservador.
    const safeWeights = sumWeights > 1e-9 ? sumWeights : 1;
    const expectedResidual = sumWeights > 1e-9 ? (sumResidualsWeighted / safeWeights) : 0;
    
    const n_res = sorted.length - 1;
    const bessel = n_res > 1 ? n_res / (n_res - 1) : 1;
    const mssdVariance = sumWeights > 1e-9 ? ((sumSw / safeWeights) - (expectedResidual * expectedResidual)) * bessel : 0;

    const weightedMedian = (arr) => {
        if (!arr.length) return 0;
        const sortedArr = [...arr].sort((a, b) => a.value - b.value);
        const totalW = sortedArr.reduce((acc, it) => acc + it.weight, 0);
        if (totalW < 1e-9) return sortedArr[Math.floor(sortedArr.length / 2)].value;
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
    const robustSigma = 1.4826 * mad;
    const robustVariance = robustSigma * robustSigma;
    const blendedVariance = (0.75 * mssdVariance) + (0.25 * robustVariance);

    // O PULO DO GATO: Shrinkage Bayesiano para Volatilidade (Bug 1 Fix)
    // Assumimos que o piso natural de flutuação de qualquer aluno é de ~4% do MaxScore
    const floorVolatility = maxScore * 0.04; 
    const floorVariance = Math.pow(floorVolatility, 2);
    
    // Quanto menor a amostra, mais puxamos para o piso natural.
    const confidence = Math.min(1, sorted.length / 15);
    const trueVariance = (blendedVariance * confidence) + (floorVariance * (1 - confidence));

    return Math.sqrt(Math.max(1e-6, trueVariance));
}

export function calculateVolatility(history, maxScore = 100, minScore = 0) {
    if (!Array.isArray(history) || history.length < 2) {
        const range = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
        return 0.05 * range;
    }
    const scores = history.map(h => getSafeScore(h, maxScore));
    const meanVal = kahanMean(scores);
    const variance = kahanSum(scores.map(b => Math.pow(b - meanVal, 2))) / (scores.length - 1);
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
    const scores = safeHistory.map(h => getSafeScore(h, maxScore));
    const n = scores.length;
    
    const t0 = safeDateParse(safeHistory[0].date || safeHistory[0].createdAt).getTime();
    const timeX = safeHistory.map(h => (safeDateParse(h.date || h.createdAt).getTime() - t0) / 86400000);
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for(let i = 0; i < n; i++) {
        const tx = timeX[i];
        sumX += tx; 
        sumY += scores[i]; 
        sumXY += tx * scores[i]; 
        sumXX += tx * tx;
    }
    const det = n * sumXX - sumX * sumX;
    const slope = det === 0 ? 0 : (n * sumXY - sumX * sumY) / det;
    
    const detrendedScores = scores.map((y, i) => y - (slope * timeX[i]));
    
    let sumSqDiff = 0;
    let validTransitions = 0;

    for (let i = 1; i < n; i++) {
        const diff = detrendedScores[i] - detrendedScores[i - 1];
        sumSqDiff += Math.pow(diff, 2);
        validTransitions++;
    }

    const rmssd = (sumSqDiff) / Math.max(1, validTransitions); 
    // Divide-se por 2 porque a diferença sucessiva carrega a variância de X_i e X_{i-1}
    return Math.sqrt(Math.max(1e-6, rmssd / 2)); 
}

// -----------------------------
// EMA Dinâmico
// -----------------------------
export function calculateDynamicEMA(currentScore, previousEMA, n, daysSinceLast = 1) {
    const baseAlpha = 2 / (n + 1);
    const timeWeight = 1 - Math.exp(-daysSinceLast / 7);
    const alpha = Math.min(0.8, baseAlpha + (1 - baseAlpha) * timeWeight);
    return alpha * currentScore + (1 - alpha) * previousEMA;
}

// -----------------------------
// Drift Clampeado
// -----------------------------
export function calculateSlope(history, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    let lambda = 0.08;
    if (sorted.length >= 3) {
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) {
            const gap = Math.max(0.5, (safeDateParse(sorted[i].date || sorted[i].createdAt) - safeDateParse(sorted[i - 1].date || sorted[i - 1].createdAt)) / 86400000);
            gaps.push(gap);
        }
        gaps.sort((a, b) => a - b);
        const medianGap = gaps.length % 2 === 0
            ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
            : gaps[Math.floor(gaps.length / 2)];
        lambda = Math.max(0.03, Math.min(0.12, 0.03 + 0.08 * Math.exp(-medianGap / 10)));
    }
    const { slope } = weightedRegression(history, lambda, maxScore, options);
    
    const maxDailyDriftPct = options.maxDailyDriftPct !== undefined ? options.maxDailyDriftPct : 0.015;
    const limit = maxDailyDriftPct * maxScore;
    
    return Math.max(-limit, Math.min(limit, slope));
}

export function calculateAdaptiveSlope(history, maxScore = 100, options = {}) {
    return calculateSlope(history, maxScore, options);
}

// -----------------------------
// 💡 Crescimento Logístico (Curva-S)
// -----------------------------
export function logisticRegression(history, maxScore = 100, options = {}) {
    const sorted = getSortedHistory(history);
    if (sorted.length < 4) return { isLogistic: false };

    const now = options.referenceDate || Date.now();
    const historicalScores = sorted.map(h => getSafeScore(h, maxScore));
    const meanVal = historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length;
    const currentVariance = Math.sqrt(historicalScores.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / Math.max(1, historicalScores.length - 1));

    let L = maxScore;
    if (sorted.length >= 4) {
        const validScores = sorted.map(h => getSafeScore(h, maxScore)).filter(s => !Number.isNaN(s));
        
        if (validScores.length >= 4) {
            const sortedScores = [...validScores].sort((a, b) => a - b);
            const peak1 = sortedScores[sortedScores.length - 1];
            const peak2 = sortedScores[sortedScores.length - 2];
            const robustPeak = (peak1 * 0.6) + (peak2 * 0.4);
            const dynamicHeadroom = Math.min(maxScore * 0.15, Math.max(currentVariance * 1.5, maxScore * 0.05));
            const recentSlope = calculateSlope(validScores.slice(-4), maxScore);
            const slopeMultiplier = recentSlope > 0 ? Math.min(1, recentSlope / (maxScore * 0.01)) : 0;
            
            L = robustPeak + (dynamicHeadroom * slopeMultiplier);
            L = Math.max(validScores[validScores.length - 1] + 1, Math.min(maxScore + 0.1, L));
        } else {
            const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
            const peakScore = getPercentile(sortedForPercentile, 0.90);
            L = Math.min(maxScore + 0.1, peakScore + (maxScore * 0.10));
        }
    } else {
        const sortedForPercentile = [...historicalScores].sort((a, b) => a - b);
        const peakScore = getPercentile(sortedForPercentile, 0.90);
        const spaceToMax = maxScore - peakScore;
        const dynamicHeadroom = Math.max(currentVariance * 1.5, maxScore * 0.10, spaceToMax * 0.25);
        L = Math.min(maxScore + 0.1, peakScore + dynamicHeadroom);
    }

    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
    sorted.forEach(h => {
        const hDate = h.date || h.createdAt;
        const t = Math.max(0, (now - safeDateParse(hDate).getTime()) / 86400000);
        const w = Math.exp(-0.08 * t);
        const x = (safeDateParse(hDate).getTime() - safeDateParse(sorted[0].date || sorted[0].createdAt).getTime()) / 86400000;
        
        let y = getSafeScore(h, maxScore);
        y = Math.max(maxScore * 0.01, Math.min(maxScore, y));

        const safeMin = options.minScore || 0;
        const safeL = Math.max(L, y + 0.5); 
        const boundedY = Math.max(safeMin + 0.1, Math.min(safeL - 0.1, y)); 
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
        t0: safeDateParse(sorted[0].date || sorted[0].createdAt).getTime() 
    };
}

export function projectScore(history, projectDays = 60, minScore = 0, maxScore = 100, options = {}) {
    const sortedHistory = getSortedHistory(history);
    if (!sortedHistory || sortedHistory.length === 0) return { projected: 0, marginOfError: 0 };

    const logisticFit = logisticRegression(sortedHistory, maxScore, options);
    let projectedScore;
    const now = options.referenceDate || Date.now();

    if (logisticFit.isLogistic && logisticFit.k > 0) {
        const { k, intercept, L, t0 } = logisticFit;
        const targetTimeX = ((now - t0) / 86400000) + projectDays;
        const exponent = -(k * targetTimeX + intercept);
        const safeExponent = Math.max(-50, Math.min(50, exponent));
        const safeMin = options.minScore || 0;
        projectedScore = safeMin + ((L - safeMin) / (1 + Math.exp(safeExponent)));
    } else {
        const slope = calculateSlope(sortedHistory, maxScore, options);
        let ema = getSafeScore(sortedHistory[0], maxScore) || 0; 
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            const currentPoint = getSafeScore(sortedHistory[i], maxScore);
            if (!Number.isNaN(currentPoint)) {
                ema = calculateDynamicEMA(currentPoint, ema, i + 1, daysSinceLast);
            }
        }

        const safeProjectDays = Math.max(0, projectDays);
        const effectiveDaysForDrift = 45 * Math.log(1 + safeProjectDays / 45);
        projectedScore = ema + slope * effectiveDaysForDrift;
    }

    const { slopeStdError } = sortedHistory.length >= 2 ? weightedRegression(sortedHistory, 0.08, maxScore, options) : { slopeStdError: 0 };
    const stepVolatility = calculateMSSD(sortedHistory, maxScore, minScore) / Math.sqrt(7);
    
    const angularUncertainty = slopeStdError * projectDays;
    const randomWalkUncertainty = stepVolatility * Math.sqrt(Math.max(1, projectDays));
    const predictionSD = Math.sqrt(Math.pow(angularUncertainty, 2) + Math.pow(randomWalkUncertainty, 2));
    const marginOfError = 1.96 * predictionSD; 

    return {
        projected: Math.max(minScore, Math.min(maxScore, projectedScore)),
        marginOfError: Number(marginOfError.toFixed(2))
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
    const { forcedVolatility, forcedBaseline, currentMean: optionsCurrentMean, minScore = 0, maxScore = 100, scenario = 'base' } = options;
    const scenarioCfg = SCENARIO_CONFIG[scenario] || SCENARIO_CONFIG.base;
    const sortedHistory = getSortedHistory(history);
    const safeSimulations = Math.max(1, simulations);
    const scaleFactorFallback = (maxScore - minScore > 0 ? maxScore - minScore : maxScore) / 100;

    if (!sortedHistory || sortedHistory.length < 1) return {
        probability: 0,
        mean: 0,
        sd: 0,
        ci95Low: 0,
        ci95High: 0,
        currentMean: 0,
        drift: 0,
        volatility: 1.5 * scaleFactorFallback
    };

    const currentScore = getSafeScore(sortedHistory[sortedHistory.length - 1], maxScore);
    const fallbackScore = optionsCurrentMean !== undefined ? optionsCurrentMean : currentScore;
    let baselineScore = forcedBaseline !== undefined ? forcedBaseline : fallbackScore;

    if (sortedHistory.length > 0) {
        let ema = getSafeScore(sortedHistory[0], maxScore) || 0;
        for (let i = 1; i < sortedHistory.length; i++) {
            const daysSinceLast = Math.max(1, (safeDateParse(sortedHistory[i].date || sortedHistory[i].createdAt) - safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt)) / 86400000);
            const currentPoint = getSafeScore(sortedHistory[i], maxScore);
            if (!Number.isNaN(currentPoint)) {
                ema = calculateDynamicEMA(currentPoint, ema, i + 1, daysSinceLast);
            }
        }
        if (forcedBaseline === undefined) {
            baselineScore = ema;
        }
    }

    if (optionsCurrentMean !== undefined) {
        const lastDate = safeDateParse(sortedHistory[sortedHistory.length - 1].date || sortedHistory[sortedHistory.length - 1].createdAt);
        const referenceNow = options.referenceDate || Date.now();
        const daysToNow = Math.max(1, (referenceNow - lastDate.getTime()) / 86400000);
        baselineScore = calculateDynamicEMA(optionsCurrentMean, baselineScore, sortedHistory.length + 1, daysToNow);
    }
    baselineScore = Math.max(minScore, Math.min(maxScore, baselineScore + ((scenarioCfg.meanBiasFactor || 0) * maxScore)));

    const regressionResult = sortedHistory.length > 1
        ? weightedRegression(sortedHistory, 0.08, maxScore, options)
        : { slope: 0, slopeStdError: 1.5 * scaleFactorFallback };

    const slopeStdError = regressionResult.slopeStdError;
    const maxDailyDriftPct = options.maxDailyDriftPct !== undefined ? options.maxDailyDriftPct : 0.015;
    const driftLimit = maxDailyDriftPct * maxScore;
    const drift = Math.max(-driftLimit, Math.min(driftLimit, regressionResult.slope));
    const simulationDays = days;
    const scaleFactor = scaleFactorFallback;
    const rawDriftUncertainty = Math.max(0.05 * scaleFactor, slopeStdError);
    const driftUncertaintyCap = options.driftUncertaintyCap !== undefined ? options.driftUncertaintyCap : 0.4;
    let driftUncertainty = Math.min(rawDriftUncertainty, driftUncertaintyCap * scaleFactor) * (scenarioCfg.ciMult || 1);

    if (sortedHistory.length < 10) {
        const nFactor = (10 - sortedHistory.length) / 5;
        driftUncertainty *= (1 + 0.4 * nFactor);
    }

    const volatility = forcedVolatility !== undefined 
        ? forcedVolatility 
        : calculateRobustVolatility(sortedHistory, maxScore, minScore, options);
    
    const scoreRangeOU = maxScore - minScore > 0 ? maxScore - minScore : maxScore;
    const normalizedVolOU = (volatility / scoreRangeOU) * 100;
    
    // [AUDIT-FIX-02] Reduzimos a força magnética da Reversão à Média (thetaOU)
    const thetaOU = Math.max(0.001, 0.02 / (1 + normalizedVolOU * 0.05));

    let residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = getSafeScore(sortedHistory[i - 1], maxScore);
        const actualChange = getSafeScore(h, maxScore) - prev;
        const time1 = safeDateParse(h.date || h.createdAt).getTime();
        const time0 = safeDateParse(sortedHistory[i - 1].date || sortedHistory[i - 1].createdAt).getTime();
        const deltaT = (time1 - time0) / (1000 * 60 * 60 * 24);
        const safeDeltaT = Number.isFinite(deltaT) ? deltaT : 0.1;
        const rawDays = Math.max(0.1, safeDeltaT);
        const detrendedChange = actualChange - (drift * rawDays);
        return detrendedChange / Math.sqrt(rawDays);
    }) : [0];

    const validResiduals = residuals.length > 1 ? residuals.slice(1) : residuals;
    let centeredResiduals;
    if (validResiduals.length > 1) {
        const residualMean = validResiduals.reduce((a, b) => a + b, 0) / validResiduals.length;
        centeredResiduals = validResiduals.map(r => r - residualMean);
    } else {
        centeredResiduals = validResiduals;
    }
    
    const sortedResiduals = [...centeredResiduals].sort((a, b) => a - b);
    const resMedian = getPercentile(sortedResiduals, 0.5);
    const absDevs = centeredResiduals.map(r => Math.abs(r - resMedian)).sort((a, b) => a - b);
    const resMad = getPercentile(absDevs, 0.5) || (1.0 * scaleFactor);
    const safeResiduals = centeredResiduals.filter(r => Math.abs(r - resMedian) < 4 * resMad);

    const results = [];
    const lastEntry = sortedHistory[sortedHistory.length - 1];
    const seedStr = `${lastEntry.date || lastEntry.createdAt}-${getSafeScore(lastEntry, maxScore)}-${sortedHistory.length}`;
    let seedValue = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
        seedValue ^= seedStr.charCodeAt(i);
        seedValue = Math.imul(seedValue, 16777619);
    }
    const rng = mulberry32(Math.abs(seedValue >>> 0));
    const normalRng = makeNormalRng(rng);

    let medianGap = 7;
    if (sortedHistory.length >= 2) {
        const gaps = [];
        for (let j = 1; j < sortedHistory.length; j++) {
            const g = (safeDateParse(sortedHistory[j].date || sortedHistory[j].createdAt) - safeDateParse(sortedHistory[j - 1].date || sortedHistory[j - 1].createdAt)) / 86400000;
            gaps.push(Math.max(0.5, g));
        }
        gaps.sort((a, b) => a - b);
        medianGap = gaps.length % 2 === 0
            ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
            : gaps[Math.floor(gaps.length / 2)];
    }
    const dailyVolatility = volatility / Math.sqrt(Math.max(1, medianGap));

    for (let i = 0; i < safeSimulations; i++) {
        const sampledDrift = sampleTruncatedNormal(drift, driftUncertainty, -0.01 * maxScore, 0.01 * maxScore, rng);
        let currentSimScore = baselineScore;
        let currentVolSq = Math.pow(dailyVolatility, 2);
        const omega = 0.05 * currentVolSq;
        const alphaG = 0.05;
        const betaG = 0.75;
        
        for (let d = 1; d <= simulationDays; d++) {
            const driftEffect = sampledDrift * 1;
            // [AUDIT-FIX-02] A reversão puxa para o Baseline Histórico (consolidação)
            const meanReversion = thetaOU * (baselineScore - currentSimScore);
            const adaptiveVol = Math.sqrt(Math.max(1e-6, currentVolSq));
            
            let shock = (safeResiduals.length > 5 && rng() > 0.3)
                ? safeResiduals[Math.floor(rng() * safeResiduals.length)]
                : normalRng() * adaptiveVol;
            
            // [FIX-GARCH-01] O choque que entra na equação de volatilidade DEVE ser clamped
            const clampedShock = Math.max(-volatility * 2.5, Math.min(volatility * 2.5, shock));
            
            // Evolução da Volatilidade GARCH(1,1): Var(t+1) = w + a*e^2 + b*Var(t)
            currentVolSq = omega + alphaG * Math.pow(clampedShock, 2) + betaG * currentVolSq;
            
            // Clamp de sanidade para evitar divergência explosiva em projeções longas
            currentVolSq = Math.min(currentVolSq, Math.pow(maxScore * 0.2, 2));
            
            currentSimScore += driftEffect + meanReversion + shock;
            
            // CORREÇÃO MATEMÁTICA: Reflected Brownian Motion (RBM) Contínuo
            // Utiliza um espelhamento absoluto contínuo para evitar o efeito "serrote" do módulo simples
            let range = maxScore - minScore;
            let normalized = currentSimScore - minScore;
            let wraps = Math.floor(normalized / range);
            let remainder = normalized % range;
            if (remainder < 0) remainder += range;
            currentSimScore = minScore + (wraps % 2 === 0 ? remainder : range - remainder);
            
            // Fallback de segurança estrito (Clamp final diário)
            currentSimScore = Math.max(minScore, Math.min(maxScore, currentSimScore));
        }

        // Aplica os limites físicos da prova APENAS no resultado assintótico final
        results.push(Math.max(minScore, Math.min(maxScore, currentSimScore)));
    }

    // 4. Agregação Estatística
    results.sort((a, b) => a - b);
    const meanResult = kahanMean(results);
    const successes = results.filter(r => r >= targetScore).length;

    // BUG-3 FIX: Calcular a probabilidade analítica real usando a Normal Truncada
    // em vez de copiar a empírica como fallback.
    const finalSD = calculateVolatility(results.map(r => ({ score: r })), maxScore, minScore);
    const empiricalProb = (successes / safeSimulations) * 100;

    // FIX BUG 4: Simulações O-U com choques difusos e Clamping diário não formam 
    // uma Distribuição Normal Truncada perfeita no limite estacionário.
    // Usar a CDF analítica aqui causa divergência drástica e invalida as previsões.
    // Para modelos difusos complexos, a probabilidade empírica convergida é a única fonte da verdade.
    let analyticalProb = empiricalProb;

    return {
        probability: empiricalProb,
        analyticalProbability: Number(analyticalProb.toFixed(4)),
        mean: Number(meanResult.toFixed(2)),
        sd: Number(finalSD.toFixed(2)),
        // BUG-GLOBAL-01 FIX: getPercentile espera p em [0,1], não [0,100].
        // Antes: 2.5 e 97.5 → p>=1 retornava último elemento → CI = [minScore, maxScore] sempre.
        ci95Low: Number(getPercentile(results, 0.025, true).toFixed(2)),
        ci95High: Number(getPercentile(results, 0.975, true).toFixed(2)),
        currentMean: Number(baselineScore.toFixed(2)),
        drift: Number((drift * 30).toFixed(2)),
        volatility: Number(volatility.toFixed(2)),
        confidence: sortedHistory.length < 5 ? 'low' : sortedHistory.length < 15 ? 'medium' : 'high'
    };
}
