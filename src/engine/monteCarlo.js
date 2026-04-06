import { mulberry32, randomNormal } from './random.js';
import { normalCDF_complement, generateKDE } from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';

// Removed createSeededRandom and randomNormal - using unified random.js versions


export function simulateNormalDistribution(meanOrObj, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI) {
  let mean = meanOrObj;
  
  if (typeof meanOrObj === 'object' && meanOrObj !== null) {
      ({ mean, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI } = meanOrObj);
  }

  const safeMean = Number.isFinite(mean) ? mean : 0;
  // 🎯 BUG-V2 FIX: Piso de SD reduzido para 0.0001 para permitir estabilidade real.
  const safeSD = Number.isFinite(sd) && sd > 0 ? sd : 0.0001; 
  const safeTarget = Number.isFinite(targetScore) ? targetScore : 0;
  const safeSimulations = Math.max(1, Math.floor(simulations || 5000));
  const safeCurrentMean = Number.isFinite(currentMean) ? currentMean : safeMean;

  // 🎯 BUG-S8 FIX: Seed com maior entropia usando multiplicadores primos e hash de categoria.
  const categoryHash = (categoryName || '').split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
  const stableSeed = seed ?? (
    Math.round(safeMean * 179) ^
    Math.round(safeSD * 997) ^
    Math.round(safeTarget * 1009) ^
    (categoryHash * 13) ^
    (safeSimulations * 7)
  );

  const rng = mulberry32(stableSeed);
  let success = 0;

  let welfordMean = 0;
  let welfordM2 = 0;
  let welfordCount = 0;

  const allScores = new Float32Array(safeSimulations);

  for (let i = 0; i < safeSimulations; i++) {
    let score;
    let attempts = 0;
    
    // 🎯 MATH FIX: Amostragem de Rejeição (Normal Truncada)
    // Impede que o gerador estocástico crie cenários além dos limites da prova [0, 100]
    do {
        score = safeMean + randomNormal(rng) * safeSD;
        attempts++;
    } while ((score < 0 || score > 100) && attempts < 10);
    
    // Fallback de segurança extrema para evitar travamentos se os parâmetros forem corrompidos
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    // Sucesso calculado na nota truncada e viável
    if (score >= safeTarget) success++;

    allScores[i] = score;


    welfordCount++;
    const delta = score - welfordMean;
    welfordMean += delta / welfordCount;
    welfordM2 += delta * (score - welfordMean);
  }

  const projectedMean = welfordMean;
  const projectedSD = Math.sqrt(Math.max(0, welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0));

  // 🎯 BUG-O7 FIX: Ordenação numérica explícita (a-b) para garantir estabilidade cross-engine.
  allScores.sort((a, b) => a - b); 

  const p025idx = Math.min(safeSimulations - 1, Math.floor(safeSimulations * 0.025));
  const p975idx = Math.min(safeSimulations - 1, Math.round(safeSimulations * 0.975) - 1);

  const rawLow = allScores[p025idx];
  const rawHigh = allScores[p975idx];

  const empiricalProbability = (success / safeSimulations) * 100;
  
  // Display stats (Corte visual apenas para a UI)
  const displayMean = Math.max(0, Math.min(100, projectedMean));
  const displayLow = Math.max(0, rawLow);
  const displayHigh = Math.min(100, rawHigh);

  // 🎯 BUG-Z4 FIX: zScore e Analytical Probability calculados sobre os parâmetros REAIS (projected).
  // Remove as heurísticas sdLeft/sdRight que geravam gaps incorretos entre Gauge e Simulação.
  const zScore = (safeTarget - projectedMean) / (projectedSD || 0.0001);
  const analyticalProbability = normalCDF_complement(zScore) * 100;
  
  const gap = Math.abs(empiricalProbability - analyticalProbability);
  if (gap > 3 && projectedSD > 0.1) {
      console.warn(`MC gap: empírica=${empiricalProbability.toFixed(1)} analítica=${analyticalProbability.toFixed(1)} gap=${gap.toFixed(1)}`);
  }

  return {
    // 🎯 BUG-C6 FIX: Remoção dos clamps (0.1/99.9). Se a probabilidade for 100% ou 0%, exibimos o valor real.
    probability: empiricalProbability,
    analyticalProbability: analyticalProbability,
    mean: Number((bayesianCI ? safeMean : displayMean).toFixed(1)),
    sd: Number(projectedSD.toFixed(1)),
    // Mantemos sdLeft/sdRight apenas como metadados informativos, mas não mais operacionais.
    sdLeft: Number(Math.max(0.1, (displayMean - displayLow) / 1.96).toFixed(2)),
    sdRight: Number(Math.max(0.1, (displayHigh - displayMean) / 1.96).toFixed(2)),
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
