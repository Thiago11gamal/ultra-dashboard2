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
import { auth as firebaseAuth, db as firebaseDb, secureLogout as firebaseSecureLogout } from '../services/firebase.js';

const STORAGE_META_SUFFIX = ':meta';
const getStorageMetaKey = (name) => `${name}${STORAGE_META_SUFFIX}`;
const hasIndexedDbSupport = () => typeof indexedDB !== 'undefined';

const buildStorageMetaJson = (value) => {
  try {
    const parsed = JSON.parse(value);
    const appState = parsed?.state?.appState;
    return JSON.stringify({
      version: Number(appState?.version || 0),
      lastUpdated: appState?.lastUpdated || null,
      storedIn: 'idb'
    });
  } catch {
    return JSON.stringify({ version: 0, lastUpdated: null, storedIn: 'idb' });
  }
};

// --- IndexedDB Adapter ---
const saveTimeouts = {};
const savePromises = {};
const latestValues = {};

let writeOpCounter = 0;
const currentWriteTokens = {};
let isClearingAllData = false;
let suppressStorageWriteDepth = 0;

const flushPendingStorage = () => {
  if (isClearingAllData || suppressStorageWriteDepth > 0) return;
  for (const name of Object.keys(saveTimeouts)) {
    if (saveTimeouts[name]) {
      clearTimeout(saveTimeouts[name]);
      delete saveTimeouts[name];
    }
    if (savePromises[name]) {
      try { savePromises[name].resolve(); } catch { /* ignore */ }
      delete savePromises[name];
    }
    delete currentWriteTokens[name];
    if (latestValues[name]) {
      const valToFlush = latestValues[name];
      delete latestValues[name];
      // Gravação síncrona de emergência no descarregamento da aba (antes que a prorrogação assíncrona do IDB conclua);
      // no próximo ciclo debounced bem-sucedido no IDB, a chave cheia é removida mantendo apenas :meta.
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(name, valToFlush);
      } catch { /* ignore */ }
      try {
        if (hasIndexedDbSupport()) {
          idbSet(name, valToFlush).catch(() => { });
        }
      } catch { /* ignore */ }
    }
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingStorage);
  // C-11 FIX: Adicionar pagehide como backup (mais confiável que beforeunload)
  window.addEventListener('pagehide', flushPendingStorage);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPendingStorage();
    });
  }
}

