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
export const getPercentile = (arr, p, isAlreadySorted = false) => {
    if (!arr || arr.length === 0) return 0;

    let sorted;
    if (isAlreadySorted) {
        sorted = arr;
    } else if (arr instanceof Float64Array || arr instanceof Float32Array) {
        // CORREÇÃO: Matrizes Tipadas retêm NaNs silenciosamente no V8 Engine. 
        // É vital filtrá-los para evitar o colapso dos limites P90/P99 no Monte Carlo.
        const finiteData = [];
        for (let i = 0; i < arr.length; i++) {
            if (Number.isFinite(arr[i])) finiteData.push(arr[i]);
        }
        if (finiteData.length === 0) return 0;
        sorted = new arr.constructor(finiteData).sort();
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

/**
 * Algoritmo Quickselect In-place (Média O(N), Memória O(1))
 * Encontra o k-ésimo menor elemento sem ordenar o array inteiro.
 */
export const quickSelect = (arr, k, left = 0, right = arr.length - 1) => {
    while (left < right) {
        let pivotIndex = partition(arr, left, right);
        if (pivotIndex === k) return arr[k];
        if (k < pivotIndex) right = pivotIndex - 1;
        else left = pivotIndex + 1;
    }
    return arr[k];
};

function partition(arr, left, right) {
    const pivot = arr[Math.floor((left + right) / 2)];
    let i = left, j = right;
    while (i <= j) {
        while (arr[i] < pivot) i++;
        while (arr[j] > pivot) j--;
        if (i <= j) {
            const temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
            i++; j--;
        }
    }
    return i;
}

/**
 * Matemática Padrão de Percentil Contínuo (Linear Interpolation).
 * O valor deve interpolar entre as casas adjacentes quando a posição não for inteira.
 * [BUG-PERCENTIL-DISCRETO FIX]
 */
export const calculateInterpolatedPercentile = (sortedArray, p) => {
    if (!sortedArray || sortedArray.length === 0) return 0;
    if (sortedArray.length === 1) return sortedArray[0];
    if (p <= 0) return sortedArray[0];
    if (p >= 1) return sortedArray[sortedArray.length - 1];

    // Calculamos o índice exacto em ponto flutuante
    const exactIndex = p * (sortedArray.length - 1);
    
    // As "paredes" dos índices
    const lowerIndex = Math.floor(exactIndex);
    const upperIndex = Math.ceil(exactIndex);
    
    // A fracção remanescente (ex: se exactIndex = 9.5, weight = 0.5)
    const weight = exactIndex - lowerIndex;
    
    const lowerValue = sortedArray[lowerIndex];
    const upperValue = sortedArray[upperIndex];
    
    // Interpolação linear fina entre os dois limites da amostra discreta
    return lowerValue + weight * (upperValue - lowerValue);
};
