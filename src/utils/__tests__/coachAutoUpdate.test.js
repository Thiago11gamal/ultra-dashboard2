import { describe, it, expect } from 'vitest';
import { generateDailyGoals, getSuggestedFocus, getCombinedHistory } from '../coachLogic';
import { ensureCoachTaskId } from '../coachTaskId';
import { getSafeId } from '../idGenerator';

describe('Coach AI Automatic Update Lifecycle', () => {
  const baseCategories = [
    { id: 'cat-1', name: 'Direito Constitucional', maxScore: 100, minScore: 0, weight: 1 },
    { id: 'cat-2', name: 'Direito Administrativo', maxScore: 100, minScore: 0, weight: 1 }
  ];

  it('generates goals automatically when categories exist even without simulados', () => {
    const goals = generateDailyGoals(baseCategories, [], [], { maxScore: 100, minScore: 0 });
    expect(goals).toBeDefined();
    expect(Array.isArray(goals)).toBe(true);
    expect(goals.length).toBeGreaterThan(0);
  });

  it('updates suggested focus and goals automatically when a new simulado is added', () => {
    // Initial state: low score in cat-1, high score in cat-2
    const initialSimulados = [
      { id: 'sim-1', categoryId: 'cat-1', categoryName: 'Direito Constitucional', date: '2026-10-01', score: 30 },
      { id: 'sim-2', categoryId: 'cat-2', categoryName: 'Direito Administrativo', date: '2026-10-01', score: 85 }
    ];
    const initialCombined = getCombinedHistory(initialSimulados, initialSimulados, 100, 0);
    const initialGoals = generateDailyGoals(baseCategories, initialCombined, [], { maxScore: 100, minScore: 0 });
    const initialFocus = getSuggestedFocus(baseCategories, initialCombined, [], { maxScore: 100, minScore: 0 });

    expect(initialGoals.length).toBeGreaterThan(0);
    expect(initialFocus).toBeDefined();
    expect(initialFocus.id || initialFocus.categoryId).toBe('cat-1');

    // Updated state: cat-1 improved to 95 and cat-2 dropped to 20
    const updatedSimulados = [
      ...initialSimulados,
      { id: 'sim-3', categoryId: 'cat-1', categoryName: 'Direito Constitucional', date: '2026-10-25', score: 95 },
      { id: 'sim-4', categoryId: 'cat-2', categoryName: 'Direito Administrativo', date: '2026-10-25', score: 20 }
    ];
    const updatedCombined = getCombinedHistory(updatedSimulados, updatedSimulados, 100, 0);
    const updatedGoals = generateDailyGoals(baseCategories, updatedCombined, [], { maxScore: 100, minScore: 0 });
    const updatedFocus = getSuggestedFocus(baseCategories, updatedCombined, [], { maxScore: 100, minScore: 0 });

    // The focus should have shifted from cat-1 to cat-2 because cat-2 is now the weakest
    expect(updatedFocus).toBeDefined();
    expect(updatedGoals).toBeDefined();
    expect(updatedFocus.id || updatedFocus.categoryId).toBe('cat-2');
  });

  it('preserves user assignments on weekly planner during automatic plan updates', () => {
    const goals = generateDailyGoals(baseCategories, [], [], { maxScore: 100, minScore: 0 });
    const firstTask = goals[0];
    const firstSid = getSafeId(ensureCoachTaskId(firstTask));

    // Simulate user having dragged firstTask into Monday
    const existingPlanner = {
      mon: [firstTask],
      tue: [], wed: [], thu: [], fri: [], sat: [], sun: []
    };

    const assignedTasks = [];
    const assignedIds = new Set();
    Object.values(existingPlanner).forEach(dayArr => {
      dayArr.forEach(t => {
        const sid = getSafeId(ensureCoachTaskId(t));
        if (sid) {
          assignedIds.add(sid);
          assignedTasks.push(t);
        }
      });
    });

    expect(assignedIds.has(firstSid)).toBe(true);

    // Merge logic used in Coach.jsx
    const nextPlan = [
      ...assignedTasks,
      ...goals.filter(t => {
        const sid = getSafeId(ensureCoachTaskId(t));
        return sid && !assignedIds.has(sid);
      })
    ];

    // Assigned task is retained at the beginning (for Monday) and not duplicated in backlog
    const matchesOfFirstTask = nextPlan.filter(t => getSafeId(ensureCoachTaskId(t)) === firstSid);
    expect(matchesOfFirstTask.length).toBe(1);
    expect(nextPlan.length).toBe(goals.length);
  });

  it('preserves completed status of tasks when plan is recomputed', () => {
    const initialGoals = generateDailyGoals(baseCategories, [], [], { maxScore: 100, minScore: 0 });
    const taskToComplete = initialGoals[0];
    const targetSid = getSafeId(ensureCoachTaskId(taskToComplete));

    const existingPlan = initialGoals.map(t => {
      if (getSafeId(ensureCoachTaskId(t)) === targetSid) {
        return { ...t, completed: true, completedAt: '2026-10-31T12:00:00Z' };
      }
      return t;
    });

    const existingCompletedMap = new Map();
    existingPlan.forEach(t => {
      if (t && t.completed) {
        const sid = getSafeId(ensureCoachTaskId(t));
        if (sid) existingCompletedMap.set(sid, t);
      }
    });

    // Recomputed new tasks from fresh analysis
    const freshTasks = generateDailyGoals(baseCategories, [], [], { maxScore: 100, minScore: 0 });
    const nextPlan = freshTasks.map(t => {
      const sid = getSafeId(ensureCoachTaskId(t));
      const prevCompleted = sid ? existingCompletedMap.get(sid) : null;
      if (prevCompleted) {
        return { ...t, completed: true, completedAt: prevCompleted.completedAt };
      }
      return t;
    });

    const completedInNext = nextPlan.find(t => getSafeId(ensureCoachTaskId(t)) === targetSid);
    expect(completedInNext).toBeDefined();
    expect(completedInNext.completed).toBe(true);
    expect(completedInNext.completedAt).toBe('2026-10-31T12:00:00Z');
  });

  it('detects when plan has actually changed vs unchanged to prevent infinite loops', () => {
    const goals1 = generateDailyGoals(baseCategories, [], [], { maxScore: 100, minScore: 0 });
    const goals2 = [...goals1];

    const hasChangedIdentical = goals1.length !== goals2.length ||
      goals1.some((t, i) => {
        const next = goals2[i];
        if (!next) return true;
        const sid1 = getSafeId(ensureCoachTaskId(t));
        const sid2 = getSafeId(ensureCoachTaskId(next));
        return sid1 !== sid2 ||
          t.text !== next.text ||
          t.priority !== next.priority ||
          Boolean(t.completed) !== Boolean(next.completed);
      });

    expect(hasChangedIdentical).toBe(false);

    // Now change one task's text
    const goalsModified = goals1.map((t, idx) => idx === 0 ? { ...t, text: t.text + ' (urgente)' } : t);
    const hasChangedModified = goals1.length !== goalsModified.length ||
      goals1.some((t, i) => {
        const next = goalsModified[i];
        if (!next) return true;
        const sid1 = getSafeId(ensureCoachTaskId(t));
        const sid2 = getSafeId(ensureCoachTaskId(next));
        return sid1 !== sid2 ||
          t.text !== next.text ||
          t.priority !== next.priority ||
          Boolean(t.completed) !== Boolean(next.completed);
      });

    expect(hasChangedModified).toBe(true);
  });
});
