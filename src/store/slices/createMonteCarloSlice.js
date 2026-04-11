export const createMonteCarloSlice = (set, get) => ({
    recordMonteCarloSnapshot: (date, prob, metadata = {}) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;

        // FIX: Imutabilidade profunda para o React detectar mudanças garantidamente
        const currentHistory = [...(activeData.monteCarloHistory || [])];
        const snapshot = { date, probability: prob, mean: metadata.mean, target: metadata.target };
        
        const index = currentHistory.findIndex(h => h.date === date);
        if (index >= 0) {
            currentHistory[index] = { ...currentHistory[index], ...snapshot };
        } else {
            currentHistory.push(snapshot);
        }

        // Política de retenção com slice imutável
        const finalHistory = currentHistory.length > 30 ? currentHistory.slice(-30) : currentHistory;

        return {
            appState: {
                ...state.appState,
                contests: {
                    ...state.appState.contests,
                    [activeId]: { 
                        ...activeData, 
                        monteCarloHistory: finalHistory 
                    }
                },
                lastUpdated: new Date().toISOString()
            }
        };
    }),

    setMcEqualWeights: (enabled) => set((state) => {
        state.appState.mcEqualWeights = enabled;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
