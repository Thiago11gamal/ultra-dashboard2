/**
 * Safe Structured Clone with automatic sanitization for non-serializable objects.
 * Prevents DataCloneError when accidentally passing Window, DOM nodes, or Events into state.
 */
export const safeStructuredClone = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    try {
        // Try the native high-performance clone first
        return structuredClone(obj);
    } catch (err) {
        console.warn("[SafeClone] Objeto não-serializável detectado. Aplicando limpeza JSON.", err);
        // BUG-FIX: inner try{} estava ausente — o catch (jsonErr) ficava solto causando SyntaxError
        try {
            return JSON.parse(JSON.stringify(obj, function(key, value) {
                if (value && typeof value === 'object') {
                    const isDangerous = value === window || value instanceof Event || (value.nodeType && value.nodeName);
                    if (isDangerous) {
                        console.error(`[SafeClone-Diag] Objeto proibido detectado na chave: "${key}". Removendo para proteger a persistência.`);
                        return undefined;
                    }
                    if (key === '_reactInternalInstance' || key === '_reactFiber' || key === 'ref') {
                        return undefined;
                    }
                }
                return value;
            }));
        } catch (jsonErr) {
            console.error("[SafeClone] Falha crítica na clonagem. Retornando objeto parcial para evitar crash.", jsonErr);
            return Array.isArray(obj) ? [] : {};
        }
    }
};
