# Hooks e Serviços (src/hooks & src/services)

> Arquivos neste módulo: **19** | Linhas: **5.367** | Tamanho: **201.2 KB**

## Arquivos:
1. `src/hooks/useCategoryLevels.js` (70 linhas)
2. `src/hooks/useChartData.js` (417 linhas)
3. `src/hooks/useClock.js` (91 linhas)
4. `src/hooks/useCloudSync.js` (1173 linhas)
5. `src/hooks/useCoachControlCenter.js` (363 linhas)
6. `src/hooks/useEvolutionMC.js` (245 linhas)
7. `src/hooks/useGlobalToasts.js` (34 linhas)
8. `src/hooks/useIdleLogout.js` (137 linhas)
9. `src/hooks/useLevelUp.js` (33 linhas)
10. `src/hooks/useModalAccessibility.js` (71 linhas)
11. `src/hooks/useMonteCarloStats.js` (1506 linhas)
12. `src/hooks/useMonteCarloWorker.js` (215 linhas)
13. `src/hooks/usePomodoroSync.js` (252 linhas)
14. `src/hooks/useSubjectAggData.js` (119 linhas)
15. `src/hooks/useSubscription.js` (158 linhas)
16. `src/hooks/useThemeSync.js` (51 linhas)
17. `src/hooks/useToast.js` (20 linhas)
18. `src/services/aiQuestionService.js` (247 linhas)
19. `src/services/firebase.js` (165 linhas)

---

### Arquivo: `src/hooks/useCategoryLevels.js`
*Linhas: 70 | Tamanho: 3.0 KB*

```javascript
import { useMemo } from 'react';
import { computeCategoryStats } from '../engine';
import { getSafeScore } from '../utils/scoreHelper';
import { toDateMs } from '../utils/dateHelper';

/**
 * Nível atual de cada disciplina segundo o engine ativo.
 * Extraído do EvolutionChart.jsx (LOTE-05).
 */
export function useCategoryLevels(categories, timeline, activeEngine, maxScore = 100, minScore = 0) {
  return useMemo(() => {
    if (!Array.isArray(categories)) return {};
    const map = {};
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const lastPoint = Array.isArray(timeline) && timeline.length > 0 && typeof timeline[timeline.length - 1] === 'object' ? timeline[timeline.length - 1] : null;
    categories.forEach(cat => {
      const prefix = activeEngine === 'raw' ? 'raw_' : activeEngine === 'stats' ? 'stats_' : 'bay_';
      const fromTimeline = lastPoint?.[`${prefix}${cat.id}`];
      if (fromTimeline != null && Number.isFinite(Number(fromTimeline))) {
        map[cat.id] = Number(fromTimeline);
        return;
      }

      // Se for o motor de nota bruta e a disciplina não teve simulado no último dia geral,
      // busca o último score bruto registrado na timeline
      if (activeEngine === 'raw' && Array.isArray(timeline)) {
        for (let i = timeline.length - 1; i >= 0; i--) {
          const pt = timeline[i]?.[`raw_${cat.id}`];
          if (pt != null && Number.isFinite(Number(pt))) {
            map[cat.id] = Number(pt);
            return;
          }
        }
      }

      const historyRaw = cat.simuladoStats?.history;
      const history = historyRaw ? (Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw)) : [];
      const weight = Number(cat.weight) > 0 ? Number(cat.weight) : 10;
      const catMax = Number.isFinite(Number(cat?.maxScore)) && Number(cat?.maxScore) > 0 ? Number(cat.maxScore) : maxScore;
      const catMin = Number.isFinite(Number(cat?.minScore)) ? Math.min(Number(cat.minScore), catMax) : safeMin;

      // Fallback para o histórico da disciplina caso não esteja na timeline
      if (activeEngine === 'raw' && history.length > 0) {
        let latestEntry = null;
        let latestMs = -Infinity;
        for (let i = 0; i < history.length; i++) {
          const h = history[i];
          const ms = toDateMs(h?.date || h?.createdAt) || 0;
          if (ms >= latestMs) {
            latestMs = ms;
            latestEntry = h;
          }
        }
        if (latestEntry) {
          const s = getSafeScore(latestEntry, catMax, catMin);
          if (Number.isFinite(s)) {
            map[cat.id] = s;
            return;
          }
        }
      }

      const stats = computeCategoryStats(history || [], weight, 60, catMax, catMin);
      map[cat.id] = (stats?.mean != null && Number.isFinite(stats.mean)) ? stats.mean : catMin;
    });
    return map;
  }, [categories, timeline, activeEngine, maxScore, minScore]);
}


```

---

### Arquivo: `src/hooks/useChartData.js`
*Linhas: 417 | Tamanho: 19.5 KB*

```javascript
import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, BAYESIAN_DECAY_FACTOR } from '../engine/stats';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const getHistoryArray = (cat) => Object.values(cat?.simuladoStats?.history || EMPTY_OBJECT).filter(Boolean);
const getHistoryDate = (entry) => entry?.date || entry?.createdAt || null;

function buildCumulativeStatsPerDate(history, sortedDates, maxScore = 100, minScore = 0) {
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
        const entry = aggregatedByDate.get(key);
        const rawTotal = Math.max(0, Number(h?.total) || 0);
        const rawCorrect = Math.max(0, Math.min(rawTotal, Number(h?.correct) || 0));
        const score = getSafeScore(h, safeMax, safeMin);
        const safeScore = Number.isFinite(score) ? score : NaN;

        let compTotal = rawTotal;
        let compCorrect = rawTotal > 0 && Number.isFinite(safeScore)
            ? Math.round(toRatio(safeScore) * rawTotal)
            : rawCorrect;

        if (rawTotal === 0 && h?.score != null && Number.isFinite(safeScore)) {
            compTotal = getSyntheticTotal(safeMax);
            compCorrect = Math.round(toRatio(safeScore) * compTotal);
        }
        compCorrect = Math.max(0, Math.min(compTotal, Number.isFinite(compCorrect) ? compCorrect : 0));

        if (entry) {
            entry.compCorrect += compCorrect;
            entry.compTotal += compTotal;
            entry.total += rawTotal;
            entry.correct += Math.max(0, Math.min(rawTotal, Math.max(0, Number(h?.correct) || 0)));
            entry.score = entry.compTotal > 0
                ? safeMin + (entry.compCorrect / entry.compTotal) * safeRange
                : NaN;
        } else {
            aggregatedByDate.set(key, {
                date: key,
                compCorrect,
                compTotal,
                total: rawTotal,
                correct: Math.max(0, Math.min(rawTotal, Math.max(0, Number(h?.correct) || 0))),
                score: safeScore,
            });
        }
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
                cachedStats = computeCategoryStats(accumulated, 100, 60, safeMax, safeMin);
                lastAccumulatedLen = accumulated.length;
            }
            const lastEntry = accumulated[accumulated.length - 1];
            const bayStats = computeBayesianLevel(accumulated, 1, 1, safeMax, {
                referenceDate: date,
                lastEventDate: lastEntry ? lastEntry.date : null,
                minScore: safeMin,
            });
            dateToStats[date] = {
                stats: cachedStats,
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
        const getVol = (h) => {
            const t = Math.max(0, Number(h?.total) || 0);
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
            const history = getHistoryArray(cat).sort((a, b) => {
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

            const cumulativeByDate = buildCumulativeStatsPerDate(history, dates, catMax, catMin);
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
            const [, m, day] = dateStr.split('-');
            return {
                key: dateStr,
                dayName: DAY_NAMES[d.getDay()],
                label: `${day}/${m}`,
                isWeekend: d.getDay() === 0 || d.getDay() === 6,
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
                let tot = Math.max(0, Number(h.total) || 0);
                const score = getSafeScore(h, catMax, catMin);
                if (!Number.isFinite(score)) return;
                let corrNorm;
                if (tot === 0 && h.score != null) {
                    tot = getSyntheticTotal(catMax);
                    corrNorm = Math.round(toCatRatio(score) * tot);
                } else if (!h.isPercentage && Number.isFinite(Number(h.correct))) {
                    corrNorm = Math.max(0, Math.min(tot, Number(h.correct)));
                } else {
                    const raw = Math.max(0, Number(h.correct) || 0);
                    corrNorm = tot > 0 ? Math.round(toCatRatio(score) * tot) : raw;
                }
                // FIX 2B: blindagem extra contra NaN em corrNorm
                if (!Number.isFinite(corrNorm)) return;
                totalQuestions += tot;
                totalCorrect += corrNorm;
            });
        });
        const globalAccuracy = (totalQuestions > 0) ? (totalCorrect / totalQuestions) * 100 : 0;
        return { totalQuestions, totalCorrect, globalAccuracy: Number.isFinite(globalAccuracy) ? globalAccuracy : 0 };
    }, [activeCategories, safeMax, safeMin]);

    return { activeCategories, timeline, heatmapData, globalMetrics };
}


```

---

### Arquivo: `src/hooks/useClock.js`
*Linhas: 91 | Tamanho: 2.8 KB*

```javascript
import { useEffect, useState } from 'react';

/**
 * Custom hook that returns the current time, updating every second.
 *
 * Sync strategy:
 * - Aligns each update to the next exact second boundary using recursive timeouts.
 * - Prevents visible drift/desync between different clock widgets over time.
 * - Forces an immediate resync when tab/window becomes active again.
 *
 * @returns {Date} current time
 */
const useClock = () => {
    const [epochSecond, setEpochSecond] = useState(() => Math.floor(Date.now() / 1000));

    useEffect(() => {
        let timeoutId;
        let cancelled = false;
        let lastRescheduleAt = 0;

        let baseWallMs = Date.now();
        let basePerfMs = performance.now();

        const nowFromStableClock = () => {
            const elapsed = performance.now() - basePerfMs;
            return baseWallMs + elapsed;
        };

        const recalibrate = () => {
            baseWallMs = Date.now();
            basePerfMs = performance.now();
        };

        const scheduleNextTick = () => {
            if (cancelled) return;
            const now = nowFromStableClock();
            const msUntilNextSecond = (1000 - (now % 1000)) % 1000;
            const delay = msUntilNextSecond === 0 ? 1 : msUntilNextSecond;

            timeoutId = setTimeout(() => {
                const stableNow = nowFromStableClock();
                const realNow = Date.now();

                // Se houver salto grande do relógio do sistema (NTP/sleep), recalibra a base.
                if (Math.abs(realNow - stableNow) > 1500) {
                    recalibrate();
                }

                const nowSecond = Math.floor(nowFromStableClock() / 1000);
                setEpochSecond(nowSecond);
                scheduleNextTick();
            }, delay);
        };

        scheduleNextTick();

        const handleVisibilityOrFocus = () => {
            if (cancelled) return;
            if (document.visibilityState !== 'visible') return;
            const nowMs = Date.now();
            if (nowMs - lastRescheduleAt < 250) return;
            lastRescheduleAt = nowMs;
            if (timeoutId) clearTimeout(timeoutId);
            recalibrate();
            setEpochSecond(Math.floor(nowFromStableClock() / 1000));
            scheduleNextTick();
        };

        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);

        return () => {
            cancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('focus', handleVisibilityOrFocus);
        };
    }, []);

    return new Date(epochSecond * 1000);
};

export default useClock;








```

---

### Arquivo: `src/hooks/useCloudSync.js`
*Linhas: 1.173 | Tamanho: 48.4 KB*

