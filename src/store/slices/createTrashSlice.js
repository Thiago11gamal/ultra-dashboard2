import { generateId } from '../../utils/idGenerator.js';
import { safeClone } from '../../utils/safeClone.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { addCategoryTombstones, removeCategoryTombstone } from '../../utils/tombstones.js';
import { normalize } from '../../utils/normalization.js';
import { reconcileContestCategoriesHistory, computeCategorySimuladoStats, DEFAULT_SIMULADO_HISTORY_CAP } from '../../utils/simuladoReconciler.js';
import { getTaskXP } from '../../utils/gamification.js';
import { clearCoachCaches } from '../../utils/coachCaches.js';
import { INITIAL_DATA } from '../../data/initialData.js';
import { PRESET_CATEGORY_COLORS } from '../../utils/colorHelper.js';

const resetPomodoroOnContestChange = (state) => {
    if (!state?.appState?.pomodoro) return;
    if (
        state.appState.pomodoro.activeSubject ||
        state.appState.pomodoro.isRunning ||
        (state.appState.pomodoro.accumulatedMinutes || 0) > 0
    ) {
        state.appState.pomodoro = {
            activeSubject: null,
            sessions: 1,
            targetCycles: state.appState.pomodoro?.targetCycles || 1,
            completedCycles: 0,
            accumulatedMinutes: 0,
            mode: 'work',
            neuralQueue: [],
            neuralMode: false,
            isRunning: false,
        };
        try { localStorage.removeItem('pomodoroState'); } catch { /* ignore */ }
        try { localStorage.removeItem('pomodoro-endsAt'); } catch { /* ignore */ }
    }
};

const resolveOrRecreateContestForItem = (state, item) => {
    const contests = state.appState.contests || {};
    if (!item?.contestId) {
        return contests[state.appState.activeId] ? state.appState.activeId : Object.keys(contests)[0];
    }
    if (contests[item.contestId]) {
        return item.contestId;
    }

    const nowIso = new Date().toISOString();
    const trashedContestIdx = Array.isArray(state.appState.trash)
        ? state.appState.trash.findIndex(t => t && t.type === 'contest' && t.contestId === item.contestId && t.id !== item.id)
        : -1;

    if (trashedContestIdx !== -1) {
        const trashedContest = state.appState.trash[trashedContestIdx];
        const restoredContest = safeClone(trashedContest.data) || {};
        restoredContest.id = item.contestId;
        restoredContest.lastUpdated = nowIso;
        state.appState.contests[item.contestId] = restoredContest;
        state.appState.trash.splice(trashedContestIdx, 1);
    } else {
        const label = item.contestName || 'Painel Recuperado';
        const baseClone = safeClone(INITIAL_DATA);
        state.appState.contests[item.contestId] = {
            ...baseClone,
            id: item.contestId,
            contestName: label,
            name: label,
            user: { ...(baseClone.user || {}), name: label },
            categories: [],
            simuladoRows: [],
            simulados: [],
            studyLogs: [],
            studySessions: [],
            flashcardDecks: [],
            agenda: [],
            studyNotes: [],
            mcWeights: {},
            historicalCutoffs: [],
            lastUpdated: nowIso,
        };
    }

    if (Array.isArray(state.appState.deletedContestIds)) {
        state.appState.deletedContestIds = state.appState.deletedContestIds.filter(d => {
            const cid = typeof d === 'string' ? d : d?.contestId;
            return cid !== item.contestId;
        });
    }

    return item.contestId;
};

