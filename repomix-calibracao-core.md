This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/utils/calibration*.js, src/utils/coachAdaptive.js, src/utils/coachLogic.js, src/utils/adaptiveMath.js, src/utils/adaptiveEngine.js, src/engine/observability/*.js, src/hooks/useMonteCarloStats.js
- Files matching these patterns are excluded: **/*.test.*, **/__tests__/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
src/
  engine/
    observability/
      driftMonitor.js
      modelHealth.js
  hooks/
    useMonteCarloStats.js
  utils/
    adaptiveEngine.js
    adaptiveMath.js
    calibration.js
    calibrationTelemetry.js
    coachAdaptive.js
    coachLogic.js
```

# Files

## File: src/utils/calibrationTelemetry.js
```javascript
const TELEMETRY_KEY = 'coach_calibration_events_v1';
const TELEMETRY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45;

async function sendToFirebaseAnalytics(metric) {
    try {
        const { getAppAnalytics, isLocalMode } = await import('../services/firebase.js');
        if (isLocalMode || typeof getAppAnalytics !== 'function') return;
        const analytics = await getAppAnalytics();
        if (!analytics) return;
        const { logEvent } = await import('firebase/analytics');
        logEvent(analytics, 'coach_calibration_event', {
            event_type: String(metric.eventType || 'calibration'),
            category_id: String(metric.categoryId || 'unknown'),
            avg_brier: Number(metric.avgBrier || 0),
            calibration_penalty: Number(metric.calibrationPenalty || 0),
            probability: Number(metric.probability || 0),
        });
    } catch {
        // analytics unavailable in this runtime
    }
}

export function logCalibrationTelemetryEvent(metric) {
    if (!metric || !metric.categoryId) return;
    try {
        const currentRaw = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
        const current = Array.isArray(currentRaw) ? currentRaw : [];
        const normalizedMetric = {
            eventType: metric.eventType || 'calibration',
            categoryId: String(metric.categoryId || 'unknown'),
            avgBrier: Number(metric.avgBrier || 0),
            calibrationPenalty: Number(metric.calibrationPenalty || 0),
            probability: Number(metric.probability || 0),
            ece: Number(metric.ece || 0),
            timestamp: Number(metric.timestamp || Date.now())
        };
        const cutoff = Date.now() - TELEMETRY_RETENTION_MS;
        const next = [...current, normalizedMetric]
            .filter(e => Number.isFinite(Number(e?.timestamp)) && Number(e.timestamp) >= cutoff)
            .slice(-1000);
        localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
        void sendToFirebaseAnalytics(normalizedMetric);
    } catch {
        console.warn('[CalibrationTelemetry] Falha ao registrar telemetria (best effort)');
    }
}

export function getCalibrationTelemetrySummary(categoryId = null) {
  try {
    const currentRaw = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
    const current = Array.isArray(currentRaw) ? currentRaw : [];
    const filtered = categoryId
      ? current.filter(item => String(item.categoryId) === String(categoryId))
      : current;

    if (filtered.length === 0) {
      return {
        count: 0,
        avgBrier: null,
        avgPenalty: null,
        lastTimestamp: null
      };
    }

    const totalBrier = filtered.reduce((sum, item) => sum + Number(item.avgBrier || 0), 0);
    const totalPenalty = filtered.reduce((sum, item) => sum + Number(item.calibrationPenalty || 0), 0);

    return {
      count: filtered.length,
      avgBrier: Number((totalBrier / filtered.length).toFixed(4)),
      avgPenalty: Number((totalPenalty / filtered.length).toFixed(4)),
      lastTimestamp: filtered[filtered.length - 1]?.timestamp || null
    };
  } catch {
    return {
      count: 0,
      avgBrier: null,
      avgPenalty: null,
      lastTimestamp: null
    };
  }
}

export function clearCalibrationTelemetry() {
  try {
    localStorage.removeItem(TELEMETRY_KEY);
  } catch {
    // ignore
  }
}
```

## File: src/engine/observability/driftMonitor.js
```javascript
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
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
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

  const enrichBadDirection = (drift, metricName) => {
    if (!drift) return null;

    return {
      ...drift,
      metric: metricName,
      badDirection: 'up',
      isBadDrift: drift.direction === 'up' && drift.severity !== 'none',
    };
  };

  const enrichedBrier = enrichBadDirection(brierDrift, 'avgBrier');
  const enrichedEce = enrichBadDirection(eceDrift, 'ece');
  const enrichedPenalty = enrichBadDirection(penaltyDrift, 'calibrationPenalty');

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
  const safeRecentEce = Number.isFinite(recentDiagnostics.ece) ? recentDiagnostics.ece : 0;
  const safeBaselineEce = Number.isFinite(baselineDiagnostics.ece) ? baselineDiagnostics.ece : 0;
  const deltaEce = safeRecentEce - safeBaselineEce;

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
      ece: Number.isFinite(baselineDiagnostics.ece) ? Number(baselineDiagnostics.ece.toFixed(6)) : null,
      mce: Number.isFinite(baselineDiagnostics.mce) ? Number(baselineDiagnostics.mce.toFixed(6)) : null,
    },
    recent: {
      count: recentPairs.length,
      brier: Number(recentBrier.toFixed(6)),
      ece: Number.isFinite(recentDiagnostics.ece) ? Number(recentDiagnostics.ece.toFixed(6)) : null,
      mce: Number.isFinite(recentDiagnostics.mce) ? Number(recentDiagnostics.mce.toFixed(6)) : null,
    },
    deltas: {
      brier: Number(deltaBrier.toFixed(6)),
      ece: Number(deltaEce.toFixed(6)),
      mce: (Number.isFinite(recentDiagnostics.mce) && Number.isFinite(baselineDiagnostics.mce)) 
             ? Number((recentDiagnostics.mce - baselineDiagnostics.mce).toFixed(6)) 
             : null,
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
```

## File: src/engine/observability/modelHealth.js
```javascript
/**
 * modelHealth.js
 *
 * Lote 9 — Model health scoring para o Coach.
 *
 * Combina:
 * - drift de calibração;
 * - drift de probabilidade;
 * - drift de nota;
 * - drift de volatilidade;
 * - qualidade de calibração atual;
 * - volume amostral;
 * - governança de flags experimentais.
 */

import {
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
} from './driftMonitor.js';

import {
  computeCalibrationDiagnostics,
} from '../../utils/calibration.js';

const HEALTH_STORAGE_KEY = 'coach_model_health_v1';
const HEALTH_STORAGE_MAX = 100;

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function createAlert({
  id,
  type,
  severity,
  message,
  metric = null,
}) {
  return {
    id,
    type,
    severity,
    message,
    metric,
    createdAt: Date.now(),
  };
}

/**
 * Avalia a saúde matemática do modelo.
 */
export function evaluateModelHealth(input = {}, options = {}) {
  const alerts = [];
  const metrics = {};

  let healthScore = 100;

  const calibrationEvents = Array.isArray(input.calibrationEvents)
    ? input.calibrationEvents
    : [];

  const probabilityPairs = Array.isArray(input.probabilityPairs)
    ? input.probabilityPairs
    : [];

  const scores = Array.isArray(input.scores) ? input.scores : [];
  const volatilities = Array.isArray(input.volatilities)
    ? input.volatilities
    : [];

  const features = input.features && typeof input.features === 'object'
    ? input.features
    : {};

  // ==================== CALIBRATION DRIFT ====================
  const calibrationDrift = detectCalibrationDrift(
    calibrationEvents,
    options.calibration || {}
  );

  metrics.calibrationDrift = calibrationDrift;

  if (calibrationDrift?.hasDrift) {
    const severity = calibrationDrift.worstSeverity;

    if (severity === 'high') {
      healthScore -= 25;

      alerts.push(
        createAlert({
          id: 'calibration_drift_high',
          type: 'calibration_drift',
          severity: 'high',
          message:
            'A calibração do modelo degradou significativamente nas amostras recentes.',
          metric: calibrationDrift.worstMetric,
        })
      );
    } else if (severity === 'medium') {
      healthScore -= 12;

      alerts.push(
        createAlert({
          id: 'calibration_drift_medium',
          type: 'calibration_drift',
          severity: 'medium',
          message:
            'A calibração do modelo apresentou degradação moderada recentemente.',
          metric: calibrationDrift.worstMetric,
        })
      );
    } else if (severity === 'low') {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'calibration_drift_low',
          type: 'calibration_drift',
          severity: 'low',
          message: 'Leve degradação de calibração detectada.',
          metric: calibrationDrift.worstMetric,
        })
      );
    }
  }

  // ==================== PROBABILITY CALIBRATION DRIFT ====================
  const probabilityCalibrationDrift = detectProbabilityCalibrationDrift(
    probabilityPairs,
    options.probabilityPairs || {}
  );

  metrics.probabilityCalibrationDrift = probabilityCalibrationDrift;

  if (probabilityCalibrationDrift?.isBadDrift) {
    if (probabilityCalibrationDrift.severity === 'high') {
      healthScore -= 20;

      alerts.push(
        createAlert({
          id: 'probability_calibration_drift_high',
          type: 'probability_calibration_drift',
          severity: 'high',
          message:
            'As probabilidades previstas estão perdendo confiabilidade recentemente.',
          metric: 'probability_pairs',
        })
      );
    } else if (probabilityCalibrationDrift.severity === 'medium') {
      healthScore -= 10;

      alerts.push(
        createAlert({
          id: 'probability_calibration_drift_medium',
          type: 'probability_calibration_drift',
          severity: 'medium',
          message:
            'Há sinais de degradação na confiabilidade das probabilidades previstas.',
          metric: 'probability_pairs',
        })
      );
    } else {
      healthScore -= 4;
    }
  }

  // ==================== CURRENT CALIBRATION QUALITY ====================
  if (probabilityPairs.length >= 5) {
    const diagnostics = computeCalibrationDiagnostics(probabilityPairs, {
      bins: options.bins ?? 6,
    });
    const currentEce = Number.isFinite(diagnostics.ece)
      ? Number(diagnostics.ece.toFixed(6))
      : 0;

    metrics.currentCalibration = {
      count: probabilityPairs.length,
      ece: currentEce,
      mce: Number.isFinite(diagnostics.mce) ? Number(diagnostics.mce.toFixed(6)) : 0,
      reliability: diagnostics.reliability || [],
      brierDecomposition: diagnostics.brierDecomposition || null,
    };

    if (currentEce > 0.15) {
      healthScore -= 15;

      alerts.push(
        createAlert({
          id: 'current_calibration_poor',
          type: 'current_calibration',
          severity: 'high',
          message: 'O erro de calibração atual está alto.',
          metric: 'ece',
        })
      );
    } else if (currentEce > 0.10) {
      healthScore -= 8;

      alerts.push(
        createAlert({
          id: 'current_calibration_moderate',
          type: 'current_calibration',
          severity: 'medium',
          message: 'O erro de calibração atual está moderado.',
          metric: 'ece',
        })
      );
    }
  } else {
    metrics.currentCalibration = {
      count: probabilityPairs.length,
      status: 'insufficient_data',
    };
  }

  // ==================== SCORE DRIFT ====================
  const scoreDrift = detectScoreDrift(scores, options.score || {});
  metrics.scoreDrift = scoreDrift;

  if (scoreDrift?.isBadDrift) {
    if (scoreDrift.severity === 'high') {
      healthScore -= 12;

      alerts.push(
        createAlert({
          id: 'score_drift_high',
          type: 'performance_drift',
          severity: 'high',
          message: 'Queda relevante de desempenho detectada recentemente.',
          metric: 'score',
        })
      );
    } else if (scoreDrift.severity === 'medium') {
      healthScore -= 6;

      alerts.push(
        createAlert({
          id: 'score_drift_medium',
          type: 'performance_drift',
          severity: 'medium',
          message: 'Queda moderada de desempenho detectada recentemente.',
          metric: 'score',
        })
      );
    }
  }

  // ==================== VOLATILITY DRIFT ====================
  const volatilityDrift = detectVolatilityDrift(
    volatilities,
    options.volatility || {}
  );

  metrics.volatilityDrift = volatilityDrift;

  if (volatilityDrift?.isBadDrift) {
    if (volatilityDrift.severity === 'high') {
      healthScore -= 10;

      alerts.push(
        createAlert({
          id: 'volatility_drift_high',
          type: 'volatility_drift',
          severity: 'high',
          message: 'A volatilidade do desempenho aumentou significativamente.',
          metric: 'volatility',
        })
      );
    } else if (volatilityDrift.severity === 'medium') {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'volatility_drift_medium',
          type: 'volatility_drift',
          severity: 'medium',
          message: 'A volatilidade do desempenho aumentou moderadamente.',
          metric: 'volatility',
        })
      );
    }
  }

  // ==================== SAMPLE ADEQUACY ====================
  const sampleSize = Number.isFinite(Number(input.sampleSize))
    ? Number(input.sampleSize)
    : scores.length;

  metrics.sampleSize = sampleSize;

  if (sampleSize < 5) {
    healthScore -= 15;

    alerts.push(
      createAlert({
        id: 'low_sample_size',
        type: 'data_adequacy',
        severity: 'high',
        message:
          'Há poucos dados para confiar nas projeções atuais. O sistema deve operar com mais conservadorismo.',
        metric: 'sample_size',
      })
    );
  } else if (sampleSize < 10) {
    healthScore -= 7;

    alerts.push(
      createAlert({
        id: 'moderate_sample_size',
        type: 'data_adequacy',
        severity: 'medium',
        message:
          'A quantidade de dados ainda é moderada. Projeções devem ser interpretadas com cautela.',
        metric: 'sample_size',
      })
    );
  }

  // ==================== FLAG GOVERNANCE ====================
  const experimentalFlags = [
    'useStateSpace',
    'useDynamicVolatility',
    'usePosteriorMonteCarlo',
    'useBayesianTopics',
    'useDecisionUtility',
    'useBanditPlanner',
    'useKnowledgeGraph',
    'useAdvancedFsrs',
  ];

  const activeExperimentalFlags = experimentalFlags.filter(
    (flag) => features[flag] === true
  );

  metrics.activeExperimentalFlags = activeExperimentalFlags;

  if (activeExperimentalFlags.length > 4) {
    healthScore -= 6;

    alerts.push(
      createAlert({
        id: 'too_many_experimental_flags',
        type: 'flag_governance',
        severity: 'medium',
        message:
          'Muitas flags experimentais estão ativas simultaneamente. Isso dificulta atribuir causa a mudanças de desempenho.',
        metric: 'experimental_flags',
      })
    );
  }

  // ==================== TELEMETRY STALENESS ====================
  const lastTelemetryTimestamp = Number(input.lastTelemetryTimestamp) || 0;

  if (lastTelemetryTimestamp > 0) {
    const daysSinceTelemetry =
      (Date.now() - lastTelemetryTimestamp) / 86400000;

    metrics.daysSinceLastTelemetry = Number(daysSinceTelemetry.toFixed(2));

    if (daysSinceTelemetry > 14) {
      healthScore -= 5;

      alerts.push(
        createAlert({
          id: 'stale_telemetry',
          type: 'telemetry',
          severity: 'low',
          message:
            'A telemetria de calibração está antiga. A avaliação de saúde pode estar defasada.',
          metric: 'telemetry_age',
        })
      );
    }
  } else {
    metrics.daysSinceLastTelemetry = null;
  }

  healthScore = clampFinite(healthScore, 0, 100, 100);

  let status = 'healthy';

  if (healthScore < 60) {
    status = 'critical';
  } else if (healthScore < 80) {
    status = 'degraded';
  }

  const recommendations = [];

  if (status === 'critical') {
    recommendations.push(
      'Reduza flags experimentais e volte para uma configuração mais conservadora.'
    );
  }

  if (alerts.some((alert) => alert.type === 'calibration_drift')) {
    recommendations.push(
      'Revise os thresholds de calibração e aumente o shrinkage de probabilidade.'
    );
  }

  if (alerts.some((alert) => alert.type === 'volatility_drift')) {
    recommendations.push(
      'Aumente a suavização de volatilidade e reduza a confiança em tendências recentes.'
    );
  }

  if (alerts.some((alert) => alert.type === 'performance_drift')) {
    recommendations.push(
      'Verifique se houve mudança real de nível do aluno ou apenas ruído amostral.'
    );
  }

  if (alerts.some((alert) => alert.type === 'data_adequacy')) {
    recommendations.push(
      'Evite decisões agressivas enquanto houver poucos dados.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'O sistema está estável. Mantenha monitoramento contínuo.'
    );
  }

  return {
    healthScore: Number(healthScore.toFixed(2)),
    status,
    generatedAt: Date.now(),
    alerts,
    metrics,
    recommendations,
  };
}

/**
 * Gera dados prontos para dashboard.
 */
export function generateHealthDashboard(health = {}) {
  if (!health || typeof health !== 'object') return null;

  const metrics = health.metrics || {};
  const alerts = health.alerts || [];

  return {
    generatedAt: health.generatedAt || Date.now(),
    healthScore: health.healthScore ?? null,
    status: health.status ?? 'unknown',
    cards: [
      {
        id: 'health_score',
        label: 'Health Score',
        value: health.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'sample_size',
        label: 'Amostras',
        value: metrics.sampleSize ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'calibration_drift',
        label: 'Drift de Calibração',
        value: metrics.calibrationDrift?.worstSeverity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'score_drift',
        label: 'Drift de Nota',
        value: metrics.scoreDrift?.severity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'volatility_drift',
        label: 'Drift de Volatilidade',
        value: metrics.volatilityDrift?.severity || 'none',
        goodDirection: 'lower',
      },
      {
        id: 'experimental_flags',
        label: 'Flags Experimentais',
        value: Array.isArray(metrics.activeExperimentalFlags)
          ? metrics.activeExperimentalFlags.length
          : 0,
        goodDirection: 'lower',
      },
    ],
    alerts,
    recommendations: health.recommendations || [],
    metrics,
  };
}

/**
 * Salva snapshot de saúde.
 */
