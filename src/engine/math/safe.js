export const isFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value);

export const parseNumericString = (value) => {
  if (typeof value === 'number') return value;

  if (typeof value !== 'string') return NaN;

  const trimmed = value.trim();

  if (!trimmed || /^[+-]?$/.test(trimmed) || /^\.$/.test(trimmed)) return NaN;

  // Formato pt-BR com vírgula decimal: 1.234,56 -> 1234.56
  if (trimmed.includes(',')) {
    const normalized = trimmed.replace(/\./g, '').replace(',', '.');
    return Number(normalized);
  }

  // Se tem múltiplos pontos agrupados em blocos de 3 dígitos (ex: 1.234.567 -> 1234567)
  if (/^[+-]?[1-9]\d{0,2}(\.\d{3}){2,}$/.test(trimmed)) {
    return Number(trimmed.replace(/\./g, ''));
  }

  const parts = trimmed.split('.');
  if (parts.length > 2) {
    return NaN;
  }

  // Único ponto sem vírgula é separador decimal padrão IEEE/JS ("0.125", "-0.500", "12.345")
  return Number(trimmed);
};

export const toFinite = (value, fallback = 0) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const parsed = parseNumericString(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  return fallback;
};

export const clamp = (value, min, max) => {
  const v = toFinite(value, NaN);
  const lo = toFinite(min, -Infinity);
  const hi = toFinite(max, Infinity);

  if (!Number.isFinite(v)) return lo;
  if (v < lo) return lo;
  if (v > hi) return hi;

  return v;
};

export const safeDivide = (numerator, denominator, fallback = 0) => {
  const a = toFinite(numerator, NaN);
  const b = toFinite(denominator, NaN);

  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    return fallback;
  }

  const result = a / b;

  return Number.isFinite(result) ? result : fallback;
};

export const positiveNumberOrDefault = (value, fallback = 0) => {
  const n = toFinite(value, NaN);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return n;
};

export const positiveIntegerOrDefault = (value, fallback = 0) => {
  const n = toFinite(value, NaN);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return Math.floor(n);
};

export const toArray = (value) => {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    return Object.values(value);
  }

  return [];
};

export const ensureArray = (value) => {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    return Object.values(value);
  }

  return [];
};

export const normalizeProbability = (value, unit = 'auto') => {
  const p = toFinite(value, NaN);

  if (!Number.isFinite(p)) return NaN;

  if (unit === 'prob') {
    return clamp(p, 0, 1);
  }
  if (unit === 'pct') {
    return clamp(p / 100, 0, 1);
  }

  if (p >= 0 && p <= 1) return p;

  if (p > 1 && p <= 100) return p / 100;

  return clamp(p, 0, 1);
};

export const normalizePercent = (value, fallback = 0, unit = 'auto') => {
  const p = normalizeProbability(value, unit);

  if (!Number.isFinite(p)) return fallback;

  return clamp(p * 100, 0, 100);
};

