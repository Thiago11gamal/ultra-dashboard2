import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderHook } from '@testing-library/react';

import { sanitizeContest, repairContestHistory } from '../../../../store/schemas.js';
import { useChartData } from '../../../../hooks/useChartData.js';
import { useSubjectAggData } from '../../../../hooks/useSubjectAggData.js';
import { useEvolutionMC } from '../../../../hooks/useEvolutionMC.js';
import { simulateNormalDistribution } from '../../../../engine/monteCarlo.js';
import { __workerTesting } from '../../../../engine/mc.worker.js';
import { getMondayKey } from '../../../../utils/heatmapAggregation.js';
import EvolutionChart from '../../../EvolutionChart.jsx';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView.jsx';
import WeeklyPerformanceChart from '../WeeklyPerformanceChart.jsx';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart.jsx';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart.jsx';
import { TimeSpentChart } from '../TimeSpentChart.jsx';
import { CriticalTopicsAnalysis } from '../CriticalTopicsAnalysis.jsx';
import { EvolutionHeatmap } from '../../EvolutionHeatmap.jsx';
import { GaussianPlot } from '../../GaussianPlot.jsx';
import { useAppStore } from '../../../../store/useAppStore.js';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="recharts-responsive">{children}</div>,
    LineChart: ({ data, children }) => (
      <div data-testid="recharts-line-chart" data-count={data?.length ?? 0}>{children}</div>
    ),
    AreaChart: ({ data, children }) => (
      <div data-testid="recharts-area-chart" data-count={data?.length ?? 0}>{children}</div>
    ),
    BarChart: ({ data, children }) => (
      <div data-testid="recharts-bar-chart" data-count={data?.length ?? 0}>{children}</div>
    ),
    ComposedChart: ({ data, children }) => (
      <div data-testid="recharts-composed-chart" data-count={data?.length ?? 0}>{children}</div>
    ),
    Line: ({ name, dataKey }) => (
      <div data-testid="recharts-line" data-name={String(name ?? '')} data-key={String(dataKey ?? '')}>
        {name}
      </div>
    ),
    Area: ({ name, dataKey }) => (
      <div data-testid="recharts-area" data-name={String(name ?? '')} data-key={String(dataKey ?? '')}>
        {name}
      </div>
    ),
    Bar: ({ name, dataKey }) => (
      <div data-testid="recharts-bar" data-name={String(name ?? '')} data-key={String(dataKey ?? '')}>
        {name}
      </div>
    ),
  };
});

