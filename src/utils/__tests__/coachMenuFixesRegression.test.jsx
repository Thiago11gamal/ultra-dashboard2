// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, fireEvent, screen, cleanup, act, waitFor } from '@testing-library/react';
import { sanitizeContest } from '../../store/schemas.js';
import { mergeAppStatePure } from '../../hooks/useCloudSync.js';
import { useAppStore } from '../../store/useAppStore.js';
import { createCategorySlice } from '../../store/slices/createCategorySlice.js';
import { createPomodoroSlice } from '../../store/slices/createPomodoroSlice.js';
import { getSafeId } from '../idGenerator.js';
import { ensureCoachTaskId } from '../coachTaskId.js';
import { displaySubject, displayTopic } from '../displaySubject.js';
import { normalizeTaskPriority, parseCoachTask } from '../coachText.js';
import { getCalibrationHistoryFor } from '../coachSafe.js';
import { resolveUserTargetScorePoints } from '../scoreHelper.js';
import { calculateUrgency, getSuggestedFocus, generateDailyGoals, clearUrgencyCache, clearMcCache, clearTopicsCache } from '../coachLogic.js';
import { RaioXDashboard } from '../../pages/Coach.jsx';
import CoachMenuNav from '../../components/coach/CoachMenuNav.jsx';
import CoachControlCenter from '../../components/coach/CoachControlCenter.jsx';
import { useCoachControlCenter } from '../../hooks/useCoachControlCenter.js';
import { runCoachOrchestrator } from '../../engine/orchestrator/coachOrchestrator.js';
import { readFlags, replaceFlags, writeFlags, subscribeFlags, setCoachFeatureContestScope } from '../coachFeatureStore.js';
import AICoachWidget from '../../components/AICoachWidget.jsx';
import NextGoalCard from '../../components/NextGoalCard.jsx';
import { findSubjectTaskInContest, clearStudyingStatusInContest } from '../pomodoroHelpers.js';
import { estimatePosteriorPredictive } from '../../engine/probabilistic/posteriorPredictive.js';
import { explainCoachMetrics } from '../../llm/explanationAgent.js';
import { registerLLMProvider, clearLLMProvider } from '../../llm/llmClient.js';
import { persistCoachFlags, loadPersistedCoachFlags } from '../../engine/optimization/flagOptimizer.js';

