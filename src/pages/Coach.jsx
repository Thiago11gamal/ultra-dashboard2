import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    Brain, 
    Zap, 
    AlertCircle, 
    ArrowUpRight,
    ArrowDownRight,
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
import { useAuth } from '../context/useAuth';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { getSuggestedFocus, generateDailyGoals, clearMcCache, clearUrgencyCache, clearTopicsCache, getCombinedHistory } from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { logCalibrationTelemetryEvent } from '../utils/calibrationTelemetry';
import { CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD, ALERT_COOLDOWN_MS } from '../utils/calibration.js';
import { displaySubject } from '../utils/displaySubject';
import { formatDateTimePtBR } from '../utils/dateHelper';
import { getSafeId } from '../utils/idGenerator';
import { isSubjectMatch } from '../utils/normalization';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)

const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45; // 45 dias
const CALIBRATION_ALERT_CACHE_MAX = 200;
// P15 PERF FIX: Freeze for referential stability (matches pattern used elsewhere)
const EMPTY_ARRAY = Object.freeze([]);

export default function Coach() {
    const isMountedRef = useRef(true);
    const topRef = useRef(null);
    const calibrationAlertCacheRef = useRef(new Map());
    const [coachLoading, setCoachLoading] = useState(false);
    const [suggestedFocus, setSuggestedFocus] = useState(null);
    const timeoutRef = useRef(null);
    const generationTimeoutsRef = useRef([]);
    const lastPushedScoreRef = useRef(null);
    const activeId = useAppStore(state => state.appState.activeId);

    // LEAK-MCCACHE FIX: limpar o cache do Monte Carlo ao trocar de concurso.
    // O hash já previne resultados errados, mas entradas do concurso anterior
    // ocupam memória desnecessariamente até o cap de 50 ser atingido.
    useEffect(() => {
        clearMcCache();
        clearUrgencyCache();
        clearTopicsCache();
        // G-03 FIX: Limpar cache de alertas ao trocar de concurso
        calibrationAlertCacheRef.current.clear();
        lastPushedScoreRef.current = null;
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
            setCoachLoading(false);
        }
        if (generationTimeoutsRef.current.length > 0) {
            generationTimeoutsRef.current.forEach(clearTimeout);
            generationTimeoutsRef.current = [];
        }
        const timer = setTimeout(() => {
            if (isMountedRef.current) {
                setSuggestedFocus(null);
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [activeId]);

    // G-03 FIX: Cleanup periódico do cache de alertas (evita leak)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            for (const [key, ts] of calibrationAlertCacheRef.current.entries()) {
                if (now - ts > ALERT_COOLDOWN_MS) calibrationAlertCacheRef.current.delete(key);
            }
        }, 60000); // a cada 60s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Garantir que a tela do Coach AI seja perfeitamente enquadrada a partir do topo
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (topRef.current) {
            const mainContainer = topRef.current.closest('main');
            if (mainContainer) {
                mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
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
    const { currentUser } = useAuth();
    const { isPremium } = useSubscription(currentUser || userProfile);
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('insights');

    const VALID_TABS = new Set(['insights', 'analytics']);
    const safeActiveTab = VALID_TABS.has(activeTab) ? activeTab : 'insights';
    
    useEffect(() => {
        if (activeTab && activeTab !== safeActiveTab) {
            console.warn(`[Coach.jsx] Estado de aba inválido recebido: ${activeTab}, ativando fallback.`);
        }
    }, [activeTab, safeActiveTab]);

    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const calibrationHistoryRef = useRef(data?.calibrationHistoryByCategory || {});

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

    const categoriesRef = useRef(data?.categories || []);
    useEffect(() => {
        categoriesRef.current = data?.categories || [];
    }, [data?.categories]);

    // Backfill de simulados agora é gerenciado no hook useMonteCarloStats via rawSimuladoRows (evita duplicação).

    const lastPersistByCategoryRef = useRef({});
    const persistCalibrationMetric = useCallback((metric) => {
        if ((!metric?.categoryId && !metric?.categoryName) || !isMountedRef.current) return;

        // RATE-LIMIT: Evita loops por categoria se métricas forem emitidas em sequência rápida
        const now = Date.now();
        const normalizedCategoryId = getSafeId(metric?.categoryId || metric?.categoryName);
        if (!normalizedCategoryId) return;

        const catKey = String(normalizedCategoryId);
        if (now - (lastPersistByCategoryRef.current[catKey] || 0) < 500) return;
        lastPersistByCategoryRef.current[catKey] = now;

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
        const isDegraded = metric?.degraded === true || 
            calibrationPenalty >= HIGH_PENALTY_THRESHOLD || 
            (avgBrier !== null && avgBrier >= CRITICAL_BRIER_THRESHOLD);

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
            reliability,
            degraded: isDegraded
        };

        let didSkipPersist = false;
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
                const degradationChanged = Boolean(lastEntry.degraded) !== Boolean(isDegraded);

                const prevBrierBase = Number.isFinite(Number(lastEntry.avgBrier)) ? Math.max(0.001, Math.abs(Number(lastEntry.avgBrier))) : 0.001;
                const prevEceBase = Number.isFinite(Number(lastEntry.ece)) ? Math.max(0.001, Math.abs(Number(lastEntry.ece))) : 0.001;

                // BUG 6 FIX: Lowered absolute thresholds to capture low-variance micro-movements
                const shouldSkipPersist =
                    (brierDelta < 0.001 || (brierDelta / prevBrierBase) < 0.05) &&
                    (eceDelta < 0.001 || (eceDelta / prevEceBase) < 0.05) &&
                    penaltyDelta < 0.001 &&
                    probabilityDelta < 0.01 &&
                    !reliabilitySignatureChanged;

                if (shouldSkipPersist && !degradationChanged) {
                    didSkipPersist = true;
                    return prev;
                }
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
            return {
                calibrationHistoryByCategory: {
                    ...(prev.calibrationHistoryByCategory || {}),
                    [normalizedCategoryId]: nextHistory
                },
                calibrationOps,
                calibrationAuditLog
            };
        });

        if (didSkipPersist) return;

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
                // VIS-FIX: avgBrier pode ser null (degradação só por penalty) → antes exibia "Brier 0.00".
                const brierLabel = avgBrier !== null ? ` (Brier ${avgBrier.toFixed(2)})` : '';
                showToastRef.current(`⚠️ Calibração crítica em ${displaySubject(normalizedMetric.categoryName || normalizedCategoryId || 'categoria', categoriesRef.current)}${brierLabel}.`, 'warning');
                calibrationAlertCacheRef.current.delete(normalizedCategoryId);
                calibrationAlertCacheRef.current.set(normalizedCategoryId, currentTime);
                if (calibrationAlertCacheRef.current.size > CALIBRATION_ALERT_CACHE_MAX && calibrationAlertCacheRef.current.size > 0) {
                    const oldestKey = calibrationAlertCacheRef.current.keys().next().value;
                    if (oldestKey !== undefined) calibrationAlertCacheRef.current.delete(oldestKey);
                }
            }
        }
    }, [setData]);

    // BUG-11 FIX: Pass explicit defaults for timeIndex and timelineDates
    const currentMaxScore = data?.maxScore ?? 100;
    const currentMinScore = data?.minScore ?? 0;

    // BUG-26 FIX: Deduplicating history entries safely with correct scale
    const combinedHistory = useMemo(
        () => getCombinedHistory(history, simulados, currentMaxScore, currentMinScore),
        [history, simulados, currentMaxScore, currentMinScore]
    );
    
    // Converte targetScore ou targetProbability em pontos na escala da prova
    const targetScorePoints = useMemo(() => {
        const safeMax = Math.max(1, Number(currentMaxScore) || 100);
        const safeMin = Number.isFinite(Number(currentMinScore)) ? Math.min(Number(currentMinScore), safeMax) : 0;
        const clampVal = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
        
        if (userProfile?.targetScore != null && Number.isFinite(Number(userProfile.targetScore))) {
            let ts = Number(userProfile.targetScore);
            if (ts <= 100 && (safeMax - safeMin) > 100) {
                ts = safeMin + (ts / 100) * (safeMax - safeMin);
            }
            return clampVal(ts);
        }
        
        if (userProfile?.targetProbability != null && Number.isFinite(Number(userProfile.targetProbability))) {
            return clampVal(safeMin + (Number(userProfile.targetProbability) / 100) * (safeMax - safeMin));
        }
        
        return clampVal(safeMin + (safeMax - safeMin) * 0.85);
    }, [userProfile, currentMinScore, currentMaxScore]);
    
    const mcStats = useMonteCarloStats({
        categories: categories,
        goalDate: userProfile?.goalDate,
        targetScore: targetScorePoints,
        timeIndex: -1,
        timelineDates: EMPTY_ARRAY,
        minScore: currentMinScore,
        maxScore: currentMaxScore,
        simuladoRows: data?.simuladoRows || EMPTY_ARRAY
    });

    const projectedScore = mcStats?.projectedMean ?? 0;
    // UX-STABILITY: Para o card de volatilidade, preferimos pooledSD (determinístico)
    // ao sd da simulação MC (estocástico), reduzindo "pisca/pula" visual.
    const rawVolatility = mcStats?.statsData?.pooledSD ?? mcStats?.sd ?? 0;
    const volatility = Number.isFinite(Number(rawVolatility)) ? Number(rawVolatility) : 0;
    const normalizedVolatility = useMemo(() => {
        const domain = Math.max(1e-9, (Number(currentMaxScore) || 100) - (Number(currentMinScore) || 0));
        return (volatility / domain) * 100;
    }, [volatility, currentMaxScore, currentMinScore]);
    const drift = useMemo(() => calculateAdaptiveSlope(combinedHistory, currentMaxScore, { minScore: currentMinScore }), [combinedHistory, currentMaxScore, currentMinScore]);
    const normalizedDrift = useMemo(() => {
        const safeDrift = Number.isFinite(Number(drift)) ? Number(drift) : 0;
        const domain = Math.max(1e-9, (Number(currentMaxScore) || 100) - (Number(currentMinScore) || 0));
        const val = ((safeDrift * 30) / domain) * 100;
        return Number.isFinite(val) ? val : 0;
    }, [drift, currentMaxScore, currentMinScore]);
    const formattedDrift = useMemo(() => {
        if (Math.abs(normalizedDrift) < 0.05) return "0.0pp";
        return `${normalizedDrift > 0 ? '+' : ''}${normalizedDrift.toFixed(1)}pp`;
    }, [normalizedDrift]);
    const totalSimulados = useMemo(() => combinedHistory.length, [combinedHistory]);

    // VIS-FIX: projectedMean está na escala da prova (pontos), não em %.
    // Antes o banner exibia "Global MC: 742%" para provas com maxScore=1000.
    const globalProjection = useMemo(() => {
        const mean = Number(suggestedFocus?.globalProjectedMean ?? suggestedFocus?.globalMcContext?.projectedMean);
        if (!Number.isFinite(mean)) return null;
        const safeMax = Math.max(1, Number(currentMaxScore) || 100);
        const safeMin = Number.isFinite(Number(currentMinScore)) ? Math.min(Number(currentMinScore), safeMax - 1) : 0;
        const pct = Math.max(0, Math.min(100, ((mean - safeMin) / (safeMax - safeMin)) * 100));
        const prob = Number(suggestedFocus?.globalMcContext?.probability);
        return {
            points: mean,
            max: safeMax,
            pct,
            probability: Number.isFinite(prob) ? Math.max(0, Math.min(100, prob)) : null
        };
    }, [suggestedFocus?.globalProjectedMean, suggestedFocus?.globalMcContext, currentMaxScore, currentMinScore]);

    const degradedCount = useMemo(() => {
        const ops = data?.calibrationOps || {};
        const historyByCategory = data?.calibrationHistoryByCategory || {};
        let count = 0;
        const seenCanonical = new Set();

        categories.forEach(cat => {
            if (!cat) return;
            const canonicalKey = getSafeId(cat.id || cat.name);
            if (!canonicalKey || seenCanonical.has(canonicalKey)) return;
            seenCanonical.add(canonicalKey);

            const candidateKeys = [
                cat.id && String(cat.id),
                cat.id && getSafeId(cat.id),
                cat.name && String(cat.name),
                cat.name && getSafeId(cat.name)
            ].filter(Boolean);

            const op = candidateKeys.map(k => ops[k]).find(Boolean);
            if (op?.degraded) {
                count++;
                return;
            }

            const history = candidateKeys.map(k => historyByCategory[k]).find(h => Array.isArray(h) && h.length > 0);
            if (Array.isArray(history) && history.length > 0) {
                const latest = history[history.length - 1];
                const brier = latest?.avgBrier != null && latest?.avgBrier !== '' ? Number(latest.avgBrier) : NaN;
                const pen = latest?.calibrationPenalty != null && latest?.calibrationPenalty !== '' ? Number(latest.calibrationPenalty) : NaN;
                if ((Number.isFinite(brier) && brier >= CRITICAL_BRIER_THRESHOLD) || (Number.isFinite(pen) && pen >= HIGH_PENALTY_THRESHOLD)) {
                    count++;
                }
            }
        });
        return count;
    }, [data?.calibrationOps, data?.calibrationHistoryByCategory, categories]);

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
        if (!isHydrated) return;
        if (!data?.categories || categories.length === 0) {
            const timer = setTimeout(() => {
                if (isMountedRef.current) {
                    setSuggestedFocus(null);
                    setIsAnalyzing(false);
                }
            }, 0);
            return () => clearTimeout(timer);
        }

        let metricsTimer = null;
        let nestedTimeouts = [];
        // UX-FLUIDITY FIX: agenda o cálculo pesado para o próximo ciclo.
        // Se o usuário sair rapidamente do Coach, o cleanup cancela tudo e o menu
        // lateral não fica "preso" aguardando cálculo síncrono.
        const analysisTimer = setTimeout(() => {
            try {
                const safeTargetScore = Number.isFinite(Number(targetScorePoints)) ? Number(targetScorePoints) : null;
                const safeMax = Number.isFinite(currentMaxScore) ? currentMaxScore : (data?.maxScore ?? 100);
                const safeMin = Number.isFinite(currentMinScore) ? currentMinScore : (data?.minScore ?? 0);
                const collectedMetrics = [];

                const result = getSuggestedFocus(
                    categories,
                    combinedHistory,
                    studyLogs,
                    {
                        user: data?.user,
                        ...(safeTargetScore !== null ? { targetScore: safeTargetScore } : {}),
                        maxScore: safeMax,
                        minScore: safeMin,
                        calibrationHistoryByCategory: calibrationHistoryRef.current,
                        flashcardDecks: flashcardDecks,
                        flashcardDue,
                        onCalibrationMetric: (metric) => collectedMetrics.push(metric),
                        // Pass global MC stats for richer integration (see analysis of Coach + MC)
                        // FIX-#185: Read from ref (stable) instead of the reactive mcStatsContext
                        globalMcStats: mcStatsContextRef.current,
                        config: {
                            contestId: activeId,
                            MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                        }
                    }
                );

                // BEST: enrich the suggestion with global MC context for the UI
                const _mcCtx = mcStatsContextRef.current;
                if (result && _mcCtx && _mcCtx.projectedMean != null) {
                    const projectedVal = Number(_mcCtx.projectedMean.toFixed(1));
                    result.globalProjectedMean = projectedVal;
                    result.globalMcContext = {
                        projectedMean: projectedVal,
                        probability: _mcCtx.probability != null ? Number(_mcCtx.probability.toFixed(1)) : null,
                        source: 'useMonteCarloStats'
                    };
                }
                setSuggestedFocus(result);

                if (collectedMetrics.length > 0) {
                    metricsTimer = setTimeout(() => {
                        if (!isMountedRef.current) return;
                        collectedMetrics.forEach((metric, i) => {
                            const t = setTimeout(() => {
                                if (!isMountedRef.current) return;
                                persistCalibrationMetric(metric);
                            }, i * 600);
                            nestedTimeouts.push(t);
                        });
                    }, 1000); // Cooldown de 1s para deixar o dashboard respirar entre análises
                }
            } catch (err) {
                console.error('[Coach] Falha ao processar redes e análise do Coach:', err);
            } finally {
                setIsAnalyzing(false);
            }
        }, 0);

        return () => {
            clearTimeout(analysisTimer);
            if (metricsTimer) clearTimeout(metricsTimer);
            nestedTimeouts.forEach(clearTimeout);
        };
    // FIX-#185: mcStatsContext removed — it's read via mcStatsContextRef.current inside
    // the effect body, so it never needs to be a reactive dependency.
    }, [
        isHydrated,
        activeId,
        data?.categories,
        categories, 
        combinedHistory, 
        studyLogs, 
        data?.user, 
        currentMaxScore,
        currentMinScore,
        data?.maxScore, 
        data?.minScore,
        data?.settings?.adaptiveCalibrationEnabled,
        targetScorePoints,
        flashcardDue,
        flashcardDecks,
        persistCalibrationMetric
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
        if (coachLoading) return;
        if (!categories.length) {
            showToastRef.current('Cadastre matérias e registre simulados para o Coach gerar sugestões.', 'info');
            return;
        }
        setCoachLoading(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        if (generationTimeoutsRef.current.length > 0) {
            generationTimeoutsRef.current.forEach(clearTimeout);
            generationTimeoutsRef.current = [];
        }

        const capturedActiveId = activeId;
        timeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current || capturedActiveId !== activeId) return;

            try {
                const targetScore = Number.isFinite(Number(targetScorePoints)) ? Number(targetScorePoints) : null;
                const safeMax = Math.max(1, Number(currentMaxScore) || 100);
                const safeMin = Number.isFinite(Number(currentMinScore)) ? Number(currentMinScore) : 0;
                const collectedMetrics = [];

                // BUG-1 FIX: Use categories, combinedHistory, studyLogs directly (now in dep array)
                const newTasks = generateDailyGoals(
                    categories,
                    combinedHistory,
                    studyLogs,
                    {
                        user: data?.user,
                        ...(targetScore !== null ? { targetScore } : {}),
                        maxScore: safeMax,
                        minScore: safeMin,
                        calibrationHistoryByCategory: calibrationHistoryRef.current,
                        onCalibrationMetric: (metric) => collectedMetrics.push(metric),
                        config: {
                            contestId: capturedActiveId,
                            MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                        }
                    }
                );

                // REFRESH-FOCUS: Atualizar também a recomendação principal do topo
                try {
                    const freshFocus = getSuggestedFocus(
                        categories,
                        combinedHistory,
                        studyLogs,
                        {
                            user: data?.user,
                            ...(targetScore !== null ? { targetScore } : {}),
                            maxScore: safeMax,
                            minScore: safeMin,
                            calibrationHistoryByCategory: calibrationHistoryRef.current,
                            flashcardDecks,
                            flashcardDue,
                            globalMcStats: mcStatsContextRef.current,
                            config: {
                                contestId: capturedActiveId,
                                MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                            }
                        }
                    );
                    const _mcCtx = mcStatsContextRef.current;
                    if (freshFocus && _mcCtx && _mcCtx.projectedMean != null) {
                        const projectedVal = Number(_mcCtx.projectedMean.toFixed(1));
                        freshFocus.globalProjectedMean = projectedVal;
                        freshFocus.globalMcContext = {
                            projectedMean: projectedVal,
                            probability: _mcCtx.probability != null ? Number(_mcCtx.probability.toFixed(1)) : null,
                            source: 'useMonteCarloStats'
                        };
                    }
                    if (freshFocus) setSuggestedFocus(freshFocus);
                } catch (errFocus) {
                    console.warn('[Coach] Erro ao sincronizar suggestedFocus:', errFocus);
                }
                
                if (newTasks.length) {
                    setData(() => ({
                        coachPlan: newTasks,
                        coachPlanner: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
                    }));
                    showToastRef.current('Sugestões geradas!', 'success');
                } else {
                    showToastRef.current('Nenhuma sugestão necessária.', 'info');
                }

                collectedMetrics.forEach((metric, i) => {
                    const t = setTimeout(() => {
                        if (!isMountedRef.current) return;
                        persistCalibrationMetric(metric);
                    }, i * 600);
                    generationTimeoutsRef.current.push(t);
                });
            } catch (err) {
                console.error('[Coach] Erro ao gerar metas do Coach:', err);
                showToastRef.current('Erro ao calcular recomendações do Coach.', 'error');
            } finally {
                setCoachLoading(false);
                timeoutRef.current = null;
            }
        }, 1500);
    // BUG-1 FIX: Added categories, combinedHistory, studyLogs to prevent stale closure
    }, [activeId, data, coachLoading, setData, persistCalibrationMetric, targetScorePoints, currentMaxScore, currentMinScore, categories, combinedHistory, studyLogs, flashcardDecks, flashcardDue]);

    // BUG-8 FIX: Merge both operations into a single setData call to prevent desync
    const handleClearHistory = useCallback(() => {
        clearMcCache();
        clearUrgencyCache();
        clearTopicsCache();
        setData(() => ({
            coachPlan: [],
            coachPlanner: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
        }));
    }, [setData]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (generationTimeoutsRef.current) {
                generationTimeoutsRef.current.forEach(clearTimeout);
                generationTimeoutsRef.current = [];
            }
        };
    }, []);

    // BUG-FIX: antes, se o concurso não tinha `categories` (usuário novo), o efeito de
    // análise retornava cedo, isAnalyzing nunca virava false e o loader girava para sempre.
    if (!isHydrated || (isAnalyzing && data?.categories)) {
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
            <div ref={topRef} className="max-w-[1560px] mx-auto px-3 sm:px-5 lg:px-6 pt-1 sm:pt-2 pb-10 sm:pb-16">
                <div className="relative z-40 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
                    <PageHeader 
                        title="Análise do Coach" 
                        description="Mentor estatístico processando seu desempenho para otimizar sua aprovação."
                    />
                    
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 bg-slate-900/80 border border-white/10 p-2 sm:p-2.5 rounded-2xl backdrop-blur-xl w-full lg:w-auto shadow-xl">
                        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 px-1 w-full sm:w-auto">
                            <QuickStat label="Volatilidade" value={`${Number.isFinite(normalizedVolatility) ? normalizedVolatility.toFixed(1) : '0.0'}pp`} color="text-amber-400" icon={<Zap size={13} />} />
                            <div className="w-px h-5 bg-white/10 shrink-0" />
                            <QuickStat
                                label="Tendência"
                                value={formattedDrift}
                                color={normalizedDrift >= 0 ? "text-emerald-400" : "text-rose-400"}
                                icon={normalizedDrift >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            />
                            <div className="w-px h-5 bg-white/10 shrink-0" />
                            <QuickStat label="Simulados" value={totalSimulados} color="text-indigo-400" icon={<Dna size={13} />} />
                        </div>
                        <div className="hidden sm:block w-px h-5 bg-white/10 shrink-0" />
                        <div className="w-full sm:w-auto flex justify-end border-t border-white/5 pt-1.5 sm:pt-0 sm:border-t-0">
                            <MonteCarloDebugger stats={mcStats} />
                        </div>
                    </div>
                </div>

                {/* VIS-FIX: a condição fica no pai para o AnimatePresence conseguir animar a saída */}
                <AnimatePresence>
                    {degradedCount > 0 && <GovernanceBanner key="governance-banner" degradedCount={degradedCount} />}
                </AnimatePresence>

                <div className="space-y-4 sm:space-y-5">
                    <div className="w-full">
                        <CoachMenuNav activeTab={safeActiveTab} onChangeTab={handleChangeTab} isPremium={isPremium} />

                        <AnimatePresence mode="wait">
                            <Motion.div 
                                key={safeActiveTab}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="min-h-[200px]"
                            >
                                <div
                                    role="tabpanel"
                                    id={`coach-panel-${safeActiveTab}`}
                                    aria-labelledby={`coach-tab-${safeActiveTab}`}
                                    tabIndex={0}
                                >
                                    {safeActiveTab === 'insights' ? (
                                        <>
                                            {flashcardDue > 0 && (
                                                <div className="mb-3 flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 text-xs sm:text-sm">
                                                    <BookOpen className="text-amber-400 shrink-0" size={16} />
                                                    <div className="flex-1 min-w-[180px] text-amber-200">
                                                        <span className="font-semibold">{flashcardDue} flashcard{flashcardDue === 1 ? '' : 's'}</span> pendente{flashcardDue === 1 ? '' : 's'} para hoje. SRS melhora retenção e o modelo.
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/flashcards')}
                                                        className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition"
                                                    >
                                                        Revisar agora
                                                    </button>
                                                </div>
                                            )}

                                            {/* Visual global MC context */}
                                            {globalProjection && (
                                                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2 text-xs">
                                                    <span className="font-black uppercase tracking-[0.15em] text-[10px] text-emerald-300">Projeção Global</span>
                                                    <span className="font-mono text-sm sm:text-base font-bold text-emerald-200 tabular-nums">
                                                        {globalProjection.points.toFixed(1)}
                                                        <span className="text-emerald-400/60 text-xs"> / {globalProjection.max} pts</span>
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 font-mono font-bold text-emerald-300 tabular-nums text-xs">{Math.round(globalProjection.pct)}%</span>
                                                    {globalProjection.probability !== null && (
                                                        <span className="text-emerald-400/70 text-xs">· prob. de atingir a meta <span className="font-mono font-bold text-emerald-200">{Math.round(globalProjection.probability)}%</span></span>
                                                    )}
                                                </div>
                                            )}
                                            <AICoachView 
                                                suggestedFocus={suggestedFocus}
                                                onGenerateGoals={handleGenerateGoals}
                                                loading={coachLoading}
                                                onClearHistory={handleClearHistory}
                                            />
                                        </>
                                    ) : (
                                        <RaioXDashboard data={data} />
                                    )}
                                </div>
                            </Motion.div>
                        </AnimatePresence>
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
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">{label}</span>
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

const GovernanceBanner = React.memo(function GovernanceBanner({ degradedCount }) {
    return (
        <Motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="status"
            className="mb-6 p-4 rounded-3xl bg-rose-500/5 border border-rose-500/30 flex items-center justify-between gap-4 shadow-sm"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-400 border border-rose-500/20">
                    <AlertCircle size={20} />
                </div>
                <div className="min-w-0">
                    <h4 className="text-sm font-black text-rose-200 uppercase tracking-tight">Alerta de Governança</h4>
                    <p className="text-[10px] text-rose-300/80 font-medium uppercase tracking-widest">
                        Detectamos <span className="text-rose-400 font-black">{degradedCount}</span> {degradedCount === 1 ? 'categoria com calibração degradada' : 'categorias com calibração degradada'}.
                    </p>
                </div>
            </div>
            <div className="hidden sm:block text-right">
                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-tight">
                    O Coach está aplicando<br/>ajustes conservadores.
                </p>
            </div>
        </Motion.div>
    );
});

export function RaioXDashboard({ data }) {
    const ops = data?.calibrationOps || {};
    const [filter, setFilter] = useState('all');

    const toFiniteNumber = (value, fallback = 0) => {
        if (value === null || value === undefined || value === '') return fallback;
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    const categories = useMemo(() => {
        const raw = data?.categories || [];
        return (Array.isArray(raw) ? raw : Object.values(raw || {})).map(c => ({
            ...c,
            tasks: Array.isArray(c?.tasks) ? c.tasks : Object.values(c?.tasks || {})
        }));
    }, [data?.categories]);

    const activeCategoryIds = useMemo(() => {
        const set = new Set();
        categories.forEach(c => {
            if (c?.id) {
                set.add(String(c.id));
                set.add(getSafeId(c.id));
            }
            if (c?.name) {
                set.add(String(c.name));
                set.add(getSafeId(c.name));
            }
        });
        return set;
    }, [categories]);

    const rawSimulados = data?.simulados;
    const rawSimuladoRows = data?.simuladoRows;

    const categorySimCounts = useMemo(() => {
        const rawSims = Array.isArray(rawSimulados) ? rawSimulados : (rawSimulados ? Object.values(rawSimulados) : []);
        const rawRows = Array.isArray(rawSimuladoRows) ? rawSimuladoRows : (rawSimuladoRows ? Object.values(rawSimuladoRows) : []);
        const allSims = [...rawSims, ...rawRows];
        return categories.map(cat => {
            const catName = cat.name || cat.id || '';
            const count = allSims.filter(s => s && (
                (cat.id && s.categoryId && String(s.categoryId) === String(cat.id)) ||
                isSubjectMatch(s.subject || s.categoryName || s.materia || s.disciplina || '', catName)
            )).length;
            return {
                id: cat.id || catName,
                name: displaySubject(catName, categories),
                count,
                target: 8
            };
        }).filter(c => c.name);
    }, [categories, rawSimulados, rawSimuladoRows]);

    // BUG-7 FIX: Derive 'now' from latest calibration timestamp to avoid impure Date.now() in useMemo.
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
        const now = latestTs;
        const mergedByCanonical = new Map();
        Object.entries(historyByCategory)
            .filter(([categoryId]) => {
                if (activeCategoryIds.size === 0) return true;
                return activeCategoryIds.has(String(categoryId)) || activeCategoryIds.has(getSafeId(categoryId));
            })
            .forEach(([categoryId, history]) => {
                const rows = Array.isArray(history) ? history : [];
                if (rows.length === 0) return;
                const matchedCategory = categories.find(c => c && (
                    String(c.id) === categoryId ||
                    String(c.name) === categoryId ||
                    getSafeId(c.id) === getSafeId(categoryId) ||
                    getSafeId(c.name) === getSafeId(categoryId)
                ));
                const canonicalId = getSafeId(matchedCategory?.id || matchedCategory?.name || categoryId) || String(categoryId);
                const prev = mergedByCanonical.get(canonicalId) || { categoryId: canonicalId, matchedCategory, rows: [] };
                prev.rows.push(...rows);
                mergedByCanonical.set(canonicalId, prev);
            });

        return Array.from(mergedByCanonical.values())
            .map(({ categoryId, matchedCategory, rows }) => {
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
                // FIX: If no brier values exist yet, return null (never a fake 0.00 "perfect" error)
                const avgBrier = brierValues.length > 0 ? brierValues.reduce((acc, val) => acc + val, 0) / brierValues.length : null;
                const avgPenalty = penaltyValues.length > 0 ? penaltyValues.reduce((acc, val) => acc + val, 0) / penaltyValues.length : null;
                const validCount = base.filter(h => Number.isFinite(Number(h?.avgBrier)) || Number.isFinite(Number(h?.calibrationPenalty))).length;
                if (validCount === 0) return null;
                const label = matchedCategory?.name || rows[rows.length - 1]?.categoryName || categoryId;
                return { categoryId, label, count: validCount, avgBrier, avgPenalty };
            })
            .filter(Boolean);
    }, [data?.calibrationHistoryByCategory, activeCategoryIds, categories]);

    const toPercentLabel = (value) => {
        if (value === null || value === undefined || value === '') return '-';
        const n = Number(value);
        if (!Number.isFinite(n)) return '-';
        const pct = Math.abs(n) <= 1 ? n * 100 : n;
        return `${Math.max(0, Math.min(100, Math.round(pct)))}%`;
    };

    const sortedLogs = useMemo(() => {
        const source = Array.isArray(data?.calibrationAuditLog) ? data.calibrationAuditLog : [];
        return [...source].sort((a, b) => toFiniteNumber(b?.timestamp) - toFiniteNumber(a?.timestamp));
    }, [data?.calibrationAuditLog]);

    const isLogDegraded = useCallback((log) => {
        if (log?.degraded) return true;
        const brier = toFiniteNumber(log?.avgBrier, null);
        if (brier !== null && brier >= CRITICAL_BRIER_THRESHOLD) return true;
        const penalty = toFiniteNumber(log?.calibrationPenalty, 0);
        if (penalty >= HIGH_PENALTY_THRESHOLD) return true;
        return false;
    }, []);

    const filteredLogs = useMemo(() => (sortedLogs
        .filter(log => filter === 'all' || (filter === 'degraded' && isLogDegraded(log)))
        .slice(0, 50)), [sortedLogs, filter, isLogDegraded]);

    // FIX: Canonical category grouping for temporal drift chart using displaySubject
    const categorySeriesMap = useMemo(() => {
        return sortedLogs.reduce((acc, log) => {
            const rawCat = log?.categoryName || log?.categoryId;
            if (!rawCat) return acc;
            const catKey = displaySubject(rawCat, categories) || String(rawCat).trim();
            if (!acc[catKey]) acc[catKey] = [];
            const brier = toFiniteNumber(log?.avgBrier, null);
            const ece = toFiniteNumber(log?.ece, null);
            if (brier !== null || ece !== null) {
                acc[catKey].push({
                    ts: toFiniteNumber(log?.timestamp),
                    brier,
                    ece
                });
            }
            return acc;
        }, {});
    }, [sortedLogs, categories]);

    const categoryNames = useMemo(() => Object.keys(categorySeriesMap), [categorySeriesMap]);
    const [seriesCategory, setSeriesCategory] = useState(() => categoryNames[0] || '');
    const effectiveCategory = categoryNames.includes(seriesCategory) ? seriesCategory : (categoryNames[0] || '');

    // FIX-CRASH: Guard against categorySeriesMap[effectiveCategory] being undefined
    const temporalSeries = useMemo(() => {
        if (!effectiveCategory || !categorySeriesMap[effectiveCategory]) return [];
        return [...categorySeriesMap[effectiveCategory]].sort((a, b) => a.ts - b.ts).slice(-12);
    }, [effectiveCategory, categorySeriesMap]);

    // FIX: Prefer reliability diagram for the selected category, fall back to newest with reliability
    const activeReliabilityLog = useMemo(() => {
        if (effectiveCategory) {
            const match = sortedLogs.find(log => {
                const name = displaySubject(log?.categoryName || log?.categoryId, categories);
                return name === effectiveCategory && Array.isArray(log?.reliability) && log.reliability.length > 0;
            });
            if (match) return match;
        }
        return sortedLogs.find(log => Array.isArray(log?.reliability) && log.reliability.length > 0) || null;
    }, [sortedLogs, effectiveCategory, categories]);

    const avgEce = useMemo(() => {
        const targetLogs = effectiveCategory
            ? sortedLogs.filter(log => displaySubject(log?.categoryName || log?.categoryId, categories) === effectiveCategory)
            : sortedLogs;
        const eceValues = (targetLogs.length > 0 ? targetLogs : sortedLogs)
            .map(log => toFiniteNumber(log?.ece, null))
            .filter(val => val !== null);
        return eceValues.length ? (eceValues.reduce((a, b) => a + b, 0) / eceValues.length) : null;
    }, [sortedLogs, effectiveCategory, categories]);

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
                            const op = ops[row.categoryId] || ops[getSafeId(row.categoryId)] || (row.label && ops[getSafeId(row.label)]) || (row.label && ops[row.label]) || {};
                            const hasBrier = row.avgBrier !== null && Number.isFinite(row.avgBrier);
                            const avgBrier = hasBrier ? Number(row.avgBrier) : null;
                            const penVal = toFiniteNumber(row.avgPenalty);
                            const isDegraded = Boolean(op.degraded || (hasBrier && avgBrier >= CRITICAL_BRIER_THRESHOLD) || penVal >= HIGH_PENALTY_THRESHOLD);
                            
                            const brierPct = hasBrier ? Math.max(0, Math.min(100, (avgBrier / 0.35) * 100)) : 0;
                            const radius = 14;
                            const circ = 2 * Math.PI * radius;
                            const offset = Number.isFinite(circ - (brierPct / 100) * circ) ? circ - (brierPct / 100) * circ : circ;
                            const colorClass = !hasBrier ? 'text-slate-400' : (avgBrier >= 0.25 ? 'text-rose-500' : (avgBrier > 0.18 ? 'text-amber-500' : 'text-emerald-500'));
                            
                            return (
                                <div key={row.categoryId} className="group/card relative rounded-2xl border border-white/[0.05] bg-slate-900/50 p-4 sm:p-5 hover:bg-slate-800/60 transition-all duration-300 flex flex-col justify-between">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <p className="text-sm sm:text-[15px] text-white font-black tracking-tight truncate mb-1.5" title={displaySubject(row.label, categories)}>
                                                {displaySubject(row.label, categories)}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner ${isDegraded ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isDegraded ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse shadow-[0_0_8px_currentColor]`} />
                                                    {isDegraded ? 'Degradado' : 'Estável'}
                                                </div>
                                                <span className="text-[9px] font-mono text-slate-500 font-bold bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md" title={`${row.count} eventos de calibração analisados`}>n={row.count}</span>
                                            </div>
                                        </div>

                                        <div className="shrink-0 relative w-12 h-12 flex items-center justify-center">
                                            <svg className="w-full h-full -rotate-90 transform drop-shadow-md" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r={radius} fill="none" className="stroke-white/10" strokeWidth="3" />
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
                                                    {hasBrier ? avgBrier.toFixed(2) : '-'}
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
                                            if (penVal <= 0.001) return null;
                                            return (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Pena: <span className="font-mono">-{Math.round(penVal * 100)}%</span></span>
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
                <div className="py-8 px-5 rounded-2xl border border-white/5 bg-slate-900/40 space-y-4">
                    <div className="text-center space-y-1.5">
                        <p className="text-[11px] text-slate-300 font-black uppercase tracking-widest">Amostra técnica em formação</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight max-w-[460px] mx-auto leading-relaxed">
                            O motor estatístico requer no mínimo <span className="text-indigo-400 font-bold">8 simulados por disciplina</span> para calcular Brier Score, ECE e calibração estocástica com rigor preditivo (n=8).
                        </p>
                    </div>

                    {categorySimCounts.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                            {categorySimCounts.map(item => {
                                const pct = Math.min(100, Math.round((item.count / item.target) * 100));
                                const missing = Math.max(0, item.target - item.count);
                                return (
                                    <div key={item.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.05] flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="font-bold text-slate-200 truncate">{item.name}</span>
                                            <span className="font-mono font-black text-indigo-400 shrink-0">{item.count}/{item.target}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-right">
                                            {missing > 0 ? `Faltam ${missing} simulados` : 'Calibrado'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            <div className="p-2 border-t border-white/5 pt-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em] flex items-center gap-2">
                        <List size={14} className="text-indigo-400/80" />
                        Log de Auditoria
                    </h3>
                    <div className="flex gap-1 bg-slate-900/50 border border-white/5 rounded-xl p-0.5" role="group" aria-label="Filtrar log de auditoria">
                        <button 
                            type="button"
                            aria-pressed={filter === 'all'}
                            onClick={() => setFilter('all')}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Tudo
                        </button>
                        <button 
                            type="button"
                            aria-pressed={filter === 'degraded'}
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
                            <tr className="border-b border-white/10 bg-white/[0.03]">
                                <th className="py-3.5 pl-4 pr-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[120px]">Data</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[140px]">Categoria</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[100px]" title="Brier Score — quanto menor o valor, mais preciso o motor">Brier (erro)</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[100px]" title="Expected Calibration Error — mede calibração probabilística">ECE (calib.)</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[110px]">Ajuste</th>
                                <th className="py-3.5 pl-4 pr-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[100px] text-right">Prob Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLogs.map((log, idx) => {
                                const brierVal = toFiniteNumber(log?.avgBrier, null);
                                const eceVal = toFiniteNumber(log?.ece, null);
                                const brierColor = brierVal === null ? 'text-slate-500' : (brierVal >= 0.25 ? 'text-rose-400' : (brierVal > 0.18 ? 'text-amber-400' : 'text-emerald-400'));
                                const eceColor = eceVal === null ? 'text-slate-500' : (eceVal > 0.12 ? 'text-amber-400' : 'text-cyan-300');
                                const isDeg = isLogDegraded(log);
                                return (
                                <tr key={`${toFiniteNumber(log?.timestamp, idx)}-${log?.categoryName || 'cat'}-${idx}`} className="group hover:bg-white/[0.03] transition-colors">
                                    <td className="py-3 pl-4 pr-4 text-[10px] text-slate-400 font-mono whitespace-nowrap">{toFiniteNumber(log?.timestamp) > 0 ? formatDateTimePtBR(log.timestamp) : '-'}</td>
                                    <td className="py-3 px-4 text-[10px] text-white font-bold whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span>{displaySubject(log.categoryName || log.categoryId, categories)}</span>
                                            {isDeg && (
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                                    Degradado
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap font-bold ${brierColor}`}>{brierVal !== null ? brierVal.toFixed(3) : '-'}</td>
                                    <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap font-bold ${eceColor}`}>{eceVal !== null ? eceVal.toFixed(3) : '-'}</td>
                                    <td className="py-3 px-4 text-[10px] text-amber-400 font-bold whitespace-nowrap">
                                        {toFiniteNumber(log?.calibrationPenalty) > 0.001 ? `-${Math.round(toFiniteNumber(log.calibrationPenalty) * 100)}% (calibração)` : '-'}
                                    </td>
                                    <td className="py-3 pl-4 pr-4 text-[10px] text-white font-black whitespace-nowrap text-right tabular-nums">{toPercentLabel(log?.probability)}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="py-12 text-center space-y-2 px-4">
                            <p className="text-[11px] text-slate-300 font-black uppercase tracking-widest">
                                {sortedLogs.length > 0 && filter === 'degraded'
                                    ? 'Nenhum evento degradado'
                                    : 'Nenhum evento registrado'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight max-w-[360px] mx-auto leading-relaxed">
                                {sortedLogs.length > 0 && filter === 'degraded'
                                    ? 'Todas as calibrações registradas estão estáveis.'
                                    : 'Os diagnósticos de auditoria surgirão automaticamente após atingir a maturidade de dados (n=8 por disciplina).'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-5 gap-3">
                    <div>
                        <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Confiabilidade (ECE)</h3>
                        {activeReliabilityLog && (
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                {displaySubject(activeReliabilityLog.categoryName || activeReliabilityLog.categoryId, categories)}
                                {activeReliabilityLog?.timestamp > 0 ? ` · ${formatDateTimePtBR(activeReliabilityLog.timestamp)}` : ''}
                            </p>
                        )}
                    </div>
                    <span className="text-[10px] font-black text-cyan-300 shrink-0">
                        {avgEce !== null ? `ECE médio: ${avgEce.toFixed(3)}` : 'Sem ECE'}
                    </span>
                </div>
                {activeReliabilityLog ? (
                    <ReliabilityCurveChart buckets={activeReliabilityLog.reliability} />
                ) : (
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center py-6">Sem buckets de confiabilidade ainda</p>
                )}
            </div>
            <div className="p-4 sm:p-6 rounded-2xl border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-5 gap-3">
                    <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Drift Temporal (Brier/ECE)</h3>
                    {categoryNames.length > 1 ? (
                        <select
                            value={effectiveCategory}
                            onChange={(e) => setSeriesCategory(e.target.value)}
                            className="text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-slate-900/60 border border-white/10 rounded-xl px-3 sm:px-4 py-2 outline-none cursor-pointer hover:bg-slate-800 transition-all backdrop-blur-md max-w-[170px] sm:max-w-[240px] truncate"
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
                        {/* VIS-FIX: legenda + escala realista */}
                        <div className="flex flex-wrap items-center gap-4 pb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-sm bg-rose-400/80" />Brier (escala 0–0.50)</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-sm bg-cyan-400/80" />ECE (escala 0–0.30)</span>
                        </div>
                        {temporalSeries.map((point, idx) => (
                            <div key={`${point.ts}-${idx}`} className="space-y-1">
                                <div className="flex justify-between gap-3 text-[9px] text-slate-500 font-mono">
                                    <span>{point.ts > 0 ? formatDateTimePtBR(point.ts) : '-'}</span>
                                    <span className="tabular-nums">Brier {point.brier !== null ? point.brier.toFixed(3) : '–'} · ECE {point.ece !== null ? point.ece.toFixed(3) : '–'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                                        <div className="h-full bg-rose-400/80 rounded transition-all duration-500" style={{ width: `${point.brier !== null ? Math.max(0, Math.min(100, (point.brier / 0.5) * 100)) : 0}%` }} />
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                                        <div className="h-full bg-cyan-400/80 rounded transition-all duration-500" style={{ width: `${point.ece !== null ? Math.max(0, Math.min(100, (point.ece / 0.3) * 100)) : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center py-6">Dados temporais insuficientes</p>
                )}
            </div>
        </div>
    );
}
