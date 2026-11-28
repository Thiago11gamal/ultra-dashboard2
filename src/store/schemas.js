import { safeClone } from '../utils/safeClone.js';
import { INITIAL_DATA } from '../data/initialData.js';
import { generateId } from '../utils/idGenerator.js';
import { normalize, aliases, isSubjectMatch } from '../utils/normalization.js';
import { getDateKey, toDateMs } from '../utils/dateHelper.js';
import { computeCategorySimuladoStats } from '../utils/simuladoReconciler.js';
import { RECOVERED_DIREITO_CONTEST } from '../data/recoveredContests.js';
import { getSyntheticTotal, getSafeScore, extractTopicsTotals } from '../utils/scoreHelper.js';
import { computeEffectiveScoreRatio } from '../utils/measurement.js';
import { normalizeHexColor, normalizePriority } from '../utils/colorHelper.js';

export const DEFAULT_TARGET_SCORE = 75; // Unificando como 75 (meio termo entre 70 e 80)

/**
 * Validação Ultra-Resiliente (Sem Zod)
 * Garante que o app sempre tenha uma estrutura válida, mesmo com dados corrompidos.
 */

/**
 * REPAIR ENGINE: Rebuilds category history from raw simulation logs
 * if discrepancies are detected. This is a SILENT repair that happens
 * during each state update from Firebase or LocalStorage.
 */
const extractRowDate = (r) => {
  if (!r) return null;

  if (r.date && typeof r.date === 'object' && Number.isFinite(Number(r.date._seconds))) {
    return new Date(Number(r.date._seconds) * 1000);
  }

  if (r.createdAt && typeof r.createdAt === 'object' && Number.isFinite(Number(r.createdAt._seconds))) {
    return new Date(Number(r.createdAt._seconds) * 1000);
  }

  return r.date || r.createdAt || null;
};

/**
 * Normalizes a single history entry into [catMin, catMax] points while resolving
 * question/correct field aliases, topic fallbacks, and percentage scores safely.
 */
const normalizeHistoryEntry = (h, catMax = 100, catMin = 0, options = {}) => {
  const safeMin = Number.isFinite(Number(catMin)) ? Number(catMin) : 0;
  const safeMax = Math.max(safeMin + 1e-9, Number(catMax) || 100);
  const scoreRange = Math.max(1e-9, safeMax - safeMin);

  const hasHeaderScore = (
    (h.scorePoints != null && Number.isFinite(Number(h.scorePoints))) ||
    (h.scorePct != null && Number.isFinite(Number(h.scorePct))) ||
    (h.score != null && h.score !== '' && Number.isFinite(Number(h.score))) ||
    (h.value != null && h.value !== '' && Number.isFinite(Number(h.value)))
  );

  let rawTotal = Math.max(0, parseInt(h.total ?? h.questoes ?? h.totalQuestoes ?? h.questions, 10) || 0);
  const rawCorrectInput = h.correct ?? h.acertos ?? h.correctCount;
  const hasExplicitCorrect = !h.isPercentage &&
    rawCorrectInput !== undefined &&
    rawCorrectInput !== null &&
    String(rawCorrectInput).trim() !== '' &&
    Number.isFinite(Number(rawCorrectInput));
  let rawCorrect = hasExplicitCorrect ? Math.max(0, parseInt(rawCorrectInput, 10) || 0) : 0;

  let resolvedScore = hasHeaderScore ? getSafeScore(h, safeMax, safeMin) : NaN;
  const usedPctInput = Boolean(
    h.isPercentage === true ||
    h.unit === 'pct' ||
    h.unit === 'percentage' ||
    h.scoreUnit === 'pct'
  );

  if (rawTotal <= 0 && h.topics != null) {
    const tf = extractTopicsTotals(h, safeMax, safeMin);
    if (tf.total > 0) {
      rawTotal = tf.total;
      rawCorrect = tf.correct;
      if (!Number.isFinite(resolvedScore) || (resolvedScore === safeMin && h.scorePoints == null && h.scorePct == null)) {
        resolvedScore = tf.score;
      }
    } else if (!Number.isFinite(resolvedScore) && tf.hasTopicsScore) {
      resolvedScore = tf.score;
    }
  }

  const hasValidScore = Number.isFinite(resolvedScore);
  const clampedScore = hasValidScore
    ? Math.min(safeMax, Math.max(safeMin, resolvedScore))
    : (rawTotal > 0
      ? (() => {
          const pen = Math.max(0, Number(h.penaltyPerWrong) || 0);
          const blk = Math.max(0, Number(h.blanks) || 0);
          const cBounded = Math.min(rawTotal, rawCorrect);
          const wrong = Math.max(0, rawTotal - cBounded - Math.min(rawTotal - cBounded, blk));
          const netRatio = pen > 0
            ? (safeMin < 0 ? (cBounded - wrong * pen) / rawTotal : Math.max(0, (cBounded - wrong * pen) / rawTotal))
            : (cBounded / rawTotal);
          return safeMin < 0 && pen > 0
            ? Math.min(safeMax, Math.max(safeMin, ((netRatio + 1) / 2) * scoreRange + safeMin))
            : Math.min(safeMax, Math.max(safeMin, safeMin + Math.max(0, Math.min(1, netRatio)) * scoreRange));
        })()
      : safeMin);

  let total = rawTotal;
  let correct = Math.min(total, rawCorrect);
  const ratio = Math.max(0, Math.min(1, (clampedScore - safeMin) / scoreRange));

  if (total > 0 && !hasExplicitCorrect && hasValidScore) {
    correct = Math.round(ratio * total);
  }

  let syntheticVolume = Boolean(h.syntheticVolume || h.isSynthetic || h.type === 'percent-only');
  if (total === 0 && hasValidScore) {
    total = typeof getSyntheticTotal === 'function' ? getSyntheticTotal(safeMax) : 20;
    correct = Math.round(ratio * total);
    syntheticVolume = true;
  }

  const normalizedScore = Number(clampedScore.toFixed(2));
  const out = {
    ...h,
    score: normalizedScore,
    total,
    correct,
    syntheticVolume,
  };

  if (options.preserveDate !== true) {
    out.date = h.date || h.createdAt;
  }
  if (usedPctInput) {
    out.isPercentage = false;
    if (h.unit === 'pct' || h.unit === 'percentage') out.unit = 'points';
    if (h.scoreUnit === 'pct') out.scoreUnit = 'points';
  }
  if (h.scorePoints != null) {
    out.scorePoints = normalizedScore;
  }
  if (h.scorePct != null) {
    out.scorePct = Number((ratio * 100).toFixed(2));
  }
  return out;
};

