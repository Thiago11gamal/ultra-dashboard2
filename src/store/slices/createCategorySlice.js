import { generateId } from '../../utils/idGenerator';
import { normalize } from '../../utils/normalization';
import { safeClone } from '../safeClone.js';

export const createCategorySlice = (set) => ({
    addCategory: (name) => set((state) => {
        if (!name || typeof name !== 'string') return;
        const activeData = state.appState.contests[state.appState.activeId];

        if (!activeData) return;
        if (!activeData.categories) activeData.categories = [];

        // BUG FIX: Prevent duplicate categories by name
        const normName = normalize(name);
        if (activeData.categories.some(c => normalize(c.name) === normName)) {
            console.warn(`[Store] Category "${name}" already exists.`);
            return;
        }

        activeData.categories.push({
            id: generateId('cat'),
            name,
            color: '#3b82f6',
            icon: '📚',
            tasks: [],
            weight: 10,
            // BUG-FIX: maxScore ausente causava fallback silencioso a 100 em toda a engine
            maxScore: 100,
            minCutoff: 0,
            simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' },
            totalMinutes: 0,
            lastStudiedAt: null
        });
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    deleteCategory: (id) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData || !Array.isArray(activeData.categories)) return;

        const category = activeData.categories.find(c => c.id === id);
        if (category) {
            if (!state.appState.trash) state.appState.trash = [];
            state.appState.trash.push({
                id: generateId('trash'),
                type: 'category',
                contestId: state.appState.activeId,
                data: safeClone({
                    category: category,
                    studyLogs: (Array.isArray(activeData.studyLogs) ? activeData.studyLogs : Object.values(activeData.studyLogs || {})).filter(l => l.categoryId === id),
                    studySessions: (Array.isArray(activeData.studySessions) ? activeData.studySessions : Object.values(activeData.studySessions || {})).filter(s => s.categoryId === id),
                    simuladoRows: (Array.isArray(activeData.simuladoRows) ? activeData.simuladoRows : Object.values(activeData.simuladoRows || {})).filter(r => r.categoryId === id),
                    simulados: (Array.isArray(activeData.simulados) ? activeData.simulados : Object.values(activeData.simulados || {})).filter(s => s.categoryId === id),
                    mcWeight: activeData.mcWeights?.[id] || activeData.mcWeights?.[category.name]
                }),
                deletedAt: new Date().toISOString()
            });
        }

        const name = category?.name;
        activeData.categories = activeData.categories.filter(c => c.id !== id);

        if (activeData.mcWeights && activeData.mcWeights[id]) {
            delete activeData.mcWeights[id];
        }
        if (name && activeData.mcWeights && activeData.mcWeights[name]) {
            delete activeData.mcWeights[name];
        }

        if (activeData.studyLogs) {
            const safeLogs = Array.isArray(activeData.studyLogs) ? activeData.studyLogs : Object.values(activeData.studyLogs || {});
            activeData.studyLogs = safeLogs.filter(l => l.categoryId !== id);
        }
        if (activeData.studySessions) {
            const safeSessions = Array.isArray(activeData.studySessions) ? activeData.studySessions : Object.values(activeData.studySessions || {});
            activeData.studySessions = safeSessions.filter(s => s.categoryId !== id);
        }
        if (activeData.simuladoRows) {
            const safeRows = Array.isArray(activeData.simuladoRows) ? activeData.simuladoRows : Object.values(activeData.simuladoRows || {});
            const normName = category ? normalize(category.name) : null;
            activeData.simuladoRows = safeRows.filter(r => {
                if (r.categoryId) return r.categoryId !== id;
                if (normName && r.subject) return normalize(r.subject) !== normName;
                return true;
            });
        }
        if (activeData.simulados) {
            const safeSimulados = Array.isArray(activeData.simulados) ? activeData.simulados : Object.values(activeData.simulados || {});
            activeData.simulados = safeSimulados.filter(s => s.categoryId !== id);
        }

        if (state.appState.pomodoro?.activeSubject?.categoryId === id) {
            state.appState.pomodoro.activeSubject = null;
        }

        if (activeData.coachPlanner) {
            Object.keys(activeData.coachPlanner).forEach(day => {
                if (Array.isArray(activeData.coachPlanner[day])) {
                    activeData.coachPlanner[day] = activeData.coachPlanner[day].filter(item =>
                        item.categoryId !== id
                    );
                }
            });
        }

        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    updateCategoryFields: (id, fields) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData || !Array.isArray(activeData.categories)) return;

        const category = activeData.categories.find(c => c.id === id);
        if (category) {
            Object.assign(category, fields);
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            localStorage.setItem('ultra-sync-dirty', 'true');
        }
    }),

    setMonteCarloWeights: (weightsUpdate) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData || !weightsUpdate) return;

        const currentWeights = activeData.mcWeights || {};
        const nextWeights = typeof weightsUpdate === 'function' ? weightsUpdate(currentWeights) : weightsUpdate;

        activeData.mcWeights = nextWeights;
        if (activeData.categories) {
            activeData.categories.forEach(cat => {
                if (nextWeights[cat.id] !== undefined) {
                    cat.weight = nextWeights[cat.id];
                } else if (nextWeights[cat.name] !== undefined) {
                    cat.weight = nextWeights[cat.name];
                }
            });
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    updateWeights: (weights) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeId || !activeData || !activeData.categories || !weights) return;

        activeData.categories.forEach(cat => {
            if (weights[cat.id] !== undefined) {
                cat.weight = weights[cat.id];
            } else if (weights[cat.name] !== undefined) {
                cat.weight = weights[cat.name];
            }
        });

        activeData.mcWeights = { ...(activeData.mcWeights || {}), ...weights };
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    safelyMergeDuplicates: () => set((state) => {
  const activeId = state.appState.activeId;
  const activeData = state.appState.contests[activeId];

  if (!activeId || !activeData || !Array.isArray(activeData.categories)) return;

  const hasDuplicates = (() => {
    const seen = new Set();

    return activeData.categories.some(cat => {
      const key = normalize(cat.name);

      if (seen.has(key)) return true;

      seen.add(key);
      return false;
    });
  })();

  if (!hasDuplicates) return;

  const groups = {};

  activeData.categories.forEach(cat => {
    const norm = normalize(cat.name);

    if (!groups[norm]) groups[norm] = [];

    groups[norm].push(cat);
  });

  let changed = false;
  const newCategories = [];

  Object.values(groups).forEach(group => {
    if (group.length === 1) {
      newCategories.push(group[0]);
      return;
    }

    changed = true;
    console.warn(`[Store] Merging ${group.length} duplicates for "${group[0].name}"`);

    const primary = group.sort((a, b) => {
      const getHistoryLen = (obj) => {
        const h = obj.simuladoStats?.history;
        if (!h) return 0;

        return Array.isArray(h) ? h.length : Object.values(h).length;
      };

      const aData = (a.tasks?.length || 0) + getHistoryLen(a);
      const bData = (b.tasks?.length || 0) + getHistoryLen(b);

      return bData - aData;
    })[0];

    const getHistoryArr = (c) => {
      const h = c.simuladoStats?.history;
      if (!h) return [];

      return Array.isArray(h) ? h : Object.values(h);
    };

    const historyKey = (h) => {
      if (!h) return 'invalid';

      return h.id || `${h.date || ''}-${h.score ?? ''}-${h.total ?? ''}-${h.correct ?? ''}-${normalize(h.topic || '')}`;
    };

    const mergedTasks = [...(primary.tasks || [])];
    const mergedHistory = [...getHistoryArr(primary)];
    const seenHistory = new Set(mergedHistory.map(historyKey));

    group.forEach(cat => {
      if (cat.id === primary.id) return;

      (cat.tasks || []).forEach(t => {
        const taskTitle = (t.title || t.text || '').trim();

        if (!mergedTasks.some(mt => (mt.title || mt.text || '').trim() === taskTitle)) {
          mergedTasks.push(t);
        }
      });

      getHistoryArr(cat).forEach(h => {
        const key = historyKey(h);

        if (!seenHistory.has(key)) {
          seenHistory.add(key);
          mergedHistory.push(h);
        }
      });

      const oldId = cat.id;
      const newId = primary.id;

      if (activeData.studyLogs) {
        const safeLogs = Array.isArray(activeData.studyLogs)
          ? activeData.studyLogs
          : Object.values(activeData.studyLogs || {});

        safeLogs.forEach(l => {
          if (l.categoryId === oldId) l.categoryId = newId;
        });

        activeData.studyLogs = safeLogs;
      }

      if (activeData.studySessions) {
        const safeSessions = Array.isArray(activeData.studySessions)
          ? activeData.studySessions
          : Object.values(activeData.studySessions || {});

        safeSessions.forEach(s => {
          if (s.categoryId === oldId) s.categoryId = newId;
        });

        activeData.studySessions = safeSessions;
      }

      if (activeData.simuladoRows) {
        const safeRows = Array.isArray(activeData.simuladoRows)
          ? activeData.simuladoRows
          : Object.values(activeData.simuladoRows || {});

        safeRows.forEach(r => {
          if (r.categoryId === oldId) r.categoryId = newId;
        });

        activeData.simuladoRows = safeRows;
      }
    });

    newCategories.push({
      ...primary,
      tasks: mergedTasks,
      simuladoStats: {
        ...primary.simuladoStats,
        history: mergedHistory
      }
    });
  });

  if (changed) {
    activeData.categories = newCategories;

    if (activeData.mcWeights) {
      const validKeys = new Set();

      newCategories.forEach(c => {
        validKeys.add(c.id);
        validKeys.add(c.name);
        validKeys.add(normalize(c.name));
      });

      Object.keys(activeData.mcWeights).forEach(key => {
        if (!validKeys.has(key) && !validKeys.has(normalize(key))) {
          delete activeData.mcWeights[key];
        }
      });
    }

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    localStorage.setItem('ultra-sync-dirty', 'true');
  }
}),

    importCategory: (sourceContestId, categoryId) => set((state) => {
        const sourceData = state.appState.contests[sourceContestId];
        const activeData = state.appState.contests[state.appState.activeId];

        if (!sourceData || !activeData || !Array.isArray(sourceData.categories)) return;

        const categoryToImport = sourceData.categories.find(c => c.id === categoryId);
        if (!categoryToImport) return;

        if (!activeData.categories) activeData.categories = [];

        // Check duplicates
        const normName = normalize(categoryToImport.name);
        if (activeData.categories.some(c => normalize(c.name) === normName)) {
            console.warn(`[Store] Category "${categoryToImport.name}" already exists in the active contest.`);
            return;
        }

        const newId = generateId('cat');
        const importedCat = safeClone(categoryToImport);
        importedCat.id = newId;

        activeData.categories.push(importedCat);

        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
