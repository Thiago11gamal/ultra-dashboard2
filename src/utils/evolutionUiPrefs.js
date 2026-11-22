const STORAGE_PREFIX = 'evolution_ui_prefs_v1:';

export const VALID_TIME_WINDOWS = new Set(['30', '60', '90', 'all']);
export const VALID_STATUS_MODES = new Set(['compact', 'detailed']);
export const VALID_ENGINE_GROUPS = new Set(['all', 'performance', 'speed', 'projection', 'psychometrics']);
export const VALID_SECONDARY_ENGINES = new Set([
  'raw',
  'raw_weekly',
  'stats',
  'compare',
  'subtopics',
  'mc_density',
  'weekly_diff',
  'today_vs_general',
  'time_spent',
  'speed_accuracy',
  'exam_pacing',
  'consistency_boxplot',
  'projection_fan',
  'kalman_latent',
  'tornado_whatif',
  'correlation_regimes',
  'irt_psychometric',
  'metacognition_fatigue',
]);

export const GROUP_ENGINE_MAP = {
  all: null,
  performance: ['raw_weekly', 'raw', 'stats', 'subtopics', 'weekly_diff', 'today_vs_general', 'consistency_boxplot'],
  speed: ['time_spent', 'speed_accuracy', 'exam_pacing'],
  projection: ['compare', 'mc_density', 'projection_fan', 'kalman_latent', 'tornado_whatif'],
  psychometrics: ['correlation_regimes', 'irt_psychometric', 'metacognition_fatigue'],
};

export const DEFAULT_EVOLUTION_UI_PREFS = Object.freeze({
  activeEngine: 'raw_weekly',
  timeWindow: 'all',
  engineGroup: 'all',
  statusViewMode: 'compact',
  showDetailedGallery: true,
});

function getDefaultStorage() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // Ignore restricted storage environments (private browsing / sandboxed iframes)
  }
  return null;
}

export function getEvolutionPrefsStorageKey(contestId) {
  const safeId = contestId != null && String(contestId).trim() !== '' ? String(contestId).trim() : 'default';
  return `${STORAGE_PREFIX}${safeId}`;
}

export function sanitizeEvolutionUiPrefs(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_EVOLUTION_UI_PREFS };

  const activeEngine = VALID_SECONDARY_ENGINES.has(raw.activeEngine)
    ? raw.activeEngine
    : DEFAULT_EVOLUTION_UI_PREFS.activeEngine;

  const timeWindow = VALID_TIME_WINDOWS.has(raw.timeWindow)
    ? raw.timeWindow
    : DEFAULT_EVOLUTION_UI_PREFS.timeWindow;

  let engineGroup = VALID_ENGINE_GROUPS.has(raw.engineGroup)
    ? raw.engineGroup
    : DEFAULT_EVOLUTION_UI_PREFS.engineGroup;

  // Garante que a aba ativa esteja visível no grupo restaurado
  const groupIds = GROUP_ENGINE_MAP[engineGroup];
  if (Array.isArray(groupIds) && !groupIds.includes(activeEngine)) {
    engineGroup = 'all';
  }

  const statusViewMode = VALID_STATUS_MODES.has(raw.statusViewMode)
    ? raw.statusViewMode
    : DEFAULT_EVOLUTION_UI_PREFS.statusViewMode;

  const showDetailedGallery = typeof raw.showDetailedGallery === 'boolean'
    ? raw.showDetailedGallery
    : DEFAULT_EVOLUTION_UI_PREFS.showDetailedGallery;

  return {
    activeEngine,
    timeWindow,
    engineGroup,
    statusViewMode,
    showDetailedGallery,
  };
}

export function readEvolutionUiPrefs(contestId, storage = getDefaultStorage()) {
  if (!storage || typeof storage.getItem !== 'function') {
    return { ...DEFAULT_EVOLUTION_UI_PREFS };
  }
  try {
    const raw = storage.getItem(getEvolutionPrefsStorageKey(contestId));
    if (!raw) return { ...DEFAULT_EVOLUTION_UI_PREFS };
    return sanitizeEvolutionUiPrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_EVOLUTION_UI_PREFS };
  }
}

export function writeEvolutionUiPrefs(contestId, prefs, storage = getDefaultStorage()) {
  if (!storage || typeof storage.setItem !== 'function') return false;
  try {
    const sanitized = sanitizeEvolutionUiPrefs(prefs);
    storage.setItem(getEvolutionPrefsStorageKey(contestId), JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}
