import { useEffect, useRef, useState, useCallback } from 'react';
import { db, isLocalMode } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { SYNC_LOG_CAP } from '../config';
import { logger } from '../utils/logger';

import { useAppStore } from '../store/useAppStore';
import { normalize } from '../utils/normalization';
import { safeClone } from '../store/safeClone.js';
import { getSafeScore } from '../utils/scoreHelper.js';

// Remove propriedades nulas/indefinidas de forma segura com proteção contra loops recursivos
const cleanUndefined = (obj, seen = new WeakSet()) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;
    
    // SAFETY-01: Proteger contra Window, Event e DOM que podem vazar para o estado
    if (obj === window || 
        (typeof Event !== 'undefined' && obj instanceof Event) || 
        (typeof Node !== 'undefined' && obj instanceof Node)) {
        return null;
    }
    
    // Proteção contra referências circulares (Cycle Detection)
    if (seen.has(obj)) {
        console.warn("[Sync] Referência circular detectada e removida para evitar Stack Overflow.");
        return null;
    }
    seen.add(obj);

    let result;
    if (Array.isArray(obj)) {
        // CORREÇÃO CRÍTICA: Manter "null" em vez de remover a posição (filter),
        // preservando a integridade dos índices posicionalmente vitais para o Firebase.
        result = obj.map(v => v === undefined ? null : cleanUndefined(v, seen));
    } else {
        result = Object.fromEntries(
            Object.entries(obj)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => [k, cleanUndefined(v, seen)])
        );
    }

    // BUG-14 FIX: Limpa o WeakSet após a recursão para permitir que o mesmo objeto 
    // seja processado em outros ramos da árvore (ex: referências cruzadas legítimas).
    seen.delete(obj);
    return result;
};

