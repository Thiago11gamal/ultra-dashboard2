import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, fireEvent, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { mergeAppStatePure, mergeArraysPure, mergeContestCategoriesPure } from '../cloudSyncMerge.js';
import { sanitizeContest } from '../../store/schemas.js';
import { useAppStore } from '../../store/useAppStore.js';
import { secureLogout } from '../../services/firebase.js';
import useIdleLogout from '../../hooks/useIdleLogout.js';
import PomodoroTimer from '../../components/PomodoroTimer.jsx';
import StudyHistory from '../../components/StudyHistory.jsx';
import EvolutionChart from '../../components/EvolutionChart.jsx';
import AIGeneratedSimulado from '../../components/ai/AIGeneratedSimulado.jsx';

vi.mock('../../hooks/useToast', () => ({
  useToast: () => vi.fn(),
}));

vi.mock('../../utils/soundHelper', () => ({
  playPomodoroAlarm: vi.fn(),
  unlockAudio: vi.fn(),
}));

vi.mock('../../utils/notificationHelper', () => ({
  sendPomodoroNotification: vi.fn(),
  requestNotificationPermission: vi.fn().mockResolvedValue('denied'),
  isNotificationSupported: () => false,
}));

describe('Recent Changes Bug Fixes Regression Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('1. secureLogout returns firestoreTerminated flag and removes pomodoro_muted + scoped telemetry', async () => {
    localStorage.setItem('pomodoro_muted', 'true');
    localStorage.setItem('coach_calibration_events_v1::contest-2', '[]');

    const res = await secureLogout();

    expect(res.ok).toBe(true);
    expect(typeof res.firestoreTerminated).toBe('boolean');
    expect(localStorage.getItem('pomodoro_muted')).toBeNull();
    expect(localStorage.getItem('coach_calibration_events_v1::contest-2')).toBeNull();
  });

  it('2. PomodoroTimer unmount during break->work transition does not log phantom work minutes or overwrite pomodoroState timeLeft with 0', () => {
    vi.useFakeTimers();

    const activeSubject = {
      categoryId: 'cat-1',
      category: 'Direito',
      taskId: 'task-1',
      task: 'Controle de Constitucionalidade',
      sessionInstanceId: 'sess-break-unmount',
    };

    useAppStore.setState((state) => ({
      appState: {
        ...state.appState,
        pomodoro: {
          ...state.appState.pomodoro,
          mode: 'break',
          sessions: 1,
          targetCycles: 2,
          completedCycles: 0,
          accumulatedMinutes: 25,
          isRunning: false,
          activeSubject,
        },
      },
    }));

    const onUpdateStudyTime = vi.fn();
    const onFullCycleComplete = vi.fn();
    const onSessionComplete = vi.fn();

    const { unmount } = render(
      <PomodoroTimer
        settings={{ pomodoroWork: 25, pomodoroBreak: 5, pomodoroLongBreak: 15, soundEnabled: false }}
        activeSubject={activeSubject}
        onUpdateStudyTime={onUpdateStudyTime}
        onFullCycleComplete={onFullCycleComplete}
        onSessionComplete={onSessionComplete}
      />
    );

    // Aciona skip na fase de pausa (entra na janela de transição de 50ms)
    const skipBtn = screen.getByRole('button', { name: /Pular fase/i });
    act(() => {
      fireEvent.click(skipBtn);
    });

    // Desmonta antes dos 50ms do timeout de transição
    unmount();

    // Não pode registrar minutos fantasmas de um bloco de trabalho que nunca começou
    expect(onUpdateStudyTime).not.toHaveBeenCalled();

    // Deve preservar timeLeft = 25*60 = 1500s para o próximo bloco de foco (não sobrescrever com 0 ou 300)
    const savedRaw = localStorage.getItem('pomodoroState');
    expect(savedRaw).toBeTruthy();
    const saved = JSON.parse(savedRaw);
    expect(saved.mode).toBe('work');
    expect(saved.timeLeft).toBe(25 * 60);
  });

  it('3. resetStore suppresses persist re-write so ultra-dashboard-storage is not recreated after debounce', async () => {
    vi.useFakeTimers();
    localStorage.setItem('ultra-dashboard-storage', '{"state":{}}');
    localStorage.setItem('ultra-dashboard-storage:meta', '{"version":1}');

    useAppStore.getState().resetStore();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(localStorage.getItem('ultra-dashboard-storage')).toBeNull();
    expect(localStorage.getItem('ultra-dashboard-storage:meta')).toBeNull();
  });

  it('4. useIdleLogout preserves cross-tab storedTime instead of overwriting lastActivityRef with Date.now()', () => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-11-19T12:00:00.000Z').getTime();
    vi.setSystemTime(baseTime);

    const logout = vi.fn();
    const TIMEOUT = 60 * 60 * 1000; // 60 min

    function IdleHarness() {
      useIdleLogout(logout, TIMEOUT, true);
      return null;
    }

    const { unmount } = render(<IdleHarness />);

    try {
      // T = 50 min: outra aba registra atividade
      const otherTabActivity = baseTime + 50 * 60 * 1000;
      localStorage.setItem('ultra-last-activity', String(otherTabActivity));

      // T = 60 min: timer da Aba A dispara e adia pelo restante (50 min)
      act(() => {
        vi.advanceTimersByTime(60 * 60 * 1000);
      });
      expect(logout).not.toHaveBeenCalled();

      // T = 115 min (65 min desde a última atividade real em T=50m): aba volta ao foco
      // (simulando timer throttled em background)
      vi.setSystemTime(baseTime + 115 * 60 * 1000);
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(logout).toHaveBeenCalledTimes(1);
    } finally {
      unmount();
    }
  });

  it('5. cloudSyncMerge scopes isDeletedInTrash by contestId so trash in Contest A does not delete same-name subject in Contest B', () => {
    const localTrash = [
      {
        id: 'trash-1',
        type: 'category',
        contestId: 'contest-A',
        deletedAt: '2026-11-19T12:00:00.000Z',
        data: { category: { id: 'cat-a-1', name: 'Português' } },
      },
    ];
    const cloudCatsContestB = [
      { id: 'cat-b-1', name: 'Português', lastUpdated: '2026-11-19T11:00:00.000Z', tasks: [] },
    ];

    const mergedB = mergeContestCategoriesPure(
      [],
      cloudCatsContestB,
      true,
      localTrash,
      0,
      'contest-B'
    );

    expect(mergedB).toHaveLength(1);
    expect(mergedB[0].id).toBe('cat-b-1');
    expect(mergedB[0].name).toBe('Português');

    // Mas no mesmo concurso A continua bloqueando corretamente
    const mergedA = mergeContestCategoriesPure(
      [],
      [{ id: 'cat-a-1', name: 'Português', lastUpdated: '2026-11-19T11:00:00.000Z', tasks: [] }],
      true,
      localTrash,
      0,
      'contest-A'
    );
    expect(mergedA).toHaveLength(0);
  });

  it('6. cloudSyncMerge preserves cloud historicalCutoffs against untouched local [] but respects explicit clearing via historicalCutoffsUpdatedAt', () => {
    // Caso A: Dispositivo B só fez outra edição (historicalCutoffs continua [] default sem timestamp)
    const localUntouched = {
      version: 5,
      lastUpdated: '2026-11-19T12:05:00.000Z',
      activeId: 'default',
      contests: {
        default: sanitizeContest({
          contestName: 'ENEM',
          historicalCutoffs: [],
          lastUpdated: '2026-11-19T12:05:00.000Z',
        }),
      },
    };
    const cloudWithCutoffs = {
      version: 4,
      lastUpdated: '2026-11-19T12:00:00.000Z',
      activeId: 'default',
      contests: {
        default: sanitizeContest({
          contestName: 'ENEM',
          historicalCutoffs: [720, 750],
          historicalCutoffsUpdatedAt: '2026-11-19T12:00:00.000Z',
          lastUpdated: '2026-11-19T12:00:00.000Z',
        }),
      },
    };

    const mergedKeep = mergeAppStatePure(localUntouched, cloudWithCutoffs);
    expect(mergedKeep.contests.default.historicalCutoffs).toEqual([720, 750]);

    // Caso B: Dispositivo B limpou explicitamente via setHistoricalCutoffs([])
    const localExplicitClear = {
      ...localUntouched,
      contests: {
        default: sanitizeContest({
          contestName: 'ENEM',
          historicalCutoffs: [],
          historicalCutoffsUpdatedAt: '2026-11-19T12:10:00.000Z',
          lastUpdated: '2026-11-19T12:10:00.000Z',
        }),
      },
    };

    const mergedCleared = mergeAppStatePure(localExplicitClear, cloudWithCutoffs);
    expect(mergedCleared.contests.default.historicalCutoffs).toEqual([]);
  });

  it('7. mergeArraysPure preserves boolean false primitive values', () => {
    const merged = mergeArraysPure([true], [false]);
    expect(merged).toContain(true);
    expect(merged).toContain(false);
  });

  it('8. EvolutionChart uses resolved unit (pts) on non-0..100 scale across DisciplinaCard and charts when default unit="%" is passed', () => {
    const categories = [
      {
        id: 'mat',
        name: 'Matemática',
        color: '#3b82f6',
        tasks: [],
        simuladoStats: {
          history: [
            { id: 'h1', date: '2026-11-10', score: 750, total: 45, correct: 34 },
            { id: 'h2', date: '2026-11-15', score: 800, total: 45, correct: 36 },
          ],
          average: 775,
          lastAttempt: 800,
        },
      },
    ];

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EvolutionChart
          categories={categories}
          studyLogs={[]}
          targetScore={780}
          minScore={0}
          maxScore={1000}
          unit="%"
        />
      </MemoryRouter>
    );

    expect(html).toContain('pts');
    expect(html).not.toContain('800%');
    expect(html).not.toContain('750%');
  });

  it('9. StudyHistory ignores malformed simulado rows with total=0 and correct>0 instead of counting them as critical', () => {
    const { container } = render(
      <StudyHistory
        mode="performance"
        categories={[{ id: 'c1', name: 'Direito', tasks: [] }]}
        studySessions={[]}
        simuladoRows={[
          { id: 'r-bad', subject: 'Direito', topic: 'Tópico Malformado', total: 0, correct: 5, date: '2026-11-19' },
          { id: 'r-good', subject: 'Direito', topic: 'Atos Administrativos', total: 10, correct: 8, date: '2026-11-19' },
        ]}
      />
    );

    expect(container.textContent).toContain('Atos Administrativos');
    expect(container.textContent).not.toContain('Tópico Malformado');
  });

  it('11. AIGeneratedSimulado retrySameQuestions restores latestQuestionsRef so unmount persists retried draft', async () => {
    vi.useFakeTimers();
    useAppStore.getState().resetStore();
    useAppStore.setState((state) => ({
      appState: {
        ...state.appState,
        activeId: 'default',
        contests: {
          default: {
            ...state.appState.contests.default,
            categories: [{ id: 'cat-1', name: 'Direito', tasks: [{ id: 't-1', title: 'Atos', text: 'Atos' }] }],
          },
        },
      },
    }));

    const draftKey = 'ai_simulado_draft:default';
    localStorage.setItem(draftKey, JSON.stringify({
      version: 1,
      form: { categoryId: 'cat-1', taskId: 't-1', materia: 'Direito', assunto: 'Atos', dificuldade: 'medio', quantidade: 1 },
      questions: [
        {
          id: 'q-1',
          enunciado: 'Questão teste',
          alternativas: [
            { letra: 'A', texto: 'Alt A' },
            { letra: 'B', texto: 'Alt B' },
            { letra: 'C', texto: 'Alt C' },
            { letra: 'D', texto: 'Alt D' },
          ],
          alternativa_correta: 'A',
          explicacao: 'Explicação',
          categoryId: 'cat-1',
          taskId: 't-1',
          materia: 'Direito',
          assunto: 'Atos',
        },
      ],
      answers: { 'q-1': 'A' },
      currentIndex: 0,
      timeLeft: 120,
      timePerQuestion: { 'q-1': 60 },
      simStartMs: Date.now() - 60000,
      activeElapsedSecs: 60,
      savedAt: Date.now(),
    }));

    const { unmount } = render(<AIGeneratedSimulado />);

    // Aguarda restauração do rascunho (setTimeout 0)
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Finalizar o simulado via tecla Enter na última questão (ou botão Finalizar)
    const finishBtn = screen.getByRole('button', { name: /Finalizar/i });
    await act(async () => {
      fireEvent.click(finishBtn);
    });

    expect(localStorage.getItem(draftKey)).toBeNull();

    // Clicar em Refazer mesmas questões
    const retryBtn = screen.getByRole('button', { name: /Refazer/i });
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    // Desmontar imediatamente durante o simulado refeito — deve persistir o rascunho
    unmount();

    const persistedRaw = localStorage.getItem(draftKey);
    expect(persistedRaw).toBeTruthy();
    const persisted = JSON.parse(persistedRaw);
    expect(persisted.questions).toHaveLength(1);
    expect(persisted.questions[0].id).toBe('q-1');
  });

  it('10. deleteSimulado removes legacy DD/MM/YYYY history entries when deleting by ISO date', () => {
    useAppStore.getState().resetStore();
    useAppStore.setState((state) => ({
      appState: {
        ...state.appState,
        activeId: 'default',
        contests: {
          default: {
            ...state.appState.contests.default,
            simuladoRows: [],
            simulados: [],
            categories: [
              {
                id: 'cat-leg',
                name: 'História',
                tasks: [],
                simuladoStats: {
                  history: [
                    { id: 'leg-1', date: '19/11/2026', score: 80, total: 10, correct: 8 },
                    { id: 'leg-2', date: '18/11/2026', score: 70, total: 10, correct: 7 },
                  ],
                  average: 75,
                  lastAttempt: 80,
                },
              },
            ],
          },
        },
      },
    }));

    useAppStore.getState().deleteSimulado('2026-11-19');

    const updatedCat = useAppStore.getState().appState.contests.default.categories[0];
    expect(updatedCat.simuladoStats.history).toHaveLength(1);
    expect(updatedCat.simuladoStats.history[0].id).toBe('leg-2');
  });
});
