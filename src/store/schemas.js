import { safeClone } from './safeClone.js';
import { INITIAL_DATA } from '../data/initialData';
import { generateId } from '../utils/idGenerator';
import { normalize, aliases } from '../utils/normalization';
import { getDateKey } from '../utils/dateHelper';
import { computeCategoryStats } from '../engine';

export const DEFAULT_TARGET_SCORE = 75; // Unificando como 75 (meio termo entre 70 e 80)

/**
 * Validação Ultra-Resiliente (Sem Zod)
 * Garante que o app sempre tenha uma estrutura válida, mesmo com dados corrompidos.
 */

/**
 * REPAIR ENGINE: Rebuilds category history from raw simulation logs
 * if discrepancies are detected. This is a SILENT repair that happens
 * during each state update from Firebase or LocalStorage.
 */
const extractRowDate = (r) => {
  if (!r) return null;

  if (r.date && typeof r.date === 'object' && Number.isFinite(Number(r.date._seconds))) {
    return new Date(Number(r.date._seconds) * 1000);
  }

  if (r.createdAt && typeof r.createdAt === 'object' && Number.isFinite(Number(r.createdAt._seconds))) {
    return new Date(Number(r.createdAt._seconds) * 1000);
  }

  return r.date || r.createdAt || null;
};

const repairContestHistory = (data) => {
  if (!data.simuladoRows || data.simuladoRows.length === 0 || !data.categories) return data;

  const rows = data.simuladoRows;
  let hasRepaired = false;

  data.categories.forEach(cat => {
    const catNorm = normalize(cat.name);
    const catAliases = aliases[catNorm] || [];

    const myRows = rows.filter(r => {
      if (r.categoryId && r.categoryId === cat.id) return true;

      const subNorm = normalize(r.subject);
      if (!subNorm) return false;

      return subNorm === catNorm ||
        catAliases.some(a => normalize(a) === subNorm);
    });

    if (myRows.length === 0) return;

    const currentHistory = cat.simuladoStats?.history || [];
    const maxScore = cat.maxScore ?? 100;

    const uniqueDaysInLogs = new Set(
      myRows
        .map(r => getDateKey(extractRowDate(r)))
        .filter(Boolean)
    ).size;

    const currentUniqueDays = new Set(
      currentHistory
        .map(h => getDateKey(h.date))
        .filter(Boolean)
    ).size;

    const hasCorruptedHistory = currentHistory.some(h =>
      !h ||
      typeof h !== 'object' ||
      !h.date ||
      (h.total === undefined && h.score === undefined && h.correct === undefined) ||
      (h.score !== undefined && h.score !== null && Number.isNaN(Number(h.score))) ||
      (h.total !== undefined && h.total !== null && Number.isNaN(Number(h.total)))
    );

    const dateCompressionBug = uniqueDaysInLogs > 1 && currentUniqueDays <= 1 && currentHistory.length > 0;
    const repairThreshold = Math.ceil(currentHistory.length * 1.2);

    if (
      hasCorruptedHistory ||
      dateCompressionBug ||
      currentHistory.length === 0 ||
      uniqueDaysInLogs > repairThreshold
    ) {
      hasRepaired = true;

      const dailyStats = {};

      myRows.forEach(r => {
        const dk = getDateKey(extractRowDate(r));
        if (!dk) return;

        if (!dailyStats[dk]) dailyStats[dk] = { correct: 0, total: 0 };

        const rawTotal = parseInt(r.total, 10) || 0;
        const rawCorrect = parseInt(r.correct, 10) || 0;

        const safeMaxScore = Math.max(1, maxScore);
        const rawScore = Number(r.score);
        const safeScore = Number.isFinite(rawScore) ? rawScore : 0;

        const corrNorm = (r.isPercentage && r.score != null && rawTotal > 0)
          ? Math.round((Math.min(safeMaxScore, Math.max(0, safeScore)) / safeMaxScore) * rawTotal)
          : rawCorrect;

        dailyStats[dk].correct += corrNorm;
        dailyStats[dk].total += rawTotal;
      });

      const rebuiltHistory = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        correct: stats.correct,
        total: stats.total,
        score: (stats.total > 0 && Number.isFinite(stats.correct))
          ? (stats.correct / stats.total) * maxScore
          : 0
      })).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

      const statsResult = computeCategoryStats(rebuiltHistory, cat.weight || 10, 60, maxScore);

      cat.simuladoStats = {
        history: rebuiltHistory,
        average: Number(statsResult.mean.toFixed(2)),
        trend: statsResult.trend || 'stable',
        lastAttempt: rebuiltHistory.length > 0 ? rebuiltHistory[rebuiltHistory.length - 1].score : 0,
        level: statsResult.level || (
          statsResult.mean > 0.7 * maxScore
            ? 'ALTO'
            : statsResult.mean > 0.4 * maxScore
              ? 'MÉDIO'
              : 'BAIXO'
        )
      };
    }
  });

  if (hasRepaired) {
    data.lastUpdated = new Date().toISOString();
  }

  return data;
};


