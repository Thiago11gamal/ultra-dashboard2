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

function normalizeNumericString(raw) {
  const cleaned = raw.trim();
  if (!cleaned || cleaned === '-' || cleaned === '+') return null;

  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Formato BR com milhar e decimal: "1.234,56"
      return cleaned.replace(/\./g, '').replace(',', '.');
    }
    // Formato US com milhar e decimal: "1,234.56"
    return cleaned.replace(/,/g, '');
  }

  if (commaCount === 1) {
    // FIX (BUG-06): vírgula seguida de exatamente 3 dígitos no final = milhar US (ex: "1,234")
    if (/^-?\d{1,3},\d{3}$/.test(cleaned)) {
      return cleaned.replace(/,/g, '');
    }
    return cleaned.replace(',', '.');
  }

  if (commaCount > 1) {
    if (/^-?\d{1,3}(,\d{3})+$/.test(cleaned)) {
      return cleaned.replace(/,/g, '');
    }
    return null;
  }

  // commaCount === 0: preservar decimais padrão com ponto ("85.5", "0.25", "-12.5")
  if (dotCount <= 1) {
    return cleaned;
  }

  if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return cleaned.replace(/\./g, '');
  }

  return null;
}

export function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;

  // BUG: formato BR com vírgula ("85,5") virava NaN e decimais padrão ("85.5") perdiam o ponto.
  if (typeof value === 'string') {
    const normalized = normalizeNumericString(value);
    if (normalized === null) return fallback;
    value = normalized;
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
  const n = toFiniteNumber(value, NaN);
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

function safeStringifyForHash(str) {
  if (str === null || str === undefined) return '';
  if (typeof str === 'object') {
    try {
      return JSON.stringify(str);
    } catch {
      return '[UnserializableObject]';
    }
  }
  return String(str);
}

// PATCH: normalização NFC para caracteres acentuados
export function hashString(str) {
  let h = 0x811c9dc5;
  const s = safeStringifyForHash(str);
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
  const s = safeStringifyForHash(str);
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
  if (typeof value === 'string') {
    const normalized = normalizeNumericString(value);
    if (normalized === null) return fallback;
    value = normalized;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clampFiniteStrict(value, min, max, fallback = min) {
  let safeMin = Number(min);
  let safeMax = Number(max);
  if (!Number.isFinite(safeMin)) safeMin = 0;
  if (!Number.isFinite(safeMax)) safeMax = safeMin;
  if (safeMin > safeMax) {
    const tmp = safeMin;
    safeMin = safeMax;
    safeMax = tmp;
  }
  const n = toFiniteStrict(value, null);
  if (n === null) return fallback;
  return Math.min(safeMax, Math.max(safeMin, n));
}
