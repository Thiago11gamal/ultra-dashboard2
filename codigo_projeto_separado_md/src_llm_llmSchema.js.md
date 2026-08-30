# src\llm\llmSchema.js

```js
/**
 * llmSchema.js
 *
 * Lote 6 — Validação de saída do mini-LLM.
 *
 * Regra de ouro:
 * O LLM nunca altera matemática, urgência ou probabilidade.
 * Ele apenas produz explicações estruturadas.
 */

const ALLOWED_SEVERITIES = ['low', 'medium', 'high', 'critical'];

function sanitizeText(value, maxLength = 280) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeStringArray(value, maxItems = 6, maxItemLength = 220) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => sanitizeText(item, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

/**
 * Valida e sanitiza uma explicação do Coach.
 *
 * @param {Object} raw
 * @returns {Object|null}
 */
export function validateCoachExplanation(raw, options = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const strict = options.strict === true;

  const headline = sanitizeText(raw.headline, 160);
  if (!headline) return null;

  const severityRaw = String(raw.severity || '').toLowerCase();
  const severity = ALLOWED_SEVERITIES.includes(severityRaw)
    ? severityRaw
    : 'medium';

  let causes = sanitizeStringArray(raw.causes, 6, 220);

  if (strict && causes.length === 0) {
    return null;
  }

  if (causes.length === 0) {
    causes = ['O sistema detectou um padrão relevante nos dados atuais.'];
  }

  const recommendation = sanitizeText(raw.recommendation, 320);
  if (!recommendation) return null;

  const confidenceRaw = Number(raw.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.min(1, Math.max(0, confidenceRaw))
    : 0.5;

  const tone = sanitizeText(raw.tone, 60) || 'neutral';

  return {
    headline,
    severity,
    causes,
    recommendation,
    confidence: Number(confidence.toFixed(4)),
    tone,
  };
}

export const CoachExplanationSchema = {
  type: 'object',
  required: ['headline', 'severity', 'causes', 'recommendation'],
  properties: {
    headline: { type: 'string' },
    severity: { enum: ALLOWED_SEVERITIES },
    causes: {
      type: 'array',
      items: { type: 'string' },
    },
    recommendation: { type: 'string' },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    tone: { type: 'string' },
  },
};

export default {
  validateCoachExplanation,
  CoachExplanationSchema,
};


```
