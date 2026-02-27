import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { INITIAL_DATA } from '../data/initialData';
import { XP_CONFIG, getTaskXP, calculateLevel } from '../utils/gamification';
import { checkAndUnlockAchievements } from '../utils/gamificationLogic';
import { generateId } from '../utils/idGenerator';

// Helper to handle gamification within the store
// This mimics the 'applyGamification' from the custom hook, but runs inside Zustand
const processGamification = (state, xpGained) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData || !activeData.user || xpGained === 0) return null;

    let currentXP = activeData.user.xp || 0;
    let currentLevel = activeData.user.level || 1;
    let newXP = Math.max(0, currentXP + xpGained);

    // Calculate level up using centralized logic
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > currentLevel;

    // --- ACHIEVEMENT SYSTEM ACTIVATION ---
    const currentAchievements = activeData.user.achievements || [];
    const { newlyUnlocked, xpGained: achievementXp } = checkAndUnlockAchievements(activeData, currentAchievements);

    if (newlyUnlocked.length > 0) {
        newXP += achievementXp;
        activeData.user.achievements = [...currentAchievements, ...newlyUnlocked];
        // After potential achievement XP, recalculate level
        activeData.user.level = calculateLevel(newXP);
    } else {
        activeData.user.level = newLevel;
    }

    activeData.user.xp = newXP;

    if (leveledUp && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('level-up', {
            detail: {
                level: newLevel,
                title: `Nível ${newLevel} Desbloqueado!`,
                xpGained: newXP - currentXP
            }
        }));
    }

    return leveledUp ? newLevel : null;
};

