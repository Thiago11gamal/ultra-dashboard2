import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Brain,
    Zap,
    AlertCircle,
    ArrowUpRight,
    ShieldCheck,
    Dna,
    List,
    BookOpen
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
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { getSuggestedFocus, generateDailyGoals, clearMcCache, clearUrgencyCache, clearTopicsCache, getCombinedHistory } from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { logCalibrationTelemetryEvent } from '../utils/calibrationTelemetry';
import { CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD, ALERT_COOLDOWN_MS } from '../utils/calibration.js';
import { displaySubject } from '../utils/displaySubject';
import { formatDatePtBR, formatDateTimePtBR } from '../utils/dateHelper';
import { getSafeId } from '../utils/idGenerator';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)

const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45; // 45 dias
const CALIBRATION_ALERT_CACHE_MAX = 200;
const EMPTY_ARRAY = [];

function resolveTargetScorePoints({ user, minScore = 0, maxScore = 100 }) {
  const safeMax = Math.max(1, Number(maxScore) || 100);
  const safeMin = Math.min(Number(minScore) || 0, safeMax);

  const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number(value) || 0));

  // 1) Se existir targetScore explícito, ele é a meta em pontos.
  if (user?.targetScore != null && Number.isFinite(Number(user.targetScore))) {
    let ts = Number(user.targetScore);

    // Compatibilidade: se o valor parecer percentual (ex: 70) e estiver acima do maxScore,
    // converte para pontos.
    if (ts > safeMax && ts <= 100) {
      ts = (ts / 100) * safeMax;
    }

    return clamp(ts);
  }

  // 2) Fallback: targetProbability é percentual (0-100) e deve virar pontos.
  if (user?.targetProbability != null && Number.isFinite(Number(user.targetProbability))) {
    return clamp((Number(user.targetProbability) / 100) * safeMax);
  }

  // 3) Default seguro: 80% da escala.
  return clamp(safeMax * 0.8);
}

