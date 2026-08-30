export function safeDomain(maxScore = 100, minScore = 0) {
  let max = Number.isFinite(Number(maxScore)) ? Number(maxScore) : 100;
  let min = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  if (min > max) { const tmp = min; min = max; max = tmp; }
  const range = Math.max(1e-9, max - min);
  return { min, max, range };
}

export function clampScore(val, options = {}) {
  const min = options.minScore ?? 0;
  const max = options.maxScore ?? 100;
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function scoreToRatio(score, options = {}) {
  const { min, range } = safeDomain(options.maxScore, options.minScore);
  const s = Number(score);
  if (!Number.isFinite(s)) return 0;
  return (s - min) / range;
}

export function ratioToScore(ratio, options = {}) {
  const { min, range } = safeDomain(options.maxScore, options.minScore);
  const r = Number(ratio);
  if (!Number.isFinite(r)) return min;
  return min + r * range;
}

export function scoreToPct(score, options = {}) {
  return scoreToRatio(score, options) * 100;
}

export function pctToScore(pct, options = {}) {
  const p = Number(pct);
  const r = Number.isFinite(p) ? p / 100 : 0;
  return ratioToScore(r, options);
}

export function formatUnitValue(val, unit = '%') {
  const n = Number(val);
  if (!Number.isFinite(n)) return `0${unit}`;
  if (unit === 'horas') {
    const h = Math.floor(n);
    const m = Math.round((n - h) * 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  }
  return `${n}${unit}`;
}

export function normalizeScoreToTargetScale(rawScore, currentMaxScore, targetMaxScore) {
  const safeScore = Number.isFinite(Number(rawScore)) ? Number(rawScore) : 0;
  const currentMax = Number.isFinite(Number(currentMaxScore)) && currentMaxScore > 0 ? Number(currentMaxScore) : 100;
  const targetMax = Number.isFinite(Number(targetMaxScore)) && targetMaxScore > 0 ? Number(targetMaxScore) : 100;
  
  if (currentMax === targetMax) return safeScore;
  return (safeScore / currentMax) * targetMax;
}

export function detectCommonScales(categories) {
  const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});
  const scales = new Set(
    safeCategories
      .map(c => Number(c.maxScore))
      .filter(s => Number.isFinite(s) && s > 0)
  );
  
  return {
    isMixedScale: scales.size > 1,
    scales: Array.from(scales).sort((a,b) => b - a),
    globalScale: scales.size > 0 ? Array.from(scales).reduce((a, b) => Math.max(a, b), -Infinity) : 100
  };
}

