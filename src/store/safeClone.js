/**
 * Utilitário de clonagem estrutural ultra-resiliente.
 * Protege a store contra DataCloneError limpando objetos não-serializáveis.
 */
export function safeClone(value, fallback = null) {
  try {
    // Tenta o clone nativo de alta performance
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    throw new Error('structuredClone not available');
  } catch (error) {
    try {
      const seen = new WeakSet();
      const sanitized = JSON.parse(JSON.stringify(value, (_key, val) => {
        if (typeof val === 'function' || typeof val === 'symbol') return undefined;
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return undefined;
          seen.add(val);
        }
        return val;
      }));
      console.warn('[SafeClone] Objeto não-serializável detectado. Aplicando limpeza JSON.', error);
      return sanitized;
    } catch (jsonError) {
      console.error('[SafeClone] Falha crítica ao clonar objeto. Usando fallback.', jsonError);
      return fallback;
    }
  }
}
