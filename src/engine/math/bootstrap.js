import { makeNormalRng } from '../random.js';
import { kahanSum } from './kahan.js';

/**
 * Percentile bootstrap CI for robust uncertainty estimation.
 * Útil quando suposições de normalidade são fracas.
 *
 * CORREÇÃO: bootstrap não-paramétrico puro.
 * O smoothed bootstrap (ruído gaussiano para N < 5) foi removido
 * porque inflava artificialmente o intervalo de confiança.
 */
export function bootstrapCI(samples, statFn, {
  iterations = 1000,
  alpha = 0.05,
  seed = 42,
} = {}) {
  const clean = (samples || []).map(Number).filter(Number.isFinite);
  if (clean.length === 0) return { estimate: 0, low: 0, high: 0, n: 0 };

  const fn = typeof statFn === 'function'
    ? statFn
    : (values) => kahanSum(values) / values.length;

  const estimateRaw = Number(fn(clean));
  const estimate = estimateRaw;
  const n = clean.length;
  const iters = Math.max(500, Math.floor(Number(iterations) || 1000));
  const safeAlpha = Math.max(0.001, Math.min(0.5, Number(alpha) || 0.05));
  const qLow = safeAlpha / 2;
  const qHigh = 1 - qLow;

  // Caso degenerado: 1 observação → IC colapsa no ponto
  if (n === 1) {
    return { estimate, low: estimate, high: estimate, n, iterations: 0, method: 'degenerate' };
  }

  // PRNG determinístico (LCG)
  let state = (Number(seed) >>> 0) || 42;
  const rand = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };

  // ✅ Bootstrap percentílico puro — sem ruído artificial
  const dist = new Array(iters);
  for (let i = 0; i < iters; i++) {
    const bag = new Array(n);
    for (let j = 0; j < n; j++) {
      bag[j] = clean[Math.min(n - 1, Math.floor(rand() * n))];
    }
    const value = Number(fn(bag));
    dist[i] = Number.isFinite(value) ? value : estimate;
  }

  dist.sort((a, b) => a - b);

  const quantile = (p) => {
    const idx = (dist.length - 1) * Math.max(0, Math.min(1, p));
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return dist[lo];
    const w = idx - lo;
    return dist[lo] * (1 - w) + dist[hi] * w;
  };

  return {
    estimate,
    low: quantile(qLow),
    high: quantile(qHigh),
    n,
    iterations: iters,
    alpha: safeAlpha,
    method: 'percentile_bootstrap',
  };
}

/**
 * Split-conformal prediction interval.
 *
 * CORREÇÃO: usa resíduos ABSOLUTOS |y - ŷ|, não resíduos com sinal.
 * O quantil conformal é o ceil((n+1)(1-α))-ésimo menor resíduo absoluto.
 */
export function conformalPredictionInterval(residuals = [], alpha = 0.05, pointEstimate = 0) {
  const clean = residuals.map(Number).filter(Number.isFinite);
  const p = Number.isFinite(Number(pointEstimate)) ? Number(pointEstimate) : 0;
  const a = Math.max(0.001, Math.min(0.5, Number(alpha) || 0.05));

  if (clean.length < 3) {
    const fallbackMargin = Math.max(1, Math.abs(p) * 0.08 || 8);
    return {
      lower: p - fallbackMargin,
      upper: p + fallbackMargin,
      coverage: 1 - a,
      n: clean.length,
      method: 'fallback_insufficient_data',
    };
  }

  // ✅ Resíduos absolutos ordenados
  const absResiduals = clean.map(Math.abs).sort((x, y) => x - y);
  const n = absResiduals.length;

  // Rank conformal: ceil((n+1)(1-α)) - 1, limitado a [0, n-1]
  const rank = Math.min(n - 1, Math.max(0, Math.ceil((n + 1) * (1 - a)) - 1));
  const q = absResiduals[rank];

  return {
    lower: p - q,
    upper: p + q,
    conformalQuantile: Number(q.toFixed(6)),
    n,
    alpha: a,
    coverage: 1 - a,
    method: 'split_conformal_absolute_residual',
  };
}
