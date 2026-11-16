// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, fireEvent, screen, cleanup, act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RaioXDashboard } from '../../pages/Coach.jsx';
import AICoachView from '../../components/AICoachView.jsx';
import ReliabilityCurveChart from '../../components/charts/ReliabilityCurveChart.jsx';
import { useMonteCarloStats } from '../../hooks/useMonteCarloStats.js';
import { useAppStore } from '../../store/useAppStore.js';
import { getDateKey } from '../dateHelper.js';
import {
  calculateUrgency,
  generateDailyGoals,
  getWeakestTopicsList,
  clearUrgencyCache,
  clearMcCache,
  clearTopicsCache,
} from '../coachLogic.js';
import { projectScore } from '../../engine/projection.js';
import { computeStudyEfficiency } from '../../engine/diagnostics.js';
import { runCausalPolicyCycle } from '../coachCausal.js';
import { buildPolicyReport } from '../../engine/causal/policyEngine.js';
import { average } from '../../engine/math/kahan.js';

describe('Coach AI Menu 2026 Deep Audit & Math Fixes', () => {
  let prevActiveId;

  beforeEach(() => {
    prevActiveId = useAppStore.getState().appState?.activeId;
    clearUrgencyCache();
    clearMcCache();
    clearTopicsCache();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    if (prevActiveId !== undefined) {
      useAppStore.setState((s) => ({
        appState: { ...s.appState, activeId: prevActiveId },
      }));
    }
  });

  describe('1. Coach UI & Chart Fixes', () => {
    it('RaioXDashboard resolves lowercase calibrationOps keys and suppresses -0% penalty badges', () => {
      const mockData = {
        categories: [{ id: 'cat_DirConst', name: 'Direito Constitucional' }],
        simulados: [
          { id: 's1', batchId: 'b1', categoryId: 'cat_DirConst', date: '2026-05-01', score: 62 },
        ],
        simuladoRows: [],
        calibrationOps: {
          // Armazenado com chave lowercase (getCalibrationKey)
          cat_dirconst: { degraded: true, avgBrier7d: 0.19 },
        },
        calibrationHistoryByCategory: {
          cat_DirConst: [
            { timestamp: 1700000001000, avgBrier: 0.19, ece: 0.08, calibrationPenalty: 0.003 },
          ],
        },
        calibrationAuditLog: [
          {
            timestamp: 1700000001000,
            categoryId: 'cat_DirConst',
            categoryName: 'Direito Constitucional',
            avgBrier: 0.19,
            ece: 0.08,
            calibrationPenalty: 0.003,
            probability: 0.61,
          },
        ],
      };

      const html = renderToStaticMarkup(<RaioXDashboard data={mockData} />);
      expect(html).toContain('Degradado');
      expect(html).not.toContain('-0%');
    });

    it('ReliabilityCurveChart clamps >100% percentage inputs into [0, 1] and renders smoothly', () => {
      const html = renderToStaticMarkup(
        <ReliabilityCurveChart
          buckets={[
            { binIndex: 0, meanPred: 105, observedRate: 112, gap: 105, count: 4 },
            { binIndex: 1, meanPred: 0.72, observedRate: 0.68, gap: 0.04, count: 6 },
          ]}
        />
      );
      expect(html).toContain('Curva de Confiabilidade');
      expect(html).not.toContain('NaN');
    });

    it('AICoachView resolves activeContest.categories object maps for card scale (maxScore/minScore)', async () => {
      useAppStore.setState((s) => ({
        appState: {
          ...s.appState,
          activeId: 'obj-map-contest',
          contests: {
            ...s.appState.contests,
            'obj-map-contest': {
              contestName: 'Concurso Mapa Objeto',
              maxScore: 100,
              minScore: 0,
              categories: {
                catRed: { id: 'catRed', name: 'Redação Discursiva', maxScore: 10, minScore: 0 },
              },
              coachPlanner: {},
              coachPlan: [
                {
                  id: 'card-red-1',
                  categoryId: 'catRed',
                  category: 'Redação Discursiva',
                  topicName: 'Coesão',
                  text: 'Redação Discursiva: Revisar Coesão',
                  priority: 'high',
                  completed: false,
                  analysis: {
                    reason: 'Oscilação Moderada',
                    // volatility=2 em 0..10 = 20% (> 8% => highVol text-amber-300); em 0..100 seria 2% (text-slate-300)
                    monteCarlo: { probability: 64, volatility: 2 },
                  },
                },
              ],
            },
          },
        },
      }));

      render(
        <MemoryRouter>
          <AICoachView
            suggestedFocus={null}
            onClearHistory={() => {}}
            onRegeneratePlan={() => {}}
          />
        </MemoryRouter>
      );

      const cardsTabBtn = screen.getByRole('button', { name: /pendências/i });
      fireEvent.click(cardsTabBtn);

      const volValue = await screen.findByText('±2', {}, { timeout: 3000 });
      expect(volValue.className).toContain('text-amber-300');
    });
  });

  describe('2. useMonteCarloStats Hook String-Safety', () => {
    it('does not throw when existing monteCarloHistory entry stores string probability/target', async () => {
      const today = getDateKey(new Date());
      const categories = [
        {
          id: 'cat1',
          name: 'Português',
          maxScore: 100,
          minScore: 0,
          simuladoStats: {
            history: [
              { date: '2026-07-01', score: 65, total: 20, correct: 13 },
              { date: '2026-07-05', score: 75, total: 20, correct: 15 },
              { date: '2026-07-10', score: 82, total: 20, correct: 16.4 },
            ],
          },
        },
      ];

      useAppStore.setState((s) => ({
        appState: {
          ...s.appState,
          activeId: 'mc-str-safety',
          contests: {
            ...s.appState.contests,
            'mc-str-safety': {
              contestName: 'MC String Safety',
              maxScore: 100,
              minScore: 0,
              categories,
              simuladoRows: [],
              monteCarloHistory: [
                { date: today, probability: '72.4', target: '80.0', ci95Low: 60, mean: 74 },
              ],
            },
          },
        },
      }));

      const { result } = renderHook(() =>
        useMonteCarloStats({
          categories,
          goalDate: '2027-12-31',
          targetScore: 80,
          timeIndex: 2,
          timelineDates: ['2026-07-01', '2026-07-05', '2026-07-10'],
          minScore: 0,
          maxScore: 100,
          effectiveSimulateToday: false,
          simuladoRows: [],
        })
      );

      await waitFor(() => {
        expect(result.current.simulationData?.status).toBe('ready');
      });
    });
  });

  describe('3. coachLogic.js Edge Cases & Null/Empty Coercion Fixes', () => {
    it('ignores empty-string minCutoff in calculateUrgency and falls back to mappedGlobalTarget', () => {
      const cat = {
        id: 'c1',
        name: 'AFO',
        minCutoff: '',
        maxScore: 50,
        minScore: 0,
        simuladoStats: {
          history: [
            { date: '2026-06-01', score: 25, total: 50, correct: 25 },
            { date: '2026-06-10', score: 25, total: 50, correct: 25 },
            { date: '2026-06-20', score: 25, total: 50, correct: 25 },
          ],
        },
      };

      const urg = calculateUrgency(cat, [], [], {
        targetScore: 80,
        maxScore: 100,
        minScore: 0,
        now: '2026-06-25',
      });

      // Com 25/50 (50%) vs meta mapeada 40/50 (80%), prob < 50; se minCutoff "" virasse 0, prob seria ~100%
      expect(urg.details.monteCarlo.probability).toBeLessThan(50);
    });

    it('accepts options.allCategories as object map without throwing', () => {
      const catsObj = {
        c1: {
          id: 'c1',
          name: 'Contabilidade',
          weight: 3,
          simuladoStats: { history: [{ date: '2026-06-01', score: 70 }] },
        },
        c2: {
          id: 'c2',
          name: 'Economia',
          weight: 2,
          simuladoStats: { history: [{ date: '2026-06-01', score: 65 }] },
        },
      };

      const urg = calculateUrgency(catsObj.c1, [], [], {
        allCategories: catsObj,
        now: '2026-06-10',
      });
      expect(Number.isFinite(urg.normalizedScore)).toBe(true);
    });

    it('keeps undated topic entries chronologically ordered as today and falls back to score when correct is ""', () => {
      const cat = { id: 'c1', name: 'Matemática', maxScore: 100, minScore: 0 };
      const sims = [
        {
          id: 'old-sim',
          categoryId: 'c1',
          date: '2025-01-10',
          topics: [{ name: 'Matrizes', total: 10, correct: 4 }],
        },
        {
          id: 'nodate-sim',
          categoryId: 'c1',
          topics: [{ name: 'Matrizes', total: 10, correct: '', score: 80 }],
        },
      ];

      const topics = getWeakestTopicsList(cat, sims, 100, 5, 0, { now: '2026-06-01' });
      expect(topics).toHaveLength(1);
      const t = topics[0];
      expect(t.scores).toHaveLength(2);
      // 2025-01-10 deve vir primeiro, depois o registro sem data atribuído a 2026-06-01
      expect(t.scores[0].score).toBeCloseTo(40, 1);
      expect(t.scores[1].score).toBeCloseTo(80, 1);
      expect(t.scores[0].date < t.scores[1].date).toBe(true);
    });

    it('preserves negative domain minScore when category minScore/minCutoff are null or "" in generateDailyGoals', () => {
      const categories = [
        {
          id: 'cebraspe-penal',
          name: 'Direito Penal',
          maxScore: 100,
          minScore: '',
          minCutoff: '',
          tasks: [],
          simuladoStats: {
            history: [
              { date: '2026-06-01', score: -85, total: 100 },
              { date: '2026-06-08', score: -88, total: 100 },
              { date: '2026-06-15', score: -90, total: 100 },
            ],
          },
        },
      ];

      const goals = generateDailyGoals(categories, [], [], {
        minScore: -100,
        maxScore: 100,
        targetScore: null, // deve usar default minScore + domain * 0.8 = 60, jamais 0
        now: '2026-06-20',
      });

      const masterAlert = goals.find((g) => g.text?.includes('[ALERTA MESTRE]'));
      expect(masterAlert).toBeTruthy();
      expect(masterAlert.analysis.details).toContain('60 pts');
      expect(masterAlert.analysis.details).not.toContain('meta de 0');
      expect(masterAlert.analysis.details).not.toContain('Meta ZDP: 0');
    });
  });

  describe('4. Engine Math Fixes (Projection, Diagnostics, Causal Policy, Kahan)', () => {
    it('projectScore forwards negative minScore into calculateSlope & logisticRegression domain clamping', () => {
      // Salto de -80 para 80 em 10 dias => +16/dia num domínio [-100, 100] (range=200)
      // Clamping de calculateSlope = 0.004 * range: em [0, 100] seria 0.4/dia; em [-100, 100] é 0.8/dia.
      const history = [
        { date: '2026-06-01', score: -80 },
        { date: '2026-06-04', score: -30 },
        { date: '2026-06-07', score: 20 },
        { date: '2026-06-11', score: 80 },
      ];
      const resNeg = projectScore(history, 30, -100, 100, { referenceDate: '2026-06-11' });
      const resZeroBuggyMin = projectScore(history, 30, -100, 100, { referenceDate: '2026-06-11', minScore: 0 });
      expect(Number.isFinite(resNeg.projected)).toBe(true);
      expect(resNeg.projected).toBeGreaterThanOrEqual(-100);
      expect(resNeg.projected).toBeLessThanOrEqual(100);
      // Como logistic/slope dependem do minScore real (-100 vs 0), o resultado com -100 não deve colapsar para o de minScore=0
      expect(resNeg.projected).not.toBeCloseTo(resZeroBuggyMin.projected, 1);
    });

    it('computeStudyEfficiency ignores empty-string correct ("") and uses score fallback', () => {
      const eff = computeStudyEfficiency(
        [{ categoryId: 'c1', minutes: 60, date: '2026-06-10' }],
        [{ categoryId: 'c1', total: 20, correct: '', score: 75, date: '2026-06-10' }],
        100,
        'c1',
        null,
        0
      );
      expect(eff.accuracyRate).toBeCloseTo(0.75, 3);
      expect(eff.efficiency).toBeCloseTo(15, 2);
    });

    it('runCausalPolicyCycle and buildPolicyReport propagate minScore for negative-scale exams', () => {
      const report = buildPolicyReport([], null, { maxScore: 120, minScore: -120 });
      expect(report.minScore).toBe(-120);
      expect(report.maxScore).toBe(120);

      const res = runCausalPolicyCycle({
        categories: [{ id: 'c1', name: 'Direito', weight: 2 }],
        simulados: [],
        studyLogs: [],
        options: { minScore: -120, maxScore: 120 },
      });
      expect(res.report.minScore).toBe(-120);
    });

    it('kahan average ignores whitespace strings just like kahanSum and kahanMean', () => {
      expect(average([10, '   ', '', null, 20])).toBeCloseTo(15, 10);
    });
  });
});
