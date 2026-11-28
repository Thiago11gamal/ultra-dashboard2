// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import {
  mergeContestPayloadPure,
  mergeStudyNotesPure,
  safeguardContest,
  stateStringForSync,
} from '../cloudSyncMerge';
import { clearClientSessionKeys } from '../storageSafe';
import { secureLogout } from '../../services/firebase';
import { useAppStore } from '../../store/useAppStore';
import { createTrashSlice } from '../../store/slices/createTrashSlice';
import { _urgencyCache, cacheSet } from '../coachCaches';
import CommandPaletteModal from '../../components/CommandPaletteModal';
import { resolveReturnPath } from '../pomodoroHelpers';

function LocationProbe() {
  const loc = useLocation();
  return (
    <div
      data-testid="loc-probe"
      data-from={loc.state?.from || ''}
    >
      {`${loc.pathname}${loc.search}`}
    </div>
  );
}

describe('Menu & Data Integration Audit Fixes', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    _urgencyCache.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. Cloud Sync: studyNotes + deletedStudyNoteIds + fingerprint + safeguard', () => {
    it('merges offline local notes and cloud notes without overwriting and respects tombstones', () => {
      const localContest = {
        lastUpdated: '2026-11-28T12:00:00.000Z',
        categories: [],
        studyNotes: [
          {
            id: 'note-local-only',
            title: 'Controle Difuso',
            subject: 'Direito Constitucional',
            content: 'Resumo criado no dispositivo A',
            createdAt: '2026-11-28T11:50:00.000Z',
            updatedAt: '2026-11-28T11:50:00.000Z',
          },
          {
            id: 'note-shared',
            title: 'Atos Administrativos',
            subject: 'Direito Administrativo',
            content: 'Versão antiga local',
            createdAt: '2026-11-20T10:00:00.000Z',
            updatedAt: '2026-11-20T10:00:00.000Z',
          },
        ],
        deletedStudyNoteIds: [
          { id: 'note-deleted-locally', deletedAt: '2026-11-28T11:55:00.000Z' },
        ],
      };

      const cloudContest = {
        lastUpdated: '2026-11-28T11:30:00.000Z',
        categories: [],
        studyNotes: [
          {
            id: 'note-cloud-only',
            title: 'Licitações (Lei 14.133)',
            subject: 'Direito Administrativo',
            content: 'Resumo criado em outro dispositivo',
            createdAt: '2026-11-28T11:00:00.000Z',
            updatedAt: '2026-11-28T11:00:00.000Z',
          },
          {
            id: 'note-shared',
            title: 'Atos Administrativos',
            subject: 'Direito Administrativo',
            content: 'Versão editada mais recente na nuvem',
            createdAt: '2026-11-20T10:00:00.000Z',
            updatedAt: '2026-11-28T11:25:00.000Z',
          },
          {
            id: 'note-deleted-locally',
            title: 'Resumo Obsoleto',
            subject: 'Português',
            content: 'Não deve ressuscitar',
            createdAt: '2026-11-25T09:00:00.000Z',
            updatedAt: '2026-11-25T09:00:00.000Z',
          },
        ],
      };

      // preferCloudBase = false (local contest has newer lastUpdated)
      const merged = mergeContestPayloadPure(localContest, cloudContest, false, [], 'c1');

      expect(merged.studyNotes.map((n) => n.id)).toEqual([
        'note-local-only',
        'note-shared',
        'note-cloud-only',
      ]);
      expect(merged.studyNotes.find((n) => n.id === 'note-shared')?.content).toBe(
        'Versão editada mais recente na nuvem'
      );
      expect(merged.studyNotes.some((n) => n.id === 'note-deleted-locally')).toBe(false);
      expect(merged.deletedStudyNoteIds).toHaveLength(1);
      expect(merged.deletedStudyNoteIds[0].id).toBe('note-deleted-locally');
    });

    it('keeps a study_note restored from Trash alive even when cloud still holds an older tombstone', () => {
      const state = {
        appState: {
          activeId: 'c1',
          version: 1,
          trash: [],
          contests: {
            c1: {
              id: 'c1',
              studyNotes: [],
              deletedStudyNoteIds: [{ id: 'n-restore', deletedAt: '2026-10-01T10:00:00.000Z' }],
            },
          },
        },
      };
      const set = (updater) => updater(state);
      const trashSlice = createTrashSlice(set);

      trashSlice.archiveToTrash({
        id: 'tr-note-1',
        type: 'study_note',
        contestId: 'c1',
        data: {
          id: 'n-restore',
          title: 'Poderes Administrativos',
          subject: 'Direito Administrativo',
          content: 'Conteúdo importante',
          createdAt: '2026-09-15T10:00:00.000Z',
          updatedAt: '2026-09-15T10:00:00.000Z',
        },
      });

      trashSlice.restoreFromTrash('tr-note-1');

      const restoredContest = state.appState.contests.c1;
      expect(restoredContest.studyNotes).toHaveLength(1);

      const staleCloud = {
        studyNotes: [],
        deletedStudyNoteIds: [{ id: 'n-restore', deletedAt: '2026-10-01T10:00:00.000Z' }],
      };
      const syncedNotes = mergeStudyNotesPure(
        restoredContest.studyNotes,
        staleCloud.studyNotes,
        staleCloud.deletedStudyNoteIds,
        { preferCloudBase: true }
      );
      expect(syncedNotes).toHaveLength(1);
      expect(syncedNotes[0].id).toBe('n-restore');
    });

    it('tracks studyNotes, deletedStudyNoteIds and studySessions in stateStringForSync and caps >300 notes', () => {
      const baseState = {
        activeId: 'c1',
        version: 1,
        lastUpdated: '2026-11-28T10:00:00.000Z',
        contests: {
          c1: {
            contestName: 'TCU',
            categories: [],
            studyNotes: [{ id: 'n1', title: 'Resumo A', updatedAt: '2026-11-28T10:00:00.000Z' }],
            deletedStudyNoteIds: [],
            studySessions: [],
          },
        },
      };

      const fp1 = stateStringForSync(baseState);
      const fp2 = stateStringForSync({
        ...baseState,
        contests: {
          c1: {
            ...baseState.contests.c1,
            studyNotes: [
              { id: 'n1', title: 'Resumo A', updatedAt: '2026-11-28T10:05:00.000Z' },
              { id: 'n2', title: 'Resumo B', updatedAt: '2026-11-28T10:06:00.000Z' },
            ],
          },
        },
      });
      const fp3 = stateStringForSync({
        ...baseState,
        contests: {
          c1: {
            ...baseState.contests.c1,
            studySessions: [{ id: 's1', duration: 25 }],
          },
        },
      });

      expect(fp2).not.toBe(fp1);
      expect(fp3).not.toBe(fp1);

      const manyNotes = Array.from({ length: 310 }, (_, idx) => ({
        id: `n-${idx}`,
        title: `Nota ${idx}`,
        updatedAt: new Date(Date.UTC(2026, 0, 1, 0, idx)).toISOString(),
      }));
      const safe = safeguardContest({ categories: [], studyNotes: manyNotes });
      expect(safe.studyNotes).toHaveLength(300);
      expect(safe.studyNotes[0].id).toBe('n-309');
    });
  });

  describe('2. Category Slice: safelyMergeDuplicates migrates all cross-menu entities', () => {
    it('migrates studyNotes, flashcardDecks, agenda and active Pomodoro references to primary category', () => {
      const store = useAppStore.getState();
      store.setAppState({
        activeId: 'c1',
        version: 1,
        pomodoro: {
          isRunning: false,
          activeSubject: {
            categoryId: 'cat-dup',
            category: 'direito constitucional',
            taskId: 't2',
            task: 'Direitos Fundamentais',
          },
          neuralQueue: [{ id: 't2', categoryId: 'cat-dup', catId: 'cat-dup' }],
        },
        contests: {
          c1: {
            contestName: 'Audit Merge',
            categories: [
              {
                id: 'cat-primary',
                name: 'Direito Constitucional',
                tasks: [{ id: 't1', title: 'Poder Constituinte' }],
              },
              {
                id: 'cat-dup',
                name: 'direito constitucional',
                tasks: [{ id: 't2', title: 'Direitos Fundamentais' }],
              },
            ],
            studyNotes: [
              { id: 'note-1', categoryId: 'cat-dup', subject: 'direito constitucional', title: 'Art. 5º' },
            ],
            flashcardDecks: [
              { id: 'deck-1', categoryId: 'cat-dup', subject: 'direito constitucional', title: 'Remédios', cards: [] },
            ],
            agenda: [
              { id: 'ag-1', categoryId: 'cat-dup', subject: 'direito constitucional', date: '2026-11-28', title: 'Bloco' },
            ],
          },
        },
      });

      cacheSet(_urgencyCache, 80, 'stale-key', { urgencyScore: 50 });
      useAppStore.getState().safelyMergeDuplicates();

      const nextState = useAppStore.getState().appState;
      const c1 = nextState.contests.c1;

      expect(c1.categories).toHaveLength(1);
      expect(c1.categories[0].id).toBe('cat-primary');
      expect(c1.studyNotes[0].categoryId).toBe('cat-primary');
      expect(c1.studyNotes[0].subject).toBe('Direito Constitucional');
      expect(c1.flashcardDecks[0].categoryId).toBe('cat-primary');
      expect(c1.flashcardDecks[0].subject).toBe('Direito Constitucional');
      expect(c1.agenda[0].categoryId).toBe('cat-primary');
      expect(c1.agenda[0].subject).toBe('Direito Constitucional');
      expect(nextState.pomodoro.activeSubject.categoryId).toBe('cat-primary');
      expect(nextState.pomodoro.activeSubject.category).toBe('Direito Constitucional');
      expect(nextState.pomodoro.neuralQueue[0].categoryId).toBe('cat-primary');
      expect(_urgencyCache.size).toBe(0);
    });
  });

  describe('3. CommandPaletteModal -> Pomodoro return path preservation', () => {
    it('passes origin route in returnTo and navigation state when launching task from Ctrl+K', () => {
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
                  name: 'Direito Administrativo',
                  tasks: [{ id: 't-1', title: 'Poder de Polícia', priority: 'high', completed: false }],
                },
              ],
            },
          },
        },
      });

      const onClose = vi.fn();
      const { getByPlaceholderText, getByText, getByTestId } = render(
        <MemoryRouter initialEntries={['/evolution?engine=tornado_whatif']}>
          <CommandPaletteModal isOpen={true} onClose={onClose} />
          <Routes>
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      );

      const input = getByPlaceholderText(/Ir para menu/i);
      fireEvent.change(input, { target: { value: 'Poder de Polícia' } });
      fireEvent.click(getByText(/Direito Administrativo: Poder de Polícia/i).closest('button'));

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'cat-1',
          taskId: 't-1',
          source: 'command_palette',
          returnTo: '/evolution?engine=tornado_whatif',
        })
      );
      expect(getByTestId('loc-probe').textContent).toBe('/pomodoro');
      expect(getByTestId('loc-probe').getAttribute('data-from')).toBe('/evolution?engine=tornado_whatif');

      expect(resolveReturnPath('/evolution?engine=tornado_whatif')).toBe('/evolution?engine=tornado_whatif');
      expect(resolveReturnPath('/notes')).toBe('/notes');
      expect(resolveReturnPath('dashboard')).toBe('/');
      expect(resolveReturnPath('command_palette')).toBe('/pomodoro');
      expect(resolveReturnPath('/unknown_route')).toBe('/pomodoro');

      useAppStore.setState(prevState);
    });
  });

  describe('4. Unified Session Cleanup on Logout', () => {
    it('clears pomodoro_study_mode_v1, evolution_ui_prefs_v1:* and route restoration keys', async () => {
      localStorage.setItem('pomodoro_study_mode_v1', 'questoes');
      localStorage.setItem('ai_simulado_draft:c1', '{}');
      localStorage.setItem('lastRoute_u1', '/notes');
      localStorage.setItem('quarantine:bad:123', 'corrupt');
      sessionStorage.setItem('evolution_ui_prefs_v1:c1', '{"activeEngine":"compare"}');
      sessionStorage.setItem('hasRestoredInitialRoute_u1', 'true');
      sessionStorage.setItem('navigateToDashboard', 'true');

      clearClientSessionKeys();

      expect(localStorage.getItem('pomodoro_study_mode_v1')).toBeNull();
      expect(localStorage.getItem('ai_simulado_draft:c1')).toBeNull();
      expect(localStorage.getItem('lastRoute_u1')).toBeNull();
      expect(localStorage.getItem('quarantine:bad:123')).toBeNull();
      expect(sessionStorage.getItem('evolution_ui_prefs_v1:c1')).toBeNull();
      expect(sessionStorage.getItem('hasRestoredInitialRoute_u1')).toBeNull();
      expect(sessionStorage.getItem('navigateToDashboard')).toBeNull();

      // Verify secureLogout also delegates cleanly
      sessionStorage.setItem('evolution_ui_prefs_v1:c2', '{"activeEngine":"raw"}');
      localStorage.setItem('pomodoro_study_mode_v1', 'revisao');
      const res = await secureLogout();
      expect(res.ok).toBe(true);
      expect(sessionStorage.getItem('evolution_ui_prefs_v1:c2')).toBeNull();
      expect(localStorage.getItem('pomodoro_study_mode_v1')).toBeNull();
    });
  });
});
