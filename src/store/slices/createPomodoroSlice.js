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

            // B-07 FIX: Limpar modo neural se a nova tarefa for manual
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

    setPomodoroSessions: (count) => set((state) => {
        state.appState.pomodoro.sessions = count;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    setPomodoroTargetCycles: (target) => set((state) => {
        const normalizedTarget = Math.max(1, Number(target) || 1);
        const p = state.appState.pomodoro;

        p.targetCycles = normalizedTarget;
        p.completedCycles = Math.min(normalizedTarget, Math.max(0, p.completedCycles || 0));
        p.sessions = Math.min(normalizedTarget, Math.max(1, p.sessions || 1));

        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    setPomodoroCompletedCycles: (completed) => set((state) => {
        const p = state.appState.pomodoro;
        const targetCycles = Math.max(1, Number(p.targetCycles) || 1);
        p.completedCycles = Math.min(targetCycles, Math.max(0, Number(completed) || 0));
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
        
        // BUG 4 FIX: Comparação profunda via JSON para evitar loops infinitos em objetos complexos
        const isIdentical = JSON.stringify(activeData.settings || {}) === JSON.stringify({ ...(activeData.settings || {}), ...settings });
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
    completePomodoroPhase: (isManual = false, manualMinutes = 0) => {
        set((state) => {
            const p = state.appState.pomodoro;
            if (!p) return; // Shield: prevent crash if pomodoro state is missing

            const activeId = state.appState.activeId;
            const settings = state.appState.contests[activeId]?.settings || { pomodoroWork: 25, pomodoroBreak: 5 };
            
            // Garantia de tipos e valores padrão
            const workDuration = settings.pomodoroWork || 25;
            const targetCycles = p.targetCycles || 1;

            if (p.mode === 'work') {
                if (!isManual) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + workDuration;
                } else if (manualMinutes > 0) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + manualMinutes;
                }

                // Cada bloco de foco concluído conta 1 ciclo.
                const currentCycles = Math.min(targetCycles, (p.completedCycles || 0) + 1);
                p.completedCycles = currentCycles;

                // Regra UX: se o plano tem apenas 1 ciclo, encerramos imediatamente.
                if (targetCycles === 1) {
                    p.sessions = 1;
                    p.accumulatedMinutes = 0;
                    p.mode = 'work';
                } else {
                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak = (currentCycles % longBreakAfter === 0);
                    p.mode = isLongBreak ? 'long_break' : 'break';
                }
            } else {
                // Fim da Pausa -> Próxima Sessão de Trabalho
                if (p.sessions >= targetCycles) {
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
    },

    // RETROCESSO ATÓMICO - Volta para a fase anterior com limites de segurança
    rewindPomodoroPhase: () => {
        set((state) => {
            const p = state.appState.pomodoro;
            if (!p) return;
            
            const activeId = state.appState.activeId;
            const settings = state.appState.contests[activeId]?.settings || {};

            if (p.mode === 'break' || p.mode === 'long_break') {
                // Se está em pausa, volta para o trabalho da mesma sessão
                p.mode = 'work';
            } else if (p.sessions > 1) {
                // Se está em trabalho, volta para a pausa da sessão anterior
                p.sessions = Math.max(1, p.sessions - 1);
                const longBreakAfter = settings.longBreakAfter || 4;
                const prevCycles = p.completedCycles || 0;
                p.mode = (prevCycles > 0 && prevCycles % longBreakAfter === 0)
                    ? 'long_break' : 'break';
            } else if (p.completedCycles > 0) {
                // Volta para a pausa do ciclo anterior
                p.completedCycles = Math.max(0, p.completedCycles - 1);
                p.sessions = p.targetCycles || 1;
                const longBreakAfter = settings.longBreakAfter || 4;
                const isLongBreak = ((p.completedCycles + 1) % longBreakAfter === 0);
                p.mode = isLongBreak ? 'long_break' : 'break';
            } else {
                // APENAS reseta o modo para work se já estiver na sessao 1
                p.mode = 'work';
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    // SINCRONIZAÇÃO GLOBAL - Atualiza múltiplos campos vindos de outra aba
    syncPomodoroState: (payload) => {
        set((state) => {
            const p = state.appState.pomodoro;
            if (!p) return;

            if (payload.mode !== undefined) p.mode = payload.mode;
            if (payload.sessions !== undefined) p.sessions = payload.sessions;
            if (payload.completedCycles !== undefined) p.completedCycles = payload.completedCycles;
            if (payload.accumulatedMinutes !== undefined) p.accumulatedMinutes = payload.accumulatedMinutes;
            if (payload.targetCycles !== undefined) p.targetCycles = payload.targetCycles;
            if (payload.neuralMode !== undefined) p.neuralMode = payload.neuralMode;

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
            category: task.catName || task.category || (task.text || task.title).split(':')[0] || 'Geral',
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
            state.appState.pomodoro.accumulatedMinutes = 0;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });
    },

    advanceNeuralQueue: () => {
        const { neuralQueue, activeSubject } = get().appState.pomodoro;
        if (!neuralQueue || neuralQueue.length === 0) return false;

        if (!activeSubject) return false; // Guard: evita desativar modo neural se a tarefa estiver em "limbo"
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
            category: nextTask.catName || nextTask.category || (nextTask.text || nextTask.title).split(':')[0] || 'Geral',
            categoryId: nextTask.categoryId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            state.appState.pomodoro.activeSubject = nextSubject;
            state.appState.pomodoro.sessions = 1;
            state.appState.pomodoro.completedCycles = 0;
            // B-02 FIX: Zerar minutos acumulados para não inflar a próxima tarefa
            state.appState.pomodoro.accumulatedMinutes = 0;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
        });

        return true;
    }
});
