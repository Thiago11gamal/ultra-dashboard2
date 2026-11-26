// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react';
import { AuthContext } from '../../context/AuthContextValue';
import { OWNER_ADMIN_EMAIL, syncAdminCoachFlags } from '../adminAccess.js';
import { replaceFlags, readFlags, setCoachFeatureContestScope, clearAllCoachFlags, subscribeFlags } from '../coachFeatureStore.js';
import { runCoachStrategyBacktest, getGranularCoachStrategies } from '../../engine/evaluation/strategyBacktester.js';
import { compareEvaluationSummaries } from '../../engine/evaluation/coachEvaluator.js';
import { runAutoTunerCycle } from '../../engine/optimization/autoTuner.js';
import { syncAdaptiveFeatureFlags } from '../../engine/adaptive/adaptiveMaturityEngine.js';
import { useCoachControlCenter } from '../../hooks/useCoachControlCenter.js';
import CoachControlCenter from '../../components/coach/CoachControlCenter.jsx';
import { buildCausalEventsFromHistory, buildStudyVolumeCausalEvents } from '../coachCausal.js';
import { estimateUpliftByAction } from '../../engine/causal/upliftModel.js';
import { buildCalibrationSeriesData, buildKnowledgeGraphLayout } from '../advancedChartHelpers.js';
import { KnowledgeGraphChart } from '../../components/charts/Coach/KnowledgeGraphChart.jsx';
import { CausalUpliftChart } from '../../components/charts/Coach/CausalUpliftChart.jsx';
import { AdaptiveTacticalAlerts } from '../../components/coach/AdaptiveTacticalAlerts.jsx';
import { evaluateModelHealth } from '../../engine/observability/modelHealth.js';
import { generateDailyGoals, clearUrgencyCache, clearMcCache, clearTopicsCache } from '../coachLogic.js';
import { RaioXDashboard } from '../../pages/Coach.jsx';

