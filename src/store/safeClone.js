export function safeClone(value, fallback = null) {
  try {
    return structuredClone(value);
  } catch (error) {
    try {
      const seen = new WeakSet();
      const sanitized = JSON.parse(JSON.stringify(value, (key, val) => {
        // Detect dangerous browser globals or React internals
        if (val === window || val instanceof Event || (val && val.nodeType && val.nodeName)) {
            console.error(`[SafeClone-Diag] Objeto proibido detectado na chave: "${key}". Removendo.`);
            return undefined;
        }
        
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
      return fallback || (Array.isArray(value) ? [] : {});
    }
  }
}
