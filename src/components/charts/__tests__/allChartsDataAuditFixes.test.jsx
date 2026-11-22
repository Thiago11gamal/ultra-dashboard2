// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, renderHook, cleanup } from '@testing-library/react';
import { resolveEffectiveCorrect, getSafeScore } from '../../../utils/scoreHelper';
import { useChartData } from '../../../hooks/useChartData';
import { useSubjectAggData } from '../../../hooks/useSubjectAggData';
import { downsampleLTTB } from '../../../utils/downsample';
import { ChartTooltip } from '../ChartTooltip';
import { GaussianPlot } from '../GaussianPlot';
import ReliabilityCurveChart from '../ReliabilityCurveChart';
import { computeEvolutionStatuses } from '../../../utils/evolutionStatus';
import { TodayVsGeneralChart } from '../EvolutionChart/TodayVsGeneralChart';
import WeeklyPerformanceChart from '../EvolutionChart/WeeklyPerformanceChart';
import { TornadoWhatIfChart } from '../EvolutionChart/TornadoWhatIfChart';
import { MetacognitionFatigueChart } from '../EvolutionChart/MetacognitionFatigueChart';
import {
  buildSpeedAccuracyData,
  buildExamPacingData,
  buildProjectionFanData,
  buildSyllabusBurndownData,
  buildKnowledgeGraphLayout,
  buildCalibrationSeriesData,
} from '../../../utils/advancedChartHelpers';
import { estimateIRTAbility } from '../../../engine/adaptive/irtEngine';
import ParetoAnalysis from '../../ParetoAnalysis';
import { reconcileContestCategoriesHistory } from '../../../utils/simuladoReconciler';
import { mapRetentionData } from '../../../utils/chartDataMappers';
import { computeEfficientAllocation } from '../../../engine/adaptive/allocationOptimizer';
import { getDateKey, isFlashcardDue } from '../../../utils/dateHelper';
import DueForecast from '../../DueForecast';
import { evaluateModelHealth } from '../../../engine/observability/modelHealth';
import { runCoachDriftGuard } from '../../../utils/coachObservability';
import { trainCausalModel } from '../../../utils/coachCausal';
import { estimateUpliftByAction } from '../../../engine/causal/upliftModel';
import { buildCategorySplits } from '../../../engine/evaluation/strategyBacktester';
import { saveEvaluationResult, loadEvaluationResults, clearEvaluationResults } from '../../../engine/evaluation/coachEvaluator';
import { CausalUpliftChart } from '../Coach/CausalUpliftChart';

