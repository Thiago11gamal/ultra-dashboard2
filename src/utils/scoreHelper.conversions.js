// ============================================================================
// scoreHelper.conversions.js
// Fonte única de verdade para conversão de unidades de nota.
//
// REGRA DE OURO: a unidade é SEMPRE declarada pelo chamador.
// NUNCA auto-detectar (a auto-detecção é a raiz dos bugs toPoints/toPct:
// uma nota bruta "1" é indistinguível de "razão 1.0 = 100%" sem contexto).
//
// Substitua as heurísticas toPoints()/toPct() do scoreHelper.js por estas
// funções explícitas e atualize os call sites para a função correta.
// ============================================================================

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const toNum = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);

function safeDomain(maxScore, minScore) {
  const max = Math.max(1, toNum(maxScore, 100));
  const min = Math.min(toNum(minScore, 0), max);
  return { max, min, range: Math.max(1e-9, max - min) };
}

/** Razão [0,1] → pontos na escala [minScore, maxScore]. */
export function ratioToPoints(ratio, maxScore, minScore = 0) {
  const { min, range } = safeDomain(maxScore, minScore);
  return min + clamp(toNum(ratio, 0), 0, 1) * range;
}

/** Percentual [0,100] → pontos na escala. */
export function pctToPoints(pct, maxScore, minScore = 0) {
  return ratioToPoints(toNum(pct, 0) / 100, maxScore, minScore);
}

/** Pontos na escala → razão [0,1] (posição no intervalo útil). */
export function pointsToRatio(points, maxScore, minScore = 0) {
  const { min, range } = safeDomain(maxScore, minScore);
  return clamp((toNum(points, min) - min) / range, 0, 1);
}

/** Pontos na escala → percentual [0,100] do intervalo útil. */
export function pointsToPct(points, maxScore, minScore = 0) {
  return pointsToRatio(points, maxScore, minScore) * 100;
}

/**
 * Fração de acertos derivada de uma nota — "quantas questões efetivamente certas".
 * score ∈ [minScore,maxScore] → razão [0,1] relativa ao intervalo útil.
 * (Convenção usada por CriticalTopics/Subtopics/subjectAgg.)
 */
export function toAccuracyRatio(score, maxScore, minScore = 0) {
  return pointsToRatio(score, maxScore, minScore);
}

/** Razão de acerto → contagem de acertos, clampada em [0, total]. */
export function ratioToCorrect(ratio, total) {
  const t = Math.max(0, toNum(total, 0));
  return clamp(toNum(ratio, 0) * t, 0, t);
}
