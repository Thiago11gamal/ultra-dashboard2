
import React, { useMemo } from 'react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { Medal } from 'lucide-react';


const VolumeRanking = ({ categories = [] }) => {
    // Calculate volume stats and sort - Memoized for performance
    const sorted = useMemo(() => {
        const stats = categories.map(cat => {
            const simStats = cat.simuladoStats || { history: [] };
            const history = simStats.history || [];
            const total = history.reduce((acc, h) => acc + h.total, 0);
            return { ...cat, totalVolume: total };
        });

        // Sort by volume descending, then by name ascending for stability
        return stats.sort((a, b) => {
            if (b.totalVolume !== a.totalVolume) {
                return b.totalVolume - a.totalVolume;
            }
            return a.name.localeCompare(b.name);
        });
    }, [categories]);

    const maxVolume = sorted[0]?.totalVolume || 1;

    // Helper for medals
    const getRankIcon = (index) => {
        if (index === 0) return <Medal size={24} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] fill-yellow-400/20" />;
        if (index === 1) return <Medal size={24} className="text-slate-300 drop-shadow-[0_0_5px_rgba(203,213,225,0.5)] fill-slate-300/20" />;
        if (index === 2) return <Medal size={24} className="text-orange-400 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)] fill-orange-400/20" />;
        return <span className="text-slate-500 font-mono text-xs w-6 text-center font-bold">#{index + 1}</span>;
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariant = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    };

    return (
        <div className="glass p-0 rounded-2xl h-full flex flex-col bg-slate-900/80 border border-white/10 overflow-hidden">
            <div className="p-6 pb-2">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-1 text-slate-200">
                    📊 Volume de Questões
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Quem mais produziu</p>
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar"
            >
                {sorted.map((item, index) => {
                    const volume = item.totalVolume;
                    const percentage = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;
                    const isTop3 = index < 3;

                    return (
                        <motion.div
                            key={item.id}
                            variants={itemVariant}
                            className={`group flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-white/5 ${isTop3 ? 'bg-white/[0.02] border border-white/5' : ''}`}
                        >
                            {/* Rank */}
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isTop3 ? 'bg-black/20' : ''}`}>
                                {getRankIcon(index)}
                            </div>

                            {/* Icon & Name */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-sm font-medium truncate ${isTop3 ? 'text-slate-200' : 'text-slate-500'}`}>
                                        {item.name}
                                    </span>
                                    <span className={`text-xs font-bold font-mono ${isTop3 ? 'text-purple-300' : 'text-slate-600'}`}>
                                        {volume}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-slate-800/50 h-1 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(percentage, 2)}%` }}
                                        transition={{ duration: 1, delay: 0.2 }}
                                        className={`h-full rounded-full ${index === 0 ? 'bg-yellow-500/80' :
                                            index === 1 ? 'bg-slate-400/80' :
                                                index === 2 ? 'bg-orange-500/80' :
                                                    'bg-slate-700'
                                            }`}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {sorted.length === 0 && (
                    <div className="text-center text-slate-600 py-10">
                        <span className="text-2xl block mb-2 opacity-30">💤</span>
                        <span className="text-xs">Sem dados</span>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default React.memo(VolumeRanking);
