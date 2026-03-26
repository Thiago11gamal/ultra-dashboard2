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
export function computeWeightedVariance(stats, totalWeight) {
    if (totalWeight === 0) return 0;

    return stats.reduce((acc, cat) => {
        const w = cat.weight / totalWeight;
        // BUG MATH-02 REFIX: Use portfolio variance (w^2 * sigma^2) 
        // This is statistically the standard way to combine independent variables 
        // and it drastically reduces the Pooled SD from ±35% to ±5-8% in typical sets.
        return acc + (Math.pow(w, 2) * Math.pow(cat.sd, 2));
    }, 0);
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
