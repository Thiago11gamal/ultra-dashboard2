import { useEffect, useRef, useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * Normaliza um objeto para comparação determinística (ordena chaves recursivamente)
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
    const latestCloudDataRef = useRef(null); // Guarda o último dado recebido da nuvem
    const [cloudConnected, setCloudConnected] = useState(false);
    const [isInternalSyncing, setIsInternalSyncing] = useState(false);
    const [hasConflict, setHasConflict] = useState(false); // Flag de divergência detectada

    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    }, [appState]);

    const stateStringForSync = (state) => {
        if (!state) return '';
        const { history: _h, _lastBackup: _lb, lastUpdated: _lu, ...rest } = state;
        const normalized = sortObject({ ...rest, history: [] });
        return JSON.stringify(normalized);
    };

    // 1. RECEPTOR (onSnapshot)
    useEffect(() => {
        if (!currentUser?.uid || !setAppState) return;

        const docRef = doc(db, 'backups', currentUser.uid);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            setCloudConnected(true);

            if (!docSnap.exists()) {
                hasInitialSyncRef.current = true;
                latestCloudDataRef.current = null;
                return;
            }

            const cloudData = docSnap.data();
            latestCloudDataRef.current = cloudData;
            const cloudStateString = stateStringForSync(cloudData);
            const contentsAreDifferent = lastSyncedRef.current !== cloudStateString;

            if (!contentsAreDifferent) {
                setHasConflict(false);
                hasInitialSyncRef.current = true;
                return;
            }

            // --- LÓGICA DE MESTRE (CLOUD-WINS) ---

            const localTime = new Date(appStateRef.current?.lastUpdated || 0).getTime();
            const cloudUpdated = cloudData.lastUpdated;
            const cloudTime = new Date(cloudUpdated || 0).getTime();

            const isFirstUpdate = !hasInitialSyncRef.current;
            const cloudSignificantNewer = cloudTime > localTime + 2000;
            const idleMutation = (Date.now() - lastLocalMutationRef.current) > 5000; // 5 segundos sem digitar/clicar
            const isInitial = appStateRef.current?.lastUpdated === "1970-01-01T00:00:00.000Z";

            // Se for diferente e estivermos em um destes casos, puxamos a Nuvem.
            const shouldSyncNow = isFirstUpdate || cloudSignificantNewer || isInitial || (contentsAreDifferent && idleMutation);

            if (shouldSyncNow) {
                console.warn(`[Sync] Mestre Nuvem Aplicado. Motivo: ${isFirstUpdate ? 'Inicial' : cloudSignificantNewer ? 'Nuvem Nova' : 'Idle/Paridade'}`);
                setAppState(cloudData);
                lastSyncedRef.current = cloudStateString;
                setHasConflict(false);

                if (hasInitialSyncRef.current && showToast) {
                    showToast('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
                // Existe divergência mas estamos esperando o "Idle" para não atrapalhar o usuário.
                console.log("[Sync] Divergência detectada, aguardando idle ou ação manual.");
                setHasConflict(true);
            }

            hasInitialSyncRef.current = true;
        }, (err) => {
            console.error("[Sync] Erro no listener cloud:", err);
            setCloudConnected(false);
            hasInitialSyncRef.current = true;
        });

        return () => {
            unsubscribe();
            setCloudConnected(false);
        };
    }, [currentUser?.uid, setAppState, showToast]);

    // Resetar flags quando o usuário muda
    useEffect(() => {
        hasInitialSyncRef.current = false;
        lastSyncedRef.current = null;
        lastLocalMutationRef.current = 0;
        setHasConflict(false);
    }, [currentUser?.uid]);

    // 2. EMISSOR (Auto-save)
    useEffect(() => {
        if (!currentUser?.uid || !appState || !hasInitialSyncRef.current) return;

        const currentStateString = stateStringForSync(appState);
        if (lastSyncedRef.current === currentStateString) return;

        // É uma mudança local real
        lastLocalMutationRef.current = Date.now();
        setHasConflict(false); // Zeramos o conflito pois assumimos que nossa vontade local é a nova verdade

        const syncToCloud = async () => {
            try {
                if (lastSyncedRef.current === currentStateString) return;

                const stateToSave = {
                    ...appState,
                    history: [],
                    _lastBackup: new Date().toISOString()
                };

                setIsInternalSyncing(true);
                console.log(`[Sync] Enviando para nuvem... TS: ${new Date(appState.lastUpdated).toLocaleTimeString()}`);
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

    // Função de Manual Pull (Forçar Nuvem -> Local)
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
