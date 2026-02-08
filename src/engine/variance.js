/**
 * Monte Carlo Engine - Variance Module
 * 
 * Implements weighted variance calculation and time uncertainty
 * All formulas are statistically correct and auditable
 */

/**
 * Compute weighted variance from category statistics
 * Formula: Var(Σ wi·Xi) = Σ wi² × Var(Xi)
 * 
 * This is the correct formula for variance of a weighted sum
 * of independent random variables.
 * 
 * @param {Object[]} stats - Array of { sd, weight } objects
 * @param {number} totalWeight - Sum of all weights
 * @returns {number} Weighted variance
 */
export function computeWeightedVariance(stats, totalWeight) {
    if (totalWeight === 0) return 0;

    return stats.reduce((acc, cat) => {
        const w = cat.weight / totalWeight;
        // Variance = SD², and scales with w²
        return acc + (w * w * Math.pow(cat.sd, 2));
    }, 0);
}

/**
 * Compute time uncertainty using sublinear growth
 * Formula: σ_time = √(days) × 0.5
 * 
 * Sublinear growth reflects reality: uncertainty doesn't grow
 * linearly with time, it decelerates (diminishing returns).
 * 
 * @param {number} projectDays - Days to project forward
 * @returns {number} Time uncertainty SD
 */
export function computeTimeUncertainty(projectDays) {
    if (projectDays <= 0) return 0;
    return Math.sqrt(projectDays) * 0.5;
}

/**
 * Compute pooled standard deviation combining all sources
 * Formula: σ_pooled = √(σ²_weighted + σ²_time)
 * 
 * @param {Object[]} stats - Array of category statistics
 * @param {number} totalWeight - Sum of all weights
 * @param {number} projectDays - Days to project forward
 * @returns {number} Pooled SD
 */
export function computePooledSD(stats, totalWeight, projectDays) {
    const weightedVariance = computeWeightedVariance(stats, totalWeight);
    const timeUncertainty = computeTimeUncertainty(projectDays);
    const timeVariance = timeUncertainty * timeUncertainty;

    return Math.sqrt(weightedVariance + timeVariance);
}

/**
 * Get variance breakdown for debugging/auditing
 * 
 * @param {Object[]} stats - Array of category statistics
 * @param {number} totalWeight - Sum of all weights
 * @param {number} projectDays - Days to project forward
 * @returns {Object} Detailed variance breakdown
 */
export function getVarianceBreakdown(stats, totalWeight, projectDays) {
    const weightedVariance = computeWeightedVariance(stats, totalWeight);
    const timeUncertainty = computeTimeUncertainty(projectDays);
    const timeVariance = timeUncertainty * timeUncertainty;
    const pooledVariance = weightedVariance + timeVariance;
    const pooledSD = Math.sqrt(pooledVariance);

    return {
        weightedVariance: Number(weightedVariance.toFixed(4)),
        timeUncertainty: Number(timeUncertainty.toFixed(4)),
        timeVariance: Number(timeVariance.toFixed(4)),
        pooledVariance: Number(pooledVariance.toFixed(4)),
        pooledSD: Number(pooledSD.toFixed(4))
    };
}

export default {
    computeWeightedVariance,
    computeTimeUncertainty,
    computePooledSD,
    getVarianceBreakdown
};
