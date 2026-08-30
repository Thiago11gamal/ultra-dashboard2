/**
 * Generates a robust unique ID with a prefix
 * format: prefix-timestamp-random
 */
export const generateId = (prefix = 'id') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const rand = () => {
      try {
          const array = new Uint32Array(1);
          crypto.getRandomValues(array);
          return array[0].toString(36);
      } catch {
          return Math.random().toString(36).substring(2, 15);
      }
  };
  const perf = typeof performance !== 'undefined' ? performance.now().toString(36).replace('.', '') : '';
  return `${prefix}-${Date.now().toString(36)}-${perf}-${rand()}${rand()}`;
};

const stableIdMap = new WeakMap();

export function hashString(str) {
  if (typeof str !== 'string') return '0';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = Math.trunc(hash); // ✅ Força int32-like em JS, evitando overflow de float
  }
  return Math.abs(hash).toString(36) + str.length.toString(36); // Anti-colisão extra
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
    if (!task) return 'task-null';
    if (typeof task === 'string') return task;
    if (task.id) return String(task.id);
    
    if (stableIdMap.has(task)) {
        return stableIdMap.get(task);
    }
    
    const text = (task.text || task.title || task.topic || 'task').trim();
    const cat = task.subject || task.categoryId || task.category || task.subjectId || '';
    const hash = hashString(`${cat}_${text}`);
    const cleanPrefix = text.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12).toLowerCase() || 'tsk';
    const newId = `task-${cleanPrefix}-${hash}`;
    stableIdMap.set(task, newId);
    return newId;
};

export function generateLocalId() {
    // Math.random() é pseudo-aleatório fraco.
    // Combinar timestamp de alta precisão (performance.now se disponível) com random longo.
    const time = (typeof performance !== 'undefined' && performance.now) 
        ? performance.now() 
        : Date.now();
    
    // UUID v4 simplificado local (fallback) ou prefixo _loc_ (ajuda o sync a distinguir)
    return `_loc_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}_${Math.floor(time)}`;
}
