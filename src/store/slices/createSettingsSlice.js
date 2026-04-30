import { validateAppState } from '../schemas';

export const createSettingsSlice = (set) => ({
    setHasSeenTour: (value) => set((state) => {
        if (state.appState.hasSeenTour === value) return;
        state.appState.hasSeenTour = value;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    setDashboardFilter: (filter) => set((state) => {
        state.appState.dashboardFilter = filter || 'all';
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    updateCoachPlanner: (newPlannerData) => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        if (JSON.stringify(activeData.coachPlanner) === JSON.stringify(newPlannerData)) return;
        activeData.coachPlanner = newPlannerData;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    setThemeMode: () => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        if (!activeData.settings) activeData.settings = {};
        activeData.settings.darkMode = true;
    }),

    toggleDarkMode: () => set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        if (!activeData.settings) activeData.settings = {};
        activeData.settings.darkMode = true;
    }),

    setAppState: (newStateObj) => set((state) => {
        let nextState = typeof newStateObj === 'function' ? newStateObj(state.appState) : newStateObj;
        if (!nextState) return;

        if (nextState === state.appState) return;

        nextState = validateAppState(nextState);

        const { history, ...otherState } = nextState;
        Object.assign(state.appState, otherState);

        state.appState.lastUpdated = nextState.lastUpdated ?? new Date().toISOString();
    }),

    setData: (newDataCallback, shouldRecordHistory = true) => set((state) => {
        const contestId = state.appState.activeId;
        const currentData = state.appState.contests[contestId];
        if (!currentData) return;

        const nextData = typeof newDataCallback === 'function'
            ? newDataCallback(currentData)
            : newDataCallback;

        if (nextData !== undefined) {
            state.appState.contests[contestId] = nextData;
        }

        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
