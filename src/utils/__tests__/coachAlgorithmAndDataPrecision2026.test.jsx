// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { kalmanAbilityTrend } from '../../engine/probabilistic/stateSpace.js';
import { runCoachMonteCarlo } from '../coachAdaptive.js';
import {
  generateDailyGoals,
  _buildSortedTopics,
  clearUrgencyCache,
  clearMcCache,
  clearTopicsCache,
} from '../coachLogic.js';
import { extractObservabilitySeries } from '../coachObservability.js';
import {
  mergeSimuladosWithCategoryHistory,
  buildTaskCausalEvents,
} from '../coachCausal.js';
import {
  runAutoTunerCycle,
  saveBacktestReport,
} from '../../engine/optimization/autoTuner.js';
import {
  clearAllCoachFlags,
  setCoachFeatureContestScope,
  replaceFlags,
} from '../coachFeatureStore.js';
import { getFlashcardDueTodayCount, computeFlashcardDueForecast } from '../analytics.js';
import { useAppStore } from '../../store/useAppStore.js';
import { RaioXDashboard } from '../../pages/Coach.jsx';

describe('Coach AI 2026 — Algorithm Enhancement & Data Precision Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    clearUrgencyCache();
    clearMcCache();
    clearTopicsCache();
    clearAllCoachFlags();
    setCoachFeatureContestScope('default');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    clearAllCoachFlags();
  });

  it('1. State-Space Kalman filter propagates latent uncertainty across idle days since last exam', () => {
    const observations = [
      { date: '2026-03-01T12:00:00Z', score: 62 },
      { date: '2026-03-08T12:00:00Z', score: 66 },
      { date: '2026-03-15T12:00:00Z', score: 70 },
      { date: '2026-03-22T12:00:00Z', score: 73 },
    ];

    const fresh = kalmanAbilityTrend(observations, {
      now: '2026-03-22T12:00:00Z',
      maxScore: 100,
      minScore: 0,
    });
    const stale = kalmanAbilityTrend(observations, {
      now: '2026-05-06T12:00:00Z',
      maxScore: 100,
      minScore: 0,
    });

    expect(fresh.idleDays).toBe(0);
    expect(stale.idleDays).toBeGreaterThanOrEqual(44);
    expect(stale.abilitySd).toBeGreaterThan(fresh.abilitySd);
    expect(stale.trendSd).toBeGreaterThan(fresh.trendSd);
  });

  it('2. Walk-forward Monte Carlo applies Jeffreys smoothing and von Neumann RMSSD without degenerate probabilities', () => {
    const historyEntries = [
      { date: '2026-01-05', score: 42 },
      { date: '2026-01-12', score: 44 },
      { date: '2026-01-19', score: 46 },
      { date: '2026-01-26', score: 48 },
      { date: '2026-02-02', score: 50 },
      { date: '2026-02-09', score: 52 },
      { date: '2026-02-16', score: 54 },
      { date: '2026-02-23', score: 56 },
    ];

    const result = runCoachMonteCarlo(
      historyEntries,
      88,
      {},
      'cat-mc-test',
      100,
      null,
      45,
      0,
      0
    );

    expect(result).toBeTruthy();
    expect(Number.isFinite(result.probability)).toBe(true);
    expect(result.probability).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeLessThanOrEqual(100);
    expect(result.predObsPairs.length).toBeGreaterThanOrEqual(2);
    if (result.avgBrier !== null) {
      expect(Number.isFinite(result.avgBrier)).toBe(true);
    }
  });

  it('3. Coach Logic reports honest untested-syllabus details, attaches sourceTaskId, and damps 1-2 question noise trends', () => {
    const categories = [
      {
        id: 'cat-const',
        name: 'Direito Constitucional',
        weight: 20,
        tasks: [
          {
            id: 'syl-topic-1',
            title: 'Controle de Constitucionalidade',
            completed: false,
            priority: 'high',
          },
        ],
        simuladoStats: {
          history: [
            {
              id: 's1',
              date: '2026-03-01',
              score: 60,
              topics: [
                { name: 'MicroAmostra', total: 1, correct: 1 },
                { name: 'AmostraRobusta', total: 10, correct: 9 },
              ],
            },
            {
              id: 's2',
              date: '2026-03-15',
              score: 55,
              topics: [
                { name: 'MicroAmostra', total: 1, correct: 0 },
                { name: 'AmostraRobusta', total: 10, correct: 1 },
              ],
            },
          ],
        },
      },
    ];

    const goals = generateDailyGoals(categories, [], [], {
      contestId: 'test-honest-details',
    });

    const syllabusGoal = goals.find((g) => g.sourceTaskId === 'syl-topic-1');
    expect(syllabusGoal).toBeDefined();
    expect(syllabusGoal.actionType).toBe('weak_topic_practice');
    expect(syllabusGoal.analysis?.details || '').toContain('Sem questões registradas ainda');
    expect(syllabusGoal.analysis?.details || '').not.toContain('Última visita: 30 dias');

    const sortedTopics = _buildSortedTopics(categories[0], [], 100, 0, {
      contestId: 'test-honest-details',
    });
    const micro = sortedTopics.find((t) => t.name === 'MicroAmostra');
    const robust = sortedTopics.find((t) => t.name === 'AmostraRobusta');
    expect(micro).toBeDefined();
    expect(robust).toBeDefined();
    // With only 2 total questions, MicroAmostra's negative trend is damped relative to a 20-question sample
    expect(Math.abs(micro.trend)).toBeLessThan(Math.abs(robust.trend));
  });

  it('4. Deep-check counts logged questions in studyLogs and uses realistic mixed-study thresholds', () => {
    const nowIso = new Date().toISOString();
    const baseCategory = {
      id: 'cat-1',
      name: 'Português',
      weight: 10,
      simuladoStats: {
        history: [{ id: 'p1', date: nowIso, score: 52, total: 20, correct: 10 }],
      },
    };

    // 12 hours studied + 130 additional questions logged in studyLogs = (20+130)/12 = 12.5 q/h (>= 12 q/h threshold for 10..20h)
    const healthyGoals = generateDailyGoals(
      [baseCategory],
      [],
      [{ categoryId: 'cat-1', date: nowIso, minutes: 720, questions: 130 }],
      { contestId: 'deepcheck-healthy', targetScore: 80 }
    );
    expect(healthyGoals.some((g) => String(g.id).includes('-trap-'))).toBe(false);

    // 24 hours studied + only 20 additional questions = (20+20)/24 = 1.67 q/h (< 16 q/h threshold for >= 20h) -> triggers trap
    const passiveGoals = generateDailyGoals(
      [baseCategory],
      [],
      [{ categoryId: 'cat-1', date: nowIso, minutes: 1440, questions: 20 }],
      { contestId: 'deepcheck-passive', targetScore: 80 }
    );
    expect(passiveGoals.some((g) => String(g.id).includes('-trap-'))).toBe(true);
  });

  it('5. extractObservabilitySeries normalizes custom category score scales onto global contest scale and filters unvalidated exams', () => {
    const categories = [
      { id: 'cat-red', name: 'Redação', minScore: 0, maxScore: 40 },
      { id: 'cat-dir', name: 'Direito Administrativo', minScore: 0, maxScore: 100 },
    ];
    const simulados = [
      { id: '1', categoryId: 'cat-red', subject: 'Redação', date: '2026-03-01', score: 32, validated: true },
      { id: '2', categoryId: 'cat-dir', subject: 'Direito Administrativo', date: '2026-03-05', score: 80, validated: true },
      { id: '3', categoryId: 'cat-red', subject: 'Redação', date: '2026-03-10', score: 32, validated: true },
      { id: '4', categoryId: 'cat-dir', subject: 'Direito Administrativo', date: '2026-03-15', score: 80, validated: true },
      { id: '5', categoryId: 'cat-red', subject: 'Redação', date: '2026-03-18', score: 4, validated: false },
    ];

    const series = extractObservabilitySeries(simulados, {
      maxScore: 100,
      minScore: 0,
      categories,
      demeanBySubject: false,
      volatilityWindow: 3,
    });

    expect(series.scores).toEqual([80, 80, 80, 80]);
    expect(series.volatilities.every((v) => v === 0)).toBe(true);
  });

  it('6. mergeSimuladosWithCategoryHistory eliminates partial-simulados blind spot and buildTaskCausalEvents ingests completed Coach tasks', () => {
    const categories = [
      {
        id: 'cat-a',
        name: 'Contabilidade',
        tasks: [],
        simuladoStats: {
          history: [{ id: 'sim-a1', date: '2026-03-01', score: 70 }],
        },
      },
      {
        id: 'cat-b',
        name: 'Auditoria',
        tasks: [],
        simuladoStats: {
          history: [
            { id: 'sim-b1', date: '2026-03-02', score: 65 },
            { id: 'sim-b2', date: '2026-03-09', score: 78 },
          ],
        },
      },
    ];
    const topSimulados = [
      { id: 'sim-a1', categoryId: 'cat-a', subject: 'Contabilidade', date: '2026-03-01', score: 70 },
    ];

    const merged = mergeSimuladosWithCategoryHistory(categories, topSimulados);
    expect(merged).toHaveLength(3);
    expect(merged.filter((s) => s.categoryId === 'cat-b')).toHaveLength(2);

    const coachPlan = [
      {
        id: 'cp-1',
        categoryId: 'cat-b',
        category: 'Auditoria',
        actionType: 'srs_review',
        completed: true,
        completedAt: '2026-03-05T10:00:00Z',
        durationMinutes: 40,
      },
    ];
    const events = buildTaskCausalEvents(categories, merged, {
      coachPlan,
      maxHorizonDays: 45,
      maxScore: 100,
    });
    expect(events.some((e) => e.treated === 1 && String(e.id).startsWith('task-cat-b-'))).toBe(true);
  });

  it('7. AutoTuner bootstrap promotion gate blocks candidate strategies with significantly degraded paired Brier error', () => {
    const scope = 'autotuner-gate-test';
    setCoachFeatureContestScope(scope);
    replaceFlags({}, scope);

    const baseFolds = Array.from({ length: 10 }, (_, idx) => ({
      step: idx,
      probabilityEvaluation: { brier: 0.07 + (idx % 2) * 0.01 },
    }));
    const degradedCandidateFolds = Array.from({ length: 10 }, (_, idx) => ({
      step: idx,
      probabilityEvaluation: { brier: 0.26 + (idx % 2) * 0.02 },
    }));

    saveBacktestReport(
      {
        contestId: scope,
        summaries: {
          baseline: {
            count: 10,
            probability: { brier: 0.075, ece: 0.04, logLoss: 0.28 },
            score: { mae: 6.5, rmse: 7.5 },
            topics: { ndcg: 0.55 },
            tasks: { avgUplift: 1.0 },
          },
          conservative: {
            count: 10,
            probability: { brier: 0.27, ece: 0.04, logLoss: 0.30 },
            score: { mae: 1.2, rmse: 1.5 },
            topics: { ndcg: 0.99 },
            tasks: { avgUplift: 12.0 },
          },
        },
        raw: {
          baseline: baseFolds,
          conservative: degradedCandidateFolds,
        },
      },
      scope
    );

    const report = runAutoTunerCycle({
      contestId: scope,
      autoApply: false,
      saveHistory: false,
    });

    expect(report.recommendation.promotionGate).not.toBeNull();
    expect(report.recommendation.promotionGate.ciLow).toBeGreaterThan(0.005);
    expect(report.recommendation.action).toBe('keep');
  });

  it('8. Two-way task completion sync keeps category.tasks, coachPlan, and coachPlanner (__qN) aligned', () => {
    const contestId = 'sync-contest';
    useAppStore.setState((state) => ({
      ...state,
      appState: {
        ...state.appState,
        activeId: contestId,
        contests: {
          ...(state.appState?.contests || {}),
          [contestId]: {
            id: contestId,
            name: 'Concurso Sync',
            categories: [
              {
                id: 'cat-adm',
                name: 'Direito Administrativo',
                tasks: [
                  {
                    id: 'syl-42',
                    title: 'Atos Administrativos',
                    topicName: 'Atos Administrativos',
                    completed: false,
                    priority: 'high',
                  },
                ],
              },
            ],
            coachPlan: [
              {
                id: 'coach-item-42',
                sourceTaskId: 'syl-42',
                categoryId: 'cat-adm',
                category: 'Direito Administrativo',
                topicName: 'Avanço de Edital — Atos Administrativos',
                completed: false,
                priority: 'high',
              },
            ],
            coachPlanner: {
              seg: [
                {
                  id: 'coach-item-42__q1',
                  sourceTaskId: 'syl-42',
                  categoryId: 'cat-adm',
                  category: 'Direito Administrativo',
                  topicName: 'Avanço de Edital — Atos Administrativos',
                  completed: false,
                  priority: 'high',
                },
              ],
            },
          },
        },
      },
    }));

    useAppStore.getState().toggleNeuralTask('coach-item-42__q1');
    let contest = useAppStore.getState().appState.contests[contestId];
    expect(contest.coachPlanner.seg[0].completed).toBe(true);
    expect(contest.coachPlan[0].completed).toBe(true);
    expect(contest.categories[0].tasks[0].completed).toBe(true);

    useAppStore.getState().toggleTask('cat-adm', 'syl-42');
    contest = useAppStore.getState().appState.contests[contestId];
    expect(contest.categories[0].tasks[0].completed).toBe(false);
    expect(contest.coachPlan[0].completed).toBe(false);
    expect(contest.coachPlanner.seg[0].completed).toBe(false);
  });

  it('9. RaioXDashboard detects calibrationOps degraded entries even without simulado history and getFlashcardDueTodayCount respects future nextReview', () => {
    render(
      <RaioXDashboard
        data={{
          categories: [{ id: 'cat-1', name: 'Economia', simuladoStats: { history: [] } }],
          simulados: [],
          calibrationOps: {
            'cat-1': { degraded: true, updatedAt: Date.now() },
          },
        }}
      />
    );
    expect(screen.getByText('Degradado')).toBeTruthy();

    const decks = [
      {
        id: 'd1',
        cards: [
          { id: 'c-future', nextReview: '2099-12-31T00:00:00Z' },
          { id: 'c-past', nextReview: '2020-01-01T00:00:00Z' },
        ],
      },
    ];
    expect(getFlashcardDueTodayCount(decks)).toBe(1);
    const forecastResult = computeFlashcardDueForecast(decks, 7);
    expect(forecastResult.forecast[0].count).toBe(1);
    expect(forecastResult.totalDueInHorizon).toBe(1);
  });
});
