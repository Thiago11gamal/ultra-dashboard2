/**
 * upliftModel.js
 *
 * Lote 11 — Causal Uplift Engine
 *
 * Estima o efeito causal de ações de estudo usando dados observacionais.
 *
 * Métodos:
 * - naive uplift;
 * - regression adjustment;
 * - IPTW (Inverse Probability of Treatment Weighting);
 * - Doubly Robust estimation;
 * - bootstrap opcional para intervalo de confiança.
 */

const CAUSAL_MODEL_KEY = 'coach_causal_model_v1';

export const DEFAULT_CAUSAL_COVARIATES = [
  'baselineScore',
  'volatility',
  'daysSince',
  'weight',
  'uncertainty',
];

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFinite(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function meanValues(values) {
  const finite = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length === 0) return 0;

  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

function sdValues(values) {
  const finite = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length < 2) return 0;

  const mean = meanValues(finite);

  const variance =
    finite.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    (finite.length - 1);

  return Math.sqrt(Math.max(0, variance));
}

function sigmoid(z) {
  const safeZ = clampFinite(z, -35, 35, 0);

  if (safeZ > 30) return 1;
  if (safeZ < -30) return 0;

  return 1 / (1 + Math.exp(-safeZ));
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quantileSorted(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return NaN;

  const safeP = clampFinite(p, 0, 1, 0.5);
  const idx = safeP * (sortedValues.length - 1);

  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sortedValues[lo];

  const t = idx - lo;
  return sortedValues[lo] * (1 - t) + sortedValues[hi] * t;
}

/**
 * Resolve sistema linear Ax = b usando eliminação gaussiana com pivoteamento.
 */
function solveLinearSystem(A, b) {
  const n = A.length;

  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotValue = Math.abs(M[col][col]);

    for (let row = col + 1; row < n; row++) {
      const currentValue = Math.abs(M[row][col]);

      if (currentValue > pivotValue) {
        pivotValue = currentValue;
        pivotRow = row;
      }
    }

    if (pivotValue < 1e-12) {
      continue;
    }

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];

    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;

      const factor = M[row][col];

      if (Math.abs(factor) < 1e-15) continue;

      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  return M.map((row, i) => {
    const diag = row[i];
    return Math.abs(diag) < 1e-12 ? 0 : row[n];
  });
}

/**
 * Regressão linear com ridge.
 *
 * X deve conter intercepto na primeira coluna.
 */
function fitLinearRegression(X, y, ridge = 1e-3) {
  const n = X.length;

  if (n === 0) return [];

  const p = X[0].length;

  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);

  for (let i = 0; i < n; i++) {
    const row = X[i];

    for (let j = 0; j < p; j++) {
      Xty[j] += row[j] * y[i];

      for (let k = 0; k < p; k++) {
        XtX[j][k] += row[j] * row[k];
      }
    }
  }

  for (let j = 0; j < p; j++) {
    // Não regularizar o intercepto.
    if (j > 0) {
      XtX[j][j] += ridge;
    }
  }

  return solveLinearSystem(XtX, Xty);
}

function predictLinear(coefficients, row) {
  if (!Array.isArray(coefficients) || !Array.isArray(row)) return 0;

  let sum = 0;

  for (let i = 0; i < Math.min(coefficients.length, row.length); i++) {
    sum += coefficients[i] * row[i];
  }

  return sum;
}

/**
 * Prepara eventos causais.
 *
 * Evento esperado:
 * {
 *   treated: boolean | 0 | 1,
 *   outcomeDelta: number,
 *   baselineScore: number,
 *   volatility: number,
 *   daysSince: number,
 *   weight: number,
 *   uncertainty: number,
 *   actionType: string
 * }
 */
