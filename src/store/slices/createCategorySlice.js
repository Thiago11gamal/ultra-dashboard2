import { generateId } from '../../utils/idGenerator';
import { normalize } from '../../utils/normalization';

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
            weight: 10
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
                data: JSON.parse(JSON.stringify({
                    category: category,
                    studyLogs: activeData.studyLogs?.filter(l => l.categoryId === id) || [],
                    studySessions: activeData.studySessions?.filter(s => s.categoryId === id) || [],
                    mcWeight: activeData.mcWeights?.[id] || activeData.mcWeights?.[category.name]
                })),
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

    setMonteCarloWeights: (weights) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData || !weights) return;

        activeData.mcWeights = weights;
        if (activeData.categories) {
            activeData.categories.forEach(cat => {
                if (weights[cat.id] !== undefined) {
                    cat.weight = weights[cat.id];
                } else if (weights[cat.name] !== undefined) {
                    cat.weight = weights[cat.name];
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

            // MERGE LOGIC
            changed = true;
            console.log(`[Store] Merging ${group.length} duplicates for "${group[0].name}"`);
            
            // Primary is the one with most tasks or history
            const primary = group.sort((a, b) => {
                const aData = (a.tasks?.length || 0) + (a.simuladoStats?.history?.length || 0);
                const bData = (b.tasks?.length || 0) + (b.simuladoStats?.history?.length || 0);
                return bData - aData;
            })[0];

            const mergedTasks = [...(primary.tasks || [])];
            const mergedHistory = [...(primary.simuladoStats?.history || [])];

            group.forEach(cat => {
                if (cat.id === primary.id) return;
                
                // Merge tasks (deduplicate by title)
                (cat.tasks || []).forEach(t => {
                    const taskTitle = t.title || t.text;
                    if (!mergedTasks.some(mt => (mt.title || mt.text) === taskTitle)) {
                        mergedTasks.push(t);
                    }
                });

                // Merge History
                (cat.simuladoStats?.history || []).forEach(h => {
                    if (!mergedHistory.some(mh => mh.date === h.date && mh.topic === h.topic)) {
                        mergedHistory.push(h);
                    }
                });

                // Re-map other data pointers in the store
                const oldId = cat.id;
                const newId = primary.id;

                if (activeData.studyLogs) {
                    activeData.studyLogs.forEach(l => { if (l.categoryId === oldId) l.categoryId = newId; });
                }
                if (activeData.studySessions) {
                    activeData.studySessions.forEach(s => { if (s.categoryId === oldId) s.categoryId = newId; });
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
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            localStorage.setItem('ultra-sync-dirty', 'true');
        }
    }),
});
