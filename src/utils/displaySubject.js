import { normalize } from './normalization';

const SUBJECT_MAP = {
    'matematica': 'Matemática',
    'portugues': 'Português',
    'lingua portuguesa': 'Português',
    'ingles': 'Inglês',
    'ciencias': 'Ciências',
    'historia': 'História',
    'geografia': 'Geografia',
    'biologia': 'Biologia',
    'fisica': 'Física',
    'quimica': 'Química',
    'filosofia': 'Filosofia',
    'sociologia': 'Sociologia',
    'literatura': 'Literatura',
    'redacao': 'Redação',
    'informatica': 'Informática',
    'noções de informática': 'Informática',
    'raciocinio logico': 'Raciocínio Lógico',
    'rlm': 'Raciocínio Lógico',
    'direito constitucional': 'Dir. Constitucional',
    'dir constitucional': 'Dir. Constitucional',
    'dir. constitucional': 'Dir. Constitucional',
    'direito administrativo': 'Dir. Administrativo',
    'dir administrativo': 'Dir. Administrativo',
    'dir. administrativo': 'Dir. Administrativo'
};

const PREPOSITIONS = new Set(['e', 'de', 'do', 'da', 'dos', 'das', 'com', 'em', 'no', 'na', 'por', 'para']);

export const formatTitleCase = (str) => {
    if (!str || typeof str !== 'string') return '';
    return String(str)
        .split(' ')
        .filter(Boolean)
        .map((word, index) => {
            const lower = word.toLowerCase();
            if (index > 0 && PREPOSITIONS.has(lower)) {
                return lower;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
};

/**
 * Canonical display name resolver for subjects.
 * Single source of truth — respects 'Meu Painel' categories if provided.
 */
export const displaySubject = (name, categories = []) => {
    if (!name) return '';
    const nameStr = typeof name === 'object' && name.name ? String(name.name) : String(name);
    if (!nameStr.trim()) return '';

    if (Array.isArray(categories) && categories.length > 0) {
        const normName = normalize(nameStr);
        const match = categories.find(c => c && (c.id === nameStr || normalize(c.name || '') === normName));
        if (match && match.name) return match.name;
    }
    const norm = normalize(nameStr);
    return SUBJECT_MAP[norm] || formatTitleCase(nameStr);
};

