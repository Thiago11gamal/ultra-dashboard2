import { describe, it, expect } from 'vitest';
import {
  conformalizedCalibrationInterval,
  computeCalibrationDiagnostics,
  computeRollingCalibrationParams,
  shrinkProbabilityLogistic,
  computeStackingWeights
} from '../calibration.js';
import { deriveAdaptiveRiskThresholds } from '../coachAdaptive.js';
import { computeAdaptiveSignal } from '../adaptiveMath.js';
import { deriveUrgencyWeights, calculateUrgencyScore } from '../coachLogic.js';

describe('Auditoria de Correções Matemáticas Críticas', () => {
  // 1. Quantil conformal
  it('1. conformalizedCalibrationInterval calcula o quantil com garantia de cobertura finita', () => {
    // n = 10 resíduos
    const pairs = Array.from({ length: 10 }, (_, i) => ({
      probability: 0.5,
      observed: i < 5 ? 1 : 0
    }));
    const interval = conformalizedCalibrationInterval(0.5, pairs, 0.1);
    expect(Number.isFinite(interval.low)).toBe(true);
    expect(Number.isFinite(interval.high)).toBe(true);
    expect(interval.qHat).toBeGreaterThan(0);
    expect(interval.qHat).toBeLessThanOrEqual(0.35);
  });

  // 2. Bins quantis degenerados com empates
  it('2. computeCalibrationDiagnostics não colapsa bins com empates em massa', () => {
    // 20 previsões idênticas de probabilidade 0.6
    const pairs = Array.from({ length: 20 }, (_, i) => ({
      probability: 0.6,
      observed: i % 2 === 0 ? 1 : 0
    }));
    const diag = computeCalibrationDiagnostics(pairs, { binStrategy: 'quantile' });
    expect(Number.isFinite(diag.ece)).toBe(true);
    expect(diag.reliability.length).toBeGreaterThan(0);
    // Cada bin de reliability deve ter largura válida > 0
    diag.reliability.forEach(b => {
      expect(b.binMax).toBeGreaterThan(b.binMin);
    });
  });

  // 3. Prior Beta-Binomial em deriveAdaptiveRiskThresholds
  it('3. deriveAdaptiveRiskThresholds usa prior adaptativo estável', () => {
    const pairs = [
      { probability: 0.2, observed: 0 },
      { probability: 0.25, observed: 0 },
      { probability: 0.8, observed: 1 },
      { probability: 0.85, observed: 1 },
      { probability: 0.9, observed: 1 },
      { probability: 0.95, observed: 1 }
    ];
    const thresholds = deriveAdaptiveRiskThresholds([60, 70, 80], 5, {}, 100, pairs);
    expect(thresholds.danger).toBeGreaterThanOrEqual(15);
    expect(thresholds.safe).toBeLessThanOrEqual(97);
    expect(thresholds.safe - thresholds.danger).toBeGreaterThanOrEqual(25);
  });

  // 4. Variância ponderada em computeAdaptiveSignal
  it('4. computeAdaptiveSignal calcula SD consistente sem inflação redundante', () => {
    const scores = [60, 62, 65, 63, 64, 66, 65, 67];
    const signal = computeAdaptiveSignal(scores);
    expect(Number.isFinite(signal.effectiveN)).toBe(true);
    expect(signal.effectiveN).toBeGreaterThanOrEqual(1);
    expect(signal.ciInflation).toBeGreaterThanOrEqual(1);
  });

  // 5. Detecção de escala em computeRollingCalibrationParams
  it('5. computeRollingCalibrationParams respeita cfg.scale estrita', () => {
    const events = [
      { probability: 0.7, observed: 1, timestamp: Date.now() },
      { probability: 0.8, observed: 1, timestamp: Date.now() - 86400000 },
      { probability: 0.6, observed: 0, timestamp: Date.now() - 2 * 86400000 },
      { probability: 0.75, observed: 1, timestamp: Date.now() - 3 * 86400000 }
    ];
    const paramsRatio = computeRollingCalibrationParams(events, { scale: 'ratio', minSamples: 3 });
    expect(paramsRatio.avgBrier).toBeLessThan(0.5);
  });

  // 9. gapRatio com targetScore <= minScore
  it('9. calculateUrgencyScore trata com segurança targetScore <= minScore', () => {
    const metrics = {
      cfg: { SCORE_MAX: 45, RECENCY_MAX: 28, INSTABILITY_MAX: 22 },
      maxScore: 100,
      minScore: 50,
      targetScore: 50, // meta igual ao piso
      averageScore: 60,
      simuladosWithMaxScore: [{ score: 60, total: 100 }],
      lastNScores: [60],
      boundedWeight: 5,
      rawWeight: 5
    };
    const score = calculateUrgencyScore(metrics);
    expect(Number.isFinite(score.normalized)).toBe(true);
    expect(score.normalized).toBeGreaterThanOrEqual(0);
    expect(score.normalized).toBeLessThanOrEqual(100);
  });

  // 10 & 11. Shrinkage logístico
  it('11. shrinkProbabilityLogistic preserva caudas e reduz extremos suavemente', () => {
    const highProb = 95;
    const shrunkLinear = highProb * (1 - 0.2) + 50 * 0.2; // 86
    const shrunkLogistic = shrinkProbabilityLogistic(highProb, 0.2, 50, 0.5);
    // Shrinkage logístico preserva melhor certezas extremas
    expect(shrunkLogistic).toBeGreaterThan(86);
    expect(shrunkLogistic).toBeLessThan(95);

    // Neutro no centro (50%) permanece 50%
    expect(shrinkProbabilityLogistic(50, 0.3, 50)).toBeCloseTo(50, 1);
  });

  // 12. Bins adaptativos de Sturges em computeCalibrationDiagnostics
  it('12. computeCalibrationDiagnostics usa bins adaptativos quando não informado', () => {
    const pairs = Array.from({ length: 32 }, (_, i) => ({
      probability: (i + 1) / 33,
      observed: i % 2 === 0 ? 1 : 0
    }));
    const diag = computeCalibrationDiagnostics(pairs);
    expect(diag.reliability.length).toBeGreaterThan(2);
    expect(diag.ece).toBeGreaterThanOrEqual(0);
  });

  // 13. Pesos de urgência adaptativos ao contexto
  it('13. deriveUrgencyWeights ajusta pesos conforme confiança MC e volatilidade', () => {
    const highTrust = deriveUrgencyWeights({ sampleSize: 20 }, 2, 20);
    const lowTrust = deriveUrgencyWeights({ sampleSize: 2 }, 15, 2);

    // Alta confiança MC dá mais peso ao gap de nota e menos à recência
    expect(highTrust.scoreMax).toBeGreaterThan(lowTrust.scoreMax);
    expect(lowTrust.recencyMax).toBeGreaterThan(highTrust.recencyMax);
    expect(lowTrust.instabilityMax).toBeGreaterThan(highTrust.instabilityMax);
  });

  // 14. Stacking weights com regularização reforçada para n < 6
  it('14. computeStackingWeights regulariza fortemente com n < 6', () => {
    const obs = [1, 1, 0];
    const candidate1 = [0.95, 0.95, 0.05];
    const candidate2 = [0.5, 0.5, 0.5];
    const weights = computeStackingWeights([candidate1, candidate2], obs, [0, 0]);
    expect(weights[0] + weights[1]).toBeCloseTo(1, 6);
    // Com n=3, regularização lambda é ~0.158, impedindo que candidate1 domine cegamente
    expect(weights[0]).toBeLessThan(0.75);
    expect(weights[1]).toBeGreaterThan(0.25);
  });
});
