import { getDateKey, normalizeDate, toDateMs, getAppTimezone } from './dateHelper.js';
import { parseNoonLocal } from './parseNoonLocal.js';
import { getSafeScore, getSyntheticTotal, extractTopicsTotals } from './scoreHelper.js';
import { normalize } from './normalization.js';
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
  const min = cMin !== null ? Math.min(cMin, max - 1e-6) : Math.min(gMin, max - 1e-6);
  return { min, max, range: Math.max(1e-9, max - min) };
}

function getCutoffMs(timeWindow) {
  if (!timeWindow || timeWindow === 'all') return null;
  const days = Number.parseInt(String(timeWindow), 10);
  if (!Number.isFinite(days) || days <= 0) return null;
  const cutoff = new Date();
  cutoff.setHours(12, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  return toDateMs(getDateKey(cutoff));
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
  } = options;

  const cutoffMs = getCutoffMs(timeWindow);
  const gMin = toFinite(minScore, 0);
  const gMax = Math.max(gMin + 1, toFinite(maxScore, 100));
  const targetPct = clamp(((toFinite(targetScore, gMin + 0.8 * (gMax - gMin)) - gMin) / (gMax - gMin)) * 100, 10, 99);

  const cats = safeArr(categories).filter((c) => !showOnlyFocus || !focusSubjectId || c.id === focusSubjectId);
  const rows = safeArr(simuladoRows).filter((r) => r && r.valid !== false && r.validated !== false);

  const points = [];

  if (mode === 'topic') {
    const topicBuckets = new Map();
    cats.forEach((cat) => {
      const { min, max, range } = resolveScale(cat, gMax, gMin);
      const history = safeArr(cat?.simuladoStats?.history);
      history.forEach((h) => {
        if (!h || h.valid === false || h.validated === false) return;
        const ms = toDateMs(h.date || h.createdAt);
        if (cutoffMs && Number.isFinite(ms) && ms < cutoffMs) return;
        const topics = safeArr(h.topics);
        topics.forEach((t) => {
          const ts = toFinite(t.timeSpent ?? t.durationSeconds, 0);
          const tot = toFinite(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions, 0);
          const rawCorr = toFinite(t.correct ?? t.acertos ?? t.correctCount, null);
          if (ts <= 0 || tot <= 0) return;
          const sc = getSafeScore(t, max, min);
          const corr = rawCorr !== null
            ? clamp(rawCorr, 0, tot)
            : (Number.isFinite(sc) ? clamp((sc - min) / range, 0, 1) * tot : 0);
          const label = String(t.name || t.topic || t.assunto || '').trim();
          if (!label) return;
          const key = `${cat.id || cat.name}::${normalize(label)}`;
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

    // Complement with simuladoRows that carry topic + timeSpent if history didn't have topic timings
    if (topicBuckets.size === 0) {
      rows.forEach((r) => {
        const ms = toDateMs(r.date || r.createdAt);
        if (cutoffMs && Number.isFinite(ms) && ms < cutoffMs) return;
        const ts = toFinite(r.timeSpent ?? r.durationSeconds, 0);
        const tot = toFinite(r.total ?? r.questoes ?? r.totalQuestoes ?? r.questions, 0);
        if (ts <= 0 || tot <= 0) return;
        const matchedCat = cats.find(
          (c) => (r.categoryId && String(c.id) === String(r.categoryId)) || normalize(c.name) === normalize(r.subject || r.materia || '')
        );
        if (showOnlyFocus && focusSubjectId && matchedCat?.id !== focusSubjectId) return;
        const topicLabel = String(r.topic || r.assunto || '').trim();
        if (!topicLabel) return;
        const { min, max, range } = resolveScale(matchedCat, gMax, gMin);
        const rawCorr = toFinite(r.correct ?? r.acertos ?? r.correctCount, null);
        const sc = getSafeScore(r, max, min);
        const corr = rawCorr !== null
          ? clamp(rawCorr, 0, tot)
          : (Number.isFinite(sc) ? clamp((sc - min) / range, 0, 1) * tot : 0);
        const key = `${matchedCat?.id || r.subject || 'cat'}::${normalize(topicLabel)}`;
        if (!topicBuckets.has(key)) {
          topicBuckets.set(key, {
            id: key,
            name: topicLabel,
            categoryName: matchedCat?.name || r.subject || 'Disciplina',
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
        b.timedQuestions += toFinite(r.timedQuestoes, 0) > 0 ? toFinite(r.timedQuestoes, 0) : tot;
      });
    }

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
        correct: Math.round(b.correct),
        totalTimeSeconds: Math.round(b.timeSpent),
      });
    });
  } else {
    cats.forEach((cat) => {
      const { min, max, range } = resolveScale(cat, gMax, gMin);
      const history = safeArr(cat?.simuladoStats?.history).filter((h) => {
        if (!h || h.valid === false || h.validated === false) return false;
        const ms = toDateMs(h.date || h.createdAt);
        return !cutoffMs || !Number.isFinite(ms) || ms >= cutoffMs;
      });

      let timeSpent = 0;
      let timedQuestions = 0;
      let totalQuestions = 0;
      let correct = 0;
      let scorePctSum = 0;
      let scorePctCount = 0;

      history.forEach((h) => {
        let tot = toFinite(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions, 0);
        const topics = safeArr(h.topics);
        let topicsTs = 0;
        let topicsTq = 0;
        topics.forEach((t) => {
          const tTs = toFinite(t?.timeSpent ?? t?.durationSeconds, 0);
          const tQ = toFinite(t?.timedQuestoes, 0) || toFinite(t?.total ?? t?.questoes ?? t?.totalQuestoes ?? t?.questions, 0);
          if (tTs > 0 && tQ > 0) {
            topicsTs += tTs;
            topicsTq += tQ;
          }
        });
        if (topicsTs > 0 && topicsTq > 0) {
          timeSpent += topicsTs;
          timedQuestions += topicsTq;
        } else {
          const ts = toFinite(h.timeSpent ?? h.durationSeconds, 0);
          const tq = toFinite(h.timedQuestoes, 0) || (ts > 0 ? (tot > 0 ? tot : getSyntheticTotal(max)) : 0);
          if (ts > 0 && tq > 0) {
            timeSpent += ts;
            timedQuestions += tq;
          }
        }
        let topicCorrFallback = null;
        if (tot <= 0 && h.topics != null) {
          const tf = extractTopicsTotals(h, max, min);
          if (tf.total > 0) {
            tot = tf.total;
            topicCorrFallback = tf.correct;
          }
        }
        if (tot > 0) {
          const rawCorr = !h.isPercentage
            ? toFinite(h.correct ?? h.acertos ?? h.correctCount, topicCorrFallback)
            : topicCorrFallback;
          const sc = getSafeScore(h, max, min);
          const corr = rawCorr !== null
            ? clamp(rawCorr, 0, tot)
            : (Number.isFinite(sc) ? clamp((sc - min) / range, 0, 1) * tot : 0);
          totalQuestions += tot;
          correct += corr;
        } else {
          const sc = getSafeScore(h, max, min);
          if (Number.isFinite(sc)) {
            scorePctSum += clamp(((sc - min) / range) * 100, 0, 100);
            scorePctCount += 1;
          }
        }
      });

      if (timedQuestions <= 0) return;
      const accuracyPct = totalQuestions > 0
        ? clamp((correct / totalQuestions) * 100, 0, 100)
        : (scorePctCount > 0 ? scorePctSum / scorePctCount : 0);

      points.push({
        id: cat.id || cat.name,
        name: cat.name,
        subtitle: `Peso ${toFinite(cat.weight, 10)}`,
        color: cat.color || '#6366f1',
        weight: toFinite(cat.weight, 10),
        avgSeconds: Number((timeSpent / timedQuestions).toFixed(1)),
        accuracyPct: Number(accuracyPct.toFixed(1)),
        totalQuestions: Math.round(totalQuestions || timedQuestions),
        correct: Math.round(correct),
        totalTimeSeconds: Math.round(timeSpent),
      });
    });
  }

  const sortedSecs = points.map((p) => p.avgSeconds).sort((a, b) => a - b);
  const autoBenchmarkSec = sortedSecs.length > 0 ? Math.round(quantileSorted(sortedSecs, 0.5)) : 150;
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
    const isAccurate = p.accuracyPct >= targetPct;
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
    targetPct: Number(targetPct.toFixed(1)),
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

  // Sample dates evenly (~24-35 points) including start, today, and end
  const totalSpanDays = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY));
  const stepDays = Math.max(1, Math.ceil(totalSpanDays / 28));
  const sampleMsSet = new Set([startMs, todayMs, endMs]);
  for (let m = startMs; m <= endMs; m += stepDays * MS_PER_DAY) {
    sampleMsSet.add(m);
  }
  const sortedSampleMs = Array.from(sampleMsSet).sort((a, b) => a - b);

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
    const progressRatio = isGoalExpired ? 1 : clamp((ms - startMs) / idealDenominator, 0, 1);
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
  // Ignore date-only strings like '2026-04-10' (no time of day -> would fake midnight!)
  if (typeof rawTimestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawTimestamp.trim())) {
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

  const cats = safeArr(categories).filter((c) => !showOnlyFocus || !focusSubjectId || c.id === focusSubjectId);

  const rows = [];
  cats.forEach((cat) => {
    const { min: cMin, max: cMax, range: cRange } = resolveScale(cat, gMax, gMin);
    const history = safeArr(cat?.simuladoStats?.history).filter((h) => {
      if (!h || h.valid === false || h.validated === false) return false;
      const ms = toDateMs(h.date || h.createdAt);
      return !cutoffMs || !Number.isFinite(ms) || ms >= cutoffMs;
    });

    const scores = history
      .map((h) => {
        const s = getSafeScore(h, cMax, cMin);
        if (!Number.isFinite(s)) return NaN;
        // Project onto global scale if displaying multi-subject together
        if (!showOnlyFocus && (cMax !== gMax || cMin !== gMin)) {
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

    const activeDomain = showOnlyFocus ? cRange : gRange;
    const iqrPct = (iqr / activeDomain) * 100;
    let stability = 'Estável';
    if (scores.length < 3) stability = 'Poucos dados';
    else if (iqrPct > 18) stability = 'Volátil';
    else if (iqrPct > 10) stability = 'Moderada';

    const rawCutoff = toFinite(cat?.minCutoff, null);
    const minCutoff = rawCutoff !== null && rawCutoff > cMin
      ? (!showOnlyFocus && (cMax !== gMax || cMin !== gMin)
        ? gMin + clamp((rawCutoff - cMin) / cRange, 0, 1) * gRange
        : rawCutoff)
      : null;

    rows.push({
      id: cat.id || cat.name,
      name: cat.name,
      color: cat.color || '#6366f1',
      count: scores.length,
      min: Number(minVal.toFixed(2)),
      q1: Number(q1.toFixed(2)),
      median: Number(median.toFixed(2)),
      q3: Number(q3.toFixed(2)),
      max: Number(maxVal.toFixed(2)),
      mean: Number(mean.toFixed(2)),
      std: Number(std.toFixed(2)),
      iqr: Number(iqr.toFixed(2)),
      stability,
      minCutoff: minCutoff !== null ? Number(minCutoff.toFixed(2)) : null,
    });
  });

  rows.sort((a, b) => b.median - a.median);

  return {
    rows,
    hasCutoffs: rows.some((r) => r.minCutoff !== null),
    domainMin: showOnlyFocus && cats[0] ? resolveScale(cats[0], gMax, gMin).min : gMin,
    domainMax: showOnlyFocus && cats[0] ? resolveScale(cats[0], gMax, gMin).max : gMax,
  };
}

// ============================================================================
// #11 — Simulador de Ritmo de Prova (Pacing / Orçamento de Tempo)
// ============================================================================
export function buildExamPacingData(categories = [], options = {}) {
  const examDurationMinutes = Math.max(15, toFinite(options.examDurationMinutes, 240));
  const examTotalQuestions = Math.max(5, Math.round(toFinite(options.examTotalQuestions, 100)));
  const idealSecPerQuestion = (examDurationMinutes * 60) / examTotalQuestions;
  const cutoffMs = getCutoffMs(options.timeWindow);

  const cats = safeArr(categories);
  const rawEntries = [];
  let globalTimeSec = 0;
  let globalTimedQ = 0;

  cats.forEach((cat) => {
    const history = safeArr(cat?.simuladoStats?.history).filter((h) => {
      if (!h || h.valid === false || h.validated === false) return false;
      const ms = toDateMs(h.date || h.createdAt);
      return !cutoffMs || !Number.isFinite(ms) || ms >= cutoffMs;
    });
    let timeSec = 0;
    let timedQ = 0;
    history.forEach((h) => {
      const topics = safeArr(h.topics);
      let topicsTs = 0;
      let topicsTq = 0;
      topics.forEach((t) => {
        const tTs = toFinite(t?.timeSpent ?? t?.durationSeconds, 0);
        const tQ = toFinite(t?.timedQuestoes, 0) || toFinite(t?.total ?? t?.questoes ?? t?.totalQuestoes ?? t?.questions, 0);
        if (tTs > 0 && tQ > 0) {
          topicsTs += tTs;
          topicsTq += tQ;
        }
      });
      if (topicsTs > 0 && topicsTq > 0) {
        timeSec += topicsTs;
        timedQ += topicsTq;
      } else {
        const ts = toFinite(h.timeSpent ?? h.durationSeconds, 0);
        const tot = toFinite(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions, 0);
        const tq = toFinite(h.timedQuestoes, 0) || (ts > 0 ? tot : 0);
        if (ts > 0 && tq > 0) {
          timeSec += ts;
          timedQ += tq;
        }
      }
    });
    globalTimeSec += timeSec;
    globalTimedQ += timedQ;
    const overrideWeight = options.mcWeights && cat.id != null ? toFinite(options.mcWeights[cat.id], null) : null;
    rawEntries.push({
      id: cat.id || cat.name,
      name: cat.name,
      color: cat.color || '#6366f1',
      weight: Math.max(0.5, overrideWeight !== null && overrideWeight > 0 ? overrideWeight : toFinite(cat.weight, 10)),
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
  // sempre que houver questões suficientes (>= número de disciplinas).
  const allocations = rawEntries.map((e, idx) => {
    const exact = (e.weight / totalWeight) * examTotalQuestions;
    const floorVal = examTotalQuestions >= rawEntries.length ? Math.max(1, Math.floor(exact)) : Math.max(1, Math.round(exact));
    return { idx, exact, allocated: floorVal, remainder: exact - Math.floor(exact) };
  });

  if (examTotalQuestions >= rawEntries.length) {
    let diff = examTotalQuestions - allocations.reduce((sum, a) => sum + a.allocated, 0);
    if (diff > 0) {
      const order = [...allocations].sort((a, b) => b.remainder - a.remainder);
      for (let i = 0; i < order.length && diff > 0; i++) {
        order[i].allocated += 1;
        diff -= 1;
      }
    } else if (diff < 0) {
      const order = [...allocations].sort((a, b) => a.remainder - b.remainder);
      for (let i = 0; i < order.length && diff < 0; i++) {
        if (order[i].allocated > 1) {
          order[i].allocated -= 1;
          diff += 1;
        }
      }
    }
  }

  const subjects = rawEntries.map((e, idx) => {
    const allocatedQuestions = allocations[idx].allocated;
    const effectiveSec = e.avgSecPerQ ?? fallbackAvgSec;
    const projectedMinutes = (allocatedQuestions * effectiveSec) / 60;
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

  const totalProjectedMinutes = Number(subjects.reduce((acc, s) => acc + s.projectedMinutes, 0).toFixed(1));
  const deltaMinutes = Number((totalProjectedMinutes - examDurationMinutes).toFixed(1));
  const overallAvgSec = (totalProjectedMinutes * 60) / examTotalQuestions;
  const estimatedUnanswered = deltaMinutes > 0 && overallAvgSec > 0
    ? Math.min(examTotalQuestions, Math.ceil((deltaMinutes * 60) / overallAvgSec))
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
  const horizonDays = clamp(Math.round(toFinite(options.horizonDays, 60)), 7, 365);
  const historicalCutoffs = safeArr(options.historicalCutoffs)
    .map((v) => toFinite(v, NaN))
    .filter((n) => Number.isFinite(n) && n >= minScore && n <= maxScore);

  const rawObs = [];
  if (focusCategory) {
    safeArr(focusCategory?.simuladoStats?.history).forEach((h) => {
      if (!h || h.valid === false || h.validated === false) return;
      const sc = getSafeScore(h, maxScore, minScore);
      const dk = getDateKey(h.date || h.createdAt);
      if (Number.isFinite(sc) && dk) rawObs.push({ date: dk, score: sc });
    });
  } else {
    safeArr(timeline).forEach((row) => {
      const sc = toFinite(
        row?.global_bayesian ?? row?.global_raw ?? row?.global_ema ?? row?.globalAvg ?? row?.bayGlobal ?? row?.score,
        NaN
      );
      if (Number.isFinite(sc) && row?.date) rawObs.push({ date: row.date, score: sc });
    });
  }

  rawObs.sort((a, b) => (toDateMs(a.date) || 0) - (toDateMs(b.date) || 0));

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

  // Agrega mesmo dia para evitar labels duplicados no eixo X do Recharts
  const byDay = new Map();
  rawObs.forEach((pt) => {
    if (!byDay.has(pt.date)) byDay.set(pt.date, { date: pt.date, sum: 0, count: 0 });
    const entry = byDay.get(pt.date);
    entry.sum += pt.score;
    entry.count += 1;
  });
  const uniqueDailyObs = Array.from(byDay.values()).map((d) => ({
    date: d.date,
    score: d.sum / d.count,
  }));

  const now = options.now instanceof Date ? options.now : new Date();
  const todayKey = getDateKey(now) || lastObs.date;
  const effectiveTodayKey = lastObs.date > todayKey ? lastObs.date : todayKey;
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

  const steps = Math.min(12, Math.max(4, Math.round(horizonDays / 7)));
  const refHorizon = clamp(Math.round(toFinite(options.mcHorizonDays, 60)), 14, 365);
  const sigma0 = Math.min(
    baseSigma * 0.85,
    Math.max(domain * 0.015, toFinite(kalman?.summary?.abilitySd, baseSigma * 0.45))
  );
  const diffVarAtRef = Math.max(Math.pow(domain * 0.015, 2), baseSigma * baseSigma - sigma0 * sigma0);
  // Constante de tempo fixa (90d) para retornos decrescentes invariante ao zoom do horizonte (30d/60d/90d/180d)
  const DRIFT_TAU_DAYS = 90;

  const futurePoints = [];
  const alreadyAtTarget = baseLevel >= targetScore && dailyDrift >= 0;
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
    observations = safeArr(focusCategory?.simuladoStats?.history)
      .filter((h) => {
        if (!h || h.valid === false || h.validated === false) return false;
        const ms = toDateMs(h.date || h.createdAt);
        return !cutoffMs || !Number.isFinite(ms) || ms >= cutoffMs;
      });
  } else {
    observations = safeArr(timeline)
      .filter((row) => {
        const ms = toDateMs(row?.date);
        return !cutoffMs || !Number.isFinite(ms) || ms >= cutoffMs;
      })
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
  const minScore = toFinite(options.minScore, 0);
  const maxScore = Math.max(minScore + 1, toFinite(options.maxScore, 100));
  const domain = Math.max(1e-9, maxScore - minScore);

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
      completed: Boolean(t.completed),
      proficiency: t.completed ? 0.72 : 0.35,
    });
  });

  safeArr(category?.simuladoStats?.history).forEach((h) => {
    if (!h || h.valid === false || h.validated === false) return;
    safeArr(h.topics).forEach((tp) => {
      const label = String(tp.name || tp.topic || '').trim();
      const key = normalizeGraphName(label);
      if (!key) return;
      const tot = toFinite(tp.total ?? tp.questoes, 0);
      const corr = toFinite(tp.correct ?? tp.acertos, 0);
      if (!topicMap.has(key)) {
        topicMap.set(key, {
          name: label,
          key,
          order: topicMap.size,
          total: 0,
          correct: 0,
          completed: false,
          proficiency: 0.5,
        });
      }
      const entry = topicMap.get(key);
      entry.total += Math.max(0, tot);
      entry.correct += clamp(corr, 0, Math.max(0, tot));
      if (entry.total > 0) {
        entry.proficiency = clamp(entry.correct / entry.total, 0, 1);
      } else {
        const sc = getSafeScore(tp, maxScore, minScore);
        if (Number.isFinite(sc)) entry.proficiency = clamp((sc - minScore) / domain, 0, 1);
      }
    });
  });

  const topicList = Array.from(topicMap.values()).slice(0, 12);
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
      const proficiencyPct = Math.round((src?.proficiency ?? 0.5) * 100);
      const isBlocked = Array.isArray(node.blockedBy) && node.blockedBy.length > 0;
      const item = {
        ...node,
        x: Math.round(x),
        y: Math.round(y),
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
        isBlocking: fromNode.proficiencyPct < 60,
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

  const pushPoint = (ts, brier, ece, label = '') => {
    const t = typeof ts === 'number' ? ts : toDateMs(ts);
    const b = toFinite(brier, null);
    const e = toFinite(ece, null);
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

  if (rawPoints.length === 0) {
    safeArr(healthSnapshots).forEach((snap) => {
      const m = snap?.metrics || {};
      pushPoint(
        snap.generatedAt ?? snap.timestamp,
        m.currentCalibration?.avgBrier ?? m.calibrationDrift?.recentMean ?? m.avgBrier ?? m.brier ?? m.calibration?.avgBrier,
        m.currentCalibration?.ece ?? m.ece ?? m.calibration?.ece,
        'Global'
      );
    });
  }

  rawPoints.sort((a, b) => a.ts - b.ts);

  // Dedupe points within 1 second using normalized label (evita duplicatas entre auditLog e historyByCategory)
  const deduped = [];
  rawPoints.forEach((pt) => {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.ts - pt.ts) < 1000 && prev.normLabel === pt.normLabel) return;
    const d = new Date(pt.ts);
    deduped.push({
      ts: pt.ts,
      brier: pt.brier !== null ? Number(pt.brier.toFixed(4)) : null,
      ece: pt.ece !== null ? Number(pt.ece.toFixed(4)) : null,
      label: pt.label,
      normLabel: pt.normLabel,
      dateLabel: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
  });

  // Quando visualizando 'all' com múltiplas disciplinas no mesmo dia, agrega por dia
  // para evitar zigue-zague artificial entre disciplinas diferentes.
  const distinctLabels = new Set(deduped.map((p) => p.normLabel).filter(Boolean));
  if (categoryFilter === 'all' && distinctLabels.size > 1) {
    const byDay = new Map();
    deduped.forEach((pt) => {
      const dayKey = new Date(pt.ts).toISOString().slice(0, 10);
      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, { ts: pt.ts, dateLabel: pt.dateLabel, briers: [], eces: [], labels: new Set() });
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

  return deduped.map(({ normLabel: _normLabel, ...rest }) => rest).slice(-30);
}
