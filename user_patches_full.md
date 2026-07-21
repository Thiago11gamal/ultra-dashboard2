<USER_REQUEST>
Abaixo estão os **códigos corrigidos completos** para os principais arquivos afetados.  
Para arquivos muito grandes, entreguei **funções/blocos completos substitutos**, prontos para colar.

> **Regra de implementação:** substituir exatamente o arquivo/função/bloco indicado.  
> Manter imports existentes, exceto quando o patch disser para adicionar/remover import.

---

# 1. `src/store/schemas.js`

## 1.1. Substituir `repairContestHistory` completo

Adicionar este helper **antes** de `repairContestHistory`:

```js
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
```

Depois substituir a função `repairContestHistory` inteira por:

```js
const repairContestHistory = (data) => {
  if (!data.simuladoRows || data.simuladoRows.length === 0 || !data.categories) return data;

  const rows = data.simuladoRows;
  let hasRepaired = false;

  data.categories.forEach(cat => {
    const catNorm = normalize(cat.name);
    const catAliases = aliases[catNorm] || [];

    const myRows = rows.filter(r => {
      if (r.categoryId && r.categoryId === cat.id) return true;

      const subNorm = normalize(r.subject);
      if (!subNorm) return false;

      return subNorm === catNorm ||
        catAliases.some(a => normalize(a) === subNorm);
    });

    if (myRows.length === 0) return;

    const currentHistory = cat.simuladoStats?.history || [];
    const maxScore = cat.maxScore ?? 100;

    const uniqueDaysInLogs = new Set(
      myRows
        .map(r => getDateKey(extractRowDate(r)))
        .filter(Boolean)
    ).size;

    const currentUniqueDays = new Set(
      currentHistory
        .map(h => getDateKey(h.date))
        .filter(Boolean)
    ).size;

    const hasCorruptedHistory = currentHistory.some(h =>
      !h ||
      typeof h !== 'object' ||
      !h.date ||
      (h.total === undefined && h.score === undefined && h.correct === undefined) ||
      (h.score !== undefined && h.score !== null && Number.isNaN(Number(h.score))) ||
      (h.total !== undefined && h.total !== null && Number.isNaN(Number(h.total)))
    );

    const dateCompressionBug = uniqueDaysInLogs > 1 && currentUniqueDays <= 1 && currentHistory.length > 0;
    const repairThreshold = Math.ceil(currentHistory.length * 1.2);

    if (
      hasCorruptedHistory ||
      dateCompressionBug ||
      currentHistory.length === 0 ||
      uniqueDaysInLogs > repairThreshold
    ) {
      hasRepaired = true;

      const dailyStats = {};

      myRows.forEach(r => {
        const dk = getDateKey(extractRowDate(r));
        if (!dk) return;

        if (!dailyStats[dk]) dailyStats[dk] = { correct: 0, total: 0 };

        const rawTotal = parseInt(r.total, 10) || 0;
        const rawCorrect = parseInt(r.correct, 10) || 0;

        const safeMaxScore = Math.max(1, maxScore);
        const rawScore = Number(r.score);
        const safeScore = Number.isFinite(rawScore) ? rawScore : 0;

        const corrNorm = (r.isPercentage && r.score != null && rawTotal > 0)
          ? Math.round((Math.min(safeMaxScore, Math.max(0, safeScore)) / safeMaxScore) * rawTotal)
          : rawCorrect;

        dailyStats[dk].correct += corrNorm;
        dailyStats[dk].total += rawTotal;
      });

      const rebuiltHistory = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        correct: stats.correct,
        total: stats.total,
        score: (stats.total > 0 && Number.isFinite(stats.correct))
          ? (stats.correct / stats.total) * maxScore
          : 0
      })).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

      const statsResult = computeCategoryStats(rebuiltHistory, cat.weight || 10, 60, maxScore);

      cat.simuladoStats = {
        history: rebuiltHistory,
        average: Number(statsResult.mean.toFixed(2)),
        trend: statsResult.trend || 'stable',
        lastAttempt: rebuiltHistory.length > 0 ? rebuiltHistory[rebuiltHistory.length - 1].score : 0,
        level: statsResult.level || (
          statsResult.mean > 0.7 * maxScore
            ? 'ALTO'
            : statsResult.mean > 0.4 * maxScore
              ? 'MÉDIO'
              : 'BAIXO'
        )
      };
    }
  });

  if (hasRepaired) {
    data.lastUpdated = new Date().toISOString();
  }

  return data;
};
```

---

## 1.2. Corrigir `settings.darkMode` dentro de `sanitizeContest`

Localizar:

```js
settings: {
  darkMode: true,
  soundEnabled: source.settings?.soundEnabled ?? true,
  pomodoroWork: Number(source.settings?.pomodoroWork) || 25,
  pomodoroBreak: Number(source.settings?.pomodoroBreak) || 5,
  pomodoroLongBreak: Number(source.settings?.pomodoroLongBreak) || 15,
  longBreakAfter: Number(source.settings?.longBreakAfter) || 4,
  sessions: Number(source.settings?.sessions) || 0,
  completedCycles: Number(source.settings?.completedCycles) || 0,
},
```

Substituir por:

```js
settings: {
  darkMode: source.settings?.darkMode ?? true,
  soundEnabled: source.settings?.soundEnabled ?? true,
  pomodoroWork: Number(source.settings?.pomodoroWork) || 25,
  pomodoroBreak: Number(source.settings?.pomodoroBreak) || 5,
  pomodoroLongBreak: Number(source.settings?.pomodoroLongBreak) || 15,
  longBreakAfter: Number(source.settings?.longBreakAfter) || 4,
  sessions: Number(source.settings?.sessions) || 0,
  completedCycles: Number(source.settings?.completedCycles) || 0,
},
```

---

## 1.3. Corrigir filtro de `trash` dentro de `validateAppState`

Localizar:

