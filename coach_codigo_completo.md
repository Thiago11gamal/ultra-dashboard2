# Código Completo do Coach AI Core

## [src/utils/coachLogic.js](file:///d:/Downloads/ultra-patched/src/utils/coachLogic.js)

```javascript
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
import { cleanCoachTags } from './coachText.js';
import { safeArray, getCalibrationKey, hashString } from './coachSafe.js';

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

// simpleHash moved to coachSafe.js as hashString (canonical)
const simpleHash = hashString;

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

    // FIX: SRS boost contínuo em vez de discreto 3-níveis.
    // Curva power-law inversamente proporcional à retenção.
    // retention=0% → boost=32, retention=30% → boost=21.3, retention=55% → boost=10.5, retention=75% → boost=0
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

    // FIX: memoryRisk contínuo em vez de discreto 3-níveis.
    // Elimina descontinuidades no componente de recência.
    const memoryRisk = !hasData
        ? 8
        : clamp(35 * Math.pow(1 - forgetting.retentionPct / 100, 1.5), 2, 35);

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
    // FIX: Removido fatigueRatio baseado em performance.
    // Notas altas já recebem urgência menor via SCORE_MAX (gap da meta).
    // Penalizar novamente aqui causava dupla penalização.
    const fatigueRatio = 1.0;

    if (exactHoursSinceLast < 24) {
        const recentFatigue = Math.max(0.2, Math.exp(-exactHoursSinceLast / 12));
        rotationPenalty = Math.min(30, 15 * recentFatigue * (1 + (mssdVolatility / maxScore)) * fatigueRatio);
        
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
        let cleanTitle = cleanCoachTags(rawText)
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
            const score = (stats.correct / stats.total) * maxScore;
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
```

## [src/utils/coachAdaptive.js](file:///d:/Downloads/ultra-patched/src/utils/coachAdaptive.js)

```javascript
import { monteCarloSimulation } from '../engine/monteCarlo.js';
import { getSafeScore } from './scoreHelper.js';
import { computeBrierScore, summarizeCalibration, shrinkProbabilityToNeutral, computeCalibrationDiagnostics, fitIsotonicCalibration, predictIsotonicProbability, calibrateWithBBQ, conformalizedCalibrationInterval, computeStackingWeights } from './calibration.js';
import { getDateKey, safeDateParse } from './dateHelper.js';
import { kahanSum } from '../engine/math/kahan.js';
import { detectDataAnomalies } from '../engine/diagnostics.js';
import { pruneHistoryForMemory } from '../engine/stats.js';
import { safeArray, toFiniteNumber, hashString } from './coachSafe.js';

// hashString moved to coachSafe.js (canonical)

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
  const minBoost = toFiniteNumber(cfg.MC_BOOST_SAFE_PENALTY, -8);

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
  else riskLabel = 'safe';

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
  const neutralPct = toFiniteNumber(cfg.MC_CALIBRATION_NEUTRAL_PCT, 50);
  const maxAppliedPenalty = toFiniteNumber(cfg.MC_CALIBRATION_MAX_APPLIED_PENALTY, 0.5);

  const sumCorrect = history.reduce((acc, h) => acc + Number(h.score || 0), 0);

  const sequenceChecksum = history.reduce((acc, h, idx) => {
    const score = Number(h.score || 0);
    const date = String(h?.date || '');
    const subject = String(h?.subject || '');

    let charSum = 0;
    const token = `${date}|${subject}`;

    for (let i = 0; i < token.length; i++) {
      charSum += token.charCodeAt(i);
    }

    return acc + ((idx + 1) * Math.round(score * 100)) + charSum;
  }, 0);

  const firstDate = history[0]?.date || '';
  const lastDate = history[history.length - 1]?.date || '';
  const calibHash = `${cfg.MC_CALIBRATION_BRIER_BASELINE ?? ''}-${cfg.MC_CALIBRATION_MAX_PENALTY ?? ''}-${cfg.MC_CALIBRATION_NEUTRAL_PCT ?? ''}-${cfg.MC_CALIBRATION_MAX_APPLIED_PENALTY ?? ''}-${cfg.MC_ENABLE_ADAPTIVE_CALIBRATION !== false}`;
  const adaptiveHash = adaptive
    ? [
        adaptive.mcSimulations || 0,
        adaptive.decayK || 0,
        Number(adaptive.calibrationBaseline || 0).toFixed(4),
        Number(adaptive.calibrationMaxPenalty || 0).toFixed(4)
      ].join('-')
    : 'no-adapt';
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
      { maxScore, agilityPenalty, globalBaselinePct: neutralPct }
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
            { maxScore, agilityPenalty, globalBaselinePct: neutralPct }
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
    
    const lowSampleShrink = history.length < lowSampleThreshold
      ? Math.min(0.35, (lowSampleThreshold - history.length) / lowSampleThreshold)
      : 0;

    const anomalyShrink = Math.min(0.2, dataIssues * 0.05);

    const totalShrink = Math.min(
      0.65,
      calibrationPenalty + lowSampleShrink + anomalyShrink
    );

    const probability = enableAdaptiveCalibration
      ? shrinkProbabilityToNeutral(
          stackedProb01 * 100,
          totalShrink,
          neutralPct,
          maxAppliedPenalty
        )
      : (stackedProb01 * 100);
    
    let ciLow = Number(result.ci95Low) || 0;
    let ciHigh = Number(result.ci95High) || 0;

    if (ciLow > ciHigh) {
      [ciLow, ciHigh] = [ciHigh, ciLow];
    }

    const ciMid = (ciLow + ciHigh) / 2;
    const ciExpand = 1 + Math.max(0, totalShrink * 1.2);
    const widenedCiLow = Math.max(0, ciMid - ((ciMid - ciLow) * ciExpand));
    const widenedCiHigh = Math.min(maxScore, ciMid + ((ciHigh - ciMid) * ciExpand));
    
    const conformal = conformalizedCalibrationInterval(stackedProb01, predObsPairs, 0.1);
    
    const finalResult = {
      diagnostics: result?.diagnostics || null,
      probability,
      probabilityRaw: stackedProb01 * 100,
      shrinkTotal: Number(totalShrink.toFixed(4)),
      lowSampleShrink: Number(lowSampleShrink.toFixed(4)),
      anomalyShrink: Number(anomalyShrink.toFixed(4)),
      targetScore: safeTargetScore,
      volatility: (Number(result.volatility) || 0) * (1 + (enableAdaptiveCalibration ? calibrationPenalty * 0.8 : 0)),
      mean: result.mean,
      ci95Low: widenedCiLow,
      ci95High: widenedCiHigh,
      calibrationPenalty,
      avgBrier,
      ece,
      reliability,
      sampleSize: history.length,
      lowSampleAdjustment: Number(totalShrink.toFixed(4)),
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

```

## [src/utils/coachText.js](file:///d:/Downloads/ultra-patched/src/utils/coachText.js)

```javascript
import { displaySubject, displayTopic } from './displaySubject';

export const RX_SYSTEM_ALERT_TEST = /\[(ALERTA MESTRE|STATUS)\]/i;
export const RX_SYSTEM_ALERT_GLOBAL = /\[(ALERTA MESTRE|STATUS)\]/gi;
export const RX_PROTOCOLO_GLOBAL = /\[PROTOCOLO PRIORITÁRIO\]\s*/gi;
export const RX_BRACKET_TOPIC = /^\[(.*?)\]\s*([\s\S]*)$/i;
export const RX_REC_MARKUP = /(\*\*.*?\*\*|!!.*?!!|\+\+.*?\+\+)/g;
export const RX_BOLD = /(\*\*.*?\*\*)/g;

export const RX_NOISE_ACTION =
  /Revisão Geral Complementar.*|Revisão Complementar.*|CRUZEIRO SEGURO.*|Revisão Necessária.*|ANOMALIA.*|TREINO RÁPIDO.*|\(Novo\).*|\(Prioridade\).*|% de acerto.*/gi;

export function isSystemAlertTask(value) {
  const text =
    typeof value === 'string'
      ? value
      : value?.text || value?.title || '';

  return RX_SYSTEM_ALERT_TEST.test(String(text || ''));
}

export function cleanCoachTags(text) {
  return String(text || '')
    .replace(RX_PROTOCOLO_GLOBAL, '')
    .replace(RX_SYSTEM_ALERT_GLOBAL, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeTaskStatus(task) {
  if (!task) return 'pending';

  if (task.completed === true) return 'completed';

  const status = String(task.status || '').toLowerCase();

  if (['completed', 'done', 'concluido', 'concluído'].includes(status)) {
    return 'completed';
  }

  if (['studying', 'active', 'in_progress', 'doing', 'em_estudo'].includes(status)) {
    return 'studying';
  }

  return 'pending';
}

export function normalizeTaskPriority(task, action = '', isSystemAlert = false) {
  const raw = String(task?.text || task?.title || '');

  if (/\[PROTOCOLO PRIORITÁRIO\]/i.test(raw) || isSystemAlert) return 'high';
  if (task?.priority === 'high') return 'high';
  if (task?.priority === 'low') return 'low';
  if (task?.priority === 'medium') return 'medium';

  if (/ALERTA|CRÍTICO|VETOR CRÍTICO/i.test(action)) return 'high';

  return 'medium';
}

export function parseCoachTask(task, categories = []) {
  const raw = String(task?.text || task?.title || '');
  const isSystemAlert = isSystemAlertTask(raw);
  const clean = cleanCoachTags(raw);

  const separatorIndex = clean.indexOf(':');
  const hasSeparator = separatorIndex !== -1;

  let subjectRaw = String(
    task?.subjectName ||
    task?.category ||
    task?.catName ||
    (hasSeparator ? clean.slice(0, separatorIndex) : clean)
  )
    .replace(/^Foco em\s*/i, '')
    .trim();

  let action = hasSeparator ? clean.slice(separatorIndex + 1).trim() : clean;

  const bracketMatch = action.match(RX_BRACKET_TOPIC);
  let topicRaw = String(task?.topicName || '').trim();

  if (bracketMatch) {
    if (!topicRaw) topicRaw = bracketMatch[1].trim();
    action = bracketMatch[2].trim();
  }

  action = action.replace(RX_NOISE_ACTION, '').trim();

  if (!topicRaw) {
    topicRaw = action || subjectRaw || 'Revisão Geral';
  }

  if (
    topicRaw.toLowerCase() === subjectRaw.toLowerCase() &&
    !task?.topicName &&
    !task?.analysis?.label
  ) {
    topicRaw = 'Revisão Geral';
  }

  const status = normalizeTaskStatus(task);
  const priority = normalizeTaskPriority(task, action, isSystemAlert);

  return {
    raw,
    isSystemAlert,
    subjectRaw,
    subject: displaySubject(subjectRaw, categories),
    topicRaw,
    topic: displayTopic(topicRaw),
    action,
    status,
    priority,
    isCompleted: status === 'completed',
    isStudying: status === 'studying'
  };
}

```

