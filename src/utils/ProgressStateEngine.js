/**
 * ProgressStateEngine
 * 
 * Detects qualified stagnation states and differentiates from
 * evolution, regression, and instability.
 */

import { toDateMs } from './dateHelper.js';

const DEFAULT_CONFIG = {
    window_size: 10,
    stagnation_threshold: 5.0, // Alinhado com estabilidade de 5% da escala (rigoroso)
    low_level_limit: 60,
    high_level_limit: 75,
    mastery_limit: 80, // Sincronizado com targetScore padrão
    trend_tolerance: 0.5 // Alinhado com 0.5 pp/30d (unificado)
};

export function analyzeProgressState(scores, config = {}) {
  const {
    window_size,
    stagnation_threshold: raw_stagnation,
    low_level_limit,
    high_level_limit,
    mastery_limit,
    trend_tolerance: raw_trend,
    maxScore = 100
  } = { ...DEFAULT_CONFIG, ...config };

  const scaleFactor = maxScore / 100;
  const windowFactor = Math.sqrt(10 / Math.max(3, window_size));
  const stagnation_threshold = raw_stagnation * scaleFactor * windowFactor;
  const trend_tolerance = raw_trend * scaleFactor * windowFactor;

  // ✅ FIX: Blindagem contra configs inválidas
  let scaled_low     = low_level_limit  * scaleFactor;
  let scaled_high    = high_level_limit * scaleFactor;
  let scaled_mastery = mastery_limit    * scaleFactor;
  if (!Number.isFinite(scaled_low))     scaled_low     = 60 * scaleFactor;
  if (!Number.isFinite(scaled_high))    scaled_high    = Math.max(scaled_low, 75 * scaleFactor);
  if (!Number.isFinite(scaled_mastery)) scaled_mastery = Math.max(scaled_high, 80 * scaleFactor);
  if (scaled_high    < scaled_low)    scaled_high    = scaled_low;
  if (scaled_mastery < scaled_high)   scaled_mastery = scaled_high;

  const safeWindowSize = Math.max(3, window_size);
  const safeScores = Array.isArray(scores) ? scores : Object.values(scores || {});
  if (!safeScores || safeScores.length < safeWindowSize) {
    return {
      state: 'insufficient_data',
      label: 'Dados Insuficientes',
      mean_score: 0, delta: 0, variance: 0, trend_slope: 0, severity: 'none'
    };
  }

  const syntheticNow = Date.now();
  const sortedScores = safeScores
    .filter(d => d != null)
    .map((d, index) => {
      let time = (d && typeof d === 'object') ? toDateMs(d.date) : NaN;
      if (!Number.isFinite(time)) time = syntheticNow - ((safeScores.length - index) * 86400000);
      return { original: d, safeTime: time };
    })
    .filter(item => Number.isFinite(item.safeTime))
    .sort((a, b) => a.safeTime - b.safeTime);

  const validSortedScores = sortedScores.filter(d => {
    const score = typeof d.original === 'object' ? d.original.score : d.original;
    return Number.isFinite(score);
  });
  const recentData = validSortedScores.slice(-safeWindowSize);
  const finiteRecentScores = recentData.map(d => typeof d.original === 'object' ? d.original.score : d.original);
  if (finiteRecentScores.length < safeWindowSize) {
    return {
      state: 'insufficient_data',
      label: 'Dados Insuficientes',
      mean_score: 0, delta: 0, variance: 0, trend_slope: 0, severity: 'none'
    };
  }

  const nTotal = finiteRecentScores.length;
  const mean = nTotal > 0 ? finiteRecentScores.reduce((a, b) => a + b, 0) / nTotal : 0;
  let variationTotal = 0;
  for (let i = 1; i < finiteRecentScores.length; i++) {
    variationTotal += Math.abs(finiteRecentScores[i] - finiteRecentScores[i - 1]);
  }
  const delta = variationTotal / (finiteRecentScores.length - 1);
  const variance = finiteRecentScores.reduce((acc, score) =>
    acc + Math.pow(score - mean, 2), 0) / (finiteRecentScores.length - 1);

  const recentDates = recentData.map(d => d.safeTime);
  const n = finiteRecentScores.length;
  const startTime = recentDates[0] || Date.now();
  const xDays = [];
  recentDates.forEach((d, i) => {
    let days = (d - startTime) / 86400000;
    if (i > 0 && days <= xDays[i - 1]) {
      days = xDays[i - 1] + 0.001;
    }
    xDays.push(days);
  });
  const xMean = xDays.reduce((a, b) => a + b, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xDays[i] - xMean) * (finiteRecentScores[i] - mean);
    denominator += Math.pow(xDays[i] - xMean, 2);
  }
  const safeDenominator = denominator < 0.25 ? 0.25 : denominator;
  const rawSlope = safeDenominator > 0 ? numerator / safeDenominator : 0;
  const normalizedSlope = rawSlope * 30;

  const stagnated = delta <= stagnation_threshold && Math.abs(normalizedSlope) <= trend_tolerance;

  let state = '';
  let label = '';
  let severity = 'none';

  if (stagnated) {
    if (mean >= scaled_mastery) {
      state = 'mastery'; label = 'Domínio (Consistente no Topo)'; severity = 'none';
    } else if (mean < scaled_low) {
      state = 'stagnation_negative'; label = 'Estagnação em nível baixo'; severity = 'high';
    } else if (mean < scaled_high) {
      state = 'stagnation_neutral'; label = 'Estagnação em nível médio'; severity = 'medium';
    } else {
      state = 'stagnation_positive'; label = 'Estagnação em nível alto'; severity = 'low';
    }
  } else {
    const cv = mean > 1e-6 ? Math.sqrt(variance) / Math.max(mean, 30 * scaleFactor) : 0;
    const cvThreshold = 0.15 * Math.sqrt(10 / Math.max(3, safeWindowSize));
    const isVeryUnstable = cv > cvThreshold;
    if (normalizedSlope < -trend_tolerance) {
      state = 'regression';
      label = isVeryUnstable ? 'Queda Acentuada (Instável)' : 'Em regressão';
      severity = 'high';
    } else if (normalizedSlope > trend_tolerance && !isVeryUnstable) {
      state = 'progression'; label = 'Em evolução'; severity = 'none';
    } else {
      state = 'unstable'; label = 'Instável / Flutuação'; severity = 'medium';
    }
  }

  // BUG-T13 FIX: Clamp do trend_slope para evitar valores absurdos
  // quando há pouquíssimos pontos ou datas muito próximas.
  // Limitar a ±5% do maxScore por 30 dias.
  const maxSlopeLimit = 0.05 * maxScore;
  const clampedSlope = Math.max(-maxSlopeLimit, Math.min(maxSlopeLimit, rawSlope * 30));

  return {
    state, label,
    mean_score: Number(mean.toFixed(2)),
    delta: Number(delta.toFixed(2)),
    variance: Number(variance.toFixed(2)),
    trend_slope: Number(clampedSlope.toFixed(4)),
    severity
  };
}

export function getUIHints(state) {
    const hints = {
        insufficient_data: { color: 'slate', icon: 'minus' },
        mastery: { color: 'violet', icon: 'award' },
        stagnation_negative: { color: 'red', icon: 'alert-triangle' },
        stagnation_neutral: { color: 'yellow', icon: 'pause-circle' },
        stagnation_positive: { color: 'green', icon: 'shield-check' },
        progression: { color: 'blue', icon: 'trending-up' },
        regression: { color: 'red', icon: 'trending-down' },
        unstable: { color: 'orange', icon: 'activity' }
    };

    return hints[state] || hints.insufficient_data;
}

export default { analyzeProgressState, getUIHints };

