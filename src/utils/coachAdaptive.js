export function deriveAdaptiveRiskThresholds(scores = [], volatility = null, cfg = {}) {
  const fallbackDanger = Number(cfg.MC_PROB_DANGER) || 30;
  const fallbackSafe = Number(cfg.MC_PROB_SAFE) || 90;
  const cleanScores = (scores || []).map(Number).filter(Number.isFinite);
  if (cleanScores.length < 4) return { danger: fallbackDanger, safe: fallbackSafe };

  const sorted = [...cleanScores].sort((a, b) => a - b);
  const q = (p) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p)))];

  // Danger threshold scales with the bottom quartile
  let danger = Math.max(15, Math.min(45, q(0.25) * 0.55));
  // Safe threshold scales with the top quartile
  let safe = Math.max(75, Math.min(95, q(0.75) * 1.08));

  if (Number.isFinite(volatility)) {
    const highVol = Number(cfg.MC_VOLATILITY_HIGH) || 8;
    if (volatility > highVol) {
      // Inflate thresholds when high volatility is detected to be more conservative
      danger += 5;
      safe += 3;
    }
  }
  return { danger, safe };
}

export function computeContinuousMcBoost(p, danger, safe, volatility, maxScore = 100, cfg = {}) {
  const pDanger = Math.max(10, danger);
  const pSafe = Math.min(98, safe);
  const volFactor = 1 + (Math.max(0, (volatility || 0) - 5) / 15);

  if (p <= pDanger) {
    const intensity = 1 - (p / pDanger);
    const boost = (cfg.MC_BOOST_DANGER_BASE || 12) + (cfg.MC_BOOST_DANGER_RANGE || 13) * intensity;
    return { boost: boost * volFactor, riskLabel: 'critical' };
  }

  if (p >= pSafe) {
    return { boost: cfg.MC_BOOST_SAFE_PENALTY || -8, riskLabel: 'safe' };
  }

  // Linear interpolation for the moderate zone
  const range = pSafe - pDanger;
  const pos = (p - pDanger) / range;
  const boost = (cfg.MC_BOOST_MODERATE_BASE || 12) * (1 - pos);
  return { boost, riskLabel: 'moderate' };
}

export function deriveBacktestWeights(scores = [], maxScore = 100) {
  if (scores.length < 4) return { scoreWeight: 1, recencyWeight: 1, instabilityWeight: 1, rankQuality: 0, uplift: 0 };

  const recent = scores.slice(-3);
  const prior = scores.slice(-6, -3);
  const uplift = prior.length > 0
    ? (recent.reduce((a, b) => a + b, 0) / recent.length) - (prior.reduce((a, b) => a + b, 0) / prior.length)
    : 0;

  // Simple rank quality check: how many scores are in correct temporal order?
  let ordered = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] >= scores[i - 1]) ordered++;
  }
  const rankQuality = ordered / (scores.length - 1);

  // Dynamic weights based on trend quality
  const weights = {
    scoreWeight: rankQuality > 0.8 ? 1.15 : 1.0,
    recencyWeight: uplift < -5 ? 1.4 : 1.0,
    instabilityWeight: rankQuality < 0.4 ? 1.3 : 1.0,
    rankQuality,
    uplift
  };
  return weights;
}
