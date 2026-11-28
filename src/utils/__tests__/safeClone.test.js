import { describe, expect, it } from 'vitest';
import { safeClone } from '../safeClone.js';

describe('safeClone fallback', () => {
  it('preserves shared references, cycles, and ISO strings without cloning functions', () => {
    const shared = { value: 7 };
    const source = {
      first: shared,
      second: shared,
      timestamp: '2026-11-28T10:00:00.000Z',
      date: new Date('2026-11-28T10:00:00.000Z'),
      callback: () => {}
    };
    source.self = source;

    const cloned = safeClone(source);

    expect(cloned.first).toEqual({ value: 7 });
    expect(cloned.second).toBe(cloned.first);
    expect(cloned.self).toBe(cloned);
    expect(cloned.timestamp).toBe(source.timestamp);
    expect(cloned.timestamp).not.toBeInstanceOf(Date);
    expect(cloned.date).toEqual(source.date);
    expect(cloned.callback).toBeUndefined();
  });
});
