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
    // FIX Bug 8: Reduced from 1.5 to 0.5 — less artificial noise for consistent students
    const safeSD = Math.max(sd, 0.5);

    // FIX Bug 3: Calculate trend from scores using linear regression
    let trend = 'stable';
    if (scores.length >= 3) {
        const n = scores.length;
        const xMean = (n - 1) / 2;
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (scores[i] - m);
            denominator += Math.pow(i - xMean, 2);
        }
        const slope = denominator !== 0 ? numerator / denominator : 0;
        if (slope > 0.5) trend = 'up';
        else if (slope < -0.5) trend = 'down';
    }

    return {
        mean: m,
        sd: safeSD,
        n: history.length,
        weight: weight,
        history: history,
        trend
    };
}
