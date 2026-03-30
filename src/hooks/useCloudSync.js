import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { SYNC_LOG_CAP } from '../config';
import { logger } from '../utils/logger';



export function useCloudSync(currentUser, appState, setAppState, showToast) {
    // FIX: Estabiliza a referência do toast para não disparar reinícios do Firebase
    const showToastRef = useRef(showToast);
    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);

    const lastSyncedRef = useRef(null);
    const isParityValidatedRef = useRef(false);
    const [parityTick, setParityTick] = useState(0); // L2: State just for reactivity, logic uses Ref
    const lastLocalMutationRef = useRef(0);
    const isCloudPullRef = useRef(false);
    const debounceRef = useRef(null);
    const latestCloudDataRef = useRef(null);
    const isMountedRef = useRef(true);
    const [cloudStatus, setCloudStatus] = useState('idle');
    const [cloudError, setCloudError] = useState(null);
    const [isInternalSyncing, setIsInternalSyncing] = useState(false);
    const [hasConflict, setHasConflict] = useState(false);

    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    }, [appState]);

    // L2: Helper unificado para confirmar paridade sem dessincronização ref/state
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

    // Normalização leve para detecção de mudança em tempo real
    // Baseado puramente no timestamp e ID ativo para evitar O(n log n) no hot-path.
    // Merge logic: Combine local and cloud contests safely
    const mergeAppState = (local, cloud) => {
        if (!cloud) return local;
        if (!local) return cloud;

        const mergedContests = { ...(local.contests || {}) };
        const cloudContests = cloud.contests || {};

        Object.entries(cloudContests).forEach(([id, cloudContest]) => {
            const localContest = mergedContests[id];
            
            if (!localContest) {
                // New contest from cloud
                mergedContests[id] = cloudContest;
            } else {
                // Conflict: Pick the one with the newer lastUpdated
                const cloudTime = new Date(cloudContest.lastUpdated || 0).getTime();
                const localTime = new Date(localContest.lastUpdated || 0).getTime();
                
                if (cloudTime > localTime) {
                    mergedContests[id] = cloudContest;
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
        // MELHORIA 7: Incluir hash leve do número de categorias+sessões para detectar
        // colisões de timestamp entre dispositivos diferentes.
        const contestCount = state.contests ? Object.keys(state.contests).length : 0;
        const activeContest = state.contests?.[state.activeId];
        const catCount = activeContest?.categories?.length ?? 0;
        const sessionCount = activeContest?.studySessions?.length ?? 0;
        const catHash = (activeContest?.categories || [])
            .map(c => `${(c.id || '').substring(0, 4)}${c.name?.length ?? 0}`)
            .join('-');
        return `${state.lastUpdated}|${state.activeId}|${state.version ?? 0}|${contestCount}:${catCount}:${sessionCount}:${catHash}`;
    };

    // 1. RECEPTOR (onSnapshot) - Slave Mode
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
            console.error("[Sync] Firebase initialization error (likely missing Vercel env vars):", err);
            confirmParity();
            return;
        }

        logger.styled(`[Firebase-Diag] TESTANDO CONEXÃO PARA UID: ${currentUser.uid}`, "color: #a855f7; font-weight: bold; background: #a855f710; padding: 4px; border-radius: 4px;");

        // Fallback: se o servidor demorar demais (>5s), liberamos o app (previne trava offline)
        const safetyBootTimeout = setTimeout(() => {
            if (!isParityValidatedRef.current) {
                logger.warn("[Firebase-Diag] TIMEOUT! Verifique sua internet ou permissões do Firebase.");
                confirmParity();
            }
        }, 5000);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            logger.styled(`[Firebase-Diag] CONEXÃO ESTABELECIDA! Recebido snapshots da nuvem.`, "color: #22c55e; font-weight: bold;");
            setCloudStatus('connected');
            setCloudError(null);
            const isFromCache = docSnap.metadata.fromCache;
            if (isFromCache) logger.debug("[Firebase-Diag] Nota: Dado vindo do cache local (ainda sincronizando com servidor...)");
            const exists = docSnap.exists();

            // BLOQUEIO SEGURO: Se veio do cache e está vazio, IGNORE.
            // Isso evita o "envenenamento" onde o dado local antigo sobe pra nuvem antes da nuvem responder o real.
            if (isFromCache && !exists && !isParityValidatedRef.current) {
                logger.debug("[Sync] Aguardando resposta real do servidor...");
                return;
            }

            clearTimeout(safetyBootTimeout);

            const cloudData = exists ? docSnap.data() : null;
            latestCloudDataRef.current = cloudData;

            if (!cloudData) {
                // Nuvem realmente vazia (confirmado pelo servidor ou cache confirmado)
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

            // --- LOCKDOWN RULE: CLOUD WINS ON BOOT (WITH TIMESTAMP CHECK) ---
            const isBootSync = !isParityValidatedRef.current;

            // --- CONFLICT RESOLUTION ---
            // Aumentando a janela de proteção local para 15 segundos.
            // Se o usuário digitou qualquer coisa nos últimos 15s, a nuvem NÃO deve sobrescrever.
            const localWasJustEdited = (Date.now() - lastLocalMutationRef.current) < 15000;

            let shouldPullCloud = false;

            if (isBootSync) {
                const cloudUpdatedRaw = new Date(cloudData.lastUpdated);
                const cloudUpdated = isNaN(cloudUpdatedRaw.getTime()) ? Date.now() : cloudUpdatedRaw.getTime();

                const localUpdatedRaw = new Date(appStateRef.current?.lastUpdated);
                const localUpdated = isNaN(localUpdatedRaw.getTime()) ? 0 : localUpdatedRaw.getTime();

                // SYNC-01 FIX: user está em contests[activeId].user, não no root de appState
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
                    // 🛡️ BUG-C2: Nuvem é significativamente mais recente (>5s) — puxar
                    logger.warn(`[Sync] NUVEM MAIS RECENTE (${Math.round((cloudUpdated - localUpdated) / 1000)}s). Aplicando pull.`);
                    shouldPullCloud = true;
                }
 else {
                    logger.warn(`[Sync] RECUSANDO NUVEM! Local é mais recente ou substancial. Local: ${new Date(localUpdated).toISOString()} | Cloud: ${new Date(cloudUpdated).toISOString()} | LocalSubstantial: ${localHasSubstantialContent}`);
                    shouldPullCloud = false;
                }

                // PROTEÇÃO ANTI-SOBRECRITA DE RESGATE
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
                logger.debug(`[Sync] Sincronização MASTER aplicada. Motivo: ${isBootSync ? 'Boot' : 'Idle/Verdade Global'}`);
                isCloudPullRef.current = true;
                setAppState(prev => mergeAppState(prev, cloudData));
                lastSyncedRef.current = cloudStateString;
                setHasConflict(false);

                if (!wasAlreadyValidated && showToastRef.current) {
                    showToastRef.current('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
                logger.debug("[Sync] Divergência detectada (edição local ativa). Prioridade local mantida.");
                setHasConflict(true);
            }
        }, (err) => {
            logger.error("[Sync] Erro no listener:", err);
            setCloudStatus('error');
            setCloudError(err.message || 'Erro no listener');
            // Se der erro (ex: offline), liberamos para evitar travar o usuário
            confirmParity();
        });

        return () => {
            unsubscribe();
            setCloudStatus('idle');
            clearTimeout(safetyBootTimeout);
        };
    }, [currentUser?.uid, setAppState]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        isParityValidatedRef.current = false;
        setParityTick(t => t + 1);
        lastSyncedRef.current = null;
        lastLocalMutationRef.current = 0;
        setHasConflict(false);
    }, [currentUser?.uid]);

    // -------------------------------------------------------------------------
    // 2. EMISSOR (Auto-save) - Master Mode
    // -------------------------------------------------------------------------
    
    // BUG-M2 FIX: Função de sync estável que usa refs para evitar re-registro de listeners
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

            const stateToSave = JSON.parse(JSON.stringify({
                ...syncState,
                contests: safeContests,
                history: [],
                _lastBackup: new Date().toISOString()
            }));

            setIsInternalSyncing(true);
            logger.debug(`[Sync] [EMERGENCY] Enviando atualização para nuvem...`);
            await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
            lastSyncedRef.current = currentStateString;
        } catch (e) {
            logger.error("[Sync] Erro no emergency-save:", e);
        } finally {
            if (isMountedRef.current) setIsInternalSyncing(false);
        }
    }, [currentUser?.uid]); // L3: Removido db

    // Registro estável de listeners (BUG-M2)
    useEffect(() => {
        if (!currentUser?.uid || !db) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                performEmergencySync();
            }
        };

        const handleBeforeUnload = () => {
            // BUG-9 FIX: Mark dirty in localStorage so next boot can detect unsaved data
            let isDirty = false;
            try {
                const currentStr = stateStringForSync(appStateRef.current);
                if (lastSyncedRef.current !== currentStr) {
                    localStorage.setItem('ultra-sync-dirty', 'true');
                    isDirty = true;
                }
            } catch (_) { /* ignore */ }
            
            // Mitigação Real: sendBeacon workflow. Como Firestore Client não suporta beacon
            // nativamente pela complexidade do formato de documento, disparamos para um Worker 
            // Vercel Edge customizado caso configurado.
            if (isDirty && typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SYNC_BEACON_URL && currentUser?.uid) {
                try {
                    const payload = JSON.stringify({ uid: currentUser.uid, state: appStateRef.current });
                    navigator.sendBeacon(import.meta.env.VITE_SYNC_BEACON_URL, payload);
                } catch(e) {}
            }

            performEmergencySync();
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [currentUser?.uid, performEmergencySync]); // L3: Removido db

    // Timer de Debounce para auto-save normal
    useEffect(() => {
        if (!currentUser?.uid || !appState || !isParityValidatedRef.current || !db) return;

        const currentStateString = stateStringForSync(appState);
        
        // BUG-08 FIX: Se a mudança foi gerada por um PULL da nuvem, não dispare write-back.
        if (isCloudPullRef.current) {
            isCloudPullRef.current = false;
            lastSyncedRef.current = currentStateString;
            return;
        }

        if (lastSyncedRef.current === currentStateString) return;

        // Mutação local detectada
        const lastMutation = Date.now();
        lastLocalMutationRef.current = lastMutation;
        setHasConflict(false);

        const syncToCloud = async () => {
            if (!db) return;
            const freshState = appStateRef.current;
            const currentStateString = stateStringForSync(freshState);
            const lastMutationAtInvoke = lastLocalMutationRef.current;

            const MAX_RETRIES = 3;
            let attempt = 0;
            let lastError = null;

            setIsInternalSyncing(true);
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

                    const stateToSave = JSON.parse(JSON.stringify({
                        ...syncState,
                        contests: safeContests,
                        history: [],
                        _lastBackup: new Date().toISOString()
                    }));

                    logger.debug(`[Sync] Tentativa ${attempt + 1}/${MAX_RETRIES} para Master-Save...`);
                    await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                    logger.styled(`[Sync] Sincronização MASTER com sucesso.`, "color: #22c55e; font-weight: bold;");
                    
                    lastSyncedRef.current = currentStateString;
                    
                    // FORTRESS: Limpar flag de "sujo" apenas após confirmação do Firebase
                    try { localStorage.removeItem('ultra-sync-dirty'); } catch(_) {}
                    
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

            if (isMountedRef.current) setIsInternalSyncing(false);
        };

        if (debounceRef.current) clearTimeout(debounceRef.current);
        
        // FORTRESS: Se houver flag de "sujo", sincronizar IMEDIATAMENTE (100ms)
        const isHighPriority = localStorage.getItem('ultra-sync-dirty') === 'true';
        const delay = isHighPriority ? 100 : 3000;
        
        debounceRef.current = setTimeout(syncToCloud, delay);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [appState, parityTick, currentUser?.uid]);

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
