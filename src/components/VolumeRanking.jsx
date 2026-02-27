import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Medal, Hash, BarChart3, TrendingUp, Target } from 'lucide-react';

const VolumeRanking = ({ categories = [] }) => {
    const sorted = useMemo(() => {
        const stats = categories.map(cat => {
            const simStats = cat.simuladoStats || { history: [] };
            const history = simStats.history || [];
            const total = history.reduce((acc, h) => acc + (parseInt(h.total) || 0), 0);
            return { ...cat, totalVolume: total };
        });

        return stats.slice().sort((a, b) => {
            if (b.totalVolume !== a.totalVolume) {
                return b.totalVolume - a.totalVolume;
            }
            return a.name.localeCompare(b.name);
        });
    }, [categories]);

    const maxVolume = sorted[0]?.totalVolume || 1;
    const totalVolumeOverall = useMemo(() => sorted.reduce((acc, curr) => acc + curr.totalVolume, 0), [sorted]);
    const leaderPercentage = totalVolumeOverall > 0 ? ((sorted[0]?.totalVolume || 0) / totalVolumeOverall) * 100 : 0;

    const getRankStyles = (index) => {
        if (index === 0) return { icon: <Medal size={20} className="text-yellow-400 fill-yellow-400/20" />, color: 'text-yellow-400', barCol: 'bg-yellow-500', glow: 'shadow-yellow-500/20' };
        if (index === 1) return { icon: <Medal size={20} className="text-slate-300 fill-slate-300/20" />, color: 'text-slate-300', barCol: 'bg-slate-400', glow: 'shadow-slate-400/20' };
        if (index === 2) return { icon: <Medal size={20} className="text-amber-600 fill-amber-600/20" />, color: 'text-amber-600', barCol: 'bg-amber-600', glow: 'shadow-amber-600/20' };
        return { icon: <span className="text-[10px] font-black text-slate-600 font-mono">#{index + 1}</span>, color: 'text-slate-500', barCol: 'bg-slate-700', glow: 'shadow-transparent' };
    };

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariant = {
        hidden: { opacity: 0, x: 20 },
        show: { opacity: 1, x: 0 }
    };

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl h-full flex flex-col overflow-hidden shadow-2xl">
            {/* Header Section */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <BarChart3 size={14} className="text-purple-500" />
                        Volume de Treino
                    </h3>
                    <div className="px-2 py-1 bg-purple-500/10 rounded-md border border-purple-500/20">
                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">{totalVolumeOverall} Total</span>
                    </div>
                </div>

                {sorted.length > 0 && totalVolumeOverall > 0 ? (
                    <div className="bg-black/30 rounded-xl p-3 border border-white/[0.03]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                <TrendingUp size={16} className="text-yellow-400" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight truncate">
                                    Líder de Produção
                                </span>
                                <span className="text-xs font-black text-white truncate">
                                    {sorted[0].name} <span className="text-yellow-500 ml-1">({Math.round(leaderPercentage)}%)</span>
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
                    const styles = getRankStyles(index);
                    const percentage = maxVolume > 0 ? (item.totalVolume / maxVolume) * 100 : 0;

                    return (
                        <motion.div
                            key={item.id}
                            variants={itemVariant}
                            className={`group flex items-center gap-4 p-3 rounded-xl transition-all duration-300 hover:bg-white/[0.03] ${index < 3 ? 'bg-white/[0.02]' : ''}`}
                        >
                            {/* Rank Icon */}
                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-black/40 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                                {styles.icon}
                            </div>

                            {/* Info & Bar */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[11px] font-bold truncate tracking-tight uppercase ${index < 3 ? 'text-slate-200' : 'text-slate-500'}`} style={index < 3 ? {} : { color: item.color }}>
                                        {item.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded-full border border-white/5">
                                        <Hash size={10} className="text-slate-600" />
                                        <span className={`text-[10px] font-black font-mono ${styles.color}`}>
                                            {item.totalVolume}
                                        </span>
                                    </div>
                                </div>

                                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden shadow-inner border border-white/[0.02]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(percentage, 3)}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className={`h-full rounded-full transition-all duration-1000 ${styles.barCol} shadow-[0_0_15px_rgba(0,0,0,0.5)] ${styles.glow}`}
                                    />
                                </div>
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

