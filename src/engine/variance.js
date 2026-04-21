/**
 * Monte Carlo Engine - Variance Module
 * 
 * Implements weighted variance calculation and time uncertainty
 * All formulas are statistically correct and auditable
 */

/**
 * Compute weighted variance from category statistics
 * Formula: Var = (1 - ρ) × [Σ wi² × σi²] + ρ × [Σ (wi × σi)]²
 * Calcula a variância ponderada interpolando entre a hipótese de independência 
 * das disciplinas (ρ = 0) e a hipótese de correlação perfeita (ρ = 1).
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
// CORREÇÃO: Alinhamento com Modelos TRI (Teoria de Resposta ao Item).
// 0.25 capta melhor a covariância psicológica (stress do dia) 
// sem esmagar o Desvio Padrão Agregado (Pooled SD) do candidato.
export const INTER_SUBJECT_CORRELATION = 0.25;

// FIX 2.3: Proteção estrita contra a injeção de parâmetros corrompidos (null/NaN) do DB
export function computeWeightedVariance(stats, totalWeight, rho = INTER_SUBJECT_CORRELATION) {
    // BUG 7 FIX: Use the provided totalWeight if valid, otherwise fallback to calculated total.
    // This respects the function contract while remaining defensive.
    const calculatedTotalWeight = stats.reduce((acc, cat) => acc + (cat.weight || 0), 0);
    const effectiveTotalWeight = (Number.isFinite(totalWeight) && totalWeight > 0) ? totalWeight : calculatedTotalWeight;

    if (effectiveTotalWeight === 0) return 0;

    // Garantia absoluta de tipo e limite para correlação
    const validRho = Number.isFinite(rho) && rho !== null ? Math.max(0, Math.min(1, rho)) : INTER_SUBJECT_CORRELATION;

    const weights = stats.map(cat => (cat.weight || 0) / effectiveTotalWeight);
    const adjustedSDs = stats.map(cat => cat.sd || 0);

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
 * Estimate inter-subject correlation from historical aligned score rows.
 * Uses pairwise Pearson correlations with overlap checks and shrinkage toward fallback.
 *
 * @param {Object[]} scoreRows - Array of date-aligned rows: { [subjectName]: score }
 * @param {string[]} subjectNames - Subject names to include
 * @param {number} fallback - Fallback correlation when data is insufficient
 * @returns {number} Estimated rho in [0,1]
 */
export function estimateInterSubjectCorrelation(
    scoreRows = [],
    subjectNames = [],
    fallback = INTER_SUBJECT_CORRELATION
) {
    if (!Array.isArray(scoreRows) || scoreRows.length < 4 || !Array.isArray(subjectNames) || subjectNames.length < 2) {
        return fallback;
    }

    const pairwise = [];
    for (let i = 0; i < subjectNames.length; i++) {
        for (let j = i + 1; j < subjectNames.length; j++) {
            const aName = subjectNames[i];
            const bName = subjectNames[j];

            const xs = [];
            const ys = [];
            scoreRows.forEach(row => {
                const x = Number(row?.[aName]);
                const y = Number(row?.[bName]);
                if (Number.isFinite(x) && Number.isFinite(y)) {
                    xs.push(x);
                    ys.push(y);
                }
            });

            const n = xs.length;
            if (n < 4) continue;

            const meanX = xs.reduce((acc, v) => acc + v, 0) / n;
            const meanY = ys.reduce((acc, v) => acc + v, 0) / n;

            let cov = 0;
            let varX = 0;
            let varY = 0;
            for (let k = 0; k < n; k++) {
                const dx = xs[k] - meanX;
                const dy = ys[k] - meanY;
                cov += dx * dy;
                varX += dx * dx;
                varY += dy * dy;
            }

            const denom = Math.sqrt(varX * varY);
            if (denom <= 0) continue;

            const corr = cov / denom;
            // Keep only non-negative coherent component for variance interpolation.
            pairwise.push({ corr: Math.max(0, corr), n });
        }
    }

    if (pairwise.length === 0) return fallback;

    // Weight by information size (overlap) and shrink toward fallback for robustness.
    const totalWeight = pairwise.reduce((acc, p) => acc + Math.sqrt(p.n), 0);
    const empirical = totalWeight > 0
        ? pairwise.reduce((acc, p) => acc + p.corr * Math.sqrt(p.n), 0) / totalWeight
        : fallback;

    const avgOverlap = pairwise.reduce((acc, p) => acc + p.n, 0) / pairwise.length;
    const shrink = avgOverlap / (avgOverlap + 10); // conservative shrinkage
    const blended = (shrink * empirical) + ((1 - shrink) * fallback);

    return Math.max(0, Math.min(1, blended));
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
    getVarianceBreakdown,
    estimateInterSubjectCorrelation
};
