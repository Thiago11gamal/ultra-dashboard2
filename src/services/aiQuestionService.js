// src/services/aiQuestionService.js
/**
 * Serviço de Geração de Questões via IA (OpenAI / Gemini compatível)
 * 
 * IMPORTANTE: 
 * - Configure VITE_OPENAI_API_KEY ou VITE_GEMINI_API_KEY no .env
 * - O prompt força saída em JSON estrito para compatibilidade com o sistema.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

/**
 * Estrutura esperada do JSON retornado pela IA (compatível com agregação do sistema)
 */
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

/**
 * Extrai JSON limpo de uma resposta raw da IA
 */
function extractJson(raw) {
  if (!raw) return '{}';
  let s = String(raw).trim();
  // Strip markdown code fences
  s = s.replace(/^```(?:json)?\s*|\s*```$/g, '');
  // Find first { ... } block
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  // Remove trailing commas (common LLM issue)
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

/**
 * Normaliza e valida as questões retornadas pela IA
 */
function normalizeQuestions(rawQuestions, materia, assunto, dificuldade, qtd) {
  const letras = ['A', 'B', 'C', 'D'];
  
  return rawQuestions
    .filter(q => q && q.enunciado && Array.isArray(q.alternativas) && q.alternativa_correta)
    .map((q, idx) => {
      let alts = (q.alternativas || []).slice(0, 4);
      alts = letras.map((letra, i) => {
        const orig = alts[i] || {};
        return {
          letra,
          texto: String(orig.texto || orig || `Opção ${letra}`).trim()
        };
      });
      let correta = String(q.alternativa_correta || '').toUpperCase().trim().replace(/[^A-D]/g, '');
      if (!letras.includes(correta)) correta = 'A';
      return {
        id: q.id || `ai-${Date.now()}-${idx}`,
        enunciado: String(q.enunciado).trim(),
        alternativas: alts,
        alternativa_correta: correta,
        justificativa: String(q.justificativa || 'Justificativa não fornecida.').trim(),
        materia: q.materia || materia,
        assunto: q.assunto || assunto,
        dificuldade: q.dificuldade || dificuldade
      };
    })
    .slice(0, qtd);
}

/**
 * Gera questões usando IA
 * @param {Object} params
 * @param {string} params.materia
 * @param {string} params.assunto
 * @param {'facil'|'medio'|'dificil'|'expert'} params.dificuldade
 * @param {number} params.quantidade
 * @returns {Promise<Array>} Array de questões no formato acima
 */
export async function generateAIQuestions({ materia, assunto, dificuldade, quantidade = 10 }) {
  if (!materia || !assunto) {
    throw new Error('Matéria e Assunto são obrigatórios');
  }

  const qtd = Math.min(Math.max(3, parseInt(quantidade, 10) || 10), 20);

  const systemPrompt = `Você é um gerador profissional de questões de concursos públicos brasileiros (CESPE, FCC, FGV, etc).
Retorne **exclusivamente** um JSON válido no seguinte formato (sem markdown, sem texto fora do JSON):
{
  "questoes": [
    {
      "id": "string único",
      "enunciado": "texto da questão",
      "alternativas": [ { "letra": "A", "texto": "..." }, { "letra": "B", "texto": "..." }, { "letra": "C", "texto": "..." }, { "letra": "D", "texto": "..." } ],
      "alternativa_correta": "A",
      "justificativa": "explicação clara",
      "materia": "${materia}",
      "assunto": "${assunto}",
      "dificuldade": "${dificuldade}"
    }
  ]
}
Gere exatamente ${qtd} questões.`;

  const userPrompt = `Gere ${qtd} questões de nível ${dificuldade} sobre "${assunto}" na matéria "${materia}".`;

  const hasOpenAI = !!import.meta.env.VITE_OPENAI_API_KEY;
  const hasGemini = !!import.meta.env.VITE_GEMINI_API_KEY;

  if (!hasOpenAI && !hasGemini) {
    throw new Error('API key não configurada. Defina VITE_GEMINI_API_KEY ou VITE_OPENAI_API_KEY no .env e reinicie o servidor.');
  }

  const maxRetries = 2;

  const makeRequest = async (attempt = 1) => {
    try {
      // === OPENAI ===
      if (hasOpenAI) {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
          })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error?.message || `Erro na API OpenAI (HTTP ${response.status})`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '{}';
        content = extractJson(content);

        const parsed = JSON.parse(content);
        let questions = Array.isArray(parsed) ? parsed : (parsed.questoes || []);
        questions = normalizeQuestions(questions, materia, assunto, dificuldade, qtd);

        if (questions.length === 0) {
          throw new Error('A IA não retornou questões válidas após processamento.');
        }

        return questions;
      }

      // === GEMINI ===
      if (hasGemini) {
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}\n\nResponda APENAS com o JSON.`;

        console.log('[AI Service] Chamando Gemini API...');
        
        const response = await fetch(`${GEMINI_API_URL}?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json'
            }
          })
        });

        if (!response.ok) {
          // Extract detailed error from Gemini response
          let errorDetail = `HTTP ${response.status}`;
          try {
            const errBody = await response.json();
            errorDetail = errBody?.error?.message || errorDetail;
          } catch { /* ignore parse error */ }
          throw new Error(`Erro na API Gemini: ${errorDetail}`);
        }

        const data = await response.json();
        
        // Gemini 3 Flash returns thinking in separate parts — find the text part
        const parts = data.candidates?.[0]?.content?.parts || [];
        let textContent = '';
        for (const part of parts) {
          if (part.text && !part.thought) {
            textContent = part.text;
            break;
          }
        }
        // Fallback: if no non-thought part found, use first part with text
        if (!textContent) {
          textContent = parts.find(p => p.text)?.text || '{}';
        }
        
        console.log('[AI Service] Gemini respondeu com', textContent.length, 'chars');
        
        const cleaned = extractJson(textContent);
        const parsed = JSON.parse(cleaned);
        let questions = Array.isArray(parsed) ? parsed : (parsed.questoes || []);
        questions = normalizeQuestions(questions, materia, assunto, dificuldade, qtd);

        if (questions.length === 0) {
          throw new Error('A IA Gemini não retornou questões válidas. Tente novamente.');
        }

        return questions;
      }

      throw new Error('Nenhuma API key de IA configurada.');
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`[AI Service] Tentativa ${attempt} falhou: ${error.message}. Retentando...`);
        await new Promise(r => setTimeout(r, 1200));
        return makeRequest(attempt + 1);
      }
      console.error('[AI Service] Erro final ao gerar questões:', error);
      throw new Error(error.message || 'Falha ao gerar questões com IA após múltiplas tentativas.');
    }
  };

  return await makeRequest(1);
}
