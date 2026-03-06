import { useMemo } from 'react';
import { computeCategoryStats, calculateWeightedProjectedMean } from '../engine';

const getDateKey = (rawDate) => {
    if (!rawDate) return null;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return null;
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

// Fix 2: O(n) helper — compute cumulative stats snapshot at each date position
// instead of re-filtering the full array per date (O(n²) previously)
function buildCumulativeStatsPerDate(history, sortedDates) {
    // BUG FIX: History contains multiple sessions per day. If we pass them all to computeCategoryStats,
    // the statistical engines (Bayesian EMA, Variance, Trend) will treat them as separate days,
    // distorting the moving averages and variance calculations. We must pre-aggregate by day first.
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

    // Convert back to sorted array of daily aggregates
    const aggregatedHistory = Array.from(aggregatedHistoryByDateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

    const dateToStats = {};
    let accumulated = [];
    let histIdx = 0;

    for (const date of sortedDates) {
        // Add all aggregated history entries that fall on or before this date
        while (histIdx < aggregatedHistory.length) {
            const key = aggregatedHistory[histIdx].date;
            if (key && key <= date) {
                accumulated.push(aggregatedHistory[histIdx]);
                histIdx++;
            } else {
                break;
            }
        }
        if (accumulated.length > 0) {
            dateToStats[date] = {
                stats: computeCategoryStats(accumulated, 100),
                last: accumulated[accumulated.length - 1]
            };
        }
    }
    return dateToStats;
}

/**
 * Hook for processing and memoizing chart data
 */
export function useChartData(categories = [], targetScore = 80) {
    // 1. Memoize active categories — BUG 7 FIX: filter to only cats with actual history
    // The previous useMemo had no transformation, causing unnecessary re-renders in cascade.
    const activeCategories = useMemo(
        () => categories.filter(c => c.simuladoStats?.history?.length > 0),
        [categories]
    );

    // 2. Generate Timeline Data (Common for Line/Composed charts)
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

        dates.forEach((date, i) => {
            const [_year, month, day] = date.split("-");
            dataByDate[date] = {
                date,
                displayDate: `${day}/${month}`,
                weekLabel: `Sem ${i + 1}`
            };
        });

        // Fix 2: compute cumulative stats ONCE per category — O(D + N) instead of O(D × N)
        activeCategories.forEach(cat => {
            const history = [...(cat.simuladoStats?.history || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
            if (!history.length) return;

            // Pre-build cumulative stats snapshots for all dates in one pass
            const cumulativeByDate = buildCumulativeStatsPerDate(history, dates);

            // For raw_correct / raw_total: group exact-date entries once
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

                // BUG FIX: Instead of just picking the very last simulado entered horizontally on that day,
                // we calculate the true aggregate daily score (sum of all questions correct / sum of all questions total).
                // This perfectly matches the metric shown in the Tasks/Daily summary.
                const rawDailyScore = total > 0 ? (correct / total) * 100 : (last ? last.score : 0);

                dataByDate[date][`raw_correct_${cat.name}`] = correct;
                dataByDate[date][`raw_total_${cat.name}`] = total;
                dataByDate[date][`raw_${cat.name}`] = rawDailyScore;
                dataByDate[date][`bay_${cat.name}`] = stats ? calculateWeightedProjectedMean([{ ...stats, weight: 100 }], targetScore, 0) : 0;
                dataByDate[date][`stats_${cat.name}`] = stats ? stats.mean : 0;
                dataByDate[date][`trend_${cat.name}`] = stats ? stats.trendValue : 0;
                dataByDate[date][`trend_status_${cat.name}`] = stats ? stats.trend : 'stable';

                // Global Aggregation (Multi-subject totals for the date)
                dataByDate[date].global_correct = (dataByDate[date].global_correct || 0) + correct;
                dataByDate[date].global_total = (dataByDate[date].global_total || 0) + total;
            });
        });

        // Compute global percentage for each point
        dates.forEach(date => {
            const d = dataByDate[date];
            d.global_pct = (d.global_total > 0) ? (d.global_correct / d.global_total) * 100 : 0;
        });

        return dates.map(d => dataByDate[d]);
    }, [activeCategories, targetScore]);

    // 3. Generate Heatmap Data — Fix 8: cap to last 60 unique days
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

        // Fix 8: only render last 60 days to prevent horizontal layout overflow
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

    // 4. Global Metrics
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

