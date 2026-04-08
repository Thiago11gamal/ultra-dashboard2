import { generateId } from '../../utils/idGenerator';
import { INITIAL_DATA } from '../../data/initialData';

export const createContestSlice = (set, get) => ({
    switchContest: (contestId) => set((state) => {
        const targetId = state.appState.contests[contestId] ? contestId : (Object.keys(state.appState.contests)[0] || 'default');
        
        state.appState.activeId = targetId;
        const activeData = state.appState.contests[targetId];
        if (activeData && !activeData.coachPlanner) {
            activeData.coachPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    createNewContest: () => set((state) => {
        const newId = generateId('contest');
        const initialClone = JSON.parse(JSON.stringify(INITIAL_DATA));
        const newContestData = {
            ...initialClone,
            simuladoRows: [],
            simulados: [],
            categories: [],
            mcWeights: {}
        };
        state.appState.contests[newId] = newContestData;
        state.appState.activeId = newId;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    deleteContest: (contestId) => set((state) => {
        const contestData = state.appState.contests[contestId];
        if (contestData) {
            if (!state.appState.trash) state.appState.trash = [];
            state.appState.trash.push({
                id: generateId('trash'),
                type: 'contest',
                contestId: contestId,
                data: JSON.parse(JSON.stringify(contestData)),
                deletedAt: new Date().toISOString()
            });
        }

        delete state.appState.contests[contestId];
        const remainingIds = Object.keys(state.appState.contests);
        if (remainingIds.length === 0) {
            state.appState.contests['default'] = JSON.parse(JSON.stringify(INITIAL_DATA));
            state.appState.activeId = 'default';
        } else if (contestId === state.appState.activeId) {
            state.appState.activeId = remainingIds[0];
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
