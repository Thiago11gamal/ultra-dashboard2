/**
 * strategyBacktester.js
 *
 * Lote 8 — Backtest offline de estratégias do Coach.
 *
 * Este módulo compara diferentes configurações de flags usando dados históricos.
 * Ele não altera o Coach em produção.
 */

import {
  calculateUrgency,
  getSuggestedFocus,
  getWeakestTopicsList,
  clearUrgencyCache,
  clearTopicsCache,
  clearMcCache,
} from '../../utils/coachLogic.js';

import { getSafeScore } from '../../utils/scoreHelper.js';
import { normalizeDate } from '../../utils/dateHelper.js';
import { isSubjectMatch } from '../../utils/normalization.js';
import { DEFAULT_COACH_FEATURES } from '../../utils/coachFeatures.js';

import {
  evaluateCoachSnapshot,
  summarizeCoachEvaluations,
  compareEvaluationSummaries,
} from './coachEvaluator.js';

// Mapa explícito de baseline com TODAS as flags em false para impedir que
// estratégias do backtest herdem flags ativas do coachFeatureStore (ex.: Admin/N1-N5).
const EXPLICIT_BASELINE_FEATURES = Object.freeze(
  Object.keys(DEFAULT_COACH_FEATURES).reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {})
);

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function toTime(value) {
  const date = normalizeDate(value);
  return date && Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

function filterLogsBefore(studyLogs = [], cutoff = null) {
  const cutoffTime = toTime(cutoff);

  if (!Number.isFinite(cutoffTime)) {
    return safeArray(studyLogs);
  }

  return safeArray(studyLogs).filter((log) => {
    const logTime = toTime(log?.date ?? log?.createdAt);

    if (!Number.isFinite(logTime)) return false;

    return logTime <= cutoffTime;
  });
}

/**
 * Estratégias padrão: baseline vs todos os lotes ativos.
 */
export function getDefaultCoachStrategies() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'all-lots',
      label: 'Todos os lotes',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
  ];
}

/**
 * Estratégias granulares para comparar lote por lote.
 */
export function getGranularCoachStrategies() {
  return [
    {
      id: 'baseline',
      label: 'Baseline',
      features: {},
    },
    {
      id: 'lot1-state-space',
      label: 'Lote 1 — State-Space',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
      },
    },
    {
      id: 'lot2-dynamic-volatility',
      label: 'Lote 2 — Volatilidade dinâmica',
      features: {
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'lot3-posterior-mc',
      label: 'Lote 3 — Posterior MC',
      features: {
        usePosteriorMonteCarlo: true,
      },
    },
    {
      id: 'lot4-bayesian-topics',
      label: 'Lote 4 — Bayesian Topics',
      features: {
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'lot5-decision-utility',
      label: 'Lote 5 — Decision Utility',
      features: {
        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,
      },
    },
    {
      id: 'lot7-knowledge-fsrs',
      label: 'Lote 7 — Knowledge Graph + FSRS',
      features: {
        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,
        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,
      },
    },
    {
      id: 'lot11-causal-policy',
      label: 'Lote 11 — Causal Uplift & Policy',
      features: {
        useCausalUplift: true,
        usePersonalizedPolicy: true,
        useCausalTaskSelection: true,
      },
    },
    {
      id: 'conservative',
      label: 'Conservador — Lotes 1 + 2',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
        useDynamicVolatility: true,
        useGarchVolatility: true,
      },
    },
    {
      id: 'balanced',
      label: 'Equilibrado — Lotes 1 + 2 + 3 + 4',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,
        useDynamicVolatility: true,
        useGarchVolatility: true,
        usePosteriorMonteCarlo: true,
        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,
      },
    },
    {
      id: 'all-lots',
      label: 'Todos os lotes',
      features: {
        useStateSpace: true,
        useStateSpaceAverage: true,
        useStateSpaceTrend: true,

        useDynamicVolatility: true,
        useGarchVolatility: true,

        usePosteriorMonteCarlo: true,

        useBayesianTopics: true,
        useBayesianTopicsForUrgency: true,

        useDecisionUtility: true,
        useDecisionUtilityForTopics: true,
        useDecisionUtilityForBestTask: true,

        useKnowledgeGraph: true,
        useKnowledgeGraphForTopics: true,

        useAdvancedFsrs: true,
        useFsrsForSrsBoost: true,
        useFsrsTopicScheduling: true,

        useCausalUplift: true,
        usePersonalizedPolicy: true,
        useCausalTaskSelection: true,
      },
    },
  ];
}

