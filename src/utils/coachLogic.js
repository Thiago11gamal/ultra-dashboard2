// ==================== CONSTANTES ====================
import { calculateMSSD, calculateSlope } from '../engine/projection.js';
import { getSortedHistory } from '../engine/stats.js';
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
import { getCoachFeature } from './coachFeatures.js';
import { kalmanAbilityTrend } from '../engine/probabilistic/stateSpace.js';
import { estimateDynamicVolatility } from '../engine/probabilistic/volatility.js';
import { estimatePosteriorPredictive } from '../engine/probabilistic/posteriorPredictive.js';
import { estimateTopicProficiencies } from '../engine/probabilistic/bayesianTopics.js';
import {
  rankDecisionCandidates,
} from '../engine/probabilistic/decisionEngine.js';
import {
  getKnowledgeGraphForCategory,
  computeTopicGraphMetrics,
} from '../engine/probabilistic/knowledgeGraph.js';
import {
  estimateTopicFsrs,
  estimateCategoryFsrsBoost,
} from '../engine/probabilistic/fsrs.js';
import { kahanSum } from '../engine/math/kahan.js';
import { computeAgilityMetrics } from '../engine/stats.js';
// import { cleanCoachTags } from './coachText.js';
// FIX (BUG-13): hashString64 disponível para cache keys compactas
import { safeArray, getCalibrationKey, hashString, hashString64 } from './coachSafe.js';

export {
    deriveAdaptiveRiskThresholds,
    computeContinuousMcBoost,
    deriveBacktestWeights,
    clearMcCache,
    runCoachMonteCarlo
};

const URGENCY_CACHE_MAX = 80;
const TOPICS_CACHE_MAX = 50;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// LRU Cache for urgency calculations
export const _urgencyCache = new Map();
export const clearUrgencyCache = () => _urgencyCache.clear();
export const _topicsCache = new Map();
export const clearTopicsCache = () => _topicsCache.clear();

// ✅ FIX: Helper para inserção com limite e TTL
function cacheSet(cache, maxSize, key, value) {
  if (cache.size >= maxSize) {
    // Limpar expirados primeiro
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > CACHE_TTL_MS) cache.delete(k);
    }
    // Se ainda cheio, remover LRU
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
  }
  cache.set(key, { value, timestamp: Date.now() });
}

function cacheGet(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // LRU: mover para o fim
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

// FIX (BUG-14): deep clone robusto — preserva Date, Map, Set, undefined
// (JSON.parse(JSON.stringify()) perde esses tipos no fallback)
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch { /* fallback abaixo */ }
  if (Array.isArray(value)) return value.map(deepClone);
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [deepClone(k), deepClone(v)]));
  if (value instanceof Set) return new Set([...value].map(deepClone));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = deepClone(v);
  return out;
}

const sanitizeMinutes = (mins) => Math.min(720, Math.max(0, Number(mins) || 0));
const clamp = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
};

const safeFixedNumber = (value, digits = 2, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : fallback;
};

// simpleHash moved to coachSafe.js as hashString (canonical)
const simpleHash = hashString;

export const DEFAULT_CONFIG = {
    MC_HISTORY_WINDOW: 10,
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
    MC_BOOST_SAFE_PENALTY: -10,
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
 *
 * PATCH: daysToExam === 0 → curva logística converge para ~2.0 (máxima urgência no dia da prova)
 * daysToExam < 0 → retorna 1.0 (prova já passou)
 */
export function getCrunchMultiplier(daysToExam, firstActivityDate = null, now = null) {
    if (daysToExam === null || daysToExam === undefined || Number.isNaN(daysToExam)) return 1.0;
    if (daysToExam < 0) return 1.0;
    if (daysToExam === 0) return 2.0;
    // A curva logística já converge para ~2.0 naturalmente
    let criticalHorizon = 21;
    let timeDivisor = 7;
    const safeFirstActivity = normalizeDate(firstActivityDate);
    if (safeFirstActivity && !isNaN(safeFirstActivity.getTime())) {
        const referenceDate = now ? (normalizeDate(now) || new Date()) : new Date();
        const refTime = referenceDate.getTime();
        const firstTime = safeFirstActivity.getTime();
        if (!Number.isFinite(refTime) || !Number.isFinite(firstTime)) return 1.0;
        const journeyDays = Math.max(0, refTime - firstTime) / 86400000;
        // ✅ FIX: Validar journeyDays antes de calcular totalJourneyDays
        if (!Number.isFinite(journeyDays)) return 1.0;
        const safeDays = Number.isFinite(daysToExam) ? Math.max(0, daysToExam) : 0;
        const totalJourneyDays = Math.max(1, journeyDays) + safeDays;
        criticalHorizon = Math.max(14, Math.min(35, totalJourneyDays * 0.08));
        timeDivisor = Math.max(7, Math.min(60, totalJourneyDays * 0.15));
    }
    const timeDist = Number.isFinite(daysToExam) ? Number(daysToExam) : criticalHorizon;
    const urgency = 1.0 + (1.0 / (1.0 + Math.exp((timeDist - criticalHorizon) / timeDivisor)));
    return Number(Math.min(2.0, urgency).toFixed(4));
}

function _getSRSBoost(history, daysSince, maxScore, cfg, mssdVolatility = null, effectiveN = null) {
  // Lote 7: FSRS avançado opcional
  if (
    getCoachFeature(null, 'useAdvancedFsrs', false) &&
    getCoachFeature(null, 'useFsrsForSrsBoost', false)
  ) {
    try {
      const fsrsData = estimateCategoryFsrsBoost(history, {
        daysSince,
        maxScore,
        cfg,
        desiredRetention: 0.85,
      });
      if (fsrsData) {
        return fsrsData;
      }
    } catch (err) {
      console.warn('[CoachLogic] Advanced FSRS category boost failed:', err);
    }
  }

  // Fallback legado
  const forgettingData = computeForgettingRisk(
    history,
    maxScore,
    null,
    mssdVolatility,
    effectiveN,
    daysSince
  );

  // ✅ FIX: Validar retention antes de calcular boost
  const retention = Number.isFinite(forgettingData.retentionPct)
    ? forgettingData.retentionPct
    : 100;

  if (retention < 75) {
    const intensity = Math.pow((75 - retention) / 75, 1.2);
    const boost = cfg.SRS_BOOST * 2.0 * intensity;
    let label;
    if (retention < 30) label = "⚠️ Memória Crítica (Risco de Branco)";
    else if (retention < 55) label = "🧠 Revisão Necessária (Curva de Esquecimento)";
    else label = "🔄 Revisão de Reforço";
    return { boost, label };
  }
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
    const safeMedia = Number.isFinite(mediaGlobal) ? Math.max(0, Math.min(1, mediaGlobal)) : 0.5;
    const safeGlobalTotal = Number.isFinite(globalTotal) ? Math.max(0, globalTotal) : 0;
    const K = Math.max(3, Math.min(15, Math.log10(safeGlobalTotal + 1) * 3));
    const untestedPrior = 0.25;
    // ✅ FIX: Tópico não testado usa prior conservador, não herda média global
    const dataTrust = Math.min(1, rawTotal / K);
    const prior = rawTotal === 0
        ? untestedPrior // ← Não herda safeMedia
        : (untestedPrior * (1 - dataTrust)) + (safeMedia * dataTrust);
    const smoothedAcertos = rawAcertos + (prior * K);
    const smoothedTotal = rawTotal + K;
    const proficiency = smoothedTotal > 0 ? smoothedAcertos / smoothedTotal : untestedPrior;
    return clamp(proficiency, 0, 1);
};

export function computeRobustVolatilityForCoach(history = [], maxScore = 100) {
    const fallbackVol = 0.08 * maxScore;
    const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
    const n = safeHistory.length;
    if (n < 2) return fallbackVol;
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
        // Apenas vírgula: pode ser decimal (1,5) ou milhar (1.000)
        // Se tem exatamente 3 dígitos após a vírgula, tratar como milhar
        const afterComma = str.split(',')[1];
        if (afterComma && afterComma.length === 3) {
            str = str.replace(/\./g, '').replace(',', '');
        } else {
            str = str.replace(/\./g, '').replace(',', '.');
        }
    } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
        str = str.replace(/\./g, '');
    }
    const n = Number(str);
    return Number.isFinite(n) ? n : NaN;
};

