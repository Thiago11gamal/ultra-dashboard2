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

const PRESERVED_UPPER_TOKENS = new Set([
  'SRS', 'FSRS', 'RLM', 'TI', 'TIC', 'SUS', 'CLT', 'CF', 'STF', 'STJ', 'TCU',
  'INSS', 'FGTS', 'ICMS', 'ISS', 'CPC', 'CPP', 'CP', 'CC', 'CTN', 'LRF', 'AFO',
  'PDF', 'IA', 'AI', 'MC', 'ZDP', 'DRE', 'TCP', 'IP', 'OSI', 'SQL', 'HTML',
  'CSS', 'API', 'HTTP', 'HTTPS', 'LGPD'
]);

const ROMAN_NUMERAL_RX = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i;

const formatCoreSegment = (seg, isFirstWord) => {
  if (!seg) return '';
  const lower = seg.toLowerCase();
  const upper = seg.toUpperCase();
  if (!isFirstWord && PREPOSITIONS.has(lower)) {
    return lower;
  }
  if (PRESERVED_UPPER_TOKENS.has(upper) || ROMAN_NUMERAL_RX.test(seg)) {
    return upper;
  }
  return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
};

export const formatTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  return String(str)
    .split(' ')
    .filter(Boolean)
    .map((word, index) => {
        const match = word.match(/^([([{"']*)(.+?)([)\]}.,;:!?'"-]*)$/);
        if (!match) {
          return formatCoreSegment(word, index === 0);
        }
        const [, lead, core, trail] = match;
        const formattedCore = core.includes('/')
          ? core.split('/').map((part, pIdx) => formatCoreSegment(part, index === 0 && pIdx === 0 && !lead)).join('/')
          : formatCoreSegment(core, index === 0 && !lead);
        return `${lead}${formattedCore}${trail}`;
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

    const catList = Array.isArray(categories)
      ? categories
      : (categories && typeof categories === 'object' ? Object.values(categories) : []);

    if (catList.length > 0) {
      const normName = normalize(nameStr);

      const byId = catList.find(c => c && String(c.id) === nameStr);
      if (byId?.name) return byId.name;

      const byNormName = catList.find(c => c && normalize(c.name || '') === normName);
      if (byNormName?.name) return byNormName.name;

      const byNormId = catList.find(c => c && normalize(String(c.id || '')) === normName);
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


