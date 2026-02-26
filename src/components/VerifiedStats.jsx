import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, ShieldCheck, HelpCircle, Activity, AlertCircle } from 'lucide-react';
import MonteCarloGauge from './MonteCarloGauge';
import { analyzeProgressState } from '../utils/ProgressStateEngine';
import { getSafeScore } from '../utils/scoreHelper';

const InfoTooltip = ({ text }) => (
    <div className="relative group/tooltip inline-block ml-auto z-10">
        <HelpCircle size={14} className="text-slate-600 hover:text-purple-400 transition-colors cursor-help" />
        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl text-xs text-slate-300 shadow-2xl opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none z-[9999] text-right">
            {text}
        </div>
    </div>
);

export default function VerifiedStats({ categories = [], user, onUpdateWeights }) {
    // Lifted State for Target Score (Shared between Prediction Card and Monte Carlo Gauge)
    const [targetScore, setTargetScore] = React.useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('monte_carlo_target');
            return saved ? parseInt(saved) : 70;
        }
        return 70;
    });

    // Save to LocalStorage whenever it changes
    React.useEffect(() => {
        localStorage.setItem('monte_carlo_target', targetScore.toString());
    }, [targetScore]);

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
                            totalQuestions: h.total || 0
                        });
                        totalQuestionsGlobal += (h.total || 0);
                    }
                });
            }
        });

        // Sort by date (Robust against string dates)
        allHistory = allHistory.filter(h => !isNaN(h.date));
        allHistory.sort((a, b) => a.date - b.date);

        // 1. Progress State Analysis (using ProgressStateEngine)
        const allScores = allHistory.map(h => h.score);
        const globalAnalysis = analyzeProgressState(allScores, {
            window_size: Math.min(5, allScores.length),
            stagnation_threshold: 0.5,
            low_level_limit: 60,
            high_level_limit: targetScore
        });

        // Map to UI-compatible format
        const hasEnoughData = allScores.length >= 3;
        const trend = !hasEnoughData ? 'insufficient' :
            (globalAnalysis.trend_slope > 0.01 ? 'up' :
                globalAnalysis.trend_slope < -0.01 ? 'down' : 'stable');
        const trendValue = globalAnalysis.trend_slope;
        const progressState = globalAnalysis.state; // eslint-disable-line no-unused-vars
        const progressLabel = globalAnalysis.label; // eslint-disable-line no-unused-vars

        // 2. Linear Regression & Contextual Prediction
        let prediction = "Calibrando...";
        let predictionSubtext = "Realize mais simulados.";
        let predictionStatus = "neutral";

        // Use the lifted state directly
        const userTarget = targetScore;
        let calculatedTarget = userTarget;

        if (allHistory.length >= 3) {
            // Get recent average (last 5 for better stability)
            const recentHistory = allHistory.slice(-5);
            const currentAvg = recentHistory.reduce((a, b) => a + b.score, 0) / recentHistory.length;

            // Determine Target dynamically IF user is already above their target
            if (currentAvg >= userTarget) {
                calculatedTarget = 100;
            }

            // Simple Linear Regression
            const startTime = new Date(allHistory[0].date).getTime();
            const dataPoints = allHistory.map(h => ({
                x: (new Date(h.date).getTime() - startTime) / (1000 * 60 * 60 * 24), // Days
                y: h.score
            }));

            const n = dataPoints.length;
            const sumX = dataPoints.reduce((a, b) => a + b.x, 0);
            const sumY = dataPoints.reduce((a, b) => a + b.y, 0);
            const sumXY = dataPoints.reduce((a, b) => a + b.x * b.y, 0);
            const sumXX = dataPoints.reduce((a, b) => a + b.x * b.x, 0);

            const denom = (n * sumXX - sumX * sumX);
            let slope = 0;

            if (denom !== 0) {
                slope = (n * sumXY - sumX * sumY) / denom;
                // Limit slope to realistic values (-2.0% to +2.0% per day)
                // This prevents unrealistic "runaway" predictions, but must be high enough to catch real improvement.
                slope = Math.max(-2.0, Math.min(2.0, slope));
            } else {
                // All points on same day or insufficient variance
                slope = 0;
            }

            // ANTIGRAVITY PREDICTION ENGINE 🚀
            // 1. Inputs
            const currentScore = currentAvg;
            const target = calculatedTarget;

            // 2. Distance Calculation
            const distance = target - currentScore;

            if (distance <= 0 || currentScore >= target) {
                prediction = "Meta Atingida!";
                predictionSubtext = "Rumo aos 100%!";
                predictionStatus = "excellence";
            } else {
                // 3. Base Speed Calculation (Weekly Moving Average)
                const weeklyBaseSpeed = slope * 7;

                if (weeklyBaseSpeed <= 0.01) {
                    // Speed too low or negative
                    prediction = "Estagnado/Queda";
                    predictionSubtext = "Melhore sua tendência diária para gerar previsão.";
                    predictionStatus = "warning";
                } else {

                    // 4. Difficulty Factor (The higher you are, the harder it gets)
                    let difficultyFactor = 1.0;
                    if (currentScore >= 80) difficultyFactor = 0.6;
                    else if (currentScore >= 70) difficultyFactor = 0.8;

                    // 5. Efficiency (Quality)
                    // Approximated by Consistency (1 - Normalized SD). 
                    // Use Average SD across categories to measure true consistency,
                    // avoiding penalizing students with varied strengths (e.g. Math 90, Hist 40 is consistent!).
                    let quality = 0.8; // Default good

                    // Calculate Average SD of active categories (Last 5 exams per category)
                    let totalSD = 0;
                    let countSD = 0;

                    categories.forEach(cat => {
                        if (cat.simuladoStats && cat.simuladoStats.history && cat.simuladoStats.history.length >= 2) {
                            const scores = cat.simuladoStats.history.slice(-5).map(h => getSafeScore(h));
                            const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
                            const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length - 1);
                            totalSD += Math.sqrt(variance);
                            countSD++;
                        }
                    });

                    const avgSD = countSD > 0 ? totalSD / countSD : 20; // Default fallback if no data
                    quality = Math.max(0.5, 1 - (avgSD / 40)); // Normalize: SD=0 -> 1.0, SD=20 -> 0.5

                    // Final Adjusted Speed (Points per Week)
                    const adjustedSpeed = weeklyBaseSpeed * difficultyFactor * quality;

                    // 6. Estimated Time
                    const weeksEstimated = distance / adjustedSpeed;
                    const daysEstimated = weeksEstimated * 7;

                    // 7. Interval Projection
                    if (daysEstimated > 365 * 2) {
                        prediction = "Longo Prazo";
                        predictionSubtext = `Continue firme. O caminho é longo.`;
                    } else {
                        const nowTime = new Date().getTime();

                        const daysMin = daysEstimated * 0.8;
                        const daysMax = daysEstimated * 1.2;

                        const dateMin = new Date(nowTime + (daysMin * 24 * 60 * 60 * 1000));
                        const dateMax = new Date(nowTime + (daysMax * 24 * 60 * 60 * 1000));

                        // Format output
                        const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

                        prediction = `${fmt(dateMin)} - ${fmt(dateMax)}`;
                        predictionSubtext = `Previsão de alcance (${target}%)`;
                        predictionStatus = "good";
                    }
                }
            }
            // Legacy logic removed. Antigravity Engine handles all scenarios.

        } else {
            predictionSubtext = `Faltam ${3 - allHistory.length} simulados para prever.`;
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
                color: 'text-yellow-400',
                bgBorder: 'border-yellow-500',
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
            mastery: { status: 'DOMÍNIO', color: 'text-violet-400', bgBorder: 'border-violet-500/30', icon: <ShieldCheck size={20} /> },
            stagnation_negative: { status: 'ESTAGNADO BAIXO', color: 'text-red-400', bgBorder: 'border-red-500/30', icon: <AlertTriangle size={20} /> },
            stagnation_neutral: { status: 'ESTAGNADO MÉDIO', color: 'text-yellow-400', bgBorder: 'border-yellow-500/30', icon: <AlertCircle size={20} /> },
            stagnation_positive: { status: 'EXCELENTE', color: 'text-green-400', bgBorder: 'border-green-500/30', icon: <ShieldCheck size={20} /> },
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
                    high_level_limit: 75
                });

                categoryAnalyses.push(analysis);

                const uiState = stateMap[analysis.state] || stateMap.insufficient_data;
                const sd = Math.sqrt(analysis.variance);

                // --- TOPIC VARIATION ANALYSIS ---
                const topicMap = {}; // { "TopicName": [score1, score2, ...] }
                cat.simuladoStats.history.forEach(h => {
                    if (h.topics) {
                        h.topics.forEach(t => {
                            const total = parseInt(t.total) || 0;
                            const correct = parseInt(t.correct) || 0;
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
            const avgSD = categoryAnalyses.reduce((a, b) => a + Math.sqrt(b.variance), 0) / categoryAnalyses.length;

            // Use worst category state for global status
            const worstCategory = categoryBreakdown[0];
            const uiState = stateMap[worstCategory.state] || stateMap.insufficient_data;

            consistency = {
                status: uiState.status,
                color: uiState.color,
                bgBorder: uiState.bgBorder,
                icon: uiState.icon,
                message: worstCategory.message,
                delta: avgDelta.toFixed(1),
                sd: avgSD.toFixed(1)
            };
        }

        return { hasEnoughData, trend, trendValue, prediction, predictionStatus, predictionSubtext, confidenceData, totalQuestionsGlobal, consistency, categoryBreakdown, targetScore };
    }, [categories, targetScore]);

    return (
        <div className="flex flex-col gap-4 animate-fade-in-down">

            {/* Top Row: AI Forecast and Consistency Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Card 1: Machine Learning & Base Prediction */}
                <div className={`glass h-full p-4 rounded-3xl relative flex flex-col justify-between border-l-4 bg-gradient-to-br from-slate-900 via-slate-900 to-black/80 group hover:bg-black/40 transition-colors shadow-2xl overflow-hidden ${stats.predictionStatus === 'excellence' || stats.predictionStatus === 'good' ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.15)] hover:shadow-[0_0_25px_rgba(34,197,94,0.3)]' :
                    stats.predictionStatus === 'warning' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_25px_rgba(234,179,8,0.3)]' :
                        'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]'
                    }`}>

                    {/* AI / ML Animated Glow Background */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent blur-3xl rounded-full pointer-events-none group-hover:from-blue-500/20 group-hover:via-purple-500/20 transition-all duration-700" />

                    {/* Header */}
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border bg-opacity-20 flex items-center justify-center ${stats.predictionStatus === 'excellence' || stats.predictionStatus === 'good' ? 'bg-green-500/20 border-green-500/30' : stats.predictionStatus === 'warning' ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-blue-500/20 border-blue-500/30'}`}>
                                <Target size={18} className={stats.predictionStatus === 'excellence' || stats.predictionStatus === 'good' ? "text-green-400" : stats.predictionStatus === 'warning' ? "text-yellow-400" : "text-blue-400"} />
                            </div>
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                                Previsão IA
                                {stats.trend !== 'stable' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                            </span>
                        </div>
                    </div>

                    {/* Main Verdict with Dynamic Glow */}
                    <div className="text-center my-4 relative z-10">
                        <h2 className={`text-lg md:text-[22px] font-black leading-tight drop-shadow-lg ${stats.predictionStatus === 'excellence' || stats.predictionStatus === 'good' ? 'text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]' :
                            stats.predictionStatus === 'warning' ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]' :
                                'text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                            }`}>
                            {stats.prediction}
                        </h2>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 w-full mb-3 relative z-10">
                        <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner hover:bg-black/70 transition-colors">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Meta</span>
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-sm font-black text-slate-200">{stats.targetScore || 90}</span>
                                <span className="text-[9px] text-slate-500 font-bold">%</span>
                            </div>
                        </div>
                        <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center shadow-inner hover:bg-black/70 transition-colors">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tendência (5d)</span>
                            <div className="flex items-center gap-1.5">
                                {stats.hasEnoughData ? (
                                    <>
                                        {stats.trend === 'up' && <TrendingUp size={14} className="text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />}
                                        {stats.trend === 'down' && <TrendingDown size={14} className="text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />}
                                        {stats.trend === 'stable' && <Minus size={14} className="text-slate-500" />}
                                        <span className="text-xs font-black text-slate-200 uppercase">
                                            {stats.trend === 'up' ? 'Alta' : stats.trend === 'down' ? 'Baixa' : 'Estável'}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">Pendente</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Message */}
                    <div className="mt-auto pt-3 border-t border-white/10 relative z-10">
                        <p className="text-[10px] text-slate-400 text-center leading-relaxed font-semibold">
                            {stats.predictionSubtext}
                        </p>
                    </div>

                    {/* Animated Loading Sparkline at the bottom */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50 overflow-hidden">
                        <div className={`h-full w-1/3 rounded-full opacity-70 animate-[pulse_2s_ease-in-out_infinite] ${stats.predictionStatus === 'excellence' || stats.predictionStatus === 'good' ? 'bg-green-500' :
                            stats.predictionStatus === 'warning' ? 'bg-yellow-500' :
                                'bg-blue-500'
                            }`} style={{ animation: 'moveRight 3s linear infinite' }} />
                    </div>

                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @keyframes moveRight {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(300%); }
                        }
                    `}} />
                </div>

                {/* Card 2: Consistency (Standard Deviation) */}
                <div className={`glass h-full p-4 rounded-3xl relative flex flex-col justify-between border-l-4 bg-gradient-to-br from-slate-900 via-slate-900 to-black/80 group hover:bg-black/40 transition-colors shadow-2xl ${stats.consistency.bgBorder}`}>

                    {/* Header */}
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border bg-opacity-20 ${stats.consistency.color.replace('text-', 'bg-')}/20 ${stats.consistency.bgBorder}`}>
                                <Activity size={18} className={stats.consistency.color} />
                            </div>
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Consistência</span>
                        </div>
                    </div>

                    {/* Main Verdict */}
                    <div className="text-center my-4 relative z-10">
                        <h2 className={`text-lg md:text-xl font-black leading-tight ${stats.consistency.color} drop-shadow-md`}>
                            {stats.consistency.status}
                        </h2>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 w-full mb-3">
                        <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center shadow-inner">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Desvio Padrão</span>
                            <span className={`text-sm font-black ${stats.consistency.sd > 0 ? stats.consistency.color : 'text-slate-500'}`}>
                                {stats.consistency.sd > 0 ? `±${stats.consistency.sd}%` : '---'}
                            </span>
                        </div>
                        <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center shadow-inner">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Diagnóstico</span>
                            <span className="text-xs font-bold text-slate-200 text-center leading-tight line-clamp-2 px-1">
                                {stats.consistency.status === 'Dados Insuficientes' ? 'Pendente' :
                                    (['EXCELENTE', 'EM EVOLUÇÃO'].includes(stats.consistency.status) ? 'Alta Estabilidade' :
                                        (['EM QUEDA', 'INSTÁVEL'].includes(stats.consistency.status) ? 'Alta Variação' : 'Variação Média'))}
                            </span>
                        </div>
                    </div>

                    {/* Footer Message */}
                    <div className="mt-auto pt-2 border-t border-white/10">
                        <p className="text-[10px] text-slate-300 text-center leading-relaxed font-medium">
                            {stats.consistency.message}
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Monte Carlo Side-by-Side (50% each) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <MonteCarloGauge
                    categories={categories}
                    goalDate={user?.goalDate}
                    targetScore={targetScore}
                    onTargetChange={setTargetScore}
                    onWeightsChange={onUpdateWeights}
                    forcedMode="today"
                    forcedTitle="Status Atual"
                />
                <MonteCarloGauge
                    categories={categories}
                    goalDate={user?.goalDate}
                    targetScore={targetScore}
                    onTargetChange={setTargetScore}
                    onWeightsChange={onUpdateWeights}
                    forcedMode="future"
                    forcedTitle="Projeção Futura"
                    showSettings={false}
                />
            </div>

            {/* Subject Consistency Breakdown - Full Width */}
            <div className="glass col-span-1 lg:col-span-4 p-6 mt-2">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <Activity size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Detalhe da Consistência por Matéria</h3>
                </div>

                {stats.categoryBreakdown.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stats.categoryBreakdown.map((cat) => (
                            <div key={cat.name} className={`p-3 rounded-lg border bg-black/20 flex flex-col gap-2 ${cat.bgBorder}`}>
                                <div className="flex justify-between items-center w-full">
                                    <div>
                                        <div className="text-sm font-bold text-slate-200">{cat.name}</div>
                                        <div className={`text-xs font-bold ${cat.color}`}>{cat.status}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400">Desvio</div>
                                        <div className={`text-sm font-mono ${cat.color}`}>{cat.sd}</div>
                                    </div>
                                </div>

                                {/* Villains List */}
                                {cat.villains && cat.villains.length > 0 && (
                                    <div className="w-full mt-1 pt-2 border-t border-white/5">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <AlertTriangle size={8} /> Maiores Oscilações
                                        </div>
                                        <div className="space-y-1">
                                            {cat.villains.map((v) => (
                                                <div key={v.name} className="flex justify-between items-center text-[10px]">
                                                    <span className="text-slate-400 truncate max-w-[150px]">{v.name}</span>
                                                    <span className="text-red-400/80 font-mono">±{v.sd.toFixed(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-slate-500 py-4 text-sm">
                        É necessário realizar pelo menos 2 simulados em cada matéria para gerar o diagnóstico individual.
                    </div>
                )}
            </div>
        </div>
    );
}
