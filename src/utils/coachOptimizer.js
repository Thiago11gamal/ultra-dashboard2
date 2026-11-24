/**
 * coachOptimizer.js
 *
 * Lote 10 — Facade de otimização automática do Coach.
 */
export {
  EXPERIMENTAL_MATH_FLAGS,
  getSafeBaselineFeatures,
  loadPersistedCoachFlags,
  persistCoachFlags,
  getStrategySpace,
  scoreStrategyEvaluation,
  rankStrategies,
  loadOptimizerState,
  saveOptimizerState,
  clearOptimizerState,
  recordStrategyOutcome,
  selectStrategyThompson,
  recommendFlagConfig,
  applyRecommendedFlags,
} from '../engine/optimization/flagOptimizer.js';

import {
  readFlags,
  writeFlags,
  setCoachFeatureContestScope,
  getCoachFeatureContestScope,
} from './coachFeatureStore.js';
import { DEFAULT_COACH_FEATURES, isValidFeatureKey } from './coachFeatures.js';

export {
  saveBacktestReport,
  loadLastBacktestReport,
  loadEvaluationResultsLocal,
  loadHealthSnapshotsLocal,
  summarizeEvaluationsByStrategy,
  saveTunerHistory,
  loadTunerHistory,
  runAutoTunerCycle,
  buildAutoTunerDashboard,
} from '../engine/optimization/autoTuner.js';

import {
  loadPersistedCoachFlags,
  getSafeBaselineFeatures,
} from '../engine/optimization/flagOptimizer.js';
import {
  runAutoTunerCycle,
  buildAutoTunerDashboard,
} from '../engine/optimization/autoTuner.js';

/**
 * Inicializa flags persistidas preservando todas as chaves válidas do Coach.
 */
export function bootstrapCoachFlags(contestId, options = {}) {
  const resolvedContestId = contestId || getCoachFeatureContestScope() || 'default';
  if (options?.syncGlobalScope !== false && resolvedContestId) {
    setCoachFeatureContestScope(resolvedContestId);
  }
  const baseline = {
    ...DEFAULT_COACH_FEATURES,
    useControlCenterFlagsPanel: true,
    useControlCenterHealthPanel: true,
    useControlCenterBacktestPanel: true,
    useControlCenterAutoTunerPanel: true,
    useControlCenterCausalPanel: true,
    useControlCenterLLMPanel: true,
    ...getSafeBaselineFeatures(),
  };
  const persisted = loadPersistedCoachFlags(resolvedContestId, { applyToStore: false });
  const existingInStore = readFlags(resolvedContestId);
  const hasExistingInStore =
    existingInStore && typeof existingInStore === 'object' && Object.keys(existingInStore).length > 0;

  const merged = { ...baseline };
  if (persisted && typeof persisted === 'object') {
    for (const [key, value] of Object.entries(persisted)) {
      if (typeof value === 'boolean' && (isValidFeatureKey(key) || key in baseline)) {
        merged[key] = value;
      }
    }
  }

  // Preserva flags já ativas na sessão (ex.: Modo Admin Irrestrito ou Maturidade Adaptativa N1–N5)
  // para que o bootstrap do Orquestrador nunca sobrescreva flags ativas com defaults false.
  if (hasExistingInStore && options?.preferPersisted !== true) {
    for (const [key, value] of Object.entries(existingInStore)) {
      if (typeof value === 'boolean' && (isValidFeatureKey(key) || key in baseline)) {
        merged[key] = value;
      }
    }
  }

  writeFlags(merged, resolvedContestId);
  return merged;
}

/**
 * Roda o AutoTuner.
 */
export function runCoachAutoTuner(options = {}) {
  return runAutoTunerCycle(options);
}

/**
 * Gera dashboard do AutoTuner.
 */
export function buildCoachAutoTunerDashboard(report = {}) {
  return buildAutoTunerDashboard(report);
}

export default {
  bootstrapCoachFlags,
  runCoachAutoTuner,
  buildCoachAutoTunerDashboard,
};
