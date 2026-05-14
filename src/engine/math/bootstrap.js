import { makeNormalRng } from '../random.js';

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
  const safeEstimate = estimate; // Preserve NaN if that's what statFn returns (Bug-Fix for regression tests)
  
  const iters = Math.max(200, Math.floor(iterations));
  const a = Math.min(0.49, Math.max(0.001, alpha / 2));

  let s = seed >>> 0;
  const rand = () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const dist = new Array(iters);
  const n = clean.length;
  const bootstrapFallback = Number.isFinite(safeEstimate) ? safeEstimate : 0;
  
  // BUG-03 FIX: Prevenção de Colapso de Variância para N < 5 (Smoothed Bootstrap).
  // Injetamos ruído Gaussiano proporcional ao erro padrão para evitar subestimar a incerteza
  // em amostras esparsas, alargando artificialmente o intervalo de confiança.
  let sampleVariance = 0;
  if (n > 1) {
    const m = clean.reduce((acc, val) => acc + val, 0) / n;
    sampleVariance = clean.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (n - 1);
  }
  
  // Criamos o gerador de ruído apenas se houver variância e N for pequeno.
  const noiseStdDev = (n < 5 && sampleVariance > 0) ? Math.sqrt(sampleVariance / n) : 0;
  const normalRng = noiseStdDev > 0 ? makeNormalRng(rand) : null;

  for (let i = 0; i < iters; i++) {
    const bag = new Array(n);
    for (let j = 0; j < n; j++) {
      let val = clean[Math.floor(rand() * n)];
      
      // Aplicação do Smoothed Bootstrap via Transformada de Box-Muller
      if (normalRng) {
        val += normalRng() * noiseStdDev;
        val = Math.max(0, Math.min(100, val)); // Clamping defensivo
      }
      
      bag[j] = val;
    }
    const v = Number(statFn(bag));
    dist[i] = Number.isFinite(v) ? v : bootstrapFallback;
  }

  // CORREÇÃO: Limpeza obrigatória ANTES do algoritmo de Sorting, pois o motor V8 do JS
  // abandona a ordenação se comparar NaNs durante as trocas da árvore binária.
  const validDist = dist.filter(Number.isFinite);
  if (validDist.length === 0) validDist.push(safeEstimate);
  
  validDist.sort((x, y) => x - y);
  
  const q = (p) => {
    const idx = (validDist.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return validDist[lo];
    const w = idx - lo;
    return validDist[lo] * (1 - w) + validDist[hi] * w;
  };

  return {
    estimate: safeEstimate,
    low: q(a),
    high: q(1 - a),
    n,
  };
}
