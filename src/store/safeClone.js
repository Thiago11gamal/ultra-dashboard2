/**
 * Utilitário de clonagem estrutural ultra-resiliente.
 * Protege a store contra DataCloneError limpando objetos não-serializáveis.
 */
export function safeClone(value, fallback = null) {
  if (value === null || value === undefined) return value;

  // Função interna para encontrar o caminho do objeto problemático
  const findOffendingPath = (obj, path = 'root', seen = new WeakSet()) => {
    if (obj === null || typeof obj !== 'object') return null;
    if (obj instanceof Date || obj instanceof RegExp) return null;
    if (seen.has(obj)) return null;
    seen.add(obj);

    if (obj === window) return `${path} (is Window)`;
    if (typeof Event !== 'undefined' && obj instanceof Event) return `${path} (is Event)`;
    if (typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement) return `${path} (is HTMLElement)`;
    if (typeof Node !== 'undefined' && obj instanceof Node) return `${path} (is DOM Node)`;

    for (const key in obj) {
      try {
        const result = findOffendingPath(obj[key], `${path}.${key}`, seen);
        if (result) return result;
      } catch {
        return `${path}.${key} (Access Error)`;
      }
    }
    return null;
  };

  try {
    // Tenta o clone nativo de alta performance
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    throw new Error('structuredClone not available');
  } catch (error) {
    const offendingPath = findOffendingPath(value);
    console.warn(`[SafeClone] Objeto não-serializável detectado em: ${offendingPath || 'unknown'}. Aplicando limpeza JSON.`, error);

    try {
      const seen = new WeakSet();
      const sanitized = JSON.parse(JSON.stringify(value, function(key, val) {
        if (typeof val === 'function' || typeof val === 'symbol') return undefined;
        
        // Proteção contra Window, Event e DOM
        if (val === window || 
            (typeof Event !== 'undefined' && val instanceof Event) || 
            (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement) ||
            (typeof Node !== 'undefined' && val instanceof Node)) {
          return undefined;
        }

        if (val && typeof val === 'object') {
          if (seen.has(val)) return undefined; // Corta a referência circular silenciosamente
          seen.add(val);
          
          // PROTEÇÃO ADICIONAL: Referências internas do React que podem vazar para o estado
          if (key === '_reactInternalInstance' || key === '_reactFiber' || key === 'ref') {
            return undefined;
          }
        }
        return val;
      }));
      return sanitized;
    } catch (jsonError) {
      console.error('[SafeClone] Falha crítica ao clonar objeto. Usando fallback.', jsonError);
      return fallback;
    }
  }
}
