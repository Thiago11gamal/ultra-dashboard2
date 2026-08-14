import { kahanSum } from '../engine/math/kahan.js';
import { getDateKey } from './dateHelper.js';
import { getSafeScore } from './scoreHelper.js';
import { isSubjectMatch } from './normalization.js';

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

// [LOTE 5] PAV extraído para reuso com restrição de bloco mínimo
function pavBlocks(blocks) {
  let i = 0;
  while (i < blocks.length - 1) {
    if (blocks[i].mean <= blocks[i + 1].mean) { i++; continue; }
    const a = blocks[i], b = blocks[i + 1];
    const merged = { minX: a.minX, maxX: b.maxX, sumWY: a.sumWY + b.sumWY, sumW: a.sumW + b.sumW, mean: 0 };
    merged.mean = merged.sumWY / merged.sumW;
    blocks.splice(i, 2, merged);
    if (i > 0) i--;
  }
  return blocks;
}

export function computeBrierScore(probability01, observedBinary) {
  const rawP = Number(probability01);
  if (!Number.isFinite(rawP)) return null;
  const p = Math.max(0, Math.min(1, rawP));
  const y = observedBinary ? 1 : 0;
  return (p - y) ** 2;
}

export function computeLogLoss(probability01, observedBinary) {
  const epsilon = 1e-15;
  const rawP = Number(probability01);
  const safeP = Number.isFinite(rawP) ? rawP : 0.5;
  const p = Math.max(epsilon, Math.min(1 - epsilon, safeP));
  const y = observedBinary ? 1 : 0;
  return -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
}

