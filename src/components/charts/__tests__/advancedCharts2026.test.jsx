// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import {
  buildSpeedAccuracyData,
  buildSyllabusBurndownData,
  buildCircadianHeatmapData,
  buildConsistencyBoxPlotData,
  buildExamPacingData,
  buildProjectionFanData,
  buildKalmanChartData,
  buildKnowledgeGraphLayout,
  buildCalibrationSeriesData,
} from '../../../utils/advancedChartHelpers';
import { kalmanAbilitySeries } from '../../../engine/probabilistic/stateSpace';
import { SpeedAccuracyChart } from '../EvolutionChart/SpeedAccuracyChart';
import { ConsistencyBoxPlotChart } from '../EvolutionChart/ConsistencyBoxPlotChart';
import { ExamPacingChart } from '../EvolutionChart/ExamPacingChart';
import { ProjectionFanChart } from '../EvolutionChart/ProjectionFanChart';
import { KalmanLatentChart } from '../EvolutionChart/KalmanLatentChart';
import { SyllabusBurndownChart } from '../Analytics/SyllabusBurndownChart';
import { CircadianHeatmapChart } from '../Analytics/CircadianHeatmapChart';
import { CausalUpliftChart } from '../Coach/CausalUpliftChart';
import { KnowledgeGraphChart } from '../Coach/KnowledgeGraphChart';
import { CalibrationDriftChart } from '../Coach/CalibrationDriftChart';
import CoachControlCenter from '../../coach/CoachControlCenter';

const SAMPLE_CATEGORIES = [
  {
    id: 'cat-port',
    name: 'Português',
    color: '#3b82f6',
    weight: 20,
    minCutoff: 65,
    tasks: [
      { id: 't1', text: 'Crase', completed: true, completedAt: '2026-04-01T10:00:00Z' },
      { id: 't2', text: 'Sintaxe', completed: true, completedAt: '2026-04-06T10:00:00Z' },
      { id: 't3', text: 'Semântica', completed: false },
    ],
    simuladoStats: {
      history: [
        { date: '2026-04-01', score: 70, total: 10, correct: 7, timeSpent: 900, timedQuestoes: 10, topics: [{ name: 'Crase', total: 5, correct: 4, timeSpent: 400 }, { name: 'Sintaxe', total: 5, correct: 3, timeSpent: 500 }] },
        { date: '2026-04-05', score: 80, total: 10, correct: 8, timeSpent: 800, timedQuestoes: 10, topics: [{ name: 'Crase', total: 5, correct: 5, timeSpent: 350 }, { name: 'Sintaxe', total: 5, correct: 3, timeSpent: 450 }] },
        { date: '2026-04-09', score: 40, total: 10, correct: 4, timeSpent: 1000, timedQuestoes: 10, topics: [{ name: 'Semântica', total: 10, correct: 4, timeSpent: 1000 }] },
        { date: '2026-04-13', score: 85, total: 10, correct: 8.5, timeSpent: 850, timedQuestoes: 10 },
      ],
    },
  },
  {
    id: 'cat-penal',
    name: 'Direito Penal',
    color: '#ef4444',
    weight: 30,
    tasks: [
      { id: 't4', text: 'Teoria do Crime', completed: true, completedAt: '2026-04-02T14:00:00Z' },
      { id: 't5', text: 'Dolo e Culpa', completed: false },
    ],
    simuladoStats: {
      history: [
        { date: '2026-04-02', score: 50, total: 10, correct: 5, timeSpent: 2200, timedQuestoes: 10 },
        { date: '2026-04-06', score: 55, total: 10, correct: 5.5, timeSpent: 2100, timedQuestoes: 10 },
        { date: '2026-04-10', score: 60, total: 10, correct: 6, timeSpent: 2000, timedQuestoes: 10 },
      ],
    },
  },
];

