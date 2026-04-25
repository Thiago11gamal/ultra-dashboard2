/**
 * Centralized date utilities for consistency across the application.
 */

export const getDateKey = (rawDate) => {
    if (!rawDate) return null;
    let date;
    
    // Suporte a Firebase Timestamp (seconds/nanoseconds)
    if (typeof rawDate === 'object' && (rawDate.seconds || rawDate._seconds)) {
        const secs = rawDate.seconds || rawDate._seconds;
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

    if (Number.isNaN(date.getTime())) return null;

    // 🕒 PADRONIZAÇÃO LOCAL: MANAUS (America/Manaus | UTC-4)
    // Garante que o agrupamento de dias no Heatmap e Streaks ocorre sempre no mesmo fuso,
    // independentemente de onde o utilizador esteja geograficamente.
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Manaus',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(date);
        const p = {};
        parts.forEach(({type, value}) => p[type] = value);
        return `${p.year}-${p.month}-${p.day}`;
    } catch (e) {
        // Fallback seguro caso o navegador não suporte fusos horários
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};

/**
 * 🕒 PADRONIZAÇÃO LOCAL: MANAUS
 * Calcula a meia-noite (início do dia) exata no fuso horário de Manaus (UTC-4).
 * Utilizado para filtrar sessões "de hoje" nas estatísticas diárias.
 */
export const getManausMidnight = (date = new Date()) => {
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Manaus',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(date);
        const p = {};
        parts.forEach(({type, value}) => p[type] = value);
        
        // Manaus não tem horário de verão, fuso é fixo UTC-04:00
        return new Date(`${p.year}-${p.month}-${p.day}T00:00:00-04:00`);
    } catch (e) {
        // Fallback para meia-noite local do sistema
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
};

export const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
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
    if (typeof raw === 'string') {
        // Handle YYYY-MM-DD
        if (raw.length === 10 && raw.includes('-')) {
            d = new Date(`${raw}T12:00:00`);
        } else {
            d = new Date(raw);
        }
    } else {
        d = new Date(raw);
    }
    if (isNaN(d.getTime())) return null;
    return d;
};

/**
 * Centralised "time ago" formatter with correct Portuguese pluralization.
 * Uses normalizeDate to avoid UTC midnight shift on YYYY-MM-DD strings.
 * Returns: "Agora há pouco" | "Xh atrás" | "Ontem" | "X dias atrás" |
 *          "X semana(s) atrás" | "X mês/meses atrás"
 */
export const formatTimeAgo = (date) => {
    if (!date) return 'Nunca';
    const parsed = normalizeDate(date);
    const diff = Date.now() - (parsed ? parsed.getTime() : new Date(date).getTime());
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
