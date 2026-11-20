// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  scheduleFlashcardFsrs,
  computeFlashcardRetrievability,
} from '../../probabilistic/fsrs';
import { mapRetentionData } from '../../../utils/chartDataMappers';
import { parseVerticalizedSyllabus } from '../../../utils/syllabusParser';
import { rebalanceRemainingWeekSchedule } from '../allocationOptimizer';
import { syncAdaptiveFeatureFlags } from '../adaptiveMaturityEngine';
import { readFlags } from '../../../utils/coachFeatureStore';
import { sanitizeContest } from '../../../store/schemas';
import { AdaptivePulseStrip } from '../../../components/dashboard/AdaptivePulseStrip';
import { AdaptiveTacticalAlerts } from '../../../components/coach/AdaptiveTacticalAlerts';
import ErrorNotebook from '../../../components/ai/ErrorNotebook';
import SyllabusImporterModal from '../../../components/ai/SyllabusImporterModal';
import ActivityHeatmap from '../../../components/ActivityHeatmap';
import SimuladoAnalysis from '../../../components/SimuladoAnalysis';
import Header from '../../../components/Header';
import { applyAIResultsToDraft, computeEffectiveScoreRatio } from '../../../utils/aiSaveHelper';

const NOW = new Date('2026-05-06T14:00:00Z'); // Wednesday

