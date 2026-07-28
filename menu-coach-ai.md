This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/components/coach/CoachMenuNav.jsx, src/pages/Coach.jsx, src/components/AICoachView.jsx, src/components/AICoachPlanner.jsx, src/components/AICoachWidget.jsx, src/utils/coachLogic.js, src/utils/coachAdaptive.js, src/utils/calibrationTelemetry.js, src/utils/displaySubject.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
src/
  components/
    coach/
      CoachMenuNav.jsx
    AICoachPlanner.jsx
    AICoachView.jsx
    AICoachWidget.jsx
  pages/
    Coach.jsx
  utils/
    calibrationTelemetry.js
    coachAdaptive.js
    coachLogic.js
    displaySubject.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="src/utils/calibrationTelemetry.js">
const TELEMETRY_KEY = 'coach_calibration_events_v1';
const TELEMETRY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45;

async function sendToFirebaseAnalytics(metric) {
    try {
        const { analytics, isLocalMode } = await import('../services/firebase.js');
        if (isLocalMode || !analytics) return;
        const { logEvent } = await import('firebase/analytics');
        logEvent(analytics, 'coach_calibration_event', {
            event_type: String(metric.eventType || 'calibration'),
            category_id: String(metric.categoryId || 'unknown'),
            avg_brier: Number(metric.avgBrier || 0),
            calibration_penalty: Number(metric.calibrationPenalty || 0),
            probability: Number(metric.probability || 0),
        });
    } catch {
        // analytics unavailable in this runtime
    }
}

export function logCalibrationTelemetryEvent(metric) {
    if (!metric || !metric.categoryId) return;
    try {
        const currentRaw = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
        const current = Array.isArray(currentRaw) ? currentRaw : [];
        const normalizedMetric = {
            eventType: metric.eventType || 'calibration',
            categoryId: String(metric.categoryId || 'unknown'),
            avgBrier: Number(metric.avgBrier || 0),
            calibrationPenalty: Number(metric.calibrationPenalty || 0),
            probability: Number(metric.probability || 0),
            ece: Number(metric.ece || 0),
            timestamp: Number(metric.timestamp || Date.now())
        };
        const cutoff = Date.now() - TELEMETRY_RETENTION_MS;
        const next = [...current, normalizedMetric]
            .filter(e => Number.isFinite(Number(e?.timestamp)) && Number(e.timestamp) >= cutoff)
            .slice(-1000);
        localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
        void sendToFirebaseAnalytics(normalizedMetric);
    } catch {
        // best effort telemetry
    }
}
</file>

<file path="src/utils/displaySubject.js">
import { normalize } from './normalization';

const SUBJECT_MAP = {
    'matematica': 'Matemática',
    'portugues': 'Português',
    'lingua portuguesa': 'Português',
    'ingles': 'Inglês',
    'ciencias': 'Ciências',
    'historia': 'História',
    'geografia': 'Geografia',
    'biologia': 'Biologia',
    'fisica': 'Física',
    'quimica': 'Química',
    'filosofia': 'Filosofia',
    'sociologia': 'Sociologia',
    'literatura': 'Literatura',
    'redacao': 'Redação',
    'informatica': 'Informática',
    'noções de informática': 'Informática',
    'raciocinio logico': 'Raciocínio Lógico',
    'rlm': 'Raciocínio Lógico',
    'direito constitucional': 'Dir. Constitucional',
    'dir constitucional': 'Dir. Constitucional',
    'dir. constitucional': 'Dir. Constitucional',
    'direito administrativo': 'Dir. Administrativo',
    'dir administrativo': 'Dir. Administrativo',
    'dir. administrativo': 'Dir. Administrativo'
};

const PREPOSITIONS = new Set(['e', 'de', 'do', 'da', 'dos', 'das', 'com', 'em', 'no', 'na', 'por', 'para']);

export const formatTitleCase = (str) => {
    if (!str || typeof str !== 'string') return '';
    return String(str)
        .split(' ')
        .filter(Boolean)
        .map((word, index) => {
            const lower = word.toLowerCase();
            if (index > 0 && PREPOSITIONS.has(lower)) {
                return lower;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
};

/**
 * Canonical display name resolver for subjects.
 * Single source of truth — respects 'Meu Painel' categories if provided.
 */
export const displaySubject = (name, categories = []) => {
    if (!name) return '';
    const nameStr = typeof name === 'object' && name.name ? String(name.name) : String(name);
    if (!nameStr.trim()) return '';

    if (Array.isArray(categories) && categories.length > 0) {
        const normName = normalize(nameStr);
        const match = categories.find(c => c && (c.id === nameStr || normalize(c.name || '') === normName));
        if (match && match.name) return match.name;
    }
    const norm = normalize(nameStr);
    return SUBJECT_MAP[norm] || formatTitleCase(nameStr);
};
</file>

<file path="src/utils/coachAdaptive.js">
import { monteCarloSimulation } from '../engine/monteCarlo.js';
import { getSafeScore } from './scoreHelper.js';
import { computeBrierScore, summarizeCalibration, shrinkProbabilityToNeutral, computeCalibrationDiagnostics, fitIsotonicCalibration, predictIsotonicProbability, calibrateWithBBQ, conformalizedCalibrationInterval, computeStackingWeights } from './calibration.js';
import { getDateKey, safeDateParse } from './dateHelper.js';
import { kahanSum } from '../engine/math/kahan.js';
import { detectDataAnomalies } from '../engine/diagnostics.js';
import { pruneHistoryForMemory } from '../engine/stats.js';
import { safeArray } from './coachSafe.js';

function hashString(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

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
    const danger = Math.max(15, Math.min(70, median - 12.5));
    const safe = Math.min(95, Math.max(danger + 25, median + 12.5));
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
  const scores = safeArray(rawScores).map(Number).filter(Number.isFinite);
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
        ...s,
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

  let history = simuladosToHistory(relevantSimulados, safeMaxScore)
    .filter(h => Number.isFinite(h.score));

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
  const cfgHash = hashString(JSON.stringify({
    cap: cfg.MC_SIMULATION_CAP,
    force: cfg.MC_FORCE_MAX_SIMULATIONS,
    min: cfg.MC_MIN_DATA_POINTS,
    low: cfg.MC_LOW_SAMPLE_THRESHOLD,
    horizon: cfg.MC_BACKTEST_HORIZON,
    horizonMax: cfg.MC_BACKTEST_HORIZON_MAX,
    bins: [cfg.MC_ECE_BINS_MIN, cfg.MC_ECE_BINS_MID, cfg.MC_ECE_BINS_MAX],
    calib: [
      cfg.MC_CALIBRATION_BRIER_BASELINE,
      cfg.MC_CALIBRATION_MAX_PENALTY,
      cfg.MC_CALIBRATION_NEUTRAL_PCT,
      cfg.MC_CALIBRATION_MAX_APPLIED_PENALTY,
      cfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false
    ]
  }));
  const contestId = cfg?.contestId || cfg?.userId || 'default';

  const hash = `${contestId}-${categoryId}-${maxScore}-${history.length}-${Number(sumCorrect).toFixed(2)}-${safeTargetScore}-${sequenceChecksum}-${firstDate}-${lastDate}-${days}-${calibHash}-${adaptiveHash}-${cfgHash}-ag${agilityPenalty}`;
  
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
      ? Math.min(
          0.9,
          Math.min(0.35, (lowSampleThreshold - history.length) / lowSampleThreshold) * (1 / dataQuality)
        )
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
      predObsPairs,
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
</file>

<file path="src/components/AICoachWidget.jsx">
import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

import {
    BrainCircuit, Zap, Target, Sparkles,
    ChevronDown, AlertTriangle, TrendingDown,
    Clock, CheckCircle2, Database, Flame, Loader2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { displaySubject } from '../utils/displaySubject';
import { getCalibrationKey } from '../utils/coachSafe.js';

// FIX-BUG-02: Regex com escape correto para **, !!, ++
function renderRecommendation(text, depth = 0) {
  if (depth > 6) return String(text || '');
  const safeText = String(text || '');
  const parts = safeText.split(/(\*\*.*?\*\*|!!.*?!!|\+\+.*?\+\+)/g).filter(Boolean);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={`rec-${idx}`} className="text-white not-italic drop-shadow-[0_0_8px_currentColor]">
          {renderRecommendation(part.slice(2, -2), depth + 1)}
        </strong>
      );
    }
    if (part.startsWith('!!') && part.endsWith('!!') && part.length >= 4) {
      return (
        <span key={`rec-${idx}`} className="text-rose-500 font-bold drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
          {renderRecommendation(part.slice(2, -2), depth + 1)}
        </span>
      );
    }
    if (part.startsWith('++') && part.endsWith('++') && part.length >= 4) {
      return (
        <span key={`rec-${idx}`} className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
          {renderRecommendation(part.slice(2, -2), depth + 1)}
        </span>
      );
    }

    const cleanPart = part.replace(/\*\*|!!|\+\+/g, '');
    return <React.Fragment key={`rec-${idx}`}>{cleanPart}</React.Fragment>;
  });
}

function getUrgencyConfig(score, status = '') {
    const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
    const s = status.toLowerCase();
    if (s.includes('urgente') || numericScore > 70) return {
        tier: 'CRÍTICO', Icon: Flame,
        border: 'border-red-500/45', glow: 'shadow-red-900/40',
        badge: 'bg-red-500/15 text-red-300 border-red-500/30',
        bar: 'from-red-600 to-rose-500', accent: 'text-red-400',
        stripe: 'from-red-600/15', pulse: 'bg-red-500', line: 'via-red-500'
    };
    if (s.includes('médio') || numericScore > 50) return {
        tier: 'ALTO', Icon: TrendingDown,
        border: 'border-orange-500/45', glow: 'shadow-orange-900/30',
        badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
        bar: 'from-orange-600 to-amber-500', accent: 'text-orange-400',
        stripe: 'from-orange-600/12', pulse: 'bg-orange-500', line: 'via-orange-500'
    };
    if (numericScore > 25) return {
        tier: 'MÉDIO', Icon: Clock,
        border: 'border-amber-500/40', glow: 'shadow-amber-900/20',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        bar: 'from-amber-500 to-yellow-400', accent: 'text-amber-400',
        stripe: 'from-amber-500/10', pulse: 'bg-amber-400', line: 'via-amber-400'
    };
    return {
        tier: 'ESTÁVEL', Icon: CheckCircle2,
        border: 'border-emerald-500/40', glow: 'shadow-emerald-900/20',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        bar: 'from-emerald-500 to-teal-400', accent: 'text-emerald-400',
        stripe: 'from-emerald-500/10', pulse: 'bg-emerald-400', line: 'via-emerald-400'
    };
}

function MetricChip({ label, value, index }) {
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -2, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
      className="group/chip relative flex flex-col gap-1.5 bg-white/[0.03] border border-white/[0.05] rounded-md p-3 sm:p-4 transition-all cursor-default overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-transparent to-transparent opacity-0 group-hover/chip:opacity-10 transition-opacity" />
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 leading-[1.35] truncate min-w-0 block group-hover/chip:text-slate-400 transition-colors pb-px">
        {label}
      </span>
      <span className="text-sm font-black text-slate-100 tracking-tight leading-[1.25] truncate min-w-0 block pb-px">
        {value === null || value === undefined
          ? '—'
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value)}
      </span>
    </Motion.div>
  );
}

function UrgencyBar({ score, cfg }) {
    const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
    const pct = Math.min(100, Math.max(0, numericScore));
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 leading-[1.35]">Urgência</span>
                <span className={`text-[11px] font-black ${cfg.accent}`}>{Math.round(pct)}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/[0.06]">
                <Motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                    className={`h-full rounded-full bg-gradient-to-r ${cfg.bar}`}
                />
            </div>
        </div>
    );
}

function MonteCarloGauge({ mc, maxScore = 100 }) {
  if (!mc || mc.probability == null) return null;

  const safeMax = Number(maxScore) > 0 ? Number(maxScore) : 100;

  const toPct = (value, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(100, Math.max(0, (n / safeMax) * 100));
  };

  const rawProb = Number.isFinite(Number(mc.probability)) ? Number(mc.probability) : 0;
  const prob = Math.min(100, Math.max(0, rawProb));

  const low = mc.ci95Low != null ? toPct(mc.ci95Low, prob - 5) : Math.max(0, prob - 5);
  const high = mc.ci95High != null ? toPct(mc.ci95High, prob + 5) : Math.min(100, prob + 5);

  const volatility = Number.isFinite(Number(mc.volatility)) ? Number(mc.volatility) : 0;

  const isCritical = prob < (mc.thresholds?.danger ?? 30);
  const color = isCritical
    ? 'bg-red-400'
    : prob >= (mc.thresholds?.safe ?? 90)
      ? 'bg-emerald-400'
      : 'bg-indigo-400';

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-4 bg-black/40 border border-white/10 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-3 text-white/5">
        <BrainCircuit size={48} />
      </div>

      <div className="relative z-10 flex justify-between items-end mb-2">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-0.5">
            Projeção MC (Matéria)
          </span>
          <span className="text-2xl font-black text-white tracking-tighter">{Math.round(prob)}%</span>
        </div>

        <div className="text-right">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">
            Volatilidade
          </span>
          <span className="text-xs font-mono font-bold text-amber-400">±{Math.round(volatility)} pts</span>
        </div>
      </div>

      <div className="relative h-2.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05] my-3">
        <Motion.div
          initial={{ width: 0 }}
          animate={{ left: `${low}%`, width: `${Math.max(0, high - low)}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-0 bottom-0 bg-white/10 rounded-full"
        />
        <Motion.div
          initial={{ left: 0 }}
          animate={{ left: `${Math.min(97, Math.max(1, prob))}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`absolute top-0 bottom-0 w-1.5 rounded-full ${color} shadow-[0_0_12px_rgba(0,0,0,0.8)]`}
        />
      </div>

      <div className="flex justify-between mt-3 px-0.5">
        <div className="flex flex-col">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-0.5">
            Pior Cenário
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400">{Math.round(low)}%</span>
        </div>

        <div className="flex flex-col text-right">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-0.5">
            Teto Probabilístico
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400">{Math.round(high)}%</span>
        </div>
      </div>
    </Motion.div>
  );
}

export default function AICoachWidget({ suggestion, onGenerateGoals, loading }) {
    const [showMatrix, setShowMatrix] = useState(false);
    const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);

    if (!suggestion) return null;

    const topic = suggestion.weakestTopic;
    const urgency = suggestion?.urgency?.details ?? { hasData: false };
    const monteCarloData = suggestion?.urgency?.monteCarlo || suggestion?.urgency?.details?.monteCarlo || urgency?.monteCarlo;
    const safeMaxScore = Number(activeContest?.maxScore) > 0 ? Number(activeContest.maxScore) : 100;
    const urgencyScoreRaw = suggestion?.urgency?.normalizedScore ?? suggestion?.urgency?.score ?? 0;
    const urgencyScore = Number.isFinite(Number(urgencyScoreRaw)) ? Number(urgencyScoreRaw) : 0;
    const statusLabel = String(urgency?.humanReadable?.Status || '');

    const calibrationOps = activeContest?.calibrationOps || {};

    const categoryKey = getCalibrationKey(
      suggestion?.categoryId || suggestion?.id || suggestion?.name
    );

    const isDegraded = Boolean(calibrationOps[categoryKey]?.degraded);

    const cfg = getUrgencyConfig(urgencyScore, statusLabel);
    const { tier, Icon: TierIcon } = cfg;
    const sortedHumanReadable = Object.entries(urgency.humanReadable || {}).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));

    return (
        <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative mb-8 w-full border ${cfg.border} bg-[#08090f]/80 backdrop-blur-2xl shadow-2xl ${cfg.glow} overflow-hidden group/widget`}
        >
            <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl ${cfg.stripe} to-transparent pointer-events-none rounded-full blur-[120px] opacity-50`} />

            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${cfg.line} to-transparent opacity-80`} />

            <div className="relative z-10 p-5 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.04]">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full ${cfg.pulse} animate-pulse shrink-0 shadow-[0_0_8px_currentColor]`} />
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm font-bold text-slate-200 truncate">Motor de Produtividade</span>
                            {suggestion.globalProjectedMean != null && Number.isFinite(Number(suggestion.globalProjectedMean)) && (
                                <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md tracking-wider">
                                  GLOBAL {Number(suggestion.globalProjectedMean)}%
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {Number.isFinite(Number(urgency?.crunchMultiplier)) && Number(urgency.crunchMultiplier) > 1 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                <AlertTriangle size={12} className="shrink-0" />
                                <span className="whitespace-nowrap">CRÍTICO ×{Number(urgency.crunchMultiplier).toFixed(1).replace(/\.0$/, '')}</span>
                            </div>
                        )}
                        {isDegraded && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                <Database size={12} className="shrink-0" />
                                <span className="whitespace-nowrap">CALIBRAÇÃO DEGRADADA</span>
                            </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${cfg.badge} shrink-0`}>
                            <TierIcon size={12} className="shrink-0" />
                            <span className="whitespace-nowrap">{tier === 'Standard' ? 'Padrão' : tier}</span>
                        </div>
                        {onGenerateGoals && (
                            <button
                                onClick={onGenerateGoals}
                                disabled={loading}
                                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                                {loading ? 'Calculando...' : 'Recalcular'}
                            </button>
                        )}
                    </div>
                </div>

                {!urgency.hasData ? (
                    <div className="flex flex-col md:flex-row items-center gap-8 py-12 px-8 bg-white/[0.02] border border-white/5 shadow-inner">
                        <div className="w-20 h-20 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow-2xl">
                            <Database size={32} className="text-slate-600" />
                        </div>
                        <div className="text-center md:text-left">
                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Sincronização Necessária</h3>
                            <p className="text-slate-500 leading-relaxed max-w-md font-medium">
                                Realize novos simulados para alimentar o algoritmo de recomendação e desbloquear as metas de alta performance.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_320px] gap-8 xl:gap-12 items-center">
                            <div className="flex flex-col gap-5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${cfg.bar}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Alvo Prioritário</span>
                                    {statusLabel && (
                                        <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                                            {statusLabel.replace(/[🔥⚡✓]/gu, '').trim()}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
                                        {displaySubject(suggestion.name, activeContest?.categories || [])}
                                    </h2>
                                    {topic && (
                                        <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-bold tracking-tight ${cfg.badge} hover:bg-white/[0.05] transition-colors cursor-default`}>
                                            <Target size={16} />
                                            <span className="truncate max-w-[200px] sm:max-w-[300px]" title={typeof topic === 'string' ? topic : topic?.name}>
                                                {typeof topic === 'string' ? topic : (topic?.name || 'Tópico Geral')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col justify-center h-full">
                                {suggestion.urgency?.recommendation && (
                                    <Motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="relative p-5 sm:p-6 bg-black/40 backdrop-blur-xl border border-white/[0.05] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] group/status hover:border-white/10 transition-all duration-500 overflow-hidden"
                                    >
                                        <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${cfg.stripe} to-transparent opacity-20 blur-2xl pointer-events-none rounded-full`} />

                                        <div className="flex items-start gap-4 relative z-10">
                                            <div className={`p-3 rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent border ${cfg.border} shadow-inner shrink-0 group-hover/status:scale-110 transition-transform duration-500`}>
                                                <Sparkles size={20} className={`${cfg.accent} drop-shadow-[0_0_8px_currentColor]`} />
                                            </div>
                                            <div className="flex flex-col gap-1.5 flex-1 pt-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.pulse} animate-pulse`} />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Motivo da Recomendação</span>
                                                </div>
                                                <p className="text-sm sm:text-[15px] text-slate-100 leading-relaxed font-medium mt-1">
                                                    {renderRecommendation(suggestion.urgency.recommendation)}
                                                </p>
                                            </div>
                                        </div>
                                    </Motion.div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <UrgencyBar score={urgencyScore} cfg={cfg} />
                                {monteCarloData && (
                                    <MonteCarloGauge mc={monteCarloData} maxScore={safeMaxScore} />
                                )}

                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={() => setShowMatrix(!showMatrix)}
                                className="flex items-center justify-between w-full sm:w-auto gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all py-3 px-4 sm:px-6 rounded-md bg-white/[0.03] border border-white/[0.05] hover:border-white/20"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <BrainCircuit size={14} className={`shrink-0 ${showMatrix ? cfg.accent : 'text-slate-600'} transition-colors`} />
                                    <span className="truncate">Matriz de Telemetria</span>
                                </div>
                                <Motion.div animate={{ rotate: showMatrix ? 180 : 0 }} transition={{ duration: 0.3 }} className="shrink-0">
                                    <ChevronDown size={14} />
                                </Motion.div>
                            </button>

                            <AnimatePresence>
                                {showMatrix && (
                                    <Motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex flex-wrap gap-2 sm:gap-3 pt-6">
                                            {sortedHumanReadable.map(([k, v], i) => (
                                                <div key={`metric-${k}-${i}`} className="flex-1 min-w-[130px] sm:min-w-[150px] max-w-full">
                                                    <MetricChip label={k} value={v} index={i} />
                                                </div>
                                            ))}
                                        </div>
                                        {monteCarloData?.explainability?.note && (
                                            <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
                                                <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80 font-black mb-1">
                                                    Explicabilidade Monte Carlo
                                                </p>
                                                <p className="text-[10px] text-cyan-100/70 mb-2">
                                                    Qualidade da calibração: <span className="font-black uppercase">{monteCarloData.explainability.calibrationQuality || 'n/a'}</span>
                                                    {monteCarloData.explainability.confidenceAdjusted
                                                        ? ` • ajuste ${Number.isFinite(Number(monteCarloData.explainability.confidenceAdjustmentPct)) ? Number(monteCarloData.explainability.confidenceAdjustmentPct) : 0}%`
                                                        : ''}
                                                </p>
                                                <p className="text-xs text-slate-300 leading-relaxed">
                                                    {monteCarloData.explainability.note}
                                                </p>
                                            </div>
                                        )}

                                        {monteCarloData?.diagnostics && (
                                            <div className="mt-3 text-[9px] text-slate-400 bg-white/[0.015] rounded p-2 border border-white/5">
                                                <div>Simulações: <span className="font-mono text-slate-200">{monteCarloData.diagnostics.simulationCount}</span></div>
                                                {monteCarloData.diagnostics.convergence && <div>Convergência: {monteCarloData.diagnostics.convergence.sufficient ? '✓ Boa' : '⚠ Parcial'} (SE {Number(monteCarloData.diagnostics.convergence?.achievedSE ?? 0).toFixed(4)})</div>}
                                                {monteCarloData.diagnostics.effectiveN && <div>Effective N: <span className="font-mono">{Number(monteCarloData.diagnostics.effectiveN).toFixed(1)}</span></div>}
                                            </div>
                                        )}
                                    </Motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </Motion.div>
    );
}
</file>

<file path="src/components/coach/CoachMenuNav.jsx">
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, BarChart3 } from 'lucide-react';

const TAB_IDS = {
    insights: 'coach-tab-insights',
    analytics: 'coach-tab-analytics'
};

const MenuTab = React.memo(function MenuTab({ active, onClick, onKeyDown, icon: Icon, label, subtitle, tabId, panelId, disabled = false, tabRef, tabKey }) {
    const handleClick = useCallback(() => {
        onClick(tabKey);
    }, [onClick, tabKey]);
    return (
        <button
            ref={tabRef}
            type="button"
            onClick={handleClick}
            onKeyDown={onKeyDown}
            disabled={disabled}
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            aria-disabled={disabled}
            id={tabId}
            // FIX: expressão redundante simplificada (roving tabindex correto)
            tabIndex={active ? 0 : -1}
            className={`group relative min-w-0 rounded-2xl p-4 transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c14] ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${active
                ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30'
                : 'bg-slate-900/40 border-white/5 hover:bg-slate-800/60 hover:border-white/10'
                } border`}
        >
            {active && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 blur-md -z-10" />
            )}
            <div className="flex items-center gap-4">
                <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border transition-colors duration-300 ${active
                    ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
                    : 'bg-slate-800/50 border-white/5 text-slate-500 group-hover:text-slate-400'
                    }`}>
                    <Icon size={20} className={active ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : ''} />
                </div>
                <div className="flex flex-col items-start min-w-0 text-left">
                    <span className={`text-sm font-black tracking-tight truncate w-full transition-colors duration-300 ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'
                        }`}>
                        {label}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest truncate w-full transition-colors duration-300 ${active ? 'text-indigo-400/80' : 'text-slate-500'
                        }`}>
                        {subtitle}
                    </span>
                </div>
            </div>
            {active && (
                <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-12 h-[2px] bg-indigo-500 rounded-t-full shadow-[0_-2px_8px_rgba(99,102,241,0.5)]" />
            )}
        </button>
    );
});

