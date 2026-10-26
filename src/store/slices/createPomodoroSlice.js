import { cleanTaskTitle } from '../../utils/taskTitleHelper.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { safeArray, MAX_TARGET_CYCLES } from '../../utils/pomodoroHelpers.js';

const clearPomodoroStorage = () => {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('pomodoroState');
            localStorage.removeItem('pomodoro-endsAt');
        }
    } catch { /* ignore */ }
};

const extractCategoryFromTask = (task) => {
    if (!task) return 'Geral';

    if (task.catName) return task.catName;
    if (task.category) return task.category;

    const t = task.text || task.title || '';
    const idx = t.indexOf(':');

    if (idx > -1) {
        const cat = t.substring(0, idx).trim();
        return cat || 'Geral';
    }

    return 'Geral';
};

const formatTaskName = (task) => {
    const rawName = task?.text || task?.title || '';
    const cat = extractCategoryFromTask(task);

    // BUG-07 FIX: Fallback para task sem nome — evita Pomodoro com timer sem contexto
    return cleanTaskTitle(rawName, cat) || cat || 'Sessão de Estudo';
};

export const createPomodoroSlice = (set, get) => ({
    resetPomodoroProgress: () => {
        set((state) => {
            const p = state.appState?.pomodoro;

            if (!p) return;

            p.accumulatedMinutes = 0;
            p.completedCycles = 0;
            p.mode = 'work';
            p.isRunning = false;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroRunning: (isRunning) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.isRunning = Boolean(isRunning);
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroActiveSubject: (subject) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;

            if (!subject) {
                clearPomodoroStorage();
                p.sessions = 1;
                p.completedCycles = 0;
                p.mode = 'work';
                p.accumulatedMinutes = 0;
                p.activeSubject = null;
                p.neuralMode = false;
                p.neuralQueue = [];
                p.isRunning = false;

                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
                markStorageDirty();
                return;
            }

            const current = p.activeSubject;

            const isNewSession =
                !current ||
                !subject.sessionInstanceId ||
                current.sessionInstanceId !== subject.sessionInstanceId;

            if (isNewSession) {
                clearPomodoroStorage();
                p.sessions = 1;
                p.completedCycles = 0;
                p.mode = 'work';
                p.accumulatedMinutes = 0;
                p.isRunning = false;
            }

            if (subject.source !== 'neural_core') {
                p.neuralMode = false;
                p.neuralQueue = [];
            }

            p.activeSubject = subject;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    startPomodoroSession: (subject) => {
        get().setPomodoroActiveSubject({
            ...subject,
            sessionInstanceId: Date.now().toString()
        });
    },

    setPomodoroSessions: (count) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.sessions = Math.max(1, Number(count) || 1);

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroTargetCycles: (target) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            const normalizedTarget = Math.min(
                MAX_TARGET_CYCLES,
                Math.max(1, Number(target) || 1)
            );

            p.targetCycles = normalizedTarget;
            p.completedCycles = Math.min(normalizedTarget, Math.max(0, p.completedCycles || 0));

            if (p.mode === 'work' && p.completedCycles >= normalizedTarget) {
                p.completedCycles = Math.max(0, normalizedTarget - 1);
            }

            p.sessions = Math.min(normalizedTarget, Math.max(1, p.sessions || 1));

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroCompletedCycles: (completed) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;

            const targetCycles = Math.min(
                MAX_TARGET_CYCLES,
                Math.max(1, Number(p.targetCycles) || 1)
            );

            let newCompleted = Math.min(
                targetCycles,
                Math.max(0, Number(completed) || 0)
            );

            if (p.mode === 'work' && newCompleted >= targetCycles) {
                newCompleted = Math.max(0, targetCycles - 1);
            }

            p.completedCycles = newCompleted;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroMode: (mode) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.mode = mode;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    updatePomodoroSettings: (settings) => {
        set((state) => {
            const activeId = state.appState?.activeId;
            const activeData = state.appState?.contests?.[activeId];

            if (!activeData) return;

            const isIdentical =
                JSON.stringify(activeData.settings || {}) ===
                JSON.stringify({ ...(activeData.settings || {}), ...settings });

            if (isIdentical) return;

            activeData.settings = {
                ...(activeData.settings || {}),
                ...settings
            };

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroAccumulatedMinutes: (minutes) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.accumulatedMinutes = Math.max(0, Number(minutes) || 0);

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    completePomodoroPhase: (isManual = false, manualMinutes = 0) => {
        let savedMinutes = 0;

        set((state) => {
            const p = state.appState?.pomodoro;

            if (!p) return;

            const activeId = state.appState?.activeId;
            const settings = state.appState?.contests?.[activeId]?.settings || {
                pomodoroWork: 25,
                pomodoroBreak: 5
            };

            const workDuration = Number(settings.pomodoroWork) || 25;
            const targetCycles = Math.min(
                MAX_TARGET_CYCLES,
                Math.max(1, Number(p.targetCycles) || 1)
            );

            if (p.mode === 'work') {
                if (!isManual) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + workDuration;
                    savedMinutes = p.accumulatedMinutes;
                } else if (manualMinutes > 0) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + manualMinutes;
                    savedMinutes = p.accumulatedMinutes;
                }

                const currentCycles = Math.min(
                    targetCycles,
                    (p.completedCycles || 0) + 1
                );

                p.completedCycles = currentCycles;

                if (currentCycles >= targetCycles) {
                    // G-18 FIX: Salvar lastCompletedSeriesMinutes ANTES de zerar
                    p.lastCompletedSeriesMinutes = p.accumulatedMinutes || 0;
                    p.sessions = 1;
                    p.mode = 'work';
                    p.completedCycles = 0;
                    // G-18 FIX: Zerar accumulatedMinutes DEPOIS que
                    // onFullCycleComplete leu o valor.
                    // O caller deve ler lastCompletedSeriesMinutes.
                    p.accumulatedMinutes = 0;
                } else {
                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak = currentCycles % longBreakAfter === 0;

                    p.mode = isLongBreak ? 'long_break' : 'break';
                }
            } else {
                if (p.sessions >= targetCycles || p.completedCycles === 0) {
                    p.sessions = 1;
                    p.completedCycles = 0;
                    p.accumulatedMinutes = 0;
                } else {
                    p.sessions = Math.max(1, (p.sessions || 1) + 1);
                }

                p.mode = 'work';
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });

        return savedMinutes;
    },

    rewindPomodoroPhase: () => {
        set((state) => {
            const p = state.appState?.pomodoro;

            if (!p) return;

            const activeId = state.appState?.activeId;
            const settings = state.appState?.contests?.[activeId]?.settings || {};
            const workDuration = Number(settings.pomodoroWork) || 25;

            if (p.mode === 'break' || p.mode === 'long_break') {
                p.mode = 'work';
                p.completedCycles = Math.max(0, (p.completedCycles || 0) - 1);
                p.accumulatedMinutes = Math.max(
                    0,
                    (p.accumulatedMinutes || 0) - workDuration
                );
            } else if (p.sessions > 1) {
                const longBreakAfter = settings.longBreakAfter || 4;
                const completedCycles = p.completedCycles || 0;

                p.sessions = Math.max(1, p.sessions - 1);
                p.mode =
                    completedCycles > 0 && completedCycles % longBreakAfter === 0
                        ? 'long_break'
                        : 'break';
            } else if (p.completedCycles > 0) {
                p.completedCycles = Math.max(0, p.completedCycles - 1);
                p.accumulatedMinutes = Math.max(
                    0,
                    (p.accumulatedMinutes || 0) - workDuration
                );

                if ((p.targetCycles || 1) === 1) {
                    p.sessions = 1;
                    p.mode = 'work';
                } else {
                    p.sessions = p.targetCycles || 1;

                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak =
                        (p.completedCycles + 1) % longBreakAfter === 0;

                    p.mode = isLongBreak ? 'long_break' : 'break';
                }
            } else {
                p.mode = 'work';
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    syncPomodoroState: (payload) => {
        set((state) => {
            const p = state.appState?.pomodoro;

            if (!p) return;

            if (payload.mode !== undefined) {
                p.mode = payload.mode;
            }

            if (payload.targetCycles !== undefined) {
                p.targetCycles = Math.min(
                    MAX_TARGET_CYCLES,
                    Math.max(1, Number(payload.targetCycles) || 1)
                );
            }

            if (payload.sessions !== undefined) {
                p.sessions = Math.min(
                    Math.max(1, Number(payload.sessions) || 1),
                    Math.max(1, Number(p.targetCycles) || 1)
                );
            }

            if (payload.completedCycles !== undefined) {
                p.completedCycles = Math.min(
                    p.targetCycles || 1,
                    Math.max(0, Number(payload.completedCycles) || 0)
                );

                if (
                    p.mode === 'work' &&
                    p.completedCycles >= (p.targetCycles || 1)
                ) {
                    p.completedCycles = Math.max(0, (p.targetCycles || 1) - 1);
                }
            }

            if (payload.accumulatedMinutes !== undefined) {
                p.accumulatedMinutes = Math.max(
                    0,
                    Number(payload.accumulatedMinutes) || 0
                );
            }

            if (payload.neuralMode !== undefined) {
                p.neuralMode = payload.neuralMode;
            }

            if (payload.isRunning !== undefined) {
                p.isRunning = Boolean(payload.isRunning);
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    startNeuralSession: (tasks, startIndex = 0) => {
        const safeTasks = safeArray(tasks);
        if (!safeTasks || safeTasks.length === 0) return;

        clearPomodoroStorage();

        const task = safeTasks[startIndex] || safeTasks[0];

        const subject = {
            taskId: task.id || task.text || task.title,
            task: formatTaskName(task),
            category: extractCategoryFromTask(task),
            categoryId: task.categoryId || task.catId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.activeSubject = subject;
            p.neuralQueue = safeTasks;
            p.neuralMode = true;
            p.mode = 'work';
            p.isRunning = false;
            p.targetCycles = 1;
            p.sessions = 1;
            p.completedCycles = 0;
            p.accumulatedMinutes = 0;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    advanceNeuralQueue: () => {
        const pState = get().appState?.pomodoro;
        if (!pState) return false;
        const { neuralQueue, activeSubject } = pState;

        if (!neuralQueue || neuralQueue.length === 0) return false;
        if (!activeSubject) return false;

        const currentIndex = neuralQueue.findIndex(
            t => (t.id || t.text || t.title) === activeSubject?.taskId
        );

        if (currentIndex === -1 || currentIndex >= neuralQueue.length - 1) {
            clearPomodoroStorage();
            set((state) => {
                const p = state.appState?.pomodoro;
                if (!p) return;
                p.neuralMode = false;
                p.neuralQueue = [];
                p.isRunning = false;

                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
                markStorageDirty();
            });

            return false;
        }

        const nextTask = neuralQueue[currentIndex + 1];

        const nextSubject = {
            taskId: nextTask.id || nextTask.text || nextTask.title,
            task: formatTaskName(nextTask),
            category: extractCategoryFromTask(nextTask),
            categoryId: nextTask.categoryId || nextTask.catId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        clearPomodoroStorage();

        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.activeSubject = nextSubject;
            p.mode = 'work';
            p.targetCycles = 1;
            p.sessions = 1;
            p.completedCycles = 0;
            p.accumulatedMinutes = 0;
            p.isRunning = false;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });

        return true;
    }
});
