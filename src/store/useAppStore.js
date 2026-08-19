import { safeClone } from './safeClone.js';
import { create, useStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { INITIAL_DATA } from '../data/initialData.js';
import { validateAppState } from './schemas.js';
import { createPomodoroSlice } from './slices/createPomodoroSlice.js';
import { createTaskSlice } from './slices/createTaskSlice.js';
import { createCategorySlice } from './slices/createCategorySlice.js';
import { createStudySlice } from './slices/createStudySlice.js';
import { createContestSlice } from './slices/createContestSlice.js';
import { createGamificationSlice } from './slices/createGamificationSlice.js';
import { createSimuladoSlice } from './slices/createSimuladoSlice.js';
import { createTrashSlice } from './slices/createTrashSlice.js';
import { createSettingsSlice } from './slices/createSettingsSlice.js';
import { createMonteCarloSlice } from './slices/createMonteCarloSlice.js';
import { clearCoachCaches } from '../utils/coachPipeline.js';

// --- IndexedDB Adapter (Clean & Async) ---
const saveTimeouts = {};
const savePromises = {}; // Novo rastreador de promises
let isStorageLocked = false;

const idbStorage = {
    getItem: async (name) => {
        try {
            const val = await idbGet(name);
            return val || null;
        } catch (e) {
            console.error('[Storage] Falha CRÍTICA ao ler IDB. Ativando LOCK de emergência:', e);
            isStorageLocked = true;
            return null;
        }
    },
    setItem: (name, value) => {
        return new Promise((resolve, reject) => {
            if (isStorageLocked) {
                console.warn('[Storage] Operação ignorada. Lock de emergência ativo.');
                return resolve();
            }
            
            // Rejeita a promise pendente anterior para evitar dangling promises (Memory Leak)
            if (saveTimeouts[name]) {
                clearTimeout(saveTimeouts[name]);
                if (savePromises[name]) {
                    savePromises[name].reject(new Error('Debounced'));
                }
            }
            
            savePromises[name] = { resolve, reject };
            
            saveTimeouts[name] = setTimeout(async () => {
                try {
                    await idbSet(name, value);
                    savePromises[name].resolve();
                } catch (e) {
                    console.error('[Storage] Falha crítica ao escrever no IDB:', e);
                    savePromises[name].reject(e);
                } finally {
                    delete savePromises[name];
                    delete saveTimeouts[name];
                }
            }, 250);
        }).catch(err => {
            // Ignora o erro se foi intencionalmente cancelado pelo debounce
            if (err.message !== 'Debounced') throw err;
        });
    },
    removeItem: async (name) => {
        if (saveTimeouts[name]) clearTimeout(saveTimeouts[name]);
        if (savePromises[name]) savePromises[name].reject(new Error('Removed'));
        try {
            await idbDel(name);
        } catch (e) {
            console.warn('[Storage] Falha ao remover do IDB:', e);
        }
    },
};

export const useAppStore = create(
    persist(
        temporal(
            immer((set, get) => ({
                appState: {
                    contests: { 'default': safeClone(INITIAL_DATA) },
                    activeId: 'default',
                    trash: [],
                    version: 0,
                    dashboardFilter: 'all',
                    hasSeenTour: false,
                    isHydrated: false, // Flag reativa de hidratação
                    pomodoro: { 
                        activeSubject: null, 
                        sessions: 1, 
                        targetCycles: 1, 
                        completedCycles: 0, 
                        accumulatedMinutes: 0,
                        mode: 'work',
                        neuralQueue: [],
                        neuralMode: false
                    },
                    lastUpdated: "1970-01-01T00:00:00.000Z"
                },
 
                // BUG-01 FIX: setDashboardFilter is defined exclusively in createSettingsSlice.js
                // (spread below). Removed duplicate inline definition that lacked version/sync tracking.
 
                // 🎯 DATA LEAK PROTECTION: Limpeza absoluta da RAM no Logout.
                resetStore: () => {
                    localStorage.removeItem('pomodoroState');
                    // MATH-03 / LEAK-01 FIX: Clear module-level MC cache on logout
                    clearCoachCaches();
                    // ✅ FIX: Notificar outras abas para encerrar Pomodoro
                    try {
                        const channel = new BroadcastChannel('pomodoro_sync');
                        channel.postMessage({ type: 'TIMER_RESET', tabId: 'reset-all' });
                        channel.close();
                    } catch { /* BroadcastChannel indisponível */ }

                    // ✅ Limpar temporal PRIMEIRO para evitar subscribers lendo estado inconsistente
                    if (useAppStore.temporal) {
                        useAppStore.temporal.getState().clear();
                    }

                    set((state) => {
                        // Preservamos configurações de UI (tema, etc) mas limpamos dados sensíveis
                        const settings = state.appState.settings;
                        state.appState = {
                            contests: { 'default': safeClone(INITIAL_DATA) },
                            activeId: 'default',
                            trash: [],
                            version: 0,
                            dashboardFilter: 'all',
                            hasSeenTour: false,
                            // ✅ FIX: Restaurar campos de data isolation global
                            lastReviewSummary: null,
                            lastReviewTime: null,
                            activeWorkspace: 'default', // Para isolamento futuro
                            pomodoro: { 
                                activeSubject: null, 
                                sessions: 1, 
                                targetCycles: 1, 
                                completedCycles: 0, 
                                accumulatedMinutes: 0,
                                mode: 'work',
                                neuralQueue: [],
                                neuralMode: false
                            },
                            lastUpdated: "1970-01-01T00:00:00.000Z",
                            isHydrated: true,
                            settings: settings // Preserva o tema escolhido
                        };
                    });
                },

                // Injetar os Slices
                ...createPomodoroSlice(set, get),
                ...createTaskSlice(set, get),
                ...createCategorySlice(set, get),
                ...createStudySlice(set, get),
                ...createContestSlice(set, get),
                ...createGamificationSlice(set, get),
                ...createSimuladoSlice(set, get),
                ...createTrashSlice(set, get),
                ...createSettingsSlice(set, get),
                ...createMonteCarloSlice(set, get),
            })),
            {
                // Zundo Options: Limit history to 20 states
                limit: 20,
                // PERFORMANCE FIX: Ignora atualizações do Pomodoro e da UI. O histórico só é salvo se a base de dados (contests) mudar! O(1)
                equality: (past, current) => past.appState?.contests === current.appState?.contests,
                // BUG 1 FIX: Restringe o histórico do Zundo omitindo arrays massivos
                // CORREÇÃO: Limpar também a Lixeira (trash) e o Histórico de Monte Carlo para evitar Memory Leak nas 20 instâncias de Undo
                partialize: (state) => ({
                    appState: {
                        ...state.appState,
                        trash: (state.appState.trash || []).slice(-10),
                        contests: Object.keys(state.appState.contests || {}).reduce((acc, id) => {
                            const c = state.appState.contests[id];
                            acc[id] = {
                                ...c,
                                // Preserva últimos 50 registros para undo/redo funcional
                                simulados: (c.simulados || []).slice(-50),
                                studyLogs: (c.studyLogs || []).slice(-50),
                                monteCarloHistory: (c.monteCarloHistory || []).slice(-30),
                                simuladoRows: (c.simuladoRows || []).slice(-50),
                            };
                            return acc;
                        }, {})
                    }
                }),
            }
        ),
        {
            name: 'ultra-dashboard-storage',
            version: 5, // Forçar bump de versão
            storage: createJSONStorage(() => idbStorage),
            // Don't persist the history/temporal state itself, just the app state
            partialize: (state) => ({ appState: state.appState }),

            onRehydrateStorage: () => {
                return (state, error) => {
                    // Em caso de erro, libera a UI para mostrar estado vazio/erro em vez de travar
                    if (error || !state) {
                        useAppStore.setState((prev) => ({
                            appState: { ...prev.appState, isHydrated: true }
                        }));
                        return;
                    }
 
                    // Resolução Síncrona do ActiveId para evitar Flash of Empty State (FOES)
                    const appState = state.appState || {};
                    const contestsList = Object.keys(appState.contests || {});
                    let targetId = appState.activeId;
                    let targetContests = appState.contests;
                    
                    try {
                        if ((!targetId || !targetContests?.[targetId]) && contestsList.length > 0) {
                            targetId = contestsList[0];
                        } else if (contestsList.length === 0) {
                            targetId = 'default';
                            targetContests = { 'default': safeClone(INITIAL_DATA) };
                        }
                    } catch (e) {
                        console.error("[Zustand] Falha estrutural CRÍTICA na reconstrução do estado base.", e);
                        // Solução absoluta: Purgar armazenamento corrompido para que a app respire no próximo reload
                        localStorage.removeItem('ultra-dashboard-storage');
                        idbDel('ultra-dashboard-storage').catch(() => {});
                        targetId = 'default';
                        targetContests = { 'default': { simulados: [], tasks: [] } };
                    }

                    // Atualização Atômica: ID e Hidratação juntos, sem mutação direta do estado persistido
                    useAppStore.setState((prev) => {
                        const currentAppState = prev.appState || {};
                        const validatedState = validateAppState({
                            ...currentAppState,
                            contests: targetContests || currentAppState.contests || { 'default': { simulados: [], tasks: [] } },
                            activeId: targetId
                        });
                        
                        return {
                            appState: {
                                ...validatedState,
                                isHydrated: true
                            }
                        };
                    });
                };
            }
        }
    )
);

// Helper to access temporal store easily
export const useTemporalStore = (selector) => {
    return useStore(useAppStore.temporal, selector);
};

// MATH-03 / LEAK-01 FIX: Invalidate cache when activeId changes
let previousActiveId = useAppStore.getState().appState.activeId;
useAppStore.subscribe((state) => {
    const currentActiveId = state.appState.activeId;
    if (currentActiveId !== previousActiveId) {
        previousActiveId = currentActiveId;
        clearCoachCaches();
    }
});
