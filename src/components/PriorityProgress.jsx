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

    // Se nÃ£o tiver nenhuma tarefa em todo o app, podemos nÃ£o mostrar ou mostrar zerado
    const totalTasksGlobally = priorities.reduce((acc, p) => acc + stats[p].total, 0);
    if (totalTasksGlobally === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {priorities.map(p => {
                const { total, completed } = stats[p];
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                const conf = priorityColors[p];

                return (
                    <div key={p} className={`p-4 rounded-xl border ${conf.border} ${conf.bg} backdrop-blur-sm flex flex-col justify-center gap-2 group hover:bg-white/5 transition-all`}>
                        <div className="flex justify-between items-center px-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${conf.text}`}>
                                Prioridade {conf.label}
                            </span>
                            <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                                {completed}/{total}
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
                            <div
                                className={`h-full rounded-full ${conf.bar} transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.2)]`}
                                style={{
                                    width: `${pct}%`,
                                    boxShadow: p === 'high' ? '0 0 15px rgba(239, 68, 68, 0.4)' :
                                        p === 'medium' ? '0 0 15px rgba(234, 179, 8, 0.4)' :
                                            '0 0 15px rgba(34, 197, 94, 0.4)'
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