export function useCloudSync(currentUser, setAppState, showToast, syncTrigger) {
    const showToastRef = useRef(showToast);
    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);

    const lastSyncedRef = useRef(null);
    const isParityValidatedRef = useRef(false);
    const [parityTick, setParityTick] = useState(0); 
    const lastLocalMutationRef = useRef(0);
    const isCloudPullRef = useRef(false);
    const debounceRef = useRef(null);
    const latestCloudDataRef = useRef(null);
    const isMountedRef = useRef(true);
    const [cloudStatus, setCloudStatus] = useState('idle');
    const [cloudError, setCloudError] = useState(null);
    const [isInternalSyncing, setIsInternalSyncing] = useState(false);
    const isInternalSyncingRef = useRef(false);
    const syncReentryCountRef = useRef(0); // CORREÇÃO: Ref global para travar spam de rede
    const setInternalSyncing = useCallback((val) => {
        setIsInternalSyncing(val);
        isInternalSyncingRef.current = val;
    }, []);
    const [hasConflict, setHasConflict] = useState(false);
    const needsSyncRef = useRef(false);

    const appStateRef = useRef(useAppStore.getState().appState);
    useEffect(() => {
        // Subscribe to store changes to keep the ref always up to date
        // and eliminate stale closures from syncTrigger dependencies.
        const unsubscribe = useAppStore.subscribe(
            state => { appStateRef.current = state.appState; }
        );
        return () => unsubscribe();
    }, []);

    const confirmParity = useCallback(() => {
        if (!isParityValidatedRef.current) {
            isParityValidatedRef.current = true;
            setParityTick(t => t + 1);
            logger.debug("[Sync] Paridade estabelecida.");
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // -----------------------------------------------------------------------
    // deduplicateCategoryNames — removes categories whose normalized name
    // collides with another entry in the same contest. Keeps the copy with
    // the most accumulated data (tasks + simulado history entries).
    // Applied UNCONDITIONALLY to every contest after every merge so that
    // duplicates already persisted in localStorage are also removed on the
    // next app load, regardless of which side had the newer timestamp.
    // -----------------------------------------------------------------------
    const _normName = normalize;

    const deduplicateCategoryNames = useCallback((contest) => {
        if (!Array.isArray(contest?.categories)) return contest;
        const nameMap = {};
        contest.categories.forEach(cat => {
            const key = normalize(cat.name);
            const richness = (c) => {
                const h = c.simuladoStats?.history;
                const hLen = h ? (Array.isArray(h) ? h.length : Object.values(h).length) : 0;
                return (c.tasks?.length || 0) + hLen;
            };
            if (!nameMap[key]) {
                nameMap[key] = { ...cat };
            } else {
                const winner = richness(cat) > richness(nameMap[key]) ? { ...cat } : { ...nameMap[key] };
                const loser = richness(cat) > richness(nameMap[key]) ? nameMap[key] : cat;
                
                // Salvar dados do perdedor antes de o descartar
                const mergedTasks = [...(winner.tasks || []), ...(loser.tasks || [])];
                const mergedHistory = [...(winner.simuladoStats?.history || []), ...(loser.simuladoStats?.history || [])];
                
                // CORREÇÃO: Evitar aniquilação de tarefas "draft" que ainda não possuam ID injetado
                // Usando fallback semântico em vez de JSON.stringify() que pode quebrar a desduplicação se
                // a ordem das propriedades das tarefas divergir entre ambientes.
                // BUG FIX: Tarefas não têm t.name ou t.score! Usar t.text/t.title e t.priority.
                winner.tasks = Array.from(new Map(
                    mergedTasks.map((t) => [t.id || `${t.text || t.title || ''}-${t.priority || ''}`, t])
                ).values());
                
                if (winner.simuladoStats) {
                    winner.simuladoStats.history = Array.from(new Map(mergedHistory.map(h => [h.date, h])).values())
                                                        .sort((a,b) => new Date(a.date) - new Date(b.date));
                }
                
                nameMap[key] = winner;
                logger.warn(`[dedup] Fundindo dados do clone "${cat.name}". Nenhuma nota perdida.`);
            }
        });
        const deduped = Object.values(nameMap);
        if (deduped.length === contest.categories.length) return contest;
        return { ...contest, categories: deduped };
    }, []);

    const mergeArrays = (arr1, arr2) => {
        const map = new Map();
        const getStableKey = (item) => {
            if (item.id) return item.id;
            return `${item.date || ''}-${item.categoryId || ''}-${item.taskId || JSON.stringify(item)}`;
        };
        const safeArr1 = Array.isArray(arr1) ? arr1 : Object.values(arr1 || {});
        const safeArr2 = Array.isArray(arr2) ? arr2 : Object.values(arr2 || {});
        safeArr1.forEach(item => { if (item) map.set(getStableKey(item), item); });
        safeArr2.forEach(item => { if (item) map.set(getStableKey(item), item); });
        return Array.from(map.values()).filter(Boolean);
    };

    const mergeMonteCarloHistory = (localMC = [], cloudMC = []) => {
        const mcMap = new Map();
        [...localMC, ...cloudMC].filter(Boolean).forEach(item => {
            if (item?.date) {
                const sanitized = {
                    ...item,
                    probability: Number.isFinite(item.probability) ? item.probability : 0
                };
                mcMap.set(item.date, sanitized);
            }
        });
        return Array.from(mcMap.values()).filter(Boolean).sort((a, b) => {
            const aMs = new Date(a?.date || 0).getTime();
            const bMs = new Date(b?.date || 0).getTime();
            return (Number.isFinite(aMs) ? aMs : 0) - (Number.isFinite(bMs) ? bMs : 0);
        });
    };

    const mergeCategoryTasks = (localTasks = [], cloudTasks = []) => {
        const taskMap = new Map();
        const taskKey = (t) => t?.id || t?.text || `${t?.title || ''}-${t?.priority || ''}`;
        const pickWinner = (a, b) => {
            if (!a) return b;
            if (!b) return a;
            if (a.completed && !b.completed) return a;
            if (b.completed && !a.completed) return b;
            const aTime = new Date(a.lastStudiedAt || 0).getTime();
            const bTime = new Date(b.lastStudiedAt || 0).getTime();
            return (Number.isFinite(aTime) ? aTime : 0) >= (Number.isFinite(bTime) ? bTime : 0) ? a : b;
        };

        const safeLocalTasks = Array.isArray(localTasks) ? localTasks : Object.values(localTasks || {});
        const safeCloudTasks = Array.isArray(cloudTasks) ? cloudTasks : Object.values(cloudTasks || {});
        [...safeLocalTasks, ...safeCloudTasks].filter(Boolean).forEach(t => {
            const key = taskKey(t);
            if (key) {
                taskMap.set(key, pickWinner(taskMap.get(key), t));
            }
        });
        return Array.from(taskMap.values()).filter(Boolean);
    };

    const mergeContestCategories = (localCats = [], cloudCats = []) => {
        const mergedCatsMap = {};
        const toDateMs = (value) => {
            if (!value) return 0;
            const ms = new Date(value).getTime();
            return Number.isFinite(ms) ? ms : 0;
        };

        const safeLocalCats = Array.isArray(localCats) ? localCats : Object.values(localCats || {});
        const safeCloudCats = Array.isArray(cloudCats) ? cloudCats : Object.values(cloudCats || {});

        safeLocalCats.forEach(c => {
            if (c?.id) mergedCatsMap[c.id] = c;
        });

        safeCloudCats.forEach(c => {
            if (!c?.id) return;
            if (mergedCatsMap[c.id]) {
                const localCat = mergedCatsMap[c.id];
                const historyMap = new Map();
                const getStableHistoryKey = (h) => h.id || `${h.date}-${h.taskId || 'geral'}-${h.score}`;
                
                const safeLocalHistory = Array.isArray(localCat.simuladoStats?.history) ? localCat.simuladoStats.history : Object.values(localCat.simuladoStats?.history || {});
                const safeCloudHistory = Array.isArray(c.simuladoStats?.history) ? c.simuladoStats.history : Object.values(c.simuladoStats?.history || {});
                safeLocalHistory.forEach(h => { if (h?.date) historyMap.set(getStableHistoryKey(h), h); });
                safeCloudHistory.forEach(h => { if (h?.date) historyMap.set(getStableHistoryKey(h), h); });

                mergedCatsMap[c.id] = {
                    ...localCat,
                    ...c,
                    tasks: mergeCategoryTasks(localCat.tasks, c.tasks),
                    simuladoStats: {
                        ...(localCat.simuladoStats || c.simuladoStats || {}),
                        ...(c.simuladoStats || {}),
                        history: Array.from(historyMap.values())
                            .map(h => ({ ...h, score: getSafeScore(h, 100) }))
                            .sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date))
                    }
                };
            } else {
                mergedCatsMap[c.id] = c;
            }
        });

        return Object.values(mergedCatsMap);
    };

    const mergeContestPayload = (localContest, cloudContest, preferCloudBase = false) => {
        const base = preferCloudBase ? { ...localContest, ...cloudContest } : { ...cloudContest, ...localContest };
        return {
            ...base,
            categories: mergeContestCategories(localContest.categories, cloudContest.categories),
            studyLogs: mergeArrays(localContest.studyLogs, cloudContest.studyLogs),
            studySessions: mergeArrays(localContest.studySessions, cloudContest.studySessions),
            simuladoRows: mergeArrays(localContest.simuladoRows, cloudContest.simuladoRows),
            monteCarloHistory: mergeMonteCarloHistory(localContest.monteCarloHistory, cloudContest.monteCarloHistory),
        };
    };

    const mergeAppState = useCallback((local, cloud, options = {}) => {
        if (!cloud || typeof cloud !== 'object') {
            // Mesmo sem nuvem, rodamos a deduplicação no local para limpar o estado
            if (!local?.contests) return local;
            const cleanedContests = { ...local.contests };
            Object.keys(cleanedContests).forEach(id => {
                cleanedContests[id] = deduplicateCategoryNames(cleanedContests[id]);
            });
            return { ...local, contests: cleanedContests };
        }
        if (!local) return cloud;
 
        // BUGFIX: Ignore malformed/legacy cloud payloads that don't contain the
        // canonical `contests` tree. Treating such payload as authoritative was
        // causing local panels to disappear on refresh (deletion sync branch).
        // Added check for Object.keys.length > 0 to prevent "phantom wipes" during Firebase init.
        const cloudHasContestsTree = !!(cloud && cloud.contests && typeof cloud.contests === 'object' && Object.keys(cloud.contests).length > 0);
        if (!cloudHasContestsTree) {
            logger.warn('[Sync] Payload da nuvem sem `contests` válido. Mantendo estado local para evitar perda visual de dados.');
            if (!local?.contests) return local;
            const cleanedContests = { ...local.contests };
            Object.keys(cleanedContests).forEach(id => {
                cleanedContests[id] = deduplicateCategoryNames(cleanedContests[id]);
            });
            return { ...local, contests: cleanedContests };
        }

        const localContests = local.contests || {};
        const cloudContests = cloud.contests || {};
        // --- Merge Contests ---
        const mergedContests = { ...localContests };
        const newTrashItems = [];

        const cloudFullUpdate = new Date(cloud.lastUpdated || 0).getTime();
        const localFullUpdate = new Date(local.lastUpdated || 0).getTime();

        // 1. Processar adições e atualizações da nuvem
        Object.entries(cloudContests).forEach(([id, cloudContest]) => {
            const localContest = localContests[id];
            
            if (!localContest) {
                // CORREÇÃO: Verifica se o painel não foi apagado localmente (está na lixeira)
                const isDeletedLocally = (local.trash || []).some(t => t.contestId === id);
                if (!isDeletedLocally) {
                    // É legitimamente um novo painel criado noutro dispositivo
                    mergedContests[id] = cloudContest;
                } else {
                    logger.debug(`[Sync] Painel "${id}" ignorado da nuvem pois foi apagado localmente.`);
                }
            } else {
                // Painel existente: comparar timestamps granulares
                const cloudTime = new Date(cloudContest.lastUpdated || 0).getTime();
                const localTime = new Date(localContest.lastUpdated || 0).getTime();
                
                mergedContests[id] = mergeContestPayload(
                    localContest,
                    cloudContest,
                    cloudTime > localTime
                );
            }
        });

        // SINCRONIZAÇÃO DE DELEÇÃO (Segurança Aumentada)
        // Se um painel existe localmente mas NÃO está na nuvem, e a nuvem é MAIS RECENTE,
        // movemos para a lixeira em vez de deletar permanentemente.
        const localIds = Object.keys(localContests);
 
        if (!options.nonDestructive) localIds.forEach(id => {
            // NEVER trash the 'default' contest during automatic sync
            if (id === 'default') return;

            if (!cloudContests[id]) {
                const localTime = new Date(localContests[id]?.lastUpdated || 0).getTime();
                
                // Margem de 5s para evitar race conditions
                if (cloudFullUpdate > localTime + 5000) {
 
                    console.warn(`[Sync] Movendo painel "${id}" para lixeira (removido na nuvem).`);
                    
                    // Move para o trash se ainda não estiver lá
                    const alreadyInTrash = (local.trash || []).some(t => t.contestId === id);
                    
                    if (!alreadyInTrash) {
                        newTrashItems.push({
                            id: `sync-trash-${id}-${Date.now()}`,
                            type: 'contest',
                            contestId: id,
                            data: localContests[id],
                            deletedAt: new Date().toISOString(),
                            reason: 'cloud-sync'
                        });
                    }
                    
                    delete mergedContests[id];
                }
            }
        });

        // [O restante da lógica de deduplicação e activeId permanece igual]
        Object.keys(mergedContests).forEach(id => {
            mergedContests[id] = deduplicateCategoryNames(mergedContests[id]);
        });

        const mergedContestIds = Object.keys(mergedContests);
        const isLocalIdValid = !!(local.activeId && mergedContests[local.activeId]);
        const isCloudIdValid = !!(cloud.activeId && mergedContests[cloud.activeId]);
        const fallbackActiveId = mergedContestIds[0] || 'default';
        const activeId = isLocalIdValid
            ? local.activeId
            : (isCloudIdValid ? cloud.activeId : fallbackActiveId);

        // BUG FIX: Spread order must respect temporal superiority.
        // If cloud is newer, it should provide the base for top-level fields (filter, pomodoro, etc.)
        const isCloudNewer = cloudFullUpdate > localFullUpdate;
        
        const base = isCloudNewer ? { ...local, ...cloud } : { ...cloud, ...local };

        return {
            ...base,
            contests: mergedContests,
            trash: (() => {
                // DEDUP FIX: Merge + deduplicate trash by id to prevent unbounded array growth.
                // Without this, every sync cycle that processes both sides doubles the trash array.
                const combined = [...(local.trash || []), ...(cloud.trash || []), ...newTrashItems];
                const seen = new Set();
                return combined.filter(item => {
                    // FIX: Generate a fallback virtual ID so legacy trash items without IDs
                    // don't accumulate geometrically on each sync merge cycle.
                    const stableId = item?.id || `virtual-${item?.contestId || 'unknown'}-${item?.deletedAt || JSON.stringify(item?.data || {}).length}`;
                    if (seen.has(stableId)) return false;
                    seen.add(stableId);
                    return true;
                });
            })(),
            activeId: activeId || local.activeId || cloud.activeId,
            version: Math.max(local.version ?? 0, cloud.version ?? 0),
            lastUpdated: new Date(Math.max(cloudFullUpdate, localFullUpdate)).toISOString()
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deduplicateCategoryNames]);

    // BUG-14 FIX: Include a fast content fingerprint (category count + total tasks)
    // so that mutations that don't increment version (e.g. cloud-originated) are still detected.
    const stateStringForSync = (state) => {
        if (!state) return '';
        const lastUpdated = state.lastUpdated || "0";
        const version = state.version || 0;
        let contentFingerprint = 0;
        if (state.contests) {
            Object.values(state.contests).forEach(c => {
                const cats = c?.categories;
                if (Array.isArray(cats)) {
                    contentFingerprint += cats.length;
                    cats.forEach(cat => { contentFingerprint += (cat.tasks?.length || 0); });
                }
                contentFingerprint += (c?.simuladoRows?.length || 0);
            });
        }
        return `${lastUpdated}|v${version}|active:${state.activeId}|fp:${contentFingerprint}`;
    };

    useEffect(() => {
        if (isLocalMode || !currentUser?.uid || !setAppState || !db || db?.app?.options?.projectId === 'config-missing') {
            if (isLocalMode) {
                setTimeout(() => {
                    setCloudStatus('idle');
                }, 0);
            } else if (currentUser?.uid && (!db || db?.app?.options?.projectId === 'config-missing')) {
                console.error("[Sync] Erro: Configuração do Firebase incompleta (VITE_FIREBASE_PROJECT_ID ausente).");
                setTimeout(() => {
                    setCloudStatus('error');
                    setCloudError('Configuração incompleta (.env)');
                }, 0);
            } else if (!currentUser?.uid) {
                setTimeout(() => {
                    setCloudStatus('idle');
                }, 0);
            }
            confirmParity();
            return;
        }

        setTimeout(() => {
            setCloudStatus('connecting');
            setCloudError(null);
        }, 0);

        let docRef;
        try {
            docRef = doc(db, 'backups', currentUser.uid);
        } catch (err) {
            console.error("[Sync] Firebase initialization error:", err);
            confirmParity();
            return;
        }

        logger.styled(`[Firebase-Diag] TESTANDO CONEXÃO DE BACKUP DO UTILIZADOR`, "color: #a855f7; font-weight: bold; background: #a855f710; padding: 4px; border-radius: 4px;");

        const safetyBootTimeout = setTimeout(() => {
            if (!isParityValidatedRef.current) {
                logger.warn("[Firebase-Diag] TIMEOUT! Verifique sua internet ou permissões do Firebase.");
                confirmParity();
            }
        }, 5000);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            // FIX: Usar metadados do Firebase em vez de lock local para evitar descartar updates externos
            if (docSnap.metadata.hasPendingWrites) {
                logger.debug("[Sync] Ignorando snapshot: Escrita local pendente de envio para a nuvem.");
                return;
            }
            logger.styled(`[Firebase-Diag] CONEXÃO ESTABELECIDA! Recebido snapshots da nuvem.`, "color: #22c55e; font-weight: bold;");
            setCloudStatus('connected');
            setCloudError(null);
            const isFromCache = docSnap.metadata.fromCache;
            if (isFromCache) logger.debug("[Firebase-Diag] Nota: Dado vindo do cache local (ainda sincronizando com servidor...)");
            const exists = docSnap.exists();

            if (isFromCache && !exists && !isParityValidatedRef.current) {
                logger.debug("[Sync] Aguardando resposta real do servidor...");
                return;
            }

            clearTimeout(safetyBootTimeout);

            const cloudData = exists ? docSnap.data() : null;
            latestCloudDataRef.current = cloudData;

            if (!cloudData) {
                if (!isParityValidatedRef.current) {
                    lastSyncedRef.current = stateStringForSync(appStateRef.current);
                    confirmParity();
                }
                return;
            }

            // [Adicionar este bloco para resolver a Race Condition]
            const now = Date.now();
            const cloudUpdatedRaw = new Date(cloudData.lastUpdated);
            const cloudUpdatedTime = isNaN(cloudUpdatedRaw.getTime()) ? 0 : cloudUpdatedRaw.getTime();

            const localUpdatedRaw = new Date(appStateRef.current?.lastUpdated);
            const localUpdatedTime = isNaN(localUpdatedRaw.getTime()) ? 0 : localUpdatedRaw.getTime();

            const isBootSync = !isParityValidatedRef.current;
            const localWasJustEdited = (now - lastLocalMutationRef.current) < 15000;
 
            let shouldPullCloud = false;
            let mergeMode = "normal";
 
            if (isBootSync) {
                if (localWasJustEdited) {
                    logger.warn("[Sync] Bloqueio de Boot: Utilizador já iniciou edições locais.");
                    shouldPullCloud = false;
                } else {
                    // BUG 2 FIX: Se a nuvem não tem timestamp válido, NUNCA assuma "now".
                    // Assumir "now" criava um falso positivo de superioridade temporal, fazendo
                    // com que backups defeituosos assombrassem o cache local sobrescrevendo-o.
                    const cloudUpdated = cloudUpdatedTime || 0;
                    const localUpdated = localUpdatedTime;
 
                    const activeId = appStateRef.current?.activeId;
                    const activeContest = appStateRef.current?.contests?.[activeId];
                    const contestCount = Object.keys(appStateRef.current?.contests || {}).length;
                    const localHasSubstantialContent = contestCount > 1 || 
                        (activeContest?.categories && activeContest.categories.length > 0) ||
                        (activeContest?.user?.name && activeContest.user.name !== "Estudante");
 
                    const localIsInitial = localUpdated <= 0 || !localHasSubstantialContent;
 
                    const cloudHasContent = (cloudData.categories && cloudData.categories.length > 0) ||
                        (cloudData.contests && Object.values(cloudData.contests).some(c => c.categories && c.categories.length > 0));
 
                    const cloudContestIds = Object.keys(cloudData.contests || {});
                    const localContestIds = Object.keys(appStateRef.current?.contests || {});
                    const cloudHasMissingLocalContests = cloudContestIds.some(id => !localContestIds.includes(id));
 
                    if (localIsInitial && cloudHasContent) {
                        logger.warn("[Sync] LOCAL VAZIO DETECTADO. Forçando pull da nuvem para resgate.");
                        shouldPullCloud = true;
                    } else if (cloudHasMissingLocalContests) {
                        // Estabilidade: só puxa automaticamente paineis da nuvem ausentes localmente
                        // quando o estado local está realmente inicial/vazio. Se o local já é substancial,
                        // evitamos pull destrutivo no boot (sumir dados no 1º refresh).
                        if (localIsInitial) {
                            logger.warn("[Sync] NUVEM POSSUI PAINÉIS AUSENTES LOCALMENTE. Aplicando merge de resgate.");
                            shouldPullCloud = true;
                        } else {
                            logger.warn("[Sync] Divergência detectada (nuvem/local). Aplicando merge não-destrutivo.");
                            shouldPullCloud = true;
                            mergeMode = "nonDestructive";
                        }
                    } else if (cloudHasContent && cloudUpdated > localUpdated + 5000) {
                        logger.warn(`[Sync] NUVEM MAIS RECENTE (${Math.round((cloudUpdated - localUpdated) / 1000)}s). Aplicando pull.`);
                        shouldPullCloud = true;
                    } else {
                        logger.warn(`[Sync] RECUSANDO NUVEM! Local é mais recente ou substancial.`);
                        shouldPullCloud = false;
                    }
                }
 
                if (typeof window !== 'undefined' && (window.__ULTRA_RESCUE_SUCCESS || window.__ULTRA_RESCUE_CANDIDATE)) {
                    logger.warn("[Sync] BLOQUEIO DE RESGATE ATIVO. Recusando pull da nuvem para proteger dados locais.");
                    shouldPullCloud = false;
                }
            } else {
                shouldPullCloud = !localWasJustEdited;
            }
 
            const wasAlreadyValidated = isParityValidatedRef.current;
            confirmParity();
 
            if (shouldPullCloud) {
                logger.debug('[Sync] Dado da nuvem → processando merge e deduplicação');
                isCloudPullRef.current = true;
                // SAFETY: Never call setAppState after unmount (avoids React warning + memory leak)
                if (isMountedRef.current) {
                    setAppState(() => mergeAppState(useAppStore.getState().appState, cloudData, { nonDestructive: mergeMode === "nonDestructive" }));
                }
                lastSyncedRef.current = stateStringForSync(appStateRef.current);
                setHasConflict(false);

                if (!wasAlreadyValidated && showToastRef.current) {
                    showToastRef.current('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
                // Em boot/local-recent mode, NÃO aplicar merge com nuvem para evitar
                // efeito "sumiu no 1º refresh e voltou no 2º".
                // Ainda executamos deduplicação local não-destrutiva.
                if (isMountedRef.current) {
                    setAppState(() => mergeAppState(useAppStore.getState().appState, null));
                }
                lastSyncedRef.current = stateStringForSync(appStateRef.current);

                // Só sinaliza conflito quando há divergência temporal real entre local e nuvem.
                // No boot inicial é comum recusar pull para proteger dados locais substanciais,
                // e isso não deve aparecer como conflito para o utilizador.
                const hasRealDivergence = cloudUpdatedTime > 0 && localUpdatedTime > 0 && Math.abs(cloudUpdatedTime - localUpdatedTime) > 5000;
                setHasConflict(!isBootSync && hasRealDivergence);
            }
        }, (err) => {
            logger.error("[Sync] Erro no listener:", err);
            setCloudStatus('error');
            setCloudError(err.message || 'Erro no listener');
            confirmParity();
        });

        return () => {
            unsubscribe();
            clearTimeout(safetyBootTimeout);
        };
    }, [currentUser?.uid, setAppState, confirmParity, mergeAppState]);


    useEffect(() => {
        if (!currentUser?.uid) {
            setTimeout(() => {
                setCloudStatus('idle');
                setCloudError(null);
            }, 0);
        }
    }, [currentUser?.uid]);

    useEffect(() => {
        isParityValidatedRef.current = false;
        setTimeout(() => {
            setParityTick(t => t + 1);
            setHasConflict(false);
        }, 0);
        lastSyncedRef.current = null;
        lastLocalMutationRef.current = 0;
    }, [currentUser?.uid]);
    
    const performEmergencySync = useCallback(async () => {
        if (isLocalMode || !currentUser?.uid || !appStateRef.current || !isParityValidatedRef.current || !db) return;
        
        if (debounceRef.current) clearTimeout(debounceRef.current);
        
        const currentStateString = stateStringForSync(appStateRef.current);
        if (lastSyncedRef.current === currentStateString) return;

        try {
            // BUG-03 FIX: Use a single consistent snapshot instead of mixing
            // appStateRef.current (stale) with useAppStore.getState() (fresh).
            const syncState = useAppStore.getState().appState;
            const safeguardContest = (contest) => {
                if (!contest) return contest;
                return {
                    ...contest,
                    studyLogs: (contest.studyLogs || []).slice(-SYNC_LOG_CAP),
                    studySessions: (contest.studySessions || []).slice(-SYNC_LOG_CAP),
                    simuladoRows: (contest.simuladoRows || []).slice(-300),
                };
            };

            const safeContests = syncState.contests
                ? Object.fromEntries(Object.entries(syncState.contests).map(([id, c]) => [id, safeguardContest(c)]))
                : syncState.contests;

            const safeTrash = (syncState.trash || []).slice(-20);

            // CRITICAL FIX: SafeClone aplicado ao EmergencySync para evitar que Promises, 
            // refs do React, ou elementos do DOM invadam a store de sincronização.
            // O Firestore disparava DataCloneError quando o utilizador minimizava a tela, 
            // falhando silenciosamente e causando a perda de dados locais recentes.
            const stateToSave = cleanUndefined(safeClone({
                ...syncState,
                contests: safeContests,
                trash: safeTrash,
                history: [],
                _lastBackup: new Date().toISOString()
            }));

            setInternalSyncing(true);
            logger.debug(`[Sync] Iniciando conexão segura com a nuvem...`);
            // FIRE-AND-FORGET no mobile: iOS mata a thread no 'hidden'.
            // Atualizamos a ref OTIMISTICAMENTE para não causar deadlock infinito 
            // se o Promise nunca resolver devido ao App Suspense.
            lastSyncedRef.current = currentStateString;
            setDoc(doc(db, 'backups', currentUser.uid), stateToSave)
                .catch(e => logger.error("[Sync] Erro no emergency-save:", e))
                .finally(() => {
                    if (isMountedRef.current) setInternalSyncing(false);
                });
        } catch (e) {
            logger.error("[Sync] Erro na montagem do emergency-save:", e);
        }
    }, [currentUser?.uid, setInternalSyncing]);

    useEffect(() => {
        if (!currentUser?.uid || !db) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                performEmergencySync();
            } else if (document.visibilityState === 'visible') {
                // BUG FIX: iOS Safari suspende Promises no background.
                // Ao voltar para o app, se a Promise ficou pendurada, 
                // forçamos o desbloqueio do Sync State para não brickar o save.
                setInternalSyncing(false);
            }
        };

        const handleBeforeUnload = () => {
            let isDirty = false;
            try {
                const currentStr = stateStringForSync(appStateRef.current);
                if (lastSyncedRef.current !== currentStr) {
                    try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch (err) { logger.warn('[Sync] LocalStorage error on unload:', err); }
                    isDirty = true;
                }
            } catch (err) { logger.warn('[Sync] State sync error on unload:', err); }
            
            if (isDirty && typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SYNC_BEACON_URL && currentUser?.uid) {
                try {
                    const appState = appStateRef.current || {};
                    const payload = JSON.stringify({
                        uid: currentUser.uid,
                        lastUpdated: appState.lastUpdated || null,
                        version: appState.version || 0,
                        activeId: appState.activeId || null,
                        dirty: true
                    });
                    // FIX: Enviar como Blob para garantir o Content-Type: application/json
                    const blob = new Blob([payload], { type: 'application/json' });
                    
                    fetch(import.meta.env.VITE_SYNC_BEACON_URL, {
                        method: 'POST',
                        body: blob,
                        keepalive: true // Funciona mesmo com a aba a fechar, suportando payloads maiores
                    }).catch(err => console.debug('[Sync] Fetch keepalive error:', err));
                } catch(err) { logger.warn('[Sync] Beacon error:', err); }
            }

            // REMOVIDO: performEmergencySync(); 
            // Os browsers trucidam Promises geradas na desmontagem. Confiamos agora unicamente no Beacon API.
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [currentUser?.uid, performEmergencySync, setInternalSyncing]);

    useEffect(() => {
        if (isLocalMode || !currentUser?.uid || !syncTrigger || !isParityValidatedRef.current || !db) return;

        const currentState = useAppStore.getState().appState;
        const currentStateString = stateStringForSync(currentState);
        
        if (isCloudPullRef.current) {
            isCloudPullRef.current = false;
            lastSyncedRef.current = currentStateString;
            return;
        }

        if (lastSyncedRef.current === currentStateString) return;

        const lastMutation = Date.now();
        lastLocalMutationRef.current = lastMutation;
        setHasConflict(false);

        // BUG-07 FIX: Track re-entry depth to prevent infinite recursion
        const MAX_SYNC_REENTRY = 3;

        const syncToCloud = async () => {
            if (!db) return;
            
            // FIX 1: Se já estiver sincronizando, marca que "precisamos sincronizar de novo" 
            // logo que este acabar, em vez de ignorar o update silenciosamente.
            if (isInternalSyncingRef.current) {
                needsSyncRef.current = true;
                return;
            }
            
            needsSyncRef.current = false;

            const MAX_RETRIES = 3;
            let attempt = 0;
            let lastError = null;

            // Helper to prevent Firebase SDK hanging indefinitely on mobile network drops
            // FIX 3.3: Prevenção da Condição de Corrida no syncToCloud
            // O Promise.race não interrompe a escrita subjacente do Firebase. 
            // Esta abordagem anula bloqueios de estado e delega a fila offline nativamente ao SDK.
            const setDocWithTimeout = (docRef, data, timeoutMs = 15000) => {
                return new Promise((resolve, reject) => {
                    let isResolved = false;
                    const timer = setTimeout(() => {
                        isResolved = true;
                        reject(new Error('timeout_ignore_queue'));
                    }, timeoutMs);

                    setDoc(docRef, data).then(() => {
                        if (!isResolved) { clearTimeout(timer); resolve(); }
                    }).catch(err => {
                        if (!isResolved) { clearTimeout(timer); reject(err); }
                    });
                });
            };

            setInternalSyncing(true);
            while (attempt < MAX_RETRIES) {
                try {
                    // BUG-02 FIX: Re-capture a fresh, consistent snapshot inside each retry
                    // iteration instead of mixing stale contests with fresh top-level fields.
                    const freshState = useAppStore.getState().appState;
                    const currentStateString = stateStringForSync(freshState);

                    if (lastSyncedRef.current === currentStateString) break;

                    // BUG-FIX: A declaração local `const SYNC_LOG_CAP = 300` foi removida —
                    // ela sombreava o import de '../config', criando inconsistência silenciosa
                    // entre performEmergencySync (usa config) e syncToCloud (usava 300 fixo).
                    const safeguardContest = (contest) => {
                        if (!contest) return contest;
                        return {
                            ...contest,
                            studyLogs: (contest.studyLogs || []).slice(-SYNC_LOG_CAP),
                            studySessions: (contest.studySessions || []).slice(-SYNC_LOG_CAP),
                            simuladoRows: (contest.simuladoRows || []).slice(-300),
                        };
                    };

                    const safeContests = freshState.contests
                        ? Object.fromEntries(Object.entries(freshState.contests).map(([id, c]) => [id, safeguardContest(c)]))
                        : freshState.contests;

                    const safeTrash = (freshState.trash || []).slice(-20);

                    // SAFE UPLOAD: Purge non-serializable objects (Window, Events) + Truncate arrays
                    const stateToSave = cleanUndefined(safeClone({
                        ...freshState,
                        contests: safeContests,
                        trash: safeTrash,
                        history: [], // History slice is not synced
                        _lastBackup: new Date().toISOString()
                    }));

                    logger.debug(`[Sync] Tentativa ${attempt + 1}/${MAX_RETRIES} para Master-Save...`);
                    await setDocWithTimeout(doc(db, 'backups', currentUser.uid), stateToSave, 15000);
                    logger.styled(`[Sync] Sincronização MASTER com sucesso.`, "color: #22c55e; font-weight: bold;");
                    
                    lastSyncedRef.current = currentStateString;
                    
                    try { localStorage.removeItem('ultra-sync-dirty'); } catch(err) { logger.warn('[Sync] LocalStorage cleanup error:', err); }
                    
                    lastError = null;
                    break;
                } catch (e) {
                    lastError = e;
                    attempt++;
                    logger.error(`[Sync] Erro na tentativa ${attempt}:`, e);
                    if (attempt < MAX_RETRIES) {
                        await new Promise(r => setTimeout(r, attempt * 2000));
                    }
                }
            }

            if (lastError) {
                logger.error("[Sync] Todas as tentativas falharam:", lastError);
                if (showToastRef.current && lastError.code !== 'unavailable' && lastError.message !== 'timeout') {
                    showToastRef.current(`Falha ao salvar após ${MAX_RETRIES} tentativas`, 'error');
                }
            }

            if (isMountedRef.current) {
                setInternalSyncing(false);
                // CORREÇÃO: Usar a ref persistente para que o bloqueio funcione entre renders independentes
                if (needsSyncRef.current && syncReentryCountRef.current < MAX_SYNC_REENTRY) {
                    syncReentryCountRef.current++;
                    syncToCloud();
                } else {
                    syncReentryCountRef.current = 0; // Reset for next trigger cycle
                }
            }
        };

        if (debounceRef.current) clearTimeout(debounceRef.current);
        
        const isHighPriority = localStorage.getItem('ultra-sync-dirty') === 'true';
        const hasSyncedBefore = typeof lastSyncedRef.current === 'string' && lastSyncedRef.current.length > 0;
        // UX-SYNC: reduzir latência percebida ao abrir o app.
        // Primeira sincronização da sessão ganha prioridade (250ms), updates normais ficam em 1500ms.
        const delay = isHighPriority ? 500 : (hasSyncedBefore ? 1500 : 250);
        
        debounceRef.current = setTimeout(syncToCloud, delay);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [syncTrigger, parityTick, currentUser?.uid, setInternalSyncing, confirmParity]);

    // BUG-FIX: Memoize with useCallback to prevent needless re-renders in consumers that
    // take forcePullCloud as a dependency (e.g. Dashboard toolbar, ConflictBanner).
    const forcePull = useCallback(() => {
        if (latestCloudDataRef.current && setAppState && isMountedRef.current) {
            const merged = mergeAppState(useAppStore.getState().appState, latestCloudDataRef.current);
            setAppState(() => merged);
            lastSyncedRef.current = stateStringForSync(merged);
            setHasConflict(false);
            if (showToastRef.current) showToastRef.current('Paridade forçada com sucesso! 💎', 'success');
        }
    }, [mergeAppState, setAppState]);

    return {
        cloudStatus,
        cloudError,
        cloudConnected: cloudStatus === 'connected',
        isSyncing: isInternalSyncing,
        hasConflict,
        forcePullCloud: forcePull
    };
}
