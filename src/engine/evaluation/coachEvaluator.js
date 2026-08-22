/**
 * coachEvaluator.js
 *
 * Lote 8 — Evaluation engine para o Coach.
 *
 * Mede:
 * - calibração de probabilidade;
 * - erro de previsão de nota;
 * - qualidade de ranking de tópicos;
 * - uplift de tarefas;
 * - comparação entre estratégias.
 */
import {
  computeNDCGAtK,
  computeUplift,
} from '../../utils/coachBacktest.js';
import {
  computeBrierScore,
  computeLogLoss,
  computeCalibrationDiagnostics,
} from '../../utils/calibration.js';

const EVAL_STORAGE_KEY = 'coach_evaluation_results_v1';
const EVAL_STORAGE_MAX = 500;

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFinite(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// FIX: remove acentos (NFD) para casar "Funções" ≙ "funcoes"
function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * Avalia uma probabilidade prevista contra um resultado binário.
 */
export function evaluateProbabilityPrediction(
  predictedProbabilityPct,
  observedSuccess,
  _options = {}
) {
  const predictedPct = clampFinite(Number(predictedProbabilityPct), 0, 100, 50);
  const predictedProbability01 = predictedPct / 100;
  const observed = observedSuccess ? 1 : 0;
  const brier = computeBrierScore(predictedProbability01, observed);
  const logLoss = computeLogLoss(predictedProbability01, observed);

  return {
    predictedProbabilityPct: Number(predictedPct.toFixed(2)),
    predictedProbability01: Number(predictedProbability01.toFixed(6)),
    observed,
    observedSuccess: observed === 1,
    brier: Number.isFinite(brier) ? Number(brier.toFixed(6)) : null,
    logLoss: Number.isFinite(logLoss) ? Number(logLoss.toFixed(6)) : null,
    absoluteError: Number(Math.abs(predictedProbability01 - observed).toFixed(6)),
    hit:
      predictedProbability01 >= 0.5
        ? observed === 1
        : observed === 0,
  };
}

/**
 * Avalia previsão de nota contínua.
 */
export function evaluateScorePrediction(
  predictedScore,
  observedScore,
  options = {}
) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const predicted = clampFinite(Number(predictedScore), 0, maxScore, null);
  const observed = clampFinite(Number(observedScore), 0, maxScore, null);

  if (predicted === null || observed === null) {
    return null;
  }

  const error = observed - predicted;
  const absoluteError = Math.abs(error);
  const normalizedError = absoluteError / maxScore;

  return {
    predicted: Number(predicted.toFixed(2)),
    observed: Number(observed.toFixed(2)),
    error: Number(error.toFixed(2)),
    absoluteError: Number(absoluteError.toFixed(2)),
    normalizedError: Number(normalizedError.toFixed(6)),
    maxScore,
  };
}

/**
 * Avalia ranking de tópicos usando NDCG, Precision@K e Recall@K.
 *
 * predictedTopics:
 * [{ name: 'Probabilidade', urgencyScore: 80 }]
 *
 * actualTopics:
 * [{ name: 'Probabilidade', relevance: 2 }]
 *
 * ou apenas:
 * ['Probabilidade', 'Funções']
 */
