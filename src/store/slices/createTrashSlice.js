import { generateId } from '../../utils/idGenerator';

export const createTrashSlice = (set, get) => ({
    restoreFromTrash: (trashId) => set((state) => {
        if (!state.appState.trash) return;
        const index = state.appState.trash.findIndex(t => t.id === trashId);
        if (index === -1) return;
        
        const item = state.appState.trash[index];
        
        if (item.type === 'category') {
            const targetContestId = state.appState.contests[item.contestId] ? item.contestId : state.appState.activeId;
            const contest = state.appState.contests[targetContestId];
            if (contest) {
                if (!contest.categories) contest.categories = [];
                
                const catData = JSON.parse(JSON.stringify(item.data.category || item.data));
                const oldId = catData.id;
                
                if (contest.categories.some(c => c.id === oldId)) {
                    catData.id = generateId('cat');
                }
                const newId = catData.id;
                contest.categories.push(catData);

                const fixRef = (arr) => (arr || []).map(entry => 
                    entry.categoryId === oldId ? { ...entry, categoryId: newId } : entry
                );

                if (item.data.studyLogs) {
                    contest.studyLogs = [...(contest.studyLogs || []), ...fixRef(item.data.studyLogs)];
                }
                if (item.data.studySessions) {
                    contest.studySessions = [...(contest.studySessions || []), ...fixRef(item.data.studySessions)];
                }
                if (item.data.mcWeight !== undefined) {
                    if (!contest.mcWeights) contest.mcWeights = {};
                    contest.mcWeights[newId] = item.data.mcWeight;
                }
            }
        } else if (item.type === 'contest') {
            let newId = item.contestId;
            if (state.appState.contests[newId]) {
                newId = generateId('contest');
            }
            state.appState.contests[newId] = item.data;
            state.appState.activeId = newId;
        }
        
        state.appState.trash.splice(index, 1);
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    emptyTrash: () => set((state) => {
        state.appState.trash = [];
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),
});
