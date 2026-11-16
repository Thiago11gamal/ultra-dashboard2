import {
  computeCategorySimuladoStats,
  getSimuladoRowCorrect,
  getSimuladoRowTotal,
  resolveCategoryScoreDomain
} from '../../utils/simuladoReconciler.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { isSubjectMatch } from '../../utils/normalization.js';

export const createSimuladoSlice = (set) => ({
  resetSimuladoStats: () => set((state) => {
    const activeData = state.appState?.contests?.[state.appState?.activeId];
    if (!activeData) return;

    if (activeData.categories) {
      if (!Array.isArray(activeData.categories)) {
        activeData.categories = typeof activeData.categories === 'object'
          ? Object.values(activeData.categories)
          : [];
      }

      activeData.categories.forEach(c => {
        if (!c || typeof c !== 'object') return;
        const hasExplicitMin = c.minScore !== undefined && c.minScore !== null && String(c.minScore).trim() !== '' && Number.isFinite(Number(c.minScore));
        const catMin = hasExplicitMin ? Number(c.minScore) : 0;
        c.simuladoStats = {
          history: [],
          average: 0,
          lastAttempt: catMin,
          trend: 'stable',
          level: 'BAIXO'
        };
      });
    }

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
          const itemIsAi =
            item.source === 'ai-generated' ||
            item.type === 'ai-simulado' ||
            (Boolean(item.batchId) && item.source !== 'manual' && item.type !== 'auto-analyzer' && !String(item.id || '').startsWith('manual'));
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
        const safeCategories = Array.isArray(activeData.categories)
          ? activeData.categories
          : Object.values(activeData.categories || {});

        activeData.categories = safeCategories.filter(Boolean).map(c => {
          const {
            maxScore: catMaxScore,
            minScore: catMinScore,
            range: catRange
          } = resolveCategoryScoreDomain(c, activeData.maxScore, activeData.minScore);

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

      const dayTotal = catRowsForDay.reduce((sum, r) => sum + getSimuladoRowTotal(r), 0);
      const dayCorrect = catRowsForDay.reduce((sum, r) => sum + getSimuladoRowCorrect(r), 0);

      if (dayTotal <= 0) return null;

      const dayTimeSpent = catRowsForDay.reduce((sum, r) => sum + (Number(r.timeSpent) || 0), 0);
      const dayTimedQuestoes = catRowsForDay.reduce(
        (sum, r) => sum + (Number(r.timeSpent) > 0 ? getSimuladoRowTotal(r) : 0),
        0
      );

      const topicsMap = {};
      let totalDiffWeight = 0;
      catRowsForDay.forEach(r => {
        const tName = String(r.topic || '').trim() || 'Geral';
        const rTot = getSimuladoRowTotal(r);
        const rCor = getSimuladoRowCorrect(r);
        const rDiff = Number.isFinite(Number(r.difficulty)) && Number(r.difficulty) > 0 ? Number(r.difficulty) : 1.0;
        const rTime = Number(r.timeSpent) || 0;
        const rowTaskId = r.taskId || r.topicId || null;
        totalDiffWeight += rDiff * rTot;

        if (!topicsMap[tName]) {
          topicsMap[tName] = { name: tName, correct: 0, total: 0, diffWeight: 0, timeSpent: 0, taskId: rowTaskId };
        } else if (!topicsMap[tName].taskId && rowTaskId) {
          topicsMap[tName].taskId = rowTaskId;
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

  const newStatsObj = computeCategorySimuladoStats(
    c,
    newHistory,
    activeData.maxScore,
    activeData.minScore
  );

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

