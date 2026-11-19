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
    ...getSafeBaselineFeatures(),
  };
  const persisted = loadPersistedCoachFlags(resolvedContestId, { applyToStore: false });

  if (!persisted || typeof persisted !== 'object') {
    writeFlags({ ...baseline }, resolvedContestId);
    return { ...baseline };
  }

  const merged = { ...baseline };
  for (const [key, value] of Object.entries(persisted)) {
    if (typeof value === 'boolean' && (isValidFeatureKey(key) || key in baseline)) {
      merged[key] = value;
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
