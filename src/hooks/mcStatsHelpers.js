/**
 * mcStatsHelpers.js
 * Funções puras e cache de simulação por disciplina extraídos de useMonteCarloStats.js
 * para reduzir acoplamento e facilitar manutenção/testes.
 */

export const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

export const safeClamp = (value, min, max, fallback = null) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback !== null && fallback !== undefined
      ? fallback
      : (min + max) / 2;
  }
  return Math.min(max, Math.max(min, n));
};

export const shrinkToNeutral = (p, factor, neutral = 50) => {
  const safeP = Number.isFinite(p) ? p : neutral;
  const safeFactor = clamp(factor, 0, 1);
  return neutral + (safeP - neutral) * (1 - safeFactor);
};

export const calibrateSpreadWithFloor = (rawSD, aleatoricFloor, penalty) => {
  const safeSD = Number.isFinite(Number(rawSD)) ? Math.max(0, Number(rawSD)) : 0;
  if (safeSD <= 0 || penalty <= 0) return safeSD;
  const epistemic = Math.max(0, safeSD - aleatoricFloor);
  return Math.min(safeSD, aleatoricFloor) + (epistemic * (1 + penalty * 2.5));
};

export const expandCIWithRatio = (ci, ratio, minBound, maxBound) => {
  if (!ci || !Number.isFinite(ratio) || ratio <= 1) return ci;
  const low = Number(ci.ciLow ?? ci.low);
  const high = Number(ci.ciHigh ?? ci.high);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return ci;
  const mid = (low + high) / 2;
  const newLow = Math.max(minBound, mid - (mid - low) * ratio);
  const newHigh = Math.min(maxBound, mid + (high - mid) * ratio);
  return { ...ci, ciLow: newLow, ciHigh: newHigh, low: newLow, high: newHigh };
};

export const sanitizeCutoffValue = (val) => {
  if (val === null || val === undefined || typeof val === 'boolean') return null;
  if (typeof val === 'string' && val.trim() === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

export const buildSubjectsOpts = (statsObj, subjectImmunityMap, { isFuture, minScoreVal, maxScoreVal }) => {
  const cats = Array.isArray(statsObj?.categoryStats) ? statsObj.categoryStats : [];
  const baseSubjects = cats.map(c => {
    const subjName = c.name || c.key || '';
    const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;
    const catMin = Number.isFinite(Number(c.minScore)) ? Number(c.minScore) : minScoreVal;
    const catMax = Number.isFinite(Number(c.maxScore)) && Number(c.maxScore) > catMin ? Number(c.maxScore) : Math.max(catMin + 1, maxScoreVal);
    const rawMean = isFuture
      ? (c.bayesianMean ?? c.mean)
      : (c.temporalBayesianMean ?? c.bayesianMean ?? c.mean);
    return {
      name: subjName,
      mean: rawMean,
      sd: isFuture ? (c.volatility ?? c.sd) : (c.bayesianSd ?? c.sd),
      minCutoff: sanitizeCutoffValue(c.minCutoff),
      examGroup: c.examGroup || null,
      maxScore: catMax,
      minScore: catMin,
      immunityFactor: immunity,
      weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
    };
  });

  if (isFuture || baseSubjects.length === 0 || !Number.isFinite(Number(statsObj?.bayesianMean))) {
    return baseSubjects;
  }

  const globalSpan = Math.max(1e-9, maxScoreVal - minScoreVal);
  const targetProp = clamp((Number(statsObj.bayesianMean) - minScoreVal) / globalSpan, 0, 1);
  let wSum = 0;
  let propSum = 0;
  const props = baseSubjects.map(s => {
    const sSpan = Math.max(1e-9, s.maxScore - s.minScore);
    const p = clamp((Number(s.mean) - s.minScore) / sSpan, 0, 1);
    wSum += s.weight;
    propSum += p * s.weight;
    return { p, sSpan };
  });
  const compositeProp = wSum > 0 ? propSum / wSum : targetProp;
  const shiftProp = targetProp - compositeProp;
  if (Math.abs(shiftProp) <= 1e-6) return baseSubjects;

  return baseSubjects.map((s, idx) => {
    const adjustedProp = clamp(props[idx].p + shiftProp, 0, 1);
    return { ...s, mean: s.minScore + adjustedProp * props[idx].sSpan };
  });
};

const SUBJECT_SIM_CACHE = new Map();
const SUBJECT_SIM_TTL_MS = 60000;
const SUBJECT_SIM_MAX_SIZE = 100;

export function getCachedSubjectSim(key) {
  const entry = SUBJECT_SIM_CACHE.get(key);
  if (!entry) return null;
  if (!Number.isFinite(entry?.timestamp) || Date.now() - entry.timestamp > SUBJECT_SIM_TTL_MS) {
    SUBJECT_SIM_CACHE.delete(key);
    return null;
  }
  return entry.result;
}

export function setCachedSubjectSim(key, result) {
  const now = Date.now();
  for (const [k, v] of SUBJECT_SIM_CACHE.entries()) {
    if (!Number.isFinite(v?.timestamp) || now - v.timestamp > SUBJECT_SIM_TTL_MS) {
      SUBJECT_SIM_CACHE.delete(k);
    }
  }
  if (SUBJECT_SIM_CACHE.size >= SUBJECT_SIM_MAX_SIZE) {
    const oldest = SUBJECT_SIM_CACHE.keys().next().value;
    if (oldest !== undefined) SUBJECT_SIM_CACHE.delete(oldest);
  }
  SUBJECT_SIM_CACHE.set(key, { result, timestamp: now });
}
