/**
 * bayesianTopics.js
 *
 * Lote 4 — Bayesian Topic Proficiency
 *
 * Modelo:
 * - Beta-Binomial com prior empírico por disciplina/global.
 * - Cada tópico recebe uma distribuição posterior Beta(alpha, beta).
 * - Tópicos com poucas questões ficam com maior incerteza.
 * - Tópicos não testados não herdam automaticamente a média global.
 *
 * Saída por tópico:
 * - proficiencyMean: média posterior;
 * - proficiencySd: desvio posterior;
 * - ciLow / ciHigh: intervalo credível por quantis reais da Beta;
 * - evidence: confiança baseada no volume amostral;
 * - uncertainty: incerteza normalizada;
 * - isUntested: se o tópico não possui evidência.
 */

import { kahanSum } from '../math/kahan.js';
import { logGamma, regularizedIncompleteBeta } from '../math/gaussian.js';

function clampFinite(value, min, max, fallback = min) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  let str = String(value).trim();
  str = str.replace(/[%\s]/g, '');
  if (!str) return fallback;
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/^[+-]?[1-9]\d{0,2}(\.\d{3}){2,}$/.test(str)) {
    str = str.replace(/\./g, '');
  }
  const n = Number(str);
  return Number.isFinite(n) ? n : fallback;
}

function sumValues(values) {
  return kahanSum(values);
}

function meanValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 0;
  return sumValues(finite) / finite.length;
}

function varianceValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (finite.length < 2) return 0;
  const mean = meanValues(finite);
  const devs = finite.map((v) => Math.pow(v - mean, 2));
  return sumValues(devs) / (finite.length - 1);
}

