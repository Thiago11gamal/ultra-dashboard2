export const createMonteCarloSlice = (set, get) => ({
    recordMonteCarloSnapshot: (date, prob) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;

        // FIX 2: Garantir que o array de histórico é sempre uma referência nova
        // para que o React / Immer detecte a mudança e re-renderize os gráficos.
        if (!activeData.monteCarloHistory) {
            activeData.monteCarloHistory = [];
        }

        const index = activeData.monteCarloHistory.findIndex(h => h.date === date);
        if (index >= 0) {
            // Substituir o objeto inteiro (não apenas a propriedade) para garantir
            // que o Immer marque o item como alterado na árvore de drafts.
            activeData.monteCarloHistory[index] = { ...activeData.monteCarloHistory[index], probability: prob };
        } else {
            activeData.monteCarloHistory.push({ date, probability: prob });
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
