import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Brain, Zap, AlertCircle, ArrowUpRight, ShieldCheck, Dna, List, BookOpen, Database
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMonteCarloStats } from '../hooks/useMonteCarloStats';
import { calculateAdaptiveSlope } from '../engine/projection.js';
import PageHeader from '../components/header/PageHeader';
import AICoachView from '../components/AICoachView';
import CoachMenuNav from '../components/coach/CoachMenuNav';
import MonteCarloDebugger from '../components/MonteCarloDebugger';
import ReliabilityCurveChart from '../components/charts/ReliabilityCurveChart';
import { getFlashcardDueTodayCount } from '../utils/analytics';
import { useSubscription } from '../hooks/useSubscription';
import { getSafeId } from '../utils/idGenerator';
import { useAuth } from '../context/useAuth';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import {
  getSuggestedFocus, generateDailyGoals, clearMcCache,
  clearUrgencyCache, clearTopicsCache, getCombinedHistory
} from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import {
  logCalibrationTelemetryEvent,
  getCalibrationTelemetrySummary,
  clearCalibrationTelemetry
} from '../utils/calibrationTelemetry';
import {
  CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD, ALERT_COOLDOWN_MS,
  backfillObservedFromSimulados, computeRollingCalibrationParams,
  recordPredictionEvent, buildCalibrationDashboardSeries
} from '../utils/calibration.js';
import { displaySubject } from '../utils/displaySubject';
import { formatDatePtBR, formatDateTimePtBR } from '../utils/dateHelper';
import { getCalibrationKey } from '../utils/coachSafe.js';

const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45;
const CALIBRATION_ALERT_CACHE_MAX = 200;
const BRIER_VISUAL_MAX = 0.35;
const BRIER_VISUAL_CRIT = 0.25;
const BRIER_VISUAL_WARN = 0.18;
const CALIBRATION_EVENTS_MAX = 300;
const LEARNING_EVENT_STALE_MS = 6 * 3600000;

const EMPTY_ARRAY = Object.freeze([]);

function normalizeToArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return EMPTY_ARRAY;
}
function sanitizeMaxScore(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 100;
}
// ✅ FIX: elimina "-0.0" (zero negativo do toFixed) em displays de tendência/volatilidade
function formatSigned(value, digits = 1) {
  const n = Number(value) || 0;
  const fixed = n.toFixed(digits);
  return fixed === `-${(0).toFixed(digits)}` ? (0).toFixed(digits) : fixed;
}
function resolveTargetScorePoints({ user, minScore = 0, maxScore = 100 }) {
  const safeMax = sanitizeMaxScore(maxScore);
  const safeMin = Math.max(0, Math.min(Number(minScore) || 0, safeMax));
  const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number(value) || 0));
  if (user?.targetScore != null && user.targetScore !== '' && Number.isFinite(Number(user.targetScore))) {
    let ts = Number(user.targetScore);
    const isPercent = user.targetScoreType === 'percent';
    if (isPercent) {
      ts = (ts / 100) * safeMax;
    }
    return clamp(ts);
  }
  if (user?.targetProbability != null && user.targetProbability !== '' && Number.isFinite(Number(user.targetProbability))) {
    return clamp((Number(user.targetProbability) / 100) * safeMax);
  }
  return clamp(safeMax * 0.8);
}

