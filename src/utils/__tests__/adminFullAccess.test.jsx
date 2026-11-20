// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  OWNER_ADMIN_EMAIL,
  ALL_UNLOCKED_COACH_FLAGS,
  isAdminUser,
  syncAdminCoachFlags,
} from '../adminAccess.js';
import { useSubscription } from '../../hooks/useSubscription.js';
import { evaluateContestMaturity, syncAdaptiveFeatureFlags } from '../../engine/adaptive/adaptiveMaturityEngine.js';
import { getCoachFeature, DEFAULT_COACH_FEATURES } from '../coachFeatures.js';
import { replaceFlags } from '../coachFeatureStore.js';
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
    globalThis.fetch = originalFetch;
    localStorage.clear();
    replaceFlags({}, 'admin-test-contest');
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
});
