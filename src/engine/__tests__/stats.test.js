import { describe, it, expect } from 'vitest';
import { computeBayesianLevel, calculateSlopePerDay, calculateTrend } from '../stats';

const day = (i) => new Date(2026, 0, 1 + i).toISOString().slice(0, 10);

describe('computeBayesianLevel', () => {
  it('não produz NaN com histórico vazio', () => {
    const r = computeBayesianLevel([], 1, 1, 100, {});
    expect(Number.isFinite(r.mean)).toBe(true);
    expect(Number.isFinite(r.ciLow)).toBe(true);
    expect(Number.isFinite(r.ciHigh)).toBe(true);
  });

  it('LOTE-02 · runningPriors alinhado com >2000 entradas', () => {
    const big = Array.from({ length: 2100 }, (_, i) => {
      const s = 60 + (i % 5);
      return { score: s, total: 20, correct: Math.round(s / 5), date: day(i) };
    });
    const r = computeBayesianLevel(big, 1, 1, 100, {});
    expect(Number.isFinite(r.mean)).toBe(true);
    expect(r.mean).toBeGreaterThan(50);
    expect(r.mean).toBeLessThan(75);
    expect(r.ciLow).toBeGreaterThanOrEqual(0);
    expect(r.ciHigh).toBeLessThanOrEqual(100);
  });

  it('escala 0-200 · média coerente e CI dentro do domínio', () => {
    const h = [150, 160, 170].map((s, i) => ({ score: s, total: 40, correct: Math.round(s / 5), date: day(i * 3) }));
    const r = computeBayesianLevel(h, 1, 1, 200, {});
    expect(r.mean).toBeGreaterThan(100);
    expect(r.ciHigh).toBeLessThanOrEqual(200);
  });
});

describe('calculateSlopePerDay (LOTE-02 + LOTE-05)', () => {
  it('retorna slope por dia (sem o ×10)', () => {
    const h = Array.from({ length: 10 }, (_, i) => ({ score: 50 + i, total: 20, date: day(i) }));
    expect(calculateSlopePerDay(h, 100)).toBeCloseTo(1, 1);
  });

  it('alias calculateTrend permanece disponível e idêntico', () => {
    const h = Array.from({ length: 10 }, (_, i) => ({ score: 50 + i, total: 20, date: day(i) }));
    expect(calculateTrend(h, 100)).toBeCloseTo(1, 1);
  });
});
