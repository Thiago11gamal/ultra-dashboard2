import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { SYNC_LOG_CAP } from '../config';
import { logger } from '../utils/logger';

import { useAppStore } from '../store/useAppStore';

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

    const mergeAppState = (local, cloud) => {
        if (!cloud) return local;
        if (!local) return cloud;

        const mergedContests = { ...(local.contests || {}) };
        const cloudContests = cloud.contests || {};

        Object.entries(cloudContests).forEach(([id, cloudContest]) => {
            const localContest = mergedContests[id];
            
            if (!localContest) {
                mergedContests[id] = cloudContest;
            } else {
                const cloudTime = new Date(cloudContest.lastUpdated || 0).getTime();
                const localTime = new Date(localContest.lastUpdated || 0).getTime();
                
                if (cloudTime > localTime) {
                    const mergedCatsMap = {};
                    (localContest.categories || []).forEach(c => mergedCatsMap[c.id] = c);
                    (cloudContest.categories || []).forEach(c => mergedCatsMap[c.id] = c);
                    
                    const mergeArrays = (arr1, arr2) => {
                        const map = new Map();
                        const getStableKey = (item) => item.id || `${item.date || ''}-${item.categoryId || ''}-${item.taskId || ''}`;
                        
                        (arr1 || []).forEach(item => map.set(getStableKey(item), item));
                        (arr2 || []).forEach(item => map.set(getStableKey(item), item));
                        return Array.from(map.values());
                    };

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

        const cloudUpdated = new Date(cloud.lastUpdated || 0).getTime();
        const localUpdated = new Date(local.lastUpdated || 0).getTime();
        const activeId = cloudUpdated > localUpdated ? cloud.activeId : local.activeId;

        return {
            ...local,
            ...cloud,
            contests: mergedContests,
            activeId: activeId || local.activeId || cloud.activeId,
            version: Math.max(local.version ?? 0, cloud.version ?? 0),
            lastUpdated: new Date(Math.max(cloudUpdated, localUpdated)).toISOString()
        };
    };

    const stateStringForSync = (state) => {
        if (!state) return '';
        const activeContest = state.contests?.[state.activeId];
        
        const taskHash = (activeContest?.categories || [])
            .reduce((acc, cat) => acc + (cat.tasks?.length || 0), 0);
        
        const lastUpdated = state.lastUpdated || "0";
        const version = state.version || 0;

        return `${lastUpdated}|v${version}|tasks:${taskHash}|active:${state.activeId}`;
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
            if (isInternalSyncingRef.current) {
                logger.debug("[Sync] Ignorando snapshot da nuvem pois existe um save local em curso.");
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

            const cloudStateString = stateStringForSync(cloudData);
            const currentStateString = stateStringForSync(appStateRef.current);
            const contentsAreDifferent = currentStateString !== cloudStateString;

            if (!contentsAreDifferent) {
                setHasConflict(false);
                lastSyncedRef.current = cloudStateString;
                confirmParity();
                return;
            }

            const isBootSync = !isParityValidatedRef.current;
            const now = Date.now();
            const localWasJustEdited = (now - lastLocalMutationRef.current) < 15000;

            let shouldPullCloud = false;

            if (isBootSync) {
                if (localWasJustEdited) {
                    logger.warn("[Sync] Bloqueio de Boot: Utilizador já iniciou edições locais.");
                    shouldPullCloud = false;
                } else {
                    const cloudUpdatedRaw = new Date(cloudData.lastUpdated);
                    const cloudUpdated = isNaN(cloudUpdatedRaw.getTime()) ? now : cloudUpdatedRaw.getTime();

                    const localUpdatedRaw = new Date(appStateRef.current?.lastUpdated);
                    const localUpdated = isNaN(localUpdatedRaw.getTime()) ? 0 : localUpdatedRaw.getTime();

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

            if (shouldPullCloud) {
                logger.debug("[Sync] Dado recebido da nuvem → atualizando estado local");
                isCloudPullRef.current = true;
                setAppState(prev => mergeAppState(prev, cloudData));
                lastSyncedRef.current = cloudStateString;
                setHasConflict(false);

                if (!wasAlreadyValidated && showToastRef.current) {
                    showToastRef.current('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
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
    }, [currentUser?.uid, setAppState]);

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

            const stateToSave = JSON.parse(JSON.stringify({
                ...syncState,
                contests: safeContests,
                trash: safeTrash,
                history: [],
                _lastBackup: new Date().toISOString()
            }));

            setInternalSyncing(true);
            logger.debug(`[Sync] Iniciando conexão segura com a nuvem...`);
            await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
            lastSyncedRef.current = currentStateString;
        } catch (e) {
            logger.error("[Sync] Erro no emergency-save:", e);
        } finally {
            if (isMountedRef.current) setInternalSyncing(false);
        }
    }, [currentUser?.uid]);

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
                    navigator.sendBeacon(import.meta.env.VITE_SYNC_BEACON_URL, payload);
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

                    const stateToSave = JSON.parse(JSON.stringify({
                        ...syncState,
                        contests: safeContests,
                        trash: safeTrash,
                        history: [],
                        _lastBackup: new Date().toISOString()
                    }));

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
    }, [syncTrigger, parityTick, currentUser?.uid]);

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
