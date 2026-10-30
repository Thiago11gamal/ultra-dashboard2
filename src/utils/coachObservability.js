/**
 * coachObservability.js
 *
 * Lote 9 — Facade de observabilidade do Coach.
 */
import {
  evaluateModelHealth,
  generateHealthDashboard,
  saveModelHealthSnapshot,
  loadModelHealthSnapshots,
  clearModelHealthSnapshots,
} from '../engine/observability/modelHealth.js';
import {
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
} from '../engine/observability/driftMonitor.js';
import { getSafeScore } from './scoreHelper.js';
import { normalizeDate } from './dateHelper.js';
import { safeGetJSON } from './coachStorage.js';
import { loadEvaluationResults } from '../engine/evaluation/coachEvaluator.js';

const CALIBRATION_TELEMETRY_KEY = 'coach_calibration_events_v1';

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function toTime(value) {
  const date = normalizeDate(value);
  return date && Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

/**
 * Carrega eventos de telemetria de calibração salvos pelo calibrationTelemetry.js.
 */
export function loadCalibrationTelemetryEvents() {
  const parsed = safeGetJSON(CALIBRATION_TELEMETRY_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Extrai séries de score e volatilidade a partir de simulados.
 *
 * FIX (BUG-44): janela de volatilidade configurável via options.volatilityWindow
 * (default 5, mínimo 3). Early return quando os dados são insuficientes para a
 * janela escolhida — antes o loop era hardcoded em janela 5 e o early return em < 5.
 */
export function extractObservabilitySeries(simulados = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  // FIX: respeitar minScore — concursos com piso > 0 geravam séries
  // levemente distorcidas no drift monitor.
  const minScore = Number.isFinite(Number(options.minScore))
    ? Math.min(Number(options.minScore), maxScore)
    : 0;
  const windowSize = Math.max(3, Number(options.volatilityWindow) || 5);

  const sorted = safeArray(simulados)
    // FIX (A6): preserva o índice original — o tiebreak do sort lia
    // `a._idx`, que nunca era criado (código morto).
    .map((simulado, _idx) => ({
      simulado,
      subjectKey: String(
        simulado?.subject ||
        simulado?.categoryName ||
        simulado?.materia ||
        simulado?.disciplina ||
        simulado?.categoryId ||
        ''
      ).trim().toLowerCase(),
      time: toTime(simulado?.date ?? simulado?.createdAt),
      score: getSafeScore(simulado, maxScore, minScore),
      _idx,
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      const aFinite = Number.isFinite(a.time);
      const bFinite = Number.isFinite(b.time);
      
      if (aFinite && bFinite) {
        if (a.time !== b.time) return a.time - b.time;
      } else if (aFinite && !bFinite) {
        return -1; // a vem antes
      } else if (!aFinite && bFinite) {
        return 1;  // b vem antes
      }
      // Ambos inválidos: manter ordem original via _idx
      return (a._idx || 0) - (b._idx || 0);
    });

  // Quando há múltiplas disciplinas misturadas, remove o efeito fixo entre matérias
  // preservando a média global da escala (evita falso drift por rotação de disciplina).
  const subjectStats = new Map();
  sorted.forEach((entry) => {
    if (!entry.subjectKey) return;
    const prev = subjectStats.get(entry.subjectKey) || { sum: 0, count: 0 };
    prev.sum += entry.score;
    prev.count += 1;
    subjectStats.set(entry.subjectKey, prev);
  });

  let scores = sorted.map((entry) => entry.score);
  if (options.demeanBySubject !== false && subjectStats.size >= 2 && scores.length >= 4) {
    const globalMean = scores.reduce((acc, s) => acc + s, 0) / scores.length;
    scores = sorted.map((entry) => {
      const stat = entry.subjectKey ? subjectStats.get(entry.subjectKey) : null;
      if (!stat || stat.count < 2) return entry.score;
      const subjectMean = stat.sum / stat.count;
      return Math.min(maxScore, Math.max(minScore, entry.score - subjectMean + globalMean));
    });
  }
  const volatilities = [];

  // FIX: early return genérico para a janela configurada
  if (scores.length < windowSize) {
    return { scores, volatilities, sampleSize: scores.length, insufficientData: true };
  }

  for (let i = windowSize - 1; i < scores.length; i++) {
    const window = scores.slice(i - windowSize + 1, i + 1);
    const mean = window.reduce((acc, val) => acc + val, 0) / window.length;
    const variance =
      window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      Math.max(1, window.length - 1);
    volatilities.push(Math.sqrt(Math.max(0, variance)));
  }

  return {
    scores,
    volatilities,
    sampleSize: scores.length,
    insufficientData: false,
  };
}

/**
 * Observa um resultado do calculateUrgency e extrai métricas de saúde.
 */
export function observeCoachUrgencyResult(result = {}, options = {}) {
  const mc = result?.details?.monteCarlo || null;
  return {
    timestamp: Date.now(),
    categoryId: options.categoryId ?? null,
    categoryName: options.categoryName ?? null,
    normalizedScore: Number.isFinite(result?.normalizedScore)
      ? result.normalizedScore
      : null,
    probability: Number.isFinite(mc?.probability) ? mc.probability : null,
    probabilityRaw: Number.isFinite(mc?.probabilityRaw)
      ? mc.probabilityRaw
      : null,
    avgBrier: Number.isFinite(mc?.avgBrier) ? mc.avgBrier : null,
    ece: Number.isFinite(mc?.ece) ? mc.ece : null,
    calibrationPenalty: Number.isFinite(mc?.calibrationPenalty)
      ? mc.calibrationPenalty
      : null,
    volatility: Number.isFinite(mc?.volatility)
      ? mc.volatility
      : Number.isFinite(result?.details?.mssdVolatility)
        ? result.details.mssdVolatility
        : null,
    sampleSize: Number.isFinite(mc?.sampleSize) ? mc.sampleSize : null,
    reliability: Array.isArray(mc?.reliability) ? mc.reliability : [],
  };
}

/**
 * Executa o Drift Guard completo.
 */
export function runCoachDriftGuard(options = {}) {
  const calibrationEvents = Array.isArray(options.calibrationEvents)
    ? options.calibrationEvents
    : loadCalibrationTelemetryEvents();
  const scores = Array.isArray(options.scores) ? options.scores : [];
  const volatilities = Array.isArray(options.volatilities)
    ? options.volatilities
    : [];
  let probabilityPairs = Array.isArray(options.probabilityPairs)
    ? options.probabilityPairs
    : [];

  if (probabilityPairs.length === 0 && options.probabilityPairs === undefined) {
    const evalResults = loadEvaluationResults();
    probabilityPairs = evalResults
      .map((ev) => {
        const probEval = ev?.probabilityEvaluation;
        if (!probEval) return null;
        const p = probEval.predictedProbability01;
        const y = probEval.observed;
        if (!Number.isFinite(p) || !Number.isFinite(y)) return null;
        return {
          probability: p,
          observed: y,
          timestamp: Number(ev.timestamp) || 0,
        };
      })
      .filter(Boolean);
  }

  const lastTelemetryTimestamp =
    Number(options.lastTelemetryTimestamp) ||
    (calibrationEvents.length > 0
      ? Number(calibrationEvents[calibrationEvents.length - 1]?.timestamp) || 0
      : 0);

  const health = evaluateModelHealth(
    {
      calibrationEvents,
      scores,
      volatilities,
      probabilityPairs,
      sampleSize: options.sampleSize ?? scores.length,
      features: options.features || {},
      lastTelemetryTimestamp,
    },
    options
  );

  if (options.saveSnapshot !== false) {
    saveModelHealthSnapshot(health);
  }

  return health;
}

/**
 * Constrói dashboard de observabilidade.
 */
export function buildCoachObservabilityDashboard(options = {}) {
  const health = runCoachDriftGuard(options);
  return generateHealthDashboard(health);
}

export {
  evaluateModelHealth,
  generateHealthDashboard,
  saveModelHealthSnapshot,
  loadModelHealthSnapshots,
  clearModelHealthSnapshots,
  detectScoreDrift,
  detectVolatilityDrift,
  detectCalibrationDrift,
  detectProbabilityCalibrationDrift,
};

export default {
  loadCalibrationTelemetryEvents,
  extractObservabilitySeries,
  observeCoachUrgencyResult,
  runCoachDriftGuard,
  buildCoachObservabilityDashboard,
};

