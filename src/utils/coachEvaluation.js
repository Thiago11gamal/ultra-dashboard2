/**
 * coachEvaluation.js
 *
 * Lote 8 — Facade para avaliação e backtest do Coach.
 */
export {
  evaluateProbabilityPrediction,
  evaluateScorePrediction,
  evaluateTopicRanking,
  evaluateTaskUplift,
  evaluateCoachSnapshot,
  summarizeCoachEvaluations,
  compareEvaluationSummaries,
  buildEvaluationDashboardData,
  saveEvaluationResult,
  loadEvaluationResults,
  clearEvaluationResults,
} from '../engine/evaluation/coachEvaluator.js';

export {
  getDefaultCoachStrategies,
  getGranularCoachStrategies,
  buildCategorySplits,
  runCoachStrategyBacktest,
} from '../engine/evaluation/strategyBacktester.js';

import {
  getDefaultCoachStrategies,
  getGranularCoachStrategies,
  runCoachStrategyBacktest,
} from '../engine/evaluation/strategyBacktester.js';
import {
  summarizeCoachEvaluations,
  buildEvaluationDashboardData,
} from '../engine/evaluation/coachEvaluator.js';

/**
 * Executa backtest padrão: baseline vs todos os lotes.
 */
export function runDefaultCoachBacktest(
  categories,
  simulados,
  studyLogs = [],
  options = {}
) {
  const safeOptions = options && typeof options === 'object' ? options : {};
  return runCoachStrategyBacktest({
    ...safeOptions,
    categories,
    simulados,
    studyLogs,
    strategies:
      Array.isArray(safeOptions.strategies) && safeOptions.strategies.length > 0
        ? safeOptions.strategies
        : getDefaultCoachStrategies(),
  });
}

/**
 * Executa backtest granular: lote por lote.
 */
export function runGranularCoachBacktest(
  categories,
  simulados,
  studyLogs = [],
  options = {}
) {
  const safeOptions = options && typeof options === 'object' ? options : {};
  return runCoachStrategyBacktest({
    ...safeOptions,
    categories,
    simulados,
    studyLogs,
    strategies:
      Array.isArray(safeOptions.strategies) && safeOptions.strategies.length > 0
        ? safeOptions.strategies
        : getGranularCoachStrategies(),
    includeTopics: safeOptions.includeTopics ?? true,
  });
}

/**
 * Constrói dashboard a partir de avaliações salvas, de um summary ou de um relatório de backtest.
 *
 * FIX: valida input e retorna null se o summary for inválido,
 * evitando exceção em chamadas com dado corrompido.
 */
export function buildCoachEvaluationDashboard(evaluations = []) {
  if (evaluations && typeof evaluations === 'object' && !Array.isArray(evaluations)) {
    if (evaluations.raw && typeof evaluations.raw === 'object') {
      const flattened = Object.values(evaluations.raw).flat().filter(Boolean);
      const summary = summarizeCoachEvaluations(flattened);
      return summary && typeof summary === 'object' ? buildEvaluationDashboardData(summary) : null;
    }
    if (evaluations.probability && evaluations.score) {
      return buildEvaluationDashboardData(evaluations);
    }
    if (evaluations.summaries && typeof evaluations.summaries === 'object') {
      const picked =
        evaluations.summaries['all-lots'] ||
        evaluations.summaries['all-math-lots'] ||
        evaluations.summaries.baseline ||
        Object.values(evaluations.summaries).find(Boolean) ||
        null;
      return picked ? buildEvaluationDashboardData(picked) : null;
    }
  }
  const safeEvaluations = Array.isArray(evaluations) ? evaluations : [];
  const summary = summarizeCoachEvaluations(safeEvaluations);
  if (!summary || typeof summary !== 'object') return null;
  return buildEvaluationDashboardData(summary);
}

export default {
  runDefaultCoachBacktest,
  runGranularCoachBacktest,
  buildCoachEvaluationDashboard,
};

