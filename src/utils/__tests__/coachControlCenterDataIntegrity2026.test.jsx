// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, act, waitFor } from '@testing-library/react';
import CoachControlCenter from '../../components/coach/CoachControlCenter.jsx';
import { useCoachControlCenter } from '../../hooks/useCoachControlCenter.js';
import { clearAllCoachFlags, setCoachFeatureContestScope, writeFlags } from '../coachFeatureStore.js';
import { clearUrgencyCache, clearMcCache, clearTopicsCache } from '../coachLogic.js';
import { compareEvaluationSummaries, saveEvaluationResult } from '../../engine/evaluation/coachEvaluator.js';
import { bootstrapPromotionGate } from '../autoTunerGate.js';
import { runAutoTunerCycle, saveBacktestReport, loadLastBacktestReport, saveTunerHistory } from '../../engine/optimization/autoTuner.js';
import { mergeSimuladosWithCategoryHistory } from '../coachCausal.js';
import { saveCausalModel, loadCausalModel } from '../../engine/causal/upliftModel.js';
import { runCoachDriftGuard, saveModelHealthSnapshot, extractObservabilitySeries } from '../coachObservability.js';
import { logCalibrationTelemetryEvent } from '../calibrationTelemetry.js';
import { buildCalibrationSeriesData } from '../advancedChartHelpers.js';
import { runGranularCoachBacktest } from '../coachEvaluation.js';
import { buildCoachOrchestratorDashboard } from '../../engine/orchestrator/coachOrchestrator.js';

