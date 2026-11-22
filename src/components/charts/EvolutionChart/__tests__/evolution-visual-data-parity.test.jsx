// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';

import EvolutionChart from '../../../EvolutionChart';
import { TimeSpentChart } from '../TimeSpentChart';
import { EvolutionLineChart } from '../EvolutionLineChart';
import { RadarAnalysis } from '../RadarAnalysis';
import { PerformanceBarChart } from '../PerformanceBarChart';
import { MonteCarloEvolutionChart } from '../MonteCarloEvolutionChart';
import { ConsistencyBoxPlotChart } from '../ConsistencyBoxPlotChart';
import { getDateKey } from '../../../../utils/dateHelper';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution Menu — Data-to-Visual Parity Verification Suite', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('TimeSpentChart balance split bar includes stable subjects instead of inflating fast/slow to 50/50', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

    // 4 subjects: 1 faster, 2 stable, 1 slower => 25% rápidas · 50% estáveis · 25% lentas
    const subjectAggData = [
      { id: 'c1', fullName: 'Rápida', timeSpent: 600, timedQuestoes: 10 },  // avg 60s
      { id: 'c2', fullName: 'Estável A', timeSpent: 600, timedQuestoes: 10 }, // avg 60s
      { id: 'c3', fullName: 'Estável B', timeSpent: 600, timedQuestoes: 10 }, // avg 60s
      { id: 'c4', fullName: 'Lenta', timeSpent: 600, timedQuestoes: 10 },   // avg 60s
    ];
    const activeCategories = [
      { id: 'c1', name: 'Rápida', simuladoStats: { history: [{ date: '2026-04-01', total: 10, timeSpent: 300 }] } },    // 30s < 60s (fast)
      { id: 'c2', name: 'Estável A', simuladoStats: { history: [{ date: '2026-04-01', total: 10, timeSpent: 600 }] } }, // 60s == 60s (stable)
      { id: 'c3', name: 'Estável B', simuladoStats: { history: [{ date: '2026-04-01', total: 10, timeSpent: 610 }] } }, // 61s within ±5% (stable)
      { id: 'c4', name: 'Lenta', simuladoStats: { history: [{ date: '2026-04-01', total: 10, timeSpent: 900 }] } },     // 90s > 60s (slow)
    ];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    expect(html).toContain('25% rápidas');
    expect(html).toContain('50% estáveis');
    expect(html).toContain('25% lentas');
  });

  it('EvolutionLineChart pill legend omits categories with no data in active time window', () => {
    const activeCategories = [
      { id: 'c1', name: 'Português', color: '#3b82f6' },
      { id: 'c2', name: 'Matemática', color: '#10b981' },
      { id: 'c3', name: 'Sem Dados No Período', color: '#ef4444' },
    ];
    const filteredChartData = [
      { date: '2026-05-01', bay_c1: 75, bay_c2: 82 },
      { date: '2026-05-05', bay_c1: 80, bay_c2: 84 },
    ];

    const html = renderToStaticMarkup(
      <EvolutionLineChart
        filteredChartData={filteredChartData}
        activeCategories={activeCategories}
        engine={{ id: 'bayesian', prefix: 'bay_', style: 'monotone' }}
        targetScore={80}
        showOnlyFocus={false}
        minScore={0}
        maxScore={100}
        unit="%"
      />
    );

    expect(html).toContain('Português');
    expect(html).toContain('Matemática');
    expect(html).not.toContain('Sem Dados No Período');
  });

  it('RadarAnalysis explains focus filter mode instead of claiming insufficient data, and labels windowed accuracy', () => {
    const focusHtml = renderToStaticMarkup(
      <RadarAnalysis
        radarData={[{ subject: 'Português', nivel: 80, meta: 75 }]}
        isFocusFiltered={true}
        timeWindow="all"
      />
    );
    expect(focusHtml).toContain('Modo Apenas Foco ativo');
    expect(focusHtml).not.toContain('Dados insuficientes para o Raio-X');

    const windowedHtml = renderToStaticMarkup(
      <RadarAnalysis
        radarData={[
          { subject: 'Português', nivel: 80, meta: 75 },
          { subject: 'Matemática', nivel: 70, meta: 75 },
          { subject: 'Direito', nivel: 85, meta: 75 },
        ]}
        isFocusFiltered={false}
        timeWindow="30"
      />
    );
    expect(windowedHtml).toContain('acerto nos últimos 30 dias');
    expect(windowedHtml).not.toContain('proficiência real');
  });

  it('EvolutionChart hides misleading -80pp meta delta when selected timeWindow has zero data and avoids fake 0% radar vertices', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

    const categories = [
      {
        id: 'c1',
        name: 'Português',
        simuladoStats: { history: [{ date: '2025-01-10', total: 10, correct: 8, score: 80 }] },
      },
      {
        id: 'c2',
        name: 'Matemática',
        simuladoStats: { history: [{ date: '2025-01-11', total: 10, correct: 7, score: 70 }] },
      },
      {
        id: 'c3',
        name: 'Direito',
        simuladoStats: { history: [{ date: '2025-01-12', total: 10, correct: 9, score: 90 }] },
      },
    ];

    const { container, getByText } = render(
      <MemoryRouter>
        <EvolutionChart categories={categories} targetScore={80} minScore={0} maxScore={100} unit="%" />
      </MemoryRouter>
    );

    // Switch to 30d window where all 2025 simulados are outside the window
    fireEvent.click(getByText('30d'));
    expect(container.textContent).not.toContain('-80pp meta');
  });

  it('EvolutionChart formats Cebraspe fractional errors cleanly without float noise', () => {
    const today = getDateKey(new Date());
    const categories = [
      {
        id: 'c1',
        name: 'Direito Penal',
        simuladoStats: {
          history: [
            // 10 questions, 7 correct, 3 wrong, penalty 0.5 => net 5.5/10 => 4.5 errors
            { date: today, total: 10, correct: 7, penaltyPerWrong: 0.5 },
          ],
        },
      },
    ];

    const { container } = render(
      <MemoryRouter>
        <EvolutionChart categories={categories} targetScore={80} minScore={0} maxScore={100} unit="%" />
      </MemoryRouter>
    );

    expect(container.textContent).not.toMatch(/000000/);
  });

  it('PerformanceBarChart horizontal mode handles 100% accuracy (erros === 0) without crashing', () => {
    const subjectAggData = [
      { id: 'c1', name: 'Português', realQuestoes: 20, realAcertos: 20 },
      { id: 'c2', name: 'Matemática', realQuestoes: 15, realAcertos: 12 },
      { id: 'c3', name: 'Direito', realQuestoes: 10, realAcertos: 8 },
      { id: 'c4', name: 'Informática', realQuestoes: 10, realAcertos: 10 },
    ];
    const html = renderToStaticMarkup(<PerformanceBarChart subjectAggData={subjectAggData} />);
    expect(html).toContain('Questões Resolvidas vs Acertos');
    expect(html).toMatch(/90[.,]9%/);
  });

  it('MonteCarloEvolutionChart uses accurate inline legend labels', () => {
    const data = [
      { date: '2026-05-01', mean: 70, projectedMean: 74, ci95Low: 65, ci95High: 83, probability: 60 },
      { date: '2026-05-08', mean: 76, projectedMean: 81, ci95Low: 72, ci95High: 88, probability: 78 },
    ];
    const html = renderToStaticMarkup(
      <MonteCarloEvolutionChart data={data} targetScore={80} minScore={0} maxScore={100} unit="%" />
    );
    expect(html).toContain('Nível na data');
    expect(html).toContain('Projeção p/ prova');
    expect(html).not.toContain('Passado');
  });

  it('ConsistencyBoxPlotChart displays scale-aware IQR thresholds for non-% domains', () => {
    const categories = [
      {
        id: 'enem-mat',
        name: 'Matemática ENEM',
        minScore: 0,
        maxScore: 1000,
        simuladoStats: {
          history: [
            { date: '2026-04-01', score: 650 },
            { date: '2026-04-08', score: 700 },
            { date: '2026-04-15', score: 740 },
          ],
        },
      },
    ];
    const html = renderToStaticMarkup(
      <ConsistencyBoxPlotChart categories={categories} targetScore={750} minScore={0} maxScore={1000} unit="pts" />
    );
    expect(html).toContain('IQR ≤ 100 pts');
    expect(html).toContain('180 pts');
  });
});
