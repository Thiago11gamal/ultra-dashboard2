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
 * Inicializa flags persistidas.
 * Deve ser chamado no bootstrap da aplicação.
 */
export function bootstrapCoachFlags() {
  const flags = loadPersistedCoachFlags();
  if (!flags || typeof flags !== 'object') {
      return getSafeBaselineFeatures();
  }
  return flags;
}

/**
 * Rode o AutoTuner.
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