export function saveModelHealthSnapshot(snapshot) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const raw = storage.getItem(HEALTH_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    const current = Array.isArray(parsed) ? parsed : [];

    const next = [...current, snapshot]
      .filter(Boolean)
      .slice(-HEALTH_STORAGE_MAX);

    storage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega snapshots de saúde.
 */
export function loadModelHealthSnapshots() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(HEALTH_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Limpa snapshots de saúde.
 */
export function clearModelHealthSnapshots() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(HEALTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default {
  evaluateModelHealth,
  generateHealthDashboard,
  saveModelHealthSnapshot,
  loadModelHealthSnapshots,
  clearModelHealthSnapshots,
};
```

## File: src/utils/calibration.js
```javascript
import { kahanSum } from '../engine/math/kahan.js';
import { getDateKey, normalizeDate } from './dateHelper.js';
import { getSafeScore } from './scoreHelper.js';
import { isSubjectMatch } from './normalization.js';
import { generateId } from './idGenerator.js';

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

// [LOTE 5] PAV extraído para reuso com restrição de bloco mínimo
function pavBlocks(blocks) {
  let i = 0;
  let iterations = 0;
  const maxIterations = Math.max(100, blocks.length * 10); // ✅ FIX #3: Guard contra loop infinito
  
  while (i < blocks.length - 1 && iterations < maxIterations) {
    iterations++;
    if (blocks[i].mean <= blocks[i + 1].mean) { i++; continue; }
    const a = blocks[i], b = blocks[i + 1];
    // ✅ FIX #3: Check sumW > 0 para evitar divisão por zero
    const sumW = a.sumW + b.sumW;
    if (sumW <= 0) { i++; continue; }
    const merged = { minX: a.minX, maxX: b.maxX, sumWY: a.sumWY + b.sumWY, sumW: sumW, mean: 0 };
    merged.mean = merged.sumWY / sumW;
    blocks.splice(i, 2, merged);
    if (i > 0) i--;
  }
  
  if (iterations >= maxIterations) {
    console.warn('[calibration] pavBlocks atingiu limite de iterações, possível convergência lenta');

    blocks.sort((a, b) => Number(a.minX ?? a.x ?? 0) - Number(b.minX ?? b.x ?? 0));

    for (let j = 1; j < blocks.length; j++) {
      const prevMean = Number(blocks[j - 1]?.mean ?? blocks[j - 1]?.y ?? 0);
      const currMean = Number(blocks[j]?.mean ?? blocks[j]?.y ?? 0);

      if (currMean < prevMean) {
        if ('mean' in blocks[j] || blocks[j].mean !== undefined) blocks[j].mean = prevMean;
        if ('y' in blocks[j] || blocks[j].y !== undefined) blocks[j].y = prevMean;
        blocks[j].forcedMonotonic = true;
      }
    }
  }
  return blocks;
}

export function computeBrierScore(probability01, observedBinary) {
  const rawP = Number(probability01);
  if (!Number.isFinite(rawP)) return null;
  const p = Math.max(0, Math.min(1, rawP));
  const y = observedBinary ? 1 : 0;
  return (p - y) ** 2;
}

export function computeLogLoss(probability01, observedBinary) {
  const epsilon = 1e-15;
  const rawP = Number(probability01);
  const safeP = Number.isFinite(rawP) ? rawP : 0.5;
  const p = Math.max(epsilon, Math.min(1 - epsilon, safeP));
  const y = observedBinary ? 1 : 0;
  return -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
}

export function summarizeCalibration(scores = [], options = {}) {
  const maxPenalty = Math.max(0, Math.min(1, Number(options.maxPenalty) || 0.25));
  const baseline = Number.isFinite(options.baseline) ? options.baseline : 0.18;
  if (!Array.isArray(scores) || scores.length === 0) {
    return { avgBrier: null, calibrationPenalty: 0, sampleSize: 0 };
  }
  const finiteScores = scores.map(v => Number(v)).filter(Number.isFinite);
  if (finiteScores.length === 0) return { avgBrier: null, calibrationPenalty: 0, sampleSize: 0 };
  const sorted = [...finiteScores].sort((a, b) => a - b);
  // ✅ FIX: se sampleSize for muito pequeno, desativar trim
  const trim = sorted.length >= 8 ? Math.floor(sorted.length * 0.1) : 0;
  const core = trim > 0 ? sorted.slice(trim, sorted.length - trim) : sorted;
  // ✅ FIX: proteção extra
  if (core.length === 0) return { avgBrier: null, calibrationPenalty: 0, sampleSize: finiteScores.length };
  const avgBrier = kahanSum(core) / core.length;
  const calibrationPenalty = Math.min(maxPenalty, Math.max(0, avgBrier - baseline));
  return { avgBrier, calibrationPenalty, sampleSize: finiteScores.length };
}

export function computeCalibrationDiagnostics(pairs = [], options = {}) {
  const bins = Math.max(2, Number(options.bins) || 5);
  // ✅ FIX (BUG-CAL-6): retornar null para ece/mce quando não há dados,
  // em vez de 0 que sinaliza falsamente "calibração perfeita"
  if (!Array.isArray(pairs) || pairs.length === 0) return { ece: null, mce: null, reliability: [], brierDecomposition: null };
  const cleanPairs = pairs
    .map((p) => ({
      probability: Math.max(0, Math.min(1, Number(p?.probability))),
      observed: Math.max(0, Math.min(1, Number(p?.observed)))
    }))
    .filter((p) => Number.isFinite(p.probability) && Number.isFinite(p.observed));
  if (cleanPairs.length === 0) return { ece: null, mce: null, reliability: [], brierDecomposition: null };
  const sorted = [...cleanPairs].sort((a, b) => a.probability - b.probability);
  let ece = 0;
  let mce = 0;
  const reliability = [];
  const overallObserved = kahanSum(cleanPairs.map(p => p.observed)) / cleanPairs.length;
  let relTerm = 0;
  let resTerm = 0;
  // [LOTE 5] ECE equal-frequency quando n < 20 (menos variância); equal-width p/ n grande
  const strategy = options.binStrategy || 'auto';
  const useQuantile = strategy === 'quantile' || (strategy === 'auto' && cleanPairs.length < 20);
  const edges = [];
  for (let i = 0; i <= bins; i++) {
    if (i === 0) edges.push(-0.01);
    else if (i === bins) edges.push(1.01);
    else if (!useQuantile) edges.push(i / bins);
    else edges.push(sorted[Math.floor((i / bins) * sorted.length)].probability);
  }
  for (let i = 1; i < edges.length; i++) {
    if (edges[i] <= edges[i - 1]) {
        edges[i] = edges[i - 1] + 1e-6;
    }
  }
  for (let i = 0; i < bins; i++) {
    const binMin = edges[i];
    const binMax = edges[i + 1];
    const slice = sorted.filter(p => p.probability >= binMin && p.probability < binMax);
    if (slice.length === 0) continue;
    const meanPred = kahanSum(slice.map(p => p.probability)) / slice.length;
    const observedRate = kahanSum(slice.map(p => p.observed)) / slice.length;
    const gap = Math.abs(meanPred - observedRate);
    const weight = slice.length / cleanPairs.length;
    ece += weight * gap;
    mce = Math.max(mce, gap);
    relTerm += weight * ((meanPred - observedRate) ** 2);
    resTerm += weight * ((observedRate - overallObserved) ** 2);
    reliability.push({ bin: i + 1, binMin, binMax, count: slice.length, meanPred, observedRate, gap });
  }
  const uncertainty = overallObserved * (1 - overallObserved);
  return { ece, mce, reliability, brierDecomposition: { reliability: relTerm, resolution: resTerm, uncertainty } };
}

export function shrinkProbabilityToNeutral(probabilityPct, penalty, neutralPct = 50, maxAppliedPenalty = 0.5) {
  const rawP = probabilityPct;
  const neutral = Number.isFinite(Number(neutralPct)) ? Math.max(0, Math.min(100, Number(neutralPct))) : 50;
  const p = Number.isFinite(Number(rawP))
    ? Math.max(0, Math.min(100, Number(rawP)))
    : neutral;
  const limit = Math.max(0, Math.min(1, Number.isFinite(Number(maxAppliedPenalty)) ? Number(maxAppliedPenalty) : 0.5));
  const k = Math.max(0, Math.min(limit, Number.isFinite(Number(penalty)) ? Number(penalty) : 0));
  return p * (1 - k) + neutral * k;
}

// FIX: sem storeUpdateFn — retorna evento validado (loop de aprendizagem)
export function recordPredictionEvent(prediction = {}) {
  const prob = clamp01(prediction.probability);
  return {
    id: prediction.id || generateId('calib'),
    timestamp: Number.isFinite(Number(prediction.timestamp)) ? Number(prediction.timestamp) : Date.now(),
    probability: prob,
    probabilityRaw: Number.isFinite(Number(prediction.probabilityRaw)) ? clamp01(prediction.probabilityRaw) : prob,
    observed: prediction.observed != null ? (prediction.observed ? 1 : 0) : null,
    targetScore: Number.isFinite(Number(prediction.targetScore)) ? Number(prediction.targetScore) : null,
    sims: Number(prediction.sims) || 5000,
    category: prediction.category || 'global',
    effectiveN: Number.isFinite(Number(prediction.effectiveN)) ? Number(prediction.effectiveN) : null
  };
}

export function computeCalibrationSummary(events = [], options = {}) {
  const clean = (events || []).filter(e =>
    Number.isFinite(e?.probability) && (e?.observed === 0 || e?.observed === 1)
  );
  if (clean.length < 3) {
    return { n: clean.length, ece: null, avgBrier: null, reliability: [], trend: 'insufficient_data' };
  }
  const diag = computeCalibrationDiagnostics(clean.map(e => ({ probability: e.probability, observed: e.observed })), { bins: options.bins || 6 });
  const briers = clean.map(e => computeBrierScore(e.probability, e.observed));
  const avgBrier = kahanSum(briers) / briers.length;
  const mid = Math.floor(clean.length / 2);
  const firstHalf = briers.slice(0, mid);
  const secondHalf = briers.slice(mid);
  const firstAvg = firstHalf.length ? kahanSum(firstHalf) / firstHalf.length : avgBrier;
  const secondAvg = secondHalf.length ? kahanSum(secondHalf) / secondHalf.length : avgBrier;
  const trend = secondAvg < firstAvg * 0.92 ? 'improving' : (secondAvg > firstAvg * 1.08 ? 'degrading' : 'stable');
  return {
    n: clean.length, ece: diag.ece, mce: diag.mce,
    avgBrier: Number(avgBrier.toFixed(4)),
    reliability: diag.reliability, trend, brierDecomposition: diag.brierDecomposition
  };
}

// FIX M4: imutável, causal (ts >= evento) e targetScore null-safe
export function backfillObservedFromSimulados(calibrationEvents = [], simuladoRows = [], _categories = [], maxScore = 100) {
  if (!Array.isArray(calibrationEvents)) return [];
  if (!Array.isArray(simuladoRows) || simuladoRows.length === 0) return calibrationEvents;
  const timed = simuladoRows
    .map(row => {
      const parsed = normalizeDate(row?.date || row?.createdAt);
      return { row, ts: parsed ? parsed.getTime() : NaN };
    })
    .filter(x => Number.isFinite(x.ts))
    .sort((a, b) => a.ts - b.ts);
  if (timed.length === 0) return calibrationEvents;
  return calibrationEvents.map(ev => {
    if (!ev || ev.observed != null || !ev.category) return ev;
    if (ev.targetScore == null || !Number.isFinite(Number(ev.timestamp))) return ev;
    // ✅ LOTE-03 FIX (C6): eventos com category 'global' NUNCA casavam porque
    // simuladoRows são registros POR MATÉRIA — o loop de aprendizagem global
    // estava morto (observed ficava null para sempre).
    let score = null;
    let observedAt = null;
    if (String(ev.category).toLowerCase() === 'global') {
      // Agrega as rows do PRIMEIRO dia de simulado após o evento
      // (média ponderada por total de questões quando disponível).
      const candidates = timed.filter(x => x.ts >= Number(ev.timestamp));
      if (candidates.length > 0) {
        const firstDayKey = getDateKey(candidates[0].row.date || candidates[0].row.createdAt);
        if (!firstDayKey) return { ...ev, backfilled: false }; // ✅ FIX: data inválida → pular evento
        const sameDay = candidates.filter(x => {
          const key = getDateKey(x.row.date || x.row.createdAt);
          return key !== null && key === firstDayKey; // ✅ FIX: excluir nulls
        });
        let sumScore = 0;
        let sumWeight = 0;
        sameDay.forEach(x => {
          const s = getSafeScore(x.row, maxScore);
          if (!Number.isFinite(s)) return;
          const w = Math.max(1, Number(x.row.total) || 1);
          sumScore += s * w;
          sumWeight += w;
        });
        if (sumWeight > 0) {
          score = sumScore / sumWeight;
          observedAt = candidates[0].ts;
        }
      }
    } else {
      const hit = timed.find(x =>
        x.ts >= Number(ev.timestamp) &&
        isSubjectMatch(ev.category, x.row.subject || x.row.categoryName)
      );
      if (hit) {
        score = getSafeScore(hit.row, maxScore);
        observedAt = hit.ts;
      }
    }
    if (score === null || !Number.isFinite(score)) return { ...ev, backfilled: false };
    return { ...ev, observed: score >= Number(ev.targetScore) ? 1 : 0, backfilled: true, observedAt };
  });
}

// FIX F1: baseline posterior que aprende (fallback avgBrier + pesos corretos)
export function computeRollingCalibrationParams(history = [], cfg = {}) {
  const safeHistory = Array.isArray(history) ? history : [];
  const windowDays = Number(cfg.windowDays) || 60;
  const cutoff = Date.now() - windowDays * 86400000;
  const maxSamples = Number(cfg.maxSamples) || 20;

  const isSignalEvent = (h) => {
    if (!h || !Number.isFinite(Number(h?.timestamp))) return false;
    const hasObserved = Number.isFinite(Number(h.probability)) && (h.observed === 0 || h.observed === 1);
    const hasBrier = Number.isFinite(Number(h.avgBrier));
    return hasObserved || hasBrier;
  };

  const recent = safeHistory
    .filter(h => isSignalEvent(h) && Number(h.timestamp) >= cutoff)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    .slice(-maxSamples);

  const minSamples = Number(cfg.minSamples) || 4;
  if (recent.length < minSamples) {
    return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3, confidenceFactor: 0 };
  }
  const now = Date.now();
  const LAMBDA = Math.log(2) / (14 * 86400000);
  let sw = 0, swb = 0;
  for (const h of recent) {
    let b = null;
    if (Number.isFinite(Number(h.probability)) && (h.observed === 0 || h.observed === 1)) {
      const rawP = Number(h.probability);
      const isPercentScale = cfg.scale === 'pct' || (cfg.scale !== 'ratio' && rawP > 1 && rawP <= 100);
      // ✅ FIX: detecção de escala suportada por flag explícita cfg.scale
      const p = Math.max(0, Math.min(1, isPercentScale ? rawP / 100 : rawP));
      b = (p - h.observed) ** 2;
    } else if (Number.isFinite(Number(h.avgBrier))) {
      b = Number(h.avgBrier);
    }
    if (b === null) continue;
    const w = Math.exp(-LAMBDA * Math.max(0, now - Number(h.timestamp)));
    swb += b * w; sw += w;
  }
  if (sw <= 1e-9) return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3, confidenceFactor: 0 };
  const kappa = Number(cfg.priorStrength) || 6;
  const mu0 = Number(cfg.baseline) || 0.2;
  const baseline = (swb + kappa * mu0) / (sw + kappa);
  const avgBrier = swb / sw;
  const confidenceFactor = Math.min(1, recent.length / (Number(cfg.targetSamples) || 12));
  const maxPenalty = (avgBrier > 0.25 ? 0.35 : 0.25) * confidenceFactor
                   + (cfg.maxPenalty ?? 0.3) * (1 - confidenceFactor);
  return { baseline, maxPenalty, confidenceFactor, avgBrier };
}

export const CRITICAL_BRIER_THRESHOLD = 0.28;
export const HIGH_PENALTY_THRESHOLD = 0.20;
export const MIN_PENALTY_DISPLAY = 0.05;
export const ALERT_COOLDOWN_MS = 1000 * 60 * 60 * 12;

// [LOTE 5] PAV com bloco mínimo anti-escada
export function fitIsotonicCalibration(pairs = [], options = {}) {
  const clean = (pairs || [])
    .map(p => ({ x: Number(p?.probability), y: Number(p?.observed) }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map(p => ({ x: clamp01(p.x), y: clamp01(p.y) }))
    .sort((a, b) => a.x - b.x);
  if (clean.length === 0) return [];
  let blocks = pavBlocks(clean.map(p => ({ minX: p.x, maxX: p.x, sumWY: p.y, sumW: 1, mean: p.y })));
  const minBlock = Math.max(2, Math.floor(clean.length / (Number(options.maxBlocks) || 6)));
  let guard = 0;
  // ✅ FIX #6: Guard++ ANTES da condição para evitar iterações extras
  while (++guard <= 24 && blocks.length > 1 && blocks.some(b => b.sumW < minBlock)) {
    const idx = blocks.findIndex(b => b.sumW < minBlock);
    const left = blocks[idx - 1];
    const right = blocks[idx + 1];
    const useLeft = left && (!right || Math.abs(left.mean - blocks[idx].mean) <= Math.abs(right.mean - blocks[idx].mean));
    const j = useLeft ? idx - 1 : idx + 1;
    const a = blocks[Math.min(idx, j)];
    const b = blocks[Math.max(idx, j)];
    blocks.splice(Math.min(idx, j), 2, {
      minX: a.minX, maxX: b.maxX,
      sumWY: a.sumWY + b.sumWY, sumW: a.sumW + b.sumW,
      mean: (a.sumWY + b.sumWY) / (a.sumW + b.sumW)
    });
    blocks = pavBlocks(blocks);
  }
  return blocks.map(b => ({ minX: b.minX, maxX: b.maxX, value: b.mean }));
}

// Interpolação linear entre blocos (monotônica)
export function predictIsotonicProbability(probability01, model = []) {
  const p = clamp01(probability01);
  if (!Array.isArray(model) || model.length === 0) return p;
  if (p <= model[0].minX) return clamp01(model[0].value);
  const last = model[model.length - 1];
  if (p >= last.maxX) return clamp01(last.value);
  for (let i = 0; i < model.length; i++) {
    const b = model[i];
    if (p >= b.minX && p <= b.maxX) return clamp01(b.value);
    if (p > b.maxX && i + 1 < model.length && p < model[i + 1].minX) {
      const t = (p - b.maxX) / Math.max(1e-9, model[i + 1].minX - b.maxX);
      return clamp01(b.value * (1 - t) + model[i + 1].value * t);
    }
  }
  return clamp01(last.value);
}

export function calibrateWithBBQ(probability01, pairs = [], options = {}) {
  const p = clamp01(probability01);
  const clean = (pairs || [])
    .map(x => ({ probability: Number(x?.probability), observed: Number(x?.observed) }))
    .filter(x => Number.isFinite(x.probability) && Number.isFinite(x.observed))
    .map(x => ({ probability: clamp01(x.probability), observed: clamp01(x.observed) }));
  if (clean.length < 4) return p;
  const sorted = [...clean].sort((a, b) => a.probability - b.probability);
  const bins = Math.max(2, Math.min(10, Number(options.bins) || Math.round(Math.sqrt(sorted.length))));
  const alpha0 = Math.max(0.1, Number(options.alpha0) || 0.5);
  const beta0 = Math.max(0.1, Number(options.beta0) || 0.5);
  for (let i = 0; i < bins; i++) {
    const start = Math.floor(i * sorted.length / bins);
    const end = Math.floor((i + 1) * sorted.length / bins);
    const slice = sorted.slice(start, end);
    if (slice.length === 0) continue;
    const isFirstBin = (i === 0);
    const isLastBin = (i === bins - 1);
    const lo = isFirstBin ? -0.01 : sorted[start].probability;
    const hi = isLastBin ? 1.01 : sorted[end].probability;
    if (!(p >= lo && (p < hi || isLastBin))) continue;
    const succ = kahanSum(slice.map(x => x.observed));
    const n = slice.length;
    return (succ + alpha0) / (n + alpha0 + beta0);
  }
  return p;
}

// FIX F4: conformal real (resíduos) + teto 0.35 + piso = ruído amostral
export function conformalizedCalibrationInterval(probability01, pairs = [], alpha = 0.1) {
  const p = clamp01(probability01);
  const clean = (pairs || [])
    .map(x => ({ probability: clamp01(x?.probability), observed: clamp01(x?.observed) }))
    .filter(x => Number.isFinite(x.probability) && Number.isFinite(x.observed));
  if (clean.length < 8) {
    let low = p - 0.15;
    let high = p + 0.15;
    if (high > 1) { low -= (high - 1); high = 1; }
    if (low < 0) { high += (0 - low); low = 0; }
    return { low: Math.max(0, low), high: Math.min(1, high), qHat: 0.15 };
  }
  const n = clean.length;
  const residuals = clean.map(x => Math.abs(x.probability - x.observed)).sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(n - 1, Math.ceil((1 - alpha) * n) - 1));
  const qConformal = residuals[idx] * ((n + 1) / n);
  const smoothedP = (p * n + 0.5) / (n + 1);
  const standardError = Math.sqrt((smoothedP * (1 - smoothedP)) / n);
  const zScore = alpha <= 0.05 ? 1.96 : (alpha <= 0.1 ? 1.645 : 1.28);
  const qHat = Math.min(0.35, Math.max(qConformal, standardError * zScore));
  let low = p - qHat;
  let high = p + qHat;
  if (high > 1) { low -= (high - 1); high = 1; }
  if (low < 0) { high += (0 - low); low = 0; }
  return { low: Math.max(0, low), high: Math.min(1, high), qHat };
}

// FIX F3: Akaike weights + complexidade + shrink p/ uniforme
export function computeStackingWeights(candidateProbs = [], observed = [], complexityParams = [0, 4, 6]) {
  const k = Array.isArray(candidateProbs) ? candidateProbs.length : 0;
  if (k === 0) return [];
  const n = Array.isArray(observed) ? observed.length : 0;
  if (n === 0) return new Array(k).fill(1 / k);
  const logLoss = candidateProbs.map(series => {
    if (!Array.isArray(series) || series.length !== n) return 1e6;
    let acc = 0;
    for (let i = 0; i < n; i++) acc += computeLogLoss(series[i], observed[i]);
    return acc / n;
  });
  const aic = logLoss.map((lossValue, m) => {
    const loss = Number.isFinite(lossValue) ? lossValue : 1e6;
    const lossSum = loss * n;
    const kParam = Number(complexityParams?.[m]) || 0;
    const base = 2 * lossSum + 2 * kParam;
    const aicc = n > kParam + 1
      ? base + ((2 * kParam * (kParam + 1)) / (n - kParam - 1))
      : base;
    return Number.isFinite(aicc) ? aicc : base;
  });
  const minAic = Math.min(...aic);
  const raw = aic.map(a => Math.exp(-0.5 * (a - minAic)));
  const z = kahanSum(raw) || 1;
  const maxLoss = Math.max(...logLoss);
  const isSeverePenalty = maxLoss > 2.0;
  // ✅ FIX: regularização mais forte para amostras mínimas (antes lambda=0.5 em n=4)
  const regularization = isSeverePenalty ? 0.2 : (n < 8 ? 8 : 4);
  const lambda = Math.min(1, Math.max(0, n / (n + regularization)));
  return raw.map(w => lambda * (w / z) + (1 - lambda) / k);
}

export function buildCalibrationDashboardSeries(events = []) {
  const clean = (events || [])
    .map(e => ({
      timestamp: Number(e?.timestamp),
      avgBrier: Number(e?.avgBrier),
      ece: Number(e?.ece),
      calibrationPenalty: Number(e?.calibrationPenalty),
      probability: Number(e?.probability)
    }))
    .filter(e => Number.isFinite(e.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (clean.length === 0) {
    return { trend: [], rolling7: [], controlLimits: { brierMean: null, brierUpper95: null, brierLower95: null }, driftSignals: [] };
  }
  const briers = clean.map(e => Number.isFinite(e.avgBrier) ? e.avgBrier : null).filter(v => v !== null);
  const mean = briers.length > 0 ? kahanSum(briers) / briers.length : null;
  const sd = briers.length > 1
    ? Math.sqrt(kahanSum(briers.map(v => (v - mean) ** 2)) / (briers.length - 1))
    : 0;
  const trend = clean.map(e => ({
    timestamp: e.timestamp,
    date: getDateKey(new Date(e.timestamp)),
    avgBrier: Number.isFinite(e.avgBrier) ? e.avgBrier : null,
    ece: Number.isFinite(e.ece) ? e.ece : null,
    penalty: Number.isFinite(e.calibrationPenalty) ? e.calibrationPenalty : null,
    probability: Number.isFinite(e.probability) ? e.probability : null
  }));
  const rolling7 = trend.map((row, idx) => {
    const startTs = row.timestamp - (7 * 24 * 60 * 60 * 1000);
    const win = trend.slice(0, idx + 1).filter(r => r.timestamp >= startTs && Number.isFinite(r.avgBrier));
    const winMean = win.length > 0 ? (win.reduce((a, b) => a + b.avgBrier, 0) / win.length) : null;
    return { timestamp: row.timestamp, date: row.date, avgBrier7d: winMean };
  });
  const controlLimits = mean === null
    ? { brierMean: null, brierUpper95: null, brierLower95: null }
    : { brierMean: mean, brierUpper95: mean + 2 * sd, brierLower95: Math.max(0, mean - 2 * sd) };
  const driftSignals = trend.map((row) => ({
    timestamp: row.timestamp,
    date: row.date,
    outOfControl: mean !== null && Number.isFinite(row.avgBrier)
      ? row.avgBrier > (controlLimits.brierUpper95 ?? Infinity)
      : false
  }));
  return { trend, rolling7, controlLimits, driftSignals };
}
```

## File: src/utils/coachAdaptive.js
```javascript
/**
 * coachAdaptive.js
 *
 * Motor adaptativo Monte Carlo do Coach.
 */
import { monteCarloSimulation, clearEngineMcCache } from '../engine/monteCarlo.js';
import { getSafeScore } from './scoreHelper.js';
import {
  computeBrierScore, computeLogLoss, summarizeCalibration, shrinkProbabilityToNeutral,
  computeCalibrationDiagnostics, fitIsotonicCalibration, predictIsotonicProbability,
  calibrateWithBBQ, conformalizedCalibrationInterval, computeStackingWeights
} from './calibration.js';
import { getDateKey, safeDateParse } from './dateHelper.js';
import { kahanSum } from '../engine/math/kahan.js';
import { detectDataAnomalies } from '../engine/diagnostics.js';
import { pruneHistoryForMemory } from '../engine/stats.js';
import { safeArray, toFiniteNumber, hashString } from './coachSafe.js';

const clampProbForLoss = (p) => {
  const n = Number(p);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1 - 1e-6, Math.max(1e-6, n));
};
export function deriveAdaptiveRiskThresholds(scores = [], volatility = null, cfg = {}, maxScore = 100, backtestPairs = []) {
  const fallbackDanger = Number(cfg.MC_PROB_DANGER) || 30;
  const fallbackSafe = Number(cfg.MC_PROB_SAFE) || 90;
  // FIX: safeArray protege contra não-arrays (objetos do store)
  const rawScores = safeArray(scores).map(Number).filter(Number.isFinite);
  const cleanPairs = safeArray(backtestPairs).filter(p =>
    Number.isFinite(Number(p?.probability)) && Number.isFinite(Number(p?.observed))
  );

  if (cleanPairs.length >= 6) {
    const sorted = [...cleanPairs].sort((a, b) => Number(a.probability) - Number(b.probability));
    const globalSuccessRate = cleanPairs.filter(p => Number(p.observed) >= 0.5).length / cleanPairs.length;
    const K = 1.0;
    const alphaPrior = Math.max(0.2, Math.min(0.8, globalSuccessRate)) * K;
    let dangerCandidates = [];
    let safeCandidates = [];

    for (let cutoffInt = 10; cutoffInt <= 90; cutoffInt += 5) {
      const cutoff = cutoffInt / 100;
      const below = sorted.filter(p => Number(p.probability) <= cutoff);
      const above = sorted.filter(p => Number(p.probability) > cutoff);

      if (below.length >= 2) {
        const successBelow = below.filter(p => Number(p.observed) >= 0.5).length;
        const posteriorMeanBelow = (successBelow + alphaPrior) / (below.length + K);
        if (posteriorMeanBelow < 0.35) dangerCandidates.push(cutoff * 100);
      }
      if (above.length >= 2) {
        const successAbove = above.filter(p => Number(p.observed) >= 0.5).length;
        const posteriorMeanAbove = (successAbove + alphaPrior) / (above.length + K);
        if (posteriorMeanAbove > 0.85) safeCandidates.push(cutoff * 100);
      }
    }

    let danger = dangerCandidates.length > 0
      ? Math.max(15, Math.min(50, dangerCandidates[dangerCandidates.length - 1]))
      : fallbackDanger;
    let safe = safeCandidates.length > 0
      ? Math.max(65, Math.min(97, safeCandidates[0]))
      : fallbackSafe;

    if (safe - danger < 25) safe = Math.min(97, danger + 25);
    const shrinkFactor = Math.min(1, cleanPairs.length / 20);
    danger = danger * shrinkFactor + fallbackDanger * (1 - shrinkFactor);
    safe = safe * shrinkFactor + fallbackSafe * (1 - shrinkFactor);

    return { danger: Math.round(danger * 10) / 10, safe: Math.round(safe * 10) / 10 };
  }

  if (rawScores.length < 4) return { danger: fallbackDanger, safe: fallbackSafe };

  const safeMax = maxScore > 0 ? maxScore : 100;
  const cleanScores = rawScores.map(s => (s / safeMax) * 100);
  const sorted = [...cleanScores].sort((a, b) => a - b);

  const q = (p) => {
    const idx = Math.max(0, Math.min(sorted.length - 1, (sorted.length - 1) * p));
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const t = idx - lo;
    return sorted[lo] * (1 - t) + sorted[hi] * t;
  };

  const median = q(0.5);
  const isZeroVariance = cleanScores.every(s => Math.abs(s - median) < 1e-6);

  if (isZeroVariance) {
    const danger = Math.max(15, Math.min(70, median - 12.5));
    const safe = Math.min(95, Math.max(danger + 25, median + 12.5));
    return { danger, safe };
  }

  const aboveMedianRate = cleanScores.filter(s => s > median).length / cleanScores.length;
  let danger = Math.max(15, Math.min(45, q(0.25) * (0.4 + aboveMedianRate * 0.3)));
  let safe = Math.max(75, Math.min(95, q(0.75) * 1.08));

  if (Number.isFinite(volatility)) {
    const highVol = Number(cfg.MC_VOLATILITY_HIGH) || 8;
    if (volatility > highVol * 0.9) { danger = Math.min(50, danger + 4); safe = Math.min(97, safe + 2); }
    else if (volatility < highVol * 0.45) { danger = Math.max(12, danger - 3); safe = Math.max(72, safe - 2); }
  }

  if (safe - danger < 25) safe = Math.min(97, danger + 25);
  return { danger, safe };
}

// FIX M3: suavização C¹ também na dimensão de volatilidade
export function computeContinuousMcBoost(probability, dangerThreshold, safeThreshold, volatility, maxScore, cfg = {}) {
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const p = Math.max(0, Math.min(100, Number(probability) || 0));
  const d = Math.max(1, Math.min(99, Number(dangerThreshold) || cfg.MC_PROB_DANGER || 30));
  const s = Math.max(d + 1, Math.min(99, Number(safeThreshold) || cfg.MC_PROB_SAFE || 90));
  const maxDangerBoost = (Number(cfg.MC_BOOST_DANGER_BASE) || 12) + (Number(cfg.MC_BOOST_DANGER_RANGE) || 13);
  const baseDangerBoost = Number(cfg.MC_BOOST_DANGER_BASE) || 12;
  const minBoost = Math.min(0, toFiniteNumber(cfg.MC_BOOST_SAFE_PENALTY, -8));
  const smoothstep = (x) => x * x * (3 - 2 * x);

  let boost = 0;

  if (p <= d) {
    const ratio = d > 0 ? Math.max(0, Math.min(1, p / d)) : 0;
    boost = maxDangerBoost - (smoothstep(ratio) * (maxDangerBoost - baseDangerBoost));
  } else if (p < s) {
    const ratio = Math.max(0, Math.min(1, (p - d) / (s - d)));
    boost = baseDangerBoost - (smoothstep(ratio) * (baseDangerBoost - minBoost));
  } else {
    boost = minBoost;
  }

  const lowVolLimit = (Number(cfg.MC_VOLATILITY_HIGH || 8) * 0.7) * (safeMaxScore / 100);

  if (Number.isFinite(volatility)) {
    const a = lowVolLimit * 0.8;
    const b = lowVolLimit * 1.2;
    const tVol = smoothstep(Math.max(0, Math.min(1, (volatility - a) / Math.max(1e-9, b - a))));

    if (boost < 0) {
      boost *= 1 - 0.75 * tVol;
    } else if (boost > 0 && tVol > 0.5) {
      // Alta volatilidade também reduz boost positivo (simetria)
      boost *= 1 - 0.35 * (tVol - 0.5) * 2;
    }
  }

  let riskLabel = 'ok';
  if (p <= d) riskLabel = 'critical';
  else if (p < s) riskLabel = 'moderate';
  else riskLabel = 'safe';

  return { boost: Number(boost.toFixed(4)), riskLabel };
}

export function deriveBacktestWeights(rawScores = [], maxScore = 100) {
  const scores = safeArray(rawScores).map(Number).filter(Number.isFinite);
  const n = scores.length;
  if (n < 2) return { scoreWeight: 1, recencyWeight: 1, instabilityWeight: 1, rankQuality: 1, uplift: 0, effectiveN: n };

  const last = scores[n - 1];
  const prev = scores[n - 2];
  const uplift = last - prev;

  const scoreWeight = Math.max(0.85, Math.min(1.2, 1 + (uplift / (maxScore || 100)) * 0.4));
  const recencyWeight = Math.max(0.9, Math.min(1.15, 1 + (n / 50) * 0.15));
  const rankQuality = scores.filter(s => s >= (maxScore * 0.7)).length / n;
  const instabilityWeight = Math.max(0.8, Math.min(1.25, 1 - rankQuality * 0.15 + (uplift < 0 ? 0.15 : -0.05)));

  const weighted = scores.map((_, i) => Math.exp(-0.015 * (n - i)));
  const sumW = kahanSum(weighted);
  const sumW2 = kahanSum(weighted.map(w => w * w));
  const effectiveN = sumW2 > 1e-9 ? (sumW * sumW) / sumW2 : scores.length;

  return { scoreWeight, recencyWeight, instabilityWeight, rankQuality, uplift, effectiveN: Number(effectiveN.toFixed(2)) };
}

export function simuladosToHistory(simulados, maxScore = 100, minScore = 0) {
  if (!simulados || !Array.isArray(simulados)) return [];

  const sorted = simulados
    .map((s, idx) => {
      const parsed = Date.parse(s.date || s.createdAt);
      return {
        ...s,
        score: getSafeScore(s, maxScore, minScore),
        rawTimestamp: Number.isFinite(parsed) ? parsed : 0,
        date: Number.isFinite(parsed) ? getDateKey(new Date(parsed)) : null,
        _idx: idx
      };
    })
    .sort((a, b) => {
      if (a.rawTimestamp !== b.rawTimestamp) return a.rawTimestamp - b.rawTimestamp;
      return a._idx - b._idx;
    });

  // FIX: garantir fatigueFlag definido (false) no primeiro item.
  // O loop começa em i=1, então sorted[0].fatigueFlag ficava undefined
  // para consumidores que esperam booleano.
  if (sorted.length > 0) sorted[0].fatigueFlag = false;
  let burstCount = 1;
  for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const prev = sorted[i - 1];

      const currentTs = Number(current.rawTimestamp);
      const prevTs = Number(prev.rawTimestamp);
      const isRapidSuccession =
          Number.isFinite(currentTs) &&
          Number.isFinite(prevTs) &&
          currentTs > 0 &&
          prevTs > 0 &&
          (currentTs - prevTs) < 7200000;

      if (isRapidSuccession) {
          burstCount++;
      } else {
          burstCount = 1;
      }

      // ✅ FIX: Só calcular fatigueFlag se ambos os scores forem finitos
      const currentScoreValid = Number.isFinite(current.score);
      const prevScoreValid = Number.isFinite(prev.score);

      if (currentScoreValid && prevScoreValid) {
          current.fatigueFlag = burstCount >= 3 && current.score < prev.score;
      } else {
          current.fatigueFlag = false;
      }
  }

  return sorted.filter(item => typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.date.trim()));
}

const mcCache = new Map();
const MC_CACHE_MAX = 50;
const MC_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

export function clearMcCache() {
  mcCache.clear();
  clearEngineMcCache();
}

export function deriveCoachAdaptiveParams(history = [], maxScore = 100, cfg = {}) {
  const n = history.length;
  if (n === 0) {
    return { decayK: 0.07, minWeight: 0.03, scoreClampDelta: maxScore * 0.3, mcSimulations: cfg.MC_SIMULATIONS || 800 };
  }

  const scores = history.map(h => Number(h.score) || 0);
  const mean = kahanSum(scores) / n;
  const devs = scores.map(s => (s - mean) ** 2);
  const variance = n > 1 ? kahanSum(devs) / (n - 1) : 0;
  const sd = Math.sqrt(Math.max(0, variance));
  const cv = mean > 0 ? Math.min(2, sd / mean) : 1;

  let medianGapDays = 7;
  if (n >= 2) {
    const sortedDates = history
      .map(h => h.date ? (safeDateParse(h.date)?.getTime() || 0) : 0)
      .filter(t => t > 0)
      .sort((a, b) => a - b);

    if (sortedDates.length >= 2) {
      const gaps = [];
      for (let i = 1; i < sortedDates.length; i++) {
        gaps.push(Math.max(0.5, (sortedDates[i] - sortedDates[i - 1]) / 86400000));
      }
      gaps.sort((a, b) => a - b);
      medianGapDays = gaps.length % 2 === 0
        ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
        : gaps[Math.floor(gaps.length / 2)];
    }
  }

  const coverageFactor = Math.max(0.8, Math.min(1.3, Math.sqrt(10 / Math.max(2, n))));
  const gapFactor = Math.max(0.7, Math.min(1.4, 0.8 + 0.6 * (1 - Math.exp(-medianGapDays / 14))));
  const decayK = Math.max(0.03, Math.min(0.12, 0.07 * coverageFactor * gapFactor));
  const minWeight = Math.max(0.01, Math.min(0.08, 0.015 + (cv * 0.02)));
  const scoreClampDelta = Math.max(maxScore * 0.12, Math.min(maxScore * 0.45, (0.2 + cv * 0.15) * maxScore));
  const mcSimulations = Math.round(Math.max(400, Math.min(2500, (cfg.MC_SIMULATIONS || 800) * (0.8 + cv * 0.7) * coverageFactor)));

  return { decayK, minWeight, scoreClampDelta, mcSimulations, medianGapDays };
}

function getCpuAwareSimulationCap(defaultCap = 2500, cfg = {}) {
  try {
    const manualCap = Number(cfg?.MC_SIMULATION_CAP);
    if (Number.isFinite(manualCap) && manualCap >= 300) return Math.min(defaultCap, Math.round(manualCap));
    if (cfg?.MC_FORCE_MAX_SIMULATIONS === true) return defaultCap;

    const threads = Number(globalThis?.navigator?.hardwareConcurrency);
    if (!Number.isFinite(threads) || threads <= 0) return defaultCap;
    if (threads <= 2) return Math.min(defaultCap, 900);
    if (threads <= 4) return Math.min(defaultCap, 1400);
    if (threads <= 6) return Math.min(defaultCap, 1900);
    return defaultCap;
  } catch {
    return defaultCap;
  }
}

function buildCoachExplainability(r) {
  const quality = r.avgBrier == null ? 'sem dados'
    : r.avgBrier < 0.18 ? 'boa' : r.avgBrier < 0.25 ? 'moderada' : 'degradada';

  return {
    calibrationQuality: quality,
    confidenceAdjusted: r.shrinkTotal > 0.01,
    confidenceAdjustmentPct: Number((r.shrinkTotal * 100).toFixed(1)),
    note: `Projeção bruta ${Number(r.probabilityRaw).toFixed(0)}% → final ${Number(r.probability).toFixed(0)}% ` +
      `(shrink ${(Number(r.shrinkTotal) * 100).toFixed(0)}%; Brier ${r.avgBrier != null ? Number(r.avgBrier).toFixed(3) : 'n/d'}; ECE ${Number(r.ece || 0).toFixed(3)}).`
  };
}

export function runCoachMonteCarlo(relevantSimulados, targetScore, cfg, categoryId, maxScore = 100, adaptive = null, days = 90, agilityPenalty = 0, minScore = 0) {
  const safeCfg = cfg || {};
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMinScore = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMaxScore) : 0;
  const range = Math.max(1e-9, safeMaxScore - safeMinScore);
  const minTarget = safeMinScore + 0.01 * range;
  const defaultTarget = safeMinScore + 0.8 * range;
  const safeTargetScore = Number.isFinite(Number(targetScore))
    ? Math.max(minTarget, Math.min(safeMaxScore, Number(targetScore)))
    : defaultTarget;

  if (!Array.isArray(relevantSimulados)) return null;

  let history = simuladosToHistory(relevantSimulados, safeMaxScore, safeMinScore).filter(h => Number.isFinite(h.score));
  if (history.length < (safeCfg.MC_MIN_DATA_POINTS || 5)) return null;
  if (history.length > 2000) history = pruneHistoryForMemory(history, 1200, 365 * 4);

  // FIX: usar safeMaxScore (validado) em vez de maxScore bruto
  const anomalies = detectDataAnomalies(history, safeMaxScore);
  const dataIssues = anomalies.filter(a => a.severity === 'error' || a.severity === 'warning').length;
  const dataQuality = Math.max(0.3, 1 - (dataIssues * 0.15));
  const lowSampleThreshold = Math.max(Number(safeCfg.MC_LOW_SAMPLE_THRESHOLD) || 10, (safeCfg.MC_MIN_DATA_POINTS || 5) + 2);
   const neutralPct = toFiniteNumber(safeCfg.MC_CALIBRATION_NEUTRAL_PCT, 50);
   // ✅ FIX: a âncora do shrinkage é o prior NEUTRO (50), não o baseline global.
   // (coachLogic sobrescreve MC_CALIBRATION_NEUTRAL_PCT com globalBaselinePct,
   // o que enviesava categorias fortes para baixo ao encolher em direção à média.)
   const shrinkAnchorPct = 50;
  const maxAppliedPenalty = toFiniteNumber(safeCfg.MC_CALIBRATION_MAX_APPLIED_PENALTY, 0.5);

  const btWeights = deriveBacktestWeights(history.map(h => h.score), safeMaxScore);
  const nEff = Math.max(1, Number(btWeights.effectiveN) || history.length);
  const sumCorrect = history.reduce((acc, h) => acc + Number(h.score || 0), 0);

  const sequenceChecksum = history.reduce((acc, h, idx) => {
    const score = Number(h.score || 0);
    const token = `${String(h?.date || '')}|${String(h?.subject || '')}`;
    let charSum = 0;
    for (let i = 0; i < token.length; i++) charSum += token.charCodeAt(i);
    return acc + ((idx + 1) * Math.round(score * 100)) + charSum;
  }, 0);

  const firstDate = history[0]?.date || '';
  const lastDate = history[history.length - 1]?.date || '';

  const calibHash = `${safeCfg.MC_CALIBRATION_BRIER_BASELINE ?? ''}-${safeCfg.MC_CALIBRATION_MAX_PENALTY ?? ''}-${safeCfg.MC_CALIBRATION_NEUTRAL_PCT ?? ''}-${safeCfg.MC_CALIBRATION_MAX_APPLIED_PENALTY ?? ''}-${safeCfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false}`;
  const adaptiveHash = adaptive
    ? [adaptive.mcSimulations || 0, adaptive.decayK || 0,
       Number(adaptive.calibrationBaseline || 0).toFixed(4),
       Number(adaptive.calibrationMaxPenalty || 0).toFixed(4)].join('-')
    : 'no-adapt';

  const cfgHash = hashString(JSON.stringify({
    cap: safeCfg.MC_SIMULATION_CAP, force: safeCfg.MC_FORCE_MAX_SIMULATIONS,
    min: safeCfg.MC_MIN_DATA_POINTS, low: safeCfg.MC_LOW_SAMPLE_THRESHOLD,
    horizon: safeCfg.MC_BACKTEST_HORIZON, horizonMax: safeCfg.MC_BACKTEST_HORIZON_MAX,
    bins: [safeCfg.MC_ECE_BINS_MIN, safeCfg.MC_ECE_BINS_MID, safeCfg.MC_ECE_BINS_MAX],
    calib: [safeCfg.MC_CALIBRATION_BRIER_BASELINE, safeCfg.MC_CALIBRATION_MAX_PENALTY,
      safeCfg.MC_CALIBRATION_NEUTRAL_PCT, safeCfg.MC_CALIBRATION_MAX_APPLIED_PENALTY,
      safeCfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false]
  }));

  const contestId = safeCfg?.contestId || safeCfg?.userId || 'default';

  // PATCH-17: Usar hashString para evitar ambiguidade com separadores
  const hash = hashString(
    `${contestId}|${categoryId}|${safeMaxScore}|${safeMinScore}|${history.length}|${Number(sumCorrect).toFixed(2)}` +
    `|${safeTargetScore}|${sequenceChecksum}|${firstDate}|${lastDate}|${days}|${calibHash}|${adaptiveHash}` +
    `|${cfgHash}|ag${agilityPenalty}|tgt${Number(safeTargetScore).toFixed(1)}`
  );

  // LRU: mover para o fim (mais recente)
  const cachedEntry = mcCache.get(hash);
  if (cachedEntry) {
    // ✅ FIX: Verificar TTL do cache
    if (Date.now() - cachedEntry.timestamp > MC_CACHE_TTL_MS) {
        mcCache.delete(hash);
    } else {
        // LRU: mover para o fim
        mcCache.delete(hash);
        mcCache.set(hash, cachedEntry);
        return cachedEntry.value;
    }
  }

  try {
    const requestedSims = adaptive?.mcSimulations || safeCfg.MC_SIMULATIONS || 800;
    const simulationCap = getCpuAwareSimulationCap(2500, safeCfg);
    const qualityBoost = dataQuality < 0.7 ? 1.3 : 1.0;

    // FIX: Validar requestedSims antes de calcular safeSimulations
    const safeRequestedSims = Number.isFinite(requestedSims) ? requestedSims : 800;
    const safeSimulations = Math.max(300, Math.min(simulationCap, Math.round(safeRequestedSims * qualityBoost)));

    const result = monteCarloSimulation(history, safeTargetScore, days, safeSimulations,
      { maxScore: safeMaxScore, minScore: safeMinScore, agilityPenalty, globalBaselinePct: neutralPct });

    if (!result || !Number.isFinite(result.probability)) return null;

    const enableAdaptiveCalibration = safeCfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false;
    let calibrationPenalty = 0;
    let avgBrier = 0;
    let ece = 0;
    let reliability = [];
    let predObsPairs = [];
    let rawPreds = [];
    let observedSeq = [];

    if (enableAdaptiveCalibration && history.length >= 8) {
      const dynamicHorizon = Math.max(
        safeCfg.MC_BACKTEST_HORIZON || 3,
        Math.min(Number(safeCfg.MC_BACKTEST_HORIZON_MAX) || 12, Math.floor(history.length / 3))
      );
      const isLowPerformance = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency <= 4 || /Mobi|Android/i.test(navigator.userAgent));
      const defaultHorizon = Math.min(dynamicHorizon, history.length - (safeCfg.MC_MIN_DATA_POINTS || 5));
      const horizon = isLowPerformance ? Math.min(3, defaultHorizon) : defaultHorizon;
      const brierScores = [];


      for (let i = 1; i <= horizon; i += 1) {
        const train = history.slice(0, history.length - i);
        const observedRecord = history[history.length - i];
        const observed = Number(observedRecord.score) >= safeTargetScore ? 1 : 0;

        try {
          let gapDays = 7;
          if (train.length > 0 && observedRecord.date) {
            const trainDateMs = safeDateParse(train[train.length - 1].date)?.getTime() || NaN;
            const obsDateMs = safeDateParse(observedRecord.date)?.getTime() || NaN;
            if (!Number.isNaN(trainDateMs) && !Number.isNaN(obsDateMs) && obsDateMs > trainDateMs) {
              gapDays = Math.max(1, (obsDateMs - trainDateMs) / 86400000);
            }
          }

          const bt = monteCarloSimulation(train, safeTargetScore, gapDays,
            Math.min(500, Math.max(200, Math.floor(safeSimulations * 0.35))),
            { maxScore: safeMaxScore, minScore: safeMinScore, agilityPenalty, globalBaselinePct: neutralPct });

          if (!bt || !Number.isFinite(bt.probability)) continue;

          const p = Math.max(0, Math.min(1, bt.probability / 100));
          brierScores.push(computeBrierScore(p, observed));
          predObsPairs.push({ probability: p, observed });
          rawPreds.push(p);
          observedSeq.push(observed);
        } catch { /* ignore */ }
      }

      if (brierScores.length > 0) {
        const summary = summarizeCalibration(brierScores, {
          baseline: adaptive?.calibrationBaseline ?? safeCfg.MC_CALIBRATION_BRIER_BASELINE ?? 0.18,
          maxPenalty: adaptive?.calibrationMaxPenalty ?? safeCfg.MC_CALIBRATION_MAX_PENALTY ?? 0.25
        });

        // ✅ FIX (BUG-CAL-3): tratar avgBrier null como "sem dados" em vez de 0
        // (0 sinaliza falsamente "calibração perfeita", o que elimina penalidades)
        // PATCH-16: Validar imediatamente após receber do summarizeCalibration
        calibrationPenalty = Number.isFinite(summary.calibrationPenalty) ? summary.calibrationPenalty : 0;
        avgBrier = summary.avgBrier === null ? null : (Number.isFinite(summary.avgBrier) ? summary.avgBrier : null);
        
        // ✅ FIX: Se avgBrier é null, não aplicar penalidade baseada nele
        if (avgBrier === null) {
            calibrationPenalty = 0;
        }

        const adaptiveBins = predObsPairs.length >= 10
          ? (Number(safeCfg.MC_ECE_BINS_MAX) || 6)
          : predObsPairs.length >= 6 ? (Number(safeCfg.MC_ECE_BINS_MID) || 4) : (Number(safeCfg.MC_ECE_BINS_MIN) || 3);

        const diagnostics = computeCalibrationDiagnostics(predObsPairs, { bins: adaptiveBins });
        ece = diagnostics.ece;
        reliability = diagnostics.reliability;

        // ✅ FIX (BUG-CAL-6 downstream): ece/mce agora podem ser null se cleanPairs ficou vazio
        const safeEce = Number.isFinite(ece) ? ece : 0;
        const eceScaled = Math.max(0, Math.min(1, safeEce / 0.25));
        const mceScaled = Math.max(0, Math.min(1, Number(diagnostics.mce || 0) / 0.4));
        const penaltyCap = adaptive?.calibrationMaxPenalty ?? safeCfg.MC_CALIBRATION_MAX_PENALTY ?? 0.25;
        const meanLL = rawPreds.length > 0
          ? rawPreds.reduce((acc, p, idx) => acc + computeLogLoss(clampProbForLoss(p), observedSeq[idx]), 0) / rawPreds.length
          : 0;
        const llScaled = Math.max(0, Math.min(1, meanLL / 0.693));

        // FIX: validação de calibrationPenalty antes do blend
        const rawCalibrationPenalty = Number.isFinite(calibrationPenalty) ? calibrationPenalty : 0;
        calibrationPenalty = Math.min(penaltyCap,
          (rawCalibrationPenalty * 0.65) +
          (eceScaled * 0.20 * penaltyCap) +
          (mceScaled * 0.10 * penaltyCap) +
          (llScaled * 0.05 * penaltyCap));
      }
    }

    let isotonicModel = [];
    let stackingWeights = [0.34, 0.33, 0.33];

    if (predObsPairs.length >= 4) {
      isotonicModel = fitIsotonicCalibration(predObsPairs);
      const isotonicSeries = rawPreds.map(p => predictIsotonicProbability(p, isotonicModel));
      const bbqSeries = rawPreds.map(p => calibrateWithBBQ(p, predObsPairs));
      stackingWeights = computeStackingWeights([rawPreds, isotonicSeries, bbqSeries], observedSeq,
        [0, Math.max(1, isotonicModel.length), 6]);
    }

    const rawProb = Math.max(0, Math.min(100, Number(result.probability) || 0));
    const rawProb01 = rawProb / 100;
    const isoProb01 = predObsPairs.length >= 4 ? predictIsotonicProbability(rawProb01, isotonicModel) : rawProb01;
    const bbqProb01 = predObsPairs.length >= 4 ? calibrateWithBBQ(rawProb01, predObsPairs) : rawProb01;
    const stackedProb01 = Math.max(0, Math.min(1,
      (stackingWeights[0] || 0) * rawProb01 +
      (stackingWeights[1] || 0) * isoProb01 +
      (stackingWeights[2] || 0) * bbqProb01));

    const lowSampleShrink = nEff < lowSampleThreshold
      ? Math.min(0.35, (lowSampleThreshold - nEff) / lowSampleThreshold)
      : 0;
    const anomalyShrink = Math.min(0.2, dataIssues * 0.05);
    const totalShrink = Math.min(0.65, calibrationPenalty + lowSampleShrink + anomalyShrink);

    const probability = enableAdaptiveCalibration
      ? shrinkProbabilityToNeutral(stackedProb01 * 100, totalShrink, shrinkAnchorPct, maxAppliedPenalty)
      : (stackedProb01 * 100);

    let ciLow = Number(result.ci95Low) || 0;
    let ciHigh = Number(result.ci95High) || 0;
    if (ciLow > ciHigh) [ciLow, ciHigh] = [ciHigh, ciLow];

    const ciMid = (ciLow + ciHigh) / 2;
    const appliedShrinkK = Math.min(maxAppliedPenalty, totalShrink);
    const ciExpand = 1 + Math.max(0, appliedShrinkK * 1.2);
    const widenedCiLow = Math.max(0, ciMid - ((ciMid - ciLow) * ciExpand));
    // FIX: usar safeMaxScore (validado) em vez de maxScore bruto
    const widenedCiHigh = Math.min(safeMaxScore, ciMid + ((ciHigh - ciMid) * ciExpand));

    const conformal = conformalizedCalibrationInterval(stackedProb01, predObsPairs, 0.1);
    const rawVolatility = Number(result.volatility) || 0;

    const finalResult = {
      diagnostics: result?.diagnostics || null,
      probability,
      probabilityRaw: stackedProb01 * 100,
      shrinkTotal: Number(totalShrink.toFixed(4)),
      lowSampleShrink: Number(lowSampleShrink.toFixed(4)),
      anomalyShrink: Number(anomalyShrink.toFixed(4)),
      targetScore: safeTargetScore,
      volatility: rawVolatility,
      volatilityAdjusted: rawVolatility * (1 + (enableAdaptiveCalibration ? calibrationPenalty * 0.8 : 0)),
      mean: result.mean,
      ci95Low: widenedCiLow,
      ci95High: widenedCiHigh,
      calibrationPenalty,
      avgBrier,
      ece,
      reliability,
      sampleSize: history.length,
      lowSampleAdjustment: Number(totalShrink.toFixed(4)),
      conformalLow: Number((conformal.low * 100).toFixed(2)),
      conformalHigh: Number((conformal.high * 100).toFixed(2)),
      conformalQ: Number(conformal.qHat.toFixed(4)),
      stackingWeights,
      predObsPairs,
      dataQuality: {
        historySize: history.length,
        predObsPairs: predObsPairs.length,
        calibrationEnabled: enableAdaptiveCalibration,
        anomalyCount: dataIssues,
        qualityScore: Number(dataQuality.toFixed(3)),
        anomalies: anomalies.filter(a => a.severity !== 'ok').slice(0, 3)
      }
    };

    finalResult.thresholds = deriveAdaptiveRiskThresholds(
      history.map(h => h.score), rawVolatility, safeCfg, safeMaxScore, predObsPairs);
    finalResult.effectiveMCTarget = safeTargetScore;
    finalResult.adaptiveBaseline = Number.isFinite(Number(adaptive?.calibrationBaseline))
      ? Number(adaptive.calibrationBaseline) : null;
    finalResult.explainability = buildCoachExplainability(finalResult);

    // Eviction LRU
    if (mcCache.size >= MC_CACHE_MAX) {
      const firstKey = mcCache.keys().next().value;
      if (firstKey !== undefined) mcCache.delete(firstKey);
    }
    if (mcCache.has(hash)) mcCache.delete(hash);
    mcCache.set(hash, { value: finalResult, timestamp: Date.now() });

    return finalResult;
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[CoachMC] Simulação falhou:', e.message, { n: history.length });
    }
    return null;
  }
}
```

## File: src/utils/adaptiveEngine.js
```javascript
/**
 * adaptiveEngine.js — Adaptive Analytics Engine
 * 
 * ADAPT-02: Detecção de transição de regime (simplificado).
 * Analisa o histórico de estados (progression, stagnation, regression, etc.)
 * para detectar TRANSIÇÕES iminentes — ex: "evolução desacelerando → platô provável".
 * 
 * Related modules:
 * - src/utils/adaptiveMath.js — Core adaptive math utilities
 * - src/utils/calibration.js — Calibration governance
 * - src/utils/coachLogic.js — Coach decision engine
 * - src/utils/ProgressStateEngine.js — State classification
 */

