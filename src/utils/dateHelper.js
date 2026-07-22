import { addDays } from 'date-fns';

export const APP_TIMEZONE = 'America/Manaus';

export const safeDateParse = (dateInput) => {
  if (!dateInput) return new Date(0);
  const normalizedString = typeof dateInput === 'string'
    ? dateInput.replace(' ', 'T')
    : dateInput;
  const d = new Date(normalizedString);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

export const parseGoalDateUnified = (rawDate) => {
  if (!rawDate) return null;
  try {
    if (typeof rawDate === 'number') return new Date(rawDate);
    if (typeof rawDate === 'object' && rawDate.seconds) return new Date(rawDate.seconds * 1000);
    const rawStr = String(rawDate).trim().split('T')[0];
    const [y, m, d] = rawStr.split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0);
  } catch {
    return null;
  }
};

export const getDateKey = (rawDate) => {
  if (!rawDate) return null;
  let date;
  
  if (typeof rawDate === 'object' && (rawDate.seconds != null || rawDate._seconds != null)) {
    const secs = rawDate.seconds != null ? rawDate.seconds : rawDate._seconds;
    date = new Date(secs * 1000);
  } else if (typeof rawDate === 'string' && rawDate.includes('/')) {
    const parts = rawDate.split(/[/-]/);
    if (parts.length >= 3 && parts[0].length <= 2 && parts[2].length === 4) {
      // ✅ FIX: Ancora ao meio-dia de Manaus (UTC-4)
      date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00-04:00`);
    } else {
      date = new Date(rawDate);
    }
  } else if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    // ✅ FIX: Ancora ao meio-dia de Manaus para evitar shift de dia em UTC
    date = new Date(`${rawDate.trim()}T12:00:00-04:00`);
  } else {
    date = new Date(rawDate);
  }
  
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE,
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const p = {};
    parts.forEach(({ type, value }) => p[type] = value);
    return `${p.year}-${p.month}-${p.day}`;
  } catch {
    // ✅ FIX: Fallback usa offset fixo de Manaus em vez de timezone local do browser
    const utcMs = date.getTime();
    const manausMs = utcMs - (4 * 60 * 60 * 1000);
    const manausDate = new Date(manausMs);
    const year = manausDate.getUTCFullYear();
    const month = String(manausDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(manausDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

export const getLocalMidnight = (date = new Date()) => {
  try {
    const dateKey = getDateKey(date);
    if (!dateKey) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    // ✅ FIX: Offset fixo de Manaus (-04:00) em vez de timezone local
    return new Date(`${dateKey}T00:00:00-04:00`);
  } catch {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
};

export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length < 3) return dateStr;
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
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00-04:00`);
    } else {
      d = new Date(raw);
    }
  } else if (typeof raw === 'string') {
    // ✅ FIX: Strings YYYY-MM-DD ancoradas ao meio-dia de Manaus
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
  const safeDays = Math.max(1, Math.floor(Number(intervalDays) || 1));
  const future = addDays(new Date(), safeDays);
  return getDateKey(future);
};

export const isFlashcardDue = (cardDue, referenceKey = null) => {
  if (!cardDue) return true;
  const todayKey = referenceKey || getFlashcardTodayKey();
  return cardDue <= todayKey;
};
