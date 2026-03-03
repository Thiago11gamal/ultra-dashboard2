import { useEffect, useRef, useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * Normaliza um objeto para comparação determinística
 */
const sortObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObject);
    return Object.keys(obj).sort().reduce((acc, key) => {
        acc[key] = sortObject(obj[key]);
        return acc;
    }, {});
};

export function useCloudSync(currentUser, appState, setAppState, showToast) {
    const lastSyncedRef = useRef(null);
    const hasInitialSyncRef = useRef(false);
    const lastLocalMutationRef = useRef(0);
    const latestCloudDataRef = useRef(null);
    const [cloudConnected, setCloudConnected] = useState(false);
    const [isInternalSyncing, setIsInternalSyncing] = useState(false);
    const [hasConflict, setHasConflict] = useState(false);

    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    }, [appState]);

    // Compara apenas o conteúdo real, ignorando timestamps e histórico
    const stateStringForSync = (state) => {
        if (!state) return '';
        const { history: _h, _lastBackup: _lb, lastUpdated: _lu, ...rest } = state;
        const normalized = sortObject({ ...rest, history: [] });
        return JSON.stringify(normalized);
    };

    // 1. RECEPTOR (onSnapshot) - Slave Mode
    useEffect(() => {
        if (!currentUser?.uid || !setAppState) return;

        const docRef = doc(db, 'backups', currentUser.uid);

        // Fallback: se o servidor demorar demais (>5s), liberamos o app (previne trava offline)
        const safetyBootTimeout = setTimeout(() => {
            if (!hasInitialSyncRef.current) {
                console.warn("[Sync] Timeout de paridade atingido (V8). Liberando upload por inatividade do servidor.");
                hasInitialSyncRef.current = true;
            }
        }, 5000);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            setCloudConnected(true);
            const isFromCache = docSnap.metadata.fromCache;
            const exists = docSnap.exists();

            // BLOQUEIO SEGURO: Se veio do cache e está vazio, IGNORE.
            // Isso evita o "envenenamento" onde o dado local antigo sobe pra nuvem antes da nuvem responder o real.
            if (isFromCache && !exists && !hasInitialSyncRef.current) {
                console.log("[Sync] Aguaradando resposta real do servidor...");
                return;
            }

            clearTimeout(safetyBootTimeout);
            const cloudData = exists ? docSnap.data() : null;
            latestCloudDataRef.current = cloudData;

            if (!cloudData) {
                // Nuvem realmente vazia (confirmado pelo servidor ou cache confirmado)
                if (!hasInitialSyncRef.current) {
                    lastSyncedRef.current = stateStringForSync(appStateRef.current);
                    hasInitialSyncRef.current = true;
                }
                return;
            }

            const cloudStateString = stateStringForSync(cloudData);
            const currentStateString = stateStringForSync(appStateRef.current);
            const contentsAreDifferent = currentStateString !== cloudStateString;

            if (!contentsAreDifferent) {
                setHasConflict(false);
                lastSyncedRef.current = cloudStateString;
                hasInitialSyncRef.current = true;
                return;
            }

            // --- LOCKDOWN RULE: CLOUD WINS ON BOOT (WITH TIMESTAMP CHECK) ---
            const isBootSync = !hasInitialSyncRef.current;

            // --- CONFLICT RESOLUTION ---
            const localWasJustEdited = (Date.now() - lastLocalMutationRef.current) < 8000;

            let shouldPullCloud = false;

            if (isBootSync) {
                const cloudUpdated = new Date(cloudData.lastUpdated || 0).getTime();
                const localUpdated = new Date(appStateRef.current?.lastUpdated || 0).getTime();

                // On boot, cloud wins unless local is strictly newer (e.g. user worked offline and just refreshed/reopened).
                // Add 5-second tolerance for slight clock drifts.
                if (cloudUpdated >= localUpdated - 5000) {
                    shouldPullCloud = true;
                } else {
                    console.warn(`[Sync] RECUSANDO NUVEM NO BOOT! Local é mais recente (Trabalho Offline salvo). Local: ${new Date(localUpdated).toISOString()} | Cloud: ${new Date(cloudUpdated).toISOString()}`);
                    shouldPullCloud = false;
                }
            } else {
                // If the app is already running, we accept cloud updates unless the user is actively typing/clicking.
                shouldPullCloud = !localWasJustEdited;
            }

            if (shouldPullCloud) {
                console.log("DADO RECEBIDO DA NUVEM -> ATUALIZANDO ESTADO LOCAL");
                console.warn(`[Sync] Sincronização MASTER aplicada. Motivo: ${isBootSync ? 'Boot' : 'Idle/Verdade Global'}`);
                setAppState(cloudData);
                lastSyncedRef.current = cloudStateString;
                setHasConflict(false);

                if (hasInitialSyncRef.current && showToast) {
                    showToast('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
                console.log("[Sync] Divergência detectada (Editando localmente / Local Mais Recente). Prioridade Local mantida.");
                setHasConflict(true);
            }

            hasInitialSyncRef.current = true;
        }, (err) => {
            console.error("[Sync] Erro no listener:", err);
            setCloudConnected(false);
            // Se der erro (ex: offline), liberamos para evitar travar o usuário
            hasInitialSyncRef.current = true;
        });

        return () => {
            unsubscribe();
            setCloudConnected(false);
            clearTimeout(safetyBootTimeout);
        };
    }, [currentUser?.uid, setAppState, showToast]);

    useEffect(() => {
        hasInitialSyncRef.current = false;
        lastSyncedRef.current = null;
        lastLocalMutationRef.current = 0;
        setHasConflict(false);
    }, [currentUser?.uid]);

    // 2. EMISSOR (Auto-save) - Master Mode
    useEffect(() => {
        // BLOQUEIO CRÍTICO: Não envia nada se ainda não validamos a paridade
        if (!currentUser?.uid || !appState || !hasInitialSyncRef.current) return;

        const currentStateString = stateStringForSync(appState);
        if (lastSyncedRef.current === currentStateString) return;

        // Mutação local detectada
        const lastMutation = Date.now();
        lastLocalMutationRef.current = lastMutation;
        setHasConflict(false);

        const syncToCloud = async () => {
            try {
                if (lastSyncedRef.current === currentStateString) return;
                if (lastLocalMutationRef.current !== lastMutation) return;

                const safeguardContest = (contest) => {
                    if (!contest) return contest;
                    // BUG 5 FIX: align cloud cap with LOG_CAP (1000) to prevent silent data loss.
                    // Previously capped at 200, causing 800 logs to be lost on cloud pull.
                    return {
                        ...contest,
                        studyLogs: (contest.studyLogs || []).slice(-1000),
                        studySessions: (contest.studySessions || []).slice(-1000),
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
                console.log(`[Sync] Enviando atualização MASTER para nuvem...`);
                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                lastSyncedRef.current = currentStateString;
            } catch (e) {
                console.error("[Sync] Erro no auto-save:", e);
                if (showToast && e.code !== 'unavailable') {
                    showToast('Falha crítica ao salvar.', 'warning');
                }
            } finally {
                setIsInternalSyncing(false);
            }
        };

        const timer = setTimeout(syncToCloud, 3000);
        return () => clearTimeout(timer);
    }, [appState, currentUser, showToast]);

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
