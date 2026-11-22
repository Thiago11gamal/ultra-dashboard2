// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { computeEvolutionStatuses } from '../../../../utils/evolutionStatus';
import {
  buildProjectionFanData,
  buildKalmanChartData,
  buildExamPacingData,
  buildSpeedAccuracyData,
} from '../../../../utils/advancedChartHelpers';
import { generateEvolutionInsights } from '../../../../engine/insightGenerator';
import { computeLearningVelocity, buildRegimeMapData } from '../../../../engine/diagnostics';
import { estimateIRTAbility, computeGuessingStrategy } from '../../../../engine/adaptive/irtEngine';
import { kalmanAbilitySeries } from '../../../../engine/probabilistic/stateSpace';
import { StatusPill } from '../../../ui/StatusPill';
import { MetacognitionFatigueChart } from '../MetacognitionFatigueChart';
import { IRTPsychometricChart } from '../IRTPsychometricChart';
import EvolutionChart from '../../../EvolutionChart';

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

afterEach(() => {
  cleanup();
});

const SAMPLE_CATEGORIES = [
  {
    id: 'cat_const',
    name: 'Direito Constitucional',
    color: '#6366f1',
    weight: 10,
    simuladoStats: {
      history: [
        { date: '2026-09-01', total: 20, correct: 11, score: 55, timeSpent: 2400 },
        { date: '2026-09-10', total: 20, correct: 12, score: 60, timeSpent: 2200 },
        { date: '2026-09-20', total: 20, correct: 13, score: 65, timeSpent: 2000 },
      ],
    },
  },
  {
    id: 'cat_adm',
    name: 'Direito Administrativo',
    color: '#10b981',
    weight: 10,
    simuladoStats: {
      history: [
        { date: '2026-09-02', total: 20, correct: 14, score: 70, timeSpent: 1800 },
        { date: '2026-09-12', total: 20, correct: 15, score: 75, timeSpent: 1700 },
        { date: '2026-09-22', total: 20, correct: 16, score: 80, timeSpent: 1600 },
      ],
    },
  },
  {
    id: 'cat_penal',
    name: 'Direito Penal',
    color: '#f59e0b',
    weight: 10,
    simuladoStats: {
      history: [
        { date: '2026-09-05', total: 20, correct: 12, score: 60, timeSpent: 2600 },
        { date: '2026-09-18', total: 20, correct: 13, score: 65, timeSpent: 2400 },
      ],
    },
  },
];

