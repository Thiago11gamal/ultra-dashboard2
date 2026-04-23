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

// --- IndexedDB Adapter with localStorage Migration ---
const idbStorage = {
    getItem: async (name) => {
        // Try IndexedDB first
        const value = await idbGet(name);
        if (value !== undefined) return value;

        // Fallback to localStorage for migration
        const localValue = localStorage.getItem(name);
        if (localValue) {
            try {
                // Migrate the raw string to IndexedDB
                await idbSet(name, localValue);
                
                // FIX: Confirmar a gravação no IndexedDB antes de destruir o backup do localStorage
                const confirmSave = await idbGet(name);
                if (confirmSave !== undefined) {
                    localStorage.removeItem(name); 
                }
                return localValue;
            } catch (e) {
                console.error("[Storage] Migration failed, falling back to local memory.", e);
                return null;
            }
        }
        return null;
    },
    setItem: async (name, value) => {
        await idbSet(name, value);
    },
    removeItem: async (name) => {
        await idbDel(name);
    },
};

export const useAppStore = create(
    persist(
        temporal(
            immer((set, get) => ({
                appState: {
                    contests: { 'default': JSON.parse(JSON.stringify(INITIAL_DATA)) },
                    activeId: 'default',
                    trash: [],
                    version: 0,
                    dashboardFilter: 'all',
                    hasSeenTour: false,
                    pomodoro: { activeSubject: null, sessions: 0, targetCycles: 1, completedCycles: 0 },
                    lastUpdated: "1970-01-01T00:00:00.000Z"
                },

                // 🎯 DATA LEAK PROTECTION: Limpeza absoluta da RAM no Logout.
                resetStore: () => {
                    set((state) => {
                        // Preservamos configurações de UI (tema, etc) mas limpamos dados sensíveis
                        const settings = state.appState.settings;
                        state.appState = {
                            contests: { 'default': JSON.parse(JSON.stringify(INITIAL_DATA)) },
                            activeId: 'default',
                            trash: [],
                            version: 0,
                            dashboardFilter: 'all',
                            hasSeenTour: false,
                            pomodoro: { activeSubject: null, sessions: 0, targetCycles: 1, completedCycles: 0 },
                            lastUpdated: "1970-01-01T00:00:00.000Z",
                            settings: settings // Preserva o tema escolhido
                        };
                    });
                },

                // 💉 INJEÇÃO DE EMERGÊNCIA: Sobrescreve o estado inteiro com um backup.
                forceSetAppState: (newState) => {
                    set((state) => {
                        state.appState = {
                            ...newState,
                            lastUpdated: new Date().toISOString(), // Garante que será sincronizado de volta
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
                    if (error || !state) return;

                    const { appState } = state;
                    if (!appState) return;
                    
                    const contestsList = Object.keys(appState.contests || {});
                    
                    // Sanity Check 1: ID Ativo perdido ou inválido
                    if ((!appState.activeId || !appState.contests[appState.activeId]) && contestsList.length > 0) {
                        appState.activeId = contestsList[0];
                    }

                    // Sanity Check 2: Deduplicação de categorias (Foco no Contest Ativo)
                    if (appState.contests[appState.activeId]?.categories) {
                        const categories = appState.contests[appState.activeId].categories;
                        const unique = Array.from(new Map(categories.map(c => [c.name.toLowerCase().trim(), c])).values());
                        appState.contests[appState.activeId].categories = unique;
                    }
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
