import { useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { downloadDataFromCloud } from '../services/cloudSync';

// Hook que observa automaticamente o AppStore e envia os dados pro Firebase Firestore
export function useCloudSync(currentUser, appState, setAppState, showToast) {
    const lastSyncedRef = useRef(null);
    const hasInitialSyncRef = useRef(false);

    // 1. Initial Sync Control (Restore from Cloud if needed)
    useEffect(() => {
        if (!currentUser || !setAppState || hasInitialSyncRef.current) return;

        const checkCloudOnBoot = async () => {
            try {
                const cloudData = await downloadDataFromCloud(currentUser.uid);
                if (!cloudData) {
                    hasInitialSyncRef.current = true;
                    return;
                }

                const cloudTime = new Date(cloudData._lastBackup || 0).getTime();
                const localTime = new Date(appState?.lastUpdated || 0).getTime();

                // Logical trigger: Cloud is newer OR local data is practically empty/initial
                const isLocalEmpty = Object.keys(appState?.contests || {}).length <= 1 &&
                    appState?.contests?.default?.categories?.every(c => (c.simuladoStats?.history || []).length === 0);

                if (cloudTime > localTime || isLocalEmpty) {
                    setAppState(cloudData);
                    if (showToast) showToast('Dados sincronizados com a nuvem! ☁️', 'success');
                }

                hasInitialSyncRef.current = true;
            } catch (err) {
                console.error("Initial cloud fetch failed:", err);
                hasInitialSyncRef.current = true;
            }
        };

        checkCloudOnBoot();
    }, [currentUser?.uid, setAppState, showToast, appState]);

    // Reset initial sync flag when user changes
    useEffect(() => {
        hasInitialSyncRef.current = false;
    }, [currentUser?.uid]);

    // 2. Auto-save pipeline (Backup to Cloud)
    useEffect(() => {
        if (!currentUser || !appState || !hasInitialSyncRef.current) return;

        // Limpeza do histórico para economizar largura de banda
        const stateToSave = { ...appState, history: [] };
        const stateString = JSON.stringify(stateToSave);

        // Se os dados não mudaram desde a última sincronização, não fazemos nada
        if (lastSyncedRef.current === stateString) return;

        const syncToCloud = async () => {
            try {
                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                lastSyncedRef.current = stateString; // Registar sucesso
            } catch (e) {
                console.error("Cloud Auto-save failed:", e);
                if (showToast && e.code !== 'unavailable') {
                    showToast('Falha na sincronização em nuvem.', 'warning');
                }
            }
        };

        const timer = setTimeout(syncToCloud, 25000);
        return () => clearTimeout(timer);
    }, [appState, currentUser, showToast]);
}
