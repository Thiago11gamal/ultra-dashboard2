import { generateId } from '../../utils/idGenerator.js';
import { XP_CONFIG } from '../../config/gamification.js';
import { SYNC_LOG_CAP } from '../../config.js';
import { markStorageDirty } from '../../utils/storageSafe.js';
import { resolveHumanTaskTitle, cleanTaskTitle } from '../../utils/taskTitleHelper.js';
import { isSubjectMatch } from '../../utils/normalization.js';
import { getDateKey } from '../../utils/dateHelper.js';

const LOG_CAP = SYNC_LOG_CAP;
const SESSION_CAP = SYNC_LOG_CAP;

const VALID_STUDY_MODES = new Set(['teoria', 'questoes', 'revisao', 'lei_seca', 'discursiva']);

export const createStudySlice = (set, get) => ({
  handleUpdateStudyTime: (categoryId, minutes, taskId, taskTitleOverride = '', metadata = null) => {
    const rawMinutes = Number(minutes);
    if (!Number.isFinite(rawMinutes) || rawMinutes <= 0) {
      console.warn('[StudySlice] minutes inválido, ignorando:', minutes);
      return;
    }
    const safeMinutes = Math.min(720, Math.max(0.1, rawMinutes));
    const safeStudyMode = (metadata && typeof metadata.studyMode === 'string' && VALID_STUDY_MODES.has(metadata.studyMode))
      ? metadata.studyMode
      : null;
    const rawEnergy = metadata && metadata.energyLevel != null ? Number(metadata.energyLevel) : NaN;
    const safeEnergyLevel = Number.isFinite(rawEnergy)
      ? Math.min(5, Math.max(1, Math.round(rawEnergy)))
      : null;

    let pendingXp = 0;

    set((state) => {
      const now = new Date().toISOString();
      const activeData = state.appState.contests[state.appState.activeId];

      if (!activeData) return;

      const logId = generateId('log');
      const sessionId = generateId('session');

      const catsArray = Array.isArray(activeData.categories)
        ? activeData.categories
        : Object.values(activeData.categories || {});

      const category = catsArray.find(c =>
        c && (
          c.id === categoryId ||
          (categoryId === 'geral' && c.name?.toLowerCase() === 'geral') ||
          (categoryId && typeof categoryId === 'string' && c.name?.toLowerCase() === categoryId.toLowerCase())
        )
      );

      const resolvedSubject = category?.name || (categoryId === 'geral' || !categoryId ? 'Geral' : String(categoryId));

      let initialTitle = '';
      if (taskTitleOverride && typeof taskTitleOverride === 'string') {
        initialTitle = cleanTaskTitle(taskTitleOverride, resolvedSubject);
      }

      const taskTitle = resolveHumanTaskTitle(
        initialTitle,
        taskId,
        category,
        activeData?.categories
      );

      const newLog = {
        id: logId,
        date: now,
        categoryId: category?.id || categoryId || 'geral',
        subject: resolvedSubject,
        categoryName: resolvedSubject,
        taskId,
        minutes: safeMinutes,
        taskTitle,
        ...(safeStudyMode ? { studyMode: safeStudyMode } : {}),
        ...(safeEnergyLevel != null ? { energyLevel: safeEnergyLevel } : {})
      };

      const xpPerMinute = (XP_CONFIG.pomodoro.base / 25) || 1;
      const baseXP = Math.floor(safeMinutes * xpPerMinute);
      const bonusXP = taskId ? (XP_CONFIG.pomodoro.bonusWithTask || 5) : 0;
      pendingXp = baseXP + bonusXP;

      const newSession = {
        id: sessionId,
        startTime: now,
        duration: safeMinutes,
        categoryId: category?.id || categoryId || 'geral',
        subject: resolvedSubject,
        categoryName: resolvedSubject,
        taskId,
        taskTitle,
        logReferenceId: logId,
        awardedXP: pendingXp, // ✅ FIX: Guarda o recibo exato de XP concedido
        ...(safeStudyMode ? { studyMode: safeStudyMode } : {}),
        ...(safeEnergyLevel != null ? { energyLevel: safeEnergyLevel } : {})
      };

      const safeLogs = Array.isArray(activeData.studyLogs)
        ? activeData.studyLogs
        : Object.values(activeData.studyLogs || {});

      const safeSessions = Array.isArray(activeData.studySessions)
        ? activeData.studySessions
        : Object.values(activeData.studySessions || {});

      activeData.studyLogs = [...safeLogs, newLog].slice(-LOG_CAP);
      activeData.studySessions = [...safeSessions, newSession].slice(-SESSION_CAP);

      if (category) {
        category.totalMinutes = (category.totalMinutes || 0) + safeMinutes;
        category.lastStudiedAt = now;

        if (taskId) {
          const catTasks = Array.isArray(category.tasks) ? category.tasks : Object.values(category.tasks || {});
          const task = catTasks.find(t => t && t.id === taskId);
          if (task) task.lastStudiedAt = now;
        }
      }

      // Auto-concluir bloco correspondente do dia na Agenda de Estudos quando sessão real é registrada
      if (activeData.agenda) {
        const todayIsoDate = getDateKey(now) || now.slice(0, 10);
        const agendaList = Array.isArray(activeData.agenda) ? activeData.agenda : Object.values(activeData.agenda || {});
        const matchingBlock = agendaList.find(ev => {
          if (!ev || ev.completed || ev.date !== todayIsoDate) return false;
          if (metadata?.agendaEventId && String(ev.id) === String(metadata.agendaEventId)) return true;
          if (category?.id && ev.categoryId && String(ev.categoryId) === String(category.id)) return true;
          return Boolean(ev.subject && resolvedSubject && isSubjectMatch(ev.subject, resolvedSubject));
        });
        if (matchingBlock) {
          matchingBlock.completed = true;
          matchingBlock.completedAt = now;
          matchingBlock.autoCompletedBySession = true;
        }
        activeData.agenda = agendaList;
      }

      const startHour = new Date(now).getHours();
      if (activeData.user) {
        if (startHour >= 4 && startHour < 7) activeData.user.studiedEarly = true;
        if (startHour >= 23 || startHour < 4) activeData.user.studiedLate = true;
      }

      activeData.lastUpdated = now;
      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = now;
      markStorageDirty();
    });

    if (pendingXp > 0 && typeof get().awardExperience === 'function') {
      get().awardExperience(pendingXp, { skipVersionBump: true });
    }
  },

  deleteSession: (sessionId) => {
    let xpToDeduct = 0;

    set((state) => {
      const activeData = state.appState.contests[state.appState.activeId];

      if (!activeData) return;

      const safeSessions = Array.isArray(activeData.studySessions)
        ? activeData.studySessions
        : Object.values(activeData.studySessions || {});

      const sessionIndex = safeSessions.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) return;

      const session = safeSessions[sessionIndex];

      // ✅ FIX: Usar recibo de XP (awardedXP) se existir, senão recalcular (para dados legados)
      if (Number.isFinite(session.awardedXP)) {
        xpToDeduct = session.awardedXP;
      } else {
        const xpPerMinute = (XP_CONFIG.pomodoro.base / 25) || 1;
        const baseXP = Math.floor((session.duration || 0) * xpPerMinute);
        const bonusXP = session.taskId ? (XP_CONFIG.pomodoro.bonusWithTask || 5) : 0;
        xpToDeduct = baseXP + bonusXP;
      }

      const catsForSession = Array.isArray(activeData.categories)
        ? activeData.categories
        : Object.values(activeData.categories || {});
      const category = catsForSession.find(c => c && c.id === session.categoryId);

      if (category) {
        category.totalMinutes = Math.max(0, (category.totalMinutes || 0) - (session.duration || 0));
      }

      safeSessions.splice(sessionIndex, 1);
      activeData.studySessions = safeSessions;

      if (activeData.studyLogs) {
        const safeLogs = Array.isArray(activeData.studyLogs)
          ? activeData.studyLogs
          : Object.values(activeData.studyLogs || {});

        if (session.logReferenceId) {
          activeData.studyLogs = safeLogs.filter(l => l.id !== session.logReferenceId);
        } else {
          activeData.studyLogs = safeLogs.filter(l => l.id !== session.id);
        }
      }

      const now = new Date().toISOString();
      activeData.lastUpdated = now;
      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = now;
      markStorageDirty();
    });

    if (xpToDeduct > 0 && typeof get().awardExperience === 'function') {
      get().awardExperience(-xpToDeduct, { skipVersionBump: true });
    }
  },

  logFlashcardReview: (deckIdOrObj, cardIdArg, ratingArg, subjectArg, minutesArg = 0.5, explicitCategoryIdArg = null) => {
    const isObjPayload = deckIdOrObj && typeof deckIdOrObj === 'object' && !Array.isArray(deckIdOrObj);
    const deckId = isObjPayload ? (deckIdOrObj.deckId || null) : deckIdOrObj;
    const cardId = isObjPayload ? (deckIdOrObj.cardId || null) : cardIdArg;
    const rating = isObjPayload
      ? Number(deckIdOrObj.rating ?? deckIdOrObj.quality ?? 3)
      : ratingArg;
    const subject = isObjPayload ? (deckIdOrObj.subject || '') : subjectArg;
    const minutes = isObjPayload
      ? (Number.isFinite(Number(deckIdOrObj.minutes))
        ? Number(deckIdOrObj.minutes)
        : (Number.isFinite(Number(deckIdOrObj.durationSeconds)) ? Math.max(0.1, Number(deckIdOrObj.durationSeconds) / 60) : 0.5))
      : minutesArg;
    const explicitCategoryId = isObjPayload
      ? (deckIdOrObj.explicitCategoryId || deckIdOrObj.categoryId || null)
      : explicitCategoryIdArg;

    set((state) => {
      const activeData = state.appState.contests[state.appState.activeId];
      if (!activeData) return;

      const now = new Date().toISOString();
      const logId = generateId('flashlog');

      let categoryId = explicitCategoryId || null;
      const cleanedSubject = String(subject || '').replace(/^erros\s+ia\s*[—-]\s*/i, '').trim();
      const normCatName = (name) => (name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const normSubject = normCatName(cleanedSubject || subject);

      const catsArray = Array.isArray(activeData.categories)
        ? activeData.categories
        : Object.values(activeData.categories || {});

      if (!categoryId && deckId) {
        const decksList = Array.isArray(activeData.flashcardDecks)
          ? activeData.flashcardDecks
          : Object.values(activeData.flashcardDecks || {});
        const deckObj = decksList.find(d => d && d.id === deckId);
        if (deckObj?.categoryId && catsArray.some(c => c && String(c.id) === String(deckObj.categoryId))) {
          categoryId = deckObj.categoryId;
        }
      }

      if (!categoryId && catsArray.length > 0 && normSubject) {
        const exactMatch = catsArray.find(c =>
          c && normCatName(c.name) === normSubject
        );
        const fuzzyMatch = exactMatch || catsArray.find(c => {
          if (!c || !c.name) return false;
          const catNorm = normCatName(c.name);
          return catNorm.startsWith(normSubject) || catNorm.includes(normSubject) || isSubjectMatch(cleanedSubject || subject, c.name);
        });

        if (fuzzyMatch) categoryId = fuzzyMatch.id;
      }

      const isCorrect = rating >= 2;

      const newLog = {
        id: logId,
        date: now,
        categoryId: categoryId || null,
        subject: subject || '',
        categoryName: subject || '',
        taskId: deckId,
        minutes,
        taskTitle: 'Revisão de Flashcard',
        type: 'flashcard',
        deckId,
        cardId,
        rating,
        correct: isCorrect
      };

      const safeLogs = Array.isArray(activeData.studyLogs)
        ? activeData.studyLogs
        : Object.values(activeData.studyLogs || {});

      activeData.studyLogs = [...safeLogs, newLog].slice(-LOG_CAP);

      if (categoryId) {
        const cat = catsArray.find(c => c && c.id === categoryId);

        if (cat) {
          cat.flashcardReviews = (cat.flashcardReviews || 0) + 1;
          cat.lastFlashcardReview = now;

          if (isCorrect) {
            cat.flashcardCorrect = (cat.flashcardCorrect || 0) + 1;
          }
        }
      }

      activeData.lastUpdated = now;
      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = now;
      markStorageDirty();
    });

    if (typeof get().awardExperience === 'function') {
      const xp = rating >= 2 ? 3 : 1;
      get().awardExperience(xp, { skipVersionBump: true });
    }
  },
});

