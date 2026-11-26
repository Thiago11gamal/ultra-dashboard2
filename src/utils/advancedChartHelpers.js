import { getDateKey, normalizeDate, toDateMs, getAppTimezone } from './dateHelper.js';
import { parseNoonLocal, addDaysNoon } from './parseNoonLocal.js';
import { getSafeScore, getSyntheticTotal, extractTopicsTotals, resolveEffectiveCorrect, isPhantomZeroTimeAttempt } from './scoreHelper.js';
import { normalize, aliases } from './normalization.js';
import { kalmanAbilitySeries } from '../engine/probabilistic/stateSpace.js';
import {
  computeTopicGraphMetrics,
  getKnowledgeGraphForCategory,
  normalizeGraphName,
} from '../engine/probabilistic/knowledgeGraph.js';

const MS_PER_DAY = 86_400_000;

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);

const toFinite = (v, fallback = null) => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function resolveScale(cat, globalMax = 100, globalMin = 0) {
  const gMin = toFinite(globalMin, 0);
  const gMax = Math.max(gMin + 1, toFinite(globalMax, 100));
  const cMax = toFinite(cat?.maxScore, null);
  const cMin = toFinite(cat?.minScore, null);
  const max = cMax !== null && cMax > 0 ? cMax : gMax;
  const min = cMin !== null
    ? Math.min(cMin, max - 1e-6)
    : (gMin < max ? gMin : Math.min(0, max - 1));
  return { min, max, range: Math.max(1e-9, max - min) };
}

function getCutoffMs(timeWindow) {
  if (!timeWindow || timeWindow === 'all') return null;
  const days = Number.parseInt(String(timeWindow), 10);
  if (!Number.isFinite(days) || days <= 0) return null;
  const todayKey = getDateKey(new Date());
  const todayNoon = todayKey ? parseNoonLocal(todayKey) : new Date();
  const cutoffNoon = todayNoon ? addDaysNoon(todayNoon, -days) : null;
  const cutoffKey = cutoffNoon ? getDateKey(cutoffNoon) : null;
  return cutoffKey ? toDateMs(cutoffKey) : null;
}

function getEntryDayMs(rawDate) {
  const dk = getDateKey(rawDate);
  if (!dk) return NaN;
  return toDateMs(dk);
}

function filterDatedEntriesByWindow(entries, getDate, cutoffMs) {
  const todayKey = getDateKey(new Date());
  const todayMs = todayKey ? toDateMs(todayKey) : NaN;
  const withMs = entries.map((item) => ({ item, ms: getEntryDayMs(getDate(item)) }));
  const hasNonFuture = Number.isFinite(todayMs) && withMs.some((e) => Number.isFinite(e.ms) && e.ms <= todayMs);
  return withMs
    .filter((e) => {
      if (!Number.isFinite(e.ms)) return false;
      if (hasNonFuture && e.ms > todayMs) return false;
      if (cutoffMs && e.ms < cutoffMs) return false;
      return true;
    })
    .map((e) => e.item);
}

function matchesCategorySubject(cat, rawSubject) {
  if (!cat || !rawSubject) return false;
  const catNorm = normalize(cat.name);
  const subNorm = normalize(rawSubject);
  if (!catNorm || !subNorm) return false;
  if (catNorm === subNorm) return true;
  const catAliases = aliases[catNorm] || [];
  return catAliases.some((a) => normalize(a) === subNorm);
}

function formatShortBrDate(isoKey) {
  if (!isoKey || typeof isoKey !== 'string') return '';
  const parts = isoKey.split('-');
  if (parts.length !== 3) return isoKey;
  return `${parts[2]}/${parts[1]}`;
}

