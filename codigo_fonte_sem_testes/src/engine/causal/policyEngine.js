/**
 * policyEngine.js
 *
 * Lote 11 — Personalized Policy Engine
 *
 * Usa uplift causal para personalizar recomendações.
 */

import { normalizeCausalUplift } from './upliftModel.js';

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Infere tipo de ação a partir do texto.
 */
export function inferActionType(text = '') {
  const s = String(text || '').toLowerCase();

  if (/agilidade|cronômetro|cronometro|tempo|velocidade/.test(s)) {
    return 'agility_training';
  }

  if (/revisão espaçada|revisao espacada|srs|flashcard|memória|memoria|retenção|retencao/.test(s)) {
    return 'srs_review';
  }

  if (/simulado|prova|mock|exame/.test(s)) {
    return 'mock_exam';
  }

  if (/revisão geral|revisao geral|geral|manutenção|manutencao/.test(s)) {
    return 'general_review';
  }

  if (/questões|questoes|exercícios|exercicios|prática|pratica|bateria/.test(s)) {
    return 'weak_topic_practice';
  }

  return 'weak_topic_practice';
}

/**
 * Converte tópicos fracos em candidatos de ação.
 */
export function candidatesFromWeakTopics(topics = [], category = {}, options = {}) {
  const safeTopics = Array.isArray(topics) ? topics : Object.values(topics || {});
  const maxTopics = Math.round(clampFinite(options.maxTopics, 1, 30, 8));

  return safeTopics
    .filter(Boolean)
    .slice(0, maxTopics)
    .map((topic, index) => {
      const rawProficiency = Number.isFinite(topic.bayesianProficiency)
        ? topic.bayesianProficiency
        : Number.isFinite(topic.percentage)
          ? topic.percentage
          : 50;

      const weakness = clampFinite(1 - rawProficiency / 100, 0, 1, 0.5);

      const uncertainty = Number.isFinite(topic.bayesianUncertainty)
        ? topic.bayesianUncertainty
        : topic.isUntested
          ? 0.8
          : 0.35;

      const evidence = Number.isFinite(topic.bayesianEvidence)
        ? topic.bayesianEvidence
        : clampFinite((topic.total || 0) / ((topic.total || 0) + 10), 0, 1, 0);

      return {
        id: `topic:${category?.id || 'category'}:${topic.name || index}`,
        type: 'weak_topic_practice',
        name: topic.name || `Tópico ${index + 1}`,
        categoryId: category?.id || null,
        categoryName: category?.name || null,
        decisionUtility: Number.isFinite(topic.decisionUtility)
          ? topic.decisionUtility
          : clampFinite((topic.urgencyScore || 0) / 2, 0, 100, 40),
        features: {
          weakness,
          uncertainty,
          evidence,
          recencyDays: Number.isFinite(topic.daysSince) ? topic.daysSince : 21,
          costMinutes: Number.isFinite(topic.costMinutes) ? topic.costMinutes : 35,
          priority: topic.manualPriority >= 40 ? 'high' : 'medium',
          fsrsDue: Boolean(topic.srsDue),
        },
      };
    });
}

/**
 * Adiciona ações sistêmicas: SRS, agilidade, revisão geral, simulado crítico.
 */
export function addSystemActionCandidates(candidates = [], metrics = {}, options = {}) {
  const safeCandidates = Array.isArray(candidates) ? [...candidates] : [];

  const categoryId = options.categoryId || null;
  const categoryName = options.categoryName || null;

  const hasType = (type) =>
    safeCandidates.some((candidate) => candidate?.type === type);

  if (metrics?.srsLabel && !hasType('srs_review')) {
    safeCandidates.push({
      id: `system:srs:${categoryId || 'global'}`,
      type: 'srs_review',
      name: 'Revisão Espaçada (SRS)',
      categoryId,
      categoryName,
      decisionUtility: 78,
      features: {
        weakness: 0.35,
        uncertainty: 0.25,
        evidence: 0.7,
        recencyDays: metrics.daysSinceLastStudy ?? 7,
        costMinutes: 25,
        priority: 'high',
        fsrsDue: true,
      },
    });
  }

  const avgSeconds = Number(metrics?.avgSeconds);

  if (Number.isFinite(avgSeconds) && avgSeconds > 150 && !hasType('agility_training')) {
    safeCandidates.push({
      id: `system:agility:${categoryId || 'global'}`,
      type: 'agility_training',
      name: 'Treino de Agilidade',
      categoryId,
      categoryName,
      decisionUtility: 65,
      features: {
        weakness: 0.30,
        uncertainty: 0.30,
        evidence: 0.65,
        recencyDays: metrics.daysSinceLastStudy ?? 7,
        costMinutes: 30,
        priority: 'medium',
      },
    });
  }

  const probability = Number(metrics?.mcProbability);

  if (
    Number.isFinite(probability) &&
    probability < 35 &&
    !hasType('mock_exam')
  ) {
    safeCandidates.push({
      id: `system:critical-mock:${categoryId || 'global'}`,
      type: 'mock_exam',
      name: 'Simulado de Intervenção',
      categoryId,
      categoryName,
      decisionUtility: 82,
      features: {
        weakness: 0.55,
        uncertainty: 0.45,
        evidence: 0.7,
        recencyDays: metrics.daysSinceLastStudy ?? 5,
        costMinutes: 90,
        priority: 'high',
      },
    });
  }

  if (!hasType('general_review')) {
    safeCandidates.push({
      id: `system:general-review:${categoryId || 'global'}`,
      type: 'general_review',
      name: 'Revisão Geral',
      categoryId,
      categoryName,
      decisionUtility: 48,
      features: {
        weakness: 0.30,
        uncertainty: 0.40,
        evidence: 0.5,
        recencyDays: metrics.daysSinceLastStudy ?? 10,
        costMinutes: 45,
        priority: 'medium',
      },
    });
  }

  return safeCandidates;
}