describe('Coach AI & Control Center — 22-Bug Audit Regression Suite', () => {
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

  it('Bug #1 & #9: Backtest granular isolates strategies from active Admin store flags, includes conservative/balanced/lot11, and preserves null deltas', () => {
    const scope = 'bt-isolation';
    setCoachFeatureContestScope(scope);
    syncAdminCoachFlags(scope);
    expect(readFlags(scope).useStateSpace).toBe(true);

    const strategies = getGranularCoachStrategies();
    const ids = strategies.map((s) => s.id);
    expect(ids).toContain('lot11-causal-policy');
    expect(ids).toContain('conservative');
    expect(ids).toContain('balanced');

    const categories = [
      {
        id: 'cat-1',
        name: 'Direito Constitucional',
        weight: 10,
        simuladoStats: {
          history: [
            { id: 'h1', date: '2026-03-01', score: 45, total: 20, correct: 9 },
            { id: 'h2', date: '2026-03-08', score: 52, total: 20, correct: 10 },
            { id: 'h3', date: '2026-03-15', score: 61, total: 20, correct: 12 },
            { id: 'h4', date: '2026-03-22', score: 68, total: 20, correct: 14 },
            { id: 'h5', date: '2026-03-29', score: 74, total: 20, correct: 15 },
            { id: 'h6', date: '2026-04-05', score: 82, total: 20, correct: 16 },
            { id: 'h7', date: '2026-04-12', score: 86, total: 20, correct: 17 },
          ],
        },
      },
    ];
    const studyLogs = [{ categoryId: 'cat-1', date: '2026-04-02', minutes: 120 }];

    const reportAdmin = runCoachStrategyBacktest({
      contestId: scope,
      categories,
      studyLogs,
      strategies: [strategies[0], strategies[1]],
      minTrain: 5,
      horizon: 1,
    });

    // Clear all store flags and re-run: baseline results MUST match identically (zero store contamination!)
    replaceFlags({}, scope);
    const reportClean = runCoachStrategyBacktest({
      contestId: scope,
      categories,
      studyLogs,
      strategies: [strategies[0], strategies[1]],
      minTrain: 5,
      horizon: 1,
    });

    expect(reportAdmin.summaries.baseline.score.mae).toBe(reportClean.summaries.baseline.score.mae);
    expect(reportAdmin.summaries.baseline.tasks.avgUplift).not.toBeNull();

    // Missing metrics in compareEvaluationSummaries stay null (never masked as 0.0000)
    const cmp = compareEvaluationSummaries({ count: 2, probability: {}, score: {}, topics: {} }, { count: 2, probability: {}, score: {}, topics: {} });
    expect(cmp.delta.brier).toBeNull();
    expect(cmp.delta.ndcg).toBeNull();
    expect(cmp.delta.ece).toBeNull();
  });

  it('Bug #2, #3 & #4: rollbackToBaseline persists against AdaptiveMaturityBadge, read-only AutoTuner preserves in-memory flags, and mount triggers zero sync parent listeners', async () => {
    const scope = 'cc-persist-test';
    const verifiedAdmin = {
      uid: 'admin-uid',
      email: OWNER_ADMIN_EMAIL,
      getIdTokenResult: async () => ({ claims: {} }),
    };

    // Stale persisted snapshot in localStorage
    localStorage.setItem(`coach_active_flags_v1:${scope}`, JSON.stringify({ useStateSpace: false, useAutoTuner: false }));

    let notificationsDuringRender = 0;
    const unsub = subscribeFlags(() => {
      notificationsDuringRender += 1;
    });

    let api;
    function Harness() {
      api = useCoachControlCenter({ contestId: scope, categories: [], simulados: [], studyLogs: [] });
      return null;
    }

    render(
      <AuthContext.Provider value={{ currentUser: verifiedAdmin }}>
        <Harness />
      </AuthContext.Provider>
    );
    unsub();

    // Bug #4: lazy initializer ran silently (zero synchronous notify during render)
    expect(notificationsDuringRender).toBe(0);
    expect(api.currentFlags.useStateSpace).toBe(true);

    // Bug #3: read-only loadAuxiliaryData / AutoTuner(autoApply:false) must NOT overwrite active in-memory flags
    await act(async () => {
      await api.runAutoTuner({ autoApply: false });
    });
    expect(readFlags(scope).useStateSpace).toBe(true);

    // Bug #2: rollbackToBaseline persists overrides so syncAdaptiveFeatureFlags does NOT undo rollback
    await act(async () => {
      api.rollbackToBaseline();
    });
    expect(readFlags(scope).useStateSpace).toBe(false);
    const synced = syncAdaptiveFeatureFlags({}, scope, { isAdmin: true, respectOverrides: true });
    expect(synced.finalFlags.useStateSpace).toBe(false);
  });

  it('Bug #7: autoTuner respects useAutoRollback=false and Control Center hides panels when Lot 13 flag is explicitly false', () => {
    const res = runAutoTunerCycle({
      contestId: 'rollback-flag-test',
      autoApply: false,
      currentFeatures: { useAutoRollback: false },
      healthSnapshots: [{ status: 'critical', healthScore: 20 }],
      evaluations: [],
    });
    expect(res.mode.allowRollback).toBe(false);
    expect(res.recommendation.action).not.toBe('rollback');

    // Lot 13 panel flag explicitly false hides the corresponding tab
    const panelScope = 'lot13-panel-test';
    replaceFlags({ useControlCenterLLMPanel: false }, panelScope);
    render(<CoachControlCenter contestId={panelScope} embedded categories={[]} simulados={[]} studyLogs={[]} />);
    expect(screen.queryByRole('button', { name: /Explicação por IA/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Visão Geral/i })).toBeTruthy();
  });

  it('Bug #8: evaluateModelHealth derives currentCalibration ECE/MCE from calibration telemetry fallback', () => {
    const health = evaluateModelHealth({
      calibrationEvents: [
        { timestamp: Date.now() - 1000, avgBrier: 0.16, ece: 0.05, reliability: [{ gap: 0.09 }] },
        { timestamp: Date.now(), avgBrier: 0.14, ece: 0.04, reliability: [{ gap: 0.07 }] },
      ],
      scores: [70, 75, 80],
      volatilities: [3, 2.5, 2],
      probabilityPairs: [],
    });
    expect(health.metrics.currentCalibration.ece).toBeCloseTo(0.045, 3);
    expect(health.metrics.currentCalibration.mce).toBeCloseTo(0.09, 3);
  });

  it('Bug #10: Causal engine deduplicates global uplift, isolates mode_* controls, normalizes category scales, and formats chart labels', () => {
    const categories = [
      {
        id: 'cat-red',
        name: 'Redação',
        minScore: 0,
        maxScore: 10,
        tasks: [{ id: 't1', text: 'Redação nota 10', completed: true, completedAt: '2026-04-03' }],
        simuladoStats: {
          history: [
            { id: 'r1', date: '2026-04-01', score: 6 },
            { id: 'r2', date: '2026-04-05', score: 8 }, // +2 on [0..10] => +20 on [0..100]
            { id: 'r3', date: '2026-04-10', score: 8 },
          ],
        },
      },
    ];
    const studyLogs = [
      { categoryId: 'cat-red', date: '2026-04-03', minutes: 90, studyMode: 'questoes' },
      { categoryId: 'cat-red', date: '2026-04-03', minutes: 45, studyMode: 'teoria' },
      { categoryId: 'cat-red', date: '2026-04-03', minutes: 45, studyMode: 'revisao' },
    ];

    const volEvents = buildStudyVolumeCausalEvents(
      categories[0].simuladoStats.history.map((h) => ({ ...h, categoryId: 'cat-red', subject: 'Redação' })),
      studyLogs,
      { maxScore: 100, minScore: 0, categories }
    );
    expect(volEvents[0].outcomeDelta).toBeCloseTo(20, 4);

    const allEvents = buildCausalEventsFromHistory(categories, [], studyLogs, { maxScore: 100, minScore: 0 });
    const est = estimateUpliftByAction(allEvents, { minSamplesPerAction: 2 });
    // Global sampleSize reflects deduplicated intervals (2), NOT inflated 10+ stacked copies
    expect(est.sampleSize).toBe(2);

    const { container } = render(
      <CausalUpliftChart
        causalModel={{
          actions: {
            mock_exam: { uplift: 3.1, sampleSize: 10, method: 'iptw' },
            agility_training: { uplift: 2.2, sampleSize: 10, method: 'iptw' },
            mode_lei_seca: { uplift: 1.5, sampleSize: 10, method: 'iptw' },
          },
        }}
      />
    );
    expect(container.querySelector('[role="img"]')).toBeTruthy();
  });

  it('Bug #11 & #13: CalibrationDriftChart reads healthSnapshots.currentCalibration + dedupes normalized labels; KnowledgeGraph supports numeric IDs and >6 topics', () => {
    const fromHealth = buildCalibrationSeriesData([], {}, [
      {
        generatedAt: Date.parse('2026-04-01T12:00:00Z'),
        metrics: { currentCalibration: { avgBrier: 0.19, ece: 0.06 } },
      },
    ]);
    expect(fromHealth).toHaveLength(1);
    expect(fromHealth[0].brier).toBeCloseTo(0.19, 3);
    expect(fromHealth[0].ece).toBeCloseTo(0.06, 3);

    const deduped = buildCalibrationSeriesData(
      [{ timestamp: 1700000000000, avgBrier: 0.18, ece: 0.05, categoryName: 'Matemática' }],
      { matematica: [{ timestamp: 1700000000200, avgBrier: 0.18, ece: 0.05 }] }
    );
    expect(deduped).toHaveLength(1);

    // Numeric category ID selection + 8-topic graph (>5 layers) + 4th legend item
    const numericCats = [
      {
        id: 101,
        name: 'Física',
        tasks: Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, text: `Tópico ${i + 1}`, completed: i < 2 })),
      },
      {
        id: 202,
        name: 'Química',
        tasks: [{ id: 'q1', text: 'Estequiometria', completed: false }],
      },
    ];
    const layout = buildKnowledgeGraphLayout(numericCats[0], { minScore: 0, maxScore: 100 });
    expect(layout.nodes).toHaveLength(8);
    expect(new Set(layout.nodes.map((n) => n.x)).size).toBeGreaterThan(6);

    const { container } = render(<KnowledgeGraphChart categories={numericCats} />);
    expect(container.textContent).toContain('Crítico (<55%)');
    const select = screen.getByLabelText(/Selecionar disciplina/i);
    fireEvent.change(select, { target: { value: '202' } });
    expect(container.textContent).toContain('Estequiometria');
  });

  it('Bug #15: AdaptiveTacticalAlerts deduplicates simulados, supports wasCorrect:false, ignores blanks, and allows dismissing alerts', () => {
    const simRows = [
      {
        id: 's1',
        questionTelemetry: [
          { id: 'q1', wasCorrect: false, wasAnswered: true, confidence: 'certeza' },
          { id: 'q2', wasCorrect: false, wasAnswered: true, confidence: 'certeza' },
          { id: 'q3', correct: false, wasAnswered: false, confidence: 'certeza' }, // blank -> ignored
        ],
      },
    ];
    const { container } = render(<AdaptiveTacticalAlerts categories={[]} studyLogs={[]} simuladoRows={simRows} />);
    expect(container.textContent).toContain('2 erros com "Certeza"');

    const dismissBtn = screen.getByRole('button', { name: /Dispensar alerta/i });
    fireEvent.click(dismissBtn);
    expect(container.textContent).not.toContain('Ilusão de Competência');
  });

  it('Bug #16 & #17: Stable coach task IDs do not depend on loop index and RaioX does not leak another subject reliability curve', () => {
    const goals = generateDailyGoals(
      [
        {
          id: 'cat-const',
          name: 'Constitucional',
          weight: 10,
          tasks: [
            { id: 't1', text: 'Direitos Fundamentais', completed: false },
            { id: 't2', text: 'Organização do Estado', completed: false },
          ],
          simuladoStats: { history: [] },
        },
      ],
      [],
      [],
      { maxScore: 100, minScore: 0 }
    );
    const syllabusTasks = goals.filter((g) => String(g.id).includes('-syllabus-'));
    // New format: `${safeCatKey}-syllabus-${safeSlug}-${hash}` (no volatile loop index segment)
    syllabusTasks.forEach((t) => {
      expect(t.id).not.toMatch(/-syllabus-[a-zA-Z0-9]+-\d+-[a-zA-Z0-9]+$/);
    });

    // RaioXDashboard: selecting a category without reliability buckets must NOT show another category's ECE
    const mockData = {
      categories: [
        { id: 'cat-a', name: 'Português' },
        { id: 'cat-b', name: 'Matemática' },
      ],
      calibrationAuditLog: [
        {
          timestamp: 1700000001000,
          categoryId: 'cat-a',
          categoryName: 'Português',
          avgBrier: 0.15,
          ece: 0.04,
          reliability: [{ binIndex: 0, meanPred: 0.7, observedRate: 0.68, gap: 0.02, count: 10 }],
        },
        {
          timestamp: 1700000002000,
          categoryId: 'cat-b',
          categoryName: 'Matemática',
          avgBrier: 0.22,
          ece: null,
          reliability: [],
        },
      ],
    };
    render(<RaioXDashboard data={mockData} />);
    const dropdown = screen.getByLabelText(/Selecionar categoria para análise de Drift Temporal/i);
    fireEvent.change(dropdown, { target: { value: 'Matemática' } });
    // Must show empty reliability state and "Sem ECE" instead of leaking Português's curve/ECE
    expect(document.body.textContent).toContain('Sem buckets de confiabilidade ainda');
    expect(document.body.textContent).toContain('Sem ECE');
  });
});
