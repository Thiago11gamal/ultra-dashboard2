export function toArray(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return [...value];
  if (typeof value === 'object') {
    if (Object.keys(value).length === 0) return [];
    return Object.values(value);
  }
  return [value];
}

export function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toSafeString(value, fallback = '') {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (value !== null && value !== undefined) return String(value);
  return fallback;
}
