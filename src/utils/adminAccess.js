/**
 * adminAccess.js
 *
 * Controle centralizado de acesso administrativo irrestrito para contas autorizadas
 * (ex.: proprietário antunest040@gmail.com e emails em VITE_ADMIN_EMAILS),
 * exigindo identidade verificada pelo provedor de autenticação Firebase.
 */
import { isLocalMode } from '../services/firebase.js';
import { DEFAULT_COACH_FEATURES } from './coachFeatures.js';
import { readFlags, writeFlags } from './coachFeatureStore.js';
import { safeGetJSON } from './coachStorage.js';

export const OWNER_ADMIN_EMAIL = 'antunest040@gmail.com';
export const MANUAL_FLAG_OVERRIDES_PREFIX = 'coach_manual_flag_overrides_v1';

/** Maps every registered Coach feature flag to enabled (`true`). */
export const ALL_UNLOCKED_COACH_FLAGS = Object.freeze(
  Object.keys(DEFAULT_COACH_FEATURES).reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {})
);

export function normalizeAdminEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Returns normalized list of authorized admin emails, always including OWNER_ADMIN_EMAIL
 * so production deploys (e.g. Vercel without .env) still recognize the owner account.
 */
export function getConfiguredAdminEmails(extraEnvValue = null) {
  const rawEnv = extraEnvValue !== null
    ? extraEnvValue
    : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_EMAILS) || '';
  const fromEnv = String(rawEnv)
    .split(',')
    .map(normalizeAdminEmail)
    .filter(Boolean);
  return Array.from(new Set([OWNER_ADMIN_EMAIL, ...fromEnv]));
}

/**
 * Ensures unverified plain objects cannot spoof an admin email.
 * Real Firebase Auth users always carry `uid` + `getIdTokenResult()`.
 */
export function isVerifiedAuthIdentity(user) {
  const isDevBypassEnv = typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEV_PREMIUM_BYPASS === 'true';
  if (isDevBypassEnv) return true;
  if (isLocalMode && user?.uid === 'local-user') return true;
  return Boolean(user?.uid && typeof user?.getIdTokenResult === 'function');
}

/** Returns true only when `user` is a verified session matching an authorized admin email. */
export function isAdminUser(user) {
  const email = normalizeAdminEmail(user?.email);
  if (!email) return false;
  if (!isVerifiedAuthIdentity(user)) return false;
  return getConfiguredAdminEmails().includes(email);
}

/** Reads local + cloud manual flag overrides scoped to `contestId`. */
export function readManualFlagOverrides(contestId = 'default', contest = null) {
  const scope = String(contestId || 'default');
  const manualKey = scope === 'default' ? MANUAL_FLAG_OVERRIDES_PREFIX : `${MANUAL_FLAG_OVERRIDES_PREFIX}:${scope}`;
  const localOverrides = safeGetJSON(manualKey, {}) || {};
  const cloudOverrides = (contest?.coachManualFlagOverrides && typeof contest.coachManualFlagOverrides === 'object')
    ? contest.coachManualFlagOverrides
    : {};
  return { ...cloudOverrides, ...localOverrides };
}

/**
 * Unlocks all Coach feature flags for the admin session in `coachFeatureStore`
 * without overriding any flag explicitly customized by the user in Control Center.
 */
export function syncAdminCoachFlags(contestId = 'default', contest = null, options = {}) {
  const scope = String(contestId || 'default');
  const respectOverrides = options.respectOverrides !== false;
  const manualOverrides = respectOverrides ? readManualFlagOverrides(scope, contest) : {};
  const current = readFlags(scope);
  const patch = {};
  let changed = false;

  for (const flagKey of Object.keys(ALL_UNLOCKED_COACH_FLAGS)) {
    if (respectOverrides && Object.prototype.hasOwnProperty.call(manualOverrides, flagKey)) {
      continue;
    }
    if (current[flagKey] !== true) {
      patch[flagKey] = true;
      changed = true;
    }
  }

  if (changed) {
    writeFlags(patch, scope, { silent: options.silent === true });
  }
  return {
    changed,
    appliedPatch: patch,
    finalFlags: readFlags(scope),
  };
}

export default {
  OWNER_ADMIN_EMAIL,
  ALL_UNLOCKED_COACH_FLAGS,
  normalizeAdminEmail,
  getConfiguredAdminEmails,
  isVerifiedAuthIdentity,
  isAdminUser,
  readManualFlagOverrides,
  syncAdminCoachFlags,
};
