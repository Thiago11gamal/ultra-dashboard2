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
});