```javascript
import { useEffect, useRef, useState, useCallback } from 'react';
import { db, isLocalMode } from '../services/firebase';
import { doc, onSnapshot, writeBatch, collection, getDocs } from 'firebase/firestore';
import { SYNC_LOG_CAP } from '../config';
import { logger } from '../utils/logger';
import { useAppStore } from '../store/useAppStore';
import { normalize } from '../utils/normalization';
import { safeClone } from '../utils/safeClone.js';
import { getSafeScore } from '../utils/scoreHelper.js';
import { toArray } from '../utils/normalize.js';
import { isCategoryTombstoned } from '../utils/tombstones.js';

// P07 PERF FIX: Added depth limit to prevent runaway recursion on deeply nested data
const cleanUndefined = (obj, seen = new WeakSet(), depth = 0) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (depth > 25) return obj; // Safety cap for deeply nested structures
  if (obj instanceof Date) return obj;
  if (obj === window ||
    (typeof Event !== 'undefined' && obj instanceof Event) ||
    (typeof Node !== 'undefined' && obj instanceof Node)) {
    return null;
  }
  if (seen.has(obj)) {
    console.warn("[Sync] Referência circular detectada e removida.");
    return null;
  }
  seen.add(obj);
  let result;
  if (Array.isArray(obj)) {
    result = obj.map(v => v === undefined ? null : cleanUndefined(v, seen, depth + 1));
  } else {
    result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (v !== undefined) {
        result[k] = cleanUndefined(v, seen, depth + 1);
      }
    }
  }
  seen.delete(obj);
  return result;
};

const safeguardContest = (contest) => {
  if (!contest) return contest;
  
  // Tratamento profundo para categorias (evitar arrays infinitos e crashes com Objetos)
  const safeCategories = toArray(contest.categories).map(cat => {
    if (!cat.simuladoStats) return cat;
    return {
      ...cat,
      simuladoStats: {
        ...cat.simuladoStats,
        history: [...toArray(cat.simuladoStats.history)]
          .sort((a, b) => new Date(a.date || a.createdAt || 0).getTime() - new Date(b.date || b.createdAt || 0).getTime())
          .slice(-100),
        historyByMatter: cat.simuladoStats.historyByMatter 
          ? Object.fromEntries(
              Object.entries(cat.simuladoStats.historyByMatter).map(([mId, h]) => [
                mId, 
                [...toArray(h)]
                  .sort((a, b) => new Date(a.date || a.createdAt || 0).getTime() - new Date(b.date || b.createdAt || 0).getTime())
                  .slice(-50)
              ])
            )
          : cat.simuladoStats.historyByMatter
      }
    };
  });

  const safeFlashcards = toArray(contest.flashcardDecks).map(deck => ({
    ...deck,
    cards: toArray(deck.cards).slice(-300) // Máx 300 cards por deck na nuvem
  }));

  return {
    ...contest,
    categories: safeCategories,
    flashcardDecks: safeFlashcards,
    simulados: toArray(contest.simulados).slice(-150),
    historicalCutoffs: toArray(contest.historicalCutoffs).slice(-150),
    studyLogs: toArray(contest.studyLogs).slice(-SYNC_LOG_CAP),
    studySessions: toArray(contest.studySessions).slice(-SYNC_LOG_CAP),
    simuladoRows: toArray(contest.simuladoRows).slice(-300),
    calibrationAuditLog: toArray(contest.calibrationAuditLog).slice(-150),
    calibrationEvents: toArray(contest.calibrationEvents).slice(-150),
    coachPlan: toArray(contest.coachPlan).slice(-100),
    calibrationHistoryByCategory: contest.calibrationHistoryByCategory
      ? Object.fromEntries(
          Object.entries(contest.calibrationHistoryByCategory).map(([catId, history]) => [
            catId, Array.isArray(history) ? history.slice(-50) : history
          ])
        )
      : contest.calibrationHistoryByCategory,
  };
};

export function useCloudSync(currentUser, setAppState, showToast, syncTrigger) {
  const showToastRef = useRef(showToast);
  const applyingRemoteRef = useRef(false);
  const syncMutexRef = useRef(false);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  const lastSyncedRef = useRef(null);
  const isParityValidatedRef = useRef(false);
  const [parityTick, setParityTick] = useState(0);
  const lastLocalMutationRef = useRef(0);
  const isCloudPullRef = useRef(false);
  const pendingWritesCountRef = useRef(0);

  // ✅ FIX C06: Safety net independente de syncTrigger.
  // Usa setInterval para garantir que o reset ocorra mesmo sem mudanças
  // no trigger. O intervalo é leve (verificação a cada 5s) e só atua
  // quando isCloudPullRef está preso por mais de 10s.
  useEffect(() => {
    let stuckSince = null;

    const checkInterval = setInterval(() => {
      if (isCloudPullRef.current) {
        if (!stuckSince) {
          stuckSince = Date.now();
        } else if (Date.now() - stuckSince > 10000) {
          console.warn('[Sync] isCloudPullRef preso por >10s, resetando.');
          isCloudPullRef.current = false;
          stuckSince = null;
        }
      } else {
        stuckSince = null;
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, []); // ✅ Sem dependências — roda uma única vez

  const debounceRef = useRef(null);
  const latestCloudDataRef = useRef(null);
  const isMountedRef = useRef(true);
  const [cloudStatus, setCloudStatus] = useState('idle');
  const [cloudError, setCloudError] = useState(null);
  const [isInternalSyncing, setIsInternalSyncing] = useState(false);
  const isInternalSyncingRef = useRef(false);
  const syncReentryCountRef = useRef(0);
  const [hasConflict, setHasConflict] = useState(false);
  const needsSyncRef = useRef(false);
  const appStateRef = useRef(useAppStore.getState().appState);

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      state => {
        appStateRef.current = state.appState;
        const now = Date.now();
        const stateTime = new Date(state.appState?.lastUpdated || 0).getTime();
        if (now - stateTime < 10000) {
          lastLocalMutationRef.current = now;
        }
      }
    );
    return () => unsubscribe();
  }, []);

  const confirmParity = useCallback(() => {
    if (!isParityValidatedRef.current) {
      isParityValidatedRef.current = true;
      setParityTick(t => t + 1);
      logger.debug("[Sync] Paridade estabelecida.");
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);


  const deduplicateCategoryNames = useCallback((contest) => {
    const rawCategories = toArray(contest?.categories);
    if (rawCategories.length === 0) return contest;
    const nameMap = {};
    rawCategories.forEach(cat => {
      const key = normalize(cat.name);
      const richness = (c) => {
        const h = c.simuladoStats?.history;
        const hLen = h ? (Array.isArray(h) ? h.length : Object.values(h).length) : 0;
        return (c.tasks?.length || 0) + hLen;
      };
      if (!nameMap[key]) {
        nameMap[key] = { ...cat };
      } else {
        const winner = richness(cat) > richness(nameMap[key]) ? { ...cat } : { ...nameMap[key] };
        const loser = richness(cat) > richness(nameMap[key]) ? nameMap[key] : cat;
        const mergedTasks = [...(winner.tasks || []), ...(loser.tasks || [])];
        const mergedHistory = [...(winner.simuladoStats?.history || []), ...(loser.simuladoStats?.history || [])];
        winner.tasks = Array.from(new Map(
          mergedTasks.map((t) => [t.id || `${t.text || t.title || ''}-${t.priority || ''}`, t])
        ).values());
        if (winner.simuladoStats) {
          const getHistoryKey = (h) => {
            if (!h || typeof h !== 'object') return null;
            if (h.id) return `id:${String(h.id)}`;
            const d = h.date || h.createdAt || '';
            const topic = h.topic || h.name || (Array.isArray(h.topics) ? h.topics.map(t => t.name).join(',') : '');
            const score = h.score ?? h.correct ?? '';
            return `sim:${d}:${topic}:${score}`;
          };
          winner.simuladoStats.history = Array.from(
            new Map(mergedHistory.map(h => [getHistoryKey(h) || JSON.stringify(h), h])).values()
          ).sort((a, b) => {
            const timeA = new Date(a?.date || a?.createdAt || 0).getTime();
            const timeB = new Date(b?.date || b?.createdAt || 0).getTime();
            return (Number.isFinite(timeA) ? timeA : 0) - (Number.isFinite(timeB) ? timeB : 0);
          });
        }
        nameMap[key] = winner;
        logger.warn(`[dedup] Fundindo dados do clone "${cat.name}".`);
      }
    });
    const deduped = Object.values(nameMap);
    if (deduped.length === contest.categories.length) return contest;
    return { ...contest, categories: deduped };
  }, []);

  const mergeArrays = (arr1, arr2, options = {}) => {
    const { preferCloudBase = false, localContestTime = 0 } = options;
    const map = new Map();

    const getStableKey = (item) => {
      if (!item || typeof item !== 'object') return null;

      // Prioridade 1: id explícito
      if (item.id) return `id:${String(item.id)}`;

      // Prioridade 2: task com texto/título (dedup por conteúdo)
      if (item.text || item.title) {
        return `task:${String(item.text || item.title).toLowerCase().trim()}`;
      }

      // Prioridade 3: simulado com subject+date
      if (item.subject && item.date) {
        return `sim:${item.date}:${item.subject}:${item.score ?? item.scorePoints ?? ''}`;
      }

      // Prioridade 4: sessão com date+categoryId+taskId
      if (item.date || item.startTime) {
        return `${item.date || item.startTime}-${item.categoryId || ''}-${item.taskId || ''}`;
      }

      // ✅ FIX T-05: Fallback robusto — usar hash completo do JSON em vez de
      // slice(0, 50) que causa colisões entre itens diferentes.
      // hashString64 do coachSafe.js gera hash de 64 bits com colisão mínima.
      try {
        const fullJson = JSON.stringify(item);
        // Gerar hash simples de 64 bits inline (sem dependência externa)
        let h1 = 0x811c9dc5;
        let h2 = 0x01000193;
        for (let i = 0; i < fullJson.length; i++) {
          const c = fullJson.charCodeAt(i);
          h1 = Math.imul(h1 ^ c, 0x01000193);
          h2 = Math.imul(h2 ^ c, 0x85ebca6b);
        }
        return `unknown:${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
      } catch {
        // Se JSON.stringify falhar (circular, etc.), gerar chave baseada em posição
        return `unknown:unserializable-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      }
    };

    const safeArr1 = Array.isArray(arr1) ? arr1 : Object.values(arr1 || {});
    const safeArr2 = Array.isArray(arr2) ? arr2 : Object.values(arr2 || {});

    safeArr1.forEach(item => {
      const key = getStableKey(item);
      if (key && !map.has(key)) map.set(key, item);
    });

    safeArr2.forEach(item => {
      const key = getStableKey(item);
      if (key) {
        const existing = map.get(key);
        if (!existing) {
          // Prevenção de zumbis: se o item não existe localmente e o estado local é mais recente
          // que a criação/atualização do item na nuvem, o item foi deletado localmente.
          if (!preferCloudBase && localContestTime > 0) {
            const itemTime = new Date(item.lastUpdated || item.createdAt || item.date || 0).getTime();
            if (Number.isFinite(itemTime) && itemTime > 0 && itemTime <= localContestTime) {
              return;
            }
          }
          map.set(key, item);
        } else {
          const timeNew = new Date(item.lastUpdated || item.createdAt || 0).getTime();
          const timeOld = new Date(existing.lastUpdated || existing.createdAt || 0).getTime();
          const validNew = Number.isFinite(timeNew) ? timeNew : 0;
          const validOld = Number.isFinite(timeOld) ? timeOld : 0;
          if (validNew > validOld) {
            map.set(key, item);
          }
        }
      }
    });

    return Array.from(map.values()).filter(Boolean);
  };

  const mergeMonteCarloHistory = (localMC = [], cloudMC = []) => {
    const mcMap = new Map();
    [...localMC, ...cloudMC].filter(Boolean).forEach(item => {
      if (item?.date) {
        const sanitized = {
          ...item,
          probability: Number.isFinite(item.probability) ? item.probability : 0
        };
        const key = `${item.date}|${item.categoryId || 'global'}`;
        mcMap.set(key, sanitized);
      }
    });
    return Array.from(mcMap.values()).filter(Boolean).sort((a, b) => {
      const aMs = new Date(a?.date || 0).getTime();
      const bMs = new Date(b?.date || 0).getTime();
      return (Number.isFinite(aMs) ? aMs : 0) - (Number.isFinite(bMs) ? bMs : 0);
    });
  };

  const mergeCategoryTasks = (localTasks = [], cloudTasks = []) => {
    const taskMap = new Map();
    const textToIdMap = new Map();

    const normalizeText = (txt) =>
      String(txt || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const taskKey = (t) => {
      if (t?.id) return `id:${t.id}`;

      const text = normalizeText(t?.text || t?.title);
      if (text) return `text:${text}`;

      return `fallback:${t?.priority || ''}:${t?.createdAt || ''}`;
    };
    const pickWinner = (a, b) => {
      if (!a) return b;
      if (!b) return a;
      if (a.completed && !b.completed) return a;
      if (b.completed && !a.completed) return b;
      const aTime = new Date(a.lastStudiedAt || 0).getTime();
      const bTime = new Date(b.lastStudiedAt || 0).getTime();
      return (Number.isFinite(aTime) ? aTime : 0) >= (Number.isFinite(bTime) ? bTime : 0) ? a : b;
    };
    const safeLocalTasks = Array.isArray(localTasks) ? localTasks : Object.values(localTasks || {});
    const safeCloudTasks = Array.isArray(cloudTasks) ? cloudTasks : Object.values(cloudTasks || {});
    [...safeLocalTasks, ...safeCloudTasks].filter(Boolean).forEach(t => {
      let key = taskKey(t);

      const text = normalizeText(t.text || t.title);

      if (t.id && text) {
        const previousTextKey = `text:${text}`;
        const existingByText = taskMap.get(previousTextKey);

        if (existingByText) {
          taskMap.delete(previousTextKey);
          key = `id:${t.id}`;
          taskMap.set(key, pickWinner(existingByText, t));
          textToIdMap.set(text, key);
          return;
        }
      }

      if (!t.id && text && textToIdMap.has(text)) {
        key = textToIdMap.get(text);
      }

      if (key) {
        taskMap.set(key, pickWinner(taskMap.get(key), t));
      }
    });
    return Array.from(taskMap.values()).filter(Boolean);
  };

  const mergeContestCategories = (localCats = [], cloudCats = [], preferCloudBase = false, localTrash = [], localContestTime = 0) => {
    const mergedCatsMap = new Map();
    const toDateMs = (value) => {
      if (!value) return 0;
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };
    const safeLocalCats = Array.isArray(localCats) ? localCats : Object.values(localCats || {});
    const safeCloudCats = Array.isArray(cloudCats) ? cloudCats : Object.values(cloudCats || {});
    safeLocalCats.forEach(c => { if (c?.id) mergedCatsMap.set(c.id, c); });
    safeCloudCats.forEach(c => {
      if (!c?.id) return;
      if (mergedCatsMap.has(c.id)) {
        const localCat = mergedCatsMap.get(c.id);
        const baseCat = preferCloudBase ? { ...localCat, ...c } : { ...c, ...localCat };
        const catMaxScore = Number(c.maxScore ?? localCat.maxScore ?? 100) || 100;
        const catMinScore = Number(c.minScore ?? localCat.minScore ?? 0) || 0;
        const historyMap = new Map();
        const getStableHistoryKey = (h) =>
          h.id || `${h.date}-${h.taskId || 'geral'}-${h.score}-${h.correct ?? ''}-${h.total ?? ''}`;
        const safeLocalHistory = Array.isArray(localCat.simuladoStats?.history)
          ? localCat.simuladoStats.history : Object.values(localCat.simuladoStats?.history || {});
        const safeCloudHistory = Array.isArray(c.simuladoStats?.history)
          ? c.simuladoStats.history : Object.values(c.simuladoStats?.history || {});
        safeLocalHistory.forEach(h => { if (h?.date) historyMap.set(getStableHistoryKey(h), h); });
        safeCloudHistory.forEach(h => { if (h?.date) historyMap.set(getStableHistoryKey(h), h); });
        mergedCatsMap.set(c.id, {
          ...baseCat,
          tasks: mergeCategoryTasks(localCat.tasks, c.tasks),
          simuladoStats: {
            ...(localCat.simuladoStats || c.simuladoStats || {}),
            ...(c.simuladoStats || {}),
            history: Array.from(historyMap.values())
              .map(h => ({ ...h, score: getSafeScore(h, catMaxScore, catMinScore) }))
              .sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date))
          }
        });
      } else {
        // FIX GHOST-CATEGORY / BUG-07: Evitar que categorias deletadas localmente sejam ressuscitadas pela nuvem
        const cloudCatTime = toDateMs(c.lastUpdated || c.updatedAt);
        const isDeletedInTrash = (localTrash || []).some(t => {
          if (t.type !== 'category') return false;
          const catData = t.data?.category || t.data;
          const matches = (catData?.id && catData.id === c.id) ||
            (catData?.name && c.name && catData.name.trim().toLowerCase() === c.name.trim().toLowerCase());
          if (!matches) return false;
          const trashTime = toDateMs(t.deletedAt);
          return trashTime >= cloudCatTime;
        });

        const isTombstoned = isCategoryTombstoned(c.id, c.name, cloudCatTime);
        const isLocallyPruned = !preferCloudBase && localContestTime > 0 && cloudCatTime <= localContestTime;

        if (!isDeletedInTrash && !isTombstoned && !isLocallyPruned) {
          mergedCatsMap.set(c.id, c);
        }
      }
    });
    return Array.from(mergedCatsMap.values());
  };

  const mergeCoachPlanner = (localPlanner, cloudPlanner, arrayOptions = {}) => {
    if (!localPlanner && !cloudPlanner) return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
    const local = localPlanner || {};
    const cloud = cloudPlanner || {};
    const allDays = new Set([...Object.keys(local), ...Object.keys(cloud)]);
    const merged = {};
    allDays.forEach(day => {
      merged[day] = mergeArrays(local[day], cloud[day], arrayOptions);
    });
    return merged;
  };

  const mergeContestPayload = useCallback((localContest, cloudContest, preferCloudBase = false, localTrash = []) => {
    const base = preferCloudBase ? { ...localContest, ...cloudContest } : { ...cloudContest, ...localContest };
    const localContestTime = new Date(localContest?.lastUpdated || 0).getTime();
    const arrayOptions = { preferCloudBase, localContestTime };
    return {
      ...base,
      categories: mergeContestCategories(localContest.categories, cloudContest.categories, preferCloudBase, localTrash, localContestTime),
      studyLogs: mergeArrays(localContest.studyLogs, cloudContest.studyLogs, arrayOptions),
      studySessions: mergeArrays(localContest.studySessions, cloudContest.studySessions, arrayOptions),
      simuladoRows: mergeArrays(localContest.simuladoRows, cloudContest.simuladoRows, arrayOptions),
      simulados: mergeArrays(localContest.simulados, cloudContest.simulados, arrayOptions),
      monteCarloHistory: mergeMonteCarloHistory(localContest.monteCarloHistory, cloudContest.monteCarloHistory),
      coachPlan: mergeArrays(localContest.coachPlan, cloudContest.coachPlan, arrayOptions),
      coachPlanner: mergeCoachPlanner(localContest.coachPlanner, cloudContest.coachPlanner, arrayOptions),
      flashcardDecks: mergeArrays(localContest.flashcardDecks, cloudContest.flashcardDecks, arrayOptions),
      agenda: mergeArrays(localContest.agenda, cloudContest.agenda, arrayOptions),
      ...(() => {
        const localTime = new Date(localContest.lastUpdated || 0).getTime();
        const cloudTime = new Date(cloudContest.lastUpdated || 0).getTime();
        const settingsSource = cloudTime > localTime ? cloudContest : localContest;
        const otherSource = cloudTime > localTime ? localContest : cloudContest;
        return {
          settings: { ...(otherSource.settings || {}), ...(settingsSource.settings || {}) },
          mcWeights: { ...(otherSource.mcWeights || {}), ...(settingsSource.mcWeights || {}) },
        };
      })(),
      historicalCutoffs: mergeArrays(localContest.historicalCutoffs, cloudContest.historicalCutoffs, arrayOptions),
      calibrationEvents: mergeArrays(localContest.calibrationEvents, cloudContest.calibrationEvents, arrayOptions),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mergeAppState = useCallback((local, cloud, options = {}) => {
    if (!cloud || typeof cloud !== 'object') {
      if (!local?.contests) return local;
      const cleanedContests = { ...local.contests };
      Object.keys(cleanedContests).forEach(id => {
        cleanedContests[id] = deduplicateCategoryNames(cleanedContests[id]);
      });
      return { ...local, contests: cleanedContests };
    }
    if (!local) return cloud;

    const cloudHasContestsTree = !!(cloud && cloud.contests && typeof cloud.contests === 'object');
    if (!cloudHasContestsTree) {
      logger.warn('[Sync] Payload da nuvem sem `contests` válido. Mantendo estado local.');
      if (!local?.contests) return local;
      const cleanedContests = { ...local.contests };
      Object.keys(cleanedContests).forEach(id => {
        cleanedContests[id] = deduplicateCategoryNames(cleanedContests[id]);
      });
      return { ...local, contests: cleanedContests };
    }

    const localContests = local.contests || {};
    const cloudContests = cloud.contests || {};
    // FIX: Validar cloudContests é um objeto
    if (typeof cloudContests !== 'object' || Array.isArray(cloudContests)) {
      logger.warn('[Sync] cloudContests inválido. Mantendo estado local.');
      return local;
    }
    const mergedContests = { ...localContests };
    const newTrashItems = [];
    const cloudRawTime = new Date(cloud.lastUpdated || 0).getTime();
    const localRawTime = new Date(local.lastUpdated || 0).getTime();
    const cloudFullUpdate = Number.isFinite(cloudRawTime) ? cloudRawTime : 0;
    const localFullUpdate = Number.isFinite(localRawTime) ? localRawTime : 0;

    Object.entries(cloudContests).forEach(([id, cloudContest]) => {
      const localContest = localContests[id];
      if (!localContest) {
        const trashEntry = (local.trash || []).find(t => t.contestId === id);
        if (!trashEntry) {
          mergedContests[id] = cloudContest;
        } else {
          // Só re-adiciona se a nuvem é mais recente que a deleção local
          const trashTime = new Date(trashEntry.deletedAt || 0).getTime();
          const cloudTime = new Date(cloudContest.lastUpdated || 0).getTime();
          if (cloudTime > trashTime) {
            mergedContests[id] = cloudContest;
          }
        }
      } else {
        const cloudTime = new Date(cloudContest.lastUpdated || cloud.lastUpdated || 0).getTime();
        const localTime = new Date(localContest.lastUpdated || local.lastUpdated || 0).getTime();
        mergedContests[id] = mergeContestPayload(localContest, cloudContest, cloudTime > localTime, local.trash);
      }
    });

    const localIds = Object.keys(localContests);
    if (!options.nonDestructive) localIds.forEach(id => {
      if (id === 'default') return;
      if (!cloudContests[id]) {
        const localTime = new Date(localContests[id]?.lastUpdated || local.lastUpdated || 0).getTime();
        if (cloudFullUpdate > localTime + 5000) {
          const alreadyInTrash = (local.trash || []).some(t => t.contestId === id);
          if (!alreadyInTrash) {
            newTrashItems.push({
              id: `sync-trash-${id}-${Date.now()}`,
              type: 'contest', contestId: id,
              data: localContests[id],
              deletedAt: new Date().toISOString(),
              reason: 'cloud-sync'
            });
          }
          delete mergedContests[id];
        }
      }
    });

    Object.keys(mergedContests).forEach(id => {
      mergedContests[id] = deduplicateCategoryNames(mergedContests[id]);
    });

    const mergedContestIds = Object.keys(mergedContests);
    const isLocalIdValid = !!(local.activeId && mergedContests[local.activeId]);
    const isCloudIdValid = !!(cloud.activeId && mergedContests[cloud.activeId]);
    const fallbackActiveId = mergedContestIds[0] || 'default';
    const activeId = isLocalIdValid ? local.activeId : (isCloudIdValid ? cloud.activeId : fallbackActiveId);

    const isCloudNewer = cloudFullUpdate > localFullUpdate;
    const base = isCloudNewer ? { ...local, ...cloud } : { ...cloud, ...local };

    return {
      ...base,
      contests: mergedContests,
      // FIX: Deduplicação de trash com fallback de ID virtual
      trash: (() => {
        const combined = [...(local.trash || []), ...(cloud.trash || []), ...newTrashItems];
        const seen = new Set();
        return combined.filter(item => {
          if (!item || typeof item !== 'object') return false;
          
          const stableId = item.id || [
            item.type || 'unknown',
            item.contestId || 'no-contest',
            item.deletedAt || 'no-date',
            JSON.stringify(item.data || {}).length
          ].join('|');
          
          if (seen.has(stableId)) return false;
          seen.add(stableId);
          return true;
        });
      })(),
      activeId: activeId || local.activeId || cloud.activeId,
      version: Math.max(local.version ?? 0, cloud.version ?? 0),
      lastUpdated: new Date(Math.max(cloudFullUpdate, localFullUpdate, 0) || Date.now()).toISOString()
    };
  }, [deduplicateCategoryNames, mergeContestPayload]);

  const stateStringForSync = (state) => {
    if (!state) return '';
    const lastUpdated = state.lastUpdated || "0";
    const version = state.version || 0;
    let contentFingerprint = 0;
    if (state.contests) {
      Object.values(state.contests).forEach(c => {
        const cats = c?.categories;
        if (Array.isArray(cats)) {
          contentFingerprint += cats.length;
          cats.forEach(cat => { contentFingerprint += (cat.tasks?.length || 0); });
        }
        contentFingerprint += (c?.simuladoRows?.length || 0);
      });
    }
    const hashStr = (s) => {
      let h = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return (h >>> 0).toString(36);
    };
    return `${lastUpdated}|v${version}|active:${state.activeId}|fp:${hashStr(String(contentFingerprint))}`;
  };

  useEffect(() => {
    if (isLocalMode || !currentUser?.uid || !setAppState || !db || db?.app?.options?.projectId === 'config-missing') {
      if (isLocalMode) {
        setTimeout(() => { setCloudStatus('idle'); }, 0);
      } else if (currentUser?.uid && (!db || db?.app?.options?.projectId === 'config-missing')) {
        console.error("[Sync] Erro: Configuração do Firebase incompleta.");
        setTimeout(() => { setCloudStatus('error'); setCloudError('Configuração incompleta (.env)'); }, 0);
      } else if (!currentUser?.uid) {
        setTimeout(() => { setCloudStatus('idle'); }, 0);
      }
      confirmParity();
      return;
    }

    setTimeout(() => { setCloudStatus('connecting'); setCloudError(null); }, 0);

    let docRef;
    try {
      docRef = doc(db, 'backups', currentUser.uid);
    } catch (err) {
      console.error("[Sync] Firebase initialization error:", err);
      confirmParity();
      return;
    }

    const safetyBootTimeout = setTimeout(() => {
      if (!isParityValidatedRef.current) {
        logger.warn("[Firebase-Diag] TIMEOUT!");
        confirmParity();
      }
    }, 5000);

    let currentSnapshotId = 0;
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (!isMountedRef.current) return;
      const snapId = ++currentSnapshotId;
      if (docSnap.metadata.hasPendingWrites) {
        pendingWritesCountRef.current += 1;
        logger.debug(`[Sync] Ignorando snapshot: Escrita local pendente (${pendingWritesCountRef.current}).`);
        if (pendingWritesCountRef.current >= 5 && !isParityValidatedRef.current) {
            logger.warn("[Sync] Pending writes persistentes — forçando paridade com dados locais.");
            confirmParity();
        }
        return;
      }
      pendingWritesCountRef.current = 0;

      setCloudStatus('connected');
      setCloudError(null);

      const isFromCache = docSnap.metadata.fromCache;
      const exists = docSnap.exists();

      if (isFromCache && !exists && !isParityValidatedRef.current) {
        logger.debug("[Sync] Aguardando resposta real do servidor...");
        return;
      }

      clearTimeout(safetyBootTimeout);
      let cloudData = exists ? docSnap.data() : null;

      if (cloudData && cloudData.contestIds) {
        try {
          const contestsSnap = await getDocs(collection(db, 'backups', currentUser.uid, 'contests'));
          if (snapId !== currentSnapshotId) return; // A newer snapshot arrived during fetch
          cloudData.contests = {};
          const activeIds = new Set(cloudData.contestIds || []);
          contestsSnap.forEach(cDoc => {
            if (activeIds.has(cDoc.id)) {
              cloudData.contests[cDoc.id] = cDoc.data();
            }
          });
        } catch (err) {
          logger.error("[Sync] Erro ao buscar subcoleções no snapshot:", err);
          return; // ABORT Sync to avoid corrupting state with missing data
        }
      }
      
      latestCloudDataRef.current = cloudData;

      if (!cloudData) {
        if (!isParityValidatedRef.current) {
          lastSyncedRef.current = stateStringForSync(appStateRef.current);
          confirmParity();
        }
        return;
      }

      const localState = useAppStore.getState().appState;
      const localVersion = Number(localState?.version || 0);
      const cloudVersion = Number(cloudData?.version || 0);

      if (localVersion > cloudVersion) {
        console.warn('[CloudSync] Pull ignorado: estado local é mais novo que nuvem.', {
          localVersion,
          cloudVersion
        });
        if (!isParityValidatedRef.current) {
          confirmParity();
        }
        return;
      }

      const now = Date.now();
      const cloudUpdatedRaw = new Date(cloudData.lastUpdated);
      const cloudUpdatedTime = isNaN(cloudUpdatedRaw.getTime()) ? 0 : cloudUpdatedRaw.getTime();
      const localUpdatedRaw = new Date(appStateRef.current?.lastUpdated);
      const localUpdatedTime = isNaN(localUpdatedRaw.getTime()) ? 0 : localUpdatedRaw.getTime();
      const isBootSync = !isParityValidatedRef.current;
      const localWasJustEdited = (now - lastLocalMutationRef.current) < 15000;

      let shouldPullCloud = false;
      let mergeMode = "normal";

      if (isBootSync) {
        if (localWasJustEdited) {
          shouldPullCloud = false;
        } else {
          const cloudUpdated = cloudUpdatedTime || 0;
          const localUpdated = localUpdatedTime;
          const activeId = appStateRef.current?.activeId;
          const activeContest = appStateRef.current?.contests?.[activeId];
          const contestCount = Object.keys(appStateRef.current?.contests || {}).length;
          const localHasSubstantialContent = contestCount > 1 ||
            (activeContest?.categories && activeContest.categories.length > 0) ||
            (activeContest?.user?.name && activeContest.user.name !== "Estudante");
          const localIsInitial = localUpdated <= 0 || !localHasSubstantialContent;
          const cloudHasContent = (cloudData.categories && cloudData.categories.length > 0) ||
            (cloudData.contests && Object.values(cloudData.contests).some(c => c.categories && c.categories.length > 0));
          const cloudContestIds = Object.keys(cloudData.contests || {});
          const localContestIds = Object.keys(appStateRef.current?.contests || {});
          const cloudHasMissingLocalContests = cloudContestIds.some(id => !localContestIds.includes(id));

          if (localIsInitial && cloudHasContent) {
            shouldPullCloud = true;
          } else if (cloudHasMissingLocalContests) {
            if (localIsInitial) {
              shouldPullCloud = true;
            } else {
              shouldPullCloud = true;
              mergeMode = "nonDestructive";
            }
          } else if (cloudHasContent && cloudUpdated > localUpdated + 5000) {
            shouldPullCloud = true;
          } else {
            shouldPullCloud = false;
          }
        }

        if (typeof window !== 'undefined' && (window.__ULTRA_RESCUE_SUCCESS || window.__ULTRA_RESCUE_CANDIDATE)) {
          shouldPullCloud = false;
        }
      } else {
        const localState = useAppStore.getState().appState;
        const localUpdated = new Date(localState?.lastUpdated || 0).getTime();
        const cloudUpdated = latestCloudDataRef.current
            ? new Date(latestCloudDataRef.current.lastUpdated || 0).getTime()
            : 0;
        const localWasJustEdited = (Date.now() - lastLocalMutationRef.current) < 15000;
        shouldPullCloud = !localWasJustEdited && cloudUpdated > localUpdated + 5000;
        mergeMode = "merge";
      }

      const wasAlreadyValidated = isParityValidatedRef.current;
      confirmParity();

      if (shouldPullCloud) {
        isCloudPullRef.current = true;
        const pullStartTime = Date.now();
        if (isMountedRef.current) {
          applyingRemoteRef.current = true;
          try {
            setAppState(() => {
              const freshState = useAppStore.getState().appState;
              const freshUpdated = new Date(freshState?.lastUpdated || 0).getTime();
              if (freshUpdated > pullStartTime) {
                console.warn('[Sync] Mutation local durante pull — preservando dados locais');
                return freshState;
              }
              return mergeAppState(freshState, cloudData, {
                nonDestructive: mergeMode === "nonDestructive"
              });
            });
          } catch (pullErr) {
            console.error('[Sync] Erro ao aplicar dados remotos:', pullErr);
          } finally {
            applyingRemoteRef.current = false;
            requestAnimationFrame(() => { isCloudPullRef.current = false; });
          }
        } else {
          isCloudPullRef.current = false;
        }
        lastSyncedRef.current = stateStringForSync(useAppStore.getState().appState);
        setHasConflict(false);
        if (!wasAlreadyValidated && showToastRef.current) {
          showToastRef.current('Sincronizado via Nuvem! ☁️✨', 'success');
        }
      } else {
        if (isMountedRef.current) {
          setAppState(() => mergeAppState(useAppStore.getState().appState, null));
        }
        lastSyncedRef.current = stateStringForSync(appStateRef.current);
        const isCloudSignificantlyAhead = cloudUpdatedTime > localUpdatedTime + 5000;
        
        // Conflito REAL: Cloud está na frente (outro aparelho editou) E localWasJustEdited (nós editamos aqui)
        // Se a Cloud está na frente mas NÃO editamos localmente, deveria ter feito Pull automático.
        // Se o local está na frente, é apenas um sync pendente, NÃO é conflito.
        const hasRealDivergence = isCloudSignificantlyAhead && localWasJustEdited;
        
        setHasConflict(!isBootSync && hasRealDivergence);
      }
    }, (err) => {
      if (!isMountedRef.current) return;
      logger.error("[Sync] Erro no listener:", err);
      setCloudStatus('error');
      setCloudError(err.message || 'Erro no listener');
      confirmParity();
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyBootTimeout);
    };
  }, [currentUser?.uid, setAppState, confirmParity, mergeAppState]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setTimeout(() => { setCloudStatus('idle'); setCloudError(null); }, 0);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    isParityValidatedRef.current = false;
    setTimeout(() => { setParityTick(t => t + 1); setHasConflict(false); }, 0);
    lastSyncedRef.current = null;
    lastLocalMutationRef.current = 0;
  }, [currentUser?.uid]);

  const performEmergencySync = useCallback(async () => {
    if (isLocalMode || !currentUser?.uid || !appStateRef.current || !isParityValidatedRef.current || !db) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const currentStateString = stateStringForSync(appStateRef.current);
    if (lastSyncedRef.current === currentStateString) return;

    // ✅ FIX: Capturar versão atual para verificação otimista
    const currentVersion = appStateRef.current?.version || 0;

    try {
      const syncState = useAppStore.getState().appState;

      const safeContests = syncState.contests
        ? Object.fromEntries(Object.entries(syncState.contests).map(([id, c]) => [id, safeguardContest(c)]))
        : syncState.contests;
      const safeTrash = (syncState.trash || []).slice(-20);
      const stateToSave = cleanUndefined(safeClone({
        ...syncState,
        version: currentVersion,
        contests: safeContests,
        trash: safeTrash,
        history: [],
        _lastBackup: new Date().toISOString()
      }));

      // ✅ FIX: Incluir version no payload para detecção de conflito
      stateToSave._syncVersion = currentVersion;
      stateToSave._syncTimestamp = Date.now();

      const emergencyState = { ...stateToSave };

      setIsInternalSyncing(true);
      isInternalSyncingRef.current = true;

      const batch = writeBatch(db);
      const coreEmergency = { ...emergencyState };
      const emergencyContests = coreEmergency.contests || {};
      coreEmergency.contestIds = Object.keys(emergencyContests);
      delete coreEmergency.contests;

      batch.set(doc(db, 'backups', currentUser.uid), coreEmergency);
      for (const [cid, cData] of Object.entries(emergencyContests)) {
        batch.set(doc(db, 'backups', currentUser.uid, 'contests', cid), cData);
      }

      // FIX: Deletar órfãos usando os IDs conhecidos da nuvem
      const knownCloudIds = latestCloudDataRef.current?.contestIds || [];
      const currentLocalIds = new Set(Object.keys(emergencyContests));
      for (const oldId of knownCloudIds) {
        if (!currentLocalIds.has(oldId)) {
          batch.delete(doc(db, 'backups', currentUser.uid, 'contests', oldId));
        }
      }

      batch.commit()
        .then(() => {
          lastSyncedRef.current = currentStateString;
          try { localStorage.removeItem('ultra-sync-dirty'); } catch (err) { logger.warn('[Sync] LocalStorage cleanup error:', err); }
        })
        .catch(e => {
          logger.error("[Sync] Erro no emergency-save:", e);
          lastSyncedRef.current = null;
        })
        .finally(() => {
          if (isMountedRef.current) {
            setIsInternalSyncing(false);
            isInternalSyncingRef.current = false;
          }
        });
    } catch (e) {
      logger.error("[Sync] Erro na montagem do emergency-save:", e);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !db) return;
    const handleVisibilityChange = () => {
      // ✅ FIX: Nunca disparar emergency sync se um pull estiver ocorrendo
      if (document.visibilityState === 'hidden' && !isCloudPullRef.current) {
        performEmergencySync();
      } else if (document.visibilityState === 'visible') {
        setIsInternalSyncing(false);
        isInternalSyncingRef.current = false;
      }
    };
    const handleBeforeUnload = () => {
      let isDirty = false;
      try {
        const currentStr = stateStringForSync(appStateRef.current);
        if (lastSyncedRef.current !== currentStr) {
          try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch (err) { logger.warn('[Sync] LocalStorage error on unload:', err); }
          isDirty = true;
        }
      } catch (err) { logger.warn('[Sync] State sync error on unload:', err); }

      if (isDirty && typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SYNC_BEACON_URL && currentUser?.uid) {
        try {
          const appState = appStateRef.current || {};
          const payload = JSON.stringify({
            uid: currentUser.uid,
            lastUpdated: appState.lastUpdated || null,
            version: appState.version || 0,
            activeId: appState.activeId || null,
            dirty: true
          });
          const blob = new Blob([payload], { type: 'application/json' });
          fetch(import.meta.env.VITE_SYNC_BEACON_URL, {
            method: 'POST', body: blob, keepalive: true
          }).catch(err => console.debug('[Sync] Fetch keepalive error:', err));
        } catch (err) { logger.warn('[Sync] Beacon error:', err); }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.uid, performEmergencySync]);

  useEffect(() => {
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }
    if (syncMutexRef.current) {
      return;
    }

    if (isLocalMode || !currentUser?.uid || !syncTrigger || !isParityValidatedRef.current || !db) return;
    const currentState = useAppStore.getState().appState;
    const currentStateString = stateStringForSync(currentState);

    if (isCloudPullRef.current) {
      isCloudPullRef.current = false;
      lastSyncedRef.current = currentStateString;
      return;
    }
    if (lastSyncedRef.current === currentStateString) return;

    const lastMutation = Date.now();
    lastLocalMutationRef.current = lastMutation;
    setHasConflict(false);

    const MAX_SYNC_REENTRY = 3;
    const syncToCloud = async () => {
      if (!db) return;
      if (isInternalSyncingRef.current) {
        needsSyncRef.current = true;
        return;
      }
      needsSyncRef.current = false;

      const MAX_RETRIES = 3;
      let attempt = 0;
      let lastError = null;


      syncMutexRef.current = true;
      setIsInternalSyncing(true);
      isInternalSyncingRef.current = true;

      try {
      while (attempt < MAX_RETRIES) {
        try {
          const freshState = useAppStore.getState().appState;
          const currentStateString = stateStringForSync(freshState);
          if (lastSyncedRef.current === currentStateString) break;


          const safeContests = freshState.contests
            ? Object.fromEntries(Object.entries(freshState.contests).map(([id, c]) => [id, safeguardContest(c)]))
            : freshState.contests;
          const safeTrash = (freshState.trash || []).slice(-20);
          const stateToSave = cleanUndefined(safeClone({
            ...freshState, contests: safeContests, trash: safeTrash,
            history: [], _lastBackup: new Date().toISOString()
          }));

          // ✅ FIX: Incluir version no payload para detecção de conflito
          stateToSave._syncVersion = freshState?.version || 0;
          stateToSave._syncTimestamp = Date.now();

          // 🚨 ARQUITETURA CRÍTICA: Separar editais em subcoleções para evitar o limite de 1MB do Firestore!
          const batch = writeBatch(db);
          const coreState = { ...stateToSave };
          const contestsToSave = coreState.contests || {};
          
          coreState.contestIds = Object.keys(contestsToSave);
          delete coreState.contests; // REMOVE DA RAIZ PARA NÃO BATER 1MB

          batch.set(doc(db, 'backups', currentUser.uid), coreState);
          for (const [cid, cData] of Object.entries(contestsToSave)) {
            batch.set(doc(db, 'backups', currentUser.uid, 'contests', cid), cData);
          }

          // FIX: Deletar órfãos usando os IDs conhecidos da nuvem
          const knownCloudIds = latestCloudDataRef.current?.contestIds || [];
          const currentLocalIds = new Set(Object.keys(contestsToSave));
          for (const oldId of knownCloudIds) {
            if (!currentLocalIds.has(oldId)) {
              batch.delete(doc(db, 'backups', currentUser.uid, 'contests', oldId));
            }
          }

          const commitWithTimeout = (batchToCommit, timeoutMs) => {
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error('Firestore timeout')), timeoutMs);
              batchToCommit.commit().then(() => {
                clearTimeout(timer);
                resolve();
              }).catch(err => {
                clearTimeout(timer);
                reject(err);
              });
            });
          };

          await commitWithTimeout(batch, 15000);
          lastSyncedRef.current = currentStateString;
          try { localStorage.removeItem('ultra-sync-dirty'); } catch (err) { logger.warn('[Sync] LocalStorage cleanup error:', err); }
          lastError = null;
          syncReentryCountRef.current = 0; // ✅ FIX: Resetar contador em sucesso
          break;
        } catch (e) {
          lastError = e;
          attempt++;
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, attempt * 2000));
          }
        }
      }

      if (lastError) {
        logger.error("[Sync] Todas as tentativas falharam:", lastError);
        if (showToastRef.current && lastError.code !== 'unavailable' && lastError.message !== 'timeout') {
          showToastRef.current(`Falha ao salvar: ${lastError.message || lastError.code || 'Erro desconhecido'}`, 'error');
        }
        // ✅ LOTE-03: resetar o contador para permitir retries futuros
        syncReentryCountRef.current = 0;
      }
      } finally {
        // ✅ SEMPRE liberar o mutex
        syncMutexRef.current = false;
        if (isMountedRef.current) {
          setIsInternalSyncing(false);
          isInternalSyncingRef.current = false;
          if (needsSyncRef.current && syncReentryCountRef.current < MAX_SYNC_REENTRY) {
            syncReentryCountRef.current++;
            syncToCloud();
          } else {
            syncReentryCountRef.current = 0;
          }
        }
      }
    };

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const isHighPriority = localStorage.getItem('ultra-sync-dirty') === 'true';
    const hasSyncedBefore = typeof lastSyncedRef.current === 'string' && lastSyncedRef.current.length > 0;
    const delay = isHighPriority ? 500 : (hasSyncedBefore ? 1500 : 250);
    debounceRef.current = setTimeout(syncToCloud, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [syncTrigger, parityTick, currentUser?.uid, mergeAppState]);

  // ✅ FIX: Safety net — se isCloudPullRef ficar true por > 10s, resetar
  useEffect(() => {
    if (!isCloudPullRef.current) return;
    const safetyTimer = setTimeout(() => {
      if (isCloudPullRef.current) {
        console.warn('[Sync] isCloudPullRef stuck, resetting.');
        isCloudPullRef.current = false;
      }
    }, 10000);
    return () => clearTimeout(safetyTimer);
  }, [syncTrigger]);

  const forcePull = useCallback(() => {
    if (latestCloudDataRef.current && setAppState && isMountedRef.current) {
      let nextState;
      setAppState(() => {
        const freshState = useAppStore.getState().appState;
        nextState = mergeAppState(freshState, latestCloudDataRef.current);
        return nextState;
      });
      if (nextState) lastSyncedRef.current = stateStringForSync(nextState);
      setHasConflict(false);
      if (showToastRef.current) showToastRef.current('Paridade forçada com sucesso! 💎', 'success');
    }
  }, [mergeAppState, setAppState]);

  return {
    cloudStatus, cloudError,
    cloudConnected: cloudStatus === 'connected',
    isSyncing: isInternalSyncing,
    hasConflict,
    forcePullCloud: forcePull
  };
}


```

---

### Arquivo: `src/hooks/useCoachControlCenter.js`
*Linhas: 363 | Tamanho: 12.3 KB*

```javascript
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
} from '../utils/coachPipeline.js';
import {
  loadLastBacktestReport,
  loadTunerHistory,
  runCoachAutoTuner,
  applyRecommendedFlags,
  loadPersistedCoachFlags,
  persistCoachFlags,
  getSafeBaselineFeatures,
  getStrategySpace,
} from '../utils/coachOptimizer.js';
import {
  loadCausalModel,
} from '../utils/coachCausal.js';
import {
  loadModelHealthSnapshots,
} from '../utils/coachObservability.js';
import { replaceFlags, writeFlags } from '../utils/coachFeatureStore.js';

const CONTROL_CENTER_STORAGE_KEY = 'coach_control_center_state_v1';

// FIX: conjunto de abas válidas para validar estado persistido
const VALID_TABS = new Set(['overview', 'flags', 'health', 'causal', 'autotuner', 'backtest']);

// FIX: valida shape do estado persistido (evita corromper a UI com dado inválido)
function loadControlCenterState() {
  try {
    const raw = localStorage.getItem(CONTROL_CENTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const state = {};
    if (typeof parsed.activeTab === 'string' && VALID_TABS.has(parsed.activeTab)) {
      state.activeTab = parsed.activeTab;
    }
    if (parsed.flagOverrides && typeof parsed.flagOverrides === 'object' && !Array.isArray(parsed.flagOverrides)) {
      const clean = {};
      for (const [k, v] of Object.entries(parsed.flagOverrides)) {
        if (typeof v === 'boolean') clean[k] = v;
      }
      state.flagOverrides = clean;
    }
    return state;
  } catch {
    return null;
  }
}

function saveControlCenterState(state) {
  try {
    localStorage.setItem(CONTROL_CENTER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useCoachControlCenter({
  categories = [],
  simulados = [],
  studyLogs = [],
  maxScore = 100,
  targetScore = 80,
} = {}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orchestratorResult, setOrchestratorResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [backtestReport, setBacktestReport] = useState(null);
  const [tunerHistory, setTunerHistory] = useState([]);
  const [tunerResult, setTunerResult] = useState(null);
  const [causalModel, setCausalModel] = useState(null);
  const [healthSnapshots, setHealthSnapshots] = useState([]);
  const [currentFlags, setCurrentFlags] = useState({});
  const [flagOverrides, setFlagOverrides] = useState({});
  const [lastRunTimestamp, setLastRunTimestamp] = useState(null);

  const isMounted = useRef(true);
  // FIX: contador de execução para descartar resultados obsoletos
  const orchestratorRunIdRef = useRef(0);
  const tunerRunIdRef = useRef(0);
  const tunerAbortControllerRef = useRef(null);
  // FIX (A5): snapshot das flags no início da sessão — "Reset Overrides"
  // restaura este estado. Antes relia o storage (que já contém os toggles
  // persistidos por toggleFlag), tornando o reset um no-op.
  const initialFlagsRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // FIX (M15): aborta AutoTuner pendente no unmount
  useEffect(() => () => {
    if (tunerAbortControllerRef.current) tunerAbortControllerRef.current.abort();
  }, []);

  // ==========================================================
  // Carregar estado persistido
  // ==========================================================
  useEffect(() => {
    const persisted = loadControlCenterState();
    if (persisted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (persisted.activeTab) setActiveTab(persisted.activeTab);
      if (persisted.flagOverrides) setFlagOverrides(persisted.flagOverrides);
    }
    const flags = loadPersistedCoachFlags();
    initialFlagsRef.current = flags || {};
    setCurrentFlags(flags || {});
  }, []);

  // ==========================================================
  // Salvar estado quando mudar
  // ==========================================================
  useEffect(() => {
    saveControlCenterState({ activeTab, flagOverrides });
  }, [activeTab, flagOverrides]);

  // ==========================================================
  // Executar orquestrador completo
  // ==========================================================
  const runOrchestrator = useCallback(async (options = {}) => {
    // FIX: registra esta execução; resultados de execuções anteriores são descartados
    const runId = ++orchestratorRunIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const mergedFeatures = {
        ...currentFlags,
        ...flagOverrides,
        ...(options.features || {}),
        // PATCH: orquestrador configurável
        useCoachOrchestrator: (options.features?.useCoachOrchestrator ?? flagOverrides.useCoachOrchestrator ?? true),
      };
      const result = await runCoachOrchestrator(
        { categories, simulados, studyLogs },
        {
          maxScore,
          targetScore,
          features: mergedFeatures,
          runHealth: options.runHealth !== false,
          runLLM: options.runLLM === true,
          runAutoTuner: options.runAutoTuner === true,
          trainCausalModel: options.trainCausalModel === true,
          saveHealthSnapshots: options.saveHealthSnapshots === true,
          force: true,
        }
      );
      // FIX: valida mount E que esta ainda é a execução mais recente
      if (isMounted.current && runId === orchestratorRunIdRef.current && result) {
        setOrchestratorResult(result);
        const dash = buildCoachOrchestratorDashboard(result);
        if (dash) setDashboard(dash);
      }
      if (isMounted.current && runId === orchestratorRunIdRef.current) setLastRunTimestamp(Date.now());
      return result;
    } catch (err) {
      if (isMounted.current && runId === orchestratorRunIdRef.current) {
        const msg = err?.message || String(err);
        setError(msg);
      }
      return null;
    } finally {
      if (isMounted.current && runId === orchestratorRunIdRef.current) setLoading(false);
    }
  }, [categories, simulados, studyLogs, maxScore, targetScore, currentFlags, flagOverrides]);

  // ==========================================================
  // Carregar dados auxiliares
  // ==========================================================
  const loadAuxiliaryData = useCallback(() => {
    try {
      const bt = loadLastBacktestReport();
      setBacktestReport(bt);
      const history = loadTunerHistory();
      setTunerHistory(Array.isArray(history) ? history : []);
      const causal = loadCausalModel();
      setCausalModel(causal);
      const health = loadModelHealthSnapshots();
      setHealthSnapshots(Array.isArray(health) ? health : []);
      const flags = loadPersistedCoachFlags();
      setCurrentFlags(flags || {});
    } catch (err) {
      console.warn('[ControlCenter] Failed to load auxiliary data:', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAuxiliaryData();
  }, [loadAuxiliaryData]);

  // ==========================================================
  // Executar AutoTuner
  // ==========================================================
  const runAutoTuner = useCallback(async (options = {}) => {
    if (tunerAbortControllerRef.current) {
      tunerAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    tunerAbortControllerRef.current = abortController;
    const runId = ++tunerRunIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await runCoachAutoTuner({
        maxScore,
        force: true,
        autoApply: options.autoApply === true,
        forceApply: options.forceApply === true,
        exploration: options.exploration === true,
        minImprovement: options.minImprovement ?? 0.02,
        signal: abortController.signal,
      });
      // FIX: valida mount + execução atual
      if (!isMounted.current || runId !== tunerRunIdRef.current) return null;
      setTunerResult(result);
      loadAuxiliaryData();
      if (result?.applied) {
        clearCoachCaches();
        const flags = loadPersistedCoachFlags();
        setCurrentFlags(flags || {});
      }
      return result;
    } catch (err) {
      if (isMounted.current && runId === tunerRunIdRef.current) {
        const msg = err?.message || String(err);
        setError(msg);
      }
      return null;
    } finally {
      if (isMounted.current && runId === tunerRunIdRef.current) setLoading(false);
    }
  }, [maxScore, loadAuxiliaryData]);

  // ==========================================================
  // Aplicar recomendação de flags
  // ==========================================================
  const applyRecommendation = useCallback((recommendation, options = {}) => {
    try {
      const applied = applyRecommendedFlags(recommendation, {
        force: options.force === true,
      });
      if (applied) {
        clearCoachCaches();
        const flags = loadPersistedCoachFlags();
        setCurrentFlags(flags || {});
      }
      return applied;
    } catch (err) {
      console.warn('[ControlCenter] Failed to apply recommendation:', err);
      return false;
    }
  }, []);

  // ==========================================================
  // Rollback para baseline
  // ==========================================================
  const rollbackToBaseline = useCallback(() => {
    try {
      const baseline = getSafeBaselineFeatures();
      const next = { ...baseline };
      replaceFlags(next);
      persistCoachFlags(next);
      clearCoachCaches();
      setCurrentFlags(next);
      setFlagOverrides({});
      return true;
    } catch {
      return false;
    }
  }, []);

  // ==========================================================
  // Toggle de flag individual
  // ==========================================================
  const toggleFlag = useCallback((flagKey, value) => {
    // FIX: só aceita chave string + valor boolean
    if (typeof flagKey !== 'string' || typeof value !== 'boolean') return;

    setFlagOverrides((prev) => ({
      ...prev,
      [flagKey]: value,
    }));
    const next = writeFlags({ [flagKey]: value });
    persistCoachFlags(next);
    setCurrentFlags(next);
  }, []);

  // ==========================================================
  // Reset overrides
  // ==========================================================
  const resetOverrides = useCallback(() => {
    setFlagOverrides({});
    const base = initialFlagsRef.current || getSafeBaselineFeatures();
    replaceFlags(base);
    persistCoachFlags(base);
    setCurrentFlags(base);
  }, []);

  // ==========================================================
  // Limpar caches
  // ==========================================================
  const handleClearCaches = useCallback(() => {
    clearCoachCaches();
  }, []);

  // ==========================================================
  // Dados derivados
  // ==========================================================
  const strategySpace = useMemo(() => getStrategySpace(), []);

  const latestHealth = useMemo(() => {
    if (healthSnapshots.length === 0) return null;
    return healthSnapshots[healthSnapshots.length - 1];
  }, [healthSnapshots]);

  const hasError = error !== null;
  const isReady = !loading && orchestratorResult !== null;

  return {
    // Estado
    activeTab,
    setActiveTab,
    loading,
    error,
    hasError,
    isReady,
    lastRunTimestamp,
    // Dados principais
    orchestratorResult,
    dashboard,
    backtestReport,
    tunerHistory,
    tunerResult,
    causalModel,
    healthSnapshots,
    latestHealth,
    currentFlags,
    flagOverrides,
    strategySpace,
    // Ações
    runOrchestrator,
    loadAuxiliaryData,
    runAutoTuner,
    applyRecommendation,
    rollbackToBaseline,
    toggleFlag,
    resetOverrides,
    handleClearCaches,
  };
}

export default useCoachControlCenter;


```

---

### Arquivo: `src/hooks/useEvolutionMC.js`
*Linhas: 245 | Tamanho: 9.8 KB*

```javascript
import { useState, useMemo, useEffect } from 'react';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { useAppStore } from '../store/useAppStore';
import { getDateKey, toDateMs } from '../utils/dateHelper';
import { getSafeScore } from '../utils/scoreHelper';
import { parseNoonLocal, addDaysNoon } from '../utils/parseNoonLocal';
import { runMonteCarloAnalysis } from '../engine/monteCarlo';

const EMPTY_ARRAY = Object.freeze([]);

/**
 * Orquestra o motor Monte Carlo do Menu Evolução.
 * Extraído do EvolutionChart.jsx (LOTE-05).
 *
 * Responsabilidades:
 *  - disparar o worker apenas nos engines que consomem o resultado;
 *  - debouncer + cancelamento seguro;
 *  - fallback síncrono quando o worker falha;
 *  - série de projeção futura com parsing de data sem timezone fixo.
 */
export function useEvolutionMC({
  focusCategory,
  categoryLevels,
  projectDays,
  targetScore,
  minScore,
  maxScore,
  _activeEngine
}) {
  const { runAnalysis } = useMonteCarloWorker();
  const [mcLoading, setMcLoading] = useState(false);
  const [mcResult, setMcResult] = useState(null);
  const [mcProjectionSeries, setMcProjectionSeries] = useState(null);

  const [debouncedTarget, setDebouncedTarget] = useState(targetScore);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTarget(targetScore), 300);
    return () => clearTimeout(t);
  }, [targetScore]);

  // FIX 3A: usar fingerprint estável para evitar re-cálculo por mudança de referência
  const historyFingerprint = useMemo(() => {
      const historyRaw = focusCategory?.simuladoStats?.history;
      if (!historyRaw) return 'empty';
      const arr = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);
      if (arr.length === 0) return 'empty';
      // FIX: fingerprint forte. O anterior (só first/last) deixava o array
      // stale quando um item do MEIO era editado sem mudar o comprimento.
      return arr
          .map((h) => `${h?.date || h?.createdAt || ''}:${h?.score ?? ''}`)
          .join('|');
  }, [focusCategory?.simuladoStats?.history]);
  
  const historyArray = useMemo(() => {
      const historyRaw = focusCategory?.simuladoStats?.history;
      if (!historyRaw) return EMPTY_ARRAY;
      return Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyFingerprint]);
  
  const currentFocusLevel = focusCategory ? categoryLevels?.[focusCategory.id] : undefined;

  useEffect(() => {
    if (!focusCategory || !focusCategory.id || !Array.isArray(historyArray) || historyArray.length === 0) {
      queueMicrotask(() => {
        setMcLoading(false);
        setMcResult(null);
        setMcProjectionSeries(null);
      });
      return;
    }

    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Math.max(safeMin + 1, Number(maxScore) || 100);

    const hist = [...historyArray]
      .filter((h) => h && (h.date || h.createdAt))
      .map((h) => {
        const dateKey = getDateKey(h.date || h.createdAt);
        const score = getSafeScore(h, safeMax, safeMin);
        // FIX 3B: validação mais robusta
        if (!dateKey || !Number.isFinite(score)) return null;
        return {
          date: dateKey,
          score,
          correct: Number.isFinite(Number(h.correct)) ? Number(h.correct) : undefined,
          total: Number.isFinite(Number(h.total)) ? Number(h.total) : undefined,
          timeSpent: Number.isFinite(Number(h.timeSpent)) ? Number(h.timeSpent) : undefined,
          timedQuestoes: Number.isFinite(Number(h.timedQuestoes)) ? Number(h.timedQuestoes) : undefined
        };
      })
      .filter(Boolean)
      .sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date));

    // FIX 3B: verificar antes de prosseguir
    if (hist.length < 1) {
        queueMicrotask(() => setMcLoading(false));
        return;
    }

    let cancelled = false;
    const workerDebounceTimeout = setTimeout(async () => {
      // ✅ BUG-5 FIX: Mover cálculos de tempo para ANTES do try/catch
      // para que fiquem acessíveis no fallback síncrono
      let totalTimeSpent = 0;
      let totalTimedQuestions = 0;
      historyArray.forEach((rawH) => {
        if (!rawH) return;
        let hasTopicWithTime = false;
        let topicsTs = 0;
        let topicsTimedQ = 0;
        
        if (Array.isArray(rawH.topics)) {
          for (const t of rawH.topics) {
            const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
            const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0
              ? t.timedQuestoes
              : Number(t.total) || 0;
            if (tTs !== null && tTs > 0 && tTot > 0) {
              topicsTs += tTs;
              topicsTimedQ += tTot;
              hasTopicWithTime = true;
            }
          }
        } else if (rawH.topics && typeof rawH.topics === 'object') {
           for (const key in rawH.topics) {
             const t = rawH.topics[key];
             const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
             const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0
               ? t.timedQuestoes
               : Number(t.total) || 0;
             if (tTs !== null && tTs > 0 && tTot > 0) {
               topicsTs += tTs;
               topicsTimedQ += tTot;
               hasTopicWithTime = true;
             }
           }
        }
        
        if (hasTopicWithTime) {
          totalTimeSpent += topicsTs;
          totalTimedQuestions += topicsTimedQ;
        } else if (rawH.timeSpent != null && rawH.timedQuestoes != null) {
          totalTimeSpent += Number(rawH.timeSpent);
          totalTimedQuestions += Number(rawH.timedQuestoes);
        }
      });
      const avgSeconds = totalTimedQuestions > 0 ? totalTimeSpent / totalTimedQuestions : 0;

      const store = useAppStore.getState();
      const activeId = store.appState?.activeId;
      const contest = store.appState?.contests?.[activeId];
      const defaultExamTotalQuestions = contest?.examTotalQuestions || 100;
      const examDurationMinutes = contest?.examDurationMinutes || 240;
      const projectedTotalTimeSeconds = defaultExamTotalQuestions * avgSeconds;

      setMcLoading(true);
      try {
        const result = await runAnalysis({
          values: hist,
          dates: hist.map((h) => h.date),
          meta: debouncedTarget,
          projectionDays: projectDays,
          minScore: safeMin,
          maxScore: safeMax,
          currentMean: currentFocusLevel,
          forcedBaseline: currentFocusLevel,
          projectedTotalTimeSeconds,
          examDurationMinutes
        });
        if (cancelled || !result) return;
        setMcResult({ ...result, categoryId: focusCategory?.id });

        // ✅ LOTE-05: parse local normalizado (sem timezone hardcoded "-04:00")
        const lastDate = parseNoonLocal(hist[hist.length - 1].date);
        if (!lastDate) return;
        const nextDate = addDaysNoon(lastDate, projectDays || 30);

        const p50 = result.projectedMean ?? result.mean ?? safeMin;
        const lo = result.ci95Low ?? result.ci95StatLow ?? safeMin;
        const hi = result.ci95High ?? result.ci95StatHigh ?? safeMax;
        setMcProjectionSeries({
          date: getDateKey(nextDate),
          mc_p50: p50,
          mc_band: [lo, hi],
          categoryId: focusCategory?.id
        });
      } catch (err) {
        console.warn('[useEvolutionMC] Worker MC falhou, tentando sync:', err);
        // ✅ LOTE-05: fallback síncrono real (antes o catch era vazio)
        if (!cancelled) {
          try {
            const fallback = runMonteCarloAnalysis({
              values: hist,
              dates: hist.map((h) => h.date),
              meta: debouncedTarget,
              simulations: 1500,
              projectionDays: projectDays,
              minScore: safeMin,
              maxScore: safeMax,
              currentMean: currentFocusLevel,
              forcedBaseline: currentFocusLevel,
              // ✅ BUG-5 FIX: repassar parâmetros de Time Penalty ao fallback síncrono
              projectedTotalTimeSeconds,
              examDurationMinutes
            });
            if (fallback) {
              setMcResult({ ...fallback, categoryId: focusCategory?.id });
              const lastDate = parseNoonLocal(hist[hist.length - 1].date);
              if (lastDate) {
                const nextDate = addDaysNoon(lastDate, projectDays || 30);
                const p50 = fallback.projectedMean ?? fallback.mean ?? safeMin;
                const lo = fallback.ci95Low ?? fallback.ci95StatLow ?? safeMin;
                const hi = fallback.ci95High ?? fallback.ci95StatHigh ?? safeMax;
                setMcProjectionSeries({
                  date: getDateKey(nextDate),
                  mc_p50: p50,
                  mc_band: [lo, hi],
                  categoryId: focusCategory?.id
                });
              }
            }
          } catch (syncErr) {
            console.error('[useEvolutionMC] Fallback sync MC falhou:', syncErr);
          }
        }
      } finally {
        if (!cancelled) setMcLoading(false);
      }
    }, 600);

    return () => { cancelled = true; clearTimeout(workerDebounceTimeout); };
  }, [
    focusCategory?.id, currentFocusLevel, historyArray, debouncedTarget,
    projectDays, runAnalysis, minScore, maxScore
  ]);

  const activeMcResult = mcResult?.categoryId === focusCategory?.id ? mcResult : null;
  const activeMcProjectionSeries =
    mcProjectionSeries?.categoryId === focusCategory?.id ? mcProjectionSeries : null;

  return { mcLoading, mcResult, mcProjectionSeries, activeMcResult, activeMcProjectionSeries };
}


```

---

### Arquivo: `src/hooks/useGlobalToasts.js`
*Linhas: 34 | Tamanho: 1.1 KB*

```javascript
import { useState, useEffect } from 'react';

/**
 * Hook customizado para gerenciar Toasts globais via eventos.
 * Escuta o evento 'show-toast' e mantém uma lista de toasts ativos.
 */
export function useGlobalToasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleToastEvent = (e) => {
      if (!e || !e.detail || typeof e.detail !== 'object') return;
      const newToast = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        ...e.detail
      };
      // Accumulate toasts instead of replacing. Limit to 5 most recent to avoid clutter.
      setToasts(prev => [...prev, newToast].slice(-5));
    };

    window.addEventListener("show-toast", handleToastEvent);
    
    return () => window.removeEventListener('show-toast', handleToastEvent);
  }, []);

  const removeToast = (id) => {
    setToasts(current => current.filter(t => t.id !== id));
  };

  return { toasts, removeToast };
}

```

---

### Arquivo: `src/hooks/useIdleLogout.js`
*Linhas: 137 | Tamanho: 5.2 KB*

```javascript
import { useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';

/**
 * useIdleLogout Hook
 * Logs out the user after a specified period of inactivity.
 * 
 * @param {Function} logout - The logout function to call.
 * @param {number} timeoutMs - Inactivity timeout in milliseconds.
 */
export default function useIdleLogout(logout, timeoutMs = 60 * 60 * 1000) {
    const safeTimeout = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0 ? Number(timeoutMs) : 60 * 60 * 1000;
    const timerRef = useRef(null);
    const logoutRef = useRef(logout);
    const lastActivityRef = useRef(0);

    // LEAK-06 FIX: Keep logout function updated in a ref to avoid resetTimer dependency
    useEffect(() => {
        logoutRef.current = logout;
    }, [logout]);

    const resetTimerRef = useRef(null);

    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // P03 PERF FIX: Throttle to avoid hundreds of calls/sec from mousemove
    const THROTTLE_MS = 2000;

    const resetTimer = useCallback((force = false) => {
        const now = Date.now();
        const isForced = force === true;
        // Skip if called within throttle window (mousemove fires 60-120x/sec), unless forced
        if (!isForced && now - lastActivityRef.current < THROTTLE_MS) return;
        lastActivityRef.current = now;
        try {
            localStorage.setItem('ultra-last-activity', now.toString());
        } catch (e) {
            console.debug('[IdleLogout] localStorage.setItem failed:', e.message);
        }
        
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(async () => {
            if (!isMounted.current) return;
            try {
                const { useAppStore } = await import('../store/useAppStore');
                if (!isMounted.current) return;
                const pomodoroActive = useAppStore.getState()?.appState?.pomodoro?.activeSubject;
                if (pomodoroActive) {
                    logger.log('[IdleLogout] Pomodoro ativo — adiando logout.');
                    if (typeof resetTimerRef.current === 'function') resetTimerRef.current();
                    return;
                }
            } catch { /* se falhar, prossegue com logout */ }
            if (!isMounted.current) return;
            logger.log('[IdleLogout] Inatividade detectada. Deslogando...');
            if (typeof logoutRef.current === 'function') logoutRef.current();
        }, safeTimeout);
    }, [safeTimeout]);

    useEffect(() => {
        resetTimerRef.current = resetTimer;
    }, [resetTimer]);

    useEffect(() => {
        // BUG-25 FIX: Removed unused effectiveTimeout variable

        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // FIX: Initialize lastActivity on mount (not during render to preserve purity)
        if (!lastActivityRef.current) lastActivityRef.current = Date.now();

        // Initial set - force scheduling the initial timer on mount
        resetTimer(true);

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // ✅ FIX: Computar tempo real ao voltar do background cruzando com localStorage
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                let lastAct = lastActivityRef.current || Date.now();
                try {
                    const stored = localStorage.getItem('ultra-last-activity');
                    if (stored) {
                        const storedTime = parseInt(stored, 10);
                        // ✅ FIX: Validar que o valor é um número finito
                        if (Number.isFinite(storedTime) && storedTime > 0 && storedTime > lastAct) {
                            lastAct = storedTime;
                        }
                    }
                } catch (e) {
                    console.debug('[IdleLogout] localStorage.getItem failed:', e.message);
                }

                const elapsed = Date.now() - lastAct;
                if (elapsed >= timeoutMs) {
                    logger.log('[IdleLogout] Aba voltou ao foco e o tempo estava expirado. Deslogando...');
                    if (typeof logoutRef.current === 'function') logoutRef.current();
                } else {
                    lastActivityRef.current = lastAct; // Sync ref with storage
                    resetTimer(true);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            // Cleanup on unmount
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [resetTimer, timeoutMs]);
}


```

---

### Arquivo: `src/hooks/useLevelUp.js`
*Linhas: 33 | Tamanho: 0.9 KB*

```javascript
import { useState, useEffect } from 'react';

/**
 * Hook customizado para gerenciar o evento de Level Up.
 * Escuta o evento 'level-up' e gerencia o estado para exibição do Toast.
 */
export function useLevelUp() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleLevelUp = (e) => {
      if (!e?.detail) return;
      setQueue(prev => {
        if (prev.some(item => item?.level === e.detail.level)) return prev;
        return [...prev, e.detail];
      });
    };

    window.addEventListener('level-up', handleLevelUp);
    return () => window.removeEventListener('level-up', handleLevelUp);
  }, []);

  const clearCurrent = () => setQueue(prev => prev.slice(1));

  return { 
    levelUpData: queue[0] || null, 
    clearLevelUp: clearCurrent 
  };
}


```

---

### Arquivo: `src/hooks/useModalAccessibility.js`
*Linhas: 71 | Tamanho: 2.2 KB*

```javascript
import { useEffect } from 'react';

export function useModalAccessibility(isOpen, onClose, modalRef) {
    useEffect(() => {
        if (!isOpen) return;

        const previouslyFocused = document.activeElement;

        const getFocusableElements = () => {
            if (!modalRef?.current) return [];

            const elements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            return Array.from(elements).filter(el => {
                return !el.disabled && el.offsetParent !== null;
            });
        };

        const focusFirstElement = () => {
            const focusable = getFocusableElements();

            if (focusable.length > 0) {
                focusable[0].focus();
            } else {
                modalRef.current?.focus();
            }
        };

        const timer = setTimeout(focusFirstElement, 50);

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                if (typeof onClose === 'function') onClose();
                return;
            }

            if (event.key === 'Tab') {
                const focusable = getFocusableElements();

                if (focusable.length === 0) return;

                const firstElement = focusable[0];
                const lastElement = focusable[focusable.length - 1];

                if (event.shiftKey && document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                } else if (!event.shiftKey && document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);

            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus();
            }
        };
    }, [isOpen, onClose, modalRef]);
}


```

---

### Arquivo: `src/hooks/useMonteCarloStats.js`
*Linhas: 1.506 | Tamanho: 53.0 KB*

```javascript
// ✅ LOTE-04 FIX: default import React removido (não há JSX neste hook)
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo';
import { computeNonLinearTrend } from '../engine/projection';
import { getDateKey, normalizeDate, parseNoonLocal } from '../utils/dateHelper';
import { normalCDF_complement } from '../engine/math/gaussian.js';
import {
  shrinkProbabilityToNeutral,
  recordPredictionEvent,
  backfillObservedFromSimulados,
  computeCalibrationSummary
} from '../utils/calibration.js';
import {
  getConfidenceTier,
  buildHumanExplanation,
  detectPerformanceDrift,
  humanizeVolatility,
  validatePrediction
} from '../utils/explanationEngine.js';
import { getFlashcardImmunity } from '../utils/analytics.js';
import {
  MAX_CALIBRATION_PENALTY,
  sanitizeWeightUnit,
  regularizeVolatility,
  computeCalibrationPenalty,
  generateAnalyticsStats
} from '../engine/analyticsStats.js';

const EMPTY_ARRAY = Object.freeze([]);
const BASE_SIMULATIONS = 5000;
const LOG_DAMPING_FACTOR = 45;

const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

// T-005 FIX: clamp defensivo que NÃO empurra NaN para o mínimo.
// Em projeções estatísticas, NaN deve cair para um valor neutro/seguro,
// não para o pior caso silenciosamente.
const safeClamp = (value, min, max, fallback = null) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback !== null && fallback !== undefined
      ? fallback
      : (min + max) / 2;
  }
  return Math.min(max, Math.max(min, n));
};

// FIX: encolhimento simétrico de probabilidade extrema em direção ao neutro
const shrinkToNeutral = (p, factor, neutral = 50) => {
  const safeP = Number.isFinite(p) ? p : neutral;
  const safeFactor = clamp(factor, 0, 1);
  return neutral + (safeP - neutral) * (1 - safeFactor);
};

export function useMonteCarloStats({
  categories,
  goalDate,
  targetScore,
  timeIndex,
  timelineDates,
  minScore,
  maxScore,
  effectiveSimulateToday,
  simuladoRows: propSimuladoRows,
  // T-040 FIX: permite adiar o cálculo pesado de probabilidades por matéria.
  // enablePerSubject = false é intencional — apenas documente que o painel de matérias só calcula quando aberto.
  enablePerSubject = false
}) {
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const activeId = useAppStore(state => state.appState?.activeId);

  const weights = useAppStore(useShallow(state => state.appState?.contests?.[activeId]?.mcWeights || {}));
  const equalWeightsMode = useAppStore(state => state.appState?.mcEqualWeights ?? true);

  const mcHistory = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.monteCarloHistory;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const flashcardDecks = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.flashcardDecks;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

  const historicalCutoffs = useAppStore(useShallow(state => {
    const arr = state.appState?.contests?.[activeId]?.historicalCutoffs;
    return Array.isArray(arr) ? arr : Object.values(arr || {});
  }));

    // ✅ LOTE-03 FIX (A2): assinar APENAS simuladoRows em vez do concurso inteiro.
    // Antes, qualquer campo do concurso (studyLogs, flashcards, tasks, sessões...)
    // trocava a referência de `contest` e re-renderizava os DOIS gauges.
    const contestSimuladoRows = useAppStore(state => state.appState?.contests?.[activeId]?.simuladoRows);

  const calibrationEvents = useAppStore(useShallow(state => {
    const evs = state.appState?.contests?.[activeId]?.calibrationEvents;
    return Array.isArray(evs) ? evs : Object.values(evs || {});
  }));

  const examDurationMinutes = useAppStore(state => state.appState?.contests?.[activeId]?.examDurationMinutes || 240);
  const defaultExamTotalQuestions = useAppStore(state => state.appState?.contests?.[activeId]?.examTotalQuestions || 100);

    const rawSimuladoRows = useMemo(() => {
        const source = propSimuladoRows ?? contestSimuladoRows ?? [];
        // ✅ LOTE-03 FIX (M8): simuladoRows podem vir como OBJETO no Firebase.
        // O guard `rawSimuladoRows.length === 0` do efeito de backfill falhava
        // silenciosamente com objetos (undefined !== 0) e .map() quebraria.
        return Array.isArray(source) ? source : Object.values(source);
    }, [propSimuladoRows, contestSimuladoRows]);

  const calibrationSummary = useMemo(() => {
    if (calibrationEvents.length < 3) return null;

    try {
      return computeCalibrationSummary(calibrationEvents, { bins: 6 });
    } catch {
      return null;
    }
  }, [calibrationEvents]);

  const modelHealth = useMemo(() => {
    if (!calibrationSummary) return 0.5;

    const brierHealth = Math.max(0, Math.min(1, 1 - (calibrationSummary.avgBrier - 0.12) / 0.2));
    const trendHealth = calibrationSummary.trend === 'improving'
      ? 0.2
      : (calibrationSummary.trend === 'degrading' ? -0.2 : 0);

    return Math.max(0.1, Math.min(1, (brierHealth + 0.5 + trendHealth) / 1.5));
  }, [calibrationSummary]);

  const modelWeight = useMemo(() => {
    if (!calibrationSummary || !calibrationSummary.avgBrier) return 0.25;

    const brier = Math.max(0.12, Math.min(0.3, calibrationSummary.avgBrier));
    return Math.max(0.1, Math.min(0.45, 0.25 + (0.18 - brier) * 2.5));
  }, [calibrationSummary]);

  const dynamicSimulations = useMemo(() => {
    let sims = BASE_SIMULATIONS;

    if (calibrationSummary && calibrationSummary.avgBrier > 0.2) {
      sims = Math.min(15000, BASE_SIMULATIONS + Math.floor((calibrationSummary.avgBrier - 0.18) * 20000));
    }

    if (modelHealth > 0.8) {
      sims = Math.max(2000, Math.floor(sims * 0.8));
    } else if (modelHealth < 0.4) {
      sims = Math.min(20000, Math.floor(sims * 1.3));
    }

    return sims;
  }, [calibrationSummary, modelHealth]);

  const dynamicSimulationsRef = useRef(dynamicSimulations);
  useEffect(() => {
    dynamicSimulationsRef.current = dynamicSimulations;
  }, [dynamicSimulations]);

  const modelWeightRef = useRef(modelWeight);
  useEffect(() => {
    modelWeightRef.current = modelWeight;
  }, [modelWeight]);

  const setWeights = useAppStore(state => state.setMonteCarloWeights);
  const recordMonteCarloSnapshot = useAppStore(state => state.recordMonteCarloSnapshot);
  const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);

  // T-018/T-024 FIX: normalizar categories antes de filter
  const safeCategories = useMemo(() => {
    return Array.isArray(categories)
      ? categories
      : Object.values(categories || {});
  }, [categories]);

  const activeCategories = useMemo(() =>
    safeCategories.filter(c => {
      const h = c.simuladoStats?.history;
      const hLen = h ? (Array.isArray(h) ? h.length : Object.values(h).length) : 0;
      return hLen > 0;
    }),
    [safeCategories]
  );

  const getEqualWeights = useCallback(() => {
    if (activeCategories.length === 0) return {};

    const newWeights = {};
    activeCategories.forEach(cat => {
      newWeights[cat.id || cat.name] = 1;
    });

    return newWeights;
  }, [activeCategories]);

  const weightsKey = useMemo(() => {
    if (equalWeightsMode) return JSON.stringify(getEqualWeights());
    return JSON.stringify(weights || {});
  }, [equalWeightsMode, weights, getEqualWeights]);

  const effectiveWeights = useMemo(() => {
    if (equalWeightsMode) return getEqualWeights();
    if (!weights) return getEqualWeights();

    const weightsMap = {};

    activeCategories.forEach(cat => {
      const stored = weights[cat.id || cat.name];
      const w = sanitizeWeightUnit(stored);
      weightsMap[cat.id || cat.name] = (stored !== undefined && stored !== null) ? Math.max(0, w) : 1;
    });

    return weightsMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightsKey, activeCategories.length]);

  const [debouncedTarget, setDebouncedTarget] = useState(targetScore);
  const [debouncedWeights, setDebouncedWeights] = useState(() => effectiveWeights);

  const lastRecordedGlobalPredRef = useRef('');
  const lastRecordedSubjectPredsRef = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTarget(targetScore), 300);
    return () => clearTimeout(timer);
  }, [targetScore]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedWeights(effectiveWeights), 300);
    return () => clearTimeout(timer);
  }, [effectiveWeights]);

  const projectDays = useMemo(() => {
    if (effectiveSimulateToday) return 0;
    if (!goalDate) return 30;

    let currentDate = parseNoonLocal(getDateKey(new Date())) || new Date();

    if (timeIndex >= 0 && timeIndex < timelineDates.length) {
      // T-025 FIX: evitar new Date('YYYY-MM-DD') diretamente.
      // normalizeDate costuma ancorar melhor a data no helper do projeto.
      const parsedTimelineDate = parseNoonLocal(timelineDates[timeIndex]) || 
        normalizeDate(timelineDates[timeIndex]);

      if (parsedTimelineDate && Number.isFinite(parsedTimelineDate.getTime())) {
        currentDate = parsedTimelineDate;
      }
    }

    let goal;
    if (typeof goalDate === 'string') {
      goal = parseNoonLocal(goalDate) || normalizeDate(goalDate);
    } else if (goalDate instanceof Date) {
      goal = parseNoonLocal(getDateKey(goalDate));
    } else {
      goal = new Date(goalDate);
    }

    if (!goal || !Number.isFinite(goal.getTime())) return 30;

    // T-024/T-025 FIX: fallback para data corrente inválida
    if (!currentDate || !Number.isFinite(currentDate.getTime())) {
      currentDate = parseNoonLocal(getDateKey(new Date())) || new Date();
    }

    // Force exact day boundaries in UTC based on YYYY-MM-DD keys to avoid DST or local timezone drift
    const goalKey = getDateKey(goal);
    const currKey = getDateKey(currentDate);
    if (!goalKey || !currKey) return 30;
    const [gy, gm, gd] = goalKey.split('-').map(Number);
    const [cy, cm, cd] = currKey.split('-').map(Number);
    const utcGoal = Date.UTC(gy, gm - 1, gd);
    const utcCurrent = Date.UTC(cy, cm - 1, cd);
    const diffDays = Math.ceil((utcGoal - utcCurrent) / (1000 * 60 * 60 * 24));
    return Number.isFinite(diffDays) ? Math.min(3650, Math.max(0, diffDays)) : 30;
  }, [goalDate, effectiveSimulateToday, timeIndex, timelineDates]);

  const pureStatsData = useMemo(() => {
    return generateAnalyticsStats({
      // T-018 FIX: usar categorias já normalizadas
      categories: safeCategories,
      debouncedWeights,
      timeIndex,
      timelineDates,
      minScore,
      maxScore,
      simuladoRows: rawSimuladoRows
    });
  }, [safeCategories, debouncedWeights, timeIndex, timelineDates, minScore, maxScore, rawSimuladoRows]);

    const calibrationPenalty = useMemo(() => {
        let pen = computeCalibrationPenalty(
            mcHistory,
            pureStatsData?.globalHistory,
            maxScore,
            calibrationSummary,
            minScore // ✅ LOTE-03 FIX (M9): resíduo normalizado pelo domínio real [min, max]
        );

    if (modelHealth < 0.6) {
      pen = Math.min(MAX_CALIBRATION_PENALTY, pen * (1 + (0.6 - modelHealth)));
    }

    return pen;
    }, [mcHistory, pureStatsData?.globalHistory, maxScore, minScore, calibrationSummary, modelHealth]);

  const statsData = useMemo(() => {
    if (!pureStatsData) return null;

    if (calibrationPenalty <= 0) {
      return { ...pureStatsData, calibrationPenalty: 0 };
    }

    const aleatoricFloor = maxScore * 0.02;

    const epistemicPooled = Math.max(0, pureStatsData.pooledSD - aleatoricFloor);
    const calibratedPooledSD = aleatoricFloor + (epistemicPooled * (1 + calibrationPenalty * 2.5));

    const epistemicDaily = Math.max(0, pureStatsData.dailySD - aleatoricFloor);
    const calibratedDailySD = aleatoricFloor + (epistemicDaily * (1 + calibrationPenalty * 2.5));

    return {
      ...pureStatsData,
      pooledSD: calibratedPooledSD,
      dailySD: calibratedDailySD,
      rawPooledSD: pureStatsData.pooledSD,
      calibrationPenalty
    };
  }, [pureStatsData, calibrationPenalty, maxScore]);

  // ✅ PATCH-04: Hash deve incluir o timeIndex e target para forçar re-cálculo quando muda a meta ou range de datas
  const pureStatsHash = `${pureStatsData?.statsHash || 'null'}-ti${timeIndex}-ms${minScore}-ms${maxScore}-tgt${debouncedTarget ?? 'na'}`;

  const pureStatsDataRef = useRef(pureStatsData);
  useEffect(() => {
    pureStatsDataRef.current = pureStatsData;
  }, [pureStatsData]);

  // T-012 FIX: Ref para usar statsData já calibrado dentro do efeito principal.
  // Sem isso, o motor calculava pooledSD/dailySD calibrados mas continuava
  // usando pureStatsData na simulação.
  const statsDataRef = useRef(statsData);
  useEffect(() => {
    statsDataRef.current = statsData;
  }, [statsData]);

  const { runAnalysis } = useMonteCarloWorker();
  const [simulationData, setSimulationData] = useState({ status: 'waiting', missing: 'data' });

  useEffect(() => {
    if (!rawSimuladoRows || rawSimuladoRows.length === 0) return;
    if (!calibrationEvents || calibrationEvents.length === 0) return;

    try {
      const backfilled = backfillObservedFromSimulados(
        calibrationEvents,
        rawSimuladoRows,
        statsData?.categoryStats || [],
        maxScore
      );

      const changed = backfilled.length !== calibrationEvents.length ||
        backfilled.some((ev, idx) => {
          const orig = calibrationEvents[idx];
          return !orig || ev.observed !== orig.observed || ev.observedScore !== orig.observedScore || ev.observedAt !== orig.observedAt;
        });

      if (changed) {
        const setD = useAppStore.getState().setData;
        if (setD) {
          setD(c => ({ ...c, calibrationEvents: backfilled }));
        }
      }
    } catch {
      // ignore
    }
  }, [rawSimuladoRows, maxScore, calibrationEvents, statsData?.categoryStats]);

    const projectDaysRef = useRef(projectDays);
  useEffect(() => { projectDaysRef.current = projectDays; }, [projectDays]);

  const minScoreRef = useRef(minScore);
  useEffect(() => { minScoreRef.current = minScore; }, [minScore]);

  const maxScoreRef = useRef(maxScore);
  useEffect(() => { maxScoreRef.current = maxScore; }, [maxScore]);

  const examDurationRef = useRef(examDurationMinutes);
  useEffect(() => { examDurationRef.current = examDurationMinutes; }, [examDurationMinutes]);

  const examQuestionsRef = useRef(defaultExamTotalQuestions);
  useEffect(() => { examQuestionsRef.current = defaultExamTotalQuestions; }, [defaultExamTotalQuestions]);

  const flashcardDecksRef = useRef(flashcardDecks);
  useEffect(() => { flashcardDecksRef.current = flashcardDecks; }, [flashcardDecks]);

  const historicalCutoffsRef = useRef(historicalCutoffs);
  useEffect(() => { historicalCutoffsRef.current = historicalCutoffs; }, [historicalCutoffs]);

  const rawSimuladoRowsRef = useRef(rawSimuladoRows);
  useEffect(() => { rawSimuladoRowsRef.current = rawSimuladoRows; }, [rawSimuladoRows]);

  // FIX C-06: hash de identidade do statsData para re-executar a simulação
  // sempre que os dados calibrados mudarem (não só quando estimatedRho muda).
  const statsDataFingerprint = statsData
    ? `${statsData.pooledSD}|${statsData.dailySD}|${statsData.bayesianMean}|${statsData.globalHistory?.length || 0}`
    : 'null';

  useEffect(() => {
    const rawPureStatsData = pureStatsDataRef.current;

    // T-012 FIX: usa statsData calibrado quando disponível.
    // Mantemos o nome `pureStatsData` para não precisar reescrever o efeito inteiro.
    const pureStatsData = statsDataRef.current || rawPureStatsData;

    if (!pureStatsData) {
      setSimulationData({ status: 'waiting', missing: 'data' });
      return;
    }

    let totalPoints = 0;
    pureStatsData.categoryStats.forEach(cat => totalPoints += cat.n || 1);
    if (totalPoints < 1) return;

    let cancelled = false;

    const isFuture = projectDaysRef.current > 0;
    const domain = Math.max(1e-6, maxScoreRef.current - minScoreRef.current);

    const { globalImmunityFactor, subjectImmunityMap } = getFlashcardImmunity(flashcardDecksRef.current);

    const applyConservativeTrendCap = (result) => {
      if (
        result &&
        result.trendType === 'log_time_available' &&
        Number.isFinite(result.projectedMean) &&
        Number.isFinite(result.currentMean) &&
        result.projectedMean > result.currentMean
      ) {
        // FIX: remove o boost otimista de +10% e aplica apenas teto conservador
        result.projectedMean = Math.min(
          result.projectedMean,
          result.currentMean + (domain * 0.15)
        );
      }

      return result;
    };

    const doAnalysis = async () => {
      try {
        let result;

        if (isFuture && pureStatsData.globalHistory?.length > 0) {
          const regularizedSD = regularizeVolatility(
            pureStatsData.dailySD,
            projectDaysRef.current,
            pureStatsData.globalHistory.length,
            domain
          );

          const subjectsOpts = pureStatsData.categoryStats.map(c => {
            const subjName = c.name || c.key || '';
            const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.volatility ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScoreRef.current,
              minScore: minScoreRef.current,
              immunityFactor: immunity,
              weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
            };
          });

          let totalGlobalTimeSpent = 0;
          let totalGlobalTimedQuestions = 0;

          // T-018/T-024 FIX: usar categorias já normalizadas no hook
          const safeTimeCategories = safeCategories;

          safeTimeCategories.forEach(cat => {
            const rawHistory = cat?.simuladoStats?.history;

            const histArray = Array.isArray(rawHistory)
              ? rawHistory
              : Object.values(rawHistory || {});

            histArray.forEach(h => {
              const timeSpent = Number(h?.timeSpent);
              const timedQuestoes = Number(h?.timedQuestoes);

              if (
                Number.isFinite(timeSpent) &&
                Number.isFinite(timedQuestoes) &&
                timeSpent > 0 &&
                timedQuestoes > 0
              ) {
                totalGlobalTimeSpent += timeSpent;
                totalGlobalTimedQuestions += timedQuestoes;
              }
            });
          });

          const globalAvgSeconds = totalGlobalTimedQuestions > 0
            ? (totalGlobalTimeSpent / totalGlobalTimedQuestions)
            : 0;

          const projectedTotalTimeSeconds = examQuestionsRef.current * globalAvgSeconds;

          const effectiveDays = projectDaysRef.current === 0 ? 1 : projectDaysRef.current;

          result = await runAnalysis({
            values: pureStatsData.globalHistory,
            dates: pureStatsData.globalHistory.map(h => h.date),
            meta: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            projectionDays: effectiveDays,
            forcedVolatility: regularizedSD,
            forcedBaseline: pureStatsData.bayesianMean,
            currentMean: pureStatsData.bayesianMean,
            minScore: minScoreRef.current,
            maxScore: maxScoreRef.current,
            subjects: subjectsOpts,
            projectedTotalTimeSeconds,
            examDurationMinutes: examDurationRef.current,
            flashcardImmunity: globalImmunityFactor,
            historicalCutoffs: historicalCutoffsRef.current,
            simuladoRows: rawSimuladoRowsRef.current,
            categoryNames: subjectsOpts.map(s => s.name),
            cacheKey: `${pureStatsHash}-t${projectDaysRef.current}-s${dynamicSimulationsRef.current}-tgt${debouncedTarget}`
          });
        } else {
          const subjectsOpts = pureStatsData.categoryStats.map(c => {
            const subjName = c.name || c.key || '';
            const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

            return {
              name: subjName,
              mean: c.bayesianMean ?? c.mean,
              sd: c.bayesianSd ?? c.sd,
              minCutoff: c.minCutoff || 0,
              maxScore: c.maxScore || maxScoreRef.current,
              minScore: minScoreRef.current,
              immunityFactor: immunity,
              weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
            };
          });

          const normalSD = regularizeVolatility(
            pureStatsData.pooledSD,
            0, // horizonte "hoje"
            pureStatsData.globalHistory?.length || 1,
            domain
          );

          const normalPayload = {
            mode: 'normal',
            mean: pureStatsData.bayesianMean,
            sd: normalSD,
            targetScore: debouncedTarget,
            simulations: dynamicSimulationsRef.current,
            currentMean: pureStatsData.bayesianMean,
            bayesianCI: pureStatsData.bayesianCI,
            minScore: minScoreRef.current,
            maxScore: maxScoreRef.current,
            subjects: subjectsOpts,
            flashcardImmunity: globalImmunityFactor,
            // T-014 FIX: cortes históricos também no modo normal
            historicalCutoffs: historicalCutoffsRef.current,
            simuladoRows: rawSimuladoRowsRef.current,
            categoryNames: subjectsOpts.map(s => s.name)
          };

          // Compatibilidade dupla:
          // 1) tenta API por objeto
          // 2) se não retornar probabilidade válida, tenta API posicional antiga
          result = await runAnalysis(normalPayload);

          if (!result || result.probability == null) {
            // ✅ LOTE-01 FIX: fallback síncrono com a MESMA API de objeto
            result = simulateNormalDistribution({ ...normalPayload, historicalCutoffs: historicalCutoffsRef.current });
          }
        }

        if (!cancelled) {
          if (!isMountedRef.current) return;

          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          if (isMountedRef.current) {
            setSimulationData({ status: 'ready', data: result });
          }

          try {
            const setDataFn = useAppStore.getState().setData;

            // T-015 FIX: só gravar eventos de calibração para previsões futuras.
            // Eventos do modo "hoje" não devem alimentar calibração.
            if (projectDaysRef.current > 0 && setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent({
                  timestamp: Date.now(),
                  probability: Number(result.probability) / 100,
                  targetScore: debouncedTarget,
                  sims: result.simulationCount,
                  effectiveN: result.diagnostics?.effectiveN,
                  category: 'global'
                });

                if (ev) {
                  setDataFn(contest => {
                    const evs = Array.isArray(contest.calibrationEvents) ? contest.calibrationEvents.slice() : [];
                    evs.push(ev);
                    return { ...contest, calibrationEvents: evs.slice(-200) };
                  });
                }
              }
            }
          } catch {
            // best effort
          }
        }
      } catch (err) {
        console.warn('[MC Worker] Simulation failed, using sync fallback:', err);

        if (!cancelled) {
          let result;

          const regularizedSD = isFuture && pureStatsData.globalHistory?.length > 0
            ? regularizeVolatility(
                pureStatsData.dailySD,
                projectDaysRef.current,
                pureStatsData.globalHistory.length,
                domain
              )
            : pureStatsData.dailySD;

          if (isFuture && pureStatsData.globalHistory?.length > 0) {
            const subjectsOpts = pureStatsData.categoryStats.map(c => {
              const subjName = c.name || c.key || '';
              const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.volatility ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScoreRef.current,
                minScore: minScoreRef.current,
                immunityFactor: immunity,
                weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
              };
            });

            const effectiveDays = projectDaysRef.current === 0 ? 1 : projectDaysRef.current;

            result = runMonteCarloAnalysis({
              values: pureStatsData.globalHistory,
              dates: pureStatsData.globalHistory.map(h => h.date),
              meta: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              projectionDays: effectiveDays,
              forcedVolatility: regularizedSD,
              forcedBaseline: pureStatsData.bayesianMean,
              currentMean: pureStatsData.bayesianMean,
              minScore: minScoreRef.current,
              maxScore: maxScoreRef.current,
              subjects: subjectsOpts,
              simuladoRows: rawSimuladoRowsRef.current,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor,
              historicalCutoffs: historicalCutoffsRef.current
            });
          } else {
            const subjectsOpts = pureStatsData.categoryStats.map(c => {
              const subjName = c.name || c.key || '';
              const immunity = subjectImmunityMap[(subjName || '').toLowerCase().trim()] || 1.0;

              return {
                name: subjName,
                mean: c.bayesianMean ?? c.mean,
                sd: c.bayesianSd ?? c.sd,
                minCutoff: c.minCutoff || 0,
                maxScore: c.maxScore || maxScoreRef.current,
                minScore: minScoreRef.current,
                immunityFactor: immunity,
                weight: (Number(c.weight) > 0) ? Number(c.weight) : 1
              };
            });

            result = simulateNormalDistribution({
              mean: pureStatsData.bayesianMean,
              sd: regularizeVolatility(pureStatsData.pooledSD, 0, pureStatsData.globalHistory?.length || 1, domain),
              targetScore: debouncedTarget,
              simulations: Math.min(dynamicSimulationsRef.current, 2000),
              currentMean: pureStatsData.bayesianMean,
              bayesianCI: pureStatsData.bayesianCI,
              historicalCutoffs: historicalCutoffsRef.current,
              subjects: subjectsOpts,
              minScore: minScoreRef.current,
              maxScore: maxScoreRef.current,
              simuladoRows: rawSimuladoRowsRef.current,
              categoryNames: pureStatsData.categoryStats.map(c => c.name || c.key),
              flashcardImmunity: globalImmunityFactor,
              historyLength: pureStatsData.globalHistory?.length || 0
            });
          }

          if (!isMountedRef.current) return;

          if (result) {
            result.diagnostics = {
              ...(result.diagnostics || {}),
              trendType: result.trendType || 'linear',
              rhoUsed: statsData?.estimatedRho
            };

            applyConservativeTrendCap(result);
          }

          if (isMountedRef.current) {
            setSimulationData({ status: 'ready', data: result });
          }

          try {
            const setDataFn = useAppStore.getState().setData;

            // T-015 FIX: também proteger o fallback síncrono
            if (projectDaysRef.current > 0 && setDataFn && result?.probability != null) {
              const hash = `${pureStatsHash}-${debouncedTarget}`;

              if (lastRecordedGlobalPredRef.current !== hash) {
                lastRecordedGlobalPredRef.current = hash;

                const ev = recordPredictionEvent({
                  timestamp: Date.now(),
                  probability: Number(result.probability) / 100,
                  targetScore: debouncedTarget,
                  sims: result.simulationCount,
                  effectiveN: result.diagnostics?.effectiveN,
                  category: 'global'
                });

                if (ev) {
                  setDataFn(contest => {
                    const evs = Array.isArray(contest.calibrationEvents) ? contest.calibrationEvents.slice() : [];
                    evs.push(ev);
                    return { ...contest, calibrationEvents: evs.slice(-200) };
                  });
                }
              }
            }
          } catch {
            // best effort
          }
        }
      }
    };

    const timerId = setTimeout(doAnalysis, 150);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
        // ✅ LOTE-03 FIX (A7): o efeito captura safeCategories no closure para o
        // cálculo de agilidade (timeSpent/timedQuestoes). Antes, entrava apenas
        // indiretamente via pureStatsHash — mudanças estruturais nas categorias
        // que não alterassem o hash usavam dados stale.
    }, [
        pureStatsHash,
        runAnalysis,
        debouncedTarget,
        calibrationPenalty,
        projectDays,
        effectiveSimulateToday,
        safeCategories,
        statsDataFingerprint,
        statsData?.estimatedRho
    ]);

  const probabilityData = useMemo(() => {
    const rawProbability = simulationData?.data?.probability ?? 0;

    // FIX: neutral da probabilidade deve ser 50%, não a média bayesiana da nota
    let adjustedProb = shrinkProbabilityToNeutral(rawProbability, calibrationPenalty, 50, 0.5);

    let confFactor = 0;

    if (
      simulationData?.data?.ciConformalLow != null &&
      simulationData?.data?.ciConformalHigh != null
    ) {
      const confWidth = simulationData.data.ciConformalHigh - simulationData.data.ciConformalLow;

      if (confWidth > 0) {
        // T-017 FIX: proteger domínio inválido/zero antes de dividir
        const confDomain = Math.max(1e-9, Number(maxScore) - Number(minScore));

        confFactor = Math.min(0.2, confWidth / (confDomain * 1.2)) * (1 - modelWeight);

        // FIX: shrink simétrico (tanto >50 quanto <50)
        adjustedProb = shrinkToNeutral(adjustedProb, confFactor, 50);
      }
    }

    let finalProb = adjustedProb;

    if (modelHealth > 0.7) {
      const trust = (modelHealth - 0.7) / 0.3;
      finalProb = finalProb * (1 - trust * 0.5) + (rawProbability * (1 - calibrationPenalty * 0.5)) * (trust * 0.5);
    }

    // FIX: saúde do modelo não deve mascarar risco crítico puxando tudo para 50.
    // Aplicamos apenas uma suavização leve quando a saúde está baixa.
    let healthProb = finalProb;

    if (modelHealth < 0.5) {
      const healthFactor = (0.5 - modelHealth) / 0.5;
      healthProb = shrinkToNeutral(healthProb, healthFactor * 0.15, 50);
    }

    const prob = clamp(healthProb, 0, 100);

    // FIX: expor incerteza e limites para decisão conservadora
    const uncertainty =
      ((1 - modelHealth) * 12) +
      (calibrationPenalty * 35) +
      (confFactor * 20);

    const probabilityLower = clamp(prob - uncertainty, 0, 100);
    const probabilityUpper = clamp(prob + uncertainty, 0, 100);

    const healthAdjustedProb = clamp(
      prob * modelHealth + (50 * (1 - modelHealth)),
      0,
      100
    );

    const rawProjectedMean = simulationData?.data?.projectedMean ?? simulationData?.data?.mean ?? 0;
    const pMean = clamp(rawProjectedMean, minScore, maxScore);

    const cMean = (
      pureStatsData?.bayesianMean === null ||
      pureStatsData?.bayesianMean === undefined ||
      pureStatsData?.bayesianMean === ''
    )
      ? (simulationData?.data?.currentMean ?? pMean)
      : (
          Number.isFinite(Number(pureStatsData.bayesianMean))
            ? Number(pureStatsData.bayesianMean)
            : (simulationData?.data?.currentMean ?? pMean)
        );

    return {
      probability: prob,
      probabilityLower,
      probabilityUpper,
      projectedMean: pMean,
      currentMean: cMean,
      healthAdjustedProb,
      rawProbability,
      uncertainty
    };
  }, [
    simulationData,
    pureStatsData,
    maxScore,
    minScore,
    calibrationPenalty,
    modelHealth,
    modelWeight
  ]);

  const probabilityDataResult = probabilityData;

  const probability = probabilityDataResult.probability;
  const probabilityLower = probabilityDataResult.probabilityLower;
  const probabilityUpper = probabilityDataResult.probabilityUpper;
  const projectedMean = probabilityDataResult.projectedMean;
  const currentMean = probabilityDataResult.currentMean;
  const rawProbability = probabilityDataResult.rawProbability;
  const probabilityUncertainty = probabilityDataResult.uncertainty;

  const healthAdjustedProb = probabilityDataResult.healthAdjustedProb ?? clamp(
    (probabilityDataResult.probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5))),
    0,
    100
  );

  const effectiveSimulationData = useMemo(() => {
    if (!statsData) return { status: 'waiting', missing: 'data' };

    let totalPoints = 0;
    statsData.categoryStats.forEach(cat => {
      totalPoints += cat.n || 1;
    });

    if (totalPoints < 1) return { status: 'waiting', missing: 'count', count: totalPoints };

    const base = simulationData;

    if (base?.status === 'ready' && base.data) {
      return {
        ...base,
        data: {
          ...base.data,
          calibrationSummary,
          diagnostics: {
            ...(base.data.diagnostics || {}),
            calibrationSummary,
            modelHealth,
            modelWeight
          },
          healthAdjustedProb: base.data.healthAdjustedProb ?? healthAdjustedProb,
          probabilityLower: base.data.probabilityLower ?? probabilityLower,
          probabilityUpper: base.data.probabilityUpper ?? probabilityUpper
        }
      };
    }

    return base;
  }, [
    statsData,
    simulationData,
    calibrationSummary,
    modelHealth,
    modelWeight,
    healthAdjustedProb,
    probabilityLower,
    probabilityUpper
  ]);

  const perSubjectProbs = useMemo(() => {
    // T-040 FIX: só calcular probabilidades por matéria quando o painel estiver aberto.
    // Isso evita simulações pesadas desnecessárias no primeiro render.
    if (!enablePerSubject || !statsData?.categoryStats?.length || simulationData?.status !== 'ready') return [];

    return statsData.categoryStats
      .filter(cat => cat.weight > 0)
      .map(cat => {
        const catMaxScore = Number(cat.maxScore) || maxScore;
        const catMinScore = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : minScore;

        const currentBaseline = cat.bayesianMean ?? cat.mean;

        // T-004 FIX: trend pode vir como string ('up'/'down'/'stable').
        // Converter com segurança para número antes de qualquer aritmética.
        const rawTrend = cat.trendValue ?? cat.trend ?? 0;
        const trendPer30Days = Number.isFinite(Number(rawTrend)) ? Number(rawTrend) : 0;

        const projectedDaysAmortized = LOG_DAMPING_FACTOR * Math.log(1 + projectDays / LOG_DAMPING_FACTOR);
        const dailyTrend = trendPer30Days / 30;

        let totalTrendProjection = dailyTrend * projectedDaysAmortized;

        try {
          const simHistory = cat.simuladoStats?.history || cat.history || [];

          if (Array.isArray(simHistory) && simHistory.length >= 4) {
            const nl = computeNonLinearTrend(simHistory, catMaxScore);

            if (nl && nl.logTimeFit && Math.abs(nl.slope) > 0) {
              const nlWeight = modelWeight;
              const nlProjection = nl.slope * (projectedDaysAmortized / 30);
              totalTrendProjection = totalTrendProjection * (1 - nlWeight) + nlProjection * nlWeight;
            }
          }
        } catch {
          // ignore
        }

        // FIX: reduzir projeção quando a tendência é fraca perto da incerteza
        const trendUncertainty = Number(cat.bayesianSd ?? cat.sd ?? 0);
        const trendSignificance = Math.abs(trendPer30Days) / Math.max(1e-6, trendUncertainty);

        if (trendSignificance < 0.5) {
          totalTrendProjection *= 0.5;
        }

        // T-005 FIX: limitar projeção de tendência a ±15% do domínio da disciplina.
        // Se o cálculo produzir NaN, cai para 0 (sem projeção) em vez de -15%.
        totalTrendProjection = safeClamp(
          totalTrendProjection,
          -0.15 * catMaxScore,
          0.15 * catMaxScore,
          0 // fallback neutro: nenhuma projeção de tendência
        );

        // T-005 FIX: se a soma baseline + tendência produzir NaN,
        // mantém o baseline atual em vez de despencar para catMinScore.
        const baseline = (!effectiveSimulateToday && projectDays > 0)
          ? safeClamp(
              currentBaseline + totalTrendProjection,
              catMinScore,
              catMaxScore,
              currentBaseline // fallback: permanece onde está
            )
          : currentBaseline;

        // ✅ LOTE-01 FIX: meta projetada no INTERVALO real, respeitando minScore
        const globalRange = Math.max(1e-9, Number(maxScore) - Number(minScore));
        const catRange = Math.max(1e-9, catMaxScore - catMinScore);
        const targetRatio = clamp((Number(debouncedTarget) - Number(minScore)) / globalRange, 0, 1);
        const subjectTarget = clamp(catMinScore + targetRatio * catRange, catMinScore, catMaxScore);

        const result = simulateNormalDistribution({
          mean: baseline,
          sd: cat.bayesianSd ?? cat.sd,
          targetScore: subjectTarget,   // ✅ LOTE-01 FIX
          simulations: Math.min(dynamicSimulations || 2000, 3000),
          categoryName: cat.name,
          minScore: catMinScore,
          maxScore: catMaxScore,
          simuladoRows: rawSimuladoRows,
          subjects: [{ name: cat.name }],
          historyLength: cat.n || 0,
          bayesianCI: cat.bayesianCI || null
        });

        const subjDiag = {
          ...(result.diagnostics || {}),
          trendType: result.trendType || 'linear',
          calibrationSummary,
          modelHealth,
          modelWeight
        };

        let subjProb = result.probability;
        let subjConfFactor = 0;

        if (result.ciConformalLow != null && result.ciConformalHigh != null) {
          const subjConfWidth = result.ciConformalHigh - result.ciConformalLow;

          if (subjConfWidth > 0) {
            subjConfFactor = Math.min(0.15, subjConfWidth / (catMaxScore * 1.5)) * (1 - modelWeight);

            if (modelHealth < 0.6) {
              subjConfFactor = Math.min(0.25, subjConfFactor * 1.4);
            }

            // FIX: shrink simétrico também por disciplina
            subjProb = shrinkToNeutral(subjProb, subjConfFactor, 50);
          }
        }

        if (modelHealth > 0.7) {
          const trust = (modelHealth - 0.7) / 0.3;
          subjProb = subjProb * (1 - trust * 0.4) + result.probability * (trust * 0.4);
        }

        const subjUncertainty =
          ((1 - modelHealth) * 10) +
          (calibrationPenalty * 30) +
          (subjConfFactor * 18);

        return {
          name: cat.name,
          prob: clamp(subjProb, 0, 100),
          probabilityLower: clamp(subjProb - subjUncertainty, 0, 100),
          probabilityUpper: clamp(subjProb + subjUncertainty, 0, 100),
          mean: baseline,
          trend: cat.trend,
          diagnostics: subjDiag,
          ciConformalLow: result.ciConformalLow,
          ciConformalHigh: result.ciConformalHigh,
          ciLow: result.ciConformalLow ?? result.ci95Low,
          ciHigh: result.ciConformalHigh ?? result.ci95High,
          modelHealth,
          modelWeight,
          healthAdjustedProb: clamp(
            subjProb * modelHealth + (50 * (1 - modelHealth)),
            0,
            100
          )
        };
      }); // ordem estável = ordem das categorias (idêntica nos dois gauges)
  }, [
    statsData,
    debouncedTarget,
    simulationData?.status,
    simulationData?.data,
    maxScore,
    effectiveSimulateToday,
    projectDays,
    minScore,
    modelHealth,
    modelWeight,
    rawSimuladoRows,
    calibrationSummary,
    dynamicSimulations,
    calibrationPenalty,
    // T-040 FIX: reagir à abertura/fechamento do painel de matérias
    enablePerSubject
  ]);

  useEffect(() => {
    // T-015 FIX: não gravar calibração de subjects em modo "hoje"
    if (projectDays <= 0) return;

    if (!perSubjectProbs || perSubjectProbs.length === 0 || simulationData?.status !== 'ready') return;

    try {
      const hash = `${pureStatsHash}-${debouncedTarget}`;
      if (lastRecordedSubjectPredsRef.current === hash) return;

      lastRecordedSubjectPredsRef.current = hash;

      const setDataFn = useAppStore.getState().setData;
      if (!setDataFn) return;

      perSubjectProbs.forEach(subj => {
        if (subj.prob == null) return;

        const ev = recordPredictionEvent({
          timestamp: Date.now(),
          probability: Number(subj.prob) / 100,
          targetScore: debouncedTarget,
          sims: 500,
          category: subj.name || 'subject',
          effectiveN: subj.diagnostics?.effectiveN
        });

        if (ev) {
          setDataFn(contest => {
            const evs = Array.isArray(contest.calibrationEvents)
              ? [...contest.calibrationEvents]
              : [];

            evs.push(ev);

            return {
              ...contest,
              calibrationEvents: evs.slice(-200)
            };
          });
        }
      });
    } catch {
      // ignore
    }
  }, [
    perSubjectProbs,
    debouncedTarget,
    simulationData?.status,
    pureStatsHash,
    // T-015 FIX: dependência explícita do modo futuro/hoje
    projectDays
  ]);

  const derivedMetrics = useMemo(() => {
    let sd = simulationData?.data?.sd ?? 0;
    let sdLeft = simulationData?.data?.sdLeft ?? sd;
    let sdRight = simulationData?.data?.sdRight ?? sd;

    let ci95Low = simulationData?.data?.ciConformalLow ?? simulationData?.data?.ci95Low ?? 0;
    let ci95High = simulationData?.data?.ciConformalHigh ?? simulationData?.data?.ci95High ?? 0;

    if (simulationData?.data?.ciConformalLow != null) {
      ci95Low = simulationData.data.ciConformalLow;
      ci95High = simulationData.data.ciConformalHigh;
    }

    const effectiveDrift = simulationData?.data?.diagnostics?.effectiveDriftSlope ?? (simulationData?.data?.drift / 30 || 0);

    if (calibrationPenalty > 0) {
      const ciMid = (ci95Low + ci95High) / 2;
      const ciExpand = 1 + (calibrationPenalty * 2.5);

      ci95Low = Math.max(minScore, ciMid - ((ciMid - ci95Low) * ciExpand));
      ci95High = Math.min(maxScore, ciMid + ((ci95High - ciMid) * ciExpand));

      sd = sd * (1 + calibrationPenalty * 2.5);
      sdLeft = sdLeft * (1 + calibrationPenalty * 2.5);
      sdRight = sdRight * (1 + calibrationPenalty * 2.5);
    }

    // T-017 FIX: domínio seguro para evitar divisão por zero ou negativa
    const domainWidth = Math.max(1e-9, Number(maxScore) - Number(minScore));
    const icWidth = ci95High - ci95Low;

    const saturation = Math.min(1, domainWidth > 0 ? icWidth / domainWidth : 1);
    const projectionConfidence = Math.max(0, 1 - Math.pow(saturation, 1.5));

    const pAdjusted = probability;

    // FIX: piso mínimo de volatilidade para evitar probabilidade degenerada
    // T-017 FIX: usar domínio seguro em vez de maxScore bruto
    const safeSdForTrend = Math.max(
      Number.isFinite(sd) && sd > 0 ? sd : 1,
      domainWidth * 0.02
    );

    const pTrend = normalCDF_complement((debouncedTarget - projectedMean) / safeSdForTrend) * 100;

    const nHistory = Array.isArray(statsData?.globalHistory)
      ? statsData.globalHistory.length
      : (timelineDates?.length || 0);

    const confidenceObj = getConfidenceTier({
      calibrationPenalty,
      volatility: sd,
      sampleSize: nHistory,
      maxScore: Number(maxScore) || 100
    });

    const explanations = buildHumanExplanation({
      calibrationPenalty,
      volatility: sd,
      trend: (projectedMean - currentMean),
      confidenceTier: confidenceObj.tier,
      intervalWidth: ci95High - ci95Low,
      maxScore: Number(maxScore) || 100
    });

    const driftAlerts = detectPerformanceDrift({
      recentMean: currentMean,
      baselineMean: (statsData?.bayesianMean || currentMean),
      recentVolatility: sdLeft,
      maxScore: Number(maxScore) || 100
    });

    const humanVol = humanizeVolatility(sdLeft);

    try {
      validatePrediction({
        probability: pAdjusted,
        interval: { low: ci95Low, high: ci95High },
        confidenceTier: confidenceObj.tier
      });
    } catch (e) {
      console.error('Monte Carlo Validation Error:', e);
    }

    return {
      sd,
      sdLeft,
      sdRight,
      ci95Low,
      ci95High,
      saturation,
      projectionConfidence,
      pAdjusted,
      pTrend,
      probability: pAdjusted,
      probabilityLower,
      probabilityUpper,
      rawProbability,
      probabilityUncertainty,
      confidenceTier: confidenceObj.label,
      confidenceColor: confidenceObj.tier === 'HIGH'
        ? 'text-emerald-400'
        : confidenceObj.tier === 'MEDIUM'
          ? 'text-amber-400'
          : 'text-rose-400',
      confidenceObj,
      explanations,
      humanVol,
      driftAlerts,
      ciConformalLow: simulationData?.data?.ciConformalLow,
      ciConformalHigh: simulationData?.data?.ciConformalHigh,
      trendType: simulationData?.data?.trendType || 'linear',
      calibrationSummary,
      effectiveDrift,
      modelHealth,
      modelWeight
    };
  }, [
    simulationData?.data,
    maxScore,
    minScore,
    debouncedTarget,
    projectedMean,
    calibrationPenalty,
    currentMean,
    statsData,
    timelineDates,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    probabilityUncertainty,
    calibrationSummary,
    modelHealth,
    modelWeight
  ]);

  useMonteCarloHistoryRecorder({
    activeId,
    simulationData,
    timeIndex,
    timelineDates,
    effectiveSimulateToday,
    projectDays,
    goalDate,
    debouncedTarget,
    currentMean,
    projectedMean,
    pAdjusted: derivedMetrics.pAdjusted,
    ci95Low: derivedMetrics.ci95Low,
    ci95High: derivedMetrics.ci95High,
    calibrationSummary: derivedMetrics.calibrationSummary,
    trendType: derivedMetrics.trendType,
    effectiveDrift: derivedMetrics.effectiveDrift,
    modelHealth: derivedMetrics.modelHealth,
    modelWeight: derivedMetrics.modelWeight,
    recordMonteCarloSnapshot
  });

  const memoizedStats = useMemo(() => ({
    statsData,
    simulationData: effectiveSimulationData,
    perSubjectProbs,
    projectDays,
    debouncedTarget,
    effectiveWeights,
    setWeights,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    projectedMean,
    currentMean,
    healthAdjustedProb: healthAdjustedProb ?? clamp(
      (probability || 0) * (modelHealth || 0.5) + (50 * (1 - (modelHealth || 0.5))),
      0,
      100
    ),
    ...derivedMetrics,
    equalWeightsMode,
    setEqualWeightsMode,
    calibrationPenalty,
    calibrationSummary,
    trendType: derivedMetrics.trendType || 'linear',
    effectiveDrift: derivedMetrics.effectiveDrift,
    modelHealth: derivedMetrics.modelHealth,
    modelWeight: derivedMetrics.modelWeight
  }), [
    statsData,
    effectiveSimulationData,
    perSubjectProbs,
    projectDays,
    debouncedTarget,
    effectiveWeights,
    setWeights,
    probability,
    probabilityLower,
    probabilityUpper,
    rawProbability,
    projectedMean,
    currentMean,
    healthAdjustedProb,
    derivedMetrics,
    equalWeightsMode,
    setEqualWeightsMode,
    calibrationPenalty,
    calibrationSummary,
    modelHealth
  ]);

  return useMemo(() => ({
    ...memoizedStats,
    isFlashing: false
  }), [memoizedStats]);
}

function useMonteCarloHistoryRecorder({
  activeId,
  simulationData,
  timeIndex,
  timelineDates,
  effectiveSimulateToday,
  projectDays,
  goalDate,
  debouncedTarget,
  currentMean,
  projectedMean,
  pAdjusted,
  ci95Low,
  ci95High,
  calibrationSummary,
  trendType,
  effectiveDrift,
  modelHealth,
  modelWeight,
  recordMonteCarloSnapshot
}) {
  const lastRecordTime = useRef(0);
  const lastRecordHash = useRef('');

  useEffect(() => {
    const prob = Number.isFinite(pAdjusted) ? pAdjusted : 0;
    const isTimeTraveling = timeIndex >= 0 && timeIndex < timelineDates.length - 1;

    if (
      simulationData?.status === 'ready' &&
      Number.isFinite(prob) &&
      prob >= 0 &&
      !effectiveSimulateToday &&
      !isTimeTraveling &&
      activeId
    ) {
      const doRecord = () => {
        const today = getDateKey(new Date());
        const currentProb = Number(prob.toFixed(1));

        const hash = `${activeId}-${today}-${currentProb}-${debouncedTarget.toFixed(1)}`;
        if (hash === lastRecordHash.current) return;

        const history = useAppStore.getState().appState?.contests?.[activeId]?.monteCarloHistory || [];
        const existing = Array.isArray(history) ? history.find(h => h.date === today) : null;

        const currentTarget = Number(debouncedTarget.toFixed(1));
        const existingProb = Number((existing?.probability ?? existing?.prob ?? 0).toFixed(1));
        const existingTarget = Number((existing?.target ?? 0).toFixed(1));

        const targetChanged = !existing || Math.abs(existingTarget - currentTarget) > 0.05;

        const isCICollapsed = existing && Number.isFinite(existing.mean) && Number.isFinite(existing.ci95Low)
          ? Math.abs(existing.mean - existing.ci95Low) < 0.01
          : false;

        const needsUpdate = !existing || existing.ci95Low === undefined || (isCICollapsed && projectDays > 0);
        const probChanged = existing && Math.abs(existingProb - currentProb) > 0.3;

        if (probChanged || targetChanged || needsUpdate) {
          lastRecordTime.current = Date.now();
          lastRecordHash.current = hash;

          recordMonteCarloSnapshot(today, prob, {
            mean: Number(currentMean.toFixed(2)),
            projectedMean: Number(projectedMean.toFixed(2)),
            ci95Low: Number(ci95Low.toFixed(2)),
            ci95High: Number(ci95High.toFixed(2)),
            target: Number(debouncedTarget.toFixed(2)),
            targetDate: goalDate,
            trendType: trendType || 'linear',
            effectiveDrift: Number((effectiveDrift || 0).toFixed(4)),
            calibrationBrier: calibrationSummary ? Number(calibrationSummary.avgBrier || 0).toFixed(4) : null,
            modelHealth: Number((modelHealth || 0.5).toFixed(3)),
            modelWeight: Number((modelWeight || 0.25).toFixed(3))
          });
        }
      };

      const now = Date.now();
      const timeSinceLast = now - lastRecordTime.current;

      if (timeSinceLast < 5000) {
        const timerId = setTimeout(doRecord, 5000 - timeSinceLast);
        return () => clearTimeout(timerId);
      } else {
        doRecord();
      }
    }
  }, [
    simulationData?.status,
    effectiveSimulateToday,
    recordMonteCarloSnapshot,
    timeIndex,
    timelineDates,
    currentMean,
    projectedMean,
    debouncedTarget,
    activeId,
    ci95Low,
    ci95High,
    pAdjusted,
    goalDate,
    projectDays,
    calibrationSummary,
    effectiveDrift,
    modelHealth,
    modelWeight,
    trendType
  ]);
}


```

---

### Arquivo: `src/hooks/useMonteCarloWorker.js`
*Linhas: 215 | Tamanho: 8.4 KB*

```javascript
/**
 * useMonteCarloWorker — Hook para offload Monte Carlo para Web Worker
 * 
 * Mantém o fallback síncrono se Web Workers não estiverem disponíveis.
 * Usa Vite's `?worker` import com module worker support.
 * Modificado para usar um Singleton Worker, evitando memory leaks ao renderizar
 * múltiplos gráficos/componentes que usam este hook.
 */
import { useCallback, useEffect } from 'react';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo.js';

// --- SHARED WORKER SINGLETON ---
let sharedWorker = null;
let sharedRequestId = 0;
const sharedPendingRequests = new Map();
const REQUEST_MAX_AGE_MS = 60_000;
let workerCrashCount = 0;
const MAX_WORKER_CRASHES = 3;

// Cleanup periódico para requests órfãos
let cleanupInterval = null;

export function stopCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}

function startCleanup() {
    if (cleanupInterval) return;
    // Previne vazamento de timers durante testes automatizados no Vitest / Jest
    if (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST)) {
        return;
    }
    cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [id, pending] of sharedPendingRequests) {
            if (pending.createdAt && now - pending.createdAt > REQUEST_MAX_AGE_MS) {
                clearTimeout(pending.timeoutId);
                try {
                    if (typeof pending.reject === 'function') {
                        pending.reject(new Error("A requisição expirou no worker."));
                    }
                } catch (err) {
                    console.warn('[MC Worker] Falha ao rejeitar request expirado:', err);
                }
                sharedPendingRequests.delete(id);
            }
        }
    }, 30_000);
    if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
        cleanupInterval.unref();
    }
}

function initSharedWorker() {
    if (sharedWorker) return;
    startCleanup(); // ✅ iniciar cleanup
    try {
        sharedWorker = new Worker(
            new URL('../engine/mc.worker.js', import.meta.url),
            { type: 'module' }
        );

        sharedWorker.onmessage = (e) => {
            const { id, type, result, error } = e.data;
            const pending = sharedPendingRequests.get(id);
            if (!pending) return;
            sharedPendingRequests.delete(id);
            if (type === 'error') {
                pending.reject(new Error(error));
            } else {
                workerCrashCount = 0;
                pending.resolve(result);
            }
        };

        sharedWorker.onerror = (err) => {
            console.error('[MonteCarloWorker] erro fatal:', err);
            workerCrashCount++;
            for (const [id, pending] of sharedPendingRequests.entries()) {
                try {
                    pending.reject?.(new Error(err?.message || 'Worker Monte Carlo falhou'));
                } catch (e) {
                    console.error('Failed to reject pending request:', e);
                }
                sharedPendingRequests.delete(id);
            }
            try {
                if (sharedWorker) sharedWorker.terminate();
            } catch (e) {
                console.warn('Worker terminate failed:', e);
            }
            sharedWorker = null;
            if (workerCrashCount < MAX_WORKER_CRASHES) {
                setTimeout(() => initSharedWorker(), 100);
            } else {
                console.error('[MonteCarloWorker] Limite de crashes excedido. Usando fallback síncrono.');
            }
        };
    } catch (e) {
        console.warn('[MC Worker Singleton] Not available, using main thread:', e.message);
    }
}

// Cleanup pending requests periodically if needed (optional)
// But timeouts inside the Promise will handle stale requests.

export function useMonteCarloWorker() {
    // Initialize the singleton worker on first use
    useEffect(() => {
        initSharedWorker();
        // We do NOT terminate the worker on unmount because it is shared.
        // The worker lives for the lifetime of the application.
    }, []);

    // O cleanup periódico de requests órfãos agora é feito no nível do módulo (singleton)
    
    const runAnalysis = useCallback(async (...args) => {
        if (!sharedWorker) {
            initSharedWorker();
        }

        // Fallback or initialization issue
        if (!sharedWorker) {
            // FIX APLICADO: Garantindo que o motor síncrono receba um objeto único
            if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
                if (args[0].mode === 'normal' || (args[0].mean !== undefined && !Array.isArray(args[0].values))) {
                    return simulateNormalDistribution(args[0]);
                }
                return runMonteCarloAnalysis(args[0]);
            } else {
                const options = args[3] || {};
                return simulateNormalDistribution({
                    mean: args[0] || 0,
                    sd: args[1] || 0,
                    targetScore: args[2] || 0,
                    simulations: options.simulations || 5000,
                    seed: options.seed,
                    currentMean: options.currentMean,
                    minScore: options.minScore,
                    maxScore: options.maxScore,
                    bayesianCI: options.bayesianCI,
                    historyLength: options.historyLength,
                    subjects: options.subjects,
                    historicalCutoffs: options.historicalCutoffs,
                    flashcardImmunity: options.flashcardImmunity,
                    simuladoRows: options.simuladoRows,
                    categoryNames: options.categoryNames,
                });
            }
        }

        const id = ++sharedRequestId;
        
        let payload;
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
            payload = { isObjectCall: true, input: args[0] };
        } else {
            payload = {
                isObjectCall: false,
                inputOrMean: args[0],
                pooledSD: args[1],
                targetScore: args[2],
                options: args[3] || {}
            };
        }

        return new Promise((resolve, reject) => {
            // Timeout adaptativo baseado no número de simulações
            const simCount = payload?.input?.simulations ?? payload?.options?.simulations ?? 5000;
            const timeoutMs = Math.min(30000, Math.max(10000, simCount * 3)); // 3ms/sim, cap 30s

            // Capture current worker to prevent race conditions during recycling
            const currentWorker = sharedWorker;

            const timeoutId = setTimeout(() => {
                if (sharedPendingRequests.has(id)) {
                    sharedPendingRequests.delete(id);
                    console.warn(`[MC Worker Singleton] Request ${id} timed out.`);
                    // CORRIGIDO: apenas rejeita ESTE request. Não mata o worker nem outros.
                    // O worker será reciclado naturalmente quando ocioso.
                    reject(new Error("A análise demorou muito tempo e foi interrompida para proteger a performance do sistema."));
                }
            }, timeoutMs);

            sharedPendingRequests.set(id, { 
                worker: currentWorker, // Track request owner worker instance
                timeoutId, // Guardar referência para limpeza
                createdAt: Date.now(),
                resolve: (data) => {
                    clearTimeout(timeoutId);
                    resolve(data);
                }, 
                reject: (err) => {
                    clearTimeout(timeoutId);
                    reject(err);
                }
            });
            
            try {
                currentWorker.postMessage({ type: 'runMonteCarloAnalysis', payload, id });
            } catch {
                clearTimeout(timeoutId);
                sharedPendingRequests.delete(id);
                reject(new Error(`Falha ao enviar dados para o Worker (DataCloneError). Estrutura inválida.`));
            }
        });
    }, []);

    return { runAnalysis };
}


```

---

### Arquivo: `src/hooks/usePomodoroSync.js`
*Linhas: 252 | Tamanho: 9.3 KB*

```javascript
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

const formatTime = (seconds) => {
    const secsInt = Math.ceil(Math.max(0, seconds));
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;

    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const SESSION_SCOPED_TYPES = [
    'START_SESSION',
    'PAUSE_SESSION',
    'TIMER_RESET',
    'PHASE_SKIP',
    'PHASE_COMPLETE',
    'PHASE_REWIND',
    'TARGET_CYCLES_CHANGE'
];

const MAX_TARGET_CYCLES = 20;

export function usePomodoroSync({
    syncChannel,
    STABLE_TAB_ID,
    setIsRunning,
    stateRefs,
    setTimeLeft,
    showToast,
    setSpeed,
    speedRef,
    activeSubjectRef,
    clockRef,
    setIsMuted,
    isMutedRef
}) {
    const syncPomodoroState = useAppStore(state => state.syncPomodoroState);

    useEffect(() => {
        if (!syncChannel) return;

        let isMounted = true;

        const handleMessage = (event) => {
            if (!isMounted) return;
            const data = event.data;
            // ✅ FIX: Validar estrutura da mensagem antes de processar
            if (!data || typeof data !== 'object' || !data.type) return;
            const KNOWN_TYPES = [
                'START_SESSION', 'PAUSE_SESSION', 'TIMER_RESET',
                'PHASE_SKIP', 'PHASE_COMPLETE', 'PHASE_REWIND',
                'TARGET_CYCLES_CHANGE', 'SPEED_CHANGE', 'TOGGLE_MUTE'
            ];
            if (!KNOWN_TYPES.includes(data.type)) return;

            const {
                type,
                tabId,
                taskId,
                sessionInstanceId,
                timeLeft: incomingTime,
                speed: incomingSpeed,
                targetCycles: incomingTarget
            } = data;

            if (tabId === STABLE_TAB_ID) return;


            if (SESSION_SCOPED_TYPES.includes(type)) {
                const currentTaskId = activeSubjectRef.current?.taskId ?? null;
                const currentSessionId = activeSubjectRef.current?.sessionInstanceId ?? null;

                // Se a mensagem tem taskId E nós temos taskId, devem bater
                if (taskId != null && currentTaskId != null && taskId !== currentTaskId) {
                    return;
                }
                // Se a mensagem tem sessionInstanceId E nós temos, devem bater
                if (sessionInstanceId != null && currentSessionId != null && sessionInstanceId !== currentSessionId) {
                    return;
                }
                // Se a mensagem tem sessionInstanceId mas nós NÃO temos sessão ativa, ignorar
                if (sessionInstanceId != null && currentSessionId == null) {
                    return;
                }
            }

            switch (type) {
                case 'START_SESSION': {
                    setIsRunning(true);
                    stateRefs.current.isRunning = true;

                    if (Number.isFinite(incomingTime) && incomingTime >= 0) {
                        stateRefs.current.timeLeft = incomingTime;
                        setTimeLeft(incomingTime);
                    }

                    showToast('Protocolo ativo em outra aba 🖥️', 'info');
                    break;
                }

                case 'PAUSE_SESSION': {
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;

                    if (Number.isFinite(incomingTime) && incomingTime >= 0) {
                        setTimeLeft(incomingTime);
                        stateRefs.current.timeLeft = incomingTime;
                    }
                    break;
                }

                case 'SPEED_CHANGE': {
                    const parsedSpeed = Number(incomingSpeed);

                    if ([1, 10, 100].includes(parsedSpeed)) {
                        setSpeed(parsedSpeed);
                        speedRef.current = parsedSpeed;
                    }
                    break;
                }

                case 'TARGET_CYCLES_CHANGE': {
                    if (Number.isFinite(incomingTarget)) {
                        const currentCompleted =
                            useAppStore.getState().appState?.pomodoro?.completedCycles || 0;

                        const safeTarget = Math.min(
                            MAX_TARGET_CYCLES,
                            Math.max(
                                Math.max(1, currentCompleted),
                                Math.round(Number(incomingTarget))
                            )
                        );

                        syncPomodoroState({ targetCycles: safeTarget });
                    }
                    break;
                }

                case 'TIMER_RESET':
                case 'PHASE_SKIP':
                case 'PHASE_COMPLETE':
                case 'PHASE_REWIND': {
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;

                    try {
                        const raw = localStorage.getItem('pomodoroState');
                        if (!raw) break;
                        const saved = JSON.parse(raw);
                        if (!saved || typeof saved !== 'object') break;

                        const targetMode =
                            data.toMode !== undefined && typeof data.toMode === 'string'
                                ? data.toMode
                                : (typeof saved.mode === 'string' ? saved.mode : undefined);

                        const targetTime =
                            data.timeLeft !== undefined && Number.isFinite(data.timeLeft)
                                ? data.timeLeft
                                : (Number.isFinite(saved.timeLeft) ? saved.timeLeft : undefined);

                        const savedTaskMatches =
                            saved &&
                            activeSubjectRef.current?.taskId &&
                            saved.activeTaskId === activeSubjectRef.current.taskId;

                        if (targetMode !== undefined || savedTaskMatches) {
                            const newSessions = data.sessions !== undefined ? data.sessions : saved.sessions;
                            const newCompleted = data.completedCycles !== undefined ? data.completedCycles : saved.completedCycles;
                            const newAccum = data.accumulatedMinutes !== undefined ? data.accumulatedMinutes : saved.accumulatedMinutes;
                            const newTarget = data.targetCycles !== undefined ? data.targetCycles : saved.targetCycles;

                            syncPomodoroState({
                                mode: targetMode,
                                sessions: newSessions,
                                completedCycles: newCompleted,
                                accumulatedMinutes: newAccum,
                                targetCycles: newTarget
                            });

                            if (Number.isFinite(targetTime) && targetTime >= 0) {
                                setTimeLeft(targetTime);
                                stateRefs.current.timeLeft = targetTime;
                            }

                            if (targetMode !== undefined) {
                                stateRefs.current.mode = targetMode;
                            }
                            if (newSessions !== undefined) {
                                stateRefs.current.sessions = newSessions;
                            }
                            if (newCompleted !== undefined) {
                                stateRefs.current.completedCycles = newCompleted;
                            }
                            if (newAccum !== undefined) {
                                stateRefs.current.accumulatedMinutes = newAccum;
                            }
                            if (newTarget !== undefined) {
                                stateRefs.current.targetCycles = newTarget;
                            }

                            if (clockRef.current && Number.isFinite(targetTime)) {
                                clockRef.current.textContent = formatTime(targetTime);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to sync state from localStorage:', error);
                    }

                    break;
                }

                case 'TOGGLE_MUTE': {
                    if (!isMounted) break;
                    const muted = Boolean(data.isMuted);

                    setIsMuted(muted);
                    isMutedRef.current = muted;
                    break;
                }

                default:
                    break;
            }
        };

        syncChannel.addEventListener('message', handleMessage);

        return () => {
            isMounted = false;
            syncChannel.removeEventListener('message', handleMessage);
        };
    }, [
        syncChannel,
        showToast,
        syncPomodoroState,
        STABLE_TAB_ID,
        setIsRunning,
        stateRefs,
        setTimeLeft,
        setSpeed,
        speedRef,
        activeSubjectRef,
        clockRef,
        setIsMuted,
        isMutedRef
    ]);
}


```

---

### Arquivo: `src/hooks/useSubjectAggData.js`
*Linhas: 119 | Tamanho: 5.2 KB*

```javascript
import { useMemo } from 'react';
import { toDateMs, getDateKey } from '../utils/dateHelper';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

/**
 * Filtra um histórico por janela de tempo ('30' | '60' | '90' | 'all').
 * Movido do EvolutionChart.jsx (LOTE-05).
 */
export function filterHistoryByTimeWindow(history, timeWindow) {
  const days = Number.parseInt(timeWindow, 10);
  const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
  if (timeWindow === 'all' || !Number.isFinite(days) || days <= 0) {
    return safeHistory.filter(Boolean);
  }
  const withMs = safeHistory
    .filter(Boolean)
    .map((h) => {
      const rawDate = h?.date || h?.createdAt;
      if (!rawDate) return null;
      const key = getDateKey(rawDate);
      const ms = toDateMs(key);
      return Number.isFinite(ms) ? { h, ms } : null;
    })
    .filter(Boolean);
  if (!withMs.length) return safeHistory.filter(Boolean);
  const referenceMs = toDateMs(getDateKey(new Date()));
  const limit = referenceMs - days * 24 * 60 * 60 * 1000;
  return withMs.filter((x) => x.ms >= limit).map((x) => x.h);
}

/**
 * Agregação por disciplina (questões, acertos, tempo) para os gráficos de
 * barras, radar e agilidade. Extraído do EvolutionChart.jsx (LOTE-05).
 */
export function useSubjectAggData({ categories, showOnlyFocus, focusCategory, timeWindow, maxScore, minScore }) {
  return useMemo(() => {
    if (!Array.isArray(categories) || !categories.length) return [];
    return categories
      .filter((cat) => !showOnlyFocus || cat.id === focusCategory?.id)
      .map((cat) => {
        const history = filterHistoryByTimeWindow(cat.simuladoStats?.history || [], timeWindow)
          .filter((h) => h && h.materia !== 'Simulado Personalizado');

        const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
        const safeMax = Math.max(safeMin + 1, Number(maxScore) || 100);

        const catMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : safeMin;
        const catMax = Number(cat.maxScore) > 0 ? Number(cat.maxScore) : safeMax;
        const catRange = Math.max(1e-9, catMax - catMin);

        const totalQ = history.reduce((s, h) => {
          let tot = Math.max(0, Number(h.total) || 0);
          if (tot === 0 && h.score != null) tot = getSyntheticTotal(catMax);
          const score = getSafeScore(h, catMax, catMin);
          if (!Number.isFinite(score)) return s;
          return s + tot;
        }, 0);

        const totalCorrect = Math.round(
          history.reduce((s, h) => {
            let tot = Math.max(0, Number(h.total) || 0);
            if (tot === 0 && h.score != null) tot = getSyntheticTotal(catMax);
            const rawC = Number(h.correct);
            if (!h.isPercentage && Number.isFinite(rawC)) {
              return s + Math.max(0, Math.min(tot, rawC));
            }
            const score = getSafeScore(h, catMax, catMin);
            if (!Number.isFinite(score)) return s;
            const normalizedScore = Math.max(catMin, Math.min(catMax, score));
            const derived = ((normalizedScore - catMin) / catRange) * tot;
            return s + Math.max(0, Math.min(tot, Number.isFinite(derived) ? derived : 0));
          }, 0)
        );

        const stats = history.reduce(
          (acc, h) => {
            const rootTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
            let topicsTs = 0;
            let topicsTimedQ = 0;
            let hasTopicWithTime = false;
            const safeTopics = Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {});
            if (safeTopics.length > 0) {
              for (const t of safeTopics) {
                const tTs = typeof t.timeSpent === 'number' ? t.timeSpent : null;
                const tTot = typeof t.timedQuestoes === 'number' && t.timedQuestoes > 0
                  ? t.timedQuestoes
                  : Number(t.total) || 0;
                if (tTs !== null && tTs > 0 && tTot > 0) {
                  topicsTs += tTs; topicsTimedQ += tTot; hasTopicWithTime = true;
                }
              }
            }
            if (hasTopicWithTime) return { ts: acc.ts + topicsTs, tq: acc.tq + topicsTimedQ };
            if (rootTs !== null && rootTs > 0 && Number(h.total) > 0) return { ts: acc.ts + rootTs, tq: acc.tq + Number(h.total) };
            if (rootTs !== null && rootTs > 0 && h.score != null) return { ts: acc.ts + rootTs, tq: acc.tq + getSyntheticTotal(catMax) };
            return acc;
          },
          { ts: 0, tq: 0 }
        );

        const safeName = String(cat.name || 'Sem nome');
        const shortName = safeName.length > 30 ? safeName.substring(0, 28) + '…' : safeName;
        return {
          name: shortName,
          fullName: safeName,
          questoes: totalQ,
          timedQuestoes: stats.tq,
          acertos: totalCorrect,
          timeSpent: stats.ts,
          color: cat.color,
          id: cat.id
        };
      })
      .filter((d) => d.questoes > 0)
      .sort((a, b) => b.questoes - a.questoes);
  }, [categories, showOnlyFocus, focusCategory?.id, maxScore, minScore, timeWindow]);
}


```

---

### Arquivo: `src/hooks/useSubscription.js`
*Linhas: 158 | Tamanho: 4.9 KB*

```javascript
import { useState, useEffect, useRef } from 'react';
import { db, isLocalMode } from '../services/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';

export function useSubscription(user) {
  const isDevBypass = import.meta.env.VITE_DEV_PREMIUM_BYPASS === 'true' || isLocalMode || user?.uid === 'local-user';

  const [isPremium, setIsPremium] = useState(isDevBypass);
  const [loading, setLoading] = useState(!isDevBypass);
  const fallbackUnsubRef = useRef(null);

  useEffect(() => {
    if (isDevBypass) {
        return;
    }
    
    if (!user?.uid) { 
        const t = setTimeout(() => {
            setIsPremium(false); 
            setLoading(false); 
        }, 0);
        return () => clearTimeout(t);
    }

    // Explicit bypass for admin email
    if (user?.email === 'antunest040@gmail.com') {
        const t = setTimeout(() => {
            setIsPremium(true);
            setLoading(false);
        }, 0);
        return () => clearTimeout(t);
    }
    
    let unsub = null;
    let isMounted = true;

    try {
      if (typeof user.getIdTokenResult !== 'function') {
        setTimeout(() => {
          if (!isMounted) return;
          setIsPremium(true);
          setLoading(false);
        }, 0);
        return;
      }
      // Ler claims do token JWT (definidas server-side via Cloud Functions)
      user.getIdTokenResult(true).then((tokenResult) => {
        if (!isMounted) return;
        const claims = tokenResult.claims || {};
        const isAdminClaim = Boolean(claims.admin || claims.premium || claims.plan === 'vitalicio');
        
        if (isAdminClaim) {
            setIsPremium(true);
            setLoading(false);
            return;
        }

        // Se não for admin claim, verificar pagamentos (Stripe)
        if (!db) {
            setIsPremium(false);
            setLoading(false);
            return;
        }

        const paymentsRef = collection(db, 'customers', user.uid, 'payments');
        const q = query(paymentsRef, where('status', '==', 'succeeded'));

        if (!isMounted) return;
        unsub = onSnapshot(q, (snapshot) => {
            if (!isMounted) return;
            if (snapshot.empty) {
                setIsPremium(false);
                setLoading(false);
                return;
            }

            let hasValidPayment = false;
            snapshot.forEach((paymentDoc) => {
                const data = paymentDoc.data();
                if (data.status === 'succeeded') {
                    hasValidPayment = true;
                }
            });

            setIsPremium(hasValidPayment);
            setLoading(false);
        }, (error) => {
            if (!isMounted) return;
            console.error('[Stripe] Erro ao buscar pagamentos:', error);

            if (error?.code === 'permission-denied') {
                const userRef = doc(db, 'users', user.uid);
                if (!isMounted) return;
                fallbackUnsubRef.current = onSnapshot(userRef, (userDoc) => {
                    if (!isMounted) return;
                    const profile = userDoc.exists() ? userDoc.data() : {};
                    const premiumFromProfile = Boolean(
                        profile?.isPremium
                        || profile?.premium
                        || profile?.subscription?.active,
                    );
                    setIsPremium(premiumFromProfile);
                    setLoading(false);
                }, (_profileErr) => {
                    if (!isMounted) return;
                    setIsPremium(false);
                    setLoading(false);
                });
                if (!isMounted && fallbackUnsubRef.current) {
                    fallbackUnsubRef.current();
                    fallbackUnsubRef.current = null;
                }
                return;
            }

            setIsPremium(false);
            setLoading(false);
        });

        if (!isMounted && unsub) {
            unsub();
            unsub = null;
        }

      }).catch(() => { 
          if (!isMounted) return;
          setIsPremium(false); 
          setLoading(false); 
      });
    } catch {
      setTimeout(() => {
        if (!isMounted) return;
        setIsPremium(false);
        setLoading(false);
      }, 0);
    }

    return () => { 
        isMounted = false;
        if (unsub) unsub(); 
        if (fallbackUnsubRef.current) {
            fallbackUnsubRef.current();
            fallbackUnsubRef.current = null;
        }
    };
  }, [user, isDevBypass]);

  if (isDevBypass) return { isPremium: true, loading: false };
  if (!user?.uid) return { isPremium: false, loading: false };
  if (!db) {
      console.warn('[Stripe] Firestore indisponível. Mantendo modo não premium.');
      return { isPremium: false, loading: false };
  }

  return { isPremium, loading };
}


```

---

### Arquivo: `src/hooks/useThemeSync.js`
*Linhas: 51 | Tamanho: 1.5 KB*

```javascript
import { useEffect } from 'react';

/**
 * Hook customizado para sincronizar o tema (Dark/Light/Auto) com o DOM.
 * - darkModeSetting = true  => força tema escuro (remove 'light-mode')
 * - darkModeSetting = false => força tema claro (adiciona 'light-mode')
 * - darkModeSetting = 'auto'|undefined => segue preferência do sistema
 */
export function useThemeSync(darkModeSetting) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    const media = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

    const applyTheme = () => {
      if (darkModeSetting === true) {
        root.classList.remove('light-mode');
        return;
      }

      if (darkModeSetting === false) {
        root.classList.add('light-mode');
        return;
      }

      if (media?.matches) root.classList.remove('light-mode');
      else root.classList.add('light-mode');
    };

    applyTheme();

    if (darkModeSetting === undefined || darkModeSetting === 'auto') {
      if (media?.addEventListener) {
        media.addEventListener('change', applyTheme);
        return () => media.removeEventListener('change', applyTheme);
      }

      if (media?.addListener) {
        media.addListener(applyTheme);
        return () => media.removeListener(applyTheme);
      }
    }

    return undefined;
  }, [darkModeSetting]);
}


```

---

### Arquivo: `src/hooks/useToast.js`
*Linhas: 20 | Tamanho: 0.7 KB*

```javascript
import { useCallback } from 'react';

export function useToast() {
    // Note: To implement a truly global toast without Context, 
    // it's better to store toast state in AppStore or use a dedicated pub/sub.
    // For now, this hook will dispatch custom events that a global <ToastContainer /> can listen to,
    // or return a simple alert fallback if the container isn't ready.

    const showToast = useCallback((message, type = 'info') => {
        // Dispatch a custom event so the App can render it globally
        const event = new CustomEvent('show-toast', {
            detail: { message, type }
        });
        window.dispatchEvent(event);
    }, []);

    return showToast;
}


```

---

### Arquivo: `src/services/aiQuestionService.js`
*Linhas: 247 | Tamanho: 7.6 KB*

```javascript
// 🔒 [SECURITY] Chave Gemini NUNCA deve ser usada no frontend.
// Todas as chamadas passam por um backend proxy autenticado.
// ROTA OBRIGATÓRIA: rotacione a chave Gemini atual imediatamente.

const AI_BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_BACKEND_URL) || '/api';
const AI_TIMEOUT_MS = Number(typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_TIMEOUT_MS) || 60_000;

// ✅ FIX S02: credentials deve ser 'same-origin' por padrão.
// Se o backend for cross-origin, o backend deve configurar CORS
// explicitamente e o frontend deve usar 'include' apenas quando necessário.
const isSameOrigin = (() => {
    try {
        const backendUrl = new URL(AI_BACKEND_URL, window.location.origin);
        return backendUrl.origin === window.location.origin;
    } catch {
        return false;
    }
})();

// ✅ FIX #1: Validação de URL para evitar requisições a endpoints inválidos
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return true;
  } catch {
    return false;
  }
}

export const AI_QUESTION_SCHEMA = {
  id: 'string',
  enunciado: 'string',
  alternativas: 'array de { letra: string, texto: string }',
  alternativa_correta: 'string (A, B, C, D ou E)',
  justificativa: 'string',
  materia: 'string',
  assunto: 'string',
  dificuldade: 'facil| medio| dificil| expert',
};

/**
 * Valida e sanitiza uma questão individual retornada pela IA.
 */
export function validateAIQuestion(question) {
  const VALID_LETTERS = ['A', 'B', 'C', 'D', 'E'];

  if (!question || typeof question !== 'object') return null;

  if (!question.enunciado || typeof question.enunciado !== 'string') return null;

  if (!Array.isArray(question.alternativas) || question.alternativas.length < 2) return null;

  const alternativas = question.alternativas
    .map((alt) => ({
      letra: String(alt?.letra || '').toUpperCase(),
      texto: String(alt?.texto || '').trim(),
    }))
    .filter((alt) => VALID_LETTERS.includes(alt.letra) && alt.texto.length > 0);

  const correta = String(question.alternativa_correta || '').toUpperCase();

  if (!VALID_LETTERS.includes(correta)) return null;
  if (!alternativas.some((alt) => alt.letra === correta)) return null;

  return {
    id: String(question.id || crypto.randomUUID()),
    enunciado: question.enunciado.trim(),
    alternativas,
    alternativa_correta: correta,
    justificativa: typeof question.justificativa === 'string' ? question.justificativa.trim() : '',
    materia: typeof question.materia === 'string' ? question.materia.trim() : '',
    assunto: typeof question.assunto === 'string' ? question.assunto.trim() : '',
    dificuldade: ['facil', 'medio', 'dificil', 'expert'].includes(question.dificuldade)
      ? question.dificuldade
      : 'medio',
  };
}

/**
 * Valida array de questões retornadas pela IA.
 */
export function validateAIQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map(validateAIQuestion).filter(Boolean);
}

/**
 * Gera questões via backend proxy (NUNCA usa chave Gemini no frontend).
 * O backend é responsável por autenticar com Gemini.
 */
export async function generateViaGeminiDirect({
  materia,
  assunto,
  dificuldade,
  quantidade,
  contestName,
  signal,
}) {
  // ✅ FIX #1: Validar URL antes de fazer requisição
  if (!isValidUrl(AI_BACKEND_URL)) {
    throw new Error(`URL inválida do backend de IA: ${AI_BACKEND_URL}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const handleAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', handleAbort);
    }
  }

  try {
    const response = await fetch(`${AI_BACKEND_URL}/ai/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: isSameOrigin ? 'same-origin' : 'omit',
      signal: controller.signal,
      body: JSON.stringify({ materia, assunto, dificuldade, quantidade, contestName }),
    });

    if (!response.ok) {
      throw new Error(`Backend AI retornou ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('text/json'))) {
      throw new Error(`Resposta do backend AI não é JSON: ${contentType}`);
    }

    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error(`Resposta inválida do backend AI (JSON parsing error)`);
    }
    const questions = data.questions ?? [];
    return validateAIQuestions(questions);
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', handleAbort);
    }
  }
}

