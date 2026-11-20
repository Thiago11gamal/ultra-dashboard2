/**
 * syllabusParser.js
 *
 * Parser inteligente de edital verticalizado (texto colado de PDF/site).
 * Detecta disciplinas, pesos `(peso 20)`, blocos (`Conhecimentos Básicos` / `Específicos` / `Discursiva`)
 * e tópicos numerados ou em lista, pronto para importar para o concurso ativo.
 */

const GROUP_HEADERS = [
  { regex: /conhecimentos?\s+b[aá]sicos?|bloco\s*1|gerais/i, group: 'basicos' },
  { regex: /conhecimentos?\s+espec[ií]ficos?|bloco\s*2/i, group: 'especificos' },
  { regex: /prova\s+discursiva|discursiva|reda[cç][aã]o/i, group: 'discursiva' },
];

const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#3b82f6',
];

function extractWeight(line) {
  const m = line.match(/\(?\s*peso\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*\)?/i);
  if (!m) return { clean: line, weight: null };
  const weight = Number(m[1].replace(',', '.'));
  const clean = line.replace(m[0], '').trim();
  return { clean, weight: Number.isFinite(weight) && weight > 0 ? weight : null };
}

function isLikelySubjectHeader(rawLine, nextLine = '') {
  const line = rawLine.trim();
  if (!line || line.length > 90) return false;
  // Explicit markdown heading or trailing colon: "## Direito Penal" or "DIREITO PENAL:"
  if (/^#{1,3}\s+/.test(line) || /:$/.test(line)) return true;
  // Explicit weight tag on a non-bullet line
  if (/\bpeso\s*[:=]?\s*\d+/i.test(line) && !/^[-•*]|\d+\./.test(line)) return true;
  // ALL CAPS title without bullet prefix (e.g. "LÍNGUA PORTUGUESA")
  const letters = line.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  if (
    letters.length >= 4 &&
    letters === letters.toUpperCase() &&
    !/^\d+[.)]\s+/.test(line) &&
    !/^[-•*]\s+/.test(line)
  ) {
    return true;
  }
  // Standalone short title followed by numbered/bulleted subtopics
  if (
    !/^\d+[.)]\s+/.test(line) &&
    !/^[-•*]\s+/.test(line) &&
    line.length <= 55 &&
    /^(?:[-•*]|\d+[.)])\s+/.test(String(nextLine || '').trim())
  ) {
    return true;
  }
  return false;
}

function cleanSubjectName(line) {
  return line
    .replace(/^#{1,3}\s+/, '')
    .replace(/:\s*$/, '')
    .replace(/^\s*[-•*]\s+/, '')
    .trim();
}

function cleanTopicText(line) {
  return line
    .replace(/^\s*(?:[-•*]|\d+(?:\.\d+)*[.)]?)\s+/, '')
    .replace(/;\s*$/, '')
    .trim();
}

/**
 * Converte texto de edital verticalizado em lista estruturada de disciplinas e assuntos.
 * @param {string} rawText
 * @returns {Array<{ name: string, weight: number, examGroup: string, color: string, tasks: Array<{ text: string, priority: string }> }>}
 */
export function parseVerticalizedSyllabus(rawText = '') {
  const lines = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const categories = [];
  let currentGroup = '';
  let currentCat = null;

  const ensureCategory = (name, weight = null) => {
    const cleanName = cleanSubjectName(name);
    if (!cleanName) return null;
    const existing = categories.find((c) => c.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      if (weight != null) existing.weight = weight;
      return existing;
    }
    const created = {
      name: cleanName,
      weight: weight ?? 10,
      examGroup: currentGroup || '',
      color: PALETTE[categories.length % PALETTE.length],
      tasks: [],
    };
    categories.push(created);
    return created;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';

    // Check if it is a pure exam-group section header (e.g. "CONHECIMENTOS BÁSICOS")
    const matchedGroup = GROUP_HEADERS.find((g) => g.regex.test(line) && line.length <= 45);
    if (matchedGroup && !/^[-•*]|\d+\./.test(line)) {
      currentGroup = matchedGroup.group;
      continue;
    }

    // Inline "Matéria: tópico 1; tópico 2; tópico 3"
    const colonParts = line.split(':');
    if (colonParts.length === 2 && colonParts[0].trim().length <= 50 && colonParts[1].includes(';')) {
      const { clean, weight } = extractWeight(colonParts[0]);
      currentCat = ensureCategory(clean, weight);
      const splitTopics = colonParts[1].split(';').map((t) => cleanTopicText(t)).filter((t) => t.length >= 2);
      splitTopics.forEach((t) => {
        if (currentCat && !currentCat.tasks.some((x) => x.text.toLowerCase() === t.toLowerCase())) {
          currentCat.tasks.push({ text: t.slice(0, 160), priority: 'medium' });
        }
      });
      continue;
    }

    if (isLikelySubjectHeader(line, nextLine)) {
      const { clean, weight } = extractWeight(line);
      currentCat = ensureCategory(clean, weight);
      continue;
    }

    const topicText = cleanTopicText(line);
    if (!topicText || topicText.length < 2) continue;

    if (!currentCat) {
      currentCat = ensureCategory('Disciplina Geral');
    }

    // Support semicolon-separated dense syllabus paragraphs
    const pieces = topicText.includes(';') && topicText.length > 70
      ? topicText.split(';').map((p) => p.trim()).filter((p) => p.length >= 2)
      : [topicText];

    pieces.forEach((piece) => {
      if (!currentCat.tasks.some((x) => x.text.toLowerCase() === piece.toLowerCase())) {
        currentCat.tasks.push({ text: piece.slice(0, 160), priority: 'medium' });
      }
    });
  }

  return categories.filter((c) => c.tasks.length > 0 || categories.length === 1);
}

export default {
  parseVerticalizedSyllabus,
};