export function evaluateTopicRanking(
  predictedTopics = [],
  actualTopics = [],
  options = {}
) {
  const k = Math.max(1, Math.round(clampFinite(options.k, 1, 20, 5)));

  const safePredicted = (Array.isArray(predictedTopics) ? predictedTopics : [])
    .filter(Boolean)
    .map((topic, index) => {
      const name = topic?.name ?? topic?.topic ?? topic?.id ?? `topic-${index}`;
      return {
        id: normalizeName(name),
        originalName: String(name),
        score: toFinite(
          topic?.urgencyScore ?? topic?.score ?? topic?.decisionScore,
          predictedTopics.length - index
        ),
      };
    })
    .sort((a, b) => b.score - a.score);

  const safeActual = (Array.isArray(actualTopics) ? actualTopics : [])
    .filter(Boolean)
    .map((topic, index) => {
      if (typeof topic === 'string') {
        return {
          id: normalizeName(topic),
          originalName: topic,
          relevance: 1,
        };
      }
      const name = topic?.name ?? topic?.topic ?? topic?.id ?? `actual-${index}`;
      return {
        id: normalizeName(name),
        originalName: String(name),
        relevance: toFinite(topic?.relevance ?? topic?.weight ?? topic?.score, 1),
      };
    });

  if (safePredicted.length === 0 || safeActual.length === 0) {
    return {
      k,
      ndcg: 0,
      precisionAtK: 0,
      recallAtK: 0,
      hits: 0,
      predictedCount: safePredicted.length,
      actualCount: safeActual.length,
    };
  }

  const ndcgPredicted = safePredicted.map((topic) => ({ id: topic.id }));
  const ndcgActual = safeActual.map((topic) => ({
    id: topic.id,
    relevance: topic.relevance,
  }));
  const ndcg = computeNDCGAtK(ndcgPredicted, ndcgActual, k);

  const actualMap = new Map(
    safeActual.map((topic) => [topic.id, topic.relevance])
  );
  const topK = safePredicted.slice(0, k);
  const hits = topK.filter((topic) => actualMap.has(topic.id)).length;
  const precisionAtK = topK.length > 0 ? hits / topK.length : 0;
  const recallAtK = actualMap.size > 0 ? hits / actualMap.size : 0;

  return {
    k,
    ndcg: Number(ndcg.toFixed(6)),
    precisionAtK: Number(precisionAtK.toFixed(6)),
    recallAtK: Number(recallAtK.toFixed(6)),
    hits,
    predictedCount: safePredicted.length,
    actualCount: safeActual.length,
  };
}

/**
 * Avalia uplift de tarefas concluídas vs não concluídas.
 *
 * events:
 * [
 *   { taskId, completed, preScore, postScore }
 * ]
 */
export function evaluateTaskUplift(events = [], _options = {}) {
  const safeEvents = (Array.isArray(events) ? events : []).filter(Boolean);
  const completedDeltas = [];
  const controlDeltas = [];

  safeEvents.forEach((event) => {
    const pre = toFinite(event?.preScore, NaN);
    const post = toFinite(event?.postScore, NaN);
    if (!Number.isFinite(pre) || !Number.isFinite(post)) return;
    const delta = post - pre;
    if (event?.completed === true) {
      completedDeltas.push(delta);
    } else {
      controlDeltas.push(delta);
    }
  });

  const avgCompletedDelta = meanValues(completedDeltas);
  const avgControlDelta = meanValues(controlDeltas);
  const uplift = computeUplift(controlDeltas, completedDeltas);

  return {
    completedCount: completedDeltas.length,
    controlCount: controlDeltas.length,
    avgCompletedDelta:
      avgCompletedDelta === null ? null : Number(avgCompletedDelta.toFixed(4)),
    avgControlDelta:
      avgControlDelta === null ? null : Number(avgControlDelta.toFixed(4)),
    uplift: Number.isFinite(uplift) ? Number(uplift.toFixed(4)) : null,
  };
}

/**
 * Avalia um snapshot do Coach contra um resultado futuro.
 */
