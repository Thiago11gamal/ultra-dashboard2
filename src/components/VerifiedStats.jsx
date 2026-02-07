import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, ShieldCheck, HelpCircle, Calculator, Activity, AlertCircle } from 'lucide-react';
import MonteCarloGauge from './MonteCarloGauge';

const InfoTooltip = ({ text }) => (
    <div className="relative group/tooltip inline-block ml-auto z-10">
        <HelpCircle size={14} className="text-slate-600 hover:text-purple-400 transition-colors cursor-help" />
        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl text-xs text-slate-300 shadow-2xl opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none z-[9999] text-right">
            {text}
        </div>
    </div>
);

export default function VerifiedStats({ categories = [], user }) {

    const stats = useMemo(() => {
        let allHistory = [];
        let totalQuestionsGlobal = 0;
        let allScores = []; // For SD calculation

        categories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history) {
                // Flatten history for global regression
                cat.simuladoStats.history.forEach(h => {
                    if (h.date && h.score !== undefined) {
                        allHistory.push({
                            date: new Date(h.date).getTime(),
                            score: h.score,
                            totalQuestions: h.total || 0
                        });
                        totalQuestionsGlobal += (h.total || 0);
                        allScores.push(h.score);
                    }
                });
            }
        });

        // Sort by date
        allHistory.sort((a, b) => a.date - b.date);

        // 1. Daily Trend Algorithm (Last 5 Days)
        let trend = 'stable';
        let trendValue = 0;

        // Group by Date for Daily Average calculation
        const dailyGroups = {};
        allHistory.forEach(h => {
            const dateKey = new Date(h.date).toLocaleDateString();
            if (!dailyGroups[dateKey]) dailyGroups[dateKey] = { sum: 0, count: 0, dateFull: h.date };
            dailyGroups[dateKey].sum += h.score;
            dailyGroups[dateKey].count += 1;
        });

        // Convert to array of { date, avgScore } and sort
        const dailyAverages = Object.values(dailyGroups)
            .map(g => ({ date: g.dateFull, score: g.sum / g.count }))
            .sort((a, b) => a.date - b.date);

        const recentDays = dailyAverages.slice(-5);

        if (recentDays.length >= 3) {
            // Split: Recent (Last 2 days) vs Base (Previous 3 days)
            const splitIndex = Math.max(0, recentDays.length - 2);

            const baseSet = recentDays.slice(0, splitIndex);
            const recentSet = recentDays.slice(splitIndex);

            const baseAvg = baseSet.reduce((a, b) => a + b.score, 0) / baseSet.length;
            const recentAvg = recentSet.reduce((a, b) => a + b.score, 0) / recentSet.length;

            trendValue = recentAvg - baseAvg;
            if (trendValue > 2) trend = 'up';
            else if (trendValue < -2) trend = 'down';
        }

        // 2. Linear Regression & Contextual Prediction
        let prediction = "Calibrando...";
        let predictionSubtext = "Realize mais simulados.";
        let predictionStatus = "neutral"; // neutral, good, warning, excellence
        let daysToGoal = null;
        let targetScore = 90;

        if (allHistory.length >= 3) {
            // Get recent average (last 3)
            const recentHistory = allHistory.slice(-3);
            const currentAvg = recentHistory.reduce((a, b) => a + b.score, 0) / recentHistory.length;

            // Determine Target dynamically
            if (currentAvg >= 88) {
                targetScore = 100;
            }

            // Simple Linear Regression
            const startStr = allHistory[0].date;
            const dataPoints = allHistory.map(h => ({
                x: (h.date - startStr) / (1000 * 60 * 60 * 24), // Days
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
            } else {
                // All points on same day or insufficient variance
                slope = 0;
            }

            // ANTIGRAVITY PREDICTION ENGINE 🚀
            // 1. Inputs
            const currentScore = currentAvg;
            const target = targetScore;

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
                    // If SD is high (unstable), efficiency drops.
                    // SD 0 -> Quality 1.0. SD 20 -> Quality 0.5.
                    // Using global history SD roughly here:
                    let quality = 0.8; // Default good

                    // Calculate quick SD of recent history
                    const recVariance = recentHistory.reduce((a, b) => a + Math.pow(b.score - currentAvg, 2), 0) / recentHistory.length;
                    const recSD = Math.sqrt(recVariance);
                    quality = Math.max(0.5, 1 - (recSD / 40)); // Normalize: SD=0 -> 1.0, SD=20 -> 0.5

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
        let confidenceData = {
            level: 'BAIXA',
            color: 'text-red-400',
            bgBorder: 'border-red-500',
            icon: <AlertTriangle size={20} />,
            message: "Amostra muito pequena."
        };

        if (totalQuestionsGlobal > 200) {
            confidenceData = {
                level: 'ALTA',
                color: 'text-green-400',
                bgBorder: 'border-green-500',
                icon: <ShieldCheck size={20} />,
                message: "Dados estatisticamente relevantes."
            };
        } else if (totalQuestionsGlobal > 50) {
            confidenceData = {
                level: 'MÉDIA',
                color: 'text-yellow-400',
                bgBorder: 'border-yellow-500',
                icon: <HelpCircle size={20} />,
                message: "Margem de erro diminuindo."
            };
        }

        // 4. Content Consistency (Weighted Standard Deviation)
        // New Algorithm: Average of SDs per Category
        // Logic: being consistent in Math (always 90) and Port (always 40) makes you a "Consistent Student" with knowledge gaps, not an "Oscillating Student".

        let consistency = {
            status: 'Dados Insuficientes',
            color: 'text-slate-400',
            bgBorder: 'border-slate-500',
            icon: <Minus size={20} />,
            message: "Mínimo 2 simulados em cada matéria.",
            sd: 0
        };

        const categorySDs = [];
        const categoryBreakdown = [];

        categories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history && cat.simuladoStats.history.length >= 2) {
                const scores = cat.simuladoStats.history.map(h => h.score);
                const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
                // Sample Standard Deviation (n-1) - Bessel's correction for small samples
                const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length - 1);
                const sd = Math.sqrt(variance);
                const sdFixed = sd.toFixed(1);

                categorySDs.push(sd);

                // Individual Status
                let status = 'ESTÁVEL';
                let color = 'text-yellow-400';
                let bgBorder = 'border-yellow-500/30';

                if (sd < 5) {
                    status = 'CONSISTENTE';
                    color = 'text-green-400';
                    bgBorder = 'border-green-500/30';
                } else if (sd > 15) {
                    status = 'OSCILANTE';
                    color = 'text-red-400';
                    bgBorder = 'border-red-500/30';
                }

                // --- TOPIC VARIATION ANALYSIS (NEW) ---
                const topicMap = {}; // { "TopicName": [score1, score2, ...] }
                cat.simuladoStats.history.forEach(h => {
                    if (h.topics) {
                        h.topics.forEach(t => {
                            // Ensure valid data (ignore topics with 0 total questions to avoid NaN)
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
                        // Calculate Topic SD
                        const tMean = tScores.reduce((a, b) => a + b, 0) / tScores.length;
                        const tVar = tScores.reduce((a, b) => a + Math.pow(b - tMean, 2), 0) / (tScores.length - 1);
                        const tSD = Math.sqrt(tVar);

                        // We care about high SD (instability)
                        if (tSD > 10) { // arbitrary threshold for "unstable"
                            unstableTopics.push({ name: tName, sd: tSD });
                        }
                    }
                });

                // Sort by SD Descending (Most unstable first)
                unstableTopics.sort((a, b) => b.sd - a.sd);
                const villains = unstableTopics.slice(0, 3); // Top 3 villains

                categoryBreakdown.push({
                    name: cat.name,
                    sd: sdFixed,
                    rawSd: sd,
                    status,
                    color,
                    bgBorder,
                    villains // Passed to UI
                });
            }
        });

        // Sort Breakdown: Worst consistency (highest SD) first
        categoryBreakdown.sort((a, b) => b.rawSd - a.rawSd);

        if (categorySDs.length > 0) {
            // Global SD is the average of individual SDs
            const avgSD = categorySDs.reduce((a, b) => a + b, 0) / categorySDs.length;
            const sdFixed = avgSD.toFixed(1);

            if (avgSD < 5) {
                consistency = {
                    status: 'CONSISTENTE',
                    color: 'text-green-400',
                    bgBorder: 'border-green-500',
                    icon: <Activity size={20} />,
                    message: "Variação mínima intra-matéria. Excelente.",
                    sd: sdFixed
                };
            } else if (avgSD > 15) {
                consistency = {
                    status: 'OSCILANTE',
                    color: 'text-red-400',
                    bgBorder: 'border-red-500',
                    icon: <AlertCircle size={20} />,
                    message: "⚠️ Busque estabilidade nas matérias.",
                    sd: sdFixed
                };
            } else {
                consistency = {
                    status: 'ESTÁVEL',
                    color: 'text-yellow-400',
                    bgBorder: 'border-yellow-500',
                    icon: <Activity size={20} />,
                    message: "Ritmo constante por disciplina.",
                    sd: sdFixed
                };
            }
        }

        return { trend, trendValue, prediction, predictionStatus, predictionSubtext, daysToGoal, confidenceData, totalQuestionsGlobal, consistency, categoryBreakdown, targetScore };
    }, [categories]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-down">
            {/* Card 1: Linear Regression & Base Prediction (25%) */}
            <div className="col-span-1 glass h-full p-4 rounded-3xl relative flex flex-col justify-between border-l-4 bg-gradient-to-br from-slate-900 via-slate-900 to-black/80 group hover:bg-black/40 transition-colors shadow-2xl border-blue-500">

                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border bg-opacity-20 ${stats.predictionStatus === 'excellence' || stats.predictionStatus === 'good' ? 'bg-green-500/20 border-green-500/30' : stats.predictionStatus === 'warning' ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-blue-500/20 border-blue-500/30'}`}>
                            <Target size={16} className={stats.predictionStatus === 'excellence' || stats.predictionStatus === 'good' ? "text-green-400" : stats.predictionStatus === 'warning' ? "text-yellow-400" : "text-blue-400"} />
                        </div>
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Previsão</span>
                    </div>
                </div>

                {/* Main Verdict */}
                <div className="text-center my-2">
                    <h2 className={`text-lg md:text-xl font-black leading-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent drop-shadow-md`}>
                        {stats.prediction}
                    </h2>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 w-full mb-3">
                    <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center shadow-inner">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sua Meta</span>
                        <span className="text-sm font-black text-blue-400">{stats.targetScore || 90}%</span>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center shadow-inner">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tendência (5d)</span>
                        <div className="flex items-center gap-1">
                            {stats.trend === 'up' && <TrendingUp size={14} className="text-green-400" />}
                            {stats.trend === 'down' && <TrendingDown size={14} className="text-red-400" />}
                            {stats.trend === 'stable' && <Minus size={14} className="text-slate-500" />}
                            <span className="text-xs font-bold text-slate-200">{stats.trend === 'up' ? 'Alta' : stats.trend === 'down' ? 'Baixa' : 'Estável'}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Message */}
                <div className="mt-auto pt-2 border-t border-white/10">
                    <p className="text-[10px] text-slate-300 text-center leading-relaxed font-medium">
                        {stats.predictionSubtext}
                    </p>
                </div>
            </div>

            {/* Card 2: Consistency (Standard Deviation) (25%) */}
            <div className={`col-span-1 glass h-full p-4 rounded-3xl relative flex flex-col justify-between border-l-4 bg-gradient-to-br from-slate-900 via-slate-900 to-black/80 group hover:bg-black/40 transition-colors shadow-2xl ${stats.consistency.bgBorder}`}>

                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border bg-opacity-20 ${stats.consistency.bgBorder.replace('/30', '/20').replace('border-', 'bg-').replace('border-', 'border-')}`}>
                            <Activity size={16} className={stats.consistency.color.replace('text-', 'text-')} />
                        </div>
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Consistência</span>
                    </div>
                </div>

                {/* Main Verdict */}
                <div className="text-center my-2">
                    <h2 className={`text-lg md:text-xl font-black leading-tight ${stats.consistency.color} drop-shadow-md`}>
                        {stats.consistency.status}
                    </h2>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 w-full mb-3">
                    <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center shadow-inner">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Desvio Padrão</span>
                        <span className={`text-sm font-black ${stats.consistency.color}`}>±{stats.consistency.sd}%</span>
                    </div>
                    <div className="bg-black/40 p-2 rounded-lg border border-white/10 flex flex-col items-center shadow-inner">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Diagnóstico</span>
                        <span className="text-xs font-bold text-slate-200 text-center leading-tight line-clamp-2 px-1">
                            {stats.consistency.status === 'CONSISTENTE' ? 'Alta Estabilidade' : stats.consistency.status === 'OSCILANTE' ? 'Alta Variação' : 'Variação Média'}
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

            {/* Card 3: Monte Carlo (50%) */}
            <div className="col-span-1 md:col-span-2 h-full">
                <MonteCarloGauge categories={categories} goalDate={user?.goalDate} />
            </div>

            {/* Subject Consistency Breakdown - Full Width */}
            <div className="glass col-span-1 md:col-span-4 p-6 mt-2">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <Activity size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Detalhe da Consistência por Matéria</h3>
                </div>

                {stats.categoryBreakdown.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stats.categoryBreakdown.map((cat, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border bg-black/20 flex flex-col gap-2 ${cat.bgBorder}`}>
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
                                            {cat.villains.map((v, vIdx) => (
                                                <div key={vIdx} className="flex justify-between items-center text-[10px]">
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
