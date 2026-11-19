// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react';

import {
  calculateUrgency,
  generateDailyGoals,
  clearUrgencyCache,
  clearTopicsCache,
  clearMcCache,
} from '../coachLogic.js';
import {
  deriveAdaptiveRiskThresholds,
  computeContinuousMcBoost,
  runCoachMonteCarlo,
  clearMcCache as clearAdaptiveMcCache,
} from '../coachAdaptive.js';
import { ensureCoachTaskId } from '../coachTaskId.js';
import {
  sanitizeNum,
  getCrunchMultiplier,
  getCoachPriorities,
} from '../coach/coachPureHelpers.js';
import {
  analisarDesempenhoHistorico,
  getCombinedHistory,
} from '../coach/coachHistory.js';
import {
  getConfidenceTier,
  detectPerformanceDrift,
  buildPredictionMood,
  normalizeAlertSeverity,
} from '../explanationEngine.js';
import { computeSlopeAcceleration } from '../adaptiveEngine.js';
import { runCoachPipeline } from '../coachPipeline.js';
import { replaceFlags, readFlags, setCoachFeatureContestScope } from '../coachFeatureStore.js';

import {
  estimateTopicFsrs,
  fsrsRetrievability,
} from '../../engine/probabilistic/fsrs.js';
import {
  estimateDynamicVolatility,
} from '../../engine/probabilistic/volatility.js';
import {
  estimatePosteriorPredictive,
} from '../../engine/probabilistic/posteriorPredictive.js';
import {
  estimateBayesianTopics,
} from '../../engine/probabilistic/bayesianTopics.js';
import {
  rankDecisionCandidates,
} from '../../engine/probabilistic/decisionEngine.js';
import {
  buildKnowledgeGraph,
  computeKnowledgeGraphMetrics,
} from '../../engine/probabilistic/knowledgeGraph.js';
import {
  runStateSpaceModel,
  kalmanAbilityTrend,
} from '../../engine/probabilistic/stateSpace.js';

import {
  estimateNaiveUplift,
  estimateUpliftByAction,
} from '../../engine/causal/upliftModel.js';
import {
  buildTaskCausalEvents,
  buildStudyVolumeCausalEvents,
  trainCausalModel,
  loadCausalModel,
} from '../coachCausal.js';
import {
  inferActionType,
  scoreCandidatesWithCausal,
  estimateUplift,
} from '../../engine/causal/policyEngine.js';

import {
  saveEvaluationResult,
  loadEvaluationResults,
  compareEvaluationSummaries,
  evaluateProbabilityPrediction,
} from '../../engine/evaluation/coachEvaluator.js';
import {
  buildCategorySplits,
  runCoachStrategyBacktest,
} from '../../engine/evaluation/strategyBacktester.js';
import {
  buildCoachEvaluationDashboard,
} from '../coachEvaluation.js';
import {
  computeNDCGAtK,
  compareStrategyRuns,
} from '../coachBacktest.js';

import {
  rankStrategies,
  recommendFlagConfig,
  persistCoachFlags,
  getSafeBaselineFeatures,
} from '../../engine/optimization/flagOptimizer.js';
import {
  runAutoTunerCycle,
  saveBacktestReport,
} from '../../engine/optimization/autoTuner.js';
import {
  extractObservabilitySeries,
  runCoachDriftGuard,
} from '../coachObservability.js';
import { runCoachOrchestrator } from '../../engine/orchestrator/coachOrchestrator.js';

import {
  registerLLMProvider,
  clearLLMProvider,
} from '../../llm/llmClient.js';
import { validateCoachExplanation } from '../../llm/llmSchema.js';
import {
  normalizeCoachExplanationInput,
  explainCoachMetrics,
  clearLLMExplanationCache,
} from '../../llm/explanationAgent.js';
import { buildCoachExplanationPrompt } from '../../llm/llmPrompts.js';

import { useCoachControlCenter } from '../../hooks/useCoachControlCenter.js';
import CoachControlCenter from '../../components/coach/CoachControlCenter.jsx';

