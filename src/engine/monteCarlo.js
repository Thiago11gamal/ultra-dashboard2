import { mulberry32 } from './random.js';
import { normalCDF_complement, generateKDE, sampleTruncatedNormal } from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';
export { monteCarloSimulation };
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
    let safeSD = Number.isFinite(sd) && sd > 0 ? sd : 0; 

    // FIX: Unificar a inferência do SD nos dois caminhos
    if (bayesianCI) {
        // SD SQUASH (Fix): Usar os limites NÃO truncados para inferir o SD real.
        // Se usarmos ciHigh truncado em 100, o SD será subestimado para alunos de elite.
        const high = bayesianCI.unclampedHigh !== undefined ? bayesianCI.unclampedHigh : bayesianCI.ciHigh;
        const low = bayesianCI.unclampedLow !== undefined ? bayesianCI.unclampedLow : bayesianCI.ciLow;
        
        if (high !== undefined && low !== undefined) {
            const inferredSD = (high - low) / 3.92;
            if (Number.isFinite(inferredSD) && inferredSD > 0) {
                safeSD = inferredSD;
            }
        }
    }
    const rawTarget = Number.isFinite(targetScore) ? targetScore : 0;
    const safeSimulations = Math.max(1, Math.floor(simulations || 5000));

    if (safeSD < 1e-5) {
        const prob = safeMean >= rawTarget ? 100 : 0;
        return {
            probability: prob,
            analyticalProbability: prob,
            recommendedProbability: prob,
            probabilityPolicy: 'deterministic',
            mean: Number(safeMean.toFixed(2)),
            sd: 0,
            sdVisual: 0,
            sdLeft: 0, 
            sdRight: 0, 
            ci95StatLow: Number(safeMean.toFixed(2)),
            ci95StatHigh: Number(safeMean.toFixed(2)),
            ci95Low: Number(safeMean.toFixed(2)),
            ci95High: Number(safeMean.toFixed(2)),
            ci95VisualLow: Number(safeMean.toFixed(2)),
            ci95VisualHigh: Number(safeMean.toFixed(2)),
            ci95VisualClamped: false,
            currentMean: Number((currentMean || safeMean).toFixed(2)),
            projectedMean: safeMean,
            projectedSD: 0,
            kdeData: [
                { x: safeMean - 0.1, y: 0 },
                { x: safeMean, y: 1 },
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
    // FIX-TARGET6: usar effectiveTarget (clamped) no success count em vez de rawTarget.
    // rawTarget fora de [minScore, maxScore] produzia 0% ou 100% por acidente da normal truncada.
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

    const statisticalCi95Low = getPercentile(allScores, 0.025);
    const statisticalCi95High = getPercentile(allScores, 0.975);
    let rawLow = statisticalCi95Low;
    let rawHigh = statisticalCi95High;

    const empiricalProbability = (success / safeSimulations) * 100;
    const displayMean = bayesianCI ? safeMean : projectedMean;

    // FORÇAR INCERTEZA MÍNIMA: Evitar que o cone colapse num traço liso na UI
    // MATH FIX: Tornar o spread proporcional à escala total do concurso (0.5% do maxScore)
    // Garante que o cone não fique gigante num teste de 10 pontos ou invisível num de 1000.
    const MIN_SPREAD = Math.max(0.5, maxScore * 0.005);
    
    const wasVisualCIClamped = (rawHigh - rawLow < MIN_SPREAD);
    if (wasVisualCIClamped) {
        rawLow = Math.max(minScore, displayMean - MIN_SPREAD / 2);
        rawHigh = Math.min(maxScore, displayMean + MIN_SPREAD / 2);
    }

    const displayLow = rawLow;
    const displayHigh = rawHigh;

    // BUGFIX M3: Sync the exported 'sd' with the visual clamp to avoid mathematical inconsistency
    // for external consumers of the statistical JSON.
    const visualSD = wasVisualCIClamped
        ? (rawHigh - rawLow) / 3.92 
        : projectedSD;

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

    const finiteEmpiricalProbability = Number.isFinite(empiricalProbability) ? empiricalProbability : 0;
    const finiteAnalyticalProbability = Number.isFinite(analyticalProbability) ? analyticalProbability : 0;
    const recommendedProbability = safeSimulations < 1200
        ? finiteEmpiricalProbability
        : finiteAnalyticalProbability;

    return {
        probability: finiteEmpiricalProbability,
        analyticalProbability: finiteAnalyticalProbability,
        recommendedProbability,
        probabilityPolicy: safeSimulations < 1200 ? 'empirical_low_sample' : 'analytical_high_sample',
        mean: Number((bayesianCI ? safeMean : displayMean).toFixed(2)),
        // sd = estatístico (não visual), para evitar viés de interpretação
        sd: Number(projectedSD.toFixed(2)),
        // sdVisual reflete o cone após clamp mínimo de UX
        sdVisual: Number(visualSD.toFixed(2)),
        // 📊 ESTATÍSTICA: Nomes alterados para empSigma (Empirical Sigma)
        // Indica a distância real dos quartis P16/P84, respeitando a assimetria da Normal Truncada.
        sdLeft: Number(Math.max(0.1, empMedian - rawLeft).toFixed(2)),
        sdRight: Number(Math.max(0.1, rawRight - empMedian).toFixed(2)),
        ci95StatLow: Number(statisticalCi95Low.toFixed(2)),
        ci95StatHigh: Number(statisticalCi95High.toFixed(2)),
        ci95Low: Number(displayLow.toFixed(2)),
        ci95High: Number(displayHigh.toFixed(2)),
        ci95VisualLow: Number(displayLow.toFixed(2)),
        ci95VisualHigh: Number(displayHigh.toFixed(2)),
        ci95VisualClamped: wasVisualCIClamped,
        currentMean: Number((currentMean || safeMean).toFixed(2)),
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
