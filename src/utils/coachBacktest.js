/**
 * coachBacktest.js
 *
 * Métricas de backtest: NDCG, Uplift, Erro Calibrado.
 */
import { safeArray } from './coachSafe.js';

function clampRelevance(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(10, n);
}

/**
 * Calcula NDCG@K.
 * FIX (BUG-40 & BUG-08): proteção contra divisão por zero (idcg <= 0),
 * overflow exponencial (2 ** rel) e validação via safeArray.
 */
export function computeNDCGAtK(predicted = [], actual = [], k = 5) {
  const safePredicted = safeArray(predicted);
  const safeActual = safeArray(actual);

  // BUG: k <= 0 ou não-finito gerava slice/loop inválido.
  const topK = Number.isFinite(k) && k > 0 ? Math.floor(k) : 5;
  if (topK <= 0) return 0;

  if (safePredicted.length === 0 || safeActual.length === 0) return 0;

  const relevanceMap = new Map();

  safeActual.forEach((item, idx) => {
    const id = String(item?.id || item?.topic || idx);
    // FIX (BUG-28): manter a MAIOR relevância em caso de duplicata
    const existing = relevanceMap.get(id) || 0;
    relevanceMap.set(id, Math.max(existing, clampRelevance(item?.relevance ?? item?.score ?? 1)));
  });

  let dcg = 0;

  safePredicted.slice(0, topK).forEach((item, idx) => {
    const id = String(item?.id || item?.topic || idx);
    const rel = clampRelevance(relevanceMap.get(id) || 0);

    // BUG: relevância alta demais podia estourar Math.pow(2, rel).
    const safeRel = Math.min(10, Math.max(0, rel));
    const gain = Math.pow(2, safeRel) - 1;
    const discount = Math.log2(idx + 2);

    dcg += Number.isFinite(gain) && Number.isFinite(discount) && discount > 0
      ? gain / discount
      : 0;
  });

  const ideal = [...safeActual].sort((a, b) => {
    const diff = (Number(b?.relevance) || 0) - (Number(a?.relevance) || 0);
    if (diff !== 0) return diff;

    const idA = String(a?.id || '');
    const idB = String(b?.id || '');
    return idA.localeCompare(idB);
  });

  const idcg = ideal.slice(0, topK).reduce((acc, item, idx) => {
    const rel = clampRelevance(item?.relevance);
    const safeRel = Math.min(10, Math.max(0, rel));
    const gain = Math.pow(2, safeRel) - 1;
    const discount = Math.log2(idx + 2);

    return acc + (
      Number.isFinite(gain) && Number.isFinite(discount) && discount > 0
        ? gain / discount
        : 0
    );
  }, 0);

  if (!Number.isFinite(idcg) || idcg <= 0) return 0;
  if (!Number.isFinite(dcg)) return 0;

  return Math.min(1.0, Math.max(0.0, dcg / idcg));
}

/**
 * Calcula uplift: média(treatment) − média(control).
 */
export function computeUplift(control = [], treatment = []) {
  const safeControl = safeArray(control).map(Number).filter(Number.isFinite);
  const safeTreatment = safeArray(treatment).map(Number).filter(Number.isFinite);

  if (safeControl.length === 0 || safeTreatment.length === 0) return null;

  const meanControl = safeControl.reduce((a, b) => a + b, 0) / safeControl.length;
  const meanTreatment = safeTreatment.reduce((a, b) => a + b, 0) / safeTreatment.length;
  return meanTreatment - meanControl;
}

/**
 * Calcula erro calibrado entre probabilidade prevista e resultado binário.
 */
export function computeCalibratedError(probability, actual, scale = 'auto') {
  const rawP = Number(probability);
  if (!Number.isFinite(rawP)) return null;

  const normalizedP =
    scale === 'pct' || (scale === 'auto' && rawP > 1)
      ? rawP / 100
      : rawP;
  const p = Math.max(0, Math.min(1, normalizedP));
  const yRaw = Number(actual);
  const y = Number.isFinite(yRaw) ? (yRaw >= 0.5 ? 1 : 0) : (actual === true ? 1 : 0);
  return Math.abs(p - y);
}

/**
 * Compara duas execuções de estratégia.
 */
export function compareStrategyRuns(runA = {}, runB = {}, metrics = ['ndcg']) {
  const safeMetrics = Array.isArray(metrics) && metrics.length > 0 ? metrics : ['ndcg'];
  const results = { delta: {}, winner: null };
  let scoreA = 0;
  let scoreB = 0;

  if (safeMetrics.includes('ndcg')) {
    const predictedA = safeArray(runA?.predicted);
    const actualA = safeArray(runA?.actual);
    const predictedB = safeArray(runB?.predicted);
    const actualB = safeArray(runB?.actual);

    const ndcgA = computeNDCGAtK(predictedA, actualA, 5);
    const ndcgB = computeNDCGAtK(predictedB, actualB, 5);

    results.delta.ndcg = ndcgB - ndcgA;
    if (ndcgB > ndcgA) scoreB += 1;
    else if (ndcgA > ndcgB) scoreA += 1;
  }

  if (safeMetrics.includes('uplift')) {
    const upliftA = computeUplift(runA?.control, runA?.treatment) ?? 0;
    const upliftB = computeUplift(runB?.control, runB?.treatment) ?? 0;
    results.delta.uplift = upliftB - upliftA;
    if (upliftB > upliftA) scoreB += 1;
    else if (upliftA > upliftB) scoreA += 1;
  }

  if (safeMetrics.includes('calibratedError')) {
    const errA = computeCalibratedError(runA?.probability, runA?.observed);
    const errB = computeCalibratedError(runB?.probability, runB?.observed);
    if (errA !== null && errB !== null) {
      results.delta.calibratedError = errB - errA;
      if (errB < errA) scoreB += 1;
      else if (errA < errB) scoreA += 1;
    }
  }

  results.winner = scoreB > scoreA ? 'B' : (scoreA > scoreB ? 'A' : 'tie');
  return results;
}
