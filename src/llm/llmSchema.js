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
  if (typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value))) {
    return '';
  }
  return String(value)
    // Remove tags HTML (<script>, <b>, etc.) preservando operadores matemáticos como "probabilidade < 25%"
    .replace(/<\/?[a-z][^>]*>/gi, '')
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
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const strict = options.strict === true;

  const headline = sanitizeText(raw.headline, 160);
  if (!headline) return null;

  const severityRaw = typeof raw.severity === 'string' ? raw.severity.trim().toLowerCase() : '';
  const hasValidSeverity = ALLOWED_SEVERITIES.includes(severityRaw);
  if (strict && !hasValidSeverity) {
    return null;
  }
  const severity = hasValidSeverity ? severityRaw : 'medium';

  let causes = sanitizeStringArray(raw.causes, 6, 220);

  if (strict && causes.length === 0) {
    return null;
  }

  if (causes.length === 0) {
    causes = ['O sistema detectou um padrão relevante nos dados atuais.'];
  }

  const recommendation = sanitizeText(raw.recommendation, 320);
  if (!recommendation) return null;

  const hasConfidence =
    raw.confidence !== null &&
    raw.confidence !== undefined &&
    raw.confidence !== '' &&
    typeof raw.confidence !== 'boolean';
  const confidenceRaw = hasConfidence ? Number(raw.confidence) : NaN;
  const isConfidenceInRange =
    Number.isFinite(confidenceRaw) &&
    confidenceRaw >= 0 &&
    confidenceRaw <= 100;
  if (strict && raw.confidence !== undefined && !isConfidenceInRange) {
    return null;
  }
  const normalizedConfidence = Number.isFinite(confidenceRaw)
    ? (confidenceRaw > 1 && confidenceRaw <= 100 ? confidenceRaw / 100 : confidenceRaw)
    : NaN;
  const confidence = Number.isFinite(normalizedConfidence)
    ? Math.min(1, Math.max(0, normalizedConfidence))
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
