import { useMemo } from 'react';
import { computeCategoryStats, calculateWeightedProjectedMean } from '../engine';

const getDateKey = (rawDate) => {
    if (!rawDate) return null;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
};

// Fix 2: O(n) helper — compute cumulative stats snapshot at each date position
// instead of re-filtering the full array per date (O(n²) previously)
function buildCumulativeStatsPerDate(history, sortedDates) {
    const dateToStats = {};
    // history must already be sorted by date
    let accumulated = [];
    let histIdx = 0;

    for (const date of sortedDates) {
        // Add all history entries that fall on or before this date
        while (histIdx < history.length) {
            const key = getDateKey(history[histIdx].date);
            if (key && key <= date) {
                const h = history[histIdx];
                accumulated.push({
                    ...h,
                    score: h.score != null ? h.score : (h.total > 0 ? (h.correct / h.total) * 100 : 0)
                });
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
export function useChartData(categories = []) {
    // 1. Memoize active categories (those with history)
    const activeCategories = useMemo(
        () => categories,
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

                dataByDate[date][`raw_correct_${cat.name}`] = exact ? exact.correct : 0;
                dataByDate[date][`raw_total_${cat.name}`] = exact ? exact.total : 0;
                dataByDate[date][`raw_${cat.name}`] = last.score;
                dataByDate[date][`bay_${cat.name}`] = stats ? calculateWeightedProjectedMean([{ ...stats, weight: 100 }], 100, 0) : 0;
                dataByDate[date][`stats_${cat.name}`] = stats ? stats.mean : 0;
            });
        });

        return dates.map(d => dataByDate[d]);
    }, [activeCategories]);

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
        const globalAccuracy = (totalQuestions > 0 && !isNaN(totalCorrect)) ? (totalCorrect / totalQuestions) * 100 : 0;
        return { totalQuestions: totalQuestions || 0, totalCorrect: totalCorrect || 0, globalAccuracy };
    }, [activeCategories]);

    return {
        activeCategories,
        timeline,
        heatmapData,
        globalMetrics
    };
}

