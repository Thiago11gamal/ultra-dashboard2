// ==========================================
// PROJECTION ENGINE - Versão Institucional 9.5
// Seed fixa para estabilidade visual
// ==========================================

// -----------------------------
// Helper: Ensure history is sorted by date
// -----------------------------
function getSortedHistory(history) {
    if (!history) return [];
    return [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// -----------------------------
// Seeded RNG (Linear Congruential Generator)
// -----------------------------
function createSeededRandom(seed = 123456) {
    let value = seed % 2147483647;
    if (value <= 0) value += 2147483646;

    return function () {
        value = value * 16807 % 2147483647;
        return (value - 1) / 2147483646;
    };
}

// -----------------------------
// Random normal com seed
// -----------------------------
function randomNormal(rng) {
    const u = rng();
    const v = rng();
    return Math.sqrt(-2.0 * Math.log(u)) *
        Math.cos(2.0 * Math.PI * v);
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
        Math.max(1, history.length - 2);

    const slopeStdError = Math.sqrt(variance / Sxx);

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
    const currentScore =
        sortedHistory[sortedHistory.length - 1].score;

    // Relaxed damping: 45 instead of 30, allows more linear projection for longer
    const effectiveDays =
        45 * Math.log(1 + projectDays / 45);

    const projected =
        currentScore + slope * effectiveDays;

    return Math.max(0, Math.min(100, projected));
}

// 📉 Volatilidade baseada em MSSD (Robust to Trend Shifts)
function calculateVolatility(history) {
    if (!history || history.length < 3) return 5; // Default safe volatility

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
        const time = new Date(h1.date).getTime();
        const daysAgo = (now - time) / (1000 * 60 * 60 * 24);

        // Exponential weight focusing on recent volatility (lambda=0.05)
        const weight = Math.exp(-0.05 * daysAgo);

        sumSw += (diff * diff) * weight;
        sumWeights += weight;
    }

    if (sumWeights === 0) return 5;

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

    // Safety check: Require at least 1 data point (previously 2)
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

    const currentScore = sortedHistory[sortedHistory.length - 1].score;

    // Handle Single Data Point Case (New User / Same Day)
    // Drift is 0, Volatility is default (5)
    if (sortedHistory.length < 2) {
        return {
            probability: currentScore >= targetScore ? 100 : 0, // Deterministic based on current
            mean: currentScore.toFixed(1),
            sd: "5.0", // Default uncertainty
            ci95Low: Math.max(0, currentScore - 1.96 * 5).toFixed(1),
            ci95High: Math.min(100, currentScore + 1.96 * 5).toFixed(1),
            currentMean: currentScore.toFixed(1),
            drift: 0,
            volatility: 5,
            method: "single-point-fallback"
        };
    }

    const currentScore = sortedHistory[sortedHistory.length - 1].score;

    // 1. Calcular Tendência (Drift)
    const drift = calculateSlope(sortedHistory);

    // 2. Extrair Resíduos (Bootstrap Source)
    const n = sortedHistory.length;
    const residuals = sortedHistory.map((h, i) => {
        if (i === 0) return 0;
        const prev = sortedHistory[i - 1].score;
        const actualChange = h.score - prev;
        return actualChange - drift;
    }).slice(1);

    // Fallback: Se histórico for muito curto (< 5), Bootstrap é perigoso. 
    const useBootstrap = residuals.length >= 5;

    // Calcula volatilidade clássica apenas para fallback
    const volatility = calculateVolatility(sortedHistory);

    // Seed fixa baseada no histórico (determinismo visual)
    const seed = history.length * 1000 + Math.floor(currentScore * 10);
    const rng = createSeededRandom(seed);

    let success = 0;
    let sumResults = 0;
    let sumSqResults = 0;

    const safeSimulations = Math.max(1, simulations);

    for (let s = 0; s < safeSimulations; s++) {
        let score = currentScore;

        for (let d = 0; d < days; d++) {
            let shock;

            if (useBootstrap) {
                const randomResidual = getRandomElement(residuals, rng);
                const jitter = (rng() - 0.5) * 0.1;
                shock = randomResidual + jitter;
            } else {
                shock = randomNormal(rng) * volatility;
            }

            score += drift + shock;
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
        mean: projectedMean.toFixed(1),
        sd: projectedSD.toFixed(1),
        ci95Low: Math.max(0, projectedMean - 1.96 * projectedSD).toFixed(1),
        ci95High: Math.min(100, projectedMean + 1.96 * projectedSD).toFixed(1),
        currentMean: currentScore.toFixed(1),
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
 * - Poucos dados (Início): K mais alto (0.12) -> Reage rápido
 * - Muitos dados (Veterano): K mais baixo (0.07) -> Mais estável
 */
export function calculateDynamicEMA(currentScore, previousEMA, dataCount) {
    let K = 0.07; // Padrão (Veterano)

    if (dataCount < 5) {
        K = 0.12; // Start frio (reage rápido)
    } else if (dataCount < 10) {
        K = 0.09; // Intermediário
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
