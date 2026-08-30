# src\hooks\useEvolutionMC.js

```js
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
  activeEngine
}) {
  const { runAnalysis } = useMonteCarloWorker();
  const [mcLoading, setMcLoading] = useState(false);
  const [mcResult, setMcResult] = useState(null);
  const [mcProjectionSeries, setMcProjectionSeries] = useState(null);

  const historyArray = useMemo(() => {
    const historyRaw = focusCategory?.simuladoStats?.history;
    if (!historyRaw) return EMPTY_ARRAY;
    return Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);
  }, [focusCategory?.simuladoStats?.history]);

  const currentFocusLevel = focusCategory ? categoryLevels?.[focusCategory.id] : undefined;

  useEffect(() => {
    // ✅ LOTE-05: só dispara o Monte Carlo nos engines que consomem o resultado
    const isMcEngine = activeEngine === 'compare' || activeEngine === 'mc_density';
    if (!isMcEngine) { queueMicrotask(() => setMcLoading(false)); return; }

    if (!focusCategory?.id || !Array.isArray(historyArray) || historyArray.length === 0) {
      queueMicrotask(() => setMcLoading(false));
      return;
    }

    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Math.max(safeMin + 1, Number(maxScore) || 100);

    const hist = [...historyArray]
      .filter((h) => h && (h.date || h.createdAt))
      .map((h) => {
        const dateKey = getDateKey(h.date || h.createdAt);
        const score = getSafeScore(h, safeMax);
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

    if (hist.length < 1) { queueMicrotask(() => setMcLoading(false)); return; }

    let cancelled = false;
    const workerDebounceTimeout = setTimeout(async () => {
      // ✅ BUG-5 FIX: Mover cálculos de tempo para ANTES do try/catch
      // para que fiquem acessíveis no fallback síncrono
      let totalTimeSpent = 0;
      let totalTimedQuestions = 0;
      historyArray.forEach((rawH) => {
        if (rawH && rawH.timeSpent != null && rawH.timedQuestoes != null) {
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
          meta: targetScore,
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
              meta: targetScore,
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
            if (fallback) setMcResult({ ...fallback, categoryId: focusCategory?.id });
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
    focusCategory?.id, currentFocusLevel, historyArray, targetScore,
    projectDays, runAnalysis, minScore, maxScore, activeEngine
  ]);

  const activeMcResult = mcResult?.categoryId === focusCategory?.id ? mcResult : null;
  const activeMcProjectionSeries =
    mcProjectionSeries?.categoryId === focusCategory?.id ? mcProjectionSeries : null;

  return { mcLoading, mcResult, mcProjectionSeries, activeMcResult, activeMcProjectionSeries };
}


```
