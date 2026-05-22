import { generateId } from '../../utils/idGenerator';
import { safeClone } from '../safeClone.js';

export const createTrashSlice = (set) => ({
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

                const catData = safeClone(item.data.category || item.data);
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
                    const safeLogs = Array.isArray(contest.studyLogs) ? contest.studyLogs : Object.values(contest.studyLogs || {});
                    contest.studyLogs = [...safeLogs, ...fixRef(item.data.studyLogs)];
                }
                if (item.data.studySessions) {
                    const safeSessions = Array.isArray(contest.studySessions) ? contest.studySessions : Object.values(contest.studySessions || {});
                    contest.studySessions = [...safeSessions, ...fixRef(item.data.studySessions)];
                }
                if (item.data.simuladoRows?.length) {
                    const safeRows = Array.isArray(contest.simuladoRows) ? contest.simuladoRows : Object.values(contest.simuladoRows || {});
                    contest.simuladoRows = [...safeRows, ...fixRef(item.data.simuladoRows)];
                }
                if (item.data.simulados?.length) {
                    const safeSimulados = Array.isArray(contest.simulados) ? contest.simulados : Object.values(contest.simulados || {});
                    contest.simulados = [...safeSimulados, ...fixRef(item.data.simulados)];
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