## [src/utils/coachSafe.js](file:///d:/Downloads/ultra-patched/src/utils/coachSafe.js)

```javascript
export function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

export function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function getCalibrationKey(id) {
  return String(id ?? '').trim().toLowerCase();
}

export function hashString(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

```

## [src/utils/coachBacktest.js](file:///d:/Downloads/ultra-patched/src/utils/coachBacktest.js)

```javascript
export function computeNDCGAtK(predicted = [], actual = [], k = 5) {
  const topK = Math.max(1, Math.min(k, predicted.length));
  const actualMap = new Map(actual.map((x) => [x.id, Number(x.relevance) || 0]));

  const dcg = predicted.slice(0, topK).reduce((acc, item, idx) => {
    const rel = actualMap.get(item.id) || 0;
    return acc + ((2 ** rel - 1) / Math.log2(idx + 2));
  }, 0);

  const ideal = [...actual].sort((a, b) => (Number(b.relevance) || 0) - (Number(a.relevance) || 0));
  const idcg = ideal.slice(0, topK).reduce((acc, item, idx) => {
    const rel = Number(item.relevance) || 0;
    return acc + ((2 ** rel - 1) / Math.log2(idx + 2));
  }, 0);

  return idcg > 0 ? dcg / idcg : 0;
}

export function computeUplift(control = [], treatment = []) {
  if (control.length === 0 || treatment.length === 0) return 0;
  const meanControl = control.reduce((a, b) => a + b, 0) / control.length;
  const meanTreatment = treatment.reduce((a, b) => a + b, 0) / treatment.length;
  return meanTreatment - meanControl;
}

export function computeCalibratedError(probability, actual) {
  const p = Math.max(0, Math.min(1, Number(probability) || 0));
  const yRaw = Number(actual);
  const y = Number.isFinite(yRaw) ? (yRaw >= 0.5 ? 1 : 0) : (actual === true ? 1 : 0);
  return Math.abs(p - y);
}

export function compareStrategyRuns(runA = {}, runB = {}, metrics = ['ndcg']) {
  const results = { delta: {}, winner: null };
  if (metrics.includes('ndcg')) {
    const predictedA = Array.isArray(runA.predicted) ? runA.predicted : [];
    const actualA = Array.isArray(runA.actual) ? runA.actual : [];
    const predictedB = Array.isArray(runB.predicted) ? runB.predicted : [];
    const actualB = Array.isArray(runB.actual) ? runB.actual : [];
    const ndcgA = computeNDCGAtK(predictedA, actualA, 5);
    const ndcgB = computeNDCGAtK(predictedB, actualB, 5);
    results.delta.ndcg = ndcgB - ndcgA;
    results.winner = ndcgB > ndcgA ? 'B' : (ndcgA > ndcgB ? 'A' : 'tie');
  }
  return results;
}

```

## [src/utils/explanationEngine.js](file:///d:/Downloads/ultra-patched/src/utils/explanationEngine.js)

```javascript
// ==========================================
// HUMAN EXPLANATION ENGINE
// Traduz telemetria matemática em linguagem natural
// ==========================================

export function buildHumanExplanation({
    calibrationPenalty,
    volatility,
    trend,
    confidenceTier,
    intervalWidth,
}) {
    const messages = [];

    if (confidenceTier === 'HIGH') {
        messages.push('Seu desempenho recente está consistente.');
    }

    if (volatility > 15) {
        messages.push('Suas notas recentes oscilaram bastante.');
    }

    if (trend > 5) {
        messages.push('Seu desempenho mostrou melhora recente.');
    }

    if (trend < -5) {
        messages.push('Seu desempenho recente apresentou queda.');
    }

    if (calibrationPenalty > 0.08) {
        messages.push('O sistema ampliou a margem de incerteza para evitar excesso de confiança.');
    }

    if (intervalWidth > 40) {
        messages.push('A faixa provável ficou mais ampla devido à alta variabilidade recente.');
    }

    return messages;
}

export function getConfidenceTier({
    calibrationPenalty,
    volatility,
    sampleSize,
}) {
    // Tolerância adaptativa: volatility is absolute standard deviation, max 100
    // calibrationPenalty is between 0 and 1. 0.1 means 10% penalty.
    const instability = (calibrationPenalty * 100) + (volatility * 0.2);

    if (sampleSize < 3) {
        return {
            tier: 'LOW',
            label: 'Baixa confiabilidade (Poucos dados)',
            color: '#ef4444',
            glow: 'shadow-red-500/30',
        };
    }

    if (instability < 18) {
        return {
            tier: 'HIGH',
            label: 'Alta confiabilidade',
            color: '#22c55e',
            glow: 'shadow-green-500/30',
        };
    }

    if (instability < 35) {
        return {
            tier: 'MEDIUM',
            label: 'Confiabilidade moderada',
            color: '#f59e0b',
            glow: 'shadow-yellow-500/30',
        };
    }

    return {
        tier: 'LOW',
        label: 'Baixa confiabilidade',
        color: '#ef4444',
        glow: 'shadow-red-500/30',
    };
}

export function detectPerformanceDrift({
    recentMean,
    baselineMean,
    recentVolatility,
    maxScore = 100,
}) {
    const alerts = [];
    const scale = maxScore / 100;

    if (recentMean < baselineMean - (12 * scale)) {
        alerts.push({
            type: 'performance_drop',
            severity: 'high',
            message: 'Seu desempenho recente caiu significativamente.',
        });
    }

    if (recentVolatility > (20 * scale)) {
        alerts.push({
            type: 'high_volatility',
            severity: 'medium',
            message: 'Suas notas recentes estão muito instáveis.',
        });
    }

    return alerts;
}

export function buildPredictionMood({
    probability,
    confidenceTier,
}) {
    if (probability >= 80 && confidenceTier === 'HIGH') {
        return 'stable';
    }
    if (probability >= 50 && probability < 80) {
        return 'moderate';
    }
    if (probability < 50 && probability > 0) {
        return 'risk';
    }
    return 'unknown';
}

export function normalizeAlertSeverity(severity, confidenceTier) {
    if (severity === 'high' && confidenceTier === 'LOW') {
        return {
            color: '#f59e0b',
            label: 'Atenção moderada',
            glow: 'shadow-orange-500/20'
        };
    }
    return {
        color: '#ef4444',
        label: 'Alerta importante',
        glow: 'shadow-red-500/20'
    };
}

export function smoothConfidenceTier({ previousTier, currentTier, stabilityCounter = 0 }) {
    if (previousTier && previousTier !== currentTier && stabilityCounter < 3) {
        return { tier: previousTier, stabilityCounter: stabilityCounter + 1 };
    }
    return { tier: currentTier, stabilityCounter: 0 };
}

export function humanizeVolatility(sd) {
    if (sd < 8) return 'Muito estável';
    if (sd < 18) return 'Relativamente estável';
    if (sd < 30) return 'Oscilação moderada';
    return 'Alta instabilidade';
}

export function validatePrediction({ probability, interval, confidenceTier }) {
    if (Number.isNaN(probability)) {
        throw new Error('Invalid probability');
    }
    if (interval.low > interval.high) {
        throw new Error('Invalid conformal interval');
    }
    if (!confidenceTier) {
        throw new Error('Missing confidence tier');
    }
    return true;
}

```

## [src/engine/insightGenerator.js](file:///d:/Downloads/ultra-patched/src/engine/insightGenerator.js)

