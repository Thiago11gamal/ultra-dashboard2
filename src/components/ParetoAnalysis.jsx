import React, { useMemo } from 'react';
import { Target, CheckCircle2, Zap } from 'lucide-react';
import { getSafeScore } from '../utils/scoreHelper';

// Pareto Analysis Component - Patched Version (Logic + UI)
export default function ParetoAnalysis({ categories = [], maxScore = 100 }) {

    // Calculate Pareto Data
    const { topEnemies, totalLostPoints } = useMemo(() => {
        let allTopics = [];

        if (!Array.isArray(categories) || categories.length === 0) return { topEnemies: [], totalLostPoints: 0, hiddenOpportunities: 0 };

        categories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history) {
                // Determine weight for this category
                const catWeight = Number(cat.weight || cat.rawWeight || 1.0);

                // Flatten history
                cat.simuladoStats.history.forEach((h, hIdx, hArr) => {
                    // RECENCY BIAS: Recent errors matter more than old ones
                    const recencyFactor = Math.pow(1.05, hIdx - (hArr.length - 1));
                    
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
                                weight: catWeight * recencyFactor,
                                percentage: total > 0 ? Math.round((correctCount / total) * 100) : 0
                            });
                        }
                    });
                });
            }
        });

        const topicMap = {};
        allTopics.forEach(t => {
            const key = `${t.category} - ${t.topic}`;
            if (!topicMap[key]) topicMap[key] = { ...t, weightSum: t.weight, count: 1 };
            else {
                topicMap[key].total += t.total;
                topicMap[key].correct += t.correct;
                topicMap[key].missed += t.missed;
                topicMap[key].weightSum += t.weight;
                topicMap[key].count += 1;
                topicMap[key].percentage = Math.round((topicMap[key].correct / topicMap[key].total) * 100);
            }
        });

        const groupedTopics = Object.values(topicMap);
        
        // Calculate Weighted Missed Points (Impact)
        groupedTopics.forEach(t => {
            const errorRate = (t.total - t.correct) / t.total;
            // Impact = frequency * significance * scale
            t.weightedMissed = errorRate * t.weightSum * 10;
        });

        const totalMissedGlobal = groupedTopics.reduce((acc, t) => acc + t.weightedMissed, 0);

        groupedTopics.sort((a, b) => b.weightedMissed - a.weightedMissed);

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

        return {
            topEnemies: enemies,
            totalLostPoints: totalMissedGlobal,
            hiddenOpportunities: others.length 
        };

    }, [categories, maxScore]);

    return (
        <div className="glass p-6 h-full flex flex-col border-l border-white/5 bg-gradient-to-br from-slate-900/50 to-red-900/10">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-500/20 rounded-none">
                    <Target size={18} className="text-red-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Matriz de Pareto (80/20)</h3>
                    <p className="text-xs text-slate-400">Foque nestes assuntos para subir sua nota.</p>
                </div>
            </div>

            {totalLostPoints > 0 && topEnemies.length > 0 ? (
                <>
                    <div className="space-y-4 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                        {topEnemies.map((item, idx) => {
                            const maxImpact = topEnemies[0]?.weightedMissed || 1;
                            const impactPercent = Math.min(100, Math.max(2, Math.round((item.weightedMissed / maxImpact) * 100)));

                            return (
                                <div key={idx} className="bg-slate-950/40 backdrop-blur-sm p-2.5 pb-3.5 rounded-none border border-white/5 flex flex-col group hover:border-red-500/30 hover:bg-slate-900/60 transition-all duration-300 relative overflow-hidden mb-2 shadow-xl">
                                    {/* Glass Impact Bar */}
                                    <div className="absolute left-0 right-[140px] bottom-0 h-1.5 bg-white/5 overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ease-out ${idx === 0 ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-red-500/40'}`}
                                            style={{ width: `${impactPercent}%` }}
                                        />
                                    </div>

                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex-1 pr-4">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 bg-black/40 px-2.5 py-1 rounded-none border border-white/5">
                                                    {item.category}
                                                </span>
                                                {idx === 0 && (
                                                    <div className="flex items-center gap-1 text-[9px] font-black uppercase text-red-100 bg-red-600 px-2 py-1 rounded-none shadow-lg shadow-red-600/20 animate-pulse">
                                                        <Target size={10} />
                                                        #1 Inimigo
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="font-black text-white text-sm sm:text-base leading-snug group-hover:text-red-50 transition-colors">
                                                {item.topic}
                                            </h4>
                                        </div>

                                        <div className="text-right flex flex-col items-end shrink-0 pl-4 border-l border-white/5">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-xl sm:text-2xl font-black text-red-500 tracking-tighter leading-tight">
                                                    -{Number(item.weightedMissed || 0).toFixed(0)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end mt-1">
                                                 <span className="text-[8px] sm:text-[9px] text-red-400/60 font-black uppercase tracking-[0.2em]">
                                                     Déficit
                                                 </span>
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-none">
                                                    <span className="text-[10px] sm:text-xs text-slate-400 font-mono font-bold">
                                                        Acerto: <span className={item.percentage < 50 ? 'text-red-400' : 'text-emerald-400'}>{item.percentage}%</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* PREMIUM PARETO INSIGHT CARD - Persistent Footer Framing */}
                    <div className="relative mt-4 pt-5 border-t border-white/10 overflow-hidden rounded-none border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-slate-900/40 to-slate-900/60 p-4 shadow-2xl group transition-all duration-500">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <Target size={50} className="text-rose-400" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-none bg-rose-500/20 border border-rose-500/20 flex items-center justify-center">
                                    <Zap size={12} className="text-rose-400" />
                                </div>
                                <span className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em]">Oportunidade de Ouro</span>
                            </div>

                            <h4 className="text-sm font-black text-white leading-snug mb-1">
                                Recupere <span className="text-rose-500 text-lg">{Math.round((topEnemies.reduce((a, b) => a + (b.weightedMissed || 0), 0) / (totalLostPoints || 1)) * 100)}%</span> dos seus pontos perdidos.
                            </h4>
                            
                            <p className="text-slate-400 text-[10px] leading-relaxed">
                                Dominando estes <span className="text-white font-bold">{topEnemies.length} tópicos</span> críticos, você elimina a maior parte do seu déficit e acelera sua aprovação.
                            </p>

                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-slate-500">
                                <span>Impacto: Estratégico</span>
                                <span className="text-rose-400 font-black">Foco Imediato</span>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center px-4">
                    <CheckCircle2 size={48} className="text-emerald-500/40 mb-4" />
                    <p className="text-sm font-medium text-emerald-400/80 mb-1">Excelente desempenho!</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
                        Você não tem pontos cegos críticos mapeados neste período. Continue assim!
                    </p>
                </div>
            )}
        </div>
    );
}
