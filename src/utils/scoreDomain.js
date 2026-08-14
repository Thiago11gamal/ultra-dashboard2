/**
 * scoreDomain.js
 * 
 * Módulo centralizador de domínio para pontuações, normalização por amplitude,
 * clamping, conversão de escalas e formatação de unidades (%, pts, horas).
 */

import { formatDuration } from './dateHelper.js';
import { formatValue } from './scoreHelper.js';

const toNum = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/**
 * Normaliza e extrai limites seguros de domínio.
 * Garante que max >= min e range > 0.
 */
export function safeDomain(maxScore = 100, minScore = 0) {
  const safeMax = Math.max(1, toNum(maxScore, 100));
  const safeMin = Math.min(toNum(minScore, 0), safeMax);
  const range = Math.max(1e-9, safeMax - safeMin);
  return { min: safeMin, max: safeMax, range };
}

/**
 * Clampa um valor numérico dentro do domínio [minScore, maxScore].
 */
export function clampScore(value, { minScore = 0, maxScore = 100 } = {}) {
  const { min, max } = safeDomain(maxScore, minScore);
  const n = toNum(value, min);
  return Math.max(min, Math.min(max, n));
}

/**
 * Converte pontuação no domínio [minScore, maxScore] para razão [0, 1].
 */
export function scoreToRatio(score, { minScore = 0, maxScore = 100 } = {}) {
  const { min, max, range } = safeDomain(maxScore, minScore);
  const n = toNum(score, min);
  const clamped = Math.max(min, Math.min(max, n));
  return Math.max(0, Math.min(1, (clamped - min) / range));
}

/**
 * Converte razão [0, 1] para pontuação no domínio [minScore, maxScore].
 */
export function ratioToScore(ratio, { minScore = 0, maxScore = 100 } = {}) {
  const { min, range } = safeDomain(maxScore, minScore);
  const r = Math.max(0, Math.min(1, toNum(ratio, 0)));
  return min + r * range;
}

/**
 * Converte pontuação no domínio [minScore, maxScore] para percentual [0, 100].
 */
export function scoreToPct(score, { minScore = 0, maxScore = 100 } = {}) {
  return scoreToRatio(score, { minScore, maxScore }) * 100;
}

/**
 * Converte percentual [0, 100] para pontuação no domínio [minScore, maxScore].
 */
export function pctToScore(pct, { minScore = 0, maxScore = 100 } = {}) {
  return ratioToScore(toNum(pct, 0) / 100, { minScore, maxScore });
}

/**
 * Formata um valor respeitando a unidade informada (%, pts, horas, etc.).
 */
export function formatUnitValue(value, unit = '%') {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '—';
  }
  const n = Number(value);
  if (unit === 'horas') {
    return formatDuration(n);
  }
  if (unit === '%') {
    return `${formatValue(n)}%`;
  }
  return `${formatValue(n)}${unit}`;
}

/**
 * Verifica se um valor é pontuação finita e válida.
 */
export function isValidScore(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}
