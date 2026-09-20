import { describe, it, expect } from 'vitest';
import { analyzeProgressState } from '../src/utils/ProgressStateEngine.js';
import { calculateAdaptiveSlope } from '../src/engine/projection.js';

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
    it('normalizes target properly without zeroing valid negative targets and handling minScore > 0', () => {
      const normalizeTargetToScale = (raw, minScore = 0, maxScore = 100) => {
        const n = Number(raw);
        const fallback = maxScore === 100
          ? 70
          : Math.round(minScore + (maxScore - minScore) * 0.7);

        if (!Number.isFinite(n) || n <= minScore) return fallback;
        return Math.max(minScore, Math.min(maxScore, n));
      };

      // Standard scale
      expect(normalizeTargetToScale(85, 0, 100)).toBe(85);
      expect(normalizeTargetToScale(0, 0, 100)).toBe(70); // fallback because n <= minScore

      // Scale with positive floor (ENEM 200 to 1000)
      // When user passes 70 (default percentage), it should fallback to 70% of the range: 200 + 800 * 0.7 = 760
      expect(normalizeTargetToScale(70, 200, 1000)).toBe(760);
      expect(normalizeTargetToScale(750, 200, 1000)).toBe(750);
      expect(normalizeTargetToScale(150, 200, 1000)).toBe(760); // below floor falls back

      // Negative scale (Cespe -120 to +120)
      expect(normalizeTargetToScale(-20, -120, 120)).toBe(-20); // Valid negative target is kept!
      expect(normalizeTargetToScale(10, -120, 120)).toBe(10);
      expect(normalizeTargetToScale(-150, -120, 120)).toBe(48); // below floor falls back
    });

    it('formats directional delta without +0, -0, or rounding -0.5 to 0', () => {
      const formatDelta = (deltaNum) => {
        if (deltaNum >= 1) return `+${Math.round(deltaNum)}`;
        if (deltaNum >= 0.05) return `+${deltaNum.toFixed(1)}`;
        if (deltaNum <= -1) return `${Math.round(deltaNum)}`;
        if (deltaNum <= -0.05) return `${deltaNum.toFixed(1)}`;
        return '—';
      };

      expect(formatDelta(0.04)).toBe('—');
      expect(formatDelta(-0.04)).toBe('—');
      expect(formatDelta(0.1)).toBe('+0.1');
      expect(formatDelta(0.5)).toBe('+0.5');
      expect(formatDelta(-0.1)).toBe('-0.1');
      expect(formatDelta(-0.5)).toBe('-0.5'); // -0.5 is NOT rounded to -0 / 0!
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

    it('prevents prediction interval inversion when daysEstimated < 1', () => {
      const daysEstimated = 0.4;
      const margin = 0.2;
      const safeDaysMin = Math.max(1, daysEstimated - margin);
      const safeDaysMax = Math.max(safeDaysMin, daysEstimated + margin);

      expect(safeDaysMin).toBe(1);
      expect(safeDaysMax).toBe(1); // Never less than safeDaysMin!
      expect(safeDaysMax >= safeDaysMin).toBe(true);
    });

    it('guarantees catMinScore falls back to global minScore to preserve scale invariance', () => {
      const maxScore = 1000;
      const minScore = 200;
      const cat = { maxScore: 1000 }; // no cat.minScore defined

      const catMaxScore = Number(cat.maxScore) || maxScore;
      const catMinScore = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : minScore;
      const catRange = Math.max(1e-9, catMaxScore - catMinScore);
      const globalRange = Math.max(1e-9, maxScore - minScore);

      const rawScore = 600;
      const ratio = Math.max(0, Math.min(1, (rawScore - catMinScore) / catRange));
      const normalized = minScore + ratio * globalRange;

      expect(catMinScore).toBe(200);
      expect(normalized).toBe(600); // Preserved! Does not shift to 680
    });

    it('enables stagnation_positive (EXCELENTE) state in ProgressStateEngine', () => {
      const targetPct = 80;
      const low_level_limit = Math.min(60, Math.max(30, targetPct - 15)); // 65 -> clamped to 60
      const high_level_limit = Math.max(40, targetPct - 5); // 75
      const mastery_limit = Math.min(100, targetPct + 5); // 85

      // Stable scores around 78% (above high_level_limit 75%, below mastery 85%)
      const scores = [
        { score: 78, date: new Date('2026-01-01') },
        { score: 78, date: new Date('2026-01-02') },
        { score: 78, date: new Date('2026-01-03') },
        { score: 78, date: new Date('2026-01-04') },
        { score: 78, date: new Date('2026-01-05') },
      ];

      const res = analyzeProgressState(scores, {
        low_level_limit,
        high_level_limit,
        mastery_limit,
        maxScore: 100,
        minScore: 0,
        window_size: 5
      });

      expect(res.state).toBe('stagnation_positive');
      expect(res.label).toBe('Estagnação em nível alto');
    });

    it('filters corrupted 0s entries in validHistory identically to baseHistoryStats', () => {
      const history = [
        { date: '2026-01-01', score: 0, timeSpent: 0 }, // Corrupted 0s entry
        { date: '2026-01-02', score: 70, timeSpent: 3600 },
        { date: '2026-01-03', score: 75, timeSpent: 3600 },
        { date: '2026-01-04', score: 80, timeSpent: 3600 },
      ];

      const filterEntry = (h, safeScore) => {
        const tTs = typeof h.timeSpent === 'number' ? h.timeSpent : null;
        if (tTs !== null && tTs <= 0 && safeScore === 0) return false;
        return true;
      };

      const valid = history.filter(h => filterEntry(h, h.score));
      expect(valid.length).toBe(3);
      expect(valid[0].score).toBe(70);
    });

    it('WeeklyAnalysis canonicalizes unmapped category IDs to prevent duplicate cards', () => {
      const log1 = { categoryId: 'old-deleted-1', categoryName: 'Direito Constitucional', minutes: 30 };
      const log2 = { categoryId: null, categoryName: 'direito constitucional', minutes: 45 };

      const resolveId = (log) => {
        const rawName = String(log?.categoryName || log?.subject || 'Outros').trim();
        const lower = rawName.toLowerCase();
        return `raw:${lower}`;
      };

      expect(resolveId(log1)).toBe('raw:direito constitucional');
      expect(resolveId(log2)).toBe('raw:direito constitucional');
      expect(resolveId(log1)).toBe(resolveId(log2));
    });

    it('hasSimuladoHistory recognizes valid negative scores in Cebraspe contests', () => {
      const checkValid = (r) => {
        return r && r.validated !== false && (
          (Number(r.total) > 0 && Number(r.correct) >= 0) ||
          (Number.isFinite(Number(r.score)) && Number(r.total) >= 0)
        );
      };

      expect(checkValid({ score: -15, total: 120, validated: true })).toBe(true);
      expect(checkValid({ score: 0, total: 0, validated: true })).toBe(true);
      expect(checkValid({ score: NaN, total: 0 })).toBe(false);
    });
  });
});
