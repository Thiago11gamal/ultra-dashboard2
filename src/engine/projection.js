/**
 * Monte Carlo Engine - Projection Module
 * 
 * Implements linear regression and temporal projection
 * Projects scores forward based on historical trend
 */

/**
 * Calculate linear regression slope from historical data
 * Uses least squares method with day-based X axis
 * 
 * @param {Object[]} history - Array of { date, score } objects
 * @returns {number} Slope (points per day), clamped to [-2, +2]
 */
export function calculateSlope(history) {
    if (!history || history.length < 2) return 0;

    // Convert to data points with X = days from first entry
    const startTime = new Date(history[0].date).getTime();
    const dataPoints = history.map(h => ({
        x: (new Date(h.date).getTime() - startTime) / (1000 * 60 * 60 * 24),
        y: h.score
    }));

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((a, p) => a + p.x, 0);
    const sumY = dataPoints.reduce((a, p) => a + p.y, 0);
    const sumXY = dataPoints.reduce((a, p) => a + p.x * p.y, 0);
    const sumXX = dataPoints.reduce((a, p) => a + p.x * p.x, 0);

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return 0;

    const rawSlope = (n * sumXY - sumX * sumY) / denom;

    // Clamp to realistic range: max ±2% per day
    return Math.max(-2.0, Math.min(2.0, rawSlope));
}

/**
 * Project score forward in time using anchored projection
 * Formula: Projected = CurrentMean + (Slope × Days)
 * 
 * @param {number} currentMean - Current average score
 * @param {number} slope - Daily improvement rate
 * @param {number} projectDays - Days to project forward
 * @returns {number} Projected score, clamped to [0, 100]
 */
export function projectScore(currentMean, slope, projectDays) {
    const projected = currentMean + (slope * projectDays);
    return Math.max(0, Math.min(100, projected));
}

/**
 * Calculate weighted projected mean across all categories
 * 
 * @param {Object[]} categoryStats - Array of category statistics
 * @param {number} totalWeight - Sum of all weights
 * @param {number} projectDays - Days to project forward
 * @returns {number} Weighted projected mean
 */
export function calculateWeightedProjectedMean(categoryStats, totalWeight, projectDays) {
    if (totalWeight === 0) return 0;

    return categoryStats.reduce((acc, cat) => {
        const normalizedWeight = cat.weight / totalWeight;

        if (!cat.history || cat.history.length < 2) {
            // No projection possible, use current mean
            return acc + (cat.mean * normalizedWeight);
        }

        const slope = calculateSlope(cat.history);
        const projected = projectScore(cat.mean, slope, projectDays);

        return acc + (projected * normalizedWeight);
    }, 0);
}

/**
 * Calculate current weighted mean (no projection)
 * 
 * @param {Object[]} categoryStats - Array of category statistics
 * @param {number} totalWeight - Sum of all weights
 * @returns {number} Current weighted mean
 */
export function calculateCurrentWeightedMean(categoryStats, totalWeight) {
    if (totalWeight === 0) return 0;

    return categoryStats.reduce((acc, cat) => {
        const normalizedWeight = cat.weight / totalWeight;
        return acc + (cat.mean * normalizedWeight);
    }, 0);
}

export default {
    calculateSlope,
    projectScore,
    calculateWeightedProjectedMean,
    calculateCurrentWeightedMean
};
