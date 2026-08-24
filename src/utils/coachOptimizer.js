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

import { writeFlags } from './coachFeatureStore.js';

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
 *
 * FIX: merge correto baseline + persistido (apenas booleans válidos)
 * e propagação para globalThis.__COACH_FEATURES__ — antes o orquestrador
 * relia o global e nunca enxergava as flags persistidas.
 */
export function bootstrapCoachFlags() {
  const baseline = getSafeBaselineFeatures();
  const persisted = loadPersistedCoachFlags();

  if (!persisted || typeof persisted !== 'object') {
    writeFlags({ ...baseline });
    return { ...baseline };
  }

  const merged = { ...baseline };
  for (const [key, value] of Object.entries(persisted)) {
    if (typeof value === 'boolean') {
      merged[key] = value;
    }
  }

  writeFlags(merged);
  return merged;
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
