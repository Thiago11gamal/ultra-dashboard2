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
        // We exclude history and BOTH sync timestamps for comparison
        const { history: _h, _lastBackup: _lb, lastUpdated: _lu, ...rest } = state;
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
            const cloudUpdated = cloudData._lastBackup || cloudData.lastUpdated;
            const cloudTime = new Date(cloudUpdated || 0).getTime();
            const localTime = new Date(appStateRef.current?.lastUpdated || 0).getTime();

            // IGNORE if we just sent this exact change (Prevents feedback loops)
            const stateToCompare = stateStringForSync(cloudData);
            if (lastSyncedRef.current === stateToCompare) {
                hasInitialSyncRef.current = true;
                return;
            }

            // TRIGGER Update: Cloud is strictly newer
            // We give a 2-second buffer to handle minor clock drifts or network latency 
            // and prevent "echo" loops where two devices update at almost same time
            if (cloudTime > localTime + 2000) {
                // console.log("Real-time Sync: Cloud is newer. Updating local store...");

                // IMPORTANT: Ensure the cloudData we pass to setAppState HAS a lastUpdated 
                // that matches its cloudTime, so useAppStore doesn't generate a "now" timestamp
                const normalizedCloudData = {
                    ...cloudData,
                    lastUpdated: cloudUpdated // Use the freshest timestamp available
                };

                setAppState(normalizedCloudData);
                lastSyncedRef.current = stateToCompare;

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
    }, [currentUser?.uid, setAppState, showToast]);

    // Reset initial sync flag when user changes
    useEffect(() => {
        hasInitialSyncRef.current = false;
        lastSyncedRef.current = null;
    }, [currentUser?.uid]);

    // 2. Auto-save pipeline (Backup to Cloud)
    useEffect(() => {
        if (!currentUser?.uid || !appState || !hasInitialSyncRef.current) return;

        // Compare using normalized string
        const stateToCompare = stateStringForSync(appState);
        if (lastSyncedRef.current === stateToCompare) return;

        const syncToCloud = async () => {
            try {
                // Final safety check: if we already synced this state via listener during the debounce, stop.
                if (lastSyncedRef.current === stateToCompare) return;

                // Create full payload
                const now = new Date().toISOString();
                const stateToSave = {
                    ...appState,
                    history: [],
                    lastUpdated: now, // Sync both timestamps to be sure
                    _lastBackup: now
                };

                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                lastSyncedRef.current = stateToCompare; // Registar sucesso
            } catch (e) {
                console.error("Cloud Auto-save failed:", e);
                if (showToast && e.code !== 'unavailable') {
                    showToast('Falha na sincronização em nuvem.', 'warning');
                }
            }
        };

        const timer = setTimeout(syncToCloud, 15000); // 15s debounce for extra safety
        return () => clearTimeout(timer);
    }, [appState, currentUser, showToast]);
}
