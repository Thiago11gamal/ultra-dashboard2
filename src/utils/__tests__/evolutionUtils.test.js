import { describe, it, expect } from 'vitest';
import { applyScenarioAdjustments, classifyScenarioSignal } from '../monteCarloScenario';
import { aggregateHeatmap, getMondayKey } from '../heatmapAggregation';
import { computeTopRegressions, computeTrendKpi } from '../weeklyEvolutionInsights';

describe('evolution utils', () => {
  it('applies scenario ordering for mean', () => {
    const base = [{ mean: 70, probability: 50, ciRange: [60, 80] }];
    const cons = applyScenarioAdjustments(base, 'conservative', 100)[0];
    const mid = applyScenarioAdjustments(base, 'base', 100)[0];
    const opt = applyScenarioAdjustments(base, 'optimistic', 100)[0];
    expect(cons.mean).toBeLessThanOrEqual(mid.mean);
    expect(mid.mean).toBeLessThanOrEqual(opt.mean);
  });

  it('aggregates heatmap weekly and monthly', () => {
    expect(getMondayKey('2026-05-10')).toBe('2026-05-04');
    const filtered = {
      dates: [{ key: '2026-05-04', label: '04/05' }, { key: '2026-05-05', label: '05/05' }, { key: '2026-05-12', label: '12/05' }],
      rows: [{ cells: [{ total: 10, correct: 7 }, { total: 10, correct: 9 }, { total: 20, correct: 10 }] }]
    };
    const weekly = aggregateHeatmap(filtered, 'weekly');
    expect(weekly.dates.length).toBe(2);
    const monthly = aggregateHeatmap(filtered, 'monthly');
    expect(monthly.dates.length).toBe(1);
  });

  it('computes weekly insights', () => {
    const chartData = [
      { displayDate: '01/01', a: 60, b: 55, meta_a: { currTot: 10 }, meta_b: { currTot: 10 }, delta_a: null, delta_b: null },
      { displayDate: '08/01', a: 62, b: 54, meta_a: { currTot: 10 }, meta_b: { currTot: 10 }, delta_a: 2, delta_b: -1 },
      { displayDate: '15/01', a: 59, b: 50, meta_a: { currTot: 10 }, meta_b: { currTot: 10 }, delta_a: -3, delta_b: -4 },
      { displayDate: '22/01', a: 58, b: 52, meta_a: { currTot: 10 }, meta_b: { currTot: 10 }, delta_a: -1, delta_b: 2 },
      { displayDate: '29/01', a: 57, b: 48, meta_a: { currTot: 10 }, meta_b: { currTot: 10 }, delta_a: -1, delta_b: -4 },
    ];
    const keys = ['a', 'b'];
    const activeKeys = { a: { name: 'A' }, b: { name: 'B' } };
    const hiddenKeys = { a: false, b: false };

    const regs = computeTopRegressions({ viewMode: 'variation', chartData, keys, activeKeys, hiddenKeys });
    expect(regs[0].key).toBe('b');

    const trend = computeTrendKpi({ chartData, keys, hiddenKeys });
    expect(Number.isFinite(trend.delta)).toBe(true);
  });



  it('handles invalid heatmap date keys without breaking aggregation', () => {
    const filtered = {
      dates: [{ key: 'invalid-date', label: '??' }, { key: '2026-05-06', label: '06/05' }],
      rows: [{ cells: [{ total: 0, correct: 0 }, { total: 10, correct: 8 }] }]
    };

    const weekly = aggregateHeatmap(filtered, 'weekly');
    expect(weekly.dates.length).toBe(2);
    expect(weekly.rows[0].cells[0]).toEqual({ total: 0, correct: 0, pct: null });
    expect(weekly.rows[0].cells[1]).toEqual({ total: 10, correct: 8, pct: 80 });
  });

  it('returns null trend KPI when there are not enough prior windows', () => {
    const chartData = [
      { displayDate: '01/01', a: 60, meta_a: { currTot: 10 } },
      { displayDate: '08/01', a: 62, meta_a: { currTot: 10 } },
      { displayDate: '15/01', a: 63, meta_a: { currTot: 10 } },
      { displayDate: '22/01', a: 64, meta_a: { currTot: 10 } },
    ];

    const trend = computeTrendKpi({ chartData, keys: ['a'], hiddenKeys: { a: false } });
    expect(trend).toBeNull();
  });

  it('classifies signal', () => {
    const signal = classifyScenarioSignal([{ ciRange: [70, 73] }, { ciRange: [70, 74] }, { ciRange: [70, 72] }, { ciRange: [70, 72] }], 100);
    expect(signal).not.toBeNull();
  });
});