```js
trash: Array.isArray(d.trash) ? d.trash.filter(item => {
  if (!item) return false;
  // BUG LOGIC-02 FIX: Se não tiver deletedAt, assume agora para expirar em 30 dias
  const deletedAt = item.deletedAt ? new Date(item.deletedAt) : new Date();
  return (new Date() - deletedAt) / (1000 * 60 * 60 * 24) <= 30;
}) : [],
```

Substituir por:

```js
trash: Array.isArray(d.trash) ? d.trash.filter(item => {
  if (!item) return false;

  const parsedDeletedAt = item.deletedAt ? new Date(item.deletedAt) : null;
  const deletedAt = parsedDeletedAt && !isNaN(parsedDeletedAt.getTime())
    ? parsedDeletedAt
    : new Date();

  return (new Date() - deletedAt) / (1000 * 60 * 60 * 24) <= 30;
}) : [],
```

---

# 2. `src/store/slices/createSettingsSlice.js`

## Arquivo completo corrigido

Substituir o arquivo inteiro por:

```js
import { validateAppState, sanitizeContest } from '../schemas';

const applyDarkModeToggle = (state) => {
  const activeData = state.appState.contests[state.appState.activeId];
  if (!activeData) return;

  if (!activeData.settings) activeData.settings = {};

  activeData.settings.darkMode = !(activeData.settings.darkMode ?? true);

  state.appState.version = (state.appState.version || 0) + 1;
  state.appState.lastUpdated = new Date().toISOString();
  localStorage.setItem('ultra-sync-dirty', 'true');
};

export const createSettingsSlice = (set) => ({
  setHasSeenTour: (value) => set((state) => {
    state.appState.hasSeenTour = value;

    if (value) {
      state.appState.lastSeenTourDate = new Date().toDateString();
    }

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    localStorage.setItem('ultra-sync-dirty', 'true');
  }),

  setDashboardFilter: (filterOrEvent) => set((state) => {
    const rawFilter = (filterOrEvent && typeof filterOrEvent === 'object' && 'target' in filterOrEvent)
      ? filterOrEvent.target?.value
      : filterOrEvent;

    const nextFilter = typeof rawFilter === 'string' ? rawFilter : 'all';

    state.appState.dashboardFilter = nextFilter || 'all';
    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    localStorage.setItem('ultra-sync-dirty', 'true');
  }),

  updateCoachPlanner: (newPlannerData) => set((state) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData) return;

    if (JSON.stringify(activeData.coachPlanner) === JSON.stringify(newPlannerData)) return;

    activeData.coachPlanner = newPlannerData;

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    localStorage.setItem('ultra-sync-dirty', 'true');
  }),

  setThemeMode: () => set(applyDarkModeToggle),

  toggleDarkMode: () => set(applyDarkModeToggle),

  setAppState: (newStateObj) => set((state) => {
    let nextState = typeof newStateObj === 'function' ? newStateObj(state.appState) : newStateObj;
    if (!nextState) return;
    if (nextState === state.appState) return;

    nextState = validateAppState(nextState);

    const nextContests = (nextState.contests && typeof nextState.contests === 'object')
      ? nextState.contests
      : state.appState.contests;

    const contestIds = Object.keys(nextContests || {});
    const fallbackActiveId = contestIds[0] || state.appState.activeId;

    const nextActiveId = (nextState.activeId && nextContests?.[nextState.activeId])
      ? nextState.activeId
      : fallbackActiveId;

    const { history: _history, ...otherState } = nextState;

    Object.assign(state.appState, {
      ...otherState,
      contests: nextContests,
      activeId: nextActiveId
    });

    state.appState.lastUpdated = nextState.lastUpdated ?? new Date().toISOString();
  }),

  setData: (newDataCallback, _shouldRecordHistory = true) => set((state) => {
    const contestId = state.appState.activeId;
    const currentData = state.appState.contests[contestId];
    if (!currentData) return;

    const nextData = typeof newDataCallback === 'function'
      ? newDataCallback(currentData)
      : newDataCallback;

    if (nextData !== undefined && nextData !== null && typeof nextData === 'object') {
      state.appState.contests[contestId] = sanitizeContest(nextData);
    }

    const nowIso = new Date().toISOString();

    if (state.appState.contests[contestId]) {
      state.appState.contests[contestId].lastUpdated = nowIso;
    }

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = nowIso;
    localStorage.setItem('ultra-sync-dirty', 'true');
  }),
});
```

---

# 3. `src/store/slices/createStudySlice.js`

## Arquivo completo corrigido

Substituir o arquivo inteiro por:

