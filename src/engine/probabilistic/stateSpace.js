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

/**
 * State Space Model para estimativa de habilidade latente.
 * Usa filtro de Kalman simplificado com média de Kahan corrigida.
 */

/**
 * ✅ CORRIGE BUG-003: Média de Kahan agora divide pelo contador de valores válidos,
 * não pelo length original do array.
 *
 * Antes: sum / values.length (errado com NaN)
 * Depois: sum / count (correto)
 */
function kahanMean(values) {
  if (!Array.isArray(values) || values.length === 0) return null; // ✅ FIX #5: null ao invés de 0

  let sum = 0;
  let c = 0;
  let count = 0; // ✅ contador de valores válidos

  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;

    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
    count++;
  }

  // ✅ FIX #5: Se nenhum valor válido, retorna null (sem dados), não 0 (média zero)
  // Permite consumidor diferenciar "sem dados" de "média é zero"
  return count === 0 ? null : sum / count;
}

/**
 * Variância com soma de Kahan.
 */
function kahanVariance(values, mean = null) {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const validValues = values.map(Number).filter(Number.isFinite);
  if (validValues.length === 0) return 0;

  const avg = mean ?? kahanMean(validValues);

  let sum = 0;
  let c = 0;
  let count = 0;

  for (const value of validValues) {
    const diff = (value - avg) ** 2;
    const y = diff - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
    count++;
  }

  return count === 0 ? 0 : sum / count;
}

/**
 * Desvio padrão com soma de Kahan.
 */
function kahanStd(values, mean = null) {
  const variance = kahanVariance(values, mean);
  if (!Number.isFinite(variance)) return 0;
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Filtro de Kalman simplificado para estimativa de habilidade.
 */
export function runStateSpaceModel(scores, options = {}) {
  const {
    processNoise = 0.1,
    observationNoise = 1.0,
    initialVariance = 100,
  } = options;

  const validScores = Array.isArray(scores)
    ? scores.map(Number).filter(Number.isFinite)
    : [];

  if (validScores.length === 0) {
    return {
      ability: 0,
      variance: initialVariance,
      trend: 0,
      insufficientData: true,
    };
  }

  // ✅ CORRIGE BUG-003: usa kahanMean corrigido
  const initialAbility = kahanMean(validScores) ?? 50; // ✅ FIX #5: fallback para 50 se null
  const initialStd = kahanStd(validScores, initialAbility);

  let ability = initialAbility;
  let variance = Math.max(initialVariance, initialStd ** 2);

  let trendSum = 0;
  let trendCount = 0;
  let prevAbility = ability;

  for (const score of validScores) {
    // Predição
    const predictedVariance = variance + processNoise;

    // Atualização (gain)
    const gain = predictedVariance / (predictedVariance + observationNoise);

    // Inovação
    const innovation = score - ability;

    // Atualização de estado
    ability = ability + gain * innovation;
    variance = (1 - gain) * predictedVariance;

    // Trend
    if (trendCount > 0) {
      trendSum += ability - prevAbility;
      trendCount++;
    } else {
      trendCount = 1;
    }

    prevAbility = ability;
  }

  const trend = trendCount > 1 ? trendSum / (trendCount - 1) : 0;

  return {
    ability,
    variance,
    std: Math.sqrt(variance),
    trend,
    n: validScores.length,
    insufficientData: validScores.length < 3,
  };
}

/**
 * Wrapper para compatibilidade com código existente.
 */
export function estimateAbility(scores, options = {}) {
  return runStateSpaceModel(scores, options);
}

export default {
  runStateSpaceModel,
  estimateAbility,
  kahanMean,
  kahanVariance,
  kahanStd,
};
