import { describe, it, expect, beforeEach } from 'vitest';
import { validateAppState } from '../../store/schemas.js';
import {
  getExplicitDeletedContestMap,
  hasAutoTrashedContests,
  hasMissingCloudContests,
  mergeAppStatePure,
  stateStringForSync,
} from '../../hooks/useCloudSync.js';
import { parseImportedData } from '../backupManager.js';
import { useAppStore } from '../../store/useAppStore.js';

describe('Contest Visibility, Cloud Sync Rescue & Backup Integrity Fixes', () => {
  describe('validateAppState (schemas.js)', () => {
    it('auto-rescues contests moved to trash by legacy cloud-sync auto-trash', () => {
      const rawState = {
        activeId: 'default',
        contests: {
          default: {
            contestName: 'Painel Principal',
            categories: [{ id: 'cat-1', name: 'Português', tasks: [] }],
          },
        },
        trash: [
          {
            id: 'sync-trash-contest-pf-1700000000',
            type: 'contest',
            contestId: 'contest-pf',
            reason: 'cloud-sync',
            deletedAt: new Date().toISOString(),
            data: {
              contestName: 'Polícia Federal',
              categories: [{ id: 'cat-dir', name: 'Direito Administrativo', tasks: [] }],
            },
          },
        ],
      };

      const validated = validateAppState(rawState);
      expect(Object.keys(validated.contests)).toContain('contest-pf');
      expect(validated.contests['contest-pf'].contestName).toBe('Polícia Federal');
      expect(validated.trash.some((t) => t.contestId === 'contest-pf')).toBe(false);
    });

    it('does NOT resurrect contests explicitly deleted by the user', () => {
      const nowIso = new Date().toISOString();
      const rawState = {
        activeId: 'default',
        contests: {
          default: { contestName: 'Principal', categories: [] },
        },
        deletedContestIds: [{ contestId: 'contest-deleted', deletedAt: nowIso }],
        trash: [
          {
            id: 'trash-123',
            type: 'contest',
            contestId: 'contest-deleted',
            reason: 'user-delete',
            deletedAt: nowIso,
            data: { contestName: 'Concurso Excluído', categories: [] },
          },
        ],
      };

      const validated = validateAppState(rawState);
      expect(validated.contests['contest-deleted']).toBeUndefined();
      expect(validated.deletedContestIds.some((d) => d.contestId === 'contest-deleted')).toBe(true);
    });

    it('preserves contest.name when contestName is omitted instead of falling back to Estudante', () => {
      const validated = validateAppState({
        activeId: 'c1',
        contests: {
          c1: {
            name: 'Receita Federal 2026',
            user: { name: 'Estudante' },
            categories: [],
          },
        },
      });
      expect(validated.contests.c1.contestName).toBe('Receita Federal 2026');
    });
  });

  describe('useCloudSync pure helpers & mergeAppStatePure', () => {
    it('detects missing cloud subcollection contests even when localVersion > cloudVersion', () => {
      const localState = {
        activeId: 'default',
        version: 42,
        lastUpdated: '2026-10-29T01:00:00.000Z',
        contests: {
          default: { contestName: 'Painel Base', lastUpdated: '2026-10-29T01:00:00.000Z', categories: [] },
        },
        trash: [],
        deletedContestIds: [],
      };

      const cloudData = {
        activeId: 'default',
        version: 38,
        lastUpdated: '2026-10-28T20:00:00.000Z',
        contests: {
          default: { contestName: 'Painel Base', lastUpdated: '2026-10-28T20:00:00.000Z', categories: [] },
          'contest-tcu': { contestName: 'TCU Auditor', lastUpdated: '2026-10-28T19:00:00.000Z', categories: [] },
          'contest-sefaz': { contestName: 'SEFAZ', lastUpdated: '2026-10-28T18:00:00.000Z', categories: [] },
        },
      };

      expect(hasMissingCloudContests(localState, cloudData)).toBe(true);

      const merged = mergeAppStatePure(localState, cloudData, {
        nonDestructive: true,
        preserveLocalBase: true,
      });

      expect(Object.keys(merged.contests)).toEqual(
        expect.arrayContaining(['default', 'contest-tcu', 'contest-sefaz'])
      );
      expect(merged.activeId).toBe('default');
      expect(merged.version).toBe(43);
    });

    it('never auto-trashes local contests missing from cloud purely due to global timestamp difference', () => {
      const localState = {
        activeId: 'contest-local-new',
        version: 10,
        lastUpdated: '2026-10-28T10:00:00.000Z',
        contests: {
          default: { contestName: 'Base', lastUpdated: '2026-10-28T09:00:00.000Z', categories: [] },
          'contest-local-new': {
            contestName: 'Petrobras',
            lastUpdated: '2026-10-28T10:00:00.000Z',
            categories: [{ id: 'cat-1', name: 'Engenharia', tasks: [] }],
          },
        },
        trash: [],
        deletedContestIds: [],
      };

      const cloudData = {
        activeId: 'default',
        version: 12,
        lastUpdated: '2026-10-29T00:00:00.000Z', // 14h newer than local
        contests: {
          default: { contestName: 'Base', lastUpdated: '2026-10-29T00:00:00.000Z', categories: [] },
        },
        trash: [],
        deletedContestIds: [],
      };

      const merged = mergeAppStatePure(localState, cloudData, { nonDestructive: false });
      expect(merged.contests['contest-local-new']).toBeDefined();
      expect(merged.contests['contest-local-new'].contestName).toBe('Petrobras');
      expect(merged.trash.some((t) => t.reason === 'cloud-sync')).toBe(false);
    });

    it('propagates explicit user deletion from cloud when cloud deletedContestIds is newer than local contest', () => {
      const localState = {
        activeId: 'default',
        version: 10,
        lastUpdated: '2026-10-28T10:00:00.000Z',
        contests: {
          default: { contestName: 'Base', lastUpdated: '2026-10-28T10:00:00.000Z', categories: [] },
          'contest-old': { contestName: 'Antigo', lastUpdated: '2026-10-28T09:00:00.000Z', categories: [] },
        },
        trash: [],
      };

      const cloudData = {
        activeId: 'default',
        version: 11,
        lastUpdated: '2026-10-28T12:00:00.000Z',
        contests: {
          default: { contestName: 'Base', lastUpdated: '2026-10-28T12:00:00.000Z', categories: [] },
        },
        deletedContestIds: [{ contestId: 'contest-old', deletedAt: '2026-10-28T12:00:00.000Z' }],
        trash: [],
      };

      const merged = mergeAppStatePure(localState, cloudData, { nonDestructive: false });
      expect(merged.contests['contest-old']).toBeUndefined();
      expect(hasMissingCloudContests(merged, {
        ...cloudData,
        contests: {
          ...cloudData.contests,
          'contest-old': { contestName: 'Antigo', lastUpdated: '2026-10-28T09:00:00.000Z', categories: [] },
        },
      })).toBe(false);
    });

    it('extracts contestId (not trash entry id) in getExplicitDeletedContestMap and ignores cloud-sync entries', () => {
      const state = {
        contests: { default: { contestName: 'Base' } },
        trash: [
          {
            id: 'trash-abc-123',
            type: 'contest',
            contestId: 'contest-user-deleted',
            reason: 'user-delete',
            deletedAt: '2026-10-29T00:00:00.000Z',
          },
          {
            id: 'sync-trash-contest-victim-999',
            type: 'contest',
            contestId: 'contest-victim',
            reason: 'cloud-sync',
            deletedAt: '2026-10-29T00:00:00.000Z',
            data: { contestName: 'Vítima do Auto-Trash' },
          },
        ],
      };

      const map = getExplicitDeletedContestMap(state);
      expect(map.has('contest-user-deleted')).toBe(true);
      expect(map.has('trash-abc-123')).toBe(false);
      expect(map.has('contest-victim')).toBe(false);
      expect(hasAutoTrashedContests(state)).toBe(true);
    });

    it('updates stateStringForSync fingerprint when empty contests are added or renamed', () => {
      const base = {
        activeId: 'default',
        version: 1,
        lastUpdated: '2026-10-29T00:00:00.000Z',
        contests: {
          default: { contestName: 'Painel A', categories: [] },
        },
      };
      const withSecondEmpty = {
        ...base,
        contests: {
          ...base.contests,
          'contest-2': { contestName: 'Novo Concurso', categories: [] },
        },
      };
      const renamedSecond = {
        ...withSecondEmpty,
        contests: {
          ...base.contests,
          'contest-2': { contestName: 'Polícia Rodoviária Federal', categories: [] },
        },
      };

      const fp1 = stateStringForSync(base);
      const fp2 = stateStringForSync(withSecondEmpty);
      const fp3 = stateStringForSync(renamedSecond);
      expect(fp1).not.toBe(fp2);
      expect(fp2).not.toBe(fp3);
    });
  });

  describe('Store contest lifecycle & trash restoration', () => {
    beforeEach(() => {
      useAppStore.getState().resetStore();
    });

    it('tracks explicit deletion in deletedContestIds and clears it upon restoreFromTrash', () => {
      const store = useAppStore.getState();
      store.createNewContest();

      const afterCreate = useAppStore.getState().appState;
      const createdId = afterCreate.activeId;
      expect(createdId).not.toBe('default');
      expect(afterCreate.contests[createdId].lastUpdated).toBeTruthy();

      useAppStore.getState().renameContest(createdId, 'TRF 3ª Região');
      expect(useAppStore.getState().appState.contests[createdId].contestName).toBe('TRF 3ª Região');

      useAppStore.getState().deleteContest(createdId);
      const afterDelete = useAppStore.getState().appState;
      expect(afterDelete.contests[createdId]).toBeUndefined();
      expect(afterDelete.deletedContestIds.some((d) => d.contestId === createdId)).toBe(true);

      const trashEntry = afterDelete.trash.find((t) => t.contestId === createdId);
      expect(trashEntry).toBeDefined();
      expect(trashEntry.reason).toBe('user-delete');

      useAppStore.getState().restoreFromTrash(trashEntry.id);
      const afterRestore = useAppStore.getState().appState;
      expect(afterRestore.contests[createdId]).toBeDefined();
      expect(afterRestore.contests[createdId].contestName).toBe('TRF 3ª Região');
      expect(afterRestore.deletedContestIds.some((d) => d.contestId === createdId)).toBe(false);
    });
  });

  describe('parseImportedData (backupManager.js)', () => {
    it('does not overwrite an occupied default contest on single-contest PARTIAL_RESTORE', () => {
      const currentAppState = {
        activeId: 'default',
        version: 5,
        contests: {
          default: {
            contestName: 'Meu Concurso Atual',
            categories: [{ id: 'c1', name: 'Constitucional', tasks: [] }],
          },
        },
      };

      const singleContestJson = JSON.stringify({
        user: { name: 'INSS 2026' },
        categories: [{ id: 'c2', name: 'Seguridade Social', tasks: [] }],
      });

      const result = parseImportedData(singleContestJson, currentAppState);
      expect(result.type).toBe('PARTIAL_RESTORE');
      expect(Object.keys(result.data.contests).length).toBe(2);
      expect(result.data.contests.default.contestName).toBe('Meu Concurso Atual');
      expect(result.data.activeId).not.toBe('default');
      expect(result.data.contests[result.data.activeId].contestName).toBe('INSS 2026');
    });

    it('accepts full backups with empty/omitted categories, unwraps state.appState, and preserves local contests', () => {
      const currentAppState = {
        activeId: 'local-only',
        version: 3,
        contests: {
          'local-only': {
            contestName: 'Concurso Local Exclusivo',
            categories: [{ id: 'loc-1', name: 'RLM', tasks: [] }],
          },
        },
      };

      const wrappedFullBackup = JSON.stringify({
        state: {
          appState: {
            activeId: 'cloud-1',
            contests: {
              'cloud-1': {
                contestName: 'Petrobras',
                categories: { 0: { id: 'p-1', name: 'Química', tasks: [] } },
              },
              'cloud-2': {
                contestName: 'BNDES (Sem Matérias Ainda)',
                // categories omitted on purpose
              },
            },
          },
        },
      });

      const result = parseImportedData(wrappedFullBackup, currentAppState);
      expect(result.type).toBe('FULL_RESTORE');
      expect(Object.keys(result.data.contests)).toEqual(
        expect.arrayContaining(['local-only', 'cloud-1', 'cloud-2'])
      );
      expect(result.data.contests['cloud-1'].categories.length).toBe(1);
      expect(result.data.contests['cloud-2'].categories).toEqual([]);
    });
  });
});

