import { normalizeDate, getDateKey } from './dateHelper.js';

export function parseNoonLocal(input) {
  if (input == null) return null;
  try {
    const key = getDateKey(input);
    if (!key) {
      const fallback = normalizeDate(input);
      if (!fallback || Number.isNaN(fallback.getTime())) return null;
      return fallback;
    }
    const isoNoon = `${key}T12:00:00-04:00`;
    const dt = new Date(isoNoon);
    return Number.isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

export function addDaysNoon(date, days) {
  const baseNoon = parseNoonLocal(date);
  if (!baseNoon) return null;
  const deltaDays = Math.round(Number(days) || 0);
  const targetMs = baseNoon.getTime() + deltaDays * 86400000;
  const key = getDateKey(new Date(targetMs));
  if (!key) return null;
  const isoTarget = `${key}T12:00:00-04:00`;
  const result = new Date(isoTarget);
  return Number.isNaN(result.getTime()) ? null : result;
}
