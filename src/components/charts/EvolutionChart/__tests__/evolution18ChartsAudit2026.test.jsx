// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ChartTooltip } from '../../ChartTooltip';
import { EvolutionHeatmap } from '../../EvolutionHeatmap';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';
import { MonteCarloEvolutionChart } from '../MonteCarloEvolutionChart';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { ConsistencyBoxPlotChart } from '../ConsistencyBoxPlotChart';
import { ProjectionFanChart } from '../ProjectionFanChart';
import { KalmanLatentChart } from '../KalmanLatentChart';
import { TornadoWhatIfChart } from '../TornadoWhatIfChart';
import { CorrelationRegimeChart } from '../CorrelationRegimeChart';
import { IRTPsychometricChart } from '../IRTPsychometricChart';
import { MetacognitionFatigueChart } from '../MetacognitionFatigueChart';
import { ExamPacingChart } from '../ExamPacingChart';
import { extractTopicsTotals } from '../../../../utils/measurement';
import { applyScenarioAdjustments } from '../../../../utils/monteCarloScenario';
import { aggregateHeatmap } from '../../../../utils/heatmapAggregation';
import { computeCategoryStats } from '../../../../engine/stats';
import { kalmanAbilitySeries, kalmanAbilityTrend } from '../../../../engine/probabilistic/stateSpace';
import { estimateIRTAbility, computeGuessingStrategy } from '../../../../engine/adaptive/irtEngine';
import { computeWeeklyCategoryCorrelation } from '../../../../engine/diagnostics';
import {
  buildSpeedAccuracyData,
  buildExamPacingData,
  buildConsistencyBoxPlotData,
  normalizeExamPacingConfig,
} from '../../../../utils/advancedChartHelpers';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) =>
      React.isValidElement(children)
        ? React.cloneElement(children, { width: 800, height: 320 })
        : <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('18 Evolution Charts Deep Audit — 2026 Regression Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:00:00Z'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('#1 Realidade Bruta & ChartTooltip: subtracts Cebraspe blanks from errors and prioritizes active series value', () => {
    const chartData = [
      {
        date: '2026-06-15',
        raw_c1: 50,
        bay_c1: 82,
        raw_correct_c1: 6,
        raw_total_c1: 10,
        raw_blanks_c1: 2,
      },
    ];
    render(
      <ChartTooltip
        active
        label="2026-06-15"
        chartData={chartData}
        targetScore={75}
        unit="%"
        payload={[
          {
            dataKey: 'raw_c1',
            name: 'Direito Penal',
            value: 50,
            color: '#fb923c',
            payload: chartData[0],
          },
        ]}
      />
    );

    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('2 erros')).toBeTruthy();
    expect(screen.getByText(/2 br\./)).toBeTruthy();
    expect(screen.queryByText('4 erros')).toBeNull();
  });

  it('#2 Mapa de Calor: monthly normalization, numeric id=0 focus, and before-noon insight inclusion', () => {
    const agg = aggregateHeatmap(
      {
        dates: [{ key: '2026-06-01', label: '01/06' }, { key: '2026-06-10', label: '10/06' }],
        rows: [
          {
            cat: { id: 0, name: 'Português', color: '#38bdf8' },
            cells: [
              { total: 10, correct: 8, realTotal: 10, realCorrect: 8, pct: 80, isSynthetic: false },
              { total: 20, correct: 12, realTotal: 0, realCorrect: 0, pct: 60, isSynthetic: true },
            ],
          },
        ],
      },
      'monthly'
    );
    expect(agg.dates[0].key).toBe('2026-06');
    expect(agg.rows[0].cells[0].pct).toBeCloseTo(66.67, 1);
    expect(agg.rows[0].cells[0].hasMixedSynthetic).toBe(true);

    render(
      <EvolutionHeatmap
        heatmapData={{
          dates: [{ key: '2026-06-15', label: '15/06', dayName: 'SEG' }],
          rows: [
            {
              cat: { id: 0, name: 'ZeroID Materia', color: '#38bdf8' },
              cells: [{ total: 10, correct: 8, realTotal: 10, realCorrect: 8, pct: 80, isSynthetic: false }],
            },
          ],
        }}
        targetScore={null}
        showOnlyFocus
        focusSubjectId="0"
      />
    );
    expect(screen.getByText('ZeroID Materia')).toBeTruthy();

    const insight = generateEvolutionInsights({
      timeline: [{ date: '2026-06-14', raw_0: 80 }, { date: '2026-06-15', raw_0: 80 }],
      focusCategory: { id: 0, name: 'ZeroID Materia' },
      activeEngine: 'raw_weekly',
      categories: [
        {
          id: 0,
          name: 'ZeroID Materia',
          simuladoStats: {
            history: [
              { date: '2026-06-14', total: 10, correct: 8, score: 80 },
              { date: '2026-06-15', total: 10, correct: 8, score: 80 },
            ],
          },
        },
      ],
    });
    expect(insight.title).toContain('Constância Semanal Uniforme');
  });

  it('#3 Média Histórica: computeCategoryStats honors compTotal synthetic weights', () => {
    const res = computeCategoryStats(
      [
        { score: 50, total: 0, compTotal: 40, date: '2026-06-01' },
        { score: 90, total: 0, compTotal: 20, date: '2026-06-02' },
      ],
      100,
      0
    );
    expect(res.mean).toBeCloseTo(63.33, 1);
  });

  it('#4 Compare & ChartTooltip: renders Projeção MC badge and IC 95% range in compare mode', () => {
    const futureRow = {
      date: '2026-07-15',
      displayDate: '15/07 ✦',
      'Futuro Provável': 84.5,
      'Cenário Range': [76, 92],
      __future: true,
    };
    render(
      <ChartTooltip
        active
        label="2026-07-15"
        chartData={[futureRow]}
        isCompare
        unit="%"
        payload={[
          { dataKey: 'Futuro Provável', name: 'Futuro Provável', value: 84.5, color: '#a78bfa', payload: futureRow },
        ]}
      />
    );
    expect(screen.getByText('Projeção MC')).toBeTruthy();
    expect(screen.getByText(/IC 95%/)).toBeTruthy();
  });

  it('#5 Raio-X de Assuntos: skips invalid topics and avoids domain inversion with custom scales', () => {
    const tf = extractTopicsTotals(
      {
        topics: [
          { name: 'Valido', total: 10, correct: 8 },
          { name: 'Invalido', total: 10, correct: 0, valid: false },
          { name: 'NaoValidado', total: 10, correct: 0, validated: false },
        ],
      },
      100,
      0
    );
    expect(tf.total).toBe(10);
    expect(tf.correct).toBe(8);

    render(
      <SubtopicsPerformanceChart
        categories={[
          {
            id: 0,
            name: 'Discursiva',
            maxScore: 100,
            simuladoStats: {
              history: [
                {
                  date: '2026-06-10',
                  topics: [null, { assunto: 'Redação Oficial', total: 10, correct: 8 }],
                },
              ],
            },
          },
        ]}
        showOnlyFocus
        focusSubjectId="0"
        minScore={200}
        maxScore={1000}
        targetScore={700}
      />
    );
    expect(screen.getByText(/Média dos assuntos/i)).toBeTruthy();
    expect(screen.getByText('80%')).toBeTruthy();
    expect(screen.getByText('62,5%')).toBeTruthy();
  });

  it('#6 Rastreador MC: base scenario is exact identity and 1-day history renders summary instead of empty state', () => {
    const baseOut = applyScenarioAdjustments(
      [{ mean: 70, projectedMean: 85, ciRange: [78, 92], probability: 65 }],
      'base',
      100,
      0
    );
    expect(baseOut[0].ciRange).toEqual([78, 92]);

    const consOut = applyScenarioAdjustments(
      [{ mean: 70, projectedMean: 80, ciRange: [70, 90], probability: 65 }],
      'conservative',
      100,
      0
    );
    const optOut = applyScenarioAdjustments(
      [{ mean: 70, projectedMean: 80, ciRange: [70, 90], probability: 65 }],
      'optimistic',
      100,
      0
    );
    expect(consOut[0].projectedMean).toBeLessThan(optOut[0].projectedMean);
    expect(consOut[0].ciRange[0]).toBeLessThan(optOut[0].ciRange[0]);

    render(
      <MonteCarloEvolutionChart
        data={[
          { date: '2026-06-15', mean: 78, projectedMean: 82, ci95Low: 74, ci95High: 89, probability: 75 },
          { date: '2026-06-14', probability: 60 },
        ]}
        targetScore={80}
        unit="%"
      />
    );
    expect(screen.getByText(/1 dia registrado — aguardando evolução/i)).toBeTruthy();
    expect(screen.queryByText(/Nenhum ponto registrado/i)).toBeNull();
  });

  it('#7 Semanal: avoids Delta deadlock and renders variation bars cleanly', () => {
    const categories = [
      {
        id: 'mat',
        name: 'Matemática',
        color: '#38bdf8',
        simuladoStats: {
          history: [
            { date: '2026-06-01', total: 10, correct: 6, score: 60 },
            { date: '2026-06-08', total: 10, correct: 8, score: 80 },
          ],
        },
      },
    ];
    render(<WeeklyEvolutionView categories={categories} targetScore={75} minScore={0} maxScore={100} unit="%" />);
    fireEvent.click(screen.getByRole('button', { name: /Alternar para visão de variação semanal/i }));
    expect(screen.queryByText(/Semanas consecutivas necessárias/i)).toBeNull();
  });

  it('#8 Hoje vs Geral: ignores total-only entries lacking score/correct and respects explicit categoryId in simuladoRows', () => {
    const focusCat = {
      id: 0,
      name: 'Português',
      simuladoStats: {
        history: [
          { date: '2026-06-15', total: 10, correct: 8, score: 80 },
          { date: '2026-06-14', total: 10 },
        ],
      },
    };
    render(
      <TodayVsGeneralChart
        activeCategories={[focusCat]}
        focusCategory={focusCat}
        targetScore={75}
        minScore={0}
        maxScore={100}
        unit="%"
        simuladoRows={[
          { id: 'other', date: '2026-06-15', categoryId: 99, subject: 'Português', score: 10 },
          { id: 'same', date: '2026-06-15', categoryId: '0', subject: 'Português', score: 80 },
        ]}
      />
    );
    expect(screen.getAllByText(/80\.0%/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/10\.0%/)).toBeNull();
  });

  it('#9 Agilidade AI & #10 Speed × Precisão: real timing insight, pre-focus median, and penalty inheritance', () => {
    const cats = [
      {
        id: 'p1',
        name: 'Português',
        color: '#38bdf8',
        simuladoStats: {
          history: [
            { date: '2026-06-10', total: 10, correct: 8, timeSpent: 600, penaltyPerWrong: 1 },
          ],
        },
      },
      {
        id: 'p2',
        name: 'RLM',
        color: '#a855f7',
        simuladoStats: {
          history: [
            { date: '2026-06-10', total: 10, correct: 9, timeSpent: 1200 },
          ],
        },
      },
    ];
    const speedFocused = buildSpeedAccuracyData(cats, [], {
      mode: 'subject',
      showOnlyFocus: true,
      focusSubjectId: 'p1',
      targetScore: 70,
    });
    expect(speedFocused.benchmarkSeconds).toBe(90);
    expect(speedFocused.points[0].accuracyPct).toBe(60);
    expect(speedFocused.points[0].timedQuestions).toBe(10);

    const timeInsight = generateEvolutionInsights({
      timeline: [{ date: '2026-06-10', raw_p1: 60 }],
      focusCategory: cats[0],
      activeEngine: 'time_spent',
      categories: cats,
      examDurationMinutes: 200,
      examTotalQuestions: 100,
    });
    expect(timeInsight.type).toBe('success');
    expect(timeInsight.text).toContain('90s/q');
  });

  it('#11 Ritmo de Prova: skips zero-weight subjects before pacing avg and handles exact budget cleanly', () => {
    expect(normalizeExamPacingConfig(5, 1)).toEqual({ examDurationMinutes: 15, examTotalQuestions: 5 });
    const cats = [
      {
        id: 'a',
        name: 'Direito Adm',
        weight: 1,
        simuladoStats: { history: [{ date: '2026-06-10', total: 10, correct: 8, timeSpent: 1200 }] },
      },
      {
        id: 'z',
        name: 'Ignorada',
        weight: 0,
        simuladoStats: { history: [{ date: '2026-06-10', total: 10, correct: 8, timeSpent: 6000 }] },
      },
    ];
    const pacing = buildExamPacingData(cats, { examDurationMinutes: 200, examTotalQuestions: 100 });
    expect(pacing.subjects).toHaveLength(1);
    expect(pacing.overallAvgSec).toBe(120);
    expect(pacing.deltaMinutes).toBe(0);

    render(
      <ExamPacingChart
        categories={cats}
        examDurationMinutes={200}
        examTotalQuestions={100}
        showOnlyFocus
        focusCategory={cats[0]}
      />
    );
    expect(screen.getByText(/Tempo projetado no limite exato da prova/i)).toBeTruthy();
    expect(screen.getByText(/O ritmo de prova simula o edital completo/i)).toBeTruthy();
  });

  it('#12 Consistência: computes Tukey outliers, renders sort buttons, and sorts volatileRows by IQR', () => {
    const cats = [
      {
        id: 'c1',
        name: 'Constitucional',
        color: '#38bdf8',
        simuladoStats: {
          history: [
            { date: '2026-05-01', score: 80 },
            { date: '2026-05-05', score: 82 },
            { date: '2026-05-10', score: 81 },
            { date: '2026-05-15', score: 83 },
            { date: '2026-05-20', score: 30 },
          ],
        },
      },
      {
        id: 'c2',
        name: 'Tributário',
        color: '#f43f5e',
        simuladoStats: {
          history: [
            { date: '2026-05-01', score: 20 },
            { date: '2026-05-05', score: 90 },
            { date: '2026-05-10', score: 25 },
            { date: '2026-05-15', score: 88 },
          ],
        },
      },
    ];
    const box = buildConsistencyBoxPlotData(cats, { minScore: 0, maxScore: 100 });
    const constRow = box.rows.find((r) => r.id === 'c1');
    expect(constRow.outliers).toEqual([30]);
    expect(constRow.whiskerMin).toBe(80);

    render(<ConsistencyBoxPlotChart categories={cats} targetScore={80} />);
    expect(screen.getByRole('region', { name: /Box Plot de Consistência/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mais voláteis/i })).toBeTruthy();

    const insight = generateEvolutionInsights({
      timeline: [{ date: '2026-05-20', raw_c1: 30 }],
      focusCategory: cats[0],
      activeEngine: 'consistency_boxplot',
      categories: cats,
    });
    expect(insight.details).toContain('Tributário');
  });

  it('#13 Cone Futuro & #14 Kalman Latente: sanitize null targetScore and keep exact date keys + synced MA(1) trend', () => {
    const timeline = [
      { date: '2026-05-01', global_raw: 5.0, global_bayesian: 5.0 },
      { date: '2026-05-15', global_raw: 5.5, global_bayesian: 5.5 },
      { date: '2026-06-01', global_raw: 6.0, global_bayesian: 6.0 },
    ];
    render(<ProjectionFanChart timeline={timeline} targetScore={null} minScore={0} maxScore={10} unit="pts" />);
    expect(screen.getByText('8 pts')).toBeTruthy();
    expect(screen.getByText(/Não atinge no prazo/i)).toBeTruthy();

    const kalmanObs = [
      { score: 70, date: '2026-06-01' },
      { score: 78, date: '2026-06-05' },
      { score: 73, date: '2026-06-15' },
      { score: 82, date: '2026-06-20' },
    ];
    const series = kalmanAbilitySeries(kalmanObs, { maxScore: 100, minScore: 0 });
    const trend = kalmanAbilityTrend(kalmanObs, { maxScore: 100, minScore: 0 });
    expect(series.points.map((p) => p.date)).toEqual(['2026-06-01', '2026-06-05', '2026-06-15', '2026-06-20']);
    expect(series.summary.observationSd).toBeCloseTo(Math.sqrt(trend.observationVariance), 1);
    expect(series.summary.ability).toBeCloseTo(trend.ability, 1);

    render(<KalmanLatentChart timeline={timeline} targetScore={9} minScore={0} maxScore={10} unit="pts" />);
    expect(screen.getAllByText(/Habilidade real \(Kalman\)/i).length).toBeGreaterThan(0);
  });

  it('#15 Tornado & #16 Correlação/Regimes: fractional weights, topics fallback, and <3 weeks hint', () => {
    const cats = [
      {
        id: 't1',
        name: 'Mat A',
        weight: 0.2,
        simuladoStats: {
          history: [
            { date: '2026-06-01', topics: [{ name: 'Sub', total: 10, correct: 7 }] },
            { date: '2026-06-08', topics: [{ name: 'Sub', total: 10, correct: 8 }] },
          ],
        },
      },
      {
        id: 't2',
        name: 'Mat B',
        weight: 0.8,
        simuladoStats: {
          history: [
            { date: '2026-06-01', score: 60 },
            { date: '2026-06-08', score: 70 },
          ],
        },
      },
    ];
    render(<TornadoWhatIfChart categories={cats} showOnlyFocus focusCategory={cats[0]} targetScore={75} />);
    expect(screen.getByText(/Simulação sempre considera o concurso completo/i)).toBeTruthy();

    const corr = computeWeeklyCategoryCorrelation(cats, 100, 0);
    expect(corr.categories).toHaveLength(2);
    expect(corr.pairs).toHaveLength(0);

    render(<CorrelationRegimeChart categories={cats} />);
    expect(screen.getByText(/Ainda não há pares com ≥ 3 semanas em comum/i)).toBeTruthy();
  });

  it('#17 TRI & Chute & #18 Metacognição/Fadiga: accent-normalized confidence, targetTheta curve, and moderate fatigue tier', () => {
    const irt = estimateIRTAbility(
      [
        { score: 90, difficulty: 'facil', date: '2026-06-01' },
        { score: 85, difficulty: 'medio', date: '2026-06-05' },
        { score: 75, difficulty: 'dificil', date: '2026-06-10' },
      ],
      { minScore: 0, maxScore: 100, targetTheta: 2.5 }
    );
    const maxCurveB = Math.max(...irt.iccCurve.map((p) => p.b));
    expect(maxCurveB).toBeGreaterThanOrEqual(2.5);

    const guess = computeGuessingStrategy(
      [
        { confidence: 'Certeza', correct: true },
        { confidence: 'Dúvida', correct: true },
        { confidence: 'CHUTE', correct: false },
      ],
      { penaltyPerWrong: 1 }
    );
    expect(guess.hasData).toBe(true);
    expect(guess.levels.find((l) => l.key === 'certeza').total).toBe(1);
    expect(guess.levels.find((l) => l.key === 'duvida').total).toBe(1);
    expect(guess.levels.find((l) => l.key === 'chute').total).toBe(1);

    render(
      <IRTPsychometricChart
        categories={[]}
        simuladoRows={[
          { id: 'r1', date: '2026-06-10', score: 80, difficulty: 'medio', questionTelemetry: [{ confidence: 'Dúvida', correct: true }] },
        ]}
        targetScore={80}
      />
    );
    expect(screen.getByText(/Curva Característica TRI/i)).toBeTruthy();

    render(
      <MetacognitionFatigueChart
        targetScore={null}
        simuladoRows={[
          {
            id: 'm1',
            date: '2026-06-10',
            subject: 'Direito Penal',
            questionTelemetry: [
              { confidence: 'Certeza', correct: true, timeSec: 40 },
              { confidence: 'Dúvida', correct: true, timeSec: 50 },
              { confidence: 'Certeza', correct: true, timeSec: 55 },
              ...Array.from({ length: 11 }, () => ({ confidence: 'Certeza', correct: true, timeSec: 40 })),
              ...Array.from({ length: 11 }, () => ({ confidence: 'Certeza', correct: true, timeSec: 45 })),
              ...Array.from({ length: 11 }, () => ({ confidence: 'Certeza', correct: true, timeSec: 50 })),
              ...Array.from({ length: 11 }, () => ({ confidence: 'Certeza', correct: true, timeSec: 60 })),
              { confidence: 'Certeza', correct: false, timeSec: 70 },
            ],
          },
        ]}
      />
    );
    expect(screen.getByText(/Queda moderada: -8pp/i)).toBeTruthy();
    expect(screen.getByText(/Meta: 80%/i)).toBeTruthy();
  });
});
