/**
 * Generates a robust unique ID with a prefix
 * format: prefix-timestamp-random
 */
export const generateId = (prefix = 'id') => {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `${prefix}-${crypto.randomUUID()}`;
        }
    } catch {
        // fallback below
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
};

const stableIdMap = new WeakMap();

/**
 * Returns a stable ID for a task, using its ID if present, 
 * or a stable content-based hash if not.
 */
export const getSafeId = (task) => {
    if (!task) return 'task-null-sentinel';
        if (typeof task === 'string') {
            const trimmed = task.trim();
            return trimmed.length > 0 ? trimmed : 'task-null-sentinel';
        }
            if (typeof task === 'number') {
                return Number.isFinite(task) && task !== 0 ? String(task) : 'task-null-sentinel';
            }
            if (typeof task !== 'object') {
                const str = String(task).trim();
                return str.length > 0 ? str : 'task-null-sentinel';
            }
            if (typeof task.id === 'string' && task.id.trim().length > 0) {
                return task.id.trim();
            }
            if (typeof task.id === 'number' && Number.isFinite(task.id) && task.id !== 0) {
                return String(task.id);
            }

            const text = String(task.text || task.title || 'sem-nome');
            const compactText = text.replace(/\s+/g, '');
            const contextScope = [
                task.categoryId,
                task.category || task.catName,
                task.subject,
                task.topicName || task.topic,
                task.priority,
                task.date || task.createdAt
            ].filter(Boolean).join('|');
            const hashInput = contextScope ? `${compactText}|${contextScope}` : compactText;

            const cached = stableIdMap.get(task);
            if (cached && cached.key === hashInput) {
                return cached.id;
            }

            const hash = hashInput.split('').reduce((acc, c) => {
                return ((acc << 5) - acc + c.charCodeAt(0)) | 0;
            }, 0);
            const newId = `task-fb-${compactText.substring(0, 15)}-${Math.abs(hash).toString(36).substring(0, 8)}`;
            stableIdMap.set(task, { key: hashInput, id: newId });
            return newId;
        };
