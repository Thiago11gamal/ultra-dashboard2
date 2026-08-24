export const clampFinite = (value, min, max, fallback = min) => {
  const n = Number(value);

  if (!Number.isFinite(n)) return fallback;

  return Math.min(max, Math.max(min, n));
};

export const safePercent = (value, fallback = 0) => {
  return clampFinite(value, 0, 100, fallback);
};

export const safeProbability = (value, fallback = 0) => {
  return clampFinite(value, 0, 1, fallback);
};

