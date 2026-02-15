
import { monteCarloSimulation } from "./projection.js";
import { mulberry32, randomNormal } from "./random.js";

// Legacy Wrapper for standard interface
export function runMonteCarloAnalysis(arg1, arg2, arg3, arg4) {
    // 1. Check if using the new Object interface
    if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1) && arg1.values) {
        return runMonteCarloAnalysisNew(arg1);
    }

    // 2. Legacy Interface: (mean, sd, meta, options)
    // Used by MonteCarloGauge.jsx
    const meanVal = arg1 || 0;
    const sdVal = arg2 || 5;
    const target = arg3 || 70;
    const options = arg4 || {};

    const simulations = options.simulations || 2000;
    const rng = mulberry32(options.seed || 123456);
    const startMean = options.currentMean !== undefined ? options.currentMean : meanVal;

    // Run simple simulation (No drift, just variance around mean)
    // This restores functionality for the Gauge
    let success = 0;
    let sumResults = 0;
    let sumSqResults = 0;

    for (let i = 0; i < simulations; i++) {
        // Simple Normal Distribution around projected mean
        // Note: In legacy mode, 'meanVal' is ALREADY the projected mean (calculated by linear regression in the component or basic projection)
        // So we don't add drift step-by-step. We just sample the final distribution.

        let noise = randomNormal(rng) * sdVal;
        let finalScore = meanVal + noise;

        // Clamp
        finalScore = Math.max(0, Math.min(100, finalScore));

        if (finalScore >= target) success++;

        sumResults += finalScore;
        sumSqResults += finalScore * finalScore;
    }

    const projectedMean = sumResults / simulations;
    const projectedVariance = (sumSqResults / simulations) - (projectedMean * projectedMean);
    const projectedSD = Math.sqrt(Math.max(projectedVariance, 0));

    return {
        probability: (success / simulations) * 100,
        mean: projectedMean.toFixed(1),
        sd: projectedSD.toFixed(1),
        ci95Low: Math.max(0, projectedMean - 1.96 * projectedSD).toFixed(1),
        ci95High: Math.min(100, projectedMean + 1.96 * projectedSD).toFixed(1),
        currentMean: startMean.toFixed(1)
    };
}

/**
 * Delegate to Institutional Engine in projection.js
 */
function runMonteCarloAnalysisNew({
    values,
    dates,
    meta,
    simulations = 2000,
    projectionDays = 30
}) {

    if (!values || values.length < 2) {
        return {
            probability: 0,
            mean: "0.0",
            sd: "0.0",
            ci95Low: "0.0",
            ci95High: "0.0",
            currentMean: "0.0"
        };
    }

    // 1. Reconstruct History
    let historyData;
    if (dates && dates.length === values.length) {
        historyData = values.map((v, idx) => ({ date: dates[idx], score: v }));
    } else {
        const n = values.length;
        historyData = values.map((v, idx) => ({
            date: new Date(Date.now() - (n - 1 - idx) * 86400000).toISOString(),
            score: v
        }));
    }

    // 2. DELEGATE TO INSTITUTIONAL ENGINE
    return monteCarloSimulation(historyData, meta, projectionDays, simulations);
}