describe('Coach AI Menu & Ecosystem Regression Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    clearUrgencyCache();
    clearMcCache();
    clearTopicsCache();
    setCoachFeatureContestScope('default');
    replaceFlags({}, 'default');
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Schemas, Sync, Store no-op & Category Deletion', () => {
    it('sanitizeContest preserves calibration fields, scale/exam config, adaptive setting and numeric coachScore', () => {
      const raw = {
        contestName: 'PRF 2026',
        maxScore: 120,
        minScore: -120,
        examDurationMinutes: 270,
        examTotalQuestions: 120,
        coachScore: 84.5,
        settings: {
          darkMode: true,
          adaptiveCalibrationEnabled: false,
          maxScore: 120,
        },
        calibrationHistoryByCategory: {
          dir_penal: [{ timestamp: 1700000000000, avgBrier: 0.14, ece: 0.05 }],
        },
        calibrationOps: {
          dir_penal: { categoryName: 'Direito Penal', degraded: false, avgBrier7d: 0.14 },
        },
        calibrationAuditLog: [
          { timestamp: 1700000000000, categoryId: 'dir_penal', avgBrier: 0.14 },
        ],
        categories: [],
      };

      const sanitized = sanitizeContest(raw, 'prf-2026');
      expect(sanitized.maxScore).toBe(120);
      expect(sanitized.minScore).toBe(-120);
      expect(sanitized.examDurationMinutes).toBe(270);
      expect(sanitized.examTotalQuestions).toBe(120);
      expect(sanitized.coachScore).toBe(84.5);
      expect(sanitized.settings.adaptiveCalibrationEnabled).toBe(false);
      expect(sanitized.settings.maxScore).toBe(120);
      expect(sanitized.calibrationHistoryByCategory.dir_penal).toHaveLength(1);
      expect(sanitized.calibrationOps.dir_penal.avgBrier7d).toBe(0.14);
      expect(sanitized.calibrationAuditLog).toHaveLength(1);
    });

    it('mergeAppStatePure merges calibration maps and exam config across devices', () => {
      const local = {
        activeId: 'c1',
        contests: {
          c1: {
            contestName: 'Test',
            lastUpdated: '2026-05-01T10:00:00.000Z',
            maxScore: 150,
            examDurationMinutes: 300,
            calibrationOps: { dir: { degraded: false } },
            calibrationHistoryByCategory: {
              Dir: [{ timestamp: 1700000001000, avgBrier: 0.18, ece: 0.04 }],
            },
            calibrationAuditLog: [{ timestamp: 1700000001000, categoryId: 'dir', avgBrier: 0.18 }],
            categories: [],
          },
        },
      };
      const cloud = {
        activeId: 'c1',
        contests: {
          c1: {
            contestName: 'Test',
            lastUpdated: '2026-05-01T12:00:00.000Z',
            minScore: 10,
            examTotalQuestions: 150,
            calibrationOps: { port: { degraded: true } },
            calibrationHistoryByCategory: {
              dir: [{ timestamp: 1700000002000, avgBrier: 0.12, ece: 0.03 }],
              port: [{ timestamp: 1700000002000, avgBrier: 0.31, ece: 0.11 }],
            },
            calibrationAuditLog: [{ timestamp: 1700000002000, categoryId: 'port', avgBrier: 0.31 }],
            categories: [],
          },
        },
      };

      const merged = mergeAppStatePure(local, cloud);
      const c1 = merged.contests.c1;
      expect(c1.maxScore).toBe(150);
      expect(c1.minScore).toBe(10);
      expect(c1.examDurationMinutes).toBe(300);
      expect(c1.examTotalQuestions).toBe(150);
      expect(c1.calibrationOps.dir).toEqual({ degraded: false });
      expect(c1.calibrationOps.port).toEqual({ degraded: true });
      expect(c1.calibrationHistoryByCategory.dir).toHaveLength(2);
      expect(c1.calibrationHistoryByCategory.port).toHaveLength(1);
      expect(c1.calibrationAuditLog).toHaveLength(2);
    });

    it('store setData does not bump version or dirty flag when callback returns prev unchanged', () => {
      const store = useAppStore.getState();
      const beforeVersion = store.appState.version;
      const beforeUpdated = store.appState.lastUpdated;
      localStorage.removeItem('ultra-sync-dirty');

      store.setData((prev) => prev);

      const after = useAppStore.getState();
      expect(after.appState.version).toBe(beforeVersion);
      expect(after.appState.lastUpdated).toBe(beforeUpdated);
      expect(localStorage.getItem('ultra-sync-dirty')).toBeNull();
    });

    it('deleteCategory cleans calibrationHistoryByCategory, calibrationOps and calibrationAuditLog', () => {
      const state = {
        appState: {
          activeId: 'c1',
          version: 1,
          trash: [],
          contests: {
            c1: {
              categories: [
                { id: 'cat-Dir', name: 'Direito Civil', tasks: [] },
                { id: 'cat-Port', name: 'Português', tasks: [] },
              ],
              simulados: [],
              simuladoRows: [],
              studyLogs: [],
              coachPlan: [],
              coachPlanner: { mon: [] },
              calibrationHistoryByCategory: {
                'cat-dir': [{ timestamp: 1, avgBrier: 0.1 }],
                'cat-Dir': [{ timestamp: 2, avgBrier: 0.2 }],
                'cat-port': [{ timestamp: 3, avgBrier: 0.15 }],
              },
              calibrationOps: {
                'cat-dir': { degraded: true },
                'cat-port': { degraded: false },
              },
              calibrationAuditLog: [
                { timestamp: 1, categoryId: 'cat-Dir', avgBrier: 0.2 },
                { timestamp: 2, categoryId: 'cat-port', avgBrier: 0.15 },
              ],
            },
          },
          pomodoro: {},
        },
      };
      const slice = createCategorySlice((fn) => fn(state));
      slice.deleteCategory('cat-Dir');

      const c1 = state.appState.contests.c1;
      expect(c1.calibrationHistoryByCategory['cat-dir']).toBeUndefined();
      expect(c1.calibrationHistoryByCategory['cat-Dir']).toBeUndefined();
      expect(c1.calibrationHistoryByCategory['cat-port']).toHaveLength(1);
      expect(c1.calibrationOps['cat-dir']).toBeUndefined();
      expect(c1.calibrationOps['cat-port']).toEqual({ degraded: false });
      expect(c1.calibrationAuditLog).toHaveLength(1);
      expect(c1.calibrationAuditLog[0].categoryId).toBe('cat-port');
    });
  });

  describe('2. Pomodoro, Priority & Math Consistency', () => {
    it('startNeuralSession resolves real categoryId instead of default and falls back to geral', () => {
      let state = {
        appState: {
          activeId: 'c1',
          contests: {
            c1: {
              categories: [{ id: 'cat-dir', name: 'Direito Constitucional', tasks: [] }],
            },
          },
          pomodoro: { isRunning: false, neuralMode: false, neuralQueue: [] },
        },
      };
      const slice = createPomodoroSlice(
        (fn) => (typeof fn === 'function' ? fn(state) : Object.assign(state, fn)),
        () => state
      );

      slice.startNeuralSession([{ title: 'Controle de Constitucionalidade', category: 'Direito Constitucional' }], 0);
      expect(state.appState.pomodoro.activeSubject.categoryId).toBe('cat-dir');

      slice.startNeuralSession([{ title: 'Tema Avulso', category: 'Sem Categoria Cadastrada' }], 0);
      expect(state.appState.pomodoro.activeSubject.categoryId).toBe('geral');
    });

    it('normalizeTaskPriority preserves explicit low priority on [STATUS] CRUZEIRO SEGURO banner', () => {
      const task = {
        text: 'Português: [STATUS] 🟢 CRUZEIRO SEGURO: Manter ritmo constante.',
        priority: 'low',
      };
      expect(normalizeTaskPriority(task, 'CRUZEIRO SEGURO', true)).toBe('low');
      const parsed = parseCoachTask(task);
      expect(parsed.priority).toBe('low');

      expect(normalizeTaskPriority({ text: '[ALERTA MESTRE] Vetor Crítico', priority: 'low' }, 'ALERTA', true)).toBe('high');
      expect(normalizeTaskPriority({ text: '[PROTOCOLO PRIORITÁRIO] Revisão', priority: 'low' }, '', false)).toBe('high');
    });

    it('getCalibrationHistoryFor resolves mixed-case and normalized keys for urgency calculation', () => {
      const historyMap = {
        'cat_Dir': [
          { timestamp: Date.now() - 2000, avgBrier: 0.35, ece: 0.14, calibrationPenalty: 0.12 },
          { timestamp: Date.now() - 1000, avgBrier: 0.34, ece: 0.13, calibrationPenalty: 0.11 },
        ],
      };
      expect(getCalibrationHistoryFor(historyMap, 'cat_dir')).toHaveLength(2);

      const category = {
        id: 'cat_dir',
        name: 'Direito',
        weight: 2,
        tasks: [{ id: 't1', text: 'Atos', priority: 'medium', completed: false }],
        simuladoStats: {
          history: Array.from({ length: 8 }, (_, idx) => ({
            id: `h-${idx}`,
            date: `2026-04-0${idx + 1}`,
            score: 70 + idx,
            correct: 14,
            total: 20,
          })),
        },
      };
      const urgency = calculateUrgency(category, [], [], {
        calibrationHistoryByCategory: historyMap,
        targetScore: 80,
        maxScore: 100,
        minScore: 0,
      });
      expect(urgency.details.monteCarlo.calibrationPenalty).toBeGreaterThan(0);
    });

    it('resolveUserTargetScorePoints avoids converting valid 0..100 points on 0..150 and scales sub-min ENEM default', () => {
      expect(resolveUserTargetScorePoints({ targetScore: 95 }, 0, 150)).toBe(95);
      expect(resolveUserTargetScorePoints({ targetScore: 80 }, 0, 120)).toBe(80);
      expect(resolveUserTargetScorePoints({ targetScore: 70 }, -120, 120)).toBe(70);
      expect(resolveUserTargetScorePoints({ targetScore: 75 }, 200, 1000)).toBe(800);
    });

    it('getSuggestedFocus and generateDailyGoals agree on MC probability when options are shared', () => {
      const categories = [
        {
          id: 'cat-1',
          name: 'Matemática',
          weight: 2,
          tasks: [{ id: 't1', text: 'Estudar Matrizes', priority: 'high', completed: false }],
          simuladoStats: {
            history: [
              { id: 's1', date: '2026-04-01', score: 65, correct: 13, total: 20 },
              { id: 's2', date: '2026-04-08', score: 75, correct: 15, total: 20 },
              { id: 's3', date: '2026-04-15', score: 80, correct: 16, total: 20 },
            ],
          },
        },
      ];
      const opts = {
        contestId: 'sync-check',
        targetScore: 80,
        maxScore: 100,
        minScore: 0,
        flashcardDue: 5,
        globalMcStats: { projectedMean: 74.2, probability: 58.3, currentMean: 73.1 },
      };

      const focus = getSuggestedFocus(categories, [], [], opts);
      const goals = generateDailyGoals(categories, [], [], opts);
      const actionable = goals.find((g) => g.categoryId === 'cat-1' && g.analysis?.monteCarlo);

      expect(focus).toBeTruthy();
      expect(actionable).toBeTruthy();
      expect(actionable.analysis.monteCarlo.probability).toBeCloseTo(
        focus.urgency.details.monteCarlo.probability,
        1
      );
    });
  });

  describe('3. RaioXDashboard, Widget, Control Center & Orchestrator', () => {
    it('RaioXDashboard filters deleted category logs and preserves valid same-date distinct simulados', () => {
      const mockData = {
        categories: [{ id: 'cat-keep', name: 'Informática' }],
        simulados: [
          { id: 'sim-am', batchId: 'batch-1', categoryId: 'cat-keep', date: '2026-05-10', score: 70 },
          { id: 'sim-pm', batchId: 'batch-2', categoryId: 'cat-keep', date: '2026-05-10', score: 85 },
          { id: 'sim-bad', batchId: 'batch-3', categoryId: 'cat-keep', date: '2026-05-11', score: 90, valid: false },
        ],
        simuladoRows: [
          { id: 'row-am', batchId: 'batch-1', categoryId: 'cat-keep', date: '2026-05-10', score: 70 },
        ],
        calibrationAuditLog: [
          { timestamp: 1700000002000, categoryId: 'cat-deleted', categoryName: 'Disciplina Removida', avgBrier: 0.35, ece: 0.2 },
          { timestamp: 1700000001000, categoryId: 'cat-keep', categoryName: 'Informática', avgBrier: 0.14, ece: 0.05 },
        ],
      };

      const html = renderToStaticMarkup(<RaioXDashboard data={mockData} />);
      expect(html).toContain('2/8');
      expect(html).toContain('Faltam 6 simulados');
      expect(html).not.toContain('Disciplina Removida');
    });

    it('AICoachWidget displays <1 pts instead of ±0 pts for sub-0.5 volatility', () => {
      const html = renderToStaticMarkup(
        <AICoachWidget
          suggestion={{
            id: 'cat-1',
            name: 'Redação',
            maxScore: 10,
            minScore: 0,
            weakestTopic: null,
            urgency: {
              score: 60,
              normalizedScore: 60,
              details: {
                hasData: true,
                humanReadable: {},
                monteCarlo: {
                  probability: 78,
                  volatility: 0.25,
                  projectedScore: 8.1,
                },
              },
            },
          }}
        />
      );
      expect(html).toContain('±&lt;1 pts');
    });

    it('CoachMenuNav shows Control Center tab when enabled and CoachControlCenter renders LLM tab', () => {
      render(
        <CoachMenuNav activeTab="insights" onChangeTab={() => { }} isPremium={true} showControlCenter={true} />
      );
      expect(screen.getByRole('tab', { name: /Control Center/i })).toBeTruthy();

      cleanup();

      render(<CoachControlCenter categories={[]} simulados={[]} studyLogs={[]} maxScore={100} targetScore={80} />);
      const llmTab = screen.getByRole('button', { name: /Explicação LLM/i });
      fireEvent.click(llmTab);
      expect(screen.getByText(/Explicação LLM do Foco/i)).toBeTruthy();
    });

    it('useCoachControlCenter clears flagOverrides and updates initial baseline on applyRecommendation', async () => {
      let api;
      function Harness() {
        api = useCoachControlCenter({ categories: [], simulados: [], studyLogs: [] });
        return null;
      }

      render(<Harness />);
      await act(async () => {
        api.toggleFlag('useStateSpace', true);
      });
      expect(api.flagOverrides).toEqual({ useStateSpace: true });

      let applied = false;
      await act(async () => {
        applied = api.applyRecommendation(
          { action: 'promote', features: { useStateSpace: false, useBayesianTopics: true } },
          { force: true }
        );
      });
      expect(applied).toBe(true);
      expect(api.flagOverrides).toEqual({});
      expect(api.currentFlags.useBayesianTopics).toBe(true);

      await act(async () => {
        api.toggleFlag('useStateSpace', true);
        api.resetOverrides();
      });
      expect(api.flagOverrides).toEqual({});
      expect(api.currentFlags.useBayesianTopics).toBe(true);
    });

    it('runCoachOrchestrator does not leak transient options.features into global coachFeatureStore', async () => {
      replaceFlags({ useStateSpace: false, useBayesianTopics: false }, 'isolated-contest');

      const res = await runCoachOrchestrator({
        contestId: 'isolated-contest',
        force: true,
        loadPersistedFlags: false,
        runHealth: false,
        runLLM: false,
        runAutoTuner: false,
        trainCausalModel: false,
        features: {
          useCoachOrchestrator: true,
          useStateSpace: true,
          useBayesianTopics: true,
        },
        categories: [
          {
            id: 'cat-1',
            name: 'Direito',
            tasks: [{ id: 't1', text: 'Revisar capítulo 1', completed: false }],
          },
        ],
      });

      expect(res.ok).toBe(true);
      const persistedAfter = readFlags('isolated-contest');
      expect(persistedAfter.useStateSpace).toBe(false);
      expect(persistedAfter.useBayesianTopics).toBe(false);
    });

    it('NextGoalCard integrates with store contest scale and calibration context', async () => {
      const store = useAppStore.getState();
      const prevActiveId = store.appState.activeId;
      useAppStore.setState((s) => ({
        appState: {
          ...s.appState,
          activeId: 'scale-test',
          contests: {
            ...s.appState.contests,
            'scale-test': {
              contestName: 'Escala 150',
              maxScore: 150,
              minScore: 0,
              user: { name: 'Teste', targetScore: 120 },
              categories: [
                {
                  id: 'cat-1',
                  name: 'Conhecimentos Específicos',
                  tasks: [{ id: 't-1', text: 'Revisão: Controle Externo', priority: 'high', completed: false }],
                  simuladoStats: {
                    history: [
                      { id: 'h1', date: '2026-04-01', score: 90, correct: 18, total: 30 },
                      { id: 'h2', date: '2026-04-08', score: 110, correct: 22, total: 30 },
                    ],
                  },
                },
              ],
              simulados: [],
              simuladoRows: [],
              studyLogs: [],
            },
          },
        },
      }));

      const contestCats = useAppStore.getState().appState.contests['scale-test'].categories;
      await act(async () => {
        render(<NextGoalCard categories={contestCats} simulados={[]} studyLogs={[]} onStartStudying={() => { }} />);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(screen.getByText(/Controle Externo/i)).toBeTruthy();
      });

      cleanup();
      useAppStore.setState((s) => ({
        appState: { ...s.appState, activeId: prevActiveId },
      }));
    });

    it('Pomodoro helpers locate completed tasks and clear studying status across categories, coachPlan, and coachPlanner', () => {
      const contest = {
        categories: [
          {
            id: 'cat-1',
            name: 'Direito',
            tasks: [{ id: 't1', text: 'Ler art. 5', completed: true, status: 'studying' }],
          },
        ],
        coachPlan: [{ id: 't2', text: 'Revisar jurisprudência', completed: false, status: 'studying' }],
        coachPlanner: {
          Mon: [{ id: 't3', text: 'Simulado rápido', completed: false, status: 'studying' }],
        },
      };

      const foundCat = findSubjectTaskInContest(contest, { categoryId: 'cat-1', taskId: 't1' });
      expect(foundCat.targetTask?.completed).toBe(true);

      const foundPlanner = findSubjectTaskInContest(contest, { categoryId: 'cat-1', taskId: 't3' });
      expect(foundPlanner.targetTask?.id).toBe('t3');

      const clearedCat = clearStudyingStatusInContest(contest, { categoryId: 'cat-1', taskId: 't1' });
      expect(clearedCat.categories[0].tasks[0].status).toBe('idle');
      expect(clearedCat.categories[0].tasks[0].completed).toBe(true);

      const clearedCoachPlan = clearStudyingStatusInContest(clearedCat, { categoryId: 'cat-1', taskId: 't2' });
      expect(clearedCoachPlan.coachPlan[0].status).toBe('idle');

      const clearedPlanner = clearStudyingStatusInContest(clearedCoachPlan, { categoryId: 'cat-1', taskId: 't3' });
      expect(clearedPlanner.coachPlanner.Mon[0].status).toBe('idle');
    });

    it('estimatePosteriorPredictive computes tight 95% CI around ability when targetScore <= minScore instead of full domain', () => {
      const res = estimatePosteriorPredictive({
        ability: 70,
        abilitySd: 3,
        trendPerDay: 0,
        trendSd: 0,
        dailyVolatility: 2,
        observationSd: 2,
        horizonDays: 0,
        targetScore: 0,
        minScore: 0,
        maxScore: 100,
        sampleSize: 12,
      });
      expect(res.probability).toBe(100);
      expect(res.ciLow).toBeGreaterThan(50);
      expect(res.ciHigh).toBeLessThan(90);
    });

    it('explainCoachMetrics honors useOrchestratorLLM and registerLLMProvider', async () => {
      registerLLMProvider({
        id: 'test-mock-llm',
        generateStructured: async () => ({
          headline: 'Diagnóstico Auditado pelo LLM',
          summary: 'A disciplina exige reforço imediato na resolução de questões.',
          causes: ['Queda recente de acerto em simulados'],
          recommendation: 'Priorizar bateria de questões comentadas.',
          confidence: 0.9,
          severity: 'high',
        }),
      });

      const out = await explainCoachMetrics(
        { categoryName: 'Direito Constitucional', urgencyScore: 82, probability: 42 },
        { features: { useOrchestratorLLM: true } }
      );

      expect(out.source).toBe('llm');
      expect(out.provider).toBe('test-mock-llm');
      expect(out.headline).toBe('Diagnóstico Auditado pelo LLM');
      clearLLMProvider();
    });

    it('isolates persisted Coach flags across different contestIds without leaking default flags', () => {
      persistCoachFlags({ useStateSpace: true, useBayesianTopics: true }, 'default');
      const contestBFlags = loadPersistedCoachFlags('contest-b');
      expect(contestBFlags.useStateSpace).not.toBe(true);
      expect(contestBFlags.useBayesianTopics).not.toBe(true);
    });

    it('generateDailyGoals avoids ID collisions for weakTopics sharing a 10-char prefix and avoids duplicate synthesis tasks', () => {
      const categories = [
        {
          id: 'cat-const',
          name: 'Direito Constitucional',
          weight: 10,
          tasks: [{ id: 't1', text: 'Controle de Constitucionalidade', completed: true }],
          simuladoStats: {
            history: [
              {
                date: '2026-04-10',
                topics: [
                  { name: 'Direito Constitucional I', total: 10, correct: 3, score: 30 },
                  { name: 'Direito Constitucional II', total: 10, correct: 8, score: 80 },
                ],
                total: 20,
                correct: 11,
                score: 55,
              },
            ],
          },
        },
      ];
      const goals = generateDailyGoals(categories, [], [], { maxScore: 100, minScore: 0 });
      const topicTask1 = goals.find(g => g.text.includes('Direito Constitucional I]'));
      const topicTask2 = goals.find(g => g.text.includes('Direito Constitucional II]'));
      expect(topicTask1).toBeDefined();
      expect(topicTask2).toBeDefined();
      const suffix1 = topicTask1.id.split('-').pop();
      const suffix2 = topicTask2.id.split('-').pop();
      expect(suffix1).not.toBe(suffix2);

      // Single completed topic with high weight (iterations = 3) should not emit duplicate synthesis topicNames
      const synthCat = [
        {
          id: 'cat-synth',
          name: 'Ética',
          weight: 10,
          tasks: [{ id: 't-eth', text: 'Código de Ética', completed: true }],
          simuladoStats: {
            history: [
              { date: new Date().toISOString(), topic: 'Código de Ética', total: 20, correct: 19, score: 95 },
            ],
          },
        },
      ];
      const synthGoals = generateDailyGoals(synthCat, [], [], { maxScore: 100, minScore: 0 });
      const synthTasks = synthGoals.filter(g => String(g.id).includes('-synthesis-'));
      const uniqueTopicNames = new Set(synthTasks.map(g => g.topicName));
      expect(uniqueTopicNames.size).toBe(synthTasks.length);
    });

    it('getSafeId and ensureCoachTaskId handle numeric primitives, whitespace IDs, and disambiguate identical text across categories', () => {
      expect(() => getSafeId(123)).not.toThrow();
      expect(getSafeId(123)).toBe('123');
      expect(getSafeId(0)).toBe('task-null-sentinel');
      expect(getSafeId('   ')).toBe('task-null-sentinel');
      expect(getSafeId({ id: '   ', text: 'Revisar Crase' })).not.toBe('   ');

      const taskPort = ensureCoachTaskId({ text: 'Revisar Teoria', category: 'Português' });
      const taskPenal = ensureCoachTaskId({ text: 'Revisar Teoria', category: 'Direito Penal' });
      expect(taskPort.id).toBeTruthy();
      expect(taskPenal.id).toBeTruthy();
      expect(taskPort.id).not.toBe(taskPenal.id);
    });

    it('displaySubject, displayTopic and parseCoachTask preserve Roman numerals, acronyms, object-map categories and colons in subject names', () => {
      const catMap = {
        c1: { id: 'c1', name: 'Direito Constitucional: Controle' },
      };
      expect(displaySubject('c1', catMap)).toBe('Direito Constitucional: Controle');
      expect(displayTopic('direito constitucional ii')).toBe('Direito Constitucional II');
      expect(displayTopic('revisão rápida (srs)')).toBe('Revisão Rápida (SRS)');
      expect(displayTopic('art. 5º da cf/88')).toBe('Art. 5º da CF/88');

      const parsed = parseCoachTask(
        {
          category: 'Direito Constitucional: Controle',
          text: 'Direito Constitucional: Controle: [ADI e ADC] Estudar jurisprudência',
        },
        catMap
      );
      expect(parsed.subject).toBe('Direito Constitucional: Controle');
      expect(parsed.topicRaw).toBe('ADI e ADC');
      expect(parsed.action).toBe('Estudar jurisprudência');
    });

    it('generateDailyGoals does not emit duplicate syllabus task when task has both topicName and text', () => {
      const categories = [
        {
          id: 'cat-dup-check',
          name: 'Português',
          weight: 10,
          tasks: [
            {
              id: 't-crase',
              topicName: 'Crase',
              text: 'Aula 01 - Regra Geral da Crase',
              completed: false,
            },
          ],
          simuladoStats: { history: [] },
        },
      ];
      const goals = generateDailyGoals(categories, [], [], { maxScore: 100, minScore: 0 });
      const craseTasks = goals.filter(
        g => g.text.includes('Crase') || (g.topicName && g.topicName.includes('Crase'))
      );
      // Should only be emitted once as weakTopic, not duplicated in Level 2 (Avanço de Edital)
      const syllabusDuplicates = craseTasks.filter(g => String(g.id).includes('-syllabus-'));
      expect(syllabusDuplicates).toHaveLength(0);
    });

    it('RaioXDashboard displays latestSampleSize instead of n=0, includes degraded-only history, and supports Firebase object maps', () => {
      const mockData = {
        categories: {
          c1: { id: 'cat_adm', name: 'Direito Administrativo' },
        },
        calibrationHistoryByCategory: {
          cat_adm: {
            0: {
              timestamp: 1700000005000,
              degraded: true,
              avgBrier: 0.24,
              ece: 0.09,
              sampleSize: 12,
              reliability: [{ binIndex: 0, meanPred: 0.7, observedRate: 0.65, gap: 0.05, count: 12 }],
            },
          },
        },
        calibrationAuditLog: {},
      };

      const html = renderToStaticMarkup(<RaioXDashboard data={mockData} />);
      expect(html).toContain('n=12');
      expect(html).not.toContain('n=0');
      expect(html).toContain('Curva de Confiabilidade');
    });

    it('useCoachControlCenter populates latestHealth on runOrchestrator, supports runBacktest/trainCausal, and notifies subscribeFlags', async () => {
      const events = [];
      const unsub = subscribeFlags((snapshot, scope) => {
        events.push({ snapshot, scope });
      });
      writeFlags({ useStateSpace: true }, 'flag-sub-test');
      unsub();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].scope).toBe('flag-sub-test');
      expect(events[0].snapshot.useStateSpace).toBe(true);

      let api;
      const sampleCats = [
        {
          id: 'cat-1',
          name: 'Português',
          weight: 5,
          tasks: [{ id: 't1', text: 'Crase', completed: true, completedAt: '2026-04-03' }],
          simuladoStats: {
            history: [
              { id: 's1', date: '2026-04-01', score: 60, total: 20, correct: 12 },
              { id: 's2', date: '2026-04-05', score: 75, total: 20, correct: 15 },
              { id: 's3', date: '2026-04-10', score: 80, total: 20, correct: 16 },
            ],
          },
        },
      ];
      function ControlHarness() {
        api = useCoachControlCenter({
          contestId: 'cc-test',
          categories: sampleCats,
          simulados: [],
          studyLogs: [{ categoryId: 'cat-1', date: '2026-04-03', minutes: 90 }],
        });
        return null;
      }

      render(<ControlHarness />);
      await act(async () => {
        await api.runOrchestrator({ runHealth: true });
      });
      expect(api.latestHealth).not.toBeNull();
      expect(Number.isFinite(Number(api.latestHealth?.healthScore))).toBe(true);

      await act(async () => {
        api.runBacktest();
        api.trainCausal();
      });
      expect(api.backtestReport).not.toBeNull();
      expect(api.causalModel).not.toBeNull();
    });
  });
});

