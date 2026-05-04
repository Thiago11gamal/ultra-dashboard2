export function computeBrierScore(probability01, observedBinary) {
    const p = Math.max(0, Math.min(1, Number(probability01) || 0));
    const y = observedBinary ? 1 : 0;
    return (p - y) ** 2;
}

export function summarizeCalibration(scores = [], options = {}) {
    const maxPenalty = Math.max(0, Math.min(1, Number(options.maxPenalty) || 0.25));
    const baseline = Number.isFinite(options.baseline) ? options.baseline : 0.18;

    if (!Array.isArray(scores) || scores.length === 0) {
        return { avgBrier: 0, calibrationPenalty: 0 };
    }

    const finiteScores = scores.map(v => Number(v)).filter(Number.isFinite);
    if (finiteScores.length === 0) return { avgBrier: 0, calibrationPenalty: 0 };
    const avgBrier = finiteScores.reduce((a, b) => a + b, 0) / finiteScores.length;
    const calibrationPenalty = Math.min(maxPenalty, Math.max(0, avgBrier - baseline));
    return { avgBrier, calibrationPenalty };
}

export function computeCalibrationDiagnostics(pairs = [], options = {}) {
  const bins = Math.max(2, Number(options.bins) || 5);
  if (!Array.isArray(pairs) || pairs.length === 0) return { ece: 0, reliability: [] };

  const cleanPairs = pairs
    .map((p) => ({ probability: Number(p?.probability), observed: Number(p?.observed) }))
    .filter((p) => Number.isFinite(p.probability) && Number.isFinite(p.observed));
  if (cleanPairs.length === 0) return { ece: 0, reliability: [] };

  const sorted = [...cleanPairs].sort((a, b) => a.probability - b.probability);
  let ece = 0;
  const reliability = [];
  
  for (let i = 0; i < bins; i++) {
    const start = Math.floor(i * sorted.length / bins);
    const end = Math.floor((i + 1) * sorted.length / bins);
    const slice = sorted.slice(start, end);
    if (slice.length === 0) continue;
    
    const meanPred = slice.reduce((a, b) => a + b.probability, 0) / slice.length;
    const observedRate = slice.reduce((a, b) => a + b.observed, 0) / slice.length;
    const gap = Math.abs(meanPred - observedRate);
    ece += (slice.length / cleanPairs.length) * gap;
    reliability.push({ bin: i + 1, count: slice.length, meanPred, observedRate, gap });
  }
  return { ece, reliability };
}

export function shrinkProbabilityToNeutral(probabilityPct, penalty, neutralPct = 50, maxAppliedPenalty = 0.5) {
    const p = Math.max(0, Math.min(100, Number(probabilityPct) || 0));
    const limit = Math.max(0, Math.min(1, Number(maxAppliedPenalty) || 0.5));
    const k = Math.max(0, Math.min(limit, Number(penalty) || 0));
    return p * (1 - k) + neutralPct * k;
}

export function computeRollingCalibrationParams(history = [], cfg = {}) {
  if (history.length === 0) {
    return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3 };
  }
  const windowDays = Number(cfg.windowDays) || 60;
  const cutoff = Date.now() - (windowDays * 24 * 60 * 60 * 1000);
  const maxSamples = Number(cfg.maxSamples) || 20;
  const recent = history.filter(h => (h.timestamp || 0) >= cutoff).slice(-maxSamples);
  
  const minSamples = Number(cfg.minSamples) || 4;
  if (recent.length < minSamples) {
      return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3 };
  }
  
  // BUG-CALIB-01 FIX: ponderação exponencial pelo tempo (λ ≈ meia-vida 14 dias)
  // Antes: média simples — dados de 60 dias atrás pesavam igual aos de hoje
  const now = Date.now();
  const MS_PER_DAY_CALIB = 24 * 60 * 60 * 1000;
  const LAMBDA_CALIB = Math.log(2) / (14 * MS_PER_DAY_CALIB); // decaimento por ms (meia-vida ~14 dias)
  let sumWeightedBrier = 0;
  let sumCalibWeights = 0;
  recent.forEach(h => {
    const age = Math.max(0, now - (h.timestamp || now));
    const w = Math.exp(-LAMBDA_CALIB * age);
    sumWeightedBrier += (Number(h.avgBrier) || 0) * w;
    sumCalibWeights += w;
  });
  const avgBrier = sumCalibWeights > 0 ? sumWeightedBrier / sumCalibWeights : 0;
  // Dynamic baseline based on recent performance
  const baseline = Math.max(0.12, Math.min(0.25, avgBrier * 0.9));
  // Conservative max penalty if performance is poor
  const maxPenalty = avgBrier > 0.25 ? 0.35 : 0.25;
  
  return { baseline, maxPenalty };
}


// Governance Playbook Constants
export const CRITICAL_BRIER_THRESHOLD = 0.28;
export const HIGH_PENALTY_THRESHOLD = 0.20;
export const ALERT_COOLDOWN_MS = 1000 * 60 * 60 * 12; // 12h
