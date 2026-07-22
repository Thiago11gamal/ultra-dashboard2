/**
 * Utilitário de clonagem estrutural ultra-resiliente.
 * Protege a store contra DataCloneError limpando objetos não-serializáveis.
 */
export function safeClone(value, fallback = null) {
  try {
    return structuredClone(value);
  } catch (e) {
    console.warn("structuredClone failed, falling back to JSON", e);
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e2) {
      console.error("Total clone failure", e2);
      return fallback;
    }
  }
}
