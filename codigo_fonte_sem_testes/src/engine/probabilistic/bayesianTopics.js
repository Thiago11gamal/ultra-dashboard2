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
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
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

// ============================================================
// NOVO: logGamma (Lanczos approximation)
// Necessário para a função beta regularizada incompleta.
// ============================================================
function logGamma(z) {
  /* eslint-disable no-loss-of-precision */
  const cof = [
    57.15623566586292, -59.59796035547549, 14.136097974741747,
    -0.4919138160976202, 0.3399464998481189e-4, 0.4652362892704858e-4,
    -0.9837447530487956e-4, 0.1580887032249125e-3,
    -0.2102644417241049e-3, 0.2174396181152126e-3,
    -0.1643181065367639e-3, 0.8441822398385274e-4,
    -0.2619083840158141e-4, 0.3689918265953162e-5,
  ];
  /* eslint-enable no-loss-of-precision */
  if (z <= 0) return NaN;
  let x = z;
  let y = x;
  let tmp = x + 5.2421875;
  tmp = (x + 0.5) * Math.log(tmp) - tmp;
  let ser = 0.9999999999999971;
  for (let j = 0; j < cof.length; j++) ser += cof[j] / ++y;
  return tmp + Math.log(2.5066282746310007 * ser / x);
}

// ============================================================
// NOVO: Fração continuada da função beta incompleta (Lentz)
// ============================================================
function betaContinuedFraction(a, b, x) {
  const MAX_ITER = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// ============================================================
// NOVO: Função beta regularizada incompleta I_x(a, b)
// ============================================================
function regularizedIncompleteBeta(x, a, b) {
  if (!(a > 0) || !(b > 0) || !Number.isFinite(x)) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log1p(-x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaContinuedFraction(a, b, x) / a;
  }
  return 1 - bt * betaContinuedFraction(b, a, 1 - x) / b;
}

// ============================================================
// NOVO: Quantil da distribuição Beta por busca binária
// Substitui a aproximação simétrica mean ± 1.96*sd.
// ============================================================
function betaQuantile(p, a, b) {
  const safeP = Math.max(1e-8, Math.min(1 - 1e-8, Number(p) || 0.5));
  if (!(a > 0) || !(b > 0)) return 0.5;

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
    if (!Number.isFinite(correct) && Number.isFinite(topic?.percentage) && total > 0) {
      correct = (Number(topic.percentage) / 100) * total;
    }
    correct = Number.isFinite(correct) ? correct : 0;
    correct = Math.max(0, Math.min(total, correct));
    return { name, total, correct, isUntested: total <= 0 };
  });

  const topicsWithData = parsedTopics.filter((t) => t.total > 0);
  const globalTotal = sumValues(topicsWithData.map((t) => t.total));
  const globalCorrect = sumValues(topicsWithData.map((t) => t.correct));
  const globalMean =
    globalTotal > 0
      ? clampFinite(globalCorrect / globalTotal, 0, 1, untestedPriorMean)
      : untestedPriorMean;

  let priorStrength =
    minPriorStrength +
    Math.sqrt(Math.max(0, globalTotal)) * 0.12 +
    topicsWithData.length * 0.25;

  // Empirical Bayes: prior mais fraco quando tópicos variam muito
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

