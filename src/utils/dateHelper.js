/**
 * Centralized date utilities for consistency across the application.
 */
export const APP_TIMEZONE = 'America/Manaus';

export const getDateKey = (rawDate) => {
    if (!rawDate) return null;
    let date;

    // Suporte a Firebase Timestamp (seconds/nanoseconds)
    if (typeof rawDate === 'object' && (rawDate.seconds != null || rawDate._seconds != null)) {
        const secs = rawDate.seconds != null ? rawDate.seconds : rawDate._seconds;
        date = new Date(secs * 1000);
    } else if (typeof rawDate === 'string' && rawDate.includes('/')) {
        // Suporte ao padrão DD/MM/YYYY (importação/CSV)
        const parts = rawDate.split(/[/-]/);
        if (parts.length >= 3 && parts[0].length <= 2 && parts[2].length === 4) {
            date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
        } else {
            date = new Date(rawDate);
        }
    } else if (typeof rawDate === 'string' && rawDate.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        // FIX CRÍTICO: Strings YYYY-MM-DD interpretadas por new Date() como meia-noite UTC,
        // o que recua 1 dia em fusos negativos (ex: UTC-4, 00:00 UTC = 20:00 do dia anterior).
        // Ao forçar T12:00:00 (meio-dia local), o dia do calendário fica estável em qualquer fuso.
        date = new Date(`${rawDate}T12:00:00`);
    } else {
        date = new Date(rawDate);
    }

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

    // 🕒 PADRONIZAÇÃO LOCAL: MANAUS (America/Manaus | UTC-4)
    // Garante que o agrupamento de dias no Heatmap e Streaks ocorre sempre no mesmo fuso,
    // independentemente de onde o utilizador esteja geograficamente.
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: APP_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(date);
        const p = {};
        parts.forEach(({ type, value }) => p[type] = value);
        return `${p.year}-${p.month}-${p.day}`;
    } catch {
        // Fallback seguro caso o navegador não suporte fusos horários
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};

/**
 * Calcula a meia-noite (início do dia) exata no fuso horário local.
 * Utilizado para filtrar sessões "de hoje" nas estatísticas diárias.
 */
export const getLocalMidnight = (date = new Date()) => {
    try {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    } catch {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
};

export const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length < 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
};

/**
 * Normalizes any date input (string or Date) to a JS Date object at Local Noon
 * to prevent UTC off-by-one errors when comparing YYYY-MM-DD strings.
 */
export const normalizeDate = (raw) => {
    if (!raw) return null;
    let d;
    const isDateOnly = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw);

    if (typeof raw === 'string') {
        d = isDateOnly ? new Date(`${raw}T12:00:00`) : new Date(raw);
    } else {
        d = new Date(raw);
    }

    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;

    // Corrige apenas datas sem hora explícita para evitar distorcer timestamps reais.
    if (isDateOnly) d.setHours(12, 0, 0, 0);
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

/**
 * Centralised "time ago" formatter with correct Portuguese pluralization.
 * Uses normalizeDate to avoid UTC midnight shift on YYYY-MM-DD strings.
 * Returns: "Agora há pouco" | "Xh atrás" | "Ontem" | "X dias atrás" |
 *          "X semana(s) atrás" | "X mês/meses atrás"
 */
export const formatTimeAgo = (date) => {
    if (!date) return 'Nunca';
    const timeMs = toDateMs(date);

    if (Number.isNaN(timeMs)) return 'Data inválida';

    const rawDiff = Date.now() - timeMs;
    // Aplica tolerância somente para pequenas datas futuras (clock skew).
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
    // CORREÇÃO 11: Remoção do dead code condicional inatingível 
    if (days < 7) return `${days} dias atrás`;
    if (days < 30) return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;
    return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
};

/**
 * Formata horas decimais (ex: 1.25) para o formato "1h15".
 */
export const formatDuration = (decimalHours) => {
    const safe = Number.isFinite(Number(decimalHours)) ? Number(decimalHours) : 0;
    const normalized = Math.max(0, safe);
    let hours = Math.floor(normalized);
    let minutes = Math.round((normalized - hours) * 60);
    // BUGFIX: 1.999h virava "1h60"; normalizar carry para horas.
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
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return '--/--/----';
        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: APP_TIMEZONE,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(parsed);
    } catch {
        return '--/--/----';
    }
};

export const formatDateTimePtBR = (date) => {
    try {
        if (!date) return '--/--/---- --:--:--';
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return '--/--/---- --:--:--';
        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: APP_TIMEZONE,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(parsed);
    } catch {
        return '--/--/---- --:--:--';
    }
};

export const formatWeekdayShortPtBR = (date) => {
    try {
        if (!date) return '';
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return '';
        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: APP_TIMEZONE,
            weekday: 'short'
        }).format(parsed).replace('.', '').toUpperCase();
    } catch {
        return '';
    }
};
