import { safeClone } from './safeClone.js';
import { create, useStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { INITIAL_DATA } from '../data/initialData';
import { validateAppState } from './schemas';
import { createPomodoroSlice } from './slices/createPomodoroSlice';
import { createTaskSlice } from './slices/createTaskSlice';
import { createCategorySlice } from './slices/createCategorySlice';
import { createStudySlice } from './slices/createStudySlice';
import { createContestSlice } from './slices/createContestSlice';
import { createGamificationSlice } from './slices/createGamificationSlice';
import { createSimuladoSlice } from './slices/createSimuladoSlice';
import { createTrashSlice } from './slices/createTrashSlice';
import { createSettingsSlice } from './slices/createSettingsSlice';
import { createMonteCarloSlice } from './slices/createMonteCarloSlice';
import { clearMcCache } from '../utils/coachAdaptive';

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
 
                // FIX: Actions globais que faltavam e causavam Crash no Dashboard
                setDashboardFilter: (filter) => set((state) => {
                    state.appState.dashboardFilter = filter;
                }),
 
                // BUG-01 FIX: setData is defined exclusively in createSettingsSlice.js
                // (spread below). Removed the duplicate definition that was silently
                // overridden and used a different contract (mutation-only vs return-object).
 
                // 🎯 DATA LEAK PROTECTION: Limpeza absoluta da RAM no Logout.
                resetStore: () => {
                    localStorage.removeItem('pomodoroState');
                    // MATH-03 / LEAK-01 FIX: Clear module-level MC cache on logout
                    clearMcCache();
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
                    
                    // FIX: Purgar o histórico de Undo/Redo para impedir vazamento de dados
                    useAppStore.temporal.getState().clear();
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
                        trash: [], 
                        contests: Object.keys(state.appState.contests || {}).reduce((acc, id) => {
                            acc[id] = {
                                ...state.appState.contests[id],
                                simulados: [],
                                studyLogs: [],
                                monteCarloHistory: [],
                                simuladoRows: []
                            };
                            return acc;
                        }, {})
                    }
                }),
            }
        ),
        {
            name: 'ultra-dashboard-storage',
            version: 1,
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
        clearMcCache();
    }
});
