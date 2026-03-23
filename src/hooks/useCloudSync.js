import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { SYNC_LOG_CAP } from '../config';
import { logger } from '../utils/logger';



export function useCloudSync(currentUser, appState, setAppState, showToast) {
    const lastSyncedRef = useRef(null);
    const isParityValidatedRef = useRef(false);
    const [parityTick, setParityTick] = useState(0); // L2: State just for reactivity, logic uses Ref
    const lastLocalMutationRef = useRef(0);
    const isCloudPullRef = useRef(false);
    const debounceRef = useRef(null);
    const latestCloudDataRef = useRef(null);
    const isMountedRef = useRef(true);
    const [cloudConnected, setCloudConnected] = useState(false);
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
    const stateStringForSync = (state) => {
        if (!state) return '';
        return `${state.lastUpdated}|${state.activeId}|${state.version ?? 0}`;
    };

    // 1. RECEPTOR (onSnapshot) - Slave Mode
    useEffect(() => {
        if (!currentUser?.uid || !setAppState || !db) {
            if (!db && currentUser?.uid) console.warn("[Sync] Firestore (db) is missing. Cloud sync disabled.");
            confirmParity();
            return;
        }

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
            setCloudConnected(true);
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
                const activeContest = appStateRef.current?.contests?.[appStateRef.current?.activeId];
                const localIsInitial = localUpdated <= 0 ||
                    activeContest?.user?.name === "Estudante" ||
                    !appStateRef.current?.contests ||
                    Object.values(appStateRef.current.contests).every(c => !c.categories || c.categories.length === 0);

                const cloudHasContent = (cloudData.categories && cloudData.categories.length > 0) ||
                    (cloudData.contests && Object.values(cloudData.contests).some(c => c.categories && c.categories.length > 0));

                if (localIsInitial && cloudHasContent) {
                    logger.warn("[Sync] LOCAL VAZIO DETECTADO. Forçando pull da nuvem para resgate.");
                    shouldPullCloud = true;
                } else if (cloudHasContent && cloudUpdated > localUpdated + 5000) {
                    // 🛡️ BUG-C2: Nuvem é significativamente mais recente (>5s) — puxar
                    logger.warn(`[Sync] NUVEM MAIS RECENTE (${Math.round((cloudUpdated - localUpdated) / 1000)}s). Aplicando pull.`);
                    shouldPullCloud = true;
                } else {
                    logger.warn(`[Sync] RECUSANDO NUVEM! Local é mais recente. Local: ${new Date(localUpdated).toISOString()} | Cloud: ${new Date(cloudUpdated).toISOString()}`);
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
                setAppState(cloudData);
                lastSyncedRef.current = cloudStateString;
                setHasConflict(false);

                if (!wasAlreadyValidated && showToast) {
                    showToast('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
                logger.debug("[Sync] Divergência detectada (edição local ativa). Prioridade local mantida.");
                setHasConflict(true);
            }
        }, (err) => {
            logger.error("[Sync] Erro no listener:", err);
            setCloudConnected(false);
            // Se der erro (ex: offline), liberamos para evitar travar o usuário
            confirmParity();
        });

        return () => {
            unsubscribe();
            setCloudConnected(false);
            clearTimeout(safetyBootTimeout);
        };
    }, [currentUser?.uid, setAppState, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

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
            try {
                if (lastSyncedRef.current === currentStateString) return;
                if (lastLocalMutationRef.current !== lastMutation) return;

                const syncState = appState; // usa o state do closure do efeito
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
                logger.debug(`[Sync] Enviando atualização MASTER para nuvem...`);
                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                logger.styled("[Firebase-Diag] DADOS SINCRONIZADOS COM SUCESSO! ✅", "color: #22c55e; font-weight: bold;");
                lastSyncedRef.current = currentStateString;
            } catch (e) {
                logger.error("[Sync] Erro no auto-save:", e);
                if (showToast && e.code !== 'unavailable') {
                    showToast(`Falha crítica ao salvar: ${e.message}`, 'error');
                }
            } finally {
                if (isMountedRef.current) setIsInternalSyncing(false);
            }
        };

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(syncToCloud, 3000);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [appState, parityTick, currentUser?.uid, showToast]); // L2: Usa parityTick em vez de isParityValidated. L3: Retirado db.

    const forcePull = () => {
        if (latestCloudDataRef.current && setAppState) {
            setAppState(latestCloudDataRef.current);
            lastSyncedRef.current = stateStringForSync(latestCloudDataRef.current);
            setHasConflict(false);
            if (showToast) showToast('Paridade forçada com sucesso! 💎', 'success');
        }
    };

    return {
        cloudConnected,
        isSyncing: isInternalSyncing,
        hasConflict,
        forcePull
    };
}