```javascript
import { normalizeDate, toDateMs } from "../utils/dateHelper";
import { getSafeScore, getSyntheticTotal } from "../utils/scoreHelper";

const toHistoryArray = (history) => {
    if (Array.isArray(history)) return history.filter(Boolean);
    if (history && typeof history === 'object') return Object.values(history).filter(Boolean);
    return [];
};

const safeFinite = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const sortByValidDate = (history) => {
    return toHistoryArray(history)
        .filter(h => Number.isFinite(normalizeDate(h?.date)?.getTime()))
        .sort((a, b) => {
            const ta = normalizeDate(a?.date)?.getTime() ?? 0;
            const tb = normalizeDate(b?.date)?.getTime() ?? 0;
            return ta - tb;
        });
};

export function generateEvolutionInsights({
    timeline,
    focusCategory,
    activeEngine,
    categories,
    unit = '%',
    maxScore = 100,
    minScore = 0
}) {
    const defaultTitle = "Análise do Sistema";

    if (!timeline?.length) {
        return {
            type: 'info', icon: "📊", title: defaultTitle,
            text: "Ainda não existem dados suficientes.",
            details: "Continue realizando simulados para desbloquear insights avançados."
        };
    }

    if (!focusCategory) {
        switch (activeEngine) {
            case "raw_weekly":
                return { type: 'info', icon: "📅", title: "Visão Global: Mapa de Calor", text: "Análise da sua frequência e eficiência geral.", details: "Selecione uma disciplina acima para uma análise profunda." };
            case "raw":
                return { type: 'info', icon: "📊", title: "Visão Global: Resultados Brutos", text: "Visão geral da sua volatilidade diária.", details: "Selecione uma disciplina acima para analisar a estabilidade." };
            case "bayesian":
                return { type: 'info', icon: "🧠", title: "Visão Global: Nível Bayesiano", text: "Domínio probabilístico estimado de todas as matérias.", details: "Selecione uma disciplina acima para ver o intervalo de confiança." };
            case "stats":
                return { type: 'info', icon: "📐", title: "Visão Global: Média Histórica", text: "Desempenho acumulado em todas as frentes.", details: "Selecione uma disciplina acima para ver a média específica." };
            case "compare":
                return { type: 'info', icon: "⚡", title: "Visão Global: Projeção Monte Carlo", text: "Visão probabilística global do seu futuro.", details: "Selecione uma disciplina acima para descobrir o que está segurando sua nota." };
            case "subtopics":
                return { type: 'info', icon: "🔬", title: "Visão Global: Auditoria de Assuntos", text: "Mapeamento completo de todos os seus subtópicos.", details: "Selecione uma disciplina acima para auditar pontos fracos." };
            case "mc_density":
                return { type: 'info', icon: "📉", title: "Visão Global: Densidade MC", text: "Acompanhamento global das suas projeções no tempo.", details: "Selecione uma disciplina acima para ver convergência específica." };
            case "time_spent":
                return { type: 'info', icon: "⏳", title: "Visão Global: Agilidade AI", text: "Visão geral da sua velocidade de resolução.", details: "Selecione uma disciplina acima para mapear gargalos de tempo específicos." };
            case "weekly_diff":
                return { type: 'info', icon: "📆", title: "Visão Global: Acelerômetro Semanal", text: "Balanço geral de ganhos e perdas na semana.", details: "Selecione uma disciplina acima para focar no esforço semanal." };
            case "today_vs_general":
                return { type: 'info', icon: "⚖️", title: "Visão Global: Hoje vs Geral", text: "Comparativo do seu dia contra a média histórica geral.", details: "Selecione uma disciplina acima para um comparativo específico." };
            default:
                return {
                    type: 'info', icon: "📊", title: "Visão Global",
                    text: "Selecione uma disciplina acima para insights detalhados.",
                    details: "A inteligência artificial analisa cada disciplina individualmente para gerar conselhos."
                };
        }
    }

    const lastPoint = timeline[timeline.length - 1];
    const getLastValid = (key) => {
        for (let i = timeline.length - 1; i >= 0; i--) {
            if (timeline[i][key] != null) return timeline[i][key];
        }
        return null;
    };

    const raw = getLastValid(`raw_${focusCategory.id}`);
    const bayesian = getLastValid(`bay_${focusCategory.id}`);
    // ✅ BUG-4 FIX: Não reatribuir o parâmetro; criar variável local sanitizada
    const safeMaxScore = safeFinite(maxScore, 100) > 0 ? safeFinite(maxScore, 100) : 100;
    const safeMinScore = safeFinite(minScore, 0);
    // ✅ BUG-4 FIX: scale usa a amplitude real (maxScore - minScore) em vez de maxScore sozinho
    const scale = (safeMaxScore - safeMinScore) / 100;

    // Lógica do Mapa de Calor (Raw Weekly)
    if (activeEngine === "raw_weekly") {
        const DAY_NAMES_SINGULAR = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const DAY_NAMES_PLURAL = ['domingos', 'segundas-feiras', 'terças-feiras', 'quartas-feiras', 'quintas-feiras', 'sextas-feiras', 'sábados'];
        const dayStats = {};
        const now = new Date();
        
        const safeCategories = Array.isArray(categories)
            ? categories.filter(Boolean)
            : Object.values(categories || {}).filter(Boolean);

        safeCategories.forEach(cat => {
            const history = toHistoryArray(cat.simuladoStats?.history);

            const rawHistory = history
                .filter(h => {
                    const d = normalizeDate(h?.date);
                    return d && Number.isFinite(d.getTime()) && d.getTime() <= now.getTime();
                })
                .map(h => ({ ...h, score: getSafeScore(h, maxScore) }))
                .filter(h => Number.isFinite(h.score));

            rawHistory.forEach(h => {
                const d = normalizeDate(h.date);
                if (!d || !Number.isFinite(d.getTime())) return;

                const dow = d.getDay();
                if (!dayStats[dow]) dayStats[dow] = { correct: 0, total: 0 };

                let tot = Number(h.total);
                if (!Number.isFinite(tot) || tot <= 0) {
                    tot = getSyntheticTotal(maxScore);
                }

                if (!Number.isFinite(tot) || tot <= 0) return;

                dayStats[dow].correct += (h.score / maxScore * tot);
                dayStats[dow].total += tot;
            });
        });

        const dayEntries = Object.entries(dayStats)
            .filter(([, s]) => s.total >= 5)
            .map(([dow, s]) => ({ dow: Number(dow), pct: (s.correct / s.total) * 100, total: s.total }))
            .sort((a, b) => b.pct - a.pct);

        if (dayEntries.length >= 2) {
            const best = dayEntries[0];
            const worst = dayEntries[dayEntries.length - 1];
            return {
                type: 'success', icon: "📅", title: "Padrão Semanal de Rendimento",
                text: `Seu rendimento de pico ocorre aos **${DAY_NAMES_PLURAL[best.dow]}**.`,
                details: `++Melhor dia: **${DAY_NAMES_SINGULAR[best.dow]}** (${best.pct.toFixed(1)}%, ${best.total}q).++ !!Pior: ${DAY_NAMES_SINGULAR[worst.dow]} (${worst.pct.toFixed(1)}%).!!`,
                advice: "Alinhe seus simulados mais densos ao dia de ++melhor rendimento++."
            };
        }
        return {
            type: 'info', icon: "📅", title: "Mapa de Calor",
            text: "Visualize sua constância semanal.",
            details: "Células verdes indicam desempenho ++acima da meta++, !!vermelhas!! indicam necessidade de atenção."
        };
    }

    // Lógica da Realidade Bruta (Raw)
    if (activeEngine === "raw") {
        if (raw == null) return { type: 'info', icon: "📊", title: "Realidade Bruta", text: "Aguardando dados..." };
        const history = sortByValidDate(focusCategory.simuladoStats?.history);
        const scores = history.map(h => getSafeScore(h, maxScore)).filter(Number.isFinite);
        
        if (scores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };

        const recentScores = scores.slice(-5);
        
        // CORREÇÃO M4: Guarda contra array vazio (Math.max(...[]) = -Infinity → crash)
        if (recentScores.length < 2) return { type: 'info', icon: "📊", title: "Análise de Volatilidade", text: `Nota: ${raw.toFixed(1)}${unit}.` };
        
        const maxSwing = Math.max(...recentScores) - Math.min(...recentScores);

        if (maxSwing > 25 * scale) return { type: 'warning', icon: "⚠️", title: "!!Alta Volatilidade Detectada!!", text: `!!Variação de ${maxSwing.toFixed(0)}${unit}.!!`, advice: "Oscilações altas indicam !!'chute'!! ou !!gaps de base!!." };
        if (maxSwing < 8 * scale) return { type: 'success', icon: "✅", title: "++Consistência Sólida++", text: `++Variação mínima de ${maxSwing.toFixed(0)}${unit}.++`, advice: "Pronto para subir a dificuldade." };
        
        return { type: 'info', icon: "📊", title: "Desempenho Estável", text: `Oscilação de ${maxSwing.toFixed(0)}${unit}.` };
    }

    // Lógica do Motor Bayesiano
    if (activeEngine === "bayesian") {
        const safeBayesian = safeFinite(bayesian, NaN);
        if (!Number.isFinite(safeBayesian)) {
            return { type: 'info', icon: "🧠", title: "Nível Bayesiano", text: "Aguardando mais dados..." };
        }

        const ciLow = safeFinite(lastPoint[`bay_ci_low_${focusCategory.id}`], NaN);
        const ciHigh = safeFinite(lastPoint[`bay_ci_high_${focusCategory.id}`], NaN);
        const ciWidth = (Number.isFinite(ciHigh) && Number.isFinite(ciLow)) ? (ciHigh - ciLow) : null;

        if (ciWidth != null && ciWidth < 5 * scale) return { type: 'success', icon: "🎯", title: "++Alta Precisão Bayesiana++", text: `Seu nível real é ${safeBayesian.toFixed(1)}${unit}.`, advice: "++Convergência máxima++ do algoritmo." };
        if (ciWidth != null && ciWidth > 20 * scale) return { type: 'warning', icon: "🧠", title: "!!Incerteza Elevada!!", text: `Nível estimado: ${safeBayesian.toFixed(1)}${unit}.`, advice: "Faça mais simulados para estreitar a estimativa." };
        
        return { type: 'info', icon: "🧠", title: "Estimativa Bayesiana", text: `Nível Real: ${safeBayesian.toFixed(1)}${unit}.` };
    }

    // Lógica da Média Histórica (Stats)
    if (activeEngine === "stats") {
        const statsVal = safeFinite(getLastValid(`stats_${focusCategory.id}`), NaN);
        if (!Number.isFinite(statsVal)) {
            return { type: 'info', icon: "📐", title: "Média Histórica", text: "Aguardando mais dados..." };
        }

        return {
            type: 'info',
            icon: "📐",
            title: "Média Histórica Global",
            text: `Sua média histórica é ${statsVal.toFixed(1)}${unit}.`,
            advice: "Lembre-se que a média demora a refletir seu conhecimento recente."
        };
    }

    // Lógica Raio-X + Monte Carlo (Compare)
    if (activeEngine === "compare") {
        return { type: 'info', icon: "⚡", title: "Projeção Monte Carlo", text: "Visualizando simulações estatísticas futuras.", advice: "Use esta projeção para saber se está na rota da aprovação." };
    }

    // Lógica Raio-X de Assuntos (Subtopics)
    if (activeEngine === "subtopics") {
        return { type: 'info', icon: "🔬", title: "Auditoria de Assuntos", text: "Navegando nos subtópicos da matéria.", advice: "Ataque os !!blocos vermelhos!! para subir seu percentual rapidamente." };
    }

    // Lógica Densidade MC (mc_density)
    if (activeEngine === "mc_density") {
        return { type: 'info', icon: "📉", title: "Densidade de Convergência", text: "Histórico das suas projeções Monte Carlo.", advice: "Se a linha estiver ++subindo++, você está matematicamente mais próximo da aprovação." };
    }

    // Lógica Semanal (weekly_diff)
    if (activeEngine === "weekly_diff") {
        return { type: 'info', icon: "📆", title: "Acelerômetro Semanal", text: "Tração do seu estudo na última semana.", advice: "Monitore semanas !!negativas!! para evitar a !!curva do esquecimento!!." };
    }

    // Lógica Hoje vs Geral (today_vs_general)
    if (activeEngine === "today_vs_general") {
        return { type: 'info', icon: "⚖️", title: "Desempenho Diário", text: "Seu foco de hoje contra sua média.", advice: "Use isso para calibrar o esforço de hoje." };
    }

    // Lógica Agilidade AI (time_spent)
    if (activeEngine === "time_spent") {
        return { type: 'info', icon: "⏳", title: "Velocidade de Resolução", text: "Mapeando gargalos de tempo.", advice: "Cuidado com matérias !!lentas!!, elas roubam preciosos minutos da prova." };
    }

    // Lógica de Alertas de Burnout e Consolidação (Fallback)
    const safeRaw = safeFinite(raw, NaN);
    const safeBayesianFallback = safeFinite(bayesian, NaN);

    if (Number.isFinite(safeRaw) && Number.isFinite(safeBayesianFallback)) {
        const nowMs = new Date().getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        const history = toHistoryArray(focusCategory.simuladoStats?.history);

        const recentVolumeAlert = history
            .filter(h => {
                const d = toDateMs(h?.date);
                return Number.isFinite(d) && (nowMs - d) >= 0 && (nowMs - d) <= sevenDaysMs;
            })
            .reduce((sum, h) => {
                const parsedTotal = parseInt(h?.total, 10);
                const fallbackTotal = h?.score != null ? getSyntheticTotal(maxScore) : 0;
                const safeTotal = Number.isFinite(parsedTotal) && parsedTotal > 0
                    ? parsedTotal
                    : fallbackTotal;

                return sum + Math.max(0, safeFinite(safeTotal, 0));
            }, 0);

        if (recentVolumeAlert > 40 && safeRaw < safeBayesianFallback - 10 * scale) {
            return {
                type: 'danger',
                icon: "🚨",
                title: "!!Alerta de Burnout!!",
                text: `Volume alto, nota em !!queda!!.`,
                advice: "Dê um passo atrás e descanse."
            };
        }

        if (safeRaw > safeBayesianFallback + 8 * scale) {
            return {
                type: 'success',
                icon: "💡",
                title: "++Conhecimento Consolidado++",
                text: `Desempenho ++muito acima da média++.`,
                advice: "O conhecimento assentou de vez."
            };
        }
    }

    return { type: 'info', icon: "✅", title: "++Rendimento de Mestre++", text: `Operando na zona de ++máxima eficiência++.`, advice: "Mantenha o ritmo." };
}

```

