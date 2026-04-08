import { generateId } from '../../utils/idGenerator';
import { getTaskXP } from '../../utils/gamification';

export const createTaskSlice = (set, get) => ({
    toggleTask: (categoryId, taskId) => {
        let levelUpDetail = null;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData || !activeData.categories) return;

            const category = activeData.categories.find(c => c.id === categoryId);
            if (!category) return;

            const task = category.tasks.find(t => t.id === taskId);
            if (!task) return;

            const completed = !task.completed;
            const xpChange = getTaskXP(task, completed);

            task.completed = completed;
            task.completedAt = completed ? new Date().toISOString() : null;
            if (completed) {
                task.lastStudiedAt = new Date().toISOString();
                task.awardedXP = Math.abs(xpChange);
            } else {
                delete task.awardedXP;
            }

            // processGamification is in GamificationSlice, but we might need to access it
            // For now, we'll assume processGamification is available on the state or we call it directly if shared.
            // Actually, in Zustand slices, they share the same 'state/set/get'.
            if (state.processGamification) {
                levelUpDetail = state.processGamification(xpChange);
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            localStorage.setItem('ultra-sync-dirty', 'true');
        });
        
        if (levelUpDetail && get().dispatchLevelUp) {
            get().dispatchLevelUp(levelUpDetail);
        }
    },

    addTask: (categoryId, title) => set((state) => {
        const trimmedTitle = typeof title === 'string' ? title.trim() : '';
        if (!trimmedTitle) return;

        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData?.categories) return;
        const category = activeData.categories.find(c => c.id === categoryId);
        if (category) {
            category.tasks.push({
                id: generateId('task'),
                text: trimmedTitle,
                title: trimmedTitle,
                completed: false,
                priority: 'medium'
            });
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    deleteTask: (categoryId, taskId) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        const category = activeData.categories.find(c => c.id === categoryId);
        if (category) {
            const task = category.tasks.find(t => t.id === taskId);
            if (task && task.completed) {
                const xpDeduction = task.awardedXP || 150;
                if (state.processGamification) state.processGamification(-xpDeduction);
            }
            category.tasks = category.tasks.filter(t => t.id !== taskId);
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    togglePriority: (categoryId, taskId) => set((state) => {
        const priorities = ['low', 'medium', 'high'];
        const activeData = state.appState.contests[state.appState.activeId];
        const category = activeData.categories.find(c => c.id === categoryId);
        if (!category) return;

        const task = category.tasks.find(t => t.id === taskId);
        if (task) {
            task.priority = priorities[(priorities.indexOf(task.priority || 'medium') + 1) % 3];
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
