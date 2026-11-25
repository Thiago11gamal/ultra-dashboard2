// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { resolveCanonicalNextMission } from '../canonicalNextMission';
import { getBestTask } from '../coach/coachHistory';
import { getDateKey } from '../dateHelper';
import { evaluateContestMaturity } from '../../engine/adaptive/adaptiveMaturityEngine';
import { createTrashSlice } from '../../store/slices/createTrashSlice';
import { createStudySlice } from '../../store/slices/createStudySlice';
import { AdaptivePulseStrip } from '../../components/dashboard/AdaptivePulseStrip';
import CommandPaletteModal from '../../components/CommandPaletteModal';
import { useAppStore } from '../../store/useAppStore';

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc-probe">{`${loc.pathname}${loc.search}`}</div>;
}

describe('Cross-Menu Architectural & UX Improvements (2026)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. Canonical Next Mission & getBestTask 2-arg overload', () => {
    const fixedNow = new Date('2026-05-06T14:00:00Z'); // Wednesday ('wed'), 2026-05-06
    const baseCategories = [
      {
        id: 'cat-const',
        name: 'Direito Constitucional',
        color: '#6366f1',
        weight: 25,
        tasks: [
          { id: 't-const-1', title: 'Controle de Constitucionalidade', priority: 'high', completed: false },
          { id: 't-const-2', title: 'Poder Legislativo', priority: 'low', completed: false },
        ],
      },
      {
        id: 'cat-adm',
        name: 'Direito Administrativo',
        color: '#10b981',
        weight: 20,
        tasks: [
          { id: 't-adm-1', title: 'Atos Administrativos', priority: 'medium', completed: false },
          { id: 't-adm-2', title: 'Licitações e Contratos', priority: 'high', completed: false },
        ],
      },
    ];

    it('supports getBestTask(categories, optionsObject) without coercing options to excludeTaskId', () => {
      const best = getBestTask(baseCategories, { contestId: 'c1', studyLogs: [], now: fixedNow });
      expect(best).toBeTruthy();
      expect(['t-const-1', 't-adm-2']).toContain(best.id);
    });

    it('prioritizes studying > coachPlanner today > agenda today > predictive Coach', () => {
      // Case A: Predictive Coach fallback
      const m4 = resolveCanonicalNextMission({
        categories: baseCategories,
        now: fixedNow,
      });
      expect(m4).toBeTruthy();
      expect(['coach_plan', 'suggested_focus', 'best_task']).toContain(m4.sourceType);

      // Case B: Today's Agenda block overrides general Coach suggestion
      const m3 = resolveCanonicalNextMission({
        categories: baseCategories,
        agenda: [
          {
            id: 'ag-1',
            date: '2026-05-06',
            time: '09:00',
            subject: 'Direito Administrativo',
            categoryId: 'cat-adm',
            title: 'Atos Administrativos',
            completed: false,
          },
        ],
        now: fixedNow,
      });
      expect(m3.sourceType).toBe('agenda_today');
      expect(m3.task.id).toBe('t-adm-1');
      expect(m3.sourceBadge).toContain('Agenda 09:00');

      // Case C: Today's Coach Weekly Kanban ('wed') overrides Agenda
      const m2 = resolveCanonicalNextMission({
        categories: baseCategories,
        agenda: [
          {
            id: 'ag-1',
            date: '2026-05-06',
            time: '09:00',
            subject: 'Direito Administrativo',
            title: 'Atos Administrativos',
            completed: false,
          },
        ],
        coachPlanner: {
          wed: [
            {
              id: 'cp-1',
              categoryId: 'cat-const',
              category: 'Direito Constitucional',
              title: 'Poder Legislativo',
              completed: false,
            },
          ],
        },
        now: fixedNow,
      });
      expect(m2.sourceType).toBe('coach_planner_today');
      expect(m2.task.id).toBe('t-const-2');

      // Case D: Active 'studying' task has top priority
      const catsWithStudying = [
        baseCategories[0],
        {
          ...baseCategories[1],
          tasks: [
            { id: 't-adm-1', title: 'Atos Administrativos', priority: 'medium', status: 'studying', completed: false },
          ],
        },
      ];
      const m1 = resolveCanonicalNextMission({
        categories: catsWithStudying,
        coachPlanner: {
          wed: [{ id: 'cp-1', categoryId: 'cat-const', title: 'Poder Legislativo', completed: false }],
        },
        now: fixedNow,
      });
      expect(m1.sourceType).toBe('studying');
      expect(m1.task.id).toBe('t-adm-1');
    });
  });

  describe('2. Adaptive Maturity Engine unlocks sub-flags across N1–N5', () => {
    it('unlocks granular Kalman, Bayesian, FSRS, GARCH, Knowledge Graph and Causal flags', () => {
      const richHistory = Array.from({ length: 26 }, (_, i) => ({
        date: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
        score: 65 + (i % 15),
      }));
      const richLogs = Array.from({ length: 20 }, (_, i) => ({
        date: `2026-04-${String((i % 20) + 1).padStart(2, '0')}T12:00:00Z`,
        minutes: 45,
      }));
      const richAudits = Array.from({ length: 9 }, (_, i) => ({ id: `aud-${i}`, avgBrier: 0.12 }));

      const n5 = evaluateContestMaturity({
        categories: [
          { id: 'c1', simuladoStats: { history: richHistory.slice(0, 13) } },
          { id: 'c2', simuladoStats: { history: richHistory.slice(13) } },
        ],
        studyLogs: richLogs,
        calibrationAuditLog: richAudits,
      });

      expect(n5.stage).toBe(5);
      expect(n5.unlockedFlags.useStateSpaceAverage).toBe(true);
      expect(n5.unlockedFlags.useStateSpaceTrend).toBe(true);
      expect(n5.unlockedFlags.useBayesianTopicsForUrgency).toBe(true);
      expect(n5.unlockedFlags.useFsrsTopicScheduling).toBe(true);
      expect(n5.unlockedFlags.useGarchVolatility).toBe(true);
      expect(n5.unlockedFlags.useDriftAlerts).toBe(true);
      expect(n5.unlockedFlags.useKnowledgeGraphForTopics).toBe(true);
      expect(n5.unlockedFlags.useCausalTaskSelection).toBe(true);
      expect(n5.unlockedFlags.useOrchestratorHealth).toBe(true);
    });
  });

  describe('3. Unified Trash Slice (archive & restore all entity types)', () => {
    it('archives and restores task, flashcard_deck, agenda_event, simulado and study_note', () => {
      const state = {
        appState: {
          activeId: 'c1',
          version: 1,
          trash: [],
          contests: {
            c1: {
              id: 'c1',
              maxScore: 100,
              minScore: 0,
              categories: [{ id: 'cat-1', name: 'Português', tasks: [], deletedTaskIds: [{ id: 't-del', text: 'crase' }] }],
              flashcardDecks: [],
              deletedFlashcardDeckIds: [{ id: 'd-1' }],
              agenda: [],
              deletedAgendaIds: [{ id: 'ev-1' }],
              simuladoRows: [],
              simulados: [],
              studyNotes: [],
              deletedStudyNoteIds: [{ id: 'n-1' }],
            },
          },
        },
      };

      const set = (updater) => updater(state);
      const slice = createTrashSlice(set);

      slice.archiveToTrash({
        id: 'tr-task',
        type: 'task',
        contestId: 'c1',
        data: { categoryId: 'cat-1', categoryName: 'Português', task: { id: 't-del', title: 'Crase', completed: false } },
      });
      slice.archiveToTrash({
        id: 'tr-deck',
        type: 'flashcard_deck',
        contestId: 'c1',
        data: { id: 'd-1', title: 'Baralho Crase', categoryId: 'cat-1', cards: [{ id: 'fc1', front: 'A', back: 'B' }] },
      });
      slice.archiveToTrash({
        id: 'tr-agenda',
        type: 'agenda_event',
        contestId: 'c1',
        data: { id: 'ev-1', title: 'Revisar Crase', date: '2026-05-06', subject: 'Português' },
      });
      slice.archiveToTrash({
        id: 'tr-sim',
        type: 'simulado',
        contestId: 'c1',
        data: {
          rows: [{ id: 'r-1', date: '2026-05-01', categoryId: 'cat-1', subject: 'Português', score: 80, total: 10, correct: 8 }],
          simulados: [{ id: 's-1', date: '2026-05-01', score: 80 }],
        },
      });
      slice.archiveToTrash({
        id: 'tr-note',
        type: 'study_note',
        contestId: 'c1',
        data: { id: 'n-1', title: 'Resumo de Crase', content: 'Casos proibidos', subject: 'Português' },
      });

      expect(state.appState.trash).toHaveLength(5);

      slice.restoreFromTrash('tr-task');
      slice.restoreFromTrash('tr-deck');
      slice.restoreFromTrash('tr-agenda');
      slice.restoreFromTrash('tr-sim');
      slice.restoreFromTrash('tr-note');

      expect(state.appState.trash).toHaveLength(0);
      const c1 = state.appState.contests.c1;
      expect(c1.categories[0].tasks.some((t) => t.id === 't-del')).toBe(true);
      expect(c1.flashcardDecks.some((d) => d.id === 'd-1')).toBe(true);
      expect(c1.agenda.some((e) => e.id === 'ev-1')).toBe(true);
      expect(c1.simuladoRows.some((r) => r.id === 'r-1')).toBe(true);
      expect(c1.studyNotes.some((n) => n.id === 'n-1')).toBe(true);
    });
  });

  describe('4. Study Slice: Flashcard category linkage & Agenda auto-completion', () => {
    it('resolves categoryId via deck linkage / fuzzy match and auto-completes today agenda block on study log', () => {
      const todayIso = getDateKey(new Date());
      const state = {
        appState: {
          activeId: 'c1',
          version: 1,
          contests: {
            c1: {
              id: 'c1',
              categories: [
                { id: 'cat-dir', name: 'Direito Constitucional', totalMinutes: 0, tasks: [] },
              ],
              flashcardDecks: [
                { id: 'deck-1', title: 'CF/88', categoryId: 'cat-dir', subject: 'Constitucional', cards: [] },
              ],
              studyLogs: [],
              studySessions: [],
              agenda: [
                { id: 'ag-today', date: todayIso, time: '10:00', subject: 'Direito Constitucional', title: 'Bloco CF', completed: false },
              ],
            },
          },
        },
        pomodoroState: { sessionMeta: null },
      };

      const set = (updater) => updater(state);
      const get = () => state;
      const studySlice = createStudySlice(set, get);

      studySlice.logFlashcardReview('deck-1', 'card-1', 3, 'Constitucional', 0.5, null);
      expect(state.appState.contests.c1.studyLogs[0].categoryId).toBe('cat-dir');

      studySlice.logFlashcardReview({ deckId: 'deck-1', subject: 'Constitucional', quality: 4, durationSeconds: 20 });
      expect(state.appState.contests.c1.studyLogs[1].categoryId).toBe('cat-dir');

      studySlice.handleUpdateStudyTime('cat-dir', 25, null, 'pomodoro', { studyMode: 'teoria' });
      expect(state.appState.contests.c1.agenda[0].completed).toBe(true);
      expect(state.appState.contests.c1.agenda[0].autoCompletedBySession).toBe(true);
    });
  });

  describe('5. Navigation & Global Command Palette (Ctrl+K)', () => {
    it('navigates ACWR chip in AdaptivePulseStrip to /heatmap instead of broken /activity', () => {
      const recentIso = new Date().toISOString();
      const { getByText, getByTestId } = render(
        <MemoryRouter initialEntries={['/']}>
          <AdaptivePulseStrip
            categories={[]}
            studyLogs={[{ id: 'l1', date: recentIso, minutes: 50 }]}
            flashcardDecks={[]}
          />
          <Routes>
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      );

      const acwrBtn = getByText(/ACWR/i).closest('button');
      expect(acwrBtn).toBeTruthy();
      fireEvent.click(acwrBtn);
      expect(getByTestId('loc-probe').textContent).toBe('/heatmap');
    });

    it('filters evolution engines and syllabus tasks in CommandPaletteModal', () => {
      const startSpy = vi.fn();
      const prevState = useAppStore.getState();
      useAppStore.setState({
        ...prevState,
        startPomodoroSession: startSpy,
        appState: {
          ...(prevState.appState || {}),
          activeId: 'c-cmd',
          contests: {
            'c-cmd': {
              id: 'c-cmd',
              categories: [
                {
                  id: 'cat-1',
                  name: 'Direito Penal',
                  tasks: [{ id: 'tp-1', title: 'Teoria do Crime', priority: 'high', completed: false }],
                },
              ],
            },
          },
        },
      });

      const onClose = vi.fn();
      const { getByPlaceholderText, getByText, getByTestId } = render(
        <MemoryRouter initialEntries={['/']}>
          <CommandPaletteModal isOpen={true} onClose={onClose} />
          <Routes>
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      );

      const input = getByPlaceholderText(/Ir para menu/i);
      fireEvent.change(input, { target: { value: 'Teoria do Crime' } });

      const taskOption = getByText(/Direito Penal: Teoria do Crime/i).closest('button');
      expect(taskOption).toBeTruthy();
      fireEvent.click(taskOption);

      expect(onClose).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'cat-1',
          taskId: 'tp-1',
          source: 'command_palette',
        })
      );
      expect(getByTestId('loc-probe').textContent).toBe('/pomodoro');

      useAppStore.setState(prevState);
    });
  });
});