export default function Coach() {
    const calibrationAlertCacheRef = useRef(new Map());
    const activeId = useAppStore(state => state.appState.activeId);
    // LEAK-MCCACHE FIX: limpar o cache do Monte Carlo ao trocar de concurso.
    // O hash já previne resultados errados, mas entradas do concurso anterior
    // ocupam memória desnecessariamente até o cap de 50 ser atingido.
    useEffect(() => {
        clearMcCache();
        clearUrgencyCache();
        clearTopicsCache();
        // BUG 1 FIX: Removed calibrationAlertCache.clear() to prevent global cache reset on mount
    }, [activeId]);

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
    const showToastRef = useRef(showToast); // FIX: Estabilização de referência para evitar loops

    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);

    const rawHistory = data?.simuladoRows || EMPTY_ARRAY;
    const history = useMemo(() => Array.isArray(rawHistory) ? rawHistory : Object.values(rawHistory || {}), [rawHistory]);

    const rawSimulados = data?.simulados || EMPTY_ARRAY;
    const simulados = useMemo(() => Array.isArray(rawSimulados) ? rawSimulados : Object.values(rawSimulados || {}), [rawSimulados]);

    const rawCategories = data?.categories || EMPTY_ARRAY;
    const categories = useMemo(() => (Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {})).map(c => ({
        ...c,
        tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
    })), [rawCategories]);

    const rawFlashcardDecks = data?.flashcardDecks || EMPTY_ARRAY;
    const flashcardDecks = useMemo(() => Array.isArray(rawFlashcardDecks) ? rawFlashcardDecks : Object.values(rawFlashcardDecks || {}), [rawFlashcardDecks]);

    const rawStudyLogs = data?.studyLogs || EMPTY_ARRAY;
    const studyLogs = useMemo(() => Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {}), [rawStudyLogs]);
    const flashcardDue = useMemo(() => {
        return getFlashcardDueTodayCount(flashcardDecks);
    }, [flashcardDecks]);
    const userProfile = data?.user;

    const updateCoachScore = useAppStore(state => state.updateCoachScore);
    const { isPremium } = useSubscription(userProfile);
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('insights');

    const safeActiveTab = activeTab === 'analytics' ? 'analytics' : 'insights';

    useEffect(() => {
        if (activeTab && activeTab !== safeActiveTab) {
            console.warn(`[Coach.jsx] Estado de aba inválido recebido: ${activeTab}, ativando fallback.`);
        }
    }, [activeTab, safeActiveTab]);

    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [coachLoading, setCoachLoading] = useState(false);
    const [suggestedFocus, setSuggestedFocus] = useState(null);
    const timeoutRef = useRef(null);
    const generationTimeoutsRef = useRef([]);
    const lastPushedScoreRef = useRef(null);
    const calibrationHistoryRef = useRef(data?.calibrationHistoryByCategory || {});
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (generationTimeoutsRef.current && generationTimeoutsRef.current.length > 0) {
                generationTimeoutsRef.current.forEach(clearTimeout);
                generationTimeoutsRef.current = [];
            }
        };
    }, []);

    useEffect(() => {
        calibrationHistoryRef.current = data?.calibrationHistoryByCategory || {};
    }, [data?.calibrationHistoryByCategory]);

    // Backfill de simulados agora é gerenciado no hook useMonteCarloStats via rawSimuladoRows (evita duplicação).

    const lastPersistByCategoryRef = useRef(new Map());
    const persistCalibrationMetric = useCallback((metric) => {
        if (!isMountedRef.current || !metric) return;

        const now = Date.now();
        const rawCategoryId = metric?.categoryId || metric?.categoryName;
        if (!rawCategoryId) return;

        const normalizedCategoryId = getSafeId(rawCategoryId);

        const lastAt = Number(lastPersistByCategoryRef.current.get(normalizedCategoryId) || 0);
        if (now - lastAt < 500) return;

        lastPersistByCategoryRef.current.set(normalizedCategoryId, now);
        if (lastPersistByCategoryRef.current.size > 200) {
          const oldestKey = lastPersistByCategoryRef.current.keys().next().value;
          lastPersistByCategoryRef.current.delete(oldestKey);
        }

        const toFinite = (value, fallback = null) => {
            if (value === null || value === undefined || value === '') return fallback;
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        };
        const metricTimestamp = metric?.timestamp || now;
        const avgBrier = toFinite(metric?.avgBrier, null);
        const ece = toFinite(metric?.ece, null);
        const probability = toFinite(metric?.probability, null);
        const calibrationPenalty = toFinite(metric?.calibrationPenalty, 0);
        const reliability = Array.isArray(metric?.reliability) ? metric.reliability : [];
        const isDegraded = metric?.degraded === true || calibrationPenalty >= HIGH_PENALTY_THRESHOLD;

        // DATA-QUALITY GATE: evita persistir eventos vazios/ruins que poluem histórico e painéis.
        const hasUsefulSignal = avgBrier !== null || ece !== null || probability !== null || calibrationPenalty > 0 || reliability.length > 0;
        if (!hasUsefulSignal) return;

        const normalizedMetric = {
            ...metric,
            categoryId: normalizedCategoryId,
            categoryName: metric?.categoryName || normalizedCategoryId,
            timestamp: metricTimestamp,
            avgBrier,
            ece,
            probability,
            calibrationPenalty,
            reliability
        };

        // BUG-3 FIX: Immer mutation pattern — explicit return undefined to document intent
        setData(prev => {
            if (!prev) return;
            const current = prev.calibrationHistoryByCategory || {};
            const categoryHistory = current[normalizedCategoryId] || [];

            // Verificação de redundância (Brier + ECE + penalty + probabilidade)
            // Evita descartar eventos onde o Brier ficou estável, mas ECE/penalty mudaram.
            const lastEntry = categoryHistory[categoryHistory.length - 1];
            const hasComparableLast = lastEntry && Number.isFinite(Number(lastEntry?.timestamp));
            if (hasComparableLast) {
                const metricDelta = (currentValue, previousValue) => {
                    const currentFinite = Number.isFinite(Number(currentValue));
                    const previousFinite = Number.isFinite(Number(previousValue));
                    if (currentFinite && previousFinite) return Math.abs(Number(previousValue) - Number(currentValue));
                    if (!currentFinite && !previousFinite) return 0;
                    return Infinity;
                };

                const toReliabilitySignature = (bucketList = []) => (Array.isArray(bucketList) ? bucketList : [])
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

                // BUG 6 FIX: Lowered absolute thresholds to capture low-variance micro-movements
                const shouldSkipPersist =
                    (brierDelta < 0.001 || (brierDelta / Math.max(0.001, lastEntry.avgBrier)) < 0.05) &&
                    (eceDelta < 0.001 || (eceDelta / Math.max(0.001, lastEntry.ece)) < 0.05) &&
                    penaltyDelta < 0.001 &&
                    probabilityDelta < 0.01 &&
                    !reliabilitySignatureChanged;

                if (shouldSkipPersist) return;
            }

            const cutoff = now - CALIBRATION_HISTORY_RETENTION_MS;
            const cleaned = categoryHistory.filter(item => Number.isFinite(Number(item?.timestamp)) && Number(item.timestamp) >= cutoff);
            const nextHistory = [...cleaned, normalizedMetric].slice(-60);

            const recent7 = nextHistory.filter(item => Number(item?.timestamp || 0) >= (now - 1000 * 60 * 60 * 24 * 7));
            const recent7Brier = recent7.map(item => toFinite(item?.avgBrier, null)).filter(val => val !== null);
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

            const calibrationAuditLog = [...(prev.calibrationAuditLog || []), {
                ...normalizedMetric,
                avgBrier7d: Number.isFinite(avgBrier7d) ? Number(avgBrier7d.toFixed(4)) : null,
                degraded: isDegraded,
                source: 'coach'
            }].slice(-500);
            prev.calibrationHistoryByCategory = prev.calibrationHistoryByCategory || {};
            prev.calibrationHistoryByCategory[normalizedCategoryId] = nextHistory;
            prev.calibrationOps = calibrationOps;
            prev.calibrationAuditLog = calibrationAuditLog;
            return; // Immer: explicit void return — mutation is intentional
        });

        if (normalizedMetric.calibrationPenalty >= HIGH_PENALTY_THRESHOLD) {
            logCalibrationTelemetryEvent({ ...normalizedMetric, eventType: 'high_penalty_alert' });
        } else {
            logCalibrationTelemetryEvent(normalizedMetric);
        }

        if (isDegraded) {
            const currentTime = Date.now();
            // LEAK-CALIBRATION-CACHE FIX: antes, entradas eram removidas apenas por tamanho.
            // Entradas com >12h de idade deveriam ser prunadas para liberar memória e permitir
            // re-disparo legítimo do alerta. Agora fazemos uma varredura de cleanup antes de inserir.
            for (const [key, ts] of calibrationAlertCacheRef.current.entries()) {
                if (currentTime - ts > ALERT_COOLDOWN_MS) calibrationAlertCacheRef.current.delete(key);
            }
            const lastAlertAt = Number(calibrationAlertCacheRef.current.get(normalizedCategoryId) || 0);
            if (currentTime - lastAlertAt > ALERT_COOLDOWN_MS) {
                showToastRef.current(`⚠️ Calibração crítica em ${displaySubject(normalizedMetric.categoryName || 'categoria')} (Brier ${Number(avgBrier).toFixed(2)}).`, 'warning');
                calibrationAlertCacheRef.current.set(normalizedCategoryId, now);
                if (calibrationAlertCacheRef.current.size > CALIBRATION_ALERT_CACHE_MAX) {
                    const oldestKey = calibrationAlertCacheRef.current.keys().next().value;
                    calibrationAlertCacheRef.current.delete(oldestKey);
                }
            }
        }
    }, [setData]);

    // BUG-26 FIX: Deduplicating history entries safely and preventing double-counting.
    // 'history' represents topic-level rows, 'simulados' represents global test events.
    // We group legacy topic rows into global events if no 'simulados' exist for that date.
    const combinedHistory = useMemo(() => getCombinedHistory(history, simulados), [history, simulados]);

    // BUG-11 FIX: Pass explicit defaults for timeIndex and timelineDates
    // BUG-16 FIX: Bind maxScore dynamically to support contests scaled > 100
    const currentMaxScore = data?.maxScore ?? 100;

    const targetScorePoints = useMemo(() => resolveTargetScorePoints({
      user: userProfile,
      minScore: data?.minScore,
      maxScore: currentMaxScore
    }), [userProfile, data?.minScore, currentMaxScore]);

    const targetScoreLabel = useMemo(() => {
      const safeMax = Math.max(1, Number(currentMaxScore) || 100);
      return Math.round((targetScorePoints / safeMax) * 100);
    }, [targetScorePoints, currentMaxScore]);

    const mcStats = useMonteCarloStats({
        categories: categories,
        goalDate: userProfile?.goalDate,
        targetScore: targetScorePoints,
        timeIndex: -1,
        timelineDates: EMPTY_ARRAY,
        minScore: data?.minScore ?? 0,
        maxScore: currentMaxScore,
        simuladoRows: data?.simuladoRows || EMPTY_ARRAY
    });

    const projectedScore = mcStats?.projectedMean ?? 0;
    // UX-STABILITY: Para o card de volatilidade, preferimos pooledSD (determinístico)
    // ao sd da simulação MC (estocástico), reduzindo "pisca/pula" visual.
    const volatility = mcStats?.statsData?.pooledSD ?? mcStats?.sd ?? 0;
    const normalizedVolatility = useMemo(() => {
        const denom = Math.max(1, Number(currentMaxScore) || 0);
        return (volatility / denom) * 100;
    }, [volatility, currentMaxScore]);
    const drift = useMemo(() => calculateAdaptiveSlope(combinedHistory, currentMaxScore), [combinedHistory, currentMaxScore]);
    const totalSimulados = useMemo(() => combinedHistory.length, [combinedHistory]);

    const mcStatsContext = useMemo(() => ({
        projectedMean: mcStats?.projectedMean,
        probability: mcStats?.probability,
        statsData: mcStats?.statsData,
        sd: mcStats?.sd
    }), [mcStats?.projectedMean, mcStats?.probability, mcStats?.statsData, mcStats?.sd]);

    // FIX-#185: Stable ref so the analysis useEffect doesn't need mcStatsContext
    // as a dependency. Without this, any isFlashing toggle inside useMonteCarloStats
    // creates a new mcStats object → new mcStatsContext → effect fires → setData()
    // → store update → re-render → infinite loop (React error #185).
    const mcStatsContextRef = useRef(mcStatsContext);
    useEffect(() => { mcStatsContextRef.current = mcStatsContext; }, [mcStatsContext]);

    useEffect(() => {
        if (!data?.categories || !isHydrated) return;

        let metricsTimer = null;
        // UX-FLUIDITY FIX: agenda o cálculo pesado para o próximo ciclo.
        // Se o usuário sair rapidamente do Coach, o cleanup cancela tudo e o menu
        // lateral não fica "preso" aguardando cálculo síncrono.
        const analysisTimer = setTimeout(() => {
            const targetScore = targetScorePoints;
            const collectedMetrics = [];

            const result = getSuggestedFocus(
                categories,
                history,
                studyLogs,
                {
                    user: data.user,
                    targetScore,
                    targetScoreLabel,
                    maxScore: currentMaxScore,
                    calibrationHistoryByCategory: calibrationHistoryRef.current,
                    flashcardDecks: flashcardDecks,
                    flashcardDue,
                    onCalibrationMetric: (metric) => collectedMetrics.push(metric),
                    // Pass global MC stats for richer integration (see analysis of Coach + MC)
                    // FIX-#185: Read from ref (stable) instead of the reactive mcStatsContext
                    globalMcStats: mcStatsContextRef.current,
                    config: {
                        MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                    }
                }
            );

            // BEST: enrich the suggestion with global MC context for the UI
            const _mcCtx = mcStatsContextRef.current;
            if (result && _mcCtx && _mcCtx.projectedMean != null) {
                result.globalMcContext = {
                    projectedMean: Number(_mcCtx.projectedMean.toFixed(1)),
                    probability: _mcCtx.probability != null ? Number(_mcCtx.probability.toFixed(1)) : null,
                    source: 'useMonteCarloStats'
                };
            }
            setSuggestedFocus(result);
            setIsAnalyzing(false);

            if (collectedMetrics.length > 0) {
                metricsTimer = setTimeout(() => {
                    collectedMetrics.forEach((metric) => {
                        if ('requestIdleCallback' in window) {
                            window.requestIdleCallback(() => persistCalibrationMetric(metric), { timeout: 2000 });
                        } else {
                            requestAnimationFrame(() => persistCalibrationMetric(metric));
                        }
                    });
                }, 1000); // Cooldown de 1s para deixar o dashboard respirar entre análises
            }
        }, 0);

        return () => {
            clearTimeout(analysisTimer);
            if (metricsTimer) clearTimeout(metricsTimer);
        };
        // FIX-#185: mcStatsContext removed — it's read via mcStatsContextRef.current inside
        // the effect body, so it never needs to be a reactive dependency.
    }, [
        isHydrated,
        data?.categories,
        data?.simuladoRows,
        data?.studyLogs,
        data?.user,
        data?.maxScore,
        data?.settings?.adaptiveCalibrationEnabled,
        userProfile?.targetProbability,
        flashcardDue,
        flashcardDecks,
        persistCalibrationMetric,
        targetScorePoints,
        currentMaxScore,
        targetScoreLabel
    ]);

    useEffect(() => {
        if (typeof projectedScore === 'number' && !Number.isNaN(projectedScore) && projectedScore !== lastPushedScoreRef.current) {
            if (lastPushedScoreRef.current === null || Math.abs(projectedScore - lastPushedScoreRef.current) > 0.01) {
                lastPushedScoreRef.current = projectedScore;
                const timer = setTimeout(() => {
                    if (updateCoachScore) updateCoachScore(projectedScore);
                }, 0);
                return () => clearTimeout(timer);
            }
        }
    }, [projectedScore, updateCoachScore]);



    const handleChangeTab = useCallback((tab) => {
        setActiveTab(tab === 'analytics' ? 'analytics' : 'insights');
    }, []);

    const handleGenerateGoals = useCallback(() => {
        if (!data?.categories || coachLoading) return;
        setCoachLoading(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);


        timeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;

            const targetScore = targetScorePoints;
            const collectedMetrics = [];

            // BUG-1 FIX: Use categories, history, studyLogs directly (now in dep array)
            const newTasks = generateDailyGoals(
                categories,
                history,
                studyLogs,
                {
                    user: data.user,
                    targetScore,
                    targetScoreLabel,
                    maxScore: currentMaxScore,
                    calibrationHistoryByCategory: calibrationHistoryRef.current,
                    onCalibrationMetric: (metric) => collectedMetrics.push(metric),
                    config: {
                        MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                    }
                }
            );

            if (newTasks.length) {
                // BUG-3 FIX: Immer mutation — explicit void return
                setData(prev => {
                    if (prev) {
                        prev.coachPlan = newTasks;
                        prev.coachPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
                    }
                    return; // Immer: explicit void return — mutation is intentional
                });
                showToastRef.current('Sugestões geradas!', 'success');
            } else {
                showToastRef.current('Nenhuma sugestão necessária.', 'info');
            }

            collectedMetrics.forEach((metric) => {
                if ('requestIdleCallback' in window) {
                    window.requestIdleCallback(() => persistCalibrationMetric(metric), { timeout: 2000 });
                } else {
                    requestAnimationFrame(() => persistCalibrationMetric(metric));
                }
            });
            setCoachLoading(false);
            // LOGIC-TIMEOUT-NULL FIX: zerar a ref após a execução para não manter
            // um ID de timeout expirado que mascararia novos agendamentos.
            timeoutRef.current = null;
        }, 1500);
        // BUG-1 FIX: Added categories, history, studyLogs to prevent stale closure
    }, [data, coachLoading, setData, persistCalibrationMetric, userProfile?.targetProbability, categories, history, studyLogs, targetScorePoints, targetScoreLabel, currentMaxScore]);

    // BUG-8 FIX: Merge both operations into a single setData call to prevent desync
    const handleClearHistory = useCallback(() => {
        setData(prev => {
            if (prev) {
                prev.coachPlan = [];
                prev.coachPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
            }
            return; // Immer: explicit void return — mutation is intentional
        });
    }, [setData]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);

    if (isAnalyzing || !data || !data.categories) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <Brain className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={24} />
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-white font-black uppercase tracking-widest text-xs">Sincronizando Redes Neurais</span>
                    <span className="text-slate-500 text-[10px] mt-1 uppercase font-bold animate-pulse">Processando Probabilidades...</span>
                </div>
            </div>
        );
    }

    return (
        <PageErrorBoundary pageName="Coach">
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
                <div className="relative z-50 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <PageHeader
                        title="Análise do Coach"
                        description="Mentor estatístico processando seu desempenho para otimizar sua aprovação."
                    />

                    <div className="relative z-[60] flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 bg-slate-900/50 border border-white/10 p-2 sm:p-3 rounded-3xl backdrop-blur-xl w-full md:w-auto shadow-inner">
                        <div className="flex items-center gap-3 sm:gap-4 px-2">
                            <QuickStat label="Volatilidade" value={`${normalizedVolatility.toFixed(1)}pp`} color="text-rose-400" icon={<Zap size={14} />} />
                            <div className="w-px h-6 bg-white/10" />
                            <QuickStat
                                label="Tendência"
                                value={`${((drift * 30) / Math.max(1, Number(currentMaxScore) || 1) * 100).toFixed(1)}pp`}
                                color="text-emerald-400"
                                icon={<ArrowUpRight size={14} />}
                            />
                            <div className="w-px h-6 bg-white/10" />
                            <QuickStat label="Simulados" value={totalSimulados} color="text-indigo-400" icon={<Dna size={14} />} />
                        </div>
                        <div className="hidden sm:block w-px h-6 bg-white/10" />
                        <MonteCarloDebugger stats={mcStats} />
                    </div>
                </div>

                <AnimatePresence>
                    <GovernanceBanner data={data} />
                </AnimatePresence>

                <div className="space-y-10">
                    <div className="w-full">
                        <CoachMenuNav activeTab={safeActiveTab} onChangeTab={handleChangeTab} isPremium={isPremium} />

                        <Motion.div
                            key={safeActiveTab}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="min-h-[200px]"
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
                                                    <span className="font-semibold">{flashcardDue} flashcards</span> pendentes para hoje. SRS melhora retenção e o modelo.
                                                </div>
                                                <button
                                                    onClick={() => navigate('/flashcards')}
                                                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition"
                                                >
                                                    FLASHCARDS
                                                </button>
                                            </div>
                                        )}

                                        {/* Visual global MC context */}
                                        {suggestedFocus?.globalProjectedMean != null && (
                                            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs">
                                                <span className="font-semibold text-emerald-300">Global MC:</span>
                                                <span className="font-mono text-base font-bold text-emerald-200">{suggestedFocus.globalProjectedMean}%</span>
                                                <span className="text-emerald-400/60">contexto global aplicado</span>
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
                                {safeActiveTab === 'analytics' && <RaioXDashboard data={data} />}
                            </div>
                        </Motion.div>
                    </div>
                </div>
            </div>
        </PageErrorBoundary>
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

function StatRow({ label, value, trend, color }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`text-xs font-black ${color}`}>{value}</span>
                {trend === 'up' && <ArrowUpRight size={12} className="text-emerald-500" />}
                {trend === 'down' && <AlertCircle size={12} className="text-rose-500" />}
            </div>
        </div>
    );
}

