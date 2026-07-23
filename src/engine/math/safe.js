export const isFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value);

export const parseNumericString = (value) => {
  if (typeof value === 'number') return value;

  if (typeof value !== 'string') return NaN;

  const trimmed = value.trim();

  if (!trimmed) return NaN;

  // Formato pt-BR: 1.234,56
  if (trimmed.includes(',')) {
    const normalized = trimmed.replace(/\./g, '').replace(',', '.');
    return Number(normalized);
  }

  // Se tem múltiplos pontos: 1.234.567 -> 1234567
  const parts = trimmed.split('.');

  if (parts.length > 2) {
    return Number(parts.join(''));
  }

  // Se tem um ponto e exatamente 3 casas decimais, tratar como milhar:
  // 1.234 -> 1234
  if (parts.length === 2) {
    const integerPart = parts[0];
    const decimalPart = parts[1];

    if (integerPart.length > 0 && decimalPart.length === 3) {
      return Number(integerPart + decimalPart);
    }
  }

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

export const normalizeProbability = (value) => {
  const p = toFinite(value, NaN);

  if (!Number.isFinite(p)) return NaN;

  if (p >= 0 && p <= 1) return p;

  if (p > 1 && p <= 100) return p / 100;

  return clamp(p, 0, 1);
};

export const normalizePercent = (value, fallback = 0) => {
  const p = normalizeProbability(value);

  if (!Number.isFinite(p)) return fallback;

  return clamp(p * 100, 0, 100);
};