export function prepareCausalEvents(events = [], options = {}) {
  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const rawEvents = safeArray(events)
    .map((event, index) => {
      const treatedRaw =
        event?.treated ??
        event?.completed ??
        event?.treatment ??
        event?.isTreated ??
        0;

      const treated =
        treatedRaw === true ||
        treatedRaw === 1 ||
        treatedRaw === '1' ||
        treatedRaw === 'true'
          ? 1
          : 0;

      const outcomeDelta = toFinite(event?.outcomeDelta, NaN);

      if (!Number.isFinite(outcomeDelta)) return null;

      const normalized = {
        id: event?.id || `causal-event-${index}`,
        timestamp: toFinite(event?.timestamp, Date.now()),
        treated,
        outcomeDelta: clampFinite(outcomeDelta, -maxScore, maxScore, 0),
        actionType: String(event?.actionType || event?.type || 'global'),
      };

      covariates.forEach((key) => {
        normalized[key] = toFinite(event?.[key], NaN);
      });

      return normalized;
    })
    .filter(Boolean);

  if (rawEvents.length === 0) return [];

  // Preenche covariáveis ausentes com média observada.
  covariates.forEach((key) => {
    const observed = rawEvents
      .map((event) => event[key])
      .filter((value) => Number.isFinite(value));

    const fillValue = observed.length > 0 ? meanValues(observed) : 0;

    rawEvents.forEach((event) => {
      if (!Number.isFinite(event[key])) {
        event[key] = fillValue;
      }
    });
  });

  return rawEvents;
}

/**
 * Uplift naive: média dos tratados - média dos controles.
 */
export function estimateNaiveUplift(events = []) {
  const safeEvents = safeArray(events).filter(
    (event) => Number.isFinite(event?.outcomeDelta)
  );

  if (safeEvents.length === 0) {
    return {
      method: 'naive',
      uplift: 0,
      sampleSize: 0,
      treatedCount: 0,
      controlCount: 0,
      diagnostics: null,
    };
  }

  const treated = safeEvents.filter((event) => event.treated === 1);
  const control = safeEvents.filter((event) => event.treated === 0);

  const treatedMean = meanValues(treated.map((event) => event.outcomeDelta));
  const controlMean = meanValues(control.map((event) => event.outcomeDelta));

  return {
    method: 'naive',
    uplift: Number((treatedMean - controlMean).toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount: treated.length,
    controlCount: control.length,
    diagnostics: {
      treatedMean: Number(treatedMean.toFixed(6)),
      controlMean: Number(controlMean.toFixed(6)),
    },
  };
}

function computeStandardizers(events, covariates) {
  return covariates.map((key) => {
    const values = events
      .map((event) => event[key])
      .filter((value) => Number.isFinite(value));

    const mean = values.length > 0 ? meanValues(values) : 0;
    const sd = values.length > 1 ? sdValues(values) : 1;

    return {
      key,
      mean,
      sd: Math.max(1e-6, sd),
    };
  });
}

function covariateVector(event, standardizers) {
  return standardizers.map((standardizer) => {
    const raw = toFinite(event?.[standardizer.key], standardizer.mean);
    return (raw - standardizer.mean) / standardizer.sd;
  });
}

/**
 * Uplift ajustado por regressão linear.
 */
export function estimateRegressionAdjustedUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 8 || treatedCount < 2 || controlCount < 2) {
    return {
      ...naive,
      method: 'naive_fallback_regression',
    };
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const X = safeEvents.map((event) => {
    return [
      1,
      event.treated,
      ...covariateVector(event, standardizers),
    ];
  });

  const y = safeEvents.map((event) => event.outcomeDelta);

  const coefficients = fitLinearRegression(X, y, options.ridge ?? 1e-3);

  const uplift = coefficients[1] || 0;

  return {
    method: 'regression_adjusted',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      coefficients: coefficients.map((c) => Number(c.toFixed(6))),
      covariates: ['intercept', 'treatment', ...covariates],
    },
  };
}

/**
 * Propensity score via regressão logística simples com gradiente descendente.
 */
