import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
} from '../utils/coachPipeline.js';
import {
  EXPERIMENTAL_MATH_FLAGS,
  loadLastBacktestReport,
  saveBacktestReport,
  loadTunerHistory,
  runCoachAutoTuner,
  applyRecommendedFlags,
  loadPersistedCoachFlags,
  persistCoachFlags,
  getSafeBaselineFeatures,
  getStrategySpace,
} from '../utils/coachOptimizer.js';
import {
  runGranularCoachBacktest,
  saveEvaluationResult,
} from '../utils/coachEvaluation.js';
import {
  recordStrategyOutcome,
  scoreStrategyEvaluation,
} from '../engine/optimization/flagOptimizer.js';
import {
  loadCausalModel,
  buildCausalEventsFromHistory,
  trainCausalModel,
  mergeSimuladosWithCategoryHistory,
} from '../utils/coachCausal.js';
import {
  loadModelHealthSnapshots,
} from '../utils/coachObservability.js';
import {
  replaceFlags,
  writeFlags,
  readFlags,
  subscribeFlags,
  getCoachFeatureContestScope,
} from '../utils/coachFeatureStore.js';
import { isValidFeatureKey } from '../utils/coachFeatures.js';
import { useAppStore } from '../store/useAppStore.js';
import { useAuth } from '../context/useAuth';
import {
  isAdminUser,
  ALL_UNLOCKED_COACH_FLAGS,
  syncAdminCoachFlags,
  readManualFlagOverrides,
} from '../utils/adminAccess.js';
import { syncAdaptiveFeatureFlags } from '../engine/adaptive/adaptiveMaturityEngine.js';

const CONTROL_CENTER_STORAGE_KEY = 'coach_control_center_state_v1';
const MANUAL_OVERRIDES_STORAGE_PREFIX = 'coach_manual_flag_overrides_v1';
const EXPERIMENTAL_FLAG_SET = new Set(EXPERIMENTAL_MATH_FLAGS);

const LOT13_PANEL_FLAGS = [
  'useCoachControlCenter',
  'useControlCenterFlagsPanel',
  'useControlCenterHealthPanel',
  'useControlCenterBacktestPanel',
  'useControlCenterAutoTunerPanel',
  'useControlCenterCausalPanel',
  'useControlCenterLLMPanel',
];

function persistManualFlagOverrides(overrides, contestId, allFlags = null) {
  const scope = String(contestId || 'default');
  const key = scope === 'default' ? MANUAL_OVERRIDES_STORAGE_PREFIX : `${MANUAL_OVERRIDES_STORAGE_PREFIX}:${scope}`;
  try {
    localStorage.setItem(key, JSON.stringify(overrides || {}));
  } catch {
    // ignore storage quota errors
  }
  try {
    const storeState = useAppStore.getState?.();
    if (typeof storeState?.patchData === 'function' && storeState?.appState?.activeId === scope) {
      storeState.patchData(() => ({
        coachManualFlagOverrides: { ...(overrides || {}) },
        ...(allFlags && typeof allFlags === 'object' ? { coachFeatureFlags: { ...allFlags } } : {}),
      }));
    }
  } catch {
    // ignore in isolated non-store test runs
  }
}

function getActiveContestSnapshot(contestId) {
  try {
    const scope = String(contestId || 'default');
    return useAppStore.getState?.()?.appState?.contests?.[scope] || null;
  } catch {
    return null;
  }
}

/**
 * Fixa overrides matemáticos experimentais ao aplicar preset/AutoTuner/rollback,
 * preservando eventuais overrides explícitos de outros lotes sem congelar flags de UI (Lote 13).
 */
function buildPinnedOverridesFromFlags(flags, existingManual = {}) {
  if (!flags || typeof flags !== 'object') return {};
  const pinned = {};
  if (existingManual && typeof existingManual === 'object') {
    for (const [k, v] of Object.entries(existingManual)) {
      if (typeof v === 'boolean' && isValidFeatureKey(k) && !EXPERIMENTAL_FLAG_SET.has(k)) {
        pinned[k] = v;
      }
    }
  }
  for (const [k, v] of Object.entries(flags)) {
    if (typeof v === 'boolean' && isValidFeatureKey(k) && EXPERIMENTAL_FLAG_SET.has(k)) {
      pinned[k] = v;
    }
  }
  return pinned;
}

function resolveControlCenterStorageKey(contestId) {
  if (contestId && typeof contestId === 'string' && contestId !== 'default') {
    return `${CONTROL_CENTER_STORAGE_KEY}:${contestId}`;
  }
  return CONTROL_CENTER_STORAGE_KEY;
}

// FIX: conjunto de abas válidas para validar estado persistido
const VALID_TABS = new Set(['overview', 'science', 'flags', 'health', 'causal', 'autotuner', 'backtest', 'llm']);

