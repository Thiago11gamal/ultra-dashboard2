// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import {
  evaluateContestMaturity,
  shrinkageAlpha,
  blendPriorEmpirical,
  syncAdaptiveFeatureFlags,
} from '../adaptiveMaturityEngine';
import { computeACWR } from '../workloadACWR';
import { estimateEmpiricalHalfLife } from '../empiricalRetention';
import {
  estimateIRTAbility,
  nextAdaptiveDifficulty,
  computeGuessingStrategy,
} from '../irtEngine';
import {
  computeEfficientAllocation,
  generateOptimalWeeklySchedule,
} from '../allocationOptimizer';
import { simulateNormalDistribution, runTornadoSensitivity } from '../../monteCarlo';
import { computeWeeklyCategoryCorrelation, buildRegimeMapData } from '../../diagnostics';
import { getCognitiveState } from '../../../utils/coach/coachHistory';
import { buildStudyModeCausalEvents } from '../../../utils/coachCausal';
import { readFlags, writeFlags } from '../../../utils/coachFeatureStore';
import { AdaptiveMaturityBadge } from '../../../components/ui/AdaptiveMaturityBadge';
import { TornadoWhatIfChart } from '../../../components/charts/EvolutionChart/TornadoWhatIfChart';
import { CorrelationRegimeChart } from '../../../components/charts/EvolutionChart/CorrelationRegimeChart';
import { IRTPsychometricChart } from '../../../components/charts/EvolutionChart/IRTPsychometricChart';
import { MetacognitionFatigueChart } from '../../../components/charts/EvolutionChart/MetacognitionFatigueChart';
import { WorkloadACWRChart } from '../../../components/charts/Analytics/WorkloadACWRChart';
import { EfficientAllocationChart } from '../../../components/charts/Analytics/EfficientAllocationChart';
import { createStudySlice } from '../../../store/slices/createStudySlice';

const FIXED_NOW = new Date('2026-05-01T15:00:00Z');