// ✅ FIX 2 & BUG-01: Reconciliação do Histórico das Categorias com base nos Registros Brutos dos Simulados
export const repairContestHistory = (rawData, maxScore = 100, minScore = 0) => {
  if (!rawData || typeof rawData !== 'object') return rawData;

  if (Array.isArray(rawData)) {
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Math.max(safeMin + 1e-9, Number(maxScore) || 100);
    return rawData.map(r => {
      if (!r || typeof r !== 'object') return r;
      return normalizeHistoryEntry(r, safeMax, safeMin, { preserveDate: true });
    });
  }

  const data = safeClone(rawData);
  if (!data.simuladoRows || data.simuladoRows.length === 0 || !data.categories) return data;

  const rows = data.simuladoRows;
  let hasRepaired = false;

  const categoriesArray = Array.isArray(data.categories) ? data.categories : Object.values(data.categories || {});
  categoriesArray.forEach(cat => {
    if (!cat || typeof cat !== 'object') return;
    const catNorm = normalize(cat.name);
    const catAliases = aliases[catNorm] || [];

    const myRows = rows.filter(r => {
      if (!r || r.valid === false || r.validated === false || r.source === 'manual-error-notebook') return false;
      if (r.categoryId && cat.id && String(r.categoryId) === String(cat.id)) return true;

      const rawSub = r.subject || r.categoryName || r.materia || r.disciplina || '';
      const subNorm = normalize(rawSub);
      if (!subNorm) return false;

      return subNorm === catNorm ||
        catAliases.some(a => normalize(a) === subNorm) ||
        isSubjectMatch(rawSub, cat.name);
    });

    if (myRows.length === 0) return;

    const currentHistory = cat.simuladoStats?.history || [];
    const maxScore = Number(cat.maxScore) || Number(rawData?.maxScore) || 100;
    const hasCatMin = cat.minScore !== null && cat.minScore !== undefined && typeof cat.minScore !== 'boolean' && String(cat.minScore).trim() !== '' && Number.isFinite(Number(cat.minScore));
    const hasRawMin = rawData?.minScore !== null && rawData?.minScore !== undefined && typeof rawData?.minScore !== 'boolean' && String(rawData.minScore).trim() !== '' && Number.isFinite(Number(rawData.minScore));
    const minScore = hasCatMin
      ? Number(cat.minScore)
      : (hasRawMin ? Number(rawData.minScore) : 0);
    const scoreRange = Math.max(1e-9, maxScore - minScore);

    const currentUniqueDays = new Set(
      currentHistory
        .map(h => getDateKey(h.date))
        .filter(Boolean)
    ).size;

    const hasCorruptedHistory = currentHistory.some(h =>
      !h ||
      typeof h !== 'object' ||
      (!h.date && !h.createdAt) ||
      (h.total === undefined && h.questoes === undefined && h.totalQuestoes === undefined && h.questions === undefined &&
       h.score === undefined && h.correct === undefined && h.scorePoints === undefined && h.scorePct === undefined &&
       h.topics === undefined) ||
      (h.score !== undefined && h.score !== null && Number.isNaN(Number(h.score))) ||
      (h.scorePoints !== undefined && h.scorePoints !== null && Number.isNaN(Number(h.scorePoints))) ||
      (h.total !== undefined && h.total !== null && Number.isNaN(Number(h.total)))
    );

    // C-10 FIX: dateCompressionBug pode ser falso positivo quando
    // simuladoRows tem datas duplicadas legítimas (2 simulados no mesmo dia).
    // Adicionar verificação de que as datas nos logs são realmente distintas.
    const uniqueLogDates = new Set(
      myRows.map(r => getDateKey(extractRowDate(r))).filter(Boolean)
    );
    const realDateCompression = uniqueLogDates.size > 1 && currentUniqueDays <= 1 && currentHistory.length > 0;

    if (
      hasCorruptedHistory ||
      realDateCompression ||
      currentHistory.length === 0
    ) {
      hasRepaired = true;

      const contestPenalty = Math.max(0, Number(rawData?.penaltyPerWrong) || 0);
      const dailyStats = {};

      myRows.forEach(r => {
        const dk = getDateKey(extractRowDate(r));
        if (!dk) return;

        if (!dailyStats[dk]) {
          dailyStats[dk] = {
            correct: 0,
            total: 0,
            blanks: 0,
            penaltyPerWrong: contestPenalty,
            timeSpent: 0,
            timedQuestoes: 0,
            diffWeightSum: 0,
            diffWeightTotal: 0,
            normalRowCount: 0,
            directScoreCount: 0,
            directScoreSum: 0,
            batchIds: new Set(),
            topicsMap: new Map(),
          };
        }
        if (r.batchId) dailyStats[dk].batchIds.add(String(r.batchId));

        let rawTotal = Math.max(0, parseInt(r.total ?? r.questoes ?? r.totalQuestoes ?? r.questions, 10) || 0);
        const rawCorrectInput = r.correct ?? r.acertos ?? r.correctCount;
        const hasExplicitCorrect = !r.isPercentage &&
          rawCorrectInput !== undefined &&
          rawCorrectInput !== null &&
          String(rawCorrectInput).trim() !== '' &&
          Number.isFinite(Number(rawCorrectInput));
        let rawCorrect = hasExplicitCorrect ? Math.max(0, parseInt(rawCorrectInput, 10) || 0) : 0;

        const scoreCandidate = r.score ?? r.scorePoints ?? r.scorePct ?? r.value;
        let safeScore = scoreCandidate != null && scoreCandidate !== '' && Number.isFinite(Number(scoreCandidate))
          ? Math.min(maxScore, Math.max(minScore, getSafeScore(r, maxScore, minScore)))
          : null;

        if (rawTotal <= 0 && r.topics != null) {
          const tf = extractTopicsTotals(r, maxScore, minScore);
          if (tf.total > 0) {
            rawTotal = tf.total;
            rawCorrect = tf.correct;
            if (safeScore === null || (safeScore === minScore && r.scorePoints == null && r.scorePct == null)) {
              safeScore = Math.min(maxScore, Math.max(minScore, tf.score));
            }
          } else if (safeScore === null && tf.hasTopicsScore) {
            safeScore = Math.min(maxScore, Math.max(minScore, tf.score));
          }
        }

        const corrNorm = (!hasExplicitCorrect && safeScore !== null && rawTotal > 0)
          ? Math.round((Math.max(0, Math.min(1, (safeScore - minScore) / scoreRange))) * rawTotal)
          : Math.min(rawTotal > 0 ? rawTotal : rawCorrect, rawCorrect);

        const rowBlanks = rawTotal > 0 ? Math.min(Math.max(0, rawTotal - corrNorm), Math.max(0, Number(r.blanks) || 0)) : 0;
        const rowPenalty = Math.max(contestPenalty, Math.max(0, Number(r.penaltyPerWrong) || 0));
        const rowTime = Math.max(0, Number(r.timeSpent) || 0);
        const rowTimedQ = rowTime > 0
          ? (Number(r.timedQuestoes) > 0 ? Math.max(0, Number(r.timedQuestoes)) : rawTotal)
          : 0;
        const rowDiff = Number(r.difficulty);
        if (Number.isFinite(rowDiff) && rowDiff > 0) {
          const w = rawTotal > 0 ? rawTotal : 1;
          dailyStats[dk].diffWeightSum += rowDiff * w;
          dailyStats[dk].diffWeightTotal += w;
        }
        dailyStats[dk].blanks += rowBlanks;
        dailyStats[dk].penaltyPerWrong = Math.max(dailyStats[dk].penaltyPerWrong, rowPenalty);
        dailyStats[dk].timeSpent += rowTime;
        dailyStats[dk].timedQuestoes += rowTimedQ;

        const tName = String(r.topic || r.assunto || r.topicName || '').trim() || 'Geral';
        const tKey = normalize(tName) || 'geral';
        const rowTaskId = r.taskId ?? r.topicId ?? null;
        if (rawTotal > 0 || safeScore !== null) {
          const prevT = dailyStats[dk].topicsMap.get(tKey) || {
            name: tName,
            ...(rowTaskId ? { taskId: rowTaskId } : {}),
            correct: 0,
            total: 0,
            blanks: 0,
            penaltyPerWrong: rowPenalty,
            timeSpent: 0,
            timedQuestoes: 0,
            diffSum: 0,
            diffW: 0,
            directSum: 0,
            directCount: 0,
          };
          if (!prevT.taskId && rowTaskId) prevT.taskId = rowTaskId;
          prevT.correct += corrNorm;
          prevT.total += rawTotal;
          prevT.blanks += rowBlanks;
          prevT.penaltyPerWrong = Math.max(prevT.penaltyPerWrong, rowPenalty);
          prevT.timeSpent += rowTime;
          prevT.timedQuestoes += rowTimedQ;
          if (Number.isFinite(rowDiff) && rowDiff > 0) {
            const w = rawTotal > 0 ? rawTotal : 1;
            prevT.diffSum += rowDiff * w;
            prevT.diffW += w;
          }
          if (rawTotal === 0 && safeScore !== null) {
            prevT.directSum += safeScore;
            prevT.directCount += 1;
          }
          dailyStats[dk].topicsMap.set(tKey, prevT);
        }

        if (rawTotal === 0 && safeScore !== null) {
          dailyStats[dk].directScoreSum += safeScore;
          dailyStats[dk].directScoreCount += 1;
        } else {
          dailyStats[dk].correct += corrNorm;
          dailyStats[dk].total += rawTotal;
          dailyStats[dk].normalRowCount += 1;
        }
      });

      const rebuiltHistory = Object.entries(dailyStats).map(([date, stats]) => {
        let finalScore = minScore;
        const isPureDirect = stats.directScoreCount > 0 && stats.normalRowCount === 0;
        const dayEff = (!isPureDirect && stats.total > 0 && Number.isFinite(stats.correct))
          ? computeEffectiveScoreRatio(stats.correct, stats.total, {
              blanks: stats.blanks,
              penaltyPerWrong: stats.penaltyPerWrong,
              minScore,
              maxScore,
            })
          : null;
        if (isPureDirect) {
          finalScore = stats.directScoreSum / stats.directScoreCount;
        } else if (dayEff) {
          finalScore = minScore + dayEff.ratio * scoreRange;
        } else if (stats.directScoreCount > 0) {
          finalScore = stats.directScoreSum / stats.directScoreCount;
        }
        const clampedFinal = Math.min(maxScore, Math.max(minScore, finalScore));
        const synTotal = typeof getSyntheticTotal === 'function' ? getSyntheticTotal(maxScore) : 20;
        const outTotal = isPureDirect ? synTotal : stats.total;
        const outCorrect = isPureDirect
          ? Math.round(Math.max(0, Math.min(1, (clampedFinal - minScore) / scoreRange)) * synTotal)
          : stats.correct;
        const batchIdsArr = Array.from(stats.batchIds || []);
        const builtTopics = Array.from(stats.topicsMap.values()).map((td) => {
          const topEff = td.total > 0
            ? computeEffectiveScoreRatio(td.correct, td.total, {
                blanks: td.blanks,
                penaltyPerWrong: td.penaltyPerWrong,
                minScore: 0,
                maxScore: 100,
              })
            : null;
          const directAvg = td.directCount > 0 ? td.directSum / td.directCount : null;
          const pct = topEff
            ? Number((topEff.ratio * 100).toFixed(2))
            : (directAvg !== null ? Number((Math.max(0, Math.min(1, (directAvg - minScore) / scoreRange)) * 100).toFixed(2)) : 0);
          return {
            name: td.name,
            ...(td.taskId ? { taskId: td.taskId } : {}),
            correct: td.correct,
            total: td.total,
            ...(td.blanks > 0 ? { blanks: td.blanks } : {}),
            ...(topEff?.penaltyApplied ? { penaltyPerWrong: td.penaltyPerWrong } : {}),
            ...(td.total <= 0 && directAvg !== null ? { score: Number(directAvg.toFixed(2)), isPercentage: false } : {}),
            percentage: pct,
            ...(td.diffW > 0 ? { difficulty: Number((td.diffSum / td.diffW).toFixed(2)) } : {}),
            ...(td.timeSpent > 0 ? { timeSpent: td.timeSpent, timedQuestoes: td.timedQuestoes } : {}),
          };
        });
        return {
          date,
          correct: outCorrect,
          total: outTotal,
          score: clampedFinal,
          syntheticVolume: isPureDirect,
          ...(dayEff && dayEff.blanks > 0 ? { blanks: dayEff.blanks } : {}),
          ...(dayEff && dayEff.penaltyApplied ? { penaltyPerWrong: stats.penaltyPerWrong, netPoints: dayEff.netPoints } : {}),
          ...(stats.timeSpent > 0 ? { timeSpent: stats.timeSpent, timedQuestoes: stats.timedQuestoes } : {}),
          ...(stats.diffWeightTotal > 0 ? { difficulty: Number((stats.diffWeightSum / stats.diffWeightTotal).toFixed(2)) } : {}),
          ...(builtTopics.length > 0 ? { topics: builtTopics } : {}),
          ...(batchIdsArr.length > 0 ? { batchId: batchIdsArr[batchIdsArr.length - 1], batchIds: batchIdsArr } : {})
        };
      }).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

      if (rebuiltHistory.length >= currentHistory.length || currentHistory.length === 0) {
        cat.simuladoStats = computeCategorySimuladoStats(
          cat,
          rebuiltHistory,
          maxScore,
          minScore
        );
      } else {
        console.warn(`[Repair] Reconstrução produziria menos dados (${rebuiltHistory.length} < ${currentHistory.length}). Mantendo original.`);
      }
    }
  });

  if (hasRepaired) {
    data.lastUpdated = new Date().toISOString();
  }

  return data;
};


