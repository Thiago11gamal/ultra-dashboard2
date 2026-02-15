import React, { useMemo } from 'react';
import { Target, CheckCircle2 } from 'lucide-react';

export default function ParetoAnalysis({ categories = [] }) {

    // Calculate Pareto Data
    const { topEnemies, totalLostPoints } = useMemo(() => {
        let allTopics = [];

        categories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history) {
                // Flatten history
                cat.simuladoStats.history.forEach(h => {
                    const topics = h.topics || [];
                    topics.forEach(t => {
                        const correct = parseInt(t.correct) || 0;
                        const total = parseInt(t.total) || 0;
                        const missed = total - correct;

                        if (total > 0) {
                            allTopics.push({
                                category: cat.name,
                                topic: t.name,
                                total,
                                correct,
                                missed,
                                percentage: Math.round((correct / total) * 100)
                            });
                        }
                    });
                });
            }
        });

        // Default weights (Mirroring MonteCarloGauge or valid system defaults)
        const WEIGHTS = {
            'Língua Portuguesa': 20,
            'Raciocínio Lógico': 20,
            'Informática': 15,
            'Geografia': 15,
            'Conhecimentos Específicos': 30
        };

        // 1. Group by Topic Name (Merge duplicates across simulados)
        const topicMap = {};
        allTopics.forEach(t => {
            const key = `${t.category} - ${t.topic}`;
            // Get weight for this category (default to 1 if not found)
            const weight = (WEIGHTS[t.category] || 10) / 10; // Normalized: 1.0, 1.5, 2.0, 3.0

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
        // Pareto: The cumulative missed points
        let cumulative = 0;
        const paretoThreshold = totalMissedGlobal * 0.8;

        let enemies = [];
        let others = [];

        groupedTopics.forEach(t => {
            if (cumulative < paretoThreshold) {
                cumulative += t.weightedMissed;
                enemies.push(t);
            } else {
                others.push(t);
            }
        });

        // Limit UI to top 5 enemies to keep it clean
        const topEnemiesList = enemies.slice(0, 5);

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
                    {topEnemies.map((item, idx) => (
                        <div key={idx} className="bg-black/30 p-4 rounded-xl border border-red-500/20 flex items-center justify-between group hover:border-red-500/50 transition-colors">
                            <div className="flex-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">{item.category}</span>
                                <h4 className="font-bold text-red-100">{item.topic}</h4>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <div className="text-2xl font-black text-red-500 leading-none">-{item.weightedMissed.toFixed(1)}</div>
                                <span className="text-[10px] text-red-400 font-bold uppercase">Pontos Ponderados</span>
                                <span className="text-[10px] text-slate-600 mt-1">Peso: {item.weight}x | Acerto: {item.percentage}%</span>
                            </div>
                        </div>
                    ))}

                    <div className="p-4 rounded-xl border border-dashed border-slate-700 text-center">
                        <p className="text-xs text-slate-400">
                            Ao dominar apenas estes {topEnemies.length} tópicos, você recupera <span className="text-white font-bold">{Math.round((topEnemies.reduce((a, b) => a + b.weightedMissed, 0) / (totalLostPoints || 1)) * 100)}%</span> dos seus pontos perdidos na prova.
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
