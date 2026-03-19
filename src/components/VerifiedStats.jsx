import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, ShieldCheck, HelpCircle, Activity, AlertCircle, Settings2, Plus, RotateCcw } from 'lucide-react';
import MonteCarloGauge from './MonteCarloGauge';
import { MonteCarloConfig } from './charts/MonteCarloConfig';
import { useAppStore } from '../store/useAppStore';
import { logger } from '../utils/logger';
import { analyzeProgressState } from '../utils/ProgressStateEngine';
import { getSafeScore } from '../utils/scoreHelper';
import { calculateSlope } from '../engine';

const InfoTooltip = React.memo(({ text }) => (
    <div className="relative group/tooltip inline-block ml-auto z-10">
        <HelpCircle size={14} className="text-slate-600 hover:text-purple-400 transition-colors cursor-help" />
        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl text-xs text-slate-300 shadow-2xl opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none z-[9999] text-right">
            {text}
        </div>
    </div>
));

const ForecastCard = React.memo(({ prediction, status, subtext, targetScore, trend, hasEnoughData }) => (
    <div className={`glass h-full p-6 rounded-[2rem] relative flex flex-col justify-between border border-white/10 overflow-hidden group transition-all duration-500 hover:scale-[1.02] shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${status === 'excellence' || status === 'good' ? 'bg-purple-500/[0.03] hover:border-purple-500/30' :
        status === 'warning' ? 'bg-red-500/[0.03] hover:border-red-500/30' :
            'bg-blue-500/[0.03] hover:border-blue-500/30'
        }`}>
        {/* Animated Background Mesh */}
        <div className={`absolute -top-20 -right-20 w-64 h-64 blur-[100px] rounded-full opacity-20 group-hover:opacity-40 transition-all duration-1000 ${status === 'excellence' || status === 'good' ? 'bg-purple-500' : status === 'warning' ? 'bg-red-500' : 'bg-blue-500'}`} />
        
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-500 group-hover:rotate-12 ${status === 'excellence' || status === 'good' ? 'bg-purple-500/20 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : status === 'warning' ? 'bg-red-500/20 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-blue-500/20 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]'}`}>
                    <Target size={20} className={status === 'excellence' || status === 'good' ? "text-purple-400" : status === 'warning' ? "text-red-400" : "text-blue-400"} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">IA Insight</span>
                    <span className="text-xs font-bold text-slate-200">Previsão de Alcance</span>
                </div>
            </div>
            {hasEnoughData && trend !== 'stable' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 animate-pulse-subtle">
                    <Activity size={10} className="text-blue-400" />
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Calculando...</span>
                </div>
            )}
        </div>

        <div className="text-center my-6 relative z-10">
            <h2 className={`text-2xl md:text-[28px] font-black leading-tight tracking-tighter drop-shadow-2xl ${status === 'excellence' || status === 'good' ? 'text-white' :
                status === 'warning' ? 'text-red-100' : 'text-blue-50'
                }`}>
                {prediction}
            </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full mb-3 relative z-10">
            <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner hover:bg-black/70 transition-colors">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Meta</span>
                <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-black text-slate-200">{targetScore ?? 90}</span>
                    <span className="text-[9px] text-slate-500 font-bold">%</span>
                </div>
            </div>
            <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner hover:bg-black/70 transition-colors">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tendência (5d)</span>
                <div className="flex items-center gap-1.5">
                    {hasEnoughData ? (
                        <>
                            {trend === 'up' && <TrendingUp size={14} className="text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />}
                            {trend === 'down' && <TrendingDown size={14} className="text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />}
                            {trend === 'stable' && <Minus size={14} className="text-slate-500" />}
                            <span className="text-xs font-black text-slate-200 uppercase">
                                {trend === 'up' ? 'Alta' : trend === 'down' ? 'Baixa' : 'Estável'}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">Pendente</span>
                    )}
                </div>
            </div>
        </div>
        <div className="mt-auto pt-3 border-t border-white/10 relative z-10">
            <p className="text-[10px] text-slate-400 text-center leading-relaxed font-semibold">
                {subtext}
            </p>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50 overflow-hidden">
            <div className={`h-full w-1/3 rounded-full opacity-70 move-right-anim ${status === 'excellence' || status === 'good' ? 'bg-purple-500' : status === 'warning' ? 'bg-red-500' : 'bg-blue-500'}`} />
        </div>
    </div>
));
const ConsistencyCard = React.memo(({ consistency }) => (
    <div className={`glass h-full p-6 rounded-[2rem] relative flex flex-col justify-between border border-white/10 group overflow-hidden transition-all duration-500 hover:scale-[1.02] shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${consistency.bgBorder.replace('border-', 'hover:border-').replace('/30', '')}`}>
        <div className={`absolute -bottom-20 -left-20 w-64 h-64 blur-[100px] rounded-full opacity-10 group-hover:opacity-30 transition-all duration-1000 ${consistency.color.replace('text-', 'bg-')}`} />
        
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-500 group-hover:-rotate-12 ${consistency.color.replace('text-', 'bg-')}/20 ${consistency.bgBorder}`}>
                    <Activity size={20} className={consistency.color} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Engine Analytics</span>
                    <span className="text-xs font-bold text-slate-200">Consistência Global</span>
                </div>
            </div>
        </div>

        <div className="text-center my-6 relative z-10">
            <h2 className={`text-2xl md:text-[26px] font-black leading-tight tracking-tighter ${consistency.color} drop-shadow-2xl`}>
                {consistency.status}
            </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mb-4 relative z-10">
            <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5 flex flex-col items-center justify-center shadow-lg transition-all group-hover:bg-white/[0.06]">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Desvio Padrão</span>
                <span className={`text-sm font-black tracking-tight ${consistency.status !== 'Dados Insuficientes' ? consistency.color : 'text-slate-500'}`}>
                    {consistency.status !== 'Dados Insuficientes' && !isNaN(parseFloat(consistency.sd)) ? `±${consistency.sd}%` : '---'}
                </span>
            </div>
            <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5 flex flex-col items-center justify-center shadow-lg transition-all group-hover:bg-white/[0.06]">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Diagnóstico</span>
                <span className="text-[11px] font-bold text-slate-200 text-center leading-tight line-clamp-2 px-1">
                    {consistency.status === 'Dados Insuficientes' ? 'Pendente' :
                        (['EXCELENTE', 'EM EVOLUÇÃO'].includes(consistency.status) ? 'Alta Estabilidade' :
                            (['EM QUEDA', 'INSTÁVEL'].includes(consistency.status) ? 'Alta Variação' : 'Variação Média'))}
                </span>
            </div>
        </div>
        
        <div className="mt-auto pt-3 border-t border-white/10 relative z-10">
            <p className="text-[10px] text-slate-400 text-center leading-relaxed font-semibold italic">
                "{consistency.message}"
            </p>
        </div>
    </div>
));

const CategoryRow = React.memo(({ cat, idx, maxSdVal }) => {
    const sdNum = parseFloat(cat.sd);
    const barWidth = Math.max(0, 100 - (sdNum / maxSdVal) * 100);
    const deltaNum = parseFloat(cat.delta);
    const sdBarColor = cat.color.replace('text-', 'bg-');
    const sdBarGlow = cat.color.replace('text-', 'shadow-') + '/30';

    return (
        <div className={`grid grid-cols-12 gap-2 px-3 py-2.5 rounded-xl items-center transition-all duration-300 hover:bg-white/[0.03] ${idx % 2 === 0 ? 'bg-black/10' : ''}`}>
            <div className="col-span-3 flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${cat.bgBorder.replace('border-', 'bg-').replace('/30', '')}`} />
                <span className="text-sm font-bold text-slate-200 truncate">{cat.name}</span>
            </div>
            <div className="col-span-2 flex justify-center">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${cat.color} ${cat.bgBorder} bg-black/40`}>
                    {cat.status}
                </span>
            </div>
            <div className="col-span-4 flex items-center gap-2">
                <div className="flex-1 h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                    <div className={`h-full rounded-full ${sdBarColor} shadow-md ${sdBarGlow} transition-all duration-700 ease-out`} style={{ width: `${barWidth}%`, minWidth: barWidth > 0 ? '4px' : '0' }} />
                    <div className="absolute top-0 h-full w-px bg-white/10" style={{ right: `${(5 / maxSdVal) * 100}%` }} title="SD=5" />
                    <div className="absolute top-0 h-full w-px bg-white/10" style={{ right: `${(15 / maxSdVal) * 100}%` }} title="SD=15" />
                </div>
                <span className={`text-xs font-mono font-black min-w-[36px] text-right ${cat.color}`}>±{cat.sd}</span>
            </div>
            <div className="col-span-1 flex justify-center items-center">
                {deltaNum > 0 ? (
                    <span className="text-[10px] font-black text-green-400 flex items-center gap-0.5"><TrendingUp size={10} />+{Math.abs(deltaNum).toFixed(0)}</span>
                ) : deltaNum < 0 ? (
                    <span className="text-[10px] font-black text-red-400 flex items-center gap-0.5"><TrendingDown size={10} />{deltaNum.toFixed(0)}</span>
                ) : (
                    <span className="text-[10px] font-bold text-slate-600">—</span>
                )}
            </div>
            <div className="col-span-2 flex flex-col justify-center gap-0.5 min-w-0 pr-1">
                {cat.villains && cat.villains.length > 0 ? (
                    cat.villains.slice(0, 2).map((v) => (
                        <div key={v.name} className="flex items-center justify-between gap-1 text-[10px] leading-tight min-h-[14px] w-full">
                            <span className="text-slate-400 truncate font-semibold" title={v.name}>{v.name}</span>
                            <span className="text-red-400 font-mono font-black shrink-0">±{v.sd.toFixed(0)}</span>
                        </div>
                    ))
                ) : (
                    <span className="text-[10px] text-slate-600 text-center">—</span>
                )}
            </div>
        </div>
    );
});

const SubjectBreakdownTable = React.memo(({ categoryBreakdown }) => {
    if (categoryBreakdown.length === 0) return (
        <div className="text-center text-slate-500 py-4 text-sm">É necessário realizar pelo menos 2 simulados em cada matéria para gerar o diagnóstico individual.</div>
    );

    const maxSdVal = Math.max(25, ...categoryBreakdown.map(c => c.rawSd || 0));

    return (
        <div className="flex flex-col gap-1">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 mb-1">
                <div className="col-span-3">Matéria</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-4 text-center">Desvio Padrão (SD)</div>
                <div className="col-span-1 text-center">Δ</div>
                <div className="col-span-2 text-center">Vilões</div>
            </div>
            {categoryBreakdown.map((cat, idx) => (
                <CategoryRow key={cat.name} cat={cat} idx={idx} maxSdVal={maxSdVal} />
            ))}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-white/5">
                {[
                    { color: 'bg-purple-500', label: 'SD ≤ 5' },
                    { color: 'bg-blue-500', label: 'SD ≤ 10' },
                    { color: 'bg-orange-500', label: 'SD ≤ 15' },
                    { color: 'bg-red-400', label: 'SD ≤ 25' },
                    { color: 'bg-red-600', label: 'SD > 25' }
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                        <span className="text-[9px] text-slate-500 font-medium">{l.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default function VerifiedStats({ categories = [], user }) {
    // Lifted State for Target Score (Shared between Prediction Card and Monte Carlo Gauge)
    const [targetScore, setTargetScore] = React.useState(() => {
        const userTarget = parseFloat(user?.targetProbability);
        return !isNaN(userTarget) ? userTarget : 70;
    });

    // B-06 FIX: Adicionar efeito de sincronização store → estado local
    const storeTarget = user?.targetProbability;
    React.useEffect(() => {
        const parsed = parseFloat(storeTarget);
        if (!isNaN(parsed) && Math.abs(parsed - targetScore) > 0.01) {
            setTargetScore(parsed);
        }
    }, [storeTarget]); // eslint-disable-line react-hooks/exhaustive-deps
    const [showConfig, setShowConfig] = React.useState(false);

    // Performance Fix: Debounce targetScore for the heavy 'stats' calculation
    const [statsTarget, setStatsTarget] = React.useState(targetScore);
    React.useEffect(() => {
        const timer = setTimeout(() => setStatsTarget(targetScore), 300);
        return () => clearTimeout(timer);
    }, [targetScore]);

    const activeId = useAppStore(state => state.appState.activeId);
    const weights = useAppStore(state => state.appState.contests[activeId]?.mcWeights || null);
    const equalWeightsMode = useAppStore(state => state.appState.mcEqualWeights ?? true);
    const setWeights = useAppStore(state => state.setMonteCarloWeights);
    const setEqualWeightsMode = useAppStore(state => state.setMcEqualWeights);

    const getEqualWeights = React.useCallback(() => {
        if (categories.length === 0) return {};
        const newWeights = {};
        categories.forEach(cat => {
            newWeights[cat.name] = 1;
        });
        return newWeights;
    }, [categories]);

    const updateWeight = React.useCallback((catName, value) => {
        const numeric = parseInt(value, 10);
        const sanitize = isNaN(numeric) ? 0 : Math.max(0, Math.min(999, numeric));
        const updatedWeights = { ...weights, [catName]: sanitize };
        setWeights(updatedWeights);
    }, [weights, setWeights]);


    // Save to LocalStorage and Store whenever it changes
    const setUserData = useAppStore(state => state.setData);

    React.useEffect(() => {
        // 1. Sync with global store to keep other components (like Coach.jsx) updated
        const currentStoreTarget = Number(user?.targetProbability);
        const storeTargetMissing = user?.targetProbability == null || isNaN(currentStoreTarget);
        const storeTargetDiffers = !storeTargetMissing && Math.abs(currentStoreTarget - targetScore) > 0.01;
        
        if (user && (storeTargetMissing || storeTargetDiffers)) {
            // Only record history if the modal is closed to avoid flooding undo snapshots
            const shouldRecordHistory = !showConfig;
            
            setUserData(data => {
                if (data.user) {
                    data.user.targetProbability = targetScore;
                }
                if (!showConfig) {
                    logger.log("[MonteCarlo) Final sync of targetScore:", targetScore);
                }
                return data; // BUG-A3 FIX: Ensure mutation is committed
            }, shouldRecordHistory);
        }
    }, [targetScore, setUserData, user?.targetProbability, user?.uid, showConfig]);

    const stats = useMemo(() => {
        let allHistory = [];
        let totalQuestionsGlobal = 0;

        categories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history) {
                // Flatten history for global regression
                cat.simuladoStats.history.forEach(h => {
                    const safeScore = getSafeScore(h);
                    if (h.date && safeScore >= 0) {
                        allHistory.push({
                            date: new Date(h.date).getTime(),
                            score: safeScore,
                            totalQuestions: Number(h.total) || 0
                        });
                        totalQuestionsGlobal += (Number(h.total) || 0);
                    }
                });
            }
        });

        // 0. Aggregate by Day (Fix Bug 1: Mixed subjects as independent points biased the OLS)
        const dailyMap = {};
        allHistory.forEach(h => {
            const d = new Date(h.date);
            const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            if (!dailyMap[dateStr]) {
                dailyMap[dateStr] = { scoreSum: 0, weightSum: 0, date: h.date };
            }
            // Weight by volume to favor "representative" days
            const weight = Math.max(1, Number(h.totalQuestions) || 1);
            dailyMap[dateStr].scoreSum += (Number(h.score) * weight);
            dailyMap[dateStr].weightSum += weight;
        });

        const dailyHistory = Object.values(dailyMap)
            .map(d => ({ date: d.date, score: d.scoreSum / d.weightSum }))
            .sort((a, b) => a.date - b.date);

        // 1. Progress State Analysis (using ProgressStateEngine)
        // Run on global daily average for consistent trend
        const dailyScores = dailyHistory.map(h => h.score);
        const globalAnalysis = analyzeProgressState(dailyScores, {
            window_size: Math.min(5, dailyScores.length),
            stagnation_threshold: 0.5,
            low_level_limit: 60,
            high_level_limit: statsTarget
        });

        // Map to UI-compatible format
        const hasEnoughData = dailyScores.length >= 3;
        // D-02 FIX: Threshold alinhado ao trend_tolerance do ProgressStateEngine (0.5).
        // Antes, slope de 0.01 já mostrava "↑ Alta" — agora exige evidência real.
        const trend = !hasEnoughData ? 'insufficient' :
            (globalAnalysis.trend_slope > 0.5 ? 'up' :
                globalAnalysis.trend_slope < -0.5 ? 'down' : 'stable');
        const trendValue = globalAnalysis.trend_slope;

        // 2. Linear Regression & Contextual Prediction
        let prediction = "Calibrando...";
        let predictionSubtext = "Realize mais simulados.";
        let predictionStatus = "neutral";

        // Use the debounced statsTarget for heavy calculations
        const userTarget = statsTarget;
        let calculatedTarget = userTarget;

        const distinctDays = dailyHistory.length;

        if (distinctDays >= 3) {
            // Get recent average (last 5 for better stability)
            const recentHistory = dailyHistory.slice(-5);
            const currentAvg = recentHistory.reduce((a, b) => a + b.score, 0) / recentHistory.length;

            // Determine Target dynamically IF user is already above their target
            if (currentAvg >= userTarget) {
                calculatedTarget = 100;
            }

            // Use the shared Weighted Regression engine function for total consistency with Monte Carlo Dashboard
            // ensure format is valid (dailyHistory already has { date: number(ms), score: number })
            let slope = calculateSlope(dailyHistory);
            // Engine clamps properly internally, but we can do a hard limit just to be absolutely safe for dates.
            slope = Math.max(-2.0, Math.min(2.0, slope));

            // ANTIGRAVITY PREDICTION ENGINE 🚀
            const currentScore = currentAvg;
            const target = calculatedTarget;
            const distance = target - currentScore;

            if (distance <= 0 || currentScore >= target) {
                prediction = "Meta Atingida!";
                predictionSubtext = "Rumo aos 100%!";
                predictionStatus = "excellence";
            } else {
                const weeklyBaseSpeed = slope * 7;

                if (weeklyBaseSpeed <= 0.01) {
                    prediction = "Estagnado/Queda";
                    predictionSubtext = "Melhore sua tendência diária para gerar previsão.";
                    predictionStatus = "warning";
                } else {
                    // D-04 FIX: Curva contínua de dificuldade em vez de steps arbitrários.
                    // f(50%)=0.90, f(70%)=0.80, f(80%)=0.74, f(95%)=0.64
                    // Mais justa: não corta 40% da velocidade abruptamente em 80%.
                    // B-07 FIX: Fator linear: penalidade proporcional desde o início
                    // f(0)=1.0, f(50)=0.75, f(80)=0.60, f(100)=0.50
                    const difficultyFactor = Math.max(0.40, 1 - 0.5 * (currentScore / 100));

                    let quality = 0.8;
                    const dailyScoresList = dailyHistory.map(h => h.score);
                    const dailyMean = dailyScoresList.reduce((a, b) => a + b, 0) / dailyScoresList.length;
                    const dailyVar = dailyScoresList.reduce((a, b) => a + Math.pow(b - dailyMean, 2), 0) / (dailyScoresList.length - 1 || 1);
                    const dailySD = Math.sqrt(dailyVar);

                    quality = Math.max(0.5, 1 - (dailySD / 40));

                    const adjustedSpeed = weeklyBaseSpeed * difficultyFactor * quality;
                    const weeksEstimated = distance / adjustedSpeed;
                    const daysEstimated = weeksEstimated * 7;

                    if (daysEstimated > 365 * 2) {
                        prediction = "Longo Prazo";
                        predictionSubtext = `Continue firme. O caminho é longo.`;
                    } else {
                        const nowTime = new Date().getTime();

                        // FIX Bug 2: Margin calculated via error propagation
                        // σ_days = σ_scores / pointsPerDay
                        const pointsPerDay = adjustedSpeed / 7;
                        const sdDays = dailySD / (pointsPerDay || 0.1);

                        // Limit margin to 50% of total time to avoid explosive intervals
                        const sigmaLimit = daysEstimated * 0.5;
                        const margin = Math.min(sdDays, sigmaLimit);

                        const daysMin = Math.max(1, daysEstimated - margin);
                        const daysMax = daysEstimated + margin;

                        const dateMin = new Date(nowTime + (daysMin * 24 * 60 * 60 * 1000));
                        const dateMax = new Date(nowTime + (daysMax * 24 * 60 * 60 * 1000));

                        const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

                        prediction = `${fmt(dateMin)} - ${fmt(dateMax)}`;
                        predictionSubtext = `Previsão de alcance (${target}%)`;
                        predictionStatus = "good";
                    }
                }
            }
        } else {
            predictionSubtext = `Faltam ${3 - distinctDays} dias de simulados para prever.`;
        }

        // 3. Confidence Interval (Sample Size)
        // Heuristic: < 50 questions = Low, 50-200 = Medium, > 200 = High
        // Fallback: If total questions is 0 (missing data), use N of exams.
        const nExams = allHistory.length;

        let confidenceData = {
            level: 'BAIXA',
            color: 'text-red-400',
            bgBorder: 'border-red-500',
            icon: <AlertTriangle size={20} />,
            message: "Amostra muito pequena."
        };

        if (totalQuestionsGlobal > 200 || nExams > 20) {
            confidenceData = {
                level: 'ALTA',
                color: 'text-green-400',
                bgBorder: 'border-green-500',
                icon: <ShieldCheck size={20} />,
                message: "Dados estatisticamente relevantes."
            };
        } else if (totalQuestionsGlobal > 50 || nExams > 5) {
            confidenceData = {
                level: 'MÉDIA',
                color: 'text-blue-400',
                bgBorder: 'border-blue-500',
                icon: <HelpCircle size={20} />,
                message: "Margem de erro diminuindo."
            };
        }

        // 4. Progress State Analysis per Category (using ProgressStateEngine)
        let consistency = {
            status: 'Dados Insuficientes',
            color: 'text-slate-400',
            bgBorder: 'border-slate-500',
            icon: <Minus size={20} />,
            message: "Mínimo 2 simulados em cada matéria.",
            delta: 0,
            sd: 0
        };

        const categoryBreakdown = [];
        const categoryAnalyses = [];

        // State to UI mapping
        const stateMap = {
            mastery: { status: 'DOMÍNIO', color: 'text-green-400', bgBorder: 'border-green-500/30', icon: <ShieldCheck size={20} /> },
            stagnation_negative: { status: 'ESTAGNADO BAIXO', color: 'text-red-400', bgBorder: 'border-red-500/30', icon: <AlertTriangle size={20} /> },
            stagnation_neutral: { status: 'ESTAGNADO MÉDIO', color: 'text-blue-400', bgBorder: 'border-blue-500/30', icon: <AlertCircle size={20} /> },
            stagnation_positive: { status: 'EXCELENTE', color: 'text-violet-400', bgBorder: 'border-violet-500/30', icon: <ShieldCheck size={20} /> },
            progression: { status: 'EM EVOLUÇÃO', color: 'text-blue-400', bgBorder: 'border-blue-500/30', icon: <TrendingUp size={20} /> },
            regression: { status: 'EM QUEDA', color: 'text-red-400', bgBorder: 'border-red-500/30', icon: <TrendingDown size={20} /> },
            unstable: { status: 'INSTÁVEL', color: 'text-orange-400', bgBorder: 'border-orange-500/30', icon: <Activity size={20} /> },
            insufficient_data: { status: 'SEM DADOS', color: 'text-slate-400', bgBorder: 'border-slate-500/30', icon: <Minus size={20} /> }
        };

        categories.forEach(cat => {
            if (cat.simuladoStats?.history?.length >= 2) {
                // BUG FIX 98: Sort history by date to ensure chronological order for trend analysis
                const sortedHistory = [...cat.simuladoStats.history]
                    .filter(h => h.date && !isNaN(new Date(h.date).getTime()))
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                const scores = sortedHistory.slice(-5).map(h => getSafeScore(h));

                const analysis = analyzeProgressState(scores, {
                    window_size: Math.min(5, scores.length),
                    stagnation_threshold: 0.5,
                    low_level_limit: 60,
                    // Bug fix: was hardcoded to 75, ignoring the actual prop targetScore
                    high_level_limit: statsTarget
                });

                categoryAnalyses.push(analysis);

                const uiState = stateMap[analysis.state] || stateMap.insufficient_data;
                const sd = Math.sqrt(analysis.variance);

                // --- TOPIC VARIATION ANALYSIS (Synchronized with recent window) ---
                const topicMap = {};
                const recentHistoryForTopics = sortedHistory.slice(-10); // Analyze recent stability
                recentHistoryForTopics.forEach(h => {
                    if (h.topics) {
                        h.topics.forEach(t => {
                            const total = Number(t.total) || 0;
                            const correct = Number(t.correct) || 0;
                            if (total > 0) {
                                const topicScore = (correct / total) * 100;
                                if (!topicMap[t.name]) topicMap[t.name] = [];
                                topicMap[t.name].push(topicScore);
                            }
                        });
                    }
                });

                const unstableTopics = [];
                Object.entries(topicMap).forEach(([tName, tScores]) => {
                    if (tScores.length >= 2) {
                        const tMean = tScores.reduce((a, b) => a + b, 0) / tScores.length;
                        const tVar = tScores.reduce((a, b) => a + Math.pow(b - tMean, 2), 0) / (tScores.length - 1);
                        const tSD = Math.sqrt(tVar);
                        if (tSD > 10) {
                            unstableTopics.push({ name: tName, sd: tSD });
                        }
                    }
                });

                unstableTopics.sort((a, b) => b.sd - a.sd);
                const villains = unstableTopics.slice(0, 3);

                categoryBreakdown.push({
                    name: cat.name,
                    status: uiState.status,
                    color: uiState.color,
                    bgBorder: uiState.bgBorder,
                    delta: analysis.delta,
                    sd: sd.toFixed(1),
                    rawSd: sd,
                    message: analysis.label,
                    state: analysis.state,
                    villains: villains
                });
            }
        });

        // Sort: Worst states first (regression > stagnation_negative > unstable > others)
        const statePriority = { regression: 0, stagnation_negative: 1, unstable: 2, stagnation_neutral: 3, progression: 4, stagnation_positive: 5 };
        categoryBreakdown.sort((a, b) => (statePriority[a.state] || 6) - (statePriority[b.state] || 6));

        // Consolidate for Global Card
        if (categoryAnalyses.length > 0) {
            const avgDelta = categoryAnalyses.reduce((a, b) => a + b.delta, 0) / categoryAnalyses.length;
            const avgSD = Math.sqrt(categoryAnalyses.reduce((a, b) => a + (Number(b.variance) || 0), 0) / categoryAnalyses.length);

            // D-03 FIX: Usar MEDIANA dos estados em vez da pior matéria.
            // Antes, 1 matéria em queda deixava o card global vermelho mesmo com 4/5 indo bem.
            const stateScores = {
                regression: 0, stagnation_negative: 1, unstable: 2,
                stagnation_neutral: 3, progression: 4, stagnation_positive: 5, mastery: 6
            };
            const stateValues = categoryBreakdown.map(c => stateScores[c.state] ?? 3);
            stateValues.sort((a, b) => a - b);
            const medianValue = stateValues[Math.floor(stateValues.length / 2)];
            const medianState = Object.entries(stateScores).find(([, v]) => v === medianValue)?.[0] || 'unstable';
            const uiState = stateMap[medianState] || stateMap.insufficient_data;

            consistency = {
                status: uiState.status,
                color: uiState.color,
                bgBorder: uiState.bgBorder,
                icon: uiState.icon,
                message: categoryBreakdown[0].message,
                delta: avgDelta.toFixed(1),
                sd: avgSD.toFixed(1)
            };
        }

        return { hasEnoughData, trend, trendValue, prediction, predictionStatus, predictionSubtext, confidenceData, totalQuestionsGlobal, consistency, categoryBreakdown, targetScore: statsTarget };
    }, [categories, statsTarget]);

    return (
        <div className="flex flex-col gap-4 animate-fade-in-down">
            {/* Top Row: AI Forecast and Consistency Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ForecastCard
                    prediction={stats.prediction}
                    status={stats.predictionStatus}
                    subtext={stats.predictionSubtext}
                    targetScore={stats.targetScore}
                    trend={stats.trend}
                    hasEnoughData={stats.hasEnoughData}
                />
                <ConsistencyCard consistency={stats.consistency} />
            </div>

            {/* Bottom Row: Monte Carlo Side-by-Side (B-15 FIX: Unified Lab Section) */}
            <div className="mt-12 mb-8 relative">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-white/5 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                            <Activity size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Simulação de Monte Carlo</h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Laboratório de Análise Estocástica</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowConfig(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl text-xs font-black text-slate-300 transition-all shadow-xl hover:scale-105 active:scale-95 group/btn"
                        >
                            <Settings2 size={16} className="group-hover/btn:rotate-90 transition-transform duration-500" />
                            Configurar Pesos e Meta
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <MonteCarloGauge
                        categories={categories}
                        goalDate={user?.goalDate}
                        targetScore={targetScore}
                        onTargetScoreChange={setTargetScore}
                        forcedMode="today"
                        forcedTitle="Status Atual"
                    />
                    <MonteCarloGauge
                        categories={categories}
                        goalDate={user?.goalDate}
                        targetScore={targetScore}
                        onTargetScoreChange={setTargetScore}
                        forcedMode="future"
                        forcedTitle="Projeção Futura"
                    />
                </div>
            </div>

            <MonteCarloConfig
                show={showConfig}
                onClose={() => setShowConfig(false)}
                targetScore={targetScore}
                setTargetScore={setTargetScore}
                equalWeightsMode={equalWeightsMode}
                setEqualWeightsMode={setEqualWeightsMode}
                getEqualWeights={getEqualWeights}
                setWeights={setWeights}
                weights={weights}
                updateWeight={updateWeight}
                categories={categories}
                user={user}
            />

            {/* Subject Consistency Breakdown - Full Width */}
            <div className="glass p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group/breakdown">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
                
                <div className="flex items-center gap-3 mb-8 relative z-10">
                    <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center border border-white/10 shadow-lg">
                        <Activity size={16} className="text-slate-400" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Consistência por Matéria</h3>
                        {stats.categoryBreakdown.length > 0 && (
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                {stats.categoryBreakdown.length} matéria{stats.categoryBreakdown.length > 1 ? 's' : ''} analisada{stats.categoryBreakdown.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>
                <div className="relative z-10">
                    <SubjectBreakdownTable categoryBreakdown={stats.categoryBreakdown} />
                </div>
            </div>
        </div>
    );
}