describe('Coach Control Center — Data Integrity, Portuguese UI & Zero-Data-Error Suite (2026)', () => {
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

  it('1. compareEvaluationSummaries computes delta.uplift and Testes Históricos displays signed Δ Ganho Nota and ↑ Supera Padrão', () => {
    const scope = 'cc-bt-uplift';
    const baseSummary = {
      count: 6,
      probability: { avgBrier: 0.20, ece: 0.09 },
      score: { mae: 6.0 },
      topics: { avgNdcg: 0.50 },
      tasks: { avgUplift: 1.25 },
    };
    const candSummary = {
      count: 6,
      probability: { avgBrier: 0.14, ece: 0.05 },
      score: { mae: 4.5 },
      topics: { avgNdcg: 0.72 },
      tasks: { avgUplift: 3.75 },
    };
    const comparison = compareEvaluationSummaries(baseSummary, candSummary);
    expect(comparison.delta.uplift).toBeCloseTo(2.5, 4);
    expect(comparison.winner).toBe('candidate');

    saveBacktestReport(
      {
        contestId: scope,
        generatedAt: Date.now(),
        config: { minTrain: 5, horizon: 2 },
        summaries: {
          baseline: baseSummary,
          conservative: candSummary,
        },
        comparisons: {
          conservative_vs_baseline: comparison,
        },
      },
      scope
    );

    render(<CoachControlCenter embedded contestId={scope} categories={[]} simulados={[]} studyLogs={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Testes Históricos/i }));

    expect(document.body.textContent).toContain('+2.50');
    expect(document.body.textContent).toContain('↑ Supera Padrão');
    expect(document.body.textContent).toContain('Horizonte: 2 sim.');
  });

  it('2. bootstrapPromotionGate exposes meanDelta, AutoTuner aligns paired folds by (categoryId, timestamp), and hydrates last saved result on mount', async () => {
    const gate = bootstrapPromotionGate([-0.08, -0.07, -0.09, -0.06, -0.08, -0.07, -0.08, -0.09], {
      minEffect: 0.01,
      nBoot: 200,
    });
    expect(gate.meanDelta).toBeCloseTo(-0.0775, 4);
    expect(gate.meanDelta).toBe(gate.observed);
    expect(gate.promote).toBe(true);

    const scope = 'cc-aligned-gate';
    const baseFolds = Array.from({ length: 8 }, (_, idx) => ({
      categoryId: `cat-${idx % 2}`,
      timestamp: 1_700_000_000_000 + idx * 86_400_000,
      probabilityEvaluation: { brier: idx % 2 === 0 ? 0.10 : 0.30 },
    }));
    const candFolds = [
      { categoryId: 'cat-unmatched', timestamp: 999, probabilityEvaluation: { brier: 0.99 } },
      ...[...baseFolds].reverse().map((f) => ({
        ...f,
        probabilityEvaluation: { brier: f.probabilityEvaluation.brier - 0.05 },
      })),
    ];

    saveBacktestReport(
      {
        contestId: scope,
        summaries: {
          baseline: { count: 8, probability: { avgBrier: 0.20, ece: 0.08 }, score: { mae: 8 }, topics: { avgNdcg: 0.4 } },
          conservative: { count: 8, probability: { avgBrier: 0.15, ece: 0.05 }, score: { mae: 5 }, topics: { avgNdcg: 0.7 } },
        },
        raw: {
          baseline: baseFolds,
          conservative: candFolds,
        },
      },
      scope
    );

    const cycle = runAutoTunerCycle({ contestId: scope, autoApply: false });
    expect(cycle.recommendation.action).toBe('promote');
    expect(cycle.recommendation.promotionGate.meanDelta).toBeCloseTo(-0.05, 4);

    // Hydrates immediately on mount from saved tunerHistory (no blank screen!)
    render(<CoachControlCenter embedded contestId={scope} categories={[]} simulados={[]} studyLogs={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Otimizador Automático/i }));
    expect(document.body.textContent).toContain('Promover Estratégia');
    expect(document.body.textContent).toContain('Média: -0.0500');
    expect(document.body.textContent).not.toContain('Média: —');
  });

  it('3. Hydrated tunerResult dynamically clears applied=true if currentFlags no longer match recommended strategy, and FlagsPanel shows real pinned count', () => {
    const scope = 'cc-hydrated-applied-check';
    saveTunerHistory(
      {
        generatedAt: Date.now(),
        applied: true,
        recommendation: { action: 'promote', strategyId: 'conservative', reason: 'Teste' },
        ranked: [{ id: 'conservative', label: 'Conservador — Lotes 1 + 2', score: 0.82, hasEvidence: true, evaluation: { quality: 0.8, sampleConfidence: 0.6 } }],
      },
      scope
    );
    // Flags are at baseline (useStateSpace: false), NOT conservative -> applied MUST hydrate as false!
    writeFlags({ useStateSpace: false }, scope);

    render(<CoachControlCenter embedded contestId={scope} categories={[]} simulados={[]} studyLogs={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Otimizador Automático/i }));
    expect(screen.queryByText(/Recomendação aplicada aos recursos ativos/i)).toBeNull();

    // Switch to Recursos do Motor and apply preset -> Travas / Ajustes Manuais card must reflect > 0 (not 0!)
    fireEvent.click(screen.getByRole('button', { name: /Recursos do Motor/i }));
    fireEvent.click(screen.getByRole('button', { name: /Conservador — Lotes 1 \+ 2/i }));
    expect(document.body.textContent).toContain('Fixados por perfil escolhido');
    expect(document.body.textContent).toContain('22');
  });

  it('4. mergeSimuladosWithCategoryHistory keeps standalone global simulados and extractObservabilitySeries deduplicates & rejects corrupted future dates', () => {
    const categories = [
      {
        id: 'cat-1',
        name: 'Constitucional',
        simuladoStats: {
          history: [{ id: 'c1', date: '2026-05-01', score: 70 }],
        },
      },
    ];
    const topLevelSimulados = [
      { id: 'g-dup', subject: 'Simulado Geral', date: '2026-05-01', score: 70 },
      { id: 'g-2', subject: 'Simulado Geral', date: '2026-05-08', score: 74 },
      { id: 'g-3', subject: 'Simulado Geral', date: '2026-05-15', score: 79 },
    ];

    const merged = mergeSimuladosWithCategoryHistory(categories, topLevelSimulados);
    expect(merged).toHaveLength(3);
    expect(merged.map((m) => m.id)).toEqual(['c1', 'g-2', 'g-3']);

    // Observability series: rejects duplicate IDs, duplicate day+score, and corrupted year 2099
    const obsSeries = extractObservabilitySeries([
      { id: 's1', subject: 'Português', date: '2026-04-01', score: 65 },
      { id: 's1', subject: 'Português', date: '2026-04-01', score: 65 }, // exact ID duplicate
      { subject: 'Português', date: '2026-04-01', score: 65 }, // day+score duplicate
      { id: 's2', subject: 'Português', date: '2026-04-08', score: 72 },
      { id: 's-corrupt-future', subject: 'Português', date: '2099-01-01', score: 10 }, // corrupted future date
    ]);
    expect(obsSeries.sampleSize).toBe(2);
    expect(obsSeries.scores).toEqual([65, 72]);
  });

  it('5. runCoachDriftGuard deduplicates probabilityPairs across multiple strategies and prevents negative daysSinceLastTelemetry', () => {
    const scope = 'cc-dedup-pairs';
    const baseTs = 1_710_000_000_000;
    const strategies = ['baseline', 'conservative', 'balanced', 'all-lots'];

    const records = [];
    strategies.forEach((strat) => {
      for (let i = 0; i < 10; i++) {
        records.push({
          id: `bt_${strat}_cat1_${baseTs + i * 86_400_000}`,
          strategyId: strat,
          categoryId: 'cat1',
          timestamp: baseTs + i * 86_400_000,
          probabilityEvaluation: {
            predictedProbability01: strat === 'baseline' ? 0.7 : 0.1,
            observed: 1,
            brier: strat === 'baseline' ? 0.09 : 0.81,
          },
        });
      }
    });
    saveEvaluationResult(records, scope);

    const health = runCoachDriftGuard({
      contestId: scope,
      strategyId: 'baseline',
      scores: [70, 72, 74, 75, 76],
      volatilities: [2],
      lastTelemetryTimestamp: Date.now() + 3_600_000, // slight clock skew in future
      saveSnapshot: false,
    });

    expect(health.metrics.currentCalibration.count).toBe(10);
    expect(health.metrics.currentCalibration.avgBrier).toBeCloseTo(0.09, 4);
    expect(health.metrics.daysSinceLastTelemetry).toBe(0);
  });

  it('6. Corrupted storage, out-of-range calibration metrics, NaN/Infinity, and English priority tokens never leak into UI', () => {
    const scope = 'cc-corrupt-guard';
    expect(saveCausalModel(null, scope)).toBe(false);
    localStorage.setItem(`coach_causal_model_v1:${scope}`, JSON.stringify({}));
    localStorage.setItem(`coach_strategy_backtest_v1:${scope}`, JSON.stringify(['corrupt']));
    expect(loadCausalModel(scope)).toBeNull();
    expect(loadLastBacktestReport(scope)).toBeNull();

    const series = buildCalibrationSeriesData(
      [
        { timestamp: 1_700_000_000_000, avgBrier: -0.4, ece: 2.5, categoryName: 'Português' },
        { timestamp: 1_700_086_400_000, avgBrier: 0.14, ece: 0.05, categoryName: 'Português' },
      ],
      {},
      []
    );
    expect(series).toHaveLength(1);
    expect(series[0].brier).toBeCloseTo(0.14, 4);

    const dash = buildCoachOrchestratorDashboard({
      ok: true,
      focus: { name: 'Português', urgency: { normalizedScore: NaN } },
      tasks: Array.from({ length: 15 }, (_, i) => ({ id: `t-${i}`, text: `Meta ${i + 1}`, priority: 'high' })),
      health: { healthScore: Infinity, status: 'healthy', alerts: [] },
      tuner: { recommendation: { action: 'promote' } },
    });
    expect(dash.totalTasksCount).toBe(15);
    expect(dash.tasks).toHaveLength(12);
    expect(dash.focus.normalizedScore).toBeNull();
    expect(dash.cards.find((c) => c.id === 'health_score').value).toBeNull();
    expect(dash.cards.find((c) => c.id === 'tuner_action').value).toBe('Promover melhoria');
  });

  it('7. SciencePanel merges simulados + allSimulados, HealthPanel syncs local telemetry, and latestHealth picks newer orchestrator health', async () => {
    const scope = 'cc-science-telemetry-sync';
    logCalibrationTelemetryEvent(
      {
        categoryId: 'cat-port',
        avgBrier: 0.13,
        ece: 0.04,
        probability: 75,
        calibrationPenalty: 0.02,
        timestamp: Date.now() - 2 * 86_400_000,
      },
      scope
    );
    saveModelHealthSnapshot(
      {
        generatedAt: 1_600_000_000_000,
        healthScore: 61,
        status: 'degraded',
        alerts: [],
        metrics: {},
      },
      scope
    );

    let hookApi;
    function HookHarness() {
      hookApi = useCoachControlCenter({
        contestId: scope,
        categories: [{ id: 'cat-port', name: 'Português', tasks: [{ id: 'tk1', text: 'Crase', completed: false, priority: 'high' }] }],
        simulados: [{ id: 's1', categoryId: 'cat-port', date: '2026-06-01', score: 80 }],
        studyLogs: [],
        maxScore: '100',
        minScore: '250', // corrupted minScore > maxScore -> sanitized safely to 0
      });
      return null;
    }
    render(<HookHarness />);
    expect(hookApi.effectiveCalibrationAuditLog.length).toBeGreaterThanOrEqual(1);
    expect(hookApi.latestHealth.healthScore).toBe(61);

    await act(async () => {
      await hookApi.runOrchestrator({ force: true, runHealth: true, saveHealthSnapshots: false });
    });
    expect(hookApi.latestHealth.generatedAt).toBeGreaterThan(1_600_000_000_000);
    cleanup();

    render(
      <CoachControlCenter
        embedded
        contestId={scope}
        categories={[{ id: 'cat-port', name: 'Português', tasks: [], simuladoStats: { history: [] } }]}
        simulados={[
          {
            id: 'comb-1',
            categoryId: 'cat-port',
            subject: 'Português',
            date: '2026-06-01',
            score: 50,
            topics: [
              { name: 'Sintaxe', total: 10, correct: 4 },
              { name: 'Pontuação', total: 10, correct: 8 },
            ],
          },
        ]}
        allSimulados={[{ id: 'other-cat-sim', subject: 'Informática', date: '2026-06-02', score: 90 }]}
        studyLogs={[]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Painel Científico/i }));
    expect(document.body.textContent).toContain('2 tópicos');
    expect(document.body.textContent).not.toContain('Sem histórico temporal de Brier Score');
  });

  it('8. lot11-causal-policy evaluates pre-cutoff causal alignment in backtest and Impacto Causal formats labels in clear Portuguese', async () => {
    const categories = [
      {
        id: 'cat-dir',
        name: 'Direito Penal',
        weight: 10,
        tasks: [
          { id: 't1', text: 'Resolver questões de tipicidade', completed: true, completedAt: '2026-03-04T10:00:00Z' },
          { id: 't2', text: 'Resolver questões de ilicitude', completed: true, completedAt: '2026-03-18T10:00:00Z' },
          { id: 't3', text: 'Resolver questões de culpabilidade', completed: true, completedAt: '2026-04-02T10:00:00Z' },
        ],
        simuladoStats: {
          history: [
            { id: 'p1', date: '2026-03-01', score: 50, total: 20, correct: 10 },
            { id: 'p2', date: '2026-03-07', score: 62, total: 20, correct: 12 },
            { id: 'p3', date: '2026-03-14', score: 60, total: 20, correct: 12 },
            { id: 'p4', date: '2026-03-21', score: 72, total: 20, correct: 14 },
            { id: 'p5', date: '2026-03-28', score: 70, total: 20, correct: 14 },
            { id: 'p6', date: '2026-04-05', score: 82, total: 20, correct: 16 },
          ],
        },
      },
    ];
    const bt = runGranularCoachBacktest(categories, [], [], {
      minTrain: 5,
      horizon: 1,
      strategies: [
        { id: 'baseline', label: 'Padrão Seguro (Base)', features: {} },
        {
          id: 'lot11-causal-policy',
          label: 'Lote 11',
          features: { useCausalUplift: true, usePersonalizedPolicy: true, useCausalTaskSelection: true },
        },
      ],
    });
    expect(bt.summaries['lot11-causal-policy'].tasks.avgUplift).toBeGreaterThan(
      bt.summaries.baseline.tasks.avgUplift
    );

    const scope = 'cc-causal-labels';
    saveCausalModel(
      {
        contestId: scope,
        generatedAt: Date.now(),
        sampleSize: 3,
        global: { method: 'insufficient_arms', uplift: 0, sampleSize: 3, treatedCount: 3, controlCount: 0 },
        actions: {},
        actionCounts: { no_task: 2, weak_topic_practice: 3 },
      },
      scope
    );

    render(<CoachControlCenter embedded contestId={scope} categories={[]} simulados={[]} studyLogs={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Impacto Causal/i }));
    expect(document.body.textContent).toContain('Comparação incompleta');
    expect(document.body.textContent).toContain('Apenas um Grupo (Sem Controle)');
    expect(document.body.textContent).toContain('Sem Tarefa Concluída (Controle)');
    expect(document.body.textContent).not.toContain('no_task');

    // Run overview with tasks to verify priority badges are in Portuguese ("Alta", not "high")
    fireEvent.click(screen.getByRole('button', { name: /Visão Geral/i }));
    fireEvent.click(screen.getByRole('button', { name: /Atualizar Diagnóstico/i }));
    await waitFor(() => {
      expect(screen.getByText(/Resumo Executivo do Diagnóstico/i)).toBeTruthy();
    });
  });
});
