import { generateId, getSafeId } from '../../utils/idGenerator.js';
import { normalize } from '../../utils/normalization.js';
import { safeClone } from '../../utils/safeClone.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { addCategoryTombstones, removeCategoryTombstone } from '../../utils/tombstones.js';
import { getCalibrationKey } from '../../utils/coachSafe.js';
import { PRESET_CATEGORY_COLORS } from '../../utils/colorHelper.js';
import { computeCategorySimuladoStats } from '../../utils/simuladoReconciler.js';
import { clearCoachCaches } from '../../utils/coachCaches.js';
import { getTaskXP } from '../../utils/gamification.js';

export const createCategorySlice = (set, get) => ({
    addCategory: (name) => {
        let added = false;
        set((state) => {
            const trimmedName = typeof name === 'string' ? name.trim() : '';
            if (!trimmedName) return;
            const activeData = state.appState.contests[state.appState.activeId];

            if (!activeData) return;
            if (!Array.isArray(activeData.categories)) {
                activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                    ? Object.values(activeData.categories)
                    : [];
            }

            // BUG FIX: Prevent duplicate categories by name
            const normName = normalize(trimmedName);
            if (activeData.categories.some(c => normalize(c?.name || '') === normName)) {
                console.warn(`[Store] Category "${trimmedName}" already exists.`);
                return;
            }

            const catMaxScore = Number(activeData.maxScore) > 0 ? Number(activeData.maxScore) : 100;
            const catMinScore = Number.isFinite(Number(activeData.minScore)) ? Number(activeData.minScore) : 0;
            const newCatId = generateId('cat');
            const catCount = activeData.categories.length;
            const assignedColor = PRESET_CATEGORY_COLORS[catCount % PRESET_CATEGORY_COLORS.length];

            const nowIso = new Date().toISOString();
            activeData.categories.push({
                id: newCatId,
                name: trimmedName,
                color: assignedColor,
                icon: '📚',
                tasks: [],
                weight: 10,
                maxScore: catMaxScore,
                minScore: catMinScore,
                minCutoff: null,
                simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: '-' },
                totalMinutes: 0,
                lastStudiedAt: null,
                createdAt: nowIso,
                lastUpdated: nowIso,
                updatedAt: nowIso
            });

            // ✅ Remove qualquer tombstone prévio para permitir salvar e sincronizar perfeitamente
            removeCategoryTombstone(newCatId, trimmedName, state.appState.activeId);
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            clearCoachCaches();
            markStorageDirty();
            added = true;
        });
        return added;
    },

    deleteCategory: (id) => {
        let xpToDeduct = 0;
        set((state) => {
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        if (!Array.isArray(activeData.categories)) {
            activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                ? Object.values(activeData.categories)
                : [];
        }

        const category = activeData.categories.find(c => c && (c.id === id || c.name === id));
        const targetId = category?.id || id;
        const matchesCatId = (candId) => Boolean(candId) && (candId === targetId || candId === id);

        if (category) {
            addCategoryTombstones({ id: category.id, name: category.name }, state.appState.activeId);
            const normName = category ? normalize(category.name) : null;
            const safeRows = Array.isArray(activeData.simuladoRows) ? activeData.simuladoRows : Object.values(activeData.simuladoRows || {});
            const deletedSimuladoRows = safeRows.filter(r => {
                if (r.categoryId) return matchesCatId(r.categoryId);
                if (normName && r.subject) return normalize(r.subject) === normName;
                return false;
            });

            const matchesCoachTask = (task) => Boolean(
                task && (
                    matchesCatId(task.categoryId) ||
                    (normName && normalize(task.subject || task.category || task.categoryName || task.catName || '') === normName)
                )
            );

            const deletedCoachPlan = Array.isArray(activeData.coachPlan)
                ? activeData.coachPlan.filter(matchesCoachTask)
                : [];

            const deletedCoachPlanner = {};
            if (activeData.coachPlanner && typeof activeData.coachPlanner === 'object') {
                Object.keys(activeData.coachPlanner).forEach(day => {
                    if (Array.isArray(activeData.coachPlanner[day])) {
                        deletedCoachPlanner[day] = activeData.coachPlanner[day].filter(matchesCoachTask);
                    }
                });
            }

            const deletedSessions = (Array.isArray(activeData.studySessions) ? activeData.studySessions : Object.values(activeData.studySessions || {}))
                .filter(s => s && (matchesCatId(s.categoryId) || (normName && normalize(s.subject || s.category || s.categoryName || '') === normName)));
            const deletedNotes = (Array.isArray(activeData.studyNotes) ? activeData.studyNotes : Object.values(activeData.studyNotes || {}))
                .filter(n => n && (matchesCatId(n.categoryId) || (normName && normalize(n.subject || '') === normName)));
            const deletedDecks = (Array.isArray(activeData.flashcardDecks) ? activeData.flashcardDecks : Object.values(activeData.flashcardDecks || {}))
                .filter(d => d && (matchesCatId(d.categoryId) || (normName && normalize(d.subject || d.category || d.categoryName || '') === normName)));
            const deletedAgenda = (Array.isArray(activeData.agenda) ? activeData.agenda : Object.values(activeData.agenda || {}))
                .filter(ev => ev && (matchesCatId(ev.categoryId) || (normName && normalize(ev.subject || ev.category || ev.categoryName || '') === normName)));

            const catTasksList = Array.isArray(category.tasks) ? category.tasks : Object.values(category.tasks || {});
            catTasksList.forEach(t => {
                if (t && t.completed) {
                    const rawAwarded = t.awardedXP;
                    xpToDeduct += (rawAwarded !== undefined && rawAwarded !== null && Number.isFinite(Number(rawAwarded)))
                        ? Math.abs(Number(rawAwarded))
                        : Math.abs(getTaskXP(t, true));
                }
            });
            deletedSessions.forEach(s => {
                if (s && Number.isFinite(Number(s.awardedXP))) {
                    xpToDeduct += Math.max(0, Number(s.awardedXP));
                }
            });

            if (!state.appState.trash) state.appState.trash = [];
            state.appState.trash.push({
                id: generateId('trash'),
                type: 'category',
                contestId: state.appState.activeId,
                contestName: activeData.contestName || activeData.name || activeData.user?.name || null,
                data: safeClone({
                    category: category,
                    studyLogs: (Array.isArray(activeData.studyLogs) ? activeData.studyLogs : Object.values(activeData.studyLogs || {})).filter(l => l && (matchesCatId(l.categoryId) || (normName && normalize(l.subject || l.category || l.categoryName || '') === normName))),
                    studySessions: deletedSessions,
                    simuladoRows: deletedSimuladoRows,
                    simulados: (Array.isArray(activeData.simulados) ? activeData.simulados : Object.values(activeData.simulados || {})).filter(s => s && (matchesCatId(s.categoryId) || (normName && normalize(s.subject || '') === normName))),
                    mcWeight: activeData.mcWeights?.[targetId] ?? activeData.mcWeights?.[id] ?? activeData.mcWeights?.[category.name],
                    coachPlan: deletedCoachPlan,
                    coachPlanner: deletedCoachPlanner,
                    studyNotes: deletedNotes,
                    flashcardDecks: deletedDecks,
                    agenda: deletedAgenda,
                    deductedXP: xpToDeduct
                }),
                deletedAt: new Date().toISOString()
            });
        }

        const name = category?.name;
        const normName = name ? normalize(name) : null;
        activeData.categories = activeData.categories.filter(c => c && !matchesCatId(c.id) && (!normName || normalize(c.name || '') !== normName));

        if (activeData.mcWeights && activeData.mcWeights[targetId] !== undefined) {
            delete activeData.mcWeights[targetId];
        }
        if (activeData.mcWeights && activeData.mcWeights[id] !== undefined) {
            delete activeData.mcWeights[id];
        }
        if (name && activeData.mcWeights && activeData.mcWeights[name] !== undefined) {
            delete activeData.mcWeights[name];
        }

        if (activeData.studyLogs) {
            const safeLogs = Array.isArray(activeData.studyLogs) ? activeData.studyLogs : Object.values(activeData.studyLogs || {});
            activeData.studyLogs = safeLogs.filter(l => l && !matchesCatId(l.categoryId) && (!normName || normalize(l.subject || l.category || l.categoryName || '') !== normName));
        }
        if (activeData.studySessions) {
            const safeSessions = Array.isArray(activeData.studySessions) ? activeData.studySessions : Object.values(activeData.studySessions || {});
            activeData.studySessions = safeSessions.filter(s => s && !matchesCatId(s.categoryId) && (!normName || normalize(s.subject || s.category || s.categoryName || '') !== normName));
        }
        if (activeData.simuladoRows) {
            const safeRows = Array.isArray(activeData.simuladoRows) ? activeData.simuladoRows : Object.values(activeData.simuladoRows || {});
            activeData.simuladoRows = safeRows.filter(r => {
                if (r.categoryId) return !matchesCatId(r.categoryId);
                if (normName && r.subject) return normalize(r.subject) !== normName;
                return true;
            });
        }
        if (activeData.simulados) {
            const safeSimulados = Array.isArray(activeData.simulados) ? activeData.simulados : Object.values(activeData.simulados || {});
            activeData.simulados = safeSimulados.filter(s => s && !matchesCatId(s.categoryId) && (!normName || normalize(s.subject || '') !== normName));
        }

        const activeSub = state.appState.pomodoro?.activeSubject;
        if (activeSub && (matchesCatId(activeSub.categoryId) || (normName && normalize(activeSub.category || '') === normName))) {
            state.appState.pomodoro.activeSubject = null;
            state.appState.pomodoro.isRunning = false;
            state.appState.pomodoro.neuralMode = false;
            state.appState.pomodoro.neuralQueue = [];
            state.appState.pomodoro.mode = 'work';
            state.appState.pomodoro.sessions = 1;
            state.appState.pomodoro.completedCycles = 0;
            state.appState.pomodoro.accumulatedMinutes = 0;
            try {
                localStorage.removeItem('pomodoroState');
                localStorage.removeItem('pomodoro-endsAt');
            } catch {
                // ignore
            }
        }

        const matchesCoachItem = (item) => Boolean(
            item && (
                matchesCatId(item.categoryId) ||
                (normName && normalize(item.subject || item.category || item.categoryName || item.catName || '') === normName)
            )
        );

        if (activeData.coachPlanner) {
            Object.keys(activeData.coachPlanner).forEach(day => {
                if (Array.isArray(activeData.coachPlanner[day])) {
                    activeData.coachPlanner[day] = activeData.coachPlanner[day].filter(item =>
                        !matchesCoachItem(item)
                    );
                }
            });
        }

        if (Array.isArray(activeData.coachPlan)) {
            activeData.coachPlan = activeData.coachPlan.filter(
                task => !matchesCoachItem(task)
            );
        }

        const toSafeKey = (v) => {
            const safe = getSafeId(v);
            return safe && safe !== 'task-null-sentinel' ? String(safe).trim() : '';
        };

        const deletedKeys = new Set(
            [id, category?.id, category?.name]
                .filter(Boolean)
                .flatMap((v) => [String(v), toSafeKey(String(v)), getCalibrationKey(String(v))])
                .map((k) => String(k).trim().toLowerCase())
                .filter((k) => k && k !== 'geral' && k !== 'default' && k !== 'sem_categoria')
        );

        const matchesDeletedCategory = (candidate) => {
            if (!candidate || deletedKeys.size === 0) return false;
            const raw = String(candidate).trim();
            if (!raw) return false;
            return (
                deletedKeys.has(raw.toLowerCase()) ||
                deletedKeys.has(toSafeKey(raw).toLowerCase()) ||
                deletedKeys.has(getCalibrationKey(raw).toLowerCase())
            );
        };

        if (activeData.calibrationHistoryByCategory && typeof activeData.calibrationHistoryByCategory === 'object') {
            Object.keys(activeData.calibrationHistoryByCategory).forEach((k) => {
                if (matchesDeletedCategory(k)) {
                    delete activeData.calibrationHistoryByCategory[k];
                }
            });
        }

        if (activeData.calibrationOps && typeof activeData.calibrationOps === 'object') {
            Object.keys(activeData.calibrationOps).forEach((k) => {
                if (matchesDeletedCategory(k)) {
                    delete activeData.calibrationOps[k];
                }
            });
        }

        if (Array.isArray(activeData.calibrationAuditLog)) {
            activeData.calibrationAuditLog = activeData.calibrationAuditLog.filter(
                (entry) => entry && !matchesDeletedCategory(entry.categoryId || entry.category)
            );
        }

        const nowIso = new Date().toISOString();
        if (activeData.studyNotes) {
            const safeNotes = Array.isArray(activeData.studyNotes) ? activeData.studyNotes : Object.values(activeData.studyNotes || {});
            const removedNoteIds = [];
            activeData.studyNotes = safeNotes.filter(n => {
                if (!n) return false;
                const hit = matchesCatId(n.categoryId) || (normName && normalize(n.subject || '') === normName);
                if (hit && n.id) removedNoteIds.push(n.id);
                return !hit;
            });
            if (removedNoteIds.length > 0) {
                const prevDel = Array.isArray(activeData.deletedStudyNoteIds) ? activeData.deletedStudyNoteIds : [];
                activeData.deletedStudyNoteIds = [...prevDel, ...removedNoteIds.map(nid => ({ id: nid, deletedAt: nowIso }))].slice(-100);
            }
        }
        if (activeData.flashcardDecks) {
            const safeDecks = Array.isArray(activeData.flashcardDecks) ? activeData.flashcardDecks : Object.values(activeData.flashcardDecks || {});
            const removedDeckIds = [];
            activeData.flashcardDecks = safeDecks.filter(d => {
                if (!d) return false;
                const hit = matchesCatId(d.categoryId) || (normName && normalize(d.subject || d.category || d.categoryName || '') === normName);
                if (hit && d.id) removedDeckIds.push(d.id);
                return !hit;
            });
            if (removedDeckIds.length > 0) {
                const prevDel = Array.isArray(activeData.deletedFlashcardDeckIds) ? activeData.deletedFlashcardDeckIds : [];
                activeData.deletedFlashcardDeckIds = [...prevDel, ...removedDeckIds.map(did => ({ id: did, deletedAt: nowIso }))].slice(-100);
            }
        }
        if (activeData.agenda) {
            const safeAgenda = Array.isArray(activeData.agenda) ? activeData.agenda : Object.values(activeData.agenda || {});
            const removedAgendaIds = [];
            activeData.agenda = safeAgenda.filter(ev => {
                if (!ev) return false;
                const hit = matchesCatId(ev.categoryId) || (normName && normalize(ev.subject || ev.category || ev.categoryName || '') === normName);
                if (hit && ev.id) removedAgendaIds.push(ev.id);
                return !hit;
            });
            if (removedAgendaIds.length > 0) {
                const prevDel = Array.isArray(activeData.deletedAgendaIds) ? activeData.deletedAgendaIds : [];
                activeData.deletedAgendaIds = [...prevDel, ...removedAgendaIds.map(aid => ({ id: aid, deletedAt: nowIso }))].slice(-200);
            }
        }
        if (Array.isArray(state.appState.pomodoro?.neuralQueue) && state.appState.pomodoro.neuralQueue.length > 0) {
            state.appState.pomodoro.neuralQueue = state.appState.pomodoro.neuralQueue.filter(
                q => !matchesCoachItem(q) && !matchesCatId(q?.catId)
            );
        }

        activeData.lastUpdated = nowIso;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = nowIso;
        clearCoachCaches();
        markStorageDirty();
        });
        if (xpToDeduct > 0 && typeof get === 'function' && typeof get()?.awardExperience === 'function') {
            get().awardExperience(-xpToDeduct, { skipVersionBump: true });
        }
    },

    updateCategoryFields: (id, fields) => set((state) => {
        if (!fields || typeof fields !== 'object') return;
        const activeData = state.appState.contests[state.appState.activeId];
        if (!activeData) return;
        if (!Array.isArray(activeData.categories)) {
            activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                ? Object.values(activeData.categories)
                : [];
        }

        const category = activeData.categories.find(c => c && (c.id === id || c.name === id));
        if (category) {
            const targetId = category.id;
            const matchesCatId = (candId) => Boolean(candId) && (candId === targetId || candId === id);
            const oldName = category.name;
            const sanitizedFields = { ...fields };
            if (typeof sanitizedFields.name === 'string') {
                const trimmed = sanitizedFields.name.trim();
                if (!trimmed) {
                    delete sanitizedFields.name;
                } else {
                    const normTarget = normalize(trimmed);
                    const hasDuplicate = activeData.categories.some(
                        c => c && c !== category && c.id !== category.id && normalize(c.name || '') === normTarget
                    );
                    if (hasDuplicate) {
                        console.warn(`[Store] Duplicate category rename rejected: "${trimmed}".`);
                        return;
                    }
                    sanitizedFields.name = trimmed;
                }
            }
            Object.assign(category, sanitizedFields);
            if (sanitizedFields.weight !== undefined) {
                const parsedWeight = Number(sanitizedFields.weight);
                if (Number.isFinite(parsedWeight) && parsedWeight > 0) {
                    category.weight = parsedWeight;
                    const isEqualMode = typeof activeData.mcEqualWeights === 'boolean'
                        ? activeData.mcEqualWeights
                        : Boolean(state.appState?.mcEqualWeights);
                    if (!isEqualMode && activeData.mcWeights && typeof activeData.mcWeights === 'object') {
                        if (targetId && activeData.mcWeights[targetId] !== undefined) {
                            activeData.mcWeights[targetId] = parsedWeight;
                        }
                        if (category.name && activeData.mcWeights[category.name] !== undefined) {
                            activeData.mcWeights[category.name] = parsedWeight;
                        }
                    }
                }
            }
            if (sanitizedFields.name) {
                removeCategoryTombstone(category.id, sanitizedFields.name, state.appState.activeId);
                if (oldName && sanitizedFields.name !== oldName) {
                    const toIterableList = (col) => (
                        Array.isArray(col)
                            ? col
                            : (col && typeof col === 'object' ? Object.values(col) : null)
                    );
                    if (activeData.mcWeights) {
                        if (activeData.mcWeights[oldName] !== undefined) {
                            activeData.mcWeights[sanitizedFields.name] = activeData.mcWeights[oldName];
                            delete activeData.mcWeights[oldName];
                        }
                    }
                    const rowsList = toIterableList(activeData.simuladoRows);
                    if (rowsList) {
                        rowsList.forEach(r => {
                            if (r && (matchesCatId(r.categoryId) || normalize(r.subject || '') === normalize(oldName))) {
                                r.subject = sanitizedFields.name;
                            }
                        });
                    }
                    const simsList = toIterableList(activeData.simulados);
                    if (simsList) {
                        simsList.forEach(s => {
                            if (!s) return;
                            if (matchesCatId(s.categoryId) || normalize(s.subject || '') === normalize(oldName)) {
                                s.subject = sanitizedFields.name;
                            }
                            if (s.categoryScores && typeof s.categoryScores === 'object' && !Array.isArray(s.categoryScores)) {
                                const matchingKey = Object.keys(s.categoryScores).find(
                                    k => k === oldName || normalize(k) === normalize(oldName)
                                );
                                if (matchingKey && matchingKey !== sanitizedFields.name) {
                                    s.categoryScores[sanitizedFields.name] = s.categoryScores[matchingKey];
                                    delete s.categoryScores[matchingKey];
                                }
                            }
                        });
                    }
                    const logsList = toIterableList(activeData.studyLogs);
                    if (logsList) {
                        logsList.forEach(l => {
                            if (l && (matchesCatId(l.categoryId) || normalize(l.subject || l.category || l.categoryName || '') === normalize(oldName))) {
                                if (l.subject) l.subject = sanitizedFields.name;
                                if (l.category) l.category = sanitizedFields.name;
                                if (l.categoryName) l.categoryName = sanitizedFields.name;
                            }
                        });
                    }
                    const sessionsList = toIterableList(activeData.studySessions);
                    if (sessionsList) {
                        sessionsList.forEach(s => {
                            if (s && (matchesCatId(s.categoryId) || normalize(s.subject || s.category || s.categoryName || '') === normalize(oldName))) {
                                if (s.subject) s.subject = sanitizedFields.name;
                                if (s.category) s.category = sanitizedFields.name;
                                if (s.categoryName) s.categoryName = sanitizedFields.name;
                            }
                        });
                    }
                    const activeSub = state.appState.pomodoro?.activeSubject;
                    if (activeSub && (matchesCatId(activeSub.categoryId) || normalize(activeSub.category || '') === normalize(oldName))) {
                        activeSub.category = sanitizedFields.name;
                    }
                    if (activeData.coachPlan) {
                        const planList = Array.isArray(activeData.coachPlan) ? activeData.coachPlan : Object.values(activeData.coachPlan || {});
                        planList.forEach(item => {
                            if (item && (matchesCatId(item.categoryId) || normalize(item.subject || item.category || item.categoryName || item.catName || item.subjectName || '') === normalize(oldName))) {
                                if (item.subject) item.subject = sanitizedFields.name;
                                if (item.category) item.category = sanitizedFields.name;
                                if (item.categoryName) item.categoryName = sanitizedFields.name;
                                if (item.catName) item.catName = sanitizedFields.name;
                                if (item.subjectName) item.subjectName = sanitizedFields.name;
                            }
                        });
                    }
                    if (activeData.coachPlanner && typeof activeData.coachPlanner === 'object') {
                        Object.values(activeData.coachPlanner).forEach(dayTasks => {
                            if (Array.isArray(dayTasks)) {
                                dayTasks.forEach(item => {
                                    if (item && (matchesCatId(item.categoryId) || normalize(item.subject || item.category || item.categoryName || item.catName || item.subjectName || '') === normalize(oldName))) {
                                        if (item.subject) item.subject = sanitizedFields.name;
                                        if (item.category) item.category = sanitizedFields.name;
                                        if (item.categoryName) item.categoryName = sanitizedFields.name;
                                        if (item.catName) item.catName = sanitizedFields.name;
                                        if (item.subjectName) item.subjectName = sanitizedFields.name;
                                    }
                                });
                            }
                        });
                    }
                    if (Array.isArray(state.appState.pomodoro?.neuralQueue)) {
                        state.appState.pomodoro.neuralQueue.forEach(q => {
                            if (q && (matchesCatId(q.categoryId || q.catId) || normalize(q.catName || q.category || q.subject || '') === normalize(oldName))) {
                                if (q.catName) q.catName = sanitizedFields.name;
                                if (q.category) q.category = sanitizedFields.name;
                                if (q.subject) q.subject = sanitizedFields.name;
                            }
                        });
                    }
                    if (activeData.studyNotes) {
                        const notesList = toIterableList(activeData.studyNotes);
                        if (notesList) {
                            notesList.forEach(n => {
                                if (n && (matchesCatId(n.categoryId) || normalize(n.subject || '') === normalize(oldName))) {
                                    n.subject = sanitizedFields.name;
                                    if (!n.categoryId && targetId) n.categoryId = targetId;
                                }
                            });
                        }
                    }
                    const oldCalibKey = getCalibrationKey(oldName);
                    const newCalibKey = getCalibrationKey(sanitizedFields.name);
                    if (activeData.calibrationHistoryByCategory && typeof activeData.calibrationHistoryByCategory === 'object') {
                        if (activeData.calibrationHistoryByCategory[oldName] !== undefined) {
                            activeData.calibrationHistoryByCategory[sanitizedFields.name] = activeData.calibrationHistoryByCategory[oldName];
                            delete activeData.calibrationHistoryByCategory[oldName];
                        }
                        if (oldCalibKey && newCalibKey && oldCalibKey !== newCalibKey && activeData.calibrationHistoryByCategory[oldCalibKey] !== undefined) {
                            activeData.calibrationHistoryByCategory[newCalibKey] = activeData.calibrationHistoryByCategory[oldCalibKey];
                            delete activeData.calibrationHistoryByCategory[oldCalibKey];
                        }
                    }
                    if (activeData.calibrationOps && typeof activeData.calibrationOps === 'object') {
                        if (activeData.calibrationOps[oldName] !== undefined) {
                            activeData.calibrationOps[sanitizedFields.name] = activeData.calibrationOps[oldName];
                            delete activeData.calibrationOps[oldName];
                        }
                        if (oldCalibKey && newCalibKey && oldCalibKey !== newCalibKey && activeData.calibrationOps[oldCalibKey] !== undefined) {
                            activeData.calibrationOps[newCalibKey] = activeData.calibrationOps[oldCalibKey];
                            delete activeData.calibrationOps[oldCalibKey];
                        }
                    }
                    if (activeData.flashcardDecks) {
                        const decks = Array.isArray(activeData.flashcardDecks) ? activeData.flashcardDecks : Object.values(activeData.flashcardDecks || {});
                        decks.forEach(deck => {
                            if (deck && (matchesCatId(deck.categoryId) || normalize(deck.subject || deck.category || deck.categoryName || '') === normalize(oldName))) {
                                if (deck.subject) deck.subject = sanitizedFields.name;
                                if (deck.category) deck.category = sanitizedFields.name;
                                if (deck.categoryName) deck.categoryName = sanitizedFields.name;
                            }
                        });
                    }
                    if (activeData.agenda) {
                        const agendaList = toIterableList(activeData.agenda);
                        if (agendaList) {
                            agendaList.forEach(ev => {
                                if (ev && (matchesCatId(ev.categoryId) || normalize(ev.subject || ev.category || ev.categoryName || '') === normalize(oldName))) {
                                    if (ev.subject) ev.subject = sanitizedFields.name;
                                    if (ev.category) ev.category = sanitizedFields.name;
                                    if (ev.categoryName) ev.categoryName = sanitizedFields.name;
                                }
                            });
                        }
                    }
                }
            }
            const nowIso = new Date().toISOString();
            category.lastUpdated = nowIso;
            category.updatedAt = nowIso;
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            clearCoachCaches();
            markStorageDirty();
        }
    }),

    setMonteCarloWeights: (weightsUpdate, options = {}) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeData || !weightsUpdate) return;

        const currentWeights = activeData.mcWeights || {};
        const nextWeights = typeof weightsUpdate === 'function' ? weightsUpdate(currentWeights) : weightsUpdate;
        if (!nextWeights || typeof nextWeights !== 'object' || Array.isArray(nextWeights)) return;

        activeData.mcWeights = nextWeights;
        // M6 FIX: no modo "Pesos Iguais" (ou com skipCategorySync), NÃO sobrescrever cat.weight do edital
        // com 1 — evita destruir os pesos reais consumidos pelo Markowitz e pelo Coach.
        const isEqualMode = typeof activeData.mcEqualWeights === 'boolean'
            ? activeData.mcEqualWeights
            : Boolean(state.appState?.mcEqualWeights);
        const shouldSyncCategoryWeights = options?.skipCategorySync !== true && !isEqualMode;
        if (shouldSyncCategoryWeights && activeData.categories) {
            const catsList = Array.isArray(activeData.categories)
                ? activeData.categories
                : Object.values(activeData.categories || {});
            catsList.filter(Boolean).forEach(cat => {
                if (nextWeights[cat.id] !== undefined) {
                    cat.weight = nextWeights[cat.id];
                } else if (nextWeights[cat.name] !== undefined) {
                    cat.weight = nextWeights[cat.name];
                }
            });
        }
        const nowIso = new Date().toISOString();
        activeData.lastUpdated = nowIso;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = nowIso;
        markStorageDirty();
    }),

    updateWeights: (weights) => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];
        if (!activeId || !activeData || !activeData.categories || !weights) return;

        activeData.categories.forEach(cat => {
            if (weights[cat.id] !== undefined) {
                cat.weight = weights[cat.id];
            } else if (weights[cat.name] !== undefined) {
                cat.weight = weights[cat.name];
            }
        });

        const nowIso = new Date().toISOString();
        activeData.mcWeights = { ...(activeData.mcWeights || {}), ...weights };
        activeData.lastUpdated = nowIso;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = nowIso;
        markStorageDirty();
    }),

    safelyMergeDuplicates: () => set((state) => {
        const activeId = state.appState.activeId;
        const activeData = state.appState.contests[activeId];

        if (!activeId || !activeData || !Array.isArray(activeData.categories)) return;

        const hasDuplicates = (() => {
            const seen = new Set();

            return activeData.categories.some(cat => {
                const key = normalize(cat.name);

                if (seen.has(key)) return true;

                seen.add(key);
                return false;
            });
        })();

        if (!hasDuplicates) return;

        const groups = {};

        activeData.categories.forEach(cat => {
            const norm = normalize(cat.name);

            if (!groups[norm]) groups[norm] = [];

            groups[norm].push(cat);
        });

        let changed = false;
        const newCategories = [];

        Object.values(groups).forEach(group => {
            if (group.length === 1) {
                newCategories.push(group[0]);
                return;
            }

            changed = true;
            console.warn(`[Store] Merging ${group.length} duplicates for "${group[0].name}"`);

            const primary = [...group].sort((a, b) => {
                const getHistoryLen = (obj) => {
                    const h = obj.simuladoStats?.history;
                    if (!h) return 0;

                    return Array.isArray(h) ? h.length : Object.values(h).length;
                };

                const aData = (a.tasks?.length || 0) + getHistoryLen(a);
                const bData = (b.tasks?.length || 0) + getHistoryLen(b);

                return bData - aData;
            })[0];

            const getHistoryArr = (c) => {
                const h = c.simuladoStats?.history;
                if (!h) return [];

                return Array.isArray(h) ? h : Object.values(h);
            };

            const historyKey = (h) => {
                if (!h) return 'invalid';

                return h.id || `${h.date || ''}-${h.score ?? ''}-${h.total ?? ''}-${h.correct ?? ''}-${normalize(h.topic || '')}`;
            };

            const mergedTasks = [...(primary.tasks || [])];
            const mergedHistory = [...getHistoryArr(primary)];
            const seenHistory = new Set(mergedHistory.map(historyKey));
            let mergedTotalMinutes = Number(primary.totalMinutes) || 0;
            let mergedLastStudiedAt = primary.lastStudiedAt || null;

            group.forEach(cat => {
                if (cat.id === primary.id) return;

                mergedTotalMinutes += (Number(cat.totalMinutes) || 0);
                if (cat.lastStudiedAt) {
                    if (!mergedLastStudiedAt || new Date(cat.lastStudiedAt) > new Date(mergedLastStudiedAt)) {
                        mergedLastStudiedAt = cat.lastStudiedAt;
                    }
                }

                (cat.tasks || []).forEach(t => {
                    const taskTitle = normalize(t.title || t.text || '');

                    if (!taskTitle || !mergedTasks.some(mt => normalize(mt.title || mt.text || '') === taskTitle)) {
                        mergedTasks.push(t);
                    }
                });

                getHistoryArr(cat).forEach(h => {
                    const key = historyKey(h);

                    if (!seenHistory.has(key)) {
                        seenHistory.add(key);
                        mergedHistory.push(h);
                    }
                });

                const oldId = cat.id;
                const newId = primary.id;

                if (activeData.studyLogs) {
                    const safeLogs = Array.isArray(activeData.studyLogs)
                        ? activeData.studyLogs
                        : Object.values(activeData.studyLogs || {});

                    safeLogs.forEach(l => {
                        if (l.categoryId === oldId) l.categoryId = newId;
                    });

                    activeData.studyLogs = safeLogs;
                }

                if (activeData.studySessions) {
                    const safeSessions = Array.isArray(activeData.studySessions)
                        ? activeData.studySessions
                        : Object.values(activeData.studySessions || {});

                    safeSessions.forEach(s => {
                        if (s.categoryId === oldId) s.categoryId = newId;
                    });

                    activeData.studySessions = safeSessions;
                }

                if (activeData.simuladoRows) {
                    const safeRows = Array.isArray(activeData.simuladoRows)
                        ? activeData.simuladoRows
                        : Object.values(activeData.simuladoRows || {});

                    safeRows.forEach(r => {
                        if (r.categoryId === oldId) r.categoryId = newId;
                    });

                    activeData.simuladoRows = safeRows;
                }

                if (activeData.simulados) {
                    const safeSimulados = Array.isArray(activeData.simulados)
                        ? activeData.simulados
                        : Object.values(activeData.simulados || {});

                    safeSimulados.forEach(s => {
                        if (s && s.categoryId === oldId) s.categoryId = newId;
                    });

                    activeData.simulados = safeSimulados;
                }

                if (activeData.coachPlan && Array.isArray(activeData.coachPlan)) {
                    activeData.coachPlan.forEach(task => {
                        if (task && task.categoryId === oldId) task.categoryId = newId;
                    });
                }

                if (activeData.coachPlanner && typeof activeData.coachPlanner === 'object') {
                    Object.keys(activeData.coachPlanner).forEach(day => {
                        if (Array.isArray(activeData.coachPlanner[day])) {
                            activeData.coachPlanner[day].forEach(task => {
                                if (task && task.categoryId === oldId) task.categoryId = newId;
                            });
                        }
                    });
                }

                const normOldName = normalize(cat.name || '');

                if (activeData.studyNotes) {
                    const safeNotes = Array.isArray(activeData.studyNotes)
                        ? activeData.studyNotes
                        : Object.values(activeData.studyNotes || {});

                    safeNotes.forEach(n => {
                        if (!n || typeof n !== 'object') return;
                        const hitId = n.categoryId != null && String(n.categoryId) === String(oldId);
                        const hitName = normOldName && normalize(n.subject || '') === normOldName;
                        if (hitId || hitName) {
                            n.categoryId = newId;
                            if (primary.name && n.subject) n.subject = primary.name;
                        }
                    });

                    activeData.studyNotes = safeNotes;
                }

                if (activeData.flashcardDecks) {
                    const safeDecks = Array.isArray(activeData.flashcardDecks)
                        ? activeData.flashcardDecks
                        : Object.values(activeData.flashcardDecks || {});

                    safeDecks.forEach(d => {
                        if (!d || typeof d !== 'object') return;
                        const hitId = d.categoryId != null && String(d.categoryId) === String(oldId);
                        const hitName = normOldName && normalize(d.subject || d.category || d.categoryName || '') === normOldName;
                        if (hitId || hitName) {
                            d.categoryId = newId;
                            if (primary.name) {
                                if (d.subject) d.subject = primary.name;
                                if (d.category) d.category = primary.name;
                                if (d.categoryName) d.categoryName = primary.name;
                            }
                        }
                    });

                    activeData.flashcardDecks = safeDecks;
                }

                if (activeData.agenda) {
                    const safeAgenda = Array.isArray(activeData.agenda)
                        ? activeData.agenda
                        : Object.values(activeData.agenda || {});

                    safeAgenda.forEach(ev => {
                        if (!ev || typeof ev !== 'object') return;
                        const hitId = ev.categoryId != null && String(ev.categoryId) === String(oldId);
                        const hitName = normOldName && normalize(ev.subject || ev.category || ev.categoryName || '') === normOldName;
                        if (hitId || hitName) {
                            ev.categoryId = newId;
                            if (primary.name) {
                                if (ev.subject) ev.subject = primary.name;
                                if (ev.category) ev.category = primary.name;
                                if (ev.categoryName) ev.categoryName = primary.name;
                            }
                        }
                    });

                    activeData.agenda = safeAgenda;
                }

                const activeSub = state.appState.pomodoro?.activeSubject;
                if (activeSub && String(activeSub.categoryId) === String(oldId)) {
                    activeSub.categoryId = newId;
                    if (primary.name) activeSub.category = primary.name;
                }
                if (Array.isArray(state.appState.pomodoro?.neuralQueue)) {
                    state.appState.pomodoro.neuralQueue.forEach(q => {
                        if (!q || typeof q !== 'object') return;
                        if (String(q.categoryId) === String(oldId)) q.categoryId = newId;
                        if (String(q.catId) === String(oldId)) q.catId = newId;
                    });
                }
            });

            const mergedStatsObj = computeCategorySimuladoStats(
                primary,
                mergedHistory,
                activeData.maxScore,
                activeData.minScore
            );

            newCategories.push({
                ...primary,
                totalMinutes: mergedTotalMinutes,
                lastStudiedAt: mergedLastStudiedAt,
                tasks: mergedTasks,
                simuladoStats: mergedStatsObj
            });
        });

        if (changed) {
            activeData.categories = newCategories;

            if (activeData.mcWeights) {
                const validKeys = new Set();

                newCategories.forEach(c => {
                    validKeys.add(c.id);
                    validKeys.add(c.name);
                    validKeys.add(normalize(c.name));
                });

                Object.keys(activeData.mcWeights).forEach(key => {
                    if (!validKeys.has(key) && !validKeys.has(normalize(key))) {
                        delete activeData.mcWeights[key];
                    }
                });
            }

            const nowIso = new Date().toISOString();
            newCategories.forEach(c => {
                if (c) {
                    c.lastUpdated = nowIso;
                    c.updatedAt = nowIso;
                }
            });
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            clearCoachCaches();
            markStorageDirty();
        }
    }),

    importCategory: (sourceContestId, categoryId) => {
        let result = false;
        set((state) => {
            const sourceData = state.appState.contests[sourceContestId];
            const activeData = state.appState.contests[state.appState.activeId];

            if (!sourceData || !activeData) return;
            const sourceCategories = Array.isArray(sourceData.categories)
                ? sourceData.categories
                : Object.values(sourceData.categories || {});

            const categoryToImport = sourceCategories.find(c => c && (c.id === categoryId || c.name === categoryId));
            if (!categoryToImport) return;

            if (!Array.isArray(activeData.categories)) {
                activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                    ? Object.values(activeData.categories)
                    : [];
            }

            // Check duplicates
            const normName = normalize(categoryToImport.name || '');
            if (activeData.categories.some(c => normalize(c?.name || '') === normName)) {
                console.warn(`[Store] Category "${categoryToImport.name}" already exists in the active contest.`);
                return;
            }

            const newId = generateId('cat');
            const importedCat = safeClone(categoryToImport);
            importedCat.id = newId;

            // Resetar histórico, tempo e estatísticas para o novo concurso
            importedCat.totalMinutes = 0;
            importedCat.lastStudiedAt = null;
            importedCat.simuladoStats = {
                history: [],
                average: 0,
                lastAttempt: 0,
                trend: 'stable',
                level: '-'
            };
            importedCat.deletedTaskIds = [];

            const nowIso = new Date().toISOString();
            importedCat.createdAt = nowIso;
            importedCat.lastUpdated = nowIso;
            importedCat.updatedAt = nowIso;

            // Regenerar IDs das tarefas e resetar progresso para o novo certame
            const rawTasks = Array.isArray(importedCat.tasks) ? importedCat.tasks : Object.values(importedCat.tasks || {});
            importedCat.tasks = rawTasks.map(t => {
                const taskClone = safeClone(t);
                return {
                    ...taskClone,
                    id: generateId('task'),
                    completed: false,
                    completedAt: null,
                    status: null,
                    awardedXP: undefined
                };
            });

            removeCategoryTombstone(newId, importedCat.name, state.appState.activeId);
            activeData.categories.push(importedCat);
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            clearCoachCaches();
            markStorageDirty();
            result = true;
        });
        return result;
    },
});

