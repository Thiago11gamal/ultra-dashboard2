export function computeNDCGAtK(predicted = [], actual = [], k = 5) {
  const topK = Math.max(1, Math.min(k, predicted.length));
  const actualMap = new Map(actual.map((x) => [x.id, Number(x.relevance) || 0]));

  const dcg = predicted.slice(0, topK).reduce((acc, item, idx) => {
    const rel = actualMap.get(item.id) || 0;
    return acc + ((2 ** rel - 1) / Math.log2(idx + 2));
  }, 0);

  const ideal = [...actual].sort((a, b) => (Number(b.relevance) || 0) - (Number(a.relevance) || 0));
  const idcg = ideal.slice(0, topK).reduce((acc, item, idx) => {
    const rel = Number(item.relevance) || 0;
    return acc + ((2 ** rel - 1) / Math.log2(idx + 2));
  }, 0);

  return idcg > 0 ? dcg / idcg : 0;
}

export function computeUplift(control = [], treatment = []) {
  if (control.length === 0 || treatment.length === 0) return 0;
  const meanControl = control.reduce((a, b) => a + b, 0) / control.length;
  const meanTreatment = treatment.reduce((a, b) => a + b, 0) / treatment.length;
  return meanTreatment - meanControl;
}

export function computeCalibratedError(probability, actual) {
  const p = Math.max(0, Math.min(1, Number(probability) || 0));
  const y = actual ? 1 : 0;
  return Math.abs(p - y);
}

export function compareStrategyRuns(runA = [], runB = [], metrics = ['ndcg']) {
  const results = { delta: {}, winner: null };
  if (metrics.includes('ndcg')) {
    const ndcgA = computeNDCGAtK(runA.predicted, runA.actual, 5);
    const ndcgB = computeNDCGAtK(runB.predicted, runB.actual, 5);
    results.delta.ndcg = ndcgB - ndcgA;
    results.winner = ndcgB > ndcgA ? 'B' : 'A';
  }
  return results;
}
