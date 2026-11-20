// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { reconcileContestCategoriesHistory } from '../../../utils/simuladoReconciler';
import { applyAIResultsToDraft } from '../../../utils/aiSaveHelper';
import { mergeQuestionResult } from '../../../utils/measurement';
import { mergeContestPayloadPure, stateStringForSync } from '../../../utils/cloudSyncMerge';
import { rebalanceRemainingWeekSchedule } from '../allocationOptimizer';
import { TornadoWhatIfChart } from '../../../components/charts/EvolutionChart/TornadoWhatIfChart';
import { IRTPsychometricChart } from '../../../components/charts/EvolutionChart/IRTPsychometricChart';
import { AdaptiveMaturityBadge } from '../../../components/ui/AdaptiveMaturityBadge';
import SimuladoAnalysis from '../../../components/SimuladoAnalysis';
import { useAppStore } from '../../../store/useAppStore';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Bugfix Audit Regression Suite (12 verified bugs)', () => {
  it('1. reconcileContestCategoriesHistory preserves CEBRASPE net score and blanks', () => {
    const cats = [
      {
        id: 'cat-dir',
        name: 'Direito Constitucional',
        maxScore: 100,
        minScore: 0,
        simuladoStats: {
          history: [
            {
              date: '2026-05-01',
              correct: 6,
              total: 10,
              blanks: 1,
              penaltyPerWrong: 1,
              score: 30,
              topics: [{ name: 'Direitos', correct: 6, total: 10, blanks: 1, penaltyPerWrong: 1 }],
            },
          ],
        },
      },
    ];
    const rows = [
      {
        id: 'r1',
        categoryId: 'cat-dir',
        subject: 'Direito Constitucional',
        topic: 'Direitos',
        date: '2026-05-01',
        correct: 6,
        total: 10,
        blanks: 1,
        penaltyPerWrong: 1,
        score: 30,
        isPercentage: true,
      },
    ];

    // 6 certas - 3 erradas (1 branco) = 3 líquidas / 10 = 30%
    const reconciled = reconcileContestCategoriesHistory(cats, rows, 100, 0, { penaltyPerWrong: 1 });
    const entry = reconciled[0].simuladoStats.history[0];
    expect(entry.score).toBeCloseTo(30, 1);
    expect(entry.blanks).toBe(1);
    expect(entry.penaltyPerWrong).toBe(1);
    expect(entry.netPoints).toBe(3);
  });

  it('2. mergeQuestionResult & 2nd AI attempt preserve net score, blanks and merge questionTelemetry', () => {
    const merged = mergeQuestionResult(
      {
        id: 'ai-row-1',
        correct: 6,
        total: 10,
        blanks: 1,
        penaltyPerWrong: 1,
        questionTelemetry: [{ id: 'q1', correct: true }, { id: 'q2', correct: false, errorType: 'lacuna' }],
      },
      {
        correct: 8,
        total: 10,
        blanks: 0,
        penaltyPerWrong: 1,
        timeSpentSecs: 120,
        questionTelemetry: [{ id: 'q3', correct: false, errorType: 'atencao' }],
        isDelta: true,
      },
      100,
      0
    );

    // Total = 20, correct = 14, blanks = 1, wrong = 5 => net = 14 - 5 = 9 => 45%
    expect(merged.total).toBe(20);
    expect(merged.correct).toBe(14);
    expect(merged.blanks).toBe(1);
    expect(merged.netPoints).toBe(9);
    expect(merged.scorePct).toBeCloseTo(45, 2);
    expect(merged.questionTelemetry).toHaveLength(3);
    expect(merged.questionTelemetry.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);

    // Also test via applyAIResultsToDraft with matching batchId
    const draft = {
      maxScore: 100,
      minScore: 0,
      penaltyPerWrong: 1,
      simuladoRows: [],
      simulados: [],
      categories: [{ id: 'c1', name: 'Português', maxScore: 100, minScore: 0, simuladoStats: { history: [] } }],
    };
    const formBase = {
      materia: 'Português',
      assunto: 'Crase',
      categoryId: 'c1',
      taskId: 't1',
      dificuldade: 'medio',
    };
    applyAIResultsToDraft(
      draft,
      { ...formBase, questionTelemetry: [{ id: 'a1', wasAnswered: true, correct: true }, { id: 'a2', wasAnswered: false, correct: false }] },
      6,
      10,
      180,
      false,
      'batch-same'
    );
    applyAIResultsToDraft(
      draft,
      { ...formBase, questionTelemetry: [{ id: 'a3', wasAnswered: true, correct: false, errorType: 'interpretacao' }] },
      8,
      10,
      150,
      false,
      'batch-same'
    );
    expect(draft.simuladoRows).toHaveLength(1);
    expect(draft.simuladoRows[0].scorePct).toBeCloseTo(45, 2);
    expect(draft.simuladoRows[0].questionTelemetry).toHaveLength(3);
  });

  it('3. SimuladoAnalysis handleAnalyze applies CEBRASPE penalty and blanks to report percentages', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const rows = [
      { id: 'r1', subject: 'Direito', topic: 'Atos', total: 10, correct: 6, blanks: 1, difficulty: 1 },
    ];
    const { getByText } = render(
      <SimuladoAnalysis
        rows={rows}
        onAnalysisComplete={onComplete}
        categories={[{ id: 'c1', name: 'Direito', tasks: [] }]}
        penaltyPerWrong={1}
        examBoard="CEBRASPE"
      />
    );

    const analyzeBtn = getByText(/Gerar Diagnóstico|Analisar/i);
    fireEvent.click(analyzeBtn);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    const report = onComplete.mock.calls[0][0];
    // 6 certas - 3 erradas (1 em branco) = 3 líquidas / 10 = 30%
    expect(report.disciplines[0].percentage).toBe(30);
    expect(report.disciplines[0].topics[0].percentage).toBe(30);
    expect(report.generalInsight).toContain('30%');
  });

  it('4. cloudSyncMerge resolves adaptive settings by contest timestamp and honors agenda tombstones', () => {
    const localContest = {
      lastUpdated: '2026-05-05T12:00:00.000Z',
      examBoard: 'CEBRASPE',
      penaltyPerWrong: 1,
      examGroupCutoffs: {}, // user intentionally cleared group cutoffs
      coachFeatureFlags: { useStateSpace: true },
      coachManualFlagOverrides: { useBanditPlanner: false },
      agenda: [{ id: 'ev-new', date: '2026-05-06', title: 'Novo Bloco', autoGenerated: true, createdAt: '2026-05-05T12:00:00.000Z' }],
      deletedAgendaIds: [{ id: 'ev-old-auto', deletedAt: '2026-05-05T12:00:00.000Z' }],
      categories: [],
    };
    const cloudContest = {
      lastUpdated: '2026-05-04T12:00:00.000Z',
      examBoard: 'FGV',
      penaltyPerWrong: 0,
      examGroupCutoffs: { basicos: 50 },
      coachFeatureFlags: { useStateSpace: true, useDynamicVolatility: true },
      coachManualFlagOverrides: { useBanditPlanner: true },
      agenda: [{ id: 'ev-old-auto', date: '2026-05-06', title: 'Antigo Bloco', autoGenerated: true, createdAt: '2026-05-04T10:00:00.000Z' }],
      categories: [],
    };

    // Even when preferCloudBase is true (another contest had newer global timestamp), contest-level timestamp wins!
    const merged = mergeContestPayloadPure(localContest, cloudContest, true, [], 'c-test');
    expect(merged.examBoard).toBe('CEBRASPE');
    expect(merged.penaltyPerWrong).toBe(1);
    expect(merged.examGroupCutoffs).toEqual({});
    expect(merged.coachManualFlagOverrides.useBanditPlanner).toBe(false);
    expect(merged.agenda.map((e) => e.id)).toEqual(['ev-new']);

    // stateStringForSync reflects adaptive settings changes
    const fp1 = stateStringForSync({ version: 1, activeId: 'c1', contests: { c1: { examBoard: 'PADRAO', penaltyPerWrong: 0 } } });
    const fp2 = stateStringForSync({ version: 1, activeId: 'c1', contests: { c1: { examBoard: 'CEBRASPE', penaltyPerWrong: 1 } } });
    expect(fp1).not.toBe(fp2);
  });

  it('5. TornadoWhatIfChart allows clearing saved group cutoffs and syncs on contest change', () => {
    const onSave = vi.fn();
    const cats = [
      {
        id: 'c1',
        name: 'Português',
        weight: 20,
        examGroup: 'basicos',
        simuladoStats: { history: [{ date: '2026-05-01', score: 70 }, { date: '2026-05-02', score: 75 }] },
      },
    ];
    const { container, rerender, getByText } = render(
      <TornadoWhatIfChart
        categories={cats}
        examGroupCutoffs={{ basicos: 60 }}
        onSaveGroupCutoffs={onSave}
      />
    );

    const inputs = container.querySelectorAll('input[type="number"]');
    expect(inputs[0].value).toBe('60');

    // Clear the only saved cutoff and save -> must persist {} instead of old { basicos: 60 }!
    fireEvent.change(inputs[0], { target: { value: '' } });
    fireEvent.click(getByText('Salvar cortes'));
    expect(onSave).toHaveBeenCalledWith({});

    // Switching contest props updates draft inputs immediately
    rerender(
      <TornadoWhatIfChart
        categories={cats}
        examGroupCutoffs={{ especificos: 75 }}
        onSaveGroupCutoffs={onSave}
      />
    );
    const updatedInputs = container.querySelectorAll('input[type="number"]');
    expect(updatedInputs[0].value).toBe('');
    expect(updatedInputs[1].value).toBe('75');
  });

  it('6. IRTPsychometricChart syncs board and penalty when contest props change', () => {
    const cats = [{ id: 'c1', name: 'Português', simuladoStats: { history: [{ date: '2026-05-01', score: 70 }] } }];
    const { container, rerender } = render(
      <IRTPsychometricChart categories={cats} examBoard="CEBRASPE" penaltyPerWrong={1} />
    );
    const select = container.querySelector('select');
    const penaltyInput = container.querySelector('input[type="number"]');
    expect(select.value).toBe('CEBRASPE');
    expect(Number(penaltyInput.value)).toBe(1);

    rerender(<IRTPsychometricChart categories={cats} examBoard="FGV" penaltyPerWrong={0} />);
    expect(select.value).toBe('FGV');
    expect(Number(penaltyInput.value)).toBe(0);
  });

  it('7. AdaptiveMaturityBadge does NOT call patchData on read-only mount for Stage N0 contest', () => {
    const prevState = useAppStore.getState();
    const patchSpy = vi.fn();
    useAppStore.setState({
      appState: {
        ...prevState.appState,
        activeId: 'legacy-n0',
        contests: {
          ...prevState.appState?.contests,
          'legacy-n0': {
            name: 'Legacy N0',
            categories: [],
            studyLogs: [],
            simuladoRows: [],
          },
        },
      },
      patchData: patchSpy,
    });

    try {
      render(<AdaptiveMaturityBadge compact autoSync />);
      expect(patchSpy).not.toHaveBeenCalled();
    } finally {
      useAppStore.setState({
        appState: prevState.appState,
        patchData: prevState.patchData,
      });
    }
  });

  it('8. rebalanceRemainingWeekSchedule uses Mon-Sun week so Sunday detects missed Mon-Sat blocks', () => {
    // 2026-05-03 is a Sunday; 2026-05-01 (Friday) and 2026-05-02 (Saturday) are earlier in the same Mon-Sun week.
    const sundayNow = new Date('2026-05-03T15:00:00Z');
    const existingEvents = [
      { id: 'm1', date: '2026-05-01', title: 'Bloco Sexta', autoGenerated: true },
      { id: 'm2', date: '2026-05-02', title: 'Bloco Sábado', autoGenerated: true },
    ];
    const cats = [{ id: 'c1', name: 'Direito', weight: 20, simuladoStats: { history: [{ date: '2026-04-28', score: 65 }] } }];
    const res = rebalanceRemainingWeekSchedule(existingEvents, cats, [], [], [], {
      now: sundayNow,
      dailyHours: [2, 3, 3, 3, 3, 3, 4],
    });

    expect(res.daysRemaining).toBe(1);
    expect(res.missedBlocksDetected).toBe(2);
    expect(res.addedCount).toBeGreaterThanOrEqual(2);
  });
});
