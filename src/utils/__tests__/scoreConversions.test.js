import { describe, it, expect } from 'vitest';
import {
  ratioToPoints, pctToPoints, pointsToRatio, pointsToPct,
  toAccuracyRatio, ratioToCorrect
} from '../scoreHelper.conversions';

describe('scoreHelper.conversions — unidades explícitas (BATCH-01)', () => {
  it('ratioToPoints respeita piso não-nulo', () => {
    expect(ratioToPoints(0, 1000, 400)).toBe(400);
    expect(ratioToPoints(1, 1000, 400)).toBe(1000);
    expect(ratioToPoints(0.5, 1000, 400)).toBe(700);
  });

  it('pctToPoints não confunde percentual com razão', () => {
    expect(pctToPoints(1, 100, 0)).toBeCloseTo(1);
    expect(pctToPoints(80, 200, 0)).toBeCloseTo(160);
  });

  it('pointsToRatio é o inverso de ratioToPoints', () => {
    expect(pointsToRatio(700, 1000, 400)).toBeCloseTo(0.5);
    expect(pointsToRatio(400, 1000, 400)).toBe(0);
    expect(pointsToRatio(1000, 1000, 400)).toBe(1);
  });

  it('a nota bruta 1 em escala 0-10 NÃO vira 100% (bug original do toPoints)', () => {
    expect(pointsToPct(1, 10, 0)).toBeCloseTo(10);
  });

  it('toAccuracyRatio ≡ pointsToRatio (fração de aproveitamento)', () => {
    expect(toAccuracyRatio(700, 1000, 400)).toBeCloseTo(pointsToRatio(700, 1000, 400));
  });

  it('ratioToCorrect clampa em [0, total]', () => {
    expect(ratioToCorrect(0.7, 20)).toBeCloseTo(14);
    expect(ratioToCorrect(1.5, 20)).toBe(20);
    expect(ratioToCorrect(-0.2, 20)).toBe(0);
  });
});
