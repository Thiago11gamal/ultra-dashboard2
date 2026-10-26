import React, { useMemo, useState, useEffect } from 'react';
import { Target, Play, Clock, Info, Sparkles } from 'lucide-react';
import { getSuggestedFocus } from '../utils/coachLogic';
import { toArray } from '../utils/normalize';

function NextGoalCard({
    categories = [],
    simulados = [],
    studyLogs = [],
    onStartStudying
}) {
    const rawCategories = useMemo(() => toArray(categories), [categories]);
    const hasAnyTasks = useMemo(() => {
        return rawCategories.some(cat => toArray(cat?.tasks).length > 0);
    }, [rawCategories]);

    const [isLoading, setIsLoading] = useState(true);
    const [suggestion, setSuggestion] = useState(null);
    const rawCategoriesRef = React.useRef(rawCategories);
    useEffect(() => { rawCategoriesRef.current = rawCategories; }, [rawCategories]);

    useEffect(() => {
        // Usa setTimeout para não bloquear o render inicial e evitar setState síncrono no efeito
        const timer = setTimeout(() => {
            const currentCats = rawCategoriesRef.current || [];
            if (currentCats.length === 0 || !hasAnyTasks) {
                setIsLoading(false);
                setSuggestion(null);
                return;
            }

            setIsLoading(true);
            try {
                const normalizedCategories = currentCats.map(category => ({
                    ...category,
                    tasks: toArray(category?.tasks)
                }));
                const categoriesWithPending = normalizedCategories.filter(category =>
                    toArray(category?.tasks).some(t => t && !t.completed)
                );
                if (categoriesWithPending.length === 0) {
                    setSuggestion(null);
                    return;
                }
                const suggestedCategory = getSuggestedFocus(
                    categoriesWithPending,
                    toArray(simulados),
                    toArray(studyLogs)
                );
                if (!suggestedCategory) {
                    setSuggestion(null);
                    return;
                }
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                const sortedTasks = toArray(suggestedCategory.tasks)
                    .filter(t => t && !t.completed)
                    .slice()
                    .sort((a, b) => {
                        const pA = String(a?.priority || 'medium').toLowerCase();
                        const pB = String(b?.priority || 'medium').toLowerCase();
                        return (priorityOrder[pA] ?? 1) - (priorityOrder[pB] ?? 1);
                    });
                const nextTask = sortedTasks[0];
                if (!nextTask) {
                    setSuggestion(null);
                    return;
                }
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
                setSuggestion({
                    category: suggestedCategory,
                    task: nextTask,
                    urgency: suggestedCategory.urgency,
                    display: {
                        assunto: actionPart.length > 80
                            ? `${actionPart.substring(0, 77)}...`
                            : actionPart,
                        meta
                    }
                });
            } catch (err) {
                console.error('[NextGoalCard] Erro ao calcular sugestão:', err);
                setSuggestion(null);
            } finally {
                setIsLoading(false);
            }
        }, 50);

        return () => clearTimeout(timer);
    }, [rawCategories, hasAnyTasks, simulados, studyLogs]);

    if (rawCategories.length === 0 || !hasAnyTasks) {
        return null;
    }

    if (isLoading) {
        return (
            <div
                role="status"
                className="rounded-xl p-4 border border-white/10 bg-slate-900/50 backdrop-blur-sm flex items-center gap-4 animate-pulse"
            >
                <div className="w-12 h-12 bg-white/5 rounded-xl" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                    <div className="h-2 bg-white/5 rounded w-2/3" />
                </div>
            </div>
        );
    }

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
                    <h3 className="text-base font-semibold text-green-400">
                        Tudo em dia! 🎉
                    </h3>
                    <p className="text-sm text-slate-400">
                        Nenhuma tarefa urgente.
                    </p>
                </div>
            </div>
        );
    }

    const { category, task, urgency, display } = suggestion || {};
    if (!category || !task) return null;

    const rawUrgencyScore = urgency?.normalizedScore ?? urgency?.score ?? 0;
    const urgencyScore = Number.isFinite(rawUrgencyScore) ? rawUrgencyScore : 0;
    const hasSimuladoData = Boolean(urgency?.details?.hasData);
    const daysSinceLastStudy = Number(urgency?.details?.daysSinceLastStudy || 0);

    let urgencyStyle = {
        gradient: 'from-blue-500/15 via-blue-500/5 to-transparent',
        border: 'border-blue-500/30 hover:border-blue-500/50',
        badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        buttonGradient: 'from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400',
        glow: 'shadow-[0_0_25px_rgba(59,130,246,0.25)] hover:shadow-[0_0_35px_rgba(59,130,246,0.45)]',
        iconBg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
        textHighlight: 'text-blue-400',
        calloutBg: 'bg-blue-500/10 border-blue-500/20'
    };

    if (hasSimuladoData && urgencyScore > 70) {
        urgencyStyle = {
            gradient: 'from-red-500/15 via-red-500/5 to-transparent',
            border: 'border-red-500/30 hover:border-red-500/50',
            badge: 'bg-red-500/15 text-red-400 border-red-500/30',
            buttonGradient: 'from-red-600 via-red-500 to-orange-500 hover:from-red-500 hover:to-orange-400',
            glow: 'shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:shadow-[0_0_35px_rgba(239,68,68,0.45)]',
            iconBg: 'bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/30 text-red-400',
            textHighlight: 'text-red-400',
            calloutBg: 'bg-red-500/10 border-red-500/20'
        };
    } else if (hasSimuladoData && urgencyScore > 50) {
        urgencyStyle = {
            gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
            border: 'border-amber-500/30 hover:border-amber-500/50',
            badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
            buttonGradient: 'from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-400',
            glow: 'shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:shadow-[0_0_35px_rgba(245,158,11,0.45)]',
            iconBg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
            textHighlight: 'text-amber-400',
            calloutBg: 'bg-amber-500/10 border-amber-500/20'
        };
    }

    return (
        <section
            aria-label="Próxima missão sugerida"
            className={`relative rounded-2xl border ${urgencyStyle.border} bg-slate-900/90 backdrop-blur-2xl transition-all duration-500 group overflow-visible shadow-xl hover:shadow-2xl`}
        >
            {/* Background Atmosphere */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className={`absolute inset-0 bg-gradient-to-r ${urgencyStyle.gradient} opacity-40 group-hover:opacity-60 transition-opacity duration-700`} />
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 blur-[90px] rounded-full group-hover:bg-white/10 transition-all duration-700" />
            </div>

            <div className="relative z-10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
                {/* Left: Icon + Content Details */}
                <div className="flex items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
                    {/* Category Icon */}
                    <div
                        aria-hidden="true"
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0 border shadow-md ${urgencyStyle.iconBg} transition-transform duration-300 group-hover:scale-105`}
                    >
                        {category.icon || '📚'}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                        {/* Meta Badges Row */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                <Sparkles size={13} className={urgencyStyle.textHighlight} />
                                Próxima missão

                                <span
                                    className="relative group/tooltip cursor-help inline-flex focus-visible:outline-none"
                                    tabIndex={0}
                                >
                                    <Info
                                        size={13}
                                        className="text-slate-500 hover:text-slate-300 transition-colors"
                                    />

                                    <span className="absolute top-full left-0 mt-2 w-64 p-3 bg-slate-900/95 backdrop-blur-md text-xs text-slate-300 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-200 z-[60] pointer-events-none border border-slate-700/80 leading-relaxed font-normal normal-case">
                                        <strong className="text-white">Por que isso?</strong> O Coach analisou sua frequência, prioridades e tempo sem ver as matérias para sugerir a tarefa de maior impacto.
                                    </span>
                                </span>
                            </span>

                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border leading-tight ${urgencyStyle.badge}`}>
                                {hasSimuladoData
                                    ? (urgencyScore > 70
                                        ? '🔥 Urgente'
                                        : urgencyScore > 50
                                            ? '⚡ Média'
                                            : '📋 Normal')
                                    : '🌱 Inicial'}
                            </span>

                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
                                <Clock size={11} className={urgencyStyle.textHighlight} />
                                <span>Tempo sem ver:</span>
                                <strong className="text-white font-semibold tabular-nums">
                                    {hasSimuladoData
                                        ? daysSinceLastStudy > 0
                                            ? `${daysSinceLastStudy}d`
                                            : 'Hoje'
                                        : 'Nunca'}
                                </strong>
                            </span>
                        </div>

                        {/* Title & Topic */}
                        <div className="space-y-0.5">
                            <h3
                                className="text-lg sm:text-xl font-bold text-white tracking-tight break-words line-clamp-1"
                                title={category.name}
                            >
                                {category.name}
                            </h3>

                            {display.assunto && (
                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                                    <Target
                                        size={14}
                                        className={`${urgencyStyle.textHighlight} flex-shrink-0`}
                                    />
                                    <span className="truncate text-slate-200" title={display.assunto}>
                                        {display.assunto}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Motivo da escolha */}
                        {urgency?.recommendation && (
                            <div className="pt-0.5">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs sm:text-[13px] text-slate-300 max-w-2xl ${urgencyStyle.calloutBg}`}>
                                    <span className="text-sm leading-none flex-shrink-0" aria-hidden="true">💡</span>
                                    <span className="text-slate-400 font-medium whitespace-nowrap">Motivo da escolha:</span>
                                    <span className="text-slate-200 truncate sm:whitespace-normal font-normal">
                                        {urgency.recommendation}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Action Button */}
                <div className="w-full lg:w-auto flex-shrink-0 flex items-center justify-end">
                    <button
                        type="button"
                        onClick={() => typeof onStartStudying === 'function' && onStartStudying(category.id || category.name, task.id || task.text || task.title)}
                        aria-label={`Iniciar sessão de ${category.name}${display.assunto ? `: ${display.assunto}` : ''}`}
                        className={`w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r ${urgencyStyle.buttonGradient} ${urgencyStyle.glow} text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 group/btn overflow-hidden cursor-pointer`}
                    >
                        <Play
                            size={16}
                            className="fill-white relative z-10 transition-transform duration-300 group-hover/btn:scale-110"
                            aria-hidden="true"
                        />
                        <span className="relative z-10">
                            Iniciar sessão
                        </span>
                    </button>
                </div>
            </div>
        </section>
    );
}

export default React.memo(NextGoalCard);

