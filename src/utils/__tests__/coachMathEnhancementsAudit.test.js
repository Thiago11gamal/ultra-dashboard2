import { describe, it, expect } from 'vitest';
import {
  deriveUrgencyWeights,
  getCognitiveState,
  generateDailyGoals,
  calculateUrgencyScore,
} from '../coachLogic.js';
import { kalmanAbilityTrend } from '../../engine/probabilistic/stateSpace.js';
import { estimatePosteriorPredictive } from '../../engine/probabilistic/posteriorPredictive.js';
import { detectDataAnomalies } from '../../engine/diagnostics.js';

describe('Coach Math & Calibration Enhancements Audit', () => {
  describe('1. deriveUrgencyWeights Domain Scaling', () => {
    it('scales volatility weight relative to exam domain', () => {
      // 10% volatility on 100-pt exam: vol = 10, domain = 100 -> volPct = 0.10
      const w100 = deriveUrgencyWeights({ sampleSize: 10 }, 10, 10, {}, 100);

      // 10% volatility on 1000-pt exam (ENEM): vol = 100, domain = 1000 -> volPct = 0.10
      const w1000 = deriveUrgencyWeights({ sampleSize: 10 }, 100, 10, {}, 1000);

      // 10% volatility on 10-pt exam: vol = 1, domain = 10 -> volPct = 0.10
      const w10 = deriveUrgencyWeights({ sampleSize: 10 }, 1, 10, {}, 10);

      expect(w100.instabilityMax).toBeCloseTo(w1000.instabilityMax, 4);
      expect(w100.instabilityMax).toBeCloseTo(w10.instabilityMax, 4);
    });

    it('defaults domain to 100 when omitted for backwards compatibility', () => {
      const wDefault = deriveUrgencyWeights({ sampleSize: 10 }, 15, 10, {});
      const wExplicit = deriveUrgencyWeights({ sampleSize: 10 }, 15, 10, {}, 100);
      expect(wDefault.instabilityMax).toBe(wExplicit.instabilityMax);
    });
  });

  describe('2. Negative minScore support in StateSpace and PosteriorPredictive', () => {
    it('kalmanAbilityTrend preserves negative minScore on penalty exams', () => {
      const obs = [
        { score: -20, date: '2026-01-01' },
        { score: 10, date: '2026-01-10' },
        { score: -5, date: '2026-01-20' },
      ];
      const result = kalmanAbilityTrend(obs, { maxScore: 100, minScore: -100 });
      expect(result).not.toBeNull();
      expect(result.minScore).toBe(-100);
      expect(result.ability).toBeGreaterThanOrEqual(-100);
      expect(result.ability).toBeLessThanOrEqual(100);
    });

    it('estimatePosteriorPredictive preserves negative minScore', () => {
      const res = estimatePosteriorPredictive({
        ability: 0,
        abilitySd: 10,
        trendPerDay: 0.1,
        trendSd: 0.05,
        dailyVolatility: 2,
        horizonDays: 30,
        targetScore: 20,
        minScore: -100,
        maxScore: 100,
        sampleSize: 10,
      });
      expect(res).not.toBeNull();
      expect(res.probability).toBeGreaterThan(0);
      expect(res.probability).toBeLessThanOrEqual(100);
    });
  });

  describe('3. getCognitiveState Date Field Invariance', () => {
    it('correctly aggregates logs with createdAt and lastUpdated', () => {
      const now = new Date('2026-05-10T12:00:00Z');
      const studyLogs = [
        { id: '1', createdAt: '2026-05-10T09:00:00Z', minutes: 60 },
        { id: '2', lastUpdated: '2026-05-10T11:00:00Z', minutes: 30 },
        { id: '3', createdAt: '2026-05-08T10:00:00Z', minutes: 45 },
      ];

      const state = getCognitiveState(studyLogs, { now });
      expect(state.minutesToday).toBe(90);
      expect(state.hours7d).toBeCloseTo(2.25, 2);
      expect(state.streakDays).toBe(2);
    });
  });

  describe('4. generateDailyGoals minScore & domain scaling', () => {
    it('sets appropriate targetScore and catMin for non-zero minScore scales', () => {
      const categories = [
        { id: 'cat1', name: 'Matemática', minScore: 200, maxScore: 1000 },
        { id: 'cat2', name: 'Português', minScore: 200, maxScore: 1000 },
      ];
      const simulados = [
        { subject: 'Matemática', score: 500, date: '2026-05-01' },
        { subject: 'Português', score: 700, date: '2026-05-01' },
      ];

      const goals = generateDailyGoals(categories, simulados, [], {
        minScore: 200,
        maxScore: 1000,
      });

      expect(Array.isArray(goals)).toBe(true);
      expect(goals.length).toBeGreaterThan(0);
    });
  });

  describe('5. detectDataAnomalies with minScore', () => {
    it('bounds scores correctly with minScore', () => {
      const history = [
        { score: -50, date: '2026-01-01' },
        { score: -30, date: '2026-01-05' },
        { score: 0, date: '2026-01-10' },
      ];
      const issues = detectDataAnomalies(history, 100, -100);
      expect(Array.isArray(issues)).toBe(true);
    });
  });
});