export const sanitizeContest = (data) => {
  if (!data || typeof data !== 'object') return { ...INITIAL_DATA };

  const source = (data.simuladoRows && data.simuladoRows.length > 0)
    ? repairContestHistory(safeClone(data))
    : data;

  // FORTRESS-01: Defensive initialization for all top-level keys
  return {
    user: {
      ...(source.user && typeof source.user === 'object' ? source.user : {}),
      name: source.user?.name || "Estudante",
      avatar: source.user?.avatar || "👤",
      startDate: source.user?.startDate || getDateKey(new Date()),
      goalDate: source.user?.goalDate || null,
      targetScore: (source.user?.targetScore != null) ? Number(source.user.targetScore) : DEFAULT_TARGET_SCORE,
      xp: Number(source.user?.xp) || 0,
      level: Number(source.user?.level) || 1,
      achievements: (Array.isArray(source.user?.achievements) ? source.user.achievements : [])
        .map(a => typeof a === 'string' ? a : a?.id)
        .filter(Boolean),
      studiedEarly: Boolean(source.user?.studiedEarly),
      studiedLate: Boolean(source.user?.studiedLate),
      targetProbability: (source.user?.targetProbability != null && Number.isFinite(Number(source.user.targetProbability)))
        ? Number(source.user.targetProbability)
        : 70
    },
    coachPlan: Array.isArray(source.coachPlan) ? source.coachPlan : Object.values(source.coachPlan || {}),
    calibrationMetrics: (source.calibrationMetrics && typeof source.calibrationMetrics === 'object') ? source.calibrationMetrics : {},
    coachScore: (source.coachScore && typeof source.coachScore === 'object') ? source.coachScore : null,
    coachPlanner: (source.coachPlanner && typeof source.coachPlanner === 'object')
      ? source.coachPlanner
      : { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
    categories: (Array.isArray(source.categories) ? source.categories : Object.values(source.categories || {})).map(cat => ({
      id: cat.id || generateId('cat'),
      name: cat.name || "Sem Nome",
      color: cat.color || "#3b82f6",
      icon: cat.icon || "📚",
      tasks: (() => {
        const rawTasks = (Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {})).map(t => ({
          id: t.id || generateId('task'),
          text: t.text || t.title || t.topic || "Nova Tarefa",
          title: t.title || t.text || t.topic || "Nova Tarefa",
          completed: Boolean(t.completed),
          completedAt: t.completedAt || null,
          lastStudiedAt: t.lastStudiedAt || null,
          priority: t.priority || "medium",
          // BUG-01 & 02 FIX: Preserve awardedXP and studying status during sync/reload
          ...(t.awardedXP != null ? { awardedXP: Number(t.awardedXP) } : {}),
          ...(t.status ? { status: t.status } : {})
        })).filter(t => t.id && (t.text || t.title)); // Skip Corrupted Tasks

        // BUG 16 FIX: Deduplicação rigorosa por nome normalizado
        const seenTaskNames = new Set();
        return rawTasks.filter(t => {
          const normName = t.text.toLowerCase().trim();
          if (seenTaskNames.has(normName)) return false;
          seenTaskNames.add(normName);
          return true;
        });
      })(),
      weight: (cat.weight !== undefined && cat.weight !== null) ? Number(cat.weight) : 10,
      maxScore: Number(cat.maxScore) || 100,
      minCutoff: Number(cat.minCutoff) || 0,
      level: Number(cat.level) || 0,
      totalMinutes: Number(cat.totalMinutes) || 0,
      lastStudiedAt: cat.lastStudiedAt || null,
      simuladoStats: {
        // Deep-strip nulls/poison from history. Support both Array and legacy Object formats.
        history: (Array.isArray(cat.simuladoStats?.history) 
          ? cat.simuladoStats.history 
          : Object.values(cat.simuladoStats?.history || {}))
          .filter(h => h && typeof h === 'object' && h.date && (h.total > 0 || h.score != null)),
        average: Number(cat.simuladoStats?.average) || 0,
        lastAttempt: Number(cat.simuladoStats?.lastAttempt) || 0,
        trend: cat.simuladoStats?.trend || "stable",
        level: cat.simuladoStats?.level || "BAIXO"
      }
    })),
    simuladoRows: (Array.isArray(source.simuladoRows) ? source.simuladoRows : Object.values(source.simuladoRows || {})).filter(r => r && r.id),
    simulados: (Array.isArray(source.simulados) ? source.simulados : Object.values(source.simulados || {})).filter(s => s && s.id),
    studyLogs: (Array.isArray(source.studyLogs) ? source.studyLogs : Object.values(source.studyLogs || {})).filter(l => l && l.id),
    studySessions: (Array.isArray(source.studySessions) ? source.studySessions : Object.values(source.studySessions || {})).filter(s => s && s.id),
    notes: typeof source.notes === 'string' ? source.notes : "",
    // NEW TOOLS
    flashcardDecks: Array.isArray(source.flashcardDecks) ? source.flashcardDecks : [],
    agenda: Array.isArray(source.agenda) ? source.agenda : [],
    // Math / Calibration history (lightweight for continuous calibration)
    calibrationEvents: Array.isArray(source.calibrationEvents) ? source.calibrationEvents.slice(-200) : [], // keep last 200 for walk-forward
    settings: {
      darkMode: source.settings?.darkMode ?? true,
      soundEnabled: source.settings?.soundEnabled ?? true,
      pomodoroWork: Number(source.settings?.pomodoroWork) || 25,
      pomodoroBreak: Number(source.settings?.pomodoroBreak) || 5,
      pomodoroLongBreak: Number(source.settings?.pomodoroLongBreak) || 15,
      longBreakAfter: Number(source.settings?.longBreakAfter) || 4,
      sessions: Number(source.settings?.sessions) || 0,
      completedCycles: Number(source.settings?.completedCycles) || 0,
    },
    mcWeights: (source.mcWeights && typeof source.mcWeights === 'object') ? source.mcWeights : {},
    // BUG-10 REVERSION: monteCarloHistory MUST be an Array for charts and slices to work.
    // Migration: If it's an object (legacy), convert it to an array of {date, probability}.
    monteCarloHistory: (() => {
      const raw = source.monteCarloHistory;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === 'object') {
        return Object.entries(raw).map(([date, data]) => ({
          date,
          probability: typeof data === 'object' ? data.probability : data,
          ...(typeof data === 'object' ? data : {})
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
      return [];
    })(),
    contestName: source.contestName || source.user?.name || "Novo Concurso",
    lastUpdated: (source.lastUpdated && !isNaN(new Date(source.lastUpdated).getTime())) ? source.lastUpdated : new Date().toISOString(),
  };
};

export const extractCore = (obj, depth = 0) => {
  if (depth > 5 || !obj || typeof obj !== 'object') return null;
  if (obj.contests || (obj.categories && Array.isArray(obj.categories))) return obj;
  if (obj.appState) return extractCore(obj.appState, depth + 1);
  if (obj.state) return extractCore(obj.state, depth + 1);
  return null;
};

export const validateAppState = (data) => {
  try {
    if (!data) return { contests: { 'default': INITIAL_DATA }, activeId: 'default', lastUpdated: new Date().toISOString() };

    let coreData = extractCore(data);
    let d = coreData || data;

    // Migração de formato Legado (único concurso) para Multi-Concurso
    if (d.categories && Array.isArray(d.categories) && !d.contests) {
      const contestData = { ...d };
      d = {
        contests: { 'default': contestData },
        activeId: 'default',
        lastUpdated: d.lastUpdated || new Date().toISOString()
      };
    }

    const validatedContests = {};
    const rawContests = d.contests || { 'default': INITIAL_DATA };

    Object.entries(rawContests).forEach(([id, contestData]) => {
      validatedContests[id] = sanitizeContest(contestData);
    });

    let activeId = d.activeId || 'default';

    // C4 FIX: Removed silent auto-redirect to 'Direito' to prevent unexpected focus loss.

    if (!validatedContests[activeId]) activeId = Object.keys(validatedContests)[0] || 'default';

    const finalState = {
      contests: validatedContests,
      activeId: activeId,
      dashboardFilter: d.dashboardFilter || 'all',
      pomodoro: {
        ...(d.pomodoro && typeof d.pomodoro === 'object' ? d.pomodoro : {}),
        activeSubject: d.pomodoro?.activeSubject || null,
        targetCycles: Math.max(1, Number(d.pomodoro?.targetCycles) || 1),
        // 🛡️ [FIX-SCHEMA] Valida campos críticos do pomodoro para blindar contra
        // estado corrompido/legado que poderia crashar o timer silenciosamente.
        mode: ['work', 'break', 'long_break'].includes(d.pomodoro?.mode) ? d.pomodoro.mode : 'work',
        sessions: Math.max(1, Number(d.pomodoro?.sessions) || 1),
        completedCycles: Math.max(0, Number(d.pomodoro?.completedCycles) || 0),
        accumulatedMinutes: Math.max(0, Number(d.pomodoro?.accumulatedMinutes) || 0),
      },

      history: Array.isArray(d.history) ? d.history : [],
      trash: Array.isArray(d.trash) ? d.trash.filter(item => {
        if (!item) return false;

        const parsedDeletedAt = item.deletedAt ? new Date(item.deletedAt) : null;
        const deletedAt = parsedDeletedAt && !isNaN(parsedDeletedAt.getTime())
          ? parsedDeletedAt
          : new Date();

        return (new Date() - deletedAt) / (1000 * 60 * 60 * 24) <= 30;
      }) : [],
      hasSeenTour: Boolean(d.hasSeenTour),
      lastSeenTourDate: typeof d.lastSeenTourDate === 'string' ? d.lastSeenTourDate : '',
      lastHistoryTime: Number(d.lastHistoryTime) || 0,
      version: Number(d.version) || 0,
      mcEqualWeights: d.mcEqualWeights ?? true,
      lastUpdated: d.lastUpdated || new Date().toISOString()
    };


    return finalState;
  } catch (err) {
    console.error("[Validate] Erro catastrófico, retornando inicial:", err);
    return { contests: { 'default': INITIAL_DATA }, activeId: 'default', lastUpdated: new Date().toISOString() };
  }
};