```js
import { generateId } from '../../utils/idGenerator';
import { XP_CONFIG } from '../../config/gamification';
import { SYNC_LOG_CAP } from '../../config';

const LOG_CAP = SYNC_LOG_CAP;
const SESSION_CAP = SYNC_LOG_CAP;

export const createStudySlice = (set, get) => ({
  handleUpdateStudyTime: (categoryId, minutes, taskId) => {
    let pendingXp = 0;

    set((state) => {
      const now = new Date().toISOString();
      const activeData = state.appState.contests[state.appState.activeId];

      if (!activeData) return;

      const logId = generateId('log');
      const sessionId = generateId('session');

      const category = activeData?.categories?.find(c => c.id === categoryId);

      let taskTitle = '';

      if (category && taskId) {
        const task = (category.tasks || []).find(
          t => t.id === taskId || t.text === taskId || t.title === taskId
        );

        taskTitle = task?.title || task?.text || (String(taskId).startsWith('task') ? '' : taskId);
      }

      const newLog = {
        id: logId,
        date: now,
        categoryId,
        taskId,
        minutes,
        taskTitle
      };

      const newSession = {
        id: sessionId,
        startTime: now,
        duration: minutes,
        categoryId,
        taskId,
        taskTitle,
        logReferenceId: logId
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
        category.totalMinutes = (category.totalMinutes || 0) + minutes;
        category.lastStudiedAt = now;

        if (taskId) {
          const task = (category.tasks || []).find(t => t.id === taskId);
          if (task) task.lastStudiedAt = now;
        }
      }

      const xpPerMinute = (XP_CONFIG.pomodoro.base / 25) || 1;
      const baseXP = Math.floor(minutes * xpPerMinute);
      const bonusXP = taskId ? (XP_CONFIG.pomodoro.bonusWithTask || 5) : 0;

      const startHour = new Date(now).getHours();

      if (activeData.user) {
        if (startHour >= 4 && startHour < 7) activeData.user.studiedEarly = true;
        if (startHour >= 23 || startHour < 4) activeData.user.studiedLate = true;
      }

      pendingXp = baseXP + bonusXP;

      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = new Date().toISOString();
      localStorage.setItem('ultra-sync-dirty', 'true');
    });

    if (pendingXp > 0 && get().awardExperience) {
      get().awardExperience(pendingXp);
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

      const xpPerMinute = (XP_CONFIG.pomodoro.base / 25) || 1;
      const baseXP = Math.floor((session.duration || 0) * xpPerMinute);
      const bonusXP = session.taskId ? (XP_CONFIG.pomodoro.bonusWithTask || 5) : 0;

      xpToDeduct = baseXP + bonusXP;

      const category = (activeData.categories || []).find(c => c.id === session.categoryId);

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

      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = new Date().toISOString();
      localStorage.setItem('ultra-sync-dirty', 'true');
    });

    if (xpToDeduct > 0 && get().awardExperience) {
      get().awardExperience(-xpToDeduct);
    }
  },

  logFlashcardReview: (deckId, cardId, rating, subject, minutes = 0.5) => {
    set((state) => {
      const activeData = state.appState.contests[state.appState.activeId];
      if (!activeData) return;

      const now = new Date().toISOString();
      const logId = generateId('flashlog');

      let categoryId = null;
      const normSubject = (subject || '').toLowerCase().trim();

      if (activeData.categories && normSubject) {
        const match = activeData.categories.find(c =>
          (c.name || '').toLowerCase().trim() === normSubject ||
          (c.name || '').toLowerCase().includes(normSubject) ||
          normSubject.includes((c.name || '').toLowerCase())
        );

        if (match) categoryId = match.id;
      }

      const isCorrect = rating >= 2;

      const newLog = {
        id: logId,
        date: now,
        categoryId: categoryId || 'flashcards',
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
        const cat = activeData.categories.find(c => c.id === categoryId);

        if (cat) {
          cat.flashcardReviews = (cat.flashcardReviews || 0) + 1;
          cat.lastFlashcardReview = now;

          if (isCorrect) {
            cat.flashcardCorrect = (cat.flashcardCorrect || 0) + 1;
          }
        }
      }

      state.appState.version = (state.appState.version || 0) + 1;
      state.appState.lastUpdated = new Date().toISOString();
      localStorage.setItem('ultra-sync-dirty', 'true');
    });

    if (get().awardExperience) {
      const xp = rating >= 2 ? 3 : 1;
      get().awardExperience(xp);
    }
  },
});
```

---

# 4. `src/store/slices/createSimuladoSlice.js`

## Arquivo completo corrigido

Substituir o arquivo inteiro por:

```js
import { computeCategoryStats } from '../../engine/stats.js';
import { getSafeScore } from '../../utils/scoreHelper.js';

export const createSimuladoSlice = (set) => ({
  resetSimuladoStats: () => set((state) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData?.categories) return;

    activeData.categories.forEach(c => {
      c.simuladoStats = {
        history: [],
        average: 0,
        lastAttempt: 0,
        trend: 'stable',
        level: 'BAIXO'
      };
    });

    activeData.simuladoRows = [];
    activeData.simulados = [];

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    localStorage.setItem('ultra-sync-dirty', 'true');
  }),

  deleteSimulado: (dateInput) => set((state) => {
    const activeData = state.appState.contests[state.appState.activeId];
    if (!activeData || !dateInput) return;

    const normalizedInput = String(dateInput);

    const matchesDate = (raw) => {
      if (!raw) return false;

      const normalizedRaw = String(raw);

      if (normalizedInput.includes('T')) {
        return normalizedRaw === normalizedInput;
      }

      return normalizedRaw.startsWith(normalizedInput);
    };

    if (activeData.simuladoRows) {
      const safeRows = Array.isArray(activeData.simuladoRows)
        ? activeData.simuladoRows
        : Object.values(activeData.simuladoRows || {});

      activeData.simuladoRows = safeRows.filter(r => !matchesDate(r.date || r.createdAt));
    }

    if (activeData.simulados) {
      const safeSimulados = Array.isArray(activeData.simulados)
        ? activeData.simulados
        : Object.values(activeData.simulados || {});

      activeData.simulados = safeSimulados.filter(s => !matchesDate(s.date || s.createdAt));
    }

    if (activeData.categories) {
      activeData.categories = activeData.categories.map(c => {
        const catMaxScore = Number(c.maxScore) || Number(activeData.maxScore) || 100;

        if (c.simuladoStats?.history) {
          const safeHistory = Array.isArray(c.simuladoStats.history)
            ? c.simuladoStats.history
            : Object.values(c.simuladoStats.history || {});

          const newHistory = safeHistory.filter(h => !matchesDate(h.date));
          const newStatsObj = { ...c.simuladoStats, history: newHistory };

          if (newHistory.length > 0) {
            const newStats = computeCategoryStats(newHistory, c.weight || 10, 60, catMaxScore);

            if (newStats) {
              const last = newHistory[newHistory.length - 1];
              const lastScore = last ? getSafeScore(last, catMaxScore) : NaN;

              newStatsObj.average = Number((newStats.mean || 0).toFixed(2));
              newStatsObj.trend = newStats.trend || 'stable';

              newStatsObj.lastAttempt = Number.isFinite(lastScore)
                ? lastScore
                : Number(
                    last?.score ?? (
                      (Number(last?.total) > 0)
                        ? (Number(last?.correct || 0) / Number(last?.total)) * catMaxScore
                        : 0
                    )
                  );

              newStatsObj.level = newStats.level || 'BAIXO';
            }
          } else {
            newStatsObj.average = 0;
            newStatsObj.trend = 'stable';
            newStatsObj.lastAttempt = 0;
            newStatsObj.level = 'BAIXO';
          }

          return { ...c, simuladoStats: newStatsObj };
        }

        return c;
      });
    }

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    localStorage.setItem('ultra-sync-dirty', 'true');
  }),
});
```

