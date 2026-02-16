import React, { useState, useMemo } from 'react';

import { BarChart2, Filter, ChevronDown, Trophy, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars

export default function TopicPerformance({ categories = [] }) {
    const [selectedCategoryId, setSelectedCategoryId] = useState(categories.length > 0 ? categories[0].id : '');

    // Aggregate Data Logic
    const aggregatedData = useMemo(() => {
        if (!selectedCategoryId) return [];

        const category = categories.find(c => c.id === selectedCategoryId);
        if (!category) return [];

        const stats = category.simuladoStats || { history: [] };
        const history = stats.history || [];
        const topicMap = {};

        // Loop through all history entries
        history.forEach(entry => {
            const topics = entry.topics || [];
            topics.forEach(t => {
                const name = (t.name || "Sem Nome").trim(); // Simple normalization
                if (!topicMap[name]) {
                    topicMap[name] = { total: 0, correct: 0 };
                }
                topicMap[name].total += (parseInt(t.total) || 0);
                topicMap[name].correct += (parseInt(t.correct) || 0);
            });
        });

        // Convert to array and calculate stats
        const topicList = Object.entries(topicMap).map(([name, data]) => {
            const percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
            const missed = data.total - data.correct;
            const balance = data.correct - missed;
            return {
                name,
                total: data.total,
                correct: data.correct,
                percentage,
                balance
            };
        });

        // Sort: Highest Percentage Top (Descending)
        return topicList.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

    }, [categories, selectedCategoryId]);

    // Update selected if categories change and current selection is invalid
    React.useEffect(() => {
        if (categories.length > 0 && !categories.find(c => c.id === selectedCategoryId)) {
            setSelectedCategoryId(categories[0].id);
        }
    }, [categories, selectedCategoryId]);

    return (
        <div className="glass p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <BarChart2 size={20} className="text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold">Rendimento por Assunto</h3>
                </div>

                {/* Filter / Selector - Premium Style */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                    <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="relative appearance-none bg-slate-900/90 border-2 border-white/20 rounded-xl px-5 py-3 pr-12 text-sm font-semibold text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer min-w-[220px] shadow-lg shadow-black/20 hover:border-white/40 hover:bg-slate-800/90"
                        style={{
                            backgroundImage: 'linear-gradient(135deg, rgba(30,30,50,0.95) 0%, rgba(20,20,40,0.95) 100%)'
                        }}
                    >
                        {categories.map(cat => (
                            <option
                                key={cat.id}
                                value={cat.id}
                                className="bg-slate-900 text-white py-3 font-medium"
                                style={{ backgroundColor: '#1a1a2e', color: '#fff', padding: '12px' }}
                            >
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
                        <div className="w-px h-5 bg-white/20" />
                        <ChevronDown size={16} className="text-blue-400" />
                    </div>
                </div>
            </div>

            {/* Content List */}
            <motion.div
                key={selectedCategoryId} // Helps reset animation on category change
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.1 }
                    }
                }}
                initial="hidden"
                animate="show"
                className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3"
            >
                {aggregatedData.length > 0 ? (
                    aggregatedData.map((topic, index) => {
                        // Badge Logic
                        let badgeColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
                        let icon = <AlertCircle size={12} />;
                        let label = 'Atenção';

                        if (topic.percentage >= 80) {
                            badgeColor = 'text-green-400 bg-green-500/10 border-green-500/20';
                            icon = <Trophy size={12} />;
                            label = 'Dominado';
                        } else if (topic.percentage <= 40) {
                            badgeColor = 'text-red-400 bg-red-500/10 border-red-500/20';
                            icon = <AlertCircle size={12} />;
                            label = 'Crítico';
                        }

                        return (
                            <motion.div
                                key={index}
                                variants={{
                                    hidden: { opacity: 0, y: 10 },
                                    show: { opacity: 1, y: 0 }
                                }}
                                className="bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-medium text-slate-200 truncate max-w-[140px]" title={topic.name}>{topic.name}</span>
                                        {/* Balance Badge */}
                                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${topic.balance > 0 ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                            topic.balance < 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                                'bg-slate-500/10 border-slate-500/20 text-slate-400'
                                            }`}>
                                            Saldo: {topic.balance > 0 ? '+' : ''}{topic.balance}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badgeColor}`}>
                                        {icon} {label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Progress Bar Container */}
                                    <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${topic.percentage}%` }}
                                            transition={{ duration: 0.8, delay: 0.3 }}
                                            className={`h-full rounded-full transition-all duration-500 ${topic.percentage >= 80 ? 'bg-green-500' :
                                                topic.percentage <= 40 ? 'bg-red-500' : 'bg-yellow-500'
                                                }`}
                                        />
                                    </div>

                                    {/* Stats Text */}
                                    <div className="text-right min-w-[80px]">
                                        <div className="text-lg font-bold font-mono leading-none">
                                            {topic.percentage}%
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1">
                                            {topic.correct}/{topic.total} Acertos
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                        <Filter size={48} className="mb-4" />
                        <p>Nenhum dado encontrado para esta disciplina.</p>
                        <p className="text-xs mt-2">Importe um simulado para ver a análise.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
