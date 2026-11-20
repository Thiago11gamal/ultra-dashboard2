import { auth } from './firebase';
import { sanitizePlainText } from '../utils/sanitizeText';

// 🔒 [SECURITY] Chave Gemini NUNCA deve ser usada no frontend.
// Todas as chamadas passam por um backend proxy autenticado.
// ROTA OBRIGATÓRIA: rotacione a chave Gemini atual imediatamente.

const AI_BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_BACKEND_URL) || '/api';
const AI_TIMEOUT_MS = Number(typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_TIMEOUT_MS) || 60_000;

function isValidUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const base = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : undefined;
    const parsed = base ? new URL(trimmed, base) : new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveAIEndpoint(baseUrl = AI_BACKEND_URL) {
  const clean = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (clean.endsWith('/ai/generate-questions') || clean.endsWith('/generate-questions')) {
    return clean;
  }
  if (clean.endsWith('/ai')) {
    return `${clean}/generate-questions`;
  }
  return `${clean}/ai/generate-questions`;
}

// ✅ FIX S02: credentials deve ser 'same-origin' por padrão.
// Se o backend for cross-origin, o backend deve configurar CORS
// explicitamente e o frontend deve usar 'include' apenas quando necessário.
const isSameOrigin = (() => {
  try {
    if (typeof window === 'undefined' || !window.location?.origin) return true;
    const backendUrl = new URL(AI_BACKEND_URL, window.location.origin);
    return backendUrl.origin === window.location.origin;
  } catch {
    return false;
  }
})();

function safeRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ai-q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const AI_QUESTION_SCHEMA = {
  id: 'string',
  enunciado: 'string',
  alternativas: 'array de { letra: string, texto: string }',
  alternativa_correta: 'string (A, B, C, D ou E)',
  justificativa: 'string',
  materia: 'string',
  assunto: 'string',
  dificuldade: 'facil| medio| dificil| expert',
};

/**
 * Valida e sanitiza uma questão individual retornada pela IA.
 */
export function validateAIQuestion(question) {
  const VALID_LETTERS = ['A', 'B', 'C', 'D', 'E'];

  if (!question || typeof question !== 'object') return null;

  if (!question.enunciado || typeof question.enunciado !== 'string') return null;

  if (!Array.isArray(question.alternativas) || question.alternativas.length < 2) return null;

  const sanitizeInline = (text) => sanitizePlainText(text);

  const seenLetters = new Set();
  const alternativas = question.alternativas
    .map((alt) => {
      const rawLetra = String(alt?.letra || '').trim().toUpperCase();
      const cleanLetra = VALID_LETTERS.includes(rawLetra)
        ? rawLetra
        : rawLetra.replace(/[^A-E]/g, '').slice(0, 1);
      return {
        letra: cleanLetra,
        texto: sanitizeInline(alt?.texto || alt?.label || alt?.text || ''),
      };
    })
    .filter((alt) => {
      if (!VALID_LETTERS.includes(alt.letra) || alt.texto.length === 0 || seenLetters.has(alt.letra)) return false;
      seenLetters.add(alt.letra);
      return true;
    });

  const rawCorreta = String(question.alternativa_correta || '').trim().toUpperCase();
  const correta = VALID_LETTERS.includes(rawCorreta) ? rawCorreta : rawCorreta.replace(/[^A-E]/g, '').slice(0, 1);

  if (!VALID_LETTERS.includes(correta)) return null;
  if (!alternativas.some((alt) => alt.letra === correta)) return null;

  return {
    id: String(question.id || safeRandomId()),
    enunciado: sanitizeInline(question.enunciado),
    alternativas,
    alternativa_correta: correta,
    justificativa: sanitizeInline(question.justificativa),
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

async function requestAIQuestions({
  materia,
  assunto,
  dificuldade,
  quantidade,
  contestName,
  examBoard,
  signal,
  errorLabel = 'Backend AI',
}) {
  if (!isValidUrl(AI_BACKEND_URL)) {
    throw new Error(`URL inválida do ${errorLabel}: ${AI_BACKEND_URL}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const handleAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', handleAbort);
    }
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    try {
      const token = await auth?.currentUser?.getIdToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // ignore token retrieval error
    }

    const response = await fetch(resolveAIEndpoint(AI_BACKEND_URL), {
      method: 'POST',
      headers,
      credentials: isSameOrigin ? 'same-origin' : 'omit',
      signal: controller.signal,
      body: JSON.stringify({
        materia,
        assunto,
        dificuldade,
        quantidade,
        contestName,
        ...(examBoard ? { examBoard } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`${errorLabel} retornou ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('text/json'))) {
      throw new Error(`Resposta do ${errorLabel} não é JSON: ${contentType}`);
    }

    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error(`Resposta inválida do ${errorLabel} (JSON parsing error)`);
    }
    const questions = data.questions ?? [];
    return validateAIQuestions(questions);
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', handleAbort);
    }
  }
}

/**
 * Gera questões via backend proxy (NUNCA usa chave Gemini no frontend).
 * O backend é responsável por autenticar com Gemini.
 */
export async function generateViaGeminiDirect(params) {
  return requestAIQuestions({ ...params, errorLabel: 'Backend AI' });
}

/**
 * Gera questões via backend próprio (fallback quando Gemini não está disponível).
 */
export async function generateViaBackend(params) {
  return requestAIQuestions({ ...params, errorLabel: 'Backend' });
}

/**
 * API pública compatível com o restante do app.
 * Todas as requisições passam pelo proxy backend autenticado em chamada única
 * (evita POST duplicado no mesmo endpoint em caso de erro).
 */
export async function generateAIQuestions(params = {}) {
  const payload = params || {};
  const questions = await generateViaBackend(payload);
  return validateAIQuestions(questions || []);
}

export default {
  AI_QUESTION_SCHEMA,
  validateAIQuestion,
  validateAIQuestions,
  generateViaGeminiDirect,
  generateViaBackend,
  generateAIQuestions,
};

