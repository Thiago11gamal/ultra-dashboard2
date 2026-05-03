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
        if (!activeData || !dateInput) return;
        
        const normalizedInput = String(dateInput);
        const matchesDate = (raw) => {
            if (!raw) return false;
            const normalizedRaw = String(raw);
            if (normalizedInput.includes('T')) return normalizedRaw === normalizedInput;
            return normalizedRaw.startsWith(normalizedInput); 
        };

        if (activeData.simuladoRows) {
            activeData.simuladoRows = activeData.simuladoRows.filter(r => !matchesDate(r.date || r.createdAt));
        }

        if (activeData.simulados) {
            activeData.simulados = activeData.simulados.filter(s => !matchesDate(s.date || s.createdAt));
        }

        if (activeData.categories) {
            activeData.categories.forEach(c => {
                // 🎯 BUGFIX: Usar a pontuação máxima específica da categoria (ou do concurso como fallback)
                const catMaxScore = Number(c.maxScore) || Number(activeData.maxScore) || 100;

                if (c.simuladoStats?.history) {
                    // Filtra o simulado excluído
                    c.simuladoStats.history = c.simuladoStats.history.filter(h => !matchesDate(h.date));
                    
                    // 🎯 RECOMPUTAÇÃO IMEDIATA PÓS-EXCLUSÃO
                    if (c.simuladoStats.history.length > 0) {
                        const newStats = computeCategoryStats(c.simuladoStats.history, c.weight || 1, 60, catMaxScore);
                        if (newStats) {
                            const last = c.simuladoStats.history[c.simuladoStats.history.length - 1];
                            c.simuladoStats.average = Number((newStats.mean || 0).toFixed(2));
                            c.simuladoStats.trend = newStats.trend || 'stable';
                            // Garante o cálculo do último score baseado na escala correta
                            c.simuladoStats.lastAttempt = Number(last?.score ?? ((Number(last?.total) > 0) ? (Number(last?.correct || 0) / Number(last?.total)) * catMaxScore : 0));
                            c.simuladoStats.level = newStats.level || 'BAIXO';
                        }
                    } else {
                        // Se não sobrou nenhum simulado, zera as métricas
                        c.simuladoStats.average = 0;
                        c.simuladoStats.trend = 'stable';
                        c.simuladoStats.lastAttempt = 0;
                        c.simuladoStats.level = 'BAIXO';
                    }
                }
            });
        }
        
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
