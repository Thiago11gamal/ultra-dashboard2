import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
} from '../utils/coachPipeline.js';
import {
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
} from '../utils/coachEvaluation.js';
import {
  loadCausalModel,
  buildCausalEventsFromHistory,
  trainCausalModel,
} from '../utils/coachCausal.js';
import {
  loadModelHealthSnapshots,
} from '../utils/coachObservability.js';
import { replaceFlags, writeFlags, readFlags, getCoachFeatureContestScope } from '../utils/coachFeatureStore.js';

const CONTROL_CENTER_STORAGE_KEY = 'coach_control_center_state_v1';

function resolveControlCenterStorageKey(contestId) {
  if (contestId && typeof contestId === 'string' && contestId !== 'default') {
    return `${CONTROL_CENTER_STORAGE_KEY}:${contestId}`;
  }
  return CONTROL_CENTER_STORAGE_KEY;
}

// FIX: conjunto de abas válidas para validar estado persistido
const VALID_TABS = new Set(['overview', 'flags', 'health', 'causal', 'autotuner', 'backtest', 'llm']);

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
} = {}) {
  const resolvedContestId = contestId ?? getCoachFeatureContestScope();
  const [activeTab, setActiveTab] = useState(() => loadControlCenterState(resolvedContestId)?.activeTab || 'overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orchestratorResult, setOrchestratorResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [backtestReport, setBacktestReport] = useState(() => loadLastBacktestReport(resolvedContestId));
  const [tunerHistory, setTunerHistory] = useState(() => {
    const h = loadTunerHistory(resolvedContestId);
    return Array.isArray(h) ? h : [];
  });
  const [tunerResult, setTunerResult] = useState(null);
  const [causalModel, setCausalModel] = useState(() => loadCausalModel(resolvedContestId));
  const [healthSnapshots, setHealthSnapshots] = useState(() => {
    const s = loadModelHealthSnapshots(resolvedContestId);
    return Array.isArray(s) ? s : [];
  });
  const [currentFlags, setCurrentFlags] = useState(() => loadPersistedCoachFlags(resolvedContestId, { silent: true }) || {});
  const [flagOverrides, setFlagOverrides] = useState(() => loadControlCenterState(resolvedContestId)?.flagOverrides || {});
  const [lastRunTimestamp, setLastRunTimestamp] = useState(null);

  const isMounted = useRef(true);
  // FIX: contador de execução para descartar resultados obsoletos
  const orchestratorRunIdRef = useRef(0);
  const orchestratorAbortRef = useRef(null);
  const tunerRunIdRef = useRef(0);
  const pendingRunsRef = useRef(0);
  const tunerAbortControllerRef = useRef(null);
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

    const savedState = loadControlCenterState(resolvedContestId);
    const loadedFlags = loadPersistedCoachFlags(resolvedContestId) || {};
    const nextOverrides = savedState?.flagOverrides || {};
    initialFlagsRef.current =
      savedState?.baselineFlags && Object.keys(nextOverrides).length > 0
        ? savedState.baselineFlags
        : loadedFlags;
    const timer = setTimeout(() => {
      if (!isMounted.current) return;
      syncedContestIdRef.current = resolvedContestId;
      setCurrentFlags(loadedFlags);
      setFlagOverrides(nextOverrides);
      setActiveTab(savedState?.activeTab || 'overview');
      setBacktestReport(loadLastBacktestReport(resolvedContestId));
      const h = loadTunerHistory(resolvedContestId);
      setTunerHistory(Array.isArray(h) ? h : []);
      setCausalModel(loadCausalModel(resolvedContestId));
      const s = loadModelHealthSnapshots(resolvedContestId);
      setHealthSnapshots(Array.isArray(s) ? s : []);
      setOrchestratorResult(null);
      setDashboard(null);
      setTunerResult(null);
      setError(null);
    }, 0);
    return () => clearTimeout(timer);
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
        // PATCH: orquestrador configurável
        useCoachOrchestrator: (options.features?.useCoachOrchestrator ?? flagOverrides.useCoachOrchestrator ?? currentFlags?.useCoachOrchestrator ?? true),
      };
      const targetContestId = options.contestId ?? resolvedContestId;
      const result = await runCoachOrchestrator(
        { categories, simulados, studyLogs },
        {
          contestId: targetContestId,
          maxScore,
          minScore,
          targetScore,
          features: mergedFeatures,
          runHealth: options.runHealth !== false,
          runLLM: options.runLLM === true,
          runAutoTuner: options.runAutoTuner === true,
          trainCausalModel: options.trainCausalModel === true,
          saveHealthSnapshots: options.saveHealthSnapshots ?? (options.runHealth !== false),
          force: options.force === true,
          signal: abortController.signal,
        }
      );
      if (abortController.signal.aborted) return null;
      // FIX: valida mount E que esta ainda é a execução mais recente
      if (isMounted.current && runId === orchestratorRunIdRef.current) {
        if (result && typeof result === 'object') {
          if (result.aborted) return null;
          if (result.ok === false) {
            setOrchestratorResult(null);
            setDashboard(null);
            setError(result.error || 'Falha ao executar orquestrador.');
          } else {
            setOrchestratorResult(result);
            const dash = buildCoachOrchestratorDashboard(result);
            setDashboard(dash || null);
            const updatedHealth = loadModelHealthSnapshots(targetContestId);
            if (Array.isArray(updatedHealth) && updatedHealth.length > 0) {
              setHealthSnapshots(updatedHealth);
            } else if (result.health) {
              setHealthSnapshots([result.health]);
            }
            const updatedCausal = loadCausalModel(targetContestId);
            if (updatedCausal) {
              setCausalModel(updatedCausal);
            }
          }
        } else {
          setOrchestratorResult(null);
          setDashboard(null);
          setError('Orquestrador retornou resultado inválido.');
        }
      }
      if (isMounted.current && runId === orchestratorRunIdRef.current) setLastRunTimestamp(Date.now());
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
  }, [categories, simulados, studyLogs, maxScore, minScore, targetScore, currentFlags, flagOverrides, resolvedContestId]);

  // ==========================================================
  // Carregar dados auxiliares
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
      const flags = loadPersistedCoachFlags(resolvedContestId);
      setCurrentFlags(flags || {});
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
    try {
      const result = await runCoachAutoTuner({
        contestId: options.contestId ?? resolvedContestId,
        maxScore,
        minScore,
        force: options.force === true,
        autoApply: options.autoApply === true,
        forceApply: options.forceApply === true,
        exploration: options.exploration === true,
        minImprovement: options.minImprovement ?? 0.02,
        signal: abortController.signal,
      });
      if (abortController.signal.aborted) return null;
      // FIX: valida mount + execução atual
      if (!isMounted.current || runId !== tunerRunIdRef.current) return null;
      setTunerResult(result);
      loadAuxiliaryData();
      if (result?.applied) {
        clearCoachCaches();
        const flags = loadPersistedCoachFlags(resolvedContestId) || {};
        setCurrentFlags(flags);
        setFlagOverrides({});
        initialFlagsRef.current = flags;
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
  }, [maxScore, minScore, loadAuxiliaryData, resolvedContestId]);

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
        const flags = loadPersistedCoachFlags(targetContestId) || {};
        setCurrentFlags(flags);
        setFlagOverrides({});
        initialFlagsRef.current = flags;
      }
      return applied;
    } catch (err) {
      console.warn('[ControlCenter] Failed to apply recommendation:', err);
      return false;
    }
  }, [resolvedContestId]);

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
      clearCoachCaches();
      setCurrentFlags(next);
      setFlagOverrides({});
      initialFlagsRef.current = next;
      return true;
    } catch {
      return false;
    }
  }, [resolvedContestId]);

  // ==========================================================
  // Toggle de flag individual
  // ==========================================================
  const toggleFlag = useCallback((flagKey, value) => {
    // FIX: só aceita chave string + valor boolean
    if (typeof flagKey !== 'string' || typeof value !== 'boolean') return;

    setFlagOverrides((prev) => ({
      ...prev,
      [flagKey]: value,
    }));
    const next = writeFlags({ [flagKey]: value }, resolvedContestId);
    persistCoachFlags(next, resolvedContestId);
    setCurrentFlags(next);
    clearCoachCaches();
  }, [resolvedContestId]);

  // ==========================================================
  // Reset overrides
  // ==========================================================
  const resetOverrides = useCallback(() => {
    setFlagOverrides({});
    const base = initialFlagsRef.current || getSafeBaselineFeatures();
    replaceFlags(base, resolvedContestId);
    persistCoachFlags(base, resolvedContestId);
    setCurrentFlags(base);
    clearCoachCaches();
  }, [resolvedContestId]);

  // ==========================================================
  // Limpar caches
  // ==========================================================
  const handleClearCaches = useCallback(() => {
    clearCoachCaches();
  }, []);

  // ==========================================================
  // Executar Backtest Granular
  // ==========================================================
  const runBacktest = useCallback(() => {
    try {
      setError(null);
      const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
      const safeSims = Array.isArray(simulados) && simulados.length > 0
        ? simulados
        : safeCats.flatMap((cat) => {
          const hist = Array.isArray(cat?.simuladoStats?.history)
            ? cat.simuladoStats.history
            : Object.values(cat?.simuladoStats?.history || {});
          return hist.map((entry) => ({
            ...entry,
            categoryId: entry?.categoryId ?? cat?.id,
            subject: entry?.subject || entry?.categoryName || cat?.name || '',
          }));
        });
      const report = runGranularCoachBacktest(safeCats, safeSims, studyLogs, {
        maxScore,
        minScore,
        targetScore,
        contestId: resolvedContestId,
      });
      if (report && typeof report === 'object') {
        saveBacktestReport(report, resolvedContestId);
        if (isMounted.current) {
          setBacktestReport(report);
        }
      }
      return report;
    } catch (err) {
      if (isMounted.current) {
        setError(err?.message || String(err));
      }
      return null;
    }
  }, [categories, simulados, studyLogs, maxScore, minScore, targetScore, resolvedContestId]);

  // ==========================================================
  // Treinar Modelo Causal
  // ==========================================================
  const trainCausal = useCallback(() => {
    try {
      setError(null);
      const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
      const safeSims = Array.isArray(simulados) && simulados.length > 0
        ? simulados
        : safeCats.flatMap((cat) => {
          const hist = Array.isArray(cat?.simuladoStats?.history)
            ? cat.simuladoStats.history
            : Object.values(cat?.simuladoStats?.history || {});
          return hist.map((entry) => ({
            ...entry,
            categoryId: entry?.categoryId ?? cat?.id,
            subject: entry?.subject || entry?.categoryName || cat?.name || '',
          }));
        });
      const events = buildCausalEventsFromHistory(safeCats, safeSims, studyLogs, {
        maxScore,
        minScore,
      });
      const model = trainCausalModel(events, {
        contestId: resolvedContestId,
        maxScore,
        minScore,
        useBootstrap: Boolean(currentFlags?.useCausalBootstrap || flagOverrides?.useCausalBootstrap),
        save: true,
      });
      if (isMounted.current && model) {
        setCausalModel(model);
      }
      return model;
    } catch (err) {
      if (isMounted.current) {
        setError(err?.message || String(err));
      }
      return null;
    }
  }, [categories, simulados, studyLogs, maxScore, minScore, resolvedContestId, currentFlags, flagOverrides]);

  // ==========================================================
  // Dados derivados
  // ==========================================================
  const strategySpace = useMemo(() => getStrategySpace(), []);

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
  // Dados principais
  orchestratorResult,
  dashboard,
  backtestReport,
  tunerHistory,
  tunerResult,
  causalModel,
  healthSnapshots,
  latestHealth,
  currentFlags,
  flagOverrides,
  strategySpace,
  // Ações
  runOrchestrator,
  loadAuxiliaryData,
  runAutoTuner,
  runBacktest,
  trainCausal,
  applyRecommendation,
  rollbackToBaseline,
  toggleFlag,
  resetOverrides,
  handleClearCaches,
};
}

export default useCoachControlCenter;

