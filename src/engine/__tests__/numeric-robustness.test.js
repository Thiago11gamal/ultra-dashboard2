import { describe, it, expect } from 'vitest';
import { sampleTruncatedNormal, ensurePositiveSemiDefinite, choleskyDecomposition } from '../math/gaussian.js';
import { getPercentile } from '../math/percentile.js';

describe('Numeric robustness: sampleTruncatedNormal fallback RNG', () => {
  it('falls back to Math.random when rng not provided and stays within bounds', () => {
    for (let i = 0; i < 1000; i++) {
      const s = sampleTruncatedNormal(50, 10, 0, 100);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
      expect(Number.isFinite(s)).toBe(true);
    }
  });
});

describe('Numeric robustness: ensurePositiveSemiDefinite iterative jitter', () => {
  it('returns a matrix that Cholesky can decompose (diagonal finite and > 0)', () => {
    const base = [[1e-9, 1e-9],[1e-9, 1e-9]]; // near-singular
    const psd = ensurePositiveSemiDefinite(base);
    const L = choleskyDecomposition(psd);
    expect(L[0][0]).toBeGreaterThan(0);
    expect(L[1][1]).toBeGreaterThan(0);
    expect(Number.isFinite(L[0][0])).toBe(true);
    expect(Number.isFinite(L[1][1])).toBe(true);
  });
});

describe('Numeric robustness: getPercentile with TypedArray containing NaN', () => {
  it('computes median ignoring NaNs when isAlreadySorted=true', () => {
    const arr = new Float64Array([NaN, 1, 2, 3, NaN]);
    const p = getPercentile(arr, 0.5, true);
    expect(Number.isFinite(p)).toBe(true);
    expect(p).toBeGreaterThanOrEqual(1);
    expect(p).toBeLessThanOrEqual(3);
  });
});
