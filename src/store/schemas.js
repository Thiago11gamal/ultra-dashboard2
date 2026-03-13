import { INITIAL_DATA } from '../data/initialData';

/**
 * Validação Ultra-Resiliente (Sem Zod)
 * Garante que o app sempre tenha uma estrutura válida, mesmo com dados corrompidos.
 */

const sanitizeContest = (data) => {
  if (!data || typeof data !== 'object') return { ...INITIAL_DATA };
  
  return {
    user: {
      name: data.user?.name || "Estudante",
      avatar: data.user?.avatar || "👤",
      startDate: data.user?.startDate || new Date().toISOString().split('T')[0],
      goalDate: data.user?.goalDate || null,
      xp: Number(data.user?.xp) || 0,
      level: Number(data.user?.level) || 1,
      achievements: Array.isArray(data.user?.achievements) ? data.user?.achievements : [],
      studiedEarly: Boolean(data.user?.studiedEarly),
      studiedLate: Boolean(data.user?.studiedLate)
    },
    categories: (Array.isArray(data.categories) ? data.categories : []).map(cat => ({
      id: cat.id || `cat_${Math.random().toString(36).substr(2, 9)}`,
      name: cat.name || "Sem Nome",
      color: cat.color || "#3b82f6",
      icon: cat.icon || "📚",
      tasks: (Array.isArray(cat.tasks) ? cat.tasks : []).map(t => ({
        id: t.id || `task_${Math.random().toString(36).substr(2, 9)}`,
        text: t.text || t.title || "Nova Tarefa",
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
      darkMode: data.settings?.darkMode ?? true,
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
    if (!validatedContests[activeId]) activeId = Object.keys(validatedContests)[0] || 'default';

    const finalState = {
      contests: validatedContests,
      activeId: activeId,
      history: Array.isArray(d.history) ? d.history : [],
      lastHistoryTime: Number(d.lastHistoryTime) || 0,
      version: Number(d.version) || 0,
      mcEqualWeights: d.mcEqualWeights ?? true,
      lastUpdated: d.lastUpdated || new Date().toISOString()
    };

    // --- SCANNER DE RESGATE (Executado se estruturalmente vazio ou inicial) ---
    if (typeof window !== 'undefined') {
      const allKeys = Object.keys(localStorage);
      const rescueMap = new Map();
      
      for (const key of allKeys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw || raw.length < 50) continue;
          
          let parsed;
          try { parsed = JSON.parse(raw); } catch { continue; }
          const candidateData = extractCore(parsed);
          if (!candidateData) continue;

          let score = 0;
          const hasDireito = raw.toLowerCase().includes('direito');
          const updatedDate = candidateData.lastUpdated || candidateData.contests?.[Object.keys(candidateData.contests)[0]]?.lastUpdated;
          if (!updatedDate) continue;

          const targetDates = ["2026-03-10", "2026-03-11", "2026-03-12"];
          const isTargetDate = targetDates.some(dt => updatedDate.startsWith(dt));

          if (hasDireito) score += 100;
          if (isTargetDate) score += 300;
          if (key.includes('ultra-dashboard')) score += 50;

          if (score > 50) {
            const candidate = {
              key, score, date: updatedDate,
              data: candidateData.categories && !candidateData.contests 
                ? { contests: { 'default': candidateData }, activeId: 'default', lastUpdated: updatedDate }
                : candidateData
            };
            if (!rescueMap.has(updatedDate) || rescueMap.get(updatedDate).score < score) {
              rescueMap.set(updatedDate, candidate);
            }
          }
        } catch (e) {}
      }
      
      const rescueList = Array.from(rescueMap.values()).sort((a,b) => new Date(b.date) - new Date(a.date));
      if (rescueList.length > 0) {
        window.__ULTRA_RESCUE_LIST = rescueList;
        window.__ULTRA_RESCUE_CANDIDATE = rescueList[0];
      }
    }

    return finalState;
  } catch (err) {
    console.error("[Validate] Erro catastrófico, retornando inicial:", err);
    return { contests: { 'default': INITIAL_DATA }, activeId: 'default', lastUpdated: new Date().toISOString() };
  }
};
