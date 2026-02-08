/**
 * Monte Carlo Engine - Statistics Module
 * 
 * Calculates per-category statistics: mean, SD, trend
 * Implements adaptive SD floor and trend-adjusted variance
 */

/**
 * Calculate mean from an array of scores
 * @param {number[]} scores - Array of scores
 * @returns {number} Mean value
 */
export function calculateMean(scores) {
    if (!scores || scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Calculate sample standard deviation (Bessel's correction)
 * @param {number[]} scores - Array of scores
 * @param {number} mean - Pre-calculated mean
 * @returns {number} Sample SD
 */
export function calculateSD(scores, mean) {
    if (!scores || scores.length < 2) return 0;
    const variance = scores.reduce((acc, score) =>
        acc + Math.pow(score - mean, 2), 0) / (scores.length - 1);
    return Math.sqrt(variance);
}

/**
 * Apply adaptive SD floor to prevent false certainty
 * Floor is proportional to mean: max(1.5, mean * 0.015)
 * 
 * @param {number} sd - Raw standard deviation
 * @param {number} mean - Category mean
 * @returns {number} Effective SD with floor applied
 */
export function applyAdaptiveSDFloor(sd, mean) {
    const minSD = Math.max(1.5, mean * 0.015);
    return Math.max(sd, minSD);
}

/**
 * Detect trend by comparing recent vs previous window
 * @param {number[]} scores - Full history of scores
 * @returns {'up' | 'down' | 'stable'} Trend direction
 */
export function detectTrend(scores) {
    if (!scores || scores.length < 2) return 'stable';

    const n = scores.length;
    const windowSize = Math.max(1, Math.min(3, Math.floor(n / 2)));

    const recentWindow = scores.slice(n - windowSize);
    const previousWindow = scores.slice(Math.max(0, n - windowSize * 2), n - windowSize);

    if (previousWindow.length === 0) return 'stable';

    const recentAvg = calculateMean(recentWindow);
    const previousAvg = calculateMean(previousWindow);

    if (recentAvg > previousAvg + 2) return 'up';
    if (recentAvg < previousAvg - 2) return 'down';
    return 'stable';
}

/**
 * Apply trend factor to SD (trend affects uncertainty, not mean)
 * Up trend = more confidence = lower SD factor
 * Down trend = less confidence = higher SD factor
 * 
 * @param {number} sd - Effective SD
 * @param {'up' | 'down' | 'stable'} trend - Detected trend
 * @returns {number} Trend-adjusted SD
 */
export function applyTrendFactor(sd, trend) {
    const trendFactors = {
        'up': 0.9,      // More confident when improving
        'down': 1.1,    // Less confident when declining
        'stable': 1.0   // No adjustment
    };
    return sd * (trendFactors[trend] || 1.0);
}

/**
 * Compute complete statistics for a single category
 * @param {Object[]} history - Array of { date, score } objects
 * @param {number} weight - Category weight (0-100)
 * @returns {Object} Category statistics
 */
export function computeCategoryStats(history, weight) {
    if (!history || history.length === 0) {
        return null;
    }

    const scores = history.map(h => h.score);
    const recentScores = scores.slice(-5); // Focus on last 5

    // 1. Basic statistics
    const mean = calculateMean(recentScores);
    const rawSD = recentScores.length > 1 ? calculateSD(recentScores, mean) : 0;

    // 2. Apply adaptive floor (prevents false certainty)
    const effectiveSD = applyAdaptiveSDFloor(rawSD, mean);

    // 3. Detect trend
    const trend = detectTrend(scores);

    // 4. Apply trend factor to SD (trend affects uncertainty, not mean)
    const trendAdjustedSD = applyTrendFactor(effectiveSD, trend);

    return {
        mean,
        sd: trendAdjustedSD,
        rawSD,
        effectiveSD,
        trend,
        weight,
        n: recentScores.length,
        history
    };
}

export default {
    calculateMean,
    calculateSD,
    applyAdaptiveSDFloor,
    detectTrend,
    applyTrendFactor,
    computeCategoryStats
};
