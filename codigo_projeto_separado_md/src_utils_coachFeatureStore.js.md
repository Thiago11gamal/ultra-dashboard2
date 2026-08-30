# src\utils\coachFeatureStore.js

```js
/**
 * coachFeatureStore.js
 * Store singleton para feature flags com API atômica.
 * Substitui mutação direta de globalThis.__COACH_FEATURES__.
 */

const FLAG_REGISTRY_KEY = '__COACH_FEATURE_REGISTRY__';

function getRegistry() {
  if (typeof globalThis === 'undefined') return {};
  if (!globalThis[FLAG_REGISTRY_KEY]) {
    globalThis[FLAG_REGISTRY_KEY] = Object.create(null);
  }
  return globalThis[FLAG_REGISTRY_KEY];
}

/** Lê flags de forma atômica (snapshot imutável). */
export function readFlags() {
  return { ...getRegistry() };
}

/** Atualiza flags atomicamente. Retorna o novo snapshot. */
export function writeFlags(patch) {
  if (!patch || typeof patch !== 'object') return readFlags();
  const registry = getRegistry();
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (typeof k === 'string' && typeof v === 'boolean') {
      clean[k] = v;
    }
  }
  Object.assign(registry, clean);
  return readFlags();
}

/** Remove uma flag. */
export function removeFlag(key) {
  const registry = getRegistry();
  delete registry[key];
  return readFlags();
}

/** Substitui todas as flags (para rollback). */
export function replaceFlags(flags) {
  const registry = getRegistry();
  for (const key of Object.keys(registry)) delete registry[key];
  if (flags && typeof flags === 'object') {
    for (const [k, v] of Object.entries(flags)) {
      if (typeof k === 'string' && typeof v === 'boolean') registry[k] = v;
    }
  }
  return readFlags();
}

/** Lê uma flag com fallback. */
export function getFlag(key, fallback = false) {
  if (typeof key !== 'string') return fallback;
  const registry = getRegistry();
  return typeof registry[key] === 'boolean' ? registry[key] : fallback;
}


```