import { analyzeProgressState } from './ProgressStateEngine.js';

/**
 * Detecta transições de regime no desempenho do aluno.
 * 
 * Usa um modelo simplificado de probabilidades de transição baseado na
 * frequência histórica de mudanças de estado + indicadores de velocidade.
 * 
 * @param {number[]} scores - Série de scores do aluno (mais antigo → mais recente)
 * @param {Object} options - { maxScore, windowSize, minHistory }
 * @returns {Object} { currentState, transitionRisk, flags, velocity }
 */
export function detectRegimeTransition(scores = [], options = {}) {
    const {
        maxScore = 100,
        minScore = 0,
        windowSize = 10,
        minHistory = 4
    } = options;

    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Math.max(safeMin + 1e-9, Number(maxScore) || 100);
    const safeRange = safeMax - safeMin;

    const noData = {
        currentState: 'insufficient_data',
        transitionRisk: null,
        flags: [],
        velocity: null,
        regimeStability: null
    };

    if (!Array.isArray(scores)) return noData;

    const normalizedScores = scores
        .map(score => {
            const raw = typeof score === 'object' && score !== null ? (score.score ?? score.scorePoints) : score;
            const n = Number(raw);
            return Number.isFinite(n) ? n : null;
        })
        .filter(v => v !== null && Number.isFinite(v));

    const effectiveMinHistory = Number.isFinite(Number(minHistory)) ? Number(minHistory) : 4;
    if (normalizedScores.length < effectiveMinHistory) return noData;
    
    // BUG-ADAPT-01 FIX: Janela Dinâmica
    // Se scores.length < windowSize * 1.5, a janela de 10 itens impede a geração 
    // de 2 estados (necessários para a derivada). Ajustamos para scores.length/2.
    const actualWindowSize = Math.min(windowSize, Math.max(2, Math.floor(normalizedScores.length / 2)));

    // 1. Calcular estados em janelas deslizantes
    const states = [];
    const stepSize = Math.max(1, Math.floor(actualWindowSize / 2)); // 50% overlap
    for (let end = actualWindowSize; end <= normalizedScores.length; end += stepSize) {
        const window = normalizedScores.slice(end - actualWindowSize, end);
        const result = analyzeProgressState(window, { maxScore: safeMax, minScore: safeMin, window_size: actualWindowSize });
        if (result && result.state !== 'insufficient_data') {
            states.push({
                state: result.state,
                mean: Number.isFinite(result.mean_score) ? result.mean_score : 0,
                slope: Number.isFinite(result.trend_slope) ? result.trend_slope : 0,
                variance: Number.isFinite(result.variance) ? result.variance : 0,
                endIdx: end
            });
        }
    }

    if (states.length < 2) return noData;

    const current = states[states.length - 1];
    const previous = states[states.length - 2];

    // 2. Detectar transições de regime
    const flags = [];
    let transitionRisk = 'none';

    // Calcular velocidade de mudança (derivada do slope)
    const slopeChange = current.slope - previous.slope;
    const meanChange = current.mean - previous.mean;

    // 2a. Desaceleração em evolução (possível platô)
    if (current.state === 'progression') {
        // Se o slope caiu >50% comparado com o anterior, o ritmo está desacelerando
        if (previous.slope > 0 && current.slope > 0 && current.slope < previous.slope * 0.5) {
            transitionRisk = 'deceleration';
            flags.push({
                type: 'warning',
                msg: `Desaceleração detectada: ritmo caiu de ${previous.slope.toFixed(1)} para ${current.slope.toFixed(1)} pp/mês. Possível platô em formação.`,
                severity: 'medium'
            });
        }
        // Se a variância está subindo enquanto o slope diminui
        // [CORREÇÃO] Injetar um limite mínimo (Epsilon) de variância para impedir (Bug 3.1 Fix)
        // que um salto de 0 para 0.01 dispare uma falsa "Instabilidade crescente".
        const varianciaMinima = Math.pow(safeRange * 0.02, 2); // Piso de 2%
        const varianciaAnteriorSegura = Math.max(previous.variance, varianciaMinima);
        
        if (current.variance > varianciaAnteriorSegura * 1.5 && slopeChange < 0) {
            flags.push({
                type: 'info',
                msg: 'Instabilidade crescente durante evolução. Consolide a base antes de avançar.',
                severity: 'low'
            });
        }
    }

    // 2b. Regressão acelerando (queda livre)
    if (current.state === 'regression' && previous.state === 'regression') {
        if (current.slope < previous.slope) {
            transitionRisk = 'acceleration_negative';
            flags.push({
                type: 'danger',
                msg: `Queda acelerada: declínio de ${current.slope.toFixed(1)} pp/mês (era ${previous.slope.toFixed(1)}). Intervenção urgente necessária.`,
                severity: 'high'
            });
        }
    }

    // 2c. Estagnação após evolução (platô confirmado)
    if ((current.state === 'stagnation_positive' || current.state === 'stagnation_neutral') 
        && previous.state === 'progression') {
        transitionRisk = 'plateau_entry';
        flags.push({
            type: 'warning',
            msg: 'Transição para platô detectada. O progresso desacelerou. Mude a estratégia de estudo.',
            severity: 'medium'
        });
    }

    // 2d. Recuperação após queda (inflexão positiva)
    if (current.state === 'progression' && 
        (previous.state === 'regression' || previous.state === 'stagnation_negative')) {
        transitionRisk = 'recovery';
        flags.push({
            type: 'success',
            msg: 'Inflexão positiva detectada! A recuperação está em andamento. Mantenha o novo ritmo.',
            severity: 'none'
        });
    }

    // 2e. Instabilidade crônica (oscilação contínua)
    if (current.state === 'unstable' && previous.state === 'unstable') {
        transitionRisk = 'chronic_instability';
        flags.push({
            type: 'warning',
            msg: 'Instabilidade crônica: performance oscila sem padrão. Foque em preencher lacunas de base.',
            severity: 'medium'
        });
    }

    // 3. Regime stability: quantos estados consecutivos iguais
    let consecutiveSame = 1;
    for (let i = states.length - 2; i >= 0; i--) {
        if (states[i].state === current.state) consecutiveSame++;
        else break;
    }
    const regimeStability = Math.min(1, consecutiveSame / 5); // Normalizar para [0,1], satura em 5

    return {
        currentState: current.state,
        transitionRisk,
        flags,
        velocity: {
            slopeChange: Number(slopeChange.toFixed(4)),
            meanChange: Number(meanChange.toFixed(2)),
            currentSlope: Number(current.slope.toFixed(4)),
            previousSlope: Number(previous.slope.toFixed(4))
        },
        regimeStability: Number(regimeStability.toFixed(3)),
        stateHistory: states.map(s => s.state)
    };
}

export default { detectRegimeTransition };
```

## File: src/utils/adaptiveMath.js
```javascript
/**
 * Utilitários de Matemática Adaptativa para o Motor Estatístico
 */
import { bootstrapCI } from '../engine/math/bootstrap.js';
import { kahanSum, kahanMean } from '../engine/math/kahan.js';
import { safeDateParse } from './dateHelper.js';
import { clamp, toFiniteNumber } from './retentionCore.js';

// t crítico bicaudal 95% (quantil 0.975) para amostras pequenas.
// Evita subestimar IC quando n é baixo.
const SMALL_SAMPLE_T_CRITICAL = {
    1: 12.706,
    2: 4.303,
    3: 3.182,
    4: 2.776,
    5: 2.571,
    6: 2.447,
    7: 2.365,
    8: 2.306,
    9: 2.262,
    10: 2.228,
    11: 2.201,
    12: 2.179,
    13: 2.160,
    14: 2.145,
    15: 2.131,
    16: 2.120,
    17: 2.110,
    18: 2.101,
    19: 2.093,
    20: 2.086,
    21: 2.080,
    22: 2.074,
    23: 2.069,
    24: 2.064,
    25: 2.060,
    26: 2.056,
    27: 2.052,
    28: 2.048,
    29: 2.045,
    30: 2.042
};

/**
 * Calcula o multiplicador de confiança (T-Student aproximado).
 * @param {number} sampleSize - Tamanho da amostra.
 * @param {Object} options 
 * @param {boolean} [options.allowFractional=false] - Se true, permite N fracionário (útil apenas para N Efetivo de Kish). Se false, força um número inteiro para manter a consistência da T-Student em contagens de amostras reais.
 */
export function getConfidenceMultiplier(sampleSize, options = {}) {
    const nRaw = Number(sampleSize);
    const allowFractional = options?.allowFractional === true;
    const nBase = Number.isFinite(nRaw) ? nRaw : 1;
    const n = Math.max(1, allowFractional ? nBase : Math.round(nBase));
    const df = Math.max(allowFractional ? 0.1 : 1, n - 1);



    if (df <= 30) {
        const lowDf = Math.max(1, Math.floor(df)); 
        const highDf = Math.ceil(df);
        const lowT = SMALL_SAMPLE_T_CRITICAL[lowDf] ?? SMALL_SAMPLE_T_CRITICAL[1];
        const highT = SMALL_SAMPLE_T_CRITICAL[highDf] ?? (highDf > 30 ? 1.96 : SMALL_SAMPLE_T_CRITICAL[30]);
        
        if (lowDf === highDf) return lowT;
        
        // CORREÇÃO: Em vez de interpolação harmónica reversa instável, 
        // usamos interpolação log-linear no espaço dos Graus de Liberdade.
        // É estatisticamente superior para o decaimento em cauda pesada.
        const logDenom = Math.log(highDf) - Math.log(lowDf);
        if (Math.abs(logDenom) < 1e-15) return lowT;
        const w = (Math.log(df) - Math.log(lowDf)) / logDenom;
        return (lowT * (1 - w)) + (highT * w);
    }

    // Aproximação assintótica para df altos (erro pequeno para df > 30)
    const z = 1.959963984540054;
    const c1 = (Math.pow(z, 3) + z) / (4 * df);
    const c2 = (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * df * df);
    const tApprox = z + c1 + c2;

    // Limites de sanidade (sem truncar agressivamente amostras pequenas)
    return Math.max(1.96, Math.min(6.0, tApprox));
}

export function winsorizeSeries(values, lowerPct = 0.05, upperPct = 0.95) {
    if (!Array.isArray(values)) return [];

    // Sanitiza percentis para evitar intervalos inválidos (ex: lower > upper)
    const lowerClamped = Number.isFinite(lowerPct) ? Math.min(1, Math.max(0, lowerPct)) : 0.05;
    const upperClamped = Number.isFinite(upperPct) ? Math.min(1, Math.max(0, upperPct)) : 0.95;
    const lowQ = Math.min(lowerClamped, upperClamped);
    const highQ = Math.max(lowerClamped, upperClamped);

    const nullCount = values.filter(v => !Number.isFinite(v)).length;
    if (nullCount > values.length * 0.5) {
        // OTIMIZAÇÃO DE MEMÓRIA: Se mais de 50% for lixo, retornar a referência original
        // em vez de criar um novo array map com NaNs. Evita alocação desnecessária.
        return values; 
    }
 
    const finiteValues = values.filter(v => Number.isFinite(v));
    // BUGFIX (data-shape): preservar o comprimento da série mesmo sem valores finitos.
    // Alguns consumidores assumem alinhamento 1:1 com a série original.
    // [FIX 4] Jamais force um 0 em domínios não triviais. Deixe o filtro NaN tratar jusante.
    if (finiteValues.length === 0) return values;
    if (finiteValues.length < 5) {
        return values; 
    }

    const sorted = [...finiteValues].sort((a, b) => a - b);
    const lowIndex = Math.floor((sorted.length - 1) * lowQ);
    const highIndex = Math.ceil((sorted.length - 1) * highQ);
    const low = sorted[Math.max(0, lowIndex)];
    const high = sorted[Math.min(sorted.length - 1, highIndex)];

    return values.map((v) => {
        // CORREÇÃO: Em vez de injetar uma mediana falsa (o que destrói a variância em séries com poucos dados),
        // preservamos o valor inválido original para que os filtros a jusante lidem com a lacuna naturalmente.
        if (!Number.isFinite(v)) return v; 
        return Math.max(low, Math.min(high, v));
    });
}

export function deriveAdaptiveConfig(scores = []) {
    const finiteScores = Array.isArray(scores) ? scores.filter(v => Number.isFinite(v)) : [];
    const n = finiteScores.length;
    const mean = kahanMean(finiteScores);
    const variance = n > 1 ? kahanSum(finiteScores.map(s => Math.pow(s - mean, 2))) / (n - 1) : 0;
    const sd = Math.sqrt(Math.max(0, variance));
    const cv = mean !== 0 ? Math.min(2, Math.abs(sd / mean)) : 1;

    // Meia-vida dinâmica baseada em n e volatilidade
    const halfLife = Math.max(2, Math.round(Math.min(14, Math.sqrt(Math.max(1, n)) * (1 + cv))));
    const lambda = Math.pow(0.5, 1 / halfLife);
    const dynamicTail = Math.min(0.12, Math.max(0.03, 0.08 * (1 / Math.sqrt(Math.max(1, n))) + (cv * 0.02)));
    // BUGFIX: sensibilidade mínima muito alta ampliava ruído em séries curtas.
    const trendSensitivity = 0.03 + Math.min(0.06, cv * 0.04);
    const maxCIInflation = 1.1 + Math.min(0.25, cv * 0.12);

    return {
        lambda,
        lowWinsor: dynamicTail,
        highWinsor: 1 - dynamicTail,
        trendSensitivity,
        maxCIInflation
    };
}

/**
 * Calcula a regressão linear incluindo o Erro Padrão da Inclinação (Standard Error) e o T-Stat.
 * Atualizado para suportar deltas de tempo reais (x) em vez de assumir índices estáticos.
 */
export const calcSlopeWithSignificance = (dados) => {
    if (!Array.isArray(dados)) return { slope: 0, se: 0, tStat: 0 };

    const n = dados.length;
    if (n < 3) return { slope: 0, se: 0, tStat: 0 };
    
    // Extração bruta
    const rawXs = dados.map((d, i) => {
        const rawX = (d && typeof d === 'object' && d.x !== undefined) ? d.x : i;
        const x = Number(rawX);
        return Number.isFinite(x) ? x : i;
    });
    
    const Ys = dados.map(d => {
        const val = typeof d === 'number' ? d : (d && typeof d === 'object' ? d.y : 0);
        return Number.isFinite(Number(val)) ? Number(val) : 0;
    });

    // FIX 1: Centralização dos eixos X (Mean Centering) para anular a perda de precisão
    // em matrizes de ponto flutuante durante a elevação ao quadrado de datas gigantes.
    let minX = Infinity;
    for (let i = 0; i < n; i++) {
        if (rawXs[i] < minX) minX = rawXs[i];
    }
    const Xs = rawXs.map(x => x - minX);
    
    const sumX = kahanSum(Xs);
    const sumY = kahanSum(Ys);
    const sumXY = kahanSum(Xs.map((x, i) => x * Ys[i]));
    const sumXX = kahanSum(Xs.map(x => x * x));
    
    const meanX = sumX / n;
    const det = n * sumXX - sumX * sumX;
    
    const slope = det === 0 ? 0 : (n * sumXY - sumX * sumY) / det;
    const intercept = (sumY - slope * sumX) / n;
    
    const predYs = Xs.map((x) => intercept + slope * x);
    const ssRes = kahanSum(Ys.map((y, i) => Math.pow(y - predYs[i], 2)));
    const ssX = kahanSum(Xs.map(x => Math.pow(x - meanX, 2)));
    
    const varRes = ssRes / (n - 2);
    const seSlope = ssX > 0 ? Math.sqrt(varRes / ssX) : 0;
    const tStat = seSlope > 0 ? slope / seSlope : 0;
    
    return { slope, se: seSlope, tStat };
};

export function computeAdaptiveSignal(historyOrScores = []) {
    const isObjectHistory = historyOrScores.length > 0 && typeof historyOrScores[0] === 'object' && historyOrScores[0] !== null;
    
    // Extrai scores e datas
    const parsedData = historyOrScores.map((item, i) => {
        if (isObjectHistory) {
            const rawDate = safeDateParse(item.date || item.createdAt);
            const rawTime = rawDate ? rawDate.getTime() : NaN;
            return {
                score: Number(item.score ?? item.value ?? 0),
                time: Number.isFinite(rawTime) ? rawTime : Date.now() - (historyOrScores.length - i) * 86400000
            };
        }
        // Fallback legado se enviarem apenas o array de números
        return { score: Number(item), time: Date.now() - (historyOrScores.length - i) * 86400000 }; 
    }).filter(d => Number.isFinite(d.score));
    
    // ADAPT-SORT: Força ordenação cronológica para garantir que ages (referenceNow - time) sejam sempre >= 0.
    parsedData.sort((a, b) => a.time - b.time);

    if (parsedData.length === 0) {
        return { effectiveN: 1, trendStrength: 0, adaptiveWinsor: { low: 0.05, high: 0.95 }, ciInflation: 1 };
    }

    const finiteScores = parsedData.map(d => d.score);
    const cfg = deriveAdaptiveConfig(finiteScores);
    const referenceNow = parsedData[parsedData.length - 1].time; // O tempo do último evento

    const weighted = [];
    for (let i = 0; i < parsedData.length; i++) {
        // FIX BUG: Idade baseada no delta real de dias (Entropia do Tempo), não em índices
        let ageInDays = Math.max(0, (referenceNow - parsedData[i].time) / (1000 * 60 * 60 * 24));
        
        // CORREÇÃO: Blindagem contra envenenamento matemático por datas ausentes
        if (Number.isNaN(ageInDays)) ageInDays = 0; 
        
        const dailyDecay = cfg.lambda; 
        weighted.push(Math.pow(dailyDecay, ageInDays));
    }

    const sumW = kahanSum(weighted);
    const sumW2 = kahanSum(weighted.map(w => w * w));
    const weightsCollapsed = sumW < 1e-6; // ✅ FIX: flag única p/ média E variância

    // ✅ FIX: Se os pesos decaíram para zero, fazer fallback para média simples.
    // Isso evita que a média ponderada colapse para 0 quando todos os
    // dados são "antigos" demais para o lambda configurado.
    let effectiveN;
    let weightedMean;

    if (weightsCollapsed) {
      // Fallback: pesos decaíram completamente → média simples com N real
      effectiveN = finiteScores.length;
      weightedMean = kahanMean(finiteScores);
      // ✅ FIX: Marcar explicitamente que NÃO houve ponderação
      // para que consumidores downstream saibam que é fallback
    } else {
      const rawEffN = (sumW * sumW) / Math.max(1e-9, sumW2);
      effectiveN = Number.isFinite(rawEffN) ? Math.max(1, rawEffN) : 1;
      weightedMean = kahanSum(finiteScores.map((s, i) => s * weighted[i])) / sumW;
    }
    
    // FIX: Garantir que weightedMean nunca é NaN/Infinity
    if (!Number.isFinite(weightedMean)) {
        weightedMean = kahanMean(finiteScores) || 0;
    }

    // Robustez adaptativa: Huber-like clipping guiado por MAD para reduzir impacto de outliers
    const sorted = [...finiteScores].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const absDev = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = absDev.length % 2 === 0
        ? (absDev[absDev.length / 2 - 1] + absDev[absDev.length / 2]) / 2
        : absDev[Math.floor(absDev.length / 2)];
    const robustSigma = Math.max(0.5, 1.4826 * mad);
    const huberK = 2.5 * robustSigma;

    // ✅ FIX: quando os pesos decaíram, usar variância simples (não ponderada).
    // Antes, numerator≈0 / sumW≈0 → sd≈0 → motor ficava superconfiante em séries antigas.
    const weightedVariance = weightsCollapsed
        ? kahanSum(finiteScores.map((s) => {
            const d = s - weightedMean;
            const clipped = Math.max(-huberK, Math.min(huberK, d));
            return clipped * clipped;
          })) / Math.max(1, finiteScores.length - 1)
        : kahanSum(finiteScores.map((s, i) => {
            const d = s - weightedMean;
            const clipped = Math.max(-huberK, Math.min(huberK, d));
            return weighted[i] * clipped * clipped;
          })) / Math.max(1e-9, sumW);

    // CORREÇÃO: Substituir o CONSISTENCY_FACTOR fixo (que só funcionava para N=10) 
    // pela verdadeira Correção de Bessel adaptável ao Tamanho Efetivo da Amostra (effectiveN).
    // CORREÇÃO: Substituir o CONSISTENCY_FACTOR fixo pela verdadeira Correção de Bessel,
    // mas com clamping defensivo para evitar assíntotas hiperbólicas quando effectiveN cai para perto de 1.
    // O piso desce de 1.0 para 0.1, permitindo que a penalidade de incerteza seja aplicada corretamente.
    // Transição suave: interpola entre 1.0 e N/(N-1) via sigmoid
    // para evitar descontinuidade em effectiveN = 1.5
    const bessel = effectiveN > 1 ? effectiveN / (effectiveN - 1) : 1;
    const sd = Math.sqrt(Math.max(0, weightedVariance * bessel));
    
    // MATEMÁTICA COMPLEXA: Em vez de linear trend clampada, usamos Bootstrapping 
    // para medir se o momento positivo é estatisticamente significativo ou só sorte.

    let trueTrendStrength = 0;
    let isPlateau = false;

    if (finiteScores.length >= 5) {
        // Reamostragem de Monte Carlo (Bootstrap) com os deltas mais recentes
        const recentScores = finiteScores.slice(-8);
        const recentDeltas = [];
        for (let i = 1; i < recentScores.length; i++) {
            recentDeltas.push(recentScores[i] - recentScores[i - 1]);
        }
        
        // Pede o Intervalo de Confiança (CI) a 95% para a média dos deltas
        const momentumCI = bootstrapCI(recentDeltas, (arr) => arr.reduce((a,b)=>a+b,0)/arr.length, { iterations: 500 });
        
        // Diagnóstico de Estagnação (Platô): Se a ponta alta for positiva, mas a baixa negativa,
        // E houver variância real (não é apenas uma série de zeros exatos),
        // significa que a variação é apenas ruído estocástico.
        const amplitudeCI = momentumCI.high - momentumCI.low;
        
        if (momentumCI.low <= 0 && momentumCI.high >= 0 && amplitudeCI > 1e-6) {
            isPlateau = true;
            trueTrendStrength = 0; // Zera a tendência, forçando o motor a focar no baseline histórico
        } else {
            trueTrendStrength = Math.abs(momentumCI.estimate) / (sd > 0 ? sd : 1);
        }
    } else {
       // Fallback matemático rigoroso para micro-amostras (N<5)
       const slopeData = finiteScores.map((score, i) => ({ x: parsedData[i].time / 86400000, y: score }));
       const { slope: shortSlope } = calcSlopeWithSignificance(slopeData);
       trueTrendStrength = sd > 1e-9 ? Math.min(3.0, Math.abs(shortSlope) / sd) : 0;
    }

    const ciInflationRaw = 1 + (trueTrendStrength * cfg.trendSensitivity);
    const ciInflation = Math.max(1, Math.min(cfg.maxCIInflation, ciInflationRaw));

    return { 
        effectiveN, 
        trendStrength: trueTrendStrength, 
        isPlateau, 
        adaptiveWinsor: { low: cfg.lowWinsor, high: cfg.highWinsor }, 
        ciInflation 
    };
}

// NOTE: deriveCoachAdaptiveParams lives in coachAdaptive.js (canonical version).
// This file previously had a duplicate with a slightly different signature.
// Removed to avoid confusion and dead code.

// ─────────────────────────────────────────────────────────────────
// ADAPT-03: Unified Adaptive Confidence Shrinkage
// Substitui os 3 padrões diferentes de shrinkage espalhados pelo codebase:
//   1. shrinkProbabilityToNeutral (calibration.js) — penalidade de calibração
//   2. extraLowSampleShrink (coachAdaptive.js:278) — amostra pequena
//   3. POPULATION_SD prior (stats.js:44) — prior Bayesiano
//
// Esta função unifica o conceito: dado um estimador (probabilidade, média, etc.),
// qual é o fator de shrinkage adequado considerando TODOS os sinais de incerteza?
// ─────────────────────────────────────────────────────────────────
export function adaptiveConfidenceShrinkage(options = {}) {
    const {
        sampleSize = 1,
        calibrationPenalty = 0,
        trendStrength = 0,
        neutralValue = 50,
        maxShrink = 0.6
    } = options;

    const n = Math.max(1, Number(sampleSize) || 1);
    const calPen = Math.max(0, Math.min(1, Number(calibrationPenalty) || 0));
    const trend = Math.max(0, Math.min(5, Number(trendStrength) || 0));

    // Componente 1: Sample size shrinkage (1/√n decay)
    // n<5: forte shrinkage (~0.45), n=15: moderado (~0.26), n>30: mínimo (~0.18)
    const sampleShrink = Math.max(0, 1 / Math.sqrt(n));

    // Componente 2: Calibração (quanto pior a calibração, mais puxamos para o neutro)
    const calibShrink = calPen * 0.8; // escalar para não dominar

    // Componente 3: Trend uncertainty (tendência forte = mais incerteza no futuro, não no presente)
    // FIX: Usar índice bruto de penalidade (0 a 1) para evitar dupla supressão de peso.
    const trendPenaltyFactor = Math.min(1.0, trend * 0.25); 

    // FIX BUG 4: Incluir a incerteza da tendência no cálculo final de contração
    // Redistribuir os pesos para incluir a incerteza da tendência (15%)
    const rawShrink = (sampleShrink * 0.50) + (calibShrink * 0.35) + (trendPenaltyFactor * 0.15); 
    const safeMaxShrink = Number.isFinite(Number(maxShrink)) ? Number(maxShrink) : 0.6;
    const finalShrink = Math.max(0, Math.min(safeMaxShrink, rawShrink));

    return {
        shrinkFactor: Number(finalShrink.toFixed(4)),
        trendUncertaintyPenalty: Number(trendPenaltyFactor.toFixed(4)), // Exporta para o Monte Carlo inflar o desvio padrão
        components: {
            sampleShrink: Number(sampleShrink.toFixed(4)),
            calibShrink: Number(calibShrink.toFixed(4)),
            trendShrink: Number(trendPenaltyFactor.toFixed(4))
        },
        // Helper: aplica o shrinkage a um valor
        apply: (value) => {
            const v = Number(value);
            if (!Number.isFinite(v)) return neutralValue;
            return v * (1 - finalShrink) + neutralValue * finalShrink;
        }
    };
}

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-07: Ponte entre computeAdaptiveSignal e o pipeline do Coach
// Exporta um peso consolidado que indica quanta confiança o motor deve
// depositar nas previsões atuais vs. recuar para priors conservadores.
// ─────────────────────────────────────────────────────────────────
export function computeAdaptiveCoachWeight(scores = []) {
    const signal = computeAdaptiveSignal(scores);
    
    // CORREÇÃO MATH: Se o tamanho da amostra (efetiva) for irrisório, 
    // a confiança matemática na tendência empírica DEVE colapsar para 0 estrito.
    // O sistema não pode dar 30% de credibilidade cega ao Vazio.
    if (signal.effectiveN < 1.5) {
        return {
            confidenceWeight: 0,
            effectiveN: Number(signal.effectiveN.toFixed(2)),
            trendStrength: 0,
            ciInflation: 1,
            adaptiveWinsor: signal.adaptiveWinsor
        };
    }

    const nConfidence = Math.min(1, signal.effectiveN / 15);
    const trendUncertainty = Math.min(1, signal.trendStrength / 2.5); 
    
    const confidenceWeight = Math.max(0, Math.min(1, 
        nConfidence * 0.7 + (1 - trendUncertainty) * 0.3
    ));

    return {
        confidenceWeight: Number(confidenceWeight.toFixed(4)),
        effectiveN: Number(signal.effectiveN.toFixed(2)),
        trendStrength: Number(signal.trendStrength.toFixed(4)),
        ciInflation: Number(signal.ciInflation.toFixed(4)),
        adaptiveWinsor: signal.adaptiveWinsor
    };
}
/**
 * Calcula a retenção real usando o algoritmo FSRS (Free Spaced Repetition Scheduler).
 * Substitui o modelo clássico de Ebbinghaus por uma matriz de Estabilidade e Recuperabilidade.
 * 
 * @param {number} horasDesdeEstudo - Tempo (t) em horas.
 * @param {number} forcaMemoria - Força do traço de memória (S) baseada em revisões (0 a 10).
 * @param {number} dificuldade - Fator de dificuldade do item (0.1 a 1.0).
 * @returns {number} Percentual de Retenção (0.20 a 1.0)
 */
