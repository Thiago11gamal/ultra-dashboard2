import { describe, it, expect } from 'vitest';
import { kalmanAbilityTrend } from '../src/engine/probabilistic/stateSpace.js';

describe('stateSpace exports', () => {
  it('exports kalmanAbilityTrend with a valid result object', () => {
    const result = kalmanAbilityTrend([
      { score: 50, date: '2024-01-01' },
      { score: 52, date: '2024-01-08' },
      { score: 55, date: '2024-01-15' },
      { score: 58, date: '2024-01-22' },
    ], { maxScore: 100, minScore: 0 });

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('ability');
    expect(result).toHaveProperty('trendPerMonth');
    expect(Number.isFinite(result.ability)).toBe(true);
  });
});
