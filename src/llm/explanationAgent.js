/**
 * explanationAgent.js
 *
 * Lote 6 — Mini-LLM explicativo para o Coach.
 *
 * Este módulo:
 * - recebe métricas já calculadas;
 * - tenta gerar explicação via LLM;
 * - valida a saída;
 * - faz fallback determinístico se necessário.
 *
 * Ele nunca altera urgência, probabilidade ou prioridade.
 */

import { validateCoachExplanation } from './llmSchema.js';
import {
  COACH_EXPLANATION_SYSTEM_PROMPT,
  buildCoachExplanationPrompt,
} from './llmPrompts.js';
import { generateStructuredLLM, getLLMProvider } from './llmClient.js';

const explanationCache = new Map();
const CACHE_MAX_SIZE = 60;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function getFeature(options, key, fallback = false) {
  try {
    if (options?.features && typeof options.features[key] === 'boolean') {
      return options.features[key];
    }

    if (
      typeof globalThis !== 'undefined' &&
      globalThis.__COACH_FEATURES__ &&
      typeof globalThis.__COACH_FEATURES__[key] === 'boolean'
    ) {
      return globalThis.__COACH_FEATURES__[key];
    }

    return fallback;
  } catch {
    return fallback;
  }
}

function hashString(str) {
  let h = 0;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }

  return Math.abs(h).toString(36);
}

