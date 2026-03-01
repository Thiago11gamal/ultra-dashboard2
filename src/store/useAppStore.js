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
                mcEqualWeights: true
            },

            // Actions
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

                state.appState.contests = nextState.contests;
                state.appState.activeId = nextState.activeId;
                // Preserve history stack unless the import explicitly provides a new one
                if (nextState.history) state.appState.history = nextState.history;
            }),

            setData: (newDataCallback) => set((state) => {
                const contestId = state.appState.activeId;
                const currentData = state.appState.contests[contestId];
                if (!currentData) return;

                // Record snapshot for undo — Fix 7: exclude append-only arrays
                const { studyLogs: _sl, studySessions: _ss, simuladoRows: _sr, ...coreData } = currentData;
                const snapshot = JSON.parse(JSON.stringify(coreData));
                state.appState.history.push({ data: snapshot, contestId });
                if (state.appState.history.length > 10) state.appState.history.shift();

                // Allows updating only the active contest data
                if (typeof newDataCallback === 'function') {
                    const result = newDataCallback(currentData);
                    // If the callback returns a new object, use it. 
                    // If it returns nothing (undefined), we assume it mutated the 'currentData' proxy (Immer).
                    if (result !== undefined) {
                        state.appState.contests[contestId] = result;
                    }
                } else {
                    state.appState.contests[contestId] = newDataCallback;
                }
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
                        // Bug fix: coachLogic, analytics, and all task UI components read task.text,
                        // but this was storing as task.title — new tasks were invisible to AI Coach
                        text: title,
                        title, // kept for backward compatibility with any legacy readers
                        completed: false,
                        priority: 'medium'
                    });
                }
            }),

            awardExperience: (xpAmount) => set((state) => {
                processGamification(state, xpAmount);
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
                processGamification(state, baseXP + bonusXP);
            }),

            deleteSession: (sessionId) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                const sessionIndex = activeData.studySessions?.findIndex(s => s.id === sessionId);
                if (sessionIndex === -1 || sessionIndex === undefined) return false;

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

            setMcEqualWeights: (val) => set((state) => {
                state.appState.mcEqualWeights = val;
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
                const targetDate = new Date(dateStr).toISOString().split('T')[0];
                const activeData = state.appState.contests[state.appState.activeId];

                const matchesDate = (raw) => {
                    try { return new Date(raw).toISOString().split('T')[0] === targetDate; }
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

                const persisted = persistedState.appState;
                const current = currentState.appState;

                // Helper to check if object has meaningful content
                const hasKeys = (obj) => obj && Object.keys(obj).length > 0;

                const contests = hasKeys(persisted.contests) ? persisted.contests : current.contests;
                let activeId = persisted.activeId || current.activeId;

                // Safety: If activeId doesn't exist in contests, fall back to first available or default
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
                        history: persisted.history || current.history,
                        mcEqualWeights: persisted.mcEqualWeights !== undefined ? persisted.mcEqualWeights : current.mcEqualWeights
                    }
                };
            }
        }
    )
);
