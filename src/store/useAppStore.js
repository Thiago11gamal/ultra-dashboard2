import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { INITIAL_DATA } from '../data/initialData';
import { XP_CONFIG, getTaskXP, calculateLevel } from '../utils/gamification';
import { checkAndUnlockAchievements } from '../utils/gamificationLogic';
import { generateId } from '../utils/idGenerator';

// Scalability cap: prevents localStorage overflow after months of use
const LOG_CAP = 1000;          // max studyLogs entries kept
const SESSION_CAP = 1000;      // max studySessions entries kept

// Helper: strip large append-only arrays from undo snapshots
// studyLogs / studySessions / simuladoRows don't support undo and bloat RAM
const stripForUndo = (contestsObj) => {
    const stripped = {};
    for (const [key, contest] of Object.entries(contestsObj)) {
        stripped[key] = {
            ...contest,
            studyLogs: [],
            studySessions: [],
            simuladoRows: [],
        };
    }
    return stripped;
};

// Helper to handle gamification within the store
// This mimics the 'applyGamification' from the custom hook, but runs inside Zustand
const processGamification = (state, xpGained) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData || !activeData.user || xpGained === 0) return null;

    let currentXP = activeData.user.xp || 0;
    let currentLevel = activeData.user.level || 1;
    let newXP = Math.max(0, currentXP + xpGained);

    // --- ACHIEVEMENT SYSTEM ACTIVATION ---
    const currentAchievements = activeData.user.achievements || [];
    const { newlyUnlocked, xpGained: achievementXp } = checkAndUnlockAchievements(activeData, currentAchievements);

    if (newlyUnlocked.length > 0) {
        newXP += achievementXp;
        activeData.user.achievements = [...currentAchievements, ...newlyUnlocked];
    }

    // Recalculate level and check if user leveled up after all XP (base + achievements)
    const finalLevel = calculateLevel(newXP);
    const leveledUp = finalLevel > currentLevel;

    activeData.user.xp = newXP;
    activeData.user.level = finalLevel;

    if (leveledUp && typeof window !== 'undefined') {
        // Use a timeout or microtask to ensure the event is dispatched AFTER the store update is commit
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('level-up', {
                detail: {
                    level: finalLevel,
                    title: `Nível ${finalLevel} Desbloqueado!`,
                    xpGained: newXP - currentXP
                }
            }));
        }, 0);
    }

    return leveledUp ? finalLevel : null;
};

