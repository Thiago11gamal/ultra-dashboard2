import { computeCategoryStats } from '../engine/stats.js';
import { getSafeScore, isPhantomZeroTimeAttempt } from './scoreHelper.js';
import { computeEffectiveScoreRatio } from './measurement.js';
import { getDateKey, normalizeDate, toDateMs } from './dateHelper.js';
import { normalize, aliases, isSubjectMatch } from './normalization.js';
import { displaySubject } from './displaySubject.js';
import { safeClone } from './safeClone.js';

export const DEFAULT_SIMULADO_HISTORY_CAP = 150;

export function isRealSimuladoRow(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.valid === false || row.validated === false) return false;
  if (row.source === 'manual-error-notebook') return false;
  return true;
}

export function getSimuladoRowTotal(row) {
  const n = Number(row?.total ?? row?.questoes ?? row?.totalQuestoes ?? row?.questions);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function getSimuladoRowCorrect(row) {
  const total = getSimuladoRowTotal(row);
  const raw = Number(row?.correct ?? row?.acertos ?? row?.correctCount);
  const safe = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
  return total > 0 ? Math.min(safe, total) : safe;
}

/**
 * Reconcilia tópicos de um mesmo dia entre histórico agregado e simuladoRows
 * sem somar entradas duplicadas do mesmo tópico no mesmo dia.
 */
export function reconcileDayTopics(oldTopics = [], incomingTopics = []) {
  const safeOld = Array.isArray(oldTopics)
    ? oldTopics
    : Object.values(oldTopics || {});

  const safeIncoming = Array.isArray(incomingTopics)
    ? incomingTopics
    : Object.values(incomingTopics || {});

  const incomingByKey = new Map();
  safeIncoming.forEach((topic) => {
    const name = String(topic?.name ?? topic?.topic ?? topic ?? '').trim();
    if (!name) return;
    const key = normalize(name);
    const incTaskId = topic?.taskId ?? topic?.topicId ?? null;
    const prev = incomingByKey.get(key) || {
      name,
      ...(incTaskId ? { taskId: incTaskId } : {}),
      correct: 0,
      total: 0,
      blanks: 0,
      penaltyPerWrong: 0,
      timeSpent: 0,
      timedQuestoes: 0,
      _diffWeightSum: 0,
      _diffWeightTotal: 0,
      score: topic?.score,
      isPercentage: !!topic?.isPercentage,
      _rowCount: 0,
      _scoreSum: 0,
      _scoreCount: 0,
    };
    if (!prev.taskId && incTaskId) prev.taskId = incTaskId;
    const incTotal = Math.max(0, Number(topic?.total) || 0);
    const incCorrect = Math.min(incTotal, Math.max(0, Number(topic?.correct) || 0));
    const incBlanks = Math.min(Math.max(0, incTotal - incCorrect), Math.max(0, Number(topic?.blanks) || 0));
    const incPenalty = Math.max(0, Number(topic?.penaltyPerWrong) || 0);
    const incTime = Math.max(0, Number(topic?.timeSpent) || 0);
    const incTimedQ = incTime > 0
      ? (Number(topic?.timedQuestoes) > 0 ? Math.max(0, Number(topic.timedQuestoes)) : incTotal)
      : 0;
    const incDiff = Number(topic?.difficulty);
    if (Number.isFinite(incDiff) && incDiff > 0) {
      const w = incTotal > 0 ? incTotal : 1;
      prev._diffWeightSum += incDiff * w;
      prev._diffWeightTotal += w;
    }
    prev.correct += incCorrect;
    prev.total += incTotal;
    prev.blanks += incBlanks;
    prev.penaltyPerWrong = Math.max(prev.penaltyPerWrong || 0, incPenalty);
    prev.timeSpent += incTime;
    prev.timedQuestoes += incTimedQ;
    prev._rowCount += 1;
    if (topic?.score !== undefined && topic?.score !== null && String(topic.score).trim() !== '' && Number.isFinite(Number(topic.score))) {
      prev._scoreSum += Number(topic.score);
      prev._scoreCount += 1;
    }
    if (prev._rowCount > 1) {
      prev.score = prev.total > 0
        ? undefined
        : (prev._scoreCount > 0 ? prev._scoreSum / prev._scoreCount : prev.score);
    }
    incomingByKey.set(key, prev);
  });

  const merged = new Map();
  safeOld.forEach((topic) => {
    const name = String(topic?.name ?? topic?.topic ?? topic ?? '').trim();
    if (!name) return;
    const key = normalize(name);
    const curTotal = Math.max(0, Number(topic?.total) || 0);
    const curCorrect = Math.min(curTotal, Math.max(0, Number(topic?.correct) || 0));
    const curBlanks = Math.min(Math.max(0, curTotal - curCorrect), Math.max(0, Number(topic?.blanks) || 0));
    const curPenalty = Math.max(0, Number(topic?.penaltyPerWrong) || 0);
    const curTaskId = topic?.taskId ?? topic?.topicId ?? null;
    const curTime = Math.max(0, Number(topic?.timeSpent) || 0);
    const curTimedQ = curTime > 0
      ? (Number(topic?.timedQuestoes) > 0 ? Math.max(0, Number(topic.timedQuestoes)) : curTotal)
      : 0;
    const curDiff = Number(topic?.difficulty);
    const curEff = curTotal > 0
      ? computeEffectiveScoreRatio(curCorrect, curTotal, { blanks: curBlanks, penaltyPerWrong: curPenalty, minScore: 0, maxScore: 100 })
      : null;
    const curPct = curEff ? Number((curEff.ratio * 100).toFixed(2)) : (Number.isFinite(Number(topic?.percentage)) ? Number(topic.percentage) : undefined);
    const prev = merged.get(key);
    if (!prev || curTotal > prev.total) {
      merged.set(key, {
        name,
        ...(curTaskId || prev?.taskId ? { taskId: curTaskId || prev?.taskId } : {}),
        correct: curCorrect,
        total: curTotal,
        ...(curBlanks > 0 ? { blanks: curBlanks } : {}),
        ...(curPenalty > 0 ? { penaltyPerWrong: curPenalty } : {}),
        ...(curTime > 0 ? { timeSpent: curTime, timedQuestoes: curTimedQ } : {}),
        ...(Number.isFinite(curDiff) && curDiff > 0 ? { difficulty: Number(curDiff.toFixed(2)) } : {}),
        ...(curPct !== undefined ? { percentage: curPct } : {}),
        score: topic?.score,
        isPercentage: !!topic?.isPercentage
      });
    } else if (!prev.taskId && curTaskId) {
      prev.taskId = curTaskId;
    }
  });

  incomingByKey.forEach((inc, key) => {
    const existing = merged.get(key);
    const incDiff = inc._diffWeightTotal > 0 ? Number((inc._diffWeightSum / inc._diffWeightTotal).toFixed(2)) : undefined;
    const incEff = inc.total > 0
      ? computeEffectiveScoreRatio(inc.correct, inc.total, { blanks: inc.blanks, penaltyPerWrong: inc.penaltyPerWrong, minScore: 0, maxScore: 100 })
      : null;
    const incPct = incEff ? Number((incEff.ratio * 100).toFixed(2)) : undefined;
    const cleanInc = {
      name: inc.name,
      ...(inc.taskId ? { taskId: inc.taskId } : {}),
      correct: inc.correct,
      total: inc.total,
      ...(inc.blanks > 0 ? { blanks: inc.blanks } : {}),
      ...(inc.penaltyPerWrong > 0 ? { penaltyPerWrong: inc.penaltyPerWrong } : {}),
      ...(inc.timeSpent > 0 ? { timeSpent: inc.timeSpent, timedQuestoes: inc.timedQuestoes } : {}),
      ...(incDiff !== undefined ? { difficulty: incDiff } : {}),
      ...(incPct !== undefined ? { percentage: incPct } : {}),
      score: inc.score,
      isPercentage: inc.isPercentage,
    };
    if (!existing) {
      merged.set(key, cleanInc);
      return;
    }
    if (inc.total >= existing.total) {
      const nextTime = Math.max(inc.timeSpent || 0, existing.timeSpent || 0);
      const nextTimedQ = Math.max(inc.timedQuestoes || 0, existing.timedQuestoes || 0);
      merged.set(key, {
        ...existing,
        ...cleanInc,
        name: existing.name || inc.name,
        ...(inc.taskId || existing.taskId ? { taskId: inc.taskId || existing.taskId } : {}),
        ...(nextTime > 0 ? { timeSpent: nextTime, timedQuestoes: nextTimedQ } : {}),
        ...(incDiff !== undefined || existing.difficulty !== undefined ? { difficulty: incDiff ?? existing.difficulty } : {}),
        score: inc.score ?? existing.score,
        isPercentage: inc.total > 0 ? inc.isPercentage : existing.isPercentage
      });
    } else {
      if (!existing.taskId && inc.taskId) existing.taskId = inc.taskId;
      if ((inc.timeSpent || 0) > (existing.timeSpent || 0)) {
        existing.timeSpent = inc.timeSpent;
        existing.timedQuestoes = Math.max(inc.timedQuestoes || 0, existing.timedQuestoes || 0);
      }
    }
  });

  return [...merged.values()];
}

export function resolveCategoryScoreDomain(category, contestMaxScore = 100, contestMinScore = 0) {
  const catMax = Number.isFinite(Number(category?.maxScore)) && Number(category.maxScore) > 0
    ? Number(category.maxScore)
    : (Number.isFinite(Number(contestMaxScore)) && Number(contestMaxScore) > 0 ? Number(contestMaxScore) : 100);
  const rawCatMin = category?.minScore;
  const hasCatMin = rawCatMin !== undefined && rawCatMin !== null && String(rawCatMin).trim() !== '' && Number.isFinite(Number(rawCatMin));
  const rawContestMin = contestMinScore;
  const hasContestMin = rawContestMin !== undefined && rawContestMin !== null && String(rawContestMin).trim() !== '' && Number.isFinite(Number(rawContestMin));
  const catMin = hasCatMin
    ? Math.min(Number(rawCatMin), catMax)
    : (hasContestMin ? Math.min(Number(rawContestMin), catMax) : 0);
  return {
    maxScore: catMax,
    minScore: catMin,
    range: Math.max(1e-9, catMax - catMin)
  };
}

/**
 * Ordena cronologicamente, limita opcionalmente e recalcula estatísticas de uma categoria.
 */
export function computeCategorySimuladoStats(
  category,
  historyList = [],
  contestMaxScore = 100,
  contestMinScore = 0,
  options = {}
) {
  const { maxScore, minScore, range } = resolveCategoryScoreDomain(category, contestMaxScore, contestMinScore);
  const rawArr = Array.isArray(historyList) ? historyList : Object.values(historyList || {});
  const sorted = [...rawArr]
    .filter(Boolean)
    .sort((a, b) => (toDateMs(a?.date || a?.createdAt) || 0) - (toDateMs(b?.date || b?.createdAt) || 0));

  const maxHistory = Number.isFinite(Number(options.maxHistory)) && Number(options.maxHistory) > 0
    ? Number(options.maxHistory)
    : 0;
  const finalHistory = maxHistory > 0 ? sorted.slice(-maxHistory) : sorted;

  const weight = Number(category?.weight) > 0 ? Number(category.weight) : 10;
  const statsResult = finalHistory.length > 0
    ? computeCategoryStats(finalHistory, weight, 60, maxScore, minScore)
    : null;

  const lastEntry = finalHistory.length > 0 ? finalHistory[finalHistory.length - 1] : null;
  const lastScoreRaw = lastEntry ? getSafeScore(lastEntry, maxScore, minScore) : NaN;
  let lastAttempt = minScore;
  if (Number.isFinite(lastScoreRaw)) {
    lastAttempt = Number(lastScoreRaw.toFixed(2));
  } else if (lastEntry) {
    const lTot = getSimuladoRowTotal(lastEntry);
    const lCor = getSimuladoRowCorrect(lastEntry);
    if (lTot > 0) {
      lastAttempt = Number((minScore + (lCor / lTot) * range).toFixed(2));
    } else if (lastEntry.score != null && Number.isFinite(Number(lastEntry.score))) {
      lastAttempt = Number(Number(lastEntry.score).toFixed(2));
    }
  }

  return {
    ...(category?.simuladoStats && typeof category.simuladoStats === 'object' ? category.simuladoStats : {}),
    history: finalHistory,
    average: statsResult ? Number((statsResult.mean || 0).toFixed(2)) : 0,
    trend: statsResult?.trend || 'stable',
    lastAttempt,
    level: statsResult?.level || 'BAIXO'
  };
}

/**
 * Reconcilia categorias e simuladoRows para visualizações detalhadas por assunto/Pareto.
 */
export function reconcileContestCategoriesHistory(
  categoriesRaw,
  simuladoRowsRaw,
  contestMaxScore = 100,
  contestMinScore = 0,
  options = {}
) {
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : Object.values(categoriesRaw || {});
  const simuladoRows = Array.isArray(simuladoRowsRaw) ? simuladoRowsRaw : Object.values(simuladoRowsRaw || {});
  if (!categories.length) return [];
  const contestPenalty = Math.max(0, Number(options?.penaltyPerWrong) || 0);

  let newCats;
  try {
    newCats = safeClone(categories, null);
    if (!Array.isArray(newCats)) newCats = categories.map(c => ({ ...c }));
  } catch {
    newCats = categories.map(c => ({ ...c }));
  }

  const safeDateKey = (raw) => {
    const key = getDateKey(raw);
    return key && typeof key === 'string' && key.trim() !== '' ? key : null;
  };

  newCats.forEach((cat) => {
    const catNorm = normalize(cat.name);
    const catAliases = aliases[catNorm] || [];
    const myRows = simuladoRows.filter((r) => {
      if (!isRealSimuladoRow(r)) return false;
      if (r.categoryId && cat.id) return String(r.categoryId) === String(cat.id);
      const rawSub = r.subject || r.categoryName || r.materia || r.disciplina || '';
      const subNorm = normalize(rawSub);
      if (!subNorm) return false;
      return subNorm === catNorm || catAliases.some(a => normalize(a) === subNorm) || isSubjectMatch(rawSub, cat.name);
    });

    const rowsByDate = {};
    const rowBatchIdsByDate = {};
    const rowMetaByDate = {};
    myRows.forEach((r) => {
      const dateKey = safeDateKey(r.date || r.createdAt);
      if (!dateKey) return;
      if (!rowsByDate[dateKey]) rowsByDate[dateKey] = [];
      if (!rowMetaByDate[dateKey]) rowMetaByDate[dateKey] = { timeSpent: 0, timedQuestoes: 0, diffSum: 0, diffWeight: 0 };
      if (r.batchId) {
        if (!rowBatchIdsByDate[dateKey]) rowBatchIdsByDate[dateKey] = new Set();
        rowBatchIdsByDate[dateKey].add(String(r.batchId));
      }
      const rowTotal = getSimuladoRowTotal(r);
      const rowCorrect = getSimuladoRowCorrect(r);
      const rowBlanks = Math.min(Math.max(0, rowTotal - rowCorrect), Math.max(0, Number(r.blanks) || 0));
      const rowPenalty = Math.max(0, Number(r.penaltyPerWrong) || 0);
      const rowTime = Math.max(0, Number(r.timeSpent) || 0);
      const rowTimedQ = rowTime > 0
        ? (Number(r.timedQuestoes) > 0 ? Math.max(0, Number(r.timedQuestoes)) : rowTotal)
        : 0;
      const rowDiff = Number(r.difficulty);
      const rowTaskId = r.taskId ?? r.topicId ?? null;
      rowMetaByDate[dateKey].timeSpent += rowTime;
      rowMetaByDate[dateKey].timedQuestoes += rowTimedQ;
      if (Number.isFinite(rowDiff) && rowDiff > 0) {
        const w = rowTotal > 0 ? rowTotal : 1;
        rowMetaByDate[dateKey].diffSum += rowDiff * w;
        rowMetaByDate[dateKey].diffWeight += w;
      }
      rowsByDate[dateKey].push({
        name: String(r.topic || '').trim() || 'Geral',
        ...(rowTaskId ? { taskId: rowTaskId } : {}),
        correct: rowCorrect,
        total: rowTotal,
        ...(rowBlanks > 0 ? { blanks: rowBlanks } : {}),
        ...(rowPenalty > 0 ? { penaltyPerWrong: rowPenalty } : {}),
        ...(rowTime > 0 ? { timeSpent: rowTime, timedQuestoes: rowTimedQ } : {}),
        ...(Number.isFinite(rowDiff) && rowDiff > 0 ? { difficulty: rowDiff } : {}),
        score: r.score,
        isPercentage: !!r.isPercentage
      });
    });

    const existingStats = cat.simuladoStats || {};
    const existingHistoryRaw = existingStats.history;
    const existingHistory = Array.isArray(existingHistoryRaw)
      ? existingHistoryRaw
      : Object.values(existingHistoryRaw || {});

    const { maxScore: catMax, minScore: catMin, range: catRange } = resolveCategoryScoreDomain(
      cat,
      contestMaxScore,
      contestMinScore
    );

    const mergedHistoryMap = {};
    existingHistory.forEach((h) => {
      if (!h || h.valid === false || h.validated === false) return;
      const dateKey = safeDateKey(h?.date || h?.createdAt);
      if (!dateKey) return;
      const existingBatches = Array.from(new Set([
        ...(h.batchId ? [String(h.batchId)] : []),
        ...(Array.isArray(h.batchIds) ? h.batchIds.filter(Boolean).map(String) : [])
      ]));
      const hBlanks = Math.max(0, Number(h.blanks) || 0);
      const hPenalty = Math.max(0, Number(h.penaltyPerWrong) || 0);
      const hTopics = Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {});
      const hTotal = Math.max(0, Number(h.total) || 0);
      const hCorrect = Math.min(hTotal > 0 ? hTotal : Infinity, Math.max(0, Number(h.correct) || 0));
      const hTime = Math.max(0, Number(h.timeSpent) || 0);
      const hTimedQ = hTime > 0
        ? (Number(h.timedQuestoes) > 0 ? Math.max(0, Number(h.timedQuestoes)) : hTotal)
        : 0;
      const hDiff = Number(h.difficulty);

      const prev = mergedHistoryMap[dateKey];
      if (!prev) {
        mergedHistoryMap[dateKey] = {
          ...(h.id ? { id: h.id } : {}),
          ...(existingBatches.length > 0 ? { batchId: h.batchId || existingBatches[existingBatches.length - 1], batchIds: existingBatches } : {}),
          date: dateKey,
          correct: h.correct,
          total: h.total,
          ...(hBlanks > 0 ? { blanks: hBlanks } : {}),
          ...(hPenalty > 0 ? { penaltyPerWrong: hPenalty } : {}),
          ...(h.netPoints !== undefined ? { netPoints: h.netPoints } : {}),
          ...(hTime > 0 ? { timeSpent: hTime, timedQuestoes: hTimedQ } : {}),
          ...(Number.isFinite(hDiff) && hDiff > 0 ? { difficulty: hDiff } : {}),
          ...(h.syntheticVolume ? { syntheticVolume: true } : {}),
          score: h.score,
          isPercentage: !!h.isPercentage,
          valid: true,
          validated: true,
          topics: hTopics
        };
      } else {
        const mergedBatches = Array.from(new Set([
          ...(Array.isArray(prev.batchIds) ? prev.batchIds : []),
          ...existingBatches
        ]));
        if (mergedBatches.length > 0) {
          prev.batchId = prev.batchId || mergedBatches[mergedBatches.length - 1];
          prev.batchIds = mergedBatches;
        }
        const prevTot = Math.max(0, Number(prev.total) || 0);
        const prevCorr = Math.min(prevTot > 0 ? prevTot : Infinity, Math.max(0, Number(prev.correct) || 0));
        const combTot = prevTot + hTotal;
        const combCorr = prevCorr + hCorrect;
        const combBlanks = (Math.max(0, Number(prev.blanks) || 0)) + hBlanks;
        const combPenalty = Math.max(Number(prev.penaltyPerWrong) || 0, hPenalty, contestPenalty);
        const combTime = (Math.max(0, Number(prev.timeSpent) || 0)) + hTime;
        const combTimedQ = (Math.max(0, Number(prev.timedQuestoes) || 0)) + hTimedQ;
        if (combTime > 0) {
          prev.timeSpent = combTime;
          prev.timedQuestoes = combTimedQ;
        }
        prev.topics = reconcileDayTopics(prev.topics, hTopics);
        if (combTot > 0) {
          const eff = computeEffectiveScoreRatio(combCorr, combTot, {
            blanks: combBlanks,
            penaltyPerWrong: combPenalty,
            minScore: catMin,
            maxScore: catMax,
          });
          prev.total = combTot;
          prev.correct = combCorr;
          if (eff.blanks > 0) prev.blanks = eff.blanks;
          if (eff.penaltyApplied) {
            prev.netPoints = eff.netPoints;
            prev.penaltyPerWrong = combPenalty;
          }
          prev.score = catMin + eff.ratio * catRange;
          prev.isPercentage = false;
        } else {
          const prevSc = getSafeScore(prev, catMax, catMin);
          const nextSc = getSafeScore(h, catMax, catMin);
          const prevCount = Number(prev._directScoreCount) || (Number.isFinite(prevSc) ? 1 : 0);
          const prevSum = Number.isFinite(Number(prev._directScoreSum)) ? Number(prev._directScoreSum) : (Number.isFinite(prevSc) ? prevSc : 0);
          if (prevCount > 0 && Number.isFinite(nextSc)) {
            prev._directScoreSum = prevSum + nextSc;
            prev._directScoreCount = prevCount + 1;
            prev.score = prev._directScoreSum / prev._directScoreCount;
            prev.isPercentage = false;
          } else if (Number.isFinite(nextSc)) {
            prev._directScoreSum = nextSc;
            prev._directScoreCount = 1;
            prev.score = nextSc;
            prev.isPercentage = false;
          }
        }
      }
    });

    Object.entries(rowsByDate).forEach(([dateKey, topics]) => {
      const dayMeta = rowMetaByDate[dateKey] || { timeSpent: 0, timedQuestoes: 0, diffSum: 0, diffWeight: 0 };
      const totalC = topics.reduce((s, t) => s + t.correct, 0);
      const totalQ = topics.reduce((s, t) => s + t.total, 0);
      const totalBlanks = topics.reduce((s, t) => s + (Number(t.blanks) || 0), 0);
      const topicMaxPenalty = topics.reduce((m, t) => Math.max(m, Number(t.penaltyPerWrong) || 0), 0);
      const scoredTopics = topics.filter(t => t.score != null && String(t.score).trim() !== '' && Number.isFinite(Number(t.score)));
      const basePenalty = Math.max(contestPenalty, topicMaxPenalty);
      const baseEff = computeEffectiveScoreRatio(totalC, totalQ, {
        blanks: totalBlanks,
        penaltyPerWrong: basePenalty,
        minScore: catMin,
        maxScore: catMax,
      });
      const calcScore = totalQ > 0
        ? catMin + baseEff.ratio * catRange
        : (scoredTopics.length > 0
          ? scoredTopics.reduce((sum, t) => sum + getSafeScore(t, catMax, catMin), 0) / scoredTopics.length
          : catMin);

      if (!mergedHistoryMap[dateKey]) {
        mergedHistoryMap[dateKey] = {
          date: dateKey,
          correct: 0,
          total: 0,
          score: calcScore,
          isPercentage: false,
          valid: true,
          validated: true,
          topics: []
        };
      }

      const entry = mergedHistoryMap[dateKey];
      const mergedBatchIds = Array.from(new Set([
        ...(entry.batchId ? [String(entry.batchId)] : []),
        ...(Array.isArray(entry.batchIds) ? entry.batchIds.filter(Boolean).map(String) : []),
        ...Array.from(rowBatchIdsByDate[dateKey] || [])
      ]));
      if (mergedBatchIds.length > 0) {
        entry.batchId = entry.batchId || mergedBatchIds[mergedBatchIds.length - 1];
        entry.batchIds = mergedBatchIds;
      }
      const prevEntryTotal = Math.max(0, Number(entry.total) || 0);
      const prevEntryCorrect = Math.max(0, Number(entry.correct) || 0);
      const prevEntryBlanks = Math.max(0, Number(entry.blanks) || 0);
      const prevEntryPenalty = Math.max(0, Number(entry.penaltyPerWrong) || 0);
      entry.topics = reconcileDayTopics(entry.topics, topics);
      const nextTimeSpent = Math.max(Number(entry.timeSpent) || 0, dayMeta.timeSpent || 0);
      const nextTimedQuestoes = Math.max(Number(entry.timedQuestoes) || 0, dayMeta.timedQuestoes || 0);
      if (nextTimeSpent > 0) {
        entry.timeSpent = nextTimeSpent;
        entry.timedQuestoes = nextTimedQuestoes;
      }
      if (dayMeta.diffWeight > 0 && !(Number(entry.difficulty) > 0)) {
        entry.difficulty = Number((dayMeta.diffSum / dayMeta.diffWeight).toFixed(2));
      }
      const combinedC = entry.topics.reduce((s, t) => s + (Number(t.correct) || 0), 0);
      const combinedQ = entry.topics.reduce((s, t) => s + (Number(t.total) || 0), 0);
      const combinedTopicBlanks = entry.topics.reduce((s, t) => s + (Number(t.blanks) || 0), 0);
      const combinedBlanks = Math.max(combinedTopicBlanks, totalBlanks, prevEntryBlanks);
      const effectivePenalty = Math.max(
        basePenalty,
        prevEntryPenalty,
        entry.topics.reduce((m, t) => Math.max(m, Number(t.penaltyPerWrong) || 0), 0)
      );

      if (combinedQ > 0 && combinedQ >= prevEntryTotal) {
        const eff = computeEffectiveScoreRatio(combinedC, combinedQ, {
          blanks: combinedBlanks,
          penaltyPerWrong: effectivePenalty,
          minScore: catMin,
          maxScore: catMax,
        });
        entry.correct = combinedC;
        entry.total = combinedQ;
        if (eff.blanks > 0) entry.blanks = eff.blanks;
        if (eff.penaltyApplied) {
          entry.netPoints = eff.netPoints;
          entry.penaltyPerWrong = effectivePenalty;
        }
        entry.score = catMin + eff.ratio * catRange;
        entry.isPercentage = false;
      } else if (prevEntryTotal > 0) {
        entry.correct = prevEntryCorrect;
        entry.total = prevEntryTotal;
        if (entry.score == null || !Number.isFinite(Number(entry.score))) {
          const eff = computeEffectiveScoreRatio(prevEntryCorrect, prevEntryTotal, {
            blanks: prevEntryBlanks,
            penaltyPerWrong: effectivePenalty,
            minScore: catMin,
            maxScore: catMax,
          });
          entry.score = catMin + eff.ratio * catRange;
          entry.isPercentage = false;
        }
      } else if (totalQ > 0) {
        entry.correct = totalC;
        entry.total = totalQ;
        if (baseEff.blanks > 0) entry.blanks = baseEff.blanks;
        if (baseEff.penaltyApplied) {
          entry.netPoints = baseEff.netPoints;
          entry.penaltyPerWrong = basePenalty;
        }
        entry.score = calcScore;
        entry.isPercentage = false;
      } else if (scoredTopics.length > 0) {
        entry.correct = 0;
        entry.total = 0;
        entry.score = Number(calcScore.toFixed(2));
        entry.isPercentage = false;
      }
    });

    Object.values(mergedHistoryMap).forEach((h) => {
      if (!h.topics || h.topics.length === 0) {
        h.topics = [{
          name: 'Geral',
          correct: h.correct,
          total: h.total,
          score: h.score,
          isPercentage: h.isPercentage
        }];
      }
    });

    const rebuiltHistory = Object.values(mergedHistoryMap)
      .sort((a, b) => (toDateMs(a?.date) || 0) - (toDateMs(b?.date) || 0));

    if (rebuiltHistory.length > 0 || existingHistory.length > 0) {
      cat.simuladoStats = computeCategorySimuladoStats(
        cat,
        rebuiltHistory,
        contestMaxScore,
        contestMinScore,
        options
      );
    } else {
      cat.simuladoStats = {
        ...existingStats,
        history: rebuiltHistory
      };
    }
  });

  return newCats;
}

