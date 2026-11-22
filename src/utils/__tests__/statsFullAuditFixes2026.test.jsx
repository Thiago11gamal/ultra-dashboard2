// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useAppStore } from '../../store/useAppStore.js';
import { computeBayesianLevel, computeHierarchicalAdjustment } from '../../engine/stats.js';
import { generateAnalyticsStats, computeCalibrationPenalty } from '../../engine/analyticsStats.js';
import { getAdaptiveInterSubjectCorrelation } from '../../engine/variance.js';
import { daysUntilGoal } from '../../engine/math/date.js';
import { computeACWR } from '../../engine/adaptive/workloadACWR.js';
import { computeEfficientAllocation } from '../../engine/adaptive/allocationOptimizer.js';
import { estimateEmpiricalHalfLife } from '../../engine/adaptive/empiricalRetention.js';
import { evaluateContestMaturity } from '../../engine/adaptive/adaptiveMaturityEngine.js';
import { buildSyllabusBurndownData, buildCircadianHeatmapData, buildKnowledgeGraphLayout } from '../advancedChartHelpers.js';
import { WorkloadACWRChart } from '../../components/charts/Analytics/WorkloadACWRChart.jsx';
import { mapSubjectHoursData } from '../chartDataMappers.js';
import { getFlashcardDueTodayCount, computeFlashcardDueForecast } from '../analytics.js';
import { recordPredictionEvent, computeCalibrationSummary, backfillObservedFromSimulados } from '../calibration.js';
import { analyzeProgressState } from '../ProgressStateEngine.js';
import { getSafeScore } from '../scoreHelper.js';
import { getDateKey } from '../dateHelper.js';
import { buildSubjectsOpts } from '../../hooks/mcStatsHelpers.js';
import { useMonteCarloStats } from '../../hooks/useMonteCarloStats.js';
import MonteCarloGauge from '../../components/MonteCarloGauge.jsx';
import { MonteCarloConfig } from '../../components/charts/MonteCarloConfig.jsx';
import VerifiedStats from '../../components/VerifiedStats.jsx';
import WeeklyAnalysis from '../../components/WeeklyAnalysis.jsx';
import { EfficientAllocationChart } from '../../components/charts/Analytics/EfficientAllocationChart.jsx';
import { SyllabusBurndownChart } from '../../components/charts/Analytics/SyllabusBurndownChart.jsx';

