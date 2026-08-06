/**
 * coachLLMIntegration.js
 *
 * Lote 6 — Integração opcional do mini-LLM com funções síncronas do Coach.
 *
 * Como o Coach principal é síncrono, esta camada cria wrappers assíncronos.
 */

import { getSuggestedFocus } from '../utils/coachLogic.js';
import { enhanceCoachResultWithLLM } from './explanationAgent.js';

/**
 * Wrapper assíncrono de getSuggestedFocus com explicação LLM.
 */
export async function getSuggestedFocusWithLLM(
  categories,
  simulados,
  studyLogs = [],
  options = {}
) {
  const focus = getSuggestedFocus(categories, simulados, studyLogs, options);

  if (!focus) return null;

  if (!focus.urgency) return focus;

  const enhancedUrgency = await enhanceCoachResultWithLLM(focus.urgency, {
    ...options,
    context: {
      categoryName: focus.name || focus.categoryName || null,
      maxScore: options.maxScore,
      targetScore: options.targetScore,
      ...(options.context || {}),
    },
  });

  return {
    ...focus,
    urgency: enhancedUrgency,
  };
}

/**
 * Wrapper simples para explicar qualquer resultado do calculateUrgency.
 */
export async function explainUrgencyResult(urgencyResult, options = {}) {
  return enhanceCoachResultWithLLM(urgencyResult, options);
}

export default {
  getSuggestedFocusWithLLM,
  explainUrgencyResult,
};