function fitPropensityScores(events, standardizers, options = {}) {
  const treatedCount = events.filter((e) => e.treated === 1).length;
  const controlCount = events.length - treatedCount;

  const pTreat =
    events.length > 0
      ? clampFinite(treatedCount / events.length, 0.01, 0.99, 0.5)
      : 0.5;

  if (treatedCount === 0 || controlCount === 0) {
    return {
      probabilities: events.map(() => pTreat),
      pTreat,
    };
  }

  const p = standardizers.length;
  const weights = new Array(p + 1).fill(0);

  const iterations = Math.round(clampFinite(options.iterations, 20, 1000, 220));
  const learningRate = clampFinite(options.learningRate, 1e-4, 1, 0.05);
  const l2 = clampFinite(options.l2, 0, 1, 1e-3);

  const X = events.map((event) => [1, ...covariateVector(event, standardizers)]);
  const y = events.map((event) => event.treated);

  for (let iter = 0; iter < iterations; iter++) {
    const gradient = new Array(p + 1).fill(0);

    for (let i = 0; i < X.length; i++) {
      const row = X[i];

      let z = 0;
      for (let j = 0; j < row.length; j++) {
        z += weights[j] * row[j];
      }

      const pred = sigmoid(z);
      const error = pred - y[i];

      for (let j = 0; j < row.length; j++) {
        gradient[j] += error * row[j];
      }
    }

    for (let j = 0; j < weights.length; j++) {
      const regularization = j === 0 ? 0 : l2 * weights[j];
      weights[j] -= learningRate * (gradient[j] / X.length + regularization);
    }
  }

  const probabilities = X.map((row) => {
    let z = 0;

    for (let j = 0; j < row.length; j++) {
      z += weights[j] * row[j];
    }

    return clampFinite(sigmoid(z), 0.02, 0.98, pTreat);
  });

  return {
    probabilities,
    pTreat,
    weights,
  };
}

/**
 * IPTW uplift.
 */
export function estimateIPTWUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 10 || treatedCount < 3 || controlCount < 3) {
    return {
      ...naive,
      method: 'naive_fallback_iptw',
    };
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const propensity = fitPropensityScores(safeEvents, standardizers, options);

  const pTreat = propensity.pTreat;

  let weightedTreatedSum = 0;
  let weightedTreatedWeight = 0;

  let weightedControlSum = 0;
  let weightedControlWeight = 0;

  safeEvents.forEach((event, index) => {
    const e = clampFinite(propensity.probabilities[index], 0.05, 0.95, 0.5);

    if (event.treated === 1) {
      const weight = clampFinite(pTreat / e, 0.05, 20, 1);
      weightedTreatedSum += event.outcomeDelta * weight;
      weightedTreatedWeight += weight;
    } else {
      const weight = clampFinite((1 - pTreat) / (1 - e), 0.05, 20, 1);
      weightedControlSum += event.outcomeDelta * weight;
      weightedControlWeight += weight;
    }
  });

  const weightedTreatedMean =
    weightedTreatedWeight > 0
      ? weightedTreatedSum / weightedTreatedWeight
      : 0;

  const weightedControlMean =
    weightedControlWeight > 0
      ? weightedControlSum / weightedControlWeight
      : 0;

  const uplift = weightedTreatedMean - weightedControlMean;

  return {
    method: 'iptw',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      weightedTreatedMean: Number(weightedTreatedMean.toFixed(6)),
      weightedControlMean: Number(weightedControlMean.toFixed(6)),
      pTreat: Number(pTreat.toFixed(6)),
    },
  };
}

/**
 * Doubly Robust uplift.
 */
