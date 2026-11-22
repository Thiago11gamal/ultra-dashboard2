// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';

import EvolutionChart from '../../../EvolutionChart';
import EvolutionPage from '../../../../pages/Evolution';
import { TimeSpentChart } from '../TimeSpentChart';
import { EvolutionLineChart } from '../EvolutionLineChart';
import { RadarAnalysis } from '../RadarAnalysis';
import { PerformanceBarChart } from '../PerformanceBarChart';
import { MonteCarloEvolutionChart } from '../MonteCarloEvolutionChart';
import { ConsistencyBoxPlotChart } from '../ConsistencyBoxPlotChart';
import { IRTPsychometricChart } from '../IRTPsychometricChart';
import { MetacognitionFatigueChart } from '../MetacognitionFatigueChart';
import { CriticalTopicsAnalysis } from '../CriticalTopicsAnalysis';
import { TodayVsGeneralChart } from '../TodayVsGeneralChart';
import WeeklyPerformanceChart from '../WeeklyPerformanceChart';
import { CorrelationRegimeChart } from '../CorrelationRegimeChart';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';
import { buildProjectionFanData } from '../../../../utils/advancedChartHelpers';
import {
  readEvolutionUiPrefs,
  writeEvolutionUiPrefs,
  sanitizeEvolutionUiPrefs,
  getEvolutionPrefsStorageKey,
} from '../../../../utils/evolutionUiPrefs';
import { useAppStore } from '../../../../store/useAppStore';
import { getDateKey } from '../../../../utils/dateHelper';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 800, height: 320 }}>{children}</div>,
  };
});

