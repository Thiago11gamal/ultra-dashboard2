import { useMemo } from 'react';
import { computeCategoryStats, calculateWeightedProjectedMean } from '../engine';

const getDateKey = (rawDate) => {
    if (!rawDate) return null;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
};

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

        activeCategories.forEach(cat => {
            const history = [...(cat.simuladoStats?.history || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
            if (!history.length) return;

            dates.forEach(date => {
                const historyToDate = history.filter(h => {
                    const dateKey = getDateKey(h.date);
                    return dateKey && dateKey <= date;
                });
                if (historyToDate.length === 0) return;

                const last = historyToDate[historyToDate.length - 1];
                const exactlyOnDate = history.filter(h => getDateKey(h.date) === date);

                const historyWithScore = historyToDate.map(h => ({
                    ...h,
                    score: h.score != null ? h.score : (h.total > 0 ? (h.correct / h.total) * 100 : 0)
                }));
                const stats = computeCategoryStats(historyWithScore, 100);

                dataByDate[date][`raw_correct_${cat.name}`] = exactlyOnDate.length > 0 ? exactlyOnDate.reduce((acc, h) => acc + (h.correct || 0), 0) : 0;
                dataByDate[date][`raw_total_${cat.name}`] = exactlyOnDate.length > 0 ? exactlyOnDate.reduce((acc, h) => acc + (h.total || 0), 0) : 0;
                dataByDate[date][`raw_${cat.name}`] = last.score != null ? last.score : (last.total > 0 ? (last.correct / last.total) * 100 : 0);
                dataByDate[date][`bay_${cat.name}`] = stats ? calculateWeightedProjectedMean([{ ...stats, weight: 100 }], 100, 0) : 0;
                dataByDate[date][`stats_${cat.name}`] = stats ? stats.mean : 0;
            });
        });

        return dates.map(d => dataByDate[d]);
    }, [activeCategories]);

    // 3. Generate Heatmap Data
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

        const sortedDates = Array.from(allDatesSet).sort();
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
