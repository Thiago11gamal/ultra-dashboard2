# Código de correção de cada uma (fontes atuais)

## 1) `src/engine/projection.js`
```js
const mssdVariance = ((sumSw / sumWeights) - (expectedResidual * expectedResidual)) * bessel;

const medianResidual = weightedMedian(residualSamples);
const absDev = residualSamples.map(it => ({ value: Math.abs(it.value - medianResidual), weight: it.weight }));
const mad = weightedMedian(absDev);
const robustSigma = 1.4826 * mad;
const robustVariance = robustSigma * robustSigma;
const blendedVariance = (0.75 * mssdVariance) + (0.25 * robustVariance);

return Math.sqrt(Math.max(Math.pow(1.0 * scaleFactorFallback, 2), blendedVariance));
```

## 2) `src/engine/stats.js`
```js
const safeCorrect = Math.max(0, Math.min(total, correct));
const acertosHoje = safeCorrect;
const errosHoje = total - safeCorrect;
```

## 3) `src/engine/variance.js`
```js
export function computeEffectiveSampleSizeFromWeights(weights = []) {
  const clean = Array.isArray(weights) ? weights.map(w => Number(w)).filter(w => Number.isFinite(w) && w > 0) : [];
  if (clean.length === 0) return 0;
  const sumW = clean.reduce((a, b) => a + b, 0);
  const sumW2 = clean.reduce((a, b) => a + (b * b), 0);
  return sumW2 > 0 ? (sumW * sumW) / sumW2 : 0;
}

const w = Math.max(1, p.n - 3);
const essPairs = computeEffectiveSampleSizeFromWeights(pairwise.map(p => Math.max(1, p.n - 3)));
const shrink = Math.max(0, Math.min(1, (avgOverlap / (avgOverlap + 10)) * (essPairs / (essPairs + 6))));
```

## 4) `src/utils/adaptiveMath.js`
```js
const robustSigma = Math.max(1e-6, 1.4826 * mad);
const huberK = 2.5 * robustSigma;

const weightedVariance = finiteScores.reduce((acc, s, i) => {
  const d = s - weightedMean;
  const clipped = Math.max(-huberK, Math.min(huberK, d));
  return acc + (weighted[i] * clipped * clipped);
}, 0) / Math.max(1e-9, sumW);
```

## 5) `src/utils/scoreHelper.js`
```js
const normalizePercentInput = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? n * 100 : n;
};
```

## 6) `src/pages/Coach.jsx`
```js
const handleGenerateGoals = useCallback(() => {
  if (!data?.categories || coachLoading) return;
  // ...
}, [data, coachLoading, setData, showToast, persistCalibrationMetric, userProfile?.targetProbability]);
```
