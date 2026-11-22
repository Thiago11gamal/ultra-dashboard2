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
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';
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

    // projection_fan with minCutoff: 0 must use targetScore (80), NOT 0, and incorporate activeMcResult
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
      activeMcResult: { projectedMean: 72, ci95Low: 66, ci95High: 78 },
    });
    expect(fanInsight.type).toBe('warning');
    expect(fanInsight.details).toContain('80.0%');
    expect(fanInsight.text).toContain('72.0%');
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
      statusViewMode: 'detailed',
      showDetailedGallery: false,
    });
    expect(sanitized.activeEngine).toBe('exam_pacing');
    expect(sanitized.engineGroup).toBe('all');
    expect(sanitized.timeWindow).toBe('all');
    expect(sanitized.statusViewMode).toBe('detailed');
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
      expect(saved.statusViewMode).toBe('detailed');

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
});
