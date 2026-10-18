export const simulationCache = new Map();
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export function buildSimulationCacheKey(seed, params = null) {
  if (!params || typeof params !== 'object') return String(seed);
  const {
    targetScore = '',
    projectionDays = '',
    minScore = 0,
    maxScore = 100,
    simulations = ''
  } = params;
  return `${seed}|t:${targetScore}|d:${projectionDays}|min:${minScore}|max:${maxScore}|n:${simulations}`;
}

function cloneSimulationResult(val) {
  if (!val || typeof val !== 'object') return val;
  return {
    ...val,
    kdeData: Array.isArray(val.kdeData) ? val.kdeData.map((pt) => ({ ...pt })) : val.kdeData,
    diagnostics: val.diagnostics && typeof val.diagnostics === 'object' ? { ...val.diagnostics } : val.diagnostics,
  };
}

export function getCachedSimulation(seed, params = null) {
  const key = buildSimulationCacheKey(seed, params);
  const entry = simulationCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    simulationCache.delete(key);
    return null;
  }

  // LRU bump
  simulationCache.delete(key);
  simulationCache.set(key, entry);

  return cloneSimulationResult(entry.value);
}

export function setCachedSimulation(seed, result, params = null) {
  const key = buildSimulationCacheKey(seed, params);
  if (simulationCache.size >= MAX_CACHE_SIZE && !simulationCache.has(key)) {
    const firstKey = simulationCache.keys().next().value;
    simulationCache.delete(firstKey);
  }
  simulationCache.set(key, { value: cloneSimulationResult(result), timestamp: Date.now() });
}

export function clearSimulationCache() {
  simulationCache.clear();
}
