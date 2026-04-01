import { mulberry32, randomNormal } from './random.js';
import { normalCDF_complement, generateKDE } from './math/gaussian.js';
import { monteCarloSimulation } from './projection.js';

// Removed createSeededRandom and randomNormal - using unified random.js versions


export function simulateNormalDistribution(meanOrObj, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI) {
  let mean = meanOrObj;
  
  // BUG-03: Suportar assinatura de objeto para todos os parâmetros
  if (typeof meanOrObj === 'object' && meanOrObj !== null) {
      ({ mean, sd, targetScore, simulations, seed, currentMean, categoryName, bayesianCI } = meanOrObj);
  }

  const safeMean = Number.isFinite(mean) ? mean : 0;
  // REVISION: Standardized floor with stats.js (1.0)
  const safeSD = Math.max(Number.isFinite(sd) ? sd : 0, 1.0);
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

  // LOOP DA SIMULAÇÃO
  for (let i = 0; i < safeSimulations; i++) {
    const score = safeMean + randomNormal(rng) * safeSD;
    
    // O finalScore truncado é usado para sucesso e renderização visual
    const finalScore = Math.max(0, Math.min(100, score));
    if (finalScore >= safeTarget) success++;
    allScores[i] = finalScore;

    welfordCount++;
    // FIX: A Variância DEVE ser calculada na distribuição latente (score) 
    // e não no (finalScore) para evitar o esmagamento do desvio padrão.
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

  // FIX: Remover o Math.min/max com bayesianCI aqui.
  // O safeSD já injetou a incerteza Bayesiana no próprio Welford. 
  // Aplicar novamente causa distorção severa ("Alta Incerteza" falsa).
  const finalRawLow = rawLow;
  const finalRawHigh = rawHigh;

  const empiricalProbability = (success / safeSimulations) * 100;
  
  const displayMean = Math.max(0, Math.min(100, projectedMean));
  const displayLow = Math.max(0, finalRawLow);
  const displayHigh = Math.min(100, finalRawHigh);

  const sdLeft = (displayMean - displayLow) / 1.96;
  const sdRight = (displayHigh - displayMean) / 1.96;
  const inferredSD = (displayHigh - displayLow) / 3.92;

  // REVISION: Standardized floor to 1.0
  // FIX CRÍTICO: Envolver toda a expressão num Math.max(1.0, ...) para 
  // prevenir effectiveSD = 0 quando o teto esmaga a variância direita.
  // FIX: Se o teto for atingido (displayHigh >= 99.5), o sdRight foi esmagado artificialmente.
  // Usar SEMPRE o sdLeft neste caso para representar a verdadeira volatilidade do aluno,
  // caso contrário penalizamos a probabilidade analítica de alunos de topo.
  const effectiveSD = Math.max(1.0, (displayHigh >= 99.5) 
    ? sdLeft 
    : inferredSD);

  // Bug 1: Calcular analyticalProbability corretamente
  const zScore = (safeTarget - displayMean) / effectiveSD;
  const analyticalProbability = normalCDF_complement(zScore) * 100;
  
  const gap = Math.abs(empiricalProbability - analyticalProbability);
  if (gap > 3) {
      console.warn(`MC gap: empírica=${empiricalProbability.toFixed(1)} analítica=${analyticalProbability.toFixed(1)} gap=${gap.toFixed(1)}`);
  }

  return {
    probability: Math.min(99.9, Math.max(0.1, empiricalProbability)),
    analyticalProbability: Math.min(99.9, Math.max(0.1, analyticalProbability)),
    mean: Number((bayesianCI ? safeMean : displayMean).toFixed(1)),
    // REVISION: Floor standardized to 1.0
    sd: Number(Math.max(1.0, projectedSD).toFixed(1)),
    sdLeft: Number(Math.max(1.0, sdLeft).toFixed(2)),
    sdRight: Number(Math.max(1.0, sdRight).toFixed(2)),
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
