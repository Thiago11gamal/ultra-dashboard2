import { mulberry32, randomNormal } from './random.js';
import { normalCDF_complement, generateKDE, sampleTruncatedNormal } from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';

// Removed createSeededRandom and randomNormal - using unified random.js versions


export function simulateNormalDistribution(meanOrObj, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI) {
  let mean = typeof meanOrObj === 'number' ? meanOrObj : 0;
  
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
  }

  const safeMean = Number.isFinite(mean) ? mean : 0;
  const safeSD = Number.isFinite(sd) && sd > 0.0001 ? sd : 0.0001; 
  const safeTarget = Number.isFinite(targetScore) ? targetScore : 0;
  const safeSimulations = Math.max(1, Math.floor(simulations || 5000));
  const safeCurrentMean = Number.isFinite(currentMean) ? currentMean : safeMean;

  // FIX 2.2: Multiplicar por 100 antes do Math.floor captura as casas decimais, 
  // evitando que mudanças fracionárias gerem a mesma semente bitwise.
  const categoryHash = Array.from(String(categoryName || '')).reduce((acc, char, idx) => acc + char.codePointAt(0) * (idx + 1), 0);
  const stableSeed = seed ?? (
    (Math.floor(safeMean * 100) * 179 ^
    Math.floor(safeSD * 100) * 997 ^
    Math.floor(safeTarget * 100) * 1009 ^
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
    // FIX APLICADO: Amostragem de Distribuição Normal Truncada via Transformada Inversa
    let score = sampleTruncatedNormal(safeMean, safeSD, 0, 100, rng);
    
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

  // FIX APLICADO: Interpolação Linear para o Intervalo de Confiança
  const getPercentile = (arr, p) => {
      const idx = (arr.length - 1) * p;
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      if (lower === upper) return arr[lower];
      const weight = idx - lower;
      return arr[lower] * (1 - weight) + arr[upper] * weight;
  };

  const rawLow = getPercentile(allScores, 0.025);
  const rawHigh = getPercentile(allScores, 0.975);

  const empiricalProbability = (success / safeSimulations) * 100;
  
  const displayMean = Math.max(0, Math.min(100, projectedMean));
  const displayLow = Math.max(0, rawLow);
  const displayHigh = Math.min(100, rawHigh);

    // FIX 3.2: Probabilidade Analítica Normalizada para Truncamento [0,100].
    // P(X >= target | X in [0,100]) = [Φ(target') - Φ(100')] / [Φ(0') - Φ(100')]
    // onde Φ(z) é normalCDF_complement(z).
    const phi0   = normalCDF_complement(-safeMean / safeSD);      // P(X >= 0)
    const phi100  = normalCDF_complement((100 - safeMean) / safeSD); // P(X >= 100)
    const phiTarget = normalCDF_complement((safeTarget - safeMean) / safeSD); // P(X >= target)
    
    const truncNormFactor = phi0 - phi100;
    const analyticalProbability = truncNormFactor > 0.001 
        ? ((phiTarget - phi100) / truncNormFactor) * 100 
        : normalCDF_complement((safeTarget - safeMean) / safeSD) * 100;

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
    kdeData: generateKDE(allScores, projectedMean, projectedSD, safeSimulations),
    drift: 0,
    volatility: safeSD,
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

  return simulateNormalDistribution(
    sanitize(inputOrMean),
    sanitize(pooledSD),
    sanitize(targetScore),
    options.simulations,
    options.seed,
    options.currentMean,
    options.categoryName,
    options.bayesianCI
  );
}

export default {
  runMonteCarloAnalysis
};
