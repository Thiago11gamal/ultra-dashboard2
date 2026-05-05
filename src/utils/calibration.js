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
    const sorted = [...finiteScores].sort((a, b) => a - b);
    const trim = sorted.length >= 8 ? Math.floor(sorted.length * 0.1) : 0;
    const core = trim > 0 ? sorted.slice(trim, sorted.length - trim) : sorted;
    const avgBrier = core.reduce((a, b) => a + b, 0) / core.length;
    const calibrationPenalty = Math.min(maxPenalty, Math.max(0, avgBrier - baseline));
    return { avgBrier, calibrationPenalty, sampleSize: finiteScores.length };
}

export function computeCalibrationDiagnostics(pairs = [], options = {}) {
  const bins = Math.max(2, Number(options.bins) || 5);
  if (!Array.isArray(pairs) || pairs.length === 0) return { ece: 0, mce: 0, reliability: [], brierDecomposition: null };

  const cleanPairs = pairs
    .map((p) => ({
      probability: Math.max(0, Math.min(1, Number(p?.probability))),
      observed: Math.max(0, Math.min(1, Number(p?.observed)))
    }))
    .filter((p) => Number.isFinite(p.probability) && Number.isFinite(p.observed));
  if (cleanPairs.length === 0) return { ece: 0, mce: 0, reliability: [], brierDecomposition: null };

  const sorted = [...cleanPairs].sort((a, b) => a.probability - b.probability);
  let ece = 0;
  let mce = 0;
  const reliability = [];
  const overallObserved = cleanPairs.reduce((a, b) => a + b.observed, 0) / cleanPairs.length;
  let relTerm = 0;
  let resTerm = 0;
  
  for (let i = 0; i < bins; i++) {
    const start = Math.floor(i * sorted.length / bins);
    const end = Math.floor((i + 1) * sorted.length / bins);
    const slice = sorted.slice(start, end);
    if (slice.length === 0) continue;
    
    const meanPred = slice.reduce((a, b) => a + b.probability, 0) / slice.length;
    const observedRate = slice.reduce((a, b) => a + b.observed, 0) / slice.length;
    const gap = Math.abs(meanPred - observedRate);
    const weight = slice.length / cleanPairs.length;
    ece += weight * gap;
    mce = Math.max(mce, gap);
    relTerm += weight * ((meanPred - observedRate) ** 2);
    resTerm += weight * ((observedRate - overallObserved) ** 2);
    reliability.push({ bin: i + 1, count: slice.length, meanPred, observedRate, gap });
  }
  const uncertainty = overallObserved * (1 - overallObserved);
  return {
    ece,
    mce,
    reliability,
    brierDecomposition: {
      reliability: relTerm,
      resolution: resTerm,
      uncertainty
    }
  };
}

export function shrinkProbabilityToNeutral(probabilityPct, penalty, neutralPct = 50, maxAppliedPenalty = 0.5) {
    const p = Math.max(0, Math.min(100, Number(probabilityPct) || 0));
    const limit = Math.max(0, Math.min(1, Number(maxAppliedPenalty) || 0.5));
    const k = Math.max(0, Math.min(limit, Number(penalty) || 0));
    const neutral = Math.max(0, Math.min(100, Number(neutralPct) || 50));
    return p * (1 - k) + neutral * k;
}

export function computeRollingCalibrationParams(history = [], cfg = {}) {
  const safeHistory = Array.isArray(history) ? history : [];
  if (safeHistory.length === 0) {
    return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3 };
  }
  const windowDays = Number(cfg.windowDays) || 60;
  const cutoff = Date.now() - (windowDays * 24 * 60 * 60 * 1000);
  const maxSamples = Number(cfg.maxSamples) || 20;
  const recent = safeHistory
    .filter(h => Number.isFinite(Number(h?.timestamp)) && Number(h.timestamp) >= cutoff)
    .slice(-maxSamples);
  
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
  const confidenceFactor = Math.min(1, recent.length / Math.max(minSamples, 1));
  const dynamicBaseline = Math.max(0.12, Math.min(0.25, avgBrier * 0.9));
  const defaultBaseline = cfg.baseline ?? 0.2;
  const baseline = (dynamicBaseline * confidenceFactor) + (defaultBaseline * (1 - confidenceFactor));
  const dynamicMaxPenalty = avgBrier > 0.25 ? 0.35 : 0.25;
  const defaultMaxPenalty = cfg.maxPenalty ?? 0.3;
  const maxPenalty = (dynamicMaxPenalty * confidenceFactor) + (defaultMaxPenalty * (1 - confidenceFactor));
  
  return { baseline, maxPenalty, confidenceFactor };
}


