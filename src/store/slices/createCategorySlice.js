import { generateId } from '../../utils/idGenerator';
import { normalize } from '../../utils/normalization';
import { safeClone } from '../safeClone.js';

export const createCategorySlice = (set, get) => ({
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
                    studyLogs: activeData.studyLogs?.filter(l => l.categoryId === id) || [],
                    studySessions: activeData.studySessions?.filter(s => s.categoryId === id) || [],
                    simuladoRows: activeData.simuladoRows?.filter(r => r.categoryId === id) || [],
                    simulados: activeData.simulados?.filter(s => s.categoryId === id) || [],
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
            activeData.studyLogs = activeData.studyLogs.filter(l => l.categoryId !== id);
        }
        if (activeData.studySessions) {
            activeData.studySessions = activeData.studySessions.filter(s => s.categoryId !== id);
        }
        if (activeData.simuladoRows) {
            activeData.simuladoRows = activeData.simuladoRows.filter(r => r.categoryId !== id);
        }
        if (activeData.simulados) {
            activeData.simulados = activeData.simulados.filter(s => s.categoryId !== id);
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

        // BUG-FIX: O guard de versão bloqueava o merge após hidratação (IDB restore).
        // Substituído por verificação real de duplicatas para só sair cedo se não há trabalho.
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

            const mergedTasks = [...(primary.tasks || [])];
            const mergedHistory = [...getHistoryArr(primary)];

            group.forEach(cat => {
                if (cat.id === primary.id) return;

                (cat.tasks || []).forEach(t => {
                    const taskTitle = (t.title || t.text || '').trim();
                    if (!mergedTasks.some(mt => (mt.title || mt.text || '').trim() === taskTitle)) {
                        mergedTasks.push(t);
                    }
                });

                getHistoryArr(cat).forEach(h => {
                    const exists = mergedHistory.some(mh => mh.date === h.date && normalize(mh.topic) === normalize(h.topic));
                    if (!exists) mergedHistory.push(h);
                });

                const oldId = cat.id;
                const newId = primary.id;

                if (activeData.studyLogs) {
                    activeData.studyLogs.forEach(l => { if (l.categoryId === oldId) l.categoryId = newId; });
                }
                if (activeData.studySessions) {
                    activeData.studySessions.forEach(s => { if (s.categoryId === oldId) s.categoryId = newId; });
                }
                if (activeData.simuladoRows) {
                    activeData.simuladoRows.forEach(r => { if (r.categoryId === oldId) r.categoryId = newId; });
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

            // CLEANUP: Remover pesos órfãos
            if (activeData.mcWeights) {
                const validKeys = new Set();
                newCategories.forEach(c => {
                    validKeys.add(c.id);
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
});
