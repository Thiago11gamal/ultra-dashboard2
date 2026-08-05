import { cleanTaskTitle } from '../../utils/taskTitleHelper.js';

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

    return cleanTaskTitle(rawName, cat);
};

export const createPomodoroSlice = (set, get) => ({
    resetPomodoroProgress: () => {
        set((state) => {
            const p = state.appState?.pomodoro;

            if (!p) return;

            p.accumulatedMinutes = 0;
            p.completedCycles = 0;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    setPomodoroActiveSubject: (subject) => {
        set((state) => {
            if (!subject) {
                state.appState.pomodoro.sessions = 1;
                state.appState.pomodoro.completedCycles = 0;
                state.appState.pomodoro.mode = 'work';
                state.appState.pomodoro.accumulatedMinutes = 0;
                state.appState.pomodoro.activeSubject = null;
                state.appState.pomodoro.neuralMode = false;
                state.appState.pomodoro.neuralQueue = [];

                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
                return;
            }

            const current = state.appState.pomodoro.activeSubject;

            const isNewSession =
                !current ||
                !subject.sessionInstanceId ||
                current.sessionInstanceId !== subject.sessionInstanceId;

            if (isNewSession) {
                state.appState.pomodoro.sessions = 1;
                state.appState.pomodoro.completedCycles = 0;
                state.appState.pomodoro.mode = 'work';
                state.appState.pomodoro.accumulatedMinutes = 0;
            }

            if (subject.source !== 'neural_core') {
                state.appState.pomodoro.neuralMode = false;
                state.appState.pomodoro.neuralQueue = [];
            }

            state.appState.pomodoro.activeSubject = subject;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
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
            state.appState.pomodoro.sessions = count;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    setPomodoroTargetCycles: (target) => {
        set((state) => {
            const normalizedTarget = Math.max(1, Number(target) || 1);
            const p = state.appState.pomodoro;

            p.targetCycles = normalizedTarget;
            p.completedCycles = Math.min(normalizedTarget, Math.max(0, p.completedCycles || 0));

            if (p.mode === 'work' && p.completedCycles >= normalizedTarget) {
                p.completedCycles = Math.max(0, normalizedTarget - 1);
            }

            p.sessions = Math.min(normalizedTarget, Math.max(1, p.sessions || 1));

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    setPomodoroCompletedCycles: (completed) => {
        set((state) => {
            const p = state.appState.pomodoro;
            const targetCycles = Math.max(1, Number(p.targetCycles) || 1);

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
        });
    },

    setPomodoroMode: (mode) => {
        set((state) => {
            state.appState.pomodoro.mode = mode;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    updatePomodoroSettings: (settings) => {
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];

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

            try {
                localStorage.setItem('ultra-sync-dirty', 'true');
            } catch (error) {
                console.warn('[PomodoroSlice] Failed to set ultra-sync-dirty:', error);
            }
        });
    },

    setPomodoroAccumulatedMinutes: (minutes) => {
        set((state) => {
            state.appState.pomodoro.accumulatedMinutes = Math.max(0, Number(minutes) || 0);

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    completePomodoroPhase: (isManual = false, manualMinutes = 0) => {
        let savedMinutes = 0;

        set((state) => {
            const p = state.appState.pomodoro;

            if (!p) return;

            const activeId = state.appState.activeId;
            const settings = state.appState.contests[activeId]?.settings || {
                pomodoroWork: 25,
                pomodoroBreak: 5
            };

            const workDuration = Number(settings.pomodoroWork) || 25;
            const targetCycles = p.targetCycles || 1;

            if (p.mode === 'work') {
                if (!isManual) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + workDuration;
                } else if (manualMinutes > 0) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + manualMinutes;
                }

                savedMinutes = p.accumulatedMinutes;

                const currentCycles = Math.min(
                    targetCycles,
                    (p.completedCycles || 0) + 1
                );

                p.completedCycles = currentCycles;

                if (targetCycles === 1) {
                    p.sessions = 1;
                    p.mode = 'work';
                    p.completedCycles = 0;

                    // CORREÇÃO CRÍTICA:
                    // Antes o accumulatedMinutes continuava vivo aqui.
                    // Isso causava double logging quando o activeSubject era limpo.
                    p.accumulatedMinutes = 0;
                } else {
                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak = currentCycles % longBreakAfter === 0;

                    p.mode = isLongBreak ? 'long_break' : 'break';

                    if (currentCycles >= targetCycles) {
                        p.accumulatedMinutes = 0;
                    }
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
        });

        return savedMinutes;
    },

    rewindPomodoroPhase: () => {
        set((state) => {
            const p = state.appState.pomodoro;

            if (!p) return;

            const activeId = state.appState.activeId;
            const settings = state.appState.contests[activeId]?.settings || {};
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
                const previousCycleIndex = p.completedCycles;

                p.sessions = Math.max(1, p.sessions - 1);
                p.mode =
                    previousCycleIndex > 0 && previousCycleIndex % longBreakAfter === 0
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
        });
    },

    syncPomodoroState: (payload) => {
        set((state) => {
            const p = state.appState.pomodoro;

            if (!p) return;

            if (payload.mode !== undefined) {
                p.mode = payload.mode;
            }

            if (payload.sessions !== undefined) {
                p.sessions = Math.min(
                    Math.max(1, Number(payload.sessions) || 1),
                    Math.max(1, Number(p.targetCycles) || 1)
                );
            }

            if (payload.targetCycles !== undefined) {
                p.targetCycles = Math.max(1, Number(payload.targetCycles) || 1);
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

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    startNeuralSession: (tasks, startIndex = 0) => {
        if (!tasks || tasks.length === 0) return;

        const task = tasks[startIndex];

        const subject = {
            taskId: task.id || task.text,
            task: formatTaskName(task),
            category: extractCategoryFromTask(task),
            categoryId: task.categoryId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            state.appState.pomodoro.activeSubject = subject;
            state.appState.pomodoro.neuralQueue = tasks;
            state.appState.pomodoro.neuralMode = true;
            state.appState.pomodoro.targetCycles = 1;
            state.appState.pomodoro.sessions = 1;
            state.appState.pomodoro.completedCycles = 0;
            state.appState.pomodoro.accumulatedMinutes = 0;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    advanceNeuralQueue: () => {
        const { neuralQueue, activeSubject } = get().appState.pomodoro;

        if (!neuralQueue || neuralQueue.length === 0) return false;
        if (!activeSubject) return false;

        const currentIndex = neuralQueue.findIndex(
            t => (t.id || t.text) === activeSubject?.taskId
        );

        if (currentIndex === -1 || currentIndex >= neuralQueue.length - 1) {
            set((state) => {
                state.appState.pomodoro.neuralMode = false;
                state.appState.pomodoro.neuralQueue = [];

                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
            });

            return false;
        }

        const nextTask = neuralQueue[currentIndex + 1];

        const nextSubject = {
            taskId: nextTask.id || nextTask.text,
            task: formatTaskName(nextTask),
            category: extractCategoryFromTask(nextTask),
            categoryId: nextTask.categoryId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            state.appState.pomodoro.activeSubject = nextSubject;
            state.appState.pomodoro.mode = 'work';
            state.appState.pomodoro.targetCycles = 1;
            state.appState.pomodoro.sessions = 1;
            state.appState.pomodoro.completedCycles = 0;
            state.appState.pomodoro.accumulatedMinutes = 0;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });

        return true;
    }
});
