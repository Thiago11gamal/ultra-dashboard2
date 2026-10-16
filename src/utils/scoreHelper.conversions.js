const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const toNum = (v, fb = 0) => {
  if (v === null || v === undefined || v === '') return fb;
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

function safeDomain(maxScore, minScore) {
  let max = toNum(maxScore, 100);
  let min = toNum(minScore, 0);
  if (min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  return { max, min, range: Math.max(1e-9, max - min) };
}

export function ratioToPoints(ratio, maxScore, minScore = 0) {
  const { min, range } = safeDomain(maxScore, minScore);
  return min + clamp(toNum(ratio, 0), 0, 1) * range;
}

export function pctToPoints(pct, maxScore, minScore = 0) {
  return ratioToPoints(toNum(pct, 0) / 100, maxScore, minScore);
}

export function pointsToRatio(points, maxScore, minScore = 0) {
  const { min, range } = safeDomain(maxScore, minScore);
  return clamp((toNum(points, min) - min) / range, 0, 1);
}

export function pointsToPct(points, maxScore, minScore = 0) {
  return pointsToRatio(points, maxScore, minScore) * 100;
}

export function toAccuracyRatio(score, maxScore, minScore = 0) {
  return pointsToRatio(score, maxScore, minScore);
}

export function ratioToCorrect(ratio, total) {
  const t = Math.max(0, toNum(total, 0));
  return clamp(toNum(ratio, 0) * t, 0, t);
}

export function formatUnitValue(val, unit = "%") {
  const n = val !== null && val !== '' ? Number(val) : NaN;
  if (!Number.isFinite(n)) return `0${unit}`;
  if (unit === "horas") {
    const sign = n < 0 ? "-" : "";
    const totalMinutes = Math.round(Math.abs(n) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${sign}${h}h${m.toString().padStart(2, "0")}` : `${sign}${h}h`;
  }
  return `${n}${unit}`;
}
