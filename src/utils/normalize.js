export function toArray(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.filter(v => v !== null && v !== undefined);
  if (typeof value === 'object') {
    const vals = Object.values(value).filter(v => v !== null && v !== undefined);
    return vals;
  }
  return [value];
}

export function toSafeNumber(value, fallback = 0) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toSafeString(value, fallback = '') {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (value !== null && value !== undefined) return String(value);
  return fallback;
}
