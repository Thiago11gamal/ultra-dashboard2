import { useState, useMemo, useEffect, useRef } from 'react';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { useAppStore } from '../store/useAppStore';
import { getDateKey, toDateMs } from '../utils/dateHelper';
import { getSafeScore, extractTopicsTotals } from '../utils/scoreHelper';
import { parseNoonLocal, addDaysNoon } from '../utils/parseNoonLocal';
import { runMonteCarloAnalysis } from '../engine/monteCarlo';

const EMPTY_ARRAY = Object.freeze([]);

/**
 * Orquestra o motor Monte Carlo do Menu Evolução.
 * Extraído do EvolutionChart.jsx (LOTE-05).
 *
 * Responsabilidades:
 *  - manter o resultado Monte Carlo e o KPI Chance de Aprovação sincronizados em todas as abas;
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
  const _ignoredEngine = activeEngine ?? _activeEngine;
  void _ignoredEngine;

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
      .map((h) => {
        const rawTopics = Array.isArray(h?.topics)
          ? h.topics
          : (h?.topics && typeof h.topics === 'object' ? Object.values(h.topics) : EMPTY_ARRAY);
        const topicsSig = rawTopics
          .map((t) => `${t?.total ?? t?.questoes ?? t?.totalQuestoes ?? t?.questions ?? ''}:${t?.correct ?? t?.acertos ?? t?.correctCount ?? ''}:${t?.isPercentage ? 1 : 0}:${t?.score ?? t?.scorePoints ?? t?.scorePct ?? t?.value ?? ''}:${t?.timeSpent ?? ''}:${t?.timedQuestoes ?? ''}`)
          .join(',');
        return `${h?.date || h?.createdAt || ''}:${h?.valid === false ? 0 : 1}:${h?.isPercentage ? 1 : 0}:${h?.unit ?? ''}:${h?.scoreUnit ?? ''}:${h?.score ?? ''}:${h?.scorePoints ?? ''}:${h?.scorePct ?? ''}:${h?.value ?? ''}:${h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions ?? ''}:${h?.correct ?? h?.acertos ?? h?.correctCount ?? ''}:${h?.timeSpent ?? ''}:${h?.timedQuestoes ?? ''}:[${topicsSig}]`;
      })
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

    const globalMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const globalMax = Math.max(globalMin + 1, Number(maxScore) || 100);
    const globalRange = Math.max(1, globalMax - globalMin);
    const safeMin = Number.isFinite(Number(focusCategory?.minScore)) ? Number(focusCategory.minScore) : globalMin;
    const safeMax = Number(focusCategory?.maxScore) > safeMin ? Number(focusCategory.maxScore) : globalMax;
    const safeRange = Math.max(1, safeMax - safeMin);
    const hasCustomCutoff = focusCategory?.minCutoff !== null &&
      focusCategory?.minCutoff !== undefined &&
      typeof focusCategory?.minCutoff !== 'boolean' &&
      String(focusCategory?.minCutoff).trim() !== '' &&
      Number.isFinite(Number(focusCategory?.minCutoff)) &&
      Number(focusCategory.minCutoff) > safeMin;
    const effectiveTarget = hasCustomCutoff
      ? Math.max(safeMin, Math.min(safeMax, Number(focusCategory.minCutoff)))
      : (safeMax === globalMax && safeMin === globalMin
          ? debouncedTarget
          : safeMin + ((Number(debouncedTarget) - globalMin) / globalRange) * safeRange);
    const rawLevelVal = typeof currentFocusLevel === 'object' && currentFocusLevel !== null
      ? currentFocusLevel.mean
      : currentFocusLevel;
    const safeCurrentMean = rawLevelVal !== null && rawLevelVal !== undefined && Number.isFinite(Number(rawLevelVal))
      ? Number(rawLevelVal)
      : safeMin;

    const signature = `${focusCategoryId}|${historyFingerprint}|${effectiveTarget}|${projectDays}|${safeMin}|${safeMax}|${Math.round(safeCurrentMean * 100)}`;
    if (lastComputedSignatureRef.current === signature && mcResult?.categoryId === focusCategoryId) {
      const resetLoading = setTimeout(() => {
        if (!cancelled) setMcLoading(false);
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(resetLoading);
      };
    }

    const toOptionalFinite = (val) => {
      if (val === null || val === undefined || typeof val === 'boolean' || String(val).trim() === '') return undefined;
      const n = Number(val);
      return Number.isFinite(n) ? n : undefined;
    };

    const hist = [...historyArray]
      .filter((h) => h && h.valid !== false && (h.date || h.createdAt))
      .map((h) => {
        const dateKey = getDateKey(h.date || h.createdAt);
        let score = getSafeScore(h, safeMax, safeMin);
        let total = toOptionalFinite(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions);
        let correct = !h.isPercentage ? toOptionalFinite(h.correct ?? h.acertos ?? h.correctCount) : undefined;
        if ((!total || total <= 0) && h.topics != null) {
          const tf = extractTopicsTotals(h, safeMax, safeMin);
          if (tf.total > 0) {
            total = tf.total;
            correct = tf.correct;
            if (!Number.isFinite(score) || score === safeMin) score = tf.score;
          } else if (!Number.isFinite(score) && tf.hasTopicsScore) {
            score = tf.score;
          }
        }
        if (!dateKey || !Number.isFinite(score)) return null;
        if (total != null && total > 0 && correct === undefined) {
          correct = Math.round(Math.max(0, Math.min(1, (score - safeMin) / safeRange)) * total);
        }
        return {
          date: dateKey,
          score,
          correct: total != null && total > 0 ? correct : undefined,
          total: total != null && total > 0 ? total : undefined,
          timeSpent: toOptionalFinite(h.timeSpent),
          timedQuestoes: toOptionalFinite(h.timedQuestoes)
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

    const immediateLoadingTimer = setTimeout(() => {
      if (!cancelled) setMcLoading(true);
    }, 0);

    const workerDebounceTimeout = setTimeout(async () => {
      let totalTimeSpent = 0;
      let totalTimedQuestions = 0;
      historyArray.forEach((rawH) => {
        if (!rawH || rawH.valid === false) return;
        let hasTopicWithTime = false;
        let topicsTs = 0;
        let topicsTimedQ = 0;

        const topicEntries = Array.isArray(rawH.topics)
          ? rawH.topics
          : (rawH.topics && typeof rawH.topics === 'object' ? Object.values(rawH.topics) : EMPTY_ARRAY);
        for (const t of topicEntries) {
          if (!t || typeof t !== 'object') continue;
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

      try {
        const result = await runAnalysis({
          values: hist,
          dates: hist.map((h) => h.date),
          meta: effectiveTarget,
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
              meta: effectiveTarget,
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

    return () => { cancelled = true; clearTimeout(immediateLoadingTimer); clearTimeout(workerDebounceTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    focusCategoryId, historyFingerprint, currentFocusLevel, historyArray,
    debouncedTarget, projectDays, runAnalysis, minScore, maxScore,
    focusCategory?.minScore, focusCategory?.maxScore, focusCategory?.minCutoff
  ]);

  const activeMcResult = mcResult?.categoryId === focusCategoryId ? mcResult : null;
  const activeMcProjectionSeries =
    mcProjectionSeries?.categoryId === focusCategoryId ? mcProjectionSeries : null;

  return { mcLoading, mcResult, mcProjectionSeries, activeMcResult, activeMcProjectionSeries };
}
