/**
 * canonicalNextMission.js
 *
 * Seletor canônico unificado da "Próxima Missão" entre Meu Painel (NextGoalCard),
 * Cronômetro (Pomodoro) e Coach IA (coachPlanner / coachPlan / Política Causal).
 */
import { getSuggestedFocus, generateDailyGoals, getCombinedHistory, getBestTask } from './coachLogic.js';
import { loadCausalModel, rerankCoachTasksWithCausalPolicy } from './coachCausal.js';
import { getCoachFeature } from './coachFeatures.js';
import { isSystemAlertTask, parseCoachTask } from './coachText.js';
import { normalize, isSubjectMatch } from './normalization.js';
import { normalizePriority } from './colorHelper.js';
import { getDateKey, normalizeDate } from './dateHelper.js';
import { getFlashcardDueTodayCount } from './analytics.js';
import { resolveUserTargetScorePoints } from './scoreHelper.js';

const DAY_KEYS_BY_JS_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const toArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);

function matchCategoryAndSyllabusTask(candidate, normalizedCategories, { allowFallback = true } = {}) {
  if (!candidate) return null;
  const parsed = parseCoachTask(candidate, normalizedCategories);
  const candCatId = candidate.categoryId || candidate.catId || null;
  const candCatName = candidate.category || candidate.catName || candidate.subject || parsed.subjectRaw || '';

  const category = normalizedCategories.find((c) => {
    if (!c) return false;
    if (candCatId && c.id && String(c.id) === String(candCatId)) return true;
    return Boolean(candCatName && c.name && isSubjectMatch(candCatName, c.name));
  });
  if (!category) return null;

  const pendingTasks = toArr(category.tasks).filter(
    (t) => t && !t.completed && String(t.status || '').toLowerCase() !== 'completed'
  );
  if (pendingTasks.length === 0) return null;

  const sourceTaskId = candidate.sourceTaskId || candidate.taskId || candidate.id || null;
  const rawTopic = String(candidate.topicName || parsed.topic || candidate.title || candidate.text || '')
    .replace(/^Avan[çc]o de Edital\s*[—-]\s*/i, '')
    .trim();
  const normTopic = normalize(rawTopic);
  const normCatName = normalize(category.name || '');

  let matchedTask = null;
  if (sourceTaskId) {
    matchedTask = pendingTasks.find((t) => t.id && String(t.id) === String(sourceTaskId));
  }
  if (!matchedTask && normTopic && normTopic !== normCatName) {
    matchedTask = pendingTasks.find((t) => {
      const tNorm = normalize(String(t.title || t.text || ''));
      return tNorm && (tNorm === normTopic || tNorm.includes(normTopic) || normTopic.includes(tNorm));
    });
  }
  if (!matchedTask && allowFallback) {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    matchedTask = [...pendingTasks].sort(
      (a, b) => (priorityOrder[normalizePriority(a?.priority)] ?? 1) - (priorityOrder[normalizePriority(b?.priority)] ?? 1)
    )[0];
  }

  return matchedTask ? { category, task: matchedTask, parsed } : null;
}

function enrichTaskForConsumers(task, category, extra = {}) {
  const cleanTitle = task.title || task.text || 'Estudo';
  return {
    ...task,
    id: task.id || cleanTitle,
    title: cleanTitle,
    text: task.text || cleanTitle,
    priority: normalizePriority(task.priority || extra.priority || 'medium'),
    catId: category.id,
    categoryId: category.id,
    catName: category.name,
    category: category.name,
    catColor: category.color || '#6366f1',
    catIcon: category.icon || '📚',
    ...(extra.sourceBadge ? { sourceBadge: extra.sourceBadge } : {}),
    ...(extra.sourceType ? { canonicalSource: extra.sourceType } : {}),
    ...(extra.agendaEventId ? { agendaEventId: extra.agendaEventId } : {}),
    ...(extra.isAgendaOnlyBlock ? { isAgendaOnlyBlock: true } : {}),
  };
}

