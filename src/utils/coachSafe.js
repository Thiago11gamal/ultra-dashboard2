export function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

export function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function getCalibrationKey(id) {
  return String(id ?? '').trim().toLowerCase();
}

// ✅ PATCH-22: FNV-1a para melhor distribuição e menos colisões
export function hashString(str) {
  let h = 0x811c9dc5; // FNV offset basis
  const s = str === null || str === undefined
    ? ''
    : typeof str === 'object'
      ? JSON.stringify(str)
      : String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return (h >>> 0).toString(36);
}
