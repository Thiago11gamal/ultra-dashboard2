import { monteCarloSimulation } from './projection.js';
import { mulberry32, randomNormal } from './random.js';

// Removed createSeededRandom and randomNormal - using unified random.js versions

export function simulateNormalDistribution(meanOrObj, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI) {
  let mean = meanOrObj;
  
  // BUG-03: Suportar assinatura de objeto para todos os parâmetros
  if (typeof meanOrObj === 'object' && meanOrObj !== null) {
      ({ mean, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI } = meanOrObj);
  }

  const safeMean = Number.isFinite(mean) ? mean : 0;
  const safeSD = Math.max(Number.isFinite(sd) ? sd : 0, 0.1);
  const safeTarget = Number.isFinite(targetScore) ? targetScore : 0;
  const safeSimulations = Math.max(1, Math.floor(simulations || 5000));
  const safeCurrentMean = Number.isFinite(currentMean) ? currentMean : safeMean;

  // Hash da categoria para manter consistência no gerador de números aleatórios
  const categoryHash = (categoryName || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const stableSeed = seed ?? (
    Math.round(safeMean * 100) * 100003 +
    Math.round(safeSD * 100) * 997 +
    Math.round(safeTarget * 10) +
    categoryHash
  );

  const rng = mulberry32(stableSeed);
  let success = 0;

  // Variância online de Welford
  let welfordMean = 0;
  let welfordM2 = 0;
  let welfordCount = 0;

  // PERFORMANCE FIX: Use Float32Array to reduce GC pressure on 2000+ simulations
  const allScores = new Float32Array(safeSimulations);

  // LOOP DA SIMULAÇÃO (agora não é mais ignorado)
  for (let i = 0; i < safeSimulations; i++) {
    const score = safeMean + randomNormal(rng) * safeSD;
    
    const finalScore = Math.max(0, Math.min(100, score));
    if (finalScore >= safeTarget) success++;

    allScores[i] = finalScore;

    welfordCount++;
    // CORREÇÃO: Usar finalScore em vez de score bruto para alinhar com o clamping (0-100)
    const delta = finalScore - welfordMean;
    welfordMean += delta / welfordCount;
    welfordM2 += delta * (finalScore - welfordMean);
  }

  const projectedMean = welfordMean;
  const projectedSD = Math.sqrt(welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0);

  allScores.sort(); // Float32Array sort is numerically stable and faster than custom comparator
  const p025idx = Math.max(0, Math.ceil(safeSimulations * 0.025) - 1);
  const p975idx = Math.min(safeSimulations - 1, Math.floor(safeSimulations * 0.975));

  const result = {
    probability: (success / safeSimulations) * 100,
    mean: Number(projectedMean.toFixed(1)),
    sd: Number(projectedSD.toFixed(1)),
    ci95Low: Number(Math.max(0, allScores[p025idx]).toFixed(1)),
    ci95High: Number(Math.min(100, allScores[p975idx]).toFixed(1)),
    currentMean: Number(safeCurrentMean.toFixed(1)),
    projectedMean,
    projectedSD,
    drift: 0,
    volatility: safeSD,
    method: bayesianCI ? 'bayesian_static_hybrid' : 'normal'
  };

  // Se bayesianCI foi fornecido, usar o mais conservador (IC mais amplo)
  const finalLow = bayesianCI ? Math.min(result.ci95Low, bayesianCI.ciLow) : result.ci95Low;
  const finalHigh = bayesianCI ? Math.max(result.ci95High, bayesianCI.ciHigh) : result.ci95High;

  return {
    ...result,
    ci95Low: Number(finalLow.toFixed(1)),
    ci95High: Number(finalHigh.toFixed(1)),
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
      // BUG-03: Aceitar opções dentro do objeto também para evitar ignorar parâmetros silenciosamente
      forcedVolatility,
      forcedBaseline,
      currentMean: objCurrentMean,
    } = inputOrMean;

    const mergedOptions = {
        forcedVolatility,
        forcedBaseline,
        currentMean: objCurrentMean,
        ...options, // options do 4° argumento sobrepõem mantendo compatibilidade
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
