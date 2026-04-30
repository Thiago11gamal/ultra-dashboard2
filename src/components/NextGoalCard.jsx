import React, { useMemo } from 'react';
import { Target, Play, Clock } from 'lucide-react';
import { getSuggestedFocus } from '../utils/coachLogic';

function NextGoalCard({ categories = [], simulados = [], studyLogs = [], onStartStudying }) {
    // Get the most urgent category using AI Coach logic
    const suggestion = useMemo(() => {
        const suggestedCategory = getSuggestedFocus(categories, simulados, studyLogs);

        if (!suggestedCategory) return null;

        // Find the first uncompleted task with highest priority
        const tasks = suggestedCategory.tasks || [];

        // Priority order: high > medium > low
        const priorityOrder = { high: 0, medium: 1, low: 2 };

        const sortedTasks = tasks
            .filter(t => !t.completed)
            .sort((a, b) => {
                const pA = (a.priority || 'medium').toLowerCase();
                const pB = (b.priority || 'medium').toLowerCase();
                // Bug fix: priorityOrder['high'] === 0, so `|| 1` was coercing it to 1 (same as medium).
                // Use `?? 1` (nullish coalescing) so only null/undefined get the fallback, not 0.
                return (priorityOrder[pA] ?? 1) - (priorityOrder[pB] ?? 1);
            });

        const nextTask = sortedTasks[0];

        if (!nextTask) return null;

        // Compute task display info
        const fullText = nextTask.title || nextTask.text || "Estudo";
        const parts = fullText.split(':');
        const hasDetails = parts.length > 1;
        let actionPart = hasDetails ? parts.slice(1).join(':').trim() : fullText;

        let topicPart = "";
        const topicMatch = actionPart.match(/^\[(.*?)\]\s*(.*)/);
        if (topicMatch) {
            topicPart = topicMatch[1];
            actionPart = topicMatch[2].trim();
        }

        return {
            category: suggestedCategory,
            task: nextTask,
            urgency: suggestedCategory.urgency,
            display: {
                assunto: topicPart || (actionPart.length > 40 ? actionPart.substring(0, 37) + '...' : actionPart),
                meta: topicPart ? actionPart : "Revisão e exercícios"
            }
        };
    }, [categories, simulados, studyLogs]);

    if (!suggestion) {
        return (
            <div className="rounded-xl p-4 border border-green-500/20 bg-gradient-to-r from-green-900/10 to-emerald-900/10 backdrop-blur-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center animate-pulse">
                    <Target size={24} className="text-green-400 animate-bounce" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-green-400">Tudo em dia! 🎉</h3>
                    <p className="text-xs text-slate-400">Nenhuma tarefa urgente.</p>
                </div>
            </div>
        );
    }

    const { category, task, urgency, display } = suggestion;

    // Determine urgency styling
    let urgencyStyle = {
        gradient: 'from-blue-500/10 to-transparent',
        border: 'border-blue-500/20 hover:border-blue-500/40',
        badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        buttonGradient: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]',
        iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        textHighlight: 'text-blue-400'
    };

    // Use normalizedScore (0-100) for thresholds
    const urgencyScore = urgency?.normalizedScore ?? urgency?.score ?? 0;

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

    // Check if we have sufficient data
    const hasSimuladoData = urgency?.details?.hasData;

    // Block removed: The 'Aguardando Dados' message used to hide actionable tasks for new users.
    // We now proceed to render the task suggestion regardless of simulado data.

    return (
        <div className={`relative rounded-2xl border ${urgencyStyle.border} bg-[#2d1e12]/80 backdrop-blur-3xl transition-all duration-700 group overflow-hidden shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]`}>
            {/* Background Layers */}
            <div className={`absolute inset-0 bg-gradient-to-br ${urgencyStyle.gradient} pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity duration-700`} />
            <div className={`absolute -top-24 -right-24 w-64 h-64 bg-white/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-white/10 transition-all duration-1000`} />

            {/* Scanline Effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
                <div className="w-full h-[2px] bg-white animate-scan-fast" />
            </div>

            <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
                {/* Left: Category Icon */}
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-2xl md:text-3xl flex-shrink-0 border ${urgencyStyle.iconBg}`}>
                    {category.icon || '📚'}
                </div>

                {/* Center: Task Info */}
                <div className="flex-1 min-w-0 w-full flex flex-col justify-center">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                            PRÓXIMA MISSÃO
                        </span>

                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-md border tracking-widest leading-none ${urgencyStyle.badge}`}>
                            {hasSimuladoData
                                ? (urgencyScore > 70 ? '🔥 Urgente' : urgencyScore > 50 ? '⚡ Média' : '📋 Normal')
                                : '🌱 Inicial'}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 mb-2">
                        <h3 className="text-xl md:text-2xl font-black text-white truncate drop-shadow-sm" title={category.name}>
                            {category.name}
                        </h3>
                        {display.assunto && (
                            <div className="flex items-center gap-2">
                                <Target size={14} className={urgencyStyle.textHighlight} />
                                <h4 className="text-sm font-bold text-slate-300 truncate" title={display.assunto}>
                                    {display.assunto}
                                </h4>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-slate-400 font-medium">
                            <Clock size={12} className={urgencyStyle.textHighlight} />
                            Tempo sem ver: <span className="text-white font-bold">
                                {hasSimuladoData && (urgency?.details?.daysSinceLastStudy ?? 0) > 0
                                    ? `${urgency.details.daysSinceLastStudy}d`
                                    : hasSimuladoData ? '0d' : 'Nunca'}
                            </span>
                        </span>
                    </div>
                </div>

                {/* Right: Action Button */}
                <div className="w-full md:w-auto flex-shrink-0">
                    <button
                        onClick={() => onStartStudying && onStartStudying(category.id, task.id)}
                        className={`relative w-full px-8 py-4 rounded-xl bg-gradient-to-r ${urgencyStyle.buttonGradient} ${urgencyStyle.glow} text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95 group/btn overflow-hidden`}
                    >
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                        <Play size={18} className="fill-white relative z-10" />
                        <span className="relative z-10">INICIAR SESSÃO</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(NextGoalCard);
