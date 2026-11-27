import { describe, it, expect, beforeEach } from 'vitest';
import { applyAIResultsToDraft } from '../aiSaveHelper.js';
import {
  isRealSimuladoRow,
  reconcileContestCategoriesHistory,
  computeCategorySimCounts
} from '../simuladoReconciler.js';
import { repairContestHistory } from '../../store/schemas.js';
import { createSimuladoSlice } from '../../store/slices/createSimuladoSlice.js';
import { createTrashSlice } from '../../store/slices/createTrashSlice.js';
import { computeCategoryPerformanceStats } from '../tasksStatsHelper.js';
import { generateAnalyticsStats } from '../../engine/analyticsStats.js';
import { computeEfficientAllocation, generateOptimalWeeklySchedule } from '../../engine/adaptive/allocationOptimizer.js';
import {
  buildCircadianHeatmapData,
  buildConsistencyBoxPlotData,
  buildExamPacingData,
  buildProjectionFanData,
  buildKalmanChartData,
  buildKnowledgeGraphLayout
} from '../advancedChartHelpers.js';
import { mapRetentionData } from '../chartDataMappers.js';
import { estimateEmpiricalHalfLife } from '../../engine/adaptive/empiricalRetention.js';
import { buildAchievementStats } from '../analytics.js';
import {
  getCombinedHistory,
  extractMetrics,
  getSuggestedFocus,
  clearUrgencyCache,
  clearTopicsCache,
  clearMcCache
} from '../coachLogic.js';
import { getDateKey, normalizeDate } from '../dateHelper.js';

