/**
 * coachStorage.js
 * Wrapper seguro para localStorage com tratamento de quota.
 */
function getStorage() {
  try { return globalThis?.localStorage || null; }
  catch { return null; }
}

const EVICTABLE_PREFIXES = [
  'coach_calibration_events',
  'coach_health_snapshots',
  'coach_evaluation_results',
  'coach_tuner_history',
  'coach_backtest_report'
];

export function safeSetItem(key, value) {
  const storage = getStorage();
  if (!storage) return false;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    storage.setItem(key, serialized);
    return true;
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      console.warn(`[CoachStorage] Quota excedida ao salvar "${key}". Tentando limpeza.`);
      try {
        const coachKeys = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith('coach_')) coachKeys.push(k);
        }
        const evictable = coachKeys.filter(k =>
          EVICTABLE_PREFIXES.some(prefix => k.startsWith(prefix))
        );
        if (evictable.length > 0) {
          evictable.forEach(k => storage.removeItem(k));
        } else if (coachKeys.length > 0) {
          storage.removeItem(coachKeys[0]);
        }
        if (coachKeys.length > 0) {
          storage.setItem(key, serialized);
          return true;
        }
      } catch { /* fallback failed */ }
    }
    console.error(`[CoachStorage] Falha ao salvar "${key}":`, err?.message || String(err));
    return false;
  }
}

export function safeGetItem(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    return storage.getItem(key) ?? fallback;
  } catch { return fallback; }
}

export function safeGetJSON(key, fallback = null) {
  const raw = safeGetItem(key, null);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); }
  catch { return fallback; }
}

export function safeRemoveItem(key) {
  const storage = getStorage();
  if (!storage) return;
  try { storage.removeItem(key); } catch { /* ignore */ }
}

