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
import { isSubjectMatch } from './normalization.js';
import { safeGetJSON } from './coachStorage.js';
import { resolveCalibrationTelemetryKey } from './calibrationTelemetry.js';
import { loadEvaluationResults } from '../engine/evaluation/coachEvaluator.js';

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
export function loadCalibrationTelemetryEvents(contestId = null) {
  const parsed = safeGetJSON(resolveCalibrationTelemetryKey(contestId), []);
  const events = Array.isArray(parsed) ? parsed : [];
  if (!contestId) return events;
  const targetId = String(contestId);
  return events.filter(item => !item?.contestId || String(item.contestId) === targetId);
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
  const globalRange = Math.max(1e-6, maxScore - minScore);
  const categoriesList = safeArray(options.categories);
  const windowSize = Math.max(3, Number(options.volatilityWindow) || 5);

  const resolveSimuladoScoreOnGlobalScale = (simulado) => {
    if (categoriesList.length > 0 && simulado && typeof simulado === 'object') {
      const simSubj = simulado.subject || simulado.categoryName || simulado.materia || simulado.disciplina || '';
      const matchedCat = categoriesList.find((cat) => {
        if (!cat) return false;
        if (cat.id != null && simulado.categoryId != null && String(cat.id) === String(simulado.categoryId)) return true;
        return Boolean(cat.name && simSubj && isSubjectMatch(simSubj, cat.name));
      });
      if (matchedCat) {
        const cMax = Number(matchedCat.maxScore) > 0 ? Number(matchedCat.maxScore) : maxScore;
        const cMin = matchedCat.minScore != null && matchedCat.minScore !== '' && Number.isFinite(Number(matchedCat.minScore))
          ? Math.min(Number(matchedCat.minScore), cMax)
          : minScore;
        const rawCatScore = getSafeScore(simulado, cMax, cMin);
        if (!Number.isFinite(rawCatScore)) return NaN;
        if (cMax === maxScore && cMin === minScore) return rawCatScore;
        const cRange = Math.max(1e-6, cMax - cMin);
        return minScore + ((rawCatScore - cMin) / cRange) * globalRange;
      }
    }
    return getSafeScore(simulado, maxScore, minScore);
  };

  const sorted = safeArray(simulados)
    .filter((simulado) => simulado && simulado.valid !== false && simulado.validated !== false)
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
      )
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase(),
      time: toTime(simulado?.date ?? simulado?.createdAt),
      score: resolveSimuladoScoreOnGlobalScale(simulado),
      _idx,
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      const aFinite = Number.isFinite(a.time);
      const bFinite = Number.isFinite(b.time);
      
      if (aFinite && bFinite) {
        if (a.time !== b.time) return a.time - b.time;
      } else if (aFinite && !bFinite) {
        // Entradas sem data ficam no início (nunca na janela recente de drift)
        return 1;
      } else if (!aFinite && bFinite) {
        return -1;
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
 * Combina e deduplica fontes de telemetria de calibração:
 * - localStorage (`coach_calibration_telemetry_v1`)
 * - `calibrationAuditLog` do concurso
 * - `calibrationHistoryByCategory` do concurso
 */
export function mergeCalibrationTelemetrySources(contestId = null, options = {}) {
  const localEvents = loadCalibrationTelemetryEvents(contestId);
  const auditLogs = safeArray(options.calibrationAuditLog);
  const historyMap =
    options.calibrationHistoryByCategory && typeof options.calibrationHistoryByCategory === 'object'
      ? options.calibrationHistoryByCategory
      : {};
  const historyEvents = [];
  Object.entries(historyMap).forEach(([catKey, list]) => {
    safeArray(list).forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      historyEvents.push({
        ...entry,
        categoryId: entry.categoryId ?? catKey,
        categoryName: entry.categoryName ?? catKey,
      });
    });
  });

  const combined = [...localEvents, ...auditLogs, ...historyEvents]
    .filter((ev) => ev && typeof ev === 'object')
    .map((ev, idx) => {
      const rawTs = ev.timestamp ?? ev.ts ?? ev.createdAt ?? ev.date;
      const numTs = Number(rawTs);
      const ts = Number.isFinite(numTs) && numTs > 0 ? numTs : toTime(rawTs);
      const avgBrier = Number.isFinite(Number(ev.avgBrier ?? ev.brier))
        ? Number(ev.avgBrier ?? ev.brier)
        : null;
      const ece = Number.isFinite(Number(ev.ece)) ? Number(ev.ece) : null;
      const calibrationPenalty = Number.isFinite(Number(ev.calibrationPenalty))
        ? Number(ev.calibrationPenalty)
        : null;
      return {
        ...ev,
        timestamp: Number.isFinite(ts) && ts > 0 ? ts : 0,
        ...(avgBrier !== null ? { avgBrier } : {}),
        ...(ece !== null ? { ece } : {}),
        ...(calibrationPenalty !== null ? { calibrationPenalty } : {}),
        _idx: idx,
      };
    })
    .sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      return a._idx - b._idx;
    });

  const lastByCat = new Map();
  const deduped = [];
  combined.forEach(({ _idx, ...ev }) => {
    const catSig = String(ev.categoryId || ev.categoryName || 'global')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    const prev = lastByCat.get(catSig);
    if (
      prev &&
      ev.timestamp > 0 &&
      Math.abs(ev.timestamp - prev.timestamp) < 1000 &&
      Math.abs((ev.avgBrier ?? -1) - (prev.avgBrier ?? -1)) < 1e-6 &&
      Math.abs((ev.ece ?? -1) - (prev.ece ?? -1)) < 1e-6
    ) {
      return;
    }
    lastByCat.set(catSig, ev);
    deduped.push(ev);
  });

  return deduped;
}

