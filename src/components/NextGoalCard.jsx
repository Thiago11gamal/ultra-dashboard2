import React, { useMemo } from 'react';
import { Target, Play, Clock, Info } from 'lucide-react';
import { getSuggestedFocus } from '../utils/coachLogic';
import { toArray } from '../utils/normalize';

function NextGoalCard({
    categories = [],
    simulados = [],
    studyLogs = [],
    onStartStudying
}) {
    const suggestion = useMemo(() => {
        const normalizedCategories = toArray(categories).map(category => ({
            ...category,
            tasks: toArray(category?.tasks)
        }));

        const suggestedCategory = getSuggestedFocus(
            normalizedCategories,
            toArray(simulados),
            toArray(studyLogs)
        );

        if (!suggestedCategory) return null;

        const priorityOrder = {
            high: 0,
            medium: 1,
            low: 2
        };

        const sortedTasks = toArray(suggestedCategory.tasks)
            .filter(t => t && !t.completed)
            .slice()
            .sort((a, b) => {
                const pA = String(a?.priority || 'medium').toLowerCase();
                const pB = String(b?.priority || 'medium').toLowerCase();

                return (priorityOrder[pA] ?? 1) - (priorityOrder[pB] ?? 1);
            });

        const nextTask = sortedTasks[0];

        if (!nextTask) return null;

        const fullText = nextTask.title || nextTask.text || 'Estudo';
        const parts = fullText.split(':');
        const hasDetails = parts.length > 1;

        let actionPart = hasDetails
            ? parts.slice(1).join(':').trim()
            : fullText.trim();

        actionPart = actionPart.replace(/^\[(.*?)\]\s*/i, '').trim();

        if (!actionPart) {
            actionPart = fullText.replace(/^\[(.*?)\]\s*/i, '').trim() || 'Estudo';
        }

        const meta = hasDetails
            ? (parts[0]?.trim() || 'Revisão e exercícios')
            : 'Revisão e exercícios';

        return {
            category: suggestedCategory,
            task: nextTask,
            urgency: suggestedCategory.urgency,
            display: {
                assunto: actionPart.length > 80
                    ? `${actionPart.substring(0, 77)}...`
                    : actionPart,
                meta
            }
        };
    }, [categories, simulados, studyLogs]);

    if (!suggestion) {
        return (
            <div
                role="status"
                className="rounded-xl p-4 border border-green-500/20 bg-gradient-to-r from-green-900/10 to-emerald-900/10 backdrop-blur-sm flex items-center gap-4"
            >
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center animate-pulse">
                    <Target size={24} className="text-green-400 animate-bounce" />
                </div>

                <div className="flex-1">
                    <h3 className="text-sm font-bold text-green-400">
                        Tudo em dia! 🎉
                    </h3>
                    <p className="text-xs text-slate-400">
                        Nenhuma tarefa urgente.
                    </p>
                </div>
            </div>
        );
    }

    const { category, task, urgency, display } = suggestion;

    const rawUrgencyScore = urgency?.normalizedScore ?? urgency?.score ?? 0;
    const urgencyScore = Number.isFinite(rawUrgencyScore) ? rawUrgencyScore : 0;
    const hasSimuladoData = Boolean(urgency?.details?.hasData);
    const daysSinceLastStudy = Number(urgency?.details?.daysSinceLastStudy || 0);

    let urgencyStyle = {
        gradient: 'from-blue-500/10 to-transparent',
        border: 'border-blue-500/20 hover:border-blue-500/40',
        badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        buttonGradient: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]',
        iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        textHighlight: 'text-blue-400'
    };

    if (urgencyScore > 70) {
        urgencyStyle = {
            gradient: 'from-red-500/10 to-transparent',
            border: 'border-red-500/20 hover:border-red-500/40',
            badge: 'bg-red-500/10 text-red-500 border-red-500/20',
            buttonGradient: 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500',
            glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]',
            iconBg: 'bg-red-500/10 border-red-500/20 text-red-500',
            textHighlight: 'text-red-500'
        };
    } else if (urgencyScore > 50) {
        urgencyStyle = {
            gradient: 'from-amber-500/10 to-transparent',
            border: 'border-amber-500/20 hover:border-amber-500/40',
            badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            buttonGradient: 'from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400',
            glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]',
            iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
            textHighlight: 'text-amber-500'
        };
    }

    return (
        <section
            aria-label="Próxima missão sugerida"
            className={`relative rounded-2xl border ${urgencyStyle.border} bg-[#2d1e12]/80 backdrop-blur-3xl transition-all duration-700 group overflow-visible shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]`}
        >
            {/* Background Layers */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className={`absolute inset-0 bg-gradient-to-br ${urgencyStyle.gradient} opacity-30 group-hover:opacity-50 transition-opacity duration-700`} />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 blur-[100px] rounded-full group-hover:bg-white/10 transition-all duration-1000" />
                <div className="absolute inset-0 opacity-[0.03]">
                    <div className="w-full h-[2px] bg-white animate-scan-fast" />
                </div>
            </div>

            <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
                {/* Left: Category Icon */}
                <div
                    aria-hidden="true"
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-2xl md:text-3xl flex-shrink-0 border ${urgencyStyle.iconBg}`}
                >
                    {category.icon || '📚'}
                </div>

                {/* Center: Task Info */}
                <div className="flex-1 min-w-0 w-full flex flex-col justify-center">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center">
                            PRÓXIMA MISSÃO

                            <span
                                className="relative group/tooltip cursor-help ml-2 inline-flex focus-visible:outline-none rounded"
                                tabIndex={0}
                            >
                                <Info
                                    size={12}
                                    className="text-slate-500 hover:text-slate-400 transition-colors"
                                />

                                <span className="absolute top-full left-0 mt-2 w-56 p-2 bg-yellow-400 text-[10px] text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500 font-normal tracking-normal normal-case">
                                    <strong>Por que isso?</strong> O Coach analisou sua frequência, prioridades e tempo sem ver as matérias para sugerir a tarefa de maior impacto.
                                </span>
                            </span>
                        </span>

                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-md border tracking-widest leading-none ${urgencyStyle.badge}`}>
                            {hasSimuladoData
                                ? (urgencyScore > 70
                                    ? '🔥 Urgente'
                                    : urgencyScore > 50
                                        ? '⚡ Média'
                                        : '📋 Normal')
                                : '🌱 Inicial'}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 mb-2 min-w-0">
                        <h3
                            className="text-lg md:text-xl font-black text-white break-words line-clamp-2 min-w-0 block drop-shadow-sm pb-0.5"
                            title={category.name}
                        >
                            {category.name}
                        </h3>

                        {display.assunto && (
                            <div className="flex items-center gap-2 min-w-0">
                                <Target
                                    size={14}
                                    className={`${urgencyStyle.textHighlight} flex-shrink-0`}
                                />

                                <h4
                                    className="text-xs sm:text-sm font-bold text-slate-300 break-words line-clamp-2 min-w-0 block pb-0.5"
                                    title={display.assunto}
                                >
                                    {display.assunto}
                                </h4>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-slate-400 font-medium">
                                <Clock
                                    size={12}
                                    className={urgencyStyle.textHighlight}
                                />

                                Tempo sem ver:{' '}
                                <span className="text-white font-bold">
                                    {hasSimuladoData
                                        ? daysSinceLastStudy > 0
                                            ? `${daysSinceLastStudy}d`
                                            : '0d'
                                        : 'Nunca'}
                                </span>
                            </span>
                        </div>

                        {urgency?.recommendation && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                <span className="text-lg leading-none" aria-hidden="true">
                                    💡
                                </span>

                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                    <span className="text-white font-bold">
                                        Motivo da escolha:{' '}
                                    </span>
                                    {urgency.recommendation}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Action Button */}
                <div className="w-full md:w-auto flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => onStartStudying?.(category.id, task.id)}
                        aria-label={`Iniciar sessão de ${category.name}${display.assunto ? `: ${display.assunto}` : ''}`}
                        className={`relative w-full px-8 py-4 rounded-xl bg-gradient-to-r ${urgencyStyle.buttonGradient} ${urgencyStyle.glow} text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95 group/btn overflow-hidden`}
                    >
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />

                        <Play
                            size={18}
                            className="fill-white relative z-10"
                            aria-hidden="true"
                        />

                        <span className="relative z-10">
                            INICIAR SESSÃO
                        </span>
                    </button>
                </div>
            </div>
        </section>
    );
}

export default React.memo(NextGoalCard);
