export const safeClone = (value) => {
  if (value == null) return value;

  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch {}

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    if (Array.isArray(value)) return [...value];
    if (typeof value === 'object') return { ...value };
    return value;
  }
};