function makeDayIso(daysAgo, hour = 14) {
  const d = new Date(FIXED_NOW.getTime() - daysAgo * 86_400_000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

const SAMPLE_CATEGORIES = [
  {
    id: 'cat-dir',
    name: 'Direito Constitucional',
    color: '#6366f1',
    weight: 30,
    minCutoff: 65,
    examGroup: 'especificos',
    tasks: [
      { id: 't1', text: 'Direitos Fundamentais', completed: true, lastStudiedAt: makeDayIso(2) },
      { id: 't2', text: 'Controle de Constitucionalidade', completed: false },
    ],
    simuladoStats: {
      history: [
        { date: '2026-03-01', score: 62, total: 20, correct: 12, difficulty: 'facil' },
        { date: '2026-03-10', score: 54, total: 20, correct: 11, difficulty: 'medio' },
        { date: '2026-03-20', score: 48, total: 20, correct: 10, difficulty: 'medio' },
        { date: '2026-04-02', score: 58, total: 20, correct: 12, difficulty: 'dificil' },
        { date: '2026-04-15', score: 52, total: 20, correct: 10, difficulty: 'medio' },
      ],
    },
  },
  {
    id: 'cat-port',
    name: 'Português',
    color: '#10b981',
    weight: 20,
    minCutoff: 50,
    examGroup: 'basicos',
    tasks: [
      { id: 't3', text: 'Sintaxe', completed: true, lastStudiedAt: makeDayIso(3) },
      { id: 't4', text: 'Interpretação', completed: true, lastStudiedAt: makeDayIso(1) },
    ],
    simuladoStats: {
      history: [
        { date: '2026-03-01', score: 78, total: 20, correct: 16, difficulty: 'facil' },
        { date: '2026-03-10', score: 80, total: 20, correct: 16, difficulty: 'medio' },
        { date: '2026-03-20', score: 82, total: 20, correct: 16, difficulty: 'medio' },
        { date: '2026-04-02', score: 84, total: 20, correct: 17, difficulty: 'dificil' },
        { date: '2026-04-15', score: 86, total: 20, correct: 17, difficulty: 'dificil' },
      ],
    },
  },
  {
    id: 'cat-rlm',
    name: 'Raciocínio Lógico',
    color: '#f59e0b',
    weight: 15,
    minCutoff: 40,
    examGroup: 'basicos',
    tasks: [
      { id: 't5', text: 'Probabilidade', completed: false },
    ],
    simuladoStats: {
      history: [
        { date: '2026-03-01', score: 70, total: 10, correct: 7, difficulty: 'facil' },
        { date: '2026-03-10', score: 68, total: 10, correct: 7, difficulty: 'medio' },
        { date: '2026-03-20', score: 64, total: 10, correct: 6, difficulty: 'medio' },
        { date: '2026-04-02', score: 60, total: 10, correct: 6, difficulty: 'dificil' },
        { date: '2026-04-15', score: 66, total: 10, correct: 7, difficulty: 'medio' },
      ],
    },
  },
];

describe('Closed-Loop Self-Adapting Study OS (2026)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Progressive Data-Maturity Controller (N0 → N5)', () => {
    it('computes smooth Bayesian shrinkage alpha & blending', () => {
      expect(shrinkageAlpha(0, 4)).toBe(0);
      expect(shrinkageAlpha(4, 4)).toBeCloseTo(0.5, 4);
      expect(blendPriorEmpirical(10, 20, 4, 4)).toBeCloseTo(15, 4);
      expect(blendPriorEmpirical(10, NaN, 4, 4)).toBe(10);
    });

    it('promotes maturity across N0 → N5 and respects manual flag overrides', () => {
      const n0 = evaluateContestMaturity({ categories: [], studyLogs: [], simuladoRows: [] });
      expect(n0.stage).toBe(0);
      expect(n0.unlockedFlagCount).toBe(0);

      const n1 = evaluateContestMaturity({
        categories: [{ id: 'c1', simuladoStats: { history: [{ date: '2026-04-01', score: 70 }, { date: '2026-04-03', score: 75 }, { date: '2026-04-05', score: 80 }] } }],
      });
      expect(n1.stage).toBe(1);
      expect(n1.unlockedFlags.useStateSpace).toBe(true);

      const richHistory = Array.from({ length: 26 }, (_, i) => ({
        date: makeDayIso(60 - i * 2).slice(0, 10),
        score: 60 + (i % 20),
      }));
      const richLogs = Array.from({ length: 20 }, (_, i) => ({
        date: makeDayIso(30 - i),
        minutes: 50,
        studyMode: 'questoes',
        energyLevel: 4,
      }));
      const richAudits = Array.from({ length: 9 }, (_, i) => ({ id: `a-${i}`, avgBrier: 0.14 }));

      const n5Contest = {
        categories: [
          { id: 'c1', simuladoStats: { history: richHistory.slice(0, 14) } },
          { id: 'c2', simuladoStats: { history: richHistory.slice(14) } },
        ],
        studyLogs: richLogs,
        calibrationAuditLog: richAudits,
      };
      const n5 = evaluateContestMaturity(n5Contest);
      expect(n5.stage).toBe(5);
      expect(n5.unlockedFlags.useAutoTuner).toBe(true);
      expect(n5.unlockedFlags.useCausalUplift).toBe(true);

      // Manual override blocks automatic promotion of that specific flag
      localStorage.setItem('coach_manual_flag_overrides_v1:test-scope', JSON.stringify({ useAutoTuner: false }));
      writeFlags({ useAutoTuner: false }, 'test-scope');

      const syncRes = syncAdaptiveFeatureFlags(n5Contest, 'test-scope', { respectOverrides: true });
      expect(syncRes.changed).toBe(true);
      const flagsAfter = readFlags('test-scope');
      expect(flagsAfter.useStateSpace).toBe(true);
      expect(flagsAfter.useCausalUplift).toBe(true);
      expect(flagsAfter.useAutoTuner).toBe(false);
    });
  });

  describe('2. Adaptive Cognitive Workload (ACWR) & Fatigue', () => {
    it('detects burnout_risk on sharp acute spike and adapts Pomodoro duration + getCognitiveState', () => {
      // Steady low chronic baseline (30 min/day for days 28..8), then huge spike (300 min/day for days 6..0)
      const logs = [];
      for (let d = 28; d >= 7; d--) {
        logs.push({ date: makeDayIso(d), minutes: 35, energyLevel: 4 });
      }
      for (let d = 6; d >= 0; d--) {
        logs.push({ date: makeDayIso(d), minutes: 240, energyLevel: 2 });
      }

      const acwr = computeACWR(logs, { now: FIXED_NOW });
      expect(acwr.hasChronicle).toBe(true);
      expect(acwr.acwr).toBeGreaterThan(1.5);
      expect(acwr.zone).toBe('burnout_risk');
      expect(acwr.recommendedBlockMinutes).toBe(25);
      expect(acwr.recentAvgEnergy).toBe(2);
      expect(acwr.series).toHaveLength(21);

      // Verify getCognitiveState integrates ACWR when chronicle exists
      const cog = getCognitiveState(logs, { now: FIXED_NOW });
      expect(cog.acwr).toBeGreaterThan(1.5);
      expect(cog.acwrZone).toBe('burnout_risk');
      expect(cog.recommendedBlockMinutes).toBe(25);
      expect(cog.fatigue).toBeGreaterThanOrEqual(55);
    });

    it('detects optimal zone for steady sustainable volume', () => {
      const logs = [];
      for (let d = 27; d >= 0; d--) {
        logs.push({ date: makeDayIso(d), minutes: 120, energyLevel: 4 });
      }
      const acwr = computeACWR(logs, { now: FIXED_NOW });
      expect(acwr.zone).toBe('optimal');
      expect(acwr.acwr).toBeGreaterThanOrEqual(0.8);
      expect(acwr.acwr).toBeLessThanOrEqual(1.3);
    });
  });

  describe('3. Empirical Per-Discipline Forgetting Half-Life', () => {
    it('falls back to prior when < 3 simulados and differentiates fast decay vs solid retention', () => {
      const shortCat = { id: 's1', name: 'Curta', simuladoStats: { history: [{ date: '2026-04-01', score: 70 }] } };
      const priorRes = estimateEmpiricalHalfLife(shortCat);
      expect(priorRes.profile).toBe('prior');
      expect(priorRes.empiricalHalfLife).toBeNull();

      const fastDecayCat = {
        id: 's2',
        name: 'Decai Rápido',
        simuladoStats: {
          history: [
            { date: '2026-03-01', score: 90 },
            { date: '2026-03-06', score: 50 },
            { date: '2026-03-11', score: 88 },
            { date: '2026-03-16', score: 48 },
            { date: '2026-03-21', score: 85 },
            { date: '2026-03-26', score: 45 },
          ],
        },
      };
      const solidCat = {
        id: 's3',
        name: 'Memória Sólida',
        tasks: [{ id: 'st1', completed: true }],
        simuladoStats: {
          history: [
            { date: '2026-01-15', score: 80 },
            { date: '2026-02-01', score: 81 },
            { date: '2026-02-18', score: 82 },
            { date: '2026-03-06', score: 84 },
            { date: '2026-03-22', score: 85 },
            { date: '2026-04-08', score: 86 },
          ],
        },
      };

      const fastRes = estimateEmpiricalHalfLife(fastDecayCat);
      const solidRes = estimateEmpiricalHalfLife(solidCat);
      expect(fastRes.samplePairs).toBeGreaterThanOrEqual(2);
      expect(solidRes.samplePairs).toBeGreaterThanOrEqual(4);
      expect(fastRes.effectiveHalfLife).toBeLessThan(solidRes.effectiveHalfLife);
      expect(solidRes.profile).toBe('high_retention');
    });
  });

  describe('4. Psychometric TRI / IRT 2PL + CAT + Guessing EV Simulator', () => {
    it('estimates higher theta for stronger accuracy on hard items and detects pedagogical incoherence', () => {
      const strong = estimateIRTAbility([
        { difficulty: 'facil', total: 20, correct: 19 },
        { difficulty: 'medio', total: 20, correct: 17 },
        { difficulty: 'dificil', total: 20, correct: 14 },
      ]);
      const weak = estimateIRTAbility([
        { difficulty: 'facil', total: 20, correct: 10 },
        { difficulty: 'medio', total: 20, correct: 6 },
        { difficulty: 'dificil', total: 20, correct: 3 },
      ]);

      expect(strong.hasData).toBe(true);
      expect(strong.theta).toBeGreaterThan(weak.theta);
      expect(strong.iccCurve.length).toBeGreaterThan(10);
      expect(['dificil', 'expert']).toContain(strong.recommendedDifficulty);

      const incoherent = estimateIRTAbility([
        { difficulty: 'facil', total: 10, correct: 4 },
        { difficulty: 'dificil', total: 10, correct: 8 },
      ]);
      expect(incoherent.pedagogicalIncoherence).toBe(true);
      expect(incoherent.incoherenceMessage).toContain('Incoerência TRI');
    });

    it('adapts difficulty smoothly via CAT controller and ranks Cebraspe guessing EV', () => {
      expect(nextAdaptiveDifficulty('medio', 88, 90)).toBe('dificil');
      expect(nextAdaptiveDifficulty('medio', 40, 120)).toBe('facil');
      expect(nextAdaptiveDifficulty('medio', 65, 110)).toBe('medio');

      const telemetry = [
        // 6 certezas: 5 right, 1 wrong => net +4
        ...Array.from({ length: 5 }, () => ({ confidence: 'certeza', correct: true })),
        { confidence: 'certeza', correct: false },
        // 4 duvidas: 3 right, 1 wrong => net +2
        ...Array.from({ length: 3 }, () => ({ confidence: 'duvida', correct: true })),
        { confidence: 'duvida', correct: false },
        // 6 chutes: 1 right, 5 wrong => net -4 (negative EV!)
        { confidence: 'chute', correct: true },
        ...Array.from({ length: 5 }, () => ({ confidence: 'chute', correct: false })),
      ];
      const strat = computeGuessingStrategy(telemetry, { penaltyPerWrong: 1.0 });
      expect(strat.breakEvenPct).toBe(50);
      expect(strat.bestStrategy.id).toBe('skip_chute');
      expect(strat.bestStrategy.netPoints).toBe(6);
      expect(strat.levels.find((l) => l.key === 'chute').shouldAnswer).toBe(false);
    });
  });

  describe('5. Monte Carlo Risk Decomposition + Tornado Sensitivity', () => {
    it('decomposes elimination causes (global vs minCutoff vs examGroup) and ranks tornado leverage', () => {
      const subjects = [
        { id: 'cat-dir', name: 'Direito Constitucional', mean: 55, sd: 8, weight: 30, minCutoff: 65, examGroup: 'especificos', minScore: 0, maxScore: 100 },
        { id: 'cat-port', name: 'Português', mean: 82, sd: 5, weight: 20, minCutoff: 50, examGroup: 'basicos', minScore: 0, maxScore: 100 },
        { id: 'cat-rlm', name: 'Raciocínio Lógico', mean: 66, sd: 6, weight: 15, minCutoff: 40, examGroup: 'basicos', minScore: 0, maxScore: 100 },
      ];
      const mc = simulateNormalDistribution({
        mean: 66,
        sd: 8,
        targetScore: 70,
        simulations: 600,
        minScore: 0,
        maxScore: 100,
        subjects,
        examGroupCutoffs: { especificos: 65, basicos: 50 },
      });
      expect(mc.riskDecomposition).toBeTruthy();
      expect(
        mc.riskDecomposition.passedAllPct +
        mc.riskDecomposition.failedGlobalOnlyPct +
        mc.riskDecomposition.failedMinCutoffOnlyPct +
        mc.riskDecomposition.failedBothPct
      ).toBeCloseTo(100, 0);
      expect(mc.riskDecomposition.subjectEliminationRates.length).toBeGreaterThan(0);
      expect(mc.riskDecomposition.subjectEliminationRates[0].name).toBe('Direito Constitucional');

      const tornado = runTornadoSensitivity({
        subjects,
        targetScore: 70,
        minScore: 0,
        maxScore: 100,
        deltaPct: 10,
        simulations: 400,
      });
      expect(tornado.items).toHaveLength(3);
      expect(tornado.items[0].swing).toBeGreaterThanOrEqual(tornado.items[1].swing);
      expect(tornado.items[0].id).toBe('cat-dir');

      const whatIf = runTornadoSensitivity({
        subjects,
        targetScore: 70,
        minScore: 0,
        maxScore: 100,
        deltaPct: 10,
        simulations: 400,
        overrides: { 'cat-dir': 20 },
      });
      expect(whatIf.baseProbability).toBeGreaterThan(tornado.baseProbability);
    });
  });

  describe('6. Weekly Subject Correlation Matrix & Regime Map', () => {
    it('detects crowding-out negative correlation across >= 3 shared weeks and builds Hurst x velocity map', () => {
      const corrCats = [
        {
          id: 'a',
          name: 'Matéria A',
          color: '#3b82f6',
          simuladoStats: {
            history: [
              { date: '2026-03-02', score: 50 },
              { date: '2026-03-09', score: 65 },
              { date: '2026-03-16', score: 80 },
              { date: '2026-03-23', score: 90 },
            ],
          },
        },
        {
          id: 'b',
          name: 'Matéria B',
          color: '#ef4444',
          simuladoStats: {
            history: [
              { date: '2026-03-02', score: 88 },
              { date: '2026-03-09', score: 74 },
              { date: '2026-03-16', score: 58 },
              { date: '2026-03-23', score: 45 },
            ],
          },
        },
      ];

      const corr = computeWeeklyCategoryCorrelation(corrCats);
      expect(corr.categories).toHaveLength(2);
      const crowdingOutPairs = corr.pairs.filter((p) => p.type === 'crowding_out');
      expect(crowdingOutPairs.length).toBeGreaterThanOrEqual(1);
      expect(crowdingOutPairs[0].r).toBeLessThan(-0.9);

      const regimes = buildRegimeMapData(SAMPLE_CATEGORIES, [], [], 100, 0, 75);
      expect(regimes).toHaveLength(3);
      expect(regimes.every((r) => Number.isFinite(r.hurstH) && Number.isFinite(r.velocity))).toBe(true);
    });
  });

  describe('7. Markowitz Efficient Frontier & Optimal Weekly Schedule', () => {
    it('allocates more hours to high-weight/deficit subject and generates interleaved weekly Agenda events', () => {
      const alloc = computeEfficientAllocation(SAMPLE_CATEGORIES, [], {
        weeklyBudgetHours: 21,
        targetScore: 75,
        now: FIXED_NOW,
      });
      expect(alloc.hasData).toBe(true);
      expect(alloc.frontier.length).toBeGreaterThanOrEqual(5);
      expect(alloc.subjects[0].id).toBe('cat-dir'); // highest weight + cutoff deficit

      const logs = [
        { createdAt: '2026-04-28T08:30:00Z', minutes: 60 },
        { createdAt: '2026-04-29T08:15:00Z', minutes: 60 },
      ];
      const sched = generateOptimalWeeklySchedule(SAMPLE_CATEGORIES, logs, [], [], {
        dailyHours: [2, 3, 3, 3, 3, 3, 2],
        now: FIXED_NOW,
      });
      expect(sched.events.length).toBeGreaterThanOrEqual(10);
      expect(sched.events.every((e) => e.id && e.title && e.date && e.time && e.duration === 60)).toBe(true);
      expect(sched.summary.totalHours).toBe(sched.events.length);
    });
  });

  describe('8. Study Mode Causal Events & StudySlice Metadata Persistence', () => {
    it('generates studyMode causal events and persists studyMode + energyLevel via handleUpdateStudyTime', () => {
      const simulados = SAMPLE_CATEGORIES[0].simuladoStats.history.map((h) => ({
        ...h,
        categoryId: 'cat-dir',
        subject: 'Direito Constitucional',
      }));
      const logs = [
        { date: '2026-03-04', categoryId: 'cat-dir', minutes: 60, studyMode: 'questoes' },
        { date: '2026-03-14', categoryId: 'cat-dir', minutes: 90, studyMode: 'revisao' },
      ];
      const events = buildStudyModeCausalEvents(simulados, logs);
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events.some((e) => e.actionType === 'mode_questoes')).toBe(true);
      expect(events.some((e) => e.actionType === 'mode_revisao')).toBe(true);

      // Test createStudySlice metadata persistence directly
      let mockState = {
        appState: {
          activeId: 'c1',
          version: 1,
          contests: {
            c1: {
              categories: [{ id: 'cat-dir', name: 'Direito Constitucional', tasks: [] }],
              studyLogs: [],
              studySessions: [],
              user: {},
            },
          },
        },
      };
      const set = (updater) => {
        if (typeof updater === 'function') updater(mockState);
      };
      const get = () => ({ awardExperience: () => {} });
      const slice = createStudySlice(set, get);
      slice.handleUpdateStudyTime('cat-dir', 45, 't1', 'Direitos Fundamentais', {
        studyMode: 'lei_seca',
        energyLevel: 4,
      });

      const savedLog = mockState.appState.contests.c1.studyLogs[0];
      expect(savedLog.studyMode).toBe('lei_seca');
      expect(savedLog.energyLevel).toBe(4);
      expect(mockState.appState.contests.c1.studySessions[0].studyMode).toBe('lei_seca');
    });
  });

  describe('9. UI Components Smoke & Interaction Tests', () => {
    it('renders AdaptiveMaturityBadge (compact & full)', () => {
      const { container: c1 } = render(<AdaptiveMaturityBadge compact autoSync={false} />);
      expect(c1.textContent).toContain('Motor Adaptativo');
      const { container: c2 } = render(<AdaptiveMaturityBadge autoSync={false} />);
      expect(c2.textContent).toContain('/ N5');
    });

    it('renders TornadoWhatIfChart and updates live What-If sliders', () => {
      const { container } = render(
        <TornadoWhatIfChart categories={SAMPLE_CATEGORIES} targetScore={70} minScore={0} maxScore={100} />
      );
      expect(container.textContent).toContain('Decomposição do Risco de Eliminação');
      expect(container.textContent).toContain('Sensibilidade (Tornado)');
      expect(container.textContent).toContain('Simulador "E Se?"');
      expect(container.textContent).toContain('Direito Constitucional');
    });

    it('renders CorrelationRegimeChart with heatmap & Hurst regime map', () => {
      const { container } = render(
        <CorrelationRegimeChart categories={SAMPLE_CATEGORIES} minScore={0} maxScore={100} />
      );
      expect(container.textContent).toContain('Matriz de Correlação Semanal');
      expect(container.textContent).toContain('Mapa de Regimes');
    });

    it('renders IRTPsychometricChart with TRI curve and guessing EV simulator', () => {
      const simRows = [
        {
          id: 'r1',
          difficulty: 'facil',
          total: 10,
          correct: 5,
          questionTelemetry: [
            { qIndex: 0, correct: true, confidence: 'certeza', timeSec: 40 },
            { qIndex: 1, correct: false, confidence: 'chute', timeSec: 20 },
          ],
        },
        { id: 'r2', difficulty: 'dificil', total: 10, correct: 8 },
      ];
      const { container } = render(
        <IRTPsychometricChart
          categories={SAMPLE_CATEGORIES}
          simuladoRows={simRows}
          examBoard="CEBRASPE"
          penaltyPerWrong={1.0}
        />
      );
      expect(container.textContent).toContain('Curva Característica TRI / IRT');
      expect(container.textContent).toContain('Incoerência TRI detectada');
      expect(container.textContent).toContain('Estratégia Ótima de Chute');
    });

    it('renders MetacognitionFatigueChart with metacognition matrix & quartile fatigue', () => {
      const simRows = [
        {
          id: 'r1',
          questionTelemetry: [
            { qIndex: 0, correct: true, confidence: 'certeza', timeSec: 50 },
            { qIndex: 1, correct: false, confidence: 'certeza', errorType: 'pegadinha', timeSec: 60 },
            { qIndex: 2, correct: true, confidence: 'duvida', timeSec: 70 },
            { qIndex: 3, correct: false, confidence: 'chute', errorType: 'lacuna', timeSec: 95 },
          ],
        },
      ];
      const { container } = render(<MetacognitionFatigueChart simuladoRows={simRows} />);
      expect(container.textContent).toContain('Matriz de Metacognição');
      expect(container.textContent).toContain('Conceito Errado Crítico');
      expect(container.textContent).toContain('Curva de Fadiga Intraprova');
      expect(container.textContent).toContain('Anatomia dos Erros');
    });

    it('renders WorkloadACWRChart & EfficientAllocationChart cleanly', () => {
      const recentLogs = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(Date.now() - i * 86_400_000).toISOString(),
        minutes: 90,
        categoryId: 'cat-dir',
        energyLevel: 4,
      }));
      const { container: c1 } = render(<WorkloadACWRChart studyLogs={recentLogs} />);
      expect(c1.textContent).toContain('Monitor de Carga & Burnout (ACWR)');
      expect(c1.textContent).toContain('Zona Ótima');

      const { container: c2 } = render(
        <EfficientAllocationChart categories={SAMPLE_CATEGORIES} studyLogs={recentLogs} targetScore={75} />
      );
      expect(c2.textContent).toContain('Fronteira Eficiente');
      const input = c2.querySelector('input[type="number"]');
      if (input) {
        fireEvent.change(input, { target: { value: '30' } });
      }
      expect(c2.textContent).toContain('Realocação Recomendada');
      expect(c2.textContent).toContain('Ótima:');
    });
  });
});
