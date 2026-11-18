import { describe, it, expect, beforeEach } from 'vitest';
import { applyAIResultsToDraft } from '../../utils/aiSaveHelper.js';
import { createSimuladoSlice } from '../../store/slices/createSimuladoSlice.js';
import { computeCategorySimCounts, reconcileContestCategoriesHistory } from '../../utils/simuladoReconciler.js';
import { repairContestHistory } from '../../store/schemas.js';
import {
  getCombinedHistory,
  getSuggestedFocus,
  generateDailyGoals,
  extractMetrics,
  getWeakestTopic,
  clearUrgencyCache,
  clearTopicsCache,
  clearMcCache
} from '../../utils/coachLogic.js';
import { getDateKey, normalizeDate } from '../../utils/dateHelper.js';

describe('Coach AI & Menu Simulado End-to-End Data Pipeline Verification', () => {
  let mockState;
  let setFn;
  let simuladoSlice;

  beforeEach(() => {
    clearUrgencyCache();
    clearTopicsCache();
    clearMcCache();

    mockState = {
      appState: {
        activeId: 'contest-test',
        version: 1,
        contests: {
          'contest-test': {
            id: 'contest-test',
            contestName: 'Concurso Teste',
            minScore: 0,
            maxScore: 100,
            categories: [
              {
                id: 'cat-port',
                name: 'Língua Portuguesa',
                weight: 20,
                minScore: 0,
                maxScore: 100,
                tasks: [
                  { id: 't1', text: 'Crase e Regência', completed: false },
                  { id: 't2', text: 'Pontuação', completed: false }
                ],
                simuladoStats: {
                  history: [],
                  average: 0,
                  lastAttempt: 0,
                  trend: 'stable',
                  level: 'BAIXO'
                }
              },
              {
                id: 'cat-const',
                name: 'Direito Constitucional',
                weight: 15,
                minScore: 0,
                maxScore: 100,
                tasks: [
                  { id: 't3', text: 'Direitos Fundamentais', completed: false },
                  { id: 't4', text: 'Organização do Estado', completed: false }
                ],
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

    simuladoSlice = createSimuladoSlice(setFn);
  });

  it('1. Coach AI receives and reflects manual simulado rows submitted from the Simulado menu', () => {
    const contest = mockState.appState.contests['contest-test'];

    // Simular registro manual de simulado no menu Simulados (SimuladoAnalysis)
    const todayKey = getDateKey(normalizeDate(new Date()));
    const manualRows = [
      {
        id: 'row-1',
        batchId: 'batch-manual-1',
        date: todayKey,
        categoryId: 'cat-port',
        subject: 'Língua Portuguesa',
        topic: 'Crase e Regência',
        correct: 4,
        total: 10, // 40% de acerto
        source: 'manual',
        validated: true
      },
      {
        id: 'row-2',
        batchId: 'batch-manual-1',
        date: todayKey,
        categoryId: 'cat-const',
        subject: 'Direito Constitucional',
        topic: 'Direitos Fundamentais',
        correct: 9,
        total: 10, // 90% de acerto
        source: 'manual',
        validated: true
      }
    ];

    contest.simuladoRows = manualRows;

    // Atualiza simulados globais como o menu Simulados faz
    contest.simulados = [
      {
        id: 'sim-1',
        batchId: 'batch-manual-1',
        date: todayKey,
        score: 65,
        scorePct: 65,
        total: 20,
        correct: 13,
        type: 'auto-analyzer'
      }
    ];

    // Atualiza simuladoStats das categorias conforme feito no menu
    contest.categories[0].simuladoStats = {
      history: [
        {
          date: todayKey,
          correct: 4,
          total: 10,
          score: 40,
          topics: [{ name: 'Crase e Regência', correct: 4, total: 10, percentage: 40 }]
        }
      ],
      average: 40,
      lastAttempt: 40,
      trend: 'stable',
      level: 'BAIXO'
    };

    contest.categories[1].simuladoStats = {
      history: [
        {
          date: todayKey,
          correct: 9,
          total: 10,
          score: 90,
          topics: [{ name: 'Direitos Fundamentais', correct: 9, total: 10, percentage: 90 }]
        }
      ],
      average: 90,
      lastAttempt: 90,
      trend: 'up',
      level: 'ALTO'
    };

    // Obter histórico unificado do Coach
    const combinedHistory = getCombinedHistory(contest.simuladoRows, contest.simulados, contest.maxScore, contest.minScore);
    expect(combinedHistory.length).toBeGreaterThan(0);

    // Métricas do Coach para Língua Portuguesa
    const metricsPort = extractMetrics(contest.categories[0], combinedHistory, [], {
      simuladoRows: contest.simuladoRows,
      allSimulados: contest.simulados
    });

    // Métricas do Coach para Direito Constitucional
    const metricsConst = extractMetrics(contest.categories[1], combinedHistory, [], {
      simuladoRows: contest.simuladoRows,
      allSimulados: contest.simulados
    });

    expect(metricsPort.averageScore).toBeCloseTo(40, 1);
    expect(metricsConst.averageScore).toBeCloseTo(90, 1);

    // O Coach AI deve priorizar Língua Portuguesa como alvo principal devido à nota baixa (40% vs 90%)
    const suggestion = getSuggestedFocus(contest.categories, combinedHistory, [], {
      simuladoRows: contest.simuladoRows,
      allSimulados: contest.simulados,
      maxScore: contest.maxScore,
      minScore: contest.minScore
    });

    expect(suggestion).toBeDefined();
    expect(suggestion.id).toBe('cat-port');
    expect(suggestion.weakestTopic).toBeDefined();
    expect(suggestion.weakestTopic.name).toBe('Crase e Regência');
    expect(suggestion.weakestTopic.percentage).toBe(40);
  });

  it('2. Coach AI receives and reflects AI-generated simulados seamlessly', () => {
    const contest = mockState.appState.contests['contest-test'];

    // Simula conclusão de Simulado de IA no menu Simulados
    const aiFormData = {
      materia: 'Direito Constitucional',
      assunto: 'Organização do Estado',
      categoryId: 'cat-const',
      dificuldade: 'medio'
    };

    // Usuário acertou 2 de 10 questões (20% de acerto - desempenho crítico)
    applyAIResultsToDraft(contest, aiFormData, 2, 10, 300, false, 'ai-batch-101');

    expect(contest.simuladoRows).toHaveLength(1);
    expect(contest.simulados).toHaveLength(1);
    expect(contest.simuladoRows[0].batchId).toBe('ai-batch-101');
    expect(contest.simuladoRows[0].source).toBe('ai-generated');

    const combinedHistory = getCombinedHistory(contest.simuladoRows, contest.simulados, contest.maxScore, contest.minScore);

    const suggestion = getSuggestedFocus(contest.categories, combinedHistory, [], {
      simuladoRows: contest.simuladoRows,
      allSimulados: contest.simulados
    });

    // Obter métricas e tópico mais fraco diretamente de Direito Constitucional
    const metricsConst = extractMetrics(contest.categories[1], combinedHistory, [], {
      simuladoRows: contest.simuladoRows,
      allSimulados: contest.simulados
    });
    expect(metricsConst.averageScore).toBeCloseTo(20, 1);

    const weakestTopicConst = getWeakestTopic(contest.categories[1], combinedHistory, 100, 0, {
      simuladoRows: contest.simuladoRows,
      allSimulados: contest.simulados
    });
    expect(weakestTopicConst).toBeDefined();
    expect(weakestTopicConst.name).toBe('Organização do Estado');
    expect(weakestTopicConst.percentage).toBe(20);

    // Na sugestão de foco, o Coach analisa todas as categorias
    expect(suggestion).toBeDefined();
  });

  it('3. Dynamic updating: Coach AI shifts suggested focus when a new simulado improves the category', () => {
    const contest = mockState.appState.contests['contest-test'];
    const pastDate = '2026-11-01';
    const recentDate = '2026-11-10';

    // Estado inicial: Português fraco (30%), Constitucional mediano (70%)
    contest.simuladoRows = [
      { id: 'r1', date: pastDate, categoryId: 'cat-port', subject: 'Língua Portuguesa', topic: 'Crase e Regência', correct: 3, total: 10, source: 'manual' },
      { id: 'r2', date: pastDate, categoryId: 'cat-const', subject: 'Direito Constitucional', topic: 'Direitos Fundamentais', correct: 7, total: 10, source: 'manual' }
    ];
    contest.categories[0].simuladoStats.history = [{ date: pastDate, correct: 3, total: 10, score: 30 }];
    contest.categories[1].simuladoStats.history = [{ date: pastDate, correct: 7, total: 10, score: 70 }];

    let combined = getCombinedHistory(contest.simuladoRows, [], 100, 0);
    let focus = getSuggestedFocus(contest.categories, combined, [], { simuladoRows: contest.simuladoRows });
    expect(focus.id).toBe('cat-port'); // Português era o foco inicial

    // Novo simulado registrado no menu Simulados:
    // Português agora tirou 10/10 (100%), mas Constitucional despencou para 1/10 (10%)
    clearUrgencyCache();
    clearTopicsCache();

    contest.simuladoRows.push(
      { id: 'r3', date: recentDate, categoryId: 'cat-port', subject: 'Língua Portuguesa', topic: 'Crase e Regência', correct: 10, total: 10, source: 'manual' },
      { id: 'r4', date: recentDate, categoryId: 'cat-const', subject: 'Direito Constitucional', topic: 'Direitos Fundamentais', correct: 1, total: 10, source: 'manual' }
    );
    contest.categories[0].simuladoStats.history.push({ date: recentDate, correct: 10, total: 10, score: 100 });
    contest.categories[1].simuladoStats.history.push({ date: recentDate, correct: 1, total: 10, score: 10 });

    combined = getCombinedHistory(contest.simuladoRows, [], 100, 0);
    focus = getSuggestedFocus(contest.categories, combined, [], { simuladoRows: contest.simuladoRows });

    // O Coach AI deve imediatamente migrar o foco para Direito Constitucional
    expect(focus.id).toBe('cat-const');
    // A porcentagem do tópico é a agregação temporal ponderada das 2 tentativas (70% anterior + 10% recente)
    expect(focus.weakestTopic.percentage).toBeLessThan(50);
    expect(focus.weakestTopic.percentage).toBeCloseTo(38, 0);
  });

  it('4. Correctness of scale scaling (Cebraspe / custom scale: minScore -120 to maxScore 120)', () => {
    const contest = mockState.appState.contests['contest-test'];
    contest.minScore = -120;
    contest.maxScore = 120;
    contest.categories[0].minScore = -120;
    contest.categories[0].maxScore = 120;

    // Simulado com 60 acertos de 120 questões (50% de acerto líquido)
    // Na escala [-120, +120], 50% = -120 + 0.5 * 240 = 0 pontos
    contest.simuladoRows = [
      {
        id: 'cebraspe-1',
        date: '2026-11-12',
        categoryId: 'cat-port',
        subject: 'Língua Portuguesa',
        topic: 'Interpretação',
        correct: 60,
        total: 120,
        source: 'manual'
      }
    ];

    const combined = getCombinedHistory(contest.simuladoRows, [], 120, -120);
    expect(combined[0].score).toBeCloseTo(0, 1);

    const metrics = extractMetrics(contest.categories[0], combined, [], {
      maxScore: 120,
      minScore: -120,
      simuladoRows: contest.simuladoRows
    });

    // Score calculado deve respeitar os 0 pontos da escala
    expect(metrics.averageScore).toBeCloseTo(0, 1);
  });

  it('5. Deletion/Reset of simulado in Simulado menu cleanly resets Coach AI data', () => {
    const contest = mockState.appState.contests['contest-test'];
    contest.simuladoRows = [
      { id: 'del-row-1', date: '2026-11-10', categoryId: 'cat-port', subject: 'Língua Portuguesa', correct: 8, total: 10 }
    ];
    contest.simulados = [
      { id: 'del-sim-1', date: '2026-11-10', score: 80, total: 10, correct: 8 }
    ];
    contest.categories[0].simuladoStats = {
      history: [{ date: '2026-11-10', correct: 8, total: 10, score: 80 }],
      average: 80,
      lastAttempt: 80,
      trend: 'stable',
      level: 'ALTO'
    };

    // Executa reset pelo slice do menu simulado
    simuladoSlice.resetSimuladoStats();

    expect(contest.simuladoRows).toHaveLength(0);
    expect(contest.simulados).toHaveLength(0);
    expect(contest.categories[0].simuladoStats.history).toHaveLength(0);
    expect(contest.categories[0].simuladoStats.average).toBe(0);

    const combined = getCombinedHistory(contest.simuladoRows, contest.simulados, 100, 0);
    expect(combined).toHaveLength(0);

    // Coach AI lida com zero simulados sem quebrar
    const goals = generateDailyGoals(contest.categories, combined, [], { maxScore: 100, minScore: 0 });
    expect(Array.isArray(goals)).toBe(true);
    expect(goals.length).toBeGreaterThan(0);
  });

  it('6. resetSimuladoStats and deleteSimulado clear stale calibration telemetry when count drops below 8', () => {
    const contest = mockState.appState.contests['contest-test'];
    contest.simuladoRows = Array.from({ length: 8 }, (_, i) => ({
      id: `row-${i + 1}`,
      batchId: `batch-${i + 1}`,
      date: `2026-11-${String(i + 1).padStart(2, '0')}`,
      categoryId: 'cat-port',
      subject: 'Língua Portuguesa',
      correct: 8,
      total: 10,
      score: 80,
      validated: true
    }));
    contest.categories[0].simuladoStats = {
      history: Array.from({ length: 8 }, (_, i) => ({
        date: `2026-11-${String(i + 1).padStart(2, '0')}`,
        batchId: `batch-${i + 1}`,
        batchIds: [`batch-${i + 1}`],
        correct: 8,
        total: 10,
        score: 80
      })),
      average: 80,
      lastAttempt: 80,
      trend: 'stable',
      level: 'ALTO'
    };
    contest.calibrationHistoryByCategory = {
      'cat-port': [{ timestamp: 1700000000000, avgBrier: 0.14, ece: 0.04 }]
    };
    contest.calibrationOps = {
      'cat-port': { degraded: false }
    };
    contest.calibrationAuditLog = [
      { timestamp: 1700000000000, categoryId: 'cat-port', avgBrier: 0.14 }
    ];

    // Deleting 1 simulado drops cat-port to 7/8 -> calibration data must be pruned
    simuladoSlice.deleteSimulado('batch-8');
    const countsAfterDelete = computeCategorySimCounts(contest.categories, contest.simulados, contest.simuladoRows);
    expect(countsAfterDelete.find(c => c.id === 'cat-port').count).toBe(7);
    expect(contest.calibrationHistoryByCategory['cat-port']).toBeUndefined();
    expect(contest.calibrationOps['cat-port']).toBeUndefined();
    expect(contest.calibrationAuditLog).toHaveLength(0);

    // Re-seed and test full resetSimuladoStats
    contest.calibrationHistoryByCategory = { 'cat-const': [{ timestamp: 1700000000000, avgBrier: 0.15 }] };
    contest.calibrationOps = { 'cat-const': { degraded: false } };
    contest.calibrationAuditLog = [{ timestamp: 1700000000000, categoryId: 'cat-const', avgBrier: 0.15 }];
    simuladoSlice.resetSimuladoStats();
    expect(contest.calibrationHistoryByCategory).toEqual({});
    expect(contest.calibrationOps).toEqual({});
    expect(contest.calibrationAuditLog).toEqual([]);
  });

  it('7. reconcileContestCategoriesHistory and repairContestHistory preserve batchId/batchIds', () => {
    const cats = [{ id: 'cat-port', name: 'Língua Portuguesa', simuladoStats: { history: [] } }];
    const rows = [
      { id: 'r1', batchId: 'b-1', categoryId: 'cat-port', subject: 'Língua Portuguesa', topic: 'Crase', date: '2026-11-01', correct: 7, total: 10 },
      { id: 'r2', batchId: 'b-2', categoryId: 'cat-port', subject: 'Língua Portuguesa', topic: 'Pontuação', date: '2026-11-01', correct: 8, total: 10 }
    ];

    const reconciled = reconcileContestCategoriesHistory(cats, rows, 100, 0);
    expect(reconciled[0].simuladoStats.history[0].batchIds).toEqual(['b-1', 'b-2']);
    expect(reconciled[0].simuladoStats.history[0].batchId).toBe('b-2');

    const repaired = repairContestHistory({
      maxScore: 100,
      minScore: 0,
      categories: [{ id: 'cat-port', name: 'Língua Portuguesa', simuladoStats: { history: [] } }],
      simuladoRows: rows
    });
    expect(repaired.categories[0].simuladoStats.history[0].batchIds).toEqual(['b-1', 'b-2']);
    expect(repaired.categories[0].simuladoStats.history[0].batchId).toBe('b-2');
  });
});
