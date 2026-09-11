import { describe, it, expect } from 'vitest';
import { calculateSlope } from '../projection';

describe('calculateSlope (LOTE-02)', () => {
  it('clamp proporcional à amplitude real (não ao teto)', () => {
    expect(calculateSlope(10, 1000, { minScore: 400 })).toBeCloseTo(2.4);
    expect(calculateSlope(-10, 1000, { minScore: 400 })).toBeCloseTo(-2.4);
  });

  it('não clampa slopes dentro do limite', () => {
    expect(calculateSlope(1, 1000, { minScore: 400 })).toBeCloseTo(1);
  });

  it('escala 0-100 mantém o comportamento anterior', () => {
    expect(calculateSlope(10, 100, { minScore: 0 })).toBeCloseTo(0.4);
  });
});
