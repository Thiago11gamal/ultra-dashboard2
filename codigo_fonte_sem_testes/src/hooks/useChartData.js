import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, BAYESIAN_DECAY_FACTOR } from '../engine/stats';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const getHistoryArray = (cat) => Object.values(cat?.simuladoStats?.history || EMPTY_OBJECT).filter(Boolean).filter(r => r.valid !== false);
const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

export function buildCumulativeStatsPerDate(history, sortedDates, maxScore = 100, minScore = 0, weight = 1) {
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeRange = Math.max(1e-9, safeMax - safeMin);
    const toRatio = (score) => {
        const n = Number(score);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(1, (n - safeMin) / safeRange));
    };
    // FIX 2A: validar sortedDates
    if (!Array.isArray(sortedDates) || sortedDates.length === 0) return {};

    // ── PASSO 1: agregar por data em UMA passagem ──────────────────
    const aggregatedByDate = new Map();
    for (const h of history) {
        const key = getDateKey(getHistoryDate(h));
        if (!key) continue;
        const rawTotal = Math.max(0, Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) || 0);
        const hasCorrect = (h?.correct !== undefined && h?.correct !== null && String(h?.correct).trim() !== '') ||
                          (h?.acertos !== undefined && h?.acertos !== null && String(h?.acertos).trim() !== '') ||
                          (h?.correctCount !== undefined && h?.correctCount !== null && String(h?.correctCount).trim() !== '');
        const parsedCorrect = Number(h?.correct ?? h?.acertos ?? h?.correctCount);
        const rawCorrect = hasCorrect && Number.isFinite(parsedCorrect)
            ? Math.max(0, Math.min(rawTotal > 0 ? rawTotal : Infinity, parsedCorrect))
            : 0;
        const score = getSafeScore(h, safeMax, safeMin);
        const hasScore = Number.isFinite(score);
        const safeScore = hasScore ? score : NaN;

        const isPercentOnly = rawTotal <= 0 && hasScore;

        let compTotal = rawTotal;
        let compCorrect = rawCorrect;

        if (isPercentOnly) {
            compTotal = getSyntheticTotal(safeMax);
            compCorrect = Math.round(toRatio(score) * compTotal);
        } else if (rawTotal > 0 && hasScore) {
            compCorrect = Math.round(toRatio(score) * rawTotal);
        }
        compCorrect = Math.max(0, Math.min(compTotal, Number.isFinite(compCorrect) ? compCorrect : 0));

        if (!aggregatedByDate.has(key)) {
            aggregatedByDate.set(key, {
                date: key,
                realTotal: 0,
                realCorrect: 0,
                compTotal: 0,
                compCorrect: 0,
                total: 0,
                correct: 0,
                scoreSum: 0,
                scoreCount: 0,
                hasSynthetic: false,
                score: safeScore
            });
        }

        const entry = aggregatedByDate.get(key);

        if (!isPercentOnly) {
            entry.realTotal += rawTotal;
            entry.realCorrect += rawCorrect;
            entry.total += rawTotal;
            entry.correct += rawCorrect;
        }

        entry.compTotal += compTotal;
        entry.compCorrect += compCorrect;

        if (hasScore) {
            entry.scoreSum += score;
            entry.scoreCount += 1;
        }

        if (isPercentOnly) {
            entry.hasSynthetic = true;
        }

        entry.score = entry.compTotal > 0
            ? safeMin + (entry.compCorrect / entry.compTotal) * safeRange
            : (hasScore ? score : NaN);
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
    let cachedStats = null;
    let lastAccumulatedLen = 0;

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
                // ✅ FIX L05: bayAlpha e bayBeta nunca podem ser negativos.
                // Adicionadas verificações de sanidade após cada operação.
                if (entryDecay < 1.0) {
                    const currentN = bayAlpha + bayBeta;
                    if (currentN > 0) {
                        const currentP = Math.max(0.000001, Math.min(0.999999, bayAlpha / currentN));
                        const newN = Math.max(2, currentN * entryDecay);
                        bayAlpha = Math.max(0.000001, newN * currentP);
                        bayBeta = Math.max(0.000001, newN * (1 - currentP));
                    }
                }
                
                const retentionFloor = Math.max(3, maxAlphaEver * 0.3);
                if (bayAlpha < retentionFloor) {
                    const currentN = bayAlpha + bayBeta;
                    const currentP = currentN > 0 && bayAlpha > 0
                        ? Math.max(0.000001, Math.min(0.999999, bayAlpha / currentN))
                        : 0.5;
                    bayAlpha = retentionFloor;
                    bayBeta = Math.max(0.000001, retentionFloor * ((1 - currentP) / currentP));
                }
                
                // ✅ FIX: Garantia final de sanidade
                if (!Number.isFinite(bayAlpha) || bayAlpha < 0) bayAlpha = 1;
                if (!Number.isFinite(bayBeta) || bayBeta < 0) bayBeta = 1;
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
            if (accumulated.length !== lastAccumulatedLen || !cachedStats) {
                const safeWeight = Number.isFinite(Number(weight)) ? Number(weight) : 1;
                cachedStats = computeCategoryStats(accumulated, safeWeight, 60, safeMax, safeMin);
                lastAccumulatedLen = accumulated.length;
            }
            const lastEntry = accumulated[accumulated.length - 1];
            const bayStats = computeBayesianLevel(accumulated, 1, 1, safeMax, {
                referenceDate: date,
                lastEventDate: lastEntry ? lastEntry.date : null,
                minScore: safeMin,
            });
            const aggTotals = accumulated.reduce((acc, e) => {
                acc.realTotal += (e.realTotal ?? 0);
                acc.realCorrect += (e.realCorrect ?? 0);
                acc.compTotal += (e.compTotal ?? 0);
                acc.compCorrect += (e.compCorrect ?? 0);
                if (e.hasSynthetic) acc.hasSynthetic = true;
                return acc;
            }, { realTotal: 0, realCorrect: 0, compTotal: 0, compCorrect: 0, hasSynthetic: false });

            dateToStats[date] = {
                stats: cachedStats ? {
                    ...cachedStats,
                    realTotal: aggTotals.realTotal,
                    realCorrect: aggTotals.realCorrect,
                    compTotal: aggTotals.compTotal,
                    compCorrect: aggTotals.compCorrect,
                    hasSynthetic: aggTotals.hasSynthetic
                } : null,
                last: lastEntry,
                bayesian: {
                    mean: bayStats.mean,
                    ciLow: bayStats.ciLow,
                    ciHigh: bayStats.ciHigh,
                    alpha: bayStats.alpha,
                    beta: bayStats.beta,
                },
            };
        }
    }

    return dateToStats;
}