export function summarizeCalibration(scores = [], options = {}) {
  const maxPenalty = Math.max(0, Math.min(1, Number(options.maxPenalty) || 0.25));
  const baseline = Number.isFinite(options.baseline) ? options.baseline : 0.18;
  // FIX M5: entrada vazia NÃO retorna mais "Brier 0 = perfeito"
  if (!Array.isArray(scores) || scores.length === 0) {
    return { avgBrier: null, calibrationPenalty: 0, sampleSize: 0 };
  }
  const finiteScores = scores.map(v => Number(v)).filter(Number.isFinite);
  if (finiteScores.length === 0) return { avgBrier: null, calibrationPenalty: 0, sampleSize: 0 };
  const sorted = [...finiteScores].sort((a, b) => a - b);
  const trim = sorted.length >= 8 ? Math.floor(sorted.length * 0.1) : 0;
  const core = trim > 0 ? sorted.slice(trim, sorted.length - trim) : sorted;
  const avgBrier = kahanSum(core) / core.length;
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
  // [LOTE 5] ECE equal-frequency quando n < 20 (menos variância); equal-width p/ n grande
  const strategy = options.binStrategy || 'auto';
  const useQuantile = strategy === 'quantile' || (strategy === 'auto' && cleanPairs.length < 20);
  const edges = [];
  for (let i = 0; i <= bins; i++) {
    if (i === 0) edges.push(-0.01);
    else if (i === bins) edges.push(1.01);
    else if (!useQuantile) edges.push(i / bins);
    else edges.push(sorted[Math.floor((i / bins) * (sorted.length - 1))].probability);
  }
  for (let i = 1; i < edges.length - 1; i++) edges[i] = Math.max(edges[i], edges[i - 1] + 1e-6);
  for (let i = 0; i < bins; i++) {
    const binMin = edges[i];
    const binMax = edges[i + 1];
    const slice = sorted.filter(p => p.probability >= binMin && p.probability < binMax);
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
  return { ece, mce, reliability, brierDecomposition: { reliability: relTerm, resolution: resTerm, uncertainty } };
}

export function shrinkProbabilityToNeutral(probabilityPct, penalty, neutralPct = 50, maxAppliedPenalty = 0.5) {
  const p = Math.max(0, Math.min(100, probabilityPct ?? 0));
  const limit = Math.max(0, Math.min(1, maxAppliedPenalty ?? 0.5));
  const k = Math.max(0, Math.min(limit, penalty ?? 0));
  const neutral = Math.max(0, Math.min(100, neutralPct ?? 50));
  return p * (1 - k) + neutral * k;
}

// FIX: sem storeUpdateFn — retorna evento validado (loop de aprendizagem)
export function recordPredictionEvent(prediction = {}) {
  const prob = clamp01(prediction.probability);
  return {
    timestamp: Number.isFinite(Number(prediction.timestamp)) ? Number(prediction.timestamp) : Date.now(),
    probability: prob,
    probabilityRaw: Number.isFinite(Number(prediction.probabilityRaw)) ? clamp01(prediction.probabilityRaw) : prob,
    observed: prediction.observed != null ? (prediction.observed ? 1 : 0) : null,
    targetScore: Number.isFinite(Number(prediction.targetScore)) ? Number(prediction.targetScore) : null,
    sims: Number(prediction.sims) || 5000,
    category: prediction.category || 'global',
    effectiveN: Number.isFinite(Number(prediction.effectiveN)) ? Number(prediction.effectiveN) : null
  };
}

export function computeCalibrationSummary(events = [], options = {}) {
  const clean = (events || []).filter(e =>
    Number.isFinite(e?.probability) && (e?.observed === 0 || e?.observed === 1)
  );
  if (clean.length < 3) {
    return { n: clean.length, ece: 0, avgBrier: 0, reliability: [], trend: 'insufficient_data' };
  }
  const diag = computeCalibrationDiagnostics(clean.map(e => ({ probability: e.probability, observed: e.observed })), { bins: options.bins || 6 });
  const briers = clean.map(e => computeBrierScore(e.probability, e.observed));
  const avgBrier = kahanSum(briers) / briers.length;
  const mid = Math.floor(clean.length / 2);
  const firstHalf = briers.slice(0, mid);
  const secondHalf = briers.slice(mid);
  const firstAvg = firstHalf.length ? kahanSum(firstHalf) / firstHalf.length : avgBrier;
  const secondAvg = secondHalf.length ? kahanSum(secondHalf) / secondHalf.length : avgBrier;
  const trend = secondAvg < firstAvg * 0.92 ? 'improving' : (secondAvg > firstAvg * 1.08 ? 'degrading' : 'stable');
  return {
    n: clean.length, ece: diag.ece, mce: diag.mce,
    avgBrier: Number(avgBrier.toFixed(4)),
    reliability: diag.reliability, trend, brierDecomposition: diag.brierDecomposition
  };
}

// FIX M4: imutável, causal (ts >= evento) e targetScore null-safe
export function backfillObservedFromSimulados(calibrationEvents = [], simuladoRows = [], _categories = [], maxScore = 100) {
  if (!Array.isArray(calibrationEvents)) return [];
  if (!Array.isArray(simuladoRows) || simuladoRows.length === 0) return calibrationEvents;
  const timed = simuladoRows
    .map(row => ({ row, ts: Date.parse(row?.date || row?.createdAt) }))
    .filter(x => Number.isFinite(x.ts))
    .sort((a, b) => a.ts - b.ts);
  if (timed.length === 0) return calibrationEvents;
  return calibrationEvents.map(ev => {
    if (!ev || ev.observed != null || !ev.category) return ev;
    if (ev.targetScore == null || !Number.isFinite(Number(ev.timestamp))) return ev;
    const hit = timed.find(x =>
      x.ts >= Number(ev.timestamp) &&
      isSubjectMatch(ev.category, x.row.subject || x.row.categoryName)
    );
    if (!hit) return ev;
    const score = getSafeScore(hit.row, maxScore);
    if (!Number.isFinite(score)) return ev;
    return { ...ev, observed: score >= Number(ev.targetScore) ? 1 : 0, backfilled: true, observedAt: hit.ts };
  });
}

// FIX F1: baseline posterior que aprende (fallback avgBrier + pesos corretos)
export function computeRollingCalibrationParams(history = [], cfg = {}) {
  const safeHistory = Array.isArray(history) ? history : [];
  const windowDays = Number(cfg.windowDays) || 60;
  const cutoff = Date.now() - windowDays * 86400000;
  const maxSamples = Number(cfg.maxSamples) || 20;

  const isSignalEvent = (h) => {
    if (!h || !Number.isFinite(Number(h?.timestamp))) return false;
    const hasObserved = Number.isFinite(Number(h.probability)) && (h.observed === 0 || h.observed === 1);
    const hasBrier = Number.isFinite(Number(h.avgBrier));
    return hasObserved || hasBrier;
  };

  const recent = safeHistory
    .filter(h => isSignalEvent(h) && Number(h.timestamp) >= cutoff)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    .slice(-maxSamples);

  const minSamples = Number(cfg.minSamples) || 4;
  if (recent.length < minSamples) {
    return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3, confidenceFactor: 0 };
  }
  const isPct = recent.some(r => Number(r.probability) > 1);
  const now = Date.now();
  const LAMBDA = Math.log(2) / (14 * 86400000);
  let sw = 0, swb = 0;
  for (const h of recent) {
    let b = null;
    if (Number.isFinite(Number(h.probability)) && (h.observed === 0 || h.observed === 1)) {
      const p = (isPct || Number(h.probability) > 1) ? Number(h.probability) / 100 : Number(h.probability);
      b = (p - h.observed) ** 2;
    } else if (Number.isFinite(Number(h.avgBrier))) {
      b = Number(h.avgBrier);
    }
    if (b === null) continue;
    const w = Math.exp(-LAMBDA * Math.max(0, now - Number(h.timestamp)));
    swb += b * w; sw += w;
  }
  if (sw <= 1e-9) return { baseline: cfg.baseline ?? 0.2, maxPenalty: cfg.maxPenalty ?? 0.3, confidenceFactor: 0 };
  const kappa = Number(cfg.priorStrength) || 6;
  const mu0 = Number(cfg.baseline) || 0.2;
  const baseline = (swb + kappa * mu0) / (sw + kappa);
  const avgBrier = swb / sw;
  const confidenceFactor = Math.min(1, recent.length / (Number(cfg.targetSamples) || 12));
  const maxPenalty = (avgBrier > 0.25 ? 0.35 : 0.25) * confidenceFactor
                   + (cfg.maxPenalty ?? 0.3) * (1 - confidenceFactor);
  return { baseline, maxPenalty, confidenceFactor, avgBrier };
}

