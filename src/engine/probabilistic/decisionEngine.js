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

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
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

function createGaussianSampler(rng) {
  let spare = null;

  return function gaussian() {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }

    let u = rng();
    let v = rng();

    while (u === 0) u = rng();
    while (v === 0) v = rng();

    const magnitude = Math.sqrt(-2.0 * Math.log(u));
    const z0 = magnitude * Math.cos(2.0 * Math.PI * v);
    const z1 = magnitude * Math.sin(2.0 * Math.PI * v);

    spare = z1;
    return z0;
  };
}

/**
 * Amostra aproximada de uma distribuição Beta.
 * Usa aproximação normal, suficiente para exploração leve.
 */
function sampleBeta(alpha, beta, rng, gaussianSampler) {
  const a = Math.max(1e-6, Number(alpha) || 1);
  const b = Math.max(1e-6, Number(beta) || 1);

  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const sd = Math.sqrt(Math.max(0, variance));

  const gaussian = typeof gaussianSampler === 'function'
    ? gaussianSampler
    : createGaussianSampler(rng);

  const sampled = mean + gaussian() * sd;
  return clampFinite(sampled, 0, 1, mean);
}

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

const BANDIT_STORAGE_KEY = 'coach_decision_bandit_v1';

function loadBanditState() {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(BANDIT_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveBanditState(state) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(BANDIT_STORAGE_KEY, JSON.stringify(state || {}));
  } catch {
    // ignore storage errors
  }
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
  const weight = clampFinite(candidate.weight, 1, 10, 5);
  const costMinutes = clampFinite(candidate.costMinutes, 0, 480, 30);
  const fatigue = clampFinite(candidate.fatigue, 0, 100, 100);

  let priorityScore = clampFinite(candidate.priorityValue, 0, 1, NaN);

  if (!Number.isFinite(priorityScore)) {
    const priority = String(candidate.priority || '').toLowerCase();

    if (priority === 'high') priorityScore = 1;
    else if (priority === 'medium') priorityScore = 0.55;
    else if (priority === 'low') priorityScore = 0.2;
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

  const evidenceQuality =
    evidence * 0.7 +
    (1 - uncertainty) * 0.3;

  // Pesques padrão.
  const weaknessWeight = clampFinite(options.weaknessWeight, 0, 100, 36);
  const uncertaintyWeight = clampFinite(options.uncertaintyWeight, 0, 100, 10);
  const evidenceWeight = clampFinite(options.evidenceWeight, 0, 100, 10);
  const priorityWeight = clampFinite(options.priorityWeight, 0, 100, 18);
  const recencyWeight = clampFinite(options.recencyWeight, 0, 100, 10);
  const errorWeight = clampFinite(options.errorWeight, 0, 100, 8);
  const riskWeight = clampFinite(options.riskWeight, 0, 100, 8);
  const weightWeight = clampFinite(options.weightWeight, 0, 100, 6);

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
  const fatiguePenalty = (1 - fatigue / 100) * 12;

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
 * Usa histórico salvo + prior baseado na utilidade atual.
 */
export function getBanditPosterior(actionId, utility = 50) {
  const state = loadBanditState();
  const entry = state?.[String(actionId)] || {};

  const safeUtility = clampFinite(utility, 0, 100, 50);

  const priorAlpha = 1 + safeUtility / 25;
  const priorBeta = 1 + (100 - safeUtility) / 25;

  const successes = clampFinite(entry.alpha, 0, 10000, 0);
  const failures = clampFinite(entry.beta, 0, 10000, 0);

  return {
    alpha: priorAlpha + successes,
    beta: priorBeta + failures,
    successes,
    failures,
    trials: successes + failures,
  };
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

  const state = loadBanditState();
  const key = String(actionId);

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
  saveBanditState(state);

  return entry;
}

/**
 * Limpa memória do bandit.
 */
export function clearDecisionBandit() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(BANDIT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Rankeia candidatos usando utilidade + exploração opcional.
 */
export function rankDecisionCandidates(candidates = [], options = {}) {
  const safeCandidates = Array.isArray(candidates)
    ? candidates.filter(Boolean)
    : Object.values(candidates || {}).filter(Boolean);

  if (safeCandidates.length === 0) return [];

  const seed = options.seed ?? `decision-${safeCandidates.length}`;
  const rng = mulberry32(hashSeed(seed));
  const gaussianSampler = createGaussianSampler(rng);

  const useBandit = options.useBandit === true;
  const explorationScale = clampFinite(options.explorationScale, 0, 100, 18);

  const enriched = safeCandidates.map((candidate, index) => {
    const decision = computeDecisionUtility(candidate, options);

    let explorationBonus = 0;
    let posterior = null;

    if (useBandit) {
      const actionId = String(
        candidate.id ?? candidate.name ?? `candidate-${index}`
      );

      posterior = getBanditPosterior(actionId, decision.utility);

      const sampledRewardProbability = sampleBeta(
        posterior.alpha,
        posterior.beta,
        rng,
        gaussianSampler
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
