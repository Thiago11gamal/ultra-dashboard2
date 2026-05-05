/**
 * Generates a robust unique ID with a prefix
 * format: prefix-timestamp-random
 */
export const generateId = (prefix = 'id') => {
    return `${prefix}-${crypto.randomUUID()}`;
};

/**
 * Returns a stable ID for a task, using its ID if present, 
 * or a content-based hash if not.
 */
export const getSafeId = (task) => {
    if (typeof task === 'string') return task;
    if (task?.id) return String(task.id);
    const text = task?.text || task?.title || "sem-nome";
    return `task-fb-${text.replace(/\s+/g, '').substring(0, 15)}`;
};
