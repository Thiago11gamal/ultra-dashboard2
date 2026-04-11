export const createMonteCarloSlice = (set, get) => ({
    recordMonteCarloSnapshot: (date, prob, metadata = {}) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;

        if (!activeData.monteCarloHistory) {
            activeData.monteCarloHistory = [];
        }

        const index = activeData.monteCarloHistory.findIndex(h => h.date === date);
        const snapshot = { 
            date, 
            probability: prob,
            mean: metadata.mean,
            target: metadata.target
        };

        if (index >= 0) {
            activeData.monteCarloHistory[index] = { ...activeData.monteCarloHistory[index], ...snapshot };
        } else {
            activeData.monteCarloHistory.push(snapshot);
        }

        // Retention policy: Keep last 30 snapshots
        if (activeData.monteCarloHistory.length > 30) {
            activeData.monteCarloHistory = activeData.monteCarloHistory.slice(-30);
        }

        state.appState.lastUpdated = new Date().toISOString();
    }),

    setMcEqualWeights: (enabled) => set((state) => {
        state.appState.mcEqualWeights = enabled;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
