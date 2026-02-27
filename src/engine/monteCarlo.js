import { monteCarloSimulation } from './projection.js';

function createSeededRandom(seed = 123456) {
  let value = Math.floor(seed) % 2147483647;
  if (value <= 0) value += 2147483646;

  return function () {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function randomNormal(rng) {
  let u = rng();
  while (u <= 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function simulateNormalDistribution(mean, sd, targetScore, simulations, seed) {
  const safeMean = Number.isFinite(mean) ? mean : 0;
  const safeSD = Math.max(Number.isFinite(sd) ? sd : 0, 0.1);
  const safeTarget = Number.isFinite(targetScore) ? targetScore : 0;
  const safeSimulations = Math.max(1, Math.floor(simulations || 2000));

  const rng = createSeededRandom(seed);
  let success = 0;
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < safeSimulations; i++) {
    const score = Math.max(0, Math.min(100, safeMean + randomNormal(rng) * safeSD));
    if (score >= safeTarget) success++;
    sum += score;
    sumSq += score * score;
  }

  const projectedMean = sum / safeSimulations;
  const variance = Math.max(0, sumSq / safeSimulations - projectedMean * projectedMean);
  const projectedSD = Math.sqrt(variance);

  return {
    probability: (success / safeSimulations) * 100,
    mean: Number(projectedMean.toFixed(1)),
    sd: Number(projectedSD.toFixed(1)),
    ci95Low: Number(Math.max(0, projectedMean - 1.96 * projectedSD).toFixed(1)),
    ci95High: Number(Math.min(100, projectedMean + 1.96 * projectedSD).toFixed(1)),
    projectedMean,
    projectedSD,
    drift: 0,
    volatility: safeSD,
    method: 'normal'
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
      simulations = 2000,
      projectionDays = 90
    } = inputOrMean;

    const history = values.map((score, index) => ({
      score: Number(score) || 0,
      date: dates[index] || new Date().toISOString().slice(0, 10)
    }));

    return monteCarloSimulation(history, Number(meta) || 0, projectionDays, simulations);
  }

  return simulateNormalDistribution(
    Number(inputOrMean),
    Number(pooledSD),
    Number(targetScore),
    options.simulations,
    options.seed
  );
}

export default {
  runMonteCarloAnalysis
};
