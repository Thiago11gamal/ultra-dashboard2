import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { format, subDays, differenceInDays } from 'date-fns';
import { INITIAL_DATA } from '../data/initialData';
import { SYNC_LOG_CAP } from '../config';
import { XP_CONFIG, getTaskXP, calculateLevel } from '../utils/gamification';
import { generateId } from '../utils/idGenerator';
import { calculateStudyStreak } from '../utils/analytics';

const LOG_CAP = SYNC_LOG_CAP;
const SESSION_CAP = SYNC_LOG_CAP;

// --- INLINED GAMIFICATION LOGIC (Session 4 Cleanup) ---

// Removed redundant calculateBestStreak and calculateStreak - moved to analytics.js (BUG-L6)

const ACHIEVEMENTS = [
    { id: 'first_step', name: 'Primeiro Passo', icon: '🌟', xpReward: 100, condition: (s) => s.completedTasks >= 1 },
    { id: 'streak_3', name: 'Iniciante Consistente', icon: '🔥', xpReward: 150, condition: (s) => s.currentStreak >= 3 },
    { id: 'streak_7', name: 'Semana Invicta', icon: '🏆', xpReward: 350, condition: (s) => s.currentStreak >= 7 },
    { id: 'streak_30', name: 'Maratonista', icon: '👑', xpReward: 1000, condition: (s) => s.currentStreak >= 30 },
    { id: 'centurion', name: 'Centurião', icon: '💯', xpReward: 300, condition: (s) => s.totalQuestions >= 100 },
    { id: 'perfectionist', name: 'Perfeccionista', icon: '🎯', xpReward: 500, condition: (s) => s.hasPerfectScore },
    { id: 'pomodoro_10', name: 'Focado', icon: '⏱️', xpReward: 300, condition: (s) => s.pomodorosCompleted >= 10 },
    { id: 'early_bird', name: 'Madrugador', icon: '🌅', xpReward: 200, condition: (s) => s.studiedEarly },
    { id: 'night_owl', name: 'Coruja', icon: '🦉', xpReward: 200, condition: (s) => s.studiedLate },
];

const checkAndUnlockAchievements = (data, currentUnlocked = []) => {
    const stats = {
        completedTasks: data.categories?.reduce((sum, cat) => sum + (cat.tasks?.filter(t => t.completed)?.length || 0), 0) || 0,
        currentStreak: calculateStudyStreak(data.studyLogs || []).current,
        totalQuestions: data.categories?.reduce((sum, cat) => sum + (cat.simuladoStats?.history?.reduce((h, e) => h + (Number(e.total) || 0), 0) || 0), 0) || 0,
        hasPerfectScore: data.categories?.some(cat => cat.simuladoStats?.history?.some(h => h.score === 100 || (h.correct === h.total && h.total > 0))) || false,
        pomodorosCompleted: data.studySessions?.length || 0,
        studiedEarly: data.user?.studiedEarly || false,
        studiedLate: data.user?.studiedLate || false
    };
    const newlyUnlocked = [];
    ACHIEVEMENTS.forEach(ach => {
        const isUnlocked = currentUnlocked.some(u => (typeof u === 'string' ? u : u.id) === ach.id);
        if (!isUnlocked && ach.condition(stats)) newlyUnlocked.push(ach.id);
    });
    return { newlyUnlocked, xpGained: newlyUnlocked.reduce((sum, id) => sum + (ACHIEVEMENTS.find(a => a.id === id)?.xpReward || 0), 0) };
};

// --- STORE HELPERS ---

const stripForUndo = (contestsObj) => {
    // Audit P1 Fix: Stop stripping arrays that don't have another persistence source.
    // The history cap of 20 snapshots already prevents catastrophic memory leaks.
    return JSON.parse(JSON.stringify(contestsObj));
};

const HISTORY_COOLDOWN = 1000; // Only record history once per second for rapid UI actions

const recordHistory = (appState, force = false) => {
    const now = Date.now();
    const lastTime = appState.lastHistoryTime || 0;
    if (!force && (now - lastTime < HISTORY_COOLDOWN)) return;

    if (appState.history.length >= 20) {
        appState.history.shift();
    }
    const snapshot = JSON.parse(JSON.stringify(stripForUndo(appState.contests)));
    appState.history.push({ contests: snapshot, activeId: appState.activeId });
    appState.lastHistoryTime = now;
};