function quantileSorted(sorted, q) {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = clamp(q, 0, 1) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

// ============================================================================
// #2 — Speed × Accuracy (Tempo por Questão × % de Acerto)
// ============================================================================
export function buildSpeedAccuracyData(categories = [], simuladoRows = [], options = {}) {
  const {
    mode = 'subject',
    showOnlyFocus = false,
    focusSubjectId = null,
    timeWindow = 'all',
    targetScore = 80,
    minScore = 0,
    maxScore = 100,
    idealSecondsPerQuestion = null,
    penaltyPerWrong = 0,
  } = options;

  const cutoffMs = getCutoffMs(timeWindow);
  const gMin = toFinite(minScore, 0);
  const gMax = Math.max(gMin + 1, toFinite(maxScore, 100));
  const rawTargetPct = clamp(((toFinite(targetScore, gMin + 0.8 * (gMax - gMin)) - gMin) / (gMax - gMin)) * 100, 10, 99);
  const roundedTargetPct = Number(rawTargetPct.toFixed(1));
  const globalPenalty = Math.max(0, toFinite(penaltyPerWrong, 0));

  const hasFocusId = focusSubjectId !== null && focusSubjectId !== undefined && String(focusSubjectId).trim() !== '';
  const matchesFocusCat = (cat) => cat?.id !== null && cat?.id !== undefined && String(cat.id) === String(focusSubjectId);
  const allCats = safeArr(categories);
  const cats = (showOnlyFocus && hasFocusId) ? allCats.filter(matchesFocusCat) : allCats;
  const rows = safeArr(simuladoRows).filter((r) => r && r.valid !== false && r.validated !== false);
  const windowedRows = filterDatedEntriesByWindow(rows, (r) => r.date || r.createdAt, cutoffMs);

  const resolveEffectiveTiming = (h, catMax, catMin) => {
    const rootTs = toFinite(h?.timeSpent ?? h?.durationSeconds, 0);
    const explicitTimedQ = toFinite(h?.timedQuestoes, 0);
    const topics = safeArr(h?.topics);
    let topicsTs = 0;
    let topicsTq = 0;
    let allExplicit = true;
    topics.forEach((t) => {
      if (!t || t.valid === false || t.validated === false) return;
      const tTs = toFinite(t?.timeSpent ?? t?.durationSeconds, 0);
      const tExpQ = toFinite(t?.timedQuestoes, 0);
      const tQ = tExpQ > 0 ? tExpQ : toFinite(t?.total ?? t?.questoes ?? t?.totalQuestoes ?? t?.questions, 0);
      if (tTs > 0 && tQ > 0) {
        topicsTs += tTs;
        topicsTq += tQ;
        if (tExpQ <= 0) allExplicit = false;
      }
    });
    const rootAuthoritative = rootTs > 0 && explicitTimedQ > 0 && ((!allExplicit && topicsTq > explicitTimedQ) || topicsTs < rootTs);
    if (topicsTs > 0 && topicsTq > 0 && !rootAuthoritative) {
      return { ts: topicsTs, tq: topicsTq };
    }
    let tot = toFinite(h?.total ?? h?.questoes ?? h?.totalQuestoes ?? h?.questions, 0);
    if (tot <= 0 && h?.topics != null) {
      const tf = extractTopicsTotals(h, catMax, catMin);
      if (tf.total > 0) tot = tf.total;
    }
    const tq = explicitTimedQ > 0 ? explicitTimedQ : (rootTs > 0 ? tot : 0);
    return (rootTs > 0 && tq > 0) ? { ts: rootTs, tq } : { ts: 0, tq: 0 };
  };

  // Compute global pre-focus subject median for auto-benchmark so activating showOnlyFocus never inverts quadrants
  const computeSubjectPoint = (cat) => {
    const { min, max, range } = resolveScale(cat, gMax, gMin);
    const validHistory = safeArr(cat?.simuladoStats?.history)
      .filter((h) => h && h.valid !== false && h.validated !== false);
    const history = filterDatedEntriesByWindow(validHistory, (h) => h.date || h.createdAt, cutoffMs);

    let timeSpent = 0;
    let timedQuestions = 0;
    let totalQuestions = 0;
    let correct = 0;
    let weightedAccNum = 0;
    let weightedAccDen = 0;
    const coveredTimedDates = new Set();

    history.forEach((h) => {
      const dk = getDateKey(h.date || h.createdAt);
      const hWithPen = (h.penaltyPerWrong == null && globalPenalty > 0) ? { ...h, penaltyPerWrong: globalPenalty } : h;
      let tot = toFinite(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions, 0);
      let topicCorrFallback = null;
      if (tot <= 0 && h.topics != null) {
        const tf = extractTopicsTotals(hWithPen, max, min);
        if (tf.total > 0) {
          tot = tf.total;
          topicCorrFallback = tf.correct;
        }
      }
      const timing = resolveEffectiveTiming(h, max, min);
      if (timing.ts > 0 && timing.tq > 0) {
        timeSpent += timing.ts;
        timedQuestions += timing.tq;
        if (dk) coveredTimedDates.add(dk);
      }
      if (tot > 0) {
        const rawCorr = !h.isPercentage
          ? toFinite(h.correct ?? h.acertos ?? h.correctCount, topicCorrFallback)
          : topicCorrFallback;
        const sc = getSafeScore(hWithPen, max, min);
        if (rawCorr === null && !Number.isFinite(sc)) return;
        const corr = resolveEffectiveCorrect(hWithPen, sc, tot, rawCorr !== null, rawCorr, max, min);
        totalQuestions += tot;
        correct += corr;
        weightedAccNum += corr;
        weightedAccDen += tot;
      } else {
        const sc = getSafeScore(hWithPen, max, min);
        if (Number.isFinite(sc) && !isPhantomZeroTimeAttempt(h, sc)) {
          const synTot = getSyntheticTotal(max);
          const ratio = clamp((sc - min) / range, 0, 1);
          weightedAccNum += ratio * synTot;
          weightedAccDen += synTot;
        }
      }
    });

    // Supplement with non-overlapping timed simuladoRows for this category
    windowedRows.forEach((r) => {
      const idMatch = r.categoryId != null && cat?.id != null && String(r.categoryId) === String(cat.id);
      const nameMatch = r.categoryId == null && matchesCategorySubject(cat, r.subject || r.categoryName || r.materia || '');
      if (!idMatch && !nameMatch) return;
      const dk = getDateKey(r.date || r.createdAt);
      if (dk && coveredTimedDates.has(dk)) return;
      const timing = resolveEffectiveTiming(r, max, min);
      if (timing.ts <= 0 || timing.tq <= 0) return;
      const rWithPen = (r.penaltyPerWrong == null && globalPenalty > 0) ? { ...r, penaltyPerWrong: globalPenalty } : r;
      let tot = toFinite(r.total ?? r.questoes ?? r.totalQuestoes ?? r.questions, 0);
      let topicCorrFallback = null;
      if (tot <= 0 && r.topics != null) {
        const tf = extractTopicsTotals(rWithPen, max, min);
        if (tf.total > 0) {
          tot = tf.total;
          topicCorrFallback = tf.correct;
        }
      }
      if (tot <= 0) return;
      const rawCorr = !r.isPercentage ? toFinite(r.correct ?? r.acertos ?? r.correctCount, topicCorrFallback) : topicCorrFallback;
      const sc = getSafeScore(rWithPen, max, min);
      if (rawCorr === null && !Number.isFinite(sc)) return;
      const corr = resolveEffectiveCorrect(rWithPen, sc, tot, rawCorr !== null, rawCorr, max, min);
      timeSpent += timing.ts;
      timedQuestions += timing.tq;
      totalQuestions += tot;
      correct += corr;
      weightedAccNum += corr;
      weightedAccDen += tot;
    });

    if (timedQuestions <= 0) return null;
    const accuracyPct = weightedAccDen > 0
      ? clamp((weightedAccNum / weightedAccDen) * 100, 0, 100)
      : 0;

    return {
      id: cat.id ?? cat.name,
      name: cat.name,
      subtitle: `Peso ${toFinite(cat.weight, 10)}`,
      color: cat.color || '#6366f1',
      weight: toFinite(cat.weight, 10),
      avgSeconds: Number((timeSpent / timedQuestions).toFixed(1)),
      accuracyPct: Number(accuracyPct.toFixed(1)),
      totalQuestions: Math.round(totalQuestions || timedQuestions),
      timedQuestions: Math.round(timedQuestions),
      correct: Math.round(correct),
      totalTimeSeconds: Math.round(timeSpent),
    };
  };

  const allSubjectPoints = allCats.map(computeSubjectPoint).filter(Boolean);
  const points = [];

  if (mode === 'topic') {
    const topicBuckets = new Map();
    const coveredTopicKeys = new Set();
    cats.forEach((cat) => {
      const { min, max } = resolveScale(cat, gMax, gMin);
      const validHistory = safeArr(cat?.simuladoStats?.history)
        .filter((h) => h && h.valid !== false && h.validated !== false);
      const history = filterDatedEntriesByWindow(validHistory, (h) => h.date || h.createdAt, cutoffMs);
      history.forEach((h) => {
        const dk = getDateKey(h.date || h.createdAt) || '';
        const parentPenalty = Math.max(0, toFinite(h.penaltyPerWrong, globalPenalty));
        const topics = safeArr(h.topics);
        topics.forEach((t) => {
          if (!t || typeof t !== 'object' || t.valid === false || t.validated === false) return;
          const ts = toFinite(t.timeSpent ?? t.durationSeconds, 0);
          const tot = toFinite(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions, 0);
          const rawCorr = !t.isPercentage ? toFinite(t.correct ?? t.acertos ?? t.correctCount, null) : null;
          if (ts <= 0 || tot <= 0) return;
          const tEff = {
            ...t,
            ...(t.penaltyPerWrong == null && parentPenalty > 0 ? { penaltyPerWrong: parentPenalty } : {}),
            ...(t.score == null && t.scorePct == null && t.percentage != null ? { scorePct: t.percentage } : {}),
          };
          const sc = getSafeScore(tEff, max, min);
          if (rawCorr === null && !Number.isFinite(sc)) return;
          const corr = resolveEffectiveCorrect(tEff, sc, tot, rawCorr !== null, rawCorr, max, min);
          const label = String(t.name || t.topic || t.assunto || t.title || '').trim();
          if (!label) return;
          const catKey = String(cat.id ?? cat.name);
          const normLabel = normalize(label);
          const key = `${catKey}::${normLabel}`;
          if (dk) coveredTopicKeys.add(`${catKey}|${dk}|${normLabel}`);
          if (!topicBuckets.has(key)) {
            topicBuckets.set(key, {
              id: key,
              name: label,
              categoryName: cat.name,
              color: cat.color || '#6366f1',
              totalQuestions: 0,
              correct: 0,
              timeSpent: 0,
              timedQuestions: 0,
            });
          }
          const b = topicBuckets.get(key);
          b.totalQuestions += tot;
          b.correct += clamp(corr, 0, tot);
          b.timeSpent += ts;
          b.timedQuestions += toFinite(t.timedQuestoes, 0) > 0 ? toFinite(t.timedQuestoes, 0) : tot;
        });
      });
    });

    // Complement with non-overlapping timed simuladoRows (supporting both row.topics and row.topic)
    windowedRows.forEach((r) => {
      const matchedCat = allCats.find(
        (c) =>
          (r.categoryId != null && c?.id != null && String(c.id) === String(r.categoryId)) ||
          (r.categoryId == null && matchesCategorySubject(c, r.subject || r.categoryName || r.materia || ''))
      );
      if (showOnlyFocus && hasFocusId && (!matchedCat || !matchesFocusCat(matchedCat))) return;
      const { min, max } = resolveScale(matchedCat, gMax, gMin);
      const dk = getDateKey(r.date || r.createdAt) || '';
      const catKey = String(matchedCat?.id ?? (r.subject || r.categoryName || 'cat'));
      const rowPenalty = Math.max(0, toFinite(r.penaltyPerWrong, globalPenalty));

      const rowTopics = safeArr(r.topics).filter((t) => t && typeof t === 'object' && t.valid !== false && t.validated !== false);
      const candidateItems = rowTopics.length > 0
        ? rowTopics.map((t) => ({
            ...t,
            penaltyPerWrong: t.penaltyPerWrong ?? rowPenalty,
            label: String(t.name || t.topic || t.assunto || t.title || '').trim(),
          }))
        : [{
            ...r,
            penaltyPerWrong: r.penaltyPerWrong ?? rowPenalty,
            label: String(r.topic || r.assunto || '').trim(),
          }];

      candidateItems.forEach((item) => {
        if (!item.label) return;
        const normLabel = normalize(item.label);
        if (dk && coveredTopicKeys.has(`${catKey}|${dk}|${normLabel}`)) return;
        const ts = toFinite(item.timeSpent ?? item.durationSeconds, 0);
        const tot = toFinite(item.total ?? item.questoes ?? item.totalQuestoes ?? item.questions, 0);
        if (ts <= 0 || tot <= 0) return;
        const itemEff = item.score == null && item.scorePct == null && item.percentage != null
          ? { ...item, scorePct: item.percentage }
          : item;
        const rawCorr = !itemEff.isPercentage ? toFinite(itemEff.correct ?? itemEff.acertos ?? itemEff.correctCount, null) : null;
        const sc = getSafeScore(itemEff, max, min);
        if (rawCorr === null && !Number.isFinite(sc)) return;
        const corr = resolveEffectiveCorrect(itemEff, sc, tot, rawCorr !== null, rawCorr, max, min);
        const key = `${catKey}::${normLabel}`;
        if (!topicBuckets.has(key)) {
          topicBuckets.set(key, {
            id: key,
            name: item.label,
            categoryName: matchedCat?.name || r.subject || r.categoryName || 'Disciplina',
            color: matchedCat?.color || '#6366f1',
            totalQuestions: 0,
            correct: 0,
            timeSpent: 0,
            timedQuestions: 0,
          });
        }
        const b = topicBuckets.get(key);
        b.totalQuestions += tot;
        b.correct += clamp(corr, 0, tot);
        b.timeSpent += ts;
        b.timedQuestions += toFinite(item.timedQuestoes, 0) > 0 ? toFinite(item.timedQuestoes, 0) : tot;
      });
    });

    topicBuckets.forEach((b) => {
      if (b.timedQuestions <= 0 || b.totalQuestions <= 0) return;
      points.push({
        id: b.id,
        name: b.name,
        subtitle: b.categoryName,
        color: b.color,
        avgSeconds: Number((b.timeSpent / b.timedQuestions).toFixed(1)),
        accuracyPct: Number(clamp((b.correct / b.totalQuestions) * 100, 0, 100).toFixed(1)),
        totalQuestions: Math.round(b.totalQuestions),
        timedQuestions: Math.round(b.timedQuestions),
        correct: Math.round(b.correct),
        totalTimeSeconds: Math.round(b.timeSpent),
      });
    });
  } else {
    const focusSet = (showOnlyFocus && hasFocusId) ? new Set(cats.map((c) => String(c.id ?? c.name))) : null;
    allSubjectPoints.forEach((pt) => {
      if (focusSet && !focusSet.has(String(pt.id))) return;
      points.push(pt);
    });
  }

  // Use pre-focus subjects median (>= 2 timed subjects) so focusing 1 slow subject never inverts its quadrant
  const benchmarkPool = (allSubjectPoints.length >= 2 ? allSubjectPoints : points)
    .map((p) => p.avgSeconds)
    .sort((a, b) => a - b);
  const autoBenchmarkSec = benchmarkPool.length >= 2 ? Math.round(quantileSorted(benchmarkPool, 0.5)) : 150;
  const benchmarkSeconds = toFinite(idealSecondsPerQuestion, null) > 0
    ? Number(idealSecondsPerQuestion)
    : clamp(autoBenchmarkSec, 60, 240);

  const quadrants = {
    fastAccurate: 0,
    fastInaccurate: 0,
    slowAccurate: 0,
    slowInaccurate: 0,
  };

  const enriched = points.map((p) => {
    const isFast = p.avgSeconds <= benchmarkSeconds;
    const isAccurate = p.accuracyPct >= roundedTargetPct;
    let quadrant = 'slowInaccurate';
    let quadrantLabel = 'Lacuna Teórica';
    if (isFast && isAccurate) {
      quadrant = 'fastAccurate';
      quadrantLabel = 'Domínio Rápido';
    } else if (isFast && !isAccurate) {
      quadrant = 'fastInaccurate';
      quadrantLabel = 'Leitura Apressada';
    } else if (!isFast && isAccurate) {
      quadrant = 'slowAccurate';
      quadrantLabel = 'Precisa Agilidade';
    }
    quadrants[quadrant] += 1;
    return { ...p, quadrant, quadrantLabel };
  });

  return {
    points: enriched,
    benchmarkSeconds,
    targetPct: roundedTargetPct,
    quadrants,
  };
}

// ============================================================================
// #4 — Burndown / Burnup do Edital até a Prova
// ============================================================================
export function buildSyllabusBurndownData(categories = [], user = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const todayKey = getDateKey(now) || new Date().toISOString().slice(0, 10);
  const todayNoon = parseNoonLocal(todayKey) || now;
  const todayMs = todayNoon.getTime();

  const allTasks = [];
  safeArr(categories).forEach((cat) => {
    safeArr(cat?.tasks).forEach((t) => {
      if (t && (t.id || t.text || t.title)) allTasks.push(t);
    });
  });

  const totalTasks = allTasks.length;
  if (totalTasks === 0) {
    return {
      series: [],
      totalTasks: 0,
      completedTasks: 0,
      remainingTasks: 0,
      completionPct: 0,
      hasGoalDate: false,
      currentWeeklyPace: 0,
      requiredWeeklyPace: 0,
      projectedFinishKey: null,
      daysUntilGoal: null,
      status: 'empty',
    };
  }

  const completedTasksList = allTasks.filter((t) => Boolean(t.completed));
  const completedTasks = completedTasksList.length;
  const remainingTasks = Math.max(0, totalTasks - completedTasks);
  const completionPct = Math.round((completedTasks / totalTasks) * 100);

  const completionDateCounts = new Map();
  let undatedCompleted = 0;
  let datedCompleted = 0;
  let earliestCompletionMs = Infinity;

  completedTasksList.forEach((t) => {
    const key = getDateKey(t.completedAt || t.lastStudiedAt || t.updatedAt);
    if (!key) {
      undatedCompleted += 1;
      return;
    }
    const ms = parseNoonLocal(key)?.getTime();
    if (!Number.isFinite(ms)) {
      undatedCompleted += 1;
      return;
    }
    // M13 FIX: clampar datas futuras para hoje para manter continuidade exata em "Hoje"
    const effectiveKey = ms > todayMs ? todayKey : key;
    const effectiveMs = Math.min(ms, todayMs);
    datedCompleted += 1;
    if (effectiveMs < earliestCompletionMs) earliestCompletionMs = effectiveMs;
    completionDateCounts.set(effectiveKey, (completionDateCounts.get(effectiveKey) || 0) + 1);
  });

  const userStartKey = getDateKey(user?.startDate);
  const userStartMs = userStartKey ? parseNoonLocal(userStartKey)?.getTime() : NaN;
  let startMs = Number.isFinite(userStartMs) ? Math.min(userStartMs, todayMs) : (todayMs - 21 * MS_PER_DAY);
  if (Number.isFinite(earliestCompletionMs) && earliestCompletionMs < startMs) {
    startMs = earliestCompletionMs;
  }
  // Cap start lookback to 180 days before today to keep chart legible
  if (todayMs - startMs > 180 * MS_PER_DAY) {
    const cutoffStart = todayMs - 180 * MS_PER_DAY;
    completionDateCounts.forEach((cnt, key) => {
      const m = parseNoonLocal(key)?.getTime();
      if (Number.isFinite(m) && m < cutoffStart) {
        undatedCompleted += cnt;
        completionDateCounts.delete(key);
      }
    });
    startMs = cutoffStart;
  }

  const goalKey = getDateKey(user?.goalDate);
  const goalParsedMs = goalKey ? parseNoonLocal(goalKey)?.getTime() : NaN;
  // M13 FIX: reconhecer goalDate válida mesmo quando já expirou (goalParsedMs <= startMs ou <= todayMs)
  const hasGoalDate = Number.isFinite(goalParsedMs);
  const daysUntilGoal = hasGoalDate ? Math.ceil((goalParsedMs - todayMs) / MS_PER_DAY) : null;
  const isGoalExpired = hasGoalDate && daysUntilGoal <= 0;
  const endMs = hasGoalDate ? Math.max(goalParsedMs, todayMs) : (todayMs + 60 * MS_PER_DAY);

  // M13 FIX: janela exata de 14 dias corridos (today - 13d até today inclusive)
  const window14Ms = todayMs - 13 * MS_PER_DAY;
  let completedLast14d = 0;
  completionDateCounts.forEach((cnt, key) => {
    const m = parseNoonLocal(key)?.getTime();
    if (Number.isFinite(m) && m >= window14Ms && m <= todayMs) {
      completedLast14d += cnt;
    }
  });
  const totalElapsedDays = Math.max(1, Math.round((todayMs - startMs) / MS_PER_DAY) + 1);
  const activeElapsedDays = Math.max(1, Math.min(14, totalElapsedDays));
  // M13 FIX: só usar média histórica como fallback se não há datas nas tarefas concluídas
  // ou se a conta tem menos de 14 dias; caso contrário, 0 conclusões em 14d = ritmo 0 (stalled).
  const canUseAllTimeFallback = datedCompleted === 0 || totalElapsedDays < 14;
  const tasksPerDayPace = completedLast14d > 0
    ? completedLast14d / activeElapsedDays
    : (canUseAllTimeFallback && completedTasks > 0 && todayMs > startMs
      ? completedTasks / Math.max(7, (todayMs - startMs) / MS_PER_DAY)
      : 0);

  const currentWeeklyPace = Number((tasksPerDayPace * 7).toFixed(1));
  const daysToEnd = Math.max(1, Math.round((endMs - todayMs) / MS_PER_DAY));
  const requiredWeeklyPace = remainingTasks > 0 && !isGoalExpired
    ? Number(((remainingTasks / daysToEnd) * 7).toFixed(1))
    : 0;

  let projectedFinishKey = null;
  let projectedFinishMs = null;
  if (remainingTasks === 0) {
    projectedFinishKey = todayKey;
    projectedFinishMs = todayMs;
  } else if (tasksPerDayPace > 0.01) {
    const neededDays = Math.ceil(remainingTasks / tasksPerDayPace);
    if (neededDays <= 730) {
      projectedFinishMs = todayMs + neededDays * MS_PER_DAY;
      projectedFinishKey = getDateKey(new Date(projectedFinishMs));
    }
  }

  // Sample dates evenly (~24-35 points) including start, today, and end — deduplicated by calendar date key (DST-safe)
  const totalSpanDays = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY));
  const stepDays = Math.max(1, Math.ceil(totalSpanDays / 28));
  const sampleByKey = new Map();
  const addSampleMs = (ms, priority = false) => {
    const dk = getDateKey(new Date(ms));
    if (!dk) return;
    if (priority || !sampleByKey.has(dk)) {
      sampleByKey.set(dk, ms);
    }
  };
  for (let m = startMs; m <= endMs; m += stepDays * MS_PER_DAY) {
    addSampleMs(m, false);
  }
  addSampleMs(startMs, true);
  addSampleMs(endMs, true);
  addSampleMs(todayMs, true);
  const sortedSampleMs = Array.from(sampleByKey.values()).sort((a, b) => a - b);

  const sortedDatedCompletions = Array.from(completionDateCounts.entries())
    .map(([k, count]) => ({ ms: parseNoonLocal(k)?.getTime() ?? NaN, count }))
    .filter((e) => Number.isFinite(e.ms))
    .sort((a, b) => a.ms - b.ms);

  const idealTargetMs = hasGoalDate && goalParsedMs > startMs ? goalParsedMs : endMs;
  const idealDenominator = Math.max(1, idealTargetMs - startMs);
  const spansMultipleYears = totalSpanDays > 300;
  const formatAxisLabel = (isoKey) => {
    if (!isoKey || typeof isoKey !== 'string') return '';
    const parts = isoKey.split('-');
    if (parts.length !== 3) return isoKey;
    return spansMultipleYears ? `${parts[2]}/${parts[1]}/${parts[0].slice(2)}` : `${parts[2]}/${parts[1]}`;
  };

  const series = sortedSampleMs.map((ms) => {
    const key = getDateKey(new Date(ms)) || '';
    const progressRatio = (isGoalExpired && goalParsedMs <= startMs)
      ? 1
      : clamp((ms - startMs) / idealDenominator, 0, 1);
    const idealCompleted = Number((totalTasks * progressRatio).toFixed(1));
    const idealRemaining = Number(Math.max(0, totalTasks - idealCompleted).toFixed(1));

    const isPastOrToday = ms <= todayMs + 1000;
    const isToday = Math.abs(ms - todayMs) < MS_PER_DAY / 2;

    let actualCompleted = null;
    let actualRemaining = null;
    if (isPastOrToday) {
      let acc = undatedCompleted;
      for (const item of sortedDatedCompletions) {
        if (item.ms <= ms) acc += item.count;
        else break;
      }
      acc = Math.min(totalTasks, acc);
      actualCompleted = acc;
      actualRemaining = Math.max(0, totalTasks - acc);
    }

    let projectedCompleted = null;
    let projectedRemaining = null;
    if (isToday) {
      projectedCompleted = completedTasks;
      projectedRemaining = remainingTasks;
    } else if (ms > todayMs && tasksPerDayPace > 0) {
      const fwdDays = (ms - todayMs) / MS_PER_DAY;
      const proj = clamp(completedTasks + tasksPerDayPace * fwdDays, completedTasks, totalTasks);
      projectedCompleted = Number(proj.toFixed(1));
      projectedRemaining = Number(Math.max(0, totalTasks - proj).toFixed(1));
    }

    return {
      date: key,
      label: formatAxisLabel(key),
      isToday,
      idealCompleted,
      idealRemaining,
      actualCompleted,
      actualRemaining,
      projectedCompleted,
      projectedRemaining,
    };
  });

  let status = 'on_track';
  if (remainingTasks === 0) status = 'completed';
  else if (!hasGoalDate) status = tasksPerDayPace > 0 ? 'no_goal' : 'stalled';
  else if (daysUntilGoal !== null && daysUntilGoal <= 0) status = 'overdue';
  else if (projectedFinishMs === null) status = 'stalled';
  else if (projectedFinishMs <= goalParsedMs) status = 'ahead';
  else status = 'behind';

  return {
    series,
    totalTasks,
    completedTasks,
    remainingTasks,
    completionPct,
    hasGoalDate,
    goalDateKey: goalKey || null,
    currentWeeklyPace,
    requiredWeeklyPace,
    projectedFinishKey,
    daysUntilGoal,
    status,
  };
}

