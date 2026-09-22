import { addDays } from 'date-fns';

export const APP_TIMEZONE = 'America/Manaus';

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
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0, 0);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const normalized = value.includes('T') ? value : `${value}T12:00:00`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

// ✅ FIX BUG-09: getDateKey com suporte a YY-MM-DD e extração direta de ISO. Retorna null se data inválida ou nula.
export const getDateKey = (rawDate) => {
  if (!rawDate) return null;

  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (!trimmed) return null;
    // ISO 'YYYY-MM-DD' → extração direta
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // YY-MM-DD → previne regressão para ano 1900
    if (/^\d{2}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      const year = parseInt(parts[0], 10);
      const fullYear = year < 100 ? 2000 + year : year;
      return `${fullYear}-${parts[1]}-${parts[2]}`;
    }
  }

  if (typeof rawDate === 'object' && rawDate !== null && (rawDate.seconds || rawDate._seconds)) {
    const secs = rawDate.seconds || rawDate._seconds;
    const d = new Date(secs * 1000);
    if (Number.isNaN(d.getTime())) return null;
    const manausDate = new Date(d.getTime() - (4 * 3600000));
    const year = manausDate.getUTCFullYear();
    const month = String(manausDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(manausDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  try {
    const d = normalizeDate(rawDate);
    if (!d || Number.isNaN(d.getTime())) return null;
    const manausDate = new Date(d.getTime() - (4 * 3600000));
    const year = manausDate.getUTCFullYear();
    const month = String(manausDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(manausDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
};

export const getLocalMidnight = (date = new Date()) => {
  try {
    const dateKey = getDateKey(date);
    if (!dateKey) {
      const utc = new Date(date);
      return new Date(
        Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()) +
        4 * 3600000
      );
    }
    // ✅ FIX: Offset fixo de Manaus (-04:00)
    const isoMidnight = `${dateKey}T00:00:00-04:00`;
    return new Date(isoMidnight);
  } catch {
    const utc = new Date(date);
    return new Date(
      Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()) +
      4 * 3600000
    );
  }
};

export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'number' || (typeof dateStr === 'string' && /^\d{10,13}$/.test(dateStr.trim()))) {
    const d = new Date(Number(dateStr));
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    }
  }
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length < 3) return cleanStr;
  return `${parts[2]}/${parts[1]}`;
};

// ✅ FIX: normalizeDate com offset -04:00 para YYYY-MM-DD
export function normalizeDate(raw) {
  if (!raw) return null;
  let d;
  let isDateOnly = false;
  let normalizedRaw = raw;

  if (typeof raw === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      isDateOnly = true;
    } else if (/^\d{2}-\d{2}-\d{2}$/.test(raw)) {
      isDateOnly = true;
      const parts = raw.split('-');
      const year = parseInt(parts[0], 10);
      const fullYear = year < 100 ? 2000 + year : year;
      normalizedRaw = `${fullYear}-${parts[1]}-${parts[2]}`;
    }
  }

  if (typeof raw === "object" && (raw.seconds != null || raw._seconds != null)) {
    const secs = raw.seconds != null ? raw.seconds : raw._seconds;
    d = new Date(secs * 1000);
  } else if (typeof raw === "string" && /^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    // DD-MM-YYYY com traços (formato pt-BR)
    const parts = raw.split('-');
    const isoBr = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00-04:00`;
    d = new Date(isoBr);
  } else if (typeof raw === "string" && raw.includes("/")) {
    const parts = raw.trim().split(/[/-]/);
    if (parts.length >= 3 && parts[0].length <= 2) {
      const yearWithTime = parts[2].trim().split(/\s+/);
      const year = yearWithTime[0];
      const timePart = yearWithTime.slice(1).join(' ');
      if (year.length === 4) {
        const timeFormatted = timePart && timePart.includes(':') ? timePart : '12:00:00-04:00';
        const hasOffset = timeFormatted.includes('-') || timeFormatted.includes('+') || timeFormatted.endsWith('Z');
        const isoBr = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T${hasOffset ? timeFormatted : timeFormatted + '-04:00'}`;
        d = new Date(isoBr);
        if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
          d = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00-04:00`);
        }
      } else {
        d = new Date(raw);
      }
    } else {
      d = new Date(raw);
    }
  } else if (typeof raw === "string") {
    // ✅ FIX: YYYY-MM-DD → meio-dia de Manaus (UTC-4)
    const isoNoon = `${normalizedRaw}T12:00:00-04:00`;
    d = isDateOnly
      ? new Date(isoNoon)
      : new Date(raw);
  } else {
    d = new Date(raw);
  }

  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return d;
};

export const toDateMs = (value) => {
  if (!value) return Number.NaN;
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
    if (Math.abs(rawDiff) <= 60_000) return 'Agora há pouco';
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
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;
  return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
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
  const anchorIso = `${getDateKey(new Date())}T12:00:00-04:00`;
  const anchor = new Date(anchorIso);
  const future = addDays(anchor, safeDays);
  const key = getDateKey(future);
  return key || getFlashcardTodayKey();
};

export const isFlashcardDue = (cardDue, referenceKey = null) => {
  if (!cardDue) return true;
  const todayKey = referenceKey || getFlashcardTodayKey();
  return cardDue <= todayKey;
};


export { parseNoonLocal } from './parseNoonLocal.js';
