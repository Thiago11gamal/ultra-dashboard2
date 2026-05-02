export function deriveAdaptiveRiskThresholds(scores = [], volatility = null, cfg = {}) {
  const fallbackDanger = Number(cfg.MC_PROB_DANGER) || 30;
  const fallbackSafe = Number(cfg.MC_PROB_SAFE) || 90;
  const cleanScores = (scores || []).map(Number).filter(Number.isFinite);
  if (cleanScores.length < 4) return { danger: fallbackDanger, safe: fallbackSafe };

  const sorted = [...cleanScores].sort((a, b) => a - b);
  const q = (p) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p)))];

  let danger = Math.max(15, Math.min(45, q(0.25) * 0.55));
  let safe = Math.max(75, Math.min(95, q(0.75) * 1.08));

  if (Number.isFinite(volatility)) {
    const highVol = Number(cfg.MC_VOLATILITY_HIGH) || 8;
    if (volatility > highVol * 0.9) {
      danger = Math.min(50, danger + 4);
      safe = Math.min(97, safe + 2);
    } else if (volatility < highVol * 0.45) {
      danger = Math.max(12, danger - 3);
      safe = Math.max(72, safe - 2);
    }
  }

  if (safe - danger < 25) safe = Math.min(97, danger + 25);
  return { danger, safe };
}

export function computeContinuousMcBoost(probability, dangerThreshold, safeThreshold, volatility, maxScore, cfg = {}) {
  const p = Math.max(0, Math.min(100, Number(probability) || 0));
  const d = Math.max(1, Math.min(99, Number(dangerThreshold) || cfg.MC_PROB_DANGER));
  const s = Math.max(d + 1, Math.min(99, Number(safeThreshold) || cfg.MC_PROB_SAFE));

  const center = (d + s) / 2;
  const width = Math.max(8, (s - d) / 2);
  const k = 4 / width;
  const z = (center - p) * k;
  const sigmoid = 1 / (1 + Math.exp(-z));

  const maxBoost = cfg.MC_BOOST_DANGER_BASE + cfg.MC_BOOST_DANGER_RANGE;
  let boost = cfg.MC_BOOST_SAFE_PENALTY + (maxBoost - cfg.MC_BOOST_SAFE_PENALTY) * sigmoid;

  const lowVolLimit = (cfg.MC_VOLATILITY_HIGH * 0.7) * (maxScore / 100);
  if (Number.isFinite(volatility) && volatility >= lowVolLimit && boost < 0) {
    boost *= 0.25;
  }

  let riskLabel = 'ok';
  if (p < d) riskLabel = 'critical';
  else if (p < center) riskLabel = 'moderate';
  else if (p >= s && boost < 0) riskLabel = 'safe';

  return { boost, riskLabel };
}

export function deriveBacktestWeights(scores = [], maxScore = 100) {
  const clean = (scores || []).map(Number).filter(Number.isFinite);
  if (clean.length < 6) return { scoreWeight: 1, recencyWeight: 1, instabilityWeight: 1, rankQuality: 0, uplift: 0 };

  const split = Math.max(3, Math.floor(clean.length * 0.7));
  const train = clean.slice(0, split);
  const test = clean.slice(split);
  if (test.length === 0) return { scoreWeight: 1, recencyWeight: 1, instabilityWeight: 1, rankQuality: 0, uplift: 0 };

  const trainMean = train.reduce((a, b) => a + b, 0) / train.length;
  const trainDelta = train.length >= 2 ? (train[train.length - 1] - train[0]) / (train.length - 1) : 0;

  const baselineMae = test.reduce((acc, y) => acc + Math.abs(y - trainMean), 0) / test.length;
  const trendMae = test.reduce((acc, y, i) => {
    const pred = train[train.length - 1] + trainDelta * (i + 1);
    return acc + Math.abs(y - pred);
  }, 0) / test.length;

  const rankQualityRaw = baselineMae > 0 ? (baselineMae - trendMae) / baselineMae : 0;
  const rankQuality = Math.max(-0.5, Math.min(0.5, rankQualityRaw));

  const testMean = test.reduce((a, b) => a + b, 0) / test.length;
  const upliftRaw = (testMean - trainMean) / Math.max(1, maxScore);
  const uplift = Math.max(-0.3, Math.min(0.3, upliftRaw));

  const scoreWeight = Math.max(0.8, Math.min(1.2, 1 - rankQuality * 0.25));
  const recencyWeight = Math.max(0.75, Math.min(1.25, 1 - rankQuality * 0.2 - uplift * 0.25));
  const instabilityWeight = Math.max(0.8, Math.min(1.25, 1 - rankQuality * 0.15 + (uplift < 0 ? 0.15 : -0.05)));

  return { scoreWeight, recencyWeight, instabilityWeight, rankQuality, uplift };
}
