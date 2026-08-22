import { addDays } from 'date-fns';

export const APP_TIMEZONE = 'America/Manaus';

export const safeDateParse = (dateInput, fallback = null) => {
  if (!dateInput) return fallback;
  const normalizedString = typeof dateInput === 'string'
    ? dateInput.replace(' ', 'T')
    : dateInput;
  const d = new Date(normalizedString);
  return isNaN(d.getTime()) ? fallback : d;
};

export function parseGoalDateUnified(value) {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string') {
        // Formato yyyy-mm-dd
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] = value.split('-').map(Number);

            const date = new Date(year, month - 1, day, 12, 0, 0, 0);

            return Number.isNaN(date.getTime()) ? null : date;
        }

        // Se for datetime sem T, tenta normalizar
        const normalized = value.includes('T')
            ? value
            : `${value}T12:00:00`;

        const date = new Date(normalized);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const fallback = new Date(value);

    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export const getDateKey = (rawDate) => {
  if (!rawDate) return new Date().toISOString().split('T')[0];
  try {
    const d = normalizeDate(rawDate) || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

export const getLocalMidnight = (date = new Date()) => {
  try {
    const dateKey = getDateKey(date);
    if (!dateKey) {
      // Fallback: extrair componentes UTC e ancorar em Manaus (UTC-4)
      const utc = new Date(date);
      return new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()) + 4 * 3600000);
    }
    // ✅ FIX: Offset fixo de Manaus (-04:00) em vez de timezone local
    // eslint-disable-next-line no-restricted-syntax
    return new Date(`${dateKey}T00:00:00-04:00`);
  } catch {
    const utc = new Date(date);
    return new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()) + 4 * 3600000);
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

export const normalizeDate = (raw) => {
  if (!raw) return null;
  let d;
  const isDateOnly = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw);
  
  if (typeof raw === 'object' && (raw.seconds != null || raw._seconds != null)) {
    const secs = raw.seconds != null ? raw.seconds : raw._seconds;
    d = new Date(secs * 1000);
  } else if (typeof raw === 'string' && raw.includes('/')) {
    const parts = raw.split(/[/-]/);
    if (parts.length >= 3 && parts[0].length <= 2 && parts[2].length === 4) {
      // ✅ FIX: Ancora ao meio-dia de Manaus
      // eslint-disable-next-line no-restricted-syntax
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00-04:00`);
    } else {
      d = new Date(raw);
    }
  } else if (typeof raw === 'string') {
    // ✅ FIX: Strings YYYY-MM-DD ancoradas ao meio-dia de Manaus
    // eslint-disable-next-line no-restricted-syntax
    d = isDateOnly ? new Date(`${raw}T12:00:00-04:00`) : new Date(raw);
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
  if (Number.isNaN(timeMs)) return 'Data inválida';
  
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
  
  if (minutes >= 60) {
    hours += 1;
    minutes = 0;
  }
  
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
   const future = addDays(new Date(), safeDays);
   const key = getDateKey(future);
   return key || getFlashcardTodayKey();
};

export const isFlashcardDue = (cardDue, referenceKey = null) => {
  if (!cardDue) return true;
  const todayKey = referenceKey || getFlashcardTodayKey();
  return cardDue <= todayKey;
};

export const parseNoonLocal = (input) => {
  if (!input) return null;
  try {
    const key = getDateKey(input);
    if (!key) {
      const fallback = normalizeDate(input);
      if (!fallback || Number.isNaN(fallback.getTime())) return null;
      fallback.setHours(12, 0, 0, 0);
      return fallback;
    }
    const [y, m, d] = key.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const fullYear = y >= 0 && y < 100 ? y + 2000 : y;
    const date = new Date(0);
    date.setFullYear(fullYear, m - 1, d);
    date.setHours(12, 0, 0, 0);
    return date;
  } catch {
    return null;
  }
};