export default function Coach() {
  const calibrationAlertCacheRef = useRef(new Map());
  const activeId = useAppStore(state => state.appState.activeId);
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  const data = useAppStore(useShallow(state => {
    const contest = state.appState?.contests?.[state.appState?.activeId] || {};
    return {
      simuladoRows: contest.simuladoRows,
      simulados: contest.simulados,
      categories: contest.categories,
      flashcardDecks: contest.flashcardDecks,
      user: contest.user,
      calibrationHistoryByCategory: contest.calibrationHistoryByCategory,
      calibrationOps: contest.calibrationOps,
      calibrationAuditLog: contest.calibrationAuditLog,
      calibrationEvents: contest.calibrationEvents,
      maxScore: contest.maxScore,
      minScore: contest.minScore,
      studyLogs: contest.studyLogs,
      settings: contest.settings,
      coachPlan: contest.coachPlan,
      coachPlanner: contest.coachPlanner
    };
  }));
  const isHydrated = useAppStore(state => state.appState.isHydrated);
  const setData = useAppStore(state => state.setData);
  const showToast = useToast();
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);
  const rawHistory = data?.simuladoRows || EMPTY_ARRAY;
  const history = useMemo(() => normalizeToArray(rawHistory), [rawHistory]);
  const rawSimulados = data?.simulados || EMPTY_ARRAY;
  const simulados = useMemo(() => normalizeToArray(rawSimulados), [rawSimulados]);
  const rawCategories = data?.categories || EMPTY_ARRAY;
  const categories = useMemo(() =>
    normalizeToArray(rawCategories).map(c => ({
      ...c,
      tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
    })),
    [rawCategories]
  );
  const rawFlashcardDecks = data?.flashcardDecks || EMPTY_ARRAY;
  const flashcardDecks = useMemo(() => normalizeToArray(rawFlashcardDecks), [rawFlashcardDecks]);
  const rawStudyLogs = data?.studyLogs || EMPTY_ARRAY;
  const studyLogs = useMemo(() => normalizeToArray(rawStudyLogs), [rawStudyLogs]);
  const flashcardDue = useMemo(() => getFlashcardDueTodayCount(flashcardDecks), [flashcardDecks]);
  const { currentUser } = useAuth();
  const userProfile = data?.user;
  const updateCoachScore = useAppStore(state => state.updateCoachScore);
  const { isPremium } = useSubscription(currentUser || userProfile);
  const navigate = useNavigate();
  const isPremiumBool = Boolean(isPremium);
  const [activeTab, setActiveTab] = useState('insights');
  const safeActiveTab = (activeTab === 'analytics' && isPremiumBool) ? 'analytics' : 'insights';
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [coachLoading, setCoachLoading] = useState(false);
  const [suggestedFocus, setSuggestedFocus] = useState(null);
  const timeoutRef = useRef(null);
  const lastPushedScoreRef = useRef(null);
  const calibrationHistoryRef = useRef(data?.calibrationHistoryByCategory || {});
  const isMountedRef = useRef(true);
  const idleCallbackIdsRef = useRef([]);
  const rafIdsRef = useRef([]);
  const lastPersistByCategoryRef = useRef(new Map());
  const calibrationEventsRef = useRef(data?.calibrationEvents || []);
  useEffect(() => { calibrationEventsRef.current = data?.calibrationEvents || []; }, [data?.calibrationEvents]);

  const cancelPendingCalibrationWork = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    idleCallbackIdsRef.current.forEach(id => {
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(id);
    });
    idleCallbackIdsRef.current = [];
    rafIdsRef.current = [];
    setTimeout(() => {
      if (isMountedRef.current) setCoachLoading(false);
    }, 0);
  }, []);

  useEffect(() => {
    clearMcCache();
    clearUrgencyCache();
    clearTopicsCache();
    calibrationAlertCacheRef.current.clear();
    lastPersistByCategoryRef.current.clear();
    cancelPendingCalibrationWork();
  }, [activeId, cancelPendingCalibrationWork]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelPendingCalibrationWork();
    };
  }, [cancelPendingCalibrationWork]);

  useEffect(() => {
    calibrationHistoryRef.current = data?.calibrationHistoryByCategory || {};
  }, [data?.calibrationHistoryByCategory]);

  const persistCalibrationMetric = useCallback((metric) => {
    if (!isMountedRef.current || !metric) return;
    if (metric.contestId != null && metric.contestId !== activeIdRef.current) return;
    const now = Date.now();
    const rawCategoryId = metric?.categoryId || metric?.categoryName;
    if (!rawCategoryId) return;
    const normalizedCategoryId = getCalibrationKey(rawCategoryId);
    const toFinite = (value, fallback = null) => {
      if (value === null || value === undefined || value === '') return fallback;
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };
    const metricTimestamp = metric?.timestamp && Number.isFinite(Number(metric.timestamp)) && Number(metric.timestamp) > 100000000000
      ? Number(metric.timestamp)
      : now;
    const avgBrier = toFinite(metric?.avgBrier, null);
    const ece = toFinite(metric?.ece, null);
    const probability = toFinite(metric?.probability, null);
    const calibrationPenalty = toFinite(metric?.calibrationPenalty, 0);
    const reliability = Array.isArray(metric?.reliability) ? metric.reliability : [];
    const isDegraded = metric?.degraded === true || calibrationPenalty >= HIGH_PENALTY_THRESHOLD;
    const hasUsefulSignal =
      avgBrier !== null || ece !== null || probability !== null ||
      calibrationPenalty > 0 || reliability.length > 0;
    if (!hasUsefulSignal) return;
    const lastAt = Number(lastPersistByCategoryRef.current.get(normalizedCategoryId) || 0);
    if (now - lastAt < 500) return;
    lastPersistByCategoryRef.current.set(normalizedCategoryId, now);
    if (lastPersistByCategoryRef.current.size > 200) {
      const oldestKey = lastPersistByCategoryRef.current.keys().next().value;
      lastPersistByCategoryRef.current.delete(oldestKey);
    }
    const normalizedMetric = {
      ...metric,
      categoryId: normalizedCategoryId,
      categoryName: metric?.categoryName || normalizedCategoryId,
      timestamp: metricTimestamp,
      avgBrier, ece, probability, calibrationPenalty, reliability
    };
    let wasPersisted = false;
    setData(prev => {
      if (!prev) return prev;
      const current = prev.calibrationHistoryByCategory || {};
      const categoryHistory = current[normalizedCategoryId] || [];
      const lastEntry = categoryHistory[categoryHistory.length - 1];
      const hasComparableLast = lastEntry && Number.isFinite(Number(lastEntry?.timestamp));
      if (hasComparableLast) {
        const metricDelta = (currentValue, previousValue) => {
          const currentFinite = currentValue !== null && currentValue !== undefined && currentValue !== '' && Number.isFinite(Number(currentValue));
          const previousFinite = previousValue !== null && previousValue !== undefined && previousValue !== '' && Number.isFinite(Number(previousValue));
          if (currentFinite && previousFinite) return Math.abs(Number(previousValue) - Number(currentValue));
          if (!currentFinite && !previousFinite) return 0;
          return Infinity;
        };
        const toReliabilitySignature = (bucketList = []) =>
          (Array.isArray(bucketList) ? bucketList : [])
            .map((bucket) => {
              const meanPred = Number(bucket?.meanPred);
              const observedRate = Number(bucket?.observedRate);
              const gap = Number(bucket?.gap);
              const count = Number(bucket?.count) || 0;
              return `${count}|${Number.isFinite(meanPred) ? meanPred.toFixed(3) : 'na'}|${Number.isFinite(observedRate) ? observedRate.toFixed(3) : 'na'}|${Number.isFinite(gap) ? gap.toFixed(3) : 'na'}`;
            })
            .join('::');
        const brierDelta = metricDelta(avgBrier, lastEntry.avgBrier);
        const eceDelta = metricDelta(ece, lastEntry.ece);
        const penaltyDelta = Math.abs(Number(lastEntry.calibrationPenalty || 0) - calibrationPenalty);
        const probabilityDelta = metricDelta(probability, lastEntry.probability);
        const reliabilitySignatureChanged =
          toReliabilitySignature(lastEntry?.reliability) !== toReliabilitySignature(reliability);
        const shouldSkipPersist =
          (brierDelta < 0.001 && (brierDelta / Math.max(0.001, lastEntry.avgBrier)) < 0.05) &&
          (eceDelta < 0.001 && (eceDelta / Math.max(0.001, lastEntry.ece)) < 0.05) &&
          penaltyDelta < 0.001 &&
          probabilityDelta < 0.01 &&
          !reliabilitySignatureChanged;
        if (shouldSkipPersist) return prev;
      }
      const cutoff = now - CALIBRATION_HISTORY_RETENTION_MS;
      const cleaned = categoryHistory.filter(
        item => Number.isFinite(Number(item?.timestamp)) && Number(item.timestamp) >= cutoff
      );
      const nextHistory = [...cleaned, normalizedMetric].slice(-60);
      const recent7 = nextHistory.filter(
        item => Number(item?.timestamp || 0) >= (metricTimestamp - 1000 * 60 * 60 * 24 * 7)
      );
      const recent7Brier = recent7
        .map(item => toFinite(item?.avgBrier, null))
        .filter(val => val !== null);
      const avgBrier7d = recent7Brier.length > 0
        ? recent7Brier.reduce((acc, val) => acc + val, 0) / recent7Brier.length
        : null;
      const calibrationOps = {
        ...(prev.calibrationOps || {}),
        [normalizedCategoryId]: {
          categoryName: normalizedMetric.categoryName,
          avgBrier7d: Number.isFinite(avgBrier7d) ? Number(avgBrier7d.toFixed(4)) : null,
          sample7d: recent7.length,
          degraded: isDegraded,
          updatedAt: now
        }
      };
      const { reliability: _reliability, ...auditMetric } = normalizedMetric;
      const auditCutoff = now - CALIBRATION_HISTORY_RETENTION_MS;
      const calibrationAuditLog = [...(prev.calibrationAuditLog || []), {
        ...auditMetric,
        avgBrier7d: Number.isFinite(avgBrier7d) ? Number(avgBrier7d.toFixed(4)) : null,
        degraded: isDegraded,
        source: 'coach'
      }]
        .filter(e => Number.isFinite(Number(e?.timestamp)) && Number(e.timestamp) >= auditCutoff)
        .slice(-500);
      wasPersisted = true;
      return {
        calibrationHistoryByCategory: {
          ...(prev.calibrationHistoryByCategory || {}),
          [normalizedCategoryId]: nextHistory
        },
        calibrationOps,
        calibrationAuditLog
      };
    });
    if (!wasPersisted) return;
    try {
      if (normalizedMetric.calibrationPenalty >= HIGH_PENALTY_THRESHOLD) {
        logCalibrationTelemetryEvent({ ...normalizedMetric, eventType: 'high_penalty_alert' });
      } else {
        logCalibrationTelemetryEvent(normalizedMetric);
      }
    } catch (error) {
      console.warn('[Coach.jsx] Falha ao registrar telemetria de calibração:', error);
    }
    if (isDegraded) {
      const currentTime = Date.now();
      for (const [key, ts] of calibrationAlertCacheRef.current.entries()) {
        if (currentTime - ts > ALERT_COOLDOWN_MS) calibrationAlertCacheRef.current.delete(key);
      }
      const lastAlertAt = Number(calibrationAlertCacheRef.current.get(normalizedCategoryId) || 0);
      if (currentTime - lastAlertAt > ALERT_COOLDOWN_MS) {
        const brierLabel = avgBrier !== null ? Number(avgBrier).toFixed(2) : '—';
        const severityLabel = (avgBrier !== null && avgBrier >= CRITICAL_BRIER_THRESHOLD)
          ? 'CRÍTICA'
          : 'degradada';
        showToastRef.current(
          `⚠️ Calibração ${severityLabel} em ${displaySubject(normalizedMetric.categoryName || 'categoria')} (Brier ${brierLabel}).`,
          'warning'
        );
        calibrationAlertCacheRef.current.set(normalizedCategoryId, currentTime);
        if (calibrationAlertCacheRef.current.size > CALIBRATION_ALERT_CACHE_MAX) {
          const oldestKey = calibrationAlertCacheRef.current.keys().next().value;
          calibrationAlertCacheRef.current.delete(oldestKey);
        }
      }
    }
  }, [setData]);

  const scheduleCalibrationPersist = useCallback((metrics) => {
    metrics.forEach((metric) => {
      if ('requestIdleCallback' in window) {
        let id;
        id = window.requestIdleCallback(() => {
          idleCallbackIdsRef.current = idleCallbackIdsRef.current.filter(cbId => cbId !== id);
          persistCalibrationMetric(metric);
        }, { timeout: 2000 });
        idleCallbackIdsRef.current.push(id);
      } else {
        let rafId;
        rafId = requestAnimationFrame(() => {
          rafIdsRef.current = rafIdsRef.current.filter(cbId => cbId !== rafId);
          persistCalibrationMetric(metric);
        });
        rafIdsRef.current.push(rafId);
      }
    });
  }, [persistCalibrationMetric]);

  const runLearningCycle = useCallback((rawEvents, simuladosArr, maxScore) => {
    const backfilled = backfillObservedFromSimulados(rawEvents, simuladosArr, [], maxScore);
    const rolling = computeRollingCalibrationParams(backfilled, {});
    return { backfilled, rolling };
  }, []);

  const commitLearningCycle = useCallback((rawEvents, backfilled, newEvents = []) => {
    const pool = [...backfilled];
    const fresh = [];
    (newEvents || []).forEach(ev => {
      if (!ev || !Number.isFinite(Number(ev.probability)) || !ev.category) return;
      const catKey = getCalibrationKey(ev.category);
      const lastEv = [...pool, ...fresh].reverse().find(e => getCalibrationKey(e?.category) === catKey);
      const isStale = Boolean(lastEv) &&
        Math.abs(Number(lastEv.probability ?? -1) - Number(ev.probability)) <= 0.005 &&
        (Date.now() - Number(lastEv?.timestamp || 0)) <= LEARNING_EVENT_STALE_MS;
      if (!isStale) fresh.push(ev);
    });
    const backfillChanged =
      backfilled.length !== rawEvents.length ||
      backfilled.some((e, i) => e !== rawEvents[i]);
    if (fresh.length === 0 && !backfillChanged) return;
    setData(() => ({
      calibrationEvents: [...backfilled, ...fresh].slice(-CALIBRATION_EVENTS_MAX)
    }));
  }, [setData]);

  const currentMaxScore = sanitizeMaxScore(data?.maxScore);
  const combinedHistory = useMemo(
    () => getCombinedHistory(history, simulados, currentMaxScore),
    [history, simulados, currentMaxScore]
  );
  const targetScorePoints = useMemo(() => resolveTargetScorePoints({
    user: userProfile,
    minScore: data?.minScore,
    maxScore: currentMaxScore
  }), [userProfile, data?.minScore, currentMaxScore]);
  const targetScoreLabel = useMemo(() => {
    const safeMax = sanitizeMaxScore(currentMaxScore);
    return Math.round((targetScorePoints / safeMax) * 100);
  }, [targetScorePoints, currentMaxScore]);

  const mcStats = useMonteCarloStats({
    categories,
    goalDate: userProfile?.goalDate,
    targetScore: targetScorePoints,
    timeIndex: -1,
    // FIX: array estável congelado
    timelineDates: EMPTY_ARRAY,
    minScore: data?.minScore ?? 0,
    maxScore: currentMaxScore,
    simuladoRows: history
  });
  const projectedScore = mcStats?.projectedMean;
  const volatility = mcStats?.statsData?.pooledSD ?? mcStats?.sd ?? 0;
  const safeVolatility = Number.isFinite(volatility) ? volatility : 0;
  const normalizedVolatility = useMemo(() => {
    const denom = Math.max(1, Number(currentMaxScore) || 1);
    return (safeVolatility / denom) * 100;
  }, [safeVolatility, currentMaxScore]);
  const drift = useMemo(() => {
    const slope = calculateAdaptiveSlope(combinedHistory, currentMaxScore);
    return Number.isFinite(slope) ? slope : 0;
  }, [combinedHistory, currentMaxScore]);
  const totalSimulados = useMemo(() => combinedHistory.length, [combinedHistory]);
  const mcStatsContext = useMemo(() => ({
    projectedMean: mcStats?.projectedMean,
    probability: mcStats?.probability,
    statsData: mcStats?.statsData,
    sd: mcStats?.sd
  }), [mcStats?.projectedMean, mcStats?.probability, mcStats?.statsData, mcStats?.sd]);
  const mcStatsContextRef = useRef(mcStatsContext);
  useEffect(() => { mcStatsContextRef.current = mcStatsContext; }, [mcStatsContext]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!Array.isArray(categories) || categories.length === 0) {
      setTimeout(() => {
        if (isMountedRef.current) setIsAnalyzing(false);
      }, 0);
      return;
    }
    const timers = { analysis: null, metrics: null };
    timers.analysis = setTimeout(() => {
      try {
        const targetScore = targetScorePoints;
        const collectedMetrics = [];
        const contestId = activeIdRef.current;
        const rawEvents = calibrationEventsRef.current || [];
        const { backfilled: backfilledEvents, rolling } = runLearningCycle(rawEvents, history, currentMaxScore);
        const result = getSuggestedFocus(
          categories, history, studyLogs,
          {
            user: data.user,
            targetScore,
            targetScoreLabel,
            maxScore: currentMaxScore,
            calibrationHistoryByCategory: calibrationHistoryRef.current,
            flashcardDecks,
            flashcardDue,
            onCalibrationMetric: (metric) => collectedMetrics.push({ ...metric, contestId }),
            globalMcStats: mcStatsContextRef.current,
            config: {
              MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false,
              userId: activeIdRef.current,
              ...(Number.isFinite(rolling?.baseline) && (rolling.confidenceFactor || 0) > 0 ? {
                MC_CALIBRATION_BRIER_BASELINE: rolling.baseline,
                MC_CALIBRATION_MAX_PENALTY: rolling.maxPenalty
              } : {})
            }
          }
        );
        const _mcCtx = mcStatsContextRef.current;
        if (result && _mcCtx && Number.isFinite(Number(_mcCtx.projectedMean))) {
          result.globalMcContext = {
            projectedMean: Number(Number(_mcCtx.projectedMean).toFixed(1)),
            probability: Number.isFinite(Number(_mcCtx.probability))
              ? Number(Number(_mcCtx.probability).toFixed(1))
              : null,
            source: 'useMonteCarloStats'
          };
        }
        setSuggestedFocus(result);
        const mcFocus = result?.urgency?.monteCarlo || result?.urgency?.details?.monteCarlo;
        const focusCat = result?.categoryId || result?.id || result?.name;
        const newEvents = [];
        if (mcFocus && Number.isFinite(Number(mcFocus.probability)) && focusCat) {
          newEvents.push(recordPredictionEvent({
            probability: Number(mcFocus.probability) / 100,
            probabilityRaw: Number(mcFocus.probabilityRaw ?? mcFocus.probability) / 100,
            targetScore,
            category: focusCat,
            sims: mcFocus?.diagnostics?.simulationCount
          }));
        }
        commitLearningCycle(rawEvents, backfilledEvents, newEvents);
        if (collectedMetrics.length > 0) {
          timers.metrics = setTimeout(() => {
            scheduleCalibrationPersist(collectedMetrics);
          }, 1000);
        }
      } catch (error) {
        console.error('[Coach.jsx] Falha ao calcular suggestedFocus:', error);
        setSuggestedFocus(null);
        showToastRef.current('Falha ao processar a análise do Coach.', 'error');
      } finally {
        setIsAnalyzing(false);
      }
    }, 0);
    return () => {
      clearTimeout(timers.analysis);
      clearTimeout(timers.metrics);
    };
  }, [
    isHydrated, data?.user, data?.settings?.adaptiveCalibrationEnabled,
    userProfile?.targetProbability, flashcardDue, flashcardDecks,
    scheduleCalibrationPersist, targetScorePoints,
    currentMaxScore, targetScoreLabel, categories, history, studyLogs,
    runLearningCycle, commitLearningCycle
  ]);

  useEffect(() => {
    if (!Number.isFinite(projectedScore)) return;
    if (
      lastPushedScoreRef.current === null ||
      Math.abs(projectedScore - lastPushedScoreRef.current) > 0.01
    ) {
      lastPushedScoreRef.current = projectedScore;
      const timer = setTimeout(() => {
        if (updateCoachScore) updateCoachScore(projectedScore);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [projectedScore, updateCoachScore]);

  const handleChangeTab = useCallback((tab) => {
    const nextTab = (tab === 'analytics' && isPremiumBool) ? 'analytics' : 'insights';
    setActiveTab(nextTab);
  }, [isPremiumBool]);

  const userData = data?.user;
  const settingsData = data?.settings;

  const handleGenerateGoals = useCallback(() => {
    if (categories.length === 0 || coachLoading) return;
    setCoachLoading(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (!isMountedRef.current) return;
      try {
        const targetScore = targetScorePoints;
        const collectedMetrics = [];
        const contestId = activeIdRef.current;
        const newTasks = generateDailyGoals(
          categories, history, studyLogs,
          {
            user: userData,
            targetScore,
            targetScoreLabel,
            maxScore: currentMaxScore,
            calibrationHistoryByCategory: calibrationHistoryRef.current,
            onCalibrationMetric: (metric) => collectedMetrics.push({ ...metric, contestId }),
            config: {
              MC_ENABLE_ADAPTIVE_CALIBRATION: settingsData?.adaptiveCalibrationEnabled !== false,
              userId: activeIdRef.current
            }
          }
        );
        if (Array.isArray(newTasks) && newTasks.length) {
          setData((prev) => {
            const nextPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
            const prevPlanner = prev?.coachPlanner || {};
            const availableNewIds = new Set(newTasks.map(t => getSafeId(t)).filter(Boolean));
            
            Object.keys(nextPlanner).forEach(day => {
              nextPlanner[day] = (Array.isArray(prevPlanner[day]) ? prevPlanner[day] : Object.values(prevPlanner[day] || {}))
                .filter(t => availableNewIds.has(getSafeId(t)));
            });

            return {
              coachPlan: newTasks,
              coachPlanner: nextPlanner
            };
          });
          showToastRef.current('Sugestões geradas!', 'success');
        } else {
          showToastRef.current('Nenhuma sugestão necessária.', 'info');
        }
        const rawEvents = calibrationEventsRef.current || [];
        const { backfilled } = runLearningCycle(rawEvents, history, currentMaxScore);
        const taskEvents = (Array.isArray(newTasks) ? newTasks : [])
          .filter(t => Number.isFinite(Number(t?.analysis?.monteCarlo?.probability)))
          .map(t => recordPredictionEvent({
            probability: Number(t.analysis.monteCarlo.probability) / 100,
            probabilityRaw: Number(t.analysis.monteCarlo.probabilityRaw ?? t.analysis.monteCarlo.probability) / 100,
            targetScore,
            category: t?.categoryId || t?.subject || t?.categoryName,
            sims: t?.analysis?.monteCarlo?.diagnostics?.simulationCount
          }))
          .filter(e => e.category);
        commitLearningCycle(rawEvents, backfilled, taskEvents);
        if (collectedMetrics.length > 0) {
          scheduleCalibrationPersist(collectedMetrics);
        }
      } catch (error) {
        console.error('[Coach.jsx] Falha ao gerar metas diárias:', error);
        showToastRef.current('Erro ao gerar as sugestões do Coach.', 'error');
      } finally {
        setCoachLoading(false);
      }
    }, 1500);
  }, [
    categories, coachLoading, setData, scheduleCalibrationPersist,
    history, studyLogs, targetScorePoints, targetScoreLabel,
    currentMaxScore, userData, settingsData,
    runLearningCycle, commitLearningCycle
  ]);

  const handleClearHistory = useCallback(() => {
    setData(() => ({
      coachPlan: [],
      coachPlanner: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
    }));
  }, [setData]);

  if (!isHydrated || isAnalyzing || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <Brain className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={24} />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white font-black uppercase tracking-widest text-xs">
            Sincronizando Redes Neurais
          </span>
          <span className="text-slate-500 text-[10px] mt-1 uppercase font-bold animate-pulse">
            Processando Probabilidades...
          </span>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <PageErrorBoundary pageName="Coach">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-3xl border border-white/10 bg-slate-900/60 flex items-center justify-center">
            <Brain className="text-slate-600" size={26} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-white font-black uppercase tracking-widest text-xs">
              Sem categorias cadastradas
            </span>
            <span className="text-slate-500 text-[10px] uppercase font-bold max-w-[300px] leading-relaxed">
              Cadastre as matérias do concurso para ativar o motor estatístico do Coach.
            </span>
          </div>
        </div>
      </PageErrorBoundary>
    );
  }

  const degradedCount = Object.values(data?.calibrationOps || {})
    .filter(Boolean)
    .filter(op => op && op.degraded === true).length;
  const globalProjectedMean =
    suggestedFocus?.globalProjectedMean ?? suggestedFocus?.globalMcContext?.projectedMean ?? null;
  const showGlobalMc = Number.isFinite(Number(globalProjectedMean));

  return (
    <PageErrorBoundary pageName="Coach">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-20 sm:pb-32">
        <div className="relative z-40 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <PageHeader
            title="Análise do Coach"
            description="Mentor estatístico processando seu desempenho para otimizar sua aprovação."
          />
          {/* FIX (BUG-14): wrapper relativo + fade nas bordas p/ indicar scroll */}
          <div className="relative z-50 w-full md:w-auto">
            <div className="flex items-center gap-3 sm:gap-4 bg-slate-900/50 border border-white/10 p-2 sm:p-3 rounded-3xl backdrop-blur-xl shadow-inner overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-3 sm:gap-5 md:gap-6 sm:px-4 px-2 min-w-max flex-shrink-0">
                <QuickStat
                  label="Volatilidade"
                  value={`${formatSigned(normalizedVolatility)}pp`}
                  color="text-rose-400"
                  icon={<Zap size={14} />}
                />
                <div className="hidden sm:block w-px h-6 bg-white/10" />
                <MonteCarloDebugger stats={mcStats} />
                <div className="w-px h-6 bg-white/10" />
                <CalibrationAuditPopover />
                <div className="w-px h-6 bg-white/10" />
                <QuickStat
                  label="Tendência"
                  value={`${formatSigned((drift * 30) / Math.max(1, Number(currentMaxScore) || 1) * 100)}pp`}
                  color="text-emerald-400"
                  icon={<ArrowUpRight size={14} />}
                />
                <div className="w-px h-6 bg-white/10" />
                <QuickStat label="Simulados" value={totalSimulados} color="text-indigo-400" icon={<Dna size={14} />} />
                <div className="w-px h-6 bg-white/10" />
                <QuickStat
                  label="Loop MC"
                  value={`${(data?.calibrationEvents || []).length} ev`}
                  color="text-cyan-400"
                  icon={<Database size={14} />}
                />
              </div>
            </div>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {degradedCount > 0 && (
            <GovernanceBanner key="governance-banner" degradedCount={degradedCount} />
          )}
        </AnimatePresence>
        <div className="space-y-10">
          <div className="w-full">
            <CoachMenuNav activeTab={safeActiveTab} onChangeTab={handleChangeTab} isPremium={isPremium} />
            <Motion.div
              key={safeActiveTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-h-[200px]"
              style={{ transform: "none", filter: "none", willChange: "auto" }}
            >
              <div
                role="tabpanel"
                id="coach-panel-insights"
                aria-labelledby="coach-tab-insights"
                tabIndex={safeActiveTab === 'insights' ? 0 : -1}
                hidden={safeActiveTab !== 'insights'}
              >
                {safeActiveTab === 'insights' && (
                  <>
                    {flashcardDue > 0 && (
                      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
                        <BookOpen className="text-amber-400" size={18} />
                        <div className="flex-1 text-amber-200">
                          <span className="font-semibold">{flashcardDue} flashcards</span> pendentes para hoje.
                          SRS melhora retenção e o modelo.
                        </div>
                        <button
                          onClick={() => navigate('/flashcards')}
                          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition"
                        >
                          FLASHCARDS
                        </button>
                      </div>
                    )}
                    {showGlobalMc && (
                      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs">
                        <span className="font-semibold text-emerald-300">Global MC:</span>
                        <span className="font-mono text-base font-bold text-emerald-200">
                          {Number(globalProjectedMean).toFixed(1)}{currentMaxScore === 100 ? '%' : ` de ${currentMaxScore}`}
                        </span>
                        <span className="text-emerald-400/60">projeção Monte Carlo global</span>
                      </div>
                    )}
                    <AICoachView
                      suggestedFocus={suggestedFocus}
                      onGenerateGoals={handleGenerateGoals}
                      loading={coachLoading}
                      onClearHistory={handleClearHistory}
                    />
                  </>
                )}
              </div>
              <div
                role="tabpanel"
                id="coach-panel-analytics"
                aria-labelledby="coach-tab-analytics"
                tabIndex={safeActiveTab === 'analytics' ? 0 : -1}
                hidden={safeActiveTab !== 'analytics'}
              >
                {safeActiveTab === 'analytics' && isPremiumBool && <RaioXDashboard data={data} />}
              </div>
            </Motion.div>
          </div>
        </div>
      </div>
    </PageErrorBoundary>
  );
}

function CalibrationAuditPopover({ categoryId = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summary = useMemo(() => getCalibrationTelemetrySummary(categoryId), [categoryId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // FIX (BUG-24): focus trap no dialog
  useEffect(() => {
    if (!isOpen || !popoverRef.current) return;
    const node = popoverRef.current;
    const getFocusables = () =>
      Array.from(node.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'));
    const first = getFocusables()[0];
    if (first) first.focus();
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      const list = getFocusables();
      if (list.length === 0) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    node.addEventListener('keydown', handleTab);
    return () => node.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!import.meta.env.DEV && summary.count === 0) return null;
  return (
    <div ref={popoverRef} className="relative font-mono text-[11px] select-none shrink-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex flex-col min-w-[70px] sm:min-w-[75px] text-left hover:opacity-85 transition-all active:scale-95 group focus:outline-none"
        title="Auditoria de Calibração Monte Carlo"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-sky-400 opacity-80 group-hover:animate-pulse">
            <ShieldCheck size={14} />
          </span>
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">TELEMETRIA</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-black text-sky-400 tracking-tighter">
            {summary.count}x
          </span>
        </div>
      </button>
      {isOpen && (
        <div
          role="dialog"
          aria-label="Telemetria Monte Carlo"
          className="absolute top-full right-0 mt-4 bg-slate-950/95 backdrop-blur-md text-slate-300 p-4 rounded-2xl border border-white/10 shadow-2xl w-[calc(100vw-2rem)] max-w-64 sm:w-64 space-y-2 z-[100] animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-xs font-bold text-white">Telemetria MC</span>
            <button
              onClick={(e) => { e.stopPropagation(); clearCalibrationTelemetry(); setIsOpen(false); }}
              className="text-[9px] text-rose-400 hover:underline"
            >
              Limpar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-2 items-center text-[10px]">
            <span className="text-slate-500">Amostras</span>
            <span className="text-right font-medium text-sky-400">{summary.count}</span>
            <span className="text-slate-500">Brier Médio</span>
            <span className="text-right font-medium text-emerald-400">
              {summary.avgBrier !== null ? summary.avgBrier.toFixed(4) : 'N/A'}
            </span>
            <span className="text-slate-500">Penalidade Média</span>
            <span className="text-right font-medium text-amber-400">
              {summary.avgPenalty !== null ? `${(summary.avgPenalty * 100).toFixed(1)}%` : '0.0%'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStat({ label, value, color, icon }) {
  return (
    <div className="flex flex-col min-w-[78px] sm:min-w-[80px] px-1">
      <div className="flex items-center gap-1.5 mb-0.5 opacity-70">
        <span className={color}>{icon}</span>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em]">{label}</span>
      </div>
      <span className={`text-base font-black ${color} tracking-tighter tabular-nums`}>{value}</span>
    </div>
  );
}

function LoopStat({ label, value, tone = 'text-white' }) {
  return (
    <div className="flex flex-col gap-1 bg-black/20 border border-white/5 rounded-xl p-3">
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
      <span className={`text-sm font-black font-mono tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

const GovernanceBanner = React.memo(React.forwardRef(function GovernanceBanner({ degradedCount }, ref) {
  return (
    <Motion.div
      ref={ref}
      role="status"
      aria-live="polite"
      layout
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="mb-6 p-4 rounded-3xl bg-rose-500/5 border border-rose-500/30 flex items-center justify-between gap-4 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-400 border border-rose-500/20">
          <AlertCircle size={20} />
        </div>
        <div>
          <h4 className="text-sm font-black text-rose-200 uppercase tracking-tight">Alerta de Governança</h4>
          <p className="text-[10px] text-rose-300/80 font-medium uppercase tracking-widest">
            Detectamos <span className="text-rose-400 font-black">{degradedCount}</span> categorias com calibração degradada.
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-tight">
          O Coach está aplicando<br className="hidden sm:block" />ajustes conservadores.
        </p>
      </div>
    </Motion.div>
  );
}));

function RaioXDashboard({ data }) {
  const ops = data?.calibrationOps || {};
  const rawCategories = data?.categories || [];
  const categories = Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {});
  const [filter, setFilter] = useState('all');
  const toFiniteNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const [mountTime] = useState(() => Date.now());

  const calibrationSummary = useMemo(() => {
    const historyByCategory = data?.calibrationHistoryByCategory || {};
    let latestTs = 0;
    for (const entries of Object.values(historyByCategory)) {
      if (Array.isArray(entries)) {
        for (const e of entries) {
          const ts = toFiniteNumber(e?.timestamp);
          if (ts > latestTs) latestTs = ts;
        }
      }
    }
    const now = latestTs > 0 ? latestTs : mountTime;
    return Object.entries(historyByCategory)
      .map(([categoryId, history]) => {
        const rows = Array.isArray(history) ? history : [];
        if (rows.length === 0) return null;
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const recent = rows.filter(h => toFiniteNumber(h?.timestamp) >= sevenDaysAgo);
        const base = recent.length > 0 ? recent : rows;
        const brierValues = base
          .filter(h => h?.avgBrier !== null && h?.avgBrier !== undefined && h?.avgBrier !== '')
          .map(h => Number(h.avgBrier))
          .filter(Number.isFinite);
        const penaltyValues = base
          .filter(h => h?.calibrationPenalty !== null && h?.calibrationPenalty !== undefined && h?.calibrationPenalty !== '')
          .map(h => Number(h.calibrationPenalty))
          .filter(Number.isFinite);
        if (brierValues.length === 0) return null;
        const avgBrier = brierValues.reduce((acc, val) => acc + val, 0) / brierValues.length;
        const avgPenalty = penaltyValues.length > 0
          ? penaltyValues.reduce((acc, val) => acc + val, 0) / penaltyValues.length
          : 0;
        const label = rows[rows.length - 1]?.categoryName || categoryId;
        return { categoryId, label, count: brierValues.length, avgBrier, avgPenalty };
      })
      .filter(Boolean);
  }, [data?.calibrationHistoryByCategory, mountTime]);

  const toPercentLabel = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${Math.max(0, Math.min(100, Math.round(n * 100)))}%`;
  };

  const sortedLogs = useMemo(() => {
    const source = Array.isArray(data?.calibrationAuditLog) ? data.calibrationAuditLog : [];
    return [...source].filter(Boolean).sort((a, b) => toFiniteNumber(b?.timestamp) - toFiniteNumber(a?.timestamp));
  }, [data?.calibrationAuditLog]);

  const filteredLogs = useMemo(
    () => sortedLogs
      .filter(log => filter === 'all' || (filter === 'degraded' && log?.degraded === true))
      .slice(0, 50),
    [sortedLogs, filter]
  );

  const latestWithReliability = useMemo(() => {
    // Primeiro tenta no audit log, caso você decida manter reliability lá no futuro.
    const fromAudit = sortedLogs.find(
      log => Array.isArray(log?.reliability) && log.reliability.length > 0
    );
    if (fromAudit) return fromAudit;

    // Fallback correto: procurar no histórico por categoria,
    // onde a métrica completa realmente é persistida.
    const histories = Object.values(data?.calibrationHistoryByCategory || {});
    let latest = null;
    let latestTs = -1;

    histories.forEach((history) => {
      if (!Array.isArray(history)) return;

      for (let i = history.length - 1; i >= 0; i--) {
        const entry = history[i];
        if (Array.isArray(entry?.reliability) && entry.reliability.length > 0) {
          const ts = Number(entry?.timestamp) || 0;
          if (ts > latestTs) {
            latestTs = ts;
            latest = entry;
          }
          break;
        }
      }
    });

    return latest;
  }, [sortedLogs, data?.calibrationHistoryByCategory]);
  const eceValues = sortedLogs.map(log => toFiniteNumber(log?.ece, null)).filter(val => val !== null);
  const avgEce = eceValues.length
    ? eceValues.reduce((a, b) => a + b, 0) / eceValues.length : null;

  const categorySeriesMap = useMemo(() => {
    return sortedLogs.reduce((acc, log) => {
      const cat = log?.categoryName || 'Categoria';
      const brier = toFiniteNumber(log?.avgBrier, null);
      const ece = toFiniteNumber(log?.ece, null);
      if (brier === null && ece === null) return acc;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({ ts: toFiniteNumber(log?.timestamp), brier, ece });
      return acc;
    }, {});
  }, [sortedLogs]);
  const categoryNames = Object.keys(categorySeriesMap);
  const [seriesCategory, setSeriesCategory] = useState(() => categoryNames[0] || '');
  const effectiveCategory = categoryNames.includes(seriesCategory)
    ? seriesCategory : (categoryNames[0] || '');
  const temporalSeries = useMemo(() => {
    if (!effectiveCategory) return [];
    return [...(categorySeriesMap[effectiveCategory] || [])]
      .sort((a, b) => a.ts - b.ts)
      .slice(-12);
  }, [categorySeriesMap, effectiveCategory]);

  const calibrationEvents = data?.calibrationEvents;
  const learningStats = useMemo(() => {
    const events = Array.isArray(calibrationEvents) ? calibrationEvents : [];
    const observed = events.filter(e => e.observed === 0 || e.observed === 1).length;
    const rolling = computeRollingCalibrationParams(events, {});
    const series = buildCalibrationDashboardSeries(sortedLogs);
    const outOfControl = series.driftSignals.filter(d => d.outOfControl).length;
    return {
      total: events.length,
      observed,
      pending: Math.max(0, events.length - observed),
      baseline: (rolling.confidenceFactor || 0) > 0 && Number.isFinite(rolling.baseline) ? rolling.baseline : null,
      confidence: Number.isFinite(rolling.confidenceFactor) ? rolling.confidenceFactor : 0,
      outOfControl
    };
  }, [calibrationEvents, sortedLogs]);

  // FIX: retorna 0% para valores <= 0 (antes o mínimo de 2% mostrava barra p/ zero)
  const toBarWidth = (value, max = BRIER_VISUAL_MAX) => {
    const safeVal = Number(value) || 0;
    if (safeVal <= 0) return '0%';
    const pct = (safeVal / max) * 100;
    return `${Math.max(2, Math.min(100, pct))}%`;
  };

  return (
    <div className="space-y-12 animate-fade-in">
      {calibrationSummary.length > 0 ? (
        <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
            <div>
              <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                <ShieldCheck size={14} />
                Monitor de Calibração
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Acompanhamento de Brier Score (Erro de Projeção) e Degradação
              </p>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {calibrationSummary.map(row => {
              const op = ops[row.categoryId] || {};
              const isDegraded = op?.degraded === true;
              const avgBrier = toFiniteNumber(row.avgBrier);
              const brierPct = Math.max(0, Math.min(100, (avgBrier / BRIER_VISUAL_MAX) * 100));
              const radius = 14;
              const circ = 2 * Math.PI * radius;
              const offset = circ - (brierPct / 100) * circ;
              const colorClass = !Number.isFinite(avgBrier)
                ? 'text-slate-500'
                : avgBrier >= BRIER_VISUAL_CRIT
                  ? 'text-rose-500'
                  : (avgBrier >= BRIER_VISUAL_WARN ? 'text-amber-500' : 'text-emerald-500');
              return (
                <div
                  key={row.categoryId}
                  className={`group/card relative rounded-2xl border border-white/[0.05] bg-slate-900/50 p-4 sm:p-5 hover:bg-slate-800/60 transition-all duration-300 flex flex-col justify-between ${isDegraded ? 'shadow-[0_0_20px_-5px_rgba(244,63,94,0.15)] hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.25)]' : ''}`}
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex flex-col min-w-0 flex-1">
                      <p
                        className="text-sm sm:text-[15px] text-white font-black tracking-tight truncate mb-1.5"
                        title={displaySubject(row.label, categories)}
                      >
                        {displaySubject(row.label, categories)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner ${isDegraded ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isDegraded ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse shadow-[0_0_8px_currentColor]`} />
                          {isDegraded ? 'Degradado' : 'Estável'}
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 font-bold bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md">
                          n={row.count}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                      {/* FIX (BUG-15): strokeWidth 2.5 */}
                      <svg
                        className="w-full h-full -rotate-90 transform drop-shadow-md"
                        viewBox="0 0 36 36"
                        role="img"
                        aria-label={`Brier Score: ${avgBrier.toFixed(2)} de ${BRIER_VISUAL_MAX} máximo`}
                      >
                        <circle cx="18" cy="18" r={radius} fill="none" className="stroke-black/40" strokeWidth="2.5" />
                        <circle
                          cx="18" cy="18" r={radius} fill="none"
                          className={`stroke-current ${colorClass} transition-all duration-1000 ease-out`}
                          strokeWidth="2.5"
                          strokeDasharray={circ}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-[10px] font-black font-mono tracking-tighter ${colorClass}`}>
                          {avgBrier.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] mt-auto">
                    <div className="group/tooltip relative flex items-center gap-1 cursor-help" tabIndex={0} role="button" aria-label="Informação sobre Score de Brier">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/tooltip:text-slate-300 group-focus-within/tooltip:text-slate-300 transition-colors border-b border-dashed border-slate-600">
                        Desvio (Brier)
                      </span>
                      <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-[#0a0c14] text-[10px] font-medium text-slate-300 rounded-lg shadow-2xl border border-white/10 opacity-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                        <strong className="text-white font-black block mb-1">Score de Brier</strong>
                        Mede a precisão das projeções Monte Carlo. Quanto menor (verde), mais assertivo o motor.
                      </div>
                    </div>
                    {(() => {
                      const pen = toFiniteNumber(row.avgPenalty);
                      if (pen < 0.005) return null;
                      return (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10">
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                            Pena: <span className="font-mono">-{Math.round(pen * 100)}%</span>
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center justify-center py-12 text-center space-y-2 bg-slate-900/20 border border-white/5 rounded-3xl">
          <ShieldCheck size={32} className="text-slate-700/50 mb-3" />
          <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">
            Amostra técnica insuficiente
          </p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight max-w-[250px] mx-auto leading-tight">
            Requer <span className="text-indigo-400">3 simulados por matéria</span> para calibrar a inteligência do motor.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-cyan-500/10 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Database size={14} className="text-cyan-400" />
          <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.2em]">Ciclo de Aprendizagem</h3>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest ml-auto">
            previsão → observação → adaptação
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <LoopStat label="Eventos MC" value={learningStats.total} tone="text-cyan-300" />
          <LoopStat label="Observados" value={learningStats.observed} tone="text-emerald-400" />
          <LoopStat label="Aguardando" value={learningStats.pending} tone="text-amber-400" />
          <LoopStat
            label="Baseline adapt."
            value={learningStats.baseline !== null ? learningStats.baseline.toFixed(3) : '—'}
            tone="text-cyan-300"
          />
          <LoopStat label="Confiança" value={`${Math.round((learningStats.confidence || 0) * 100)}%`} />
          <LoopStat
            label="Drift (ooc)"
            value={learningStats.outOfControl}
            tone={learningStats.outOfControl > 0 ? 'text-rose-400' : 'text-slate-300'}
          />
        </div>
      </div>

      <div className="p-2 border-t border-white/5 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em] flex items-center gap-2">
            <List size={14} className="text-indigo-400/80" />
            Log de Auditoria
          </h3>
          <div className="flex gap-2 bg-slate-900/50 border border-white/5 rounded-xl p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Tudo
            </button>
            <button
              onClick={() => setFilter('degraded')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'degraded' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Degradados
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/10">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[120px]">Data</th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[140px]">Categoria</th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">
                  <span title="Mede o erro da previsão. Quanto mais perto de zero, mais precisa foi a projeção do sistema em relação à sua nota real." className="cursor-help border-b border-dashed border-slate-600">Brier (erro)</span>
                </th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">
                  <span title="Mede se há otimismo/pessimismo (gap/viés). Mostra o descolamento entre a nota que o sistema achou que você tiraria e a nota real." className="cursor-help border-b border-dashed border-slate-600">ECE (calib.)</span>
                </th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[110px]">
                  <span title="Uma 'Pena' automática (redução na nota projetada) se o sistema detectar que estava sendo muito otimista, mantendo as estatísticas pé no chão." className="cursor-help border-b border-dashed border-slate-600">Ajuste</span>
                </th>
                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">Prob Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, idx) => {
                  const brierVal = toFiniteNumber(log?.avgBrier, null);
                  const brierColor = brierVal === null
                    ? 'text-slate-500'
                    : brierVal >= BRIER_VISUAL_CRIT
                      ? 'text-rose-400'
                      : brierVal >= BRIER_VISUAL_WARN
                        ? 'text-amber-400'
                        : 'text-emerald-400';
                  const eceVal = toFiniteNumber(log?.ece, null);
                  const eceColor = eceVal === null
                    ? 'text-slate-500'
                    : eceVal > 0.12 ? 'text-amber-400' : 'text-cyan-300';
                  return (
                    <tr
                      key={`${toFiniteNumber(log?.timestamp, idx)}-${log?.categoryName || 'cat'}-${idx}`}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4 text-[10px] text-slate-500 font-mono whitespace-nowrap">
                        {toFiniteNumber(log?.timestamp) > 0 ? formatDateTimePtBR(log.timestamp) : '-'}
                      </td>
                      <td className="py-3 px-4 text-[10px] text-white font-bold whitespace-nowrap">
                        {displaySubject(log.categoryName, categories)}
                      </td>
                      <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap ${brierColor}`}>
                        {brierVal !== null ? brierVal.toFixed(3) : '-'}
                      </td>
                      <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap ${eceColor}`}>
                        {eceVal !== null ? eceVal.toFixed(3) : '-'}
                      </td>
                      <td className="py-3 px-4 text-[10px] text-amber-400 font-bold whitespace-nowrap">
                        {toFiniteNumber(log?.calibrationPenalty) > 0.001
                          ? `-${Math.round(toFiniteNumber(log.calibrationPenalty) * 100)}% (shrink)` : '-'}
                      </td>
                      <td className="py-3 px-4 text-[10px] text-white font-black whitespace-nowrap">
                        {toPercentLabel(log?.probability)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 px-4">
                      <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">
                        Nenhum evento registrado
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight max-w-[340px] mx-auto leading-tight">
                        Os diagnósticos surgirão automaticamente após atingir a maturidade de dados (n=3).
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-2 border-t border-white/5 pt-8">
        <div className="flex items-center justify-between mb-5 gap-3">
          <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em]">
            Confiabilidade (ECE)
          </h3>
          <span className="text-[10px] font-black text-cyan-300 shrink-0">
            {avgEce !== null ? `ECE médio: ${avgEce.toFixed(3)}` : 'Sem ECE'}
          </span>
        </div>
        {latestWithReliability ? (
          <ReliabilityCurveChart buckets={latestWithReliability.reliability} />
        ) : (
          <div className="w-full flex items-center justify-center py-12 bg-slate-900/20 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
              Sem buckets de confiabilidade ainda
            </p>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-white/5 pt-8">
        <div className="flex items-center justify-between mb-5 gap-3">
          <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em]">
            Drift Temporal (Brier/ECE)
          </h3>
          {categoryNames.length > 1 ? (
            <select
              value={effectiveCategory}
              onChange={(e) => setSeriesCategory(e.target.value)}
              className="text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2 outline-none cursor-pointer hover:bg-slate-800 transition-all backdrop-blur-md"
            >
              {categoryNames.map(cat => (
                <option key={cat} value={cat}>{displaySubject(cat, categories)}</option>
              ))}
            </select>
          ) : (
            <span className="text-[10px] text-slate-400 font-bold">
              {effectiveCategory ? displaySubject(effectiveCategory, categories) : 'Sem categoria'}
            </span>
          )}
        </div>
        {temporalSeries.length > 1 ? (
          <div className="space-y-2">
            {temporalSeries.map((point, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>{point.ts > 0 ? formatDatePtBR(point.ts) : '-'}</span>
                  <span>
                    Brier {Number.isFinite(point?.brier) ? point.brier.toFixed(3) : '-'} · ECE {Number.isFinite(point?.ece) ? point.ece.toFixed(3) : '-'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                    {Number.isFinite(point.brier) ? (
                      <div className="h-full bg-rose-400/80" style={{ width: toBarWidth(point.brier) }} />
                    ) : null}
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                    {Number.isFinite(point.ece) ? (
                      <div className="h-full bg-cyan-400/80" style={{ width: toBarWidth(point.ece) }} />
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full flex items-center justify-center py-12 bg-slate-900/20 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
              Dados temporais insuficientes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}