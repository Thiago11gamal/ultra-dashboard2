/*******************************
 * MOTOR MATEMÁTICO - SaaS Core
 *******************************/

/* =============================
   RANDOM
============================= */

function randomNormal(mean, sd) {
    const u1 = Math.random();
    const u2 = Math.random();

    const z0 =
        Math.sqrt(-2.0 * Math.log(u1)) *
        Math.cos(2.0 * Math.PI * u2);

    return z0 * sd + mean;
}

function randomTruncatedNormal(mean, sd, min, max) {
    let value;

    // Safety break to prevent infinite loops if mean is too far from range
    let attempts = 0;
    do {
        value = randomNormal(mean, sd);
        attempts++;
    } while ((value < min || value > max) && attempts < 100);

    // Fallback to clamping if strict truncation fails (rare edge case)
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

/* =============================
   ESTATÍSTICA BÁSICA
============================= */

function mean(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values) {
    if (!values || values.length < 2) return 0;
    const m = mean(values);
    return values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
}

function standardDeviation(values) {
    return Math.sqrt(variance(values));
}

function coefficientOfVariation(values) {
    const m = mean(values);
    if (m === 0) return 0;
    const sd = standardDeviation(values);
    return sd / m;
}

/* =============================
   VARIÂNCIA DE PORTFÓLIO
============================= */

function computePortfolioVariance(weights, covarianceMatrix) {
    let result = 0;

    for (let i = 0; i < weights.length; i++) {
        for (let j = 0; j < weights.length; j++) {
            result += weights[i] * weights[j] * covarianceMatrix[i][j];
        }
    }

    return result;
}

/* =============================
   PROJEÇÃO GEOMÉTRICA AVANÇADA (GBM)
============================= */

function simulateGeometricProcess(
    initialValue,
    drift,
    volatility,
    days
) {
    let value = initialValue;
    // Pre-calculate constants for daily steps
    // drift is passed as Daily Drift
    // volatility is passed as Daily Volatility
    // GBM Formula: S(t+1) = S(t) * exp( (mu - 0.5 * sigma^2) + sigma * Z )

    for (let d = 0; d < days; d++) {
        const z = randomNormal(0, 1);

        const growthFactor = Math.exp(
            (drift - 0.5 * volatility * volatility) +
            volatility * z
        );

        value = value * growthFactor;
    }

    return value;
}

/* =============================
   MONTE CARLO AVANÇADO (GBM)
============================= */

function runMonteCarlo(
    currentValue,
    slope, // Daily slope (linear drift approximation)
    days,
    varianceValue, // Daily variance
    target,
    simulations = 10000
) {
    const results = [];

    // Convert linear slope to approx geometric drift (mu)
    // drift ~= slope / currentValue
    const drift = currentValue > 0 ? slope / currentValue : 0;

    // Convert variance to volatility (sigma)
    // volatility = stdDev / mean (CV) approx
    const dailySD = Math.sqrt(varianceValue);
    const volatility = currentValue > 0 ? dailySD / currentValue : 0;

    for (let i = 0; i < simulations; i++) {
        // Project using Geometric Brownian Motion
        // This simulates the path of the score over N days
        const finalValue = simulateGeometricProcess(
            currentValue,
            drift,
            volatility,
            days
        );

        // Clamp to valid range [0, 100] for academic scores
        const clampedValue = Math.min(100, Math.max(0, finalValue));

        results.push(clampedValue);
    }

    results.sort((a, b) => a - b);

    const meanResult = mean(results);
    const stdResult = standardDeviation(results);

    const probability =
        results.filter((r) => r >= target).length /
        results.length;

    const ci95 = [
        results[Math.floor(0.025 * simulations)] || 0,
        results[Math.floor(0.975 * simulations)] || 100,
    ];

    return {
        mean: Number(meanResult.toFixed(2)),
        std: Number(stdResult.toFixed(2)),
        probability: Number((probability * 100).toFixed(1)), // Return as percentage 0-100
        ci95: [Number(ci95[0].toFixed(1)), Number(ci95[1].toFixed(1))],
        simulations,
        scores: results // Export raw scores for histogram/gauge rendering
    };
}

// Adapter for existing codebase compatibility
// The existing code calls `runMonteCarloAnalysis(mean, sd, target, options)`
function runMonteCarloAnalysis(mean, sd, target, options = {}) {
    // Default values if not provided
    const slope = options.slope || 0;
    const days = options.days || 30; // Default 30 day projection
    const simulations = options.simulations || 5000;

    // Variance = SD^2
    const varianceValue = sd * sd;

    const result = runMonteCarlo(mean, slope, days, varianceValue, target, simulations);

    return {
        ...result,
        target,
        // Map new result structure to old expectation if necessary, 
        // using "probability" (0-100) directly.
        // Legacy fields for UI compatibility:
        ci95Low: result.ci95[0],
        ci95High: result.ci95[1],
        median: result.mean // Approximation for UI consistency
    };
}

// Exporting functions for ES6 modules usage in this project
export default {
    randomNormal,
    randomTruncatedNormal,
    mean,
    variance,
    standardDeviation,
    runMonteCarlo,
    runMonteCarloAnalysis
};

export {
    runMonteCarlo,
    runMonteCarloAnalysis
};