export const calculateSafeRetention = (horasDesdeEstudo, forcaMemoria, dificuldade = 0.5) => {
    const baseline = 0.2;
    
    const safeHoras = toFiniteNumber(horasDesdeEstudo, 0);
    const safeForca = toFiniteNumber(forcaMemoria, 1);
    const safeDiff = toFiniteNumber(dificuldade, 0.5);

    const tempoDias = Math.max(0, safeHoras / 24);
    
    const difficultyFactor = 1 - (clamp(safeDiff, 0.1, 1.0) * 0.35); 
    
    const baseStability = Math.exp(safeForca * 0.45) * difficultyFactor;
    // T-010 FIX: Estabilidade não deve ser infinita e deve ter piso realista.
    const stability = clamp(baseStability, 0.5, 365);
    
    const retrievability = Math.pow(1 + tempoDias / (9 * stability), -1);
    
    const finalRetention = Number.isFinite(retrievability) ? retrievability : 0; 
    
    return clamp(finalRetention, baseline, 1.0);
};
```

## File: src/utils/coachLogic.js
```javascript
// ==================== CONSTANTES ====================
import { calculateMSSD, calculateSlope } from '../engine/projection.js';
import { getSortedHistory } from '../engine/stats.js';
import { useAppStore } from '../store/useAppStore.js';
import { computeForgettingRisk } from '../engine/diagnostics.js';
import { getSafeScore, getSyntheticTotal, formatValue, formatPercent } from './scoreHelper.js';
import { safeDateParse as _safeDateParse, normalizeDate, getDateKey } from './dateHelper.js';
import { normalize, isSubjectMatch } from './normalization.js';
import { computeRollingCalibrationParams } from './calibration.js';
import {
    deriveAdaptiveRiskThresholds,
    computeContinuousMcBoost,
    deriveBacktestWeights,
    deriveCoachAdaptiveParams,
    runCoachMonteCarlo,
    clearMcCache,
    simuladosToHistory
} from './coachAdaptive.js';
import { computeAdaptiveCoachWeight } from './adaptiveMath.js';
import { getCoachFeature } from './coachFeatures.js';
import { kalmanAbilityTrend } from '../engine/probabilistic/stateSpace.js';
import { estimateDynamicVolatility } from '../engine/probabilistic/volatility.js';
import { estimatePosteriorPredictive } from '../engine/probabilistic/posteriorPredictive.js';
import { estimateTopicProficiencies } from '../engine/probabilistic/bayesianTopics.js';
import {
  rankDecisionCandidates,
} from '../engine/probabilistic/decisionEngine.js';
import {
  getKnowledgeGraphForCategory,
  computeTopicGraphMetrics,
} from '../engine/probabilistic/knowledgeGraph.js';
import {
  estimateTopicFsrs,
  estimateCategoryFsrsBoost,
} from '../engine/probabilistic/fsrs.js';
import { kahanSum } from '../engine/math/kahan.js';
import { computeAgilityMetrics } from '../engine/stats.js';
// import { cleanCoachTags } from './coachText.js';
// FIX (BUG-13): hashString64 disponível para cache keys compactas
import { safeArray, getCalibrationKey, hashString, hashString64 } from './coachSafe.js';

export {
    deriveAdaptiveRiskThresholds,
    computeContinuousMcBoost,
    deriveBacktestWeights,
    clearMcCache,
    runCoachMonteCarlo
};

const URGENCY_CACHE_MAX = 80;
const TOPICS_CACHE_MAX = 50;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// LRU Cache for urgency calculations
export const _urgencyCache = new Map();
export const clearUrgencyCache = () => _urgencyCache.clear();
export const _topicsCache = new Map();
export const clearTopicsCache = () => _topicsCache.clear();

// ✅ FIX: Helper para inserção com limite e TTL
function cacheSet(cache, maxSize, key, value) {
  if (cache.size >= maxSize) {
    // Limpar expirados primeiro
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > CACHE_TTL_MS) cache.delete(k);
    }
    // Se ainda cheio, remover LRU
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
  }
  cache.set(key, { value, timestamp: Date.now() });
}

function cacheGet(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // LRU: mover para o fim
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

// FIX (BUG-14): deep clone robusto — preserva Date, Map, Set, undefined
// (JSON.parse(JSON.stringify()) perde esses tipos no fallback)
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch { /* fallback abaixo */ }
  if (Array.isArray(value)) return value.map(deepClone);
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [deepClone(k), deepClone(v)]));
  if (value instanceof Set) return new Set([...value].map(deepClone));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = deepClone(v);
  return out;
}

const sanitizeMinutes = (mins) => Math.min(720, Math.max(0, Number(mins) || 0));
const clamp = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
};

const safeFixedNumber = (value, digits = 2, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : fallback;
};

// simpleHash moved to coachSafe.js as hashString (canonical)
const simpleHash = hashString;

export const DEFAULT_CONFIG = {
    MC_HISTORY_WINDOW: 10,
    SCORE_MAX: 45,
    RECENCY_MAX: 28,
    INSTABILITY_MAX: 22,
    PRIORITY_BOOST: 18,
    EFFICIENCY_MAX: 10,
    SRS_BOOST: 16,
    BASE_HOURS_THRESHOLD: 5,
    // Normalização
    NORMALIZATION_CEILING: 170,
    CRITICAL_THRESHOLD: 122,
    // Monte Carlo
    MC_SIMULATIONS: 800,
    MC_MIN_DATA_POINTS: 3,
    MC_PROB_DANGER: 30,
    MC_PROB_SAFE: 90,
    MC_VOLATILITY_HIGH: 8,
    INSTABILITY_MSSD_DIVISOR: 12,
    MC_BACKTEST_HORIZON: 3,
    MC_BACKTEST_HORIZON_MAX: 6,
    MC_CALIBRATION_BRIER_BASELINE: 0.18,
    MC_CALIBRATION_MAX_PENALTY: 0.25,
    MC_CALIBRATION_NEUTRAL_PCT: 50,
    MC_CALIBRATION_MAX_APPLIED_PENALTY: 0.35,
    MC_ENABLE_ADAPTIVE_CALIBRATION: true,
    MC_CALIB_WINDOW_DAYS: 60,
    MC_CALIB_MIN_SAMPLES: 4,
    MC_CALIB_MAX_SAMPLES: 20,
    MC_ECE_BINS_MIN: 4,
    MC_ECE_BINS_MID: 6,
    MC_ECE_BINS_MAX: 8,
    MC_LOW_SAMPLE_THRESHOLD: 10,
    MC_BOOST_DANGER_BASE: 10,
    MC_BOOST_DANGER_RANGE: 12,
    MC_BOOST_MODERATE_BASE: 10,
    MC_BOOST_SAFE_PENALTY: -10,
    MC_MODERATE_MIDPOINT: 55,
};

function getDynamicTrendThreshold(currentScore, maxScore) {
    const safeMax = maxScore > 0 ? maxScore : 100;
    const currentPct = currentScore / safeMax;
    const damping = Math.max(0, 1 - currentPct);
    const baseRequirement = 0.05;
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002;
    return dynamicPct * maxScore;
}

// ==================== FUNÇÕES AUXILIARES ====================
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const getDaysDiff = (newer, older) => {
    const d1 = normalizeDate(newer) || new Date(0);
    const d2 = normalizeDate(older) || new Date(0);
    return Math.max(0, Math.round((d1.getTime() - d2.getTime()) / MS_PER_DAY));
};

/**
 * Crunch multiplier corrigido:
 * - monotônico com os dias restantes
 * - menos distorção para veteranos
 * - curva logística mais justa e explicável
 *
 * PATCH: daysToExam === 0 → a própria curva logística converge para ~1.95
 * (máxima urgência no dia da prova). O caso especial `return 1.3` criava
 * um penhasco: véspera ≈1.94 → dia da prova 1.3.
 * daysToExam < 0 → retorna 1.0 (prova já passou)
 */
export function getCrunchMultiplier(daysToExam, firstActivityDate = null, now = null) {
    if (daysToExam === null || daysToExam === undefined || Number.isNaN(daysToExam)) return 1.0;
    if (daysToExam < 0) return 1.0;

    let criticalHorizon = 21;
    let timeDivisor = 7;
    const safeFirstActivity = normalizeDate(firstActivityDate);
    if (safeFirstActivity && !isNaN(safeFirstActivity.getTime())) {
        const referenceDate = now ? (normalizeDate(now) || new Date()) : new Date();
        const refTime = referenceDate.getTime();
        const firstTime = safeFirstActivity.getTime();
        // ✅ FIX: Validar timestamps
        if (!Number.isFinite(refTime) || !Number.isFinite(firstTime)) return 1.0;
        const journeyDays = Math.max(0, refTime - firstTime) / 86400000;
        // ✅ FIX: Validar journeyDays
        if (!Number.isFinite(journeyDays)) return 1.0;
        const safeDays = Number.isFinite(daysToExam) ? Math.max(0, daysToExam) : 0;
        const totalJourneyDays = Math.max(1, journeyDays) + safeDays;
        criticalHorizon = Math.max(14, Math.min(35, totalJourneyDays * 0.08));
        timeDivisor = Math.max(7, Math.min(60, totalJourneyDays * 0.15));
    }
    const timeDist = Number.isFinite(daysToExam) ? Number(daysToExam) : criticalHorizon;
    const urgency = 1.0 + (1.0 / (1.0 + Math.exp((timeDist - criticalHorizon) / timeDivisor)));
    return Number(Math.min(2.0, urgency).toFixed(4));
}

function _getSRSBoost(history, daysSince, maxScore, cfg, mssdVolatility = null, effectiveN = null) {
  // Lote 7: FSRS avançado opcional
  if (
    getCoachFeature(null, 'useAdvancedFsrs', false) &&
    getCoachFeature(null, 'useFsrsForSrsBoost', false)
  ) {
    try {
      const fsrsData = estimateCategoryFsrsBoost(history, {
        daysSince,
        maxScore,
        cfg,
        desiredRetention: 0.85,
      });
      if (fsrsData) {
        return fsrsData;
      }
    } catch (err) {
      console.warn('[CoachLogic] Advanced FSRS category boost failed:', err);
    }
  }

  // Fallback legado
  const forgettingData = computeForgettingRisk(
    history,
    maxScore,
    null,
    mssdVolatility,
    effectiveN,
    daysSince
  );

  // ✅ FIX: Validar retention antes de calcular boost
  const retention = Number.isFinite(forgettingData.retentionPct)
    ? forgettingData.retentionPct
    : 100;

  if (retention < 75) {
    const intensity = Math.pow((75 - retention) / 75, 1.2);
    const boost = cfg.SRS_BOOST * 2.0 * intensity;
    let label;
    if (retention < 30) label = "⚠️ Memória Crítica (Risco de Branco)";
    else if (retention < 55) label = "🧠 Revisão Necessária (Curva de Esquecimento)";
    else label = "🔄 Revisão de Reforço";
    return { boost, label };
  }
  return { boost: 0, label: null };
}

/**
 * Proficiência bayesiana corrigida:
 * - tópico nunca testado não herda automaticamente a média global
 * - reduz o Efeito Halo
 */
export const computeBayesianProficiency = (acertos, total, mediaGlobal = 0.5, globalTotal = 0) => {
    const rawAcertos = Number(acertos) || 0;
    const rawTotal = Number(total) || 0;
    const safeMedia = Number.isFinite(mediaGlobal) ? Math.max(0, Math.min(1, mediaGlobal)) : 0.5;
    const safeGlobalTotal = Number.isFinite(globalTotal) ? Math.max(0, globalTotal) : 0;
    const K = Math.max(3, Math.min(15, Math.log10(safeGlobalTotal + 1) * 3));
    const untestedPrior = 0.25;
    // ✅ FIX: Tópico não testado usa prior conservador, não herda média global
    const dataTrust = Math.min(1, rawTotal / K);
    const prior = rawTotal === 0
        ? untestedPrior // ← Não herda safeMedia
        : (untestedPrior * (1 - dataTrust)) + (safeMedia * dataTrust);
    const smoothedAcertos = rawAcertos + (prior * K);
    const smoothedTotal = rawTotal + K;
    const proficiency = smoothedTotal > 0 ? smoothedAcertos / smoothedTotal : untestedPrior;
    return clamp(proficiency, 0, 1);
};

export function computeRobustVolatilityForCoach(history = [], maxScore = 100, minScore = 0) {
    const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const safeMin = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMax) : 0;
    const range = Math.max(1e-9, safeMax - safeMin);
    const fallbackVol = 0.08 * range;
    const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
    const n = safeHistory.length;
    if (n < 2) return fallbackVol;
    const validScores = safeHistory
        .map(h => getSafeScore(h, safeMax, safeMin))
        .filter(s => Number.isFinite(s));
    const validN = validScores.length;
    if (validN < 2) return fallbackVol;
    const mean = kahanSum(validScores) / validN;
    const devs = validScores.map(val => Math.pow(val - mean, 2));
    const variance = kahanSum(devs) / (validN - 1);
    const empiricalVol = Math.sqrt(Math.max(0, variance));
    const shrinkFactor = validN / (validN + 4);
    return empiricalVol * shrinkFactor + fallbackVol * (1 - shrinkFactor);
}

export const sanitizeNum = (val) => {
  if (val === null || val === undefined || val === '') return NaN;
  // ✅ FIX: Rejeitar boolean e object
  if (typeof val === 'boolean') return NaN;
  if (typeof val === 'object') return NaN;

  let str = String(val).trim();
  str = str.replace(/[%\s]/g, '');
  if (!str) return NaN;
  // ✅ FIX: Rejeitar strings que são apenas sinais
  if (/^[+-]?$/.test(str)) return NaN;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    const afterComma = str.split(',')[1];
    if (afterComma && afterComma.length === 3) {
      str = str.replace(/\./g, '').replace(',', '');
    } else {
      str = str.replace(/\./g, '').replace(',', '.');
    }
  } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : NaN;
};

export const getCoachPriorities = (topicsData) => {
  if (!Array.isArray(topicsData)) return [];

  const useBayesian = getCoachFeature(null, 'useBayesianTopics', false);
  if (useBayesian) {
    try {
      const bayesianInput = topicsData.map(topic => {
        const parsedAcertos = sanitizeNum(topic.acertos);
        const parsedCorrect = sanitizeNum(topic.correct);
        const parsedTotal = sanitizeNum(topic.total);
        const correct = Number.isFinite(parsedAcertos)
          ? parsedAcertos
          : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
        const total = Number.isFinite(parsedTotal) ? parsedTotal : 0;
        return {
          name: topic.name || topic.topic || topic.id || 'Tópico',
          total,
          correct,
          original: topic
        };
      });

      const bayesianResult = estimateTopicProficiencies(bayesianInput, {
        untestedPriorMean: 0.25,
        untestedPriorWeight: 0.45
      });

      return bayesianResult.topics
        .map(topic => ({
          ...(topic.original || {}),
          name: topic.name,
          realProficiency: clamp(topic.proficiencyMean, 0, 1),
          bayesian: topic
        }))
        .sort((a, b) => {
          if (a.completed && !b.completed) return 1;
          if (!a.completed && b.completed) return -1;
          const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1;
          const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
          return valA - valB;
        });
    } catch (err) {
      console.warn('[CoachLogic] Bayesian getCoachPriorities failed:', err);
    }
  }

  // fallback legado
  const globalCorrect = topicsData.reduce((acc, t) => {
    const parsedAcertos = sanitizeNum(t.acertos);
    const parsedCorrect = sanitizeNum(t.correct);
    const c = Number.isFinite(parsedAcertos)
      ? parsedAcertos
      : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
    return acc + c;
  }, 0);

  const globalTotal = topicsData.reduce((acc, t) => {
    const parsedTotal = sanitizeNum(t.total);
    const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;
    return acc + tot;
  }, 0);

  const mediaGlobal = (globalTotal > 0 && Number.isFinite(globalCorrect / globalTotal))
    ? globalCorrect / globalTotal
    : 0.5;

  return topicsData.map(topic => {
    const parsedAcertos = sanitizeNum(topic.acertos);
    const parsedCorrect = sanitizeNum(topic.correct);
    const parsedTotal = sanitizeNum(topic.total);
    const c = Number.isFinite(parsedAcertos)
      ? parsedAcertos
      : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
    const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;

    let realProficiency = computeBayesianProficiency(c, tot, mediaGlobal, globalTotal);
    realProficiency = Number.isFinite(realProficiency) ? clamp(realProficiency, 0, 1) : 0;

    return {
      ...topic,
      realProficiency
    };
  })
  .sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1;
    const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
    return valA - valB;
  });
};

// ==================== FUNÇÃO PRINCIPAL ====================
export const extractMetrics = (category, simulados = [], studyLogs = [], options = {}) => {
    // ✅ FIX: Garantir que options é objeto
    const safeOptions = options && typeof options === 'object' ? options : {};

    const cfg = { ...DEFAULT_CONFIG, ...(safeOptions.config || {}) };
    const safeCategory = category || {};
    const categoryId = safeCategory.id;
    const calibrationHistory = safeOptions.calibrationHistoryByCategory?.[getCalibrationKey(categoryId)] || [];
    const rollingCalibration = computeRollingCalibrationParams(calibrationHistory, {
        baseline: cfg.MC_CALIBRATION_BRIER_BASELINE,
        maxPenalty: cfg.MC_CALIBRATION_MAX_PENALTY,
        windowDays: cfg.MC_CALIB_WINDOW_DAYS,
        minSamples: cfg.MC_CALIB_MIN_SAMPLES,
        maxSamples: cfg.MC_CALIB_MAX_SAMPLES
    });

    const referenceDate = safeOptions.now ? (normalizeDate(safeOptions.now) || new Date()) : new Date();
    const referenceNow = referenceDate.getTime();

    // ✅ FIX: Priorizar maxScore, minScore e minCutoff da categoria sobre options global
    const rawMaxScore = Number(safeCategory.maxScore ?? safeOptions.maxScore ?? 100);
    const maxScore = Number.isFinite(rawMaxScore) && rawMaxScore > 0 ? rawMaxScore : 100;

    const rawMinScore = Number(safeCategory.minScore ?? safeOptions.minScore ?? 0);
    const minScore = Number.isFinite(rawMinScore) ? Math.min(rawMinScore, maxScore) : 0;

    const rawTargetScore = Number(safeCategory.minCutoff ?? safeOptions.targetScore ?? (maxScore * 0.8));
    const fallbackTarget = maxScore * 0.8;
    const unclampedTarget = Number.isFinite(rawTargetScore) ? rawTargetScore : fallbackTarget;
    const targetScore = Math.min(maxScore, Math.max(minScore, unclampedTarget));
    const targetScoreLabel = safeOptions.targetScoreLabel ?? Math.round(((targetScore - minScore) / Math.max(1e-9, maxScore - minScore)) * 100);

    let rawWeightVal = safeCategory.weight;
    if (typeof rawWeightVal === 'string') {
        rawWeightVal = rawWeightVal.replace(/\./g, '').replace(',', '.');
    }
    const parsedWeight = Number(rawWeightVal);
    const rawWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 5;
    const boundedWeight = Math.min(10, Math.max(1, rawWeight));
    const weight = boundedWeight * 20;
    const weightLabel = boundedWeight <= 3 ? '1 — Baixa' : boundedWeight <= 7 ? '2 — Média' : '3 — Alta';

    let daysToExam = null;
    // ✅ FIX: Verificar se safeOptions.user existe antes de acessar goalDate
    if (safeOptions.user && safeOptions.user.goalDate) {
        try {
            const examDate = normalizeDate(safeOptions.user.goalDate);
            if (examDate && !isNaN(examDate.getTime())) {
                const today = normalizeDate(referenceDate) || referenceDate;
                daysToExam = Math.round((examDate.getTime() - today.getTime()) / MS_PER_DAY);
            }
        } catch {
            console.warn("[CoachLogic] Invalid goalDate:", safeOptions.user.goalDate);
        }
    }

    const safeSimulados = Array.isArray(simulados) ? [...simulados] : Object.values(simulados || {});
    const safeStudyLogs = Array.isArray(studyLogs) ? [...studyLogs] : Object.values(studyLogs || {});

    const catName = safeCategory?.name || safeCategory?.id || '';

    const relevantAllPreSort = catName
        ? safeSimulados.filter(s => s && isSubjectMatch(s.subject || "", catName))
        : safeSimulados;

    const relevantAll = relevantAllPreSort
        .sort((a, b) => {
            const timeA = (normalizeDate(a.date || a.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b.date || b.createdAt) || new Date(0)).getTime();
            return timeB - timeA;
        });

    const rootActivityDate = (relevantAll.length > 0
        ? normalizeDate(relevantAll[relevantAll.length - 1].date || relevantAll[relevantAll.length - 1].createdAt)
        : null) || normalizeDate(referenceDate) || referenceDate;

    const relevantSimulados = relevantAll.length > 50 ? relevantAll.slice(0, 50) : relevantAll;
    const simuladosWithMaxScore = relevantSimulados;

    // Global baseline antes da média inicial, para âncora mais justa em categorias sem dados
    let globalBaselinePct = 50;
    const validCatNorms = new Set((options.allCategories || []).map(c => normalize(c?.name || "")));
    const allSimsForBaseline = validCatNorms.size > 0
        ? safeSimulados.filter(s => s && validCatNorms.has(normalize(s.subject || "")))
        : safeSimulados;

    // FIX: normalizar cada score para [0,1] usando os limites da própria matéria antes de somar.
    const catMap = new Map();
    (options.allCategories || []).forEach(c => {
        if (c?.name) catMap.set(normalize(c.name), c);
        if (c?.id) catMap.set(String(c.id), c);
    });

    const validGlobalRatios = allSimsForBaseline
        .map((s) => {
            const sCat = (s?.subject && catMap.get(normalize(s.subject))) || (s?.categoryId && catMap.get(String(s.categoryId))) || null;
            const sMax = Number.isFinite(Number(sCat?.maxScore ?? s?.maxScore)) && Number(sCat?.maxScore ?? s?.maxScore) > 0
                ? Number(sCat?.maxScore ?? s?.maxScore)
                : maxScore;
            const sMin = Number.isFinite(Number(sCat?.minScore ?? s?.minScore))
                ? Math.min(Number(sCat?.minScore ?? s?.minScore), sMax)
                : 0;
            const sRange = Math.max(1e-9, sMax - sMin);

            if (s?.correct != null && s?.total != null && Number(s.total) > 0) {
                const c = sanitizeNum(s.correct);
                const t = sanitizeNum(s.total);
                if (Number.isFinite(c) && Number.isFinite(t) && t > 0) {
                    return Math.max(0, Math.min(1, c / t));
                }
            }

            const score = getSafeScore(s, sMax, sMin);
            if (!Number.isFinite(score)) return null;
            return Math.max(0, Math.min(1, (score - sMin) / sRange));
        })
        .filter((r) => r !== null);

    if (validGlobalRatios.length > 0) {
        const meanRatio = kahanSum(validGlobalRatios) / validGlobalRatios.length;
        globalBaselinePct = meanRatio * 100;
    }

    let averageScore = 0;

    if (relevantSimulados.length > 0) {
        const coachAdaptive = deriveCoachAdaptiveParams(simuladosToHistory(relevantSimulados, maxScore, minScore), maxScore, cfg);
        const today = normalizeDate(referenceDate) || referenceDate;
        const K = coachAdaptive.decayK;
        const PESO_MIN = coachAdaptive.minWeight;
        const DELTA = coachAdaptive.scoreClampDelta;

        const calculateExponentialScore = (dataset) => {
            let weightedSum = 0;
            let totalWeight = 0;
            dataset.forEach(s => {
                const sScore = getSafeScore(s, maxScore, minScore);
                if (!Number.isFinite(sScore)) return;
                const simDate = normalizeDate(s.date || s.createdAt) || new Date(0);
                const days = getDaysDiff(today, simDate);
                let timeWeight = Math.exp(-K * days);
                if (timeWeight < PESO_MIN) timeWeight = PESO_MIN;
                const rawTotal = Math.max(1, Number(s.total) || getSyntheticTotal(maxScore));
                const volumeWeight = Math.sqrt(Math.min(rawTotal, maxScore * 2));
                const peso = timeWeight * volumeWeight;
                weightedSum += sScore * peso;
                totalWeight += peso;
            });
            return totalWeight > 0 ? weightedSum / totalWeight : (minScore + (maxScore - minScore) / 2);
        };

        const mostRecentSimDate = relevantSimulados.length > 0
            ? (normalizeDate(relevantSimulados[0].date || relevantSimulados[0].createdAt) || new Date(0)).getTime()
            : referenceNow;

        const SESSION_GAP_MS = 60 * 60 * 1000;
        let pastSimulados = relevantSimulados.filter(s => {
            const sTime = (normalizeDate(s.date || s.createdAt) || new Date(0)).getTime();
            return sTime < (mostRecentSimDate - SESSION_GAP_MS);
        });

        if (pastSimulados.length === 0 && relevantSimulados.length > 1) {
            pastSimulados = relevantSimulados.slice(1);
        }

        const notaBruta = calculateExponentialScore(relevantSimulados);

        if (pastSimulados.length > 0) {
            const notaAnterior = calculateExponentialScore(pastSimulados);
            const diff = notaBruta - notaAnterior;
            let clampedDiff = diff;
            if (diff > DELTA) clampedDiff = DELTA;
            else if (diff < -DELTA) clampedDiff = -DELTA;

            // ✅ PATCH-09: Validar hoursSinceLastSim explicitamente
            const rawHoursSinceLastSim = (referenceNow - mostRecentSimDate) / (1000 * 60 * 60);
            const hoursSinceLastSim = Number.isFinite(rawHoursSinceLastSim) && rawHoursSinceLastSim >= 0
                ? rawHoursSinceLastSim
                : Infinity; // ← força o caminho "notaBruta"

            if (hoursSinceLastSim < 24) {
                averageScore = notaAnterior + clampedDiff;
            } else {
                averageScore = notaBruta;
            }
        } else {
            averageScore = notaBruta;
        }
    } else {
        const domain = Math.max(1e-6, maxScore - minScore);
        const globalAnchor = Number.isFinite(safeOptions.globalMcStats?.currentMean)
            ? safeOptions.globalMcStats.currentMean
            : (globalBaselinePct !== 50
                ? minScore + (globalBaselinePct / 100) * domain
                : minScore + 0.5 * domain);
        averageScore = clamp(globalAnchor, minScore, maxScore);
    }

    let daysSinceLastStudy = 0;
    let recencyUnknown = true;
    let lastDate = normalizeDate(new Date(0)) || new Date(0);

    if (simuladosWithMaxScore.length > 0) {
        const simDate = normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt) || new Date(0);
        if (simDate > lastDate) lastDate = simDate;
    }

    const categoryStudyLogs = safeStudyLogs.filter(log =>
        categoryId && log?.categoryId === categoryId &&
        (normalizeDate(log.date) || new Date(0)).getTime() > 0
    );

    const MIN_MINUTES_VALID_STUDY = 15;
    const validStudyLogs = categoryStudyLogs.filter(log => sanitizeMinutes(log.minutes) >= MIN_MINUTES_VALID_STUDY);

    if (validStudyLogs.length > 0) {
        const sortedLogs = [...validStudyLogs].sort((a, b) =>
            (normalizeDate(b.date) || new Date(0)).getTime() - (normalizeDate(a.date) || new Date(0)).getTime()
        );
        const logDate = normalizeDate(sortedLogs[0].date) || new Date(0);
        if (logDate > lastDate) lastDate = logDate;
    }

    if (lastDate.getTime() > 0) {
        const today = normalizeDate(referenceDate) || referenceDate;
        daysSinceLastStudy = getDaysDiff(today, lastDate);
        recencyUnknown = false;
    }

    const trendHistory = [...simuladosWithMaxScore]
        .map(s => ({
            score: getSafeScore(s, maxScore, minScore),
            date: s.date || s.createdAt
        }))
        .filter(t => Number.isFinite(t.score))
        .sort((a, b) => {
            const timeA = (normalizeDate(a.date) || new Date(0)).getTime();
            const timeB = (normalizeDate(b.date) || new Date(0)).getTime();
            return timeB - timeA;
        })
        .slice(0, 10)
        .reverse();

    const lastNScores = trendHistory.map(t => t.score);
    const backtestWeights = deriveBacktestWeights(lastNScores, maxScore);

    // ==================== LOTE 1: STATE-SPACE / KALMAN ====================
    let stateSpace = null;
    const useStateSpace = getCoachFeature(options, 'useStateSpace', false);
    if (useStateSpace && trendHistory.length >= 3) {
      try {
        stateSpace = kalmanAbilityTrend(trendHistory, {
          maxScore,
          minScore,
        });
      } catch (err) {
        console.warn('[CoachLogic] State-space/Kalman failed:', err);
        stateSpace = null;
      }
    }

    // Se autorizado, substitui a média exponencial pela habilidade latente do Kalman.
    if (
      stateSpace &&
      getCoachFeature(options, 'useStateSpaceAverage', false)
    ) {
      averageScore = clamp(stateSpace.ability, minScore, maxScore);
    }

    // Se autorizado, substitui a tendência simples pela tendência do Kalman.
    const rawTrend = stateSpace && getCoachFeature(options, 'useStateSpaceTrend', false)
      ? stateSpace.trendPerMonth
      : calculateSlope(trendHistory, maxScore, { minScore }) * 30;

    const limiteSuperior = maxScore - averageScore;
    const limiteInferior = minScore - averageScore;
    const trend = Math.max(limiteInferior, Math.min(limiteSuperior, rawTrend));

    // ✅ PATCH-27: Janela do MC configurável (padrão 10 para volatilidade de curto prazo)
    const MC_WINDOW = Number(cfg.MC_HISTORY_WINDOW) || 10;
    const mcHistory = simuladosToHistory(simuladosWithMaxScore.slice(0, MC_WINDOW), maxScore, minScore);

    const baseMssdVolatility = mcHistory.length >= 3
        ? calculateMSSD(mcHistory, maxScore, minScore)
        : computeRobustVolatilityForCoach(mcHistory, maxScore, minScore);

    // ==================== LOTE 2: VOLATILIDADE DINÂMICA ====================
    let dynamicVolatility = null;
    let mssdVolatility = baseMssdVolatility;

    if (
      getCoachFeature(options, 'useDynamicVolatility', false) &&
      mcHistory.length >= 3
    ) {
      try {
        dynamicVolatility = estimateDynamicVolatility(mcHistory, {
          maxScore,
          minScore,
          useGarch: getCoachFeature(options, 'useGarchVolatility', false),
          override: getCoachFeature(options, 'useDynamicVolatilityOverride', false),
        });

        if (dynamicVolatility && Number.isFinite(dynamicVolatility.volatility)) {
          const dynamicVol = clamp(dynamicVolatility.volatility, 0, maxScore);
          if (getCoachFeature(options, 'useDynamicVolatilityOverride', false)) {
            mssdVolatility = dynamicVol;
          } else {
            // Blend conservador: mantém parte do comportamento antigo.
            mssdVolatility = clamp(
              (dynamicVol * 0.65) + (baseMssdVolatility * 0.35),
              0,
              maxScore
            );
          }
        }
      } catch (err) {
        console.warn('[CoachLogic] Dynamic volatility failed:', err);
        dynamicVolatility = null;
        mssdVolatility = baseMssdVolatility;
      }
    }

    const mcAdaptive = {
        ...deriveCoachAdaptiveParams(mcHistory, maxScore, cfg),
        calibrationBaseline: rollingCalibration.baseline,
        calibrationMaxPenalty: rollingCalibration.maxPenalty
    };

    const adaptiveSimCount = lastNScores.length <= 5
        ? Math.max(cfg.MC_SIMULATIONS, 1200)
        : cfg.MC_SIMULATIONS;

    const domain = Math.max(1e-6, maxScore - minScore);
    const DISTANCE_THRESHOLD = 0.15 * domain;
    let effectiveMCTarget = targetScore;
    let effectiveMCDays = Number.isFinite(daysToExam)
        ? Math.max(0, Math.min(daysToExam, 90))
        : 90;

    if (targetScore - averageScore > DISTANCE_THRESHOLD) {
        effectiveMCTarget = averageScore + Math.max(mssdVolatility, domain * 0.05) + (domain * 0.02);
        effectiveMCTarget = Math.max(averageScore, Math.min(effectiveMCTarget, targetScore));
        if (Number.isFinite(daysToExam)) {
            const totalGap = Math.max(1, targetScore - averageScore);
            const proximalGap = effectiveMCTarget - averageScore;
            const gapRatio = clamp(proximalGap / totalGap, 0, 1);
            effectiveMCDays = daysToExam > 0
                ? Math.max(1, Math.min(daysToExam, Math.max(7, Math.floor(gapRatio * daysToExam))))
                : 0;
        } else {
            effectiveMCDays = 21;
        }
    }

    // ✅ FIX: Verificar se safeOptions.globalMcStats existe antes de acessar
    const globalProjectedMean = safeOptions.globalMcStats && Number.isFinite(safeOptions.globalMcStats.projectedMean)
        ? safeOptions.globalMcStats.projectedMean
        : null;

    if (globalProjectedMean != null && globalProjectedMean < effectiveMCTarget && globalProjectedMean > averageScore) {
        const blend = 0.25;
        effectiveMCTarget = effectiveMCTarget * (1 - blend) + globalProjectedMean * blend;
    }

    const effectiveCfg = {
        ...cfg,
        MC_SIMULATIONS: adaptiveSimCount,
        MC_CALIBRATION_NEUTRAL_PCT: globalBaselinePct
    };

    const agilityData = computeAgilityMetrics(safeCategory.simuladoStats?.history || []) || {};
    const agilityPenalty = Number.isFinite(agilityData.agilityPenalty)
      ? agilityData.agilityPenalty
      : 0;
    const avgSeconds = Number.isFinite(agilityData?.avgSeconds)
        ? agilityData.avgSeconds
        : 0;

    const mcResult = runCoachMonteCarlo(
        simuladosWithMaxScore,
        effectiveMCTarget,
        effectiveCfg,
        categoryId,
        maxScore,
        mcAdaptive,
        effectiveMCDays,
        agilityPenalty,
        minScore
    );

    const baseMcProbability = mcResult?.probability ?? null;
    const mcHasData = mcResult != null;

    // ==================== LOTE 3: POSTERIOR PREDICTIVE MONTE CARLO ====================
    let posteriorMc = null;
    let finalMcResult = mcResult;
    let finalMcProbability = baseMcProbability;

    if (
      getCoachFeature(options, 'usePosteriorMonteCarlo', false) &&
      mcResult
    ) {
      try {
        const safeStateSpace = stateSpace ?? null;
        const safeDynamicVolatility = dynamicVolatility ?? null;
        const domain = Math.max(1e-6, maxScore - minScore);
        const fallbackAbilitySd = Math.max(
          domain * 0.02,
          (Number.isFinite(mssdVolatility) ? mssdVolatility : domain * 0.05) /
            Math.sqrt(Math.max(2, (lastNScores || []).length))
        );
        const fallbackTrendPerDay = Number.isFinite(trend)
          ? trend / 30
          : 0;
        const fallbackTrendSd = Math.max(
          domain * 0.0015,
          Math.abs(fallbackTrendPerDay) * 0.35
        );
        const medianGapDays = safeDynamicVolatility?.medianGapDays ?? 7;
        const fallbackDailyVolatility = Number.isFinite(mssdVolatility)
          ? mssdVolatility / Math.sqrt(Math.max(1, medianGapDays))
          : domain * 0.02;

        const posteriorInput = {
          ability: safeStateSpace?.ability ?? averageScore,
          abilitySd: safeStateSpace?.abilitySd ?? fallbackAbilitySd,
          trendPerDay: safeStateSpace?.trendPerDay ?? fallbackTrendPerDay,
          trendSd: safeStateSpace?.trendSd ?? fallbackTrendSd,
          dailyVolatility: safeDynamicVolatility?.dailyVolatility ?? fallbackDailyVolatility,
          horizonDays: effectiveMCDays,
          targetScore: effectiveMCTarget,
          minScore,
          maxScore,
          sampleSize: (lastNScores || []).length,
          baseProbability: baseMcProbability,
        };

        const posteriorSimulations = Math.max(
          300,
          Math.min(
            1500,
            Math.round((adaptiveSimCount || cfg.MC_SIMULATIONS || 800) * 0.75)
          )
        );

        const posteriorSeed = simpleHash(
          [
            categoryId || 'cat',
            (lastNScores || []).length,
            Math.round((Number.isFinite(averageScore) ? averageScore : 0) * 100),
            Math.round((Number.isFinite(effectiveMCTarget) ? effectiveMCTarget : 0) * 100),
            Math.round(Number.isFinite(effectiveMCDays) ? effectiveMCDays : 0),
            Math.round((Number.isFinite(mssdVolatility) ? mssdVolatility : 0) * 100),
            safeStateSpace ? 'ss1' : 'ss0',
            safeDynamicVolatility ? 'dv1' : 'dv0',
          ].join('|')
        );

        posteriorMc = estimatePosteriorPredictive(posteriorInput, {
          simulations: posteriorSimulations,
          seed: posteriorSeed,
          blendWithBase: !getCoachFeature(
            options,
            'usePosteriorMonteCarloOverride',
            false
          ),
        });

        if (posteriorMc && Number.isFinite(posteriorMc.probability)) {
          finalMcProbability = clamp(posteriorMc.probability, 0, 100);
          finalMcResult = {
            ...mcResult,
            probability: finalMcProbability,
            probabilityRaw: Number(
              (posteriorMc.probabilityRaw ?? finalMcProbability).toFixed(4)
            ),
            mean: Number.isFinite(posteriorMc.mean)
              ? posteriorMc.mean
              : mcResult.mean,
            ci95Low: Number.isFinite(posteriorMc.ciLow)
              ? posteriorMc.ciLow
              : mcResult.ci95Low,
            ci95High: Number.isFinite(posteriorMc.ciHigh)
              ? posteriorMc.ciHigh
              : mcResult.ci95High,
            volatility: Number.isFinite(safeDynamicVolatility?.volatility)
              ? clamp(safeDynamicVolatility.volatility, 0, maxScore)
              : mcResult.volatility,
            posteriorPredictive: posteriorMc,
            baseProbability: baseMcProbability,
          };
        }
      } catch (err) {
        console.warn('[CoachLogic] Posterior predictive Monte Carlo failed:', err);
        posteriorMc = null;
        finalMcResult = mcResult;
        finalMcProbability = baseMcProbability;
      }
    }

    return {
        cfg,
        safeCategory,
        categoryId,
        rollingCalibration,
        referenceDate,
        referenceNow,
        maxScore,
        minScore,
        targetScore,
        targetScoreLabel,
        rawWeight,
        boundedWeight,
        weight,
        weightLabel,
        daysToExam,
        relevantSimulados,
        rootActivityDate,
        simuladosWithMaxScore,
        averageScore,
        stateSpace,
        daysSinceLastStudy,
        recencyUnknown,
        studyLogs: safeStudyLogs,
        categoryStudyLogs,
        validStudyLogs,
        trendHistory,
        lastNScores,
        backtestWeights,
        trend,
        mssdVolatility,
        baseMssdVolatility,
        dynamicVolatility,
        mcAdaptive,
        effectiveMCTarget,
        effectiveMCDays,
        globalBaselinePct,
        effectiveCfg,
        mcResult: finalMcResult,
        mcProbability: finalMcProbability,
        baseMcResult: mcResult,
        baseMcProbability: baseMcProbability,
        posteriorMc,
        mcHasData,
        globalProjectedMean,
        agilityPenalty,
        avgSeconds
    };
};

