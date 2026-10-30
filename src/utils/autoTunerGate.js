/**
 * Gate de significância para promoção de estratégias (AutoTuner).
 * Bootstrap em BLOCOS sobre ΔBrier pareado (respeita autocorrelação
 * dos folds walk-forward). Promove só se IC95% inteiro < 0 E |Δ| ≥ minEffect.
 */
export function bootstrapPromotionGate(pairedDeltas, {
  nBoot = 2000, alpha = 0.05, blockLength = 3, minEffect = 0.01, rng = Math.random
} = {}) {
  const d = (pairedDeltas || []).map(Number).filter(Number.isFinite);
  const n = d.length;
  const safeNBoot = Math.max(10, Math.round(Number(nBoot) || 2000));
  const safeAlpha = Math.min(0.5, Math.max(0.001, Number(alpha) || 0.05));
  const safeBlock = Math.min(n, Math.max(1, Math.round(Number(blockLength) || 3)));
  if (n < 8) return { promote: false, reason: 'insufficient_samples', ciLow: null, ciHigh: null, n };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const observed = mean(d);
  // Blocos móveis não-circulares evitam colar o fold mais recente d[n-1] ao mais antigo d[0]
  const maxStart = Math.max(1, n - safeBlock + 1);
  // Correção de graus de liberdade para amostras finitas (evita sub-cobertura para 8 <= n < 20)
  const dofScale = Math.sqrt(n / Math.max(1, n - 1));
  const means = [];
  for (let b = 0; b < safeNBoot; b++) {
    const sample = [];
    while (sample.length < n) {
      const start = Math.floor(rng() * maxStart);
      for (let j = 0; j < safeBlock && sample.length < n; j++) sample.push(d[start + j]);
    }
    const bootMean = mean(sample);
    means.push(observed + (bootMean - observed) * dofScale);
  }
  means.sort((a, b) => a - b);
  const lowIdx = Math.min(means.length - 1, Math.max(0, Math.floor((safeAlpha / 2) * safeNBoot)));
  const highIdx = Math.min(means.length - 1, Math.max(0, Math.ceil((1 - safeAlpha / 2) * safeNBoot) - 1));
  const ciLow = means[lowIdx];
  const ciHigh = means[highIdx];
  const promote = ciHigh < 0 && Math.abs(observed) >= minEffect;
  return { promote, ciLow, ciHigh, observed, n };
}
