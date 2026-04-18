import { mulberry32, randomNormal } from './random.js';
import { normalCDF_complement, generateKDE, sampleTruncatedNormal } from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';

// Removed createSeededRandom and randomNormal - using unified random.js versions

// B1 FIX: Import shared getPercentile from math/percentile.js and re-export for
// backward compatibility. Both simulateNormalDistribution and monteCarloSimulation
// (in projection.js) use this for consistent interpolated CI percentile calculation.
import { getPercentile } from './math/percentile.js';
export { getPercentile };


export function simulateNormalDistribution(meanOrObj, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI) {
  let mean = typeof meanOrObj === 'number' ? meanOrObj : 0;
  // SCALE-BOUNDS: default to [0, 100] for full backward-compatibility
  let minScore = 0;
  let maxScore = 100;

  if (typeof meanOrObj === 'object' && meanOrObj !== null) {
      // Faz o merge: se a propriedade não existir no objeto, mantém o parâmetro posicional original
      mean = meanOrObj.mean ?? mean;
      sd = meanOrObj.sd ?? sd;
      targetScore = meanOrObj.targetScore ?? targetScore;
      simulations = meanOrObj.simulations ?? simulations;
      seed = meanOrObj.seed ?? seed;
      currentMean = meanOrObj.currentMean ?? currentMean;
      categoryName = meanOrObj.categoryName ?? categoryName;
      bayesianCI = meanOrObj.bayesianCI ?? bayesianCI;
      // SCALE-BOUNDS: extract dynamic bounds from the object call form
      minScore = meanOrObj.minScore ?? minScore;
      maxScore = meanOrObj.maxScore ?? maxScore;
  }

    const safeMean = Number.isFinite(mean) ? mean : 0;
    // FIX 4: Remoção do "Fake Spread" artificial
    const safeSD = Number.isFinite(sd) && sd > 0 ? sd : 0; 
    const rawTarget = Number.isFinite(targetScore) ? targetScore : 0;
    const safeSimulations = Math.max(1, Math.floor(simulations || 5000));

    // FIX 4: Curto-circuito determinístico (Dirac Delta) para SD muito baixo
    if (safeSD < 1e-5) {
        const prob = safeMean >= rawTarget ? 100 : 0;
        return {
            probability: prob,
            analyticalProbability: prob,
            mean: Number(safeMean.toFixed(1)),
            sd: 0,
            sdLeft: 0, // FIX: Removido o spread artificial de 0.1
            sdRight: 0, // FIX: Removido o spread artificial de 0.1
            ci95Low: Number(safeMean.toFixed(1)),
            ci95High: Number(safeMean.toFixed(1)),
            currentMean: Number((currentMean || safeMean).toFixed(1)),
            projectedMean: safeMean,
            projectedSD: 0,
            kdeData: [{ x: safeMean, y: 1 }], // Pico perfeito no UI
            drift: 0,
            volatility: 0,
            minScore,
            maxScore,
            method: bayesianCI ? 'bayesian_static_hybrid' : 'deterministic'
        };
    }

    // FIX 7: Hash de Mistura (Murmur-like) para Seed Inquebrável
    let h = 0xdeadbeef;
    h = Math.imul(h ^ Math.floor(safeMean * 10000), 2654435761);
    h = Math.imul(h ^ Math.floor(safeSD * 10000), 1597334677);
    const stableSeed = seed ?? ((h ^ (h >>> 16)) >>> 0);

  const rng = mulberry32(stableSeed);
  let success = 0;

  let welfordMean = 0;
  let welfordM2 = 0;
  let welfordCount = 0;

    // FIX 5: Upgrade para Float64Array para precisão absoluta nas caudas
    const allScores = new Float64Array(safeSimulations);

    // FIX 1: Target Consistente (Effective Target) para contagem de sucesso rigorosa
    const effectiveTarget = Math.max(minScore, Math.min(maxScore, rawTarget));

    for (let i = 0; i < safeSimulations; i++) {
        // SCALE-BOUNDS FIX: Amostragem de Distribuição Normal Truncada com limites dinâmicos
        let score = sampleTruncatedNormal(safeMean, safeSD, minScore, maxScore, rng);
        
        // FIX 1: Usar effectiveTarget para garantir contagem correta em limites absolutos
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

  // B1 FIX: Uses shared module-level getPercentile (exported above)

  const rawLow = getPercentile(allScores, 0.025);
  const rawHigh = getPercentile(allScores, 0.975);

  const empiricalProbability = (success / safeSimulations) * 100;

  // SCALE-BOUNDS FIX: Sem clamp destrutivo — os valores reais podem estar acima de 100
  // FIX 3: displayMean segue a média Bayesiana quando em modo Bayesiano
  // para alinhar visualmente o KDE com o valor exibido na UI.
  const displayMean = bayesianCI ? safeMean : projectedMean;
  const displayLow = rawLow;
  const displayHigh = rawHigh;

    // SCALE-BOUNDS FIX: Probabilidade Analítica Normalizada para Truncamento [minScore, maxScore].
    // P(X >= target | X in [min, max]) = [Φ(target') - Φ(max')] / [Φ(min') - Φ(max')]
    const phiMin    = normalCDF_complement((minScore - safeMean) / safeSD); // P(X >= min)
    const phiMax    = normalCDF_complement((maxScore - safeMean) / safeSD); // P(X >= max)
    const phiTarget = normalCDF_complement((rawTarget - safeMean) / safeSD); // P(X >= target)
    
    const truncNormFactor = Math.max(1e-10, phiMin - phiMax);
    // 🎯 ALERTA 3.2 FIX: Clamping do phiTarget para o domínio truncado [phiMax, phiMin].
    // Sem isso, metas fora do intervalo [minScore, maxScore] geravam probabilidades > 100% ou < 0%
    // no cálculo analítico, causando o gap > 3% em relação à empírica.
    const clampedPhiTarget = Math.max(phiMax, Math.min(phiMin, phiTarget));

    let analyticalProbability;
    if (rawTarget >= maxScore) {
        analyticalProbability = 0;
    } else if (rawTarget <= minScore) {
        analyticalProbability = 100;
    } else {
        // MATH FIX: Se a massa estiver fora do domínio (factor < 1e-10), 
        // a simulação empírica é mais estável que a aproximação analítica.
        analyticalProbability = truncNormFactor > 1e-10 
            ? ((clampedPhiTarget - phiMax) / truncNormFactor) * 100 
            : empiricalProbability; 
    }
    analyticalProbability = Math.min(100, Math.max(0, analyticalProbability));

    // FIX 6: sdLeft/Right ancorados na mediana empírica (consistente com projection.js)
    // A mediana está sempre entre p16 e p84 por definição, evitando valores negativos
    // quando a distribuição truncada é assimétrica (média perto das bordas).
    const empMedian = getPercentile(allScores, 0.5);
    const rawLeft = getPercentile(allScores, 0.16);
    const rawRight = getPercentile(allScores, 0.84);

    return {
        probability: Number.isFinite(empiricalProbability) ? empiricalProbability : 0,
        analyticalProbability: Number.isFinite(analyticalProbability) ? analyticalProbability : 0,
        mean: Number((bayesianCI ? safeMean : displayMean).toFixed(1)),
        sd: Number(projectedSD.toFixed(1)),
        sdLeft: Number(Math.max(0.1, empMedian - rawLeft).toFixed(2)),
        sdRight: Number(Math.max(0.1, rawRight - empMedian).toFixed(2)),
        ci95Low: Number(displayLow.toFixed(1)),
        ci95High: Number(displayHigh.toFixed(1)),
        currentMean: Number((currentMean || safeMean).toFixed(1)),
        projectedMean,
        projectedSD,
        // FIX 3: Passar displayMean (que segue Bayesian quando aplicável) para o KDE
        // garantindo consistência visual entre o gráfico e o valor exibido.
        kdeData: generateKDE(allScores, displayMean, projectedSD, safeSimulations, minScore, maxScore),
        drift: 0,
        volatility: safeSD,
        minScore,
        maxScore,
        method: bayesianCI ? 'bayesian_static_hybrid' : 'normal'
    };
}


/**
 * Backward-compatible Monte Carlo entrypoint.
 * Supports both signatures:
 * 1) runMonteCarloAnalysis(weightedMean, pooledSD, targetScore, options)
 * 2) runMonteCarloAnalysis({ values, dates, meta, simulations, projectionDays })
 */
export function runMonteCarloAnalysis(inputOrMean, pooledSD, targetScore, options = {}) {
  if (typeof inputOrMean === 'object' && inputOrMean !== null && !Array.isArray(inputOrMean)) {
    const {
        values = [],
        dates = [],
        meta = 0,
        targetScore: objTargetScore, // FIX: Extrair a meta real do objeto
        simulations = 5000,
        projectionDays = 90,
        // Aceitar opções embutidas no objeto (forma mais intuitiva de chamar):
        forcedVolatility: objForcedVolatility,
        forcedBaseline: objForcedBaseline,
        currentMean: objCurrentMean,
        // BUG 7 FIX: Destructure minScore/maxScore from the object call form.
        minScore: objMinScore,
        maxScore: objMaxScore,
    } = inputOrMean;

    const resolvedTarget = objTargetScore ?? Number(meta) ?? 0;

    // 4° argumento tem prioridade sobre opções do objeto:
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

  // STABILITY FIX: Hard sanitization before invoking simulation to prevent NaN/Infinity propagating
  const sanitize = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  // SCALE-BOUNDS: wrap into object call so minScore/maxScore are propagated
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
