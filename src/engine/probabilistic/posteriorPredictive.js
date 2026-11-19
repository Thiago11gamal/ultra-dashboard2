/**
 * posteriorPredictive.js
 *
 * Lote 3 — Posterior Predictive Monte Carlo para o Coach.
 *
 * Objetivo:
 * - estimar P(score futuro >= meta) usando distribuição posterior aproximada;
 * - incorporar incerteza de habilidade, tendência e volatilidade;
 * - reduzir overconfidence em cenários com poucos dados;
 * - permitir blend conservador com o Monte Carlo legado.
 *
 * Modelo simplificado:
 *
 * ability_i ~ Normal(ability, abilitySd)
 * trendShift_i ~ Normal(trendMean, trendSd)
 * noise_i ~ Normal(0, sigma * sqrt(horizon))
 * score_future_i = ability_i + trendShift_i + noise_i
 *
 * Onde:
 * - ability = nível atual estimado;
 * - abilitySd = incerteza do nível atual;
 * - trendMean = tendência futura amortecida;
 * - sigma = volatilidade diária estimada;
 * - horizon = dias até o horizonte efetivo.
 */

import { kahanSum as kahanSumLocal } from '../math/kahan.js';
import { hashSeed, mulberry32, createGaussianSampler } from '../random.js';

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function quantileSorted(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return NaN;

  const safeP = clampFinite(p, 0, 1, 0.5);
  const idx = safeP * (sortedValues.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sortedValues[lo];

  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

/**
 * Estima a probabilidade posterior preditiva de atingir a meta.
 *
 * @param {Object} input
 * @param {number} [input.ability]
 * @param {number} [input.abilitySd]
 * @param {number} [input.trendPerDay]
 * @param {number} [input.trendSd]
 * @param {number} [input.dailyVolatility]
 * @param {number} [input.horizonDays]
 * @param {number} [input.targetScore]
 * @param {number} [input.minScore]
 * @param {number} [input.maxScore]
 * @param {number} [input.sampleSize]
 * @param {number} [input.baseProbability]
 * @param {Object} options
 * @param {number} [options.simulations]
 * @param {string} [options.seed]
 * @param {boolean} [options.blendWithBase]
 * @param {number} [options.trendHalfLifeDays]
 * @returns {Object|null}
 */
export function estimatePosteriorPredictive(input = {}, options = {}) {
  const maxScore = clampFinite(input.maxScore, 1, 1_000_000, 100);
  const minScore = clampFinite(input.minScore, -1_000_000, maxScore, 0);
  const domain = Math.max(1e-6, maxScore - minScore);

  const ability = clampFinite(
    input.ability,
    minScore,
    maxScore,
    minScore + domain * 0.5
  );

  const targetScore = clampFinite(
    input.targetScore,
    minScore,
    maxScore,
    minScore + domain * 0.8
  );

  const horizonDays = clampFinite(input.horizonDays, 0, 180, 30);

  const simulations = Math.round(
    clampFinite(options.simulations ?? input.simulations, 200, 3000, 800)
  );

  const seed =
    options.seed ??
    `ppm_${ability.toFixed(2)}_${targetScore.toFixed(2)}_${horizonDays}_${simulations}`;

  const rng = mulberry32(hashSeed(seed));
  const gaussian = createGaussianSampler(rng);

  const abilitySd = clampFinite(
    input.abilitySd,
    0,
    domain * 0.25,
    domain * 0.05
  );

  const trendPerDay = clampFinite(
    input.trendPerDay,
    -domain * 0.02,
    domain * 0.02,
    0
  );

  const trendSd = clampFinite(
    input.trendSd,
    0,
    domain * 0.01,
    domain * 0.002
  );

  const dailyVolatility = clampFinite(
    input.dailyVolatility,
    0,
    domain * 0.25,
    domain * 0.03
  );

  const sampleSize = Math.max(
    0,
    Math.round(clampFinite(input.sampleSize, 0, 10000, 0))
  );

  // A tendência não deve ser projetada linearmente para sempre.
  // Usamos um amortecimento estilo meia-vida.
  const trendHalfLifeDays = clampFinite(
    options.trendHalfLifeDays,
    7,
    120,
    45
  );

  const effectiveTrendDays =
    trendHalfLifeDays * (1 - Math.exp(-horizonDays / trendHalfLifeDays));

  const meanTrendShift = trendPerDay * effectiveTrendDays;

  const trendShiftSd = Math.max(
    1e-9,
    trendSd * effectiveTrendDays * 0.6
  );

  // Inclui ruído observacional do dia da prova para que horizonDays = 0 não colapse o ruído aleatório a zero.
  // Quando processAbilityVar/processTrendVar (do filtro de Kalman) são fornecidos, usa a difusão real
  // de estado em vez de tratar a volatilidade entre provas (dailyVolatility) como passeio aleatório puro.
  const observationSd = clampFinite(
    input.observationSd,
    0,
    domain * 0.25,
    dailyVolatility
  );
  const hasExplicitProcessAbility =
    input.processAbilityVar !== null &&
    input.processAbilityVar !== undefined &&
    input.processAbilityVar !== '' &&
    typeof input.processAbilityVar !== 'boolean';
  const rawProcessAbilityVar = hasExplicitProcessAbility ? Number(input.processAbilityVar) : NaN;
  const hasExplicitProcessTrend =
    input.processTrendVar !== null &&
    input.processTrendVar !== undefined &&
    input.processTrendVar !== '' &&
    typeof input.processTrendVar !== 'boolean';
  const rawProcessTrendVar = hasExplicitProcessTrend ? Number(input.processTrendVar) : NaN;
  const hasKalmanProcess = Number.isFinite(rawProcessAbilityVar) && rawProcessAbilityVar >= 0;
  const processAbilityVar = hasKalmanProcess ? rawProcessAbilityVar : 0;
  const processTrendVar = Number.isFinite(rawProcessTrendVar) && rawProcessTrendVar >= 0
    ? rawProcessTrendVar
    : 0;
  const effProcessDays = Math.max(0, Math.min(horizonDays, effectiveTrendDays));
  const futureNoiseVar = hasKalmanProcess
    ? (processAbilityVar * Math.max(0, horizonDays) + (processTrendVar * Math.pow(effProcessDays, 3)) / 3)
    : (dailyVolatility * dailyVolatility * Math.max(0, horizonDays));
  const baseNoiseSd = Math.sqrt(
    observationSd * observationSd +
    Math.max(0, futureNoiseVar)
  );
  const rawCov = Number(input.abilityTrendCov);
  const maxCov = abilitySd * trendSd * 0.95;
  const abilityTrendCov = Number.isFinite(rawCov) && maxCov > 0
    ? clampFinite(rawCov, -maxCov, maxCov, 0)
    : 0;
  const corrAbilityTrend = (abilitySd > 1e-9 && trendSd > 1e-9)
    ? clampFinite(abilityTrendCov / (abilitySd * trendSd), -0.95, 0.95, 0)
    : 0;

  // Casos extremos.
  if (targetScore <= minScore) {
    const predMean = clampFinite(ability + meanTrendShift, minScore, maxScore, ability);
    const totalPredVar = Math.max(
      0,
      abilitySd * abilitySd +
      trendShiftSd * trendShiftSd +
      2 * abilityTrendCov * effectiveTrendDays * 0.6 +
      baseNoiseSd * baseNoiseSd
    );
    const totalPredSd = Math.sqrt(totalPredVar);
    const ciLow = clampFinite(predMean - 1.96 * totalPredSd, minScore, maxScore, minScore);
    const ciHigh = clampFinite(predMean + 1.96 * totalPredSd, minScore, maxScore, maxScore);
    const trustK = clampFinite(options.trustK, 1, 30, 4);
    const earlySampleTrust = sampleSize > 0
      ? Math.min(1, sampleSize / (sampleSize + trustK))
      : 0.10;
    const baseProbEarly = clampFinite(input.baseProbability, 0, 100, NaN);
    const earlyProb = (options.blendWithBase !== false && Number.isFinite(baseProbEarly))
      ? clampFinite(earlySampleTrust * 100 + (1 - earlySampleTrust) * baseProbEarly, 0, 100, 100)
      : 100;
    return {
      model: 'posterior_predictive_normal_trend_damped',
      probability: earlyProb,
      probabilityRaw: 100,
      mean: predMean,
      ciLow,
      ciHigh,
      horizonDays,
      simulations,
      sampleSize,
      sampleTrust: earlySampleTrust,
      inputs: {
        ability,
        abilitySd,
        trendPerDay,
        trendSd,
        dailyVolatility,
        targetScore,
        minScore,
        maxScore,
      },
      diagnostics: {
        effectiveTrendDays,
        meanTrendShift,
        trendShiftSd,
        baseNoiseSd,
        successCount: simulations,
      },
    };
  }

  const samples = new Array(simulations);
  let successCount = 0;

  // Fator RMS analítico sqrt(E[U^2] * E[J^2]) = sqrt((1 + 0.16/12) * (0.93 + 0.07 * 1.65^2)) ≈ 1.0656
  // Preserva caudas pesadas sem inflar artificialmente o segundo momento E[M^2] = 1.
  const VOL_MULT_RMS = 1.065604;

  for (let i = 0; i < simulations; i++) {
    const zAbility = gaussian();
    const zIndep = gaussian();
    const zTrend = corrAbilityTrend * zAbility + Math.sqrt(Math.max(0, 1 - corrAbilityTrend * corrAbilityTrend)) * zIndep;

    const sampledAbility = ability + zAbility * abilitySd;
    const sampledTrendShift = meanTrendShift + zTrend * trendShiftSd;

    // Volatilidade heteroscedástica leve + cauda pesada ocasional (normalizada p/ E[M^2] = 1).
    let volatilityMultiplier = 0.8 + 0.4 * rng();

    if (rng() < 0.07) {
      volatilityMultiplier *= 1.65;
    }
    volatilityMultiplier /= VOL_MULT_RMS;

    const noise = gaussian() * baseNoiseSd * volatilityMultiplier;

    let futureScore = sampledAbility + sampledTrendShift + noise;

    if (futureScore < minScore) futureScore = minScore;
    if (futureScore > maxScore) futureScore = maxScore;

    samples[i] = futureScore;

    if (futureScore >= targetScore) {
      successCount++;
    }
  }

  const sortedSamples = samples.slice().sort((a, b) => a - b);

  const mean = kahanSumLocal(samples) / simulations;
  const ciLow = quantileSorted(sortedSamples, 0.025);
  const ciHigh = quantileSorted(sortedSamples, 0.975);

  const rawProbability = (successCount / simulations) * 100;

  // Confiança baseada no tamanho amostral.
  // FIX-I04: constante de shrinkage proporcional ao domínio.
  // +8 era arbitrário; para n=3, trust=0.27 (73% do peso ia pro MC legado).
  // Agora: trust = n / (n + K) onde K = max(3, domain * 0.03).
  // Para domain=100: K=3 → n=3: trust=0.50; n=10: trust=0.77; n=30: trust=0.91.
  // Constante de credibilidade amostral adimensional (invariante à escala de pontos 0..10 vs 200..1000)
  const trustK = clampFinite(options.trustK, 1, 30, 4);
  const sampleTrust =
    sampleSize > 0
      ? Math.min(1, sampleSize / (sampleSize + trustK))
      // FIX (BUG-20): sem dados, confiança deve ser mínima, não 35%
      : 0.10;

  const baseProbability = clampFinite(input.baseProbability, 0, 100, NaN);

  let probability = rawProbability;

  if (options.blendWithBase !== false && Number.isFinite(baseProbability)) {
    probability =
      sampleTrust * rawProbability +
      (1 - sampleTrust) * baseProbability;
  }

  probability = clampFinite(probability, 0, 100, rawProbability);

  return {
    model: 'posterior_predictive_normal_trend_damped',
    probability,
    probabilityRaw: rawProbability,
    mean,
    ciLow,
    ciHigh,
    horizonDays,
    simulations,
    sampleSize,
    sampleTrust,
    inputs: {
      ability,
      abilitySd,
      trendPerDay,
      trendSd,
      dailyVolatility,
      targetScore,
      minScore,
      maxScore,
    },
    diagnostics: {
      effectiveTrendDays,
      meanTrendShift,
      trendShiftSd,
      baseNoiseSd,
      successCount,
    },
  };
}

export default {
  estimatePosteriorPredictive,
};

