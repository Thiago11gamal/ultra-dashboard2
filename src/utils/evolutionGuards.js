export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

export function getHistoryDate(h) {
  return h?.date || h?.createdAt || null;
}

export function isValidScore(value) {
  return value != null && Number.isFinite(Number(value));
}

export function normalizeScoreDomain(minScore, maxScore) {
  const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  let safeMax = Number.isFinite(Number(maxScore)) ? Number(maxScore) : 100;

  if (safeMax <= safeMin) {
    safeMax = safeMin + 1;
  }

  const range = Math.max(1e-9, safeMax - safeMin);

  const clamp = (value, fallback = safeMin) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(safeMin, Math.min(safeMax, n));
  };

  return { safeMin, safeMax, range, clamp };
}

export function normalizeTargetScore(targetScore, minScore, maxScore) {
  const { safeMin, safeMax } = normalizeScoreDomain(minScore, maxScore);
  const target = Number(targetScore);

  if (!Number.isFinite(target)) return safeMin;

  return Math.max(safeMin, Math.min(safeMax, target));
}

export function normalizeProbability(value, fallback = 0) {
  let n = Number(value);

  if (!Number.isFinite(n)) return fallback;

  if (n > 0 && n <= 1) {
    n = n * 100;
  }

  return Math.max(0, Math.min(100, n));
}

export function simpleHash(str) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