// ============================================================================
// #6 — Heatmap Circadiano (Dia da Semana × Faixa de 2h)
// ============================================================================
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SLOT_LABELS = [
  '00h', '02h', '04h', '06h', '08h', '10h',
  '12h', '14h', '16h', '18h', '20h', '22h',
];

function extractWeekdayAndHourInTz(rawTimestamp) {
  if (!rawTimestamp) return null;
  // Ignore date-only strings like '2026-04-10' or '10/04/2026' (no time of day -> would fake midnight/noon!)
  if (typeof rawTimestamp === 'string' && (/^\d{4}-\d{2}-\d{2}$/.test(rawTimestamp.trim()) || /^\d{2}\/\d{2}\/\d{4}$/.test(rawTimestamp.trim()))) {
    return null;
  }
  const d = normalizeDate(rawTimestamp);
  if (!d || Number.isNaN(d.getTime())) return null;
  try {
    const tz = getAppTimezone();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const wdMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const wdPart = parts.find((p) => p.type === 'weekday')?.value;
    const hrPart = parts.find((p) => p.type === 'hour')?.value;
    const weekday = wdMap[wdPart];
    const hour = Number(hrPart) % 24;
    if (weekday === undefined || !Number.isFinite(hour)) return null;
    return { weekday, hour };
  } catch {
    return { weekday: d.getDay(), hour: d.getHours() };
  }
}

