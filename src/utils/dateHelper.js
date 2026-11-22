import { addDays } from 'date-fns';

export const DEFAULT_APP_TIMEZONE = 'America/Manaus';
export let APP_TIMEZONE = DEFAULT_APP_TIMEZONE;

const FORMATTER_CACHE_MAX = 24;
const formatterCache = new Map();

function getCachedFormatter(timeZone, optionsKey, options) {
  const key = `${timeZone}|${optionsKey}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    if (formatterCache.size >= FORMATTER_CACHE_MAX) {
      const oldestKey = formatterCache.keys().next().value;
      if (oldestKey !== undefined) formatterCache.delete(oldestKey);
    }
    fmt = new Intl.DateTimeFormat(options.locale || 'en-CA', {
      ...options.intl,
      timeZone
    });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

export function getAppTimezone() {
  return APP_TIMEZONE;
}

export function setAppTimezone(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone.trim()) return APP_TIMEZONE;
  const candidate = timeZone.trim();
  if (candidate === 'auto' && typeof Intl !== 'undefined') {
    const resolved = Intl.DateTimeFormat().resolvedOptions()?.timeZone;
    if (resolved) {
      APP_TIMEZONE = resolved;
      return APP_TIMEZONE;
    }
  }
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: candidate }).format(new Date());
    APP_TIMEZONE = candidate;
  } catch {
    // Mantém timezone válido anterior se identificador IANA for inválido
  }
  return APP_TIMEZONE;
}

function getTimezoneOffsetMs(utcMs, timeZone = APP_TIMEZONE) {
  try {
    const fmt = getCachedFormatter(timeZone, 'parts', {
      locale: 'en-US',
      intl: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      }
    });
    const parts = fmt.formatToParts(new Date(utcMs));
    const map = {};
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].type !== 'literal') map[parts[i].type] = Number(parts[i].value);
    }
    const tzAsUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second, 0);
    return tzAsUtc - utcMs;
  } catch {
    return -4 * 3600 * 1000;
  }
}

function formatOffsetString(offsetMs) {
  const totalMinutes = Math.round(offsetMs / 60000);
  const sign = totalMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(totalMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

function isValidCalendarYMD(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const check = new Date(Date.UTC(y, m - 1, d));
  return (
    check.getUTCFullYear() === y &&
    check.getUTCMonth() === m - 1 &&
    check.getUTCDate() === d
  );
}

export function createNoonInTimezone(year, month, day, timeZone = APP_TIMEZONE) {
  const utcNoon = Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  const offsetMs = getTimezoneOffsetMs(utcNoon, timeZone);
  return new Date(utcNoon - offsetMs);
}

function formatDayKeyInTimezone(date, timeZone = APP_TIMEZONE) {
  const fmt = getCachedFormatter(timeZone, 'dayKey', {
    locale: 'en-CA',
    intl: { year: 'numeric', month: '2-digit', day: '2-digit' }
  });
  return fmt.format(date);
}

export function getManausDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return getDateKey(date);
  return formatDayKeyInTimezone(d, APP_TIMEZONE);
}

export function getStreakDateKey(date = new Date()) {
  return getManausDateKey(date);
}

const MS_PER_DAY_MANAUS = 24 * 60 * 60 * 1000;

export function getManausDayRange(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const key = Number.isNaN(d.getTime()) ? getDateKey(dateInput) : getManausDateKey(d);
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return null;
  }
  const [year, month, day] = key.split('-').map(Number);
  if (!isValidCalendarYMD(year, month, day)) return null;
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const guessStart = utcMidnight - getTimezoneOffsetMs(utcMidnight, APP_TIMEZONE);
  const start = utcMidnight - getTimezoneOffsetMs(guessStart, APP_TIMEZONE);
  const utcNextMidnight = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0);
  const guessEnd = utcNextMidnight - getTimezoneOffsetMs(utcNextMidnight, APP_TIMEZONE);
  const end = utcNextMidnight - getTimezoneOffsetMs(guessEnd, APP_TIMEZONE);
  return {
    key,
    start,
    end: end > start ? end : start + MS_PER_DAY_MANAUS
  };
}

export const safeDateParse = (dateInput, fallback = null) => {
  if (!dateInput) return fallback;
  if (typeof dateInput === 'boolean') return fallback;
  if (typeof dateInput === 'object') {
    if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? fallback : dateInput;
    if (typeof dateInput.toDate === 'function') {
      try {
        const d = dateInput.toDate();
        return (d instanceof Date && !isNaN(d.getTime())) ? d : fallback;
      } catch {
        return fallback;
      }
    }
    if (dateInput.seconds != null || dateInput._seconds != null) {
      const secs = dateInput.seconds != null ? dateInput.seconds : dateInput._seconds;
      const d = new Date(Number(secs) * 1000);
      return isNaN(d.getTime()) ? fallback : d;
    }
    return fallback;
  }
  if (typeof dateInput === 'string') {
    if (dateInput.includes('/') || /^\d{2}-\d{2}-\d{4}/.test(dateInput)) {
      const norm = normalizeDate(dateInput);
      if (norm instanceof Date && !isNaN(norm.getTime())) return norm;
    }
    const normalizedString = dateInput.replace(' ', 'T');
    const d = new Date(normalizedString);
    if (!isNaN(d.getTime())) return d;
    const norm = normalizeDate(dateInput);
    return (norm instanceof Date && !isNaN(norm.getTime())) ? norm : fallback;
  }
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? fallback : d;
};

export function parseGoalDateUnified(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'object' && value !== null) {
    if (typeof value.toDate === 'function') {
      try {
        const d = value.toDate();
        return (d instanceof Date && !Number.isNaN(d.getTime())) ? d : null;
      } catch {
        return null;
      }
    }
    if (value.seconds != null || value._seconds != null) {
      const secs = value.seconds != null ? value.seconds : value._seconds;
      const d = new Date(Number(secs) * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      if (!isValidCalendarYMD(year, month, day)) return null;
      const date = createNoonInTimezone(year, month, day, APP_TIMEZONE);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const normDate = normalizeDate(trimmed);
    return (normDate instanceof Date && !Number.isNaN(normDate.getTime())) ? normDate : null;
  }
  const fallback = normalizeDate(value) || new Date(value);
  return (fallback instanceof Date && !Number.isNaN(fallback.getTime())) ? fallback : null;
}

  // ✅ FIX BUG-09: getDateKey com suporte a YY-MM-DD e extração direta de ISO. Retorna null se data inválida ou nula.
  export const getDateKey = (rawDate) => {
    if (rawDate === null || rawDate === undefined || rawDate === '' || typeof rawDate === 'boolean') return null;

    if (typeof rawDate === 'string') {
      const trimmed = rawDate.trim();
      if (!trimmed) return null;
      // ISO 'YYYY-MM-DD' → validar calendário real antes de aceitar
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-').map(Number);
        return isValidCalendarYMD(y, m, d) ? trimmed : null;
      }
      // YY-MM-DD ou DD-MM-YY → alinhado com normalizeDate (p0 > 31 => YY-MM-DD, caso contrário DD-MM-YY)
      if (/^\d{2}-\d{2}-\d{2}$/.test(trimmed)) {
        const parts = trimmed.split('-');
        const p0 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[2], 10);
        if (p0 > 31) {
          const y = 2000 + p0;
          return isValidCalendarYMD(y, parts[1], parts[2]) ? `${y}-${parts[1]}-${parts[2]}` : null;
        }
        const y = 2000 + p2;
        return isValidCalendarYMD(y, parts[1], parts[0]) ? `${y}-${parts[1]}-${parts[0]}` : null;
      }
    }

    if (typeof rawDate === 'object' && rawDate !== null && (rawDate.seconds != null || rawDate._seconds != null)) {
      const secs = rawDate.seconds != null ? rawDate.seconds : rawDate._seconds;
      const d = new Date(secs * 1000);
      if (Number.isNaN(d.getTime())) return null;
      return formatDayKeyInTimezone(d, APP_TIMEZONE);
    }

    try {
      const d = normalizeDate(rawDate);
      if (!d || Number.isNaN(d.getTime())) return null;
      return formatDayKeyInTimezone(d, APP_TIMEZONE);
    } catch {
      return null;
    }
  };

  export const getWeekKey = (date) => {
    const dayKey = getDateKey(date);
    if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;

    const [y, m, d] = dayKey.split('-').map(Number);
    const utcCalendar = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = utcCalendar.getUTCDay();
    const diff = utcCalendar.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    utcCalendar.setUTCDate(diff);

    const wy = utcCalendar.getUTCFullYear();
    const wm = String(utcCalendar.getUTCMonth() + 1).padStart(2, '0');
    const wd = String(utcCalendar.getUTCDate()).padStart(2, '0');
    return `${wy}-${wm}-${wd}`;
  };

  export const getLocalMidnight = (date = new Date()) => {
    try {
      const parsed = normalizeDate(date) || new Date();
      const key = getDateKey(parsed);
      if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
        const [y, m, d] = key.split('-').map(Number);
        const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
        const guess = utcMidnight - getTimezoneOffsetMs(utcMidnight, APP_TIMEZONE);
        return new Date(utcMidnight - getTimezoneOffsetMs(guess, APP_TIMEZONE));
      }
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    } catch {
      const fallback = new Date();
      return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
    }
  };

  export const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr instanceof Date || typeof dateStr === 'number' || typeof dateStr === 'object' || (typeof dateStr === 'string' && /^\d{10,13}$/.test(dateStr.trim()))) {
      const key = getDateKey(dateStr);
      if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
        const [, mm, dd] = key.split('-');
        return `${dd}/${mm}`;
      }
    }
    const rawStr = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}[T\s]\d/.test(rawStr) || rawStr.endsWith('Z')) {
      const key = getDateKey(rawStr);
      if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
        const [, mm, dd] = key.split('-');
        return `${dd}/${mm}`;
      }
    }
    const cleanStr = rawStr.split(/[T\s]/)[0];
    const parts = cleanStr.split(/[/-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}`;
      if (parts[2].length === 4) return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}`;
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}`;
    }
    return cleanStr;
  };

  // ✅ FIX: normalizeDate com validação de calendário real e suporte completo a APP_TIMEZONE
  export function normalizeDate(raw) {
    if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') return null;
    if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : new Date(raw.getTime());
    let d;
    let isDateOnly = false;
    let normalizedRaw = raw;

    if (typeof raw === "string") {
      const trimmedStr = raw.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedStr)) {
        const [y, m, dayNum] = trimmedStr.split('-').map(Number);
        if (!isValidCalendarYMD(y, m, dayNum)) return null;
        isDateOnly = true;
        normalizedRaw = trimmedStr;
      } else if (/^\d{2}-\d{2}-\d{2}$/.test(trimmedStr)) {
        isDateOnly = true;
        const parts = trimmedStr.split('-');
        const p0 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[2], 10);
        let year, month, day;
        if (p0 > 31) {
          year = 2000 + p0;
          month = parts[1];
          day = parts[2];
        } else {
          year = 2000 + p2;
          month = parts[1];
          day = parts[0];
        }
        if (!isValidCalendarYMD(year, Number(month), Number(day))) return null;
        normalizedRaw = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmedStr)) {
        const [y, m, dayNum] = trimmedStr.split('/').map(Number);
        if (!isValidCalendarYMD(y, m, dayNum)) return null;
        isDateOnly = true;
        normalizedRaw = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      }
    }

    if (typeof raw === "object" && typeof raw.toDate === "function") {
      try {
        d = raw.toDate();
      } catch {
        return null;
      }
    } else if (typeof raw === "object" && (raw.seconds != null || raw._seconds != null)) {
      const secs = raw.seconds != null ? raw.seconds : raw._seconds;
      d = new Date(Number(secs) * 1000);
    } else if (typeof raw === "string" && /^\d{2}-\d{2}-\d{4}$/.test(raw.trim())) {
      // DD-MM-YYYY com traços (formato pt-BR)
      const parts = raw.trim().split('-');
      if (!isValidCalendarYMD(Number(parts[2]), Number(parts[1]), Number(parts[0]))) return null;
      d = createNoonInTimezone(parts[2], parts[1], parts[0], APP_TIMEZONE);
    } else if (typeof raw === "string" && raw.includes("/")) {
      const parts = raw.trim().split(/[/-]/);
      if (parts.length >= 3 && parts[0].length <= 2) {
        const yearWithTime = parts[2].trim().replace(',', ' ').split(/\s+/).filter(Boolean);
        const year = yearWithTime[0];
        const timePart = yearWithTime.slice(1).join(' ');
        if (year && year.length === 4 && isValidCalendarYMD(Number(year), Number(parts[1]), Number(parts[0]))) {
          const offsetStr = formatOffsetString(
            getTimezoneOffsetMs(Date.UTC(Number(year), Number(parts[1]) - 1, Number(parts[0]), 12), APP_TIMEZONE)
          );
          const timeFormatted = timePart && timePart.includes(':') ? timePart : `12:00:00${offsetStr}`;
          const hasOffset = timeFormatted.includes('-') || timeFormatted.includes('+') || timeFormatted.endsWith('Z');
          const isoBr = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T${hasOffset ? timeFormatted : timeFormatted + offsetStr}`;
          d = new Date(isoBr);
          if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
            d = createNoonInTimezone(year, parts[1], parts[0], APP_TIMEZONE);
          }
        } else if (year && year.length === 4) {
          return null;
        } else {
          d = new Date(raw);
        }
      } else if (isDateOnly && /^\d{4}-\d{2}-\d{2}$/.test(normalizedRaw)) {
        const [y, m, dayNum] = normalizedRaw.split('-').map(Number);
        d = createNoonInTimezone(y, m, dayNum, APP_TIMEZONE);
      } else {
        d = new Date(raw);
      }
    } else if (typeof raw === "string") {
      if (isDateOnly && /^\d{4}-\d{2}-\d{2}$/.test(normalizedRaw)) {
        const [y, m, dayNum] = normalizedRaw.split('-').map(Number);
        d = createNoonInTimezone(y, m, dayNum, APP_TIMEZONE);
      } else {
        d = new Date(raw);
      }
    } else {
      d = new Date(raw);
    }

    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
    return d;
  };

  export const toDateMs = (value) => {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') return Number.NaN;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return Number.NaN;
      if (value > 1e14) return Math.floor(value / 1000);
      if (value === 0 || value >= 100_000_000_000) return value;
      return value * 1000;
    }
    if (typeof value === 'string' && /^\d{10,13}$/.test(value.trim())) {
      const n = Number(value.trim());
      if (Number.isFinite(n)) {
        return value.trim().length === 10 ? n * 1000 : n;
      }
    }
    if (typeof value === 'object' && (value.seconds != null || value._seconds != null)) {
      const secs = value.seconds != null ? value.seconds : value._seconds;
      return Number(secs) * 1000;
    }
    const parsed = normalizeDate(value);
    return parsed ? parsed.getTime() : new Date(value).getTime();
  };

  export const formatTimeAgo = (date) => {
    if (!date) return 'Nunca';
    const timeMs = toDateMs(date);
    if (timeMs == null || Number.isNaN(timeMs)) return 'Data inválida';
    const rawDiff = Date.now() - timeMs;
    if (rawDiff < 0) {
      // FIX-AGO-01: tolerar skew de relógio do dispositivo (até 10 min), senão
      // registros recém-criados apareciam como "No futuro".
      if (Math.abs(rawDiff) <= 600_000) return 'Agora há pouco';
      return 'No futuro';
    }
    const diff = rawDiff;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    if (hours < 1) return 'Agora há pouco';
    if (hours < 24) return `${hours}h atrás`;
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days}d atrás`;
    // FIX-AGO-02: weeks/months eram calculados e nunca usados (mostrava "45d atrás").
    if (weeks < 5) return weeks === 1 ? 'Semana passada' : `${weeks} sem atrás`;
    if (months < 12) return months === 1 ? '1 mês atrás' : `${months} meses atrás`;
    const years = Math.floor(months / 12);
    return years === 1 ? '1 ano atrás' : `${years} anos atrás`;
  };

  export const formatDuration = (decimalHours) => {
    const safe = Number.isFinite(Number(decimalHours)) ? Number(decimalHours) : 0;
    const normalized = Math.max(0, safe);
    let hours = Math.floor(normalized);
    let minutes = Math.round((normalized - hours) * 60);
    if (minutes >= 60) { hours += 1; minutes = 0; }
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '0h00';
    return `${hours}h${String(Math.max(0, minutes)).padStart(2, '0')}`;
  };

  export const formatDatePtBR = (date) => {
    try {
      if (!date) return '--/--/----';
      const parsed = normalizeDate(date);
      if (!parsed || Number.isNaN(parsed.getTime())) return '--/--/----';
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: APP_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric'
      }).format(parsed);
    } catch {
      return '--/--/----';
    }
  };

  export const formatDateTimePtBR = (date) => {
    try {
      if (!date) return '--/--/---- --:--:--';
      const parsed = normalizeDate(date);
      if (!parsed || Number.isNaN(parsed.getTime())) return '--/--/---- --:--:--';
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: APP_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(parsed);
    } catch {
      return '--/--/---- --:--:--';
    }
  };

  export const formatWeekdayShortPtBR = (date) => {
    try {
      if (!date) return '';
      const parsed = normalizeDate(date);
      if (!parsed || Number.isNaN(parsed.getTime())) return '';
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: APP_TIMEZONE, weekday: 'short'
      }).format(parsed).replace('.', '').toUpperCase();
    } catch {
      return '';
    }
  };

  export const getFlashcardTodayKey = () => getDateKey(new Date());

  export const getFlashcardNextDueKey = (intervalDays = 1) => {
    const raw = Number(intervalDays);
    const safeDays = Number.isFinite(raw) ? Math.max(1, Math.min(3650, Math.floor(raw))) : 1;
    const todayKey = getDateKey(new Date());
    const [y, m, d] = (todayKey || '').split('-').map(Number);
    const anchor = (y && m && d) ? createNoonInTimezone(y, m, d, APP_TIMEZONE) : new Date();
    const future = addDays(anchor, safeDays);
    const key = getDateKey(future);
    return key || getFlashcardTodayKey();
  };

  export const isFlashcardDue = (cardDue, referenceKey = null) => {
    if (!cardDue) return true;
    const todayKey = referenceKey || getFlashcardTodayKey();
    const normalizedDue = getDateKey(cardDue) || String(cardDue);
    return normalizedDue <= todayKey;
  };


  export { parseNoonLocal } from './parseNoonLocal.js';
  export { daysUntilGoal } from '../engine/math/date.js';