export function sortAndCapHistory(historyList, maxHistory = DEFAULT_SIMULADO_HISTORY_CAP) {
  const arr = Array.isArray(historyList) ? historyList : Object.values(historyList || {});
  const sorted = [...arr].filter(Boolean).sort(
    (a, b) => (toDateMs(normalizeDate(a?.date || a?.createdAt) || a?.date || a?.createdAt) || 0) -
      (toDateMs(normalizeDate(b?.date || b?.createdAt) || b?.date || b?.createdAt) || 0)
  );
  return maxHistory > 0 ? sorted.slice(-maxHistory) : sorted;
}

function resolveEntryCategoryMatch(entry, cat, catName) {
  if (!entry) return false;
  const hasExplicitCatId = entry.categoryId !== undefined && entry.categoryId !== null && String(entry.categoryId).trim() !== '';
  if (cat?.id && hasExplicitCatId) {
    return String(entry.categoryId) === String(cat.id);
  }
  return isSubjectMatch(entry.subject || entry.categoryName || entry.materia || entry.disciplina || '', catName);
}

function isUsableSimEntry(entry, catMax, catMin) {
  if (!entry || entry.valid === false || entry.validated === false || entry.source === 'manual-error-notebook') return false;
  const safeScore = getSafeScore(entry, catMax, catMin);
  if (!Number.isFinite(safeScore)) return false;
  return !isPhantomZeroTimeAttempt(entry, safeScore);
}

