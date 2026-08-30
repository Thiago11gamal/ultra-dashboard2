# src\engine\optimization\flagOptimizer.js

```js
/**
 * flagOptimizer.js
 *
 * Lote 10 — Meta Optimization & Auto Flags
 *
 * Responsável por:
 * - definir estratégias de flags;
 * - pontuar estratégias com base em avaliação e saúde;
 * - recomendar promoção/manutenção/rollback;
 * - aplicar flags com segurança;
 * - persistir configuração ativa.
 */

const OPTIMIZER_STATE_KEY = 'coach_flag_optimizer_state_v1';
const ACTIVE_FLAGS_KEY = 'coach_active_flags_v1';

import { writeFlags, readFlags } from '../../utils/coachFeatureStore.js';

export const EXPERIMENTAL_MATH_FLAGS = [
  'useStateSpace',
  'useStateSpaceAverage',
  'useStateSpaceTrend',

  'useDynamicVolatility',
  'useGarchVolatility',
  'useDynamicVolatilityOverride',

  'usePosteriorMonteCarlo',
  'usePosteriorMonteCarloOverride',

  'useBayesianTopics',
  'useBayesianTopicsForUrgency',

  'useDecisionUtility',
  'useDecisionUtilityForTopics',
  'useDecisionUtilityForBestTask',
  'useBanditPlanner',

  'useKnowledgeGraph',
  'useKnowledgeGraphForTopics',
  'useAdvancedFsrs',
  'useFsrsForSrsBoost',
  'useFsrsTopicScheduling',

  'useCausalUplift',
  'usePersonalizedPolicy',
  'useCausalTaskSelection',
  'useCausalBootstrap',
];

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

function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleBeta(alpha, beta, rng) {
  const a = Math.max(1e-6, Number(alpha) || 1);
  const b = Math.max(1e-6, Number(beta) || 1);

  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const sd = Math.sqrt(Math.max(0, variance));

  const gaussian = () => {
    let u = rng();
    let v = rng();

    while (u === 0) u = rng();
    while (v === 0) v = rng();

    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  return clampFinite(mean + gaussian() * sd, 0, 1, mean);
}

/**
 * Retorna a configuração segura de baseline.
 */
export function getSafeBaselineFeatures() {
  const safe = {};

  EXPERIMENTAL_MATH_FLAGS.forEach((flag) => {
    safe[flag] = false;
  });

  return safe;
}

/**
 * Carrega flags persistidas e aplica no globalThis.__COACH_FEATURES__.
 */
export function loadPersistedCoachFlags() {
  const persisted = loadJson(ACTIVE_FLAGS_KEY, null);

  if (persisted && typeof persisted === 'object') {
    writeFlags(persisted);
  }

  return readFlags();
}

/**
 * Persiste flags ativas.
 */
export function persistCoachFlags(flags) {
  return saveJson(ACTIVE_FLAGS_KEY, flags || {});
}

/**
 * Espaço de estratégias.
 */
export function getStrategySpace() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'lot1-state-space',
      label: 'Lote 1 — State-Space',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
      },
    },
    {
      id: 'lot2-dynamic-volatility',
      label: 'Lote 2 — Volatilidade dinâmica',
      features: {
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'lot3-posterior-mc',
      label: 'Lote 3 — Posterior Monte Carlo',
      features: {
        usePosteriorMonteCarlo: true,
      },
    },
    {
      id: 'lot4-bayesian-topics',
      label: 'Lote 4 — Bayesian Topics',
      features: {
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'lot5-decision-utility',
      label: 'Lote 5 — Decision Utility',
      features: {
        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,
      },
    },
    {
      id: 'lot7-knowledge-fsrs',
      label: 'Lote 7 — Knowledge Graph + FSRS',
      features: {
        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,
        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
    {
      id: 'lot11-causal-policy',
      label: 'Lote 11 — Causal Uplift & Policy',
      features: {
        useCausalUplift: true,
        usePersonalizedPolicy: true,
        useCausalTaskSelection: true,
      },
    },
    {
      id: 'conservative',
      label: 'Conservador — Lotes 1 + 2',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'balanced',
      label: 'Equilibrado — Lotes 1 + 2 + 3 + 4',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
        useDynamicVolatility: true,
        useGarchVolatility: true,
        usePosteriorMonteCarlo: true,
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'all-math-lots',
      label: 'Completo — Todos os lotes matemáticos',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,

        useCausalUplift: true,
        usePersonalizedPolicy: true,
        useCausalTaskSelection: true,
      },
    },
  ];
}

/**
 * Pontua uma estratégia com base em avaliação e saúde.
 */
export function scoreStrategyEvaluation(summary = {}, latestHealth = null, options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const count = Math.max(0, Math.round(Number(summary?.count) || 0));

  const brier = clampFinite(summary?.probability?.avgBrier, 0, 1, NaN);

  const calibrationError = Number.isFinite(summary?.probability?.ece)
    ? summary.probability.ece
    : Number.isFinite(summary?.probability?.avgAbsoluteError)
      ? summary.probability.avgAbsoluteError
      : NaN;

  const mae = clampFinite(summary?.score?.mae, 0, maxScore, NaN);
  const ndcg = clampFinite(summary?.topics?.avgNdcg, 0, 1, NaN);
  const uplift = clampFinite(summary?.tasks?.avgUplift, -maxScore, maxScore, NaN);

  // Scores normalizados.
  const brierScore = Number.isFinite(brier)
    ? 1 - clampFinite(brier / 0.30, 0, 1, 1)
    : 0.35;

  const calibrationScore = Number.isFinite(calibrationError)
    ? 1 - clampFinite(calibrationError / 0.20, 0, 1, 1)
    : 0.35;

  const maeScore = Number.isFinite(mae)
    ? 1 - clampFinite(mae / (maxScore * 0.10), 0, 1, 1)
    : 0.35;

  const ndcgScore = Number.isFinite(ndcg)
    ? clampFinite(ndcg, 0, 1, 0.35)
    : 0.35;

  const upliftScore = Number.isFinite(uplift)
    ? 0.5 + clampFinite(uplift / (maxScore * 0.10), -0.5, 0.5, 0)
    : 0.5;

  const quality =
    brierScore * 0.35 +
    calibrationScore * 0.15 +
    maeScore * 0.20 +
    ndcgScore * 0.20 +
    upliftScore * 0.10;

  const healthScore = latestHealth?.healthScore != null
    ? clampFinite(latestHealth.healthScore, 0, 100, 80) / 100
    : 0.8;

  const sampleConfidence = count / (count + 10);

  const finalScore =
    (quality * 0.70 + healthScore * 0.30) *
    (0.45 + 0.55 * sampleConfidence);

  return {
    strategyId: summary?.strategyId ?? null,
    final: Number(finalScore.toFixed(6)),
    quality: Number(quality.toFixed(6)),
    healthScore: Number(healthScore.toFixed(4)),
    sampleConfidence: Number(sampleConfidence.toFixed(4)),
    components: {
      brierScore: Number(brierScore.toFixed(4)),
      calibrationScore: Number(calibrationScore.toFixed(4)),
      maeScore: Number(maeScore.toFixed(4)),
      ndcgScore: Number(ndcgScore.toFixed(4)),
      upliftScore: Number(upliftScore.toFixed(4)),
    },
  };
}

/**
 * Ranqueia estratégias.
 */
export function rankStrategies(summaries = {}, latestHealth = null, options = {}) {
  const strategySpace = Array.isArray(options.strategySpace)
    ? options.strategySpace
    : getStrategySpace();

  const ranked = strategySpace.map((strategy) => {
    const summary = summaries?.[strategy.id] || null;

    const evaluation = scoreStrategyEvaluation(
      summary
        ? {
            ...summary,
            strategyId: strategy.id,
          }
        : {
            count: 0,
            strategyId: strategy.id,
          },
      latestHealth,
      options
    );

    return {
      ...strategy,
      hasEvidence: Boolean(summary && Number(summary.count) > 0),
      score: summary ? evaluation.final : 0,
      evaluation,
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Estado do otimizador para Thompson Sampling.
 */
export function loadOptimizerState() {
  const state = loadJson(OPTIMIZER_STATE_KEY, {});
  return state && typeof state === 'object' ? state : {};
}

export function saveOptimizerState(state) {
  return saveJson(OPTIMIZER_STATE_KEY, state || {});
}

export function clearOptimizerState() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(OPTIMIZER_STATE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Registra recompensa de uma estratégia.
 */
export function recordStrategyOutcome(strategyId, reward, options = {}) {
  if (!strategyId) return null;

  const normalizedReward =
    reward === true
      ? 1
      : reward === false
        ? 0
        : clampFinite(reward, 0, 1, 0);

  const state = loadOptimizerState();
  const key = String(strategyId);

  const entry = state[key] || {
    alpha: 0,
    beta: 0,
    trials: 0,
    createdAt: Date.now(),
  };

  const maxCount = clampFinite(options.maxCount, 10, 1000, 300);

  entry.alpha = Math.min(maxCount, (entry.alpha || 0) + normalizedReward);
  entry.beta = Math.min(maxCount, (entry.beta || 0) + (1 - normalizedReward));
  entry.trials = (entry.trials || 0) + 1;
  entry.updatedAt = Date.now();

  state[key] = entry;
  saveOptimizerState(state);

  return entry;
}

/**
 * Seleciona estratégia por Thompson Sampling.
 */
export function selectStrategyThompson(rankedStrategies = [], options = {}) {
  const safeRanked = Array.isArray(rankedStrategies)
    ? rankedStrategies.filter(Boolean)
    : [];

  if (safeRanked.length === 0) return 'baseline';

  const state = loadOptimizerState();

  const seed = options.seed ?? `optimizer-${Date.now()}`;
  const rng = mulberry32(hashSeed(seed));

  const sampled = safeRanked.map((strategy) => {
    const entry = state?.[strategy.id] || {};

    const baseScore = clampFinite(strategy.score, 0, 1, 0);

    const alpha =
      1 +
      (entry.alpha || 0) +
      baseScore * 5;

    const beta =
      1 +
      (entry.beta || 0) +
      (1 - baseScore) * 5;

    const sampledScore = sampleBeta(alpha, beta, rng);

    return {
      ...strategy,
      sampledScore,
    };
  });

  sampled.sort((a, b) => b.sampledScore - a.sampledScore);

  return sampled[0]?.id || 'baseline';
}

/**
 * Recomenda uma ação: keep, promote, rollback ou explore.
 */
export function recommendFlagConfig(input = {}) {
  const ranked = Array.isArray(input.ranked) ? input.ranked : [];

  const latestHealth = input.latestHealth || null;

  const currentFeatures =
    input.currentFeatures && typeof input.currentFeatures === 'object'
      ? input.currentFeatures
      : readFlags();

  const minImprovement = clampFinite(input.minImprovement, 0, 1, 0.02);

  const baseline = ranked.find((strategy) => strategy.id === 'baseline') || null;
  const best = ranked[0] || null;

  // Rollback por saúde crítica.
  if (latestHealth?.status === 'critical' && input.allowRollback !== false) {
    return {
      action: 'rollback',
      strategyId: 'baseline',
      features: {},
      reason:
        'Health score crítico detectado. Recomendação automática: retornar ao baseline.',
      latestHealthScore: latestHealth?.healthScore ?? null,
      ranked: ranked.slice(0, 5),
    };
  }

  // Exploração opcional.
  if (input.exploration === true && ranked.length > 1) {
    const selectedId = selectStrategyThompson(ranked, input);

    if (selectedId && selectedId !== 'baseline') {
      const selectedStrategy = ranked.find((s) => s.id === selectedId);

      if (selectedStrategy) {
        return {
          action: 'explore',
          strategyId: selectedStrategy.id,
          features: selectedStrategy.features,
          reason:
            'Modo de exploração ativo. Estratégia selecionada por Thompson Sampling.',
          ranked: ranked.slice(0, 5),
        };
      }
    }
  }

  if (!best || !best.hasEvidence) {
    return {
      action: 'keep',
      strategyId: 'baseline',
      features: currentFeatures,
      reason: 'Sem evidência suficiente para promover mudança.',
      ranked: ranked.slice(0, 5),
    };
  }

  const baselineScore = baseline?.score ?? 0;

  if (best.id === 'baseline') {
    return {
      action: 'keep',
      strategyId: 'baseline',
      features: {},
      reason: 'O baseline é a melhor estratégia comprovada.',
      score: best.score,
      baselineScore,
      ranked: ranked.slice(0, 5),
    };
  }

  if (best.score < baselineScore + minImprovement) {
    return {
      action: 'keep',
      strategyId: best.id,
      features: currentFeatures,
      reason:
        'A estratégia candidata supera o baseline, mas a margem é insuficiente para justificar mudança.',
      score: best.score,
      baselineScore,
      minImprovement,
      ranked: ranked.slice(0, 5),
    };
  }

  return {
    action: 'promote',
    strategyId: best.id,
    features: best.features,
    reason: 'Estratégia candidata supera o baseline com margem mínima.',
    score: best.score,
    baselineScore,
    ranked: ranked.slice(0, 5),
  };
}

/**
 * Aplica recomendação de flags.
 *
 * Só aplica se:
 * - options.force === true; ou
 * - globalThis.__COACH_FEATURES__.useAutoFlagApplication === true.
 */
export function applyRecommendedFlags(recommendation, options = {}) {
  if (!recommendation || typeof recommendation !== 'object') return false;

  const allowAuto =
    options.force === true ||
    readFlags().useAutoFlagApplication === true;

  if (!allowAuto) return false;

  if (recommendation.action === 'keep') return false;

  const current = readFlags();
  const safeBaseline = getSafeBaselineFeatures();

  let next = { ...current };

  if (recommendation.action === 'rollback') {
    next = {
      ...next,
      ...safeBaseline,
    };
  } else if (recommendation.action === 'promote') {
    next = {
      ...next,
      ...safeBaseline,
      ...(recommendation.features || {}),
    };
  } else if (recommendation.action === 'explore') {
    next = {
      ...next,
      ...safeBaseline,
      ...(recommendation.features || {}),
    };
  } else {
    return false;
  }

  writeFlags(next);
  persistCoachFlags(next);

  return true;
}

export default {
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
};


```
