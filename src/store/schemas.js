import { INITIAL_DATA } from '../data/initialData';

export const DEFAULT_TARGET_SCORE = 75; // Unificando como 75 (meio termo entre 70 e 80)

/**
 * Validação Ultra-Resiliente (Sem Zod)
 * Garante que o app sempre tenha uma estrutura válida, mesmo com dados corrompidos.
 */

const sanitizeContest = (data) => {
  if (!data || typeof data !== 'object') return { ...INITIAL_DATA };
  
  return {
    user: {
      ...(data.user && typeof data.user === 'object' ? data.user : {}),
      name: data.user?.name || "Estudante",
      avatar: data.user?.avatar || "👤",
      startDate: data.user?.startDate || new Date().toISOString().split('T')[0],
      goalDate: data.user?.goalDate || null,
      targetScore: (data.user?.targetScore != null) ? Number(data.user.targetScore) : DEFAULT_TARGET_SCORE,
      xp: Number(data.user?.xp) || 0,
      level: Number(data.user?.level) || 1,
      achievements: (Array.isArray(data.user?.achievements) ? data.user.achievements : [])
        .map(a => typeof a === 'string' ? a : a?.id)
        .filter(Boolean),
      studiedEarly: Boolean(data.user?.studiedEarly),
      studiedLate: Boolean(data.user?.studiedLate),
      targetProbability: (data.user?.targetProbability != null && Number.isFinite(Number(data.user.targetProbability)))
        ? Number(data.user.targetProbability)
        : 70
    },
    coachPlan: Array.isArray(data.coachPlan) ? data.coachPlan : [],
    coachPlanner: (data.coachPlanner && typeof data.coachPlanner === 'object')
      ? data.coachPlanner
      : { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
    categories: (Array.isArray(data.categories) ? data.categories : []).map(cat => ({
      id: cat.id || `cat_${Math.random().toString(36).substr(2, 9)}`,
      name: cat.name || "Sem Nome",
      color: cat.color || "#3b82f6",
      icon: cat.icon || "📚",
      tasks: (Array.isArray(cat.tasks) ? cat.tasks : []).map(t => ({
        id: t.id || `task_${Math.random().toString(36).substr(2, 9)}`,
        text: t.text || t.title || "Nova Tarefa",
        title: t.title || t.text || "Nova Tarefa",
        completed: Boolean(t.completed),
        completedAt: t.completedAt || null,
        lastStudiedAt: t.lastStudiedAt || null,
        priority: t.priority || "medium"
      })),
      weight: (cat.weight !== undefined && cat.weight !== null) ? Number(cat.weight) : 10,
      totalMinutes: Number(cat.totalMinutes) || 0,
      lastStudiedAt: cat.lastStudiedAt || null,
      simuladoStats: {
        history: Array.isArray(cat.simuladoStats?.history) ? cat.simuladoStats.history : [],
        average: Number(cat.simuladoStats?.average) || 0,
        lastAttempt: Number(cat.simuladoStats?.lastAttempt) || 0,
        trend: cat.simuladoStats?.trend || "stable",
        level: cat.simuladoStats?.level || "BAIXO"
      }
    })),
    simuladoRows: Array.isArray(data.simuladoRows) ? data.simuladoRows : [],
    simulados: Array.isArray(data.simulados) ? data.simulados : [],
    studyLogs: Array.isArray(data.studyLogs) ? data.studyLogs : [],
    studySessions: Array.isArray(data.studySessions) ? data.studySessions : [],
    notes: data.notes || "",
    settings: {
      darkMode: data.settings?.darkMode ?? 'auto',
      soundEnabled: data.settings?.soundEnabled ?? true,
      pomodoroWork: Number(data.settings?.pomodoroWork) || 25,
      pomodoroBreak: Number(data.settings?.pomodoroBreak) || 5,
    },
    mcWeights: data.mcWeights || {},
    lastUpdated: data.lastUpdated || null, // C3: preservar lastUpdated no nível do concurso
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
      history: Array.isArray(d.history) ? d.history : [],
      trash: Array.isArray(d.trash) ? d.trash.filter(item => {
        if (!item) return false;
        // Se não tiver deletedAt, mantém na lixeira mas não aplica expiração de 30 dias (Bug L3)
        if (!item.deletedAt) return true;
        return (new Date() - new Date(item.deletedAt)) / (1000 * 60 * 60 * 24) <= 30;
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
