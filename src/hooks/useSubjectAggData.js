import { useMemo } from 'react';
import { toDateMs, getDateKey } from '../utils/dateHelper';
import { getSafeScore, getSyntheticTotal } from '../utils/scoreHelper';

function extractTopicsTotals(entry, safeMax, safeMin) {
  const rawTopics = entry?.topics;
  const topicsList = Array.isArray(rawTopics)
    ? rawTopics
    : (rawTopics && typeof rawTopics === 'object' ? Object.values(rawTopics) : []);
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

/**
 * Filtra um histórico por janela de tempo ('30' | '60' | '90' | 'all').
 * Movido do EvolutionChart.jsx (LOTE-05).
 */
export function filterHistoryByTimeWindow(history, timeWindow) {
  const days = Number.parseInt(timeWindow, 10);
  const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
  const todayKey = getDateKey(new Date());

  const validEntries = safeHistory.filter(Boolean).filter((h) => {
    if (h?.valid === false) return false;
    const rawDate = h?.date || h?.createdAt;
    if (!rawDate) return false;
    const key = getDateKey(rawDate);
    if (!key) return false;
    return key <= todayKey;
  });

  if (timeWindow === 'all' || !Number.isFinite(days) || days <= 0) {
    return validEntries;
  }
  const withMs = validEntries
    .map((h) => {
      const rawDate = h?.date || h?.createdAt;
      const key = getDateKey(rawDate);
      const ms = toDateMs(key);
      return Number.isFinite(ms) ? { h, ms } : null;
    })
    .filter(Boolean);
  if (!withMs.length) return validEntries;
  const referenceMs = toDateMs(todayKey);
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

        let realQ = 0;
        let realC = 0;
        let synthQ = 0;
        let synthC = 0;

        history.forEach((h) => {
          let tot = Math.max(0, Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0);
          let hasRawC = (h.correct !== undefined && h.correct !== null && String(h.correct).trim() !== '') ||
                        (h.acertos !== undefined && h.acertos !== null && String(h.acertos).trim() !== '') ||
                        (h.correctCount !== undefined && h.correctCount !== null && String(h.correctCount).trim() !== '');
          let rawC = Number(h.correct ?? h.acertos ?? h.correctCount);
          let score = getSafeScore(h, catMax, catMin);
          if (tot === 0 && !Number.isFinite(score)) {
            const topicFallback = extractTopicsTotals(h, catMax, catMin);
            if (topicFallback.total > 0) {
              tot = topicFallback.total;
              rawC = topicFallback.correct;
              hasRawC = true;
              score = topicFallback.score;
            } else if (topicFallback.hasTopicsScore) {
              score = topicFallback.score;
            }
          }
          if (!Number.isFinite(score)) return;

          const isSynth =
            h?.syntheticVolume === true ||
            h?.isSynthetic === true ||
            h?.type === 'percent-only' ||
            tot === 0;

          if (isSynth && tot === 0) {
            tot = getSyntheticTotal(catMax);
          }
          if (tot <= 0) return;

          let corr = 0;
          if (!isSynth && !h.isPercentage && hasRawC && Number.isFinite(rawC)) {
            corr = Math.max(0, Math.min(tot, rawC));
          } else {
            const normalizedScore = Math.max(catMin, Math.min(catMax, score));
            const derived = ((normalizedScore - catMin) / catRange) * tot;
            corr = Math.max(0, Math.min(tot, Number.isFinite(derived) ? derived : 0));
          }

          if (isSynth) {
            synthQ += tot;
            synthC += corr;
          } else {
            realQ += tot;
            realC += corr;
          }
        });

        const totalQ = realQ + synthQ;
        const totalCorrect = Math.round(realC + synthC);

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
                  : Number(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions) || 0;
                if (tTs !== null && tTs > 0 && tTot > 0) {
                  topicsTs += tTs; topicsTimedQ += tTot; hasTopicWithTime = true;
                }
              }
            }
            if (hasTopicWithTime) return { ts: acc.ts + topicsTs, tq: acc.tq + topicsTimedQ };
            const rootTot = Number(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions) || 0;
            if (rootTs !== null && rootTs > 0 && rootTot > 0) return { ts: acc.ts + rootTs, tq: acc.tq + rootTot };
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
          realQuestoes: realQ,
          realAcertos: Math.round(realC),
          syntheticQuestoes: synthQ,
          syntheticAcertos: Math.round(synthC),
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