describe('Advanced Charts Suite (#2, #4, #6, #8, #11, #12, #15, #16)', () => {
  afterEach(() => {
    cleanup();
  });

  it('#2 SpeedAccuracyChart classifies disciplines & topics into quadrants and renders cleanly', () => {
    const subjData = buildSpeedAccuracyData(SAMPLE_CATEGORIES, [], {
      mode: 'subject',
      targetScore: 70,
      idealSecondsPerQuestion: 120,
    });
    expect(subjData.points).toHaveLength(2);
    const penal = subjData.points.find((p) => p.id === 'cat-penal');
    expect(penal.quadrant).toBe('slowInaccurate');

    const topicData = buildSpeedAccuracyData(SAMPLE_CATEGORIES, [], {
      mode: 'topic',
      targetScore: 70,
      idealSecondsPerQuestion: 120,
    });
    expect(topicData.points.length).toBeGreaterThanOrEqual(2);

    const { container, getByText } = render(
      <SpeedAccuracyChart categories={SAMPLE_CATEGORIES} targetScore={70} examDurationMinutes={200} examTotalQuestions={100} />
    );
    expect(container.textContent).toContain('Domínio Rápido');
    fireEvent.click(getByText('Por Assunto'));
    expect(container.textContent).toContain('Por Assunto');
  });

  it('#4 SyllabusBurndownChart computes burnup/burndown pace and toggles views', () => {
    const data = buildSyllabusBurndownData(
      SAMPLE_CATEGORIES,
      { startDate: '2026-04-01', goalDate: '2026-05-15' },
      { now: new Date('2026-04-14T16:00:00Z') }
    );
    expect(data.totalTasks).toBe(5);
    expect(data.completedTasks).toBe(3);
    expect(data.remainingTasks).toBe(2);
    expect(data.series.length).toBeGreaterThan(2);
    expect(data.hasGoalDate).toBe(true);

    const { container, getByText } = render(
      <SyllabusBurndownChart categories={SAMPLE_CATEGORIES} user={{ startDate: '2026-04-01', goalDate: '2026-05-15' }} />
    );
    expect(container.textContent).toContain('Burnup do Edital');
    fireEvent.click(getByText('Burndown'));
    expect(container.textContent).toContain('Burndown do Edital');
  });

  it('#6 CircadianHeatmapChart maps timestamps into weekday×slot grid and skips date-only strings', () => {
    const logs = [
      { createdAt: '2026-04-13T14:30:00Z', minutes: 60 },
      { createdAt: '2026-04-13T15:10:00Z', minutes: 45 },
      { date: '2026-04-12', minutes: 90 }, // date-only should NOT pollute midnight!
    ];
    const sims = [{ createdAt: '2026-04-13T14:45:00Z', total: 10, correct: 9 }];
    const data = buildCircadianHeatmapData(logs, [], sims);
    expect(data.timedLogCount).toBe(2);
    expect(data.untimedLogCount).toBe(1);
    expect(data.timedSimCount).toBe(1);
    expect(data.peakStudyCell.minutes).toBe(105);
    expect(data.peakAccuracyCell.accuracyPct).toBe(90);

    const { container, getByText } = render(
      <CircadianHeatmapChart studyLogs={logs} simuladoRows={sims} />
    );
    expect(container.textContent).toContain('Heatmap Circadiano');
    fireEvent.click(getByText('Taxa de Acerto'));
    expect(container.textContent).toContain('90%');
  });

  it('#8 ConsistencyBoxPlotChart computes exact quartiles, IQR and stability tags', () => {
    const data = buildConsistencyBoxPlotData(SAMPLE_CATEGORIES, { minScore: 0, maxScore: 100 });
    expect(data.rows).toHaveLength(2);
    const port = data.rows.find((r) => r.id === 'cat-port');
    expect(port.min).toBe(40);
    expect(port.max).toBe(85);
    expect(port.median).toBe(75);
    expect(port.stability).toBe('Volátil');

    const { container } = render(
      <ConsistencyBoxPlotChart categories={SAMPLE_CATEGORIES} targetScore={75} minScore={0} maxScore={100} />
    );
    expect(container.textContent).toContain('Português');
    expect(container.textContent).toContain('Direito Penal');
  });

  it('#11 ExamPacingChart projects exam time budget and detects overtime overflow', () => {
    // Português ~88s/q (weight 20 -> 40q => 59m), Penal ~210s/q (weight 30 -> 60q => 210m) => ~269m > 200m!
    const data = buildExamPacingData(SAMPLE_CATEGORIES, {
      examDurationMinutes: 200,
      examTotalQuestions: 100,
    });
    expect(data.hasData).toBe(true);
    expect(data.totalProjectedMinutes).toBeGreaterThan(200);
    expect(data.deltaMinutes).toBeGreaterThan(0);
    expect(data.estimatedUnanswered).toBeGreaterThan(0);

    const { container } = render(
      <ExamPacingChart categories={SAMPLE_CATEGORIES} examDurationMinutes={200} examTotalQuestions={100} />
    );
    expect(container.textContent).toContain('Estouro estimado');
  });

  it('#12 ProjectionFanChart generates P10–P90 future cone with historical cutoff band', () => {
    const fan = buildProjectionFanData(SAMPLE_CATEGORIES[0], [], {
      minScore: 0,
      maxScore: 100,
      targetScore: 80,
      horizonDays: 60,
      historicalCutoffs: [74, 78, 82],
    });
    expect(fan.series.length).toBeGreaterThan(4);
    expect(fan.cutoffBand).toEqual({ min: 74, max: 82, avg: 78, count: 3 });
    const futurePts = fan.series.filter((p) => p.isFuture);
    expect(futurePts.every((p) => p.p10 <= p.p25 && p.p25 <= p.p50 && p.p50 <= p.p75 && p.p75 <= p.p90)).toBe(true);

    const { container } = render(
      <ProjectionFanChart
        focusCategory={SAMPLE_CATEGORIES[0]}
        projectDays={60}
        historicalCutoffs={[74, 78, 82]}
        targetScore={80}
      />
    );
    expect(container.textContent).toContain('Faixa de cortes históricos');
  });

  it('#15 KalmanLatentChart runs causal step-by-step Kalman filter and detects outlier shocks', () => {
    const series = kalmanAbilitySeries(SAMPLE_CATEGORIES[0].simuladoStats.history, { minScore: 0, maxScore: 100 });
    expect(series.points).toHaveLength(4);
    expect(series.summary.sampleSize).toBe(4);
    expect(series.points.every((p) => p.ci95Low <= p.ability && p.ability <= p.ci95High)).toBe(true);

    const helperData = buildKalmanChartData(SAMPLE_CATEGORIES[0], [], { minScore: 0, maxScore: 100 });
    expect(helperData.points).toHaveLength(4);

    const { container } = render(
      <KalmanLatentChart focusCategory={SAMPLE_CATEGORIES[0]} targetScore={80} minScore={0} maxScore={100} />
    );
    expect(container.textContent).toContain('Habilidade Latente');
    expect(container.textContent).toContain('Ruído Filtrado');
  });

  it('#16 Coach Scientific Panel renders CausalUpliftChart, KnowledgeGraphChart, CalibrationDriftChart, and CoachControlCenter science tab', () => {
    const causalModel = {
      actions: {
        srs_review: { uplift: 4.5, sampleSize: 12, method: 'doubly_robust', ci: { low: 2.1, high: 6.9 } },
        simulado: { uplift: 2.8, sampleSize: 18, method: 'iptw', ci: { low: 0.5, high: 5.1 } },
      },
    };
    const { container: c1 } = render(<CausalUpliftChart causalModel={causalModel} />);
    expect(c1.querySelector('[role="img"]')).toBeTruthy();

    const graphLayout = buildKnowledgeGraphLayout(SAMPLE_CATEGORIES[0], { minScore: 0, maxScore: 100 });
    expect(graphLayout.nodes.length).toBeGreaterThanOrEqual(2);
    expect(graphLayout.edges.length).toBeGreaterThanOrEqual(1);
    const { container: c2 } = render(<KnowledgeGraphChart categories={SAMPLE_CATEGORIES} />);
    expect(c2.textContent).toContain('Crase');

    const calib = buildCalibrationSeriesData([
      { timestamp: Date.parse('2026-04-01T12:00:00Z'), avgBrier: 0.24, ece: 0.14, categoryName: 'Português' },
      { timestamp: Date.parse('2026-04-10T12:00:00Z'), avgBrier: 0.16, ece: 0.08, categoryName: 'Português' },
    ]);
    expect(calib).toHaveLength(2);
    const { container: c3 } = render(<CalibrationDriftChart series={calib} />);
    expect(c3.querySelector('[role="img"]')).toBeTruthy();

    // CoachControlCenter exposes the new "Painel Científico" tab
    const { getByText, container: c4 } = render(
      <CoachControlCenter
        categories={SAMPLE_CATEGORIES}
        simulados={[]}
        studyLogs={[]}
        calibrationAuditLog={[
          { timestamp: Date.parse('2026-04-01T12:00:00Z'), avgBrier: 0.22, ece: 0.11, categoryName: 'Português' },
        ]}
      />
    );
    fireEvent.click(getByText('Painel Científico'));
    expect(c4.textContent).toContain('Grafo de Pré-Requisitos e Importância Estrutural');
    expect(c4.textContent).toContain('Ganho Causal por Tipo de Ação');
  });
});
