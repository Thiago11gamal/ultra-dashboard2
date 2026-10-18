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
  let serialized;
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch (err) {
    console.error(`[CoachStorage] Valor não serializável para "${key}":`, err?.message || String(err));
    return false;
  }

  let attempts = 0;
  while (attempts < 5) {
    try {
      storage.setItem(key, serialized);
      return true;
    } catch (err) {
      attempts++;
      if (err?.name === 'QuotaExceededError') {
        console.warn(`[CoachStorage] Quota excedida ao salvar "${key}". Tentando limpeza (tentativa ${attempts}).`);
        try {
          const coachKeys = [];
          for (let i = 0; i < storage.length; i++) {
            const k = storage.key(i);
            if (k && k.startsWith('coach_')) coachKeys.push(k);
          }
          const evictable = coachKeys.filter(k =>
            EVICTABLE_PREFIXES.some(prefix => k.startsWith(prefix))
          );
          const pickLargest = (keys) => keys.reduce(
            (biggest, k) => (storage.getItem(k)?.length || 0) > (storage.getItem(biggest)?.length || 0) ? k : biggest,
            keys[0]
          );
          if (evictable.length > 0) {
            storage.removeItem(pickLargest(evictable));
          } else if (coachKeys.length > 0) {
            storage.removeItem(pickLargest(coachKeys));
          } else {
            break;
          }
        } catch {
          break;
        }
      } else {
        console.error(`[CoachStorage] Falha ao salvar "${key}":`, err?.message || String(err));
        return false;
      }
    }
  }
  return false;
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

