/**
 * stateSpace.js
 *
 * Lote 1 — State-Space / Kalman Filter para habilidade e tendência.
 *
 * Modelo:
 *
 * ability_t = ability_{t-1} + trend_{t-1} * dt + eta_t
 * trend_t   = trend_{t-1} + zeta_t
 * score_t   = ability_t + epsilon_t
 *
 * Onde:
 * - ability = nível real latente do aluno;
 * - trend = tendência em pontos por dia;
 * - dt = dias decorridos entre observações;
 * - eta/zeta = ruído de processo;
 * - epsilon = ruído de medição.
 *
 * Este módulo não substitui o motor atual por padrão.
 * Ele só será usado se as feature flags estiverem ativas.
 */

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function kahanMean(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;

  let sum = 0;
  let c = 0;

  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;

    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
  }

  return sum / values.length;
}

function parseObservationTime(entry) {
  if (!entry) return NaN;

  if (Number.isFinite(Number(entry.time))) {
    return Number(entry.time);
  }

  const rawDate = entry.date || entry.createdAt || entry.timestamp || null;
  if (!rawDate) return NaN;

  const parsed = Date.parse(rawDate);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Estima habilidade e tendência usando Kalman Filter simplificado.
 *
 * @param {Array<{score:number,date?:string,createdAt?:string}>} observations
 * @param {Object} options
 * @param {number} [options.maxScore=100]
 * @param {number} [options.minScore=0]
 * @returns {Object|null}
 */
export function kalmanAbilityTrend(observations = [], options = {}) {
  const maxScore = clampNumber(options.maxScore, 1, 100000);
  const minScore = clampNumber(options.minScore, 0, maxScore);
  const domain = Math.max(1e-6, maxScore - minScore);

  const obs = (Array.isArray(observations) ? observations : [])
    .map((entry, index) => {
      const score = Number(entry?.score);
      const time = parseObservationTime(entry);

      return {
        index,
        score: Number.isFinite(score) ? clampNumber(score, minScore, maxScore) : NaN,
        time,
      };
    })
    .filter((entry) => Number.isFinite(entry.score) && Number.isFinite(entry.time))
    .sort((a, b) => a.time - b.time);

  if (obs.length < 2) {
    return null;
  }

  const scores = obs.map((entry) => entry.score);

  // Inicialização conservadora: média dos 3 primeiros pontos.
  const initialAbility = clampNumber(
    kahanMean(scores.slice(0, Math.min(3, scores.length))),
    minScore,
    maxScore
  );

  // Variância de observação adaptativa.
  let observationVariance = Math.pow(domain * 0.08, 2);

  if (scores.length >= 3) {
    const mean = kahanMean(scores);
    const variance =
      scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) /
      Math.max(1, scores.length - 1);

    observationVariance = Math.max(
      Math.pow(domain * 0.04, 2),
      Math.min(Math.pow(domain * 0.25, 2), (variance * 0.75) + Math.pow(domain * 0.03, 2))
    );
  }

  // Estado inicial.
  let ability = initialAbility;
  let trend = 0; // pontos por dia

  // Covariância inicial.
  let P00 = Math.max(observationVariance, Math.pow(domain * 0.12, 2)); // ability
  let P01 = 0; // covariância ability/trend
  let P11 = Math.pow(domain * 0.01, 2); // trend

  // Ruído de processo por dia.
  const qAbility = Math.pow(domain * 0.005, 2);
  const qTrend = Math.pow(domain * 0.001, 2);

  const maxTrendPerDay = Math.max(0.05, domain * 0.015);

  let previousTime = obs[0].time;
  let logLikelihood = 0;

  for (let i = 0; i < obs.length; i++) {
    const current = obs[i];
    const y = clampNumber(current.score, minScore, maxScore);

    // Predict
    if (i > 0) {
      const dtDays = clampNumber(
        (current.time - previousTime) / 86400000,
        0.25,
        60
      );

      // State transition
      ability = clampNumber(ability + trend * dtDays, minScore, maxScore);

      // P = F P F^T + Q
      const nextP00 =
        P00 +
        2 * dtDays * P01 +
        dtDays * dtDays * P11 +
        qAbility * dtDays;

      const nextP01 = P01 + dtDays * P11;
      const nextP11 = P11 + qTrend * dtDays;

      P00 = Math.max(1e-12, nextP00);
      P01 = nextP01;
      P11 = Math.max(1e-12, nextP11);

      previousTime = current.time;
    } else {
      previousTime = current.time;
    }

    // Update
    const innovation = y - ability;
    const S = P00 + observationVariance;

    if (!Number.isFinite(S) || S <= 1e-12) {
      continue;
    }

    const K0 = P00 / S;
    const K1 = P01 / S;

    ability = clampNumber(ability + K0 * innovation, minScore, maxScore);
    trend = clampNumber(trend + K1 * innovation, -maxTrendPerDay, maxTrendPerDay);

    // Atualização de covariância via forma de Joseph, mais estável.
    const A00 = 1 - K0;
    const A01 = 0;
    const A10 = -K1;
    const A11 = 1;

    const AP00 = A00 * P00 + A01 * P01;
    const AP01 = A00 * P01 + A01 * P11;
    const AP10 = A10 * P00 + A11 * P01;
    const AP11 = A10 * P01 + A11 * P11;

    const newP00 =
      AP00 * A00 +
      AP01 * A01 +
      K0 * observationVariance * K0;

    const newP01 =
      AP00 * A01 +
      AP01 * A11 +
      K0 * observationVariance * K1;

    const newP11 =
      AP10 * A01 +
      AP11 * A11 +
      K1 * observationVariance * K1;

    P00 = Math.max(1e-12, newP00);
    P01 = newP01;
    P11 = Math.max(1e-12, newP11);

    // Log-likelihood para diagnóstico futuro.
    logLikelihood +=
      -0.5 * Math.log(2 * Math.PI * S) -
      0.5 * ((innovation * innovation) / S);
  }

  const trendPerMonth = clampNumber(trend * 30, -domain, domain);

  return {
    model: 'local_level_trend_kalman',
    ability: clampNumber(ability, minScore, maxScore),
    trendPerDay: clampNumber(trend, -maxTrendPerDay, maxTrendPerDay),
    trendPerMonth,
    abilitySd: Math.sqrt(Math.max(0, P00)),
    trendSd: Math.sqrt(Math.max(0, P11)),
    observationVariance,
    processNoise: {
      ability: qAbility,
      trend: qTrend,
    },
    logLikelihood,
    sampleSize: obs.length,
    maxScore,
    minScore,
  };
}

export default {
  kalmanAbilityTrend,
};
