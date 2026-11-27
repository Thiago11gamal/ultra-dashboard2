// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EvolutionChart from '../../../EvolutionChart';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import { IRTPsychometricChart } from '../IRTPsychometricChart';
import { MetacognitionFatigueChart } from '../MetacognitionFatigueChart';
import { TimeSpentChart } from '../TimeSpentChart';
import { PerformanceBarChart } from '../PerformanceBarChart';
import { CorrelationRegimeChart } from '../CorrelationRegimeChart';
import { CriticalTopicsAnalysis } from '../CriticalTopicsAnalysis';
import { SubtopicsPerformanceChart } from '../SubtopicsPerformanceChart';
import { WeeklyEvolutionView } from '../WeeklyEvolutionView';
import { TornadoWhatIfChart } from '../TornadoWhatIfChart';
import { useChartData } from '../../../../hooks/useChartData';
import { useEvolutionMC } from '../../../../hooks/useEvolutionMC';
import { computeEvolutionStatuses } from '../../../../utils/evolutionStatus';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';
import {
  computeStudyEfficiency,
  computeWeeklyCategoryCorrelation,
  buildRegimeMapData,
} from '../../../../engine/diagnostics';
import { runTornadoSensitivity } from '../../../../engine/monteCarlo';
import { buildSpeedAccuracyData } from '../../../../utils/advancedChartHelpers';
import { useAppStore } from '../../../../store/useAppStore';

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

