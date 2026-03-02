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
    const [cloudConnected, setCloudConnected] = useState(false);
    const [isInternalSyncing, setIsInternalSyncing] = useState(false);

    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    }, [appState]);

    const stateStringForSync = (state) => {
        if (!state) return '';
        const { history: _h, _lastBackup: _lb, lastUpdated: _lu, ...rest } = state;
        // Normalizamos e limpamos para comparar apenas dados puros
        const normalized = sortObject({ ...rest, history: [] });
        return JSON.stringify(normalized);
    };

    // 1. RECEPTOR
    useEffect(() => {
        if (!currentUser?.uid || !setAppState) return;

        const docRef = doc(db, 'backups', currentUser.uid);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            setCloudConnected(true);

            if (!docSnap.exists()) {
                hasInitialSyncRef.current = true;
                return;
            }

            const cloudData = docSnap.data();
            const cloudUpdated = cloudData.lastUpdated;
            const cloudTime = new Date(cloudUpdated || 0).getTime();
            const localTime = new Date(appStateRef.current?.lastUpdated || 0).getTime();

            const cloudStateString = stateStringForSync(cloudData);
            const contentsAreDifferent = lastSyncedRef.current !== cloudStateString;

            if (!contentsAreDifferent) {
                hasInitialSyncRef.current = true;
                return;
            }

            // DECISÃO DE ATUALIZAÇÃO AGRESSIVA
            const isFirstUpdate = !hasInitialSyncRef.current;
            const cloudMoreRecent = cloudTime > localTime + 1000;

            // Se o conteúdo é diferente e não editamos nada nos últimos 15 segundos,
            // confiamos na nuvem como a "Fonte da Verdade" (resolve drift e delay).
            const idleLocalMutation = (Date.now() - lastLocalMutationRef.current) > 15000;
            const isInitial = appStateRef.current?.lastUpdated === "1970-01-01T00:00:00.000Z";

            const shouldSync = isFirstUpdate || cloudMoreRecent || isInitial || (contentsAreDifferent && idleLocalMutation);

            if (shouldSync) {
                console.warn(`[Sync] Aplicando Cloud. Motivo: ${isFirstUpdate ? 'Inicial' : cloudMoreRecent ? 'Mais novo' : 'Idle/Verdade Global'}`);
                setAppState(cloudData);
                lastSyncedRef.current = cloudStateString;

                if (hasInitialSyncRef.current && showToast) {
                    showToast('Atualizado via Nuvem! ☁️', 'success');
                }
            } else {
                console.log("[Sync] Ignorando Cloud (Edição local em curso).");
            }

            hasInitialSyncRef.current = true;
        }, (err) => {
            console.error("[Sync] Erro no onSnapshot:", err);
            setCloudConnected(false);
            hasInitialSyncRef.current = true;
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
    }, [currentUser?.uid]);

    // 2. EMISSOR
    useEffect(() => {
        if (!currentUser?.uid || !appState || !hasInitialSyncRef.current) return;

        const currentStateString = stateStringForSync(appState);
        if (lastSyncedRef.current === currentStateString) return;

        // É uma mudança local real
        lastLocalMutationRef.current = Date.now();

        const syncToCloud = async () => {
            try {
                if (lastSyncedRef.current === currentStateString) return;

                const stateToSave = {
                    ...appState,
                    history: [],
                    _lastBackup: new Date().toISOString()
                };

                setIsInternalSyncing(true);
                console.log(`[Sync] Salvando na Nuvem... Mutação: ${new Date(appState.lastUpdated).toLocaleTimeString()}`);
                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                lastSyncedRef.current = currentStateString;
            } catch (e) {
                console.error("[Sync] Erro no Autosave:", e);
            } finally {
                setIsInternalSyncing(false);
            }
        };

        const timer = setTimeout(syncToCloud, 3000);
        return () => clearTimeout(timer);
    }, [appState, currentUser]);

    return { cloudConnected, isSyncing: isInternalSyncing };
}
