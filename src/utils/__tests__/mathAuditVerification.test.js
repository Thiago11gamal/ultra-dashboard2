import { computeCalibrationPenalty, generateAnalyticsStats } from '../../engine/analyticsStats.js';
import { conformalPredictionInterval } from '../../engine/math/bootstrap.js';
import { computeHierarchicalAdjustment } from '../../engine/stats.js';
import { compareEvaluationSummaries } from '../../engine/evaluation/coachEvaluator.js';
import { deriveAdaptiveRiskThresholds } from '../coachAdaptive.js';
import { calculateTimeWeightedEMA } from '../../engine/stats.js';
import { projectScore } from '../../engine/projection.js';
import { runStateSpaceModel } from '../../engine/probabilistic/stateSpace.js';
import { computeStudyEfficiency, computeCategoryCorrelation } from '../../engine/diagnostics.js';
import { describe, it, expect } from 'vitest';
import {
  computeBayesianProficiency,
  calculateUrgencyScore,
  getCognitiveState,
  analisarDesempenhoHistorico
} from '../coachLogic.js';
import { getSafeScore } from '../measurement.js';
import { computeContinuousMcBoost as computeLegacyMcBoost } from '../calibration.js';
import { weightedRegression } from '../../engine/stats.js';
import { runMonteCarloAnalysis } from '../../engine/monteCarlo.js';
import { kalmanAbilityTrend } from '../../engine/probabilistic/stateSpace.js';
import { computeLearningVelocity, computeConsistencyIndex } from '../../engine/diagnostics.js';

