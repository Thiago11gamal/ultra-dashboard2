/**
 * driftMonitor.js
 *
 * Lote 9 — Drift Guard para o Coach.
 *
 * Detecta:
 * - drift de nota;
 * - drift de volatilidade;
 * - drift de calibração;
 * - drift de probabilidade/calibração preditiva;
 *
 * Técnicas:
 * - EWMA control chart;
 * - CUSUM simples;
 * - comparação baseline vs janela recente;
 * - effect size + z-score aproximado.
 */

import {
  computeCalibrationDiagnostics,
  computeBrierScore,
} from '../../utils/calibration.js';

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function finiteSeries(values) {
  return (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function meanValues(values) {
  const safe = finiteSeries(values);
  if (safe.length === 0) return 0;
  return safe.reduce((acc, val) => acc + val, 0) / safe.length;
}

function varianceValues(values) {
  const safe = finiteSeries(values);
  if (safe.length < 2) return 0;

  const mean = meanValues(safe);
  const devs = safe.map((value) => Math.pow(value - mean, 2));

  return devs.reduce((acc, val) => acc + val, 0) / (safe.length - 1);
}

function sdValues(values) {
  return Math.sqrt(Math.max(0, varianceValues(values)));
}

/**
 * EWMA control chart.
 */
export function computeEwmaControlChart(values, options = {}) {
  const safe = finiteSeries(values);

  if (safe.length < 3) {
    return null;
  }

  const lambda = clampFinite(options.lambda, 0.05, 0.95, 0.2);
  const L = clampFinite(options.L, 1, 5, 2.7);

  const center = meanValues(safe);
  const sigma = sdValues(safe);

  const sigmaEwma = sigma * Math.sqrt(lambda / (2 - lambda));

  let ewma = center;
  const chart = [];
  let violationCount = 0;

  for (let i = 0; i < safe.length; i++) {
    ewma = lambda * safe[i] + (1 - lambda) * ewma;

    const upper = center + L * sigmaEwma;
    const lower = center - L * sigmaEwma;

    const outOfControl = ewma > upper || ewma < lower;

    if (outOfControl) {
      violationCount++;
    }

    chart.push({
      index: i,
      value: safe[i],
      ewma: Number(ewma.toFixed(6)),
      upper: Number(upper.toFixed(6)),
      lower: Number(lower.toFixed(6)),
      outOfControl,
    });
  }

  const last = chart[chart.length - 1];

  return {
    model: 'ewma_control_chart',
    center: Number(center.toFixed(6)),
    sigma: Number(sigma.toFixed(6)),
    sigmaEwma: Number(sigmaEwma.toFixed(6)),
    lambda,
    L,
    ewma: last.ewma,
    upper: last.upper,
    lower: last.lower,
    outOfControl: last.outOfControl,
    violationCount,
    chart: chart.slice(-30),
  };
}

/**
 * CUSUM simples para detectar mudança de média.
 */
export function cusumDrift(values, options = {}) {
  const safe = finiteSeries(values);

  if (safe.length < 5) {
    return null;
  }

  const baselineSize = Math.max(3, Math.floor(safe.length * 0.6));
  const baseline = safe.slice(0, baselineSize);

  const target = meanValues(baseline);
  const sigma = sdValues(baseline) || 1e-6;

  const k = clampFinite(options.k, 0, 5, 0.5) * sigma;
  const h = clampFinite(options.h, 1, 20, 4) * sigma;

  let sPos = 0;
  let sNeg = 0;
  let alarm = null;

  const series = [];

  for (const value of safe) {
    const deviation = value - target;

    sPos = Math.max(0, sPos + deviation - k);
    sNeg = Math.max(0, sNeg - deviation - k);

    if (!alarm && (sPos > h || sNeg > h)) {
      alarm = sPos > h ? 'up' : 'down';
    }

    series.push({
      value,
      sPos: Number(sPos.toFixed(6)),
      sNeg: Number(sNeg.toFixed(6)),
    });
  }

  return {
    model: 'cusum',
    target: Number(target.toFixed(6)),
    sigma: Number(sigma.toFixed(6)),
    k: Number(k.toFixed(6)),
    h: Number(h.toFixed(6)),
    alarm,
    sPos: Number(sPos.toFixed(6)),
    sNeg: Number(sNeg.toFixed(6)),
    series: series.slice(-30),
  };
}

/**
 * Detecta drift genérico em uma série numérica.
 */
export function detectDriftInSeries(values, options = {}) {
  const safe = finiteSeries(values);

  const recentWindow = Math.round(clampFinite(options.recentWindow, 2, 30, 5));
  const minSamples = Math.round(clampFinite(options.minSamples, 4, 200, 8));

  if (safe.length < minSamples) {
    return null;
  }

  const recent = safe.slice(-recentWindow);

  const baseline = safe.slice(
    0,
    Math.max(3, safe.length - recent.length)
  );

  if (baseline.length < 3 || recent.length < 2) {
    return null;
  }

  const baselineMean = meanValues(baseline);
  const recentMean = meanValues(recent);

  const baselineSd = sdValues(baseline);
  const recentSd = sdValues(recent);

  const delta = recentMean - baselineMean;

  const epsilon = Math.max(
    1e-6,
    Number(options.epsilon) || Math.abs(baselineMean) * 0.02 || 1
  );

  const effectSize = delta / Math.max(epsilon, baselineSd);

  const se = Math.sqrt(
    (baselineSd * baselineSd) / baseline.length +
    (recentSd * recentSd) / recent.length
  );

  const zScore = se > 1e-9 ? delta / se : 0;

  const effectThresholdLow = clampFinite(options.effectThresholdLow, 0, 5, 0.5);
  const effectThresholdMedium = clampFinite(options.effectThresholdMedium, 0, 6, 1.0);
  const effectThresholdHigh = clampFinite(options.effectThresholdHigh, 0, 8, 1.8);

  let severity = 'none';

  const absEffect = Math.abs(effectSize);
  const absZ = Math.abs(zScore);

  if (absEffect >= effectThresholdHigh || absZ >= 3) {
    severity = 'high';
  } else if (absEffect >= effectThresholdMedium || absZ >= 2) {
    severity = 'medium';
  } else if (absEffect >= effectThresholdLow) {
    severity = 'low';
  }

  let direction = 'none';

  if (delta > 0) direction = 'up';
  else if (delta < 0) direction = 'down';

  const ewma = computeEwmaControlChart(safe, options);
  const cusum = cusumDrift(safe, options);

  const outOfControl =
    Boolean(ewma?.outOfControl) ||
    Boolean(cusum?.alarm && cusum.alarm === direction);

  return {
    model: 'baseline_recent_drift',
    direction,
    severity,
    baselineMean: Number(baselineMean.toFixed(6)),
    recentMean: Number(recentMean.toFixed(6)),
    delta: Number(delta.toFixed(6)),
    effectSize: Number(effectSize.toFixed(6)),
    zScore: Number(zScore.toFixed(6)),
    baselineSize: baseline.length,
    recentSize: recent.length,
    sampleSize: safe.length,
    outOfControl,
    ewma,
    cusum,
  };
}

/**
 * Detecta drift de notas.
 */
export function detectScoreDrift(scores = [], options = {}) {
  const result = detectDriftInSeries(scores, options);

  if (!result) return null;

  return {
    ...result,
    metric: 'score',
    badDirection: 'down',
    isBadDrift: result.direction === 'down' && result.severity !== 'none',
  };
}

/**
 * Detecta drift de volatilidade.
 */
export function detectVolatilityDrift(volatilities = [], options = {}) {
  const result = detectDriftInSeries(volatilities, options);

  if (!result) return null;

  return {
    ...result,
    metric: 'volatility',
    badDirection: 'up',
    isBadDrift: result.direction === 'up' && result.severity !== 'none',
  };
}

/**
 * Detecta drift de calibração usando eventos de telemetria.
 *
 * Eventos esperados:
 * { timestamp, avgBrier, ece, calibrationPenalty }
 */
export function detectCalibrationDrift(events = [], options = {}) {
  const safeEvents = (Array.isArray(events) ? events : [])
    .filter(Boolean)
    .filter(
      (event) =>
        Number.isFinite(Number(event?.avgBrier)) ||
        Number.isFinite(Number(event?.ece)) ||
        Number.isFinite(Number(event?.calibrationPenalty))
    )
    .sort((a, b) => {
      const timeA = Number(a?.timestamp) || 0;
      const timeB = Number(b?.timestamp) || 0;
      return timeA - timeB;
    });

  if (safeEvents.length < 6) {
    return null;
  }

  const extract = (key) =>
    safeEvents
      .map((event) => Number(event?.[key]))
      .filter((value) => Number.isFinite(value));

  const brierSeries = extract('avgBrier');
  const eceSeries = extract('ece');
  const penaltySeries = extract('calibrationPenalty');

  const brierDrift = detectDriftInSeries(brierSeries, options);
  const eceDrift = detectDriftInSeries(eceSeries, options);
  const penaltyDrift = detectDriftInSeries(penaltySeries, options);

  const enrichBadDirection = (drift) => {
    if (!drift) return null;

    return {
      ...drift,
      badDirection: 'up',
      isBadDrift: drift.direction === 'up' && drift.severity !== 'none',
    };
  };

  const enrichedBrier = enrichBadDirection(brierDrift);
  const enrichedEce = enrichBadDirection(eceDrift);
  const enrichedPenalty = enrichBadDirection(penaltyDrift);

  const candidates = [enrichedBrier, enrichedEce, enrichedPenalty].filter(
    Boolean
  );

  const hasDrift = candidates.some(
    (candidate) => candidate.isBadDrift
  );

  const severityRank = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
  };

  const worst = candidates.reduce(
    (acc, candidate) => {
      if (!candidate?.isBadDrift) return acc;

      const candidateRank = severityRank[candidate.severity] || 0;
      const accRank = severityRank[acc?.severity] || 0;

      return candidateRank > accRank ? candidate : acc;
    },
    null
  );

  return {
    metric: 'calibration',
    brier: enrichedBrier,
    ece: enrichedEce,
    penalty: enrichedPenalty,
    hasDrift,
    worstSeverity: worst?.severity || 'none',
    worstMetric: worst?.metric || null,
    sampleSize: safeEvents.length,
  };
}

/**
 * Detecta drift de calibração em pares probabilidade vs resultado.
 *
 * pairs:
 * [{ probability: 0.62, observed: 1 }]
 */
export function detectProbabilityCalibrationDrift(pairs = [], options = {}) {
  const safePairs = (Array.isArray(pairs) ? pairs : [])
    .map((pair) => ({
      probability: clampFinite(pair?.probability, 0, 1, NaN),
      observed: clampFinite(pair?.observed, 0, 1, NaN),
      timestamp: Number(pair?.timestamp) || 0,
    }))
    .filter(
      (pair) =>
        Number.isFinite(pair.probability) &&
        Number.isFinite(pair.observed)
    )
    .sort((a, b) => {
      if (a.timestamp !== b.timestamp && a.timestamp > 0 && b.timestamp > 0) {
        return a.timestamp - b.timestamp;
      }
      return 0;
    });

  if (safePairs.length < 8) {
    return null;
  }

  const recentFraction = clampFinite(options.recentFraction, 0.2, 0.6, 0.4);
  const splitIndex = Math.floor(safePairs.length * (1 - recentFraction));

  const baselinePairs = safePairs.slice(0, splitIndex);
  const recentPairs = safePairs.slice(splitIndex);

  if (baselinePairs.length < 4 || recentPairs.length < 4) {
    return null;
  }

  const baselineDiagnostics = computeCalibrationDiagnostics(baselinePairs, {
    bins: options.bins ?? 5,
  });

  const recentDiagnostics = computeCalibrationDiagnostics(recentPairs, {
    bins: options.bins ?? 5,
  });

  const baselineBrier = meanValues(
    baselinePairs.map((pair) => computeBrierScore(pair.probability, pair.observed))
  );

  const recentBrier = meanValues(
    recentPairs.map((pair) => computeBrierScore(pair.probability, pair.observed))
  );

  const deltaBrier = recentBrier - baselineBrier;
  const deltaEce = recentDiagnostics.ece - baselineDiagnostics.ece;

  let severity = 'none';

  if (
    deltaBrier > 0.05 ||
    deltaEce > 0.08
  ) {
    severity = 'high';
  } else if (
    deltaBrier > 0.02 ||
    deltaEce > 0.04
  ) {
    severity = 'medium';
  } else if (deltaBrier > 0.01 || deltaEce > 0.02) {
    severity = 'low';
  }

  return {
    metric: 'probability_calibration',
    severity,
    direction: severity === 'none' ? 'none' : 'degraded',
    baseline: {
      count: baselinePairs.length,
      brier: Number(baselineBrier.toFixed(6)),
      ece: Number(baselineDiagnostics.ece.toFixed(6)),
      mce: Number(baselineDiagnostics.mce.toFixed(6)),
    },
    recent: {
      count: recentPairs.length,
      brier: Number(recentBrier.toFixed(6)),
      ece: Number(recentDiagnostics.ece.toFixed(6)),
      mce: Number(recentDiagnostics.mce.toFixed(6)),
    },
    delta: {
      brier: Number(deltaBrier.toFixed(6)),
      ece: Number(deltaEce.toFixed(6)),
    },
    isBadDrift: severity !== 'none',
  };
}

export default {
  computeEwmaControlChart,
  cusumDrift,
  detectDriftInSeries,
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
};
