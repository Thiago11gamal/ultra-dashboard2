/**
 * coachSafe.js
 *
 * Utilitários de segurança e normalização numérica.
 * Base para todos os módulos do Coach.
 */

export function safeArray(value) {
  if (Array.isArray(value)) return value;
  // FIX: proteger contra objetos com prototype poluído ou frozen objects
  if (value && typeof value === 'object') {
    try { return Object.values(value); }
    catch { return []; }
  }
  return [];
}

export function safeClone(value) {
  if (value === null || typeof value !== 'object') return value;

  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch {
    // fallback abaixo
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    if (Array.isArray(value)) return [];
    return {};
  }
}

export function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;

  // BUG: formato BR com vírgula ("85,5") virava NaN.
  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (!cleaned) return fallback;
    // FIX (BUG-06): múltiplas vírgulas = formato inválido
    const commaCount = (cleaned.match(/,/g) || []).length;
    if (commaCount > 1) return fallback;
    // FIX (BUG-06): vírgula seguida de exatamente 3 dígitos no final = milhar (ex: "1,234")
    if (/,\d{3}$/.test(cleaned) && !cleaned.includes('.')) {
      value = cleaned.replace(/,/g, '');
    } else {
      value = cleaned.replace(/\./g, '').replace(',', '.');
    }
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// FIX (BUG-31): valida min/max (troca se invertidos) e trata Infinity no value/fallback
export function clampFinite(value, min, max, fallback = min) {
  let safeMin = Number(min);
  let safeMax = Number(max);
  if (!Number.isFinite(safeMin)) safeMin = 0;
  if (!Number.isFinite(safeMax)) safeMax = safeMin;
  if (safeMin > safeMax) {
    const tmp = safeMin;
    safeMin = safeMax;
    safeMax = tmp;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    const fb = Number(fallback);
    return Number.isFinite(fb)
      ? Math.min(safeMax, Math.max(safeMin, fb))
      : safeMin;
  }
  return Math.min(safeMax, Math.max(safeMin, n));
}

export function getCalibrationKey(id) {
  return String(id ?? '').trim().toLowerCase();
}

// PATCH: normalização NFC para caracteres acentuados
export function hashString(str) {
  let h = 0x811c9dc5;
  const s = str === null || str === undefined
    ? ''
    : typeof str === 'object'
      ? JSON.stringify(str)
      : String(str);
  const normalized = s.normalize('NFC');
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// PATCH-NOVO (BUG-32): hash de 64 bits (dois FNV combinados) para cache keys críticas
export function hashString64(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const s = str === null || str === undefined
    ? ''
    : typeof str === 'object'
      ? JSON.stringify(str)
      : String(str);
  const normalized = s.normalize('NFC');
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x85ebca6b);
  }
  // ✅ FIX: garantir padding de zero à esquerda para hashes curtos (manter tamanho constante)
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return hex1 + hex2;
}

// Variantes estritas: rejeitam null/undefined/''/boolean
// (semântica exigida pelo coachEvaluator — antes duplicada localmente).
export function toFiniteStrict(value, fallback = null) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  // FIX: tratar string com vírgula decimal
  if (typeof value === 'string') {
    const cleaned = (value.includes(',') ? value.trim().replace(/\./g, '').replace(',', '.') : value.trim());
    if (cleaned === '' || cleaned === '-') return fallback;
    value = cleaned;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clampFiniteStrict(value, min, max, fallback = min) {
  const n = toFiniteStrict(value, null);
  if (n === null) return fallback;
  return Math.min(max, Math.max(min, n));
}
