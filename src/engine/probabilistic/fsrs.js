// src/engine/probabilistic/fsrs.js
// ============================================================================
// FSRS — Free Spaced Repetition Scheduler (núcleo probabilístico)
// Fonte única das fórmulas de retenção e intervalo usadas por diagnostics.js
// e coachLogic.js.
// Fórmula base: R(t, S) = (1 + t / (9 * S))^-1
// ============================================================================

import {
  clamp,
  toDateMs,
  toFiniteNumber,
  MS_PER_DAY
} from '../../utils/retentionCore.js';
import { getSafeScore } from '../../utils/scoreHelper.js';

function mapDifficulty01(rawDiff, difficultyScale = 'auto') {
  if (difficultyScale === 'anki') {
    return clamp((rawDiff - 1) / 9, 0, 1);
  }
  if (difficultyScale === 'app') {
    return clamp(((rawDiff - 0.7) / (1.6 - 0.7)) * 0.7 + 0.2, 0.1, 0.95);
  }
  // Mapeamento contínuo e monotônico sem descontinuidade em 0.6 ou 2.0:
  // [0, 0.7] -> [0.05, 0.20]; [0.7, 1.6] -> [0.20, 0.90]; [1.6, 10] -> [0.90, 1.00]
  const d = Math.max(0, rawDiff);
  if (d <= 0.7) {
    return clamp(0.05 + (d / 0.7) * 0.15, 0.05, 0.2);
  }
  if (d <= 1.6) {
    return clamp(0.2 + ((d - 0.7) / 0.9) * 0.7, 0.2, 0.9);
  }
  return clamp(0.9 + ((d - 1.6) / 8.4) * 0.1, 0.9, 1.0);
}

/**
 * Retrievability FSRS: probabilidade de lembrança após `daysSince` dias.
 * R(t, S) = (1 + t / (9 * S))^-1
 * @param {number} daysSince - dias desde a última revisão/estudo
 * @param {number} stabilityDays - estabilidade de memória (dias)
 * @returns {number} retenção em [0, 1]
 */
