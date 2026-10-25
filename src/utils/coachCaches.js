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
  if (!entry) return null;

  // BUG: timestamp inválido virava cache eterno.
  if (!Number.isFinite(entry.timestamp) || Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  // LRU: mover para o fim
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

export function cacheSet(cache, maxSize, key, value) {
  if (cache.size >= maxSize) {
    const now = Date.now();
    // BUG: remover chaves durante iteração pode ser instável em alguns engines.
    const expired = [];
    for (const [k, v] of cache.entries()) {
      if (!v || !Number.isFinite(v.timestamp) || now - v.timestamp > CACHE_TTL_MS) {
        expired.push(k);
      }
    }
    expired.forEach(k => cache.delete(k));

    // Se ainda cheio, remover LRU
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
  }

  cache.set(key, { value, timestamp: Date.now() });
}

export const _topicsCache = new Map();
export const clearTopicsCache = () => _topicsCache.clear();

export const clearCoachCaches = () => {
  clearUrgencyCache();
  clearTopicsCache();
};
