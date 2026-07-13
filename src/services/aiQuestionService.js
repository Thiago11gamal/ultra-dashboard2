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

// O frontend agora chama SEU backend, não a API da OpenAI/Gemini diretamente.
const AI_BACKEND_URL = import.meta.env.VITE_API_BACKEND_URL || 'https://sua-cloud-function-url.com/generateQuestions';

export async function generateAIQuestions({ materia, assunto, dificuldade, quantidade = 10, contestName = 'Concurso Público' }) {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) throw new Error('Usuário não autenticado.');

  // Pega o token JWT do Firebase para provar ao seu backend quem está pedindo
  const token = await user.getIdToken();

  try {
    const response = await fetch(AI_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Autenticação segura
      },
      body: JSON.stringify({ materia, assunto, dificuldade, quantidade, contestName })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Erro ao gerar questões no servidor.');
    }

    const data = await response.json();
    return data.questions; // O backend já deve retornar o JSON limpo e normalizado
  } catch (error) {
    logger.error('[AI Service] Erro:', error);
    throw error;
  }
}
