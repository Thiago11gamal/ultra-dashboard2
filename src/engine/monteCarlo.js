import { mean, standardDeviation } from "./stats.js";
import { mulberry32, randomNormal } from "./random.js";
import { updatePosteriorNormal } from "./bayesianEngine.js";
import { calculateSlope } from "./projection.js";

const MIN_SCORE = 0;
const MAX_SCORE = 100;
const DEFAULT_META = 70;

function clampScore(value) {
    return Math.max(MIN_SCORE, Math.min(MAX_SCORE, value));
}

function toFiniteNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePositiveInt(value, fallback) {
    const parsed = Math.floor(toFiniteNumber(value, fallback));
    return parsed > 0 ? parsed : fallback;
}

function buildSummary({ successCount, simulations, sumResults, sumSqResults }) {
    const projectedMean = sumResults / simulations;
    const projectedVariance = (sumSqResults / simulations) - (projectedMean * projectedMean);
    const projectedSD = Math.sqrt(Math.max(projectedVariance, 0));

    return {
        probability: (successCount / simulations) * 100,
        mean: projectedMean.toFixed(1),
        sd: projectedSD.toFixed(1),
        ci95Low: clampScore(projectedMean - 1.96 * projectedSD).toFixed(1),
        ci95High: clampScore(projectedMean + 1.96 * projectedSD).toFixed(1)
    };
}

export function runMonteCarloAnalysis(arg1, arg2, arg3, arg4) {
    // New interface: runMonteCarloAnalysis({ values, meta, ... })
    if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1) && "values" in arg1) {
        return runMonteCarloAnalysisNew(arg1);
    }

    // Legacy interface: runMonteCarloAnalysis(mean, sd, meta, options)
    const meanVal = toFiniteNumber(arg1, 0);
    const sdVal = Math.max(0, toFiniteNumber(arg2, 5));
    const meta = clampScore(toFiniteNumber(arg3, DEFAULT_META));
    const options = arg4 || {};

    const simulations = parsePositiveInt(options.simulations, 5000);
    const rng = mulberry32(parsePositiveInt(options.seed, 42));

    let successCount = 0;
    let sumResults = 0;
    let sumSqResults = 0;

    for (let i = 0; i < simulations; i++) {
        const sampled = meanVal + (sdVal * randomNormal(rng));
        const currentValue = clampScore(sampled);

        if (currentValue >= meta) {
            successCount++;
        }

        sumResults += currentValue;
        sumSqResults += currentValue * currentValue;
    }

    return buildSummary({ successCount, simulations, sumResults, sumSqResults });
}

function runMonteCarloAnalysisNew({
    values,
    meta = DEFAULT_META,
    simulations = 5000,
    projectionDays = 30,
    seed = 42
}) {
    const cleanValues = Array.isArray(values)
        ? values
            .map(v => toFiniteNumber(v, null))
            .filter(v => v !== null)
            .map(clampScore)
        : [];

    if (cleanValues.length < 2) {
        return {
            probability: 0,
            mean: "0.0",
            sd: "0.0",
            ci95Low: "0.0",
            ci95High: "0.0"
        };
    }

    const safeMeta = clampScore(toFiniteNumber(meta, DEFAULT_META));
    const safeProjectionDays = Math.max(0, toFiniteNumber(projectionDays, 30));
    const safeSimulations = parsePositiveInt(simulations, 5000);
    const rng = mulberry32(parsePositiveInt(seed, 42));

    const sampleMean = mean(cleanValues);
    const sampleSD = standardDeviation(cleanValues);
    const sampleVariance = Math.max(sampleSD * sampleSD, 1e-6);
    const n = cleanValues.length;

    // Prior centered at observed mean with weakly informative variance.
    const priorMean = sampleMean;
    const priorVariance = 400;

    const { mean: bayesMean, variance: bayesVariance } = updatePosteriorNormal({
        priorMean,
        priorVariance,
        sampleMean,
        sampleVariance,
        n
    });

    const historyData = cleanValues.map((score, idx) => ({
        date: new Date(Date.now() - (n - 1 - idx) * 86400000).toISOString(),
        score
    }));
    const slope = calculateSlope(historyData);

    // Predictive SD combines posterior parameter uncertainty + process noise.
    const predictiveSD = Math.sqrt(Math.max(sampleVariance + bayesVariance, 1e-6));

    let successCount = 0;
    let sumResults = 0;
    let sumSqResults = 0;

    for (let i = 0; i < safeSimulations; i++) {
        const trendGain = slope * safeProjectionDays;
        const terminalNoise = predictiveSD * randomNormal(rng) * Math.sqrt(Math.max(safeProjectionDays, 1));
        const sampled = bayesMean + trendGain + terminalNoise;
        const currentValue = clampScore(sampled);

        if (currentValue >= safeMeta) {
            successCount++;
        }

        sumResults += currentValue;
        sumSqResults += currentValue * currentValue;
    }

    return buildSummary({
        successCount,
        simulations: safeSimulations,
        sumResults,
        sumSqResults
    });
}
