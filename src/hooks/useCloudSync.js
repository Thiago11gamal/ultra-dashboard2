import { useEffect, useRef, useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { SYNC_LOG_CAP } from '../config';



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

        // Fallback: se o servidor demorar demais (>5s), liberamos o app (previne trava offline)
        const safetyBootTimeout = setTimeout(() => {
            if (!isParityValidatedRef.current) {
                console.warn("[Sync] Timeout de paridade atingido (V8). Liberando upload por inatividade do servidor.");
                isParityValidatedRef.current = true;
                setIsParityValidated(true);
            }
        }, 5000);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            console.debug("[Sync] Mensagem recebida do Firestore para UID:", currentUser.uid);
            setCloudConnected(true);
            const isFromCache = docSnap.metadata.fromCache;
            const exists = docSnap.exists();

            // BLOQUEIO SEGURO: Se veio do cache e está vazio, IGNORE.
            // Isso evita o "envenenamento" onde o dado local antigo sobe pra nuvem antes da nuvem responder o real.
            if (isFromCache && !exists && !isParityValidatedRef.current) {
                console.debug("[Sync] Aguardando resposta real do servidor...");
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

                // Regra Mestre de Resgate: Se local for 1970 (zerado) e a nuvem tem QUALQUER coisa, a nuvem vence.
                const localIsInitial = localUpdated <= 0 || appStateRef.current?.user?.name === "Estudante";
                const cloudHasContent = (cloudData.categories && cloudData.categories.length > 0) || 
                                        (cloudData.contests && Object.keys(cloudData.contests).length > 0);

                if (localIsInitial && cloudHasContent) {
                    console.warn("[Sync] LOCAL VAZIO DETECTADO. Forçando pull da nuvem para resgate.");
                    shouldPullCloud = true;
                } else if (cloudUpdated >= localUpdated - 5000) {
                    shouldPullCloud = true;
                } else {
                    console.warn(`[Sync] RECUSANDO NUVEM! Local é mais recente. Local: ${new Date(localUpdated).toISOString()} | Cloud: ${new Date(cloudUpdated).toISOString()}`);
                    shouldPullCloud = false;
                }
            } else {
                shouldPullCloud = !localWasJustEdited;
            }

            if (shouldPullCloud) {
                console.debug("[Sync] Dado recebido da nuvem → atualizando estado local");
                console.debug(`[Sync] Sincronização MASTER aplicada. Motivo: ${isBootSync ? 'Boot' : 'Idle/Verdade Global'}`);
                setAppState(cloudData);
                lastSyncedRef.current = cloudStateString;
                setHasConflict(false);

                if (isParityValidatedRef.current && showToast) {
                    showToast('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
                console.debug("[Sync] Divergência detectada (edição local ativa). Prioridade local mantida.");
                setHasConflict(true);
            }

            isParityValidatedRef.current = true;
            setIsParityValidated(true);
        }, (err) => {
            console.error("[Sync] Erro no listener:", err);
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
        if (!currentUser?.uid || !appState || !isParityValidatedRef.current || !db) return;

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
                    console.debug("[Sync] Abortando upload: mutação local mais recente detectada.");
                    return;
                }

                const safeguardContest = (contest) => {
                    if (!contest) return contest;
                    // BUG 5 FIX: align cloud cap with LOG_CAP (1000) to prevent silent data loss.
                    // Previously capped at 200, causing 800 logs to be lost on cloud pull.
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

                // Firebase Firestore REJEITA keys com valores 'undefined'. O parse/stringify varre e remove tds silenciosamente.
                const stateToSave = JSON.parse(JSON.stringify(rawStateToSave));

                setIsInternalSyncing(true);
                console.debug(`[Sync] Enviando atualização MASTER para nuvem...`);
                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                lastSyncedRef.current = currentStateString;
            } catch (e) {
                console.error("[Sync] Erro no auto-save:", e);
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
