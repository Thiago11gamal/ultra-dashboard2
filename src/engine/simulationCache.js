export const simulationCache = new Map();
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export function getCachedSimulation(seed) {
  const entry = simulationCache.get(seed);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    simulationCache.delete(seed);
    return null;
  }
  
  // LRU bump
  simulationCache.delete(seed);
  simulationCache.set(seed, entry);
  
  return entry.value;
}

export function setCachedSimulation(seed, result) {
  if (simulationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = simulationCache.keys().next().value;
    simulationCache.delete(firstKey);
  }
  simulationCache.set(seed, { value: result, timestamp: Date.now() });
}

export function clearSimulationCache() {
  simulationCache.clear();
}