describe('All Charts Data Audit Fixes Regression Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // 1. SHARED PIPELINES & BASE CHARTS
  // ==========================================================================
  describe('Shared Core Pipelines & Base Charts', () => {
    it('resolveEffectiveCorrect honors CEBRASPE penalties, ENEM TRI scorePoints, and preserves simple integer rounding', () => {
      // CEBRASPE 0..100: 8/10 with penaltyPerWrong=1 => net 6/10 = 60
      const cebraspe0100 = { total: 10, correct: 8, penaltyPerWrong: 1 };
      const sc1 = getSafeScore(cebraspe0100, 100, 0);
      expect(sc1).toBeCloseTo(60, 4);
      expect(resolveEffectiveCorrect(cebraspe0100, sc1, 10, true, 8, 100, 0)).toBeCloseTo(6, 4);

      // CEBRASPE -120..120: 70 correct, 10 blanks, 40 wrong => net +30 => ratio (30 - (-120))/240 = 0.625 => effCorrect = 75
      const cebraspeNeg = { total: 120, correct: 70, blanks: 10, penaltyPerWrong: 1 };
      const scNeg = getSafeScore(cebraspeNeg, 120, -120);
      expect(scNeg).toBeCloseTo(30, 4);
      expect(resolveEffectiveCorrect(cebraspeNeg, scNeg, 120, true, 70, 120, -120)).toBeCloseTo(75, 4);

      // ENEM TRI: 35/45 with scorePoints=720 on 0..1000 => ratio 0.72 => 32.4
      const enem = { total: 45, correct: 35, scorePoints: 720 };
      const scEnem = getSafeScore(enem, 1000, 0);
      expect(scEnem).toBeCloseTo(720, 4);
      expect(resolveEffectiveCorrect(enem, scEnem, 45, true, 35, 1000, 0)).toBeCloseTo(32.4, 4);

      // Simple rounded integer score: { total: 3, correct: 2, score: 67 } stays 2 (not 2.01)
      const simpleRounded = { total: 3, correct: 2, score: 67 };
      expect(resolveEffectiveCorrect(simpleRounded, 67, 3, true, 2, 100, 0)).toBe(2);
    });

    it('useChartData honors CEBRASPE penalty, excludes validated:false, and ignores null-score rows', () => {
      const categories = [
        {
          id: 'cat-ceb',
          name: 'Direito Constitucional',
          color: '#3b82f6',
          simuladoStats: {
            history: [
              { date: '2026-06-01', total: 10, correct: 8, penaltyPerWrong: 1 }, // net = 60
              { date: '2026-06-02', total: 10, correct: 10, validated: false }, // excluded
            ],
          },
        },
        {
          id: 'cat-null',
          name: 'Vazia',
          simuladoStats: {
            history: [{ date: '2026-06-01', total: 0, score: null, scorePoints: null }],
          },
        },
      ];

      const { result } = renderHook(() => useChartData(categories, {}, 100, 0));

      expect(result.current.activeCategories.map((c) => c.id)).toEqual(['cat-ceb']);
      expect(result.current.globalMetrics.globalAccuracy).toBeCloseTo(60, 2);
      expect(result.current.timeline).toHaveLength(1);
      expect(result.current.timeline[0]['raw_cat-ceb']).toBeCloseTo(60, 2);
    });

    it('useSubjectAggData honors root timedQuestoes and treats null/empty minScore as global minScore', () => {
      const categories = [
        {
          id: 'cat-1',
          name: 'Português',
          minScore: '',
          maxScore: 120,
          simuladoStats: {
            history: [
              {
                date: '2026-06-01',
                total: 50,
                score: 0,
                timeSpent: 600,
                timedQuestoes: 10,
              },
            ],
          },
        },
      ];

      const { result } = renderHook(() =>
        useSubjectAggData({
          categories,
          timeWindow: 'all',
          maxScore: 120,
          minScore: -120,
        })
      );

      expect(result.current).toHaveLength(1);
      // Root timedQuestoes=10 honored => 600 / 10 = 60 s/q (NOT 600 / 50 = 12 s/q)
      expect(result.current[0].timedQuestoes).toBe(10);
      expect(result.current[0].timeSpent / result.current[0].timedQuestoes).toBeCloseTo(60, 2);
      // With minScore=-120 (empty string NOT coerced to 0), score=0 on [-120, 120] is 50% => 25/50 (NOT 0/50)
      expect(result.current[0].acertos).toBe(25);
    });

    it('downsampleLTTB preserves legitimate 0 values during backward-fill instead of treating them as null', () => {
      const data = [
        { x: 0, y: 0 },
        { x: 1, y: 50 },
        { x: 2, y: 80 },
        { x: 3, y: 90 },
        { x: 4, y: 100 },
      ];
      const out = downsampleLTTB(data, 4, 'x', 'y');
      expect(out[0].y).toBe(0);
    });

    it('ChartTooltip sorts 0 above negative scores on Cebraspe scale', () => {
      const { container } = render(
        <ChartTooltip
          active
          label="2026-06-01"
          minScore={-120}
          maxScore={120}
          unit=" pts"
          isCompare
          payload={[
            { name: 'Negativa', value: -50, color: '#ef4444', payload: {} },
            { name: 'Zero', value: 0, color: '#3b82f6', payload: {} },
          ]}
        />
      );
      const text = container.textContent || '';
      expect(text.indexOf('Zero')).toBeGreaterThan(-1);
      expect(text.indexOf('Negativa')).toBeGreaterThan(-1);
      expect(text.indexOf('Zero')).toBeLessThan(text.indexOf('Negativa'));
    });

    it('GaussianPlot renders safely at currentScore=0 on negative Cebraspe domain [-120, 120]', () => {
      const { container } = render(
        <GaussianPlot
          mean={10}
          sd={20}
          currentScore={0}
          targetScore={40}
          minScore={-120}
          maxScore={120}
          unit=" pts"
        />
      );
      expect(container.textContent).toContain('0');
      expect(container.textContent).not.toContain('NaN');
    });

    it('ReliabilityCurveChart does not inflate 0..100 gap 100x or treat observedRate=1 as 100%', () => {
      const { container } = render(
        <ReliabilityCurveChart
          reliability={[
            { bin: 0, expectedRate: 1, observedRate: 1, gap: 0, count: 5 },
            { bin: 1, expectedRate: 50, observedRate: 50.5, gap: 0.5, count: 10 },
            { bin: 2, expectedRate: 80, observedRate: 82, gap: 2, count: 15 },
          ]}
          ece={0.01}
        />
      );
      expect(container.textContent).not.toContain('NaN');
      expect(container.textContent).not.toContain('50.0%');
    });
  });

  // ==========================================================================
  // 2. EVOLUTION CHARTS & DIAGNOSTICS
  // ==========================================================================
  describe('Evolution Charts & Diagnostics', () => {
    it('computeEvolutionStatuses does not fall back to stale all-time data under active timeWindow, isolates showOnlyFocus constância, and ignores minCutoff=0', () => {
      const focusCat = {
        id: 'cat-1',
        name: 'Português',
        minCutoff: 0,
        minScore: 0,
        maxScore: 100,
      };
      const statuses = computeEvolutionStatuses({
        filteredChartData: [],
        timeline: [{ date: '2025-01-01', 'raw_cat-1': 90, globalAverage: 90 }],
        heatmapData: {
          dates: [{ key: '2026-06-01' }, { key: '2026-06-02' }],
          rows: [{ id: 'cat-other', cells: [{ total: 10, correct: 8 }, { total: 10, correct: 8 }] }],
        },
        showOnlyFocus: true,
        focusCategory: focusCat,
        targetScore: 80,
        globalMaxScore: 100,
        globalMinScore: 0,
        unit: '%',
        timeWindow: '30d',
      });
      const ritmo = statuses.find((s) => s.id === 'ritmo' || /ritmo|atual/i.test(s.label || ''));
      const constancia = statuses.find((s) => /const/i.test(s.label || s.id || ''));
      // Empty 30d window must not leak stale 90% from 2025 all-time timeline
      expect(JSON.stringify(statuses)).not.toContain('90.0%');
      // Missing heatmap row for focused category must not inherit global 100% consistency
      if (constancia) {
        expect(String(constancia.value || '')).toMatch(/0|sem/i);
      }
      if (ritmo) {
        expect(String(ritmo.detail || '')).not.toContain('Meta 0');
      }
    });

    it('TodayVsGeneralChart renders score-only entry {total:0, correct:0, score:85} as 85.0% and honors CEBRASPE penalty', () => {
      const todayKey = getDateKey(new Date());
      const scoreOnlyCat = {
        id: 'cat-score-only',
        name: 'Física',
        simuladoStats: {
          history: [
            { date: todayKey, total: 0, correct: 0, score: 85, isPercentage: false },
          ],
        },
      };
      const { container: c1 } = render(
        <TodayVsGeneralChart
          activeCategories={[scoreOnlyCat]}
          focusCategory={scoreOnlyCat}
          maxScore={100}
          minScore={0}
          unit="%"
        />
      );
      expect(c1.textContent).toContain('85.0');
      expect(c1.textContent).not.toContain('Dados insuficientes');
      cleanup();

      const cebraspeCat = {
        id: 'cat-ceb',
        name: 'Penal',
        simuladoStats: {
          history: [
            { date: todayKey, total: 10, correct: 8, penaltyPerWrong: 1 }, // net = 60%
          ],
        },
      };
      const { container: c2 } = render(
        <TodayVsGeneralChart
          activeCategories={[cebraspeCat]}
          focusCategory={cebraspeCat}
          maxScore={100}
          minScore={0}
          unit="%"
        />
      );
      expect(c2.textContent).toContain('60.0');
      expect(c2.textContent).not.toContain('80.0');
    });

    it('WeeklyPerformanceChart renders score-only entries even with empty topics:[] instead of empty state', () => {
      const todayKey = getDateKey(new Date());
      const categories = [
        {
          id: 'cat-1',
          name: 'Matemática',
          simuladoStats: {
            history: [
              { date: todayKey, total: 0, correct: 0, score: 85, isPercentage: false, topics: [] },
            ],
          },
        },
      ];
      const { container } = render(
        <WeeklyPerformanceChart
          categories={categories}
          maxScore={100}
          minScore={0}
          unit="pontos"
        />
      );
      // Previously topics:[] caused score-only entries to be dropped into "Sem atividade nos últimos 7 dias."
      expect(container.textContent).toContain('Desempenho: Últimos 7 Dias');
      expect(container.textContent).not.toContain('Sem atividade nos últimos 7 dias');
    });

    it('buildSpeedAccuracyData resolves topic totals before computing timed question denominator', () => {
      const cats = [
        {
          id: 'cat-t',
          name: 'História',
          simuladoStats: {
            history: [
              {
                date: '2026-06-01',
                total: 0,
                timeSpent: 600,
                topics: [
                  { name: 'Brasil Colônia', total: 5, correct: 4 },
                  { name: 'República', total: 5, correct: 4 },
                ],
              },
            ],
          },
        },
      ];
      const res = buildSpeedAccuracyData(cats, [], { mode: 'subject', maxScore: 100, minScore: 0 });
      expect(res.points).toHaveLength(1);
      // 600s / 10 topic questions = 60 s/q (NOT 600 / 20 synthetic = 30 s/q)
      expect(res.points[0].avgSeconds).toBeCloseTo(60, 2);
      expect(res.points[0].accuracyPct).toBeCloseTo(80, 2);
    });

    it('buildExamPacingData apportions exact examTotalQuestions even when rounded shares overshoot (diff < 0)', () => {
      const cats = Array.from({ length: 6 }, (_, i) => ({
        id: `c-${i}`,
        name: `Matéria ${i + 1}`,
        weight: 10,
        simuladoStats: {
          history: [{ date: '2026-06-01', total: 10, correct: 7, timeSpent: 900, timedQuestoes: 10 }],
        },
      }));
      // 5 questions across 6 equal-weight categories => forces diff < 0 handling
      const res = buildExamPacingData(cats, { examTotalQuestions: 5, examDurationMinutes: 60 });
      const sumQ = res.subjects.reduce((acc, s) => acc + s.allocatedQuestions, 0);
      expect(sumQ).toBe(5);
    });

    it('buildProjectionFanData recognizes alreadyAtTarget when baseLevel >= targetScore and final p50 >= targetScore, and supports short horizons', () => {
      const timeline = [
        { date: '2026-06-01', global_raw: 92 },
        { date: '2026-06-08', global_raw: 91 },
        { date: '2026-06-15', global_raw: 90 },
      ];
      const res = buildProjectionFanData(null, timeline, {
        targetScore: 80,
        horizonDays: 5,
        minScore: 0,
        maxScore: 100,
      });
      expect(res.summary).not.toBeNull();
      expect(res.alreadyAtTarget).toBe(true);
      expect(res.summary.horizonDays).toBe(5);
    });

    it('buildSyllabusBurndownData preserves linear ideal ramp from startDate to goalDate when goal is expired', () => {
      const cats = [
        {
          id: 'c1',
          name: 'Dir',
          tasks: [
            { id: 't1', text: 'A', completed: true, completedAt: '2026-04-05T10:00:00Z' },
            { id: 't2', text: 'B', completed: false },
          ],
        },
      ];
      const res = buildSyllabusBurndownData(
        cats,
        { startDate: '2026-04-01', goalDate: '2026-04-20' },
        { now: new Date('2026-05-01T15:00:00Z') }
      );
      expect(res.status).toBe('overdue');
      // First point at startDate must start at 0 idealCompleted, NOT jump straight to totalTasks (2)
      expect(res.series[0].idealCompleted).toBeCloseTo(0, 1);
      expect(res.series[res.series.length - 1].idealCompleted).toBeCloseTo(2, 1);
    });

    it('estimateIRTAbility skips 100%-blank entries and honors per-entry custom scale', () => {
      const res = estimateIRTAbility([
        { total: 10, correct: 0, blanks: 10, difficulty: 'medio' }, // 100% blank -> skipped
        { total: 120, correct: 60, score: 0, minScore: -120, maxScore: 120, difficulty: 'medio' }, // 50% on [-120,120]
        { total: 120, correct: 90, score: 60, minScore: -120, maxScore: 120, difficulty: 'dificil' }, // 75% on [-120,120]
      ]);
      expect(res.hasData).toBe(true);
      // 10 blank questions skipped => 240 total items (NOT 250)
      expect(res.totalItems).toBe(240);
      // ICC curve covers theta
      const bs = res.iccCurve.map((p) => p.b);
      expect(Math.min(...bs)).toBeLessThanOrEqual(res.theta);
      expect(Math.max(...bs)).toBeGreaterThanOrEqual(res.theta);
    });

    it('TornadoWhatIfChart excludes P0 (weight 0) and does not coerce empty minCutoff "" into 0 on negative Cebraspe scales', () => {
      const cats = [
        {
          id: 'cat-p0',
          name: 'Excluída P0',
          weight: 0,
          simuladoStats: { history: [{ date: '2026-06-01', total: 10, correct: 5, score: 0 }] },
        },
        {
          id: 'cat-ceb',
          name: 'Cebraspe Real',
          weight: 20,
          minScore: -120,
          maxScore: 120,
          minCutoff: '',
          simuladoStats: { history: [{ date: '2026-06-01', total: 120, correct: 60, score: 0 }] },
        },
      ];
      const { container } = render(
        <TornadoWhatIfChart categories={cats} minScore={-120} maxScore={120} targetScore={60} unit=" pts" />
      );
      expect(container.textContent).not.toContain('Excluída P0');
      expect(container.textContent).toContain('Cebraspe Real');
    });

    it('MetacognitionFatigueChart keeps short <4-question runs in metacognition matrix while excluding them from fatigue quartiles', () => {
      const todayKey = getDateKey(new Date());
      const rows = [
        {
          id: 'r-short',
          date: todayKey,
          subject: 'Português',
          questionTelemetry: [
            { idx: 1, correct: true, confidence: 'certeza', timeSec: 40 },
            { idx: 2, correct: false, confidence: 'certeza', timeSec: 50, errorType: 'atencao' },
          ],
        },
      ];
      const { container } = render(
        <MetacognitionFatigueChart simuladoRows={rows} />
      );
      // Short 2q run still feeds metacognition matrix (not empty state)
      expect(container.textContent).not.toContain('Nenhuma questão marcada com confiança ainda');
      // And renders error anatomy section cleanly
      expect(container.textContent).toContain('Anatomia dos Erros por Disciplina');
    });
  });

  // ==========================================================================
  // 3. ANALYTICS, DASHBOARD, RETENTION, PARETO & ACTIVITY
  // ==========================================================================
  describe('Analytics, Dashboard, Retention, Pareto & Activity', () => {
    it('ParetoAnalysis excludes P0 weight=0, merges accent/case variants, and lowers priority after a new 100% attempt', () => {
      const baseHistory = [
        {
          date: '2026-05-01',
          topics: [{ name: 'Crase', total: 10, correct: 4 }],
        },
      ];
      const improvedHistory = [
        ...baseHistory,
        {
          date: '2026-06-01',
          topics: [{ name: 'cráse', total: 10, correct: 10 }],
        },
      ];

      const { container: cBefore } = render(
        <ParetoAnalysis
          categories={[
            { id: 'c-p0', name: 'Zero Peso', weight: 0, simuladoStats: { history: baseHistory } },
            { id: 'c-1', name: 'Português', weight: 10, simuladoStats: { history: baseHistory } },
          ]}
        />
      );
      expect(cBefore.textContent).not.toContain('Zero Peso');
      const beforeMatch = (cBefore.textContent || '').match(/-(\d+(?:\.\d+)?)\s*pts/i);
      cleanup();

      const { container: cAfter } = render(
        <ParetoAnalysis
          categories={[
            { id: 'c-1', name: 'Português', weight: 10, simuladoStats: { history: improvedHistory } },
          ]}
        />
      );
      // Should be merged into a single topic row (Crase), NOT duplicated as Crase + cráse
      expect((cAfter.textContent || '').match(/cr[aá]se/gi)?.length || 0).toBe(1);
      const afterMatch = (cAfter.textContent || '').match(/-(\d+(?:\.\d+)?)\s*pts/i);
      if (beforeMatch && afterMatch) {
        expect(Number(afterMatch[1])).toBeLessThan(Number(beforeMatch[1]));
      }
    });

    it('reconcileContestCategoriesHistory filters invalid/unvalidated rows and merges same-day history entries', () => {
      const cats = [
        {
          id: 'cat-1',
          name: 'Matemática',
          simuladoStats: {
            history: [
              { date: '2026-06-01', total: 10, correct: 8, score: 80 },
              { date: '2026-06-01', total: 10, correct: 6, score: 60 },
              { date: '2026-06-02', total: 10, correct: 10, score: 100, validated: false },
            ],
          },
        },
      ];
      const out = reconcileContestCategoriesHistory(cats, [], { contestMaxScore: 100, contestMinScore: 0 });
      const hist = out[0].simuladoStats.history;
      expect(hist).toHaveLength(1);
      expect(hist[0].total).toBe(20);
      expect(hist[0].correct).toBe(14);
      expect(hist[0].score).toBeCloseTo(70, 2);
    });

    it('mapRetentionData considers studyLogs recency and contest minScore/maxScore', () => {
      const recentIso = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      const cats = [
        {
          id: 'cat-ret',
          name: 'Direito Civil',
          tasks: [],
          simuladoStats: { history: [] },
        },
      ];
      const logs = [{ categoryId: 'cat-ret', date: recentIso, minutes: 45 }];
      const mapped = mapRetentionData(cats, { studyLogs: logs, minScore: -120, maxScore: 120 });
      expect(mapped).toHaveLength(1);
      expect(mapped[0].retencao).toBeGreaterThan(50);
    });

    it('computeEfficientAllocation falls back to normalized category name when log has stale categoryId', () => {
      const cats = [
        {
          id: 'new-id-port',
          name: 'Português',
          weight: 20,
          simuladoStats: { history: [{ date: '2026-06-01', total: 10, correct: 6, score: 60 }] },
        },
      ];
      const logs = [
        { categoryId: 'deleted-old-id', subject: 'Portugues', date: getDateKey(new Date()), minutes: 120 },
      ];
      const alloc = computeEfficientAllocation(cats, logs, { weeklyBudgetHours: 10 });
      const port = alloc.subjects.find((d) => d.id === 'new-id-port');
      expect(port).toBeTruthy();
      expect(port.currentHours).toBeGreaterThan(0);
    });

    it('isFlashcardDue returns true for ISO timestamp earlier today', () => {
      const todayKey = getDateKey(new Date());
      expect(isFlashcardDue(`${todayKey}T03:00:00Z`)).toBe(true);
    });

    it('DueForecast compact mode computes peak day within visible compact slice (next 7 days)', () => {
      const todayKey = getDateKey(new Date());
      const [y, m, d] = todayKey.split('-').map(Number);
      const dayPlus2 = new Date(Date.UTC(y, m - 1, d + 2)).toISOString().slice(0, 10);
      const dayPlus10 = new Date(Date.UTC(y, m - 1, d + 10)).toISOString().slice(0, 10);
      const decks = [
        {
          id: 'deck-1',
          cards: [
            { id: 'c1', due: dayPlus2 },
            { id: 'c2', due: dayPlus2 },
            { id: 'c3', due: dayPlus10 },
            { id: 'c4', due: dayPlus10 },
            { id: 'c5', due: dayPlus10 },
            { id: 'c6', due: dayPlus10 },
            { id: 'c7', due: dayPlus10 },
          ],
        },
      ];
      const { container } = render(<DueForecast decks={decks} horizon={14} compact />);
      // In compact 7-day mode, total is 2 and peak is 2 (NOT 5 from day+10!)
      expect(container.textContent).not.toContain('5 cartões');
    });
  });

  // ==========================================================================
  // 4. COACH AI & OBSERVABILITY
  // ==========================================================================
  describe('Coach AI & Observability', () => {
    it('evaluateModelHealth populates avgBrier on mature path and never coerces null ece/avgBrier to 0', () => {
      const pairs = Array.from({ length: 12 }, (_, i) => ({
        probability: i % 2 === 0 ? 0.8 : 0.3,
        observed: i % 2 === 0 ? 1 : 0,
      }));
      const mature = evaluateModelHealth({ probabilityPairs: pairs });
      expect(Number.isFinite(mature.metrics.currentCalibration.avgBrier)).toBe(true);
      expect(mature.metrics.currentCalibration.avgBrier).toBeGreaterThan(0);

      const fallbackNull = evaluateModelHealth({
        probabilityPairs: [],
        calibrationEvents: [{ ece: null, avgBrier: null, mce: null }],
      });
      expect(fallbackNull.metrics.currentCalibration.status).toBe('insufficient_data');
      expect(fallbackNull.metrics.currentCalibration.ece).toBeNull();
      expect(fallbackNull.metrics.currentCalibration.avgBrier == null).toBe(true);
    });

    it('runCoachDriftGuard does not coerce pending observed:null events into observed:0 failures', () => {
      const guard = runCoachDriftGuard({
        contestId: 'test-drift-null',
        telemetryEvents: [
          { id: 'e1', probability: 0.9, observed: null, timestamp: Date.now() },
          { id: 'e2', probability: null, observed: 1, timestamp: Date.now() },
        ],
      });
      expect(guard.sampleSize || guard.evaluatedCount || 0).toBe(0);
    });

    it('buildCalibrationSeriesData reads mature brier.recentMean, blocks Global leak when filtered, and dedupes per label across interleaved categories', () => {
      const snapshots = [
        {
          timestamp: '2026-06-01T10:00:00Z',
          metrics: {
            calibrationDrift: { brier: { recentMean: 0.14 } },
            currentCalibration: { ece: 0.05 },
          },
        },
      ];
      const logs = [
        { categoryId: 'cat-a', categoryName: 'A', timestamp: '2026-06-01T10:00:00.000Z', ece: 0.12, brier: 0.2 },
        { categoryId: 'cat-b', categoryName: 'B', timestamp: '2026-06-01T10:00:00.200Z', ece: 0.08, brier: 0.15 },
        // Duplicate of cat-a within 1s, interleaved after cat-b => deduped by per-label map
        { categoryId: 'cat-a', categoryName: 'A', timestamp: '2026-06-01T10:00:00.400Z', ece: 0.02, brier: 0.05 },
      ];
      const globalSeries = buildCalibrationSeriesData([], {}, snapshots, { categoryFilter: 'all' });
      expect(globalSeries).toHaveLength(1);
      expect(globalSeries[0].brier).toBeCloseTo(0.14, 4);

      // Filtered to non-matching category must NOT leak Global snapshot
      const filteredEmpty = buildCalibrationSeriesData([], {}, snapshots, { categoryFilter: 'cat-a' });
      expect(filteredEmpty).toHaveLength(0);

      // Interleaved categories on same day: deduped A (0.12) + B (0.08) => avg 0.10 (NOT (0.12+0.08+0.02)/3 = 0.0733)
      const interleaved = buildCalibrationSeriesData(logs, {}, [], { categoryFilter: 'all' });
      expect(interleaved).toHaveLength(1);
      expect(interleaved[0].ece).toBeCloseTo(0.1, 4);
    });

    it('buildKnowledgeGraphLayout honors score without correct, per-category scale, CEBRASPE penalty, and avoids ghost out-of-graph blockers', () => {
      const cat = {
        id: 'cat-kg',
        name: 'Direito',
        minScore: 0,
        maxScore: 100,
        tasks: Array.from({ length: 14 }, (_, i) => ({
          id: `t-${i}`,
          text: `Topico ${i + 1}`,
          completed: i === 0,
        })),
        simuladoStats: {
          history: [
            {
              date: '2026-06-01',
              topics: [
                { name: 'Topico 1', total: 0, score: 85 },
                { name: 'Topico 2', total: 10, correct: 8, penaltyPerWrong: 1 }, // net = 60%
              ],
            },
          ],
        },
      };
      const layout = buildKnowledgeGraphLayout(cat, {
        prerequisites: [{ from: 'Topico 14', to: 'Topico 1' }],
      });
      const n1 = layout.nodes.find((n) => n.name === 'Topico 1');
      const n2 = layout.nodes.find((n) => n.name === 'Topico 2');
      expect(n1.proficiency).toBeCloseTo(0.85, 2);
      expect(n2.proficiency).toBeCloseTo(0.6, 2);
      // Topico 14 is outside the 12-node slice -> must NOT create a ghost blocker edge
      expect(layout.edges.some((e) => e.from === 'Topico 14')).toBe(false);
    });

    it('trainCausalModel aligns sampleSize with global.sampleSize and estimateUpliftByAction never borrows task controls for mode_* actions', () => {
      const events = [
        // 8 task events (4 treated, 4 control)
        ...Array.from({ length: 4 }, (_, i) => ({
          actionId: 'task_a',
          actionType: 'task',
          treated: 1,
          outcomeDelta: 8 + i * 0.1,
          preScore: 60 + i,
          daysBetween: 7,
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
          actionId: 'task_a',
          actionType: 'task',
          treated: 0,
          outcomeDelta: 2 + i * 0.1,
          preScore: 60 + i,
          daysBetween: 7,
        })),
        // 4 mode_questoes treated events with ZERO mode controls
        ...Array.from({ length: 4 }, (_, i) => ({
          actionId: 'mode_questoes',
          actionType: 'mode',
          treated: 1,
          outcomeDelta: 5,
          preScore: 65 + i,
          daysBetween: 7,
        })),
      ];
      const byAction = estimateUpliftByAction(events, { minActionSamples: 2 });
      const modeAction = byAction.actions?.find?.((a) => a.actionId === 'mode_questoes');
      // Must NOT fabricate a fake uplift by borrowing task_a's control pool
      expect(modeAction).toBeUndefined();

      const model = trainCausalModel(events);
      expect(model.sampleSize).toBe(model.global.sampleSize);
    });

    it('buildCategorySplits rescales global targetScore onto category domain and deduplicates cross-source id/ts rows', () => {
      const cat = {
        id: 'cat-scale',
        name: 'Matemática',
        minScore: 0,
        maxScore: 1000,
        simuladoStats: {
          history: [
            { id: 'h1', date: '2026-04-01', score: 600, total: 10, correct: 6 },
            { id: 'h2', date: '2026-04-08', score: 700, total: 10, correct: 7 },
            { id: 'h3', date: '2026-04-15', score: 750, total: 10, correct: 7.5 },
            { id: 'h4', date: '2026-04-22', score: 790, total: 10, correct: 7.9 },
            { id: 'h5', date: '2026-04-29', score: 850, total: 10, correct: 8.5 },
          ],
        },
      };
      // Duplicate rows in simulados without id (same day/score)
      const simulados = [
        { date: '2026-04-01', subject: 'Matemática', score: 600, total: 10, correct: 6 },
        { date: '2026-04-08', subject: 'Matemática', score: 700, total: 10, correct: 7 },
        { date: '2026-04-15', subject: 'Matemática', score: 750, total: 10, correct: 7.5 },
        { date: '2026-04-22', subject: 'Matemática', score: 790, total: 10, correct: 7.9 },
        { date: '2026-04-29', subject: 'Matemática', score: 850, total: 10, correct: 8.5 },
      ];
      const splits = buildCategorySplits(cat, simulados, {
        targetScore: 80, // global 80 on 0..100 => 800 on 0..1000
        minScore: 0,
        maxScore: 100,
        minTrain: 3,
        horizon: 1,
      });
      // Deduped 5 points with minTrain=3 => 2 rolling splits (not 7 splits from 10 duplicated points)
      expect(splits).toHaveLength(2);
      expect(splits[0].targetScore).toBeCloseTo(800, 2);
      // 790 < 800 rescaled target => false (previously unscaled 80 made 790 >= 80 true!)
      expect(splits[0].observedSuccess).toBe(false);
      // 850 >= 800 => true
      expect(splits[1].observedSuccess).toBe(true);
    });

    it('saveEvaluationResult deduplicates repeated saves with identical strategyId/categoryId/timestamp', () => {
      const contestId = 'test-dedupe-eval';
      clearEvaluationResults(contestId);
      const payload = {
        strategyId: 'balanced',
        categoryId: 'cat-1',
        timestamp: 1700000000000,
        score: 0.75,
        probabilityPairs: [{ predicted: 0.7, actual: 1 }],
      };
      saveEvaluationResult(payload, contestId);
      saveEvaluationResult(payload, contestId);
      const saved = loadEvaluationResults(contestId);
      expect(saved).toHaveLength(1);
      clearEvaluationResults(contestId);
    });

    it('CausalUpliftChart filters null uplifts and handles actions without CI cleanly', () => {
      const { container } = render(
        <CausalUpliftChart
          causalModel={{
            actions: [
              { actionId: 'task_valid', label: 'Revisão Ativa', uplift: 4.5, sampleSize: 12 },
              { actionId: 'task_null', label: 'Nula', uplift: null, sampleSize: 5 },
            ],
          }}
        />
      );
      expect(container.textContent).not.toContain('Nula');
      expect(container.textContent).not.toContain('NaN');
    });
  });
});
