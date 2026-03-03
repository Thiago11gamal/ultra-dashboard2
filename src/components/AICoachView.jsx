import React, { useState } from 'react';
import { Sparkles, Target, Zap, Trash2, ArrowRight, HelpCircle, BrainCircuit, ChevronDown, ChevronUp, Layers, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import AICoachWidget from './AICoachWidget';

function AICoachCard({ task, idx }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Text Parsing Logic
    const fullText = task.text || task.title || "";
    const parts = fullText.split(':');
    const hasDetails = parts.length > 1;

    let subjectPart = hasDetails ? parts[0] : fullText;
    let actionPart = hasDetails ? parts.slice(1).join(':').trim() : "Revisão Geral";

    // Cleanup Subject
    subjectPart = subjectPart
        .replace(/Foco em /i, '')
        .replace(/[^\w\s\u00C0-\u00FF]/g, '')
        .trim();

    // Extract topic
    let topicPart = "";
    const topicMatch = actionPart.match(/^\[(.*?)\]\s*(.*)/);
    if (topicMatch) {
        topicPart = topicMatch[1];
        actionPart = topicMatch[2].trim();
    }

    const displayAssunto = topicPart || (actionPart.length > 50 ? actionPart.substring(0, 47) + '...' : actionPart);
    const displayMeta = topicPart ? actionPart : "Foco em exercícios e revisão";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.08, ease: "easeOut" } }}
            className="group relative flex flex-col p-6 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-amber-500/40 hover:bg-slate-800/80 transition-all duration-500 backdrop-blur-xl shadow-xl overflow-hidden"
        >
            {/* Background Layer for Overflow Safety */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-transparent blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* Header: Subject Badge */}
            <div className="relative z-10 flex justify-between items-start mb-5">
                <span className="inline-flex items-center px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest text-slate-300 group-hover:text-white group-hover:border-amber-500/50 transition-all shadow-sm backdrop-blur-sm leading-[1.6]">
                    {subjectPart}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300">
                    <div className="p-1.5 rounded-xl bg-amber-600/80 text-white shadow-lg shadow-amber-500/20 backdrop-blur-md">
                        <Zap size={14} className="fill-white" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 mb-6">
                <h3 className="text-xl font-black text-white leading-relaxed mb-2 group-hover:text-amber-200 transition-colors drop-shadow-md py-1">
                    {displayAssunto}
                </h3>
                <p className="text-sm font-medium text-slate-400 group-hover:text-slate-200 leading-relaxed line-clamp-2 transition-colors">
                    {displayMeta}
                </p>
            </div>


            {/* Footer / Analysis */}
            <div
                className={`relative z-10 mt-auto pt-4 border-t border-white/10 flex items-center justify-between ${task.analysis ? 'cursor-pointer group/footer' : ''}`}
                onClick={() => task.analysis && setIsExpanded(!isExpanded)}
            >
                {task.analysis ? (
                    <button
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover/footer:text-white transition-colors py-3"
                    >
                        <BrainCircuit size={14} className="group-hover/footer:text-amber-400 transition-colors" />
                        <span>INSIGHT DO COACH</span>
                        <ChevronDown size={12} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                ) : <div />}
            </div>

            <AnimatePresence>
                {isExpanded && task.analysis && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4 space-y-3">
                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/60 p-4 rounded-xl border border-white/5">
                                {task.analysis.reason}
                            </p>

                            {task.analysis.metrics && (
                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                                    {Object.entries(task.analysis.metrics).map(([key, value]) => (
                                        <div key={key} className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                                            <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-bold mb-0.5">{key}</span>
                                            <span className="text-xs font-mono text-white font-bold">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function AICoachView({
    suggestedFocus,
    onGenerateGoals,
    loading,
    coachPlan = [],
    onClearHistory
}) {
    return (
        <div className="space-y-12 animate-fade-in pb-20 max-w-[1600px] mx-auto px-4 sm:px-8">
            {/* 1. Minimalist Premium Header */}
            <div className="flex flex-col md:flex-row items-end justify-between gap-8 pt-6 border-b border-white/5 pb-8">
                <div className="flex-1 md:text-left mb-6 md:mb-0">
                    <p className="text-slate-400 text-lg font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]"></span>
                        Análise de Performance e Metas
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                        <span className="block text-3xl font-black text-white">{coachPlan ? coachPlan.length : 0}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Metas Ativas</span>
                    </div>
                </div>
            </div>

            {/* 2. Main Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Left Column: Widget (4 cols) */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="sticky top-8 space-y-6">
                        {/* The High-End Widget */}
                        <div className="relative">
                            {suggestedFocus && (
                                <AICoachWidget
                                    suggestion={suggestedFocus}
                                    onGenerateGoals={onGenerateGoals}
                                    loading={loading}
                                />
                            )}
                        </div>

                        {/* Empty State Helper - Shows only if no plan */}
                        {(!coachPlan || coachPlan.length === 0) && (
                            <div className="p-8 rounded-2xl border border-dashed border-white/10 bg-black text-center">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                    Gere novas metas para iniciar
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: The Plan (8 cols) */}
                <div className="xl:col-span-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            PLANO DE EXECUÇÃO
                        </h2>
                        {coachPlan && coachPlan.length > 0 && (
                            <button
                                onClick={onClearHistory}
                                className="flex items-center gap-2 text-[10px] font-bold text-slate-600 hover:text-red-400 uppercase tracking-widest transition-colors py-2 px-3 rounded-lg hover:bg-red-500/10"
                            >
                                <Trash2 size={12} />
                                Limpar Plano
                            </button>
                        )}
                    </div>

                    {(!coachPlan || coachPlan.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                    <Compass size={32} className="text-amber-500/50" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-lg font-black text-slate-500">Plano Vazio</p>
                                <p className="text-sm text-slate-600 max-w-xs">Clique em "Gerar" no painel esquerdo para criar um plano de execução personalizado.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {coachPlan.map((task, idx) => (
                                <AICoachCard key={task.id || idx} task={task} idx={idx} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
