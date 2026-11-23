/**
 * decisionEngine.js
 *
 * Lote 5 — Decision Utility + Contextual Bandit leve
 *
 * Objetivo:
 * - rankear tópicos/tarefas por utilidade esperada;
 * - combinar fraqueza, incerteza, evidência, recência, prioridade e custo;
 * - permitir exploração opcional via Thompson Sampling aproximado;
 * - criar base para aprendizado futuro com recompensas.
 */

import { safeGetItem, safeSetItem, safeRemoveItem } from '../../utils/coachStorage.js';
import { hashSeed, mulberry32, createGaussianSampler, sampleBeta } from '../random.js';

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}


const BANDIT_STORAGE_KEY = 'coach_decision_bandit_v1';

function resolveBanditStorageKey(contestId) {
  if (contestId && typeof contestId === 'string' && contestId !== 'default') {
    return `${BANDIT_STORAGE_KEY}:${contestId}`;
  }
  return BANDIT_STORAGE_KEY;
}

function loadBanditState(contestId) {
  try {
    const raw = safeGetItem(resolveBanditStorageKey(contestId));
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveBanditState(state, contestId) {
  safeSetItem(resolveBanditStorageKey(contestId), JSON.stringify(state || {}));
}

/**
 * Calcula utilidade de decisão para um candidato.
 *
 * Candidato pode ser tópico ou tarefa.
 */
export function computeDecisionUtility(candidate = {}, options = {}) {
  const weakness = clampFinite(candidate.weakness, 0, 1, 0.5);
  const uncertainty = clampFinite(candidate.uncertainty, 0, 1, 0.35);
  const evidence = clampFinite(candidate.evidence, 0, 1, 0);
  const recencyDays = clampFinite(candidate.recencyDays, 0, 180, 21);
  const errorRate = clampFinite(candidate.errorRate, 0, 1, 0);
  const rawWeight = (candidate.weight !== null && candidate.weight !== undefined && typeof candidate.weight !== 'boolean' && String(candidate.weight).trim() !== '')
    ? Number(candidate.weight)
    : NaN;
  const safePositiveWeight = Number.isFinite(rawWeight) && rawWeight >= 0 ? rawWeight : 5;
  const maxWeightScale = Number.isFinite(Number(options.maxWeight)) && Number(options.maxWeight) > 0
    ? Number(options.maxWeight)
    : (safePositiveWeight > 10 ? safePositiveWeight : 10);
  const weight = maxWeightScale !== 10
    ? clampFinite((safePositiveWeight / maxWeightScale) * 10, 0, 10, 5)
    : clampFinite(safePositiveWeight, 0, 10, 5);
  const costMinutes = clampFinite(candidate.costMinutes, 0, 480, 30);
  // fatigue em [0, 100]: 0 = descansado (sem penalidade), 100 = exausto (penalidade máxima),
  // alinhado com getCognitiveState().fatigue em coachHistory.js.
  const fatigue = clampFinite(candidate.fatigue, 0, 100, 0);

  let priorityScore = clampFinite(candidate.priorityValue, 0, 1, NaN);

  if (!Number.isFinite(priorityScore)) {
    const priority = String(candidate.priority || '').toLowerCase().trim();

    if (priority === 'high' || priority === 'alta' || priority === 'alto' || priority === 'urgente') priorityScore = 1;
    else if (priority === 'medium' || priority === 'media' || priority === 'média') priorityScore = 0.55;
    else if (priority === 'low' || priority === 'baixa' || priority === 'baixo') priorityScore = 0.2;
    else priorityScore = 0.45;
  }

  let mcRiskScore = 0.35;

  const mcRisk = String(candidate.mcRisk || '').toLowerCase();
  if (mcRisk === 'critical') mcRiskScore = 1;
  else if (mcRisk === 'elevated_global_risk') mcRiskScore = 0.7;
  else if (mcRisk === 'moderate') mcRiskScore = 0.4;
  else if (mcRisk === 'safe') mcRiskScore = 0.08;

  const weightFactor = (weight - 1) / 9;
  const recencyRisk = 1 - Math.exp(-recencyDays / 15);

  // Evita cancelamento parcial de uncertaintyWeight (-2.7u) e offset artificial (+2.7)
  const evidenceQuality = evidence;

  // FIX-PARAM: pesos normalizados para somar 100 (antes: 106).
  const weaknessWeight = clampFinite(options.weaknessWeight, 0, 100, 34);
  const uncertaintyWeight = clampFinite(options.uncertaintyWeight, 0, 100, 9);
  const evidenceWeight = clampFinite(options.evidenceWeight, 0, 100, 9);
  const priorityWeight = clampFinite(options.priorityWeight, 0, 100, 17);
  const recencyWeight = clampFinite(options.recencyWeight, 0, 100, 10);
  const errorWeight = clampFinite(options.errorWeight, 0, 100, 8);
  const riskWeight = clampFinite(options.riskWeight, 0, 100, 7);
  const weightWeight = clampFinite(options.weightWeight, 0, 100, 6);
  // Soma: 34+9+9+17+10+8+7+6 = 100 ✓

  const baseUtility =
    weakness * weaknessWeight +
    uncertainty * uncertaintyWeight +
    evidenceQuality * evidenceWeight +
    priorityScore * priorityWeight +
    recencyRisk * recencyWeight +
    errorRate * errorWeight +
    mcRiskScore * riskWeight +
    weightFactor * weightWeight;

  const costPenalty = (costMinutes / 240) * 8;
  const fatiguePenalty = (fatigue / 100) * 12;

  const utility = clampFinite(
    baseUtility - costPenalty - fatiguePenalty,
    0,
    100,
    0
  );

  return {
    utility: Number(utility.toFixed(2)),
    components: {
      weakness: Number(weakness.toFixed(4)),
      uncertainty: Number(uncertainty.toFixed(4)),
      evidence: Number(evidence.toFixed(4)),
      evidenceQuality: Number(evidenceQuality.toFixed(4)),
      priorityScore: Number(priorityScore.toFixed(4)),
      recencyRisk: Number(recencyRisk.toFixed(4)),
      errorRate: Number(errorRate.toFixed(4)),
      mcRiskScore: Number(mcRiskScore.toFixed(4)),
      weightFactor: Number(weightFactor.toFixed(4)),
      costPenalty: Number(costPenalty.toFixed(4)),
      fatiguePenalty: Number(fatiguePenalty.toFixed(4)),
    },
  };
}

/**
 * Retorna posterior Beta para um candidato.
 * Usa histórico salvo + prior uniforme Beta(1, 1) para evitar dupla contagem com `utility`.
 */
function buildBanditPosteriorFromState(state, actionId) {
  const entry = state?.[String(actionId)] || {};

  const priorAlpha = 1;
  const priorBeta = 1;

  const successes = clampFinite(entry.alpha, 0, 10000, 0);
  const failures = clampFinite(entry.beta, 0, 10000, 0);
  const persistedTrials = Number(entry.trials);

  return {
    alpha: priorAlpha + successes,
    beta: priorBeta + failures,
    successes,
    failures,
    trials: Number.isFinite(persistedTrials) && persistedTrials >= 0 ? persistedTrials : (successes + failures),
  };
}

export function getBanditPosterior(actionId, _utility = 50, contestId) {
  const state = loadBanditState(contestId);
  return buildBanditPosteriorFromState(state, actionId);
}

/**
 * Registra recompensa de uma ação.
 *
 * reward:
 * - true / 1 = ação útil;
 * - false / 0 = ação não útil;
 * - 0..1 = recompensa parcial.
 */
export function recordDecisionOutcome(actionId, reward, options = {}) {
  if (!actionId) return null;

  const normalizedReward =
    reward === true
      ? 1
      : reward === false
        ? 0
        : clampFinite(reward, 0, 1, 0);

  const state = loadBanditState(options.contestId);
  const key = String(actionId);

  const entry = state[key] || {
    alpha: 0,
    beta: 0,
    trials: 0,
    createdAt: Date.now(),
  };

  const maxCount = clampFinite(options.maxCount, 10, 1000, 300);

  let nextAlpha = Math.max(0, (Number(entry.alpha) || 0) + normalizedReward);
  let nextBeta = Math.max(0, (Number(entry.beta) || 0) + (1 - normalizedReward));
  const totalPseudoCounts = nextAlpha + nextBeta;
  if (totalPseudoCounts > maxCount && totalPseudoCounts > 0) {
    const discount = maxCount / totalPseudoCounts;
    nextAlpha *= discount;
    nextBeta *= discount;
  }

  entry.alpha = Number(nextAlpha.toFixed(6));
  entry.beta = Number(nextBeta.toFixed(6));
  entry.trials = (entry.trials || 0) + 1;
  entry.updatedAt = Date.now();

  state[key] = entry;
  saveBanditState(state, options.contestId);

  return entry;
}

/**
 * Limpa memória do bandit.
 */
export function clearDecisionBandit(contestId) {
  safeRemoveItem(resolveBanditStorageKey(contestId));
}

/**
 * Rankeia candidatos usando utilidade + exploração opcional.
 */
export function rankDecisionCandidates(candidates = [], options = {}) {
  const safeCandidates = Array.isArray(candidates)
    ? candidates.filter(Boolean)
    : Object.values(candidates || {}).filter(Boolean);

  if (safeCandidates.length === 0) return [];

  const useBandit = options.useBandit === true;
  const sessionBucket = useBandit ? new Date().toISOString().slice(0, 10) : 'static';
  const seed = options.seed ?? `decision-${safeCandidates.length}-${sessionBucket}`;
  // Carrega o estado do bandit uma única vez (evita O(N) leituras/parses do localStorage)
  const banditState = useBandit ? loadBanditState(options.contestId) : null;

  const explorationScale = clampFinite(options.explorationScale, 0, 100, 18);
  const candidateWeights = safeCandidates
    .map((c) => Number(c?.weight))
    .filter((w) => Number.isFinite(w) && w > 0);
  const inferredMaxWeight = candidateWeights.length > 0 ? Math.max(...candidateWeights) : 10;
  const resolvedDecisionOptions = options.maxWeight !== undefined
    ? options
    : { ...options, maxWeight: inferredMaxWeight };

  const enriched = safeCandidates.map((candidate, index) => {
    const decision = computeDecisionUtility(candidate, resolvedDecisionOptions);

    let explorationBonus = 0;
    let posterior = null;

    if (useBandit) {
      const actionId = String(
        candidate.id ?? candidate.name ?? `candidate-${index}`
      );

      posterior = buildBanditPosteriorFromState(banditState, actionId);
      // RNG isolado por actionId para que inserir/reordenar candidatos não altere o bônus dos demais
      const itemRng = mulberry32(hashSeed(`${seed}:${actionId}`));
      const itemGaussian = createGaussianSampler(itemRng);

      const sampledRewardProbability = sampleBeta(
        posterior.alpha,
        posterior.beta,
        itemRng,
        itemGaussian
      );

      explorationBonus = sampledRewardProbability * explorationScale;
    }

    const decisionScore = decision.utility + explorationBonus;

    return {
      ...candidate,
      decision,
      posterior,
      explorationBonus: Number(explorationBonus.toFixed(2)),
      decisionScore: Number(decisionScore.toFixed(2)),
    };
  });

  return enriched.sort((a, b) => b.decisionScore - a.decisionScore);
}

export default {
  computeDecisionUtility,
  rankDecisionCandidates,
  getBanditPosterior,
  recordDecisionOutcome,
  clearDecisionBandit,
};

