import React, { useMemo } from 'react';
import { Info, CheckCircle2, CircleDashed, Flame, Zap, Shield } from 'lucide-react';
import { toArray } from '../utils/normalize';

const priorityColors = {
    high: {
        label: 'Alta',
        bar: 'bg-gradient-to-r from-rose-600 to-rose-400',
        bg: 'bg-rose-500/5 hover:bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/25 hover:border-rose-500/40',
        glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]',
        icon: Flame,
        pillBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
    },
    medium: {
        label: 'Média',
        bar: 'bg-gradient-to-r from-amber-600 to-amber-400',
        bg: 'bg-amber-500/5 hover:bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/25 hover:border-amber-500/40',
        glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
        icon: Zap,
        pillBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
    },
    low: {
        label: 'Baixa',
        bar: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
        bg: 'bg-emerald-500/5 hover:bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/25 hover:border-emerald-500/40',
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
        icon: Shield,
        pillBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
    },
};

export default function PriorityProgress({ categories = [] }) {
    const stats = useMemo(() => {
        const counts = {
            high: { total: 0, completed: 0 },
            medium: { total: 0, completed: 0 },
            low: { total: 0, completed: 0 }
        };

        toArray(categories).forEach(cat => {
            toArray(cat?.tasks).forEach(task => {
                const rawPriority = String(task?.priority || 'medium').toLowerCase();
                const priorityKey = counts[rawPriority] ? rawPriority : 'medium';

                counts[priorityKey].total += 1;

                if (task?.completed) {
                    counts[priorityKey].completed += 1;
                }
            });
        });

        return counts;
    }, [categories]);

    const priorities = ['high', 'medium', 'low'];

    const totalTasksGlobally = priorities.reduce((acc, p) => acc + stats[p].total, 0);
    const totalCompletedGlobally = priorities.reduce((acc, p) => acc + stats[p].completed, 0);
    const pendingTasksGlobally = Math.max(0, totalTasksGlobally - totalCompletedGlobally);

    if (totalTasksGlobally === 0) return null;

    const globalPct = totalTasksGlobally > 0
        ? Math.round((totalCompletedGlobally / totalTasksGlobally) * 100)
        : 0;

    return (
        <div className="space-y-4">
            {/* ── Card Hero de Progresso Global ────────────────────────────── */}
            <div className="p-6 sm:p-7 md:p-8 rounded-3xl border border-purple-500/25 bg-gradient-to-br from-slate-900/95 via-[#101428]/95 to-slate-900/95 backdrop-blur-2xl transition-all duration-500 group shadow-[0_10px_35px_rgba(0,0,0,0.5)] relative overflow-visible">
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/15 rounded-full blur-[90px] transition-all duration-700 group-hover:scale-125 group-hover:bg-purple-500/25" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/15 rounded-full blur-[90px]" />
                </div>

                <div className="relative z-10 flex flex-col gap-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-1">
                        <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-400 leading-none flex items-center mb-2">
                                EXECUÇÃO DO EDITAL

                                <span
                                    className="relative group/tooltip cursor-help ml-2 inline-flex focus-visible:outline-none rounded"
                                    tabIndex={0}
                                >
                                    <Info
                                        size={13}
                                        className="text-purple-400/60 hover:text-purple-300 transition-colors"
                                    />

                                    <span className="absolute top-full left-0 mt-2 w-64 p-3 bg-slate-900/95 text-[11px] text-slate-200 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[70] pointer-events-none border border-white/15 backdrop-blur-xl font-normal leading-relaxed">
                                        <strong className="text-white block mb-1">📊 Progresso Global do Edital:</strong>
                                        Mede a proporção exata de tópicos e tarefas completadas em todas as matérias cadastradas.
                                    </span>
                                </span>
                            </span>

                            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                                Conclusão de Conteúdo
                            </h3>
                        </div>

                        {/* Right stats pill and big percentage */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 drop-shadow-sm">
                                    {globalPct}%
                                </span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    concluído
                                </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1.5">
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                                    <CheckCircle2 size={13} className="text-emerald-400" />
                                    {totalCompletedGlobally} de {totalTasksGlobally} tópicos
                                </span>
                                {pendingTasksGlobally > 0 && (
                                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                                        <CircleDashed size={12} className="text-amber-400" />
                                        {pendingTasksGlobally} {pendingTasksGlobally === 1 ? 'restante' : 'restantes'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div
                        role="progressbar"
                        aria-label="Progresso global de conclusão de assuntos"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={globalPct}
                        className="w-full h-5 sm:h-6 bg-slate-950/70 rounded-full overflow-hidden border border-white/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] p-[3px] relative"
                    >
                        {globalPct > 0 ? (
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 transition-all duration-1000 ease-out shadow-[0_0_25px_rgba(168,85,247,0.6)] relative overflow-hidden"
                                style={{ width: `${globalPct}%` }}
                            >
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
                            </div>
                        ) : (
                            <div className="h-full w-2 rounded-full bg-white/10" />
                        )}
                    </div>
                </div>
            </div>

            {/* ── Cards por Prioridade ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {priorities.map(p => {
                    const { total, completed } = stats[p];
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const conf = priorityColors[p];
                    const IconComponent = conf.icon;

                    return (
                        <div
                            key={p}
                            className={`p-5 sm:p-6 rounded-2xl border transition-all duration-300 group ${conf.border} ${conf.bg} ${conf.glow} backdrop-blur-xl hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden`}
                        >
                            <div className="relative z-10 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${conf.text} leading-none flex items-center gap-1.5`}>
                                        <IconComponent size={14} className={conf.text} />
                                        Prioridade {conf.label}

                                        <span
                                            className="relative group/tooltip cursor-help ml-1 inline-flex focus-visible:outline-none rounded"
                                            tabIndex={0}
                                        >
                                            <Info
                                                size={12}
                                                className={`${conf.text} opacity-60 hover:opacity-100 transition-opacity`}
                                            />

                                            <span className="absolute top-full left-0 mt-2 w-56 p-2.5 bg-slate-900/95 text-[10px] text-slate-200 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[70] pointer-events-none border border-white/15 backdrop-blur-xl font-normal leading-relaxed">
                                                <strong className="text-white block mb-0.5">{conf.label}:</strong>
                                                {p === 'high'
                                                    ? 'Tópicos vitais e mais cobrados da banca.'
                                                    : p === 'medium'
                                                        ? 'Matérias de peso intermediário.'
                                                        : 'Conteúdos complementares e secundários.'}
                                            </span>
                                        </span>
                                    </span>

                                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${conf.pillBg}`}>
                                        {completed}/{total}
                                    </span>
                                </div>

                                {/* Mini Bar */}
                                <div
                                    role="progressbar"
                                    aria-label={`Progresso de tarefas de prioridade ${conf.label.toLowerCase()}`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={pct}
                                    className="w-full h-3.5 bg-slate-950/70 rounded-full overflow-hidden border border-white/10 shadow-inner relative p-[2px]"
                                >
                                    {pct > 0 ? (
                                        <div
                                            className={`h-full rounded-full ${conf.bar} transition-all duration-1000 ease-out`}
                                            style={{
                                                width: `${pct}%`,
                                                boxShadow: p === 'high'
                                                    ? '0 0 15px rgba(244, 63, 94, 0.5)'
                                                    : p === 'medium'
                                                        ? '0 0 15px rgba(245, 158, 11, 0.5)'
                                                        : '0 0 15px rgba(16, 185, 129, 0.5)'
                                            }}
                                        />
                                    ) : (
                                        <div className="absolute left-0 top-0 h-full w-1 rounded-full bg-white/10" />
                                    )}
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        {total - completed} {(total - completed) === 1 ? 'pendente' : 'pendentes'}
                                    </span>
                                    <span className={`font-black ${conf.text}`}>
                                        {pct}% concluído
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
