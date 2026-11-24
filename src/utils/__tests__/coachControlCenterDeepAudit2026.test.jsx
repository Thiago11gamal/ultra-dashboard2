// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, act, waitFor } from '@testing-library/react';
import CoachControlCenter from '../../components/coach/CoachControlCenter.jsx';
import { useCoachControlCenter } from '../../hooks/useCoachControlCenter.js';
import {
  clearAllCoachFlags,
  setCoachFeatureContestScope,
  replaceFlags,
} from '../coachFeatureStore.js';
import { clearUrgencyCache, clearMcCache, clearTopicsCache } from '../coachLogic.js';
import { loadEvaluationResults } from '../../engine/evaluation/coachEvaluator.js';
import { loadOptimizerState, saveBacktestReport } from '../coachOptimizer.js';
import { saveModelHealthSnapshot, loadModelHealthSnapshots } from '../coachObservability.js';
import { readManualFlagOverrides } from '../adminAccess.js';

describe('Coach Control Center — Deep Audit & Enhancements 2026', () => {
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

  it('1. Health & Drift integrates calibrationAuditLog and calibrationHistoryByCategory, and coalesces duplicate burst snapshots', async () => {
    const scope = 'cc-health-calib';
    const baseTs = Date.parse('2026-06-01T12:00:00Z');
    const auditLogs = Array.from({ length: 8 }, (_, idx) => ({
      timestamp: baseTs + idx * 86_400_000,
      categoryId: 'cat-1',
      categoryName: 'Direito Constitucional',
      avgBrier: idx < 4 ? 0.09 : 0.27,
      ece: idx < 4 ? 0.04 : 0.16,
      reliability: [{ gap: idx < 4 ? 0.05 : 0.19 }],
    }));

    render(
      <CoachControlCenter
        embedded
        contestId={scope}
        categories={[{ id: 'cat-1', name: 'Direito Constitucional', tasks: [] }]}
        simulados={[
          { id: 's1', categoryId: 'cat-1', date: '2026-06-01', score: 70 },
          { id: 's2', categoryId: 'cat-1', date: '2026-06-03', score: 72 },
          { id: 's3', categoryId: 'cat-1', date: '2026-06-05', score: 74 },
          { id: 's4', categoryId: 'cat-1', date: '2026-06-07', score: 75 },
          { id: 's5', categoryId: 'cat-1', date: '2026-06-09', score: 76 },
        ]}
        studyLogs={[]}
        calibrationAuditLog={auditLogs}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Executar Orquestrador/i }));
    await waitFor(() => {
      expect(screen.getByText(/Saúde do Modelo/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Saúde & Drift/i }));
    expect(screen.getByText(/Drift de Calibração/i)).toBeTruthy();
    expect(screen.getByText(/Calibração Atual/i)).toBeTruthy();
    // Brier, ECE and MCE are populated from calibrationAuditLog (not '—')
    expect(document.body.textContent).toContain('0.1800');

    // Burst deduplication in saveModelHealthSnapshot (< 60s identical snapshot)
    const snapScope = 'cc-snap-burst';
    saveModelHealthSnapshot({ generatedAt: 1_700_000_000_000, healthScore: 88, status: 'healthy', alerts: [{ id: 'a1' }] }, snapScope);
    saveModelHealthSnapshot({ generatedAt: 1_700_000_010_000, healthScore: 88, status: 'healthy', alerts: [{ id: 'a1' }] }, snapScope);
    expect(loadModelHealthSnapshots(snapScope)).toHaveLength(1);
    expect(loadModelHealthSnapshots(snapScope)[0].generatedAt).toBe(1_700_000_010_000);
  });

  it('2. Repeated runBacktest deduplicates historical fold evaluations, avoids Thompson trial inflation, and counts coachPlan completions', async () => {
    const scope = 'cc-bt-dedup';
    const categories = [
      {
        id: 'cat-adm',
        name: 'Direito Administrativo',
        weight: 10,
        tasks: [],
        simuladoStats: {
          history: [
            { id: 'h1', date: '2026-03-01', score: 50, total: 20, correct: 10, topics: [{ name: 'Atos', total: 10, correct: 4 }] },
            { id: 'h2', date: '2026-03-08', score: 55, total: 20, correct: 11, topics: [{ name: 'Atos', total: 10, correct: 5 }] },
            { id: 'h3', date: '2026-03-15', score: 60, total: 20, correct: 12, topics: [{ name: 'Atos', total: 10, correct: 6 }] },
            { id: 'h4', date: '2026-03-22', score: 64, total: 20, correct: 13, topics: [{ name: 'Atos', total: 10, correct: 6 }] },
            { id: 'h5', date: '2026-03-29', score: 68, total: 20, correct: 14, topics: [{ name: 'Atos', total: 10, correct: 7 }] },
            { id: 'h6', date: '2026-04-05', score: 78, total: 20, correct: 16, topics: [{ name: 'Atos', total: 10, correct: 8 }] },
          ],
        },
      },
    ];
    const coachPlan = [
      {
        id: 'cp-adm-1',
        categoryId: 'cat-adm',
        category: 'Direito Administrativo',
        completed: true,
        completedAt: '2026-04-02T10:00:00Z',
      },
    ];

    let api;
    function Harness() {
      api = useCoachControlCenter({
        contestId: scope,
        categories,
        simulados: [],
        studyLogs: [],
        coachPlan,
      });
      return null;
    }

    render(<Harness />);

    let report1;
    await act(async () => {
      report1 = api.runBacktest();
    });
    expect(report1.summaries.baseline.count).toBeGreaterThan(0);
    // Task uplift recognizes coachPlan completion in horizon even with empty studyLogs
    expect(report1.summaries.baseline.tasks.avgUplift).not.toBeNull();

    const evalCountAfterFirst = loadEvaluationResults(scope).length;
    const trialsAfterFirst = loadOptimizerState(scope)?.baseline?.trials || 0;
    expect(evalCountAfterFirst).toBeGreaterThan(0);
    expect(trialsAfterFirst).toBe(1);

    await act(async () => {
      api.runBacktest();
    });
    expect(loadEvaluationResults(scope).length).toBe(evalCountAfterFirst);
    expect(loadOptimizerState(scope)?.baseline?.trials).toBe(1);
  });

  it('3. SciencePanel KnowledgeGraphChart ingests topic scores from top-level simulados when category history is empty', () => {
    const scope = 'cc-science-graph';
    render(
      <CoachControlCenter
        embedded
        contestId={scope}
        categories={[{ id: 'cat-const', name: 'Constitucional', tasks: [], simuladoStats: { history: [] } }]}
        simulados={[
          {
            id: 'top-sim-1',
            categoryId: 'cat-const',
            subject: 'Constitucional',
            date: '2026-05-01',
            score: 40,
            topics: [
              { name: 'Controle Difuso', total: 10, correct: 3 },
              { name: 'Ação Direta', total: 10, correct: 8 },
            ],
          },
        ]}
        studyLogs={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Painel Científico/i }));
    expect(document.body.textContent).toContain('2 tópicos');
    expect(document.body.textContent).toContain('30%');
  });

  it('4. Hidden Lot 13 panels can be restored in one click, active preset is badged, and restoreAutomaticFlags clears manual locks', () => {
    const scope = 'cc-lockout-recovery';
    replaceFlags({ useControlCenterLLMPanel: false, useControlCenterCausalPanel: false }, scope);

    render(<CoachControlCenter embedded contestId={scope} categories={[]} simulados={[]} studyLogs={[]} />);
    expect(screen.queryByRole('button', { name: /Explicação LLM/i })).toBeNull();
    expect(screen.getByText(/2 aba\(s\) oculta\(s\)/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Restaurar abas ocultas/i }));
    expect(screen.getByRole('button', { name: /Explicação LLM/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Causalidade/i })).toBeTruthy();

    // Switch to Feature Flags, apply preset, verify active badge and search in Portuguese
    fireEvent.click(screen.getByRole('button', { name: /Feature Flags/i }));
    fireEvent.click(screen.getByRole('button', { name: /Conservador — Lotes 1 \+ 2/i }));
    expect(screen.getByText('✓ Ativa')).toBeTruthy();
    expect(Object.keys(readManualFlagOverrides(scope)).length).toBeGreaterThan(0);

    // Search by Portuguese description ("volatilidade")
    const searchInput = screen.getByPlaceholderText(/Buscar por flag, função ou lote/i);
    fireEvent.change(searchInput, { target: { value: 'volatilidade' } });
    expect(document.body.textContent).toContain('useDynamicVolatility');

    // Restore automatic flags clears pinned manual overrides
    fireEvent.click(screen.getByRole('button', { name: /Automático \(Maturidade\)/i }));
    expect(Object.keys(readManualFlagOverrides(scope))).toHaveLength(0);
  });

  it('5. Pipeline Completo populates Overview and partial LLMPanel run preserves Health, AutoTuner, and Causal cards', async () => {
    const scope = 'cc-partial-preserve';
    const categories = [
      {
        id: 'cat-1',
        name: 'Português',
        weight: 15,
        tasks: [{ id: 't1', text: 'Crase', completed: true, completedAt: '2026-05-03T10:00:00Z' }],
        simuladoStats: {
          history: [
            { id: 's1', date: '2026-05-01', score: 60 },
            { id: 's2', date: '2026-05-05', score: 72 },
            { id: 's3', date: '2026-05-09', score: 75 },
            { id: 's4', date: '2026-05-12', score: 78 },
            { id: 's5', date: '2026-05-15', score: 80 },
          ],
        },
      },
    ];

    render(
      <CoachControlCenter
        embedded
        contestId={scope}
        categories={categories}
        simulados={[]}
        studyLogs={[{ categoryId: 'cat-1', date: '2026-05-03', minutes: 90 }]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Pipeline Completo/i }));
    await waitFor(() => {
      expect(screen.getByText(/Saúde do Modelo/i)).toBeTruthy();
    });
    expect(document.body.textContent).toContain('Ativo');

    // Run partial LLM generation (runHealth: false, runAutoTuner: false)
    fireEvent.click(screen.getByRole('button', { name: /Explicação LLM/i }));
    fireEvent.click(screen.getByRole('button', { name: /Gerar Explicação LLM/i }));
    await waitFor(() => {
      expect(screen.getByText(/Fatores Identificados/i)).toBeTruthy();
    });

    // Return to Overview: Health and Causal must still be intact
    fireEvent.click(screen.getByRole('button', { name: /Visão Geral/i }));
    expect(screen.getByText(/Saúde do Modelo/i)).toBeTruthy();
    expect(document.body.textContent).toContain('Ativo');
  });

  it('6. AutoTuner resets applied badge after rollback, displays Bootstrap gate, and Backtest/Causal show clear zero-sample diagnostics', async () => {
    const scope = 'cc-tuner-reset';
    saveBacktestReport(
      {
        contestId: scope,
        summaries: {
          baseline: { count: 8, probability: { avgBrier: 0.18, ece: 0.08 }, score: { mae: 8 }, topics: { avgNdcg: 0.4 }, tasks: { avgUplift: 0.5 } },
          conservative: { count: 8, probability: { avgBrier: 0.11, ece: 0.04 }, score: { mae: 4 }, topics: { avgNdcg: 0.8 }, tasks: { avgUplift: 3.0 } },
        },
        raw: {
          baseline: Array.from({ length: 8 }, () => ({ probabilityEvaluation: { brier: 0.18 } })),
          conservative: Array.from({ length: 8 }, () => ({ probabilityEvaluation: { brier: 0.11 } })),
        },
      },
      scope
    );

    render(<CoachControlCenter embedded contestId={scope} categories={[]} simulados={[]} studyLogs={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /AutoTuner/i }));
    fireEvent.click(screen.getByRole('button', { name: /Analisar e Aplicar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Recomendação aplicada às flags ativas/i)).toBeTruthy();
    });
    expect(screen.getByText(/Gate Bootstrap/i)).toBeTruthy();

    // Rollback to Baseline must clear the stale "aplicada às flags ativas" state
    fireEvent.click(screen.getByRole('button', { name: /Rollback para Baseline/i }));
    expect(screen.queryByText(/Recomendação aplicada às flags ativas/i)).toBeNull();

    // Zero-sample diagnostic hints in Backtest and Causal tabs
    fireEvent.click(screen.getByRole('button', { name: /Backtests/i }));
    fireEvent.click(screen.getByRole('button', { name: /Executar Backtest Granular/i }));
    await waitFor(() => {
      expect(screen.getByText(/Amostra cronológica insuficiente/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Causalidade/i }));
    fireEvent.click(screen.getByRole('button', { name: /Treinar Modelo Causal/i }));
    await waitFor(() => {
      expect(screen.getByText(/Nenhum intervalo causal elegível/i)).toBeTruthy();
    });
  });
});