// ============================================================
// Quantil da distribuição Beta por busca binária com logGamma/Lentz compartilhados
// ============================================================
function betaQuantile(p, a, b) {
  const safeP = clampFinite(p, 1e-8, 1 - 1e-8, 0.5);
  if (!(a > 0) || !(b > 0) || !Number.isFinite(logGamma(a))) return 0.5;

  let lo = 0;
  let hi = 1;
  // 80 iterações de busca binária → precisão ~1e-24
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const cdf = regularizedIncompleteBeta(mid, a, b);
    if (!Number.isFinite(cdf) || cdf >= safeP) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// ============================================================
// FUNÇÃO PRINCIPAL (alteração: IC por quantis Beta)
// ============================================================
export function estimateTopicProficiencies(topics = [], options = {}) {
  const untestedPriorMean = clampFinite(options.untestedPriorMean, 0, 1, 0.25);
  const untestedPriorWeight = clampFinite(options.untestedPriorWeight, 0, 1, 0.45);
  const minPriorStrength = clampFinite(options.minPriorStrength, 1, 50, 3);
  const maxPriorStrength = clampFinite(options.maxPriorStrength, 1, 200, 22);

  const safeTopics = Array.isArray(topics)
    ? topics
    : Object.values(topics || {});

  const parsedTopics = safeTopics.map((topic, index) => {
    const name = String(topic?.name ?? topic?.topic ?? topic?.id ?? `topic-${index}`);
    const total = Math.max(0, toFiniteNumber(topic?.total, 0));
    let correct = toFiniteNumber(topic?.correct ?? topic?.acertos, NaN);
    const pct = toFiniteNumber(topic?.percentage, NaN);
    if (!Number.isFinite(correct) && Number.isFinite(pct) && total > 0) {
      correct = (pct / 100) * total;
    }
    correct = Number.isFinite(correct) ? correct : 0;
    correct = Math.max(0, Math.min(total, correct));
    return { name, total, correct, isUntested: total <= 0 };
  });

  const topicsWithData = parsedTopics.filter((t) => t.total > 0);
  const globalTotal = sumValues(topicsWithData.map((t) => t.total));
  const globalCorrect = sumValues(topicsWithData.map((t) => t.correct));
  // Amortecimento de Laplace com untestedPriorMean evita globalMean = 0 ou 1 em amostras pequenas
  const globalMean =
    globalTotal > 0
      ? clampFinite((globalCorrect + 2 * untestedPriorMean) / (globalTotal + 2), 0.02, 0.98, untestedPriorMean)
      : untestedPriorMean;

  let priorStrength =
    minPriorStrength +
    Math.sqrt(Math.max(0, globalTotal)) * 0.12 +
    topicsWithData.length * 0.25;

  // Empirical Bayes bidirecional: Var(p_hat_i) = tau^2 * (1 - 1/n_i) + mu*(1-mu)/n_i
  // logo tau^2 = (S^2 - mu*(1-mu)*mean(1/n_i)) / (1 - mean(1/n_i)).
  if (topicsWithData.length >= 3) {
    const topicRates = topicsWithData.map((t) => t.correct / t.total);
    const rateMean = clampFinite(meanValues(topicRates), 0.02, 0.98, globalMean);
    const rateVariance = varianceValues(topicRates);
    const invNs = topicsWithData.map((t) => 1 / Math.max(1, t.total));
    const meanInvN = meanValues(invNs);
    const bernoulliScale = Math.max(1e-4, rateMean * (1 - rateMean));
    const denom = 1 - meanInvN;
    if (denom > 0.1) {
      const averageBinomialNoise = bernoulliScale * meanInvN;
      const minTau2 = bernoulliScale / (maxPriorStrength + 1);
      const rawTau2 = (rateVariance - averageBinomialNoise) / denom;
      const tau2 = Math.max(minTau2, rawTau2);
      const momentK = clampFinite(
        bernoulliScale / tau2 - 1,
        minPriorStrength,
        maxPriorStrength,
        priorStrength
      );
      const ebTrust = topicsWithData.length / (topicsWithData.length + 4);
      priorStrength = (1 - ebTrust) * priorStrength + ebTrust * momentK;
    }
  }

  priorStrength = clampFinite(
    priorStrength, minPriorStrength, maxPriorStrength, minPriorStrength
  );

  const globalAlpha0 = Math.max(1e-6, globalMean * priorStrength);
  const globalBeta0 = Math.max(1e-6, (1 - globalMean) * priorStrength);

  const enrichedTopics = parsedTopics.map((topic) => {
    let alpha;
    let beta;
    let priorMean = globalMean;

    if (topic.isUntested) {
      priorMean = untestedPriorMean;
      const localK = Math.max(0.5, priorStrength * untestedPriorWeight);
      alpha = Math.max(1e-6, priorMean * localK);
      beta = Math.max(1e-6, (1 - priorMean) * localK);
    } else {
      alpha = globalAlpha0 + topic.correct;
      beta = globalBeta0 + Math.max(0, topic.total - topic.correct);
    }

    const posteriorStrength = alpha + beta;
    const proficiencyMean =
      posteriorStrength > 0
        ? clampFinite(alpha / posteriorStrength, 0, 1, priorMean)
        : priorMean;
    const proficiencyVariance =
      posteriorStrength > 0
        ? (alpha * beta) /
          (posteriorStrength * posteriorStrength * (posteriorStrength + 1))
        : 0;
    const proficiencySd = Math.sqrt(Math.max(0, proficiencyVariance));

    // ✅ CORREÇÃO PRINCIPAL: IC por quantis reais da posterior Beta.
    // Antes: mean ± 1.96 * sd (aproximação simétrica, inválida aqui).
    // Agora: quantis 2.5% e 97.5% da Beta(alpha, beta).
    const ciLow = betaQuantile(0.025, alpha, beta);
    const ciHigh = betaQuantile(0.975, alpha, beta);

    const evidence = topic.isUntested
      ? 0
      : clampFinite(topic.total / (topic.total + priorStrength), 0, 1, 0);
    const uncertainty = clampFinite(proficiencySd / 0.25, 0, 1, 0);

    return {
      name: topic.name,
      total: topic.total,
      correct: topic.correct,
      isUntested: topic.isUntested,
      priorMean,
      priorStrength: topic.isUntested
        ? Math.max(0.5, priorStrength * untestedPriorWeight)
        : priorStrength,
      posteriorAlpha: alpha,
      posteriorBeta: beta,
      posteriorStrength,
      proficiencyMean,
      proficiencySd,
      proficiencyPct: proficiencyMean * 100,
      ciLow,
      ciHigh,
      evidence,
      uncertainty,
    };
  });

  return {
    model: 'beta_binomial_empirical_bayes',
    global: {
      globalTotal,
      globalCorrect,
      globalMean,
      priorStrength,
      alpha0: globalAlpha0,
      beta0: globalBeta0,
      topicsWithData: topicsWithData.length,
      untestedPriorMean,
      untestedPriorWeight,
    },
    topics: enrichedTopics,
  };
}

export function computeBayesianTopicUtility(topic = {}, options = {}) {
  const proficiencyMean = clampFinite(topic.proficiencyMean, 0, 1, 0.5);
  const uncertainty = clampFinite(topic.uncertainty, 0, 1, 0.5);
  const evidence = clampFinite(topic.evidence, 0, 1, 0);
  const weakness = clampFinite(1 - proficiencyMean, 0, 1, 0.5);
  const weaknessWeight = clampFinite(options.weaknessWeight, 0, 1, 0.65);
  const uncertaintyWeight = clampFinite(options.uncertaintyWeight, 0, 1, 0.35);
  const baseUtility =
    weakness * weaknessWeight +
    uncertainty * uncertaintyWeight;
  const utility = baseUtility * (0.65 + 0.35 * evidence);
  return clampFinite(utility, 0, 1, 0);
}

export default {
  estimateTopicProficiencies,
  computeBayesianTopicUtility,
};

