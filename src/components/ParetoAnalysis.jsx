import React, { useMemo } from 'react';
import { Target, CheckCircle2, Zap } from 'lucide-react';
import { getSafeScore, getSyntheticTotal, resolveEffectiveCorrect } from '../utils/scoreHelper';
import { normalizeDate, toDateMs } from '../utils/dateHelper';
import { normalize } from '../utils/normalization';

const hasValidNum = (v) =>
    v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));

// Pareto Analysis Component - Patched Version (Logic + UI)
export default function ParetoAnalysis({ categories = [], maxScore: globalMaxScore = 100, minScore: globalMinScore = 0 }) {
    // FIX P-02: Normalizar categories de objeto Firebase para array.
    const safeCategories = useMemo(() => {
        const raw = Array.isArray(categories) ? categories : Object.values(categories || {});
        return raw.filter(Boolean);
    }, [categories]);

    // Calculate Pareto Data
    const { topEnemies, totalLostPoints, recoveryPercent } = useMemo(() => {
        let allTopics = [];

        if (safeCategories.length === 0) return { topEnemies: [], totalLostPoints: 0, hiddenOpportunities: 0, recoveryPercent: 0 };

        safeCategories.forEach(cat => {
            if (cat.simuladoStats && cat.simuladoStats.history) {
                // Determine weight for this category (respect explicit weight === 0 / P0)
                const rawCatWeight = hasValidNum(cat.weight)
                    ? Number(cat.weight)
                    : (hasValidNum(cat.rawWeight) ? Number(cat.rawWeight) : 1.0);
                const catWeight = Math.max(0, rawCatWeight);
                if (catWeight <= 0) return;
                // FIX P-03: Usar maxScore e minScore da categoria com fallback global.
                const catMaxScore = (hasValidNum(cat.maxScore) && Number(cat.maxScore) > 0)
                    ? Number(cat.maxScore)
                    : (hasValidNum(globalMaxScore) && Number(globalMaxScore) > 0 ? Number(globalMaxScore) : 100);
                const catMinScore = hasValidNum(cat.minScore)
                    ? Math.min(Number(cat.minScore), catMaxScore)
                    : (hasValidNum(globalMinScore) ? Math.min(Number(globalMinScore), catMaxScore) : 0);

                // Flatten & sort history chronologically for recency weighting
                const rawHistory = Array.isArray(cat.simuladoStats.history) ? cat.simuladoStats.history : Object.values(cat.simuladoStats.history);
                const hArray = rawHistory
                    .filter(h => h && h.valid !== false && h.validated !== false)
                    .map((h, idx) => ({
                        entry: h,
                        ts: toDateMs(normalizeDate(h.date || h.createdAt)) || 0,
                        idx
                    }))
                    .sort((a, b) => (a.ts - b.ts) || (a.idx - b.idx))
                    .map(x => x.entry);

                hArray.forEach((h, hIdx, hArr) => {
                    // RECENCY BIAS: Recent errors matter more than old ones
                    const recencyFactor = Math.pow(1.05, hIdx - (hArr.length - 1));
                    
                    // FIX P-05: h.topics pode ser objeto Firebase, não array.
                    const topics = Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {});
                    topics.forEach(t => {
                        if (!t) return;
                        
                        // FIX P-06: Usar getSafeScore com minScore da categoria e alias scorePct.
                        const normalizedTopic = (t.score == null && t.scorePct != null)
                            ? { ...t, score: t.scorePct, isPercentage: true }
                            : t;
                        const score = getSafeScore(normalizedTopic, catMaxScore, catMinScore);
                        if (!Number.isFinite(score)) return;

                        // FIX P-07: Suportar aliases de contagem e fallback score/scorePct.
                        let total = Math.max(0, parseInt(t.total ?? t.questoes ?? t.totalQuestoes ?? t.questions, 10) || 0);
                        const isSynthetic = total === 0 && (t.score != null || t.scorePct != null || t.scorePoints != null);
                        if (isSynthetic) {
                            total = getSyntheticTotal(catMaxScore);
                        }
                        if (total === 0) return;

                        // FIX P-08: Respeitar acertos explícitos + penalidade CEBRASPE/TRI.
                        const explicitCorrect = t.correct ?? t.acertos ?? t.correctCount;
                        const correctCount = isSynthetic
                            ? Math.max(0, Math.min(total, ((score - catMinScore) / Math.max(1e-9, catMaxScore - catMinScore)) * total))
                            : resolveEffectiveCorrect(
                                normalizedTopic,
                                score,
                                total,
                                hasValidNum(explicitCorrect),
                                Number(explicitCorrect),
                                catMaxScore,
                                catMinScore
                            );
                        const missed = Math.max(0, total - correctCount);

                        allTopics.push({
                            category: cat.name,
                            topic: (typeof t.name === 'string' && t.name.trim() !== '') ? t.name.trim() : 'Sem Nome',
                            total,
                            correct: correctCount,
                            missed,
                            catWeight,
                            recencyFactor,
                            percentage: Math.round((correctCount / total) * 100)
                        });
                    });
                });
            }
        });

        const topicMap = {};
        allTopics.forEach(t => {
            const key = `${normalize(t.category)}::${normalize(t.topic)}`;
            if (!topicMap[key]) {
                topicMap[key] = {
                    ...t,
                    weightedMissedQ: t.missed * t.recencyFactor,
                    weightedTotalQ: t.total * t.recencyFactor,
                    count: 1
                };
            } else {
                topicMap[key].total += t.total;
                topicMap[key].correct += t.correct;
                topicMap[key].missed += t.missed;
                topicMap[key].weightedMissedQ += t.missed * t.recencyFactor;
                topicMap[key].weightedTotalQ += t.total * t.recencyFactor;
                topicMap[key].count += 1;
                
                // FIX P-09: Proteger contra divisão por zero.
                const safeTotal = Math.max(1, topicMap[key].total);
                topicMap[key].percentage = Math.round((topicMap[key].correct / safeTotal) * 100);
            }
        });

        const groupedTopics = Object.values(topicMap);
        
        // Calculate Weighted Missed Points (Impact): recency-weighted error rate × subject weight × log-volume of recent misses
        // Monotonically decreases when a new 100% attempt is recorded (fixes inverted recency penalty).
        groupedTopics.forEach(t => {
            const safeWeightedTotal = Math.max(1e-6, t.weightedTotalQ);
            const recencyErrorRate = Math.max(0, Math.min(1, t.weightedMissedQ / safeWeightedTotal));
            const missVolumeScale = t.weightedMissedQ > 0 ? Math.max(1, Math.log2(1 + t.weightedMissedQ)) : 0;
            t.weightedMissed = recencyErrorRate * t.catWeight * 10 * missVolumeScale;
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

        const calculatedRecoveryPercent = totalMissedGlobal > 0
            ? Math.round((cumulative / totalMissedGlobal) * 100)
            : 0;

        return {
            topEnemies: enemies,
            totalLostPoints: totalMissedGlobal,
            hiddenOpportunities: others.length,
            recoveryPercent: calculatedRecoveryPercent
        };

    }, [safeCategories, globalMaxScore, globalMinScore]);

    return (
        <div className="glass p-6 h-full flex flex-col border-l border-white/5 bg-gradient-to-br from-slate-900/50 to-red-900/10">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-500/20 rounded-xl">
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
                                <div key={`${item.category}-${item.topic}`} className="bg-slate-950/40 backdrop-blur-sm p-2.5 pb-3.5 rounded-xl border border-white/5 flex flex-col group hover:border-red-500/30 hover:bg-slate-900/60 transition-all duration-300 relative overflow-hidden mb-2 shadow-xl">
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
                                Recupere <span className="text-rose-500 text-lg">{recoveryPercent}%</span> dos seus pontos perdidos.
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

