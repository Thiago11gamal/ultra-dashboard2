// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, renderHook, act, waitFor, cleanup } from '@testing-library/react';
import {
  OWNER_ADMIN_EMAIL,
  ALL_UNLOCKED_COACH_FLAGS,
  isAdminUser,
  syncAdminCoachFlags,
} from '../adminAccess.js';
import { AuthContext } from '../../context/AuthContextValue';
import { useSubscription } from '../../hooks/useSubscription.js';
import { evaluateContestMaturity, syncAdaptiveFeatureFlags } from '../../engine/adaptive/adaptiveMaturityEngine.js';
import { getCoachFeature, DEFAULT_COACH_FEATURES } from '../coachFeatures.js';
import { replaceFlags, readFlags, clearAllCoachFlags } from '../coachFeatureStore.js';
import { bootstrapCoachFlags } from '../coachOptimizer.js';
import { runCoachOrchestrator, runCoachPipeline } from '../coachPipeline.js';
import { useCoachControlCenter } from '../../hooks/useCoachControlCenter.js';
import { parseImportedData } from '../backupManager.js';
import { generateAIQuestions } from '../../services/aiQuestionService.js';
import generateQuestionsHandler from '../../../api/ai/generate-questions.js';

function createMockRes() {
  const headers = {};
  return {
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
}

describe('Admin Full Unrestricted Access (antunest040@gmail.com)', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    localStorage.clear();
    replaceFlags({}, 'admin-test-contest');
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    localStorage.clear();
    clearAllCoachFlags();
  });

  it('rejects unverified spoofed objects without Firebase token provider (fail closed)', async () => {
    const spoofed = { uid: 'spoof-uid', email: OWNER_ADMIN_EMAIL };
    expect(isAdminUser(spoofed)).toBe(false);

    const { result } = renderHook(() => useSubscription(spoofed));
    expect(result.current.isPremium).toBe(false);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.isPremium).toBe(false);
  });

  it('grants immediate unrestricted Premium and admin recognition to verified antunest040@gmail.com', () => {
    const verifiedAdmin = {
      uid: 'firebase-owner-uid',
      email: '  AntunesT040@GMAIL.com ',
      emailVerified: true,
      getIdTokenResult: async () => ({ claims: {} }),
    };

    expect(isAdminUser(verifiedAdmin)).toBe(true);

    const { result } = renderHook(() => useSubscription(verifiedAdmin));
    expect(result.current.isPremium).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('unlocks all Coach feature flags including Control Center panels and N5 adaptive mode for admin', () => {
    const allKeys = Object.keys(DEFAULT_COACH_FEATURES);
    expect(allKeys.length).toBeGreaterThan(30);
    expect(Object.keys(ALL_UNLOCKED_COACH_FLAGS)).toEqual(allKeys);

    const maturityAdmin = evaluateContestMaturity({}, { isAdmin: true });
    expect(maturityAdmin.stage).toBe(5);
    expect(maturityAdmin.code).toBe('N5');
    expect(maturityAdmin.progressToNextPct).toBe(100);
    expect(maturityAdmin.unlockedFlags.useCoachControlCenter).toBe(true);
    expect(maturityAdmin.unlockedFlags.useAutoTuner).toBe(true);
    expect(maturityAdmin.unlockedFlags.useCausalUplift).toBe(true);

    // Non-admin cold-start contest remains N0
    const maturityNormal = evaluateContestMaturity({});
    expect(maturityNormal.stage).toBe(0);
    expect(maturityNormal.unlockedFlags.useCoachControlCenter).toBeUndefined();

    syncAdminCoachFlags('admin-test-contest');
    for (const key of allKeys) {
      expect(getCoachFeature({ contestId: 'admin-test-contest' }, key, false)).toBe(true);
    }

    // Sync via adaptive maturity engine with isAdmin:true preserves explicit manual override
    localStorage.setItem(
      'coach_manual_flag_overrides_v1:admin-test-contest',
      JSON.stringify({ useLLMStrictValidation: false })
    );
    const res = syncAdaptiveFeatureFlags({}, 'admin-test-contest', { isAdmin: true, respectOverrides: true });
    expect(res.finalFlags.useCoachControlCenter).toBe(true);
    expect(res.finalFlags.useLLMStrictValidation).toBe(false);
  });

  it('bypasses backend AI rate limit and 20-question cap only when Firebase token resolves to antunest040@gmail.com', async () => {
    const prevEnv = {
      REQUIRE_AI_AUTH: process.env.REQUIRE_AI_AUTH,
      FIREBASE_WEB_API_KEY: process.env.FIREBASE_WEB_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    };

    try {
      delete process.env.REQUIRE_AI_AUTH;
      process.env.FIREBASE_WEB_API_KEY = 'test-firebase-key';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      let lastGeminiPayload = null;
      globalThis.fetch = vi.fn(async (url, init) => {
        if (String(url).includes('identitytoolkit.googleapis.com')) {
          return {
            ok: true,
            json: async () => ({
              users: [{ localId: 'admin-uid-999', email: 'antunest040@gmail.com' }],
            }),
          };
        }
        if (String(url).includes('generativelanguage.googleapis.com')) {
          lastGeminiPayload = JSON.parse(init.body);
          return {
            ok: true,
            json: async () => ({
              candidates: [{
                content: {
                  parts: [{
                    text: JSON.stringify([{
                      id: 'q1',
                      enunciado: 'Questão teste',
                      alternativas: [{ letra: 'A', texto: 'Opt A' }, { letra: 'B', texto: 'Opt B' }],
                      alternativa_correta: 'A',
                      justificativa: 'Justificativa.',
                      materia: 'Direito',
                      assunto: 'Constitucional',
                      dificuldade: 'medio',
                    }]),
                  }],
                },
              }],
            }),
          };
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      // Exceed normal rate limit (22 sequential requests > 20) and request 40 questions (> 20 normal cap)
      let res = null;
      for (let i = 0; i < 22; i += 1) {
        res = createMockRes();
        await generateQuestionsHandler(
          {
            method: 'POST',
            headers: { authorization: 'Bearer valid-admin-token' },
            body: {
              materia: 'Direito Constitucional',
              assunto: 'Controle de Constitucionalidade',
              dificuldade: 'dificil',
              quantidade: 40,
              contestName: 'TRF',
            },
          },
          res
        );
        expect(res.statusCode).toBe(200);
      }

      const promptText = lastGeminiPayload?.contents?.[0]?.parts?.[0]?.text || '';
      expect(promptText).toContain('"quantidade":40');
    } finally {
      Object.entries(prevEnv).forEach(([k, v]) => {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      });
    }
  });

  it('still loads regular user subscription state asynchronously without admin grant', async () => {
    const regularUser = {
      uid: 'regular-user-1',
      email: 'aluno@example.com',
      getIdTokenResult: async () => ({ claims: {} }),
    };

    expect(isAdminUser(regularUser)).toBe(false);
    const { result } = renderHook(() => useSubscription(regularUser));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.isPremium).toBe(false);
  });

  it('preserves all 47 admin flags across bootstrapCoachFlags and full runCoachOrchestrator/runCoachPipeline execution', async () => {
    const scope = 'admin-orch-contest';
    syncAdminCoachFlags(scope);
    expect(Object.values(readFlags(scope)).filter(Boolean).length).toBe(Object.keys(DEFAULT_COACH_FEATURES).length);

    // bootstrapCoachFlags must NEVER overwrite active in-memory admin flags with baseline false
    const bootstrapped = bootstrapCoachFlags(scope, { syncGlobalScope: false });
    expect(bootstrapped.useCoachControlCenter).toBe(true);
    expect(bootstrapped.useAutoTuner).toBe(true);
    expect(bootstrapped.useCausalUplift).toBe(true);
    expect(readFlags(scope).useCoachControlCenter).toBe(true);

    // Cold-start empty contest with all 47 flags active must run cleanly
    const coldPipe = runCoachPipeline([], [], [], { contestId: scope, maxScore: 100, minScore: 0 });
    expect(coldPipe.ok).toBe(true);

    const sampleCategories = [
      {
        id: 'cat-const',
        name: 'Direito Constitucional',
        weight: 20,
        maxScore: 100,
        minScore: 0,
        tasks: [{ id: 't1', title: 'Controle de Constitucionalidade', completed: false, priority: 'high' }],
        simuladoStats: {
          average: 72,
          level: 'MÉDIO',
          history: [
            { date: '2026-10-01', score: 65, total: 20, correct: 13 },
            { date: '2026-10-15', score: 72, total: 20, correct: 14 },
            { date: '2026-11-01', score: 78, total: 20, correct: 16 },
          ],
        },
      },
    ];
    const sampleLogs = [
      { id: 'l1', date: '2026-10-10', categoryId: 'cat-const', minutes: 90, studyMode: 'questoes' },
      { id: 'l2', date: '2026-10-25', categoryId: 'cat-const', minutes: 120, studyMode: 'revisao' },
    ];

    const orch = await runCoachOrchestrator(
      { categories: sampleCategories, simulados: [], studyLogs: sampleLogs },
      { contestId: scope, maxScore: 100, minScore: 0, targetScore: 80, force: true, runHealth: true, runLLM: true }
    );
    expect(orch.ok).toBe(true);
    expect(orch.focus?.name).toBe('Direito Constitucional');
    expect(readFlags(scope).useCoachControlCenter).toBe(true);
    expect(readFlags(scope).useStateSpace).toBe(true);
  });

  it('useCoachControlCenter keeps admin flags active, persists science tab and manual toggleFlag overrides, and resets to full admin flags', async () => {
    const scope = 'admin-cc-scope';
    // Simulate stale pre-admin persisted flags in localStorage
    localStorage.setItem(`coach_active_flags_v1:${scope}`, JSON.stringify({ useStateSpace: false }));

    const verifiedAdmin = {
      uid: 'firebase-owner-uid',
      email: OWNER_ADMIN_EMAIL,
      getIdTokenResult: async () => ({ claims: {} }),
    };

    let api;
    function Harness() {
      api = useCoachControlCenter({
        contestId: scope,
        categories: [],
        simulados: [],
        studyLogs: [],
      });
      return null;
    }

    const { unmount } = render(
      <AuthContext.Provider value={{ currentUser: verifiedAdmin }}>
        <Harness />
      </AuthContext.Provider>
    );

    expect(api.currentFlags.useCoachControlCenter).toBe(true);
    expect(api.currentFlags.useStateSpace).toBe(true);
    expect(api.currentFlags.useAutoTuner).toBe(true);

    // Science tab must persist and survive remount
    await act(async () => {
      api.setActiveTab('science');
    });
    expect(api.activeTab).toBe('science');

    // Manual override toggle must persist synchronously to coach_manual_flag_overrides_v1
    await act(async () => {
      api.toggleFlag('useLLMStrictValidation', false);
    });
    expect(api.currentFlags.useLLMStrictValidation).toBe(false);
    const savedOverrides = JSON.parse(localStorage.getItem(`coach_manual_flag_overrides_v1:${scope}`) || '{}');
    expect(savedOverrides.useLLMStrictValidation).toBe(false);

    unmount();

    // Remounting restores 'science' tab and keeps manual override
    render(
      <AuthContext.Provider value={{ currentUser: verifiedAdmin }}>
        <Harness />
      </AuthContext.Provider>
    );
    expect(api.activeTab).toBe('science');
    expect(api.currentFlags.useLLMStrictValidation).toBe(false);
    expect(api.currentFlags.useCoachControlCenter).toBe(true);

    // Resetting overrides as admin restores all 47 flags to true
    await act(async () => {
      api.resetOverrides();
    });
    expect(api.currentFlags.useLLMStrictValidation).toBe(true);
    expect(api.currentFlags.useCoachControlCenter).toBe(true);

    // Logout cleanup clears in-memory feature store completely
    clearAllCoachFlags();
    expect(readFlags(scope)).toEqual({});
  });

  it('supports extended admin backup size option and surfaces backend AI error details', async () => {
    const bigNote = 'x'.repeat(5 * 1024 * 1024 + 512);
    const payload = JSON.stringify({
      activeId: 'default',
      contests: { default: { contestName: 'Big Backup', categories: [], notes: bigNote } },
    });

    // Standard user remains capped at 5MB
    expect(() => parseImportedData(payload, {})).toThrow(/máximo 5MB/i);
    // Admin elevated limit succeeds cleanly
    const parsed = parseImportedData(payload, {}, { maxSizeBytes: 50 * 1024 * 1024 });
    expect(parsed.type).toBe('FULL_RESTORE');

    // Backend JSON error detail is surfaced while keeping status prefix
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Chave GEMINI_API_KEY não configurada' }),
    });
    await expect(
      generateAIQuestions({
        materia: 'Direito Penal',
        assunto: 'Dolo',
        dificuldade: 'medio',
        quantidade: 5,
      })
    ).rejects.toThrow(/Backend retornou 503: Chave GEMINI_API_KEY não configurada/i);
  });
});
