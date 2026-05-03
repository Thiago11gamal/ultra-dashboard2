import { computeCategoryStats } from '../../engine/stats.js';

export const createSimuladoSlice = (set) => ({
    resetSimuladoStats: () => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData?.categories) return;
        activeData.categories.forEach(c => {
            c.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
        });
        activeData.simuladoRows = [];
        activeData.simulados = [];
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    deleteSimulado: (dateInput) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        
        const matchesDate = (raw) => {
            if (!raw) return false;
            if (dateInput.includes('T')) return raw === dateInput;
            return raw.startsWith(dateInput); 
        };

        if (activeData.simuladoRows) {
            activeData.simuladoRows = activeData.simuladoRows.filter(r => !matchesDate(r.date || r.createdAt));
        }

        if (activeData.simulados) {
            activeData.simulados = activeData.simulados.filter(s => !matchesDate(s.date || s.createdAt));
        }

        if (activeData.categories) {
            // Assumimos maxScore padrão 100, mas adaptado caso tenha no activeData
            const maxScore = activeData.maxScore || 100; 

            activeData.categories.forEach(c => {
                if (c.simuladoStats?.history) {
                    // Filtra o simulado excluído
                    c.simuladoStats.history = c.simuladoStats.history.filter(h => !matchesDate(h.date));
                    
                    // 🎯 RECOMPUTAÇÃO IMEDIATA PÓS-EXCLUSÃO
                    if (c.simuladoStats.history.length > 0) {
                        const newStats = computeCategoryStats(c.simuladoStats.history, c.weight || 1, 60, maxScore);
                        if (newStats) {
                            c.simuladoStats.average = newStats.mean;
                            c.simuladoStats.trend = newStats.trend;
                        }
                    } else {
                        // Se não sobrou nenhum simulado, zera as métricas
                        c.simuladoStats.average = 0;
                        c.simuladoStats.trend = 'stable';
                    }
                }
            });
        }
        
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
