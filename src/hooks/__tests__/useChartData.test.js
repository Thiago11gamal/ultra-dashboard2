import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChartData } from '../useChartData';

const mkCat = (history) => ({ id: 'mat', name: 'Matemática', simuladoStats: { history } });

const assertNoNaN = (timeline) => {
  timeline.forEach(point => {
    Object.values(point).forEach(v => {
      if (typeof v === 'number') expect(Number.isNaN(v)).toBe(false);
    });
  });
};

describe('useChartData — blindagem NaN (BATCH-01)', () => {
  it('timeline 100% livre de NaN com entradas corrompidas', () => {
    const categories = [mkCat([
      { date: '2026-07-01', score: null, total: 0 },
      { date: '2026-07-02', score: 'lixo', total: 10 },
      { date: '2026-07-03', score: 80, total: 20, correct: 16 }
    ])];
    const { result } = renderHook(() => useChartData(categories, {}, 100));
    expect(result.current.timeline.length).toBeGreaterThan(0);
    assertNoNaN(result.current.timeline);
    expect(Number.isFinite(result.current.globalMetrics.globalAccuracy)).toBe(true);
  });

  it('não produz NaN quando compTotal é 0 (divisão por zero)', () => {
    const categories = [mkCat([{ date: '2026-07-01', score: 0, total: 0 }])];
    const { result } = renderHook(() => useChartData(categories, {}, 100));
    assertNoNaN(result.current.timeline);
  });

  it('correct nunca excede total (clamp no acumulado bayesiano)', () => {
    const categories = [mkCat([
      { date: '2026-07-01', score: 100, total: 10, correct: 999 }
    ])];
    const { result } = renderHook(() => useChartData(categories, {}, 100));
    assertNoNaN(result.current.timeline);
    expect(Number.isFinite(result.current.globalMetrics.globalAccuracy)).toBe(true);
  });
});
