import { mulberry32, randomNormal } from './random.js';
import { normalCDF_complement } from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';

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
  // BUG-L2: incluir safeSimulations no seed para evitar colisão entre chamadas com N diferente
  const stableSeed = seed ?? (
    Math.round(safeMean * 100) * 100003 +
    Math.round(safeSD * 100) * 997 +
    Math.round(safeTarget * 10) +
    categoryHash +
    (safeSimulations * 7)
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
    
    // Sucesso é baseado no score real (limitado a 0-100 para sanidade do alvo)
    const finalScore = Math.max(0, Math.min(100, score));
    if (finalScore >= safeTarget) success++;

    // BUG-04 FIX: Armazenar score bruto para cálculo de SD sem distorção por clamp
    allScores[i] = score;

    welfordCount++;
    const delta = score - welfordMean;
    welfordMean += delta / welfordCount;
    welfordM2 += delta * (score - welfordMean);
  }

  const projectedMean = welfordMean;
  const projectedSD = Math.sqrt(Math.max(0, welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0));

  allScores.sort(); // Float32Array sort is numerically stable and faster than custom comparator
  const p025idx = Math.min(safeSimulations - 1, Math.floor(safeSimulations * 0.025));
  // BUG-09 FIX: round é mais preciso que ceil para índices grandes
  const p975idx = Math.min(safeSimulations - 1, Math.round(safeSimulations * 0.975) - 1);

  const rawLow = allScores[p025idx];
  const rawHigh = allScores[p975idx];

  // BUG-04 FIX: Calcular inferredSD e SDs assimétricos antes do clamp final
  const finalRawLow = bayesianCI ? Math.min(rawLow, bayesianCI.ciLow) : rawLow;
  const finalRawHigh = bayesianCI ? Math.max(rawHigh, bayesianCI.ciHigh) : rawHigh;

  const empiricalProbability = (success / safeSimulations) * 100;
  
  const displayMean = Math.max(0, Math.min(100, projectedMean));
  const displayLow = Math.max(0, finalRawLow);
  const displayHigh = Math.min(100, finalRawHigh);

  const sdLeft = (displayMean - displayLow) / 1.96;
  const sdRight = (displayHigh - displayMean) / 1.96;
  const inferredSD = (displayHigh - displayLow) / 3.92;

  return {
    probability: Math.min(99.9, Math.max(0.1, empiricalProbability)),
    analyticalProbability: Math.min(99.9, Math.max(0.1, analyticalProbability)),
    mean: Number(displayMean.toFixed(1)),
    sd: Number(Math.max(0.1, inferredSD).toFixed(1)),
    sdLeft: Number(Math.max(0.1, sdLeft).toFixed(2)),
    sdRight: Number(Math.max(0.1, sdRight).toFixed(2)),
    ci95Low: Number(displayLow.toFixed(1)),
    ci95High: Number(displayHigh.toFixed(1)),
    currentMean: Number(safeCurrentMean.toFixed(1)),
    projectedMean,
    projectedSD,
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
