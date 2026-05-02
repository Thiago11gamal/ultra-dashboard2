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
    'raciocinio logico': 'Raciocínio Lógico',
    'direito constitucional': 'Dir. Constitucional',
    'direito administrativo': 'Dir. Administrativo'
};

/**
 * Canonical display name resolver for subjects.
 * Single source of truth — previously duplicated in 4+ files.
 */
export const displaySubject = (name) => {
    if (!name) return '';
    const norm = normalize(name);
    return SUBJECT_MAP[norm] || (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
};
