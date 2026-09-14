import { generateId } from '../../utils/idGenerator.js';
import { XP_CONFIG } from '../../config/gamification.js';
import { getTaskXP } from '../../utils/gamification.js';
import { markStorageDirty } from '../../utils/storageSafe.js';

export const createTaskSlice = (set, get) => ({
    toggleTask: (categoryId, taskId) => {
        let pendingXpChange = 0;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData) return;
            if (!Array.isArray(activeData.categories)) {
                activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                    ? Object.values(activeData.categories)
                    : [];
            }

            const category = activeData.categories.find(c => c && (c.id === categoryId || c.name === categoryId));
            if (!category) return;
            if (!Array.isArray(category.tasks)) {
                category.tasks = category.tasks && typeof category.tasks === 'object'
                    ? Object.values(category.tasks)
                    : [];
            }

            const task = category.tasks.find(t => t && (t.id === taskId || t.text === taskId || t.title === taskId));
            if (!task) return;

            const completed = !task.completed;
            const xpChange = getTaskXP(task, completed);
            pendingXpChange = xpChange;

            const nowIso = new Date().toISOString();
            task.completed = completed;
            task.completedAt = completed ? nowIso : null;

            if (completed) {
                task.lastStudiedAt = nowIso;
                // ✅ FIX N-03: Gravar o XP concedido como "recibo" imutável
                task.awardedXP = Math.abs(xpChange);
            } else {
                // ✅ FIX N-03: Ao desmarcar, usar o recibo gravado (não o XP atual da prioridade)
                // Isso impede o exploit de mudar prioridade após completar
                delete task.awardedXP;
            }

            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            markStorageDirty();
        });
        if (pendingXpChange !== 0 && get().awardExperience) {
            get().awardExperience(pendingXpChange);
        }
    },

    toggleNeuralTask: (taskId) => {
        if (!taskId) return;
        let pendingXpChange = 0;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData) return;

            let found = false;
            let xpAwarded = false;
            const nowIso = new Date().toISOString();

            const handleTask = (task) => {
                if (task && !task.completed) {
                    task.completed = true;
                    task.completedAt = nowIso;
                    task.lastStudiedAt = nowIso;
                    const xp = getTaskXP(task, true);
                    task.awardedXP = Math.abs(xp);
                    if (!xpAwarded) {
                        pendingXpChange += xp;
                        xpAwarded = true;
                    }
                    found = true;
                }
            };
            
            // Search in coachPlan (Backlog)
            if (activeData.coachPlan) {
                const task = activeData.coachPlan.find(t => t && (t.id === taskId || t.text === taskId));
                handleTask(task);
            }

            // Search in coachPlanner (Days)
            if (activeData.coachPlanner) {
                Object.values(activeData.coachPlanner).forEach(dayTasks => {
                    const task = (dayTasks || []).find(t => t && (t.id === taskId || t.text === taskId));
                    handleTask(task);
                });
            }

            // Search in categories (Priority tasks in Pomodoro Focus Panel / Neural Core)
            if (activeData.categories) {
                (Array.isArray(activeData.categories) ? activeData.categories : Object.values(activeData.categories)).forEach(cat => {
                    const task = (Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {})).find(t => t && (t.id === taskId || t.text === taskId));
                    handleTask(task);
                });
            }

            if (found) {
                activeData.lastUpdated = nowIso;
                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = nowIso;
                markStorageDirty();
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
        if (!activeData) return;
        if (!Array.isArray(activeData.categories)) {
            activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                ? Object.values(activeData.categories)
                : [];
        }

        const category = activeData.categories.find(c => c && (c.id === categoryId || c.name === categoryId));
        if (category) {
            if (!Array.isArray(category.tasks)) {
                category.tasks = category.tasks && typeof category.tasks === 'object'
                    ? Object.values(category.tasks)
                    : [];
            }
            // BUG-T04 FIX: Impedir duplicatas por nome normalizado.
            const normNew = trimmedTitle.toLowerCase().replace(/\s+/g, ' ').trim();
            const alreadyExists = category.tasks.some(t => {
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

            const nowIso = new Date().toISOString();
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            markStorageDirty();
        }
    }),

    deleteTask: (categoryId, taskId) => {
        let pendingXpDeduction = 0;
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData) return;
            if (!Array.isArray(activeData.categories)) {
                activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                    ? Object.values(activeData.categories)
                    : [];
            }

            const category = activeData.categories.find(c => c && (c.id === categoryId || c.name === categoryId));
            if (category) {
                if (!Array.isArray(category.tasks)) {
                    category.tasks = category.tasks && typeof category.tasks === 'object'
                        ? Object.values(category.tasks)
                        : [];
                }
                const task = category.tasks.find(t => t && (t.id === taskId || t.text === taskId || t.title === taskId));
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
                const activeSubjectTaskId = state.appState.pomodoro?.activeSubject?.taskId;
                if (activeSubjectTaskId && (activeSubjectTaskId === taskId || (task && (activeSubjectTaskId === task.id || activeSubjectTaskId === task.text || activeSubjectTaskId === task.title)))) {
                    state.appState.pomodoro.activeSubject = null;
                }
                category.tasks = category.tasks.filter(t => t && t.id !== taskId && t.text !== taskId && t.title !== taskId);

                const nowIso = new Date().toISOString();
                activeData.lastUpdated = nowIso;
                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = nowIso;
                markStorageDirty();
            }
        });
        if (pendingXpDeduction > 0 && get().awardExperience) {
            get().awardExperience(-pendingXpDeduction);
        }
    },

    togglePriority: (categoryId, taskId) => {
        const priorities = ['low', 'medium', 'high'];
        let pendingXpDiff = 0;

        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];
            if (!activeData?.categories) return;

            const categories = Array.isArray(activeData.categories)
                ? activeData.categories
                : Object.values(activeData.categories || {});

            const category = categories.find(c => c && (c.id === categoryId || c.name === categoryId));
            if (!category) return;

            const tasks = Array.isArray(category.tasks)
                ? category.tasks
                : Object.values(category.tasks || {});

            const task = tasks.find(t => t && ((t.id && t.id === taskId) || (t.text && t.text === taskId) || (t.title && t.title === taskId)));
            if (task) {
                const oldPriority = String(task.priority || 'medium').toLowerCase();
                const currentIndex = priorities.indexOf(oldPriority);
                const nextIndex = currentIndex === -1 ? 1 : (currentIndex + 1) % 3;
                const newPriority = priorities[nextIndex];
                task.priority = newPriority;

                // BUG-T06 FIX: Se a tarefa já está completada, o XP concedido
                // foi baseado na prioridade antiga. Ajustar o XP e recibo via awardExperience.
                if (task.completed && task.awardedXP !== undefined) {
                    const oldXP = XP_CONFIG.task[oldPriority] || XP_CONFIG.task.medium;
                    const newXP = XP_CONFIG.task[newPriority] || XP_CONFIG.task.medium;
                    const diff = newXP - oldXP;
                    if (diff !== 0) {
                        task.awardedXP = newXP;
                        pendingXpDiff = diff;
                    }
                }

                // Garante novas referências de array para Zustand / React shallow memoization
                category.tasks = [...tasks];
                activeData.categories = [...categories];

                const nowIso = new Date().toISOString();
                activeData.lastUpdated = nowIso;
                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = nowIso;
                markStorageDirty();
            }
        });

        if (pendingXpDiff !== 0 && typeof get().awardExperience === 'function') {
            get().awardExperience(pendingXpDiff);
        }
    },
});

