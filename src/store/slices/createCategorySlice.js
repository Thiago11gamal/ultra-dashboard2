import { generateId } from '../../utils/idGenerator.js';
import { normalize } from '../../utils/normalization.js';
import { safeClone } from '../../utils/safeClone.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { addCategoryTombstones, removeCategoryTombstone } from '../../utils/tombstones.js';
import { clearUrgencyCache, clearTopicsCache } from '../../utils/coachCaches.js';
import { clearMcCache } from '../../utils/coachAdaptive.js';

export const createCategorySlice = (set) => ({
    addCategory: (name) => {
        let added = false;
        set((state) => {
            if (!name || typeof name !== 'string') return;
            const activeData = state.appState.contests[state.appState.activeId];

            if (!activeData) return;
            if (!Array.isArray(activeData.categories)) {
                activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                    ? Object.values(activeData.categories)
                    : [];
            }

            // BUG FIX: Prevent duplicate categories by name
            const normName = normalize(name);
            if (activeData.categories.some(c => normalize(c.name) === normName)) {
                console.warn(`[Store] Category "${name}" already exists.`);
                return;
            }

            const catMaxScore = Number(activeData.maxScore) > 0 ? Number(activeData.maxScore) : 100;
            const catMinScore = Number.isFinite(Number(activeData.minScore)) ? Number(activeData.minScore) : 0;
            const newCatId = generateId('cat');

            activeData.categories.push({
                id: newCatId,
                name,
                color: '#3b82f6',
                icon: '📚',
                tasks: [],
                weight: 10,
                maxScore: catMaxScore,
                minScore: catMinScore,
                minCutoff: catMinScore,
                simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' },
                totalMinutes: 0,
                lastStudiedAt: null
            });

            // ✅ Remove qualquer tombstone prévio para permitir salvar e sincronizar perfeitamente
            removeCategoryTombstone(newCatId, name);

            const nowIso = new Date().toISOString();
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            markStorageDirty();
            clearUrgencyCache();
            clearTopicsCache();
            clearMcCache();
            added = true;
        });
        return added;
    },

    deleteCategory: (id) => set((state) => {
        clearUrgencyCache();
        clearTopicsCache();
        clearMcCache();
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        if (!Array.isArray(activeData.categories)) {
            activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                ? Object.values(activeData.categories)
                : [];
        }

        const category = activeData.categories.find(c => c && (c.id === id || c.name === id));
        if (category) {
            addCategoryTombstones({ id: category.id, name: category.name });
            const normName = category ? normalize(category.name) : null;
            const safeRows = Array.isArray(activeData.simuladoRows) ? activeData.simuladoRows : Object.values(activeData.simuladoRows || {});
            const deletedSimuladoRows = safeRows.filter(r => {
                if (r.categoryId) return r.categoryId === id;
                if (normName && r.subject) return normalize(r.subject) === normName;
                return false;
            });

            const deletedCoachPlan = Array.isArray(activeData.coachPlan)
                ? activeData.coachPlan.filter(task => task && task.categoryId === id)
                : [];

            const deletedCoachPlanner = {};
            if (activeData.coachPlanner && typeof activeData.coachPlanner === 'object') {
                Object.keys(activeData.coachPlanner).forEach(day => {
                    if (Array.isArray(activeData.coachPlanner[day])) {
                        deletedCoachPlanner[day] = activeData.coachPlanner[day].filter(task => task && task.categoryId === id);
                    }
                });
            }

            if (!state.appState.trash) state.appState.trash = [];
            state.appState.trash.push({
                id: generateId('trash'),
                type: 'category',
                contestId: state.appState.activeId,
                data: safeClone({
                    category: category,
                    studyLogs: (Array.isArray(activeData.studyLogs) ? activeData.studyLogs : Object.values(activeData.studyLogs || {})).filter(l => l && (l.categoryId === id || (normName && normalize(l.subject || l.category || l.categoryName || '') === normName))),
                    studySessions: (Array.isArray(activeData.studySessions) ? activeData.studySessions : Object.values(activeData.studySessions || {})).filter(s => s && (s.categoryId === id || (normName && normalize(s.subject || s.category || s.categoryName || '') === normName))),
                    simuladoRows: deletedSimuladoRows,
                    simulados: (Array.isArray(activeData.simulados) ? activeData.simulados : Object.values(activeData.simulados || {})).filter(s => s && (s.categoryId === id || (normName && normalize(s.subject || '') === normName))),
                    mcWeight: activeData.mcWeights?.[id] || activeData.mcWeights?.[category.name],
                    coachPlan: deletedCoachPlan,
                    coachPlanner: deletedCoachPlanner
                }),
                deletedAt: new Date().toISOString()
            });
        }

        const name = category?.name;
        const normName = name ? normalize(name) : null;
        activeData.categories = activeData.categories.filter(c => c && c.id !== id && (!normName || normalize(c.name || '') !== normName));

        if (activeData.mcWeights && activeData.mcWeights[id]) {
            delete activeData.mcWeights[id];
        }
        if (name && activeData.mcWeights && activeData.mcWeights[name]) {
            delete activeData.mcWeights[name];
        }

        if (activeData.studyLogs) {
            const safeLogs = Array.isArray(activeData.studyLogs) ? activeData.studyLogs : Object.values(activeData.studyLogs || {});
            activeData.studyLogs = safeLogs.filter(l => l && l.categoryId !== id && (!normName || normalize(l.subject || l.category || l.categoryName || '') !== normName));
        }
        if (activeData.studySessions) {
            const safeSessions = Array.isArray(activeData.studySessions) ? activeData.studySessions : Object.values(activeData.studySessions || {});
            activeData.studySessions = safeSessions.filter(s => s && s.categoryId !== id && (!normName || normalize(s.subject || s.category || s.categoryName || '') !== normName));
        }
        if (activeData.simuladoRows) {
            const safeRows = Array.isArray(activeData.simuladoRows) ? activeData.simuladoRows : Object.values(activeData.simuladoRows || {});
            activeData.simuladoRows = safeRows.filter(r => {
                if (r.categoryId) return r.categoryId !== id;
                if (normName && r.subject) return normalize(r.subject) !== normName;
                return true;
            });
        }
        if (activeData.simulados) {
            const safeSimulados = Array.isArray(activeData.simulados) ? activeData.simulados : Object.values(activeData.simulados || {});
            activeData.simulados = safeSimulados.filter(s => s && s.categoryId !== id && (!normName || normalize(s.subject || '') !== normName));
        }

        const activeSub = state.appState.pomodoro?.activeSubject;
        if (activeSub && (activeSub.categoryId === id || (normName && normalize(activeSub.category || '') === normName))) {
            state.appState.pomodoro.activeSubject = null;
            state.appState.pomodoro.isRunning = false;
            state.appState.pomodoro.neuralMode = false;
            state.appState.pomodoro.neuralQueue = [];
            try {
                localStorage.removeItem('pomodoroState');
            } catch {
                // ignore
            }
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

        if (Array.isArray(activeData.coachPlan)) {
            activeData.coachPlan = activeData.coachPlan.filter(
                task => task.categoryId !== id
            );
        }

        const nowIso = new Date().toISOString();
        activeData.lastUpdated = nowIso;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = nowIso;
        markStorageDirty();
    }),

    updateCategoryFields: (id, fields) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        if (!Array.isArray(activeData.categories)) {
            activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                ? Object.values(activeData.categories)
                : [];
        }

        const category = activeData.categories.find(c => c && (c.id === id || c.name === id));
        if (category) {
            const oldName = category.name;
            if (fields.minCutoff !== undefined && fields.minScore === undefined) {
                fields.minScore = fields.minCutoff;
            }
            Object.assign(category, fields);
            if (fields.name) {
                removeCategoryTombstone(category.id, fields.name);
                if (oldName && fields.name !== oldName) {
                    if (activeData.mcWeights) {
                        if (activeData.mcWeights[oldName] !== undefined) {
                            activeData.mcWeights[fields.name] = activeData.mcWeights[oldName];
                            delete activeData.mcWeights[oldName];
                        }
                    }
                    if (Array.isArray(activeData.simuladoRows)) {
                        activeData.simuladoRows.forEach(r => {
                            if (r && (r.categoryId === id || normalize(r.subject || '') === normalize(oldName))) {
                                r.subject = fields.name;
                            }
                        });
                    }
                    if (Array.isArray(activeData.simulados)) {
                        activeData.simulados.forEach(s => {
                            if (s && (s.categoryId === id || normalize(s.subject || '') === normalize(oldName))) {
                                s.subject = fields.name;
                            }
                        });
                    }
                    if (Array.isArray(activeData.studyLogs)) {
                        activeData.studyLogs.forEach(l => {
                            if (l && (l.categoryId === id || normalize(l.subject || l.category || l.categoryName || '') === normalize(oldName))) {
                                if (l.subject) l.subject = fields.name;
                                if (l.category) l.category = fields.name;
                                if (l.categoryName) l.categoryName = fields.name;
                            }
                        });
                    }
                    if (Array.isArray(activeData.studySessions)) {
                        activeData.studySessions.forEach(s => {
                            if (s && (s.categoryId === id || normalize(s.subject || s.category || s.categoryName || '') === normalize(oldName))) {
                                if (s.subject) s.subject = fields.name;
                                if (s.category) s.category = fields.name;
                                if (s.categoryName) s.categoryName = fields.name;
                            }
                        });
                    }
                    const activeSub = state.appState.pomodoro?.activeSubject;
                    if (activeSub && (activeSub.categoryId === id || normalize(activeSub.category || '') === normalize(oldName))) {
                        activeSub.category = fields.name;
                    }
                }
            }
            clearUrgencyCache();
            clearTopicsCache();
            clearMcCache();
            const nowIso = new Date().toISOString();
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            markStorageDirty();
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
        markStorageDirty();
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
        markStorageDirty();
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

    const primary = [...group].sort((a, b) => {
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
    let mergedTotalMinutes = Number(primary.totalMinutes) || 0;
    let mergedLastStudiedAt = primary.lastStudiedAt || null;

    group.forEach(cat => {
      if (cat.id === primary.id) return;

      mergedTotalMinutes += (Number(cat.totalMinutes) || 0);
      if (cat.lastStudiedAt) {
        if (!mergedLastStudiedAt || new Date(cat.lastStudiedAt) > new Date(mergedLastStudiedAt)) {
          mergedLastStudiedAt = cat.lastStudiedAt;
        }
      }

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

      if (activeData.simulados) {
        const safeSimulados = Array.isArray(activeData.simulados)
          ? activeData.simulados
          : Object.values(activeData.simulados || {});

        safeSimulados.forEach(s => {
          if (s && s.categoryId === oldId) s.categoryId = newId;
        });

        activeData.simulados = safeSimulados;
      }

      if (activeData.coachPlan && Array.isArray(activeData.coachPlan)) {
        activeData.coachPlan.forEach(task => {
          if (task && task.categoryId === oldId) task.categoryId = newId;
        });
      }

      if (activeData.coachPlanner && typeof activeData.coachPlanner === 'object') {
        Object.keys(activeData.coachPlanner).forEach(day => {
          if (Array.isArray(activeData.coachPlanner[day])) {
            activeData.coachPlanner[day].forEach(task => {
              if (task && task.categoryId === oldId) task.categoryId = newId;
            });
          }
        });
      }
    });

    newCategories.push({
      ...primary,
      totalMinutes: mergedTotalMinutes,
      lastStudiedAt: mergedLastStudiedAt,
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
    markStorageDirty();
  }
}),

    importCategory: (sourceContestId, categoryId) => {
        let result = false;
        set((state) => {
            const sourceData = state.appState.contests[sourceContestId];
            const activeData = state.appState.contests[state.appState.activeId];

            if (!sourceData || !activeData) return;
            const sourceCategories = Array.isArray(sourceData.categories)
                ? sourceData.categories
                : Object.values(sourceData.categories || {});

            const categoryToImport = sourceCategories.find(c => c && (c.id === categoryId || c.name === categoryId));
            if (!categoryToImport) return;

            if (!Array.isArray(activeData.categories)) {
                activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                    ? Object.values(activeData.categories)
                    : [];
            }

            // Check duplicates
            const normName = normalize(categoryToImport.name || '');
            if (activeData.categories.some(c => normalize(c?.name || '') === normName)) {
                console.warn(`[Store] Category "${categoryToImport.name}" already exists in the active contest.`);
                return;
            }

            const newId = generateId('cat');
            const importedCat = safeClone(categoryToImport);
            importedCat.id = newId;

            // Resetar histórico, tempo e estatísticas para o novo concurso
            importedCat.totalMinutes = 0;
            importedCat.lastStudiedAt = null;
            importedCat.simuladoStats = {
                history: [],
                average: 0,
                lastAttempt: 0,
                trend: 'stable',
                level: 'BAIXO'
            };

            // Regenerar IDs das tarefas e resetar progresso para o novo certame
            const rawTasks = Array.isArray(importedCat.tasks) ? importedCat.tasks : Object.values(importedCat.tasks || {});
            importedCat.tasks = rawTasks.map(t => {
                const taskClone = safeClone(t);
                return {
                    ...taskClone,
                    id: generateId('task'),
                    completed: false,
                    completedAt: null,
                    status: null,
                    awardedXP: undefined
                };
            });

            activeData.categories.push(importedCat);
            removeCategoryTombstone(newId, importedCat.name);

            const nowIso = new Date().toISOString();
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            markStorageDirty();
            clearUrgencyCache();
            clearTopicsCache();
            clearMcCache();
            result = true;
        });
        return result;
    },
});

