import { computeCategoryStats } from '../../engine/stats.js';
import { getSafeScore } from '../../utils/scoreHelper.js';

export const createSimuladoSlice = (set) => ({
  resetSimuladoStats: () => set((state) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData?.categories) return;

    activeData.categories.forEach(c => {
      c.simuladoStats = {
        history: [],
        average: 0,
        lastAttempt: 0,
        trend: 'stable',
        level: 'BAIXO'
      };
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
      if (normalizedInput.includes('T')) {
        return normalizedRaw === normalizedInput;
      }
      // ✅ FIX: Validação estrita de formato YYYY-MM-DD antes de comparar
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(normalizedInput)) return false;
      // Compara apenas a parte da data (YYYY-MM-DD)
      const rawDatePart = normalizedRaw.split('T')[0];
      return rawDatePart === normalizedInput;
    };

    if (activeData.simuladoRows) {
      const safeRows = Array.isArray(activeData.simuladoRows)
        ? activeData.simuladoRows
        : Object.values(activeData.simuladoRows || {});

      activeData.simuladoRows = safeRows.filter(r => !matchesDate(r.date || r.createdAt));
    }

    if (activeData.simulados) {
      const safeSimulados = Array.isArray(activeData.simulados)
        ? activeData.simulados
        : Object.values(activeData.simulados || {});

      activeData.simulados = safeSimulados.filter(s => !matchesDate(s.date || s.createdAt));
    }

    if (activeData.categories) {
      activeData.categories = activeData.categories.map(c => {
        const catMaxScore = Number(c.maxScore) || Number(activeData.maxScore) || 100;

        if (c.simuladoStats?.history) {
          const safeHistory = Array.isArray(c.simuladoStats.history)
            ? c.simuladoStats.history
            : Object.values(c.simuladoStats.history || {});

          const newHistory = safeHistory.filter(h => !matchesDate(h.date));
          const newStatsObj = { ...c.simuladoStats, history: newHistory };

          if (newHistory.length > 0) {
            const newStats = computeCategoryStats(newHistory, c.weight || 10, 60, catMaxScore);

            if (newStats) {
              const last = newHistory[newHistory.length - 1];
              const lastScore = last ? getSafeScore(last, catMaxScore) : NaN;

              newStatsObj.average = Number((newStats.mean || 0).toFixed(2));
              newStatsObj.trend = newStats.trend || 'stable';

              newStatsObj.lastAttempt = Number.isFinite(lastScore)
                ? lastScore
                : Number(
                    last?.score ?? (
                      (Number(last?.total) > 0)
                        ? (Number(last?.correct || 0) / Number(last?.total)) * catMaxScore
                        : 0
                    )
                  );

              newStatsObj.level = newStats.level || 'BAIXO';
            }
          } else {
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
