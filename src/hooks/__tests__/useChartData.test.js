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

  it('correctly scales category with custom maxScore and preserves ground truth in heatmap and metrics', () => {
    const categories = [{
      id: 'port',
      name: 'Português',
      maxScore: 20,
      minScore: 0,
      simuladoStats: {
        history: [
          // 8 correct out of 10 in a 20-point scale category
          { date: '2026-07-04', total: 10, correct: 8, wrong: 2, score: 16 }
        ]
      }
    }];
    const { result } = renderHook(() => useChartData(categories, {}, 100, 0));
    expect(result.current.globalMetrics.totalQuestions).toBe(10);
    expect(result.current.globalMetrics.totalCorrect).toBe(8);
    expect(result.current.globalMetrics.globalAccuracy).toBe(80);

    const heatmapCell = result.current.heatmapData.rows[0].cells[0];
    expect(heatmapCell.pct).toBe(80);
    expect(heatmapCell.correct).toBe(8);
    expect(heatmapCell.total).toBe(10);
  });

  it('correct nunca excede total (clamp no acumulado bayesiano)', () => {
    const categories = [mkCat([
      { date: '2026-07-01', score: 100, total: 10, correct: 999 }
    ])];
    const { result } = renderHook(() => useChartData(categories, {}, 100));
    assertNoNaN(result.current.timeline);
    expect(Number.isFinite(result.current.globalMetrics.globalAccuracy)).toBe(true);
  });

  it('preserva rawCorrect exato no acumulado e não vaza volume sintético para raw_total/global_total', () => {
    const categories = [mkCat([
      { date: '2026-07-01', total: 3, correct: 2, score: 67 },
      { date: '2026-07-02', total: 0, score: 83 }
    ])];
    const { result } = renderHook(() => useChartData(categories, {}, 100, 0));
    const [pt1, pt2] = result.current.timeline;
    expect(pt1.raw_correct_mat).toBe(2);
    expect(pt1.raw_total_mat).toBe(3);
    expect(pt1.raw_mat).toBeCloseTo(66.6667, 2);
    // Simulado apenas percentual não injeta 20 questões sintéticas em raw_total nem global_total
    expect(pt2.raw_total_mat).toBe(0);
    expect(pt2.global_total).toBe(0);
    expect(pt2.raw_mat).toBeCloseTo(83, 2);
  });

  it('inclui entradas registradas apenas por tópicos (h.topics) na timeline, heatmap e globalMetrics', () => {
    const categories = [mkCat([
      {
        date: '2026-07-05',
        total: 0,
        score: null,
        topics: [
          { name: 'Álgebra', total: 10, correct: 8 },
          { name: 'Geometria', total: 10, correct: 6 }
        ]
      }
    ])];
    const { result } = renderHook(() => useChartData(categories, {}, 100, 0));
    expect(result.current.activeCategories.length).toBe(1);
    expect(result.current.timeline.length).toBe(1);
    expect(result.current.globalMetrics.totalQuestions).toBe(20);
    expect(result.current.globalMetrics.totalCorrect).toBe(14);
    expect(result.current.globalMetrics.globalAccuracy).toBe(70);
  });
});