export function estimateDoublyRobustUplift(events = [], options = {}) {
  const safeEvents = safeArray(events).filter(
    (event) =>
      Number.isFinite(event?.outcomeDelta) &&
      Number.isFinite(event?.treated)
  );

  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const maxOutcome = clampFinite(
    options.maxOutcome ?? options.maxScore,
    1,
    1_000_000,
    100
  );

  const naive = estimateNaiveUplift(safeEvents);

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  if (safeEvents.length < 12 || treatedCount < 4 || controlCount < 4) {
    return estimateRegressionAdjustedUplift(safeEvents, options);
  }

  const standardizers = computeStandardizers(safeEvents, covariates);

  const propensity = fitPropensityScores(safeEvents, standardizers, options);

  const X = safeEvents.map((event) => [
    1,
    event.treated,
    ...covariateVector(event, standardizers),
  ]);

  const y = safeEvents.map((event) => event.outcomeDelta);

  const outcomeCoefficients = fitLinearRegression(
    X,
    y,
    options.ridge ?? 1e-3
  );

  let sumDR = 0;

  safeEvents.forEach((event, index) => {
    const e = clampFinite(propensity.probabilities[index], 0.05, 0.95, 0.5);

    const covariatesRow = covariateVector(event, standardizers);

    const mu1 = predictLinear(outcomeCoefficients, [1, 1, ...covariatesRow]);
    const mu0 = predictLinear(outcomeCoefficients, [1, 0, ...covariatesRow]);

    const observed = event.outcomeDelta;

    let drScore = mu1 - mu0;

    if (event.treated === 1) {
      drScore += (observed - mu1) / e;
    } else {
      drScore -= (observed - mu0) / (1 - e);
    }

    drScore = clampFinite(drScore, -maxOutcome, maxOutcome, 0);

    sumDR += drScore;
  });

  const uplift = safeEvents.length > 0 ? sumDR / safeEvents.length : 0;

  return {
    method: 'doubly_robust',
    uplift: Number(uplift.toFixed(6)),
    sampleSize: safeEvents.length,
    treatedCount,
    controlCount,
    diagnostics: {
      naiveUplift: naive.uplift,
      pTreat: Number(propensity.pTreat.toFixed(6)),
      meanDRScore: Number(uplift.toFixed(6)),
    },
  };
}

/**
 * Estimador principal.
 */
