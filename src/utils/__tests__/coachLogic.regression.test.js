import { describe, it, expect } from 'vitest';
import {
  runCoachMonteCarlo,
  deriveAdaptiveRiskThresholds,
  computeContinuousMcBoost,
  deriveBacktestWeights,
  DEFAULT_CONFIG,
} from '../coachLogic.js';
import { computeCalibrationDiagnostics } from '../calibration.js';

function makeSimulados(scores) {
  const now = Date.now();
  return scores.map((score, idx) => ({ 
    score, 
    subject: 'Matemática', 
    date: new Date(now - (scores.length - idx) * 86400000).toISOString().slice(0, 10), 
    total: 10, 
    correct: Math.round((score / 100) * 10) 
  }));
}

describe('Coach math regressions — low sample MC safeguards', () => {
  it('aplica lowSampleAdjustment > 0 quando n < 10 e mantém CI válido', () => {
    const sims = makeSimulados([55, 58, 60, 57, 61, 59]);
    const res = runCoachMonteCarlo(sims, 75, DEFAULT_CONFIG, 'cat-math', 100, null, 90);
    expect(res).not.toBeNull();
    expect(res.sampleSize).toBe(6);
    expect(res.lowSampleAdjustment).toBeGreaterThan(0);
    expect(res.ci95Low).toBeGreaterThanOrEqual(0);
    expect(res.ci95High).toBeLessThanOrEqual(100);
    expect(res.ci95High).toBeGreaterThanOrEqual(res.ci95Low);
  });
});

describe('Coach math regressions — adaptive thresholds', () => {
  it('retorna thresholds adaptativos dentro dos limites esperados', () => {
    const thr = deriveAdaptiveRiskThresholds([40, 50, 60, 70, 80, 90], 4, DEFAULT_CONFIG);
    expect(thr.danger).toBeGreaterThanOrEqual(12);
    expect(thr.safe).toBeLessThanOrEqual(97);
    expect(thr.safe - thr.danger).toBeGreaterThanOrEqual(25);
  });
});

describe('Coach math regressions — continuous sigmoid boost', () => {
  it('boost diminui de forma suave quando probabilidade sobe', () => {
    const low = computeContinuousMcBoost(20, 30, 90, 3, 100, DEFAULT_CONFIG).boost;
    const mid = computeContinuousMcBoost(55, 30, 90, 3, 100, DEFAULT_CONFIG).boost;
    const high = computeContinuousMcBoost(90, 30, 90, 3, 100, DEFAULT_CONFIG).boost;
    expect(low).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(high);
  });
});

describe('Coach math regressions — adaptive ECE buckets', () => {
  it('calcula ECE e reliability com bins adaptativos sem sair de [0,1]', () => {
    const preds = Array.from({ length: 12 }, (_, i) => ({ probability: (i + 1) / 13, observed: i % 2 === 0 }));
    const d = computeCalibrationDiagnostics(preds, { bins: 6 });
    expect(d.ece).toBeGreaterThanOrEqual(0);
    expect(d.ece).toBeLessThanOrEqual(1);
    expect(d.reliability.length).toBeGreaterThan(0);
  });
});

describe('Coach math regressions — backtest weights bounded', () => {
  it('pesos derivados do backtest permanecem nos limites definidos', () => {
    const w = deriveBacktestWeights([40, 42, 45, 47, 50, 53, 55, 57, 60, 62], 100);
    expect(w.scoreWeight).toBeGreaterThanOrEqual(0.8);
    expect(w.scoreWeight).toBeLessThanOrEqual(1.2);
    expect(w.recencyWeight).toBeGreaterThanOrEqual(0.75);
    expect(w.recencyWeight).toBeLessThanOrEqual(1.25);
    expect(w.instabilityWeight).toBeGreaterThanOrEqual(0.8);
    expect(w.instabilityWeight).toBeLessThanOrEqual(1.25);
  });
});