export default function CoachMenuNav({ activeTab, onChangeTab, isPremium }) {
    const isPremiumBool = Boolean(isPremium);
    const insightsRef = useRef(null);
    const analyticsRef = useRef(null);

    const tabs = useMemo(() => [
        {
            key: 'insights',
            label: 'Plano de Estudo',
            subtitle: 'Sugestões & Metas',
            icon: Sparkles,
            tabRef: insightsRef
        },
        {
            key: 'analytics',
            label: 'Raio-X Técnico',
            subtitle: 'Calibração & Desvios',
            icon: BarChart3,
            tabRef: analyticsRef
        }
    ], []);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const currentIndex = tabs.findIndex(t => t.key === activeTab);
            let nextIndex = currentIndex;
            do {
                nextIndex = e.key === 'ArrowRight' ? nextIndex + 1 : nextIndex - 1;
                if (nextIndex >= tabs.length) nextIndex = 0;
                if (nextIndex < 0) nextIndex = tabs.length - 1;
            } while (nextIndex !== currentIndex && tabs[nextIndex].key === 'analytics' && !isPremiumBool);
            
            const nextTab = tabs[nextIndex];
            if (nextTab && nextTab.key !== activeTab) {
                onChangeTab(nextTab.key);
            }
            // FIX: acesso a ref no render não ocorre, o foco acontece de forma assíncrona/após montagem
        }
    }, [activeTab, onChangeTab, tabs, isPremiumBool]);

    // FIX: Restaura foco apenas quando usuário interage via teclado (evita roubar foco on mount)
    useEffect(() => {
        const activeItem = tabs.find(t => t.key === activeTab);
        if (activeItem?.tabRef?.current && document.activeElement?.getAttribute?.('role') === 'tab') {
            activeItem.tabRef.current.focus();
        }
    }, [activeTab, tabs]);

    return (
        <div
            role="tablist"
            aria-label="Navegação do Coach"
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8"
        >
            {tabs.map((tab) => (
                <div key={tab.key} className="flex-1">
                    <MenuTab
                        active={activeTab === tab.key}
                        onClick={onChangeTab}
                        onKeyDown={handleKeyDown}
                        icon={tab.icon}
                        label={tab.label}
                        subtitle={tab.subtitle}
                        tabId={TAB_IDS[tab.key]}
                        panelId={`coach-panel-${tab.key}`}
                        disabled={tab.key === 'analytics' && !isPremiumBool}
                        tabRef={tab.tabRef}
                        tabKey={tab.key}
                    />
                </div>
            ))}
        </div>
    );
}
</file>

<file path="src/components/AICoachPlanner.jsx">
import React, { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Play, BrainCircuit, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';

// FIX-CODE-10: Removidos espaços extras nas classes Tailwind
const DAYS = [
  { id: 'mon', label: 'SEG', full: 'Segunda', gradient: 'from-violet-600 to-indigo-600', bg: 'bg-violet-500/10', border: 'border-violet-500/25', text: 'text-violet-300', dot: 'bg-violet-500', over: 'bg-violet-500/10 border-violet-500/40', cardBg: 'bg-violet-500/[0.08]', cardBorder: 'border-violet-500/20', cardHover: 'hover:border-violet-500/40 hover:bg-violet-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(139,92,246,0.3)]' },
  { id: 'tue', label: 'TER', full: 'Terça', gradient: 'from-sky-500 to-cyan-500', bg: 'bg-sky-500/10', border: 'border-sky-500/25', text: 'text-sky-300', dot: 'bg-sky-500', over: 'bg-sky-500/10 border-sky-500/40', cardBg: 'bg-sky-500/[0.08]', cardBorder: 'border-sky-500/20', cardHover: 'hover:border-sky-500/40 hover:bg-sky-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(14,165,233,0.3)]' },
  { id: 'wed', label: 'QUA', full: 'Quarta', gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-500/10', border: 'border-pink-500/25', text: 'text-pink-300', dot: 'bg-pink-500', over: 'bg-pink-500/10 border-pink-500/40', cardBg: 'bg-pink-500/[0.08]', cardBorder: 'border-pink-500/20', cardHover: 'hover:border-pink-500/40 hover:bg-pink-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(236,72,153,0.3)]' },
  { id: 'thu', label: 'QUI', full: 'Quinta', gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-300', dot: 'bg-orange-500', over: 'bg-orange-500/10 border-orange-500/40', cardBg: 'bg-orange-500/[0.08]', cardBorder: 'border-orange-500/20', cardHover: 'hover:border-orange-500/40 hover:bg-orange-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.3)]' },
  { id: 'fri', label: 'SEX', full: 'Sexta', gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-300', dot: 'bg-emerald-500', over: 'bg-emerald-500/10 border-emerald-500/40', cardBg: 'bg-emerald-500/[0.08]', cardBorder: 'border-emerald-500/20', cardHover: 'hover:border-emerald-500/40 hover:bg-emerald-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]' },
  { id: 'sat', label: 'SAB', full: 'Sábado', gradient: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', text: 'text-cyan-300', dot: 'bg-cyan-500', over: 'bg-cyan-500/10 border-cyan-500/40', cardBg: 'bg-cyan-500/[0.08]', cardBorder: 'border-cyan-500/20', cardHover: 'hover:border-cyan-500/40 hover:bg-cyan-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(6,182,212,0.3)]' },
  { id: 'sun', label: 'DOM', full: 'Domingo', gradient: 'from-rose-500 to-red-500', bg: 'bg-rose-500/10', border: 'border-rose-500/25', text: 'text-rose-300', dot: 'bg-rose-500', over: 'bg-rose-500/10 border-rose-500/40', cardBg: 'bg-rose-500/[0.08]', cardBorder: 'border-rose-500/20', cardHover: 'hover:border-rose-500/40 hover:bg-rose-500/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(244,63,94,0.3)]' },
];

