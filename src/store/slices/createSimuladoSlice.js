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

    const normalizedInput = String(dateInput).trim();

    const matchesItem = (item) => {
      if (!item) return false;
      if (item.batchId && String(item.batchId).trim() === normalizedInput) {
        return true;
      }
      const raw = item.date || item.createdAt;
      if (!raw) return false;
      const normalizedRaw = String(raw).trim();
      if (normalizedRaw === normalizedInput) return true;

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const inputDatePart = normalizedInput.includes('T') ? normalizedInput.split('T')[0] : normalizedInput;
      const rawDatePart = normalizedRaw.includes('T') ? normalizedRaw.split('T')[0] : normalizedRaw;

      if (dateRegex.test(inputDatePart) && rawDatePart === inputDatePart) {
        return true;
      }
      return false;
    };

    if (activeData.simuladoRows) {
      const safeRows = Array.isArray(activeData.simuladoRows)
        ? activeData.simuladoRows
        : Object.values(activeData.simuladoRows || {});

      activeData.simuladoRows = safeRows.filter(r => !matchesItem(r));
    }

    if (activeData.simulados) {
      const safeSimulados = Array.isArray(activeData.simulados)
        ? activeData.simulados
        : Object.values(activeData.simulados || {});

      activeData.simulados = safeSimulados.filter(s => !matchesItem(s));
    }

    if (activeData.categories) {
      activeData.categories = activeData.categories.map(c => {
        const catMaxScore = Number.isFinite(Number(c.maxScore)) && Number(c.maxScore) > 0
          ? Number(c.maxScore)
          : (Number(activeData.maxScore) || 100);
        const catMinScore = Number.isFinite(Number(c.minScore))
          ? Math.min(Number(c.minScore), catMaxScore)
          : (Number(activeData.minScore) || 0);
        const catRange = Math.max(1e-9, catMaxScore - catMinScore);

        if (c.simuladoStats?.history) {
          const safeHistory = Array.isArray(c.simuladoStats.history)
            ? c.simuladoStats.history
            : Object.values(c.simuladoStats.history || {});

          const newHistory = safeHistory.filter(h => !matchesItem(h));
          const newStatsObj = { ...c.simuladoStats, history: newHistory };

          if (newHistory.length > 0) {
            const newStats = computeCategoryStats(newHistory, c.weight || 10, 60, catMaxScore, catMinScore);

            if (newStats) {
              const last = newHistory[newHistory.length - 1];
              const lastScore = last ? getSafeScore(last, catMaxScore, catMinScore) : NaN;

              newStatsObj.average = Number((newStats.mean || 0).toFixed(2));
              newStatsObj.trend = newStats.trend || 'stable';

              newStatsObj.lastAttempt = Number.isFinite(lastScore)
                ? lastScore
                : Number(
                    last?.score ?? (
                      (Number(last?.total) > 0)
                        ? catMinScore + (Number(last?.correct || 0) / Number(last?.total)) * catRange
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

