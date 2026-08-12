export const formatMinutes = (totalMinutes = 0) => {
    const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h === 0 && m === 0) {
        return '0m';
    }

    if (h === 0) {
        return `${m}m`;
    }

    if (m === 0) {
        return `${h}h`;
    }

    return `${h}h ${m}m`;
};
