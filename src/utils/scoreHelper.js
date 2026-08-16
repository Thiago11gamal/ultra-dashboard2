/**
 * Utilitários de sanitização de scores e linhas de simulado.
 * Centraliza invariantes matemáticos para evitar dados impossíveis.
 */

/**
 * Volume sintético conservador para registros puramente percentuais.
 * Reduzido de 20 para 5 para evitar inflação de volume.
 */
export const SYNTHETIC_PERCENT_ONLY_TRIALS = 5;

/**
 * Retorna o "peso sintético" (em número de questões) para registros
 * que possuem APENAS percentual, sem total real.
 *
 * ⚠️ Consumidores devem tratar `synthetic: true` como baixa confiança.
 */
export function getSyntheticTotal(_maxScore = 100, options = {}) {
  const trials = options?.syntheticTrials ?? SYNTHETIC_PERCENT_ONLY_TRIALS;
  return trials;
}

/**
 * Detecta se um registro deve ser tratado como "somente percentual"
 * (baixa confiança estatística) — usado por engines de Pareto, tempo, etc.
 */
export function isPercentOnlyRecord(row) {
  return (
    row &&
    Number.isFinite(Number(row.score)) &&
    (!Number.isFinite(Number(row.total)) || Number(row.total) <= 0)
  );
}

/**
 * Normaliza linha de simulado garantindo invariantes matemáticos:
 *  - total >= 0
 *  - 0 <= correct <= total
 *  - score em [0, maxScore]
 *  - pct em [0, 100]
 *
 * Retorna a linha sanitizada e um `_warnings` array.
 */
export function sanitizeSimuladoRow(row, maxScore = 100) {
  const warnings = [];
  const safeMax = Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100;

  let total = Math.max(0, Math.trunc(Number(row?.total)) || 0);
  let correct = Math.max(0, Math.trunc(Number(row?.correct)) || 0);

  if (correct > total && total > 0) {
    warnings.push(`correct(${correct}) > total(${total}) → clampado para ${total}`);
    correct = total;
  }

  const pct = total > 0 ? (correct / total) * 100 : 0;
  const score = total > 0 ? (correct / total) * safeMax : 0;

  return {
    ...row,
    total,
    correct,
    pct: Math.max(0, Math.min(100, pct)),
    score: Math.max(0, Math.min(safeMax, score)),
    _warnings: warnings,
  };
}

/**
 * Sanitiza score individual garantindo que está dentro do range [minScore, maxScore].
 */
export function getSafeScore(row, maxScore = 100, minScore = 0) {
  const safeMax = Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100;
  const safeMin = Number.isFinite(minScore) && minScore >= 0 ? minScore : 0;

  // Se tem total e correct, calcula score proporcional
  if (Number.isFinite(row?.total) && row.total > 0 && Number.isFinite(row?.correct)) {
    const clamped = Math.max(0, Math.min(row.total, row.correct));
    return (clamped / row.total) * safeMax;
  }

  // Se tem score direto, clamp
  const score = Number(row?.score);
  if (Number.isFinite(score)) {
    return Math.max(safeMin, Math.min(safeMax, score));
  }

  return null;
}

/**
 * Clamp genérico para valores numéricos.
 */
export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Retorna um número finito ou fallback.
 */
export function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Converte score bruto em pontos (preservando valor).
 * Modo 'raw' (padrão): retorna score como está.
 * Modo 'pct': interpreta score como percentagem e converte para pontos.
 */
export function toPoints(score, maxScore = 100, minScore = 0, mode = 'raw') {
  // ✅ FIX #9: Validar e respeitar intervalo [minScore, maxScore]
  const rawMax = Number(maxScore);
  const rawMin = Number(minScore);
  const safeMax = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
  const safeMin = Number.isFinite(rawMin) && rawMin >= 0 ? rawMin : 0;
  // Garantir que minScore <= maxScore
  const finalMin = Math.min(safeMin, safeMax);
  const finalMax = Math.max(safeMin, safeMax);
  
  const rawScore = Number(score);
  if (!Number.isFinite(rawScore)) return finalMin;
  
  if (mode === 'pct') {
    // Interpreta como percentagem: 80 => 80% de (maxScore - minScore) + minScore
    const result = (rawScore / 100) * (finalMax - finalMin) + finalMin;
    return Math.max(finalMin, Math.min(finalMax, result));
  }
  
  // Modo 'raw': retorna score como está, clampado ao intervalo [minScore, maxScore]
  return Math.max(finalMin, Math.min(finalMax, rawScore));
}

/**
 * Converte percentagem em pontos.
 * Ex: pctToPoints(80, 200) => 160 pontos
 */
export function pctToPoints(pct, maxScore = 100) {
  const safeMax = Math.max(1, Number(maxScore) || 100);
  const safePct = Math.max(0, Math.min(100, Number(pct) || 0));
  return (safePct / 100) * safeMax;
}

/**
 * Converte pontos em percentagem.
 * Ex: toPct(80, 200) => 40% (80/200 = 0.4 = 40%)
 */
export function toPct(points, maxScore = 100) {
  const rawMax = Number(maxScore);
  const safeMax = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
  const safePoints = Math.max(0, Math.min(safeMax, Number(points) || 0));
  // ✅ FIX #4: Garantir que resultado está sempre no intervalo [0, 100]
  const result = (safePoints / safeMax) * 100;
  return Math.max(0, Math.min(100, result));
}

/**
 * Alias: converte pontos brutos em percentagem.
 */
export function pointsToPct(points, maxScore = 100) {
  return toPct(points, maxScore);
}

// ✅ LOTE-01 FIX (C2): registro sem score E sem total/correct é INVÁLIDO.
// O "return 0" anterior passava pelos filtros `safeScore >= 0` e injetava
// zeros falsos no histórico, corrompendo média, regressão e Monte Carlo.

