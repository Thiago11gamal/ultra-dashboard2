export const createMonteCarloSlice = (set, get) => ({
    recordMonteCarloSnapshot: (date, prob, metadata = {}) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;

        const snapshot = { date, probability: prob, mean: metadata.mean, target: metadata.target };
        
        // FIX: Criar nova referência de array (Imutabilidade) para garantir gatilhos de renderização
        const history = [...(activeData.monteCarloHistory || [])];
        const index = history.findIndex(h => h.date === date);

        if (index >= 0) {
            history[index] = { ...history[index], ...snapshot };
        } else {
            history.push(snapshot);
        }

        // Política de retenção com slice imutável
        const finalHistory = history.length > 30 ? history.slice(-30) : history;

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