const GovernanceBanner = React.memo(function GovernanceBanner({ data }) {
    const ops = data?.calibrationOps || {};
    const degradedCount = Object.values(ops).filter(o => o.degraded).length;

    if (degradedCount === 0) return null;

    return (
        <Motion.div
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
            <div className="hidden sm:block text-right">
                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-tight">
                    O Coach está aplicando<br />ajustes conservadores.
                </p>
            </div>
        </Motion.div>
    );
});

function RaioXDashboard({ data }) {
    const ops = data?.calibrationOps || {};
    const [filter, setFilter] = useState('all');

    const toFiniteNumber = (value, fallback = 0) => {
        if (value === null || value === undefined || value === '') return fallback;
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    // BUG-7 FIX: Derive 'now' from latest calibration timestamp to avoid impure Date.now() in useMemo.
    // Falls back to a coarse epoch bucket (per-minute) only when no timestamps exist,
    // which is stable enough to not cause unnecessary recomputation.
    const calibrationSummary = useMemo(() => {
        const historyByCategory = data?.calibrationHistoryByCategory || {};
        // Derive 'now' from the data itself: use the newest timestamp across all categories
        let latestTs = 0;
        for (const entries of Object.values(historyByCategory)) {
            if (Array.isArray(entries)) {
                for (const e of entries) {
                    const ts = toFiniteNumber(e?.timestamp);
                    if (ts > latestTs) latestTs = ts;
                }
            }
        }
        // If no timestamps exist, use a coarse epoch (won't cause re-renders since dep didn't change)
        // eslint-disable-next-line react-hooks/purity
        const now = latestTs > 0 ? latestTs : Math.floor(Date.now() / 60000) * 60000;
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
                const avgBrier = brierValues.length > 0 ? brierValues.reduce((acc, val) => acc + val, 0) / brierValues.length : 0;
                const avgPenalty = penaltyValues.length > 0 ? penaltyValues.reduce((acc, val) => acc + val, 0) / penaltyValues.length : 0;
                const validCount = base.filter(h => Number.isFinite(Number(h?.avgBrier)) || Number.isFinite(Number(h?.calibrationPenalty))).length;
                if (validCount === 0) return null;
                const label = rows[rows.length - 1]?.categoryName || categoryId;
                return { categoryId, label, count: validCount, avgBrier, avgPenalty };
            })
            .filter(Boolean);
    }, [data?.calibrationHistoryByCategory]);

    const toPercentLabel = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return '-';
        return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
    };

    const sortedLogs = useMemo(() => {
        const source = Array.isArray(data?.calibrationAuditLog) ? data.calibrationAuditLog : [];
        return [...source].sort((a, b) => toFiniteNumber(b?.timestamp) - toFiniteNumber(a?.timestamp));
    }, [data?.calibrationAuditLog]);

    const filteredLogs = useMemo(() => (sortedLogs
        .filter(log => filter === 'all' || (filter === 'degraded' && Boolean(log?.degraded)))
        .slice(0, 50)), [sortedLogs, filter]);

    const latestWithReliability = sortedLogs.find(log => Array.isArray(log?.reliability) && log.reliability.length > 0);
    const eceValues = sortedLogs.map(log => toFiniteNumber(log?.ece, null)).filter(val => val !== null);
    const avgEce = eceValues.length ? (eceValues.reduce((a, b) => a + b, 0) / eceValues.length) : null;
    const categorySeriesMap = sortedLogs.reduce((acc, log) => {
        const cat = log?.categoryName || 'Categoria';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push({
            ts: toFiniteNumber(log?.timestamp),
            brier: toFiniteNumber(log?.avgBrier),
            ece: toFiniteNumber(log?.ece)
        });
        return acc;
    }, {});
    const categoryNames = Object.keys(categorySeriesMap);
    const [seriesCategory, setSeriesCategory] = useState(() => categoryNames[0] || '');
    // BUG-07 FIX: Keep selected category valid when data changes
    const effectiveCategory = categoryNames.includes(seriesCategory) ? seriesCategory : (categoryNames[0] || '');
    const temporalSeries = effectiveCategory
        ? [...categorySeriesMap[effectiveCategory]].sort((a, b) => a.ts - b.ts).slice(-12)
        : [];

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Monitor de Calibração unificado */}
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
                            const avgBrier = toFiniteNumber(row.avgBrier);
                            const brierPct = Math.min(100, (avgBrier / 0.35) * 100);
                            const radius = 14;
                            const circ = 2 * Math.PI * radius;
                            const offset = circ - (brierPct / 100) * circ;
                            const colorClass = avgBrier >= 0.25 ? 'text-rose-500' : (avgBrier > 0.18 ? 'text-amber-500' : 'text-emerald-500');

                            return (
                                <div key={row.categoryId} className="group/card relative rounded-2xl border border-white/[0.05] bg-slate-900/50 p-4 sm:p-5 hover:bg-slate-800/60 transition-all duration-300 flex flex-col justify-between">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <p className="text-sm sm:text-[15px] text-white font-black tracking-tight truncate mb-1.5">
                                                {displaySubject(row.label)}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner ${op.degraded ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${op.degraded ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse shadow-[0_0_8px_currentColor]`} />
                                                    {op.degraded ? 'Degradado' : 'Estável'}
                                                </div>
                                                <span className="text-[9px] font-mono text-slate-500 font-bold bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md">n={row.count}</span>
                                            </div>
                                        </div>

                                        <div className="shrink-0 relative w-12 h-12 flex items-center justify-center">
                                            <svg className="w-full h-full -rotate-90 transform drop-shadow-md" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r={radius} fill="none" className="stroke-black/40" strokeWidth="3" />
                                                <circle
                                                    cx="18" cy="18" r={radius} fill="none"
                                                    className={`stroke-current ${colorClass} transition-all duration-1000 ease-out`}
                                                    strokeWidth="3"
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
                                        <div className="group/tooltip relative flex items-center gap-1 cursor-help">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/tooltip:text-slate-300 transition-colors border-b border-dashed border-slate-600">Desvio (Brier)</span>
                                            <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-[#0a0c14] text-[10px] font-medium text-slate-300 rounded-lg shadow-2xl border border-white/10 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                                                <strong className="text-white font-black block mb-1">Score de Brier</strong>
                                                Mede a precisão das projeções Monte Carlo. Quanto menor o valor (verde), mais assertivo está o motor.
                                            </div>
                                        </div>

                                        {(() => {
                                            const pen = toFiniteNumber(row.avgPenalty);
                                            if (pen <= 0.001) return null;
                                            return (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Pena: <span className="font-mono">-{Math.round(pen * 100)}%</span></span>
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
                <div className="py-8 text-center space-y-2">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Amostra técnica insuficiente</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight max-w-[200px] mx-auto leading-tight">
                        Requer <span className="text-indigo-400">3 simulados por matéria</span> para calibrar.
                    </p>
                </div>
            )}
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
                                <th className="pb-3 pl-2 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[120px]">Data</th>
                                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[140px]">Categoria</th>
                                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">Brier (erro)</th>
                                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">ECE (calib.)</th>
                                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[110px]">Ajuste</th>
                                <th className="pb-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap min-w-[100px]">Prob Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLogs.map((log, idx) => (
                                <tr key={`${toFiniteNumber(log?.timestamp, idx)}-${log?.categoryName || 'cat'}-${idx}`} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-3 pl-2 text-[10px] text-slate-500 font-mono whitespace-nowrap">{toFiniteNumber(log?.timestamp) > 0 ? formatDateTimePtBR(log.timestamp) : '-'}</td>
                                    <td className="py-3 px-4 text-[10px] text-white font-bold whitespace-nowrap">{displaySubject(log.categoryName)}</td>
                                    <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap ${log.avgBrier > 0.25 ? 'text-rose-400' : 'text-emerald-400'}`}>{toFiniteNumber(log?.avgBrier, null) !== null ? Number(log.avgBrier).toFixed(3) : '-'}</td>
                                    <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap ${Number(log?.ece || 0) > 0.12 ? 'text-amber-400' : 'text-cyan-300'}`}>{toFiniteNumber(log?.ece, null) !== null ? Number(log.ece).toFixed(3) : '-'}</td>
                                    <td className="py-3 px-4 text-[10px] text-amber-400 font-bold whitespace-nowrap">
                                        {toFiniteNumber(log?.calibrationPenalty) > 0.001 ? `-${Math.round(toFiniteNumber(log.calibrationPenalty) * 100)}% (shrink)` : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-[10px] text-white font-black whitespace-nowrap">{toPercentLabel(log?.probability)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="py-12 text-center space-y-2 px-4">
                            <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">Nenhum evento registrado</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight max-w-[340px] mx-auto leading-tight">
                                Os diagnósticos surgirão automaticamente após atingir a maturidade de dados (n=3).
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-2 border-t border-white/5 pt-8">
                <div className="flex items-center justify-between mb-5 gap-3">
                    <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em]">Confiabilidade (ECE)</h3>
                    <span className="text-[10px] font-black text-cyan-300 shrink-0">
                        {avgEce !== null ? `ECE médio: ${avgEce.toFixed(3)}` : 'Sem ECE'}
                    </span>
                </div>
                {latestWithReliability ? (
                    <ReliabilityCurveChart buckets={latestWithReliability.reliability} />
                ) : (
                    <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Sem buckets de confiabilidade ainda</p>
                )}
            </div>
            <div className="p-2 border-t border-white/5 pt-8">
                <div className="flex items-center justify-between mb-5 gap-3">
                    <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em]">Drift Temporal (Brier/ECE)</h3>
                    {categoryNames.length > 1 ? (
                        <select
                            value={effectiveCategory}
                            onChange={(e) => setSeriesCategory(e.target.value)}
                            className="text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2 outline-none cursor-pointer hover:bg-slate-800 transition-all backdrop-blur-md"
                        >
                            {categoryNames.map(cat => (
                                <option key={cat} value={cat}>{displaySubject(cat)}</option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-[10px] text-slate-400 font-bold">
                            {effectiveCategory ? displaySubject(effectiveCategory) : 'Sem categoria'}
                        </span>
                    )}
                </div>

                {temporalSeries.length > 1 ? (
                    <div className="space-y-2">
                        {temporalSeries.map((point, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                                    <span>{point.ts > 0 ? formatDatePtBR(point.ts) : '-'}</span>
                                    <span>Brier {point.brier.toFixed(3)} · ECE {point.ece.toFixed(3)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                                        <div className="h-full bg-rose-400/80" style={{ width: `${Math.min(100, point.brier * 100)}%` }} />
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                                        <div className="h-full bg-cyan-400/80" style={{ width: `${Math.min(100, point.ece * 100)}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Dados temporais insuficientes</p>
                )}
            </div>
        </div>
    );
}
