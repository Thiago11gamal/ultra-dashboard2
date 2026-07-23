/**
 * Normalizes a string for consistent matching across the application.
 * Removes accents, converts to lowercase, trims whitespace, and removes common prefixes.
 * 
 * @param {string} str - The string to normalize
 * @returns {string} - The normalized string
 */
export const normalize = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .normalize('NFKC')              // Use NFKC for better compatibility matching
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "") // eslint-disable-line no-control-regex
        .replace(/nocoes de\s+/g, "")    // Remove common prefix
        .replace(/[^\p{L}\p{N}\s]/gu, '') // Keep all letters (unicode) and numbers
        .replace(/\s+/g, ' ')           // Collapse multiple spaces
        .trim();
};

/**
 * Map of aliases for common subjects.
 * Keys should be the normalized version of the canonical subject name (as if it was in Dashboard).
 * Values are arrays of alternative names (also normalized potentially, but usually raw variations).
 */
export const aliases = {
    'informatica': ['noções de informática', 'info', 'computação', 'ti', 'tecnologia da informação', 'informática'],
    'raciocinio logico': ['rlm', 'raciocínio lógico matemático', 'raciocinio logico quantitativo', 'rl', 'lógica', 'raciocínio'],
    'etica no servico publico': ['etica', 'ética no serviço público', 'ética', 'ética e cidadania'],
    'direito constitucional': ['const', 'constitucional', 'dir. const', 'd. const', 'constituição', 'dir const'],
    'direito administrativo': ['adm', 'administrativo', 'dir. adm', 'd. adm', 'adm pública', 'dir adm'],
    'lingua portuguesa': ['portugues', 'português', 'pt', 'gramática', 'interpretação de textos', 'port.'],
    'atualidades': ['conhecimentos gerais', 'mundo atual', 'geopolítica'],
    'direito penal': ['penal', 'dir. penal', 'd. penal', 'dp', 'dir penal'],
    'direito processual penal': ['processo penal', 'dpp', 'dir. proc. penal', 'dir proc penal'],
    'direitos humanos': ['dh', 'humanos', 'd. humanos'],
    'direito civil': ['civil', 'dir. civil', 'd. civil', 'dc', 'dir civil'],
    'direito processual civil': ['processo civil', 'dpc', 'dir. proc. civil', 'dir proc civil']
};

/**
 * Verifica se duas matérias correspondem, considerando o nome normalizado e os aliases.
 */
export const isSubjectMatch = (name1, name2) => {
    if (!name1 || !name2) return false;
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    if (n1 === n2) return true;
    
    // Check if n2 is an alias of n1 (where n1 is a canonical key)
    if (aliases[n1] && aliases[n1].some(a => normalize(a) === n2)) return true;
    // Check if n1 is an alias of n2 (where n2 is a canonical key)
    if (aliases[n2] && aliases[n2].some(a => normalize(a) === n1)) return true;
    
    // Check if both are aliases of the same canonical key
    for (const [canonical, aliasList] of Object.entries(aliases)) {
        const hasN1 = n1 === canonical || aliasList.some(a => normalize(a) === n1);
        const hasN2 = n2 === canonical || aliasList.some(a => normalize(a) === n2);
        if (hasN1 && hasN2) return true;
    }
    
    return false;
};
/**
 * Normaliza um valor evitando divisão por zero e garantindo limites entre 0 e 1.
 * Se o máximo e o mínimo forem iguais (ex: primeira semana do aluno), 
 * assume-se o percentil 50% (0.5) para evitar distorções no gráfico.
 */
export const safeNormalize = (val, max, min) => {
    // Tratamento de edge case crítico
    if (typeof val !== 'number' || isNaN(val)) return 0;
    if (!Number.isFinite(max) || !Number.isFinite(min)) return 0;
    if (max === min) return 0.5; 
    
    const normalized = (val - min) / (max - min);
    
    // Clamping para evitar explodir a escala (valores > 1 ou < 0)
    return Math.max(0, Math.min(1, normalized));
};

/**
 * Divisão segura global para evitar Infinity ou NaN.
 */
export const safeDivide = (numerator, denominator, fallback = 0) => {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return fallback;
    const result = numerator / denominator;
    return Number.isFinite(result) ? result : fallback;
};
