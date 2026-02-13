export function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function standardDeviation(arr) {
    if (arr.length < 2) return 0;

    const m = mean(arr);
    const variance =
        arr.reduce((sum, val) =>
            sum + Math.pow(val - m, 2), 0
        ) / (arr.length - 1);

    return Math.sqrt(variance);
}

/**
 * Legacy support for UI components
 * Aggregates history data into a stats object
 */
export function computeCategoryStats(history, weight) {
    if (!history || history.length === 0) return null;
    const scores = history.map(h => h.score);
    const m = mean(scores);
    const sd = standardDeviation(scores);

    // Safety floor for SD to prevent zero-variance issues in simulation
    const safeSD = Math.max(sd, 1.5);

    return {
        mean: m,
        sd: safeSD,
        n: history.length,
        weight: weight,
        history: history
    };
}
