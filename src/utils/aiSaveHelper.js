import { getDateKey, normalizeDate } from './dateHelper.js';
import { generateId } from './idGenerator.js';
import { normalize, isSubjectMatch } from './normalization.js';
import { computeCategorySimuladoStats, DEFAULT_SIMULADO_HISTORY_CAP, resolveCategoryScoreDomain } from './simuladoReconciler.js';
import { computeEffectiveScoreRatio, mergeQuestionResult, safeDomain } from './measurement.js';

export { computeEffectiveScoreRatio };

function safeArray(val) {
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') return Object.values(val);
    return [];
}

export function applyAIResultsToDraft(draft, formData, correct, total, timeSpentSecs, preventGlobalEvent, batchId) {
  if (!draft || typeof draft !== 'object') return;
  const todayKey = getDateKey(normalizeDate(new Date()));
  const materia = (formData.materia || '').trim();
  const assunto = (formData.assunto || '').trim();
  const categoryId = formData.categoryId || null;
  const taskId = formData.taskId || null;
  const assignedBatchId = batchId || formData?.batchId || generateId('batch');
  const domain = safeDomain(Number(draft.maxScore) || 100, Number(draft.minScore) || 0);
  const categoriesList = safeArray(draft.categories);
  const matchedCat = categoriesList.find(c => {
    if (!c) return false;
    const idMatch = categoryId && c.id === categoryId;
    return idMatch || (!categoryId && isSubjectMatch(c.name, materia));
  });
  const catResolved = matchedCat ? resolveCategoryScoreDomain(matchedCat, domain.max, domain.min) : null;
  const rowDomain = catResolved ? { min: catResolved.minScore, max: catResolved.maxScore, range: catResolved.range } : domain;

  const penaltyPerWrong = Math.max(0, Number(draft.penaltyPerWrong ?? formData?.penaltyPerWrong) || 0);
  const inferredBlanks = Number.isFinite(Number(formData?.blanks))
    ? Math.max(0, Number(formData.blanks))
    : (Array.isArray(formData?.questionTelemetry)
      ? formData.questionTelemetry.filter((q) => q && q.wasAnswered === false).length
      : 0);

  const effectiveScore = computeEffectiveScoreRatio(correct, total, {
    blanks: inferredBlanks,
    penaltyPerWrong,
    minScore: rowDomain.min,
    maxScore: rowDomain.max,
  });
  const ratio = effectiveScore.ratio;
  const computedScore = Math.round(ratio * 100);
  const diffMap = { facil: 0.7, medio: 1.0, dificil: 1.3, expert: 1.6 };
  const numericDifficulty = diffMap[formData.dificuldade] || 1.0;

  const newRow = {
    id: generateId('ai-row'),
    batchId: assignedBatchId,
    subject: materia,
    topic: assunto,
    categoryId,
    taskId,
    correct,
    total,
    ...(inferredBlanks > 0 ? { blanks: effectiveScore.blanks } : {}),
    ...(effectiveScore.penaltyApplied ? { netPoints: effectiveScore.netPoints, penaltyPerWrong } : {}),
    score: computedScore,
    scorePct: ratio * 100,
    scorePoints: rowDomain.min + ratio * rowDomain.range,
    date: todayKey,
    createdAt: new Date().toISOString(),
    isAuto: false,
    validated: true,
    source: 'ai-generated',
    difficulty: numericDifficulty,
    timeSpent: timeSpentSecs,
    isPercentage: true,
    ...(Array.isArray(formData?.questionTelemetry) && formData.questionTelemetry.length > 0
      ? { questionTelemetry: formData.questionTelemetry.slice(0, 60) }
      : {}),
  };

  if (!draft.simuladoRows || !Array.isArray(draft.simuladoRows)) {
    draft.simuladoRows = safeArray(draft.simuladoRows);
  }

  let rowFound = false;
  for (const r of draft.simuladoRows) {
    if (!r.isAuto && r.source !== 'ai-generated') continue;
    if (getDateKey(normalizeDate(r.date || r.createdAt)) !== todayKey) continue;
    const isCatMatch = (categoryId && r.categoryId)
      ? r.categoryId === categoryId
      : isSubjectMatch(r.subject, materia);
    const isTaskOrTopicMatch = (taskId && r.taskId)
      ? r.taskId === taskId
      : normalize(r.topic) === normalize(assunto);
    const hasExplicitBatch = Boolean(r.batchId || batchId || formData?.batchId);
    const isSameBatch = hasExplicitBatch ? (r.batchId === assignedBatchId) : true;
    if (isCatMatch && isTaskOrTopicMatch && isSameBatch) {
      rowFound = true;
      const updatedRow = mergeQuestionResult(
        r,
        {
          correct,
          total,
          blanks: effectiveScore.blanks,
          penaltyPerWrong,
          timeSpentSecs,
          questionTelemetry: formData?.questionTelemetry,
          isDelta: true,
        },
        rowDomain.max,
        rowDomain.min
      );
      Object.assign(r, updatedRow);
      r.lastUpdated = new Date().toISOString();
    }
  }
  if (!rowFound) {
    draft.simuladoRows.push(newRow);
  }

  if (!preventGlobalEvent) {
      if (!draft.simulados || !Array.isArray(draft.simulados)) {
        draft.simulados = safeArray(draft.simulados);
      }
      const newSimEvent = {
        id: generateId('ai-sim'),
        batchId: assignedBatchId,
        date: todayKey,
        scorePoints: rowDomain.min + ratio * rowDomain.range,
        scorePct: ratio * 100,
        score: rowDomain.min + ratio * rowDomain.range,
        total,
        correct,
        type: 'ai-simulado',
        subject: materia,
        categoryId,
        taskId,
        validated: true,
        scoreUnit: 'points',
        isPercentage: false,
      };
      draft.simulados.push(newSimEvent);
      if (draft.simulados.length > DEFAULT_SIMULADO_HISTORY_CAP) {
          draft.simulados = draft.simulados.slice(-DEFAULT_SIMULADO_HISTORY_CAP);
      }
  }

  for (const cat of categoriesList) {
    if (!cat) continue;
    const idMatch = categoryId && cat.id === categoryId;
    const nameMatch = !idMatch && isSubjectMatch(cat.name, materia);
    
    if (idMatch || nameMatch) {
      const { maxScore: catMaxScore, minScore: catMinScore, range: catScoreRange } = resolveCategoryScoreDomain(
        cat,
        draft.maxScore,
        draft.minScore
      );
      
      if (!cat.simuladoStats) {
         cat.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
      }
      if (!Array.isArray(cat.simuladoStats.history)) {
         cat.simuladoStats.history = Object.values(cat.simuladoStats.history || {}).filter(Boolean);
      }
      let history = cat.simuladoStats.history;

      const todayIdx = history.findIndex(h => getDateKey(normalizeDate(h?.date || h?.createdAt)) === todayKey);
      const newTopicEntry = { name: assunto, correct, total, taskId, timeSpent: timeSpentSecs, difficulty: numericDifficulty };

      if (todayIdx !== -1) {
        const existing = history[todayIdx];
        let topicFound = false;
        
        if (!Array.isArray(existing.topics)) existing.topics = [];
        
        for (const t of existing.topics) {
          const isMatch = (taskId && t.taskId && t.taskId === taskId) || (normalize(t.name) === normalize(assunto));
          if (isMatch) {
              topicFound = true;
              if (taskId && !t.taskId) t.taskId = taskId;
              const newTTotal = (Number(t.total) || 0) + total;
              const newTCorrect = (Number(t.correct) || 0) + correct;
              const prevTWeight = (Number(t.difficulty) || 1.0) * (Number(t.total) || 0);
              const newTWeight = numericDifficulty * total;
              
              t.correct = newTCorrect;
              t.total = newTTotal;
              t.difficulty = newTTotal > 0 ? (prevTWeight + newTWeight) / newTTotal : 1.0;
              t.timeSpent = (Number(t.timeSpent) || 0) + timeSpentSecs;
          }
        }
        
        if (!topicFound) {
          existing.topics.push(newTopicEntry);
        }

        const prevTotal = Number(existing.total) || 0;
        const hasPrevCorrect = existing.correct !== undefined && existing.correct !== null && existing.correct !== '';
        let prevCorrect = hasPrevCorrect ? (Number(existing.correct) || 0) : 0;
        if (!hasPrevCorrect && prevTotal > 0 && Number.isFinite(Number(existing.score))) {
          const prevRatio = existing.isPercentage
            ? Math.max(0, Math.min(1, Number(existing.score) / 100))
            : Math.max(0, Math.min(1, (Number(existing.score) - catMinScore) / Math.max(1e-9, catScoreRange)));
          prevCorrect = Math.round(prevRatio * prevTotal);
        }
        const dayTotal = prevTotal + total;
        const dayCorrect = prevCorrect + correct;
        const dayBlanks = (Number(existing.blanks) || 0) + effectiveScore.blanks;
        const dayTimeSpent = (Number(existing.timeSpent) || 0) + timeSpentSecs;
        const dayTimedQuestoes = (Number(existing.timedQuestoes) || 0) + (timeSpentSecs > 0 ? total : 0);

        const prevWeight = (existing.difficulty || 1.0) * (existing.total || 0);
        const newWeight = numericDifficulty * total;
        const newDiff = dayTotal > 0 ? (prevWeight + newWeight) / dayTotal : 1.0;
        const dayEff = computeEffectiveScoreRatio(dayCorrect, dayTotal, {
          blanks: dayBlanks,
          penaltyPerWrong,
          minScore: catMinScore,
          maxScore: catMaxScore,
        });

        existing.correct = dayCorrect;
        existing.total = dayTotal;
        if (dayBlanks > 0) existing.blanks = dayBlanks;
        existing.isPercentage = false;
        existing.score = dayTotal > 0 ? Math.min(catMaxScore, Math.max(catMinScore, catMinScore + dayEff.ratio * catScoreRange)) : catMinScore;
        existing.difficulty = newDiff;
        existing.timeSpent = dayTimeSpent;
        existing.timedQuestoes = dayTimedQuestoes;
        existing.lastSessionTimeSpent = timeSpentSecs;
        existing.lastSessionTotal = total;
        const prevBatchIds = Array.isArray(existing.batchIds)
          ? existing.batchIds
          : (existing.batchId ? [existing.batchId] : []);
        existing.batchId = assignedBatchId;
        existing.batchIds = Array.from(new Set([...prevBatchIds, assignedBatchId]));
        
      } else {
        const entryEff = computeEffectiveScoreRatio(correct, total, {
          blanks: effectiveScore.blanks,
          penaltyPerWrong,
          minScore: catMinScore,
          maxScore: catMaxScore,
        });
        history.push({
          id: generateId('ai-hist'),
          batchId: assignedBatchId,
          batchIds: [assignedBatchId],
          date: todayKey,
          correct,
          total,
          ...(effectiveScore.blanks > 0 ? { blanks: effectiveScore.blanks } : {}),
          isPercentage: false,
          timeSpent: timeSpentSecs,
          timedQuestoes: timeSpentSecs > 0 ? total : 0,
          lastSessionTimeSpent: timeSpentSecs,
          lastSessionTotal: total,
          score: total > 0 ? Math.min(catMaxScore, Math.max(catMinScore, catMinScore + entryEff.ratio * catScoreRange)) : catMinScore,
          difficulty: formData.dificuldade === 'facil' ? 0.7 : formData.dificuldade === 'medio' ? 1.0 : formData.dificuldade === 'dificil' ? 1.3 : 1.6,
          topics: [newTopicEntry],
        });
      }

      cat.simuladoStats = computeCategorySimuladoStats(
        cat,
        history,
        draft.maxScore,
        draft.minScore,
        { maxHistory: DEFAULT_SIMULADO_HISTORY_CAP }
      );
    }
  }

  draft.lastUpdated = new Date().toISOString();
}
