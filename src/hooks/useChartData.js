import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, BAYESIAN_DECAY_FACTOR } from '../engine/stats';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

const getHistoryArray = (cat) => Object.values(cat?.simuladoStats?.history || EMPTY_OBJECT).filter(Boolean);
const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

function buildCumulativeStatsPerDate(history, sortedDates, maxScore = 100) {
    const aggregatedHistoryByDateMap = new Map();
    for (const h of history) {
        const key = getDateKey(getHistoryDate(h));
        if (!key) continue;
        const existing = aggregatedHistoryByDateMap.get(key);
        const rawTotal = Number(h?.total) || 0;
        const rawCorrect = Number(h?.correct) || 0;
        const score = getSafeScore(h, maxScore);
        // ✅ AUDIT FIX: blindagem contra NaN vindo de getSafeScore
        const safeScore = Number.isFinite(score) ? score : NaN;

        let compTotal = rawTotal;
        let compCorrect = rawTotal > 0 && Number.isFinite(safeScore) ? Math.round((safeScore / maxScore) * rawTotal) : rawCorrect;
        if (rawTotal === 0 && h?.score != null && Number.isFinite(safeScore)) {
            compTotal = getSyntheticTotal(maxScore);
            const pct = Math.min(1, Math.max(0, safeScore / maxScore));
            compCorrect = Math.round(pct * compTotal);
        }
        // ✅ AUDIT FIX: correct ∈ [0, total] e nunca NaN entra no acumulado
        compCorrect = Math.max(0, Math.min(compTotal, Number.isFinite(compCorrect) ? compCorrect : 0));
        const safeRawCorrect = rawTotal > 0 && Number.isFinite(safeScore)
            ? Math.max(0, Math.min(rawTotal, Math.round((safeScore / maxScore) * rawTotal)))
            : Math.max(0, Number.isFinite(rawCorrect) ? rawCorrect : 0);

        if (existing) {
            existing.compCorrect = (existing.compCorrect || 0) + compCorrect;
            existing.compTotal = (existing.compTotal || 0) + compTotal;
            existing.total += rawTotal;
            existing.correct += safeRawCorrect;
            // ✅ AUDIT FIX: divisão por zero → NaN
            existing.score = existing.compTotal > 0 ? (existing.compCorrect / existing.compTotal) * maxScore : NaN;
        } else {
            aggregatedHistoryByDateMap.set(key, {
                ...h,
                date: key,
                correct: safeRawCorrect,
                total: rawTotal,
                compCorrect,
                compTotal,
                score: safeScore
            });
        }
    }

    const aggregatedHistory = Array.from(aggregatedHistoryByDateMap.values()).sort((a, b) => {
        const dA = normalizeDate(a.date);
        const dB = normalizeDate(b.date);
        return (dA?.getTime() || 0) - (dB?.getTime() || 0);
    });

    const dateToStats = {};
    let accumulated = [];
    let histIdx = 0;
    let bayAlpha = 1;
    let bayBeta = 1;
    let maxAlphaEver = 1;
    const DECAY_FACTOR = BAYESIAN_DECAY_FACTOR || 0.985;

    for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];
        while (histIdx < aggregatedHistory.length) {
            const key = aggregatedHistory[histIdx].date;
            if (key && key <= date) {
                const entry = aggregatedHistory[histIdx];
                const entryDate = normalizeDate(entry.date);
                const prevDate = histIdx > 0 ? normalizeDate(aggregatedHistory[histIdx - 1].date) : entryDate;
                const gapDays = Math.max(1, Math.floor((entryDate - prevDate) / (1000 * 60 * 60 * 24)));
                if (histIdx > 0) {
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
                        const currentP = (currentN > 0 && bayAlpha > 0) ? bayAlpha / currentN : 0.01;
                        const safeP = Math.min(0.999999, Math.max(0.000001, currentP));
                        bayAlpha = retentionFloor;
                        bayBeta = bayAlpha * ((1 - safeP) / safeP);
                    }
                }

                let total = entry.compTotal !== undefined ? entry.compTotal : (Number(entry.total) || 0);
                let correct = entry.compCorrect !== undefined ? entry.compCorrect : (Number(entry.correct) || 0);
                if (total === 0 && entry.score != null) {
                    const pct = Math.min(1, Math.max(0, Number(entry.score) / maxScore));
                    total = getSyntheticTotal(maxScore);
                    correct = Math.round(pct * total);
                }
                // ✅ AUDIT FIX: nunca deixar correct > total alimentar o Bayesiano
                correct = Math.max(0, Math.min(total, Number(correct) || 0));
                if (total >= 1) {
                    bayAlpha += Number(correct);
                    bayBeta += (Number(total) - Number(correct));
                    if (bayAlpha > maxAlphaEver) maxAlphaEver = bayAlpha;
                }
                accumulated.push(entry);
                histIdx++;
            } else {
                break;
            }
        }
        if (accumulated.length > 0) {
            const lastEntry = accumulated.length > 0 ? accumulated[accumulated.length - 1] : null;
            const bayStats = computeBayesianLevel(accumulated, bayAlpha, bayBeta, maxScore, {
                referenceDate: date,
                lastEventDate: lastEntry ? lastEntry.date : null
            });
            dateToStats[date] = {
                stats: computeCategoryStats(accumulated, 100, 60, maxScore),
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

export function useChartData(categories = EMPTY_ARRAY, weights = EMPTY_OBJECT, maxScore = 100) {
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
        valid.sort((a, b) => {
            const historyA = getHistoryArray(a);
            const historyB = getHistoryArray(b);
            const volA = historyA.reduce((sum, h) => sum + (Number(h.total) || 0), 0);
            const volB = historyB.reduce((sum, h) => sum + (Number(h.total) || 0), 0);
            return volB - volA;
        });
        return valid;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, categoriesVersion]);

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
            const cumulativeByDate = buildCumulativeStatsPerDate(history, dates, maxScore);
            const exactByDate = {};
            history.forEach(h => {
                const key = getDateKey(getHistoryDate(h));
                if (!key) return;
                if (!exactByDate[key]) exactByDate[key] = { correct: 0, total: 0, compCorrect: 0, compTotal: 0 };
                const rawTotal = Number(h.total) || 0;
                const rawC = Number(h.correct) || 0;
                const score = getSafeScore(h, maxScore);
                // ✅ AUDIT FIX: score NaN não pode contaminar a timeline
                if (!Number.isFinite(score)) return;
                const corrNorm = rawTotal > 0
                    ? Math.max(0, Math.min(rawTotal, Math.round((score / maxScore) * rawTotal)))
                    : Math.max(0, Number.isFinite(rawC) ? rawC : 0);
                let compTotal = rawTotal;
                let compCorrect = corrNorm;
                if (rawTotal === 0 && h.score != null) {
                    compTotal = getSyntheticTotal(maxScore);
                    const pct = Math.min(1, Math.max(0, score / maxScore));
                    compCorrect = Math.round(pct * compTotal);
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
                const correct = exact ? exact.correct : 0;
                const total = exact ? exact.total : 0;
                const rawDailyScore = exact && exact.compTotal >= 1
                    ? (exact.compCorrect / exact.compTotal) * maxScore
                    : (exact && snap?.last?.score != null ? getSafeScore(snap.last, maxScore) : null);
                dataByDate[date] = {
                    ...dataByDate[date],
                    [`raw_correct_${cat.id}`]: correct,
                    [`raw_total_${cat.id}`]: total,
                    [`raw_${cat.id}`]: rawDailyScore,
                    [`bay_${cat.id}`]: snap.bayesian ? (Number(snap.bayesian.mean) || 0) : null,
                    [`bay_ci_low_${cat.id}`]: snap.bayesian ? (Number(snap.bayesian.ciLow) || 0) : 0,
                    [`bay_ci_high_${cat.id}`]: snap.bayesian ? (Number(snap.bayesian.ciHigh) || 0) : 0,
                    [`stats_${cat.id}`]: stats ? (Number(stats.mean) || 0) : 0,
                    [`trend_${cat.id}`]: stats ? (Number(stats.trendValue) || 0) : 0,
                    [`trend_status_${cat.id}`]: stats ? stats.trend : 'stable',
                    global_total: (Number(dataByDate[date].global_total) || 0) + total
                };
            });
        });
        return dates.map(d => dataByDate[d]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategories, weights, maxScore, categoriesVersion]);

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
        const datesToUse = sortedDates.slice(-60);
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
                let tot = Number(h.total) || 0;
                let raw = Number(h.correct) || 0;
                let corrNorm;
                const score = getSafeScore(h, maxScore);
                // ✅ AUDIT FIX: score NaN não pode sujar o heatmap
                if (!Number.isFinite(score)) return;
                if (h.score != null && tot === 0) {
                    tot = 1;
                    corrNorm = score / maxScore;
                } else {
                    corrNorm = tot > 0 ? Math.round((score / maxScore) * tot) : raw;
                }
                dayMap[key].correct += corrNorm;
                dayMap[key].total += tot;
            });
            const cells = datesToUse.map(dateStr => {
                const entry = dayMap[dateStr];
                if (!entry || entry.total === 0) return null;
                return {
                    pct: (entry.correct / entry.total) * 100,
                    correct: entry.correct,
                    total: entry.total,
                };
            });
            return { cat, cells };
        });
        return { dates, rows };
    }, [activeCategories, maxScore]);

    const globalMetrics = useMemo(() => {
        let totalQuestions = 0;
        let totalCorrect = 0;
        activeCategories.forEach(cat => {
            getHistoryArray(cat).forEach(h => {
                let tot = Number(h.total) || 0;
                const score = getSafeScore(h, maxScore);
                // ✅ AUDIT FIX: score NaN não pode contaminar a Precisão Global
                if (!Number.isFinite(score)) return;
                let corrNorm;
                if (tot === 0 && h.score != null) {
                    tot = 1;
                    corrNorm = (score / maxScore) * tot;
                } else {
                    const raw = Number(h.correct) || 0;
                    corrNorm = tot > 0 ? Math.round((score / maxScore) * tot) : raw;
                }
                totalQuestions += tot;
                totalCorrect += corrNorm;
            });
        });
        const globalAccuracy = (totalQuestions > 0) ? (totalCorrect / totalQuestions) * 100 : 0;
        return { totalQuestions, totalCorrect, globalAccuracy: Number.isFinite(globalAccuracy) ? globalAccuracy : 0 };
    }, [activeCategories, maxScore]);

    return { activeCategories, timeline, heatmapData, globalMetrics };
}
