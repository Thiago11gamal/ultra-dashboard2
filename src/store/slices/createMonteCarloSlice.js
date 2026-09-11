import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { safeClone } from '../../utils/safeClone.js';

function safeNumber(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

export const createMonteCarloSlice = (set) => ({
  recordMonteCarloSnapshot: (date, prob, metadata = {}) => set((state) => {
    try {
      const activeId = state.appState?.activeId;
      if (!activeId) return;
      const activeData = state.appState.contests?.[activeId];
      if (!activeData) return;

      const rawProb = safeNumber(prob, null);
      if (rawProb === null) return;

      const snapshot = {
        date: getDateKey(normalizeDate(date)),
        probability: rawProb,
        ...safeClone(metadata)
      };

      const targetDateStr = snapshot.date;
      const targetCategoryId = snapshot.categoryId || null;
      const existingHistory = Array.isArray(activeData.monteCarloHistory)
        ? activeData.monteCarloHistory
        : [];

      const idx = existingHistory.findIndex(h =>
        getDateKey(normalizeDate(h.date)) === targetDateStr &&
        (h.categoryId || null) === targetCategoryId
      );

      let newHistory;
      if (idx >= 0) {
        newHistory = existingHistory.map((h, i) => i === idx ? { ...h, ...snapshot } : h);
      } else {
        newHistory = [...existingHistory, snapshot];
      }

      newHistory.sort((a, b) => {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return timeA - timeB;
      });

      const categoryCount = (activeData.categories || []).length || 1;
      const MAX_SNAPSHOTS = 30 * categoryCount;
      if (newHistory.length > MAX_SNAPSHOTS) {
        newHistory = newHistory.slice(-MAX_SNAPSHOTS);
      }

      try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }

      state.appState.contests[activeId].monteCarloHistory = newHistory;
      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = new Date().toISOString();
      try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }
    } catch (e) {
      console.warn('Error saving MC snapshot:', e);
    }
  }),

  setMcEqualWeights: (enabled) => set((state) => {
    state.appState.mcEqualWeights = Boolean(enabled);
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }
  }),

  setHistoricalCutoffs: (cutoffs) => set((state) => {
    const activeId = state.appState?.activeId;
    if (!activeId || !state.appState.contests?.[activeId]) return;
    
    state.appState.contests[activeId].historicalCutoffs = safeClone(cutoffs);
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }
  }),

  updateCoachScore: (score) => set((state) => {
    const activeId = state.appState?.activeId;
    if (!activeId || !state.appState.contests?.[activeId]) return;
    const currentScore = state.appState.contests[activeId].coachScore;
    const newScore = safeNumber(score, currentScore);
    if (Object.is(currentScore, newScore)) return;
    
    state.appState.contests[activeId].coachScore = newScore;
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }
  }),

  setExamConfig: (durationMinutes, totalQuestions) => set((state) => {
    const activeId = state.appState?.activeId;
    if (!activeId || !state.appState.contests?.[activeId]) return;
    const dMin = safeNumber(durationMinutes, 240);
    const tQ = safeNumber(totalQuestions, 100);
    
    state.appState.contests[activeId].examDurationMinutes = dMin;
    state.appState.contests[activeId].examTotalQuestions = tQ;
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }
  }),

  recordCalibrationMetric: (categoryId, metric) => set((state) => {
    const activeId = state.appState?.activeId;
    if (!activeId || !state.appState.contests?.[activeId]) return;
    const activeData = state.appState.contests[activeId];
    
    const currentMetrics = activeData.calibrationMetrics || {};
    const history = currentMetrics[categoryId] || [];
    
    const newMetrics = [...history, {
      ...metric,
      timestamp: new Date().toISOString()
    }].slice(-50);

    if (!activeData.calibrationMetrics) {
      activeData.calibrationMetrics = {};
    }
    activeData.calibrationMetrics[categoryId] = newMetrics;
    
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }
  })
});
