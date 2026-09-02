import React, { useState, useMemo } from 'react';
import { getSafeScore, formatValue, formatPercent, getSyntheticTotal } from '../utils/scoreHelper';
import { BarChart2, Filter, ChevronDown, Trophy, AlertCircle } from 'lucide-react';

export default function TopicPerformance({ categories = [], maxScore: globalMaxScore = 100 }) {
    // FIX T-01: Normalizar categories e tasks de objeto Firebase para array.
    const safeCategories = useMemo(() => {
        const raw = Array.isArray(categories) ? categories : Object.values(categories || {});
        return raw.filter(Boolean).map(c => ({
            ...c,
            tasks: Array.isArray(c?.tasks) ? c.tasks : Object.values(c?.tasks || {}),
        }));
    }, [categories]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(() => safeCategories[0]?.id || '');

    const effectiveCategoryId = (safeCategories.length > 0 && !safeCategories.find(c => c.id === selectedCategoryId))
        ? safeCategories[0].id
        : selectedCategoryId;

    // Aggregate Data Logic
    const aggregatedData = useMemo(() => {
        if (!effectiveCategoryId) return [];

        const category = safeCategories.find(c => c.id === effectiveCategoryId);
        if (!category) return [];
        
        // FIX T-02: Usar maxScore E minScore da categoria para getSafeScore.
        const catMaxScore = Number(category.maxScore) || globalMaxScore;
        const catMinScore = Number(category.minScore) || 0;
        const scoreUnit = catMaxScore === 100 ? '%' : 'pts';

        const stats = category.simuladoStats || { history: [] };
        const historyRaw = stats.history || [];
        // FIX T-03: Normalizar history de objeto Firebase para array.
        const history = Array.isArray(historyRaw) ? historyRaw : Object.values(historyRaw || {});
        const topicMap = {};

        // Loop through all history entries
        history.forEach(entry => {
            if (!entry) return;
            // FIX T-04: h.topics pode ser objeto Firebase, não array.
            const topics = Array.isArray(entry.topics) ? entry.topics : Object.values(entry.topics || {});
            topics.forEach(t => {
                if (!t) return;
                const rawName = t.name;
                const name = (typeof rawName === 'string' ? rawName : "Sem Nome").trim();
                if (!name) return;

                if (!topicMap[name]) {
                    topicMap[name] = { total: 0, correct: 0 };
                }
                
                // FIX T-05: Usar getSafeScore com minScore da categoria.
                const score = getSafeScore(t, catMaxScore, catMinScore);
                if (!Number.isFinite(score)) return;

                // FIX T-06: Proteger contra total=0 → getSyntheticTotal.
                let total = Math.max(0, parseInt(t.total, 10) || 0);
                if (total === 0 && t.score != null) {
                    total = getSyntheticTotal(catMaxScore);
                }
                if (total === 0) return;

                // FIX T-07: Clamp de correct para nunca exceder total.
                const ratio = (score - catMinScore) / Math.max(1e-9, catMaxScore - catMinScore);
                const correctCount = Math.max(0, Math.min(total, Math.round(ratio * total)));

                topicMap[name].total += total;
                topicMap[name].correct += correctCount;
            });
        });

        // Convert to array and calculate stats
        const topicList = Object.entries(topicMap).map(([name, data]) => {
            // FIX T-08: Proteger contra divisão por zero.
            const safeTotal = Math.max(1, data.total);
            const normalizedPct = Math.round((data.correct / safeTotal) * 100);
            
            // FIX T-09: scoreValue com proteção contra maxScore=0 e considerando minScore.
            const safeCatMaxRange = Math.max(1e-9, catMaxScore - catMinScore);
            const scoreValue = (data.correct / safeTotal) * safeCatMaxRange + catMinScore;
            
            const missed = data.total - data.correct;
            const balance = data.correct - missed;
            
            return {
                name,
                total: data.total,
                correct: data.correct,
                percentage: Math.max(0, Math.min(100, normalizedPct)),
                scoreValue: Number(scoreValue.toFixed(2)),
                scoreUnit,
                balance
            };
        });

        // Sort: Highest Percentage Top (Descending)
        return topicList.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

    }, [safeCategories, effectiveCategoryId, globalMaxScore]);

    return (
        <div className="glass p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-none shrink-0">
                        <BarChart2 size={18} className="text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold leading-relaxed pt-1">Rendimento por Assunto</h3>
                </div>

                {/* Filter / Selector - Premium Style */}
                <div className="relative group w-full sm:w-auto p-1">
                    <div className="absolute inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-none" />
                    <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="relative w-full appearance-none bg-slate-900/90 border-2 border-slate-700/50 rounded-none px-5 py-2.5 pr-12 text-sm font-semibold text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[220px] shadow-lg shadow-black/20 hover:border-slate-500/50 hover:bg-slate-800/90 leading-relaxed"
                        style={{
                            backgroundImage: 'linear-gradient(135deg, rgba(30,30,50,0.95) 0%, rgba(20,20,40,0.95) 100%)'
                        }}
                    >
                        {safeCategories.map(cat => (
                            <option
                                key={cat.id}
                                value={cat.id}
                                className="bg-slate-900 text-white"
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
            <div
                key={effectiveCategoryId}
                className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 space-y-2"
            >
                {aggregatedData.length > 0 ? (
                    aggregatedData.map((topic) => {
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
                                <div
                                    key={topic.name}
                                    className="bg-white/15 border border-white/10 rounded-none p-2 hover:bg-white/25 transition-all duration-300 group animate-in fade-in slide-in-from-bottom-2"
                                >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-bold text-slate-200 truncate sm:max-w-xs" title={topic.name}>{topic.name}</span>
                                        {/* Balance Badge */}
                                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-none border leading-none shrink-0 ${topic.balance > 0 ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                            topic.balance < 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                                'bg-slate-500/10 border-slate-500/20 text-slate-400'
                                            }`}>
                                            Saldo: {topic.balance > 0 ? '+' : ''}{topic.balance}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-none border flex items-center gap-1 leading-snug shrink-0 whitespace-nowrap ${badgeColor}`}>
                                        {icon} {label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Progress Bar Container */}
                                    <div className="flex-1 h-2 bg-black/60 rounded-none overflow-hidden relative shadow-inner">
                                        <div
                                            className={`h-full rounded-none transition-all duration-700 shadow-[0_0_12px_rgba(255,255,255,0.15)] ${topic.percentage >= 80 ? 'bg-green-500 shadow-green-500/30' :
                                                topic.percentage <= 40 ? 'bg-red-500 shadow-red-500/30' : 'bg-yellow-500 shadow-yellow-500/30'
                                                }`}
                                            style={{ width: `${topic.percentage}%` }}
                                        />
                                    </div>

                                    {/* Stats Text */}
                                    <div className="text-right min-w-[80px]">
                                        <div className="text-lg font-bold font-mono leading-tight pb-0.5">
                                            {formatValue(topic.percentage)}%
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 font-semibold">
                                            {topic.scoreUnit === '%' ? formatPercent(topic.scoreValue) : `${formatValue(topic.scoreValue)}${topic.scoreUnit}`}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            {topic.correct}/{topic.total} Acertos
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                        <Filter size={48} className="mb-4" />
                        <p>Nenhum dado encontrado para esta disciplina.</p>
                        <p className="text-xs mt-2">Importe um simulado para ver a análise.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

