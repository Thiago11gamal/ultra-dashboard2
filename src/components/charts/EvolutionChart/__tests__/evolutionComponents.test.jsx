import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MonteCarloEvolutionChart } from '../MonteCarloEvolutionChart';
import { EvolutionHeatmap } from '../../EvolutionHeatmap';
import { CriticalTopicsAnalysis } from '../CriticalTopicsAnalysis';
import { RadarAnalysis } from '../RadarAnalysis';
import { TimeSpentChart } from '../TimeSpentChart';
import { PerformanceBarChart } from '../PerformanceBarChart';
import { EvolutionLineChart } from '../EvolutionLineChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';

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
        data={[
          { date: '2026-05-01', probability: 50, mean: 70, ci95Low: 65, ci95High: 75 },
          { date: '2026-05-02', probability: 55, mean: 72, ci95Low: 67, ci95High: 77 }
        ]}
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

  it('renders CriticalTopicsAnalysis', () => {
    const today = new Date().toISOString().split('T')[0];
    const categories = [{
      id: 'cat1', name: 'Física', icon: '⚛️', color: '#fff',
      simuladoStats: {
        history: [{
          date: today,
          total: 10,
          correct: 2,
          score: 20,
          topics: [{ name: 'Cinemática', total: 10, correct: 2, score: 20 }]
        }]
      }
    }];
    const html = renderToStaticMarkup(<CriticalTopicsAnalysis categories={categories} maxScore={100} />);
    expect(html).toContain('Índice de Criticidade');
  });

  it('renders RadarAnalysis', () => {
    const radarData = [{
      subject: 'Matemática', score: 80, target: 70
    }];
    const html = renderToStaticMarkup(<RadarAnalysis radarData={radarData} maxScore={100} />);
    expect(html).toContain('Equilíbrio Geral');
  });

  it('renders TimeSpentChart', () => {
    const subjectAggData = [{
      fullName: 'Química', timeSpent: 120, questoes: 10, timedQuestoes: 10
    }];
    const html = renderToStaticMarkup(<TimeSpentChart subjectAggData={subjectAggData} />);
    expect(html).toContain('Tempo M');
    expect(html).toContain('Última Média');
  });

  it('renders CriticalTopicsAnalysis com suporte a synthetic total (nova matematica)', () => {
    const today = new Date().toISOString().split('T')[0];
    const categories = [{
      id: 'cat1', name: 'Física', icon: '⚛️', color: '#fff',
      simuladoStats: {
        history: [{
          date: today,
          total: 0,
          correct: 0,
          score: 500,
          topics: [{ name: 'Cinemática', total: 0, correct: 0, score: 500 }]
        }]
      }
    }];
    const html = renderToStaticMarkup(<CriticalTopicsAnalysis categories={categories} maxScore={1000} />);
    expect(html).toContain('Índice de Criticidade');
  });

  it('renders RadarAnalysis com suporte a minScore dinamico (nova matematica)', () => {
    const radarData = [{
      subject: 'Matemática', score: 800, target: 700
    }];
    const html = renderToStaticMarkup(<RadarAnalysis radarData={radarData} minScore={200} maxScore={1000} unit="pts" />);
    expect(html).toContain('Equilíbrio Geral');
  });

  it('renders PerformanceBarChart com suporte a units (nova matematica)', () => {
    const subjectAggData = [{
      fullName: 'Química', questoes: 10, erros: 2, scoreNorm: 800
    }];
    const html = renderToStaticMarkup(<PerformanceBarChart subjectAggData={subjectAggData} unit="pts" maxScore={1000} />);
    expect(html).toContain('Questões Resolvidas vs Acertos');
  });

  it('renders EvolutionLineChart without isLineClicked reference errors', () => {
    const categories = [{ id: 'cat1', name: 'Direito Constitucional', color: '#6366f1' }];
    const chartData = [{ date: '2026-05-01', displayDate: '01/05', raw_cat1: 80, bay_cat1: 78, stats_cat1: 75 }];
    const html = renderToStaticMarkup(
      <EvolutionLineChart
        activeCategories={categories}
        filteredChartData={chartData}
        engine={{ id: 'bayesian', prefix: 'bay_' }}
        targetScore={70}
        maxScore={100}
        minScore={0}
        unit="%"
      />
    );
    expect(html).toContain('Traçando evolução');
  });

  it('renders TodayVsGeneralChart with negative delta formatting correctly', () => {
    const today = new Date().toISOString().split('T')[0];
    const categories = [{
      id: 'cat1', name: 'Português',
      simuladoStats: {
        history: [
          { date: '2026-05-01', total: 10, correct: 9, score: 90 },
          { date: today, total: 10, correct: 8, score: 80 }
        ]
      }
    }];
    const simuladoRows = [
      { date: today, categoryId: 'cat1', subject: 'Português', total: 10, correct: 4, score: 40 }
    ];
    const html = renderToStaticMarkup(
      <TodayVsGeneralChart
        categories={categories}
        simuladoRows={simuladoRows}
        globalMetrics={{ globalAccuracy: 70 }}
        targetScore={70}
        maxScore={100}
        minScore={0}
        unit="%"
      />
    );
    expect(html).toContain('Ritmo (Hoje)');
    expect(html).toContain('−40.0%');
  });

  it('generates burnout and dynamic engine insights in insightGenerator', () => {
    const today = new Date().toISOString().split('T')[0];
    const cat = {
      id: 'cat1', name: 'Biologia',
      simuladoStats: {
        history: [
          { date: today, total: 50, correct: 20, score: 40 }
        ]
      }
    };
    const timeline = [
      { date: today, raw_cat1: 40, bay_cat1: 75, stats_cat1: 70 }
    ];
    const insight = generateEvolutionInsights({
      timeline,
      focusCategory: cat,
      activeEngine: 'compare',
      categories: [cat],
      unit: '%',
      maxScore: 100,
      minScore: 0
    });
    expect(insight).toBeDefined();
    expect(insight.title).toContain('Alerta de Burnout');
  });

  it('renders PerformanceBarChart with 100% correct answers (erros === 0) without breaking stack', () => {
    const subjectAggData = [{
      name: 'Direito Penal', fullName: 'Direito Penal', questoes: 10, acertos: 10, erros: 0
    }];
    const html = renderToStaticMarkup(<PerformanceBarChart subjectAggData={subjectAggData} unit="%" maxScore={100} />);
    expect(html).toContain('Questões Resolvidas vs Acertos');
    expect(html).toContain('Acertos');
    expect(html).toContain('Erros');
  });

  it('renders EvolutionHeatmap with non-standard scale (ENEM 200-1000) correctly', () => {
    const heatmapData = {
      dates: [{ key: '2026-05-01', label: '01/05', dayName: 'SEX', isWeekend: false }],
      rows: [{ cat: { id: 'cat1', name: 'Redação', icon: '📝', color: '#fff' }, cells: [{ pct: 85, correct: 850, total: 1000 }] }]
    };
    const html = renderToStaticMarkup(
      <EvolutionHeatmap
        heatmapData={heatmapData}
        targetScore={750}
        minScore={200}
        maxScore={1000}
        unit="pts"
      />
    );
    expect(html).toContain('Diário');
    expect(html).toContain('meta');
  });
});
