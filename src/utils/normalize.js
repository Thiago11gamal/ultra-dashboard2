// src/utils/normalize.js

/**
 * Converte qualquer valor em um array seguro.
 * - null/undefined -> []
 * - Array -> cópia rasa
 * - Objeto estilo Firebase ({0:{},1:{}}) -> Object.values()
 * - Outro -> [valor]
 */
export function toArray(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return [...value];
  if (typeof value === 'object') {
    // Objeto vazio -> []
    if (Object.keys(value).length === 0) return [];
    return Object.values(value);
  }
  return [value];
}

/**
 * Garante que um valor seja um número finito, senão retorna fallback.
 */
export function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Garante que um valor seja uma string não-vazia, senão retorna fallback.
 */
export function toSafeString(value, fallback = '') {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (value !== null && value !== undefined) return String(value);
  return fallback;
}


/**
 * Remove sessões neurais duplicadas mantendo a com maior taxa de conclusão
 */
export const dedupeSubjects = (subjects = []) => {
    if (!Array.isArray(subjects)) return [];
    
    const seenMap = new Map();
    subjects.forEach(sub => {
        if (!sub || typeof sub !== 'object') return;
        
        // Critério de unicidade: taskId (primário) ou subject/text (fallback)
        const key = sub.taskId || sub.subject || sub.text;
        if (!key) return; // Ignora se não tiver nenhum identificador válido

        // Se já existe, mantemos o mais recente/com mais dados (ex: com completion rate maior)
        if (seenMap.has(key)) {
            const existing = seenMap.get(key);
            const exRate = Number.isFinite(existing.completionRate) ? existing.completionRate : 0;
            const newRate = Number.isFinite(sub.completionRate) ? sub.completionRate : 0;
            
            // Substitui se o novo tiver uma taxa de conclusão maior
            if (newRate > exRate) {
                seenMap.set(key, sub);
            }
        } else {
            seenMap.set(key, sub);
        }
    });

    return Array.from(seenMap.values());
};
