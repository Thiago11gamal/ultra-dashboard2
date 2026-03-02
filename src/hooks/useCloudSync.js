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
        if (!currentUser?.uid || !setAppState || hasInitialSyncRef.current) return;

        const checkCloudOnBoot = async () => {
            if (hasInitialSyncRef.current) return;
            hasInitialSyncRef.current = true;

            try {
                const cloudData = await downloadDataFromCloud(currentUser.uid);
                if (!cloudData) return;

                const cloudTime = new Date(cloudData._lastBackup || cloudData.lastUpdated || 0).getTime();
                const localTime = new Date(appState?.lastUpdated || 0).getTime();

                // Logical trigger: Cloud is NEWER. We removed 'isLocalEmpty' to prevent accidental reversions.
                if (cloudTime > localTime) {
                    setAppState(cloudData);
                    // Mark as synced to avoid echoing back an immediately older version
                    lastSyncedRef.current = JSON.stringify({ ...cloudData, history: [], _lastBackup: undefined });
                    if (showToast) showToast('Dados sincronizados com a nuvem! ☁️', 'success');
                } else {
                    lastSyncedRef.current = JSON.stringify({ ...appState, history: [], _lastBackup: undefined });
                }

            } catch (err) {
                console.error("Initial cloud fetch failed:", err);
            }
        };

        checkCloudOnBoot();
    }, [currentUser, setAppState, showToast, appState]);

    // Reset initial sync flag when user changes
    useEffect(() => {
        hasInitialSyncRef.current = false;
        lastSyncedRef.current = null;
    }, [currentUser?.uid]);

    // 2. Auto-save pipeline (Backup to Cloud)
    useEffect(() => {
        if (!currentUser?.uid || !appState || !hasInitialSyncRef.current) return;

        // Limpeza do histórico para economizar largura de banda
        // Adicionamos _lastBackup para controle de sincronização
        const stateToSave = {
            ...appState,
            history: [],
            _lastBackup: new Date().toISOString()
        };

        // Comparamos apenas os dados reais (ignorando o timestamp do backup) para evitar loops
        const stateToCompare = { ...stateToSave, _lastBackup: undefined };
        const stateString = JSON.stringify(stateToCompare);

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