## [src/utils/adaptiveMath.js](file:///d:/Downloads/ultra-patched/src/utils/adaptiveMath.js)

```javascript
/**
 * Utilitários de Matemática Adaptativa para o Motor Estatístico
 */
import { bootstrapCI } from '../engine/math/bootstrap.js';
import { kahanSum, kahanMean } from '../engine/math/kahan.js';
import { safeDateParse } from './dateHelper.js';

// t crítico bicaudal 95% (quantil 0.975) para amostras pequenas.
// Evita subestimar IC quando n é baixo.
const SMALL_SAMPLE_T_CRITICAL = {
    1: 12.706,
    2: 4.303,
    3: 3.182,
    4: 2.776,
    5: 2.571,
    6: 2.447,
    7: 2.365,
    8: 2.306,
    9: 2.262,
    10: 2.228,
    11: 2.201,
    12: 2.179,
    13: 2.160,
    14: 2.145,
    15: 2.131,
    16: 2.120,
    17: 2.110,
    18: 2.101,
    19: 2.093,
    20: 2.086,
    21: 2.080,
    22: 2.074,
    23: 2.069,
    24: 2.064,
    25: 2.060,
    26: 2.056,
    27: 2.052,
    28: 2.048,
    29: 2.045,
    30: 2.042
};

/**
 * Calcula o multiplicador de confiança (T-Student aproximado).
 * @param {number} sampleSize - Tamanho da amostra.
 * @param {Object} options 
 * @param {boolean} [options.allowFractional=false] - Se true, permite N fracionário (útil apenas para N Efetivo de Kish). Se false, força um número inteiro para manter a consistência da T-Student em contagens de amostras reais.
 */
export function getConfidenceMultiplier(sampleSize, options = {}) {
    const nRaw = Number(sampleSize);
    const allowFractional = options?.allowFractional === true;
    const nBase = Number.isFinite(nRaw) ? nRaw : 1;
    const n = Math.max(1, allowFractional ? nBase : Math.round(nBase));
    const df = Math.max(allowFractional ? 0.1 : 1, n - 1);



    if (df <= 30) {
        const lowDf = Math.max(1, Math.floor(df)); 
        const highDf = Math.ceil(df);
        const lowT = SMALL_SAMPLE_T_CRITICAL[lowDf] ?? SMALL_SAMPLE_T_CRITICAL[1];
        const highT = SMALL_SAMPLE_T_CRITICAL[highDf] ?? SMALL_SAMPLE_T_CRITICAL[30];
        
        if (lowDf === highDf) return lowT;
        
        // CORREÇÃO: Em vez de interpolação harmónica reversa instável, 
        // usamos interpolação log-linear no espaço dos Graus de Liberdade.
        // É estatisticamente superior para o decaimento em cauda pesada.
        const logDenom = Math.log(highDf) - Math.log(lowDf);
        if (Math.abs(logDenom) < 1e-15) return lowT;
        const w = (Math.log(df) - Math.log(lowDf)) / logDenom;
        return (lowT * (1 - w)) + (highT * w);
    }

    // Aproximação assintótica para df altos (erro pequeno para df > 30)
    const z = 1.959963984540054;
    const c1 = (Math.pow(z, 3) + z) / (4 * df);
    const c2 = (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * df * df);
    const tApprox = z + c1 + c2;

    // Limites de sanidade (sem truncar agressivamente amostras pequenas)
    return Math.max(1.96, Math.min(6.0, tApprox));
}

export function winsorizeSeries(values, lowerPct = 0.05, upperPct = 0.95) {
    if (!Array.isArray(values)) return [];

    // Sanitiza percentis para evitar intervalos inválidos (ex: lower > upper)
    const lowerClamped = Number.isFinite(lowerPct) ? Math.min(1, Math.max(0, lowerPct)) : 0.05;
    const upperClamped = Number.isFinite(upperPct) ? Math.min(1, Math.max(0, upperPct)) : 0.95;
    const lowQ = Math.min(lowerClamped, upperClamped);
    const highQ = Math.max(lowerClamped, upperClamped);

    const nullCount = values.filter(v => !Number.isFinite(v)).length;
    if (nullCount > values.length * 0.5) {
        // OTIMIZAÇÃO DE MEMÓRIA: Se mais de 50% for lixo, retornar a referência original
        // em vez de criar um novo array map com NaNs. Evita alocação desnecessária.
        return values; 
    }
 
    const finiteValues = values.filter(v => Number.isFinite(v));
    // BUGFIX (data-shape): preservar o comprimento da série mesmo sem valores finitos.
    // Alguns consumidores assumem alinhamento 1:1 com a série original.
    // [FIX 4] Jamais force um 0 em domínios não triviais. Deixe o filtro NaN tratar jusante.
    if (finiteValues.length === 0) return values;
    if (finiteValues.length < 5) {
        return values; 
    }

    const sorted = [...finiteValues].sort((a, b) => a - b);
    const lowIndex = Math.floor((sorted.length - 1) * lowQ);
    const highIndex = Math.ceil((sorted.length - 1) * highQ);
    const low = sorted[Math.max(0, lowIndex)];
    const high = sorted[Math.min(sorted.length - 1, highIndex)];

    return values.map((v) => {
        // CORREÇÃO: Em vez de injetar uma mediana falsa (o que destrói a variância em séries com poucos dados),
        // preservamos o valor inválido original para que os filtros a jusante lidem com a lacuna naturalmente.
        if (!Number.isFinite(v)) return v; 
        return Math.max(low, Math.min(high, v));
    });
}

export function deriveAdaptiveConfig(scores = []) {
    const finiteScores = Array.isArray(scores) ? scores.filter(v => Number.isFinite(v)) : [];
    const n = finiteScores.length;
    const mean = kahanMean(finiteScores);
    const variance = n > 1 ? kahanSum(finiteScores.map(s => Math.pow(s - mean, 2))) / (n - 1) : 0;
    const sd = Math.sqrt(Math.max(0, variance));
    const cv = mean !== 0 ? Math.min(2, Math.abs(sd / mean)) : 1;

    // Meia-vida dinâmica baseada em n e volatilidade
    const halfLife = Math.max(2, Math.round(Math.min(14, Math.sqrt(Math.max(1, n)) * (1 + cv))));
    const lambda = Math.pow(0.5, 1 / halfLife);
    const dynamicTail = Math.min(0.12, Math.max(0.03, 0.08 * (1 / Math.sqrt(Math.max(1, n))) + (cv * 0.02)));
    // BUGFIX: sensibilidade mínima muito alta ampliava ruído em séries curtas.
    const trendSensitivity = 0.03 + Math.min(0.06, cv * 0.04);
    const maxCIInflation = 1.1 + Math.min(0.25, cv * 0.12);

    return {
        lambda,
        lowWinsor: dynamicTail,
        highWinsor: 1 - dynamicTail,
        trendSensitivity,
        maxCIInflation
    };
}

/**
 * Calcula a regressão linear incluindo o Erro Padrão da Inclinação (Standard Error) e o T-Stat.
 * Atualizado para suportar deltas de tempo reais (x) em vez de assumir índices estáticos.
 */
export const calcSlopeWithSignificance = (dados) => {
    if (!Array.isArray(dados)) return { slope: 0, se: 0, tStat: 0 };

    const n = dados.length;
    if (n < 3) return { slope: 0, se: 0, tStat: 0 };
    
    // Extração bruta
    const rawXs = dados.map((d, i) => {
        const rawX = (d && typeof d === 'object' && d.x !== undefined) ? d.x : i;
        const x = Number(rawX);
        return Number.isFinite(x) ? x : i;
    });
    
    const Ys = dados.map(d => {
        const val = typeof d === 'number' ? d : (d && typeof d === 'object' ? d.y : 0);
        return Number.isFinite(Number(val)) ? Number(val) : 0;
    });

    // FIX 1: Centralização dos eixos X (Mean Centering) para anular a perda de precisão
    // em matrizes de ponto flutuante durante a elevação ao quadrado de datas gigantes.
    const minX = Math.min(...rawXs);
    const Xs = rawXs.map(x => x - minX);
    
    const sumX = kahanSum(Xs);
    const sumY = kahanSum(Ys);
    const sumXY = kahanSum(Xs.map((x, i) => x * Ys[i]));
    const sumXX = kahanSum(Xs.map(x => x * x));
    
    const meanX = sumX / n;
    const det = n * sumXX - sumX * sumX;
    
    const slope = det === 0 ? 0 : (n * sumXY - sumX * sumY) / det;
    const intercept = (sumY - slope * sumX) / n;
    
    const predYs = Xs.map((x) => intercept + slope * x);
    const ssRes = kahanSum(Ys.map((y, i) => Math.pow(y - predYs[i], 2)));
    const ssX = kahanSum(Xs.map(x => Math.pow(x - meanX, 2)));
    
    const varRes = ssRes / (n - 2);
    const seSlope = ssX > 0 ? Math.sqrt(varRes / ssX) : 0;
    const tStat = seSlope > 0 ? slope / seSlope : 0;
    
    return { slope, se: seSlope, tStat };
};

export function computeAdaptiveSignal(historyOrScores = []) {
    const isObjectHistory = historyOrScores.length > 0 && typeof historyOrScores[0] === 'object' && historyOrScores[0] !== null;
    
    // Extrai scores e datas
    const parsedData = historyOrScores.map((item, i) => {
        if (isObjectHistory) {
            const rawDate = safeDateParse(item.date || item.createdAt);
            const rawTime = rawDate ? rawDate.getTime() : NaN;
            return {
                score: Number(item.score ?? item.value ?? 0),
                time: Number.isFinite(rawTime) ? rawTime : Date.now() - (historyOrScores.length - i) * 86400000
            };
        }
        // Fallback legado se enviarem apenas o array de números
        return { score: Number(item), time: Date.now() - (historyOrScores.length - i) * 86400000 }; 
    }).filter(d => Number.isFinite(d.score));
    
    // ADAPT-SORT: Força ordenação cronológica para garantir que ages (referenceNow - time) sejam sempre >= 0.
    parsedData.sort((a, b) => a.time - b.time);

    if (parsedData.length === 0) {
        return { effectiveN: 1, trendStrength: 0, adaptiveWinsor: { low: 0.05, high: 0.95 }, ciInflation: 1 };
    }

    const finiteScores = parsedData.map(d => d.score);
    const cfg = deriveAdaptiveConfig(finiteScores);
    const referenceNow = parsedData[parsedData.length - 1].time; // O tempo do último evento

    const weighted = [];
    for (let i = 0; i < parsedData.length; i++) {
        // FIX BUG: Idade baseada no delta real de dias (Entropia do Tempo), não em índices
        let ageInDays = Math.max(0, (referenceNow - parsedData[i].time) / (1000 * 60 * 60 * 24));
        
        // CORREÇÃO: Blindagem contra envenenamento matemático por datas ausentes
        if (Number.isNaN(ageInDays)) ageInDays = 0; 
        
        const dailyDecay = cfg.lambda; 
        weighted.push(Math.pow(dailyDecay, ageInDays));
    }

    const sumW = kahanSum(weighted);
    const sumW2 = kahanSum(weighted.map(w => w * w));

    // ✅ FIX: Se os pesos decaíram para zero, fazer fallback para média simples.
    // Isso evita que a média ponderada colapse para 0 quando todos os
    // dados são "antigos" demais para o lambda configurado.
    let effectiveN;
    let weightedMean;

    if (sumW < 1e-6) {
      // Fallback: média simples (todos os pesos são efetivamente iguais)
      effectiveN = finiteScores.length;
      weightedMean = kahanMean(finiteScores);
    } else {
      effectiveN = Math.max(1, (sumW * sumW) / Math.max(1e-9, sumW2));
      weightedMean = kahanSum(finiteScores.map((s, i) => s * weighted[i])) / sumW;
    }

    // Robustez adaptativa: Huber-like clipping guiado por MAD para reduzir impacto de outliers
    const sorted = [...finiteScores].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const absDev = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = absDev.length % 2 === 0
        ? (absDev[absDev.length / 2 - 1] + absDev[absDev.length / 2]) / 2
        : absDev[Math.floor(absDev.length / 2)];
    const robustSigma = Math.max(0.5, 1.4826 * mad);
    const huberK = 2.5 * robustSigma;

    const weightedVariance = kahanSum(finiteScores.map((s, i) => {
        const d = s - weightedMean;
        const clipped = Math.max(-huberK, Math.min(huberK, d));
        return weighted[i] * clipped * clipped;
    })) / Math.max(1e-9, sumW);

    // CORREÇÃO: Substituir o CONSISTENCY_FACTOR fixo (que só funcionava para N=10) 
    // pela verdadeira Correção de Bessel adaptável ao Tamanho Efetivo da Amostra (effectiveN).
    // CORREÇÃO: Substituir o CONSISTENCY_FACTOR fixo pela verdadeira Correção de Bessel,
    // mas com clamping defensivo para evitar assíntotas hiperbólicas quando effectiveN cai para perto de 1.
    // O piso desce de 1.0 para 0.1, permitindo que a penalidade de incerteza seja aplicada corretamente.
    // Transição suave: interpola entre 1.0 e N/(N-1) via sigmoid
    // para evitar descontinuidade em effectiveN = 1.5
    const besselRaw = effectiveN > 1.01 ? effectiveN / (effectiveN - 1) : effectiveN * 10;
    const transition = 1 / (1 + Math.exp(-5 * (effectiveN - 1.5)));
    const consistencyFactor = 1 * (1 - transition) + Math.min(10, besselRaw) * transition;
    
    const sd = Math.sqrt(Math.max(0, weightedVariance * consistencyFactor));
    
    // MATEMÁTICA COMPLEXA: Em vez de linear trend clampada, usamos Bootstrapping 
    // para medir se o momento positivo é estatisticamente significativo ou só sorte.

    let trueTrendStrength = 0;
    let isPlateau = false;

    if (finiteScores.length >= 5) {
        // Reamostragem de Monte Carlo (Bootstrap) com os deltas mais recentes
        const recentDeltas = [];
        for (let i = 1; i < finiteScores.length; i++) {
            recentDeltas.push(finiteScores[i] - finiteScores[i-1]);
        }
        
        // Pede o Intervalo de Confiança (CI) a 95% para a média dos deltas
        const momentumCI = bootstrapCI(recentDeltas, (arr) => arr.reduce((a,b)=>a+b,0)/arr.length, { iterations: 500 });
        
        // Diagnóstico de Estagnação (Platô): Se a ponta alta for positiva, mas a baixa negativa,
        // E houver variância real (não é apenas uma série de zeros exatos),
        // significa que a variação é apenas ruído estocástico.
        const amplitudeCI = momentumCI.high - momentumCI.low;
        
        if (momentumCI.low <= 0 && momentumCI.high >= 0 && amplitudeCI > 1e-6) {
            isPlateau = true;
            trueTrendStrength = 0; // Zera a tendência, forçando o motor a focar no baseline histórico
        } else {
            trueTrendStrength = Math.abs(momentumCI.estimate) / (sd > 0 ? sd : 1);
        }
    } else {
       // Fallback matemático rigoroso para micro-amostras (N<5)
       const slopeData = finiteScores.map((score, i) => ({ x: parsedData[i].time / 86400000, y: score }));
       const { slope: shortSlope } = calcSlopeWithSignificance(slopeData);
       trueTrendStrength = sd > 1e-9 ? Math.min(3.0, Math.abs(shortSlope) / sd) : 0;
    }

    const ciInflationRaw = 1 + (trueTrendStrength * cfg.trendSensitivity);
    const ciInflation = Math.max(1, Math.min(cfg.maxCIInflation, ciInflationRaw));

    return { 
        effectiveN, 
        trendStrength: trueTrendStrength, 
        isPlateau, 
        adaptiveWinsor: { low: cfg.lowWinsor, high: cfg.highWinsor }, 
        ciInflation 
    };
}

// NOTE: deriveCoachAdaptiveParams lives in coachAdaptive.js (canonical version).
// This file previously had a duplicate with a slightly different signature.
// Removed to avoid confusion and dead code.

// ─────────────────────────────────────────────────────────────────
// ADAPT-03: Unified Adaptive Confidence Shrinkage
// Substitui os 3 padrões diferentes de shrinkage espalhados pelo codebase:
//   1. shrinkProbabilityToNeutral (calibration.js) — penalidade de calibração
//   2. extraLowSampleShrink (coachAdaptive.js:278) — amostra pequena
//   3. POPULATION_SD prior (stats.js:44) — prior Bayesiano
//
// Esta função unifica o conceito: dado um estimador (probabilidade, média, etc.),
// qual é o fator de shrinkage adequado considerando TODOS os sinais de incerteza?
// ─────────────────────────────────────────────────────────────────
export function adaptiveConfidenceShrinkage(options = {}) {
    const {
        sampleSize = 1,
        calibrationPenalty = 0,
        trendStrength = 0,
        neutralValue = 50,
        maxShrink = 0.6
    } = options;

    const n = Math.max(1, Number(sampleSize) || 1);
    const calPen = Math.max(0, Math.min(1, Number(calibrationPenalty) || 0));
    const trend = Math.max(0, Math.min(5, Number(trendStrength) || 0));

    // Componente 1: Sample size shrinkage (1/√n decay)
    // n<5: forte shrinkage (~0.45), n=15: moderado (~0.26), n>30: mínimo (~0.18)
    const sampleShrink = Math.max(0, 1 / Math.sqrt(n));

    // Componente 2: Calibração (quanto pior a calibração, mais puxamos para o neutro)
    const calibShrink = calPen * 0.8; // escalar para não dominar

    // Componente 3: Trend uncertainty (tendência forte = mais incerteza no futuro, não no presente)
    // FIX: Usar índice bruto de penalidade (0 a 1) para evitar dupla supressão de peso.
    const trendPenaltyFactor = Math.min(1.0, trend * 0.25); 

    // FIX BUG 4: Incluir a incerteza da tendência no cálculo final de contração
    // Redistribuir os pesos para incluir a incerteza da tendência (15%)
    const rawShrink = (sampleShrink * 0.50) + (calibShrink * 0.35) + (trendPenaltyFactor * 0.15); 
    const finalShrink = Math.max(0, Math.min(maxShrink, rawShrink));

    return {
        shrinkFactor: Number(finalShrink.toFixed(4)),
        trendUncertaintyPenalty: Number(trendPenaltyFactor.toFixed(4)), // Exporta para o Monte Carlo inflar o desvio padrão
        components: {
            sampleShrink: Number(sampleShrink.toFixed(4)),
            calibShrink: Number(calibShrink.toFixed(4)),
            trendShrink: Number(trendPenaltyFactor.toFixed(4))
        },
        // Helper: aplica o shrinkage a um valor
        apply: (value) => {
            const v = Number(value) || 0;
            return v * (1 - finalShrink) + neutralValue * finalShrink;
        }
    };
}

// ─────────────────────────────────────────────────────────────────
// IMP-MATH-07: Ponte entre computeAdaptiveSignal e o pipeline do Coach
// Exporta um peso consolidado que indica quanta confiança o motor deve
// depositar nas previsões atuais vs. recuar para priors conservadores.
// ─────────────────────────────────────────────────────────────────
export function computeAdaptiveCoachWeight(scores = []) {
    const signal = computeAdaptiveSignal(scores);
    
    // CORREÇÃO MATH: Se o tamanho da amostra (efetiva) for irrisório, 
    // a confiança matemática na tendência empírica DEVE colapsar para 0 estrito.
    // O sistema não pode dar 30% de credibilidade cega ao Vazio.
    if (signal.effectiveN < 1.5) {
        return {
            confidenceWeight: 0,
            effectiveN: Number(signal.effectiveN.toFixed(2)),
            trendStrength: 0,
            ciInflation: 1,
            adaptiveWinsor: signal.adaptiveWinsor
        };
    }

    const nConfidence = Math.min(1, signal.effectiveN / 15);
    const trendUncertainty = Math.min(1, signal.trendStrength / 2.5); 
    
    const confidenceWeight = Math.max(0, Math.min(1, 
        nConfidence * 0.7 + (1 - trendUncertainty) * 0.3
    ));

    return {
        confidenceWeight: Number(confidenceWeight.toFixed(4)),
        effectiveN: Number(signal.effectiveN.toFixed(2)),
        trendStrength: Number(signal.trendStrength.toFixed(4)),
        ciInflation: Number(signal.ciInflation.toFixed(4)),
        adaptiveWinsor: signal.adaptiveWinsor
    };
}
/**
 * Calcula a retenção real usando o algoritmo FSRS (Free Spaced Repetition Scheduler).
 * Substitui o modelo clássico de Ebbinghaus por uma matriz de Estabilidade e Recuperabilidade.
 * 
 * @param {number} horasDesdeEstudo - Tempo (t) em horas.
 * @param {number} forcaMemoria - Força do traço de memória (S) baseada em revisões (0 a 10).
 * @param {number} dificuldade - Fator de dificuldade do item (0.1 a 1.0).
 * @returns {number} Percentual de Retenção (0.20 a 1.0)
 */
export const calculateSafeRetention = (horasDesdeEstudo, forcaMemoria, dificuldade = 0.5) => {
    const baseline = 0.2; // Limiar mínimo de retenção
    const tempoDias = Math.max(0, horasDesdeEstudo / 24);
    
    // CORREÇÃO CIENTÍFICA (FSRS): A dificuldade afeta a construção da Estabilidade (S), 
    // não deve aplicar um corte instantâneo de penalização na hora t=0.
    const difficultyFactor = 1 - (Math.max(0.1, Math.min(1.0, dificuldade)) * 0.15); 
    
    // S = exp(forcaMemoria * fator_escala) modulado pela dificuldade do item.
    // Tópicos difíceis geram consolidações mais frágeis (menor Estabilidade).
    const stability = Math.max(0.5, Math.exp(forcaMemoria * 0.45) * difficultyFactor);
    
    // Retrievability FSRS: R = (1 + t/(9·S))^(-1)
    // Power-law decay: decai mais lentamente que exponencial para intervalos longos,
    // mais rápido para intervalos curtos — conforme dados empíricos do FSRS.
    const retrievability = Math.pow(1 + tempoDias / (9 * stability), -1);
    const finalRetention = retrievability; 
    
    return Math.max(baseline, finalRetention);
};

```

