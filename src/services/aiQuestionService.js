import logger from '../utils/logger.js';
import { getAuth } from 'firebase/auth';

export const AI_QUESTION_SCHEMA = {
  id: 'string',
  enunciado: 'string',
  alternativas: 'array de { letra: string, texto: string }',
  alternativa_correta: 'string (A, B, C ou D)',
  justificativa: 'string',
  materia: 'string',
  assunto: 'string',
  dificuldade: 'facil | medio | dificil | expert'
};

const AI_BACKEND_URL = import.meta.env.VITE_API_BACKEND_URL || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

async function generateViaGeminiDirect({ materia, assunto, dificuldade, quantidade, contestName, apiKey }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

  const prompt = `Você é uma banca examinadora especialista em concursos públicos (nível: ${contestName}).
Elabore exatamente ${quantidade} questões inéditas e realistas de múltipla escolha sobre:
- Matéria: "${materia}"
- Assunto: "${assunto}"
- Nível de Dificuldade: "${dificuldade}"

Requisitos obrigatórios:
1. Retorne estritamente um array JSON válido contendo exatamente ${quantidade} objetos de questão.
2. Cada questão deve possuir o seguinte formato exato:
{
  "id": "q1",
  "enunciado": "Texto claro do enunciado da questão...",
  "alternativas": [
    { "letra": "A", "texto": "Alternativa A..." },
    { "letra": "B", "texto": "Alternativa B..." },
    { "letra": "C", "texto": "Alternativa C..." },
    { "letra": "D", "texto": "Alternativa D..." }
  ],
  "alternativa_correta": "A",
  "justificativa": "Explicação completa e didática do porquê a alternativa correta está certa e as outras erradas.",
  "materia": "${materia}",
  "assunto": "${assunto}",
  "dificuldade": "${dificuldade}"
}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    let errMsg = 'Erro na API do Gemini';
    try {
      const errJson = await response.json();
      errMsg = errJson?.error?.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(`Erro na API do Gemini (${response.status}): ${errMsg}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('A IA não retornou conteúdo válido.');
  }

  let questions;
  try {
    let cleanText = text.trim();
    // Remove markdown code blocks if present
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    }
    questions = JSON.parse(cleanText);
  } catch (e) {
    throw new Error('Não foi possível interpretar a resposta JSON gerada pela IA.');
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('A IA não retornou uma lista de questões válida.');
  }

  return questions;
}

export async function generateAIQuestions({ materia, assunto, dificuldade, quantidade = 10, contestName = 'Concurso Público' }) {
  const hasCustomBackend = AI_BACKEND_URL && !AI_BACKEND_URL.includes('sua-cloud-function-url.com');

  if (hasCustomBackend) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado para gerar questões via servidor.');

    const token = await user.getIdToken();
    try {
      const response = await fetch(AI_BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ materia, assunto, dificuldade, quantidade, contestName })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erro ao gerar questões no servidor.');
      }

      const data = await response.json();
      return data.questions;
    } catch (error) {
      logger.error('[AI Service] Erro:', error);
      throw error;
    }
  }

  if (GEMINI_API_KEY) {
    try {
      return await generateViaGeminiDirect({
        materia,
        assunto,
        dificuldade,
        quantidade,
        contestName,
        apiKey: GEMINI_API_KEY
      });
    } catch (error) {
      logger.error('[AI Service Direct Gemini] Erro:', error);
      throw error;
    }
  }

  throw new Error('Configure sua chave de API (VITE_GEMINI_API_KEY) ou URL de backend (VITE_API_BACKEND_URL) no arquivo .env.');
}