describe('Evolution Menu 2026 Audit - Regression Suite (16 Fixes)', () => {
  const originalStoreState = useAppStore.getState();

  afterEach(() => {
    vi.useRealTimers();
    useAppStore.setState(originalStoreState, true);
  });

  describe('Fix #1: schemas.js normalizeHistoryEntry percentage & topics hydration', () => {
    it('converts percentage score once without double-conversion and preserves topics-only totals', () => {
      const rawContest = {
        maxScore: 40,
        minScore: 0,
        categories: [
          {
            id: 'port',
            name: 'Português',
            maxScore: 40,
            minScore: 0,
            simuladoStats: {
              history: [
                { id: 'h1', date: '2026-05-01', score: 50, isPercentage: true, total: 10, correct: 5 },
                { id: 'h3', date: '2026-05-03', score: 50, unit: 'pct', scoreUnit: 'pct', total: 10, correct: 5 },
                {
                  id: 'h2',
                  date: '2026-05-02',
                  total: 0,
                  correct: 0,
                  topics: [{ name: 'Crase', total: 10, correct: 8, score: 32 }],
                },
              ],
            },
          },
        ],
      };

      const once = sanitizeContest(rawContest, 'c-test');
      const h1 = once.categories[0].simuladoStats.history.find((h) => h.id === 'h1');
      const h2 = once.categories[0].simuladoStats.history.find((h) => h.id === 'h2');
      const h3 = once.categories[0].simuladoStats.history.find((h) => h.id === 'h3');

      expect(h1.score).toBe(20);
      expect(h1.isPercentage).toBe(false);
      expect(h3.score).toBe(20);
      expect(h3.unit).toBe('points');
      expect(h3.scoreUnit).toBe('points');

      expect(h2.total).toBe(10);
      expect(h2.correct).toBe(8);
      expect(h2.score).toBe(32);

      // Re-sanitização não pode aplicar dupla conversão no score 20 -> 8
      const twice = sanitizeContest(once, 'c-test');
      expect(twice.categories[0].simuladoStats.history.find((h) => h.id === 'h1').score).toBe(20);

      // repairContestHistory suporta array direto e não dispara falsa corrupção no objeto contest com topics-only
      const repairedArr = repairContestHistory(rawContest.categories[0].simuladoStats.history, 40, 0);
      expect(repairedArr.find((h) => h.id === 'h2').total).toBe(10);

      const cleanContest = repairContestHistory(
        {
          ...rawContest,
          simuladoRows: [
            {
              id: 'sr1',
              categoryId: 'port',
              date: '2026-05-02',
              topics: [{ name: 'Crase', total: 10, correct: 8, score: 32 }],
            },
          ],
        },
        40,
        0
      );
      expect(cleanContest.lastUpdated).toBeUndefined();
    });
  });

  describe('Fix #2: useChartData & useSubjectAggData synthetic percent weighting', () => {
    it('weights real + synthetic accuracy with exact percentage while keeping totalQuestions pure', () => {
      const categories = [
        {
          id: 'real',
          name: 'Matemática',
          maxScore: 100,
          minScore: 0,
          simuladoStats: {
            history: [{ date: '2026-05-01', total: 20, correct: 10, score: 50 }],
          },
        },
        {
          id: 'pct',
          name: 'Atualidades',
          maxScore: 100,
          minScore: 0,
          simuladoStats: {
            history: [
              {
                date: '2026-05-01',
                total: 20,
                correct: 17,
                syntheticVolume: true,
                isPercentage: false,
                score: 83,
                scoreUnit: 'pct',
              },
            ],
          },
        },
      ];

      const { result: chartRes } = renderHook(() =>
        useChartData(categories, {}, 100, 0, 'raw', 'all', null, 1)
      );

      // Real-only counters stay 10/20
      expect(chartRes.current.globalMetrics.totalQuestions).toBe(20);
      expect(chartRes.current.globalMetrics.totalCorrect).toBe(10);
      // (10 + 16.6) / 40 * 100 = 66.5% (vs 67.5% arredondado 17/20)
      expect(chartRes.current.globalMetrics.globalAccuracy).toBeCloseTo(66.5, 1);

      const { result: aggRes } = renderHook(() =>
        useSubjectAggData({
          categories,
          showOnlyFocus: false,
          focusCategory: null,
          timeWindow: 'all',
          maxScore: 100,
          minScore: 0,
        })
      );
      const pctRow = aggRes.current.find((r) => r.id === 'pct');
      expect(pctRow.syntheticAcertosExact).toBeCloseTo(16.6, 2);
    });
  });

  describe('Fix #3 & #8: EvolutionChart simuladoRows hydration & MC timeline synthesis', () => {
    it('hydrates missing category history from simuladoRows even when categories list is empty', () => {
      useAppStore.setState({
        appState: {
          ...originalStoreState.appState,
          activeId: 'c1',
          contests: { c1: { categories: [], mcWeights: {} } },
        },
      });

      const { container } = render(
        <MemoryRouter>
          <EvolutionChart
            categories={[]}
            simuladoRows={[
              { id: 'r1', categoryId: 'dir', subject: 'Direito Civil', date: '2026-05-01', total: 10, correct: 8, score: 80 },
              { id: 'r2', categoryId: 'dir', subject: 'Direito Civil', date: '2026-05-05', total: 10, correct: 9, score: 90 },
            ]}
            maxScore={100}
            minScore={0}
            targetScore={75}
            unit="%"
          />
        </MemoryRouter>
      );

      expect(container.textContent).toContain('Direito Civil');
      expect(container.textContent).not.toContain('na sua conta para desbloquear os gráficos');
    });

    it('synthesizes MC trajectory when monteCarloHistory only has multiple snapshots on 1 unique day', async () => {
      vi.useFakeTimers();

      const categories = [
        {
          id: 'const',
          name: 'Constitucional',
          maxScore: 100,
          minScore: 0,
          simuladoStats: {
            history: [
              { id: 'h1', date: '2026-05-01', total: 20, correct: 14, score: 70 },
              { id: 'h2', date: '2026-05-08', total: 20, correct: 17, score: 85 },
            ],
          },
        },
      ];

      const { container, getByText } = render(
        <MemoryRouter>
          <EvolutionChart
            categories={categories}
            monteCarloHistory={[
              { date: '2026-05-08', categoryId: 'other', probability: 40, mean: 60 },
              { date: '2026-05-08', categoryId: 'other', probability: 45, mean: 62 },
            ]}
            maxScore={100}
            minScore={0}
            targetScore={75}
            unit="%"
          />
        </MemoryRouter>
      );

      fireEvent.click(getByText('Rastreador MC'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(750);
      });

      expect(container.textContent).not.toContain('Cadastre pelo menos 1 simulado na matéria em foco para ver a densidade');
      const composed = container.querySelector('[data-testid="recharts-composed-chart"], [data-testid="recharts-area-chart"]');
      expect(composed).not.toBeNull();
      expect(Number(composed.getAttribute('data-count'))).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Fix #4: WeeklyEvolutionView task.title fallback & timeWindow filtering', () => {
    it('resolves topic name via task.title when task.text is omitted and respects timeWindow', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

      const categories = [
        {
          id: 'adm',
          name: 'Direito Administrativo',
          tasks: [{ id: 't1', title: 'Licitações' }],
          simuladoStats: {
            history: [
              {
                date: '2026-05-08',
                score: 80,
                total: 10,
                correct: 8,
                topics: [{ taskId: 't1', total: 10, correct: 8 }],
              },
            ],
          },
        },
      ];

      const { container, getByLabelText } = render(
        <WeeklyEvolutionView
          categories={categories}
          showOnlyFocus={true}
          focusSubjectId="adm"
          timeWindow="30"
          maxScore={100}
          minScore={0}
          unit="%"
        />
      );

      fireEvent.click(getByLabelText('Alternar para visão de evolução semanal'));
      const line = container.querySelector('[data-testid="recharts-line"][data-name="Licitações"]');
      expect(line).not.toBeNull();

      // Entradas mais antigas que timeWindow="30" ficam vazias
      const staleView = render(
        <WeeklyEvolutionView
          categories={[
            {
              ...categories[0],
              simuladoStats: {
                history: [{ date: '2026-02-01', score: 80, total: 10, correct: 8, topics: [{ taskId: 't1', total: 10, correct: 8 }] }],
              },
            },
          ]}
          showOnlyFocus={true}
          focusSubjectId="adm"
          timeWindow="30"
          maxScore={100}
          minScore={0}
          unit="%"
        />
      );
      expect(staleView.container.textContent).toContain('Dados insuficientes');
    });
  });

  describe('Fix #5: monteCarlo.js visual CI boundary clamping', () => {
    it('keeps clamped visual CI properly ordered near maxScore and minScore', () => {
      const highRes = simulateNormalDistribution({
        mean: 99.9,
        sd: 0.01,
        targetScore: 80,
        minScore: 0,
        maxScore: 100,
        simulations: 2000,
        seed: 42,
      });
      expect(highRes.ci95VisualClamped).toBe(true);
      expect(highRes.ci95VisualHigh).toBe(100);
      expect(highRes.ci95VisualLow).toBeCloseTo(99.5, 4);
      expect(highRes.ci95VisualLow).toBeLessThan(highRes.ci95VisualHigh);

      const lowRes = simulateNormalDistribution({
        mean: 0.1,
        sd: 0.01,
        targetScore: 80,
        minScore: 0,
        maxScore: 100,
        simulations: 2000,
        seed: 42,
      });
      expect(lowRes.ci95VisualClamped).toBe(true);
      expect(lowRes.ci95VisualLow).toBe(0);
      expect(lowRes.ci95VisualHigh).toBeCloseTo(0.5, 4);
      expect(lowRes.ci95VisualLow).toBeLessThan(lowRes.ci95VisualHigh);
    });
  });

  describe('Fix #6: mc.worker.js sanitizeSubjects preserves undefined minCutoff', () => {
    it('does not inject minCutoff: 0 when omitted or blank', () => {
      const sanitized = __workerTesting.sanitizeSubjects(
        [
          { id: 's1', name: 'Português', mean: 70, sd: 5 },
          { id: 's2', name: 'RLM', mean: 60, sd: 4, minCutoff: '' },
          { id: 's3', name: 'Informática', mean: 80, sd: 4, minCutoff: 50 },
        ],
        0,
        100
      );

      expect(sanitized[0].minCutoff).toBeUndefined();
      expect(sanitized[1].minCutoff).toBeUndefined();
      expect(sanitized[2].minCutoff).toBe(50);
    });
  });

  describe('Fix #7 & #15: useEvolutionMC tab sync, immediate loading & topic alias fingerprint', () => {
    it('sets mcLoading immediately before debounce on stats tab and invalidates on topic alias change', async () => {
      vi.useFakeTimers();

      const makeCat = (scorePct, totalQuestoes) => ({
        id: 'c1',
        name: 'Direito Penal',
        simuladoStats: {
          history: [
            {
              id: 'h1',
              date: '2026-05-05',
              score: 75,
              total: 20,
              correct: 15,
              topics: { t1: { name: 'Dolo', totalQuestoes, correctCount: 15, scorePct } },
            },
          ],
        },
      });

      const { result, rerender } = renderHook(
        ({ cat }) =>
          useEvolutionMC({
            focusCategory: cat,
            categoryLevels: { c1: 75 },
            projectDays: 30,
            targetScore: 70,
            minScore: 0,
            maxScore: 100,
            activeEngine: 'stats',
          }),
        { initialProps: { cat: makeCat(75, 20) } }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5);
      });
      expect(result.current.mcLoading).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(750);
      });
      expect(result.current.mcLoading).toBe(false);
      expect(result.current.mcResult).not.toBeNull();

      // Alterando apenas alias de tópico deve invalidar historyFingerprint e disparar novo ciclo MC
      rerender({ cat: makeCat(90, 30) });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5);
      });
      expect(result.current.mcLoading).toBe(true);
    });
  });

  describe('Fix #9: TodayVsGeneralChart same-day precedence & timeWindow generalAccuracy', () => {
    it('prevents date-only aggregate from overwriting timestamped simuladoRow and filters generalAccuracy', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T18:00:00.000Z'));

      const categories = [
        {
          id: 'c1',
          name: 'Português',
          simuladoStats: {
            history: [
              { date: '2026-03-01', total: 10, correct: 1, score: 10 },
              { date: '2026-05-10', total: 10, correct: 5, score: 50 },
            ],
          },
        },
      ];

      const { container } = render(
        <TodayVsGeneralChart
          categories={categories}
          focusCategory={categories[0]}
          simuladoRows={[
            {
              id: 's1',
              categoryId: 'c1',
              date: '2026-05-10',
              createdAt: '2026-05-10T14:00:00.000Z',
              total: 10,
              correct: 9,
              score: 90,
            },
          ]}
          timeWindow="30"
          targetScore={70}
          minScore={0}
          maxScore={100}
          unit="%"
        />
      );

      expect(container.textContent).toContain('Último Teste');
      expect(container.textContent).toContain('90.0%');
      // Média geral nos últimos 30 dias exclui 2026-03-01 (10%) -> 50.0%
      expect(container.textContent).toContain('Geral50.0%');
    });
  });

  describe('Fix #10: WeeklyPerformanceChart String ID matching & topics fallback', () => {
    it('matches numeric focusSubjectId with string cat.id and recovers totals from topics', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

      const categories = [
        {
          id: '101',
          name: 'Português',
          simuladoStats: {
            history: [
              {
                date: '2026-05-09',
                total: 0,
                correct: 0,
                timeSpent: 600,
                topics: [{ name: 'Crase', total: 10, correct: 8, score: 80 }],
              },
            ],
          },
        },
      ];

      const { container } = render(
        <WeeklyPerformanceChart
          categories={categories}
          showOnlyFocus={true}
          focusSubjectId={101}
          maxScore={100}
          minScore={0}
          unit="%"
        />
      );

      expect(container.textContent).not.toContain('Sem atividade nos últimos 7 dias.');
      expect(container.querySelector('[data-testid="recharts-composed-chart"]')).not.toBeNull();
    });
  });

  describe('Fix #11: SubtopicsPerformanceChart cross-category topic scoping', () => {
    it('disambiguates identical topic names from different subjects when not focused', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

      const categories = [
        {
          id: 'port',
          name: 'Português',
          simuladoStats: {
            history: [{ date: '2026-05-09', total: 10, correct: 8, topics: [{ name: 'Crase', total: 10, correct: 8 }] }],
          },
        },
        {
          id: 'red',
          name: 'Redação',
          simuladoStats: {
            history: [{ date: '2026-05-09', total: 10, correct: 6, topics: [{ name: 'Crase', total: 10, correct: 6 }] }],
          },
        },
      ];

      const { container, getByText } = render(
        <SubtopicsPerformanceChart
          categories={categories}
          showOnlyFocus={false}
          timeWindow="30"
          maxScore={100}
          minScore={0}
        />
      );

      fireEvent.click(getByText('Tempo (Linhas)'));
      expect(container.textContent).toContain('2 tópicos plotados simultaneamente');
      expect(container.querySelector('[data-testid="recharts-line"][data-name="Crase (Português)"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="recharts-line"][data-name="Crase (Redação)"]')).not.toBeNull();
    });
  });

  describe('Fix #12: TimeSpentChart tie-breaking, scorePoints fallback & timeWindow', () => {
    it('tie-breaks same-day sessions by createdAt and filters out entries older than timeWindow', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T18:00:00.000Z'));

      const subjectAggData = [{ id: 'c1', fullName: 'História', timeSpent: 150, timedQuestoes: 10 }];
      const categories = [
        {
          id: 'c1',
          name: 'História',
          maxScore: 100,
          simuladoStats: {
            history: [
              { date: '2026-05-10', createdAt: '2026-05-10T12:00:00.000Z', total: 0, scorePoints: 80, timeSpent: 1200 },
              { date: '2026-05-10', createdAt: '2026-05-10T17:00:00.000Z', total: 10, timeSpent: 150 },
            ],
          },
        },
      ];

      const { container } = render(
        <TimeSpentChart
          subjectAggData={subjectAggData}
          activeCategories={categories}
          categories={categories}
          timeWindow="30"
          maxScore={100}
          minScore={0}
        />
      );
      expect(container.textContent).toContain('Última média15s');
      expect(container.textContent).toContain('2m 30s');
      expect(container.textContent).toContain('Média Dia45s');

      const staleOnly = [
        {
          id: 'c1',
          name: 'História',
          maxScore: 100,
          simuladoStats: {
            history: [{ date: '2026-02-01', total: 10, timeSpent: 150 }],
          },
        },
      ];
      const staleRender = render(
        <TimeSpentChart
          subjectAggData={[{ id: 'c1', fullName: 'História', timeSpent: 0, timedQuestoes: 0 }]}
          activeCategories={staleOnly}
          categories={staleOnly}
          timeWindow="7"
          maxScore={100}
          minScore={0}
        />
      );
      expect(staleRender.container.textContent).toContain('Coletando dados de agilidade IA');
    });
  });

  describe('Fix #13: EvolutionHeatmap focus empty dates & getMondayKey UTC safety', () => {
    it('computes Monday UTC key cleanly and avoids leaking other rows dates when focused row has no data', () => {
      expect(getMondayKey('2026-11-15')).toBe('2026-11-09');
      expect(getMondayKey('2026-11-09')).toBe('2026-11-09');

      const heatmapData = {
        dates: [{ key: '2026-05-09', label: '09/05', dayName: 'SÁB', isWeekend: true }],
        rows: [
          { cat: { id: 'c1', name: 'Sem Simulados' }, cells: [null] },
          { cat: { id: 'c2', name: 'Com Simulados' }, cells: [{ pct: 80, correct: 8, total: 10 }] },
        ],
      };

      const { container } = render(
        <EvolutionHeatmap heatmapData={heatmapData} showOnlyFocus={true} focusSubjectId="c1" />
      );
      expect(container.textContent).toContain('Nenhum dado encontrado.');
    });
  });

  describe('Fix #14: CriticalTopicsAnalysis timeWindow filtering', () => {
    it('excludes stale errors outside the selected timeWindow', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

      const categories = [
        {
          id: 'fis',
          name: 'Física',
          simuladoStats: {
            history: [
              {
                date: '2026-02-01',
                total: 10,
                correct: 2,
                score: 20,
                topics: [{ name: 'Óptica', total: 10, correct: 2, score: 20 }],
              },
            ],
          },
        },
      ];

      const { container } = render(
        <CriticalTopicsAnalysis categories={categories} timeWindow="30" maxScore={100} minScore={0} />
      );
      expect(container.textContent).toContain('Nenhum dado registrado');
    });
  });

  describe('Fix #16: GaussianPlot zero-width bounding rect guard', () => {
    it('does not crash or compute NaN on mouseMove when rect.width is 0', () => {
      const { container } = render(
        <GaussianPlot mean={75} sd={8} targetScore={70} minScore={0} maxScore={100} unit="%" />
      );

      const root = container.firstElementChild;
      fireEvent.mouseMove(root, { clientX: 50 });
      expect(container.textContent).not.toContain('NaN');
    });
  });
});

