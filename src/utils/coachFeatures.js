/**
 * coachFeatures.js
 *
 * Feature flags para evolução por lotes do motor Coach.
 */
import { getFlag } from './coachFeatureStore.js';

const DEFAULT_COACH_FEATURES = Object.freeze({
  // Lote 1 — State-Space
  useStateSpace: false,
  useStateSpaceAverage: false,
  useStateSpaceTrend: false,
  // Lote 2 — Volatilidade
  useDynamicVolatility: false,
  useGarchVolatility: false,
  useDynamicVolatilityOverride: false,
  // Lote 3 — Posterior MC
  usePosteriorMonteCarlo: false,
  usePosteriorMonteCarloOverride: false,
  // Lote 4 — Bayesian Topics
  useBayesianTopics: false,
  useBayesianTopicsForUrgency: false,
  // Lote 5 — Decision Utility
  useDecisionUtility: false,
  useDecisionUtilityForTopics: false,
  useDecisionUtilityForBestTask: false,
  useBanditPlanner: false,
  // Lote 6 — LLM
  useLLMExplanations: false,
  useLLMInsights: false,
  useLLMTaskClassifier: false,
  useLLMStrictValidation: false,
  // Lote 7 — Graph + FSRS
  useKnowledgeGraph: false,
  useKnowledgeGraphForTopics: false,
  useAdvancedFsrs: false,
  useFsrsForSrsBoost: false,
  useFsrsTopicScheduling: false,
  // Lote 8 — Evaluation
  useEvaluationTelemetry: false,
  useStrategyBacktester: false,
  useTopicRankEvaluation: false,
  // Lote 9 — Observability
  useObservability: false,
  useDriftGuard: false,
  useModelHealthTelemetry: false,
  useDriftAlerts: false,
  // Lote 10 — AutoTuner
  useMetaOptimizer: false,
  useAutoTuner: false,
  useAutoFlagApplication: false,
  useAutoRollback: false,
  // Lote 11 — Causal
  useCausalUplift: false,
  usePersonalizedPolicy: false,
  useCausalTaskSelection: false,
  useCausalBootstrap: false,
  // Lote 12 — Orchestrator
  useCoachOrchestrator: false,
  useOrchestratorHealth: false,
  useOrchestratorLLM: false,
  useOrchestratorAutoTuner: false,
  // Lote 13 — Control Center
  useCoachControlCenter: false,
  useControlCenterFlagsPanel: false,
  useControlCenterHealthPanel: false,
  useControlCenterBacktestPanel: false,
  useControlCenterAutoTunerPanel: false,
  useControlCenterCausalPanel: false,
  useControlCenterLLMPanel: false,
});

/**
 * Retorna o valor de uma feature flag.
 *
 * Prioridade:
 * 1. options.features
 * 2. Store centralizado
 * 3. DEFAULT_COACH_FEATURES
 * 4. fallback
 */
export function getCoachFeature(options, key, fallback = false) {
  // FIX: guarda contra key inválida antes de qualquer acesso
  if (typeof key !== 'string' || key === '') return fallback;
  try {
    // 1. options.features (prioridade máxima)
    if (options?.features && typeof options.features[key] === 'boolean') {
      return options.features[key];
    }
    // 2. Store centralizado (substitui globalThis.__COACH_FEATURES__)
    const storeValue = getFlag(key, undefined);
    if (typeof storeValue === 'boolean') return storeValue;
    // 3. Defaults
    if (typeof DEFAULT_COACH_FEATURES[key] === 'boolean') {
      return DEFAULT_COACH_FEATURES[key];
    }
    return fallback;
  } catch {
    return fallback;
  }
}

// PATCH-NOVO: validação de chave para toggleFlag / painéis de flags
export function isValidFeatureKey(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(DEFAULT_COACH_FEATURES, key);
}

export default {
  getCoachFeature,
  isValidFeatureKey,
  DEFAULT_COACH_FEATURES,
};

