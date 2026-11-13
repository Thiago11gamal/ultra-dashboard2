import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel } from '../engine/stats';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const getHistoryArray = (cat) => Object.values(cat?.simuladoStats?.history || EMPTY_OBJECT).filter(Boolean).filter(r => r.valid !== false);
const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

function extractTopicsTotals(entry, safeMax, safeMin) {
    const rawTopics = entry?.topics;
    const topicsList = Array.isArray(rawTopics)
        ? rawTopics
        : (rawTopics && typeof rawTopics === 'object' ? Object.values(rawTopics) : EMPTY_ARRAY);
    if (!topicsList.length) return { total: 0, correct: 0, hasTopicsScore: false, score: NaN };

    const safeRange = Math.max(1e-9, safeMax - safeMin);
    let sumTotal = 0;
    let sumCorrect = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    for (const t of topicsList) {
        if (!t || typeof t !== 'object') continue;
        const tTot = Math.max(0, Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) || 0);
        const hasTC = (t.correct !== undefined && t.correct !== null && String(t.correct).trim() !== '') ||
                      (t.acertos !== undefined && t.acertos !== null && String(t.acertos).trim() !== '') ||
                      (t.correctCount !== undefined && t.correctCount !== null && String(t.correctCount).trim() !== '');
        const parsedTC = Number(t.correct ?? t.acertos ?? t.correctCount);
        const tScore = getSafeScore(t, safeMax, safeMin);
        if (tTot > 0) {
            sumTotal += tTot;
            if (!t.isPercentage && hasTC && Number.isFinite(parsedTC)) {
                sumCorrect += Math.max(0, Math.min(tTot, parsedTC));
            } else if (Number.isFinite(tScore)) {
                const ratio = Math.max(0, Math.min(1, (tScore - safeMin) / safeRange));
                sumCorrect += Math.round(ratio * tTot);
            }
        } else if (Number.isFinite(tScore)) {
            scoreSum += tScore;
            scoreCount += 1;
        }
    }

    if (sumTotal > 0) {
        const derivedScore = safeMin + (sumCorrect / sumTotal) * safeRange;
        return { total: sumTotal, correct: sumCorrect, hasTopicsScore: true, score: derivedScore };
    }
    if (scoreCount > 0) {
        return { total: 0, correct: 0, hasTopicsScore: true, score: scoreSum / scoreCount };
    }
    return { total: 0, correct: 0, hasTopicsScore: false, score: NaN };
}

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
        if (!h || h.valid === false) continue;
        const key = getDateKey(getHistoryDate(h));
        if (!key) continue;
        let rawTotal = Math.max(0, Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) || 0);
        let hasCorrect = (h?.correct !== undefined && h?.correct !== null && String(h?.correct).trim() !== '') ||
                         (h?.acertos !== undefined && h?.acertos !== null && String(h?.acertos).trim() !== '') ||
                         (h?.correctCount !== undefined && h?.correctCount !== null && String(h?.correctCount).trim() !== '');
        let parsedCorrect = Number(h?.correct ?? h?.acertos ?? h?.correctCount);
        let rawCorrect = hasCorrect && Number.isFinite(parsedCorrect)
            ? Math.max(0, Math.min(rawTotal > 0 ? rawTotal : Infinity, parsedCorrect))
            : 0;
        let score = getSafeScore(h, safeMax, safeMin);
        if (rawTotal <= 0) {
            const topicFallback = extractTopicsTotals(h, safeMax, safeMin);
            if (topicFallback.total > 0) {
                rawTotal = topicFallback.total;
                rawCorrect = topicFallback.correct;
                hasCorrect = true;
                parsedCorrect = rawCorrect;
                if (!Number.isFinite(score) || score === safeMin) {
                    score = topicFallback.score;
                }
            } else if (!Number.isFinite(score) && topicFallback.hasTopicsScore) {
                score = topicFallback.score;
            }
        }
        const hasScore = Number.isFinite(score);
        const safeScore = hasScore ? score : NaN;
        if (rawTotal <= 0 && !hasScore) continue;

        const isPercentOnly =
            h?.syntheticVolume === true ||
            h?.isSynthetic === true ||
            h?.type === 'percent-only' ||
            (rawTotal <= 0 && hasScore);

        let compTotal = rawTotal;
        let compCorrect = rawCorrect;

        if (isPercentOnly) {
            compTotal = getSyntheticTotal(safeMax);
            compCorrect = toRatio(score) * compTotal;
        } else if (rawTotal > 0) {
            if (!h?.isPercentage && hasCorrect && Number.isFinite(parsedCorrect)) {
                compCorrect = rawCorrect;
            } else if (hasScore) {
                compCorrect = Math.round(toRatio(score) * rawTotal);
            }
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
    const accumulated = [];
    let histIdx = 0;
    let cachedStats = null;
    let lastAccumulatedLen = 0;
    const aggTotals = {
        realTotal: 0,
        realCorrect: 0,
        compTotal: 0,
        compCorrect: 0,
        hasSynthetic: false
    };

    for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];

        // Consome entradas do histórico ordenado até a data atual
        while (histIdx < sortedKeys.length && sortedKeys[histIdx] <= date) {
            const key = sortedKeys[histIdx];
            const entry = aggregatedByDate.get(key);
            histIdx++;
            if (!entry) continue;

            aggTotals.realTotal += (entry.realTotal ?? 0);
            aggTotals.realCorrect += (entry.realCorrect ?? 0);
            aggTotals.compTotal += (entry.compTotal ?? 0);
            aggTotals.compCorrect += (entry.compCorrect ?? 0);
            if (entry.hasSynthetic) aggTotals.hasSynthetic = true;

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
        let hash = 0;
        const mix = (val) => {
            hash = ((hash << 5) - hash + (val | 0)) | 0;
        };
        history.forEach((h) => {
            mix(Math.round(Number(h?.score ?? h?.scorePoints ?? 0) * 100));
            mix(Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions ?? 0));
            mix(Number(h?.correct ?? h?.acertos ?? h?.correctCount ?? 0));
            mix(Number(h?.timeSpent ?? 0));
            mix(h?.isPercentage ? 1 : 0);
            mix(h?.valid === false ? 0 : 1);
            const rawTopics = Array.isArray(h?.topics)
                ? h.topics
                : (h?.topics && typeof h.topics === 'object' ? Object.values(h.topics) : EMPTY_ARRAY);
            mix(rawTopics.length);
            rawTopics.forEach((t) => {
                if (!t || typeof t !== 'object') return;
                mix(Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions ?? 0));
                mix(Number(t.correct ?? t.acertos ?? t.correctCount ?? 0));
                mix(Math.round(Number(t.score ?? 0) * 100));
            });
            const dStr = String(h?.date || h?.createdAt || '');
            for (let i = 0; i < dStr.length; i++) {
                mix(dStr.charCodeAt(i));
            }
        });
        const wVal = weights?.[cat?.id] ?? cat?.weight ?? '';
        return `${cat?.id || ''}|${cat?.name || ''}|${wVal}|${cat?.maxScore ?? ''}|${cat?.minScore ?? ''}|${cat?.minCutoff ?? ''}|${tasks.length}|${history.length}|${hash}`;
    }).join('||'), [categories, weights]);

    const activeCategories = useMemo(() => {
        const getVol = (h, catMax, catMin) => {
            const t = Math.max(0, Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) || 0);
            if (t > 0) return t;
            const topicFallback = extractTopicsTotals(h, catMax, catMin);
            if (topicFallback.total > 0) return topicFallback.total;
            if (h?.score != null || h?.scorePoints != null || topicFallback.hasTopicsScore) return getSyntheticTotal(catMax);
            return 0;
        };
        const volMap = new Map();
        const valid = categories.filter(c => {
            const catMax = Number(c?.maxScore) > 0 ? Number(c.maxScore) : safeMax;
            const catMin = Number.isFinite(Number(c?.minScore)) ? Number(c.minScore) : safeMin;
            const history = getHistoryArray(c);
            const hasValidEntry = history.some(entry => {
                if (!entry || typeof entry !== 'object') return false;
                const hasScore = Number.isFinite(Number(entry.score ?? entry.scorePoints));
                const entryTot = Number(entry.total ?? entry.questoes ?? entry.totalQuestoes ?? entry.questions);
                const hasTotal = Number.isFinite(entryTot) && entryTot > 0;
                const hasCorrect = Number.isFinite(Number(entry.correct ?? entry.acertos ?? entry.correctCount));
                if (hasScore || hasTotal || hasCorrect) return true;
                const topicFallback = extractTopicsTotals(entry, catMax, catMin);
                return topicFallback.total > 0 || topicFallback.hasTopicsScore;
            });
            if (hasValidEntry) {
                volMap.set(c, history.reduce((sum, h) => sum + getVol(h, catMax, catMin), 0));
            }
            return hasValidEntry;
        });
        valid.sort((a, b) => (volMap.get(b) || 0) - (volMap.get(a) || 0));
        return valid;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, categoriesVersion, safeMax, safeMin]);

    const timeline = useMemo(() => {
        if (!activeCategories.length) return [];
        const todayKey = getDateKey(new Date());
        const allDatesSet = new Set();
        const historyByCat = new Map();
        activeCategories.forEach(cat => {
            const hist = getHistoryArray(cat);
            historyByCat.set(cat, hist);
            hist.forEach(h => {
                const dateKey = getDateKey(getHistoryDate(h));
                if (dateKey) allDatesSet.add(dateKey);
            });
        });
        const rawSortedDates = Array.from(allDatesSet).sort();
        const hasNonFuture = todayKey ? rawSortedDates.some(d => d <= todayKey) : false;
        const sortedDates = hasNonFuture ? rawSortedDates.filter(d => d <= todayKey) : rawSortedDates;
        const dates = sortedDates;
        const dataByDate = {};
        dates.forEach((date) => {
            const [, month, day] = date.split("-");
            dataByDate[date] = { date, displayDate: `${day}/${month}` };
        });

        const safeGlobalRange = Math.max(1e-9, safeMax - safeMin);

        activeCategories.forEach(cat => {
            const rawHist = historyByCat.get(cat) || EMPTY_ARRAY;
            const history = [...rawHist].sort((a, b) => {
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
                let rawTotal = Math.max(0, Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) || 0);
                let hasCorrect = (h?.correct !== undefined && h?.correct !== null && String(h?.correct).trim() !== '') ||
                                 (h?.acertos !== undefined && h?.acertos !== null && String(h?.acertos).trim() !== '') ||
                                 (h?.correctCount !== undefined && h?.correctCount !== null && String(h?.correctCount).trim() !== '');
                let parsedCorrect = Number(h?.correct ?? h?.acertos ?? h?.correctCount);
                let rawC = hasCorrect && Number.isFinite(parsedCorrect)
                    ? Math.max(0, Math.min(rawTotal > 0 ? rawTotal : Infinity, parsedCorrect))
                    : 0;
                let score = getSafeScore(h, catMax, catMin);
                if (rawTotal <= 0) {
                    const topicFallback = extractTopicsTotals(h, catMax, catMin);
                    if (topicFallback.total > 0) {
                        rawTotal = topicFallback.total;
                        rawC = topicFallback.correct;
                        hasCorrect = true;
                        parsedCorrect = rawC;
                        if (!Number.isFinite(score) || score === catMin) {
                            score = topicFallback.score;
                        }
                    } else if (!Number.isFinite(score) && topicFallback.hasTopicsScore) {
                        score = topicFallback.score;
                    }
                }
                if (!Number.isFinite(score)) return;
                let corrNorm;
                if (rawTotal > 0) {
                    corrNorm = (!h.isPercentage && hasCorrect && Number.isFinite(parsedCorrect))
                        ? rawC
                        : Math.max(0, Math.min(rawTotal, Math.round(toCatRatio(score) * rawTotal)));
                } else {
                    corrNorm = 0;
                }
                let compTotal = rawTotal;
                let compCorrect = corrNorm;
                if (rawTotal === 0) {
                    compTotal = getSyntheticTotal(catMax);
                    compCorrect = toCatRatio(score) * compTotal;
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
                const displayCorrect = exact ? exact.correct : 0;
                const displayTotal = exact ? exact.total : 0;
                let rawDailyScore = null;
                if (exact && exact.compTotal >= 1) {
                    const calc = catMin + (exact.compCorrect / exact.compTotal) * catRange;
                    rawDailyScore = Number.isFinite(calc) ? calc : null;
                } else if (exact && snap?.last) {
                    const s = getSafeScore(snap.last, catMax, catMin);
                    rawDailyScore = Number.isFinite(s) ? s : null;
                }
                const bayVal = snap.bayesian ? (Number.isFinite(Number(snap.bayesian.mean)) ? Number(snap.bayesian.mean) : catMin) : null;
                const statsVal = stats ? (Number.isFinite(Number(stats.mean)) ? Number(stats.mean) : catMin) : catMin;
                dataByDate[date] = {
                    ...dataByDate[date],
                    [`raw_correct_${cat.id}`]: displayCorrect,
                    [`raw_total_${cat.id}`]: displayTotal,
                    [`raw_${cat.id}`]: rawDailyScore,
                    [`bay_${cat.id}`]: bayVal,
                    [`bay_ci_low_${cat.id}`]: snap.bayesian ? (Number.isFinite(Number(snap.bayesian.ciLow)) ? Number(snap.bayesian.ciLow) : catMin) : catMin,
                    [`bay_ci_high_${cat.id}`]: snap.bayesian ? (Number.isFinite(Number(snap.bayesian.ciHigh)) ? Number(snap.bayesian.ciHigh) : catMax) : catMax,
                    [`stats_${cat.id}`]: statsVal,
                    [`trend_${cat.id}`]: stats ? (Number.isFinite(Number(stats.trendValue)) ? Number(stats.trendValue) : 0) : 0,
                    [`trend_status_${cat.id}`]: stats ? stats.trend : 'stable',
                    global_total: (Number(dataByDate[date].global_total) || 0) + displayTotal
                };
            });
        });

        dates.forEach(date => {
            const pt = dataByDate[date];
            let bayW = 0, baySum = 0;
            let emaW = 0, emaSum = 0;
            let rawW = 0, rawSum = 0;
            activeCategories.forEach(cat => {
                const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMax;
                const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : safeMin;
                const catRange = Math.max(1e-9, catMax - catMin);
                const w = Math.max(0.01, Number.isFinite(Number(weights?.[cat.id])) ? Number(weights[cat.id]) : (Number.isFinite(Number(cat?.weight)) ? Number(cat.weight) : 1));
                const toGlobal = (val) => safeMin + Math.max(0, Math.min(1, (val - catMin) / catRange)) * safeGlobalRange;
                const b = pt[`bay_${cat.id}`];
                if (b != null && Number.isFinite(Number(b))) {
                    baySum += toGlobal(Number(b)) * w;
                    bayW += w;
                }
                const s = pt[`stats_${cat.id}`];
                if (s != null && Number.isFinite(Number(s))) {
                    emaSum += toGlobal(Number(s)) * w;
                    emaW += w;
                }
                const r = pt[`raw_${cat.id}`];
                if (r != null && Number.isFinite(Number(r))) {
                    rawSum += toGlobal(Number(r)) * w;
                    rawW += w;
                }
            });
            if (bayW > 0) pt.global_bayesian = baySum / bayW;
            if (emaW > 0) pt.global_ema = emaSum / emaW;
            if (rawW > 0) pt.global_raw = rawSum / rawW;
        });

        return dates.map(d => dataByDate[d]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategories, weights, safeMax, safeMin, categoriesVersion]);

    const heatmapData = useMemo(() => {
        if (!activeCategories.length) return { dates: [], rows: [] };
        const todayKey = getDateKey(new Date());
        const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const allDatesSet = new Set();
        const historyByCat = new Map();
        activeCategories.forEach(cat => {
            const hist = getHistoryArray(cat);
            historyByCat.set(cat, hist);
            hist.forEach(h => {
                const dateKey = getDateKey(getHistoryDate(h));
                if (dateKey) allDatesSet.add(dateKey);
            });
        });
        const rawSortedDates = Array.from(allDatesSet).sort();
        const hasNonFuture = todayKey ? rawSortedDates.some(d => d <= todayKey) : false;
        const sortedDates = hasNonFuture ? rawSortedDates.filter(d => d <= todayKey) : rawSortedDates;
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
            const hist = historyByCat.get(cat) || EMPTY_ARRAY;
            hist.forEach(h => {
                const key = getDateKey(getHistoryDate(h));
                if (!key) return;
                if (!dayMap[key]) dayMap[key] = { correct: 0, total: 0, realCorrect: 0, realTotal: 0 };
                let tot = Math.max(0, Number(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions) || 0);
                let hasCorrect = (h?.correct !== undefined && h?.correct !== null && String(h?.correct).trim() !== '') ||
                                 (h?.acertos !== undefined && h?.acertos !== null && String(h?.acertos).trim() !== '') ||
                                 (h?.correctCount !== undefined && h?.correctCount !== null && String(h?.correctCount).trim() !== '');
                let parsedCorrect = Number(h?.correct ?? h?.acertos ?? h?.correctCount);
                let raw = hasCorrect && Number.isFinite(parsedCorrect) ? Math.max(0, parsedCorrect) : 0;
                let score = getSafeScore(h, catMax, catMin);
                if (tot <= 0) {
                    const topicFallback = extractTopicsTotals(h, catMax, catMin);
                    if (topicFallback.total > 0) {
                        tot = topicFallback.total;
                        raw = topicFallback.correct;
                        hasCorrect = true;
                        parsedCorrect = raw;
                        if (!Number.isFinite(score) || score === catMin) {
                            score = topicFallback.score;
                        }
                    } else if (!Number.isFinite(score) && topicFallback.hasTopicsScore) {
                        score = topicFallback.score;
                    }
                }
                if (!Number.isFinite(score)) return;
                const isSyntheticEntry =
                    h?.syntheticVolume === true ||
                    h?.isSynthetic === true ||
                    h?.type === 'percent-only' ||
                    tot === 0;
                let corrNorm;
                if (isSyntheticEntry) {
                    if (tot <= 0) tot = getSyntheticTotal(catMax);
                    corrNorm = toCatRatio(score) * tot;
                } else if (!h.isPercentage && hasCorrect && Number.isFinite(parsedCorrect)) {
                    corrNorm = Math.max(0, Math.min(tot, raw));
                } else {
                    corrNorm = tot > 0 ? Math.round(toCatRatio(score) * tot) : raw;
                }
                dayMap[key].correct += corrNorm;
                dayMap[key].total += tot;
                if (!isSyntheticEntry) {
                    dayMap[key].realCorrect += corrNorm;
                    dayMap[key].realTotal += tot;
                }
            });
            const cells = datesToUse.map(dateStr => {
                const entry = dayMap[dateStr];
                if (!entry || entry.total === 0) return null;
                const pct = entry.realTotal > 0
                    ? (entry.realCorrect / entry.realTotal) * 100
                    : (entry.correct / entry.total) * 100;
                const isSynthetic = entry.realTotal === 0;
                return {
                    pct: Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0)),
                    correct: isSynthetic ? entry.correct : entry.realCorrect,
                    total: isSynthetic ? entry.total : entry.realTotal,
                    realCorrect: entry.realCorrect,
                    realTotal: entry.realTotal,
                    isSynthetic,
                };
            });
            return { cat, cells };
        });
        return { dates, rows };
    }, [activeCategories, safeMax, safeMin, categoriesVersion]);

    const globalMetrics = useMemo(() => {
        let totalQuestions = 0;
        let totalCorrect = 0;
        let syntheticQuestions = 0;
        let syntheticCorrect = 0;
        const todayKey = getDateKey(new Date());
        let hasAnyNonFuture = false;
        if (todayKey) {
            for (const cat of activeCategories) {
                if (getHistoryArray(cat).some(h => {
                    const dk = getDateKey(getHistoryDate(h));
                    return dk && dk <= todayKey;
                })) {
                    hasAnyNonFuture = true;
                    break;
                }
            }
        }
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
                if (hasAnyNonFuture && todayKey) {
                    const dk = getDateKey(getHistoryDate(h));
                    if (dk && dk > todayKey) return;
                }
                let tot = Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
                let hasExplicitC = (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '') ||
                                   (h.acertos !== undefined && h.acertos !== null && String(h.acertos).trim() !== '') ||
                                   (h.correctCount !== undefined && h.correctCount !== null && String(h.correctCount).trim() !== '');
                let rawParsedC = Number(h.correct ?? h.acertos ?? h.correctCount);
                let score = getSafeScore(h, catMax, catMin);
                if (tot <= 0) {
                    const topicFallback = extractTopicsTotals(h, catMax, catMin);
                    if (topicFallback.total > 0) {
                        tot = topicFallback.total;
                        rawParsedC = topicFallback.correct;
                        hasExplicitC = true;
                        if (!Number.isFinite(score) || score === catMin) {
                            score = topicFallback.score;
                        }
                    } else if (!Number.isFinite(score) && topicFallback.hasTopicsScore) {
                        score = topicFallback.score;
                    }
                }
                if (!Number.isFinite(score)) return;

                const isSyntheticVolume =
                    h?.syntheticVolume === true ||
                    h?.isSynthetic === true ||
                    h?.type === 'percent-only' ||
                    tot === 0;

                let corrNorm;
                if (isSyntheticVolume) {
                    if (tot <= 0) tot = getSyntheticTotal(catMax);
                    corrNorm = toCatRatio(score) * tot;
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
        const combinedQuestions = totalQuestions + syntheticQuestions;
        const combinedCorrect = totalCorrect + syntheticCorrect;
        const globalAccuracy = combinedQuestions > 0
            ? (combinedCorrect / combinedQuestions) * 100
            : 0;
        return {
            totalQuestions: Number.isFinite(totalQuestions) ? totalQuestions : 0,
            totalCorrect: Number.isFinite(totalCorrect) ? totalCorrect : 0,
            syntheticQuestions: Number.isFinite(syntheticQuestions) ? totalQuestions === 0 ? syntheticQuestions : syntheticQuestions : 0,
            syntheticCorrect: Number.isFinite(syntheticCorrect) ? syntheticCorrect : 0,
            globalAccuracy: Number.isFinite(globalAccuracy) ? globalAccuracy : 0
        };
    }, [activeCategories, safeMax, safeMin, categoriesVersion]);

    return { activeCategories, timeline, heatmapData, globalMetrics };
}
