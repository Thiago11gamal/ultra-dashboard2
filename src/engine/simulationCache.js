export const simulationCache = new Map();
const MAX_CACHE_SIZE = 1000;

export function getCachedSimulation(seed) {
  return simulationCache.get(seed);
}

export function setCachedSimulation(seed, result) {
  if (simulationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = simulationCache.keys().next().value;
    simulationCache.delete(firstKey);
  }
  simulationCache.set(seed, result);
}

export function clearSimulationCache() {
  simulationCache.clear();
}
