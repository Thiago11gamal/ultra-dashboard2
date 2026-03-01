// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

import { mulberry32, randomNormal } from './random.js';

// -----------------------------
// Helper: Ensure history is sorted by date
// -----------------------------
function getSortedHistory(history) {
    if (!history) return [];
    return [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// -----------------------------
// Regressão ponderada temporal
// -----------------------------
function weightedRegression(history, lambda = 0.02) {
    // Ensure sorted history for correct time calculations
    const sortedHistory = getSortedHistory(history);

    if (!sortedHistory || sortedHistory.length < 2) {
        return { slope: 0, intercept: 0, slopeStdError: 0 };
    }

    const now = new Date(sortedHistory[sortedHistory.length - 1].date).getTime();

    const data = sortedHistory.map(h => {
        const time = new Date(h.date).getTime();
        const daysAgo = (now - time) / (1000 * 60 * 60 * 24);
        const weight = Math.exp(-lambda * daysAgo);

        return {
            x: -daysAgo,
            y: h.score,
            w: weight
        };
    });

    const Sw = data.reduce((a, p) => a + p.w, 0);
    const Sx = data.reduce((a, p) => a + p.w * p.x, 0);
    const Sy = data.reduce((a, p) => a + p.w * p.y, 0);
    const Sxx = data.reduce((a, p) => a + p.w * p.x * p.x, 0);
    const Sxy = data.reduce((a, p) => a + p.w * p.x * p.y, 0);

    const denom = Sw * Sxx - Sx * Sx;

    if (denom === 0) {
        return { slope: 0, intercept: 0, slopeStdError: 0 };
    }

    const slope = (Sw * Sxy - Sx * Sy) / denom;
    const intercept = (Sy - slope * Sx) / Sw;

    const residuals = data.map(p =>
        p.w * Math.pow(p.y - (slope * p.x + intercept), 2)
    );

    const variance =
        residuals.reduce((a, r) => a + r, 0) /
        Math.max(1, data.length - 2);

    // ⚠️ ALERTA MATEMÁTICO: Sxx DEVE ser a soma dos quadrados CENTRALIZADA na média.
    // Sxx_centered = \\sum w_i (x_i - \\bar{x})^2 = Sxx - Sx^2 / Sw
    const Sxx_centered = Sxx - (Sx * Sx) / Sw;

    const slopeStdError = Sxx_centered > 0 ? Math.sqrt(variance / Sxx_centered) : 0;

    return { slope, intercept, slopeStdError };
}

// 🎯 calculateSlope (compatível)
export function calculateSlope(history) {
    if (!history || history.length < 2) return 0;

    const { slope, slopeStdError } =
        weightedRegression(history);

    const n = history.length;

    const confidence =
        1 / (1 + slopeStdError / 0.5);

    const historyBoost =
        Math.min(1.5, 0.9 + n / 15); // Baseline increased from 0.7 to 0.9

    const baseLimit = 1.2;
    const absoluteMax = 1.5;

    const dynamicLimit = Math.min(
        absoluteMax,
        baseLimit * historyBoost
    );

    const clamped = Math.max(
        -dynamicLimit,
        Math.min(dynamicLimit, slope)
    );

    return clamped * confidence;
}

export const calculateAdaptiveSlope = calculateSlope; // Alias

// 📈 projectScore (inalterado externamente)
export function projectScore(history, projectDays = 60) {
    const sortedHistory = getSortedHistory(history);
    if (!sortedHistory || sortedHistory.length === 0) return 0;

    const slope = calculateSlope(sortedHistory);

    const lastRawScore = sortedHistory[sortedHistory.length - 1].score;
    let currentScore = lastRawScore;

    if (sortedHistory.length > 2) {
        let ema = sortedHistory[0].score;
        for (let i = 1; i < sortedHistory.length; i++) {
            ema = calculateDynamicEMA(sortedHistory[i].score, ema, i + 1);
        }
        // Consistent blended baseline: 70% raw, 30% EMA
        currentScore = (lastRawScore * 0.7) + (ema * 0.3);
    }

    // Relaxed damping: 45 instead of 30, allows more linear projection for longer
    const effectiveDays =
        45 * Math.log(1 + projectDays / 45);

    const projected =
        currentScore + slope * effectiveDays;

    return Math.max(0, Math.min(100, projected));
}

function calculateVolatility(history) {
    if (!history || history.length < 3) return 1.5; // Default safe volatility

    // Ensure sorted history
    const sorted = getSortedHistory(history);
    const now = new Date(sorted[sorted.length - 1].date).getTime();

    // Calculate weighted sum of squared differences (MSSD)
    let sumSw = 0;
    let sumWeights = 0;

    for (let i = 1; i < sorted.length; i++) {
        const h0 = sorted[i - 1];
        const h1 = sorted[i];

        const diff = h1.score - h0.score;
        const time1 = new Date(h1.date).getTime();
        const time0 = new Date(h0.date).getTime();

        const daysAgo = (now - time1) / (1000 * 60 * 60 * 24);
        const rawDaysBetween = Math.max(0.1, (time1 - time0) / (1000 * 60 * 60 * 24));
        // Audit Fix: Cap to 30 days — consistent with Bootstrap residual normalization.
        // Without this cap, a long hiatus produces tiny dailyVariance, underestimating volatility.
        const daysBetween = Math.min(30, rawDaysBetween);

        // Exponential weight focusing on recent volatility (lambda=0.05)
        const weight = Math.exp(-0.05 * daysAgo);

        // Normalização temporal do quadrado da diferença (Daily Variance)
        const dailyVariance = (diff * diff) / daysBetween;

        sumSw += dailyVariance * weight;
        sumWeights += weight;
    }

    if (sumWeights === 0) return 1.5;

    // MSSD formula: variance = (1/2) * average(diff^2)
    const mssdVariance = (sumSw / sumWeights) / 2;

    // Safe sqrt
    return Math.sqrt(Math.max(0, mssdVariance));
}

// -----------------------------
// Helper: Bootstrap Sampler
// -----------------------------
function getRandomElement(arr, rng) {
    // Usa o RNG seedado para consistência
    const idx = Math.floor(rng() * arr.length);
    const safeIdx = Math.max(0, Math.min(arr.length - 1, idx));
    return arr[safeIdx];
}

// 🎲 Monte Carlo Híbrido (Bootstrap + Tendência)
export function monteCarloSimulation(
    history,
    targetScore = 85,
    days = 90,
    simulations = 2000
) {
    const sortedHistory = getSortedHistory(history);

    // Safety check - allow at least 1 point for a flat projection
    if (!sortedHistory || sortedHistory.length < 1) return {
        probability: 0,
        mean: "0.0",
        sd: "0.0",
        ci95Low: "0.0",
        ci95High: "0.0",
        currentMean: "0.0",
        drift: 0,
        volatility: 0
    };

    // Fix: Baseline uses a more responsive EMA to avoid anchoring too far behind real progress.
    const currentScore = sortedHistory[sortedHistory.length - 1].score;
    let baselineScore = currentScore;

    if (sortedHistory.length > 2) {
        let ema = sortedHistory[0].score;
        for (let i = 1; i < sortedHistory.length; i++) {
            ema = calculateDynamicEMA(sortedHistory[i].score, ema, i + 1);
        }
        // Blending EMA with current score for better immediate responsiveness
        // 70% current, 30% EMA for a balanced starting point
        baselineScore = (currentScore * 0.7) + (ema * 0.3);
    }

    // 1. Calcular Tendência (Drift)
    const drift = sortedHistory.length > 1 ? calculateSlope(sortedHistory) : 0;

    // 2. Extrair Resíduos (Bootstrap Source) NORMALIZADOS PELO TEMPO
    const residuals = sortedHistory.length > 1 ? sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = sortedHistory[i - 1].score;
        const actualChange = h.score - prev;

        const time1 = new Date(h.date).getTime();
        const time0 = new Date(sortedHistory[i - 1].date).getTime();
        const rawDays = Math.max(1, (time1 - time0) / (1000 * 60 * 60 * 24));
        // Fix 6: Cap to 30 days — long hiatuses produce abnormally small residuals
        // which underestimates volatility and narrows confidence intervals incorrectly.
        const daysBetween = Math.min(30, rawDays);

        const expectedChange = drift * daysBetween;
        // Resíduo diário = (Diferença Efetiva - Diferença Esperada) / sqrt(dias)
        return (actualChange - expectedChange) / Math.sqrt(daysBetween);
    }).slice(1) : [];

    // Fallback: Se histórico for muito curto (< 5), Bootstrap é perigoso. 
    const useBootstrap = residuals.length >= 5;

    // Calcula volatilidade clássica apenas para fallback
    const volatility = calculateVolatility(sortedHistory);

    // Bug fix: seed was `history.length * 1000 + floor(currentScore * 10)`.
    // currentScore changes with each new simulado — so the seed, and therefore the entire
    // Monte Carlo distribution, jumped visually on every new data point even mid-session.
    // New seed uses sum of all rounded scores + count, which is stable during a session
    // and only changes when data truly changes.
    const scoreSum = Math.round(sortedHistory.reduce((s, h) => s + (h.score || 0), 0));
    const seed = sortedHistory.length * 997 + scoreSum;
    const rng = mulberry32(seed);

    let success = 0;
    let sumResults = 0;
    let sumSqResults = 0;

    const safeSimulations = Math.max(1, simulations);

    // FIX: Simulate at least 1 day with 0 drift for 0-day projections 
    // to account for inherent test variance, avoiding locking the probability at 0% or 100%.
    const simulationDays = Math.max(1, days);
    const dayDrift = days === 0 ? 0 : drift;

    for (let s = 0; s < safeSimulations; s++) {
        let score = baselineScore;

        for (let d = 0; d < simulationDays; d++) {
            let shock;

            if (useBootstrap) {
                const randomResidual = getRandomElement(residuals, rng);
                const jitter = (rng() - 0.5) * 0.1;
                shock = randomResidual + jitter;
            } else {
                shock = randomNormal(rng) * volatility;
            }

            // Apply logarithmic damping to match deterministic effectiveDays = 45 * Math.log(1 + d/45)
            const dampedDrift = dayDrift * (45 / (45 + d));
            score += dampedDrift + shock;
            score = Math.max(0, Math.min(100, score));
        }

        if (score >= targetScore) success++;

        sumResults += score;
        sumSqResults += score * score;
    }

    const projectedMean = sumResults / safeSimulations;
    const projectedVariance = (sumSqResults / safeSimulations) - (projectedMean * projectedMean);
    const projectedSD = Math.sqrt(Math.max(projectedVariance, 0));

    return {
        probability: (success / safeSimulations) * 100,
        mean: Number(projectedMean.toFixed(1)),
        sd: Number(projectedSD.toFixed(1)),
        ci95Low: Number(Math.max(0, projectedMean - 1.96 * projectedSD).toFixed(1)),
        ci95High: Number(Math.min(100, projectedMean + 1.96 * projectedSD).toFixed(1)),
        currentMean: Number(currentScore.toFixed(1)),
        drift,
        volatility,
        method: useBootstrap ? "bootstrap" : "normal"
    };
}

