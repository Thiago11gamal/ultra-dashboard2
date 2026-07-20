export const createMonteCarloSlice = (set) => ({
    recordMonteCarloSnapshot: (date, prob, metadata = {}) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;

        const history = Array.isArray(activeData.monteCarloHistory) ? activeData.monteCarloHistory : [];
        const snapshot = { date, probability: prob, ...metadata };
        let newHistory;
        // Padroniza as chaves temporais forçando conversão para string ou epoch
        const targetDateStr = new Date(date).toISOString().split('T')[0];
        const idx = history.findIndex(h => new Date(h.date).toISOString().split('T')[0] === targetDateStr);

        if (idx >= 0) {
            newHistory = [...history];
            newHistory[idx] = { ...history[idx], ...snapshot };
        } else {
            newHistory = [...history, snapshot];
        }
        // Immutable sort + limit
        newHistory = newHistory
            .sort((a, b) => {
                const timeA = new Date(a.date).getTime() || 0;
                const timeB = new Date(b.date).getTime() || 0;
                return timeA - timeB;
            })
            .slice(-30);

        // Assign immutably to avoid direct mutation issues
        state.appState.contests[activeId] = {
            ...activeData,
            monteCarloHistory: newHistory
        };

        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    setMcEqualWeights: (enabled) => set((state) => {
        state.appState.mcEqualWeights = enabled;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    setHistoricalCutoffs: (cutoffs) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;
        activeData.historicalCutoffs = cutoffs;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),



    updateCoachScore: (score) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;
        
        // O Object.is() resolve a anomalia do NaN === NaN
        if (Object.is(activeData.coachScore, score)) return;
        activeData.coachScore = score;
        
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    setExamConfig: (durationMinutes, totalQuestions) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;
        
        activeData.examDurationMinutes = durationMinutes;
        activeData.examTotalQuestions = totalQuestions;
        
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
