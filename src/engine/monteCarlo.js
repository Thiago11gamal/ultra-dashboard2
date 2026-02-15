import { mean, standardDeviation } from "./stats.js";
import { mulberry32, randomNormal } from "./random.js";
import { updatePosteriorNormal } from "./bayesianEngine.js";
import { calculateSlope } from "./projection.js";

export function runMonteCarloAnalysis(arg1, arg2, arg3, arg4) {
    // 1. Check if using the new Object interface
    if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1) && arg1.values) {
        return runMonteCarloAnalysisNew(arg1);
    }

    // 2. Legacy Interface: (mean, sd, meta, options)
    const meanVal = arg1 || 0;
    const sdVal = arg2 || 5;
    const meta = arg3 || 70;
    const options = arg4 || {};

    const simulations = options.simulations || 5000;
    const rng = mulberry32(options.seed || 42);

    // FIX Bug 2: Capture the raw mean before simulation noise
    const currentMean = options.currentMean !== undefined ? options.currentMean : meanVal;

    let successCount = 0;
    let sumResults = 0;
    let sumSqResults = 0;

    for (let i = 0; i < simulations; i++) {
        // Direct Terminal Sampling: Since inputs (meanVal, sdVal) are already projected
        // and pooled, we sample the final distribution once instead of a daily walk.
        // This avoids variance explosion (random walk variance grows with sqrt(days)).
        const noise = sdVal * randomNormal(rng);
        let currentValue = meanVal + noise;

        if (currentValue > 100) currentValue = 100;
        if (currentValue < 0) currentValue = 0;

        if (currentValue >= meta) {
            successCount++;
        }

        sumResults += currentValue;
        sumSqResults += currentValue * currentValue;
    }

    const projectedMean = sumResults / simulations;
    const projectedVariance = (sumSqResults / simulations) - (projectedMean * projectedMean);
    const projectedSD = Math.sqrt(Math.max(projectedVariance, 0));

    return {
        probability: (successCount / simulations) * 100,
        mean: projectedMean.toFixed(1),
        sd: projectedSD.toFixed(1),
        ci95Low: Math.max(0, projectedMean - 1.96 * projectedSD).toFixed(1),
        ci95High: Math.min(100, projectedMean + 1.96 * projectedSD).toFixed(1),
        currentMean: currentMean.toFixed(1)
    };
}

/**
 * NEW BAYESIAN ENGINE (Additive Model)
 * Recommended for new implementations
 */
function runMonteCarloAnalysisNew({
    values,
    dates,
    meta,
    simulations = 5000,
    projectionDays = 30,
    seed = 42
}) {

    if (!values || values.length < 2) {
        return {
            probability: 0,
            projectedMean: 0,
            projectedSD: 0,
            bayesianMean: 0
        };
    }

    const rng = mulberry32(seed);

    // Estatísticas amostrais
    const sampleMean = mean(values);
    const sampleSD = standardDeviation(values);
    const sampleVariance = sampleSD * sampleSD;
    const n = values.length;

    // PRIOR conservador — scale with data quantity
    const priorMean = sampleMean;
    const priorVariance = n < 5 ? 400 : 200;

    const {
        mean: bayesMean
    } = updatePosteriorNormal({
        priorMean,
        priorVariance,
        sampleMean,
        sampleVariance,
        n
    });

    const bayesSD = sampleSD || 1;

    // FIX Bug 4: Use real dates if provided, otherwise fall back to evenly-spaced assumption
    let historyData;
    if (dates && dates.length === values.length) {
        historyData = values.map((v, idx) => ({
            date: dates[idx],
            score: v
        }));
    } else {
        historyData = values.map((v, idx) => ({
            date: new Date(Date.now() - (n - 1 - idx) * 86400000).toISOString(),
            score: v
        }));
    }
    const slope = calculateSlope(historyData);

    let successCount = 0;
    let sumResults = 0;
    let sumSqResults = 0;

    // FIX Bug 1: Cap noise scaling at √30 to prevent variance explosion
    // For projections beyond 30 days, the noise doesn't keep growing unbounded
    const MAX_NOISE_DAYS = 30;
    const effectiveNoiseDays = Math.min(projectionDays || 1, MAX_NOISE_DAYS);

    for (let i = 0; i < simulations; i++) {
        const totalSlopeGrowth = slope * projectionDays;
        const terminalNoise = bayesSD * randomNormal(rng) * Math.sqrt(effectiveNoiseDays);

        let currentValue = bayesMean + totalSlopeGrowth + terminalNoise;

        // Limite físico
        if (currentValue > 100) currentValue = 100;
        if (currentValue < 0) currentValue = 0;

        if (currentValue >= meta) {
            successCount++;
        }

        sumResults += currentValue;
        sumSqResults += currentValue * currentValue;
    }

    const projectedMean = sumResults / simulations;
    const projectedVariance = (sumSqResults / simulations) - (projectedMean * projectedMean);
    const projectedSD = Math.sqrt(Math.max(projectedVariance, 0));

    return {
        probability: (successCount / simulations) * 100,
        mean: projectedMean.toFixed(1),
        sd: projectedSD.toFixed(1),
        ci95Low: Math.max(0, projectedMean - 1.96 * projectedSD).toFixed(1),
        ci95High: Math.min(100, projectedMean + 1.96 * projectedSD).toFixed(1),
        currentMean: bayesMean.toFixed(1)
    };
}
