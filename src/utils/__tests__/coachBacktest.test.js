import { describe, it, expect } from 'vitest';
import { computeNDCGAtK, computeUplift, computeCalibratedError, compareStrategyRuns } from '../coachBacktest.js';

describe('coach offline backtest metrics', () => {
  it('computes ndcg@k in [0,1]', () => {
    const predicted = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const actual = [{ id: 'a', relevance: 3 }, { id: 'b', relevance: 2 }, { id: 'c', relevance: 1 }];
    const ndcg = computeNDCGAtK(predicted, actual, 3);
    expect(ndcg).toBeGreaterThanOrEqual(0);
    expect(ndcg).toBeLessThanOrEqual(1);
  });

  it('computes uplift as treatment-control mean delta', () => {
    expect(computeUplift([1, 2, 3], [2, 3, 4])).toBeCloseTo(1, 6);
  });

  it('computes calibrated error and compares strategies', () => {
    const ce = computeCalibratedError(0.8, true);
    expect(ce).toBeCloseTo(0.2, 6);
    
    const runA = { 
        predicted: [{ id: 'a' }, { id: 'b' }], 
        actual: [{ id: 'a', relevance: 1 }, { id: 'b', relevance: 3 }] 
    };
    const runB = { 
        predicted: [{ id: 'b' }, { id: 'a' }], 
        actual: [{ id: 'a', relevance: 1 }, { id: 'b', relevance: 3 }] 
    };
    const cmp = compareStrategyRuns(runA, runB, ['ndcg']);
    expect(cmp.winner).toBe('B');
    expect(cmp.delta.ndcg).toBeGreaterThan(0);
  });
});
