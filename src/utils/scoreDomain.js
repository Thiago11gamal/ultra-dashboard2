const isStrictNum = (val) => val !== null && val !== undefined && typeof val !== 'boolean' && String(val).trim() !== '' && Number.isFinite(Number(val));

export function safeDomain(maxScore = 100, minScore = 0) {
  let max = isStrictNum(maxScore) ? Number(maxScore) : 100;
  let min = isStrictNum(minScore) ? Number(minScore) : 0;
  if (min > max) { const tmp = min; min = max; max = tmp; }
  const range = Math.max(1e-9, max - min);
  return { min, max, range };
}

export function clampScore(val, options = {}) {
  const { min, max } = safeDomain(options.maxScore ?? 100, options.minScore ?? 0);
  if (!isStrictNum(val)) return min;
  const n = Number(val);
  return Math.min(max, Math.max(min, n));
}

export function scoreToRatio(score, options = {}) {
  const { min, range } = safeDomain(options.maxScore, options.minScore);
  if (!isStrictNum(score)) return 0;
  const s = Number(score);
  return Math.max(0, Math.min(1, (s - min) / range));
}

export function ratioToScore(ratio, options = {}) {
  const { min, max, range } = safeDomain(options.maxScore, options.minScore);
  if (!isStrictNum(ratio)) return min;
  const r = Math.max(0, Math.min(1, Number(ratio)));
  return Math.max(min, Math.min(max, min + r * range));
}

export function scoreToPct(score, options = {}) {
  return scoreToRatio(score, options) * 100;
}

export function pctToScore(pct, options = {}) {
  const r = isStrictNum(pct) ? Math.max(0, Math.min(1, Number(pct) / 100)) : 0;
  return ratioToScore(r, options);
}

export function formatUnitValue(val, unit = '%') {
  const n = isStrictNum(val) ? Number(val) : NaN;
  if (!Number.isFinite(n)) return `0${unit}`;
  if (unit === 'horas') {
    const sign = n < 0 ? '-' : '';
    const totalMinutes = Math.round(Math.abs(n) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${sign}${h}h${m.toString().padStart(2, '0')}` : `${sign}${h}h`;
  }
  return `${n}${unit}`;
}

export function normalizeScoreToTargetScale(rawScore, currentMaxScore, targetMaxScore, currentMinScore = 0, targetMinScore = 0) {
  const currentDom = safeDomain(currentMaxScore, currentMinScore);
  const targetDom = safeDomain(targetMaxScore, targetMinScore);
  const safeScore = clampScore(rawScore, { minScore: currentDom.min, maxScore: currentDom.max });
  if (currentDom.min === targetDom.min && currentDom.max === targetDom.max) return safeScore;
  const ratio = (safeScore - currentDom.min) / currentDom.range;
  return targetDom.min + ratio * targetDom.range;
}

export function detectCommonScales(categories) {
  const safeCategories = (Array.isArray(categories) ? categories : Object.values(categories || {})).filter(Boolean);
  const scales = new Set(
    safeCategories
      .map(c => Number(c.maxScore))
      .filter(s => Number.isFinite(s) && s > 0)
  );
  const domains = new Set(
    safeCategories.map(c => {
      const { min, max } = safeDomain(c.maxScore ?? 100, c.minScore ?? 0);
      return `${min}:${max}`;
    })
  );

  return {
    isMixedScale: domains.size > 1 || scales.size > 1,
    scales: Array.from(scales).sort((a,b) => b - a),
    globalScale: scales.size > 0 ? Array.from(scales).reduce((a, b) => Math.max(a, b), -Infinity) : 100
  };
}

