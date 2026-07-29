import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useChartData } from '../useChartData';

function renderHook(hookFn) {
  let result = { current: null };
  function TestComponent() {
    result.current = hookFn();
    return null;
  }
  renderToStaticMarkup(React.createElement(TestComponent));
  return { result };
}

describe('useChartData', () => {
  it('LOTE-01 · timeline 100% livre de NaN com entradas corrompidas', () => {
    const categories = [{
      id: 'mat', name: 'Matemática',
      simuladoStats: { history: [
        { date: '2026-07-01', score: null, total: 0 },
        { date: '2026-07-02', score: 'lixo', total: 10 },
        { date: '2026-07-03', score: 80, total: 20, correct: 16 }
      ]}
    }];
    const { result } = renderHook(() => useChartData(categories, {}, 100));
    expect(result.current.timeline.length).toBeGreaterThan(0);
    result.current.timeline.forEach(point => {
      Object.values(point).forEach(v => {
        if (typeof v === 'number') expect(Number.isNaN(v)).toBe(false);
      });
    });
    expect(Number.isFinite(result.current.globalMetrics.globalAccuracy)).toBe(true);
  });
});
