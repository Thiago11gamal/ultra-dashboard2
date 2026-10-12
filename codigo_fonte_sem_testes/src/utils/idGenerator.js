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
    if (!task) return 'task-null-sentinel';
    if (typeof task === 'string') return task;
    if (task.id) return String(task.id);
    
    if (stableIdMap.has(task)) {
        return stableIdMap.get(task);
    }
    
    const text = task.text || task.title || "sem-nome";
    const hash = text.replace(/\s+/g, '').split('').reduce((acc, c) => {
        return ((acc << 5) - acc + c.charCodeAt(0)) | 0;
    }, 0);
    const newId = `task-fb-${text.replace(/\s+/g, '').substring(0, 15)}-${Math.abs(hash).toString(36).substring(0, 8)}`;
    stableIdMap.set(task, newId);
    return newId;
};
