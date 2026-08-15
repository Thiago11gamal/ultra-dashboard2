/**
 * fsrs.js
 *
 * Lote 7 — modelo simplificado de retrievability por estabilidade.
 *
 * IMPORTANTE: este módulo NÃO implementa o algoritmo FSRS oficial completo.
 * É um modelo simplificado baseado na mesma função de retrievability.
 *
 * Modelo base:
 * R(t, S) = (1 + t / (9S))^-1
 *
 * Onde:
 * - t = dias desde a última revisão/estudo;
 * - S = estabilidade da memória;
 * - R = retrievability / retenção estimada.
 */

function clampFinite(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseTime(value) {
  if (value === null || value === undefined) return NaN;

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function medianValues(values) {
  const finite = (Array.isArray(values) ? values : [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (finite.length === 0) return NaN;

  const mid = Math.floor(finite.length / 2);

  if (finite.length % 2 === 0) {
    return (finite[mid - 1] + finite[mid]) / 2;
  }

  return finite[mid];
}

/**
 * Retrievability FSRS.
 */
export function fsrsRetrievability(daysSince, stability) {
  const t = Math.max(0, Number(daysSince) || 0);
  const S = Math.max(0.1, Number(stability) || 1);

  return Math.pow(1 + t / (9 * S), -1);
}

/**
 * Intervalo ótimo para uma retenção desejada.
 *
 * R = (1 + t/(9S))^-1
 * t = 9S * (1/R - 1)
 */
export function fsrsIntervalForRetention(stability, desiredRetention = 0.9) {
  const S = Math.max(0.1, Number(stability) || 1);
  const R = clampFinite(desiredRetention, 0.05, 0.99, 0.9);

  return Math.max(0, 9 * S * (1 / R - 1));
}

/**
 * Estima memória FSRS para um tópico.
 */
export function estimateTopicFsrs(topic = {}, options = {}) {
  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  // ✅ ADICIONAR:
  const minScore = clampFinite(options.minScore, 0, maxScore - 1e-9, 0);

  const successThreshold = clampFinite(
    options.successThreshold,
    0,
    maxScore,
    maxScore * 0.65
  );

  const desiredRetention = clampFinite(
    options.desiredRetention,
    0.5,
    0.99,
    0.85
  );

  const scores = Array.isArray(topic.scores)
    ? topic.scores
        .map((entry) => {
          return {
            score: Number(entry?.score),
            time: parseTime(entry?.date ?? entry?.createdAt),
          };
        })
        .filter((entry) => Number.isFinite(entry.score))
        .sort((a, b) => {
          if (Number.isFinite(a.time) && Number.isFinite(b.time)) {
            return a.time - b.time;
          }
          return 0;
        })
    : [];

  let baseScore = null;

  if (scores.length > 0) {
    baseScore =
      scores.reduce((acc, entry) => acc + entry.score, 0) / scores.length;
  } else if (Number.isFinite(topic.percentage)) {
    // ✅ CORREÇÃO: converter percentual no intervalo real
    baseScore = minScore + (Number(topic.percentage) / 100) * (maxScore - minScore);
  } else {
    baseScore = maxScore * 0.5;
  }

  // ✅ CORREÇÃO: normalizar no intervalo real
  const safeScore = clampFinite(baseScore, minScore, maxScore, minScore + (maxScore - minScore) * 0.5);
  const safePct = ((safeScore - minScore) / Math.max(1e-9, maxScore - minScore)) * 100;

  const difficulty = clampFinite(1 - safePct / 100, 0.1, 1, 0.5);

  let stability = clampFinite(options.defaultStability, 0.1, 365, 5);

  if (scores.length >= 2) {
    const gaps = [];

    for (let i = 1; i < scores.length; i++) {
      const prevTime = scores[i - 1].time;
      const currTime = scores[i].time;

      if (
        Number.isFinite(prevTime) &&
        Number.isFinite(currTime) &&
        currTime > prevTime
      ) {
        gaps.push((currTime - prevTime) / 86400000);
      }
    }

    const medianGap = medianValues(gaps);
    const safeMedianGap = Number.isFinite(medianGap)
      ? clampFinite(medianGap, 0.5, 120, 7)
      : 7;

    const successRate =
      scores.filter((entry) => entry.score >= successThreshold).length /
      scores.length;

    stability =
      safeMedianGap *
      (0.5 + successRate) *
      (0.7 + safePct / 200) *
      (1.15 - difficulty * 0.35);

    stability = clampFinite(stability, 0.5, 180, safeMedianGap);
  } else if (Number(topic.total) > 0) {
    stability = clampFinite(2 + Number(topic.total) / 18, 0.5, 45, 4);
  } else {
    stability = 2;
  }

  let daysSince = clampFinite(topic.daysSince, 0, 3650, NaN);

  if (!Number.isFinite(daysSince)) {
    const lastSeenTime = parseTime(topic.lastSeen);

    if (Number.isFinite(lastSeenTime)) {
      daysSince = Math.max(0, (Date.now() - lastSeenTime) / 86400000);
    } else {
      daysSince = 30;
    }
  }

  const retention = fsrsRetrievability(daysSince, stability) * 100;

  const optimalIntervalDays = fsrsIntervalForRetention(
    stability,
    desiredRetention
  );

  const nextReviewInDays = Math.max(0, optimalIntervalDays - daysSince);
  const due = daysSince >= optimalIntervalDays;

  let label = null;

  if (retention < 30) {
    label = '⚠️ Memória Crítica (FSRS)';
  } else if (retention < 55) {
    label = '🧠 Revisão Necessária (FSRS)';
  } else if (retention < 78) {
    label = '🔄 Revisão de Reforço (FSRS)';
  }

  return {
    model: 'fsrs_power_law',
    retentionPct: Number(retention.toFixed(2)),
    stabilityDays: Number(stability.toFixed(2)),
    difficulty: Number(difficulty.toFixed(4)),
    daysSince: Number(daysSince.toFixed(2)),
    optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
    nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
    due,
    label,
    sampleSize: scores.length,
    desiredRetention,
  };
}

/**
 * Estima boost FSRS para a categoria inteira.
 *
 * Retorna objeto compatível com `_getSRSBoost`:
 * { boost, label }
 */
export function estimateCategoryFsrsBoost(history = [], options = {}) {
  const safeHistory = Array.isArray(history)
    ? history.filter((h) => Number.isFinite(Number(h?.score)))
    : [];

  if (safeHistory.length === 0) return null;

  const maxScore = clampFinite(options.maxScore, 1, 1_000_000, 100);
  const cfg = options.cfg || {};

  const desiredRetention = clampFinite(
    options.desiredRetention,
    0.5,
    0.99,
    0.85
  );

  const times = safeHistory
    .map((h) => parseTime(h?.date ?? h?.createdAt))
    .filter((t) => Number.isFinite(t));

  let daysSince = clampFinite(options.daysSince, 0, 3650, NaN);

  if (!Number.isFinite(daysSince) && times.length > 0) {
    const lastTime = Math.max(...times);
    daysSince = Math.max(0, (Date.now() - lastTime) / 86400000);
  }

  if (!Number.isFinite(daysSince)) {
    daysSince = 7;
  }

  const scores = safeHistory.map((h) =>
    clampFinite(h.score, 0, maxScore, 0)
  );

  const meanScore =
    scores.reduce((acc, score) => acc + score, 0) / scores.length;

  // ✅ CORREÇÃO: normalizar no intervalo real
  const minScore = clampFinite(options.minScore, 0, maxScore - 1e-9, 0);
  const meanPct = ((meanScore - minScore) / Math.max(1e-9, maxScore - minScore)) * 100;

  let medianGap = 7;

  if (times.length >= 2) {
    const sortedTimes = [...times].sort((a, b) => a - b);
    const gaps = [];

    for (let i = 1; i < sortedTimes.length; i++) {
      gaps.push((sortedTimes[i] - sortedTimes[i - 1]) / 86400000);
    }

    const computedMedian = medianValues(gaps);
    medianGap = Number.isFinite(computedMedian)
      ? clampFinite(computedMedian, 0.5, 120, 7)
      : 7;
  }

  const difficulty = clampFinite(1 - meanPct / 100, 0.1, 1, 0.5);

  let sd = 0;

  if (scores.length > 1) {
    const mean = meanScore;
    const variance =
      scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) /
      (scores.length - 1);

    sd = Math.sqrt(Math.max(0, variance));
  }

  const consistency = clampFinite(
    1 - sd / (maxScore * 0.18),
    0.35,
    1,
    0.75
  );

  let stability =
    Math.max(1, medianGap) *
    (0.55 + meanPct / 150) *
    (1.25 - difficulty * 0.55) *
    (0.75 + consistency * 0.45);

  stability = clampFinite(stability, 0.5, 120, 7);

  const retentionPct = fsrsRetrievability(daysSince, stability) * 100;

  const optimalIntervalDays = fsrsIntervalForRetention(
    stability,
    desiredRetention
  );

  const nextReviewInDays = Math.max(0, optimalIntervalDays - daysSince);

  if (retentionPct < 75) {
    const intensity = Math.pow((75 - retentionPct) / 75, 1.2);
    const boost = (Number(cfg.SRS_BOOST) || 16) * 2.0 * intensity;

    let label;

    if (retentionPct < 30) {
      label = '⚠️ Memória Crítica (FSRS)';
    } else if (retentionPct < 55) {
      label = '🧠 Revisão Necessária (FSRS)';
    } else {
      label = '🔄 Revisão de Reforço (FSRS)';
    }

    return {
      boost: Number(boost.toFixed(4)),
      label,
      retentionPct: Number(retentionPct.toFixed(2)),
      stabilityDays: Number(stability.toFixed(2)),
      optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
      nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
      model: 'fsrs_power_law',
    };
  }

  return {
    boost: 0,
    label: null,
    retentionPct: Number(retentionPct.toFixed(2)),
    stabilityDays: Number(stability.toFixed(2)),
    optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
    nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
    model: 'fsrs_power_law',
  };
}

export default {
  fsrsRetrievability,
  fsrsIntervalForRetention,
  estimateTopicFsrs,
  estimateCategoryFsrsBoost,
};
