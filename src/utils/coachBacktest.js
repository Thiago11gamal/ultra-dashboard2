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
  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + (Number(b) || 0), 0) / arr.length : 0);
  return mean(treatment) - mean(control);
}

export function computeCalibratedError(points = []) {
  if (!Array.isArray(points) || points.length === 0) return 0;
  return points.reduce((acc, p) => {
    const pred = Math.max(0, Math.min(1, Number(p?.pred) || 0));
    const obs = p?.obs ? 1 : 0;
    return acc + Math.abs(pred - obs);
  }, 0) / points.length;
}

export function compareStrategyRuns({ baseline, candidate }) {
  return {
    ndcgAt5Delta: (candidate?.ndcgAt5 || 0) - (baseline?.ndcgAt5 || 0),
    upliftDelta: (candidate?.uplift || 0) - (baseline?.uplift || 0),
    calibratedErrorDelta: (candidate?.calibratedError || 0) - (baseline?.calibratedError || 0),
    winner: (candidate?.ndcgAt5 || 0) >= (baseline?.ndcgAt5 || 0) &&
      (candidate?.uplift || 0) >= (baseline?.uplift || 0) &&
      (candidate?.calibratedError || 1) <= (baseline?.calibratedError || 1)
      ? 'candidate'
      : 'baseline'
  };
}
