import { getSafeScore } from '../scoreHelper.js';
import { normalizeDate } from '../dateHelper.js';
import { getCoachFeature } from '../coachFeatures.js';
import { hashString } from '../coachSafe.js';
import { estimateTopicProficiencies } from '../../engine/probabilistic/bayesianTopics.js';
import { kahanSum } from '../../engine/math/kahan.js';

export const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const simpleHash = hashString;

export const sanitizeMinutes = (mins) => Math.min(720, Math.max(0, Number(mins) || 0));

export const clamp = (value, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
};

export const safeFixedNumber = (value, digits = 2, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? Number(n.toFixed(digits)) : fallback;
};

export const parseOptionalFinite = (val) => {
    if (val === null || val === undefined || typeof val === 'boolean' || typeof val === 'object') return null;
    if (typeof val === 'string' && val.trim() === '') return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
};

// Deep clone rápido em JS puro — preserva Date, Map, Set e referências cíclicas
export function deepClone(value, seen = new WeakMap()) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    if (value instanceof Date) return new Date(value.getTime());
    if (Array.isArray(value)) {
        const arr = new Array(value.length);
        seen.set(value, arr);
        for (let i = 0; i < value.length; i++) {
            arr[i] = deepClone(value[i], seen);
        }
        return arr;
    }
    if (value instanceof Map) {
        const map = new Map();
        seen.set(value, map);
        value.forEach((v, k) => {
            map.set(deepClone(k, seen), deepClone(v, seen));
        });
        return map;
    }
    if (value instanceof Set) {
        const set = new Set();
        seen.set(value, set);
        value.forEach((v) => {
            set.add(deepClone(v, seen));
        });
        return set;
    }
    const out = {};
    seen.set(value, out);
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        out[k] = deepClone(value[k], seen);
    }
    return out;
}