function getCausalEstimateForCandidate(candidate, causalModel) {
  if (!causalModel || typeof causalModel !== 'object') {
    return null;
  }

  const actions = causalModel.actions || {};

  return (
    actions[candidate?.type] ||
    actions.global ||
    causalModel.global ||
    null
  );
}

/**
 * Pontua candidatos combinando utilidade e uplift causal.
 */
export function scoreCandidatesWithCausal(candidates = [], causalModel = null, options = {}) {
  const safeCandidates = Array.isArray(candidates) ? candidates : [];

  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);

  const baseCausalWeight = clampFinite(options.causalWeight, 0, 0.85, 0.35);

  return safeCandidates
    .filter(Boolean)
    .map((candidate) => {
      const causalEstimate = getCausalEstimateForCandidate(candidate, causalModel);

      const uplift = Number.isFinite(causalEstimate?.uplift)
        ? causalEstimate.uplift
        : 0;

      const sampleSize = Number.isFinite(causalEstimate?.sampleSize)
        ? causalEstimate.sampleSize
        : Number.isFinite(causalEstimate?.diagnostics?.n)
          ? causalEstimate.diagnostics.n
          : 0;

      const evidenceFactor = sampleSize / (sampleSize + 20);

      const effectiveCausalWeight =
        baseCausalWeight * (0.25 + 0.75 * evidenceFactor);

      const causalScore = normalizeCausalUplift(uplift, maxScore) * 100;

      const baseUtility = clampFinite(candidate.decisionUtility, 0, 100, 40);

      const finalPolicyScore =
        baseUtility * (1 - effectiveCausalWeight) +
        causalScore * effectiveCausalWeight;

      return {
        ...candidate,
        causalUplift: Number(uplift.toFixed(4)),
        causalSampleSize: sampleSize,
        causalMethod: causalEstimate?.method || null,
        causalScore: Number(causalScore.toFixed(2)),
        effectiveCausalWeight: Number(effectiveCausalWeight.toFixed(4)),
        finalPolicyScore: Number(finalPolicyScore.toFixed(2)),
      };
    })
    .sort((a, b) => b.finalPolicyScore - a.finalPolicyScore);
}

/**
 * Seleciona ações personalizadas.
 */
export function selectPersonalizedActions(candidates = [], causalModel = null, options = {}) {
  let scored = scoreCandidatesWithCausal(candidates, causalModel, options);

  const healthStatus = String(options.healthStatus || '').toLowerCase();

  if (healthStatus === 'critical') {
    scored = scored.map((candidate) => {
      let adjustedScore = candidate.finalPolicyScore;

      if (candidate.type === 'mock_exam') {
        adjustedScore *= 0.75;
      }

      if (
        candidate.type === 'srs_review' ||
        candidate.type === 'general_review'
      ) {
        adjustedScore *= 1.08;
      }

      const costMinutes = Number(candidate?.features?.costMinutes) || 0;

      if (costMinutes > 75) {
        adjustedScore *= 0.85;
      }

      return {
        ...candidate,
        finalPolicyScore: Number(adjustedScore.toFixed(2)),
      };
    });

    scored.sort((a, b) => b.finalPolicyScore - a.finalPolicyScore);
  }

  const topK = Math.round(clampFinite(options.topK, 1, 30, 5));

  const selected = scored.slice(0, topK);

  return selected.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    rationale: `${candidate.type} | utilidade ${candidate.decisionUtility ?? 0} | uplift ${candidate.causalUplift} | evidência ${candidate.causalSampleSize}`,
    policy: {
      personalized: true,
      causalModelAvailable: Boolean(causalModel),
      healthStatus: healthStatus || 'unknown',
    },
  }));
}

/**
 * Gera relatório de política personalizada.
 */
export function buildPolicyReport(selectedActions = [], causalModel = null, options = {}) {
  const safeSelected = Array.isArray(selectedActions) ? selectedActions : [];

  return {
    generatedAt: Date.now(),
    maxScore: options.maxScore ?? 100,
    healthStatus: options.healthStatus || null,
    selectedActions,
    globalUplift: causalModel?.global?.uplift ?? null,
    actionUplifts: causalModel?.actions || {},
    sampleSize: causalModel?.sampleSize ?? null,
    recommendations: safeSelected.map((action) => ({
      rank: action.rank,
      id: action.id,
      name: action.name,
      type: action.type,
      score: action.finalPolicyScore,
      uplift: action.causalUplift,
      evidence: action.causalSampleSize,
      rationale: action.rationale,
    })),
  };
}

export default {
  inferActionType,
  candidatesFromWeakTopics,
  addSystemActionCandidates,
  scoreCandidatesWithCausal,
  selectPersonalizedActions,
  buildPolicyReport,
};

