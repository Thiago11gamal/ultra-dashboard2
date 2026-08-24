/**
 * Utilitários de sanitização de scores e linhas de simulado.
 * Centraliza invariantes matemáticos para evitar dados impossíveis.
 */

export const SYNTHETIC_PERCENT_ONLY_TRIALS = 5;

export function getSyntheticTotal(_maxScore = 100, options = {}) {
  const trials = options?.syntheticTrials ?? SYNTHETIC_PERCENT_ONLY_TRIALS;
  return Number.isFinite(Number(trials)) && Number(trials) > 0 ? Number(trials) : SYNTHETIC_PERCENT_ONLY_TRIALS;
}

export function isPercentOnlyRecord(row) {
  return (
    row &&
    Number.isFinite(Number(row.score)) &&
    (!Number.isFinite(Number(row.total)) || Number(row.total) <= 0)
  );
}

export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toPoints(score, maxScore = 100, minScore = 0, mode = 'raw') {
  const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMin = Number.isFinite(Number(minScore)) && Number(minScore) >= 0 ? Number(minScore) : 0;
  const finalMin = Math.min(safeMin, safeMax);
  const finalMax = Math.max(safeMin, safeMax);
  const rawScore = Number(score);
  if (!Number.isFinite(rawScore)) return finalMin;

  if (mode === 'pct') {
    return clamp((rawScore / 100) * (finalMax - finalMin) + finalMin, finalMin, finalMax);
  }

  return clamp(rawScore, finalMin, finalMax);
}



export function formatValue(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';

  const safeDigits = Number.isFinite(Number(digits)) ? Math.max(0, Number(digits)) : 1;

  if (Math.abs(n) >= 1000) {
    return n.toLocaleString('pt-BR', { maximumFractionDigits: safeDigits, minimumFractionDigits: 0 });
  }

  if (Math.abs(n) >= 10) {
    return n.toFixed(Math.min(safeDigits, 1)).replace(/\.0$/, '').replace(/(\.\d*?)0+$/, '$1');
  }

  if (Math.abs(n) >= 1) {
    return n.toFixed(Math.max(1, safeDigits)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  if (Math.abs(n) > 0) {
    return n.toFixed(Math.max(2, safeDigits + 1)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  return '0';
}

export function formatPercent(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${formatValue(n, digits)}%`;
}

export {
  clampFinite,
  safeDomain,
  sanitizeMaxScore,
  pointsToPct,
  pctToPoints,
  ratioToPoints,
  toProb01,
  toProbPct,
  safeDivide,
  safeTime,
  normalizeSubjectKey,
  sortChronologically,
  latestByDate,
  resolveTargetPoints,
  normalizeScoreValue,
  getSafeScore,
  clampCorrectToTotal,
  sanitizeSimuladoRow,
  mergeQuestionResult,
  deduplicateSimulados,
  buildSimuladoDateSubjectKeys,
  migrateContestData
} from "./measurement.js";


