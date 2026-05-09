import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MonteCarloEvolutionChart } from '../MonteCarloEvolutionChart';
import { EvolutionHeatmap } from '../../EvolutionHeatmap';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('evolution components render contracts', () => {
  it('renders MonteCarloEvolutionChart shell with scenario controls', () => {
    const html = renderToStaticMarkup(
      <MonteCarloEvolutionChart
        data={[{ date: '2026-05-01', probability: 50, mean: 70, ci95Low: 65, ci95High: 75 }]}
        targetScore={75}
        unit="%"
        maxScore={100}
      />
    );
    expect(html).toContain('Evolução da Projeção');
    expect(html).toContain('Conserv.');
    expect(html).toContain('Base');
    expect(html).toContain('Otim.');
  });

  it('renders EvolutionHeatmap controls', () => {
    const heatmapData = {
      dates: [{ key: '2026-05-01', label: '01/05', dayName: 'SEX', isWeekend: false }],
      rows: [{ cat: { id: 'cat1', name: 'Matemática', icon: '📘', color: '#fff' }, cells: [{ pct: 80, correct: 8, total: 10 }] }]
    };
    const html = renderToStaticMarkup(<EvolutionHeatmap heatmapData={heatmapData} targetScore={70} unit="%" />);
    expect(html).toContain('Diário');
    expect(html).toContain('Semanal');
    expect(html).toContain('Mensal');
  });
});