function clamp(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFinite(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clearLLMExplanationCache() {
  explanationCache.clear();
}

/**
 * Normaliza o resultado do Coach para um payload explicável.
 */
export function normalizeCoachExplanationInput(coachResult = {}, context = {}) {
  const details = coachResult?.details || {};
  const mc = details?.monteCarlo || null;

  return {
    categoryName:
      context.categoryName ??
      coachResult?.categoryName ??
      details?.categoryName ??
      null,

    normalizedScore: toFinite(coachResult?.normalizedScore, 0),

    averageScore: toFinite(details.averageScore, null),

    targetScore: toFinite(
      context.targetScore ?? mc?.effectiveMCTarget,
      null
    ),

    maxScore: toFinite(context.maxScore, 100),

    probability: toFinite(
      mc?.probability ?? details?.probability ?? coachResult?.mcProbability,
      null
    ),

    probabilityRaw: toFinite(mc?.probabilityRaw, null),

    riskLabel: mc?.riskLabel ?? details?.mcRiskLabel ?? null,

    volatility: toFinite(
      details.mssdVolatility ?? mc?.volatility,
      null
    ),

    trend: toFinite(details.trend, null),

    daysSinceLastStudy: toFinite(details.daysSinceLastStudy, null),

    srsLabel: details.srsLabel ?? null,

    isBurnoutRisk: Boolean(details.isBurnoutRisk),

    sampleSize: toFinite(mc?.sampleSize ?? details?.sampleSize, null),

    calibrationPenalty: toFinite(mc?.calibrationPenalty, 0),

    originalRecommendation: coachResult?.recommendation || '',
  };
}

/**
 * Explicação determinística de fallback.
 */
export function deterministicCoachExplanation(data = {}) {
  const maxScore = clamp(data.maxScore, 1, 100000, 100);

  const probability = toFinite(data.probability, null);
  const volatility = toFinite(data.volatility, null);
  const trend = toFinite(data.trend, null);
  const daysSince = toFinite(data.daysSinceLastStudy, null);
  const normalizedScore = clamp(data.normalizedScore, 0, 100, 0);

  const causes = [];

  if (probability !== null) {
    if (probability < 25) {
      causes.push(`Probabilidade muito baixa (${Math.round(probability)}%) de atingir a meta.`);
    } else if (probability < 45) {
      causes.push(`Probabilidade baixa (${Math.round(probability)}%) de atingir a meta.`);
    } else if (probability < 70) {
      causes.push(`Probabilidade moderada (${Math.round(probability)}%) de atingir a meta.`);
    }
  }

  if (volatility !== null && volatility > maxScore * 0.08) {
    causes.push('Alta instabilidade nas notas recentes.');
  }

  if (trend !== null && trend < -Math.max(1, maxScore * 0.02)) {
    causes.push('Tendência de queda no desempenho recente.');
  }

  if (trend !== null && trend > Math.max(1, maxScore * 0.02)) {
    causes.push('Tendência de melhora no desempenho recente.');
  }

  if (daysSince !== null && daysSince >= 7) {
    causes.push(`Sem estudo relevante há ${Math.round(daysSince)} dias.`);
  }

  if (data.srsLabel) {
    causes.push(String(data.srsLabel));
  }

  if (data.isBurnoutRisk) {
    causes.push('Sinais de volume alto de estudo sem progresso correspondente.');
  }

  if (causes.length === 0) {
    causes.push('Desempenho estável dentro do padrão esperado.');
  }

  let severity = 'low';

  if (
    data.riskLabel === 'critical' ||
    (probability !== null && probability < 25)
  ) {
    severity = 'critical';
  } else if (
    (probability !== null && probability < 45) ||
    (trend !== null && trend < -Math.max(2, maxScore * 0.03)) ||
    normalizedScore >= 80
  ) {
    severity = 'high';
  } else if (
    (probability !== null && probability < 70) ||
    (volatility !== null && volatility > maxScore * 0.10) ||
    (daysSince !== null && daysSince > 10)
  ) {
    severity = 'medium';
  } else {
    severity = 'low';
  }

  const headlineBase =
    data.categoryName || 'Disciplina';

  let headline = '';

  if (severity === 'critical') {
    headline = `Risco crítico em ${headlineBase}`;
  } else if (severity === 'high') {
    headline = `Atenção alta em ${headlineBase}`;
  } else if (severity === 'medium') {
    headline = `Atenção moderada em ${headlineBase}`;
  } else {
    headline = `Situação estável em ${headlineBase}`;
  }

  if (probability !== null) {
    headline += ` (${Math.round(probability)}%)`;
  }

  let recommendation = '';

  if (severity === 'critical') {
    recommendation =
      'Reduza a meta intermediária, aumente a prática de questões e revise os erros mais recentes com foco em fundamentos.';
  } else if (severity === 'high') {
    recommendation =
      'Priorize tópicos fracos com evidência real e faça uma sessão de prática dirigida nos próximos dias.';
  } else if (severity === 'medium') {
    recommendation =
      'Mantenha prática regular, revise pontos instáveis e evite trocar de método sem dados suficientes.';
  } else {
    recommendation =
      'Mantenha o ritmo atual e use revisões espaçadas para preservar o desempenho.';
  }

  if (data.originalRecommendation) {
    recommendation = String(data.originalRecommendation).slice(0, 300);
  }

  let confidence = 0.45;

  const sampleSize = toFinite(data.sampleSize, null);
  if (sampleSize !== null) {
    confidence += Math.min(0.35, sampleSize / 40);
  }

  const calibrationPenalty = toFinite(data.calibrationPenalty, 0);
  if (calibrationPenalty > 0) {
    confidence -= calibrationPenalty * 0.6;
  }

  if (probability === null) {
    confidence -= 0.1;
  }

  confidence = clamp(confidence, 0.15, 0.95, 0.5);

  return {
    headline: headline.slice(0, 160),
    severity,
    causes: causes.slice(0, 6),
    recommendation: recommendation.slice(0, 320),
    confidence: Number(confidence.toFixed(4)),
    tone: severity === 'critical' ? 'urgent_but_calm' : 'neutral',
  };
}

/**
 * Explica métricas do Coach.
 *
 * Com flag ativa e provider disponível, tenta usar LLM.
 * Caso contrário, usa fallback determinístico.
 */
export async function explainCoachMetrics(input = {}, options = {}) {
  const useLLM = getFeature(options, 'useLLMExplanations', false);
  const strict = getFeature(options, 'useLLMStrictValidation', false);

  const fallback = deterministicCoachExplanation(input);

  if (!useLLM) {
    return {
      ...fallback,
      source: 'fallback',
      provider: null,
      cached: false,
    };
  }

  const provider = getLLMProvider();
  if (!provider) {
    return {
      ...fallback,
      source: 'fallback',
      provider: null,
      cached: false,
      reason: 'llm_provider_not_configured',
    };
  }

  const cachePayload = {
    ...input,
    originalRecommendation: '',
  };

  const cacheKey = hashString(
    JSON.stringify({
      payload: cachePayload,
      strict,
      providerId: provider.id || 'unknown',
    })
  );

  const now = Date.now();
  const cached = explanationCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      ...cached.output,
      cached: true,
    };
  }

  try {
    const prompt = buildCoachExplanationPrompt(input);

    const raw = await generateStructuredLLM({
      system: COACH_EXPLANATION_SYSTEM_PROMPT,
      user: prompt,
      timeoutMs: options.timeoutMs,
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 800,
    });

    const valid = validateCoachExplanation(raw, { strict });

    if (valid) {
      const output = {
        ...valid,
        source: 'llm',
        provider: provider.id || 'unknown',
        cached: false,
      };

      if (explanationCache.size >= CACHE_MAX_SIZE) {
        const oldestKey = explanationCache.keys().next().value;
        explanationCache.delete(oldestKey);
      }

      explanationCache.set(cacheKey, {
        timestamp: now,
        output,
      });

      return output;
    }

    return {
      ...fallback,
      source: 'fallback',
      provider: provider.id || 'unknown',
      cached: false,
      reason: 'llm_invalid_output',
    };
  } catch {
    return {
      ...fallback,
      source: 'fallback',
      provider: provider.id || 'unknown',
      cached: false,
      reason: 'llm_error',
    };
  }
}

/**
 * Aprimora um resultado do Coach com explicação LLM.
 *
 * Não altera score, normalizedScore, details, probability, etc.
 * Apenas adiciona `llmExplanation`.
 */
export async function enhanceCoachResultWithLLM(coachResult = {}, options = {}) {
  const context = options.context || {};

  const normalizedInput = normalizeCoachExplanationInput(
    coachResult,
    context
  );

  const llmExplanation = await explainCoachMetrics(normalizedInput, options);

  return {
    ...coachResult,
    llmExplanation,
  };
}

export default {
  normalizeCoachExplanationInput,
  deterministicCoachExplanation,
  explainCoachMetrics,
  enhanceCoachResultWithLLM,
  clearLLMExplanationCache,
};

