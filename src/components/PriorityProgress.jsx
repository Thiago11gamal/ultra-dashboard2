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
    const totalCompletedGlobally = priorities.reduce((acc, p) => acc + stats[p].completed, 0);
    if (totalTasksGlobally === 0) return null;

    const globalPct = totalTasksGlobally > 0 ? Math.round((totalCompletedGlobally / totalTasksGlobally) * 100) : 0;

    return (
        <div className="space-y-4">
            {/* Barra de Progresso Global Maior */}
            <div className="p-6 sm:p-7 rounded-2xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-xl transition-all duration-500 group shadow-lg relative overflow-hidden mx-1">
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] opacity-30 transition-all duration-700 group-hover:bg-purple-400/30" />
                </div>

                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-4 px-1">
                        <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 leading-none block mb-1">
                                Progresso Global
                            </span>
                            <h3 className="text-xl font-bold text-white leading-tight">Conclusão de Assuntos</h3>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                            <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{globalPct}%</span>
                            <p className="text-[10px] sm:text-xs text-slate-400 font-bold sm:mt-1">
                                {totalCompletedGlobally} de {totalTasksGlobally} concluídos
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-5 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-inner p-[2px]">
                        {globalPct > 0 ? (
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(168,85,247,0.5)] relative overflow-hidden"
                                style={{ width: `${globalPct}%` }}
                            >
                                {/* Animação de brilho interno */}
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                            </div>
                        ) : (
                            <div className="h-full w-2 rounded-full bg-white/10" />
                        )}
                    </div>
                </div>
            </div>

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
                                <div className="flex justify-between items-center px-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${conf.text} leading-none pt-1`}>
                                        Prioridade {conf.label}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors tracking-wide">
                                        {completed}/{total}
                                    </span>
                                </div>

                                <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-inner relative mt-1">
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

                                <div className="flex justify-end pr-1 mt-1">
                                    <span className={`text-xs font-black ${conf.text} drop-shadow-md leading-none pt-1`}>
                                        {pct}% completado
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

