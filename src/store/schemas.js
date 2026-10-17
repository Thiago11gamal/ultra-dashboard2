import { safeClone } from '../utils/safeClone.js';
import { INITIAL_DATA } from '../data/initialData.js';
import { generateId } from '../utils/idGenerator.js';
import { normalize, aliases } from '../utils/normalization.js';
import { getDateKey } from '../utils/dateHelper.js';
import { computeCategoryStats } from '../engine/index.js';
import { RECOVERED_DIREITO_CONTEST } from '../data/recoveredContests.js';
import { getSyntheticTotal } from '../utils/scoreHelper.js';

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

// ✅ FIX 2 & BUG-01: Reconciliação do Histórico das Categorias com base nos Registros Brutos dos Simulados
export const repairContestHistory = (rawData, maxScore = 100, minScore = 0) => {
  if (!rawData || typeof rawData !== 'object') return rawData;

  if (Array.isArray(rawData)) {
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Math.max(safeMin + 1e-9, Number(maxScore) || 100);
    return rawData.map(r => {
      if (!r || typeof r !== 'object') return r;
      const rawScore = Number(r?.score ?? r?.scorePoints);
      const hasRawScore = Number.isFinite(rawScore);

      let rawTotal = Math.max(0, parseInt(r?.total, 10) || 0);
      let rawCorrect = Math.max(0, parseInt(r?.correct, 10) || 0);
      let isSyntheticVolume = r?.syntheticVolume === true;

      if (rawTotal <= 0 && hasRawScore) {
        const ratio = Math.max(0, Math.min(1, (rawScore - safeMin) / (safeMax - safeMin)));
        rawTotal = typeof getSyntheticTotal === 'function' ? getSyntheticTotal(safeMax) : 20;
        rawCorrect = Math.round(ratio * rawTotal);
        isSyntheticVolume = true;
      }

      return {
        ...r,
        score: hasRawScore ? Math.min(safeMax, Math.max(safeMin, rawScore)) : safeMin,
        total: rawTotal,
        correct: rawCorrect,
        syntheticVolume: isSyntheticVolume,
      };
    });
  }

  const data = safeClone(rawData);
  if (!data.simuladoRows || data.simuladoRows.length === 0 || !data.categories) return data;

  const rows = data.simuladoRows;
  let hasRepaired = false;

  const categoriesArray = Array.isArray(data.categories) ? data.categories : Object.values(data.categories || {});
  categoriesArray.forEach(cat => {
    if (!cat || typeof cat !== 'object') return;
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
    const maxScore = Number(cat.maxScore) || Number(rawData?.maxScore) || 100;
    const minScore = Number.isFinite(Number(cat.minScore))
      ? Number(cat.minScore)
      : (Number.isFinite(Number(rawData?.minScore)) ? Number(rawData.minScore) : 0);
    const scoreRange = Math.max(1e-9, maxScore - minScore);

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
      (h.total === undefined && h.score === undefined && h.correct === undefined && h.scorePoints === undefined) ||
      (h.score !== undefined && h.score !== null && Number.isNaN(Number(h.score))) ||
      (h.scorePoints !== undefined && h.scorePoints !== null && Number.isNaN(Number(h.scorePoints))) ||
      (h.total !== undefined && h.total !== null && Number.isNaN(Number(h.total)))
    );

    const dateCompressionBug = uniqueDaysInLogs > 1 && currentUniqueDays <= 1 && currentHistory.length > 0;
    // ✅ LOTE-03: REMOVER uniqueDaysInLogs > repairThreshold
    // Reconstruir APENAS quando os dados estão corrompidos ou faltando.
    if (
      hasCorruptedHistory ||
      dateCompressionBug ||
      currentHistory.length === 0
    ) {
      hasRepaired = true;

      const dailyStats = {};

      myRows.forEach(r => {
        const dk = getDateKey(extractRowDate(r));
        if (!dk) return;

        if (!dailyStats[dk]) dailyStats[dk] = { correct: 0, total: 0, normalRowCount: 0, directScoreCount: 0, directScoreSum: 0 };

        const rawTotal = Number.isFinite(Number(r.total)) ? Number(r.total) : 0;
        const rawCorrect = Number.isFinite(Number(r.correct)) ? Number(r.correct) : 0;

        const scoreCandidate = r.score != null ? r.score : r.scorePoints;
        const rawScore = Number.isFinite(Number(scoreCandidate)) ? Number(scoreCandidate) : null;
        const safeScore = rawScore !== null ? Math.min(maxScore, Math.max(minScore, rawScore)) : null;

        const corrNorm = (r.isPercentage && safeScore !== null && rawTotal > 0)
          ? Math.round((Math.max(0, Math.min(1, (safeScore - minScore) / scoreRange))) * rawTotal)
          : rawCorrect;

        if (rawTotal === 0 && safeScore !== null) {
          const synTotal = 100;
          const ratio = (safeScore - minScore) / scoreRange;
          const synCorrect = Math.round(Math.max(0, Math.min(1, ratio)) * synTotal);
          dailyStats[dk].correct += synCorrect;
          dailyStats[dk].total += synTotal;
          dailyStats[dk].directScoreSum += safeScore;
          dailyStats[dk].directScoreCount += 1;
        } else {
          dailyStats[dk].correct += corrNorm;
          dailyStats[dk].total += rawTotal;
          dailyStats[dk].normalRowCount += 1;
        }
      });

      const rebuiltHistory = Object.entries(dailyStats).map(([date, stats]) => {
        let finalScore = minScore;
        if (stats.directScoreCount > 0 && stats.normalRowCount === 0) {
          finalScore = stats.directScoreSum / stats.directScoreCount;
        } else if (stats.total > 0 && Number.isFinite(stats.correct)) {
          finalScore = minScore + (stats.correct / stats.total) * scoreRange;
        } else if (stats.directScoreCount > 0) {
          finalScore = stats.directScoreSum / stats.directScoreCount;
        }
        return {
          date,
          correct: stats.correct,
          total: stats.total,
          score: Math.min(maxScore, Math.max(minScore, finalScore)),
          syntheticVolume: stats.normalRowCount === 0 && stats.directScoreCount > 0
        };
      }).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

      if (rebuiltHistory.length >= currentHistory.length || currentHistory.length === 0) {
        const statsResult = computeCategoryStats(rebuiltHistory, cat.weight || 10, 60, maxScore, minScore);

        cat.simuladoStats = {
          history: rebuiltHistory,
          average: statsResult ? Number(statsResult.mean.toFixed(2)) : 0,
          trend: statsResult?.trend || 'stable',
          lastAttempt: rebuiltHistory.length > 0 ? rebuiltHistory[rebuiltHistory.length - 1].score : 0,
          level: statsResult?.level || (
            (statsResult?.mean || 0) > 0.7 * maxScore
              ? 'ALTO'
              : (statsResult?.mean || 0) > 0.4 * maxScore
                ? 'MÉDIO'
                : 'BAIXO'
          )
        };
      } else {
        console.warn(`[Repair] Reconstrução produziria menos dados (${rebuiltHistory.length} < ${currentHistory.length}). Mantendo original.`);
      }
    }
  });

  if (hasRepaired) {
    data.lastUpdated = new Date().toISOString();
  }

  return data;
};


