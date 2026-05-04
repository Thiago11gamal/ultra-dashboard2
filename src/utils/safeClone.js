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
        
        try {
            // Fallback: Use JSON serialization to strip out non-serializable properties (functions, symbols, etc.)
            // We use a replacer function to explicitly detect and remove dangerous objects like Window or Events.
            return JSON.parse(JSON.stringify(obj, (key, value) => {
                if (value && typeof value === 'object') {
                    // Check for Window, Events, or DOM Nodes
                    if (value === window || value instanceof Event || (value.nodeType && value.nodeName)) {
                        return undefined;
                    }
                    
                    // Protection against React internals that might leak during state updates
                    if (key === '_reactInternalInstance' || key === '_reactFiber' || key === 'ref') {
                        return undefined;
                    }
                }
                return value;
            }));
        } catch (jsonErr) {
            console.error("[SafeClone] Falha crítica na clonagem. Retornando objeto parcial para evitar crash.", jsonErr);
            // Return a safe empty structure as last resort
            return Array.isArray(obj) ? [] : {};
        }
    }
};
