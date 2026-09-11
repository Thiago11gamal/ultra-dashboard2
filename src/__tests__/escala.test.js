import { describe, it, expect } from 'vitest';
import { simulateNormalDistribution } from '../engine/monteCarlo';
import { ratioToPoints, pointsToRatio } from '../utils/scoreHelper.conversions';

const ESCALAS = [
  { nome: 'curta 0-10',              min: 0,    max: 10 },
  { nome: 'percentual 0-100',        min: 0,    max: 100 },
  { nome: 'estendida 0-200',         min: 0,    max: 200 },
  { nome: 'CESPE 0-120',             min: 0,    max: 120 },
  { nome: 'com piso 400-1000',       min: 400,  max: 1000 },
  { nome: 'com penalidade -30..100', min: -30,  max: 100 },
];

describe('Matriz de escalas — invariância para qualquer concurso', () => {
  ESCALAS.forEach(({ nome, min, max }) => {
    it(`conversões respeitam o domínio em ${nome}`, () => {
      expect(pointsToRatio(min, max, min)).toBe(0);
      expect(pointsToRatio(max, max, min)).toBe(1);
      expect(ratioToPoints(0, max, min)).toBe(min);
      expect(ratioToPoints(1, max, min)).toBe(max);
    });

    it(`Monte Carlo permanece dentro do domínio em ${nome}`, () => {
      const range = max - min;
      const r = simulateNormalDistribution({
        mean: min + range * 0.7,
        sd: range * 0.08,
        targetScore: min + range * 0.75,
        simulations: 1500,
        minScore: min,
        maxScore: max
      });
      expect(r.probability).toBeGreaterThanOrEqual(0);
      expect(r.probability).toBeLessThanOrEqual(100);
      expect(r.projectedMean).toBeGreaterThanOrEqual(min);
      expect(r.projectedMean).toBeLessThanOrEqual(max);
      expect(r.ci95Low).toBeGreaterThanOrEqual(min);
      expect(r.ci95High).toBeLessThanOrEqual(max);
      expect(r.ci95Low).toBeLessThanOrEqual(r.ci95High);
    });
  });
});
