/**
 * coachCaches.js
 *
 * Independent cache maps for Coach urgency and topics calculations.
 * Separated to avoid circular dependency between useAppStore -> store slices -> coachLogic -> useAppStore.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// FIX: adicionar TTL aos caches. Antes: entradas viviam para sempre até clear(),
// causando stale data se o usuário mudasse dados sem trocar de concurso.
export const _urgencyCache = new Map();
export const clearUrgencyCache = () => _urgencyCache.clear();

export function cacheGet(cache, key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet(cache, maxSize, key, value) {
  if (cache.size >= maxSize) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { value, timestamp: Date.now() });
}

export const _topicsCache = new Map();
export const clearTopicsCache = () => _topicsCache.clear();
