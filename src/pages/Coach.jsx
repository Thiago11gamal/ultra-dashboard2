import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    Brain, 
    Zap, 
    AlertCircle, 
    BarChart3,
    ArrowUpRight,
    Sparkles,
    ShieldCheck,
    Dna,
    List,
    ChevronDown
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useMonteCarloStats } from '../hooks/useMonteCarloStats';
import { calculateAdaptiveSlope, getSortedHistory } from '../engine/projection';
import PageHeader from '../components/header/PageHeader';
import AICoachView from '../components/AICoachView';
import CoachMenuNav from '../components/coach/CoachMenuNav';
import { useSubscription } from '../hooks/useSubscription';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { getSuggestedFocus, generateDailyGoals, clearMcCache } from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';
import { logCalibrationTelemetryEvent } from '../utils/calibrationTelemetry';
import { CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD, ALERT_COOLDOWN_MS } from '../utils/calibration.js';
import { displaySubject } from '../utils/displaySubject';
import { formatDatePtBR, formatDateTimePtBR } from '../utils/dateHelper';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)

const calibrationAlertCache = new Map();
const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45; // 45 dias
const CALIBRATION_ALERT_CACHE_MAX = 200;

export default function Coach() {
    const activeId = useAppStore(state => state.appState.activeId);
    // LEAK-MCCACHE FIX: limpar o cache do Monte Carlo ao trocar de concurso.
    // O hash já previne resultados errados, mas entradas do concurso anterior
    // ocupam memória desnecessariamente até o cap de 50 ser atingido.
    useEffect(() => {
        clearMcCache();
        calibrationAlertCache.clear();
    }, [activeId]);

    const data = useAppStore(state => state.appState?.contests?.[activeId] || null);
    const isHydrated = useAppStore(state => state.appState.isHydrated);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const showToastRef = useRef(showToast); // FIX: Estabilização de referência para evitar loops

    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);
    
    const history = useMemo(() => data?.simuladoRows ?? [], [data]);
    const simulados = useMemo(() => data?.simulados ?? [], [data]);
    const categories = useMemo(() => data?.categories || [], [data?.categories]);
    const userProfile = data?.user;
    
    const updateCoachScore = useAppStore(state => state.updateCoachScore);
    const { isPremium } = useSubscription(userProfile);

    const [activeTab, setActiveTab] = useState('insights');

    const safeActiveTab = activeTab === 'analytics' ? 'analytics' : 'insights';
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [coachLoading, setCoachLoading] = useState(false);
    const [suggestedFocus, setSuggestedFocus] = useState(null);
    const timeoutRef = useRef(null);
    const lastPushedScoreRef = useRef(null);
    const calibrationHistoryRef = useRef(data?.calibrationHistoryByCategory || {});

    useEffect(() => {
        calibrationHistoryRef.current = data?.calibrationHistoryByCategory || {};
    }, [data?.calibrationHistoryByCategory]);

    // BUG-15 BACKFILL: Sincronização de contador global desativada para evitar poluição de histórico.
    /*
    useEffect(() => {
        if (simulados.length === 0 && history.length > 0 && setData) {
            const dates = [...new Set(history.map(h => h.date || h.createdAt?.split('T')[0]).filter(Boolean))];
            if (dates.length > 0) {
                const backfillEvents = dates.map(d => ({
                    id: `bf-${d}`,
                    date: d,
                    score: 0, // Placeholder
                    type: 'backfill',
                    subject: 'Simulado Restaurado'
                }));
                setData(prev => ({ ...prev, simulados: backfillEvents }));
            }
        }
    }, [simulados.length, history.length, setData]);
    */

    const lastPersistRef = useRef(0);
    const persistCalibrationMetric = useCallback((metric) => {
        if (!metric?.categoryId) return;

        // RATE-LIMIT: Evita loops se muitas métricas forem emitidas em sequência rápida
        const now = Date.now();
        if (now - lastPersistRef.current < 500) return;
        lastPersistRef.current = now;

        const toFinite = (value, fallback = null) => {
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        };
        const metricTimestamp = metric?.timestamp || now;
        const normalizedCategoryId = getSafeId(metric?.categoryId || metric?.categoryName);
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

        setData(prev => {
            const current = prev.calibrationHistoryByCategory || {};
            const categoryHistory = current[normalizedCategoryId] || [];
            
            // Verificação de Redundância: Só salva se o Brier mudou significativamente (>1%)
            const lastEntry = categoryHistory[categoryHistory.length - 1];
            if (lastEntry && Math.abs(Number(lastEntry.avgBrier) - avgBrier) < 0.01 && !isDegraded) {
                return prev; // No change needed
            }

            const cutoff = now - CALIBRATION_HISTORY_RETENTION_MS;
            const cleaned = categoryHistory.filter(item => Number(item?.timestamp || 0) >= cutoff);
            const nextHistory = [...cleaned, normalizedMetric].slice(-60);

            const recent7 = nextHistory.filter(item => Number(item?.timestamp || 0) >= (now - 1000 * 60 * 60 * 24 * 7));
            const recent7Brier = recent7.map(item => Number(item?.avgBrier)).filter(Number.isFinite);
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
                ...prev,
                calibrationHistoryByCategory: {
                    ...current,
                    [normalizedCategoryId]: nextHistory
                },
                calibrationOps,
                calibrationAuditLog
            };
        });

        if (normalizedMetric.calibrationPenalty >= HIGH_PENALTY_THRESHOLD) {
            logCalibrationTelemetryEvent({ ...normalizedMetric, eventType: 'high_penalty_alert' });
        } else {
            logCalibrationTelemetryEvent(normalizedMetric);
        }

        if (isDegraded) {
            const now = Date.now();
            // LEAK-CALIBRATION-CACHE FIX: antes, entradas eram removidas apenas por tamanho.
            // Entradas com >12h de idade deveriam ser prunadas para liberar memória e permitir
            // re-disparo legítimo do alerta. Agora fazemos uma varredura de cleanup antes de inserir.
            for (const [key, ts] of calibrationAlertCache.entries()) {
                if (now - ts > ALERT_COOLDOWN_MS) calibrationAlertCache.delete(key);
            }
            const lastAlertAt = Number(calibrationAlertCache.get(normalizedCategoryId) || 0);
            if (now - lastAlertAt > ALERT_COOLDOWN_MS) {
                showToastRef.current(`⚠️ Calibração crítica em ${displaySubject(normalizedMetric.categoryName || 'categoria')} (Brier ${Number(avgBrier).toFixed(2)}).`, 'warning');
                calibrationAlertCache.set(normalizedCategoryId, now);
                if (calibrationAlertCache.size > CALIBRATION_ALERT_CACHE_MAX) {
                    const oldestKey = calibrationAlertCache.keys().next().value;
                    calibrationAlertCache.delete(oldestKey);
                }
            }
        }
    }, [setData]);

    const combinedHistory = useMemo(() => {
        const all = [...history];
        const seen = new Set(all.map((item) => `${item?.id ?? ''}|${item?.date ?? ''}|${Number(item?.score ?? 0)}`));
        simulados.forEach((s) => {
            const hasScore = s?.score !== null && s?.score !== undefined && !Number.isNaN(Number(s.score));
            if (!s?.date || !hasScore) return;
            const key = `${s?.id ?? ''}|${s.date}|${Number(s.score)}`;
            if (seen.has(key)) return;
            seen.add(key);
            all.push({ ...s, type: 'simulado' });
        });
        return getSortedHistory(all);
    }, [history, simulados]);

    // BUG-11 FIX: Pass explicit defaults for timeIndex and timelineDates
    // BUG-16 FIX: Bind maxScore dynamically to support contests scaled > 100
    const currentMaxScore = data?.maxScore ?? 100;
    const mcStats = useMonteCarloStats({
        categories: categories,
        goalDate: userProfile?.goalDate,
        targetScore: userProfile?.targetProbability ?? 85,
        timeIndex: -1,
        timelineDates: [],
        minScore: data?.minScore ?? 0,
        maxScore: currentMaxScore
    });

    const projectedScore = mcStats?.projectedMean ?? 0;
    const volatility = mcStats?.sd ?? 0;
    const drift = useMemo(() => calculateAdaptiveSlope(combinedHistory, currentMaxScore), [combinedHistory, currentMaxScore]);
    const totalSimulados = useMemo(() => (Array.isArray(simulados) ? simulados.length : 0), [simulados]);

    const analysisHash = useMemo(() => {
        // HASH-GUARD: Evita loop infinito se a análise persistir métricas que alteram o 'data'.
        // Usamos as referências dos arrays e valores de perfil para detectar mudanças reais.
        return `${data?.simuladoRows?.length || 0}-${data?.studyLogs?.length || 0}-${categories.length}-${userProfile?.goalDate}-${userProfile?.targetProbability}-${currentMaxScore}-${data?.updatedAt || ''}`;
    }, [data?.simuladoRows, data?.studyLogs, categories, userProfile?.goalDate, userProfile?.targetProbability, currentMaxScore, data?.updatedAt]);

    const lastHashRef = useRef('');

    useEffect(() => {
        if (!data?.categories || !isHydrated) return;
        if (analysisHash === lastHashRef.current) return;
        lastHashRef.current = analysisHash;

        const targetScore = userProfile?.targetProbability ?? 85;
        const collectedMetrics = [];

        const result = getSuggestedFocus(
            data.categories,
            data.simuladoRows || [],
            data.studyLogs || [],
            {
                user: data.user,
                targetScore,
                maxScore: data.maxScore ?? 100,
                calibrationHistoryByCategory: calibrationHistoryRef.current,
                onCalibrationMetric: (metric) => collectedMetrics.push(metric),
                config: {
                    MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                }
            }
        );

        setSuggestedFocus(result);
        setIsAnalyzing(false);

        // PERSISTENCE BATCHING: Só persiste se houver métricas relevantes e evita loop imediato
        if (collectedMetrics.length > 0) {
            const timer = setTimeout(() => {
                collectedMetrics.forEach(metric => persistCalibrationMetric(metric));
            }, 1000); // Cooldown de 1s para deixar o dashboard respirar entre análises
            return () => clearTimeout(timer);
        }
    }, [
        analysisHash,
        isHydrated,
        data?.categories, 
        data?.simuladoRows, 
        data?.studyLogs, 
        data?.user, 
        data?.maxScore, 
        data?.settings?.adaptiveCalibrationEnabled,
        userProfile?.targetProbability,
        persistCalibrationMetric
    ]);

    useEffect(() => {
        if (!isNaN(projectedScore) && projectedScore !== lastPushedScoreRef.current) {
            if (lastPushedScoreRef.current === null || Math.abs(projectedScore - lastPushedScoreRef.current) > 0.01) {
                lastPushedScoreRef.current = projectedScore;
                const timer = setTimeout(() => {
                    if (updateCoachScore) updateCoachScore(projectedScore);
                }, 0);
                return () => clearTimeout(timer);
            }
        }
    }, [projectedScore, updateCoachScore]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleGenerateGoals = useCallback(() => {
        if (!data?.categories) return;
        setCoachLoading(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            const targetScore = userProfile?.targetProbability ?? 85;
            const collectedMetrics = [];

            const newTasks = generateDailyGoals(
                data.categories,
                data.simuladoRows || [],
                data.studyLogs || [],
                {
                    user: data.user,
                    targetScore,
                    maxScore: data.maxScore ?? 100,
                    calibrationHistoryByCategory: calibrationHistoryRef.current, // FIX: Uso de Ref para evitar Stale Closure
                    onCalibrationMetric: (metric) => collectedMetrics.push(metric),
                    config: {
                        MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                    }
                }
            );
            
            if (newTasks.length) {
                setData(prev => ({ ...prev, coachPlan: newTasks }));
                showToast('Sugestões geradas!', 'success');
            } else {
                showToast('Nenhuma sugestão necessária.', 'info');
            }

            collectedMetrics.forEach(metric => persistCalibrationMetric(metric));
            setCoachLoading(false);
            // LOGIC-TIMEOUT-NULL FIX: zerar a ref após a execução para não manter
            // um ID de timeout expirado que mascararia novos agendamentos.
            timeoutRef.current = null;
        }, 1500);
    }, [data, setData, showToast, persistCalibrationMetric, userProfile?.targetProbability]);

    const handleClearHistory = useCallback(() => {
        setData(prev => ({ ...prev, coachPlan: [] }));
        useAppStore.getState().updateCoachPlanner({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <PageHeader 
                        title="Análise do Coach" 
                        description="Mentor estatístico processando seu desempenho para otimizar sua aprovação."
                    />
                    
                    <div className="flex items-center gap-6 bg-slate-900/40 border border-white/5 p-4 rounded-3xl backdrop-blur-md">
                        <QuickStat label="Volatilidade" value={`${volatility.toFixed(1)}%`} color="text-rose-400" icon={<Zap size={14} />} />
                        <div className="w-px h-10 bg-white/5" />
                        <QuickStat label="Tendência" value={`${(drift * 30).toFixed(1)}pp`} color="text-emerald-400" icon={<ArrowUpRight size={14} />} />
                        <div className="w-px h-10 bg-white/5" />
                        <QuickStat label="Simulados" value={totalSimulados} color="text-indigo-400" icon={<Dna size={14} />} />
                    </div>
                </div>

                <AnimatePresence>
                    <GovernanceBanner data={data} />
                </AnimatePresence>

                <div className="space-y-10">
                    <div className="w-full">
                        <CoachMenuNav activeTab={safeActiveTab} onChangeTab={(tab) => setActiveTab(tab === 'analytics' ? 'analytics' : 'insights')} isPremium={isPremium} />

                        <div className="animate-fade-in">
                            <div
                                role="tabpanel"
                                id="coach-panel-insights"
                                aria-labelledby="coach-tab-insights"
                                tabIndex={safeActiveTab === 'insights' ? 0 : -1}
                                hidden={safeActiveTab !== 'insights'}
                            >
                                {safeActiveTab === 'insights' && (
                                    <AICoachView 
                                        suggestedFocus={suggestedFocus}
                                        onGenerateGoals={handleGenerateGoals}
                                        loading={coachLoading}
                                        onClearHistory={handleClearHistory}
                                    />
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
                        </div>
                    </div>
                </div>
            </div>
        </PageErrorBoundary>
    );
}

function QuickStat({ label, value, color, icon }) {
    return (
        <div className="flex flex-col min-w-[80px]">
            <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`${color} opacity-60`}>{icon}</span>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
            </div>
            <span className={`text-sm font-black ${color} tracking-tighter`}>{value}</span>
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

function GovernanceBanner({ data }) {
    const ops = data?.calibrationOps || {};
    const degradedCount = Object.values(ops).filter(o => o.degraded).length;

    if (degradedCount === 0) return null;

    return (
        <Motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-4 overflow-hidden"
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 border border-rose-500/20 shadow-lg shadow-rose-900/20">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">Alerta de Governança</h4>
                    <p className="text-[10px] text-rose-300/80 font-medium uppercase tracking-widest">
                        Detectamos <span className="text-rose-400 font-black">{degradedCount}</span> categorias com calibração degradada.
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
}

function RaioXDashboard({ data }) {
    const ops = data?.calibrationOps || {};
    const [filter, setFilter] = useState('all');

    const toFiniteNumber = (value, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    const toPercentLabel = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? `${Math.round(n)}%` : '-';
    };

    const sortedLogs = useMemo(() => {
        const source = Array.isArray(data?.calibrationAuditLog) ? data.calibrationAuditLog : [];
        return [...source].sort((a, b) => toFiniteNumber(b?.timestamp) - toFiniteNumber(a?.timestamp));
    }, [data]);

    const filteredLogs = useMemo(() => (sortedLogs
        .filter(log => filter === 'all' || (filter === 'degraded' && Boolean(log?.degraded)))
        .slice(0, 50)), [sortedLogs, filter]);

    const latestWithReliability = sortedLogs.find(log => Array.isArray(log?.reliability) && log.reliability.length > 0);
    const eceValues = sortedLogs.map(log => Number(log?.ece)).filter(Number.isFinite);
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-2">
                    <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-emerald-500/80" />
                        Status de Calibração
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(ops).map(([id, op]) => (
                            <div key={id} className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between px-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate">{displaySubject(op.categoryName || id)}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter pl-2.5">Calibração 7d (Brier): {Number.isFinite(Number(op.avgBrier7d)) ? Number(op.avgBrier7d).toFixed(3) : "N/A"}</p>
                                </div>
                                <div className={`shrink-0 ml-4 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${op.degraded ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                    {op.degraded ? 'Degradado' : 'Estável'}
                                </div>
                            </div>
                        ))}
                        {Object.keys(ops).length === 0 && (
                            <div className="py-8 text-center space-y-2">
                                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Amostra técnica insuficiente</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight max-w-[200px] mx-auto leading-tight">
                                    Requer <span className="text-indigo-400">3 simulados por matéria</span> para calibrar.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-2">
                    <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                        <Dna size={14} className="text-indigo-500/80" />
                        DNA do Histórico
                    </h3>
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-center">
                        <p className="text-[10px] text-indigo-300/80 leading-relaxed font-medium">
                            A calibração do modelo combina Brier Score e ECE (Expected Calibration Error). Brier baixo e ECE baixo indicam boa confiabilidade; quando degradam, o Coach aplica redução de confiança (shrinkage) para proteger sua estratégia.
                        </p>
                    </div>
                </div>
            </div>
            <div className="p-2 border-t border-white/5 pt-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em] flex items-center gap-2">
                        <List size={14} className="text-indigo-400/80" />
                        Log de Auditoria
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setFilter('all')}
                            className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${filter === 'all' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 border border-white/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                        >
                            Tudo
                        </button>
                        <button 
                            onClick={() => setFilter('degraded')}
                            className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${filter === 'degraded' ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/40 border border-white/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                        >
                            Falhas
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="pb-3 pl-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                                <th className="pb-3 px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                                <th className="pb-3 px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Brier (erro)</th>
                                <th className="pb-3 px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">ECE (calib.)</th>
                                <th className="pb-3 px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Ajuste</th>
                                <th className="pb-3 px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Prob Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLogs.map((log, idx) => (
                                <tr key={`${toFiniteNumber(log?.timestamp, idx)}-${log?.categoryName || 'cat'}-${idx}`} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-3 pl-2 text-[10px] text-slate-500 font-mono">{toFiniteNumber(log?.timestamp) > 0 ? formatDateTimePtBR(log.timestamp) : '-'}</td>
                                    <td className="py-3 px-2 text-[10px] text-white font-bold">{displaySubject(log.categoryName)}</td>
                                    <td className={`py-3 px-2 text-[10px] font-mono ${log.avgBrier > 0.25 ? 'text-rose-400' : 'text-emerald-400'}`}>{Number.isFinite(Number(log?.avgBrier)) ? Number(log.avgBrier).toFixed(3) : '-'}</td>
                                    <td className={`py-3 px-2 text-[10px] font-mono ${Number(log?.ece || 0) > 0.12 ? 'text-amber-400' : 'text-cyan-300'}`}>{Number.isFinite(Number(log?.ece)) ? Number(log.ece).toFixed(3) : '-'}</td>
                                    <td className="py-3 px-2 text-[10px] text-amber-400 font-bold">
                                        {toFiniteNumber(log?.calibrationPenalty) > 0 ? `-${Math.round(toFiniteNumber(log.calibrationPenalty) * 100)}% (shrink)` : '-'}
                                    </td>
                                    <td className="py-3 px-2 text-[10px] text-white font-black">{toPercentLabel(log?.probability)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="py-12 text-center space-y-2">
                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Nenhum evento registrado</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight max-w-[250px] mx-auto leading-tight">
                                Os diagnósticos surgirão automaticamente após atingir a maturidade de dados (n=3).
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-2 border-t border-white/5 pt-8">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em]">Confiabilidade (ECE)</h3>
                    <span className="text-[10px] font-black text-cyan-300">
                        {avgEce !== null ? `ECE médio: ${avgEce.toFixed(3)}` : 'Sem ECE'}
                    </span>
                </div>
                {latestWithReliability ? (
                    <div className="space-y-3">
                        {latestWithReliability.reliability.map((bin, idx) => {
                            const predPct = Math.round((Number(bin?.meanPred) || 0) * 100);
                            const obsPct = Math.round((Number(bin?.observedRate) || 0) * 100);
                            const gapPct = Math.round((Number(bin?.gap) || 0) * 100);
                            return (
                                <div key={idx} className="rounded-xl border border-white/5 bg-black/20 px-4 py-3 transition-all hover:bg-white/[0.03]">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-slate-400 font-bold">Bin {Number.isFinite(Number(bin?.bin)) ? Number(bin.bin) : '-'}</span>
                                        <span className="text-slate-500">n={Number.isFinite(Number(bin?.count)) ? Number(bin.count) : 0}</span>
                                    </div>
                                    <div className="mt-1 text-[10px] text-slate-300">
                                        Pred {predPct}% · Real {obsPct}% · Gap {gapPct}%
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Sem buckets de confiabilidade ainda</p>
                )}
            </div>
            <div className="p-2 border-t border-white/5 pt-8">
                <div className="flex items-center justify-between mb-5">
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