export function useChartData(categoriesInput = EMPTY_ARRAY, weights = EMPTY_OBJECT, maxScore = 100, minScore = 0) {
    const categories = Array.isArray(categoriesInput) ? categoriesInput : EMPTY_ARRAY;
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;

    const categoriesVersion = useMemo(() => categories.map((cat) => {
        const history = getHistoryArray(cat);
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : EMPTY_ARRAY;
        const histDigest = history.map((h) => [
            getDateKey(getHistoryDate(h)) || 'nodate',
            Number(h?.score ?? 0),
            Number(h?.correct ?? 0),
            Number(h?.total ?? 0),
            Array.isArray(h?.topics) ? h.topics.length : Object.values(h?.topics || {}).length,
            h?.taskId || ''
        ].join(':')).join('|');
        return [cat?.id || '', cat?.name || '', tasks.length, histDigest].join('::');
    }).join('||'), [categories]);

    const activeCategories = useMemo(() => {
        let valid = categories.filter(c => {
            const hist = c?.simuladoStats?.history;
            return Object.values(hist || {}).some(entry => {
                if (!entry || typeof entry !== 'object') return false;
                const hasScore = Number.isFinite(Number(entry.score ?? entry.scorePoints));
                const entryTot = Number(entry.total ?? entry.questoes ?? entry.totalQuestoes ?? entry.questions);
                const hasTotal = Number.isFinite(entryTot) && entryTot > 0;
                const hasCorrect = Number.isFinite(Number(entry.correct ?? entry.acertos ?? entry.correctCount));
                return hasScore || hasTotal || hasCorrect;
            });
        });
        const getVol = (h) => {
            const t = Math.max(0, Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) || 0);
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
            const history = [...getHistoryArray(cat)].sort((a, b) => {
                const dA = normalizeDate(getHistoryDate(a));
                const dB = normalizeDate(getHistoryDate(b));
                return (dA?.getTime() || 0) - (dB?.getTime() || 0);
            });
            if (!history.length) return;
            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMax;
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : safeMin;
            const catRange = Math.max(1e-9, catMax - catMin);
            const toCatRatio = (score) => {
                const n = Number(score);
                if (!Number.isFinite(n)) return 0;
                return Math.max(0, Math.min(1, (n - catMin) / catRange));
            };

            const catWeight = Number.isFinite(Number(weights?.[cat.id]))
                ? Number(weights[cat.id])
                : (Number.isFinite(Number(cat?.weight)) ? Number(cat.weight) : 1);
            const cumulativeByDate = buildCumulativeStatsPerDate(history, dates, catMax, catMin, catWeight);
            const exactByDate = {};
            history.forEach(h => {
                const key = getDateKey(getHistoryDate(h));
                if (!key) return;
                if (!exactByDate[key]) exactByDate[key] = { correct: 0, total: 0, compCorrect: 0, compTotal: 0 };
                const rawTotal = Math.max(0, Number(h.total) || 0);
                const rawC = Math.max(0, Math.min(rawTotal, Number(h.correct) || 0));
                const score = getSafeScore(h, catMax, catMin);
                if (!Number.isFinite(score)) return;
                let corrNorm;
                if (rawTotal > 0) {
                    corrNorm = (!h.isPercentage && Number.isFinite(Number(h.correct)))
                        ? rawC
                        : Math.max(0, Math.min(rawTotal, Math.round(toCatRatio(score) * rawTotal)));
                } else {
                    corrNorm = rawC;
                }
                let compTotal = rawTotal;
                let compCorrect = corrNorm;
                if (rawTotal === 0 && h.score != null) {
                    compTotal = getSyntheticTotal(catMax);
                    compCorrect = Math.round(toCatRatio(score) * compTotal);
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
                    const calc = catMin + (exact.compCorrect / exact.compTotal) * catRange;
                    rawDailyScore = Number.isFinite(calc) ? calc : null;
                } else if (exact && snap?.last) {
                    const s = getSafeScore(snap.last, catMax, catMin);
                    rawDailyScore = Number.isFinite(s) ? s : null;
                }
                dataByDate[date] = {
                    ...dataByDate[date],
                    [`raw_correct_${cat.id}`]: displayCorrect,
                    [`raw_total_${cat.id}`]: displayTotal,
                    [`raw_${cat.id}`]: rawDailyScore,
                    [`bay_${cat.id}`]: snap.bayesian ? (Number.isFinite(Number(snap.bayesian.mean)) ? Number(snap.bayesian.mean) : catMin) : null,
                    [`bay_ci_low_${cat.id}`]: snap.bayesian ? (Number.isFinite(Number(snap.bayesian.ciLow)) ? Number(snap.bayesian.ciLow) : catMin) : catMin,
                    [`bay_ci_high_${cat.id}`]: snap.bayesian ? (Number.isFinite(Number(snap.bayesian.ciHigh)) ? Number(snap.bayesian.ciHigh) : catMax) : catMax,
                    [`stats_${cat.id}`]: stats ? (Number.isFinite(Number(stats.mean)) ? Number(stats.mean) : catMin) : catMin,
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
            const parts = typeof dateStr === 'string' ? dateStr.split('-') : [];
            const day = parts[2] || '01';
            const m = parts[1] || '01';
            const dayOfWeek = (d instanceof Date && !isNaN(d.getTime())) ? d.getDay() : 0;
            return {
                key: dateStr,
                dayName: DAY_NAMES[dayOfWeek] || '',
                label: `${day}/${m}`,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            };
        });

        const rows = activeCategories.map(cat => {
            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMax;
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : safeMin;
            const catRange = Math.max(1e-9, catMax - catMin);
            const toCatRatio = (score) => {
                const n = Number(score);
                if (!Number.isFinite(n)) return 0;
                return Math.max(0, Math.min(1, (n - catMin) / catRange));
            };
            const dayMap = {};
            getHistoryArray(cat).forEach(h => {
                const key = getDateKey(getHistoryDate(h));
                if (!key) return;
                if (!dayMap[key]) dayMap[key] = { correct: 0, total: 0 };
                let tot = Math.max(0, Number(h.total) || 0);
                const raw = Math.max(0, Number(h.correct) || 0);
                let corrNorm;
                const score = getSafeScore(h, catMax, catMin);
                if (!Number.isFinite(score)) return;
                if (h.score != null && tot === 0) {
                    tot = getSyntheticTotal(catMax);
                    corrNorm = Math.round(toCatRatio(score) * tot);
                } else if (!h.isPercentage && Number.isFinite(Number(h.correct))) {
                    corrNorm = Math.max(0, Math.min(tot, raw));
                } else {
                    corrNorm = tot > 0 ? Math.round(toCatRatio(score) * tot) : raw;
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
    }, [activeCategories, safeMax, safeMin]);

    const globalMetrics = useMemo(() => {
        let totalQuestions = 0;
        let totalCorrect = 0;
        let syntheticQuestions = 0;
        let syntheticCorrect = 0;
        activeCategories.forEach(cat => {
            const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMax;
            const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : safeMin;
            const catRange = Math.max(1e-9, catMax - catMin);
            const toCatRatio = (score) => {
                const n = Number(score);
                if (!Number.isFinite(n)) return 0;
                return Math.max(0, Math.min(1, (n - catMin) / catRange));
            };
            getHistoryArray(cat).forEach(h => {
                let tot = Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
                const score = getSafeScore(h, catMax, catMin);
                if (!Number.isFinite(score)) return;

                const isSyntheticVolume =
                    h?.syntheticVolume === true ||
                    h?.isSynthetic === true ||
                    h?.type === 'percent-only' ||
                    (tot === 0 && h?.score != null);

                const hasExplicitC = (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '') ||
                                    (h.acertos !== undefined && h.acertos !== null && String(h.acertos).trim() !== '') ||
                                    (h.correctCount !== undefined && h.correctCount !== null && String(h.correctCount).trim() !== '');
                const rawParsedC = Number(h.correct ?? h.acertos ?? h.correctCount);

                let corrNorm;
                if (isSyntheticVolume && tot === 0) {
                    tot = getSyntheticTotal(catMax);
                    corrNorm = Math.round(toCatRatio(score) * tot);
                } else if (!h.isPercentage && hasExplicitC && Number.isFinite(rawParsedC)) {
                    corrNorm = Math.max(0, Math.min(tot, rawParsedC));
                } else {
                    const raw = Math.max(0, Number.isFinite(rawParsedC) ? rawParsedC : 0);
                    corrNorm = tot > 0 ? Math.round(toCatRatio(score) * tot) : raw;
                }
                // FIX 2B: blindagem extra contra NaN em corrNorm e tot
                if (!Number.isFinite(corrNorm)) return;
                const safeTot = Number(tot);
                if (!Number.isFinite(safeTot) || safeTot <= 0) return;

                const safeCorr = Math.max(0, Math.min(safeTot, corrNorm));

                if (!isSyntheticVolume) {
                    totalQuestions += safeTot;
                    totalCorrect += safeCorr;
                } else {
                    syntheticQuestions += safeTot;
                    syntheticCorrect += safeCorr;
                }
            });
        });
        const globalAccuracy = (totalQuestions > 0)
            ? (totalCorrect / totalQuestions) * 100
            : (syntheticQuestions > 0 ? (syntheticCorrect / syntheticQuestions) * 100 : 0);
        return {
            totalQuestions: Number.isFinite(totalQuestions) ? totalQuestions : 0,
            totalCorrect: Number.isFinite(totalCorrect) ? totalCorrect : 0,
            syntheticQuestions: Number.isFinite(syntheticQuestions) ? syntheticQuestions : 0,
            syntheticCorrect: Number.isFinite(syntheticCorrect) ? syntheticCorrect : 0,
            globalAccuracy: Number.isFinite(globalAccuracy) ? globalAccuracy : 0
        };
    }, [activeCategories, safeMax, safeMin]);

    return { activeCategories, timeline, heatmapData, globalMetrics };
}

