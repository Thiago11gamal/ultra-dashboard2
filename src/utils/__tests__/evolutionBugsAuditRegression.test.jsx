import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import Evolution from '../../pages/Evolution';
import EvolutionChart from '../../components/EvolutionChart';
import { useChartData } from '../../hooks/useChartData';
import { computeEvolutionStatuses } from '../evolutionStatus';
import { generateEvolutionInsights } from '../../engine/insightGenerator';
import { buildProjectionFanData } from '../advancedChartHelpers';
import { RadarAnalysis } from '../../components/charts/EvolutionChart/RadarAnalysis';
import { ExamPacingChart } from '../../components/charts/EvolutionChart/ExamPacingChart';
import { IRTPsychometricChart } from '../../components/charts/EvolutionChart/IRTPsychometricChart';
import { TornadoWhatIfChart } from '../../components/charts/EvolutionChart/TornadoWhatIfChart';
import { WeeklyEvolutionView } from '../../components/charts/EvolutionChart/WeeklyEvolutionView';
import { CriticalTopicsAnalysis } from '../../components/charts/EvolutionChart/CriticalTopicsAnalysis';
import { MetacognitionFatigueChart } from '../../components/charts/EvolutionChart/MetacognitionFatigueChart';
import { TodayVsGeneralChart } from '../../components/charts/EvolutionChart/TodayVsGeneralChart';
import { SubtopicsPerformanceChart } from '../../components/charts/EvolutionChart/SubtopicsPerformanceChart';
import { getDateKey } from '../dateHelper';
import { parseNoonLocal, addDaysNoon } from '../parseNoonLocal';

const daysAgoKey = (daysAgo) => {
  const todayKey = getDateKey(new Date());
  const todayNoon = parseNoonLocal(todayKey) || new Date();
  return getDateKey(addDaysNoon(todayNoon, -daysAgo));
};

function HookHarness({ categories, weights, maxScore, minScore, onResult }) {
  const res = useChartData(categories, weights, maxScore, minScore);
  onResult(res);
  return null;
}