describe('Stats Menu Full Forensic Audit Fixes (M1-M14, D1-D7, B1-B7)', () => {
  beforeEach(() => {
    useAppStore.setState((s) => ({
      appState: {
        ...s.appState,
        activeId: 'audit-contest-a',
        mcEqualWeights: false,
        contests: {
          ...(s.appState?.contests || {}),
          'audit-contest-a': {
            contestName: 'Concurso A',
            maxScore: 100,
            minScore: 0,
            mcEqualWeights: false,
            mcWeights: { c1: 3, c2: 1 },
            categories: [
              { id: 'c1', name: 'Direito', weight: 30, tasks: [], simuladoStats: { history: [] } },
              { id: 'c2', name: 'Português', weight: 10, tasks: [], simuladoStats: { history: [] } },
            ],
            studyLogs: [],
            simuladoRows: [],
            calibrationEvents: [],
            monteCarloHistory: [],
            user: { targetScore: 75 },
          },
          'audit-contest-b': {
            contestName: 'Concurso B',
            maxScore: 100,
            minScore: 0,
            mcEqualWeights: true,
            mcWeights: {},
            categories: [],
            studyLogs: [],
            simuladoRows: [],
            calibrationEvents: [],
            monteCarloHistory: [],
            user: { targetScore: 80 },
          },
        },
      },
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('M1: preserves Cebraspe penalty, blanks and ENEM TRI scores in getSafeScore, computeBayesianLevel and generateAnalyticsStats', () => {
    // Cebraspe 0..120: 70 correct, 50 wrong, penalty 1 -> net 20 pts
    const cebZeroFloor = { date: '2026-04-01', total: 120, correct: 70, blanks: 0, penaltyPerWrong: 1, scorePoints: 20 };
    expect(getSafeScore(cebZeroFloor, 120, 0)).toBeCloseTo(20, 2);
    const bayeZero = computeBayesianLevel([cebZeroFloor], 1, 1, 120, { minScore: 0, referenceDate: '2026-04-01' });
    expect(bayeZero.mean).toBeLessThan(25); // before fix: ~70!

    // Cebraspe -120..120: 70 correct, 10 wrong, 40 blanks -> net +60 (without explicit scorePoints)
    const cebNegFloor = { date: '2026-04-01', total: 120, correct: 70, blanks: 40, penaltyPerWrong: 1 };
    expect(getSafeScore(cebNegFloor, 120, -120)).toBeCloseTo(60, 2);
    const bayeNeg = computeBayesianLevel([cebNegFloor], 1, 1, 120, { minScore: -120, referenceDate: '2026-04-01' });
    expect(bayeNeg.mean).toBeGreaterThan(50); // before fix: ~+20!

    // ENEM TRI 200..1000: 30/45 raw (66.7% -> 733), TRI scorePoints = 760
    const enemTri = { date: '2026-04-01', total: 45, correct: 30, scorePoints: 760 };
    const stats = generateAnalyticsStats({
      categories: [{ id: 'en', name: 'Matemática', minScore: 200, maxScore: 1000, simuladoStats: { history: [enemTri] } }],
      debouncedWeights: { en: 1 },
      timeIndex: 0,
      timelineDates: ['2026-04-01'],
      minScore: 200,
      maxScore: 1000,
    });
    expect(stats.globalHistory[0].score).toBeCloseTo(760, 1);
  });

  it('M2: eliminates double shrinkage toward 50% on failing student and updates 95% footer copy', async () => {
    const categories = [{
      id: 'c1',
      name: 'Direito',
      maxScore: 100,
      minScore: 0,
      simuladoStats: {
        history: [
          { date: '2026-04-01', score: 25, total: 20, correct: 5 },
          { date: '2026-04-05', score: 26, total: 20, correct: 5 },
          { date: '2026-04-10', score: 24, total: 20, correct: 5 },
          { date: '2026-04-15', score: 25, total: 20, correct: 5 },
        ],
      },
    }];

    const { result } = renderHook(() =>
      useMonteCarloStats({
        categories,
        goalDate: '2026-12-31',
        targetScore: 90,
        timeIndex: -1,
        timelineDates: ['2026-04-01', '2026-04-05', '2026-04-10', '2026-04-15'],
        minScore: 0,
        maxScore: 100,
        effectiveSimulateToday: true,
        simuladoRows: [],
      })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(result.current.simulationData?.status).toBe('ready');
    // Before fix: confWidth shrink inflated ~0% failing probability up to ~7-10%
    expect(result.current.probability).toBeLessThan(1.5);

    render(
      <MonteCarloGauge
        categories={categories}
        forcedMode="today"
        minScore={0}
        maxScore={100}
        targetScore={90}
        precomputedStats={{
          statsData: { categoryStats: [{ name: 'Direito', n: 4 }] },
          simulationData: { status: 'ready', data: { sd: 5, ciConformalLow: 15, ciConformalHigh: 35 } },
          projectedMean: 25,
          currentMean: 25,
          sd: 5,
          sdLeft: 5,
          sdRight: 5,
          ci95Low: 15,
          ci95High: 35,
          pAdjusted: 0.2,
          explanations: [],
          driftAlerts: [{ severity: 'low', message: 'Desempenho estável, em fase de consolidação.' }],
          perSubjectProbs: [],
        }}
      />
    );
    expect(screen.getByText(/quantis 2,5% a 97,5%/i)).toBeTruthy();
    expect(screen.getByText('<1%')).toBeTruthy();
  });

  it('M3: prevents 100% subject collapse when tau2 === 0 and preserves temporalBayesianMean/Sd', () => {
    // High within-subject variance, small n -> rawTau2 <= meanLocalVar -> tau2 = 0
    const cats = [
      { key: 'a', mean: 80, sd: 20, n: 2, weight: 1 },
      { key: 'b', mean: 60, sd: 20, n: 2, weight: 1 },
    ];
    const adjusted = computeHierarchicalAdjustment(cats, 20);
    expect(adjusted[0].shrinkage).toBeLessThanOrEqual(0.65);
    expect(adjusted[0].bayesianMean).toBeGreaterThan(adjusted[1].bayesianMean + 5);

    const stats = generateAnalyticsStats({
      categories: [
        {
          id: 'a',
          name: 'Mat A',
          simuladoStats: {
            history: [
              { date: '2026-01-01', score: 40, total: 20, correct: 8 },
              { date: '2026-04-01', score: 90, total: 20, correct: 18 },
            ],
          },
        },
      ],
      debouncedWeights: { a: 1 },
      timeIndex: -1,
      timelineDates: ['2026-01-01', '2026-04-01'],
      minScore: 0,
      maxScore: 100,
    });
    expect(stats.categoryStats[0].temporalBayesianMean).toBeDefined();
    expect(stats.categoryStats[0].temporalBayesianSd).toBeGreaterThan(0);
  });

  it('M5 & B5: ACWR has no permanent 14h/wk bias for steady light or heavy schedules and inactive recommends 25 min', () => {
    const now = new Date('2026-06-15T15:00:00Z');
    const makeSteadyLogs = (minsPerDay) =>
      Array.from({ length: 42 }, (_, d) => ({
        date: new Date(now.getTime() - d * 86_400_000).toISOString(),
        minutes: minsPerDay,
      }));

    // Light steady student: ~52 min/day ≈ 6h/week for 6 weeks
    const light = computeACWR(makeSteadyLogs(52), { now });
    expect(light.acwr).toBeCloseTo(1.0, 1);
    expect(light.zone).toBe('optimal');

    // Heavy steady student: 300 min/day = 35h/week for 6 weeks
    const heavy = computeACWR(makeSteadyLogs(300), { now });
    expect(heavy.acwr).toBeCloseTo(1.0, 1);
    expect(heavy.zone).toBe('optimal');

    // Inactive student gets 25 min matching advice
    const inactive = computeACWR([], { now });
    expect(inactive.zone).toBe('inactive');
    expect(inactive.recommendedBlockMinutes).toBe(25);
  });

  it('M6 & M7: Markowitz honors weight: 0 (P0), compares currentPortfolio on same budget, and Equal Weights toggle preserves cat.weight', () => {
    const cats = [
      { id: 'c1', name: 'Direito', weight: 30, simuladoStats: { history: [{ date: '2026-04-01', score: 50 }] } },
      { id: 'c2', name: 'Português', weight: 10, simuladoStats: { history: [{ date: '2026-04-01', score: 70 }] } },
      { id: 'c3', name: 'Zerada', weight: 0, simuladoStats: { history: [{ date: '2026-04-01', score: 30 }] } },
    ];
    // Heavy raw logs (60h/wk total) while evaluating a 10h/wk budget
    const logs = [
      { categoryId: 'c1', minutes: 720, date: '2026-04-28' },
      { categoryId: 'c1', minutes: 720, date: '2026-04-27' },
      { categoryId: 'c2', minutes: 720, date: '2026-04-26' },
      { categoryId: 'c2', minutes: 720, date: '2026-04-25' },
    ];
    const alloc = computeEfficientAllocation(cats, logs, {
      weeklyBudgetHours: 10,
      now: new Date('2026-05-01T12:00:00Z'),
    });
    const zeroSubj = alloc.subjects.find((s) => s.id === 'c3');
    expect(zeroSubj.weight).toBe(0);
    expect(zeroSubj.optimalHours).toBe(0);
    // Current portfolio evaluated on the SAME 10h budget cannot exceed max-gain frontier point
    expect(alloc.currentPortfolio.expectedGainPct).toBeLessThanOrEqual(alloc.frontier[0].expectedGainPct + 0.05);

    // Clicking "Pesos Iguais" must NOT overwrite cat.weight (30 and 10) with 1
    render(
      <MonteCarloConfig
        show={true}
        onClose={() => { }}
        targetScore={75}
        setTargetScore={() => { }}
        equalWeightsMode={false}
        setEqualWeightsMode={(v) => useAppStore.getState().setMcEqualWeights(v)}
        getEqualWeights={() => ({ c1: 1, c2: 1 })}
        weights={{ c1: 3, c2: 1 }}
        setWeights={(next) => useAppStore.getState().setMonteCarloWeights(next)}
        updateWeight={() => { }}
        categories={useAppStore.getState().appState.contests['audit-contest-a'].categories}
      />
    );
    fireEvent.click(screen.getByText('Pesos Iguais'));
    const catsAfter = useAppStore.getState().appState.contests['audit-contest-a'].categories;
    expect(catsAfter[0].weight).toBe(30);
    expect(catsAfter[1].weight).toBe(10);
  });

  it('M8: calibration loop preserves minBackfillDays, sorts summary chronologically, and filters category/future snapshots', () => {
    const ev = recordPredictionEvent({ probability: 0.8, targetScore: 75, minBackfillDays: 7, category: 'global' });
    expect(ev.minBackfillDays).toBe(7);

    // Out-of-order events where older had bad Brier (0.64) and newer had good Brier (0.01) -> improving!
    const summary = computeCalibrationSummary([
      { timestamp: 4000, probability: 0.9, observed: 1, category: 'global' },
      { timestamp: 1000, probability: 0.9, observed: 0, category: 'global' },
      { timestamp: 3000, probability: 0.9, observed: 1, category: 'global' },
      { timestamp: 2000, probability: 0.9, observed: 0, category: 'global' },
      { timestamp: 5000, probability: 0.1, observed: 1, category: 'Direito' }, // per-subject ignored when filtering global
    ], { category: 'global' });
    expect(summary.n).toBe(4);
    expect(summary.trend).toBe('improving');

    // computeCalibrationPenalty ignores per-category snapshots and future targetDates
    const penalty = computeCalibrationPenalty(
      [
        { date: '2026-01-01', categoryId: 'c1', probability: 99, target: 80, projectedMean: 95 },
        { date: '2026-01-02', targetDate: '2099-12-31', probability: 99, target: 80, projectedMean: 95 },
      ],
      [{ date: '2026-01-05', score: 20 }],
      100,
      null,
      0
    );
    expect(penalty).toBe(0);
  });

  it('M9: ProgressStateEngine detects same-day progression instead of crushing slope to 0', () => {
    const sameDayScores = [
      { date: '2026-04-10T09:00:00Z', score: 50 },
      { date: '2026-04-10T10:00:00Z', score: 65 },
      { date: '2026-04-10T11:00:00Z', score: 80 },
    ];
    const res = analyzeProgressState(sameDayScores, { window_size: 3, maxScore: 100, minScore: 0 });
    expect(res.trend_slope).toBeGreaterThan(0.5);
    expect(res.state).toBe('progression');
  });

  it('M10: generateAnalyticsStats respects mcWeights across subjects on same day and buildSubjectsOpts preserves minCutoff side', () => {
    const stats = generateAnalyticsStats({
      categories: [
        { id: 'c1', name: 'P1 Grande', simuladoStats: { history: [{ date: '2026-04-10', total: 100, correct: 90, score: 90 }] } },
        { id: 'c2', name: 'P3 Pequena', simuladoStats: { history: [{ date: '2026-04-10', total: 10, correct: 5, score: 50 }] } },
      ],
      debouncedWeights: { c1: 1, c2: 3 },
      timeIndex: -1,
      timelineDates: ['2026-04-10'],
      minScore: 0,
      maxScore: 100,
    });
    // Weighted average strictly by mcWeights: (90*1 + 50*3) / 4 = 60 (before fix: ~80.77!)
    expect(stats.globalHistory[0].score).toBeCloseTo(60, 2);

    const subjOpts = buildSubjectsOpts(
      {
        bayesianMean: 55,
        categoryStats: [
          { key: 'a', name: 'A', temporalBayesianMean: 70, mean: 70, sd: 5, minCutoff: 68, weight: 1, minScore: null, maxScore: 100 },
          { key: 'b', name: 'B', temporalBayesianMean: 50, mean: 50, sd: 5, minCutoff: null, weight: 1, minScore: null, maxScore: 100 },
        ],
      },
      {},
      { isFuture: false, minScoreVal: 20, maxScoreVal: 100 }
    );
    // D1: minScore: null inherits minScoreVal=20 (not 0), and A does not cross below minCutoff 68
    expect(subjOpts[0].minScore).toBe(20);
    expect(subjOpts[0].mean).toBeGreaterThanOrEqual(68);
  });

  it('M12: getAdaptiveInterSubjectCorrelation filters invalid/future rows, honors cutoffDate and sorts chronologically', () => {
    const unorderedRows = [
      { date: '2026-04-20', subject: 'A', score: 90 },
      { date: '2026-04-20', subject: 'B', score: 90 },
      { date: '2026-04-01', subject: 'A', score: 50 },
      { date: '2026-04-01', subject: 'B', score: 50 },
      { date: '2026-04-15', subject: 'A', score: 80 },
      { date: '2026-04-15', subject: 'B', score: 80 },
      { date: '2026-04-05', subject: 'A', score: 60 },
      { date: '2026-04-05', subject: 'B', score: 60 },
      { date: '2026-04-10', subject: 'A', score: 70 },
      { date: '2026-04-10', subject: 'B', score: 70 },
      { date: '2026-04-25', subject: 'A', score: 100 },
      { date: '2026-04-25', subject: 'B', score: 100 },
      // Invalid & future rows must be excluded
      { date: '2026-04-22', subject: 'A', score: 10, valid: false },
      { date: '2026-04-22', subject: 'B', score: 100, valid: false },
      { date: '2099-01-01', subject: 'A', score: 0 },
      { date: '2099-01-01', subject: 'B', score: 100 },
    ];
    const rhoAll = getAdaptiveInterSubjectCorrelation([], unorderedRows, ['A', 'B'], 0.25, 100, 0, '2026-04-26');
    const rhoEarly = getAdaptiveInterSubjectCorrelation([], unorderedRows, ['A', 'B'], 0.25, 100, 0, '2026-04-06');
    expect(Number.isFinite(rhoAll)).toBe(true);
    // Cutoff before 4 dates must fall back to prior 0.25
    expect(rhoEarly).toBe(0.25);
  });

  it('M13 & B7: SyllabusBurndown detects stalled 14d pace, expired goalDate as overdue, and renders unique date axis', () => {
    const now = new Date('2026-06-01T15:00:00Z');
    const stalledCats = [{
      id: 'c1',
      name: 'Direito',
      tasks: [
        { id: 't1', text: 'T1', completed: true, completedAt: '2026-04-01T12:00:00Z' },
        { id: 't2', text: 'T2', completed: false },
        { id: 't3', text: 'T3', completed: false },
      ],
    }];
    const stalled = buildSyllabusBurndownData(stalledCats, { startDate: '2026-04-01', goalDate: '2026-08-01' }, { now });
    expect(stalled.currentWeeklyPace).toBe(0);
    expect(stalled.status).toBe('stalled');

    const overdue = buildSyllabusBurndownData(stalledCats, { startDate: '2026-04-01', goalDate: '2026-03-01' }, { now });
    expect(overdue.hasGoalDate).toBe(true);
    expect(overdue.status).toBe('overdue');
    expect(overdue.requiredWeeklyPace).toBe(0);

    const { container } = render(
      <SyllabusBurndownChart categories={stalledCats} user={{ startDate: '2026-04-01', goalDate: '2026-03-01' }} />
    );
    expect(container.textContent).toContain('Prazo encerrado');
  });

  it('D1, D3, D4, D5, D6, D7: strict null/minScore, minutes:0->duration, circadian mixed rows, maturity .observed, flashcard ISO due, mapSubjectHoursData', () => {
    // D1: backfillObservedFromSimulados with minScore: null inherits global minScore=200
    const bf = backfillObservedFromSimulados(
      [{ id: 'e1', timestamp: 1000, category: 'ENEM', targetScore: 700, observed: null }],
      [{ createdAt: new Date(2000).toISOString(), subject: 'ENEM', correct: 40, total: 50 }],
      [{ id: 'en', name: 'ENEM', minScore: null, maxScore: 1000 }],
      1000,
      200
    );
    expect(bf[0].observedScore).toBeCloseTo(840, 1);

    // D3: empiricalRetention & ACWR recover duration when minutes: 0
    const acwrDur = computeACWR(
      [{ date: '2026-05-01', minutes: 0, duration: 120 }],
      { now: new Date('2026-05-01T15:00:00Z') }
    );
    expect(acwrDur.acuteHours).toBe(2);

    const ret = estimateEmpiricalHalfLife(
      {
        id: 'c1',
        name: 'Direito',
        minScore: null,
        maxScore: 100,
        simuladoStats: {
          history: [
            { date: '2026-04-01', score: 60 },
            { date: '2026-04-10', score: 80 },
            { date: '2026-04-20', score: 85 },
          ],
        },
      },
      { minScore: null, maxScore: 100, studyLogs: [{ categoryId: 'c1', date: '2026-04-05', minutes: 0, duration: 60 }] }
    );
    expect(Number.isFinite(ret.effectiveHalfLife)).toBe(true);

    // D4: circadian mixed rows in same cell + retroactive createdAt protection
    const circ = buildCircadianHeatmapData(
      [
        { date: '2026-04-01', createdAt: '2026-04-13T23:00:00Z', minutes: 60 }, // retroactive -> must NOT plot!
        { startTime: '2026-04-13T14:00:00Z', minutes: 0, duration: 90 }, // duration fallback
      ],
      [],
      [
        { createdAt: '2026-04-13T14:15:00Z', total: 20, correct: 20 }, // 100% weight 20
        { createdAt: '2026-04-13T14:30:00Z', score: 50 }, // 50% synthetic weight 20 -> combined 75%!
      ],
      { now: new Date('2026-05-01T15:00:00Z') }
    );
    expect(circ.timedLogCount).toBe(1);
    expect(circ.untimedLogCount).toBe(1);
    expect(circ.peakStudyCell.minutes).toBe(90);
    expect(circ.peakAccuracyCell.accuracyPct).toBeCloseTo(75, 1);

    // D5: adaptiveMaturityEngine counts observed: 0|1, chains stages, never says "Faltam 0 simulado(s)"
    const matSingleCat = evaluateContestMaturity({
      categories: [{ id: 'c1', simuladoStats: { history: Array.from({ length: 12 }, (_, i) => ({ date: `2026-03-${String(i + 1).padStart(2, '0')}`, score: 70 })) } }],
      studyLogs: Array.from({ length: 12 }, (_, i) => ({ date: `2026-03-${String(i + 1).padStart(2, '0')}`, minutes: 30 })),
      calibrationEvents: Array.from({ length: 8 }, (_, i) => ({ id: `ev${i}`, observed: 1, backfilled: true })),
    });
    expect(matSingleCat.metrics.resolvedCalibPairs).toBe(8);
    // Cannot jump to N3 without passing N2 (categoriesWithSims >= 2)
    expect(matSingleCat.stage).toBe(1);
    expect(matSingleCat.nextHint).not.toContain('Faltam 0 simulado');

    // D6: Flashcard future ISO timestamp must NOT be bucketed into Hoje
    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const decks = [{ id: 'd1', cards: [{ id: 'c1', due: tomorrow }, null] }];
    expect(getFlashcardDueTodayCount(decks)).toBe(0);
    const forecast = computeFlashcardDueForecast(decks, 7);
    expect(forecast.forecast[0].count).toBe(0);
    expect(forecast.totalDueInHorizon).toBe(1);

    // D7: mapSubjectHoursData filters future logs & tiny 0.00h ghost entries
    const mappedHours = mapSubjectHoursData(
      [
        { date: '2099-01-01', minutes: 120, categoryName: 'Futuro' },
        { date: '2026-04-01', minutes: 0.1, categoryName: 'Fantasma' },
        { date: '2026-04-01', minutes: 60, categoryName: 'Real' },
      ],
      []
    );
    expect(mappedHours).toEqual([{ disciplina: 'Real', horas: 1 }]);
  });

  it('B1, B2, B3, B4, B6, B7, D2: drift drop detection, per-contest mcEqualWeights, Corte Médio, budget typing, TZ daysUntilGoal & no unsolicited store write', async () => {
    // B3: toggling mcEqualWeights on contest A does not overwrite contest B
    useAppStore.getState().setMcEqualWeights(true);
    expect(useAppStore.getState().appState.contests['audit-contest-a'].mcEqualWeights).toBe(true);
    expect(useAppStore.getState().appState.contests['audit-contest-b'].mcEqualWeights).toBe(true);
    useAppStore.getState().setMcEqualWeights(false);
    expect(useAppStore.getState().appState.contests['audit-contest-a'].mcEqualWeights).toBe(false);
    expect(useAppStore.getState().appState.contests['audit-contest-b'].mcEqualWeights).toBe(true);

    // B1: detectPerformanceDrift fires on sharp recent drop vs earlier baseline
    const droppingCategories = [{
      id: 'c1',
      name: 'Direito',
      simuladoStats: {
        history: [
          { date: '2026-03-01', score: 88, total: 20, correct: 18 },
          { date: '2026-03-08', score: 86, total: 20, correct: 17 },
          { date: '2026-03-15', score: 85, total: 20, correct: 17 },
          { date: '2026-03-22', score: 60, total: 20, correct: 12 },
          { date: '2026-03-29', score: 58, total: 20, correct: 12 },
          { date: '2026-04-05', score: 55, total: 20, correct: 11 },
        ],
      },
    }];
    const { result: dropHook } = renderHook(() =>
      useMonteCarloStats({
        categories: droppingCategories,
        goalDate: '2026-12-31',
        targetScore: 75,
        timeIndex: -1,
        timelineDates: ['2026-03-01', '2026-03-08', '2026-03-15', '2026-03-22', '2026-03-29', '2026-04-05'],
        minScore: 0,
        maxScore: 100,
        effectiveSimulateToday: true,
        simuladoRows: [],
      })
    );
    expect(dropHook.current.driftAlerts.some((a) => a.type === 'performance_drop')).toBe(true);

    // B4: MonteCarloGauge labels "Corte Médio" when historicalCutoffs is active
    const { unmount } = render(
      <MonteCarloGauge
        categories={droppingCategories}
        forcedMode="future"
        goalDate="2020-01-01"
        minScore={0}
        maxScore={100}
        targetScore={75}
        precomputedStats={{
          statsData: { categoryStats: [{ name: 'Direito', n: 6 }] },
          simulationData: { status: 'ready', data: { sd: 5, ciConformalLow: 60, ciConformalHigh: 80 } },
          projectedMean: 70,
          currentMean: 70,
          sd: 5,
          sdLeft: 5,
          sdRight: 5,
          ci95Low: 60,
          ci95High: 80,
          pAdjusted: 50,
          effectiveDisplayTarget: 82,
          hasHistoricalCutoffs: true,
          isGoalDateExpired: true,
          explanations: [],
          driftAlerts: [],
          perSubjectProbs: [],
        }}
      />
    );
    expect(screen.getByText('Corte Médio')).toBeTruthy();
    expect(screen.getByText(/Data-alvo expirada/i)).toBeTruthy();
    unmount();

    // B6: EfficientAllocationChart allows clearing and typing 15h/sem without getting stuck at 4
    const tenCats = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i}`,
      name: `Matéria ${i + 1}`,
      weight: 10,
      simuladoStats: { history: [{ date: '2026-04-01', score: 65 }] },
    }));
    render(<EfficientAllocationChart categories={tenCats} studyLogs={[]} targetScore={80} />);
    const budgetInput = screen.getByLabelText('Orçamento semanal de horas');
    fireEvent.change(budgetInput, { target: { value: '' } });
    expect(budgetInput.value).toBe('');
    fireEvent.change(budgetInput, { target: { value: '1' } });
    expect(budgetInput.value).toBe('1');
    fireEvent.change(budgetInput, { target: { value: '15' } });
    expect(budgetInput.value).toBe('15');
    fireEvent.blur(budgetInput);
    expect(budgetInput.value).toBe('15');
    expect(screen.getByText(/10 matérias/i)).toBeTruthy();

    // B7: daysUntilGoal uses calendar dates cleanly in APP_TIMEZONE
    expect(daysUntilGoal('2026-05-20', { referenceDate: '2026-05-10', timeZone: 'America/Manaus' })).toBe(10);
    expect(daysUntilGoal('2026-05-01', { referenceDate: '2026-05-10', timeZone: 'America/Manaus' })).toBe(0);

    // D7: WeeklyAnalysis resolves taskId with delimiter boundary (cat-10 vs cat-1)
    const todayKey = getDateKey(new Date());
    const { container: waContainer } = render(
      <WeeklyAnalysis
        categories={[
          { id: 'cat-1', name: 'Português', tasks: [] },
          { id: 'cat-10', name: 'Direito Penal', tasks: [] },
        ]}
        studyLogs={[
          { id: 'l1', date: todayKey, minutes: 45, taskId: 'cat-10-topic-1', taskTitle: 'Dolo' },
        ]}
      />
    );
    expect(waContainer.textContent).toContain('Direito Penal');

    // D2: VerifiedStats mount does NOT mutate user.targetScore when user didn't edit it
    const versionBefore = useAppStore.getState().appState.version;
    render(<VerifiedStats categories={droppingCategories} user={{ targetScore: null }} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 900));
    });
    expect(useAppStore.getState().appState.contests['audit-contest-a'].user.targetScore).toBe(75);
    expect(useAppStore.getState().appState.version).toBe(versionBefore);
  });

  it('Zero-activity guard: does not fabricate 5h/sem Markowitz hours, 35% graph proficiency, ACWR KPIs, or Burndown chart before user studies', () => {
    const unstudiedCats = [
      { id: 'c1', name: 'lula', weight: 25, tasks: [{ id: 't1', title: 'Tópico 1', completed: false }], simuladoStats: { history: [] } },
      { id: 'c2', name: 'bolsonaro', weight: 25, tasks: [], simuladoStats: { history: [] } },
      { id: 'c3', name: 'simone mendes', weight: 25, tasks: [], simuladoStats: { history: [] } },
      { id: 'c4', name: 'babu', weight: 25, tasks: [], simuladoStats: { history: [] } },
    ];

    const alloc = computeEfficientAllocation(unstudiedCats, [], { weeklyBudgetHours: 20 });
    expect(alloc.hasEmpiricalData).toBe(false);
    expect(alloc.subjects.every((s) => s.currentHours === 0)).toBe(true);
    expect(alloc.currentPortfolio.expectedGainPct).toBe(0);

    const { container: allocContainer } = render(
      <EfficientAllocationChart categories={unstudiedCats} studyLogs={[]} targetScore={75} />
    );
    expect(allocContainer.innerHTML).toBe('');

    const { container: burndownContainer } = render(
      <SyllabusBurndownChart categories={unstudiedCats} user={{}} />
    );
    expect(burndownContainer.innerHTML).toBe('');

    const { container: acwrContainer } = render(
      <WorkloadACWRChart studyLogs={[]} />
    );
    expect(acwrContainer.textContent).toContain('Ainda sem sessões de estudo registradas');

    const kg = buildKnowledgeGraphLayout(unstudiedCats, []);
    const taskNode = kg.nodes.find((n) => n.type === 'task');
    expect(taskNode.proficiency).toBe(0);
  });
});