## [src/utils/adaptiveEngine.js](file:///d:/Downloads/ultra-patched/src/utils/adaptiveEngine.js)

```javascript
/**
 * adaptiveEngine.js — Adaptive Analytics Engine
 * 
 * ADAPT-02: Detecção de transição de regime (simplificado).
 * Analisa o histórico de estados (progression, stagnation, regression, etc.)
 * para detectar TRANSIÇÕES iminentes — ex: "evolução desacelerando → platô provável".
 * 
 * Related modules:
 * - src/utils/adaptiveMath.js — Core adaptive math utilities
 * - src/utils/calibration.js — Calibration governance
 * - src/utils/coachLogic.js — Coach decision engine
 * - src/utils/ProgressStateEngine.js — State classification
 */

import { analyzeProgressState } from './ProgressStateEngine.js';

/**
 * Detecta transições de regime no desempenho do aluno.
 * 
 * Usa um modelo simplificado de probabilidades de transição baseado na
 * frequência histórica de mudanças de estado + indicadores de velocidade.
 * 
 * @param {number[]} scores - Série de scores do aluno (mais antigo → mais recente)
 * @param {Object} options - { maxScore, windowSize, minHistory }
 * @returns {Object} { currentState, transitionRisk, flags, velocity }
 */
export function detectRegimeTransition(scores = [], options = {}) {
    const {
        maxScore = 100,
        windowSize = 10,
        minHistory = 6
    } = options;

    const noData = {
        currentState: 'insufficient_data',
        transitionRisk: null,
        flags: [],
        velocity: null,
        regimeStability: null
    };

    if (!Array.isArray(scores) || scores.length < minHistory) return noData;
    
    // BUG-ADAPT-01 FIX: Janela Dinâmica
    // Se scores.length < windowSize * 1.5, a janela de 10 itens impede a geração 
    // de 2 estados (necessários para a derivada). Ajustamos para scores.length/2.
    const actualWindowSize = Math.min(windowSize, Math.floor(scores.length / 2));

    // 1. Calcular estados em janelas deslizantes
    const states = [];
    const stepSize = Math.max(1, Math.floor(actualWindowSize / 2)); // 50% overlap
    for (let end = actualWindowSize; end <= scores.length; end += stepSize) {
        const window = scores.slice(end - actualWindowSize, end);
        const result = analyzeProgressState(window, { maxScore, window_size: actualWindowSize });
        states.push({
            state: result.state,
            mean: result.mean_score,
            slope: result.trend_slope,
            variance: result.variance,
            endIdx: end
        });
    }

    if (states.length < 2) return noData;

    const current = states[states.length - 1];
    const previous = states[states.length - 2];

    // 2. Detectar transições de regime
    const flags = [];
    let transitionRisk = 'none';

    // Calcular velocidade de mudança (derivada do slope)
    const slopeChange = current.slope - previous.slope;
    const meanChange = current.mean - previous.mean;

    // 2a. Desaceleração em evolução (possível platô)
    if (current.state === 'progression') {
        // Se o slope caiu >50% comparado com o anterior, o ritmo está desacelerando
        if (previous.slope > 0 && current.slope > 0 && current.slope < previous.slope * 0.5) {
            transitionRisk = 'deceleration';
            flags.push({
                type: 'warning',
                msg: `Desaceleração detectada: ritmo caiu de ${(previous.slope * 30).toFixed(1)} para ${(current.slope * 30).toFixed(1)} pp/mês. Possível platô em formação.`,
                severity: 'medium'
            });
        }
        // Se a variância está subindo enquanto o slope diminui
        // [CORREÇÃO] Injetar um limite mínimo (Epsilon) de variância para impedir (Bug 3.1 Fix)
        // que um salto de 0 para 0.01 dispare uma falsa "Instabilidade crescente".
        const varianciaMinima = Math.pow(maxScore * 0.02, 2); // Piso de 2%
        const varianciaAnteriorSegura = Math.max(previous.variance, varianciaMinima);
        
        if (current.variance > varianciaAnteriorSegura * 1.5 && slopeChange < 0) {
            flags.push({
                type: 'info',
                msg: 'Instabilidade crescente durante evolução. Consolide a base antes de avançar.',
                severity: 'low'
            });
        }
    }

    // 2b. Regressão acelerando (queda livre)
    if (current.state === 'regression' && previous.state === 'regression') {
        if (current.slope < previous.slope) {
            transitionRisk = 'acceleration_negative';
            flags.push({
                type: 'danger',
                msg: `Queda acelerada: declínio de ${(current.slope * 30).toFixed(1)} pp/mês (era ${(previous.slope * 30).toFixed(1)}). Intervenção urgente necessária.`,
                severity: 'high'
            });
        }
    }

    // 2c. Estagnação após evolução (platô confirmado)
    if ((current.state === 'stagnation_positive' || current.state === 'stagnation_neutral') 
        && previous.state === 'progression') {
        transitionRisk = 'plateau_entry';
        flags.push({
            type: 'warning',
            msg: 'Transição para platô detectada. O progresso desacelerou. Mude a estratégia de estudo.',
            severity: 'medium'
        });
    }

    // 2d. Recuperação após queda (inflexão positiva)
    if (current.state === 'progression' && 
        (previous.state === 'regression' || previous.state === 'stagnation_negative')) {
        transitionRisk = 'recovery';
        flags.push({
            type: 'success',
            msg: 'Inflexão positiva detectada! A recuperação está em andamento. Mantenha o novo ritmo.',
            severity: 'none'
        });
    }

    // 2e. Instabilidade crônica (oscilação contínua)
    if (current.state === 'unstable' && previous.state === 'unstable') {
        transitionRisk = 'chronic_instability';
        flags.push({
            type: 'warning',
            msg: 'Instabilidade crônica: performance oscila sem padrão. Foque em preencher lacunas de base.',
            severity: 'medium'
        });
    }

    // 3. Regime stability: quantos estados consecutivos iguais
    let consecutiveSame = 1;
    for (let i = states.length - 2; i >= 0; i--) {
        if (states[i].state === current.state) consecutiveSame++;
        else break;
    }
    const regimeStability = Math.min(1, consecutiveSame / 5); // Normalizar para [0,1], satura em 5

    return {
        currentState: current.state,
        transitionRisk,
        flags,
        velocity: {
            slopeChange: Number(slopeChange.toFixed(4)),
            meanChange: Number(meanChange.toFixed(2)),
            currentSlope: Number(current.slope.toFixed(4)),
            previousSlope: Number(previous.slope.toFixed(4))
        },
        regimeStability: Number(regimeStability.toFixed(3)),
        stateHistory: states.map(s => s.state)
    };
}

export default { detectRegimeTransition };

```

