import { describe, it, expect } from 'vitest';
import { estimatePosteriorPredictive } from '../probabilistic/posteriorPredictive.js';
import { calculateEMA, computeHierarchicalAdjustment } from '../stats.js';
import { conformalPredictionInterval } from '../math/bootstrap.js';
import { getBanditPosterior, rankDecisionCandidates } from '../probabilistic/decisionEngine.js';
import { cusumDrift, detectCalibrationDrift, detectVolatilityDrift } from '../observability/driftMonitor.js';
import { evaluateModelHealth } from '../observability/modelHealth.js';
import { summarizeCoachEvaluations } from '../evaluation/coachEvaluator.js';
import { summarizeCalibration } from '../../utils/calibration.js';
import { generateDailyGoals } from '../../utils/coachLogic.js';

describe('Verified Mathematical Fixes Regression Suite', () => {
  it('1. estimatePosteriorPredictive avoids noise double-counting and scales abilityTrendCov by effectiveTrendDays * 0.6', () => {
    const withKalman = estimatePosteriorPredictive({
      ability: 70,
      abilitySd: 4,
      trendPerDay: 0.1,
      trendSd: 0.05,
      abilityTrendCov: 0.1,
      observationSd: 6,
      processAbilityVar: 0.0025,
      processTrendVar: 0.0001,
      dailyVolatility: 10,
      horizonDays: 60,
      targetScore: 80,
      minScore: 0,
      maxScore: 100,
      sampleSize: 12,
    }, { simulations: 1000, seed: 'kalman-no-double-count' });

    const legacyWithoutKalman = estimatePosteriorPredictive({
      ability: 70,
      abilitySd: 4,
      trendPerDay: 0.1,
      trendSd: 0.05,
      abilityTrendCov: 0.1,
      observationSd: 6,
      dailyVolatility: 10,
      horizonDays: 60,
      targetScore: 80,
      minScore: 0,
      maxScore: 100,
      sampleSize: 12,
    }, { simulations: 1000, seed: 'kalman-no-double-count' });

    expect(withKalman.diagnostics.baseNoiseSd).toBeLessThan(10);
    expect(withKalman.ciHigh - withKalman.ciLow).toBeLessThan(legacyWithoutKalman.ciHigh - legacyWithoutKalman.ciLow);

    // Target <= minScore branch: positive covariance must widen CI more than negative covariance
    const posCov = estimatePosteriorPredictive({
      ability: 50,
      abilitySd: 5,
      trendPerDay: 0,
      trendSd: 0.2,
      abilityTrendCov: 0.9,
      observationSd: 2,
      processAbilityVar: 0,
      processTrendVar: 0,
      horizonDays: 60,
      targetScore: 0,
      minScore: 0,
      maxScore: 100,
    });
    const negCov = estimatePosteriorPredictive({
      ability: 50,
      abilitySd: 5,
      trendPerDay: 0,
      trendSd: 0.2,
      abilityTrendCov: -0.9,
      observationSd: 2,
      processAbilityVar: 0,
      processTrendVar: 0,
      horizonDays: 60,
      targetScore: 0,
      minScore: 0,
      maxScore: 100,
    });
    expect(posCov.ciHigh - posCov.ciLow).toBeGreaterThan(negCov.ciHigh - negCov.ciLow);
  });

  it('2. calculateEMA is symmetric without upward bias on stationary oscillating series', () => {
    const upFirst = [60, 80, 60, 80, 60, 80, 60, 80];
    const downFirst = [80, 60, 80, 60, 80, 60, 80, 60];
    const emaUp = calculateEMA(upFirst, 0.25, 100, 0);
    const emaDown = calculateEMA(downFirst, 0.25, 100, 0);
    // Symmetric mirror around 70: average must be exactly 70
    expect((emaUp + emaDown) / 2).toBeCloseTo(70, 6);
  });

  it('3. computeHierarchicalAdjustment uses DerSimonian-Laird tau2 discounting within-category variance', () => {
    const cats = [
      { key: 'noisy', mean: 90, sd: 10, n: 2 },
      { key: 'solid', mean: 70, sd: 10, n: 50 },
    ];
    const res = computeHierarchicalAdjustment(cats, 10);
    // rawTau2 = 200; meanLocalVar = (50 + 2) / 2 = 26 -> tau2 = 174 (< 200), so shrinkage B = 50/224 > 50/250 = 0.2
    // bayesianMean = 80 * (50/224) + 90 * (174/224) = 87.767857 (< 88 without DL)
    expect(res[0].shrinkage).toBeCloseTo(50 / 224, 6);
    expect(res[0].bayesianMean).toBeCloseTo(80 * (50 / 224) + 90 * (174 / 224), 4);
    expect(res[0].bayesianMean).toBeLessThan(88);
  });

  it('4. conformalPredictionInterval preserves finite-sample coverage when ceil((n+1)(1-alpha)) > n', () => {
    const residuals = [1, 2, 3, 4, 5]; // n=5, alpha=0.05 -> rawRank = ceil(6*0.95) = 6 > 5
    const bounded = conformalPredictionInterval(residuals, 0.05, 70, { minScore: 0, maxScore: 100 });
    expect(bounded.lower).toBe(0);
    expect(bounded.upper).toBe(100);
    expect(bounded.coverageGuaranteed).toBe(true);

    const unbounded = conformalPredictionInterval(residuals, 0.05, 70);
    expect(unbounded.coverageGuaranteed).toBe(false);
    expect(unbounded.effectiveCoverage).toBeCloseTo(5 / 6, 4);
  });

  it('5. decisionEngine uses flat Beta(1,1) prior so utility is not double-counted', () => {
    const lowUtilPost = getBanditPosterior('action-a', 10, 'test-flat-prior');
    const highUtilPost = getBanditPosterior('action-a', 95, 'test-flat-prior');
    expect(lowUtilPost.alpha).toBe(1);
    expect(lowUtilPost.beta).toBe(1);
    expect(highUtilPost.alpha).toBe(1);
    expect(highUtilPost.beta).toBe(1);

    const ranked = rankDecisionCandidates(
      [
        { id: 't1', weakness: 0.5, uncertainty: 0.5, evidence: 0.5 },
        { id: 't2', weakness: 0.5, uncertainty: 0.5, evidence: 0.5 },
      ],
      { useBandit: true }
    );
    expect(ranked).toHaveLength(2);
    expect(Number.isFinite(ranked[0].decisionScore)).toBe(true);
  });

  it('6. driftMonitor detects upward drift in error/volatility metrics (badDirection="up")', () => {
    const risingBrier = [0.08, 0.09, 0.08, 0.09, 0.08, 0.18, 0.21, 0.24, 0.25];
    const cusum = cusumDrift(risingBrier, { badDirection: 'up' });
    expect(cusum.alarm).toBe('up');
    expect(cusum.isImproving).toBe(false);

    const volDrift = detectVolatilityDrift([3, 3.2, 2.9, 3.1, 3.0, 9, 10, 11]);
    expect(volDrift.isBadDrift).toBe(true);
    expect(volDrift.cusum.alarm).toBe('up');

    const calEvents = risingBrier.map((avgBrier, idx) => ({
      timestamp: 1700000000000 + idx * 86400000,
      avgBrier,
    }));
    const calDrift = detectCalibrationDrift(calEvents);
    expect(calDrift.hasDrift).toBe(true);
    expect(calDrift.brier.cusum.alarm).toBe('up');
  });

  it('7. modelHealth and coachEvaluator avoid 1-sample-bin ECE inflation on tiny pair counts', () => {
    const fivePairs = [
      { probability: 0.1, observed: 0 },
      { probability: 0.3, observed: 0 },
      { probability: 0.5, observed: 1 },
      { probability: 0.7, observed: 1 },
      { probability: 0.9, observed: 1 },
    ];
    const health = evaluateModelHealth({ probabilityPairs: fivePairs });
    expect(health.metrics.currentCalibration.ece).toBeNull();
    expect(health.metrics.currentCalibration.status).toBe('insufficient_data');

    const evalSummary = summarizeCoachEvaluations(
      fivePairs.map((p, idx) => ({
        probabilityEvaluation: {
          probability: p.probability,
          observed: p.observed,
          brier: (p.probability - p.observed) ** 2,
          logLoss: 0.3,
          absoluteError: Math.abs(p.probability - p.observed),
        },
        scoreEvaluation: { absoluteError: 2, normalizedError: 0.02 },
        topicEvaluation: { ndcg: 0.8, precisionAtK: 0.5, recallAtK: 0.5 },
        timestamp: 1700000000000 + idx * 86400000,
      }))
    );
    expect(evalSummary.probability.ece).toBeNull();
  });

  it('8. summarizeCalibration includes extreme Brier misses without symmetric trimming', () => {
    // 9 perfect predictions (0) and 1 catastrophic miss (1.0): mean must be 0.10, not trimmed to 0
    const briers = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.0];
    const summary = summarizeCalibration(briers, { baseline: 0 });
    expect(summary.avgBrier).toBeCloseTo(0.1, 6);
  });

  it('9. generateDailyGoals classifies a 0%-accuracy tested topic as Vetor Crítico de Erros (high)', () => {
    const categories = [
      {
        id: 'cat-zero',
        name: 'Contabilidade',
        weight: 8,
        maxScore: 100,
        minScore: 0,
        tasks: [],
        simuladoStats: {
          history: [
            {
              date: '2026-04-10',
              score: 0,
              total: 10,
              correct: 0,
              topics: [{ name: 'Balancete', total: 10, correct: 0, score: 0 }],
            },
          ],
        },
      },
    ];

    const goals = generateDailyGoals(categories, [], [], {
      now: new Date('2026-04-12'),
      maxScore: 100,
      minScore: 0,
    });
    const topicGoal = goals.find((g) => g.topicName === 'Balancete');
    expect(topicGoal).toBeDefined();
    expect(topicGoal.priority).toBe('high');
    expect(topicGoal.analysis?.reason).toBe('Vetor Crítico de Erros');
  });
});
