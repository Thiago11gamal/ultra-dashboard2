import { useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

// Hook que observa automaticamente o AppStore e envia os dados pro Firebase Firestore
export function useCloudSync(currentUser, appState, showToast) {
    const lastSyncedRef = useRef(null);

    useEffect(() => {
        if (!currentUser || !appState) return;

        // Limpeza do histórico para economizar largura de banda
        const stateToSave = { ...appState, history: [] };
        const stateString = JSON.stringify(stateToSave);

        // Se os dados não mudaram desde a última sincronização, não fazemos nada
        if (lastSyncedRef.current === stateString) return;

        const syncToCloud = async () => {
            try {
                await setDoc(doc(db, 'users_data', currentUser.uid), stateToSave);
                lastSyncedRef.current = stateString; // Registar sucesso
                // console.log("Cloud Auto-save complete");
            } catch (e) {
                console.error("Cloud Auto-save failed:", e);
                // Não mostramos toast em erros de rede temporários para não irritar o utilizador
            }
        };

        // Aumentamos o debounce para 25 segundos para evitar excesso de escrita
        const timer = setTimeout(syncToCloud, 25000);
        return () => clearTimeout(timer);
    }, [appState, currentUser]);
}