## [src/utils/calibration.js](file:///d:/Downloads/ultra-patched/src/utils/calibration.js)

```javascript
import { kahanSum } from '../engine/math/kahan.js';
import { getDateKey } from './dateHelper.js';
import { getSafeScore } from './scoreHelper.js';
// FIX-BUG-09: Matching exato em vez de fuzzy includes
import { isSubjectMatch } from './normalization.js';

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

    updated.forEach(ev => {
      if (ev.observed != null) return;
      if (!ev.category) return;

      // FIX-BUG-09: Usar matching normalizado exato
      const isMatch = isSubjectMatch(ev.category, subj);

      if (isMatch && ev.targetScore) {
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

```

## [src/utils/calibrationTelemetry.js](file:///d:/Downloads/ultra-patched/src/utils/calibrationTelemetry.js)

```javascript
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

export function getCalibrationTelemetrySummary(categoryId = null) {
  try {
    const currentRaw = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || '[]');
    const current = Array.isArray(currentRaw) ? currentRaw : [];
    const filtered = categoryId
      ? current.filter(item => String(item.categoryId) === String(categoryId))
      : current;

    if (filtered.length === 0) {
      return {
        count: 0,
        avgBrier: null,
        avgPenalty: null,
        lastTimestamp: null
      };
    }

    const totalBrier = filtered.reduce((sum, item) => sum + Number(item.avgBrier || 0), 0);
    const totalPenalty = filtered.reduce((sum, item) => sum + Number(item.calibrationPenalty || 0), 0);

    return {
      count: filtered.length,
      avgBrier: Number((totalBrier / filtered.length).toFixed(4)),
      avgPenalty: Number((totalPenalty / filtered.length).toFixed(4)),
      lastTimestamp: filtered[filtered.length - 1]?.timestamp || null
    };
  } catch {
    return {
      count: 0,
      avgBrier: null,
      avgPenalty: null,
      lastTimestamp: null
    };
  }
}

export function clearCalibrationTelemetry() {
  try {
    localStorage.removeItem(TELEMETRY_KEY);
  } catch {
    // ignore
  }
}

```

