export function hashSeed(str) {
  const text = String(str ?? '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
    let state = Number.isFinite(Number(seed)) ? (Number(seed) | 0) : 0;
    return function () {
        state = (state + 0x6D2B79F5) | 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// BUGFIX H3: Box-Muller completo com cache do 2° valor.
// Antes: sin() era calculado e descartado, dobrando as chamadas ao RNG.
// Agora: o 2° valor é guardado em closure e retornado na próxima chamada.
export function makeNormalRng(rng = Math.random) {
  const safeRng = typeof rng === 'function' ? rng : Math.random;
  let spare;
  let hasSpare = false;
  
  const next = () => {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }
    let u = 0, v = 0;
    let attemptsU = 0;
    while ((u <= 0 || u >= 1 || !Number.isFinite(u)) && attemptsU < 100) {
      u = safeRng();
      attemptsU++;
    }
    if (u <= 0 || u >= 1 || !Number.isFinite(u)) u = 1e-15;

    let attemptsV = 0;
    while ((v <= 0 || v >= 1 || !Number.isFinite(v)) && attemptsV < 100) {
      v = safeRng();
      attemptsV++;
    }
    if (v <= 0 || v >= 1 || !Number.isFinite(v)) v = 1e-15;
    
    const mag = Math.sqrt(-2.0 * Math.log(u));
    spare = mag * Math.sin(2.0 * Math.PI * v);
    hasSpare = true;
    return mag * Math.cos(2.0 * Math.PI * v);
  };
  
  // ✅ FIX: função reset para limpar estado interno quando seed muda
  const reset = () => {
    spare = undefined;
    hasSpare = false;
  };
  
  // Retorna função com propriedade reset anexada
  next.reset = reset;
  return next;
}

export const createGaussianSampler = makeNormalRng;

/**
 * Amostrador Gamma(shape, scale=1) via Marsaglia & Tsang (2000).
 */
export function sampleGamma(shape, rng = Math.random, gaussianSampler = null) {
  const safeShape = Number(shape);
  if (!Number.isFinite(safeShape) || safeShape <= 0) return 0;
  const safeRng = typeof rng === 'function' ? rng : Math.random;
  const nextGaussian = typeof gaussianSampler === 'function' ? gaussianSampler : makeNormalRng(safeRng);

  if (safeShape < 1) {
    const u = Math.max(1e-12, safeRng());
    return sampleGamma(safeShape + 1, safeRng, nextGaussian) * Math.pow(u, 1 / safeShape);
  }

  const d = safeShape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  for (let iter = 0; iter < 10000; iter++) {
    const x = nextGaussian();
    let v = 1 + c * x;
    if (v <= 0) continue;
    v = v * v * v;
    const u = Math.max(1e-12, safeRng());
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
  return safeShape;
}

/**
 * Amostrador Beta(alpha, beta) via razão de variáveis Gamma independentes.
 */
export function sampleBeta(alpha, beta, rng = Math.random, gaussianSampler = null) {
  const a = Math.max(1e-3, Number(alpha) || 1);
  const b = Math.max(1e-3, Number(beta) || 1);
  const safeRng = typeof rng === 'function' ? rng : Math.random;
  const nextGaussian = typeof gaussianSampler === 'function' ? gaussianSampler : makeNormalRng(safeRng);
  const x = sampleGamma(a, safeRng, nextGaussian);
  const y = sampleGamma(b, safeRng, nextGaussian);
  const denom = x + y;
  if (!(denom > 0) || !Number.isFinite(denom)) return a / (a + b);
  return x / denom;
}