/**
 * Constrói splits temporais para uma categoria.
 */
export function buildCategorySplits(category, simulados = [], options = {}) {
  const globalMax = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const rawGlobalMin = options.minScore;
  const globalMin =
    rawGlobalMin !== null && rawGlobalMin !== undefined && rawGlobalMin !== '' && typeof rawGlobalMin !== 'boolean' && Number.isFinite(Number(rawGlobalMin))
      ? Math.min(Number(rawGlobalMin), globalMax)
      : 0;
  const globalDomain = Math.max(1e-6, globalMax - globalMin);

  const maxScore =
    Number(category?.maxScore) > 0
      ? Number(category.maxScore)
      : globalMax;
  const rawMin = category?.minScore !== null && category?.minScore !== undefined && category?.minScore !== '' && typeof category?.minScore !== 'boolean'
    ? category.minScore
    : options.minScore;
  const minScore =
    rawMin !== null && rawMin !== undefined && rawMin !== '' && typeof rawMin !== 'boolean' && Number.isFinite(Number(rawMin))
      ? Math.min(Number(rawMin), maxScore)
      : 0;
  const domain = Math.max(1e-6, maxScore - minScore);
  const hasCatCutoff =
    category?.minCutoff !== null &&
    category?.minCutoff !== undefined &&
    typeof category?.minCutoff !== 'boolean' &&
    String(category.minCutoff).trim() !== '' &&
    Number.isFinite(Number(category.minCutoff)) &&
    Number(category.minCutoff) > minScore;
  const rawTarget = options.targetScore;
  let targetScore;
  if (hasCatCutoff) {
    targetScore = Math.max(minScore, Math.min(maxScore, Number(category.minCutoff)));
  } else if (rawTarget !== null && rawTarget !== undefined && rawTarget !== '' && typeof rawTarget !== 'boolean' && Number.isFinite(Number(rawTarget))) {
    const numTarget = Number(rawTarget);
    if (maxScore === globalMax && minScore === globalMin) {
      targetScore = Math.max(minScore, Math.min(maxScore, numTarget));
    } else {
      const ratio = Math.max(0, Math.min(1, (numTarget - globalMin) / globalDomain));
      targetScore = minScore + ratio * domain;
    }
  } else {
    targetScore = minScore + domain * 0.8;
  }

  const minTrain = Math.max(3, Math.round(Number(options.minTrain) || 5));
  const maxSplits = Math.max(1, Math.round(Number(options.maxSplits) || 8));

  const categoryName = category?.name || '';
  const categoryId = category?.id || categoryName || 'unknown';

  const catOwnHistory = safeArray(category?.simuladoStats?.history).map((h) => ({
    ...h,
    categoryId: h?.categoryId ?? category?.id,
    subject: h?.subject || h?.categoryName || categoryName,
  }));
  const matchingExternal = safeArray(simulados).filter((simulado) => {
    if (!simulado) return false;
    return isSubjectMatch(simulado.subject || simulado.categoryName || simulado.materia || simulado.disciplina || '', categoryName) ||
      (category?.id && simulado.categoryId && String(simulado.categoryId) === String(category.id));
  });

  const seenSplitIds = new Set();
  const seenCatDayScores = new Map();
  const seenExtNoIdDayScores = new Set();
  const combinedCandidateSims = [];
  const pushSplitSim = (simulado, _idx, isExternal) => {
    if (!simulado || simulado.valid === false || simulado.validated === false) return;
    const time = toTime(simulado?.date ?? simulado?.createdAt);
    const score = getSafeScore(simulado, maxScore, minScore);
    const idSig = simulado.id && !String(simulado.id).startsWith('legacy-') ? String(simulado.id) : null;
    const dayScoreSig = Number.isFinite(time) && Number.isFinite(score)
      ? `${Math.floor(time / 86400000)}:${Math.round(score * 10)}`
      : null;

    if (idSig && seenSplitIds.has(idSig)) return;
    if (isExternal) {
      if (dayScoreSig && (seenCatDayScores.get(dayScoreSig) || 0) > 0) {
        seenCatDayScores.set(dayScoreSig, seenCatDayScores.get(dayScoreSig) - 1);
        if (idSig) seenSplitIds.add(idSig);
        return;
      }
      if (!idSig && dayScoreSig && seenExtNoIdDayScores.has(dayScoreSig)) return;
      if (!idSig && dayScoreSig) seenExtNoIdDayScores.add(dayScoreSig);
    } else if (dayScoreSig) {
      if (!idSig && (seenCatDayScores.get(dayScoreSig) || 0) > 0) return;
      seenCatDayScores.set(dayScoreSig, (seenCatDayScores.get(dayScoreSig) || 0) + 1);
    }
    if (idSig) seenSplitIds.add(idSig);
    combinedCandidateSims.push({ simulado, _idx, time });
  };
  catOwnHistory.forEach((simulado, idx) => pushSplitSim(simulado, idx, false));
  matchingExternal.forEach((simulado, idx) => pushSplitSim(simulado, catOwnHistory.length + idx, true));

  const hasDatedSimulados = combinedCandidateSims.some((entry) => Number.isFinite(entry.time));

  const categorySimulados = combinedCandidateSims
    .sort((a, b) => {
      const aFinite = Number.isFinite(a.time);
      const bFinite = Number.isFinite(b.time);

      if (aFinite && bFinite) {
        if (a.time !== b.time) return a.time - b.time;
      } else if (aFinite && !bFinite) {
        // Entradas sem data ficam no prefixo histórico (treino), nunca no holdout futuro
        return 1;
      } else if (!aFinite && bFinite) {
        return -1;
      }

      return a._idx - b._idx;
    })
    .map((entry) => entry.simulado);

  // FIX-M03: horizon adaptativo baseado no gap mediano entre simulados.
  // Alunos que fazem simulados semanais: horizon=2.
  // Alunos que fazem a cada 3 dias: horizon=5.
  const hasExplicitHorizon =
    options.horizon !== undefined &&
    options.horizon !== null &&
    options.horizon !== '' &&
    Number.isFinite(Number(options.horizon)) &&
    Number(options.horizon) >= 1;
  let horizon = hasExplicitHorizon ? Math.max(1, Math.round(Number(options.horizon))) : 1;
  if (!hasExplicitHorizon) {
    // Auto-detectar a partir dos gaps temporais
    const times = categorySimulados
      .map(s => toTime(s?.date ?? s?.createdAt))
      .filter(t => Number.isFinite(t))
      .sort((a, b) => a - b);
    if (times.length >= 3) {
      const gaps = [];
      for (let i = 1; i < times.length; i++) {
        gaps.push((times[i] - times[i - 1]) / 86400000);
      }
      gaps.sort((a, b) => a - b);
      const medianGap = gaps[Math.floor(gaps.length / 2)];
      horizon = Math.max(2, Math.min(8, Math.round(14 / Math.max(1, medianGap))));
    }
  }

  const splits = [];

  for (let i = minTrain - 1; i < categorySimulados.length - 1; i++) {
    const train = categorySimulados.slice(0, i + 1);
    const rawFuture = categorySimulados.slice(i + 1, i + 1 + horizon);
    const future = hasDatedSimulados
      ? rawFuture.filter((simulado) => Number.isFinite(toTime(simulado?.date ?? simulado?.createdAt)))
      : rawFuture;

    if (future.length === 0) continue;

    const observedScores = future
      .map((simulado) => getSafeScore(simulado, maxScore, minScore))
      .filter((score) => Number.isFinite(score));

    if (observedScores.length === 0) continue;

    const observedScore =
      observedScores.reduce((acc, score) => acc + score, 0) /
      observedScores.length;

    const lastTrain = train[train.length - 1];
    const trainLastDate = lastTrain?.date ?? lastTrain?.createdAt ?? null;

    splits.push({
      categoryId,
      categoryName,
      maxScore,
      minScore,
      targetScore,
      horizon,
      train,
      future,
      trainLastDate,
      observedScore,
      observedSuccess: observedScore >= targetScore,
    });
  }

  // Retorna os splits mais recentes (não apenas os mais antigos)
  return splits.length > maxSplits ? splits.slice(-maxSplits) : splits;
}

