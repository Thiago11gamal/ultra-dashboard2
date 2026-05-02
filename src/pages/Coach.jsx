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
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useMonteCarloStats } from '../hooks/useMonteCarloStats';
import { calculateAdaptiveSlope, getSortedHistory } from '../engine/projection';
import PageHeader from '../components/header/PageHeader';
import AICoachView from '../components/AICoachView';
import CoachMenuNav from '../components/coach/CoachMenuNav';
import { useSubscription } from '../hooks/useSubscription';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { getSuggestedFocus, generateDailyGoals } from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';
import { logCalibrationTelemetryEvent } from '../utils/calibrationTelemetry';
import { CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD, ALERT_COOLDOWN_MS } from '../utils/calibration.js';
import { normalize } from '../utils/normalization';

const displaySubject = (name) => {
    if (!name) return '';
    const map = {
        'matematica': 'Matemática',
        'portugues': 'Português',
        'lingua portuguesa': 'Português',
        'ingles': 'Inglês',
        'ciencias': 'Ciências',
        'historia': 'História',
        'geografia': 'Geografia',
        'biologia': 'Biologia',
        'fisica': 'Física',
        'quimica': 'Química',
        'filosofia': 'Filosofia',
        'sociologia': 'Sociologia',
        'literatura': 'Literatura',
        'redacao': 'Redação',
        'informatica': 'Informática',
        'raciocinio logico': 'Raciocínio Lógico',
        'direito constitucional': 'Dir. Constitucional',
        'direito administrativo': 'Dir. Administrativo'
    };
    const norm = normalize(name);
    return map[norm] || (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
};

const calibrationAlertCache = new Map();
const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45; // 45 dias
const CALIBRATION_ALERT_CACHE_MAX = 200;

/**
 * Coach — Central de Inteligência Adaptativa
 * 
 * Versão Final Consolidada:
 * 1. Resolve o erro "Maximum update depth exceeded" (Error 185) via Ref-based decoupling.
 * 2. Mantém a UI Premium com abas (Insights vs Raio-X).
 * 3. Integra Governança de Calibração (Brier Scores e alertas).
 */
export default function Coach() {
    const activeId = useAppStore(state => state.appState.activeId);
    useEffect(() => { calibrationAlertCache.clear(); }, [activeId]);

    const data = useAppStore(state => state.appState.contests[activeId]);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    
    // Mapeamento para a estrutura de dados atual
    const history = useMemo(() => data?.simuladoRows || [], [data?.simuladoRows]);
    const simulados = useMemo(() => data?.simulados || [], [data?.simulados]);
    const categories = data?.categories || [];
    const userProfile = data?.user;
    
    const updateCoachScore = useAppStore(state => state.updateCoachScore);

    // Hook de assinatura
    const { isPremium } = useSubscription(userProfile);

    const [activeTab, setActiveTab] = useState('insights');
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [coachLoading, setCoachLoading] = useState(false);
    
    // Novo estado local para guardar o foco sugerido (FIX BUG 185)
    const [suggestedFocus, setSuggestedFocus] = useState(null);
    const timeoutRef = useRef(null);
    const lastPushedScoreRef = useRef(null);

    // Ref para ler o histórico sem engatilhar re-renderizações (FIX BUG 185)
    const calibrationHistoryRef = useRef(data?.calibrationHistoryByCategory || {});

    useEffect(() => {
        calibrationHistoryRef.current = data?.calibrationHistoryByCategory || {};
    }, [data?.calibrationHistoryByCategory]);

    // 1. Persistência de Métricas de Calibração
    const persistCalibrationMetric = useCallback((metric) => {
        if (!metric?.categoryId) return;
        const avgBrier = Number(metric.avgBrier) || 0;
        const isDegraded = avgBrier >= CRITICAL_BRIER_THRESHOLD;

        setData(prev => {
            const current = prev.calibrationHistoryByCategory || {};
            const categoryHistory = current[metric.categoryId] || [];
            const cutoff = Date.now() - CALIBRATION_HISTORY_RETENTION_MS;
            const cleaned = categoryHistory.filter(item => Number(item?.timestamp || 0) >= cutoff);
            const nextHistory = [...cleaned, metric].slice(-60);

            const recent7 = nextHistory.filter(item => Number(item?.timestamp || 0) >= (Date.now() - 1000 * 60 * 60 * 24 * 7));
            const avgBrier7d = recent7.length > 0
                ? recent7.reduce((acc, item) => acc + (Number(item?.avgBrier) || 0), 0) / recent7.length
                : 0;

            const calibrationOps = {
                ...(prev.calibrationOps || {}),
                [metric.categoryId]: {
                    categoryName: metric.categoryName,
                    avgBrier7d: Number(avgBrier7d.toFixed(4)),
                    sample7d: recent7.length,
                    degraded: isDegraded,
                    updatedAt: Date.now()
                }
            };

            const calibrationAuditLog = [...(prev.calibrationAuditLog || []), {
                ...metric,
                avgBrier7d: Number(avgBrier7d.toFixed(4)),
                degraded: isDegraded,
                source: 'coach'
            }].slice(-500);

            return {
                ...prev,
                calibrationHistoryByCategory: {
                    ...current,
                    [metric.categoryId]: nextHistory
                },
                calibrationOps,
                calibrationAuditLog
            };
        });

        if (metric.calibrationPenalty >= HIGH_PENALTY_THRESHOLD) {
            logCalibrationTelemetryEvent({ ...metric, eventType: 'high_penalty_alert' });
        } else {
            logCalibrationTelemetryEvent(metric);
        }

        if (isDegraded) {
            const lastAlertAt = Number(calibrationAlertCache.get(metric.categoryId) || 0);
            const now = Date.now();
            if (now - lastAlertAt > ALERT_COOLDOWN_MS) {
                showToast(`⚠️ Calibração crítica em ${displaySubject(metric.categoryName || 'categoria')} (Brier ${avgBrier.toFixed(2)}).`, 'warning');
                calibrationAlertCache.set(metric.categoryId, now);
                if (calibrationAlertCache.size > CALIBRATION_ALERT_CACHE_MAX) {
                    const oldestKey = calibrationAlertCache.keys().next().value;
                    calibrationAlertCache.delete(oldestKey);
                }
            }
        }
    }, [setData, showToast]);

    // 2. Processamento Estatístico Principal (Monte Carlo)
    const combinedHistory = useMemo(() => {
        const all = [...history];
        simulados.forEach(s => {
            const hasScore = s?.score !== null && s?.score !== undefined && !Number.isNaN(Number(s.score));
            if (s?.date && hasScore) all.push({ ...s, type: 'simulado' });
        });
        return getSortedHistory(all);
    }, [history, simulados]);

    const mcStats = useMonteCarloStats({
        categories: categories,
        goalDate: userProfile?.goalDate,
        targetScore: userProfile?.targetProbability || 85,
        minScore: 0,
        maxScore: 100
    });

    const projectedScore = mcStats?.projectedMean || 0;
    const volatility = mcStats?.sd || 0;
    const drift = useMemo(() => calculateAdaptiveSlope(combinedHistory), [combinedHistory]);
    const totalSimulados = useMemo(() => (Array.isArray(simulados) ? simulados.length : 0), [simulados]);

    // 3. Atualização de Foco e Métricas (useEffect para quebrar loop 185)
    useEffect(() => {
        if (!data?.categories) return;

        const targetScore = userProfile?.targetProbability || 85;
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

        // Persistência assíncrona das métricas
        if (collectedMetrics.length > 0) {
            collectedMetrics.forEach(metric => persistCalibrationMetric(metric));
        }
    }, [
        data?.categories, 
        data?.simuladoRows, 
        data?.studyLogs, 
        data?.user, 
        data?.maxScore, 
        data?.settings?.adaptiveCalibrationEnabled,
        userProfile?.targetProbability,
        persistCalibrationMetric
    ]);

    // 4. Estabilização do Score Global
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

    // 5. Handlers de Ação
    const handleGenerateGoals = useCallback(() => {
        if (!data?.categories) return;
        setCoachLoading(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            const targetScore = userProfile?.targetProbability || 85;
            const collectedMetrics = [];

            const newTasks = generateDailyGoals(
                data.categories,
                data.simuladoRows || [],
                data.studyLogs || [],
                {
                    user: data.user,
                    targetScore,
                    maxScore: data.maxScore ?? 100,
                    calibrationHistoryByCategory: data.calibrationHistoryByCategory || {},
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

    useEffect(() => {
        const timer = setTimeout(() => setIsAnalyzing(false), 800);
        return () => clearTimeout(timer);
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
                    {/* Dashboard de Detalhes */}
                    <div className="w-full">
                        <CoachMenuNav activeTab={activeTab} onChangeTab={setActiveTab} />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === 'insights' ? (
                                    <AICoachView 
                                        suggestedFocus={suggestedFocus}
                                        onGenerateGoals={handleGenerateGoals}
                                        loading={coachLoading}
                                        onClearHistory={handleClearHistory}
                                    />
                                ) : (
                                    <RaioXDashboard data={data} isPremium={isPremium} />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </PageErrorBoundary>
    );
}

// Sub-componentes Auxiliares
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
        <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}

            className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-4"
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
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
        </motion.div>
    );
}

function RaioXDashboard({ data, isPremium }) {
    const auditLog = data?.calibrationAuditLog || [];
    const ops = data?.calibrationOps || {};
    const [filter, setFilter] = useState('all');

    const filteredLogs = auditLog
        .filter(log => filter === 'all' || (filter === 'degraded' && log.degraded))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-3xl border border-white/5 bg-slate-900/40">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        Status de Calibração
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(ops).map(([id, op]) => (
                            <div key={id} className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between px-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate">{displaySubject(op.categoryName || id)}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter pl-2.5">Brier 7d: {op.avgBrier7d.toFixed(3)}</p>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${op.degraded ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                    {op.degraded ? 'Degradado' : 'Estável'}
                                </div>
                            </div>
                        ))}
                        {Object.keys(ops).length === 0 && (
                            <p className="text-[10px] text-slate-600 text-center py-8 font-black uppercase tracking-widest">Sem dados de telemetria</p>
                        )}
                    </div>
                </div>

                <div className="glass p-6 rounded-3xl border border-white/5 bg-slate-900/40">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Dna size={14} className="text-indigo-500" />
                        DNA do Histórico
                    </h3>
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-center">
                        <p className="text-[10px] text-indigo-300/80 leading-relaxed font-medium">
                            A calibração do modelo é baseada no Brier Score. Valores abaixo de 0.20 indicam alta precisão preditiva. Acima de 0.28, o Coach aplica redução de confiança (shrinkage) para proteger sua estratégia.
                        </p>
                    </div>
                </div>
            </div>

            <div className="glass p-6 rounded-3xl border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <List size={14} className="text-indigo-400" />
                        Log de Auditoria
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Tudo
                        </button>
                        <button 
                            onClick={() => setFilter('degraded')}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'degraded' ? 'bg-rose-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
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
                                <th className="pb-3 px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Brier</th>
                                <th className="pb-3 px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Ajuste</th>
                                <th className="pb-3 px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Prob Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLogs.map((log, idx) => (
                                <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-3 pl-2 text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                                    <td className="py-3 px-2 text-[10px] text-white font-bold">{displaySubject(log.categoryName)}</td>
                                    <td className={`py-3 px-2 text-[10px] font-mono ${log.avgBrier > 0.25 ? 'text-rose-400' : 'text-emerald-400'}`}>{log.avgBrier.toFixed(3)}</td>
                                    <td className="py-3 px-2 text-[10px] text-amber-400 font-bold">-{Math.round(log.calibrationPenalty * 100)}%</td>
                                    <td className="py-3 px-2 text-[10px] text-white font-black">{Math.round(log.probability)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="py-12 text-center">
                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Nenhum evento registrado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
