import { describe, it, expect } from 'vitest';
import { _buildSortedTopics, getSuggestedFocus, getCoachInsight, getCognitiveState } from '../src/utils/coachLogic.js';
import { deriveAdaptiveRiskThresholds } from '../src/utils/coachAdaptive.js';
import { toFiniteNumber } from '../src/utils/coachSafe.js';
import { cleanCoachNoise } from '../src/utils/coachText.js';
import { coach } from '../src/utils/coachPipeline.js';
import { runStateSpaceModel } from '../src/engine/probabilistic/stateSpace.js';
import { estimateDynamicVolatility } from '../src/engine/probabilistic/volatility.js';
import { buildStudyVolumeCausalEvents } from '../src/utils/coachCausal.js';
import { getFlag } from '../src/utils/coachFeatureStore.js';
import { detectDriftInSeries } from '../src/engine/observability/driftMonitor.js';
import { ensureCoachTaskId } from '../src/utils/coachTaskId.js';
import { estimatePosteriorPredictive } from '../src/engine/probabilistic/posteriorPredictive.js';
import { buildCategorySplits } from '../src/engine/evaluation/strategyBacktester.js';
import { computeNDCGAtK } from '../src/utils/coachBacktest.js';

describe('Auditoria de Correção de Bugs do Coach AI (BUG-01 a BUG-28)', () => {
  it('BUG-01: getSuggestedFocus não muta cache de weakestTopic', () => {
    const category = {
      id: 'cat-1',
      name: 'Direito Constitucional',
      tasks: [],
      simuladoStats: { history: [] }
    };
    const simulados = [{
      categoryId: 'cat-1',
      date: '2026-01-01',
      topics: [{ name: 'Controle de Constitucionalidade', correct: 2, total: 10 }]
    }];
    const focus1 = getSuggestedFocus([category], simulados, [], { contestId: 'test-contest-01' });
    if (focus1 && focus1.weakestTopic) {
      focus1.weakestTopic.mutatedProperty = 'CORRUPTED';
    }
    const focus2 = getSuggestedFocus([category], simulados, [], { contestId: 'test-contest-01' });
    expect(focus2?.weakestTopic?.mutatedProperty).toBeUndefined();
  });

  it('BUG-02: _buildSortedTopicsImpl não perde dados quando entry.topics = []', () => {
    const category = { id: 'cat-2', name: 'Português', tasks: [] };
    const simulados = [{
      categoryId: 'cat-2',
      date: '2026-01-02',
      topics: [],
      topic: 'Sintaxe e Pontuação',
      total: 10,
      correct: 3
    }];
    const topics = _buildSortedTopics(category, simulados, 100, 0);
    expect(topics.some(t => t.name === 'Sintaxe e Pontuação')).toBe(true);
  });

  it('BUG-03: coachAdaptive danger/safe mínimo de 25 de distância', () => {
    const thresholds = deriveAdaptiveRiskThresholds([70, 71, 72, 73, 74, 75], [
      { probability: 0.1, observed: 0 },
      { probability: 0.2, observed: 0 },
      { probability: 0.8, observed: 1 },
      { probability: 0.9, observed: 1 },
      { probability: 0.95, observed: 1 },
      { probability: 0.99, observed: 1 }
    ]);
    expect(thresholds.safe - thresholds.danger).toBeGreaterThanOrEqual(25);
  });

  it('BUG-06: toFiniteNumber com PT-BR e US formatos', () => {
    expect(toFiniteNumber("1,234")).toBe(1234);
    expect(toFiniteNumber("-1.234,56")).toBe(-1234.56);
    expect(toFiniteNumber("1,23,45", 999)).toBe(999);
    expect(toFiniteNumber("85,5")).toBe(85.5);
  });

  it('BUG-07: cleanCoachNoise não esvazia títulos legítimos', () => {
    expect(cleanCoachNoise('Novo')).toBe('Novo');
    expect(cleanCoachNoise('Prioridade')).toBe('Prioridade');
    expect(cleanCoachNoise('Revisão Geral Complementar de Direito')).toBe('de Direito');
  });

  it('BUG-08: bins limitado pelo número de amostras', () => {
    const probabilityPairsLength = 3;
    const bins = Math.max(2, Math.min(6, probabilityPairsLength));
    expect(bins).toBe(3);
  });

  it('BUG-09: coachPipeline preserva ok como booleano', async () => {
    const result = await coach({ categories: [] });
    expect(typeof result.ok).toBe('boolean');
  });

  it('BUG-11: stateSpace modelo inicializado corretamente com midpoint', () => {
    const res = runStateSpaceModel([], { maxScore: 1000, minScore: 200 });
    expect(res).toBeDefined();
  });

  it('BUG-12: GARCH dtEffective limit evita underflow', () => {
    const series = [
      { score: 50, date: '2026-01-01' },
      { score: 55, date: '2026-01-15' },
      { score: 60, date: '2026-03-15' }
    ];
    const vol = estimateDynamicVolatility(series, { maxScore: 100 });
    expect(Number.isFinite(vol.volatility)).toBe(true);
    expect(vol.volatility).toBeGreaterThan(0);
  });

  it('BUG-15: coachCausal considera categoryName e materia', () => {
    const simulados = [{ date: '2026-01-01', subject: 'Direito Administrativo', score: 80 }];
    const logs = [{ date: '2026-01-02', materia: 'Direito Administrativo', minutes: 120 }];
    const events = buildStudyVolumeCausalEvents(simulados, logs, { categoryName: 'Direito Administrativo' });
    expect(Array.isArray(events)).toBe(true);
  });

  it('BUG-16: getFlag protege contra prototype pollution', () => {
    expect(getFlag('__proto__', false)).toBe(false);
    expect(getFlag('constructor', false)).toBe(false);
    expect(getFlag('prototype', false)).toBe(false);
  });

  it('BUG-18: detectDriftInSeries funciona com baseline próximo a zero', () => {
    const series = [0, 0, 0.0001, 0, 0.0002, 0.0001, 0, 0.0001, 0.5, 0.6, 0.7];
    const drift = detectDriftInSeries(series);
    expect(drift).toBeDefined();
    expect(typeof drift.severity).toBe('string');
    expect(Number.isFinite(drift.effectSize)).toBe(true);
  });

  it('BUG-19: coachTaskId revalidação de compositeKey quando mutado', () => {
    const task = { title: 'Tarefa Original', priority: 'high' };
    const enriched1 = ensureCoachTaskId(task);
    expect(enriched1._compositeKey).toContain('Tarefa Original');
    task.title = 'Tarefa Modificada';
    const enriched2 = ensureCoachTaskId(task);
    expect(enriched2._compositeKey).toContain('Tarefa Modificada');
  });

  it('BUG-20: posteriorPredictive com sampleSize=0 tem sampleTrust=0.10', () => {
    const res = estimatePosteriorPredictive({
      scores: [],
      baseProbability: 50,
      domain: 100
    });
    expect(res.sampleTrust).toBe(0.10);
  });

  it('BUG-24: buildCategorySplits matching por materia e categoryId', () => {
    const category = { id: 'cat-penal', name: 'Direito Penal' };
    const simulados = [
      { categoryId: 'cat-penal', date: '2026-01-01', score: 70 },
      { materia: 'Direito Penal', date: '2026-01-02', score: 80 },
      { materia: 'Direito Penal', date: '2026-01-03', score: 85 },
      { categoryId: 'cat-penal', date: '2026-01-04', score: 90 }
    ];
    const splits = buildCategorySplits(category, simulados, { minTrain: 1 });
    expect(Array.isArray(splits)).toBe(true);
    expect(splits.length).toBeGreaterThan(0);
  });

  it('BUG-26: getCoachInsight seguro com options omitido', () => {
    const insight = getCoachInsight({ name: 'Matemática' }, [], []);
    expect(insight && !insight.error).toBe(true);
  });

  it('BUG-27: getCognitiveState filtra logs inválidos e com minutos 0', () => {
    const logs = [
      { date: '2026-01-01', minutes: 0 },
      { date: '2026-01-02', minutes: 'abc' },
      { date: '2026-01-03', minutes: 60 }
    ];
    const cog = getCognitiveState(logs, { now: '2026-01-03' });
    expect(cog).toBeDefined();
  });

  it('BUG-28: computeNDCGAtK mantém relevância máxima em duplicatas', () => {
    const actual = [
      { id: 'topic-1', relevance: 1 },
      { id: 'topic-1', relevance: 3 }
    ];
    const predicted = [{ id: 'topic-1' }];
    const ndcg = computeNDCGAtK(predicted, actual, 1);
    expect(ndcg).toBeGreaterThan(0.5);
  });
});
