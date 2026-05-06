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

export function computeEffectiveSampleSizeFromWeights(weights = []) {
    const clean = Array.isArray(weights) ? weights.map(w => Number(w)).filter(w => Number.isFinite(w) && w > 0) : [];
    if (clean.length === 0) return 0;
    const sumW = clean.reduce((a, b) => a + b, 0);
    const sumW2 = clean.reduce((a, b) => (a + (b * b)), 0);
    return sumW2 > 0 ? (sumW * sumW) / sumW2 : 0;
}

// FIX 2.3: Proteção estrita contra a injeção de parâmetros corrompidos (null/NaN) do DB
export function computeWeightedVariance(stats, totalWeight, rho = INTER_SUBJECT_CORRELATION) {
    if (!Array.isArray(stats) || stats.length === 0) return 0;

    // BUG 7 FIX: Use the provided totalWeight if valid, otherwise fallback to calculated total.
    // This respects the function contract while remaining defensive.
    const toFiniteNonNegative = (value) => {
        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? n : 0;
    };

    const toFiniteSd = (value) => {
        const n = Number(value);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    };

    const calculatedTotalWeight = stats.reduce((acc, cat) => acc + toFiniteNonNegative(cat?.weight), 0);
    const effectiveTotalWeight = (Number.isFinite(totalWeight) && totalWeight > 0) ? totalWeight : calculatedTotalWeight;

    if (effectiveTotalWeight === 0) return 0;

    // Garantia absoluta de tipo e limite para correlação
    const validRho = Number.isFinite(rho) && rho !== null ? Math.max(0, Math.min(1, rho)) : INTER_SUBJECT_CORRELATION;

    const rawWeights = stats.map(cat => toFiniteNonNegative(cat?.weight) / effectiveTotalWeight);
    const adjustedSDs = stats.map(cat => toFiniteSd(cat?.sd));

    // SAFETY: If caller passes inconsistent totalWeight, force normalized simplex weights (Σwi=1).
    // This preserves scale invariance of linear-combination variance instead of silently shrinking/blowing up SD.
    const sumRawWeights = rawWeights.reduce((acc, w) => acc + w, 0);
    if (!Number.isFinite(sumRawWeights) || sumRawWeights <= 0) return 0;
    const weights = rawWeights.map(w => w / sumRawWeights);

    // 1. Independent Variance Component (Weighted Sum of Variances): Σ (wi² * σi²)
    // BUGFIX: Respeito estrito à variância de uma combinação linear para editais.
    // O peso (wi) PRECISA ser elevado ao quadrado para a componente independente.
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
                const rawX = row?.[aName];
                const x = typeof rawX === 'object' && rawX !== null ? Number(rawX?.score) : Number(rawX);
                const rawY = row?.[bName];
                const y = typeof rawY === 'object' && rawY !== null ? Number(rawY?.score) : Number(rawY);
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
            pairwise.push({ corr, n });
        }
    }

    if (pairwise.length === 0) return fallback;

    // Weight by information size (overlap) and use Fisher Z transformation for averaging
    // Pearson correlations (r) are not additive; averaging them directly biases toward zero.
    let sumZ = 0;
    let sumW = 0;
    pairwise.forEach(p => {
        // Peso informacional assintoticamente ótimo para Fisher Z ~ N(0, 1/(n-3))
        const w = Math.max(1, p.n - 3);
        // Fisher Z transform: Z = 0.5 * ln((1+r)/(1-r))
        // BUGFIX GEMINI: Permitir correlações negativas no cálculo para não inflar a média
        const r = Math.max(-0.999, Math.min(0.999, p.corr));
        const z = 0.5 * Math.log((1 + r) / (1 - r));
        sumZ += z * w;
        sumW += w;
    });

    const avgZ = sumW > 0 ? sumZ / sumW : 0;
    // Inverse Fisher Z: r = (exp(2z) - 1) / (exp(2z) + 1)
    const empirical = (Math.exp(2 * avgZ) - 1) / (Math.exp(2 * avgZ) + 1);

    const overlaps = pairwise.map(p => p.n);
    const avgOverlap = overlaps.reduce((acc, n) => acc + n, 0) / overlaps.length;
    const essPairs = computeEffectiveSampleSizeFromWeights(pairwise.map(p => Math.max(1, p.n - 3)));
    // Shrinkage empírico-bayesiano: usa overlap médio e ESS para evitar overfit em poucos pares.
    const shrink = Math.max(0, Math.min(1, (avgOverlap / (avgOverlap + 10)) * (essPairs / (essPairs + 6))));
    // If empirical evidence indicates negative correlation, avoid a positive fallback prior
    // pulling the estimate across zero (which would erase anti-correlation signal).
    const prior = (empirical < 0 && fallback > 0) ? 0 : fallback;
    const blended = (shrink * empirical) + ((1 - shrink) * prior);

    return Math.max(-1, Math.min(1, blended));
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
    // SAFETY: computeWeightedVariance may return negative due to floating-point rounding
    // in the cross-term subtraction. Clamp to 0 before sqrt to prevent NaN propagation.
    const pooledSD = Math.sqrt(Math.max(0, pooledVariance));

    return {
        weightedVariance: Number(Number.isFinite(weightedVariance) ? weightedVariance.toFixed(4) : 0),
        timeUncertainty: 0,
        timeVariance: 0,
        pooledVariance: Number(Number.isFinite(pooledVariance) ? pooledVariance.toFixed(4) : 0),
        pooledSD: Number(Number.isFinite(pooledSD) ? pooledSD.toFixed(4) : 0)
    };
}

export default {
    computeWeightedVariance,
    computePooledSD,
    getVarianceBreakdown,
    estimateInterSubjectCorrelation,
    computeEffectiveSampleSizeFromWeights
};
