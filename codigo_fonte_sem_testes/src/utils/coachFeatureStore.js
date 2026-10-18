/**
 * coachFeatureStore.js
 * Store singleton para feature flags com API atômica e isolamento por concurso.
 * Substitui mutação direta de globalThis.__COACH_FEATURES__.
 */

const FLAG_REGISTRY_KEY = '__COACH_FEATURE_REGISTRY__';
const ACTIVE_CONTEST_KEY = '__COACH_ACTIVE_CONTEST_ID__';

export function setCoachFeatureContestScope(contestId = 'default') {
  if (typeof globalThis === 'undefined') return;
  globalThis[ACTIVE_CONTEST_KEY] = String(contestId || 'default');
}

export function getCoachFeatureContestScope() {
  if (typeof globalThis === 'undefined') return 'default';
  return String(globalThis[ACTIVE_CONTEST_KEY] || 'default');
}

function getRegistry(contestId = getCoachFeatureContestScope()) {
  if (typeof globalThis === 'undefined') return {};
  if (!globalThis[FLAG_REGISTRY_KEY]) {
    globalThis[FLAG_REGISTRY_KEY] = Object.create(null);
  }
  const scope = String(contestId || 'default');
  if (!globalThis[FLAG_REGISTRY_KEY][scope]) {
    globalThis[FLAG_REGISTRY_KEY][scope] = Object.create(null);
  }
  return globalThis[FLAG_REGISTRY_KEY][scope];
}

/** Lê flags de forma atômica (snapshot imutável). */
export function readFlags(contestId) {
  return { ...getRegistry(contestId) };
}

/** Atualiza flags atomicamente. Retorna o novo snapshot. */
export function writeFlags(patch, contestId) {
  if (!patch || typeof patch !== 'object') return readFlags(contestId);
  const registry = getRegistry(contestId);
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    if (typeof k === 'string' && typeof v === 'boolean') {
      clean[k] = v;
    }
  }
  Object.assign(registry, clean);
  return readFlags(contestId);
}

/** Remove uma flag. */
export function removeFlag(key, contestId) {
  const registry = getRegistry(contestId);
  delete registry[key];
  return readFlags(contestId);
}

/** Substitui todas as flags (para rollback). */
export function replaceFlags(flags, contestId) {
  const registry = getRegistry(contestId);
  for (const key of Object.keys(registry)) delete registry[key];
  if (flags && typeof flags !== 'boolean' && typeof flags === 'object') {
    for (const [k, v] of Object.entries(flags)) {
      if (typeof k === 'string' && typeof v === 'boolean') registry[k] = v;
    }
  }
  return readFlags(contestId);
}

/** Lê uma flag com fallback. */
export function getFlag(key, fallback = false, contestId) {
  if (typeof key !== 'string') return fallback;
  const registry = getRegistry(contestId);
  return typeof registry[key] === 'boolean' ? registry[key] : fallback;
}