// FIX: valida shape do estado persistido (evita corromper a UI com dado inválido)
function loadControlCenterState(contestId) {
  try {
    const raw = localStorage.getItem(resolveControlCenterStorageKey(contestId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const state = {};
    if (typeof parsed.activeTab === 'string' && VALID_TABS.has(parsed.activeTab)) {
      state.activeTab = parsed.activeTab;
    }
    if (parsed.flagOverrides && typeof parsed.flagOverrides === 'object' && !Array.isArray(parsed.flagOverrides)) {
      const clean = {};
      for (const [k, v] of Object.entries(parsed.flagOverrides)) {
        if (typeof v === 'boolean') clean[k] = v;
      }
      state.flagOverrides = clean;
    }
    if (parsed.baselineFlags && typeof parsed.baselineFlags === 'object' && !Array.isArray(parsed.baselineFlags)) {
      const cleanBase = {};
      for (const [k, v] of Object.entries(parsed.baselineFlags)) {
        if (typeof v === 'boolean') cleanBase[k] = v;
      }
      state.baselineFlags = cleanBase;
    }
    return state;
  } catch {
    return null;
  }
}

function saveControlCenterState(state, contestId) {
  try {
    localStorage.setItem(resolveControlCenterStorageKey(contestId), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useCoachControlCenter({
  contestId,
  categories = [],
  simulados = [],
  studyLogs = [],
  maxScore = 100,
  minScore = 0,
  targetScore = 80,
  user = null,
  globalMcStats = null,
  simuladoRows = undefined,
  allSimulados = undefined,
  flashcardDecks = undefined,
  flashcardDue = undefined,
  coachPlan = undefined,
  coachPlanner = undefined,
  calibrationAuditLog = undefined,
  calibrationHistoryByCategory = undefined,
} = {}) {
  const resolvedContestId = contestId ?? getCoachFeatureContestScope();
  const isAdmin = isAdminUser(useAuth()?.currentUser || null);
  const [activeTab, setActiveTab] = useState(() => loadControlCenterState(resolvedContestId)?.activeTab || 'overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orchestratorResult, setOrchestratorResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [backtestReport, setBacktestReport] = useState(() => loadLastBacktestReport(resolvedContestId));
  const [lastBacktestDiag, setLastBacktestDiag] = useState(null);
  const [tunerHistory, setTunerHistory] = useState(() => {
    const h = loadTunerHistory(resolvedContestId);
    return Array.isArray(h) ? h : [];
  });
  const [tunerResult, setTunerResult] = useState(null);
  const [causalModel, setCausalModel] = useState(() => loadCausalModel(resolvedContestId));
  const [lastCausalDiag, setLastCausalDiag] = useState(null);
  const [healthSnapshots, setHealthSnapshots] = useState(() => {
    const s = loadModelHealthSnapshots(resolvedContestId);
    return Array.isArray(s) ? s : [];
  });
  const [currentFlags, setCurrentFlags] = useState(() => {
    const existing = readFlags(resolvedContestId);
    if (Object.keys(existing).length === 0) {
      loadPersistedCoachFlags(resolvedContestId, { silent: true });
    }
    if (isAdmin) {
      // silent: true evita disparar subscribeFlags -> setFlagRevision no pai (Coach.jsx) durante o render
      syncAdminCoachFlags(resolvedContestId, getActiveContestSnapshot(resolvedContestId), { silent: true });
    }
    return readFlags(resolvedContestId) || {};
  });
  const [flagOverrides, setFlagOverrides] = useState(() => loadControlCenterState(resolvedContestId)?.flagOverrides || {});
  const flagOverridesRef = useRef(flagOverrides);
  const [lastRunTimestamp, setLastRunTimestamp] = useState(null);
  const [cacheClearedAt, setCacheClearedAt] = useState(null);
  const [manualLockRevision, setManualLockRevision] = useState(0);

  const isMounted = useRef(true);
  // FIX: contador de execução para descartar resultados obsoletos
  const orchestratorRunIdRef = useRef(0);
  const orchestratorAbortRef = useRef(null);
  const tunerRunIdRef = useRef(0);
  const pendingRunsRef = useRef(0);
  const tunerAbortControllerRef = useRef(null);
  const lastRecordedBtSigRef = useRef(null);
  // FIX (A5): snapshot das flags no início da sessão — "Reset Overrides"
  // restaura este estado. Antes relia o storage (que já contém os toggles
  // persistidos por toggleFlag), tornando o reset um no-op.
  const initialFlagsRef = useRef((() => {
    const persistedState = loadControlCenterState(resolvedContestId);
    if (
      persistedState?.baselineFlags &&
      persistedState?.flagOverrides &&
      Object.keys(persistedState.flagOverrides).length > 0
    ) {
      return persistedState.baselineFlags;
    }
    return currentFlags;
  })());
  const prevContestIdRef = useRef(resolvedContestId);
  const syncedContestIdRef = useRef(resolvedContestId);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // FIX (M15): aborta AutoTuner e Orquestrador pendentes no unmount
  useEffect(() => () => {
    if (tunerAbortControllerRef.current) tunerAbortControllerRef.current.abort();
    if (orchestratorAbortRef.current) orchestratorAbortRef.current.abort();
  }, []);

  // FIX: sincroniza flags, overrides e dados auxiliares ao trocar de concurso
  useEffect(() => {
    if (prevContestIdRef.current === resolvedContestId) return;
    prevContestIdRef.current = resolvedContestId;
    syncedContestIdRef.current = null;

    // Aborta execuções pendentes do concurso anterior para evitar race conditions
    orchestratorRunIdRef.current += 1;
    tunerRunIdRef.current += 1;
    pendingRunsRef.current = 0;
    lastRecordedBtSigRef.current = null;
    if (orchestratorAbortRef.current) orchestratorAbortRef.current.abort();
    if (tunerAbortControllerRef.current) tunerAbortControllerRef.current.abort();

    const savedState = loadControlCenterState(resolvedContestId);
    const existingInStore = readFlags(resolvedContestId);
    if (Object.keys(existingInStore).length === 0) {
      loadPersistedCoachFlags(resolvedContestId, { silent: true });
    }
    if (isAdmin) {
      syncAdminCoachFlags(resolvedContestId, getActiveContestSnapshot(resolvedContestId), { silent: true });
    }
    const loadedFlags = readFlags(resolvedContestId) || {};
    const nextOverrides = savedState?.flagOverrides || {};
    flagOverridesRef.current = nextOverrides;
    initialFlagsRef.current =
      savedState?.baselineFlags && Object.keys(nextOverrides).length > 0
        ? savedState.baselineFlags
        : loadedFlags;
    let completed = false;
    const timer = setTimeout(() => {
      if (!isMounted.current) return;
      completed = true;
      syncedContestIdRef.current = resolvedContestId;
      setLoading(false);
      setCurrentFlags(loadedFlags);
      setFlagOverrides(nextOverrides);
      setActiveTab(savedState?.activeTab || 'overview');
      setBacktestReport(loadLastBacktestReport(resolvedContestId));
      setLastBacktestDiag(null);
      const h = loadTunerHistory(resolvedContestId);
      setTunerHistory(Array.isArray(h) ? h : []);
      setCausalModel(loadCausalModel(resolvedContestId));
      setLastCausalDiag(null);
      const s = loadModelHealthSnapshots(resolvedContestId);
      setHealthSnapshots(Array.isArray(s) ? s : []);
      setOrchestratorResult(null);
      setDashboard(null);
      setTunerResult(null);
      setLastRunTimestamp(null);
      setCacheClearedAt(null);
      setError(null);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (!completed) {
        // StrictMode re-mount: permite que o efeito rode novamente sem travar syncedContestIdRef em null
        prevContestIdRef.current = null;
      }
    };
  }, [resolvedContestId, isAdmin]);

  // Garante desbloqueio total imediato se a sessão Admin autenticar após o mount inicial
  useEffect(() => {
    if (!isAdmin) return;
    const res = syncAdminCoachFlags(resolvedContestId, getActiveContestSnapshot(resolvedContestId));
    if (!res?.changed) return;
    const timer = setTimeout(() => {
      if (!isMounted.current) return;
      const latestFlags = readFlags(resolvedContestId) || {};
      setCurrentFlags(latestFlags);
      if (Object.keys(flagOverridesRef.current || {}).length === 0) {
        initialFlagsRef.current = latestFlags;
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isAdmin, resolvedContestId]);

  // Mantém currentFlags sincronizado com alterações externas no coachFeatureStore
  useEffect(() => {
    if (typeof subscribeFlags !== 'function') return undefined;
    return subscribeFlags((snapshot, scope) => {
      if (!isMounted.current) return;
      if (!scope || scope === resolvedContestId) {
        setCurrentFlags(snapshot && typeof snapshot === 'object' ? { ...snapshot } : {});
      }
    });
  }, [resolvedContestId]);

  // ==========================================================
  // Salvar estado quando mudar
  // ==========================================================
  useEffect(() => {
    if (syncedContestIdRef.current !== resolvedContestId) return;
    saveControlCenterState(
      { activeTab, flagOverrides, baselineFlags: initialFlagsRef.current },
      resolvedContestId
    );
  }, [activeTab, flagOverrides, resolvedContestId]);

  // ==========================================================
  // Executar orquestrador completo
  // ==========================================================
  const runOrchestrator = useCallback(async (options = {}) => {
    // FIX: registra esta execução; resultados de execuções anteriores são descartados
    const runId = ++orchestratorRunIdRef.current;
    // FIX (BUG-22): abortar execução anterior
    if (orchestratorAbortRef.current) orchestratorAbortRef.current.abort();
    const abortController = new AbortController();
    orchestratorAbortRef.current = abortController;
    pendingRunsRef.current += 1;
    setLoading(true);
    setError(null);
    try {
      const mergedFeatures = {
        ...currentFlags,
        ...flagOverrides,
        ...(options.features || {}),
        // PATCH: orquestrador configurável; clique explícito (force: true) sempre executa
        useCoachOrchestrator:
          options.force === true
            ? true
            : (options.features?.useCoachOrchestrator ?? flagOverrides.useCoachOrchestrator ?? currentFlags?.useCoachOrchestrator ?? true),
      };
      const targetContestId = options.contestId ?? resolvedContestId;
      const contestSnap = getActiveContestSnapshot(targetContestId);
      const effectiveRunLLM =
        typeof options.runLLM === 'boolean'
          ? options.runLLM
          : Boolean(mergedFeatures.useLLMExplanations || mergedFeatures.useOrchestratorLLM);
      const effectiveRunAutoTuner =
        typeof options.runAutoTuner === 'boolean'
          ? options.runAutoTuner
          : Boolean(mergedFeatures.useAutoTuner || mergedFeatures.useOrchestratorAutoTuner);

      const result = await runCoachOrchestrator(
        { categories, simulados, studyLogs },
        {
          contestId: targetContestId,
          maxScore,
          minScore,
          targetScore,
          user: user ?? contestSnap?.user,
          globalMcStats: globalMcStats ?? undefined,
          simuladoRows: simuladoRows ?? contestSnap?.simuladoRows,
          allSimulados: allSimulados ?? contestSnap?.simulados,
          flashcardDecks: flashcardDecks ?? contestSnap?.flashcardDecks,
          ...(flashcardDue !== undefined ? { flashcardDue } : {}),
          coachPlan: coachPlan ?? contestSnap?.coachPlan,
          coachPlanner: coachPlanner ?? contestSnap?.coachPlanner,
          calibrationAuditLog: calibrationAuditLog ?? contestSnap?.calibrationAuditLog,
          calibrationHistoryByCategory: calibrationHistoryByCategory ?? contestSnap?.calibrationHistoryByCategory,
          features: mergedFeatures,
          runHealth: options.runHealth !== false,
          runLLM: effectiveRunLLM,
          runAutoTuner: effectiveRunAutoTuner,
          autoApplyTuner: options.autoApplyTuner === true,
          forceApplyTuner: options.forceApplyTuner === true,
          trainCausalModel: options.trainCausalModel === true,
          saveHealthSnapshots: options.saveHealthSnapshots ?? (options.runHealth !== false),
          force: options.force === true,
          signal: abortController.signal,
          config: {
            contestId: targetContestId,
            MC_ENABLE_ADAPTIVE_CALIBRATION: contestSnap?.settings?.adaptiveCalibrationEnabled !== false,
          },
        }
      );
      if (abortController.signal.aborted) return null;
      // FIX: valida mount, execução mais recente e mesmo concurso
      if (isMounted.current && runId === orchestratorRunIdRef.current && targetContestId === resolvedContestId) {
        if (result && typeof result === 'object') {
          if (result.aborted) return null;
          if (result.ok === false) {
            setOrchestratorResult(result.skipped ? result : null);
            setDashboard(null);
            setError(result.error || result.reason || 'Falha ao executar orquestrador.');
          } else {
            // Preserva telemetrias anteriores (health, llmExplanation, tuner, causal) em execuções parciais
            // (ex.: botão "Gerar Explicação LLM" com runHealth: false / runAutoTuner: false).
            const updatedHealth = loadModelHealthSnapshots(targetContestId);
            const fallbackHealth = (Array.isArray(updatedHealth) && updatedHealth.length > 0)
              ? updatedHealth[updatedHealth.length - 1]
              : null;
            const updatedCausal = loadCausalModel(targetContestId);
            const fallbackCausal =
              !result.causal?.available && updatedCausal && Number(updatedCausal.sampleSize ?? updatedCausal.global?.sampleSize ?? 0) > 0
                ? {
                    available: true,
                    model: {
                      generatedAt: updatedCausal.generatedAt ?? null,
                      sampleSize: updatedCausal.sampleSize ?? updatedCausal.global?.sampleSize ?? null,
                      treatedCount: updatedCausal.global?.treatedCount ?? null,
                      method: updatedCausal.global?.method ?? updatedCausal.method ?? null,
                      globalUplift: updatedCausal.global?.uplift ?? null,
                      ci: updatedCausal.global?.ci ?? null,
                      actionCount: updatedCausal.actions ? Object.keys(updatedCausal.actions).length : 0,
                    },
                  }
                : null;

            setOrchestratorResult((prev) => {
              const preservedHealth = result.health ?? prev?.health ?? fallbackHealth;
              const preservedLlm =
                result.llmExplanation ??
                (options.runLLM === false ? prev?.llmExplanation ?? null : null);
              const preservedTuner =
                result.tuner ??
                (effectiveRunAutoTuner === false ? prev?.tuner ?? null : null);
              const preservedCausal =
                result.causal?.available
                  ? result.causal
                  : (prev?.causal?.available ? prev.causal : (fallbackCausal ?? result.causal));
              const nextFocus =
                result.focus && preservedLlm && !result.focus.urgency?.llmExplanation
                  ? {
                      ...result.focus,
                      urgency: result.focus.urgency
                        ? { ...result.focus.urgency, llmExplanation: preservedLlm }
                        : result.focus.urgency,
                    }
                  : result.focus;
              const merged = {
                ...result,
                focus: nextFocus,
                health: preservedHealth || null,
                llmExplanation: preservedLlm,
                tuner: preservedTuner,
                causal: preservedCausal,
              };
              setDashboard(buildCoachOrchestratorDashboard(merged));
              return merged;
            });

            if (Array.isArray(updatedHealth) && updatedHealth.length > 0) {
              setHealthSnapshots(updatedHealth);
            } else if (result.health) {
              setHealthSnapshots([result.health]);
            }
            if (updatedCausal) {
              setCausalModel(updatedCausal);
            }
            if (result.tuner) {
              setTunerResult(result.tuner);
              const h = loadTunerHistory(targetContestId);
              setTunerHistory(Array.isArray(h) ? h : []);
            }
          }
        } else {
          setOrchestratorResult(null);
          setDashboard(null);
          setError('Orquestrador retornou resultado inválido.');
        }
        setLastRunTimestamp(Date.now());
      }
      return result;
    } catch (err) {
      if (err?.name === 'AbortError') return null;
      if (isMounted.current && runId === orchestratorRunIdRef.current) {
        const msg = err?.message || String(err);
        setError(msg);
      }
      return null;
    } finally {
      pendingRunsRef.current = Math.max(0, pendingRunsRef.current - 1);
      if (isMounted.current && pendingRunsRef.current === 0) setLoading(false);
    }
  }, [categories, simulados, studyLogs, maxScore, minScore, targetScore, user, globalMcStats, simuladoRows, allSimulados, flashcardDecks, flashcardDue, coachPlan, coachPlanner, calibrationAuditLog, calibrationHistoryByCategory, currentFlags, flagOverrides, resolvedContestId]);

  // ==========================================================
  // Carregar dados auxiliares (somente leitura: nunca sobrescreve store em memória)
  // ==========================================================
  const loadAuxiliaryData = useCallback(() => {
    try {
      const bt = loadLastBacktestReport(resolvedContestId);
      setBacktestReport(bt);
      const history = loadTunerHistory(resolvedContestId);
      setTunerHistory(Array.isArray(history) ? history : []);
      const causal = loadCausalModel(resolvedContestId);
      setCausalModel(causal);
      const health = loadModelHealthSnapshots(resolvedContestId);
      setHealthSnapshots(Array.isArray(health) ? health : []);
      const inMemory = readFlags(resolvedContestId);
      const persisted = loadPersistedCoachFlags(resolvedContestId, { applyToStore: false });
      const activeFlags = Object.keys(inMemory || {}).length > 0 ? inMemory : (persisted || {});
      setCurrentFlags(activeFlags);
    } catch (err) {
      console.warn('[ControlCenter] Failed to load auxiliary data:', err);
    }
  }, [resolvedContestId]);


  // ==========================================================
  // Executar AutoTuner
  // ==========================================================
  const runAutoTuner = useCallback(async (options = {}) => {
    if (tunerAbortControllerRef.current) {
      tunerAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    tunerAbortControllerRef.current = abortController;
    const runId = ++tunerRunIdRef.current;
    pendingRunsRef.current += 1;
    setLoading(true);
    setError(null);
    const targetContestId = options.contestId ?? resolvedContestId;
    try {
      const result = await runCoachAutoTuner({
        contestId: targetContestId,
        maxScore,
        minScore,
        currentFeatures: { ...currentFlags, ...flagOverrides },
        force: options.force === true,
        autoApply: options.autoApply === true,
        forceApply: options.forceApply === true,
        exploration: options.exploration === true,
        minImprovement: options.minImprovement ?? 0.02,
        signal: abortController.signal,
      });
      if (abortController.signal.aborted) return null;
      // FIX: valida mount + execução atual + mesmo concurso
      if (!isMounted.current || runId !== tunerRunIdRef.current) return null;
      if (targetContestId === resolvedContestId) {
        setTunerResult(result);
        loadAuxiliaryData();
        if (result?.applied) {
          clearCoachCaches();
          const flags = loadPersistedCoachFlags(resolvedContestId, { applyToStore: false }) || readFlags(resolvedContestId) || {};
          const existingManual = readManualFlagOverrides(resolvedContestId, getActiveContestSnapshot(resolvedContestId));
          persistManualFlagOverrides(buildPinnedOverridesFromFlags(flags, existingManual), resolvedContestId, flags);
          setManualLockRevision((r) => r + 1);
          setCurrentFlags(flags);
          flagOverridesRef.current = {};
          setFlagOverrides({});
          initialFlagsRef.current = flags;
        }
      }
      return result;
    } catch (err) {
      if (err?.name === 'AbortError' || abortController.signal.aborted) return null;
      if (isMounted.current && runId === tunerRunIdRef.current) {
        const msg = err?.message || String(err);
        setError(msg);
      }
      return null;
    } finally {
      pendingRunsRef.current = Math.max(0, pendingRunsRef.current - 1);
      if (isMounted.current && pendingRunsRef.current === 0) setLoading(false);
    }
  }, [maxScore, minScore, loadAuxiliaryData, resolvedContestId, currentFlags, flagOverrides]);

  // ==========================================================
  // Aplicar recomendação de flags
  // ==========================================================
  const applyRecommendation = useCallback((recommendation, options = {}) => {
    try {
      const targetContestId = options.contestId ?? resolvedContestId;
      const applied = applyRecommendedFlags(recommendation, {
        force: options.force === true,
        contestId: targetContestId,
      });
      if (applied) {
        clearCoachCaches();
        const flags = loadPersistedCoachFlags(targetContestId, { applyToStore: false }) || readFlags(targetContestId) || {};
        const existingManual = readManualFlagOverrides(targetContestId, getActiveContestSnapshot(targetContestId));
        persistManualFlagOverrides(buildPinnedOverridesFromFlags(flags, existingManual), targetContestId, flags);
        setManualLockRevision((r) => r + 1);
        if (targetContestId === resolvedContestId) {
          setCurrentFlags(flags);
          flagOverridesRef.current = {};
          setFlagOverrides({});
          initialFlagsRef.current = flags;
          setTunerResult((prev) => {
            if (!prev) return prev;
            const matchesRec =
              !options.fromPreset ||
              (recommendation?.strategyId && prev.recommendation?.strategyId === recommendation.strategyId);
            return { ...prev, applied: Boolean(matchesRec) };
          });
        }
      }
      return applied;
    } catch (err) {
      console.warn('[ControlCenter] Failed to apply recommendation:', err);
      return false;
    }
  }, [resolvedContestId]);

  const applyStrategyPreset = useCallback((strategy) => {
    if (!strategy || typeof strategy !== 'object') return false;
    const isBaseline = strategy.id === 'baseline';
    return applyRecommendation(
      {
        action: isBaseline ? 'rollback' : 'promote',
        strategyId: strategy.id,
        features: strategy.features || {},
      },
      { force: true, fromPreset: true }
    );
  }, [applyRecommendation]);

  // ==========================================================
  // Rollback para baseline
  // ==========================================================
  const rollbackToBaseline = useCallback(() => {
    try {
      const current = readFlags(resolvedContestId);
      const baseline = getSafeBaselineFeatures();
      const next = { ...current, ...baseline };
      replaceFlags(next, resolvedContestId);
      persistCoachFlags(next, resolvedContestId);
      const existingManual = readManualFlagOverrides(resolvedContestId, getActiveContestSnapshot(resolvedContestId));
      persistManualFlagOverrides(buildPinnedOverridesFromFlags(next, existingManual), resolvedContestId, next);
      setManualLockRevision((r) => r + 1);
      clearCoachCaches();
      setCurrentFlags(next);
      flagOverridesRef.current = {};
      setFlagOverrides({});
      initialFlagsRef.current = next;
      setTunerResult((prev) => (prev?.applied ? { ...prev, applied: false } : prev));
      return true;
    } catch {
      return false;
    }
  }, [resolvedContestId]);

  // ==========================================================
  // Toggle de flag individual
  // ==========================================================
  const toggleFlag = useCallback((flagKey, value) => {
    // FIX: só aceita chave válida do registry + valor boolean
    if (typeof flagKey !== 'string' || typeof value !== 'boolean' || !isValidFeatureKey(flagKey)) return;

    const prevOverrides = flagOverridesRef.current || {};
    const baseVal = Boolean(initialFlagsRef.current?.[flagKey]);
    let computedNextOverrides;
    if (value === baseVal && flagKey in prevOverrides) {
      computedNextOverrides = { ...prevOverrides };
      delete computedNextOverrides[flagKey];
    } else {
      computedNextOverrides = {
        ...prevOverrides,
        [flagKey]: value,
      };
    }
    flagOverridesRef.current = computedNextOverrides;
    setFlagOverrides(computedNextOverrides);

    const next = writeFlags({ [flagKey]: value }, resolvedContestId);
    persistCoachFlags(next, resolvedContestId);
    const existingManual = readManualFlagOverrides(resolvedContestId, getActiveContestSnapshot(resolvedContestId));
    const mergedManual = { ...existingManual, ...computedNextOverrides };
    if (!(flagKey in computedNextOverrides)) {
      delete mergedManual[flagKey];
    }
    persistManualFlagOverrides(mergedManual, resolvedContestId, next);
    setManualLockRevision((r) => r + 1);
    setCurrentFlags(next);
    setTunerResult((prev) => (prev?.applied ? { ...prev, applied: false } : prev));
    clearCoachCaches();
  }, [resolvedContestId]);

  // ==========================================================
  // Reset overrides da sessão
  // ==========================================================
  const resetOverrides = useCallback(() => {
    flagOverridesRef.current = {};
    setFlagOverrides({});
    const hasInitialKeys =
      initialFlagsRef.current &&
      typeof initialFlagsRef.current === 'object' &&
      Object.keys(initialFlagsRef.current).length > 0;
    const base = isAdmin
      ? { ...ALL_UNLOCKED_COACH_FLAGS }
      : (hasInitialKeys ? { ...initialFlagsRef.current } : getSafeBaselineFeatures());
    if (isAdmin) {
      initialFlagsRef.current = base;
    }
    replaceFlags(base, resolvedContestId);
    persistCoachFlags(base, resolvedContestId);
    persistManualFlagOverrides({}, resolvedContestId, base);
    setManualLockRevision((r) => r + 1);
    setCurrentFlags(base);
    setTunerResult((prev) => (prev?.applied ? { ...prev, applied: false } : prev));
    clearCoachCaches();
  }, [resolvedContestId, isAdmin]);

  // ==========================================================
  // Desbloquear modo automático (Maturidade Adaptativa N0 → N5)
  // ==========================================================
  const restoreAutomaticFlags = useCallback(() => {
    flagOverridesRef.current = {};
    setFlagOverrides({});
    persistManualFlagOverrides({}, resolvedContestId);
    const contestSnap = getActiveContestSnapshot(resolvedContestId) || {
      categories,
      simuladoRows: simuladoRows ?? simulados,
      studyLogs,
      calibrationAuditLog,
    };
    const baseline = getSafeBaselineFeatures();
    replaceFlags(baseline, resolvedContestId, { silent: true });
    const syncRes = syncAdaptiveFeatureFlags(contestSnap, resolvedContestId, {
      isAdmin,
      respectOverrides: false,
    });
    if (isAdmin) {
      syncAdminCoachFlags(resolvedContestId, contestSnap, { respectOverrides: false });
    }
    const next = readFlags(resolvedContestId) || syncRes?.finalFlags || baseline;
    persistCoachFlags(next, resolvedContestId);
    persistManualFlagOverrides({}, resolvedContestId, next);
    setManualLockRevision((r) => r + 1);
    initialFlagsRef.current = next;
    setCurrentFlags(next);
    setTunerResult((prev) => (prev?.applied ? { ...prev, applied: false } : prev));
    clearCoachCaches();
    return next;
  }, [resolvedContestId, isAdmin, categories, simuladoRows, simulados, studyLogs, calibrationAuditLog]);

  // ==========================================================
  // Restaurar painéis Lote 13 ocultos (previne auto-bloqueio de abas)
  // ==========================================================
  const restoreHiddenPanels = useCallback(() => {
    const panelPatch = {};
    LOT13_PANEL_FLAGS.forEach((k) => {
      panelPatch[k] = true;
    });
    const nextOverrides = { ...(flagOverridesRef.current || {}) };
    LOT13_PANEL_FLAGS.forEach((k) => {
      delete nextOverrides[k];
    });
    flagOverridesRef.current = nextOverrides;
    setFlagOverrides(nextOverrides);

    const existingManual = readManualFlagOverrides(resolvedContestId, getActiveContestSnapshot(resolvedContestId));
    LOT13_PANEL_FLAGS.forEach((k) => {
      delete existingManual[k];
    });

    const nextFlags = writeFlags(panelPatch, resolvedContestId);
    persistCoachFlags(nextFlags, resolvedContestId);
    persistManualFlagOverrides(existingManual, resolvedContestId, nextFlags);
    setManualLockRevision((r) => r + 1);
    setCurrentFlags(nextFlags);
    return nextFlags;
  }, [resolvedContestId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==========================================================
  // Limpar caches
  // ==========================================================
  const handleClearCaches = useCallback(() => {
    clearCoachCaches();
    setCacheClearedAt(Date.now());
  }, []);

  // ==========================================================
  // Executar Backtest Granular
  // ==========================================================
  const runBacktest = useCallback((options = {}) => {
    const execute = () => {
      try {
        setError(null);
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        const rawSims = Array.isArray(simulados) ? simulados : [];
        const safeSims = mergeSimuladosWithCategoryHistory(safeCats, rawSims);
        const contestSnap = getActiveContestSnapshot(resolvedContestId);
        const report = runGranularCoachBacktest(safeCats, safeSims, studyLogs, {
          maxScore,
          minScore,
          targetScore,
          contestId: resolvedContestId,
          coachPlan: coachPlan ?? contestSnap?.coachPlan,
          coachPlanner: coachPlanner ?? contestSnap?.coachPlanner,
        });
        if (report && typeof report === 'object') {
          const totalEvaluations = Object.values(report.summaries || {}).reduce(
            (acc, s) => acc + (Number(s?.count) || 0),
            0
          );
          const existingSaved = loadLastBacktestReport(resolvedContestId);
          if (totalEvaluations > 0 || !existingSaved) {
            saveBacktestReport(report, resolvedContestId);
          }

          // Conecta o pipeline de avaliação e aprendizado do otimizador (Thompson Sampling) sem inflar duplicatas
          if (totalEvaluations > 0) {
            try {
              const rawPreferred =
                report.raw?.['all-lots'] ||
                report.raw?.['all-math-lots'] ||
                report.raw?.baseline ||
                [];
              rawPreferred.slice(-20).forEach((ev) => {
                if (ev && typeof ev === 'object') {
                  saveEvaluationResult(ev, resolvedContestId);
                }
              });

              const btSig = Object.entries(report.summaries || {})
                .map(([id, s]) => `${id}:${s?.count || 0}:${Number(s?.probability?.avgBrier ?? -1).toFixed(4)}:${Number(s?.score?.mae ?? -1).toFixed(2)}`)
                .join('|');
              if (lastRecordedBtSigRef.current !== btSig) {
                lastRecordedBtSigRef.current = btSig;
                Object.entries(report.summaries || {}).forEach(([stratId, summary]) => {
                  if (!summary || (summary.count || 0) <= 0) return;
                  const scored = scoreStrategyEvaluation(summary, null, { maxScore, minScore });
                  if (Number.isFinite(scored?.final)) {
                    recordStrategyOutcome(stratId, scored.final, { contestId: resolvedContestId });
                  }
                });
              }
            } catch {
              // telemetry best-effort
            }
          }

          if (isMounted.current) {
            setLastBacktestDiag({
              totalEvaluations,
              simuladoCount: safeSims.length,
              ranAt: Date.now(),
            });
            setBacktestReport((prev) => (totalEvaluations > 0 || !prev ? report : prev));
          }
        }
        return report;
      } catch (err) {
        if (isMounted.current) {
          setError(err?.message || String(err));
        }
        return null;
      } finally {
        pendingRunsRef.current = Math.max(0, pendingRunsRef.current - 1);
        if (isMounted.current && pendingRunsRef.current === 0) setLoading(false);
      }
    };

    pendingRunsRef.current += 1;
    setLoading(true);
    if (options?.defer === true) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(execute()), 0);
      });
    }
    return execute();
  }, [categories, simulados, studyLogs, maxScore, minScore, targetScore, coachPlan, coachPlanner, resolvedContestId]);

  // ==========================================================
  // Treinar Modelo Causal
  // ==========================================================
  const trainCausal = useCallback((options = {}) => {
    const execute = () => {
      try {
        setError(null);
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        const rawSims = Array.isArray(simulados) ? simulados : [];
        const safeSims = mergeSimuladosWithCategoryHistory(safeCats, rawSims);
        const contestSnap = getActiveContestSnapshot(resolvedContestId);
        const events = buildCausalEventsFromHistory(safeCats, safeSims, studyLogs, {
          maxScore,
          minScore,
          coachPlan: coachPlan ?? contestSnap?.coachPlan,
          coachPlanner: coachPlanner ?? contestSnap?.coachPlanner,
        });
        const model = trainCausalModel(events, {
          contestId: resolvedContestId,
          maxScore,
          minScore,
          useBootstrap: Boolean(flagOverrides?.useCausalBootstrap ?? currentFlags?.useCausalBootstrap),
          save: events.length > 0,
        });
        if (isMounted.current) {
          setLastCausalDiag({
            eventsCount: events.length,
            simuladoCount: safeSims.length,
            trainedAt: Date.now(),
          });
          if (model) {
            setCausalModel((prev) => (model.sampleSize > 0 || !prev ? model : prev));
          }
        }
        return model;
      } catch (err) {
        if (isMounted.current) {
          setError(err?.message || String(err));
        }
        return null;
      } finally {
        pendingRunsRef.current = Math.max(0, pendingRunsRef.current - 1);
        if (isMounted.current && pendingRunsRef.current === 0) setLoading(false);
      }
    };

    pendingRunsRef.current += 1;
    setLoading(true);
    if (options?.defer === true) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(execute()), 0);
      });
    }
    return execute();
  }, [categories, simulados, studyLogs, maxScore, minScore, coachPlan, coachPlanner, resolvedContestId, currentFlags, flagOverrides]);

  // ==========================================================
  // Dados derivados
  // ==========================================================
  const strategySpace = useMemo(() => getStrategySpace(), []);

  const hasPinnedOverrides = useMemo(() => {
    void manualLockRevision;
    void currentFlags;
    const manual = readManualFlagOverrides(resolvedContestId, getActiveContestSnapshot(resolvedContestId));
    return Boolean(manual && Object.keys(manual).length > 0);
  }, [resolvedContestId, manualLockRevision, currentFlags]);

  const latestHealth = useMemo(() => {
    if (healthSnapshots.length > 0) return healthSnapshots[healthSnapshots.length - 1];
    return orchestratorResult?.health || null;
  }, [healthSnapshots, orchestratorResult]);

  const hasError = error !== null;
  const isSkipped = orchestratorResult?.skipped === true;
  const isReady = !loading && orchestratorResult !== null && !isSkipped;

  return {
    // Estado
    activeTab,
    setActiveTab,
    loading,
    error,
    hasError,
    isReady,
    lastRunTimestamp,
    cacheClearedAt,
    // Dados principais
    orchestratorResult,
    dashboard,
    backtestReport,
    lastBacktestDiag,
    tunerHistory,
    tunerResult,
    causalModel,
    lastCausalDiag,
    healthSnapshots,
    latestHealth,
    currentFlags,
    flagOverrides,
    hasPinnedOverrides,
    strategySpace,
    // Ações
    runOrchestrator,
    runAutoTuner,
    runBacktest,
    trainCausal,
    applyRecommendation,
    applyStrategyPreset,
    rollbackToBaseline,
    toggleFlag,
    resetOverrides,
    restoreAutomaticFlags,
    restoreHiddenPanels,
    clearError,
    clearCaches: handleClearCaches,
    reloadData: loadAuxiliaryData,
  };
}

export default useCoachControlCenter;
