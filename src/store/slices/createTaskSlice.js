import { generateId } from '../../utils/idGenerator';
import { XP_CONFIG } from '../../config/gamification';
import { getTaskXP } from '../../utils/gamification';

export const createTaskSlice = (set, get) => ({
    toggleTask: (categoryId, taskId) => {
        let pendingXpChange = 0;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData || !activeData.categories) return;

            const category = activeData.categories.find(c => c.id === categoryId);
            if (!category) return;

            const task = category.tasks.find(t => t && (t.id || t.text) === taskId);
            if (!task) return;

            const completed = !task.completed;
            const xpChange = getTaskXP(task, completed);
            pendingXpChange = xpChange;

            task.completed = completed;
            task.completedAt = completed ? new Date().toISOString() : null;

            if (completed) {
                task.lastStudiedAt = new Date().toISOString();
                // ✅ FIX N-03: Gravar o XP concedido como "recibo" imutável
                task.awardedXP = Math.abs(xpChange);
            } else {
                // ✅ FIX N-03: Ao desmarcar, usar o recibo gravado (não o XP atual da prioridade)
                // Isso impede o exploit de mudar prioridade após completar
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

    toggleNeuralTask: (taskId) => {
        let pendingXpChange = 0;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData) return;

            let found = false;
            
            // Search in coachPlan (Backlog)
            if (activeData.coachPlan) {
                const task = activeData.coachPlan.find(t => t && (t.id === taskId || t.text === taskId));
                if (task && !task.completed) {
                    task.completed = true;
                    pendingXpChange += getTaskXP(task, true);
                    found = true;
                }
            }

            // Search in coachPlanner (Days)
            if (activeData.coachPlanner) {
                Object.values(activeData.coachPlanner).forEach(dayTasks => {
                    const task = (dayTasks || []).find(t => t && (t.id === taskId || t.text === taskId));
                    if (task && !task.completed) {
                        task.completed = true;
                        pendingXpChange += getTaskXP(task, true);
                        found = true;
                    }
                });
            }

            // Search in categories (Priority tasks in Pomodoro Focus Panel / Neural Core)
            if (activeData.categories) {
                (Array.isArray(activeData.categories) ? activeData.categories : Object.values(activeData.categories)).forEach(cat => {
                    const task = (Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {})).find(t => t && (t.id === taskId || t.text === taskId));
                    if (task && !task.completed) {
                        task.completed = true;
                        task.completedAt = new Date().toISOString();
                        task.lastStudiedAt = new Date().toISOString();
                        const xp = getTaskXP(task, true);
                        task.awardedXP = Math.abs(xp);
                        pendingXpChange += xp;
                        found = true;
                    }
                });
            }

            if (found) {
                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
                localStorage.setItem('ultra-sync-dirty', 'true');
            }
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
            // BUG-T04 FIX: Impedir duplicatas por nome normalizado.
            const normNew = trimmedTitle.toLowerCase().replace(/\s+/g, ' ').trim();
            const alreadyExists = (category.tasks || []).some(t => {
                const existing = String(t.text || t.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
                return existing === normNew;
            });
            if (alreadyExists) return;
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
            if (!activeData?.categories) return;
            const category = activeData.categories.find(c => c.id === categoryId);
            if (category) {
                const task = category.tasks.find(t => t.id === taskId);
                if (task && task.completed) {
                    // BUG-T01 FIX: awardedXP === 0 é um valor válido gravado.
                    // Usar ?? em vez de || para não cair no fallback quando
                    // awardedXP é 0 (o que causaria dedução errada).
                    const rawAwarded = task.awardedXP;
                    if (rawAwarded !== undefined && rawAwarded !== null && Number.isFinite(Number(rawAwarded))) {
                        pendingXpDeduction = Math.abs(Number(rawAwarded));
                    } else {
                        pendingXpDeduction = Math.abs(getTaskXP(task, true));
                    }
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
        if (!activeData?.categories) return;
        const category = activeData.categories.find(c => c.id === categoryId);
        if (!category) return;

        const task = category.tasks.find(t => t.id === taskId);
        if (task) {
            const oldPriority = task.priority || 'medium';
            task.priority = priorities[(priorities.indexOf(task.priority || 'medium') + 1) % 3];

            // BUG-T06 FIX: Se a tarefa já está completada, o XP concedido
            // foi baseado na prioridade antiga. Ajustar o XP do usuário
            // e o recibo awardedXP para a nova prioridade.
            if (task.completed && task.awardedXP !== undefined) {
                const oldXP = XP_CONFIG.task[oldPriority] || XP_CONFIG.task.medium;
                const newXP = XP_CONFIG.task[task.priority] || XP_CONFIG.task.medium;
                const diff = newXP - oldXP;
                if (diff !== 0) {
                    const contestUser = activeData.user;
                    if (contestUser) {
                        contestUser.xp = Math.max(0, (contestUser.xp || 0) + diff);
                    }
                    task.awardedXP = newXP;
                }
            }
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});

