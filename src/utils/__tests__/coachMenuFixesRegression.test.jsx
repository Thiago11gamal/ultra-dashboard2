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
import { normalizeTaskPriority, parseCoachTask } from '../coachText.js';
import { getCalibrationHistoryFor } from '../coachSafe.js';
import { resolveUserTargetScorePoints } from '../scoreHelper.js';
import { calculateUrgency, getSuggestedFocus, generateDailyGoals, clearUrgencyCache, clearMcCache, clearTopicsCache } from '../coachLogic.js';
import { RaioXDashboard } from '../../pages/Coach.jsx';
import CoachMenuNav from '../../components/coach/CoachMenuNav.jsx';
import CoachControlCenter from '../../components/coach/CoachControlCenter.jsx';
import { useCoachControlCenter } from '../../hooks/useCoachControlCenter.js';
import { runCoachOrchestrator } from '../../engine/orchestrator/coachOrchestrator.js';
import { readFlags, replaceFlags, setCoachFeatureContestScope } from '../coachFeatureStore.js';
import AICoachWidget from '../../components/AICoachWidget.jsx';
import NextGoalCard from '../../components/NextGoalCard.jsx';
import { findSubjectTaskInContest, clearStudyingStatusInContest } from '../pomodoroHelpers.js';

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
        <CoachMenuNav activeTab="insights" onChangeTab={() => {}} isPremium={true} showControlCenter={true} />
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

      await runCoachOrchestrator({
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
        render(<NextGoalCard categories={contestCats} simulados={[]} studyLogs={[]} onStartStudying={() => {}} />);
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
  });
});

