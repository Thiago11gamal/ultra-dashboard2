import {
  computeCategorySimCounts,
  computeCategorySimuladoStats,
  getSimuladoRowCorrect,
  getSimuladoRowTotal,
  resolveCategoryScoreDomain
} from '../../utils/simuladoReconciler.js';
import { getSafeScore, computeEffectiveScoreRatio } from '../../utils/scoreHelper.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { isSubjectMatch, normalize } from '../../utils/normalization.js';
import { getCalibrationKey } from '../../utils/coachSafe.js';
import { getSafeId, generateId } from '../../utils/idGenerator.js';
import { safeClone } from '../../utils/safeClone.js';

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
    activeData.calibrationHistoryByCategory = {};
    activeData.calibrationOps = {};
    activeData.calibrationAuditLog = [];
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
      if (item.source === 'manual-error-notebook') {
        return false;
      }
      const raw = item.date || item.createdAt;
      if (!raw) return false;
      const normalizedRaw = String(raw).trim();
      if (normalizedRaw === normalizedInput) return true;

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const inputDatePart = normalizedInput.includes('T') ? normalizedInput.split('T')[0] : normalizedInput;
      const rawDatePart = normalizedRaw.includes('T') ? normalizedRaw.split('T')[0] : normalizedRaw;
      const normalizedItemDateKey = getDateKey(normalizeDate(raw));

      if (dateRegex.test(inputDatePart) && (rawDatePart === inputDatePart || normalizedItemDateKey === inputDatePart)) {
        return true;
      }

      if (normalizedInput.startsWith('ai-') || normalizedInput.startsWith('manual-')) {
        const prefixStripped = normalizedInput.replace(/^(ai|manual)-/, '');
        const strippedDatePart = prefixStripped.includes('T') ? prefixStripped.split('T')[0] : prefixStripped;
        if (dateRegex.test(strippedDatePart) && (rawDatePart === strippedDatePart || normalizedItemDateKey === strippedDatePart)) {
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

    const removedRows = safeRows.filter(matchesItem);
    const removedSimulados = safeSimulados.filter(matchesItem);
    if (removedRows.length > 0 || removedSimulados.length > 0) {
      if (!Array.isArray(state.appState.trash)) state.appState.trash = [];
      const firstRef = removedRows[0] || removedSimulados[0] || {};
      const dateLabel = getDateKey(normalizeDate(firstRef.date || firstRef.createdAt)) || normalizedInput;
      const subjLabel = firstRef.subject || firstRef.categoryName || 'Simulado';
      state.appState.trash = [
        ...state.appState.trash,
        {
          id: generateId('trash'),
          type: 'simulado',
          contestId: state.appState.activeId,
          deletedAt: new Date().toISOString(),
          data: {
            title: `${subjLabel} (${dateLabel})`,
            rows: safeClone(removedRows),
            simulados: safeClone(removedSimulados),
          }
        }
      ].slice(-50);
    }
    const remainingRows = safeRows.filter(r => !matchesItem(r));
    activeData.simuladoRows = remainingRows;
    let remainingSimulados = safeSimulados.filter(s => !matchesItem(s));

    // Se rows foram removidas em datas que tinham resumo manual 'auto-analyzer', reconciliar ou remover esse resumo
    if (removedRows.length > 0 && remainingSimulados.some(s => s && s.type === 'auto-analyzer')) {
      const removedDates = new Set(
        removedRows.map(r => getDateKey(normalizeDate(r?.date || r?.createdAt))).filter(Boolean)
      );
      if (removedDates.size > 0) {
        const rawContestMax = Number.isFinite(Number(activeData.maxScore)) && Number(activeData.maxScore) > 0 ? Number(activeData.maxScore) : 100;
        const rawContestMin = Number.isFinite(Number(activeData.minScore)) ? Number(activeData.minScore) : 0;
        const contestMin = Math.min(rawContestMin, rawContestMax);
        const contestMax = Math.max(rawContestMin, rawContestMax);
        const contestRange = Math.max(1e-9, contestMax - contestMin);
        const globalPenalty = Math.max(0, Number(activeData.penaltyPerWrong) || 0);

        remainingSimulados = remainingSimulados.map((sim) => {
          if (!sim || sim.type !== 'auto-analyzer') return sim;
          const simDateKey = getDateKey(normalizeDate(sim.date || sim.createdAt));
          if (!simDateKey || !removedDates.has(simDateKey)) return sim;

          const manualRowsForDay = remainingRows.filter((r) => {
            if (!r || r.valid === false || r.validated === false || r.source === 'manual-error-notebook') return false;
            const rIsAi = r.source === 'ai-generated' || (Boolean(r.batchId) && r.source !== 'manual' && !String(r.id || '').startsWith('manual'));
            if (rIsAi) return false;
            return getDateKey(normalizeDate(r.date || r.createdAt)) === simDateKey;
          });

          const totalQ = manualRowsForDay.reduce((sum, r) => sum + getSimuladoRowTotal(r), 0);
          if (totalQ <= 0) return null;
          const totalC = manualRowsForDay.reduce((sum, r) => sum + getSimuladoRowCorrect(r), 0);
          const totalB = manualRowsForDay.reduce((sum, r) => sum + Math.min(Math.max(0, getSimuladoRowTotal(r) - getSimuladoRowCorrect(r)), Math.max(0, Number(r.blanks) || 0)), 0);
          const eff = computeEffectiveScoreRatio(totalC, totalQ, {
            blanks: totalB,
            penaltyPerWrong: globalPenalty,
            minScore: contestMin,
            maxScore: contestMax,
          });
          const pts = Number(Math.max(contestMin, Math.min(contestMax, contestMin + eff.ratio * contestRange)).toFixed(2));
          const pct = Number(Math.max(0, Math.min(100, eff.ratio * 100)).toFixed(2));
          const nextSim = {
            ...sim,
            total: totalQ,
            correct: totalC,
            score: pts,
            scorePoints: pts,
            scorePct: pct,
            lastUpdated: new Date().toISOString(),
          };
          if (eff.blanks > 0) nextSim.blanks = eff.blanks;
          else delete nextSim.blanks;
          if (eff.penaltyApplied) {
            nextSim.penaltyPerWrong = globalPenalty;
            nextSim.netPoints = eff.netPoints;
          } else {
            delete nextSim.penaltyPerWrong;
            delete nextSim.netPoints;
          }
          return nextSim;
        }).filter(Boolean);
      }
    }
    activeData.simulados = remainingSimulados;

    const affectedCategorySet = new Set();
    const affectedCategoryDates = new Map();
    const recordAffectedIfMatches = (c) => {
      if (!c) return false;
      const matchedItems = [...removedRows, ...removedSimulados].filter(item => {
        if (!item) return false;
        if (c.id && item.categoryId && String(item.categoryId) === String(c.id)) return true;
        return Boolean(c.name && isSubjectMatch(item.subject || item.categoryName || item.materia || item.disciplina || '', c.name));
      });
      if (matchedItems.length > 0) {
        const catKey = c.id || c.name;
        affectedCategorySet.add(catKey);
        if (!affectedCategoryDates.has(catKey)) {
          affectedCategoryDates.set(catKey, new Set());
        }
        const dateSet = affectedCategoryDates.get(catKey);
        matchedItems.forEach(item => {
          const dk = getDateKey(normalizeDate(item.date || item.createdAt));
          if (dk) dateSet.add(dk);
        });
        return true;
      }
      return false;
    };

    if (activeData.categories) {
        const safeCategories = Array.isArray(activeData.categories)
          ? activeData.categories
          : Object.values(activeData.categories || {});

        activeData.categories = safeCategories.filter(Boolean).map(c => {
          const catMatchedRemoved = recordAffectedIfMatches(c);
          const {
            maxScore: catMaxScore,
            minScore: catMinScore,
            range: catRange
          } = resolveCategoryScoreDomain(c, activeData.maxScore, activeData.minScore);

if (c.simuladoStats?.history) {
  const safeHistory = Array.isArray(c.simuladoStats.history)
    ? c.simuladoStats.history
    : Object.values(c.simuladoStats.history || {});
  const catDateSet = affectedCategoryDates.get(c.id || c.name);
  const rebuiltDates = new Set();

  // Reconciliar histórico para cada entrada
  const newHistory = safeHistory
    .map(h => {
      const hDateKey = getDateKey(normalizeDate(h?.date || h?.createdAt));
      const directMatch = matchesItem(h);
      const isDateAffectedForCat = Boolean(catMatchedRemoved && hDateKey && catDateSet?.has(hDateKey));
      if (!isDateAffectedForCat && !directMatch) {
        return h;
      }

      affectedCategorySet.add(c.id || c.name);
      if (directMatch && !catMatchedRemoved && !hDateKey) {
        return null;
      }
      if (hDateKey) {
        if (rebuiltDates.has(hDateKey)) {
          return null;
        }
        rebuiltDates.add(hDateKey);
      }

      // Data afetada nesta categoria: recalcular stats com as rows restantes para esta categoria nessa data
      const catRowsForDay = remainingRows.filter(r => {
        if (!r || r.valid === false || r.validated === false || r.source === 'manual-error-notebook') return false;
        const rDateKey = getDateKey(normalizeDate(r.date || r.createdAt));
        if (rDateKey !== hDateKey) return false;
        if (r.categoryId) return Boolean(c.id && r.categoryId === c.id);
        return isSubjectMatch(r.subject, c.name);
      });

      if (catRowsForDay.length === 0) {
        return null; // Nenhuma row restante para esse dia
      }

      const dayTotal = catRowsForDay.reduce((sum, r) => sum + getSimuladoRowTotal(r), 0);
      const dayCorrect = catRowsForDay.reduce((sum, r) => sum + getSimuladoRowCorrect(r), 0);

      const scoreOnlyRows = dayTotal <= 0
        ? catRowsForDay.filter(r => r.score != null && String(r.score).trim() !== '' && Number.isFinite(Number(r.score)))
        : [];
      if (dayTotal <= 0 && scoreOnlyRows.length === 0) return null;

      const dayTimeSpent = catRowsForDay.reduce((sum, r) => sum + (Number(r.timeSpent) || 0), 0);
      const dayTimedQuestoes = catRowsForDay.reduce(
        (sum, r) => {
          if (!(Number(r.timeSpent) > 0)) return sum;
          const explicitTq = Number(r.timedQuestoes);
          return sum + (Number.isFinite(explicitTq) && explicitTq > 0 ? explicitTq : getSimuladoRowTotal(r));
        },
        0
      );
      const dayBlanks = catRowsForDay.reduce((sum, r) => sum + Math.max(0, Number(r.blanks) || 0), 0);
      const dayPenalty = catRowsForDay.reduce(
        (maxP, r) => Math.max(maxP, Math.max(0, Number(r.penaltyPerWrong) || 0)),
        Math.max(0, Number(activeData.penaltyPerWrong) || 0)
      );

      const topicsMap = {};
      let totalDiffWeight = 0;
      let diffRowSum = 0;
      catRowsForDay.forEach(r => {
        const tName = String(r.topic || '').trim() || 'Geral';
        const rTot = getSimuladoRowTotal(r);
        const rCor = getSimuladoRowCorrect(r);
        const rBlanks = Math.min(Math.max(0, rTot - rCor), Math.max(0, Number(r.blanks) || 0));
        const rPen = Math.max(0, Number(r.penaltyPerWrong) || 0);
        const rDiff = Number.isFinite(Number(r.difficulty)) && Number(r.difficulty) > 0 ? Number(r.difficulty) : 1.0;
        const rTime = Number(r.timeSpent) || 0;
        const rTimedQ = rTime > 0
          ? (Number(r.timedQuestoes) > 0 ? Math.max(0, Number(r.timedQuestoes)) : rTot)
          : 0;
        const rowTaskId = r.taskId || r.topicId || null;
        totalDiffWeight += rDiff * (rTot > 0 ? rTot : 1);
        diffRowSum += rTot > 0 ? rTot : 1;

        if (!topicsMap[tName]) {
          topicsMap[tName] = {
            name: tName,
            correct: 0,
            total: 0,
            blanks: 0,
            penaltyPerWrong: 0,
            diffWeight: 0,
            diffWeightCount: 0,
            timeSpent: 0,
            timedQuestoes: 0,
            taskId: rowTaskId,
            scores: []
          };
        } else if (!topicsMap[tName].taskId && rowTaskId) {
          topicsMap[tName].taskId = rowTaskId;
        }
        topicsMap[tName].correct += rCor;
        topicsMap[tName].total += rTot;
        topicsMap[tName].blanks += rBlanks;
        topicsMap[tName].penaltyPerWrong = Math.max(topicsMap[tName].penaltyPerWrong, rPen);
        topicsMap[tName].diffWeight += rDiff * (rTot > 0 ? rTot : 1);
        topicsMap[tName].diffWeightCount += rTot > 0 ? rTot : 1;
        topicsMap[tName].timeSpent += rTime;
        topicsMap[tName].timedQuestoes += rTimedQ;
        if (rTot <= 0 && r.score != null && Number.isFinite(Number(r.score))) {
          topicsMap[tName].scores.push(getSafeScore(r, catMaxScore, catMinScore));
        }
      });

      const reconciledTopics = Object.values(topicsMap).map(td => {
        const avgTopicScore = td.scores.length > 0
          ? td.scores.reduce((s, v) => s + v, 0) / td.scores.length
          : null;
        const effPen = Math.max(td.penaltyPerWrong, dayPenalty);
        const effTop = td.total > 0
          ? computeEffectiveScoreRatio(td.correct, td.total, { blanks: td.blanks, penaltyPerWrong: effPen, minScore: 0, maxScore: 100 })
          : null;
        const pct = effTop
          ? Number((effTop.ratio * 100).toFixed(2))
          : (avgTopicScore !== null && catRange > 0 ? ((avgTopicScore - catMinScore) / catRange) * 100 : 0);
        return {
          name: td.name,
          taskId: td.taskId,
          correct: td.correct,
          total: td.total,
          ...(td.blanks > 0 ? { blanks: td.blanks } : {}),
          ...(effTop?.penaltyApplied ? { penaltyPerWrong: effPen } : {}),
          ...(avgTopicScore !== null && td.total <= 0 ? { score: Number(avgTopicScore.toFixed(2)), isPercentage: false } : {}),
          percentage: pct,
          difficulty: td.diffWeightCount > 0 ? Number((td.diffWeight / td.diffWeightCount).toFixed(2)) : 1.0,
          timeSpent: td.timeSpent,
          ...(td.timedQuestoes > 0 ? { timedQuestoes: td.timedQuestoes } : {})
        };
      });

      const dayEff = dayTotal > 0
        ? computeEffectiveScoreRatio(dayCorrect, dayTotal, {
            blanks: dayBlanks,
            penaltyPerWrong: dayPenalty,
            minScore: catMinScore,
            maxScore: catMaxScore,
          })
        : null;
      const computedScore = dayTotal > 0
        ? catMinScore + dayEff.ratio * catRange
        : scoreOnlyRows.reduce((sum, r) => sum + getSafeScore(r, catMaxScore, catMinScore), 0) / scoreOnlyRows.length;

      const remainingBatchIds = Array.from(new Set(
        catRowsForDay.map(r => r?.batchId).filter(Boolean).map(String)
      ));
      const cleanedH = { ...h };
      delete cleanedH.scorePoints;
      delete cleanedH.scorePct;
      delete cleanedH.netPoints;
      delete cleanedH.blanks;
      delete cleanedH.penaltyPerWrong;
      const nextEntry = {
        ...cleanedH,
        correct: dayCorrect,
        total: dayTotal,
        ...(dayEff && dayEff.blanks > 0 ? { blanks: dayEff.blanks } : {}),
        ...(dayEff && dayEff.penaltyApplied ? { penaltyPerWrong: dayPenalty, netPoints: dayEff.netPoints } : {}),
        isPercentage: false,
        score: Math.min(catMaxScore, Math.max(catMinScore, Number(computedScore.toFixed(2)))),
        difficulty: diffRowSum > 0 ? (Number((totalDiffWeight / diffRowSum).toFixed(2)) || 1.0) : 1.0,
        timeSpent: dayTimeSpent,
        timedQuestoes: dayTimedQuestoes,
        topics: reconciledTopics
      };
      if (remainingBatchIds.length > 0) {
        nextEntry.batchId = remainingBatchIds[remainingBatchIds.length - 1];
        nextEntry.batchIds = remainingBatchIds;
      } else {
        delete nextEntry.batchId;
        delete nextEntry.batchIds;
      }
      return nextEntry;
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

      if (affectedCategorySet.size > 0) {
        const updatedCounts = computeCategorySimCounts(
          activeData.categories,
          activeData.simulados,
          activeData.simuladoRows,
          { maxScore: activeData.maxScore, minScore: activeData.minScore }
        );
        const toSafeKey = (v) => {
          const safe = getSafeId(v);
          return safe && safe !== 'task-null-sentinel' ? String(safe).trim() : '';
        };
        const staleKeys = new Set();
        activeData.categories.forEach(c => {
          if (!c || !affectedCategorySet.has(c.id || c.name)) return;
          const countInfo = updatedCounts.find(item => (c.id && item.id === c.id) || item.name === c.name);
          if (countInfo && countInfo.count < (countInfo.target || 8)) {
            [c.id, c.name].filter(Boolean).forEach(v => {
              const raw = String(v).trim();
              if (!raw) return;
              staleKeys.add(raw.toLowerCase());
              staleKeys.add(toSafeKey(raw).toLowerCase());
              staleKeys.add(getCalibrationKey(raw).toLowerCase());
              staleKeys.add(normalize(raw));
            });
          }
        });
        if (staleKeys.size > 0) {
          const isStaleKey = (k) => {
            if (!k) return false;
            const s = String(k).trim();
            return staleKeys.has(s.toLowerCase()) ||
              staleKeys.has(toSafeKey(s).toLowerCase()) ||
              staleKeys.has(getCalibrationKey(s).toLowerCase()) ||
              staleKeys.has(normalize(s));
          };
          if (activeData.calibrationHistoryByCategory && typeof activeData.calibrationHistoryByCategory === 'object') {
            Object.keys(activeData.calibrationHistoryByCategory).forEach(k => {
              if (isStaleKey(k)) delete activeData.calibrationHistoryByCategory[k];
            });
          }
          if (activeData.calibrationOps && typeof activeData.calibrationOps === 'object') {
            Object.keys(activeData.calibrationOps).forEach(k => {
              if (isStaleKey(k)) delete activeData.calibrationOps[k];
            });
          }
          if (Array.isArray(activeData.calibrationAuditLog)) {
            activeData.calibrationAuditLog = activeData.calibrationAuditLog.filter(
              entry => entry && !isStaleKey(entry.categoryId || entry.categoryName || entry.category)
            );
          }
        }
      }
    }

const nowIso = new Date().toISOString();
activeData.lastUpdated = nowIso;
state.appState.version = (state.appState.version || 0) + 1;
state.appState.lastUpdated = nowIso;
markStorageDirty();
  }),
});

