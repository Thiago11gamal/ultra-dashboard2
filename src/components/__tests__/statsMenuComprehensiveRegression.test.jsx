import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useAppStore } from '../../store/useAppStore.js';
import { sanitizeContest } from '../../store/schemas.js';
import { generateAnalyticsStats } from '../../engine/analyticsStats.js';
import { simulateNormalDistribution } from '../../engine/monteCarlo.js';
import { backfillObservedFromSimulados } from '../../utils/calibration.js';
import { isPhantomZeroTimeAttempt } from '../../utils/scoreHelper.js';
import { useMonteCarloStats } from '../../hooks/useMonteCarloStats.js';
import MonteCarloGauge from '../MonteCarloGauge.jsx';
import { MonteCarloConfig } from '../charts/MonteCarloConfig.jsx';
import { GaussianPlot } from '../charts/GaussianPlot.jsx';
import WeeklyAnalysis from '../WeeklyAnalysis.jsx';
import DueForecast from '../DueForecast.jsx';

describe('Stats Menu Comprehensive Regression Suite (17 Bugs)', () => {
  beforeEach(() => {
    useAppStore.setState((s) => ({
      appState: {
        ...s.appState,
        activeId: 'stats-reg-test',
        mcEqualWeights: false,
        contests: {
          ...(s.appState?.contests || {}),
          'stats-reg-test': {
            contestName: 'Regressão',
            maxScore: 100,
            minScore: 0,
            examDurationMinutes: 240,
            examTotalQuestions: 100,
            mcWeights: { cat1: 3, cat2: 1 },
            categories: [],
            simuladoRows: [],
            calibrationEvents: [],
            monteCarloHistory: []
          }
        }
      }
    }));
  });

  it('1. perSubjectProbs simulates with actual category baseline instead of N(0,1)', async () => {
    const categories = [
      {
        id: 'cat1',
        name: 'Português',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            { date: '2026-07-01', score: 86, total: 25, correct: 21.5 },
            { date: '2026-07-05', score: 88, total: 25, correct: 22 },
            { date: '2026-07-10', score: 90, total: 25, correct: 22.5 },
            { date: '2026-07-15', score: 87, total: 25, correct: 21.75 }
          ]
        }
      }
    ];

    const { result } = renderHook(() =>
      useMonteCarloStats({
        categories,
        goalDate: '2026-12-31',
        targetScore: 70,
        timeIndex: -1,
        timelineDates: ['2026-07-01', '2026-07-05', '2026-07-10', '2026-07-15'],
        minScore: 0,
        maxScore: 100,
        effectiveSimulateToday: true,
        enablePerSubject: true,
        simuladoRows: []
      })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    expect(result.current.simulationData?.status).toBe('ready');
    expect(result.current.perSubjectProbs).toHaveLength(1);
    expect(result.current.perSubjectProbs[0].prob).toBeGreaterThan(70);
  });

  it('2. generateAnalyticsStats populates bayesianCI.n, temporalBayesianMean and respects referenceDate for Time Machine', () => {
    const histOld = [
      { date: '2020-01-01', score: 80, total: 20, correct: 16 },
      { date: '2020-01-05', score: 84, total: 20, correct: 16.8 },
      { date: '2020-01-10', score: 88, total: 20, correct: 17.6 }
    ];
    const statsPast = generateAnalyticsStats({
      categories: [{ id: 'c1', name: 'Direito', maxScore: 100, minScore: 0, simuladoStats: { history: histOld } }],
      debouncedWeights: { c1: 1 },
      timeIndex: 0,
      timelineDates: ['2020-01-10'],
      minScore: 0,
      maxScore: 100
    });

    expect(statsPast).not.toBeNull();
    expect(statsPast.bayesianCI.n).toBeGreaterThanOrEqual(1);
    expect(statsPast.categoryStats[0].temporalBayesianMean).toBeGreaterThan(80);
    // ReferenceDate pinned to 2020-01-10 prevents ~6 years of decay dragging mean down to ~50
    expect(statsPast.bayesianMean).toBeGreaterThan(75);
  });

  it('3. simulateNormalDistribution normalizes heterogeneous and negative subject domains to global scale without bias', () => {
    const res = simulateNormalDistribution({
      mean: 80,
      sd: 5,
      targetScore: 70,
      simulations: 2500,
      minScore: 0,
      maxScore: 100,
      subjects: [
        { name: 'Redação', mean: 8, sd: 1, minScore: 0, maxScore: 10, weight: 1 },
        { name: 'Penal', mean: 6, sd: 2, minScore: -10, maxScore: 10, minCutoff: -5, weight: 1 }
      ]
    });

    // 8/10 -> 80%, (6 - (-10))/20 -> 80% => combined expected mean ≈ 80
    expect(res.projectedMean).toBeGreaterThan(74);
    expect(res.projectedMean).toBeLessThan(86);
    expect(res.probability).toBeGreaterThan(70);
  });

  it('4 & 14. isPhantomZeroTimeAttempt keeps manual 0-score simulados with questions and drops empty 0s bugs', () => {
    const manualZero = { date: '2026-08-01', score: 0, correct: 0, total: 20, timeSpent: 0 };
    const phantomZero = { date: '2026-08-01', score: 0, total: 0, timeSpent: 0 };

    expect(isPhantomZeroTimeAttempt(manualZero, 0)).toBe(false);
    expect(isPhantomZeroTimeAttempt(phantomZero, 0)).toBe(true);

    const stats = generateAnalyticsStats({
      categories: [
        {
          id: 'c1',
          name: 'Matemática',
          maxScore: 100,
          minScore: 0,
          simuladoStats: { history: [manualZero, { date: '2026-08-02', score: 100, total: 20, correct: 20, timeSpent: 0 }] }
        }
      ],
      debouncedWeights: { c1: 1 },
      timeIndex: -1,
      timelineDates: [],
      minScore: 0,
      maxScore: 100
    });

    expect(stats.globalHistory).toHaveLength(2);
    expect(stats.globalHistory[0].score).toBe(0);
  });

  it('8 & 9. MonteCarloGauge stops spinning on invalid history and does not clip Diagnóstico & Sinais', () => {
    const { container } = render(
      <MonteCarloGauge
        categories={[
          { id: 'c1', name: 'Português', simuladoStats: { history: [{ date: '2099-12-31', score: 80 }] } }
        ]}
        forcedMode="today"
        minScore={0}
        maxScore={100}
      />
    );

    expect(screen.getByText(/Histórico insuficiente/i)).toBeTruthy();
    expect(container.querySelector('.animate-spin')).toBeNull();

    render(
      <MonteCarloGauge
        categories={[{ id: 'c1', name: 'Português', simuladoStats: { history: [{ date: '2026-01-01', score: 80 }] } }]}
        forcedMode="today"
        minScore={0}
        maxScore={100}
        precomputedStats={{
          statsData: { categoryStats: [{ name: 'Português', n: 1 }] },
          simulationData: { status: 'ready', data: { sd: 5, ciConformalLow: 70, ciConformalHigh: 90 } },
          projectedMean: 80,
          currentMean: 80,
          sd: 5,
          sdLeft: 5,
          sdRight: 5,
          ci95Low: 70,
          ci95High: 90,
          pAdjusted: 85,
          explanations: ['Msg 1 longa para checar altura automática', 'Msg 2 longa para checar altura'],
          driftAlerts: [{ severity: 'medium', message: 'Alerta visível sem corte' }],
          perSubjectProbs: []
        }}
      />
    );

    const diagTitle = screen.getByText('Diagnóstico & Sinais');
    const diagBox = diagTitle.closest('div').parentElement;
    expect(diagBox.className).toContain('min-h-[92px]');
    expect(diagBox.className).not.toContain('overflow-hidden');
  });

  it('10, 11 & 12. MonteCarloConfig portals to body, allows free typing in Total de Questões, and persists custom weights across Equal toggle', () => {
    const setWeights = (next) => useAppStore.getState().setMonteCarloWeights(next);
    const setEqual = (v) => useAppStore.getState().setMcEqualWeights(v);

    const { unmount } = render(
      <div className="animate-fade-in-down">
        <MonteCarloConfig
          show={true}
          onClose={() => {}}
          targetScore={75}
          setTargetScore={() => {}}
          equalWeightsMode={false}
          setEqualWeightsMode={setEqual}
          getEqualWeights={() => ({ cat1: 1, cat2: 1 })}
          weights={{ cat1: 3, cat2: 1 }}
          setWeights={setWeights}
          updateWeight={() => {}}
          categories={[
            { id: 'cat1', name: 'Português' },
            { id: 'cat2', name: 'RLM' }
          ]}
        />
      </div>
    );

    // Portal renders modal outside animated container directly under document.body
    const dialog = screen.getByRole('dialog');
    expect(dialog.parentElement.parentElement).toBe(document.body);

    const qInput = screen.getByLabelText('Total de questões da prova');
    fireEvent.focus(qInput);
    fireEvent.change(qInput, { target: { value: '' } });
    expect(qInput.value).toBe('');
    fireEvent.change(qInput, { target: { value: '2' } });
    expect(qInput.value).toBe('2');
    fireEvent.change(qInput, { target: { value: '25' } });
    expect(useAppStore.getState().appState.contests['stats-reg-test'].examTotalQuestions).toBe(25);
    fireEvent.change(qInput, { target: { value: '3' } });
    fireEvent.blur(qInput);
    expect(useAppStore.getState().appState.contests['stats-reg-test'].examTotalQuestions).toBe(10);

    // Toggle Pesos Iguais, unmount/remount, then return to Manual
    fireEvent.click(screen.getByText('Pesos Iguais'));
    expect(useAppStore.getState().appState.mcEqualWeights).toBe(true);
    expect(useAppStore.getState().appState.contests['stats-reg-test'].mcSavedCustomWeights).toEqual({ cat1: 3, cat2: 1 });
    unmount();

    render(
      <MonteCarloConfig
        show={true}
        onClose={() => {}}
        targetScore={75}
        setTargetScore={() => {}}
        equalWeightsMode={true}
        setEqualWeightsMode={setEqual}
        getEqualWeights={() => ({ cat1: 1, cat2: 1 })}
        weights={{ cat1: 1, cat2: 1 }}
        setWeights={setWeights}
        updateWeight={() => {}}
        categories={[
          { id: 'cat1', name: 'Português' },
          { id: 'cat2', name: 'RLM' }
        ]}
      />
    );

    fireEvent.click(screen.getByText('Manual (1, 2, 3...)'));
    expect(useAppStore.getState().appState.contests['stats-reg-test'].mcWeights).toEqual({ cat1: 3, cat2: 1 });
  });

  it('13. GaussianPlot guards NaN targetScore and non-finite kdeData points', () => {
    const { container } = render(
      <GaussianPlot
        mean={70}
        sd={10}
        targetScore={NaN}
        currentMean={68}
        prob={60}
        minScore={0}
        maxScore={100}
        unit="%"
        kdeData={[
          { x: NaN, y: 0.1 },
          { x: 50, y: 0.2 },
          { x: 60, y: 0.4 },
          { x: 70, y: 0.8 },
          { x: 80, y: 0.4 },
          { x: 90, y: 0.2 },
          { x: 95, y: 0.1 }
        ]}
      />
    );

    const html = container.innerHTML;
    expect(html).not.toContain('NaN');
  });

  it('15. sanitizeContest preserves scale-appropriate targetScore, absent/negative minCutoff, and zero/negative historicalCutoffs', () => {
    const sanitizedEnem = sanitizeContest({
      contestName: 'ENEM',
      minScore: 200,
      maxScore: 1000,
      historicalCutoffs: [-10, 0, 650],
      categories: [{ id: 'c1', name: 'Mat' }]
    });

    expect(sanitizedEnem.user.targetScore).toBe(800);
    expect(sanitizedEnem.historicalCutoffs).toEqual([-10, 0, 650]);
    expect(sanitizedEnem.categories[0].minCutoff).toBeNull();

    const cebraspe = sanitizeContest({
      contestName: 'Cebraspe',
      minScore: -120,
      maxScore: 120,
      categories: [{ id: 'c1', name: 'Dir', minScore: -120, maxScore: 120, minCutoff: -10 }]
    });
    expect(cebraspe.categories[0].minCutoff).toBe(-10);
  });

  it('16. backfillObservedFromSimulados uses category scales and ignores unvalidated rows in global events', () => {
    const categories = [{ id: 'c1', name: 'Redação', minScore: 0, maxScore: 20 }];
    const events = [{ id: 'ev1', timestamp: 1000, category: 'global', targetScore: 70, observed: null }];
    const rows = [
      { createdAt: new Date(2000).toISOString(), subject: 'Redação', score: 16, total: 10 }, // 16/20 = 80% on global 0-100
      { createdAt: new Date(3000).toISOString(), subject: 'Redação', score: 2, total: 10, valid: false }
    ];

    const out = backfillObservedFromSimulados(events, rows, categories, 100, 0);
    expect(out[0].observedScore).toBeCloseTo(80, 2);
    expect(out[0].observed).toBe(1);
  });

  it('17. WeeklyAnalysis merges case variants of uncategorized subjects and DueForecast counts cards without front/back', () => {
    const todayIso = new Date().toISOString();
    render(
      <WeeklyAnalysis
        studyLogs={[
          { id: '1', date: todayIso, categoryName: 'Direito Penal', taskTitle: 'Ação Penal', minutes: 30 },
          { id: '2', date: todayIso, categoryName: 'direito penal', taskTitle: 'Culpabilidade', minutes: 30 }
        ]}
        categories={[]}
      />
    );
    expect(screen.getAllByText(/Direito Penal/i)).toHaveLength(1);
    expect(screen.getByText('2 tarefas')).toBeTruthy();

    render(<DueForecast decks={[{ id: 'd1', cards: [{ id: 'card1', due: '2026-01-01' }] }]} compact />);
    expect(screen.queryByText(/Nenhum cartão de flashcard ainda/i)).toBeNull();
  });
});