describe('Coach AI Complete Audit Regression Suite (Batches 1-3)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearUrgencyCache();
    clearTopicsCache();
    clearMcCache();
    clearAdaptiveMcCache();
    clearLLMExplanationCache();
    clearLLMProvider();
    setCoachFeatureContestScope('default');
    replaceFlags({}, 'default');
  });

  afterEach(() => {
    cleanup();
    clearLLMProvider();
  });

  describe('Batch 1 — Core Production Coach', () => {
    it('parses 3-decimal floats without thousands-strip bug and rejects malformed strings', () => {
      expect(sanitizeNum('0.500')).toBe(0.5);
      expect(sanitizeNum('75.125')).toBe(75.125);
      expect(sanitizeNum('1.234.567')).toBe(1234567);
      expect(Number.isNaN(sanitizeNum('1,2,3'))).toBe(true);
      expect(getCrunchMultiplier('')).toBe(1.0);
      expect(getCrunchMultiplier('abc')).toBe(1.0);
      expect(getCrunchMultiplier(Infinity)).toBe(1.0);
    });

    it('never resurrects valid:false simulados and never spikes morning rotationPenalty from negative elapsed hours', () => {
      const cat = {
        id: 'cat-penal',
        name: 'Direito Penal',
        weight: '0.500',
        tasks: [],
        simuladoStats: {
          history: [
            { id: 'bad-1', date: '2026-04-01', score: 15, valid: false },
          ],
        },
      };

      const morningNow = new Date('2026-04-10T08:00:00Z');
      const urgency = calculateUrgency(
        cat,
        [{ id: 'bad-2', categoryId: 'cat-penal', date: '2026-04-02', score: 10, valid: false }],
        [{ categoryId: 'cat-penal', date: '2026-04-10', minutes: 60 }],
        { now: morningNow, maxScore: 100, minScore: 0, targetScore: 80 }
      );

      expect(urgency.details.hasSimulados).toBe(false);
      expect(urgency.details.components.rotationPenalty).toBeLessThan(30);
    });

    it('aggregates FSRS c.due cards across multiple decks without duplicate SRS Blitz tasks and emits actionType', () => {
      const categories = [
        {
          id: 'cat-dir',
          name: 'Direito Constitucional',
          weight: 5,
          tasks: [{ id: 't1', text: 'Controle de Constitucionalidade', completed: false }],
          simuladoStats: {
            history: [
              { id: 's1', date: '2026-04-01', score: 75, total: 20, correct: 15 },
              { id: 's2', date: '2026-04-08', score: 78, total: 20, correct: 16 },
            ],
          },
        },
      ];
      const flashcardDecks = [
        {
          id: 'deck-1',
          categoryId: 'cat-dir',
          cards: Array.from({ length: 6 }, (_, i) => ({
            id: `c1-${i}`,
            due: '2026-04-01',
          })),
        },
        {
          id: 'deck-2',
          subject: 'Direito Constitucional',
          cards: Array.from({ length: 6 }, (_, i) => ({
            id: `c2-${i}`,
            due: '2026-04-02',
          })),
        },
      ];

      const goals = generateDailyGoals(categories, [], [], {
        now: new Date('2026-04-10T15:00:00Z'),
        flashcardDecks,
        maxScore: 100,
        minScore: 0,
        targetScore: 80,
      });

      const srsTasks = goals.filter((g) => g.actionType === 'srs_review');
      expect(srsTasks).toHaveLength(1);
      expect(srsTasks[0].text).toContain('12');
      expect(goals.every((g) => typeof g.actionType === 'string' && g.actionType.length > 0)).toBe(true);
    });

    it('keeps adaptive risk thresholds strictly in probability space and isolates mcCache clones', () => {
      const enemThresholds = deriveAdaptiveRiskThresholds(
        [
          { predicted: 700, actual: 720 },
          { predicted: 710, actual: 690 },
        ],
        { volatility: 10, maxScore: 1000, minScore: 200 }
      );
      expect(enemThresholds.danger).toBeGreaterThanOrEqual(15);
      expect(enemThresholds.danger).toBeLessThanOrEqual(45);
      expect(enemThresholds.safe).toBeGreaterThanOrEqual(75);
      expect(enemThresholds.safe).toBeLessThanOrEqual(97);

      expect(computeContinuousMcBoost(null)).toEqual({ boost: 0, riskLabel: 'unknown' });

      const histA = [
        { date: '2026-04-01', score: 50 },
        { date: '2026-04-03', score: 58 },
        { date: '2026-04-05', score: 68 },
        { date: '2026-04-08', score: 78 },
        { date: '2026-04-10', score: 88 },
      ];
      const histB = [
        { date: '2026-04-01', score: 88 },
        { date: '2026-04-03', score: 78 },
        { date: '2026-04-05', score: 68 },
        { date: '2026-04-08', score: 58 },
        { date: '2026-04-10', score: 50 },
      ];
      const mcA = runCoachMonteCarlo(histA, 80, {}, 'cat-mc-iso', 100, null, 30, 0, 0);
      expect(mcA).not.toBeNull();
      const origProb = mcA.probability;
      mcA.probability = 999; // attempt cache corruption
      const mcA2 = runCoachMonteCarlo(histA, 80, {}, 'cat-mc-iso', 100, null, 30, 0, 0);
      expect(mcA2.probability).toBe(origProb);

      const mcB = runCoachMonteCarlo(histB, 80, {}, 'cat-mc-iso', 100, null, 30, 0, 0);
      expect(mcB).not.toBeNull();
      expect(mcB.probability).not.toBe(mcA2.probability);
    });

    it('preserves task mutations in ensureCoachTaskId and handles history/explanation/pipeline edge cases', () => {
      const taskObj = { text: 'Estudar Atos', category: 'Administrativo', completed: false };
      const first = ensureCoachTaskId(taskObj);
      taskObj.completed = true;
      const second = ensureCoachTaskId(taskObj);
      expect(second.id).toBe(first.id);
      expect(second.completed).toBe(true);

      expect(() => analisarDesempenhoHistorico([{ data: '2026-04-01', score: 80 }], 1e12)).not.toThrow();

      const combined = getCombinedHistory(
        { id: 'c1', name: 'Português', minScore: null, maxScore: null, simuladoStats: { history: [] } },
        [{ categoryId: 'c1', date: '2026-04-01', score: NaN }, { categoryId: 'c1', date: '2026-04-02', score: 78 }],
        100,
        0
      );
      expect(combined).toHaveLength(1);
      expect(combined[0].score).toBe(78);

      const prioritized = getCoachPriorities(
        [{ name: 'Crase', total: 10, correct: 4, customTag: 'keep-me' }],
        { features: { useBayesianTopics: true } }
      );
      expect(prioritized[0].customTag).toBe('keep-me');

      expect(getConfidenceTier(10, 28, 100, 0)).not.toBe('HIGH');
      expect(buildPredictionMood({ probability: null })).toBe('unknown');
      expect(normalizeAlertSeverity('low').label).toBe('Informação');
      expect(normalizeAlertSeverity('medium').label).toBe('Atenção moderada');

      const drift = detectPerformanceDrift(
        [
          { date: '2026-03-01', score: 5 },
          { date: '2026-03-05', score: 5 },
          { date: '2026-03-10', score: 5 },
          { date: '2026-03-15', score: 1 },
          { date: '2026-03-20', score: 9 },
          { date: '2026-03-25', score: 1 },
        ],
        10,
        0
      );
      expect(drift.type).toBe('high_volatility');

      const accel = computeSlopeAcceleration(
        { slope: 10, slopePerDay: 10 / 30, count: 5 },
        { slope: 30, slopePerDay: 30 / 30, count: 5 },
        { maxScore: 1000, minScore: 0 }
      );
      expect(accel.message).toContain('+2.0 pp/mês');

      const pipe = runCoachPipeline(
        [{ id: 'c1', name: 'Penal', tasks: [{ id: 't1', text: 'Dolo', completed: false }] }],
        [],
        [],
        null
      );
      expect(pipe.focus).toBeTruthy();
      expect(typeof pipe.recommendation).toBe('string');
    });
  });

  describe('Batch 2 — Probabilistic, Causal, Evaluation, Optimization, Observability & Orchestrator', () => {
    it('fixes FSRS monotonicity/zero-scores/no-1970-date and Volatility √2 / GARCH irregular-dt', () => {
      // Zero scores must be preserved (not dropped by filter(Boolean)), and missing date => dueAtMs === null
      const fsrsZero = estimateTopicFsrs(
        { name: 'Crase', scores: [0, 0, 0], lastStudiedAt: null, difficulty: 1.0 },
        { maxScore: 100, minScore: 0 }
      );
      expect(fsrsZero).not.toBeNull();
      expect(fsrsZero.dueAtMs).toBeNull();

      // Difficulty mapping must be monotonic: higher difficulty -> lower stabilityDays
      const easyTopic = estimateTopicFsrs({ name: 'T', scores: [80, 80, 80], difficulty: 0.5 }, { maxScore: 100 });
      const medTopic = estimateTopicFsrs({ name: 'T', scores: [80, 80, 80], difficulty: 1.0 }, { maxScore: 100 });
      const hardTopic = estimateTopicFsrs({ name: 'T', scores: [80, 80, 80], difficulty: 2.0 }, { maxScore: 100 });
      expect(easyTopic.stabilityDays).toBeGreaterThan(medTopic.stabilityDays);
      expect(medTopic.stabilityDays).toBeGreaterThan(hardTopic.stabilityDays);
      expect(fsrsRetrievability(0, 0)).toBe(1);

      const altSeries = [
        { date: '2026-04-01', score: 70 },
        { date: '2026-04-02', score: 80 },
        { date: '2026-04-03', score: 70 },
        { date: '2026-04-04', score: 80 },
        { date: '2026-04-05', score: 70 },
        { date: '2026-04-06', score: 80 },
      ];
      const vol = estimateDynamicVolatility(altSeries, { maxScore: 100, minScore: 0 });
      expect(vol).not.toBeNull();
      expect(vol.volatility).toBeGreaterThan(0);
      expect(vol.volatility).toBeLessThan(12);
    });

    it('fixes PosteriorPredictive processAbilityVar fallback, StateSpace dtDays=0, Bayesian MoM, Decision RNG & KnowledgeGraph', () => {
      const ppLowVol = estimatePosteriorPredictive({
        ability: 75,
        abilitySd: 2,
        trendPerDay: 0,
        trendSd: 0,
        dailyVolatility: 0.5,
        observationSd: 1,
        processAbilityVar: null,
        horizonDays: 30,
        targetScore: 80,
        minScore: 0,
        maxScore: 100,
        sampleSize: 10,
      });
      const ppHighVol = estimatePosteriorPredictive({
        ability: 75,
        abilitySd: 2,
        trendPerDay: 0,
        trendSd: 0,
        dailyVolatility: 4,
        observationSd: 1,
        processAbilityVar: null,
        horizonDays: 30,
        targetScore: 80,
        minScore: 0,
        maxScore: 100,
        sampleSize: 10,
      });
      expect(ppHighVol.ciHigh - ppHighVol.ciLow).toBeGreaterThan(ppLowVol.ciHigh - ppLowVol.ciLow);

      const ssm = runStateSpaceModel(
        [
          { date: 0, score: 60 },
          { date: '2026-04-01', score: 70 },
          { date: '2026-04-08', score: 75 },
        ],
        { maxScore: 100, minScore: 0, observationNoise: -5 }
      );
      expect(ssm).not.toBeNull();
      expect(ssm.n).toBe(3);
      expect(Number.isFinite(ssm.ability)).toBe(true);
      expect(Number.isFinite(ssm.variance)).toBe(true);
      const kt = kalmanAbilityTrend(
        [
          { date: 0, score: 60 },
          { date: '2026-04-01', score: 70 },
          { date: '2026-04-08', score: 75 },
        ],
        { maxScore: 100, minScore: 0 }
      );
      expect(kt).not.toBeNull();
      expect(Number.isFinite(kt.ability)).toBe(true);

      const bayes = estimateBayesianTopics([
        { name: 'A', total: 1, correct: 1 },
        { name: 'B', total: 1, correct: 0 },
        { name: 'C', total: 1, correct: 1 },
        { name: 'D', total: 1, correct: 0 },
      ]);
      expect(bayes.globalPriorStrength).toBeLessThan(20);

      const rankedTwo = rankDecisionCandidates(
        [
          { id: 'cand-a', weakness: 0.5, weight: 5 },
          { id: 'cand-b', weakness: 0.5, weight: 5 },
        ],
        { useBandit: true, seed: 'iso-seed' }
      );
      const rankedThree = rankDecisionCandidates(
        [
          { id: 'cand-x', weakness: 0.5, weight: 5 },
          { id: 'cand-a', weakness: 0.5, weight: 5 },
          { id: 'cand-b', weakness: 0.5, weight: 5 },
        ],
        { useBandit: true, seed: 'iso-seed' }
      );
      const scoreA2 = rankedTwo.find((c) => c.id === 'cand-a').decisionScore;
      const scoreA3 = rankedThree.find((c) => c.id === 'cand-a').decisionScore;
      expect(scoreA3).toBe(scoreA2);

      const graph = buildKnowledgeGraph(
        [{ name: 'Álgebra', proficiency: null, percentage: 85 }],
        [
          { from: 'Álgebra', to: 'Cálculo' },
          { from: 'algebra', to: 'calculo' },
        ]
      );
      expect(graph.edges).toHaveLength(1);
      const metrics = computeKnowledgeGraphMetrics(graph);
      expect(metrics['algebra'].proficiency).toBeCloseTo(0.85, 2);
    });

    it('fixes Causal uplift arm guards, boundary/scale/log-isolation bugs, and policyEngine', () => {
      const noControl = estimateNaiveUplift([
        { treated: 1, outcomeDelta: 15 },
        { treated: 1, outcomeDelta: 20 },
      ]);
      expect(noControl.method).toBe('insufficient_arms');
      expect(noControl.uplift).toBe(0);

      const byActionNoControl = estimateUpliftByAction(
        Array.from({ length: 10 }, (_, i) => ({
          id: `e-${i}`,
          treated: 1,
          outcomeDelta: 10,
          actionType: 'weak_topic_practice',
        })),
        { minSamplesPerAction: 4 }
      );
      expect(byActionNoControl.actions.weak_topic_practice).toBeUndefined();

      const taskEvents = buildTaskCausalEvents(
        [
          {
            id: 'cat-10',
            name: 'Redação',
            maxScore: 10,
            minScore: 0,
            tasks: [
              // Same day as prevSim -> treated only, NOT also control; two tasks in same interval deduplicated
              { id: 't1', text: 'Resolver questões', completed: true, completedAt: '2026-04-01' },
              { id: 't2', text: 'Bateria de questões', completed: true, completedAt: '2026-04-02' },
            ],
            simuladoStats: {
              history: [
                { id: 's1', date: '2026-04-01', score: 6 },
                { id: 's2', date: '2026-04-06', score: 8 }, // +2 on [0..10] => +20 on [0..100]
                { id: 's3', date: '2026-04-11', score: 8 }, // control interval
              ],
            },
          },
        ],
        [],
        { maxScore: 100, minScore: 0 }
      );
      const treated = taskEvents.filter((e) => e.treated === 1);
      const controls = taskEvents.filter((e) => e.treated === 0);
      expect(treated).toHaveLength(1);
      expect(controls).toHaveLength(1);
      expect(treated[0].outcomeDelta).toBeCloseTo(20, 4);
      expect(treated[0].daysSince).toBeCloseTo(5, 4);
      expect(controls[0].daysSince).toBeCloseTo(5, 4);

      const volEvents = buildStudyVolumeCausalEvents(
        [
          { id: 'p1', subject: 'Direito Penal', date: '2026-04-01', score: 60 },
          { id: 'p2', subject: 'Direito Penal', date: '2026-04-08', score: 70 },
        ],
        [
          // Log without subjectLabel must NOT contaminate Direito Penal
          { date: '2026-04-04', minutes: 120 },
        ],
        { maxScore: 100, minScore: 0, minTreatmentMinutes: 60 }
      );
      expect(volEvents).toHaveLength(1);
      expect(volEvents[0].treated).toBe(0);

      expect(inferActionType('Tempo do Crime')).toBe('weak_topic_practice');
      expect(inferActionType('Memória RAM')).toBe('weak_topic_practice');
      expect(inferActionType('Provas no Processo Penal')).toBe('weak_topic_practice');
      expect(inferActionType('Revisão Expressa (Agilidade)')).toBe('agility_training');
      expect(inferActionType('Revisão Espaçada (SRS)')).toBe('srs_review');
      expect(inferActionType('Vetor Crítico: Simulado')).toBe('mock_exam');

      const scoredNoModel = scoreCandidatesWithCausal(
        [{ id: 'a', type: 'weak_topic_practice', decisionUtility: 80 }],
        null
      );
      expect(scoredNoModel[0].effectiveCausalWeight).toBe(0);
      expect(scoredNoModel[0].finalPolicyScore).toBe(80);

      expect(estimateUplift({ outcome: 10, treatment: '0', propensity: 0.5 })).toBe(-20);
      expect(estimateUplift({ outcome: 10, treatment: 'false', propensity: 0.5 })).toBe(-20);
    });

    it('fixes Evaluator, Backtester, FlagOptimizer, AutoTuner, Observability and Orchestrator', async () => {
      const probEvalFalseStr = evaluateProbabilityPrediction(80, '0');
      expect(probEvalFalseStr.observed).toBe(0);

      const saved = saveEvaluationResult(
        {
          count: 5,
          generatedAt: Date.now(),
          probability: { count: 5, avgBrier: 0.12, ece: 0.04 },
          score: { count: 5, mae: 3.5 },
        },
        'eval-save-test'
      );
      expect(saved).toBe(true);
      const reloaded = loadEvaluationResults('eval-save-test');
      expect(reloaded[0].probability).toEqual({ count: 5, avgBrier: 0.12, ece: 0.04 });

      const comp = compareEvaluationSummaries(
        { count: 10, probability: { avgBrier: 0.2, ece: 0.1 }, score: { mae: 12 }, topics: {} },
        { count: 10, probability: { avgBrier: 0.2, ece: 0.1 }, score: { mae: 2 }, topics: {} }
      );
      expect(comp.winner).toBe('candidate');
      expect(comp.heuristicScore).toBeGreaterThan(0);

      expect(computeNDCGAtK([{ id: 'a' }], [{ id: 'a', relevance: 1 }], 0)).toBe(0);
      const runCmp = compareStrategyRuns(
        { control: [0], treatment: [-5] },
        { control: [], treatment: [] },
        ['uplift']
      );
      expect(runCmp.winner).toBe('tie');

      const splits = buildCategorySplits(
        {
          id: 'cat-s',
          name: 'Matemática',
          simuladoStats: {
            history: [
              { id: 'u1', score: 50 }, // undated must go to train prefix, NOT future
              ...Array.from({ length: 10 }, (_, i) => ({
                id: `d-${i}`,
                date: `2026-03-${String(i + 1).padStart(2, '0')}`,
                score: 60 + i,
              })),
            ],
          },
        },
        [],
        { minTrain: 4, horizon: 1, maxSplits: 2 }
      );
      expect(splits).toHaveLength(2);
      // Most recent splits (ends on 2026-03-10), not oldest
      expect(splits[splits.length - 1].future[0].date).toBe('2026-03-10');

      const bt = runCoachStrategyBacktest({
        categories: [
          {
            id: 'cat-leak',
            name: 'História',
            tasks: [{ id: 't-future', text: 'Revolução', completed: true, completedAt: '2026-04-20' }],
            simuladoStats: {
              history: Array.from({ length: 6 }, (_, i) => ({
                id: `h-${i}`,
                date: `2026-03-${String(i + 1).padStart(2, '0')}`,
                score: 65 + i,
              })),
            },
          },
        ],
        minTrain: 4,
        horizon: 1,
      });
      const btDash = buildCoachEvaluationDashboard(bt);
      expect(btDash).not.toBeNull();
      expect(btDash.count).toBeGreaterThan(0);

      const ranked = rankStrategies({
        baseline: { count: 10, probability: { avgBrier: 0.25 }, score: { mae: 8 }, topics: { avgNdcg: 0.5 } },
        'all-lots': { count: 10, probability: { avgBrier: 0.12 }, score: { mae: 3 }, topics: { avgNdcg: 0.9 } },
        'lot1-state-space': { count: 0 },
      });
      const allMath = ranked.find((r) => r.id === 'all-math-lots');
      const zeroCount = ranked.find((r) => r.id === 'lot1-state-space');
      expect(allMath.hasEvidence).toBe(true);
      expect(allMath.score).toBeGreaterThan(0);
      expect(zeroCount.hasEvidence).toBe(false);
      expect(zeroCount.score).toBe(0);

      // Exploration must NOT fire when there is no evidence
      const noEvidenceRec = recommendFlagConfig({
        ranked: [{ id: 'baseline', hasEvidence: false, score: 0 }, { id: 'lot1', hasEvidence: false, score: 0, features: { useStateSpace: true } }],
        exploration: true,
      });
      expect(noEvidenceRec.action).toBe('keep');

      // Critical rollback must return full safe baseline map
      const critRec = recommendFlagConfig({
        ranked,
        latestHealth: { status: 'critical', healthScore: 30 },
      });
      expect(critRec.action).toBe('rollback');
      expect(critRec.features).toEqual(getSafeBaselineFeatures());

      // AutoTuner read-only must NOT overwrite in-memory flags and must honor explicit options.evaluations
      replaceFlags({ useStateSpace: true }, 'tuner-readonly');
      persistCoachFlags({ useStateSpace: false }, 'tuner-readonly');
      saveBacktestReport({ summaries: { baseline: { count: 10 } } }, 'tuner-readonly');
      const tunerRes = runAutoTunerCycle({
        contestId: 'tuner-readonly',
        autoApply: false,
        evaluations: [
          {
            strategyId: 'lot1-state-space',
            probabilityEvaluation: { predictedProbability01: 0.9, observed: 1, brier: 0.01 },
            scoreEvaluation: { absoluteError: 1 },
          },
        ],
      });
      expect(readFlags('tuner-readonly').useStateSpace).toBe(true);
      expect(tunerRes.inputs.hasBacktestReport).toBe(false);

      // Observability: valid:false skipped, undated first, probabilityPairs array doesn't corrupt options
      const series = extractObservabilitySeries([
        { date: '2026-04-01', score: 70, subject: 'Matemática' },
        { date: '2026-04-02', score: 10, subject: 'Matemática', valid: false },
        { score: 50, subject: 'matematica' }, // undated -> sorted FIRST
        { date: '2026-04-03', score: 80, subject: 'Matemática' },
      ], { volatilityWindow: 3 });
      expect(series.scores[0]).toBe(50);
      expect(series.scores).toHaveLength(3);

      const health = runCoachDriftGuard({
        contestId: 'obs-test',
        scores: [70, 75, 80, 82, 85],
        volatilities: [2, 2.5, 2],
        probabilityPairs: Array.from({ length: 10 }, () => ({ probability: 0.8, observed: 1 })),
        saveSnapshot: false,
      });
      expect(Number.isFinite(health.healthScore)).toBe(true);

      // Orchestrator bootstraps persisted useCoachOrchestrator:true BEFORE enabled check
      persistCoachFlags({ useCoachOrchestrator: true }, 'boot-orch-test');
      replaceFlags({}, 'boot-orch-test');
      const orchRes = await runCoachOrchestrator({
        contestId: 'boot-orch-test',
        runHealth: false,
        runLLM: false,
        runAutoTuner: false,
        trainCausalModel: false,
        categories: [{ id: 'c1', name: 'Português', tasks: [] }],
      });
      expect(orchRes.ok).toBe(true);
    });
  });

  describe('Batch 3 — LLM Layer & Control Center', () => {
    it('hardens llmSchema against objects, preserves math comparisons, enforces strict mode, and improves explanationAgent', async () => {
      // Reject object values that would stringify to "[object Object]"
      expect(
        validateCoachExplanation({
          headline: { bad: true },
          severity: 'high',
          causes: ['ok'],
          recommendation: 'Estude mais',
        })
      ).toBeNull();

      // Preserves '<' math comparison while stripping HTML tags
      const sanitized = validateCoachExplanation({
        headline: '<b>Atenção</b>: probabilidade < 25% e nota > 50',
        severity: ' high ',
        causes: ['<script>x</script>Risco < 30%'],
        recommendation: 'Revisar fundamentos',
        confidence: 0.85,
      });
      expect(sanitized.headline).toBe('Atenção: probabilidade < 25% e nota > 50');
      expect(sanitized.severity).toBe('high');
      expect(sanitized.causes[0]).toBe('xRisco < 30%');

      // Strict mode rejects invalid severity and out-of-range confidence
      expect(
        validateCoachExplanation(
          { headline: 'Ok', severity: 'invalid', causes: ['a'], recommendation: 'b' },
          { strict: true }
        )
      ).toBeNull();
      expect(
        validateCoachExplanation(
          { headline: 'Ok', severity: 'low', causes: ['a'], recommendation: 'b', confidence: 500 },
          { strict: true }
        )
      ).toBeNull();

      // recencyUnknown prevents fabricating daysSinceLastStudy
      const norm = normalizeCoachExplanationInput({
        details: { daysSinceLastStudy: 30, recencyUnknown: true },
      });
      expect(norm.daysSinceLastStudy).toBeNull();
      expect(norm.recencyUnknown).toBe(true);

      // Prompt skips object fields & exposes riskLabel/probabilityRaw/recencyUnknown
      const prompt = buildCoachExplanationPrompt({
        categoryName: { evil: 1 },
        riskLabel: 'critical',
        probabilityRaw: 18,
        recencyUnknown: true,
      });
      expect(prompt).not.toContain('[object Object]');
      expect(prompt).toContain('"riskLabel": "critical"');
      expect(prompt).toContain('"probabilityRaw": 18');

      // Timeout reports llm_timeout (not llm_invalid_output) and cache clones causes
      registerLLMProvider({
        id: 'slow-mock',
        generateStructured: () => new Promise(() => {}),
      });
      const timedOut = await explainCoachMetrics(
        { categoryName: 'Penal', urgencyScore: 70 },
        { features: { useLLMExplanations: true }, timeoutMs: 25 }
      );
      expect(timedOut.source).toBe('fallback');
      expect(timedOut.reason).toBe('llm_timeout');

      // Register fast provider & verify cache isolation on causes array
      registerLLMProvider({
        id: 'fast-mock',
        generateStructured: async () => ({
          headline: 'Resumo Limpo',
          severity: 'medium',
          causes: ['Causa original'],
          recommendation: 'Manter plano',
          confidence: 0.8,
        }),
      });
      const firstLlm = await explainCoachMetrics(
        { categoryName: 'Civil', urgencyScore: 60 },
        { features: { useLLMExplanations: true } }
      );
      firstLlm.causes.push('MUTACAO_EXTERNA');
      const secondLlm = await explainCoachMetrics(
        { categoryName: 'Civil', urgencyScore: 60 },
        { features: { useLLMExplanations: true } }
      );
      expect(secondLlm.cached).toBe(true);
      expect(secondLlm.causes).toEqual(['Causa original']);

      // Circular input must not throw
      const circular = { categoryName: 'Tributário', urgencyScore: 50 };
      circular.self = circular;
      const circRes = await explainCoachMetrics(circular, { features: { useLLMExplanations: true } });
      expect(circRes.source).toBe('llm');
    });

    it('fixes useCoachControlCenter validation, override rollback, clearError, and CoachControlCenter null rendering + preset buttons', async () => {
      // Seed an existing causal model so empty trainCausal doesn't overwrite persisted model
      trainCausalModel(
        [
          { treated: 1, outcomeDelta: 10 },
          { treated: 0, outcomeDelta: 2 },
        ],
        { contestId: 'cc-audit', save: true }
      );

      let api;
      function HookHarness() {
        api = useCoachControlCenter({
          contestId: 'cc-audit',
          categories: [],
          simulados: [],
          studyLogs: [],
        });
        return null;
      }

      render(<HookHarness />);

      // Invalid flag key is ignored
      await act(async () => {
        api.toggleFlag('nonExistentFakeFlag', true);
      });
      expect(api.flagOverrides).toEqual({});

      // Toggle ON then back OFF clears the override entry
      await act(async () => {
        api.toggleFlag('useStateSpace', true);
      });
      expect(api.flagOverrides).toEqual({ useStateSpace: true });
      await act(async () => {
        api.toggleFlag('useStateSpace', false);
      });
      expect(api.flagOverrides).toEqual({});

      // resetOverrides falls back cleanly to safe baseline when initialFlags was {}
      await act(async () => {
        api.toggleFlag('useBayesianTopics', true);
        api.resetOverrides();
      });
      expect(api.currentFlags.useBayesianTopics).toBe(false);

      // Empty trainCausal preserves previously persisted causal model
      await act(async () => {
        api.trainCausal();
      });
      expect(loadCausalModel('cc-audit').sampleSize).toBe(2);
      expect(typeof api.clearError).toBe('function');

      cleanup();

      // UI test: preset buttons apply strategy flags & null timestamps/confidence never render 1969 or 0%
      localStorage.setItem(
        'coach_model_health_v1:ui-null-check',
        JSON.stringify([{ healthScore: null, status: 'unknown', generatedAt: null, alerts: [] }])
      );
      render(
        <CoachControlCenter
          contestId="ui-null-check"
          categories={[]}
          simulados={[]}
          studyLogs={[]}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Saúde & Drift/i }));
      expect(document.body.textContent).not.toContain('1969');
      expect(document.body.textContent).not.toContain('1970');

      fireEvent.click(screen.getByRole('button', { name: /Feature Flags/i }));
      const presetBtn = screen.getByRole('button', { name: /Conservador — Lotes 1 \+ 2/i });
      fireEvent.click(presetBtn);
      expect(readFlags('ui-null-check').useStateSpace).toBe(true);
      expect(readFlags('ui-null-check').useDynamicVolatility).toBe(true);
    });
  });
});
