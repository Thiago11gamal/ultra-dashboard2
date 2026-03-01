import React, { useMemo } from 'react';
import { Target, Play, Clock } from 'lucide-react';
import { getSuggestedFocus } from '../utils/coachLogic';

export default function NextGoalCard({ categories = [], simulados = [], onStartStudying }) {
    // Get the most urgent category using AI Coach logic
    const suggestion = useMemo(() => {
        const suggestedCategory = getSuggestedFocus(categories, simulados);

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
    }, [categories, simulados]);

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
        gradient: 'from-blue-500/20 to-cyan-500/20',
        border: 'border-blue-500/30',
        badge: 'bg-blue-500/20 text-blue-400',
        buttonGradient: 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
    };

    // Use normalizedScore (0-100) for thresholds
    const urgencyScore = urgency?.normalizedScore ?? urgency?.score ?? 0;

    if (urgencyScore > 70) {
        urgencyStyle = {
            gradient: 'from-red-500/20 to-orange-500/20',
            border: 'border-red-500/30 hover:border-red-500/50',
            badge: 'bg-red-500/20 text-red-400',
            buttonGradient: 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500'
        };
    } else if (urgencyScore > 50) {
        urgencyStyle = {
            gradient: 'from-amber-500/20 to-orange-500/20',
            border: 'border-amber-500/30 hover:border-amber-500/50',
            badge: 'bg-amber-500/20 text-amber-400',
            buttonGradient: 'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
        };
    }

    // Check if we have sufficient data
    const hasSimuladoData = urgency?.details?.hasData;

    // Block removed: The 'Aguardando Dados' message used to hide actionable tasks for new users.
    // We now proceed to render the task suggestion regardless of simulado data.

    return (
        <div className={`relative rounded-xl border ${urgencyStyle.border} bg-gradient-to-r ${urgencyStyle.gradient} backdrop-blur-sm transition-all duration-300 group`}>
            {/* Background Layer for Overflow Safety */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                {/* Subtle animated glow */}
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-purple-500/10 rounded-full blur-[40px] group-hover:scale-150 transition-transform duration-500" />
            </div>

            <div className="relative z-10 p-5 flex flex-col md:flex-row items-center gap-5">
                {/* Left: Category Icon */}
                <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${category.color || '#64748b'}20` }}
                >
                    {category.icon || '📚'}
                </div>

                {/* Center: Task Info */}
                <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <div className="px-2.5 py-1.5 rounded bg-white/10 border border-white/20 shrink-0">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter leading-relaxed">Matéria</span>
                        </div>
                        <span className="text-xs font-bold text-white truncate leading-relaxed">
                            {category.name}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded ml-auto md:ml-2 leading-relaxed ${urgencyStyle.badge}`}>
                            {hasSimuladoData
                                ? (urgencyScore > 70 ? '🔥 Urgente' : urgencyScore > 50 ? '⚡ Média' : '📋 Normal')
                                : '🌱 Inicial'}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-start gap-2">
                        <div className="px-2.5 py-1.5 rounded bg-amber-500/20 border border-amber-500/30 shrink-0 mt-0.5">
                            <span className="text-[10px] font-black text-amber-300 uppercase tracking-tighter leading-relaxed">Assunto</span>
                        </div>
                        <h3 className="text-white font-bold text-sm leading-loose truncate px-1" title={display.assunto}>
                            {display.assunto}
                        </h3>
                    </div>

                    <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5">
                            <Clock size={12} />
                            {display.meta} • {urgency?.details?.daysSinceLastStudy ?? 0}d
                        </span>
                    </div>
                </div>

                {/* Right: Action Button */}
                <button
                    onClick={() => onStartStudying && onStartStudying(category.id, task.id)}
                    className={`w-full md:w-auto flex-shrink-0 px-6 py-3.5 rounded-xl bg-gradient-to-r ${urgencyStyle.buttonGradient} text-white font-bold text-sm flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-lg group/btn leadind-relaxed mt-2 md:mt-0`}
                >
                    <Play size={18} className="fill-white group-hover/btn:animate-bounce" />
                    Estudar
                </button>
            </div>
        </div>
    );
}