export const calculateUrgencyScore = (metrics, options = {}) => {
    const {
        cfg,
        safeCategory,
        boundedWeight,
        daysToExam,
        rootActivityDate,
        simuladosWithMaxScore,
        averageScore,
        daysSinceLastStudy,
        recencyUnknown,
        studyLogs,
        categoryStudyLogs,
        validStudyLogs,
        lastNScores,
        backtestWeights,
        trend,
        mssdVolatility,
        mcProbability,
        mcHasData,
        mcResult,
        maxScore,
        globalProjectedMean
    } = metrics;
    const minScore = metrics.minScore ?? 0;
    const domain = Math.max(1e-6, maxScore - minScore);
    const targetScore = metrics.targetScore ?? (minScore + domain * 0.8);
    const hasData = (simuladosWithMaxScore?.length || 0) > 0 || (categoryStudyLogs?.length || 0) > 0;
    // FIX: agilidade não entra mais no forgetting risk
    const forgetting = computeForgettingRisk(
        simuladosWithMaxScore,
        maxScore,
        averageScore,
        mssdVolatility,
        backtestWeights?.effectiveN || simuladosWithMaxScore.length,
        recencyUnknown ? null : daysSinceLastStudy,
        0,
        minScore
    );
    const performanceDeficit = Math.max(0, targetScore - averageScore);
    const gapRange = Math.max(1e-6, targetScore - minScore);
    const gapRatio = clamp(performanceDeficit / gapRange, 0, 1);
    // ✅ FIX: Adicionar validação de retention
    const safeRetention = Number.isFinite(forgetting.retentionPct)
        ? forgetting.retentionPct
        : 100;
    const memoryRisk = !hasData
        ? 8
        : clamp(35 * Math.pow(1 - safeRetention / 100, 1.5), 2, 35);
    const safeMssdVolatility = Number.isFinite(mssdVolatility)
        ? mssdVolatility
        : 0;
    const volatilityRiskPct = clamp((safeMssdVolatility / domain) * 100, 0, 35);
    const weightMultiplier = 1 + ((boundedWeight - 5) / 5) * 0.40;
    const crunchMultiplier = getCrunchMultiplier(
        daysToExam,
        rootActivityDate,
        metrics.referenceDate
    );
    const safeTasksArray = Array.isArray(safeCategory?.tasks)
        ? safeCategory.tasks
        : Object.values(safeCategory?.tasks || {});
    const hasHighPriorityTasks = safeTasksArray.some(t => t && !t.completed && t.priority === 'high');
    const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;
    const totalTasks = safeTasksArray.length;
    const completedTasks = safeTasksArray.filter(t => t?.completed).length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 1.0;
    const inefficiency = Math.max(0, 1 - completionRate);
    let empiricalTrust = 1.0;
    if (!hasData) {
        const globalSignal = computeAdaptiveCoachWeight(metrics.trendHistory || []);
        empiricalTrust = Math.max(0.2, globalSignal?.confidenceWeight ?? 0.2);
    }
    const inefficiencyPenaltyMultiplier = totalTasks >= 5
        ? 1 + (inefficiency * 0.15 * empiricalTrust)
        : 1.0;
    // SCORE: agora mede distância até a meta, não até 100%
    const scoreComponent = clamp(gapRatio * cfg.SCORE_MAX, 0, cfg.SCORE_MAX);
    // RECENCY: recência desconhecida não é mais máxima
    const effectiveRiskDays = recencyUnknown ? 5 : Math.min(daysSinceLastStudy, 45);
    const recencyFactor = 1 - Math.exp(-effectiveRiskDays / 8);
    const recencyRaw =
        cfg.RECENCY_MAX *
        (memoryRisk / 35) *
        recencyFactor *
        crunchMultiplier *
        (backtestWeights?.recencyWeight ?? 1) *
        inefficiencyPenaltyMultiplier;
    const recencyComponent = clamp(recencyRaw, 0, cfg.RECENCY_MAX * 1.2);
    // INSTABILITY: mais justa, baseada em % do domínio e com filtro de ruído
    const lastNCount = Math.max(2, (lastNScores || []).length || 2);
    const trendNoise = 0.75 * (mssdVolatility / Math.sqrt(lastNCount));
    const trendThreshold = Math.max(getDynamicTrendThreshold(averageScore, maxScore), trendNoise);
    let trendModifier = 1;
    if (trend > trendThreshold) {
        trendModifier = 0.55;
    } else if (trend < -trendThreshold) {
        trendModifier = 1.25;
    }
    const instabilityRaw =
        cfg.INSTABILITY_MAX *
        Math.min(1, volatilityRiskPct / 12) *
        trendModifier *
        (backtestWeights?.instabilityWeight ?? 1);
    const instabilityComponent = clamp(instabilityRaw, 0, cfg.INSTABILITY_MAX);
    // MC BOOST
    let mcUrgencyBoost = 0;
    let mcRiskLabel = null;
    const adaptiveRisk = deriveAdaptiveRiskThresholds(
        lastNScores,
        mssdVolatility,
        cfg,
        maxScore,
        mcResult?.predObsPairs || []
    );
    if (globalProjectedMean != null && globalProjectedMean > (averageScore + maxScore * 0.1)) {
        const haloBoost = Math.min(6, (globalProjectedMean - averageScore) * 0.2);
        adaptiveRisk.danger = Math.min(99, adaptiveRisk.danger + haloBoost);
        adaptiveRisk.safe = Math.min(99, adaptiveRisk.safe + haloBoost);
    }
    if (mcHasData && mcProbability !== null) {
        const continuous = computeContinuousMcBoost(
            mcProbability,
            adaptiveRisk.danger,
            adaptiveRisk.safe,
            mssdVolatility,
            maxScore,
            cfg
        );
        mcUrgencyBoost = continuous.boost;
        mcRiskLabel = continuous.riskLabel;
        const globalProbability = options.globalMcStats && Number.isFinite(options.globalMcStats.probability)
            ? options.globalMcStats.probability
            : null;
        if (globalProbability != null && globalProbability < (mcProbability * 0.8)) {
            mcUrgencyBoost += 4;
            mcRiskLabel = mcRiskLabel || 'elevated_global_risk';
        }
    }
    const mcUrgencyBoostClamped = clamp(
        mcUrgencyBoost,
        cfg.MC_BOOST_SAFE_PENALTY ?? -6,
        25
    );
    // Burnout / hours
    const totalMinutes = (categoryStudyLogs || []).reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const totalHours = totalMinutes / 60;
    const sortedLogsForBurnout = [...(categoryStudyLogs || [])].sort((a, b) =>
        (normalizeDate(a.date) || new Date(0)).getTime() - (normalizeDate(b.date) || new Date(0)).getTime()
    );
    const rollingWindowMs = 28 * MS_PER_DAY;
    // ✅ FIX: Verificar se metrics.referenceNow existe antes de usar
    const nowMs = Number.isFinite(metrics.referenceNow) ? metrics.referenceNow : Date.now();
    const recentBaselineLogs = sortedLogsForBurnout.filter(log =>
        (nowMs - (normalizeDate(log.date) || new Date(0)).getTime()) <= rollingWindowMs
    );
    const recentBaselineHours = recentBaselineLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0) / 60;
    const firstLogTime = sortedLogsForBurnout.length > 0
        ? (normalizeDate(sortedLogsForBurnout[0].date) || new Date(nowMs)).getTime()
        : nowMs;
    const recentSpanDays = recentBaselineLogs.length > 0
        ? Math.max(1, (nowMs - (normalizeDate(recentBaselineLogs[0].date) || new Date(nowMs)).getTime()) / MS_PER_DAY)
        : Math.max(1, (nowMs - firstLogTime) / MS_PER_DAY);
    const activeWeeks = Math.max(1, Math.min(4, recentSpanDays / 7));
    const baselineHoursPerWeek = recentBaselineLogs.length > 0 ? (recentBaselineHours / activeWeeks) : 5.0;
    const dynamicBurnoutThreshold = Math.max(15.0, baselineHoursPerWeek * 1.8);
    // Balance bridge boost
    const allCategoriesSafe = options.allCategories || [];
    const activeCount = allCategoriesSafe.length > 0 ? allCategoriesSafe.length : 1;
    // ✅ PATCH-11 & 29: Validação explícita de decayK
    const rawLambda = metrics.mcAdaptive?.decayK;
    const currentLambda = (Number.isFinite(rawLambda) && rawLambda > 1e-6) ? rawLambda : 0.03;
    const dynamicWindowDays = Math.max(7, Math.min(90, Math.round((Math.LN2 / currentLambda) * 2)));
    const windowStart = (normalizeDate(metrics.referenceDate) || new Date()).getTime() - (dynamicWindowDays * MS_PER_DAY);
    const safeGlobalLogsInput = options.studyLogs || studyLogs || [];
    const safeGlobalLogs = Array.isArray(safeGlobalLogsInput)
        ? safeGlobalLogsInput
        : Object.values(safeGlobalLogsInput || {});
    const recentAllLogs = safeGlobalLogs.filter(log =>
        (normalizeDate(log?.date) || new Date(0)).getTime() >= windowStart
    );
    const totalRecentMinutesAll = recentAllLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const totalRecentMinutesCat = recentAllLogs
        .filter(log => log?.categoryId === metrics.categoryId)
        .reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const observedShare = totalRecentMinutesAll > 0
        ? totalRecentMinutesCat / totalRecentMinutesAll
        : (1 / activeCount);
    const totalSyllabusWeight = allCategoriesSafe.reduce((acc, c) => {
        if (!c) return acc;
        let rawW = c.weight;
        if (typeof rawW === 'string') rawW = rawW.replace(/\./g, '').replace(',', '.');
        const parsedW = Number(rawW);
        const w = (c.weight !== undefined && Number.isFinite(parsedW) && parsedW > 0) ? parsedW : 5;
        return acc + w;
    }, 0);
    const idealShare = totalSyllabusWeight > 0
        ? metrics.rawWeight / totalSyllabusWeight
        : (1 / activeCount);
    const tolerance = 0.05;
    const underAllocation = Math.max(0, idealShare - observedShare - tolerance);
    const balanceBridgeBoost = clamp(
        Math.min(cfg.EFFICIENCY_MAX, Math.pow(underAllocation * 10, 1.5)),
        0,
        cfg.EFFICIENCY_MAX
    );
    // SRS
    let srsBoost = 0;
    let srsLabel = null;
    if (hasData && !recencyUnknown) {
        const srsData = _getSRSBoost(
            simuladosWithMaxScore,
            daysSinceLastStudy,
            maxScore,
            cfg,
            mssdVolatility,
            backtestWeights?.effectiveN || simuladosWithMaxScore.length
        );
        srsBoost = srsData.boost;
        srsLabel = srsData.label;
    }
    const maxSrsBoost = cfg.SRS_BOOST * 2;
    const currentSrsBoost = clamp(
        srsBoost * (crunchMultiplier > 1 ? 1.10 : 1),
        0,
        maxSrsBoost
    );
    const currentPriorityBoost = clamp(
        priorityBoost * (crunchMultiplier > 1 ? 1.15 : 1),
        0,
        cfg.PRIORITY_BOOST
    );
    // Rotation penalty corrigida: menos dependente da nota e mais dependente de recência/volatilidade
    let exactLastTime = 0;
    if (simuladosWithMaxScore.length > 0) {
        exactLastTime = (normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt) || new Date(0)).getTime();
    }
    if (validStudyLogs.length > 0) {
        const logsOrdenados = [...validStudyLogs].sort((a, b) =>
            (normalizeDate(b.date) || new Date(0)).getTime() - (normalizeDate(a.date) || new Date(0)).getTime()
        );
        const logTime = (normalizeDate(logsOrdenados[0].date) || new Date(0)).getTime();
        if (logTime > exactLastTime) exactLastTime = logTime;
    }
    const exactHoursSinceLast = exactLastTime > 0
        ? (nowMs - exactLastTime) / (1000 * 60 * 60)
        : 48;
    let rotationPenalty = 0;
    // FIX: Removido fatigueRatio baseado em performance.
    // Notas altas já recebem urgência menor via SCORE_MAX (gap da meta).
    // Penalizar novamente aqui causava dupla penalização.
    if (exactHoursSinceLast < 24) {
        const recentFatigue = Math.max(0.2, Math.exp(-exactHoursSinceLast / 12));
        rotationPenalty = Math.min(30, 15 * recentFatigue * (1 + (mssdVolatility / maxScore)));
        const baseAt24 = mssdVolatility > (maxScore * 0.05) ? 6 : 2;
        rotationPenalty = Math.max(rotationPenalty, baseAt24 + 1);
    } else if (exactHoursSinceLast >= 24 && exactHoursSinceLast < 48 && !srsLabel) {
        rotationPenalty = mssdVolatility > (maxScore * 0.05) ? 6 : 2;
    }
    if (srsBoost > 0) rotationPenalty *= 0.1;
    const rawScore = Math.max(
        0,
        scoreComponent +
        recencyComponent +
        instabilityComponent +
        currentPriorityBoost +
        currentSrsBoost +
        mcUrgencyBoostClamped +
        balanceBridgeBoost -
        rotationPenalty
    );
    const weightedRaw = rawScore * weightMultiplier;
    const NORMALIZATION_CEILING = cfg.NORMALIZATION_CEILING || 170;
    const CRITICAL_THRESHOLD = cfg.CRITICAL_THRESHOLD || Math.round(NORMALIZATION_CEILING * 0.72);
    let normalized;
    if (weightedRaw <= 0) {
        normalized = 0;
    } else if (weightedRaw <= CRITICAL_THRESHOLD) {
        normalized = (weightedRaw / CRITICAL_THRESHOLD) * 80;
    } else {
        const excess = weightedRaw - CRITICAL_THRESHOLD;
        const excessNormalized = 20 * (1 - Math.exp(-excess / (NORMALIZATION_CEILING * 0.4)));
        normalized = 80 + excessNormalized;
    }
    normalized = Number.isFinite(normalized) ? clamp(Math.round(normalized), 0, 100) : 0;
    return {
        weightedRaw,
        normalized,
        scoreComponent,
        recencyComponent,
        instabilityComponent,
        priorityBoost: currentPriorityBoost,
        srsBoost: currentSrsBoost,
        mcUrgencyBoost: mcUrgencyBoostClamped,
        balanceBridgeBoost,
        rotationPenalty,
        weightMultiplier,
        crunchMultiplier,
        forgetting,
        performanceDeficit,
        memoryRisk,
        volatilityRisk: volatilityRiskPct,
        totalPain: performanceDeficit + memoryRisk + volatilityRiskPct,
        dynamicScoreMax: cfg.SCORE_MAX,
        dynamicRecencyMax: cfg.RECENCY_MAX,
        dynamicInstabilityMax: cfg.INSTABILITY_MAX,
        completionRate,
        inefficiencyPenaltyMultiplier,
        totalHours,
        baselineHoursPerWeek,
        dynamicBurnoutThreshold,
        observedShare,
        idealShare,
        srsLabel,
        exactHoursSinceLast,
        adaptiveRisk,
        mcRiskLabel,
        hasHighPriorityTasks,
        trendThreshold
    };
};

export const generateCoachStrings = (weightedRaw, normalized, metrics, scoreInfo, options = {}) => {
    const {
        cfg,
        maxScore,
        targetScore,
        weight,
        weightLabel,
        relevantSimulados,
        averageScore,
        daysSinceLastStudy,
        categoryStudyLogs,
        trend,
        mssdVolatility,
        effectiveMCTarget,
        effectiveMCDays,
        mcResult,
        mcProbability,
        mcHasData,
        globalProjectedMean,
        agilityPenalty
    } = metrics;
    const minScore = metrics.minScore ?? options.minScore ?? 0;
    const domain = Math.max(1e-6, (maxScore || options.maxScore || 100) - minScore);
    // FIX: globalProjectedMean está em PONTOS da prova — normalizar para
    // a escala 0–100 antes de formatar como %. Provas com maxScore ≠ 100
    // exibiam "Contexto Global MC: 742%".
    const globalProjectedPct = globalProjectedMean != null
        ? ((globalProjectedMean - minScore) / domain) * 100
        : null;
    const {
        scoreComponent,
        recencyComponent,
        instabilityComponent,
        priorityBoost,
        srsBoost,
        mcUrgencyBoost,
        balanceBridgeBoost,
        rotationPenalty,
        weightMultiplier,
        crunchMultiplier,
        totalHours,
        baselineHoursPerWeek,
        dynamicBurnoutThreshold,
        srsLabel,
        adaptiveRisk,
        mcRiskLabel,
        hasHighPriorityTasks,
        completionRate,
        trendThreshold: scoreInfoTrendThreshold
    } = scoreInfo;
    let recommendation = "";
    const oneWeekAgo = (normalizeDate(metrics.referenceDate) || new Date()).getTime() - (7 * 24 * 60 * 60 * 1000);
    const recentLogs = categoryStudyLogs.filter(log => {
        const d = normalizeDate(log.date) || new Date(0);
        return d && d.getTime() >= oneWeekAgo;
    });
    const recentHours = recentLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0) / 60;
    // FIX: contar dias reais, não timestamps únicos
    const recentStudyDays = new Set(
        recentLogs.map(log => getDateKey(log.date)).filter(Boolean)
    ).size;
    const isHighVolume = recentHours > dynamicBurnoutThreshold;
    const isHighFrequency = recentStudyDays >= 5;
    const isEliteMaintenance = averageScore >= (maxScore * 0.95);
    const trendThreshold = Number.isFinite(scoreInfoTrendThreshold)
        ? scoreInfoTrendThreshold
        : getDynamicTrendThreshold(averageScore, maxScore);
    const lastNScores = metrics.lastNScores;
    const isStagnant = !isEliteMaintenance && trend <= trendThreshold && lastNScores.length >= 2;
    const burnoutMsg = isHighVolume && isStagnant
        ? `Você estudou ${recentHours.toFixed(1)}h esta semana (seu normal é ~${baselineHoursPerWeek.toFixed(1)}h), mas a nota estagnou.`
        : '';
    const isBurnoutRisk = (isHighVolume || (isHighFrequency && recentHours > 5.0)) && isStagnant && recentStudyDays >= 3;
    // Ordem corrigida: crítico > burnout > SRS > cruzeiro seguro
    if (mcHasData && mcRiskLabel === 'critical') {
        const burnoutNote = isBurnoutRisk ? ` (⚠️ ${burnoutMsg || 'Sinais de estafa — mude o método.'})` : '';
        const targetInfo = effectiveMCTarget < targetScore ? ` (Meta ZDP: ${formatValue(effectiveMCTarget)})` : '';
        const globalNote = globalProjectedPct != null ? ` [Global: ${formatPercent(globalProjectedPct)}]` : '';
        recommendation = `🎯 Projeção Crítica: ${Math.round(mcProbability)}% de chance. Risco Crítico.${targetInfo}${globalNote}${burnoutNote}`;
    } else if (isBurnoutRisk) {
        recommendation = `🛑 Risco de Estafa: ${burnoutMsg || 'Você estudou muito mas a nota não reagiu.'} Considere descansar.`;
    } else if (srsBoost > 0) {
        recommendation = `${srsLabel} - Não pule essa revisão!`;
    } else if (mcHasData && mcRiskLabel === 'safe') {
        recommendation = `🏆 Cruzeiro Seguro (${formatPercent(mcProbability)} nas projeções). Modo de manutenção ativado.`;
    } else if (mssdVolatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && trend > 0) {
        recommendation = "Desempenho Oscilante: Foque em preencher lacunas de base";
    } else if (trend < -trendThreshold) {
        recommendation = `Nota caindo (${formatValue(trend)} pts) - Atenção urgente`;
    } else if (averageScore < targetScore - (0.2 * domain)) {
        recommendation = `Nota Crítica: ${formatPercent(((averageScore - minScore) / domain) * 100)} (Meta ${formatPercent(((targetScore - minScore) / domain) * 100)})`;
    } else if (averageScore >= targetScore) {
        recommendation = "No caminho certo! Continue consolidando";
    } else {
        recommendation = "Pratique com regularidade";
    }
    const hasData = relevantSimulados.length > 0 || categoryStudyLogs.length > 0;
    const result = {
        score: weightedRaw,
        normalizedScore: normalized,
        recommendation,
        details: {
            averageScore: safeFixedNumber(averageScore),
            globalProjectedMean: globalProjectedMean != null ? safeFixedNumber(globalProjectedMean, 1) : null,
            daysSinceLastStudy,
            standardDeviation: safeFixedNumber(mssdVolatility),
            mssdVolatility: safeFixedNumber(mssdVolatility),
            posteriorMonteCarlo: metrics.posteriorMc
              ? {
                  model: metrics.posteriorMc.model || null,
                  probability: safeFixedNumber(metrics.posteriorMc.probability),
                  probabilityRaw: safeFixedNumber(metrics.posteriorMc.probabilityRaw),
                  mean: safeFixedNumber(metrics.posteriorMc.mean),
                  ciLow: safeFixedNumber(metrics.posteriorMc.ciLow),
                  ciHigh: safeFixedNumber(metrics.posteriorMc.ciHigh),
                  horizonDays: safeFixedNumber(metrics.posteriorMc.horizonDays),
                  simulations: metrics.posteriorMc.simulations ?? null,
                  sampleTrust: safeFixedNumber(metrics.posteriorMc.sampleTrust, 4),
                  diagnostics: metrics.posteriorMc.diagnostics || null,
                  inputs: metrics.posteriorMc.inputs || null,
                }
              : null,
            dynamicVolatility: metrics.dynamicVolatility && Number.isFinite(metrics.dynamicVolatility.volatility)
              ? {
                  model: metrics.dynamicVolatility.model || null,
                  volatility: safeFixedNumber(metrics.dynamicVolatility.volatility),
                  modelVolatility: safeFixedNumber(metrics.dynamicVolatility.modelVolatility),
                  fallbackVolatility: safeFixedNumber(metrics.dynamicVolatility.fallbackVolatility),
                  dailyVolatility: safeFixedNumber(metrics.dynamicVolatility.dailyVolatility),
                  horizonDays: safeFixedNumber(metrics.dynamicVolatility.horizonDays),
                  medianGapDays: safeFixedNumber(metrics.dynamicVolatility.medianGapDays),
                  sampleSize: metrics.dynamicVolatility.sampleSize ?? null,
                  parameters: metrics.dynamicVolatility.parameters || null
                }
              : null,
            trend: safeFixedNumber(trend),
            totalHours: safeFixedNumber(totalHours),
            hasData,
            hasSimulados: relevantSimulados.length > 0,
            hasHighPriorityTasks,
            completionRate: safeFixedNumber(completionRate * 100, 1),
            efficiencyBridgeBoost: 0,
            balanceBridgeBoost: safeFixedNumber(balanceBridgeBoost),
            weight,
            srsLabel,
            isBurnoutRisk,
            crunchMultiplier: safeFixedNumber(crunchMultiplier),
            agilityPenalty: safeFixedNumber(agilityPenalty, 4),
            avgSeconds: metrics.avgSeconds || 0,
            monteCarlo: mcHasData ? {
                probability: safeFixedNumber(mcProbability),
                probabilityRaw: mcProbability,
                thresholds: {
                    danger: safeFixedNumber(adaptiveRisk?.danger),
                    safe: safeFixedNumber(adaptiveRisk?.safe)
                },
                riskLabel: mcRiskLabel,
                volatility: safeFixedNumber(mcResult?.volatility),
                meanProjected: safeFixedNumber(mcResult?.mean),
                effectiveMCTarget: safeFixedNumber(effectiveMCTarget),
                effectiveMCDays: Number.isFinite(Number(effectiveMCDays)) ? Number(effectiveMCDays) : 0,
                globalProjectedMean: globalProjectedMean != null ? safeFixedNumber(globalProjectedMean, 1) : null,
                diagnostics: mcResult?.diagnostics || null,
                ci95Low: safeFixedNumber(mcResult?.ci95Low),
                ci95High: safeFixedNumber(mcResult?.ci95High),
                urgencyBoost: safeFixedNumber(mcUrgencyBoost),
                calibrationPenalty: safeFixedNumber(mcResult?.calibrationPenalty, 4),
                avgBrier: safeFixedNumber(mcResult?.avgBrier, 4),
                ece: safeFixedNumber(mcResult?.ece, 4),
                reliability: Array.isArray(mcResult?.reliability) ? mcResult.reliability : [],
                explainability: {
                    confidenceAdjusted: (mcResult?.calibrationPenalty || 0) > 0,
                    confidenceAdjustmentPct: safeFixedNumber((mcResult?.calibrationPenalty || 0) * 100),
                    calibrationQuality: (mcResult?.avgBrier || 0) <= cfg.MC_CALIBRATION_BRIER_BASELINE
                        ? 'good'
                        : (mcResult?.avgBrier || 0) <= (cfg.MC_CALIBRATION_BRIER_BASELINE + 0.07) ? 'moderate' : 'low',
                    note: (mcResult?.calibrationPenalty || 0) > 0
                        ? 'Probabilidade ajustada para reduzir overconfidence após backtest interno.'
                        : 'Sem ajuste de calibração significativo.'
                }
            } : null,
            backtest: {
                rankQuality: safeFixedNumber(metrics.backtestWeights?.rankQuality, 4),
                uplift: safeFixedNumber(metrics.backtestWeights?.uplift, 4),
                scoreWeight: safeFixedNumber(metrics.backtestWeights?.scoreWeight, 3),
                recencyWeight: safeFixedNumber(metrics.backtestWeights?.recencyWeight, 3),
                instabilityWeight: safeFixedNumber(metrics.backtestWeights?.instabilityWeight, 3)
            },
            humanReadable: {
                "Média": formatPercent(((averageScore - minScore) / domain) * 100),
                "Recência": daysSinceLastStudy === 0 ? "Hoje" : `${daysSinceLastStudy} dias`,
                "Tendência": trend > 0.5 ? `↑ +${formatValue(trend)}` : trend < -0.5 ? `↓ ${formatValue(trend)}` : "→ Estável",
                "Instabilidade": `±${formatValue(mssdVolatility)} pts`,
                "Probabilidade (MC)": mcHasData ? formatPercent(mcProbability) : "Dados insuf.",
                "Contexto Global MC": globalProjectedPct != null ? formatPercent(globalProjectedPct) : null,
                "Peso da Matéria": weightLabel,
                "Status": srsLabel || (normalized > 70 ? "🔥 Urgente" : normalized > 50 ? "⚡ Médio" : "✓ Estável")
            },
            components: {
                scoreComponent: Number((scoreComponent * weightMultiplier).toFixed(2)),
                recencyComponent: Number((recencyComponent * weightMultiplier).toFixed(2)),
                instabilityComponent: Number((instabilityComponent * weightMultiplier).toFixed(2)),
                priorityBoost: Number((priorityBoost * weightMultiplier).toFixed(2)),
                srsBoost: Number((srsBoost * weightMultiplier).toFixed(2)),
                rotationPenalty: Number((rotationPenalty * weightMultiplier).toFixed(2)),
                mcUrgencyBoost: Number((mcUrgencyBoost * weightMultiplier).toFixed(2)),
                balanceBridgeBoost: Number((balanceBridgeBoost * weightMultiplier).toFixed(2)),
            }
        }
    };
    // FIX: try/catch para o callback de calibração nunca quebrar o fluxo
    // ✅ FIX: Verificar se options.onCalibrationMetric é função antes de chamar e options é válido
    if (result.details?.monteCarlo && options && typeof options.onCalibrationMetric === 'function') {
        try {
            options.onCalibrationMetric({
                categoryId: metrics.categoryId || null,
                categoryName: metrics.safeCategory?.name || metrics.categoryName || 'Disciplina',
                timestamp: Date.now(),
                avgBrier: result.details.monteCarlo.avgBrier,
                ece: result.details.monteCarlo.ece,
                probability: result.details.monteCarlo.probability != null ? result.details.monteCarlo.probability / 100 : null,
                calibrationPenalty: result.details.monteCarlo.calibrationPenalty,
                reliability: result.details.monteCarlo.reliability || [],
                calibrationQuality: result.details.monteCarlo.explainability?.calibrationQuality || 'low'
            });
        } catch { /* não quebrar o fluxo principal */ }
    }
    return result;
};

