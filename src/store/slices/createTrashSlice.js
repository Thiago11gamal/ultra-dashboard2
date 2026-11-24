import { generateId } from '../../utils/idGenerator.js';
import { safeClone } from '../../utils/safeClone.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { addCategoryTombstones, removeCategoryTombstone } from '../../utils/tombstones.js';
import { normalize } from '../../utils/normalization.js';
import { reconcileContestCategoriesHistory } from '../../utils/simuladoReconciler.js';

export const createTrashSlice = (set) => ({
    archiveToTrash: (entry) => set((state) => {
        if (!entry || typeof entry !== 'object' || !entry.type || !entry.data) return;
        const nowIso = new Date().toISOString();
        if (!Array.isArray(state.appState.trash)) state.appState.trash = [];
        state.appState.trash = [
            ...state.appState.trash,
            {
                id: entry.id || generateId('trash'),
                type: entry.type,
                contestId: entry.contestId || state.appState.activeId || 'default',
                deletedAt: entry.deletedAt || nowIso,
                data: safeClone(entry.data),
            }
        ].slice(-50);
    }),

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
            removeCategoryTombstone(oldId, catData.name, targetContestId);
            removeCategoryTombstone(newId, catData.name, targetContestId);

            // Atualizar categoryId nas tasks internas se o ID mudou
            if (catData.id !== oldId && catData.tasks) {
                if (Array.isArray(catData.tasks)) {
                    catData.tasks = catData.tasks.map(task => (task ? {
                        ...task,
                        categoryId: newId
                    } : task));
                } else if (typeof catData.tasks === 'object') {
                    Object.keys(catData.tasks).forEach(key => {
                        if (catData.tasks[key]) {
                            catData.tasks[key].categoryId = newId;
                        }
                    });
                }
            }

            const nowIso = new Date().toISOString();
            catData.lastUpdated = nowIso;
            catData.updatedAt = nowIso;
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
            contest.lastUpdated = new Date().toISOString();
        } else if (item.type === 'contest') {
            const nowIso = new Date().toISOString();
            let newId = item.contestId;
            if (state.appState.contests[newId]) {
                newId = generateId('contest');
            }
            const contestPayload = safeClone(item.data) || {};
            if (contestPayload && typeof contestPayload === 'object') {
                contestPayload.id = newId;
                contestPayload.lastUpdated = nowIso;
            }
            state.appState.contests[newId] = contestPayload;
            state.appState.activeId = newId;
            if (Array.isArray(state.appState.deletedContestIds)) {
                state.appState.deletedContestIds = state.appState.deletedContestIds.filter(d => {
                    const cid = typeof d === 'string' ? d : d?.contestId;
                    return cid !== item.contestId && cid !== newId;
                });
            }
        } else if (item.type === 'task') {
            const targetContestId = state.appState.contests[item.contestId] ? item.contestId : state.appState.activeId;
            const contest = state.appState.contests[targetContestId];
            if (!contest) return;
            const cats = Array.isArray(contest.categories) ? contest.categories : Object.values(contest.categories || {});
            const taskData = safeClone(item.data?.task || item.data);
            if (!taskData) return;
            const cat = cats.find(c => c && (String(c.id) === String(item.data?.categoryId) || c.name === item.data?.categoryName)) || cats[0];
            if (cat) {
                const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                const normText = normalize(String(taskData.text || taskData.title || ''));
                if (!tasks.some(t => t && (t.id === taskData.id || normalize(String(t.text || t.title || '')) === normText))) {
                    tasks.push({ ...taskData, updatedAt: new Date().toISOString() });
                }
                cat.tasks = tasks;
                if (Array.isArray(cat.deletedTaskIds)) {
                    cat.deletedTaskIds = cat.deletedTaskIds.filter(e => e && e.id !== String(taskData.id) && e.text !== normText);
                }
                contest.categories = cats;
                contest.lastUpdated = new Date().toISOString();
            }
        } else if (item.type === 'flashcard_deck') {
            const targetContestId = state.appState.contests[item.contestId] ? item.contestId : state.appState.activeId;
            const contest = state.appState.contests[targetContestId];
            if (!contest) return;
            const deckData = safeClone(item.data);
            if (!deckData) return;
            const decks = Array.isArray(contest.flashcardDecks) ? contest.flashcardDecks : Object.values(contest.flashcardDecks || {});
            if (decks.some(d => d && d.id === deckData.id)) {
                deckData.id = generateId('deck');
            }
            deckData.lastUpdated = new Date().toISOString();
            contest.flashcardDecks = [...decks, deckData];
            if (Array.isArray(contest.deletedFlashcardDeckIds)) {
                contest.deletedFlashcardDeckIds = contest.deletedFlashcardDeckIds.filter(e => e && e.id !== item.data?.id);
            }
            contest.lastUpdated = new Date().toISOString();
        } else if (item.type === 'agenda_event') {
            const targetContestId = state.appState.contests[item.contestId] ? item.contestId : state.appState.activeId;
            const contest = state.appState.contests[targetContestId];
            if (!contest) return;
            const evData = safeClone(item.data);
            if (!evData) return;
            const agenda = Array.isArray(contest.agenda) ? contest.agenda : Object.values(contest.agenda || {});
            if (agenda.some(e => e && e.id === evData.id)) {
                evData.id = generateId('agenda');
            }
            contest.agenda = [...agenda, evData];
            if (Array.isArray(contest.deletedAgendaIds)) {
                contest.deletedAgendaIds = contest.deletedAgendaIds.filter(e => e && e.id !== item.data?.id);
            }
            contest.lastUpdated = new Date().toISOString();
        } else if (item.type === 'simulado') {
            const targetContestId = state.appState.contests[item.contestId] ? item.contestId : state.appState.activeId;
            const contest = state.appState.contests[targetContestId];
            if (!contest) return;
            const restoredRows = safeClone(item.data?.rows || []);
            const restoredSims = safeClone(item.data?.simulados || []);
            const currentRows = Array.isArray(contest.simuladoRows) ? contest.simuladoRows : Object.values(contest.simuladoRows || {});
            const currentSims = Array.isArray(contest.simulados) ? contest.simulados : Object.values(contest.simulados || {});
            const rowIds = new Set(currentRows.map(r => r?.id).filter(Boolean));
            const simIds = new Set(currentSims.map(s => s?.id).filter(Boolean));
            contest.simuladoRows = [...currentRows, ...restoredRows.filter(r => r && (!r.id || !rowIds.has(r.id)))];
            contest.simulados = [...currentSims, ...restoredSims.filter(s => s && (!s.id || !simIds.has(s.id)))];
            if (contest.categories) {
                contest.categories = reconcileContestCategoriesHistory(
                    contest.categories,
                    contest.simuladoRows,
                    contest.maxScore,
                    contest.minScore,
                    { penaltyPerWrong: contest.penaltyPerWrong }
                );
            }
            contest.lastUpdated = new Date().toISOString();
        }
        state.appState.trash.splice(index, 1);
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        markStorageDirty();
    }),

    emptyTrash: () => set((state) => {
        const nowIso = new Date().toISOString();
        if (Array.isArray(state.appState.trash)) {
            state.appState.trash
                .filter(item => item?.type === 'category')
                .forEach(item => {
                    const catData = item.data?.category || item.data;
                    if (catData && (catData.id || catData.name)) {
                        const targetContestId = item.contestId || state.appState?.activeId || null;
                        const targetContest = targetContestId ? state.appState?.contests?.[targetContestId] : null;
                        const activeCats = Array.isArray(targetContest?.categories)
                            ? targetContest.categories
                            : Object.values(targetContest?.categories || {});
                        const normTrashedName = String(catData.name || '').trim().toLowerCase();
                        const hasLiveSameName = Boolean(
                            normTrashedName &&
                            activeCats.some(c => c && String(c.name || '').trim().toLowerCase() === normTrashedName)
                        );
                        addCategoryTombstones(
                            { id: catData.id, name: hasLiveSameName ? null : catData.name },
                            item.contestId || null
                        );
                    }
                });
            const contestDeletions = state.appState.trash
                .filter(item => item?.type === 'contest' && item?.contestId && item?.reason !== 'cloud-sync');
            if (contestDeletions.length > 0) {
                const map = new Map();
                (Array.isArray(state.appState.deletedContestIds) ? state.appState.deletedContestIds : []).forEach(d => {
                    const cid = typeof d === 'string' ? d : d?.contestId;
                    if (cid) map.set(cid, { contestId: cid, deletedAt: d?.deletedAt || nowIso });
                });
                contestDeletions.forEach(item => {
                    if (!state.appState.contests?.[item.contestId]) {
                        map.set(item.contestId, { contestId: item.contestId, deletedAt: item.deletedAt || nowIso });
                    }
                });
                state.appState.deletedContestIds = Array.from(map.values()).slice(-50);
            }
        }
        state.appState.trash = [];
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = nowIso;
        markStorageDirty();
    }),
});

