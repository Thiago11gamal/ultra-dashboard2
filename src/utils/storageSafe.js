const QUARANTINE_PREFIX = 'quarantine:';
const QUARANTINE_MAX_ENTRIES = 10;
const QUARANTINE_MAX_CHARS = 50_000;

export function quarantineRaw(key, raw, reason = null) {
  try {
    if (typeof localStorage === 'undefined') return;
    // Evita esgotamento da quota do localStorage por quarentenas antigas acumuladas
    const existingKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(QUARANTINE_PREFIX)) existingKeys.push(k);
    }
    if (existingKeys.length >= QUARANTINE_MAX_ENTRIES) {
      const getTs = (qKey) => Number(qKey.split(':').pop()) || 0;
      existingKeys.sort((a, b) => getTs(a) - getTs(b));
      const toRemove = existingKeys.length - QUARANTINE_MAX_ENTRIES + 1;
      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(existingKeys[i]);
      }
    }
    const safeRaw = String(raw ?? '').slice(0, QUARANTINE_MAX_CHARS);
    const qKey = `${QUARANTINE_PREFIX}${key}:${Date.now()}`;
    localStorage.setItem(qKey, safeRaw);
    console.warn(`[Storage] Dado corrompido em quarentena: ${qKey}`, reason);
  } catch (err) {
    console.error('[Storage] Falha ao criar quarentena', err);
  }
}

export function safeGetJSON(key, fallback = null, validator = null) {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof validator === 'function' && !validator(parsed)) {
      console.warn(`[Storage] Validação falhou para ${key}, usando fallback`);
      quarantineRaw(key, raw, 'Schema validation failed');
      try { localStorage.removeItem(key); } catch { /* ignore */ }
      return fallback;
    }
    return parsed;
  } catch (err) {
    if (raw != null) quarantineRaw(key, raw, err);
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    return fallback;
  }
}

export function safeSetJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[Storage] Falha ao salvar ${key}`, err);
    return false;
  }
}

export function markStorageDirty() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ultra-sync-dirty', 'true');
    }
    return true;
  } catch (err) {
    console.warn('[Storage] Falha ao marcar ultra-sync-dirty:', err);
    return false;
  }
}

const SESSION_CLEANUP_EXACT_KEYS = [
  'ultra-dashboard-storage',
  'ultra-dashboard-storage:meta',
  'ultra-sync-dirty',
  'pomodoroState',
  'pomodoro-endsAt',
  'pomodoro_muted',
  'pomodoro_study_mode_v1',
  'tasks_active_panel',
  'dismissed_feature_banner_v1',
  'focusPanelLocked',
  'pomodoroLayoutLocked',
  'ultra_local_session',
  'coach_calibration_events_v1',
  'coach_flag_optimizer_state_v1',
  'coach_causal_model_v1',
  'coach_auto_tuner_history_v1',
  'coach_evaluation_results_v1',
  'coach_model_health_v1',
  'coach_strategy_backtest_v1',
  'coach_decision_bandit_v1',
  'coach_control_center_state_v1',
  'hasSeenWelcomeScreen',
  'navigateToDashboard',
  'page-has-been-force-refreshed',
  'ultra-last-activity',
  'ultra_category_tombstones',
  'pomodoroSideTab',
  'focusPanelPosition',
  'coach_active_flags_v1',
  'coach_features_v1',
  'coach_manual_flag_overrides_v1',
];

const LOCAL_CLEANUP_PREFIXES = [
  'ai_simulado_draft:',
  'ai_simulado_generating:',
  'coach_features_v1::',
  'coach_active_flags_v1:',
  'coach_manual_flag_overrides_v1:',
  'coach_control_center_state_v1:',
  'coach_calibration_events_v1::',
  'coach_flag_optimizer_state_v1:',
  'coach_causal_model_v1:',
  'coach_auto_tuner_history_v1:',
  'coach_evaluation_results_v1:',
  'coach_model_health_v1:',
  'coach_strategy_backtest_v1:',
  'coach_decision_bandit_v1:',
  'pomodoro_transition_lock_',
  'lastRoute_',
  'quarantine:',
];

const SESSION_CLEANUP_PREFIXES = [
  'ai_simulado_',
  'evolution_ui_prefs_v1:',
  'hasRestoredInitialRoute_',
];

export function clearClientSessionKeys() {
  SESSION_CLEANUP_EXACT_KEYS.forEach((key) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch { /* ignore */ }
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
    } catch { /* ignore */ }
  });

  try {
    if (typeof localStorage !== 'undefined') {
      Object.keys(localStorage).forEach((k) => {
        if (LOCAL_CLEANUP_PREFIXES.some((prefix) => k.startsWith(prefix))) {
          localStorage.removeItem(k);
        }
      });
    }
  } catch { /* ignore */ }

  try {
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((k) => {
        if (SESSION_CLEANUP_PREFIXES.some((prefix) => k.startsWith(prefix))) {
          sessionStorage.removeItem(k);
        }
      });
    }
  } catch { /* ignore */ }
}