export const createTrashSlice = (set, get) => ({
    archiveToTrash: (entry) => set((state) => {
        if (!entry || typeof entry !== 'object' || !entry.type || !entry.data) return;
        const nowIso = new Date().toISOString();
        const cid = entry.contestId || state.appState.activeId || 'default';
        const liveContest = state.appState.contests?.[cid];
        const contestName = entry.contestName || liveContest?.contestName || liveContest?.name || liveContest?.user?.name || null;
        if (!Array.isArray(state.appState.trash)) state.appState.trash = [];
        state.appState.trash = [
            ...state.appState.trash,
            {
                id: entry.id || generateId('trash'),
                type: entry.type,
                contestId: cid,
                ...(contestName ? { contestName } : {}),
                deletedAt: entry.deletedAt || nowIso,
                data: safeClone(entry.data),
            }
        ].slice(-50);
    }),

    restoreFromTrash: (trashId) => {
        let restoredCompletedTaskXp = 0;
        let restoredTaskContestId = null;
        set((state) => {
        if (!state.appState.trash) return;
        const initialIndex = state.appState.trash.findIndex(t => t.id === trashId);
        if (initialIndex === -1) return;

        const item = state.appState.trash[initialIndex];
        if (item.type === 'category') {
            const targetContestId = resolveOrRecreateContestForItem(state, item);
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
            if (item.data.studyNotes?.length) {
                const safeNotes = Array.isArray(contest.studyNotes) ? contest.studyNotes : Object.values(contest.studyNotes || {});
                const noteIds = new Set(safeNotes.map(n => n?.id).filter(Boolean));
                const restoredNotes = fixRef(item.data.studyNotes).filter(n => n && (!n.id || !noteIds.has(n.id)));
                contest.studyNotes = [...restoredNotes, ...safeNotes];
                if (Array.isArray(contest.deletedStudyNoteIds) && restoredNotes.length > 0) {
                    const restoredNoteIdSet = new Set(restoredNotes.map(n => String(n.id)));
                    contest.deletedStudyNoteIds = contest.deletedStudyNoteIds.filter(e => e && !restoredNoteIdSet.has(String(e.id)));
                }
            } else if (Array.isArray(contest.studyNotes)) {
                contest.studyNotes = fixRef(contest.studyNotes);
            }
            if (item.data.flashcardDecks?.length) {
                const safeDecks = Array.isArray(contest.flashcardDecks) ? contest.flashcardDecks : Object.values(contest.flashcardDecks || {});
                const deckIds = new Set(safeDecks.map(d => d?.id).filter(Boolean));
                const restoredDecks = fixRef(item.data.flashcardDecks).filter(d => d && (!d.id || !deckIds.has(d.id)));
                contest.flashcardDecks = [...safeDecks, ...restoredDecks];
                if (Array.isArray(contest.deletedFlashcardDeckIds) && restoredDecks.length > 0) {
                    const restoredDeckIdSet = new Set(restoredDecks.map(d => String(d.id)));
                    contest.deletedFlashcardDeckIds = contest.deletedFlashcardDeckIds.filter(e => e && !restoredDeckIdSet.has(String(e.id)));
                }
            } else if (Array.isArray(contest.flashcardDecks)) {
                contest.flashcardDecks = fixRef(contest.flashcardDecks);
            }
            if (item.data.agenda?.length) {
                const safeAgenda = Array.isArray(contest.agenda) ? contest.agenda : Object.values(contest.agenda || {});
                const evIds = new Set(safeAgenda.map(e => e?.id).filter(Boolean));
                const restoredEvents = fixRef(item.data.agenda).filter(e => e && (!e.id || !evIds.has(e.id)));
                contest.agenda = [...safeAgenda, ...restoredEvents];
                if (Array.isArray(contest.deletedAgendaIds) && restoredEvents.length > 0) {
                    const restoredEvIdSet = new Set(restoredEvents.map(e => String(e.id)));
                    contest.deletedAgendaIds = contest.deletedAgendaIds.filter(e => e && !restoredEvIdSet.has(String(e.id)));
                }
            } else if (Array.isArray(contest.agenda)) {
                contest.agenda = fixRef(contest.agenda);
            }
            if (Number(item.data.deductedXP) > 0) {
                restoredCompletedTaskXp = Number(item.data.deductedXP);
                restoredTaskContestId = targetContestId;
            }
            contest.lastUpdated = new Date().toISOString();
        } else if (item.type === 'contest') {
            const nowIso = new Date().toISOString();
            const prevActiveId = state.appState.activeId;
            let newId = item.contestId;
            if (state.appState.contests[newId]) {
                newId = generateId('contest');
            }
            const contestPayload = safeClone(item.data) || {};
            if (contestPayload && typeof contestPayload === 'object') {
                contestPayload.id = newId;
                contestPayload.lastUpdated = nowIso;
            }
            if (prevActiveId !== newId) {
                resetPomodoroOnContestChange(state);
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
            const targetContestId = resolveOrRecreateContestForItem(state, item);
            const contest = state.appState.contests[targetContestId];
            if (!contest) return;
            const cats = Array.isArray(contest.categories) ? [...contest.categories] : Object.values(contest.categories || {});
            const taskData = safeClone(item.data?.task || item.data);
            if (!taskData) return;
            let cat = cats.find(c => c && (
                (item.data?.categoryId && String(c.id) === String(item.data.categoryId)) ||
                (item.data?.categoryName && normalize(c.name || '') === normalize(item.data.categoryName))
            ));
            if (!cat) {
                if (!item.data?.categoryId && !item.data?.categoryName && cats.length > 0) {
                    cat = cats[0];
                } else {
                    const nowIso = new Date().toISOString();
                    const recreatedId = item.data?.categoryId || generateId('cat');
                    const recreatedName = item.data?.categoryName || 'Geral';
                    removeCategoryTombstone(recreatedId, recreatedName, targetContestId);
                    cat = {
                        id: recreatedId,
                        name: recreatedName,
                        icon: item.data?.categoryIcon || '📚',
                        color: PRESET_CATEGORY_COLORS[cats.length % PRESET_CATEGORY_COLORS.length],
                        tasks: [],
                        weight: 10,
                        maxScore: Number(contest.maxScore) > 0 ? Number(contest.maxScore) : 100,
                        minScore: Number.isFinite(Number(contest.minScore)) ? Number(contest.minScore) : 0,
                        minCutoff: null,
                        simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: '-' },
                        totalMinutes: 0,
                        lastStudiedAt: null,
                        createdAt: nowIso,
                        lastUpdated: nowIso,
                        updatedAt: nowIso,
                    };
                    cats.push(cat);
                }
            }
            if (cat) {
                const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                const normText = normalize(String(taskData.text || taskData.title || ''));
                if (!tasks.some(t => t && (t.id === taskData.id || normalize(String(t.text || t.title || '')) === normText))) {
                    tasks.push({ ...taskData, categoryId: cat.id, updatedAt: new Date().toISOString() });
                    if (taskData.completed) {
                        const rawAwarded = taskData.awardedXP;
                        restoredCompletedTaskXp = (rawAwarded !== undefined && rawAwarded !== null && Number.isFinite(Number(rawAwarded)))
                            ? Math.abs(Number(rawAwarded))
                            : Math.abs(getTaskXP(taskData, true));
                        restoredTaskContestId = targetContestId;
                    }
                }
                cat.tasks = tasks;
                if (Array.isArray(cat.deletedTaskIds)) {
                    cat.deletedTaskIds = cat.deletedTaskIds.filter(e => e && e.id !== String(taskData.id) && e.text !== normText);
                }
                contest.categories = cats;
                contest.lastUpdated = new Date().toISOString();
            }
        } else if (item.type === 'flashcard_deck') {
            const targetContestId = resolveOrRecreateContestForItem(state, item);
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
            const targetContestId = resolveOrRecreateContestForItem(state, item);
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
            const targetContestId = resolveOrRecreateContestForItem(state, item);
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
                const reconciledCats = reconcileContestCategoriesHistory(
                    contest.categories,
                    contest.simuladoRows,
                    contest.maxScore,
                    contest.minScore,
                    { penaltyPerWrong: contest.penaltyPerWrong }
                );
                contest.categories = reconciledCats.map((cat) => {
                    if (!cat || typeof cat !== 'object') return cat;
                    const hist = Array.isArray(cat.simuladoStats?.history)
                        ? cat.simuladoStats.history
                        : Object.values(cat.simuladoStats?.history || {});
                    return {
                        ...cat,
                        simuladoStats: computeCategorySimuladoStats(
                            cat,
                            hist,
                            contest.maxScore,
                            contest.minScore,
                            { maxHistory: DEFAULT_SIMULADO_HISTORY_CAP }
                        ),
                    };
                });
            }
            contest.lastUpdated = new Date().toISOString();
        } else if (item.type === 'study_note') {
            const targetContestId = resolveOrRecreateContestForItem(state, item);
            const contest = state.appState.contests[targetContestId];
            if (!contest) return;
            const noteData = safeClone(item.data);
            if (!noteData) return;
            const notes = Array.isArray(contest.studyNotes) ? contest.studyNotes : Object.values(contest.studyNotes || {});
            if (notes.some(n => n && n.id === noteData.id)) {
                noteData.id = generateId('note');
            }
            contest.studyNotes = [noteData, ...notes];
            if (Array.isArray(contest.deletedStudyNoteIds)) {
                contest.deletedStudyNoteIds = contest.deletedStudyNoteIds.filter(e => e && e.id !== item.data?.id);
            }
            contest.lastUpdated = new Date().toISOString();
        }
        const removeIdx = state.appState.trash.findIndex(t => t.id === trashId);
        if (removeIdx !== -1) {
            state.appState.trash.splice(removeIdx, 1);
        }
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = new Date().toISOString();
        clearCoachCaches();
        markStorageDirty();
        });
        if (
            restoredCompletedTaskXp > 0 &&
            typeof get === 'function' &&
            typeof get()?.awardExperience === 'function' &&
            get()?.appState?.activeId === restoredTaskContestId
        ) {
            get().awardExperience(restoredCompletedTaskXp, { skipVersionBump: true });
        }
    },

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

