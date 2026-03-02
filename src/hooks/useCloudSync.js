import { useEffect, useRef, useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * useCloudSync
 * Gerencia a comunicação em tempo real com o Firestore.
 * Agora com logs agressivos para depuração remota e lógica de sincronização resiliente.
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
        if (!currentUser?.uid || !setAppState) {
            console.log("[Sync] Monitoramento não iniciado: Usuário deslogado ou store indisponível.");
            return;
        }

        console.log(`[Sync] Iniciando escuta para o usuário: ${currentUser.uid}`);
        const docRef = doc(db, 'backups', currentUser.uid);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            setCloudConnected(true);

            if (!docSnap.exists()) {
                console.log("[Sync] Nenhum dado encontrado na nuvem para este ID.");
                hasInitialSyncRef.current = true;
                return;
            }

            const cloudData = docSnap.data();
            const cloudUpdated = cloudData._lastBackup || cloudData.lastUpdated;
            const cloudTime = new Date(cloudUpdated || 0).getTime();
            const localTime = new Date(appStateRef.current?.lastUpdated || 0).getTime();

            // Evitar loops: Se o dado recebido é estruturalmente IDÊNTICO ao que já temos
            const stateToCompare = stateStringForSync(cloudData);
            if (lastSyncedRef.current === stateToCompare) {
                // console.log("[Sync] Dado da nuvem é idêntico ao carregado localmente. Ignorando.");
                hasInitialSyncRef.current = true;
                return;
            }

            // --- LÓGICA DE DECISÃO DE ATUALIZAÇÃO ---
            const isInitial = appStateRef.current?.lastUpdated === "1970-01-01T00:00:00.000Z";

            const cloudContests = Object.keys(cloudData.contests || {}).sort().join(',');
            const localContests = Object.keys(appStateRef.current?.contests || {}).sort().join(',');
            const structureMismatch = cloudContests !== localContests;

            console.log(`[Sync] Recebido via Nuvem. CloudSyncTS: ${new Date(cloudTime).toLocaleTimeString()} | LocalTS: ${new Date(localTime).toLocaleTimeString()}`);

            // Prioridade para Nuvem se for mais nova, se o local for virgem, ou se a lista de concursos divergir
            if (cloudTime > localTime + 1000 || isInitial || structureMismatch) {
                console.warn("[Sync] Aplicando dados da nuvem no Store local!");

                // Garantimos que o timestamp local passará a ser exatamente o da nuvem para evitar conflitos futuros
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
                console.warn("[Sync] Dado da nuvem REJEITADO (Local parece ser mais novo ou idêntico).");
            }

            hasInitialSyncRef.current = true;
        }, (err) => {
            console.error("[Sync] Erro crítico no listener cloud:", err);
            setCloudConnected(false);
            hasInitialSyncRef.current = true;
        });

        return () => {
            unsubscribe();
            setCloudConnected(false);
        };
    }, [currentUser?.uid, setAppState, showToast]);

    // Resetar flags quando o usuário muda (logout/login)
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
                // Re-verificação para evitar corridas durante o debounce
                if (lastSyncedRef.current === stateToCompare) return;

                const now = new Date().toISOString();
                const stateToSave = {
                    ...appState,
                    history: [],
                    lastUpdated: now,
                    _lastBackup: now
                };

                console.log(`[Sync] Enviando atualização para nuvem... (${new Date(now).toLocaleTimeString()})`);
                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);

                // Registramos o que enviamos como o último estado sincronizado
                lastSyncedRef.current = stateToCompare;
            } catch (e) {
                console.error("[Sync] Falha no auto-save nuvem:", e);
                // Notificar usuário apenas se não for erro de conexão temporário
                if (showToast && e.code !== 'unavailable') {
                    showToast('Aviso: Falha ao salvar na nuvem.', 'warning');
                }
            }
        };

        // Debounce de 8 segundos para não sobrecarregar em escritas rápidas
        const timer = setTimeout(syncToCloud, 8000);
        return () => clearTimeout(timer);
    }, [appState, currentUser, showToast]);

    return { cloudConnected };
}