describe('Simulados -> Main Panels Cross-Flow Audit & Bug Fixes', () => {
  beforeEach(() => {
    clearUrgencyCache();
    clearTopicsCache();
    clearMcCache();
  });

  it('1. AI Simulado with Cebraspe penalty & blanks persists topic percentage, blanks, penaltyPerWrong, netPoints, and timedQuestoes', () => {
    const contest = {
      id: 'c-cebraspe',
      minScore: -120,
      maxScore: 120,
      penaltyPerWrong: 1,
      categories: [
        {
          id: 'cat-dir',
          name: 'Direito Administrativo',
          weight: 20,
          minScore: -120,
          maxScore: 120,
          tasks: [{ id: 'task-atos', title: 'Atos Administrativos', completed: false }],
          simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' }
        }
      ],
      simuladoRows: [],
      simulados: []
    };

    // 10 questions: 7 correct, 1 blank, 2 wrong -> netPoints = 7 - 2 = 5 (ratio = (5 - (-10)) / 20? Wait: ratio = 5/10 = 0.5 or Cebraspe domain!)
    applyAIResultsToDraft(
      contest,
      {
        materia: 'Direito Administrativo',
        assunto: 'Atos Administrativos',
        categoryId: 'cat-dir',
        taskId: 'task-atos',
        dificuldade: 'dificil',
        blanks: 1,
        questionTelemetry: [
          ...Array.from({ length: 7 }, (_, i) => ({ id: `q-${i}`, correct: true, wasAnswered: true })),
          { id: 'q-blank', correct: false, wasAnswered: false },
          { id: 'q-w1', correct: false, wasAnswered: true },
          { id: 'q-w2', correct: false, wasAnswered: true }
        ]
      },
      7,
      10,
      250,
      false,
      'batch-ceb-1'
    );

    const hist = contest.categories[0].simuladoStats.history;
    expect(hist).toHaveLength(1);
    expect(hist[0].blanks).toBe(1);
    expect(hist[0].penaltyPerWrong).toBe(1);
    expect(hist[0].netPoints).toBe(5);
    expect(hist[0].timedQuestoes).toBe(10);
    expect(hist[0].topics).toHaveLength(1);
    expect(hist[0].topics[0].blanks).toBe(1);
    expect(hist[0].topics[0].penaltyPerWrong).toBe(1);
    expect(hist[0].topics[0].timedQuestoes).toBe(10);
    expect(hist[0].topics[0].percentage).toBe(50);

    // Merging a second AI simulado on the same topic updates topic percentage instead of leaving it stale
    applyAIResultsToDraft(
      contest,
      {
        materia: 'Direito Administrativo',
        assunto: 'Atos Administrativos',
        categoryId: 'cat-dir',
        taskId: 'task-atos',
        dificuldade: 'medio',
        blanks: 0
      },
      10,
      10,
      150,
      false,
      'batch-ceb-2'
    );

    expect(hist[0].total).toBe(20);
    expect(hist[0].correct).toBe(17);
    expect(hist[0].blanks).toBe(1);
    expect(hist[0].timedQuestoes).toBe(20);
    expect(hist[0].topics[0].total).toBe(20);
    expect(hist[0].topics[0].correct).toBe(17);
    // 17 correct, 1 blank, 2 wrong -> net 15 / 20 = 75%
    expect(hist[0].topics[0].percentage).toBe(75);
  });

  it('2. Reconciler and Schema Repair hydrate all main panels (Dashboard, Stats, Tasks, Evolution, Retention, Agenda, Notes) from simuladoRows without stripping topics or timing', () => {
    const rawCategories = [
      {
        id: 'cat-port',
        name: 'Língua Portuguesa',
        weight: 25,
        minScore: 0,
        maxScore: 100,
        tasks: [
          { id: 't-crase', title: 'Crase', completed: true, lastStudiedAt: '2026-11-18T12:00:00.000Z' },
          { id: 't-sintaxe', title: 'Sintaxe', completed: false }
        ],
        simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' }
      },
      {
        id: 'cat-const',
        name: 'Direito Constitucional',
        weight: 15,
        minScore: 0,
        maxScore: 100,
        tasks: [
          { id: 't-art5', title: 'Direitos Fundamentais', completed: true, lastStudiedAt: '2026-11-19T12:00:00.000Z' }
        ],
        simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' }
      }
    ];

    const simuladoRows = [
      {
        id: 'r-1',
        batchId: 'b-1',
        categoryId: 'cat-port',
        subject: 'Língua Portuguesa',
        topic: 'Crase',
        taskId: 't-crase',
        date: '2026-11-18',
        createdAt: '2026-11-18T14:30:00.000Z',
        correct: 4,
        total: 10,
        score: 40,
        timeSpent: 300,
        difficulty: 1.3,
        validated: true,
        source: 'ai-generated'
      },
      {
        id: 'r-2',
        batchId: 'b-2',
        categoryId: 'cat-port',
        subject: 'Língua Portuguesa',
        topic: 'Sintaxe',
        taskId: 't-sintaxe',
        date: '2026-11-20',
        createdAt: '2026-11-20T15:00:00.000Z',
        correct: 6,
        total: 10,
        score: 60,
        timeSpent: 240,
        difficulty: 1.0,
        validated: true,
        source: 'manual'
      },
      {
        id: 'r-3',
        batchId: 'b-2',
        categoryId: 'cat-const',
        subject: 'Direito Constitucional',
        topic: 'Direitos Fundamentais',
        taskId: 't-art5',
        date: '2026-11-20',
        createdAt: '2026-11-20T16:00:00.000Z',
        correct: 9,
        total: 10,
        score: 90,
        timeSpent: 180,
        difficulty: 1.0,
        validated: true,
        source: 'manual'
      }
    ];

    // A) reconcileContestCategoriesHistory (used by Dashboard, Stats, Tasks, Retention, Agenda, Notes, Trash)
    const reconciled = reconcileContestCategoriesHistory(rawCategories, simuladoRows, 100, 0);
    const portCat = reconciled.find(c => c.id === 'cat-port');
    const constCat = reconciled.find(c => c.id === 'cat-const');

    expect(portCat.simuladoStats.history).toHaveLength(2);
    expect(portCat.simuladoStats.average).toBeGreaterThan(0);
    expect(portCat.simuladoStats.lastAttempt).toBe(60);
    expect(portCat.simuladoStats.history[0].timeSpent).toBe(300);
    expect(portCat.simuladoStats.history[0].timedQuestoes).toBe(10);
    expect(portCat.simuladoStats.history[0].topics[0].taskId).toBe('t-crase');
    expect(portCat.simuladoStats.history[0].topics[0].percentage).toBe(40);
    expect(constCat.simuladoStats.average).toBe(90);
    expect(constCat.simuladoStats.level).toBe('ALTO');

    // Tasks panel consumers (PerformanceTable / Rankings / Subtopics)
    const portPerf = computeCategoryPerformanceStats(portCat, 100, 0);
    expect(portPerf.totalVolume).toBe(20);
    expect(portPerf.correct).toBe(10);
    expect(portPerf.wrong).toBe(10);

    // Stats / MonteCarloGauge consumer
    const mcAnalytics = generateAnalyticsStats({
      categories: reconciled,
      debouncedWeights: { 'cat-port': 1, 'cat-const': 1 },
      timeIndex: -1,
      timelineDates: [],
      minScore: 0,
      maxScore: 100,
      simuladoRows
    });
    expect(mcAnalytics).not.toBeNull();
    expect(mcAnalytics.categoryStats).toHaveLength(2);
    expect(mcAnalytics.globalHistory).toHaveLength(2);

    // Evolution & Pacing & BoxPlot & Kalman & Fan & KnowledgeGraph consumers
    const pacing = buildExamPacingData(reconciled, { examDurationMinutes: 240, examTotalQuestions: 100 });
    expect(pacing.hasData).toBe(true);
    expect(pacing.subjects.find(s => s.id === 'cat-port').hasTimedData).toBe(true);

    const boxPlot = buildConsistencyBoxPlotData(reconciled, { minScore: 0, maxScore: 100 });
    expect(boxPlot.rows).toHaveLength(2);

    const kalman = buildKalmanChartData(portCat, [], { minScore: 0, maxScore: 100 });
    expect(kalman.points.length).toBeGreaterThanOrEqual(2);

    const fan = buildProjectionFanData(portCat, [], { minScore: 0, maxScore: 100, now: new Date('2026-11-21T12:00:00Z') });
    expect(fan.series.length).toBeGreaterThan(0);

    const graph = buildKnowledgeGraphLayout(portCat, { minScore: 0, maxScore: 100 });
    const craseNode = graph.nodes.find(n => n.name === 'Crase');
    expect(craseNode?.totalQuestions).toBe(10);
    expect(craseNode?.proficiencyPct).toBe(40);

    // Efficient Allocation (Stats) & Optimal Schedule (Agenda)
    const alloc = computeEfficientAllocation(reconciled, [], { minScore: 0, maxScore: 100, targetScore: 80, now: new Date('2026-11-21T12:00:00Z') });
    expect(alloc.hasData).toBe(true);
    expect(alloc.hasEmpiricalData).toBe(true);

    const schedule = generateOptimalWeeklySchedule(reconciled, [], [], simuladoRows, { dailyHours: [2, 2, 2, 2, 2, 2, 2] });
    expect(schedule.events.length).toBeGreaterThan(0);

    // Retention panel consumers
    const retChart = mapRetentionData(reconciled, { minScore: 0, maxScore: 100, now: new Date('2026-11-25T12:00:00Z').getTime() });
    expect(retChart.length).toBe(2);
    expect(retChart.find(r => r.id === 'cat-port').totalQuestoes).toBe(20);
    const empHalfLife = estimateEmpiricalHalfLife(portCat, { minScore: 0, maxScore: 100 });
    expect(empHalfLife.effectiveHalfLife).toBeGreaterThan(0);

    // B) repairContestHistory (schemas.js silent hydration) also preserves topics & timeSpent!
    const repaired = repairContestHistory({
      minScore: 0,
      maxScore: 100,
      categories: rawCategories,
      simuladoRows
    });
    const repairedPortHist = repaired.categories[0].simuladoStats.history;
    expect(repairedPortHist).toHaveLength(2);
    expect(repairedPortHist[0].timeSpent).toBe(300);
    expect(repairedPortHist[0].timedQuestoes).toBe(10);
    expect(repairedPortHist[0].topics[0].name).toBe('Crase');
    expect(repairedPortHist[0].topics[0].taskId).toBe('t-crase');
  });

  it('3. Manual Error Notebook rows are strictly isolated from Simulado unlock flags, Circadian Heatmap, Achievements, and date-based deletion', () => {
    const errorOnlyRow = {
      id: 'errrow-only-1',
      batchId: 'errbatch-only-1',
      categoryId: 'cat-port',
      subject: 'Língua Portuguesa',
      topic: 'Crase',
      date: '2026-11-20',
      createdAt: '2026-11-20T10:00:00.000Z',
      correct: 0,
      total: 1,
      score: 0,
      scorePct: 0,
      isPercentage: true,
      scoreUnit: 'pct',
      validated: true,
      source: 'manual-error-notebook',
      questionTelemetry: [
        { id: 'qe-1', correct: false, wasAnswered: true, confidence: 'certeza', errorType: 'teoria' }
      ]
    };

    expect(isRealSimuladoRow(errorOnlyRow)).toBe(false);

    const contestWithOnlyErrors = {
      id: 'c-err',
      minScore: 0,
      maxScore: 100,
      categories: [{ id: 'cat-port', name: 'Língua Portuguesa', tasks: [], simuladoStats: { history: [] } }],
      simuladoRows: [errorOnlyRow],
      simulados: [],
      studyLogs: [],
      studySessions: []
    };

    const ach = buildAchievementStats(contestWithOnlyErrors);
    expect(ach.totalQuestions).toBe(0);
    expect(ach.accuracy).toBe(0);
    expect(ach.hasPerfectScore).toBe(false);

    const circadian = buildCircadianHeatmapData([], [], [errorOnlyRow], contestWithOnlyErrors.categories, {
      now: new Date('2026-11-21T12:00:00Z')
    });
    expect(circadian.timedSimCount).toBe(0);
    expect(circadian.peakAccuracyCell).toBeNull();

    // Date-based or type-based deleteSimulado must NOT wipe Caderno de Erros notes!
    const mockState = {
      appState: {
        activeId: 'c-err',
        version: 1,
        trash: [],
        contests: {
          'c-err': {
            ...contestWithOnlyErrors,
            simuladoRows: [
              errorOnlyRow,
              {
                id: 'real-ai-1',
                batchId: 'batch-ai-20',
                categoryId: 'cat-port',
                subject: 'Língua Portuguesa',
                topic: 'Crase',
                date: '2026-11-20',
                correct: 8,
                total: 10,
                score: 80,
                validated: true,
                source: 'ai-generated'
              }
            ],
            simulados: [
              { id: 'sim-ai-20', batchId: 'batch-ai-20', date: '2026-11-20', correct: 8, total: 10, score: 80, type: 'ai-simulado' }
            ]
          }
        }
      }
    };

    const slice = createSimuladoSlice((fn) => fn(mockState));
    slice.deleteSimulado('ai-2026-11-20');
    expect(mockState.appState.contests['c-err'].simuladoRows).toHaveLength(1);
    expect(mockState.appState.contests['c-err'].simuladoRows[0].id).toBe('errrow-only-1');

    slice.deleteSimulado('2026-11-20');
    expect(mockState.appState.contests['c-err'].simuladoRows).toHaveLength(1);
    expect(mockState.appState.contests['c-err'].simuladoRows[0].id).toBe('errrow-only-1');
  });

  it('4. Deleting partial manual rows reconciles auto-analyzer summary in contest.simulados, and Trash restore recovers full stats & timing', () => {
    const todayKey = getDateKey(normalizeDate(new Date()));
    const mockState = {
      appState: {
        activeId: 'c-1',
        version: 1,
        trash: [],
        contests: {
          'c-1': {
            id: 'c-1',
            minScore: 0,
            maxScore: 100,
            categories: [
              {
                id: 'cat-1',
                name: 'Língua Portuguesa',
                weight: 10,
                simuladoStats: {
                  history: [{ date: todayKey, correct: 4, total: 10, score: 40, timeSpent: 200, timedQuestoes: 10 }],
                  average: 40,
                  lastAttempt: 40,
                  trend: 'stable',
                  level: 'BAIXO'
                }
              },
              {
                id: 'cat-2',
                name: 'Direito Constitucional',
                weight: 10,
                simuladoStats: {
                  history: [{ date: todayKey, correct: 10, total: 10, score: 100, timeSpent: 150, timedQuestoes: 10 }],
                  average: 100,
                  lastAttempt: 100,
                  trend: 'stable',
                  level: 'ALTO'
                }
              }
            ],
            simuladoRows: [
              {
                id: 'man-r1',
                batchId: 'b-man',
                categoryId: 'cat-1',
                subject: 'Língua Portuguesa',
                topic: 'Crase',
                taskId: 't1',
                date: todayKey,
                correct: 4,
                total: 10,
                score: 40,
                timeSpent: 200,
                validated: true,
                source: 'manual'
              },
              {
                id: 'man-r2',
                batchId: 'b-man',
                categoryId: 'cat-2',
                subject: 'Direito Constitucional',
                topic: 'Artigo 5',
                taskId: 't2',
                date: todayKey,
                correct: 10,
                total: 10,
                score: 100,
                timeSpent: 150,
                validated: true,
                source: 'manual'
              }
            ],
            simulados: [
              {
                id: 'sim-auto-1',
                batchId: 'b-man',
                date: todayKey,
                correct: 14,
                total: 20,
                score: 70,
                scorePoints: 70,
                scorePct: 70,
                type: 'auto-analyzer',
                subject: 'Simulado Geral',
                source: 'manual'
              }
            ]
          }
        }
      }
    };

    const simSlice = createSimuladoSlice((fn) => fn(mockState));
    const trashSlice = createTrashSlice((fn) => fn(mockState), () => mockState);

    // Delete ONLY row 'man-r1' (Português 4/10)
    simSlice.deleteSimulado('man-r1');

    const contest = mockState.appState.contests['c-1'];
    expect(contest.simuladoRows).toHaveLength(1);
    expect(contest.simuladoRows[0].id).toBe('man-r2');

    // Global auto-analyzer event must be reconciled to remaining manual row (10/10 = 100)
    expect(contest.simulados).toHaveLength(1);
    expect(contest.simulados[0].total).toBe(10);
    expect(contest.simulados[0].correct).toBe(10);
    expect(contest.simulados[0].score).toBe(100);
    expect(contest.categories[0].simuladoStats.history).toHaveLength(0);
    expect(contest.categories[0].simuladoStats.average).toBe(0);

    // Restore 'man-r1' from Trash -> recovers Português history, timing, taskId, average, and Coach focus!
    const trashItem = mockState.appState.trash[0];
    trashSlice.restoreFromTrash(trashItem.id);

    expect(contest.simuladoRows).toHaveLength(2);
    expect(contest.categories[0].simuladoStats.history).toHaveLength(1);
    expect(contest.categories[0].simuladoStats.average).toBe(40);
    expect(contest.categories[0].simuladoStats.history[0].timeSpent).toBe(200);
    expect(contest.categories[0].simuladoStats.history[0].topics[0].taskId).toBe('t1');

    const combined = getCombinedHistory(contest.simuladoRows, contest.simulados, 100, 0);
    const focus = getSuggestedFocus(contest.categories, combined, [], {
      simuladoRows: contest.simuladoRows,
      allSimulados: contest.simulados
    });
    expect(focus.id).toBe('cat-1');
    const metricsPort = extractMetrics(contest.categories[0], combined, [], {
      simuladoRows: contest.simuladoRows,
      allSimulados: contest.simulados
    });
    expect(metricsPort.averageScore).toBeCloseTo(40, 1);
    const counts = computeCategorySimCounts(contest.categories, contest.simulados, contest.simuladoRows);
    expect(counts.find(c => c.id === 'cat-1').count).toBe(1);
  });
});
