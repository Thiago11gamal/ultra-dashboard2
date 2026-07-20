import { kahanSum } from '../engine/math/kahan.js';
import { getDateKey } from './dateHelper.js';
import { getSafeScore } from './scoreHelper.js';

export function computeBrierScore(probability01, observedBinary) {
    const rawP = Number(probability01);
    if (!Number.isFinite(rawP)) return null;
    const p = Math.max(0, Math.min(1, rawP));
    const y = observedBinary ? 1 : 0;
    return (p - y) ** 2;
}

/**
 * Neutraliza NaN poisoning em cálculos de Log Loss (Entropia Cruzada).
 * Implementa epsilon clamping (1e-15) conforme exigência técnica.
 */
export function computeLogLoss(probability01, observedBinary) {
    const epsilon = 1e-15;
    const rawP = Number(probability01);
    // BUG-LOGLOSS FIX: Number.isFinite impede que probabilidade 0 vire 0.5
    const safeP = Number.isFinite(rawP) ? rawP : 0.5;
    const p = Math.max(epsilon, Math.min(1 - epsilon, safeP));
    const y = observedBinary ? 1 : 0;
    return -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
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
    // Precision: Kahan for avgBrier
    const avgBrier = kahanSum(core) / core.length;
    
    // A penalidade agora é baseada no Brier Score, mas o motor deve monitorar Log Loss
    // para diagnósticos de "falsa sensação de domínio" (Entropia).
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
  const overallObserved = kahanSum(cleanPairs.map(p => p.observed)) / cleanPairs.length;
  let relTerm = 0;
  let resTerm = 0;
  
  // [FIX 3] Usar bins de largura fixa (Equal Width) para evitar aglomeração visual
  for (let i = 0; i < bins; i++) {
    const binMin = i / bins;
    const binMax = (i + 1) / bins;
    
    // Filtra pares que caem dentro deste intervalo de probabilidade
    const slice = sorted.filter(p => p.probability >= binMin && p.probability < (i === bins - 1 ? 1.01 : binMax));
    
    if (slice.length === 0) continue;
    
    const meanPred = kahanSum(slice.map(p => p.probability)) / slice.length;
    const observedRate = kahanSum(slice.map(p => p.observed)) / slice.length;
    const gap = Math.abs(meanPred - observedRate);
    const weight = slice.length / cleanPairs.length;
    ece += weight * gap;
    mce = Math.max(mce, gap);
    relTerm += weight * ((meanPred - observedRate) ** 2);
    resTerm += weight * ((observedRate - overallObserved) ** 2);
    reliability.push({ bin: i + 1, binMin, binMax, count: slice.length, meanPred, observedRate, gap });
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
    const p = Math.max(0, Math.min(100, probabilityPct ?? 0));
    const limit = Math.max(0, Math.min(1, maxAppliedPenalty ?? 0.5));
    const k = Math.max(0, Math.min(limit, penalty ?? 0));
    const neutral = Math.max(0, Math.min(100, neutralPct ?? 50));
    return p * (1 - k) + neutral * k;
}

/**
 * NEW: Record a Monte Carlo prediction outcome for future calibration.
 * Stores lightweight events that can be used for walk-forward analysis.
 */
export function recordPredictionEvent(storeUpdateFn, prediction) {
  // prediction: { timestamp, probability, observed, targetScore, sims, category, effectiveN? }
  if (typeof storeUpdateFn !== 'function') return;
  const event = {
    timestamp: prediction.timestamp || Date.now(),
    probability: Math.max(0, Math.min(1, Number(prediction.probability) || 0)),
    observed: prediction.observed != null ? (prediction.observed ? 1 : 0) : null,
    targetScore: prediction.targetScore,
    sims: prediction.sims || 5000,
    category: prediction.category || 'global',
    effectiveN: prediction.effectiveN || null
  };
  // The caller is responsible for pushing to a contest.calibrationEvents array
  // We just validate and return a clean event
  return event;
}

/**
 * Aggregate calibration events into metrics + trend.
 * Supports walk-forward style analysis.
 */
export function computeCalibrationSummary(events = [], options = {}) {
  const clean = (events || []).filter(e => 
    Number.isFinite(e?.probability) && 
    (e?.observed === 0 || e?.observed === 1)
  );

  if (clean.length < 3) {
    return { n: clean.length, ece: 0, avgBrier: 0, reliability: [], trend: 'insufficient_data' };
  }

  const diag = computeCalibrationDiagnostics(clean.map(e => ({ probability: e.probability, observed: e.observed })), { bins: options.bins || 6 });

  const briers = clean.map(e => computeBrierScore(e.probability, e.observed));
  const avgBrier = kahanSum(briers) / briers.length;

  // Simple trend: compare first half vs second half Brier
  const mid = Math.floor(clean.length / 2);
  const firstHalf = briers.slice(0, mid);
  const secondHalf = briers.slice(mid);
  const firstAvg = firstHalf.length ? kahanSum(firstHalf) / firstHalf.length : avgBrier;
  const secondAvg = secondHalf.length ? kahanSum(secondHalf) / secondHalf.length : avgBrier;
  const trend = secondAvg < firstAvg * 0.92 ? 'improving' : (secondAvg > firstAvg * 1.08 ? 'degrading' : 'stable');

  return {
    n: clean.length,
    ece: diag.ece,
    mce: diag.mce,
    avgBrier: Number(avgBrier.toFixed(4)),
    reliability: diag.reliability,
    trend,
    brierDecomposition: diag.brierDecomposition
  };
}

/**
 * NEW: Try to backfill observed values in calibrationEvents using actual simulado results.
 * Matches by category and approximate target.
 * Call this after adding/updating simulados.
 */
export function backfillObservedFromSimulados(calibrationEvents = [], simuladoRows = [], _categories = [], maxScore = 100) {
  if (!Array.isArray(calibrationEvents) || !Array.isArray(simuladoRows)) return calibrationEvents;

  const updated = [...calibrationEvents];

  simuladoRows.forEach(row => {
    const subj = row.subject || row.categoryName;
    if (!subj) return;

    const score = getSafeScore(row, maxScore);
    if (!Number.isFinite(score)) return;

    // Find recent global or per-subject predictions that might match this simulado
    updated.forEach(ev => {
      if (ev.observed != null) return; // already filled
      if (!ev.category) return;

      const isMatch = ev.category.toLowerCase().includes(subj.toLowerCase()) ||
                      subj.toLowerCase().includes(ev.category.toLowerCase());

      if (isMatch && ev.targetScore) {
        // Simple rule: if the simulado score >= target, it was a "pass" for that prediction
        const passed = score >= Number(ev.targetScore);
        ev.observed = passed ? 1 : 0;
        ev.backfilled = true;
      }
    });
  });

  return updated;
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
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    .slice(-maxSamples);
  
  const minSamples = Number(cfg.minSamples) || 4;
  if (recent.length < minSamples) {
      return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3, confidenceFactor: 0 };
  }
  
  // BUG-FIX #2: Compute Brier from probability/observed pairs (h.avgBrier doesn't exist)
  // Exponential weighting by time (λ ≈ half-life ~14 days)
  const now = Date.now();
  const MS_PER_DAY_CALIB = 24 * 60 * 60 * 1000;
  const LAMBDA_CALIB = Math.log(2) / (14 * MS_PER_DAY_CALIB);
  let sumWeightedBrier = 0;
  let sumCalibWeights = 0;
  recent.forEach(h => {
    const age = Math.max(0, now - (h.timestamp || now));
    const w = Math.exp(-LAMBDA_CALIB * age);
    
    // Compute Brier from probability and observed if available
    let brier = 0;
    if (Number.isFinite(h.probability) && (h.observed === 0 || h.observed === 1)) {
      // BUG-FIX: Normalize probability to 0-1 scale if it was stored as 0-100 to prevent Brier Score explosion
      const p = h.probability > 1 ? h.probability / 100 : h.probability;
      brier = (p - h.observed) ** 2;
    }
    
    sumWeightedBrier += brier * w;
    sumCalibWeights += w;
  });
  const avgBrier = sumCalibWeights > 0 ? sumWeightedBrier / sumCalibWeights : 0;

  // ESTABILIZADOR DE ESCASSEZ DE DADOS: O fator de confiança varia suavemente em direção ao target de 12 amostras
  const targetSamples = Number(cfg.targetSamples) || 12;
  const confidenceFactor = Math.min(1, recent.length / targetSamples);
  
  // Dynamic baseline with confidence-gating to avoid overreacting on short windows
  const dynamicBaseline = Math.max(0.12, Math.min(0.25, avgBrier));
  const defaultBaseline = cfg.baseline ?? 0.2;
  const baseline = (dynamicBaseline * confidenceFactor) + (defaultBaseline * (1 - confidenceFactor));
  // Penalty cap also confidence-aware
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
  if (!model || model.length === 0) return p;
  if (p < model[0].minX) return Math.max(0, Math.min(1, Number(model[0].value) || 0));

  let bestValue = model[0].value;
  for (const block of model) {
      if (p >= block.minX) {
          bestValue = block.value;
      } else {
          break; // Passámos o ponto, ficamos com o último degrau válido
      }
  }
  return Math.max(0, Math.min(1, Number(bestValue) || 0));
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
    const isFirstBin = (i === 0);
    const isLastBin = (i === bins - 1);
    const lo = isFirstBin ? -0.01 : sorted[start].probability;
    const hi = isLastBin ? 1.01 : sorted[end - 1].probability;

    if (!(p >= lo && (p < hi || isLastBin))) continue;
    const succ = kahanSum(slice.map(p => p.observed));
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

  // FIX: Substituição dos resíduos absolutos por Erro Padrão Binomial Bayesiano.
  // Impede que o qHat exploda caso o modelo preveja 0.9 e o resultado seja 0.
  const n = clean.length;
  
  // Smoothing (Laplace) para evitar variância zero caso p seja exatamente 0 ou 1
  const smoothedP = (p * n + 0.5) / (n + 1);
  const standardError = Math.sqrt((smoothedP * (1 - smoothedP)) / n);
  
  // Mapeamento de alpha para Z-Score seguro (ex: alpha 0.1 -> ~1.645 para 90% CI)
  const zScore = alpha <= 0.05 ? 1.96 : (alpha <= 0.1 ? 1.645 : 1.28); 
  
  const qHat = standardError * zScore;

  return { 
    low: Math.max(0, p - qHat), 
    high: Math.min(1, p + qHat), 
    qHat 
  };
}

