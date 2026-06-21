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
// BUG-AUDIT-09 FIX: Cria cópia defensiva para não corromper o array original.
// O particionamento in-place reordenava o Float64Array do chamador, fazendo
// chamadas subsequentes (ex: iLow, iMedian, iHigh) retornarem valores incorretos.
export const quickSelect = (arr, k) => {
    if (!arr || arr.length === 0) return 0;

    let copy;
    if (arr instanceof Float64Array || arr instanceof Float32Array) {
        let allFinite = true;
        const finite = [];
        for (let i = 0; i < arr.length; i++) {
            if (Number.isFinite(arr[i])) {
                finite.push(arr[i]);
            } else {
                allFinite = false;
            }
        }
        if (finite.length === 0) return 0;
        copy = allFinite ? new arr.constructor(arr) : new arr.constructor(finite);
    } else {
        copy = [];
        for (const value of arr) {
            const numeric = Number(value);
            if (Number.isFinite(numeric)) copy.push(numeric);
        }
        if (copy.length === 0) return 0;
    }

    const rawK = Math.floor(Number(k));
    const safeK = Number.isFinite(rawK)
        ? Math.max(0, Math.min(copy.length - 1, rawK))
        : 0;
    return _quickSelectInPlace(copy, safeK, 0, copy.length - 1);
};

const _quickSelectInPlace = (arr, k, left = 0, right = arr.length - 1) => {
    while (left < right) {
        let pivotIndex = partition(arr, left, right);
        if (pivotIndex === k) return arr[k];
        if (k < pivotIndex) right = pivotIndex - 1;
        else left = pivotIndex + 1;
    }
    return arr[k];
};

function partition(arr, left, right) {
    const pivotIndex = Math.floor((left + right) / 2);
    const pivot = arr[pivotIndex];
    let temp = arr[pivotIndex];
    arr[pivotIndex] = arr[right];
    arr[right] = temp;

    let storeIndex = left;
    for (let i = left; i < right; i++) {
        if (arr[i] < pivot) {
            temp = arr[storeIndex];
            arr[storeIndex] = arr[i];
            arr[i] = temp;
            storeIndex++;
        }
    }

    temp = arr[storeIndex];
    arr[storeIndex] = arr[right];
    arr[right] = temp;
    return storeIndex;
}

/**
 * Matemática Padrão de Percentil Contínuo (Linear Interpolation).
 * O valor deve interpolar entre as casas adjacentes quando a posição não for inteira.
 * [BUG-PERCENTIL-DISCRETO FIX]
 */
export const calculateInterpolatedPercentile = (arr, p) => {
    if (!arr || arr.length === 0) return 0;
    let cleanArr = arr.filter(Number.isFinite);
    if (cleanArr.length === 0) return 0;
    
    // BUG FIX: O array precisa ser ordenado antes de calcular índices de percentil
    cleanArr = cleanArr.sort((a, b) => a - b);
    
    if (cleanArr.length === 1) return cleanArr[0];
    if (p <= 0) return cleanArr[0];
    if (p >= 1) return cleanArr[cleanArr.length - 1];

    // Calculamos o índice exacto em ponto flutuante
    const exactIndex = p * (cleanArr.length - 1);
    
    // As "paredes" dos índices
    const lowerIndex = Math.floor(exactIndex);
    const upperIndex = Math.ceil(exactIndex);
    
    // A fracção remanescente (ex: se exactIndex = 9.5, weight = 0.5)
    const weight = exactIndex - lowerIndex;
    
    const lowerValue = cleanArr[lowerIndex];
    const upperValue = cleanArr[upperIndex];
    
    // Interpolação linear fina entre os dois limites da amostra discreta
    return lowerValue + weight * (upperValue - lowerValue);
};
