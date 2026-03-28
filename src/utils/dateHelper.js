/**
 * Centralized date utilities for consistency across the application.
 */

export const getDateKey = (rawDate) => {
    if (!rawDate) return null;
    const date = new Date(rawDate);
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