export const getCoachPriorities = (topicsData) => {
  if (!Array.isArray(topicsData)) return [];

  const useBayesian = getCoachFeature(null, 'useBayesianTopics', false);
  if (useBayesian) {
    try {
      const bayesianInput = topicsData.map(topic => {
        const parsedAcertos = sanitizeNum(topic.acertos);
        const parsedCorrect = sanitizeNum(topic.correct);
        const parsedTotal = sanitizeNum(topic.total);
        const correct = Number.isFinite(parsedAcertos)
          ? parsedAcertos
          : (Number.isFinite(parsedCorrect) ? parsedCorrect : 0);
        const total = Number.isFinite(parsedTotal) ? parsedTotal : 0;
        return {
          name: topic.name || topic.topic || topic.id || 'Tópico',
          total,
          correct,
          original: topic
        };
      });

      const bayesianResult = estimateTopicProficiencies(bayesianInput, {
        untestedPriorMean: 0.25,
        untestedPriorWeight: 0.45
      });

      return bayesianResult.topics
        .map(topic => ({
          ...(topic.original || {}),
          name: topic.name,
          realProficiency: clamp(topic.proficiencyMean, 0, 1),
          bayesian: topic
        }))
        .sort((a, b) => {
          const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1;
          const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
          return valA - valB;
        });
    } catch (err) {
      console.warn('[CoachLogic] Bayesian getCoachPriorities failed:', err);
    }
  }

  // fallback legado
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

  const mediaGlobal = (globalTotal > 0 && Number.isFinite(globalCorrect / globalTotal))
    ? globalCorrect / globalTotal
    : 0.5;

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
    // ✅ FIX: Garantir que options é objeto
    const safeOptions = options && typeof options === 'object' ? options : {};

    const cfg = { ...DEFAULT_CONFIG, ...(safeOptions.config || {}) };
    const safeCategory = category || {};
    const categoryId = safeCategory.id;
    const calibrationHistory = safeOptions.calibrationHistoryByCategory?.[getCalibrationKey(categoryId)] || [];
    const rollingCalibration = computeRollingCalibrationParams(calibrationHistory, {
        baseline: cfg.MC_CALIBRATION_BRIER_BASELINE,
        maxPenalty: cfg.MC_CALIBRATION_MAX_PENALTY,
        windowDays: cfg.MC_CALIB_WINDOW_DAYS,
        minSamples: cfg.MC_CALIB_MIN_SAMPLES,
        maxSamples: cfg.MC_CALIB_MAX_SAMPLES
    });

    const referenceDate = safeOptions.now ? (normalizeDate(safeOptions.now) || new Date()) : new Date();
    const referenceNow = referenceDate.getTime();

    // ✅ FIX: Validar maxScore, minScore, targetScore
    const rawMaxScore = Number(safeOptions.maxScore ?? 100);
    const maxScore = Number.isFinite(rawMaxScore) && rawMaxScore > 0 ? rawMaxScore : 100;

    const rawMinScore = Number(safeOptions.minScore ?? 0);
    const minScore = Number.isFinite(rawMinScore) ? Math.min(rawMinScore, maxScore) : 0;

    const rawTargetScore = Number(safeOptions.targetScore ?? (maxScore * 0.8));
    const fallbackTarget = maxScore * 0.8;
    const unclampedTarget = Number.isFinite(rawTargetScore) ? rawTargetScore : fallbackTarget;
    const targetScore = Math.min(maxScore, Math.max(minScore, unclampedTarget));
    const targetScoreLabel = safeOptions.targetScoreLabel ?? Math.round((targetScore / maxScore) * 100);

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
    // ✅ FIX: Verificar se safeOptions.user existe antes de acessar goalDate
    if (safeOptions.user && safeOptions.user.goalDate) {
        try {
            const examDate = normalizeDate(safeOptions.user.goalDate);
            if (examDate && !isNaN(examDate.getTime())) {
                const today = normalizeDate(referenceDate) || referenceDate;
                daysToExam = Math.round((examDate.getTime() - today.getTime()) / MS_PER_DAY);
            }
        } catch {
            console.warn("[CoachLogic] Invalid goalDate:", safeOptions.user.goalDate);
        }
    }

    const safeSimulados = Array.isArray(simulados) ? [...simulados] : Object.values(simulados || {});
    const safeStudyLogs = Array.isArray(studyLogs) ? [...studyLogs] : Object.values(studyLogs || {});

    const catName = safeCategory?.name || safeCategory?.id || '';

    const relevantAllPreSort = catName
        ? safeSimulados.filter(s => s && isSubjectMatch(s.subject || "", catName))
        : safeSimulados;

    const relevantAll = relevantAllPreSort
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

    if (validGlobalSims.length > 0 && maxScore > 0) {
        const totalPoints = kahanSum(validGlobalSims);
        // ✅ PATCH-34: Proteção explícita contra divisão por zero
        const denominator = validGlobalSims.length * maxScore;
        globalBaselinePct = denominator > 0 ? (totalPoints / denominator) * 100 : 50;
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

            // ✅ PATCH-09: Validar hoursSinceLastSim explicitamente
            const rawHoursSinceLastSim = (referenceNow - mostRecentSimDate) / (1000 * 60 * 60);
            const hoursSinceLastSim = Number.isFinite(rawHoursSinceLastSim) && rawHoursSinceLastSim >= 0
                ? rawHoursSinceLastSim
                : Infinity; // ← força o caminho "notaBruta"

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
        const globalAnchor = Number.isFinite(safeOptions.globalMcStats?.currentMean)
            ? safeOptions.globalMcStats.currentMean
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

    // ==================== LOTE 1: STATE-SPACE / KALMAN ====================
    let stateSpace = null;
    const useStateSpace = getCoachFeature(options, 'useStateSpace', false);
    if (useStateSpace && trendHistory.length >= 3) {
      try {
        stateSpace = kalmanAbilityTrend(trendHistory, {
          maxScore,
          minScore,
        });
      } catch (err) {
        console.warn('[CoachLogic] State-space/Kalman failed:', err);
        stateSpace = null;
      }
    }

    // Se autorizado, substitui a média exponencial pela habilidade latente do Kalman.
    if (
      stateSpace &&
      getCoachFeature(options, 'useStateSpaceAverage', false)
    ) {
      averageScore = clamp(stateSpace.ability, minScore, maxScore);
    }

    // Se autorizado, substitui a tendência simples pela tendência do Kalman.
    const rawTrend = stateSpace && getCoachFeature(options, 'useStateSpaceTrend', false)
      ? stateSpace.trendPerMonth
      : calculateSlope(trendHistory, maxScore) * 30;

    const limiteSuperior = maxScore - averageScore;
    const limiteInferior = -averageScore;
    const trend = Math.max(limiteInferior, Math.min(limiteSuperior, rawTrend));

    // ✅ PATCH-27: Janela do MC configurável (padrão 10 para volatilidade de curto prazo)
    const MC_WINDOW = Number(cfg.MC_HISTORY_WINDOW) || 10;
    const mcHistory = simuladosToHistory(simuladosWithMaxScore.slice(0, MC_WINDOW), maxScore);

    const baseMssdVolatility = mcHistory.length >= 3
        ? calculateMSSD(mcHistory, maxScore)
        : computeRobustVolatilityForCoach(mcHistory, maxScore);

    // ==================== LOTE 2: VOLATILIDADE DINÂMICA ====================
    let dynamicVolatility = null;
    let mssdVolatility = baseMssdVolatility;

    if (
      getCoachFeature(options, 'useDynamicVolatility', false) &&
      mcHistory.length >= 3
    ) {
      try {
        dynamicVolatility = estimateDynamicVolatility(mcHistory, {
          maxScore,
          minScore,
          useGarch: getCoachFeature(options, 'useGarchVolatility', false),
          override: getCoachFeature(options, 'useDynamicVolatilityOverride', false),
        });

        if (dynamicVolatility && Number.isFinite(dynamicVolatility.volatility)) {
          const dynamicVol = clamp(dynamicVolatility.volatility, 0, maxScore);
          if (getCoachFeature(options, 'useDynamicVolatilityOverride', false)) {
            mssdVolatility = dynamicVol;
          } else {
            // Blend conservador: mantém parte do comportamento antigo.
            mssdVolatility = clamp(
              (dynamicVol * 0.65) + (baseMssdVolatility * 0.35),
              0,
              maxScore
            );
          }
        }
      } catch (err) {
        console.warn('[CoachLogic] Dynamic volatility failed:', err);
        dynamicVolatility = null;
        mssdVolatility = baseMssdVolatility;
      }
    }

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

    // ✅ FIX: Verificar se safeOptions.globalMcStats existe antes de acessar
    const globalProjectedMean = safeOptions.globalMcStats && Number.isFinite(safeOptions.globalMcStats.projectedMean)
        ? safeOptions.globalMcStats.projectedMean
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

    const agilityData = computeAgilityMetrics(safeCategory.simuladoStats?.history || []) || {};
    const agilityPenalty = Number.isFinite(agilityData.agilityPenalty)
      ? agilityData.agilityPenalty
      : 0;
    const avgSeconds = Number.isFinite(agilityData?.avgSeconds)
        ? agilityData.avgSeconds
        : 0;

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

    const baseMcProbability = mcResult?.probability ?? null;
    const mcHasData = mcResult != null;

    // ==================== LOTE 3: POSTERIOR PREDICTIVE MONTE CARLO ====================
    let posteriorMc = null;
    let finalMcResult = mcResult;
    let finalMcProbability = baseMcProbability;

    if (
      getCoachFeature(options, 'usePosteriorMonteCarlo', false) &&
      mcResult
    ) {
      try {
        const safeStateSpace = stateSpace ?? null;
        const safeDynamicVolatility = dynamicVolatility ?? null;
        const domain = Math.max(1e-6, maxScore - minScore);
        const fallbackAbilitySd = Math.max(
          domain * 0.02,
          (Number.isFinite(mssdVolatility) ? mssdVolatility : domain * 0.05) /
            Math.sqrt(Math.max(2, (lastNScores || []).length))
        );
        const fallbackTrendPerDay = Number.isFinite(trend)
          ? trend / 30
          : 0;
        const fallbackTrendSd = Math.max(
          domain * 0.0015,
          Math.abs(fallbackTrendPerDay) * 0.35
        );
        const medianGapDays = safeDynamicVolatility?.medianGapDays ?? 7;
        const fallbackDailyVolatility = Number.isFinite(mssdVolatility)
          ? mssdVolatility / Math.sqrt(Math.max(1, medianGapDays))
          : domain * 0.02;

        const posteriorInput = {
          ability: safeStateSpace?.ability ?? averageScore,
          abilitySd: safeStateSpace?.abilitySd ?? fallbackAbilitySd,
          trendPerDay: safeStateSpace?.trendPerDay ?? fallbackTrendPerDay,
          trendSd: safeStateSpace?.trendSd ?? fallbackTrendSd,
          dailyVolatility: safeDynamicVolatility?.dailyVolatility ?? fallbackDailyVolatility,
          horizonDays: effectiveMCDays,
          targetScore: effectiveMCTarget,
          minScore,
          maxScore,
          sampleSize: (lastNScores || []).length,
          baseProbability: baseMcProbability,
        };

        const posteriorSimulations = Math.max(
          300,
          Math.min(
            1500,
            Math.round((adaptiveSimCount || cfg.MC_SIMULATIONS || 800) * 0.75)
          )
        );

        const posteriorSeed = simpleHash(
          [
            categoryId || 'cat',
            (lastNScores || []).length,
            Math.round((Number.isFinite(averageScore) ? averageScore : 0) * 100),
            Math.round((Number.isFinite(effectiveMCTarget) ? effectiveMCTarget : 0) * 100),
            Math.round(Number.isFinite(effectiveMCDays) ? effectiveMCDays : 0),
            Math.round((Number.isFinite(mssdVolatility) ? mssdVolatility : 0) * 100),
            safeStateSpace ? 'ss1' : 'ss0',
            safeDynamicVolatility ? 'dv1' : 'dv0',
          ].join('|')
        );

        posteriorMc = estimatePosteriorPredictive(posteriorInput, {
          simulations: posteriorSimulations,
          seed: posteriorSeed,
          blendWithBase: !getCoachFeature(
            options,
            'usePosteriorMonteCarloOverride',
            false
          ),
        });

        if (posteriorMc && Number.isFinite(posteriorMc.probability)) {
          finalMcProbability = clamp(posteriorMc.probability, 0, 100);
          finalMcResult = {
            ...mcResult,
            probability: finalMcProbability,
            probabilityRaw: Number(
              (posteriorMc.probabilityRaw ?? finalMcProbability).toFixed(4)
            ),
            mean: Number.isFinite(posteriorMc.mean)
              ? posteriorMc.mean
              : mcResult.mean,
            ci95Low: Number.isFinite(posteriorMc.ciLow)
              ? posteriorMc.ciLow
              : mcResult.ci95Low,
            ci95High: Number.isFinite(posteriorMc.ciHigh)
              ? posteriorMc.ciHigh
              : mcResult.ci95High,
            volatility: Number.isFinite(safeDynamicVolatility?.volatility)
              ? clamp(safeDynamicVolatility.volatility, 0, maxScore)
              : mcResult.volatility,
            posteriorPredictive: posteriorMc,
            baseProbability: baseMcProbability,
          };
        }
      } catch (err) {
        console.warn('[CoachLogic] Posterior predictive Monte Carlo failed:', err);
        posteriorMc = null;
        finalMcResult = mcResult;
        finalMcProbability = baseMcProbability;
      }
    }

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
        stateSpace,
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
        baseMssdVolatility,
        dynamicVolatility,
        mcAdaptive,
        effectiveMCTarget,
        effectiveMCDays,
        globalBaselinePct,
        effectiveCfg,
        mcResult: finalMcResult,
        mcProbability: finalMcProbability,
        baseMcResult: mcResult,
        baseMcProbability: baseMcProbability,
        posteriorMc,
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
    // ✅ FIX: Adicionar validação de retention
    const safeRetention = Number.isFinite(forgetting.retentionPct)
        ? forgetting.retentionPct
        : 100;
    const memoryRisk = !hasData
        ? 8
        : clamp(35 * Math.pow(1 - safeRetention / 100, 1.5), 2, 35);
    const safeMssdVolatility = Number.isFinite(mssdVolatility)
        ? mssdVolatility
        : 0;
    const volatilityRiskPct = clamp((safeMssdVolatility / domain) * 100, 0, 35);
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
    // ✅ FIX: Verificar se metrics.referenceNow existe antes de usar
    const nowMs = Number.isFinite(metrics.referenceNow) ? metrics.referenceNow : Date.now();
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
    // ✅ PATCH-11 & 29: Validação explícita de decayK
    const rawLambda = metrics.mcAdaptive?.decayK;
    const currentLambda = (Number.isFinite(rawLambda) && rawLambda > 1e-6) ? rawLambda : 0.03;
    const dynamicWindowDays = Math.max(7, Math.min(90, Math.round((Math.LN2 / currentLambda) * 2)));
    const windowStart = (normalizeDate(metrics.referenceDate) || new Date()).getTime() - (dynamicWindowDays * MS_PER_DAY);
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
    // FIX: Removido fatigueRatio baseado em performance.
    // Notas altas já recebem urgência menor via SCORE_MAX (gap da meta).
    // Penalizar novamente aqui causava dupla penalização.
    if (exactHoursSinceLast < 24) {
        const recentFatigue = Math.max(0.2, Math.exp(-exactHoursSinceLast / 12));
        rotationPenalty = Math.min(30, 15 * recentFatigue * (1 + (mssdVolatility / maxScore)));
        const baseAt24 = mssdVolatility > (maxScore * 0.05) ? 6 : 2;
        rotationPenalty = Math.max(rotationPenalty, baseAt24 + 1);
    } else if (exactHoursSinceLast >= 24 && exactHoursSinceLast < 48 && !srsLabel) {
        rotationPenalty = mssdVolatility > (maxScore * 0.05) ? 6 : 2;
    }
    if (srsBoost > 0) rotationPenalty *= 0.1;
    const rawScore = Math.max(
        0,
        scoreComponent +
        recencyComponent +
        instabilityComponent +
        currentPriorityBoost +
        currentSrsBoost +
        mcUrgencyBoostClamped +
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
    const oneWeekAgo = (normalizeDate(metrics.referenceDate) || new Date()).getTime() - (7 * 24 * 60 * 60 * 1000);
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
            averageScore: safeFixedNumber(averageScore),
            globalProjectedMean: globalProjectedMean != null ? safeFixedNumber(globalProjectedMean, 1) : null,
            daysSinceLastStudy,
            standardDeviation: safeFixedNumber(mssdVolatility),
            mssdVolatility: safeFixedNumber(mssdVolatility),
            posteriorMonteCarlo: metrics.posteriorMc
              ? {
                  model: metrics.posteriorMc.model || null,
                  probability: safeFixedNumber(metrics.posteriorMc.probability),
                  probabilityRaw: safeFixedNumber(metrics.posteriorMc.probabilityRaw),
                  mean: safeFixedNumber(metrics.posteriorMc.mean),
                  ciLow: safeFixedNumber(metrics.posteriorMc.ciLow),
                  ciHigh: safeFixedNumber(metrics.posteriorMc.ciHigh),
                  horizonDays: safeFixedNumber(metrics.posteriorMc.horizonDays),
                  simulations: metrics.posteriorMc.simulations ?? null,
                  sampleTrust: safeFixedNumber(metrics.posteriorMc.sampleTrust, 4),
                  diagnostics: metrics.posteriorMc.diagnostics || null,
                  inputs: metrics.posteriorMc.inputs || null,
                }
              : null,
            dynamicVolatility: metrics.dynamicVolatility && Number.isFinite(metrics.dynamicVolatility.volatility)
              ? {
                  model: metrics.dynamicVolatility.model || null,
                  volatility: safeFixedNumber(metrics.dynamicVolatility.volatility),
                  modelVolatility: safeFixedNumber(metrics.dynamicVolatility.modelVolatility),
                  fallbackVolatility: safeFixedNumber(metrics.dynamicVolatility.fallbackVolatility),
                  dailyVolatility: safeFixedNumber(metrics.dynamicVolatility.dailyVolatility),
                  horizonDays: safeFixedNumber(metrics.dynamicVolatility.horizonDays),
                  medianGapDays: safeFixedNumber(metrics.dynamicVolatility.medianGapDays),
                  sampleSize: metrics.dynamicVolatility.sampleSize ?? null,
                  parameters: metrics.dynamicVolatility.parameters || null
                }
              : null,
            trend: safeFixedNumber(trend),
            totalHours: safeFixedNumber(totalHours),
            hasData,
            hasSimulados: relevantSimulados.length > 0,
            hasHighPriorityTasks,
            completionRate: safeFixedNumber(completionRate * 100, 1),
            balanceBridgeBoost: safeFixedNumber(balanceBridgeBoost),
            weight,
            srsLabel,
            isBurnoutRisk,
            crunchMultiplier: safeFixedNumber(crunchMultiplier),
            agilityPenalty: safeFixedNumber(agilityPenalty, 4),
            avgSeconds: metrics.avgSeconds || 0,
            monteCarlo: mcHasData ? {
                probability: safeFixedNumber(mcProbability),
                probabilityRaw: mcProbability,
                thresholds: {
                    danger: safeFixedNumber(adaptiveRisk?.danger),
                    safe: safeFixedNumber(adaptiveRisk?.safe)
                },
                riskLabel: mcRiskLabel,
                volatility: safeFixedNumber(mcResult?.volatility),
                meanProjected: safeFixedNumber(mcResult?.mean),
                effectiveMCTarget: safeFixedNumber(effectiveMCTarget),
                effectiveMCDays: Number.isFinite(Number(effectiveMCDays)) ? Number(effectiveMCDays) : 0,
                globalProjectedMean: globalProjectedMean != null ? safeFixedNumber(globalProjectedMean, 1) : null,
                diagnostics: mcResult?.diagnostics || null,
                ci95Low: safeFixedNumber(mcResult?.ci95Low),
                ci95High: safeFixedNumber(mcResult?.ci95High),
                urgencyBoost: safeFixedNumber(mcUrgencyBoost),
                calibrationPenalty: safeFixedNumber(mcResult?.calibrationPenalty, 4),
                avgBrier: safeFixedNumber(mcResult?.avgBrier, 4),
                ece: safeFixedNumber(mcResult?.ece, 4),
                reliability: Array.isArray(mcResult?.reliability) ? mcResult.reliability : [],
                explainability: {
                    confidenceAdjusted: (mcResult?.calibrationPenalty || 0) > 0,
                    confidenceAdjustmentPct: safeFixedNumber((mcResult?.calibrationPenalty || 0) * 100),
                    calibrationQuality: (mcResult?.avgBrier || 0) <= cfg.MC_CALIBRATION_BRIER_BASELINE
                        ? 'good'
                        : (mcResult?.avgBrier || 0) <= (cfg.MC_CALIBRATION_BRIER_BASELINE + 0.07) ? 'moderate' : 'low',
                    note: (mcResult?.calibrationPenalty || 0) > 0
                        ? 'Probabilidade ajustada para reduzir overconfidence após backtest interno.'
                        : 'Sem ajuste de calibração significativo.'
                }
            } : null,
            backtest: {
                rankQuality: safeFixedNumber(metrics.backtestWeights?.rankQuality, 4),
                uplift: safeFixedNumber(metrics.backtestWeights?.uplift, 4),
                scoreWeight: safeFixedNumber(metrics.backtestWeights?.scoreWeight, 3),
                recencyWeight: safeFixedNumber(metrics.backtestWeights?.recencyWeight, 3),
                instabilityWeight: safeFixedNumber(metrics.backtestWeights?.instabilityWeight, 3)
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
                balanceBridgeBoost: Number((balanceBridgeBoost * weightMultiplier).toFixed(2)),
            }
        }
    };
    // FIX: try/catch para o callback de calibração nunca quebrar o fluxo
    // ✅ FIX: Verificar se options.onCalibrationMetric é função antes de chamar e options é válido
    if (result.details?.monteCarlo && options && typeof options.onCalibrationMetric === 'function') {
        try {
            options.onCalibrationMetric({
                categoryId: metrics.categoryId || null,
                categoryName: metrics.safeCategory?.name || metrics.categoryName || 'Disciplina',
                timestamp: Date.now(),
                avgBrier: result.details.monteCarlo.avgBrier,
                ece: result.details.monteCarlo.ece,
                probability: result.details.monteCarlo.probability != null ? result.details.monteCarlo.probability / 100 : null,
                calibrationPenalty: result.details.monteCarlo.calibrationPenalty,
                reliability: result.details.monteCarlo.reliability || [],
                calibrationQuality: result.details.monteCarlo.explainability?.calibrationQuality || 'low'
            });
        } catch { /* não quebrar o fluxo principal */ }
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
        const refDateStr = options.now ? (getDateKey(options.now) || todayStr) : todayStr;
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
        const featuresHash = simpleHash(JSON.stringify({
            uss: getCoachFeature(options, 'useStateSpace', false),
            ussa: getCoachFeature(options, 'useStateSpaceAverage', false),
            usst: getCoachFeature(options, 'useStateSpaceTrend', false),
            udv: getCoachFeature(options, 'useDynamicVolatility', false),
            ugv: getCoachFeature(options, 'useGarchVolatility', false),
            udvo: getCoachFeature(options, 'useDynamicVolatilityOverride', false),
            ppm: getCoachFeature(options, 'usePosteriorMonteCarlo', false),
            ppmo: getCoachFeature(options, 'usePosteriorMonteCarloOverride', false),
            bt: getCoachFeature(options, 'useBayesianTopics', false),
            btu: getCoachFeature(options, 'useBayesianTopicsForUrgency', false),
            du: getCoachFeature(options, 'useDecisionUtility', false),
            dut: getCoachFeature(options, 'useDecisionUtilityForTopics', false),
            dubt: getCoachFeature(options, 'useDecisionUtilityForBestTask', false),
            bp: getCoachFeature(options, 'useBanditPlanner', false),
            llm: getCoachFeature(options, 'useLLMExplanations', false),
            kg: getCoachFeature(options, 'useKnowledgeGraph', false),
            kgt: getCoachFeature(options, 'useKnowledgeGraphForTopics', false),
            afsrs: getCoachFeature(options, 'useAdvancedFsrs', false),
            fsrsb: getCoachFeature(options, 'useFsrsForSrsBoost', false),
            fsrst: getCoachFeature(options, 'useFsrsTopicScheduling', false),
            eval: getCoachFeature(options, 'useEvaluationTelemetry', false),
            obs: getCoachFeature(options, 'useObservability', false),
            drift: getCoachFeature(options, 'useDriftGuard', false),
            health: getCoachFeature(options, 'useModelHealthTelemetry', false),
            driftAlerts: getCoachFeature(options, 'useDriftAlerts', false),
        }));
        // ✅ PATCH-13: Incluir hash da config customizada no cache key
        const configHash = options.config
            ? simpleHash(JSON.stringify(options.config))
            : 'defcfg';
        // FIX (BUG-13): cache key compacta via hashString64 (evita chave de 400+ chars e colisões)
        const cacheKeyRaw = JSON.stringify([
            activeId, catId, simCount, logCount, scoreChecksum,
            refDateStr, optKey, targetKey, lastSim, lastLog,
            tasksHash, weightsHash, globalHash, calibrationHash,
            goalKey, featuresHash, configHash,
            options.maxScore ?? 100, options.targetScore ?? 0
        ]);
        const cacheKey = `urg_${hashString64(cacheKeyRaw)}`;
        const cachedUrgency = cacheGet(_urgencyCache, cacheKey);
        if (cachedUrgency) {
            // FIX (BUG-14): deepClone robusto (preserva Date/Map/Set/undefined)
            return deepClone(cachedUrgency);
        }
        const metrics = extractMetrics(safeCat, safeSims, safeLogs, options);
        const scoreInfo = calculateUrgencyScore(metrics, options);
        const result = generateCoachStrings(scoreInfo.weightedRaw, scoreInfo.normalized, metrics, scoreInfo, options);
        // ==================== LOTE 8: EVALUATION SNAPSHOT ====================
        if (
          getCoachFeature(options, 'useEvaluationTelemetry', false) &&
          typeof options.onCoachEvaluationSnapshot === 'function'
        ) {
          try {
            options.onCoachEvaluationSnapshot({
              timestamp: Date.now(),
              categoryId: metrics.categoryId || null,
              categoryName: metrics.safeCategory?.name || null,
              normalizedScore: result.normalizedScore,
              probability: result.details?.monteCarlo?.probability ?? null,
              predictedMean:
                result.details?.monteCarlo?.meanProjected ??
                result.details?.averageScore ??
                null,
              targetScore: metrics.targetScore,
              maxScore: metrics.maxScore,
              strategyId: options.strategyId || null,
            });
          } catch {
            // ignore evaluation errors
          }
        }
        // ==================== LOTE 9: OBSERVABILITY SNAPSHOT ====================
        if (
          getCoachFeature(options, 'useObservability', false) &&
          typeof options.onCoachObservability === 'function'
        ) {
          try {
            const mcDetails = result.details?.monteCarlo || null;
            options.onCoachObservability({
              timestamp: Date.now(),
              categoryId: metrics.categoryId || null,
              categoryName: metrics.safeCategory?.name || null,
              normalizedScore: result.normalizedScore,
              probability: mcDetails?.probability ?? null,
              probabilityRaw: mcDetails?.probabilityRaw ?? null,
              avgBrier: mcDetails?.avgBrier ?? null,
              ece: mcDetails?.ece ?? null,
              calibrationPenalty: mcDetails?.calibrationPenalty ?? null,
              volatility: mcDetails?.volatility ?? result.details?.mssdVolatility ?? null,
              sampleSize: mcDetails?.sampleSize ?? null,
              reliability: Array.isArray(mcDetails?.reliability)
                ? mcDetails.reliability
                : [],
            });
          } catch {
            // observability must never break the Coach
          }
        }
        // ✅ FIX: Verificar se options.logger é função antes de chamar e options é válido
        if (options && typeof options.logger === 'function') {
            try {
                options.logger({ categoryId: metrics.categoryId, name: metrics.safeCategory?.name, urgency: result });
            } catch {
                // ignore
            }
        }
        cacheSet(_urgencyCache, URGENCY_CACHE_MAX, cacheKey, deepClone(result));
        return result;
    } catch (err) {
        console.error("[CoachLogic] Critical error in calculateUrgency:", err);
        return {
            score: 0,
            normalizedScore: 0,
            recommendation: "Erro no cálculo",
            details: {
                hasData: false,
                daysSinceLastStudy: 0,
                error: true,
                monteCarlo: null,
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
    // ✅ PATCH-33: Validar retentionPct contra NaN
    const safeRetention = Number.isFinite(risk.retentionPct) ? risk.retentionPct : 0;
    return {
        tendencia: safeRetention > 80 ? 'alta' : (safeRetention > 50 ? 'estável' : 'baixa'),
        confiabilidadeDosDados: historico.length > 5 ? 'alta' : 'média',
        projecaoRetencao: safeRetention
    };
}

export const getSuggestedFocus = (categories, simulados, studyLogs = [], options = {}) => {
    if (!categories || categories.length === 0) return null;
    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados, studyLogs, { ...options, allCategories: categories })
    })).sort((a, b) => {
        const valA = Number.isFinite(a.urgency?.normalizedScore) ? a.urgency.normalizedScore : -Infinity;
        const valB = Number.isFinite(b.urgency?.normalizedScore) ? b.urgency.normalizedScore : -Infinity;
        if (valA !== valB) return valB - valA;
        return String(a.id || '').localeCompare(String(b.id || ''));
    });
    const top = ranked[0];
    if (!top) return null;
    const maxScore = options.maxScore ?? 100;
    // FIX (BUG-14): deepClone robusto do urgency para evitar mutação do cache
    const clonedUrgency = top.urgency ? deepClone(top.urgency) : null;
    const result = {
        ...top,
        urgency: clonedUrgency,
        weakestTopic: getWeakestTopic(top, simulados, maxScore)
    };
    // ✅ FIX: Verificar se options.flashcardDue é número antes de comparar
    if (options && Number.isFinite(Number(options.flashcardDue)) && Number(options.flashcardDue) > 0) {
        result.flashcardDue = Number(options.flashcardDue);
        result.srsRecommendation = `Revisar ${Number(options.flashcardDue)} flashcards hoje para reforçar retenção e consistência.`;
        if (result.urgency) {
            result.urgency.srsDue = Number(options.flashcardDue);
        }
    }
    // ✅ FIX: Verificar se options.globalMcStats existe antes de acessar
    if (options && options.globalMcStats && Number.isFinite(options.globalMcStats.projectedMean)) {
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



    const userId = safeCat?.userId || safeSims[0]?.userId || 'default';
    const coachFeatureHash = simpleHash(JSON.stringify({
        bt: getCoachFeature(null, 'useBayesianTopics', false),
        btu: getCoachFeature(null, 'useBayesianTopicsForUrgency', false),
        du: getCoachFeature(null, 'useDecisionUtility', false),
        dut: getCoachFeature(null, 'useDecisionUtilityForTopics', false),
        dubt: getCoachFeature(null, 'useDecisionUtilityForBestTask', false),
        bp: getCoachFeature(null, 'useBanditPlanner', false),
        kg: getCoachFeature(null, 'useKnowledgeGraph', false),
        kgt: getCoachFeature(null, 'useKnowledgeGraphForTopics', false),
        afsrs: getCoachFeature(null, 'useAdvancedFsrs', false),
        fsrsb: getCoachFeature(null, 'useFsrsForSrsBoost', false),
        fsrst: getCoachFeature(null, 'useFsrsTopicScheduling', false),
    }));
    const hash = `${userId}-${lastSimTimestamp}-${openTasks}-${tasksHash}-${historyLen}-${maxScore}-${historyVolume}-${scoreChecksum.toFixed(1)}-${coachFeatureHash}`;
    const cacheKey = `isolate_${catId}_${hash}`;
    const cachedTopics = cacheGet(_topicsCache, cacheKey);
    if (cachedTopics) return deepClone(cachedTopics);
    const result = _buildSortedTopicsImpl(safeCat, safeSims, maxScore);
    cacheSet(_topicsCache, TOPICS_CACHE_MAX, cacheKey, deepClone(result));
    return deepClone(result);
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
                    date: entryDate.toISOString(),
                    // ✅ FIX (BUG-H05): Preservar maxScore no payload para FSRS
                    maxScore: maxScore
                });
                // ✅ PATCH-28: Limitar crescimento do array interno
                if (topicMap[name].scores.length > 20) {
                    topicMap[name].scores = topicMap[name].scores.slice(-10);
                }
            }
            if (entryDate > topicMap[name].lastSeen) {
                topicMap[name].lastSeen = entryDate;
            }
        });
    });
    tasks.forEach(task => {
        const name = String(task.topicName || task.topic || '').trim()
          || String(task.text || task.title || "").trim();
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
            hasTasks: !!data.hasTasks,
            scores: data.scores.slice(-8),
            lastSeen: data.lastSeen
        };
    });
    // ==================== LOTE 4: BAYESIAN TOPICS ====================
    let bayesianTopicMap = null;
    if (getCoachFeature(null, 'useBayesianTopics', false)) {
      try {
        const bayesianInput = topics.map(topic => ({
          name: topic.name,
          total: topic.total,
          percentage: topic.percentage,
          correct: topic.total > 0 ? (topic.percentage / 100) * topic.total : 0,
          trend: topic.trend,
          isUntested: topic.isUntested
        }));
        const bayesianResult = estimateTopicProficiencies(bayesianInput, {
          untestedPriorMean: 0.25,
          untestedPriorWeight: 0.45
        });
        bayesianTopicMap = new Map(
          bayesianResult.topics.map(t => [t.name, t])
        );
        topics.forEach(topic => {
          const bayes = bayesianTopicMap.get(topic.name);
          if (!bayes) return;
          topic.bayesian = bayes;
          topic.bayesianProficiency = bayes.proficiencyMean * 100;
          topic.bayesianEvidence = bayes.evidence;
          topic.bayesianUncertainty = bayes.uncertainty;
          if (getCoachFeature(null, 'useBayesianTopicsForUrgency', false)) {
            const weakness = clamp(1 - bayes.proficiencyMean, 0, 1);
            const uncertainty = clamp(bayes.uncertainty, 0, 1);
            const evidence = clamp(bayes.evidence, 0, 1);
            const bayesianBoost = (weakness * 0.65 + uncertainty * 0.35) * 70;
            topic.urgencyScore =
              topic.urgencyScore * (0.75 + 0.25 * evidence) +
              bayesianBoost;
            if (topic.isUntested) {
              const explorationFactor = 0.40 + 0.35 * uncertainty;
              topic.urgencyScore *= explorationFactor;
            }
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Bayesian topics failed:', err);
        bayesianTopicMap = null;
      }
    }
    // ==================== LOTE 5: DECISION UTILITY ====================
    let decisionTopicMap = null;
    if (getCoachFeature(null, 'useDecisionUtility', false)) {
      try {
        const decisionCandidates = topics.map(topic => {
          const bayesianProficiency = Number.isFinite(topic.bayesianProficiency)
            ? topic.bayesianProficiency
            : topic.percentage;
          const weakness = clamp(1 - (bayesianProficiency / 100), 0, 1);
          const uncertainty = Number.isFinite(topic.bayesianUncertainty)
            ? topic.bayesianUncertainty
            : (topic.total > 0
                ? clamp(10 / (topic.total + 10), 0, 1)
                : 0.85);
          const evidence = Number.isFinite(topic.bayesianEvidence)
            ? topic.bayesianEvidence
            : clamp(topic.total / (topic.total + 10), 0, 1);
          return {
            id: `topic:${topic.name}`,
            name: topic.name,
            type: 'topic',
            weakness,
            uncertainty,
            evidence,
            recencyDays: topic.daysSince,
            priority: topic.manualPriority >= 40
              ? 'high'
              : topic.manualPriority >= 20
                ? 'medium'
                : 'low',
            priorityValue: clamp((topic.manualPriority || 0) / 40, 0, 1),
            hasTasks: topic.hasTasks,
            completed: topic.completed,
            costMinutes: 35,
            fatigue: 100,
            weight: null
          };
        });
        const rankedDecisionTopics = rankDecisionCandidates(decisionCandidates, {
          useBandit: getCoachFeature(null, 'useBanditPlanner', false),
          seed: `topics-${topics.length}-${getDateKey(new Date())}`,
          explorationScale: 16
        });
        decisionTopicMap = new Map(
          rankedDecisionTopics.map(item => [item.name, item])
        );
        topics.forEach(topic => {
          const decisionItem = decisionTopicMap.get(topic.name);
          if (!decisionItem) return;
          topic.decisionUtility = decisionItem.decision?.utility ?? 0;
          topic.decisionScore = decisionItem.decisionScore ?? 0;
          topic.decisionExploration = decisionItem.explorationBonus ?? 0;
          topic.decisionComponents = decisionItem.decision?.components ?? null;
          if (getCoachFeature(null, 'useDecisionUtilityForTopics', false)) {
            topic.urgencyScore =
              topic.urgencyScore * 0.75 +
              topic.decisionUtility * 0.45;
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Decision utility topics failed:', err);
        decisionTopicMap = null;
      }
    }
    const useBayesianSort = getCoachFeature(null, 'useBayesianTopicsForUrgency', false);
    const useDecisionSort = getCoachFeature(null, 'useDecisionUtilityForTopics', false);
    // ==================== LOTE 7: FSRS + KNOWLEDGE GRAPH ====================
    if (getCoachFeature(null, 'useAdvancedFsrs', false)) {
      try {
        topics.forEach(topic => {
          topic.fsrs = estimateTopicFsrs(
            {
              name: topic.name,
              scores: topic.scores || [],
              lastSeen: topic.lastSeen,
              daysSince: topic.daysSince,
              total: topic.total,
              percentage: topic.percentage,
            },
            {
              maxScore,
              desiredRetention: 0.85,
            }
          );
          if (
            getCoachFeature(null, 'useFsrsTopicScheduling', false) &&
            topic.fsrs
          ) {
            const retentionRisk = clamp(
              1 - (topic.fsrs.retentionPct / 100),
              0,
              1
            );
            const dueBoost = topic.fsrs.due ? 10 : 0;
            topic.urgencyScore += retentionRisk * 18 + dueBoost;
            if (topic.fsrs.due) {
              topic.srsDue = true;
            }
          }
        });
      } catch (err) {
        console.warn('[CoachLogic] Advanced FSRS topics failed:', err);
      }
    }
    if (getCoachFeature(null, 'useKnowledgeGraph', false)) {
      try {
        const graphConfig = getKnowledgeGraphForCategory(
          category?.name || category?.id
        );
        if (graphConfig) {
          const graphInput = topics.map(topic => ({
            name: topic.name,
            proficiency: Number.isFinite(topic.bayesianProficiency)
              ? topic.bayesianProficiency / 100
              : topic.percentage / 100,
            evidence: Number.isFinite(topic.bayesianEvidence)
              ? topic.bayesianEvidence
              : clamp(topic.total / (topic.total + 10), 0, 1),
            total: topic.total,
          }));
          const graphMetrics = computeTopicGraphMetrics(graphInput, graphConfig);
          const graphMap = new Map(
            graphMetrics.topics.map(metric => [metric.name, metric])
          );
          topics.forEach(topic => {
            const metric = graphMap.get(topic.name);
            if (!metric) return;
            topic.graph = metric;
            if (getCoachFeature(null, 'useKnowledgeGraphForTopics', false)) {
              const importanceBoost = metric.graphImportance * 22;
              const prereqPenalty = (1 - metric.prereqReadiness) * 16;
              topic.urgencyScore =
                topic.urgencyScore + importanceBoost - prereqPenalty;
              if ((metric.blockedBy || []).length > 0) {
                topic.urgencyScore *= 0.92;
                topic.recommendedPrerequisites = metric.blockedBy;
              }
            }
          });
        }
      } catch (err) {
        console.warn('[CoachLogic] Knowledge graph topics failed:', err);
      }
    }
    topics.sort((a, b) => {
      const aNeedsAction = !a.completed && a.hasTasks;
      const bNeedsAction = !b.completed && b.hasTasks;
      const aProf = useBayesianSort && Number.isFinite(a.bayesianProficiency)
        ? a.bayesianProficiency
        : a.percentage;
      const bProf = useBayesianSort && Number.isFinite(b.bayesianProficiency)
        ? b.bayesianProficiency
        : b.percentage;
      let aBase = a.urgencyScore;
      let bBase = b.urgencyScore;
      if (
        useDecisionSort &&
        Number.isFinite(a.decisionScore) &&
        Number.isFinite(b.decisionScore)
      ) {
        aBase = (a.urgencyScore * 0.55) + (a.decisionScore * 0.45);
        bBase = (b.urgencyScore * 0.55) + (b.decisionScore * 0.45);
      }
      let aScore = aBase + (aNeedsAction ? 50 : 0);
      let bScore = bBase + (bNeedsAction ? 50 : 0);
      if (a.total > 0 && aProf < 40) aScore += 80;
      else if (a.total > 0 && aProf < 60) aScore += 40;
      if (b.total > 0 && bProf < 40) bScore += 80;
      else if (b.total > 0 && bProf < 60) bScore += 40;
      if (useBayesianSort) {
        const aEvidence = Number.isFinite(a.bayesianEvidence) ? a.bayesianEvidence : 0;
        const bEvidence = Number.isFinite(b.bayesianEvidence) ? b.bayesianEvidence : 0;
        if (a.total > 0) aScore += aEvidence * 15;
        if (b.total > 0) bScore += bEvidence * 15;
        if (a.total === 0) aScore -= 12;
        if (b.total === 0) bScore -= 12;
      } else {
        if (a.total === 0) aScore -= 25;
        if (b.total === 0) bScore -= 25;
      }
      if (useDecisionSort) {
        const aDecision = Number.isFinite(a.decisionUtility) ? a.decisionUtility : 0;
        const bDecision = Number.isFinite(b.decisionUtility) ? b.decisionUtility : 0;
        aScore += aDecision * 0.20;
        bScore += bDecision * 0.20;
      }
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

        // ✅ FIX: Verificar se category.id existe antes de filtrar
        const categoryId = category?.id;
        const recentLogs = categoryId
            ? safeStudyLogs.filter(l =>
                l?.categoryId === categoryId &&
                (normalizeDate(l?.date) || new Date(0)).getTime() >= cutoffTime
              )
            : [];

        // ✅ FIX: Verificar se category.name existe antes de normalizar
        const catName = category?.name;
        const catNormalized = catName ? normalize(catName) : '';
        const recentSims = catNormalized
            ? safeSimulados.filter(s =>
                normalize(s?.subject) === catNormalized &&
                (normalizeDate(s?.date || s?.createdAt) || new Date(0)).getTime() >= cutoffTime
              )
            : [];

        const totalHours = recentLogs.reduce((acc, l) => acc + sanitizeMinutes(l?.minutes), 0) / 60;
        const totalQuestions = recentSims.reduce((acc, s) => acc + (Number(s?.total) || getSyntheticTotal(maxScore)), 0);
        const questionsPerHour = totalHours >= 0.25 ? totalQuestions / totalHours : 0;
        const dynamicThreshold = totalHours >= 20 ? 30 : totalHours >= 10 ? 20 : 12;

        // ✅ FIX: Validar averageScore antes de calcular normalizedScore
        const safeAverageScore = Number.isFinite(averageScore) ? averageScore : 0;
        const normalizedScore = maxScore > 0 ? (safeAverageScore / maxScore) * 100 : 0;
        const isFormingBase = normalizedScore < 45;

        if (totalHours > 5 && questionsPerHour < dynamicThreshold && !isFormingBase) {
            return {
                isTrap: true,
                msg: `⚠️ Alerta de Método: Estudou ${totalHours.toFixed(1)}h de ${catName || 'matéria'} mas resolveu poucas questões (${questionsPerHour.toFixed(1)}/h). O seu nível atual exige prática >${dynamicThreshold}/h.`
            };
        }
        return { isTrap: false };
    };
    let allGeneratedTasks = [];
    // ✅ PATCH-10: Contador explícito e global para o label prioritário
    let globalPriorityCounter = 0;
    const tasksPerCategory = topCategories.length < 5 ? 3 : (topCategories.length < 8 ? 2 : 1);
    topCategories.forEach((cat) => {
        const weakTopics = getWeakestTopicsList(cat, safeSimulados, maxScore, tasksPerCategory);
        const mc = cat.urgency?.details?.monteCarlo;
        const iterations = tasksPerCategory;
        const getPriorityLabel = () => {
            if (globalPriorityCounter < 3) {
                globalPriorityCounter++;
                return '[PROTOCOLO PRIORITÁRIO] ';
            }
            return '';
        };
        const adaptiveDanger = mc?.thresholds?.danger || cfg.MC_PROB_DANGER;
        const adaptiveSafe = mc?.thresholds?.safe || cfg.MC_PROB_SAFE;
        const mcProbKey = mc ? Math.round(mc.probabilityRaw) : '0';
        const mcVolKey = mc ? Math.round(mc.volatility * 100) : '0';
        // ✅ FIX: sufixo determinístico — sem Date.now() (IDs estáveis p/ Planner/dedupe)
        const mcIdSuffix = hashString64(`${cat.id}|${mcProbKey}|${mcVolKey}|${cat.urgency?.normalizedScore ?? 0}`);
        // Ordem corrigida: crítico > caos > SRS > cruzeiro > trap
        if (mc && mc.probabilityRaw < adaptiveDanger) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                id: `${cat.id}-mc-danger-${mcProbKey}-${mcIdSuffix}`,
                text: `${cat.name}: [ALERTA MESTRE] 🚨 VETOR CRÍTICO! Projeção matemática indica colapso de performance.`,
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
        } else if (mc && mc.volatility > cfg.MC_VOLATILITY_HIGH * (maxScore / 100) && mc.probabilityRaw < adaptiveSafe) {
            const probPct = Math.round(mc.probabilityRaw);
            allGeneratedTasks.push({
                id: `${cat.id}-mc-chaos-${mcVolKey}-${mcProbKey}-${mcIdSuffix}`,
                text: `${cat.name}: [ALERTA MESTRE] 🌪️ OSCILAÇÃO ESTATÍSTICA: Padrão imprevisível detectado.`,
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
                text: `${cat.name}: [${srsTopic}]`,
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
                text: `${cat.name}: [Manutenção - ${cat.name}]`,
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
                text: `${cat.name}: [Prática Intensiva de Questões]`,
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
        // ✅ PATCH-12: Validar avgSeconds explicitamente
        const avgSeconds = Number.isFinite(agilityData?.avgSeconds) ? agilityData.avgSeconds : 0;
        const targetSeconds = 120;
        const isAgilityProblem = (avgSeconds > targetSeconds + 30) && (cat.urgency?.normalizedScore >= 75);
        if (isAgilityProblem) {
            allGeneratedTasks.push({
                id: `${cat.id}-agility-${avgSeconds}`,
                text: `${cat.name}: [Treino de Agilidade - Cronômetro]`,
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
                ? (`${weakTopic.name.replace(/\s/g, '').substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}-${weakTopic.total || 0}-${i}`)
                : `geral-${i}`;
            if (weakTopic) {
                let reasonStr = "";
                let topicPriority = 'medium';
                if (weakTopic.isUntested) {
                    reasonStr = "Tópico Novo / Não Testado";
                    topicPriority = 'medium';
                } else if (weakTopic.percentage < 40) {
                    reasonStr = "Vetor Crítico de Erros";
                    topicPriority = 'high';
                } else if (weakTopic.percentage < 60) {
                    reasonStr = "Lacuna de Conhecimento";
                    topicPriority = 'medium';
                } else if (weakTopic.trend < -2) {
                    reasonStr = "Degradação Recente";
                    topicPriority = 'medium';
                } else {
                    reasonStr = "Consolidação Estratégica";
                    topicPriority = 'low';
                }

                allGeneratedTasks.push({
                    id: `${cat.id}-topic-${uniqueIdSuffix}`,
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
                        reason: reasonStr,
                        details: `Aproveitamento: ${Number(weakTopic.percentage || 0).toFixed(0)}% | Última visita: ${weakTopic.daysSince ?? 0} dias | Tendência: ${Number(weakTopic.trend || 0) > 0 ? '+' : ''}${Number(weakTopic.trend || 0).toFixed(1)}`,
                        metrics: cat.urgency?.details?.humanReadable || {},
                        monteCarlo: mc || null,
                        verdict: `Priorize ${weakTopic.name} — ${reasonStr}.`
                    }
                });

            } else {
                allGeneratedTasks.push({
                    id: `${cat.id}-geral-${i}-${hashString(`${cat.id}|geral|${i}`)}`,
                    text: `${cat.name}: ${getPriorityLabel()}[Revisão Geral Complementar]`,
                    completed: false,
                    status: 'pending',
                    priority: 'low',
                    categoryId: cat.id,
                    category: cat.name,
                    catName: cat.name,
                    subjectName: cat.name,
                    topicName: 'Revisão Geral Complementar',
                    analysis: {
                        reason: "Cobertura Geral",
                        details: "Sem tópico fraco específico — mantenha a revisão geral em dia.",
                        metrics: cat.urgency?.details?.humanReadable || {},
                        monteCarlo: mc || null,
                        verdict: "Revisão geral leve para manutenção."
                    }
                });

            }
        }
    });

    // ✅ CORREÇÃO — manter a versão mais recente de cada ID
    const taskMap = new Map();
    for (const t of allGeneratedTasks) {
      if (!t || !t.id) continue;
      
      const existing = taskMap.get(t.id);
      if (!existing) {
        taskMap.set(t.id, t);
        continue;
      }
      
      // Se já existe, manter o mais recente (por lastUpdated ou createdAt)
      const toTime = (d) => (normalizeDate(d) || new Date(0)).getTime();
      const existingTime = toTime(existing.lastUpdated || existing.createdAt);
      const newTime = toTime(t.lastUpdated || t.createdAt);
      
      if (newTime > existingTime) {
        taskMap.set(t.id, t); // substitui pela versão mais nova
      }
    }

    const dedupedTasks = Array.from(taskMap.values());

    return dedupedTasks;
};

export const getCognitiveState = (studyLogs = [], options = {}) => {
    // ✅ FIX BUG-43: filtrar elementos inválidos ANTES de processar
    const safeLogs = safeArray(studyLogs).filter(log => {
        if (!log || typeof log !== 'object') return false;
        // Requer pelo menos uma data válida
        const hasDate = log.date || log.createdAt || log.lastUpdated;
        if (!hasDate) return false;
        // Data deve ser parseável
        const parsed = normalizeDate(hasDate);
        return parsed && !Number.isNaN(parsed.getTime());
    });

    let referenceDate = new Date();
    if (options.now) {
        const parsed = normalizeDate(options.now);
        if (parsed && !Number.isNaN(parsed.getTime())) {
            referenceDate = parsed;
        }
    }
    const nowMs = referenceDate.getTime();
    const todayKey = getDateKey(referenceDate);

    const minutesToday = safeLogs
        .filter(l => getDateKey(l?.date) === todayKey)
        .reduce((acc, l) => acc + sanitizeMinutes(l.minutes), 0);

    const last7DaysLogs = safeLogs.filter(l => {
        const t = (normalizeDate(l?.date) || new Date(0)).getTime();
        return t > 0 && (nowMs - t) <= 7 * MS_PER_DAY;
    });
    const hours7d = last7DaysLogs.reduce((acc, l) => acc + sanitizeMinutes(l.minutes), 0) / 60;

    const dailyLoad = Math.min(1, (minutesToday / 60) / 6);
    const weeklyLoad = Math.min(1, hours7d / 40);
    const fatigue = clamp(Math.round((dailyLoad * 0.6 + weeklyLoad * 0.4) * 100), 0, 100);

    const streakDays = new Set(last7DaysLogs.map(l => getDateKey(l?.date)).filter(Boolean)).size;
    const focus = clamp(Math.round((streakDays / 7) * 100), 0, 100);

    let recommendation = 'Ritmo saudável — mantenha o plano.';
    if (fatigue > 75) recommendation = 'Carga cognitiva alta — prefira revisões leves hoje.';
    else if (fatigue > 50) recommendation = 'Carga moderada — alterne blocos curtos com pausas.';
    else if (focus < 30) recommendation = 'Consistência baixa — comece com um bloco curto para retomar o ritmo.';

    return {
        fatigue,
        focus,
        streakDays,
        minutesToday: Math.round(minutesToday),
        hours7d: Number(hours7d.toFixed(2)),
        recommendation
    };
};

export const getBestTask = (categories = [], excludeTaskId = null) => {
    const safeCategories = safeArray(categories);
    const priorityWeight = { high: 3, medium: 2, low: 1 };

    const candidates = [];
    safeCategories.forEach(cat => {
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
        tasks.forEach(task => {
            if (!task || task.completed === true) return;
            if (String(task.status || '').toLowerCase() === 'completed') return;
            const id = task.id || task.text || '';
            if (excludeTaskId && id === excludeTaskId) return;
            candidates.push({ ...task, id, catName: cat?.name || task.catName || '', _originalIndex: candidates.length });
        });
    });

    if (candidates.length === 0) return null;

    // FIX: sort estável e seguro (peso de prioridade → tem analysis → ordem original)
    candidates.sort((a, b) => {
        const pa = priorityWeight[a.priority] ?? 2;
        const pb = priorityWeight[b.priority] ?? 2;
        if (pb !== pa) return pb - pa;
        const aa = a.analysis ? 1 : 0;
        const ab = b.analysis ? 1 : 0;
        if (ab !== aa) return ab - aa;
        return (a._originalIndex ?? 0) - (b._originalIndex ?? 0);
    });

    return candidates[0];
};

export const getCoachInsight = (category, simulados = [], studyLogs = [], options = {}) => {
  const fallback = {
    text: "Dados insuficientes para análise.",
    parts: [],
    trend: 0,
    volatility: 0,
    probability: null,
    error: false,
  };
  
  try {
    const urgency = calculateUrgency(category, simulados, studyLogs, options);
    if (!urgency) return { ...fallback, error: true, text: "Erro ao calcular urgência." };
    
    const details = urgency?.details || {};
    const mc = details.monteCarlo;
    const trend = Number(details.trend) || 0;
    const vol = Number(details.mssdVolatility) || 0;
    
    const parts = [];
    if (mc && Number.isFinite(mc.probability)) {
      parts.push(`chance de meta em ${Math.round(mc.probability)}%`);
    }
    parts.push(trend > 0.5 ? "tendência positiva" : trend < -0.5 ? "tendência negativa" : "estável");
    
    if (vol > 15) parts.push("alta volatilidade");
    
    return {
      text: parts.join(" · "),
      parts,
      trend,
      volatility: vol,
      probability: mc?.probability ?? null,
      error: false,
    };
  } catch (err) {
    console.error("[getCoachInsight] Erro:", err);
    return { 
      ...fallback, 
      error: true, 
      text: "Erro ao gerar insight. Verifique console." 
    };
  }
};

export function getCombinedHistory(history, simulados, maxScore = 100) {
    const deduplicatedMap = new Map();
    const allSimulados = safeArray(simulados);

    allSimulados.forEach((s, idx) => {
        const safeScore = getSafeScore(s, maxScore);
        const safeScoreStr = Number.isFinite(safeScore) ? String(Math.round(safeScore * 100)) : '0';
        const key = `${s.id || `sim-no-id-${idx}`}|${s.date || s.createdAt}|${safeScoreStr}`;
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
            const score = (stats.correct / stats.total) * maxScore;
            const safeScoreStr = Number.isFinite(score) ? String(Math.round(score * 100)) : '0';
            const key = `legacy-${dKey}|${dKey}|${safeScoreStr}`;
            if (!deduplicatedMap.has(key)) {
                deduplicatedMap.set(key, {
                    id: `legacy-${dKey}`,
                    date: dKey,
                    score: Number.isFinite(score) ? score : 0,
                    type: 'simulado'
                });
            }
        }
    });

    return getSortedHistory(Array.from(deduplicatedMap.values()));
}

export { getWeakestTopic, getWeakestTopicsList };