describe('Evolution Menu Full Bug Audit Regression Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAppStore.getState().resetStore();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('Bug #1: Evolution page & evolutionStatus do not misconvert legitimate Cebraspe (-120..120) or 0..200 targetScore/level as legacy percentage', () => {
    const today = daysAgoKey(1);
    useAppStore.setState((state) => ({
      appState: {
        ...state.appState,
        activeId: 'cebraspe',
        contests: {
          cebraspe: {
            ...state.appState.contests.default,
            contestName: 'PF Cebraspe',
            minScore: -120,
            maxScore: 120,
            unit: 'pts',
            user: { targetScore: 60 },
            categories: [
              {
                id: 'dir',
                name: 'Direito',
                color: '#3b82f6',
                tasks: [],
                simuladoStats: {
                  history: [{ id: 'h1', date: today, score: 70, total: 120, correct: 95 }],
                  average: 70,
                },
                bayesianStats: { mean: 70 },
              },
            ],
            simuladoRows: [],
            studyLogs: [],
            monteCarloHistory: [],
          },
        },
      },
    }));

    const { container } = render(
      <MemoryRouter>
        <Evolution />
      </MemoryRouter>
    );

    // 60 pts must remain 60pts (NOT corrupted to -120 + 0.6*240 = 24pts)
    expect(container.textContent).toContain('60pts');
    expect(container.textContent).not.toContain('24pts');

    // evolutionStatus fallback must keep 70 pts as 70 pts (above target 60 pts), not convert to 48 pts
    const statuses = computeEvolutionStatuses({
      timeline: [],
      filteredChartData: [],
      categories: [
        {
          id: 'dir',
          name: 'Direito',
          minScore: -120,
          maxScore: 120,
          simuladoStats: { history: [{ date: today, score: 70 }], average: 70 },
          bayesianStats: { mean: 70 },
        },
      ],
      focusCategory: null,
      targetScore: 60,
      minScore: -120,
      maxScore: 120,
      unit: 'pts',
    });
    const subjStatus = statuses.find((s) => s.id === 'subjects');
    expect(subjStatus?.value).toBe('0/1');
  });

  it('Bug #2: syntheticVolume percentage-only entries never leak as 20 real questions in timeline, Volume 7d, TodayVsGeneral, Subtopics, or burnout alerts', () => {
    const d1 = daysAgoKey(2);
    const d2 = daysAgoKey(1);
    const d3 = daysAgoKey(0);
    const synthHistory = [
      { id: 's1', date: d1, score: 80, total: 20, correct: 16, syntheticVolume: true, topic: 'Crase' },
      { id: 's2', date: d2, score: 75, total: 20, correct: 15, syntheticVolume: true, topic: 'Crase' },
      { id: 's3', date: d3, score: 50, total: 20, correct: 10, syntheticVolume: true, topic: 'Crase' },
    ];
    const categories = [
      { id: 'port', name: 'Português', color: '#3b82f6', tasks: [], simuladoStats: { history: synthHistory } },
    ];

    let chartResult = null;
    render(<HookHarness categories={categories} maxScore={100} minScore={0} onResult={(r) => { chartResult = r; }} />);

    expect(chartResult.timeline).toHaveLength(3);
    expect(chartResult.timeline[0].global_total).toBe(0);
    expect(chartResult.timeline[0].raw_total_port).toBe(0);
    expect(chartResult.timeline[0].raw_port).toBeCloseTo(80, 1);

    const statuses = computeEvolutionStatuses({
      timeline: chartResult.timeline,
      filteredChartData: chartResult.timeline,
      categories,
      focusCategory: categories[0],
      targetScore: 80,
      minScore: 0,
      maxScore: 100,
    });
    expect(statuses.find((s) => s.id === 'volume')?.value).toBe('0 q');

    // Burnout detector (> 40q in 7d) must NOT trigger from 3 synthetic 20q entries
    const burnoutCheck = generateEvolutionInsights({
      timeline: [
        { date: d1, raw_port: 80, bay_port: 78 },
        { date: d3, raw_port: 50, bay_port: 75 },
      ],
      filteredChartData: [
        { date: d1, raw_port: 80, bay_port: 78 },
        { date: d3, raw_port: 50, bay_port: 75 },
      ],
      focusCategory: categories[0],
      activeEngine: 'raw',
      categories,
      unit: '%',
    });
    expect(burnoutCheck.title).not.toContain('Burnout');

    // SubtopicsPerformanceChart should mark topic as synthetic (realTotal = 0), not 60 real questions
    const { container: subContainer } = render(
      <SubtopicsPerformanceChart categories={categories} focusSubjectId="port" showOnlyFocus={true} />
    );
    expect(subContainer.textContent).not.toContain('60q');

    // TodayVsGeneralChart renders cleanly without counting synthetic 20q as real volume
    expect(() => render(
      <TodayVsGeneralChart activeCategories={categories} focusCategory={categories[0]} globalMetrics={{ globalAccuracy: 68.3 }} />
    )).not.toThrow();
  });

  it('Bug #3: hydrateCategoriesWithSimuladoRows does not apply Cebraspe penalty to unpenalized same-day simulado or merge synthetic 20q into real volume', () => {
    const today = daysAgoKey(0);
    const categories = [
      { id: 'mat', name: 'Matemática', color: '#3b82f6', tasks: [], simuladoStats: { history: [] } },
    ];
    // Same day: 10q normal (8/10 = 80%) + 10q penalized (8/10, 2 wrong, penalty 1 => net 6/10 = 60%) + 1 percent-only row (80%)
    // Real questions MUST remain 20 (NOT 40!), and unpenalized row must NOT get penalized to 60%!
    const simuladoRows = [
      { id: 'r1', categoryId: 'mat', subject: 'Matemática', date: today, total: 10, correct: 8, penaltyPerWrong: 0 },
      { id: 'r2', categoryId: 'mat', subject: 'Matemática', date: today, total: 10, correct: 8, penaltyPerWrong: 1 },
      { id: 'r3', categoryId: 'mat', subject: 'Matemática', date: today, total: 0, score: 80, isPercentage: true },
    ];

    const { container } = render(
      <MemoryRouter>
        <EvolutionChart
          categories={categories}
          simuladoRows={simuladoRows}
          studyLogs={[]}
          targetScore={80}
          minScore={0}
          maxScore={100}
          unit="%"
        />
      </MemoryRouter>
    );

    // KPI Questões should show 20, NOT 40 (synthetic 20q must not leak into real total)
    const kpiText = container.textContent;
    expect(kpiText).toContain('20');
    expect(kpiText).not.toContain('40Questões');
    // Effective score for mixed day: (8 + 6 + 16) / (10 + 10 + 20) = 30 / 40 = 75.0%
    // (Old buggy max-penalty calculation would apply penalty=1 to all 20 real Q -> 12/20 = 60%)
    expect(kpiText).toContain('75.0%');
  });

  it('Bug #4: IRT psychometric chart & insight do not double-count same-day simuladoRows against aggregated history', () => {
    const d1 = daysAgoKey(2);
    const categories = [
      {
        id: 'dir',
        name: 'Direito',
        simuladoStats: {
          history: [
            { date: d1, total: 20, correct: 16, score: 80, difficulty: 'dificil' },
          ],
        },
      },
    ];
    const simuladoRows = [
      { id: 'r1', categoryId: 'dir', subject: 'Direito', date: d1, total: 10, correct: 8, score: 80 },
      { id: 'r2', categoryId: 'dir', subject: 'Direito', date: d1, total: 10, correct: 8, score: 80 },
    ];

    const { container } = render(
      <IRTPsychometricChart
        categories={categories}
        simuladoRows={simuladoRows}
        focusCategory={categories[0]}
        showOnlyFocus={false}
      />
    );

    // Must count 2 simulados (fromRows), NOT 3 (fromRows + aggregated history)
    expect(container.textContent).toContain('2 simulados');
    expect(container.textContent).not.toContain('3 simulados');
  });

  it('Bug #5: Save feedback stays visible when saving changed config in ExamPacingChart, IRTPsychometricChart, and TornadoWhatIfChart', () => {
    // 5a: ExamPacingChart
    function PacingHost() {
      const [cfg, setCfg] = React.useState({ dur: 240, q: 100 });
      useAppStore.setState({
        patchData: (fn) => {
          const patch = fn();
          setCfg({ dur: patch.examDurationMinutes, q: patch.examTotalQuestions });
        },
      });
      return <ExamPacingChart categories={[]} examDurationMinutes={cfg.dur} examTotalQuestions={cfg.q} />;
    }
    const { unmount: u1 } = render(<PacingHost />);
    const durInput = screen.getByLabelText(/Duração/i);
    fireEvent.change(durInput, { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar no concurso/i }));
    expect(screen.getByText(/Salvo no concurso!/i)).toBeTruthy();
    u1();

    // 5b: IRTPsychometricChart
    function IrtHost() {
      const [cfg, setCfg] = React.useState({ board: 'PADRAO', penalty: 0 });
      useAppStore.setState({
        patchData: (fn) => {
          const patch = fn();
          setCfg({ board: patch.examBoard, penalty: patch.penaltyPerWrong });
        },
      });
      return <IRTPsychometricChart categories={[]} simuladoRows={[]} examBoard={cfg.board} penaltyPerWrong={cfg.penalty} />;
    }
    const { unmount: u2 } = render(<IrtHost />);
    fireEvent.click(screen.getByRole('button', { name: /CEBRASPE/i }));
    fireEvent.click(screen.getByRole('button', { name: /Salvar banca/i }));
    expect(screen.getByText(/Salvo!/i)).toBeTruthy();
    u2();

    // 5c: TornadoWhatIfChart
    const d1 = daysAgoKey(1);
    const cats = [{ id: 'c1', name: 'Português', examGroup: 'basicos', simuladoStats: { history: [{ date: d1, score: 80, total: 10, correct: 8 }] } }];
    function TornadoHost() {
      const [cutoffs, setCutoffs] = React.useState({});
      return <TornadoWhatIfChart categories={cats} examGroupCutoffs={cutoffs} onSaveGroupCutoffs={setCutoffs} />;
    }
    const { unmount: u3 } = render(<TornadoHost />);
    const basicosInput = screen.getByLabelText(/Básicos/i);
    fireEvent.change(basicosInput, { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar cortes/i }));
    expect(screen.getByText(/Cortes salvos!/i)).toBeTruthy();
    u3();
  });

  it('Bug #6: filterHasData respects showOnlyFocus so inactive focused subject in 30d window does not show bogus -80pp meta KPI', () => {
    const recent = daysAgoKey(2);
    const old = daysAgoKey(60);
    const categories = [
      { id: 'catA', name: 'Português', color: '#3b82f6', tasks: [], simuladoStats: { history: [{ id: 'a1', date: recent, score: 85, total: 20, correct: 17 }] } },
      { id: 'catB', name: 'Penal', color: '#ef4444', tasks: [], simuladoStats: { history: [{ id: 'b1', date: old, score: 75, total: 20, correct: 15 }] } },
    ];

    const { container } = render(
      <MemoryRouter>
        <EvolutionChart categories={categories} studyLogs={[]} targetScore={80} minScore={0} maxScore={100} unit="%" />
      </MemoryRouter>
    );

    // Switch to 30d, select Penal, enable Apenas Foco
    fireEvent.click(screen.getByRole('button', { name: '30d' }));
    fireEvent.change(screen.getByLabelText(/Selecionar disciplina em foco/i), { target: { value: 'catB' } });
    fireEvent.click(screen.getByRole('button', { name: /Alternar para ver apenas matéria em foco/i }));

    // Must NOT show bogus "-80pp meta" on a 0-activity period for Penal
    expect(container.textContent).not.toContain('-80pp meta');
    expect(container.textContent).toContain('Nenhuma atividade no período selecionado');
  });

  it('Bug #7: buildProjectionFanData respects timeWindow & global view when focusCategory is null', () => {
    const old = daysAgoKey(90);
    const recent = daysAgoKey(3);
    const cat = {
      id: 'c1',
      name: 'Português',
      simuladoStats: {
        history: [
          { date: old, score: 40, total: 20, correct: 8 },
          { date: recent, score: 90, total: 20, correct: 18 },
        ],
      },
    };
    const fan30 = buildProjectionFanData(cat, [], { timeWindow: '30', minScore: 0, maxScore: 100 });
    expect(fan30.summary?.currentLevel).toBeCloseTo(90, 1);

    const globalFan = buildProjectionFanData(null, [
      { date: daysAgoKey(5), global_bayesian: 72, global_total: 20 },
      { date: recent, global_bayesian: 78, global_total: 20 },
    ], { timeWindow: '30', minScore: 0, maxScore: 100 });
    expect(globalFan.series.length).toBeGreaterThan(2);
  });

  it('Bug #8: RadarAnalysis BenchmarkStrip does not treat valid score 0 as safeMin (-120) on Cebraspe scale', () => {
    const radarData = [
      { subject: 'Port', fullSubject: 'Português', nivel: 0, meta: 60 },
      { subject: 'Dir', fullSubject: 'Direito', nivel: 60, meta: 60 },
      { subject: 'Inf', fullSubject: 'Informática', nivel: 60, meta: 60 },
    ];
    const { container } = render(
      <RadarAnalysis radarData={radarData} minScore={-120} maxScore={120} unit="pts" />
    );
    // Average of (0, 60, 60) = 40pts — NOT (-120 + 60 + 60) / 3 = 0pts!
    expect(container.textContent).toContain('40pts');
  });

  it('Bug #9 & #10: WeeklyEvolutionView renders 7d study logs when chartData is empty, and inherits parent penaltyPerWrong onto topics', () => {
    const today = daysAgoKey(0);
    // Bug #9: study logs exist in last 7d, no simulados in timeWindow -> Desempenho (7d) must still render
    const { container: c1, unmount } = render(
      <WeeklyEvolutionView
        categories={[{ id: 'c1', name: 'Direito', tasks: [], simuladoStats: { history: [] } }]}
        studyLogs={[{ date: today, minutes: 90, categoryId: 'c1' }]}
        timeWindow="30"
      />
    );
    expect(c1.textContent).toContain('Desempenho: Últimos 7 Dias');
    unmount();

    // Bug #10: parent penaltyPerWrong: 1 on Cebraspe must be inherited by child topics in showOnlyFocus mode
    const cats = [
      {
        id: 'c1',
        name: 'Direito',
        tasks: [],
        simuladoStats: {
          history: [
            {
              date: today,
              total: 10,
              correct: 7,
              penaltyPerWrong: 1,
              topics: [{ name: 'Atos', total: 10, correct: 7 }], // net = 7 - 3 = 4 => 40%, NOT 70%!
            },
          ],
        },
      },
    ];
    const { container: c2 } = render(
      <WeeklyEvolutionView categories={cats} studyLogs={[]} showOnlyFocus={true} focusSubjectId="c1" />
    );
    fireEvent.click(screen.getByRole('button', { name: /evolução semanal/i }));
    expect(c2.textContent).toContain('40%');
    expect(c2.textContent).not.toContain('70%');
  });

  it('Bug #11: CriticalTopicsAnalysis includes percentage-only topic entries in Matérias Críticas (pointLeakageData)', () => {
    const today = daysAgoKey(1);
    const categories = [
      {
        id: 'c1',
        name: 'Direito Constitucional',
        simuladoStats: {
          history: [
            {
              date: today,
              total: 0,
              topics: [{ name: 'Controle', total: 0, score: 40 }],
            },
          ],
        },
      },
    ];

    const { container } = render(
      <CriticalTopicsAnalysis categories={categories} maxScore={100} minScore={0} targetScore={80} />
    );
    expect(container.textContent).toContain('Assuntos Críticos');
    expect(container.textContent).toContain('Matérias Críticas');
    // Must not show the empty state for pointLeakageData
    expect(container.textContent).not.toContain('Nenhuma matéria com déficit');
  });

  it('Bug #12: insightGenerator respects empty timeWindow, filters raw volatility by timeWindow, and avoids false minCutoff on negative Cebraspe scale', () => {
    const old = daysAgoKey(90);
    const recent = daysAgoKey(2);
    const cat = {
      id: 'c1',
      name: 'Português',
      simuladoStats: {
        history: [
          { date: old, score: 20, total: 10, correct: 2 },
          { date: recent, score: 80, total: 10, correct: 8 },
          { date: daysAgoKey(1), score: 82, total: 10, correct: 8 },
        ],
      },
    };

    // Empty filteredChartData with explicit 30d window must NOT fall back to all-time timeline
    const emptyWin = generateEvolutionInsights({
      timeline: [{ date: old, raw_c1: 20, bay_c1: 20 }],
      filteredChartData: [],
      focusCategory: cat,
      activeEngine: 'bayesian',
      categories: [cat],
      timeWindow: '30',
    });
    expect(emptyWin.title).toContain('Nenhuma atividade no período');

    // Raw volatility with 30d window must ignore the 90-day-old 20% score (swing = 2%, solid consistency)
    const rawWin = generateEvolutionInsights({
      timeline: [{ date: recent, raw_c1: 82, bay_c1: 81 }],
      filteredChartData: [{ date: recent, raw_c1: 82, bay_c1: 81 }],
      focusCategory: cat,
      activeEngine: 'raw',
      categories: [cat],
      timeWindow: '30',
    });
    expect(rawWin.title).toContain('Consistência Sólida');

    // Tornado insight on Cebraspe (-120..120) with NO minCutoff must NOT claim disciplines have cutoffs configured
    const tornadoInsight = generateEvolutionInsights({
      timeline: [{ date: recent, raw_c1: 80, bay_c1: 80 }],
      filteredChartData: [{ date: recent, raw_c1: 80, bay_c1: 80 }],
      focusCategory: cat,
      activeEngine: 'tornado_whatif',
      categories: [{ id: 'c1', name: 'Português', minCutoff: null }],
      minScore: -120,
      maxScore: 120,
    });
    expect(tornadoInsight.details).toContain('Configure cortes mínimos');
    expect(tornadoInsight.details).not.toContain('possuem corte mínimo configurado');
  });

  it('Bug #13: MetacognitionFatigueChart preserves full-exam quartile position when showOnlyFocus filters a mixed batchId exam', () => {
    const today = daysAgoKey(0);
    // 8-question mixed exam: Q0..Q5 in CatA, Q6..Q7 (the 4th quarter!) in CatB
    const rows = [
      {
        id: 'b-a',
        batchId: 'mixed-1',
        categoryId: 'catA',
        subject: 'Português',
        date: today,
        questionTelemetry: [0, 1, 2, 3, 4, 5].map((i) => ({ questionIndex: i, correct: true, wasAnswered: true, timeSec: 60 })),
      },
      {
        id: 'b-b',
        batchId: 'mixed-1',
        categoryId: 'catB',
        subject: 'Direito',
        date: today,
        questionTelemetry: [6, 7].map((i) => ({ questionIndex: i, correct: false, wasAnswered: true, timeSec: 90 })),
      },
    ];

    // If CatB were isolated BEFORE batch grouping, totalInRun would be 2 (< 4) and fatigue curve wouldn't render at all!
    // With full-exam grouping first, Q6..Q7 sit in the 4th quarter of the 8-question exam and render the fatigue section.
    const { container } = render(
      <MetacognitionFatigueChart
        simuladoRows={rows}
        focusCategory={{ id: 'catB', name: 'Direito' }}
        showOnlyFocus={true}
      />
    );
    expect(container.textContent).toContain('Curva de Fadiga Intraprova');
  });
});
