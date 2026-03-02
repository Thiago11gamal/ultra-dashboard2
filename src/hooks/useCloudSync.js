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

            // --- LOCKDOWN RULE: CLOUD WINS ON BOOT ---
            const isBootSync = !hasInitialSyncRef.current;

            // --- CONFLICT RESOLUTION ---
            const localWasJustEdited = (Date.now() - lastLocalMutationRef.current) < 8000;
            const shouldPullCloud = isBootSync || !localWasJustEdited;

            if (shouldPullCloud) {
                console.warn(`[Sync] Sincronização MASTER aplicada. Motivo: ${isBootSync ? 'Boot' : 'Idle/Verdade Global'}`);
                setAppState(cloudData);
                lastSyncedRef.current = cloudStateString;
                setHasConflict(false);

                if (hasInitialSyncRef.current && showToast) {
                    showToast('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
                console.log("[Sync] Divergência detectada (Editando localmente agora).");
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

                const stateToSave = {
                    ...appState,
                    history: [],
                    _lastBackup: new Date().toISOString()
                };

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
