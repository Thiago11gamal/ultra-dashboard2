import { monteCarloSimulation } from '../engine/monteCarlo.js';
import { getSafeScore } from './scoreHelper.js';
import { computeBrierScore, summarizeCalibration, shrinkProbabilityToNeutral, computeCalibrationDiagnostics, fitIsotonicCalibration, predictIsotonicProbability, calibrateWithBBQ, conformalizedCalibrationInterval, computeStackingWeights } from './calibration.js';
import { getDateKey, safeDateParse } from './dateHelper.js';
import { kahanSum } from '../engine/math/kahan.js';
import { detectDataAnomalies } from '../engine/diagnostics.js';
import { pruneHistoryForMemory } from '../engine/stats.js';

/**
 * Deriva thresholds adaptativos de risco (danger/safe) para Monte Carlo.
 * 
 * CORREÇÃO BUG #5: Tratamento explícito de variância zero.
 * Quando todas as notas são idênticas, o gap entre danger/safe é estreito
 * para refletir a alta certeza do aluno (baixa volatilidade).
 */
export function deriveAdaptiveRiskThresholds(scores = [], volatility = null, cfg = {}, maxScore = 100, backtestPairs = []) {
  const fallbackDanger = Number(cfg.MC_PROB_DANGER) || 30;
  const fallbackSafe = Number(cfg.MC_PROB_SAFE) || 90;
  const rawScores = (scores || []).map(Number).filter(Number.isFinite);
  
  // ADAPT-01: Bayesian Online threshold derivation from backtest pairs
  const cleanPairs = (backtestPairs || []).filter(p => 
    Number.isFinite(Number(p?.probability)) && Number.isFinite(Number(p?.observed))
  );
  
  if (cleanPairs.length >= 6) {
    const sorted = [...cleanPairs].sort((a, b) => Number(a.probability) - Number(b.probability));
    const globalSuccessRate = cleanPairs.filter(p => Number(p.observed) >= 0.5).length / cleanPairs.length;
    const K = 1.0;
    const alphaPrior = Math.max(0.2, Math.min(0.8, globalSuccessRate)) * K;
    
    let dangerCandidates = [];
    let safeCandidates = [];
    
    for (let cutoff = 0.10; cutoff <= 0.901; cutoff += 0.05) {
      const below = sorted.filter(p => Number(p.probability) <= cutoff);
      const above = sorted.filter(p => Number(p.probability) > cutoff);
      
      if (below.length >= 2) {
        const successBelow = below.filter(p => Number(p.observed) >= 0.5).length;
        const posteriorMeanBelow = (successBelow + alphaPrior) / (below.length + K);
        if (posteriorMeanBelow < 0.35) {
          dangerCandidates.push(cutoff * 100);
        }
      }
      
      if (above.length >= 2) {
        const successAbove = above.filter(p => Number(p.observed) >= 0.5).length;
        const posteriorMeanAbove = (successAbove + alphaPrior) / (above.length + K);
        if (posteriorMeanAbove > 0.85) {
          safeCandidates.push(cutoff * 100);
        }
      }
    }
    
    let danger = dangerCandidates.length > 0 
      ? Math.max(15, Math.min(50, dangerCandidates[dangerCandidates.length - 1]))
      : fallbackDanger;
    let safe = safeCandidates.length > 0
      ? Math.max(65, Math.min(97, safeCandidates[0]))
      : fallbackSafe;
    
    if (safe - danger < 25) safe = Math.min(97, danger + 25);
    
    const shrinkFactor = Math.min(1, cleanPairs.length / 20);
    danger = danger * shrinkFactor + fallbackDanger * (1 - shrinkFactor);
    safe = safe * shrinkFactor + fallbackSafe * (1 - shrinkFactor);
    
    return { danger: Math.round(danger * 10) / 10, safe: Math.round(safe * 10) / 10 };
  }
  
  // Fallback: heurística baseada em scores (MELHORADA)
  if (rawScores.length < 4) return { danger: fallbackDanger, safe: fallbackSafe };
  
  const safeMax = maxScore > 0 ? maxScore : 100;
  const cleanScores = rawScores.map(s => (s / safeMax) * 100);
  const sorted = [...cleanScores].sort((a, b) => a - b);
  
  const q = (p) => {
    const idx = Math.max(0, Math.min(sorted.length - 1, (sorted.length - 1) * p));
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const t = idx - lo;
    return sorted[lo] * (1 - t) + sorted[hi] * t;
  };
  
  const median = q(0.5);
  
  // ✅ CORREÇÃO BUG #5: Proteção contra Variância Zero
  const isZeroVariance = cleanScores.every(s => s === median);
  
  if (isZeroVariance) {
    // Aluno consistente: gap estreito, thresholds próximos da média
    const danger = Math.max(15, median - 10);
    const safe = Math.min(95, median + 10);
    return { danger, safe };
  }
  
  const aboveMedianRate = cleanScores.filter(s => s > median).length / cleanScores.length;
  
  let danger = Math.max(15, Math.min(45, q(0.25) * (0.4 + aboveMedianRate * 0.3)));
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

/**
 * Calcula o boost contínuo de urgência baseado na probabilidade Monte Carlo.
 * 
 * ✅ CORREÇÃO BUG #1: Suavização C¹ contínua usando smoothstep.
 * Elimina descontinuidades na derivada que causavam "saltos visuais"
 * quando a probabilidade cruzava o limiar de perigo.
 */
export function computeContinuousMcBoost(probability, dangerThreshold, safeThreshold, volatility, maxScore, cfg = {}) {
  const safeMaxScore = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const p = Math.max(0, Math.min(100, Number(probability) || 0));
  const d = Math.max(1, Math.min(99, Number(dangerThreshold) || cfg.MC_PROB_DANGER || 30));
  const s = Math.max(d + 1, Math.min(99, Number(safeThreshold) || cfg.MC_PROB_SAFE || 90));
  
  const maxDangerBoost = (Number(cfg.MC_BOOST_DANGER_BASE) || 12) + (Number(cfg.MC_BOOST_DANGER_RANGE) || 13);
  const baseDangerBoost = Number(cfg.MC_BOOST_DANGER_BASE) || 12;
  const minBoost = Number(cfg.MC_BOOST_SAFE_PENALTY) || -8;
  
  // ✅ CORREÇÃO BUG #1: Função smoothstep para interpolação C¹ contínua
  const smoothstep = (x) => x * x * (3 - 2 * x);
  
  let boost = 0;
  
  if (p <= d) {
    // Zona Crítica (0% até Perigo): Escala de maxDangerBoost (25) descendo até baseDangerBoost (12)
    const ratio = d > 0 ? Math.max(0, Math.min(1, p / d)) : 0;
    const t = smoothstep(ratio);
    boost = maxDangerBoost - (t * (maxDangerBoost - baseDangerBoost));
  } else if (p < s) {
    // Zona Moderada (Perigo até Segurança): Transição de 12 descendo até -8
    const ratio = Math.max(0, Math.min(1, (p - d) / (s - d)));
    const t = smoothstep(ratio);
    boost = baseDangerBoost - (t * (baseDangerBoost - minBoost));
  } else {
    // Modo Cruzeiro (>= Segurança): Fixo no alívio de -8
    boost = minBoost;
  }
  
  // MATH-FIX: Se a volatilidade for alta, reduzimos o 'alívio' (boost negativo).
  const lowVolLimit = (Number(cfg.MC_VOLATILITY_HIGH || 8) * 0.7) * (safeMaxScore / 100);
  if (Number.isFinite(volatility) && volatility >= lowVolLimit && boost < 0) {
    boost *= 0.25;
  }
  
  let riskLabel = 'ok';
  if (p <= d) riskLabel = 'critical';
  else if (p < s) riskLabel = 'moderate';
  else if (p >= s && boost < 0) riskLabel = 'safe';
  
  return {
    boost: Number(boost.toFixed(4)),
    riskLabel
  };
}

export function deriveBacktestWeights(rawScores = [], maxScore = 100) {
  const scores = (Array.isArray(rawScores) ? rawScores : []).filter(Number.isFinite);
  const n = scores.length;
  
  if (n < 2) return { scoreWeight: 1, recencyWeight: 1, instabilityWeight: 1, rankQuality: 1, uplift: 0, effectiveN: n };
  
  const last = scores[n - 1];
  const prev = scores[n - 2];
  const uplift = last - prev;
  
  const scoreWeight = Math.max(0.85, Math.min(1.2, 1 + (uplift / (maxScore || 100)) * 0.4));
  const recencyWeight = Math.max(0.9, Math.min(1.15, 1 + (n / 50) * 0.15));
  const rankQuality = scores.filter(s => s >= (maxScore * 0.7)).length / n;
  const instabilityWeight = Math.max(0.8, Math.min(1.25, 1 - rankQuality * 0.15 + (uplift < 0 ? 0.15 : -0.05)));
  
  const weighted = scores.map((_, i) => Math.exp(-0.015 * (n - i)));
  const sumW = kahanSum(weighted);
  const sumW2 = kahanSum(weighted.map(w => w * w));
  const effectiveN = sumW2 > 1e-9 ? (sumW * sumW) / sumW2 : scores.length;
  
  return {
    scoreWeight,
    recencyWeight,
    instabilityWeight,
    rankQuality,
    uplift,
    effectiveN: Number(effectiveN.toFixed(2))
  };
}

/**
 * MC-01: Mapper simulados → history para monteCarloSimulation
 */
export function simuladosToHistory(simulados, maxScore = 100) {
  if (!simulados || !Array.isArray(simulados)) return [];
  
  const sorted = simulados
    .map((s, idx) => {
      const parsed = Date.parse(s.date || s.createdAt);
      return {
        score: getSafeScore(s, maxScore),
        rawTimestamp: Number.isFinite(parsed) ? parsed : 0,
        date: Number.isFinite(parsed) ? getDateKey(new Date(parsed)) : null,
        _idx: idx
      };
    })
    .sort((a, b) => {
      if (a.rawTimestamp !== b.rawTimestamp) return a.rawTimestamp - b.rawTimestamp;
      return a._idx - b._idx;
    });
  
  // FATIGUE FILTER
  let burstCount = 1;
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = sorted[i - 1];
    
    if (current.rawTimestamp - prev.rawTimestamp < 7200000 && current.rawTimestamp > 0) {
      burstCount++;
    } else {
      burstCount = 1;
    }
    
    if (burstCount >= 3 && current.score < prev.score) {
      current.fatigueFlag = true;
    } else {
      current.fatigueFlag = false;
    }
  }
  
  return sorted
    .map(({ score, date, fatigueFlag }) => ({ score, date, fatigueFlag }))
    .filter(item => typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.date.trim()));
}

