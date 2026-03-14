import { useMemo } from 'react';
import { computeCategoryStats, calculateWeightedProjectedMean, computeBayesianLevel } from '../engine';

const getDateKey = (rawDate) => {
    if (!rawDate) return null;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return null;
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

function buildCumulativeStatsPerDate(history, sortedDates) {
    const aggregatedHistoryByDateMap = new Map();

    for (const h of history) {
        const key = getDateKey(h.date);
        if (!key) continue;

        const existing = aggregatedHistoryByDateMap.get(key);
        const correct = Number(h.correct) || 0;
        const total = Number(h.total) || 0;

        if (existing) {
            existing.correct += correct;
            existing.total += total;
            existing.score = existing.total > 0 ? (existing.correct / existing.total) * 100 : 0;
        } else {
            const score = h.score != null ? Number(h.score) : (total > 0 ? (correct / total) * 100 : 0);
            aggregatedHistoryByDateMap.set(key, { ...h, date: key, correct, total, score });
        }
    }

    const aggregatedHistory = Array.from(aggregatedHistoryByDateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

    const dateToStats = {};
    let accumulated = [];
    let histIdx = 0;

    // Bayesian accumulators — Prior Beta(3,3)
    let bayAlpha = 3;
    let bayBeta  = 3;

    for (const date of sortedDates) {
        while (histIdx < aggregatedHistory.length) {
            const key = aggregatedHistory[histIdx].date;
            if (key && key <= date) {
                const entry   = aggregatedHistory[histIdx];
                let total   = Number(entry.total)   || 0;
                let correct = Number(entry.correct) || 0;
                
                // LOGIC-1 FIX: Fallback para entradas sem total/correct no gráfico
                if (total === 0 && entry.score != null) {
                    const pct = Math.min(1, Math.max(0, Number(entry.score) / 100));
                    total = 10;
                    correct = Math.round(pct * 10);
                }

                if (total >= 5) {
                    bayAlpha += correct;
                    bayBeta  += (total - correct);
                }
                accumulated.push(entry);
                histIdx++;
            } else {
                break;
            }
        }
        if (accumulated.length > 0) {
            const n    = bayAlpha + bayBeta;
            const p    = bayAlpha / n;
            const variance = (bayAlpha * bayBeta) / (n * n * (n + 1));
            const sd   = Math.sqrt(variance);
            dateToStats[date] = {
                stats: computeCategoryStats(accumulated, 100),
                last:  accumulated[accumulated.length - 1],
                bayesian: {
                    mean:   p * 100,
                    ciLow:  Math.max(0,   (p - 1.96 * sd) * 100),
                    ciHigh: Math.min(100, (p + 1.96 * sd) * 100),
                    alpha:  bayAlpha,
                    beta:   bayBeta,
                },
            };
        }
    }
    return dateToStats;
}

export function useChartData(categories = [], targetScore = 80) {
    const activeCategories = useMemo(() => {
        let valid = categories.filter(c => c.simuladoStats?.history?.length > 0);
        valid.sort((a, b) => {
            const volA = (a.simuladoStats?.history || []).reduce((sum, h) => sum + (Number(h.total) || 0), 0);
            const volB = (b.simuladoStats?.history || []).reduce((sum, h) => sum + (Number(h.total) || 0), 0);
            return volB - volA;
        });

        return valid;
    }, [categories]);

    const timeline = useMemo(() => {
        if (!activeCategories.length) return [];

        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            (cat.simuladoStats?.history || []).forEach(h => {
                const dateKey = getDateKey(h.date);
                if (dateKey) allDatesSet.add(dateKey);
            });
        });

        const dates = Array.from(allDatesSet).sort();
        const dataByDate = {};

        dates.forEach((date) => {
            const [_year, month, day] = date.split("-");
            dataByDate[date] = {
                date,
                displayDate: `${day}/${month}`
            };
        });

        activeCategories.forEach(cat => {
            const history = [...(cat.simuladoStats?.history || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
            if (!history.length) return;

            const cumulativeByDate = buildCumulativeStatsPerDate(history, dates);

            const exactByDate = {};
            history.forEach(h => {
                const key = getDateKey(h.date);
                if (!key) return;
                if (!exactByDate[key]) exactByDate[key] = { correct: 0, total: 0 };
                exactByDate[key].correct += (h.correct || 0);
                exactByDate[key].total += (h.total || 0);
            });

            dates.forEach(date => {
                const snap = cumulativeByDate[date];
                if (!snap) return;

                const { stats, last } = snap;
                const exact = exactByDate[date];

                const correct = exact ? exact.correct : 0;
                const total = exact ? exact.total : 0;

                const rawDailyScore = total >= 5 ? (correct / total) * 100 : null;

                dataByDate[date][`raw_correct_${cat.name}`] = correct;
                dataByDate[date][`raw_total_${cat.name}`] = total;
                dataByDate[date][`raw_${cat.name}`] = rawDailyScore;
                dataByDate[date][`bay_${cat.name}`]        = snap.bayesian ? snap.bayesian.mean   : 0;
                dataByDate[date][`bay_ci_low_${cat.name}`]  = snap.bayesian ? snap.bayesian.ciLow  : 0;
                dataByDate[date][`bay_ci_high_${cat.name}`] = snap.bayesian ? snap.bayesian.ciHigh : 0;
                dataByDate[date][`stats_${cat.name}`] = stats ? stats.mean : 0;
                dataByDate[date][`trend_${cat.name}`] = stats ? stats.trendValue : 0;
                dataByDate[date][`trend_status_${cat.name}`] = stats ? stats.trend : 'stable';

                dataByDate[date].global_correct = (dataByDate[date].global_correct || 0) + correct;
                dataByDate[date].global_total = (dataByDate[date].global_total || 0) + total;
            });
        });

        dates.forEach(date => {
            const d = dataByDate[date];
            d.global_pct = (d.global_total > 0) ? (d.global_correct / d.global_total) * 100 : 0;
        });

        return dates.map(d => dataByDate[d]);
    }, [activeCategories]);

    const heatmapData = useMemo(() => {
        if (!activeCategories.length) return { dates: [], rows: [] };

        const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            (cat.simuladoStats?.history || []).forEach(h => {
                const dateKey = getDateKey(h.date);
                if (dateKey) allDatesSet.add(dateKey);
            });
        });

        const sortedDates = Array.from(allDatesSet).sort().slice(-60);
        const dates = sortedDates.map(dateStr => {
            const d = new Date(`${dateStr}T12:00:00`);
            const [_y, m, day] = dateStr.split('-');
            return {
                key: dateStr,
                dayName: DAY_NAMES[d.getDay()],
                label: `${day}/${m}`,
                isWeekend: d.getDay() === 0 || d.getDay() === 6,
            };
        });

        const rows = activeCategories.map(cat => {
            const dayMap = {};
            (cat.simuladoStats?.history || []).forEach(h => {
                const key = getDateKey(h.date);
                if (!key) return;
                if (!dayMap[key]) dayMap[key] = { correct: 0, total: 0 };
                dayMap[key].correct += (h.correct || 0);
                dayMap[key].total += (h.total || 0);
            });

            const cells = sortedDates.map(dateStr => {
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
    }, [activeCategories]);

    const globalMetrics = useMemo(() => {
        let totalQuestions = 0;
        let totalCorrect = 0;
        activeCategories.forEach(cat => {
            (cat.simuladoStats?.history || []).forEach(h => {
                totalQuestions += (h.total || 0);
                totalCorrect += (h.correct || 0);
            });
        });
        const globalAccuracy = (totalQuestions > 0) ? (totalCorrect / totalQuestions) * 100 : 0;
        return { totalQuestions, totalCorrect, globalAccuracy: Number.isFinite(globalAccuracy) ? globalAccuracy : 0 };
    }, [activeCategories]);

    return {
        activeCategories,
        timeline,
        heatmapData,
        globalMetrics
    };
}
