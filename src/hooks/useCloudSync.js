import { useEffect, useRef, useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Hook que observa automaticamente o AppStore e envia os dados pro Firebase Firestore
export function useCloudSync(currentUser, appState, setAppState, showToast) {
    const lastSyncedRef = useRef(null);
    const hasInitialSyncRef = useRef(false);
    const [cloundConnected, setCloudConnected] = useState(false);

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
            setCloudConnected(true);
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

            // LOGGING for debugging
            console.log(`[Sync] Cloud: ${new Date(cloudTime).toLocaleTimeString()} | Local: ${new Date(localTime).toLocaleTimeString()}`);

            // TRIGGER Update conditions:
            // 1. Cloud is significantly newer
            // 2. Local is initial state (1970)
            // 3. Structural mismatch (diff number of contests)
            const isInitial = appStateRef.current?.lastUpdated === "1970-01-01T00:00:00.000Z";
            const cloudContestCount = Object.keys(cloudData.contests || {}).length;
            const localContestCount = Object.keys(appStateRef.current?.contests || {}).length;
            const structureMismatch = cloudContestCount !== localContestCount;

            if (cloudTime > localTime + 1000 || isInitial || structureMismatch) {
                console.log("[Sync] Update triggered! Syncing cloud data...");

                const normalizedCloudData = {
                    ...cloudData,
                    lastUpdated: cloudUpdated
                };

                setAppState(normalizedCloudData);
                lastSyncedRef.current = stateToCompare;

                if (hasInitialSyncRef.current && showToast) {
                    showToast('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else if (cloudTime < localTime - 5000) {
                console.log("[Sync] Rejected: Local is significantly NEWER than cloud.");
            }

            hasInitialSyncRef.current = true;
        }, (err) => {
            console.error("[Sync] Cloud listener error:", err);
            setCloudConnected(false);
            hasInitialSyncRef.current = true;
        });

        return () => {
            unsubscribe();
            setCloudConnected(false);
        };
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
                if (lastSyncedRef.current === stateToCompare) return;

                const now = new Date().toISOString();
                const stateToSave = {
                    ...appState,
                    history: [],
                    lastUpdated: now,
                    _lastBackup: now
                };

                console.log(`[Sync] Auto-saving to Cloud... (${new Date(now).toLocaleTimeString()})`);
                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                lastSyncedRef.current = stateToCompare;
            } catch (e) {
                console.error("[Sync] Auto-save failed:", e);
            }
        };

        const timer = setTimeout(syncToCloud, 10000);
        return () => clearTimeout(timer);
    }, [appState, currentUser, showToast]);

    return { cloundConnected };
}
