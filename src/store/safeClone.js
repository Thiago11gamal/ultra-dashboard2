/**
 * Utilitário de clonagem estrutural ultra-resiliente.
 * Protege a store contra DataCloneError limpando objetos não-serializáveis.
 */
function customDeepClone(obj, seen = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (seen.has(obj)) return seen.get(obj);
  
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
  
  if (typeof ArrayBuffer !== 'undefined' && (obj instanceof ArrayBuffer || ArrayBuffer.isView(obj))) return obj;
  if (typeof Blob !== 'undefined' && obj instanceof Blob) return obj;
  if (typeof File !== 'undefined' && obj instanceof File) return obj;
  
  if (obj instanceof Map) {
    const map = new Map();
    seen.set(obj, map);
    obj.forEach((value, key) => map.set(key, customDeepClone(value, seen)));
    return map;
  }
  if (obj instanceof Set) {
    const set = new Set();
    seen.set(obj, set);
    obj.forEach(value => set.add(customDeepClone(value, seen)));
    return set;
  }
  
  if (Array.isArray(obj)) {
    const arr = [];
    seen.set(obj, arr);
    obj.forEach((item, i) => {
      arr[i] = customDeepClone(item, seen);
    });
    return arr;
  }
  
  const cloned = {};
  seen.set(obj, cloned);
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = customDeepClone(obj[key], seen);
    }
  }
  return cloned;
}

export function safeClone(value, fallback = null) {
  try {
    return structuredClone(value);
  } catch (e) {
    console.warn("structuredClone failed, falling back to customDeepClone", e);
    try {
      return customDeepClone(value);
    } catch (e2) {
      console.error("Total clone failure", e2);
      // ✅ FIX: Retornar objeto/array vazio em vez de null
      // para evitar crashes em spread operators e property access
      if (fallback !== null) return fallback;
      if (Array.isArray(value)) return [];
      if (value && typeof value === 'object') return {};
      return null;
    }
  }
}
