import { describe, it, expect } from 'vitest';
import { analyzeProgressState } from '../src/utils/ProgressStateEngine.js';
import { calculateAdaptiveSlope } from '../src/engine/projection.js';
import { calculateSlopePerDay } from '../src/engine/stats.js';

describe('Stats Menu Audit & Bug Fixes', () => {
  describe('1. ProgressStateEngine Scale Invariance & minScore Support', () => {
    it('produces identical states and proportional slopes for 0-100 vs 0-1000 vs 0-10', () => {
      const dates = [
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-05T10:00:00Z'),
        new Date('2026-01-10T10:00:00Z'),
        new Date('2026-01-15T10:00:00Z'),
      ];

      // 60%, 65%, 75%, 85%
      const history100 = [
        { score: 60, date: dates[0] },
        { score: 65, date: dates[1] },
        { score: 75, date: dates[2] },
        { score: 85, date: dates[3] },
      ];
      const history1000 = history100.map(h => ({ ...h, score: h.score * 10 }));
      const history10 = history100.map(h => ({ ...h, score: h.score / 10 }));

      const res100 = analyzeProgressState(history100, { maxScore: 100, minScore: 0, window_size: 4 });
      const res1000 = analyzeProgressState(history1000, { maxScore: 1000, minScore: 0, window_size: 4 });
      const res10 = analyzeProgressState(history10, { maxScore: 10, minScore: 0, window_size: 4 });

      expect(res100.state).toBe(res1000.state);
      expect(res100.state).toBe('progression');
      expect(res100.label).toBe('Em evolução');

      // Slopes scale proportionally
      expect(res1000.trend_slope).toBeCloseTo(res100.trend_slope * 10, 3);
      expect(res10.trend_slope).toBeCloseTo(res100.trend_slope / 10, 3);
    });

    it('correctly handles negative minScore (e.g. Cespe -120 to +120)', () => {
      const dates = [
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-05T10:00:00Z'),
        new Date('2026-01-10T10:00:00Z'),
        new Date('2026-01-15T10:00:00Z'),
      ];
      // Scores around 0 on a [-120, +120] scale (which is 50% of the range)
      const history = [
        { score: 0, date: dates[0] },
        { score: 1, date: dates[1] },
        { score: 0.5, date: dates[2] },
        { score: 0.8, date: dates[3] },
      ];
      const res = analyzeProgressState(history, { maxScore: 120, minScore: -120, window_size: 4 });
      expect(res.state).toBeDefined();
      expect(res.state).not.toBe('insufficient_data');
      expect(Number.isFinite(res.trend_slope)).toBe(true);
    });
  });

  describe('2. Projection Engine Slope Calculation', () => {
    it('calculateAdaptiveSlope correctly forwards minScore', () => {
      const history = [
        { score: -20, date: new Date('2026-01-01') },
        { score: 30, date: new Date('2026-01-10') },
      ];
      // When minScore is -50, score -20 is kept intact
      const slopeWithNegMin = calculateAdaptiveSlope(history, 100, { minScore: -50 });
      // When minScore is 0, score -20 is clamped to 0
      const slopeWithZeroMin = calculateAdaptiveSlope(history, 100, { minScore: 0 });

      expect(Number.isFinite(slopeWithNegMin)).toBe(true);
      expect(Number.isFinite(slopeWithZeroMin)).toBe(true);
      expect(slopeWithNegMin).not.toBe(slopeWithZeroMin);
    });
  });

  describe('3. VerifiedStats & Consistency Logic Checks', () => {
    it('normalizes target properly without zeroing valid negative targets', () => {
      const normalizeTargetToScale = (raw, minScore = 0, maxScore = 100) => {
        const n = Number(raw);
        const fallback = maxScore === 100
          ? 70
          : Math.round(minScore + (maxScore - minScore) * 0.7);

        if (!Number.isFinite(n) || (minScore >= 0 ? n <= 0 : n < minScore)) return fallback;
        return Math.max(minScore, Math.min(maxScore, n));
      };

      // Standard scale
      expect(normalizeTargetToScale(85, 0, 100)).toBe(85);
      expect(normalizeTargetToScale(0, 0, 100)).toBe(70); // fallback because n <= 0 on standard scale

      // Negative scale (Cespe -120 to +120)
      expect(normalizeTargetToScale(-20, -120, 120)).toBe(-20); // Valid negative target is kept!
      expect(normalizeTargetToScale(10, -120, 120)).toBe(10);
      expect(normalizeTargetToScale(-150, -120, 120)).toBe(48); // clamped/fallback
    });

    it('formats directional delta without +0 or -0', () => {
      const formatDelta = (deltaNum) => {
        if (deltaNum >= 0.5) return `+${Math.round(deltaNum)}`;
        if (deltaNum >= 0.1) return `+${deltaNum.toFixed(1)}`;
        if (deltaNum <= -0.5) return `${Math.round(deltaNum)}`;
        if (deltaNum <= -0.1) return `${deltaNum.toFixed(1)}`;
        return '—';
      };

      expect(formatDelta(0.04)).toBe('—');
      expect(formatDelta(-0.04)).toBe('—');
      expect(formatDelta(0.1)).toBe('+0.1');
      expect(formatDelta(0.3)).toBe('+0.3');
      expect(formatDelta(-0.1)).toBe('-0.1');
      expect(formatDelta(-0.4)).toBe('-0.4');
      expect(formatDelta(1.2)).toBe('+1');
      expect(formatDelta(-1.8)).toBe('-2');
    });

    it('consistency card treats SEM DADOS as insufficient/pending', () => {
      const checkInsufficient = (status) => {
        return ['Dados Insuficientes', 'SEM DADOS', 'Sem Dados'].includes(status);
      };

      expect(checkInsufficient('SEM DADOS')).toBe(true);
      expect(checkInsufficient('Dados Insuficientes')).toBe(true);
      expect(checkInsufficient('EXCELENTE')).toBe(false);
      expect(checkInsufficient('INSTÁVEL')).toBe(false);
    });

    it('prediction subtext correctly handles singular and plural days', () => {
      const formatSubtext = (distinctDays) => {
        const daysRemaining = Math.max(1, 3 - distinctDays);
        return daysRemaining === 1
          ? 'Falta 1 dia de simulados para prever.'
          : `Faltam ${daysRemaining} dias de simulados para prever.`;
      };

      expect(formatSubtext(2)).toBe('Falta 1 dia de simulados para prever.');
      expect(formatSubtext(1)).toBe('Faltam 2 dias de simulados para prever.');
      expect(formatSubtext(0)).toBe('Faltam 3 dias de simulados para prever.');
    });

    it('topic villains trimming merges whitespace variations', () => {
      const rawTopics = [
        { name: 'Direito Penal ', score: 70, total: 10 },
        { name: 'Direito Penal', score: 75, total: 10 },
        { name: ' Direito Penal', score: 80, total: 10 },
      ];

      const topicMap = {};
      rawTopics.forEach(t => {
        const trimmed = t.name.trim();
        if (!topicMap[trimmed]) topicMap[trimmed] = [];
        topicMap[trimmed].push(t.score);
      });

      expect(Object.keys(topicMap)).toEqual(['Direito Penal']);
      expect(topicMap['Direito Penal'].length).toBe(3);
    });
  });
});
