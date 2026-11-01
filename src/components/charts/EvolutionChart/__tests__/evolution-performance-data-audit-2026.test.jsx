import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { applyScenarioAdjustments } from '../../../../utils/monteCarloScenario.js';
import { useChartData } from '../../../../hooks/useChartData.js';
import { useEvolutionMC } from '../../../../hooks/useEvolutionMC.js';

describe('Evolution Performance & Data Audit Tests', () => {
  describe('Monte Carlo Scenario Adjustments with Custom Scales', () => {
    it('calculates mean bias proportional to score range (maxScore - minScore)', () => {
      const data = [{ mean: 500, ciRange: [400, 600], probability: 50 }];
      // ENEM scale: minScore = 200, maxScore = 1000 -> range = 800
      // Optimistic bias: factor = +0.025 -> meanBias = +0.025 * 800 = +20
      const optimistic = applyScenarioAdjustments(data, 'optimistic', 1000, 200);
      expect(optimistic[0].mean).toBe(520); // 500 + 20
      expect(optimistic[0].ciRange[0]).toBe(418); // 520 - ((520 - 400) * 0.85) = 418
      expect(optimistic[0].ciRange[1]).toBe(588); // 520 + ((600 - 520) * 0.85) = 588

      // Conservative bias: factor = -0.015 -> meanBias = -0.015 * 800 = -12
      const conservative = applyScenarioAdjustments(data, 'conservative', 1000, 200);
      expect(conservative[0].mean).toBe(488); // 500 - 12
    });

    it('clamps values safely within minScore and maxScore', () => {
      const data = [{ mean: 990, ciRange: [970, 1000], probability: 95 }];
      const optimistic = applyScenarioAdjustments(data, 'optimistic', 1000, 200);
      expect(optimistic[0].mean).toBeLessThanOrEqual(1000);
      expect(optimistic[0].ciRange[1]).toBeLessThanOrEqual(1000);
      expect(optimistic[0].probability).toBeLessThanOrEqual(100);
    });
  });

  describe('useChartData handling alternative field names', () => {
    it('processes history records using questoes and acertos correctly in exactByDate and heatmapData', () => {
      const categories = [
        {
          id: 'cat1',
          name: 'Direito Constitucional',
          color: '#6366f1',
          simuladoStats: {
            history: [
              {
                date: '2026-03-01',
                questoes: 20,
                acertos: 16,
                score: 80,
                topics: []
              }
            ]
          }
        }
      ];

      const { result } = renderHook(() =>
        useChartData(categories, {}, 100, 0, 'raw', 30, null, 1)
      );

      const timeline = result.current.timeline;
      expect(timeline.length).toBeGreaterThan(0);
      const point = timeline.find((p) => p.date === '2026-03-01');
      expect(point).toBeDefined();
      expect(point.raw_cat1).toBe(80);
      expect(point.raw_total_cat1).toBe(20);
      expect(point.raw_correct_cat1).toBe(16);

      // Verify heatmap data also mapped correctly with rows and cells
      const heatmap = result.current.heatmapData;
      expect(heatmap).toBeDefined();
      expect(heatmap.rows.length).toBe(1);
      expect(heatmap.rows[0].cells.some(c => c && c.correct === 16 && c.total === 20)).toBe(true);
    });
  });

  describe('useEvolutionMC time spent fallback', () => {
    it('executes Monte Carlo analysis with rawH questions fallback when timedQuestoes is absent', async () => {
      vi.useFakeTimers();

      const category = {
        id: 'cat-mc',
        name: 'Matemática',
        simuladoStats: {
          history: [
            {
              id: 'h1',
              date: '2026-02-15',
              questoes: 30,
              acertos: 25,
              score: 83.3,
              timeSpent: 3600 // 3600s for 30 questions = 120s/q
            }
          ]
        }
      };

      const { result } = renderHook(() =>
        useEvolutionMC({
          focusCategory: category,
          categoryLevels: { 'cat-mc': 83.3 },
          unit: '%',
          minScore: 0,
          maxScore: 100,
          projectDays: 30
        })
      );

      // Advance timers asynchronously to allow async worker rejection and fallback execution
      await act(async () => {
        await vi.advanceTimersByTimeAsync(800);
      });

      // Worker or sync fallback will complete and reset loading
      expect(result.current.mcLoading).toBe(false);
      expect(result.current.mcResult).toBeDefined();

      vi.useRealTimers();
    });
  });
});
