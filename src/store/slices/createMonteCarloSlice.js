export const createMonteCarloSlice = (set, get) => ({
    recordMonteCarloSnapshot: (date, prob) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;

        if (!activeData.monteCarloHistory) activeData.monteCarloHistory = [];

        // Check for existing snapshot for this date
        const index = activeData.monteCarloHistory.findIndex(h => h.date === date);
        if (index >= 0) {
            // Update existing
            activeData.monteCarloHistory[index].probability = prob;
        } else {
            // Add new
            activeData.monteCarloHistory.push({ date, probability: prob });
            
            // Retention policy: Keep last 30 snapshots to balance data history and storage size
            if (activeData.monteCarloHistory.length > 30) {
                activeData.monteCarloHistory = activeData.monteCarloHistory.slice(-30);
            }
        }

        // Silent updated timestamp (don't force a full sync just for a snapshot if not needed, 
        // but since it's state change it will be persisted)
        state.appState.lastUpdated = new Date().toISOString();
    }),

    setMcEqualWeights: (enabled) => set((state) => {
        state.appState.mcEqualWeights = enabled;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