describe('Full Adaptive Closure Suite (Items 1–13)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('Item 1: schedules flashcards via real FSRS-4.5 (stability, difficulty, lapses, retrievability)', () => {
    const newCard = { id: 'c1', front: 'Art. 5º', back: 'Direitos Fundamentais', reviews: 0, interval: 1, ease: 2.5 };
    const good = scheduleFlashcardFsrs(newCard, 2, { nowMs: NOW.getTime() });
    const easy = scheduleFlashcardFsrs(newCard, 3, { nowMs: NOW.getTime() });
    const again = scheduleFlashcardFsrs(newCard, 0, { nowMs: NOW.getTime() });

    expect(good.fsrs.model).toBe('fsrs_4_5');
    expect(easy.fsrs.stability).toBeGreaterThan(good.fsrs.stability);
    expect(again.fsrs.lapses).toBe(1);
    expect(again.interval).toBe(1);

    // Critical error card gets stricter target retention >= 0.93
    const critCard = { ...newCard, priority: 'critical', confidence: 'certeza' };
    const critRes = scheduleFlashcardFsrs(critCard, 2, { nowMs: NOW.getTime() });
    expect(critRes.fsrs.desiredRetention).toBeGreaterThanOrEqual(0.93);

    // Retrievability decays over elapsed days
    const recentR = computeFlashcardRetrievability(
      { lastReviewed: new Date(NOW.getTime() - 1 * 86_400_000).toISOString(), fsrs: { stability: 5 } },
      NOW.getTime()
    );
    const oldR = computeFlashcardRetrievability(
      { lastReviewed: new Date(NOW.getTime() - 25 * 86_400_000).toISOString(), fsrs: { stability: 5 } },
      NOW.getTime()
    );
    expect(recentR).toBeGreaterThan(oldR);
  });

  it('Item 2: mapRetentionData adapts retention decay using empirical half-life per discipline', () => {
    const lastStudied = new Date(NOW.getTime() - 8 * 86_400_000).toISOString();
    const fastDecayCat = {
      id: 'fast',
      name: 'Decai Rápido',
      lastStudiedAt: lastStudied,
      simuladoStats: {
        history: [
          { date: '2026-03-01', score: 90 },
          { date: '2026-03-06', score: 45 },
          { date: '2026-03-11', score: 88 },
          { date: '2026-03-16', score: 42 },
          { date: '2026-03-21', score: 85 },
          { date: '2026-03-26', score: 40 },
        ],
      },
    };
    const solidCat = {
      id: 'solid',
      name: 'Memória Sólida',
      lastStudiedAt: lastStudied,
      tasks: [{ id: 't1', completed: true }],
      simuladoStats: {
        history: [
          { date: '2026-01-15', score: 80 },
          { date: '2026-02-01', score: 82 },
          { date: '2026-02-18', score: 83 },
          { date: '2026-03-06', score: 85 },
          { date: '2026-03-22', score: 86 },
          { date: '2026-04-08', score: 88 },
        ],
      },
    };

    const mapped = mapRetentionData([fastDecayCat, solidCat], { now: NOW.getTime() });
    const fastItem = mapped.find((m) => m.id === 'fast');
    const solidItem = mapped.find((m) => m.id === 'solid');
    expect(fastItem.halfLifeDias).toBeLessThan(solidItem.halfLifeDias);
    expect(fastItem.retencao).toBeLessThan(solidItem.retencao);
    expect(fastItem.nivelCritico).toBeGreaterThan(solidItem.nivelCritico);
  });

  it('Item 5: SimuladoAnalysis supports Cebraspe net score and blank questions column', () => {
    const rows = [
      { id: 'r1', subject: 'Direito', topic: 'Atos', correct: 6, blanks: 2, total: 10, difficulty: 1.0 },
    ];
    const onRowsChange = vi.fn();
    const { container } = render(
      <SimuladoAnalysis
        rows={rows}
        onRowsChange={onRowsChange}
        categories={[{ id: 'c1', name: 'Direito', tasks: [{ id: 't1', text: 'Atos' }] }]}
        viewMode="form"
        penaltyPerWrong={1.0}
        examBoard="CEBRASPE"
      />
    );
    expect(container.textContent).toContain('Nota Líquida ativa');
    expect(container.textContent).toContain('Branco');
  });

  it('Item 6: renders AdaptivePulseStrip (Dashboard) and AdaptiveTacticalAlerts (Coach)', () => {
    const corrCats = [
      {
        id: 'a',
        name: 'Constitucional',
        weight: 30,
        simuladoStats: {
          history: [
            { date: '2026-03-02', score: 50, difficulty: 'facil', total: 10, correct: 4 },
            { date: '2026-03-09', score: 65, difficulty: 'dificil', total: 10, correct: 8 },
            { date: '2026-03-16', score: 80, difficulty: 'dificil', total: 10, correct: 8 },
            { date: '2026-03-23', score: 90, difficulty: 'medio', total: 10, correct: 9 },
          ],
        },
      },
      {
        id: 'b',
        name: 'Penal',
        weight: 20,
        simuladoStats: {
          history: [
            { date: '2026-03-02', score: 88 },
            { date: '2026-03-09', score: 74 },
            { date: '2026-03-16', score: 58 },
            { date: '2026-03-23', score: 45 },
          ],
        },
      },
    ];
    const simRows = [
      {
        id: 's1',
        questionTelemetry: [
          { id: 'q1', correct: false, confidence: 'certeza', timeSec: 45 },
          { id: 'q2', correct: false, confidence: 'certeza', timeSec: 50 },
        ],
      },
    ];

    const { container: pulse } = render(
      <MemoryRouter>
        <AdaptivePulseStrip
          categories={corrCats}
          studyLogs={[{ date: new Date().toISOString(), minutes: 60 }]}
          flashcardDecks={[{ id: 'd1', cards: [{ id: 'c1', due: '2020-01-01' }] }]}
          onOpenSyllabusImporter={() => {}}
        />
      </MemoryRouter>
    );
    expect(pulse.textContent).toContain('Importar Edital');
    expect(pulse.textContent).toContain('flashcard');

    const { container: alerts } = render(
      <AdaptiveTacticalAlerts categories={corrCats} studyLogs={[]} simuladoRows={simRows} />
    );
    expect(alerts.textContent).toContain('Canibalização Detectada');
    expect(alerts.textContent).toContain('Ilusão de Competência');
  });

  it('Item 7: ErrorNotebook aggregates errors, filters by confidence/cause, and triggers FSRS + drill', () => {
    const simRows = [
      {
        id: 'row-1',
        subject: 'Português',
        topic: 'Crase',
        date: '2026-05-01',
        questionTelemetry: [
          { id: 'q1', correct: false, confidence: 'certeza', errorType: 'banca', timeSec: 60, statement: 'Assinale a alternativa correta sobre crase.', correctAnswer: 'B' },
          { id: 'q2', correct: true, confidence: 'certeza', timeSec: 40 },
          { id: 'q3', correct: false, confidence: 'chute', errorType: 'teoria', timeSec: 30, statement: 'Questão sobre regência.' },
        ],
      },
    ];
    const onSend = vi.fn();
    const onDrill = vi.fn();
    const { container, getByText } = render(
      <ErrorNotebook simuladoRows={simRows} onSendToFlashcards={onSend} onStartErrorDrill={onDrill} />
    );
    expect(container.textContent).toContain('Caderno de Erros Inteligente');
    expect(container.textContent).toContain('2 erro(s)');
    fireEvent.click(getByText(/Enviar para Flashcards FSRS/i));
    expect(onSend).toHaveBeenCalledTimes(1);
    fireEvent.click(getByText(/Refazer só meus erros/i));
    expect(onDrill).toHaveBeenCalledTimes(1);
  });

  it('Item 8: ActivityHeatmap supports Tempo/Energia layers and studyMode filter', () => {
    const todayIso = new Date().toISOString();
    const logs = [
      { date: todayIso, minutes: 60, studyMode: 'questoes', energyLevel: 5 },
      { date: todayIso, minutes: 30, studyMode: 'lei_seca', energyLevel: 3 },
    ];
    const { container, getByText } = render(<ActivityHeatmap studyLogs={logs} />);
    expect(container.textContent).toContain('Tempo Total');
    expect(container.textContent).toContain('Energia Média');
    fireEvent.click(getByText('Energia Média'));
    expect(container.textContent).toContain('Alta');
  });

  it('Item 9: rebalanceRemainingWeekSchedule redistributes missed blocks into remaining days', () => {
    const cats = [
      { id: 'c1', name: 'Constitucional', weight: 30, simuladoStats: { history: [{ date: '2026-04-20', score: 60 }] } },
      { id: 'c2', name: 'Português', weight: 20, simuladoStats: { history: [{ date: '2026-04-20', score: 75 }] } },
    ];
    const existing = [
      // Missed Monday auto event (2026-05-04) + manual Friday event (2026-05-08)
      { id: 'e1', date: '2026-05-04', time: '09:00', title: 'Bloco perdido', autoGenerated: true },
      { id: 'e2', date: '2026-05-08', time: '18:00', title: 'Evento manual', autoGenerated: false },
    ];
    const res = rebalanceRemainingWeekSchedule(existing, cats, [], [], [], {
      now: NOW,
      dailyHours: [2, 2, 2, 2, 2, 2, 2],
    });
    expect(res.missedBlocksDetected).toBe(1);
    expect(res.daysRemaining).toBe(4); // Wed, Thu, Fri, Sat
    expect(res.addedCount).toBeGreaterThanOrEqual(4);
    expect(res.events.some((e) => e.id === 'e2')).toBe(true); // preserves manual events
  });

  it('Item 10: parseVerticalizedSyllabus & SyllabusImporterModal parse groups, weights, and topics', () => {
    const text = `CONHECIMENTOS BÁSICOS
Português (peso 15)
1. Crase
2. Sintaxe

CONHECIMENTOS ESPECÍFICOS
Direito Penal (peso 30)
- Teoria do Crime
- Tipicidade`;

    const parsed = parseVerticalizedSyllabus(text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Português');
    expect(parsed[0].weight).toBe(15);
    expect(parsed[0].examGroup).toBe('basicos');
    expect(parsed[0].tasks).toHaveLength(2);
    expect(parsed[1].examGroup).toBe('especificos');
    expect(parsed[1].weight).toBe(30);

    const onImport = vi.fn();
    const { getByText } = render(
      <SyllabusImporterModal isOpen onClose={() => {}} onImportCategories={onImport} />
    );
    fireEvent.click(getByText('Carregar exemplo'));
    fireEvent.click(getByText(/Importar 2 Matéria/i));
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][0]).toHaveLength(2);
  });

  it('Item 12: sanitizeContest & syncAdaptiveFeatureFlags sync cloud feature flags and manual overrides', () => {
    const sanitized = sanitizeContest({
      id: 'cloud-c1',
      name: 'TRF',
      coachFeatureFlags: { useStateSpace: true, badVal: 'nope' },
      coachManualFlagOverrides: { useAutoTuner: false },
    });
    expect(sanitized.coachFeatureFlags).toEqual({ useStateSpace: true });
    expect(sanitized.coachManualFlagOverrides).toEqual({ useAutoTuner: false });

    const richHistory = Array.from({ length: 26 }, (_, i) => ({
      date: new Date(NOW.getTime() - i * 86_400_000).toISOString().slice(0, 10),
      score: 70,
    }));
    const contest = {
      categories: [
        { id: 'c1', simuladoStats: { history: richHistory.slice(0, 13) } },
        { id: 'c2', simuladoStats: { history: richHistory.slice(13) } },
      ],
      studyLogs: Array.from({ length: 16 }, (_, i) => ({ date: new Date(NOW.getTime() - i * 86_400_000).toISOString(), minutes: 45 })),
      calibrationAuditLog: Array.from({ length: 9 }, (_, i) => ({ id: `a${i}` })),
      coachFeatureFlags: { useCustomFlag: true },
      coachManualFlagOverrides: { useAutoTuner: false },
    };

    syncAdaptiveFeatureFlags(contest, 'cloud-scope', { respectOverrides: true });
    const flags = readFlags('cloud-scope');
    expect(flags.useCustomFlag).toBe(true);
    expect(flags.useStateSpace).toBe(true);
    expect(flags.useAutoTuner).toBe(false);
  });

  it('Fix A: persists Cebraspe net score (with blanks) across AI simuladoRows, simulados and category history', () => {
    // 6 correct, 2 blank, 2 wrong out of 10 with penalty 1.0 => net = 4/10 = 40%
    const eff = computeEffectiveScoreRatio(6, 10, { blanks: 2, penaltyPerWrong: 1.0, minScore: 0, maxScore: 100 });
    expect(eff.ratio).toBeCloseTo(0.4, 4);
    expect(eff.netPoints).toBe(4);
    expect(eff.penaltyApplied).toBe(true);

    // Negative scale (-120..120): 30 correct, 10 blank, 80 wrong => rawNet = -50
    const negEff = computeEffectiveScoreRatio(30, 120, { blanks: 10, penaltyPerWrong: 1.0, minScore: -120, maxScore: 120 });
    expect(-120 + negEff.ratio * 240).toBeCloseTo(-50, 1);

    const draft = {
      minScore: 0,
      maxScore: 100,
      penaltyPerWrong: 1.0,
      categories: [{ id: 'c1', name: 'Direito Penal', tasks: [], simuladoStats: { history: [] } }],
      simuladoRows: [],
      simulados: [],
    };
    applyAIResultsToDraft(
      draft,
      {
        categoryId: 'c1',
        materia: 'Direito Penal',
        assunto: 'Teoria do Crime',
        dificuldade: 'medio',
        questionTelemetry: [
          ...Array.from({ length: 6 }, (_, i) => ({ id: `ok-${i}`, correct: true, wasAnswered: true })),
          { id: 'b1', correct: false, wasAnswered: false },
          { id: 'b2', correct: false, wasAnswered: false },
          { id: 'w1', correct: false, wasAnswered: true },
          { id: 'w2', correct: false, wasAnswered: true },
        ],
      },
      6,
      10,
      300,
      false,
      'batch-cebraspe'
    );

    expect(draft.simuladoRows[0].score).toBe(40);
    expect(draft.simuladoRows[0].blanks).toBe(2);
    expect(draft.simulados[0].scorePoints).toBeCloseTo(40, 1);
    expect(draft.categories[0].simuladoStats.history[0].score).toBeCloseTo(40, 1);
  });

  it('Fix B: Header displays Modo Offline status pill when browser loses connectivity', () => {
    const prevOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    try {
      const { container } = render(<Header user={{ name: 'Aluno' }} />);
      expect(container.textContent).toContain('Modo Offline');
    } finally {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: prevOnLine });
    }
  });
});
