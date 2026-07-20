// BUG-9 FIX: Função reutilizável para extrair categoria do texto da tarefa
const extractCategoryFromTask = (task) => {
    if (task.catName) return task.catName;
    if (task.category) return task.category;
    const t = task.text || task.title || '';
    const idx = t.indexOf(':');
    const cat = idx > -1 ? t.substring(0, idx).trim() : t;
    return (/^\d+$/.test(cat) || !cat) ? 'Geral' : cat;
};

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
                // BUG-2 FIX: Não zeramos accumulatedMinutes aqui — o caller (transitionSession)
                // precisa ler o valor antes do reset. O reset acontece no fluxo natural
                // (setPomodoroActiveSubject(null) ou advanceNeuralQueue).
                if (targetCycles === 1) {
                    p.sessions = 1;
                    p.mode = 'work';
                    // BUG FIX: Evitar leak de accumulatedMinutes e completedCycles se o 
                    // utilizador repetir o pomodoro de 1 ciclo sem mudar de tarefa.
                    p.completedCycles = 0;
                    p.accumulatedMinutes = 0;
                } else {
                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak = (currentCycles % longBreakAfter === 0);
                    p.mode = isLongBreak ? 'long_break' : 'break';
                    
                    // BUG FIX: Se completou todos os ciclos, o tempo já foi salvo pelo timer.
                    // Zeramos para evitar duplicação em caso de retrocesso (rewind).
                    if (currentCycles >= targetCycles) {
                        p.accumulatedMinutes = 0;
                    }
                }
            } else {
                // Fim da Pausa -> Próxima Sessão de Trabalho
                // BUG FIX: Se a pausa era de uma transição de fila neural (completedCycles zerado),
                // a próxima sessão de trabalho DEVE ser a sessão 1 (e não a 2).
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
    },

    // RETROCESSO ATÓMICO - Volta para a fase anterior com limites de segurança
    rewindPomodoroPhase: () => {
        set((state) => {
            const p = state.appState.pomodoro;
            if (!p) return;
            
            const activeId = state.appState.activeId;
            const settings = state.appState.contests[activeId]?.settings || {};

            const workDuration = settings.pomodoroWork || 25;

            if (p.mode === 'break' || p.mode === 'long_break') {
                // Se está em pausa, volta para o trabalho da mesma sessão
                p.mode = 'work';
                // BUG FIX: Subtrair o ciclo que foi indevidamente contabilizado como finalizado
                p.completedCycles = Math.max(0, (p.completedCycles || 0) - 1);
                p.accumulatedMinutes = Math.max(0, (p.accumulatedMinutes || 0) - workDuration);
            } else if (p.sessions > 1) {
                // BUG-5 FIX: Usar completedCycles (ciclos realmente finalizados) para
                // determinar se a pausa anterior era longa, não sessions pós-decremento.
                const longBreakAfter = settings.longBreakAfter || 4;
                const previousCycleIndex = p.completedCycles; // ciclos terminados antes deste work
                p.sessions = Math.max(1, p.sessions - 1);
                p.mode = (previousCycleIndex > 0 && previousCycleIndex % longBreakAfter === 0)
                    ? 'long_break' : 'break';
            } else if (p.completedCycles > 0) {
                // Volta para a pausa do ciclo anterior, ou ao inicio se for 1 ciclo.
                p.completedCycles = Math.max(0, p.completedCycles - 1);
                p.accumulatedMinutes = Math.max(0, (p.accumulatedMinutes || 0) - workDuration);
                
                if ((p.targetCycles || 1) === 1) {
                    p.sessions = 1;
                    p.mode = 'work';
                } else {
                    p.sessions = p.targetCycles || 1;
                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak = ((p.completedCycles + 1) % longBreakAfter === 0);
                    p.mode = isLongBreak ? 'long_break' : 'break';
                }
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
            category: extractCategoryFromTask(nextTask),
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
