import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { createPomodoroSlice } from '../../store/slices/createPomodoroSlice.js';
import { createTaskSlice } from '../../store/slices/createTaskSlice.js';
import { createStudySlice } from '../../store/slices/createStudySlice.js';
import { createCategorySlice } from '../../store/slices/createCategorySlice.js';
import { createTrashSlice } from '../../store/slices/createTrashSlice.js';
import { createContestSlice } from '../../store/slices/createContestSlice.js';
import { isSubjectAlreadyActiveInPomodoro } from '../pomodoroHelpers.js';
import { resolveCanonicalNextMission } from '../canonicalNextMission.js';
import { resolveUserTargetScorePoints } from '../scoreHelper.js';
import TopicPerformance from '../../components/TopicPerformance.jsx';
import AdaptivePulseStrip from '../../components/dashboard/AdaptivePulseStrip.jsx';

function LocationProbe() {
  const loc = useLocation();
  return (
    <div data-testid="loc-probe" data-state={JSON.stringify(loc.state || null)}>
      {loc.pathname}
      {loc.search}
    </div>
  );
}

describe('Cross-Menu Integration Fixes', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('1. isSubjectAlreadyActiveInPomodoro detects active task and agenda block without resetting timer', () => {
    const pomodoro = {
      isRunning: true,
      completedCycles: 1,
      accumulatedMinutes: 25,
      activeSubject: {
        categoryId: 'cat-1',
        category: 'Direito Constitucional',
        taskId: 't-1',
        task: 'Controle de Constitucionalidade',
        agendaEventId: 'ev-99',
        sessionInstanceId: '1700000001',
      },
    };

    expect(
      isSubjectAlreadyActiveInPomodoro(
        pomodoro,
        { categoryId: 'cat-1', taskId: 't-1', category: 'Direito Constitucional', task: 'Controle de Constitucionalidade' },
        { id: 'cat-1', name: 'Direito Constitucional' },
        { id: 't-1', title: 'Controle de Constitucionalidade' }
      )
    ).toBe(true);

    expect(
      isSubjectAlreadyActiveInPomodoro(pomodoro, {
        categoryId: 'cat-1',
        taskId: 'agenda_block_ev-99',
        agendaEventId: 'ev-99',
      })
    ).toBe(true);

    expect(
      isSubjectAlreadyActiveInPomodoro(pomodoro, {
        categoryId: 'cat-1',
        taskId: 't-2',
        category: 'Direito Constitucional',
        task: 'Direitos Fundamentais',
      })
    ).toBe(false);
  });

  it('2. Neural Queue skips tasks completed or deleted in /tasks instead of advancing to stale items', () => {
    const state = {
      appState: {
        activeId: 'c1',
        version: 1,
        pomodoro: {
          activeSubject: null,
          neuralQueue: [],
          neuralMode: false,
          isRunning: false,
          mode: 'work',
          targetCycles: 1,
          sessions: 1,
          completedCycles: 0,
          accumulatedMinutes: 0,
        },
        contests: {
          c1: {
            id: 'c1',
            categories: [
              {
                id: 'cat-1',
                name: 'Português',
                tasks: [
                  { id: 't1', title: 'Crase', completed: false },
                  { id: 't2', title: 'Regência', completed: false },
                  { id: 't3', title: 'Concordância', completed: false },
                ],
              },
            ],
          },
        },
      },
    };

    const set = (fn) => fn(state);
    const get = () => state;
    const pomoSlice = createPomodoroSlice(set, get);
    const taskSlice = createTaskSlice(set, get);

    pomoSlice.startNeuralSession([
      { id: 't1', title: 'Crase', catName: 'Português', categoryId: 'cat-1' },
      { id: 't2', title: 'Regência', catName: 'Português', categoryId: 'cat-1' },
      { id: 't3', title: 'Concordância', catName: 'Português', categoryId: 'cat-1' },
    ]);
    expect(state.appState.pomodoro.activeSubject.taskId).toBe('t1');

    // User completes t2 in /tasks while t1 is running in /pomodoro
    taskSlice.toggleTask('cat-1', 't2');

    // Advancing neural queue must skip t2 and land on t3
    const hasNext = pomoSlice.advanceNeuralQueue();
    expect(hasNext).toBe(true);
    expect(state.appState.pomodoro.activeSubject.taskId).toBe('t3');
  });

  it('3. StudySlice links exact agendaEventId (including past/future dates) and reverts Agenda block on deleteSession', () => {
    const state = {
      appState: {
        activeId: 'c1',
        version: 1,
        contests: {
          c1: {
            id: 'c1',
            user: { xp: 0, level: 1 },
            categories: [{ id: 'cat-dir', name: 'Direito Administrativo', totalMinutes: 0, tasks: [] }],
            studyLogs: [],
            studySessions: [],
            agenda: [
              { id: 'ev-morning', date: '2026-05-01', time: '09:00', categoryId: 'cat-dir', subject: 'Direito Administrativo', title: 'Bloco 1', completed: false },
              { id: 'ev-evening', date: '2026-05-01', time: '19:00', categoryId: 'cat-dir', subject: 'Direito Administrativo', title: 'Bloco 2', completed: false },
            ],
          },
        },
      },
    };

    const set = (fn) => fn(state);
    const get = () => state;
    const studySlice = createStudySlice(set, get);

    studySlice.handleUpdateStudyTime('cat-dir', 30, 'agenda_block_ev-evening', 'Bloco 2', {
      agendaEventId: 'ev-evening',
      studyMode: 'revisao',
    });

    const agenda = state.appState.contests.c1.agenda;
    expect(agenda[0].completed).toBe(false);
    expect(agenda[1].completed).toBe(true);
    expect(agenda[1].autoCompletedBySession).toBe(true);

    const createdSessionId = state.appState.contests.c1.studySessions[0].id;
    studySlice.deleteSession(createdSessionId);

    expect(state.appState.contests.c1.agenda[1].completed).toBe(false);
    expect(state.appState.contests.c1.agenda[1].autoCompletedBySession).toBeUndefined();
  });

  it('4. canonicalNextMission preserves generic autoGenerated Agenda block without hijacking unrelated syllabus task', () => {
    const mission = resolveCanonicalNextMission({
      now: '2026-06-10T12:00:00Z',
      categories: [
        {
          id: 'cat-const',
          name: 'Direito Constitucional',
          tasks: [{ id: 'syl-1', title: 'Poder Constituinte', completed: false, priority: 'high' }],
        },
      ],
      agenda: [
        {
          id: 'ag-fsrs',
          date: '2026-06-10',
          time: '08:00',
          subject: 'Direito Constitucional',
          categoryId: 'cat-const',
          title: 'Direito Constitucional — Revisão FSRS Urgente',
          autoGenerated: true,
          completed: false,
        },
      ],
    });

    expect(mission).toBeTruthy();
    expect(mission.sourceType).toBe('agenda_today');
    expect(mission.task.agendaEventId).toBe('ag-fsrs');
    expect(mission.task.isAgendaOnlyBlock).toBe(true);
    expect(mission.task.title).toContain('Revisão FSRS Urgente');
  });

  it('5. Category rename updates studyNotes & neuralQueue, and deleteCategory/restoreFromTrash round-trips notes, decks, agenda & XP', () => {
    let xpDeltaTotal = 0;
    const state = {
      awardExperience: (amt) => {
        xpDeltaTotal += amt;
      },
      appState: {
        activeId: 'c1',
        version: 1,
        trash: [],
        pomodoro: {
          activeSubject: null,
          neuralQueue: [{ id: 't1', title: 'Atos', catName: 'Adm', categoryId: 'cat-adm' }],
        },
        contests: {
          c1: {
            id: 'c1',
            contestName: 'PF',
            categories: [
              {
                id: 'cat-adm',
                name: 'Adm',
                tasks: [{ id: 't1', title: 'Atos', completed: true, awardedXP: 40 }],
              },
            ],
            studyNotes: [{ id: 'n1', title: 'Atributos', subject: 'Adm', content: 'PAI / PATI' }],
            flashcardDecks: [{ id: 'd1', name: 'Deck Adm', categoryId: 'cat-adm', subject: 'Adm', cards: [] }],
            agenda: [{ id: 'ev1', date: '2026-06-10', categoryId: 'cat-adm', subject: 'Adm', title: 'Revisar Atos' }],
            studyLogs: [],
            studySessions: [{ id: 's1', categoryId: 'cat-adm', subject: 'Adm', duration: 25, awardedXP: 30 }],
            simuladoRows: [],
            simulados: [],
          },
        },
      },
    };

    const set = (fn) => fn(state);
    const get = () => state;
    const catSlice = createCategorySlice(set, get);
    const trashSlice = createTrashSlice(set, get);

    catSlice.updateCategoryFields('cat-adm', { name: 'Direito Administrativo' });
    expect(state.appState.contests.c1.studyNotes[0].subject).toBe('Direito Administrativo');
    expect(state.appState.pomodoro.neuralQueue[0].catName).toBe('Direito Administrativo');

    catSlice.deleteCategory('cat-adm');
    expect(state.appState.contests.c1.studyNotes).toHaveLength(0);
    expect(state.appState.contests.c1.flashcardDecks).toHaveLength(0);
    expect(state.appState.contests.c1.agenda).toHaveLength(0);
    expect(xpDeltaTotal).toBe(-70);

    const trashId = state.appState.trash[0].id;
    trashSlice.restoreFromTrash(trashId);
    expect(state.appState.contests.c1.studyNotes).toHaveLength(1);
    expect(state.appState.contests.c1.flashcardDecks).toHaveLength(1);
    expect(state.appState.contests.c1.agenda).toHaveLength(1);
    expect(xpDeltaTotal).toBe(0);
  });

  it('6. TrashSlice isolates items from deleted contests instead of polluting active contest, and resets Pomodoro on contest restore', () => {
    const state = {
      appState: {
        activeId: 'contest-A',
        version: 1,
        deletedContestIds: [{ contestId: 'contest-B', deletedAt: '2026-06-01T00:00:00Z' }],
        pomodoro: {
          activeSubject: { categoryId: 'cat-a', taskId: 'ta', task: 'Foco A' },
          isRunning: true,
          accumulatedMinutes: 15,
          targetCycles: 2,
        },
        trash: [
          {
            id: 'tr-foreign-task',
            type: 'task',
            contestId: 'contest-B',
            contestName: 'Receita Federal',
            data: {
              categoryId: 'cat-trib',
              categoryName: 'Direito Tributário',
              task: { id: 't-trib', title: 'ICMS', completed: false },
            },
          },
          {
            id: 'tr-contest-c',
            type: 'contest',
            contestId: 'contest-C',
            data: { id: 'contest-C', contestName: 'TCU', categories: [] },
          },
        ],
        contests: {
          'contest-A': {
            id: 'contest-A',
            contestName: 'INSS',
            categories: [{ id: 'cat-prev', name: 'Previdenciário', tasks: [] }],
          },
        },
      },
    };

    const set = (fn) => fn(state);
    const get = () => state;
    const trashSlice = createTrashSlice(set, get);
    const contestSlice = createContestSlice(set);

    // Restoring foreign task recreates contest-B rather than injecting into contest-A's Previdenciário
    trashSlice.restoreFromTrash('tr-foreign-task');
    expect(state.appState.contests['contest-A'].categories[0].tasks).toHaveLength(0);
    expect(state.appState.contests['contest-B']).toBeTruthy();
    expect(state.appState.contests['contest-B'].categories[0].name).toBe('Direito Tributário');
    expect(state.appState.contests['contest-B'].categories[0].tasks[0].id).toBe('t-trib');

    // Restoring contest-C switches activeId and resets running Pomodoro
    trashSlice.restoreFromTrash('tr-contest-c');
    expect(state.appState.activeId).toBe('contest-C');
    expect(state.appState.pomodoro.activeSubject).toBeNull();
    expect(state.appState.pomodoro.isRunning).toBe(false);

    // renameContest syncs contestName, name, and user.name
    contestSlice.renameContest('contest-C', 'TCU Auditor 2026');
    expect(state.appState.contests['contest-C'].contestName).toBe('TCU Auditor 2026');
    expect(state.appState.contests['contest-C'].user.name).toBe('TCU Auditor 2026');
  });

  it('7. TopicPerformance wires onCreateFlashcard and AdaptivePulseStrip deep-links Tornado & FSRS autoStartReview', () => {
    const onCreateFlashcard = vi.fn();
    const { getByTitle } = render(
      <TopicPerformance
        categories={[
          {
            id: 'c1',
            name: 'Penal',
            simuladoStats: {
              history: [{ id: 'h1', date: '2026-05-01', score: 40, total: 10, correct: 4, topics: [{ name: 'Tipicidade', total: 10, correct: 4, score: 40 }] }],
            },
          },
        ]}
        onCreateFlashcard={onCreateFlashcard}
      />
    );

    const fcBtn = getByTitle(/Criar Flashcard FSRS/i);
    fireEvent.click(fcBtn);
    expect(onCreateFlashcard).toHaveBeenCalledWith('Penal', 'Tipicidade');

    const pastDue = '2020-01-01';
    const { getByText, getByTestId } = render(
      <MemoryRouter initialEntries={['/']}>
        <AdaptivePulseStrip
          categories={[
            {
              id: 'cat-dir',
              name: 'Direito',
              weight: 30,
              simuladoStats: { history: [{ date: '2026-05-01', score: 50, total: 20, correct: 10 }] },
            },
            {
              id: 'cat-port',
              name: 'Português',
              weight: 10,
              simuladoStats: { history: [{ date: '2026-05-01', score: 85, total: 20, correct: 17 }] },
            },
          ]}
          studyLogs={[]}
          flashcardDecks={[{ id: 'd1', name: 'CF', cards: [{ id: 'c1', front: 'Q', back: 'A', due: pastDue }] }]}
        />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    const tornadoBtn = getByText(/Alavanca #1/i).closest('button');
    fireEvent.click(tornadoBtn);
    expect(getByTestId('loc-probe').textContent).toContain('/evolution?engine=tornado_whatif');

    const fsrsBtn = getByText(/flashcard.*FSRS hoje/i).closest('button');
    fireEvent.click(fsrsBtn);
    expect(getByTestId('loc-probe').textContent).toBe('/flashcards');
    expect(JSON.parse(getByTestId('loc-probe').getAttribute('data-state'))).toEqual({ autoStartReview: true });

    expect(resolveUserTargetScorePoints({}, 0, 100)).toBe(80);
    expect(resolveUserTargetScorePoints({ targetScore: 75 }, 200, 1000)).toBe(800);
  });
});