---

# 5. `src/store/slices/createCategorySlice.js`

## Substituir a função `safelyMergeDuplicates` completa

Localizar `safelyMergeDuplicates: () => set((state) => { ... })` e substituir a função inteira por:

```js
safelyMergeDuplicates: () => set((state) => {
  const activeId = state.appState.activeId;
  const activeData = state.appState.contests[activeId];

  if (!activeId || !activeData || !Array.isArray(activeData.categories)) return;

  const hasDuplicates = (() => {
    const seen = new Set();

    return activeData.categories.some(cat => {
      const key = normalize(cat.name);

      if (seen.has(key)) return true;

      seen.add(key);
      return false;
    });
  })();

  if (!hasDuplicates) return;

  const groups = {};

  activeData.categories.forEach(cat => {
    const norm = normalize(cat.name);

    if (!groups[norm]) groups[norm] = [];

    groups[norm].push(cat);
  });

  let changed = false;
  const newCategories = [];

  Object.values(groups).forEach(group => {
    if (group.length === 1) {
      newCategories.push(group[0]);
      return;
    }

    changed = true;
    console.warn(`[Store] Merging ${group.length} duplicates for "${group[0].name}"`);

    const primary = group.sort((a, b) => {
      const getHistoryLen = (obj) => {
        const h = obj.simuladoStats?.history;
        if (!h) return 0;

        return Array.isArray(h) ? h.length : Object.values(h).length;
      };

      const aData = (a.tasks?.length || 0) + getHistoryLen(a);
      const bData = (b.tasks?.length || 0) + getHistoryLen(b);

      return bData - aData;
    })[0];

    const getHistoryArr = (c) => {
      const h = c.simuladoStats?.history;
      if (!h) return [];

      return Array.isArray(h) ? h : Object.values(h);
    };

    const historyKey = (h) => {
      if (!h) return 'invalid';

      return h.id || `${h.date || ''}-${h.score ?? ''}-${h.total ?? ''}-${h.correct ?? ''}-${normalize(h.topic || '')}`;
    };

    const mergedTasks = [...(primary.tasks || [])];
    const mergedHistory = [...getHistoryArr(primary)];
    const seenHistory = new Set(mergedHistory.map(historyKey));

    group.forEach(cat => {
      if (cat.id === primary.id) return;

      (cat.tasks || []).forEach(t => {
        const taskTitle = (t.title || t.text || '').trim();

        if (!mergedTasks.some(mt => (mt.title || mt.text || '').trim() === taskTitle)) {
          mergedTasks.push(t);
        }
      });

      getHistoryArr(cat).forEach(h => {
        const key = historyKey(h);

        if (!seenHistory.has(key)) {
          seenHistory.add(key);
          mergedHistory.push(h);
        }
      });

      const oldId = cat.id;
      const newId = primary.id;

      if (activeData.studyLogs) {
        const safeLogs = Array.isArray(activeData.studyLogs)
          ? activeData.studyLogs
          : Object.values(activeData.studyLogs || {});

        safeLogs.forEach(l => {
          if (l.categoryId === oldId) l.categoryId = newId;
        });

        activeData.studyLogs = safeLogs;
      }

      if (activeData.studySessions) {
        const safeSessions = Array.isArray(activeData.studySessions)
          ? activeData.studySessions
          : Object.values(activeData.studySessions || {});

        safeSessions.forEach(s => {
          if (s.categoryId === oldId) s.categoryId = newId;
        });

        activeData.studySessions = safeSessions;
      }

      if (activeData.simuladoRows) {
        const safeRows = Array.isArray(activeData.simuladoRows)
          ? activeData.simuladoRows
          : Object.values(activeData.simuladoRows || {});

        safeRows.forEach(r => {
          if (r.categoryId === oldId) r.categoryId = newId;
        });

        activeData.simuladoRows = safeRows;
      }
    });

    newCategories.push({
      ...primary,
      tasks: mergedTasks,
      simuladoStats: {
        ...primary.simuladoStats,
        history: mergedHistory
      }
    });
  });

  if (changed) {
    activeData.categories = newCategories;

    if (activeData.mcWeights) {
      const validKeys = new Set();

      newCategories.forEach(c => {
        validKeys.add(c.id);
        validKeys.add(c.name);
        validKeys.add(normalize(c.name));
      });

      Object.keys(activeData.mcWeights).forEach(key => {
        if (!validKeys.has(key) && !validKeys.has(normalize(key))) {
          delete activeData.mcWeights[key];
        }
      });
    }

    state.appState.version = (state.appState.version || 0) + 1;
    state.appState.lastUpdated = new Date().toISOString();
    localStorage.setItem('ultra-sync-dirty', 'true');
  }
}),
```

---

# 6. `src/hooks/useCloudSync.js`

## 6.1. Substituir `mergeContestCategories` completo

Localizar:

```js
const mergeContestCategories = (localCats = [], cloudCats = []) => {
```

Substituir a função inteira por:

