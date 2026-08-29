export const safeClone = (value, cache = new WeakMap()) => {
  if (value == null) return value;
  // ✅ FIX BUG-22: Quebra loops infinitos em objetos com referências circulares
  if (typeof value === 'object' && cache.has(value)) {
    return cache.get(value);
  }

  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch {
    // fallback
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    // Retorna estrutura vazia em vez de null para evitar crash downstream
    if (Array.isArray(value)) return [];
    if (typeof value === 'object') return {};
    return value;
  }
};

