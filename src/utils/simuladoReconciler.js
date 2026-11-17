import { computeCategoryStats } from '../engine/stats.js';
import { getSafeScore } from './scoreHelper.js';
import { getDateKey, normalizeDate, toDateMs } from './dateHelper.js';
import { normalize, aliases } from './normalization.js';
import { safeClone } from './safeClone.js';

export const DEFAULT_SIMULADO_HISTORY_CAP = 150;

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
    const prev = incomingByKey.get(key) || {
      name,
      correct: 0,
      total: 0,
      score: topic?.score,
      isPercentage: !!topic?.isPercentage
    };
    prev.correct += Math.max(0, Number(topic?.correct) || 0);
    prev.total += Math.max(0, Number(topic?.total) || 0);
    incomingByKey.set(key, prev);
  });

  const merged = new Map();
  safeOld.forEach((topic) => {
    const name = String(topic?.name ?? topic?.topic ?? topic ?? '').trim();
    if (!name) return;
    const key = normalize(name);
    const curTotal = Math.max(0, Number(topic?.total) || 0);
    const curCorrect = Math.max(0, Number(topic?.correct) || 0);
    const prev = merged.get(key);
    if (!prev || curTotal > prev.total) {
      merged.set(key, {
        name,
        correct: curCorrect,
        total: curTotal,
        score: topic?.score,
        isPercentage: !!topic?.isPercentage
      });
    }
  });

  incomingByKey.forEach((inc, key) => {
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, inc);
      return;
    }
    if (inc.total >= existing.total) {
      merged.set(key, {
        ...existing,
        name: existing.name || inc.name,
        correct: inc.correct,
        total: inc.total,
        score: inc.score ?? existing.score,
        isPercentage: inc.total > 0 ? inc.isPercentage : existing.isPercentage
      });
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
  contestMinScore = 0
) {
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : Object.values(categoriesRaw || {});
  const simuladoRows = Array.isArray(simuladoRowsRaw) ? simuladoRowsRaw : Object.values(simuladoRowsRaw || {});
  if (!categories.length) return [];

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
      if (!r) return false;
      if (r.categoryId) return r.categoryId === cat.id;
      const subNorm = normalize(r.subject);
      if (!subNorm) return false;
      return subNorm === catNorm || catAliases.some(a => normalize(a) === subNorm);
    });

    const rowsByDate = {};
    myRows.forEach((r) => {
      const dateKey = safeDateKey(r.date || r.createdAt);
      if (!dateKey) return;
      if (!rowsByDate[dateKey]) rowsByDate[dateKey] = [];
      const rowTotal = Math.max(0, Number(r.total) || 0);
      const rowCorrect = Math.min(rowTotal, Math.max(0, Number(r.correct) || 0));
      rowsByDate[dateKey].push({
        name: r.topic || 'Geral',
        correct: rowCorrect,
        total: rowTotal,
        score: r.score,
        isPercentage: !!r.isPercentage
      });
    });

    const existingStats = cat.simuladoStats || {};
    const existingHistoryRaw = existingStats.history;
    const existingHistory = Array.isArray(existingHistoryRaw)
      ? existingHistoryRaw
      : Object.values(existingHistoryRaw || {});

    const mergedHistoryMap = {};
    existingHistory.forEach((h) => {
      const dateKey = safeDateKey(h?.date);
      if (!dateKey) return;
      mergedHistoryMap[dateKey] = {
        date: dateKey,
        correct: h.correct,
        total: h.total,
        score: h.score,
        isPercentage: !!h.isPercentage,
        topics: Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {})
      };
    });

    const { maxScore: catMax, minScore: catMin, range: catRange } = resolveCategoryScoreDomain(
      cat,
      contestMaxScore,
      contestMinScore
    );

    Object.entries(rowsByDate).forEach(([dateKey, topics]) => {
      const totalC = topics.reduce((s, t) => s + t.correct, 0);
      const totalQ = topics.reduce((s, t) => s + t.total, 0);
      const scoredTopics = topics.filter(t => t.score != null && String(t.score).trim() !== '' && Number.isFinite(Number(t.score)));
      const calcScore = totalQ > 0
        ? catMin + (totalC / totalQ) * catRange
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
          topics: []
        };
      }

      const entry = mergedHistoryMap[dateKey];
      const prevEntryTotal = Math.max(0, Number(entry.total) || 0);
      const prevEntryCorrect = Math.max(0, Number(entry.correct) || 0);
      entry.topics = reconcileDayTopics(entry.topics, topics);
      const combinedC = entry.topics.reduce((s, t) => s + (Number(t.correct) || 0), 0);
      const combinedQ = entry.topics.reduce((s, t) => s + (Number(t.total) || 0), 0);

      if (combinedQ > 0 && combinedQ >= prevEntryTotal) {
        entry.correct = combinedC;
        entry.total = combinedQ;
        entry.score = catMin + (entry.correct / entry.total) * catRange;
        entry.isPercentage = false;
      } else if (prevEntryTotal > 0) {
        entry.correct = prevEntryCorrect;
        entry.total = prevEntryTotal;
        if (entry.score == null || !Number.isFinite(Number(entry.score))) {
          entry.score = catMin + (prevEntryCorrect / prevEntryTotal) * catRange;
          entry.isPercentage = false;
        }
      } else if (totalQ > 0) {
        entry.correct = totalC;
        entry.total = totalQ;
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

    cat.simuladoStats = {
      ...existingStats,
      history: rebuiltHistory
    };
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