```js
const mergeContestCategories = (localCats = [], cloudCats = [], preferCloudBase = false) => {
  const mergedCatsMap = {};

  const toDateMs = (value) => {
    if (!value) return 0;

    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };

  const safeLocalCats = Array.isArray(localCats) ? localCats : Object.values(localCats || {});
  const safeCloudCats = Array.isArray(cloudCats) ? cloudCats : Object.values(cloudCats || {});

  safeLocalCats.forEach(c => {
    if (c?.id) mergedCatsMap[c.id] = c;
  });

  safeCloudCats.forEach(c => {
    if (!c?.id) return;

    if (mergedCatsMap[c.id]) {
      const localCat = mergedCatsMap[c.id];

      const baseCat = preferCloudBase
        ? { ...localCat, ...c }
        : { ...c, ...localCat };

      const catMaxScore = Number(c.maxScore ?? localCat.maxScore ?? 100) || 100;

      const historyMap = new Map();

      const getStableHistoryKey = (h) =>
        h.id || `${h.date}-${h.taskId || 'geral'}-${h.score}`;

      const safeLocalHistory = Array.isArray(localCat.simuladoStats?.history)
        ? localCat.simuladoStats.history
        : Object.values(localCat.simuladoStats?.history || {});

      const safeCloudHistory = Array.isArray(c.simuladoStats?.history)
        ? c.simuladoStats.history
        : Object.values(c.simuladoStats?.history || {});

      safeLocalHistory.forEach(h => {
        if (h?.date) historyMap.set(getStableHistoryKey(h), h);
      });

      safeCloudHistory.forEach(h => {
        if (h?.date) historyMap.set(getStableHistoryKey(h), h);
      });

      mergedCatsMap[c.id] = {
        ...baseCat,
        tasks: mergeCategoryTasks(localCat.tasks, c.tasks),
        simuladoStats: {
          ...(localCat.simuladoStats || c.simuladoStats || {}),
          ...(c.simuladoStats || {}),
          history: Array.from(historyMap.values())
            .map(h => ({ ...h, score: getSafeScore(h, catMaxScore) }))
            .sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date))
        }
      };
    } else {
      mergedCatsMap[c.id] = c;
    }
  });

  return Object.values(mergedCatsMap);
};
```

---

## 6.2. Substituir `mergeContestPayload` completo

Localizar:

```js
const mergeContestPayload = (localContest, cloudContest, preferCloudBase = false) => {
```

Substituir a função inteira por:

```js
const mergeContestPayload = (localContest, cloudContest, preferCloudBase = false) => {
  const base = preferCloudBase
    ? { ...localContest, ...cloudContest }
    : { ...cloudContest, ...localContest };

  return {
    ...base,
    categories: mergeContestCategories(
      localContest.categories,
      cloudContest.categories,
      preferCloudBase
    ),
    studyLogs: mergeArrays(localContest.studyLogs, cloudContest.studyLogs),
    studySessions: mergeArrays(localContest.studySessions, cloudContest.studySessions),
    simuladoRows: mergeArrays(localContest.simuladoRows, cloudContest.simuladoRows),
    monteCarloHistory: mergeMonteCarloHistory(localContest.monteCarloHistory, cloudContest.monteCarloHistory),
  };
};
```

---

## 6.3. Substituir `performEmergencySync` completo

Localizar `const performEmergencySync = useCallback(async () => { ... }` e substituir a função inteira por:

```js
const performEmergencySync = useCallback(async () => {
  if (
    isLocalMode ||
    !currentUser?.uid ||
    !appStateRef.current ||
    !isParityValidatedRef.current ||
    !db
  ) return;

  if (debounceRef.current) clearTimeout(debounceRef.current);

  const currentStateString = stateStringForSync(appStateRef.current);

  if (lastSyncedRef.current === currentStateString) return;

  try {
    const syncState = useAppStore.getState().appState;

    const safeguardContest = (contest) => {
      if (!contest) return contest;

      return {
        ...contest,
        studyLogs: (contest.studyLogs || []).slice(-SYNC_LOG_CAP),
        studySessions: (contest.studySessions || []).slice(-SYNC_LOG_CAP),
        simuladoRows: (contest.simuladoRows || []).slice(-300),
      };
    };

    const safeContests = syncState.contests
      ? Object.fromEntries(
          Object.entries(syncState.contests).map(([id, c]) => [id, safeguardContest(c)])
        )
      : syncState.contests;

    const safeTrash = (syncState.trash || []).slice(-20);

    const stateToSave = cleanUndefined(safeClone({
      ...syncState,
      contests: safeContests,
      trash: safeTrash,
      history: [],
      _lastBackup: new Date().toISOString()
    }));

    setInternalSyncing(true);
    logger.debug(`[Sync] Iniciando conexão segura com a nuvem...`);

    setDoc(doc(db, 'backups', currentUser.uid), stateToSave)
      .then(() => {
        lastSyncedRef.current = currentStateString;

        try {
          localStorage.removeItem('ultra-sync-dirty');
        } catch (err) {
          logger.warn('[Sync] LocalStorage cleanup error:', err);
        }
      })
      .catch(e => {
        logger.error("[Sync] Erro no emergency-save:", e);
        lastSyncedRef.current = null;
      })
      .finally(() => {
        if (isMountedRef.current) setInternalSyncing(false);
      });

  } catch (e) {
    logger.error("[Sync] Erro na montagem do emergency-save:", e);
  }
}, [currentUser?.uid, setInternalSyncing]);
```

---

# 7. `src/pages/Flashcards.jsx`

## 7.1. Adicionar helper dentro do componente

Dentro do componente `Flashcards`, antes de `startStudy`, adicionar:

```js
function getDueCardsForDeck(deck) {
  if (!deck?.cards) return [];

  const safeCards = Array.isArray(deck.cards)
    ? deck.cards
    : Object.values(deck.cards || {});

  return safeCards.filter(c => isFlashcardDue(c.due));
}
```

---

## 7.2. Substituir `startStudy` completo

Localizar:

```js
const startStudy = (deck) => {
```

Substituir a função inteira por:

```js
const startStudy = (deck) => {
  const safeCards = Array.isArray(deck?.cards)
    ? deck.cards
    : Object.values(deck?.cards || {});

  if (!safeCards.length) {
    showToast('Adicione cartões antes de estudar', 'error');
    return;
  }

  const dueForDeck = getDueCardsForDeck(deck);
  const cardsToStudy = dueForDeck.length > 0 ? dueForDeck : safeCards;

  setSelectedDeckId(deck.id);

  setStudyDeck({ ...deck, cardsToStudy });
  setStudyIndex(0);
  setIsFlipped(false);
  setStudyStats({ reviewed: 0, known: 0 });
  setIsStudying(true);
};
```

---

# 8. `src/pages/Pomodoro.jsx`

## 8.1. Corrigir import

Localizar:

