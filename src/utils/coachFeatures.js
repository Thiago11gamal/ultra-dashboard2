// ==================== COACH FEATURE FLAGS ====================
// Permite evoluir o motor matemático por lotes sem quebrar o comportamento atual.

const DEFAULT_COACH_FEATURES = Object.freeze({
  // ==================== Lote 1 ====================
  useStateSpace: false,
  useStateSpaceAverage: false,
  useStateSpaceTrend: false,

  // ==================== Lote 2 ====================
  useDynamicVolatility: false,
  useGarchVolatility: false,
  useDynamicVolatilityOverride: false,

  // ==================== Lote 3 ====================
  usePosteriorMonteCarlo: false,
  usePosteriorMonteCarloOverride: false,

  // ==================== Lote 4 ====================
  useBayesianTopics: false,
  useBayesianTopicsForUrgency: false,

  // ==================== Lote 5 ====================
  useDecisionUtility: false,
  useDecisionUtilityForTopics: false,
  useDecisionUtilityForBestTask: false,
  useBanditPlanner: false,

  // ==================== Lote 6 ====================
  useLLMExplanations: false,
  useLLMInsights: false,
  useLLMTaskClassifier: false,
  useLLMStrictValidation: false,

  // ==================== Lote 7 ====================
  useKnowledgeGraph: false,
  useKnowledgeGraphForTopics: false,
  useAdvancedFsrs: false,
  useFsrsForSrsBoost: false,
  useFsrsTopicScheduling: false,

  // ==================== Lote 8 ====================
  useEvaluationTelemetry: false,
  useStrategyBacktester: false,
  useTopicRankEvaluation: false,

  // ==================== Lote 9 ====================
  useObservability: false,
  useDriftGuard: false,
  useModelHealthTelemetry: false,
  useDriftAlerts: false,

  // ==================== Lote 10 ====================
  useMetaOptimizer: false,
  useAutoTuner: false,
  useAutoFlagApplication: false,
  useAutoRollback: false,

  // ==================== Lote 11 ====================
  useCausalUplift: false,
  usePersonalizedPolicy: false,
  useCausalTaskSelection: false,
  useCausalBootstrap: false,

  // ==================== Lote 12 ====================
  useCoachOrchestrator: false,
  useOrchestratorHealth: false,
  useOrchestratorLLM: false,
  useOrchestratorAutoTuner: false,
});

/**
 * Retorna o valor de uma feature flag.
 *
 * Prioridade:
 * 1. options.features
 * 2. globalThis.__COACH_FEATURES__
 * 3. DEFAULT_COACH_FEATURES
 * 4. fallback
 */
export function getCoachFeature(options, key, fallback = false) {
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

    if (typeof DEFAULT_COACH_FEATURES[key] === 'boolean') {
      return DEFAULT_COACH_FEATURES[key];
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export default {
  getCoachFeature,
  DEFAULT_COACH_FEATURES,
};
