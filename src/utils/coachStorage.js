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
  if (!storage || typeof key !== 'string' || key.length === 0) return false;
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

          // BUG: se evictable vazio, nada era removido e o loop repetia até falhar.
          const candidates = evictable.length > 0
            ? evictable
            : coachKeys.filter(k => k !== key);

          if (candidates.length === 0) return false;

          const pickLargest = (keys) => keys.reduce((biggest, k) => {
            const biggestSize = storage.getItem(biggest)?.length || 0;
            const currentSize = storage.getItem(k)?.length || 0;
            return currentSize > biggestSize ? k : biggest;
          }, keys[0]);

          const largest = pickLargest(candidates);

          // FIX (BUG-10): se o maior item é o próprio alvo, remover o segundo maior
          const target = (largest === key)
            ? candidates.filter(k => k !== key).reduce((biggest, k) => {
                const bs = storage.getItem(biggest)?.length || 0;
                const cs = storage.getItem(k)?.length || 0;
                return cs > bs ? k : biggest;
              }, null)
            : largest;
          if (target) storage.removeItem(target);
        } catch {
          return false;
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

