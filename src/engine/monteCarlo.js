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
  const safeSD = Number.isFinite(sd) && sd > 0.0001 ? sd : 0.0001; 
  const safeTarget = Number.isFinite(targetScore) ? targetScore : 0;
  const safeSimulations = Math.max(1, Math.floor(simulations || 5000));
  const safeCurrentMean = Number.isFinite(currentMean) ? currentMean : safeMean;

  // FIX 4: Multiplicar por 1000 (era 100) para capturar 3 casas decimais,
  // evitando colisões de seed em mudanças fracionárias pequenas.
  const categoryHash = Array.from(String(categoryName || '')).reduce((acc, char, idx) => acc + char.codePointAt(0) * (idx + 1), 0);
  const stableSeed = seed ?? (
    (Math.floor(safeMean * 1000) * 179 ^
    Math.floor(safeSD * 1000) * 997 ^
    Math.floor(safeTarget * 1000) * 1009 ^
    (categoryHash * 13) ^
    (safeSimulations * 7)) >>> 0
  );

  const rng = mulberry32(stableSeed);
  let success = 0;

  let welfordMean = 0;
  let welfordM2 = 0;
  let welfordCount = 0;

  const allScores = new Float32Array(safeSimulations);

  for (let i = 0; i < safeSimulations; i++) {
    // SCALE-BOUNDS FIX: Amostragem de Distribuição Normal Truncada com limites dinâmicos
    let score = sampleTruncatedNormal(safeMean, safeSD, minScore, maxScore, rng);
    
    if (score >= safeTarget) success++;
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
    const phiTarget = normalCDF_complement((safeTarget - safeMean) / safeSD); // P(X >= target)
    
    const truncNormFactor = phiMin - phiMax;
    // FIX 1: Clamp analytical probability to [0, 100] to prevent impossible values
    // from floating-point edge cases in truncated normal calculation.
    let analyticalProbability = truncNormFactor > 0.001 
        ? ((phiTarget - phiMax) / truncNormFactor) * 100 
        : normalCDF_complement((safeTarget - safeMean) / safeSD) * 100;
    analyticalProbability = Math.min(100, Math.max(0, analyticalProbability));

  return {
    probability: Number.isFinite(empiricalProbability) ? empiricalProbability : 0,
    analyticalProbability: Number.isFinite(analyticalProbability) ? analyticalProbability : 0,
    mean: Number((bayesianCI ? safeMean : displayMean).toFixed(1)),
    sd: Number(projectedSD.toFixed(1)),
    sdLeft: Number(Math.max(0.1, projectedSD).toFixed(2)),
    sdRight: Number(Math.max(0.1, projectedSD).toFixed(2)),
    ci95Low: Number(displayLow.toFixed(1)),
    ci95High: Number(displayHigh.toFixed(1)),
    currentMean: Number(safeCurrentMean.toFixed(1)),
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
        simulations = 5000,
        projectionDays = 90,
        // Aceitar opções embutidas no objeto (forma mais intuitiva de chamar):
        forcedVolatility: objForcedVolatility,
        forcedBaseline: objForcedBaseline,
        currentMean: objCurrentMean,
    } = inputOrMean;

    // 4° argumento tem prioridade sobre opções do objeto:
    const mergedOptions = {
        forcedVolatility: objForcedVolatility,
        forcedBaseline: objForcedBaseline,
        currentMean: objCurrentMean,
        ...options,
    };

    const history = values.map((score, index) => ({
      score: Number(score) || 0,
      date: dates[index] || new Date().toISOString().slice(0, 10)
    }));

    return monteCarloSimulation(history, Number(meta) || 0, projectionDays, simulations, mergedOptions);
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