export function fsrsRetrievability(daysSince, stabilityDays) {
  const rawS = Number(stabilityDays);
  const S = Math.max(0.1, Number.isFinite(rawS) && stabilityDays !== null && stabilityDays !== undefined && stabilityDays !== '' ? rawS : 1);
  const rawT = Number(daysSince);
  const t = Math.max(0, Number.isFinite(rawT) ? rawT : 0);
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
  const rawS = Number(stabilityDays);
  const S = Math.max(0.1, Number.isFinite(rawS) && stabilityDays !== null && stabilityDays !== undefined && stabilityDays !== '' ? rawS : 1);
  const rawR = Number(targetRetention);
  const R = Math.max(0.05, Math.min(0.99, Number.isFinite(rawR) && targetRetention !== null && targetRetention !== undefined && targetRetention !== '' ? rawR : 0.7));
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

  // FIX: preservar scores numéricos 0 (normalizeArray usa filter(Boolean) e descartava zeros!)
  const rawScoreList = Array.isArray(topic.scores)
    ? topic.scores
    : (topic.scores && typeof topic.scores === 'object' ? Object.values(topic.scores) : []);
  const scores = rawScoreList
    .filter(item => item !== null && item !== undefined && item !== '' && typeof item !== 'boolean')
    .map(item => toFiniteNumber(typeof item === 'object' ? item?.score : item, null))
    .filter(value => value != null);

  if (scores.length === 0) return null;

  const rawLastStudiedMs = toDateMs(
    topic.lastStudiedAt ?? topic.lastReviewedAt ?? topic.lastSeen ?? topic.date
  );
  const lastStudiedMs = Number.isFinite(rawLastStudiedMs) && rawLastStudiedMs > 0 ? rawLastStudiedMs : null;

  let daysSince = toFiniteNumber(topic.daysSince, null);

  if (daysSince == null || !Number.isFinite(daysSince)) {
    daysSince = lastStudiedMs == null
      ? 0
      : Math.max(0, (now - lastStudiedMs) / MS_PER_DAY);
  } else {
    daysSince = Math.max(0, daysSince);
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

  const variance = scores.length > 1
    ? scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (scores.length - 1)
    : 0;

  const sd = Math.sqrt(Math.max(0, variance));

  const metaMaxScore = toFiniteNumber(topic.maxScore, null);
  const optMaxScore = toFiniteNumber(options.scoreScale ?? options.maxScore, null);
  const scoreScale = Math.max(
    1,
    Number.isFinite(optMaxScore) && optMaxScore > 0
      ? optMaxScore
      : (Number.isFinite(metaMaxScore) && metaMaxScore > 0
        ? metaMaxScore
        : 100)
  );

  const metaMinScore = toFiniteNumber(topic.minScore ?? options.minScore, 0);
  const domain = Math.max(1e-6, scoreScale - metaMinScore);

  const consistencyFactor = clamp(1 - (sd / domain), 0.1, 1);
  const performanceFactor = clamp((mean - metaMinScore) / domain, 0, 1);
  const reviewFactor = Math.min(1, Math.log1p(scores.length) / Math.log1p(20));

  const rawDiff = toFiniteNumber(topic.difficulty, 1.0);
  const difficulty = mapDifficulty01(rawDiff, options.difficultyScale);

  const difficultyFactor = 1 - (difficulty * 0.35);

  // FIX-C01: unificado com estimateCategoryFsrsBoost (antes: 21 vs 14)
  const FSRS_STABILITY_MULTIPLIER = 14;
  const baseStability =
    (3 + (FSRS_STABILITY_MULTIPLIER * consistencyFactor * performanceFactor * reviewFactor)) *
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
  const rawMax = Number(options.maxScore);
  const maxScore = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
  const desiredRetention = Math.max(0.5, Math.min(0.95, Number(options.desiredRetention) || 0.85));
  const daysSince = Math.max(0, Number(options.daysSince) || 0);

  const rawMin = Number(options.minScore);
  const minScore = Number.isFinite(rawMin) ? Math.min(rawMin, maxScore - 1e-6) : 0;
  // FIX-C01b: aceitar difficulty como option (padrão: neutro)
  const rawDifficulty = toFiniteNumber(options.difficulty, 1.0);
  const domain = Math.max(1e-6, maxScore - minScore);

  const scores = safeHistory
    .map(h => getSafeScore(h, maxScore, minScore))
    .filter(Number.isFinite);
  if (scores.length === 0) return null;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.length > 1
    ? scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (scores.length - 1)
    : 0;
  const sd = Math.sqrt(Math.max(0, variance));

  const consistencyFactor = clamp(1 - (sd / domain), 0.1, 1);
  const performanceFactor = clamp((mean - minScore) / domain, 0.1, 1);
  const reviewFactor = Math.min(1, Math.log1p(scores.length) / Math.log1p(20));
  // FIX-C01: mesmo multiplicador e mapeamento contínuo de dificuldade do estimateTopicFsrs
  const FSRS_STABILITY_MULTIPLIER = 14;
  const difficulty = mapDifficulty01(rawDifficulty, options.difficultyScale);
  const difficultyFactor = 1 - (difficulty * 0.35);
  const baseStability = (3 + (FSRS_STABILITY_MULTIPLIER * consistencyFactor * performanceFactor * reviewFactor)) * difficultyFactor;

  const stability = Math.max(1, Math.min(180, baseStability));
  const retention = fsrsRetrievability(daysSince, stability);
  const retentionPct = retention * 100;
  const optimalIntervalDays = fsrsIntervalForRetention(stability, desiredRetention);
  const nextReviewInDays = Math.max(0, optimalIntervalDays - daysSince);
  const triggerPct = options.desiredRetention != null
    ? clamp(desiredRetention * 100 - 10, 50, 90)
    : 75;

  if (retentionPct < triggerPct) {
    const intensity = Math.pow((triggerPct - retentionPct) / triggerPct, 1.2);
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

/**
 * Calcula a recuperabilidade atual R(t, S) ∈ [0, 1] de um flashcard individual.
 * Suporta tanto cartões FSRS (card.fsrs.stability) quanto cartões legados SM-2 (card.interval).
 */
export function computeFlashcardRetrievability(card, nowMs = Date.now()) {
  if (!card || typeof card !== 'object') return 1;
  const stability = Math.max(
    0.4,
    Number(card.fsrs?.stability) || Number(card.interval) || 1
  );
  const lastMs = toDateMs(card.lastReviewed || card.createdAt);
  if (!Number.isFinite(lastMs) || lastMs <= 0) return 0.9;
  const elapsedDays = Math.max(0, (nowMs - lastMs) / MS_PER_DAY);
  return fsrsRetrievability(elapsedDays, stability);
}

/**
 * Agendador FSRS-4.5 adaptado para cartões de Flashcards individuais.
 * rating: 0 = Esqueci (Again), 1 = Difícil (Hard), 2 = Bom (Good), 3 = Fácil (Easy).
 * Mantém compatibilidade com `interval` e `ease` para métricas/testes legados.
 */
export function scheduleFlashcardFsrs(card = {}, rating = 2, options = {}) {
  const safeRating = Math.min(3, Math.max(0, Math.round(Number(rating) || 0)));
  const desiredRetention = clamp(toFiniteNumber(options.desiredRetention, 0.9), 0.7, 0.97);
  const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();

  const reviews = Math.max(0, Math.round(Number(card?.reviews) || 0));
  const prevLapses = Math.max(0, Math.round(Number(card?.fsrs?.lapses ?? card?.lapses) || 0));
  const legacyInterval = Math.max(1, Number(card?.interval) || 1);
  const prevEase = clamp(Number(card?.ease) || 2.5, 1.3, 3.2);

  // Migração suave de cartões legados SM-2 ou inicialização FSRS
  const initStabilities = [0.6, 1.4, 3.2, 6.5];
  const initDifficulties = [7.4, 6.2, 5.0, 3.6];

  let S;
  let D;
  let lapses = prevLapses;
  let state = 'review';

  if (reviews === 0 && !card?.fsrs?.stability) {
    S = initStabilities[safeRating];
    D = initDifficulties[safeRating];
    if (safeRating === 0) {
      lapses += 1;
      state = 'relearning';
    }
  } else {
    const prevS = Math.max(0.4, Number(card?.fsrs?.stability) || legacyInterval);
    const prevD = clamp(
      Number(card?.fsrs?.difficulty) || (10 - ((prevEase - 1.3) / 1.9) * 7),
      1.0,
      10.0
    );
    const R = computeFlashcardRetrievability({ ...card, fsrs: { stability: prevS } }, nowMs);

    // Atualização de dificuldade D ∈ [1, 10] com reversão suave à média (mean reversion)
    const ratingDeltaD = [1.15, 0.45, -0.2, -0.75][safeRating];
    D = clamp(prevD + ratingDeltaD + 0.08 * (5.0 - prevD), 1.0, 10.0);

    if (safeRating === 0) {
      // Lapse: reduz estabilidade drasticamente (máx. 5 dias para forçar reconsolidação real)
      lapses += 1;
      state = 'relearning';
      S = clamp(Math.max(0.5, prevS * 0.25 * Math.pow(11 - D, 0.15)), 0.5, 5);
    } else {
      // Recall bem-sucedido (FSRS-4.5): exp(w*(1-R)) - 1 zera o ganho quando R ≈ 1 (revisão imediata)
      const hardPenalty = safeRating === 1 ? 0.65 : 1.0;
      const easyBonus = safeRating === 3 ? 1.35 : 1.0;
      const forgetGain = Math.max(0, Math.exp(1.15 * (1 - R)) - 1);
      const recallGain = 1 + (11 - D) * 0.28 * Math.pow(prevS, -0.18) * forgetGain * hardPenalty * easyBonus;
      const minGrowth = R > 0.98 ? 1.0 : (safeRating === 1 ? 1.05 : 1.2);
      S = clamp(prevS * Math.max(minGrowth, recallGain), 0.6, 365 * 5);
      state = 'review';
    }
  }

  // Cartões críticos ("Conceito Errado Crítico") recebem retenção-alvo mais exigente na 1ª consolidação
  const effectiveTargetR = (card?.priority === 'critical' || card?.confidence === 'certeza') && reviews < 2
    ? Math.max(desiredRetention, 0.93)
    : desiredRetention;

  let intervalDays = safeRating === 0
    ? 1
    : Math.min(365 * 5, Math.max(1, fsrsIntervalForRetention(S, effectiveTargetR)));

  // Garantir ordenação monotônica intuitiva entre botões (Difícil <= Bom < Fácil)
  if (safeRating === 1) {
    intervalDays = Math.max(1, Math.min(intervalDays, Math.max(1, Math.round(legacyInterval * 1.1))));
  } else if (safeRating === 2 && reviews > 0) {
    intervalDays = Math.max(legacyInterval + 1, intervalDays);
  } else if (safeRating === 3) {
    intervalDays = Math.max(legacyInterval + 2, intervalDays);
  }

  const nextEase = clamp(
    safeRating === 0 ? prevEase - 0.2 : safeRating === 1 ? prevEase - 0.12 : safeRating === 2 ? prevEase + 0.05 : prevEase + 0.12,
    1.3,
    3.2
  );

  return {
    interval: intervalDays,
    ease: Number(nextEase.toFixed(2)),
    fsrs: {
      stability: Number(S.toFixed(2)),
      difficulty: Number(D.toFixed(2)),
      lapses,
      state,
      desiredRetention: effectiveTargetR,
      model: 'fsrs_4_5',
    },
  };
}

export default {
  fsrsRetrievability,
  fsrsIntervalForRetention,
  estimateTopicFsrs,
  estimateCategoryFsrsBoost,
  computeFlashcardRetrievability,
  scheduleFlashcardFsrs,
};

