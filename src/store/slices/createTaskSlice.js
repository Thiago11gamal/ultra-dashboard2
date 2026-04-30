import { generateId } from '../../utils/idGenerator';
import { getTaskXP } from '../../utils/gamification';

export const createTaskSlice = (set, get) => ({
    toggleTask: (categoryId, taskId) => {
        let pendingXpChange = 0;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData || !activeData.categories) return;

            const category = activeData.categories.find(c => c.id === categoryId);
            if (!category) return;

            const task = category.tasks.find(t => t.id === taskId);
            if (!task) return;

            const completed = !task.completed;
            const xpChange = getTaskXP(task, completed);
            pendingXpChange = xpChange;

            task.completed = completed;
            task.completedAt = completed ? new Date().toISOString() : null;
            if (completed) {
                task.lastStudiedAt = new Date().toISOString();
                task.awardedXP = Math.abs(xpChange);
            } else {
                delete task.awardedXP;
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            localStorage.setItem('ultra-sync-dirty', 'true');
        });
        
        if (pendingXpChange !== 0 && get().awardExperience) {
            get().awardExperience(pendingXpChange);
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

    deleteTask: (categoryId, taskId) => {
        let pendingXpDeduction = 0;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            const category = activeData.categories.find(c => c.id === categoryId);
            if (category) {
                const task = category.tasks.find(t => t.id === taskId);
                if (task && task.completed) {
                    pendingXpDeduction = task.awardedXP || 150;
                }
                category.tasks = category.tasks.filter(t => t.id !== taskId);
            }
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            localStorage.setItem('ultra-sync-dirty', 'true');
        });
        if (pendingXpDeduction > 0 && get().awardExperience) {
            get().awardExperience(-pendingXpDeduction);
        }
    },

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
