import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { INITIAL_DATA } from '../data/initialData';
import { XP_CONFIG, getTaskXP } from '../utils/gamification';

// Helper to handle gamification within the store
// This mimics the 'applyGamification' from the custom hook, but runs inside Zustand
const processGamification = (state, xpGained) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData || !activeData.user) return;

    let currentXP = activeData.user.xp || 0;
    let currentLevel = activeData.user.level || 1;
    let newXP = currentXP + xpGained;
    let leveledUp = false;

    // Calculate level up
    while (true) {
        const nextLevelXP = 100 * Math.pow(1.5, currentLevel - 1);
        if (newXP >= nextLevelXP) {
            newXP -= nextLevelXP;
            currentLevel += 1;
            leveledUp = true;
        } else {
            break;
        }
    }

    activeData.user.xp = newXP;
    activeData.user.level = currentLevel;

    // We target the active contest implicitly via immer draft logic injected below
    return leveledUp ? currentLevel : null;
};

// Create the Zustand store with Immer for easy deep mutations
export const useAppStore = create(
    persist(
        immer((set, get) => ({
            // State
            appState: {
                contests: { 'default': INITIAL_DATA },
                activeId: 'default',
                history: []
            },

            // Actions
            setAppState: (newStateObj) => set((state) => {
                // Allows overwrite of appState entirely (used in imports)
                state.appState = typeof newStateObj === 'function' ? newStateObj(state.appState) : newStateObj;
            }),

            setData: (newDataCallback) => set((state) => {
                // Allows updating only the active contest data
                const currentData = state.appState.contests[state.appState.activeId];
                const updatedData = typeof newDataCallback === 'function' ? newDataCallback(currentData) : newDataCallback;
                state.appState.contests[state.appState.activeId] = updatedData;
            }),

            // === Data Mutations (Immer makes this super clean) ===

            // 1. Gamification & Tasks
            toggleTask: (categoryId, taskId) => set((state) => {
                let xpChange = 0;
                const activeData = state.appState.contests[state.appState.activeId];
                if (!activeData || !activeData.categories) return;

                const category = activeData.categories.find(c => c.id === categoryId);
                if (!category) return;

                const task = category.tasks.find(t => t.id === taskId);
                if (!task) return;

                const completed = !task.completed;
                xpChange = getTaskXP(task, completed);

                task.completed = completed;
                task.completedAt = completed ? new Date().toISOString() : null;
                if (completed) task.lastStudiedAt = new Date().toISOString();

                // Apply XP directly
                if (xpChange !== 0 && activeData.user) {
                    // Gamification logic
                    let currentXP = activeData.user.xp || 0;
                    let currentLevel = activeData.user.level || 1;
                    let newXP = currentXP + xpChange;

                    while (true) {
                        const nextLevelXP = 100 * Math.pow(1.5, currentLevel - 1);
                        if (newXP >= nextLevelXP) {
                            newXP -= nextLevelXP;
                            currentLevel += 1;
                        } else {
                            break;
                        }
                    }
                    activeData.user.xp = newXP;
                    activeData.user.level = currentLevel;
                }
            }),

            addTask: (categoryId, title) => set((state) => {
                if (!title || typeof title !== 'string') return;
                const activeData = state.appState.contests[state.appState.activeId];
                const category = activeData.categories.find(c => c.id === categoryId);
                if (category) {
                    category.tasks.push({
                        id: `task-${Date.now()}`,
                        title,
                        completed: false,
                        priority: 'medium'
                    });
                }
            }),

            deleteTask: (categoryId, taskId) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                const category = activeData.categories.find(c => c.id === categoryId);
                if (category) {
                    category.tasks = category.tasks.filter(t => t.id !== taskId);
                }
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
            }),

            // 2. Categories
            addCategory: (name) => set((state) => {
                if (!name || typeof name !== 'string') return;
                const activeData = state.appState.contests[state.appState.activeId];
                activeData.categories.push({
                    id: `cat-${Date.now()}`,
                    name,
                    color: '#3b82f6',
                    icon: '📚',
                    tasks: [],
                    weight: 10
                });
            }),

            deleteCategory: (id) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                activeData.categories = activeData.categories.filter(c => c.id !== id);
                if (activeData.studyLogs) {
                    activeData.studyLogs = activeData.studyLogs.filter(l => l.categoryId !== id);
                }
            }),

            // 3. Pomodoro & Sessions
            handleUpdateStudyTime: (categoryId, minutes, taskId) => set((state) => {
                const now = new Date().toISOString();
                const activeData = state.appState.contests[state.appState.activeId];

                if (!activeData.studyLogs) activeData.studyLogs = [];
                if (!activeData.studySessions) activeData.studySessions = [];

                activeData.studyLogs.push({ id: `log-${Date.now()}`, date: now, categoryId, taskId, minutes });
                activeData.studySessions.push({ id: Date.now(), startTime: now, duration: minutes, categoryId, taskId });

                const category = activeData.categories.find(c => c.id === categoryId);
                if (category) {
                    category.totalMinutes = (category.totalMinutes || 0) + minutes;
                    category.lastStudiedAt = now;

                    if (taskId) {
                        const task = category.tasks.find(t => t.id === taskId);
                        if (task) task.lastStudiedAt = now;
                    }
                }

                // XP logic (base + bonus)
                const baseXP = XP_CONFIG.pomodoro.base; // 100
                const bonusXP = taskId ? XP_CONFIG.pomodoro.bonusWithTask : 0; // +100
                const totalXP = baseXP + bonusXP;

                if (activeData.user) {
                    let currentXP = activeData.user.xp || 0;
                    let currentLevel = activeData.user.level || 1;
                    let newXP = currentXP + totalXP;

                    while (true) {
                        const nextLevelXP = 100 * Math.pow(1.5, currentLevel - 1);
                        if (newXP >= nextLevelXP) {
                            newXP -= nextLevelXP;
                            currentLevel += 1;
                        } else {
                            break;
                        }
                    }
                    activeData.user.xp = newXP;
                    activeData.user.level = currentLevel;
                }
            }),

            deleteSession: (sessionId) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                const sessionIndex = activeData.studySessions?.findIndex(s => s.id === sessionId);
                if (sessionIndex === -1 || sessionIndex === undefined) return;

                const session = activeData.studySessions[sessionIndex];

                // Deduct time from category
                const category = activeData.categories.find(c => c.id === session.categoryId);
                if (category) {
                    category.totalMinutes = Math.max(0, (category.totalMinutes || 0) - (session.duration || 0));
                }

                // Remove session
                activeData.studySessions.splice(sessionIndex, 1);

                // Remove log
                if (activeData.studyLogs) {
                    activeData.studyLogs = activeData.studyLogs.filter(l => {
                        if (l.categoryId !== session.categoryId) return true;
                        if (l.taskId !== session.taskId) return true;
                        if (l.date !== session.startTime) return true;
                        return false;
                    });
                }
            }),

            // 4. Simulados Configs
            updateWeights: (weights) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                if (!activeData.categories) return;

                activeData.categories.forEach(cat => {
                    if (weights[cat.name] !== undefined) {
                        cat.weight = weights[cat.name];
                    }
                });
            }),

            resetSimuladoStats: () => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                activeData.categories.forEach(c => {
                    c.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
                });
            }),

            deleteSimulado: (dateStr) => set((state) => {
                const targetDate = new Date(dateStr).toDateString();
                const activeData = state.appState.contests[state.appState.activeId];

                if (activeData.simuladoRows) {
                    activeData.simuladoRows = activeData.simuladoRows.filter(r => !r.createdAt || new Date(r.createdAt).toDateString() !== targetDate);
                }

                activeData.categories.forEach(c => {
                    if (c.simuladoStats?.history) {
                        c.simuladoStats.history = c.simuladoStats.history.filter(h => new Date(h.date).toDateString() !== targetDate);
                    }
                });
            }),

            // 5. User Settings & Management
            updatePomodoroSettings: (settings) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                activeData.settings = settings;
            }),

            toggleDarkMode: () => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                if (!activeData.settings) activeData.settings = {};
                activeData.settings.darkMode = !activeData.settings.darkMode;
            }),

            updateUserName: (name) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                if (!activeData.user) activeData.user = {};
                activeData.user.name = name;
            }),

            // 6. Contests Management
            switchContest: (contestId) => set((state) => {
                state.appState.activeId = contestId;
            }),

            createNewContest: () => set((state) => {
                const newId = `contest-${Date.now()}`;
                const newContestData = {
                    ...INITIAL_DATA,
                    user: { ...INITIAL_DATA.user, name: 'Novo Concurso' },
                    simuladoRows: [],
                    simulados: [],
                    categories: []
                };
                state.appState.contests[newId] = newContestData;
                state.appState.activeId = newId;
            }),

            deleteContest: (contestId) => set((state) => {
                delete state.appState.contests[contestId];

                const remainingIds = Object.keys(state.appState.contests);
                if (remainingIds.length === 0) {
                    state.appState.contests['default'] = INITIAL_DATA;
                    state.appState.activeId = 'default';
                } else if (contestId === state.appState.activeId) {
                    state.appState.activeId = remainingIds[0];
                }
            })

        })),
        {
            name: 'ultra-dashboard-storage',
            partialize: (state) => ({ appState: state.appState }),
        }
    )
);