const idbStorage = {
  getItem: async (name) => {
    const readLocalFull = () => {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
      } catch {
        return null;
      }
    };
    try {
      const val = hasIndexedDbSupport() ? await idbGet(name) : null;
      const localVal = readLocalFull();
      if (!val) return localVal || null;
      if (!localVal) return val;
      try {
        const pIdb = JSON.parse(val);
        const pLocal = JSON.parse(localVal);
        const idbTime = new Date(pIdb?.state?.appState?.lastUpdated || 0).getTime();
        const localTime = new Date(pLocal?.state?.appState?.lastUpdated || 0).getTime();
        const idbVer = Number(pIdb?.state?.appState?.version || 0);
        const localVer = Number(pLocal?.state?.appState?.version || 0);
        if (localVer > idbVer && localTime >= idbTime - 60000) {
          return localVal;
        }
        if (localTime > idbTime && localVer >= idbVer) {
          return localVal;
        }
        return val;
      } catch {
        // fallback to val
      }
      return val;
    } catch (e) {
      console.warn('[Storage] Falha ao ler IDB. Tentando fallback localStorage:', e);
      return readLocalFull();
    }
  },
  setItem: (name, value) => {
    if (isClearingAllData || suppressStorageWriteDepth > 0) {
      return Promise.resolve();
    }
    latestValues[name] = value;

    return new Promise((resolve, reject) => {
      if (saveTimeouts[name]) clearTimeout(saveTimeouts[name]);
      if (savePromises[name]) savePromises[name].resolve();

      const opToken = ++writeOpCounter;
      currentWriteTokens[name] = opToken;
      const currentPromise = { resolve, reject };
      savePromises[name] = currentPromise;

      saveTimeouts[name] = setTimeout(async () => {
        try {
          if (isClearingAllData || suppressStorageWriteDepth > 0 || currentWriteTokens[name] !== opToken) {
            currentPromise.resolve();
            return;
          }
          if (hasIndexedDbSupport()) {
            await idbSet(name, value);
            try {
              if (!isClearingAllData && typeof localStorage !== 'undefined' && currentWriteTokens[name] === opToken) {
                localStorage.setItem(getStorageMetaKey(name), buildStorageMetaJson(value));
                localStorage.removeItem(name);
              }
            } catch {
              // Metadados no localStorage são best-effort
            }
          } else if (!isClearingAllData && typeof localStorage !== 'undefined' && currentWriteTokens[name] === opToken) {
            localStorage.setItem(name, value);
          }
          if (currentWriteTokens[name] === opToken) {
            currentPromise.resolve();
          }
        } catch (e) {
          console.error('[Storage] Falha ao escrever no IDB:', e);
          try {
            if (!isClearingAllData && typeof localStorage !== 'undefined' && currentWriteTokens[name] === opToken) {
              localStorage.setItem(name, value);
            }
            if (currentWriteTokens[name] === opToken) {
              currentPromise.resolve();
            }
          } catch (fallbackErr) {
            if (currentWriteTokens[name] === opToken) {
              currentPromise.reject(fallbackErr);
            }
          }
        } finally {
          if (currentWriteTokens[name] === opToken) {
            delete savePromises[name];
            delete saveTimeouts[name];
            delete currentWriteTokens[name];
            if (latestValues[name] === value) {
              delete latestValues[name];
            }
          }
        }
      }, 250);
    });
  },
  removeItem: async (name) => {
    if (saveTimeouts[name]) clearTimeout(saveTimeouts[name]);
    if (savePromises[name]) savePromises[name].reject(new Error('Removed'));
    delete latestValues[name];
    try { await idbDel(name); } catch { /* ignore */ }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(name);
        localStorage.removeItem(getStorageMetaKey(name));
      }
    } catch { /* ignore */ }
  },
};

// ✅ FIX: ESTADO INICIAL COMPLETO — inclui TODOS os campos que componentes acessam
const getFullInitialState = () => ({
  contests: { 'default': safeClone(INITIAL_DATA) },
  activeId: 'default',
  trash: [],
  deletedContestIds: [],
  version: 0,
  dashboardFilter: 'all',
  hasSeenTour: false,
  isHydrated: false,
  // ✅ Campos que faltavam e causavam crashes pós-reset
  lastReviewSummary: null,
  lastReviewTime: null,
  activeWorkspace: 'default',
  pomodoro: {
    isRunning: false,
    activeSubject: null,
    sessions: 1,
    targetCycles: 1,
    completedCycles: 0,
    accumulatedMinutes: 0,
    mode: 'work',
    neuralQueue: [],
    neuralMode: false
  },
  lastUpdated: null
});

