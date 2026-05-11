export const createMonteCarloSlice = (set) => ({
    recordMonteCarloSnapshot: (date, prob, metadata = {}) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;

        const history = Array.isArray(activeData.monteCarloHistory) ? activeData.monteCarloHistory : [];
        const snapshot = { date, probability: prob, ...metadata };
        const idx = history.findIndex(h => h.date === date);

        if (idx >= 0) {
            activeData.monteCarloHistory[idx] = { ...history[idx], ...snapshot };
            // Garante ordem + retenção de janela após atualização de snapshot existente
            activeData.monteCarloHistory = activeData.monteCarloHistory
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(-30);
        } else {
            // Ordena estritamente por data antes de aplicar o limite de 30 dias
            activeData.monteCarloHistory = [...history, snapshot]
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(-30);
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

    recordCalibrationMetric: (categoryId, metric) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;
        
        if (!activeData.calibrationMetrics) activeData.calibrationMetrics = {};
        if (!activeData.calibrationMetrics[categoryId]) activeData.calibrationMetrics[categoryId] = [];
        
        const history = activeData.calibrationMetrics[categoryId];
        activeData.calibrationMetrics[categoryId] = [...history, { 
            ...metric, 
            timestamp: new Date().toISOString() 
        }].slice(-50);
        
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    updateCoachScore: (score) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData) return;
        
        if (activeData.coachScore === score) return;
        activeData.coachScore = score;
        
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
