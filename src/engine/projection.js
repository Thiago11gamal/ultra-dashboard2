
// ==========================================
// PROJECTION ENGINE - Versão Institucional
// Seed fixa para estabilidade visual
// ==========================================

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
    if (!history || history.length < 2) {
        return { slope: 0, intercept: 0, slopeStdError: 0 };
    }

    const now = new Date(history[history.length - 1].date).getTime();

    const data = history.map(h => {
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
        Math.min(1.5, 0.7 + n / 15);

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
    if (!history || history.length === 0) return 0;

    const slope = calculateSlope(history);
    const currentScore =
        history[history.length - 1].score;

    const effectiveDays =
        30 * Math.log(1 + projectDays / 30);

    const projected =
        currentScore + slope * effectiveDays;

    return Math.max(0, Math.min(100, projected));
}

// 📉 Volatilidade baseada em resíduos
function calculateVolatility(history) {
    if (!history || history.length < 3) return 1;

    const { slope, intercept } =
        weightedRegression(history);

    const now =
        new Date(history[history.length - 1].date).getTime();

    const residuals = history.map(h => {
        const time = new Date(h.date).getTime();
        const daysAgo =
            (now - time) / (1000 * 60 * 60 * 24);

        const predicted =
            slope * (-daysAgo) + intercept;

        return h.score - predicted;
    });

    const mean =
        residuals.reduce((a, r) => a + r, 0) /
        residuals.length;

    const variance =
        residuals.reduce((a, r) =>
            a + Math.pow(r - mean, 2), 0
        ) / residuals.length;

    return Math.sqrt(variance);
}

// 🎲 Monte Carlo com Seed Fixa
export function monteCarloSimulation(
    history,
    targetScore = 85,
    days = 90,
    simulations = 2000
) {
    if (!history || history.length < 2) return {
        probability: 0,
        mean: "0.0",
        sd: "0.0",
        ci95Low: "0.0",
        ci95High: "0.0",
        currentMean: "0.0"
    };

    const drift = calculateSlope(history);
    const volatility = calculateVolatility(history);

    const currentScore =
        history[history.length - 1].score;

    // Seed fixa baseada no histórico
    const seed =
        history.length * 1000 +
        Math.floor(currentScore * 10);

    const rng = createSeededRandom(seed);

    let success = 0;
    let sumResults = 0;
    let sumSqResults = 0;

    for (let s = 0; s < simulations; s++) {
        let score = currentScore;

        for (let d = 0; d < days; d++) {
            const shock =
                randomNormal(rng) * volatility;

            score += drift + shock;

            score = Math.max(0, Math.min(100, score));
        }

        if (score >= targetScore)
            success++;

        // Stats tracking (Added for UI Compatibility)
        sumResults += score;
        sumSqResults += score * score;
    }

    // Stats Calculations (Added for UI Compatibility)
    const projectedMean = sumResults / simulations;
    const projectedVariance = (sumSqResults / simulations) - (projectedMean * projectedMean);
    const projectedSD = Math.sqrt(Math.max(projectedVariance, 0));

    return {
        // Return Probability as Percentage (0-100) consistent with UI components
        probability: (success / simulations) * 100,
        mean: projectedMean.toFixed(1),
        sd: projectedSD.toFixed(1),
        ci95Low: Math.max(0, projectedMean - 1.96 * projectedSD).toFixed(1),
        ci95High: Math.min(100, projectedMean + 1.96 * projectedSD).toFixed(1),
        currentMean: currentScore.toFixed(1),
        drift,
        volatility
    };
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

        // Use new projectScore signature
        // Note: The new projectScore expects 'history' array with {score, date}
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
    calculateWeightedProjectedMean,
    calculateCurrentWeightedMean
};