export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
    try {
        const safeCat = category || {};
        const catId = safeCat.id || safeCat.name || 'unknown';
        const safeSims = Array.isArray(simulados) ? [...simulados] : Object.values(simulados || {});
        const safeLogs = Array.isArray(studyLogs) ? [...studyLogs] : Object.values(studyLogs || {});
        const safeTasks = Array.isArray(safeCat.tasks) ? safeCat.tasks : Object.values(safeCat.tasks || {});
        const simCount = safeSims.length;
        const logCount = safeLogs.length;
        const todayStr = getDateKey(new Date());
        const refDateStr = options.now ? (getDateKey(options.now) || todayStr) : todayStr;
        const simsForChecksum = [...safeSims].sort((a, b) => {
            const timeA = (normalizeDate(a?.date || a?.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b?.date || b?.createdAt) || new Date(0)).getTime();
            return timeA - timeB;
        });
        const catMax = Number.isFinite(Number(safeCat.maxScore)) && Number(safeCat.maxScore) > 0
            ? Number(safeCat.maxScore)
            : (Number(options?.maxScore) || 100);
        const catMin = Number.isFinite(Number(safeCat.minScore))
            ? Math.min(Number(safeCat.minScore), catMax)
            : (Number(options?.minScore) || 0);
        const scoreChecksum = simsForChecksum.reduce((acc, s, index) => {
            if (!s) return acc;
            const parsed = getSafeScore(s, catMax, catMin);
            const validVal = Number.isNaN(parsed) ? 0 : parsed;
            return acc + (validVal * (index + 1) * 1.17);
        }, 0).toFixed(2);
        const optKey = (options?.daysToExam != null && Number.isFinite(Number(options.daysToExam))) ? `_dte${options.daysToExam}` : '';
        const targetKey = `_ts${options?.targetScore ?? 'def'}_ms${catMax}_min${catMin}`;
        const logsForChecksum = [...safeLogs].sort((a, b) => {
            const timeA = (normalizeDate(a?.date || a?.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b?.date || b?.createdAt) || new Date(0)).getTime();
            return timeA - timeB;
        });
        const lastSim = simsForChecksum.length > 0
            ? (simsForChecksum[simsForChecksum.length - 1]?.date || simsForChecksum[simsForChecksum.length - 1]?.createdAt || '')
            : '';
        const lastLog = logsForChecksum.length > 0
            ? (logsForChecksum[logsForChecksum.length - 1]?.date || logsForChecksum[logsForChecksum.length - 1]?.createdAt || '')
            : '';
        const tasksHash = safeTasks.reduce((acc, t) => acc + (t?.completed ? 0 : 1) + (t?.priority === 'high' ? 5 : 0), 0);
        // FIX: a soma de minutos impacta a urgência (balance bridge,
        // burnout/dynamicBurnoutThreshold, totalHours). Antes, editar a
        // duração de um log existente não invalidava o cache — só
        // logCount e o timestamp do último log eram observados.
        const logsMinutesChecksum = safeLogs
            .reduce((acc, l) => acc + sanitizeMinutes(l?.minutes), 0)
            .toFixed(0);
        const activeId = useAppStore.getState()?.appState?.activeId || 'default';
        const weightsHash = simpleHash(
            (options.allCategories || [])
                .map(c => `${c?.id || c?.name || '?'}:${c?.weight ?? ''}`)
                .join('|')
        );
        const globalHash = options.globalMcStats
            ? simpleHash(
                `${Number(options.globalMcStats.projectedMean || 0).toFixed(1)}:${Number(options.globalMcStats.probability || 0).toFixed(1)}:${Number(options.globalMcStats.currentMean || 0).toFixed(1)}`
            )
            : 'noglobal';
        const calibrationHash = (options.calibrationHistoryByCategory?.[getCalibrationKey(catId)] || []).length;
        const goalKey = options?.user?.goalDate
            ? `_gd${getDateKey(options.user.goalDate) || String(options.user.goalDate)}`
            : '';
        const featuresHash = simpleHash(JSON.stringify({
            uss: getCoachFeature(options, 'useStateSpace', false),
            ussa: getCoachFeature(options, 'useStateSpaceAverage', false),
            usst: getCoachFeature(options, 'useStateSpaceTrend', false),
            udv: getCoachFeature(options, 'useDynamicVolatility', false),
            ugv: getCoachFeature(options, 'useGarchVolatility', false),
            udvo: getCoachFeature(options, 'useDynamicVolatilityOverride', false),
            ppm: getCoachFeature(options, 'usePosteriorMonteCarlo', false),
            ppmo: getCoachFeature(options, 'usePosteriorMonteCarloOverride', false),
            bt: getCoachFeature(options, 'useBayesianTopics', false),
            btu: getCoachFeature(options, 'useBayesianTopicsForUrgency', false),
            du: getCoachFeature(options, 'useDecisionUtility', false),
            dut: getCoachFeature(options, 'useDecisionUtilityForTopics', false),
            dubt: getCoachFeature(options, 'useDecisionUtilityForBestTask', false),
            bp: getCoachFeature(options, 'useBanditPlanner', false),
            llm: getCoachFeature(options, 'useLLMExplanations', false),
            kg: getCoachFeature(options, 'useKnowledgeGraph', false),
            kgt: getCoachFeature(options, 'useKnowledgeGraphForTopics', false),
            afsrs: getCoachFeature(options, 'useAdvancedFsrs', false),
            fsrsb: getCoachFeature(options, 'useFsrsForSrsBoost', false),
            fsrst: getCoachFeature(options, 'useFsrsTopicScheduling', false),
            eval: getCoachFeature(options, 'useEvaluationTelemetry', false),
            obs: getCoachFeature(options, 'useObservability', false),
            drift: getCoachFeature(options, 'useDriftGuard', false),
            health: getCoachFeature(options, 'useModelHealthTelemetry', false),
            driftAlerts: getCoachFeature(options, 'useDriftAlerts', false),
        }));
        // ✅ PATCH-13: Incluir hash da config customizada no cache key
        const configHash = options.config
            ? simpleHash(JSON.stringify(options.config))
            : 'defcfg';
        // FIX (BUG-13): cache key compacta via hashString64 (evita chave de 400+ chars e colisões)
        const cacheKeyRaw = JSON.stringify([
            activeId, catId, simCount, logCount, scoreChecksum,
            refDateStr, optKey, targetKey, lastSim, lastLog,
            tasksHash, logsMinutesChecksum, weightsHash, globalHash, calibrationHash,
            goalKey, featuresHash, configHash,
            options.maxScore ?? 100, options.targetScore ?? 0
        ]);
        const cacheKey = `urg_${hashString64(cacheKeyRaw)}`;
        const cachedUrgency = cacheGet(_urgencyCache, cacheKey);
        if (cachedUrgency) {
            // ✅ FIX: Validar que o cache não está stale verificando se a categoria ainda existe
            const categoryStillExists = options.allCategories
                ? options.allCategories.some(c => c && (c.id === catId || c.name === catId))
                : true;
            if (!categoryStillExists) {
                _urgencyCache.delete(cacheKey);
            } else {
                return deepClone(cachedUrgency);
            }
        }
        const metrics = extractMetrics(safeCat, safeSims, safeLogs, options);
        const scoreInfo = calculateUrgencyScore(metrics, options);
        const result = generateCoachStrings(scoreInfo.weightedRaw, scoreInfo.normalized, metrics, scoreInfo, options);
        // ==================== LOTE 8: EVALUATION SNAPSHOT ====================
        if (
          getCoachFeature(options, 'useEvaluationTelemetry', false) &&
          typeof options.onCoachEvaluationSnapshot === 'function'
        ) {
          try {
            options.onCoachEvaluationSnapshot({
              timestamp: Date.now(),
              categoryId: metrics.categoryId || null,
              categoryName: metrics.safeCategory?.name || null,
              normalizedScore: result.normalizedScore,
              probability: result.details?.monteCarlo?.probability ?? null,
              predictedMean:
                result.details?.monteCarlo?.meanProjected ??
                result.details?.averageScore ??
                null,
              targetScore: metrics.targetScore,
              maxScore: metrics.maxScore,
              strategyId: options.strategyId || null,
            });
          } catch {
            // ignore evaluation errors
          }
        }
        // ==================== LOTE 9: OBSERVABILITY SNAPSHOT ====================
        if (
          getCoachFeature(options, 'useObservability', false) &&
          typeof options.onCoachObservability === 'function'
        ) {
          try {
            const mcDetails = result.details?.monteCarlo || null;
            options.onCoachObservability({
              timestamp: Date.now(),
              categoryId: metrics.categoryId || null,
              categoryName: metrics.safeCategory?.name || null,
              normalizedScore: result.normalizedScore,
              probability: mcDetails?.probability ?? null,
              probabilityRaw: mcDetails?.probabilityRaw ?? null,
              avgBrier: mcDetails?.avgBrier ?? null,
              ece: mcDetails?.ece ?? null,
              calibrationPenalty: mcDetails?.calibrationPenalty ?? null,
              volatility: mcDetails?.volatility ?? result.details?.mssdVolatility ?? null,
              sampleSize: mcDetails?.sampleSize ?? null,
              reliability: Array.isArray(mcDetails?.reliability)
                ? mcDetails.reliability
                : [],
            });
          } catch {
            // observability must never break the Coach
          }
        }
        // ✅ FIX: Verificar se options.logger é função antes de chamar e options é válido
        if (options && typeof options.logger === 'function') {
            try {
                options.logger({ categoryId: metrics.categoryId, name: metrics.safeCategory?.name, urgency: result });
            } catch {
                // ignore
            }
        }
        cacheSet(_urgencyCache, URGENCY_CACHE_MAX, cacheKey, deepClone(result));
        return result;
    } catch (err) {
        console.error("[CoachLogic] Critical error in calculateUrgency:", err);
        return {
            score: 0,
            normalizedScore: 0,
            recommendation: "Erro no cálculo",
            details: {
                hasData: false,
                daysSinceLastStudy: 0,
                error: true,
                monteCarlo: null,
                humanReadable: { "Status": "Erro" }
            }
        };
    }
};

export function analisarDesempenhoHistorico(historico) {
    if (!historico || historico.length === 0) {
        return {
            tendencia: 'neutra',
            confiabilidadeDosDados: 'insuficiente',
            projecaoRetencao: 0
        };
    }
    const formattedHistory = historico.map((h, i) => {
        if (!h) return { score: 0, total: 100, date: new Date().toISOString() };
        let rawDias = h.diasRevisao;
        if (typeof rawDias === 'string') rawDias = rawDias.replace(',', '.');
        const diasValidos = (rawDias === null || rawDias === undefined || rawDias === '')
            ? i
            : (Number.isFinite(Number(rawDias)) ? Number(rawDias) : i);
        const timestamp = Date.now() - (diasValidos * 86400000);
        const safeDate = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
        const total = Math.max(1, Number(h.total) || 100);
        const acertos = Math.max(0, Number(h.acertos) || 0);
        return {
            score: (acertos / total) * 100,
            total: total,
            date: safeDate.toISOString()
        };
    });
    const risk = computeForgettingRisk(formattedHistory);
    // ✅ PATCH-33: Validar retentionPct contra NaN
    const safeRetention = Number.isFinite(risk.retentionPct) ? risk.retentionPct : 0;
    return {
        tendencia: safeRetention > 80 ? 'alta' : (safeRetention > 50 ? 'estável' : 'baixa'),
        confiabilidadeDosDados: historico.length > 5 ? 'alta' : 'média',
        projecaoRetencao: safeRetention
    };
}

export const getSuggestedFocus = (categories, simulados, studyLogs = [], options = {}) => {
    if (!categories || (Array.isArray(categories) && categories.length === 0)) return null;
    const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});
    if (safeCategories.length === 0) return null;
    const ranked = safeCategories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, { ...options, allCategories: safeCategories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency?.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency?.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        if (valA !== valB) return valB - valA;
        return String(a.id || '').localeCompare(String(b.id || ''));
    });
    const top = ranked[0];
    if (!top) return null;
    const maxScore = options.maxScore ?? 100;
    // FIX (BUG-14): deepClone robusto do urgency para evitar mutação do cache
    const clonedUrgency = top.urgency ? deepClone(top.urgency) : null;
    const result = {
        ...top,
        urgency: clonedUrgency,
        weakestTopic: getWeakestTopic(top, simulados, maxScore) || null
    };
    // ✅ FIX: Verificar se options.flashcardDue é número antes de comparar
    if (options && Number.isFinite(Number(options.flashcardDue)) && Number(options.flashcardDue) > 0) {
        result.flashcardDue = Number(options.flashcardDue);
        result.srsRecommendation = `Revisar ${Number(options.flashcardDue)} flashcards hoje para reforçar retenção e consistência.`;
        if (result.urgency) {
            result.urgency.srsDue = Number(options.flashcardDue);
        }
    }
    // ✅ FIX: Verificar se options.globalMcStats existe antes de acessar
    if (options && options.globalMcStats && Number.isFinite(options.globalMcStats.projectedMean)) {
        const globalMean = Number(options.globalMcStats.projectedMean);
        if (result.urgency && result.urgency.details) {
            result.urgency.details.globalMcContext = {
                projectedMean: Number(globalMean.toFixed(1)),
                volatility: options.globalMcStats.sd ? Number(options.globalMcStats.sd.toFixed(2)) : null,
                source: 'global from useMonteCarloStats (Coach integration)'
            };
        }
        result.globalProjectedMean = Number(globalMean.toFixed(1));
        result.mcIntegrationSource = 'globalMcStats';
    }
    return result;
};

function _buildSortedTopics(category, simulados = [], maxScore = 100) {
    const safeCat = category || {};
    const catId = safeCat.id || safeCat.name || 'unknown';
    const catMax = Number.isFinite(Number(safeCat.maxScore)) && Number(safeCat.maxScore) > 0
        ? Number(safeCat.maxScore)
        : (Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100);
    const catMin = Number.isFinite(Number(safeCat.minScore))
        ? Math.min(Number(safeCat.minScore), catMax)
        : 0;
    const safeTasks = Array.isArray(safeCat.tasks)
        ? safeCat.tasks
        : Object.values(safeCat.tasks || {});
    const openTasks = safeTasks.filter(t => t && !t.completed).length;
    const safeSims = Array.isArray(simulados)
        ? simulados
        : Object.values(simulados || {});
    let lastSimTimestamp = 0;
    let historyVolume = 0;
    if (safeSims.length > 0) {
        const lastSim = safeSims.reduce((latest, current) => {
            if (!latest) return current;
            if (!current) return latest;
            const latestTime = (normalizeDate(latest.date || latest.createdAt) || new Date(0)).getTime();
            const currTime = (normalizeDate(current.date || current.createdAt) || new Date(0)).getTime();
            return currTime > latestTime ? current : latest;
        }, safeSims[0]);
        if (lastSim) {
            lastSimTimestamp = (normalizeDate(lastSim.date || lastSim.createdAt) || new Date(0)).getTime();
        }
        historyVolume = safeSims.length;
    }
    const scoreChecksum = safeSims.reduce((acc, s, index) => {
        if (!s) return acc;
        const parsed = getSafeScore(s, catMax, catMin);
        const validVal = Number.isNaN(parsed) ? 0 : parsed;
        return acc + (validVal * (index + 1) * 1.17);
    }, 0);
    const tasksHash = safeTasks.reduce((acc, t) => acc + ((t?.id || t?.text || '').length), 0);
    const historyLen = (safeCat.simuladoStats && safeCat.simuladoStats.history)
        ? (Array.isArray(safeCat.simuladoStats.history) ? safeCat.simuladoStats.history.length : Object.keys(safeCat.simuladoStats.history).length)
        : 0;



    const userId = safeCat?.userId || safeSims[0]?.userId || 'default';
    const coachFeatureHash = simpleHash(JSON.stringify({
        bt: getCoachFeature(null, 'useBayesianTopics', false),
        btu: getCoachFeature(null, 'useBayesianTopicsForUrgency', false),
        du: getCoachFeature(null, 'useDecisionUtility', false),
        dut: getCoachFeature(null, 'useDecisionUtilityForTopics', false),
        dubt: getCoachFeature(null, 'useDecisionUtilityForBestTask', false),
        bp: getCoachFeature(null, 'useBanditPlanner', false),
        kg: getCoachFeature(null, 'useKnowledgeGraph', false),
        kgt: getCoachFeature(null, 'useKnowledgeGraphForTopics', false),
        afsrs: getCoachFeature(null, 'useAdvancedFsrs', false),
        fsrsb: getCoachFeature(null, 'useFsrsForSrsBoost', false),
        fsrst: getCoachFeature(null, 'useFsrsTopicScheduling', false),
    }));
    const hash = `${userId}-${lastSimTimestamp}-${openTasks}-${tasksHash}-${historyLen}-${catMax}-${catMin}-${historyVolume}-${scoreChecksum.toFixed(1)}-${coachFeatureHash}`;
    const activeId = useAppStore.getState()?.appState?.activeId || 'default';
    const cacheKey = `isolate_${activeId}_${catId}_${hash}`;
    const cachedTopics = cacheGet(_topicsCache, cacheKey);
    if (cachedTopics) return deepClone(cachedTopics);
    const result = _buildSortedTopicsImpl(safeCat, safeSims, catMax, catMin);
    cacheSet(_topicsCache, TOPICS_CACHE_MAX, cacheKey, deepClone(result));
    return deepClone(result);
}

const _buildSortedTopicsImpl = (category, _simulados = [], maxScore = 100, minScore = 0) => {
    const safeCat = category || {};
    const catMax = Number.isFinite(Number(safeCat.maxScore)) && Number(safeCat.maxScore) > 0
        ? Number(safeCat.maxScore)
        : (Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100);
    const catMin = Number.isFinite(Number(safeCat.minScore))
        ? Math.min(Number(safeCat.minScore), catMax)
        : (Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), catMax) : 0);
    const catRange = Math.max(1e-9, catMax - catMin);
    const tasks = Array.isArray(safeCat.tasks) ? safeCat.tasks : Object.values(safeCat.tasks || {});
    const topicMap = {};
    const history = safeArray(safeCat.simuladoStats?.history);
    const todayForTopics = new Date();
    const historyWithTime = history.map(h => {
        const time = (normalizeDate(h?.date || h?.createdAt) || new Date(0)).getTime();
        return { entry: h, time: Number.isFinite(time) ? time : 0 };
    }).sort((a, b) => a.time - b.time);
    const sortedTopicsHistory = historyWithTime.map(item => item.entry);
    sortedTopicsHistory.forEach(entry => {
        if (!entry) return;
        let entryTime = todayForTopics.getTime();
        if (entry.date || entry.createdAt) {
            entryTime = (normalizeDate(entry.date || entry.createdAt) || new Date(0)).getTime();
        }
        const safeEntryTime = Number.isFinite(entryTime) && entryTime > 0 ? entryTime : todayForTopics.getTime();
        const entryDate = normalizeDate(safeEntryTime) || new Date(safeEntryTime);
        const daysOld = Math.max(0, (todayForTopics.getTime() - safeEntryTime) / (1000 * 60 * 60 * 24));
        const timeWeight = Math.max(0.01, Math.exp(-0.015 * daysOld));
        const topics = entry.topics || [];
        topics.forEach(t => {
            if (!t) return;
            let rawName = t.name;
            if (typeof rawName !== 'string' || !rawName) rawName = "Tópico Desconhecido";
            const name = rawName.trim();
            if (!topicMap[name]) {
                topicMap[name] = {
                    total: 0,
                    correct: 0,
                    lastSeen: new Date(0),
                    completed: true,
                    hasTasks: false,
                    scores: []
                };
                topicMap[name].hasUnfinishedTask = false;
            }
            let rawTotal = Number(t.total);
            let topicTotal = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : 0;
            let topicCorrect = 0;
            const isTotalMissing = t.total === undefined || t.total === null || String(t.total).trim() === "" || Number(t.total) === 0;
            if (t.score != null && isTotalMissing) {
                topicTotal = getSyntheticTotal(catMax);
                topicCorrect = ((getSafeScore(t, catMax, catMin) - catMin) / catRange) * topicTotal;
            } else if (topicTotal > 0) {
                if (t.correct !== undefined && t.correct !== null && !t.isPercentage) {
                    const rawC = sanitizeNum(t.correct);
                    topicCorrect = Math.min(topicTotal, Number.isFinite(rawC) ? rawC : 0);
                } else {
                    topicCorrect = ((getSafeScore(t, catMax, catMin) - catMin) / catRange) * topicTotal;
                }
            } else {
                return;
            }
            if (Number.isNaN(topicCorrect)) return;
            topicCorrect = Math.max(0, topicCorrect);
            topicMap[name].total += (topicTotal * timeWeight);
            topicMap[name].correct += (topicCorrect * timeWeight);
            if (topicTotal > 0) {
                topicMap[name].scores.push({
                    score: (topicCorrect / topicTotal) * 100,
                    total: topicTotal,
                    date: entryDate.toISOString(),
                    // ✅ FIX (BUG-H05): Preservar maxScore no payload para FSRS
                    maxScore: catMax
                });
                // ✅ PATCH-28: Limitar crescimento do array interno
                if (topicMap[name].scores.length > 20) {
                    topicMap[name].scores = topicMap[name].scores.slice(-10);
                }
            }
            if (entryDate > topicMap[name].lastSeen) {
                topicMap[name].lastSeen = entryDate;
            }
        });
    });
    tasks.forEach(task => {
        const name = String(task.topicName || task.topic || '').trim()
          || String(task.text || task.title || "").trim();
        if (!name) return;
        if (!topicMap[name]) {
            topicMap[name] = {
                total: 0,
                correct: 0,
                lastSeen: new Date(0),
                completed: !!task.completed,
                hasTasks: true,
                scores: []
            };
            topicMap[name].hasUnfinishedTask = !task.completed;
        } else {
            topicMap[name].hasTasks = true;
            if (topicMap[name].hasUnfinishedTask === undefined) {
                topicMap[name].hasUnfinishedTask = !task.completed;
            } else if (!task.completed) {
                topicMap[name].hasUnfinishedTask = true;
            }
            topicMap[name].completed = !topicMap[name].hasUnfinishedTask;
        }
        let newTaskPriority = 0;
        if (task.priority === 'high') newTaskPriority = 40;
        else if (task.priority === 'medium') newTaskPriority = 20;
        if (!task.completed) {
            topicMap[name].manualPriority = Math.max(topicMap[name].manualPriority || 0, newTaskPriority);
        }
    });
    const today = new Date();
    const topics = Object.entries(topicMap).map(([name, data]) => {
        const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        const topicHistory = data.scores.slice(-3);
        const trend = topicHistory.length >= 2 ? calculateSlope(topicHistory, 100) * 30 : 0;
        let daysSince = 0;
        if (data.lastSeen.getTime() === 0) {
            daysSince = 30;
        } else {
            daysSince = getDaysDiff(today, data.lastSeen);
        }
        const priorityBoost = data.manualPriority || 0;
        const perfComponent = Math.max(0, Math.min(1, (100 - percentage) / 100));
        const recencyComponent_topic = Math.max(0, Math.min(1, daysSince / 60));
        const priorityComponent = Math.max(0, Math.min(1, priorityBoost / 40));
        const perfRatio = percentage / 100;
        const TOPIC_W_PERF = 0.70 - (0.40 * perfRatio);
        const TOPIC_W_RECENCY = 0.10 + (0.40 * perfRatio);
        const TOPIC_W_PRIORITY = 0.20;
        let urgencyScore = (
            perfComponent * TOPIC_W_PERF +
            recencyComponent_topic * TOPIC_W_RECENCY +
            priorityComponent * TOPIC_W_PRIORITY
        ) * 200;
        // FIX: tópicos não testados pesam menos do que tópicos já aferidos
        if (data.total === 0) {
            urgencyScore *= 0.45;
        }
        const topicDropThreshold = -2.0;
        if (trend < topicDropThreshold) {
            const dropSeverity = Math.min(2.0, 1 + Math.abs(trend / topicDropThreshold) * 0.1);
            urgencyScore *= dropSeverity;
        }
        return {
            name,
            total: data.total,
            percentage,
            daysSince,
            trend: Number(trend.toFixed(2)),
            priorityBoost,
            urgencyScore,
            isUntested: data.total === 0,
            manualPriority: data.manualPriority || 0,
            completed: data.completed,
            hasTasks: !!data.hasTasks,
            scores: data.scores.slice(-8),
            lastSeen: data.lastSeen
        };
    });
    // ==================== LOTE 4: BAYESIAN TOPICS ====================
    let bayesianTopicMap = null;
    if (getCoachFeature(null, 'useBayesianTopics', false)) {
      try {
        const bayesianInput = topics.map(topic => ({
          name: topic.name,
          total: topic.total,
          percentage: topic.percentage,
          correct: topic.total > 0 ? (topic.percentage / 100) * topic.total : 0,
          trend: topic.trend,
          isUntested: topic.isUntested
        }));
        const bayesianResult = estimateTopicProficiencies(bayesianInput, {
          untestedPriorMean: 0.25,
          untestedPriorWeight: 0.45
        });
        bayesianTopicMap = new Map(
          bayesianResult.topics.map(t => [t.name, t])
        );
        topics.forEach(topic => {
          const bayes = bayesianTopicMap.get(topic.name);
          if (!bayes) return;
          topic.bayesian = bayes;
          topic.bayesianProficiency = bayes.proficiencyMean * 100;
          topic.bayesianEvidence = bayes.evidence;
          topic.bayesianUncertainty = bayes.uncertainty;
          if (getCoachFeature(null, 'useBayesianTopicsForUrgency', false)) {
            const weakness = clamp(1 - bayes.proficiencyMean, 0, 1);
            const uncertainty = clamp(bayes.uncertainty, 0, 1);
            const evidence = clamp(bayes.evidence, 0, 1);
            const bayesianBoost = (weakness * 0.65 + uncertainty * 0.35) * 70;
            topic.urgencyScore =
              topic.urgencyScore * (0.75 + 0.25 * evidence) +
              bayesianBoost;
            if (topic.isUntested) {
              const explorationFactor = 0.40 + 0.35 * uncertainty;
              topic.urgencyScore *= explorationFactor;
            }
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Bayesian topics failed:', err);
        bayesianTopicMap = null;
      }
    }
    // ==================== LOTE 5: DECISION UTILITY ====================
    let decisionTopicMap = null;
    if (getCoachFeature(null, 'useDecisionUtility', false)) {
      try {
        const decisionCandidates = topics.map(topic => {
          const bayesianProficiency = Number.isFinite(topic.bayesianProficiency)
            ? topic.bayesianProficiency
            : topic.percentage;
          const weakness = clamp(1 - (bayesianProficiency / 100), 0, 1);
          const uncertainty = Number.isFinite(topic.bayesianUncertainty)
            ? topic.bayesianUncertainty
            : (topic.total > 0
                ? clamp(10 / (topic.total + 10), 0, 1)
                : 0.85);
          const evidence = Number.isFinite(topic.bayesianEvidence)
            ? topic.bayesianEvidence
            : clamp(topic.total / (topic.total + 10), 0, 1);
          return {
            id: `topic:${topic.name}`,
            name: topic.name,
            type: 'topic',
            weakness,
            uncertainty,
            evidence,
            recencyDays: topic.daysSince,
            priority: topic.manualPriority >= 40
              ? 'high'
              : topic.manualPriority >= 20
                ? 'medium'
                : 'low',
            priorityValue: clamp((topic.manualPriority || 0) / 40, 0, 1),
            hasTasks: topic.hasTasks,
            completed: topic.completed,
            costMinutes: 35,
            fatigue: 100,
            weight: null
          };
        });
        const rankedDecisionTopics = rankDecisionCandidates(decisionCandidates, {
          useBandit: getCoachFeature(null, 'useBanditPlanner', false),
          seed: `topics-${topics.length}-${getDateKey(new Date())}`,
          explorationScale: 16
        });
        decisionTopicMap = new Map(
          rankedDecisionTopics.map(item => [item.name, item])
        );
        topics.forEach(topic => {
          const decisionItem = decisionTopicMap.get(topic.name);
          if (!decisionItem) return;
          topic.decisionUtility = decisionItem.decision?.utility ?? 0;
          topic.decisionScore = decisionItem.decisionScore ?? 0;
          topic.decisionExploration = decisionItem.explorationBonus ?? 0;
          topic.decisionComponents = decisionItem.decision?.components ?? null;
          if (getCoachFeature(null, 'useDecisionUtilityForTopics', false)) {
            topic.urgencyScore =
              topic.urgencyScore * 0.75 +
              topic.decisionUtility * 0.45;
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Decision utility topics failed:', err);
        decisionTopicMap = null;
      }
    }
    const useBayesianSort = getCoachFeature(null, 'useBayesianTopicsForUrgency', false);
    const useDecisionSort = getCoachFeature(null, 'useDecisionUtilityForTopics', false);
    // ==================== LOTE 7: FSRS + KNOWLEDGE GRAPH ====================
    if (getCoachFeature(null, 'useAdvancedFsrs', false)) {
      try {
        topics.forEach(topic => {
          topic.fsrs = estimateTopicFsrs(
            {
              name: topic.name,
              scores: topic.scores || [],
              lastSeen: topic.lastSeen,
              daysSince: topic.daysSince,
              total: topic.total,
              percentage: topic.percentage,
            },
            {
              maxScore,
              desiredRetention: 0.85,
            }
          );
          if (
            getCoachFeature(null, 'useFsrsTopicScheduling', false) &&
            topic.fsrs
          ) {
            const retentionRisk = clamp(
              1 - (topic.fsrs.retentionPct / 100),
              0,
              1
            );
            const dueBoost = topic.fsrs.due ? 10 : 0;
            topic.urgencyScore += retentionRisk * 18 + dueBoost;
            if (topic.fsrs.due) {
              topic.srsDue = true;
            }
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Advanced FSRS topics failed:', err);
      }
    }
    if (getCoachFeature(null, 'useKnowledgeGraph', false)) {
      try {
        const graphConfig = getKnowledgeGraphForCategory(
          category?.name || category?.id
        );
        if (graphConfig) {
          const graphInput = topics.map(topic => ({
            name: topic.name,
            proficiency: Number.isFinite(topic.bayesianProficiency)
              ? topic.bayesianProficiency / 100
              : topic.percentage / 100,
            evidence: Number.isFinite(topic.bayesianEvidence)
              ? topic.bayesianEvidence
              : clamp(topic.total / (topic.total + 10), 0, 1),
            total: topic.total,
          }));
          const graphMetrics = computeTopicGraphMetrics(graphInput, graphConfig);
          const graphMap = new Map(
            graphMetrics.topics.map(metric => [metric.name, metric])
          );
          topics.forEach(topic => {
            const metric = graphMap.get(topic.name);
            if (!metric) return;
            topic.graph = metric;
            if (getCoachFeature(null, 'useKnowledgeGraphForTopics', false)) {
              const importanceBoost = metric.graphImportance * 22;
              const prereqPenalty = (1 - metric.prereqReadiness) * 16;
              topic.urgencyScore =
                topic.urgencyScore + importanceBoost - prereqPenalty;
              if ((metric.blockedBy || []).length > 0) {
                topic.urgencyScore *= 0.92;
                topic.recommendedPrerequisites = metric.blockedBy;
              }
            }
          });
        }
      } catch (err) {
        console.warn('[CoachLogic] Knowledge graph topics failed:', err);
      }
    }
    topics.sort((a, b) => {
      const aNeedsAction = !a.completed && a.hasTasks;
      const bNeedsAction = !b.completed && b.hasTasks;
      const aProf = useBayesianSort && Number.isFinite(a.bayesianProficiency)
        ? a.bayesianProficiency
        : a.percentage;
      const bProf = useBayesianSort && Number.isFinite(b.bayesianProficiency)
        ? b.bayesianProficiency
        : b.percentage;
      // ✅ FIX: Validar urgencyScore antes de usar
      let aBase = Number.isFinite(a.urgencyScore) ? a.urgencyScore : 0;
      let bBase = Number.isFinite(b.urgencyScore) ? b.urgencyScore : 0;
      if (
        useDecisionSort &&
        Number.isFinite(a.decisionScore) &&
        Number.isFinite(b.decisionScore)
      ) {
        aBase = (aBase * 0.55) + (a.decisionScore * 0.45);
        bBase = (bBase * 0.55) + (b.decisionScore * 0.45);
      }
      let aScore = aBase + (aNeedsAction ? 50 : 0);
      let bScore = bBase + (bNeedsAction ? 50 : 0);
      if (a.total > 0 && aProf < 40) aScore += 80;
      else if (a.total > 0 && aProf < 60) aScore += 40;
      if (b.total > 0 && bProf < 40) bScore += 80;
      else if (b.total > 0 && bProf < 60) bScore += 40;
      if (useBayesianSort) {
        const aEvidence = Number.isFinite(a.bayesianEvidence) ? a.bayesianEvidence : 0;
        const bEvidence = Number.isFinite(b.bayesianEvidence) ? b.bayesianEvidence : 0;
        if (a.total > 0) aScore += aEvidence * 15;
        if (b.total > 0) bScore += bEvidence * 15;
        if (a.total === 0) aScore -= 12;
        if (b.total === 0) bScore -= 12;
      } else {
        if (a.total === 0) aScore -= 25;
        if (b.total === 0) bScore -= 25;
      }
      if (useDecisionSort) {
        const aDecision = Number.isFinite(a.decisionUtility) ? a.decisionUtility : 0;
        const bDecision = Number.isFinite(b.decisionUtility) ? b.decisionUtility : 0;
        aScore += aDecision * 0.20;
        bScore += bDecision * 0.20;
      }
      // ✅ FIX: Garantir que scores não são NaN/Infinity
      const finalAScore = Number.isFinite(aScore) ? aScore : 0;
      const finalBScore = Number.isFinite(bScore) ? bScore : 0;
      return finalBScore - finalAScore;
    });
    return topics;
};

const getWeakestTopic = (category, simulados = [], maxScore = 100) => {
    const topics = _buildSortedTopics(category, simulados, maxScore);
    return (topics && topics.length > 0) ? topics[0] : null;
};

const getWeakestTopicsList = (category, simulados = [], maxScore = 100, limit = 3) => {
    const topics = _buildSortedTopics(category, simulados, maxScore);
    return (topics || []).slice(0, limit);
};

export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
    const targetScore = options.targetScore ?? 80;
    const maxScore = options.maxScore ?? 100;
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});
    if (safeCategories.length === 0) return [];
    const safeSimulados = safeArray(simulados);
    const safeStudyLogs = safeArray(studyLogs);
    const ranked = safeCategories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, safeSimulados, safeStudyLogs, { ...options, allCategories: safeCategories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        return valB - valA;
    });
    const topCategories = ranked.slice(0, 10);
    const performDeepCheck = (category, averageScore) => {
        const baseDate = options.now ? (normalizeDate(options.now) || new Date()) : new Date();
        const thirtyDaysAgo = new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const cutoffTime = thirtyDaysAgo.getTime();

        // ✅ FIX: Verificar se category.id existe antes de filtrar
        const categoryId = category?.id;
        const catName = category?.name;
        const recentLogs = categoryId
            ? safeStudyLogs.filter(l => {
                const matchesId = l?.categoryId === categoryId;
                // FIX C-02: logs antigos podem ter só categoryName/subject.
                const matchesName = catName && l?.categoryName
                    ? normalize(l.categoryName) === normalize(catName)
                    : (l?.subject ? normalize(l.subject) === normalize(catName) : false);
                return (matchesId || matchesName) &&
                    (normalizeDate(l?.date) || new Date(0)).getTime() >= cutoffTime;
              })
            : [];

        // ✅ FIX: Verificar se category.name existe antes de normalizar
        const catNormalized = catName ? normalize(catName) : '';
        const recentSims = catNormalized
            ? safeSimulados.filter(s =>
                normalize(s?.subject) === catNormalized &&
                (normalizeDate(s?.date || s?.createdAt) || new Date(0)).getTime() >= cutoffTime
              )
            : [];

        const catMax = Number.isFinite(Number(category?.maxScore)) && Number(category?.maxScore) > 0
            ? Number(category.maxScore)
            : (maxScore > 0 ? maxScore : 100);
        const catMin = Number.isFinite(Number(category?.minScore))
            ? Math.min(Number(category.minScore), catMax)
            : 0;
        const catRange = Math.max(1e-9, catMax - catMin);
        const totalHours = recentLogs.reduce((acc, l) => acc + sanitizeMinutes(l?.minutes), 0) / 60;
        const totalQuestions = recentSims.reduce((acc, s) => acc + (Number(s?.total) || getSyntheticTotal(catMax)), 0);
        const questionsPerHour = totalHours >= 0.25 ? totalQuestions / totalHours : 0;
        const dynamicThreshold = totalHours >= 20 ? 30 : totalHours >= 10 ? 20 : 12;

        // ✅ FIX: Validar averageScore antes de calcular normalizedScore
        const safeAverageScore = Number.isFinite(averageScore) ? averageScore : catMin;
        const normalizedScore = catRange > 0 ? ((safeAverageScore - catMin) / catRange) * 100 : 0;
        const isFormingBase = normalizedScore < 45;

        if (totalHours > 5 && questionsPerHour < dynamicThreshold && !isFormingBase) {
            return {
                isTrap: true,
                msg: `⚠️ Alerta de Método: Estudou ${totalHours.toFixed(1)}h de ${catName || 'matéria'} mas resolveu poucas questões (${questionsPerHour.toFixed(1)}/h). O seu nível atual exige prática >${dynamicThreshold}/h.`
            };
        }
        return { isTrap: false };
    };
    let allGeneratedTasks = [];
    const tasksPerCategory = topCategories.length < 5 ? 3 : (topCategories.length < 8 ? 2 : 1);
    topCategories.forEach((cat) => {
        let localPriorityCounter = 0;
        const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : maxScore;
        const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : 0;
        const catRange = Math.max(1e-9, catMax - catMin);
        const weakTopics = getWeakestTopicsList(cat, safeSimulados, catMax, tasksPerCategory);
        const mc = cat.urgency?.details?.monteCarlo;
        const iterations = tasksPerCategory;
        const getPriorityLabel = () => {
            if (localPriorityCounter < 3) {
                localPriorityCounter++;
                return '[PROTOCOLO PRIORITÁRIO] ';
            }
            return '';
        };
        const adaptiveDanger = mc?.thresholds?.danger || cfg.MC_PROB_DANGER;
        const adaptiveSafe = mc?.thresholds?.safe || cfg.MC_PROB_SAFE;
        // ✅ FIX: sufixo determinístico — sem Date.now() (IDs estáveis p/ Planner/dedupe)
        const mcIdSuffix = hashString64(`${cat.id}|mc`);
        // Ordem corrigida: crítico > caos > SRS > cruzeiro > trap
        if (mc && mc.probabilityRaw < adaptiveDanger) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                // FIX (LOGIC): Removido mcProbKey do ID para manter estabilidade no Planner
                id: `${cat.id}-mc-danger-${mcIdSuffix}`,
                text: `${cat.name}: [ALERTA MESTRE] 🚨 VETOR CRÍTICO! Projeção matemática indica colapso de performance.`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Vetor Crítico — Intervenção Exigida',
                analysis: {
                    reason: "Monte Carlo — Zona de Perigo",
                    details: `Apenas ${probPct}% de chance de bater a meta de ${options.targetScoreLabel ?? targetScore}% em 90 dias.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Probabilidade crítica detectada. Mude de método imediatamente."
                }
            });
        } else if (mc && mc.volatility > cfg.MC_VOLATILITY_HIGH * (catRange / 100) && mc.probabilityRaw < adaptiveSafe) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                // FIX (LOGIC): Removido mcVolKey e mcProbKey do ID para manter estabilidade
                id: `${cat.id}-mc-chaos-${mcIdSuffix}`,
                text: `${cat.name}: [ALERTA MESTRE] 🌪️ OSCILAÇÃO ESTATÍSTICA: Padrão imprevisível detectado.`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Oscilação Estatística — Caos Detectado',
                analysis: {
                    reason: "Monte Carlo — Caos Estatístico",
                    details: `Volatilidade MSSD: ${mc.volatility.toFixed(2)}. Probabilidade: ${probPct}%.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Seu nível base é promissor, mas a inconsistência torna a aprovação imprevisível."
                }
            });
        } else if (cat.urgency?.details?.srsLabel) {
            const srsKey = cat.urgency?.details?.srsLabel.replace(/\s/g, '').substring(0, 15);
            const srsTopic = weakTopics[0]?.name || 'Revisão Espaçada (SRS)';
            allGeneratedTasks.push({
                id: `${cat.id}-srs-${srsKey}`,
                text: `${cat.name}: [${srsTopic}]`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: srsTopic,
                analysis: {
                    reason: "Revisão Espaçada (SRS) Ativada",
                    label: cat.urgency?.details?.srsLabel,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Intervalo de retenção atingido. Revisão crítica para memória de longo prazo."
                }
            });
        } else if (mc && mc.probabilityRaw >= adaptiveSafe) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                // FIX (LOGIC): Removido mcProbKey do ID para manter estabilidade
                id: `${cat.id}-mc-safe-${mcIdSuffix}`,
                text: `${cat.name}: [Manutenção - ${cat.name}]`,
                completed: false,
                status: 'pending',
                priority: 'low',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: `Manutenção — ${cat.name}`,
                analysis: {
                    reason: "Monte Carlo — Cruzeiro Seguro",
                    details: `${probPct}% de probabilidade de atingir a meta.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Mantenha o ritmo atual para proteger sua posição."
                }
            });
        } else if (performDeepCheck(cat, cat.urgency?.details?.averageScore).isTrap) {
            allGeneratedTasks.push({
                id: `${cat.id}-trap-trap`,
                text: `${cat.name}: [Prática Intensiva de Questões]`,
                completed: false,
                status: 'pending',
                priority: 'medium',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Prática Intensiva de Questões',
                analysis: {
                    reason: "Detector de Pseudo-Estudo",
                    details: "Alta carga horária com baixíssimo volume de exercícios.",
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Volume excessivo de teoria detectado. Troque leitura por questões agora."
                }
            });
        }
        const agilityData = cat.urgency?.details?.agilityPenalty !== undefined
            ? {
                avgSeconds: cat.urgency?.details?.avgSeconds || 0,
                agilityPenalty: cat.urgency?.details?.agilityPenalty || 0
            }
            : computeAgilityMetrics((cat.simuladoStats && Array.isArray(cat.simuladoStats.history)) ? cat.simuladoStats.history : []);
        // ✅ PATCH-12: Validar avgSeconds explicitamente
        const avgSeconds = Number.isFinite(agilityData?.avgSeconds) ? agilityData.avgSeconds : 0;
        const targetSeconds = 120;
        const isAgilityProblem = (avgSeconds > targetSeconds + 30) && (cat.urgency?.normalizedScore >= 75);
        if (isAgilityProblem) {
            allGeneratedTasks.push({
                // FIX (LOGIC): Removido avgSeconds do ID para manter estabilidade no Planner
                id: `${cat.id}-agility`,
                text: `${cat.name}: [Treino de Agilidade - Cronômetro]`,
                completed: false,
                status: 'pending',
                priority: 'medium',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Treino de Agilidade — Cronômetro',
                analysis: {
                    reason: "Motor de Agilidade AI",
                    details: `Seu tempo médio (${avgSeconds}s/questão) está alto, embora sua taxa de acertos seja excelente.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: `Faça baterias curtas com cronômetro para reduzir o seu tempo de ${avgSeconds}s para a meta de ${targetSeconds}s por questão.`
                }
            });
        }
        let topicCursor = 0;
        for (let i = 0; i < iterations; i++) {
            const weakTopic = (topicCursor < weakTopics.length) ? weakTopics[topicCursor++] : null;
            const topicLabel = weakTopic
                ? `${getPriorityLabel()}[${weakTopic.name}]`
                : `${getPriorityLabel()}[Revisão Geral Complementar]`;
            // FIX (LOGIC): Removido weakTopic.total do ID para evitar que a tarefa suma do planner ao fazer exercícios
            const uniqueIdSuffix = weakTopic
                ? (`${weakTopic.name.replace(/\s/g, '').substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}-${i}`)
                : `geral-${i}`;
            if (weakTopic) {
                let reasonStr = "";
                let topicPriority = 'medium';
                if (weakTopic.isUntested) {
                    reasonStr = "Tópico Novo / Não Testado";
                    topicPriority = 'medium';
                } else if (weakTopic.percentage < 40) {
                    reasonStr = "Vetor Crítico de Erros";
                    topicPriority = 'high';
                } else if (weakTopic.percentage < 60) {
                    reasonStr = "Lacuna de Conhecimento";
                    topicPriority = 'medium';
                } else if (weakTopic.trend < -2) {
                    reasonStr = "Degradação Recente";
                    topicPriority = 'medium';
                } else {
                    reasonStr = "Consolidação Estratégica";
                    topicPriority = 'low';
                }

                allGeneratedTasks.push({
                    id: `${cat.id}-topic-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}`,
                    completed: false,
                    status: 'pending',
                    priority: topicPriority,
                    categoryId: cat.id,
                    category: cat.name,
                    catName: cat.name,
                    subjectName: cat.name,
                    topicName: weakTopic.name,
                    analysis: {
                        reason: reasonStr,
                        details: `Aproveitamento: ${Number(weakTopic.percentage || 0).toFixed(0)}% | Última visita: ${weakTopic.daysSince ?? 0} dias | Tendência: ${Number(weakTopic.trend || 0) > 0 ? '+' : ''}${Number(weakTopic.trend || 0).toFixed(1)}`,
                        metrics: cat.urgency?.details?.humanReadable || {},
                        monteCarlo: mc || null,
                        verdict: `Priorize ${weakTopic.name} — ${reasonStr}.`
                    }
                });

            } else {
                allGeneratedTasks.push({
                    id: `${cat.id}-geral-${i}-${hashString(`${cat.id}|geral|${i}`)}`,
                    text: `${cat.name}: ${getPriorityLabel()}[Revisão Geral Complementar]`,
                    completed: false,
                    status: 'pending',
                    priority: 'low',
                    categoryId: cat.id,
                    category: cat.name,
                    catName: cat.name,
                    subjectName: cat.name,
                    topicName: 'Revisão Geral Complementar',
                    analysis: {
                        reason: "Cobertura Geral",
                        details: "Sem tópico fraco específico — mantenha a revisão geral em dia.",
                        metrics: cat.urgency?.details?.humanReadable || {},
                        monteCarlo: mc || null,
                        verdict: "Revisão geral leve para manutenção."
                    }
                });

            }
        }
    });

    // ✅ CORREÇÃO — dedupe por ID. Tarefas geradas não possuem
    // lastUpdated/createdAt, então a primeira ocorrência é mantida
    // (os duplicados têm conteúdo idêntico — o dedupe é só garantia
    // de unicidade).
    const taskMap = new Map();
    for (const t of allGeneratedTasks) {
      if (!t || !t.id) continue;
      
      const existing = taskMap.get(t.id);
      if (!existing) {
        taskMap.set(t.id, t);
        continue;
      }
      
      // Se já existe, manter o mais recente (por lastUpdated ou createdAt)
      const toTime = (d) => (normalizeDate(d) || new Date(0)).getTime();
      const existingTime = toTime(existing.lastUpdated || existing.createdAt);
      const newTime = toTime(t.lastUpdated || t.createdAt);
      
      if (newTime > existingTime) {
        taskMap.set(t.id, t); // substitui pela versão mais nova
      }
    }

    // ✅ FIX: Deduplicar por ID e por texto para evitar duplicatas
    const seenTexts = new Set();
    const dedupedTasks = Array.from(taskMap.values()).filter(task => {
        if (!task || !task.id) return false;
        const textKey = `${task.categoryId || ''}|${task.topicName || ''}|${task.text || ''}`;
        if (seenTexts.has(textKey)) return false;
        seenTexts.add(textKey);
        return true;
    });

    return dedupedTasks;
};

