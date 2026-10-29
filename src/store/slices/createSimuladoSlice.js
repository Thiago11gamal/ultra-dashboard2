import { computeCategoryStats } from '../../engine/stats.js';
import { getSafeScore } from '../../utils/scoreHelper.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { isSubjectMatch } from '../../utils/normalization.js';

export const createSimuladoSlice = (set) => ({
  resetSimuladoStats: () => set((state) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData?.categories) return;

    activeData.categories.forEach(c => {
      c.simuladoStats = {
        history: [],
        average: 0,
        lastAttempt: 0,
        trend: 'stable',
        level: 'BAIXO'
      };
    });

    const nowIso = new Date().toISOString();
    activeData.simuladoRows = [];
    activeData.simulados = [];
    activeData.lastUpdated = nowIso;

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = nowIso;
    markStorageDirty();
  }),

  deleteSimulado: (dateInput) => set((state) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData || !dateInput) return;

    const normalizedInput = String(dateInput).trim();

    const matchesItem = (item) => {
      if (!item) return false;
      if (item.id && String(item.id).trim() === normalizedInput) {
        return true;
      }
      if (item.batchId && String(item.batchId).trim() === normalizedInput) {
        return true;
      }
      const raw = item.date || item.createdAt;
      if (!raw) return false;
      const normalizedRaw = String(raw).trim();
      if (normalizedRaw === normalizedInput) return true;

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const inputDatePart = normalizedInput.includes('T') ? normalizedInput.split('T')[0] : normalizedInput;
      const rawDatePart = normalizedRaw.includes('T') ? normalizedRaw.split('T')[0] : normalizedRaw;

      if (dateRegex.test(inputDatePart) && rawDatePart === inputDatePart) {
        return true;
      }

      if (normalizedInput.startsWith('ai-') || normalizedInput.startsWith('manual-')) {
        const prefixStripped = normalizedInput.replace(/^(ai|manual)-/, '');
        const strippedDatePart = prefixStripped.includes('T') ? prefixStripped.split('T')[0] : prefixStripped;
        if (dateRegex.test(strippedDatePart) && rawDatePart === strippedDatePart) {
          const itemIsAi = item.source === 'ai-generated' || (item.batchId && item.source !== 'manual');
          if (normalizedInput.startsWith('ai-') && itemIsAi) return true;
          if (normalizedInput.startsWith('manual-') && !itemIsAi) return true;
        }
      }
      return false;
    };

    const safeRows = Array.isArray(activeData.simuladoRows)
      ? activeData.simuladoRows
      : Object.values(activeData.simuladoRows || {});
    const safeSimulados = Array.isArray(activeData.simulados)
      ? activeData.simulados
      : Object.values(activeData.simulados || {});

    // Coleta todas as datas afetadas pelos itens excluídos
    const affectedDates = new Set();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const inputDatePart = normalizedInput.includes('T') ? normalizedInput.split('T')[0] : normalizedInput;
    if (dateRegex.test(inputDatePart)) {
      affectedDates.add(inputDatePart);
    }
    if (normalizedInput.startsWith('ai-') || normalizedInput.startsWith('manual-')) {
      const prefixStripped = normalizedInput.replace(/^(ai|manual)-/, '');
      const strippedDatePart = prefixStripped.includes('T') ? prefixStripped.split('T')[0] : prefixStripped;
      if (dateRegex.test(strippedDatePart)) {
        affectedDates.add(strippedDatePart);
      }
    }

    safeRows.forEach(r => {
      if (matchesItem(r)) {
        const dKey = getDateKey(normalizeDate(r.date || r.createdAt));
        if (dKey) affectedDates.add(dKey);
      }
    });

    safeSimulados.forEach(s => {
      if (matchesItem(s)) {
        const dKey = getDateKey(normalizeDate(s.date || s.createdAt));
        if (dKey) affectedDates.add(dKey);
      }
    });

    const remainingRows = safeRows.filter(r => !matchesItem(r));
    activeData.simuladoRows = remainingRows;
    activeData.simulados = safeSimulados.filter(s => !matchesItem(s));

    if (activeData.categories) {
      activeData.categories = activeData.categories.map(c => {
        const catMaxScore = Number.isFinite(Number(c.maxScore)) && Number(c.maxScore) > 0
          ? Number(c.maxScore)
          : (Number(activeData.maxScore) || 100);
        const catMinScore = Number.isFinite(Number(c.minScore))
          ? Math.min(Number(c.minScore), catMaxScore)
          : (Number(activeData.minScore) || 0);
        const catRange = Math.max(1e-9, catMaxScore - catMinScore);

        if (c.simuladoStats?.history) {
          const safeHistory = Array.isArray(c.simuladoStats.history)
            ? c.simuladoStats.history
            : Object.values(c.simuladoStats.history || {});

          // Reconciliar histórico para cada entrada
          const newHistory = safeHistory
            .map(h => {
              const hDateKey = getDateKey(normalizeDate(h?.date || h?.createdAt));
              if (!affectedDates.has(hDateKey)) {
                return matchesItem(h) ? null : h;
              }

              // Data afetada: recalcular stats com as rows restantes para esta categoria nessa data
              const catRowsForDay = remainingRows.filter(r => {
                const rDateKey = getDateKey(normalizeDate(r.date || r.createdAt));
                if (rDateKey !== hDateKey) return false;
                if (c.id && r.categoryId && r.categoryId === c.id) return true;
                return isSubjectMatch(r.subject, c.name);
              });

              if (catRowsForDay.length === 0) {
                return null; // Nenhuma row restante para esse dia
              }

              const dayTotal = catRowsForDay.reduce((sum, r) => sum + (parseInt(r.total, 10) || 0), 0);
              const dayCorrect = catRowsForDay.reduce((sum, r) => sum + Math.min(parseInt(r.correct, 10) || 0, parseInt(r.total, 10) || 0), 0);

              if (dayTotal <= 0) return null;

              const dayTimeSpent = catRowsForDay.reduce((sum, r) => sum + (Number(r.timeSpent) || 0), 0);
              const dayTimedQuestoes = catRowsForDay.reduce(
                (sum, r) => sum + (Number(r.timeSpent) > 0 ? (parseInt(r.total, 10) || 0) : 0),
                0
              );

              const topicsMap = {};
              let totalDiffWeight = 0;
              catRowsForDay.forEach(r => {
                const tName = String(r.topic || 'Geral').trim();
                const rTot = parseInt(r.total, 10) || 0;
                const rCor = Math.min(parseInt(r.correct, 10) || 0, rTot);
                const rDiff = Number.isFinite(Number(r.difficulty)) && Number(r.difficulty) > 0 ? Number(r.difficulty) : 1.0;
                const rTime = Number(r.timeSpent) || 0;
                totalDiffWeight += rDiff * rTot;

                if (!topicsMap[tName]) {
                  topicsMap[tName] = { name: tName, correct: 0, total: 0, diffWeight: 0, timeSpent: 0, taskId: r.taskId || r.topicId || null };
                }
                topicsMap[tName].correct += rCor;
                topicsMap[tName].total += rTot;
                topicsMap[tName].diffWeight += rDiff * rTot;
                topicsMap[tName].timeSpent += rTime;
              });

              const reconciledTopics = Object.values(topicsMap).map(td => ({
                name: td.name,
                taskId: td.taskId,
                correct: td.correct,
                total: td.total,
                percentage: td.total > 0 ? (td.correct / td.total) * 100 : 0,
                difficulty: td.total > 0 ? Number((td.diffWeight / td.total).toFixed(2)) : 1.0,
                timeSpent: td.timeSpent
              }));

              const ratio = dayCorrect / dayTotal;
              const computedScore = catMinScore + ratio * catRange;

              return {
                ...h,
                correct: dayCorrect,
                total: dayTotal,
                score: Math.min(catMaxScore, Math.max(catMinScore, Number(computedScore.toFixed(2)))),
                difficulty: Number((totalDiffWeight / dayTotal).toFixed(2)) || 1.0,
                timeSpent: dayTimeSpent,
                timedQuestoes: dayTimedQuestoes,
                topics: reconciledTopics
              };
            })
            .filter(Boolean);

          const newStatsObj = { ...c.simuladoStats, history: newHistory };

          if (newHistory.length > 0) {
            const newStats = computeCategoryStats(newHistory, c.weight || 10, 60, catMaxScore, catMinScore);

            if (newStats) {
              const last = newHistory[newHistory.length - 1];
              const lastScore = last ? getSafeScore(last, catMaxScore, catMinScore) : NaN;

              newStatsObj.average = Number((newStats.mean || 0).toFixed(2));
              newStatsObj.trend = newStats.trend || 'stable';

              newStatsObj.lastAttempt = Number.isFinite(lastScore)
                ? lastScore
                : Number(
                    last?.score ?? (
                      (Number(last?.total) > 0)
                        ? catMinScore + (Number(last?.correct || 0) / Number(last?.total)) * catRange
                        : catMinScore
                    )
                  );

              newStatsObj.level = newStats.level || 'BAIXO';
            }
          } else {
            newStatsObj.average = 0;
            newStatsObj.trend = 'stable';
            newStatsObj.lastAttempt = catMinScore;
            newStatsObj.level = 'BAIXO';
          }

          return { ...c, simuladoStats: newStatsObj };
        }

        return c;
      });
    }

    const nowIso = new Date().toISOString();
    activeData.lastUpdated = nowIso;
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = nowIso;
    markStorageDirty();
  }),
});

