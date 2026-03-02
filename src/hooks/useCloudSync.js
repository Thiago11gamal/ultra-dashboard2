import { useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Hook que observa automaticamente o AppStore e envia os dados pro Firebase Firestore
export function useCloudSync(currentUser, appState, setAppState, showToast) {
    const lastSyncedRef = useRef(null);
    const hasInitialSyncRef = useRef(false);

    // Use a ref for appState to keep the listener stable while accessing current data
    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    }, [appState]);

    // Helper to normalize state for comparison (Ignores timestamps and undo history)
    const stateStringForSync = (state) => {
        if (!state) return '';
        const { history: _h, _lastBackup: _lb, ...rest } = state;
        return JSON.stringify({ ...rest, history: [] });
    };

    // 1. Real-time Cloud Receiver (Listen for changes from other devices)
    useEffect(() => {
        if (!currentUser?.uid || !setAppState) return;

        const docRef = doc(db, 'backups', currentUser.uid);

        // Subscribe to real-time updates
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (!docSnap.exists()) {
                hasInitialSyncRef.current = true;
                return;
            }

            const cloudData = docSnap.data();
            const cloudTime = new Date(cloudData._lastBackup || cloudData.lastUpdated || 0).getTime();
            const localTime = new Date(appStateRef.current?.lastUpdated || 0).getTime();

            // IGNORE if we just sent this exact change (Prevents feedback loops)
            const stateToCompare = stateStringForSync(cloudData);
            if (lastSyncedRef.current === stateToCompare) {
                hasInitialSyncRef.current = true;
                return;
            }

            // TRIGGER Update: Cloud is strictly newer
            if (cloudTime > localTime) {
                // console.log("Real-time Sync: Cloud is newer. Updating local store...");
                setAppState(cloudData);
                // Mark this version as "synced" locally
                lastSyncedRef.current = stateToCompare;

                // Show success toast only IF this wasn't the very FIRST sync of the session
                if (hasInitialSyncRef.current && showToast) {
                    showToast('Dados atualizados (nuvem)! ☁️✨', 'success');
                }
            }

            hasInitialSyncRef.current = true;
        }, (err) => {
            console.error("Cloud listener error:", err);
            hasInitialSyncRef.current = true;
        });

        return () => unsubscribe();
    }, [currentUser?.uid, setAppState, showToast]); // listener stays stable

    // Reset initial sync flag when user changes
    useEffect(() => {
        hasInitialSyncRef.current = false;
        lastSyncedRef.current = null;
    }, [currentUser?.uid]);

    // 2. Auto-save pipeline (Backup to Cloud)
    useEffect(() => {
        if (!currentUser?.uid || !appState || !hasInitialSyncRef.current) return;

        // Limpeza do histórico para economizar largura de banda
        const stateToSave = {
            ...appState,
            history: [],
            _lastBackup: new Date().toISOString()
        };

        const stateToCompare = stateStringForSync(stateToSave);

        if (lastSyncedRef.current === stateToCompare) return;

        const syncToCloud = async () => {
            try {
                // Double check if we already have this state marked as synced (concurrency check)
                if (lastSyncedRef.current === stateToCompare) return;

                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                lastSyncedRef.current = stateToCompare; // Registar sucesso
            } catch (e) {
                console.error("Cloud Auto-save failed:", e);
                if (showToast && e.code !== 'unavailable') {
                    showToast('Falha na sincronização em nuvem.', 'warning');
                }
            }
        };

        const timer = setTimeout(syncToCloud, 12000); // 12s debounce
        return () => clearTimeout(timer);
    }, [appState, currentUser, showToast]);
}
