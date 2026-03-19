import { useEffect, useRef, useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { SYNC_LOG_CAP } from '../config';
import { logger } from '../utils/logger';



export function useCloudSync(currentUser, appState, setAppState, showToast) {
    const lastSyncedRef = useRef(null);
    const isParityValidatedRef = useRef(false);
    const [isParityValidated, setIsParityValidated] = useState(false); // Mantemos o estado para trigger de re-render se necessário, mas a lógica lerá do ref
    const lastLocalMutationRef = useRef(0);
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
            isParityValidatedRef.current = true;
            setIsParityValidated(true);
            return;
        }

        const docRef = doc(db, 'backups', currentUser.uid);

        logger.styled(`[Firebase-Diag] TESTANDO CONEXÃO PARA UID: ${currentUser.uid}`, "color: #a855f7; font-weight: bold; background: #a855f710; padding: 4px; border-radius: 4px;");

        // Fallback: se o servidor demorar demais (>5s), liberamos o app (previne trava offline)
        const safetyBootTimeout = setTimeout(() => {
            if (!isParityValidatedRef.current) {
                logger.warn("[Firebase-Diag] TIMEOUT! Verifique sua internet ou permissões do Firebase.");
                isParityValidatedRef.current = true;
                setIsParityValidated(true);
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
                    isParityValidatedRef.current = true;
                    setIsParityValidated(true);
                }
                return;
            }

            const cloudStateString = stateStringForSync(cloudData);
            const currentStateString = stateStringForSync(appStateRef.current);
            const contentsAreDifferent = currentStateString !== cloudStateString;

            if (!contentsAreDifferent) {
                setHasConflict(false);
                lastSyncedRef.current = cloudStateString;
                isParityValidatedRef.current = true;
                setIsParityValidated(true);
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

                const localIsInitial = localUpdated <= 0 ||
                    appStateRef.current?.user?.name === "Estudante" ||
                    !appStateRef.current?.contests ||
                    Object.values(appStateRef.current.contests).every(c => !c.categories || c.categories.length === 0);

                const cloudHasContent = (cloudData.categories && cloudData.categories.length > 0) ||
                    (cloudData.contests && Object.values(cloudData.contests).some(c => c.categories && c.categories.length > 0));

                if (localIsInitial && cloudHasContent) {
                    logger.warn("[Sync] LOCAL VAZIO DETECTADO. Forçando pull da nuvem para resgate.");
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
            isParityValidatedRef.current = true;
            setIsParityValidated(true);

            if (shouldPullCloud) {
                logger.debug("[Sync] Dado recebido da nuvem → atualizando estado local");
                logger.debug(`[Sync] Sincronização MASTER aplicada. Motivo: ${isBootSync ? 'Boot' : 'Idle/Verdade Global'}`);
                setAppState(cloudData);
                lastSyncedRef.current = cloudStateString;
                setHasConflict(false);

                if (!wasAlreadyValidated && showToast) {
                    showToast('Sincronizado via Nuvem! ☁️✨', 'success');
                }
                logger.debug("[Sync] Divergência detectada (edição local ativa). Prioridade local mantida.");
                setHasConflict(true);
            }
        }, (err) => {
            logger.error("[Sync] Erro no listener:", err);
            setCloudConnected(false);
            // Se der erro (ex: offline), liberamos para evitar travar o usuário
            isParityValidatedRef.current = true;
            setIsParityValidated(true);
        });

        return () => {
            unsubscribe();
            setCloudConnected(false);
            clearTimeout(safetyBootTimeout);
        };
    }, [currentUser?.uid, setAppState, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        isParityValidatedRef.current = false;
        setIsParityValidated(false);
        lastSyncedRef.current = null;
        lastLocalMutationRef.current = 0;
        setHasConflict(false);
    }, [currentUser?.uid]);

    // 2. EMISSOR (Auto-save) - Master Mode
    useEffect(() => {
        // BLOQUEIO CRÍTICO: Não envia nada se ainda não validamos a paridade ou db está ausente
        if (!currentUser?.uid || !appState || !isParityValidated || !db) return;

        const currentStateString = stateStringForSync(appState);
        if (lastSyncedRef.current === currentStateString) return;

        // Mutação local detectada
        const lastMutation = Date.now();
        lastLocalMutationRef.current = lastMutation;
        setHasConflict(false);

        const syncToCloud = async () => {
            try {
                if (lastSyncedRef.current === currentStateString) return;
                if (lastLocalMutationRef.current !== lastMutation) {
                    logger.debug("[Sync] Abortando upload: mutação local mais recente detectada.");
                    return;
                }

                const safeguardContest = (contest) => {
                    if (!contest) return contest;
                    return {
                        ...contest,
                        studyLogs: (contest.studyLogs || []).slice(-SYNC_LOG_CAP),
                        studySessions: (contest.studySessions || []).slice(-SYNC_LOG_CAP),
                        simuladoRows: (contest.simuladoRows || []).slice(-300),
                    };
                };

                const safeContests = appState.contests
                    ? Object.fromEntries(Object.entries(appState.contests).map(([id, c]) => [id, safeguardContest(c)]))
                    : appState.contests;

                const rawStateToSave = {
                    ...appState,
                    contests: safeContests,
                    history: [],
                    _lastBackup: new Date().toISOString()
                };

                const stateToSave = JSON.parse(JSON.stringify(rawStateToSave));

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

        // Bug #1: Emergency Save on Unload / Visibility Change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                if (lastLocalMutationRef.current > 0 && lastSyncedRef.current !== currentStateString) {
                    logger.debug("[Sync] Visibility change (hidden) - triggering emergency sync.");
                    syncToCloud();
                }
            }
        };

        const handleBeforeUnload = () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (lastLocalMutationRef.current > 0 && lastSyncedRef.current !== currentStateString) {
                // Last effort (may fail in some browsers if async, but visibilitychange covers most cases)
                syncToCloud(); 
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(syncToCloud, 3000);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
        // B-14 FIX: Removed 'currentUser' and 'showToast' from deps to avoid constant refiring of debounce timer due to prop-drilling or React re-renders, causing auto-save to be delayed indefinitely.
        // Added currentUser?.uid to fix BUG-DEP-1 (prevent old UID on fast account switch).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appState, isParityValidated, currentUser?.uid]);

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
