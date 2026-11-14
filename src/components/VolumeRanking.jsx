import React, { useMemo } from 'react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { TrendingUp, Target, BarChart3, Hash, Medal, Info } from 'lucide-react';
import { formatValue } from '../utils/scoreHelper';
import { computeCategoryPerformanceStats, toSafeArray } from '../utils/tasksStatsHelper';

    const VolumeRanking = ({ categories = [], maxScore = 100, minScore = 0 }) => {
        const safeCategories = useMemo(() => {
            return toSafeArray(categories);
        }, [categories]);

        const sorted = useMemo(() => {
                    const stats = safeCategories.map(cat =>
                        computeCategoryPerformanceStats(cat, maxScore, minScore)
                    );

            return stats.slice().sort((a, b) => {
                if (b.totalVolume !== a.totalVolume) {
                    return b.totalVolume - a.totalVolume;
                }
                if (b.percentCorrect !== a.percentCorrect) {
                    return b.percentCorrect - a.percentCorrect;
                }
                return (a.name || '').localeCompare(b.name || '');
            });
    }, [safeCategories, maxScore, minScore]);

    const totalVolumeOverall = useMemo(
        () => sorted.reduce((acc, curr) => acc + curr.totalVolume, 0),
        [sorted]
    );
    const leaderPercentage = totalVolumeOverall > 0
        ? Math.min(100, Math.max(0, ((sorted[0]?.totalVolume || 0) / totalVolumeOverall) * 100))
        : 0;

        const getRankStyles = (index, hasVolume = true) => {
            if (!hasVolume) {
                return {
                    icon: <span className="text-[10px] font-black text-slate-600 font-mono">#{index + 1}</span>,
                    color: 'text-slate-500',
                    barCol: 'bg-slate-700',
                    glow: 'shadow-transparent'
                };
            }
            if (index === 0) return { icon: <Medal size={20} className="text-purple-400 fill-purple-400/20" />, color: 'text-purple-400', barCol: 'bg-purple-500', glow: 'shadow-purple-500/30' };
            if (index === 1) return { icon: <Medal size={20} className="text-slate-300 fill-slate-300/20" />, color: 'text-slate-300', barCol: 'bg-slate-400', glow: 'shadow-slate-400/20' };
            if (index === 2) return { icon: <Medal size={20} className="text-amber-600 fill-amber-600/20" />, color: 'text-amber-600', barCol: 'bg-amber-600', glow: 'shadow-amber-600/20' };
            return { icon: <span className="text-[10px] font-black text-slate-600 font-mono">#{index + 1}</span>, color: 'text-slate-500', barCol: 'bg-slate-700', glow: 'shadow-transparent' };
        };

        const container = {
            hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
        };

        const itemVariant = {
            hidden: { opacity: 0, x: 20 },
            show: { opacity: 1, x: 0 }
        };

        if (safeCategories.length === 0) {
            return (
                <div className="flex items-center justify-center p-12 text-slate-500 h-full border border-white/5 rounded-2xl bg-slate-900/40">
                    Nenhuma disciplina cadastrada ainda.
                </div>
            );
        }

        return (
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl h-full flex flex-col overflow-hidden shadow-2xl">
                {/* Header Section */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                            <BarChart3 size={14} className="text-purple-500" />
                            Volume de Treino
                            <div className="relative group/tooltip cursor-help ml-1 inline-flex">
                                    <Info size={12} className="text-slate-500/50 hover:text-slate-400 transition-colors" />
                                    <div className="absolute top-full left-0 mt-2 w-56 p-3 bg-slate-900/95 backdrop-blur-md text-xs text-slate-300 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-slate-700/80 font-normal tracking-normal normal-case leading-relaxed">
                                        <strong className="text-white">Volume de Treino:</strong> Ranking das matérias baseado no número total de questões resolvidas e atividades concluídas.
                                    </div>
                                </div>
                        </h3>
                        <div className="px-2 py-1 bg-purple-500/10 rounded-md border border-purple-500/20">
                            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">{totalVolumeOverall} Total</span>
                        </div>
                    </div>

                    {sorted.length > 0 && totalVolumeOverall > 0 ? (
                        <div className="bg-black/30 rounded-xl p-3 border border-white/[0.03]">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                    <TrendingUp size={16} className="text-purple-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight break-words line-clamp-2">
                                        Líder de Produção
                                    </span>
                                    <span className="text-xs font-black text-white break-words line-clamp-2">
                                        {sorted[0].name} <span className="text-purple-400 ml-1">({formatValue(leaderPercentage)}%)</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 border border-dashed border-white/5 rounded-xl">
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Aguardando dados</span>
                        </div>
                    )}
                </div>

                {/* List Section */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-2 custom-scrollbar"
                >
                    {sorted.map((item, index) => {
                        const hasVolume = item.totalVolume > 0;
                        const isTopThree = index < 3 && hasVolume;
                        const styles = getRankStyles(index, hasVolume);
                        const percentage = totalVolumeOverall > 0
                            ? Math.min(100, Math.max(0, (item.totalVolume / totalVolumeOverall) * 100))
                            : 0;

                        return (
                            <motion.div
                                key={item.id || item.name || index}
                                variants={itemVariant}
                                className={`group flex items-center gap-4 p-3 rounded-xl transition-all duration-300 hover:bg-white/[0.03] ${isTopThree ? 'bg-white/[0.02]' : ''}`}
                            >
                                {/* Rank Icon */}
                                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-black/40 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                                    {styles.icon}
                                </div>

                                {/* Info & Bar */}
                                <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-2 gap-2">
                                                <span
                                                    className={`text-[11px] font-bold break-words line-clamp-2 tracking-tight uppercase ${isTopThree ? 'text-slate-200' : 'text-slate-400'}`}
                                                    style={isTopThree ? {} : (item.color ? { color: item.color } : {})}
                                                    title={item.name}
                                                >
                                                    {item.name}
                                                </span>
                                                <div className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded-full border border-white/5 flex-shrink-0">
                                                    <Hash size={10} className="text-slate-600" />
                                                    <span className={`text-[10px] font-black font-mono ${styles.color}`}>
                                                        {item.totalVolume}
                                                    </span>
                                                    <span className={`text-[9px] font-bold ${styles.color} opacity-70 ml-1`}>
                                                        {hasVolume ? `${formatValue(percentage)}%` : '0%'}
                                                    </span>
                                                </div>
                                            </div>

                                                {
                                                    hasVolume?(
                                    <div className = "h-1.5 w-full bg-black/40 rounded-full overflow-hidden shadow-inner border border-white/[0.02]" >
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${percentage}%` }}
                                                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                                                className={`h-full rounded-full ${styles.barCol} shadow-[0_0_15px_rgba(0,0,0,0.5)] ${styles.glow}`}
                                                            />
                                    </div>
                                    ) : (
                                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden opacity-50" />
                                )}
                                </div>
                            </motion.div>
                        );
                    })}

                    {sorted.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center opacity-20">
                            <Target size={32} />
                            <span className="text-[8px] font-black uppercase tracking-widest mt-2">No Data</span>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    };

    export default React.memo(VolumeRanking);
