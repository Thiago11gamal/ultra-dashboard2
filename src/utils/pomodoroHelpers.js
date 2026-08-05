export const asArray = (value) =>
    Array.isArray(value) ? value : Object.values(value || {});

export const safeArray = (value) =>
    asArray(value).filter(Boolean);

export function normalizeCategories(rawCategories) {
    return safeArray(rawCategories).map(category => ({
        ...category,
        tasks: safeArray(category.tasks)
    }));
}

export function toPositiveMinutes(value, fallback) {
    const n = Number(value);

    if (!Number.isFinite(n) || n <= 0) {
        return fallback;
    }

    return Math.min(240, Math.max(1, Math.round(n)));
}

export function formatTime(seconds) {
    const secsInt = Math.ceil(Math.max(0, seconds));
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;

    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
