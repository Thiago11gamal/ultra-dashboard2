import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { format, subDays, differenceInDays } from 'date-fns';
import { INITIAL_DATA } from '../data/initialData';
import { SYNC_LOG_CAP } from '../config';
import { XP_CONFIG, getTaskXP, calculateLevel } from '../utils/gamification';
import { generateId } from '../utils/idGenerator';
import { calculateStudyStreak } from '../utils/analytics';
import { validateAppState } from './schemas';

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
    const snapshot = stripForUndo(appState.contests);
    appState.history.push({ contests: snapshot, activeId: appState.activeId });
    appState.lastHistoryTime = now;
};

// Returns the level-up event detail (or null) so callers can dispatch it
// OUTSIDE the Immer producer, preventing double-fire in React 18 Strict Mode.
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

    // Bug #12: XP floor for level preservation
    // If the system prevents level regression (Math.max below), 
    // we must also ensure XP doesn't drop below that level's floor.
    activeData.user.level = Math.max(currentLevel, finalLevel);
    const minXpForCurrentLevel = Math.pow(activeData.user.level - 1, 2) * 100;
    activeData.user.xp = Math.max(newXP, minXpForCurrentLevel);

    // ✅ No side effects here — return the event detail for the caller to dispatch
    // after set() completes (outside the Immer draft).
    if (leveledUp) {
        let title;
        if (finalLevel - currentLevel > 1) {
            title = `Níveis ${currentLevel + 1} a ${finalLevel} Desbloqueados!`;
        } else {
            title = `Nível ${finalLevel} Desbloqueado!`;
        }
        return { level: finalLevel, title, xpGained: newXP - currentXP };
    }
    return null;
};

// Dispatches a level-up CustomEvent after the Immer producer has committed.
// queueMicrotask fires after the current synchronous task but before the next
// macrotask — safe from Strict Mode's double-invocation of the producer.
const dispatchLevelUp = (detail) => {
    if (!detail || typeof window === 'undefined') return;
    queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('level-up', { detail }));
    });
};

