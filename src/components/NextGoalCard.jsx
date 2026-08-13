import React, { useMemo } from 'react';
import { Target, Play, Clock, Info, Zap, Sparkles } from 'lucide-react';
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
                className="relative rounded-2xl p-6 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/90 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center gap-5 group overflow-hidden"
            >
                <div className="absolute inset-0 bg-emerald-500/5 opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 relative z-10 shadow-lg shadow-emerald-500/10">
                    <Sparkles size={26} className="animate-pulse" />
                </div>

                <div className="flex-1 text-center sm:text-left relative z-10">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                            Status do Coach
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <h3 className="text-lg font-black text-white">
                        Tudo em dia! Missões Cumpridas 🎉
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Excelente ritmo de estudos. Adicione novas metas ou faça um simulado para calibrar seu desempenho.
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
        gradient: 'from-cyan-500/15 via-indigo-500/5 to-transparent',
        border: 'border-cyan-500/30 hover:border-cyan-400/50',
        badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]',
        buttonGradient: 'from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500',
        glow: 'shadow-[0_0_25px_rgba(6,182,212,0.25)] hover:shadow-[0_0_35px_rgba(6,182,212,0.45)]',
        iconBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
        textHighlight: 'text-cyan-400',
        ambientGlow: 'bg-cyan-500/10',
        dotColor: 'bg-cyan-400'
    };

    if (urgencyScore > 70) {
        urgencyStyle = {
            gradient: 'from-rose-500/20 via-orange-500/10 to-transparent',
            border: 'border-rose-500/35 hover:border-rose-400/60',
            badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]',
            buttonGradient: 'from-rose-600 via-orange-600 to-amber-600 hover:from-rose-500 hover:via-orange-500 hover:to-amber-500',
            glow: 'shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:shadow-[0_0_40px_rgba(244,63,94,0.5)]',
            iconBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
            textHighlight: 'text-rose-400',
            ambientGlow: 'bg-rose-500/15',
            dotColor: 'bg-rose-400'
        };
    } else if (urgencyScore > 50) {
        urgencyStyle = {
            gradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
            border: 'border-amber-500/35 hover:border-amber-400/60',
            badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
            buttonGradient: 'from-amber-600 via-orange-500 to-rose-500 hover:from-amber-500 hover:via-orange-400 hover:to-rose-400',
            glow: 'shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:shadow-[0_0_35px_rgba(245,158,11,0.45)]',
            iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
            textHighlight: 'text-amber-400',
            ambientGlow: 'bg-amber-500/15',
            dotColor: 'bg-amber-400'
        };
    }

    return (
        <section
            aria-label="Próxima missão sugerida pelo Coach IA"
            className={`relative rounded-3xl border ${urgencyStyle.border} bg-gradient-to-br from-slate-900/95 via-[#0c1020]/95 to-slate-900/95 backdrop-blur-2xl transition-all duration-500 group overflow-visible shadow-[0_12px_45px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]`}
        >
            {/* Ambient Lighting & High-Tech Scanline */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <div className={`absolute inset-0 bg-gradient-to-br ${urgencyStyle.gradient} opacity-40 group-hover:opacity-70 transition-opacity duration-700`} />
                <div className={`absolute -top-28 -right-28 w-80 h-80 ${urgencyStyle.ambientGlow} blur-[110px] rounded-full group-hover:scale-125 transition-transform duration-1000`} />
                <div className="absolute -bottom-28 -left-28 w-72 h-72 bg-indigo-500/10 blur-[100px] rounded-full" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.03] to-transparent pointer-events-none" />
            </div>

            <div className="relative z-10 p-6 sm:p-7 md:p-8 flex flex-col md:flex-row items-stretch md:items-center gap-6 md:gap-8">
                {/* Left: Category Icon Capsule */}
                <div className="flex sm:flex-row md:flex-col items-center justify-center flex-shrink-0">
                    <div
                        aria-hidden="true"
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0 border ${urgencyStyle.iconBg} shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:rotate-1 relative overflow-hidden`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                        <span className="relative z-10 drop-shadow-md">
                            {category.icon || '📚'}
                        </span>
                    </div>
                </div>

                {/* Center: Mission Intel & Details */}
                <div className="flex-1 min-w-0 w-full flex flex-col justify-center">
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-1.5">
                            <Sparkles size={12} className={urgencyStyle.textHighlight} />
                            PRÓXIMA MISSÃO RECOMENDADA

                            <span
                                className="relative group/tooltip cursor-help inline-flex focus-visible:outline-none rounded"
                                tabIndex={0}
                            >
                                <Info
                                    size={13}
                                    className="text-slate-500 hover:text-slate-300 transition-colors ml-0.5"
                                />

                                <span className="absolute top-full left-0 sm:left-auto mt-2 w-64 p-3 bg-slate-900/95 text-[11px] text-slate-200 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:visible transition-all duration-300 z-[70] pointer-events-none border border-white/15 backdrop-blur-xl leading-relaxed">
                                    <strong className="text-white block mb-1">🎯 Algoritmo Adaptativo:</strong>
                                    O motor analisou seu histórico de retenção, tempo sem revisar e relevância do edital para eleger o tópico de maior impacto imediato na sua nota.
                                </span>
                            </span>
                        </span>

                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border tracking-widest leading-none flex items-center gap-1.5 ${urgencyStyle.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${urgencyStyle.dotColor} animate-pulse`} />
                            {hasSimuladoData
                                ? (urgencyScore > 70
                                    ? '🔥 Alta Urgência'
                                    : urgencyScore > 50
                                        ? '⚡ Média Urgência'
                                        : '📋 Regular')
                                : '🌱 Início de Ciclo'}
                        </span>
                    </div>

                    {/* Discipline & Topic Title */}
                    <div className="flex flex-col gap-1.5 mb-3 min-w-0">
                        <h3
                            className="text-xl sm:text-2xl font-black text-white tracking-tight break-words line-clamp-2 min-w-0 drop-shadow-sm"
                            title={category.name}
                        >
                            {category.name}
                        </h3>

                        {display.assunto && (
                            <div className="flex items-center gap-2 min-w-0">
                                <Target
                                    size={15}
                                    className={`${urgencyStyle.textHighlight} flex-shrink-0`}
                                />
                                <h4
                                    className="text-sm sm:text-base font-bold text-slate-200 break-words line-clamp-2 min-w-0"
                                    title={display.assunto}
                                >
                                    {display.assunto}
                                </h4>
                            </div>
                        )}
                    </div>

                    {/* Meta Pills & Coach Rationale */}
                    <div className="flex flex-wrap items-center gap-2.5 mt-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 font-medium">
                            <Clock
                                size={13}
                                className={urgencyStyle.textHighlight}
                            />
                            Tempo sem estudar:{' '}
                            <span className="text-white font-black">
                                {hasSimuladoData
                                    ? daysSinceLastStudy > 0
                                        ? `${daysSinceLastStudy}d`
                                        : 'Hoje'
                                    : 'Nunca estudado'}
                            </span>
                        </span>

                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-medium">
                            <Zap size={13} className="text-indigo-400" />
                            Sessão estimada:{' '}
                            <span className="text-white font-black">
                                25 min (1 Pomodoro)
                            </span>
                        </span>
                    </div>

                    {urgency?.recommendation && (
                        <div className="mt-3 flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300">
                            <span className="text-sm leading-none mt-0.5" aria-hidden="true">
                                💡
                            </span>
                            <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                <span className="text-white font-bold">
                                    Diagnóstico do Coach:{' '}
                                </span>
                                {urgency.recommendation}
                            </p>
                        </div>
                    )}
                </div>

                {/* Right: High-Energy Action Button */}
                <div className="w-full md:w-auto flex-shrink-0 flex items-center justify-center pt-2 md:pt-0">
                    <button
                        type="button"
                        onClick={() => onStartStudying?.(category.id, task.id)}
                        aria-label={`Iniciar sessão de ${category.name}${display.assunto ? `: ${display.assunto}` : ''}`}
                        className={`relative w-full md:w-auto min-w-[200px] px-8 py-4 sm:py-5 rounded-2xl bg-gradient-to-r ${urgencyStyle.buttonGradient} ${urgencyStyle.glow} text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98] group/btn overflow-hidden border border-white/20`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />

                        <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center relative z-10 group-hover/btn:scale-110 transition-transform">
                            <Play
                                size={15}
                                className="fill-white text-white ml-0.5"
                                aria-hidden="true"
                            />
                        </div>

                        <span className="relative z-10 font-black tracking-widest text-xs sm:text-sm">
                            INICIAR SESSÃO
                        </span>
                    </button>
                </div>
            </div>
        </section>
    );
}

export default React.memo(NextGoalCard);
