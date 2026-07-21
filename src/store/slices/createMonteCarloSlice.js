import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { safeClone } from '../../utils/cloneHelper.js';

function safeNumber(val, fallback = 0) {
    if (val === null || val === undefined || val === '') return fallback;
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
}

export const createMonteCarloSlice = (set) => ({
    recordMonteCarloSnapshot: (date, prob, metadata = {}) => set((state) => {
        try {
            const activeId = state.appState?.activeId;
            if (!activeId) return state;
            const activeData = state.appState.contests?.[activeId];
            if (!activeData) return state;

            // FIX: clone structural to prevent mutation side-effects
            const history = safeClone(Array.isArray(activeData.monteCarloHistory) ? activeData.monteCarloHistory : []);
            
            const rawProb = safeNumber(prob, null);
            if (rawProb === null) return state; 
            
            const snapshot = { 
                date: getDateKey(normalizeDate(date)), 
                probability: rawProb, 
                ...safeClone(metadata) 
            };
            
            const targetDateStr = snapshot.date;
            const idx = history.findIndex(h => getDateKey(normalizeDate(h.date)) === targetDateStr);

            if (idx >= 0) {
                history[idx] = { ...history[idx], ...snapshot };
            } else {
                history.push(snapshot);
            }

            // sort limit
            const newHistory = history.sort((a, b) => {
                const timeA = new Date(a.date).getTime() || 0;
                const timeB = new Date(b.date).getTime() || 0;
                return timeA - timeB;
            }).slice(-30);

            const newState = safeClone(state);
            newState.appState.contests[activeId].monteCarloHistory = newHistory;
            newState.appState.version = (newState.appState.version || 0) + 1;
            newState.appState.lastUpdated = new Date().toISOString();
            localStorage.setItem('ultra-sync-dirty', 'true');
            return newState;
        } catch (e) {
            console.warn('Error saving MC snapshot:', e);
            return state;
        }
    }),

    setMcEqualWeights: (enabled) => set((state) => {
        const newState = safeClone(state);
        newState.appState.mcEqualWeights = Boolean(enabled);
        newState.appState.version = (newState.appState.version || 0) + 1;
        newState.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
        return newState;
    }),

    setHistoricalCutoffs: (cutoffs) => set((state) => {
        const activeId = state.appState?.activeId;
        if (!activeId || !state.appState.contests?.[activeId]) return state;

        const newState = safeClone(state);
        newState.appState.contests[activeId].historicalCutoffs = safeClone(cutoffs);
        newState.appState.version = (newState.appState.version || 0) + 1;
        newState.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
        return newState;
    }),

    updateCoachScore: (score) => set((state) => {
        const activeId = state.appState?.activeId;
        if (!activeId || !state.appState.contests?.[activeId]) return state;

        const currentScore = state.appState.contests[activeId].coachScore;
        const newScore = safeNumber(score, currentScore);

        if (Object.is(currentScore, newScore)) return state;

        const newState = safeClone(state);
        newState.appState.contests[activeId].coachScore = newScore;
        newState.appState.version = (newState.appState.version || 0) + 1;
        newState.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
        return newState;
    }),

    setExamConfig: (durationMinutes, totalQuestions) => set((state) => {
        const activeId = state.appState?.activeId;
        if (!activeId || !state.appState.contests?.[activeId]) return state;

        const dMin = safeNumber(durationMinutes, 240);
        const tQ = safeNumber(totalQuestions, 100);

        const newState = safeClone(state);
        newState.appState.contests[activeId].examDurationMinutes = dMin;
        newState.appState.contests[activeId].examTotalQuestions = tQ;
        newState.appState.version = (newState.appState.version || 0) + 1;
        newState.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
        return newState;
    })
});