export const sanitizeContest = (data, contestId = '') => {
  if (!data || typeof data !== 'object') return { ...INITIAL_DATA };

  let source = (data.simuladoRows && data.simuladoRows.length > 0)
    ? repairContestHistory(data)
    : data;

  const isDireito = contestId === 'contest-7e146398-1fbf-48b6-904f-98d2f70d9f66';

  if (isDireito && (!source.categories || !Array.isArray(source.categories) || source.categories.length === 0)) {
    source = {
      ...source,
      contestName: 'Direito',
      user: { ...safeClone(RECOVERED_DIREITO_CONTEST.user), ...(source.user || {}) },
      categories: safeClone(RECOVERED_DIREITO_CONTEST.categories)
    };
  }

  const hasOptNum = (v) => v !== undefined && v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(Number(v));
  const contestMin = hasOptNum(source.minScore) ? Number(source.minScore) : 0;
  const contestMax = (hasOptNum(source.maxScore) && Number(source.maxScore) > contestMin)
    ? Number(source.maxScore)
    : Math.max(contestMin + 1, 100);
  const scaleDefaultTarget = (contestMin === 0 && contestMax === 100)
    ? DEFAULT_TARGET_SCORE
    : Math.round(contestMin + 0.75 * (contestMax - contestMin));

  // FORTRESS-01: Defensive initialization for all top-level keys
  return {
    user: {
      ...(source.user && typeof source.user === 'object' ? source.user : {}),
      name: source.user?.name || "Estudante",
      avatar: source.user?.avatar || "👤",
      startDate: source.user?.startDate || getDateKey(new Date()),
      goalDate: source.user?.goalDate || null,
      targetScore: (source.user?.targetScore != null && source.user?.targetScore !== '' && typeof source.user?.targetScore !== 'boolean' && Number.isFinite(Number(source.user.targetScore)))
        ? Number(source.user.targetScore)
        : scaleDefaultTarget,
      xp: Number.isFinite(Number(source.user?.xp)) ? Math.max(0, Number(source.user.xp)) : 0,
      level: Number.isFinite(Number(source.user?.level)) ? Math.max(1, Math.floor(Number(source.user.level))) : 1,
      achievements: (Array.isArray(source.user?.achievements) ? source.user.achievements : [])
        .map(a => typeof a === 'string' ? a : a?.id)
        .filter(Boolean),
      studiedEarly: Boolean(source.user?.studiedEarly),
      studiedLate: Boolean(source.user?.studiedLate),
      targetProbability: (source.user?.targetProbability != null && Number.isFinite(Number(source.user.targetProbability)))
        ? Math.max(0, Math.min(100, Number(source.user.targetProbability)))
        : 70
      },
    ...(source.maxScore !== undefined && source.maxScore !== null && Number.isFinite(Number(source.maxScore))
      ? { maxScore: Number(source.maxScore) }
      : {}),
    ...(source.minScore !== undefined && source.minScore !== null && Number.isFinite(Number(source.minScore))
      ? { minScore: Number(source.minScore) }
      : {}),
    ...(source.examDurationMinutes !== undefined && source.examDurationMinutes !== null && Number.isFinite(Number(source.examDurationMinutes)) && Number(source.examDurationMinutes) > 0
      ? { examDurationMinutes: Number(source.examDurationMinutes) }
      : {}),
    ...(source.examTotalQuestions !== undefined && source.examTotalQuestions !== null && Number.isFinite(Number(source.examTotalQuestions)) && Number(source.examTotalQuestions) > 0
      ? { examTotalQuestions: Math.round(Number(source.examTotalQuestions)) }
      : {}),
    ...(typeof source.examBoard === 'string' && source.examBoard.trim()
      ? { examBoard: source.examBoard.trim().slice(0, 40) }
      : {}),
    ...(source.penaltyPerWrong !== undefined && source.penaltyPerWrong !== null && Number.isFinite(Number(source.penaltyPerWrong)) && Number(source.penaltyPerWrong) >= 0
      ? { penaltyPerWrong: Math.min(2, Number(source.penaltyPerWrong)) }
      : {}),
    ...(source.examGroupCutoffs && typeof source.examGroupCutoffs === 'object' && !Array.isArray(source.examGroupCutoffs)
      ? { examGroupCutoffs: source.examGroupCutoffs }
      : {}),
    ...(source.coachFeatureFlags && typeof source.coachFeatureFlags === 'object' && !Array.isArray(source.coachFeatureFlags)
      ? {
          coachFeatureFlags: Object.fromEntries(
            Object.entries(source.coachFeatureFlags).filter(([k, v]) => typeof k === 'string' && typeof v === 'boolean')
          )
        }
      : {}),
    ...(source.coachManualFlagOverrides && typeof source.coachManualFlagOverrides === 'object' && !Array.isArray(source.coachManualFlagOverrides)
      ? {
          coachManualFlagOverrides: Object.fromEntries(
            Object.entries(source.coachManualFlagOverrides).filter(([k, v]) => typeof k === 'string' && typeof v === 'boolean')
          )
        }
      : {}),
    coachPlan: Array.isArray(source.coachPlan)
      ? source.coachPlan
      : (typeof source.coachPlan === 'object' && source.coachPlan !== null)
        ? Object.values(source.coachPlan)
        : [],
    calibrationMetrics: (source.calibrationMetrics && typeof source.calibrationMetrics === 'object' && !Array.isArray(source.calibrationMetrics)) ? source.calibrationMetrics : {},
    calibrationHistoryByCategory: (source.calibrationHistoryByCategory && typeof source.calibrationHistoryByCategory === 'object' && !Array.isArray(source.calibrationHistoryByCategory))
      ? Object.fromEntries(
          Object.entries(source.calibrationHistoryByCategory).map(([catKey, hist]) => [
            catKey,
            Array.isArray(hist) ? hist.filter(e => e && typeof e === 'object').slice(-100) : []
          ])
        )
      : {},
    calibrationOps: (source.calibrationOps && typeof source.calibrationOps === 'object' && !Array.isArray(source.calibrationOps)) ? source.calibrationOps : {},
    calibrationAuditLog: Array.isArray(source.calibrationAuditLog)
      ? source.calibrationAuditLog.filter(e => e && typeof e === 'object').slice(-150)
      : [],
    coachScore: (source.coachScore !== null && source.coachScore !== undefined && (
      (typeof source.coachScore === 'object' && !Array.isArray(source.coachScore)) ||
      (typeof source.coachScore === 'number' && Number.isFinite(source.coachScore))
    )) ? source.coachScore : null,
    coachPlanner: (source.coachPlanner && typeof source.coachPlanner === 'object')
      ? source.coachPlanner
      : { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
    categories: (Array.isArray(source.categories) ? source.categories : Object.values(source.categories || {})).filter(cat => cat && typeof cat === 'object').map(cat => {
      const catMin = (cat.minScore !== undefined && cat.minScore !== null && Number.isFinite(Number(cat.minScore)))
        ? Number(cat.minScore)
        : ((source?.minScore !== undefined && Number.isFinite(Number(source.minScore))) ? Number(source.minScore) : 0);
      const catMaxRaw = Number(cat.maxScore) || Number(source?.maxScore) || 100;
      const catMax = Math.max(catMin + 1e-9, catMaxRaw);
      const scoreRange = Math.max(1e-9, catMax - catMin);

      const rawTasks = (Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {})).filter(t => t && typeof t === 'object').map(t => ({
        id: t.id || generateId('task'),
        text: t.text || t.title || t.topic || "Nova Tarefa",
        title: t.title || t.text || t.topic || "Nova Tarefa",
        ...(t.topic ? { topic: String(t.topic) } : {}),
        ...(t.topicName ? { topicName: String(t.topicName) } : {}),
        completed: Boolean(t.completed),
        completedAt: t.completedAt || null,
        lastStudiedAt: t.lastStudiedAt || null,
        ...(t.createdAt ? { createdAt: t.createdAt } : {}),
        ...(t.updatedAt ? { updatedAt: t.updatedAt } : {}),
        ...(t.lastUpdated ? { lastUpdated: t.lastUpdated } : {}),
        priority: normalizePriority(t.priority || "medium"),
        ...(t.notes ? { notes: String(t.notes) } : {}),
        ...(t.awardedXP != null && Number.isFinite(Number(t.awardedXP)) ? { awardedXP: Number(t.awardedXP) } : {}),
        ...(t.status ? { status: t.status } : {})
      })).filter(t => t.id && (t.text || t.title));

      const seenTaskNames = new Set();
      const dedupedTasks = rawTasks.filter(t => {
        const normName = normalize(t.text || t.title || '');
        if (seenTaskNames.has(normName)) return false;
        seenTaskNames.add(normName);
        return true;
      });

      // Deep sanitize simulado history and reconcile stats
      const rawHistory = (Array.isArray(cat.simuladoStats?.history)
        ? cat.simuladoStats.history
        : Object.values(cat.simuladoStats?.history || {}))
        .filter(h => h && typeof h === 'object' && (h.date || h.createdAt));

      const cleanHistory = rawHistory
        .map(h => normalizeHistoryEntry(h, catMax, catMin))
        .sort((a, b) => {
          const da = toDateMs(a.date || a.createdAt);
          const db = toDateMs(b.date || b.createdAt);
          return (Number.isFinite(da) ? da : 0) - (Number.isFinite(db) ? db : 0);
        });

      let average = Number(cat.simuladoStats?.average);
      const reconciledStats = cleanHistory.length > 0
        ? computeCategorySimuladoStats(
            { ...cat, minScore: catMin, maxScore: catMax },
            cleanHistory,
            catMax,
            catMin
          )
        : null;

      if (reconciledStats) {
        average = reconciledStats.averagePerExam;
      } else if (
        !Number.isFinite(average) ||
        average < catMin ||
        average > catMax
      ) {
        average = Number.isFinite(average)
          ? Math.min(catMax, Math.max(catMin, average))
          : catMin;
      }

      let lastAttempt = Number(cat.simuladoStats?.lastAttempt);
      if (reconciledStats) {
        lastAttempt = reconciledStats.lastAttempt;
      } else if (
        !Number.isFinite(lastAttempt) ||
        lastAttempt < catMin ||
        lastAttempt > catMax
      ) {
        lastAttempt = Number.isFinite(lastAttempt)
          ? Math.min(catMax, Math.max(catMin, lastAttempt))
          : catMin;
      }

      let level = reconciledStats?.level || cat.simuladoStats?.level;
      if (!level) {
        level = average >= (catMin + 0.7 * scoreRange)
          ? 'ALTO'
          : average >= (catMin + 0.4 * scoreRange)
            ? 'MÉDIO'
            : 'BAIXO';
      }
      const trend = reconciledStats?.trend || cat.simuladoStats?.trend || 'stable';

      const hasExplicitMinCutoff = cat.minCutoff !== undefined &&
        cat.minCutoff !== null &&
        cat.minCutoff !== '' &&
        typeof cat.minCutoff !== 'boolean' &&
        Number.isFinite(Number(cat.minCutoff));

      return {
        id: cat.id || generateId('cat'),
        name: cat.name || "Sem Nome",
        color: normalizeHexColor(cat.color, "#3b82f6"),
        icon: cat.icon || "📚",
        tasks: dedupedTasks,
        weight: (cat.weight !== undefined && cat.weight !== null && Number.isFinite(Number(cat.weight))) ? Math.max(0, Number(cat.weight)) : 10,
        maxScore: catMax,
        minScore: catMin,
        minCutoff: hasExplicitMinCutoff ? Math.max(catMin, Math.min(catMax, Number(cat.minCutoff))) : null,
        ...(typeof cat.examGroup === 'string' && cat.examGroup.trim() ? { examGroup: cat.examGroup.trim().slice(0, 40) } : {}),
        level: Number(cat.level) || 0,
        totalMinutes: Number(cat.totalMinutes) || 0,
        lastStudiedAt: cat.lastStudiedAt || null,
        ...(cat.createdAt ? { createdAt: cat.createdAt } : {}),
        ...(cat.updatedAt ? { updatedAt: cat.updatedAt } : {}),
        ...(cat.lastUpdated ? { lastUpdated: cat.lastUpdated } : {}),
        ...(cat.flashcardReviews != null && Number.isFinite(Number(cat.flashcardReviews)) ? { flashcardReviews: Math.max(0, Number(cat.flashcardReviews)) } : {}),
        ...(cat.lastFlashcardReview ? { lastFlashcardReview: cat.lastFlashcardReview } : {}),
        ...(cat.flashcardCorrect != null && Number.isFinite(Number(cat.flashcardCorrect)) ? { flashcardCorrect: Math.max(0, Number(cat.flashcardCorrect)) } : {}),
        ...(Array.isArray(cat.deletedTaskIds) && cat.deletedTaskIds.length > 0 ? { deletedTaskIds: cat.deletedTaskIds.slice(-100) } : {}),
        ...(cat.knowledgeGraph && typeof cat.knowledgeGraph === 'object' ? { knowledgeGraph: cat.knowledgeGraph } : {}),
        ...(cat.prerequisites && typeof cat.prerequisites === 'object' ? { prerequisites: cat.prerequisites } : {}),
        ...(Array.isArray(cat.graphEdges) ? { graphEdges: cat.graphEdges } : {}),
        ...(cat.bayesianStats && typeof cat.bayesianStats === 'object' ? { bayesianStats: cat.bayesianStats } : {}),
        simuladoStats: {
          history: cleanHistory,
          average,
          ...(reconciledStats
            ? {
                averagePerExam: reconciledStats.averagePerExam,
                averagePerQuestion: reconciledStats.averagePerQuestion
              }
            : {}),
          lastAttempt,
          trend,
          level: String(level).toUpperCase() === 'MEDIO' ? 'MÉDIO' : String(level).toUpperCase()
        }
      };
    }),
    simuladoRows: (Array.isArray(source.simuladoRows) ? source.simuladoRows : Object.values(source.simuladoRows || {})).filter(r => r && r.id),
    simulados: (Array.isArray(source.simulados) ? source.simulados : Object.values(source.simulados || {})).filter(s => s && s.id),
    studyLogs: (Array.isArray(source.studyLogs) ? source.studyLogs : Object.values(source.studyLogs || {}))
      .filter(l => l && typeof l === 'object')
      .map(l => ({
        ...l,
        id: String(l.id || generateId('log')),
        minutes: Math.min(720, Math.max(0, Number(l.minutes ?? l.minutos) || 0)),
        date: l.date || l.createdAt || new Date().toISOString()
      })),
    studySessions: (Array.isArray(source.studySessions) ? source.studySessions : Object.values(source.studySessions || {}))
      .filter(s => s && typeof s === 'object')
      .map(s => ({
        ...s,
        id: String(s.id || generateId('session')),
        duration: Math.min(720, Math.max(0, Number(s.duration) || 0)),
        startTime: s.startTime || s.date || new Date().toISOString()
      })),
    notes: typeof source.notes === 'string' ? source.notes : "",
    // NEW TOOLS
    flashcardDecks: Array.isArray(source.flashcardDecks) ? source.flashcardDecks : [],
    agenda: Array.isArray(source.agenda) ? source.agenda : [],
    studyNotes: Array.isArray(source.studyNotes) ? source.studyNotes : [],
    ...(Array.isArray(source.deletedFlashcardDeckIds) && source.deletedFlashcardDeckIds.length > 0
      ? { deletedFlashcardDeckIds: source.deletedFlashcardDeckIds.slice(-100) }
      : {}),
    ...(Array.isArray(source.deletedAgendaIds) && source.deletedAgendaIds.length > 0
      ? { deletedAgendaIds: source.deletedAgendaIds.slice(-100) }
      : {}),
    ...(Array.isArray(source.deletedStudyNoteIds) && source.deletedStudyNoteIds.length > 0
      ? { deletedStudyNoteIds: source.deletedStudyNoteIds.slice(-100) }
      : {}),
    // Math / Calibration history (lightweight for continuous calibration)
    calibrationEvents: Array.isArray(source.calibrationEvents) ? source.calibrationEvents.slice(-200) : [], // keep last 200 for walk-forward
    settings: {
      ...(source.settings && typeof source.settings === 'object' && !Array.isArray(source.settings) ? source.settings : {}),
      darkMode: source.settings?.darkMode ?? true,
      soundEnabled: source.settings?.soundEnabled ?? true,
      pomodoroWork: Number(source.settings?.pomodoroWork) || 25,
      pomodoroBreak: Number(source.settings?.pomodoroBreak) || 5,
      pomodoroLongBreak: Number(source.settings?.pomodoroLongBreak) || 15,
      longBreakAfter: Number(source.settings?.longBreakAfter) || 4,
      sessions: Number(source.settings?.sessions) || 0,
      completedCycles: Number(source.settings?.completedCycles) || 0,
      adaptiveCalibrationEnabled: source.settings?.adaptiveCalibrationEnabled ?? true,
    },
    mcWeights: (source.mcWeights && typeof source.mcWeights === 'object') ? source.mcWeights : {},
    ...(typeof source.mcEqualWeights === 'boolean' ? { mcEqualWeights: source.mcEqualWeights } : {}),
    mcSavedCustomWeights: (source.mcSavedCustomWeights && typeof source.mcSavedCustomWeights === 'object' && !Array.isArray(source.mcSavedCustomWeights))
      ? source.mcSavedCustomWeights
      : {},
    historicalCutoffs: (Array.isArray(source.historicalCutoffs) ? source.historicalCutoffs : Object.values(source.historicalCutoffs || {}))
      .filter(v => v !== null && v !== undefined && v !== '' && typeof v !== 'boolean')
      .map(Number)
      .filter(n => Number.isFinite(n)),
    ...(source.historicalCutoffsUpdatedAt ? { historicalCutoffsUpdatedAt: source.historicalCutoffsUpdatedAt } : {}),
    // BUG-10 REVERSION: monteCarloHistory MUST be an Array for charts and slices to work.
    // Migration: If it's an object (legacy), convert it to an array of {date, probability}.
    monteCarloHistory: (() => {
      const raw = source.monteCarloHistory;
      const arr = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object'
          ? Object.entries(raw).map(([date, data]) => ({
            date,
            probability: typeof data === 'object' ? data?.probability : data,
            ...(typeof data === 'object' ? data : {})
          }))
          : []);

      return arr
        .filter(item => item && typeof item === 'object' && item.date)
        .map(item => ({
          ...item,
          date: String(item.date).trim(),
          probability: Number.isFinite(Number(item.probability))
            ? Math.max(0, Math.min(100, Number(item.probability)))
            : 0
        }))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    })(),
    contestName: (typeof source.contestName === 'string' && source.contestName.trim())
      || (typeof source.name === 'string' && source.name.trim())
      || (typeof source.user?.name === 'string' && source.user.name.trim())
      || "Novo Concurso",
    ...(typeof source.unit === 'string' && source.unit.trim() ? { unit: source.unit.trim() } : {}),
    ...(source.pomodorosCompleted != null && Number.isFinite(Number(source.pomodorosCompleted))
      ? { pomodorosCompleted: Math.max(0, Number(source.pomodorosCompleted)) }
      : {}),
    ...(source.lastPomodoroDate ? { lastPomodoroDate: source.lastPomodoroDate } : {}),
    lastUpdated: (source.lastUpdated && !isNaN(new Date(source.lastUpdated).getTime())) ? source.lastUpdated : new Date().toISOString(),
  };
};

