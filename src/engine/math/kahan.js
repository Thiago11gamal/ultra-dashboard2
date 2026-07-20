/**
 * Helper: verifica se o valor é um array-like iterável com .length
 * Suporta Array, Float64Array, Float32Array, Int32Array, etc.
 */
function isArrayLike(arr) {
    return arr != null && typeof arr.length === 'number' && arr.length >= 0;
}

/**
 * Algoritmo de Soma de Kahan (Kahan Summation Algorithm)
 * Minimiza o erro de ponto flutuante (IEEE 754) em somatórios de grandes séries.
 * 
 * @param {number[]|Float64Array|Float32Array} arr - Array de números para somar.
 * @returns {number} Soma matematicamente precisa.
 */
export function kahanSum(arr) {
    if (!isArrayLike(arr) || arr.length === 0) return 0;
    
    let sum = 0.0;
    let c = 0.0; // Um compensador para os bits de baixa ordem perdidos
    
    for (let i = 0; i < arr.length; i++) {
        const raw = arr[i];
        if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean' || (typeof raw === 'string' && raw.trim() === '')) continue;
        
        const val = Number(raw);
        if (!Number.isFinite(val)) continue;
        
        let y = val - c;     // c é zero na primeira iteração, depois carrega o erro anterior
        let t = sum + y;     // Adiciona o valor compensado à soma total
        c = (t - sum) - y;   // Calcula o erro de arredondamento desta iteração
        sum = t;             // Atualiza a soma principal
    }
    
    return sum;
}

/**
 * Calcula a média utilizando a Soma de Kahan para máxima precisão.
 * Suporta Array, Float64Array, Float32Array, etc.
 */
export function kahanMean(arr) {
    if (!isArrayLike(arr) || arr.length === 0) return 0;
    
    // Para TypedArrays, filtrar NaN/Infinity in-line sem .filter()
    let count = 0;
    let sum = 0.0;
    let c = 0.0;
    
    for (let i = 0; i < arr.length; i++) {
        const raw = arr[i];
        if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean' || (typeof raw === 'string' && raw.trim() === '')) continue;

        const val = Number(raw);
        if (!Number.isFinite(val)) continue;
        const y = val - c;
        const t = sum + y;
        c = (t - sum) - y;
        sum = t;
        count++;
    }
    
    return count === 0 ? 0 : sum / count;
}
