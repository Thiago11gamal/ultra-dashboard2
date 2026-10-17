import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMonteCarloStats } from '../useMonteCarloStats';
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
});
