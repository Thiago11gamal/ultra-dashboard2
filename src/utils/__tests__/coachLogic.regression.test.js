import { describe, it, expect } from 'vitest';
import {
  runCoachMonteCarlo,
  deriveAdaptiveRiskThresholds,
  computeContinuousMcBoost,
  deriveBacktestWeights,
  DEFAULT_CONFIG,
  calculateUrgency,
  extractMetrics,
  generateDailyGoals,
  getCombinedHistory,
  sanitizeNum,
  computeRobustVolatilityForCoach,
  getCrunchMultiplier,
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
    const preds = Array.from({ length: 12 }, (_, i) => ({
      probability: (i + 1) / 13,
      observed: i % 2 === 0
    }));
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

// ===== NOVOS TESTES (lacunas identificadas na auditoria) =====

describe('BUG-01: pastSimulados exclui o simulado mais recente', () => {
  it('averageScore usa nota anterior correta (sem incluir a mais recente)', () => {
    const sims = makeSimulados([40, 50, 60, 70, 80]);
    const category = { id: 'math', name: 'Matemática', weight: 5, tasks: [] };
    const metrics = extractMetrics(category, sims, [], { maxScore: 100 });
    // A média deve refletir a tendência, não ser igual à última nota
    expect(metrics.averageScore).not.toBe(80);
    expect(metrics.averageScore).toBeGreaterThan(40);
    expect(metrics.averageScore).toBeLessThan(85);
  });
});

describe('calculateUrgencyScore — robustez', () => {
  it('não retorna NaN quando todos os inputs são zero', () => {
    const category = { id: 'test', name: 'Teste', weight: 5, tasks: [] };
    const result = calculateUrgency(category, [], [], { maxScore: 100 });
    expect(Number.isFinite(result.normalizedScore)).toBe(true);
    expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
    expect(result.normalizedScore).toBeLessThanOrEqual(100);
  });

  it('normalização fica em [0, 100] para inputs extremos', () => {
    const sims = makeSimulados([5, 5, 5, 5, 5]);
    const category = { id: 'hard', name: 'Difícil', weight: 10, tasks: [] };
    const result = calculateUrgency(category, sims, [], { maxScore: 100, targetScore: 95 });
    expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
    expect(result.normalizedScore).toBeLessThanOrEqual(100);
  });
});

describe('getCrunchMultiplier — limites', () => {
  it('não excede 2.0', () => {
    expect(getCrunchMultiplier(0)).toBe(2.0);
    expect(getCrunchMultiplier(1)).toBeLessThanOrEqual(2.0);
    expect(getCrunchMultiplier(365)).toBeLessThanOrEqual(2.0);
  });

  it('retorna 1.0 para dias negativos ou null', () => {
    expect(getCrunchMultiplier(-5)).toBe(1.0);
    expect(getCrunchMultiplier(null)).toBe(1.0);
    expect(getCrunchMultiplier(undefined)).toBe(1.0);
  });

  it('timeDivisor é limitado a 60 para veteranos (FIX-LOGIC-02)', () => {
    const oldDate = new Date(Date.now() - 1000 * 86400000).toISOString();
    const result = getCrunchMultiplier(500, oldDate);
    expect(result).toBeLessThanOrEqual(2.0);
    expect(result).toBeGreaterThan(1.0);
  });
});

describe('sanitizeNum — robustez (FIX-LOGIC-07)', () => {
  it('trata porcentagem', () => {
    expect(sanitizeNum('75%')).toBe(75);
    expect(sanitizeNum(' 80 % ')).toBe(80);
  });

  it('trata formato PT-BR', () => {
    expect(sanitizeNum('1.234,56')).toBeCloseTo(1234.56);
    expect(sanitizeNum('1,5')).toBe(1.5);
  });

  it('retorna NaN para null/undefined/vazio', () => {
    expect(Number.isNaN(sanitizeNum(null))).toBe(true);
    expect(Number.isNaN(sanitizeNum(undefined))).toBe(true);
    expect(Number.isNaN(sanitizeNum(''))).toBe(true);
  });
});

describe('computeRobustVolatilityForCoach — shrinkage (FIX-LOGIC-03)', () => {
  it('retorna fallback para n < 2', () => {
    expect(computeRobustVolatilityForCoach([], 100)).toBe(8);
    expect(computeRobustVolatilityForCoach([{ score: 50 }], 100)).toBe(8);
  });

  it('combina empírico e prior para amostras pequenas', () => {
    const history = [{ score: 50 }, { score: 60 }];
    const vol = computeRobustVolatilityForCoach(history, 100);
    expect(vol).toBeGreaterThan(0);
    expect(vol).toBeLessThan(20);
  });
});

describe('generateDailyGoals — limites', () => {
  it('não gera mais que 12 tarefas', () => {
    const categories = Array.from({ length: 15 }, (_, i) => ({
      id: `cat-${i}`, name: `Matéria ${i}`, weight: 5, tasks: [],
      simuladoStats: { history: [] }
    }));
    const tasks = generateDailyGoals(categories, [], [], { maxScore: 100 });
    expect(tasks.length).toBeLessThanOrEqual(12);
  });

  it('IDs são únicos entre tarefas', () => {
    const categories = [
      { id: 'a', name: 'A', weight: 5, tasks: [], simuladoStats: { history: [] } },
      { id: 'b', name: 'B', weight: 5, tasks: [], simuladoStats: { history: [] } },
    ];
    const tasks = generateDailyGoals(categories, [], [], { maxScore: 100 });
    const ids = tasks.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('getCombinedHistory — deduplicação', () => {
  it('não duplica entradas com mesma data', () => {
    const history = [
      { date: '2025-01-01', correct: 5, total: 10 },
      { date: '2025-01-01', correct: 3, total: 10 },
    ];
    const simulados = [
      { id: 's1', date: '2025-01-01', score: 70, subject: 'Math' },
    ];
    const combined = getCombinedHistory(history, simulados);
    // Deve ter no máximo 1 entrada para 2025-01-01 (simulado tem prioridade)
    const jan1 = combined.filter(h => (h.date || '').startsWith('2025-01-01'));
    expect(jan1.length).toBeLessThanOrEqual(1);
  });
});
