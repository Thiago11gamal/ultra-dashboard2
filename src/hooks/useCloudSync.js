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

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            setCloudConnected(true);

            const cloudData = docSnap.exists() ? docSnap.data() : null;
            latestCloudDataRef.current = cloudData;

            if (!cloudData) {
                // Caso em que a nuvem está vazia, marcamos como "sincronizado" para permitir uploads
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

            // --- CONFLIT RESOLUTION ---
            const localWasJustEdited = (Date.now() - lastLocalMutationRef.current) < 8000;
            const shouldPullCloud = isBootSync || !localWasJustEdited;

            if (shouldPullCloud) {
                console.warn(`[Sync] Aplicando NUVEM (Master). Motivo: ${isBootSync ? 'Boot/Paridade' : 'Divergência Idle'}`);
                setAppState(cloudData);
                lastSyncedRef.current = cloudStateString;
                setHasConflict(false);

                if (hasInitialSyncRef.current && showToast) {
                    showToast('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
                console.log("[Sync] Bloqueando Cloud temporariamente (Edição local ativa).");
                setHasConflict(true);
            }

            hasInitialSyncRef.current = true;
        }, (err) => {
            console.error("[Sync] Erro no listener cloud:", err);
            setCloudConnected(false);
        });

        return () => {
            unsubscribe();
            setCloudConnected(false);
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
        // LOCKDOWN: Não envia NADA para a nuvem se ainda não ouvimos a nuvem pelo menos uma vez
        // Isso evita "envenenamento" do cloud com dados locais obsoletos no startup
        if (!currentUser?.uid || !appState || !hasInitialSyncRef.current) return;

        const currentStateString = stateStringForSync(appState);

        // Se o que temos agora é o que acabamos de receber ou enviar, cancelamos
        if (lastSyncedRef.current === currentStateString) return;

        // Se chegamos aqui, é uma mutação local legítima (o usuário mexeu)
        // Registramos o timestamp da última mutação para bloquear o receptor
        const lastMutation = Date.now();
        lastLocalMutationRef.current = lastMutation;
        setHasConflict(false);

        const syncToCloud = async () => {
            try {
                // Verificação dupla antes de mandar (debounce)
                if (lastSyncedRef.current === currentStateString) return;

                // Se o usuário continuou mexendo, este timer é cancelado/ignorado
                if (lastLocalMutationRef.current !== lastMutation) return;

                const stateToSave = {
                    ...appState,
                    history: [],
                    _lastBackup: new Date().toISOString()
                };

                setIsInternalSyncing(true);
                console.log(`[Sync] Enviando para nuvem... (Conteúdo Novo)`);
                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                lastSyncedRef.current = currentStateString;
            } catch (e) {
                console.error("[Sync] Erro no auto-save:", e);
                if (showToast && e.code !== 'unavailable') {
                    showToast('Falha ao salvar na nuvem.', 'warning');
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