export function estimateCausalUplift(events = [], options = {}) {
  const covariates = Array.isArray(options.covariates)
    ? options.covariates
    : DEFAULT_CAUSAL_COVARIATES;

  const safeEvents = prepareCausalEvents(events, {
    ...options,
    covariates,
  });

  if (safeEvents.length === 0) {
    return {
      method: 'none',
      uplift: 0,
      sampleSize: 0,
      treatedCount: 0,
      controlCount: 0,
      diagnostics: null,
    };
  }

  const treatedCount = safeEvents.filter((e) => e.treated === 1).length;
  const controlCount = safeEvents.length - treatedCount;

  let method = options.method || 'auto';

  if (method === 'auto') {
    if (
      safeEvents.length >= 30 &&
      treatedCount >= 10 &&
      controlCount >= 10
    ) {
      method = 'doubly_robust';
    } else if (
      safeEvents.length >= 12 &&
      treatedCount >= 3 &&
      controlCount >= 3
    ) {
      method = 'regression_adjusted';
    } else {
      method = 'naive';
    }
  }

  let estimate = null;

  if (method === 'doubly_robust') {
    estimate = estimateDoublyRobustUplift(safeEvents, options);
  } else if (method === 'iptw') {
    estimate = estimateIPTWUplift(safeEvents, options);
  } else if (method === 'regression_adjusted') {
    estimate = estimateRegressionAdjustedUplift(safeEvents, options);
  } else {
    estimate = estimateNaiveUplift(safeEvents);
  }

  if (!estimate || !Number.isFinite(estimate.uplift)) {
    estimate = estimateNaiveUplift(safeEvents);
  }

  let ci = null;

  const bootstrapIterations = Math.round(
    clampFinite(options.bootstrapIterations, 0, 1000, 0)
  );

  if (bootstrapIterations > 0 && safeEvents.length >= 8) {
    const seed = options.seed ?? `causal-bootstrap-${safeEvents.length}`;
    const rng = mulberry32(hashSeed(seed));

    const bootstrapEstimates = [];

    for (let i = 0; i < bootstrapIterations; i++) {
      const sample = [];

      for (let j = 0; j < safeEvents.length; j++) {
        const idx = Math.floor(rng() * safeEvents.length);
        sample.push(safeEvents[idx]);
      }

      try {
        let sampleEstimate = null;

        if (method === 'doubly_robust') {
          sampleEstimate = estimateDoublyRobustUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else if (method === 'iptw') {
          sampleEstimate = estimateIPTWUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else if (method === 'regression_adjusted') {
          sampleEstimate = estimateRegressionAdjustedUplift(sample, {
            ...options,
            bootstrapIterations: 0,
          });
        } else {
          sampleEstimate = estimateNaiveUplift(sample);
        }

        if (Number.isFinite(sampleEstimate?.uplift)) {
          bootstrapEstimates.push(sampleEstimate.uplift);
        }
      } catch {
        // ignore bootstrap sample failures
      }
    }

    if (bootstrapEstimates.length >= 10) {
      const sorted = [...bootstrapEstimates].sort((a, b) => a - b);

      ci = {
        low: Number(quantileSorted(sorted, 0.025).toFixed(6)),
        high: Number(quantileSorted(sorted, 0.975).toFixed(6)),
        iterations: bootstrapEstimates.length,
      };
    }
  }

  return {
    ...estimate,
    ci,
    covariates,
  };
}

/**
 * Estima uplift por tipo de ação.
 */
export function estimateUpliftByAction(events = [], options = {}) {
  const safeEvents = prepareCausalEvents(events, options);

  const minSamplesPerAction = Math.round(
    clampFinite(options.minSamplesPerAction, 3, 200, 8)
  );

  const groups = {};

  safeEvents.forEach((event) => {
    const actionType = event.actionType || 'global';

    if (!groups[actionType]) {
      groups[actionType] = [];
    }

    groups[actionType].push(event);
  });

  const actions = {};

  Object.entries(groups).forEach(([actionType, groupEvents]) => {
    if (groupEvents.length < minSamplesPerAction) return;

    actions[actionType] = estimateCausalUplift(groupEvents, {
      ...options,
      bootstrapIterations:
        options.bootstrapActions === true
          ? options.bootstrapIterations ?? 80
          : 0,
    });
  });

  const global =
    safeEvents.length >= minSamplesPerAction
      ? estimateCausalUplift(safeEvents, options)
      : estimateNaiveUplift(safeEvents);

  return {
    global,
    actions,
    sampleSize: safeEvents.length,
    actionCounts: Object.fromEntries(
      Object.entries(groups).map(([actionType, groupEvents]) => [
        actionType,
        groupEvents.length,
      ])
    ),
  };
}

/**
 * Normaliza uplift para escala de decisão.
 */
export function normalizeCausalUplift(uplift, maxScore = 100) {
  const safeMaxScore = clampFinite(maxScore, 1, 1_000_000, 100);
  const safeUplift = toFinite(uplift, 0);

  const scale = safeMaxScore * 0.15;

  return clampFinite(0.5 + safeUplift / scale, 0, 1, 0.5);
}

/**
 * Salva modelo causal.
 */
export function saveCausalModel(model) {
  try {
    localStorage.setItem(CAUSAL_MODEL_KEY, JSON.stringify(model || {}));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega modelo causal.
 */
export function loadCausalModel() {
  try {
    const raw = localStorage.getItem(CAUSAL_MODEL_KEY);
    const parsed = JSON.parse(raw || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Limpa modelo causal.
 */
export function clearCausalModel() {
  try {
    localStorage.removeItem(CAUSAL_MODEL_KEY);
  } catch {
    // ignore
  }
}

export default {
  DEFAULT_CAUSAL_COVARIATES,
  prepareCausalEvents,
  estimateNaiveUplift,
  estimateRegressionAdjustedUplift,
  estimateIPTWUplift,
  estimateDoublyRobustUplift,
  estimateCausalUplift,
  estimateUpliftByAction,
  normalizeCausalUplift,
  saveCausalModel,
  loadCausalModel,
  clearCausalModel,
};