export const sanitizeContest = (data, contestId = '') => {
  if (!data || typeof data !== 'object') return { ...INITIAL_DATA };

  let source = (data.simuladoRows && data.simuladoRows.length > 0)
    ? repairContestHistory(data)
    : data;

  const isDireito = contestId === 'contest-7e146398-1fbf-48b6-904f-98d2f70d9f66' || 
    source.contestName === 'Direito' || 
    data?.contestName === 'Direito' || 
    source.user?.name === 'Direito';

  if (isDireito && (!source.categories || !Array.isArray(source.categories) || source.categories.length === 0)) {
    source = {
      ...source,
      contestName: 'Direito',
      user: { ...safeClone(RECOVERED_DIREITO_CONTEST.user), ...(source.user || {}) },
      categories: safeClone(RECOVERED_DIREITO_CONTEST.categories)
    };
  }

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
    coachPlan: Array.isArray(source.coachPlan)
      ? source.coachPlan
      : (typeof source.coachPlan === 'object' && source.coachPlan !== null)
        ? Object.values(source.coachPlan)
        : [],
    calibrationMetrics: (source.calibrationMetrics && typeof source.calibrationMetrics === 'object') ? source.calibrationMetrics : {},
    coachScore: (source.coachScore && typeof source.coachScore === 'object') ? source.coachScore : null,
    coachPlanner: (source.coachPlanner && typeof source.coachPlanner === 'object')
      ? source.coachPlanner
      : { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
    categories: (Array.isArray(source.categories) ? source.categories : Object.values(source.categories || {})).filter(cat => cat && typeof cat === 'object').map(cat => ({
      id: cat.id || generateId('cat'),
      name: cat.name || "Sem Nome",
      color: cat.color || "#3b82f6",
      icon: cat.icon || "📚",
      tasks: (() => {
        const rawTasks = (Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {})).filter(t => t && typeof t === 'object').map(t => ({
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
          const normName = t.text.toLowerCase().replace(/\s+/g, ' ').trim();
          if (seenTaskNames.has(normName)) return false;
          seenTaskNames.add(normName);
          return true;
        });
      })(),
      weight: (cat.weight !== undefined && cat.weight !== null) ? Number(cat.weight) : 10,
      maxScore: Number(cat.maxScore) || Number(source?.maxScore) || 100,
      minScore: (cat.minScore !== undefined && cat.minScore !== null && Number.isFinite(Number(cat.minScore)))
        ? Number(cat.minScore)
        : ((source?.minScore !== undefined && Number.isFinite(Number(source.minScore))) ? Number(source.minScore) : 0),
      minCutoff: Number(cat.minCutoff) || 0,
      level: Number(cat.level) || 0,
      totalMinutes: Number(cat.totalMinutes) || 0,
      lastStudiedAt: cat.lastStudiedAt || null,
      simuladoStats: {
        // Deep-strip nulls/poison from history. Support both Array and legacy Object formats.
        history: (Array.isArray(cat.simuladoStats?.history) 
          ? cat.simuladoStats.history 
          : Object.values(cat.simuladoStats?.history || {}))
          .filter(h => h && typeof h === 'object' && h.date && (
              h.total > 0 || h.score != null || h.scorePoints != null
          )),
        average: Number(cat.simuladoStats?.average) || 0,
        lastAttempt: Number(cat.simuladoStats?.lastAttempt) || 0,
        trend: cat.simuladoStats?.trend || "stable",
        level: cat.simuladoStats?.level || "BAIXO"
      }
    })),
    simuladoRows: (Array.isArray(source.simuladoRows) ? source.simuladoRows : Object.values(source.simuladoRows || {})).filter(r => r && r.id),
    simulados: (Array.isArray(source.simulados) ? source.simulados : Object.values(source.simulados || {})).filter(s => s && s.id),
    studyLogs: (Array.isArray(source.studyLogs) ? source.studyLogs : [])
        .filter(l => l && typeof l === 'object')
        .map(l => ({
            ...l,
            id: String(l.id || generateId('log')),
            minutes: Math.max(0, Number(l.minutes) || 0),
            date: l.date || l.createdAt || new Date().toISOString()
        })),
    studySessions: (Array.isArray(source.studySessions) ? source.studySessions : [])
        .filter(s => s && typeof s === 'object')
        .map(s => ({
            ...s,
            id: String(s.id || generateId('session')),
            duration: Math.max(0, Number(s.duration) || 0),
            startTime: s.startTime || s.date || new Date().toISOString()
        })),
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
    historicalCutoffs: Array.isArray(source.historicalCutoffs)
      ? source.historicalCutoffs.map(Number).filter(n => Number.isFinite(n) && n > 0)
      : [],
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
    if (!data) return { contests: { 'default': INITIAL_DATA }, activeId: 'default', lastUpdated: null };

    let coreData = extractCore(data);
    let d = coreData || data;

    // Migração de formato Legado (único concurso) para Multi-Concurso
    if (d.categories && !d.contests) {
      const contestData = { ...d };
      d = {
        contests: { 'default': contestData },
        activeId: 'default',
        lastUpdated: d.lastUpdated ?? null
      };
    }

    const validatedContests = {};
    const rawContests = (d.contests && typeof d.contests === 'object') ? d.contests : { 'default': INITIAL_DATA };

    // ✅ PATCH 11 FIX: Sanitização das chaves do dicionário para assegurar formato adequado para Firebase e IndexedDB
    Object.keys(rawContests).forEach((id) => {
        // ✅ Filtrar chaves inválidas ANTES de sanitizar
        if (id === 'length' || typeof rawContests[id] !== 'object') return;
        const cleanId = String(id).replace(new RegExp('[.#$/\\\\[\\\\]]', 'g'), '').trim() || 'default';
        const sanitized = sanitizeContest(rawContests[id], cleanId);
        if (sanitized) {
            validatedContests[cleanId] = sanitized;
        }
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
        isRunning: Boolean(d.pomodoro?.isRunning),
        activeSubject: d.pomodoro?.activeSubject || null,
        targetCycles: Math.max(1, Number(d.pomodoro?.targetCycles) || 1),
        mode: ['work', 'break', 'long_break'].includes(d.pomodoro?.mode) ? d.pomodoro.mode : 'work',
        sessions: Math.max(1, Number(d.pomodoro?.sessions) || 1),
        completedCycles: Math.max(0, Number(d.pomodoro?.completedCycles) || 0),
        accumulatedMinutes: Math.max(0, Number(d.pomodoro?.accumulatedMinutes) || 0),
        neuralMode: Boolean(d.pomodoro?.neuralMode),
        neuralQueue: Array.isArray(d.pomodoro?.neuralQueue) ? d.pomodoro.neuralQueue : [],
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
      lastUpdated: d.lastUpdated ?? null
    };


    return finalState;
  } catch (err) {
    console.error("[Validate] Erro catastrófico, retornando inicial:", err);
    return { contests: { 'default': safeClone(INITIAL_DATA) }, activeId: 'default', lastUpdated: null };
  }
};