export const getCognitiveState = (studyLogs = [], options = {}) => {
    // ✅ FIX BUG-43: filtrar elementos inválidos ANTES de processar
    const safeLogs = safeArray(studyLogs).filter(log => {
        if (!log || typeof log !== 'object') return false;
        // Requer pelo menos uma data válida
        const hasDate = log.date || log.createdAt || log.lastUpdated;
        if (!hasDate) return false;
        // Data deve ser parseável
        const parsed = normalizeDate(hasDate);
        return parsed && !Number.isNaN(parsed.getTime());
    });

    let referenceDate = new Date();
    if (options.now) {
        const parsed = normalizeDate(options.now);
        if (parsed && !Number.isNaN(parsed.getTime())) {
            referenceDate = parsed;
        }
    }
    const nowMs = referenceDate.getTime();
    const todayKey = getDateKey(referenceDate);

    const minutesToday = safeLogs
        .filter(l => getDateKey(l?.date) === todayKey)
        .reduce((acc, l) => acc + sanitizeMinutes(l.minutes), 0);

    const last7DaysLogs = safeLogs.filter(l => {
        const t = (normalizeDate(l?.date) || new Date(0)).getTime();
        return t > 0 && (nowMs - t) <= 7 * MS_PER_DAY;
    });
    const hours7d = last7DaysLogs.reduce((acc, l) => acc + sanitizeMinutes(l.minutes), 0) / 60;

    const dailyLoad = Math.min(1, (minutesToday / 60) / 6);
    const weeklyLoad = Math.min(1, hours7d / 40);
    const fatigue = clamp(Math.round((dailyLoad * 0.6 + weeklyLoad * 0.4) * 100), 0, 100);

    const streakDays = new Set(last7DaysLogs.map(l => getDateKey(l?.date)).filter(Boolean)).size;
    const focus = clamp(Math.round((streakDays / 7) * 100), 0, 100);

    let recommendation = 'Ritmo saudável — mantenha o plano.';
    if (fatigue > 75) recommendation = 'Carga cognitiva alta — prefira revisões leves hoje.';
    else if (fatigue > 50) recommendation = 'Carga moderada — alterne blocos curtos com pausas.';
    else if (focus < 30) recommendation = 'Consistência baixa — comece com um bloco curto para retomar o ritmo.';

    return {
        fatigue,
        focus,
        streakDays,
        minutesToday: Math.round(minutesToday),
        hours7d: Number(hours7d.toFixed(2)),
        recommendation
    };
};

export const getBestTask = (categories = [], excludeTaskId = null) => {
    const safeCategories = safeArray(categories);
    const priorityWeight = { high: 3, medium: 2, low: 1 };

    const candidates = [];
    safeCategories.forEach(cat => {
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
        tasks.forEach(task => {
            if (!task || task.completed === true) return;
            if (String(task.status || '').toLowerCase() === 'completed') return;
            const id = task.id || task.text || '';
            if (excludeTaskId && id === excludeTaskId) return;
            const catId = cat?.id || task.categoryId || task.catId || '';
            candidates.push({
                ...task,
                id,
                catId,
                categoryId: catId,
                catName: cat?.name || task.catName || '',
                catColor: cat?.color || task.catColor || '',
                catIcon: cat?.icon || task.catIcon || '',
                _originalIndex: candidates.length
            });
        });
    });

    if (candidates.length === 0) return null;

    // FIX: sort estável e seguro (peso de prioridade → tem analysis → ordem original)
    candidates.sort((a, b) => {
        const pa = priorityWeight[a.priority] ?? 2;
        const pb = priorityWeight[b.priority] ?? 2;
        if (pb !== pa) return pb - pa;
        const aa = a.analysis ? 1 : 0;
        const ab = b.analysis ? 1 : 0;
        if (ab !== aa) return ab - aa;
        return (a._originalIndex ?? 0) - (b._originalIndex ?? 0);
    });

    return candidates[0];
};

export const getCoachInsight = (category, simulados = [], studyLogs = [], options = {}) => {
  const fallback = {
    text: "Dados insuficientes para análise.",
    parts: [],
    trend: 0,
    volatility: 0,
    probability: null,
    error: false,
  };
  
  try {
    const urgency = calculateUrgency(category, simulados, studyLogs, options);
    if (!urgency) return { ...fallback, error: true, text: "Erro ao calcular urgência." };
    
    const details = urgency?.details || {};
    const mc = details.monteCarlo;
    const trend = Number(details.trend) || 0;
    const vol = Number(details.mssdVolatility) || 0;
    
    const parts = [];
    if (mc && Number.isFinite(mc.probability)) {
      parts.push(`chance de meta em ${Math.round(mc.probability)}%`);
    }
    parts.push(trend > 0.5 ? "tendência positiva" : trend < -0.5 ? "tendência negativa" : "estável");
    
    // FIX: o threshold hardcoded de 15 pts valia só para provas de 100 pts.
    // Em provas de 1000 pts, "alta volatilidade" nunca disparava.
    const safeMaxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
    if (vol > 15 * (safeMaxScore / 100)) parts.push("alta volatilidade");
    
    return {
      text: parts.join(" · "),
      parts,
      trend,
      volatility: vol,
      probability: mc?.probability ?? null,
      error: false,
    };
  } catch (err) {
    console.error("[getCoachInsight] Erro:", err);
    return { 
      ...fallback, 
      error: true, 
      text: "Erro ao gerar insight. Verifique console." 
    };
  }
};

export function getCombinedHistory(history, simulados, maxScore = 100, minScore = 0) {
    const deduplicatedMap = new Map();
    const allSimulados = safeArray(simulados);

    allSimulados.forEach((s) => {
        const safeScore = getSafeScore(s, maxScore, minScore);
        const safeScoreStr = Number.isFinite(safeScore) ? String(Math.round(safeScore * 100)) : '0';
        // FIX-DEDUPE-01: `|| ''` transforma correct:0 / total:0 em '' (0 é falsy),
        // fundindo simulado zerado com simulado sem dado. Usar normalização explícita.
        const norm = (v) => (v === undefined || v === null || v === '' ? '_' : String(v));
        const sig = `${s.subject || s.categoryId || 'geral'}|${s.date || s.createdAt}|${safeScoreStr}|${norm(s.total)}|${norm(s.correct)}`;
        // FIX-DEDUPE-02: com `id`, incluir o score — senão id repetido com nota
        // diferente sobrescreve o registro anterior em vez de coexistir/ser reportado.
        const key = s.id ? `sim:${s.id}:${safeScoreStr}` : `sig:${sig}`;
        deduplicatedMap.set(key, { ...s, type: 'simulado' });
    });

    const hasSimuladoForDate = new Set(
        allSimulados
            .map(s => getDateKey(s.date || s.createdAt))
            .filter(Boolean)
    );

    const rowsByDate = {};
    safeArray(history).forEach(r => {
        const dKey = getDateKey(r.date || r.createdAt);
        if (dKey && !hasSimuladoForDate.has(dKey)) {
            if (!rowsByDate[dKey]) rowsByDate[dKey] = { correct: 0, total: 0 };
            rowsByDate[dKey].correct += (Number(r.correct) || 0);
            rowsByDate[dKey].total += (Number(r.total) || 0);
        }
    });

    Object.entries(rowsByDate).forEach(([dKey, stats]) => {
        if (stats.total > 0) {
            const score = minScore + (stats.correct / stats.total) * (maxScore - minScore);
            const safeScoreStr = Number.isFinite(score) ? String(Math.round(score * 100)) : '0';
            const key = `legacy-${dKey}|${dKey}|${safeScoreStr}`;
            if (!deduplicatedMap.has(key)) {
                deduplicatedMap.set(key, {
                    id: `legacy-${dKey}`,
                    date: dKey,
                    score: Number.isFinite(score) ? score : minScore,
                    type: 'simulado'
                });
            }
        }
    });

    return getSortedHistory(Array.from(deduplicatedMap.values()));
}

export { getWeakestTopic, getWeakestTopicsList };
```

## File: src/hooks/useMonteCarloStats.js
```javascript
// ✅ LOTE-04 FIX: default import React removido (não há JSX neste hook)
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo';
import { normalCDF_complement } from '../engine/math/gaussian.js';
import { computeNonLinearTrend } from '../engine/projection.js';
import { getDateKey, normalizeDate, parseNoonLocal, daysUntilGoal } from '../utils/dateHelper';
import {
  shrinkProbabilityToNeutral,
  recordPredictionEvent,
  backfillObservedFromSimulados,
  computeCalibrationSummary
} from '../utils/calibration.js';
import {
  getConfidenceTier,
  buildHumanExplanation,
  detectPerformanceDrift,
  humanizeVolatility,
  validatePrediction
} from '../utils/explanationEngine.js';
import { getFlashcardImmunity } from '../utils/analytics.js';
import {
  MAX_CALIBRATION_PENALTY,
  sanitizeWeightUnit,
  regularizeVolatility,
  computeCalibrationPenalty,
  generateAnalyticsStats
} from '../engine/analyticsStats.js';

const EMPTY_ARRAY = Object.freeze([]);
const BASE_SIMULATIONS = 5000;
const LOG_DAMPING_FACTOR = 45;

const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

// T-005 FIX: clamp defensivo que NÃO empurra NaN para o mínimo.
// Em projeções estatísticas, NaN deve cair para um valor neutro/seguro,
// não para o pior caso silenciosamente.
const safeClamp = (value, min, max, fallback = null) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback !== null && fallback !== undefined
      ? fallback
      : (min + max) / 2;
  }
  return Math.min(max, Math.max(min, n));
};

// FIX: encolhimento simétrico de probabilidade extrema em direção ao neutro
const shrinkToNeutral = (p, factor, neutral = 50) => {
  const safeP = Number.isFinite(p) ? p : neutral;
  const safeFactor = clamp(factor, 0, 1);
  return neutral + (safeP - neutral) * (1 - safeFactor);
};

