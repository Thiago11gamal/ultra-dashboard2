// @vitest-environment jsdom
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, renderHook, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { current, isDraft } from 'immer';
import { format } from 'date-fns';

import { useAppStore } from '../../store/useAppStore';
import { safeClone } from '../safeClone';
import { applyAIResultsToDraft } from '../aiSaveHelper';
import { generateAIQuestions } from '../../services/aiQuestionService';
import generateQuestionsHandler from '../../../api/ai/generate-questions.js';
import { sanitizeContest } from '../../store/schemas';
import { mergeAppStatePure, stateStringForSync } from '../cloudSyncMerge';
import { parseImportedData } from '../backupManager';
import useIdleLogout from '../../hooks/useIdleLogout';
import { useSubscription } from '../../hooks/useSubscription';
import { aggregateHeatmap, calculateSubjectMastery } from '../heatmapAggregation';
import ActivityHeatmap from '../../components/ActivityHeatmap';
import { EvolutionHeatmap } from '../../components/charts/EvolutionHeatmap';
import { retentionFromHalfLife } from '../retentionCore';
import { fsrsRetrievability } from '../../engine/probabilistic/fsrs';
import { getAppTimezone, setAppTimezone, getDateKey } from '../dateHelper';
import { runCoachPipeline } from '../coachPipeline';