export const extractCore = (obj, depth = 0) => {
  if (depth > 5 || !obj || typeof obj !== 'object') return null;
  if (obj.contests || (obj.categories && Array.isArray(obj.categories))) return obj;
  if (obj.appState) return extractCore(obj.appState, depth + 1);
  if (obj.state) return extractCore(obj.state, depth + 1);
  return null;
};

export const validateAppState = (data) => {
  try {
    if (!data) return { contests: { 'default': INITIAL_DATA }, activeId: 'default', lastUpdated: null };

    let coreData = extractCore(data);
    let d = coreData || data;

    // Migração de formato Legado (único concurso) para Multi-Concurso
    if (d.categories && !d.contests) {
      const contestData = { ...d };
      d = {
        contests: { 'default': contestData },
        activeId: 'default',
        lastUpdated: d.lastUpdated ?? null
      };
    }

    const validatedContests = {};
    const rawContests = (d.contests && typeof d.contests === 'object') ? d.contests : { 'default': INITIAL_DATA };

    const sanitizeContestKey = (key) =>
      String(key).replace(/[.#$/\\[\]]/g, '').trim() || 'default';

    // ✅ PATCH 11 FIX: Sanitização das chaves do dicionário para assegurar formato adequado para Firebase e IndexedDB
    Object.keys(rawContests).forEach((id) => {
      // ✅ Filtrar chaves inválidas ANTES de sanitizar
      if (id === 'length' || !rawContests[id] || typeof rawContests[id] !== 'object') return;
      const cleanId = sanitizeContestKey(id);
      const sanitized = sanitizeContest(rawContests[id], cleanId);
      if (sanitized) {
        validatedContests[cleanId] = sanitized;
      }
    });

    const rawTrash = Array.isArray(d.trash)
      ? d.trash
      : (d.trash && typeof d.trash === 'object' ? Object.values(d.trash) : []);
    const rawDeletedContestIds = Array.isArray(d.deletedContestIds) ? d.deletedContestIds : [];

    // Identificar concursos deletados explicitamente pelo usuário (não por auto-trash de sync)
    const explicitUserDeletedIds = new Set();
    rawTrash.forEach((item) => {
      if (item && item.type === 'contest' && item.contestId && item.reason !== 'cloud-sync') {
        explicitUserDeletedIds.add(sanitizeContestKey(item.contestId));
      }
    });
    rawDeletedContestIds.forEach((entry) => {
      const cid = typeof entry === 'string' ? entry : entry?.contestId;
      if (cid) explicitUserDeletedIds.add(sanitizeContestKey(cid));
    });

    // Resgatar automaticamente concursos que foram movidos indevidamente para a lixeira por 'cloud-sync'
    const rescuedTrashItemIds = new Set();
    rawTrash.forEach((item) => {
      if (!item || item.type !== 'contest' || item.reason !== 'cloud-sync' || !item.data) return;
      const cleanId = sanitizeContestKey(item.contestId || item.data?.id || generateId('contest'));
      if (!explicitUserDeletedIds.has(cleanId) && !validatedContests[cleanId]) {
        const sanitized = sanitizeContest(item.data, cleanId);
        if (sanitized) {
          validatedContests[cleanId] = sanitized;
          if (item.id) rescuedTrashItemIds.add(item.id);
        }
      } else if (!explicitUserDeletedIds.has(cleanId) && validatedContests[cleanId]) {
        // Já existe em contests — remover duplicata fantasma de cloud-sync da lixeira
        if (item.id) rescuedTrashItemIds.add(item.id);
      }
    });

    if (Object.keys(validatedContests).length === 0) {
      validatedContests['default'] = sanitizeContest(INITIAL_DATA, 'default');
    }

    let activeId = d.activeId || 'default';

    // C4 FIX: Removed silent auto-redirect to 'Direito' to prevent unexpected focus loss.

    if (!validatedContests[activeId]) activeId = Object.keys(validatedContests)[0] || 'default';

    const dedupDeletedMap = new Map();
    rawDeletedContestIds.forEach((entry) => {
      const rawCid = typeof entry === 'string' ? entry : entry?.contestId;
      if (!rawCid) return;
      const cid = sanitizeContestKey(rawCid);
      if (validatedContests[cid]) return; // Concurso ativo não pode permanecer marcado como deletado
      const deletedAtIso = (entry && typeof entry === 'object' && entry.deletedAt && !isNaN(new Date(entry.deletedAt).getTime()))
        ? entry.deletedAt
        : new Date().toISOString();
      const deletedAtMs = new Date(deletedAtIso).getTime();
      if ((Date.now() - deletedAtMs) / (1000 * 60 * 60 * 24) > 90) return;
      const prev = dedupDeletedMap.get(cid);
      if (!prev || new Date(prev.deletedAt).getTime() < deletedAtMs) {
        dedupDeletedMap.set(cid, { contestId: cid, deletedAt: deletedAtIso });
      }
    });

    const finalState = {
      contests: validatedContests,
      activeId: activeId,
      dashboardFilter: d.dashboardFilter || 'all',
      pomodoro: {
        ...(d.pomodoro && typeof d.pomodoro === 'object' ? d.pomodoro : {}),
        isRunning: Boolean(d.pomodoro?.isRunning),
        activeSubject: d.pomodoro?.activeSubject || null,
        targetCycles: Math.max(1, Number(d.pomodoro?.targetCycles) || 1),
        mode: ['work', 'break', 'long_break'].includes(d.pomodoro?.mode) ? d.pomodoro.mode : 'work',
        sessions: Math.max(1, Number(d.pomodoro?.sessions) || 1),
        completedCycles: Math.max(0, Number(d.pomodoro?.completedCycles) || 0),
        accumulatedMinutes: Math.max(0, Number(d.pomodoro?.accumulatedMinutes) || 0),
        neuralMode: Boolean(d.pomodoro?.neuralMode),
        neuralQueue: Array.isArray(d.pomodoro?.neuralQueue) ? d.pomodoro.neuralQueue : [],
      },

      history: Array.isArray(d.history) ? d.history : [],
      trash: rawTrash.filter(item => {
        if (!item) return false;
        if (item.id && rescuedTrashItemIds.has(item.id)) return false;
        if (item.type === 'contest' && item.reason === 'cloud-sync' && !explicitUserDeletedIds.has(sanitizeContestKey(item.contestId || ''))) {
          return false;
        }

        const parsedDeletedAt = item.deletedAt ? new Date(item.deletedAt) : null;
        const deletedAt = parsedDeletedAt && !isNaN(parsedDeletedAt.getTime())
          ? parsedDeletedAt
          : new Date();

        return (new Date() - deletedAt) / (1000 * 60 * 60 * 24) <= 30;
      }),
      deletedContestIds: Array.from(dedupDeletedMap.values()).slice(-50),
      hasSeenTour: Boolean(d.hasSeenTour),
      lastSeenTourDate: typeof d.lastSeenTourDate === 'string' ? d.lastSeenTourDate : '',
      lastHistoryTime: Number(d.lastHistoryTime) || 0,
      version: Number(d.version) || 0,
      mcEqualWeights: d.mcEqualWeights ?? true,
      lastUpdated: d.lastUpdated ?? null
    };


    return finalState;
  } catch (err) {
    console.error("[Validate] Erro catastrófico, retornando inicial:", err);
    return { contests: { 'default': safeClone(INITIAL_DATA) }, activeId: 'default', lastUpdated: null };
  }
};