export function buildCircadianHeatmapData(studyLogs = [], studySessions = [], simuladoRows = [], options = {}) {
  const gMin = toFinite(options.minScore, 0);
  const gMax = Math.max(gMin + 1, toFinite(options.maxScore, 100));
  const nowMs = (options.now instanceof Date ? options.now : new Date()).getTime();
  const maxAllowedMs = nowMs + MS_PER_DAY;

  const categories = safeArr(options.categories);
  const catById = new Map();
  const catByNorm = new Map();
  categories.forEach((c) => {
    if (c?.id != null) catById.set(String(c.id), c);
    if (c?.name) catByNorm.set(normalize(c.name), c);
  });

  const resolvePositiveMinutes = (item) => {
    if (!item) return 0;
    const m = toFinite(item.minutes ?? item.minutos, 0);
    if (m > 0) return Math.min(720, m);
    const d = toFinite(item.duration, 0);
    if (d > 0) return Math.min(720, d);
    return 0;
  };

  // D4 FIX: priorizar startTime/timestamp/date com hora; só recorrer a createdAt se date não divergir de dia
  const resolveTimedTimestamp = (item) => {
    if (!item) return null;
    const candidates = [item.startTime, item.timestamp, item.date];
    for (const c of candidates) {
      if (extractWeekdayAndHourInTz(c)) return c;
    }
    if (item.createdAt && extractWeekdayAndHourInTz(item.createdAt)) {
      const dateDay = item.date ? getDateKey(item.date) : null;
      const createdDay = getDateKey(item.createdAt);
      if (!dateDay || !createdDay || dateDay === createdDay) {
        return item.createdAt;
      }
    }
    return null;
  };

  const grid = Array.from({ length: 7 }, (_, dayIdx) =>
    Array.from({ length: 12 }, (_, slotIdx) => ({
      dayIdx,
      dayLabel: WEEKDAY_LABELS[dayIdx],
      slotIdx,
      slotLabel: `${SLOT_LABELS[slotIdx]}–${String((slotIdx * 2 + 2) % 24).padStart(2, '0')}h`,
      minutes: 0,
      sessions: 0,
      simCount: 0,
      correctSum: 0,
      totalSum: 0,
      weightedPctSum: 0,
      weightSum: 0,
      pctSum: 0,
      pctCount: 0,
    }))
  );

  let timedLogCount = 0;
  let untimedLogCount = 0;

  safeArr(studyLogs).forEach((log) => {
    if (!log || log.type === 'flashcard') return;
    const mins = resolvePositiveMinutes(log);
    if (mins <= 0) return;
    const ts = resolveTimedTimestamp(log);
    const loc = ts ? extractWeekdayAndHourInTz(ts) : null;
    if (!loc) {
      untimedLogCount += 1;
      return;
    }
    const ms = normalizeDate(ts)?.getTime();
    if (Number.isFinite(ms) && ms > maxAllowedMs) return;
    timedLogCount += 1;
    const cell = grid[loc.weekday][Math.floor(loc.hour / 2)];
    cell.minutes += mins;
    cell.sessions += 1;
  });

  if (timedLogCount === 0) {
    safeArr(studySessions).forEach((sess) => {
      const mins = resolvePositiveMinutes(sess);
      if (mins <= 0) return;
      const ts = resolveTimedTimestamp(sess);
      const loc = ts ? extractWeekdayAndHourInTz(ts) : null;
      if (!loc) return;
      const ms = normalizeDate(ts)?.getTime();
      if (Number.isFinite(ms) && ms > maxAllowedMs) return;
      timedLogCount += 1;
      const cell = grid[loc.weekday][Math.floor(loc.hour / 2)];
      cell.minutes += mins;
      cell.sessions += 1;
    });
  }

  let timedSimCount = 0;
  const processSimEntry = (row, catMeta = null) => {
    if (!row || row.valid === false || row.validated === false) return;
    const ts = resolveTimedTimestamp(row);
    const loc = ts ? extractWeekdayAndHourInTz(ts) : null;
    if (!loc) return;
    const ms = normalizeDate(ts)?.getTime();
    if (Number.isFinite(ms) && ms > maxAllowedMs) return;

    const matchedCat = catMeta ||
      (row.categoryId != null ? catById.get(String(row.categoryId)) : null) ||
      catByNorm.get(normalize(row.subject || row.categoryName || row.materia || row.disciplina || '')) ||
      null;
    const { min: rowMin, max: rowMax, range: rowRange } = resolveScale(matchedCat || row, gMax, gMin);

    const cell = grid[loc.weekday][Math.floor(loc.hour / 2)];
    const tot = toFinite(row.total ?? row.questoes ?? row.totalQuestoes ?? row.questions, 0);
    const corr = toFinite(row.correct ?? row.acertos ?? row.correctCount, null);
    const sc = getSafeScore(row, rowMax, rowMin);
    if (Number.isFinite(sc) && isPhantomZeroTimeAttempt(row, sc)) return;

    // D4 FIX: unificar registros com questões e registros somente-nota na mesma média ponderada
    // respeitando penalidades Cebraspe (getSafeScore) sem descartar nenhum registro da célula.
    if (Number.isFinite(sc)) {
      const pct = clamp(((sc - rowMin) / rowRange) * 100, 0, 100);
      const weight = tot > 0 ? tot : getSyntheticTotal(rowMax);
      cell.weightedPctSum += pct * weight;
      cell.weightSum += weight;
      if (tot > 0) {
        cell.totalSum += tot;
        cell.correctSum += clamp((pct / 100) * tot, 0, tot);
      } else {
        cell.pctSum += pct;
        cell.pctCount += 1;
      }
      cell.simCount += 1;
      timedSimCount += 1;
    } else if (tot > 0 && corr !== null) {
      const safeC = clamp(corr, 0, tot);
      const pct = (safeC / tot) * 100;
      cell.weightedPctSum += pct * tot;
      cell.weightSum += tot;
      cell.totalSum += tot;
      cell.correctSum += safeC;
      cell.simCount += 1;
      timedSimCount += 1;
    }
  };

  safeArr(simuladoRows).forEach((row) => processSimEntry(row));

  // Fallback para category.simuladoStats.history quando simuladoRows não tem entradas com horário
  if (timedSimCount === 0 && categories.length > 0) {
    categories.forEach((cat) => {
      safeArr(cat?.simuladoStats?.history).forEach((h) => processSimEntry(h, cat));
    });
  }

  let maxMinutes = 0;
  let peakStudyCell = null;
  let peakAccuracyCell = null;
  let bestReliableAccuracyCell = null;

  const flatGrid = grid.map((row) =>
    row.map((cell) => {
      const accuracyPct = cell.weightSum > 0
        ? Number(clamp(cell.weightedPctSum / cell.weightSum, 0, 100).toFixed(1))
        : null;
      const enriched = {
        ...cell,
        minutes: Math.round(cell.minutes),
        accuracyPct,
      };
      if (enriched.minutes > maxMinutes) {
        maxMinutes = enriched.minutes;
        peakStudyCell = enriched;
      }
      if (accuracyPct !== null) {
        if (!peakAccuracyCell || accuracyPct > peakAccuracyCell.accuracyPct) {
          peakAccuracyCell = enriched;
        }
        const hasReliableSample = enriched.simCount >= 2 || enriched.totalSum >= 5;
        if (hasReliableSample && (!bestReliableAccuracyCell || accuracyPct > bestReliableAccuracyCell.accuracyPct)) {
          bestReliableAccuracyCell = enriched;
        }
      }
      return enriched;
    })
  );

  peakAccuracyCell = bestReliableAccuracyCell || peakAccuracyCell;

  const periodTotals = { madrugada: 0, manha: 0, tarde: 0, noite: 0 };
  flatGrid.forEach((row) => {
    row.forEach((c) => {
      if (c.slotIdx < 3) periodTotals.madrugada += c.minutes;
      else if (c.slotIdx < 6) periodTotals.manha += c.minutes;
      else if (c.slotIdx < 9) periodTotals.tarde += c.minutes;
      else periodTotals.noite += c.minutes;
    });
  });

  const periodLabels = {
    madrugada: 'Madrugada (00h–06h)',
    manha: 'Manhã (06h–12h)',
    tarde: 'Tarde (12h–18h)',
    noite: 'Noite (18h–24h)',
  };
  const topPeriodKey = Object.entries(periodTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'manha';

  return {
    rows: flatGrid,
    slotLabels: SLOT_LABELS,
    weekdayLabels: WEEKDAY_LABELS,
    maxMinutes,
    peakStudyCell,
    peakAccuracyCell,
    chronotype: periodTotals[topPeriodKey] > 0 ? periodLabels[topPeriodKey] : null,
    timedLogCount,
    untimedLogCount,
    timedSimCount,
  };
}

// ============================================================================
// #8 — Consistência por Matéria (Box Plot — Mín / Q1 / Mediana / Q3 / Máx)
// ============================================================================
export function buildConsistencyBoxPlotData(categories = [], options = {}) {
  const {
    showOnlyFocus = false,
    focusSubjectId = null,
    timeWindow = 'all',
    minScore = 0,
    maxScore = 100,
  } = options;

  const cutoffMs = getCutoffMs(timeWindow);
  const gMin = toFinite(minScore, 0);
  const gMax = Math.max(gMin + 1, toFinite(maxScore, 100));
  const gRange = Math.max(1e-9, gMax - gMin);

  const hasFocusId = focusSubjectId !== null && focusSubjectId !== undefined && String(focusSubjectId).trim() !== '';
  const cats = safeArr(categories).filter(
    (c) => !showOnlyFocus || !hasFocusId || (c?.id != null && String(c.id) === String(focusSubjectId))
  );
  const isSingleFocus = Boolean(showOnlyFocus && hasFocusId && cats.length === 1);

  const rows = [];
  cats.forEach((cat) => {
    const { min: cMin, max: cMax, range: cRange } = resolveScale(cat, gMax, gMin);
    const validHist = safeArr(cat?.simuladoStats?.history)
      .filter((h) => h && h.valid !== false && h.validated !== false);
    const history = filterDatedEntriesByWindow(validHist, (h) => h.date || h.createdAt, cutoffMs);

    const scores = history
      .map((h) => {
        let s = getSafeScore(h, cMax, cMin);
        if (!Number.isFinite(s) && h?.topics != null) {
          const tf = extractTopicsTotals(h, cMax, cMin);
          if (tf.hasTopicsScore && Number.isFinite(tf.score)) s = tf.score;
        }
        if (!Number.isFinite(s) || isPhantomZeroTimeAttempt(h, s)) return NaN;
        // Project onto global scale if displaying multi-subject together
        if (!isSingleFocus && (cMax !== gMax || cMin !== gMin)) {
          return gMin + clamp((s - cMin) / cRange, 0, 1) * gRange;
        }
        return clamp(s, cMin, cMax);
      })
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    if (scores.length === 0) return;

    const minVal = scores[0];
    const maxVal = scores[scores.length - 1];
    const q1 = quantileSorted(scores, 0.25);
    const median = quantileSorted(scores, 0.5);
    const q3 = quantileSorted(scores, 0.75);
    const mean = scores.reduce((acc, v) => acc + v, 0) / scores.length;
    const variance = scores.length > 1
      ? scores.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (scores.length - 1)
      : 0;
    const std = Math.sqrt(Math.max(0, variance));
    const iqr = Math.max(0, q3 - q1);

    // Tukey fences (1.5 * IQR) for outlier detection (only meaningful when n >= 4)
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    const inFence = scores.length >= 4 ? scores.filter((v) => v >= lowerFence && v <= upperFence) : scores;
    const outliers = scores.length >= 4
      ? scores.filter((v) => v < lowerFence || v > upperFence).map((v) => Number(v.toFixed(2)))
      : [];
    const whiskerMin = inFence.length ? inFence[0] : minVal;
    const whiskerMax = inFence.length ? inFence[inFence.length - 1] : maxVal;

    const activeDomain = isSingleFocus ? cRange : gRange;
    const iqrPct = (iqr / activeDomain) * 100;
    let stability = 'Estável';
    if (scores.length < 3) stability = 'Poucos dados';
    else if (iqrPct > 18) stability = 'Volátil';
    else if (iqrPct > 10) stability = 'Moderada';

    const rawCutoff = toFinite(cat?.minCutoff, null);
    const minCutoff = rawCutoff !== null && rawCutoff > cMin
      ? (!isSingleFocus && (cMax !== gMax || cMin !== gMin)
        ? gMin + clamp((rawCutoff - cMin) / cRange, 0, 1) * gRange
        : Math.min(cMax, rawCutoff))
      : null;
    const belowCutoffCount = minCutoff !== null ? scores.filter((v) => v < minCutoff).length : 0;

    rows.push({
      id: cat.id ?? cat.name,
      name: cat.name,
      color: cat.color || '#6366f1',
      count: scores.length,
      min: Number(minVal.toFixed(2)),
      whiskerMin: Number(whiskerMin.toFixed(2)),
      q1: Number(q1.toFixed(2)),
      median: Number(median.toFixed(2)),
      q3: Number(q3.toFixed(2)),
      whiskerMax: Number(whiskerMax.toFixed(2)),
      max: Number(maxVal.toFixed(2)),
      outliers,
      mean: Number(mean.toFixed(2)),
      std: Number(std.toFixed(2)),
      iqr: Number(iqr.toFixed(2)),
      stability,
      minCutoff: minCutoff !== null ? Number(minCutoff.toFixed(2)) : null,
      belowCutoffCount,
    });
  });

  rows.sort((a, b) => b.median - a.median);

  return {
    rows,
    hasCutoffs: rows.some((r) => r.minCutoff !== null),
    domainMin: isSingleFocus && cats[0] ? resolveScale(cats[0], gMax, gMin).min : gMin,
    domainMax: isSingleFocus && cats[0] ? resolveScale(cats[0], gMax, gMin).max : gMax,
  };
}

// ============================================================================
// #11 — Simulador de Ritmo de Prova (Pacing / Orçamento de Tempo)
// ============================================================================
export function normalizeExamPacingConfig(examDurationMinutes, examTotalQuestions) {
  const rawDur = toFinite(examDurationMinutes, null);
  const rawQ = toFinite(examTotalQuestions, null);
  const duration = clamp(Math.round(rawDur !== null && rawDur > 0 ? rawDur : 240), 15, 720);
  const questions = clamp(Math.round(rawQ !== null && rawQ > 0 ? rawQ : 100), 5, 500);
  return { examDurationMinutes: duration, examTotalQuestions: questions };
}

export function buildExamPacingData(categories = [], options = {}) {
  const { examDurationMinutes, examTotalQuestions } = normalizeExamPacingConfig(
    options.examDurationMinutes,
    options.examTotalQuestions
  );
  const idealSecPerQuestion = (examDurationMinutes * 60) / examTotalQuestions;
  const cutoffMs = getCutoffMs(options.timeWindow);

  const cats = safeArr(categories);
  const rawEntries = [];
  let globalTimeSec = 0;
  let globalTimedQ = 0;

  cats.forEach((cat) => {
    const mw = options.mcWeights;
    const hasIdWeight = mw && cat.id != null && toFinite(mw[cat.id], null) !== null;
    const hasNameWeight = mw && cat.name != null && toFinite(mw[cat.name], null) !== null;
    const resolvedWeight = hasIdWeight
      ? toFinite(mw[cat.id], 0)
      : (hasNameWeight ? toFinite(mw[cat.name], 0) : toFinite(cat.weight, 10));
    if (resolvedWeight <= 0) return;

    const { min: catMin, max: catMax } = resolveScale(cat, 100, 0);
    const validHistory = safeArr(cat?.simuladoStats?.history)
      .filter((h) => h && h.valid !== false && h.validated !== false);
    const history = filterDatedEntriesByWindow(validHistory, (h) => h.date || h.createdAt, cutoffMs);
    let timeSec = 0;
    let timedQ = 0;
    history.forEach((h) => {
      const rootTs = toFinite(h.timeSpent ?? h.durationSeconds, 0);
      const explicitTq = toFinite(h.timedQuestoes, 0);
      const topics = safeArr(h.topics);
      let topicsTs = 0;
      let topicsTq = 0;
      let allTopicsExplicit = true;
      topics.forEach((t) => {
        if (!t || t.valid === false || t.validated === false) return;
        const tTs = toFinite(t?.timeSpent ?? t?.durationSeconds, 0);
        const tExpQ = toFinite(t?.timedQuestoes, 0);
        const tQ = tExpQ > 0 ? tExpQ : toFinite(t?.total ?? t?.questoes ?? t?.totalQuestoes ?? t?.questions, 0);
        if (tTs > 0 && tQ > 0) {
          topicsTs += tTs;
          topicsTq += tQ;
          if (tExpQ <= 0) allTopicsExplicit = false;
        }
      });
      const rootAuthoritative = rootTs > 0 && explicitTq > 0 && ((!allTopicsExplicit && topicsTq > explicitTq) || topicsTs < rootTs);
      if (topicsTs > 0 && topicsTq > 0 && !rootAuthoritative) {
        timeSec += topicsTs;
        timedQ += topicsTq;
      } else {
        let tot = toFinite(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions, 0);
        if (tot <= 0 && h.topics != null) {
          const tf = extractTopicsTotals(h, catMax, catMin);
          if (tf.total > 0) tot = tf.total;
        }
        const tq = explicitTq > 0 ? explicitTq : (rootTs > 0 ? tot : 0);
        if (rootTs > 0 && tq > 0) {
          timeSec += rootTs;
          timedQ += tq;
        }
      }
    });
    globalTimeSec += timeSec;
    globalTimedQ += timedQ;
    rawEntries.push({
      id: cat.id ?? cat.name,
      name: cat.name,
      color: cat.color || '#6366f1',
      weight: Math.max(0.01, resolvedWeight),
      hasTimedData: timedQ > 0,
      avgSecPerQ: timedQ > 0 ? timeSec / timedQ : null,
      timedQuestions: Math.round(timedQ),
    });
  });

  if (globalTimedQ === 0 || rawEntries.length === 0) {
    return {
      hasData: false,
      examDurationMinutes,
      examTotalQuestions,
      idealSecPerQuestion: Number(idealSecPerQuestion.toFixed(1)),
      totalProjectedMinutes: 0,
      deltaMinutes: 0,
      estimatedUnanswered: 0,
      subjects: [],
    };
  }

  const fallbackAvgSec = globalTimeSec / globalTimedQ;
  const totalWeight = rawEntries.reduce((acc, e) => acc + e.weight, 0) || 1;

  // Método dos Maiores Restos (Hamilton) para que sum(allocatedQuestions) === examTotalQuestions
  const minFloor = examTotalQuestions >= rawEntries.length ? 1 : 0;
  const allocations = rawEntries.map((e, idx) => {
    const exact = (e.weight / totalWeight) * examTotalQuestions;
    const floorVal = Math.max(minFloor, Math.floor(exact));
    return { idx, exact, allocated: floorVal, remainder: exact - Math.floor(exact) };
  });

  let diff = examTotalQuestions - allocations.reduce((sum, a) => sum + a.allocated, 0);
  if (diff > 0) {
    const order = [...allocations].sort((a, b) => b.remainder - a.remainder);
    let guard = 0;
    while (diff > 0 && guard < examTotalQuestions + rawEntries.length) {
      let progressed = false;
      for (let i = 0; i < order.length && diff > 0; i++) {
        order[i].allocated += 1;
        diff -= 1;
        progressed = true;
      }
      if (!progressed) break;
      guard += 1;
    }
  } else if (diff < 0) {
    const order = [...allocations].sort((a, b) => a.remainder - b.remainder);
    let guard = 0;
    while (diff < 0 && guard < examTotalQuestions + rawEntries.length * 2) {
      let progressed = false;
      for (let i = 0; i < order.length && diff < 0; i++) {
        if (order[i].allocated > minFloor) {
          order[i].allocated -= 1;
          diff += 1;
          progressed = true;
        }
      }
      if (!progressed) break;
      guard += 1;
    }
  }

  let rawTotalProjectedMinutes = 0;
  const subjects = rawEntries.map((e, idx) => {
    const allocatedQuestions = allocations[idx].allocated;
    const effectiveSec = e.avgSecPerQ ?? fallbackAvgSec;
    const projectedMinutes = (allocatedQuestions * effectiveSec) / 60;
    rawTotalProjectedMinutes += projectedMinutes;
    const budgetMinutes = (allocatedQuestions * idealSecPerQuestion) / 60;
    const deltaMinutes = projectedMinutes - budgetMinutes;
    return {
      id: e.id,
      name: e.name,
      color: e.color,
      weight: e.weight,
      hasTimedData: e.hasTimedData,
      allocatedQuestions,
      avgSecPerQ: Number(effectiveSec.toFixed(1)),
      projectedMinutes: Number(projectedMinutes.toFixed(1)),
      budgetMinutes: Number(budgetMinutes.toFixed(1)),
      deltaMinutes: Number(deltaMinutes.toFixed(1)),
      status: deltaMinutes > 3 ? 'over' : (deltaMinutes < -3 ? 'under' : 'ok'),
    };
  });

  const rawDelta = rawTotalProjectedMinutes - examDurationMinutes;
  const safeRawDelta = Math.abs(rawDelta) < 1e-6 ? 0 : rawDelta;
  const totalProjectedMinutes = Number(rawTotalProjectedMinutes.toFixed(1));
  const deltaMinutes = Number(safeRawDelta.toFixed(1));
  const overallAvgSec = (rawTotalProjectedMinutes * 60) / examTotalQuestions;
  const estimatedUnanswered = safeRawDelta > 1e-6 && overallAvgSec > 0
    ? Math.min(examTotalQuestions, Math.ceil((safeRawDelta * 60) / overallAvgSec))
    : 0;

  subjects.sort((a, b) => b.deltaMinutes - a.deltaMinutes);

  return {
    hasData: true,
    examDurationMinutes,
    examTotalQuestions,
    idealSecPerQuestion: Number(idealSecPerQuestion.toFixed(1)),
    overallAvgSec: Number(overallAvgSec.toFixed(1)),
    totalProjectedMinutes,
    deltaMinutes,
    estimatedUnanswered,
    subjects,
  };
}

// ============================================================================
// #12 — Fan Chart (Cone de Projeção Futuro P10/P25/P50/P75/P90 + Cortes)
// ============================================================================
export function buildProjectionFanData(focusCategory, timeline = [], options = {}) {
  const minScore = toFinite(options.minScore, 0);
  const maxScore = Math.max(minScore + 1, toFinite(options.maxScore, 100));
  const domain = Math.max(1e-9, maxScore - minScore);
  const targetScore = clamp(toFinite(options.targetScore, minScore + 0.8 * domain), minScore, maxScore);
  const horizonDays = clamp(Math.round(toFinite(options.horizonDays, 60)), 1, 365);
  const historicalCutoffs = safeArr(options.historicalCutoffs)
    .map((v) => toFinite(v, NaN))
    .filter((n) => Number.isFinite(n) && n >= minScore && n <= maxScore);

  const now = options.now instanceof Date ? options.now : new Date();
  const todayKey = getDateKey(now);
  const cutoffMs = getCutoffMs(options.timeWindow);

  const allRawObs = [];
  if (focusCategory) {
    const validHist = safeArr(focusCategory?.simuladoStats?.history)
      .filter((h) => h && h.valid !== false && h.validated !== false);
    const windowedHist = filterDatedEntriesByWindow(validHist, (h) => h.date || h.createdAt, cutoffMs);
    windowedHist.forEach((h) => {
      let sc = getSafeScore(h, maxScore, minScore);
      const dk = getDateKey(h.date || h.createdAt);
      const isSynth = Boolean(h.syntheticVolume || h.isSynthetic || h.type === 'percent-only');
      let tot = isSynth ? 0 : toFinite(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions, 0);
      if ((!Number.isFinite(sc) || tot <= 0) && !isSynth && h.topics != null) {
        const tf = extractTopicsTotals(h, maxScore, minScore);
        if (tf.total > 0) {
          if (tot <= 0) tot = tf.total;
          if (!Number.isFinite(sc)) sc = tf.score;
        } else if (!Number.isFinite(sc) && tf.hasTopicsScore) {
          sc = tf.score;
        }
      }
      const volWeight = tot > 0 ? tot : getSyntheticTotal(maxScore);
      if (Number.isFinite(sc) && dk && !isPhantomZeroTimeAttempt(h, sc)) {
        allRawObs.push({ date: dk, score: sc, weight: volWeight });
      }
    });
  } else {
    const windowedTimeline = filterDatedEntriesByWindow(safeArr(timeline), (row) => row?.date, cutoffMs);
    windowedTimeline.forEach((row) => {
      const sc = toFinite(
        row?.global_bayesian ?? row?.global_raw ?? row?.global_ema ?? row?.globalAvg ?? row?.bayGlobal ?? row?.score,
        NaN
      );
      const dk = getDateKey(row?.date);
      const tot = toFinite(row?.global_total, 0);
      const volWeight = tot > 0 ? tot : 1;
      if (Number.isFinite(sc) && dk) allRawObs.push({ date: dk, score: sc, weight: volWeight });
    });
  }

  const hasNonFutureObs = todayKey ? allRawObs.some((o) => o.date <= todayKey) : false;
  const rawObs = (hasNonFutureObs ? allRawObs.filter((o) => o.date <= todayKey) : allRawObs)
    .sort((a, b) => (toDateMs(a.date) || 0) - (toDateMs(b.date) || 0));

  if (rawObs.length === 0) {
    return { series: [], cutoffBand: null, targetCrossingDate: null, summary: null };
  }

  const kalman = rawObs.length >= 2 ? kalmanAbilitySeries(rawObs, { minScore, maxScore }) : null;
  const lastObs = rawObs[rawObs.length - 1];
  const baseLevel = kalman?.summary?.ability ?? lastObs.score;
  const dailyDrift = clamp(
    toFinite(kalman?.summary?.trendPerDay, 0),
    -domain * 0.004,
    domain * 0.004
  );
  const baseSigma = Math.max(
    domain * 0.025,
    toFinite(options.activeMcResult?.sd, kalman?.summary?.abilitySd ?? domain * 0.06)
  );

  // Agrega mesmo dia ponderado por volume de questões para evitar labels duplicados no eixo X do Recharts
  const byDay = new Map();
  rawObs.forEach((pt) => {
    if (!byDay.has(pt.date)) byDay.set(pt.date, { date: pt.date, weightedSum: 0, weightTotal: 0 });
    const entry = byDay.get(pt.date);
    const w = Math.max(1, Number(pt.weight) || 1);
    entry.weightedSum += pt.score * w;
    entry.weightTotal += w;
  });
  const uniqueDailyObs = Array.from(byDay.values()).map((d) => ({
    date: d.date,
    score: d.weightTotal > 0 ? d.weightedSum / d.weightTotal : 0,
  }));

  const safeTodayKey = todayKey || lastObs.date;
  const effectiveTodayKey = lastObs.date > safeTodayKey ? lastObs.date : safeTodayKey;
  const baseMs = (parseNoonLocal(effectiveTodayKey) || now).getTime();

  // Recent historical anchor (last 8 unique days before anchor)
  const recentHistory = uniqueDailyObs
    .filter((p) => p.date < effectiveTodayKey)
    .slice(-8)
    .map((pt) => ({
      date: pt.date,
      label: formatShortBrDate(pt.date),
      isFuture: false,
      historical: Number(clamp(pt.score, minScore, maxScore).toFixed(2)),
      p50: null,
      bandOuter: null,
      bandInner: null,
      p10: null,
      p25: null,
      p75: null,
      p90: null,
    }));

  // Anchor "Hoje" connecting historical line to fan cone
  const clampedBase = Number(clamp(baseLevel, minScore, maxScore).toFixed(2));
  const anchorPoint = {
    date: effectiveTodayKey,
    label: 'Hoje',
    isFuture: false,
    isAnchor: true,
    historical: clampedBase,
    p50: clampedBase,
    bandOuter: [clampedBase, clampedBase],
    bandInner: [clampedBase, clampedBase],
    p10: clampedBase,
    p25: clampedBase,
    p75: clampedBase,
    p90: clampedBase,
  };

  const historyClean = recentHistory;

  const steps = Math.min(12, Math.max(1, Math.min(horizonDays, Math.max(4, Math.round(horizonDays / 7)))));
  const refHorizon = clamp(Math.round(toFinite(options.mcHorizonDays, 60)), 1, 365);
  const sigma0 = Math.min(
    baseSigma * 0.85,
    Math.max(domain * 0.015, toFinite(kalman?.summary?.abilitySd, baseSigma * 0.45))
  );
  const diffVarAtRef = Math.max(Math.pow(domain * 0.015, 2), baseSigma * baseSigma - sigma0 * sigma0);
  // Constante de tempo fixa (90d) para retornos decrescentes invariante ao zoom do horizonte (30d/60d/90d/180d)
  const DRIFT_TAU_DAYS = 90;

  const futurePoints = [];
  let alreadyAtTarget = baseLevel >= targetScore && dailyDrift >= 0;
  let targetCrossingDate = alreadyAtTarget ? effectiveTodayKey : null;
  let prevD = 0;
  let prevMean = clampedBase;

  for (let i = 1; i <= steps; i++) {
    const d = Math.max(1, Math.round((i / steps) * horizonDays));
    const effectiveDriftDays = DRIFT_TAU_DAYS * (1 - Math.exp(-d / DRIFT_TAU_DAYS));
    const projectedMean = clamp(
      baseLevel + dailyDrift * effectiveDriftDays,
      minScore,
      maxScore
    );
    // Difusão física proporcional a sqrt(d / T_ref): o dia +30 mantém exatamente a mesma
    // incerteza no zoom de 30d ou 180d, e horizontes maiores ampliam o cone fisicamente.
    const sigmaT = Math.min(domain * 0.35, Math.sqrt(sigma0 * sigma0 + diffVarAtRef * (d / refHorizon)));
    const p10 = clamp(projectedMean - 1.2816 * sigmaT, minScore, maxScore);
    const p25 = clamp(projectedMean - 0.6745 * sigmaT, minScore, maxScore);
    const p75 = clamp(projectedMean + 0.6745 * sigmaT, minScore, maxScore);
    const p90 = clamp(projectedMean + 1.2816 * sigmaT, minScore, maxScore);

    const dtKey = getDateKey(new Date(baseMs + d * MS_PER_DAY)) || '';
    if (!targetCrossingDate && prevMean < targetScore && projectedMean >= targetScore) {
      const span = Math.max(1e-9, projectedMean - prevMean);
      const crossDay = Math.max(1, Math.round(prevD + ((targetScore - prevMean) / span) * (d - prevD)));
      targetCrossingDate = getDateKey(new Date(baseMs + crossDay * MS_PER_DAY)) || dtKey;
    }
    prevD = d;
    prevMean = projectedMean;

    futurePoints.push({
      date: dtKey,
      label: i === steps ? `${formatShortBrDate(dtKey)} ✦` : formatShortBrDate(dtKey),
      isFuture: true,
      daysAhead: d,
      historical: null,
      p50: Number(projectedMean.toFixed(2)),
      p10: Number(p10.toFixed(2)),
      p25: Number(p25.toFixed(2)),
      p75: Number(p75.toFixed(2)),
      p90: Number(p90.toFixed(2)),
      bandOuter: [Number(p10.toFixed(2)), Number(p90.toFixed(2))],
      bandInner: [Number(p25.toFixed(2)), Number(p75.toFixed(2))],
    });
  }

  const finalPt = futurePoints[futurePoints.length - 1] || anchorPoint;
  // Se o aluno já está acima da meta e a mediana projetada permanece acima da meta até o fim
  // (mesmo com leve deriva negativa), nunca rotular como "Acima do prazo".
  if (!alreadyAtTarget && baseLevel >= targetScore && finalPt.p50 >= targetScore) {
    alreadyAtTarget = true;
    targetCrossingDate = effectiveTodayKey;
  }
  const cutoffBand = historicalCutoffs.length > 0
    ? {
      min: Math.min(...historicalCutoffs),
      max: Math.max(...historicalCutoffs),
      avg: Number((historicalCutoffs.reduce((a, b) => a + b, 0) / historicalCutoffs.length).toFixed(1)),
      count: historicalCutoffs.length,
    }
    : null;

  return {
    series: [...historyClean, anchorPoint, ...futurePoints],
    cutoffBand,
    targetCrossingDate,
    alreadyAtTarget,
    summary: {
      currentLevel: Number(baseLevel.toFixed(1)),
      finalP10: finalPt.p10,
      finalP50: finalPt.p50,
      finalP90: finalPt.p90,
      horizonDays,
      monthlyTrend: Number((dailyDrift * 30).toFixed(2)),
    },
  };
}

// ============================================================================
// #15 — Habilidade Latente (Filtro de Kalman) vs. Notas Brutas
// ============================================================================
export function buildKalmanChartData(focusCategory, timeline = [], options = {}) {
  const minScore = toFinite(options.minScore, 0);
  const maxScore = Math.max(minScore + 1, toFinite(options.maxScore, 100));
  const cutoffMs = getCutoffMs(options.timeWindow);

  let observations = [];
  if (focusCategory) {
    const validHist = safeArr(focusCategory?.simuladoStats?.history)
      .filter((h) => h && h.valid !== false && h.validated !== false);
    observations = filterDatedEntriesByWindow(validHist, (h) => h.date || h.createdAt, cutoffMs)
      .map((h) => {
        let sc = getSafeScore(h, maxScore, minScore);
        if (!Number.isFinite(sc) && h?.topics != null) {
          const tf = extractTopicsTotals(h, maxScore, minScore);
          if (tf.hasTopicsScore && Number.isFinite(tf.score)) sc = tf.score;
        }
        if (!Number.isFinite(sc) || isPhantomZeroTimeAttempt(h, sc)) return null;
        return { ...h, score: sc };
      })
      .filter(Boolean);
  } else {
    const filteredTimeline = filterDatedEntriesByWindow(safeArr(timeline), (row) => row?.date, cutoffMs);
    observations = filteredTimeline
      .map((row) => ({
        date: row.date,
        score: toFinite(
          row.global_raw ?? row.global_bayesian ?? row.global_ema ?? row.globalAvg ?? row.rawGlobal ?? row.score,
          NaN
        ),
      }))
      .filter((o) => Number.isFinite(o.score));
  }

  return kalmanAbilitySeries(observations, { minScore, maxScore });
}

// ============================================================================
// #16b — Grafo de Pré-Requisitos (Layout em Camadas + KnowledgeGraph Engine)
// ============================================================================
export function buildKnowledgeGraphLayout(category, options = {}) {
  if (!category || typeof category !== 'object') {
    return { nodes: [], edges: [], isAutoTopology: true, stats: { nodeCount: 0, edgeCount: 0, blockedCount: 0 } };
  }
  const { min: minScore, max: maxScore, range: domain } = resolveScale(
    category,
    toFinite(options.maxScore, 100),
    toFinite(options.minScore, 0)
  );

  // Aggregate topic proficiency from simuladoStats.history + tasks
  const topicMap = new Map();
  safeArr(category.tasks).forEach((t, idx) => {
    const label = String(t.text || t.title || '').trim();
    const key = normalizeGraphName(label);
    if (!key || topicMap.has(key)) return;
    topicMap.set(key, {
      name: label,
      key,
      order: idx,
      total: 0,
      correct: 0,
      scoreSum: 0,
      scoreCount: 0,
      hasSimuladoData: false,
      completed: Boolean(t.completed),
      proficiency: t.completed ? 0.72 : 0,
    });
  });

  const seenGraphEntryIds = new Set();
  const seenGraphDayTopics = new Set();
  const ingestGraphSimulado = (h) => {
    if (!h || h.valid === false || h.validated === false) return;
    const hId = h.id && !String(h.id).startsWith('legacy-') ? String(h.id) : null;
    if (hId && seenGraphEntryIds.has(hId)) return;
    if (hId) seenGraphEntryIds.add(hId);
    const dKey = getDateKey(h.date || h.createdAt) || '';

    const rawTopics = Array.isArray(h.topics) && h.topics.length > 0
      ? h.topics
      : (h.topic || h.assunto || h.topicName)
        ? [{
            name: h.topic || h.assunto || h.topicName,
            total: h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions,
            correct: h.correct ?? h.acertos ?? h.correctCount,
            score: h.score,
          }]
        : [];

    safeArr(rawTopics).forEach((tp) => {
      const label = String(tp.name || tp.topic || tp.assunto || tp.topicName || '').trim();
      const key = normalizeGraphName(label);
      if (!key) return;
      const dayTopicSig = dKey ? `${dKey}|${key}` : null;
      if (dayTopicSig && seenGraphDayTopics.has(dayTopicSig)) return;
      const tot = toFinite(tp.total ?? tp.questoes ?? tp.totalQuestoes ?? tp.questions, 0);
      const rawCorr = toFinite(tp.correct ?? tp.acertos ?? tp.correctCount, null);
      const sc = getSafeScore(tp, maxScore, minScore);
      if (tot <= 0 && !Number.isFinite(sc)) return;
      if (dayTopicSig) seenGraphDayTopics.add(dayTopicSig);
      if (!topicMap.has(key)) {
        topicMap.set(key, {
          name: label,
          key,
          order: topicMap.size,
          total: 0,
          correct: 0,
          scoreSum: 0,
          scoreCount: 0,
          hasSimuladoData: false,
          completed: false,
          proficiency: 0.5,
        });
      }
      const entry = topicMap.get(key);
      entry.hasSimuladoData = true;
      if (tot > 0) {
        const effCorr = resolveEffectiveCorrect(tp, sc, tot, rawCorr !== null, rawCorr, maxScore, minScore);
        entry.total += tot;
        entry.correct += clamp(effCorr, 0, tot);
        entry.proficiency = clamp(entry.correct / entry.total, 0, 1);
      } else if (Number.isFinite(sc)) {
        entry.scoreSum += clamp((sc - minScore) / domain, 0, 1);
        entry.scoreCount += 1;
        if (entry.total === 0) {
          entry.proficiency = clamp(entry.scoreSum / entry.scoreCount, 0, 1);
        }
      }
    });
  };

  safeArr(category?.simuladoStats?.history).forEach(ingestGraphSimulado);

  const matchesGraphCat = (s) => {
    if (!s) return false;
    if (category?.id != null && s.categoryId != null && String(s.categoryId) === String(category.id)) return true;
    return matchesCategorySubject(category, s.subject || s.categoryName || s.materia || s.disciplina || '');
  };
  safeArr(options.simulados).filter(matchesGraphCat).forEach(ingestGraphSimulado);
  safeArr(options.simuladoRows).filter(matchesGraphCat).forEach(ingestGraphSimulado);

  const allTopics = Array.from(topicMap.values());
  let topicList;
  if (allTopics.length <= 12) {
    topicList = allTopics;
  } else {
    // Prioritize topics with real simulado evidence when > 12 topics exist, preserving syllabus order
    const simulated = allTopics.filter((t) => t.hasSimuladoData);
    const nonSimulated = allTopics.filter((t) => !t.hasSimuladoData);
    topicList = [...simulated.slice(0, 12), ...nonSimulated.slice(0, Math.max(0, 12 - simulated.length))]
      .sort((a, b) => a.order - b.order);
  }
  if (topicList.length === 0) {
    return { nodes: [], edges: [], isAutoTopology: true, stats: { nodeCount: 0, edgeCount: 0, blockedCount: 0 } };
  }

  let graphConfig = getKnowledgeGraphForCategory(category.name || category.id, category);
  let isAutoTopology = false;

  // Fallback progressive chain when user has not explicitly defined prerequisites
  if (!graphConfig && topicList.length >= 2) {
    isAutoTopology = true;
    const edges = [];
    for (let i = 0; i < topicList.length - 1; i++) {
      edges.push({ from: topicList[i].name, to: topicList[i + 1].name, weight: 1 });
      if (i + 2 < topicList.length && i % 2 === 0) {
        edges.push({ from: topicList[i].name, to: topicList[i + 2].name, weight: 0.6 });
      }
    }
    graphConfig = { edges };
  }

  const metrics = computeTopicGraphMetrics(
    topicList.map((t) => ({ name: t.name, proficiency: t.proficiency, total: t.total })),
    graphConfig || { edges: [] }
  );

  // Extract explicit directed edges between known nodes
  const nodeByKey = new Map(metrics.topics.map((t) => [t.normalizedKey, t]));
  const profByKey = new Map(topicList.map((t) => [t.key, t]));
  const rawEdges = [];
  const edgeKeys = new Set();

  const pushEdge = (fromRaw, toRaw) => {
    const f = normalizeGraphName(fromRaw);
    const t = normalizeGraphName(toRaw);
    if (!f || !t || f === t || !nodeByKey.has(f) || !nodeByKey.has(t)) return;
    const ek = `${f}->${t}`;
    if (edgeKeys.has(ek)) return;
    edgeKeys.add(ek);
    rawEdges.push({ from: f, to: t });
  };

  if (Array.isArray(graphConfig?.edges)) {
    graphConfig.edges.forEach((e) => pushEdge(e?.from ?? e?.prerequisite, e?.to ?? e?.topic));
  }
  if (graphConfig?.prerequisites && typeof graphConfig.prerequisites === 'object') {
    Object.entries(graphConfig.prerequisites).forEach(([topic, prereqs]) => {
      (Array.isArray(prereqs) ? prereqs : [prereqs]).forEach((p) => pushEdge(p, topic));
    });
  }

  // Assign topological layers (longest path from roots, cycle-safe)
  const maxAllowedLayer = Math.max(5, Math.min(12, Math.max(1, metrics.topics.length - 1)));
  const layerMap = new Map(metrics.topics.map((t) => [t.normalizedKey, 0]));
  for (let pass = 0; pass < metrics.topics.length; pass++) {
    let changed = false;
    rawEdges.forEach((e) => {
      const nextLayer = (layerMap.get(e.from) || 0) + 1;
      if (nextLayer > (layerMap.get(e.to) || 0) && nextLayer <= maxAllowedLayer) {
        layerMap.set(e.to, nextLayer);
        changed = true;
      }
    });
    if (!changed) break;
  }

  const byLayer = new Map();
  metrics.topics.forEach((t) => {
    const layer = layerMap.get(t.normalizedKey) || 0;
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer).push(t);
  });

  const sortedLayers = Array.from(byLayer.keys()).sort((a, b) => a - b);
  const layerCount = Math.max(1, sortedLayers.length);
  const width = Math.max(760, layerCount * 165);
  const maxNodesInLayer = Math.max(1, ...Array.from(byLayer.values()).map((arr) => arr.length));
  const height = Math.max(240, maxNodesInLayer * 78 + 48);

  const positionedNodes = [];
  const posByKey = new Map();

  sortedLayers.forEach((layerIdx, colPos) => {
    const colNodes = byLayer.get(layerIdx) || [];
    const x = layerCount === 1 ? width / 2 : 95 + (colPos / (layerCount - 1)) * (width - 190);
    colNodes.forEach((node, rowPos) => {
      const y = colNodes.length === 1
        ? height / 2
        : 48 + (rowPos / (colNodes.length - 1)) * (height - 96);
      const src = profByKey.get(node.normalizedKey);
      const rawProficiency = src?.proficiency ?? 0.5;
      const proficiencyPct = Math.round(rawProficiency * 100);
      const isBlocked = Array.isArray(node.blockedBy) && node.blockedBy.length > 0;
      const item = {
        ...node,
        x: Math.round(x),
        y: Math.round(y),
        proficiency: rawProficiency,
        proficiencyPct,
        totalQuestions: src?.total ?? 0,
        completed: Boolean(src?.completed),
        isBlocked,
      };
      positionedNodes.push(item);
      posByKey.set(node.normalizedKey, item);
    });
  });

  const positionedEdges = rawEdges
    .map((e) => {
      const fromNode = posByKey.get(e.from);
      const toNode = posByKey.get(e.to);
      if (!fromNode || !toNode) return null;
      return {
        id: `${e.from}->${e.to}`,
        from: fromNode,
        to: toNode,
        isBlocking: (fromNode.proficiency ?? 0.5) < 0.6,
      };
    })
    .filter(Boolean);

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    width,
    height,
    isAutoTopology,
    stats: {
      nodeCount: positionedNodes.length,
      edgeCount: positionedEdges.length,
      blockedCount: positionedNodes.filter((n) => n.isBlocked).length,
    },
  };
}

