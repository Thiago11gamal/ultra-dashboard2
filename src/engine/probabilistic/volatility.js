/**
 * volatility.js
 *
 * Lote 2 — Volatilidade dinâmica EWMA/GARCH para o Coach.
 *
 * Objetivo:
 * - estimar volatilidade condicional futura;
 * - reduzir reação excessiva a ruído antigo;
 * - aumentar reação a instabilidade recente;
 * - fornecer base para Monte Carlo posterior preditivo no Lote 3.
 */

import { kahanSum } from '../math/kahan.js';
import { getSafeScore } from '../../utils/scoreHelper.js';

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseTime(value) {
  if (value === null || value === undefined) return NaN;

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
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

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return NaN;
  const sorted = [...values]
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (sorted.length === 0) return NaN;

  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Estima volatilidade dinâmica a partir do histórico de simulados.
 *
 * @param {Array<{score:number,date?:string,createdAt?:string}|number>} history
 * @param {Object} options
 * @param {number} [options.maxScore=100]
 * @param {number} [options.minScore=0]
 * @param {boolean} [options.useGarch=false]
 * @param {boolean} [options.override=false]
 * @param {number} [options.horizonDays]
 * @returns {Object|null}
 */
export function estimateDynamicVolatility(history = [], options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const minScore = clampFinite(options.minScore, -1_000_000, maxScore, 0);
  const domain = Math.max(1e-6, maxScore - minScore);

  const useGarch = options.useGarch === true;
  const override = options.override === true;

  const rawHistory = Array.isArray(history)
    ? history
    : Object.values(history || {});

  const observations = rawHistory
    .map((entry, index) => {
      const rawScore =
        entry && typeof entry === 'object'
          ? getSafeScore(entry, maxScore, minScore)
          : Number(typeof entry === 'string' ? entry.replace(',', '.') : entry);
      const time = parseTime(entry?.date ?? entry?.createdAt ?? entry?.timestamp);

      return {
        index,
        score: Number.isFinite(rawScore) ? clampFinite(rawScore, minScore, maxScore, rawScore) : NaN,
        time,
      };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      const hasTimeA = Number.isFinite(a.time);
      const hasTimeB = Number.isFinite(b.time);

      if (hasTimeA && hasTimeB) {
        if (a.time !== b.time) return a.time - b.time;
        return a.index - b.index;
      }
      if (hasTimeA !== hasTimeB) {
        return hasTimeA ? -1 : 1;
      }

      return a.index - b.index;
    });

  if (observations.length < 3) {
    return null;
  }

  const scores = observations.map((entry) => entry.score);
  const n = scores.length;

  // Volatilidade fallback: desvio padrão amostral com shrinkage.
  const mean = kahanSum(scores) / n;
  const sampleVariance =
    n > 1
      ? kahanSum(scores.map((score) => Math.pow(score - mean, 2))) / (n - 1)
      : 0;

  const fallbackVolatility =
    Math.sqrt(Math.max(0, sampleVariance)) * (n / (n + 4)) +
    domain * 0.08 * (4 / (n + 4));

  // Retornos diários aproximados.
  const returns = [];
  const dts = [];

  for (let i = 1; i < observations.length; i++) {
    const prev = observations[i - 1];
    const curr = observations[i];

    let dtDays = 1;

    if (Number.isFinite(prev.time) && Number.isFinite(curr.time)) {
      const rawDeltaDays = (curr.time - prev.time) / 86400000;
      dtDays = rawDeltaDays > 0
        ? clampFinite(rawDeltaDays, 0.25, 60, 1)
        : 0.25;
    }

    const diff = curr.score - prev.score;
    const dailyReturn = diff / Math.sqrt(dtDays);

    if (Number.isFinite(dailyReturn)) {
      returns.push(dailyReturn);
      dts.push(dtDays);
    }
  }

  if (returns.length < 2) {
    return null;
  }

  const medianGapDays = clampFinite(median(dts), 0.5, 60, 7);
  const horizonDays = clampFinite(options.horizonDays, 1, 90, medianGapDays);

  // Winsorização leve dos retornos para reduzir outliers.
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const lower = quantileSorted(sortedReturns, 0.05);
  const upper = quantileSorted(sortedReturns, 0.95);

  const winsorizedReturns = returns.map((r) =>
    clampFinite(r, lower, upper, r)
  );

  const returnMean = kahanSum(winsorizedReturns) / winsorizedReturns.length;

  const returnVariance =
    winsorizedReturns.length > 1
      ? kahanSum(
          winsorizedReturns.map((r) => Math.pow(r - returnMean, 2))
        ) / (winsorizedReturns.length - 1)
      : 0;

  const unconditionalDailyVariance = Math.max(
    Math.pow(domain * 0.0015, 2),
    returnVariance
  );

  let sigma2Daily = unconditionalDailyVariance;
  let model = 'ewma';
  let omega = null;
  let alpha = null;
  let beta = null;
  let persistence = 0.94;

  const maxDailyVol = domain * 0.20;
  const maxSigma2 = Math.pow(maxDailyVol, 2);

  if (useGarch && returns.length >= 5) {
    model = 'garch11';

    // FIX-PARAM: persistência GARCH reduzida.
    // Antes: α+β ∈ [0.86, 0.92] → choques demoram 7-12 períodos para
    // decair pela metade. Para simulados espaçados 7 dias, isso é
    // 50-84 dias de memória de volatilidade — excessivo.
    // Agora: α+β ∈ [0.76, 0.84] → meia-vida de 3-5 períodos.
    const maturity = clampFinite((returns.length - 5) / 10, 0, 1, 0);
    alpha = 0.16 - 0.04 * maturity;
    beta = 0.60 + 0.08 * maturity;
    // Estacionaridade: alpha + beta < 1.
    if (alpha + beta > 0.90) {
      beta = 0.90 - alpha;
    }

    omega = Math.max(
      1e-12,
      unconditionalDailyVariance * Math.max(0.03, 1 - alpha - beta)
    );

    persistence = alpha + beta;

    for (let i = 0; i < winsorizedReturns.length; i++) {
      const dt = clampFinite(dts[i], 0.25, 30, 1);
      const centered = winsorizedReturns[i] - returnMean;
      const shock = centered * centered;
      const betaEffective = Math.pow(beta, dt);
      const stepScale = (1 - betaEffective) / Math.max(1e-6, 1 - beta);

      sigma2Daily =
        (omega + alpha * shock) * stepScale +
        betaEffective * sigma2Daily;

      sigma2Daily = clampFinite(sigma2Daily, 1e-12, maxSigma2, sigma2Daily);
    }
  } else {
    model = 'ewma';

    const lambda = 0.94;
    persistence = lambda;

    for (let i = 0; i < winsorizedReturns.length; i++) {
      const dt = clampFinite(dts[i], 0.25, 30, 1);
      const lambdaEffective = Math.pow(lambda, dt);
      const centered = winsorizedReturns[i] - returnMean;
      const shock = centered * centered;

      sigma2Daily =
        lambdaEffective * sigma2Daily +
        (1 - lambdaEffective) * shock;

      sigma2Daily = clampFinite(sigma2Daily, 1e-12, maxSigma2, sigma2Daily);
    }
  }

  const dailyVolatility = clampFinite(
    Math.sqrt(Math.max(0, sigma2Daily)),
    0,
    maxDailyVol,
    0
  );

  // Converte volatilidade diária em volatilidade esperada para o intervalo típico.
  const modelVolatility =
    dailyVolatility * Math.sqrt(Math.max(1, horizonDays));

  // Shrinkage bayesiano simples por tamanho amostral.
  const sampleTrust = Math.min(1, returns.length / (returns.length + 8));

  const blendedVolatility =
    sampleTrust * modelVolatility +
    (1 - sampleTrust) * fallbackVolatility;

  const rawVolatility = override ? modelVolatility : blendedVolatility;

  const volatility = clampFinite(
    rawVolatility,
    0,
    domain * 0.65,
    fallbackVolatility
  );

  return {
    model,
    volatility,
    modelVolatility: clampFinite(modelVolatility, 0, domain * 0.65, modelVolatility),
    fallbackVolatility: clampFinite(fallbackVolatility, 0, domain * 0.65, fallbackVolatility),
    dailyVolatility,
    horizonDays,
    medianGapDays,
    sampleSize: returns.length,
    parameters: {
      omega,
      alpha,
      beta,
      persistence,
    },
    diagnostics: {
      returnMean,
      returnVariance,
      unconditionalDailyVariance,
      maxSigma2,
    },
  };
}

export default {
  estimateDynamicVolatility,
};
