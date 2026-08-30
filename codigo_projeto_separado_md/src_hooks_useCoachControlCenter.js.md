# src\hooks\useCoachControlCenter.js

```js
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  runCoachOrchestrator,
  buildCoachOrchestratorDashboard,
  clearCoachCaches,
} from '../utils/coachPipeline.js';
import {
  loadLastBacktestReport,
  loadTunerHistory,
  runCoachAutoTuner,
  applyRecommendedFlags,
  loadPersistedCoachFlags,
  persistCoachFlags,
  getSafeBaselineFeatures,
  getStrategySpace,
} from '../utils/coachOptimizer.js';
import {
  loadCausalModel,
} from '../utils/coachCausal.js';
import {
  loadModelHealthSnapshots,
} from '../utils/coachObservability.js';
import { replaceFlags, writeFlags } from '../utils/coachFeatureStore.js';

const CONTROL_CENTER_STORAGE_KEY = 'coach_control_center_state_v1';

// FIX: conjunto de abas válidas para validar estado persistido
const VALID_TABS = new Set(['overview', 'flags', 'health', 'causal', 'autotuner', 'backtest']);

// FIX: valida shape do estado persistido (evita corromper a UI com dado inválido)
function loadControlCenterState() {
  try {
    const raw = localStorage.getItem(CONTROL_CENTER_STORAGE_KEY);
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
    return state;
  } catch {
    return null;
  }
}

function saveControlCenterState(state) {
  try {
    localStorage.setItem(CONTROL_CENTER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useCoachControlCenter({
  categories = [],
  simulados = [],
  studyLogs = [],
  maxScore = 100,
  targetScore = 80,
} = {}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orchestratorResult, setOrchestratorResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [backtestReport, setBacktestReport] = useState(null);
  const [tunerHistory, setTunerHistory] = useState([]);
  const [tunerResult, setTunerResult] = useState(null);
  const [causalModel, setCausalModel] = useState(null);
  const [healthSnapshots, setHealthSnapshots] = useState([]);
  const [currentFlags, setCurrentFlags] = useState({});
  const [flagOverrides, setFlagOverrides] = useState({});
  const [lastRunTimestamp, setLastRunTimestamp] = useState(null);

  const isMounted = useRef(true);
  // FIX: contador de execução para descartar resultados obsoletos
  const orchestratorRunIdRef = useRef(0);
  const tunerRunIdRef = useRef(0);
  const tunerAbortControllerRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ==========================================================
  // Carregar estado persistido
  // ==========================================================
  useEffect(() => {
    const persisted = loadControlCenterState();
    if (persisted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (persisted.activeTab) setActiveTab(persisted.activeTab);
      if (persisted.flagOverrides) setFlagOverrides(persisted.flagOverrides);
    }
    const flags = loadPersistedCoachFlags();
    setCurrentFlags(flags || {});
  }, []);

  // ==========================================================
  // Salvar estado quando mudar
  // ==========================================================
  useEffect(() => {
    saveControlCenterState({ activeTab, flagOverrides });
  }, [activeTab, flagOverrides]);

  // ==========================================================
  // Executar orquestrador completo
  // ==========================================================
  const runOrchestrator = useCallback(async (options = {}) => {
    // FIX: registra esta execução; resultados de execuções anteriores são descartados
    const runId = ++orchestratorRunIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const mergedFeatures = {
        ...currentFlags,
        ...flagOverrides,
        ...(options.features || {}),
        // PATCH: orquestrador configurável
        useCoachOrchestrator: (options.features?.useCoachOrchestrator ?? flagOverrides.useCoachOrchestrator ?? true),
      };
      const result = await runCoachOrchestrator(
        { categories, simulados, studyLogs },
        {
          maxScore,
          targetScore,
          features: mergedFeatures,
          runHealth: options.runHealth !== false,
          runLLM: options.runLLM === true,
          runAutoTuner: options.runAutoTuner === true,
          trainCausalModel: options.trainCausalModel === true,
          saveHealthSnapshots: options.saveHealthSnapshots === true,
          force: true,
        }
      );
      // FIX: valida mount E que esta ainda é a execução mais recente
      if (isMounted.current && runId === orchestratorRunIdRef.current && result) {
        setOrchestratorResult(result);
        const dash = buildCoachOrchestratorDashboard(result);
        if (dash) setDashboard(dash);
      }
      if (isMounted.current && runId === orchestratorRunIdRef.current) setLastRunTimestamp(Date.now());
      return result;
    } catch (err) {
      if (isMounted.current && runId === orchestratorRunIdRef.current) {
        const msg = err?.message || String(err);
        setError(msg);
      }
      return null;
    } finally {
      if (isMounted.current && runId === orchestratorRunIdRef.current) setLoading(false);
    }
  }, [categories, simulados, studyLogs, maxScore, targetScore, currentFlags, flagOverrides]);

  // ==========================================================
  // Carregar dados auxiliares
  // ==========================================================
  const loadAuxiliaryData = useCallback(() => {
    try {
      const bt = loadLastBacktestReport();
      setBacktestReport(bt);
      const history = loadTunerHistory();
      setTunerHistory(Array.isArray(history) ? history : []);
      const causal = loadCausalModel();
      setCausalModel(causal);
      const health = loadModelHealthSnapshots();
      setHealthSnapshots(Array.isArray(health) ? health : []);
      const flags = loadPersistedCoachFlags();
      setCurrentFlags(flags || {});
    } catch (err) {
      console.warn('[ControlCenter] Failed to load auxiliary data:', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAuxiliaryData();
  }, [loadAuxiliaryData]);

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
    setLoading(true);
    setError(null);
    try {
      const result = await runCoachAutoTuner({
        maxScore,
        force: true,
        autoApply: options.autoApply === true,
        forceApply: options.forceApply === true,
        exploration: options.exploration === true,
        minImprovement: options.minImprovement ?? 0.02,
        signal: abortController.signal,
      });
      // FIX: valida mount + execução atual
      if (!isMounted.current || runId !== tunerRunIdRef.current) return null;
      setTunerResult(result);
      loadAuxiliaryData();
      if (result?.applied) {
        clearCoachCaches();
        const flags = loadPersistedCoachFlags();
        setCurrentFlags(flags || {});
      }
      return result;
    } catch (err) {
      if (isMounted.current && runId === tunerRunIdRef.current) {
        const msg = err?.message || String(err);
        setError(msg);
      }
      return null;
    } finally {
      if (isMounted.current && runId === tunerRunIdRef.current) setLoading(false);
    }
  }, [maxScore, loadAuxiliaryData]);

  // ==========================================================
  // Aplicar recomendação de flags
  // ==========================================================
  const applyRecommendation = useCallback((recommendation, options = {}) => {
    try {
      const applied = applyRecommendedFlags(recommendation, {
        force: options.force === true,
      });
      if (applied) {
        clearCoachCaches();
        const flags = loadPersistedCoachFlags();
        setCurrentFlags(flags || {});
      }
      return applied;
    } catch (err) {
      console.warn('[ControlCenter] Failed to apply recommendation:', err);
      return false;
    }
  }, []);

  // ==========================================================
  // Rollback para baseline
  // ==========================================================
  const rollbackToBaseline = useCallback(() => {
    try {
      const baseline = getSafeBaselineFeatures();
      const next = { ...baseline };
      replaceFlags(next);
      persistCoachFlags(next);
      clearCoachCaches();
      setCurrentFlags(next);
      setFlagOverrides({});
      return true;
    } catch {
      return false;
    }
  }, []);

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
    const next = writeFlags({ [flagKey]: value });
    persistCoachFlags(next);
    setCurrentFlags(next);
  }, []);

  // ==========================================================
  // Reset overrides
  // ==========================================================
  const resetOverrides = useCallback(() => {
    setFlagOverrides({});
    const flags = loadPersistedCoachFlags();
    setCurrentFlags(flags || {});
  }, []);

  // ==========================================================
  // Limpar caches
  // ==========================================================
  const handleClearCaches = useCallback(() => {
    clearCoachCaches();
  }, []);

  // ==========================================================
  // Dados derivados
  // ==========================================================
  const strategySpace = useMemo(() => getStrategySpace(), []);

  const latestHealth = useMemo(() => {
    if (healthSnapshots.length === 0) return null;
    return healthSnapshots[healthSnapshots.length - 1];
  }, [healthSnapshots]);

  const hasError = error !== null;
  const isReady = !loading && orchestratorResult !== null;

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
    applyRecommendation,
    rollbackToBaseline,
    toggleFlag,
    resetOverrides,
    handleClearCaches,
  };
}

export default useCoachControlCenter;


```