describe('Evolution Menu — Data-to-Visual Parity Verification Suite', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('TimeSpentChart balance split bar includes stable subjects instead of inflating fast/slow to 50/50', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

    // 4 subjects: 1 faster, 2 stable, 1 slower => 25% rápidas · 50% estáveis · 25% lentas
    const subjectAggData = [
      { id: 'c1', fullName: 'Rápida', timeSpent: 600, timedQuestoes: 10 },  // avg 60s
      { id: 'c2', fullName: 'Estável A', timeSpent: 600, timedQuestoes: 10 }, // avg 60s
      { id: 'c3', fullName: 'Estável B', timeSpent: 600, timedQuestoes: 10 }, // avg 60s
      { id: 'c4', fullName: 'Lenta', timeSpent: 600, timedQuestoes: 10 },   // avg 60s
    ];
    const activeCategories = [
      { id: 'c1', name: 'Rápida', simuladoStats: { history: [{ date: '2026-04-01', total: 10, timeSpent: 300 }] } },    // 30s < 60s (fast)
      { id: 'c2', name: 'Estável A', simuladoStats: { history: [{ date: '2026-04-01', total: 10, timeSpent: 600 }] } }, // 60s == 60s (stable)
      { id: 'c3', name: 'Estável B', simuladoStats: { history: [{ date: '2026-04-01', total: 10, timeSpent: 610 }] } }, // 61s within ±5% (stable)
      { id: 'c4', name: 'Lenta', simuladoStats: { history: [{ date: '2026-04-01', total: 10, timeSpent: 900 }] } },     // 90s > 60s (slow)
    ];

    const html = renderToStaticMarkup(
      <TimeSpentChart subjectAggData={subjectAggData} activeCategories={activeCategories} />
    );

    expect(html).toContain('25% rápidas');
    expect(html).toContain('50% estáveis');
    expect(html).toContain('25% lentas');
  });

  it('EvolutionLineChart pill legend omits categories with no data in active time window', () => {
    const activeCategories = [
      { id: 'c1', name: 'Português', color: '#3b82f6' },
      { id: 'c2', name: 'Matemática', color: '#10b981' },
      { id: 'c3', name: 'Sem Dados No Período', color: '#ef4444' },
    ];
    const filteredChartData = [
      { date: '2026-05-01', bay_c1: 75, bay_c2: 82 },
      { date: '2026-05-05', bay_c1: 80, bay_c2: 84 },
    ];

    const html = renderToStaticMarkup(
      <EvolutionLineChart
        filteredChartData={filteredChartData}
        activeCategories={activeCategories}
        engine={{ id: 'bayesian', prefix: 'bay_', style: 'monotone' }}
        targetScore={80}
        showOnlyFocus={false}
        minScore={0}
        maxScore={100}
        unit="%"
      />
    );

    expect(html).toContain('Português');
    expect(html).toContain('Matemática');
    expect(html).not.toContain('Sem Dados No Período');
  });

  it('RadarAnalysis explains focus filter mode instead of claiming insufficient data, and labels windowed accuracy', () => {
    const focusHtml = renderToStaticMarkup(
      <RadarAnalysis
        radarData={[{ subject: 'Português', nivel: 80, meta: 75 }]}
        isFocusFiltered={true}
        timeWindow="all"
      />
    );
    expect(focusHtml).toContain('Modo Apenas Foco ativo');
    expect(focusHtml).not.toContain('Dados insuficientes para o Raio-X');

    const windowedHtml = renderToStaticMarkup(
      <RadarAnalysis
        radarData={[
          { subject: 'Português', nivel: 80, meta: 75 },
          { subject: 'Matemática', nivel: 70, meta: 75 },
          { subject: 'Direito', nivel: 85, meta: 75 },
        ]}
        isFocusFiltered={false}
        timeWindow="30"
      />
    );
    expect(windowedHtml).toContain('acerto nos últimos 30 dias');
    expect(windowedHtml).not.toContain('proficiência real');
  });

  it('EvolutionChart hides misleading -80pp meta delta when selected timeWindow has zero data and avoids fake 0% radar vertices', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

    const categories = [
      {
        id: 'c1',
        name: 'Português',
        simuladoStats: { history: [{ date: '2025-01-10', total: 10, correct: 8, score: 80 }] },
      },
      {
        id: 'c2',
        name: 'Matemática',
        simuladoStats: { history: [{ date: '2025-01-11', total: 10, correct: 7, score: 70 }] },
      },
      {
        id: 'c3',
        name: 'Direito',
        simuladoStats: { history: [{ date: '2025-01-12', total: 10, correct: 9, score: 90 }] },
      },
    ];

    const { container, getByText } = render(
      <MemoryRouter>
        <EvolutionChart categories={categories} targetScore={80} minScore={0} maxScore={100} unit="%" />
      </MemoryRouter>
    );

    // Switch to 30d window where all 2025 simulados are outside the window
    fireEvent.click(getByText('30d'));
    expect(container.textContent).not.toContain('-80pp meta');
  });

  it('EvolutionChart formats Cebraspe fractional errors cleanly without float noise', () => {
    const today = getDateKey(new Date());
    const categories = [
      {
        id: 'c1',
        name: 'Direito Penal',
        simuladoStats: {
          history: [
            // 10 questions, 7 correct, 3 wrong, penalty 0.5 => net 5.5/10 => 4.5 errors
            { date: today, total: 10, correct: 7, penaltyPerWrong: 0.5 },
          ],
        },
      },
    ];

    const { container } = render(
      <MemoryRouter>
        <EvolutionChart categories={categories} targetScore={80} minScore={0} maxScore={100} unit="%" />
      </MemoryRouter>
    );

    expect(container.textContent).not.toMatch(/000000/);
  });

  it('PerformanceBarChart horizontal mode handles 100% accuracy (erros === 0) without crashing', () => {
    const subjectAggData = [
      { id: 'c1', name: 'Português', realQuestoes: 20, realAcertos: 20 },
      { id: 'c2', name: 'Matemática', realQuestoes: 15, realAcertos: 12 },
      { id: 'c3', name: 'Direito', realQuestoes: 10, realAcertos: 8 },
      { id: 'c4', name: 'Informática', realQuestoes: 10, realAcertos: 10 },
    ];
    const html = renderToStaticMarkup(<PerformanceBarChart subjectAggData={subjectAggData} />);
    expect(html).toContain('Questões Resolvidas vs Acertos');
    expect(html).toMatch(/90[.,]9%/);
  });

  it('MonteCarloEvolutionChart uses accurate inline legend labels', () => {
    const data = [
      { date: '2026-05-01', mean: 70, projectedMean: 74, ci95Low: 65, ci95High: 83, probability: 60 },
      { date: '2026-05-08', mean: 76, projectedMean: 81, ci95Low: 72, ci95High: 88, probability: 78 },
    ];
    const html = renderToStaticMarkup(
      <MonteCarloEvolutionChart data={data} targetScore={80} minScore={0} maxScore={100} unit="%" />
    );
    expect(html).toContain('Nível na data');
    expect(html).toContain('Projeção p/ prova');
    expect(html).not.toContain('Passado');
  });

  it('ConsistencyBoxPlotChart displays scale-aware IQR thresholds for non-% domains', () => {
    const categories = [
      {
        id: 'enem-mat',
        name: 'Matemática ENEM',
        minScore: 0,
        maxScore: 1000,
        simuladoStats: {
          history: [
            { date: '2026-04-01', score: 650 },
            { date: '2026-04-08', score: 700 },
            { date: '2026-04-15', score: 740 },
          ],
        },
      },
    ];
    const html = renderToStaticMarkup(
      <ConsistencyBoxPlotChart categories={categories} targetScore={750} minScore={0} maxScore={1000} unit="pts" />
    );
    expect(html).toContain('IQR ≤ 100 pts');
    expect(html).toContain('180 pts');
  });

  it('generateEvolutionInsights syncs exam_pacing with mcWeights and projection_fan with activeMcResult & minCutoff=0 guard', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

    const cats = [
      {
        id: 'slow',
        name: 'Contabilidade',
        weight: 10,
        minCutoff: 0, // must NOT override targetScore with 0!
        simuladoStats: {
          history: [
            { date: '2026-04-01', total: 10, correct: 6, score: 60, timeSpent: 3000 }, // 300s/q
            { date: '2026-05-01', total: 10, correct: 6, score: 62, timeSpent: 3000 }, // 300s/q
          ],
        },
      },
      {
        id: 'fast',
        name: 'Português',
        weight: 10,
        simuladoStats: {
          history: [
            { date: '2026-04-01', total: 10, correct: 9, score: 90, timeSpent: 600 }, // 60s/q
            { date: '2026-05-01', total: 10, correct: 9, score: 90, timeSpent: 600 }, // 60s/q
          ],
        },
      },
    ];
    const timeline = [
      { date: '2026-04-01', raw_slow: 60, bay_slow: 60, global_bayesian: 75 },
      { date: '2026-05-01', raw_slow: 62, bay_slow: 62, global_bayesian: 76 },
    ];

    // Equal weights: avg 180s/q * 60q = 180 min <= 200 min => healthy budget
    const pacingEqual = generateEvolutionInsights({
      timeline,
      filteredChartData: timeline,
      focusCategory: cats[0],
      activeEngine: 'exam_pacing',
      categories: cats,
      examDurationMinutes: 200,
      examTotalQuestions: 60,
      mcWeights: { slow: 10, fast: 10 },
    });
    expect(pacingEqual.type).toBe('success');

    // Heavy mcWeights on slow subject (90% slow => ~276s/q * 60q = 276 min > 200 min => danger)
    const pacingWeighted = generateEvolutionInsights({
      timeline,
      filteredChartData: timeline,
      focusCategory: cats[0],
      activeEngine: 'exam_pacing',
      categories: cats,
      examDurationMinutes: 200,
      examTotalQuestions: 60,
      mcWeights: { slow: 90, fast: 10 },
    });
    expect(pacingWeighted.type).toBe('danger');
    expect(pacingWeighted.details).toContain('Contabilidade');

    // projection_fan with minCutoff: 0 must use targetScore (80), NOT 0, and forward activeMcResult.sd identically to ProjectionFanChart
    const mcRes = { sd: 14 };
    const expectedFan = buildProjectionFanData(cats[0], timeline, {
      minScore: 0,
      maxScore: 100,
      targetScore: 80,
      horizonDays: 60,
      mcHorizonDays: 60,
      activeMcResult: mcRes,
    });
    const fanInsight = generateEvolutionInsights({
      timeline,
      filteredChartData: timeline,
      focusCategory: cats[0],
      activeEngine: 'projection_fan',
      categories: cats,
      targetScore: 80,
      minScore: 0,
      maxScore: 100,
      projectDays: 60,
      activeMcResult: mcRes,
    });
    const fanWithoutMc = generateEvolutionInsights({
      timeline,
      filteredChartData: timeline,
      focusCategory: cats[0],
      activeEngine: 'projection_fan',
      categories: cats,
      targetScore: 80,
      minScore: 0,
      maxScore: 100,
      projectDays: 60,
    });
    expect(fanInsight.type).toBe('warning');
    expect(fanInsight.details).toContain('80.0%');
    expect(fanInsight.text).toContain(`P10: ${expectedFan.summary.finalP10.toFixed(1)}`);
    expect(fanInsight.text).toContain(`P90: ${expectedFan.summary.finalP90.toFixed(1)}`);
    expect(fanInsight.text).not.toBe(fanWithoutMc.text);
  });

  it('generateEvolutionInsights filters raw_weekly, irt_psychometric, metacognition_fatigue, and correlation_regimes by timeWindow & focus', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

    const focusCat = {
      id: 'c1',
      name: 'Direito Penal',
      simuladoStats: {
        history: [
          { date: '2025-01-06', total: 20, correct: 18, score: 90 }, // Monday (old)
          { date: '2025-01-07', total: 20, correct: 8, score: 40 },  // Tuesday (old)
        ],
      },
    };
    const otherCat = {
      id: 'c2',
      name: 'Português',
      simuladoStats: {
        history: [{ date: '2026-05-05', total: 20, correct: 16, score: 80 }],
      },
    };
    const timeline = [{ date: '2026-05-05', bay_c1: 70, bay_c2: 80 }];

    // raw_weekly with timeWindow='30' should NOT report 2025 weekdays as best/worst
    const rawWeekly30 = generateEvolutionInsights({
      timeline,
      filteredChartData: timeline,
      focusCategory: focusCat,
      activeEngine: 'raw_weekly',
      categories: [focusCat, otherCat],
      timeWindow: '30',
      showOnlyFocus: true,
    });
    expect(rawWeekly30.title).toBe('Mapa de Calor');

    // metacognition_fatigue must honor wasCorrect, wasAnswered: false, showOnlyFocus, and timeWindow
    const rows = [
      {
        date: '2026-05-08',
        categoryId: 'c1',
        subject: 'Direito Penal',
        questionTelemetry: [
          { confidence: 'certeza', wasCorrect: true, wasAnswered: true },
          { confidence: 'certeza', wasCorrect: false, wasAnswered: false }, // blank: must NOT count as critical error
        ],
      },
      {
        date: '2026-05-08',
        categoryId: 'c2',
        subject: 'Português',
        questionTelemetry: [
          { confidence: 'certeza', wasCorrect: false, wasAnswered: true }, // different subject
        ],
      },
      {
        date: '2025-01-10', // outside 30d window
        categoryId: 'c1',
        subject: 'Direito Penal',
        questionTelemetry: [
          { confidence: 'certeza', wasCorrect: false, wasAnswered: true },
        ],
      },
    ];

    const metaFocus30 = generateEvolutionInsights({
      timeline,
      filteredChartData: timeline,
      focusCategory: focusCat,
      activeEngine: 'metacognition_fatigue',
      categories: [focusCat, otherCat],
      simuladoRows: rows,
      showOnlyFocus: true,
      timeWindow: '30',
    });
    expect(metaFocus30.type).toBe('success');
    expect(metaFocus30.text).toContain('1 acertos com certeza');
    expect(metaFocus30.details).toContain('1 questões respondidas');

    // irt_psychometric respects showOnlyFocus + timeWindow
    const irtRows = [
      { date: '2025-01-10', categoryId: 'c1', subject: 'Direito Penal', difficulty: 'dificil', total: 20, correct: 19 },
      { date: '2026-05-08', categoryId: 'c2', subject: 'Português', difficulty: 'facil', total: 20, correct: 4 },
    ];
    const irtFocus30 = generateEvolutionInsights({
      timeline,
      filteredChartData: timeline,
      focusCategory: focusCat,
      activeEngine: 'irt_psychometric',
      categories: [focusCat, otherCat],
      simuladoRows: irtRows,
      showOnlyFocus: true,
      timeWindow: '30',
    });
    expect(irtFocus30.text).toContain('Aguardando simulados');
  });

  it('Evolution page recognizes scorePoints and scorePct entries without raw score or total', () => {
    const prevState = useAppStore.getState();
    try {
      useAppStore.setState({
        appState: {
          activeId: 'scorepoints-test',
          contests: {
            'scorepoints-test': {
              unit: 'pts',
              minScore: 0,
              maxScore: 1000,
              categories: [
                {
                  id: 'redacao',
                  name: 'Redação',
                  simuladoStats: {
                    history: [{ date: '2026-05-05', scorePoints: 860 }],
                  },
                },
              ],
              simuladoRows: [],
              studyLogs: [],
              monteCarloHistory: [],
              user: { targetScore: 800 },
            },
          },
        },
      });

      const { container } = render(
        <MemoryRouter>
          <EvolutionPage />
        </MemoryRouter>
      );

      expect(container.textContent).not.toContain('Desbloqueie sua Evolução');
      expect(container.querySelector('#evolution-chart-container')).not.toBeNull();
    } finally {
      useAppStore.setState(prevState);
    }
  });

  it('evolutionUiPrefs sanitizes corrupt storage and EvolutionChart persists toolbar preferences when enabled', () => {
    const sanitized = sanitizeEvolutionUiPrefs({
      activeEngine: 'exam_pacing',
      engineGroup: 'performance', // mismatch: exam_pacing is in 'speed'
      timeWindow: '999',          // invalid
      statusViewMode: 'guide',
      showDetailedGallery: false,
    });
    expect(sanitized.activeEngine).toBe('exam_pacing');
    expect(sanitized.engineGroup).toBe('all');
    expect(sanitized.timeWindow).toBe('all');
    expect(sanitized.statusViewMode).toBe('guide');
    expect(sanitized.showDetailedGallery).toBe(false);

    const key = getEvolutionPrefsStorageKey('default');
    window.sessionStorage.removeItem(key);

    const categories = [
      {
        id: 'c1',
        name: 'Português',
        simuladoStats: {
          history: [
            { date: '2026-05-01', total: 10, correct: 8, score: 80 },
            { date: '2026-05-08', total: 10, correct: 9, score: 90 },
          ],
        },
      },
    ];

    try {
      const first = render(
        <MemoryRouter>
          <EvolutionChart categories={categories} persistUiPrefs={true} />
        </MemoryRouter>
      );
      fireEvent.click(first.getByText('60d'));
      fireEvent.click(first.getByRole('button', { name: /Guia de leitura/i }));
      first.unmount();

      const saved = readEvolutionUiPrefs('default');
      expect(saved.timeWindow).toBe('60');
      expect(saved.statusViewMode).toBe('guide');

      const second = render(
        <MemoryRouter>
          <EvolutionChart categories={categories} persistUiPrefs={true} />
        </MemoryRouter>
      );
      expect(second.getByText('60d').getAttribute('aria-pressed')).toBe('true');
      expect(second.getAllByText(/Como ler:/i).length).toBeGreaterThanOrEqual(4);
      second.unmount();

      // Direct write/read check for another contest id
      writeEvolutionUiPrefs('other-contest', { activeEngine: 'kalman_latent', timeWindow: '90' });
      expect(readEvolutionUiPrefs('other-contest').activeEngine).toBe('kalman_latent');
    } finally {
      window.sessionStorage.removeItem(key);
      window.sessionStorage.removeItem(getEvolutionPrefsStorageKey('other-contest'));
    }
  });

  it('Universal BenchmarkStrip renders "Onde está -> Onde chegar" across TimeSpent, IRT, Metacognition, PerformanceBar, CriticalTopics, and TodayVsGeneral', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

    // 1) TimeSpentChart compares against real exam target when examDurationMinutes/examTotalQuestions are provided
    const tsHtml = renderToStaticMarkup(
      <TimeSpentChart
        subjectAggData={[{ id: 'c1', fullName: 'Português', timeSpent: 1500, timedQuestoes: 10 }]}
        activeCategories={[{ id: 'c1', name: 'Português', simuladoStats: { history: [{ date: '2026-05-09', total: 10, timeSpent: 1500 }] } }]}
        examDurationMinutes={200}
        examTotalQuestions={100}
      />
    );
    expect(tsHtml).toContain('Alvo da prova');
    expect(tsHtml).toContain('2m/q');
    expect(tsHtml).toContain('+30s acima do alvo');

    // 2) IRTPsychometricChart renders θ para Meta (80% -> +1.03θ)
    const irtHtml = renderToStaticMarkup(
      <IRTPsychometricChart
        categories={[{ id: 'c1', name: 'Português', simuladoStats: { history: [{ date: '2026-05-09', total: 20, correct: 14, difficulty: 'medio' }] } }]}
        targetScore={80}
        minScore={0}
        maxScore={100}
      />
    );
    expect(irtHtml).toContain('θ para Meta (80%)');
    expect(irtHtml).toContain('+1.03');

    // 3) MetacognitionFatigueChart renders calibration benchmark (≥ 90%) and illusion target (< 5%)
    const metaHtml = renderToStaticMarkup(
      <MetacognitionFatigueChart
        simuladoRows={[
          {
            date: '2026-05-09',
            categoryId: 'c1',
            subject: 'Português',
            questionTelemetry: [
              { questionIndex: 0, confidence: 'certeza', wasCorrect: true, wasAnswered: true },
              { questionIndex: 1, confidence: 'certeza', wasCorrect: true, wasAnswered: true },
              { questionIndex: 2, confidence: 'certeza', wasCorrect: false, wasAnswered: true },
              { questionIndex: 3, confidence: 'duvida', wasCorrect: true, wasAnswered: true },
            ],
          },
        ]}
        targetScore={80}
      />
    );
    expect(metaHtml).toContain('Calibração de certeza');
    expect(metaHtml).toContain('≥ 90%');
    expect(metaHtml).toContain('Alvo resistência: queda ≤ 5pp');

    // 4) PerformanceBarChart compares real precision against contest targetScore
    const perfHtml = renderToStaticMarkup(
      <PerformanceBarChart
        subjectAggData={[
          { id: 'c1', name: 'Português', realQuestoes: 20, realAcertos: 15 },
          { id: 'c2', name: 'Direito', realQuestoes: 20, realAcertos: 18 },
        ]}
        targetScore={80}
        minScore={0}
        maxScore={100}
      />
    );
    expect(perfHtml).toContain('Precisão real');
    expect(perfHtml).toContain('1/2 na meta');

    // 5) CriticalTopicsAnalysis displays safe criticality zone (≤ 1.5) and CTA
    const critHtml = renderToStaticMarkup(
      <CriticalTopicsAnalysis
        categories={[
          {
            id: 'c1',
            name: 'Direito',
            simuladoStats: {
              history: [{ date: '2026-05-09', total: 20, correct: 8, score: 40 }],
            },
          },
        ]}
        targetScore={80}
        onGoToSimulados={() => {}}
      />
    );
    expect(critHtml).toContain('Zona segura');
    expect(critHtml).toContain('≤ 1.5 pts');
    expect(critHtml).toContain('Treinar pontos fracos');

    // 6) TodayVsGeneralChart displays explicit vs Meta comparison badge
    const todayHtml = renderToStaticMarkup(
      <TodayVsGeneralChart
        activeCategories={[
          {
            id: 'c1',
            name: 'Português',
            simuladoStats: {
              history: [{ date: '2026-05-09', total: 10, correct: 7, score: 70 }],
            },
          },
        ]}
        globalMetrics={{ globalAccuracy: 65 }}
        targetScore={80}
      />
    );
    expect(todayHtml).toContain('vs Meta');
    expect(todayHtml).toContain('Faltam 10.0pp');
  });

  it('EvolutionChart computes period-over-period delta on KPI cards when 30d window has prior 30d data', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

    const categories = [
      {
        id: 'c1',
        name: 'Português',
        simuladoStats: {
          history: [
            // Previous 30d window (2026-03-12 .. 2026-04-09): 10q, 60%
            { date: '2026-03-25', total: 10, correct: 6, score: 60 },
            // Current 30d window (2026-04-10 .. 2026-05-10): 20q, 80%
            { date: '2026-05-05', total: 20, correct: 16, score: 80 },
          ],
        },
      },
    ];

    const { container, getByText } = render(
      <MemoryRouter>
        <EvolutionChart categories={categories} targetScore={80} minScore={0} maxScore={100} unit="%" />
      </MemoryRouter>
    );

    fireEvent.click(getByText('30d'));
    expect(container.textContent).toContain('+10 vs 30d ant.');
    expect(container.textContent).toContain('+20pp vs 30d ant.');
    expect(container.textContent).toContain('Registrar simulado');
  });

  it('Benchmark accuracy audit: no -0s in TimeSpentChart, weighted 7d avg in WeeklyPerformanceChart, custom focus scale in PerformanceBarChart, and Hurst calibration notice in CorrelationRegimeChart', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));

    // 1) TimeSpentChart: diff === 0 displays "No alvo exato ✓" (never "-0s") and aligns recent displaySeconds with subject count
    const tsExactHtml = renderToStaticMarkup(
      <TimeSpentChart
        subjectAggData={[{ id: 'c1', fullName: 'Português', timeSpent: 1200, timedQuestoes: 10 }]}
        activeCategories={[{ id: 'c1', name: 'Português', simuladoStats: { history: [{ date: '2026-05-09', total: 10, timeSpent: 1200 }] } }]}
        examDurationMinutes={200}
        examTotalQuestions={100}
      />
    );
    expect(tsExactHtml).toContain('No alvo exato ✓');
    expect(tsExactHtml).not.toContain('−0s');
    expect(tsExactHtml).toContain('1/1 no ritmo da prova');

    // 2) WeeklyPerformanceChart: question-weighted 7d avg (100q @ 80% + 2q @ 50% => 81/102 = 79.4%, NOT unweighted 65%)
    const wpHtml = renderToStaticMarkup(
      <WeeklyPerformanceChart
        categories={[
          {
            id: 'c1',
            name: 'Português',
            simuladoStats: {
              history: [
                { date: '2026-05-08', total: 100, correct: 80, score: 80 },
                { date: '2026-05-09', total: 2, correct: 1, score: 50 },
              ],
            },
          },
        ]}
        targetScore={80}
        minScore={0}
        maxScore={100}
      />
    );
    expect(wpHtml).toMatch(/79[.,]4%/);
    expect(wpHtml).not.toContain('65%');

    // 3) PerformanceBarChart with custom focus scale (0..1000, targetScore 800 => 80%, NOT 100%)
    const perfCustomHtml = renderToStaticMarkup(
      <PerformanceBarChart
        subjectAggData={[{ id: 'red', name: 'Redação', realQuestoes: 10, realAcertos: 8 }]}
        showOnlyFocus={true}
        focusCategory={{ id: 'red', name: 'Redação', minScore: 0, maxScore: 1000 }}
        targetScore={800}
        minScore={0}
        maxScore={1000}
      />
    );
    expect(perfCustomHtml).toContain('80%');
    expect(perfCustomHtml).toContain('Na meta ✓');

    // 4) CorrelationRegimeChart when all subjects have < 10 simulados (calibrating Hurst) shows "Em evolução (H calibrando)"
    const corrHtml = renderToStaticMarkup(
      <CorrelationRegimeChart
        categories={[
          {
            id: 'c1',
            name: 'Direito',
            simuladoStats: {
              history: [
                { date: '2026-04-01', score: 60 },
                { date: '2026-04-15', score: 70 },
                { date: '2026-05-01', score: 80 },
              ],
            },
          },
        ]}
      />
    );
    expect(corrHtml).toContain('Em evolução (H calibrando)');
    expect(corrHtml).toContain('1/1 matérias');
    expect(corrHtml).not.toContain('0/0');
  });

  it('Memory leak, math & data integrity fixes: clearAllCoachFlags scope cleanup, Cebraspe penalty in normalizeScoreValue/extractTopicsTotals/CriticalTopics, Brazilian date EMA, and validated===false filtering', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T16:00:00.000Z'));
    const { clearAllCoachFlags, writeFlags, readFlags } = await import('../../../../utils/coachFeatureStore');
    const { normalizeScoreValue, extractTopicsTotals } = await import('../../../../utils/measurement');
    const { calculateTimeWeightedEMA } = await import('../../../../engine/stats');
    const { buildStudyVolumeCausalEvents } = await import('../../../../utils/coachCausal');

    // 1) clearAllCoachFlags() does not re-create cleared contest scopes when notifying listeners
    writeFlags({ useStateSpace: true }, 'contest-leak-test');
    expect(readFlags('contest-leak-test')).toEqual({ useStateSpace: true });
    clearAllCoachFlags();
    expect(Object.keys(globalThis.__COACH_FEATURE_REGISTRY__ || {})).toEqual([]);

    // 2) normalizeScoreValue & extractTopicsTotals honor Cebraspe penaltyPerWrong
    const cebraspeNorm = normalizeScoreValue({ total: 10, correct: 8, penaltyPerWrong: 1, blanks: 0 }, 100, 0);
    expect(cebraspeNorm.pct).toBeCloseTo(60, 5);
    expect(cebraspeNorm.points).toBeCloseTo(60, 5);

    const topicsTotals = extractTopicsTotals({
      penaltyPerWrong: 1,
      topics: [{ name: 'Crase', total: 10, correct: 8 }],
    }, 100, 0);
    expect(topicsTotals.correct).toBeCloseTo(6, 5);
    expect(topicsTotals.score).toBeCloseTo(60, 5);

    // 3) calculateTimeWeightedEMA parses Brazilian DD/MM/YYYY dates via safeDateParse
    const ema = calculateTimeWeightedEMA([
      { date: '01/05/2026', score: 60 },
      { date: '10/05/2026', score: 80 },
    ]);
    expect(Number.isFinite(ema)).toBe(true);
    expect(ema).toBeGreaterThan(60);

    // 4) buildStudyVolumeCausalEvents filters out validated: false simulados
    const causalEvents = buildStudyVolumeCausalEvents(
      [
        { id: 's1', date: '2026-05-01', categoryId: 'c1', score: 50 },
        { id: 's2', date: '2026-05-05', categoryId: 'c1', score: 90, validated: false },
        { id: 's3', date: '2026-05-08', categoryId: 'c1', score: 75, validated: true },
      ],
      [{ date: '2026-05-03', minutes: 120, categoryId: 'c1' }],
      { categoryId: 'c1' }
    );
    expect(causalEvents.length).toBe(1);
    expect(causalEvents[0].outcomeDelta).toBeCloseTo(25, 5);

    // 5) CriticalTopicsAnalysis & TopicPerformance single-topic fallback honor Cebraspe penaltyPerWrong
    const TopicPerformance = (await import('../../../TopicPerformance')).default;
    const penalizedCategories = [
      {
        id: 'c1',
        name: 'Direito Constitucional',
        simuladoStats: {
          history: [
            {
              date: '2026-05-09',
              topic: 'Controle de Constitucionalidade',
              total: 10,
              correct: 8,
              penaltyPerWrong: 1,
            },
          ],
        },
      },
    ];
    const critPenalizedHtml = renderToStaticMarkup(
      <CriticalTopicsAnalysis
        categories={penalizedCategories}
        targetScore={80}
      />
    );
    // 8 correct out of 10 with penaltyPerWrong=1 => 6 net correct (4 net errors, 40% error rate => criticality 4 * 0.4 = 1.6 pts > 1.5 safe zone)
    expect(critPenalizedHtml).toContain('1.6 pts');
    expect(critPenalizedHtml).toContain('1 matéria · 1 assunto acima');
    expect(critPenalizedHtml).toContain('1 tópico');

    const topicPerfHtml = renderToStaticMarkup(
      <TopicPerformance categories={penalizedCategories} />
    );
    expect(topicPerfHtml).toContain('Controle de Constitucionalidade');
    expect(topicPerfHtml).toContain('60%');
  });
});
