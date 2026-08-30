import { safeClone } from '../utils/safeClone.js';
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

// --- IndexedDB Adapter ---
const saveTimeouts = {};
const savePromises = {};
let isStorageLocked = false;

const idbStorage = {
  getItem: async (name) => {
    try {
      const val = await idbGet(name);
      return val || null;
    } catch (e) {
      console.error('[Storage] Falha CRÍTICA ao ler IDB. Ativando LOCK:', e);
      isStorageLocked = true;
      return null;
    }
  },
  setItem: (name, value) => {
    return new Promise((resolve, reject) => {
      if (isStorageLocked) {
        console.warn('[Storage] Operação ignorada. Lock ativo.');
        return resolve();
      }
      if (saveTimeouts[name]) clearTimeout(saveTimeouts[name]);
      savePromises[name] = { resolve, reject };
      saveTimeouts[name] = setTimeout(async () => {
        try {
          await idbSet(name, value);
          savePromises[name]?.resolve();
        } catch (e) {
          console.error('[Storage] Falha ao escrever no IDB:', e);
          try {
            localStorage.setItem(name, value);
            savePromises[name]?.resolve();
          } catch (fallbackErr) {
            savePromises[name]?.reject?.(fallbackErr);
          }
        } finally {
          delete savePromises[name];
          delete saveTimeouts[name];
        }
      }, 250);
    });
  },
  removeItem: async (name) => {
    if (saveTimeouts[name]) clearTimeout(saveTimeouts[name]);
    if (savePromises[name]) savePromises[name].reject(new Error('Removed'));
    try { await idbDel(name); } catch { /* ignore */ }
  },
};

// ✅ FIX: ESTADO INICIAL COMPLETO — inclui TODOS os campos que componentes acessam
const getFullInitialState = () => ({
  contests: { 'default': safeClone(INITIAL_DATA) },
  activeId: 'default',
  trash: [],
  version: 0,
  dashboardFilter: 'all',
  hasSeenTour: false,
  isHydrated: false,
  // ✅ Campos que faltavam e causavam crashes pós-reset
  lastReviewSummary: null,
  lastReviewTime: null,
  activeWorkspace: 'default',
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
});

export const useAppStore = create(
  persist(
    temporal(
      immer((set, get) => ({
        appState: getFullInitialState(),

        // ✅ FIX: resetStore COMPLETO — limpa TODOS os campos
        resetStore: () => {
          localStorage.removeItem('pomodoroState');
          clearCoachCaches();
          try {
            sessionStorage.removeItem('hasSeenWelcomeScreen');
            sessionStorage.removeItem('ultra-sync-dirty');
            sessionStorage.removeItem('page-has-been-force-refreshed');
          } catch { /* ignore */ }
          try {
            const channel = new BroadcastChannel('pomodoro_sync');
            channel.postMessage({ type: 'TIMER_RESET', tabId: 'reset-all' });
            channel.close();
          } catch { /* ignore */ }

          if (useAppStore.temporal) {
            useAppStore.temporal.getState().clear();
          }

          set((state) => {
            const settings = state.appState.settings;
            state.appState = {
              ...getFullInitialState(),
              isHydrated: true,
              settings: settings
            };
          });
        },

        // ✅ FIX: setData usa Object.assign para preservar Proxy Immer
        setData: (newDataCallback) => set((state) => {
          const contestId = state.appState.activeId;
          const currentData = state.appState.contests[contestId];
          if (!currentData) return;

          // 🔥 BUGFIX 1 (STATE CORRUPTION): Impedir que callbacks mal formados destruam o estado silenciosamente.
          const nextData = typeof newDataCallback === 'function'
            ? newDataCallback(currentData)
            : newDataCallback;

          if (nextData === undefined) {
            console.warn("[Store] setData callback retornou undefined. Mutação abortada para evitar corrupção de estado.");
            return;
          }

          if (nextData !== null && typeof nextData === 'object') {
            Object.assign(state.appState.contests[contestId], nextData);
          }

          const nowIso = new Date().toISOString();
          if (state.appState.contests[contestId]) {
            state.appState.contests[contestId].lastUpdated = nowIso;
          }
          state.appState.version = (state.appState.version || 0) + 1;
          state.appState.lastUpdated = nowIso;
          try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }
        }),

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
        limit: 20,
        equality: (past, current) => past.appState?.contests === current.appState?.contests,
        partialize: (state) => ({
          appState: {
            ...state.appState,
            trash: (state.appState.trash || []).slice(-10),
            contests: Object.keys(state.appState.contests || {}).reduce((acc, id) => {
              const c = state.appState.contests[id];
              acc[id] = {
                ...c,
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
      version: 5,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ appState: state.appState }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error || !state) {
            useAppStore.setState((prev) => ({
              appState: { ...prev.appState, isHydrated: true }
            }));
            return;
          }
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
            console.error("[Zustand] Falha estrutural CRÍTICA:", e);
            try { localStorage.removeItem('ultra-dashboard-storage'); } catch { /* ignore */ }
            try { idbDel('ultra-dashboard-storage').catch(() => {}); } catch { /* ignore */ }
            targetId = 'default';
            targetContests = { 'default': safeClone(INITIAL_DATA) };
          }
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

export const useTemporalStore = (selector) => {
  return useStore(useAppStore.temporal, selector);
};

// MATH-03: Invalidate cache quando activeId muda
let previousActiveId = useAppStore.getState().appState.activeId;
useAppStore.subscribe((state) => {
  const currentActiveId = state.appState.activeId;
  if (currentActiveId !== previousActiveId) {
    previousActiveId = currentActiveId;
    clearCoachCaches();
  }
});

// ✅ FIX S03: Implementação segura para exclusão total de dados
// Limpa bancos de dados passados, localStorage e sessionStorage
export const clearAllDataSecure = async () => {
  localStorage.clear();
  sessionStorage.clear();

  try {
    const dbs = await window.indexedDB.databases();
    await Promise.all(dbs.map(db => {
      return new Promise((resolve) => {
        const req = window.indexedDB.deleteDatabase(db.name);
        req.onsuccess = resolve;
        req.onerror = resolve;
        req.onblocked = resolve;
      });
    }));
  } catch (err) {
    console.warn('[Storage] Fallback manual de limpeza IndexedDB', err);
    // Fallback: Excluir chaves conhecidas
    try {
      window.indexedDB.deleteDatabase('ultra-dashboard-storage');
      window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
      // Forçamos resolução silenciosa para não travar a aplicação
    } catch (e) {
      // Ignorar erros
    }
  }

  window.location.href = '/';
};