export function evaluateCoachSnapshot(snapshot = {}, outcome = {}, options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const targetScore = clampFinite(options.targetScore, 0, maxScore, maxScore * 0.8);
  const predictedProbability = toFinite(snapshot?.probability, null);

  let observedSuccess = outcome?.success;
  if (observedSuccess === undefined || observedSuccess === null) {
    const observedScore = toFinite(outcome?.score, null);
    if (observedScore !== null) {
      observedSuccess = observedScore >= targetScore;
    }
  }

  const probabilityEvaluation =
    predictedProbability !== null && observedSuccess !== null
      ? evaluateProbabilityPrediction(predictedProbability, observedSuccess)
      : null;

  const scoreEvaluation = evaluateScorePrediction(
    snapshot?.predictedMean,
    outcome?.score,
    { maxScore }
  );

  let topicEvaluation = null;
  if (
    options.evaluateTopics !== false &&
    Array.isArray(snapshot?.weakTopics) &&
    snapshot.weakTopics.length > 0 &&
    Array.isArray(outcome?.relevantTopics) &&
    outcome.relevantTopics.length > 0
  ) {
    topicEvaluation = evaluateTopicRanking(
      snapshot.weakTopics,
      outcome.relevantTopics,
      {
        k: options.k ?? 5,
      }
    );
  }

  return {
    id:
      snapshot?.id ||
      `eval_${snapshot?.strategyId || 'strategy'}_${snapshot?.categoryId || 'category'}_${Date.now()}`,
    timestamp: toFinite(snapshot?.timestamp, Date.now()),
    strategyId: snapshot?.strategyId ?? null,
    categoryId: snapshot?.categoryId ?? null,
    categoryName: snapshot?.categoryName ?? null,
    normalizedScore: toFinite(snapshot?.normalizedScore, null),
    targetScore,
    maxScore,
    probabilityEvaluation,
    scoreEvaluation,
    topicEvaluation,
    taskUpliftEvaluation: null,
    meta: {
      snapshotKeys: Object.keys(snapshot || {}),
      outcomeKeys: Object.keys(outcome || {}),
    },
  };
}

/**
 * Resume várias avaliações.
 *
 * FIX: um único loop (reduce) em vez de 10 arrays + forEach separados —
 * mesma saída, menos alocação e menos passadas.
 */
