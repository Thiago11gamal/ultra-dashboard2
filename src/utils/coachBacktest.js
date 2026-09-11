/**
 * coachBacktest.js
 *
 * Métricas de backtest: NDCG, Uplift, Erro Calibrado.
 */
import { safeArray } from './coachSafe.js';

/**
 * Calcula NDCG@K.
 * FIX (BUG-40): proteção explícita contra divisão por zero (idcg <= 0)
 * e validação de tipo via safeArray (aceita objeto-arrays do store).
 */
export function computeNDCGAtK(predicted = [], actual = [], k = 5) {
  const safePredicted = safeArray(predicted);
  const safeActual = safeArray(actual);

  if (safePredicted.length === 0 || safeActual.length === 0) return 0;
  const topK = Math.max(1, Math.min(k, safePredicted.length));

  // ✅ FIX: garantir leitura de 'id' (strings) e 'relevance' (numérico)
  const actualMap = new Map(
    safeActual.map((x) => [String(x?.id || ''), Number(x?.relevance) || 0])
  );

  const dcg = safePredicted.slice(0, topK).reduce((acc, item, idx) => {
    const rel = actualMap.get(String(item?.id || '')) || 0;
    return acc + ((2 ** rel - 1) / Math.log2(idx + 2));
  }, 0);

  const ideal = [...safeActual].sort((a, b) => {
    const diff = (Number(b?.relevance) || 0) - (Number(a?.relevance) || 0);
    if (diff !== 0) return diff;
    const idA = String(a?.id || '');
    const idB = String(b?.id || '');
    return idA.localeCompare(idB);
  });

  const idcg = ideal.slice(0, topK).reduce((acc, item, idx) => {
    const rel = Number(item?.relevance) || 0;
    return acc + ((2 ** rel - 1) / Math.log2(idx + 2));
  }, 0);

  if (idcg <= 0) return 0;
  // ✅ FIX: Garantir teto de 1.0 e tratar floating-point noise
  return Math.min(1.0, Math.max(0.0, dcg / idcg));
}

/**
 * Calcula uplift: média(treatment) − média(control).
 * FIX: sem dados → retorna null (não 0), para não mascarar ausência de
 * evidência como "efeito zero". O coachEvaluator já trata null
 * (Number.isFinite → exibe '—' no painel).
 * FIX: filtra entradas não-numéricas para evitar NaN.
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
export function computeCalibratedError(probability, actual) {
  const p = Math.max(0, Math.min(1, Number(probability) || 0));
  const yRaw = Number(actual);
  const y = Number.isFinite(yRaw) ? (yRaw >= 0.5 ? 1 : 0) : (actual === true ? 1 : 0);
  return Math.abs(p - y);
}

/**
 * Compara duas execuções de estratégia.
 * FIX: validação de tipo via safeArray nas entradas.
 */
export function compareStrategyRuns(runA = {}, runB = {}, metrics = ['ndcg']) {
  const results = { delta: {}, winner: null };

  if (metrics.includes('ndcg')) {
    const predictedA = safeArray(runA?.predicted);
    const actualA = safeArray(runA?.actual);
    const predictedB = safeArray(runB?.predicted);
    const actualB = safeArray(runB?.actual);

    const ndcgA = computeNDCGAtK(predictedA, actualA, 5);
    const ndcgB = computeNDCGAtK(predictedB, actualB, 5);

    results.delta.ndcg = ndcgB - ndcgA;
    results.winner = ndcgB > ndcgA ? 'B' : (ndcgA > ndcgB ? 'A' : 'tie');
  }

  return results;
}

