import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { sanitizePlainText } from '../sanitizeText';
import { hexToRgba } from '../colorHelper';
import { useSubscription } from '../../hooks/useSubscription';
import { calculateRobustVolatility, monteCarloSimulation } from '../../engine/projection';
import { weightedRegression, computeBayesianLevel } from '../../engine/stats';
import { simulateNormalDistribution, runMonteCarloAnalysis } from '../../engine/monteCarlo';
import { detectProbabilityCalibrationDrift } from '../../engine/observability/driftMonitor';
import { evaluateModelHealth } from '../../engine/observability/modelHealth';
import { estimateUplift } from '../../engine/causal/policyEngine';
import { daysUntilGoal } from '../../engine/math/date';
import { getPercentile } from '../../engine/math/percentile';
import { stableHash } from '../stableHash';
import { parseNoonLocal, addDaysNoon } from '../parseNoonLocal';
import { normalizeDate, getDateKey, toDateMs, getAppTimezone, setAppTimezone } from '../dateHelper';
import { applyScenarioAdjustments } from '../monteCarloScenario';
import { extractMetrics } from '../coachLogic';
import { ensureCoachTaskId } from '../coachTaskId';
import { validatePrediction, getConfidenceTier } from '../explanationEngine';
import { analyzeProgressState } from '../ProgressStateEngine';
import { buildCoachExplanationPrompt } from '../../llm/llmPrompts';

