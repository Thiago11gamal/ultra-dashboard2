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
 * - ciLow / ciHigh: intervalo aproximado;
 * - evidence: confiança baseada no volume amostral;
 * - uncertainty: incerteza normalizada;
 * - isUntested: se o tópico não possui evidência.
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;

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
      // BR: 1.234,56
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,234.56
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  }

  const n = Number(str);
  return Number.isFinite(n) ? n : fallback;
}

function sumValues(values) {
  let sum = 0;
  let c = 0;

  for (const value of values) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;

    const y = n - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
  }

  return sum;
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

/**
 * Estima proficiências bayesianas para uma lista de tópicos.
 *
 * @param {Array<Object>} topics
 * Exemplo:
 * [
 *   { name: 'Probabilidade', total: 20, correct: 12 },
 *   { name: 'Funções', total: 0 }
 * ]
 *
 * @param {Object} options
 * @returns {Object}
 */
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

    if (!Number.isFinite(correct) && Number.isFinite(topic?.percentage) && total > 0) {
      correct = (Number(topic.percentage) / 100) * total;
    }

    correct = Number.isFinite(correct) ? correct : 0;
    correct = Math.max(0, Math.min(total, correct));

    return {
      name,
      total,
      correct,
      isUntested: total <= 0,
    };
  });

  const topicsWithData = parsedTopics.filter((t) => t.total > 0);

  const globalTotal = sumValues(topicsWithData.map((t) => t.total));
  const globalCorrect = sumValues(topicsWithData.map((t) => t.correct));

  const globalMean =
    globalTotal > 0
      ? clampFinite(globalCorrect / globalTotal, 0, 1, untestedPriorMean)
      : untestedPriorMean;

  // Força do prior: aumenta com evidência global, mas é limitada.
  let priorStrength =
    minPriorStrength +
    Math.sqrt(Math.max(0, globalTotal)) * 0.12 +
    topicsWithData.length * 0.25;

  // Empirical Bayes: se os tópicos variam muito entre si,
  // o prior global deve ser mais fraco.
  if (topicsWithData.length >= 3) {
    const topicRates = topicsWithData.map((t) => t.correct / t.total);
    const rateMean = meanValues(topicRates);
    const rateVariance = varianceValues(topicRates);

    const averageBinomialNoise = meanValues(
      topicsWithData.map((t) => {
        const n = Math.max(1, t.total);
        return (rateMean * (1 - rateMean)) / n;
      })
    );

    const tau2 = Math.max(0, rateVariance - averageBinomialNoise);

    if (tau2 > 1e-6) {
      const momentK = (rateMean * (1 - rateMean)) / tau2 - 1;
      priorStrength = Math.min(
        priorStrength,
        clampFinite(momentK, minPriorStrength, maxPriorStrength, priorStrength)
      );
    }
  }

  priorStrength = clampFinite(
    priorStrength,
    minPriorStrength,
    maxPriorStrength,
    minPriorStrength
  );

  const globalAlpha0 = Math.max(1e-6, globalMean * priorStrength);
  const globalBeta0 = Math.max(1e-6, (1 - globalMean) * priorStrength);

  const enrichedTopics = parsedTopics.map((topic) => {
    let alpha;
    let beta;
    let priorMean = globalMean;

    if (topic.isUntested) {
      // Tópico não testado não deve herdar totalmente a média global.
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

    // Intervalo credível aproximado.
    const z = 1.96;
    const ciLow = clampFinite(proficiencyMean - z * proficiencySd, 0, 1, 0);
    const ciHigh = clampFinite(proficiencyMean + z * proficiencySd, 0, 1, 1);

    const evidence = topic.isUntested
      ? 0
      : clampFinite(topic.total / (topic.total + priorStrength), 0, 1, 0);

    // Normalização prática: sd ~0.25 já representa incerteza alta.
    const uncertainty = clampFinite(proficiencySd / 0.25, 0, 1, 0);

    return {
      name: topic.name,
      total: topic.total,
      correct: topic.correct,
      isUntested: topic.isUntested,
      priorMean,
      priorStrength: topic.isUntested
        ? priorStrength * untestedPriorWeight
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

/**
 * Utilidade bayesiana de um tópico.
 * Combina fraqueza + incerteza + evidência.
 */
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
