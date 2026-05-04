import { safeClone } from './safeClone.js';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { INITIAL_DATA } from '../data/initialData';
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

// --- IndexedDB Adapter with localStorage Migration ---
// --- Otimização de Persistência: Debounced IndexedDB Adapter ---
let saveTimeout = null;
const DEBOUNCE_TIME = 500; // ms

const idbStorage = {
    getItem: async (name) => {
        // --- SYNC ENGINE FIX: Comparação Atômica entre IDB e LocalStorage ---
        // Se houver divergência (ex: refresh rápido antes do debounce do IDB), 
        // escolhemos o storage que possuir a versão ou timestamp mais recente.
        const idbValue = await idbGet(name);
        const localValue = localStorage.getItem(name);

        if (!idbValue && !localValue) return null;

        // Se só existe em um deles, retorna o existente
        if (!idbValue) return localValue;
        if (!localValue) return idbValue;

        // Se existem em ambos, precisamos decodificar e comparar versões
        try {
            const idbParsed = JSON.parse(idbValue);
            const localParsed = JSON.parse(localValue);
            
            const idbVer = idbParsed?.state?.appState?.version || 0;
            const localVer = localParsed?.state?.appState?.version || 0;
            const idbTime = new Date(idbParsed?.state?.appState?.lastUpdated || 0).getTime();
            const localTime = new Date(localParsed?.state?.appState?.lastUpdated || 0).getTime();

            // Prioridade: Versão > Timestamp
            if (localVer > idbVer || (localVer === idbVer && localTime > idbTime)) {
                console.warn("[Storage] LocalStorage é mais recente que IDB. Recuperando backup.");
                // Sincroniza IDB com o backup mais novo
                await idbSet(name, localValue);
                return localValue;
            }
            
            // Se o IDB for mais recente, remove o backup antigo do LocalStorage para limpar espaço
            if (idbVer > localVer || idbTime > localTime + 10000) {
                localStorage.removeItem(name);
            }

            return idbValue;
        } catch (e) {
            // Fallback para IDB em caso de erro de parsing
            return idbValue;
        }
    },
    setItem: (name, value) => {
        // --- PATCH: Backup síncrono imediato ---
        try {
            localStorage.setItem(name, value);
        } catch (e) {
            console.warn("[Storage] Backup síncrono falhou.", e?.name);
        }

        if (saveTimeout) clearTimeout(saveTimeout);
        
        saveTimeout = setTimeout(async () => {
            try {
                await idbSet(name, value);
                saveTimeout = null;
            } catch (e) {
                console.error("[Storage] Critical IDB save failure:", e);
            }
        }, 100); // Reduzido para 100ms para maior agilidade em localhost

        return Promise.resolve();
    },
    removeItem: async (name) => {
        if (saveTimeout) clearTimeout(saveTimeout);
        localStorage.removeItem(name);
        try {
            await idbDel(name);
        } catch (e) {
            console.error("[Storage] Failed to remove from IndexedDB:", e);
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
                // BUG 1 FIX: Partialize must include the entire appState tree.
                partialize: (state) => ({
                    appState: state.appState
                }),
            }
        ),
        {
            name: 'ultra-dashboard-storage',
            version: 1,
            storage: createJSONStorage(() => idbStorage),
            // Don't persist the history/temporal state itself, just the app state
            partialize: (state) => ({ appState: state.appState }),

            // NOVO: Roda nos bastidores antes do App.jsx montar
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
                    const appState = state.appState;
                    const contestsList = Object.keys(appState.contests || {});
                    let targetId = appState.activeId;
                    
                    if ((!targetId || !appState.contests[targetId]) && contestsList.length > 0) {
                        targetId = contestsList[0];
                    }

                    // Atualização Atômica: ID e Hidratação juntos
                    useAppStore.setState((prev) => ({
                        appState: {
                            ...prev.appState,
                            activeId: targetId,
                            isHydrated: true
                        }
                    }));
                };
            },
        }
    )
);

// Helper to access temporal store easily
export const useTemporalStore = (selector) => {
    const useStore = useAppStore.temporal;
    return useStore(selector);
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