/**
 * Gera questões via backend próprio (fallback quando Gemini não está disponível).
 */
export async function generateViaBackend({
  materia,
  assunto,
  dificuldade,
  quantidade,
  contestName,
  signal,
}) {
  if (!isValidUrl(AI_BACKEND_URL)) {
    throw new Error(`URL inválida do backend: ${AI_BACKEND_URL}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const handleAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', handleAbort);
    }
  }

  try {
    const response = await fetch(`${AI_BACKEND_URL}/ai/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: isSameOrigin ? 'same-origin' : 'omit',
      signal: controller.signal,
      body: JSON.stringify({ materia, assunto, dificuldade, quantidade, contestName }),
    });

    if (!response.ok) {
      throw new Error(`Backend retornou ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Resposta do backend não é JSON: ${contentType}`);
    }

    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error(`Resposta inválida do backend (JSON parsing error)`);
    }
    const questions = data.questions ?? [];
    return validateAIQuestions(questions);
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', handleAbort);
    }
  }
}

/**
 * API pública compatível com o restante do app.
 * Tenta geração direta e cai para o backend quando necessário.
 */
const allowDirectAI =
  String((typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALLOW_DIRECT_AI) || '').toLowerCase() === 'true';

export async function generateAIQuestions(params = {}) {
  const payload = params || {};

  if (allowDirectAI) {
    try {
      const direct = await generateViaGeminiDirect(payload);

      if (Array.isArray(direct) && direct.length > 0) {
        return validateAIQuestions(direct);
      }
    } catch (error) {
      console.warn('[AI] Geração direta falhou, usando backend.', error);
    }
  }

  const backend = await generateViaBackend(payload);
  return validateAIQuestions(backend || []);
}

