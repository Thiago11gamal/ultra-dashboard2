// src/engine/probabilistic/fsrs.js
// ============================================================================
// FSRS — Free Spaced Repetition Scheduler (núcleo probabilístico)
// Fonte única das fórmulas de retenção e intervalo usadas por diagnostics.js
// e coachLogic.js.
// Fórmula base: R(t, S) = (1 + t / (9 * S))^-1
// ============================================================================

import {
    clamp,
    normalizeArray,
    toDateMs,
    toFiniteNumber,
    MS_PER_DAY
} from '../../utils/retentionCore';

/**
 * Retrievability FSRS: probabilidade de lembrança após `daysSince` dias.
 * R(t, S) = (1 + t / (9 * S))^-1
 * @param {number} daysSince - dias desde a última revisão/estudo
 * @param {number} stabilityDays - estabilidade de memória (dias)
 * @returns {number} retenção em [0, 1]
 */
export function fsrsRetrievability(daysSince, stabilityDays) {
  const S = Math.max(0.1, Number(stabilityDays) || 1);
  const t = Math.max(0, Number(daysSince) || 0);
  const r = Math.pow(1 + t / (9 * S), -1);
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0;
}

/**
 * Intervalo que produz a retenção-alvo R.
 * Derivado de R = (1 + t/(9S))^-1  =>  t = 9 * S * (1/R - 1)
 * @param {number} stabilityDays - estabilidade de memória (dias)
 * @param {number} targetRetention - retenção desejada (padrão 0.7)
 * @returns {number} intervalo em dias (inteiro, mínimo 1)
 */
export function fsrsIntervalForRetention(stabilityDays, targetRetention = 0.7) {
  const S = Math.max(0.1, Number(stabilityDays) || 1);
  const R = Math.max(0.05, Math.min(0.99, Number(targetRetention) || 0.7));
  const interval = 9 * S * ((1 / R) - 1);
  return Number.isFinite(interval) ? Math.max(1, Math.round(interval)) : 1;
}

/**
 * Estimativa FSRS por tópico individual.
 * Usa histórico de scores + dias desde a última revisão para calcular
 * estabilidade, retenção atual e próximo intervalo de revisão.
 *
 * Consumidor: coachLogic.js → topic.fsrs = estimateTopicFsrs(...)
 *   usa topic.fsrs.retentionPct e topic.fsrs.due
 *
 * @param {Object} topic - { name, scores, lastSeen, daysSince, total, percentage }
 * @param {Object} options - { maxScore, desiredRetention }
 * @returns {Object|null}
 */
export function estimateTopicFsrs(topic, options = {}) {
  if (!topic) return null;

  const now = options.now ?? Date.now();
  const desiredRetention = clamp(toFiniteNumber(options.desiredRetention, 0.85), 0.5, 0.95);

  const scores = normalizeArray(topic.scores)
    .map(item => toFiniteNumber(item?.score ?? item, null))
    .filter(value => value != null);

  if (scores.length === 0) return null;

  const lastStudiedMs = toDateMs(topic.lastStudiedAt ?? topic.lastReviewedAt);

  let daysSince = toFiniteNumber(topic.daysSince, null);

  if (daysSince == null || !Number.isFinite(daysSince)) {
    daysSince = lastStudiedMs == null
      ? 0
      : Math.max(0, (now - lastStudiedMs) / MS_PER_DAY);
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

  const variance = scores.length > 1
    ? scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (scores.length - 1)
    : 0;

  const sd = Math.sqrt(Math.max(0, variance));

  const metaMaxScore = toFiniteNumber(topic.maxScore, null);
  const maxScoreSeen = Math.max(...scores);

  const scoreScale = Math.max(
    1,
    options.scoreScale ??
      (Number.isFinite(metaMaxScore) && metaMaxScore > 0
        ? metaMaxScore
        : maxScoreSeen <= 1
          ? 1
          : 100)
  );

  const consistencyFactor = clamp(1 - (sd / scoreScale), 0.1, 1);
  const performanceFactor = clamp(mean / scoreScale, 0, 1);
  const reviewFactor = Math.min(1, Math.log1p(scores.length) / Math.log1p(20));

  let difficulty = toFiniteNumber(topic.difficulty, 0.5);

  if (difficulty > 1) {
    difficulty /= 10;
  }

  difficulty = clamp(difficulty, 0, 1);

  const difficultyFactor = 1 - (difficulty * 0.35);

  const baseStability =
    (3 + (21 * consistencyFactor * performanceFactor * reviewFactor)) *
    difficultyFactor;

  const stability = clamp(baseStability, 1, 180);

  const retention = fsrsRetrievability(daysSince, stability);
  const retentionPct = retention * 100;

  const optimalIntervalDays = fsrsIntervalForRetention(stability, desiredRetention);
  const nextReviewInDays = Math.max(0, optimalIntervalDays - daysSince);
  const due = daysSince >= optimalIntervalDays * 0.8;
  const dueAtMs = lastStudiedMs != null
    ? lastStudiedMs + (optimalIntervalDays * MS_PER_DAY)
    : null;

  return {
    retentionPct: Number(retentionPct.toFixed(2)),
    stabilityDays: Number(stability.toFixed(2)),
    optimalIntervalDays: Number(optimalIntervalDays.toFixed(2)),
    nextReviewInDays: Number(nextReviewInDays.toFixed(2)),
    due,
    dueAtMs,
    daysSince: Number(daysSince.toFixed(2)),
    model: 'fsrs_power_law',
  };
}

/**
 * Boost FSRS por categoria (agregado de todo o histórico).
 * Usado pelo Coach para calcular o SRS boost de urgência.
 *
 * Consumidor: coachLogic.js → estimateCategoryFsrsBoost(history, {daysSince, maxScore, cfg, desiredRetention})
 *   usa o retorno como { boost, label }
 *
 * @param {Array} history - histórico de simulados da categoria
 * @param {Object} options - { daysSince, maxScore, cfg, desiredRetention }
 * @returns {Object|null} { boost, label, retentionPct, stabilityDays, ... }
 */
export function estimateCategoryFsrsBoost(history, options = {}) {
  const safeHistory = Array.isArray(history) ? history : Object.values(history || {});
  if (safeHistory.length === 0) return null;

  const cfg = options.cfg || {};
  const maxScore = Math.max(1, Number(options.maxScore) || 100);
  const desiredRetention = Math.max(0.5, Math.min(0.95, Number(options.desiredRetention) || 0.85));
  const daysSince = Math.max(0, Number(options.daysSince) || 0);

  const scores = safeHistory
    .map(h => Number(h?.score ?? h?.value))
    .filter(Number.isFinite);
  if (scores.length === 0) return null;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.length > 1
    ? scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (scores.length - 1)
    : 0;
  const sd = Math.sqrt(Math.max(0, variance));

  const consistencyFactor = Math.max(0.1, 1 - (sd / maxScore));
  const performanceFactor = Math.max(0.1, mean / maxScore);
  const baseStability = 3 + (14 * consistencyFactor * performanceFactor * Math.min(1, scores.length / 5));

  const stability = Math.max(1, Math.min(180, baseStability));
  const retention = fsrsRetrievability(daysSince, stability);
  const retentionPct = retention * 100;
  const optimalIntervalDays = fsrsIntervalForRetention(stability, desiredRetention);
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

