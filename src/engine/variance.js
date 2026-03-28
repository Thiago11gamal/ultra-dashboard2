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
 * @param {Object[]} stats - Array of { sd, weight } objects
 * @param {number} totalWeight - Sum of all weights
 * @returns {number} Weighted variance
 */
// REVISION: Institutional Correlation Factor (Rho)
// Represents the shared variance between subjects (e.g. test-day performance).
// 0.15 is a conservative value that interpolation between independence (0) and full correlation (1).
const INTER_SUBJECT_CORRELATION = 0.15;

export function computeWeightedVariance(stats, totalWeight) {
    if (totalWeight === 0) return 0;

    const weights = stats.map(cat => cat.weight / totalWeight);
    
    // RIGOR-02 FIX: Standard Error of the Estimate.
    // We adjust the base SD of each category by its sample size (n).
    // Fewer questions (n) = higher epistemic uncertainty.
    // The factor (1.0 / n) acts as a penalty for low-volume data.
    const adjustedSDs = stats.map(cat => {
        const n = Math.max(1, cat.n || 0);
        const penalty = 1.0 / n; 
        return Math.sqrt(Math.pow(cat.sd, 2) + penalty);
    });

    // 1. Independent Variance Component: Σ (wi² * σi²)
    const independentVar = weights.reduce((acc, w, i) => acc + Math.pow(w, 2) * Math.pow(adjustedSDs[i], 2), 0);

    // 2. Coherent Variance Component (Full Correlation): (Σ wi * σi)²
    const weightedSumSD = weights.reduce((acc, w, i) => acc + (w * adjustedSDs[i]), 0);
    const coherentVar = Math.pow(weightedSumSD, 2);

    // 3. Interpolated Variance: Var = (1-ρ)*Var_indep + ρ*Var_coherent
    return (1 - INTER_SUBJECT_CORRELATION) * independentVar + (INTER_SUBJECT_CORRELATION * coherentVar);
}

/**
 * Compute time uncertainty using sublinear growth
 * Formula: σ_time = √(days) × 0.5
 * 
 * BUG-M2: Sublinear growth reflects reality: uncertainty doesn't grow
 * linearly with time, it decelerates (diminishing returns).
 * The 0.5 constant is an empirical factor representing ~0.5pp of 
 * additional uncertainty per square root of projected day.
 * 
 * @param {number} projectDays - Days to project forward
 * @returns {number} Time uncertainty SD
 */
// BUG-L5: extrair como constante nomeada para facilitar calibração
// σ_time representa ~0.5pp de incerteza adicional por √dia de projeção
const TIME_UNCERTAINTY_FACTOR = 0.5;

export function computeTimeUncertainty(projectDays) {
    if (projectDays <= 0) return 0;
    return Math.sqrt(projectDays) * TIME_UNCERTAINTY_FACTOR;
}

/**
 * ⚠️ ESTATÍSTICA: Esta função combina duas unidades conceituais distintas:
 * 1. σ_weighted (Variabilidade histórica entre provas)
 * 2. σ_time (Incerteza de trajetória/drift)
 * 
 * Embora pragmaticamente útil para bandas de confiança, o valor resultante é um
 * estimador composto, não um desvio padrão frequentista puro.
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
