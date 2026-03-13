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

          // Contagem de conteúdo Real
          let categoryCount = 0;
          let taskCount = 0;
          let studyCount = 0;
          
          if (candidateData.contests) {
            Object.values(candidateData.contests).forEach(c => {
              if (Array.isArray(c.categories)) {
                categoryCount += c.categories.length;
                c.categories.forEach(cat => {
                  if (Array.isArray(cat.tasks)) taskCount += cat.tasks.length;
                });
              }
              if (Array.isArray(c.studySessions)) studyCount += c.studySessions.length;
            });
          } else if (Array.isArray(candidateData.categories)) {
            categoryCount = candidateData.categories.length;
            candidateData.categories.forEach(cat => {
              if (Array.isArray(cat.tasks)) taskCount += cat.tasks.length;
            });
            if (Array.isArray(candidateData.studySessions)) studyCount += candidateData.studySessions.length;
          }

          if (categoryCount === 0 && studyCount === 0) continue;

          let score = 0;
          const hasDireito = raw.toLowerCase().includes('direito');
          const updatedDate = candidateData.lastUpdated || candidateData.contests?.[Object.keys(candidateData.contests)[0]]?.lastUpdated;
          if (!updatedDate) continue;

          // Datas Dinâmicas: Prioriza backups recentes (Últimos 7 dias)
          const now = new Date();
          const backupDate = new Date(updatedDate);
          const diffDays = (now - backupDate) / (1000 * 60 * 60 * 24);
          const isRecent = diffDays >= 0 && diffDays <= 7;

          if (hasDireito) score += 100;
          if (isRecent) score += 300;
          if (key.includes('ultra-dashboard')) score += 50;
          score += (categoryCount * 10) + (taskCount * 2) + (studyCount * 5);

          if (score > 50) {
            const candidate = {
              key, score, date: updatedDate,
              categoryCount, taskCount, studyCount,
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
