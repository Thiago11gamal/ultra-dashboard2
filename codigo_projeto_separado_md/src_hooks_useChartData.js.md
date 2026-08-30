# src\hooks\useChartData.js

```js
import { useMemo, useCallback } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, BAYESIAN_DECAY_FACTOR } from '../engine/stats';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const getHistoryArray = (cat) => Object.values(cat?.simuladoStats?.history || EMPTY_OBJECT).filter(Boolean);
const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

function buildCumulativeStatsPerDate(history, sortedDates, maxScore = 100, minScore = 0) {
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeRange = Math.max(1e-9, safeMax - safeMin);
    const toRatio = (score) => {
        const n = Number(score);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(1, (n - safeMin) / safeRange));
    };

    // ── PASSO 1: agregar por data em UMA passagem ──────────────────
    const aggregatedByDate = new Map();
    for (const h of history) {
        const key = getDateKey(getHistoryDate(h));
        if (!key) continue;
        const entry = aggregatedByDate.get(key);
        const rawTotal = Math.max(0, Number(h?.total) || 0);
        const rawCorrect = Math.max(0, Math.min(rawTotal, Number(h?.correct) || 0));
        const score = getSafeScore(h, safeMax);
        const safeScore = Number.isFinite(score) ? score : NaN;

        let compTotal = rawTotal;
        let compCorrect = rawTotal > 0 && Number.isFinite(safeScore)
            ? Math.round(toRatio(safeScore) * rawTotal)
            : rawCorrect;

        if (rawTotal === 0 && h?.score != null && Number.isFinite(safeScore)) {
            compTotal = getSyntheticTotal(safeMax);
            compCorrect = Math.round(toRatio(safeScore) * compTotal);
        }
        compCorrect = Math.max(0, Math.min(compTotal, Number.isFinite(compCorrect) ? compCorrect : 0));

        if (entry) {
            entry.compCorrect += compCorrect;
            entry.compTotal += compTotal;
            entry.total += rawTotal;
            entry.correct += Math.max(0, Math.min(rawTotal, Math.max(0, Number(h?.correct) || 0)));
            entry.score = entry.compTotal > 0
                ? safeMin + (entry.compCorrect / entry.compTotal) * safeRange
                : NaN;
        } else {
            aggregatedByDate.set(key, {
                date: key,
                compCorrect,
                compTotal,
                total: rawTotal,
                correct: Math.max(0, Math.min(rawTotal, Math.max(0, Number(h?.correct) || 0))),
                score: safeScore,
            });
        }
    }

    // Ordenar as chaves uma única vez
    const sortedKeys = [...aggregatedByDate.keys()].sort((a, b) => {
        const da = normalizeDate(a)?.getTime() ?? 0;
        const db = normalizeDate(b)?.getTime() ?? 0;
        return da - db;
    });

    // ── PASSO 2: varrer sortedDates com índice incremental ─────────
    // Cada entrada do histórico agregado é consumida UMA ÚNICA VEZ.
    const dateToStats = {};
    let accumulated = [];
    let histIdx = 0;
    let bayAlpha = 1;
    let bayBeta = 1;
    let maxAlphaEver = 1;
    const DECAY_FACTOR = BAYESIAN_DECAY_FACTOR || 0.985;

    for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];

        // Consome entradas do histórico ordenado até a data atual
        while (histIdx < sortedKeys.length && sortedKeys[histIdx] <= date) {
            const key = sortedKeys[histIdx];
            const entry = aggregatedByDate.get(key);
            histIdx++;
            if (!entry) continue;

            const entryDate = normalizeDate(entry.date);
            const prevDate = histIdx > 1 ? normalizeDate(sortedKeys[histIdx - 2]) : entryDate;
            const gapDays = Math.max(
                1,
                Math.floor(((entryDate?.getTime() ?? 0) - (prevDate?.getTime() ?? 0)) / 86400000)
            );

            // Decaimento bayesiano entre eventos
            if (histIdx > 1) {
                const entryDecay = Math.pow(DECAY_FACTOR, gapDays);
                if (entryDecay < 1.0) {
                    const currentN = bayAlpha + bayBeta;
                    const currentP = bayAlpha / currentN;
                    const newN = Math.max(2, currentN * entryDecay);
                    bayAlpha = newN * currentP;
                    bayBeta = newN * (1 - currentP);
                }
                const retentionFloor = maxAlphaEver * 0.3;
                if (bayAlpha < retentionFloor) {
                    const currentN = bayAlpha + bayBeta;
                    const currentP = currentN > 0 && bayAlpha > 0 ? bayAlpha / currentN : 0.01;
                    const safeP = Math.min(0.999999, Math.max(0.000001, currentP));
                    bayAlpha = retentionFloor;
                    bayBeta = bayAlpha * ((1 - safeP) / safeP);
                }
            }

            const total = entry.compTotal > 0 ? entry.compTotal : 0;
            const correct = entry.compCorrect > 0 ? entry.compCorrect : 0;

            if (total >= 1) {
                bayAlpha += Number(correct);
                bayBeta += Number(total) - Number(correct);
                if (bayAlpha > maxAlphaEver) maxAlphaEver = bayAlpha;
            }

            accumulated.push(entry);
        }

        if (accumulated.length > 0) {
            const lastEntry = accumulated[accumulated.length - 1];
            const bayStats = computeBayesianLevel(accumulated, bayAlpha, bayBeta, safeMax, {
                referenceDate: date,
                lastEventDate: lastEntry ? lastEntry.date : null,
            });
            dateToStats[date] = {
                stats: computeCategoryStats(accumulated, 100, 60, safeMax),
                last: accumulated[accumulated.length - 1],
                bayesian: {
                    mean: bayStats.mean,
                    ciLow: bayStats.ciLow,
                    ciHigh: bayStats.ciHigh,
                    alpha: bayAlpha,
                    beta: bayBeta,
                },
            };
        }
    }

    return dateToStats;
}

export function useChartData(categories = EMPTY_ARRAY, weights = EMPTY_OBJECT, maxScore = 100, minScore = 0) {
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeRange = Math.max(1e-9, safeMax - safeMin);

    const toRatio = useCallback((score) => {
        const n = Number(score);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(1, (n - safeMin) / safeRange));
    }, [safeMin, safeRange]);

    const categoriesVersion = useMemo(() => categories.map((cat) => {
        const history = getHistoryArray(cat);
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : EMPTY_ARRAY;
        const histDigest = history.map((h) => [
            getDateKey(getHistoryDate(h)) || 'nodate',
            Number(h?.score ?? 0),
            Number(h?.correct ?? 0),
            Number(h?.total ?? 0),
            Array.isArray(h?.topics) ? h.topics.length : 0,
            h?.taskId || ''
        ].join(':')).join('|');
        return [cat?.id || '', cat?.name || '', tasks.length, histDigest].join('::');
    }).join('||'), [categories]);

    const activeCategories = useMemo(() => {
        let valid = categories.filter(c => {
            const hist = c.simuladoStats?.history;
            return hist && Object.values(hist).length > 0;
        });
        const getVol = (h) => {
            const t = Math.max(0, Number(h?.total) || 0);
            if (t > 0) return t;
            if (h?.score != null) return getSyntheticTotal(safeMax);
            return 0;
        };
        valid.sort((a, b) => {
            const historyA = getHistoryArray(a);
            const historyB = getHistoryArray(b);
            const volA = historyA.reduce((sum, h) => sum + getVol(h), 0);
            const volB = historyB.reduce((sum, h) => sum + getVol(h), 0);
            return volB - volA;
        });
        return valid;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, categoriesVersion, safeMax]);

    const timeline = useMemo(() => {
        if (!activeCategories.length) return [];
        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            getHistoryArray(cat).forEach(h => {
                const dateKey = getDateKey(getHistoryDate(h));
                if (dateKey) allDatesSet.add(dateKey);
            });
        });
        const sortedDates = Array.from(allDatesSet).sort();
        const dates = sortedDates;
        const dataByDate = {};
        dates.forEach((date) => {
            const [, month, day] = date.split("-");
            dataByDate[date] = { date, displayDate: `${day}/${month}` };
        });

        activeCategories.forEach(cat => {
            const history = getHistoryArray(cat).sort((a, b) => {
                const dA = normalizeDate(getHistoryDate(a));
                const dB = normalizeDate(getHistoryDate(b));
                return (dA?.getTime() || 0) - (dB?.getTime() || 0);
            });
            if (!history.length) return;
            const cumulativeByDate = buildCumulativeStatsPerDate(history, dates, safeMax, safeMin);
            const exactByDate = {};
            history.forEach(h => {
                const key = getDateKey(getHistoryDate(h));
                if (!key) return;
                if (!exactByDate[key]) exactByDate[key] = { correct: 0, total: 0, compCorrect: 0, compTotal: 0 };
                const rawTotal = Math.max(0, Number(h.total) || 0);
                const rawC = Math.max(0, Math.min(rawTotal, Number(h.correct) || 0));
                const score = getSafeScore(h, safeMax);
                if (!Number.isFinite(score)) return;
                const corrNorm = rawTotal > 0
                    ? Math.max(0, Math.min(rawTotal, Math.round(toRatio(score) * rawTotal)))
                    : rawC;
                let compTotal = rawTotal;
                let compCorrect = corrNorm;
                if (rawTotal === 0 && h.score != null) {
                    compTotal = getSyntheticTotal(safeMax);
                    compCorrect = Math.round(toRatio(score) * compTotal);
                }
                exactByDate[key].correct += corrNorm;
                exactByDate[key].total += rawTotal;
                exactByDate[key].compCorrect += compCorrect;
                exactByDate[key].compTotal += compTotal;
            });

            dates.forEach(date => {
                const snap = cumulativeByDate[date];
                if (!snap) return;
                const { stats } = snap;
                const exact = exactByDate[date];
                const displayCorrect = exact ? (exact.compTotal > 0 ? exact.compCorrect : exact.correct) : 0;
                const displayTotal = exact ? (exact.compTotal > 0 ? exact.compTotal : exact.total) : 0;
                let rawDailyScore = null;
                if (exact && exact.compTotal >= 1) {
                    const calc = safeMin + (exact.compCorrect / exact.compTotal) * safeRange;
                    rawDailyScore = Number.isFinite(calc) ? calc : null;
                } else if (exact && snap?.last) {
                    const s = getSafeScore(snap.last, safeMax);
                    rawDailyScore = Number.isFinite(s) ? s : null;
                }
                dataByDate[date] = {
                    ...dataByDate[date],
                    [`raw_correct_${cat.id}`]: displayCorrect,
                    [`raw_total_${cat.id}`]: displayTotal,
                    [`raw_${cat.id}`]: rawDailyScore,
                    [`bay_${cat.id}`]: snap.bayesian ? (Number.isFinite(Number(snap.bayesian.mean)) ? Number(snap.bayesian.mean) : safeMin) : null,
                    [`bay_ci_low_${cat.id}`]: snap.bayesian ? (Number.isFinite(Number(snap.bayesian.ciLow)) ? Number(snap.bayesian.ciLow) : safeMin) : safeMin,
                    [`bay_ci_high_${cat.id}`]: snap.bayesian ? (Number.isFinite(Number(snap.bayesian.ciHigh)) ? Number(snap.bayesian.ciHigh) : safeMax) : safeMax,
                    [`stats_${cat.id}`]: stats ? (Number.isFinite(Number(stats.mean)) ? Number(stats.mean) : safeMin) : safeMin,
                    [`trend_${cat.id}`]: stats ? (Number.isFinite(Number(stats.trendValue)) ? Number(stats.trendValue) : 0) : 0,
                    [`trend_status_${cat.id}`]: stats ? stats.trend : 'stable',
                    global_total: (Number(dataByDate[date].global_total) || 0) + displayTotal
                };
            });
        });
        return dates.map(d => dataByDate[d]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategories, weights, safeMax, safeMin, categoriesVersion]);

    const heatmapData = useMemo(() => {
        if (!activeCategories.length) return { dates: [], rows: [] };
        const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            getHistoryArray(cat).forEach(h => {
                const dateKey = getDateKey(getHistoryDate(h));
                if (dateKey) allDatesSet.add(dateKey);
            });
        });
        const sortedDates = Array.from(allDatesSet).sort();
        const datesToUse = sortedDates;
        const dates = datesToUse.map(dateStr => {
            const d = normalizeDate(dateStr);
            const [, m, day] = dateStr.split('-');
            return {
                key: dateStr,
                dayName: DAY_NAMES[d.getDay()],
                label: `${day}/${m}`,
                isWeekend: d.getDay() === 0 || d.getDay() === 6,
            };
        });

        const rows = activeCategories.map(cat => {
            const dayMap = {};
            getHistoryArray(cat).forEach(h => {
                const key = getDateKey(getHistoryDate(h));
                if (!key) return;
                if (!dayMap[key]) dayMap[key] = { correct: 0, total: 0 };
                let tot = Math.max(0, Number(h.total) || 0);
                let raw = Math.max(0, Number(h.correct) || 0);
                let corrNorm;
                const score = getSafeScore(h, safeMax);
                if (!Number.isFinite(score)) return;
                if (h.score != null && tot === 0) {
                    tot = getSyntheticTotal(safeMax);
                    corrNorm = Math.round(toRatio(score) * tot);
                } else {
                    corrNorm = tot > 0 ? Math.round(toRatio(score) * tot) : raw;
                }
                dayMap[key].correct += corrNorm;
                dayMap[key].total += tot;
            });
            const cells = datesToUse.map(dateStr => {
                const entry = dayMap[dateStr];
                if (!entry || entry.total === 0) return null;
                const pct = (entry.correct / entry.total) * 100;
                return {
                    pct: Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0)),
                    correct: entry.correct,
                    total: entry.total,
                };
            });
            return { cat, cells };
        });
        return { dates, rows };
    }, [activeCategories, safeMax, toRatio]);

    const globalMetrics = useMemo(() => {
        let totalQuestions = 0;
        let totalCorrect = 0;
        activeCategories.forEach(cat => {
            getHistoryArray(cat).forEach(h => {
                let tot = Math.max(0, Number(h.total) || 0);
                const score = getSafeScore(h, safeMax);
                if (!Number.isFinite(score)) return;
                let corrNorm;
                if (tot === 0 && h.score != null) {
                    tot = getSyntheticTotal(safeMax);
                    corrNorm = Math.round(toRatio(score) * tot);
                } else {
                    const raw = Math.max(0, Number(h.correct) || 0);
                    corrNorm = tot > 0 ? Math.round(toRatio(score) * tot) : raw;
                }
                totalQuestions += tot;
                totalCorrect += corrNorm;
            });
        });
        const globalAccuracy = (totalQuestions > 0) ? (totalCorrect / totalQuestions) * 100 : 0;
        return { totalQuestions, totalCorrect, globalAccuracy: Number.isFinite(globalAccuracy) ? globalAccuracy : 0 };
    }, [activeCategories, safeMax, toRatio]);

    return { activeCategories, timeline, heatmapData, globalMetrics };
}


```
