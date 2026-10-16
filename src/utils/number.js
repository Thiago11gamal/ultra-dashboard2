import { clampFinite as safeClampFinite } from './coachSafe.js';

export const clampFinite = (value, min, max, fallback = min) => {
  return safeClampFinite(value, min, max, fallback);
};

export const safePercent = (value, fallback = 0) => {
  return safeClampFinite(value, 0, 100, fallback);
};

export const safeProbability = (value, fallback = 0) => {
  return safeClampFinite(value, 0, 1, fallback);
};
