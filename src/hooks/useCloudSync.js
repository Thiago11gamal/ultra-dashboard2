import { useEffect, useRef, useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * useCloudSync
 * Gerencia a comunicação em tempo real com o Firestore.
 * Versão Final: Resolve o conflito de "empate de timestamp" onde conteúdos diferem mas horários são iguais.
 */
export function useCloudSync(currentUser, appState, setAppState, showToast) {
    const lastSyncedRef = useRef(null);
    const hasInitialSyncRef = useRef(false);
    const [cloudConnected, setCloudConnected] = useState(false);

    // Mantém o appState atualizado em um Ref para acesso estável dentro do listener
    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    }, [appState]);

    // Função auxiliar para comparar estados ignorando metadados de sincronização e o histórico pesado
    const stateStringForSync = (state) => {
        if (!state) return '';
        const { history: _h, _lastBackup: _lb, lastUpdated: _lu, ...rest } = state;
        return JSON.stringify({ ...rest, history: [] });
    };

    // 1. RECEPTOR EM TEMPO REAL (onSnapshot)
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
            const cloudUpdated = cloudData._lastBackup || cloudData.lastUpdated;
            const cloudTime = new Date(cloudUpdated || 0).getTime();
            const localTime = new Date(appStateRef.current?.lastUpdated || 0).getTime();

            // Lógica de Comparação de Conteúdo
            const stateToCompare = stateStringForSync(cloudData);
            const contentsAreDifferent = lastSyncedRef.current !== stateToCompare;

            if (!contentsAreDifferent) {
                // Conteúdo idêntico ao que já temos ou que acabamos de enviar. Ignoramos para evitar loops.
                hasInitialSyncRef.current = true;
                return;
            }

            // LOGGING para depuração
            console.log(`[Sync] Recebido via Nuvem. Cloud: ${new Date(cloudTime).toLocaleTimeString()} | Local: ${new Date(localTime).toLocaleTimeString()}`);

            // --- DECISÃO DE ATUALIZAÇÃO REFORÇADA ---
            const isInitial = appStateRef.current?.lastUpdated === "1970-01-01T00:00:00.000Z";

            // Forçamos a sincronização se:
            // 1. Nuvem é estritamente mais nova.
            // 2. É o estado inicial (primeiro acesso).
            // 3. O conteúdo é diferente e os timestamps empatam (correção para o bug relatado).
            const forceSync = contentsAreDifferent && Math.abs(cloudTime - localTime) < 2000;

            if (cloudTime > localTime + 1000 || isInitial || forceSync) {
                console.warn("[Sync] Aplicando dados da nuvem (conteúdo diverge ou nuvem mais nova).");

                const normalizedCloudData = {
                    ...cloudData,
                    lastUpdated: cloudUpdated
                };

                setAppState(normalizedCloudData);
                lastSyncedRef.current = stateToCompare;

                if (hasInitialSyncRef.current && showToast) {
                    showToast('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
                console.warn("[Sync] Dado da nuvem REJEITADO (Local parece ser mais novo).");
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
    }, [currentUser?.uid]);

    // 2. EMISSOR AUTOMÁTICO (Auto-save)
    useEffect(() => {
        if (!currentUser?.uid || !appState || !hasInitialSyncRef.current) return;

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

                console.log(`[Sync] Enviando para nuvem... (${new Date(now).toLocaleTimeString()})`);
                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                lastSyncedRef.current = stateToCompare;
            } catch (e) {
                console.error("[Sync] Erro no auto-save:", e);
                // Notificar erro se não for perda de rede
                if (showToast && e.code !== 'unavailable') {
                    showToast('Falha ao salvar na nuvem.', 'warning');
                }
            }
        };

        const timer = setTimeout(syncToCloud, 8000);
        return () => clearTimeout(timer);
    }, [appState, currentUser, showToast]);

    return { cloudConnected };
}