```js
import { getLocalMidnight } from '../utils/dateHelper';
```

Substituir por:

```js
import { getLocalMidnight, getDateKey } from '../utils/dateHelper';
```

---

## 8.2. Substituir bloco de cálculo de dias estudados no `DataTriviaPanel`

Localizar:

```js
const dateStr = d.toISOString().split('T')[0];
daysStudied.add(dateStr);
```

Substituir por:

```js
const dateStr = getDateKey(log.date || log.createdAt) || getDateKey(d) || d.toISOString().split('T')[0];
daysStudied.add(dateStr);
```

---

## 8.3. Corrigir streak interno

Localizar:

```js
const current = new Date(dayStr).getTime();
```

Substituir por:

```js
const current = new Date(`${dayStr}T12:00:00`).getTime();
```

---

# 9. `src/pages/Agenda.jsx`

## Corrigir exibição de próximos compromissos

Localizar:

```js
<div className="text-[11px] text-teal-300/90">{format(new Date(ev.date), 'dd/MM')} {ev.time ? `• ${ev.time}` : ''} • {ev.duration}min</div>
```

Substituir por:

```js
<div className="text-[11px] text-teal-300/90">
  {ev.date ? format(new Date(`${ev.date}T12:00:00`), 'dd/MM') : '--'} {ev.time ? `• ${ev.time}` : ''} • {ev.duration}min
</div>
```

---

# 10. `src/utils/weeklyEvolutionInsights.js`

## Arquivo completo corrigido

Substituir o arquivo inteiro por:

```js
import { toDateMs } from './dateHelper.js';

export function computeTopRegressions({ viewMode, chartData = [], keys = [], activeKeys = {}, hiddenKeys = {} }) {
  if (viewMode !== 'variation' || !Array.isArray(chartData) || chartData.length === 0) return [];

  const latestWeekWithDelta = [...chartData].reverse().find(point =>
    keys.some(key => Number.isFinite(Number(point?.[`delta_${key}`])))
  );

  if (!latestWeekWithDelta) return [];

  return keys
    .map((key) => {
      const delta = latestWeekWithDelta[`delta_${key}`];

      if (!Number.isFinite(Number(delta)) || Number(delta) >= 0 || hiddenKeys[key]) return null;

      return {
        key,
        name: activeKeys[key]?.name || key,
        fullName: activeKeys[key]?.fullName || activeKeys[key]?.name || key,
        delta: Number(delta),
        color: activeKeys[key]?.color || '#ef4444',
        week: latestWeekWithDelta.displayDate,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);
}

export function computeTrendKpi({ chartData = [], keys = [], hiddenKeys = {} }) {
  if (!Array.isArray(chartData) || chartData.length < 2) return null;

  const visibleKeys = keys.filter((key) => !hiddenKeys[key]);
  if (visibleKeys.length === 0) return null;

  const recentWindow = chartData.slice(-4);
  const previousWindow = chartData.slice(-8, -4);

  if (!previousWindow.length) return null;

  const calculateEMA = (windowData, alphaBase = 0.3) => {
    if (!windowData.length) return null;

    let ema = null;
    let lastTime = null;

    windowData.forEach((week) => {
      const currentTime = toDateMs(week.week);

      if (!Number.isFinite(currentTime)) return;

      const deltaT = lastTime ? Math.max(1, (currentTime - lastTime) / 86400000) : 1;
      const alpha = 1 - Math.pow(1 - alphaBase, deltaT);
      const safeAlpha = Math.min(0.9, alpha);

      let weekSum = 0;
      let weekVol = 0;

      visibleKeys.forEach(key => {
        const meta = week[`meta_${key}`];

        if (meta && meta.currTot > 0 && Number.isFinite(Number(week[key]))) {
          weekSum += (Number(week[key]) * meta.currTot);
          weekVol += meta.currTot;
        }
      });

      if (weekVol > 0) {
        const weekAvg = weekSum / weekVol;

        if (ema === null) {
          ema = weekAvg;
        } else {
          ema = (weekAvg * safeAlpha) + (ema * (1 - safeAlpha));
        }
      }

      lastTime = currentTime;
    });

    return ema;
  };

  const recentAvg = calculateEMA(recentWindow);
  const previousAvg = calculateEMA(previousWindow);

  if (recentAvg === null || previousAvg === null) return null;

  return {
    recentAvg,
    previousAvg,
    delta: recentAvg - previousAvg,
    recentN: recentWindow.length,
    previousN: previousWindow.length,
  };
}
```

---

# 11. `src/engine/analyticsStats.js`

## Substituir `computeCalibrationPenalty` completo

Localizar:

```js
export function computeCalibrationPenalty(mcHistory, globalHistory, maxScore, summary = null) {
```

Substituir a função inteira por:

```js
export function computeCalibrationPenalty(mcHistory, globalHistory, maxScore, summary = null) {
  if (
    !Array.isArray(mcHistory) ||
    mcHistory.length === 0 ||
    !Array.isArray(globalHistory) ||
    globalHistory.length === 0
  ) {
    return 0;
  }

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const LAMBDA = Math.log(2) / (CALIBRATION_LAMBDA_DAYS * MS_PER_DAY);
  const now = Date.now();

  let brierWeightSum = 0;
  let brierSum = 0;
  let residualWeightSum = 0;
  let residualSum = 0;

  const todayKey = getDateKey(new Date());

  mcHistory.forEach(snapshot => {
    const snapshotKey = getDateKey(snapshot.date || snapshot.timestamp);

    if (snapshotKey === todayKey) return;

    const snapTime = normalizeDate(snapshot.date || snapshot.timestamp)?.getTime() || NaN;
    if (isNaN(snapTime)) return;

    const targetTime = snapshot.targetDate ? normalizeDate(snapshot.targetDate)?.getTime() : null;

    let actual = null;

    if (targetTime && !isNaN(targetTime)) {
      let minDiff = Infinity;

      globalHistory.forEach(h => {
        const hTime = normalizeDate(h.date)?.getTime() || NaN;

        if (hTime > snapTime) {
          const diff = Math.abs(hTime - targetTime);

          if (diff < minDiff) {
            minDiff = diff;
            actual = h;
          }
        }
      });
    } else {
      actual = [...globalHistory].reverse().find(
        h => (normalizeDate(h.date)?.getTime() || NaN) > snapTime
      );
    }

    if (!actual) return;

    const age = Math.max(0, now - snapTime);
    const weight = Math.exp(-LAMBDA * age);

    const meanPrediction = Number(snapshot.mean) || 0;

    if (meanPrediction > 0 && maxScore > 0) {
      const err = Math.abs(meanPrediction - actual.score) / maxScore;
      residualSum += err * weight;
      residualWeightSum += weight;
    }

    const p = Math.max(0, Math.min(1, (Number(snapshot.probability) || 0) / 100));
    const target = Number(snapshot.target) || 0;

    if (target > 0) {
      const observed = actual.score >= target ? 1 : 0;
      const brierScore = (p - observed) ** 2;

      brierSum += brierScore * weight;
      brierWeightSum += weight;
    }
  });

  let calibrationPenalty = 0;

  if (brierWeightSum > 0 || residualWeightSum > 0) {
    const avgBrier = brierWeightSum > 0 ? brierSum / brierWeightSum : 0;
    const avgResidual = residualWeightSum > 0 ? residualSum / residualWeightSum : 0;

    const rawBrierPenalty = Math.max(0, avgBrier - 0.18);
    const combinedPenalty = (rawBrierPenalty * 0.7) + (avgResidual * 0.3);

    calibrationPenalty = Math.min(MAX_CALIBRATION_PENALTY, combinedPenalty);
  }

  if (summary && summary.avgBrier > 0) {
    const summaryPenalty = Math.max(0, (summary.avgBrier - 0.18) * 0.8);

    calibrationPenalty = Math.max(
      calibrationPenalty,
      Math.min(MAX_CALIBRATION_PENALTY * 0.9, summaryPenalty)
    );
  }

  return calibrationPenalty;
}
```

---

# 12. `src/utils/coachLogic.js`

## 12.1. Substituir `getCombinedHistory` completo

Localizar:

```js
export function getCombinedHistory(history, simulados) {
```

Substituir a função inteira por:

```js
export function getCombinedHistory(history, simulados) {
  const deduplicatedMap = new Map();
  const allSimulados = [...(simulados || [])];

  allSimulados.forEach((s, idx) => {
    const safeScore = getSafeScore(s, 100);

    const key = `${s.id || `sim-no-id-${idx}`}|${s.date || s.createdAt}|${
      Number.isFinite(safeScore) ? safeScore.toFixed(2) : '0.00'
    }`;

    deduplicatedMap.set(key, { ...s, type: 'simulado' });
  });

  const hasSimuladoForDate = new Set(
    allSimulados
      .map(s => getDateKey(s.date || s.createdAt))
      .filter(Boolean)
  );

  const rowsByDate = {};

  (history || []).forEach(r => {
    const dKey = getDateKey(r.date || r.createdAt);

    if (dKey && !hasSimuladoForDate.has(dKey)) {
      if (!rowsByDate[dKey]) rowsByDate[dKey] = { correct: 0, total: 0 };

      rowsByDate[dKey].correct += (Number(r.correct) || 0);
      rowsByDate[dKey].total += (Number(r.total) || 0);
    }
  });

  Object.entries(rowsByDate).forEach(([dKey, stats]) => {
    if (stats.total > 0) {
      const score = (stats.correct / stats.total) * 100;
      const key = `legacy-${dKey}|${dKey}|${score.toFixed(2)}`;

      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, {
          id: `legacy-${dKey}`,
          date: dKey,
          score,
          type: 'simulado'
        });
      }
    }
  });

  return getSortedHistory(Array.from(deduplicatedMap.values()));
}
```

---

## 12.2. Corrigir `generateDailyGoals` para usar `targetScoreLabel`

Localizar:

```js
export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
  const targetScore = options.targetScore ?? 80;
  const maxScore = options.maxScore ?? 100;
```

Substituir por:

```js
export const generateDailyGoals = (categories, simulados, studyLogs = [], options = {}) => {
  const targetScore = options.targetScore ?? 80;
  const targetScoreLabel = options.targetScoreLabel ?? targetScore;
  const maxScore = options.maxScore ?? 100;
```

Depois localizar:

```js
details: `Apenas ${probPct}% de chance de bater a meta de ${targetScore}% em 90 dias.`,
```

Substituir por:

```js
details: `Apenas ${probPct}% de chance de bater a meta de ${targetScoreLabel}% em 90 dias.`,
```

---

# 13. `src/pages/Coach.jsx`

## 13.1. Adicionar helper fora do componente

Adicionar antes de `export default function Coach()`:

```js
function resolveTargetScorePoints({ user, minScore = 0, maxScore = 100 }) {
  const safeMax = Math.max(1, Number(maxScore) || 100);
  const safeMin = Math.min(Number(minScore) || 0, safeMax);

  const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number(value) || 0));

  if (user?.targetScore != null && Number.isFinite(Number(user.targetScore))) {
    let ts = Number(user.targetScore);

    if (ts > safeMax && ts <= 100) {
      ts = (ts / 100) * safeMax;
    }

    return clamp(ts);
  }

  if (user?.targetProbability != null && Number.isFinite(Number(user.targetProbability))) {
    return clamp((Number(user.targetProbability) / 100) * safeMax);
  }

  return clamp(safeMax * 0.8);
}
```

---

## 13.2. Adicionar metas normalizadas dentro do componente

Localizar:

```js
const currentMaxScore = data?.maxScore ?? 100;
```

Logo depois adicionar:

```js
const targetScorePoints = useMemo(() => resolveTargetScorePoints({
  user: userProfile,
  minScore: data?.minScore,
  maxScore: currentMaxScore
}), [userProfile, data?.minScore, currentMaxScore]);

const targetScoreLabel = useMemo(() => {
  const safeMax = Math.max(1, Number(currentMaxScore) || 100);
  return Math.round((targetScorePoints / safeMax) * 100);
}, [targetScorePoints, currentMaxScore]);
```