// FIX-CODE-09: Comparador custom para React.memo
const TaskCard = React.memo(({ task, index, isBacklog, stableId, dayTheme, categories = [], onStartPomodoro }) => {
  const sanitizeHtml = (str) => typeof str === 'string' ? str.replace(/<[^>]*>?/gm, '').trim() : '';
  const rawText = task.text || task.title || '';
  const fullText = sanitizeHtml(rawText) || rawText;
  const parts = fullText.split(':');
  const hasDetails = parts.length > 1;

  let subject = String(task.subjectName || task.category || task.catName || (hasDetails ? parts[0] : fullText));
  let actionPart = hasDetails ? parts.slice(1).join(':').trim() : fullText;

  subject = subject.replace(/Foco em /i, '').trim();

  const isSystemAlert = /\[ALERTA MESTRE\]|\[STATUS\]/i.test(actionPart);
  const isSrsCard = Boolean(task?.analysis?.reason?.includes('SRS') || task?.text?.includes('SRS'));
  const isSafeCard = Boolean(task?.analysis?.reason?.includes('Cruzeiro') || task?.analysis?.reason?.includes('Manutenção'));
  const isChaosCard = Boolean(task?.analysis?.reason?.includes('Oscilação') || task?.analysis?.reason?.includes('Caos'));
  const isPriority = /\[PROTOCOLO PRIORITÁRIO\]/i.test(actionPart) || isSystemAlert || (task?.priority === 'high' && !isSrsCard && !isSafeCard && !isChaosCard);

  actionPart = actionPart
    .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '')
    .replace(/\[ALERTA MESTRE\]\s*/i, '')
    .replace(/\[STATUS\]\s*/i, '')
    .trim();

  let topicLabel = '';
  const bracketMatch = actionPart.match(/^\[(.*?)\]\s*(.*)$/i);
  if (bracketMatch) {
    topicLabel = bracketMatch[1].trim();
    actionPart = bracketMatch[2].trim();
  }

  let displayTopic = task.topicName || topicLabel || actionPart || subject || 'Revisão Recomendada';
  if (displayTopic.toLowerCase() === subject.toLowerCase() && !task.topicName && !task.analysis?.label && !task.analysis?.reason) {
    displayTopic = 'Revisão Geral';
  }
  let secondaryText = actionPart && actionPart !== displayTopic ? actionPart : '';

  if (/Revisão Geral Complementar|Revisão Complementar|CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|\(Novo\)\.|\(Prioridade\)\.|% de acerto\)\./i.test(secondaryText)) {
    secondaryText = '';
  }

  const cardBg = !isBacklog && dayTheme ? dayTheme.cardBg : 'bg-white/[0.02]';
  const cardBorder = !isBacklog && dayTheme ? dayTheme.cardBorder : 'border-white/[0.05]';
  const accentColor = !isBacklog && dayTheme ? dayTheme.text : 'text-violet-300';
  const accentBorder = !isBacklog && dayTheme ? dayTheme.border : 'border-violet-500/30';
  const gradientLine = !isBacklog && dayTheme ? dayTheme.gradient : 'from-violet-600 to-indigo-600';

  return (
    <Draggable draggableId={stableId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`pb-3 ${snapshot.isDragging ? 'relative z-[99999]' : ''}`}
          style={provided.draggableProps.style}
        >
          <div className={`group relative p-3 sm:p-3.5 rounded-xl select-none overflow-hidden h-full border ${
            snapshot.isDragging
              ? `bg-slate-900 border-2 ${accentBorder} shadow-lg scale-[1.02]`
              : `${cardBg} ${cardBorder} hover:border-white/10 transition-all duration-200`
          }`}>
            {!isBacklog && dayTheme && (
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${gradientLine} opacity-60`} />
            )}
            <div className="flex flex-col h-full relative z-10">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className={`max-w-full inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                  isBacklog
                    ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                    : `bg-black/30 ${accentColor} border-white/10`
                }`}>
                  <div className={`w-1 h-1 rounded-full ${isBacklog ? (isPriority ? 'bg-amber-400' : 'bg-violet-400') : 'bg-current'} shrink-0`} />
                  <span className="leading-[1.32] truncate">{displaySubject(subject, categories)}</span>
                </div>
                {/* FIX-A11Y-02: aria-label no botão */}
                <button
                  onClick={(e) => { e.stopPropagation(); onStartPomodoro?.(task, isBacklog ? 'backlog' : dayTheme?.id); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  aria-label={`Iniciar estudo: ${displaySubject(subject, categories)}`}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                    !isBacklog && dayTheme
                      ? `${dayTheme.text} hover:bg-white/10`
                      : 'bg-violet-500/10 text-violet-400 hover:bg-violet-500 hover:text-white'
                  }`}
                >
                  <Play size={11} className="fill-current" />
                </button>
              </div>
              <div className="flex flex-col flex-1 justify-center gap-0.5">
                <h4 className="text-[12px] sm:text-[13px] font-semibold leading-[1.35] tracking-tight text-slate-100 group-hover:text-white">
                  {displayTopic}
                </h4>
                {secondaryText && (
                  <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">{secondaryText}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}, (prev, next) => {
  return prev.stableId === next.stableId &&
    prev.index === next.index &&
    prev.isBacklog === next.isBacklog &&
    prev.task?.text === next.task?.text &&
    prev.task?.title === next.task?.title &&
    prev.task?.completed === next.task?.completed &&
    prev.dayTheme?.id === next.dayTheme?.id &&
    prev.onStartPomodoro === next.onStartPomodoro &&
    prev.categories === next.categories;
});

// FIX-CODE-07: Aceitar props em vez de ignorá-las
export default function AICoachPlanner({ plannerData: propPlannerData, categories: propCategories, onStartPomodoro: propOnStart }) {
  const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
  const categories = propCategories || activeContest?.categories || [];
  const defaultCoachPlan = useMemo(() => [], []);
  const defaultCoachPlanner = useMemo(() => ({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }), []);

  // FIX-CODE-07: Usar props se disponíveis, senão fallback para store
  const rawCoachPlanner = propPlannerData || activeContest?.coachPlanner || defaultCoachPlanner;
  const rawCoachPlan = activeContest?.coachPlan || defaultCoachPlan;

  const coachPlanner = useMemo(() => {
    const normalized = {};
    for (const [key, val] of Object.entries(rawCoachPlanner)) {
      normalized[key] = Array.isArray(val) ? val : Object.values(val || {});
    }
    return normalized;
  }, [rawCoachPlanner]);

  const coachPlan = useMemo(
    () => Array.isArray(rawCoachPlan) ? rawCoachPlan : Object.values(rawCoachPlan || {}),
    [rawCoachPlan]
  );

  const setData = useAppStore(state => state.setData);
  const startNeuralSession = useAppStore(state => state.startNeuralSession);
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);

  const getInitialColumns = React.useCallback(() => {
    const allAssignedIds = new Set();
    DAYS.forEach(d => (coachPlanner[d.id] || []).forEach(t => {
      const sid = getSafeId(t);
      if (sid) allAssignedIds.add(sid);
    }));

    const activeBacklog = (coachPlan || []).filter(t => {
      if (!t) return false;
      const rawStr = t.text || t.title || '';
      if (/\[ALERTA MESTRE\]|\[STATUS\]/i.test(rawStr)) return false;
      const sid = getSafeId(t);
      return !allAssignedIds.has(sid);
    });

    return {
      backlog: activeBacklog,
      mon: coachPlanner.mon || [], tue: coachPlanner.tue || [],
      wed: coachPlanner.wed || [], thu: coachPlanner.thu || [],
      fri: coachPlanner.fri || [], sat: coachPlanner.sat || [],
      sun: coachPlanner.sun || []
    };
  }, [coachPlan, coachPlanner]);

  const [columns, setColumns] = useState(() => getInitialColumns());

  const columnsRef = React.useRef(columns);
  React.useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // FIX-BUG-06: Depender de coachPlan (referência) em vez de coachPlan?.length
  useEffect(() => {
    if (!isDragging) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColumns(getInitialColumns());
    }
  }, [coachPlan, coachPlanner, getInitialColumns, isDragging]);

  const onDragEnd = (result) => {
    if (!result.destination) { setIsDragging(false); return; }
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      setIsDragging(false);
      return;
    }

    const startCol = columns[source.droppableId] || [];
    const finishCol = columns[destination.droppableId] || [];
    const startList = Array.from(startCol);
    const [removed] = startList.splice(source.index, 1);
    const finishList = (source.droppableId === destination.droppableId)
      ? startList : Array.from(finishCol);
    finishList.splice(destination.index, 0, removed);

    const newCols = { ...columns, [source.droppableId]: startList, [destination.droppableId]: finishList };
    setColumns(newCols);

    const systemAlerts = (coachPlan || []).filter(t => {
      if (!t) return false;
      const rawString = t.text || t.title || '';
      return /\[ALERTA MESTRE\]|\[STATUS\]/i.test(rawString);
    });

    const newCoachPlan = [
      ...systemAlerts,
      ...(newCols.backlog || []),
      ...(newCols.mon || []), ...(newCols.tue || []), ...(newCols.wed || []),
      ...(newCols.thu || []), ...(newCols.fri || []), ...(newCols.sat || []),
      ...(newCols.sun || [])
    ];

    setData(prev => {
      if (!prev) return;
      const freshPlanner = { ...(prev.coachPlanner || {}) };
      Object.keys(freshPlanner).forEach(day => {
        freshPlanner[day] = [...(freshPlanner[day] || [])];
      });
      if (source.droppableId !== 'backlog') freshPlanner[source.droppableId] = startList;
      if (destination.droppableId !== 'backlog') freshPlanner[destination.droppableId] = finishList;
      prev.coachPlanner = freshPlanner;
      prev.coachPlan = newCoachPlan;
    });

    setIsDragging(false);
  };

  // FIX-CODE-07: Usar propOnStart se disponível
  const handleStartTask = React.useCallback((task, dayId) => {
    if (propOnStart) {
      propOnStart(task);
      return;
    }

    if (!task) return;

    const cols = columnsRef.current;

    let sessionTasks = dayId === 'backlog'
      ? (cols.backlog || [])
      : (cols[dayId] || []);

    let startIndex = sessionTasks.findIndex(t => {
      const idT = getSafeId(t);
      const idTask = getSafeId(task);
      if (idT && idTask) return idT === idTask;
      return t === task || (t.title && t.title === task.title);
    });

    if (startIndex === -1) {
      startNeuralSession([{ ...task, sourceContext: dayId || 'isolated' }], 0);
      navigate('/pomodoro');
      return;
    }

    const sessionWithContext = sessionTasks.map(t => ({ ...t, sourceContext: dayId }));
    startNeuralSession(sessionWithContext, startIndex);
    navigate('/pomodoro');
  }, [startNeuralSession, navigate, propOnStart]);

  return (
    <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={onDragEnd}>
      <div className="flex flex-col xl:flex-row gap-5">
        <div className="w-full xl:w-64 shrink-0">
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col h-full min-h-[400px] xl:min-h-[610px] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.08]">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <BrainCircuit size={15} className="text-violet-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-200">Sugestões</h3>
                <p className="text-[8px] font-medium text-slate-500 tracking-widest">IA Coach</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                {columns.backlog.length}
              </span>
            </div>

            <Droppable droppableId="backlog">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 flex flex-col gap-2 p-2 min-h-[200px] overflow-y-auto no-scrollbar border border-dashed border-white/10 rounded-xl bg-black/10 ${snapshot.isDraggingOver ? 'border-violet-500/50 bg-violet-500/5' : ''}`}
                >
                  {(columns.backlog || []).filter(Boolean).map((task, idx) => {
                    const safeId = getSafeId(task) || `fallback-backlog-${idx}`;
                    return <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog categories={categories} onStartPomodoro={handleStartTask} />;
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>

        <div className="w-full flex-1 min-w-0">
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 overflow-hidden flex flex-col h-full relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
            <div className="flex items-center justify-between mb-6 shrink-0 px-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5 group-hover:scale-110 transition-transform">
                  <Calendar size={16} className="text-indigo-400 shrink-0" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-200">Planejamento Semanal</h3>
                  <p className="text-[8px] font-bold text-slate-500 tracking-widest uppercase">Agenda do Aluno</p>
                </div>
              </div>
            </div>

            <div className="pb-4 overflow-x-auto overflow-y-hidden no-scrollbar [touch-action:pan-x]">
              <div className="flex gap-3 min-w-[1500px] min-h-[520px] pr-2">
                {DAYS.map((day) => (
                  <div key={day.id} className="flex-1 flex flex-col min-w-[195px]">
                    <div className={`mb-4 rounded-2xl border ${day.border} ${day.bg} p-3.5 relative overflow-hidden`}>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className={`text-sm font-black tracking-[0.15em] ${day.text} uppercase`}>
                            {day.label}
                          </span>
                          <span className="text-[8px] font-medium text-slate-500 tracking-widest uppercase">Semana</span>
                        </div>
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-md ${day.text} bg-black/20 border ${day.border}`}>
                          {columns[day.id]?.length || 0}
                        </div>
                      </div>
                    </div>

                    <Droppable droppableId={day.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 p-2 pt-3 rounded-lg border border-dashed transition-colors flex flex-col min-h-[80px] gap-1 ${
                            snapshot.isDraggingOver
                              ? 'border-violet-500/60 bg-violet-500/5'
                              : 'bg-black/10 border-white/[0.06] hover:border-white/10'
                          }`}
                        >
                          {(columns[day.id] || []).filter(Boolean).map((task, idx) => {
                            const safeId = getSafeId(task) || `fallback-${day.id}-${idx}`;
                            return <TaskCard key={safeId} stableId={safeId} task={task} index={idx} isBacklog={false} dayTheme={day} categories={categories} onStartPomodoro={handleStartTask} />;
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}
</file>

<file path="src/components/AICoachView.jsx">
import React, { useMemo, useState } from 'react';
import {
  Play, Sparkles, Zap, BrainCircuit, ChevronDown, Download,
  Loader2, Compass, Trash2, LayoutGrid, List, Target,
  AlertCircle, Trophy, Activity
} from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import AICoachWidget from './AICoachWidget';
import AICoachPlanner from './AICoachPlanner';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { exportComponentAsPDF } from '../utils/pdfExport';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';
import { useToast } from '../hooks/useToast';

// FIX-BUG-02: Regex com escape correto para **bold**
function renderBoldText(text) {
  const safeText = String(text || '');
  const parts = safeText.split(/(\*\*.*?\*\*)/g).filter(Boolean);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={`bold-${idx}`} className="text-white font-black">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`bold-${idx}`}>{part.replace(/\*\*/g, '')}</React.Fragment>;
  });
}

// FIX-BUG-07: CARD_COLORS movido para module-level (não recriado a cada render)
const CARD_COLORS = [
  { accent: 'border-l-violet-500', dot: 'bg-violet-500', badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20', glow: 'from-violet-900/20', btnHover: 'hover:bg-violet-600 hover:text-white hover:border-violet-500 hover:shadow-[0_0_20px_-3px_rgba(139,92,246,0.4)]' },
  { accent: 'border-l-cyan-500', dot: 'bg-cyan-500', badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20', glow: 'from-cyan-900/20', btnHover: 'hover:bg-cyan-600 hover:text-white hover:border-cyan-500 hover:shadow-[0_0_20px_-3px_rgba(6,182,212,0.4)]' },
  { accent: 'border-l-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', glow: 'from-emerald-900/20', btnHover: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-500 hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)]' },
  { accent: 'border-l-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20', glow: 'from-rose-900/20', btnHover: 'hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-[0_0_20px_-3px_rgba(244,63,94,0.4)]' },
  { accent: 'border-l-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20', glow: 'from-amber-900/20', btnHover: 'hover:bg-amber-500 hover:text-amber-950 hover:border-amber-400 hover:shadow-[0_0_20px_-3px_rgba(245,158,11,0.4)]' },
];

function AICoachCard({ task, idx, categories, onStartPomodoro }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fullText = task?.text || task?.title || '';

  const separatorIndex = fullText.indexOf(':');
  const hasDetails = separatorIndex !== -1;

  const rawSubject = String(
    task?.subjectName || task?.category || task?.catName ||
    (hasDetails ? fullText.slice(0, separatorIndex) : fullText)
  );

  let subjectPart = rawSubject.replace(/Foco em /i, '').trim();
  let actionPart = hasDetails ? fullText.slice(separatorIndex + 1).trim() : fullText;

  const isSystemAlert = /\[ALERTA MESTRE\]/i.test(actionPart);
  const isSrsTask = Boolean(task?.analysis?.reason?.includes('SRS') || task?.text?.includes('SRS'));
  const isSafeTask = Boolean(task?.analysis?.reason?.includes('Cruzeiro') || task?.analysis?.reason?.includes('Manutenção'));
  const isChaosTask = Boolean(task?.analysis?.reason?.includes('Oscilação') || task?.analysis?.reason?.includes('Caos'));
  const isPriority = /\[PROTOCOLO PRIORITÁRIO\]/i.test(actionPart) || isSystemAlert || (task?.priority === 'high' && !isSrsTask && !isSafeTask && !isChaosTask);

  actionPart = actionPart
    .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '')
    .replace(/\[ALERTA MESTRE\]\s*/i, '')
    .replace(/^\[(.*?)\]/i, '$1')
    .replace(/Revisão Geral Complementar(\s*\(Volume\s*\d+\))?|Revisão Complementar|CRUZEIRO SEGURO|Revisão Necessária|ANOMALIA|TREINO RÁPIDO|\(Novo\)\.|\(Prioridade\)\.|% de acerto\)\./gi, '')
    .trim();

  const isIdenticalToSubject = actionPart.toLowerCase() === subjectPart.toLowerCase();
  if (isIdenticalToSubject && !task?.topicName && !task?.analysis?.label && !task?.analysis?.reason) {
    actionPart = 'Revisão Geral';
  }

  let topicPart = subjectPart;
  let systemAlertMessage = null;

  if (isSystemAlert) {
    systemAlertMessage = actionPart;
    actionPart = '';
    if (!topicPart) topicPart = rawSubject;
  }

  const displayAssunto = task?.topicName || actionPart || topicPart || 'Revisão Recomendada';
  const displayMeta = actionPart && actionPart !== displayAssunto ? actionPart : null;

  const col = CARD_COLORS[idx % CARD_COLORS.length];

  const safeProbRaw = String(task.analysis?.monteCarlo?.probability).replace(/[^\d.-]/g, '');
  const safeProb = Number(safeProbRaw) || 0;
  const safeVol = Number(task.analysis?.monteCarlo?.volatility) || 0;

  const isCompleted = Boolean(task?.completed || task?.status === 'completed');
  const isStudying = task?.status === 'studying';
  const isSrs = Boolean(task?.analysis?.reason?.includes('SRS') || task?.text?.includes('SRS'));
  const isSafe = Boolean(task?.analysis?.reason?.includes('Cruzeiro') || task?.analysis?.reason?.includes('Manutenção'));
  const isChaos = Boolean(task?.analysis?.reason?.includes('Oscilação') || task?.analysis?.reason?.includes('Caos'));

  return (
    <div
      className={`group relative flex flex-col p-5 sm:p-7 rounded-3xl bg-[#0a0c14] border transition-all duration-500 overflow-hidden shadow-2xl hover:border-white/10 ${
        isCompleted
          ? 'opacity-75 border-emerald-500/20 border-l-4 sm:border-l-8 border-l-emerald-500'
          : isPriority
          ? 'border-rose-500/30 border-l-4 sm:border-l-8 border-l-rose-500 shadow-[0_0_40px_-10px_rgba(225,29,72,0.15)]'
          : `border-white/[0.06] border-l-4 sm:border-l-8 ${col.accent}`
      }`}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] via-[#0a0c14]/0 to-transparent ${isPriority ? 'from-rose-900/30' : col.glow}`} />

      {isPriority && !isCompleted && (
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-rose-600/20 blur-[80px] rounded-full pointer-events-none animate-pulse" />
      )}

      <div className="relative z-10 grid grid-cols-[1fr_auto] items-start mb-5 gap-4">
        <div className="flex flex-col items-start gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] ${col.badge} shadow-lg backdrop-blur-md border max-w-full shrink-0`}>
              <div className={`w-2 h-2 rounded-full ${col.dot} shadow-[0_0_12px_rgba(255,255,255,0.4)] shrink-0`} />
              <span className="leading-[1.32] truncate min-w-0 block">{displaySubject(subjectPart, categories)}</span>
            </div>

            {isCompleted ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
                <span>✓ Concluído</span>
              </div>
            ) : isStudying ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse shrink-0">
                <span>⚡ Em Estudo</span>
              </div>
            ) : isPriority ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-rose-500/10 text-rose-300 shadow-[0_0_20px_-2px_rgba(225,29,72,0.5)] border border-rose-500/40 shrink-0 relative group/badge">
                <div className="absolute inset-0 bg-rose-400/20 blur-md animate-pulse" />
                <Target size={12} className="shrink-0 relative z-10 text-rose-400" />
                <span className="relative z-10 text-rose-200">Alvo Prioritário</span>
              </div>
            ) : isSrs ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
                <span>🔄 Revisão SRS</span>
              </div>
            ) : isSafe ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
                <span>🛡️ Manutenção</span>
              </div>
            ) : isChaos ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
                <span>🌪️ Oscilação</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-slate-800/60 text-slate-400 border border-white/5 shrink-0">
                <span>⏳ Pendente</span>
              </div>
            )}
          </div>
        </div>

        {/* FIX-A11Y-02: aria-label no botão de play */}
        <button
          onClick={(e) => { e.stopPropagation(); onStartPomodoro(task); }}
          aria-label={`Iniciar sessão de estudo: ${displaySubject(subjectPart, categories)}`}
          className={`shrink-0 flex items-center gap-2 rounded-xl border w-10 h-10 sm:w-auto sm:px-4 sm:h-10 transition-all duration-300 shadow-xl group/btn hover:scale-105 active:scale-95 justify-center ${
            isPriority
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-[0_0_25px_-5px_rgba(225,29,72,0.6)] animate-[pulse_3s_ease-in-out_infinite]'
              : `bg-white/[0.03] border-white/[0.08] text-slate-300 ${col.btnHover}`
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Iniciar</span>
          <Play size={13} fill="currentColor" className="transition-colors" />
        </button>
      </div>

      <div className="relative z-10 flex-1 mb-5">
        <h3 className="text-[17px] sm:text-xl font-black text-white leading-[1.2] mb-1.5 tracking-tighter line-clamp-4">
          {displayAssunto}
        </h3>

        {systemAlertMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 shadow-[inset_0_0_15px_rgba(225,29,72,0.05)]">
            <AlertCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />
            <span className="text-[11px] sm:text-[12px] text-rose-300/90 leading-relaxed font-medium">
              {systemAlertMessage}
            </span>
          </div>
        )}

        {displayMeta && (
          <div className="relative mt-2">
            <p className="text-[11px] sm:text-[12px] text-slate-400/80 leading-relaxed font-medium line-clamp-3 pr-2">
              {displayMeta}
            </p>
          </div>
        )}
      </div>

      {task.analysis?.monteCarlo && (
        <div className="relative z-10 grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 relative group/kpi hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between z-10 relative">
              <span className="text-[9px] font-black tracking-widest uppercase text-indigo-400/80">Probabilidade</span>
              <span className="font-mono text-xs font-bold text-indigo-300">{Math.round(safeProb)}%</span>
            </div>
            <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden z-10 relative">
              <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, Math.max(0, safeProb))}%` }} />
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 relative group/kpi transition-colors hover:bg-white/[0.04]">
            <div className="flex items-center justify-between z-10 relative">
              <span className={`text-[9px] font-black tracking-widest uppercase ${safeVol > 8 ? 'text-amber-400/80' : 'text-slate-400'}`}>Volatilidade</span>
              <span className={`font-mono text-xs font-bold ${safeVol > 8 ? 'text-amber-300' : 'text-slate-300'}`}>
                {safeVol > 0 && safeVol < 0.5 ? '<1' : `±${Math.round(safeVol)}`}
              </span>
            </div>
            <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden z-10 relative">
              <div className={`h-full rounded-full transition-all duration-1000 ${safeVol > 8 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-slate-500'}`} style={{ width: `${Math.min(100, Math.max(0, (safeVol / 20) * 100))}%` }} />
            </div>
          </div>
        </div>
      )}

      {task.analysis && (
        <div className="relative z-10 mt-auto pt-4 border-t border-white/[0.04]">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-all duration-300 outline-none focus:outline-none ${isExpanded ? 'bg-indigo-500/[0.04] border-indigo-500/10' : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <BrainCircuit size={12} className="text-indigo-400" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isExpanded ? 'text-indigo-300' : 'text-slate-400'}`}>
                Análise do Coach
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-400' : 'text-slate-500'}`} />
          </button>

          <AnimatePresence>
            {isExpanded && (
              <Motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 pb-2 space-y-3">
                  <div className="text-[11px] sm:text-xs text-indigo-200/80 leading-relaxed bg-indigo-500/[0.04] p-5 rounded-xl border border-indigo-500/10 font-medium whitespace-pre-wrap shadow-[inset_0_0_20px_rgba(99,102,241,0.03)] font-mono tracking-tight">
                    {renderBoldText(task.analysis.reason)}
                  </div>

                  {task.analysis.metrics && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(task.analysis.metrics).map(([key, value], idx) => (
                        <div key={`metric-${key}-${idx}`} className="bg-indigo-500/[0.03] border border-indigo-500/10 px-3 py-2 rounded-xl flex flex-col gap-0.5">
                          <span className="text-[8px] text-indigo-400/60 uppercase tracking-widest font-black">{key}</span>
                          <span className="text-[10px] font-mono text-indigo-200 font-bold">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {task.analysis.monteCarlo?.calibrationPenalty >= 0.005 && (
                    <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                      <Zap size={12} className="text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">
                          Ajuste de Calibração: -{Math.round(task.analysis.monteCarlo.calibrationPenalty * 100)}%
                        </span>
                        <span className="text-[10px] text-amber-500/70 font-medium leading-relaxed">
                          Você está errando sistematicamente a dificuldade nesta matéria. Reduzimos a projeção temporariamente.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default function AICoachView({ suggestedFocus, onGenerateGoals, loading, onClearHistory }) {
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState('planner');

  const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
  const categories = activeContest?.categories || [];

  const coachPlanner = useMemo(() => {
    const raw = activeContest?.coachPlanner || {};
    const normalized = {};
    for (const [key, val] of Object.entries(raw)) {
      normalized[key] = Array.isArray(val) ? val : Object.values(val || {});
    }
    return normalized;
  }, [activeContest?.coachPlanner]);

  const coachPlanRaw = useMemo(() => {
    const raw = activeContest?.coachPlan || [];
    return Array.isArray(raw) ? raw : Object.values(raw || {});
  }, [activeContest?.coachPlan]);

  const systemAlerts = useMemo(
    () => coachPlanRaw.filter(task => /\[ALERTA MESTRE\]|\[STATUS\]/i.test(task?.text || task?.title || '')),
    [coachPlanRaw]
  );

  const actionableTasks = useMemo(
    () => coachPlanRaw.filter(task => !/\[ALERTA MESTRE\]|\[STATUS\]/i.test(task?.text || task?.title || '')),
    [coachPlanRaw]
  );

  const coachPlan = actionableTasks;

  const unallocatedCards = useMemo(() => {
    if (!coachPlan || coachPlan.length === 0) return [];
    const allAssignedIds = new Set();
    Object.values(coachPlanner).forEach(dayTasks => {
      (dayTasks || []).forEach(t => {
        const sid = getSafeId(t);
        if (sid) allAssignedIds.add(sid);
      });
    });
    return coachPlan.filter(task => !allAssignedIds.has(getSafeId(task)));
  }, [coachPlan, coachPlanner]);

  const startNeuralSession = useAppStore(state => state.startNeuralSession);
  const navigate = useNavigate();
  const showToast = useToast();

  const handleStartNeural = (task) => {
    let targetIndex = unallocatedCards.findIndex(t => {
      const idT = getSafeId(t);
      const idTask = getSafeId(task);
      if (idT && idTask) return idT === idTask;
      return t === task || (t.title && t.title === task.title);
    });

    let sessionTasks = unallocatedCards;
    let sourceContext = 'backlog';

    if (targetIndex === -1) {
      const dayEntry = Object.entries(coachPlanner).find(([, tasks]) =>
        (tasks || []).some(t => {
          const idT = getSafeId(t);
          const idTask = getSafeId(task);
          if (idT && idTask) return idT === idTask;
          return t === task || (t.title && t.title === task.title);
        })
      );

      if (dayEntry) {
        sessionTasks = dayEntry[1];
        targetIndex = sessionTasks.findIndex(t => {
          const idT = getSafeId(t);
          const idTask = getSafeId(task);
          if (idT && idTask) return idT === idTask;
          return t === task || (t.title && t.title === task.title);
        });
        sourceContext = dayEntry[0];
      } else {
        sessionTasks = coachPlan;
        targetIndex = coachPlan.findIndex(t => {
          const idT = getSafeId(t);
          const idTask = getSafeId(task);
          if (idT && idTask) return idT === idTask;
          return t === task || (t.title && t.title === task.title);
        });
      }
    }

    if (targetIndex === -1) {
      startNeuralSession([{ ...task, sourceContext: sourceContext || 'isolated' }], 0);
      navigate('/pomodoro');
      return;
    }

    const sessionWithContext = sessionTasks.map(t => ({ ...t, sourceContext }));
    startNeuralSession(sessionWithContext, targetIndex);
    navigate('/pomodoro');
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportComponentAsPDF('ai-coach-container', 'Plano_Execucao_Coach.pdf', 'portrait');
    } catch (err) {
      console.error('PDF Export Error:', err);
      showToast('Erro ao exportar o plano para PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const hasPlan = coachPlan && coachPlan.length > 0;

  return (
    <div id="ai-coach-container" className="space-y-10 pb-12 w-full mx-auto" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="flex flex-col gap-6">
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-inner relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px] -mr-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[60px] -ml-32 -mb-32 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-sm">
                <Compass size={24} className="text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Painel Coach AI</h2>
                <p className="text-[10px] text-cyan-400/80 uppercase tracking-[0.25em] font-bold mt-1">
                  Estratégia inteligente com MC
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-0.5 bg-slate-950/80 border border-white/5 rounded-2xl p-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode('planner')}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${viewMode === 'planner' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                  <LayoutGrid size={14} className="shrink-0" />
                  Planner
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${viewMode === 'cards' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                  <Sparkles size={14} className="shrink-0" />
                  Pendências
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/5 transition disabled:opacity-50"
                >
                  {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Export
                </button>
                <button
                  onClick={onClearHistory}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-[9px] font-black text-rose-300 uppercase tracking-widest hover:bg-rose-500/10 transition"
                >
                  <Trash2 size={12} />
                  Limpar
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full mt-6 pt-6 border-t border-white/[0.05] flex justify-center">
            <button
              onClick={onGenerateGoals}
              disabled={loading}
              className="group relative w-full lg:w-auto px-4 sm:px-8 py-3.5 rounded-2xl font-black text-[11px] sm:text-[12px] tracking-[0.15em] uppercase transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 border border-white/20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none animate-pulse" />
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin shrink-0 drop-shadow-md" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <BrainCircuit size={16} className="shrink-0 drop-shadow-md" />
                  <span>Recalcular Estratégia</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'cards' && (
          <Motion.div
            key="cards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
                  <Sparkles className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Foco do Dia</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    Sugestões de estudo baseadas em telemetria
                  </p>
                </div>
              </div>
            </div>

            {hasPlan ? (
              unallocatedCards.length === 0 ? (
                <div className="mb-8 sm:mb-12 p-8 sm:p-12 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                  <Target size={32} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
                    Nenhum foco pendente fora do planner
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                  {unallocatedCards.map((task, idx) => (
                    <AICoachCard
                      key={getSafeId(task) || `coach-card-${idx}`}
                      task={task}
                      idx={idx}
                      categories={categories}
                      onStartPomodoro={handleStartNeural}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="mb-8 sm:mb-12 p-8 sm:p-12 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                <Target size={32} className="text-slate-600 mx-auto mb-4" />
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
                  Nenhum foco definido para hoje
                </p>
              </div>
            )}
          </Motion.div>
        )}

        {viewMode === 'planner' && (
          <Motion.div
            key="planner"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="space-y-6 mb-8">
              {suggestedFocus ? (
                <div className="w-full">
                  <AICoachWidget
                    key={suggestedFocus?.id || 'coach-widget'}
                    suggestion={suggestedFocus}
                    onGenerateGoals={onGenerateGoals}
                    loading={loading}
                  />
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
                  <AlertCircle size={20} className="mx-auto mb-3 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-400">Nenhum foco sugerido</p>
                  <p className="text-[10px] text-slate-500 mt-1">Recalcule a estratégia após novos simulados.</p>
                </div>
              )}
            </div>

            {systemAlerts.length > 0 && (
              <div className="mb-6 sm:mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemAlerts.map((alertTask, idx) => {
                  const rawText = alertTask.text || alertTask.title || '';
                  const cleanText = rawText
                    .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '')
                    .replace(/\[ALERTA MESTRE\]\s*/i, '')
                    .replace(/\[STATUS\]\s*/i, '');

                  const separatorIndex = cleanText.indexOf(':');
                  const rawSubjectAlert = alertTask.subjectName || alertTask.category || (separatorIndex !== -1 ? cleanText.slice(0, separatorIndex).trim() : 'Sistema');
                  const subjectName = displaySubject(rawSubjectAlert, categories);
                  const message = separatorIndex !== -1 ? cleanText.slice(separatorIndex + 1).trim() : cleanText;

                  let type = 'info';
                  let titlePart = message;
                  let descPart = '';
                  let actionDesc = '';

                  if (/VETOR CRÍTICO/i.test(cleanText)) {
                    type = 'danger';
                    titlePart = "Vetor Crítico";
                    descPart = message.replace(/🚨 VETOR CRÍTICO!?\s*/i, '');
                    actionDesc = "Conclua os focos pendentes desta matéria hoje para frear a queda imediata de rendimento.";
                  } else if (/OSCILAÇÃO/i.test(cleanText)) {
                    type = 'warning';
                    titlePart = "Oscilação Estatística";
                    descPart = message.replace(/🌪️ OSCILAÇÃO ESTATÍSTICA:?\s*/i, '');
                    actionDesc = "Revisite os tópicos sugeridos abaixo para estabilizar sua taxa de acertos.";
                  } else if (/CRUZEIRO SEGURO/i.test(cleanText)) {
                    type = 'success';
                    titlePart = "Cruzeiro Seguro";
                    descPart = message.replace(/🏆 CRUZEIRO SEGURO:?\s*/i, '');
                    actionDesc = "Mantenha a constância atual. Resolva apenas as manutenções leves sugeridas.";
                  }

                  const t = {
                    danger: { bg: 'bg-[#1a0b12]', border: 'border-rose-500/20', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', titleColor: 'text-rose-100', descColor: 'text-rose-200/70', badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-300', verdictBg: 'bg-rose-500/5 text-rose-400', glowColor: 'bg-rose-600', Icon: AlertCircle, isCritical: true },
                    warning: { bg: 'bg-[#171109]', border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', titleColor: 'text-amber-100', descColor: 'text-amber-200/70', badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300', verdictBg: 'bg-amber-500/5 text-amber-400', glowColor: 'bg-amber-600', Icon: Activity, isCritical: false },
                    success: { bg: 'bg-[#06140e]', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', titleColor: 'text-emerald-100', descColor: 'text-emerald-200/70', badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', verdictBg: 'bg-emerald-500/5 text-emerald-400', glowColor: 'bg-emerald-600', Icon: Trophy, isCritical: false },
                    info: { bg: 'bg-slate-900/50', border: 'border-slate-500/20', iconBg: 'bg-slate-500/10', iconColor: 'text-slate-400', titleColor: 'text-slate-100', descColor: 'text-slate-400', badgeBg: 'bg-slate-500/10 border-slate-500/30 text-slate-300', verdictBg: 'bg-slate-500/5 text-slate-400', glowColor: 'bg-slate-600', Icon: AlertCircle, isCritical: false }
                  }[type];

                  return (
                    <div key={getSafeId(alertTask) || `sys-alert-${alertTask?.id || idx}`} className={`relative overflow-hidden p-5 rounded-3xl border flex flex-col gap-4 shadow-xl ${t.bg} ${t.border}`}>
                      <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[70px] pointer-events-none opacity-[0.15] ${t.glowColor}`} />
                      <div className="flex items-start gap-4">
                        <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${t.iconBg} ${t.border} ${t.iconColor}`}>
                          <t.Icon size={24} className={t.isCritical ? "animate-pulse" : ""} />
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${t.badgeBg}`}>
                              {subjectName}
                            </span>
                            {t.isCritical && (
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                                Intervenção Exigida
                              </span>
                            )}
                          </div>
                          <span className={`text-sm sm:text-base font-black tracking-tight leading-snug uppercase ${t.titleColor}`}>
                            {titlePart}
                          </span>
                          <span className={`text-xs font-medium leading-relaxed ${t.descColor}`}>
                            {descPart}
                          </span>
                        </div>
                      </div>

                      {alertTask.analysis?.monteCarlo && (
                        <div className="flex flex-wrap items-center gap-2 mt-1 mb-1">
                          <div className={`px-2 py-1.5 rounded-lg border ${t.border} bg-black/20 flex items-center gap-1.5`}>
                            <Target size={12} className={t.iconColor} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                              Projeção Base:{' '}
                              <span className="text-white ml-1">
                                {Math.round(Number.isFinite(Number(alertTask.analysis.monteCarlo.probabilityRaw))
                                  ? Number(alertTask.analysis.monteCarlo.probabilityRaw)
                                  : Number(String(alertTask.analysis.monteCarlo.probability || 0).replace(/[^\d.-]/g, '')) || 0)}%
                              </span>
                            </span>
                          </div>
                          <div className={`px-2 py-1.5 rounded-lg border ${t.border} bg-black/20 flex items-center gap-1.5`}>
                            <Activity size={12} className={t.iconColor} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                              Volatilidade:{' '}
                              <span className="text-white ml-1">
                                {(Number(String(alertTask.analysis.monteCarlo.volatility || 0).replace(/[^\d.-]/g, '')) || 0).toFixed(2)}
                              </span>
                            </span>
                          </div>
                          {alertTask.analysis.monteCarlo.calibrationPenalty > 0.01 && (
                            <div className="px-2 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center gap-1.5">
                              <Zap size={12} className="text-amber-400" />
                              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                                Penalidade: <span className="text-amber-400 ml-1">-{Math.round(alertTask.analysis.monteCarlo.calibrationPenalty * 100)}%</span>
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {alertTask.analysis?.verdict && (
                        <div className="flex flex-col gap-2 mt-1">
                          <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] font-bold ${t.verdictBg} ${t.border}`}>
                            <BrainCircuit size={14} className="shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{alertTask.analysis.verdict}</span>
                          </div>
                          <div className="pt-3 border-t border-white/5 mt-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 block mb-1">
                              Ação Sugerida
                            </span>
                            <p className={`text-xs font-bold ${t.titleColor} opacity-90`}>{actionDesc}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* FIX-CODE-07: Passar props corretamente */}
            <AICoachPlanner plannerData={coachPlanner} categories={categories} onStartPomodoro={handleStartNeural} />
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
</file>

<file path="src/pages/Coach.jsx">
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Brain, Zap, AlertCircle, ArrowUpRight, ShieldCheck, Dna, List, BookOpen
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMonteCarloStats } from '../hooks/useMonteCarloStats';
import { calculateAdaptiveSlope } from '../engine/projection.js';
import PageHeader from '../components/header/PageHeader';
import AICoachView from '../components/AICoachView';
import CoachMenuNav from '../components/coach/CoachMenuNav';
import MonteCarloDebugger from '../components/MonteCarloDebugger';
import ReliabilityCurveChart from '../components/charts/ReliabilityCurveChart';
import { getFlashcardDueTodayCount } from '../utils/analytics';
import { useSubscription } from '../hooks/useSubscription';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import {
  getSuggestedFocus, generateDailyGoals, clearMcCache,
  clearUrgencyCache, clearTopicsCache, getCombinedHistory
} from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { logCalibrationTelemetryEvent } from '../utils/calibrationTelemetry';
import {
  CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD, ALERT_COOLDOWN_MS
} from '../utils/calibration.js';
import { displaySubject } from '../utils/displaySubject';
import { formatDatePtBR, formatDateTimePtBR } from '../utils/dateHelper';
import { getCalibrationKey } from '../utils/coachSafe.js';

// FIX-CODE-02: Constantes centralizadas
const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45;
const CALIBRATION_ALERT_CACHE_MAX = 200;
const BRIER_VISUAL_MAX = 0.35;
const EMPTY_ARRAY = Object.freeze([]);

// FIX: Normalização defensiva — aceita array OU objeto-map, nunca quebra com outros tipos
function normalizeToArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return EMPTY_ARRAY;
}

// FIX: Sanitização central de maxScore (0, negativo ou NaN viram 100)
function sanitizeMaxScore(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

function resolveTargetScorePoints({ user, minScore = 0, maxScore = 100 }) {
  const safeMax = sanitizeMaxScore(maxScore);
  // FIX: minScore negativo não é mais aceito
  const safeMin = Math.max(0, Math.min(Number(minScore) || 0, safeMax));
  const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number(value) || 0));
  // FIX: string vazia ('') não é mais interpretada como meta 0
  if (user?.targetScore != null && user.targetScore !== '' && Number.isFinite(Number(user.targetScore))) {
    let ts = Number(user.targetScore);
    if (ts > safeMax && ts <= 100) {
      ts = (ts / 100) * safeMax;
    }
    return clamp(ts);
  }
  if (user?.targetProbability != null && user.targetProbability !== '' && Number.isFinite(Number(user.targetProbability))) {
    return clamp((Number(user.targetProbability) / 100) * safeMax);
  }
  return clamp(safeMax * 0.8);
}

export default function Coach() {
  const calibrationAlertCacheRef = useRef(new Map());
  const activeId = useAppStore(state => state.appState.activeId);

  // FIX: ref espelhando o concurso ativo, para validar métricas agendadas
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const data = useAppStore(useShallow(state => {
    const contest = state.appState?.contests?.[state.appState?.activeId] || {};
    return {
      simuladoRows: contest.simuladoRows,
      simulados: contest.simulados,
      categories: contest.categories,
      flashcardDecks: contest.flashcardDecks,
      user: contest.user,
      calibrationHistoryByCategory: contest.calibrationHistoryByCategory,
      calibrationOps: contest.calibrationOps,
      calibrationAuditLog: contest.calibrationAuditLog,
      maxScore: contest.maxScore,
      minScore: contest.minScore,
      studyLogs: contest.studyLogs,
      settings: contest.settings,
      coachPlan: contest.coachPlan,
      coachPlanner: contest.coachPlanner
    };
  }));
  const isHydrated = useAppStore(state => state.appState.isHydrated);
  const setData = useAppStore(state => state.setData);
  const showToast = useToast();
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  // FIX: normalização defensiva em todos os campos que podem vir como objeto-map
  const rawHistory = data?.simuladoRows || EMPTY_ARRAY;
  const history = useMemo(() => normalizeToArray(rawHistory), [rawHistory]);

  const rawSimulados = data?.simulados || EMPTY_ARRAY;
  const simulados = useMemo(() => normalizeToArray(rawSimulados), [rawSimulados]);

  const rawCategories = data?.categories || EMPTY_ARRAY;
  const categories = useMemo(() =>
    normalizeToArray(rawCategories).map(c => ({
      ...c,
      tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
    })),
    [rawCategories]
  );

  const rawFlashcardDecks = data?.flashcardDecks || EMPTY_ARRAY;
  const flashcardDecks = useMemo(() => normalizeToArray(rawFlashcardDecks), [rawFlashcardDecks]);

  const rawStudyLogs = data?.studyLogs || EMPTY_ARRAY;
  const studyLogs = useMemo(() => normalizeToArray(rawStudyLogs), [rawStudyLogs]);

  const flashcardDue = useMemo(() => getFlashcardDueTodayCount(flashcardDecks), [flashcardDecks]);
  const userProfile = data?.user;
  const updateCoachScore = useAppStore(state => state.updateCoachScore);
  const { isPremium } = useSubscription(userProfile);
  const navigate = useNavigate();

  const isPremiumBool = Boolean(isPremium);
  const [activeTab, setActiveTab] = useState('insights');
  const safeActiveTab = (activeTab === 'analytics' && isPremiumBool) ? 'analytics' : 'insights';
  useEffect(() => {
    if (activeTab && activeTab !== safeActiveTab) {
      console.warn(`[Coach.jsx] Estado de aba inválido: ${activeTab}, fallback ativado.`);
    }
  }, [activeTab, safeActiveTab]);

  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [coachLoading, setCoachLoading] = useState(false);
  const [suggestedFocus, setSuggestedFocus] = useState(null);
  const timeoutRef = useRef(null);
  const lastPushedScoreRef = useRef(null);
  const calibrationHistoryRef = useRef(data?.calibrationHistoryByCategory || {});
  const isMountedRef = useRef(true);
  // FIX-BUG-11: Rastrear idle callbacks E rAFs para cleanup correto
  const idleCallbackIdsRef = useRef([]);
  const rafIdsRef = useRef([]);
  const lastPersistByCategoryRef = useRef(new Map());

  // FIX: Cancela todo trabalho pendente (evita vazamento entre concursos e após unmount)
  const cancelPendingCalibrationWork = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    idleCallbackIdsRef.current.forEach(id => {
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(id);
    });
    idleCallbackIdsRef.current = [];
    rafIdsRef.current.forEach(id => cancelAnimationFrame(id));
    rafIdsRef.current = [];
    setCoachLoading(false);
  }, []);

  // FIX-BUG-04 + FIX: além dos caches, cancela timeouts/idle/rAF pendentes ao trocar de concurso
  useEffect(() => {
    clearMcCache();
    clearUrgencyCache();
    clearTopicsCache();
    calibrationAlertCacheRef.current.clear();
    lastPersistByCategoryRef.current.clear();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cancelPendingCalibrationWork();
  }, [activeId, cancelPendingCalibrationWork]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelPendingCalibrationWork();
    };
  }, [cancelPendingCalibrationWork]);

  useEffect(() => {
    calibrationHistoryRef.current = data?.calibrationHistoryByCategory || {};
  }, [data?.calibrationHistoryByCategory]);

  const persistCalibrationMetric = useCallback((metric) => {
    if (!isMountedRef.current || !metric) return;
    // FIX: descarta métricas coletadas em outro concurso (agendadas antes da troca)
    if (metric.contestId && metric.contestId !== activeIdRef.current) return;

    const now = Date.now();
    const rawCategoryId = metric?.categoryId || metric?.categoryName;
    if (!rawCategoryId) return;
    const normalizedCategoryId = getCalibrationKey(rawCategoryId);

    const toFinite = (value, fallback = null) => {
      if (value === null || value === undefined || value === '') return fallback;
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };

    // FIX: timestamp 0 ou inválido não é mais tratado de forma inconsistente
    const metricTimestamp = metric?.timestamp && Number.isFinite(Number(metric.timestamp)) && Number(metric.timestamp) > 100000000000
      ? Number(metric.timestamp)
      : now;
    const avgBrier = toFinite(metric?.avgBrier, null);
    const ece = toFinite(metric?.ece, null);
    const probability = toFinite(metric?.probability, null);
    const calibrationPenalty = toFinite(metric?.calibrationPenalty, 0);
    const reliability = Array.isArray(metric?.reliability) ? metric.reliability : [];
    const isDegraded = metric?.degraded === true || calibrationPenalty >= HIGH_PENALTY_THRESHOLD;
    const hasUsefulSignal =
      avgBrier !== null || ece !== null || probability !== null ||
      calibrationPenalty > 0 || reliability.length > 0;
    if (!hasUsefulSignal) return;

    // FIX: throttle só é registrado depois da validação
    // (antes, métrica inútil bloqueava métrica válida da mesma categoria por 500ms)
    const lastAt = Number(lastPersistByCategoryRef.current.get(normalizedCategoryId) || 0);
    if (now - lastAt < 500) return;
    lastPersistByCategoryRef.current.set(normalizedCategoryId, now);
    if (lastPersistByCategoryRef.current.size > 200) {
      const oldestKey = lastPersistByCategoryRef.current.keys().next().value;
      lastPersistByCategoryRef.current.delete(oldestKey);
    }

    const normalizedMetric = {
      ...metric,
      categoryId: normalizedCategoryId,
      categoryName: metric?.categoryName || normalizedCategoryId,
      timestamp: metricTimestamp,
      avgBrier, ece, probability, calibrationPenalty, reliability
    };

    let wasPersisted = false;
    // Nota: setData segue o contrato Immer do restante do app (mutação do draft)
    setData(prev => {
      if (!prev) return prev;
      const current = prev.calibrationHistoryByCategory || {};
      const categoryHistory = current[normalizedCategoryId] || [];
      const lastEntry = categoryHistory[categoryHistory.length - 1];
      const hasComparableLast = lastEntry && Number.isFinite(Number(lastEntry?.timestamp));
      if (hasComparableLast) {
        const metricDelta = (currentValue, previousValue) => {
          const currentFinite = currentValue !== null && currentValue !== undefined && currentValue !== '' && Number.isFinite(Number(currentValue));
          const previousFinite = previousValue !== null && previousValue !== undefined && previousValue !== '' && Number.isFinite(Number(previousValue));
          if (currentFinite && previousFinite) return Math.abs(Number(previousValue) - Number(currentValue));
          if (!currentFinite && !previousFinite) return 0;
          return Infinity;
        };
        const toReliabilitySignature = (bucketList = []) =>
          (Array.isArray(bucketList) ? bucketList : [])
            .map((bucket) => {
              const meanPred = Number(bucket?.meanPred);
              const observedRate = Number(bucket?.observedRate);
              const gap = Number(bucket?.gap);
              const count = Number(bucket?.count) || 0;
              return `${count}|${Number.isFinite(meanPred) ? meanPred.toFixed(3) : 'na'}|${Number.isFinite(observedRate) ? observedRate.toFixed(3) : 'na'}|${Number.isFinite(gap) ? gap.toFixed(3) : 'na'}`;
            })
            .join('::');
        const brierDelta = metricDelta(avgBrier, lastEntry.avgBrier);
        const eceDelta = metricDelta(ece, lastEntry.ece);
        const penaltyDelta = Math.abs(Number(lastEntry.calibrationPenalty || 0) - calibrationPenalty);
        const probabilityDelta = metricDelta(probability, lastEntry.probability);
        const reliabilitySignatureChanged =
          toReliabilitySignature(lastEntry?.reliability) !== toReliabilitySignature(reliability);
        const shouldSkipPersist =
          (brierDelta < 0.001 || (brierDelta / Math.max(0.001, lastEntry.avgBrier)) < 0.05) &&
          (eceDelta < 0.001 || (eceDelta / Math.max(0.001, lastEntry.ece)) < 0.05) &&
          penaltyDelta < 0.001 &&
          probabilityDelta < 0.01 &&
          !reliabilitySignatureChanged;
        if (shouldSkipPersist) return;
      }
      const cutoff = now - CALIBRATION_HISTORY_RETENTION_MS;
      const cleaned = categoryHistory.filter(
        item => Number.isFinite(Number(item?.timestamp)) && Number(item.timestamp) >= cutoff
      );
      const nextHistory = [...cleaned, normalizedMetric].slice(-60);
      // FIX: janela de 7 dias relativa ao timestamp da métrica (corrige métricas com data retroativa)
      const recent7 = nextHistory.filter(
        item => Number(item?.timestamp || 0) >= (metricTimestamp - 1000 * 60 * 60 * 24 * 7)
      );
      const recent7Brier = recent7
        .map(item => toFinite(item?.avgBrier, null))
        .filter(val => val !== null);
      const avgBrier7d = recent7Brier.length > 0
        ? recent7Brier.reduce((acc, val) => acc + val, 0) / recent7Brier.length
        : null;
      const calibrationOps = {
        ...(prev.calibrationOps || {}),
        [normalizedCategoryId]: {
          categoryName: normalizedMetric.categoryName,
          avgBrier7d: Number.isFinite(avgBrier7d) ? Number(avgBrier7d.toFixed(4)) : null,
          sample7d: recent7.length,
          degraded: isDegraded,
          updatedAt: now
        }
      };
      // FIX-MEM-02: Prune audit log por tempo E tamanho
      const auditCutoff = now - CALIBRATION_HISTORY_RETENTION_MS;
      const calibrationAuditLog = [...(prev.calibrationAuditLog || []), {
        ...normalizedMetric,
        avgBrier7d: Number.isFinite(avgBrier7d) ? Number(avgBrier7d.toFixed(4)) : null,
        degraded: isDegraded,
        source: 'coach'
      }]
        .filter(e => Number.isFinite(Number(e?.timestamp)) && Number(e.timestamp) >= auditCutoff)
        .slice(-500);
      prev.calibrationHistoryByCategory = prev.calibrationHistoryByCategory || {};
      prev.calibrationHistoryByCategory[normalizedCategoryId] = nextHistory;
      prev.calibrationOps = calibrationOps;
      prev.calibrationAuditLog = calibrationAuditLog;
      wasPersisted = true;
      return;
    });
    if (!wasPersisted) return;

    // FIX: telemetria isolada — falha nela não quebra o fluxo de alertas
    try {
      if (normalizedMetric.calibrationPenalty >= HIGH_PENALTY_THRESHOLD) {
        logCalibrationTelemetryEvent({ ...normalizedMetric, eventType: 'high_penalty_alert' });
      } else {
        logCalibrationTelemetryEvent(normalizedMetric);
      }
    } catch (error) {
      console.warn('[Coach.jsx] Falha ao registrar telemetria de calibração:', error);
    }

    if (isDegraded) {
      const currentTime = Date.now();
      for (const [key, ts] of calibrationAlertCacheRef.current.entries()) {
        if (currentTime - ts > ALERT_COOLDOWN_MS) calibrationAlertCacheRef.current.delete(key);
      }
      const lastAlertAt = Number(calibrationAlertCacheRef.current.get(normalizedCategoryId) || 0);
      if (currentTime - lastAlertAt > ALERT_COOLDOWN_MS) {
        // FIX: avgBrier pode ser null — não exibir "NaN" no toast
        const brierLabel = avgBrier !== null ? Number(avgBrier).toFixed(2) : '—';
        showToastRef.current(
          `⚠️ Calibração crítica em ${displaySubject(normalizedMetric.categoryName || 'categoria')} (Brier ${brierLabel}).`,
          'warning'
        );
        calibrationAlertCacheRef.current.set(normalizedCategoryId, currentTime);
        if (calibrationAlertCacheRef.current.size > CALIBRATION_ALERT_CACHE_MAX) {
          const oldestKey = calibrationAlertCacheRef.current.keys().next().value;
          calibrationAlertCacheRef.current.delete(oldestKey);
        }
      }
    }
  }, [setData]);

  // FIX: agendamento central com rastreamento/remoção de IDs (idle E rAF)
  const scheduleCalibrationPersist = useCallback((metrics) => {
    metrics.forEach((metric) => {
      if ('requestIdleCallback' in window) {
        let id;
        id = window.requestIdleCallback(() => {
          idleCallbackIdsRef.current = idleCallbackIdsRef.current.filter(cbId => cbId !== id);
          persistCalibrationMetric(metric);
        }, { timeout: 2000 });
        idleCallbackIdsRef.current.push(id);
      } else {
        let rafId;
        rafId = requestAnimationFrame(() => {
          rafIdsRef.current = rafIdsRef.current.filter(cbId => cbId !== rafId);
          persistCalibrationMetric(metric);
        });
        rafIdsRef.current.push(rafId);
      }
    });
  }, [persistCalibrationMetric]);

  // FIX: maxScore sanitizado de forma consistente em todo o componente
  const currentMaxScore = sanitizeMaxScore(data?.maxScore);
  const combinedHistory = useMemo(
    () => getCombinedHistory(history, simulados, currentMaxScore),
    [history, simulados, currentMaxScore]
  );
  const targetScorePoints = useMemo(() => resolveTargetScorePoints({
    user: userProfile,
    minScore: data?.minScore,
    maxScore: currentMaxScore
  }), [userProfile, data?.minScore, currentMaxScore]);
  const targetScoreLabel = useMemo(() => {
    const safeMax = sanitizeMaxScore(currentMaxScore);
    return Math.round((targetScorePoints / safeMax) * 100);
  }, [targetScorePoints, currentMaxScore]);

  const mcStats = useMonteCarloStats({
    categories,
    goalDate: userProfile?.goalDate,
    targetScore: targetScorePoints,
    timeIndex: -1,
    timelineDates: EMPTY_ARRAY,
    minScore: data?.minScore ?? 0,
    maxScore: currentMaxScore,
    // FIX: passa o histórico NORMALIZADO (array), não o campo bruto que pode ser objeto
    simuladoRows: history
  });

  const projectedScore = mcStats?.projectedMean;
  const volatility = mcStats?.statsData?.pooledSD ?? mcStats?.sd ?? 0;
  // FIX: NaN não vaza mais para a UI (?? não substitui NaN)
  const safeVolatility = Number.isFinite(volatility) ? volatility : 0;
  const normalizedVolatility = useMemo(() => {
    const denom = Math.max(1, Number(currentMaxScore) || 1);
    return (safeVolatility / denom) * 100;
  }, [safeVolatility, currentMaxScore]);
  const drift = useMemo(() => {
    const slope = calculateAdaptiveSlope(combinedHistory, currentMaxScore);
    return Number.isFinite(slope) ? slope : 0; // FIX: drift NaN vira 0
  }, [combinedHistory, currentMaxScore]);
  const totalSimulados = useMemo(() => combinedHistory.length, [combinedHistory]);

  const mcStatsContext = useMemo(() => ({
    projectedMean: mcStats?.projectedMean,
    probability: mcStats?.probability,
    statsData: mcStats?.statsData,
    sd: mcStats?.sd
  }), [mcStats?.projectedMean, mcStats?.probability, mcStats?.statsData, mcStats?.sd]);
  const mcStatsContextRef = useRef(mcStatsContext);
  useEffect(() => { mcStatsContextRef.current = mcStatsContext; }, [mcStatsContext]);

  useEffect(() => {
    if (!isHydrated) return;
    // FIX: usa o array normalizado (data.categories pode ser objeto sem .length)
    if (categories.length === 0) {
      setTimeout(() => setIsAnalyzing(false), 0);
      return;
    }
    let metricsTimer = null;
    const analysisTimer = setTimeout(() => {
      // FIX: try/catch/finally — erro no motor não trava mais o loading eternamente
      try {
        const targetScore = targetScorePoints;
        const collectedMetrics = [];
        const contestId = activeIdRef.current; // FIX: marca a origem de cada métrica
        const result = getSuggestedFocus(
          categories, history, studyLogs,
          {
            user: data.user,
            targetScore,
            targetScoreLabel,
            maxScore: currentMaxScore,
            calibrationHistoryByCategory: calibrationHistoryRef.current,
            flashcardDecks,
            flashcardDue,
            onCalibrationMetric: (metric) => collectedMetrics.push({ ...metric, contestId }),
            globalMcStats: mcStatsContextRef.current,
            config: {
              MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false,
              userId: activeIdRef.current
            }
          }
        );
        const _mcCtx = mcStatsContextRef.current;
        // FIX: valida Number.isFinite (NaN.toFixed não quebra, mas gerava "NaN%" na UI)
        if (result && _mcCtx && Number.isFinite(Number(_mcCtx.projectedMean))) {
          result.globalMcContext = {
            projectedMean: Number(Number(_mcCtx.projectedMean).toFixed(1)),
            probability: Number.isFinite(Number(_mcCtx.probability))
              ? Number(Number(_mcCtx.probability).toFixed(1))
              : null,
            source: 'useMonteCarloStats'
          };
        }
        setSuggestedFocus(result);
        if (collectedMetrics.length > 0) {
          metricsTimer = setTimeout(() => {
            scheduleCalibrationPersist(collectedMetrics);
          }, 1000);
        }
      } catch (error) {
        console.error('[Coach.jsx] Falha ao calcular suggestedFocus:', error);
        setSuggestedFocus(null);
        showToastRef.current('Falha ao processar a análise do Coach.', 'error');
      } finally {
        setIsAnalyzing(false);
      }
    }, 0);
    return () => {
      clearTimeout(analysisTimer);
      if (metricsTimer) clearTimeout(metricsTimer);
    };
  }, [
    isHydrated, data?.categories, data?.simuladoRows, data?.studyLogs,
    data?.user, data?.maxScore, data?.settings?.adaptiveCalibrationEnabled,
    userProfile?.targetProbability, flashcardDue, flashcardDecks,
    persistCalibrationMetric, scheduleCalibrationPersist, targetScorePoints,
    currentMaxScore, targetScoreLabel, categories, history, studyLogs
  ]);

  useEffect(() => {
    if (!Number.isFinite(projectedScore)) return;

    if (
      lastPushedScoreRef.current === null ||
      Math.abs(projectedScore - lastPushedScoreRef.current) > 0.01
    ) {
      lastPushedScoreRef.current = projectedScore;
      const timer = setTimeout(() => {
        if (updateCoachScore) updateCoachScore(projectedScore);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [projectedScore, updateCoachScore]);

  const handleChangeTab = useCallback((tab) => {
    setActiveTab(tab === 'analytics' ? 'analytics' : 'insights');
  }, []);

  const userData = data?.user;
  const settingsData = data?.settings;

  const handleGenerateGoals = useCallback(() => {
    // FIX: valida o array normalizado, não o campo bruto
    if (categories.length === 0 || coachLoading) return;
    setCoachLoading(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (!isMountedRef.current) return;
      // FIX: try/catch/finally — erro não trava mais o botão em loading eterno
      try {
        const targetScore = targetScorePoints;
        const collectedMetrics = [];
        const contestId = activeIdRef.current; // FIX: marca a origem de cada métrica
        const newTasks = generateDailyGoals(
          categories, history, studyLogs,
          {
            user: userData,
            targetScore,
            targetScoreLabel,
            maxScore: currentMaxScore,
            calibrationHistoryByCategory: calibrationHistoryRef.current,
            onCalibrationMetric: (metric) => collectedMetrics.push({ ...metric, contestId }),
            config: {
              MC_ENABLE_ADAPTIVE_CALIBRATION: settingsData?.adaptiveCalibrationEnabled !== false,
              userId: activeIdRef.current
            }
          }
        );
        // FIX: newTasks pode não ser array — valida antes de usar .length
        if (Array.isArray(newTasks) && newTasks.length) {
          setData(prev => {
            if (!prev) return prev;
            prev.coachPlan = newTasks;
            prev.coachPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
            return;
          });
          showToastRef.current('Sugestões geradas!', 'success');
        } else {
          showToastRef.current('Nenhuma sugestão necessária.', 'info');
        }
        if (collectedMetrics.length > 0) {
          scheduleCalibrationPersist(collectedMetrics);
        }
      } catch (error) {
        console.error('[Coach.jsx] Falha ao gerar metas diárias:', error);
        showToastRef.current('Erro ao gerar as sugestões do Coach.', 'error');
      } finally {
        setCoachLoading(false);
      }
    }, 1500);
  }, [
    categories, coachLoading, setData, scheduleCalibrationPersist,
    history, studyLogs, targetScorePoints, targetScoreLabel,
    currentMaxScore, userData, settingsData
  ]);

  const handleClearHistory = useCallback(() => {
    setData(prev => {
      if (!prev) return prev;
      prev.coachPlan = [];
      prev.coachPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
      return;
    });
  }, [setData]);

  // FIX (crítico): loading eterno quando data.categories era null/undefined.
  // Agora a decisão usa `categories` (normalizado) e há estado vazio dedicado.
  if (!isHydrated || isAnalyzing || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <Brain className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={24} />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white font-black uppercase tracking-widest text-xs">
            Sincronizando Redes Neurais
          </span>
          <span className="text-slate-500 text-[10px] mt-1 uppercase font-bold animate-pulse">
            Processando Probabilidades...
          </span>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <PageErrorBoundary pageName="Coach">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-3xl border border-white/10 bg-slate-900/60 flex items-center justify-center">
            <Brain className="text-slate-600" size={26} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-white font-black uppercase tracking-widest text-xs">
              Sem categorias cadastradas
            </span>
            <span className="text-slate-500 text-[10px] uppercase font-bold max-w-[300px] leading-relaxed">
              Cadastre as matérias do concurso para ativar o motor estatístico do Coach.
            </span>
          </div>
        </div>
      </PageErrorBoundary>
    );
  }

  // FIX: GovernanceBanner — contagem segura (filter(Boolean)) e filho com key
  // direto no AnimatePresence para a animação de saída funcionar
  const degradedCount = Object.values(data?.calibrationOps || {})
    .filter(Boolean)
    .filter(op => op.degraded === true).length;

  // FIX (alto): o efeito popula `globalMcContext`, mas a UI lia `globalProjectedMean`
  const globalProjectedMean =
    suggestedFocus?.globalProjectedMean ?? suggestedFocus?.globalMcContext?.projectedMean;
  const showGlobalMc = Number.isFinite(Number(globalProjectedMean));

  return (
    <PageErrorBoundary pageName="Coach">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        <div className="relative z-50 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <PageHeader
            title="Análise do Coach"
            description="Mentor estatístico processando seu desempenho para otimizar sua aprovação."
          />
          <div className="relative z-[60] flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 bg-slate-900/50 border border-white/10 p-2 sm:p-3 rounded-3xl backdrop-blur-xl w-full md:w-auto shadow-inner">
            <div className="flex items-center gap-3 sm:px-4 px-2">
              <QuickStat
                label="Volatilidade"
                value={`${normalizedVolatility.toFixed(1)}pp`}
                color="text-rose-400"
                icon={<Zap size={14} />}
              />
              <div className="hidden sm:block w-px h-6 bg-white/10" />
              <MonteCarloDebugger stats={mcStats} />
              <div className="w-px h-6 bg-white/10" />
              <QuickStat
                label="Tendência"
                value={`${((drift * 30) / Math.max(1, Number(currentMaxScore) || 1) * 100).toFixed(1)}pp`}
                color="text-emerald-400"
                icon={<ArrowUpRight size={14} />}
              />
              <div className="w-px h-6 bg-white/10" />
              <QuickStat label="Simulados" value={totalSimulados} color="text-indigo-400" icon={<Dna size={14} />} />
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {degradedCount > 0 && (
            <GovernanceBanner key="governance-banner" degradedCount={degradedCount} />
          )}
        </AnimatePresence>

        <div className="space-y-10">
          <div className="w-full">
            <CoachMenuNav activeTab={safeActiveTab} onChangeTab={handleChangeTab} isPremium={isPremium} />
            <Motion.div
              key={safeActiveTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-h-[200px]"
            >
              <div
                role="tabpanel"
                id="coach-panel-insights"
                aria-labelledby="coach-tab-insights"
                tabIndex={safeActiveTab === 'insights' ? 0 : -1}
                hidden={safeActiveTab !== 'insights'}
              >
                {safeActiveTab === 'insights' && (
                  <>
                    {flashcardDue > 0 && (
                      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
                        <BookOpen className="text-amber-400" size={18} />
                        <div className="flex-1 text-amber-200">
                          <span className="font-semibold">{flashcardDue} flashcards</span> pendentes para hoje.
                          SRS melhora retenção e o modelo.
                        </div>
                        <button
                          onClick={() => navigate('/flashcards')}
                          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition"
                        >
                          FLASHCARDS
                        </button>
                      </div>
                    )}
                    {showGlobalMc && (
                      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs">
                        <span className="font-semibold text-emerald-300">Global MC:</span>
                        <span className="font-mono text-base font-bold text-emerald-200">
                          {globalProjectedMean}%
                        </span>
                        <span className="text-emerald-400/60">contexto global aplicado</span>
                      </div>
                    )}
                    <AICoachView
                      suggestedFocus={suggestedFocus}
                      onGenerateGoals={handleGenerateGoals}
                      loading={coachLoading}
                      onClearHistory={handleClearHistory}
                    />
                  </>
                )}
              </div>
              <div
                role="tabpanel"
                id="coach-panel-analytics"
                aria-labelledby="coach-tab-analytics"
                tabIndex={safeActiveTab === 'analytics' ? 0 : -1}
                hidden={safeActiveTab !== 'analytics'}
              >
                {safeActiveTab === 'analytics' && isPremiumBool && <RaioXDashboard data={data} />}
              </div>
            </Motion.div>
          </div>
        </div>
      </div>
    </PageErrorBoundary>
  );
}

function QuickStat({ label, value, color, icon }) {
  return (
    <div className="flex flex-col min-w-[78px] sm:min-w-[80px] px-1">
      <div className="flex items-center gap-1.5 mb-0.5 opacity-70">
        <span className={color}>{icon}</span>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em]">{label}</span>
      </div>
      <span className={`text-base font-black ${color} tracking-tighter tabular-nums`}>{value}</span>
    </div>
  );
}



// FIX: recebe apenas o necessário (contagem), calculada de forma segura pelo pai
const GovernanceBanner = React.memo(React.forwardRef(function GovernanceBanner({ degradedCount }, ref) {
  return (
    <Motion.div
      ref={ref}
      layout
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="mb-6 p-4 rounded-3xl bg-rose-500/5 border border-rose-500/30 flex items-center justify-between gap-4 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-400 border border-rose-500/20">
          <AlertCircle size={20} />
        </div>
        <div>
          <h4 className="text-sm font-black text-rose-200 uppercase tracking-tight">Alerta de Governança</h4>
          <p className="text-[10px] text-rose-300/80 font-medium uppercase tracking-widest">
            Detectamos <span className="text-rose-400 font-black">{degradedCount}</span> categorias com calibração degradada.
          </p>
        </div>
      </div>
      <div className="hidden sm:block text-right">
        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-tight">
          O Coach está aplicando<br />ajustes conservadores.
        </p>
      </div>
    </Motion.div>
  );
}));

function RaioXDashboard({ data }) {
  const ops = data?.calibrationOps || {};
  const [filter, setFilter] = useState('all');
  const toFiniteNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  // FIX-BUG-10: lazy state para o "now" do mount
  const [mountTime] = useState(() => Date.now());

  const calibrationSummary = useMemo(() => {
    const historyByCategory = data?.calibrationHistoryByCategory || {};
    let latestTs = 0;
    for (const entries of Object.values(historyByCategory)) {
      if (Array.isArray(entries)) {
        for (const e of entries) {
          const ts = toFiniteNumber(e?.timestamp);
          if (ts > latestTs) latestTs = ts;
        }
      }
    }
    const now = latestTs > 0 ? latestTs : mountTime;
    return Object.entries(historyByCategory)
      .map(([categoryId, history]) => {
        const rows = Array.isArray(history) ? history : [];
        if (rows.length === 0) return null;
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const recent = rows.filter(h => toFiniteNumber(h?.timestamp) >= sevenDaysAgo);
        const base = recent.length > 0 ? recent : rows;
        const brierValues = base
          .filter(h => h?.avgBrier !== null && h?.avgBrier !== undefined && h?.avgBrier !== '')
          .map(h => Number(h.avgBrier))
          .filter(Number.isFinite);
        const penaltyValues = base
          .filter(h => h?.calibrationPenalty !== null && h?.calibrationPenalty !== undefined && h?.calibrationPenalty !== '')
          .map(h => Number(h.calibrationPenalty))
          .filter(Number.isFinite);
        // FIX: sem Brier válido não há calibração a exibir
        // (antes, penalty=0 fazia o card aparecer com "0.00" verde, falso-positivo)
        if (brierValues.length === 0) return null;
        const avgBrier = brierValues.reduce((acc, val) => acc + val, 0) / brierValues.length;
        const avgPenalty = penaltyValues.length > 0
          ? penaltyValues.reduce((acc, val) => acc + val, 0) / penaltyValues.length
          : 0;
        const label = rows[rows.length - 1]?.categoryName || categoryId;
        return { categoryId, label, count: brierValues.length, avgBrier, avgPenalty };
      })
      .filter(Boolean);
  }, [data?.calibrationHistoryByCategory, mountTime]);

  const toPercentLabel = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${Math.max(0, Math.min(100, Math.round(n * 100)))}%`;
  };

  const sortedLogs = useMemo(() => {
    const source = Array.isArray(data?.calibrationAuditLog) ? data.calibrationAuditLog : [];
    return [...source].filter(Boolean).sort((a, b) => toFiniteNumber(b?.timestamp) - toFiniteNumber(a?.timestamp));
  }, [data?.calibrationAuditLog]);

  const filteredLogs = useMemo(
    () => sortedLogs
      // FIX: truthy em "false" (string) não conta mais como degradado
      .filter(log => filter === 'all' || (filter === 'degraded' && log?.degraded === true))
      .slice(0, 50),
    [sortedLogs, filter]
  );

  const latestWithReliability = sortedLogs.find(
    log => Array.isArray(log?.reliability) && log.reliability.length > 0
  );

  const eceValues = sortedLogs.map(log => toFiniteNumber(log?.ece, null)).filter(val => val !== null);
  const avgEce = eceValues.length
    ? eceValues.reduce((a, b) => a + b, 0) / eceValues.length : null;

  const categorySeriesMap = useMemo(() => {
    return sortedLogs.reduce((acc, log) => {
      const cat = log?.categoryName || 'Categoria';
      const brier = toFiniteNumber(log?.avgBrier, null);
      const ece = toFiniteNumber(log?.ece, null);

      if (brier === null && ece === null) return acc;

      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        ts: toFiniteNumber(log?.timestamp),
        brier,
        ece
      });

      return acc;
    }, {});
  }, [sortedLogs]);

  const categoryNames = Object.keys(categorySeriesMap);
  const [seriesCategory, setSeriesCategory] = useState(() => categoryNames[0] || '');
  const effectiveCategory = categoryNames.includes(seriesCategory)
    ? seriesCategory : (categoryNames[0] || '');
  const temporalSeries = useMemo(() => {
    if (!effectiveCategory) return [];
    return [...(categorySeriesMap[effectiveCategory] || [])]
      .sort((a, b) => a.ts - b.ts)
      .slice(-12);
  }, [categorySeriesMap, effectiveCategory]);

  // FIX: clamp de largura reutilizável (evita width negativo/inválido)
  const toBarWidth = (value) => {
    const pct = (Number(value) || 0) * 100;
    return `${Math.max(0, Math.min(100, pct))}%`;
  };

  return (
    <div className="space-y-12 animate-fade-in">
      {calibrationSummary.length > 0 ? (
        <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
            <div>
              <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                <ShieldCheck size={14} />
                Monitor de Calibração
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Acompanhamento de Brier Score (Erro de Projeção) e Degradação
              </p>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {calibrationSummary.map(row => {
              const op = ops[row.categoryId] || {};
              const isDegraded = op?.degraded === true;
              const avgBrier = toFiniteNumber(row.avgBrier);
              // FIX: clamp também no mínimo (Brier negativo não gera offset inválido)
              const brierPct = Math.max(0, Math.min(100, (avgBrier / BRIER_VISUAL_MAX) * 100));
              const radius = 14;
              const circ = 2 * Math.PI * radius;
              const offset = circ - (brierPct / 100) * circ;
              // FIX: NaN não cai mais direto no verde
              const colorClass = !Number.isFinite(avgBrier)
                ? 'text-slate-500'
                : avgBrier >= 0.25
                  ? 'text-rose-500'
                  : (avgBrier > 0.18 ? 'text-amber-500' : 'text-emerald-500');
              return (
                <div
                  key={row.categoryId}
                  className="group/card relative rounded-2xl border border-white/[0.05] bg-slate-900/50 p-4 sm:p-5 hover:bg-slate-800/60 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex flex-col min-w-0 flex-1">
                      <p className="text-sm sm:text-[15px] text-white font-black tracking-tight truncate mb-1.5">
                        {displaySubject(row.label)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner ${isDegraded ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isDegraded ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse shadow-[0_0_8px_currentColor]`} />
                          {isDegraded ? 'Degradado' : 'Estável'}
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 font-bold bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md">
                          n={row.count}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 relative w-12 h-12 flex items-center justify-center">
                      <svg
                        className="w-full h-full -rotate-90 transform drop-shadow-md"
                        viewBox="0 0 36 36"
                        role="img"
                        aria-label={`Brier Score: ${avgBrier.toFixed(2)} de ${BRIER_VISUAL_MAX} máximo`}
                      >
                        <circle cx="18" cy="18" r={radius} fill="none" className="stroke-black/40" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r={radius} fill="none"
                          className={`stroke-current ${colorClass} transition-all duration-1000 ease-out`}
                          strokeWidth="3"
                          strokeDasharray={circ}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-[10px] font-black font-mono tracking-tighter ${colorClass}`}>
                          {avgBrier.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] mt-auto">
                    <div className="group/tooltip relative flex items-center gap-1 cursor-help">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/tooltip:text-slate-300 transition-colors border-b border-dashed border-slate-600">
                        Desvio (Brier)
                      </span>
                      <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-[#0a0c14] text-[10px] font-medium text-slate-300 rounded-lg shadow-2xl border border-white/10 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                        <strong className="text-white font-black block mb-1">Score de Brier</strong>
                        Mede a precisão das projeções Monte Carlo. Quanto menor (verde), mais assertivo o motor.
                      </div>
                    </div>
                    {(() => {
                      const pen = toFiniteNumber(row.avgPenalty);
                      // FIX: limite 0.005 elimina o "-0%" (Math.round(0.1) === 0)
                      if (pen < 0.005) return null;
                      return (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10">
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                            Pena: <span className="font-mono">-{Math.round(pen * 100)}%</span>
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center justify-center py-12 text-center space-y-2 bg-slate-900/20 border border-white/5 rounded-3xl">
          <ShieldCheck size={32} className="text-slate-700/50 mb-3" />
          <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">
            Amostra técnica insuficiente
          </p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight max-w-[250px] mx-auto leading-tight">
            Requer <span className="text-indigo-400">3 simulados por matéria</span> para calibrar a inteligência do motor.
          </p>
        </div>
      )}

      <div className="p-2 border-t border-white/5 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em] flex items-center gap-2">
            <List size={14} className="text-indigo-400/80" />
            Log de Auditoria
          </h3>
          <div className="flex gap-2 bg-slate-900/50 border border-white/5 rounded-xl p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Tudo
            </button>
            <button
              onClick={() => setFilter('degraded')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'degraded' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Degradados
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/10">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[120px]">Data</th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[140px]">Categoria</th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">Brier (erro)</th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">ECE (calib.)</th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[110px]">Ajuste</th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">Prob Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, idx) => (
                  <tr
                    key={`${toFiniteNumber(log?.timestamp, idx)}-${log?.categoryName || 'cat'}-${idx}`}
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4 text-[10px] text-slate-500 font-mono whitespace-nowrap">
                      {toFiniteNumber(log?.timestamp) > 0 ? formatDateTimePtBR(log.timestamp) : '-'}
                    </td>
                    <td className="py-3 px-4 text-[10px] text-white font-bold whitespace-nowrap">
                      {displaySubject(log.categoryName)}
                    </td>
                  <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap ${Number(log?.avgBrier || 0) > 0.25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {toFiniteNumber(log?.avgBrier, null) !== null ? Number(log?.avgBrier).toFixed(3) : '-'}
                  </td>
                  <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap ${Number(log?.ece || 0) > 0.12 ? 'text-amber-400' : 'text-cyan-300'}`}>
                    {toFiniteNumber(log?.ece, null) !== null ? Number(log?.ece).toFixed(3) : '-'}
                  </td>
                  <td className="py-3 px-4 text-[10px] text-amber-400 font-bold whitespace-nowrap">
                    {toFiniteNumber(log?.calibrationPenalty) > 0.001
                      ? `-${Math.round(toFiniteNumber(log.calibrationPenalty) * 100)}% (shrink)` : '-'}
                  </td>
                  <td className="py-3 px-4 text-[10px] text-white font-black whitespace-nowrap">
                    {toPercentLabel(log?.probability)}
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 px-4">
                      <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">
                        Nenhum evento registrado
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight max-w-[340px] mx-auto leading-tight">
                        Os diagnósticos surgirão automaticamente após atingir a maturidade de dados (n=3).
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-2 border-t border-white/5 pt-8">
        <div className="flex items-center justify-between mb-5 gap-3">
          <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em]">
            Confiabilidade (ECE)
          </h3>
          <span className="text-[10px] font-black text-cyan-300 shrink-0">
            {avgEce !== null ? `ECE médio: ${avgEce.toFixed(3)}` : 'Sem ECE'}
          </span>
        </div>
        {latestWithReliability ? (
          <ReliabilityCurveChart buckets={latestWithReliability.reliability} />
        ) : (
          <div className="w-full flex items-center justify-center py-12 bg-slate-900/20 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
              Sem buckets de confiabilidade ainda
            </p>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-white/5 pt-8">
        <div className="flex items-center justify-between mb-5 gap-3">
          <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em]">
            Drift Temporal (Brier/ECE)
          </h3>
          {categoryNames.length > 1 ? (
            <select
              value={effectiveCategory}
              onChange={(e) => setSeriesCategory(e.target.value)}
              className="text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2 outline-none cursor-pointer hover:bg-slate-800 transition-all backdrop-blur-md"
            >
              {categoryNames.map(cat => (
                <option key={cat} value={cat}>{displaySubject(cat)}</option>
              ))}
            </select>
          ) : (
            <span className="text-[10px] text-slate-400 font-bold">
              {effectiveCategory ? displaySubject(effectiveCategory) : 'Sem categoria'}
            </span>
          )}
        </div>

        {temporalSeries.length > 1 ? (
          <div className="space-y-2">
            {temporalSeries.map((point, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>{point.ts > 0 ? formatDatePtBR(point.ts) : '-'}</span>
                  <span>
                    Brier {Number.isFinite(point?.brier) ? point.brier.toFixed(3) : '-'} · ECE {Number.isFinite(point?.ece) ? point.ece.toFixed(3) : '-'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                    {Number.isFinite(point.brier) ? (
                      <div className="h-full bg-rose-400/80" style={{ width: toBarWidth(point.brier) }} />
                    ) : null}
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                    {Number.isFinite(point.ece) ? (
                      <div className="h-full bg-cyan-400/80" style={{ width: toBarWidth(point.ece) }} />
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full flex items-center justify-center py-12 bg-slate-900/20 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
              Dados temporais insuficientes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
</file>

<file path="src/utils/coachLogic.js">
// ==================== CONSTANTES ====================
import { calculateMSSD, calculateSlope, getSortedHistory } from '../engine/projection.js';
import { useAppStore } from '../store/useAppStore.js';
import { computeForgettingRisk } from '../engine/diagnostics.js';
import { getSafeScore, getSyntheticTotal, formatValue, formatPercent } from './scoreHelper.js';
import { safeDateParse as _safeDateParse, normalizeDate, getDateKey } from './dateHelper.js';
import { normalize, isSubjectMatch } from './normalization.js';
import { computeRollingCalibrationParams } from './calibration.js';
import {
    deriveAdaptiveRiskThresholds,
    computeContinuousMcBoost,
    deriveBacktestWeights,
    deriveCoachAdaptiveParams,
    runCoachMonteCarlo,
    clearMcCache,
    simuladosToHistory
} from './coachAdaptive.js';
import { computeAdaptiveCoachWeight } from './adaptiveMath.js';
import { kahanSum } from '../engine/math/kahan.js';
import { computeAgilityMetrics } from '../engine/stats.js';
import { safeArray, getCalibrationKey } from './coachSafe.js';

export {
    deriveAdaptiveRiskThresholds,
    computeContinuousMcBoost,
    deriveBacktestWeights,
    clearMcCache,
    runCoachMonteCarlo
};

// LRU Cache for urgency calculations
export const _urgencyCache = new Map();
export const clearUrgencyCache = () => _urgencyCache.clear();

export const _topicsCache = new Map();
export const clearTopicsCache = () => _topicsCache.clear();

const sanitizeMinutes = (mins) => Math.min(720, Math.max(0, Number(mins) || 0));

const clamp = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
};

const simpleHash = (str) => {
    let h = 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h).toString(36);
};

export const DEFAULT_CONFIG = {
    SCORE_MAX: 45,
    RECENCY_MAX: 28,
    INSTABILITY_MAX: 22,
    PRIORITY_BOOST: 18,
    EFFICIENCY_MAX: 10,
    SRS_BOOST: 16,
    BASE_HOURS_THRESHOLD: 5,

    // Normalização
    NORMALIZATION_CEILING: 170,
    CRITICAL_THRESHOLD: 122,

    // Monte Carlo
    MC_SIMULATIONS: 800,
    MC_MIN_DATA_POINTS: 3,
    MC_PROB_DANGER: 30,
    MC_PROB_SAFE: 90,
    MC_VOLATILITY_HIGH: 8,
    INSTABILITY_MSSD_DIVISOR: 12,

    MC_BACKTEST_HORIZON: 3,
    MC_BACKTEST_HORIZON_MAX: 6,
    MC_CALIBRATION_BRIER_BASELINE: 0.18,
    MC_CALIBRATION_MAX_PENALTY: 0.25,
    MC_CALIBRATION_NEUTRAL_PCT: 50,
    MC_CALIBRATION_MAX_APPLIED_PENALTY: 0.35,
    MC_ENABLE_ADAPTIVE_CALIBRATION: true,
    MC_CALIB_WINDOW_DAYS: 60,
    MC_CALIB_MIN_SAMPLES: 4,
    MC_CALIB_MAX_SAMPLES: 20,
    MC_ECE_BINS_MIN: 4,
    MC_ECE_BINS_MID: 6,
    MC_ECE_BINS_MAX: 8,
    MC_LOW_SAMPLE_THRESHOLD: 10,

    MC_BOOST_DANGER_BASE: 10,
    MC_BOOST_DANGER_RANGE: 12,
    MC_BOOST_MODERATE_BASE: 10,
    MC_BOOST_SAFE_PENALTY: -6,
    MC_MODERATE_MIDPOINT: 55,
};

function getDynamicTrendThreshold(currentScore, maxScore) {
    const safeMax = maxScore > 0 ? maxScore : 100;
    const currentPct = currentScore / safeMax;
    const damping = Math.max(0, 1 - currentPct);
    const baseRequirement = 0.05;
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002;
    return dynamicPct * maxScore;
}

// ==================== FUNÇÕES AUXILIARES ====================
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getDaysDiff = (newer, older) => {
    const d1 = normalizeDate(newer) || new Date(0);
    const d2 = normalizeDate(older) || new Date(0);
    return Math.max(0, Math.round((d1.getTime() - d2.getTime()) / MS_PER_DAY));
};

/**
 * Crunch multiplier corrigido:
 * - monotônico com os dias restantes
 * - menos distorção para veteranos
 * - curva logística mais justa e explicável
 */
export function getCrunchMultiplier(daysToExam, firstActivityDate = null, now = null) {
    if (daysToExam === null || daysToExam === undefined || Number.isNaN(daysToExam)) return 1.0;
    if (daysToExam < 0) return 1.0;
    if (daysToExam === 0) return 2.0;

    let criticalHorizon = 21;
    let timeDivisor = 7;

    const safeFirstActivity = normalizeDate(firstActivityDate);
    if (safeFirstActivity && !isNaN(safeFirstActivity.getTime())) {
        const referenceDate = now ? (normalizeDate(now) || new Date()) : new Date();
        const refTime = referenceDate.getTime();
        const firstTime = safeFirstActivity.getTime();

        if (!Number.isFinite(refTime) || !Number.isFinite(firstTime)) return 1.0;

        const journeyDays = Math.max(0, refTime - firstTime) / 86400000;
        const totalJourneyDays = Math.max(1, journeyDays) + Math.max(0, daysToExam);

        criticalHorizon = Math.max(14, Math.min(35, totalJourneyDays * 0.08));
        timeDivisor = Math.max(7, Math.min(60, totalJourneyDays * 0.15));
    }

    const urgency = 1.0 + (1.0 / (1.0 + Math.exp((daysToExam - criticalHorizon) / timeDivisor)));
    return Number(Math.min(2.0, urgency).toFixed(4));
}

function _getSRSBoost(history, daysSince, maxScore, cfg, mssdVolatility = null, effectiveN = null) {
    const forgettingData = computeForgettingRisk(
        history,
        maxScore,
        null,
        mssdVolatility,
        effectiveN,
        daysSince
    );

    const retention = forgettingData.retentionPct;

    if (retention < 30) return { boost: cfg.SRS_BOOST * 2.0, label: "⚠️ Memória Crítica (Risco de Branco)" };
    if (retention < 55) return { boost: cfg.SRS_BOOST * 1.4, label: "🧠 Revisão Necessária (Curva de Esquecimento)" };
    if (retention < 75) return { boost: cfg.SRS_BOOST * 0.8, label: "🔄 Revisão de Reforço" };

    return { boost: 0, label: null };
}

/**
 * Proficiência bayesiana corrigida:
 * - tópico nunca testado não herda automaticamente a média global
 * - reduz o Efeito Halo
 */
export const computeBayesianProficiency = (acertos, total, mediaGlobal = 0.5, globalTotal = 0) => {
    const rawAcertos = Number(acertos) || 0;
    const rawTotal = Number(total) || 0;
    const safeMedia = Number.isFinite(mediaGlobal) ? mediaGlobal : 0.5;

    const K = Math.max(3, Math.min(15, Math.log10(Math.max(0, globalTotal) + 1) * 3));

    const untestedPrior = 0.25;
    const dataTrust = Math.min(1, rawTotal / K);

    const prior = rawTotal === 0
        ? untestedPrior
        : (untestedPrior * (1 - dataTrust)) + (safeMedia * dataTrust);

    const smoothedAcertos = rawAcertos + (prior * K);
    const smoothedTotal = rawTotal + K;

    const proficiency = smoothedTotal > 0 ? smoothedAcertos / smoothedTotal : untestedPrior;
    return clamp(proficiency, 0, 1);
};

export function computeRobustVolatilityForCoach(history = [], maxScore = 100) {
    const n = history.length;
    const fallbackVol = 0.08 * maxScore;

    if (n < 2) return fallbackVol;

    const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
    const validScores = safeHistory
        .map(h => getSafeScore(h, maxScore))
        .filter(s => Number.isFinite(s));

    const validN = validScores.length;
    if (validN < 2) return fallbackVol;

    const mean = kahanSum(validScores) / validN;
    const devs = validScores.map(val => Math.pow(val - mean, 2));
    const variance = kahanSum(devs) / (validN - 1);
    const empiricalVol = Math.sqrt(Math.max(0, variance));

    const shrinkFactor = validN / (validN + 4);
    return empiricalVol * shrinkFactor + fallbackVol * (1 - shrinkFactor);
}

export const sanitizeNum = (val) => {
    if (val === null || val === undefined || val === '') return NaN;

    let str = String(val).trim();
    str = str.replace(/[%\s]/g, '');

    if (!str) return NaN;

    const hasComma = str.includes(',');
    const hasDot = str.includes('.');

    if (hasComma && hasDot) {
        const lastComma = str.lastIndexOf(',');
        const lastDot = str.lastIndexOf('.');

        if (lastComma > lastDot) {
            // BR: 1.234,56
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // US: 1,234.56
            str = str.replace(/,/g, '');
        }
    } else if (hasComma) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
        str = str.replace(/\./g, '');
    }

    const n = Number(str);
    return Number.isFinite(n) ? n : NaN;
};

export const getCoachPriorities = (topicsData) => {
    if (!Array.isArray(topicsData)) return [];

    const globalCorrect = topicsData.reduce((acc, t) => {
        const parsedAcertos = sanitizeNum(t.acertos);
        const parsedCorrect = sanitizeNum(t.correct);
        const c = Number.isFinite(parsedAcertos)
            ? parsedAcertos
            : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
        return acc + c;
    }, 0);

    const globalTotal = topicsData.reduce((acc, t) => {
        const parsedTotal = sanitizeNum(t.total);
        const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;
        return acc + tot;
    }, 0);

    const mediaGlobal = globalTotal > 0 ? globalCorrect / globalTotal : 0.5;

    return topicsData.map(topic => {
        const parsedAcertos = sanitizeNum(topic.acertos);
        const parsedCorrect = sanitizeNum(topic.correct);
        const parsedTotal = sanitizeNum(topic.total);

        const c = Number.isFinite(parsedAcertos)
            ? parsedAcertos
            : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);

        const tot = Number.isFinite(parsedTotal) ? parsedTotal : 0;

        let realProficiency = computeBayesianProficiency(c, tot, mediaGlobal, globalTotal);
        realProficiency = Number.isFinite(realProficiency) ? clamp(realProficiency, 0, 1) : 0;

        return {
            ...topic,
            realProficiency
        };
    })
    .sort((a, b) => {
        const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1;
        const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
        return valA - valB;
    });
};

// ==================== FUNÇÃO PRINCIPAL ====================
export const extractMetrics = (category, simulados = [], studyLogs = [], options = {}) => {
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };

    const safeCategory = category || {};
    const categoryId = safeCategory.id;

    const calibrationHistory = options.calibrationHistoryByCategory?.[getCalibrationKey(categoryId)] || [];
    const rollingCalibration = computeRollingCalibrationParams(calibrationHistory, {
        baseline: cfg.MC_CALIBRATION_BRIER_BASELINE,
        maxPenalty: cfg.MC_CALIBRATION_MAX_PENALTY,
        windowDays: cfg.MC_CALIB_WINDOW_DAYS,
        minSamples: cfg.MC_CALIB_MIN_SAMPLES,
        maxSamples: cfg.MC_CALIB_MAX_SAMPLES
    });

    const referenceDate = options.now ? (normalizeDate(options.now) || new Date()) : new Date();
    const referenceNow = referenceDate.getTime();

    const rawMaxScore = Number(options.maxScore ?? 100);
    const maxScore = Number.isFinite(rawMaxScore) && rawMaxScore > 0 ? rawMaxScore : 100;

    const rawMinScore = Number(options.minScore ?? 0);
    const minScore = Number.isFinite(rawMinScore) ? Math.min(rawMinScore, maxScore) : 0;

    const rawTargetScore = Number(options.targetScore ?? (maxScore * 0.8));
    const fallbackTarget = maxScore * 0.8;
    const unclampedTarget = Number.isFinite(rawTargetScore) ? rawTargetScore : fallbackTarget;
    const targetScore = Math.min(maxScore, Math.max(minScore, unclampedTarget));

    const targetScoreLabel = options.targetScoreLabel ?? Math.round((targetScore / maxScore) * 100);

    let rawWeightVal = safeCategory.weight;
    if (typeof rawWeightVal === 'string') {
        rawWeightVal = rawWeightVal.replace(/\./g, '').replace(',', '.');
    }

    const parsedWeight = Number(rawWeightVal);
    const rawWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 5;
    const boundedWeight = Math.min(10, Math.max(1, rawWeight));
    const weight = boundedWeight * 20;
    const weightLabel = boundedWeight <= 3 ? '1 — Baixa' : boundedWeight <= 7 ? '2 — Média' : '3 — Alta';

    let daysToExam = null;
    if (options && options.user && options.user.goalDate) {
        try {
            const examDate = normalizeDate(options.user.goalDate);
            if (examDate && !isNaN(examDate.getTime())) {
                const today = normalizeDate(referenceDate) || referenceDate;
                daysToExam = Math.round((examDate.getTime() - today.getTime()) / MS_PER_DAY);
            }
        } catch {
            console.warn("[CoachLogic] Invalid goalDate:", options.user.goalDate);
        }
    }

    const safeSimulados = Array.isArray(simulados) ? [...simulados] : Object.values(simulados || {});
    const safeStudyLogs = Array.isArray(studyLogs) ? [...studyLogs] : Object.values(studyLogs || {});

    const relevantAll = safeSimulados
        .filter(s => s && isSubjectMatch(s.subject || "", safeCategory?.name || ""))
        .sort((a, b) => {
            const timeA = (normalizeDate(a.date || a.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b.date || b.createdAt) || new Date(0)).getTime();
            return timeB - timeA;
        });

    const rootActivityDate = (relevantAll.length > 0
        ? normalizeDate(relevantAll[relevantAll.length - 1].date || relevantAll[relevantAll.length - 1].createdAt)
        : null) || normalizeDate(referenceDate) || referenceDate;

    const relevantSimulados = relevantAll.length > 50 ? relevantAll.slice(0, 50) : relevantAll;
    const simuladosWithMaxScore = relevantSimulados;

    // Global baseline antes da média inicial, para âncora mais justa em categorias sem dados
    let globalBaselinePct = 50;
    const validCatNorms = new Set((options.allCategories || []).map(c => normalize(c?.name || "")));
    const allSimsForBaseline = validCatNorms.size > 0
        ? safeSimulados.filter(s => s && validCatNorms.has(normalize(s.subject || "")))
        : safeSimulados;

    const validGlobalSims = allSimsForBaseline
        .map(s => getSafeScore(s, maxScore))
        .filter(s => Number.isFinite(s));

    if (validGlobalSims.length > 0) {
        const totalPoints = kahanSum(validGlobalSims);
        globalBaselinePct = (totalPoints / (validGlobalSims.length * maxScore)) * 100;
    }

    let averageScore = 0;

    if (relevantSimulados.length > 0) {
        const coachAdaptive = deriveCoachAdaptiveParams(simuladosToHistory(relevantSimulados, maxScore), maxScore, cfg);

        const today = normalizeDate(referenceDate) || referenceDate;
        const K = coachAdaptive.decayK;
        const PESO_MIN = coachAdaptive.minWeight;
        const DELTA = coachAdaptive.scoreClampDelta;

        const calculateExponentialScore = (dataset) => {
            let weightedSum = 0;
            let totalWeight = 0;

            dataset.forEach(s => {
                const sScore = getSafeScore(s, maxScore);
                if (!Number.isFinite(sScore)) return;

                const simDate = normalizeDate(s.date || s.createdAt) || new Date(0);
                const days = getDaysDiff(today, simDate);

                let timeWeight = Math.exp(-K * days);
                if (timeWeight < PESO_MIN) timeWeight = PESO_MIN;

                const rawTotal = Math.max(1, Number(s.total) || getSyntheticTotal(maxScore));
                const volumeWeight = Math.sqrt(Math.min(rawTotal, maxScore * 2));
                const peso = timeWeight * volumeWeight;

                weightedSum += sScore * peso;
                totalWeight += peso;
            });

            return totalWeight > 0 ? weightedSum / totalWeight : (maxScore / 2);
        };

        const mostRecentSimDate = relevantSimulados.length > 0
            ? (normalizeDate(relevantSimulados[0].date || relevantSimulados[0].createdAt) || new Date(0)).getTime()
            : referenceNow;

        const SESSION_GAP_MS = 60 * 60 * 1000;

        let pastSimulados = relevantSimulados.filter(s => {
            const sTime = (normalizeDate(s.date || s.createdAt) || new Date(0)).getTime();
            return sTime < (mostRecentSimDate - SESSION_GAP_MS);
        });

        if (pastSimulados.length === 0 && relevantSimulados.length > 1) {
            pastSimulados = relevantSimulados.slice(1);
        }

        const notaBruta = calculateExponentialScore(relevantSimulados);

        if (pastSimulados.length > 0) {
            const notaAnterior = calculateExponentialScore(pastSimulados);
            const diff = notaBruta - notaAnterior;

            let clampedDiff = diff;
            if (diff > DELTA) clampedDiff = DELTA;
            else if (diff < -DELTA) clampedDiff = -DELTA;

            const hoursSinceLastSim = (referenceNow - mostRecentSimDate) / (1000 * 60 * 60);

            if (hoursSinceLastSim < 24) {
                averageScore = notaAnterior + clampedDiff;
            } else {
                averageScore = notaBruta;
            }
        } else {
            averageScore = notaBruta;
        }
    } else {
        const domain = Math.max(1e-6, maxScore - minScore);

        const globalAnchor = Number.isFinite(options.globalMcStats?.currentMean)
            ? options.globalMcStats.currentMean
            : (globalBaselinePct !== 50
                ? (globalBaselinePct / 100) * maxScore
                : minScore + 0.5 * domain);

        averageScore = clamp(globalAnchor, minScore, maxScore);
    }

    let daysSinceLastStudy = 0;
    let recencyUnknown = true;
    let lastDate = normalizeDate(new Date(0)) || new Date(0);

    if (simuladosWithMaxScore.length > 0) {
        const simDate = normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt) || new Date(0);
        if (simDate > lastDate) lastDate = simDate;
    }

    const categoryStudyLogs = safeStudyLogs.filter(log =>
        categoryId && log?.categoryId === categoryId &&
        (normalizeDate(log.date) || new Date(0)).getTime() > 0
    );

    const MIN_MINUTES_VALID_STUDY = 15;
    const validStudyLogs = categoryStudyLogs.filter(log => sanitizeMinutes(log.minutes) >= MIN_MINUTES_VALID_STUDY);

    if (validStudyLogs.length > 0) {
        const sortedLogs = [...validStudyLogs].sort((a, b) =>
            (normalizeDate(b.date) || new Date(0)).getTime() - (normalizeDate(a.date) || new Date(0)).getTime()
        );

        const logDate = normalizeDate(sortedLogs[0].date) || new Date(0);
        if (logDate > lastDate) lastDate = logDate;
    }

    if (lastDate.getTime() > 0) {
        const today = normalizeDate(referenceDate) || referenceDate;
        daysSinceLastStudy = getDaysDiff(today, lastDate);
        recencyUnknown = false;
    }

    const trendHistory = [...simuladosWithMaxScore]
        .map(s => ({
            score: getSafeScore(s, maxScore),
            date: s.date || s.createdAt
        }))
        .filter(t => Number.isFinite(t.score))
        .sort((a, b) => {
            const timeA = (normalizeDate(a.date) || new Date(0)).getTime();
            const timeB = (normalizeDate(b.date) || new Date(0)).getTime();
            return timeB - timeA;
        })
        .slice(0, 10)
        .reverse();

    const lastNScores = trendHistory.map(t => t.score);
    const backtestWeights = deriveBacktestWeights(lastNScores, maxScore);

    const rawTrend = calculateSlope(trendHistory, maxScore) * 30;
    const limiteSuperior = maxScore - averageScore;
    const limiteInferior = -averageScore;
    const trend = Math.max(limiteInferior, Math.min(limiteSuperior, rawTrend));

    const mcHistory = simuladosToHistory(simuladosWithMaxScore.slice(0, 10), maxScore);

    const mssdVolatility = mcHistory.length >= 3
        ? calculateMSSD(mcHistory, maxScore)
        : computeRobustVolatilityForCoach(mcHistory, maxScore);

    const mcAdaptive = {
        ...deriveCoachAdaptiveParams(mcHistory, maxScore, cfg),
        calibrationBaseline: rollingCalibration.baseline,
        calibrationMaxPenalty: rollingCalibration.maxPenalty
    };

    const adaptiveSimCount = lastNScores.length <= 5
        ? Math.max(cfg.MC_SIMULATIONS, 1200)
        : cfg.MC_SIMULATIONS;

    const DISTANCE_THRESHOLD = 0.15 * maxScore;

    let effectiveMCTarget = targetScore;
    let effectiveMCDays = Number.isFinite(daysToExam)
        ? Math.max(0, Math.min(daysToExam, 90))
        : 90;

    if (targetScore - averageScore > DISTANCE_THRESHOLD) {
        effectiveMCTarget = averageScore + Math.max(mssdVolatility, maxScore * 0.05) + (maxScore * 0.02);
        effectiveMCTarget = Math.min(effectiveMCTarget, targetScore);

        if (Number.isFinite(daysToExam)) {
            const totalGap = Math.max(1, targetScore - averageScore);
            const proximalGap = effectiveMCTarget - averageScore;
            const gapRatio = clamp(proximalGap / totalGap, 0, 1);

            effectiveMCDays = daysToExam > 0
                ? Math.max(1, Math.min(daysToExam, Math.max(7, Math.floor(gapRatio * daysToExam))))
                : 0;
        } else {
            effectiveMCDays = 21;
        }
    }

    const globalProjectedMean = options.globalMcStats && Number.isFinite(options.globalMcStats.projectedMean)
        ? options.globalMcStats.projectedMean
        : null;

    if (globalProjectedMean != null && globalProjectedMean < effectiveMCTarget && globalProjectedMean > averageScore) {
        const blend = 0.25;
        effectiveMCTarget = effectiveMCTarget * (1 - blend) + globalProjectedMean * blend;
    }

    const effectiveCfg = {
        ...cfg,
        MC_SIMULATIONS: adaptiveSimCount,
        MC_CALIBRATION_NEUTRAL_PCT: globalBaselinePct
    };

    const agilityData = computeAgilityMetrics(safeCategory.simuladoStats?.history || []);
    const agilityPenalty = agilityData.agilityPenalty || 0;
    const avgSeconds = agilityData.avgSeconds || 0;

    const mcResult = runCoachMonteCarlo(
        simuladosWithMaxScore,
        effectiveMCTarget,
        effectiveCfg,
        categoryId,
        maxScore,
        mcAdaptive,
        effectiveMCDays,
        agilityPenalty
    );

    const mcProbability = mcResult?.probability ?? null;
    const mcHasData = mcResult != null;

    return {
        cfg,
        safeCategory,
        categoryId,
        rollingCalibration,
        referenceDate,
        referenceNow,
        maxScore,
        minScore,
        targetScore,
        targetScoreLabel,
        rawWeight,
        boundedWeight,
        weight,
        weightLabel,
        daysToExam,
        relevantSimulados,
        rootActivityDate,
        simuladosWithMaxScore,
        averageScore,
        daysSinceLastStudy,
        recencyUnknown,
        studyLogs: safeStudyLogs,
        categoryStudyLogs,
        validStudyLogs,
        trendHistory,
        lastNScores,
        backtestWeights,
        trend,
        mssdVolatility,
        mcAdaptive,
        effectiveMCTarget,
        effectiveMCDays,
        globalBaselinePct,
        effectiveCfg,
        mcResult,
        mcProbability,
        mcHasData,
        globalProjectedMean,
        agilityPenalty,
        avgSeconds
    };
};

export const calculateUrgencyScore = (metrics, options = {}) => {
    const {
        cfg,
        safeCategory,
        boundedWeight,
        daysToExam,
        rootActivityDate,
        simuladosWithMaxScore,
        averageScore,
        daysSinceLastStudy,
        recencyUnknown,
        studyLogs,
        categoryStudyLogs,
        validStudyLogs,
        lastNScores,
        backtestWeights,
        trend,
        mssdVolatility,
        mcProbability,
        mcHasData,
        mcResult,
        maxScore,
        globalProjectedMean
    } = metrics;

    const minScore = metrics.minScore ?? 0;
    const targetScore = metrics.targetScore ?? (maxScore * 0.8);
    const domain = Math.max(1e-6, maxScore - minScore);

    const hasData = (simuladosWithMaxScore?.length || 0) > 0 || (categoryStudyLogs?.length || 0) > 0;

    // FIX: agilidade não entra mais no forgetting risk
    const forgetting = computeForgettingRisk(
        simuladosWithMaxScore,
        maxScore,
        averageScore,
        mssdVolatility,
        backtestWeights?.effectiveN || simuladosWithMaxScore.length,
        recencyUnknown ? null : daysSinceLastStudy
    );

    const performanceDeficit = Math.max(0, targetScore - averageScore);
    const gapRange = Math.max(1e-6, targetScore - minScore);
    const gapRatio = clamp(performanceDeficit / gapRange, 0, 1);

    const memoryRisk = !hasData
        ? 8
        : (forgetting.risk === 'critical' ? 35 : forgetting.risk === 'high' ? 18 : 5);

    const volatilityRiskPct = clamp((mssdVolatility / domain) * 100, 0, 35);

    const weightMultiplier = 1 + ((boundedWeight - 5) / 5) * 0.40;

    const crunchMultiplier = getCrunchMultiplier(
        daysToExam,
        rootActivityDate,
        metrics.referenceDate
    );

    const safeTasksArray = Array.isArray(safeCategory?.tasks)
        ? safeCategory.tasks
        : Object.values(safeCategory?.tasks || {});

    const hasHighPriorityTasks = safeTasksArray.some(t => t && !t.completed && t.priority === 'high');
    const priorityBoost = hasHighPriorityTasks ? cfg.PRIORITY_BOOST : 0;

    const totalTasks = safeTasksArray.length;
    const completedTasks = safeTasksArray.filter(t => t?.completed).length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 1.0;
    const inefficiency = Math.max(0, 1 - completionRate);

    let empiricalTrust = 1.0;
    if (!hasData) {
        const globalSignal = computeAdaptiveCoachWeight(metrics.trendHistory || []);
        empiricalTrust = Math.max(0.2, globalSignal?.confidenceWeight ?? 0.2);
    }

    const inefficiencyPenaltyMultiplier = totalTasks >= 5
        ? 1 + (inefficiency * 0.15 * empiricalTrust)
        : 1.0;

    // SCORE: agora mede distância até a meta, não até 100%
    const scoreComponent = clamp(gapRatio * cfg.SCORE_MAX, 0, cfg.SCORE_MAX);

    // RECENCY: recência desconhecida não é mais máxima
    const effectiveRiskDays = recencyUnknown ? 5 : Math.min(daysSinceLastStudy, 45);
    const recencyFactor = 1 - Math.exp(-effectiveRiskDays / 8);

    const recencyRaw =
        cfg.RECENCY_MAX *
        (memoryRisk / 35) *
        recencyFactor *
        crunchMultiplier *
        (backtestWeights?.recencyWeight ?? 1) *
        inefficiencyPenaltyMultiplier;

    const recencyComponent = clamp(recencyRaw, 0, cfg.RECENCY_MAX * 1.2);

    // INSTABILITY: mais justa, baseada em % do domínio e com filtro de ruído
    const lastNCount = Math.max(2, (lastNScores || []).length || 2);
    const trendNoise = 0.75 * (mssdVolatility / Math.sqrt(lastNCount));
    const trendThreshold = Math.max(getDynamicTrendThreshold(averageScore, maxScore), trendNoise);

    let trendModifier = 1;
    if (trend > trendThreshold) {
        trendModifier = 0.55;
    } else if (trend < -trendThreshold) {
        trendModifier = 1.25;
    }

    const instabilityRaw =
        cfg.INSTABILITY_MAX *
        Math.min(1, volatilityRiskPct / 12) *
        trendModifier *
        (backtestWeights?.instabilityWeight ?? 1);

    const instabilityComponent = clamp(instabilityRaw, 0, cfg.INSTABILITY_MAX);

    // MC BOOST
    let mcUrgencyBoost = 0;
    let mcRiskLabel = null;

    const adaptiveRisk = deriveAdaptiveRiskThresholds(
        lastNScores,
        mssdVolatility,
        cfg,
        maxScore,
        mcResult?.predObsPairs || []
    );

    if (globalProjectedMean != null && globalProjectedMean > (averageScore + maxScore * 0.1)) {
        const haloBoost = Math.min(6, (globalProjectedMean - averageScore) * 0.2);
        adaptiveRisk.danger = Math.min(99, adaptiveRisk.danger + haloBoost);
        adaptiveRisk.safe = Math.min(99, adaptiveRisk.safe + haloBoost);
    }

    if (mcHasData && mcProbability !== null) {
        const continuous = computeContinuousMcBoost(
            mcProbability,
            adaptiveRisk.danger,
            adaptiveRisk.safe,
            mssdVolatility,
            maxScore,
            cfg
        );

        mcUrgencyBoost = continuous.boost;
        mcRiskLabel = continuous.riskLabel;

        const globalProbability = options.globalMcStats && Number.isFinite(options.globalMcStats.probability)
            ? options.globalMcStats.probability
            : null;

        if (globalProbability != null && globalProbability < (mcProbability * 0.8)) {
            mcUrgencyBoost += 4;
            mcRiskLabel = mcRiskLabel || 'elevated_global_risk';
        }
    }

    const mcUrgencyBoostClamped = clamp(
        mcUrgencyBoost,
        cfg.MC_BOOST_SAFE_PENALTY ?? -6,
        25
    );

    // Burnout / hours
    const totalMinutes = (categoryStudyLogs || []).reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);
    const totalHours = totalMinutes / 60;

    const sortedLogsForBurnout = [...(categoryStudyLogs || [])].sort((a, b) =>
        (normalizeDate(a.date) || new Date(0)).getTime() - (normalizeDate(b.date) || new Date(0)).getTime()
    );

    const rollingWindowMs = 28 * MS_PER_DAY;
    const nowMs = metrics.referenceNow;

    const recentBaselineLogs = sortedLogsForBurnout.filter(log =>
        (nowMs - (normalizeDate(log.date) || new Date(0)).getTime()) <= rollingWindowMs
    );

    const recentBaselineHours = recentBaselineLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0) / 60;

    const firstLogTime = sortedLogsForBurnout.length > 0
        ? (normalizeDate(sortedLogsForBurnout[0].date) || new Date(nowMs)).getTime()
        : nowMs;

    const recentSpanDays = recentBaselineLogs.length > 0
        ? Math.max(1, (nowMs - (normalizeDate(recentBaselineLogs[0].date) || new Date(nowMs)).getTime()) / MS_PER_DAY)
        : Math.max(1, (nowMs - firstLogTime) / MS_PER_DAY);

    const activeWeeks = Math.max(1, Math.min(4, recentSpanDays / 7));
    const baselineHoursPerWeek = recentBaselineLogs.length > 0 ? (recentBaselineHours / activeWeeks) : 5.0;
    const dynamicBurnoutThreshold = Math.max(15.0, baselineHoursPerWeek * 1.8);

    // Balance bridge boost
    const allCategoriesSafe = options.allCategories || [];
    const activeCount = allCategoriesSafe.length > 0 ? allCategoriesSafe.length : 1;

    const currentLambda = metrics.mcAdaptive?.decayK || 0.03;
    const dynamicWindowDays = Math.max(7, Math.min(90, Math.round((Math.LN2 / currentLambda) * 2)));

    const windowStart = (normalizeDate(metrics.referenceDate) || metrics.referenceDate).getTime() - (dynamicWindowDays * MS_PER_DAY);

    const safeGlobalLogsInput = options.studyLogs || studyLogs || [];
    const safeGlobalLogs = Array.isArray(safeGlobalLogsInput)
        ? safeGlobalLogsInput
        : Object.values(safeGlobalLogsInput || {});

    const recentAllLogs = safeGlobalLogs.filter(log =>
        (normalizeDate(log?.date) || new Date(0)).getTime() >= windowStart
    );

    const totalRecentMinutesAll = recentAllLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);

    const totalRecentMinutesCat = recentAllLogs
        .filter(log => log?.categoryId === metrics.categoryId)
        .reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0);

    const observedShare = totalRecentMinutesAll > 0
        ? totalRecentMinutesCat / totalRecentMinutesAll
        : (1 / activeCount);

    const totalSyllabusWeight = allCategoriesSafe.reduce((acc, c) => {
        if (!c) return acc;

        let rawW = c.weight;
        if (typeof rawW === 'string') rawW = rawW.replace(/\./g, '').replace(',', '.');

        const parsedW = Number(rawW);
        const w = (c.weight !== undefined && Number.isFinite(parsedW) && parsedW > 0) ? parsedW : 5;

        return acc + w;
    }, 0);

    const idealShare = totalSyllabusWeight > 0
        ? metrics.rawWeight / totalSyllabusWeight
        : (1 / activeCount);

    const tolerance = 0.05;
    const underAllocation = Math.max(0, idealShare - observedShare - tolerance);

    const balanceBridgeBoost = clamp(
        Math.min(cfg.EFFICIENCY_MAX, Math.pow(underAllocation * 10, 1.5)),
        0,
        cfg.EFFICIENCY_MAX
    );

    // SRS
    let srsBoost = 0;
    let srsLabel = null;

    if (hasData && !recencyUnknown) {
        const srsData = _getSRSBoost(
            simuladosWithMaxScore,
            daysSinceLastStudy,
            maxScore,
            cfg,
            mssdVolatility,
            backtestWeights?.effectiveN || simuladosWithMaxScore.length
        );

        srsBoost = srsData.boost;
        srsLabel = srsData.label;
    }

    const maxSrsBoost = cfg.SRS_BOOST * 2;
    const currentSrsBoost = clamp(
        srsBoost * (crunchMultiplier > 1 ? 1.10 : 1),
        0,
        maxSrsBoost
    );

    const currentPriorityBoost = clamp(
        priorityBoost * (crunchMultiplier > 1 ? 1.15 : 1),
        0,
        cfg.PRIORITY_BOOST
    );

    // Rotation penalty corrigida: menos dependente da nota e mais dependente de recência/volatilidade
    let exactLastTime = 0;

    if (simuladosWithMaxScore.length > 0) {
        exactLastTime = (normalizeDate(simuladosWithMaxScore[0].date || simuladosWithMaxScore[0].createdAt) || new Date(0)).getTime();
    }

    if (validStudyLogs.length > 0) {
        const logsOrdenados = [...validStudyLogs].sort((a, b) =>
            (normalizeDate(b.date) || new Date(0)).getTime() - (normalizeDate(a.date) || new Date(0)).getTime()
        );

        const logTime = (normalizeDate(logsOrdenados[0].date) || new Date(0)).getTime();
        if (logTime > exactLastTime) exactLastTime = logTime;
    }

    const exactHoursSinceLast = exactLastTime > 0
        ? (nowMs - exactLastTime) / (1000 * 60 * 60)
        : 48;

    let rotationPenalty = 0;
    const performanceRatio = maxScore > 0 ? averageScore / maxScore : 0;
    const fatigueRatio = 1 + performanceRatio;

    if (exactHoursSinceLast < 24) {
        const recentFatigue = Math.max(0.2, Math.exp(-exactHoursSinceLast / 12));
        rotationPenalty = Math.min(30, 15 * recentFatigue * (1 + (mssdVolatility / maxScore)) * fatigueRatio);
        
        const baseAt24 = mssdVolatility > (maxScore * 0.05) ? 6 : 2;
        rotationPenalty = Math.max(rotationPenalty, baseAt24 + 1);
    } else if (exactHoursSinceLast >= 24 && exactHoursSinceLast < 48 && !srsLabel) {
        rotationPenalty = mssdVolatility > (maxScore * 0.05) ? 6 : 2;
    }

    if (srsBoost > 0) rotationPenalty *= 0.1;

    const efficiencyBridgeBoost = 0;

    const rawScore = Math.max(
        0,
        scoreComponent +
        recencyComponent +
        instabilityComponent +
        currentPriorityBoost +
        currentSrsBoost +
        mcUrgencyBoostClamped +
        efficiencyBridgeBoost +
        balanceBridgeBoost -
        rotationPenalty
    );

    const weightedRaw = rawScore * weightMultiplier;

    const NORMALIZATION_CEILING = cfg.NORMALIZATION_CEILING || 170;
    const CRITICAL_THRESHOLD = cfg.CRITICAL_THRESHOLD || Math.round(NORMALIZATION_CEILING * 0.72);

    let normalized;

    if (weightedRaw <= 0) {
        normalized = 0;
    } else if (weightedRaw <= CRITICAL_THRESHOLD) {
        normalized = (weightedRaw / CRITICAL_THRESHOLD) * 80;
    } else {
        const excess = weightedRaw - CRITICAL_THRESHOLD;
        const excessNormalized = 20 * (1 - Math.exp(-excess / (NORMALIZATION_CEILING * 0.4)));
        normalized = 80 + excessNormalized;
    }

    normalized = Number.isFinite(normalized) ? clamp(Math.round(normalized), 0, 100) : 0;

    return {
        weightedRaw,
        normalized,
        scoreComponent,
        recencyComponent,
        instabilityComponent,
        priorityBoost: currentPriorityBoost,
        srsBoost: currentSrsBoost,
        mcUrgencyBoost: mcUrgencyBoostClamped,
        efficiencyBridgeBoost,
        balanceBridgeBoost,
        rotationPenalty,
        weightMultiplier,
        crunchMultiplier,
        forgetting,
        performanceDeficit,
        memoryRisk,
        volatilityRisk: volatilityRiskPct,
        totalPain: performanceDeficit + memoryRisk + volatilityRiskPct,
        dynamicScoreMax: cfg.SCORE_MAX,
        dynamicRecencyMax: cfg.RECENCY_MAX,
        dynamicInstabilityMax: cfg.INSTABILITY_MAX,
        completionRate,
        inefficiencyPenaltyMultiplier,
        totalHours,
        baselineHoursPerWeek,
        dynamicBurnoutThreshold,
        observedShare,
        idealShare,
        srsLabel,
        exactHoursSinceLast,
        adaptiveRisk,
        mcRiskLabel,
        hasHighPriorityTasks,
        trendThreshold
    };
};

export const generateCoachStrings = (weightedRaw, normalized, metrics, scoreInfo, options = {}) => {
    const {
        cfg,
        maxScore,
        targetScore,
        weight,
        weightLabel,
        relevantSimulados,
        averageScore,
        daysSinceLastStudy,
        categoryStudyLogs,
        trend,
        mssdVolatility,
        effectiveMCTarget,
        effectiveMCDays,
        mcResult,
        mcProbability,
        mcHasData,
        globalProjectedMean,
        agilityPenalty
    } = metrics;

    const {
        scoreComponent,
        recencyComponent,
        instabilityComponent,
        priorityBoost,
        srsBoost,
        mcUrgencyBoost,
        efficiencyBridgeBoost,
        balanceBridgeBoost,
        rotationPenalty,
        weightMultiplier,
        crunchMultiplier,
        totalHours,
        baselineHoursPerWeek,
        dynamicBurnoutThreshold,
        srsLabel,
        adaptiveRisk,
        mcRiskLabel,
        hasHighPriorityTasks,
        completionRate,
        trendThreshold: scoreInfoTrendThreshold
    } = scoreInfo;

    let recommendation = "";

    const oneWeekAgo = (normalizeDate(metrics.referenceDate) || metrics.referenceDate).getTime() - (7 * 24 * 60 * 60 * 1000);

    const recentLogs = categoryStudyLogs.filter(log => {
        const d = normalizeDate(log.date) || new Date(0);
        return d && d.getTime() >= oneWeekAgo;
    });

    const recentHours = recentLogs.reduce((acc, log) => acc + sanitizeMinutes(log.minutes), 0) / 60;

    // FIX: contar dias reais, não timestamps únicos
    const recentStudyDays = new Set(
        recentLogs.map(log => getDateKey(log.date)).filter(Boolean)
    ).size;

    const isHighVolume = recentHours > dynamicBurnoutThreshold;
    const isHighFrequency = recentStudyDays >= 5;
    const isEliteMaintenance = averageScore >= (maxScore * 0.95);

    const trendThreshold = Number.isFinite(scoreInfoTrendThreshold)
        ? scoreInfoTrendThreshold
        : getDynamicTrendThreshold(averageScore, maxScore);

    const lastNScores = metrics.lastNScores;
    const isStagnant = !isEliteMaintenance && trend <= trendThreshold && lastNScores.length >= 2;

    const burnoutMsg = isHighVolume && isStagnant
        ? `Você estudou ${recentHours.toFixed(1)}h esta semana (seu normal é ~${baselineHoursPerWeek.toFixed(1)}h), mas a nota estagnou.`
        : '';

    const isBurnoutRisk = (isHighVolume || (isHighFrequency && recentHours > 5.0)) && isStagnant && recentStudyDays >= 3;

    // Ordem corrigida: crítico > burnout > SRS > cruzeiro seguro
    if (mcHasData && mcRiskLabel === 'critical') {
        const burnoutNote = isBurnoutRisk ? ` (⚠️ ${burnoutMsg || 'Sinais de estafa — mude o método.'})` : '';
        const targetInfo = effectiveMCTarget < targetScore ? ` (Meta ZDP: ${formatValue(effectiveMCTarget)})` : '';
        const globalNote = globalProjectedMean != null ? ` [Global: ${formatPercent(globalProjectedMean)}]` : '';

        recommendation = `🎯 Projeção Crítica: ${Math.round(mcProbability)}% de chance. Risco Crítico.${targetInfo}${globalNote}${burnoutNote}`;
    } else if (isBurnoutRisk) {
        recommendation = `🛑 Risco de Estafa: ${burnoutMsg || 'Você estudou muito mas a nota não reagiu.'} Considere descansar.`;
    } else if (srsBoost > 0) {
        recommendation = `${srsLabel} - Não pule essa revisão!`;
    } else if (mcHasData && mcRiskLabel === 'safe') {
        recommendation = `🏆 Cruzeiro Seguro (${formatPercent(mcProbability)} nas projeções). Modo de manutenção ativado.`;
    } else if (mssdVolatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && trend > 0) {
        recommendation = "Desempenho Oscilante: Foque em preencher lacunas de base";
    } else if (trend < -trendThreshold) {
        recommendation = `Nota caindo (${formatValue(trend)} pts) - Atenção urgente`;
    } else if (averageScore < targetScore - (0.2 * maxScore)) {
        recommendation = `Nota Crítica: ${formatPercent((averageScore / maxScore) * 100)} (Meta ${formatPercent((targetScore / maxScore) * 100)})`;
    } else if (averageScore >= targetScore) {
        recommendation = "No caminho certo! Continue consolidando";
    } else {
        recommendation = "Pratique com regularidade";
    }

    const hasData = relevantSimulados.length > 0 || categoryStudyLogs.length > 0;

    const result = {
        score: weightedRaw,
        normalizedScore: normalized,
        recommendation,
        details: {
            averageScore: Number(averageScore.toFixed(2)),
            globalProjectedMean: globalProjectedMean != null ? Number(globalProjectedMean.toFixed(1)) : null,
            daysSinceLastStudy,
            standardDeviation: Number(mssdVolatility.toFixed(2)),
            mssdVolatility: Number(mssdVolatility.toFixed(2)),
            trend: Number(trend.toFixed(2)),
            totalHours: Number(totalHours.toFixed(2)),
            hasData,
            hasSimulados: relevantSimulados.length > 0,
            hasHighPriorityTasks,
            completionRate: Number((completionRate * 100).toFixed(1)),
            efficiencyBridgeBoost: Number(efficiencyBridgeBoost.toFixed(2)),
            balanceBridgeBoost: Number(balanceBridgeBoost.toFixed(2)),
            weight,
            srsLabel,
            isBurnoutRisk,
            crunchMultiplier: Number(crunchMultiplier.toFixed(2)),
            agilityPenalty: agilityPenalty !== undefined ? Number(agilityPenalty.toFixed(4)) : 0,
            avgSeconds: metrics.avgSeconds || 0,
            monteCarlo: mcHasData ? {
                probability: Number(mcProbability.toFixed(2)),
                probabilityRaw: mcProbability,
                thresholds: {
                    danger: Number(adaptiveRisk.danger.toFixed(2)),
                    safe: Number(adaptiveRisk.safe.toFixed(2))
                },
                riskLabel: mcRiskLabel,
                volatility: Number(mcResult.volatility.toFixed(2)),
                meanProjected: Number(mcResult.mean.toFixed(2)),
                effectiveMCTarget: Number(effectiveMCTarget.toFixed(2)),
                effectiveMCDays: Number(effectiveMCDays),
                globalProjectedMean: globalProjectedMean != null ? Number(globalProjectedMean.toFixed(1)) : null,
                diagnostics: mcResult?.diagnostics || null,
                ci95Low: Number(mcResult.ci95Low.toFixed(2)),
                ci95High: Number(mcResult.ci95High.toFixed(2)),
                urgencyBoost: Number(mcUrgencyBoost.toFixed(2)),
                calibrationPenalty: Number((mcResult.calibrationPenalty || 0).toFixed(4)),
                avgBrier: Number((mcResult.avgBrier || 0).toFixed(4)),
                ece: Number((mcResult.ece || 0).toFixed(4)),
                reliability: Array.isArray(mcResult.reliability) ? mcResult.reliability : [],
                explainability: {
                    confidenceAdjusted: (mcResult.calibrationPenalty || 0) > 0,
                    confidenceAdjustmentPct: Number(((mcResult.calibrationPenalty || 0) * 100).toFixed(2)),
                    calibrationQuality: (mcResult.avgBrier || 0) <= cfg.MC_CALIBRATION_BRIER_BASELINE
                        ? 'good'
                        : (mcResult.avgBrier || 0) <= (cfg.MC_CALIBRATION_BRIER_BASELINE + 0.07) ? 'moderate' : 'low',
                    note: (mcResult.calibrationPenalty || 0) > 0
                        ? 'Probabilidade ajustada para reduzir overconfidence após backtest interno.'
                        : 'Sem ajuste de calibração significativo.'
                }
            } : null,
            backtest: {
                rankQuality: Number(metrics.backtestWeights.rankQuality.toFixed(4)),
                uplift: Number(metrics.backtestWeights.uplift.toFixed(4)),
                scoreWeight: Number(metrics.backtestWeights.scoreWeight.toFixed(3)),
                recencyWeight: Number(metrics.backtestWeights.recencyWeight.toFixed(3)),
                instabilityWeight: Number(metrics.backtestWeights.instabilityWeight.toFixed(3))
            },
            humanReadable: {
                "Média": formatPercent((averageScore / maxScore) * 100),
                "Recência": daysSinceLastStudy === 0 ? "Hoje" : `${daysSinceLastStudy} dias`,
                "Tendência": trend > 0.5 ? `↑ +${formatValue(trend)}` : trend < -0.5 ? `↓ ${formatValue(trend)}` : "→ Estável",
                "Instabilidade": `±${formatValue(mssdVolatility)} pts`,
                "Probabilidade (MC)": mcHasData ? formatPercent(mcProbability) : "Dados insuf.",
                "Contexto Global MC": globalProjectedMean != null ? formatPercent(globalProjectedMean) : null,
                "Peso da Matéria": weightLabel,
                "Status": srsLabel || (normalized > 70 ? "🔥 Urgente" : normalized > 50 ? "⚡ Médio" : "✓ Estável")
            },
            components: {
                scoreComponent: Number((scoreComponent * weightMultiplier).toFixed(2)),
                recencyComponent: Number((recencyComponent * weightMultiplier).toFixed(2)),
                instabilityComponent: Number((instabilityComponent * weightMultiplier).toFixed(2)),
                priorityBoost: Number((priorityBoost * weightMultiplier).toFixed(2)),
                srsBoost: Number((srsBoost * weightMultiplier).toFixed(2)),
                rotationPenalty: Number((rotationPenalty * weightMultiplier).toFixed(2)),
                mcUrgencyBoost: Number((mcUrgencyBoost * weightMultiplier).toFixed(2)),
                efficiencyBridgeBoost: Number((efficiencyBridgeBoost * weightMultiplier).toFixed(2)),
                balanceBridgeBoost: Number((balanceBridgeBoost * weightMultiplier).toFixed(2)),
            }
        }
    };

    if (result.details?.monteCarlo && typeof options.onCalibrationMetric === 'function') {
        options.onCalibrationMetric({
            categoryId: metrics.categoryId || null,
            categoryName: metrics.safeCategory?.name || metrics.categoryName || 'Disciplina',
            timestamp: Date.now(),
            avgBrier: result.details.monteCarlo.avgBrier,
            ece: result.details.monteCarlo.ece,
            calibrationPenalty: result.details.monteCarlo.calibrationPenalty,
            reliability: result.details.monteCarlo.reliability || [],
            calibrationQuality: result.details.monteCarlo.explainability?.calibrationQuality || 'low'
        });
    }

    return result;
};

export const calculateUrgency = (category, simulados = [], studyLogs = [], options = {}) => {
    try {
        const safeCat = category || {};
        const catId = safeCat.id || safeCat.name || 'unknown';

        const safeSims = Array.isArray(simulados) ? [...simulados] : Object.values(simulados || {});
        const safeLogs = Array.isArray(studyLogs) ? [...studyLogs] : Object.values(studyLogs || {});
        const safeTasks = Array.isArray(safeCat.tasks) ? safeCat.tasks : Object.values(safeCat.tasks || {});

        const simCount = safeSims.length;
        const logCount = safeLogs.length;
        const todayStr = getDateKey(new Date());

        const simsForChecksum = [...safeSims].sort((a, b) => {
            const timeA = (normalizeDate(a?.date || a?.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b?.date || b?.createdAt) || new Date(0)).getTime();
            return timeA - timeB;
        });

        const scoreChecksum = simsForChecksum.reduce((acc, s, index) => {
            if (!s) return acc;
            const parsed = getSafeScore(s, options.maxScore || 100);
            const validVal = Number.isNaN(parsed) ? 0 : parsed;
            return acc + (validVal * (index + 1) * 1.17);
        }, 0).toFixed(2);

        const optKey = (options && options.daysToExam !== undefined) ? `_dte${options.daysToExam}` : '';
        const targetKey = `_ts${options?.targetScore ?? 'def'}_ms${options?.maxScore ?? 100}`;

        const logsForChecksum = [...safeLogs].sort((a, b) => {
            const timeA = (normalizeDate(a?.date || a?.createdAt) || new Date(0)).getTime();
            const timeB = (normalizeDate(b?.date || b?.createdAt) || new Date(0)).getTime();
            return timeA - timeB;
        });

        const lastSim = simsForChecksum.length > 0
            ? (simsForChecksum[simsForChecksum.length - 1]?.date || simsForChecksum[simsForChecksum.length - 1]?.createdAt || '')
            : '';
        const lastLog = logsForChecksum.length > 0
            ? (logsForChecksum[logsForChecksum.length - 1]?.date || logsForChecksum[logsForChecksum.length - 1]?.createdAt || '')
            : '';

        const tasksHash = safeTasks.reduce((acc, t) => acc + (t?.completed ? 0 : 1) + (t?.priority === 'high' ? 5 : 0), 0);

        const activeId = useAppStore.getState()?.appState?.activeId || 'default';

        const weightsHash = simpleHash(
            (options.allCategories || [])
                .map(c => `${c?.id || c?.name || '?'}:${c?.weight ?? ''}`)
                .join('|')
        );

        const globalHash = options.globalMcStats
            ? simpleHash(
                `${Number(options.globalMcStats.projectedMean || 0).toFixed(1)}:${Number(options.globalMcStats.probability || 0).toFixed(1)}:${Number(options.globalMcStats.currentMean || 0).toFixed(1)}`
            )
            : 'noglobal';

        const calibrationHash = (options.calibrationHistoryByCategory?.[getCalibrationKey(catId)] || []).length;

        const goalKey = options?.user?.goalDate
            ? `_gd${getDateKey(options.user.goalDate) || String(options.user.goalDate)}`
            : '';

        const cacheKey = `urg_${activeId}_${catId}_${simCount}_${logCount}_${scoreChecksum}_${todayStr}${optKey}${targetKey}_${lastSim}_${lastLog}_tsk${tasksHash}_w${weightsHash}_g${globalHash}_cal${calibrationHash}${goalKey}`;

        if (_urgencyCache.has(cacheKey)) {
            const cached = _urgencyCache.get(cacheKey);
            _urgencyCache.delete(cacheKey);
            _urgencyCache.set(cacheKey, cached);
            return cached;
        }

        const metrics = extractMetrics(safeCat, safeSims, safeLogs, options);
        const scoreInfo = calculateUrgencyScore(metrics, options);
        const result = generateCoachStrings(scoreInfo.weightedRaw, scoreInfo.normalized, metrics, scoreInfo, options);

        if (typeof options.logger === 'function') {
            try {
                options.logger({ categoryId: metrics.categoryId, name: metrics.safeCategory?.name, urgency: result });
            } catch {
                // ignore
            }
        }

        if (_urgencyCache.size > 80) {
            const oldestKey = _urgencyCache.keys().next().value;
            _urgencyCache.delete(oldestKey);
        }

        _urgencyCache.set(cacheKey, result);
        return result;
    } catch (err) {
        console.error("[CoachLogic] Critical error in calculateUrgency:", err);

        return {
            score: 0,
            normalizedScore: 0,
            recommendation: "Erro no cálculo: " + err.message,
            details: {
                hasData: false,
                daysSinceLastStudy: 0,
                error: err.message,
                humanReadable: { "Status": "Erro" }
            }
        };
    }
};

export function analisarDesempenhoHistorico(historico) {
    if (!historico || historico.length === 0) {
        return {
            tendencia: 'neutra',
            confiabilidadeDosDados: 'insuficiente',
            projecaoRetencao: 0
        };
    }

    const formattedHistory = historico.map((h, i) => {
        if (!h) return { score: 0, total: 100, date: new Date().toISOString() };

        let rawDias = h.diasRevisao;
        if (typeof rawDias === 'string') rawDias = rawDias.replace(',', '.');

        const diasValidos = (rawDias === null || rawDias === undefined || rawDias === '')
            ? i
            : (Number.isFinite(Number(rawDias)) ? Number(rawDias) : i);

        const timestamp = Date.now() - (diasValidos * 86400000);
        const safeDate = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();

        const total = Math.max(1, Number(h.total) || 100);
        const acertos = Math.max(0, Number(h.acertos) || 0);

        return {
            score: (acertos / total) * 100,
            total: total,
            date: safeDate.toISOString()
        };
    });

    const risk = computeForgettingRisk(formattedHistory);

    return {
        tendencia: risk.retentionPct > 80 ? 'alta' : (risk.retentionPct > 50 ? 'estável' : 'baixa'),
        confiabilidadeDosDados: historico.length > 5 ? 'alta' : 'média',
        projecaoRetencao: risk.retentionPct
    };
}

export const getSuggestedFocus = (categories, simulados, studyLogs = [], options = {}) => {
    if (!categories || categories.length === 0) return null;

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, { ...options, allCategories: categories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        return valB - valA;
    });

    const top = ranked[0];
    if (!top) return null;

    const maxScore = options.maxScore ?? 100;

    const result = {
        ...top,
        weakestTopic: getWeakestTopic(top, simulados, maxScore)
    };

    if (options.flashcardDue > 0) {
        result.flashcardDue = options.flashcardDue;
        result.srsRecommendation = `Revisar ${options.flashcardDue} flashcards hoje para reforçar retenção e consistência.`;

        if (result.urgency) {
            result.urgency.srsDue = options.flashcardDue;
        }
    }

    if (options.globalMcStats && Number.isFinite(options.globalMcStats.projectedMean)) {
        const globalMean = Number(options.globalMcStats.projectedMean);

        if (result.urgency && result.urgency.details) {
            result.urgency.details.globalMcContext = {
                projectedMean: Number(globalMean.toFixed(1)),
                volatility: options.globalMcStats.sd ? Number(options.globalMcStats.sd.toFixed(2)) : null,
                source: 'global from useMonteCarloStats (Coach integration)'
            };
        }

        result.globalProjectedMean = Number(globalMean.toFixed(1));
        result.mcIntegrationSource = 'globalMcStats';
    }

    return result;
};

const MAX_CACHE_SIZE = 50;

function _buildSortedTopics(category, simulados = [], maxScore = 100) {
    const safeCat = category || {};
    const catId = safeCat.id || safeCat.name || 'unknown';

    const safeTasks = Array.isArray(safeCat.tasks)
        ? safeCat.tasks
        : Object.values(safeCat.tasks || {});

    const openTasks = safeTasks.filter(t => t && !t.completed).length;

    const safeSims = Array.isArray(simulados)
        ? simulados
        : Object.values(simulados || {});

    let lastSimTimestamp = 0;
    let historyVolume = 0;

    if (safeSims.length > 0) {
        const lastSim = safeSims.reduce((latest, current) => {
            if (!latest) return current;
            if (!current) return latest;

            const latestTime = (normalizeDate(latest.date || latest.createdAt) || new Date(0)).getTime();
            const currTime = (normalizeDate(current.date || current.createdAt) || new Date(0)).getTime();

            return currTime > latestTime ? current : latest;
        }, safeSims[0]);

        if (lastSim) {
            lastSimTimestamp = (normalizeDate(lastSim.date || lastSim.createdAt) || new Date(0)).getTime();
        }

        historyVolume = safeSims.length;
    }

    const scoreChecksum = safeSims.reduce((acc, s, index) => {
        if (!s) return acc;

        const parsed = getSafeScore(s, maxScore);
        const validVal = Number.isNaN(parsed) ? 0 : parsed;

        return acc + (validVal * (index + 1) * 1.17);
    }, 0);

    const tasksHash = safeTasks.reduce((acc, t) => acc + ((t?.id || t?.text || '').length), 0);

    const historyLen = (safeCat.simuladoStats && safeCat.simuladoStats.history)
        ? (Array.isArray(safeCat.simuladoStats.history) ? safeCat.simuladoStats.history.length : Object.keys(safeCat.simuladoStats.history).length)
        : 0;

    const todayStr = getDateKey(new Date());
    const userId = safeCat?.userId || safeSims[0]?.userId || 'default';

    const hash = `${userId}-${lastSimTimestamp}-${openTasks}-${tasksHash}-${historyLen}-${maxScore}-${historyVolume}-${scoreChecksum.toFixed(1)}-${todayStr}`;
    const cacheKey = `isolate_${catId}_${hash}`;

    if (_topicsCache.has(cacheKey)) {
        const result = _topicsCache.get(cacheKey);
        _topicsCache.delete(cacheKey);
        _topicsCache.set(cacheKey, result);
        return result.map(t => ({ ...t }));
    }

    if (_topicsCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = _topicsCache.keys().next().value;
        _topicsCache.delete(oldestKey);
    }

    const result = _buildSortedTopicsImpl(safeCat, safeSims, maxScore);
    _topicsCache.set(cacheKey, result);

    return result.map(t => ({ ...t }));
}

const _buildSortedTopicsImpl = (category, _simulados = [], maxScore = 100) => {
    const safeCat = category || {};
    const tasks = Array.isArray(safeCat.tasks) ? safeCat.tasks : Object.values(safeCat.tasks || {});

    const topicMap = {};

    const history = safeArray(safeCat.simuladoStats?.history);
    const todayForTopics = new Date();

    const sortedTopicsHistory = [...history].sort((a, b) => {
        const timeA = (normalizeDate(a.date || a.createdAt) || new Date(0)).getTime();
        const timeB = (normalizeDate(b.date || b.createdAt) || new Date(0)).getTime();
        return (Number.isFinite(timeA) ? timeA : 0) - (Number.isFinite(timeB) ? timeB : 0);
    });

    sortedTopicsHistory.forEach(entry => {
        if (!entry) return;

        let entryTime = todayForTopics.getTime();

        if (entry.date || entry.createdAt) {
            entryTime = (normalizeDate(entry.date || entry.createdAt) || new Date(0)).getTime();
        }

        const safeEntryTime = Number.isFinite(entryTime) && entryTime > 0 ? entryTime : todayForTopics.getTime();
        const entryDate = normalizeDate(safeEntryTime) || new Date(safeEntryTime);

        const daysOld = Math.max(0, (todayForTopics.getTime() - safeEntryTime) / (1000 * 60 * 60 * 24));
        const timeWeight = Math.max(0.01, Math.exp(-0.015 * daysOld));

        const topics = entry.topics || [];

        topics.forEach(t => {
            if (!t) return;

            let rawName = t.name;
            if (typeof rawName !== 'string' || !rawName) rawName = "Tópico Desconhecido";

            const name = rawName.trim();

            if (!topicMap[name]) {
                topicMap[name] = {
                    total: 0,
                    correct: 0,
                    lastSeen: new Date(0),
                    completed: true,
                    hasTasks: false,
                    scores: []
                };
                topicMap[name].hasUnfinishedTask = false;
            }

            let rawTotal = Number(t.total);
            let topicTotal = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : 0;
            let topicCorrect = 0;

            const isTotalMissing = t.total === undefined || t.total === null || String(t.total).trim() === "" || Number(t.total) === 0;

            if (t.score != null && isTotalMissing) {
                topicTotal = getSyntheticTotal(maxScore);
                topicCorrect = (getSafeScore(t, maxScore) / maxScore) * topicTotal;
            } else if (topicTotal > 0) {
                if (t.correct !== undefined && t.correct !== null && !t.isPercentage) {
                    const rawC = sanitizeNum(t.correct);
                    topicCorrect = Math.min(topicTotal, Number.isFinite(rawC) ? rawC : 0);
                } else {
                    topicCorrect = (getSafeScore(t, maxScore) / maxScore) * topicTotal;
                }
            } else {
                return;
            }

            if (Number.isNaN(topicCorrect)) return;

            topicCorrect = Math.max(0, topicCorrect);

            topicMap[name].total += (topicTotal * timeWeight);
            topicMap[name].correct += (topicCorrect * timeWeight);

            if (topicTotal > 0) {
                topicMap[name].scores.push({
                    score: (topicCorrect / topicTotal) * 100,
                    total: topicTotal,
                    date: entryDate.toISOString()
                });
            }

            if (entryDate > topicMap[name].lastSeen) {
                topicMap[name].lastSeen = entryDate;
            }
        });
    });

    tasks.forEach(task => {
        const name = String(task.text || task.title || "").trim();
        if (!name) return;

        if (!topicMap[name]) {
            topicMap[name] = {
                total: 0,
                correct: 0,
                lastSeen: new Date(0),
                completed: !!task.completed,
                hasTasks: true,
                scores: []
            };
            topicMap[name].hasUnfinishedTask = !task.completed;
        } else {
            topicMap[name].hasTasks = true;

            if (topicMap[name].hasUnfinishedTask === undefined) {
                topicMap[name].hasUnfinishedTask = !task.completed;
            } else if (!task.completed) {
                topicMap[name].hasUnfinishedTask = true;
            }

            topicMap[name].completed = !topicMap[name].hasUnfinishedTask;
        }

        let newTaskPriority = 0;

        if (task.priority === 'high') newTaskPriority = 40;
        else if (task.priority === 'medium') newTaskPriority = 20;

        if (!task.completed) {
            topicMap[name].manualPriority = Math.max(topicMap[name].manualPriority || 0, newTaskPriority);
        }
    });

    const today = new Date();

    const topics = Object.entries(topicMap).map(([name, data]) => {
        const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        const topicHistory = data.scores.slice(-3);
        const trend = topicHistory.length >= 2 ? calculateSlope(topicHistory, 100) * 30 : 0;

        let daysSince = 0;

        if (data.lastSeen.getTime() === 0) {
            daysSince = 30;
        } else {
            daysSince = getDaysDiff(today, data.lastSeen);
        }

        const priorityBoost = data.manualPriority || 0;

        const perfComponent = Math.max(0, Math.min(1, (100 - percentage) / 100));
        const recencyComponent_topic = Math.max(0, Math.min(1, daysSince / 60));
        const priorityComponent = Math.max(0, Math.min(1, priorityBoost / 40));

        const perfRatio = percentage / 100;

        const TOPIC_W_PERF = 0.70 - (0.40 * perfRatio);
        const TOPIC_W_RECENCY = 0.10 + (0.40 * perfRatio);
        const TOPIC_W_PRIORITY = 0.20;

        let urgencyScore = (
            perfComponent * TOPIC_W_PERF +
            recencyComponent_topic * TOPIC_W_RECENCY +
            priorityComponent * TOPIC_W_PRIORITY
        ) * 200;

        // FIX: tópicos não testados pesam menos do que tópicos já aferidos
        if (data.total === 0) {
            urgencyScore *= 0.45;
        }

        const topicDropThreshold = -2.0;

        if (trend < topicDropThreshold) {
            const dropSeverity = Math.min(2.0, 1 + Math.abs(trend / topicDropThreshold) * 0.1);
            urgencyScore *= dropSeverity;
        }

        return {
            name,
            total: data.total,
            percentage,
            daysSince,
            trend: Number(trend.toFixed(2)),
            priorityBoost,
            urgencyScore,
            isUntested: data.total === 0,
            manualPriority: data.manualPriority || 0,
            completed: data.completed,
            hasTasks: !!data.hasTasks
        };
    });

    topics.sort((a, b) => {
        const aNeedsAction = !a.completed && a.hasTasks;
        const bNeedsAction = !b.completed && b.hasTasks;

        let aScore = a.urgencyScore + (aNeedsAction ? 50 : 0);
        let bScore = b.urgencyScore + (bNeedsAction ? 50 : 0);

        if (a.total > 0 && a.percentage < 40) aScore += 80;
        else if (a.total > 0 && a.percentage < 60) aScore += 40;

        if (b.total > 0 && b.percentage < 40) bScore += 80;
        else if (b.total > 0 && b.percentage < 60) bScore += 40;

        // FIX: evidência real passa na frente de incerteza pura
        if (a.total === 0) aScore -= 25;
        if (b.total === 0) bScore -= 25;

        return bScore - aScore;
    });

    return topics;
};

const getWeakestTopic = (category, simulados = [], maxScore = 100) => {
    return _buildSortedTopics(category, simulados, maxScore)[0] || null;
};

const getWeakestTopicsList = (category, simulados = [], maxScore = 100, limit = 3) => {
    return _buildSortedTopics(category, simulados, maxScore).slice(0, limit);
};

export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
    const targetScore = options.targetScore ?? 80;
    const maxScore = options.maxScore ?? 100;
    const cfg = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const safeSimulados = safeArray(simulados);
    const safeStudyLogs = safeArray(studyLogs);

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, safeSimulados, safeStudyLogs, { ...options, allCategories: categories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        return valB - valA;
    });

    const topCategories = ranked.slice(0, 10);

    const performDeepCheck = (category, averageScore) => {
        const baseDate = options.now ? (normalizeDate(options.now) || new Date()) : new Date();
        const thirtyDaysAgo = new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const cutoffTime = thirtyDaysAgo.getTime();

        const recentLogs = safeStudyLogs.filter(l =>
            l.categoryId === category.id &&
            (normalizeDate(l.date) || new Date(0)).getTime() >= cutoffTime
        );

        const catNormalized = normalize(category.name);

        const recentSims = safeSimulados.filter(s =>
            normalize(s.subject) === catNormalized &&
            (normalizeDate(s.date || s.createdAt) || new Date(0)).getTime() >= cutoffTime
        );

        const totalHours = recentLogs.reduce((acc, l) => acc + sanitizeMinutes(l.minutes), 0) / 60;
        const totalQuestions = recentSims.reduce((acc, s) => acc + (Number(s.total) || getSyntheticTotal(maxScore)), 0);

        const questionsPerHour = totalHours >= 0.25 ? totalQuestions / totalHours : 0;
        const dynamicThreshold = totalHours >= 20 ? 30 : totalHours >= 10 ? 20 : 12;

        const normalizedScore = averageScore !== undefined ? (averageScore / maxScore) * 100 : 100;
        const isFormingBase = normalizedScore < 45;

        if (totalHours > 5 && questionsPerHour < dynamicThreshold && !isFormingBase) {
            return {
                isTrap: true,
                msg: `⚠️ Alerta de Método: Estudou ${totalHours.toFixed(1)}h de ${category.name} mas resolveu poucas questões (${questionsPerHour.toFixed(1)}/h). O seu nível atual exige prática >${dynamicThreshold}/h.`
            };
        }

        return { isTrap: false };
    };

    let allGeneratedTasks = [];

    const tasksPerCategory = topCategories.length < 5 ? 3 : (topCategories.length < 8 ? 2 : 1);

    topCategories.forEach((cat) => {
        const weakTopics = getWeakestTopicsList(cat, safeSimulados, maxScore, tasksPerCategory);
        const mc = cat.urgency?.details?.monteCarlo;

        const iterations = tasksPerCategory;
        const getPriorityLabel = () => allGeneratedTasks.length < 3 ? '[PROTOCOLO PRIORITÁRIO] ' : '';

        const adaptiveDanger = mc?.thresholds?.danger || cfg.MC_PROB_DANGER;
        const adaptiveSafe = mc?.thresholds?.safe || cfg.MC_PROB_SAFE;

        const mcIdSuffix = Date.now().toString(36);
        const mcProbKey = mc ? Math.round(mc.probabilityRaw) : '0';
        const mcVolKey = mc ? Math.round(mc.volatility * 100) : '0';

        // Ordem corrigida: crítico > caos > SRS > cruzeiro > trap
        if (mc && mc.probabilityRaw < adaptiveDanger) {
            const probPct = Math.round(mc.probabilityRaw);

            allGeneratedTasks.push({
                id: `${cat.id}-mc-danger-${mcProbKey}-${mcIdSuffix}`,
                text: `${cat.name}: ${getPriorityLabel()}[ALERTA MESTRE] 🚨 VETOR CRÍTICO! Projeção matemática indica colapso de performance.`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Vetor Crítico — Intervenção Exigida',
                analysis: {
                    reason: "Monte Carlo — Zona de Perigo",
                    details: `Apenas ${probPct}% de chance de bater a meta de ${options.targetScoreLabel ?? targetScore}% em 90 dias.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Probabilidade crítica detectada. Mude de método imediatamente."
                }
            });
        } else if (mc && mc.volatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && mc.probabilityRaw < cfg.MC_PROB_SAFE) {
            const probPct = Math.round(mc.probabilityRaw);

            allGeneratedTasks.push({
                id: `${cat.id}-mc-chaos-${mcVolKey}-${mcProbKey}-${mcIdSuffix}`,
                text: `${cat.name}: ${getPriorityLabel()}[ALERTA MESTRE] 🌪️ OSCILAÇÃO ESTATÍSTICA: Padrão imprevisível detectado.`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Oscilação Estatística — Caos Detectado',
                analysis: {
                    reason: "Monte Carlo — Caos Estatístico",
                    details: `Volatilidade MSSD: ${mc.volatility.toFixed(2)}. Probabilidade: ${probPct}%.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Seu nível base é promissor, mas a inconsistência torna a aprovação imprevisível."
                }
            });
        } else if (cat.urgency?.details?.srsLabel) {
            const srsKey = cat.urgency?.details?.srsLabel.replace(/\s/g, '').substring(0, 15);
            const srsTopic = weakTopics[0]?.name || 'Revisão Espaçada (SRS)';

            allGeneratedTasks.push({
                id: `${cat.id}-srs-${srsKey}`,
                text: `${cat.name}: ${getPriorityLabel()}[${srsTopic}]`,
                completed: false,
                status: 'pending',
                priority: 'high',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: srsTopic,
                analysis: {
                    reason: "Revisão Espaçada (SRS) Ativada",
                    label: cat.urgency?.details?.srsLabel,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Intervalo de retenção atingido. Revisão crítica para memória de longo prazo."
                }
            });
        } else if (mc && mc.probabilityRaw >= adaptiveSafe) {
            const probPct = Math.round(mc.probabilityRaw);

            allGeneratedTasks.push({
                id: `${cat.id}-mc-safe-${mcProbKey}-${mcIdSuffix}`,
                text: `${cat.name}: ${getPriorityLabel()}[Manutenção - ${cat.name}]`,
                completed: false,
                status: 'pending',
                priority: 'low',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: `Manutenção — ${cat.name}`,
                analysis: {
                    reason: "Monte Carlo — Cruzeiro Seguro",
                    details: `${probPct}% de probabilidade de atingir a meta.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Mantenha o ritmo atual para proteger sua posição."
                }
            });
        } else if (performDeepCheck(cat, cat.urgency?.details?.averageScore).isTrap) {
            allGeneratedTasks.push({
                id: `${cat.id}-trap-trap`,
                text: `${cat.name}: ${getPriorityLabel()}[Prática Intensiva de Questões]`,
                completed: false,
                status: 'pending',
                priority: 'medium',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Prática Intensiva de Questões',
                analysis: {
                    reason: "Detector de Pseudo-Estudo",
                    details: "Alta carga horária com baixíssimo volume de exercícios.",
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: "Volume excessivo de teoria detectado. Troque leitura por questões agora."
                }
            });
        }

        const agilityData = cat.urgency?.details?.agilityPenalty !== undefined
            ? {
                avgSeconds: cat.urgency?.details?.avgSeconds || 0,
                agilityPenalty: cat.urgency?.details?.agilityPenalty || 0
            }
            : computeAgilityMetrics((cat.simuladoStats && Array.isArray(cat.simuladoStats.history)) ? cat.simuladoStats.history : []);

        const avgSeconds = agilityData.avgSeconds;
        const targetSeconds = 120;

        const isAgilityProblem = (avgSeconds > targetSeconds + 30) && (cat.urgency?.normalizedScore >= 75);

        if (isAgilityProblem) {
            allGeneratedTasks.push({
                id: `${cat.id}-agility-${avgSeconds}`,
                text: `${cat.name}: ${getPriorityLabel()}[Treino de Agilidade - Cronômetro]`,
                completed: false,
                status: 'pending',
                priority: 'medium',
                categoryId: cat.id,
                category: cat.name,
                catName: cat.name,
                subjectName: cat.name,
                topicName: 'Treino de Agilidade — Cronômetro',
                analysis: {
                    reason: "Motor de Agilidade AI",
                    details: `Seu tempo médio (${avgSeconds}s/questão) está alto, embora sua taxa de acertos seja excelente.`,
                    metrics: cat.urgency?.details?.humanReadable || {},
                    monteCarlo: mc || null,
                    verdict: `Faça baterias curtas com cronômetro para reduzir o seu tempo de ${avgSeconds}s para a meta de ${targetSeconds}s por questão.`
                }
            });
        }

        let topicCursor = 0;

        for (let i = 0; i < iterations; i++) {
            const weakTopic = (topicCursor < weakTopics.length) ? weakTopics[topicCursor++] : null;

            const topicLabel = weakTopic
                ? `${getPriorityLabel()}[${weakTopic.name}]`
                : `${getPriorityLabel()}[Revisão Geral Complementar]`;

            const uniqueIdSuffix = weakTopic
                ? (`${weakTopic.name.replace(/\s/g, '').substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}-${weakTopic.total}-${i}`)
                : `geral-${i}`;

            if (weakTopic) {
                let reasonStr = "";
                let topicPriority = 'medium';

                if (weakTopic.isUntested) {
                    reasonStr = "Tópico Novo / Não Testado";
                    topicPriority = 'medium';
                } else if (weakTopic.manualPriority > 0) {
                    reasonStr = "Alta Prioridade Manual";
                    topicPriority = 'high';
                } else if (weakTopic.percentage < 70) {
                    reasonStr = "Baixa Performance";
                    topicPriority = 'high';
                } else {
                    reasonStr = "Aperfeiçoamento Contínuo";
                    topicPriority = 'medium';
                }

                allGeneratedTasks.push({
                    id: `${cat.id}-weaktopic-${uniqueIdSuffix}`,
                    text: `${cat.name}: ${topicLabel}`,
                    completed: false,
                    status: 'pending',
                    priority: topicPriority,
                    categoryId: cat.id,
                    category: cat.name,
                    catName: cat.name,
                    subjectName: cat.name,
                    topicName: weakTopic.name,
                    analysis: {
                        reason: `Tópico Selecionado: ${weakTopic.name}`,
                        details: reasonStr,
                        metrics: cat.urgency?.details?.humanReadable || {},
                        monteCarlo: mc || null,
                        categoryDetails: {
                            "Urgência Total": Math.round(cat.urgency.score),
                            ...cat.urgency?.details?.components
                        },
                        topicDetails: {
                            "Nota do Tópico": Math.round(weakTopic.percentage) + "%",
                            "Dias sem Ver": weakTopic.daysSince,
                            "Tendência": weakTopic.trend > 0 ? `↑ ${weakTopic.trend}` : `↓ ${weakTopic.trend}`,
                            "Bônus de Prioridade": weakTopic.priorityBoost,
                            "Urgência Calculada": Math.round(weakTopic.urgencyScore)
                        }
                    }
                });
            } else {
                const alreadyHasGeneral = allGeneratedTasks.some(
                    t => t.categoryId === cat.id && (
                        /Revisão Geral/i.test(String(t.text || t.topicName || '')) ||
                        String(t.text || '').trim().endsWith(`[${cat.name}]`)
                    )
                );
                if (!alreadyHasGeneral) {
                    allGeneratedTasks.push({
                        id: `${cat.id}-general-review-${uniqueIdSuffix}-it0`,
                        text: `${cat.name}: ${getPriorityLabel()}[Revisão Geral]`,
                        completed: false,
                        status: 'pending',
                        priority: 'medium',
                        categoryId: cat.id,
                        category: cat.name,
                        catName: cat.name,
                        subjectName: cat.name,
                        topicName: 'Revisão Geral Complementar',
                        analysis: {
                            reason: "Revisão Geral Complementar",
                            details: "Prática global da disciplina e resolução variada de exercícios.",
                            metrics: cat.urgency?.details?.humanReadable || {},
                            monteCarlo: mc || null,
                            categoryDetails: {
                                "Total Urgency": Math.round(cat.urgency.score),
                                ...cat.urgency?.details?.components
                            }
                        }
                    });
                }
                break; // Evita gerar repetições extras sem subtópicos na mesma rodada
            }
        }
    });

    const seenTaskKeys = new Set();
    const deduplicatedTasks = allGeneratedTasks.filter(t => {
        const rawText = String(t.text || t.title || '');
        const catNameLower = String(t.catName || t.category || '').trim().toLowerCase();
        let cleanTitle = rawText
            .replace(/\[PROTOCOLO PRIORITÁRIO\]\s*/i, '')
            .replace(/\[ALERTA MESTRE\]\s*/i, '')
            .replace(/Revisão Geral Complementar.*$/i, 'Revisão Geral')
            .replace(/Revisão Complementar.*$/i, 'Revisão Geral')
            .trim()
            .toLowerCase();

        if (catNameLower && cleanTitle.endsWith(`[${catNameLower}]`)) {
            cleanTitle = cleanTitle.replace(`[${catNameLower}]`, '[revisão geral]');
        }

        const key = `${t.categoryId || 'global'}::${cleanTitle}`;
        if (seenTaskKeys.has(key)) return false;
        seenTaskKeys.add(key);
        return true;
    });

    const interleaved = [];
    const tasksByCat = {};
    deduplicatedTasks.forEach(t => {
        const cid = t.categoryId || 'global';
        if (!tasksByCat[cid]) tasksByCat[cid] = [];
        tasksByCat[cid].push(t);
    });
    
    let added = true;
    let idx = 0;
    while (added && interleaved.length < 12) {
        added = false;
        for (const cid of Object.keys(tasksByCat)) {
            if (idx < tasksByCat[cid].length) {
                interleaved.push(tasksByCat[cid][idx]);
                added = true;
                if (interleaved.length >= 12) break;
            }
        }
        idx++;
    }

    return interleaved;
};

export function getCognitiveState(stats) {
    if (!stats || typeof stats !== 'object') return 100;

    let focusMinutes = stats.consecutiveMinutes || 0;

    if (focusMinutes === 0 && stats.lastActivityTimestamp) {
        const minutesSinceLast = Math.max(0, (Date.now() - stats.lastActivityTimestamp) / 60000);
        if (minutesSinceLast < 30) focusMinutes = stats.previousSessionMinutes || 0;
    }

    let hadBreaks = (stats.pomodorosCompleted || 0) > 0;

    if (focusMinutes === 0 && hadBreaks) {
        focusMinutes = stats.pomodorosCompleted * (stats.settings?.pomodoroWork || 25);
    }

    const rawLevel = stats.user?.level;
    const userLevel = (rawLevel === null || rawLevel === undefined || rawLevel === '')
        ? 1
        : (Number.isFinite(Number(rawLevel)) ? Number(rawLevel) : 1);

    const levelMultiplier = Math.max(0.1, 1 + (userLevel * 0.05));
    const decayModifier = hadBreaks ? 0.6 : 1.0;
    const dynamicDecay = (0.003 / levelMultiplier) * decayModifier;

    const fatigueScore = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-dynamicDecay * focusMinutes))));

    return fatigueScore;
}

export function getBestTask(categories, excludeTaskId = null) {
    let bestTask = null;
    let highestScore = -Infinity;

    (categories || []).filter(Boolean).forEach(cat => {
        (cat.tasks || []).filter(Boolean).forEach(task => {
            if (task.completed || (excludeTaskId && (task.id || task.text) === excludeTaskId)) return;

            let score = 0;

            if (task.priority === 'high') score += 50;
            else if (task.priority === 'medium') score += 20;

            // FIX: pequeno ajuste pelo peso da categoria
            const rawCatWeight = Number(cat.weight);
            const boundedCatWeight = Number.isFinite(rawCatWeight)
                ? Math.min(10, Math.max(1, rawCatWeight))
                : 5;

            score += (boundedCatWeight - 5) * 2;

            const studiedAt = task.lastStudiedAt || cat.lastStudiedAt;
            const normalizedStudyDate = normalizeDate(studiedAt);
            const parsedTime = normalizedStudyDate ? normalizedStudyDate.getTime() : NaN;

            if (studiedAt && !isNaN(parsedTime) && parsedTime > 0) {
                const days = Math.max(0, (Date.now() - parsedTime) / (1000 * 60 * 60 * 24));
                const urgenciaPorEsquecimento = 40 * (1 - Math.exp(-0.05 * days));
                score += urgenciaPorEsquecimento;
            } else {
                score += 45;
            }

            if (task.errorRate !== undefined && task.errorRate !== null) {
                let rawError = String(task.errorRate || '0').replace('%', '').replace(',', '.').trim();
                const validErrorRate = Number.isFinite(Number(rawError)) ? Number(rawError) : 0;

                let normalizedErrorRate = Math.min(100, Math.max(0, validErrorRate)) / 100;
                score += normalizedErrorRate * 40;
            }

            if (score > highestScore) {
                highestScore = score;

                bestTask = {
                    ...task,
                    id: task.id || task.text,
                    catName: cat.name,
                    catColor: cat.color,
                    catIcon: cat.icon,
                    catId: cat.id
                };
            }
        });
    });

    return bestTask;
}

export function getCoachInsight(activeSubject, stats) {
    if (!activeSubject) {
        return {
            type: 'info',
            title: 'STATUS: STANDBY',
            text: 'Aguardando inicialização do protocolo de foco. Selecione um vetor de estudo abaixo para ativar o rastreamento neural.',
            color: 'indigo',
            iconType: 'Brain'
        };
    }

    const fatigueScore = getCognitiveState(stats);
    const userResilience = stats?.user?.level || 1;

    const dangerThreshold = Math.max(45, 75 - (userResilience * 2));
    const flowThreshold = Math.min(90, 80 + (userResilience * 0.5));

    if (fatigueScore < dangerThreshold) {
        return {
            type: 'danger',
            title: 'ALERTA: ESGOTAMENTO NEURAL',
            text: `Carga cognitiva em nível crítico (**${fatigueScore}%**). Taxa de retenção em declínio acentuado. Protocolo de resfriamento (pausa) recomendado.`,
            color: 'red',
            iconType: 'Alert'
        };
    }

    if (fatigueScore >= flowThreshold && stats?.pomodorosCompleted >= 3) {
        return {
            type: 'success',
            title: 'ESTADO: SINCRONIA TOTAL',
            text: `Sincronia neural otimizada! Estabilidade cognitiva blindada em **${fatigueScore}%**. Fluxo de dados em alta fidelidade detectado.`,
            color: 'emerald',
            iconType: 'Zap'
        };
    }

    if (stats?.pomodorosCompleted >= 3) {
        return {
            type: 'info',
            title: 'SESSÃO: PROGRESSO ACUMULADO',
            text: `${stats.pomodorosCompleted} sessões concluídas. Disposição operacional em **${fatigueScore}%**. Considere uma pausa curta para consolidação.`,
            color: 'indigo',
            iconType: 'Brain'
        };
    }

    return {
        type: 'info',
        title: 'SESSÃO: OPERACIONAL',
        text: `Frequência de foco sintonizada. Disposição operacional calculada em **${fatigueScore}%**. Escaneando vetor: **${activeSubject.task || 'ação'}**.`,
        color: 'indigo',
        iconType: 'Brain'
    };
}

export function getCombinedHistory(history, simulados, maxScore = 100) {
    const deduplicatedMap = new Map();
    const allSimulados = safeArray(simulados);

    allSimulados.forEach((s, idx) => {
        const safeScore = getSafeScore(s, maxScore);
        const key = `${s.id || `sim-no-id-${idx}`}|${s.date || s.createdAt}|${Number.isFinite(safeScore) ? safeScore.toFixed(2) : '0.00'}`;
        deduplicatedMap.set(key, { ...s, type: 'simulado' });
    });

    const hasSimuladoForDate = new Set(
        allSimulados
            .map(s => getDateKey(s.date || s.createdAt))
            .filter(Boolean)
    );

    const rowsByDate = {};

    safeArray(history).forEach(r => {
        const dKey = getDateKey(r.date || r.createdAt);

        if (dKey && !hasSimuladoForDate.has(dKey)) {
            if (!rowsByDate[dKey]) rowsByDate[dKey] = { correct: 0, total: 0 };

            rowsByDate[dKey].correct += (Number(r.correct) || 0);
            rowsByDate[dKey].total += (Number(r.total) || 0);
        }
    });

    Object.entries(rowsByDate).forEach(([dKey, stats]) => {
        if (stats.total > 0) {
            const score = (stats.correct / stats.total) * 100;
            const key = `legacy-${dKey}|${dKey}|${score.toFixed(2)}`;

            if (!deduplicatedMap.has(key)) {
                deduplicatedMap.set(key, {
                    id: `legacy-${dKey}`,
                    date: dKey,
                    score,
                    type: 'simulado'
                });
            }
        }
    });

    return getSortedHistory(Array.from(deduplicatedMap.values()));
}
</file>

</files>
