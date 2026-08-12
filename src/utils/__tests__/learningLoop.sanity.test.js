import { describe, it, expect, vi } from 'vitest';

// Motor externo mockado (determinístico) para o teste de integração
vi.mock('../../engine/monteCarlo.js', () => ({
  monteCarloSimulation: () => ({
    probability: 70, mean: 75, ci95Low: 65, ci95High: 85,
    volatility: 5, diagnostics: { simulationCount: 300 }
  }),
  clearEngineMcCache: () => {}
}));
vi.mock('../../engine/diagnostics.js', () => ({ detectDataAnomalies: () => [] }));
vi.mock('../../engine/stats.js', () => ({ pruneHistoryForMemory: (h) => h }));

import {
  recordPredictionEvent, backfillObservedFromSimulados, computeRollingCalibrationParams,
  conformalizedCalibrationInterval, computeStackingWeights, summarizeCalibration,
  fitIsotonicCalibration, predictIsotonicProbability
} from '../calibration.js';
import { runCoachMonteCarlo } from '../coachAdaptive.js';

const DAY = 86400000;

describe('Lote 1 — recordPredictionEvent', () => {
  it('funciona SEM storeUpdateFn e clampa probabilidade', () => {
    const ev = recordPredictionEvent({ probability: 1.7, observed: null, category: 'mat' });
    expect(ev.probability).toBe(1);
    expect(ev.observed).toBeNull();
    expect(ev.category).toBe('mat');
    expect(Number.isFinite(ev.timestamp)).toBe(true);
  });
});

describe('Lote 1 — backfillObservedFromSimulados', () => {
  const makeEvent = () => recordPredictionEvent({
    timestamp: Date.parse('2024-03-10T12:00:00Z'),
    probability: 0.8, targetScore: 70, category: 'mat'
  });
  it('é causal: simulado ANTES do evento não preenche observed', () => {
    const ev = makeEvent();
    const before = { date: '2024-03-01', subject: 'MAT', score: 90 };
    const out = backfillObservedFromSimulados([ev], [before], [], 100);
    expect(out[0].observed).toBeNull();
  });
  it('preenche com o primeiro simulado >= timestamp e respeita a meta', () => {
    const ev = makeEvent();
    const after = { date: '2024-03-12', subject: 'MAT', score: 60 };
    const out = backfillObservedFromSimulados([ev], [after], [], 100);
    expect(out[0].observed).toBe(0); // 60 < 70
    expect(out[0].backfilled).toBe(true);
  });
  it('é imutável: não muta o evento original', () => {
    const ev = makeEvent();
    backfillObservedFromSimulados([ev], [{ date: '2024-03-12', subject: 'MAT', score: 95 }], [], 100);
    expect(ev.observed).toBeNull();
  });
});

describe('Lote 1 — computeRollingCalibrationParams (FIX F1)', () => {
  const now = Date.now();
  it('baseline aprende o Brier empírico (série calibrada)', () => {
    const events = Array.from({ length: 14 }, (_, i) => ({
      timestamp: now - i * DAY, probability: 0.8, observed: 1
    }));
    const r = computeRollingCalibrationParams(events, {});
    // Brier individual = 0.04; posterior com prior 0.2 → entre 0.04 e ~0.12
    expect(r.confidenceFactor).toBe(1);
    expect(r.baseline).toBeGreaterThan(0.04);
    expect(r.baseline).toBeLessThan(0.12);
  });
  it('entradas sem sinal NÃO contaminam o denominador', () => {
    const signal = Array.from({ length: 14 }, (_, i) => ({
      timestamp: now - i * DAY, probability: 0.8, observed: 1
    }));
    const noise = Array.from({ length: 10 }, (_, i) => ({
      timestamp: now - i * DAY, probability: 0.5, observed: null
    }));
    const a = computeRollingCalibrationParams(signal, {});
    const b = computeRollingCalibrationParams([...signal, ...noise], {});
    expect(Math.abs(a.baseline - b.baseline)).toBeLessThan(1e-9);
  });
  it('fallback h.avgBrier alimenta a baseline (métricas persistidas)', () => {
    const agg = Array.from({ length: 14 }, (_, i) => ({
      timestamp: now - i * DAY, avgBrier: 0.25
    }));
    const r = computeRollingCalibrationParams(agg, {});
    expect(r.baseline).toBeGreaterThan(0.2);
  });
});