export default {
  AI_QUESTION_SCHEMA,
  validateAIQuestion,
  validateAIQuestions,
  generateViaGeminiDirect,
  generateViaBackend,
  generateAIQuestions,
};


```

---

### Arquivo: `src/services/firebase.js`
*Linhas: 165 | Tamanho: 5.3 KB*

```javascript
// 🔒 [SECURITY] Sem fallback hardcoded para projeto real.
// Se faltar config, entra em modo local estrito.

import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    clearIndexedDbPersistence,
} from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 🛡️ [SECURITY] Sem fallback hardcoded. Se faltar config, modo local estrito.
export const hasValidFirebaseConfig = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

export const isLocalMode =
    import.meta.env.VITE_LOCAL_MODE === 'true' ||
    !hasValidFirebaseConfig;

// Só inicializa se config for válida
let app = null;
let db = null;
let auth = null;
let analytics = null;

export function getAppAnalytics(appInstance = app) {
    if (!appInstance) return null;
    return getAnalytics(appInstance);
}

if (!isLocalMode) {
    try {
        app = initializeApp(firebaseConfig);

        db = initializeFirestore(app, {
            ignoreUndefinedProperties: true,
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager(),
            }),
        });

        auth = getAuth(app);

        try {
            analytics = getAppAnalytics(app);
        } catch (err) {
            // ✅ FIX #7: Log analytics failure para observabilidade
            console.warn('[Firebase] Analytics inicialização falhou (opcional):', err.message);
        }
    } catch (err) {
        console.error('[Firebase] Falha ao inicializar. Entrando em modo local.', err);
    }
}

