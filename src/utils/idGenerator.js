/**
 * Generates a robust unique ID with a prefix
 * format: prefix-timestamp-random
 */
export const generateId = (prefix = 'id') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  // Fallback para contextos HTTP não-secure
  const rand = () => Math.random().toString(36).substring(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand()}${rand()}`;
};

const stableIdMap = new WeakMap();

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }
  return Math.abs(hash).toString(36);
}

export function makeTaskId(catId, text) {
  const norm = (text || '').trim().toLowerCase();
  return `tsk_${catId}_${hashString(norm)}`;
}

/**
 * Returns a stable ID for a task, using its ID if present, 
 * or a stable content-based hash if not.
 */
export const getSafeId = (task) => {
    if (!task) return `task-null-${crypto.randomUUID()}`;
    if (typeof task === 'string') return task;
    if (task.id) return String(task.id);
    
    if (stableIdMap.has(task)) {
        return stableIdMap.get(task);
    }
    
    const text = task.text || task.title || "sem-nome";
    const randPart = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID().substring(0, 8)
      : Math.random().toString(36).substring(2, 10);
    const newId = `task-fb-${text.replace(/\s+/g, '').substring(0, 15)}-${randPart}`;
    stableIdMap.set(task, newId);
    return newId;
};
