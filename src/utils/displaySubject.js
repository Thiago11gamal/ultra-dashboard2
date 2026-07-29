import { normalize } from './normalization';

const SUBJECT_MAP = {
  'matematica': 'Matemática',
  'matematica financeira': 'Matemática Financeira',
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
  'nocoes de informatica': 'Informática',
  'raciocinio logico': 'Raciocínio Lógico',
  'rlm': 'Raciocínio Lógico',
  'estatistica': 'Estatística',
  'direito constitucional': 'Dir. Constitucional',
  'dir constitucional': 'Dir. Constitucional',
  'direito administrativo': 'Dir. Administrativo',
  'dir administrativo': 'Dir. Administrativo',
  'direito penal': 'Dir. Penal',
  'direito processual penal': 'Dir. Processual Penal',
  'direito civil': 'Dir. Civil',
  'direito processual civil': 'Dir. Processual Civil',
  'direito do trabalho': 'Dir. do Trabalho',
  'direito tributario': 'Dir. Tributário'
};

const TOPIC_MAP = {
  'rlm': 'Raciocínio Lógico',
  'ti': 'Tecnologia da Informação',
  'tic': 'TIC',
  'sus': 'SUS',
  'clt': 'CLT'
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

        const byId = categories.find(c => c && String(c.id) === nameStr);
        if (byId?.name) return byId.name;

        const byNormName = categories.find(c => c && normalize(c.name || '') === normName);
        if (byNormName?.name) return byNormName.name;

        const byNormId = categories.find(c => c && normalize(String(c.id || '')) === normName);
        if (byNormId?.name) return byNormId.name;
    }
    const norm = normalize(nameStr);
    return SUBJECT_MAP[norm] || formatTitleCase(nameStr);
};

export const displayTopic = (name) => {
  const str = String(name || '').trim();
  if (!str) return '';

  const norm = normalize(str);

  if (TOPIC_MAP[norm]) return TOPIC_MAP[norm];

  if (/^[A-Z0-9]{2,6}$/i.test(str) && str === str.toUpperCase()) {
    return str;
  }

  return formatTitleCase(str);
};

