export const SPEED_OPTIONS = [1, 10, 100];
export const MAX_TARGET_CYCLES = 20;
export const MAX_TIME_LEFT_SECONDS = 24 * 3600;

export const POMODORO_PRESETS = [
  { id: 'classic', label: '25/5', work: 25, break: 5, longBreak: 15, name: 'Clássico' },
  { id: 'concurso', label: '50/10', work: 50, break: 10, longBreak: 20, name: 'Concurso' },
  { id: 'ultradian', label: '90/15', work: 90, break: 15, longBreak: 30, name: 'Ultradiano' }
];

export const asArray = (value) =>
  Array.isArray(value) ? value : Object.values(value || {});

export const safeArray = (value) =>
  asArray(value).filter(Boolean);

export function normalizeCategories(rawCategories) {
  return safeArray(rawCategories).map(category => ({
    ...category,
    tasks: safeArray(category.tasks)
  }));
}

export function toPositiveMinutes(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    const fb = Number(fallback);
    if (!Number.isFinite(fb) || fb <= 0) return 25;
    return Math.min(240, Math.max(1, Math.round(fb)));
  }
  return Math.min(240, Math.max(1, Math.round(n)));
}

export function formatTime(seconds) {
  const safe = Number(seconds);
  if (!Number.isFinite(safe) || safe < 0) return '00:00';
  const secsInt = Math.ceil(safe);
  const mins = Math.floor(secsInt / 60);
  const secs = secsInt % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function calculateETA(timeLeft, speed = 1) {
  const safeTime = Number(timeLeft);
  if (!Number.isFinite(safeTime) || safeTime <= 0) return null;
  const safeSpeed = SPEED_OPTIONS.includes(Number(speed)) ? Number(speed) : 1;
  const msRemaining = (safeTime * 1000) / safeSpeed;
  const d = new Date(Date.now() + msRemaining);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const stripDupSuffix = (val) => String(val || '').replace(/-dup\d+-[a-zA-Z0-9_-]+$/, '');

export function matchesSubjectTask(t, subject) {
  if (!t || !subject || subject.taskId == null) return false;
  const tid = String(subject.taskId);
  const cleanTid = stripDupSuffix(tid);
  const tIdStr = t.id != null ? String(t.id) : null;
  const cleanTId = tIdStr != null ? stripDupSuffix(tIdStr) : null;
  return (
    (tIdStr != null && (tIdStr === tid || (cleanTid && cleanTId === cleanTid))) ||
    (t.text != null && String(t.text) === tid) ||
    (t.title != null && String(t.title) === tid)
  );
}

/**
 * Checks if a category is compatible with the active Pomodoro subject.
 * Allows legacy/mock subjects without category metadata to still match.
 */
export function isActiveSubjectInCategory(category, subject) {
  if (!subject) return false;
  const hasSubjectCat = Boolean(subject.categoryId || subject.category);
  if (!hasSubjectCat) return true;
  if (!category) return false;

  const sCatId = subject.categoryId != null ? String(subject.categoryId) : null;
  const sCatName = subject.category != null ? String(subject.category) : null;
  const cId = category.id != null ? String(category.id) : null;
  const cName = category.name != null ? String(category.name) : null;

  return Boolean(
    (sCatId && (cId === sCatId || cName === sCatId)) ||
    (sCatName && (cName === sCatName || cId === sCatName))
  );
}

/**
 * Matches a task inside a specific category against the active Pomodoro subject,
 * preventing cross-category collisions when tasks share the same title/id.
 */
export function matchesActiveSubjectTask(category, task, subject, taskIdOverride = null) {
  if (!subject || !isActiveSubjectInCategory(category, subject)) return false;

  const candidateIds = new Set(
    [taskIdOverride, task?.id, task?.text, task?.title]
      .filter(v => v !== undefined && v !== null && v !== '')
      .map(v => String(v))
  );

  if (subject.taskId !== undefined && subject.taskId !== null && subject.taskId !== '') {
    if (candidateIds.has(String(subject.taskId))) return true;
  }

  if (subject.task !== undefined && subject.task !== null && subject.task !== '' && task) {
    const sTask = String(subject.task);
    if (
      (task.title !== undefined && task.title !== null && String(task.title) === sTask) ||
      (task.text !== undefined && task.text !== null && String(task.text) === sTask)
    ) {
      return true;
    }
  }

  return false;
}

export function findSubjectTaskInContest(contestData, subject) {
  if (!contestData || !subject) return { catTask: null, targetTask: null };
  const safeCats = asArray(contestData.categories);
  const cat = safeCats.find(c => c && c.id === subject.categoryId);
  const catTasks = asArray(cat?.tasks);
  const catTask = catTasks.find(t => matchesSubjectTask(t, subject)) || null;

  const coachPlan = contestData.coachPlan;
  const coachTasks = Array.isArray(coachPlan)
    ? coachPlan
    : Array.isArray(coachPlan?.tasks)
      ? coachPlan.tasks
      : Object.values(coachPlan || {});
  const coachTask = coachTasks.find(t => matchesSubjectTask(t, subject)) || null;

  let plannerTask = null;
  if (contestData.coachPlanner && typeof contestData.coachPlanner === 'object') {
      for (const rawDayTasks of Object.values(contestData.coachPlanner)) {
        const dayTasks = asArray(rawDayTasks);
        const found = dayTasks.find(t => matchesSubjectTask(t, subject));
        if (found) {
          plannerTask = found;
          break;
        }
      }
    }

    return { catTask, targetTask: catTask || coachTask || plannerTask };
  }

  export function clearStudyingStatusInContest(prev, subject) {
    if (!prev || !subject) return prev;
    const resetList = (list) => asArray(list).map(t =>
      matchesSubjectTask(t, subject) && (t.status === 'studying' || (!t.completed && t.status && t.status !== 'idle'))
        ? { ...t, status: 'idle' }
        : t
    );
    const catsArray = asArray(prev.categories);
    const nextCategories = catsArray.map(c => {
      if (!c) return c;
      const shouldCheckCat = !subject.categoryId || subject.categoryId === 'geral' || subject.categoryId === 'default' || c.id === subject.categoryId;
      return shouldCheckCat ? { ...c, tasks: resetList(c.tasks) } : c;
    });
    const isTaskActiveStatus = (t) => t && matchesSubjectTask(t, subject) && (t.status === 'studying' || (!t.completed && t.status && t.status !== 'idle'));
    const nextCoachPlan = Array.isArray(prev.coachPlan)
      ? resetList(prev.coachPlan)
      : (prev.coachPlan && typeof prev.coachPlan === 'object'
        ? (Array.isArray(prev.coachPlan.tasks)
          ? { ...prev.coachPlan, tasks: resetList(prev.coachPlan.tasks) }
          : Object.fromEntries(Object.entries(prev.coachPlan).map(([k, t]) => [k, isTaskActiveStatus(t) ? { ...t, status: 'idle' } : t])))
        : prev.coachPlan);
    let nextCoachPlanner = prev.coachPlanner;
    if (prev.coachPlanner && typeof prev.coachPlanner === 'object' && !Array.isArray(prev.coachPlanner)) {
      nextCoachPlanner = Object.fromEntries(
        Object.entries(prev.coachPlanner).map(([day, tasks]) => [day, Array.isArray(tasks) ? resetList(tasks) : tasks])
      );
    }
    return {
      ...prev,
      categories: nextCategories,
      ...(prev.coachPlan !== undefined ? { coachPlan: nextCoachPlan } : {}),
      ...(prev.coachPlanner !== undefined ? { coachPlanner: nextCoachPlanner } : {})
    };
  }
