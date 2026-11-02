import { describe, it, expect } from 'vitest';
import { computeBayesianProficiency, calculateUrgencyScore } from '../coachLogic.js';
import { weightedRegression } from '../../engine/stats.js';

describe('Auditoria Matemática - Fixes Cirúrgicos Verificados', () => {
  it('1. computeBayesianProficiency sanitiza inputs anômalos (acertos > total ou negativos)', () => {
    // Se vier acertos = 12 e total = 10 por log corrompido, não pode explodir além de 1
    const profOver = computeBayesianProficiency(12, 10, 0.5, 100);
    expect(profOver).toBeLessThanOrEqual(1.0);
    expect(profOver).toBeGreaterThan(0.5);

    // Se vier negativo, trata com segurança no limite inferior
    const profNeg = computeBayesianProficiency(-5, 10, 0.5, 100);
    expect(profNeg).toBeGreaterThanOrEqual(0.0);
    expect(profNeg).toBeLessThanOrEqual(1.0);
  });

  it('2. calculateUrgencyScore permite que currentPriorityBoost atinja 1.15x em crunch mode', () => {
    // Configurando métricas com crunchMultiplier > 1.3 e hasHighPriorityTasks = true
    const targetDate = new Date(Date.now() + 5 * 86400000).toISOString(); // 5 dias (crunch alto)
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
    // Em crunchMultiplier > 1.3, priorityBoost era clampado a 40. Agora pode chegar a 40 * 1.15 = 46.
    expect(result.priorityBoost).toBeGreaterThan(40);
    expect(result.priorityBoost).toBeLessThanOrEqual(46);
  });

  it('3. calculateUrgencyScore seleciona o timestamp mais recente independente da ordem do array', () => {
    const now = Date.now();
    const oldDate = new Date(now - 10 * 86400000).toISOString(); // 10 dias atrás
    const recentDate = new Date(now - 2 * 3600000).toISOString(); // 2 horas atrás

    // Array desordenado (antigo primeiro)
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

    // Como o simulado mais recente foi há 2 horas, deve aplicar penalidade de rotação/fadiga
    expect(result.rotationPenalty).toBeGreaterThanOrEqual(3);
  });

  it('4. weightedRegression limita o slope proporcionalmente ao scoreRange (effectiveMaxScore - minScore)', () => {
    // Histórico com subida artificialmente gigantesca
    const history = [
      { date: '2026-01-01', score: 200 },
      { date: '2026-01-02', score: 800 }
    ];

    // Escala ENEM: min 200, max 1000 -> range 800. Slope máx = 800 * 0.05 = 40 pts/dia
    const resEnem = weightedRegression(history, 0.08, 1000, { minScore: 200 });
    expect(resEnem.slope).toBeLessThanOrEqual(40.0001);
    expect(resEnem.slope).toBeGreaterThan(0);

    // Escala Padrão: min 0, max 100 -> range 100. Slope máx = 100 * 0.05 = 5 pts/dia
    const histStd = [
      { date: '2026-01-01', score: 10 },
      { date: '2026-01-02', score: 90 }
    ];
    const resStd = weightedRegression(histStd, 0.08, 100, { minScore: 0 });
    expect(resStd.slope).toBeLessThanOrEqual(5.0001);
  });
});