## [src/utils/ProgressStateEngine.js](file:///d:/Downloads/ultra-patched/src/utils/ProgressStateEngine.js)

```javascript
/**
 * ProgressStateEngine
 * 
 * Detects qualified stagnation states and differentiates from
 * evolution, regression, and instability.
 */

import { toDateMs } from './dateHelper.js';

const DEFAULT_CONFIG = {
    window_size: 10,
    stagnation_threshold: 5.0, // Alinhado com estabilidade de 5% da escala (rigoroso)
    low_level_limit: 60,
    high_level_limit: 75,
    mastery_limit: 80, // Sincronizado com targetScore padrão
    trend_tolerance: 0.5 // Alinhado com 0.5 pp/30d (unificado)
};

export function analyzeProgressState(scores, config = {}) {
    const {
        window_size,
        stagnation_threshold: raw_stagnation,
        low_level_limit,
        high_level_limit,
        mastery_limit,
        trend_tolerance: raw_trend,
        maxScore = 100
    } = { ...DEFAULT_CONFIG, ...config };

    // SCALE FIX: Escalonar thresholds pela amplitude da escala (maxScore)
    const scaleFactor = maxScore / 100;
    const windowFactor = Math.sqrt(10 / Math.max(3, window_size));
    const stagnation_threshold = raw_stagnation * scaleFactor * windowFactor;
    const trend_tolerance = raw_trend * scaleFactor * windowFactor;

    // FIX 3: Escalonar limites de nível (Mastery/Low) para suportar escalas diferentes de 100
    const scaled_low = low_level_limit * scaleFactor;
    const scaled_high = high_level_limit * scaleFactor;
    const scaled_mastery = mastery_limit * scaleFactor;

    // Safety: Window size must be at least 3 for meaningful variance and MAV calculation
    // (With only 2 points, variance = one single squared difference — not representative)
    const safeWindowSize = Math.max(3, window_size);

    // 3. Pre-condition check
    const safeScores = Array.isArray(scores) ? scores : Object.values(scores || {});
    if (!safeScores || safeScores.length < safeWindowSize) {
        return {
            state: 'insufficient_data',
            label: 'Dados Insuficientes',
            mean_score: 0,
            delta: 0,
            variance: 0,
            trend_slope: 0,
            severity: 'none'
        };
    }

    // 4. Extract window
    // CORREÇÃO: Gerar a âncora sintética ANTES de ordenar para preservar o eixo cronológico verdadeiro
    const syntheticNow = Date.now();
    const sortedScores = safeScores
      .filter(d => d != null)
      .map((d, index) => {
        let time = (d && typeof d === 'object') ? toDateMs(d.date) : NaN;
        if (!Number.isFinite(time)) time = syntheticNow - ((safeScores.length - index) * 86400000);
        return { original: d, safeTime: time };
      })
      .filter(item => Number.isFinite(item.safeTime))
      .sort((a, b) => a.safeTime - b.safeTime);

    const validSortedScores = sortedScores.filter(d => {
        const score = typeof d.original === 'object' ? d.original.score : d.original;
        return Number.isFinite(score);
    });
    
    const recentData = validSortedScores.slice(-safeWindowSize);
    const finiteRecentScores = recentData.map(d => typeof d.original === 'object' ? d.original.score : d.original);
    
    // BUG FIX: Em vez de recalcular as datas e arruinar a ordem cronológica, 
    // extraímos a safeTime validada no bloco anterior, preservando o eixo-X perfeitamente.
    const recentDates = recentData.map(d => d.safeTime);

    // 4.1 Safety Check after filtering invalid scores
    if (finiteRecentScores.length < safeWindowSize) {
        return {
            state: 'insufficient_data',
            label: 'Dados Insuficientes',
            mean_score: 0,
            delta: 0,
            variance: 0,
            trend_slope: 0,
            severity: 'none'
        };
    }

    // 5.1 Mean (Absolute Level)
    const mean = finiteRecentScores.reduce((a, b) => a + b, 0) / finiteRecentScores.length;

    // 5.2 Delta (Mean Absolute Variation)
    let variationTotal = 0;
    for (let i = 1; i < finiteRecentScores.length; i++) {
        variationTotal += Math.abs(finiteRecentScores[i] - finiteRecentScores[i - 1]);
    }
    const delta = variationTotal / (finiteRecentScores.length - 1);

    // 5.3 Variance (Consistency)
    const variance = finiteRecentScores.reduce((acc, score) =>
        acc + Math.pow(score - mean, 2), 0) / (finiteRecentScores.length - 1);

    // 5.4 Trend (Linear Regression Slope - TIME AWARE)
    // 🎯 MATH BUG FIX: Transição da Regressão Linear do índice (Cego ao tempo) 
    // para o eixo X de dias reais passados.
    const n = finiteRecentScores.length;
    const startTime = recentDates[0] || Date.now();
    // CORREÇÃO: Forçar spread artificial mínimo (micro-passos) se os testes colidirem no mesmo dia (Bug 1.1 Fix)
    const xDays = [];
    recentDates.forEach((d, i) => {
        let days = (d - startTime) / 86400000;
        if (i > 0 && days <= xDays[i - 1]) {
            days = xDays[i - 1] + 0.01; // Adiciona um micro-delta temporal (~14 minutos)
        }
        xDays.push(days);
    });
    const xMean = xDays.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
        numerator += (xDays[i] - xMean) * (finiteRecentScores[i] - mean);
        denominator += Math.pow(xDays[i] - xMean, 2);
    }

    // FIX: Clamp do denominador para impedir distorção por "Time Crunch" (testes em curtos intervalos)
    // Se o denominador for menor que 0.25 (1/4 de dia), assumimos um valor seguro para diluir o impacto
    const safeDenominator = denominator < 0.25 ? 0.25 : denominator;

    // slope em pontos/dia.
    const rawSlope = safeDenominator > 0 ? numerator / safeDenominator : 0; 
    
    // Normalização para 30 dias para alinhar com trend_tolerance (pp/30d)
    const normalizedSlope = rawSlope * 30;
    // 6. Stagnation Detection
    const stagnated = delta <= stagnation_threshold && Math.abs(normalizedSlope) <= trend_tolerance;

    // 7. Semantic Classification
    let state = '';
    let label = '';
    let severity = 'none';

    if (stagnated) {
        // 7.1 Qualified Stagnation or Mastery
        if (mean >= scaled_mastery) {
            state = 'mastery';
            label = 'Domínio (Consistente no Topo)';
            severity = 'none';
        } else if (mean < scaled_low) {
            state = 'stagnation_negative';
            label = 'Estagnação em nível baixo';
            severity = 'high';
        } else if (mean < scaled_high) {
            state = 'stagnation_neutral';
            label = 'Estagnação em nível médio';
            severity = 'medium';
        } else {
            state = 'stagnation_positive';
            label = 'Estagnação em nível alto';
            severity = 'low';
        }
    } else {
        // 7.2 Dynamic States (Not Stagnated) with Trend Tolerance
        // BUG-GLOBAL-06 FIX: Usar Coeficiente de Variação (CV) em vez de variância bruta.
        // Antes: variance > 25*scaleFactor² era calibrado para window_size=10 e falha com n diferentes.
        // CV > 15% é invariante ao n e à escala da prova.
        // FIX: Adicionado amortecimento Bayesiano no denominador (max(mean, 30 * scaleFactor))
        // Impede que alunos iniciantes (com média baixa) sejam falsamente diagnosticados como "Erráticos"
        // apenas por causa do ruído normal da nota (ex: oscilar 3 pontos numa média de 15 dava CV = 20%).
        const cv = mean > 1e-6 ? Math.sqrt(variance) / Math.max(mean, 30 * scaleFactor) : 0;
        const isVeryUnstable = cv > 0.15;

        // FIX 3.2 (Visual e Lógica): A instabilidade não deve proteger um aluno em queda livre.
        // Se a inclinação (slope) é fortemente negativa, é regressão, independentemente da variância.
        if (normalizedSlope < -trend_tolerance) {
            state = 'regression';
            label = isVeryUnstable ? 'Queda Acentuada (Instável)' : 'Em regressão';
            severity = 'high'; 
        } else if (normalizedSlope > trend_tolerance && !isVeryUnstable) {
            state = 'progression';
            label = 'Em evolução';
            severity = 'none';
        } else {
            state = 'unstable'; 
            label = 'Instável / Flutuação';
            severity = 'medium';
        }
    }

    // 8. Standardized Output
    return {
    // trend_slope em pp/dia (regressão linear sobre eixo-X em dias reais).
    // O motor está calibrado para este valor; compará-lo com pp/dia (calculateSlope) causaria confusão.
        state,
        label,
        mean_score: Number(mean.toFixed(2)),
        delta: Number(delta.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        trend_slope: Number(rawSlope.toFixed(4)),
        severity
    };
}

export function getUIHints(state) {
    const hints = {
        insufficient_data: { color: 'slate', icon: 'minus' },
        mastery: { color: 'violet', icon: 'award' },
        stagnation_negative: { color: 'red', icon: 'alert-triangle' },
        stagnation_neutral: { color: 'yellow', icon: 'pause-circle' },
        stagnation_positive: { color: 'green', icon: 'shield-check' },
        progression: { color: 'blue', icon: 'trending-up' },
        regression: { color: 'red', icon: 'trending-down' },
        unstable: { color: 'orange', icon: 'activity' }
    };

    return hints[state] || hints.insufficient_data;
}

export default { analyzeProgressState, getUIHints };

```