describe('Lote 1 — conformalizedCalibrationInterval (FIX F4)', () => {
  it('miscalibração extrema → intervalo largo (teto 0.35)', () => {
    const bad = Array.from({ length: 12 }, () => ({ probability: 0.9, observed: 0 }));
    const c = conformalizedCalibrationInterval(0.9, bad, 0.1);
    expect(c.qHat).toBeCloseTo(0.35, 5);
    expect(c.high - c.low).toBeCloseTo(0.7, 5);
  });
  it('resíduos zero → nunca abaixo do ruído amostral', () => {
    const perfect = Array.from({ length: 12 }, (_, i) => ({
      probability: i % 2, observed: i % 2
    }));
    const c = conformalizedCalibrationInterval(0.5, perfect, 0.1);
    expect(c.qHat).toBeGreaterThan(0.1);   // ~0.24 (SE·z), não ~0
    expect(c.qHat).toBeLessThan(0.35);
  });
});

describe('Lote 1 — computeStackingWeights (FIX F3)', () => {
  it('soma 1 e favorece o candidato melhor; shrink p/ uniforme com n pequeno', () => {
    const obs = [1, 1, 0, 1, 0, 1, 1, 0, 1, 1];
    const good = obs.map(y => (y === 1 ? 0.9 : 0.1));
    const bad = obs.map(y => (y === 1 ? 0.4 : 0.6));
    const w = computeStackingWeights([good, bad], obs, [0, 0]);
    expect(w[0] + w[1]).toBeCloseTo(1, 6);
    expect(w[0]).toBeGreaterThan(w[1]);
    const w2 = computeStackingWeights([good.slice(0, 3), bad.slice(0, 3)], obs.slice(0, 3), [0, 0]);
    expect(Math.abs(w2[0] - 0.5)).toBeLessThan(0.25);
  });
});

describe('Lote 1 — summarizeCalibration (FIX M5)', () => {
  it('entrada vazia → avgBrier null (não "perfeito")', () => {
    expect(summarizeCalibration([], {}).avgBrier).toBeNull();
  });
});

describe('Lote 1 — isotonic interpolado', () => {
  it('monotônico e interpola lacunas entre blocos', () => {
    const model = fitIsotonicCalibration([
      { probability: 0.1, observed: 0 }, { probability: 0.2, observed: 0 },
      { probability: 0.8, observed: 1 }, { probability: 0.9, observed: 1 }
    ]);
    const a = predictIsotonicProbability(0.15, model);
    const b = predictIsotonicProbability(0.5, model);
    const c = predictIsotonicProbability(0.85, model);
    expect(b).toBeGreaterThanOrEqual(a);
    expect(c).toBeGreaterThanOrEqual(b);
    expect(b).toBeGreaterThan(a); // interpolou, não degrau
  });
});

describe('Lote 2 — runCoachMonteCarlo (FIX F2/M1)', () => {
  it('propaga thresholds/explainability e volatilidade crua', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      date: `2024-0${1 + Math.floor(i / 4)}-1${i % 4}`,
      subject: 'MAT',
      score: 60 + (i % 3) * 10
    }));
    const res = runCoachMonteCarlo(rows, 80, { MC_ENABLE_ADAPTIVE_CALIBRATION: true }, 'mat', 100,
      { calibrationBaseline: 0.2, calibrationMaxPenalty: 0.25 }, 90, 0);
    expect(res).not.toBeNull();
    expect(res.thresholds).toHaveProperty('danger');
    expect(res.thresholds).toHaveProperty('safe');
    expect(res.explainability).toHaveProperty('note');
    expect(Number.isFinite(res.effectiveMCTarget)).toBe(true);
    expect(res.volatility).toBe(5);                 // crua (FIX M1)
    expect(res.volatilityAdjusted).toBeGreaterThanOrEqual(5);
  });
});
