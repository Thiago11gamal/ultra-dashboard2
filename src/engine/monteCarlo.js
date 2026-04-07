import { mulberry32, randomNormal } from './random.js';
import { normalCDF_complement, generateKDE } from './math/gaussian.js';
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
    let score;
    let attempts = 0;
    
    // FIX 1.3 & 3.1: Amostragem de Distribuição Normal Truncada (Truncated Normal).
    // Rejeita notas fora do limite [0, 100] dinamicamente durante a simulação.
    do {
      score = safeMean + randomNormal(rng) * safeSD;
      attempts++;
    } while ((score < 0 || score > 100) && attempts < 10);
    
    // CORREÇÃO: A linha 'score = Math.max(0, Math.min(100, score))' foi REMOVIDA DAQUI.
    // O valor bruto é preservado para o KDE realizar o 'Data Folding' matematicamente 
    // correto e o gráfico visual perder os "espinhos" anômalos.

    if (score >= safeTarget) success++;
    allScores[i] = score;

    welfordCount++;
    const delta = score - welfordMean;
    welfordMean += delta / welfordCount;
    welfordM2 += delta * (score - welfordMean);
  }

  const projectedMean = welfordMean;
  const projectedSD = Math.sqrt(Math.max(0, welfordCount > 1 ? welfordM2 / (welfordCount - 1) : 0));

  allScores.sort(); 

  const p025idx = Math.min(safeSimulations - 1, Math.floor(safeSimulations * 0.025));
  const p975idx = Math.min(safeSimulations - 1, Math.round(safeSimulations * 0.975) - 1);

  const rawLow = allScores[p025idx];
  const rawHigh = allScores[p975idx];

  const empiricalProbability = (success / safeSimulations) * 100;
  
  const displayMean = Math.max(0, Math.min(100, projectedMean));
  const displayLow = Math.max(0, rawLow);
  const displayHigh = Math.min(100, rawHigh);

  // FIX: Probabilidade Analítica agora utiliza os dados puros, não os distorcidos pelos limites físicos
  const zScore = (safeTarget - safeMean) / safeSD;
  const analyticalProbability = normalCDF_complement(zScore) * 100;

  return {
    probability: Number.isFinite(empiricalProbability) ? empiricalProbability : 0,
    analyticalProbability: Number.isFinite(analyticalProbability) ? analyticalProbability : 0,
    mean: Number((bayesianCI ? safeMean : displayMean).toFixed(1)),
    sd: Number(projectedSD.toFixed(1)),
    sdLeft: Number(Math.max(0.1, (projectedMean - rawLow) / 1.96).toFixed(2)),
    sdRight: Number(Math.max(0.1, (rawHigh - projectedMean) / 1.96).toFixed(2)),
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
