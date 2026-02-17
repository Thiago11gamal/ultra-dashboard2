/**
 * Normalizes a string for consistent matching across the application.
 * Removes accents, converts to lowercase, trims whitespace, and removes common prefixes.
 * 
 * @param {string} str - The string to normalize
 * @returns {string} - The normalized string
 */
export const normalize = (str) => {
    if (typeof str !== 'string') return '';
    return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/noções de\s+/i, "") // Remove common prefix
        .replace(/[^\w\s]/gi, '') // Remove special chars for safer matching
        .trim();
};

/**
 * Map of aliases for common subjects.
 * Keys should be the normalized version of the canonical subject name (as if it was in Dashboard).
 * Values are arrays of alternative names (also normalized potentially, but usually raw variations).
 */
export const aliases = {
    'informatica': ['noções de informática', 'info', 'computação'],
    'raciocinio logico': ['rlm', 'raciocínio lógico matemático', 'raciocinio logico quantitativo'],
    'etica no servico publico': ['etica', 'ética no serviço público', 'ética'],
    'direito constitucional': ['const', 'constitucional'],
    'direito administrativo': ['adm', 'administrativo'],
    'lingua portuguesa': ['portugues', 'português', 'pt'],
};
