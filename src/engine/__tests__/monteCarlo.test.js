import { describe, it, expect } from 'vitest';
import { simulateNormalDistribution } from '../monteCarlo';
import { monteCarloSimulation } from '../projection';

describe('simulateNormalDistribution', () => {
  it('prob ∈ [0,100] e CI ⊂ domínio (varredura)', () => {
    for (const [mean, sd, target] of [[80, 8, 85], [30, 15, 90], [95, 5, 20], [50, 0.0001, 50]]) {
      const r = simulateNormalDistribution({ mean, sd, targetScore: target, simulations: 2000, minScore: 0, maxScore: 100 });
      expect(r.probability).toBeGreaterThanOrEqual(0);
      expect(r.probability).toBeLessThanOrEqual(100);
      expect(r.ci95Low).toBeGreaterThanOrEqual(0);
      expect(r.ci95High).toBeLessThanOrEqual(100);
      expect(Number.isFinite(r.projectedMean)).toBe(true);
    }
  });

  it('LOTE-01 · sujeitos com escalas diferentes não vazam do domínio', () => {
    const r = simulateNormalDistribution({
      mean: 70, sd: 10, targetScore: 75, simulations: 1500, minScore: 0, maxScore: 100,
      subjects: [
        { name: 'A', mean: 40, sd: 5, minCutoff: 30, minScore: 0, maxScore: 50, weight: 1 },
        { name: 'B', mean: 80, sd: 5, minCutoff: 60, minScore: 0, maxScore: 100, weight: 2 }
      ]
    });
    expect(r.projectedMean).toBeGreaterThanOrEqual(0);
    expect(r.projectedMean).toBeLessThanOrEqual(100);
    expect(Number.isFinite(r.probability)).toBe(true);
  });
});

describe('monteCarloSimulation', () => {
  it('LOTE-01 · invariância de escala 0–100 vs 0–200', () => {
    const dates = i => new Date(2026, 4, 1 + i * 4).toISOString().slice(0, 10);
    const h100 = Array.from({ length: 12 }, (_, i) => ({ score: 70 + (i % 3), total: 20, date: dates(i) }));
    const h200 = h100.map(h => ({ ...h, score: h.score * 2, total: 40 }));
    const r100 = monteCarloSimulation(h100, 80, 60, 3000, { minScore: 0, maxScore: 100 });
    const r200 = monteCarloSimulation(h200, 160, 60, 3000, { minScore: 0, maxScore: 200 });
    expect(Math.abs(r100.probability - r200.probability)).toBeLessThan(12);
  });
});
