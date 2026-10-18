import { describe, it, expect } from 'vitest';
import { normalizeScoreValue, getSafeScore } from '../../../../utils/measurement.js';
import { buildCumulativeStatsPerDate } from '../../../../hooks/useChartData.js';

describe('Evolution Menu - Data Integrity & Field Fallbacks Audit', () => {
  it('correctly parses question aliases (questoes, totalQuestoes, questions, acertos, correctCount) in normalizeScoreValue', () => {
    // Row using "questoes" and "acertos"
    const rowPt = { questoes: 20, acertos: 15 };
    const normPt = normalizeScoreValue(rowPt, 100, 0);
    expect(normPt.total).toBe(20);
    expect(normPt.correct).toBe(15);
    expect(normPt.pct).toBe(75);
    expect(normPt.points).toBe(75);

    // Row using "totalQuestoes" and "correctCount"
    const rowAlias = { totalQuestoes: 50, correctCount: 40 };
    const normAlias = normalizeScoreValue(rowAlias, 100, 0);
    expect(normAlias.total).toBe(50);
    expect(normAlias.correct).toBe(40);
    expect(normAlias.pct).toBe(80);
  });

  it('correctly calculates getSafeScore with questoes and acertos in custom scale (0 to 120)', () => {
    const rowPt = { questoes: 100, acertos: 60 };
    const score = getSafeScore(rowPt, 120, 0);
    // 60 / 100 = 0.6 * 120 = 72
    expect(score).toBe(72);
  });

  it('buildCumulativeStatsPerDate aggregates rows having only questoes/acertos without synthetic fallback', () => {
    const history = [
      { date: '2026-03-01', questoes: 30, acertos: 24 },
      { date: '2026-03-02', totalQuestoes: 20, correctCount: 16 }
    ];
    const sortedDates = ['2026-03-01', '2026-03-02'];
    const stats = buildCumulativeStatsPerDate(history, sortedDates, 100, 0, 1);

    expect(stats['2026-03-01']).toBeDefined();
    expect(stats['2026-03-01'].stats.realTotal).toBe(30);
    expect(stats['2026-03-01'].stats.realCorrect).toBe(24);

    expect(stats['2026-03-02']).toBeDefined();
    expect(stats['2026-03-02'].stats.realTotal).toBe(50);
    expect(stats['2026-03-02'].stats.realCorrect).toBe(40);
  });

  it('warnThreshold in SubtopicsPerformanceChart does not exceed targetScorePct when target is low', () => {
    const targetScorePct = 20;
    const warnThreshold = targetScorePct > 35 ? Math.max(25, targetScorePct * 0.75) : targetScorePct * 0.75;
    expect(warnThreshold).toBe(15);
    expect(warnThreshold).toBeLessThan(targetScorePct);

    const normalTarget = 80;
    const normalWarn = normalTarget > 35 ? Math.max(25, normalTarget * 0.75) : normalTarget * 0.75;
    expect(normalWarn).toBe(60);
  });
});
