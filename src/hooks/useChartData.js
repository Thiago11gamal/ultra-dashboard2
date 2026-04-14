import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, SYNTHETIC_TOTAL_QUESTIONS } from '../engine/stats';

const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

function buildCumulativeStatsPerDate(history, sortedDates, maxScore = 100) {
    const aggregatedHistoryByDateMap = new Map();

    for (const h of history) {
        const key = getDateKey(h.date);
        if (!key) continue;

        const existing = aggregatedHistoryByDateMap.get(key);
        const total = Number(h.total) || 0;
        const rawCorrect = Number(h.correct) || 0;
        const score = getSafeScore(h, maxScore);
        const correct = total > 0 ? Math.round((score / maxScore) * total) : rawCorrect;

        if (existing) {
            if (existing.total + total > 0) {
                existing.score = ((existing.correct + correct) / (existing.total + total)) * maxScore;
            }
            existing.correct += correct;
            existing.total += total;
        } else {
            aggregatedHistoryByDateMap.set(key, { ...h, date: key, correct, total, score });
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

    // Bayesian accumulators — Prior Beta(1,1) Neutral Laplace
    let bayAlpha = 1;
    let bayBeta  = 1;

    for (const date of sortedDates) {
        while (histIdx < aggregatedHistory.length) {
            const key = aggregatedHistory[histIdx].date;
            if (key && key <= date) {
                const entry   = aggregatedHistory[histIdx];
                let total   = Number(entry.total)   || 0;
                let correct = Number(entry.correct) || 0;
                
                // LOGIC-1 FIX: Fallback para entradas sem total/correct no gráfico
                // BUG 4 FIX: Use maxScore instead of hardcoded 100.
                if (total === 0 && entry.score != null) {
                    const pct = Math.min(1, Math.max(0, Number(entry.score) / maxScore));
                    total = SYNTHETIC_TOTAL_QUESTIONS;
                    correct = Math.round(pct * SYNTHETIC_TOTAL_QUESTIONS);
                }

                if (total >= 1) {
                    bayAlpha += Number(correct);
                    bayBeta  += (Number(total) - Number(correct));
                }
                accumulated.push(entry);
                histIdx++;
            } else {
                break;
            }
        }
        if (accumulated.length > 0) {
            // BUG 4b FIX: Propagate maxScore to computeCategoryStats and computeBayesianLevel
            const bayStats = computeBayesianLevel([], bayAlpha, bayBeta, maxScore);
            dateToStats[date] = {
                stats: computeCategoryStats(accumulated, 100, 60, maxScore),
                last:  accumulated[accumulated.length - 1],
                bayesian: {
                    mean:   bayStats.mean,
                    ciLow:  bayStats.ciLow,
                    ciHigh: bayStats.ciHigh,
                    alpha:  bayAlpha,
                    beta:   bayBeta,
                },
            };
        }
    }
    return dateToStats;
}

export function useChartData(categories = EMPTY_ARRAY, weights = EMPTY_OBJECT, maxScore = 100) {
    const activeCategories = useMemo(() => {
        let valid = categories.filter(c => {
            const hist = c.simuladoStats?.history;
            return hist && Object.values(hist).length > 0;
        });

        valid.sort((a, b) => {
            const historyA = Object.values(a.simuladoStats?.history || EMPTY_OBJECT);
            const historyB = Object.values(b.simuladoStats?.history || EMPTY_OBJECT);
            const volA = historyA.reduce((sum, h) => sum + (Number(h.total) || 0), 0);
            const volB = historyB.reduce((sum, h) => sum + (Number(h.total) || 0), 0);
            return volB - volA;
        });

        return valid;
    }, [categories]);

    const timeline = useMemo(() => {
        if (!activeCategories.length) return [];

        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            Object.values(cat.simuladoStats?.history || EMPTY_OBJECT).forEach(h => {
                const dateKey = getDateKey(h.date);
                if (dateKey) allDatesSet.add(dateKey);
            });
        });

        const sortedDates = Array.from(allDatesSet).sort();
        const dates = sortedDates;
        const dataByDate = {};

        dates.forEach((date) => {
            const [, month, day] = date.split("-");
            dataByDate[date] = {
                date,
                displayDate: `${day}/${month}`
            };
        });

        activeCategories.forEach(cat => {
            const history = Object.values(cat.simuladoStats?.history || EMPTY_OBJECT).sort((a, b) => {
                const dA = normalizeDate(a.date);
                const dB = normalizeDate(b.date);
                return (dA?.getTime() || 0) - (dB?.getTime() || 0);
            });
            if (!history.length) return;

            const cumulativeByDate = buildCumulativeStatsPerDate(history, dates, maxScore);

            const exactByDate = {};
            history.forEach(h => {
                const key = getDateKey(h.date);
                if (!key) return;
                if (!exactByDate[key]) exactByDate[key] = { correct: 0, total: 0 };
                const tot = Number(h.total) || 0;
                const rawC = Number(h.correct) || 0;
                const score = getSafeScore(h, maxScore);
                const corrNorm = tot > 0 ? Math.round((score / maxScore) * tot) : rawC;
                exactByDate[key].correct += corrNorm;
                exactByDate[key].total   += tot;
            });

            dates.forEach(date => {
                const snap = cumulativeByDate[date];
                if (!snap) return;

                const { stats, last } = snap;
                const exact = exactByDate[date];

                const correct = exact ? exact.correct : 0;
                const total = exact ? exact.total : 0;

                const rawDailyScore = total >= 1 ? (correct / total) * maxScore : null;

                dataByDate[date][`raw_correct_${cat.name}`] = correct;
                dataByDate[date][`raw_total_${cat.name}`] = total;
                dataByDate[date][`raw_${cat.name}`] = rawDailyScore;
                dataByDate[date][`bay_${cat.name}`]        = snap.bayesian ? snap.bayesian.mean   : 0;
                dataByDate[date][`bay_ci_low_${cat.name}`]  = snap.bayesian ? snap.bayesian.ciLow  : 0;
                dataByDate[date][`bay_ci_high_${cat.name}`] = snap.bayesian ? snap.bayesian.ciHigh : 0;
                dataByDate[date][`stats_${cat.name}`] = stats ? stats.mean : 0;
                dataByDate[date][`trend_${cat.name}`] = stats ? stats.trendValue : 0;
                dataByDate[date][`trend_status_${cat.name}`] = stats ? stats.trend : 'stable';

                dataByDate[date].global_correct = (Number(dataByDate[date].global_correct) || 0) + correct;
                dataByDate[date].global_total = (Number(dataByDate[date].global_total) || 0) + total;
            });
        });

        dates.forEach(date => {
            const d = dataByDate[date];
            
            // RIGOR-09 FIX: Calcular a média global ponderada real
            // Se houver pesos definidos e válidos, as matérias sem peso (0) 
            // não devem influenciar o "Global" do gráfico de evolução.
            let weightedSum = 0;
            let totalW = 0;

            activeCategories.forEach(cat => {
                const score = d[`bay_${cat.name}`] ?? d[`raw_${cat.name}`];
                const w = weights[cat.id] ?? weights[cat.name] ?? 0; // Fallback 0 se sem pesos

                if (score != null && w > 0) {
                    weightedSum += score * w;
                    totalW += w;
                }
            });

            d.global_pct = totalW > 0 ? (weightedSum / totalW) : ((d.global_total > 0) ? (d.global_correct / d.global_total) * maxScore : 0);
        });

        return dates.map(d => dataByDate[d]);
    }, [activeCategories, weights, maxScore]);

    const heatmapData = useMemo(() => {
        if (!activeCategories.length) return { dates: [], rows: [] };

        const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            Object.values(cat.simuladoStats?.history || EMPTY_OBJECT).forEach(h => {
                const dateKey = getDateKey(h.date);
                if (dateKey) allDatesSet.add(dateKey);
            });
        });

        const sortedDates = Array.from(allDatesSet).sort();
        const datesToUse = sortedDates.slice(-60);
        const dates = datesToUse.map(dateStr => {
            const d = normalizeDate(dateStr);
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
            Object.values(cat.simuladoStats?.history || EMPTY_OBJECT).forEach(h => {
                const key = getDateKey(h.date);
                if (!key) return;
                if (!dayMap[key]) dayMap[key] = { correct: 0, total: 0 };
                let tot = Number(h.total) || 0;
                let raw = Number(h.correct) || 0;
                let corrNorm;
                if (h.isPercentage && h.score != null && tot > 0) {
                    corrNorm = Math.round((Math.min(maxScore, Math.max(0, Number(h.score))) / maxScore) * tot);
                } else if (h.isPercentage && h.score != null && tot === 0) {
                    // BUG 4 FIX: No heatmap, não injetamos volume sintético para não sujar o visual
                    // de questões totais, mas mostramos a cor/porcentagem calculada.
                    tot = 1; // Volume mínimo para exibir a cor
                    corrNorm = (Math.min(maxScore, Math.max(0, Number(h.score))) / maxScore);
                } else {
                    corrNorm = raw;
                }
                dayMap[key].correct += corrNorm;
                dayMap[key].total += tot;
            });

            const cells = datesToUse.map(dateStr => {
                const entry = dayMap[dateStr];
                if (!entry || entry.total === 0) return null;
                return {
                    pct: (entry.correct / entry.total) * maxScore,
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
            Object.values(cat.simuladoStats?.history || EMPTY_OBJECT).forEach(h => {
                const tot = Number(h.total) || 0;
                const raw = Number(h.correct) || 0;
                const corrNorm = (h.isPercentage && h.score != null && tot > 0)
                    ? Math.round((Math.min(maxScore, Math.max(0, Number(h.score))) / maxScore) * tot)
                    : raw;
                totalQuestions += tot;
                totalCorrect += corrNorm;
            });
        });
        const globalAccuracy = (totalQuestions > 0) ? (totalCorrect / totalQuestions) * maxScore : 0;
        return { totalQuestions, totalCorrect, globalAccuracy: Number.isFinite(globalAccuracy) ? globalAccuracy : 0 };
    }, [activeCategories, maxScore]);

    return {
        activeCategories,
        timeline,
        heatmapData,
        globalMetrics
    };
}