export const CRITICAL_BRIER_THRESHOLD = 0.28;
export const HIGH_PENALTY_THRESHOLD = 0.20;
export const ALERT_COOLDOWN_MS = 1000 * 60 * 60 * 12;

// [LOTE 5] PAV com bloco mínimo anti-escada
export function fitIsotonicCalibration(pairs = [], options = {}) {
  const clean = (pairs || [])
    .map(p => ({ x: Number(p?.probability), y: Number(p?.observed) }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map(p => ({ x: clamp01(p.x), y: clamp01(p.y) }))
    .sort((a, b) => a.x - b.x);
  if (clean.length === 0) return [];
  let blocks = pavBlocks(clean.map(p => ({ minX: p.x, maxX: p.x, sumWY: p.y, sumW: 1, mean: p.y })));
  const minBlock = Math.max(2, Math.floor(clean.length / (Number(options.maxBlocks) || 6)));
  let guard = 0;
  while (blocks.length > 1 && blocks.some(b => b.sumW < minBlock) && guard++ < 24) {
    const idx = blocks.findIndex(b => b.sumW < minBlock);
    const left = blocks[idx - 1];
    const right = blocks[idx + 1];
    const useLeft = left && (!right || Math.abs(left.mean - blocks[idx].mean) <= Math.abs(right.mean - blocks[idx].mean));
    const j = useLeft ? idx - 1 : idx + 1;
    const a = blocks[Math.min(idx, j)];
    const b = blocks[Math.max(idx, j)];
    blocks.splice(Math.min(idx, j), 2, {
      minX: a.minX, maxX: b.maxX,
      sumWY: a.sumWY + b.sumWY, sumW: a.sumW + b.sumW,
      mean: (a.sumWY + b.sumWY) / (a.sumW + b.sumW)
    });
    blocks = pavBlocks(blocks);
  }
  return blocks.map(b => ({ minX: b.minX, maxX: b.maxX, value: b.mean }));
}

// Interpolação linear entre blocos (monotônica)
export function predictIsotonicProbability(probability01, model = []) {
  const p = clamp01(probability01);
  if (!Array.isArray(model) || model.length === 0) return p;
  if (p <= model[0].minX) return clamp01(model[0].value);
  const last = model[model.length - 1];
  if (p >= last.maxX) return clamp01(last.value);
  for (let i = 0; i < model.length; i++) {
    const b = model[i];
    if (p >= b.minX && p <= b.maxX) return clamp01(b.value);
    if (p > b.maxX && i + 1 < model.length && p < model[i + 1].minX) {
      const t = (p - b.maxX) / Math.max(1e-9, model[i + 1].minX - b.maxX);
      return clamp01(b.value * (1 - t) + model[i + 1].value * t);
    }
  }
  return clamp01(last.value);
}

export function calibrateWithBBQ(probability01, pairs = [], options = {}) {
  const p = clamp01(probability01);
  const clean = (pairs || [])
    .map(x => ({ probability: Number(x?.probability), observed: Number(x?.observed) }))
    .filter(x => Number.isFinite(x.probability) && Number.isFinite(x.observed))
    .map(x => ({ probability: clamp01(x.probability), observed: clamp01(x.observed) }));
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
    const hi = isLastBin ? 1.01 : sorted[end].probability;
    if (!(p >= lo && (p < hi || isLastBin))) continue;
    const succ = kahanSum(slice.map(x => x.observed));
    const n = slice.length;
    return (succ + alpha0) / (n + alpha0 + beta0);
  }
  return p;
}

// FIX F4: conformal real (resíduos) + teto 0.35 + piso = ruído amostral
export function conformalizedCalibrationInterval(probability01, pairs = [], alpha = 0.1) {
  const p = clamp01(probability01);
  const clean = (pairs || [])
    .map(x => ({ probability: clamp01(x?.probability), observed: clamp01(x?.observed) }))
    .filter(x => Number.isFinite(x.probability) && Number.isFinite(x.observed));
  if (clean.length < 8) {
    let low = p - 0.15;
    let high = p + 0.15;
    if (high > 1) { low -= (high - 1); high = 1; }
    if (low < 0) { high += (0 - low); low = 0; }
    return { low: Math.max(0, low), high: Math.min(1, high), qHat: 0.15 };
  }
  const n = clean.length;
  const residuals = clean.map(x => Math.abs(x.probability - x.observed)).sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(n - 1, Math.ceil((1 - alpha) * n) - 1));
  const qConformal = residuals[idx] * ((n + 1) / n);
  const smoothedP = (p * n + 0.5) / (n + 1);
  const standardError = Math.sqrt((smoothedP * (1 - smoothedP)) / n);
  const zScore = alpha <= 0.05 ? 1.96 : (alpha <= 0.1 ? 1.645 : 1.28);
  const qHat = Math.min(0.35, Math.max(qConformal, standardError * zScore));
  let low = p - qHat;
  let high = p + qHat;
  if (high > 1) { low -= (high - 1); high = 1; }
  if (low < 0) { high += (0 - low); low = 0; }
  return { low: Math.max(0, low), high: Math.min(1, high), qHat };
}

