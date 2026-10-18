import { describe, expect, it } from 'vitest';
import { resolveStatus, shouldSkipForMissingBrowser } from '../scripts/lib/evolutionE2E.js';

describe('evolutionE2E helpers', () => {
  it('detects missing browser messages', () => {
    expect(shouldSkipForMissingBrowser("Executable doesn't exist")).toBe(true);
    expect(shouldSkipForMissingBrowser('Please run the following command to download new browsers')).toBe(true);
    expect(shouldSkipForMissingBrowser('Some other failure')).toBe(false);
  });

  it('resolves statuses correctly', () => {
    expect(resolveStatus({ status: 0, error: null, output: '' })).toBe(0);
    expect(resolveStatus({ status: 1, error: null, output: "Executable doesn't exist" })).toBe(0);
    expect(resolveStatus({ status: 1, error: null, output: 'Assertion failed' })).toBe(1);
    expect(resolveStatus({ status: 0, error: new Error('boom'), output: '' })).toBe(1);
  });
});
