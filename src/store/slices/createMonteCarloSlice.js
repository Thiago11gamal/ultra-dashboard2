export const createMonteCarloSlice = (set, get) => ({
    recordMonteCarloSnapshot: (date, prob, metadata = {}) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;

        const history = activeData.monteCarloHistory || [];
        const snapshot = { date, probability: prob, mean: metadata.mean, target: metadata.target };
        const idx = history.findIndex(h => h.date === date);

        if (idx >= 0) {
            activeData.monteCarloHistory[idx] = { ...history[idx], ...snapshot };
        } else {
            activeData.monteCarloHistory = [...history, snapshot].slice(-30);
        }

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
});