// Create the Zustand store with Immer for easy deep mutations
export const useAppStore = create(
    persist(
        immer((set) => ({
            // State
            appState: {
                contests: { 'default': INITIAL_DATA },
                activeId: 'default',
                history: [],
                mcEqualWeights: true,
                lastUpdated: "1970-01-01T00:00:00.000Z"
            },

            // --- Inner Helpers (Internal use only inside set) ---
            recordHistory: (state) => {
                const snapshot = JSON.parse(JSON.stringify(stripForUndo(state.appState.contests)));
                const activeId = state.appState.activeId;
                state.appState.history.push({ contests: snapshot, activeId });
                if (state.appState.history.length > 20) state.appState.history.shift();
            },

            // Actions
            undo: () => set((state) => {
                if (!state.appState.history || state.appState.history.length === 0) return;

                const snapshot = state.appState.history.pop();
                if (snapshot.contests) {
                    state.appState.contests = snapshot.contests;
                    state.appState.activeId = snapshot.activeId;
                }
                state.appState.lastUpdated = new Date().toISOString();
            }),

            setAppState: (newStateObj) => set((state) => {
                // Resolve the next state first before touching history
                const nextState = typeof newStateObj === 'function' ? newStateObj(state.appState) : newStateObj;

                // Safety check: ensure nextState has required structure before committing
                if (!nextState || !nextState.contests || !nextState.activeId) return;

                // Only record snapshot for undo after we know the update is valid
                // Fix 7: strip append-only arrays to keep undo stack lean
                const snapshot = JSON.parse(JSON.stringify(stripForUndo(state.appState.contests)));
                const activeId = state.appState.activeId;

                state.appState.history.push({
                    contests: snapshot,
                    activeId: activeId
                });

                if (state.appState.history.length > 10) state.appState.history.shift();

                // RESTORE ALL FIELDS (including mcEqualWeights and future fields)
                Object.keys(nextState).forEach(key => {
                    if (key !== 'history') {
                        state.appState[key] = nextState[key];
                    }
                });

                // Preserve history stack unless the import explicitly provides a new one
                if (nextState.history) state.appState.history = nextState.history;

                // IMPORTANT: Prioritize the timestamp from the incoming state (e.g. from cloud)
                state.appState.lastUpdated = nextState.lastUpdated ?? new Date().toISOString();

                console.log(`[Store] setAppState concluído. Contests: ${Object.keys(nextState.contests).length}, Active: ${nextState.activeId}`);
            }),

            setData: (newDataCallback) => set((state, get) => {
                const contestId = state.appState.activeId;
                const currentData = state.appState.contests[contestId];
                if (!currentData) return;

                // Record history using centralized helper
                get().recordHistory(state);

                // Allows updating only the active contest data
                if (typeof newDataCallback === 'function') {
                    const result = newDataCallback(currentData);
                    if (result !== undefined) {
                        state.appState.contests[contestId] = result;
                    }
                } else {
                    state.appState.contests[contestId] = newDataCallback;
                }

                state.appState.lastUpdated = (typeof newDataCallback === 'object' && newDataCallback?.lastUpdated)
                    || new Date().toISOString();
            }),

            // === Data Mutations (Immer makes this super clean) ===

            // 1. Gamification & Tasks
            toggleTask: (categoryId, taskId) => set((state, get) => {
                get().recordHistory(state);
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
                state.appState.lastUpdated = new Date().toISOString();
            }),

            addTask: (categoryId, title) => set((state, get) => {
                get().recordHistory(state);
                if (!title || typeof title !== 'string') return;
                const activeData = state.appState.contests[state.appState.activeId];
                const category = activeData.categories.find(c => c.id === categoryId);
                if (category) {
                    category.tasks.push({
                        id: generateId('task'),
                        text: title,
                        title,
                        completed: false,
                        priority: 'medium'
                    });
                }
                state.appState.lastUpdated = new Date().toISOString();
            }),

            awardExperience: (xpAmount) => set((state) => {
                processGamification(state, xpAmount);
                state.appState.lastUpdated = new Date().toISOString();
            }),

            deleteTask: (categoryId, taskId) => set((state, get) => {
                get().recordHistory(state);
                const activeData = state.appState.contests[state.appState.activeId];
                const category = activeData.categories.find(c => c.id === categoryId);
                if (category) {
                    category.tasks = category.tasks.filter(t => t.id !== taskId);
                }
                state.appState.lastUpdated = new Date().toISOString();
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
                state.appState.lastUpdated = new Date().toISOString();
            }),

            // 2. Categories
            addCategory: (name) => set((state, get) => {
                get().recordHistory(state);
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
                state.appState.lastUpdated = new Date().toISOString();
            }),

            deleteCategory: (id) => set((state, get) => {
                get().recordHistory(state);
                const activeData = state.appState.contests[state.appState.activeId];
                activeData.categories = activeData.categories.filter(c => c.id !== id);
                if (activeData.studyLogs) {
                    activeData.studyLogs = activeData.studyLogs.filter(l => l.categoryId !== id);
                }
                if (activeData.studySessions) {
                    activeData.studySessions = activeData.studySessions.filter(s => s.categoryId !== id);
                }
                state.appState.lastUpdated = new Date().toISOString();
            }),

            // 3. Pomodoro & Sessions
            handleUpdateStudyTime: (categoryId, minutes, taskId) => set((state, get) => {
                get().recordHistory(state);
                const now = new Date().toISOString();
                const activeData = state.appState.contests[state.appState.activeId];

                if (!activeData.studyLogs) activeData.studyLogs = [];
                if (!activeData.studySessions) activeData.studySessions = [];

                const logId = generateId('log');
                activeData.studyLogs.push({ id: logId, date: now, categoryId, taskId, minutes });
                activeData.studySessions.push({ id: logId, startTime: now, duration: minutes, categoryId, taskId });

                // Fix 1: cap arrays to prevent localStorage overflow
                if (activeData.studyLogs.length > LOG_CAP) {
                    activeData.studyLogs = activeData.studyLogs.slice(-LOG_CAP);
                }
                if (activeData.studySessions.length > SESSION_CAP) {
                    activeData.studySessions = activeData.studySessions.slice(-SESSION_CAP);
                }

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

                // Achievement tracking: Time of day
                const startHour = new Date(now).getHours();
                if (startHour < 7) activeData.user.studiedEarly = true;
                if (startHour >= 23 || startHour < 4) activeData.user.studiedLate = true;

                processGamification(state, baseXP + bonusXP);
                state.appState.lastUpdated = new Date().toISOString();
            }),

            deleteSession: (sessionId) => set((state, get) => {
                get().recordHistory(state);
                const activeData = state.appState.contests[state.appState.activeId];
                const sessionIndex = activeData.studySessions?.findIndex(s => s.id === sessionId);
                // Bug fix: returning `false` inside an Immer producer tells Immer to REPLACE
                // the entire store state with `false`, corrupting all data. Use plain `return` instead.
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
                state.appState.lastUpdated = new Date().toISOString();
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
                state.appState.lastUpdated = new Date().toISOString();
            }),

            setMcEqualWeights: (val) => set((state) => {
                state.appState.mcEqualWeights = val;
                state.appState.lastUpdated = new Date().toISOString();
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
                state.appState.lastUpdated = new Date().toISOString();
            }),

            resetSimuladoStats: () => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                activeData.categories.forEach(c => {
                    c.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
                });
                state.appState.lastUpdated = new Date().toISOString();
            }),

            deleteSimulado: (dateStr) => set((state, get) => {
                get().recordHistory(state);
                const targetDay = new Date(dateStr).toDateString();
                const activeData = state.appState.contests[state.appState.activeId];

                const matchesDate = (raw) => {
                    try { return new Date(raw).toDateString() === targetDay; }
                    catch { return false; }
                };

                if (activeData.simuladoRows) {
                    activeData.simuladoRows = activeData.simuladoRows.filter(r => !matchesDate(r.createdAt));
                }

                activeData.categories.forEach(c => {
                    if (c.simuladoStats?.history) {
                        c.simuladoStats.history = c.simuladoStats.history.filter(h => !matchesDate(h.date));
                    }
                });
                state.appState.lastUpdated = new Date().toISOString();
            }),

            // 5. User Settings & Management
            updatePomodoroSettings: (settings) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                activeData.settings = { ...(activeData.settings || {}), ...settings };
                state.appState.lastUpdated = new Date().toISOString();
            }),

            toggleDarkMode: () => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                if (!activeData.settings) activeData.settings = {};
                activeData.settings.darkMode = !activeData.settings.darkMode;
                state.appState.lastUpdated = new Date().toISOString();
            }),

            updateUserName: (name) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                if (!activeData.user) activeData.user = {};
                activeData.user.name = name;
                state.appState.lastUpdated = new Date().toISOString();
            }),

            // 6. Contests Management
            switchContest: (contestId) => set((state) => {
                state.appState.activeId = contestId;
                state.appState.lastUpdated = new Date().toISOString();
            }),

            createNewContest: () => set((state, get) => {
                get().recordHistory(state);
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
                state.appState.lastUpdated = new Date().toISOString();
            }),

            deleteContest: (contestId) => set((state, get) => {
                get().recordHistory(state);
                delete state.appState.contests[contestId];

                const remainingIds = Object.keys(state.appState.contests);
                if (remainingIds.length === 0) {
                    state.appState.contests['default'] = JSON.parse(JSON.stringify(INITIAL_DATA));
                    state.appState.activeId = 'default';
                } else if (contestId === state.appState.activeId) {
                    state.appState.activeId = remainingIds[0];
                }
                state.appState.lastUpdated = new Date().toISOString();
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
                const persisted = persistedState?.appState;
                const current = currentState.appState;

                // Sync Safeguard: If the persisted state is the default (1970 timestamp), 
                // we prefer the clean initialData from the code to avoid "ghost" overrides.
                const isDefaultState = persisted?.lastUpdated === "1970-01-01T00:00:00.000Z";
                if (!persisted || isDefaultState) {
                    return currentState;
                }

                const hasKeys = (obj) => obj && Object.keys(obj).length > 0;
                const contests = hasKeys(persisted.contests) ? persisted.contests : current.contests;
                let activeId = persisted.activeId || current.activeId;

                if (!contests[activeId]) {
                    activeId = Object.keys(contests)[0] || 'default';
                }

                return {
                    ...currentState,
                    appState: {
                        ...current,
                        ...persisted,
                        contests,
                        activeId,
                        // Ensure we carry forward history and other metadata
                        history: persisted.history || [],
                        lastUpdated: persisted.lastUpdated || current.lastUpdated
                    }
                };
            }
        }
    )
);

