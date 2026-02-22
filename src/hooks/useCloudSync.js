import { useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

// Hook que observa automaticamente o AppStore e envia os dados pro Firebase Firestore
export function useCloudSync(currentUser, appState, showToast) {
    useEffect(() => {
        if (!currentUser || !appState) return;

        const syncToCloud = async () => {
            try {
                // We keep history out of the cloud sync to save massive bandwidth
                const stateToSave = { ...appState, history: [] };
                await setDoc(doc(db, 'users_data', currentUser.uid), stateToSave);
            } catch (e) {
                console.error("Cloud Auto-save failed:", e);
                showToast("Erro na sincronização da Nuvem", "error");
            }
        };

        const timer = setTimeout(syncToCloud, 2000);
        return () => clearTimeout(timer);
    }, [appState, currentUser, showToast]);
}
