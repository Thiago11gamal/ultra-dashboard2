import DOMPurify from 'dompurify';

const HTML_BLOCK_RE = /<\s*(script|style|iframe|object|embed|form|svg)\b[^>]*>[\s\S]*?(?:<\s*\/\s*\1\s*>|$)/gi;
const HTML_TAG_OR_COMMENT_RE = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/?[a-zA-Z][a-zA-Z0-9:-]*(?:\s+[^>]*)?\/?>/;

function decodeBasicEntities(text) {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripControlChars(str) {
  let out = '';
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
      continue;
    }
    out += str[i];
  }
  return out;
}

/**
 * Sanitiza strings exibidas em texto puro (JSX/CSV/estado) removendo tags e blocos
 * HTML/script sem corromper entidades literais (&) nem expressões matemáticas (x < 5 e y > 2).
 *
 * @param {unknown} input
 * @returns {string}
 */
export function sanitizePlainText(input) {
  if (input === null || input === undefined) return '';
  let cleaned = stripControlChars(String(input));

  // Remove blocos ativos inteiros (mesmo que o fechamento esteja malformado)
  cleaned = cleaned.replace(HTML_BLOCK_RE, '');

  // Só invoca DOMPurify quando há estrutura de tag/comentário HTML real, preservando "A & B" e "x < 5 e y > 2"
  if (HTML_TAG_OR_COMMENT_RE.test(cleaned)) {
    const stripped = DOMPurify.sanitize(cleaned, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
    cleaned = decodeBasicEntities(stripped);
  }

  return cleaned.trim();
}
