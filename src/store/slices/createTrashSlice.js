import { generateId } from '../../utils/idGenerator.js';
import { safeClone } from '../../utils/safeClone.js';
import { markStorageDirty } from '../../utils/storageSafe.js';

export const createTrashSlice = (set) => ({
    restoreFromTrash: (trashId) => set((state) => {
        if (!state.appState.trash) return;
        const index = state.appState.trash.findIndex(t => t.id === trashId);
        if (index === -1) return;

        const item = state.appState.trash[index];
        if (item.type === 'category') {
            const targetContestId = state.appState.contests[item.contestId] ? item.contestId : state.appState.activeId;
            const contest = state.appState.contests[targetContestId];
            if (!contest) {
                console.warn('[Trash] Concurso de destino não encontrado. Restauração adiada para evitar perda de dados.');
                return;
            }

            if (!contest.categories) contest.categories = [];
            const catData = safeClone(item.data.category || item.data);
            const oldId = catData.id;
            if (contest.categories.some(c => c.id === oldId)) {
                catData.id = generateId('cat');
            }
            const newId = catData.id;
            contest.categories.push(catData);

            const fixRef = (arr) => (arr || []).map(entry =>
                (entry && typeof entry === 'object' && entry.categoryId === oldId)
                    ? { ...entry, categoryId: newId }
                    : entry
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

            // Restaurar tarefas de coachPlan que foram arquivadas junto com a categoria
            if (item.data.coachPlan && Array.isArray(item.data.coachPlan) && item.data.coachPlan.length > 0) {
                const currentPlan = Array.isArray(contest.coachPlan) ? contest.coachPlan : Object.values(contest.coachPlan || {});
                contest.coachPlan = [...currentPlan, ...fixRef(item.data.coachPlan)];
            } else if (contest.coachPlan && Array.isArray(contest.coachPlan)) {
                // Legado: atualizar referências se houver
                contest.coachPlan = contest.coachPlan.map(task =>
                    task?.categoryId === oldId ? { ...task, categoryId: newId } : task
                );
            }

            // Restaurar tarefas de coachPlanner que foram arquivadas junto com a categoria
            if (item.data.coachPlanner && typeof item.data.coachPlanner === 'object') {
                if (!contest.coachPlanner || typeof contest.coachPlanner !== 'object') {
                    contest.coachPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
                }
                Object.keys(item.data.coachPlanner).forEach(day => {
                    const currentDay = Array.isArray(contest.coachPlanner[day]) ? contest.coachPlanner[day] : [];
                    contest.coachPlanner[day] = [...currentDay, ...fixRef(item.data.coachPlanner[day])];
                });
            } else if (contest.coachPlanner && typeof contest.coachPlanner === 'object') {
                // Legado: atualizar referências se houver
                Object.keys(contest.coachPlanner).forEach(day => {
                    if (Array.isArray(contest.coachPlanner[day])) {
                        contest.coachPlanner[day] = contest.coachPlanner[day].map(task =>
                            task?.categoryId === oldId ? { ...task, categoryId: newId } : task
                        );
                    }
                });
            }
        } else if (item.type === 'contest') {
            let newId = item.contestId;
            if (state.appState.contests[newId]) {
                newId = generateId('contest');
            }
            const contestPayload = safeClone(item.data) || {};
            if (contestPayload && typeof contestPayload === 'object') {
                contestPayload.id = newId;
            }
            state.appState.contests[newId] = contestPayload;
            state.appState.activeId = newId;
        }
        state.appState.trash.splice(index, 1);
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),

    emptyTrash: () => set((state) => {
        state.appState.trash = [];
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),
});

