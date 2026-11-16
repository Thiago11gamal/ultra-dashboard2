import { validateAppState } from '../schemas.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { clearUrgencyCache, clearTopicsCache } from '../../utils/coachCaches.js';
import { clearMcCache } from '../../utils/coachAdaptive.js';

const applyDarkModeToggle = (state, mode) => {
  if (!state.appState) return;
  const activeData = state.appState.contests?.[state.appState.activeId];
  if (!activeData) return;
  if (!activeData.settings) activeData.settings = {};

  if (mode === true || mode === false || mode === 'auto') {
    activeData.settings.darkMode = mode;
  } else {
    const current = activeData.settings.darkMode;
    if (current === 'auto' || current === undefined) {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      activeData.settings.darkMode = !prefersDark;
    } else {
      activeData.settings.darkMode = !current;
    }
  }

  const nowIso = new Date().toISOString();
  activeData.lastUpdated = nowIso;
  state.appState.version = (state.appState.version || 0) + 1;
  state.appState.lastUpdated = nowIso;
  markStorageDirty();
};

export const createSettingsSlice = (set) => ({
  setHasSeenTour: (value) => set((state) => {
    if (!state.appState) return;
    state.appState.hasSeenTour = Boolean(value);
    if (value) {
      state.appState.lastSeenTourDate = new Date().toDateString();
    }
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),
  
  setDashboardFilter: (filterOrEvent) => set((state) => {
    if (!state.appState) return;
    const rawFilter = (filterOrEvent && typeof filterOrEvent === 'object' && 'target' in filterOrEvent)
      ? filterOrEvent.target?.value
      : filterOrEvent;
    const nextFilter = typeof rawFilter === 'string' ? rawFilter : 'all';
    state.appState.dashboardFilter = nextFilter || 'all';
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    markStorageDirty();
  }),
  
  updateCoachPlanner: (newPlannerData) => set((state) => {
    if (!state.appState) return;
    const activeData = state.appState.contests?.[state.appState.activeId];
    if (!activeData) return;
    if (JSON.stringify(activeData.coachPlanner) === JSON.stringify(newPlannerData)) return;
    const nowIso = new Date().toISOString();
    activeData.coachPlanner = newPlannerData;
    activeData.lastUpdated = nowIso;
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = nowIso;
    markStorageDirty();
  }),
  
  setThemeMode: (mode) => set((state) => applyDarkModeToggle(state, mode)),
  toggleDarkMode: (mode) => set((state) => applyDarkModeToggle(state, mode)),
  
  setAppState: (newStateObj) => set((state) => {
    if (!state.appState) return;
    let nextState = typeof newStateObj === 'function' ? newStateObj(state.appState) : newStateObj;
    if (!nextState) return;
    if (nextState === state.appState) return;
    
    const hasExplicitHistory = Array.isArray(nextState.history);
    const incomingHistory = nextState.history;
    const rawIncomingVersion = nextState.version;
    const hasExplicitVersion =
      rawIncomingVersion !== undefined &&
      rawIncomingVersion !== null &&
      typeof rawIncomingVersion !== 'boolean' &&
      String(rawIncomingVersion).trim() !== '' &&
      Number.isFinite(Number(rawIncomingVersion));

    nextState = validateAppState(nextState);
    
    const nextContests = (nextState.contests && typeof nextState.contests === 'object')
      ? nextState.contests : state.appState.contests;
    const contestIds = Object.keys(nextContests || {});
    const fallbackActiveId = contestIds[0] || state.appState.activeId;
    const nextActiveId = (nextState.activeId && nextContests?.[nextState.activeId])
      ? nextState.activeId : fallbackActiveId;
    
    const { history: _history, ...otherState } = nextState;
    const finalHistory = hasExplicitHistory
      ? incomingHistory
      : (state.appState.history || []);
    
    const prevVersion = Number(state.appState.version) || 0;
    const resolvedVersion = hasExplicitVersion
      ? Math.max(prevVersion, Number(rawIncomingVersion))
      : prevVersion + 1;

    Object.assign(state.appState, {
      ...otherState,
      contests: nextContests,
      activeId: nextActiveId,
      history: finalHistory,
      version: resolvedVersion
    });
    
    state.appState.lastUpdated = nextState.lastUpdated ?? new Date().toISOString();
    clearUrgencyCache();
    clearTopicsCache();
    clearMcCache();
    markStorageDirty();
  }),
  
});