import { clearEngineMcCache } from '../engine/monteCarlo.js';

const mcCache = new Map();
const MC_CACHE_MAX = 50;

export function clearMcCache() {
  mcCache.clear();
  clearEngineMcCache();
}

export function deriveCoachAdaptiveParams(history = [], maxScore = 100, cfg = {}) {
  const n = history.length;
  
  if (n === 0) {
    return { decayK: 0.07, minWeight: 0.03, scoreClampDelta: maxScore * 0.3, mcSimulations: cfg.MC_SIMULATIONS || 800 };
  }
  
  const scores = history.map(h => Number(h.score) || 0);
  const mean = kahanSum(scores) / n;
  const devs = scores.map(s => (s - mean) ** 2);
  const variance = n > 1 ? kahanSum(devs) / (n - 1) : 0;
  const sd = Math.sqrt(Math.max(0, variance));
  const cv = mean > 0 ? Math.min(2, sd / mean) : 1;
  
  let medianGapDays = 7;
  if (n >= 2) {
    const sortedDates = history
      .map(h => h.date ? (safeDateParse(h.date)?.getTime() || 0) : 0)
      .filter(t => t > 0)
      .sort((a, b) => a - b);
    
    if (sortedDates.length >= 2) {
      const gaps = [];
      for (let i = 1; i < sortedDates.length; i++) {
        gaps.push(Math.max(0.5, (sortedDates[i] - sortedDates[i - 1]) / 86400000));
      }
      gaps.sort((a, b) => a - b);
      medianGapDays = gaps.length % 2 === 0
        ? (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2
        : gaps[Math.floor(gaps.length / 2)];
    }
  }
  
  const coverageFactor = Math.max(0.8, Math.min(1.3, Math.sqrt(10 / Math.max(2, n))));
  const gapFactor = Math.max(0.7, Math.min(1.4, 0.8 + 0.6 * (1 - Math.exp(-medianGapDays / 14))));
  const decayK = Math.max(0.03, Math.min(0.12, 0.07 * coverageFactor * gapFactor));
  const minWeight = Math.max(0.01, Math.min(0.08, 0.015 + (cv * 0.02)));
  const scoreClampDelta = Math.max(maxScore * 0.12, Math.min(maxScore * 0.45, (0.2 + cv * 0.15) * maxScore));
  const mcSimulations = Math.round(Math.max(400, Math.min(2500, (cfg.MC_SIMULATIONS || 800) * (0.8 + cv * 0.7) * coverageFactor)));
  
  return { decayK, minWeight, scoreClampDelta, mcSimulations, medianGapDays };
}

function getCpuAwareSimulationCap(defaultCap = 2500, cfg = {}) {
  try {
    const manualCap = Number(cfg?.MC_SIMULATION_CAP);
    if (Number.isFinite(manualCap) && manualCap >= 300) {
      return Math.min(defaultCap, Math.round(manualCap));
    }
    
    if (cfg?.MC_FORCE_MAX_SIMULATIONS === true) return defaultCap;
    
    const threads = Number(globalThis?.navigator?.hardwareConcurrency);
    if (!Number.isFinite(threads) || threads <= 0) return defaultCap;
    
    if (threads <= 2) return Math.min(defaultCap, 900);
    if (threads <= 4) return Math.min(defaultCap, 1400);
    if (threads <= 6) return Math.min(defaultCap, 1900);
    return defaultCap;
  } catch {
    return defaultCap;
  }
}

/**
 * MC-02: Monte Carlo leve para uso no Coach.
 * 
 * ✅ CORREÇÃO BUG #3: Penalty conservador para amostras pequenas.
 * Alunos com menos de 8 simulados recebem um penalty padrão para evitar
 * overconfidence em projeções baseadas em dados insuficientes.
 */
export function runCoachMonteCarlo(relevantSimulados, targetScore, cfg, categoryId, maxScore = 100, adaptive = null, days = 90, agilityPenalty = 0) {
  const safeCfg = cfg || {};
  const safeMaxScore =
    Number.isFinite(Number(maxScore)) && Number(maxScore) > 0
      ? Number(maxScore)
      : 100;

  const safeMinScore = 0;
  const range = Math.max(1e-9, safeMaxScore - safeMinScore);
  const minTarget = safeMinScore + 0.01 * range;
  const defaultTarget = safeMinScore + 0.8 * range;

  const safeTargetScore = Number.isFinite(Number(targetScore))
    ? Math.max(minTarget, Math.min(safeMaxScore, Number(targetScore)))
    : defaultTarget;

  if (!Array.isArray(relevantSimulados)) {
    return null;
  }

  let history = simuladosToHistory(relevantSimulados, safeMaxScore);

  if (history.length < (safeCfg.MC_MIN_DATA_POINTS || 5)) return null;
  
  if (history.length > 2000) {
    history = pruneHistoryForMemory(history, 1200, 365*4);
  }
  
  const anomalies = detectDataAnomalies(history, maxScore);
  const dataIssues = anomalies.filter(a => a.severity === 'error' || a.severity === 'warning').length;
  const dataQuality = Math.max(0.3, 1 - (dataIssues * 0.15));
  
  const lowSampleThreshold = Math.max(Number(cfg.MC_LOW_SAMPLE_THRESHOLD) || 10, (cfg.MC_MIN_DATA_POINTS || 5) + 2);
  const isLowSample = history.length < lowSampleThreshold || dataIssues > 0;
  
  // ✅ CORREÇÃO BUG #3: Penalty conservador para amostras pequenas
  const lowSamplePenalty = history.length < 8 
    ? Math.min(0.15, (8 - history.length) * 0.02) 
    : 0;
  
  const sumCorrect = (relevantSimulados || []).reduce((a, s) => a + getSafeScore(s, maxScore), 0);
  const sequenceChecksum = (relevantSimulados || []).reduce((acc, sim, idx) => {
    const score = getSafeScore(sim, maxScore);
    const date = String(sim?.date || sim?.createdAt || '');
    const subject = String(sim?.subject || '');
    let charSum = 0;
    const token = `${date}|${subject}`;
    for (let i = 0; i < token.length; i++) charSum += token.charCodeAt(i);
    return acc + ((idx + 1) * Math.round(score * 100)) + charSum;
  }, 0);
  
  const firstDate = history[0]?.date || '';
  const lastDate = history[history.length - 1]?.date || '';
  const calibHash = `${cfg.MC_CALIBRATION_BRIER_BASELINE ?? ''}-${cfg.MC_CALIBRATION_MAX_PENALTY ?? ''}-${cfg.MC_CALIBRATION_NEUTRAL_PCT ?? ''}-${cfg.MC_CALIBRATION_MAX_APPLIED_PENALTY ?? ''}-${cfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false}`;
  const adaptiveHash = adaptive ? `${adaptive.mcSimulations || 0}-${adaptive.decayK || 0}` : 'no-adapt';
  const userId = cfg?.userId || 'default';
  const hash = `${userId}-${categoryId}-${maxScore}-${history.length}-${Number(sumCorrect).toFixed(2)}-${safeTargetScore}-${sequenceChecksum}-${firstDate}-${lastDate}-${days}-${calibHash}-${adaptiveHash}-ag${agilityPenalty}`;
  
  if (mcCache.has(hash)) {
    const val = mcCache.get(hash);
    mcCache.delete(hash);
    mcCache.set(hash, val);
    return val;
  }
  
  try {
    const requestedSims = adaptive?.mcSimulations || cfg.MC_SIMULATIONS || 800;
    const simulationCap = getCpuAwareSimulationCap(2500, cfg);
    const qualityBoost = dataQuality < 0.7 ? 1.3 : 1.0;
    const safeSimulations = Math.max(300, Math.min(simulationCap, Math.round(Number(requestedSims) || 800) * qualityBoost));
    
    const result = monteCarloSimulation(
      history,
      safeTargetScore,
      days,
      safeSimulations,
      { maxScore, agilityPenalty, globalBaselinePct: cfg.MC_CALIBRATION_NEUTRAL_PCT }
    );
    
    const enableAdaptiveCalibration = cfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false;
    let calibrationPenalty = 0;
    let avgBrier = 0;
    let ece = 0;
    let reliability = [];
    let predObsPairs = [];
    let rawPreds = [];
    let observedSeq = [];
    
    if (enableAdaptiveCalibration && history.length >= 8) {
      const dynamicHorizon = Math.max(
        cfg.MC_BACKTEST_HORIZON || 3,
        Math.min(Number(cfg.MC_BACKTEST_HORIZON_MAX) || 6, Math.floor(history.length / 3))
      );
      
      const isLowPerformance = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency <= 4 || /Mobi|Android/i.test(navigator.userAgent));
      const defaultHorizon = Math.min(dynamicHorizon, history.length - (cfg.MC_MIN_DATA_POINTS || 5));
      const horizon = isLowPerformance ? Math.min(3, defaultHorizon) : defaultHorizon;
      
      const brierScores = [];
      
      for (let i = 1; i <= horizon; i++) {
        const train = history.slice(0, history.length - i);
        const observedRecord = history[history.length - i];
        
        const lookAhead = Math.min(3, i);
        const futureWindow = history.slice(history.length - i, history.length - i + lookAhead);
        const avgFutureScore = futureWindow.reduce((acc, r) => acc + r.score, 0) / futureWindow.length;
        const observed = avgFutureScore >= safeTargetScore ? 1 : 0;
        
        try {
          let gapDays = 7;
          if (train.length > 0 && observedRecord.date) {
            const trainDateMs = safeDateParse(train[train.length - 1].date)?.getTime() || NaN;
            const obsDateMs = safeDateParse(observedRecord.date)?.getTime() || NaN;
            if (!Number.isNaN(trainDateMs) && !Number.isNaN(obsDateMs) && obsDateMs > trainDateMs) {
              gapDays = Math.max(1, (obsDateMs - trainDateMs) / 86400000);
            }
          }
          
          const bt = monteCarloSimulation(
            train,
            safeTargetScore,
            gapDays,
            Math.min(500, Math.max(200, Math.floor(safeSimulations * 0.35))),
            { maxScore }
          );
          
          const p = Math.max(0, Math.min(1, (bt.probability || 0) / 100));
          brierScores.push(computeBrierScore(p, observed));
          predObsPairs.push({ probability: p, observed });
          rawPreds.push(p);
          observedSeq.push(observed);
        } catch {
          // ignore
        }
      }
      
      if (brierScores.length > 0) {
        const summary = summarizeCalibration(brierScores, {
          baseline: adaptive?.calibrationBaseline ?? cfg.MC_CALIBRATION_BRIER_BASELINE ?? 0.18,
          maxPenalty: adaptive?.calibrationMaxPenalty ?? cfg.MC_CALIBRATION_MAX_PENALTY ?? 0.25
        });
        
        calibrationPenalty = summary.calibrationPenalty;
        avgBrier = summary.avgBrier;
        
        const adaptiveBins = predObsPairs.length >= 18
          ? (Number(cfg.MC_ECE_BINS_MAX) || 8)
          : predObsPairs.length >= 10
          ? (Number(cfg.MC_ECE_BINS_MID) || 6)
          : (Number(cfg.MC_ECE_BINS_MIN) || 4);
        
        const diagnostics = computeCalibrationDiagnostics(predObsPairs, { bins: adaptiveBins });
        ece = diagnostics.ece;
        reliability = diagnostics.reliability;
        
        const eceScaled = Math.max(0, Math.min(1, ece / 0.25));
        const mceScaled = Math.max(0, Math.min(1, Number(diagnostics.mce || 0) / 0.4));
        const penaltyCap = adaptive?.calibrationMaxPenalty ?? cfg.MC_CALIBRATION_MAX_PENALTY ?? 0.25;
        
        const composedPenalty = Math.min(
          penaltyCap,
          (calibrationPenalty * 0.7) + (eceScaled * 0.2 * penaltyCap) + (mceScaled * 0.1 * penaltyCap)
        );
        
        calibrationPenalty = composedPenalty;
      }
    }
    
    // ✅ CORREÇÃO BUG #3: Aplicar penalty de amostra pequena
    calibrationPenalty = Math.max(calibrationPenalty, lowSamplePenalty);
    
    let isotonicModel = [];
    let stackingWeights = [0.34, 0.33, 0.33];
    
    if (predObsPairs.length >= 6) {
      isotonicModel = fitIsotonicCalibration(predObsPairs);
      const isotonicSeries = rawPreds.map(p => predictIsotonicProbability(p, isotonicModel));
      const bbqSeries = rawPreds.map(p => calibrateWithBBQ(p, predObsPairs));
      stackingWeights = computeStackingWeights([rawPreds, isotonicSeries, bbqSeries], observedSeq);
    }
    
    const rawProb = Math.max(0, Math.min(100, Number(result.probability) || 0));
    const rawProb01 = rawProb / 100;
    const isoProb01 = predObsPairs.length >= 6 ? predictIsotonicProbability(rawProb01, isotonicModel) : rawProb01;
    const bbqProb01 = predObsPairs.length >= 6 ? calibrateWithBBQ(rawProb01, predObsPairs) : rawProb01;
    
    const stackedProb01 = Math.max(0, Math.min(1,
      (stackingWeights[0] || 0) * rawProb01 +
      (stackingWeights[1] || 0) * isoProb01 +
      (stackingWeights[2] || 0) * bbqProb01
    ));
    
    const probability = enableAdaptiveCalibration
      ? shrinkProbabilityToNeutral(
          stackedProb01 * 100,
          calibrationPenalty,
          cfg.MC_CALIBRATION_NEUTRAL_PCT || 50,
          cfg.MC_CALIBRATION_MAX_APPLIED_PENALTY || 0.5
        )
      : (stackedProb01 * 100);
    
    const extraLowSampleShrink = isLowSample
      ? Math.min(0.35, (lowSampleThreshold - history.length) / lowSampleThreshold) * (1 / dataQuality)
      : 0;
    
    const adjustedProbability = isLowSample
      ? shrinkProbabilityToNeutral(probability, extraLowSampleShrink, cfg.MC_CALIBRATION_NEUTRAL_PCT || 50, 0.5)
      : probability;
    
    const ciLow = Number(result.ci95Low) || 0;
    const ciHigh = Number(result.ci95High) || 0;
    const ciMid = (ciLow + ciHigh) / 2;
    const ciExpand = isLowSample ? (1 + Math.max(0, extraLowSampleShrink * 1.8)) : 1;
    const widenedCiLow = Math.max(0, ciMid - ((ciMid - ciLow) * ciExpand));
    const widenedCiHigh = Math.min(maxScore, ciMid + ((ciHigh - ciMid) * ciExpand));
    
    const conformal = conformalizedCalibrationInterval(stackedProb01, predObsPairs, 0.1);
    
    const finalResult = {
      diagnostics: result?.diagnostics || null,
      probability: adjustedProbability,
      volatility: (Number(result.volatility) || 0) * (1 + (enableAdaptiveCalibration ? calibrationPenalty * 0.8 : 0)),
      mean: result.mean,
      ci95Low: widenedCiLow,
      ci95High: widenedCiHigh,
      calibrationPenalty,
      avgBrier,
      ece,
      reliability,
      sampleSize: history.length,
      lowSampleAdjustment: Number(extraLowSampleShrink.toFixed(4)),
      conformalLow: Number((conformal.low * 100).toFixed(2)),
      conformalHigh: Number((conformal.high * 100).toFixed(2)),
      conformalQ: Number(conformal.qHat.toFixed(4)),
      stackingWeights,
      dataQuality: {
        historySize: history.length,
        predObsPairs: predObsPairs.length,
        calibrationEnabled: enableAdaptiveCalibration,
        anomalyCount: dataIssues,
        qualityScore: Number(dataQuality.toFixed(3)),
        anomalies: anomalies.filter(a => a.severity !== 'ok').slice(0, 3)
      }
    };
    
    if (mcCache.size >= MC_CACHE_MAX) {
      const firstKey = mcCache.keys().next().value;
      mcCache.delete(firstKey);
    }
    
    if (mcCache.has(hash)) mcCache.delete(hash);
    mcCache.set(hash, finalResult);
    
    return finalResult;
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[CoachMC] Simulação falhou:', e.message, { n: history.length });
    }
    return null;
  }
}
