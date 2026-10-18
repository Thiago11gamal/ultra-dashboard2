import { describe, it, expect } from 'vitest';
import {
  toFinite,
  clamp,
  safeDivide,
  parseNumericString,
  normalizeProbability,
  normalizePercent,
} from '../src/engine/math/safe';

describe('Safe Math Core (safe.js)', () => {
  it('toFinite should return correct finite values', () => {
    expect(toFinite("1.234,56")).toBe(1234.56);
    expect(toFinite("abc", 0)).toBe(0);
    expect(toFinite(null, 10)).toBe(10);
  });

  it('clamp should restrict value to bounds', () => {
    expect(clamp(NaN, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-50, 0, 100)).toBe(0);
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('safeDivide should prevent division by zero', () => {
    expect(safeDivide(10, 0, 0)).toBe(0);
    expect(safeDivide(10, 2, 0)).toBe(5);
    expect(safeDivide(10, NaN, 1)).toBe(1);
  });

  it('parseNumericString should correctly parse pt-BR strings', () => {
    expect(parseNumericString("1.000,50")).toBe(1000.5);
    expect(parseNumericString("1000.50")).toBe(1000.5);
    expect(parseNumericString("abc")).toBeNaN();
  });

  it('normalizeProbability should keep probabilities strictly between 0 and 1', () => {
    expect(normalizeProbability(87)).toBe(0.87);
    expect(normalizeProbability(0.87)).toBe(0.87);
    expect(normalizeProbability(-1)).toBe(0);
    expect(normalizeProbability(101)).toBe(1);
  });

  it('normalizePercent should return percentages between 0 and 100', () => {
    expect(normalizePercent(0.87)).toBe(87);
    expect(normalizePercent(87)).toBe(87);
    expect(normalizePercent(-5)).toBe(0);
    expect(normalizePercent(150)).toBe(100);
  });
});