/**
 * Executa o Drift Guard completo.
 */
export function runCoachDriftGuard(options = {}) {
  const calibrationEvents = Array.isArray(options.calibrationEvents)
    ? options.calibrationEvents
    : mergeCalibrationTelemetrySources(options.contestId, {
        calibrationAuditLog: options.calibrationAuditLog,
        calibrationHistoryByCategory: options.calibrationHistoryByCategory,
      });
  const scores = Array.isArray(options.scores) ? options.scores : [];
  const volatilities = Array.isArray(options.volatilities)
    ? options.volatilities
    : [];
  let probabilityPairs = Array.isArray(options.probabilityPairs)
    ? options.probabilityPairs
    : [];

  if (probabilityPairs.length === 0 && options.probabilityPairs === undefined) {
    const evalResults = loadEvaluationResults(options.contestId);
    const preferredStrategyId = typeof options.strategyId === 'string' && options.strategyId
      ? options.strategyId
      : null;

    // Prioriza avaliações ao vivo (não-bt_) ou da estratégia ativa/baseline e deduplica por (categoria, timestamp)
    // para impedir que folds de múltiplas estratégias de backtest inflem artificialmente a mesma prova.
    const rankedEvals = [...evalResults].sort((a, b) => {
      const rankItem = (ev) => {
        const idStr = String(ev?.id || '');
        const strat = String(ev?.strategyId || '');
        if (!idStr.startsWith('bt_')) return 0;
        if (preferredStrategyId && strat === preferredStrategyId) return 1;
        if (strat === 'baseline') return 2;
        if (strat === 'all-lots' || strat === 'all-math-lots') return 3;
        return 4;
      };
      const rDiff = rankItem(a) - rankItem(b);
      if (rDiff !== 0) return rDiff;
      return (Number(b?.timestamp) || 0) - (Number(a?.timestamp) || 0);
    });

    const seenOutcomeKeys = new Set();
    probabilityPairs = rankedEvals
      .map((ev) => {
        const probEval = ev?.probabilityEvaluation;
        if (!probEval) return null;
        const p = probEval.predictedProbability01;
        const y = probEval.observed;
        if (!Number.isFinite(p) || !Number.isFinite(y)) return null;
        const ts = Number(ev.timestamp) || 0;
        const catSig = String(ev?.categoryId ?? ev?.categoryName ?? '');
        if (ts > 0 || catSig) {
          const outcomeKey = `${catSig}|${ts}`;
          if (seenOutcomeKeys.has(outcomeKey)) return null;
          seenOutcomeKeys.add(outcomeKey);
        }
        return {
          probability: p,
          observed: y,
          timestamp: ts,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Fallback: se ainda não houver avaliações persistidas, tenta extrair pares observados
    // dos eventos de calibração (quando possuírem probability + observed)
    if (probabilityPairs.length === 0 && calibrationEvents.length > 0) {
      probabilityPairs = calibrationEvents
        .map((ev) => {
          if (ev?.probability === null || ev?.probability === undefined || typeof ev?.probability === 'boolean' || String(ev.probability).trim() === '') return null;
          if (ev?.observed === null || ev?.observed === undefined || String(ev.observed).trim() === '') return null;
          const p = Number(ev.probability);
          const y = ev.observed === true ? 1 : (ev.observed === false ? 0 : Number(ev.observed));
          if (!Number.isFinite(p) || !Number.isFinite(y)) return null;
          const p01 = p > 1 ? Math.max(0, Math.min(1, p / 100)) : Math.max(0, Math.min(1, p));
          return {
            probability: p01,
            observed: y > 0.5 ? 1 : 0,
            timestamp: Number(ev.timestamp) || 0,
          };
        })
        .filter(Boolean);
    }
  }

  const maxCalibrationTimestamp = calibrationEvents.reduce((maxTs, ev) => {
    const ts = Number(ev?.timestamp);
    return Number.isFinite(ts) && ts > maxTs ? ts : maxTs;
  }, 0);

  const lastTelemetryTimestamp =
    Number(options.lastTelemetryTimestamp) || maxCalibrationTimestamp;

  const {
    probabilityPairs: _rawProbabilityPairs,
    probabilityPairsOptions,
    ...healthOptions
  } = options || {};

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
    {
      ...healthOptions,
      probabilityPairs:
        probabilityPairsOptions && typeof probabilityPairsOptions === 'object'
          ? probabilityPairsOptions
          : {},
    }
  );

  if (options.saveSnapshot !== false) {
    saveModelHealthSnapshot(health, options.contestId);
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