describe('Auditoria Matemática - Fixes Cirúrgicos Verificados', () => {
  it('1. computeBayesianProficiency sanitiza inputs anômalos (acertos > total ou negativos)', () => {
    const profOver = computeBayesianProficiency(12, 10, 0.5, 100);
    expect(profOver).toBeLessThanOrEqual(1.0);
    expect(profOver).toBeGreaterThan(0.5);

    const profNeg = computeBayesianProficiency(-5, 10, 0.5, 100);
    expect(profNeg).toBeGreaterThanOrEqual(0.0);
    expect(profNeg).toBeLessThanOrEqual(1.0);
  });

  it('2. calculateUrgencyScore permite que currentPriorityBoost atinja 1.15x em crunch mode', () => {
    const targetDate = new Date(Date.now() + 5 * 86400000).toISOString();
    const metrics = {
      subject: 'Direito Constitucional',
      averageScore: 50,
      targetScore: 80,
      rawWeight: 5,
      daysToExam: 5,
      daysSinceLastStudy: 10,
      mssdVolatility: 5,
      historyLength: 5,
      hasHighPriorityTasks: true,
      hasData: true,
      categoryStudyLogs: []
    };

    const options = {
      targetDate,
      config: {
        PRIORITY_BOOST: 40,
        SCORE_MAX: 40,
        RECENCY_MAX: 20,
        INSTABILITY_MAX: 15
      }
    };

    const result = calculateUrgencyScore(metrics, options);
    expect(result.priorityBoost).toBeGreaterThan(40);
    expect(result.priorityBoost).toBeLessThanOrEqual(46);
  });

  it('3. calculateUrgencyScore seleciona o timestamp mais recente independente da ordem do array', () => {
    const now = Date.now();
    const oldDate = new Date(now - 10 * 86400000).toISOString();
    const recentDate = new Date(now - 2 * 3600000).toISOString();

    const metrics = {
      subject: 'Direito Administrativo',
      averageScore: 70,
      targetScore: 80,
      rawWeight: 5,
      daysSinceLastStudy: 0,
      mssdVolatility: 2,
      historyLength: 2,
      hasData: true,
      simuladosWithMaxScore: [
        { date: oldDate, score: 70 },
        { date: recentDate, score: 72 }
      ],
      referenceNow: now
    };

    const result = calculateUrgencyScore(metrics, {
      config: { ROTATION_PENALTY_HOURS: 24 }
    });

    expect(result.rotationPenalty).toBeGreaterThanOrEqual(3);
  });

  it('4. weightedRegression limita o slope proporcionalmente ao scoreRange (effectiveMaxScore - minScore)', () => {
    const history = [
      { date: '2026-01-01', score: 200 },
      { date: '2026-01-02', score: 800 }
    ];

    const resEnem = weightedRegression(history, 0.08, 1000, { minScore: 200 });
    expect(resEnem.slope).toBeLessThanOrEqual(40.0001);
    expect(resEnem.slope).toBeGreaterThan(0);

    const histStd = [
      { date: '2026-01-01', score: 10 },
      { date: '2026-01-02', score: 90 }
    ];
    const resStd = weightedRegression(histStd, 0.08, 100, { minScore: 0 });
    expect(resStd.slope).toBeLessThanOrEqual(5.0001);
  });

  it('5. getSafeScore reconhece row.unit === "pct" e scoreUnit === "pct" escalando para a amplitude real', () => {
    // 80% numa prova de 1000 pontos (range 800: min 200, max 1000)
    // 200 + (80/100) * 800 = 840 pontos
    const rowPctUnit = { score: 80, unit: 'pct' };
    const scoreVal = getSafeScore(rowPctUnit, 1000, 200);
    expect(scoreVal).toBe(840);

    const rowScoreUnit = { value: 75, scoreUnit: 'pct' };
    const scoreVal2 = getSafeScore(rowScoreUnit, 100, 0);
    expect(scoreVal2).toBe(75);
  });

  it('6. calculateUrgencyScore permite que currentSrsBoost atinja 1.10x em crunch mode sem corte morto', () => {
    const now = Date.now();
    const oldDate = new Date(now - 1200 * 86400000).toISOString(); // 1200 dias sem estudar -> retenção ~1% -> boost quase máximo
    const targetDate = new Date(now + 4 * 86400000).toISOString(); // 4 dias para prova -> crunch alto (> 1.3)

    const metrics = {
      subject: 'Direito Penal',
      averageScore: 50,
      targetScore: 80,
      rawWeight: 5,
      daysToExam: 4,
      daysSinceLastStudy: 1200,
      mssdVolatility: 5,
      historyLength: 3,
      hasData: true,
      simuladosWithMaxScore: [{ date: oldDate, score: 50 }],
      categoryStudyLogs: []
    };

    const cfg = {
      SRS_BOOST: 15,
      SCORE_MAX: 40,
      RECENCY_MAX: 20,
      INSTABILITY_MAX: 15
    };

    const res = calculateUrgencyScore(metrics, { targetDate, config: cfg });
    // cfg.SRS_BOOST * 2 = 30. Com crunch (1.10x), pode ultrapassar 30 (atingindo até 33) sem ser clampado a 30.
    expect(res.srsBoost).toBeGreaterThan(30);
    expect(res.srsBoost).toBeLessThanOrEqual(33.001);
  });

  it('7. getCognitiveState ignora logs com datas futuras para cálculo dos últimos 7 dias', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const logs = [
      { date: '2026-06-14T10:00:00Z', minutes: 120 }, // passado recente (ontem): 2h
      { date: '2026-06-25T10:00:00Z', minutes: 600 }  // futuro (+10 dias): NÃO deve contar
    ];

    const state = getCognitiveState(logs, { referenceDate: now });
    // Se o log futuro de 600 min fosse contado, dailyLoad/weeklyLoad explodiriam a fadiga
    // Apenas 2h nos 7 dias -> carga leve
    expect(state.fatigue).toBeLessThanOrEqual(50);
  });

  it('8. analisarDesempenhoHistorico não ultrapassa 100% mesmo se acertos > total', () => {
    const historico = [
      { acertos: 150, total: 100, diasRevisao: 1 }
    ];
    const res = analisarDesempenhoHistorico(historico);
    expect(res.projecaoRetencao).toBeLessThanOrEqual(100);
    expect(res.projecaoRetencao).toBeGreaterThan(0);
  });

  it('9. computeContinuousMcBoost legado penaliza alta probabilidade e premia baixa probabilidade', () => {
    // Probabilidade 90% (seguro) -> boost negativo (reduz urgência)
    const safeBoost = computeLegacyMcBoost(90, 30, 80);
    expect(safeBoost).toBeLessThan(0);

    // Probabilidade 10% (perigo) -> boost positivo (aumenta urgência)
    const dangerBoost = computeLegacyMcBoost(10, 30, 80);
    expect(dangerBoost).toBeGreaterThan(0);
  });

  it('10. runMonteCarloAnalysis aceita notas de corte <= 0 quando a escala permite negativos/zero', () => {
    const res = runMonteCarloAnalysis({
      values: [10, 20, 15],
      minScore: -50,
      maxScore: 100,
      targetScore: 20,
      historicalCutoffs: [-10, 0, 15] // cutoffs <= 0 não devem ser descartados
    });
    expect(res).toBeDefined();
    expect(Number.isFinite(res.probability)).toBe(true);
    expect(Number.isFinite(res.mean)).toBe(true);
  });

  it('11. kalmanAbilityTrend calcula covariância de Joseph matematicamente exata com elemento A10', () => {
    const obs = [
      { date: '2026-01-01', score: 50 },
      { date: '2026-01-08', score: 60 },
      { date: '2026-01-15', score: 70 }
    ];
    const res = kalmanAbilityTrend(obs, { maxScore: 100, minScore: 0 });
    expect(res).toBeDefined();
    expect(Number.isFinite(res.abilitySd)).toBe(true);
    expect(Number.isFinite(res.trendSd)).toBe(true);
    expect(res.abilitySd).toBeGreaterThan(0);
    expect(res.trendSd).toBeGreaterThan(0);
    expect(res.ability).toBeGreaterThan(50);
  });

  it('12. computeLearningVelocity e computeConsistencyIndex respeitam minScore sem corte em zero', () => {
    const history = [
      { date: '2026-01-01', score: 300 },
      { date: '2026-01-08', score: 450 },
      { date: '2026-01-15', score: 550 },
      { date: '2026-01-22', score: 650 }
    ];
    // Escala ENEM 200..1000
    const vel = computeLearningVelocity(history, 1000, 200);
    expect(vel.plateau).toBeGreaterThanOrEqual(650);
    expect(vel.plateau).toBeLessThanOrEqual(1000);
    expect(vel.velocity).toBeGreaterThan(0);

    const cons = computeConsistencyIndex(history, 1000, 200);
    expect(cons.index).toBeGreaterThan(0);
    expect(cons.index).toBeLessThanOrEqual(1.0);
  });
  it('13. deriveAdaptiveThresholds em zero variância com notas baixas mantém safe >= 75', () => {
    // Aluno tirou quatro notas 20 em simulados
    const scores = [20, 20, 20, 20];
    const params = deriveAdaptiveRiskThresholds(scores, 5, {}, 100, [], 0);
    expect(params.safe).toBeGreaterThanOrEqual(75);
    expect(params.danger).toBeLessThan(params.safe);
  });

  it('14. calculateTimeWeightedEMA processa objetos com score/date e preserva escalas com minScore', () => {
    const history = [
      { score: 500, date: '2026-01-01' },
      { score: 600, date: '2026-01-15' },
      { score: 700, date: '2026-02-01' }
    ];
    // Escala ENEM 200..1000
    const ema = calculateTimeWeightedEMA(history, 0.05, 1000, 200);
    expect(ema).toBeGreaterThan(500);
    expect(ema).toBeLessThanOrEqual(700);
  });

  it('15. projectScore rebalanceia baseline global com proporcionalidade exata ao minScore', () => {
    const history = [
      { score: 600, date: '2026-01-01' },
      { score: 650, date: '2026-01-15' }
    ];
    // ENEM 200..1000, globalBaselinePct = 50% (que equivale a 600 pontos)
    const res = projectScore(history, 30, 200, 1000, { globalBaselinePct: 50 });
    expect(res.projected).toBeGreaterThanOrEqual(200);
    expect(res.projected).toBeLessThanOrEqual(1000);
  });

  it('16. runStateSpaceModel aceita objetos de simulados e respeita fallback com minScore', () => {
    const history = [
      { score: 600, date: '2026-01-01' },
      { score: 700, date: '2026-01-15' }
    ];
    const res = runStateSpaceModel(history, { maxScore: 1000, minScore: 200 });
    expect(res.ability).toBeGreaterThan(200);
    expect(res.ability).toBeLessThan(1000);

    const emptyRes = runStateSpaceModel([], { maxScore: 1000, minScore: 200 });
    expect(emptyRes.ability).toBe(600); // (200 + 1000) / 2
  });

  it('17. runMonteCarloAnalysis extrai scores de objetos formatados com getSafeScore (scorePct)', () => {
    const res = runMonteCarloAnalysis({
      values: [
        { scorePct: 70, date: '2026-01-01' },
        { scorePct: 75, date: '2026-01-08' },
        { scorePct: 80, date: '2026-01-15' }
      ],
      targetScore: 75,
      simulations: 1000,
      minScore: 0,
      maxScore: 100
    });
    expect(res.mean).toBeGreaterThan(65);
    expect(res.mean).toBeLessThanOrEqual(100);
    expect(res.probability).toBeGreaterThan(0);
  });

  it('18. computeStudyEfficiency e computeCategoryCorrelation utilizam minScore e normalizam corretamente', () => {
    const simulados = [
      { score: 600, total: 50, correct: 30, categoryId: 'cat1' }
    ];
    const sessions = [
      { duration: 60, categoryId: 'cat1' }
    ];
    const eff = computeStudyEfficiency(sessions, simulados, 1000, 'cat1', null, 200);
    expect(eff.accuracyRate).toBeGreaterThan(0);
    expect(eff.accuracyRate).toBeLessThanOrEqual(1);

    const catHistories = {
      c1: [{ score: 600, date: '2026-01-01' }, { score: 700, date: '2026-02-01' }, { score: 650, date: '2026-03-01' }, { score: 800, date: '2026-04-01' }],
      c2: [{ score: 550, date: '2026-01-01' }, { score: 680, date: '2026-02-01' }, { score: 620, date: '2026-03-01' }, { score: 790, date: '2026-04-01' }]
    };
    const corrs = computeCategoryCorrelation(catHistories, 1000, 200);
    expect(Array.isArray(corrs)).toBe(true);
  });

  it('19. analyticsStats: computeCalibrationPenalty processa objetos com scorePct e suporta cutoffs <= 0', () => {
    const mcHistory = [
      { date: '2026-01-01', projectedMean: 60, target: 50, probability: 70 },
      { date: '2026-01-05', projectedMean: 65, target: 50, probability: 80 },
      { date: '2026-01-10', projectedMean: 70, target: 50, probability: 90 },
      { date: '2026-01-15', projectedMean: 72, target: 50, probability: 85 },
      { date: '2026-01-20', projectedMean: 75, target: 50, probability: 95 }
    ];
    const globalHistory = [
      { date: '2026-01-02', scorePct: 55 },
      { date: '2026-01-06', scorePct: 62 },
      { date: '2026-01-11', scorePct: 68 },
      { date: '2026-01-16', scorePct: 70 },
      { date: '2026-01-21', scorePct: 72 }
    ];
    const penalty = computeCalibrationPenalty(mcHistory, globalHistory, null, 100, 0);
    expect(Number.isFinite(penalty)).toBe(true);
    expect(penalty).toBeGreaterThanOrEqual(0);
    expect(penalty).toBeLessThanOrEqual(0.15);
  });

  it('20. analyticsStats: generateAnalyticsStats calcula avgCV relativo sem colapsar a zero em escala 0-1', () => {
    const categories = [
      {
        id: 'math',
        name: 'Matemática',
        maxScore: 1,
        minScore: 0,
        simuladoStats: {
          history: [
            { score: 0.70, date: '2026-01-01' },
            { score: 0.80, date: '2026-01-08' },
            { score: 0.75, date: '2026-01-15' }
          ]
        }
      }
    ];
    const result = generateAnalyticsStats({
      categories,
      debouncedWeights: { math: 1 },
      timeIndex: 0,
      timelineDates: ['2026-01-15'],
      minScore: 0,
      maxScore: 1
    });
    expect(result).not.toBeNull();
    expect(result.consistencyScore).toBeGreaterThan(0);
    expect(result.consistencyScore).toBeLessThanOrEqual(100);
  });

  it('21. stateSpace: runStateSpaceModel escala o ruído de processo e observação proporcionalmente ao domínio', () => {
    const scores = [0.6, 0.7, 0.65, 0.8];
    const resUnit = runStateSpaceModel(scores, { maxScore: 1, minScore: 0 });
    expect(resUnit.ability).toBeGreaterThan(0);
    expect(resUnit.ability).toBeLessThanOrEqual(1.0);
    expect(resUnit.variance).toBeLessThan(1.0);
  });

  it('22. bootstrap: conformalPredictionInterval escala fallback margin de acordo com opções de escala', () => {
    const res = conformalPredictionInterval([0.02, -0.01], 0.05, 0.75, { maxScore: 1, minScore: 0 });
    expect(res.lower).toBeGreaterThanOrEqual(0.5);
    expect(res.upper).toBeLessThanOrEqual(1.0);
  });

  it('23. coachLogic: calculateUrgencyScore normaliza dimensionalmente totalPain para manter escala invariante', () => {
    const metricsEnem = {
      subject: 'Física',
      averageScore: 600,
      targetScore: 800,
      maxScore: 1000,
      minScore: 0,
      rawWeight: 5,
      daysSinceLastStudy: 5,
      mssdVolatility: 20,
      hasData: true,
      categoryStudyLogs: []
    };
    const resEnem = calculateUrgencyScore(metricsEnem);
    expect(resEnem.totalPain).toBeLessThanOrEqual(105);
    expect(resEnem.totalPain).toBeGreaterThan(0);

    const metricsUnit = {
      subject: 'Física',
      averageScore: 0.60,
      targetScore: 0.80,
      maxScore: 1.0,
      minScore: 0,
      rawWeight: 5,
      daysSinceLastStudy: 5,
      mssdVolatility: 0.02,
      hasData: true,
      categoryStudyLogs: []
    };
    const resUnit = calculateUrgencyScore(metricsUnit);
    expect(resUnit.totalPain).toBeLessThanOrEqual(105);
    expect(Math.abs(resEnem.totalPain - resUnit.totalPain)).toBeLessThan(5);
  });

  it('24. diagnostics: computeLearningVelocity usa derivada analítica exata e roomToGrow relativo ao domínio', () => {
    const history = [
      { score: 600, date: '2026-01-01' },
      { score: 650, date: '2026-01-10' },
      { score: 690, date: '2026-01-20' },
      { score: 720, date: '2026-01-30' }
    ];
    const vel = computeLearningVelocity(history, 1000, 500);
    expect(vel.velocity).toBeGreaterThan(0);
    expect(vel.plateau).toBeGreaterThan(500);
    expect(vel.plateau).toBeLessThanOrEqual(1000);
  });

  it('25. diagnostics: computeStudyEfficiency lê minutes e minutos de logs de sessão', () => {
    const studySessions = [
      { minutes: 45, categoryId: 'bio' },
      { minutos: 45, categoryId: 'bio' }
    ];
    const simulados = [
      { total: 30, correct: 24, categoryId: 'bio' }
    ];
    const eff = computeStudyEfficiency(studySessions, simulados, 100, 'bio');
    expect(eff.totalMinutes).toBe(90);
    expect(eff.questionsPerHour).toBe(20);
  });

  it('26. stats: computeHierarchicalAdjustment preserva pooledSD = 0 sem substituir por 15', () => {
    const cats = [
      { mean: 75, sd: 5, n: 10, weight: 1 },
      { mean: 75, sd: 5, n: 10, weight: 1 }
    ];
    const adjusted = computeHierarchicalAdjustment(cats, 0);
    expect(adjusted[0].bayesianSd).toBeLessThan(10);
  });

  it('27. coachEvaluator: compareEvaluationSummaries evita explosão em baseline de erro próximo de zero', () => {
    const baseline = {
      probability: { avgBrier: 0.001, ece: 0.001 },
      score: { mae: 0.1 },
      topics: { avgNdcg: 0.9 }
    };
    const candidate = {
      probability: { avgBrier: 0.05, ece: 0.02 },
      score: { mae: 0.15 },
      topics: { avgNdcg: 0.88 }
    };
    const comp = compareEvaluationSummaries(baseline, candidate);
    expect(comp.heuristicScore).toBeGreaterThanOrEqual(-1);
    expect(comp.heuristicScore).toBeLessThanOrEqual(1);
  });
});