export const DEFAULT_CONFIG = {
    MC_HISTORY_WINDOW: 10,
    SCORE_MAX: 45,
    RECENCY_MAX: 22,
    INSTABILITY_MAX: 22,
    PRIORITY_BOOST: 18,
    EFFICIENCY_MAX: 10,
    SRS_BOOST: 16,
    BASE_HOURS_THRESHOLD: 5,
    NORMALIZATION_CEILING: 170,
    CRITICAL_THRESHOLD: 122,
    MC_SIMULATIONS: 800,
    MC_MIN_DATA_POINTS: 3,
    MC_BACKTEST_MIN_TRAIN: 5,
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

export function getDynamicTrendThreshold(currentScore, maxScore, minScore = 0) {
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = (Number.isFinite(Number(maxScore)) && Number(maxScore) > safeMin) ? Number(maxScore) : (safeMin + 100);
    const domain = Math.max(1e-9, safeMax - safeMin);
    const safeCurrent = Number.isFinite(Number(currentScore)) ? Number(currentScore) : safeMin;
    const currentPct = (safeCurrent - safeMin) / domain;
    if (!Number.isFinite(currentPct)) return 0.002 * domain;
    const damping = Math.max(0, 1 - Math.min(1, Math.max(0, currentPct)));
    const baseRequirement = 0.05;
    const dynamicPct = (baseRequirement * Math.pow(damping, 1.5)) + 0.002;
    return dynamicPct * domain;
}

export const getDaysDiff = (newer, older) => {
    const d1 = normalizeDate(newer) || new Date(0);
    const d2 = normalizeDate(older) || new Date(0);
    return Math.max(0, Math.floor((d1.getTime() - d2.getTime()) / MS_PER_DAY));
};

export function getCrunchMultiplier(daysToExam, firstActivityDate = null, now = null) {
    if (daysToExam === null || daysToExam === undefined || Number.isNaN(daysToExam)) return 1.0;
    if (daysToExam < 0) return 1.0;

    let criticalHorizon = 21;
    let timeDivisor = 7;
    const safeFirstActivity = normalizeDate(firstActivityDate);
    if (safeFirstActivity && !isNaN(safeFirstActivity.getTime())) {
        const referenceDate = now ? (normalizeDate(now) || new Date()) : new Date();
        const refTime = referenceDate.getTime();
        const firstTime = safeFirstActivity.getTime();
        if (!Number.isFinite(refTime) || !Number.isFinite(firstTime)) return 1.0;
        const journeyDays = Math.max(0, refTime - firstTime) / 86400000;
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

export const computeBayesianProficiency = (acertos, total, mediaGlobal = 0.5, globalTotal = 0) => {
    const rawTotal = Math.max(0, Number(total) || 0);
    const rawAcertos = Math.max(0, Math.min(rawTotal, Number(acertos) || 0));
    const safeMedia = Number.isFinite(mediaGlobal) ? Math.max(0, Math.min(1, mediaGlobal)) : 0.5;
    const safeGlobalTotal = Number.isFinite(globalTotal) ? Math.max(0, globalTotal) : 0;
    const K = Math.max(3, Math.min(15, Math.log10(safeGlobalTotal + 1) * 3));
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

export function computeRobustVolatilityForCoach(history = [], maxScore = 100, minScore = 0) {
    const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
    const safeMin = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMax) : 0;
    const domain = Math.max(1e-9, safeMax - safeMin);
    const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
    const scores = safeHistory
        .map(h => getSafeScore(h, safeMax, safeMin))
        .filter(s => Number.isFinite(s));

    if (scores.length < 2) {
        return Math.max(0, Math.min(domain * 0.35, domain * 0.08));
    }

    const n = scores.length;
    const mean = kahanSum(scores) / n;
    const devs = scores.map(val => Math.pow(val - mean, 2));
    const variance = kahanSum(devs) / (n - 1);
    const empirical = Math.sqrt(Math.max(0, variance));
    const prior = domain * 0.08;

    const weight = Math.min(1, n / 8);
    const vol = (empirical * weight) + (prior * (1 - weight));

    if (!Number.isFinite(vol)) return 0;
    return Math.max(0, Math.min(domain * 0.35, vol));
}

export const sanitizeNum = (val) => {
    if (val === null || val === undefined || val === '') return NaN;
    if (typeof val === 'boolean') return NaN;
    if (typeof val === 'object') return NaN;

    let str = String(val).trim();
    str = str.replace(/[%\s]/g, '');
    if (!str) return NaN;
    if (/^[+-]?$/.test(str)) return NaN;

    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    if (hasComma && hasDot) {
        const lastComma = str.lastIndexOf(',');
        const lastDot = str.lastIndexOf('.');
        if (lastComma > lastDot) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
    } else if (hasComma) {
        const parts = str.split(',');
        const beforeComma = parts[0].replace(/^[+-]/, '');
        const afterComma = parts[1];
        if (parts.length > 2 || (afterComma && afterComma.length === 3 && /^[1-9]\d{0,2}$/.test(beforeComma))) {
            str = str.replace(/\./g, '').replace(/,/g, '');
        } else {
            str = str.replace(/\./g, '').replace(/,/g, '.');
        }
    } else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(str)) {
        str = str.replace(/\./g, '');
    }
    const n = Number(str);
    return Number.isFinite(n) ? n : NaN;
};

export const getCoachPriorities = (topicsData, options = null) => {
    if (!Array.isArray(topicsData)) return [];

    const useBayesian = getCoachFeature(options, 'useBayesianTopics', false);
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
                    if (a.completed && !b.completed) return 1;
                    if (!a.completed && b.completed) return -1;
                    const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1;
                    const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
                    return valA - valB;
                });
        } catch (err) {
            console.warn('[CoachLogic] Bayesian getCoachPriorities failed:', err);
        }
    }

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
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            const valA = Number.isFinite(a.realProficiency) ? a.realProficiency : 1;
            const valB = Number.isFinite(b.realProficiency) ? b.realProficiency : 1;
            return valA - valB;
        });
};
