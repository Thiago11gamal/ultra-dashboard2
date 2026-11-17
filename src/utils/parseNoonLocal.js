import { normalizeDate, getDateKey, createNoonInTimezone } from './dateHelper.js';

export function parseNoonLocal(input) {
  if (input == null) return null;
  try {
    const key = getDateKey(input);
    if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
      const [y, m, d] = key.split('-').map(Number);
      const dt = createNoonInTimezone(y, m, d);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
    const fallback = normalizeDate(input);
    if (!fallback || Number.isNaN(fallback.getTime())) return null;
    return fallback;
  } catch {
    return null;
  }
}

export function addDaysNoon(date, days) {
  const baseNoon = parseNoonLocal(date);
  if (!baseNoon) return null;
  const key = getDateKey(baseNoon);
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  const deltaDays = Math.round(Number(days) || 0);
  const shifted = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0, 0));
  const result = createNoonInTimezone(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
  return Number.isNaN(result.getTime()) ? null : result;
}
