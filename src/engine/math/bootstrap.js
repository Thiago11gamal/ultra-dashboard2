/**
 * Percentile bootstrap CI for robust uncertainty estimation.
 * Useful when normality assumptions are weak.
 */
export function bootstrapCI(samples, statFn, {
  iterations = 1000,
  alpha = 0.05,
  seed = 42,
} = {}) {
  const clean = (samples || []).map(Number).filter(Number.isFinite);
  if (clean.length === 0) return { estimate: 0, low: 0, high: 0, n: 0 };

  const estimate = Number(statFn(clean));
  const iters = Math.max(200, Math.floor(iterations));
  const a = Math.min(0.49, Math.max(0.001, alpha / 2));

  let s = seed >>> 0;
  const rand = () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const dist = new Array(iters);
  const n = clean.length;
  for (let i = 0; i < iters; i++) {
    const bag = new Array(n);
    for (let j = 0; j < n; j++) {
      bag[j] = clean[Math.floor(rand() * n)];
    }
    const v = Number(statFn(bag));
    dist[i] = Number.isFinite(v) ? v : estimate;
  }

  dist.sort((x, y) => x - y);
  const q = (p) => {
    const idx = (dist.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return dist[lo];
    const w = idx - lo;
    return dist[lo] * (1 - w) + dist[hi] * w;
  };

  return {
    estimate,
    low: q(a),
    high: q(1 - a),
    n,
  };
}
