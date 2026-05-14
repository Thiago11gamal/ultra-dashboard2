/**
 * Algoritmo de Soma de Kahan (Kahan Summation Algorithm)
 * Minimiza o erro de ponto flutuante (IEEE 754) em somatórios de grandes séries.
 * 
 * @param {number[]} arr - Array de números para somar.
 * @returns {number} Soma matematicamente precisa.
 */
export function kahanSum(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    
    let sum = 0.0;
    let c = 0.0; // Um compensador para os bits de baixa ordem perdidos
    
    for (let i = 0; i < arr.length; i++) {
        const val = Number(arr[i]);
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
 */
export function kahanMean(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const clean = arr.filter(v => Number.isFinite(Number(v)));
    if (clean.length === 0) return 0;
    return kahanSum(clean) / clean.length;
}
