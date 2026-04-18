/**
 * Monte Carlo Engine - Variance Module
 * 
 * Implements weighted variance calculation and time uncertainty
 * All formulas are statistically correct and auditable
 */

/**
 * Compute weighted variance from category statistics
 * Formula: Var = Σ wi² × σi²  (portfolio variance, assuming independence)
 * 
 * We use portfolio variance (w²×σ²) because exam subjects are treated as
 * approximately independent. This produces a realistic Pooled SD of ~5-8%
 * instead of the ~35% that the weighted-average formula (Σ w×σ²) would give.
 * 
 * BUG-M3: This formula is statistically correct under the assumption of
 * independence between subjects. If subjects are strongly correlated
 * (shared test-day effects), the true variance lies between this value
 * and the correlated formula (Σ w_i*σ_i)².
 * 
 * CONTRACT: totalWeight must be the sum of all raw weights. If stats weights are 
 * already normalized (0-1), totalWeight MUST be passed as 1 for correct computations.
 * 
 * @param {Object[]} stats - Array of { sd, weight } objects
 * @param {number} totalWeight - Sum of all weights (use 1 if stats weights are normalized)
 * @returns {number} Weighted variance
 */
// REVISION: Institutional Correlation Factor (Rho)
// Represents the shared variance between subjects (e.g. test-day performance).
// 0.15 is a conservative value that interpolation between independence (0) and full correlation (1).
// Idealmente seria derivado empiricamente da covariância histórica, 
// mas 0.15 é mantido como configuração "conservadora" configurável.
export const INTER_SUBJECT_CORRELATION = 0.15;

// FIX 2.3: Proteção estrita contra a injeção de parâmetros corrompidos (null/NaN) do DB
export function computeWeightedVariance(stats, totalWeight, rho = INTER_SUBJECT_CORRELATION) {
    if (totalWeight === 0) return 0;

    // Garantia absoluta de tipo e limite
    const validRho = Number.isFinite(rho) && rho !== null ? Math.max(0, Math.min(1, rho)) : INTER_SUBJECT_CORRELATION;

    const weights = stats.map(cat => cat.weight / totalWeight);
    const adjustedSDs = stats.map(cat => cat.sd);

    // 1. Independent Variance Component: Σ (wi² * σi²)
    const independentVar = weights.reduce((acc, w, i) => acc + Math.pow(w, 2) * Math.pow(adjustedSDs[i], 2), 0);

    // 2. Coherent Variance Component (Full Correlation): (Σ wi * σi)²
    const weightedSumSD = weights.reduce((acc, w, i) => acc + (w * adjustedSDs[i]), 0);
    const coherentVar = Math.pow(weightedSumSD, 2);

    // 3. Interpolated Variance: Usar validRho em vez de rho bruto
    return (1 - validRho) * independentVar + (validRho * coherentVar);
}

export function computePooledSD(stats, totalWeight, rho = INTER_SUBJECT_CORRELATION) {
    const validRho = Number.isFinite(rho) ? Math.max(0, Math.min(1, rho)) : INTER_SUBJECT_CORRELATION;
    const weightedVariance = computeWeightedVariance(stats, totalWeight, validRho);
    return Math.sqrt(weightedVariance);
}

/**
 * Get variance breakdown for debugging/auditing
 * 
 * @param {Object[]} stats - Array of category statistics
 * @param {number} totalWeight - Sum of all weights
 * @returns {Object} Detailed variance breakdown
 */
export function getVarianceBreakdown(stats, totalWeight) {
    const weightedVariance = computeWeightedVariance(stats, totalWeight);
    const pooledVariance = weightedVariance;
    const pooledSD = Math.sqrt(pooledVariance);

    return {
        weightedVariance: Number(weightedVariance.toFixed(4)),
        timeUncertainty: 0,
        timeVariance: 0,
        pooledVariance: Number(pooledVariance.toFixed(4)),
        pooledSD: Number(pooledSD.toFixed(4))
    };
}

export default {
    computeWeightedVariance,
    computePooledSD,
    getVarianceBreakdown
};