// Create the Zustand store with Immer for easy deep mutations
export const useAppStore = create(
    persist(
        immer((set) => ({
            // State
            appState: {
                contests: { 'default': INITIAL_DATA },
                activeId: 'default',
                history: []
            },

            // Actions
            setAppState: (newStateObj) => set((state) => {
                // Resolve the next state first before touching history
                const nextState = typeof newStateObj === 'function' ? newStateObj(state.appState) : newStateObj;

                // Safety check: ensure nextState has required structure before committing
                if (!nextState || !nextState.contests || !nextState.activeId) return;

                // Only record snapshot for undo after we know the update is valid
                const snapshot = JSON.parse(JSON.stringify(state.appState.contests));
                const activeId = state.appState.activeId;

                state.appState.history.push({
                    contests: snapshot,
                    activeId: activeId
                });

                if (state.appState.history.length > 10) state.appState.history.shift();

                state.appState.contests = nextState.contests;
                state.appState.activeId = nextState.activeId;
                // Preserve history stack unless the import explicitly provides a new one
                if (nextState.history) state.appState.history = nextState.history;
            }),

            setData: (newDataCallback) => set((state) => {
                // Record snapshot for undo
                const snapshot = { ...state.appState.contests[state.appState.activeId] };
                state.appState.history.push({ data: snapshot, contestId: state.appState.activeId });
                if (state.appState.history.length > 10) state.appState.history.shift();

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

                // Apply XP using unified helper
                processGamification(state, xpChange);
            }),

            addTask: (categoryId, title) => set((state) => {
                if (!title || typeof title !== 'string') return;
                const activeData = state.appState.contests[state.appState.activeId];
                const category = activeData.categories.find(c => c.id === categoryId);
                if (category) {
                    category.tasks.push({
                        id: generateId('task'),
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
                    id: generateId('cat'),
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
                if (activeData.studySessions) {
                    activeData.studySessions = activeData.studySessions.filter(s => s.categoryId !== id);
                }
            }),

            // 3. Pomodoro & Sessions
            handleUpdateStudyTime: (categoryId, minutes, taskId) => set((state) => {
                const now = new Date().toISOString();
                const activeData = state.appState.contests[state.appState.activeId];

                if (!activeData.studyLogs) activeData.studyLogs = [];
                if (!activeData.studySessions) activeData.studySessions = [];

                const logId = generateId('log');
                activeData.studyLogs.push({ id: logId, date: now, categoryId, taskId, minutes });
                activeData.studySessions.push({ id: logId, startTime: now, duration: minutes, categoryId, taskId });

                const category = activeData.categories.find(c => c.id === categoryId);
                if (category) {
                    category.totalMinutes = (category.totalMinutes || 0) + minutes;
                    category.lastStudiedAt = now;

                    if (taskId) {
                        const task = category.tasks.find(t => t.id === taskId);
                        if (task) task.lastStudiedAt = now;
                    }
                }

                // XP logic using unified helper
                const baseXP = XP_CONFIG.pomodoro.base; // 100
                const bonusXP = taskId ? XP_CONFIG.pomodoro.bonusWithTask : 0; // +100
                processGamification(state, baseXP + bonusXP);
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

                // Remove log by fixed ID
                if (activeData.studyLogs) {
                    activeData.studyLogs = activeData.studyLogs.filter(l => l.id !== session.id);
                }
            }),

            // 4. Simulados Configs
            setMonteCarloWeights: (weights) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                if (!activeData) return;
                activeData.mcWeights = weights;

                // Sync with categories for backward compatibility and other displays
                if (activeData.categories) {
                    activeData.categories.forEach(cat => {
                        if (weights[cat.name] !== undefined) {
                            cat.weight = weights[cat.name];
                        }
                    });
                }
            }),

            updateWeights: (weights) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                if (!activeData.categories) return;

                activeData.categories.forEach(cat => {
                    if (weights[cat.name] !== undefined) {
                        cat.weight = weights[cat.name];
                    }
                });
                // Also update mcWeights
                activeData.mcWeights = { ...(activeData.mcWeights || {}), ...weights };
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
                const newId = generateId('contest');
                const initialClone = JSON.parse(JSON.stringify(INITIAL_DATA));
                const newContestData = {
                    ...initialClone,
                    user: { ...initialClone.user, name: 'Novo Concurso' },
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
                    state.appState.contests['default'] = JSON.parse(JSON.stringify(INITIAL_DATA));
                    state.appState.activeId = 'default';
                } else if (contestId === state.appState.activeId) {
                    state.appState.activeId = remainingIds[0];
                }
            })

        })),
        {
            name: 'ultra-dashboard-storage',
            version: 1, // Add versioning for future migrations
            storage: createJSONStorage(() => ({
                getItem: (name) => localStorage.getItem(name),
                setItem: (name, value) => {
                    try {
                        localStorage.setItem(name, value);
                    } catch (e) {
                        // Error code 22 is usually QuotaExceededError
                        if (e.name === 'QuotaExceededError' || e.code === 22) {
                            console.warn('LocalStorage limit reached! Attempting to save without history...');
                            try {
                                const state = JSON.parse(value);
                                if (state.state?.appState) {
                                    // Wipe history to save the actual data
                                    state.state.appState.history = [];
                                    localStorage.setItem(name, JSON.stringify(state));
                                }
                            } catch (error) {
                                console.error('Auto-pruning failed:', error);
                            }
                        } else {
                            throw e;
                        }
                    }
                },
                removeItem: (name) => localStorage.removeItem(name)
            })),
            partialize: (state) => ({ appState: state.appState }),
            // CRITICAL FIX: Custom merge to prevent HMR (Hot Reload) from wiping data
            merge: (persistedState, currentState) => {
                if (!persistedState || !persistedState.appState) {
                    return currentState;
                }

                // Deep merge or simply take the persisted state if it looks valid
                // This prevents Vite from evaluating the module again and overwriting with INITIAL_DATA
                return {
                    ...currentState,
                    appState: {
                        ...currentState.appState,
                        ...persistedState.appState,
                        contests: persistedState.appState.contests || currentState.appState.contests,
                        activeId: persistedState.appState.activeId || currentState.appState.activeId,
                        history: persistedState.appState.history || currentState.appState.history
                    }
                };
            }
        }
    )
);
