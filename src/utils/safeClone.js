export const safeClone = (value, fallback = null) => {
  if (value === null || value === undefined) return value;

  // 1) Clone nativo (preserva Date/Map/Set e resolve circulares)
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch { /* contém funções/DOM/Events → fallback */ }

  // 2) Fallback recursivo: não converte strings ISO em Date nem perde referências repetidas.
  try {
    const seen = new WeakMap();
    const clone = (current, inArray = false) => {
      if (current === null || typeof current !== 'object') {
        return inArray && (typeof current === 'function' || typeof current === 'symbol')
          ? null
          : current;
      }

      if (
        (typeof window !== 'undefined' && current === window) ||
        (typeof Event !== 'undefined' && current instanceof Event) ||
        (typeof HTMLElement !== 'undefined' && current instanceof HTMLElement) ||
        (typeof Node !== 'undefined' && current instanceof Node)
      ) {
        return inArray ? null : undefined;
      }

      if (current instanceof Date) return new Date(current.getTime());
      if (seen.has(current)) return seen.get(current);

      if (current instanceof Map) {
        const result = new Map();
        seen.set(current, result);
        current.forEach((mapValue, mapKey) => result.set(clone(mapKey), clone(mapValue)));
        return result;
      }
      if (current instanceof Set) {
        const result = new Set();
        seen.set(current, result);
        current.forEach(item => result.add(clone(item)));
        return result;
      }

      const result = Array.isArray(current) ? [] : {};
      seen.set(current, result);
      if (Array.isArray(current)) {
        for (let i = 0; i < current.length; i++) {
          result.push(clone(current[i], true));
        }
      } else {
        Object.entries(current).forEach(([key, item]) => {
          if (typeof item === 'function' || typeof item === 'symbol') return;
          const cloned = clone(item);
          if (cloned !== undefined) {
            Object.defineProperty(result, key, {
              value: cloned,
              enumerable: true,
              writable: true,
              configurable: true
            });
          }
        });
      }
      return result;
    };

    const cloned = clone(value);
    if (cloned !== undefined) return cloned;
    return Array.isArray(value) ? [] : (typeof value === 'object' ? {} : value);
  } catch (cloneError) {
    console.error('[SafeClone] Falha crítica ao clonar. Retornando fallback.', cloneError);
    if (fallback !== null) return fallback;
    return Array.isArray(value) ? [] : (typeof value === 'object' ? {} : value);
  }
};