export const useAppStore = create(
    persist(
        immer((set) => ({
            appState: {
                contests: { 'default': INITIAL_DATA },
                activeId: 'default',
                history: [],
                lastHistoryTime: 0,
                version: 0,
                mcEqualWeights: true,
                hasSeenTour: false,
                coachPlanner: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
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

            setHasSeenTour: (value) => set((state) => {
                state.appState.hasSeenTour = value;
                state.appState.lastUpdated = new Date().toISOString();
            }),

            updateCoachPlanner: (newPlannerData) => set((state) => {
                state.appState.coachPlanner = newPlannerData;
                state.appState.lastUpdated = new Date().toISOString();
            }),

            setAppState: (newStateObj) => set((state) => {
                let nextState = typeof newStateObj === 'function' ? newStateObj(state.appState) : newStateObj;
                if (!nextState) return;

                // A mágica da migração acontece aqui para dados externos (ex: Firebase)
                nextState = validateAppState(nextState);

                recordHistory(state.appState);

                Object.keys(nextState).forEach(key => {
                    if (key !== 'history') {
                        state.appState[key] = nextState[key];
                    }
                });

                if (nextState.history && nextState.history.length > 0) {
                    state.appState.history = nextState.history;
                }
                
                state.appState.lastHistoryTime = 0;
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

                if (nextData === undefined) {
                    // CRASH-2: The callback mutated currentData through Immer's draft.
                    // We must update the metadata so the sync logic detects a change.
                    state.appState.version = (state.appState.version || 0) + 1;
                    state.appState.lastUpdated = new Date().toISOString();
                    return;
                }

                state.appState.contests[contestId] = nextData;
                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = nextData?.lastUpdated || new Date().toISOString();
            }),

            toggleTask: (categoryId, taskId) => {
                let levelUpDetail = null;
                set((state) => {
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

                    levelUpDetail = processGamification(state, xpChange);
                    state.appState.lastUpdated = new Date().toISOString();
                });
                dispatchLevelUp(levelUpDetail);
            },

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

            awardExperience: (xpAmount) => {
                let levelUpDetail = null;
                set((state) => {
                    recordHistory(state.appState);
                    levelUpDetail = processGamification(state, xpAmount);
                    state.appState.lastUpdated = new Date().toISOString();
                });
                dispatchLevelUp(levelUpDetail);
            },

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
                // BUG-06 FIX: Add guard to ensure categories is a valid array
                if (!activeData || !Array.isArray(activeData.categories)) return;
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
                // BUG-06 FIX: Add guard to ensure categories is a valid array
                if (!activeData || !Array.isArray(activeData.categories)) return;
                
                const category = activeData.categories.find(c => c.id === id);
                if (category) {
                    if (!state.appState.trash) state.appState.trash = [];
                    state.appState.trash.push({
                        id: generateId('trash'),
                        type: 'category',
                        contestId: state.appState.activeId,
                        data: JSON.parse(JSON.stringify(category)),
                        deletedAt: new Date().toISOString()
                    });
                }

                const name = category?.name;

                activeData.categories = activeData.categories.filter(c => c.id !== id);
                
                // Bug #7: Memory Leak Cleanup
                if (activeData.mcWeights && activeData.mcWeights[id]) {
                    delete activeData.mcWeights[id];
                }
                // Fallback for legacy name-based weights if any
                if (name && activeData.mcWeights && activeData.mcWeights[name]) {
                    delete activeData.mcWeights[name];
                }

                if (activeData.studyLogs) {
                    activeData.studyLogs = activeData.studyLogs.filter(l => l.categoryId !== id);
                }
                if (activeData.studySessions) {
                    activeData.studySessions = activeData.studySessions.filter(s => s.categoryId !== id);
                }
                state.appState.lastUpdated = new Date().toISOString();
            }),

            handleUpdateStudyTime: (categoryId, minutes, taskId) => {
                let levelUpDetail = null;
                set((state) => {
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

                    levelUpDetail = processGamification(state, baseXP + bonusXP);
                    state.appState.lastUpdated = new Date().toISOString();
                });
                dispatchLevelUp(levelUpDetail);
            },

            deleteSession: (sessionId) => set((state) => {
                recordHistory(state.appState);
                const activeData = state.appState.contests[state.appState.activeId];
                // B-04 FIX: optional chaining não protege contra null (só undefined).
                // Guard explícito evita TypeError se studySessions for null.
                if (!activeData.studySessions) return;
                const sessionIndex = activeData.studySessions.findIndex(s => s.id === sessionId);
                if (sessionIndex === -1) return;

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
                        // Preferir id como chave estável; fallback para name (retrocompatibilidade)
                        if (weights[cat.id] !== undefined) {
                            cat.weight = weights[cat.id];
                        } else if (weights[cat.name] !== undefined) {
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
                    if (weights[cat.id] !== undefined) {
                        cat.weight = weights[cat.id];
                    } else if (weights[cat.name] !== undefined) {
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

            deleteSimulado: (dateInput) => set((state) => {
                recordHistory(state.appState, true); // ← LINHA RESTAURADA

                const dt = new Date(dateInput);
                const targetDay = dt.getFullYear() + '-' +
                    String(dt.getMonth() + 1).padStart(2, '0') + '-' +
                    String(dt.getDate()).padStart(2, '0'); // ← hora local

                const activeData = state.appState.contests[state.appState.activeId];
                
                // Bug #5: Consistency fix using local time methods for UI-storage parity.
                const matchesDate = (raw) => {
                    if (!raw) return false;
                    const d = new Date(raw);
                    if (isNaN(d.getTime())) return false;
                    const day = d.getFullYear() + '-' +
                        String(d.getMonth() + 1).padStart(2, '0') + '-' +
                        String(d.getDate()).padStart(2, '0'); // ← hora local
                    return day === targetDay;
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
                // B-16 FIX: Initial undefined resolves logically without double-clicking requirement
                const currentVal = activeData.settings.darkMode;
                activeData.settings.darkMode = currentVal === undefined ? false : !currentVal;
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
                    simuladoRows: [],
                    simulados: [],
                    categories: [],
                    mcWeights: {} // Bug #6: Initialize fresh Monte Carlo weights
                };
                state.appState.contests[newId] = newContestData;
                state.appState.activeId = newId;
                state.appState.lastUpdated = new Date().toISOString();
            }),

            deleteContest: (contestId) => set((state) => {
                recordHistory(state.appState);
                const contestData = state.appState.contests[contestId];
                if (contestData) {
                    if (!state.appState.trash) state.appState.trash = [];
                    state.appState.trash.push({
                        id: generateId('trash'),
                        type: 'contest',
                        contestId: contestId,
                        data: JSON.parse(JSON.stringify(contestData)),
                        deletedAt: new Date().toISOString()
                    });
                }

                delete state.appState.contests[contestId];
                const remainingIds = Object.keys(state.appState.contests);
                if (remainingIds.length === 0) {
                    state.appState.contests['default'] = JSON.parse(JSON.stringify(INITIAL_DATA));
                    state.appState.activeId = 'default';
                } else if (contestId === state.appState.activeId) {
                    state.appState.activeId = remainingIds[0];
                }
                state.appState.lastUpdated = new Date().toISOString();
            }),

            restoreFromTrash: (trashId) => set((state) => {
                if (!state.appState.trash) return;
                const index = state.appState.trash.findIndex(t => t.id === trashId);
                if (index === -1) return;
                
                recordHistory(state.appState);
                const item = state.appState.trash[index];
                
                if (item.type === 'category') {
                    // Restore to its original contest if it still exists, else active
                    const targetContestId = state.appState.contests[item.contestId] ? item.contestId : state.appState.activeId;
                    const contest = state.appState.contests[targetContestId];
                    if (contest) {
                        if (!contest.categories) contest.categories = [];
                        // Check if ID already exists, if so generate a new one
                        if (contest.categories.some(c => c.id === item.data.id)) {
                            item.data.id = generateId('cat');
                        }
                        contest.categories.push(item.data);
                    }
                } else if (item.type === 'contest') {
                    let newId = item.contestId;
                    if (state.appState.contests[newId]) {
                        newId = generateId('contest');
                    }
                    state.appState.contests[newId] = item.data;
                    state.appState.activeId = newId;
                }
                
                state.appState.trash.splice(index, 1);
                state.appState.lastUpdated = new Date().toISOString();
            }),

            emptyTrash: () => set((state) => {
                state.appState.trash = [];
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
            partialize: (state) => {
                // BUG-08 FIX: Exclude history from persistence to prevent QuotaExceededError. 
                // History should live only in RAM.
                const { history, ...restOfAppState } = state.appState;
                return { appState: restOfAppState };
            },
            merge: (persistedState, currentState) => {
                const persisted = persistedState?.appState;
                const current = currentState.appState;

                // Se houver dados persistidos, fazemos o merge básico primeiro
                let baseState = persisted || current;
                
                if (persisted && persisted.lastUpdated !== "1970-01-01T00:00:00.000Z") {
                    const hasKeys = (obj) => obj && Object.keys(obj).length > 0;
                    const contests = hasKeys(persisted.contests) ? persisted.contests : current.contests;
                    let activeId = persisted.activeId || current.activeId;
                    if (!contests[activeId]) activeId = Object.keys(contests)[0] || 'default';
                    
                    baseState = {
                        ...current,
                        ...persisted,
                        contests,
                        activeId,
                        history: persisted.history || [],
                        lastUpdated: persisted.lastUpdated || current.lastUpdated
                    };
                }

                // A mágica acontece aqui: validateAppState fará a migração se baseState for o inicial
                return {
                    ...currentState,
                    appState: validateAppState(baseState)
                };
            }
        }
    )
);
