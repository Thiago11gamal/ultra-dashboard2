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
import { toFiniteStrict, clampFiniteStrict } from '../../utils/coachSafe.js';
import { safeSetItem, safeGetJSON, safeRemoveItem } from '../../utils/coachStorage.js';

const EVAL_STORAGE_KEY = 'coach_evaluation_results_v1';
const EVAL_STORAGE_MAX = 500;

// FIX: helpers canônicos do coachSafe (evita duplicação/divergência).
const clampFinite = clampFiniteStrict;
const toFinite = toFiniteStrict;

// FIX: validar que os imports não são undefined (proteção contra tree-shaking)
if (typeof clampFiniteStrict !== 'function' || typeof toFiniteStrict !== 'function') {
  throw new Error('[coachEvaluator] coachSafe imports are not functions — check import path');
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
    .map((v) => toFinite(v, NaN))
    .filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  return finite.reduce((acc, val) => acc + val, 0) / finite.length;
}

/**
 * Avalia uma probabilidade prevista contra um resultado binário.
 */
export function evaluateProbabilityPrediction(
  predictedProbabilityPct,
  observedSuccess,
  _options = {}
) {
  const predictedPct = clampFinite(predictedProbabilityPct, 0, 100, 50);
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
  const minScore = clampFinite(options.minScore, -1_000_000, maxScore - 1e-6, 0);
  const domain = Math.max(1e-6, maxScore - minScore);
  const predicted = clampFinite(predictedScore, minScore, maxScore, null);
  const observed = clampFinite(observedScore, minScore, maxScore, null);

  if (predicted === null || observed === null) {
    return null;
  }

  const error = observed - predicted;
  const absoluteError = Math.abs(error);
  const normalizedError = absoluteError / domain;

  return {
    predicted: Number(predicted.toFixed(2)),
    observed: Number(observed.toFixed(2)),
    error: Number(error.toFixed(2)),
    absoluteError: Number(absoluteError.toFixed(2)),
    normalizedError: Number(normalizedError.toFixed(6)),
    maxScore,
    minScore,
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

  const rawPredicted = (Array.isArray(predictedTopics) ? predictedTopics : [])
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
    });

  // FIX: deduplicar para evitar collision hits inflando o Recall
  const predictedMap = new Map();
  for (const p of rawPredicted) {
    if (!predictedMap.has(p.id) || p.score > predictedMap.get(p.id).score) {
      predictedMap.set(p.id, p);
    }
  }
  const safePredicted = Array.from(predictedMap.values()).sort((a, b) => b.score - a.score);

  const rawActual = (Array.isArray(actualTopics) ? actualTopics : [])
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

  const actualMap = new Map();
  for (const a of rawActual) {
    if (!actualMap.has(a.id) || a.relevance > actualMap.get(a.id).relevance) {
      actualMap.set(a.id, a);
    }
  }
  const safeActual = Array.from(actualMap.values());

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

  const relevantIds = new Set(
    safeActual.filter((item) => item.relevance > 0).map((item) => item.id)
  );
  const topK = safePredicted.slice(0, k);
  const hits = topK.filter((topic) => relevantIds.has(topic.id)).length;
  const precisionAtK = topK.length > 0 ? hits / topK.length : 0;
  const recallAtK = relevantIds.size > 0 ? hits / relevantIds.size : 0;

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
  const maxScore = clampFinite(options.maxScore ?? snapshot?.maxScore, 1, 1_000_000, 100);
  const minScore = clampFinite(options.minScore ?? snapshot?.minScore, -1_000_000, maxScore - 1e-6, 0);
  const domain = Math.max(1e-6, maxScore - minScore);
  const targetScore = clampFinite(
    options.targetScore ?? snapshot?.targetScore,
    minScore,
    maxScore,
    minScore + domain * 0.8
  );
  const predictedProbability = toFinite(snapshot?.probability, null);

  let observedSuccess = outcome?.success;
  if (observedSuccess === undefined || observedSuccess === null) {
    const observedScore = toFinite(outcome?.score, null);
    if (observedScore !== null) {
      observedSuccess = observedScore >= targetScore;
    }
  }

  const probabilityEvaluation =
    predictedProbability !== null && observedSuccess !== null && observedSuccess !== undefined
      ? evaluateProbabilityPrediction(predictedProbability, observedSuccess)
      : null;

  const scoreEvaluation = evaluateScorePrediction(
    snapshot?.predictedMean,
    outcome?.score,
    { maxScore, minScore }
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
    minScore,
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
          // FIX (BUG-08): nunca mais bins que amostras; mínimo 2 bins
          bins: Math.max(2, Math.min(options.bins ?? 6, acc.probabilityPairs.length)),
        })
      : {
          // FIX: null = "sem dados". Zero exibia falsamente "calibração
          // perfeita" no dashboard do Control Center. O pipeline downstream
          // já trata null (Number.isFinite → card exibe '—').
          ece: null,
          mce: null,
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
      ece: diagnostics && Number.isFinite(diagnostics.ece) ? Number(diagnostics.ece.toFixed(6)) : null,
      mce: diagnostics && Number.isFinite(diagnostics.mce) ? Number(diagnostics.mce.toFixed(6)) : null,
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

  // Só calcula delta quando AMBOS os sumários possuem a métrica observada
  // (evita tratar null como 0.000 — ex.: Brier/ECE perfeitos fictícios).
  const pairDelta = (candVal, baseVal) => {
    const c = toFinite(candVal, null);
    const b = toFinite(baseVal, null);
    return c !== null && b !== null ? c - b : null;
  };

  const rawDeltaBrier = pairDelta(candProbability.avgBrier, baseProbability.avgBrier);
  const rawDeltaLogLoss = pairDelta(candProbability.avgLogLoss, baseProbability.avgLogLoss);
  const rawDeltaEce = pairDelta(candProbability.ece, baseProbability.ece);
  const rawDeltaMae = pairDelta(candScore.mae, baseScore.mae);
  const rawDeltaNdcg = pairDelta(candTopics.avgNdcg, baseTopics.avgNdcg);
  const rawDeltaPrecision = pairDelta(candTopics.avgPrecisionAtK, baseTopics.avgPrecisionAtK);

  const deltaBrier = rawDeltaBrier ?? 0;
  const deltaLogLoss = rawDeltaLogLoss ?? 0;
  const deltaEce = rawDeltaEce ?? 0;
  const deltaMae = rawDeltaMae ?? 0;
  const deltaNdcg = rawDeltaNdcg ?? 0;
  const deltaPrecision = rawDeltaPrecision ?? 0;

  let weightedSum = 0;
  let totalWeight = 0;

  if (rawDeltaBrier !== null) {
    const normBrier = rawDeltaBrier / Math.max(0.001, Math.abs(toFinite(baseProbability.avgBrier, 0.2)));
    weightedSum += -normBrier * 0.40;
    totalWeight += 0.40;
  }
  if (rawDeltaEce !== null) {
    const normEce = rawDeltaEce / Math.max(0.001, Math.abs(toFinite(baseProbability.ece, 0.15)));
    weightedSum += -normEce * 0.25;
    totalWeight += 0.25;
  }
  if (rawDeltaNdcg !== null) {
    const normNdcg = rawDeltaNdcg / Math.max(0.001, Math.abs(toFinite(baseTopics.avgNdcg, 0.5)));
    weightedSum += normNdcg * 0.35;
    totalWeight += 0.35;
  }
  if (rawDeltaMae !== null && totalWeight < 0.65) {
    const normMae = rawDeltaMae / Math.max(0.01, Math.abs(toFinite(baseScore.mae, 5)));
    weightedSum += -normMae * 0.20;
    totalWeight += 0.20;
  }

  // FIX: renormaliza pelos pesos efetivamente disponíveis e limita em [-1, 1]
  const heuristicScore = totalWeight > 0
    ? Math.max(-1, Math.min(1, weightedSum / totalWeight))
    : 0;

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
  try {
    const existing = loadEvaluationResults();

    if (!result || typeof result !== 'object') return false;

    const items = Array.isArray(result) ? result : [result];
    const sanitizedItems = items.map(item => {
      if (!item || typeof item !== 'object') return null;
      const sanitized = { ...item };
      if (!Number.isFinite(sanitized.timestamp)) {
        sanitized.timestamp = Number.isFinite(sanitized.generatedAt) ? sanitized.generatedAt : Date.now();
      }
      if (Number.isFinite(sanitized.probability)) {
        sanitized.probability = Math.max(0, Math.min(100, sanitized.probability));
      } else {
        sanitized.probability = null;
      }
      return sanitized;
    }).filter(Boolean);

    if (sanitizedItems.length === 0) return false;

    const updated = [...sanitizedItems, ...existing].slice(0, EVAL_STORAGE_MAX);
    return safeSetItem(EVAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    return false;
  }
}

/**
 * Carrega avaliações salvas.
 */
export function loadEvaluationResults() {
  const parsed = safeGetJSON(EVAL_STORAGE_KEY, []);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(item =>
    item &&
    typeof item === 'object' &&
    Number.isFinite(item.timestamp ?? item.generatedAt)
  );
}

/**
 * Limpa avaliações salvas.
 */
export function clearEvaluationResults() {
  safeRemoveItem(EVAL_STORAGE_KEY);
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