const processGamification = (state, xpGained) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData || !activeData.user) return null;

    let currentXP = activeData.user.xp || 0;
    let currentLevel = activeData.user.level || 1;
    let newXP = Math.max(0, currentXP + xpGained);

    const currentAchievements = activeData.user.achievements || [];
    const { newlyUnlocked, xpGained: achievementXp } = checkAndUnlockAchievements(activeData, currentAchievements);

    if (newlyUnlocked.length > 0) {
        newXP += achievementXp;
        activeData.user.achievements = [...currentAchievements, ...newlyUnlocked];
    }

    const finalLevel = calculateLevel(newXP);
    const leveledUp = finalLevel > currentLevel;

    activeData.user.xp = newXP;
    activeData.user.level = finalLevel;

    if (leveledUp && typeof window !== 'undefined') {
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

export const useAppStore = create(
    persist(
        immer((set) => ({
            appState: {
                contests: { 'default': INITIAL_DATA },
                activeId: 'default',
                history: [],
                lastHistoryTime: 0,
                mcEqualWeights: true,
                lastUpdated: "1970-01-01T00:00:00.000Z"
            },

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
                const nextState = typeof newStateObj === 'function' ? newStateObj(state.appState) : newStateObj;
                if (!nextState || !nextState.contests || !nextState.activeId) return;

                recordHistory(state.appState);

                Object.keys(nextState).forEach(key => {
                    if (key !== 'history') {
                        state.appState[key] = nextState[key];
                    }
                });

                if (nextState.history && nextState.history.length > 0) {
                    state.appState.history = nextState.history;
                }
                state.appState.lastUpdated = nextState.lastUpdated ?? new Date().toISOString();
            }),

            setData: (newDataCallback, shouldRecordHistory = true) => set((state) => {
                const contestId = state.appState.activeId;
                const currentData = state.appState.contests[contestId];
                if (!currentData) return;

                if (shouldRecordHistory) {
                    recordHistory(state.appState);
                }

                const nextData = typeof newDataCallback === 'function'
                    ? newDataCallback(currentData)
                    : newDataCallback;

                if (nextData === undefined) return;

                state.appState.contests[contestId] = nextData;
                state.appState.lastUpdated = nextData?.lastUpdated || new Date().toISOString();
            }),

            toggleTask: (categoryId, taskId) => set((state) => {
                recordHistory(state.appState);
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
                if (completed) task.lastStudiedAt = new Date().toISOString();

                processGamification(state, xpChange);
                state.appState.lastUpdated = new Date().toISOString();
            }),

            addTask: (categoryId, title) => set((state) => {
                const trimmedTitle = typeof title === 'string' ? title.trim() : '';
                if (!trimmedTitle) return;

                recordHistory(state.appState);
                const activeData = state.appState.contests[state.appState.activeId];
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
                state.appState.lastUpdated = new Date().toISOString();
            }),

            awardExperience: (xpAmount) => set((state) => {
                recordHistory(state.appState);
                processGamification(state, xpAmount);
                state.appState.lastUpdated = new Date().toISOString();
            }),

            deleteTask: (categoryId, taskId) => set((state) => {
                recordHistory(state.appState);
                const activeData = state.appState.contests[state.appState.activeId];
                const category = activeData.categories.find(c => c.id === categoryId);
                if (category) {
                    category.tasks = category.tasks.filter(t => t.id !== taskId);
                }
                state.appState.lastUpdated = new Date().toISOString();
            }),

            togglePriority: (categoryId, taskId) => set((state) => {
                recordHistory(state.appState);
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

            addCategory: (name) => set((state) => {
                recordHistory(state.appState);
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

            deleteCategory: (id) => set((state) => {
                recordHistory(state.appState);
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

            handleUpdateStudyTime: (categoryId, minutes, taskId) => set((state) => {
                recordHistory(state.appState);
                const now = new Date().toISOString();
                const activeData = state.appState.contests[state.appState.activeId];

                if (!activeData.studyLogs) activeData.studyLogs = [];
                if (!activeData.studySessions) activeData.studySessions = [];

                const logId = generateId('log');
                activeData.studyLogs.push({ id: logId, date: now, categoryId, taskId, minutes });
                activeData.studySessions.push({ id: logId, startTime: now, duration: minutes, categoryId, taskId });

                if (activeData.studyLogs.length > LOG_CAP) activeData.studyLogs = activeData.studyLogs.slice(-LOG_CAP);
                if (activeData.studySessions.length > SESSION_CAP) activeData.studySessions = activeData.studySessions.slice(-SESSION_CAP);

                const category = activeData.categories.find(c => c.id === categoryId);
                if (category) {
                    category.totalMinutes = (category.totalMinutes || 0) + minutes;
                    category.lastStudiedAt = now;
                    if (taskId) {
                        const task = category.tasks.find(t => t.id === taskId);
                        if (task) task.lastStudiedAt = now;
                    }
                }

                const baseXP = XP_CONFIG.pomodoro.base;
                const bonusXP = taskId ? XP_CONFIG.pomodoro.bonusWithTask : 0;
                const startHour = new Date(now).getHours();
                if (activeData.user) {
                    // BUG-L5: These flags are permanent achievement toggles.
                    // Once set to true, they unlock the respective achievement and remain true
                    // to track that the user has performed this habit at least once.
                    if (startHour >= 4 && startHour < 7) activeData.user.studiedEarly = true;
                    if (startHour >= 23 || startHour < 4) activeData.user.studiedLate = true;
                }

                processGamification(state, baseXP + bonusXP);
                state.appState.lastUpdated = new Date().toISOString();
            }),

            deleteSession: (sessionId) => set((state) => {
                recordHistory(state.appState);
                const activeData = state.appState.contests[state.appState.activeId];
                const sessionIndex = activeData.studySessions?.findIndex(s => s.id === sessionId);
                if (sessionIndex === -1 || sessionIndex === undefined) return;

                const session = activeData.studySessions[sessionIndex];
                const category = activeData.categories.find(c => c.id === session.categoryId);
                if (category) {
                    category.totalMinutes = Math.max(0, (category.totalMinutes || 0) - (session.duration || 0));
                }

                activeData.studySessions.splice(sessionIndex, 1);
                if (activeData.studyLogs) {
                    activeData.studyLogs = activeData.studyLogs.filter(l => l.id !== session.id);
                }
                state.appState.lastUpdated = new Date().toISOString();
            }),

            setMonteCarloWeights: (weights) => set((state) => {
                const activeId = state.appState.activeId;
                const activeData = state.appState.contests[activeId];
                if (!activeData || !weights) return;

                activeData.mcWeights = weights;
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
                const activeId = state.appState.activeId;
                const activeData = state.appState.contests[activeId];
                if (!activeData || !activeData.categories || !weights) return;

                activeData.categories.forEach(cat => {
                    if (weights[cat.name] !== undefined) {
                        cat.weight = weights[cat.name];
                    }
                });

                activeData.mcWeights = { ...(activeData.mcWeights || {}), ...weights };
                state.appState.lastUpdated = new Date().toISOString();
            }),

            resetSimuladoStats: () => set((state) => {
                recordHistory(state.appState, true);
                const activeData = state.appState.contests[state.appState.activeId];
                activeData.categories.forEach(c => {
                    c.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
                });
                state.appState.lastUpdated = new Date().toISOString();
            }),

            deleteSimulado: (dateStr) => set((state) => {
                recordHistory(state.appState, true);
                const targetDay = dateStr.slice(0, 10);
                const activeData = state.appState.contests[state.appState.activeId];
                const matchesDate = (raw) => {
                    if (!raw) return false;
                    const iso = typeof raw === 'string' ? raw : new Date(raw).toISOString();
                    return iso.slice(0, 10) === targetDay;
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

            updatePomodoroSettings: (settings) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                activeData.settings = { ...(activeData.settings || {}), ...settings };
                state.appState.lastUpdated = new Date().toISOString();
            }),

            toggleDarkMode: () => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                if (!activeData) return;
                if (!activeData.settings) activeData.settings = {};
                // Garantir que a lógica de inversão considere o padrão 'true' (dark)
                const isCurrentlyDark = activeData.settings.darkMode !== false;
                activeData.settings.darkMode = !isCurrentlyDark;
                state.appState.lastUpdated = new Date().toISOString();
            }),

            updateUserName: (name) => set((state) => {
                const activeData = state.appState.contests[state.appState.activeId];
                if (!activeData.user) activeData.user = {};
                activeData.user.name = name;
                state.appState.lastUpdated = new Date().toISOString();
            }),

            switchContest: (contestId) => set((state) => {
                state.appState.activeId = contestId;
                state.appState.lastUpdated = new Date().toISOString();
            }),

            createNewContest: () => set((state) => {
                recordHistory(state.appState);
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

            deleteContest: (contestId) => set((state) => {
                recordHistory(state.appState);
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
            version: 1,
            storage: createJSONStorage(() => ({
                getItem: (name) => localStorage.getItem(name),
                setItem: (name, value) => {
                    try {
                        localStorage.setItem(name, value);
                    } catch (e) {
                        if (e.name === 'QuotaExceededError' || e.code === 22) {
                            try {
                                const state = JSON.parse(value);
                                if (state.state?.appState) {
                                    state.state.appState.history = [];
                                    localStorage.setItem(name, JSON.stringify(state));
                                    window.dispatchEvent(new CustomEvent('storage-quota-reached'));
                                }
                            } catch (error) {
                                console.error('Auto-pruning failed:', error);
                            }
                        } else throw e;
                    }
                },
                removeItem: (name) => localStorage.removeItem(name)
            })),
            partialize: (state) => ({ appState: state.appState }),
            merge: (persistedState, currentState) => {
                const persisted = persistedState?.appState;
                const current = currentState.appState;
                const isDefaultState = persisted?.lastUpdated === "1970-01-01T00:00:00.000Z";
                if (!persisted || isDefaultState) return currentState;
                const hasKeys = (obj) => obj && Object.keys(obj).length > 0;
                const contests = hasKeys(persisted.contests) ? persisted.contests : current.contests;
                let activeId = persisted.activeId || current.activeId;
                if (!contests[activeId]) activeId = Object.keys(contests)[0] || 'default';
                return {
                    ...currentState,
                    appState: {
                        ...current,
                        ...persisted,
                        contests,
                        activeId,
                        history: persisted.history || [],
                        lastUpdated: persisted.lastUpdated || current.lastUpdated
                    }
                };
            }
        }
    )
);
