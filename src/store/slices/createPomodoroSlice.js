export const createPomodoroSlice = (set, get) => ({
    setPomodoroActiveSubject: (subject) => {
        set((state) => {
            if (!subject) {
                state.appState.pomodoro.sessions = 1;
                state.appState.pomodoro.completedCycles = 0;
                state.appState.pomodoro.mode = 'work';
                state.appState.pomodoro.accumulatedMinutes = 0;
                state.appState.pomodoro.activeSubject = null;
                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
                return;
            }

            const current = state.appState.pomodoro.activeSubject;
            const isNewSession = !current || !subject.sessionInstanceId || (current.sessionInstanceId !== subject.sessionInstanceId);
            
            if (isNewSession) {
                state.appState.pomodoro.sessions = 1;
                state.appState.pomodoro.completedCycles = 0;
                state.appState.pomodoro.mode = 'work';
                state.appState.pomodoro.accumulatedMinutes = 0;
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

    setPomodoroSessions: (count) => set((state) => {
        state.appState.pomodoro.sessions = count;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    setPomodoroTargetCycles: (target) => set((state) => {
        state.appState.pomodoro.targetCycles = target;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    setPomodoroCompletedCycles: (completed) => set((state) => {
        state.appState.pomodoro.completedCycles = completed;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    setPomodoroMode: (mode) => set((state) => {
        state.appState.pomodoro.mode = mode;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    updatePomodoroSettings: (settings) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        
        // BUG 4 FIX: Verificação de identidade para evitar loops infinitos de re-render
        const isIdentical = Object.keys(settings).every(
            key => activeData.settings?.[key] === settings[key]
        );
        if (isIdentical) return;

        activeData.settings = { ...(activeData.settings || {}), ...settings };
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    setPomodoroAccumulatedMinutes: (minutes) => set((state) => {
        state.appState.pomodoro.accumulatedMinutes = minutes;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    // TRANSIÇÃO ATÓMICA - Muda fase, acumula minutos, e avança ciclos numa única operação
    completePomodoroPhase: (isManual = false) => {
        set((state) => {
            const p = state.appState.pomodoro;
            const settings = state.appState.contests[state.appState.activeId]?.settings || { pomodoroWork: 25, pomodoroBreak: 5 };
            
            if (p.mode === 'work') {
                if (!isManual) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + (settings.pomodoroWork || 25);
                }

                if (p.sessions >= (p.targetCycles || 1)) {
                    p.sessions = 1;
                    p.completedCycles = 0;
                    p.accumulatedMinutes = 0;
                    p.mode = 'work';
                } else {
                    p.mode = 'break';
                }
            } else {
                p.completedCycles = (p.completedCycles || 0) + 1;
                p.sessions = (p.sessions || 1) + 1;
                p.mode = 'work';
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    // RETROCESSO ATÓMICO - Volta para a fase anterior
    rewindPomodoroPhase: () => {
        set((state) => {
            const p = state.appState.pomodoro;
            
            if (p.mode === 'break') {
                // Se está em pausa, volta para o trabalho da mesma sessão
                p.mode = 'work';
            } else if (p.sessions > 1) {
                // Se está em trabalho (não na primeira), volta para a pausa da sessão anterior
                p.sessions = p.sessions - 1;
                p.completedCycles = Math.max(0, (p.completedCycles || 0) - 1);
                p.mode = 'break';
            } else {
                // Se está na primeira sessão, apenas reinicia o estado
                p.mode = 'work';
                p.sessions = 1;
                p.completedCycles = 0;
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    // --- NEURAL CORE SEQUENCING ---
    startNeuralSession: (tasks, startIndex = 0) => {
        if (!tasks || tasks.length === 0) return;
        
        const task = tasks[startIndex];
        const subject = {
            taskId: task.id || task.text,
            task: task.text || task.title,
            category: (task.text || task.title).split(':')[0] || 'Geral',
            categoryId: task.categoryId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            state.appState.pomodoro.activeSubject = subject;
            state.appState.pomodoro.neuralQueue = tasks;
            state.appState.pomodoro.neuralMode = true;
            state.appState.pomodoro.sessions = 1;
            state.appState.pomodoro.completedCycles = 0;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    advanceNeuralQueue: () => {
        const { neuralQueue, activeSubject } = get().appState.pomodoro;
        if (!neuralQueue || neuralQueue.length === 0) return false;

        const currentIndex = neuralQueue.findIndex(t => (t.id || t.text) === activeSubject?.taskId);
        if (currentIndex === -1 || currentIndex >= neuralQueue.length - 1) {
            // Fim da fila
            set((state) => {
                state.appState.pomodoro.neuralMode = false;
                state.appState.pomodoro.neuralQueue = [];
            });
            return false;
        }

        const nextTask = neuralQueue[currentIndex + 1];
        const nextSubject = {
            taskId: nextTask.id || nextTask.text,
            task: nextTask.text || nextTask.title,
            category: (nextTask.text || nextTask.title).split(':')[0] || 'Geral',
            categoryId: nextTask.categoryId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            state.appState.pomodoro.activeSubject = nextSubject;
            state.appState.pomodoro.sessions = 1;
            state.appState.pomodoro.completedCycles = 0;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });

        return true;
    }
});
