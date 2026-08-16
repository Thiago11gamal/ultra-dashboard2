// 🔒 [SECURITY] Chave Gemini NUNCA deve ser usada no frontend.
// Todas as chamadas passam por um backend proxy autenticado.
// ROTA OBRIGATÓRIA: rotacione a chave Gemini atual imediatamente.

const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || '/api';
const AI_TIMEOUT_MS = Number(import.meta.env.VITE_AI_TIMEOUT_MS) || 60_000;

// ✅ FIX #1: Validação de URL para evitar requisições a endpoints inválidos
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return true;
  } catch {
    return false;
  }
}

export const AI_QUESTION_SCHEMA = {
  id: 'string',
  enunciado: 'string',
  alternativas: 'array de { letra: string, texto: string }',
  alternativa_correta: 'string (A, B, C ou D)',
  justificativa: 'string',
  materia: 'string',
  assunto: 'string',
  dificuldade: 'facil| medio| dificil| expert',
};

/**
 * Valida e sanitiza uma questão individual retornada pela IA.
 */
export function validateAIQuestion(question) {
  const VALID_LETTERS = ['A', 'B', 'C', 'D'];

  if (!question || typeof question !== 'object') return null;

  if (!question.enunciado || typeof question.enunciado !== 'string') return null;

  if (!Array.isArray(question.alternativas) || question.alternativas.length < 2) return null;

  const alternativas = question.alternativas
    .map((alt) => ({
      letra: String(alt?.letra || '').toUpperCase(),
      texto: String(alt?.texto || '').trim(),
    }))
    .filter((alt) => VALID_LETTERS.includes(alt.letra) && alt.texto.length > 0);

  const correta = String(question.alternativa_correta || '').toUpperCase();

  if (!VALID_LETTERS.includes(correta)) return null;
  if (!alternativas.some((alt) => alt.letra === correta)) return null;

  return {
    id: String(question.id || crypto.randomUUID()),
    enunciado: question.enunciado.trim(),
    alternativas,
    alternativa_correta: correta,
    justificativa: typeof question.justificativa === 'string' ? question.justificativa.trim() : '',
    materia: typeof question.materia === 'string' ? question.materia.trim() : '',
    assunto: typeof question.assunto === 'string' ? question.assunto.trim() : '',
    dificuldade: ['facil', 'medio', 'dificil', 'expert'].includes(question.dificuldade)
      ? question.dificuldade
      : 'medio',
  };
}

/**
 * Valida array de questões retornadas pela IA.
 */
export function validateAIQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map(validateAIQuestion).filter(Boolean);
}

/**
 * Gera questões via backend proxy (NUNCA usa chave Gemini no frontend).
 * O backend é responsável por autenticar com Gemini.
 */
export async function generateViaGeminiDirect({
  materia,
  assunto,
  dificuldade,
  quantidade,
  contestName,
  signal,
}) {
  // ✅ FIX #1: Validar URL antes de fazer requisição
  if (!isValidUrl(AI_BACKEND_URL)) {
    throw new Error(`URL inválida do backend de IA: ${AI_BACKEND_URL}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(`${AI_BACKEND_URL}/ai/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({ materia, assunto, dificuldade, quantidade, contestName }),
    });

    if (!response.ok) {
      throw new Error(`Backend AI retornou ${response.status}`);
    }

    const data = await response.json();
    const questions = data.questions ?? [];
    return validateAIQuestions(questions);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Gera questões via backend próprio (fallback quando Gemini não está disponível).
 */
export async function generateViaBackend({
  materia,
  assunto,
  dificuldade,
  quantidade,
  contestName,
  signal,
}) {
  if (!isValidUrl(AI_BACKEND_URL)) {
    throw new Error(`URL inválida do backend: ${AI_BACKEND_URL}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(`${AI_BACKEND_URL}/ai/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({ materia, assunto, dificuldade, quantidade, contestName }),
    });

    if (!response.ok) {
      throw new Error(`Backend retornou ${response.status}`);
    }

    const data = await response.json();
    return validateAIQuestions(data.questions ?? []);
  } finally {
    clearTimeout(timeoutId);
  }
}
