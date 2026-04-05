import React, { useMemo } from 'react';

const priorityColors = {
    high: { label: 'Alta', bar: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    medium: { label: 'Média', bar: 'bg-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    low: { label: 'Baixa', bar: 'bg-green-500', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
};

export default function PriorityProgress({ categories = [] }) {
    const stats = useMemo(() => {
        const counts = {
            high: { total: 0, completed: 0 },
            medium: { total: 0, completed: 0 },
            low: { total: 0, completed: 0 }
        };

        categories.forEach(cat => {
            (cat.tasks || []).forEach(task => {
                const p = (task.priority || 'medium').toLowerCase();
                if (counts[p]) {
                    counts[p].total++;
                    if (task.completed) counts[p].completed++;
                }
            });
        });

        return counts;
    }, [categories]);

    const priorities = ['high', 'medium', 'low'];

    // Se não tiver nenhuma tarefa em todo o app, podemos não mostrar ou mostrar zerado
    const totalTasksGlobally = priorities.reduce((acc, p) => acc + stats[p].total, 0);
    if (totalTasksGlobally === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {priorities.map(p => {
                const { total, completed } = stats[p];
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                const conf = priorityColors[p];

                return (
                    <div key={p} className={`p-6 rounded-2xl border transition-all duration-500 group shadow-lg relative ${conf.border} ${conf.bg} backdrop-blur-xl hover:bg-white/[0.07] hover:shadow-2xl hover:-translate-y-1`}>
                        {/* Mesh Accent - Clipped separately to avoid cutting text */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                            <div className={`absolute -top-12 -left-12 w-32 h-32 rounded-full blur-[50px] opacity-20 transition-all duration-700 group-hover:opacity-40 ${p === 'high' ? 'bg-rose-500' : p === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        </div>

                        <div className="relative z-10 flex flex-col gap-5">
                            <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${conf.text} leading-none pt-1`}>
                                    Prioridade {conf.label}
                                </span>
                                <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                                    {completed}/{total}
                                </span>
                            </div>
                            
                            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-inner relative">
                                {pct > 0 ? (
                                    <div
                                        className={`h-full rounded-full ${conf.bar} transition-all duration-1000 ease-out`}
                                        style={{
                                            width: `${pct}%`,
                                            boxShadow: p === 'high' ? '0 0 15px rgba(239, 68, 68, 0.4)' :
                                                p === 'medium' ? '0 0 15px rgba(234, 179, 8, 0.4)' :
                                                    '0 0 15px rgba(34, 197, 94, 0.4)'
                                        }}
                                    />
                                ) : (
                                    /* Visual feedback when 0%: show a subtle dot at the start */
                                    <div className="absolute left-0 top-0 h-full w-1 rounded-full bg-white/10" />
                                )}
                            </div>
                            
                            <div className="flex justify-end pr-1">
                                <span className={`text-[11px] font-black ${conf.text} drop-shadow-[0_0_8px_rgba(0,0,0,0.5)] leading-none pb-0.5`}>
                                    {pct}% completado
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
