import { describe, it, expect } from 'vitest';
import { sanitizeContest, repairContestHistory, validateAppState } from '../schemas.js';
import { normalizeSimuladoLevel } from '../../utils/colorHelper.js';
import { RECOVERED_DIREITO_CONTEST } from '../../data/recoveredContests.js';

describe('Data Integrity & Schema Sanitization Audit', () => {
  it('recovers missing average and lastAttempt from history in sanitizeContest', () => {
    const rawContest = {
      contestName: 'Teste Concurso',
      categories: [
        {
          id: 'cat-1',
          name: 'Português',
          color: '#3b82f6',
          simuladoStats: {
            average: 0, // Corrompido/zerado
            lastAttempt: 0,
            history: [
              { date: '2026-11-01', score: 70, total: 10, correct: 7 },
              { date: '2026-11-05', score: 90, total: 10, correct: 9 }
            ]
          }
        }
      ]
    };

    const sanitized = sanitizeContest(rawContest);
    const cat = sanitized.categories[0];

    expect(cat.simuladoStats.average).toBe(80); // (70 + 90) / 2
    expect(cat.simuladoStats.lastAttempt).toBe(90); // Latest score
    expect(cat.simuladoStats.level).toBe('ALTO');
  });

  it('sorts history chronologically and assigns lastAttempt to the true chronological latest', () => {
    const rawContest = {
      contestName: 'Teste Ordem',
      categories: [
        {
          id: 'cat-ordem',
          name: 'Matemática',
          simuladoStats: {
            average: 0,
            lastAttempt: 0,
            history: [
              { date: '2026-11-10', score: 85, total: 10, correct: 8 },
              { date: '2026-11-01', score: 50, total: 10, correct: 5 },
              { date: '2026-11-05', score: 65, total: 10, correct: 6 }
            ]
          }
        }
      ]
    };

    const sanitized = sanitizeContest(rawContest);
    const cat = sanitized.categories[0];

    // History should be sorted: 2026-11-01 (50), 2026-11-05 (65), 2026-11-10 (85)
    expect(cat.simuladoStats.history[0].date).toBe('2026-11-01');
    expect(cat.simuladoStats.history[2].date).toBe('2026-11-10');
    expect(cat.simuladoStats.lastAttempt).toBe(85);
  });

  it('correctly clamps out-of-range scores and corrects invalid correct/total in history', () => {
    const rawContest = {
      contestName: 'Teste Clamping',
      categories: [
        {
          id: 'cat-clamp',
          name: 'Informática',
          maxScore: 100,
          minScore: 0,
          simuladoStats: {
            history: [
              { date: '2026-11-01', score: 150, total: 10, correct: 15 } // score > 100, correct > total
            ]
          }
        }
      ]
    };

    const sanitized = sanitizeContest(rawContest);
    const h = sanitized.categories[0].simuladoStats.history[0];

    expect(h.score).toBe(100);
    expect(h.correct).toBe(10); // clamped to total
    expect(h.total).toBe(10);
  });

  it('normalizes task priorities and task text/title safely', () => {
    const rawContest = {
      contestName: 'Teste Tarefas',
      categories: [
        {
          id: 'cat-tasks',
          name: 'Constitucional',
          tasks: [
            { id: 't-1', text: 'Artigo 5', priority: 'alta' },
            { id: 't-2', text: 'Direitos Sociais', priority: 'baixa' },
            { id: 't-3', text: 'Nacionalidade', priority: 'HIGH' }
          ]
        }
      ]
    };

    const sanitized = sanitizeContest(rawContest);
    const tasks = sanitized.categories[0].tasks;

    expect(tasks[0].priority).toBe('high');
    expect(tasks[1].priority).toBe('low');
    expect(tasks[2].priority).toBe('high');
  });

  it('caps runaway studyLogs and studySessions to 720 minutes', () => {
    const rawContest = {
      contestName: 'Teste Runaway',
      studyLogs: [
        { id: 'l-1', minutes: 50, date: '2026-11-01' },
        { id: 'l-2', minutes: 999999, date: '2026-11-02' } // Runaway
      ],
      studySessions: [
        { id: 's-1', duration: 30, startTime: '2026-11-01' },
        { id: 's-2', duration: 15000, startTime: '2026-11-02' } // Runaway
      ]
    };

    const sanitized = sanitizeContest(rawContest);

    expect(sanitized.studyLogs[0].minutes).toBe(50);
    expect(sanitized.studyLogs[1].minutes).toBe(720); // Capped to 12h
    expect(sanitized.studySessions[0].duration).toBe(30);
    expect(sanitized.studySessions[1].duration).toBe(720); // Capped to 12h
  });

  it('sanitizes and clamps monteCarloHistory entries', () => {
    const rawContest = {
      contestName: 'Teste MC',
      monteCarloHistory: [
        { date: '2026-11-03', probability: 85 },
        { date: '2026-11-01', probability: 120 }, // out of range
        { date: '2026-11-02', probability: -10 }, // negative
        { date: null, probability: 50 } // invalid date
      ]
    };

    const sanitized = sanitizeContest(rawContest);
    const mc = sanitized.monteCarloHistory;

    expect(mc.length).toBe(3); // null date filtered out
    expect(mc[0].date).toBe('2026-11-01');
    expect(mc[0].probability).toBe(100); // clamped
    expect(mc[1].date).toBe('2026-11-02');
    expect(mc[1].probability).toBe(0); // clamped
    expect(mc[2].date).toBe('2026-11-03');
    expect(mc[2].probability).toBe(85);
  });

  it('normalizes simulado level respecting non-zero minScore', () => {
    // 200 - 1000 scale (range 800)
    // 70% threshold is 200 + 0.7 * 800 = 760
    // 40% threshold is 200 + 0.4 * 800 = 520
    const levelHigh = normalizeSimuladoLevel(undefined, 770, 1000, 200);
    expect(levelHigh.key).toBe('ALTO');

    const levelMed = normalizeSimuladoLevel(undefined, 600, 1000, 200);
    expect(levelMed.key).toBe('MÉDIO');

    const levelLow = normalizeSimuladoLevel(undefined, 450, 1000, 200);
    expect(levelLow.key).toBe('BAIXO');
  });

  it('verifies recovered Direito contest has accurate data and levels', () => {
    const adminCat = RECOVERED_DIREITO_CONTEST.categories.find(c => c.name === 'Direito Administrativo');
    expect(adminCat.simuladoStats.average).toBe(38.18);
    expect(adminCat.simuladoStats.level).toBe('BAIXO');
    expect(adminCat.simuladoStats.history[0].correct).toBe(38);
    expect(adminCat.simuladoStats.history[0].total).toBe(100);
  });

  it('defends against corrupt user targetScore and xp', () => {
    const rawContest = {
      contestName: 'Corrupt User',
      user: {
        targetScore: 'not-a-number',
        xp: -50,
        level: -2,
        targetProbability: 250
      }
    };

    const sanitized = sanitizeContest(rawContest);
    expect(sanitized.user.targetScore).toBe(75); // DEFAULT_TARGET_SCORE
    expect(sanitized.user.xp).toBe(0);
    expect(sanitized.user.level).toBe(1);
    expect(sanitized.user.targetProbability).toBe(100);
  });
});