/**
 * Limpeza segura de persistência local do Firestore.
 * Deve ser chamada no logout para evitar vazamento entre usuários.
 */
export async function clearFirestoreCache() {
    if (!db) return;

    try {
        await clearIndexedDbPersistence(db);
    } catch (err) {
        console.warn('[Firebase] Não foi possível limpar IDB persistence:', err);
    }
}

/**
 * Logout seguro: signOut + limpeza de persistência + limpeza de storages.
 */
export async function secureLogout() {
    let signOutFailed = false;
    try {
        if (auth) await signOut(auth);
        await clearFirestoreCache();
    } catch (err) {
        console.error('[Firebase] Erro durante logout:', err);
        signOutFailed = true;
    } finally {
        // ✅ FIX N-01: Limpar TODAS as chaves relevantes, incluindo IndexedDB
        const keysToRemove = [
            'ultra-dashboard-storage',
            'ultra-sync-dirty',
            'pomodoroState',
            'focusPanelLocked',
            'pomodoroLayoutLocked',
            'ultra_local_session',
            'coach_calibration_events_v1',
            'coach_flag_optimizer_state_v1',
            'coach_causal_model_v1',
            'coach_auto_tuner_history_v1',
            'coach_evaluation_results_v1',
            'coach_model_health_v1',
            'coach_control_center_state_v1',
            'hasSeenWelcomeScreen',
            'page-has-been-force-refreshed',
            'ultra-last-activity',
            'ultra_category_tombstones',
            'pomodoroSideTab',
            'focusPanelPosition',
            'coach_active_flags_v1',
        ];
        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            } catch { /* ignore */ }
        });

        // Limpar chaves de rascunho e geração de simulado IA
        try {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith('ai_simulado_draft:') || k.startsWith('ai_simulado_generating:')) {
                    localStorage.removeItem(k);
                }
            });
            Object.keys(sessionStorage).forEach(k => {
                if (k.startsWith('ai_simulado_')) {
                    sessionStorage.removeItem(k);
                }
            });
        } catch { /* ignore */ }

        // ✅ FIX N-01: Limpar IndexedDB do app (idb-keyval)
        try {
            const { del } = await import('idb-keyval');
            await del('ultra-dashboard-storage');
        } catch (e) {
            console.warn('[Firebase] Falha ao limpar IndexedDB no logout:', e);
        }

        // ✅ FIX N-01: Limpar chaves de quarantine
        try {
            const quarantineKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('quarantine:')) quarantineKeys.push(k);
            }
            quarantineKeys.forEach(k => localStorage.removeItem(k));
        } catch { /* ignore */ }

        if (signOutFailed) {
            console.warn('[Firebase] Logout local executado, mas signOut remoto falhou.');
        }
    }
}

export { app, db, auth, analytics };


```

---

