import { INITIAL_DATA } from '../data/initialData';

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
      xp: Number(data.user?.xp) || 0,
      level: Number(data.user?.level) || 1,
      achievements: Array.isArray(data.user?.achievements) ? data.user?.achievements : [],
      studiedEarly: Boolean(data.user?.studiedEarly),
      studiedLate: Boolean(data.user?.studiedLate),
      targetProbability: (data.user?.targetProbability != null && Number.isFinite(Number(data.user.targetProbability)))
        ? Number(data.user.targetProbability)
        : 70
    },
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
      weight: Number(cat.weight) || 10,
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
    mcWeights: data.mcWeights || {}
  };
};

export const extractCore = (obj) => {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.contests || (obj.categories && Array.isArray(obj.categories))) return obj;
  if (obj.appState) return extractCore(obj.appState);
  if (obj.state) return extractCore(obj.state);
  return null;
};

export const validateAppState = (data) => {
  try {
    if (!data) return { contests: { 'default': INITIAL_DATA }, activeId: 'default', lastUpdated: new Date().toISOString() };

    let coreData = extractCore(data);
    let d = coreData || data;

    // Migração de formato Legado (único concurso) para Multi-Concurso
    if (d.categories && Array.isArray(d.categories) && !d.contests) {
      d = {
        contests: { 'default': d },
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
    
    // Lógica de Foco: Se o concurso ativo estiver vazio, tenta encontrar um que contenha 'Direito'
    const currentIsEmpty = !validatedContests[activeId] || !validatedContests[activeId].categories || validatedContests[activeId].categories.length === 0;
    if (currentIsEmpty) {
      const derechoId = Object.keys(validatedContests).find(id => {
        const c = validatedContests[id];
        return JSON.stringify(c.categories || []).toLowerCase().includes('direito');
      });
      if (derechoId) activeId = derechoId;
    }

    if (!validatedContests[activeId]) activeId = Object.keys(validatedContests)[0] || 'default';

    const finalState = {
      contests: validatedContests,
      activeId: activeId,
      history: Array.isArray(d.history) ? d.history : [],
      trash: Array.isArray(d.trash) ? d.trash.filter(item => {
        if (!item || !item.deletedAt) return false;
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