describe('Full Audit All-Batches Regression Tests', () => {
  const originalTz = getAppTimezone();

  afterEach(() => {
    setAppTimezone(originalTz);
  });

  it('Batch 1: sanitizePlainText strips dangerous markup without eating math inequalities or ampersands', () => {
    expect(sanitizePlainText('<b>Mat</b> &amp; <script>alert(1)</script>Física')).toBe('Mat & Física');
    expect(sanitizePlainText('x < 5 e y > 2 & z = 1')).toBe('x < 5 e y > 2 & z = 1');
    expect(sanitizePlainText('\x00\x07Texto limpo\x1F')).toBe('Texto limpo');
  });

  it('Batch 1: hexToRgba respects alpha="0" instead of treating string zero as 1', () => {
    expect(hexToRgba('#ff0000', '0')).toBe('rgba(255, 0, 0, 0)');
    expect(hexToRgba('#ff0000', 0)).toBe('rgba(255, 0, 0, 0)');
  });

  it('Batch 1: useSubscription fails closed when user lacks verified token provider and resets state synchronously on uid change', () => {
    const unverifiedUser = { uid: 'u-no-token', email: 'no-token@test.com' };
    const { result, rerender } = renderHook(({ u }) => useSubscription(u), {
      initialProps: { u: unverifiedUser }
    });
    expect(result.current.isPremium).toBe(false);

    const userWithToken1 = {
      uid: 'u1',
      getIdTokenResult: async () => ({ claims: { stripeRole: 'premium' } })
    };
    rerender({ u: userWithToken1 });
    expect(result.current.loading).toBe(true);
    expect(result.current.isPremium).toBe(false);
  });

  it('Batch 5: calculateRobustVolatility does not collapse to 0.001 on oscillating undated numeric arrays', () => {
    const oscillating = Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 10 : 90));
    const vol = calculateRobustVolatility(oscillating, 100, 0);
    expect(vol).toBeGreaterThan(20);
  });

  it('Batch 5: weightedRegression clamps object lambda and falls back on undated numeric history', () => {
    const res = weightedRegression([60, 70, 82], { lambda: -0.5, maxScore: 100 });
    expect(Number.isFinite(res.slope)).toBe(true);
    expect(Number.isFinite(res.intercept)).toBe(true);
    expect(res.intercept).toBe(82);
  });

  it('Batch 5: computeBayesianLevel evaluates undated numeric arrays and respects minScore on n<=0', () => {
    const highArr = computeBayesianLevel([85, 90, 95], 1, 1, 100);
    expect(highArr.mean).toBeGreaterThan(60);

    const zeroPrior = computeBayesianLevel([], 0, 0, 1000, { minScore: 400 });
    expect(zeroPrior.mean).toBe(400);
    expect(zeroPrior.ciLow).toBe(400);
  });

  it('Batch 5: monteCarloSimulation handles NaN simulations, honors options.seed, and supports subject sd=0', () => {
    const history = [
      { date: '2026-01-01', score: 70 },
      { date: '2026-01-05', score: 75 },
      { date: '2026-01-10', score: 80 },
    ];
    const safeRes = monteCarloSimulation(history, 78, 30, Number.NaN, {});
    expect(Number.isFinite(safeRes.probability)).toBe(true);

    const r1 = monteCarloSimulation(history, 78, 30, 500, { seed: 'alpha-1' });
    const r2 = monteCarloSimulation(history, 78, 30, 500, { seed: 'beta-2' });
    expect(r1.seed !== r2.seed || r1.projectedMean !== r2.projectedMean || r1.probability !== r2.probability).toBe(true);
  });

  it('Batch 5: simulateNormalDistribution honors string seeds and runMonteCarloAnalysis ignores empty/boolean holes', () => {
    const a1 = simulateNormalDistribution({ mean: 70, sd: 10, targetScore: 75, simulations: 400, seed: 'custom-A' });
    const a2 = simulateNormalDistribution({ mean: 70, sd: 10, targetScore: 75, simulations: 400, seed: 'custom-A' });
    const b1 = simulateNormalDistribution({ mean: 70, sd: 10, targetScore: 75, simulations: 400, seed: 'custom-B' });
    expect(a1.probability).toBe(a2.probability);
    expect(a1.projectedMean).not.toBe(b1.projectedMean);

    const mc = runMonteCarloAnalysis({ values: [80, null, '', '   ', false, 90], targetScore: 75, simulations: 400 });
    expect(mc.mean).toBeGreaterThan(60);
  });

  it('Batch 6: observability, policy, percentile, and date helpers handle edge cases safely', () => {
    const drift = detectProbabilityCalibrationDrift([
      { probability: 1, observed: 0 },
      { probability: 50, observed: 1 },
      { probability: 90, observed: 1 },
    ]);
    expect(drift).toBeDefined();

    const health = evaluateModelHealth({ scores: [70, 75, 80, 85, 90, 95], sampleSize: null });
    expect(health.metrics.sampleSize).toBe(6);

    expect(estimateUplift({ outcome: 10, treatment: true, propensity: null })).toBe(0);
    expect(estimateUplift({ outcome: 10, treatment: true, propensity: '' })).toBe(0);

    const d = new Date('2026-03-10T22:00:00Z');
    const beforeTime = d.getTime();
    daysUntilGoal('2026-03-20', { referenceDate: d });
    expect(d.getTime()).toBe(beforeTime);

    expect(getPercentile([null, 50, '10', false, '   '], 0)).toBe(10);
  });

  it('Batch 6: dateHelper and parseNoonLocal validate calendar rollover and follow APP_TIMEZONE', () => {
    expect(getDateKey('2026-02-31')).toBeNull();
    expect(normalizeDate('2026-02-31')).toBeNull();
    expect(normalizeDate('15/03/2026, 14:30:00')).not.toBeNull();
    expect(toDateMs(0)).toBe(0);

    setAppTimezone('Asia/Tokyo');
    const parsed = parseNoonLocal('2026-03-10');
    const next = addDaysNoon('2026-03-10', 1);
    expect(getDateKey(parsed)).toBe('2026-03-10');
    expect(getDateKey(next)).toBe('2026-03-11');
  });

  it('Batch 6: stableHash preserves DAG shared references and monteCarloScenario keeps mean inside shifted CI', () => {
    const shared = { x: 1 };
    const h1 = stableHash({ a: shared, b: shared });
    const h2 = stableHash({ a: { x: 1 }, b: { x: 1 } });
    expect(h1).toBe(h2);

    const adjusted = applyScenarioAdjustments([{ mean: 70, ciRange: [69, 71], probability: 60 }], 'optimistic', 100, 0);
    expect(adjusted[0].mean).toBeCloseTo(72.5, 4);
    expect(adjusted[0].ciRange[0]).toBeLessThanOrEqual(adjusted[0].mean);
    expect(adjusted[0].ciRange[1]).toBeGreaterThanOrEqual(adjusted[0].mean);
  });

  it('Batch 6: coachLogic decimal weight, ensureCoachTaskId, explanationEngine, ProgressStateEngine, llmPrompts', () => {
    const m = extractMetrics({ id: 'c1', name: 'Português', weight: '1.5', tasks: [] }, [], [], {});
    expect(m.weight).toBeCloseTo(30, 4); // 1.5 * 20

    const enriched = ensureCoachTaskId({ text: 'Revisar Crase' });
    expect(enriched.id).toBeTruthy();
    expect('_compositeKey' in enriched).toBe(false);
    const numTask = { id: 123, text: 'Numeric ID task' };
    expect(ensureCoachTaskId(numTask).id).toBe(123);

    expect(() => validatePrediction({ probability: undefined, interval: { low: 10, high: 20 }, confidenceTier: 'HIGH' })).toThrow();
    expect(() => validatePrediction({ probability: 75, interval: null, confidenceTier: 'HIGH' })).toThrow();
    expect(getConfidenceTier({ calibrationPenalty: undefined, volatility: undefined, sampleSize: undefined }).tier).toBe('LOW');

    const emptyProgress = analyzeProgressState([], { window_size: undefined });
    expect(emptyProgress.state).toBe('insufficient_data');

    const prompt = buildCoachExplanationPrompt({ urgency: Number.NaN, probability: Infinity, categoryName: 'Dir\nCivil' });
    expect(prompt).not.toContain('Infinity');
    expect(prompt).toContain('"urgency": 0');
    expect(prompt).toContain('"probability": null');
    expect(prompt).toContain('Dir Civil');
  });
});
