const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const toNum = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);

function safeDomain(maxScore, minScore) {
  const max = Math.max(1, toNum(maxScore, 100));
  const min = Math.min(toNum(minScore, 0), max);
  return { max, min, range: Math.max(1e-9, max - min) };
}

/** Razão [0,1] → pontos */
export function ratioToPoints(ratio, maxScore, minScore = 0) {
  const { min, range } = safeDomain(maxScore, minScore);
  return min + clamp(toNum(ratio, 0), 0, 1) * range;
}

/** Percentual [0,100] → pontos */
export function pctToPoints(pct, maxScore, minScore = 0) {
  return ratioToPoints(toNum(pct, 0) / 100, maxScore, minScore);
}

/** Pontos → razão [0,1] */
export function pointsToRatio(points, maxScore, minScore = 0) {
  const { min, range } = safeDomain(maxScore, minScore);
  return clamp((toNum(points, min) - min) / range, 0, 1);
}

/** Pontos → percentual [0,100] do intervalo útil */
export function pointsToPct(points, maxScore, minScore = 0) {
  return pointsToRatio(points, maxScore, minScore) * 100;
}

/** Nota → fração de acertos (posição no intervalo útil) */
export function toAccuracyRatio(score, maxScore, minScore = 0) {
  return pointsToRatio(score, maxScore, minScore);
}

/** Fração de acerto → contagem, clampada em [0, total] */
export function ratioToCorrect(ratio, total) {
  const t = Math.max(0, toNum(total, 0));
  return clamp(toNum(ratio, 0) * t, 0, t);
}

/** Formata valor com unidade */
export function formatUnitValue(val, unit = "%") {
  const n = Number(val);
  if (!Number.isFinite(n)) return `0${unit}`;
  if (unit === "horas") {
    const h = Math.floor(n);
    const m = Math.round((n - h) * 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
  }
  return `${n}${unit}`;
}
