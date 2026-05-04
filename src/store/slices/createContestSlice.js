import { generateId } from '../../utils/idGenerator';
import { INITIAL_DATA } from '../../data/initialData';
import { safeClone } from '../safeClone.js';

export const createContestSlice = (set) => ({
    switchContest: (contestId) => set((state) => {
        const targetId = state.appState.contests[contestId] ? contestId : (Object.keys(state.appState.contests)[0] || 'default');
        
        state.appState.activeId = targetId;
        
        // BUG 2 FIX: Limpar pomodoro ao trocar de concurso para evitar corrupção de dados
        if (state.appState.pomodoro.activeSubject) {
            state.appState.pomodoro = { 
                activeSubject: null, 
                sessions: 1, targetCycles: 1, completedCycles: 0, accumulatedMinutes: 0 
            };
            localStorage.removeItem('pomodoroState');
        }

        const activeData = state.appState.contests[targetId];
        if (activeData && !activeData.coachPlanner) {
            activeData.coachPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),

    createNewContest: () => set((state) => {
        const newId = generateId('contest');
        const initialClone = safeClone(INITIAL_DATA);
        const newContestData = {
            ...initialClone,
            contestName: "Novo Concurso",
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
                data: safeClone(contestData),
                deletedAt: new Date().toISOString()
            });
        }

        delete state.appState.contests[contestId];
        const remainingIds = Object.keys(state.appState.contests);
        if (remainingIds.length === 0) {
            state.appState.contests['default'] = safeClone(INITIAL_DATA);
            state.appState.activeId = 'default';
        } else if (contestId === state.appState.activeId) {
            state.appState.activeId = remainingIds[0];
            // Limpa o pomodoro se o concurso ativo foi deletado
            if (state.appState.pomodoro.activeSubject) {
                state.appState.pomodoro = { 
                    activeSubject: null, 
                    sessions: 1, targetCycles: 1, completedCycles: 0, accumulatedMinutes: 0 
                };
                localStorage.removeItem('pomodoroState');
            }
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        localStorage.setItem('ultra-sync-dirty', 'true');
    }),

    setPaineis: (paineis) => set((state) => {
        if (!paineis || typeof paineis !== 'object') return;
        state.appState.contests = paineis;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
    }),
});
