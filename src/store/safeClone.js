export function safeClone(value, fallback = null) {
  try {
    return structuredClone(value);
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
      console.error('[SafeClone] Falha ao clonar objeto. Usando fallback.', jsonError);
      return fallback;
    }
  }
}