---

## 13.3. Substituir `targetScore` do `useMonteCarloStats`

Localizar:

```js
const mcStats = useMonteCarloStats({
  categories: categories,
  goalDate: userProfile?.goalDate,
  targetScore: userProfile?.targetProbability ?? 85,
```

Substituir por:

```js
const mcStats = useMonteCarloStats({
  categories: categories,
  goalDate: userProfile?.goalDate,
  targetScore: targetScorePoints,
```

---

## 13.4. Substituir início do effect de análise

Localizar dentro do effect:

```js
const targetScore = userProfile?.targetProbability ?? 85;
```

Substituir por:

```js
const targetScore = targetScorePoints;
```

Localizar:

```js
maxScore: data.maxScore ?? 100,
```

Substituir por:

```js
maxScore: currentMaxScore,
```

E adicionar no objeto de opções:

```js
targetScoreLabel,
```

O trecho deve ficar assim:

```js
const result = getSuggestedFocus(
  categories,
  history,
  studyLogs,
  {
    user: data.user,
    targetScore,
    targetScoreLabel,
    maxScore: currentMaxScore,
    calibrationHistoryByCategory: calibrationHistoryRef.current,
    flashcardDecks: flashcardDecks,
    flashcardDue,
    onCalibrationMetric: (metric) => collectedMetrics.push(metric),
    globalMcStats: mcStatsContextRef.current,
    config: {
      MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
    }
  }
);
```

---

## 13.5. Atualizar dependências do effect de análise

Remover:

```js
userProfile?.targetProbability,
```

Adicionar:

```js
targetScorePoints,
targetScoreLabel,
currentMaxScore,
```

---

## 13.6. Substituir início do `handleGenerateGoals`

Localizar dentro do timeout:

```js
const targetScore = userProfile?.targetProbability ?? 85;
```

Substituir por:

```js
const targetScore = targetScorePoints;
```

Localizar:

```js
maxScore: data.maxScore ?? 100,
```

Substituir por:

```js
maxScore: currentMaxScore,
```

E adicionar:

```js
targetScoreLabel,
```

O trecho deve ficar assim:

```js
const newTasks = generateDailyGoals(
  categories,
  history,
  studyLogs,
  {
    user: data.user,
    targetScore,
    targetScoreLabel,
    maxScore: currentMaxScore,
    calibrationHistoryByCategory: calibrationHistoryRef.current,
    onCalibrationMetric: (metric) => collectedMetrics.push(metric),
    config: {
      MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
    }
  }
);
```

---

## 13.7. Atualizar dependências do `handleGenerateGoals`

Remover:

```js
userProfile?.targetProbability,
```

Adicionar:

```js
targetScorePoints,
targetScoreLabel,
currentMaxScore,
```

---

## 13.8. Corrigir rate-limit de calibração por categoria

Localizar:

```js
const lastPersistRef = useRef(0);
```

Substituir por:

```js
const lastPersistByCategoryRef = useRef(new Map());
```

Depois localizar o início de `persistCalibrationMetric` e substituir o começo por:

```js
const persistCalibrationMetric = useCallback((metric) => {
  if (!isMountedRef.current || !metric) return;

  const now = Date.now();
  const rawCategoryId = metric?.categoryId || metric?.categoryName;

  if (!rawCategoryId) return;

  const normalizedCategoryId = getSafeId(rawCategoryId);

  const lastAt = Number(lastPersistByCategoryRef.current.get(normalizedCategoryId) || 0);

  if (now - lastAt < 500) return;

  lastPersistByCategoryRef.current.set(normalizedCategoryId, now);

  if (lastPersistByCategoryRef.current.size > 200) {
    const oldestKey = lastPersistByCategoryRef.current.keys().next().value;
    lastPersistByCategoryRef.current.delete(oldestKey);
  }

  const toFinite = (value, fallback = null) => {
    if (value === null || value === undefined || value === '') return fallback;

    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const metricTimestamp = metric?.timestamp || now;

  const avgBrier = toFinite(metric?.avgBrier, null);
  const ece = toFinite(metric?.ece, null);
  const probability = toFinite(metric?.probability, null);
  const calibrationPenalty = toFinite(metric?.calibrationPenalty, 0);
  const reliability = Array.isArray(metric?.reliability) ? metric.reliability : [];

  const isDegraded = metric?.degraded === true || calibrationPenalty >= HIGH_PENALTY_THRESHOLD;

  const hasUsefulSignal =
    avgBrier !== null ||
    ece !== null ||
    probability !== null ||
    calibrationPenalty > 0 ||
    reliability.length > 0;

  if (!hasUsefulSignal) return;

  const normalizedMetric = {
    ...metric,
    categoryId: normalizedCategoryId,
    categoryName: metric?.categoryName || normalizedCategoryId,
    timestamp: metricTimestamp,
    avgBrier,
    ece,
    probability,
    calibrationPenalty,
    reliability
  };
```

**Importante:** remover a linha posterior que declara novamente:

```js
const normalizedCategoryId = getSafeId(metric?.categoryId || metric?.categoryName);
```

O restante da função permanece igual.
consegue implementar antes do limite ser atingido ?
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-07-21T02:39:21-04:00.

The user's current state is as follows:
Active Document: d:\Downloads\ultra-patched\diff.patch (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- d:\Downloads\ultra-patched\src\components\AICoachWidget.jsx (LANGUAGE_JAVASCRIPT)
- d:\Downloads\ultra-patched\src\components\EvolutionChart.jsx (LANGUAGE_JAVASCRIPT)
- d:\Downloads\ultra-patched\src\hooks\useChartData.js (LANGUAGE_JAVASCRIPT)
- d:\Downloads\ultra-patched\src\engine\insightGenerator.js (LANGUAGE_JAVASCRIPT)
- d:\chat-export-1784609160045.json (LANGUAGE_JSON)
</ADDITIONAL_METADATA>