import { describe, it, expect } from 'vitest';
import { computeFlashcardDueForecast, getFlashcardDueTodayCount, getFlashcardMasteryPct } from '../analytics';
import { getFlashcardTodayKey, getFlashcardNextDueKey } from '../dateHelper';

describe('Due Forecast + Flashcard date helpers', () => {
  const todayKey = getFlashcardTodayKey();
  const tomorrowKey = getFlashcardNextDueKey(1);

  const sampleDecks = [
    {
      id: 'd1',
      cards: [
        { id: 'c1', due: todayKey, reviews: 5, interval: 10 }, // due today
        { id: 'c2', due: '1999-01-01', reviews: 1, interval: 1 }, // overdue -> today
        { id: 'c3', due: tomorrowKey, reviews: 0, interval: 1 },
        { id: 'c4', due: getFlashcardNextDueKey(5), reviews: 4, interval: 7 }, // mastered-ish
      ]
    },
    { id: 'd2', cards: [] }
  ];

  it('getFlashcardTodayKey returns valid YYYY-MM-DD', () => {
    expect(todayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getFlashcardNextDueKey returns future consistent key', () => {
    expect(tomorrowKey).not.toBe(todayKey);
    expect(tomorrowKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('computeFlashcardDueForecast buckets overdue into today and produces horizon days', () => {
    const res = computeFlashcardDueForecast(sampleDecks, 5);
    expect(res.forecast.length).toBe(5);
    expect(res.forecast[0].count).toBeGreaterThanOrEqual(2); // today + overdue
    expect(res.maxDaily).toBeGreaterThanOrEqual(0); // 0 is allowed
    expect(res.totalDueInHorizon).toBeGreaterThan(0);
    expect(res.horizon).toBe(5);
  });

  it('getFlashcardDueTodayCount counts correctly (includes overdue)', () => {
    expect(getFlashcardDueTodayCount(sampleDecks)).toBe(2);
  });

  it('getFlashcardMasteryPct uses >=3 reviews && interval >=6', () => {
    // c1 (5r/10i) and c4 (4r/7i) qualify
    expect(getFlashcardMasteryPct(sampleDecks)).toBe(50); // 2 out of 4
  });

  it('handles empty decks gracefully', () => {
    const empty = computeFlashcardDueForecast([], 3);
    expect(empty.forecast.length).toBe(3);
    expect(empty.totalDueInHorizon).toBe(0);
    expect(empty.maxDaily).toBe(0);
  });

  it('horizon=0 returns empty forecast array', () => {
    const res = computeFlashcardDueForecast(sampleDecks, 0);
    expect(Array.isArray(res.forecast)).toBe(true);
    expect(res.forecast.length).toBe(0);
    expect(res.horizon).toBe(0);
    expect(res.maxDaily).toBe(0);
  });
});
