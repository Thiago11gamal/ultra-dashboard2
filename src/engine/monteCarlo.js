import { mulberry32 } from './random.js';
import { normalCDF_complement, generateKDE, sampleTruncatedNormal } from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';
import { getPercentile } from './math/percentile.js';

export { getPercentile };

export function simulateNormalDistribution(meanOrObj, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI) {
    let mean = typeof meanOrObj === 'number' ? meanOrObj : 0;
    let minScore = 0;
    let maxScore = 100;

    if (typeof meanOrObj === 'object' && meanOrObj !== null) {
        mean = meanOrObj.mean ?? mean;
        sd = meanOrObj.sd ?? sd;
        targetScore = meanOrObj.targetScore ?? targetScore;
        simulations = meanOrObj.simulations ?? simulations;
        seed = meanOrObj.seed ?? seed;
        currentMean = meanOrObj.currentMean ?? currentMean;
        categoryName = meanOrObj.categoryName ?? categoryName;
        bayesianCI = meanOrObj.bayesianCI ?? bayesianCI;
        minScore = meanOrObj.minScore ?? minScore;
        maxScore = meanOrObj.maxScore ?? maxScore;
    }

    const safeMean = Number.isFinite(mean) ? mean : 0;
    const safeSD = Number.isFinite(sd) && sd > 0 ? sd : 0; 
    const rawTarget = Number.isFinite(targetScore) ? targetScore : 0;
    const safeSimulations = Math.max(1, Math.floor(simulations || 5000));

    if (safeSD < 1e-5) {
        const prob = safeMean >= rawTarget ? 100 : 0;
        return {
            probability: prob,
            analyticalProbability: prob,
            mean: Number(safeMean.toFixed(1)),
            sd: 0,
            sdLeft: 0, 
            sdRight: 0, 
            ci95Low: Number(safeMean.toFixed(1)),
            ci95High: Number(safeMean.toFixed(1)),
            currentMean: Number((currentMean || safeMean).toFixed(1)),
            projectedMean: safeMean,
            projectedSD: 0,
            kdeData: [
                { x: safeMean - 0.1, y: 0 },
                { x: safeMean, y: 100 },
                { x: safeMean + 0.1, y: 0 }
            ], 
            drift: 0,
            volatility: 0,
            minScore,
            maxScore,
            method: bayesianCI ? 'bayesian_static_hybrid' : 'deterministic'
        };
    }

    let h = 0xdeadbeef;
    h = Math.imul(h ^ Math.floor(safeMean * 10000), 2654435761);
    h = Math.imul(h ^ Math.floor(safeSD * 10000), 1597334677);
    const stableSeed = seed ?? ((h ^ (h >>> 16)) >>> 0);

    const rng = mulberry32(stableSeed);
    let success = 0;

    let welfordMean = 0;
    let welfordM2 = 0;
    let welfordCount = 0;

    const allScores = new Float64Array(safeSimulations);
    const effectiveTarget = Math.max(minScore, Math.min(maxScore, rawTarget));

    for (let i = 0; i < safeSimulations; i++) {
        let score = sampleTruncatedNormal(safeMean, safeSD, minScore, maxScore, rng);
        
        if (score >= effectiveTarget) success++;
        allScores[i] = score;

        welfordCount++;
        const delta = score - welfordMean;
        welfordMean += delta / welfordCount;
        welfordM2 += delta * (score - welfordMean);
    }

    const projectedMean = welfordMean;
    const projectedSD = Math.sqrt(Math.max(0, welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0));

    allScores.sort((a, b) => a - b);

    let rawLow = getPercentile(allScores, 0.025);
    let rawHigh = getPercentile(allScores, 0.975);

    const empiricalProbability = (success / safeSimulations) * 100;
    const displayMean = bayesianCI ? safeMean : projectedMean;

    // FORÇAR INCERTEZA MÍNIMA: Evitar que o cone colapse num traço liso na UI
    const MIN_SPREAD = 0.5;
    if (rawHigh - rawLow < MIN_SPREAD) {
        rawLow = Math.max(minScore, displayMean - MIN_SPREAD / 2);
        rawHigh = Math.min(maxScore, displayMean + MIN_SPREAD / 2);
    }

    const displayLow = rawLow;
    const displayHigh = rawHigh;

    const phiMin    = normalCDF_complement((minScore - safeMean) / safeSD); 
    const phiMax    = normalCDF_complement((maxScore - safeMean) / safeSD); 
    const phiTarget = normalCDF_complement((rawTarget - safeMean) / safeSD); 
    
    const truncNormFactor = Math.max(1e-10, phiMin - phiMax);
    const clampedPhiTarget = Math.max(phiMax, Math.min(phiMin, phiTarget));

    let analyticalProbability;
    if (rawTarget >= maxScore) {
        analyticalProbability = 0;
    } else if (rawTarget <= minScore) {
        analyticalProbability = 100;
    } else {
        analyticalProbability = truncNormFactor > 1e-18 
            ? ((clampedPhiTarget - phiMax) / truncNormFactor) * 100 
            : empiricalProbability; 
    }
    analyticalProbability = Math.min(100, Math.max(0, analyticalProbability));

    const empMedian = getPercentile(allScores, 0.5);
    const rawLeft = getPercentile(allScores, 0.16);
    const rawRight = getPercentile(allScores, 0.84);

    return {
        probability: Number.isFinite(empiricalProbability) ? empiricalProbability : 0,
        analyticalProbability: Number.isFinite(analyticalProbability) ? analyticalProbability : 0,
        mean: Number((bayesianCI ? safeMean : displayMean).toFixed(1)),
        // BUGFIX M3: Use the empirical projectedSD (effective SD after truncation/squeezing)
        // instead of the theoretical safeSD. This ensures the displayed value matches the visual chart.
        sd: Number(projectedSD.toFixed(1)),
        sdLeft: Number(Math.max(0.1, empMedian - rawLeft).toFixed(2)),
        sdRight: Number(Math.max(0.1, rawRight - empMedian).toFixed(2)),
        ci95Low: Number(displayLow.toFixed(1)),
        ci95High: Number(displayHigh.toFixed(1)),
        currentMean: Number((currentMean || safeMean).toFixed(1)),
        projectedMean,
        projectedSD,
        kdeData: generateKDE(allScores, displayMean, projectedSD, safeSimulations, minScore, maxScore),
        drift: 0,
        volatility: safeSD,
        minScore,
        maxScore,
        method: bayesianCI ? 'bayesian_static_hybrid' : 'normal'
    };
}

