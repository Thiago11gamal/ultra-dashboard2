import { generateId, getSafeId } from '../../utils/idGenerator.js';
import { normalize } from '../../utils/normalization.js';
import { safeClone } from '../../utils/safeClone.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { addCategoryTombstones, removeCategoryTombstone } from '../../utils/tombstones.js';
import { getCalibrationKey } from '../../utils/coachSafe.js';
import { PRESET_CATEGORY_COLORS } from '../../utils/colorHelper.js';
import { computeCategorySimuladoStats } from '../../utils/simuladoReconciler.js';

export const createCategorySlice = (set) => ({
    addCategory: (name) => {
        let added = false;
        set((state) => {
            if (!name || typeof name !== 'string') return;
            const activeData = state.appState.contests[state.appState.activeId];

            if (!activeData) return;
            if (!Array.isArray(activeData.categories)) {
                activeData.categories = activeData.categories && typeof activeData.categories === 'object'
                    ? Object.values(activeData.categories)
                    : [];
            }

            // BUG FIX: Prevent duplicate categories by name
            const normName = normalize(name);
            if (activeData.categories.some(c => normalize(c.name) === normName)) {
                console.warn(`[Store] Category "${name}" already exists.`);
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
                name,
                color: assignedColor,
                icon: '📚',
                tasks: [],
                weight: 10,
                maxScore: catMaxScore,
                minScore: catMinScore,
                minCutoff: null,
                simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' },
                totalMinutes: 0,
                lastStudiedAt: null,
                createdAt: nowIso,
                lastUpdated: nowIso,
                updatedAt: nowIso
            });

            // ✅ Remove qualquer tombstone prévio para permitir salvar e sincronizar perfeitamente
            removeCategoryTombstone(newCatId, name, state.appState.activeId);
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            markStorageDirty();
            added = true;
        });
        return added;
    },

    deleteCategory: (id) => set((state) => {
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

            const deletedCoachPlan = Array.isArray(activeData.coachPlan)
                ? activeData.coachPlan.filter(task => task && matchesCatId(task.categoryId))
                : [];

            const deletedCoachPlanner = {};
            if (activeData.coachPlanner && typeof activeData.coachPlanner === 'object') {
                Object.keys(activeData.coachPlanner).forEach(day => {
                    if (Array.isArray(activeData.coachPlanner[day])) {
                        deletedCoachPlanner[day] = activeData.coachPlanner[day].filter(task => task && matchesCatId(task.categoryId));
                    }
                });
            }

            if (!state.appState.trash) state.appState.trash = [];
            state.appState.trash.push({
                id: generateId('trash'),
                type: 'category',
                contestId: state.appState.activeId,
                data: safeClone({
                    category: category,
                    studyLogs: (Array.isArray(activeData.studyLogs) ? activeData.studyLogs : Object.values(activeData.studyLogs || {})).filter(l => l && (matchesCatId(l.categoryId) || (normName && normalize(l.subject || l.category || l.categoryName || '') === normName))),
                    studySessions: (Array.isArray(activeData.studySessions) ? activeData.studySessions : Object.values(activeData.studySessions || {})).filter(s => s && (matchesCatId(s.categoryId) || (normName && normalize(s.subject || s.category || s.categoryName || '') === normName))),
                    simuladoRows: deletedSimuladoRows,
                    simulados: (Array.isArray(activeData.simulados) ? activeData.simulados : Object.values(activeData.simulados || {})).filter(s => s && (matchesCatId(s.categoryId) || (normName && normalize(s.subject || '') === normName))),
                    mcWeight: activeData.mcWeights?.[targetId] ?? activeData.mcWeights?.[id] ?? activeData.mcWeights?.[category.name],
                    coachPlan: deletedCoachPlan,
                    coachPlanner: deletedCoachPlanner
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

        if (activeData.coachPlanner) {
            Object.keys(activeData.coachPlanner).forEach(day => {
                if (Array.isArray(activeData.coachPlanner[day])) {
                    activeData.coachPlanner[day] = activeData.coachPlanner[day].filter(item =>
                        !matchesCatId(item.categoryId)
                    );
                }
            });
        }

        if (Array.isArray(activeData.coachPlan)) {
            activeData.coachPlan = activeData.coachPlan.filter(
                task => !matchesCatId(task.categoryId)
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
        activeData.lastUpdated = nowIso;
        state.appState.version = (state.appState.version || 0) + 1;
        state.appState.lastUpdated = nowIso;
        markStorageDirty();
    }),

    updateCategoryFields: (id, fields) => set((state) => {
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
            Object.assign(category, fields);
            if (fields.name) {
                removeCategoryTombstone(category.id, fields.name, state.appState.activeId);
                if (oldName && fields.name !== oldName) {
                    const toIterableList = (col) => (
                        Array.isArray(col)
                            ? col
                            : (col && typeof col === 'object' ? Object.values(col) : null)
                    );
                    if (activeData.mcWeights) {
                        if (activeData.mcWeights[oldName] !== undefined) {
                            activeData.mcWeights[fields.name] = activeData.mcWeights[oldName];
                            delete activeData.mcWeights[oldName];
                        }
                    }
                    const rowsList = toIterableList(activeData.simuladoRows);
                    if (rowsList) {
                        rowsList.forEach(r => {
                            if (r && (matchesCatId(r.categoryId) || normalize(r.subject || '') === normalize(oldName))) {
                                r.subject = fields.name;
                            }
                        });
                    }
                    const simsList = toIterableList(activeData.simulados);
                    if (simsList) {
                        simsList.forEach(s => {
                            if (!s) return;
                            if (matchesCatId(s.categoryId) || normalize(s.subject || '') === normalize(oldName)) {
                                s.subject = fields.name;
                            }
                            if (s.categoryScores && typeof s.categoryScores === 'object' && !Array.isArray(s.categoryScores)) {
                                const matchingKey = Object.keys(s.categoryScores).find(
                                    k => k === oldName || normalize(k) === normalize(oldName)
                                );
                                if (matchingKey && matchingKey !== fields.name) {
                                    s.categoryScores[fields.name] = s.categoryScores[matchingKey];
                                    delete s.categoryScores[matchingKey];
                                }
                            }
                        });
                    }
                    const logsList = toIterableList(activeData.studyLogs);
                    if (logsList) {
                        logsList.forEach(l => {
                            if (l && (matchesCatId(l.categoryId) || normalize(l.subject || l.category || l.categoryName || '') === normalize(oldName))) {
                                if (l.subject) l.subject = fields.name;
                                if (l.category) l.category = fields.name;
                                if (l.categoryName) l.categoryName = fields.name;
                            }
                        });
                    }
                    const sessionsList = toIterableList(activeData.studySessions);
                    if (sessionsList) {
                        sessionsList.forEach(s => {
                            if (s && (matchesCatId(s.categoryId) || normalize(s.subject || s.category || s.categoryName || '') === normalize(oldName))) {
                                if (s.subject) s.subject = fields.name;
                                if (s.category) s.category = fields.name;
                                if (s.categoryName) s.categoryName = fields.name;
                            }
                        });
                    }
                    const activeSub = state.appState.pomodoro?.activeSubject;
                    if (activeSub && (matchesCatId(activeSub.categoryId) || normalize(activeSub.category || '') === normalize(oldName))) {
                        activeSub.category = fields.name;
                    }
                    if (activeData.coachPlan) {
                        const planList = Array.isArray(activeData.coachPlan) ? activeData.coachPlan : Object.values(activeData.coachPlan || {});
                        planList.forEach(item => {
                            if (item && (matchesCatId(item.categoryId) || normalize(item.subject || item.category || item.categoryName || '') === normalize(oldName))) {
                                if (item.subject) item.subject = fields.name;
                                if (item.category) item.category = fields.name;
                                if (item.categoryName) item.categoryName = fields.name;
                            }
                        });
                    }
                    if (activeData.coachPlanner && typeof activeData.coachPlanner === 'object') {
                        Object.values(activeData.coachPlanner).forEach(dayTasks => {
                            if (Array.isArray(dayTasks)) {
                                dayTasks.forEach(item => {
                                    if (item && (matchesCatId(item.categoryId) || normalize(item.subject || item.category || item.categoryName || '') === normalize(oldName))) {
                                        if (item.subject) item.subject = fields.name;
                                        if (item.category) item.category = fields.name;
                                        if (item.categoryName) item.categoryName = fields.name;
                                    }
                                });
                            }
                        });
                    }
                    if (activeData.flashcardDecks) {
                        const decks = Array.isArray(activeData.flashcardDecks) ? activeData.flashcardDecks : Object.values(activeData.flashcardDecks || {});
                        decks.forEach(deck => {
                            if (deck && (matchesCatId(deck.categoryId) || normalize(deck.subject || deck.category || deck.categoryName || '') === normalize(oldName))) {
                                if (deck.subject) deck.subject = fields.name;
                                if (deck.category) deck.category = fields.name;
                                if (deck.categoryName) deck.categoryName = fields.name;
                            }
                        });
                    }
                }
            }
            const nowIso = new Date().toISOString();
            category.lastUpdated = nowIso;
            category.updatedAt = nowIso;
            activeData.lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
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
                level: 'BAIXO'
            };

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
            markStorageDirty();
            result = true;
        });
        return result;
    },
});