// Governance Playbook Constants
export const CRITICAL_BRIER_THRESHOLD = 0.28;
export const HIGH_PENALTY_THRESHOLD = 0.20;
export const ALERT_COOLDOWN_MS = 1000 * 60 * 60 * 12; // 12h


// -------- Advanced calibration tooling --------
export function fitIsotonicCalibration(pairs = []) {
  const clean = (pairs || [])
    .map(p => ({ x: Number(p?.probability), y: Number(p?.observed) }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map(p => ({ x: Math.max(0, Math.min(1, p.x)), y: Math.max(0, Math.min(1, p.y)), w: 1 }))
    .sort((a, b) => a.x - b.x);
  if (clean.length === 0) return [];

  const blocks = clean.map(p => ({ minX: p.x, maxX: p.x, sumWY: p.y, sumW: 1, mean: p.y }));
  let i = 0;
  while (i < blocks.length - 1) {
    if (blocks[i].mean <= blocks[i + 1].mean) { i++; continue; }
    const merged = {
      minX: blocks[i].minX,
      maxX: blocks[i + 1].maxX,
      sumWY: blocks[i].sumWY + blocks[i + 1].sumWY,
      sumW: blocks[i].sumW + blocks[i + 1].sumW,
      mean: 0
    };
    merged.mean = merged.sumWY / merged.sumW;
    blocks.splice(i, 2, merged);
    if (i > 0) i--;
  }
  return blocks.map(b => ({ minX: b.minX, maxX: b.maxX, value: b.mean }));
}

export function predictIsotonicProbability(probability01, model = []) {
  const p = Math.max(0, Math.min(1, Number(probability01) || 0));
  if (!Array.isArray(model) || model.length === 0) return p;
  const hit = model.find(b => p >= b.minX && p <= b.maxX);
  if (hit) return Math.max(0, Math.min(1, Number(hit.value) || 0));
  if (p < model[0].minX) return Math.max(0, Math.min(1, Number(model[0].value) || 0));
  const last = model[model.length - 1];
  return Math.max(0, Math.min(1, Number(last.value) || 0));
}

export function calibrateWithBBQ(probability01, pairs = [], options = {}) {
  const p = Math.max(0, Math.min(1, Number(probability01) || 0));
  const clean = (pairs || [])
    .map(x => ({ probability: Number(x?.probability), observed: Number(x?.observed) }))
    .filter(x => Number.isFinite(x.probability) && Number.isFinite(x.observed))
    .map(x => ({ probability: Math.max(0, Math.min(1, x.probability)), observed: Math.max(0, Math.min(1, x.observed)) }));
  if (clean.length < 4) return p;

  const sorted = [...clean].sort((a, b) => a.probability - b.probability);
  const bins = Math.max(2, Math.min(10, Number(options.bins) || Math.round(Math.sqrt(sorted.length))));
  const alpha0 = Math.max(0.1, Number(options.alpha0) || 0.5);
  const beta0 = Math.max(0.1, Number(options.beta0) || 0.5);

  for (let i = 0; i < bins; i++) {
    const start = Math.floor(i * sorted.length / bins);
    const end = Math.floor((i + 1) * sorted.length / bins);
    const slice = sorted.slice(start, end);
    if (slice.length === 0) continue;
    const lo = slice[0].probability;
    const hi = slice[slice.length - 1].probability;
    if (p < lo || p > hi) continue;
    const succ = slice.reduce((a, b) => a + b.observed, 0);
    const n = slice.length;
    return (succ + alpha0) / (n + alpha0 + beta0);
  }
  return p;
}

export function conformalizedCalibrationInterval(probability01, pairs = [], alpha = 0.1) {
  const p = Math.max(0, Math.min(1, Number(probability01) || 0));
  const clean = (pairs || [])
    .map(x => ({ probability: Number(x?.probability), observed: Number(x?.observed) }))
    .filter(x => Number.isFinite(x.probability) && Number.isFinite(x.observed));
  if (clean.length < 8) {
    return { low: Math.max(0, p - 0.15), high: Math.min(1, p + 0.15), qHat: 0.15 };
  }
  const residuals = clean.map(x => Math.abs(Math.max(0, Math.min(1, x.probability)) - Math.max(0, Math.min(1, x.observed)))).sort((a,b)=>a-b);
  const qIdx = Math.min(residuals.length - 1, Math.ceil((1 - Math.max(0.01, Math.min(0.4, alpha))) * (residuals.length + 1)) - 1);
  const qHat = residuals[Math.max(0, qIdx)] || 0;
  return { low: Math.max(0, p - qHat), high: Math.min(1, p + qHat), qHat };
}

export function computeStackingWeights(candidateProbs = [], observed = []) {
  const k = Array.isArray(candidateProbs) ? candidateProbs.length : 0;
  if (k === 0) return [];
  const n = Array.isArray(observed) ? observed.length : 0;
  if (n === 0) return new Array(k).fill(1 / k);

  const losses = candidateProbs.map(series => {
    if (!Array.isArray(series) || series.length !== n) return 1e6;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const p = Math.max(0, Math.min(1, Number(series[i]) || 0));
      const y = Math.max(0, Math.min(1, Number(observed[i]) || 0));
      acc += (p - y) ** 2;
    }
    return acc / n;
  });
  const temp = 0.08;
  const scores = losses.map(l => Math.exp(-l / temp));
  const z = scores.reduce((a, b) => a + b, 0) || 1;
  return scores.map(s => s / z);
}

export function buildCalibrationDashboardSeries(events = []) {
  const clean = (events || [])
    .map(e => ({
      timestamp: Number(e?.timestamp),
      avgBrier: Number(e?.avgBrier),
      ece: Number(e?.ece),
      calibrationPenalty: Number(e?.calibrationPenalty),
      probability: Number(e?.probability)
    }))
    .filter(e => Number.isFinite(e.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (clean.length === 0) {
    return {
      trend: [],
      rolling7: [],
      controlLimits: { brierMean: null, brierUpper95: null, brierLower95: null },
      driftSignals: []
    };
  }

  const briers = clean.map(e => Number.isFinite(e.avgBrier) ? e.avgBrier : null).filter(v => v !== null);
  const mean = briers.length > 0 ? briers.reduce((a, b) => a + b, 0) / briers.length : null;
  const sd = briers.length > 1
    ? Math.sqrt(briers.reduce((acc, v) => acc + ((v - mean) ** 2), 0) / (briers.length - 1))
    : 0;

  const trend = clean.map(e => ({
    timestamp: e.timestamp,
    date: new Date(e.timestamp).toISOString().slice(0, 10),
    avgBrier: Number.isFinite(e.avgBrier) ? e.avgBrier : null,
    ece: Number.isFinite(e.ece) ? e.ece : null,
    penalty: Number.isFinite(e.calibrationPenalty) ? e.calibrationPenalty : null,
    probability: Number.isFinite(e.probability) ? e.probability : null
  }));

  const rolling7 = trend.map((row, idx) => {
    const startTs = row.timestamp - (7 * 24 * 60 * 60 * 1000);
    const win = trend.slice(0, idx + 1).filter(r => r.timestamp >= startTs && Number.isFinite(r.avgBrier));
    const winMean = win.length > 0 ? (win.reduce((a, b) => a + b.avgBrier, 0) / win.length) : null;
    return { timestamp: row.timestamp, date: row.date, avgBrier7d: winMean };
  });

  const controlLimits = mean === null
    ? { brierMean: null, brierUpper95: null, brierLower95: null }
    : {
      brierMean: mean,
      brierUpper95: mean + 2 * sd,
      brierLower95: Math.max(0, mean - 2 * sd)
    };

  const driftSignals = trend.map((row) => {
    const outOfControl = mean !== null && Number.isFinite(row.avgBrier)
      ? row.avgBrier > (controlLimits.brierUpper95 ?? Infinity)
      : false;
    return { timestamp: row.timestamp, date: row.date, outOfControl };
  });

  return { trend, rolling7, controlLimits, driftSignals };
}
