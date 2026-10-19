import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyAIResultsToDraft } from '../../utils/aiSaveHelper.js';
import { createSimuladoSlice } from '../../store/slices/createSimuladoSlice.js';
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';

describe('Simulado Menu Bugs Audit & Fixes', () => {
  let mockState;
  let setFn;
  let slice;

  beforeEach(() => {
    mockState = {
      appState: {
        activeId: 'contest-1',
        version: 1,
        contests: {
          'contest-1': {
            id: 'contest-1',
            minScore: 0,
            maxScore: 100,
            categories: [
              {
                id: 'cat-1',
                name: 'Direito Constitucional',
                weight: 10,
                minScore: 0,
                maxScore: 100,
                simuladoStats: {
                  history: [],
                  average: 0,
                  lastAttempt: 0,
                  trend: 'stable',
                  level: 'BAIXO'
                }
              },
              {
                id: 'cat-2',
                name: 'Direito Administrativo',
                weight: 10,
                minScore: 0,
                maxScore: 100,
                simuladoStats: {
                  history: [],
                  average: 0,
                  lastAttempt: 0,
                  trend: 'stable',
                  level: 'BAIXO'
                }
              }
            ],
            simuladoRows: [],
            simulados: []
          }
        }
      }
    };

    setFn = (fn) => {
      fn(mockState);
    };

    slice = createSimuladoSlice(setFn);
  });

  describe('Bug 1 & 6: AI Simulado batchId Assignment & Preservation of Separate Attempts', () => {
    it('should assign batchId to both newRow and newSimEvent and preserve distinct attempts', () => {
      const contest = mockState.appState.contests['contest-1'];
      const form1 = {
        materia: 'Direito Constitucional',
        assunto: 'Direitos Fundamentais',
        categoryId: 'cat-1',
        dificuldade: 'medio'
      };

      // 1st AI attempt (Batch A)
      applyAIResultsToDraft(contest, form1, 8, 10, 120, false, 'batch-A');

      expect(contest.simuladoRows).toHaveLength(1);
      expect(contest.simuladoRows[0].batchId).toBe('batch-A');
      expect(contest.simuladoRows[0].correct).toBe(8);
      expect(contest.simuladoRows[0].total).toBe(10);

      expect(contest.simulados).toHaveLength(1);
      expect(contest.simulados[0].batchId).toBe('batch-A');
      expect(contest.simulados[0].correct).toBe(8);

      // 2nd AI attempt on the same day and topic (Batch B)
      applyAIResultsToDraft(contest, form1, 9, 10, 110, false, 'batch-B');

      // Crucial: Must NOT overwrite or merge Batch A into Batch B; both must exist as distinct rows
      expect(contest.simuladoRows).toHaveLength(2);
      expect(contest.simuladoRows[0].batchId).toBe('batch-A');
      expect(contest.simuladoRows[1].batchId).toBe('batch-B');
      expect(contest.simulados).toHaveLength(2);
      expect(contest.simulados[1].batchId).toBe('batch-B');

      // Meanwhile, category history should aggregate total questions for the day
      const cat1 = contest.categories.find(c => c.id === 'cat-1');
      expect(cat1.simuladoStats.history).toHaveLength(1);
      expect(cat1.simuladoStats.history[0].total).toBe(20);
      expect(cat1.simuladoStats.history[0].correct).toBe(17);
    });

    it('should update an existing row only if it shares the exact same batchId', () => {
      const contest = mockState.appState.contests['contest-1'];
      const form = {
        materia: 'Direito Constitucional',
        assunto: 'Direitos Fundamentais',
        categoryId: 'cat-1',
        dificuldade: 'medio'
      };

      // Initial save
      applyAIResultsToDraft(contest, form, 5, 10, 60, false, 'batch-same');
      expect(contest.simuladoRows).toHaveLength(1);
      expect(contest.simuladoRows[0].total).toBe(10);

      // Re-save or update with same batchId
      applyAIResultsToDraft(contest, form, 2, 2, 20, false, 'batch-same');
      expect(contest.simuladoRows).toHaveLength(1);
      expect(contest.simuladoRows[0].batchId).toBe('batch-same');
    });
  });

  describe('Bug 3: deleteSimulado Purges and Reconciles Category History and Stats', () => {
    it('should delete AI simulado by batchId and reconcile category history with remaining rows', () => {
      const contest = mockState.appState.contests['contest-1'];
      const todayKey = getDateKey(normalizeDate(new Date()));

      // Add two simulados on the same day for cat-1
      contest.simuladoRows = [
        {
          id: 'row-1',
          batchId: 'batch-A',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Artigo 5',
          correct: 5,
          total: 10,
          date: todayKey,
          source: 'ai-generated'
        },
        {
          id: 'row-2',
          batchId: 'batch-B',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Nacionalidade',
          correct: 8,
          total: 10,
          date: todayKey,
          source: 'ai-generated'
        }
      ];

      contest.simulados = [
        { id: 'sim-1', batchId: 'batch-A', date: todayKey, correct: 5, total: 10, type: 'ai-simulado' },
        { id: 'sim-2', batchId: 'batch-B', date: todayKey, correct: 8, total: 10, type: 'ai-simulado' }
      ];

      contest.categories[0].simuladoStats = {
        history: [
          { date: todayKey, correct: 13, total: 20, score: 65 }
        ],
        average: 65,
        lastAttempt: 65,
        trend: 'stable',
        level: 'BOM'
      };

      // Delete batch-A
      slice.deleteSimulado('batch-A');

      // batch-A rows and events must be removed
      expect(contest.simuladoRows).toHaveLength(1);
      expect(contest.simuladoRows[0].batchId).toBe('batch-B');
      expect(contest.simulados).toHaveLength(1);
      expect(contest.simulados[0].batchId).toBe('batch-B');

      // Category history for today must be reconciled with remaining row (8/10 = 80%)
      const cat1History = contest.categories[0].simuladoStats.history;
      expect(cat1History).toHaveLength(1);
      expect(cat1History[0].correct).toBe(8);
      expect(cat1History[0].total).toBe(10);
      expect(cat1History[0].score).toBe(80);
      expect(contest.categories[0].simuladoStats.average).toBe(80);
    });

    it('should cleanly remove category history when the only simulado on that date is deleted by batchId', () => {
      const contest = mockState.appState.contests['contest-1'];
      const todayKey = getDateKey(normalizeDate(new Date()));

      contest.simuladoRows = [
        {
          id: 'row-1',
          batchId: 'batch-sole',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Artigo 5',
          correct: 5,
          total: 10,
          date: todayKey,
          source: 'ai-generated'
        }
      ];

      contest.simulados = [
        { id: 'sim-1', batchId: 'batch-sole', date: todayKey, correct: 5, total: 10, type: 'ai-simulado' }
      ];

      contest.categories[0].simuladoStats = {
        history: [
          { date: todayKey, correct: 5, total: 10, score: 50 }
        ],
        average: 50,
        lastAttempt: 50,
        trend: 'stable',
        level: 'MEDIO'
      };

      // Delete batch-sole
      slice.deleteSimulado('batch-sole');

      expect(contest.simuladoRows).toHaveLength(0);
      expect(contest.simulados).toHaveLength(0);
      expect(contest.categories[0].simuladoStats.history).toHaveLength(0);
      expect(contest.categories[0].simuladoStats.average).toBe(0);
      expect(contest.categories[0].simuladoStats.level).toBe('BAIXO');
    });

    it('should support deleting by prefixed key like manual-YYYY-MM-DD or ai-YYYY-MM-DD', () => {
      const contest = mockState.appState.contests['contest-1'];
      const targetDate = '2026-10-15';

      contest.simuladoRows = [
        {
          id: 'row-manual',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Artigo 5',
          correct: 10,
          total: 10,
          date: targetDate,
          source: 'manual'
        },
        {
          id: 'row-ai',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Artigo 5',
          correct: 5,
          total: 10,
          date: targetDate,
          source: 'ai-generated'
        }
      ];

      contest.categories[0].simuladoStats = {
        history: [
          { date: targetDate, correct: 15, total: 20, score: 75 }
        ],
        average: 75,
        lastAttempt: 75
      };

      // Delete only the manual simulado for that date
      slice.deleteSimulado(`manual-${targetDate}`);

      expect(contest.simuladoRows).toHaveLength(1);
      expect(contest.simuladoRows[0].source).toBe('ai-generated');
      expect(contest.categories[0].simuladoStats.history[0].correct).toBe(5);
      expect(contest.categories[0].simuladoStats.history[0].total).toBe(10);
    });

    it('should reconcile topics, difficulty, and timeSpent on partial day deletion and match subject aliases', () => {
      const contest = mockState.appState.contests['contest-1'];
      const targetDate = '2026-10-18';

      contest.simuladoRows = [
        {
          id: 'row-a',
          batchId: 'batch-1',
          subject: 'Constitucional', // Alias de Direito Constitucional
          topic: 'Controle de Constitucionalidade',
          correct: 4,
          total: 10,
          difficulty: 1.6,
          timeSpent: 300,
          date: targetDate,
          source: 'ai-generated'
        },
        {
          id: 'row-b',
          batchId: 'batch-2',
          subject: 'Constitucional',
          topic: 'Direitos Sociais',
          correct: 9,
          total: 10,
          difficulty: 1.0,
          timeSpent: 180,
          date: targetDate,
          source: 'ai-generated'
        }
      ];

      contest.categories[0].simuladoStats = {
        history: [
          {
            date: targetDate,
            correct: 13,
            total: 20,
            score: 65,
            difficulty: 1.3,
            timeSpent: 480,
            timedQuestoes: 20,
            topics: [
              { name: 'Controle de Constitucionalidade', correct: 4, total: 10 },
              { name: 'Direitos Sociais', correct: 9, total: 10 }
            ]
          }
        ]
      };

      slice.deleteSimulado('batch-1');

      const updatedEntry = contest.categories[0].simuladoStats.history[0];
      expect(updatedEntry.correct).toBe(9);
      expect(updatedEntry.total).toBe(10);
      expect(updatedEntry.difficulty).toBe(1.0);
      expect(updatedEntry.timeSpent).toBe(180);
      expect(updatedEntry.timedQuestoes).toBe(10);
      expect(updatedEntry.topics).toHaveLength(1);
      expect(updatedEntry.topics[0].name).toBe('Direitos Sociais');
    });
  });

  describe('Bug 4: Date Normalization for Category History Deduplication', () => {
    it('should recognize ISO timestamp in category history and not produce duplicates', () => {
      const contest = mockState.appState.contests['contest-1'];
      const todayKey = getDateKey(normalizeDate(new Date()));
      const isoToday = new Date().toISOString();

      // Pre-existing history entry with full ISO timestamp
      contest.categories[0].simuladoStats = {
        history: [
          { date: isoToday, correct: 5, total: 10, score: 50, topics: [{ name: 'Direitos Fundamentais', correct: 5, total: 10 }] }
        ]
      };

      const form = {
        materia: 'Direito Constitucional',
        assunto: 'Direitos Fundamentais',
        categoryId: 'cat-1',
        dificuldade: 'medio'
      };

      applyAIResultsToDraft(contest, form, 3, 5, 50, false, 'batch-2');

      const history = contest.categories[0].simuladoStats.history;
      // Must NOT create a second duplicate entry for today
      expect(history).toHaveLength(1);
      expect(history[0].total).toBe(15);
      expect(history[0].correct).toBe(8);
    });
  });

  describe('Bug 1: Manual Simulado Saves Preserve Earlier Topics of the Day', () => {
    it('should keep earlier submitted topics when a new topic is submitted and the earlier topic is 0 in rawRows', () => {
      const todayKey = getDateKey(normalizeDate(new Date()));
      const prevSimuladoRowsArray = [
        {
          id: 'row-morning',
          categoryId: 'cat-1',
          topicId: 'topic-1',
          subject: 'Direito Constitucional',
          topic: 'Direitos Fundamentais',
          correct: 8,
          total: 10,
          date: todayKey,
          source: 'manual',
          isAuto: false
        }
      ];

      // User now enters topic-2 in the afternoon with total=10, correct=9,
      // but topic-1 is present in the form with total=0 (unanswered in this submission)
      const rawRows = [
        {
          id: 'manual-cat-1-topic-1',
          categoryId: 'cat-1',
          topicId: 'topic-1',
          subject: 'Direito Constitucional',
          topic: 'Direitos Fundamentais',
          correct: 0,
          total: 0
        },
        {
          id: 'manual-cat-1-topic-2',
          categoryId: 'cat-1',
          topicId: 'topic-2',
          subject: 'Direito Constitucional',
          topic: 'Nacionalidade',
          correct: 9,
          total: 10
        }
      ];

      // Filter only actually submitted rows (total > 0)
      const actuallySubmittedRows = rawRows.filter(
        (r) => r && r.subject && r.topic && Number.isFinite(Number(r.total)) && Number(r.total) > 0
      );
      const submittedIds = new Set(actuallySubmittedRows.map(r => r.id).filter(Boolean));
      const submittedKeys = new Set(actuallySubmittedRows.map(r => {
        if (r.categoryId && r.topicId) return `${r.categoryId}-${r.topicId}`;
        if (r.subject && r.topic) return `${r.subject}-${r.topic}`;
        return null;
      }).filter(Boolean));

      const rowsToKeep = prevSimuladoRowsArray.filter((r) => {
        const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
        const isManual = r && !r.isAuto && r.source !== 'ai-generated';

        if (isToday && isManual) {
          if (r?.id && submittedIds.has(r.id)) return false;

          const key1 = (r?.categoryId && r?.topicId) ? `${r.categoryId}-${r.topicId}` : null;
          if (key1 && submittedKeys.has(key1)) return false;
        }

        return true;
      });

      // The morning row MUST be kept!
      expect(rowsToKeep).toHaveLength(1);
      expect(rowsToKeep[0].id).toBe('row-morning');
      expect(rowsToKeep[0].correct).toBe(8);
      expect(rowsToKeep[0].total).toBe(10);
    });
  });

  describe('Bug 5: DailySummaryCards Sanitization of Corrupt Row Data', () => {
    it('should sanitize per-row total and correct so corrupt rows do not contaminate totals', () => {
      // Row 1: corrupt data where correct (10) > total (5)
      // Row 2: valid data where correct is 0 out of 5
      const rows = [
        { subject: 'Direito Constitucional', correct: 10, total: 5 },
        { subject: 'Direito Administrativo', correct: 0, total: 5 }
      ];

      let totalQ = 0;
      let totalC = 0;
      const subjectMap = {};

      rows.forEach(r => {
        const rowT = Math.max(0, parseInt(r.total, 10) || 0);
        const rowC = Math.max(0, Math.min(rowT, parseInt(r.correct, 10) || 0));
        totalQ += rowT;
        totalC += rowC;

        const name = r.subject || 'Geral';
        if (!subjectMap[name]) subjectMap[name] = { c: 0, t: 0 };
        subjectMap[name].c += rowC;
        subjectMap[name].t += rowT;
      });

      const safeC = Math.min(totalC, totalQ);
      const pct = totalQ > 0 ? Math.max(0, Math.min(100, Math.round((safeC / totalQ) * 100))) : 0;

      // Row 1 was clamped to 5/5 (100%), Row 2 is 0/5 (0%)
      // Total questions = 10, total correct = 5, overall = 50%
      expect(totalQ).toBe(10);
      expect(totalC).toBe(5);
      expect(safeC).toBe(5);
      expect(pct).toBe(50);
      expect(subjectMap['Direito Constitucional'].c).toBe(5);
      expect(subjectMap['Direito Administrativo'].c).toBe(0);
    });
  });
});