function createMockRes() {
  const headers = {};
  const res = {
    statusCode: 200,
    body: undefined,
    headers,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

describe('Comprehensive Bugfixes Audit Regression Suite', () => {
  const originalTz = getAppTimezone();
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    localStorage.clear();
    setAppTimezone(originalTz);
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    setAppTimezone(originalTz);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Area 1 — Simulado IA, Immer & Backend /api', () => {
    it('saves multiple same-day AI simulados via Immer setState without mutate+return crash and preserves batchIds', () => {
      const contestId = 'test-ai-immer';
      useAppStore.setState((state) => {
        state.appState.activeId = contestId;
        state.appState.contests[contestId] = {
          id: contestId,
          contestName: 'Teste IA',
          maxScore: 100,
          minScore: 0,
          categories: [
            {
              id: 'cat-penal',
              name: 'Direito Penal',
              tasks: [{ id: 't-dolo', text: 'Dolo e Culpa', completed: false }],
              simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' },
            },
          ],
          simulados: [],
          simuladoRows: [],
          studyLogs: [],
        };
      });

      const runSave = (batchId, correct, total) => {
        useAppStore.setState((state) => {
          const activeId = state.appState.activeId;
          const draft = state.appState.contests[activeId];
          const cloned = safeClone(isDraft(draft) ? current(draft) : draft);
          applyAIResultsToDraft(
            cloned,
            {
              materia: 'Direito Penal',
              assunto: 'Dolo e Culpa',
              categoryId: 'cat-penal',
              taskId: 't-dolo',
              dificuldade: 'medio',
            },
            correct,
            total,
            120,
            false,
            batchId
          );
          state.appState.contests[activeId] = cloned;
        });
      };

      expect(() => runSave('batch-first', 4, 5)).not.toThrow();
      expect(() => runSave('batch-second', 3, 5)).not.toThrow();

      const updated = useAppStore.getState().appState.contests[contestId];
      const hist = updated.categories[0].simuladoStats.history;
      expect(hist).toHaveLength(1);
      expect(hist[0].total).toBe(10);
      expect(hist[0].correct).toBe(7);
      expect(hist[0].batchId).toBe('batch-second');
      expect(hist[0].batchIds).toContain('batch-first');
      expect(hist[0].batchIds).toContain('batch-second');
    });

    it('generateAIQuestions fires only a single backend request without duplicate retry POST', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Falha simulada' }),
      });
      globalThis.fetch = fetchMock;

      await expect(
        generateAIQuestions({
          materia: 'Português',
          assunto: 'Crase',
          dificuldade: 'medio',
          quantidade: 3,
          contestName: 'TRF',
        })
      ).rejects.toThrow(/Backend retornou 500/i);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('api/ai/generate-questions fails closed without Bearer auth, handles CORS allowlist, and emits Retry-After on 429', async () => {
      const prevEnv = {
        REQUIRE_AI_AUTH: process.env.REQUIRE_AI_AUTH,
        FIREBASE_WEB_API_KEY: process.env.FIREBASE_WEB_API_KEY,
        FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        VERCEL_ENV: process.env.VERCEL_ENV,
      };

      try {
        delete process.env.REQUIRE_AI_AUTH;
        delete process.env.FIREBASE_WEB_API_KEY;
        delete process.env.FIREBASE_API_KEY;
        process.env.ALLOWED_ORIGINS = 'https://app.metodoarraia.com';

        // 1) CORS preflight for allowed origin
        const optRes = createMockRes();
        await generateQuestionsHandler(
          { method: 'OPTIONS', headers: { origin: 'https://app.metodoarraia.com' } },
          optRes
        );
        expect(optRes.statusCode).toBe(204);
        expect(optRes.headers['access-control-allow-origin']).toBe('https://app.metodoarraia.com');

        // 2) Missing Authorization header => 401 fail-closed
        const unauthRes = createMockRes();
        await generateQuestionsHandler(
          { method: 'POST', headers: {}, body: { materia: 'Penal', assunto: 'Dolo' } },
          unauthRes
        );
        expect(unauthRes.statusCode).toBe(401);

        // 3) Bearer header present, FIREBASE_WEB_API_KEY missing => 503 fail-closed
        const noKeyRes = createMockRes();
        await generateQuestionsHandler(
          {
            method: 'POST',
            headers: { authorization: 'Bearer some-token' },
            body: { materia: 'Penal', assunto: 'Dolo' },
          },
          noKeyRes
        );
        expect(noKeyRes.statusCode).toBe(503);

        // 4) Rate limit emits Retry-After: 60
        process.env.REQUIRE_AI_AUTH = 'false';
        delete process.env.VERCEL_ENV;
        delete process.env.GEMINI_API_KEY;
        const uniqueIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
        let lastRes = null;
        for (let i = 0; i < 21; i += 1) {
          lastRes = createMockRes();
          await generateQuestionsHandler(
            {
              method: 'POST',
              headers: { 'x-forwarded-for': uniqueIp },
              body: { materia: 'Penal', assunto: 'Dolo' },
            },
            lastRes
          );
        }
        expect(lastRes.statusCode).toBe(429);
        expect(lastRes.headers['retry-after']).toBe('60');
      } finally {
        Object.entries(prevEnv).forEach(([k, v]) => {
          if (v === undefined) delete process.env[k];
          else process.env[k] = v;
        });
      }
    });
  });

  describe('Area 2 — Cloud Sync, Tombstones, Backup, Idle Logout & Subscription', () => {
    it('isolates RECOVERED_DIREITO_CONTEST strictly to its legacy UUID and never injects into new contests named Direito', () => {
      const customDireito = sanitizeContest(
        {
          contestName: 'Direito',
          user: { name: 'Direito' },
          categories: [],
        },
        'contest-custom-direito'
      );
      expect(customDireito.categories).toEqual([]);

      const legacyDireito = sanitizeContest(
        {
          contestName: 'Direito',
          categories: [],
        },
        'contest-7e146398-1fbf-48b6-904f-98d2f70d9f66'
      );
      expect(legacyDireito.categories.length).toBeGreaterThan(0);

      // Switching to a custom contest named 'Direito' must NOT inject hardcoded subjects
      useAppStore.setState((state) => {
        state.appState.contests['custom-direito-id'] = {
          contestName: 'Direito',
          user: { name: 'Direito' },
          categories: [],
        };
      });
      useAppStore.getState().switchContest('custom-direito-id');
      expect(useAppStore.getState().appState.contests['custom-direito-id'].categories).toEqual([]);
    });

    it('prevents resurrection of deleted tasks, flashcard decks/cards, and agenda events on cloud sync merge', () => {
      const contestId = 'sync-tombstone-test';
      useAppStore.setState((state) => {
        state.appState.activeId = contestId;
        state.appState.contests[contestId] = {
          id: contestId,
          contestName: 'Sync Test',
          categories: [
            {
              id: 'cat-1',
              name: 'Constitucional',
              tasks: [
                { id: 'task-keep', text: 'Direitos Fundamentais', completed: false },
                { id: 'task-del', text: 'Controle Difuso', completed: false },
              ],
            },
          ],
          flashcardDecks: [],
          agenda: [],
        };
      });

      // Delete task locally -> records tombstone
      useAppStore.getState().deleteTask('cat-1', 'task-del');
      const localAfterDelete = useAppStore.getState().appState;
      expect(localAfterDelete.contests[contestId].categories[0].deletedTaskIds.some((d) => d.id === 'task-del')).toBe(true);

      // Remote still contains deleted task, deck, card, and agenda item
      const localState = {
        activeId: contestId,
        version: 2,
        lastUpdated: '2026-05-01T12:00:00.000Z',
        contests: {
          [contestId]: {
            ...localAfterDelete.contests[contestId],
            flashcardDecks: [
              {
                id: 'deck-1',
                name: 'Deck 1',
                cards: [{ id: 'card-keep', front: 'Q1', back: 'A1' }],
                deletedCardIds: [{ id: 'card-del', deletedAt: '2026-05-01T11:59:00.000Z' }],
              },
            ],
            deletedFlashcardDeckIds: [{ id: 'deck-del', deletedAt: '2026-05-01T11:59:00.000Z' }],
            agenda: [{ id: 'ev-keep', title: 'Revisão', date: '2026-05-02' }],
            deletedAgendaIds: [{ id: 'ev-del', deletedAt: '2026-05-01T11:59:00.000Z' }],
          },
        },
      };

      const remoteState = {
        activeId: contestId,
        version: 1,
        lastUpdated: '2026-05-01T11:00:00.000Z',
        contests: {
          [contestId]: {
            id: contestId,
            contestName: 'Sync Test',
            categories: [
              {
                id: 'cat-1',
                name: 'Constitucional',
                tasks: [
                  { id: 'task-keep', text: 'Direitos Fundamentais', completed: false },
                  { id: 'task-del', text: 'Controle Difuso', completed: false },
                ],
              },
            ],
            flashcardDecks: [
              {
                id: 'deck-1',
                name: 'Deck 1',
                cards: [
                  { id: 'card-keep', front: 'Q1', back: 'A1' },
                  { id: 'card-del', front: 'Old', back: 'Old' },
                ],
              },
              {
                id: 'deck-del',
                name: 'Deleted Deck',
                cards: [{ id: 'c-x', front: 'X', back: 'Y' }],
              },
            ],
            agenda: [
              { id: 'ev-keep', title: 'Revisão', date: '2026-05-02' },
              { id: 'ev-del', title: 'Apagado', date: '2026-05-03' },
            ],
          },
        },
      };

      const merged = mergeAppStatePure(remoteState, localState);
      const mergedContest = merged.contests[contestId];
      expect(mergedContest.categories[0].tasks.map((t) => t.id)).toEqual(['task-keep']);
      expect(mergedContest.flashcardDecks.map((d) => d.id)).toEqual(['deck-1']);
      expect(mergedContest.flashcardDecks[0].cards.map((c) => c.id)).toEqual(['card-keep']);
      expect(mergedContest.agenda.map((e) => e.id)).toEqual(['ev-keep']);

      // Re-adding a task with the same text removes its tombstone
      useAppStore.getState().addTask('cat-1', 'Controle Difuso');
      const afterReAdd = useAppStore.getState().appState.contests[contestId].categories[0];
      expect(afterReAdd.deletedTaskIds.some((d) => d.id === 'task-del')).toBe(false);

      // Fingerprint changes when flashcardDecks or agenda change
      const fp1 = stateStringForSync(merged);
      const modified = safeClone(merged);
      modified.contests[contestId].agenda.push({ id: 'ev-new', title: 'Novo', date: '2026-05-04' });
      const fp2 = stateStringForSync(modified);
      expect(fp1).not.toBe(fp2);
    });

    it('backupManager parseImportedData blocks malicious root fields, preserves isHydrated, and resets pomodoro', () => {
      const maliciousPayload = JSON.stringify({
        activeId: 'c1',
        isHydrated: false,
        injectedRootKey: 'evil',
        pomodoro: { isRunning: true, activeSubject: 'Compromised' },
        contests: {
          c1: {
            id: 'c1',
            contestName: 'Seguro',
            categories: [{ id: 'cat-1', name: 'Português', tasks: [] }],
          },
          __proto__: { polluted: true },
        },
      });

      const parsed = parseImportedData(maliciousPayload, {
        isHydrated: true,
        activeId: 'default',
        contests: {},
        pomodoro: { isRunning: false, workTime: 25 },
      });

      expect(parsed.type).toBe('FULL_RESTORE');
      expect(parsed.data.isHydrated).toBe(true);
      expect(parsed.data.pomodoro.isRunning).toBe(false);
      expect(parsed.data.pomodoro.activeSubject).toBeNull();
      expect(parsed.data.injectedRootKey).toBeUndefined();
      expect(({}).polluted).toBeUndefined();
    });

    it('useIdleLogout checks pomodoro.isRunning (not activeSubject) and preserves remaining timeout on visibilitychange', () => {
      vi.useFakeTimers();
      const logout = vi.fn();

      // Paused pomodoro with activeSubject set MUST NOT prevent logout
      useAppStore.setState((state) => {
        state.appState.pomodoro.activeSubject = { category: 'Direito Penal', task: 'Dolo' };
        state.appState.pomodoro.isRunning = false;
      });

      const { unmount } = renderHook(() => useIdleLogout(logout, 60_000, true));

      // After 40s, tab becomes visible -> remaining should be ~20s, NOT reset to 60s
      act(() => {
        vi.advanceTimersByTime(40_000);
      });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      act(() => {
        vi.advanceTimersByTime(21_000);
      });
      expect(logout).toHaveBeenCalledTimes(1);
      unmount();

      // Active running pomodoro MUST defer logout
      const logout2 = vi.fn();
      useAppStore.setState((state) => {
        state.appState.pomodoro.activeSubject = { category: 'Direito Penal', task: 'Dolo' };
        state.appState.pomodoro.isRunning = true;
      });
      const hook2 = renderHook(() => useIdleLogout(logout2, 10_000, true));
      act(() => {
        vi.advanceTimersByTime(15_000);
      });
      expect(logout2).not.toHaveBeenCalled();
      hook2.unmount();
    });

    it('useSubscription does not hardcode bypass personal emails and recognizes stripeRole premium claim', async () => {
      const noTokenPersonal = { uid: 'u-personal', email: 'antunest040@gmail.com' };
      const { result: r1 } = renderHook(() => useSubscription(noTokenPersonal));
      expect(r1.current.isPremium).toBe(false);

      const stripeUser = {
        uid: 'u-stripe-role',
        email: 'subscriber@example.com',
        getIdTokenResult: async () => ({ claims: { stripeRole: 'premium' } }),
      };
      const { result: r2 } = renderHook(() => useSubscription(stripeUser));
      await waitFor(() => {
        expect(r2.current.loading).toBe(false);
        expect(r2.current.isPremium).toBe(true);
      });
    });
  });

  describe('Area 3 — Pomodoro Runtime vs Undo (Zundo) & toggleNeuralTask', () => {
    it('transient Pomodoro runtime mutations do not bump appState.version or pollute temporal undo history', () => {
      useAppStore.temporal.getState().clear();
      const beforeVersion = useAppStore.getState().appState.version;
      const beforePast = useAppStore.temporal.getState().pastStates.length;

      useAppStore.getState().setPomodoroRunning(true);
      useAppStore.getState().setPomodoroMode('break');
      useAppStore.getState().setPomodoroAccumulatedMinutes(12);
      useAppStore.getState().syncPomodoroState({ isRunning: false, mode: 'work' });

      expect(useAppStore.getState().appState.version).toBe(beforeVersion);
      expect(useAppStore.temporal.getState().pastStates.length).toBe(beforePast);
    });

    it('toggleNeuralTask clears studying status and resets Pomodoro when non-neural, while preserving neuralQueue in neuralMode', () => {
      const contestId = 'neural-toggle-test';
      useAppStore.setState((state) => {
        state.appState.activeId = contestId;
        state.appState.contests[contestId] = {
          id: contestId,
          contestName: 'Neural Test',
          categories: [
            {
              id: 'cat-a',
              name: 'AFO',
              tasks: [
                { id: 't1', text: 'PPA', completed: false, status: 'studying' },
                { id: 't2', text: 'LDO', completed: false, status: 'studying' },
              ],
            },
          ],
          studyLogs: [],
        };
        state.appState.pomodoro.activeSubject = {
          categoryId: 'cat-a',
          category: 'AFO',
          taskId: 't1',
          task: 'PPA',
        };
        state.appState.pomodoro.isRunning = true;
        state.appState.pomodoro.neuralMode = false;
        state.appState.pomodoro.neuralQueue = [];
      });

      useAppStore.getState().toggleNeuralTask('t1');
      let st = useAppStore.getState().appState;
      expect(st.contests[contestId].categories[0].tasks[0].completed).toBe(true);
      expect(st.contests[contestId].categories[0].tasks[0].status).toBeNull();
      expect(st.pomodoro.activeSubject).toBeNull();
      expect(st.pomodoro.isRunning).toBe(false);

      // In neuralMode, neuralQueue & neuralMode must remain intact for advanceNeuralQueue
      useAppStore.setState((state) => {
        state.appState.pomodoro.activeSubject = {
          categoryId: 'cat-a',
          category: 'AFO',
          taskId: 't2',
          task: 'LDO',
        };
        state.appState.pomodoro.isRunning = true;
        state.appState.pomodoro.neuralMode = true;
        state.appState.pomodoro.neuralQueue = [{ id: 't2', text: 'LDO', category: 'AFO' }];
      });
      useAppStore.getState().toggleNeuralTask('t2');
      st = useAppStore.getState().appState;
      expect(st.contests[contestId].categories[0].tasks[1].status).toBeNull();
      expect(st.pomodoro.neuralMode).toBe(true);
      expect(st.pomodoro.neuralQueue).toHaveLength(1);
    });
  });

  describe('Area 4 — Lazy Loading <Suspense> in App.jsx', () => {
    it('wraps lazy overlay components TrashModal, OnboardingTour, and LevelUpToast in Suspense boundaries', () => {
      const appSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/App.jsx'), 'utf8');
      expect(appSrc).toMatch(/<Suspense\s+fallback=\{null\}>[\s\S]*?<TrashModal/);
      expect(appSrc).toMatch(/<Suspense\s+fallback=\{null\}>[\s\S]*?<OnboardingTour/);
      expect(appSrc).toMatch(/<Suspense\s+fallback=\{null\}>[\s\S]*?<LevelUpToast/);
    });
  });

  describe('Area 5 — Timezone, Heatmaps, minCutoff: 0, Workers & FSRS Retention', () => {
    it('addCategory uses minCutoff: null and EvolutionHeatmap ignores legacy minCutoff: 0 equal to minScore', () => {
      const contestId = 'cutoff-test';
      useAppStore.setState((state) => {
        state.appState.activeId = contestId;
        state.appState.contests[contestId] = {
          id: contestId,
          contestName: 'Cutoff Test',
          maxScore: 100,
          minScore: 0,
          targetScore: 80,
          categories: [],
          simulados: [],
        };
      });
      useAppStore.getState().addCategory('Direito Tributário');
      const added = useAppStore.getState().appState.contests[contestId].categories[0];
      expect(added.minCutoff).toBeNull();

      // Legacy category with minCutoff: 0 and 30% score must fall back to targetScore=80 (NOT painted green #4ade80)
      const heatmapData = {
        dates: [{ key: '2026-04-10', label: '10/04', dayName: 'Sex', isWeekend: false }],
        rows: [
          {
            cat: { id: 'cat-legacy', name: 'Legacy Subject', minCutoff: 0, minScore: 0, maxScore: 100 },
            cells: [{ pct: 30, correct: 3, total: 10, realCorrect: 3, realTotal: 10, isSynthetic: false }],
          },
        ],
      };
      const html = renderToStaticMarkup(
        <EvolutionHeatmap heatmapData={heatmapData} maxScore={100} minScore={0} targetScore={80} />
      );
      expect(html).toContain('30%');
      expect(html).not.toContain('#4ade80');
    });

    it('heatmapAggregation preserves isSynthetic when mixed with zero-volume real cells and parses comma decimals', () => {
      const aggregated = aggregateHeatmap(
        {
          dates: [
            { key: '2026-04-06', label: '06/04' },
            { key: '2026-04-07', label: '07/04' },
          ],
          rows: [
            {
              id: 'r1',
              name: 'Português',
              cells: [
                { total: 10, correct: 7, realTotal: 0, realCorrect: 0, isSynthetic: true },
                { total: 0, correct: 0, realTotal: 0, realCorrect: 0, isSynthetic: false },
              ],
            },
          ],
        },
        'weekly'
      );
      const cell = aggregated.rows[0].cells[0];
      expect(cell.isSynthetic).toBe(true);
      expect(cell.pct).toBeCloseTo(70, 4);

      // Bayesian mastery: (8.5 + 5*0.5) / (10 + 5) * 100 = 11 / 15 * 100 = 73.3333%
      const mastery = calculateSubjectMastery([{ correct: '8,5', total: '10,0' }]);
      expect(mastery).toBeCloseTo((11 / 15) * 100, 4);
    });

    it('ActivityHeatmap aligns civil calendar dates without -1 day shift and tracks session count while skipping flashcards', () => {
      setAppTimezone('America/Manaus');
      const now = new Date();
      const todayKey = getDateKey(now) || format(now, 'yyyy-MM-dd');
      const logs = [
        { date: todayKey, minutes: 45, categoryId: 'c1' },
        { date: todayKey, minutes: 30, categoryId: 'c1' },
        { date: todayKey, minutes: 99, type: 'flashcard' },
      ];
      const { container } = render(<ActivityHeatmap studyLogs={logs} />);
      const todayBtn = container.querySelector('button.ring-emerald-500');
      expect(todayBtn).toBeTruthy();
      fireEvent.focus(todayBtn);
      expect(container.textContent).toContain('2 sessões');
      expect(container.textContent).toContain('1h15');
    });

    it('mc.worker preserves options.projectionDays and historyLength on positional args', async () => {
      const posted = [];
      const prevSelf = globalThis.self;
      const fakeSelf = {
        postMessage(msg) {
          posted.push(msg);
        },
      };
      vi.stubGlobal('self', fakeSelf);
      vi.resetModules();
      await import('../../engine/mc.worker.js');

      const history = [
        { date: '2026-04-01', score: 65 },
        { date: '2026-04-05', score: 70 },
        { date: '2026-04-10', score: 75 },
      ];
      fakeSelf.onmessage({
        data: {
          id: 42,
          type: 'runMonteCarloAnalysis',
          payload: {
            inputOrMean: history,
            targetScore: 80,
            options: { projectionDays: 45, simulations: 300, seed: 'worker-proj-test' },
          },
        },
      });
      fakeSelf.onmessage({
        data: {
          id: 43,
          type: 'runMonteCarloAnalysis',
          payload: {
            inputOrMean: history,
            targetScore: 80,
            options: { projectionDays: 180, simulations: 300, seed: 'worker-proj-test' },
          },
        },
      });

      expect(posted).toHaveLength(2);
      expect(posted[0].type).toBe('result');
      expect(posted[1].type).toBe('result');
      expect(Number.isFinite(posted[0].result.probability)).toBe(true);
      // Different options.projectionDays must produce different projectedMeans (not both overwritten with 90!)
      expect(posted[0].result.projectedMean).not.toBe(posted[1].result.projectedMean);
      vi.stubGlobal('self', prevSelf);
    });

    it('retentionFromHalfLife uses FSRS power-law formula consistent with fsrsRetrievability', () => {
      expect(retentionFromHalfLife(0, 10)).toBe(100);
      expect(retentionFromHalfLife(10, 10)).toBe(50);
      // FSRS power-law: (1 + 30 / 10)^-1 = 0.25 => 25% (vs Ebbinghaus 2^-3 = 12.5%)
      expect(retentionFromHalfLife(30, 10)).toBe(25);
      const fsrsPct = Math.round(100 * fsrsRetrievability(30, 10 / 9));
      expect(retentionFromHalfLife(30, 10)).toBe(fsrsPct);
    });

    it('runCoachPipeline runs synchronously with null options and with object input', () => {
      const cats = [{ id: 'c1', name: 'Penal', tasks: [{ id: 't1', text: 'Dolo', completed: false }] }];
      const p1 = runCoachPipeline(cats, [], [], null);
      expect(p1.ok).toBe(true);
      expect(p1.focus).toBeTruthy();
      expect(typeof p1.recommendation).toBe('string');

      const p2 = runCoachPipeline({ categories: cats, simulados: [], studyLogs: [] });
      expect(p2.ok).toBe(true);
      expect(p2.focus?.id).toBe('c1');
    });
  });
});
