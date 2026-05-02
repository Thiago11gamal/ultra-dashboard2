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

  it('computes calibrated error and compares candidate vs baseline', () => {
    const ce = computeCalibratedError([{ pred: 0.8, obs: true }, { pred: 0.2, obs: false }]);
    expect(ce).toBeGreaterThanOrEqual(0);
    const cmp = compareStrategyRuns({
      baseline: { ndcgAt5: 0.6, uplift: 0.1, calibratedError: 0.25 },
      candidate: { ndcgAt5: 0.7, uplift: 0.2, calibratedError: 0.2 }
    });
    expect(cmp.winner).toBe('candidate');
  });
});
