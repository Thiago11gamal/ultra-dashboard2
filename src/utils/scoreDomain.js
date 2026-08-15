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
    globalScale: scales.size > 0 ? Math.max(...scales) : 100
  };
}
