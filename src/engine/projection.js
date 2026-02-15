
// ==============================
// UTILIDADES ESTATÍSTICAS
// ==============================

function calculateMean(history) {
    if (!history || history.length === 0) return 0;
    return history.reduce((a, h) => a + h.score, 0) / history.length;
}

function calculateStdDev(history) {
    if (history.length < 2) return 0;

    const mean = calculateMean(history);

    const variance = history.reduce((acc, h) => {
        return acc + Math.pow(h.score - mean, 2);
    }, 0) / history.length;

    return Math.sqrt(variance);
}

export function calculateRegression(history) {
    if (history.length < 2) return { slope: 0, intercept: 0, stdError: 0 };

    const startTime = new Date(history[0].date).getTime();

    const data = history.map(h => ({
        x: (new Date(h.date).getTime() - startTime) / (1000 * 60 * 60 * 24),
        y: h.score
    }));

    const n = data.length;

    const sumX = data.reduce((a, p) => a + p.x, 0);
    const sumY = data.reduce((a, p) => a + p.y, 0);
    const sumXY = data.reduce((a, p) => a + p.x * p.y, 0);
    const sumXX = data.reduce((a, p) => a + p.x * p.x, 0);

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: 0, stdError: 0 };

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // erro padrão da regressão
    const residuals = data.map(p => p.y - (slope * p.x + intercept));
    const variance = residuals.reduce((a, r) => a + r * r, 0) / (n - 2);
    const stdError = Math.sqrt(variance);

    return { slope, intercept, stdError };
}

// 🎯 SLOPE ADAPTATIVO COM CONFIANÇA
export function calculateAdaptiveSlope(history) {
    if (!history || history.length < 2) return 0;

    const { slope: rawSlope, stdError } = calculateRegression(history);

    const stdDev = calculateStdDev(history);
    const n = history.length;

    // Consistência (menos variabilidade = maior confiança)
    const consistencyFactor = 1 / (1 + stdDev / 10);

    // Histórico maior = mais liberdade
    const historyFactor = Math.min(1.5, 0.5 + n / 10);

    const baseLimit = 1.2;

    const dynamicLimit = baseLimit * consistencyFactor * historyFactor;

    // Clamp dinâmico
    const clampedSlope = Math.max(
        -dynamicLimit,
        Math.min(dynamicLimit, rawSlope)
    );

    // Peso de confiança baseado no erro padrão
    const confidence = 1 / (1 + stdError);

    const finalSlope = clampedSlope * confidence;

    return finalSlope;
}

// 🚀 Projeção futura
export function projectScore(history, projectDays = 60) {
    if (!history || history.length === 0) return 0;

    const slope = calculateAdaptiveSlope(history);
    const currentScore = history[history.length - 1].score;

    // suavização logarítmica (menos agressiva agora)
    const effectiveDays = 30 * Math.log(1 + projectDays / 30);

    const projected = currentScore + slope * effectiveDays;

    return Math.max(0, Math.min(100, projected));
}

/**
 * Adapter for MonteCarloGauge
 * Maintains compatibility with existing UI while using new logic
 */
export function calculateWeightedProjectedMean(categoryStats, totalWeight, projectDays) {
    if (totalWeight === 0) return 0;

    return categoryStats.reduce((acc, cat) => {
        const normalizedWeight = cat.weight / totalWeight;

        if (!cat.history || cat.history.length < 2) {
            // No projection possible, use current mean
            return acc + (cat.mean * normalizedWeight);
        }

        // Use new projectScore signature
        // Note: The new projectScore expects 'history' array with {score, date}
        const projected = projectScore(cat.history, projectDays);
        return acc + (projected * normalizedWeight);

    }, 0);
}

/**
 * Calculate current weighted mean (no projection) - Legacy Support
 */
export function calculateCurrentWeightedMean(categoryStats, totalWeight) {
    if (totalWeight === 0) return 0;

    return categoryStats.reduce((acc, cat) => {
        const normalizedWeight = cat.weight / totalWeight;
        return acc + (cat.mean * normalizedWeight);
    }, 0);
}

// Legacy export calculateSlope for other modules if needed (aliased to adaptive)
export const calculateSlope = calculateAdaptiveSlope;

export default {
    calculateSlope,
    calculateAdaptiveSlope,
    projectScore,
    calculateWeightedProjectedMean,
    calculateCurrentWeightedMean
};
