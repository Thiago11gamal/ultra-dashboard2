# src\utils\autoTunerGate.js

```js
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
  if (n < 8) return { promote: false, reason: 'insufficient_samples', ciLow: null, ciHigh: null, n };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const observed = mean(d);
  const means = [];
  for (let b = 0; b < nBoot; b++) {
    const sample = [];
    while (sample.length < n) {
      const start = Math.floor(rng() * n);
      for (let j = 0; j < blockLength && sample.length < n; j++) sample.push(d[(start + j) % n]);
    }
    means.push(mean(sample));
  }
  means.sort((a, b) => a - b);
  const ciLow = means[Math.floor((alpha / 2) * nBoot)];
  const ciHigh = means[Math.ceil((1 - alpha / 2) * nBoot) - 1];
  const promote = ciHigh < 0 && Math.abs(observed) >= minEffect;
  return { promote, ciLow, ciHigh, observed, n };
}
// Uso no AutoTuner: if (rawAction === 'promote' && !gate.promote)
//   action = gate.n < 8 ? 'keep' : 'explore';


```
