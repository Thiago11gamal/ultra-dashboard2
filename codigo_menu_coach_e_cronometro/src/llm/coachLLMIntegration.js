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
 *
 * FIX: try/catch no motor síncrono (evita unhandled rejection) e
 * degradação graciosa se o LLM falhar (retorna focus sem enhancement).
 */
export async function getSuggestedFocusWithLLM(
  categories,
  simulados,
  studyLogs = [],
  options = {}
) {
  // FIX: getSuggestedFocus é síncrono e pode lançar — proteger
  let focus = null;
  try {
    focus = getSuggestedFocus(categories, simulados, studyLogs, options);
  } catch (err) {
    console.warn('[CoachLLM] getSuggestedFocus failed:', err);
    return null;
  }

  if (!focus) return null;

  // FIX: só enhance se urgency for um objeto válido
  if (!focus.urgency || typeof focus.urgency !== 'object') return focus;

  try {
    const enhancedUrgency = await enhanceCoachResultWithLLM(focus.urgency, {
      ...options,
      context: {
        categoryName: focus.name || focus.categoryName || null,
        maxScore: options.maxScore,
        targetScore: options.targetScore,
        ...(options.context || {}),
      },
    });

    // FIX: se o enhancement retornar algo inválido, mantém o original
    if (!enhancedUrgency || typeof enhancedUrgency !== 'object') {
      return focus;
    }

    return {
      ...focus,
      urgency: enhancedUrgency,
    };
  } catch (err) {
    // FIX: LLM é opcional — nunca quebrar o Coach por causa dele
    console.warn('[CoachLLM] enhanceCoachResultWithLLM failed:', err);
    return focus;
  }
}

/**
 * Wrapper simples para explicar qualquer resultado do calculateUrgency.
 *
 * FIX: valida input e degrada graciosamente (retorna o input se falhar).
 */
export async function explainUrgencyResult(urgencyResult, options = {}) {
  if (!urgencyResult || typeof urgencyResult !== 'object') {
    return urgencyResult ?? null;
  }
  try {
    const enhanced = await enhanceCoachResultWithLLM(urgencyResult, options);
    return enhanced && typeof enhanced === 'object' ? enhanced : urgencyResult;
  } catch (err) {
    console.warn('[CoachLLM] explainUrgencyResult failed:', err);
    return urgencyResult;
  }
}

export default {
  getSuggestedFocusWithLLM,
  explainUrgencyResult,
};

