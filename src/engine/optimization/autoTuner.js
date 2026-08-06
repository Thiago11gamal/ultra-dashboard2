/**
 * autoTuner.js
 *
 * Lote 10 — Auto Tuner do Coach.
 *
 * Combina:
 * - avaliações do Lote 8;
 * - health snapshots do Lote 9;
 * - backtests salvos;
 * - flagOptimizer.
 */

import {
  getStrategySpace,
  rankStrategies,
  recommendFlagConfig,
  applyRecommendedFlags,
  loadPersistedCoachFlags,
} from './flagOptimizer.js';

const TUNER_HISTORY_KEY = 'coach_auto_tuner_history_v1';
const BACKTEST_REPORT_KEY = 'coach_strategy_backtest_v1';
const EVALUATION_RESULTS_KEY = 'coach_evaluation_results_v1';
const MODEL_HEALTH_KEY = 'coach_model_health_v1';

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function loadJson(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (finite.length === 0) return null;

  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

/**
 * Salva relatório de backtest para uso pelo AutoTuner.
 */
export function saveBacktestReport(report) {
  return saveJson(BACKTEST_REPORT_KEY, report || null);
}

/**
 * Carrega último relatório de backtest salvo.
 */
export function loadLastBacktestReport() {
  return loadJson(BACKTEST_REPORT_KEY, null);
}

/**
 * Carrega avaliações salvas pelo Lote 8.
 */
export function loadEvaluationResultsLocal() {
  const parsed = loadJson(EVALUATION_RESULTS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Carrega health snapshots salvos pelo Lote 9.
 */
export function loadHealthSnapshotsLocal() {
  const parsed = loadJson(MODEL_HEALTH_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Resume avaliações por estratégia quando não há backtest salvo.
 */
export function summarizeEvaluationsByStrategy(evaluations = []) {
  const safeEvaluations = Array.isArray(evaluations)
    ? evaluations.filter(Boolean)
    : [];

  const groups = {};

  safeEvaluations.forEach((evaluation) => {
    const strategyId = evaluation?.strategyId || 'unknown';

    if (!groups[strategyId]) {
      groups[strategyId] = {
        brier: [],
        logLoss: [],
        probabilityAbsoluteError: [],
        mae: [],
        ndcg: [],
        uplift: [],
      };
    }

    const group = groups[strategyId];

    const probability = evaluation?.probabilityEvaluation;

    if (probability) {
      if (Number.isFinite(probability.brier)) {
        group.brier.push(probability.brier);
      }

      if (Number.isFinite(probability.logLoss)) {
        group.logLoss.push(probability.logLoss);
      }

      if (Number.isFinite(probability.absoluteError)) {
        group.probabilityAbsoluteError.push(probability.absoluteError);
      }
    }

    const score = evaluation?.scoreEvaluation;

    if (score && Number.isFinite(score.absoluteError)) {
      group.mae.push(score.absoluteError);
    }

    const topics = evaluation?.topicEvaluation;

    if (topics && Number.isFinite(topics.ndcg)) {
      group.ndcg.push(topics.ndcg);
    }

    const uplift = evaluation?.taskUpliftEvaluation?.uplift;

    if (Number.isFinite(uplift)) {
      group.uplift.push(uplift);
    }
  });

  const summaries = {};

  Object.entries(groups).forEach(([strategyId, group]) => {
    const count = Math.max(
      group.brier.length,
      group.mae.length,
      group.ndcg.length,
      group.uplift.length,
      1
    );

    summaries[strategyId] = {
      count,
      probability: {
        avgBrier: meanValues(group.brier),
        avgLogLoss: meanValues(group.logLoss),
        avgAbsoluteError: meanValues(group.probabilityAbsoluteError),
      },
      score: {
        mae: meanValues(group.mae),
      },
      topics: {
        avgNdcg: meanValues(group.ndcg),
      },
      tasks: {
        avgUplift: meanValues(group.uplift),
      },
    };
  });

  return summaries;
}

/**
 * Salva histórico do AutoTuner.
 */
export function saveTunerHistory(report) {
  const current = loadJson(TUNER_HISTORY_KEY, []);
  const safeCurrent = Array.isArray(current) ? current : [];

  const next = [...safeCurrent, report].filter(Boolean).slice(-50);

  return saveJson(TUNER_HISTORY_KEY, next);
}

/**
 * Carrega histórico do AutoTuner.
 */
export function loadTunerHistory() {
  const parsed = loadJson(TUNER_HISTORY_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Executa um ciclo completo de auto-tuning.
 */
export function runAutoTunerCycle(options = {}) {
  loadPersistedCoachFlags();

  const evaluations = Array.isArray(options.evaluations)
    ? options.evaluations
    : loadEvaluationResultsLocal();

  const healthSnapshots = Array.isArray(options.healthSnapshots)
    ? options.healthSnapshots
    : loadHealthSnapshotsLocal();

  const latestHealth =
    healthSnapshots.length > 0
      ? healthSnapshots[healthSnapshots.length - 1]
      : null;

  const backtestReport =
    options.backtestReport !== undefined
      ? options.backtestReport
      : loadLastBacktestReport();

  let summaries = {};

  if (
    backtestReport &&
    backtestReport.summaries &&
    typeof backtestReport.summaries === 'object' &&
    Object.keys(backtestReport.summaries).length > 0
  ) {
    summaries = backtestReport.summaries;
  } else {
    summaries = summarizeEvaluationsByStrategy(evaluations);
  }

  const ranked = rankStrategies(summaries, latestHealth, {
    maxScore: options.maxScore ?? 100,
    strategySpace: options.strategySpace,
  });

  const recommendation = recommendFlagConfig({
    ranked,
    latestHealth,
    currentFeatures: globalThis.__COACH_FEATURES__ || {},
    minImprovement: options.minImprovement ?? 0.02,
    allowRollback: options.allowRollback !== false,
    exploration: options.exploration === true,
    seed: options.seed,
  });

  let applied = false;

  if (options.autoApply === true) {
    applied = applyRecommendedFlags(recommendation, {
      force: options.forceApply === true,
    });
  }

  const report = {
    generatedAt: Date.now(),
    mode: {
      autoApply: options.autoApply === true,
      forceApply: options.forceApply === true,
      exploration: options.exploration === true,
      allowRollback: options.allowRollback !== false,
    },
    inputs: {
      evaluationsCount: evaluations.length,
      healthSnapshotsCount: healthSnapshots.length,
      summariesCount: Object.keys(summaries).length,
      hasBacktestReport: Boolean(backtestReport),
    },
    latestHealth: latestHealth
      ? {
          healthScore: latestHealth.healthScore ?? null,
          status: latestHealth.status ?? null,
          alertsCount: Array.isArray(latestHealth.alerts)
            ? latestHealth.alerts.length
            : 0,
        }
      : null,
    ranked: ranked.map((strategy) => ({
      id: strategy.id,
      label: strategy.label,
      score: Number(strategy.score.toFixed(6)),
      hasEvidence: strategy.hasEvidence,
      evaluation: strategy.evaluation,
    })),
    recommendation: {
      action: recommendation.action,
      strategyId: recommendation.strategyId,
      reason: recommendation.reason,
      features: recommendation.features,
      score: recommendation.score ?? null,
      baselineScore: recommendation.baselineScore ?? null,
    },
    applied,
  };

  if (options.saveHistory !== false) {
    saveTunerHistory(report);
  }

  return report;
}

/**
 * Constrói dashboard simples do AutoTuner.
 */
export function buildAutoTunerDashboard(report = {}) {
  if (!report || typeof report !== 'object') return null;

  return {
    generatedAt: report.generatedAt || Date.now(),
    cards: [
      {
        id: 'recommended_action',
        label: 'Ação recomendada',
        value: report.recommendation?.action || 'unknown',
      },
      {
        id: 'recommended_strategy',
        label: 'Estratégia recomendada',
        value: report.recommendation?.strategyId || 'baseline',
      },
      {
        id: 'health_score',
        label: 'Health Score',
        value: report.latestHealth?.healthScore ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'evaluations',
        label: 'Avaliações',
        value: report.inputs?.evaluationsCount ?? 0,
      },
      {
        id: 'summaries',
        label: 'Estratégias avaliadas',
        value: report.inputs?.summariesCount ?? 0,
      },
      {
        id: 'applied',
        label: 'Aplicado automaticamente',
        value: report.applied ? 'Sim' : 'Não',
      },
    ],
    recommendation: report.recommendation || null,
    ranked: report.ranked || [],
    latestHealth: report.latestHealth || null,
  };
}

export default {
  saveBacktestReport,
  loadLastBacktestReport,
  loadEvaluationResultsLocal,
  loadHealthSnapshotsLocal,
  summarizeEvaluationsByStrategy,
  saveTunerHistory,
  loadTunerHistory,
  runAutoTunerCycle,
  buildAutoTunerDashboard,
};
