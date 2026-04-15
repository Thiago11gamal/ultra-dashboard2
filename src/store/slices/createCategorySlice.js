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
        if (!activeData || !activeData.categories || !weights) return;

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
});