export function summarizeCoachEvaluations(evaluations = [], options = {}) {
  const safeEvaluations = (Array.isArray(evaluations) ? evaluations : []).filter(
    Boolean
  );

  const acc = safeEvaluations.reduce(
    (result, evaluation) => {
      const probability = evaluation?.probabilityEvaluation;
      if (probability) {
        result.probabilityPairs.push({
          probability: probability.predictedProbability01,
          observed: probability.observed,
        });
        if (Number.isFinite(probability.brier)) result.briers.push(probability.brier);
        if (Number.isFinite(probability.logLoss)) result.logLosses.push(probability.logLoss);
        if (Number.isFinite(probability.absoluteError)) {
          result.probabilityAbsoluteErrors.push(probability.absoluteError);
        }
      }

      const score = evaluation?.scoreEvaluation;
      if (score) {
        if (Number.isFinite(score.absoluteError)) {
          result.scoreAbsoluteErrors.push(score.absoluteError);
        }
        if (Number.isFinite(score.normalizedError)) {
          result.scoreNormalizedErrors.push(score.normalizedError);
        }
      }

      const topics = evaluation?.topicEvaluation;
      if (topics) {
        if (Number.isFinite(topics.ndcg)) result.ndcgs.push(topics.ndcg);
        if (Number.isFinite(topics.precisionAtK)) result.precisions.push(topics.precisionAtK);
        if (Number.isFinite(topics.recallAtK)) result.recalls.push(topics.recallAtK);
      }

      const uplift = evaluation?.taskUpliftEvaluation?.uplift;
      if (Number.isFinite(uplift)) result.uplifts.push(uplift);

      return result;
    },
    {
      probabilityPairs: [],
      briers: [],
      logLosses: [],
      probabilityAbsoluteErrors: [],
      scoreAbsoluteErrors: [],
      scoreNormalizedErrors: [],
      ndcgs: [],
      precisions: [],
      recalls: [],
      uplifts: [],
    }
  );

  const diagnostics =
    acc.probabilityPairs.length >= 3
      ? computeCalibrationDiagnostics(acc.probabilityPairs, {
          bins: options.bins ?? 6,
        })
      : {
          ece: 0,
          mce: 0,
          reliability: [],
        };

  const avgBrier = meanValues(acc.briers);
  const avgLogLoss = meanValues(acc.logLosses);
  const avgProbabilityAbsoluteError = meanValues(acc.probabilityAbsoluteErrors);
  const mae = meanValues(acc.scoreAbsoluteErrors);
  const meanNormalizedError = meanValues(acc.scoreNormalizedErrors);
  const avgNdcg = meanValues(acc.ndcgs);
  const avgPrecisionAtK = meanValues(acc.precisions);
  const avgRecallAtK = meanValues(acc.recalls);
  const avgUplift = meanValues(acc.uplifts);

  return {
    count: safeEvaluations.length,
    generatedAt: Date.now(),
    probability: {
      count: acc.probabilityPairs.length,
      avgBrier: avgBrier === null ? null : Number(avgBrier.toFixed(6)),
      avgLogLoss: avgLogLoss === null ? null : Number(avgLogLoss.toFixed(6)),
      avgAbsoluteError:
        avgProbabilityAbsoluteError === null
          ? null
          : Number(avgProbabilityAbsoluteError.toFixed(6)),
      ece: Number(diagnostics.ece.toFixed(6)),
      mce: Number(diagnostics.mce.toFixed(6)),
      reliability: diagnostics.reliability || [],
    },
    score: {
      count: acc.scoreAbsoluteErrors.length,
      mae: mae === null ? null : Number(mae.toFixed(4)),
      meanNormalizedError:
        meanNormalizedError === null
          ? null
          : Number(meanNormalizedError.toFixed(6)),
    },
    topics: {
      count: acc.ndcgs.length,
      avgNdcg: avgNdcg === null ? null : Number(avgNdcg.toFixed(6)),
      avgPrecisionAtK:
        avgPrecisionAtK === null ? null : Number(avgPrecisionAtK.toFixed(6)),
      avgRecallAtK:
        avgRecallAtK === null ? null : Number(avgRecallAtK.toFixed(6)),
    },
    tasks: {
      count: acc.uplifts.length,
      avgUplift: avgUplift === null ? null : Number(avgUplift.toFixed(4)),
    },
    strategyIds: [
      ...new Set(
        safeEvaluations
          .map((evaluation) => evaluation?.strategyId)
          .filter(Boolean)
      ),
    ],
  };
}

/**
 * Compara dois summaries.
 *
 * FIX: heurística clampada em [-1, 1] (pesos fracionários 0.40/0.25/0.35)
 * para não produzir scores fora da faixa quando os deltas normalizados
 * excedem [-1, 1].
 */
export function compareEvaluationSummaries(baseline = {}, candidate = {}) {
  const baseProbability = baseline?.probability || {};
  const candProbability = candidate?.probability || {};
  const baseScore = baseline?.score || {};
  const candScore = candidate?.score || {};
  const baseTopics = baseline?.topics || {};
  const candTopics = candidate?.topics || {};

  const deltaBrier =
    toFinite(candProbability.avgBrier, 0) - toFinite(baseProbability.avgBrier, 0);
  const deltaLogLoss =
    toFinite(candProbability.avgLogLoss, 0) -
    toFinite(baseProbability.avgLogLoss, 0);
  const deltaEce =
    toFinite(candProbability.ece, 0) - toFinite(baseProbability.ece, 0);
  const deltaMae =
    toFinite(candScore.mae, 0) - toFinite(baseScore.mae, 0);
  const deltaNdcg =
    toFinite(candTopics.avgNdcg, 0) - toFinite(baseTopics.avgNdcg, 0);
  const deltaPrecision =
    toFinite(candTopics.avgPrecisionAtK, 0) -
    toFinite(baseTopics.avgPrecisionAtK, 0);

  const normBrier = deltaBrier / Math.max(0.001, Math.abs(toFinite(baseProbability.avgBrier, 0.2)));
  const normNdcg = deltaNdcg / Math.max(0.001, Math.abs(toFinite(baseTopics.avgNdcg, 0.5)));
  const normEce = deltaEce / Math.max(0.001, Math.abs(toFinite(baseProbability.ece, 0.15)));

  // FIX: clamp [-1, 1]
  const heuristicScore = Math.max(-1, Math.min(1,
    -normBrier * 0.40 +
    -normEce * 0.25 +
    normNdcg * 0.35
  ));

  let winner = 'tie';
  if (heuristicScore > 0.001) {
    winner = 'candidate';
  } else if (heuristicScore < -0.001) {
    winner = 'baseline';
  }

  return {
    baselineCount: baseline?.count ?? 0,
    candidateCount: candidate?.count ?? 0,
    delta: {
      brier: Number(deltaBrier.toFixed(6)),
      logLoss: Number(deltaLogLoss.toFixed(6)),
      ece: Number(deltaEce.toFixed(6)),
      mae: Number(deltaMae.toFixed(4)),
      ndcg: Number(deltaNdcg.toFixed(6)),
      precisionAtK: Number(deltaPrecision.toFixed(6)),
    },
    heuristicScore: Number(heuristicScore.toFixed(6)),
    winner,
  };
}

