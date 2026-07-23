export const safeDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
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
