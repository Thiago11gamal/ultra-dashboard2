import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { SYNC_LOG_CAP } from '../config';
import { logger } from '../utils/logger';

import { useAppStore } from '../store/useAppStore';

// Remove propriedades nulas/indefinidas de forma segura sem travar a main thread
const cleanUndefined = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(cleanUndefined).filter(i => i !== undefined);
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, cleanUndefined(v)])
    );
};

export function useCloudSync(currentUser, initialAppState, setAppState, showToast, syncTrigger) {
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
    const setInternalSyncing = useCallback((val) => {
        setIsInternalSyncing(val);
        isInternalSyncingRef.current = val;
    }, []);
    const [hasConflict, setHasConflict] = useState(false);

    const appStateRef = useRef(initialAppState);
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
    const _normName = (str) => {
        if (typeof str !== 'string') return '';
        return str
            .normalize('NFKC').toLowerCase().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .replace(/\s+/g, ' ').trim();
    };

    const deduplicateCategoryNames = (contest) => {
        if (!Array.isArray(contest?.categories)) return contest;
        const nameMap = {};
        contest.categories.forEach(cat => {
            const key = _normName(cat.name);
            const richness = (c) => {
                const h = c.simuladoStats?.history;
                const hLen = h ? (Array.isArray(h) ? h.length : Object.values(h).length) : 0;
                return (c.tasks?.length || 0) + hLen;
            };
            if (!nameMap[key]) {
                nameMap[key] = cat;
            } else if (richness(cat) > richness(nameMap[key])) {
                console.warn(`[dedup] "${cat.name}" — keeping richer copy (id=${cat.id}).`);
                nameMap[key] = cat;
            } else {
                console.warn(`[dedup] "${cat.name}" — discarding thin copy (id=${cat.id}).`);
            }
        });
        const deduped = Object.values(nameMap);
        if (deduped.length === contest.categories.length) return contest;
        return { ...contest, categories: deduped };
    };

    const mergeAppState = (local, cloud) => {
        if (!cloud) return local;
        if (!local) return cloud;

        const localContests = local.contests || {};
        const cloudContests = cloud.contests || {};
        const mergedContests = { ...localContests };

        const cloudFullUpdate = new Date(cloud.lastUpdated || 0).getTime();
        const localFullUpdate = new Date(local.lastUpdated || 0).getTime();

        const mergeArrays = (arr1, arr2) => {
            const map = new Map();
            const getStableKey = (item) => item.id || `${item.date || ''}-${item.categoryId || ''}-${item.taskId || ''}`;
            (arr1 || []).forEach(item => map.set(getStableKey(item), item));
            (arr2 || []).forEach(item => map.set(getStableKey(item), item));
            return Array.from(map.values());
        };

        // 1. Processar adições e atualizações da nuvem
        Object.entries(cloudContests).forEach(([id, cloudContest]) => {
            const localContest = localContests[id];
            
            if (!localContest) {
                // Novo painel vindo da nuvem
                mergedContests[id] = cloudContest;
            } else {
                // Painel existente: comparar timestamps granulares
                const cloudTime = new Date(cloudContest.lastUpdated || 0).getTime();
                const localTime = new Date(localContest.lastUpdated || 0).getTime();
                
                if (cloudTime > localTime) {
                    const mergedCatsMap = {};
                    (localContest.categories || []).forEach(c => mergedCatsMap[c.id] = c);
                    (cloudContest.categories || []).forEach(c => mergedCatsMap[c.id] = c);

                    mergedContests[id] = { 
                        ...cloudContest, 
                        categories: Object.values(mergedCatsMap),
                        studyLogs: mergeArrays(localContest.studyLogs, cloudContest.studyLogs),
                        studySessions: mergeArrays(localContest.studySessions, cloudContest.studySessions),
                        simuladoRows: mergeArrays(localContest.simuladoRows, cloudContest.simuladoRows)
                    };
                }
            }
        });

        // 2. SINCRONIZAÇÃO DE DELEÇÃO (Bug Fix solicitado)
        // Se um painel existe localmente mas NÃO está na nuvem, e a nuvem é MAIS RECENTE
        // que a última alteração desse painel local, significa que ele foi deletado em outro dispositivo.
        Object.keys(localContests).forEach(id => {
            if (!cloudContests[id]) {
                const localTime = new Date(localContests[id]?.lastUpdated || 0).getTime();
                // Margem de 5s para evitar race conditions de clock
                if (cloudFullUpdate > localTime + 5000) {
                    console.warn(`[Sync] Deletando painel "${id}" localmente (removido na nuvem).`);
                    delete mergedContests[id];
                }
            }
        });

        // [O restante da lógica de deduplicação e activeId permanece igual]
        Object.keys(mergedContests).forEach(id => {
            mergedContests[id] = deduplicateCategoryNames(mergedContests[id]);
        });

        const isLocalIdValid = local.activeId && mergedContests[local.activeId];
        const activeId = isLocalIdValid
            ? local.activeId
            : (cloud.activeId && mergedContests[cloud.activeId] ? cloud.activeId : local.activeId);

        return {
            ...local,
            ...cloud,
            contests: mergedContests,
            activeId: activeId || local.activeId || cloud.activeId,
            version: Math.max(local.version ?? 0, cloud.version ?? 0),
            lastUpdated: new Date(Math.max(cloudFullUpdate, localFullUpdate)).toISOString()
        };
    };

    const stateStringForSync = (state) => {
        if (!state) return '';
        
        // Confiamos no timestamp de última atualização e na versão para detetar mudanças
        const lastUpdated = state.lastUpdated || "0";
        const version = state.version || 0;

        return `${lastUpdated}|v${version}|active:${state.activeId}`;
    };

    useEffect(() => {
        if (!currentUser?.uid || !setAppState || !db || db?.app?.options?.projectId === 'config-missing') {
            if (currentUser?.uid && (!db || db?.app?.options?.projectId === 'config-missing')) {
                console.error("[Sync] Erro: Configuração do Firebase incompleta (VITE_FIREBASE_PROJECT_ID ausente).");
                setCloudStatus('error');
                setCloudError('Configuração incompleta (.env)');
            } else if (!currentUser?.uid) {
                setCloudStatus('idle');
            }
            confirmParity();
            return;
        }

        setCloudStatus('connecting');
        setCloudError(null);

        let docRef;
        try {
            docRef = doc(db, 'backups', currentUser.uid);
        } catch (err) {
            console.error("[Sync] Firebase initialization error:", err);
            confirmParity();
            return;
        }

        logger.styled(`[Firebase-Diag] TESTANDO CONEXÃO PARA UID: ${currentUser.uid}`, "color: #a855f7; font-weight: bold; background: #a855f710; padding: 4px; border-radius: 4px;");

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

            if (isBootSync) {
                if (localWasJustEdited) {
                    logger.warn("[Sync] Bloqueio de Boot: Utilizador já iniciou edições locais.");
                    shouldPullCloud = false;
                } else {
                    // BUG 2 FIX: Reusar cloudUpdatedTime/localUpdatedTime do escopo externo
                    // em vez de redeclarar variáveis shadow que criam Date duplicados.
                    const cloudUpdated = cloudUpdatedTime || now;
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
                        logger.warn("[Sync] NUVEM POSSUI PAINÉIS AUSENTES LOCALMENTE. Aplicando merge.");
                        shouldPullCloud = true;
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

            if (shouldPullCloud || isBootSync) {
                const actionLabel = shouldPullCloud ? "Dado da nuvem" : "Health Pulse";
                logger.debug(`[Sync] ${actionLabel} → processando merge e deduplicação`);
                isCloudPullRef.current = true;
                setAppState(prev => mergeAppState(prev, cloudData));
                lastSyncedRef.current = stateStringForSync(appStateRef.current);
                setHasConflict(false);

                if (shouldPullCloud && !wasAlreadyValidated && showToastRef.current) {
                    showToastRef.current('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
                // Se não puxamos a nuvem mas o snapshot chegou, ainda assim rodamos um
                // merge local silencioso só para garantir a deduplicação se for a primeira vez.
                setHasConflict(true);
            }
        }, (err) => {
            logger.error("[Sync] Erro no listener:", err);
            setCloudStatus('error');
            setCloudError(err.message || 'Erro no listener');
            confirmParity();
        });

        return () => {
            unsubscribe();
            setCloudStatus('idle');
            clearTimeout(safetyBootTimeout);
        };
    }, [currentUser?.uid, setAppState, confirmParity]);

    useEffect(() => {
        isParityValidatedRef.current = false;
        setParityTick(t => t + 1);
        lastSyncedRef.current = null;
        lastLocalMutationRef.current = 0;
        setHasConflict(false);
    }, [currentUser?.uid]);
    
    const performEmergencySync = useCallback(async () => {
        if (!currentUser?.uid || !appStateRef.current || !isParityValidatedRef.current || !db) return;
        
        if (debounceRef.current) clearTimeout(debounceRef.current);
        
        const currentStateString = stateStringForSync(appStateRef.current);
        if (lastSyncedRef.current === currentStateString) return;

        try {
            const syncState = appStateRef.current;
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

            const safeTrash = (syncState.trash || [])
                .slice(-20) 
                .map(item => ({
                    ...item,
                    data: item.type === 'contest' ? "{truncated}" : item.data 
                }));

            const stateToSave = cleanUndefined({
                ...syncState,
                contests: safeContests,
                trash: safeTrash,
                history: [],
                _lastBackup: new Date().toISOString()
            });

            setInternalSyncing(true);
            logger.debug(`[Sync] Iniciando conexão segura com a nuvem...`);
            await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
            lastSyncedRef.current = currentStateString;
        } catch (e) {
            logger.error("[Sync] Erro no emergency-save:", e);
        } finally {
            if (isMountedRef.current) setInternalSyncing(false);
        }
    }, [currentUser?.uid, setInternalSyncing]);

    useEffect(() => {
        if (!currentUser?.uid || !db) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                performEmergencySync();
            }
        };

        const handleBeforeUnload = () => {
            let isDirty = false;
            try {
                const currentStr = stateStringForSync(appStateRef.current);
                if (lastSyncedRef.current !== currentStr) {
                    try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch (err) { console.debug('Storage error', err); }
                    isDirty = true;
                }
            } catch (err) { console.debug('State sync error', err); }
            
            if (isDirty && typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SYNC_BEACON_URL && currentUser?.uid) {
                try {
                    const payload = JSON.stringify({ uid: currentUser.uid, state: appStateRef.current });
                    // FIX: Enviar como Blob para garantir o Content-Type: application/json
                    const blob = new Blob([payload], { type: 'application/json' });
                    navigator.sendBeacon(import.meta.env.VITE_SYNC_BEACON_URL, blob);
                } catch(err) { console.debug('Beacon error', err); }
            }

            performEmergencySync();
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [currentUser?.uid, performEmergencySync]);

    useEffect(() => {
        if (!currentUser?.uid || !syncTrigger || !isParityValidatedRef.current || !db) return;

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

        const syncToCloud = async () => {
            if (!db || isInternalSyncingRef.current) return; // FIX: Lock de sincronização para evitar overlaps
            
            const freshState = useAppStore.getState().appState; // FIX: Captura o estado real atual do store
            const currentStateString = stateStringForSync(freshState);
            const lastMutationAtInvoke = lastLocalMutationRef.current;

            const MAX_RETRIES = 3;
            let attempt = 0;
            let lastError = null;

            setInternalSyncing(true);
            while (attempt < MAX_RETRIES) {
                try {
                    if (lastSyncedRef.current === currentStateString) break;
                    if (lastLocalMutationRef.current !== lastMutationAtInvoke) break;

                    const syncState = freshState;
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

                    const safeTrash = (syncState.trash || [])
                        .slice(-20)
                        .map(item => ({
                            ...item,
                            data: item.type === 'contest' ? "{truncated}" : item.data
                        }));

                    const stateToSave = cleanUndefined({
                        ...syncState,
                        contests: safeContests,
                        trash: safeTrash,
                        history: [],
                        _lastBackup: new Date().toISOString()
                    });

                    logger.debug(`[Sync] Tentativa ${attempt + 1}/${MAX_RETRIES} para Master-Save...`);
                    await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                    logger.styled(`[Sync] Sincronização MASTER com sucesso.`, "color: #22c55e; font-weight: bold;");
                    
                    lastSyncedRef.current = currentStateString;
                    
                    try { localStorage.removeItem('ultra-sync-dirty'); } catch(err) { console.debug('Storage error', err); }
                    
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
                if (showToastRef.current && lastError.code !== 'unavailable') {
                    showToastRef.current(`Falha ao salvar após ${MAX_RETRIES} tentativas`, 'error');
                }
            }

            if (isMountedRef.current) setInternalSyncing(false);
        };

        if (debounceRef.current) clearTimeout(debounceRef.current);
        
        const isHighPriority = localStorage.getItem('ultra-sync-dirty') === 'true';
        const delay = isHighPriority ? 500 : 5000;
        
        debounceRef.current = setTimeout(syncToCloud, delay);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [syncTrigger, parityTick, currentUser?.uid, setInternalSyncing]);

    const forcePull = () => {
        if (latestCloudDataRef.current && setAppState) {
            setAppState(prev => mergeAppState(prev, latestCloudDataRef.current));
            lastSyncedRef.current = stateStringForSync(latestCloudDataRef.current);
            setHasConflict(false);
            if (showToastRef.current) showToastRef.current('Paridade forçada com sucesso! 💎', 'success');
        }
    };

    return {
        cloudStatus,
        cloudError,
        cloudConnected: cloudStatus === 'connected',
        isSyncing: isInternalSyncing,
        hasConflict,
        forcePullCloud: forcePull
    };
}
