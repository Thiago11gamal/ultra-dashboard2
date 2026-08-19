import { useState, useCallback, useMemo, useEffect } from 'react';
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

const CONTROL_CENTER_STORAGE_KEY = 'coach_control_center_state_v1';

function loadControlCenterState() {
  try {
    const raw = localStorage.getItem(CONTROL_CENTER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
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

  // ==========================================================
  // Carregar estado persistido
  // ==========================================================
  useEffect(() => {
    const persisted = loadControlCenterState();
    if (persisted) {
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
    setLoading(true);
    setError(null);

    try {
      const mergedFeatures = {
        ...currentFlags,
        ...flagOverrides,
        useCoachOrchestrator: true,
        ...(options.features || {}),
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

      // ✅ FIX: Validar result e dash
      if (result) {
        setOrchestratorResult(result);
        const dash = buildCoachOrchestratorDashboard(result);
        if (dash) setDashboard(dash);
      }

      setLastRunTimestamp(Date.now());

      return result;
    } catch (err) {
      const msg = err?.message || String(err);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
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
    loadAuxiliaryData();
  }, [loadAuxiliaryData]);

  // ==========================================================
  // Executar AutoTuner
  // ==========================================================
  const runAutoTuner = useCallback(async (options = {}) => {
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
      });

      setTunerResult(result);
      loadAuxiliaryData();

      if (result?.applied) {
        clearCoachCaches();
        const flags = loadPersistedCoachFlags();
        setCurrentFlags(flags || {});
      }

      return result;
    } catch (err) {
      const msg = err?.message || String(err);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
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
      const next = {
        ...(globalThis.__COACH_FEATURES__ || {}),
        ...baseline,
      };

      globalThis.__COACH_FEATURES__ = next;
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
    setFlagOverrides((prev) => ({
      ...prev,
      [flagKey]: value,
    }));

    const next = {
      ...(globalThis.__COACH_FEATURES__ || {}),
      [flagKey]: value,
    };

    globalThis.__COACH_FEATURES__ = next;
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
