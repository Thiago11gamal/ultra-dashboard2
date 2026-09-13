import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repairContestHistory, validateAppState } from '../src/store/schemas.js';
import { applyAIResultsToDraft } from '../src/utils/aiSaveHelper.js';
import { useAppStore, clearAllDataSecure } from '../src/store/useAppStore.js';
import { getDateKey, normalizeDate } from '../src/utils/dateHelper.js';
import { computeHurstExponent } from '../src/engine/diagnostics.js';
import { stopCleanup } from '../src/hooks/useMonteCarloWorker.js';
import { addCategoryTombstones, isCategoryTombstoned, getCategoryTombstones } from '../src/utils/tombstones.js';

describe('Comprehensive Bug Fixes Verification (BUG-01 to BUG-11)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('BUG-01: repairContestHistory preserves score-only records (rawTotal === 0 && rawScore > 0)', () => {
    const rawCategories = [
      {
        id: 'cat-1',
        name: 'Direito Constitucional',
        simuladoStats: {
          history: []
        }
      }
    ];

    const repaired = repairContestHistory({
      categories: rawCategories,
      simuladoRows: [
        {
          id: 'row-1',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          date: '2026-05-10',
          score: 85,
          correct: 0,
          total: 0
        }
      ],
      simulados: []
    });

    expect(repaired.categories[0].simuladoStats.history.length).toBe(1);
    expect(repaired.categories[0].simuladoStats.history[0].score).toBe(85);
  });

  it('BUG-02: applyAIResultsToDraft deduplicates same-day rows when one side has taskId and the other has null', () => {
    const todayKey = getDateKey(normalizeDate(new Date()));
    const draft = {
      maxScore: 100,
      minScore: 0,
      simuladoRows: [
        {
          id: 'row-1',
          date: todayKey,
          subject: 'Português',
          topic: 'Pontuação',
          categoryId: 'cat-1',
          taskId: 'existing-task-id',
          correct: 7,
          total: 10,
          score: 70,
          source: 'ai-generated'
        }
      ],
      categories: [
        { id: 'cat-1', name: 'Português', simuladoStats: { history: [] } }
      ]
    };

    // Submitting free questions without taskId
    const formData = {
      materia: 'Português',
      assunto: 'Pontuação',
      categoryId: 'cat-1',
      taskId: null
    };

    applyAIResultsToDraft(draft, formData, 8, 10, 120, true);

    // Must merge into existing row without creating a duplicate
    expect(draft.simuladoRows.length).toBe(1);
    expect(draft.simuladoRows[0].correct).toBe(8);
  });

  it('BUG-05: clearAllDataSecure operates safely even when window.indexedDB.databases is unavailable', async () => {
    const originalIndexedDB = window.indexedDB;
    // Mock indexedDB without databases()
    window.indexedDB = {
      deleteDatabase: vi.fn().mockReturnValue({
        set onsuccess(cb) { cb(); },
        set onerror(cb) {},
        set onblocked(cb) {}
      })
    };

    await expect(clearAllDataSecure()).resolves.not.toThrow();

    window.indexedDB = originalIndexedDB;
  });

  it('BUG-06: resetStore preserves contest-level settings', () => {
    const store = useAppStore.getState();
    const activeId = store.appState.activeId;
    
    // Set custom settings
    useAppStore.setState(state => {
      state.appState.contests[activeId].settings.pomodoroWork = 45;
      return state;
    });

    store.resetStore();

    const currentSettings = useAppStore.getState().appState.contests[useAppStore.getState().appState.activeId].settings;
    expect(currentSettings.pomodoroWork).toBe(45);
  });

  it('BUG-07: Tombstones prevent resurrection of deleted categories after emptyTrash', () => {
    addCategoryTombstones({ id: 'deleted-cat-123', name: 'Direito Penal' });
    
    const isTombstoned = isCategoryTombstoned('deleted-cat-123', 'Direito Penal', 1000);
    expect(isTombstoned).toBe(true);

    const isNonExistentTombstoned = isCategoryTombstoned('active-cat-456', 'Matemática', 1000);
    expect(isNonExistentTombstoned).toBe(false);
  });

  it('BUG-08: toggleNeuralTask sets completedAt and awardedXP, and prevents duplicate XP awarding', () => {
    const store = useAppStore.getState();
    const activeId = store.appState.activeId;

    let totalAwarded = 0;
    store.awardExperience = (xp) => { totalAwarded += xp; };

    // Setup a task in coachPlan and coachPlanner with the same ID
    useAppStore.setState(state => {
      state.appState.contests[activeId].coachPlan = [
        { id: 'shared-task-1', title: 'Revisão Geral', completed: false }
      ];
      state.appState.contests[activeId].coachPlanner = {
        seg: [{ id: 'shared-task-1', title: 'Revisão Geral', completed: false }]
      };
      return state;
    });

    store.toggleNeuralTask('shared-task-1');

    const state = useAppStore.getState();
    const planTask = state.appState.contests[activeId].coachPlan[0];
    const plannerTask = state.appState.contests[activeId].coachPlanner.seg[0];

    expect(planTask.completed).toBe(true);
    expect(planTask.completedAt).toBeTruthy();
    expect(planTask.awardedXP).toBeGreaterThan(0);

    expect(plannerTask.completed).toBe(true);
    expect(plannerTask.completedAt).toBeTruthy();
    expect(plannerTask.awardedXP).toBeGreaterThan(0);

    // Should only have awarded XP once for this ID
    expect(totalAwarded).toBe(planTask.awardedXP);
  });

  it('BUG-09: getDateKey returns null for falsy, empty, or invalid dates', () => {
    expect(getDateKey(null)).toBeNull();
    expect(getDateKey(undefined)).toBeNull();
    expect(getDateKey('')).toBeNull();
    expect(getDateKey('   ')).toBeNull();
    expect(getDateKey('invalid-date-string')).toBeNull();
    expect(getDateKey('2026-05-08')).toBe('2026-05-08');
  });

  it('BUG-10: computeHurstExponent returns finite number without throwing on flat or small series', () => {
    const flatSeries = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
    const result = computeHurstExponent(flatSeries);
    expect(Number.isFinite(result.H)).toBe(true);
    expect(result.H).toBeGreaterThanOrEqual(0.1);
    expect(result.H).toBeLessThanOrEqual(0.9);
  });

  it('BUG-11: stopCleanup runs cleanly without errors', () => {
    expect(() => stopCleanup()).not.toThrow();
  });
});
