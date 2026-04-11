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
                // Migrate the raw string to IndexedDB and clear localStorage
                await idbSet(name, localValue);
                localStorage.removeItem(name); 
                return localValue; // createJSONStorage expects the string
            } catch (e) {
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
                    contests: { 'default': INITIAL_DATA },
                    activeId: 'default',
                    trash: [],
                    version: 0,
                    dashboardFilter: 'all',
                    hasSeenTour: false,
                    pomodoro: { activeSubject: null, sessions: 0, targetCycles: 1, completedCycles: 0 },
                    lastUpdated: "1970-01-01T00:00:00.000Z"
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
                // Previously only contests + activeId were saved, so undo() replaced
                // the root appState with a partial object — wiping trash, version,
                // dashboardFilter, hasSeenTour, pomodoro, and lastUpdated to undefined.
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
        }
    )
);

// Helper to access temporal store easily
export const useTemporalStore = (selector) => {
    const useStore = useAppStore.temporal;
    return useStore(selector);
};