export function resolveCanonicalNextMission({
  categories = [],
  simulados = [],
  simuladoRows = [],
  studyLogs = [],
  coachPlan = [],
  coachPlanner = null,
  agenda = [],
  flashcardDecks = [],
  user = null,
  minScore = 0,
  maxScore = 100,
  targetScore = null,
  calibrationHistoryByCategory = null,
  contestId = 'default',
  adaptiveCalibrationEnabled = true,
  now = null,
} = {}) {
  const normalizedCategories = toArr(categories).map((cat) => ({
    ...cat,
    tasks: toArr(cat?.tasks).filter((t) => t && (t.title || t.text || t.id)),
  }));

  const categoriesWithPending = normalizedCategories.filter((cat) =>
    cat.tasks.some((t) => !t.completed && String(t.status || '').toLowerCase() !== 'completed')
  );

  if (categoriesWithPending.length === 0) return null;

  const refDate = now ? (normalizeDate(now) || new Date()) : new Date();
  const todayKey = getDateKey(refDate);
  const todayDayKey = DAY_KEYS_BY_JS_DAY[refDate.getDay()];

  const safeMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const safeMin = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMax - 1) : 0;
  const effectiveTarget = Number.isFinite(Number(targetScore))
    ? Number(targetScore)
    : resolveUserTargetScorePoints(user, safeMin, safeMax, 0.85);
  const flashcardDue = getFlashcardDueTodayCount(flashcardDecks);

  const combinedSims = getCombinedHistory(
    toArr(simuladoRows),
    toArr(simulados),
    safeMax,
    safeMin
  );

  const coachOptions = {
    contestId,
    user,
    targetScore: effectiveTarget,
    maxScore: safeMax,
    minScore: safeMin,
    calibrationHistoryByCategory,
    flashcardDecks: toArr(flashcardDecks),
    flashcardDue,
    simuladoRows: toArr(simuladoRows),
    allSimulados: toArr(simulados),
    allCategories: normalizedCategories,
    now: refDate,
    config: {
      contestId,
      MC_ENABLE_ADAPTIVE_CALIBRATION: adaptiveCalibrationEnabled !== false,
    },
  };

  // 1. Tarefa já em execução ('studying') tem precedência imediata para retomada sem atrito
  for (const cat of categoriesWithPending) {
    const studyingTask = cat.tasks.find((t) => !t.completed && t.status === 'studying');
    if (studyingTask) {
      const focusCat = getSuggestedFocus([cat], combinedSims, toArr(studyLogs), coachOptions) || cat;
      return {
        category: focusCat,
        task: enrichTaskForConsumers(studyingTask, cat, {
          sourceType: 'studying',
          sourceBadge: 'Em Andamento',
        }),
        urgency: focusCat?.urgency || null,
        sourceType: 'studying',
        sourceBadge: 'Em Andamento',
      };
    }
  }

  // 2. Coluna do dia atual no Kanban Semanal do Coach (coachPlanner[todayDayKey])
  if (coachPlanner && typeof coachPlanner === 'object') {
    const todayPlanned = toArr(coachPlanner[todayDayKey]).filter(
      (item) => item && !item.completed && String(item.status || '').toLowerCase() !== 'completed' && !isSystemAlertTask(item)
    );
    for (const item of todayPlanned) {
      const matched = matchCategoryAndSyllabusTask(item, categoriesWithPending);
      if (matched) {
        const focusCat = getSuggestedFocus([matched.category], combinedSims, toArr(studyLogs), coachOptions) || matched.category;
        return {
          category: focusCat,
          task: enrichTaskForConsumers(matched.task, matched.category, {
            priority: item.priority,
            sourceType: 'coach_planner_today',
            sourceBadge: 'Planner de Hoje',
          }),
          urgency: {
            ...(focusCat?.urgency || {}),
            recommendation:
              item.analysis?.reason ||
              focusCat?.urgency?.recommendation ||
              'Missão alocada para hoje no seu Planner Semanal do Coach.',
          },
          sourceType: 'coach_planner_today',
          sourceBadge: 'Planner de Hoje',
        };
      }
    }
  }

  // 3. Bloco agendado para hoje na Agenda de Estudos (contest.agenda)
  const todayAgendaBlocks = toArr(agenda)
    .filter((ev) => ev && ev.date === todayKey && !ev.completed && !ev.manuallyUnchecked)
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  for (const block of todayAgendaBlocks) {
    const matched = matchCategoryAndSyllabusTask(
      { subject: block.subject, categoryId: block.categoryId, title: block.title, taskId: block.taskId },
      categoriesWithPending,
      { allowFallback: !block.autoGenerated }
    );
    if (matched) {
      const focusCat = getSuggestedFocus([matched.category], combinedSims, toArr(studyLogs), coachOptions) || matched.category;
      return {
        category: focusCat,
        task: enrichTaskForConsumers(matched.task, matched.category, {
          sourceType: 'agenda_today',
          sourceBadge: block.time ? `Agenda ${block.time}` : 'Agenda de Hoje',
          agendaEventId: block.id,
        }),
        urgency: {
          ...(focusCat?.urgency || {}),
          recommendation: `Bloco programado para hoje na Agenda${block.time ? ` às ${block.time}` : ''}: **${block.title}**.`,
        },
        sourceType: 'agenda_today',
        sourceBadge: block.time ? `Agenda ${block.time}` : 'Agenda de Hoje',
      };
    }
    const blockCat = normalizedCategories.find(
      (c) => c && ((block.categoryId && String(c.id) === String(block.categoryId)) || (block.subject && isSubjectMatch(block.subject, c.name)))
    );
    if (blockCat) {
      const focusCat = getSuggestedFocus([blockCat], combinedSims, toArr(studyLogs), coachOptions) || blockCat;
      const syntheticTask = {
        id: block.taskId || `agenda_block_${block.id}`,
        title: block.title || 'Bloco da Agenda',
        text: block.title || 'Bloco da Agenda',
        priority: 'high',
      };
      return {
        category: focusCat,
        task: enrichTaskForConsumers(syntheticTask, blockCat, {
          sourceType: 'agenda_today',
          sourceBadge: block.time ? `Agenda ${block.time}` : 'Agenda de Hoje',
          agendaEventId: block.id,
          isAgendaOnlyBlock: true,
        }),
        urgency: {
          ...(focusCat?.urgency || {}),
          recommendation: `Bloco programado para hoje na Agenda${block.time ? ` às ${block.time}` : ''}: **${block.title}**.`,
        },
        sourceType: 'agenda_today',
        sourceBadge: block.time ? `Agenda ${block.time}` : 'Agenda de Hoje',
      };
    }
  }

  // 4. Motor Coach completo + Política Causal (quando ativa)
  const suggestedCategory = getSuggestedFocus(
    categoriesWithPending,
    combinedSims,
    toArr(studyLogs),
    coachOptions
  );

  // Tenta extrair o tópico #1 ranqueado pelo Coach / Causal dentro da matéria prioritária
  let candidateGoals = toArr(coachPlan).filter(
    (t) => t && !t.completed && String(t.status || '').toLowerCase() !== 'completed' && !isSystemAlertTask(t)
  );
  if (candidateGoals.length === 0) {
    try {
      candidateGoals = toArr(generateDailyGoals(categoriesWithPending, combinedSims, toArr(studyLogs), coachOptions)).filter(
        (t) => t && !t.completed && !isSystemAlertTask(t)
      );
    } catch {
      candidateGoals = [];
    }
  }

  const useCausal =
    candidateGoals.length > 1 &&
    (getCoachFeature({ contestId }, 'useCausalTaskSelection', false) ||
      getCoachFeature({ contestId }, 'usePersonalizedPolicy', false));
  if (useCausal) {
    try {
      const model = loadCausalModel(contestId);
      if (model && Number(model.sampleSize) > 0) {
        candidateGoals = rerankCoachTasksWithCausalPolicy(candidateGoals, model, {
          maxScore: safeMax,
          minScore: safeMin,
        });
      }
    } catch {
      // fallback determinístico
    }
  }

  if (suggestedCategory) {
    // Procura primeiro meta do Coach que pertença à disciplina sugerida para manter paridade total
    const goalForSuggested = candidateGoals.find((g) => {
      const gCatId = g.categoryId || g.catId;
      const gSubj = g.category || g.catName || g.subject || '';
      if (gCatId && suggestedCategory.id && String(gCatId) === String(suggestedCategory.id)) return true;
      return Boolean(gSubj && suggestedCategory.name && isSubjectMatch(gSubj, suggestedCategory.name));
    });

    if (goalForSuggested) {
      const matchedInSuggested = matchCategoryAndSyllabusTask(goalForSuggested, [suggestedCategory]);
      if (matchedInSuggested) {
        return {
          category: suggestedCategory,
          task: enrichTaskForConsumers(matchedInSuggested.task, suggestedCategory, {
            priority: goalForSuggested.priority || matchedInSuggested.task.priority,
            sourceType: useCausal ? 'coach_causal' : 'coach_plan',
            sourceBadge: useCausal ? 'Política Causal IA' : 'Coach IA',
          }),
          urgency: suggestedCategory.urgency,
          sourceType: useCausal ? 'coach_causal' : 'coach_plan',
          sourceBadge: useCausal ? 'Política Causal IA' : 'Coach IA',
        };
      }
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedTasks = toArr(suggestedCategory.tasks)
      .filter((t) => t && !t.completed)
      .slice()
      .sort((a, b) => {
        const diff = (priorityOrder[normalizePriority(a?.priority)] ?? 1) - (priorityOrder[normalizePriority(b?.priority)] ?? 1);
        if (diff !== 0) return diff;
        if (a?.status === 'studying' && b?.status !== 'studying') return -1;
        if (b?.status === 'studying' && a?.status !== 'studying') return 1;
        return 0;
      });

    if (sortedTasks[0]) {
      return {
        category: suggestedCategory,
        task: enrichTaskForConsumers(sortedTasks[0], suggestedCategory, {
          sourceType: 'suggested_focus',
          sourceBadge: 'Motor Preditivo',
        }),
        urgency: suggestedCategory.urgency,
        sourceType: 'suggested_focus',
        sourceBadge: 'Motor Preditivo',
      };
    }
  }

  // 5. Fallback final via getBestTask com contexto completo
  const fallbackBest = getBestTask(categoriesWithPending, null, {
    contestId,
    studyLogs: toArr(studyLogs),
    now: refDate,
  });
  if (!fallbackBest) return null;

  const fallbackCat =
    categoriesWithPending.find((c) => String(c.id) === String(fallbackBest.categoryId || fallbackBest.catId)) ||
    categoriesWithPending[0];

  return {
    category: fallbackCat,
    task: enrichTaskForConsumers(fallbackBest, fallbackCat, {
      sourceType: 'best_task',
      sourceBadge: 'Recomendado IA',
    }),
    urgency: fallbackCat?.urgency || null,
    sourceType: 'best_task',
    sourceBadge: 'Recomendado IA',
  };
}

export default resolveCanonicalNextMission;
