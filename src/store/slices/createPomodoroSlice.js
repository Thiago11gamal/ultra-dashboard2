export const createPomodoroSlice = (set, get) => ({
    setPomodoroActiveSubject: (subject) => {
        set((state) => {
            if (!subject) {
                state.appState.pomodoro.sessions = 0;
                state.appState.pomodoro.completedCycles = 0;
                state.appState.pomodoro.activeSubject = null;
                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
                return;
            }

            const current = state.appState.pomodoro.activeSubject;
            const isNewSession = !current || !subject.sessionInstanceId || (current.sessionInstanceId !== subject.sessionInstanceId);
            
            if (isNewSession) {
                state.appState.pomodoro.sessions = 0;
                state.appState.pomodoro.completedCycles = 0;
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

    setPomodoroCycles: (completed, target) => set((state) => {
        state.appState.pomodoro.completedCycles = completed;
        state.appState.pomodoro.targetCycles = target;
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

    updatePomodoroSettings: (settings) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        activeData.settings = { ...(activeData.settings || {}), ...settings };
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
