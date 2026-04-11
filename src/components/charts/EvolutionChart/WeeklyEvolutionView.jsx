import React, { useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { getSafeScore } from "../../../utils/scoreHelper";

export const WeeklyEvolutionView = ({ categories, showOnlyFocus, focusSubjectId, maxScore = 100, unit = '%' }) => {
    
    const data = useMemo(() => {
        const filteredCats = showOnlyFocus ? categories.filter(c => c.id === focusSubjectId) : categories;

        return filteredCats.map(cat => {
            const history = cat.simuladoStats?.history || [];
            const weeksMap = {};

            history.forEach(h => {
                if (!h.date) return;
                const d = new Date(h.date);
                if (isNaN(d.getTime())) return;

                // Encontrar a segunda-feira da semana
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(d);
                monday.setDate(diff);
                monday.setHours(0, 0, 0, 0);
                
                const weekKey = monday.toISOString().split('T')[0];

                if (!weeksMap[weekKey]) {
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    weeksMap[weekKey] = {
                        weekKey,
                        monday,
                        sunday,
                        correct: 0,
                        total: 0,
                        count: 0
                    };
                }

                const w = weeksMap[weekKey];
                const totalQ = Number(h.total) || 0;
                const score = getSafeScore(h, maxScore);
                
                w.total += totalQ;
                w.correct += (score / maxScore) * totalQ;
                w.count += 1;
            });

            // Ordenar cronologicamente para calcular a evolução
            const weeksArray = Object.values(weeksMap).sort((a, b) => a.monday - b.monday);

            // Calcular percentuais e o Delta (Evolução/Regressão)
            weeksArray.forEach((w, i) => {
                w.percentage = w.total > 0 ? (w.correct / w.total) * maxScore : 0;
                if (i > 0) {
                    const prev = weeksArray[i - 1];
                    w.delta = w.percentage - prev.percentage;
                } else {
                    w.delta = null; // Primeira semana não tem base de comparação
                }
            });

            // Inverter para mostrar a semana mais recente primeiro
            return {
                ...cat,
                weeks: weeksArray.reverse()
            };
        }).filter(cat => cat.weeks.length > 0);
    }, [categories, showOnlyFocus, focusSubjectId, maxScore]);

    const formatDate = (date) => {
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('. de', '');
    };

    if (data.length === 0) {
        return (
            <div className="h-[340px] flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/30">
                <Calendar size={48} className="text-slate-600 mb-2" />
                <p className="text-slate-300 font-bold text-base">Sem dados semanais</p>
                <p className="text-slate-500 text-sm">Registre simulados para ver sua evolução.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {data.map((cat) => (
                <div key={cat.id} className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                    <div className="bg-slate-800/60 px-4 py-3 flex items-center gap-3 border-b border-slate-700/50">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        <h3 className="font-bold text-slate-200">{cat.name}</h3>
                    </div>
                    
                    <div className="p-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {cat.weeks.map((week, idx) => (
                            <div key={week.weekKey} className="flex flex-col bg-slate-950/50 border border-slate-800/80 rounded-lg p-3 relative group hover:border-slate-700 transition-colors">
                                
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <Calendar size={12} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">
                                            {formatDate(week.monday)} a {formatDate(week.sunday)}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                                        {week.total} qs
                                    </span>
                                </div>

                                <div className="flex items-end justify-between mt-auto">
                                    <div>
                                        <p className="text-2xl font-black text-white">
                                            {week.percentage.toFixed(1)}<span className="text-sm text-slate-500 font-normal ml-0.5">{unit}</span>
                                        </p>
                                    </div>
                                    
                                    {week.delta !== null ? (
                                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${
                                            week.delta > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                            week.delta < 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                                            'bg-slate-800 text-slate-400'
                                        }`}>
                                            {week.delta > 0 ? <TrendingUp size={12} /> : week.delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                                            {week.delta > 0 ? '+' : ''}{week.delta.toFixed(1)}{unit}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-1 bg-slate-800/50 rounded-md">
                                            Base
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
