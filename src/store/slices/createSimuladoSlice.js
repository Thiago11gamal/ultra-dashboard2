import { computeCategoryStats } from '../../engine/stats.js';
import { getSafeScore } from '../../utils/scoreHelper.js';

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
            const safeRows = Array.isArray(activeData.simuladoRows) ? activeData.simuladoRows : Object.values(activeData.simuladoRows || {});
            activeData.simuladoRows = safeRows.filter(r => !matchesDate(r.date || r.createdAt));
        }

        if (activeData.simulados) {
            const safeSimulados = Array.isArray(activeData.simulados) ? activeData.simulados : Object.values(activeData.simulados || {});
            activeData.simulados = safeSimulados.filter(s => !matchesDate(s.date || s.createdAt));
        }

        if (activeData.categories) {
            activeData.categories = activeData.categories.map(c => {
                // 🎯 BUGFIX: Usar a pontuação máxima específica da categoria (ou do concurso como fallback)
                const catMaxScore = Number(c.maxScore) || Number(activeData.maxScore) || 100;

                if (c.simuladoStats?.history) {
                    // Filtra o simulado excluído
                    const safeHistory = Array.isArray(c.simuladoStats.history) ? c.simuladoStats.history : Object.values(c.simuladoStats.history || {});
                    const newHistory = safeHistory.filter(h => !matchesDate(h.date));
                    
                    const newStatsObj = { ...c.simuladoStats, history: newHistory };
                    
                    // 🎯 RECOMPUTAÇÃO IMEDIATA PÓS-EXCLUSÃO
                    if (newHistory.length > 0) {
                        const newStats = computeCategoryStats(newHistory, c.weight || 10, 60, catMaxScore);
                        if (newStats) {
                            const last = newHistory[newHistory.length - 1];
                            newStatsObj.average = Number((newStats.mean || 0).toFixed(2));
                            newStatsObj.trend = newStats.trend || 'stable';
                            // Garante o cálculo do último score baseado na escala correta
                            const lastScore = last ? getSafeScore(last, catMaxScore) : NaN;
                            newStatsObj.lastAttempt = Number.isFinite(lastScore)
                              ? lastScore
                              : Number(last?.score ?? ((Number(last?.total) > 0) ? (Number(last?.correct || 0) / Number(last?.total)) * catMaxScore : 0));
                            newStatsObj.level = newStats.level || 'BAIXO';
                        }
                    } else {
                        // Se não sobrou nenhum simulado, zera as métricas
                        newStatsObj.average = 0;
                        newStatsObj.trend = 'stable';
                        newStatsObj.lastAttempt = 0;
                        newStatsObj.level = 'BAIXO';
                    }
                    
                    return { ...c, simuladoStats: newStatsObj };
                }
                
                return c;
            });
        }
        
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
