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
 */
const repairContestHistory = (data) => {
  if (!data.simuladoRows || data.simuladoRows.length === 0 || !data.categories) return data;

  const rows = data.simuladoRows;
  let hasRepaired = false;
  
  const rawSubjects = [...new Set(rows.map(r => normalize(r.subject)).filter(Boolean))];
  const matchedSubjects = new Set();

  data.categories.forEach(cat => {
    const catNorm = normalize(cat.name);
    const catAliases = aliases[catNorm] || [];
    const catWords = catNorm.split(' ').filter(w => w.length > 3);

    const myRows = rows.filter(r => {
      const subNorm = normalize(r.subject);
      if (!subNorm) return false;

      // 1. Direct or Alias Match
      const isDirect = subNorm === catNorm || catAliases.some(a => normalize(a) === subNorm);
      if (isDirect) { matchedSubjects.add(subNorm); return true; }

      // 2. Inclusion Match (Partial mapping)
      const isIncluded = catNorm.includes(subNorm) || subNorm.includes(catNorm);
      if (isIncluded) { matchedSubjects.add(subNorm); return true; }

      // 3. ATOMIC MATCH (Word overlap)
      const subWords = subNorm.split(' ').filter(w => w.length > 3);
      const hasOverlap = catWords.some(cw => subWords.includes(cw));
      if (hasOverlap) { matchedSubjects.add(subNorm); return true; }

      return false;
    });

    if (myRows.length === 0) return;

    const currentHistory = cat.simuladoStats?.history || [];
    const uniqueDaysInLogs = new Set(myRows.map(r => getDateKey(r.createdAt || r.date || r.createdAt?._seconds || r.date?._seconds)).filter(Boolean)).size;
    
    // Always rebuild if we have NO history but HAVE logs, OR if logs have more unique days
    if (currentHistory.length === 0 || uniqueDaysInLogs > currentHistory.length) {
      hasRepaired = true;
      
      const dailyStats = {};
      myRows.forEach(r => {
        const dk = getDateKey(r.createdAt || r.date);
        if (!dk) return;
        if (!dailyStats[dk]) dailyStats[dk] = { correct: 0, total: 0 };
        dailyStats[dk].correct += (Number(r.correct) || 0);
        dailyStats[dk].total += (Number(r.total) || 0);
      });

      const rebuiltHistory = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        correct: stats.correct,
        total: stats.total,
        score: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
      })).sort((a, b) => new Date(a.date) - new Date(b.date));

      const statsResult = computeCategoryStats(rebuiltHistory, cat.weight || 10);
      cat.simuladoStats = {
        history: rebuiltHistory.slice(-50),
        average: Number(statsResult.mean.toFixed(1)),
        trend: statsResult.trend || 'stable',
        lastAttempt: rebuiltHistory.length > 0 ? rebuiltHistory[rebuiltHistory.length - 1].score : 0,
        level: statsResult.level || 'MÉDIO'
      };
      
      console.info(`[Schema-Repair] Matéria "${cat.name}" vinculada a ${myRows.length} registros.`);
    }
  });

  if (hasRepaired) {
    console.info(`[Schema-Repair] Sincronização de histórico concluída.`);
    data.lastUpdated = new Date().toISOString();
  }
  
  return data;
};

const sanitizeContest = (data) => {
  if (!data || typeof data !== 'object') return { ...INITIAL_DATA };

  const source = repairContestHistory(data);

  // FORTRESS-01: Defensive initialization for all top-level keys
  return {
    user: {
      ...(source.user && typeof source.user === 'object' ? source.user : {}),
      name: source.user?.name || "Estudante",
      avatar: source.user?.avatar || "👤",
      startDate: source.user?.startDate || new Date().toISOString().split('T')[0],
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
    coachPlan: Array.isArray(source.coachPlan) ? source.coachPlan : [],
    coachPlanner: (source.coachPlanner && typeof source.coachPlanner === 'object')
      ? source.coachPlanner
      : { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
    categories: (Array.isArray(source.categories) ? source.categories : []).map(cat => ({
      id: cat.id || generateId('cat'),
      name: cat.name || "Sem Nome",
      color: cat.color || "#3b82f6",
      icon: cat.icon || "📚",
      tasks: (Array.isArray(cat.tasks) ? cat.tasks : []).map(t => ({
        id: t.id || generateId('task'),
        text: t.text || t.title || "Nova Tarefa",
        title: t.title || t.text || "Nova Tarefa",
        completed: Boolean(t.completed),
        completedAt: t.completedAt || null,
        lastStudiedAt: t.lastStudiedAt || null,
        priority: t.priority || "medium",
        // BUG-01 & 02 FIX: Preserve awardedXP and studying status during sync/reload
        ...(t.awardedXP != null ? { awardedXP: Number(t.awardedXP) } : {}),
        ...(t.status ? { status: t.status } : {})
      })).filter(t => t.id && (t.text || t.title)), // Skip Corrupted Tasks
      weight: (cat.weight !== undefined && cat.weight !== null) ? Number(cat.weight) : 10,
      totalMinutes: Number(cat.totalMinutes) || 0,
      lastStudiedAt: cat.lastStudiedAt || null,
      simuladoStats: {
        // Deep-strip nulls/poison from history
        history: (Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : [])
          .filter(h => h && typeof h === 'object' && h.date && (h.total > 0 || h.score != null)),
        average: Number(cat.simuladoStats?.average) || 0,
        lastAttempt: Number(cat.simuladoStats?.lastAttempt) || 0,
        trend: cat.simuladoStats?.trend || "stable",
        level: cat.simuladoStats?.level || "BAIXO"
      }
    })),
    simuladoRows: (Array.isArray(source.simuladoRows) ? source.simuladoRows : []).filter(r => r && r.id),
    simulados: (Array.isArray(source.simulados) ? source.simulados : []).filter(s => s && s.id),
    studyLogs: (Array.isArray(source.studyLogs) ? source.studyLogs : []).filter(l => l && l.id),
    studySessions: (Array.isArray(source.studySessions) ? source.studySessions : []).filter(s => s && s.id),
    notes: typeof source.notes === 'string' ? source.notes : "",
    settings: {
      darkMode: (source.settings?.darkMode === 'auto' || typeof source.settings?.darkMode === 'boolean') ? source.settings.darkMode : 'auto',
      soundEnabled: source.settings?.soundEnabled ?? true,
      pomodoroWork: Number(source.settings?.pomodoroWork) || 25,
      pomodoroBreak: Number(source.settings?.pomodoroBreak) || 5,
    },
    mcWeights: (source.mcWeights && typeof source.mcWeights === 'object') ? source.mcWeights : {},
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
      pomodoro: d.pomodoro && typeof d.pomodoro === 'object'
        ? d.pomodoro
        : { activeSubject: null, sessions: 0, targetCycles: 1, completedCycles: 0 },
      history: Array.isArray(d.history) ? d.history : [],
      trash: Array.isArray(d.trash) ? d.trash.filter(item => {
        if (!item) return false;
        // BUG LOGIC-02 FIX: Se não tiver deletedAt, assume agora para expirar em 30 dias
        const deletedAt = item.deletedAt ? new Date(item.deletedAt) : new Date();
        return (new Date() - deletedAt) / (1000 * 60 * 60 * 24) <= 30;
      }) : [],
      hasSeenTour: Boolean(d.hasSeenTour),
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
