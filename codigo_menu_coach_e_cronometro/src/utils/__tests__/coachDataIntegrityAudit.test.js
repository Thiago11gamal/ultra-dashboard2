import { describe, it, expect } from 'vitest';
import {
  getCombinedHistory,
  getSuggestedFocus,
  generateDailyGoals,
  calculateUrgency,
  extractMetrics,
  getWeakestTopic,
  getWeakestTopicsList,
  _buildSortedTopics
} from '../coachLogic.js';
import { deriveAdaptiveRiskThresholds, deriveBacktestWeights } from '../coachAdaptive.js';

describe('COACH AI DATA INTEGRITY AUDIT', () => {
  describe('1. getCombinedHistory Alias and Data Loss Prevention', () => {
    it('does not drop legacy rows that use questoes and acertos instead of total and correct', () => {
      const historyRows = [
        {
          id: 'row-1',
          date: '2026-03-01',
          questoes: 40,
          acertos: 32,
          subject: 'Direito Constitucional'
        },
        {
          id: 'row-2',
          date: '2026-03-02',
          totalQuestoes: 50,
          correctCount: 40,
          categoryName: 'Direito Administrativo'
        }
      ];

      const simulados = [];
      const combined = getCombinedHistory(historyRows, simulados, 100, 0);

      expect(combined.length).toBe(2);
      const row1 = combined.find(c => c.date === '2026-03-01');
      const row2 = combined.find(c => c.date === '2026-03-02');
      expect(row1).toBeDefined();
      expect(row1.score).toBeCloseTo(80, 1);
      expect(row2).toBeDefined();
      expect(row2.score).toBeCloseTo(80, 1);
    });

    it('distinguishes simulados with different categoryName or materia without colliding into geral', () => {
      const simulados = [
        {
          id: 's1',
          categoryName: 'Direito Constitucional',
          date: '2026-03-10',
          score: 80,
          questoes: 20,
          acertos: 16
        },
        {
          id: 's2',
          materia: 'Direito Administrativo',
          date: '2026-03-10',
          score: 80,
          questoes: 20,
          acertos: 16
        }
      ];

      const combined = getCombinedHistory([], simulados, 100, 0);
      expect(combined.length).toBe(2);
    });
  });

  describe('2. _buildSortedTopics Topic and Alias Handling', () => {
    it('correctly aggregates single-topic history entries that lack entry.topics array', () => {
      const category = {
        id: 'cat-1',
        name: 'Português',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            {
              id: 'h1',
              date: '2026-03-10',
              assunto: 'Crase',
              questoes: 30,
              acertos: 27
            },
            {
              id: 'h2',
              date: '2026-03-11',
              topic: 'Pontuação',
              totalQuestoes: 20,
              correctCount: 10
            }
          ]
        }
      };

      const topics = _buildSortedTopics(category, [], 100, 0);
      expect(topics.length).toBe(2);
      const crase = topics.find(t => t.name === 'Crase');
      const pontuacao = topics.find(t => t.name === 'Pontuação');
      expect(crase).toBeDefined();
      expect(crase.percentage).toBeCloseTo(90, 1);
      expect(pontuacao).toBeDefined();
      expect(pontuacao.percentage).toBeCloseTo(50, 1);
    });

    it('uses real question count for topics with questoes instead of falling back to synthetic 20', () => {
      const category = {
        id: 'cat-2',
        name: 'Matemática',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            {
              id: 'h1',
              date: new Date().toISOString().slice(0, 10),
              topics: [
                {
                  name: 'Probabilidade',
                  questoes: 80,
                  acertos: 60
                }
              ]
            }
          ]
        }
      };

      const topics = _buildSortedTopics(category, [], 100, 0);
      expect(topics.length).toBe(1);
      expect(topics[0].name).toBe('Probabilidade');
      expect(topics[0].scores[0].total).toBe(80);
      expect(topics[0].total).toBeGreaterThan(70);
      expect(topics[0].percentage).toBeCloseTo(75, 1);
    });
  });

  describe('3. extractMetrics Subject Resolution and Aliases', () => {
    it('matches simulados with categoryName or materia and respects question aliases in baseline', () => {
      const category = {
        id: 'cat-dir',
        name: 'Direito Penal',
        maxScore: 100,
        minScore: 0
      };

      const simulados = [
        {
          id: 'sim-1',
          categoryName: 'Direito Penal',
          date: '2026-03-01',
          questoes: 50,
          acertos: 40
        },
        {
          id: 'sim-2',
          materia: 'Direito Penal',
          date: '2026-03-05',
          score: 85
        }
      ];

      const metrics = extractMetrics(category, simulados, [], { maxScore: 100, minScore: 0 });
      expect(metrics.simuladosWithMaxScore.length).toBe(2);
      expect(metrics.averageScore).toBeGreaterThan(75);
    });

    it('matches studyLogs by categoryName or numeric id and respects minutos/duration', () => {
      const category = {
        id: 123,
        name: 'Informática',
        maxScore: 100,
        minScore: 0
      };

      const studyLogs = [
        {
          id: 'log-1',
          categoryId: '123', // string id match
          date: '2026-03-10',
          minutos: 60
        },
        {
          id: 'log-2',
          subject: 'Informática', // subject match without categoryId
          createdAt: '2026-03-12',
          duration: 45
        }
      ];

      const metrics = extractMetrics(category, [], studyLogs, {
        now: new Date('2026-03-15'),
        maxScore: 100,
        minScore: 0
      });
      expect(metrics.categoryStudyLogs.length).toBe(2);
      expect(metrics.daysSinceLastStudy).toBeGreaterThanOrEqual(2);
      expect(metrics.daysSinceLastStudy).toBeLessThanOrEqual(3);
    });
  });

  describe('4. Score Domain Non-Zero MinScore (ENEM / Negative Scale)', () => {
    it('getWeakestTopic and _buildSortedTopics properly honor non-zero minScore floor', () => {
      const category = {
        id: 'cat-enem',
        name: 'Ciências da Natureza',
        maxScore: 1000,
        minScore: 200,
        simuladoStats: {
          history: [
            {
              id: 'h1',
              date: '2026-03-10',
              topics: [
                {
                  name: 'Termodinâmica',
                  score: 600 // (600 - 200) / (1000 - 200) = 400/800 = 50%
                }
              ]
            }
          ]
        }
      };

      const topic = getWeakestTopic(category, [], 1000, 200);
      expect(topic).toBeDefined();
      expect(topic.name).toBe('Termodinâmica');
      expect(topic.percentage).toBeCloseTo(50, 1);
    });

    it('deriveAdaptiveRiskThresholds scales scores relative to minScore floor', () => {
      // Scale 200 to 1000
      // Score 600 is 50%
      const scores = [600, 600, 600, 600];
      const thresholds = deriveAdaptiveRiskThresholds(scores, null, {}, 1000, [], 200);
      expect(thresholds.danger).toBeDefined();
      expect(thresholds.safe).toBeDefined();
      expect(thresholds.danger).toBeLessThan(thresholds.safe);
    });

    it('deriveBacktestWeights respects minScore floor for 70% rankQuality', () => {
      // ENEM: minScore 200, maxScore 1000. 70% threshold is 200 + 0.7 * 800 = 760.
      const scores = [700, 750, 780, 800];
      const weights = deriveBacktestWeights(scores, 1000, 200);
      expect(weights.rankQuality).toBe(0.5); // only 780 and 800 >= 760
    });
  });

  describe('5. getSuggestedFocus and generateDailyGoals Integration', () => {
    it('provides weakestTopic with correct minScore and handles flashcardDue', () => {
      const categories = [
        {
          id: 'c1',
          name: 'Raciocínio Lógico',
          maxScore: 100,
          minScore: 0,
          simuladoStats: {
            history: [
              {
                id: 'h1',
                date: '2026-03-01',
                topics: [{ name: 'Tabelas Verdade', total: 10, correct: 2 }]
              }
            ]
          }
        }
      ];

      const focus = getSuggestedFocus(categories, [], [], {
        maxScore: 100,
        minScore: 0,
        flashcardDue: 15
      });

      expect(focus).toBeDefined();
      expect(focus.name).toBe('Raciocínio Lógico');
      expect(focus.weakestTopic).toBeDefined();
      expect(focus.weakestTopic.name).toBe('Tabelas Verdade');
      expect(focus.flashcardDue).toBe(15);
    });

    it('generateDailyGoals uses aliases for study logs and simulados to avoid false trap alerts', () => {
      const categories = [
        {
          id: 'c1',
          name: 'Português',
          maxScore: 100,
          minScore: 0
        }
      ];

      const simulados = [
        {
          id: 's1',
          materia: 'Português',
          date: '2026-03-10',
          questoes: 60,
          acertos: 45
        }
      ];

      const studyLogs = [
        {
          id: 'l1',
          categoryName: 'Português',
          date: '2026-03-10',
          minutos: 60
        }
      ];

      const goals = generateDailyGoals(categories, simulados, studyLogs, {
        now: new Date('2026-03-12'),
        maxScore: 100,
        minScore: 0
      });

      expect(Array.isArray(goals)).toBe(true);
      // Questions per hour was 60 / 1h = 60/h (high volume). Should NOT trigger pseudo-study trap!
      const trapTask = goals.find(g => g.id.includes('trap'));
      expect(trapTask).toBeUndefined();
    });
  });
});
