# src\utils\safeClone.js

```js
export const safeClone = (value, fallback = null) => {
  if (value === null || value === undefined) return value;

  // 1) Clone nativo (preserva Date/Map/Set e resolve circulares)
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch { /* contém funções/DOM/Events → fallback */ }

  // 2) Fallback JSON com saneamento estrito
  try {
    const seen = new WeakSet();
    return JSON.parse(JSON.stringify(value, (key, val) => {
      if (typeof val === 'function' || typeof val === 'symbol') return undefined;
      if (typeof window !== 'undefined' && val === window) return undefined;
      if (typeof Event !== 'undefined' && val instanceof Event) return undefined;
      if (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement) return undefined;
      if (typeof Node !== 'undefined' && val instanceof Node) return undefined;
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return undefined; // quebra circular
        seen.add(val);
      }
      return val;
    }));
  } catch (jsonError) {
    console.error('[SafeClone] Falha crítica ao clonar. Retornando fallback.', jsonError);
    if (fallback !== null) return fallback;
    return Array.isArray(value) ? [] : (typeof value === 'object' ? {} : value);
  }
};

```
