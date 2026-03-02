import { useEffect, useRef, useState } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * useCloudSync
 * Gerencia a comunicação em tempo real com o Firestore.
 * Versão Robusta: Prioriza a nuvem na inicialização e resolve o conflito de "falso novo" via localStorage.
 */
export function useCloudSync(currentUser, appState, setAppState, showToast) {
    const lastSyncedRef = useRef(null);
    const hasInitialSyncRef = useRef(false);
    const lastLocalMutationRef = useRef(0); // Rastreia se o usuário real mudou algo localmente
    const [cloudConnected, setCloudConnected] = useState(false);

    // Mantém o appState atualizado em um Ref para acesso estável dentro do listener
    const appStateRef = useRef(appState);
    useEffect(() => {
        appStateRef.current = appState;
    }, [appState]);

    // Função auxiliar para comparar estados ignorando metadados de sincronização e o histórico pesado
    const stateStringForSync = (state) => {
        if (!state) return '';
        // Remove campos secundários que mudam sem afetar o conteúdo real
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
            const cloudUpdated = cloudData.lastUpdated; // Prioriza o timestamp original da mutação
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

            // --- DECISÃO DE ATUALIZAÇÃO REFORÇADA ---

            // 1. Forçamos SE é a primeira vez que ouvimos a nuvem (Resolve: LocalStorage estagnado/antigo)
            const isFirstSync = !hasInitialSyncRef.current;

            // 2. Forçamos SE não houve nenhuma ação do usuário nesta sessão (Local "novo" é apenas lixo de hydration)
            const noLocalActionYet = lastLocalMutationRef.current === 0;

            // 3. Forçamos SE a nuvem é realmente mais nova
            const cloudIsNewer = cloudTime > localTime + 1000;

            // 4. Casos Especiais: Timestamp 1970 ou estrutura básica
            const isInitial = appStateRef.current?.lastUpdated === "1970-01-01T00:00:00.000Z";

            const shouldApplyCloud = cloudIsNewer || isInitial || isFirstSync || noLocalActionYet;

            if (shouldApplyCloud) {
                console.warn(`[Sync] Aplicando Nuvem: ${new Date(cloudTime).toLocaleTimeString()} | Motivo: ${isFirstSync ? 'Inicial' : noLocalActionYet ? 'Sem mutação local' : 'Nuvem mais nova'}`);

                setAppState(cloudData);
                lastSyncedRef.current = stateToCompare;

                if (hasInitialSyncRef.current && showToast) {
                    showToast('Sincronizado via Nuvem! ☁️✨', 'success');
                }
            } else {
                console.warn(`[Sync] Conflito Detectado: Cloud (${new Date(cloudTime).toLocaleTimeString()}) < Local (${new Date(localTime).toLocaleTimeString()}). Mantendo local pois houve edição recente.`);
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
        lastLocalMutationRef.current = 0;
    }, [currentUser?.uid]);

    // 2. EMISSOR AUTOMÁTICO (Auto-save)
    useEffect(() => {
        if (!currentUser?.uid || !appState || !hasInitialSyncRef.current) return;

        const stateToCompare = stateStringForSync(appState);
        if (lastSyncedRef.current === stateToCompare) return;

        // Se o conteúdo mudou e não foi via receptor, é uma mutação local
        lastLocalMutationRef.current = Date.now();

        const syncToCloud = async () => {
            try {
                if (lastSyncedRef.current === stateToCompare) return;

                // CRITICAL: NÃO sobrescrevemos lastUpdated com "now" aqui. 
                // Usamos o timestamp que a Store gerou no momento do clique/edição.
                const stateToSave = {
                    ...appState,
                    history: [],
                    _lastBackup: new Date().toISOString()
                };

                console.log(`[Sync] Enviando para nuvem... TS: ${new Date(appState.lastUpdated).toLocaleTimeString()}`);
                await setDoc(doc(db, 'backups', currentUser.uid), stateToSave);
                lastSyncedRef.current = stateToCompare;
            } catch (e) {
                console.error("[Sync] Erro no auto-save:", e);
                if (showToast && e.code !== 'unavailable') {
                    showToast('Falha ao salvar na nuvem.', 'warning');
                }
            }
        };

        const timer = setTimeout(syncToCloud, 3000); // 3 segundos para parecer mais "em tempo real"
        return () => clearTimeout(timer);
    }, [appState, currentUser, showToast]);

    return { cloudConnected };
}
