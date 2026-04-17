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

    // Use local date to avoid timezone off-by-one errors (late night simulados)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
