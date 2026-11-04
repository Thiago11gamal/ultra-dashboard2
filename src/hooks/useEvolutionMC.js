import { useState, useMemo, useEffect, useRef } from 'react';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { useAppStore } from '../store/useAppStore';
import { getDateKey, toDateMs } from '../utils/dateHelper';
import { getSafeScore } from '../utils/scoreHelper';
import { parseNoonLocal, addDaysNoon } from '../utils/parseNoonLocal';
import { runMonteCarloAnalysis } from '../engine/monteCarlo';

const EMPTY_ARRAY = Object.freeze([]);
const MC_ENGINES = new Set(['compare', 'mc_density', 'bayesian']);

/**
 * Orquestra o motor Monte Carlo do Menu Evolução.
 * Extraído do EvolutionChart.jsx (LOTE-05).
 *
 * Responsabilidades:
 *  - disparar o worker apenas nos engines que consomem o resultado;
 *  - debouncer + cancelamento seguro + cache de assinatura para evitar re-execuções redundantes;
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
  activeEngine,
  _activeEngine
}) {
  const effectiveEngine = activeEngine ?? _activeEngine;
  const isMcEngineActive = !effectiveEngine || MC_ENGINES.has(effectiveEngine);

  const { runAnalysis } = useMonteCarloWorker();
  const [mcLoading, setMcLoading] = useState(false);
  const [mcResult, setMcResult] = useState(null);
  const [mcProjectionSeries, setMcProjectionSeries] = useState(null);
  const lastComputedSignatureRef = useRef(null);

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
    return arr
      .map((h) => `${h?.date || h?.createdAt || ''}:${h?.score ?? ''}:${h?.total ?? h?.questoes ?? ''}:${h?.correct ?? h?.acertos ?? ''}:${h?.timeSpent ?? ''}`)
      .join('|');
  }, [focusCategory?.simuladoStats?.history]);

  const historyArray = useMemo(() => {
    const historyRaw = focusCategory?.simuladoStats?.history;
    if (!historyRaw) return EMPTY_ARRAY;
    return Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyFingerprint]);

  const focusCategoryId = focusCategory?.id;
  const currentFocusLevel = focusCategoryId ? categoryLevels?.[focusCategoryId] : undefined;

  useEffect(() => {
    let cancelled = false;

    if (!focusCategoryId || !Array.isArray(historyArray) || historyArray.length === 0) {
      lastComputedSignatureRef.current = null;
      const timer = setTimeout(() => {
        if (!cancelled) {
          setMcLoading(false);
          setMcResult(null);
          setMcProjectionSeries(null);
        }
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    if (!isMcEngineActive) {
      const timer = setTimeout(() => {
        if (!cancelled) setMcLoading(false);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Math.max(safeMin + 1, Number(maxScore) || 100);
    const safeCurrentMean = Number.isFinite(currentFocusLevel)
      ? currentFocusLevel
      : safeMin;

    const signature = `${focusCategoryId}|${historyFingerprint}|${debouncedTarget}|${projectDays}|${safeMin}|${safeMax}|${Math.round(safeCurrentMean * 100)}`;
    if (lastComputedSignatureRef.current === signature && mcResult?.categoryId === focusCategoryId) {
      return () => {
        cancelled = true;
      };
    }

    const hist = [...historyArray]
      .filter((h) => h && (h.date || h.createdAt))
      .map((h) => {
        const dateKey = getDateKey(h.date || h.createdAt);
        const score = getSafeScore(h, safeMax, safeMin);
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

    if (hist.length < 1) {
      lastComputedSignatureRef.current = null;
      const timer = setTimeout(() => {
        if (!cancelled) {
          setMcLoading(false);
          setMcResult(null);
          setMcProjectionSeries(null);
        }
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    const workerDebounceTimeout = setTimeout(async () => {
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
              : Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) || 0;
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
        } else if (rawH.timeSpent != null) {
          const rawHQ = typeof rawH.timedQuestoes === 'number' && rawH.timedQuestoes > 0
            ? rawH.timedQuestoes
            : (Number(rawH.total ?? rawH.questoes ?? rawH.totalQuestoes ?? rawH.questions) || 0);
          if (rawHQ > 0) {
            totalTimeSpent += Number(rawH.timeSpent) || 0;
            totalTimedQuestions += rawHQ;
          }
        }
      });
      const avgSeconds = totalTimedQuestions > 0 ? totalTimeSpent / totalTimedQuestions : 0;

      const store = useAppStore.getState();
      const activeId = store.appState?.activeId;
      const contest = store.appState?.contests?.[activeId];
      const defaultExamTotalQuestions =
        Number.isFinite(Number(contest?.examTotalQuestions)) &&
        Number(contest?.examTotalQuestions) > 0
          ? Number(contest.examTotalQuestions)
          : 100;
      const examDurationMinutes =
        Number.isFinite(Number(contest?.examDurationMinutes)) &&
        Number(contest?.examDurationMinutes) > 0
          ? Number(contest.examDurationMinutes)
          : 240;
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
          currentMean: safeCurrentMean,
          forcedBaseline: safeCurrentMean,
          projectedTotalTimeSeconds,
          examDurationMinutes
        });
        if (cancelled || !result) return;
        lastComputedSignatureRef.current = signature;
        setMcResult({ ...result, categoryId: focusCategoryId });

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
          categoryId: focusCategoryId
        });
      } catch (err) {
        console.warn('[useEvolutionMC] Worker MC falhou, tentando sync:', err);
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
              currentMean: safeCurrentMean,
              forcedBaseline: safeCurrentMean,
              projectedTotalTimeSeconds,
              examDurationMinutes
            });
            if (fallback) {
              lastComputedSignatureRef.current = signature;
              setMcResult({ ...fallback, categoryId: focusCategoryId });
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
                  categoryId: focusCategoryId
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    focusCategoryId, historyFingerprint, currentFocusLevel, historyArray,
    debouncedTarget, projectDays, runAnalysis, minScore, maxScore, isMcEngineActive
  ]);

  const activeMcResult = mcResult?.categoryId === focusCategoryId ? mcResult : null;
  const activeMcProjectionSeries =
    mcProjectionSeries?.categoryId === focusCategoryId ? mcProjectionSeries : null;

  return { mcLoading, mcResult, mcProjectionSeries, activeMcResult, activeMcProjectionSeries };
}