export function runMonteCarloAnalysis(inputOrMean, pooledSD, targetScore, options = {}) {
    if (typeof inputOrMean === 'object' && inputOrMean !== null && !Array.isArray(inputOrMean)) {
        const {
            values = [],
            dates = [],
            meta = 0,
            targetScore: objTargetScore,
            simulations = 5000,
            projectionDays = 90,
            forcedVolatility: objForcedVolatility,
            forcedBaseline: objForcedBaseline,
            currentMean: objCurrentMean,
            minScore: objMinScore,
            maxScore: objMaxScore,
        } = inputOrMean;

        const resolvedTarget = objTargetScore ?? Number(meta || 0);

        const mergedOptions = {
            forcedVolatility: objForcedVolatility,
            forcedBaseline: objForcedBaseline,
            currentMean: objCurrentMean,
            minScore: objMinScore,
            maxScore: objMaxScore,
            ...options,
        };

        const history = values.map((score, index) => ({
            score: Number(score) || 0,
            date: dates[index] || new Date().toISOString().slice(0, 10)
        }));

        return monteCarloSimulation(history, resolvedTarget, projectionDays, simulations, mergedOptions);
    }

    const sanitize = (val) => {
        const n = Number(val);
        return Number.isFinite(n) ? n : 0;
    };

    return simulateNormalDistribution({
        mean: sanitize(inputOrMean),
        sd: sanitize(pooledSD),
        targetScore: sanitize(targetScore),
        simulations: options.simulations,
        seed: options.seed,
        currentMean: options.currentMean,
        categoryName: options.categoryName,
        bayesianCI: options.bayesianCI,
        minScore: options.minScore ?? 0,
        maxScore: options.maxScore ?? 100,
    });
}

export default {
    runMonteCarloAnalysis
};
