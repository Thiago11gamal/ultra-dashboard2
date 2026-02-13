import { mean, standardDeviation } from "./stats";
import { mulberry32, randomNormal } from "./random";
import { updatePosteriorNormal } from "./bayesianEngine";

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
    const projectionDays = options.days || 30;
    const rng = mulberry32(options.seed || 42);

    let successCount = 0;
    let sumResults = 0;
    let sumSqResults = 0;

    for (let i = 0; i < simulations; i++) {
        let currentValue = meanVal;

        for (let d = 0; d < projectionDays; d++) {
            // Use the same additive model as the new engine for consistency
            const noise = sdVal * randomNormal(rng);
            currentValue = currentValue + noise;

            if (currentValue > 100) currentValue = 100;
            if (currentValue < 0) currentValue = 0;
        }

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
        probability: successCount / simulations,
        projectedMean,
        projectedSD,
        bayesianMean: meanVal
    };
}

/**
 * NEW BAYESIAN ENGINE (Additive Model)
 * Recommended for new implementations
 */
function runMonteCarloAnalysisNew({
    values,
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

    // PRIOR conservador
    const priorMean = sampleMean;
    const priorVariance = 400;

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

    // Tendência linear simples
    const slope =
        (values[n - 1] - values[0]) /
        (n - 1);

    let successCount = 0;
    let sumResults = 0;
    let sumSqResults = 0;

    for (let i = 0; i < simulations; i++) {

        let currentValue = bayesMean;

        for (let d = 0; d < projectionDays; d++) {

            const noise =
                bayesSD * randomNormal(rng);

            currentValue =
                currentValue +
                slope +
                noise;

            // Limite físico
            if (currentValue > 100) currentValue = 100; // Adjusted to max 100%
            if (currentValue < 0) currentValue = 0;
        }

        if (currentValue >= meta) {
            successCount++;
        }

        sumResults += currentValue;
        sumSqResults += currentValue * currentValue;
    }

    const projectedMean =
        sumResults / simulations;

    const projectedVariance =
        (sumSqResults / simulations) -
        (projectedMean * projectedMean);

    const projectedSD =
        Math.sqrt(Math.max(projectedVariance, 0));

    return {
        probability: successCount / simulations,
        projectedMean,
        projectedSD,
        bayesianMean: bayesMean
    };
}