export function computeStackingWeights(candidateProbs = [], observed = []) {
  const k = Array.isArray(candidateProbs) ? candidateProbs.length : 0;
  if (k === 0) return [];
  const n = Array.isArray(observed) ? observed.length : 0;
  if (n === 0) return new Array(k).fill(1 / k);

  // BUG-LOGLOSS FIX: Usar Cross-Entropy (Log Loss) para o Stacking Weight.
  // O MSE (Brier) é menos punitivo com "falsas certezas" que a Log Loss.
  const logLoss = candidateProbs.map(series => {
    if (!Array.isArray(series) || series.length !== n) return 1e6;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const p = Math.max(0, Math.min(1, Number(series[i]) || 0));
      const y = Math.max(0, Math.min(1, Number(observed[i]) || 0));
      acc += computeLogLoss(p, y);
    }
    return acc / n;
  });

  // Peso inversamente proporcional à entropia
  const minLoss = Math.min(...logLoss);
  const scores = logLoss.map(l => Math.exp(-(l - minLoss) / 0.08));
  const z = kahanSum(scores);
  if (z === 0) return new Array(k).fill(1 / k);
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
  const mean = briers.length > 0 ? kahanSum(briers) / briers.length : null;
  const sd = briers.length > 1
    ? Math.sqrt(kahanSum(briers.map(v => (v - mean) ** 2)) / (briers.length - 1))
    : 0;

  const trend = clean.map(e => ({
    timestamp: e.timestamp,
    date: getDateKey(new Date(e.timestamp)),
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
