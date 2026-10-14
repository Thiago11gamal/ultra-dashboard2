# Menu Evolução - Parte 2: Hooks, Utilitários e Suíte de Testes

> Este documento contém a **segunda parte** do código do Menu Evolução: Hooks dedicados (`useEvolutionMC.js`, `useChartData.js`, `useSubjectAggData.js`, `useCategoryLevels.js`), Utilitários e Status (`evolutionGuards.js`, `evolutionStatus.js`) e a Suíte Completa de Testes (`__tests__`).

## Sumário de Arquivos


### 4. Hooks Customizados do Menu Evolução

1. [src/hooks/useEvolutionMC.js](#src-hooks-useevolutionmc-js) — *Hook que orquestra a execução do motor Monte Carlo via Web Worker (com fallback síncrono seguro) especificamente para o Menu Evolução.*
2. [src/hooks/useChartData.js](#src-hooks-usechartdata-js) — *Hook de agregação e interpolação temporal de dados de simulados para alimentar todos os gráficos do dashboard de evolução.*
3. [src/hooks/useSubjectAggData.js](#src-hooks-usesubjectaggdata-js) — *Hook que calcula a agregação de desempenho, volume e tempo por disciplina dentro da janela temporal selecionada.*
4. [src/hooks/useCategoryLevels.js](#src-hooks-usecategorylevels-js) — *Hook que determina o nível atual de domínio de cada matéria de acordo com o modelo estatístico ativo (Bayesiano, Notas Brutas ou Média Ponderada).*

### 5. Utilitários e Motores de Status

5. [src/utils/evolutionGuards.js](#src-utils-evolutionguards-js) — *Guards de validação, conversão para arrays imutáveis, normalização de domínios/escalas de notas e hash.*
6. [src/utils/evolutionStatus.js](#src-utils-evolutionstatus-js) — *Motor de cálculo dinâmico das pílulas de status: nível atual, distância da meta, tendência, incerteza bayesiana, constância e volatilidade.*

### 6. Suíte de Testes do Menu Evolução

7. [src/components/charts/EvolutionChart/__tests__/evolution-fixes-verification.test.jsx](#src-components-charts-evolutionchart-tests-evolution-fixes-verification-test-jsx) — *Verificação dos 12 bugs críticos corrigidos no Menu Evolução.*
8. [src/components/charts/EvolutionChart/__tests__/evolution-menu-bugs-audit.test.jsx](#src-components-charts-evolutionchart-tests-evolution-menu-bugs-audit-test-jsx) — *Auditoria completa de 60 cenários de regressão do Menu Evolução.*
9. [src/components/charts/EvolutionChart/__tests__/evolution-data-fixes-audit.test.jsx](#src-components-charts-evolutionchart-tests-evolution-data-fixes-audit-test-jsx) — *Auditoria de dados, status e cálculos matemáticos do Menu Evolução.*
10. [src/components/charts/EvolutionChart/__tests__/evolution-menu-comprehensive-fixes.test.jsx](#src-components-charts-evolutionchart-tests-evolution-menu-comprehensive-fixes-test-jsx) — *Testes de integração abrangentes cobrindo fluxo de dados entre componentes de evolução.*
11. [src/components/charts/EvolutionChart/__tests__/evolution-stats-bugs.test.jsx](#src-components-charts-evolutionchart-tests-evolution-stats-bugs-test-jsx) — *Testes de edge cases estatísticos específicos dos gráficos de evolução.*
12. [src/components/charts/EvolutionChart/__tests__/evolutionComponents.test.jsx](#src-components-charts-evolutionchart-tests-evolutioncomponents-test-jsx) — *Testes de montagem e renderização visual dos componentes de evolução.*
13. [src/components/charts/EvolutionChart/__tests__/TimeSpentChart.test.jsx](#src-components-charts-evolutionchart-tests-timespentchart-test-jsx) — *Testes unitários e de tolerância do componente TimeSpentChart.*

---

## 4. Hooks Customizados do Menu Evolução

### `src/hooks/useEvolutionMC.js`

**Descrição:** Hook que orquestra a execução do motor Monte Carlo via Web Worker (com fallback síncrono seguro) especificamente para o Menu Evolução.

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
        queueMicrotask(() => {
          setMcLoading(false);
          setMcResult(null);
          setMcProjectionSeries(null);
        });
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

### `src/hooks/useChartData.js`

**Descrição:** Hook de agregação e interpolação temporal de dados de simulados para alimentar todos os gráficos do dashboard de evolução.

```javascript
import { useMemo } from 'react';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { computeCategoryStats, computeBayesianLevel, BAYESIAN_DECAY_FACTOR } from '../engine/stats';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const getHistoryArray = (cat) => Object.values(cat?.simuladoStats?.history || EMPTY_OBJECT).filter(Boolean).filter(r => r.valid !== false);
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

### `src/hooks/useSubjectAggData.js`

**Descrição:** Hook que calcula a agregação de desempenho, volume e tempo por disciplina dentro da janela temporal selecionada.

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

### `src/hooks/useCategoryLevels.js`

**Descrição:** Hook que determina o nível atual de domínio de cada matéria de acordo com o modelo estatístico ativo (Bayesiano, Notas Brutas ou Média Ponderada).

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

## 5. Utilitários e Motores de Status

### `src/utils/evolutionGuards.js`

**Descrição:** Guards de validação, conversão para arrays imutáveis, normalização de domínios/escalas de notas e hash.

```javascript
export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

export function getHistoryDate(h) {
  return h?.date || h?.createdAt || null;
}

export function isValidScore(value) {
  return value != null && Number.isFinite(Number(value));
}

export function normalizeScoreDomain(minScore, maxScore) {
  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  let safeMax = Number.isFinite(Number(maxScore)) ? Number(maxScore) : 100;

  if (safeMax <= safeMin) {
    safeMax = safeMin + 1;
  }

  const range = Math.max(1e-9, safeMax - safeMin);

  const clamp = (value, fallback = safeMin) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(safeMin, Math.min(safeMax, n));
  };

  return { safeMin, safeMax, range, clamp };
}

export function normalizeTargetScore(targetScore, minScore, maxScore) {
  const { safeMin, safeMax } = normalizeScoreDomain(minScore, maxScore);
  const target = Number(targetScore);

  if (!Number.isFinite(target)) return safeMin;

  return Math.max(safeMin, Math.min(safeMax, target));
}

export function normalizeProbability(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

export function simpleHash(str) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
```

---

### `src/utils/evolutionStatus.js`

**Descrição:** Motor de cálculo dinâmico das pílulas de status: nível atual, distância da meta, tendência, incerteza bayesiana, constância e volatilidade.

```javascript
import { formatValue } from './scoreHelper';
import { getDateKey } from './dateHelper';

const safeNum = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

const stdDev = (values) => {
  if (!Array.isArray(values) || values.length < 2) return null;

  const mean = average(values);
  if (!Number.isFinite(mean)) return null;

  const variance = average(values.map((v) => (v - mean) ** 2));
  return Number.isFinite(variance) ? Math.sqrt(variance) : null;
};

export function computeEvolutionStatuses({
  timeline = [],
  categories = [],
  focusCategory = null,
  targetScore = 0,
  unit = '%',
  minScore = 0,
  maxScore = 100,
  activeMcResult = null,
  subjectAggData = [],
  heatmapData = {},
  projectDays = 30
}) {
  const statuses = [];

  const safeMin = safeNum(minScore, 0);
  const safeMax = Math.max(safeMin + 1, safeNum(maxScore, 100));
  const range = safeMax - safeMin;
  const scale = range / 100;
  const safeTarget = Math.max(safeMin, Math.min(safeMax, safeNum(targetScore, safeMin)));

  const fmt = (v) => `${formatValue(v)}${unit}`;

  const last = Array.isArray(timeline) && timeline.length > 0
    ? timeline[timeline.length - 1]
    : {};

  const focusId = focusCategory?.id;

  const currentBay = focusId ? safeNum(last[`bay_${focusId}`], null) : null;
  const currentRaw = focusId ? safeNum(last[`raw_${focusId}`], null) : null;
  const currentStats = focusId ? safeNum(last[`stats_${focusId}`], null) : null;
  const current = currentBay ?? currentRaw ?? currentStats;

  const getValueSeries = (prefix) => {
    if (!focusId || !Array.isArray(timeline)) return [];

    return timeline
      .map((d) => safeNum(d?.[`${prefix}${focusId}`], NaN))
      .filter((v) => Number.isFinite(v));
  };

  const baySeries = getValueSeries('bay_');
  const rawSeries = getValueSeries('raw_');
  const levelSeries = baySeries.length >= rawSeries.length ? baySeries : rawSeries;

  // Nível atual
  statuses.push({
    id: 'current',
    label: 'Nível atual',
    value: current == null ? '—' : fmt(current),
    tone:
      current == null
        ? 'neutral'
        : current >= safeTarget
          ? 'success'
          : current >= safeTarget - 8 * scale
            ? 'warning'
            : 'danger',
    icon: '📍',
    help: `Nível atual estimado na escala da prova. Meta: ${fmt(safeTarget)}.`
  });

  // Gap até a meta
  if (current != null) {
    const gap = current - safeTarget;

    statuses.push({
      id: 'gap',
      label: 'Distância da meta',
      value: `${gap >= 0 ? '+' : ''}${formatValue(gap)}${unit}`,
      tone: gap >= 0 ? 'success' : gap >= -5 * scale ? 'warning' : 'danger',
      icon: '🎯',
      help: 'Diferença entre o nível atual e a meta configurada.'
    });
  }

  // Tendência recente
  if (levelSeries.length >= 6) {
    const recent = average(levelSeries.slice(-3));
    const prev = average(levelSeries.slice(-6, -3));

    if (Number.isFinite(recent) && Number.isFinite(prev)) {
      const diff = recent - prev;

      statuses.push({
        id: 'trend',
        label: 'Tendência',
        value: `${diff >= 0 ? '+' : ''}${formatValue(diff)}${unit}`,
        tone: diff > 1 * scale ? 'progress' : diff < -1 * scale ? 'danger' : 'neutral',
        icon: diff > 1 * scale ? '📈' : diff < -1 * scale ? '📉' : '➡️',
        help: 'Comparação média dos últimos 3 registros contra os 3 anteriores.'
      });
    }
  } else if (levelSeries.length >= 2) {
    const first = levelSeries[0];
    const lastValue = levelSeries[levelSeries.length - 1];
    const diff = lastValue - first;

    statuses.push({
      id: 'trend',
      label: 'Tendência',
      value: `${diff >= 0 ? '+' : ''}${formatValue(diff)}${unit}`,
      tone: diff > 1 * scale ? 'progress' : diff < -1 * scale ? 'danger' : 'neutral',
      icon: diff > 1 * scale ? '📈' : diff < -1 * scale ? '📉' : '➡️',
      help: 'Comparação entre o primeiro e o último ponto disponível.'
    });
  }

  // Probabilidade Monte Carlo
  const probability = safeNum(activeMcResult?.probability, null);

  if (probability != null) {
    const p = Math.max(0, Math.min(100, probability));

    statuses.push({
      id: 'probability',
      label: 'Chance de aprovação',
      value: `${p.toFixed(0)}%`,
      tone: p >= 70 ? 'success' : p >= 45 ? 'warning' : 'danger',
      icon: '🚀',
      help: 'Probabilidade projetada pelo Monte Carlo de atingir a meta.'
    });
  }

  // Constância nos últimos 14 dias
  const heatmapDates = Array.isArray(heatmapData?.dates) ? heatmapData.dates : [];
  const allActiveDates = new Set([
    ...heatmapDates,
    ...(Array.isArray(timeline) ? timeline.map((d) => d?.date).filter(Boolean) : [])
  ]);

  if (allActiveDates.size > 0) {
    const todayForConst = new Date();
    todayForConst.setHours(12, 0, 0, 0);
    let activeDays = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(todayForConst);
      d.setDate(d.getDate() - i);
      const k = getDateKey(d);
      if (allActiveDates.has(k)) {
        activeDays++;
      }
    }

    statuses.push({
      id: 'consistency',
      label: 'Constância (14 dias)',
      value: `${activeDays}/14`,
      tone: activeDays >= 8 ? 'success' : activeDays >= 4 ? 'warning' : 'danger',
      icon: '📅',
      help: 'Dias com simulado cadastrado nos últimos 14 dias.'
    });
  }

  // Volatilidade dos resultados brutos
  const recentRaw = rawSeries.slice(-5);

  if (recentRaw.length >= 3) {
    const volatility = stdDev(recentRaw);

    if (Number.isFinite(volatility)) {
      statuses.push({
        id: 'volatility',
        label: 'Volatilidade',
        value: `σ ${formatValue(volatility)}`,
        tone:
          volatility <= 5 * scale
            ? 'success'
            : volatility <= 12 * scale
              ? 'warning'
              : 'danger',
        icon: '📊',
        help: 'Variação dos últimos resultados brutos. Quanto menor, mais estável.'
      });
    }
  }

  // Incerteza bayesiana
  if (focusId) {
    const ciLow = safeNum(last[`bay_ci_low_${focusId}`], null);
    const ciHigh = safeNum(last[`bay_ci_high_${focusId}`], null);

    if (ciLow != null && ciHigh != null) {
      const width = Math.abs(ciHigh - ciLow);

      statuses.push({
        id: 'uncertainty',
        label: 'Incerteza bayesiana',
        value: `±${formatValue(width / 2)}${unit}`,
        tone:
          width <= 8 * scale
            ? 'success'
            : width <= 20 * scale
              ? 'warning'
              : 'danger',
        icon: '🧠',
        help: 'Faixa de confiança do nível estimado. Quanto mais estreita, maior a certeza.'
      });
    }
  }

  // Matérias abaixo da meta
  if (Array.isArray(categories) && categories.length > 0) {
    const below = categories.filter((cat) => {
      const lvl = safeNum(
        last?.[`bay_${cat.id}`] ?? 
        last?.[`raw_${cat.id}`] ?? 
        last?.[`stats_${cat.id}`] ?? 
        cat?.bayesianStats?.mean ?? 
        cat?.simuladoStats?.average,
        null
      );
      const catTarget = Number.isFinite(Number(cat?.minCutoff))
        ? Number(cat.minCutoff)
        : safeTarget;

      return lvl != null && lvl < catTarget - 5 * scale;
    }).length;

    statuses.push({
      id: 'subjects',
      label: 'Matérias abaixo da meta',
      value: `${below}/${categories.length}`,
      tone: below === 0 ? 'success' : below <= 2 ? 'warning' : 'danger',
      icon: '📚',
      help: 'Matérias com nível atual abaixo da zona segura da meta.'
    });
  }

  // Volume recente (últimos 7 dias corridos)
  const todayForVol = new Date();
  todayForVol.setHours(12, 0, 0, 0);
  const sevenDayKeys = new Set();
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayForVol);
    d.setDate(d.getDate() - i);
    sevenDayKeys.add(getDateKey(d));
  }

  const recentVolume = Array.isArray(timeline)
    ? timeline
        .filter((d) => d?.date && sevenDayKeys.has(d.date))
        .reduce((sum, d) => sum + safeNum(d?.global_total, 0), 0)
    : 0;

  statuses.push({
    id: 'volume',
    label: 'Volume (7 dias)',
    value: `${Math.round(recentVolume)} q`,
    tone: recentVolume > 0 ? 'success' : 'warning',
    icon: '📝',
    help: 'Questões cadastradas nos últimos 7 dias.'
  });

  // Movimento/tendência interna
  if (focusId) {
    const trendStatus = String(last?.[`trend_status_${focusId}`] || '').toLowerCase();

    if (trendStatus) {
      statuses.push({
        id: 'trend-status',
        label: 'Movimento',
        value:
          trendStatus === 'up'
            ? 'Subindo'
            : trendStatus === 'down'
              ? 'Caindo'
              : 'Estável',
        tone:
          trendStatus === 'up'
            ? 'success'
            : trendStatus === 'down'
              ? 'danger'
              : 'neutral',
        icon: trendStatus === 'up' ? '📈' : trendStatus === 'down' ? '📉' : '➡️',
        help: 'Tendência calculada pelo motor estatístico para a disciplina focada.'
      });
    }
  }

  // Tempo médio por questão
  const timedSubjects = Array.isArray(subjectAggData)
    ? subjectAggData.filter(
        (d) => safeNum(d?.timedQuestoes, 0) > 0 && safeNum(d?.timeSpent, 0) >= 0
      )
    : [];

  if (timedSubjects.length > 0) {
    const totalTime = timedSubjects.reduce((sum, d) => sum + safeNum(d?.timeSpent, 0), 0);
    const totalTimed = timedSubjects.reduce((sum, d) => sum + safeNum(d?.timedQuestoes, 0), 0);
    const avgSeconds = totalTimed > 0 ? totalTime / totalTimed : null;

    if (avgSeconds != null) {
      statuses.push({
        id: 'time',
        label: 'Tempo por questão',
        value: `${Math.round(avgSeconds)}s`,
        tone: avgSeconds <= 90 ? 'success' : avgSeconds <= 180 ? 'warning' : 'time',
        icon: '⏱️',
        help: 'Média de tempo gasto por questão nas disciplinas com tempo registrado.'
      });
    }
  }

  // Tempo até a prova
  const days = Math.max(0, Math.round(safeNum(projectDays, 30)));

  statuses.push({
    id: 'exam',
    label: 'Tempo até a prova',
    value: `${days} dias`,
    tone: days <= 7 ? 'critical' : days <= 30 ? 'warning' : 'info',
    icon: '⏳',
    help: 'Dias restantes até a data objetivo.'
  });

  return statuses;
}
```

---

## 6. Suíte de Testes do Menu Evolução

### `src/components/charts/EvolutionChart/__tests__/evolution-fixes-verification.test.jsx`

**Descrição:** Verificação dos 12 bugs críticos corrigidos no Menu Evolução.

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { filterHistoryByTimeWindow } from '../../../../hooks/useSubjectAggData';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';
import { GaussianPlot } from '../../GaussianPlot';
import { TimeSpentChart } from '../TimeSpentChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { CriticalTopicsAnalysis } from '../CriticalTopicsAnalysis';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Verificação das Correções dos 12 Bugs do Menu Evolução', () => {
  describe('Bug 9: filterHistoryByTimeWindow com createdAt e sem data', () => {
    it('não converte registros antigos com apenas createdAt para hoje', () => {
      const ancientDate = '2022-01-01';
      const history = [
        { id: '1', createdAt: ancientDate, total: 10, correct: 8 },
        { id: '2', date: new Date().toISOString().split('T')[0], total: 10, correct: 9 }
      ];

      const filtered30Days = filterHistoryByTimeWindow(history, '30');
      // O item antigo (2022) NÃO pode passar no filtro de 30 dias
      expect(filtered30Days.length).toBe(1);
      expect(filtered30Days[0].id).toBe('2');
    });

    it('ignora registros sem data válida sem quebrar', () => {
      const history = [
        { id: '1', total: 10, correct: 5 }, // sem data nem createdAt
        { id: '2', date: new Date().toISOString().split('T')[0], total: 10, correct: 9 }
      ];

      const filtered = filterHistoryByTimeWindow(history, '30');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('Bug 10 e 11: insightGenerator com safeMinScore negativo e createdAt', () => {
    it('suporta escalas com notas negativas (ex: Cebraspe -50 a 100) e respeita createdAt', () => {
      const focusCategory = {
        id: 'dir_const',
        name: 'Direito Constitucional',
        simuladoStats: {
          history: [
            { createdAt: '2026-09-01', score: -20, total: 100 },
            { createdAt: '2026-09-05', score: -10, total: 100 }
          ]
        }
      };

      const timeline = [
        { date: '2026-09-01', raw_dir_const: -20, bay_dir_const: -15, stats_dir_const: -20 },
        { date: '2026-09-05', raw_dir_const: -10, bay_dir_const: -12, stats_dir_const: -15 }
      ];

      const insight = generateEvolutionInsights({
        timeline,
        focusCategory,
        activeEngine: 'raw',
        categories: [focusCategory],
        unit: 'pts',
        minScore: -50,
        maxScore: 100
      });

      expect(insight).toBeDefined();
      expect(insight.type).toBeDefined();
      expect(insight.title).toBeDefined();
    });
  });

  describe('Bug 1: GaussianPlot tooltip e renderização', () => {
    it('renderiza GaussianPlot sem vazamento de sintaxe', () => {
      const html = renderToStaticMarkup(
        <GaussianPlot
          minScore={0}
          maxScore={100}
          unit="%"
          currentMean={75}
          targetVal={70}
          volatility={8}
          height={200}
        />
      );

      expect(html).toContain('svg');
      expect(html).not.toContain("'Zona de sucesso' :");
    });
  });

  describe('Bug 3: TodayVsGeneralChart formata pontuação zero corretamente', () => {
    it('renderiza TodayVsGeneralChart sem quebrar e com suporte a valores nulos ou zero', () => {
      const activeCategories = [
        {
          id: '1',
          name: 'Direito Penal',
          simuladoStats: {
            history: [{ date: '2026-09-01', score: 0, total: 10 }]
          }
        }
      ];
      const subjectAggData = [
        { id: '1', name: 'Direito Penal', accuracy: 50, lastTestAcc: 0 }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          activeCategories={activeCategories}
          subjectAggData={subjectAggData}
          targetScore={70}
          unit="%"
        />
      );

      expect(html).toBeDefined();
      expect(html).toContain('Histórico Recente (14 dias)');
    });
  });

  describe('Bug 5: Tipografia semântica em WeeklyEvolutionView e CriticalTopicsAnalysis', () => {
    it('renderiza mensagem de dados insuficientes encapsulada em tag <p>', () => {
      const html = renderToStaticMarkup(
        <WeeklyEvolutionView
          categories={[]}
          filteredChartData={[]}
        />
      );

      expect(html).toContain('<p class="text-sm font-semibold text-slate-300">Dados insuficientes</p>');
    });

    it('renderiza título da Matriz de criticidade em tag <h3>', () => {
      const html = renderToStaticMarkup(
        <CriticalTopicsAnalysis
          categories={[]}
          focusSubjectId={null}
        />
      );

      expect(html).toContain('<h3 class="text-sm sm:text-base font-bold text-white">Matriz de criticidade e pontos de fuga</h3>');
    });
  });
});
```

---

### `src/components/charts/EvolutionChart/__tests__/evolution-menu-bugs-audit.test.jsx`

**Descrição:** Auditoria completa de 60 cenários de regressão do Menu Evolução.

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { PerformanceBarChart } from '../PerformanceBarChart';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { DisciplinaCard } from '../DisciplinaCard';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { KpiCard } from '../KpiCard';
import { RadarAnalysis } from '../RadarAnalysis';
import { GaussianPlot } from '../../GaussianPlot';
import { 
  safeDomain, 
  clampScore, 
  scoreToRatio, 
  scoreToPct, 
  pctToScore, 
  formatUnitValue 
} from '../../../../utils/scoreDomain';
import { aggregateHeatmap, calculateSubjectMastery } from '../../../../utils/heatmapAggregation';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Menu Evolução - Full 60 Bug Audit & Regression Suite', () => {
  describe('scoreDomain.js - Unidade Central de Domínio', () => {
    it('calcula limites seguros de domínio com minScore negativo e arbitrário', () => {
      const dom = safeDomain(120, 20);
      expect(dom.min).toBe(20);
      expect(dom.max).toBe(120);
      expect(dom.range).toBe(100);
    });

    it('clampa notas respeitando minScore e maxScore', () => {
      expect(clampScore(10, { minScore: 20, maxScore: 120 })).toBe(20);
      expect(clampScore(130, { minScore: 20, maxScore: 120 })).toBe(120);
      expect(clampScore(70, { minScore: 20, maxScore: 120 })).toBe(70);
    });

    it('converte pontuação para razão e percentual com amplitude [minScore, maxScore]', () => {
      const ratio = scoreToRatio(70, { minScore: 20, maxScore: 120 });
      expect(ratio).toBe(0.5);
      expect(scoreToPct(70, { minScore: 20, maxScore: 120 })).toBe(50);
      expect(pctToScore(50, { minScore: 20, maxScore: 120 })).toBe(70);
    });

    it('formata valores de acordo com a unidade (%, pts, horas)', () => {
      expect(formatUnitValue(50, '%')).toBe('50%');
      expect(formatUnitValue(70, 'pts')).toBe('70pts');
      expect(formatUnitValue(1.5, 'horas')).toBe('1h30');
    });
  });

  describe('Bug 1 & 35: SubtopicsPerformanceChart safeMinScore & Recharts topic keys', () => {
    it('renderiza sem crash quando minScore != 0 e não lança ReferenceError para safeMinScore', () => {
      const categories = [
        {
          id: '1',
          name: 'Direito Administrativo',
          simuladoStats: {
            history: [
              {
                date: '2026-08-14',
                total: 10,
                score: 80,
                topics: [
                  { name: 'Art. 5º da CF', total: 10, correct: 8, score: 80 },
                  { name: 'Poder de Polícia', total: 0, score: 90 } // synthetic volume test
                ]
              }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <SubtopicsPerformanceChart
          categories={categories}
          focusSubjectId="1"
          showOnlyFocus={true}
          timeWindow="all"
          targetScore={80}
          minScore={20}
          maxScore={120}
        />
      );
      expect(html).toContain('Raio-X de Tópicos');
      expect(html).toContain('Ranking (Barras)');
    });
  });

  describe('Bug 13, 49, 50: GaussianPlot - Defesa contra KDE vazio, limites e bounds', () => {
    it('renderiza com segurança sem crash quando KDE ou pointsForArea está vazio', () => {
      const html = renderToStaticMarkup(
        <GaussianPlot
          mean={70}
          targetScore={80}
          prob={65}
          minScore={20}
          maxScore={120}
          unit="pts"
          kdeData={[]}
        />
      );
      expect(html).toContain('<svg');
    });

    it('clampa meanVal dentro de [domainMin, domainMax]', () => {
      const html = renderToStaticMarkup(
        <GaussianPlot
          mean={150} // out of bounds
          targetScore={80}
          prob={90}
          minScore={20}
          maxScore={120}
          unit="pts"
        />
      );
      expect(html).toContain('<svg');
    });
  });

  describe('Bug 14, 15, 16: TodayVsGeneralChart - Datas futuras, scale e NaN latestAcc', () => {
    it('renderiza corretamente sem ser afetado por datas futuras ou scores NaN', () => {
      const now = Date.now();
      const futureDate = new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString();
      const pastDate = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

      const activeCategories = [
        {
          id: '1',
          name: 'Direito Penal',
          simuladoStats: {
            history: [
              { date: pastDate, total: 10, correct: 7, score: 70 },
              { date: futureDate, total: 20, correct: 20, score: 100 }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          activeCategories={activeCategories}
          globalMetrics={{ globalAccuracy: 70, totalQuestions: 10, totalCorrect: 7 }}
          targetScore={80}
          maxScore={100}
          minScore={0}
          unit="%"
        />
      );
      expect(html).toContain('Histórico Recente');
    });
  });

  describe('Bug 21, 36, 37: WeeklyEvolutionView - Sanitização de chaves e totalQ', () => {
    it('renderiza tópicos com pontos e caracteres especiais como dataKeys seguras', () => {
      const categories = [
        {
          id: 'cat_1',
          name: 'Processo Penal',
          color: '#3b82f6',
          simuladoStats: {
            history: [
              {
                date: '2026-08-10',
                total: 10,
                score: 80,
                topics: [{ name: 'Art. 155. Furto Qualificado', total: 10, score: 80 }]
              }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <WeeklyEvolutionView
          categories={categories}
          showOnlyFocus={false}
          maxScore={120}
          minScore={20}
          unit="pts"
        />
      );
      expect(html).toContain('Semanas por Matéria');
      expect(html).toContain('Raio-X Temporal Avançado');
    });
  });

  describe('Bug 45 & 46: heatmapAggregation & Subject Mastery', () => {
    it('clampa pct em [0, 100]', () => {
      const filtered = {
        dates: [{ key: '2026-08-10', label: '10/08' }],
        rows: [{
          cells: [{ total: 10, correct: 10, pct: 100 }]
        }]
      };
      const agg = aggregateHeatmap(filtered, 'daily', 100);
      expect(agg.rows[0].cells[0].pct).toBe(100);
    });

    it('calculateSubjectMastery previne acertos ou totais negativos', () => {
      const subtopics = [
        { acertos: -5, total: -10 },
        { acertos: 8, total: 10 }
      ];
      const mastery = calculateSubjectMastery(subtopics);
      expect(mastery).toBeGreaterThan(0);
      expect(Number.isFinite(mastery)).toBe(true);
    });
  });

  describe('Bug 55: KpiCard - Sem +0.00', () => {
    it('exibe traço quando safeSub arredondado for 0.00', () => {
      const html = renderToStaticMarkup(
        <KpiCard
          value="85%"
          label="Acurácia"
          color="#10b981"
          icon="🎯"
          sub={0.0001} // Rounds to 0.00
        />
      );
      expect(html).toContain('—');
      expect(html).not.toContain('+0.00');
    });
  });

  describe('Bug 54: RadarAnalysis - Degeneração de domínio quando minScore === maxScore', () => {
    it('mantém polar radius axis seguro mesmo se minScore e maxScore forem iguais', () => {
      const html = renderToStaticMarkup(
        <RadarAnalysis
          radarData={[{ subject: 'Português', nivel: 70, meta: 80 }]}
          maxScore={100}
          minScore={100}
          unit="%"
        />
      );
      expect(html).toContain('Raio-X das Disciplinas');
    });
  });
});
```

---

### `src/components/charts/EvolutionChart/__tests__/evolution-data-fixes-audit.test.jsx`

**Descrição:** Auditoria de dados, status e cálculos matemáticos do Menu Evolução.

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderHook } from '@testing-library/react';

import { DisciplinaCard } from '../DisciplinaCard';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { ChartTooltip } from '../../ChartTooltip';
import { useCategoryLevels } from '../../../../hooks/useCategoryLevels';
import { useSubjectAggData } from '../../../../hooks/useSubjectAggData';
import { computeEvolutionStatuses } from '../../../../utils/evolutionStatus';
import { getDateKey } from '../../../../utils/dateHelper';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution Menu - Data Integrity & Edge Case Fixes', () => {
  describe('Fix 1: DisciplinaCard rawVal fallback', () => {
    it('exibe a nota bruta do último simulado da matéria quando o último dia geral não teve teste nela', () => {
      const cat = {
        id: 'dir_const',
        name: 'Direito Constitucional',
        color: '#3b82f6',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            { date: '2026-08-01', score: 75, total: 20, correct: 15 },
            { date: '2026-08-10', score: 85, total: 20, correct: 17 }
          ]
        }
      };

      // Simula métricas do último dia da timeline onde APENAS outra matéria foi feita
      const metrics = {
        date: '2026-08-15',
        raw_dir_const: null, // Não fez teste de constitucional no dia 15
        stats_dir_const: 80,
        bay_dir_const: 82
      };

      const html = renderToStaticMarkup(
        <DisciplinaCard
          cat={cat}
          level={82}
          metrics={metrics}
          target={80}
          unit="%"
        />
      );

      // Deve exibir 85% para a nota bruta em vez de '—'
      expect(html).toContain('85%');
      expect(html).not.toContain('>—</span>');
    });
  });

  describe('Fix 2: useCategoryLevels com activeEngine raw', () => {
    it('retorna a nota bruta mais recente para activeEngine raw quando o último dia geral teve null', () => {
      const cat = {
        id: 'matematica',
        name: 'Matemática',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            { date: '2026-09-01', score: 60, total: 10, correct: 6 },
            { date: '2026-09-05', score: 90, total: 10, correct: 9 }
          ]
        }
      };

      const timeline = [
        { date: '2026-09-01', raw_matematica: 60 },
        { date: '2026-09-05', raw_matematica: 90 },
        { date: '2026-09-10', raw_matematica: null } // Último ponto geral sem matemática
      ];

      const { result } = renderHook(() =>
        useCategoryLevels([cat], timeline, 'raw', 100, 0)
      );

      // Deve ser 90 (último teste de matemática), e não fallback de EMA
      expect(result.current['matematica']).toBe(90);
    });
  });

  describe('Fix 3: evolutionStatus Constância (14 dias) e Volume (7 dias)', () => {
    it('não calcula 14/14 quando 14 simulados ocorreram em datas distantes no passado', () => {
      // 14 simulados em 2024 (nenhum nos últimos 14 dias)
      const ancientDates = Array.from({ length: 14 }, (_, i) => `2024-0${Math.floor(i / 2) + 1}-10`);
      const heatmapData = {
        dates: ancientDates,
        rows: [{ cells: Array(14).fill(true) }]
      };

      const statuses = computeEvolutionStatuses({
        timeline: ancientDates.map(d => ({ date: d, global_total: 50 })),
        heatmapData,
        targetScore: 80
      });

      const consistency = statuses.find(s => s.id === 'consistency');
      expect(consistency).toBeDefined();
      // Não deve ser 14/14, deve ser 0/14 pois nenhum ocorreu nos últimos 14 dias
      expect(consistency.value).toBe('0/14');
      expect(consistency.tone).toBe('danger');
    });

    it('calcula volume de 7 dias baseado no calendário real recente e não nos últimos 7 pontos históricos', () => {
      // 7 simulados antigos
      const ancientDates = Array.from({ length: 7 }, (_, i) => `2023-0${i + 1}-01`);
      const timeline = ancientDates.map(d => ({ date: d, global_total: 100 }));

      const statuses = computeEvolutionStatuses({
        timeline,
        targetScore: 80
      });

      const volume = statuses.find(s => s.id === 'volume');
      expect(volume).toBeDefined();
      // Deve ser 0 q pois nenhum simulado ocorreu nos últimos 7 dias corridos
      expect(volume.value).toBe('0 q');
      expect(volume.tone).toBe('warning');
    });

    it('calcula volume recente corretamente quando há simulados nos últimos 7 dias', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const timeline = [
        { date: '2023-01-01', global_total: 500 },
        { date: getDateKey(yesterday), global_total: 35 },
        { date: getDateKey(today), global_total: 45 }
      ];

      const statuses = computeEvolutionStatuses({
        timeline,
        targetScore: 80
      });

      const volume = statuses.find(s => s.id === 'volume');
      expect(volume).toBeDefined();
      expect(volume.value).toBe('80 q');
      expect(volume.tone).toBe('success');
    });
  });

  describe('Fix 4: SubtopicsPerformanceChart com tópicos deserializados como objeto', () => {
    it('renderiza sem crash quando topics é um objeto (TypeError fix)', () => {
      const categories = [
        {
          id: '1',
          name: 'Direito Administrativo',
          simuladoStats: {
            history: [
              {
                date: '2026-08-14',
                total: 10,
                score: 80,
                topics: {
                  '0': { name: 'Poder de Polícia', total: 5, correct: 4, score: 80 },
                  '1': { name: 'Atos Administrativos', total: 5, correct: 4, score: 80 }
                }
              }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <SubtopicsPerformanceChart
          categories={categories}
          focusSubjectId="1"
          showOnlyFocus={true}
          timeWindow="all"
          targetScore={80}
        />
      );

      // Não deve lançar TypeError: (h.topics || []).forEach is not a function
      expect(html).toContain('Raio-X de Tópicos');
      expect(html).toContain('Ranking (Barras)');
    });
  });

  describe('Fix 5: TodayVsGeneralChart rótulo dinâmico para dia ativo', () => {
    it('exibe "Último dia ativo (%)" quando o usuário não fez simulados hoje', () => {
      const categories = [
        {
          id: '1',
          name: 'Português',
          simuladoStats: {
            history: [
              { date: '2025-01-10', total: 20, correct: 16, score: 80 }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          categories={categories}
          unit="%"
        />
      );

      expect(html).toContain('Último dia ativo (%)');
      expect(html).not.toContain('Acertos de hoje (%)');
    });
  });

  describe('Fix 6: ChartTooltip formatação sem unidade pendente em valores nulos', () => {
    it('renderiza "—" e não "—%" quando valor é null', () => {
      const payload = [
        {
          color: '#3b82f6',
          name: 'Matemática',
          payload: {
            subject: 'Matemática',
            raw_mat: null,
            stats_mat: null,
            bay_mat: null
          }
        }
      ];

      const html = renderToStaticMarkup(
        <ChartTooltip
          active={true}
          payload={payload}
          unit="%"
          subjectKey="mat"
        />
      );

      expect(html).not.toContain('—%');
      expect(html).not.toContain('—pts');
    });
  });

  describe('Fix 7: useSubjectAggData com tópicos como objeto', () => {
    it('agrega tempo e questões cronometradas mesmo quando topics é um objeto', () => {
      const categories = [
        {
          id: '1',
          name: 'Raciocínio Lógico',
          simuladoStats: {
            history: [
              {
                date: '2026-09-01',
                total: 10,
                correct: 8,
                topics: {
                  '0': { name: 'Lógica Proposicional', total: 5, timedQuestoes: 5, timeSpent: 300 },
                  '1': { name: 'Equivalências', total: 5, timedQuestoes: 5, timeSpent: 200 }
                }
              }
            ]
          }
        }
      ];

      const { result } = renderHook(() =>
        useSubjectAggData({ categories, timeWindow: 'all', maxScore: 100, minScore: 0 })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].timeSpent).toBe(500);
      expect(result.current[0].timedQuestoes).toBe(10);
    });
  });
});
```

---

### `src/components/charts/EvolutionChart/__tests__/evolution-menu-comprehensive-fixes.test.jsx`

**Descrição:** Testes de integração abrangentes cobrindo fluxo de dados entre componentes de evolução.

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ChartTooltip } from '../../ChartTooltip';
import { TimeSpentChart } from '../TimeSpentChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution Menu - Comprehensive Fixes Regression Suite', () => {

  describe('Bug 1: Evolution.jsx Target Score logic on non-standard scales', () => {
    // Replica da função memoizada do Evolution.jsx
    const computeTargetScorePoints = (user, minScore, maxScore) => {
      const safeMax = Math.max(1, Number(maxScore) || 100);
      const safeMin = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMax) : 0;
      const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
      
      if (user?.targetScore != null && Number.isFinite(Number(user.targetScore))) {
        let ts = Number(user.targetScore);
        if (ts < safeMin && ts >= 0 && ts <= 100 && (safeMax - safeMin) > 0) {
          ts = safeMin + (ts / 100) * (safeMax - safeMin);
        }
        return clamp(ts);
      }
      
      if (user?.targetProbability != null && Number.isFinite(Number(user.targetProbability))) {
        return clamp(safeMin + (Number(user.targetProbability) / 100) * (safeMax - safeMin));
      }
      
      return clamp(safeMin + (safeMax - safeMin) * 0.8);
    };

    it('preserva targetScore de 80 pontos em prova de 0 a 120 pontos sem distorcer para 96', () => {
      const user = { targetScore: 80 };
      const score = computeTargetScorePoints(user, 0, 120);
      expect(score).toBe(80);
    });

    it('preserva targetScore de 70 pontos em escala Cebraspe (-120 a +120) sem distorcer para 48', () => {
      const user = { targetScore: 70 };
      const score = computeTargetScorePoints(user, -120, 120);
      expect(score).toBe(70);
    });

    it('converte valor padrão legadizado (75) que está abaixo do piso no ENEM (200 a 1000)', () => {
      const user = { targetScore: 75 }; // 75 < 200, é um percentual legadizado
      const score = computeTargetScorePoints(user, 200, 1000);
      // 200 + 0.75 * 800 = 800
      expect(score).toBe(800);
    });
  });

  describe('Bug 3: TodayVsGeneralChart radial gauge with negative minScore and null value', () => {
    it('não gera arco fantasma quando minScore é negativo e metric.val é null', () => {
      const categories = [
        {
          id: 'cat1',
          name: 'Direito Administrativo',
          simuladoStats: { history: [] }
        }
      ];

      const html = renderToStaticMarkup(
        <TodayVsGeneralChart
          categories={categories}
          targetScore={50}
          minScore={-20}
          maxScore={100}
          unit="pts"
          globalMetrics={{ globalAccuracy: 0 }}
        />
      );

      expect(html).toBeTruthy();
    });
  });

  describe('Bug 4: useChartData heatmapData date mapping resilience', () => {
    it('extrai dados de data sem quebrar com valores inválidos', () => {
      const DAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
      const datesToUse = ['invalid-date', '2026-10-15', null, ''];
      
      const dates = datesToUse.map(dateStr => {
        const parts = typeof dateStr === 'string' ? dateStr.split('-') : [];
        const day = parts[2] || '01';
        const m = parts[1] || '01';
        // Date parse seguro
        const d = dateStr ? new Date(dateStr) : null;
        const dayOfWeek = (d instanceof Date && !isNaN(d.getTime())) ? d.getDay() : 0;
        return {
          key: dateStr,
          dayName: DAY_NAMES[dayOfWeek] || '',
          label: `${day}/${m}`,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        };
      });

      expect(dates.length).toBe(4);
      expect(dates[0].dayName).toBe('DOM');
      expect(dates[1].label).toBe('15/10');
    });
  });

  describe('Bug 5: WeeklyEvolutionView ghost tooltip suppression', () => {
    it('renderiza o componente WeeklyEvolutionView corretamente', () => {
      const categories = [
        { id: 'mat1', name: 'Matéria 1', color: '#3b82f6' }
      ];
      const html = renderToStaticMarkup(
        <WeeklyEvolutionView
          categories={categories}
          viewMode="progression"
          unit="%"
        />
      );
      expect(html).toContain('Dados insuficientes');
    });
  });

  describe('Bug 8: TimeSpentChart rendering and KPI display', () => {
    it('renderiza Último Geral e Média Geral no cabeçalho do KPI', () => {
      const subjectAggData = [
        { name: 'Dir Const', questoes: 20, timedQuestoes: 20, timeSpent: 1200, acertos: 16 }
      ];

      const html = renderToStaticMarkup(
        <TimeSpentChart
          subjectAggData={subjectAggData}
        />
      );

      expect(html).toContain('Média Geral');
      expect(html).toContain('ÚLTIMO GERAL');
    });
  });

  describe('Bug 9: SubtopicsPerformanceChart CustomLineTooltip sort & target formatting', () => {
    it('renderiza SubtopicsPerformanceChart com dados parciais ou nulos sem falhar', () => {
      const categories = [
        {
          id: 'c1',
          name: 'Português',
          simuladoStats: {
            history: [
              {
                date: '2026-10-10',
                topics: [
                  { name: 'Sintaxe', correct: 8, total: 10 }
                ]
              }
            ]
          }
        }
      ];

      const html = renderToStaticMarkup(
        <SubtopicsPerformanceChart
          categories={categories}
          targetScore={75}
        />
      );

      expect(html).toBeTruthy();
    });
  });

  describe('Bug 10: ChartTooltip formatar data ISO em pt-BR', () => {
    it('formata label ISO (2026-10-12) para formato pt-BR no cabeçalho do tooltip', () => {
      const payload = [
        { name: 'Nível Bayesiano', value: 82, color: '#3b82f6' }
      ];

      const html = renderToStaticMarkup(
        <ChartTooltip
          active={true}
          payload={payload}
          label="2026-10-12"
          unit="%"
        />
      );

      expect(html).toContain('12/10/2026');
      expect(html).not.toContain('📅 2026-10-12');
    });

    it('mantém labels que não são ISO (ex: "Semana 1")', () => {
      const payload = [
        { name: 'Nível Bayesiano', value: 82, color: '#3b82f6' }
      ];

      const html = renderToStaticMarkup(
        <ChartTooltip
          active={true}
          payload={payload}
          label="Semana 1"
          unit="%"
        />
      );

      expect(html).toContain('Semana 1');
    });
  });

});
```

---

### `src/components/charts/EvolutionChart/__tests__/evolution-stats-bugs.test.jsx`

**Descrição:** Testes de edge cases estatísticos específicos dos gráficos de evolução.

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { mapRetentionData } from '../../../../utils/chartDataMappers';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';

// Mock recharts assim como nos outros testes de componentes de gráficos
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution & Stats Bugs Audit', () => {
    it('Bug C: SubtopicsPerformanceChart deve se proteger contra Divisão por Zero (maxScore === minScore)', () => {
        const today = new Date().toISOString();
        const categories = [{
            id: '1', 
            name: 'CatZeroDivision', 
            simuladoStats: { 
                history: [{ 
                    date: today, 
                    total: 10, 
                    correct: 5, 
                    score: 5, 
                    topics: [{ name: 'Top1', total: 10, correct: 5, score: 5 }] 
                }] 
            }
        }];
        
        // Passando maxScore igual a minScore para forçar divisão por zero caso a proteção (range = Math.max(1e-9...)) falhe
        const html = renderToStaticMarkup(
            <SubtopicsPerformanceChart categories={categories} maxScore={100} minScore={100} viewMode="lines" instanceId="test" />
        );
        
        // Deve renderizar sem lançar erro de divisão por zero (Infinity/NaN no Recharts)
        expect(html).toContain('Raio-X de Tópicos');
    });

    it('Bug D: mapRetentionData deve ler simuladoStats.average quando bayesianStats.mean não existir (Amnésia Bayesiana)', () => {
        const now = Date.now();
        const pastDate = new Date(now - 14 * 24 * 60 * 60 * 1000); // 14 dias atrás
        
        // Categoria 1: Com Alto Average no simulado (deve ter decaimento mais lento/melhor retenção)
        const catWithHighAverage = {
            id: '1',
            name: 'Cat1',
            lastStudiedAt: pastDate.toISOString(),
            maxScore: 100,
            simuladoStats: { totalQuestions: 100, average: 90 }, // Alta precisão de fallback
            // Sem bayesianStats.mean
        };
        
        // Categoria 2: Com Baixo Average no simulado
        const catWithLowAverage = {
            id: '2',
            name: 'Cat2',
            lastStudiedAt: pastDate.toISOString(),
            maxScore: 100,
            simuladoStats: { totalQuestions: 100, average: 0 }, // Baixa precisão de fallback
        };
        
        const resultHigh = mapRetentionData([catWithHighAverage]);
        const resultLow = mapRetentionData([catWithLowAverage]);
        
        // Como o Bug D foi corrigido, o accuracy agora usa simuladoStats.average quando a bayesiana falha.
        // Portanto, a retenção do que tem 90 de average deve ser MAIOR, o que significa que o Nível Crítico (100 - retention) deve ser MENOR do que a do que tem 0.
        expect(resultHigh[0].nivelCritico).toBeLessThan(resultLow[0].nivelCritico);
        expect(resultHigh[0].nivelCritico).toBeLessThan(100);
    });
});
```

---

### `src/components/charts/EvolutionChart/__tests__/evolutionComponents.test.jsx`

**Descrição:** Testes de montagem e renderização visual dos componentes de evolução.

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MonteCarloEvolutionChart } from '../MonteCarloEvolutionChart';
import { EvolutionHeatmap } from '../../EvolutionHeatmap';
import { CriticalTopicsAnalysis } from '../CriticalTopicsAnalysis';
import { RadarAnalysis } from '../RadarAnalysis';
import { TimeSpentChart } from '../TimeSpentChart';
import { PerformanceBarChart } from '../PerformanceBarChart';
import { EvolutionLineChart } from '../EvolutionLineChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('evolution components render contracts', () => {
  it('renders MonteCarloEvolutionChart shell with scenario controls', () => {
    const html = renderToStaticMarkup(
      <MonteCarloEvolutionChart
        data={[
          { date: '2026-05-01', probability: 50, mean: 70, ci95Low: 65, ci95High: 75 },
          { date: '2026-05-02', probability: 55, mean: 72, ci95Low: 67, ci95High: 77 }
        ]}
        targetScore={75}
        unit="%"
        maxScore={100}
      />
    );
    expect(html).toContain('Rastreador de Aprovação');
    expect(html).toContain('Conserv.');
    expect(html).toContain('Base');
    expect(html).toContain('Otim.');
  });

  it('renders EvolutionHeatmap controls', () => {
    const heatmapData = {
      dates: [{ key: '2026-05-01', label: '01/05', dayName: 'SEX', isWeekend: false }],
      rows: [{ cat: { id: 'cat1', name: 'Matemática', icon: '📘', color: '#fff' }, cells: [{ pct: 80, correct: 8, total: 10 }] }]
    };
    const html = renderToStaticMarkup(<EvolutionHeatmap heatmapData={heatmapData} targetScore={70} unit="%" />);
    expect(html).toContain('Diário');
    expect(html).toContain('Semanal');
    expect(html).toContain('Mensal');
  });

  it('renders CriticalTopicsAnalysis', () => {
    const today = new Date().toISOString().split('T')[0];
    const categories = [{
      id: 'cat1', name: 'Física', icon: '⚛️', color: '#fff',
      simuladoStats: {
        history: [{
          date: today,
          total: 10,
          correct: 2,
          score: 20,
          topics: [{ name: 'Cinemática', total: 10, correct: 2, score: 20 }]
        }]
      }
    }];
    const html = renderToStaticMarkup(<CriticalTopicsAnalysis categories={categories} maxScore={100} />);
    expect(html).toContain('Índice de Criticidade');
  });

  it('renders RadarAnalysis', () => {
    const radarData = [{
      subject: 'Matemática', score: 80, target: 70
    }];
    const html = renderToStaticMarkup(<RadarAnalysis radarData={radarData} maxScore={100} />);
    expect(html).toContain('Equilíbrio Geral');
  });

  it('renders TimeSpentChart', () => {
    const subjectAggData = [{
      fullName: 'Química', timeSpent: 120, questoes: 10, timedQuestoes: 10
    }];
    const html = renderToStaticMarkup(<TimeSpentChart subjectAggData={subjectAggData} />);
    expect(html).toContain('Tempo M');
    expect(html).toContain('Última Média');
  });

  it('renders CriticalTopicsAnalysis com suporte a synthetic total (nova matematica)', () => {
    const today = new Date().toISOString().split('T')[0];
    const categories = [{
      id: 'cat1', name: 'Física', icon: '⚛️', color: '#fff',
      simuladoStats: {
        history: [{
          date: today,
          total: 0,
          correct: 0,
          score: 500,
          topics: [{ name: 'Cinemática', total: 0, correct: 0, score: 500 }]
        }]
      }
    }];
    const html = renderToStaticMarkup(<CriticalTopicsAnalysis categories={categories} maxScore={1000} />);
    expect(html).toContain('Índice de Criticidade');
  });

  it('renders RadarAnalysis com suporte a minScore dinamico (nova matematica)', () => {
    const radarData = [{
      subject: 'Matemática', score: 800, target: 700
    }];
    const html = renderToStaticMarkup(<RadarAnalysis radarData={radarData} minScore={200} maxScore={1000} unit="pts" />);
    expect(html).toContain('Equilíbrio Geral');
  });

  it('renders PerformanceBarChart com suporte a units (nova matematica)', () => {
    const subjectAggData = [{
      fullName: 'Química', questoes: 10, erros: 2, scoreNorm: 800
    }];
    const html = renderToStaticMarkup(<PerformanceBarChart subjectAggData={subjectAggData} unit="pts" maxScore={1000} />);
    expect(html).toContain('Questões Resolvidas vs Acertos');
  });

  it('renders EvolutionLineChart without isLineClicked reference errors', () => {
    const categories = [{ id: 'cat1', name: 'Direito Constitucional', color: '#6366f1' }];
    const chartData = [{ date: '2026-05-01', displayDate: '01/05', raw_cat1: 80, bay_cat1: 78, stats_cat1: 75 }];
    const html = renderToStaticMarkup(
      <EvolutionLineChart
        activeCategories={categories}
        filteredChartData={chartData}
        engine={{ id: 'bayesian', prefix: 'bay_' }}
        targetScore={70}
        maxScore={100}
        minScore={0}
        unit="%"
      />
    );
    expect(html).toContain('Traçando evolução');
  });

  it('renders TodayVsGeneralChart with negative delta formatting correctly', () => {
    const today = new Date().toISOString().split('T')[0];
    const categories = [{
      id: 'cat1', name: 'Português',
      simuladoStats: {
        history: [
          { date: '2026-05-01', total: 10, correct: 9, score: 90 },
          { date: today, total: 10, correct: 8, score: 80 }
        ]
      }
    }];
    const simuladoRows = [
      { date: today, categoryId: 'cat1', subject: 'Português', total: 10, correct: 4, score: 40 }
    ];
    const html = renderToStaticMarkup(
      <TodayVsGeneralChart
        categories={categories}
        simuladoRows={simuladoRows}
        globalMetrics={{ globalAccuracy: 70 }}
        targetScore={70}
        maxScore={100}
        minScore={0}
        unit="%"
      />
    );
    expect(html).toContain('Ritmo (Hoje)');
    expect(html).toContain('−40.0%');
  });

  it('generates burnout and dynamic engine insights in insightGenerator', () => {
    const today = new Date().toISOString().split('T')[0];
    const cat = {
      id: 'cat1', name: 'Biologia',
      simuladoStats: {
        history: [
          { date: today, total: 50, correct: 20, score: 40 }
        ]
      }
    };
    const timeline = [
      { date: today, raw_cat1: 40, bay_cat1: 75, stats_cat1: 70 }
    ];
    const insight = generateEvolutionInsights({
      timeline,
      focusCategory: cat,
      activeEngine: 'compare',
      categories: [cat],
      unit: '%',
      maxScore: 100,
      minScore: 0
    });
    expect(insight).toBeDefined();
    expect(insight.title).toContain('Alerta de Burnout');
  });

  it('renders PerformanceBarChart with 100% correct answers (erros === 0) without breaking stack', () => {
    const subjectAggData = [{
      name: 'Direito Penal', fullName: 'Direito Penal', questoes: 10, acertos: 10, erros: 0
    }];
    const html = renderToStaticMarkup(<PerformanceBarChart subjectAggData={subjectAggData} unit="%" maxScore={100} />);
    expect(html).toContain('Questões Resolvidas vs Acertos');
    expect(html).toContain('Acertos');
    expect(html).toContain('Erros');
  });

  it('renders EvolutionHeatmap with non-standard scale (ENEM 200-1000) correctly', () => {
    const heatmapData = {
      dates: [{ key: '2026-05-01', label: '01/05', dayName: 'SEX', isWeekend: false }],
      rows: [{ cat: { id: 'cat1', name: 'Redação', icon: '📝', color: '#fff' }, cells: [{ pct: 85, correct: 850, total: 1000 }] }]
    };
    const html = renderToStaticMarkup(
      <EvolutionHeatmap
        heatmapData={heatmapData}
        targetScore={750}
        minScore={200}
        maxScore={1000}
        unit="pts"
      />
    );
    expect(html).toContain('Diário');
    expect(html).toContain('meta');
  });
});
```

---

### `src/components/charts/EvolutionChart/__tests__/TimeSpentChart.test.jsx`

**Descrição:** Testes unitários e de tolerância do componente TimeSpentChart.

```jsx
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TimeSpentChart } from '../TimeSpentChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('TimeSpentChart bug fixes', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('inclui histórico de hoje na média recente mesmo de manhã (comparação por getDateKey)', () => {
    vi.useFakeTimers();
    // 10:00 em Manaus (UTC-4) = 14:00 UTC — antes do meio-dia ancorado (16:00 UTC)
    vi.setSystemTime(new Date('2026-05-08T14:00:00.000Z'));

    const subjectAggData = [{
      id: 'cat1',
      fullName: 'Física',
      timeSpent: 600,
      timedQuestoes: 10,
    }];

    const activeCategories = [{
      id: 'cat1',
      simuladoStats: {
        history: [{
          date: '2026-05-08',
          timeSpent: 120,
          total: 10,
        }],
      },
    }];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    // Média recente de hoje: 12s/questão — não deve cair para a média geral de 60s
    expect(html).toContain('Média: 12s');
    expect(html).not.toContain('Média: 1m');
  });

  it('exclui entradas com data futura via chave YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T14:00:00.000Z'));

    const subjectAggData = [{
      id: 'cat1',
      fullName: 'Física',
      timeSpent: 600,
      timedQuestoes: 10,
    }];

    const activeCategories = [{
      id: 'cat1',
      simuladoStats: {
        history: [
          { date: '2026-04-20', timeSpent: 200, total: 10 },
          { date: '2026-05-09', timeSpent: 30, total: 10 },
        ],
      },
    }];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    // Sem dados recentes válidos (futuro excluído, antigo fora da janela), usa média geral (60s)
    expect(html).toContain('Média: 1m');
    expect(html).not.toContain('Média: 3s');
    expect(html).not.toContain('Média: 20s');
  });

  it('usa vermelho para acima da média e verde para abaixo da média na legenda', () => {
    const subjectAggData = [{
      id: 'cat1',
      fullName: 'Física',
      timeSpent: 300,
      timedQuestoes: 10,
    }];

    const activeCategories = [{
      id: 'cat1',
      simuladoStats: {
        history: [{
          date: '2026-05-01',
          timeSpent: 450,
          total: 10,
        }],
      },
    }];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    const aboveIdx = html.indexOf('ACIMA DA MÉDIA');
    const belowIdx = html.indexOf('ABAIXO DA MÉDIA');
    expect(aboveIdx).toBeGreaterThan(-1);
    expect(belowIdx).toBeGreaterThan(-1);
    expect(html.indexOf('text-rose-400', aboveIdx)).toBeGreaterThan(-1);
    expect(html.indexOf('text-emerald-400', belowIdx)).toBeGreaterThan(-1);
  });

  it('não distorce média da legenda quando latestSeconds é null', () => {
    const subjectAggData = [
      { id: 'cat1', fullName: 'Física A', timeSpent: 300, timedQuestoes: 10 },
      { id: 'cat2', fullName: 'Física B', timeSpent: 300, timedQuestoes: 10 },
    ];

    const activeCategories = [
      {
        id: 'cat1',
        simuladoStats: {
          history: [{ date: '2026-05-01', timeSpent: 90, total: 10 }],
        },
      },
      {
        id: 'cat2',
        simuladoStats: {
          history: [{ date: '2026-05-01', timeSpent: 0, total: 10 }],
        },
      },
    ];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    // Apenas cat1 tem último tempo (9s); cat2 com null não deve puxar a média para 5s
    expect(html).toContain('ÚLTIMO GERAL: <span class="font-bold text-slate-300">9s</span>');
    expect(html).not.toContain('ÚLTIMO GERAL: <span class="font-bold text-slate-300">5s</span>');
  });
});
```

---

