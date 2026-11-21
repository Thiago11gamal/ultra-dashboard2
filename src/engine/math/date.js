export const safeDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [y, m, d] = value.trim().split('-').map(Number);
    const localDate = new Date(y, m - 1, d, 12, 0, 0, 0);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

export const getLocalMidnight = (date = new Date()) => {
  const d = safeDate(date) || new Date();

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0,
    0,
    0,
    0
  );
};

export const getLocalEndOfDay = (date = new Date()) => {
  const d = safeDate(date) || new Date();

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999
  );
};

export const isSameLocalDay = (a, b) => {
  const da = safeDate(a);
  const db = safeDate(b);

  if (!da || !db) return false;

  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

export const daysBetween = (a, b) => {
  const da = safeDate(a);
  const db = safeDate(b);

  if (!da || !db) return NaN;

  const ms = db.getTime() - da.getTime();

  return ms / 86400000;
};

export const ageInDays = (date, reference = new Date()) => {
  const d = safeDate(date);
  const ref = safeDate(reference);

  if (!d || !ref) return 0;

  const days = (ref.getTime() - d.getTime()) / 86400000;

  return Number.isFinite(days) && days > 0 ? days : 0;
};

export const ageInHours = (date, reference = new Date()) => {
  const d = safeDate(date);
  const ref = safeDate(reference);

  if (!d || !ref) return 0;

  const hours = (ref.getTime() - d.getTime()) / 3600000;

  return Number.isFinite(hours) && hours > 0 ? hours : 0;
};

const toCalendarUtcNoonMs = (value, timeZone = 'America/Manaus') => {
  if (!value) return NaN;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      const utc = Date.UTC(y, m - 1, d, 12, 0, 0, 0);
      const check = new Date(utc);
      if (check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d) {
        return utc;
      }
      return NaN;
    }
  }
  let parsed = null;
  if (typeof value === 'object' && value !== null && Number.isFinite(value.seconds)) {
    parsed = new Date(value.seconds * 1000);
  } else {
    parsed = safeDate(value);
  }
  if (!parsed || Number.isNaN(parsed.getTime())) return NaN;
  try {
    const key = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(parsed);
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      const [y, m, d] = key.split('-').map(Number);
      return Date.UTC(y, m - 1, d, 12, 0, 0, 0);
    }
  } catch {
    // fallback abaixo
  }
  return Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0);
};

export const daysUntilGoal = (goalDate, { fallback = 30, min = 1, referenceDate = new Date(), timeZone = 'America/Manaus' } = {}) => {
  if (!goalDate) return fallback;
  const nowUtcNoon = toCalendarUtcNoonMs(referenceDate, timeZone);
  const goalUtcNoon = toCalendarUtcNoonMs(goalDate, timeZone);

  if (!Number.isFinite(nowUtcNoon) || !Number.isFinite(goalUtcNoon)) return fallback;

  const diffDays = Math.round((goalUtcNoon - nowUtcNoon) / 86400000);
  if (!Number.isFinite(diffDays)) return fallback;

  // BUG: datas passadas retornavam min (1), mascarando meta vencida.
  if (diffDays < 0) return 0;

  const safeDays = diffDays >= min ? diffDays : min;
  return Math.min(3650, safeDays);
};