describe('Evolution Menu Audit & Readability Improvements (2026)', () => {
  it('computeEvolutionStatuses preenche leitura completa (howToRead, scaleGuide, statusText, scopeLabel, actionHint) e usa danger quando ritmo estoura o orçamento', () => {
    const focusCategory = {
      id: 'cat_pts',
      name: 'Redação',
      minScore: 0,
      maxScore: 1000,
      minCutoff: 800,
    };
    const timeline = [
      { date: '2026-09-01', bay_cat_pts: 620, bay_ci_low_cat_pts: 570, bay_ci_high_cat_pts: 670 },
      { date: '2026-09-10', bay_cat_pts: 680, bay_ci_low_cat_pts: 640, bay_ci_high_cat_pts: 720 },
      { date: '2026-09-20', bay_cat_pts: 740, bay_ci_low_cat_pts: 705, bay_ci_high_cat_pts: 775 },
    ];

    const statuses = computeEvolutionStatuses({
      timeline,
      filteredChartData: timeline,
      categories: [focusCategory],
      focusCategory,
      targetScore: 80,
      unit: '%',
      focusUnit: 'pts',
      minScore: 0,
      maxScore: 100,
      activeMcResult: { probability: 62.5 },
      subjectAggData: [
        { id: 'cat_pts', questoes: 40, acertos: 30, avgTimePerQuestion: 125, timedQuestoes: 40 },
      ],
      heatmapData: { dates: [{ key: '2026-09-20' }], rows: [] },
      projectDays: 45,
      examDurationMinutes: 60,
      examTotalQuestions: 60, // orçamento ideal = 60s/questão
      timeWindow: 'all',
    });

    expect(statuses.length).toBeGreaterThanOrEqual(8);
    statuses.forEach((st) => {
      expect(st.howToRead, `status ${st.id} deve explicar como ler`).toBeTruthy();
      expect(st.scaleGuide, `status ${st.id} deve informar faixas de leitura`).toBeTruthy();
      expect(st.statusText, `status ${st.id} deve trazer veredito curto`).toBeTruthy();
      expect(st.scopeLabel, `status ${st.id} deve indicar escopo`).toBeTruthy();
      expect(st.actionHint, `status ${st.id} deve trazer ação recomendada`).toBeTruthy();
    });

    const current = statuses.find((s) => s.id === 'current');
    expect(current.value).toContain('pts');

    const timeSt = statuses.find((s) => s.id === 'time');
    expect(timeSt).toBeDefined();
    expect(timeSt.tone).toBe('danger');
    expect(timeSt.howToRead).toContain('60s');
  });

  it('StatusPill renderiza cartão detalhado com "Como ler:" e expande ação ao clicar', () => {
    function ControlledCard() {
      const [selected, setSelected] = React.useState(false);
      return (
        <StatusPill
          variant="card"
          label="Nível atual"
          value="76.0%"
          tone="warning"
          icon="🎯"
          statusText="Quase lá"
          scopeLabel="Foco: Direito Penal"
          howToRead="Estimativa bayesiana atual em Direito Penal frente à meta de 80%."
          scaleGuide="Verde ≥ 80% · Amarelo 64%–79% · Vermelho < 64%"
          actionHint="Priorize listas direcionadas nos tópicos abaixo da meta."
          isSelected={selected}
          onClick={() => setSelected((v) => !v)}
        />
      );
    }

    render(<ControlledCard />);
    expect(screen.getByText(/Como ler:/i)).toBeTruthy();
    expect(screen.getByText(/Estimativa bayesiana atual/i)).toBeTruthy();
    expect(screen.getByText(/Quase lá/i)).toBeTruthy();
    expect(screen.queryByText(/O que fazer:/i)).toBeNull();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/O que fazer:/i)).toBeTruthy();
    expect(screen.getByText(/Priorize listas direcionadas/i)).toBeTruthy();
  });

  it('buildProjectionFanData e buildKalmanChartData leem global_bayesian/global_raw do timeline real quando focusCategory é null', () => {
    const timeline = [
      { date: '2026-09-01', global_bayesian: 62, global_raw: 60 },
      { date: '2026-09-05', global_bayesian: 66, global_raw: 68 },
      { date: '2026-09-05', global_bayesian: 68, global_raw: 70 }, // mesmo dia deve deduplicar
      { date: '2026-09-12', global_bayesian: 71, global_raw: 72 },
      { date: '2026-09-20', global_bayesian: 75, global_raw: 76 },
    ];

    const fan = buildProjectionFanData(null, timeline, {
      minScore: 0,
      maxScore: 100,
      targetScore: 80,
      horizonDays: 30,
      now: new Date('2026-09-25T12:00:00'),
    });
    expect(fan.series.length).toBeGreaterThan(4);
    expect(fan.summary).not.toBeNull();
    const historicalDates = fan.series.filter((p) => !p.isFuture && !p.isAnchor).map((p) => p.date);
    expect(new Set(historicalDates).size).toBe(historicalDates.length);

    const kalman = buildKalmanChartData(null, timeline, { minScore: 0, maxScore: 100 });
    expect(kalman.points.length).toBe(5);
    expect(kalman.summary).not.toBeNull();
  });

  it('buildExamPacingData usa método de Hamilton para somar exatamente examTotalQuestions e lê timeSpent por tópico', () => {
    const catsWithTopicTime = SAMPLE_CATEGORIES.map((c) => ({
      ...c,
      simuladoStats: {
        history: [
          {
            date: '2026-09-20',
            total: 10,
            correct: 7,
            score: 70,
            // sem timeSpent na raiz, apenas nos tópicos
            topics: [
              { name: 'Tópico A', total: 5, correct: 4, timeSpent: 600 },
              { name: 'Tópico B', total: 5, correct: 3, timeSpent: 750 },
            ],
          },
        ],
      },
    }));

    const pacing = buildExamPacingData(catsWithTopicTime, {
      examDurationMinutes: 240,
      examTotalQuestions: 100,
    });

    expect(pacing.hasData).toBe(true);
    expect(pacing.subjects.every((s) => s.hasTimedData)).toBe(true);
    const totalAllocated = pacing.subjects.reduce((acc, s) => acc + s.allocatedQuestions, 0);
    expect(totalAllocated).toBe(100);
  });

  it('buildSpeedAccuracyData suporta timeSpent por tópico no modo subject e score fallback no modo topic', () => {
    const cats = [
      {
        id: 'c1',
        name: 'Português',
        simuladoStats: {
          history: [
            {
              date: '2026-09-20',
              total: 10,
              correct: 8,
              score: 80,
              topics: [
                { name: 'Crase', total: 5, score: 80, timeSpent: 450 }, // sem t.correct
                { name: 'Concordância', total: 5, score: 60, timeSpent: 600 },
              ],
            },
          ],
        },
      },
    ];

    const bySubject = buildSpeedAccuracyData(cats, [], { mode: 'subject' });
    expect(bySubject.points.length).toBe(1);
    expect(bySubject.points[0].avgSeconds).toBe(105);

    const byTopic = buildSpeedAccuracyData(cats, [], { mode: 'topic' });
    expect(byTopic.points.length).toBe(2);
    const crase = byTopic.points.find((p) => p.name === 'Crase');
    expect(crase.accuracyPct).toBe(80);
  });

  it('generateEvolutionInsights retorna diagnósticos específicos para todas as 9 novas abas (nunca cai no falso "Rendimento de Mestre")', () => {
    const newEngines = [
      'speed_accuracy',
      'exam_pacing',
      'consistency_boxplot',
      'projection_fan',
      'kalman_latent',
      'tornado_whatif',
      'correlation_regimes',
      'irt_psychometric',
      'metacognition_fatigue',
    ];

    const timeline = [
      { date: '2026-09-01', bay_cat_const: 55, global_bayesian: 60 },
      { date: '2026-09-10', bay_cat_const: 60, global_bayesian: 64 },
      { date: '2026-09-20', bay_cat_const: 65, global_bayesian: 68 },
    ];

    const simuladoRows = [
      {
        date: '2026-09-20',
        categoryId: 'cat_const',
        subject: 'Direito Constitucional',
        total: 20,
        correct: 11,
        score: 55,
        questionTelemetry: [
          { questionIndex: 0, wasCorrect: true, wasAnswered: true, confidence: 'certeza', timeSpentSec: 80 },
          { questionIndex: 1, wasCorrect: false, wasAnswered: true, confidence: 'certeza', errorType: 'lacuna', timeSpentSec: 120 },
          { questionIndex: 2, wasCorrect: false, wasAnswered: true, confidence: 'duvida', errorType: 'pegadinha', timeSpentSec: 130 },
        ],
      },
    ];

    newEngines.forEach((engineId) => {
      const result = generateEvolutionInsights({
        timeline,
        filteredChartData: timeline,
        focusCategory: SAMPLE_CATEGORIES[0],
        activeEngine: engineId,
        categories: SAMPLE_CATEGORIES,
        simuladoRows,
        targetScore: 80,
        minScore: 0,
        maxScore: 100,
        unit: '%',
        examDurationMinutes: 180,
        examTotalQuestions: 100,
      });

      expect(result, `insight para ${engineId}`).toBeTruthy();
      expect(result.title).not.toContain('Rendimento de Mestre');
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.advice.length).toBeGreaterThan(10);
    });
  });

  it('MetacognitionFatigueChart normaliza aliases de erro, exibe Dúvida + Acerto e ignora questões em branco nos erros', () => {
    const rows = [
      {
        date: '2026-09-20',
        categoryId: 'cat_const',
        subject: 'Direito Constitucional',
        questionTelemetry: [
          { questionIndex: 0, wasCorrect: true, wasAnswered: true, confidence: 'certeza', timeSpentSec: 60 },
          { questionIndex: 1, wasCorrect: true, wasAnswered: true, confidence: 'duvida', timeSpentSec: 90 },
          { questionIndex: 2, wasCorrect: true, wasAnswered: true, confidence: 'chute', timeSpentSec: 50 },
          { questionIndex: 3, wasCorrect: false, wasAnswered: true, confidence: 'certeza', errorType: 'lacuna', timeSpentSec: 100 },
          { questionIndex: 4, wasCorrect: false, wasAnswered: true, confidence: 'duvida', errorType: 'pegadinha', timeSpentSec: 110 },
          { questionIndex: 5, wasCorrect: false, wasAnswered: false, confidence: 'duvida', errorType: 'lacuna', timeSpentSec: 40 }, // em branco não deve contar como erro de lacuna
        ],
      },
    ];

    render(<MetacognitionFatigueChart simuladoRows={rows} />);
    expect(screen.getByText(/Falso Domínio \(Sorte \/ Dúvida\)/i)).toBeTruthy();
    expect(screen.getByText(/1 dúvida · 1 chute/i)).toBeTruthy();
    expect(screen.getByText(/5 questões avaliadas/i)).toBeTruthy();
    expect(screen.getByText(/Anatomia dos Erros por Disciplina/i)).toBeTruthy();
  });

  it('IRTPsychometricChart ignora linhas inválidas, filtra foco e mostra faixa interpretativa de θ', () => {
    const rows = [
      {
        date: '2026-09-10',
        categoryId: 'cat_const',
        subject: 'Direito Constitucional',
        difficulty: 'medio',
        total: 10,
        correct: 8,
        valid: true,
        questionTelemetry: [
          { questionIndex: 0, wasCorrect: true, wasAnswered: true, difficulty: 'facil', timeSpentSec: 60 },
        ],
      },
      {
        date: '2026-09-11',
        categoryId: 'cat_const',
        subject: 'Direito Constitucional',
        difficulty: 'dificil',
        total: 10,
        correct: 1,
        valid: false, // inválida: deve ser filtrada
      },
    ];

    render(
      <IRTPsychometricChart
        categories={SAMPLE_CATEGORIES}
        simuladoRows={rows}
        focusCategory={SAMPLE_CATEGORIES[0]}
        showOnlyFocus
      />
    );

    expect(screen.getByText(/Curva Característica TRI \/ IRT/i)).toBeTruthy();
    expect(screen.getByText('Competitivo')).toBeTruthy();
    expect(screen.getByText(/Zona Proximal:/i)).toBeTruthy();
    expect(screen.getByText(/Como ler θ \(escala/i)).toBeTruthy();
  });

  it('EvolutionChart inicia limpo em Modo Compacto, expande Guia de Leitura, abre guias sob demanda e filtra grupos de análises', () => {
    render(
      <MemoryRouter>
        <EvolutionChart
          categories={SAMPLE_CATEGORIES}
          targetScore={80}
          minScore={0}
          maxScore={100}
          unit="%"
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Status inteligente do desempenho/i)).toBeTruthy();
    // Inicia limpo no modo Compacto (sem despejar 8 cards de texto nem ChartGuides abertos)
    expect(screen.queryAllByText(/Sinais positivos/i).length).toBe(0);

    // Clicar em uma pílula de status abre o detalhe "Como ler:" sob demanda
    fireEvent.click(screen.getByRole('button', { name: /Nível atual/i }));
    expect(screen.getByText(/Como ler: Nível atual/i)).toBeTruthy();

    // Alternar para Guia de leitura exibe os cartões completos com "Como ler:"
    fireEvent.click(screen.getByRole('button', { name: /Guia de leitura/i }));
    expect(screen.getAllByText(/Como ler:/i).length).toBeGreaterThanOrEqual(4);

    // Abrir guia do Hero Chart Bayesiano e da Análise Secundária sob demanda (0 -> 1 -> 2)
    fireEvent.click(screen.getByRole('button', { name: /Como ler este gráfico/i }));
    expect(screen.getAllByText(/Sinais positivos/i).length).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: /Guia da análise/i }));
    expect(screen.getAllByText(/Sinais positivos/i).length).toBe(2);

    // Filtrar abas secundárias pelo grupo "Tempo & Ritmo"
    fireEvent.click(screen.getByRole('button', { name: /Tempo & Ritmo/i }));
    expect(screen.getByRole('tab', { name: /Ritmo de Prova/i })).toBeTruthy();
  });

  it('Auditoria Matemática: computeLearningVelocity não fabrica velocidade positiva em série constante e calcula n=3 corretamente', () => {
    const flat = [
      { date: '2026-09-01', score: 70 },
      { date: '2026-09-08', score: 70 },
      { date: '2026-09-15', score: 70 },
      { date: '2026-09-22', score: 70 },
    ];
    const flatVel = computeLearningVelocity(flat, 100, 0);
    expect(flatVel.velocity).toBe(0);
    expect(flatVel.velocityPerWeek).toBe(0);
    expect(flatVel.velocityLabel).toContain('Platô');

    const threeRising = [
      { date: '2026-09-01', score: 50 },
      { date: '2026-09-08', score: 65 },
      { date: '2026-09-15', score: 80 },
    ];
    const vel3 = computeLearningVelocity(threeRising, 100, 0);
    expect(vel3.velocityPerWeek).toBeGreaterThan(10);

    // buildRegimeMapData ignora registros inválidos e normaliza escalas mistas para o eixo global
    const mixedCats = [
      {
        id: 'm1',
        name: 'ENEM 1000',
        minScore: 0,
        maxScore: 1000,
        simuladoStats: {
          history: [
            { date: '2026-09-01', score: 500 },
            { date: '2026-09-08', score: 600 },
            { date: '2026-09-15', score: 700 },
            { date: '2026-09-22', score: 50, valid: false }, // inválido: deve ser ignorado
          ],
        },
      },
    ];
    const regimes = buildRegimeMapData(mixedCats, [], [], 100, 0, 80);
    expect(regimes).toHaveLength(1);
    expect(regimes[0].sampleSize).toBe(3);
    // +100 pts/sem em escala 0..1000 equivale a +10%/sem na escala global 0..100
    expect(regimes[0].velocity).toBeCloseTo(10, 0);
  });

  it('Auditoria Matemática: buildProjectionFanData é invariante ao zoom no dia +30 e amplia incerteza fisicamente em 180d vs 30d', () => {
    const cat = {
      id: 'c_fan',
      name: 'Direito',
      simuladoStats: {
        history: [
          { date: '2026-08-01', score: 48 },
          { date: '2026-08-15', score: 51 },
          { date: '2026-09-01', score: 54 },
          { date: '2026-09-15', score: 57 },
        ],
      },
    };
    const now = new Date('2026-09-20T12:00:00');
    const fan30 = buildProjectionFanData(cat, [], { minScore: 0, maxScore: 100, targetScore: 70, horizonDays: 30, mcHorizonDays: 60, now });
    const fan180 = buildProjectionFanData(cat, [], { minScore: 0, maxScore: 100, targetScore: 70, horizonDays: 180, mcHorizonDays: 60, now });

    const pt30_in30 = fan30.series.find((p) => p.daysAhead === 30);
    const pt30_in180 = fan180.series.find((p) => p.daysAhead === 30);
    expect(pt30_in30).toBeTruthy();
    expect(pt30_in180).toBeTruthy();
    // Mesma data futura (+30d) deve ter projeção P50 e banda idênticas independentemente do zoom
    expect(pt30_in30.p50).toBeCloseTo(pt30_in180.p50, 1);
    expect(pt30_in30.p90 - pt30_in30.p10).toBeCloseTo(pt30_in180.p90 - pt30_in180.p10, 1);

    // Cone em 180d deve ser estritamente mais aberto do que em 30d (difusão física em região não saturada)
    const spread30 = fan30.summary.finalP90 - fan30.summary.finalP10;
    const spread180 = fan180.summary.finalP90 - fan180.summary.finalP10;
    expect(spread180).toBeGreaterThan(spread30);
  });

  it('Auditoria Matemática: estimateIRTAbility não zera correct=null e computeGuessingStrategy sempre recomenda marcar com penalidade 0', () => {
    const irt = estimateIRTAbility([
      { difficulty: 'medio', total: 20, correct: null, score: 85 },
      { difficulty: 'dificil', total: 20, correct: '', score: 75 },
    ]);
    expect(irt.theta).toBeGreaterThan(0.5);
    const medio = irt.tierBreakdown.find((t) => t.key === 'medio');
    expect(medio.observedPct).toBe(85);

    const zeroPen = computeGuessingStrategy(
      [
        { confidence: 'certeza', correct: true },
        { confidence: 'duvida', correct: true },
        { confidence: 'chute', correct: false },
      ],
      { penaltyPerWrong: 0 }
    );
    expect(zeroPen.levels.find((l) => l.key === 'chute').shouldAnswer).toBe(true);
  });

  it('Auditoria Matemática: Speed×Accuracy lê acurácia de simulado apenas com topics e ExamPacing respeita mcWeights', () => {
    const catsTopicOnly = [
      {
        id: 't_only',
        name: 'Português',
        weight: 10,
        simuladoStats: {
          history: [
            {
              date: '2026-09-20',
              // sem total/correct/score na raiz
              topics: [
                { name: 'Sintaxe', total: 10, correct: 8, timeSpent: 900 },
              ],
            },
          ],
        },
      },
      {
        id: 'other',
        name: 'Informática',
        weight: 10,
        simuladoStats: {
          history: [
            { date: '2026-09-20', total: 10, correct: 7, timeSpent: 1000 },
          ],
        },
      },
    ];

    const speed = buildSpeedAccuracyData(catsTopicOnly, [], { mode: 'subject' });
    const port = speed.points.find((p) => p.id === 't_only');
    expect(port.accuracyPct).toBe(80);
    expect(port.avgSeconds).toBe(90);

    const pacing = buildExamPacingData(catsTopicOnly, {
      examDurationMinutes: 200,
      examTotalQuestions: 100,
      mcWeights: { t_only: 30, other: 10 }, // 75% vs 25%
    });
    expect(pacing.subjects.find((s) => s.id === 't_only').allocatedQuestions).toBe(75);
    expect(pacing.subjects.find((s) => s.id === 'other').allocatedQuestions).toBe(25);
  });

  it('Auditoria Matemática: kalmanAbilitySeries separa ruído observacional da tendência linear', () => {
    const pureLinear = [
      { date: '2026-08-01', score: 50 },
      { date: '2026-08-10', score: 60 },
      { date: '2026-08-20', score: 70 },
      { date: '2026-08-30', score: 80 },
      { date: '2026-09-10', score: 90 },
    ];
    const res = kalmanAbilitySeries(pureLinear, { minScore: 0, maxScore: 100 });
    expect(res.summary.observationSd).toBeLessThan(res.summary.rawSd);
    expect(res.summary.trendPerMonth).toBeGreaterThan(5);
  });
});