/**
 * Constrói dados prontos para dashboard.
 */
export function buildEvaluationDashboardData(summary = {}) {
  if (!summary || typeof summary !== 'object') return null;

  const probability = summary.probability || {};
  const score = summary.score || {};
  const topics = summary.topics || {};
  const tasks = summary.tasks || {};

  return {
    generatedAt: summary.generatedAt || Date.now(),
    count: summary.count || 0,
    cards: [
      {
        id: 'samples',
        label: 'Avaliações',
        value: summary.count || 0,
      },
      {
        id: 'brier',
        label: 'Brier médio',
        value: probability.avgBrier ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'ece',
        label: 'ECE',
        value: probability.ece ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'mae',
        label: 'MAE de nota',
        value: score.mae ?? null,
        goodDirection: 'lower',
      },
      {
        id: 'ndcg',
        label: 'NDCG de tópicos',
        value: topics.avgNdcg ?? null,
        goodDirection: 'higher',
      },
      {
        id: 'uplift',
        label: 'Uplift de tarefas',
        value: tasks.avgUplift ?? null,
        goodDirection: 'higher',
      },
    ],
    probability: {
      count: probability.count || 0,
      avgBrier: probability.avgBrier ?? null,
      avgLogLoss: probability.avgLogLoss ?? null,
      avgAbsoluteError: probability.avgAbsoluteError ?? null,
      ece: probability.ece ?? null,
      mce: probability.mce ?? null,
      reliability: probability.reliability || [],
    },
    score: {
      count: score.count || 0,
      mae: score.mae ?? null,
      meanNormalizedError: score.meanNormalizedError ?? null,
    },
    topics: {
      count: topics.count || 0,
      avgNdcg: topics.avgNdcg ?? null,
      avgPrecisionAtK: topics.avgPrecisionAtK ?? null,
      avgRecallAtK: topics.avgRecallAtK ?? null,
    },
    tasks: {
      count: tasks.count || 0,
      avgUplift: tasks.avgUplift ?? null,
    },
    strategyIds: summary.strategyIds || [],
  };
}

/**
 * Salva avaliações no localStorage.
 */
export function saveEvaluationResult(result) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const raw = storage.getItem(EVAL_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    const current = Array.isArray(parsed) ? parsed : [];
    const toAdd = Array.isArray(result) ? result : [result];
    const next = [...current, ...toAdd]
      .filter(Boolean)
      .slice(-EVAL_STORAGE_MAX);
    storage.setItem(EVAL_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega avaliações salvas.
 */
export function loadEvaluationResults() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(EVAL_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Limpa avaliações salvas.
 */
export function clearEvaluationResults() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(EVAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default {
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
};
