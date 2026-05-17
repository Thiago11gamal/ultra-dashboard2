/**
 * Generates a robust unique ID with a prefix
 * format: prefix-timestamp-random
 */
export const generateId = (prefix = 'id') => {
    return `${prefix}-${crypto.randomUUID()}`;
};

const stableIdMap = new WeakMap();

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
    const newId = `task-fb-${text.replace(/\s+/g, '').substring(0, 15)}-${crypto.randomUUID().substring(0, 8)}`;
    stableIdMap.set(task, newId);
    return newId;
};