/**
 * Conta tentativas únicas de simulado por disciplina sem duplicação entre
 * simuladoStats.history, simulados e simuladoRows (incluindo entradas legadas sem batchId).
 */
export function computeCategorySimCounts(categories = [], rawSimulados = [], rawSimuladoRows = [], options = {}) {
  const safeCategories = Array.isArray(categories) ? categories : Object.values(categories || {});
  const rawSims = Array.isArray(rawSimulados) ? rawSimulados : (rawSimulados ? Object.values(rawSimulados) : []);
  const rawRows = Array.isArray(rawSimuladoRows) ? rawSimuladoRows : (rawSimuladoRows ? Object.values(rawSimuladoRows) : []);

  const contestMaxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const rawContestMin = options.minScore;
  const contestMinScore = (rawContestMin !== undefined && rawContestMin !== null && String(rawContestMin).trim() !== '' && Number.isFinite(Number(rawContestMin)))
    ? Math.min(Number(rawContestMin), contestMaxScore)
    : 0;

  return safeCategories.filter(Boolean).map(cat => {
    const catName = cat.name || cat.id || '';
    const { maxScore: catMax, minScore: catMin } = resolveCategoryScoreDomain(cat, contestMaxScore, contestMinScore);
    const catStatsHistory = Array.isArray(cat.simuladoStats?.history)
      ? cat.simuladoStats.history
      : Object.values(cat.simuladoStats?.history || {});

    const catAttempts = new Set();
    const seenBatches = new Set();
    const seenIds = new Set();
    const priorSourceDates = new Set();
    const unbatchedHistoryDates = new Set();

    catStatsHistory.forEach((h, idx) => {
      if (!isUsableSimEntry(h, catMax, catMin)) return;
      const dStr = getDateKey(h.date || h.createdAt);
      const hasBatchMeta = Boolean(h.batchId) || (Array.isArray(h.batchIds) && h.batchIds.some(Boolean));
      if (h.batchId) seenBatches.add(String(h.batchId));
      if (Array.isArray(h.batchIds)) {
        h.batchIds.forEach(bid => {
          if (bid) seenBatches.add(String(bid));
        });
      }
      if (h.id) seenIds.add(String(h.id));
      if (dStr) {
        priorSourceDates.add(dStr);
        if (!hasBatchMeta && !h.id) {
          unbatchedHistoryDates.add(dStr);
        }
      }
      const dKey = h.batchId ? `b_${h.batchId}` : (h.id ? `id_${h.id}` : `hist_${dStr || 'nodate'}_${idx}`);
      catAttempts.add(dKey);
    });

    const groupedRows = [];
    const rowGroupIndexByKey = new Map();
    rawRows.forEach((entry, idx) => {
      if (!isUsableSimEntry(entry, catMax, catMin)) return;
      if (!resolveEntryCategoryMatch(entry, cat, catName)) return;
      const dStr = getDateKey(entry.date || entry.createdAt);
      const batchStr = entry.batchId ? String(entry.batchId) : '';
      const idStr = entry.id ? String(entry.id) : '';

      // Entradas diárias consolidadas em simuladoStats.history (ex.: Simulados.jsx legado ou repair)
      // já agregam as linhas da mesma data; absorve batchIds/ids sem contar em duplicidade.
      if (dStr && unbatchedHistoryDates.has(dStr)) {
        if (batchStr) seenBatches.add(batchStr);
        if (idStr) seenIds.add(idStr);
        return;
      }

      const gKey = batchStr ? `b:${batchStr}` : (dStr ? `d:${dStr}` : (idStr ? `id:${idStr}` : `idx:${idx}`));
      let group = rowGroupIndexByKey.get(gKey);
      if (!group) {
        group = { batchId: batchStr, dStr, ids: [] };
        rowGroupIndexByKey.set(gKey, group);
        groupedRows.push(group);
      }
      if (idStr) group.ids.push(idStr);
    });

    const simDates = new Set();
    rawSims.forEach((entry, idx) => {
      if (!isUsableSimEntry(entry, catMax, catMin)) return;
      if (!resolveEntryCategoryMatch(entry, cat, catName)) return;
      if (entry.batchId && seenBatches.has(String(entry.batchId))) return;
      if (entry.id && seenIds.has(String(entry.id))) return;
      const dStr = getDateKey(entry.date || entry.createdAt);
      if (!entry.batchId && dStr && priorSourceDates.has(dStr)) return;
      if (entry.batchId) seenBatches.add(String(entry.batchId));
      if (entry.id) seenIds.add(String(entry.id));
      if (dStr) simDates.add(dStr);
      const dKey = entry.batchId
        ? `b_${entry.batchId}`
        : (entry.id ? `id_${entry.id}` : `sim_${dStr || 'nodate'}_${idx}`);
      catAttempts.add(dKey);
    });
    simDates.forEach(d => priorSourceDates.add(d));

    groupedRows.forEach((group, idx) => {
      if (group.batchId && seenBatches.has(group.batchId)) return;
      if (group.ids.some(id => seenIds.has(id))) return;
      if (!group.batchId && group.dStr && priorSourceDates.has(group.dStr)) return;
      if (group.batchId) seenBatches.add(group.batchId);
      group.ids.forEach(id => seenIds.add(id));
      if (group.dStr) priorSourceDates.add(group.dStr);
      const dKey = group.batchId
        ? `b_${group.batchId}`
        : (group.ids[0] ? `id_${group.ids[0]}` : `row_${group.dStr || 'nodate'}_${idx}`);
      catAttempts.add(dKey);
    });

    return {
      id: cat.id || catName,
      name: displaySubject(catName, safeCategories),
      count: catAttempts.size,
      target: 8
    };
  }).filter(c => c.name);
}
