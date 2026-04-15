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
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "") // Remove non-printable/control chars
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