export function useMonteCarloStats({
  categories,
  goalDate,
  targetScore,
  timeIndex,
  timelineDates,
  minScore,
  maxScore,
  effectiveSimulateToday,
  simuladoRows: propSimuladoRows,
  // T-040 FIX: permite adiar o cálculo pesado de probabilidades por matéria.
  // enablePerSubject = false é intencional — apenas documente que o painel de matérias só calcula quando aberto.
  enablePerSubject = false
}) {
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const activeId = useAppStore(state => state.appState?.activeId);

  const weights = useAppStore(useShallow(state => state.appState?.contests?.[activeId]?.mcWeights || {}));
  const equalWeightsMode = useAppStore(state => state.appState?.mcEqualWeights ?? true);

  const mcHistory = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.monteCarloHistory;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const flashcardDecks = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.flashcardDecks;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const historicalCutoffs = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.historicalCutoffs;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

    // ✅ LOTE-03 FIX (A2): assinar APENAS simuladoRows em vez do concurso inteiro.
    // Antes, qualquer campo do concurso (studyLogs, flashcards, tasks, sessões...)
    // trocava a referência de `contest` e re-renderizava os DOIS gauges.
    const contestSimuladoRows = useAppStore(state => state.appState?.contests?.[activeId]?.simuladoRows);

  const calibrationEvents = useAppStore(useShallow(state => {
    const evs = state.appState?.contests?.[activeId]?.calibrationEvents;
    return Array.isArray(evs) ? evs : Object.values(evs || {});
  }));

  const examDurationMinutes = useAppStore(state => state.appState?.contests?.[activeId]?.examDurationMinutes || 240);
  const defaultExamTotalQuestions = useAppStore(state => state.appState?.contests?.[activeId]?.examTotalQuestions || 100);

    const rawSimuladoRows = useMemo(() => {
        const source = propSimuladoRows ?? contestSimuladoRows ?? [];
        // ✅ LOTE-03 FIX (M8): simuladoRows podem vir como OBJETO no Firebase.
        // O guard `rawSimuladoRows.length === 0` do efeito de backfill falhava
        // silenciosamente com objetos (undefined !== 0) e .map() quebraria.
        return Array.isArray(source) ? source : Object.values(source);
    }, [propSimuladoRows, contestSimuladoRows]);

  const calibrationSummary = useMemo(() => {
    if (calibrationEvents.length < 3) return null;

    try {
      return computeCalibrationSummary(calibrationEvents, { bins: 6 });
    } catch {
      return null;
    }
  }, [calibrationEvents]);

  const modelHealth = useMemo(() => {
    if (!calibrationSummary) return 0.5;

    const brierHealth = Math.max(0, Math.min(1, 1 - (calibrationSummary.avgBrier - 0.12) / 0.2));
    const trendHealth = calibrationSummary.trend === 'improving'
      ? 0.2
      : (calibrationSummary.trend === 'degrading' ? -0.2 : 0);

    return Math.max(0.1, Math.min(1, (brierHealth + 0.5 + trendHealth) / 1.5));
  }, [calibrationSummary]);

  const modelWeight = useMemo(() => {
    if (!calibrationSummary || !calibrationSummary.avgBrier) return 0.25;

    const brier = Math.max(0.12, Math.min(0.3, calibrationSummary.avgBrier));
    return Math.max(0.1, Math.min(0.45, 0.25 + (0.18 - brier) * 2.5));
  }, [calibrationSummary]);

  const dynamicSimulations = useMemo(() => {
    let sims = BASE_SIMULATIONS;

    if (calibrationSummary && calibrationSummary.avgBrier > 0.2) {
      sims = Math.min(15000, BASE_SIMULATIONS + Math.floor((calibrationSummary.avgBrier - 0.18) * 20000));
    }

    if (modelHealth > 0.8) {
      sims = Math.max(2000, Math.floor(sims * 0.8));
    } else if (modelHealth < 0.4) {
      sims = Math.min(20000, Math.floor(sims * 1.3));
    }

    return sims;
  }, [calibrationSummary, modelHealth]);

  const dynamicSimulationsRef = useRef(dynamicSimulations);
  useEffect(() => {
    dynamicSimulationsRef.current = dynamicSimulations;
  }, [dynamicSimulations]);

  const modelWeightRef = useRef(modelWeight);
  useEffect(() => {
    modelWeightRef.current = modelWeight;
  }, [modelWeight]);

  const setWeights = useAppStore(state => state.setMonteCarloWeights);
  const recordMonteCarloSnapshot = useAppStore(state => state.recordMonteCarloSnapshot);
  const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);

  // T-018/T-024 FIX: normalizar categories antes de filter
  const safeCategories = useMemo(() => {
    return Array.isArray(categories)
      ? categories
      : Object.values(categories || {});
  }, [categories]);

  const activeCategories = useMemo(() =>
    safeCategories.filter(c => {
      const h = c.simuladoStats?.history;
      const hLen = h ? (Array.isArray(h) ? h.length : Object.values(h).length) : 0;
      return hLen > 0;
    }),
    [safeCategories]
  );

  const getEqualWeights = useCallback(() => {
    if (activeCategories.length === 0) return {};

    const newWeights = {};
    activeCategories.forEach(cat => {
      newWeights[cat.id || cat.name] = 1;
    });

    return newWeights;
  }, [activeCategories]);

  const weightsKey = useMemo(() => {
    if (equalWeightsMode) return JSON.stringify(getEqualWeights());
    return JSON.stringify(weights || {});
  }, [equalWeightsMode, weights, getEqualWeights]);

  const effectiveWeights = useMemo(() => {
    if (equalWeightsMode) return getEqualWeights();
    if (!weights) return getEqualWeights();

    const weightsMap = {};

    activeCategories.forEach(cat => {
      const stored = weights[cat.id || cat.name];
      const w = sanitizeWeightUnit(stored);
      weightsMap[cat.id || cat.name] = (stored !== undefined && stored !== null) ? Math.max(0, w) : 1;
    });

    const totalWeight = Object.values(weightsMap).reduce((acc, w) => {
      return acc + (Number.isFinite(w) ? w : 0);
    }, 0);

    if (totalWeight <= 0) {
      return getEqualWeights();
    }

    return weightsMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightsKey, activeCategories.length]);

  const [debouncedTarget, setDebouncedTarget] = useState(targetScore);
  const [debouncedWeights, setDebouncedWeights] = useState(() => effectiveWeights);

  const lastRecordedGlobalPredRef = useRef('');
  const lastRecordedSubjectPredsRef = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTarget(targetScore), 300);
    return () => clearTimeout(timer);
  }, [targetScore]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedWeights(effectiveWeights), 300);
    return () => clearTimeout(timer);
  }, [effectiveWeights]);

  const projectDays = useMemo(() => {
    if (effectiveSimulateToday) return 0;
    if (!goalDate) return 30;

    let currentDate = parseNoonLocal(getDateKey(new Date())) || new Date();

    if (timeIndex >= 0 && timeIndex < timelineDates.length) {
      // T-025 FIX: evitar new Date('YYYY-MM-DD') diretamente.
      // normalizeDate costuma ancorar melhor a data no helper do projeto.
      const parsedTimelineDate = parseNoonLocal(timelineDates[timeIndex]) || 
        normalizeDate(timelineDates[timeIndex]);

      if (parsedTimelineDate && Number.isFinite(parsedTimelineDate.getTime())) {
        currentDate = parsedTimelineDate;
      }
    }

    let goal;
    if (typeof goalDate === 'string') {
      goal = parseNoonLocal(goalDate) || normalizeDate(goalDate);
    } else if (goalDate instanceof Date) {
      goal = parseNoonLocal(getDateKey(goalDate));
    } else {
      goal = new Date(goalDate);
    }

    if (!goal || !Number.isFinite(goal.getTime())) return 30;

    // T-024/T-025 FIX: fallback para data corrente inválida
    if (!currentDate || !Number.isFinite(currentDate.getTime())) {
      currentDate = parseNoonLocal(getDateKey(new Date())) || new Date();
    }

    // FIX-GOAL-02: delegar ao helper único (mesmo clamp/mesmo fuso que o useMemo).
    return daysUntilGoal(goal, { fallback: 30, min: 1, referenceDate: currentDate });
  }, [goalDate, effectiveSimulateToday, timeIndex, timelineDates]);

  const pureStatsData = useMemo(() => {
    return generateAnalyticsStats({
      // T-018 FIX: usar categorias já normalizadas
      categories: safeCategories,
      debouncedWeights,
      timeIndex,
      timelineDates,
      minScore,
      maxScore,
      simuladoRows: rawSimuladoRows
    });
  }, [safeCategories, debouncedWeights, timeIndex, timelineDates, minScore, maxScore, rawSimuladoRows]);

    const calibrationPenalty = useMemo(() => {
        let pen = computeCalibrationPenalty(
            mcHistory,
            pureStatsData?.globalHistory,
            maxScore,
            calibrationSummary,
            minScore // ✅ LOTE-03 FIX (M9): resíduo normalizado pelo domínio real [min, max]
        );

    if (modelHealth < 0.6) {
      pen = Math.min(MAX_CALIBRATION_PENALTY, pen * (1 + (0.6 - modelHealth)));
    }

    return pen;
    }, [mcHistory, pureStatsData?.globalHistory, maxScore, minScore, calibrationSummary, modelHealth]);

  const statsData = useMemo(() => {
    if (!pureStatsData) return null;

    if (calibrationPenalty <= 0) {
      return { ...pureStatsData, calibrationPenalty: 0 };
    }

    const aleatoricFloor = maxScore * 0.02;

    const epistemicPooled = Math.max(0, pureStatsData.pooledSD - aleatoricFloor);
    const calibratedPooledSD = aleatoricFloor + (epistemicPooled * (1 + calibrationPenalty * 2.5));

    const epistemicDaily = Math.max(0, pureStatsData.dailySD - aleatoricFloor);
    const calibratedDailySD = aleatoricFloor + (epistemicDaily * (1 + calibrationPenalty * 2.5));

    return {
      ...pureStatsData,
      pooledSD: calibratedPooledSD,
      dailySD: calibratedDailySD,
      rawPooledSD: pureStatsData.pooledSD,
      calibrationPenalty
    };
  }, [pureStatsData, calibrationPenalty, maxScore]);

  // ✅ PATCH-04: Hash deve incluir o timeIndex e target para forçar re-cálculo quando muda a meta ou range de datas
  const pureStatsHash = `${pureStatsData?.statsHash || 'null'}-ti${timeIndex}-ms${minScore}-ms${maxScore}-tgt${debouncedTarget ?? 'na'}-pd${projectDays}-st${effectiveSimulateToday ? 1 : 0}`;

  const pureStatsDataRef = useRef(pureStatsData);
  useEffect(() => {
    pureStatsDataRef.current = pureStatsData;
  }, [pureStatsData]);

  // T-012 FIX: Ref para usar statsData já calibrado dentro do efeito principal.
  // Sem isso, o motor calculava pooledSD/dailySD calibrados mas continuava
  // usando pureStatsData na simulação.
  const statsDataRef = useRef(statsData);
  useEffect(() => {
    statsDataRef.current = statsData;
  }, [statsData]);

  const { runAnalysis } = useMonteCarloWorker();
  const [simulationData, setSimulationData] = useState({ status: 'waiting', missing: 'data' });

  useEffect(() => {
    if (!rawSimuladoRows || rawSimuladoRows.length === 0) return;
    if (!calibrationEvents || calibrationEvents.length === 0) return;

    try {
      const backfilled = backfillObservedFromSimulados(
        calibrationEvents,
        rawSimuladoRows,
        statsData?.categoryStats || [],
        maxScore
      );

      const changed = backfilled.length !== calibrationEvents.length ||
        backfilled.some((ev, idx) => {
          const orig = calibrationEvents[idx];
          return !orig || ev.observed !== orig.observed || ev.observedScore !== orig.observedScore || ev.observedAt !== orig.observedAt;
        });

      if (changed) {
        const setD = useAppStore.getState().setData;
        if (setD) {
          setD(c => ({ ...c, calibrationEvents: backfilled }));
        }
      }
    } catch {
      // ignore
    }
  }, [rawSimuladoRows, maxScore, calibrationEvents, statsData?.categoryStats]);

    const projectDaysRef = useRef(projectDays);
  useEffect(() => { projectDaysRef.current = projectDays; }, [projectDays]);

  const minScoreRef = useRef(minScore);
  useEffect(() => { minScoreRef.current = minScore; }, [minScore]);

  const maxScoreRef = useRef(maxScore);
  useEffect(() => { maxScoreRef.current = maxScore; }, [maxScore]);

  const examDurationRef = useRef(examDurationMinutes);
  useEffect(() => { examDurationRef.current = examDurationMinutes; }, [examDurationMinutes]);

  const examQuestionsRef = useRef(defaultExamTotalQuestions);
  useEffect(() => { examQuestionsRef.current = defaultExamTotalQuestions; }, [defaultExamTotalQuestions]);

  const flashcardDecksRef = useRef(flashcardDecks);
  useEffect(() => { flashcardDecksRef.current = flashcardDecks; }, [flashcardDecks]);

  const historicalCutoffsRef = useRef(historicalCutoffs);
  useEffect(() => { historicalCutoffsRef.current = historicalCutoffs; }, [historicalCutoffs]);

  const rawSimuladoRowsRef = useRef(rawSimuladoRows);
  useEffect(() => { rawSimuladoRowsRef.current = rawSimuladoRows; }, [rawSimuladoRows]);

  // FIX C-06: hash de identidade do statsData para re-executar a simulação
  // sempre que os dados calibrados mudarem (não só quando estimatedRho muda).
  const statsDataFingerprint = statsData
    ? `${statsData.pooledSD}|${statsData.dailySD}|${statsData.bayesianMean}|${statsData.globalHistory?.length || 0}`
    : 'null';

  useEffect(() => {
    const rawPureStatsData = pureStatsDataRef.current;

    // T-012 FIX: usa statsData calibrado quando disponível.
    // Mantemos o nome `pureStatsData` para não precisar reescrever o efeito inteiro.
    const pureStatsData = statsDataRef.current || rawPureStatsData;

    if (!pureStatsData) {
      setSimulationData({ status: 'waiting', missing: 'data' });
      return;
    }

    let totalPoints = 0;
    pureStatsData.categoryStats.forEach(cat => totalPoints += cat.n || 1);
    if (totalPoints < 1) return;

    let cancelled = false;

    const isFuture = projectDaysRef.current > 0;
    const domain = Math.max(1e-6, maxScoreRef.current - minScoreRef.current);

    const { globalImmunityFactor, subjectImmunityMap } = getFlashcardImmunity(flashcardDecksRef.current);

    const applyConservativeTrendCap = (result) => {
      if (
        result &&
        result.trendType === 'log_time_available' &&
        Number.isFinite(result.projectedMean) &&
        Number.isFinite(result.currentMean) &&
        result.projectedMean > result.currentMean
      ) {
        // FIX: remove o boost otimista de +10% e aplica apenas teto conservador
        result.projectedMean = Math.min(
          result.projectedMean,
          result.currentMean + (domain * 0.15)
        );
      }

      return result;
    };

    const doAnalysis = async () => {
      try {
        let result;

        if (isFuture && pureStatsData.globalHistory?.length > 0) {
          const regularizedSD = regularizeVolatility(
            pureStatsData.dailySD,
            projectDaysRef.current,
            pureStatsData.globalHistory.length,
            domain
          );

          const subjectsOpts = pureStatsData.categoryStats.map(c => {
            const subjName = c.name || c.key || '';
            const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.volatility ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScoreRef.current,
              minScore: minScoreRef.current,
              immunityFactor: immunity,
              weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
            };
          });

          let totalGlobalTimeSpent = 0;
          let totalGlobalTimedQuestions = 0;

          // T-018/T-024 FIX: usar categorias já normalizadas no hook
          const safeTimeCategories = safeCategories;

          safeTimeCategories.forEach(cat => {
            const rawHistory = cat?.simuladoStats?.history;

            const histArray = Array.isArray(rawHistory)
              ? rawHistory
              : Object.values(rawHistory || {});

            histArray.forEach(h => {
              const timeSpent = Number(h?.timeSpent);
              const timedQuestoes = Number(h?.timedQuestoes);

              if (
                Number.isFinite(timeSpent) &&
                Number.isFinite(timedQuestoes) &&
                timeSpent > 0 &&
                timedQuestoes > 0
              ) {
                totalGlobalTimeSpent += timeSpent;
                totalGlobalTimedQuestions += timedQuestoes;
              }
            });
          });

          const globalAvgSeconds = totalGlobalTimedQuestions > 0
            ? (totalGlobalTimeSpent / totalGlobalTimedQuestions)
            : 0;

          const projectedTotalTimeSeconds = examQuestionsRef.current * globalAvgSeconds;

          const effectiveDays = projectDaysRef.current === 0 ? 1 : projectDaysRef.current;

          result = await runAnalysis({
            values: pureStatsData.globalHistory,
            dates: pureStatsData.globalHistory.map(h => h.date),
            meta: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            projectionDays: effectiveDays,
            forcedVolatility: regularizedSD,
            forcedBaseline: pureStatsData.bayesianMean,
            currentMean: pureStatsData.bayesianMean,
            minScore: minScoreRef.current,
            maxScore: maxScoreRef.current,
            subjects: subjectsOpts,
            projectedTotalTimeSeconds,
            examDurationMinutes: examDurationRef.current,
            flashcardImmunity: globalImmunityFactor,
            historicalCutoffs: historicalCutoffsRef.current,
            simuladoRows: rawSimuladoRowsRef.current,
            categoryNames: subjectsOpts.map(s => s.name),
            cacheKey: `${pureStatsHash}-t${projectDaysRef.current}-s${dynamicSimulationsRef.current}-tgt${debouncedTarget}`
          });
        } else {
          const subjectsOpts = pureStatsData.categoryStats.map(c => {
            const subjName = c.name || c.key || '';
            const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.bayesianSd ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScoreRef.current,
              minScore: minScoreRef.current,
              immunityFactor: immunity,
              weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
            };
          });

          const normalSD = regularizeVolatility(
            pureStatsData.pooledSD,
            0, // horizonte "hoje"
            pureStatsData.globalHistory?.length || 1,
            domain
          );

          const normalPayload = {
            mode: 'normal',
            mean: pureStatsData.bayesianMean,
            sd: normalSD,
            targetScore: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            currentMean: pureStatsData.bayesianMean,
            bayesianCI: pureStatsData.bayesianCI,
            minScore: minScoreRef.current,
            maxScore: maxScoreRef.current,
            subjects: subjectsOpts,
            flashcardImmunity: globalImmunityFactor,
            // T-014 FIX: cortes históricos também no modo normal
            historicalCutoffs: historicalCutoffsRef.current,
            simuladoRows: rawSimuladoRowsRef.current,
            categoryNames: subjectsOpts.map(s => s.name)
          };

          // Compatibilidade dupla:
          // 1) tenta API por objeto
          // 2) se não retornar probabilidade válida, tenta API posicional antiga
          result = await runAnalysis(normalPayload);

          if (!result || result.probability == null) {
            // ✅ LOTE-01 FIX: fallback síncrono com a MESMA API de objeto
            result = simulateNormalDistribution({ ...normalPayload, historicalCutoffs: historicalCutoffsRef.current });
          }
        }

        if (!cancelled) {
          if (!isMountedRef.current) return;

          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          if (isMountedRef.current) {
            setSimulationData({ status: 'ready', data: result });
          }

          try {
            const setDataFn = useAppStore.getState().setData;

            // T-015 FIX: só gravar eventos de calibração para previsões futuras.
            // Eventos do modo "hoje" não devem alimentar calibração.
            if (projectDaysRef.current > 0 && setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent({
                  timestamp: Date.now(),
                  probability: Number(result.probability) / 100,
                  targetScore: debouncedTarget,
                  sims: result.simulationCount,
                  effectiveN: result.diagnostics?.effectiveN,
                  category: 'global'
                });

                if (ev) {
                  setDataFn(contest => {
                    const evs = Array.isArray(contest.calibrationEvents) ? contest.calibrationEvents.slice() : [];
                    evs.push(ev);
                    return { ...contest, calibrationEvents: evs.slice(-200) };
                  });
                }
              }
            }
          } catch {
            // best effort
          }
        }
      } catch (err) {
        console.warn('[MC Worker] Simulation failed, using sync fallback:', err);

        if (!cancelled) {
          let result;

          const regularizedSD = isFuture && pureStatsData.globalHistory?.length > 0
            ? regularizeVolatility(
                pureStatsData.dailySD,
                projectDaysRef.current,
                pureStatsData.globalHistory.length,
                domain
              )
            : pureStatsData.dailySD;

          if (isFuture && pureStatsData.globalHistory?.length > 0) {
            const subjectsOpts = pureStatsData.categoryStats.map(c => {
              const subjName = c.name || c.key || '';
              const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.volatility ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScoreRef.current,
                minScore: minScoreRef.current,
                immunityFactor: immunity,
                weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
              };
            });

            const effectiveDays = projectDaysRef.current === 0 ? 1 : projectDaysRef.current;

            result = runMonteCarloAnalysis({
              values: pureStatsData.globalHistory,
              dates: pureStatsData.globalHistory.map(h => h.date),
              meta: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              projectionDays: effectiveDays,
              forcedVolatility: regularizedSD,
              forcedBaseline: pureStatsData.bayesianMean,
              currentMean: pureStatsData.bayesianMean,
              minScore: minScoreRef.current,
              maxScore: maxScoreRef.current,
              subjects: subjectsOpts,
              simuladoRows: rawSimuladoRowsRef.current,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor,
              historicalCutoffs: historicalCutoffsRef.current
            });
          } else {
            const subjectsOpts = pureStatsData.categoryStats.map(c => {
              const subjName = c.name || c.key || '';
              const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.bayesianSd ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScoreRef.current,
                minScore: minScoreRef.current,
                immunityFactor: immunity,
                weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
              };
            });

            result = simulateNormalDistribution({
              mean: pureStatsData.bayesianMean,
              sd: regularizeVolatility(pureStatsData.pooledSD, 0, pureStatsData.globalHistory?.length || 1, domain),
              targetScore: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              currentMean: pureStatsData.bayesianMean,
              bayesianCI: pureStatsData.bayesianCI,
              historicalCutoffs: historicalCutoffsRef.current,
              subjects: subjectsOpts,
              minScore: minScoreRef.current,
              maxScore: maxScoreRef.current,
              simuladoRows: rawSimuladoRowsRef.current,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor,
              historyLength: pureStatsData.globalHistory?.length || 0
            });
          }

          if (!isMountedRef.current) return;

          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          if (isMountedRef.current) {
            setSimulationData({ status: 'ready', data: result });
          }

          try {
            const setDataFn = useAppStore.getState().setData;

            // T-015 FIX: também proteger o fallback síncrono
            if (projectDaysRef.current > 0 && setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent({
                  timestamp: Date.now(),
                  probability: Number(result.probability) / 100,
                  targetScore: debouncedTarget,
                  sims: result.simulationCount,
                  effectiveN: result.diagnostics?.effectiveN,
                  category: 'global'
                });

                if (ev) {
                  setDataFn(contest => {
                    const evs = Array.isArray(contest.calibrationEvents) ? contest.calibrationEvents.slice() : [];
                    evs.push(ev);
                    return { ...contest, calibrationEvents: evs.slice(-200) };
                  });
                }
              }
            }
          } catch {
            // best effort
          }
        }
      }
    };

    const timerId = setTimeout(doAnalysis, 150);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
        // ✅ LOTE-03 FIX (A7): o efeito captura safeCategories no closure para o
        // cálculo de agilidade (timeSpent/timedQuestoes). Antes, entrava apenas
        // indiretamente via pureStatsHash — mudanças estruturais nas categorias
        // que não alterassem o hash usavam dados stale.
    }, [
        pureStatsHash,
        runAnalysis,
        debouncedTarget,
        calibrationPenalty,
        projectDays,
        effectiveSimulateToday,
        safeCategories,
        statsDataFingerprint,
        statsData?.estimatedRho
    ]);

  const probabilityData = useMemo(() => {
    const rawProbability = simulationData?.data?.probability ?? 0;

    // FIX: neutral da probabilidade deve ser 50%, não a média bayesiana da nota
    let adjustedProb = shrinkProbabilityToNeutral(rawProbability, calibrationPenalty, 50, 0.5);

    let confFactor = 0;

    if (
      simulationData?.data?.ciConformalLow != null &&
      simulationData?.data?.ciConformalHigh != null
    ) {
      const confWidth = simulationData.data.ciConformalHigh - simulationData.data.ciConformalLow;

      if (confWidth > 0) {
        // T-017 FIX: proteger domínio inválido/zero antes de dividir
        const confDomain = Math.max(1e-9, Number(maxScore) - Number(minScore));

        confFactor = Math.min(0.2, confWidth / (confDomain * 1.2)) * (1 - modelWeight);

        // FIX: shrink simétrico (tanto >50 quanto <50)
        adjustedProb = shrinkToNeutral(adjustedProb, confFactor, 50);
      }
    }

    let finalProb = adjustedProb;

    if (modelHealth > 0.7) {
      const trust = (modelHealth - 0.7) / 0.3;
      finalProb = finalProb * (1 - trust * 0.5) + (rawProbability * (1 - calibrationPenalty * 0.5)) * (trust * 0.5);
    }

    // FIX: saúde do modelo não deve mascarar risco crítico puxando tudo para 50.
    // Aplicamos apenas uma suavização leve quando a saúde está baixa.
    let healthProb = finalProb;

    if (modelHealth < 0.5) {
      const healthFactor = (0.5 - modelHealth) / 0.5;
      healthProb = shrinkToNeutral(healthProb, healthFactor * 0.15, 50);
    }

    const prob = clamp(healthProb, 0, 100);

    // FIX: expor incerteza e limites para decisão conservadora
    const uncertainty =
      ((1 - modelHealth) * 12) +
      (calibrationPenalty * 35) +
      (confFactor * 20);

    const probabilityLower = clamp(prob - uncertainty, 0, 100);
    const probabilityUpper = clamp(prob + uncertainty, 0, 100);

    const healthAdjustedProb = clamp(
      prob * modelHealth + (50 * (1 - modelHealth)),
      0,
      100
    );

    const rawProjectedMean = simulationData?.data?.projectedMean ?? simulationData?.data?.mean ?? 0;
    const pMean = clamp(rawProjectedMean, minScore, maxScore);

    const cMean = (
      pureStatsData?.bayesianMean === null ||
      pureStatsData?.bayesianMean === undefined ||
      pureStatsData?.bayesianMean === ''
    )
      ? (simulationData?.data?.currentMean ?? pMean)
      : (
          Number.isFinite(Number(pureStatsData.bayesianMean))
            ? Number(pureStatsData.bayesianMean)
            : (simulationData?.data?.currentMean ?? pMean)
        );

    return {
      probability: prob,
      probabilityLower,
      probabilityUpper,
      projectedMean: pMean,
      currentMean: cMean,
      healthAdjustedProb,
      rawProbability,
      uncertainty
    };
  }, [
    simulationData,
    pureStatsData,
    maxScore,
    minScore,
    calibrationPenalty,
    modelHealth,
    modelWeight
  ]);

  const probabilityDataResult = probabilityData;

  const probability = probabilityDataResult.probability;
  const probabilityLower = probabilityDataResult.probabilityLower;
  const probabilityUpper = probabilityDataResult.probabilityUpper;
  const projectedMean = probabilityDataResult.projectedMean;
  const currentMean = probabilityDataResult.currentMean;
  const rawProbability = probabilityDataResult.rawProbability;
  const probabilityUncertainty = probabilityDataResult.uncertainty;

  const healthAdjustedProb = probabilityDataResult.healthAdjustedProb ?? clamp(
    (probabilityDataResult.probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5))),
    0,
    100
  );

  const effectiveSimulationData = useMemo(() => {
    if (!statsData) return { status: 'waiting', missing: 'data' };

    let totalPoints = 0;
    statsData.categoryStats.forEach(cat => {
      totalPoints += cat.n || 1;
    });

    if (totalPoints < 1) return { status: 'waiting', missing: 'count', count: totalPoints };

    const base = simulationData;

    if (base?.status === 'ready' && base.data) {
      return {
        ...base,
        data: {
          ...base.data,
          calibrationSummary,
          diagnostics: {
            ...(base.data.diagnostics || {}),
            calibrationSummary,
            modelHealth,
            modelWeight
          },
          healthAdjustedProb: base.data.healthAdjustedProb ?? healthAdjustedProb,
          probabilityLower: base.data.probabilityLower ?? probabilityLower,
          probabilityUpper: base.data.probabilityUpper ?? probabilityUpper
        }
      };
    }

    return base;
  }, [
    statsData,
    simulationData,
    calibrationSummary,
    modelHealth,
    modelWeight,
    healthAdjustedProb,
    probabilityLower,
    probabilityUpper
  ]);

  const perSubjectProbs = useMemo(() => {
    // T-040 FIX: só calcular probabilidades por matéria quando o painel estiver aberto.
    // Isso evita simulações pesadas desnecessárias no primeiro render.
    if (!enablePerSubject || !statsData?.categoryStats?.length || simulationData?.status !== 'ready') return [];

    return statsData.categoryStats
      .filter(cat => cat.weight > 0)
      .map(cat => {
        const catMaxScore = Number(cat.maxScore) || maxScore;
        const catMinScore = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : minScore;

        const currentBaseline = cat.bayesianMean ?? cat.mean;

        // T-004 FIX: trend pode vir como string ('up'/'down'/'stable').
        // Converter com segurança para número antes de qualquer aritmética.
        const rawTrend = cat.trendValue ?? cat.trend ?? 0;
        const trendPer30Days = Number.isFinite(Number(rawTrend)) ? Number(rawTrend) : 0;

        const projectedDaysAmortized = LOG_DAMPING_FACTOR * Math.log(1 + projectDays / LOG_DAMPING_FACTOR);
        const dailyTrend = trendPer30Days / 30;

        let totalTrendProjection = dailyTrend * projectedDaysAmortized;

        try {
          const simHistory = cat.simuladoStats?.history || cat.history || [];

          if (Array.isArray(simHistory) && simHistory.length >= 4) {
            const nl = computeNonLinearTrend(simHistory, catMaxScore);

            if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
              const nlWeight = modelWeight;
              const nlProjection = nl.slope * (projectedDaysAmortized / 30);
              totalTrendProjection = totalTrendProjection * (1 - nlWeight) + nlProjection * nlWeight;
            }
          }
        } catch {
          // ignore
        }

        // FIX: reduzir projeção quando a tendência é fraca perto da incerteza
        const trendUncertainty = Number(cat.bayesianSd ?? cat.sd ?? 0);
        const trendSignificance = Math.abs(trendPer30Days) / Math.max(1e-6, trendUncertainty);

        if (trendSignificance < 0.5) {
          totalTrendProjection *= 0.5;
        }

        // T-005 FIX: limitar projeção de tendência a ±15% do domínio da disciplina.
        // Se o cálculo produzir NaN, cai para 0 (sem projeção) em vez de -15%.
        totalTrendProjection = safeClamp(
          totalTrendProjection,
          -0.15 * catMaxScore,
          0.15 * catMaxScore,
          0 // fallback neutro: nenhuma projeção de tendência
        );

        // T-005 FIX: se a soma baseline + tendência produzir NaN,
        // mantém o baseline atual em vez de despencar para catMinScore.
        const baseline = (!effectiveSimulateToday && projectDays > 0)
          ? safeClamp(
              currentBaseline + totalTrendProjection,
              catMinScore,
              catMaxScore,
              currentBaseline // fallback: permanece onde está
            )
          : currentBaseline;

        // ✅ LOTE-01 FIX: meta projetada no INTERVALO real, respeitando minScore
        const globalRange = Math.max(1e-9, Number(maxScore) - Number(minScore));
        const catRange = Math.max(1e-9, catMaxScore - catMinScore);
        const targetRatio = clamp((Number(debouncedTarget) - Number(minScore)) / globalRange, 0, 1);
        const subjectTarget = clamp(catMinScore + targetRatio * catRange, catMinScore, catMaxScore);

        const result = simulateNormalDistribution({
          mean: baseline,
          sd: cat.bayesianSd ?? cat.sd,
          targetScore: subjectTarget,   // ✅ LOTE-01 FIX
          simulations: Math.min(dynamicSimulations || 2000, 3000),
          categoryName: cat.name,
          minScore: catMinScore,
          maxScore: catMaxScore,
          simuladoRows: rawSimuladoRows,
          subjects: [{ name: cat.name }],
          historyLength: cat.n || 0,
          bayesianCI: cat.bayesianCI || null
        });

        const subjDiag = {
          ...(result.diagnostics || {}),
          trendType: result.trendType || 'linear',
          calibrationSummary,
          modelHealth,
          modelWeight
        };

        let subjProb = result.probability;
        let subjConfFactor = 0;

        if (result.ciConformalLow != null && result.ciConformalHigh != null) {
          const subjConfWidth = result.ciConformalHigh - result.ciConformalLow;

          if (subjConfWidth > 0) {
            subjConfFactor = Math.min(0.15, subjConfWidth / (catMaxScore * 1.5)) * (1 - modelWeight);

            if (modelHealth < 0.6) {
              subjConfFactor = Math.min(0.25, subjConfFactor * 1.4);
            }

            // FIX: shrink simétrico também por disciplina
            subjProb = shrinkToNeutral(subjProb, subjConfFactor, 50);
          }
        }

        if (modelHealth > 0.7) {
          const trust = (modelHealth - 0.7) / 0.3;
          subjProb = subjProb * (1 - trust * 0.4) + result.probability * (trust * 0.4);
        }

        const subjUncertainty =
          ((1 - modelHealth) * 10) +
          (calibrationPenalty * 30) +
          (subjConfFactor * 18);

        return {
          name: cat.name,
          prob: clamp(subjProb, 0, 100),
          probabilityLower: clamp(subjProb - subjUncertainty, 0, 100),
          probabilityUpper: clamp(subjProb + subjUncertainty, 0, 100),
          mean: baseline,
          trend: cat.trend,
          diagnostics: subjDiag,
          ciConformalLow: result.ciConformalLow,
          ciConformalHigh: result.ciConformalHigh,
          ciLow: result.ciConformalLow ?? result.ci95Low,
          ciHigh: result.ciConformalHigh ?? result.ci95High,
          modelHealth,
          modelWeight,
          healthAdjustedProb: clamp(
            subjProb * modelHealth + (50 * (1 - modelHealth)),
            0,
            100
          )
        };
      }); // ordem estável = ordem das categorias (idêntica nos dois gauges)
  }, [
    statsData,
    debouncedTarget,
    simulationData?.status,
    maxScore,
    effectiveSimulateToday,
    projectDays,
    minScore,
    modelHealth,
    modelWeight,
    rawSimuladoRows,
    calibrationSummary,
    dynamicSimulations,
    calibrationPenalty,
    // T-040 FIX: reagir à abertura/fechamento do painel de matérias
    enablePerSubject
  ]);

  useEffect(() => {
    // T-015 FIX: não gravar calibração de subjects em modo "hoje"
    if (projectDays <= 0) return;

    if (!perSubjectProbs || perSubjectProbs.length === 0 || simulationData?.status !== 'ready') return;

    try {
      const hash = `${pureStatsHash}-${debouncedTarget}`;
      if (lastRecordedSubjectPredsRef.current === hash) return;

      lastRecordedSubjectPredsRef.current = hash;

      const setDataFn = useAppStore.getState().setData;
      if (!setDataFn) return;

      perSubjectProbs.forEach(subj => {
        if (subj.prob == null) return;

        const ev = recordPredictionEvent({
          timestamp: Date.now(),
          probability: Number(subj.prob) / 100,
          targetScore: debouncedTarget,
          sims: 500,
          category: subj.name || 'subject',
          effectiveN: subj.diagnostics?.effectiveN
        });

        if (ev) {
          setDataFn(contest => {
            const evs = Array.isArray(contest.calibrationEvents)
              ? [...contest.calibrationEvents]
              : [];

            evs.push(ev);

            return {
              ...contest,
              calibrationEvents: evs.slice(-200)
            };
          });
        }
      });
    } catch {
      // ignore
    }
  }, [
    perSubjectProbs,
    debouncedTarget,
    simulationData?.status,
    pureStatsHash,
    // T-015 FIX: dependência explícita do modo futuro/hoje
    projectDays
  ]);

  const derivedMetrics = useMemo(() => {
    let sd = simulationData?.data?.sd ?? 0;
    let sdLeft = simulationData?.data?.sdLeft ?? sd;
    let sdRight = simulationData?.data?.sdRight ?? sd;

    let ci95Low = simulationData?.data?.ciConformalLow ?? simulationData?.data?.ci95Low ?? 0;
    let ci95High = simulationData?.data?.ciConformalHigh ?? simulationData?.data?.ci95High ?? 0;

    if (simulationData?.data?.ciConformalLow != null) {
      ci95Low = simulationData.data.ciConformalLow;
      ci95High = simulationData.data.ciConformalHigh;
    }

    const effectiveDrift = simulationData?.data?.diagnostics?.effectiveDriftSlope ?? (simulationData?.data?.drift / 30 || 0);

    if (calibrationPenalty > 0) {
      const ciMid = (ci95Low + ci95High) / 2;
      const ciExpand = 1 + (calibrationPenalty * 2.5);

      ci95Low = Math.max(minScore, ciMid - ((ciMid - ci95Low) * ciExpand));
      ci95High = Math.min(maxScore, ciMid + ((ci95High - ciMid) * ciExpand));

      sd = sd * (1 + calibrationPenalty * 2.5);
      sdLeft = sdLeft * (1 + calibrationPenalty * 2.5);
      sdRight = sdRight * (1 + calibrationPenalty * 2.5);
    }

    // T-017 FIX: domínio seguro para evitar divisão por zero ou negativa
    const domainWidth = Math.max(1e-9, Number(maxScore) - Number(minScore));
    const icWidth = ci95High - ci95Low;

    const saturation = Math.min(1, domainWidth > 0 ? icWidth / domainWidth : 1);
    const projectionConfidence = Math.max(0, 1 - Math.pow(saturation, 1.5));

    const pAdjusted = probability;

    // FIX: piso mínimo de volatilidade para evitar probabilidade degenerada
    // T-017 FIX: usar domínio seguro em vez de maxScore bruto
    const safeSdForTrend = Math.max(
      Number.isFinite(sd) && sd > 0 ? sd : 1,
      domainWidth * 0.02
    );

    const pTrend = normalCDF_complement((debouncedTarget - projectedMean) / safeSdForTrend) * 100;

    const nHistory = Array.isArray(statsData?.globalHistory)
      ? statsData.globalHistory.length
      : (timelineDates?.length || 0);

    const confidenceObj = getConfidenceTier({
      calibrationPenalty,
      volatility: sd,
      sampleSize: nHistory,
      maxScore: Number(maxScore) || 100
    });

    const explanations = buildHumanExplanation({
      calibrationPenalty,
      volatility: sd,
      trend: (projectedMean - currentMean),
      confidenceTier: confidenceObj.tier,
      intervalWidth: ci95High - ci95Low,
      maxScore: Number(maxScore) || 100
    });

    const driftAlerts = detectPerformanceDrift({
      recentMean: currentMean,
      baselineMean: (statsData?.bayesianMean || currentMean),
      recentVolatility: sdLeft,
      maxScore: Number(maxScore) || 100
    });

    const humanVol = humanizeVolatility(sdLeft);

    try {
      validatePrediction({
        probability: pAdjusted,
        interval: { low: ci95Low, high: ci95High },
        confidenceTier: confidenceObj.tier
      });
    } catch (e) {
      console.error('Monte Carlo Validation Error:', e);
    }

    return {
      sd,
      sdLeft,
      sdRight,
      ci95Low,
      ci95High,
      saturation,
      projectionConfidence,
      pAdjusted,
      pTrend,
      probability: pAdjusted,
      probabilityLower,
      probabilityUpper,
      rawProbability,
      probabilityUncertainty,
      confidenceTier: confidenceObj.label,
      confidenceColor: confidenceObj.tier === 'HIGH'
        ? 'text-emerald-400'
        : confidenceObj.tier === 'MEDIUM'
          ? 'text-amber-400'
          : 'text-rose-400',
      confidenceObj,
      explanations,
      humanVol,
      driftAlerts,
      ciConformalLow: simulationData?.data?.ciConformalLow,
      ciConformalHigh: simulationData?.data?.ciConformalHigh,
      trendType: simulationData?.data?.trendType || 'linear',
      calibrationSummary,
      effectiveDrift,
      modelHealth,
      modelWeight
    };
  }, [
    simulationData?.data,
    maxScore,
    minScore,
    debouncedTarget,
    projectedMean,
    calibrationPenalty,
    currentMean,
    statsData,
    timelineDates,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    probabilityUncertainty,
    calibrationSummary,
    modelHealth,
    modelWeight
  ]);

  useMonteCarloHistoryRecorder({
    activeId,
    simulationData,
    timeIndex,
    timelineDates,
    effectiveSimulateToday,
    projectDays,
    goalDate,
    debouncedTarget,
    currentMean,
    projectedMean,
    pAdjusted: derivedMetrics.pAdjusted,
    ci95Low: derivedMetrics.ci95Low,
    ci95High: derivedMetrics.ci95High,
    calibrationSummary: derivedMetrics.calibrationSummary,
    trendType: derivedMetrics.trendType,
    effectiveDrift: derivedMetrics.effectiveDrift,
    modelHealth: derivedMetrics.modelHealth,
    modelWeight: derivedMetrics.modelWeight,
    recordMonteCarloSnapshot
  });

  const memoizedStats = useMemo(() => ({
    statsData,
    simulationData: effectiveSimulationData,
    perSubjectProbs,
    projectDays,
    debouncedTarget,
    effectiveWeights,
    setWeights,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    projectedMean,
    currentMean,
    healthAdjustedProb: healthAdjustedProb ?? clamp(
      (probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5))),
      0,
      100
    ),
    ...derivedMetrics,
    equalWeightsMode,
    setEqualWeightsMode,
    calibrationPenalty,
    calibrationSummary,
    trendType: derivedMetrics.trendType || 'linear',
    effectiveDrift: derivedMetrics.effectiveDrift,
    modelHealth: derivedMetrics.modelHealth,
    modelWeight: derivedMetrics.modelWeight
  }), [
    statsData,
    effectiveSimulationData,
    perSubjectProbs,
    projectDays,
    debouncedTarget,
    effectiveWeights,
    setWeights,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    projectedMean,
    currentMean,
    healthAdjustedProb,
    derivedMetrics,
    equalWeightsMode,
    setEqualWeightsMode,
    calibrationPenalty,
    calibrationSummary,
    modelHealth
  ]);

  return useMemo(() => ({
    ...memoizedStats,
    isFlashing: false
  }), [memoizedStats]);
}

function useMonteCarloHistoryRecorder({
  activeId,
  simulationData,
  timeIndex,
  timelineDates,
  effectiveSimulateToday,
  projectDays,
  goalDate,
  debouncedTarget,
  currentMean,
  projectedMean,
  pAdjusted,
  ci95Low,
  ci95High,
  calibrationSummary,
  trendType,
  effectiveDrift,
  modelHealth,
  modelWeight,
  recordMonteCarloSnapshot
}) {
  const lastRecordTime = useRef(0);
  const lastRecordHash = useRef('');

  useEffect(() => {
    const prob = Number.isFinite(pAdjusted) ? pAdjusted : 0;
    const isTimeTraveling = timeIndex >= 0 && timeIndex < timelineDates.length - 1;

    if (
      simulationData?.status === 'ready' &&
      Number.isFinite(prob) &&
      prob >= 0 &&
      !effectiveSimulateToday &&
      !isTimeTraveling &&
      activeId
    ) {
      const doRecord = () => {
        const today = getDateKey(new Date());
        const currentProb = Number(prob.toFixed(1));

        const hash = `${activeId}-${today}-${currentProb}-${debouncedTarget.toFixed(1)}`;
        if (hash === lastRecordHash.current) return;

        const history = useAppStore.getState().appState?.contests?.[activeId]?.monteCarloHistory || [];
        const existing = Array.isArray(history) ? history.find(h => h.date === today) : null;

        const currentTarget = Number(debouncedTarget.toFixed(1));
        const existingProb = Number((existing?.probability ?? existing?.prob ?? 0).toFixed(1));
        const existingTarget = Number((existing?.target ?? 0).toFixed(1));

        const targetChanged = !existing || Math.abs(existingTarget - currentTarget) > 0.05;

        const isCICollapsed = existing && Number.isFinite(existing.mean) && Number.isFinite(existing.ci95Low)
          ? Math.abs(existing.mean - existing.ci95Low) < 0.01
          : false;

        const needsUpdate = !existing || existing.ci95Low === undefined || (isCICollapsed && projectDays > 0);
        const probChanged = existing && Math.abs(existingProb - currentProb) > 0.3;

        if (probChanged || targetChanged || needsUpdate) {
          lastRecordTime.current = Date.now();
          lastRecordHash.current = hash;

          recordMonteCarloSnapshot(today, prob, {
            mean: Number(currentMean.toFixed(2)),
            projectedMean: Number(projectedMean.toFixed(2)),
            ci95Low: Number(ci95Low.toFixed(2)),
            ci95High: Number(ci95High.toFixed(2)),
            target: Number(debouncedTarget.toFixed(2)),
            targetDate: goalDate,
            trendType: trendType || 'linear',
            effectiveDrift: Number((effectiveDrift || 0).toFixed(4)),
            calibrationBrier: calibrationSummary ? Number(calibrationSummary.avgBrier || 0).toFixed(4) : null,
            modelHealth: Number((modelHealth || 0.5).toFixed(3)),
            modelWeight: Number((modelWeight || 0.25).toFixed(3))
          });
        }
      };

      const now = Date.now();
      const timeSinceLast = now - lastRecordTime.current;

      if (timeSinceLast < 5000) {
        const timerId = setTimeout(doRecord, 5000 - timeSinceLast);
        return () => clearTimeout(timerId);
      } else {
        doRecord();
      }
    }
  }, [
    simulationData?.status,
    effectiveSimulateToday,
    recordMonteCarloSnapshot,
    timeIndex,
    timelineDates,
    currentMean,
    projectedMean,
    debouncedTarget,
    activeId,
    ci95Low,
    ci95High,
    pAdjusted,
    goalDate,
    projectDays,
    calibrationSummary,
    effectiveDrift,
    modelHealth,
    modelWeight,
    trendType
  ]);
}
```
