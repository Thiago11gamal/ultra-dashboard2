import { describe, it, expect, beforeEach } from 'vitest';
import { applyAIResultsToDraft } from '../../utils/aiSaveHelper.js';
import { createSimuladoSlice } from '../../store/slices/createSimuladoSlice.js';
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';
import { normalize } from '../../utils/normalization.js';

describe('Menu Simulados Full Audit - Bug Suite', () => {
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

  describe('Bug 1: Manual Simulado Event deletion in deleteSimulado', () => {
    it('should delete manual event with type "auto-analyzer" when deleteSimulado is called with manual-YYYY-MM-DD', () => {
      const contest = mockState.appState.contests['contest-1'];
      const todayKey = '2026-11-14';

      // Setup: A manual row and a manual event created by Simulados.jsx
      contest.simuladoRows = [
        {
          id: 'row-man-1',
          batchId: 'batch-manual-1',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Artigo 5',
          correct: 8,
          total: 10,
          date: todayKey,
          source: 'manual',
          isAuto: false
        }
      ];

      contest.simulados = [
        {
          id: 'sim-manual-1',
          batchId: 'batch-manual-1',
          date: todayKey,
          score: 80,
          scorePoints: 80,
          scorePct: 80,
          total: 10,
          correct: 8,
          type: 'auto-analyzer', // created by Simulados.jsx handleSimuladoAnalysis
          subject: 'Simulado Geral'
        }
      ];

      // Deleting manual simulado for today
      slice.deleteSimulado(`manual-${todayKey}`);

      // Both the row and the event MUST be deleted
      expect(contest.simuladoRows).toHaveLength(0);
      expect(contest.simulados).toHaveLength(0);
    });

    it('should NOT delete manual event with type "auto-analyzer" when deleteSimulado is called with ai-YYYY-MM-DD', () => {
      const contest = mockState.appState.contests['contest-1'];
      const todayKey = '2026-11-14';

      // Setup: 1 AI simulado and 1 manual simulado on the same day
      contest.simuladoRows = [
        {
          id: 'row-ai-1',
          batchId: 'batch-ai-1',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Artigo 5',
          correct: 5,
          total: 10,
          date: todayKey,
          source: 'ai-generated'
        },
        {
          id: 'row-man-1',
          batchId: 'batch-man-1',
          categoryId: 'cat-1',
          subject: 'Direito Constitucional',
          topic: 'Nacionalidade',
          correct: 9,
          total: 10,
          date: todayKey,
          source: 'manual'
        }
      ];

      contest.simulados = [
        {
          id: 'sim-ai-1',
          batchId: 'batch-ai-1',
          date: todayKey,
          correct: 5,
          total: 10,
          type: 'ai-simulado'
        },
        {
          id: 'sim-man-1',
          batchId: 'batch-man-1',
          date: todayKey,
          correct: 9,
          total: 10,
          type: 'auto-analyzer',
          subject: 'Simulado Geral'
        }
      ];

      // Delete only AI
      slice.deleteSimulado(`ai-${todayKey}`);

      // The AI row and event must be gone; the manual row and event MUST remain
      expect(contest.simuladoRows).toHaveLength(1);
      expect(contest.simuladoRows[0].id).toBe('row-man-1');
      expect(contest.simulados).toHaveLength(1);
      expect(contest.simulados[0].id).toBe('sim-man-1');
    });
  });

  describe('Bug 2: Topic deduplication between AI and Manual in category history', () => {
    it('should match and merge topic stats when topic names match even if one entry lacked taskId', () => {
      const contest = mockState.appState.contests['contest-1'];
      const todayKey = getDateKey(normalizeDate(new Date()));

      // Suppose manual simulado ran first and added history with name but NO taskId
      contest.categories[0].simuladoStats = {
        history: [
          {
            date: todayKey,
            correct: 5,
            total: 10,
            score: 50,
            topics: [
              {
                name: 'Direitos Fundamentais', // no taskId here
                correct: 5,
                total: 10,
                percentage: 50,
                difficulty: 1.0
              }
            ]
          }
        ]
      };

      // Now an AI simulado is saved for the same topic, WITH taskId: 'task-1'
      const aiForm = {
        materia: 'Direito Constitucional',
        assunto: 'Direitos Fundamentais',
        categoryId: 'cat-1',
        taskId: 'task-1',
        dificuldade: 'medio'
      };

      applyAIResultsToDraft(contest, aiForm, 5, 10, 60, false, 'batch-ai-1');

      const todayHistory = contest.categories[0].simuladoStats.history[0];
      // Should NOT have 2 separate duplicate topic entries for 'Direitos Fundamentais'
      expect(todayHistory.topics).toHaveLength(1);
      expect(todayHistory.topics[0].name).toBe('Direitos Fundamentais');
      expect(todayHistory.topics[0].total).toBe(20);
      expect(todayHistory.topics[0].correct).toBe(10);
    });
  });

  describe('Bug 3: Deduplication in handleSimuladoAnalysis rowsToKeep', () => {
    it('should replace previous manual row without topicId when new row has categoryId and topicId', () => {
      const todayKey = '2026-11-14';

      // Previous row in store from legacy/import: had no categoryId/topicId
      const prevRows = [
        {
          id: 'legacy-row-1',
          subject: 'Direito Constitucional',
          topic: 'Direitos Fundamentais',
          correct: 4,
          total: 10,
          date: todayKey,
          source: 'manual',
          isAuto: false
        }
      ];

      // New submitted row from form: has categoryId and topicId
      const submittedRows = [
        {
          id: 'manual-cat1-task1',
          categoryId: 'cat-1',
          topicId: 'task-1',
          subject: 'Direito Constitucional',
          topic: 'Direitos Fundamentais',
          correct: 8,
          total: 10
        }
      ];

      // Build submittedKeys with BOTH ID and normalized string
      const submittedIds = new Set(submittedRows.map(r => r.id).filter(Boolean));
      const submittedKeys = new Set();
      submittedRows.forEach(r => {
        if (r.categoryId && r.topicId) submittedKeys.add(`${r.categoryId}-${r.topicId}`);
        if (r.subject && r.topic) submittedKeys.add(`${normalize(r.subject)}-${normalize(r.topic)}`);
      });

      const rowsToKeep = prevRows.filter((r) => {
        const isToday = r.date === todayKey;
        const isManual = r && !r.isAuto && r.source !== 'ai-generated';

        if (isToday && isManual) {
          if (r?.id && submittedIds.has(r.id)) return false;

          const key1 = (r?.categoryId && r?.topicId) ? `${r.categoryId}-${r.topicId}` : null;
          const key2 = (r?.subject && r?.topic) ? `${normalize(r.subject)}-${normalize(r.topic)}` : null;

          if (key1 && submittedKeys.has(key1)) return false;
          if (key2 && submittedKeys.has(key2)) return false;
        }

        return true;
      });

      // The legacy row must be removed because key2 matched!
      expect(rowsToKeep).toHaveLength(0);
    });
  });

  describe('Bug 4: lastSimuladoData Strategy B must not include AI rows', () => {
    it('should only include manual rows when lastRef is manual, ignoring AI rows with isAuto=false', () => {
      const todayKey = '2026-11-14';

      // Today has an AI row (which has isAuto: false) and a Manual row
      const simuladoRowsArray = [
        {
          id: 'ai-row-1',
          batchId: 'batch-ai-1',
          subject: 'Direito Constitucional',
          topic: 'Artigo 5',
          correct: 10,
          total: 10,
          source: 'ai-generated',
          isAuto: false, // AI rows have isAuto: false!
          date: todayKey,
          createdAt: `${todayKey}T10:00:00Z`
        },
        {
          id: 'man-row-1',
          batchId: 'batch-man-1',
          subject: 'Direito Constitucional',
          topic: 'Nacionalidade',
          correct: 7,
          total: 10,
          source: 'manual',
          isAuto: false,
          date: todayKey,
          createdAt: `${todayKey}T11:00:00Z` // Later!
        }
      ];

      const lastRef = simuladoRowsArray[1]; // man-row-1 is the most recent
      expect(lastRef.source).toBe('manual');

      // Strategy B filter:
      const refDateKey = todayKey;
      const resultRows = simuladoRowsArray.filter((r) => {
        if (!r || typeof r !== 'object') return false;
        // Fix: isManual must exclude AI source!
        const isAi = r?.source === 'ai-generated' || (r?.batchId && r?.source !== 'manual' && !r?.id?.startsWith('manual'));
        const isManual = !isAi && (r?.source === 'manual' || r?.isAuto === false || r?.id?.startsWith('manual'));
        if (!isManual) return false;
        return r.date === refDateKey;
      });

      // MUST ONLY CONTAIN THE MANUAL ROW
      expect(resultRows).toHaveLength(1);
      expect(resultRows[0].id).toBe('man-row-1');
    });
  });
});
