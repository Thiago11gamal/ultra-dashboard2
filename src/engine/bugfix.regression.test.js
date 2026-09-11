// bugfix.regression.test.js
import { describe, it, expect } from 'vitest';

import { generateEvolutionInsights } from './insightGenerator.js';
import { buildCovarianceMatrix } from './variance.js';
import {
  computeCategoryStats,
  calculateTrend,
  calculateEMA,
  computeBayesianLevel,
} from './stats.js';
import {
  simulateNormalDistribution,
  runMonteCarloAnalysis,
} from './monteCarlo.js';

function isFiniteNumber(x) {
  return Number.isFinite(x);
}

function jsonHasNaN(obj) {
  try {
    const s = JSON.stringify(obj, (_, v) =>
      Number.isNaN(v) ? '__NaN__' : v
    );
    return s.includes('__NaN__');
  } catch {
    return true;
  }
}

describe('Regression: bugs críticos', () => {

  // -------------------------------------------------------
  // insightGenerator.js
  // -------------------------------------------------------
  describe('insightGenerator', () => {

    it('raw_weekly não deve propagar NaN quando há score inválido', () => {
      const result = generateEvolutionInsights({
        timeline: [{}],
        focusCategory: { id: 'matematica' },
        activeEngine: 'raw_weekly',
        categories: [
          {
            simuladoStats: {
              history: [
                { date: '2026-07-01', score: NaN, total: 20 },
                { date: '2026-07-02', score: 80, total: 20 },
                { date: '2026-07-03', score: 70, total: 20 },
                null,
              ],
            },
          },
        ],
        unit: '%',
        maxScore: 100,
      });

      expect(result).toBeTruthy();
      expect(result.type).toBeTruthy();
      expect(jsonHasNaN(result)).toBe(false);
    });

    it('stats não deve quebrar quando statsVal vem como string', () => {
      const result = generateEvolutionInsights({
        timeline: [
          {
            stats_matematica: '82.5',
          },
        ],
        focusCategory: { id: 'matematica' },
        activeEngine: 'stats',
        categories: [],
        unit: '%',
        maxScore: 100,
      });

      expect(result).toBeTruthy();
      expect(result.type).toBeTruthy();
      expect(jsonHasNaN(result)).toBe(false);
    });

    it('bayesian não deve quebrar quando bayesian vem inválido', () => {
      const result = generateEvolutionInsights({
        timeline: [
          {
            bay_matematica: NaN,
          },
        ],
        focusCategory: { id: 'matematica' },
        activeEngine: 'bayesian',
        categories: [],
        unit: '%',
        maxScore: 100,
      });

      expect(result).toBeTruthy();
      expect(result.type).toBeTruthy();
      expect(jsonHasNaN(result)).toBe(false);
    });

  });

  // -------------------------------------------------------
  // variance.js
  // -------------------------------------------------------
  describe('variance', () => {

    it('buildCovarianceMatrix não deve quebrar com history em formato de objeto', () => {
      const stats = [
        {
          sd: 5,
          simuladoStats: {
            history: {
              a: { date: '2026-01-01', score: 70 },
              b: { date: '2026-01-02', score: 72 },
            },
          },
        },
        {
          sd: 6,
          simuladoStats: {
            history: {
              c: { date: '2026-01-01', score: 65 },
              d: { date: '2026-01-02', score: 68 },
            },
          },
        },
      ];

      let matrix = null;

      expect(() => {
        matrix = buildCovarianceMatrix(stats, null, 0.25, null);
      }).not.toThrow();

      expect(Array.isArray(matrix)).toBe(true);
      expect(matrix.length).toBe(2);
      expect(isFiniteNumber(matrix[0][0])).toBe(true);
      expect(isFiniteNumber(matrix[1][1])).toBe(true);
      expect(matrix[0][0]).toBeGreaterThanOrEqual(0);
      expect(matrix[1][1]).toBeGreaterThanOrEqual(0);
    });

    it('buildCovarianceMatrix deve tolerar sd negativo/NaN sem corromper a diagonal', () => {
      const stats = [
        { sd: -4 },
        { sd: NaN },
        { sd: 3 },
      ];

      const matrix = buildCovarianceMatrix(stats, null, 0.25, null);

      expect(Array.isArray(matrix)).toBe(true);
      expect(matrix.length).toBe(3);

      expect(isFiniteNumber(matrix[0][0])).toBe(true);
      expect(isFiniteNumber(matrix[1][0])).toBe(true);
      expect(isFiniteNumber(matrix[2][2])).toBe(true);

      expect(matrix[0][0]).toBeGreaterThanOrEqual(0);
      expect(matrix[1][1]).toBeGreaterThanOrEqual(0);
      expect(matrix[2][2]).toBeGreaterThanOrEqual(0);
    });

  });

  // -------------------------------------------------------
  // stats.js
  // -------------------------------------------------------
  describe('stats', () => {

    it('computeCategoryStats deve aceitar history como objeto e com itens nulos', () => {
      const history = {
        0: { date: '2026-01-01', score: 70, total: 20 },
        1: null,
        2: { date: '2026-01-02', score: 80, total: 20 },
        3: undefined,
        4: { date: '2026-01-03', score: 65, total: 20 },
      };

      let result = null;

      expect(() => {
        result = computeCategoryStats(history, 1, 60, 100);
      }).not.toThrow();

      expect(result).toBeTruthy();
      expect(isFiniteNumber(result.mean)).toBe(true);
      expect(isFiniteNumber(result.sd)).toBe(true);
      expect(result.sd).toBeGreaterThanOrEqual(0);
      expect(jsonHasNaN(result)).toBe(false);
    });

    it('computeCategoryStats não deve gerar sd NaN com peso negativo', () => {
      const history = [
        { date: '2026-01-01', score: 70, total: 20, weight: -2 },
        { date: '2026-01-02', score: 80, total: 20, weight: 1 },
        { date: '2026-01-03', score: 65, total: 20, weight: 1 },
      ];

      const result = computeCategoryStats(history, 1, 60, 100);

      expect(result).toBeTruthy();
      expect(isFiniteNumber(result.sd)).toBe(true);
      expect(Number.isNaN(result.sd)).toBe(false);
      expect(result.sd).toBeGreaterThanOrEqual(0);
    });

    it('computeCategoryStats deve retornar null apenas quando não houver histórico aproveitável', () => {
      const result = computeCategoryStats([], 1, 60, 100);
      expect(result).toBeNull();
    });

    it('calculateTrend não deve quebrar com primeira data inválida', () => {
      const history = [
        { date: 'invalid-date', score: 50 },
        { date: '2026-01-01', score: 60 },
        { date: '2026-01-02', score: 70 },
      ];

      let trend = null;

      expect(() => {
        trend = calculateTrend(history, 100);
      }).not.toThrow();

      expect(isFiniteNumber(trend)).toBe(true);
    });

    it('calculateEMA deve filtrar NaN e retornar valor finito', () => {
      const ema = calculateEMA([NaN, 70, undefined, 80, null, 90], 0.25);
      expect(isFiniteNumber(ema)).toBe(true);
    });

    it('computeBayesianLevel deve tolerar itens nulos no histórico', () => {
      const history = [
        null,
        { date: '2026-01-01', score: 70, total: 20 },
        undefined,
        { date: '2026-01-02', score: 80, total: 20 },
        { date: '2026-01-03', score: 65, total: 20 },
      ];

      let result = null;

      expect(() => {
        result = computeBayesianLevel(history, 1, 1, 100, {});
      }).not.toThrow();

      expect(result).toBeTruthy();
      expect(isFiniteNumber(result.mean)).toBe(true);
      expect(isFiniteNumber(result.sd)).toBe(true);
      expect(isFiniteNumber(result.ciLow)).toBe(true);
      expect(isFiniteNumber(result.ciHigh)).toBe(true);
      expect(jsonHasNaN(result)).toBe(false);
    });

  });

  // -------------------------------------------------------
  // monteCarlo.js
  // -------------------------------------------------------
  describe('monteCarlo', () => {

    it('simulateNormalDistribution não deve produzir NaN quando targetScore é undefined', () => {
      const result = simulateNormalDistribution({
        mean: 70,
        sd: 5,
        simulations: 200,
        minScore: 0,
        maxScore: 100,
        // targetScore omitido de propósito
      });

      expect(result).toBeTruthy();
      expect(isFiniteNumber(result.probability)).toBe(true);
      expect(isFiniteNumber(result.analyticalProbability)).toBe(true);
      expect(isFiniteNumber(result.recommendedProbability)).toBe(true);
      expect(jsonHasNaN(result)).toBe(false);
    });

    it('simulateNormalDistribution deve tolerar seed NaN', () => {
      const result = simulateNormalDistribution({
        mean: 70,
        sd: 5,
        targetScore: 80,
        simulations: 200,
        seed: NaN,
        minScore: 0,
        maxScore: 100,
      });

      expect(result).toBeTruthy();
      expect(isFiniteNumber(result.probability)).toBe(true);
      expect(isFiniteNumber(result.projectedMean)).toBe(true);
      expect(isFiniteNumber(result.projectedSD)).toBe(true);
    });

    it('simulateNormalDistribution não deve quebrar com subject sd = 0', () => {
      const result = simulateNormalDistribution({
        mean: 70,
        sd: 5,
        targetScore: 80,
        simulations: 200,
        minScore: 0,
        maxScore: 100,
        subjects: [
          {
            name: 'Matematica',
            mean: 70,
            sd: 0,
            minCutoff: 60,
            minScore: 0,
            maxScore: 100,
            immunityFactor: 1,
          },
        ],
      });

      expect(result).toBeTruthy();
      expect(isFiniteNumber(result.probability)).toBe(true);
      expect(jsonHasNaN(result)).toBe(false);
    });

    it('simulateNormalDistribution deve tolerar subjects com sd NaN', () => {
      const result = simulateNormalDistribution({
        mean: 70,
        sd: 5,
        targetScore: 80,
        simulations: 200,
        minScore: 0,
        maxScore: 100,
        subjects: [
          {
            name: 'Direito',
            mean: 70,
            sd: NaN,
            minCutoff: 60,
            minScore: 0,
            maxScore: 100,
            immunityFactor: 1,
          },
        ],
      });

      expect(result).toBeTruthy();
      expect(isFiniteNumber(result.probability)).toBe(true);
    });

    it('runMonteCarloAnalysis deve extrair score de objetos em values', () => {
      const result = runMonteCarloAnalysis({
        values: [
          { score: 70 },
          { value: 80 },
          65,
          null,
          undefined,
          NaN,
        ],
        dates: [
          '2026-01-01',
          '2026-01-02',
          '2026-01-03',
          '2026-01-04',
          '2026-01-05',
          '2026-01-06',
        ],
        targetScore: 80,
        simulations: 200,
        projectionDays: 30,
        minScore: 0,
        maxScore: 100,
      });

      expect(result).toBeTruthy();
      // O formato exato depende do projection.js, mas o resultado não pode ser NaN generalizado.
      expect(jsonHasNaN(result)).toBe(false);
    });

  });

});
