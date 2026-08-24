/**
 * coachStorage.js
 * Wrapper seguro para localStorage com tratamento de quota.
 */
function getStorage() {
  try { return globalThis?.localStorage || null; }
  catch { return null; }
}

export function safeSetItem(key, value) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      console.warn(`[CoachStorage] Quota excedida ao salvar "${key}". Tentando limpeza.`);
      try {
        // Tenta limpar chaves antigas do Coach
        const coachKeys = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith('coach_')) coachKeys.push(k);
        }
        // Remove a mais antiga
        if (coachKeys.length > 1) {
          storage.removeItem(coachKeys[0]);
          storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          return true;
        }
      } catch { /* fallback failed */ }
    }
    console.error(`[CoachStorage] Falha ao salvar "${key}":`, err?.message);
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