/**
 * Executa backtest de estratégias do Coach.
 */
export function runCoachStrategyBacktest(config = {}) {
  const categories = safeArray(config.categories);
  const simulados = safeArray(config.simulados);
  const studyLogs = safeArray(config.studyLogs);

  const maxScore = Number(config.maxScore) > 0 ? Number(config.maxScore) : 100;
  const minScore =
    config.minScore !== null &&
      config.minScore !== undefined &&
      config.minScore !== '' &&
      Number.isFinite(Number(config.minScore))
      ? Math.min(Number(config.minScore), maxScore)
      : 0;
  const domain = Math.max(1e-6, maxScore - minScore);

  const targetScore =
    config.targetScore !== null &&
      config.targetScore !== undefined &&
      config.targetScore !== '' &&
      Number.isFinite(Number(config.targetScore))
      ? Number(config.targetScore)
      : minScore + domain * 0.8;

  const strategies =
    Array.isArray(config.strategies) && config.strategies.length > 0
      ? config.strategies
      : getDefaultCoachStrategies();

  const minTrain = Math.max(3, Math.round(Number(config.minTrain) || 5));
  const hasExplicitHorizon =
    config.horizon !== undefined &&
    config.horizon !== null &&
    config.horizon !== '' &&
    Number.isFinite(Number(config.horizon)) &&
    Number(config.horizon) >= 1;
  const explicitHorizon = hasExplicitHorizon
    ? Math.max(1, Math.round(Number(config.horizon)))
    : undefined;
  const maxSplits = Math.max(1, Math.round(Number(config.maxSplits) || 6));
  const topicK = Math.max(1, Math.round(Number(config.topicK) || 5));

  const includeTopics = config.includeTopics === true;
  const clearCaches = config.clearCaches !== false;

  const rawByStrategy = {};

  strategies.forEach((strategy) => {
    rawByStrategy[strategy.id] = [];
  });

  let resolvedHorizon = explicitHorizon ?? null;

  categories.forEach((category) => {
    const splits = buildCategorySplits(category, simulados, {
      maxScore,
      minScore,
      targetScore: config.targetScore,
      minTrain,
      horizon: explicitHorizon,
      maxSplits,
    });
    if (resolvedHorizon === null && splits.length > 0 && Number.isFinite(splits[0].horizon)) {
      resolvedHorizon = splits[0].horizon;
    }

    splits.forEach((split) => {
      const logsBefore = filterLogsBefore(studyLogs, split.trainLastDate);
      const splitMaxScore = split.maxScore ?? maxScore;
      const splitMinScore = split.minScore ?? minScore;
      const splitTargetScore = split.targetScore ?? targetScore;

      strategies.forEach((strategy) => {
        if (clearCaches) {
          try {
            clearUrgencyCache();
            clearTopicsCache();
            clearMcCache();
          } catch {
            // ignore
          }
        }

        try {
          // FIX: isolar histórico e tarefas da categoria e das demais categorias ao cutoff do split (zero target leakage)
          const cutoffMs = toTime(split.trainLastDate);
          const isolateTasksBefore = (tasks) => {
            if (!Array.isArray(tasks) || !Number.isFinite(cutoffMs)) return tasks;
            return tasks
              .filter((task) => {
                if (!task) return false;
                const createdMs = toTime(task.createdAt);
                return !Number.isFinite(createdMs) || createdMs <= cutoffMs;
              })
              .map((task) => {
                const doneMs = toTime(task.completedAt ?? task.lastStudiedAt);
                const studiedMs = toTime(task.lastStudiedAt);
                const futureDone = Boolean(task.completed) && Number.isFinite(doneMs) && doneMs > cutoffMs;
                const futureStudied = Number.isFinite(studiedMs) && studiedMs > cutoffMs;
                if (!futureDone && !futureStudied) return task;
                return {
                  ...task,
                  completed: futureDone ? false : task.completed,
                  completedAt: futureDone ? null : task.completedAt,
                  lastStudiedAt: futureStudied ? null : task.lastStudiedAt,
                };
              });
          };
          const isolateCategory = (cat, overrideHistory = null) => {
            const rawHistory = overrideHistory !== null
              ? overrideHistory
              : Number.isFinite(cutoffMs)
                ? safeArray(cat?.simuladoStats?.history).filter((h) => {
                    const hTime = toTime(h?.date ?? h?.createdAt);
                    return !Number.isFinite(hTime) || hTime <= cutoffMs;
                  })
                : cat?.simuladoStats?.history;
            return {
              ...cat,
              tasks: isolateTasksBefore(cat?.tasks),
              simuladoStats: {
                ...(cat?.simuladoStats || {}),
                history: rawHistory,
              },
            };
          };

          const trainCategory = isolateCategory(category, split.train);
          const trainAllCategories = categories.map((c) =>
            c === category || (c?.id != null && category?.id != null && String(c.id) === String(category.id))
              ? trainCategory
              : isolateCategory(c, null)
          );

          // Alinha o horizonte de simulação (daysToExam) ao intervalo real coberto por split.future
          let splitHorizonDays = Math.max(7, (split.horizon || 1) * 7);
          if (Number.isFinite(cutoffMs) && Array.isArray(split.future) && split.future.length > 0) {
            const futureTimes = split.future
              .map((s) => toTime(s?.date ?? s?.createdAt))
              .filter((t) => Number.isFinite(t) && t >= cutoffMs);
            if (futureTimes.length > 0) {
              const spanDays = (Math.max(...futureTimes) - cutoffMs) / 86400000;
              if (Number.isFinite(spanDays) && spanDays > 0) {
                splitHorizonDays = Math.max(1, Math.min(365, Math.round(spanDays)));
              }
            }
          }

          const runOptions = {
            ...(config.options || {}),
            daysToExam: config.options?.daysToExam ?? splitHorizonDays,
            maxScore: splitMaxScore,
            minScore: splitMinScore,
            targetScore: splitTargetScore,
            now: split.trainLastDate,
            features: {
              ...EXPLICIT_BASELINE_FEATURES,
              ...(config.baseFeatures || {}),
              ...(strategy.features || {}),
            },
            allCategories: trainAllCategories,
          };

          let urgency = null;
          let weakTopics = [];

          if (includeTopics) {
            const focus = getSuggestedFocus(
              [trainCategory],
              split.train,
              logsBefore,
              runOptions
            );

            urgency = focus?.urgency || null;
            const topTopics = getWeakestTopicsList(
              trainCategory,
              split.train,
              splitMaxScore,
              topicK,
              splitMinScore,
              runOptions
            );
            weakTopics =
              Array.isArray(topTopics) && topTopics.length > 0
                ? topTopics
                : focus?.weakestTopic
                  ? [focus.weakestTopic]
                  : [];
          } else {
            urgency = calculateUrgency(
              trainCategory,
              split.train,
              logsBefore,
              runOptions
            );
          }

          // Alinha o evento binário observado com o alvo efetivo do Monte Carlo (ex.: stepping-stone target)
          const effectiveMCTarget = urgency?.details?.monteCarlo?.effectiveMCTarget;
          const evalTargetScore = Number.isFinite(effectiveMCTarget)
            ? effectiveMCTarget
            : splitTargetScore;
          const observedSuccess = split.observedScore >= evalTargetScore;

          const snapshot = {
            strategyId: strategy.id,
            categoryId: split.categoryId,
            categoryName: split.categoryName,
            timestamp: toTime(split.trainLastDate) || Date.now(),
            normalizedScore: urgency?.normalizedScore ?? null,
            probability:
              urgency?.details?.monteCarlo?.probability ??
              null,
            predictedMean:
              urgency?.details?.monteCarlo?.meanProjected ??
              urgency?.details?.averageScore ??
              null,
            maxScore: splitMaxScore,
            minScore: splitMinScore,
            targetScore: evalTargetScore,
            weakTopics,
          };

          const deriveDefaultOutcomeTopics = (futureSims) => {
            const topicMap = new Map();
            safeArray(futureSims).forEach((sim) => {
              const rawList = Array.isArray(sim?.topics) && sim.topics.length > 0
                ? sim.topics
                : (sim?.topic || sim?.assunto || sim?.topicName)
                  ? [{
                    name: sim.topic || sim.assunto || sim.topicName,
                    total: sim.total ?? sim.questoes ?? sim.totalQuestoes,
                    correct: sim.correct ?? sim.acertos ?? sim.correctCount,
                    score: sim.score,
                  }]
                  : [];
              rawList.forEach((t) => {
                const rawName = String(t?.name ?? t?.topic ?? t?.assunto ?? '').trim();
                if (!rawName) return;
                const normKey = rawName
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/\s+/g, ' ')
                  .trim();
                if (!normKey) return;
                const total = Number(t?.total ?? t?.questoes ?? 0);
                const correct = Number(t?.correct ?? t?.acertos ?? NaN);
                let pct = NaN;
                if (total > 0 && Number.isFinite(correct)) {
                  pct = (correct / total) * 100;
                } else if (Number.isFinite(Number(t?.score))) {
                  const sRange = Math.max(1e-6, splitMaxScore - splitMinScore);
                  pct = ((Number(t.score) - splitMinScore) / sRange) * 100;
                }
                const prev = topicMap.get(normKey) || { displayName: rawName, sumPct: 0, count: 0 };
                if (Number.isFinite(pct)) {
                  prev.sumPct += Math.max(0, Math.min(100, pct));
                  prev.count += 1;
                }
                topicMap.set(normKey, prev);
              });
            });
            const relevant = [];
            for (const stat of topicMap.values()) {
              const avgPct = stat.count > 0 ? stat.sumPct / stat.count : 50;
              if (avgPct < 85) {
                const relevance = Math.max(1, Math.round((100 - avgPct) / 20));
                relevant.push({ name: stat.displayName, relevance });
              }
            }
            return relevant;
          };

          const outcomeTopics =
            typeof config.getOutcomeTopics === 'function'
              ? config.getOutcomeTopics(split, category, strategy)
              : (includeTopics ? deriveDefaultOutcomeTopics(split.future) : []);

          // Calcula uplift observado no horizonte (ganho de nota ponderado por alinhamento com tópicos/estudo)
          const lastTrainEntry = Array.isArray(split.train) && split.train.length > 0
            ? split.train[split.train.length - 1]
            : null;
          const lastTrainScore = lastTrainEntry
            ? getSafeScore(lastTrainEntry, splitMaxScore, splitMinScore)
            : NaN;
          const futureEndMs = Array.isArray(split.future) && split.future.length > 0
            ? Math.max(...split.future.map((f) => toTime(f?.date ?? f?.createdAt)).filter(Number.isFinite))
            : NaN;
          const hadStudyInHorizon = Number.isFinite(cutoffMs) && Number.isFinite(futureEndMs)
            ? safeArray(studyLogs).some((log) => {
                const lt = toTime(log?.date ?? log?.createdAt);
                if (!Number.isFinite(lt) || lt <= cutoffMs || lt > futureEndMs) return false;
                const mins = Number(log?.minutes ?? log?.minutos ?? log?.duration ?? 0);
                if (mins <= 0) return false;
                if (category?.id != null && log?.categoryId != null && String(log.categoryId) === String(category.id)) return true;
                const logSubj = log?.subject || log?.categoryName || log?.materia || log?.disciplina || '';
                return Boolean(category?.name && logSubj && isSubjectMatch(logSubj, category.name));
              }) || safeArray(category?.tasks).some((task) => {
                if (!task?.completed) return false;
                const ct = toTime(task.completedAt || task.lastStudiedAt);
                return Number.isFinite(ct) && ct > cutoffMs && ct <= futureEndMs;
              })
            : false;

          const observedUplift =
            hadStudyInHorizon && Number.isFinite(lastTrainScore) && Number.isFinite(split.observedScore)
              ? Number((split.observedScore - lastTrainScore).toFixed(4))
              : null;

          const outcome = {
            score: split.observedScore,
            success: observedSuccess,
            relevantTopics: Array.isArray(outcomeTopics) ? outcomeTopics : [],
            taskUplift: observedUplift,
          };

          const evaluation = evaluateCoachSnapshot(snapshot, outcome, {
            maxScore: splitMaxScore,
            minScore: splitMinScore,
            targetScore: evalTargetScore,
            k: topicK,
            evaluateTopics: includeTopics,
          });

          rawByStrategy[strategy.id].push(evaluation);
        } catch (err) {
          console.warn(
            `[StrategyBacktester] Failed strategy ${strategy.id}:`,
            err
          );
        }
      });
    });
  });

  const summaries = {};

  Object.entries(rawByStrategy).forEach(([strategyId, evaluations]) => {
    summaries[strategyId] = summarizeCoachEvaluations(evaluations, {
      bins: config.calibrationBins ?? 6,
    });
  });

  const comparisons = {};

  if (summaries.baseline) {
    Object.keys(summaries).forEach((strategyId) => {
      if (strategyId === 'baseline') return;

      comparisons[`${strategyId}_vs_baseline`] = compareEvaluationSummaries(
        summaries.baseline,
        summaries[strategyId]
      );
    });
  }

  return {
    generatedAt: Date.now(),
    config: {
      maxScore,
      minScore,
      targetScore,
      minTrain,
      horizon: resolvedHorizon ?? explicitHorizon ?? 1,
      maxSplits,
      includeTopics,
      clearCaches,
      strategyIds: strategies.map((strategy) => strategy.id),
    },
    summaries,
    comparisons,
    raw: rawByStrategy,
  };
}

export default {
  getDefaultCoachStrategies,
  getGranularCoachStrategies,
  buildCategorySplits,
  runCoachStrategyBacktest,
};