// -----------------------------
// 🔥 Média Móvel Dinâmica (Melhoria 3)
// -----------------------------
/**
 * Calcula EMA com K (Alpha) dinâmico baseado na quantidade de dados.
 * - Poucos dados (Início): K mais alto (0.25) -> Reage rápido
 * - Muitos dados (Veterano): K mais baixo (0.12) -> Mais estável, mas sem ancorar demais o Monte Carlo
 */
export function calculateDynamicEMA(currentScore, previousEMA, dataCount) {
    let K = 0.30; // Padrão (Veterano) - Increased from 0.12

    if (dataCount < 5) {
        K = 0.60; // Start frio (reage muito rápido) - Increased from 0.25
    } else if (dataCount < 15) {
        K = 0.45; // Intermediário - Increased from 0.18
    }

    // EMA Formula: Price(t) * k + EMA(y) * (1 – k)
    return (currentScore * K) + (previousEMA * (1 - K));
}

// ==========================================
// ADAPTERS FOR BACKWARD COMPATIBILITY
// ==========================================

export function calculateWeightedProjectedMean(categoryStats, totalWeight, projectDays) {
    if (totalWeight === 0) return 0;

    return categoryStats.reduce((acc, cat) => {
        const normalizedWeight = cat.weight / totalWeight;

        if (!cat.history || cat.history.length < 2) {
            return acc + (cat.mean * normalizedWeight);
        }
        const projected = projectScore(cat.history, projectDays);
        return acc + (projected * normalizedWeight);

    }, 0);
}

export function calculateCurrentWeightedMean(categoryStats, totalWeight) {
    if (totalWeight === 0) return 0;

    return categoryStats.reduce((acc, cat) => {
        const normalizedWeight = cat.weight / totalWeight;
        return acc + (cat.mean * normalizedWeight);
    }, 0);
}

export default {
    calculateSlope,
    projectScore,
    monteCarloSimulation,
    calculateDynamicEMA, // Exportando a nova função
    calculateWeightedProjectedMean,
    calculateCurrentWeightedMean
};