describe('Evolution Menu Deep Bug Hunt (2026) — Regression Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T14:00:00Z'));
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('1. TodayVsGeneralChart: ignora notas manuais do Caderno de Erros (manual-error-notebook) e reconhece r.disciplina', () => {
    const focusCat = {
      id: 'c_port',
      name: 'Língua Portuguesa',
      simuladoStats: {
        history: [
          { date: '2026-09-19', total: 10, correct: 8, score: 80, createdAt: '2026-09-19T10:00:00Z' },
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
          {
            id: 'real-row',
            date: '2026-09-20',
            createdAt: '2026-09-20T09:00:00Z',
            disciplina: 'Portugues',
            total: 10,
            correct: 9,
            score: 90,
            validated: true,
          },
          {
            id: 'manual-err',
            date: '2026-09-20',
            createdAt: '2026-09-20T12:00:00Z',
            categoryId: 'c_port',
            subject: 'Língua Portuguesa',
            total: 1,
            correct: 0,
            score: 0,
            validated: true,
            source: 'manual-error-notebook',
          },
        ]}
      />
    );

    expect(screen.getAllByText(/90\.0%/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^0\.0%$/)).toBeNull();
  });

  it('2. IRTPsychometricChart & insightGenerator (irt_psychometric): não contaminam θ com Caderno de Erros', () => {
    const rows = [
      {
        id: 'sim-1',
        date: '2026-09-18',
        disciplina: 'Direito Constitucional',
        difficulty: 'dificil',
        total: 20,
        correct: 18,
        score: 90,
        validated: true,
        questionTelemetry: [
          { confidence: 'certeza', correct: true, wasAnswered: true },
          { confidence: 'certeza', correct: true, wasAnswered: true },
          { confidence: 'duvida', correct: true, wasAnswered: true },
        ],
      },
      ...Array.from({ length: 15 }, (_, idx) => ({
        id: `err-note-${idx}`,
        date: '2026-09-20',
        disciplina: 'Direito Constitucional',
        difficulty: 'facil',
        total: 1,
        correct: 0,
        score: 0,
        validated: true,
        source: 'manual-error-notebook',
        questionTelemetry: [{ confidence: 'certeza', correct: false, wasAnswered: true }],
      })),
    ];

    const focusCat = { id: 'c_const', name: 'Direito Constitucional', simuladoStats: { history: [] } };
    render(
      <IRTPsychometricChart
        categories={[focusCat]}
        simuladoRows={rows}
        focusCategory={focusCat}
        showOnlyFocus
        targetScore={80}
      />
    );

    expect(screen.getByText('Alto domínio')).toBeTruthy();

    const insight = generateEvolutionInsights({
      timeline: [{ date: '2026-09-18', bay_c_const: 90 }],
      focusCategory: focusCat,
      showOnlyFocus: true,
      activeEngine: 'irt_psychometric',
      categories: [focusCat],
      simuladoRows: rows,
    });
    expect(insight.type).toBe('success');
    expect(insight.title).not.toContain('Incoerência');
  });

  it('3. MetacognitionFatigueChart & insightGenerator (metacognition_fatigue): ignoram manual-error-notebook e leem r.disciplina', () => {
    const focusCat = { id: 'c_penal', name: 'Direito Penal' };
    const onlyErrorNotes = [
      {
        id: 'note-1',
        date: '2026-09-20',
        disciplina: 'Direito Penal',
        source: 'manual-error-notebook',
        validated: true,
        questionTelemetry: [{ confidence: 'certeza', correct: false, wasAnswered: true, errorType: 'teoria' }],
      },
    ];

    render(<MetacognitionFatigueChart simuladoRows={onlyErrorNotes} focusCategory={focusCat} showOnlyFocus />);
    expect(screen.getByText(/Telemetria por questão aguardando seu próximo Simulado IA/i)).toBeTruthy();

    const insight = generateEvolutionInsights({
      timeline: [{ date: '2026-09-20', raw_c_penal: 70 }],
      focusCategory: focusCat,
      showOnlyFocus: true,
      activeEngine: 'metacognition_fatigue',
      categories: [focusCat],
      simuladoRows: onlyErrorNotes,
    });
    expect(insight.type).toBe('info');
    expect(insight.text).toContain('Telemetria aguardando');
  });

  it('4. insightGenerator (time_spent) & TimeSpentChart: leem timeSpent por tópico e ignoram simulados invalidados', () => {
    const cat = {
      id: 'c_adm',
      name: 'Direito Administrativo',
      simuladoStats: {
        history: [
          {
            date: '2026-09-19',
            validated: true,
            topics: [
              { name: 'Atos', total: 5, correct: 4, timeSpent: 300 },
              { name: 'Licitações', total: 5, correct: 4, timeSpent: 300 },
            ],
          },
          {
            date: '2026-09-20',
            total: 10,
            correct: 1,
            timeSpent: 5000,
            valid: false,
          },
        ],
      },
    };

    const insight = generateEvolutionInsights({
      timeline: [{ date: '2026-09-19', raw_c_adm: 80 }],
      focusCategory: cat,
      activeEngine: 'time_spent',
      categories: [cat],
      examDurationMinutes: 180,
      examTotalQuestions: 100,
    });
    expect(insight.text).toContain('60s/q');
    expect(insight.text).not.toContain('Ainda não há questões cronometradas');

    render(
      <TimeSpentChart
        subjectAggData={[
          { id: 'c_adm', fullName: 'Direito Administrativo', timedQuestoes: 10, timeSpent: 600 },
        ]}
        activeCategories={[cat]}
        categories={[cat]}
      />
    );
    expect(screen.getAllByText('1m').length).toBeGreaterThan(0);
    expect(screen.queryByText(/8m 20s/)).toBeNull();
  });

  it('5. useEvolutionMC: executa Monte Carlo normalmente quando focusCategory.id === 0', async () => {
    const runAnalysis = vi.fn().mockResolvedValue({
      probability: 82.4,
      mean: 79,
      projectedMean: 83,
      ci95Low: 74,
      ci95High: 91,
    });

    const focusZero = {
      id: 0,
      name: 'Português Zero',
      simuladoStats: {
        history: [
          { date: '2026-09-10', score: 75, total: 20, correct: 15 },
          { date: '2026-09-18', score: 82, total: 20, correct: 16 },
        ],
      },
    };

    const { result } = renderHook(() =>
      useEvolutionMC({
        focusCategory: focusZero,
        categoryLevels: { '0': 80 },
        debouncedTarget: 75,
        projectDays: 45,
        minScore: 0,
        maxScore: 100,
        runAnalysis,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(runAnalysis).toHaveBeenCalledTimes(1);
    expect(result.current.activeMcResult).not.toBeNull();
    expect(result.current.activeMcResult.probability).toBeCloseTo(82.4, 1);
  });

  it('6. computeEvolutionStatuses: suporta id=0, filtra Tempo por questão no modo foco e exibe Sem data / 0 dias', () => {
    const focusZero = { id: 0, name: 'RLM Zero', minScore: 0, maxScore: 100 };
    const timeline = [
      {
        date: '2026-09-18',
        bay_0: 84,
        raw_0: 85,
        raw_total_0: 15,
        global_total: 60,
        bay_ci_low_0: 79,
        bay_ci_high_0: 89,
        trend_status_0: 'up',
      },
    ];

    const statusesNoDate = computeEvolutionStatuses({
      timeline,
      filteredChartData: timeline,
      categories: [focusZero],
      focusCategory: focusZero,
      showOnlyFocus: true,
      targetScore: 80,
      unit: '%',
      subjectAggData: [
        { id: 0, timedQuestoes: 10, timeSpent: 500 }, // 50s/q na matéria 0
        { id: 1, timedQuestoes: 30, timeSpent: 6000 }, // 200s/q em outra matéria
      ],
      hasGoalDate: false,
      now: new Date('2026-09-20T12:00:00Z'),
    });

    expect(statusesNoDate.find((s) => s.id === 'current')?.value).toBe('84%');
    expect(statusesNoDate.find((s) => s.id === 'volume')?.value).toBe('15 q');
    expect(statusesNoDate.find((s) => s.id === 'uncertainty')?.value).toBe('±5%');
    expect(statusesNoDate.find((s) => s.id === 'movement')?.statusText).toBe('Alta estrutural');

    const timePill = statusesNoDate.find((s) => s.id === 'time');
    expect(timePill?.value).toBe('50s');
    expect(timePill?.scope).toBe('focus');

    const examNoDate = statusesNoDate.find((s) => s.id === 'exam');
    expect(examNoDate?.value).toBe('Sem data');
    expect(examNoDate?.tone).toBe('neutral');

    const statusesExamDay = computeEvolutionStatuses({
      timeline,
      categories: [focusZero],
      focusCategory: focusZero,
      hasGoalDate: true,
      daysToExam: 0,
      projectDays: 1,
    });
    expect(statusesExamDay.find((s) => s.id === 'exam')?.value).toBe('0 dias');
  });

  it('7. PerformanceBarChart, CorrelationRegimeChart, diagnostics & Tornado: preservam id=0 sem vazar "0" no DOM', () => {
    render(
      <PerformanceBarChart
        subjectAggData={[
          { id: 0, fullName: 'Matéria Zero', questoes: 20, acertos: 16 },
          { id: 1, fullName: 'Matéria Um', questoes: 30, acertos: 15 },
        ]}
        showOnlyFocus
        focusCategory={{ id: '0', name: 'Matéria Zero' }}
        targetScore={75}
      />
    );
    expect(screen.getByText('80%')).toBeTruthy();

    const catsZero = [
      {
        id: 0,
        name: 'Português',
        weight: 10,
        minCutoff: 60,
        simuladoStats: {
          history: [
            { date: '2026-09-01', score: 55 },
            { date: '2026-09-08', score: 62 },
            { date: '2026-09-15', score: 68 },
          ],
        },
      },
      {
        id: 1,
        name: 'Direito',
        weight: 10,
        simuladoStats: {
          history: [
            { date: '2026-09-01', score: 70 },
            { date: '2026-09-08', score: 74 },
            { date: '2026-09-15', score: 78 },
          ],
        },
      },
    ];

    const corr = computeWeeklyCategoryCorrelation(catsZero, 100, 0);
    expect(corr.categories[0].id).toBe('0');
    const regimes = buildRegimeMapData(catsZero, [], [], 100, 0, 80);
    expect(regimes[0].id).toBe(0);

    const { container } = render(
      <CorrelationRegimeChart categories={catsZero} focusSubjectId={0} />
    );
    const firstRowCell = container.querySelector('tbody tr td');
    expect(firstRowCell?.textContent).toBe('Português');

    const eff = computeStudyEfficiency(
      [{ categoryId: '0', minutes: 60 }],
      [
        { categoryId: 0, total: 20, correct: 16, score: 80, validated: true },
        { categoryId: 0, total: 10, correct: 0, score: 0, validated: true, source: 'manual-error-notebook' },
      ],
      100,
      0
    );
    expect(eff.totalQuestions).toBe(20);
    expect(eff.accuracyRate).toBeCloseTo(0.8, 2);

    const tornadoZero = runTornadoSensitivity({
      subjects: [{ id: 0, name: 'Português', weight: 10, mean: 60, sd: 8, minScore: 0, maxScore: 100 }],
      targetScore: 70,
      simulations: 400,
      overrides: { 0: 15 },
    });
    expect(tornadoZero.items[0].id).toBe(0);
    expect(tornadoZero.items[0].currentMean).toBe(75);

    render(<TornadoWhatIfChart categories={catsZero} simuladoRows={[{ valid: false, score: 0 }]} />);
    expect(screen.getByText(/Decomposição do Risco de Eliminação/i)).toBeTruthy();
  });

  it('8. CriticalTopicsAnalysis & SubtopicsPerformanceChart: ignoram invalidados, leem percentage legado e respeitam foco', () => {
    const cats = [
      {
        id: 1,
        name: 'Português',
        tasks: [{ id: 101, title: 'Concordância Verbal' }],
        simuladoStats: {
          history: [
            {
              date: '2026-09-19',
              total: 10,
              correct: 1,
              score: 10,
              valid: false, // invalidado: NÃO pode ativar falso "Sem erros críticos!"
            },
          ],
        },
      },
      {
        id: 2,
        name: 'Constitucional',
        simuladoStats: {
          history: [
            {
              date: '2026-09-19',
              validated: true,
              topics: [{ assunto: 'Controle de Constitucionalidade', percentage: 45 }],
            },
          ],
        },
      },
    ];

    const { rerender } = render(
      <CriticalTopicsAnalysis
        categories={cats}
        showOnlyFocus
        focusSubjectId="1"
        targetScore={80}
      />
    );
    expect(screen.getByText(/Sem simulados nesta semana/i)).toBeTruthy();
    expect(screen.queryByText(/Sem erros críticos!/i)).toBeNull();

    rerender(
      <CriticalTopicsAnalysis
        categories={cats}
        showOnlyFocus
        focusSubjectId="2"
        targetScore={80}
      />
    );
    expect(screen.getByText(/Controle de Constitucionalidade/i)).toBeTruthy();

    render(
      <SubtopicsPerformanceChart
        categories={[cats[1]]}
        targetScore={80}
        minScore={0}
        maxScore={100}
      />
    );
    expect(screen.getAllByText(/45%/).length).toBeGreaterThan(0);
  });

  it('9. useChartData & WeeklyEvolutionView: respeitam peso explícito 0 / mcWeights[name] e studyLogs em objeto', () => {
    const cats = [
      {
        id: 'c1',
        name: 'Essencial',
        weight: 10,
        simuladoStats: { history: [{ date: '2026-09-18', total: 10, correct: 9, score: 90 }] },
      },
      {
        id: 'c2',
        name: 'Opcional Zerada',
        weight: 10,
        simuladoStats: { history: [{ date: '2026-09-18', total: 10, correct: 1, score: 10 }] },
      },
    ];

    const { result } = renderHook(() => useChartData(cats, { 'Opcional Zerada': 0 }, 100, 0));
    expect(result.current.timeline).toHaveLength(1);
    expect(result.current.timeline[0].global_raw).toBeCloseTo(90, 1);

    render(
      <WeeklyEvolutionView
        categories={[]}
        studyLogs={{
          log_1: { date: '2026-09-20', minutes: 90, subject: 'Essencial' },
        }}
        targetScore={80}
      />
    );
    expect(screen.getByText(/Desempenho: Últimos 7 Dias/i)).toBeTruthy();
  });

  it('10. EvolutionChart: aplica penaltyPerWrong em linhas órfãs, reseta foco ao trocar concurso e recupera aba fora do grupo', () => {
    useAppStore.setState({
      appState: {
        activeId: 'c_cebraspe',
        contests: {
          c_cebraspe: {
            penaltyPerWrong: 1,
            examBoard: 'CEBRASPE',
            mcWeights: {},
            historicalCutoffs: [],
          },
          c_outro: {
            penaltyPerWrong: 0,
            examBoard: 'PADRAO',
            mcWeights: {},
            historicalCutoffs: [],
          },
        },
      },
    });

    sessionStorage.setItem(
      'evolution_ui_prefs_v1:c_cebraspe',
      JSON.stringify({
        activeEngine: 'irt_psychometric',
        timeWindow: 'all',
        engineGroup: 'recommended',
        statusViewMode: 'compact',
        showDetailedGallery: false,
      })
    );

    const orphanRows = [
      {
        id: 'r_ceb',
        date: '2026-09-19',
        disciplina: 'Portugues',
        total: 10,
        correct: 6,
        blanks: 0, // 6 certas, 4 erradas => 20% líquido no Cebraspe
        timeSpent: 600,
        validated: true,
      },
    ];

    const speed = buildSpeedAccuracyData(
      [{ id: 'p', name: 'Língua Portuguesa', simuladoStats: { history: [] } }],
      orphanRows,
      { penaltyPerWrong: 1 }
    );
    expect(speed.points[0].accuracyPct).toBe(20);

    const { rerender } = render(
      <MemoryRouter>
        <EvolutionChart
          categories={[{ id: 'p', name: 'Língua Portuguesa', simuladoStats: { history: [] } }]}
          simuladoRows={orphanRows}
          goalDate={null}
          targetScore={75}
          minScore={0}
          maxScore={100}
          unit="%"
        />
      </MemoryRouter>
    );

    // Sem goalDate: exibe "Sem data" em vez de falso alerta "30 dias · Mês decisivo"
    expect(screen.getByText('Sem data')).toBeTruthy();
    expect(screen.queryByText('Mês decisivo')).toBeNull();

    // Mesmo com activeEngine salvo fora de Recomendados (N0), ao menos 1 tab possui tabIndex=0
    const tabs = screen.getAllByRole('tab');
    expect(tabs.some((t) => t.getAttribute('tabindex') === '0')).toBe(true);

    // Troca de concurso limpa estado sem vazar seleção antiga
    act(() => {
      useAppStore.setState((prev) => ({
        ...prev,
        appState: {
          ...prev.appState,
          activeId: 'c_outro',
        },
      }));
    });

    rerender(
      <MemoryRouter>
        <EvolutionChart
          categories={[
            {
              id: 'novo_cat',
              name: 'Direito Tributário',
              simuladoStats: { history: [{ date: '2026-09-19', total: 10, correct: 8, score: 80 }] },
            },
          ]}
          simuladoRows={[]}
          goalDate="2026-11-20"
          targetScore={80}
          minScore={0}
          maxScore={100}
          unit="%"
        />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Direito Tributário/i).length).toBeGreaterThan(0);
  });
});
