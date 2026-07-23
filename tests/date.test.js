import { describe, it, expect } from 'vitest';
import {
  safeDate,
  ageInDays,
  ageInHours,
  isSameLocalDay,
  getLocalMidnight
} from '../src/engine/math/date';

describe('Safe Date Core (date.js)', () => {
  it('safeDate should return null for invalid dates', () => {
    expect(safeDate("invalid")).toBeNull();
    expect(safeDate(null)).toBeNull();
    expect(safeDate(new Date())).toBeInstanceOf(Date);
  });

  it('ageInDays should not return negative days', () => {
    const futureDate = new Date(Date.now() + 86400000 * 5); // +5 days
    expect(ageInDays(futureDate)).toBe(0);
    
    const pastDate = new Date(Date.now() - 86400000 * 5); // -5 days
    expect(ageInDays(pastDate)).toBeGreaterThan(0);
  });

  it('ageInHours should not return negative hours', () => {
    const futureDate = new Date(Date.now() + 3600000 * 5); // +5 hours
    expect(ageInHours(futureDate)).toBe(0);
  });

  it('isSameLocalDay should verify if two dates are on the same day', () => {
    const today1 = new Date();
    const today2 = new Date();
    expect(isSameLocalDay(today1, today2)).toBe(true);

    const tomorrow = new Date(Date.now() + 86400000);
    expect(isSameLocalDay(today1, tomorrow)).toBe(false);
  });

  it('getLocalMidnight should reset hours', () => {
    const d = getLocalMidnight(new Date());
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });
});
