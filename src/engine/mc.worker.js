/**
 * Monte Carlo Web Worker
 * Offloads heavy simulation work from the main thread.
 * 
 * BUG-A3 FIX: Import leaf modules directly to avoid circular dependency
 * (monteCarlo.js imports projection.js and vice versa).
 * Vite bundles this as a module worker via `new Worker(url, { type: 'module' })`.
 */

// Import from leaf modules directly — no circular deps
import { mulberry32, randomNormal } from './random.js';
import { normalCDF_complement, generateKDE } from './math/gaussian.js';
import { monteCarloSimulation, calculateSlope, getSortedHistory } from './projection.js';

// Inline simulateNormalDistribution to avoid monteCarlo.js circular import
function simulateNormalDistribution(mean, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI) {
    const safeMean = Number.isFinite(mean) ? mean : 0;
    const safeSD = Math.max(Number.isFinite(sd) ? sd : 0, 1.0);
    const safeTarget = Number.isFinite(targetScore) ? targetScore : 0;
    const safeSimulations = Math.max(1, Math.floor(simulations || 5000));
    const safeCurrentMean = Number.isFinite(currentMean) ? currentMean : safeMean;

    const categoryHash = (categoryName || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const stableSeed = seed ?? (
        Math.round(safeMean * 100) * 100003 +
        Math.round(safeSD * 100) * 997 +
        Math.round(safeTarget * 10) +
        categoryHash +
        (safeSimulations * 7)
    );

    const rng = mulberry32(stableSeed);
    let success = 0;
    let welfordMean = 0, welfordM2 = 0, welfordCount = 0;
    const allScores = new Float32Array(safeSimulations);

    for (let i = 0; i < safeSimulations; i++) {
        const score = safeMean + randomNormal(rng) * safeSD;
        const finalScore = Math.max(0, Math.min(100, score));
        if (finalScore >= safeTarget) success++;
        allScores[i] = finalScore;
        welfordCount++;
        const delta = finalScore - welfordMean;
        welfordMean += delta / welfordCount;
        welfordM2 += delta * (finalScore - welfordMean);
    }

    const projectedMean = welfordMean;
    const projectedSD = Math.sqrt(Math.max(0, welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0));
    allScores.sort();

    const p025idx = Math.min(safeSimulations - 1, Math.floor(safeSimulations * 0.025));
    const p975idx = Math.min(safeSimulations - 1, Math.round(safeSimulations * 0.975) - 1);
    const rawLow = allScores[p025idx];
    const rawHigh = allScores[p975idx];

    const finalRawLow = bayesianCI ? Math.min(rawLow, bayesianCI.ciLow) : rawLow;
    const finalRawHigh = bayesianCI ? Math.max(rawHigh, bayesianCI.ciHigh) : rawHigh;
    const empiricalProbability = (success / safeSimulations) * 100;
    const displayMean = Math.max(0, Math.min(100, projectedMean));
    const displayLow = Math.max(0, finalRawLow);
    const displayHigh = Math.min(100, finalRawHigh);
    const sdLeft = (displayMean - displayLow) / 1.96;
    const sdRight = (displayHigh - displayMean) / 1.96;
    const inferredSD = (displayHigh - displayLow) / 3.92;
    // FIX CRÍTICO: Envolver toda a expressão num Math.max(1.0, ...) para 
    // prevenir effectiveSD = 0 quando o teto esmaga a variância direita.
    const effectiveSD = Math.max(1.0, (displayHigh >= 99.5)
        ? (safeTarget >= displayMean ? sdRight : sdLeft)
        : inferredSD);

    const zScore = (safeTarget - displayMean) / effectiveSD;
    const analyticalProbability = normalCDF_complement(zScore) * 100;

    return {
        probability: Math.min(99.9, Math.max(0.1, empiricalProbability)),
        analyticalProbability: Math.min(99.9, Math.max(0.1, analyticalProbability)),
        mean: Number((bayesianCI ? safeMean : displayMean).toFixed(1)),
        sd: Number(Math.max(1.0, projectedSD).toFixed(1)),
        sdLeft: Number(Math.max(1.0, sdLeft).toFixed(2)),
        sdRight: Number(Math.max(1.0, sdRight).toFixed(2)),
        ci95Low: Number(displayLow.toFixed(1)),
        ci95High: Number(displayHigh.toFixed(1)),
        currentMean: Number(safeCurrentMean.toFixed(1)),
        projectedMean, projectedSD,
        kdeData: generateKDE(allScores, projectedMean, projectedSD, safeSimulations),
        drift: 0, volatility: safeSD,
        method: bayesianCI ? 'bayesian_static_hybrid' : 'normal'
    };
}

// Inline runMonteCarloAnalysis to avoid circular import
function runMonteCarloAnalysis(inputOrMean, pooledSD, targetScore, options = {}) {
    if (typeof inputOrMean === 'object' && inputOrMean !== null && !Array.isArray(inputOrMean)) {
        const {
            values = [], dates = [], meta = 0, simulations = 5000, projectionDays = 90,
            forcedVolatility, forcedBaseline, currentMean,
        } = inputOrMean;

        const mergedOptions = { forcedVolatility, forcedBaseline, currentMean, ...options };
        const history = values.map((score, index) => ({
            score: Number(score) || 0,
            date: dates[index] || new Date().toISOString().slice(0, 10)
        }));

        return monteCarloSimulation(history, Number(meta) || 0, projectionDays, simulations, mergedOptions);
    }

    const sanitize = (val) => { const n = Number(val); return Number.isFinite(n) ? n : 0; };
    return simulateNormalDistribution(
        sanitize(inputOrMean), sanitize(pooledSD), sanitize(targetScore),
        options.simulations, options.seed, options.currentMean, options.categoryName, options.bayesianCI
    );
}

self.onmessage = function(e) {
    const { type, payload, id } = e.data;
    try {
        let result;
        if (type === 'runMonteCarloAnalysis') {
            if (payload.isObjectCall) {
                result = runMonteCarloAnalysis(payload.input);
            } else {
                result = runMonteCarloAnalysis(payload.inputOrMean, payload.pooledSD, payload.targetScore, payload.options);
            }
        } else if (type === 'monteCarloSimulation') {
            result = monteCarloSimulation(payload.history, payload.targetScore, payload.projectionDays, payload.simulations, payload.options);
        } else if (type === 'simulateNormalDistribution') {
            result = simulateNormalDistribution(payload.mean, payload.sd, payload.targetScore, payload.simulations, payload.seed, payload.currentMean, payload.categoryName, payload.bayesianCI);
        }
        self.postMessage({ id, type: 'result', result });
    } catch (error) {
        self.postMessage({ id, type: 'error', error: error.message });
    }
};