// ============================================================================
// #16c — Evolução Temporal de Calibração (Brier Score & ECE)
// ============================================================================
export function buildCalibrationSeriesData(auditLogs = [], historyByCategory = {}, healthSnapshots = [], options = {}) {
  const categoryFilter = options.categoryFilter || 'all';
  const activeCategories = safeArr(options.categories);
  const hasCategoryWhitelist = activeCategories.length > 0;
  const activeCategoryKeys = new Set();
  const displayNameByNorm = new Map();
  activeCategories.forEach((c) => {
    if (!c) return;
    const displayName = String(c.name || c.id || '').trim();
    if (c.id != null) {
      const nk = normalize(String(c.id));
      if (nk) {
        activeCategoryKeys.add(nk);
        if (displayName) displayNameByNorm.set(nk, displayName);
      }
    }
    if (c.name) {
      const nn = normalize(String(c.name));
      if (nn) {
        activeCategoryKeys.add(nn);
        if (displayName) displayNameByNorm.set(nn, displayName);
      }
    }
  });

  const isAllowedCategory = (rawId, rawName) => {
    if (!hasCategoryWhitelist) return true;
    const nkId = rawId != null ? normalize(String(rawId)) : '';
    const nkName = rawName != null ? normalize(String(rawName)) : '';
    if (nkId === 'global' || nkName === 'global' || nkName === 'geral') return true;
    return (nkId && activeCategoryKeys.has(nkId)) || (nkName && activeCategoryKeys.has(nkName));
  };

  const resolveDisplayLabel = (rawId, rawName) => {
    const nkId = rawId != null ? normalize(String(rawId)) : '';
    const nkName = rawName != null ? normalize(String(rawName)) : '';
    return displayNameByNorm.get(nkId) || displayNameByNorm.get(nkName) || String(rawName || rawId || 'Geral');
  };

  const rawPoints = [];

  const parseUnitMetric = (val) => {
    const n = toFinite(val, null);
    return n !== null && n >= 0 && n <= 1 ? n : null;
  };

  const pushPoint = (ts, brier, ece, label = '') => {
    const t = typeof ts === 'number' ? ts : toDateMs(ts);
    const b = parseUnitMetric(brier);
    const e = parseUnitMetric(ece);
    if (!Number.isFinite(t) || t <= 0 || (b === null && e === null)) return;
    rawPoints.push({ ts: t, brier: b, ece: e, label, normLabel: normalize(label) });
  };

  safeArr(auditLogs).forEach((log) => {
    if (!isAllowedCategory(log.categoryId, log.categoryName)) return;
    const cat = resolveDisplayLabel(log.categoryId, log.categoryName);
    if (categoryFilter !== 'all' && normalize(cat) !== normalize(categoryFilter) && normalize(String(log.categoryId || '')) !== normalize(categoryFilter)) return;
    pushPoint(log.timestamp ?? log.ts, log.avgBrier ?? log.brier, log.ece, cat);
  });

  if (historyByCategory && typeof historyByCategory === 'object') {
    Object.entries(historyByCategory).forEach(([catKey, list]) => {
      safeArr(list).forEach((item) => {
        if (!isAllowedCategory(catKey, item?.categoryName)) return;
        const cat = resolveDisplayLabel(catKey, item?.categoryName);
        if (categoryFilter !== 'all' && normalize(cat) !== normalize(categoryFilter) && normalize(catKey) !== normalize(categoryFilter)) return;
        pushPoint(item.timestamp ?? item.ts, item.avgBrier ?? item.brier, item.ece, cat);
      });
    });
  }

  if (rawPoints.length === 0 && categoryFilter === 'all') {
    safeArr(healthSnapshots).forEach((snap) => {
      const m = snap?.metrics || {};
      pushPoint(
        snap.generatedAt ?? snap.timestamp,
        m.currentCalibration?.avgBrier ??
        m.calibrationDrift?.brier?.recentMean ??
        m.probabilityCalibrationDrift?.recent?.brier ??
        m.calibrationDrift?.recentMean ??
        m.avgBrier ??
        m.brier ??
        m.calibration?.avgBrier,
        m.currentCalibration?.ece ?? m.ece ?? m.calibration?.ece,
        'Global'
      );
    });
  }

  rawPoints.sort((a, b) => a.ts - b.ts);

  // Dedupe points within 1 second per normalized label (even when interleaved across categories)
  const lastTsByLabel = new Map();
  const deduped = [];
  rawPoints.forEach((pt) => {
    const labelKey = pt.normLabel || '__default__';
    const lastTs = lastTsByLabel.get(labelKey);
    if (lastTs !== undefined && Math.abs(pt.ts - lastTs) < 1000) return;
    lastTsByLabel.set(labelKey, pt.ts);
    const dayKey = getDateKey(new Date(pt.ts)) || new Date(pt.ts).toISOString().slice(0, 10);
    deduped.push({
      ts: pt.ts,
      dayKey,
      brier: pt.brier !== null ? Number(pt.brier.toFixed(4)) : null,
      ece: pt.ece !== null ? Number(pt.ece.toFixed(4)) : null,
      label: pt.label,
      normLabel: pt.normLabel,
      dateLabel: formatShortBrDate(dayKey),
    });
  });

  // Quando visualizando 'all' com múltiplas disciplinas no mesmo dia, agrega por dia (em APP_TIMEZONE)
  // para evitar zigue-zague artificial entre disciplinas diferentes.
  const distinctLabels = new Set(deduped.map((p) => p.normLabel).filter(Boolean));
  if (categoryFilter === 'all' && distinctLabels.size > 1) {
    const byDay = new Map();
    deduped.forEach((pt) => {
      const dayKey = pt.dayKey;
      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, { ts: pt.ts, dateLabel: formatShortBrDate(dayKey), briers: [], eces: [], labels: new Set() });
      }
      const bucket = byDay.get(dayKey);
      bucket.ts = Math.max(bucket.ts, pt.ts);
      if (pt.brier !== null) bucket.briers.push(pt.brier);
      if (pt.ece !== null) bucket.eces.push(pt.ece);
      if (pt.label) bucket.labels.add(pt.label);
    });
    const aggregated = Array.from(byDay.values())
      .sort((a, b) => a.ts - b.ts)
      .map((b) => ({
        ts: b.ts,
        dateLabel: b.dateLabel,
        brier: b.briers.length > 0 ? Number((b.briers.reduce((x, y) => x + y, 0) / b.briers.length).toFixed(4)) : null,
        ece: b.eces.length > 0 ? Number((b.eces.reduce((x, y) => x + y, 0) / b.eces.length).toFixed(4)) : null,
        label: b.labels.size === 1 ? Array.from(b.labels)[0] : `Média (${b.labels.size} disciplinas)`,
      }));
    return aggregated.slice(-30);
  }

  return deduped.map(({ normLabel: _normLabel, dayKey: _dayKey, ...rest }) => rest).slice(-30);
}
