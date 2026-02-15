
import { monteCarloSimulation } from "./projection.js";

// Legacy Wrapper for standard interface
export function runMonteCarloAnalysis(arg1, arg2, arg3, arg4) {
    // 1. Check if using the new Object interface
    if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1) && arg1.values) {
        return runMonteCarloAnalysisNew(arg1);
    }

    // 2. Legacy Interface: (mean, sd, meta, options) - ADAPTER
    // This path is used when we don't have full history (e.g. initial gauge state sometimes)
    // We cannot use the Institutional Engine (Regressions) without history.
    // So we return a placeholder or simplified result.

    // For now, return a basic object. Detailed simulation requires history.
    return {
        probability: 0,
        mean: (arg1 || 0).toFixed(1),
        sd: (arg2 || 0).toFixed(1),
        ci95Low: "0.0",
        ci95High: "0.0",
        currentMean: (arg1 || 0).toFixed(1)
    };
}

/**
 * Delegate to Institutional Engine in projection.js
 */
function runMonteCarloAnalysisNew({
    values,
    dates,
    meta,
    simulations = 2000, // Default from institutional spec
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
    // This uses the "Seeded" monteCarloSimulation which guarantees visual stability
    return monteCarloSimulation(historyData, meta, projectionDays, simulations);
}
