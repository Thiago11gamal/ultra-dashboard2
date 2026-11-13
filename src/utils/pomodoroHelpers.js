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

export function matchesSubjectTask(t, subject) {
  if (!t || !subject || subject.taskId == null) return false;
  const tid = String(subject.taskId);
  return (
    (t.id != null && String(t.id) === tid) ||
    (t.text != null && String(t.text) === tid) ||
    (t.title != null && String(t.title) === tid)
  );
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
    for (const dayTasks of Object.values(contestData.coachPlanner)) {
      if (!Array.isArray(dayTasks)) continue;
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
  const nextCoachPlan = Array.isArray(prev.coachPlan) ? resetList(prev.coachPlan) : prev.coachPlan;
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
