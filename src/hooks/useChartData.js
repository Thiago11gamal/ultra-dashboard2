import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, BAYESIAN_DECAY_FACTOR } from '../engine/stats';
import { getSafeScore } from '../utils/scoreHelper';

const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

function buildCumulativeStatsPerDate(history, sortedDates, maxScore = 100) {
    const aggregatedHistoryByDateMap = new Map();

    for (const h of history) {
        const key = getDateKey(getHistoryDate(h));
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
                        const safeP = Math.min(0.999999, Math.max(0.000001, currentP));
                        bayAlpha = retentionFloor;
                        bayBeta = bayAlpha * ((1 - safeP) / safeP);
                    }
                }

                // entry já foi declarado acima na linha 55
                let total   = Number(entry.total)   || 0;
                let correct = Number(entry.correct) || 0;
                
                // LOGIC-1 FIX: Fallback para entradas sem total/correct no gráfico
                // BUG 4 FIX: Use maxScore instead of hardcoded 100.
                // FIX BUG 1 (Matemática): Consistência Bayesiana para entradas percentuais
                if (total === 0 && entry.score != null) {
                    const pct = Math.min(1, Math.max(0, Number(entry.score) / maxScore));
                    total = 5; // Peso estatístico realista mínimo para estabilidade bayesiana
                    correct = Math.round(pct * total);
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
            const lastEntry = accumulated.length > 0 ? accumulated[accumulated.length - 1] : null;
            const bayStats = computeBayesianLevel([], bayAlpha, bayBeta, maxScore, {
                referenceDate: date,
                lastEventDate: lastEntry ? lastEntry.date : null
            });
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
    const categoriesVersion = useMemo(() => categories.map((cat) => {
        const history = Object.values(cat?.simuladoStats?.history || EMPTY_OBJECT);
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
            const historyA = Object.values(a.simuladoStats?.history || EMPTY_OBJECT);
            const historyB = Object.values(b.simuladoStats?.history || EMPTY_OBJECT);
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
            Object.values(cat.simuladoStats?.history || EMPTY_OBJECT).forEach(h => {
                const dateKey = getDateKey(getHistoryDate(h));
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

                const { stats } = snap;
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

                dataByDate[date].global_total = (Number(dataByDate[date].global_total) || 0) + total;
            });

            // 🎯 RIGOR-10 FIX: Removed direct object mutation that caused "object is not extensible" errors.
            // Component-level decoration should happen in the UI layer or via useMemo to preserve immutability.
            // (Decoration logic for currentLevels removed as it was unused and violating prop immutability)

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
                
                if (Number.isFinite(score) && score !== null) {
                    if (w > 0) {
                        weightedSum += score * w;
                        totalW += w;
                    }
                    // Fallback para média simples (Global se sem pesos habilitados)
                    sumScores += score;
                    activeCount++;
                }
            });

            const rawGlobal = totalW > 0 ? (weightedSum / totalW) : (activeCount > 0 ? sumScores / activeCount : 0);
            d.global_pct = Number.isFinite(rawGlobal) ? Math.max(0, Math.min(maxScore, rawGlobal)) : 0;
        });

        return dates.map(d => dataByDate[d]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategories, weights, maxScore, categoriesVersion]);

    const heatmapData = useMemo(() => {
        if (!activeCategories.length) return { dates: [], rows: [] };

        const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const allDatesSet = new Set();
        activeCategories.forEach(cat => {
            Object.values(cat.simuladoStats?.history || EMPTY_OBJECT).forEach(h => {
                const dateKey = getDateKey(getHistoryDate(h));
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
                const key = getDateKey(getHistoryDate(h));
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
            Object.values(cat.simuladoStats?.history || EMPTY_OBJECT).forEach(h => {
                let tot = Number(h.total) || 0;
                let corrNorm;
                
                // BUG 3 FIX: Incorporar simulados percentuais na Acurácia Global
                // FIX BUG 2 (Matemática): Previne distorção na quantidade absoluta total.
                // Se o usuário apenas inseriu nota (tot = 0), computamos isso com volume mínimo (1)
                // para que a nota participe da Global Accuracy, sem adicionar centenas de questões 
                // fantasmas ao "Total de Questões" resolvido.
                if (tot === 0 && h.score != null) {
                    tot = 1; 
                    corrNorm = (getSafeScore(h, maxScore) / maxScore) * tot;
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
