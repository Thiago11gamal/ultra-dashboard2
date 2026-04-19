import React, { useMemo } from 'react';
import { Target, CheckCircle2 } from 'lucide-react';
import { getSafeScore } from '../utils/scoreHelper';

export default function ParetoAnalysis({ categories = [], maxScore = 100 }) {

    // Calculate Pareto Data
    const { topEnemies, totalLostPoints } = useMemo(() => {
        let allTopics = [];

        if (!Array.isArray(categories) || categories.length === 0) return { topEnemies: [], totalLostPoints: 0, hiddenOpportunities: 0 };

        categories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history) {
                // Flatten history
                cat.simuladoStats.history.forEach(h => {
                    const topics = h.topics || [];
                    topics.forEach(t => {
                        const total = parseInt(t.total, 10) || 0;
                        const correctCount = (total > 0)
                            ? Math.round((getSafeScore(t, maxScore) / maxScore) * total)
                            : (parseInt(t.correct, 10) || 0);
                        const missed = Math.max(0, total - correctCount);

                        if (total > 0) {
                            allTopics.push({
                                category: cat.name,
                                topic: t.name,
                                total,
                                correct: correctCount,
                                missed,
                                percentage: total > 0 ? Math.round((correctCount / total) * 100) : 0
                            });
                        }
                    });
                });
            }
        });

        // 1. Group by Topic Name (Merge duplicates across simulados)
        const topicMap = {};
        allTopics.forEach(t => {
            const key = `${t.category} - ${t.topic}`;

            // Find category to get weight
            const cat = categories.find(c => c.name === t.category);
            const weight = 1.0; // Pareto analysis for knowledge gaps should focus on absolute error frequency

            if (!topicMap[key]) topicMap[key] = { ...t, count: 1, weight };
            else {
                topicMap[key].total += t.total;
                topicMap[key].correct += t.correct;
                topicMap[key].missed += t.missed;
                topicMap[key].count += 1;
                // Re-calc percentage
                topicMap[key].percentage = Math.round((topicMap[key].correct / topicMap[key].total) * 100);
            }
        });

        const groupedTopics = Object.values(topicMap);
        // Calculate Weighted Missed Points
        groupedTopics.forEach(t => {
            t.weightedMissed = t.missed * t.weight;
        });

        const totalMissedGlobal = groupedTopics.reduce((acc, t) => acc + t.weightedMissed, 0);

        // Sort by Weighted Missed Points (Descending)
        groupedTopics.sort((a, b) => b.weightedMissed - a.weightedMissed);

        // Identify Top 20% (or top 5 items for UI)
        let cumulative = 0;
        const paretoThreshold = totalMissedGlobal * 0.8;

        let enemies = [];
        let others = [];

        groupedTopics.forEach(t => {
            if (cumulative < paretoThreshold || enemies.length === 0) {
                enemies.push(t);
                cumulative += t.weightedMissed; 
            } else {
                others.push(t);
            }
        });

        // Use all qualifying enemies instead of a fixed UI limit to respect the true 80%
        const topEnemiesList = enemies;

        // Hidden Opportunities: Topics with LOW total questions but 100% error rate (Low hanging fruit)
        // or High Volume, Low Performance

        return {
            topEnemies: topEnemiesList,
            totalLostPoints: totalMissedGlobal,
            hiddenOpportunities: others.length // Just a count for now
        };

    }, [categories]);

    return (
        <div className="glass p-6 h-full flex flex-col border-l border-white/5 bg-gradient-to-br from-slate-900/50 to-red-900/10">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-500/20 rounded-lg">
                    <Target size={20} className="text-red-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Matriz de Pareto (80/20)</h3>
                    <p className="text-xs text-slate-400">Foque nestes assuntos para subir sua nota.</p>
                </div>
            </div>

            {topEnemies.length > 0 ? (
                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {topEnemies.map((item, idx) => {
                        const maxImpact = topEnemies[0]?.weightedMissed || 1;
                        const impactPercent = Math.min(100, Math.max(2, Math.round((item.weightedMissed / maxImpact) * 100))); // Garantir mínimo de 2% para a barra ser visível

                        return (
                            <div key={idx} className="bg-slate-900/60 p-4 sm:p-5 rounded-xl border border-red-500/20 flex flex-col group hover:border-red-500/40 hover:bg-slate-900/80 transition-all relative overflow-hidden mb-3">
                                {/* Impact Background Bar */}
                                <div className="absolute left-0 bottom-0 h-1.5 bg-red-950/40 w-full" />
                                <div
                                    className={`absolute left-0 bottom-0 h-1.5 transition-all duration-1000 ease-out flex ${idx === 0 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`}
                                    style={{ width: `${impactPercent}%` }}
                                />

                                <div className="flex items-center justify-between z-10 pb-1">
                                    <div className="flex-1 pr-4">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-black/60 px-2.5 py-1 rounded-md border border-white/5">
                                                {item.category}
                                            </span>
                                            {idx === 0 && (
                                                <span className="text-[10px] font-black uppercase text-red-50 bg-red-600/90 px-2 py-1 rounded-md shadow-lg shadow-red-500/20 animate-pulse">
                                                    #1 Inimigo
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-semibold text-red-50 text-sm sm:text-base leading-snug">{item.topic}</h4>
                                    </div>
                                    
                                    <div className="text-right flex flex-col items-end shrink-0 border-l border-white/10 pl-4 py-1">
                                        <div className="text-2xl sm:text-3xl font-black text-red-400 leading-none tracking-tighter">
                                            -{Number(item.weightedMissed || 0).toFixed(1)}
                                        </div>
                                        <span className="text-[10px] sm:text-xs text-red-400/80 font-bold uppercase tracking-widest mt-1">
                                            Déficit
                                        </span>
                                        <span className="text-[11px] text-slate-500 mt-1.5 font-mono font-medium">
                                            Acerto: <strong className="text-slate-300">{item.percentage}%</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="p-4 rounded-xl border border-dashed border-slate-700 text-center">
                        <p className="text-xs text-slate-400">
                            Ao dominar apenas estes {topEnemies.length} tópicos, você recupera <span className="text-white font-bold">{Math.round((topEnemies.reduce((a, b) => a + (b.weightedMissed || 0), 0) / (totalLostPoints || 1)) * 100)}%</span> dos seus pontos perdidos na prova.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <CheckCircle2 size={48} className="text-green-500/20 mb-4" />
                    <p>Sem pontos cegos detectados ainda.</p>
                </div>
            )}
        </div>
    );
}
