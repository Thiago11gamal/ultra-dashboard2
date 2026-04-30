// ==========================================
// SHARED STATISTICAL UTILITIES
// ==========================================

/**
 * Linear interpolation percentile calculator.
 * B1 FIX: Shared between simulateNormalDistribution (monteCarlo.js) and
 * monteCarloSimulation (projection.js) for consistent CI percentile calculation.
 * 
 * @param {Float32Array|number[]} arr - Sorted array of values
 * @param {number} p - Percentile (0 to 1, e.g. 0.025 for 2.5th percentile)
 * @returns {number} Interpolated percentile value
 */
export const getPercentile = (arr, p) => {
    if (!arr || arr.length === 0) return 0;
    
    // NOVAS PROTEÇÕES
    if (!Number.isFinite(p)) return 0;
    if (p <= 0) return arr[0]; // Retorna primeiro elemento se percentil <= 0
    if (p >= 1) return arr[arr.length - 1]; // Retorna último elemento se percentil >= 1
    
    const idx = (arr.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return arr[lower];
    const weight = idx - lower;
    return arr[lower] * (1 - weight) + arr[upper] * weight;
};
