import { describe, it, expect } from 'vitest';
import { computeBayesianLevel, calculateTrend } from '../stats';

const mkHistory = (scores, gap = 3) =>
  scores.map((s, i) => ({
    score: s, total: 20, correct: Math.round((s / 100) * 20),
    date: new Date(2026, 5, 1 + i * gap).toISOString().slice(0, 10)
  }));

describe('computeBayesianLevel', () => {
  it('não produz NaN com histórico vazio', () => {
    const r = computeBayesianLevel([], 1, 1, 100, {});
    expect(Number.isFinite(r.mean)).toBe(true);
    expect(Number.isFinite(r.ciLow)).toBe(true);
  });

  it('LOTE-01 · runningPriors alinhado com >2000 entradas', () => {
    const big = mkHistory(Array.from({ length: 2100 }, (_, i) => 60 + (i % 5)), 1);
    const r = computeBayesianLevel(big, 1, 1, 100, {});
    expect(r.mean).toBeGreaterThan(50);
    expect(r.mean).toBeLessThan(75);
    expect(r.ciHigh).toBeLessThanOrEqual(100);
  });

  it('escala 0–200: média coerente e CI dentro do domínio', () => {
    const h = [150, 160, 170].map(s => ({
      score: s, total: 40, correct: Math.round(s / 5),
      date: new Date(2026, 5, 1 + s % 9).toISOString().slice(0, 10)
    }));
    const r = computeBayesianLevel(h, 1, 1, 200, {});
    expect(r.mean).toBeGreaterThan(100);
    expect(r.ciHigh).toBeLessThanOrEqual(200);
  });
});

describe('calculateTrend', () => {
  it('LOTE-01 · retorna slope por dia (sem ×10)', () => {
    const h = Array.from({ length: 10 }, (_, i) => ({
      score: 50 + i, total: 20,
      date: new Date(2026, 5, 1 + i).toISOString().slice(0, 10)
    }));
    expect(calculateTrend(h, 100)).toBeCloseTo(1, 1); // ~1 pt/dia
  });
});
