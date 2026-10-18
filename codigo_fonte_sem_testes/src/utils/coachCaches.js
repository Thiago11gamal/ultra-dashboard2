/**
 * coachCaches.js
 *
 * Independent cache maps for Coach urgency and topics calculations.
 * Separated to avoid circular dependency between useAppStore -> store slices -> coachLogic -> useAppStore.
 */

export const _urgencyCache = new Map();
export const clearUrgencyCache = () => _urgencyCache.clear();

export const _topicsCache = new Map();
export const clearTopicsCache = () => _topicsCache.clear();
