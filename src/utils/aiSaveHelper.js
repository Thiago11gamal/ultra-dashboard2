import { getDateKey, normalizeDate } from './dateHelper.js';
import { generateId } from './idGenerator.js';
import { normalize } from './normalization.js';
import { computeCategoryStats } from '../engine/index.js';

export function applyAIResultsToDraft(draft, formData, correct, total, timeSpentSecs, preventGlobalEvent) {
    const todayKey = getDateKey(normalizeDate(new Date()));
    const materia = (formData.materia || '').trim();
    const assunto = (formData.assunto || '').trim();
    const categoryId = formData.categoryId || null;
    const taskId = formData.taskId || null;

    const computedScore = total > 0 ? Math.round((correct / total) * 100) : 0;
    const diffMap = { facil: 0.7, medio: 1.0, dificil: 1.3, expert: 1.6 };
    const numericDifficulty = diffMap[formData.dificuldade] || 1.0;

    const newRow = {
      id: generateId('ai-row'),
      subject: materia,
      topic: assunto,
      categoryId,
      taskId,
      correct,
      total,
      score: computedScore,
      date: todayKey,
      createdAt: new Date().toISOString(),
      isAuto: false,
      validated: true,
      source: 'ai-generated',
      difficulty: numericDifficulty,
      timeSpent: timeSpentSecs,
      isPercentage: true,
    };

    if (!draft.simuladoRows) draft.simuladoRows = [];
    let rowFound = false;
    for (const r of draft.simuladoRows) {
      if (!r.isAuto && r.source !== 'ai-generated') continue;
      if (getDateKey(normalizeDate(r.date || r.createdAt)) !== todayKey) continue;

      const sameById = categoryId && r.categoryId && r.taskId && 
                       r.categoryId === categoryId && r.taskId === taskId;
      const sameByName = !categoryId && 
                         normalize(r.subject) === normalize(materia) && 
                         normalize(r.topic) === normalize(assunto);
                         
      if (sameById || sameByName) {
        rowFound = true;
        const newCorrect = (Number(r.correct) || 0) + correct;
        const newTotal = (Number(r.total) || 0) + total;
        const newTimeSpent = (Number(r.timeSpent) || 0) + timeSpentSecs;
        
        r.correct = newCorrect;
        r.total = newTotal;
        r.score = newTotal > 0 ? (newCorrect / newTotal) * 100 : 0;
        r.isPercentage = true;
        r.timeSpent = newTimeSpent;
        r.lastUpdated = new Date().toISOString();
      }
    }

    if (!rowFound) {
      draft.simuladoRows.push(newRow);
    }

    if (!preventGlobalEvent) {
        if (!draft.simulados) draft.simulados = [];
        const newSimEvent = {
          id: generateId('ai-sim'),
          date: todayKey,
          score: total > 0 ? Math.round((correct / total) * 100) : 0,
          total,
          correct,
          type: 'ai-simulado',
          subject: materia,
          categoryId,
          taskId,
          validated: true,
          isPercentage: true,
        };
        draft.simulados.push(newSimEvent);
        if (draft.simulados.length > 100) {
            draft.simulados = draft.simulados.slice(-100);
        }
    }

    if (!draft.categories) draft.categories = [];
    for (const cat of draft.categories) {
      const idMatch = categoryId && cat.id === categoryId;
      const nameMatch = !categoryId && normalize(cat.name) === normalize(materia);
      
      if (idMatch || nameMatch) {
        const catMaxScore = Number(cat.maxScore) || Number(draft.maxScore) || 100;
        
        if (!cat.simuladoStats) {
           cat.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
        }
        if (!Array.isArray(cat.simuladoStats.history)) {
           cat.simuladoStats.history = [];
        }
        let history = cat.simuladoStats.history;

        const todayIdx = history.findIndex(h => h.date === todayKey);
        const newTopicEntry = { name: assunto, correct, total, taskId, timeSpent: timeSpentSecs };

        if (todayIdx !== -1) {
          const existing = history[todayIdx];
          let topicFound = false;
          
          if (!Array.isArray(existing.topics)) existing.topics = [];
          
          for (const t of existing.topics) {
            const isMatch = (taskId && t.taskId === taskId) || (!taskId && normalize(t.name) === normalize(assunto));
            if (isMatch) {
                topicFound = true;
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

          const dayTotal = existing.topics.reduce((s, t) => s + (t.total || 0), 0);
          const dayCorrect = existing.topics.reduce((s, t) => s + (t.correct || 0), 0);
          const dayTimeSpent = existing.topics.reduce((s, t) => s + (Number(t.timeSpent) || 0), 0);
          const dayTimedQuestoes = existing.topics.reduce((s, t) => s + (Number(t.timeSpent) >= 0 ? (t.total || 0) : 0), 0);

          const prevWeight = (existing.difficulty || 1.0) * (existing.total || 0);
          const newWeight = numericDifficulty * total;
          const newDiff = dayTotal > 0 ? (prevWeight + newWeight) / dayTotal : 1.0;

          existing.correct = dayCorrect;
          existing.total = dayTotal;
          existing.score = dayTotal > 0 ? Math.min(catMaxScore, (dayCorrect / dayTotal) * catMaxScore) : 0;
          existing.difficulty = newDiff;
          existing.timeSpent = dayTimeSpent;
          existing.timedQuestoes = dayTimedQuestoes;
          existing.lastSessionTimeSpent = timeSpentSecs;
          existing.lastSessionTotal = total;
          
        } else {
          history.push({
            date: todayKey,
            correct,
            total,
            timeSpent: timeSpentSecs,
            timedQuestoes: timeSpentSecs >= 0 ? total : 0,
            lastSessionTimeSpent: timeSpentSecs,
            lastSessionTotal: total,
            score: total > 0 ? Math.min(catMaxScore, (correct / total) * catMaxScore) : 0,
            difficulty: formData.dificuldade === 'facil' ? 0.7 : formData.dificuldade === 'medio' ? 1.0 : formData.dificuldade === 'dificil' ? 1.3 : 1.6,
            topics: [newTopicEntry],
          });
        }

        history.sort((a, b) => (a.date > b.date ? 1 : -1));
        if (history.length > 50) {
           cat.simuladoStats.history = history.slice(-50);
           history = cat.simuladoStats.history;
        }

        const statsResult = computeCategoryStats(history, cat.weight || 1, 60, catMaxScore);

        cat.simuladoStats.average = statsResult ? Number((statsResult.mean || 0).toFixed(2)) : 0;
        cat.simuladoStats.trend = statsResult?.trend || 'stable';
        cat.simuladoStats.lastAttempt = total > 0 ? (correct / total) * catMaxScore : 0;
        cat.simuladoStats.level = statsResult?.level || 'BAIXO';
      }
    }

    draft.lastUpdated = new Date().toISOString();
}
