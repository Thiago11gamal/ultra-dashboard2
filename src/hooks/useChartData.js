import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, BAYESIAN_DECAY_FACTOR } from '../engine/stats';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

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
    let maxAlphaEver = 1;
    const DECAY_FACTOR = BAYESIAN_DECAY_FACTOR || 0.985; // 🎯 MATH SYNC: Fator central do engine (stats.js)

    for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];
        
        while (histIdx < aggregatedHistory.length) {
            const key = aggregatedHistory[histIdx].date;
            if (key && key <= date) {
                // 🎯 BAYESIAN DECAY: Aplica o decaimento baseado no gap temporal
                const entry = aggregatedHistory[histIdx];
                const entryDate = normalizeDate(entry.date);
                const prevDate = histIdx > 0 ? normalizeDate(aggregatedHistory[histIdx - 1].date) : entryDate;
                const gapDays = Math.max(1, Math.floor((entryDate - prevDate) / (1000 * 60 * 60 * 24)));
                
                if (histIdx > 0) {
                    const entryDecay = Math.pow(DECAY_FACTOR, gapDays);
                    
                    // 🎯 DRIFT BAYESIANO: Preservar o ratio atual durante o decaimento.
                    if (entryDecay < 1.0) {
                        const currentN = bayAlpha + bayBeta;
                        const currentP = bayAlpha / currentN;
                        const newN = Math.max(2, currentN * entryDecay);
                        bayAlpha = newN * currentP;
                        bayBeta = newN * (1 - currentP);
                    }

                    // AMNÉSIA BAYESIANA: Piso de retenção permanente (30% do maior alpha já alcançado)
                    const retentionFloor = maxAlphaEver * 0.3;
                    if (bayAlpha < retentionFloor) {
                        const currentN = bayAlpha + bayBeta;
                        const currentP = (currentN > 0 && bayAlpha > 0) ? bayAlpha / currentN : 0.01;
                        bayAlpha = retentionFloor;
                        bayBeta = bayAlpha * ((1 - currentP) / currentP);
                    }
                }

                // entry já foi declarado acima na linha 55
                let total   = Number(entry.total)   || 0;
                let correct = Number(entry.correct) || 0;
                
                // LOGIC-1 FIX: Fallback para entradas sem total/correct no gráfico
                // BUG 4 FIX: Use maxScore instead of hardcoded 100.
                if (total === 0 && entry.score != null) {
                    const pct = Math.min(1, Math.max(0, Number(entry.score) / maxScore));
                    const syntheticTotal = getSyntheticTotal(maxScore);
                    total = syntheticTotal;
                    correct = Math.round(pct * syntheticTotal);
                }

                if (total >= 1) {
                    bayAlpha += Number(correct);
                    bayBeta  += (Number(total) - Number(correct));
                    if (bayAlpha > maxAlphaEver) maxAlphaEver = bayAlpha;
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

                dataByDate[date][`raw_correct_${cat.id}`] = correct;
                dataByDate[date][`raw_total_${cat.id}`] = total;
                dataByDate[date][`raw_${cat.id}`] = rawDailyScore;
                dataByDate[date][`bay_${cat.id}`]        = snap.bayesian ? (Number(snap.bayesian.mean) || 0)   : 0;
                dataByDate[date][`bay_ci_low_${cat.id}`]  = snap.bayesian ? (Number(snap.bayesian.ciLow) || 0)  : 0;
                dataByDate[date][`bay_ci_high_${cat.id}`] = snap.bayesian ? (Number(snap.bayesian.ciHigh) || 0) : 0;
                dataByDate[date][`stats_${cat.id}`] = stats ? (Number(stats.mean) || 0) : 0;
                dataByDate[date][`trend_${cat.id}`] = stats ? (Number(stats.trendValue) || 0) : 0;
                dataByDate[date][`trend_status_${cat.id}`] = stats ? stats.trend : 'stable';

                dataByDate[date].global_correct = (Number(dataByDate[date].global_correct) || 0) + correct;
                dataByDate[date].global_total = (Number(dataByDate[date].global_total) || 0) + total;
            });
        });
        dates.forEach(date => {
            const d = dataByDate[date];
            let weightedSum = 0;
            let totalW = 0;
            let sumScores = 0;
            let activeCount = 0;

            activeCategories.forEach(cat => {
                const score = d[`bay_${cat.id}`] ?? d[`raw_${cat.id}`];
                const w = weights[cat.id] ?? weights[cat.name] ?? 0;
                
                if (score != null) {
                    if (w > 0) {
                        weightedSum += score * w;
                        totalW += w;
                    }
                    // Fallback para média simples (Global se sem pesos habilitados)
                    sumScores += score;
                    activeCount++;
                }
            });

            d.global_pct = totalW > 0 ? (weightedSum / totalW) : (activeCount > 0 ? sumScores / activeCount : 0);
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
                const score = getSafeScore(h, maxScore);
                if (h.isPercentage && h.score != null && tot === 0) {
                    // BUG 4 FIX: No heatmap, não injetamos volume sintético para não sujar o visual
                    // de questões totais, mas mostramos a cor/porcentagem calculada.
                    tot = 1; // Volume mínimo para exibir a cor
                    corrNorm = (score / maxScore);
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
                let tot = Number(h.total) || 0;
                let corrNorm;
                
                // BUG 3 FIX: Incorporar simulados percentuais na Acurácia Global
                if (tot === 0 && h.score != null) {
                    tot = getSyntheticTotal(maxScore);
                    corrNorm = Math.round((getSafeScore(h, maxScore) / maxScore) * tot);
                } else {
                    const raw = Number(h.correct) || 0;
                    corrNorm = tot > 0 
                        ? Math.round((getSafeScore(h, maxScore) / maxScore) * tot)
                        : raw;
                }
                
                totalQuestions += tot;
                totalCorrect += corrNorm;
            });
        });
        const globalAccuracy = (totalQuestions > 0) ? (totalCorrect / totalQuestions) * 100 : 0;
        return { totalQuestions, totalCorrect, globalAccuracy: Number.isFinite(globalAccuracy) ? globalAccuracy : 0 };
    }, [activeCategories, maxScore]);

    return {
        activeCategories,
        timeline,
        heatmapData,
        globalMetrics
    };
}
