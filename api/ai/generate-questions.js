// Vercel Serverless Function — Proxy seguro para geração de questões via Google Gemini
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function extractJsonText(raw) {
  if (!raw) return '[]';
  let cleaned = String(raw).trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*|\s*```$/g, '');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBracket !== -1 && lastBracket > firstBracket && (firstBrace === -1 || firstBracket < firstBrace)) {
    cleaned = cleaned.slice(firstBracket, lastBracket + 1);
  } else if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned.replace(/,\s*([}\]])/g, '$1');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Chave GEMINI_API_KEY não configurada nas variáveis de ambiente da Vercel.',
    });
  }

  const {
    materia = '',
    assunto = '',
    dificuldade = 'medio',
    quantidade = 5,
    contestName = 'Concurso Público',
  } = req.body || {};

  if (!materia || !assunto) {
    return res.status(400).json({ error: 'Campos "materia" e "assunto" são obrigatórios.' });
  }

  const qtd = Math.min(Math.max(1, Number(quantidade) || 5), 20);
  const nivel = ['facil', 'medio', 'dificil', 'expert'].includes(dificuldade) ? dificuldade : 'medio';

  const prompt = `Você é uma banca examinadora especialista em concursos públicos (${contestName}).
Elabore exatamente ${qtd} questões inéditas e realistas de múltipla escolha sobre:
- Matéria: "${materia}"
- Assunto: "${assunto}"
- Nível de Dificuldade: "${nivel}"

Requisitos obrigatórios:
1. Retorne estritamente um array JSON válido contendo exatamente ${qtd} objetos de questão.
2. Cada questão deve possuir o formato exato:
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
  "justificativa": "Explicação completa e didática da resposta correta.",
  "materia": "${materia}",
  "assunto": "${assunto}",
  "dificuldade": "${nivel}"
}`;

  try {
    const endpoint = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        detail = errData?.error?.message || detail;
      } catch {
        // ignore
      }
      return res.status(502).json({ error: `Erro ao consultar API Gemini: ${detail}` });
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p) => p.text && !p.thought) || parts.find((p) => p.text);
    const rawText = extractJsonText(textPart?.text || '[]');
    const parsed = JSON.parse(rawText);
    const questions = Array.isArray(parsed) ? parsed : (parsed?.questions || parsed?.questoes || []);

    return res.status(200).json({ questions });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Falha interna ao processar geração de questões com IA.',
    });
  }
}

