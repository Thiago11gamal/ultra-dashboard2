// ==========================================
// SHARED STATISTICAL UTILITIES
// ==========================================

/**
 * Linear interpolation percentile calculator.
 * B1 FIX: Shared between simulateNormalDistribution (monteCarlo.js) and
 * monteCarloSimulation (projection.js) for consistent CI percentile calculation.
 * 
 * @param {Float64Array|Float32Array|number[]} arr - Sorted array of values
 * @param {number} p - Percentile (0 to 1, e.g. 0.025 for 2.5th percentile)
 * @returns {number} Interpolated percentile value
 */
export const getPercentile = (arr, p) => {
    if (!arr || arr.length === 0) return 0;

    // BUG-7 FIX: Fast path para TypedArrays (Monte Carlo output) já ordenados.
    // Evita cópia O(n) + re-sort O(n log n) desnecessários por chamada.
    let sorted;
    if (arr instanceof Float64Array || arr instanceof Float32Array) {
        // Typed arrays do Monte Carlo são pre-sorted antes das chamadas a getPercentile
        sorted = arr;
    } else {
        const finite = Array.from(arr).filter(v => Number.isFinite(v));
        if (finite.length === 0) return 0;
        sorted = [...finite].sort((a, b) => a - b);
    }

    // NOVAS PROTEÇÕES
    if (!Number.isFinite(p)) return 0;
    if (p <= 0) return sorted[0]; // Retorna primeiro elemento se percentil <= 0
    if (p >= 1) return sorted[sorted.length - 1]; // Retorna último elemento se percentil >= 1
    
    const idx = (sorted.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};
