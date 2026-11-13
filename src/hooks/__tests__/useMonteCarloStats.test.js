import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMonteCarloStats } from '../useMonteCarloStats';
import { useAppStore } from '../../store/useAppStore.js';
import { getDateKey } from '../../utils/dateHelper.js';
import { normalCDF_complement } from '../../engine/math/gaussian.js';

describe('useMonteCarloStats', () => {
  it('imports normalCDF_complement correctly and computes pTrend without ReferenceError', () => {
    expect(typeof normalCDF_complement).toBe('function');
    expect(normalCDF_complement(0)).toBeCloseTo(0.5, 2);

    const categories = [{
      id: 'cat1',
      name: 'Direito Constitucional',
      maxScore: 100,
      minScore: 0,
      simuladoStats: {
        history: [
          { date: '2026-07-01', score: 70, total: 20, correct: 14 },
          { date: '2026-07-05', score: 85, total: 20, correct: 17 },
          { date: '2026-07-10', score: 75, total: 20, correct: 15 }
        ]
      }
    }];

    const { result } = renderHook(() =>
      useMonteCarloStats({
        categories,
        goalDate: '2026-12-31',
        targetScore: 80,
        timeIndex: 0,
        timelineDates: ['2026-07-01', '2026-07-05', '2026-07-10'],
        minScore: 0,
        maxScore: 100,
        effectiveSimulateToday: true,
        simuladoRows: []
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.pTrend).toBeDefined();
    expect(Number.isFinite(result.current.pTrend)).toBe(true);
    expect(result.current.pTrend).toBeGreaterThanOrEqual(0);
    expect(result.current.pTrend).toBeLessThanOrEqual(100);
  });

  it('skips duplicate same-day unresolved global calibrationEvents across re-mounts when prediction is unchanged', async () => {
    const today = getDateKey(new Date());
    const futureGoal = '2027-12-31';
    const categories = [{
      id: 'cat1',
      name: 'Direito Constitucional',
      maxScore: 100,
      minScore: 0,
      simuladoStats: {
        history: [
          { date: '2026-07-01', score: 70, total: 20, correct: 14 },
          { date: '2026-07-05', score: 78, total: 20, correct: 15.6 },
          { date: '2026-07-10', score: 82, total: 20, correct: 16.4 },
          { date: '2026-07-15', score: 85, total: 20, correct: 17 },
          { date: '2026-07-20', score: 88, total: 20, correct: 17.6 }
        ]
      }
    }];

    useAppStore.setState((s) => ({
      appState: {
        ...s.appState,
        activeId: 'mc-dedup',
        version: 10,
        contests: {
          ...s.appState.contests,
          'mc-dedup': {
            contestName: 'MC Dedup',
            maxScore: 100,
            minScore: 0,
            categories,
            simuladoRows: [],
            calibrationEvents: [],
            monteCarloHistory: [{ date: today, probability: 80, ci95Low: 70, ci95High: 90, target: 80 }],
          }
        }
      }
    }));

    const first = renderHook(() => useMonteCarloStats({
      categories,
      goalDate: futureGoal,
      targetScore: 80,
      timeIndex: -1,
      timelineDates: [],
      minScore: 0,
      maxScore: 100,
      effectiveSimulateToday: false,
      simuladoRows: []
    }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    first.unmount();

    const afterFirstEvents = useAppStore.getState().appState.contests['mc-dedup'].calibrationEvents.length;
    const versionAfterFirst = useAppStore.getState().appState.version;

    const second = renderHook(() => useMonteCarloStats({
      categories,
      goalDate: futureGoal,
      targetScore: 80,
      timeIndex: -1,
      timelineDates: [],
      minScore: 0,
      maxScore: 100,
      effectiveSimulateToday: false,
      simuladoRows: []
    }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    second.unmount();

    expect(afterFirstEvents).toBeLessThanOrEqual(1);
    expect(useAppStore.getState().appState.contests['mc-dedup'].calibrationEvents.length).toBe(afterFirstEvents);
    expect(useAppStore.getState().appState.version).toBe(versionAfterFirst);
  });
});