// FIX F3: Akaike weights + complexidade + shrink p/ uniforme
export function computeStackingWeights(candidateProbs = [], observed = [], complexityParams = [0, 4, 6]) {
  const k = Array.isArray(candidateProbs) ? candidateProbs.length : 0;
  if (k === 0) return [];
  const n = Array.isArray(observed) ? observed.length : 0;
  if (n === 0) return new Array(k).fill(1 / k);
  const logLoss = candidateProbs.map(series => {
    if (!Array.isArray(series) || series.length !== n) return 1e6;
    let acc = 0;
    for (let i = 0; i < n; i++) acc += computeLogLoss(series[i], observed[i]);
    return acc / n;
  });
  const aic = logLoss.map((l, m) => 2 * l * n + 2 * (Number(complexityParams[m]) || 0));
  const minAic = Math.min(...aic);
  const raw = aic.map(a => Math.exp(-0.5 * (a - minAic)));
  const z = kahanSum(raw) || 1;
  const maxLoss = Math.max(...logLoss);
  const isSeverePenalty = maxLoss > 2.0;
  const lambda = Math.min(1, Math.max(0, n / (n + (isSeverePenalty ? 0.2 : 4))));
  return raw.map(w => lambda * (w / z) + (1 - lambda) / k);
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
    return { trend: [], rolling7: [], controlLimits: { brierMean: null, brierUpper95: null, brierLower95: null }, driftSignals: [] };
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
    : { brierMean: mean, brierUpper95: mean + 2 * sd, brierLower95: Math.max(0, mean - 2 * sd) };
  const driftSignals = trend.map((row) => ({
    timestamp: row.timestamp,
    date: row.date,
    outOfControl: mean !== null && Number.isFinite(row.avgBrier)
      ? row.avgBrier > (controlLimits.brierUpper95 ?? Infinity)
      : false
  }));
  return { trend, rolling7, controlLimits, driftSignals };
}
