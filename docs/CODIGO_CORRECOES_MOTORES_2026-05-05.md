# Código de Correção — Motores Matemáticos (Consolidado)

> Documento solicitado para mostrar os principais trechos de código corrigidos.

## 1) `src/engine/projection.js` — volatilidade robusta (MSSD + MAD)
```js
const expectedResidual = sumResidualsWeighted / sumWeights;
const n_res = sorted.length - 1;
const bessel = n_res > 1 ? n_res / (n_res - 1) : 1;
const mssdVariance = ((sumSw / sumWeights) - (expectedResidual * expectedResidual)) * bessel;

const weightedMedian = (arr) => {
  if (!arr.length) return 0;
  const sortedArr = [...arr].sort((a, b) => a.value - b.value);
  const totalW = sortedArr.reduce((acc, it) => acc + it.weight, 0);
  let accW = 0;
  for (const it of sortedArr) {
    accW += it.weight;
    if (accW >= totalW * 0.5) return it.value;
  }
  return sortedArr[sortedArr.length - 1].value;
};

const medianResidual = weightedMedian(residualSamples);
const absDev = residualSamples.map(it => ({ value: Math.abs(it.value - medianResidual), weight: it.weight }));
const mad = weightedMedian(absDev);
const robustSigma = 1.4826 * mad;
const robustVariance = robustSigma * robustSigma;
const blendedVariance = (0.75 * mssdVariance) + (0.25 * robustVariance);

return Math.sqrt(Math.max(Math.pow(1.0 * scaleFactorFallback, 2), blendedVariance));
```

## 2) `src/engine/variance.js` — ESS + Fisher-z weighting + shrinkage
```js
export function computeEffectiveSampleSizeFromWeights(weights = []) {
  const clean = Array.isArray(weights) ? weights.map(w => Number(w)).filter(w => Number.isFinite(w) && w > 0) : [];
  if (clean.length === 0) return 0;
  const sumW = clean.reduce((a, b) => a + b, 0);
  const sumW2 = clean.reduce((a, b) => a + (b * b), 0);
  return sumW2 > 0 ? (sumW * sumW) / sumW2 : 0;
}

// dentro de estimateInterSubjectCorrelation(...)
const w = Math.max(1, p.n - 3);
const r = Math.max(-0.999, Math.min(0.999, p.corr));
const z = 0.5 * Math.log((1 + r) / (1 - r));

const essPairs = computeEffectiveSampleSizeFromWeights(pairwise.map(p => Math.max(1, p.n - 3)));
const shrink = Math.max(0, Math.min(1, (avgOverlap / (avgOverlap + 10)) * (essPairs / (essPairs + 6))));
const blended = (shrink * empirical) + ((1 - shrink) * fallback);
```

## 3) `src/engine/stats.js` — desvio padrão robusto (sample + MAD)
```js
const sampleVar = n > 1
  ? clean.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (n - 1)
  : 0;

const sorted = [...clean].sort((a, b) => a - b);
const median = sorted.length % 2 === 0
  ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
  : sorted[Math.floor(sorted.length / 2)];
const absDev = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
const mad = absDev.length % 2 === 0
  ? (absDev[absDev.length / 2 - 1] + absDev[absDev.length / 2]) / 2
  : absDev[Math.floor(absDev.length / 2)];

const robustSigma = 1.4826 * mad;
const robustVar = robustSigma * robustSigma;
const blendedSampleVar = (0.8 * sampleVar) + (0.2 * robustVar);

const adjustedVar = ((n - 1) * blendedSampleVar + KAPPA * Math.pow(POPULATION_SD, 2)) / ((n - 1) + KAPPA);
```

## 4) `src/utils/adaptiveMath.js` — sinal adaptativo com clipping Huber
```js
const robustSigma = Math.max(1e-6, 1.4826 * mad);
const huberK = 2.5 * robustSigma;

const weightedVariance = finiteScores.reduce((acc, s, i) => {
  const d = s - weightedMean;
  const clipped = Math.max(-huberK, Math.min(huberK, d));
  return acc + (weighted[i] * clipped * clipped);
}, 0) / Math.max(1e-9, sumW);
```

## 5) `src/utils/scoreHelper.js` — normalização percentual de fronteira
```js
const normalizePercentInput = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? n * 100 : n;
};
```

## 6) `src/pages/Coach.jsx` — dependência de callback
```js
const handleGenerateGoals = useCallback(() => {
  if (!data?.categories || coachLoading) return;
  // ...
}, [data, coachLoading, setData, showToast, persistCalibrationMetric, userProfile?.targetProbability]);
```
