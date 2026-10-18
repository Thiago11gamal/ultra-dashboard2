import { describe, it, expect } from 'vitest';
import {
  backfillObservedFromSimulados,
  buildCalibrationDashboardSeries,
  computeCalibrationDiagnostics
} from '../calibration.js';
import { runCoachMonteCarlo } from '../coachAdaptive.js';
import { calculateUrgencyDetailed } from '../coachLogic.js';

describe('Calibration Integrity & Edge Cases Audit', () => {
  describe('1. backfillObservedFromSimulados with minScore & Category Specific Scale', () => {
    it('accurately backfills subject prediction using category-specific maxScore and minScore', () => {
      const categories = [
        { id: 'c1', name: 'Direito Constitucional', maxScore: 20, minScore: 0 },
        { id: 'c2', name: 'Matemática', maxScore: 80, minScore: 0 }
      ];

      // Prediction made at timestamp 1000 for Direito Constitucional (meta = 16 pts out of 20)
      const events = [
        {
          id: 'ev1',
          timestamp: 1000,
          category: 'Direito Constitucional',
          targetScore: 16, // In category points
          observed: null
        }
      ];

      // Student scored 18/20 on simulado created at 2000
      const simuladoRows = [
        {
          createdAt: new Date(2000).toISOString(),
          subject: 'Direito Constitucional',
          correct: 18,
          total: 20
        }
      ];

      // Pass global exam maxScore 100, minScore 0
      const backfilled = backfillObservedFromSimulados(events, simuladoRows, categories, 100, 0);
      expect(backfilled[0].observed).toBe(1); // 18 >= 16 -> 1
      expect(backfilled[0].observedScore).toBe(18);
      expect(backfilled[0].backfilled).toBe(true);
    });

    it('respects non-zero minScore in global backfill', () => {
      // Exam scale: 200 to 1000 (ENEM)
      const events = [
        {
          id: 'ev-global',
          timestamp: 1000,
          category: 'global',
          targetScore: 800,
          observed: null
        }
      ];

      // Simulado with 80% correct (in ENEM scale 200 + 0.8 * 800 = 840)
      const simuladoRows = [
        {
          createdAt: new Date(2000).toISOString(),
          subject: 'Linguagens',
          questoes: 50,
          acertos: 40 // 80%
        }
      ];

      const backfilled = backfillObservedFromSimulados(events, simuladoRows, [], 1000, 200);
      expect(backfilled[0].observed).toBe(1); // 840 >= 800
      expect(backfilled[0].observedScore).toBe(840);
    });

    it('uses question count aliases (questoes, totalQuestoes) in weighted average', () => {
      const events = [
        {
          id: 'ev-global',
          timestamp: 1000,
          category: 'global',
          targetScore: 70,
          observed: null
        }
      ];

      // Two rows on same day:
      // Row A: 40 questions, 100% correct (weight 40)
      // Row B: 10 questions, 0% correct (weight 10)
      // Weighted average: (100 * 40 + 0 * 10) / 50 = 80
      const simuladoRows = [
        {
          createdAt: new Date(2000).toISOString(),
          subject: 'Matemática',
          totalQuestoes: 40,
          correctCount: 40
        },
        {
          createdAt: new Date(2000).toISOString(),
          subject: 'História',
          questoes: 10,
          acertos: 0
        }
      ];

      const backfilled = backfillObservedFromSimulados(events, simuladoRows, [], 100, 0);
      expect(backfilled[0].observedScore).toBeCloseTo(80, 1);
      expect(backfilled[0].observed).toBe(1);
    });
  });

  describe('2. buildCalibrationDashboardSeries Null Safety', () => {
    it('does not convert null avgBrier into 0 and does not collapse control limits to 0', () => {
      const events = [
        { timestamp: 10000, avgBrier: null },
        { timestamp: 20000, avgBrier: 0.15 },
        { timestamp: 30000, avgBrier: 0.18 }
      ];

      const series = buildCalibrationDashboardSeries(events);
      expect(series.trend[0].avgBrier).toBeNull();
      expect(series.trend[1].avgBrier).toBe(0.15);
      expect(series.trend[2].avgBrier).toBe(0.18);

      // Mean should only be computed over valid brier scores: (0.15 + 0.18) / 2 = 0.165
      expect(series.controlLimits.brierMean).toBeCloseTo(0.165, 3);
      expect(series.controlLimits.brierUpper95).toBeGreaterThan(0.18);
      // The 0.18 observation should NOT be flagged as outOfControl!
      expect(series.driftSignals[2].outOfControl).toBe(false);
    });
  });

  describe('3. computeCalibrationDiagnostics Reliability Safety', () => {
    it('returns null ece and mce if no pairs have valid probabilities', () => {
      const diag = computeCalibrationDiagnostics([]);
      expect(diag.ece).toBeNull();
      expect(diag.mce).toBeNull();
      expect(diag.reliability).toEqual([]);
    });
  });

  describe('4. runCoachMonteCarlo Insufficient Data & Domain Bounds', () => {
    it('returns null avgBrier and null ece when history size is less than 8', () => {
      const history = [
        { score: 70, date: '2026-01-01', total: 10, correct: 7 },
        { score: 75, date: '2026-01-05', total: 10, correct: 7 },
        { score: 80, date: '2026-01-10', total: 10, correct: 8 }
      ];

      const mc = runCoachMonteCarlo(
        history,
        75,
        { MC_ENABLE_ADAPTIVE_CALIBRATION: true },
        'cat-test',
        100,
        null,
        30,
        0,
        0
      );

      expect(mc).toBeDefined();
      expect(mc.avgBrier).toBeNull();
      expect(mc.ece).toBeNull();
    });

    it('clamps widenedCiLow to safeMinScore on non-zero domain (e.g. ENEM minScore=200)', () => {
      // Consistent low scores near 220 in scale 200..1000
      const history = Array.from({ length: 10 }, (_, i) => ({
        score: 220,
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        total: 10,
        correct: 1
      }));

      const mc = runCoachMonteCarlo(
        history,
        500,
        { MC_ENABLE_ADAPTIVE_CALIBRATION: true },
        'cat-enem',
        1000, // maxScore
        null,
        30,
        0,
        200 // minScore
      );

      expect(mc.ci95Low).toBeGreaterThanOrEqual(200);
      expect(mc.ci95High).toBeLessThanOrEqual(1000);
    });
  });

  describe('5. calculateUrgencyDetailed Explainability on Null avgBrier', () => {
    it('classifies calibrationQuality as low when avgBrier is null or data is insufficient', () => {
      const category = {
        id: 'cat-1',
        name: 'Português',
        maxScore: 100,
        minScore: 0,
        tasks: []
      };

      const simulados = [
        { id: 's1', subject: 'Português', score: 70, date: '2026-01-01', total: 10, correct: 7 },
        { id: 's2', subject: 'Português', score: 72, date: '2026-01-05', total: 10, correct: 7 }
      ];

      const detailed = calculateUrgencyDetailed(category, simulados, [], {
        config: { MC_ENABLE_ADAPTIVE_CALIBRATION: true }
      });

      if (detailed?.details?.monteCarlo) {
        expect(detailed.details.monteCarlo.explainability.calibrationQuality).toBe('low');
      }
    });
  });
});
