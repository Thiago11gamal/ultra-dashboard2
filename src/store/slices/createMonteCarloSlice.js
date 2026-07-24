import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { safeClone } from '../safeClone.js';

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

            if (!Array.isArray(activeData.monteCarloHistory)) {
                activeData.monteCarloHistory = [];
            }
            
            const rawProb = safeNumber(prob, null);
            if (rawProb === null) return; 
            
            const snapshot = { 
                date: getDateKey(normalizeDate(date)), 
                probability: rawProb, 
                ...safeClone(metadata) 
            };
            
            const targetDateStr = snapshot.date;
            const idx = activeData.monteCarloHistory.findIndex(h => getDateKey(normalizeDate(h.date)) === targetDateStr);

            if (idx >= 0) {
                activeData.monteCarloHistory[idx] = { ...activeData.monteCarloHistory[idx], ...snapshot };
            } else {
                activeData.monteCarloHistory.push(snapshot);
            }

            activeData.monteCarloHistory.sort((a, b) => {
                const timeA = new Date(a.date).getTime() || 0;
                const timeB = new Date(b.date).getTime() || 0;
                return timeA - timeB;
            });
            if (activeData.monteCarloHistory.length > 30) {
                activeData.monteCarloHistory = activeData.monteCarloHistory.slice(-30);
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            localStorage.setItem('ultra-sync-dirty', 'true');
        } catch (e) {
            console.warn('Error saving MC snapshot:', e);
        }
    }),

    setMcEqualWeights: (enabled) => set((state) => {
        state.appState.mcEqualWeights = Boolean(enabled);
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    setHistoricalCutoffs: (cutoffs) => set((state) => {
        const activeId = state.appState?.activeId;
        if (!activeId || !state.appState.contests?.[activeId]) return;

        state.appState.contests[activeId].historicalCutoffs = safeClone(cutoffs);
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
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
        localStorage.setItem('ultra-sync-dirty', 'true');
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
        localStorage.setItem('ultra-sync-dirty', 'true');
    })
});