export const useAppStore = create(
  persist(
    temporal(
      immer((set, get) => ({
        appState: getFullInitialState(),

        // ✅ FIX: resetStore COMPLETO — limpa TODOS os campos
        resetStore: () => {
          try {
            if (saveTimeouts['ultra-dashboard-storage']) {
              clearTimeout(saveTimeouts['ultra-dashboard-storage']);
              delete saveTimeouts['ultra-dashboard-storage'];
            }
            if (savePromises['ultra-dashboard-storage']) {
              try { savePromises['ultra-dashboard-storage'].resolve(); } catch { /* ignore */ }
              delete savePromises['ultra-dashboard-storage'];
            }
            delete latestValues['ultra-dashboard-storage'];
            delete currentWriteTokens['ultra-dashboard-storage'];
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('pomodoroState');
              localStorage.removeItem('pomodoro-endsAt');
              localStorage.removeItem('ultra-sync-dirty');
              localStorage.removeItem('ultra-dashboard-storage');
              localStorage.removeItem('ultra-dashboard-storage:meta');
            }
          } catch { /* ignore */ }
          try {
            idbDel('ultra-dashboard-storage').catch(() => { });
          } catch { /* ignore */ }
          clearCoachCaches();
          try {
            sessionStorage.removeItem('hasSeenWelcomeScreen');
            sessionStorage.removeItem('ultra-sync-dirty');
            sessionStorage.removeItem('page-has-been-force-refreshed');
          } catch { /* ignore */ }
          try {
            if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
              const channel = new window.BroadcastChannel('pomodoro_sync');
              channel.postMessage({ type: 'TIMER_RESET', tabId: 'reset-all' });
              channel.close();
            }
          } catch { /* ignore */ }

          if (useAppStore.temporal) {
            useAppStore.temporal.getState().clear();
          }

          suppressStorageWriteDepth += 1;
          try {
            set((state) => {
              const initialState = getFullInitialState();
              state.appState = {
                ...initialState,
                isHydrated: true
              };
            });
          } finally {
            suppressStorageWriteDepth = Math.max(0, suppressStorageWriteDepth - 1);
          }
        },

        /**
         * Substitui ou atualiza o concurso ativo.
         * Quando o retorno inclui chaves estruturais do concurso (`categories`, `contestName` ou `user`),
         * substitui o objeto completo preservando deleções de chaves; para atualizações parciais prefira `patchData`.
         */
        setData: (newDataCallback) => set((state) => {
          const contestId = state.appState.activeId;
          const currentData = state.appState.contests[contestId];
          if (!currentData) return;

          if (newDataCallback === undefined || newDataCallback === null) {
            console.warn("[Store] setData recebeu valor nulo/indefinido. Mutação abortada.");
            return;
          }

          const nextData = typeof newDataCallback === 'function'
            ? newDataCallback(currentData)
            : newDataCallback;

          if (nextData !== null && typeof nextData === 'object' && nextData !== currentData) {
            const nowIso = new Date().toISOString();
            const isFullContest = 'categories' in nextData || 'contestName' in nextData || 'user' in nextData;
            if (isFullContest) {
              state.appState.contests[contestId] = {
                ...nextData,
                lastUpdated: nowIso
              };
            } else {
              Object.assign(state.appState.contests[contestId], nextData);
              state.appState.contests[contestId].lastUpdated = nowIso;
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }
          }
        }),

        /**
         * Aplica patch parcial superficial no concurso ativo (`Object.assign`).
         */
        patchData: (partialCallback) => set((state) => {
          const contestId = state.appState.activeId;
          const currentData = state.appState.contests[contestId];
          if (!currentData || partialCallback === undefined || partialCallback === null) return;

          const patch = typeof partialCallback === 'function'
            ? partialCallback(currentData)
            : partialCallback;

          if (patch !== null && typeof patch === 'object' && patch !== currentData) {
            Object.assign(state.appState.contests[contestId], patch);
            const nowIso = new Date().toISOString();
            state.appState.contests[contestId].lastUpdated = nowIso;
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = nowIso;
            try { localStorage.setItem('ultra-sync-dirty', 'true'); } catch { /* ignore */ }
          }
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
        // C-02 FIX: comparação por referência sempre falha com Immer.
        // Usar JSON length como proxy rápido de mudança + version.
        equality: (past, current) =>
          (past.appState?.version || 0) === (current.appState?.version || 0),
        partialize: (state) => {
          const rawTrash = state.appState.trash;
          const boundedTrash = Array.isArray(rawTrash) && rawTrash.length > 10 ? rawTrash.slice(-10) : rawTrash;
          return {
            appState: {
              ...state.appState,
              trash: boundedTrash
            }
          };
        },
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
            console.error('[Storage] Falha ao reidratar estado:', error);
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
            try {
              localStorage.removeItem('ultra-dashboard-storage');
              localStorage.removeItem('ultra-dashboard-storage:meta');
            } catch { /* ignore */ }
            try { idbDel('ultra-dashboard-storage').catch(() => { }); } catch { /* ignore */ }
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

// MATH-03: Invalidação centralizada dos caches do Coach/MC sempre que activeId ou version mudar
let previousActiveId = useAppStore.getState().appState.activeId;
let previousVersion = useAppStore.getState().appState.version;
useAppStore.subscribe((state) => {
  const currentActiveId = state.appState.activeId;
  const currentVersion = state.appState.version;
  if (currentActiveId !== previousActiveId || currentVersion !== previousVersion) {
    previousActiveId = currentActiveId;
    previousVersion = currentVersion;
    clearCoachCaches();
  }
});

// ✅ FIX S03 / BUG-05: Implementação segura para exclusão total de dados
// Limpa bancos de dados passados, localStorage, sessionStorage e idb-keyval
export const clearAllDataSecure = async () => {
  isClearingAllData = true;
  try {
    // 1. Cancelar escritas debounced pendentes ANTES de limpar ou redirecionar
    for (const name of Object.keys(saveTimeouts)) {
      if (saveTimeouts[name]) {
        clearTimeout(saveTimeouts[name]);
        delete saveTimeouts[name];
      }
      if (savePromises[name]) {
        try { savePromises[name].resolve(); } catch { /* ignore */ }
        delete savePromises[name];
      }
      delete latestValues[name];
      delete currentWriteTokens[name];
    }

    // 2. Apagar backups na nuvem (se autenticado) e encerrar sessão com segurança
    try {
      const currentUid = firebaseAuth?.currentUser?.uid;
      if (currentUid && firebaseDb) {
        try {
          const firestoreMod = await import('firebase/firestore');
          const contestsSnap = await firestoreMod.getDocs(
            firestoreMod.collection(firebaseDb, 'backups', currentUid, 'contests')
          );
          const batch = firestoreMod.writeBatch(firebaseDb);
          contestsSnap.forEach((cDoc) => batch.delete(cDoc.ref));
          batch.delete(firestoreMod.doc(firebaseDb, 'backups', currentUid));
          await batch.commit();
        } catch (cloudDelErr) {
          console.warn('[Storage] Falha ao remover backups na nuvem ao zerar conta:', cloudDelErr);
        }
      }
      if (typeof firebaseSecureLogout === 'function') {
        await firebaseSecureLogout();
      }
    } catch { /* ignore */ }

    // 3. Limpar store em memória e histórico de undo
    try {
      useAppStore.getState()?.resetStore?.();
      useAppStore.temporal?.getState?.()?.clear?.();
    } catch { /* ignore */ }

    try {
      if (typeof localStorage !== 'undefined') localStorage.clear();
      if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    } catch {
      // Ignorar erros de storage
    }

    try {
      await idbDel('ultra-dashboard-storage');
    } catch {
      // Ignorar erros de remoção idb-keyval
    }

    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        if (typeof window.indexedDB.databases === 'function') {
          const dbs = await window.indexedDB.databases();
          await Promise.all((dbs || []).map(db => {
            if (!db?.name) return Promise.resolve();
            return new Promise((resolve) => {
              const req = window.indexedDB.deleteDatabase(db.name);
              req.onsuccess = resolve;
              req.onerror = resolve;
              req.onblocked = resolve;
            });
          }));
        } else {
          throw new Error('indexedDB.databases() not supported');
        }
      } catch (err) {
        console.warn('[Storage] Fallback manual de limpeza IndexedDB', err);
        // Fallback: Excluir chaves conhecidas
        try {
          window.indexedDB.deleteDatabase('ultra-dashboard-storage');
          window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
          window.indexedDB.deleteDatabase('keyval-store');
        } catch {
          // Ignorar erros
        }
      }
    }

    if (typeof window !== 'undefined' && window.location) {
      window.location.href = '/';
    }
  } finally {
    isClearingAllData = false;
  }
};
