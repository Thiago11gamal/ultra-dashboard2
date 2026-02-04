import React from 'react';
import { Sparkles, Target, Zap, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import AICoachWidget from './AICoachWidget';

export default function AICoachView({
    suggestedFocus,
    onGenerateGoals,
    loading,
    coachPlan = [],
    onClearHistory
}) {
    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* 1. Hero / Header Section */}
            <div className="relative overflow-hidden rounded-3xl p-8 border border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-slate-900/40 to-slate-900/20">
                {/* Background Sparkles */}
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                    <Sparkles size={200} className="text-purple-400" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="p-4 rounded-2xl bg-purple-500/20 text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                        <Sparkles size={48} />
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-100 to-amber-200 mb-2 drop-shadow-sm">
                            AI Coach
                        </h1>
                        <p className="text-purple-200/60 text-lg max-w-lg">
                            Seu estrategista pessoal. Deixe a inteligência artificial analisar seus dados e traçar o melhor caminho.
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. Widget Area */}
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
                <div className="lg:col-span-4">
                    {suggestedFocus && (
                        <AICoachWidget
                            suggestion={suggestedFocus}
                            onGenerateGoals={onGenerateGoals}
                            loading={loading}
                        />
                    )}
                </div>

                {/* Info / Stats Sidebar (Decorative) */}
                <div className="hidden lg:flex lg:col-span-2 flex-col justify-center gap-4 text-center p-6 rounded-2xl border border-purple-500/20 bg-black/20">
                    <div className="p-3 bg-blue-500/10 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-blue-400 mb-2">
                        <Target size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-200">Foco Cirúrgico</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Atacamos suas maiores fraquezas estatísticas.
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Results Section */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold flex items-center gap-3 text-purple-100">
                        <span className="p-1.5 rounded-lg bg-green-500/20 text-green-400">
                            <Target size={20} />
                        </span>
                        Plano Sugerido
                    </h3>

                    {coachPlan.length > 0 && (
                        <button
                            onClick={onClearHistory}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 size={14} />
                            Limpar Histórico
                        </button>
                    )}
                </div>

                <AnimatePresence mode='popLayout'>
                    {coachPlan.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-12 rounded-3xl border-2 border-dashed border-purple-500/20 flex flex-col items-center justify-center text-center group hover:border-purple-500/40 transition-colors"
                        >
                            <div className="mb-4 p-4 rounded-full bg-purple-500/10 group-hover:scale-110 transition-transform duration-500">
                                <Zap size={32} className="text-purple-400/50 group-hover:text-purple-400 transition-colors" />
                            </div>
                            <h4 className="text-lg font-bold text-purple-200/50 mb-1">Aguardando Ordens</h4>
                            <p className="text-sm text-purple-200/30 max-w-sm">
                                Clique em <span className="text-purple-400 font-bold">"Gerar Meta do Dia"</span> acima para receber missões personalizadas.
                            </p>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {coachPlan.map((task, idx) => (
                                <motion.div
                                    key={task.id || idx}
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{
                                        opacity: 1,
                                        scale: 1,
                                        y: 0,
                                        transition: { delay: idx * 0.1 }
                                    }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group relative p-1 rounded-2xl bg-gradient-to-b from-purple-500/20 to-blue-500/5 hover:from-purple-500/40 hover:to-blue-500/20 transition-all duration-300"
                                >
                                    <div className="relative h-full p-5 rounded-xl bg-slate-950/90 hover:bg-slate-900/90 transition-colors flex flex-col gap-3 backdrop-blur-sm">

                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-300 shadow-inner group-hover:scale-110 transition-transform border border-purple-500/10 shrink-0">
                                                <Zap size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {/* Text Parsing Logic */}
                                                {(() => {
                                                    const fullText = task.text || task.title || "";
                                                    // Try to split by colon if it exists (Common pattern: "Foco em X: Fazer Y")
                                                    const parts = fullText.split(':');
                                                    const hasDetails = parts.length > 1;

                                                    const subjectPart = hasDetails ? parts[0].replace(/Foco em /i, '').trim() : fullText;
                                                    const actionPart = hasDetails ? parts.slice(1).join(':').trim() : "";

                                                    return (
                                                        <div>
                                                            {/* Subject Highlight */}
                                                            <div className="mb-2">
                                                                <span className="text-[10px] font-bold tracking-wider text-purple-400 uppercase opacity-70 block mb-1">
                                                                    Foco Recomendado
                                                                </span>
                                                                <h4 className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300 leading-tight drop-shadow-sm">
                                                                    {subjectPart}
                                                                </h4>
                                                            </div>

                                                            {/* Action / Details */}
                                                            {actionPart && (
                                                                <p className="text-sm text-slate-400 font-medium leading-relaxed border-l-2 border-purple-500/30 pl-3">
                                                                    {actionPart}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* DEBUG / EXPLAINABILITY SECTION */}
                                        {task.analysis && (
                                            <details className="mt-2 text-xs text-slate-500 border-t border-white/5 pt-2">
                                                <summary className="cursor-pointer hover:text-purple-300 flex items-center gap-1 list-none">
                                                    <span className="bg-purple-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-purple-400/80 hover:bg-purple-500/20 transition-colors">
                                                        ? Por que isso?
                                                    </span>
                                                </summary>
                                                <div className="mt-2 p-3 rounded bg-black/40 font-mono text-[10px] whitespace-pre-wrap overflow-x-auto text-slate-400 border border-white/5 shadow-inner">
                                                    {JSON.stringify(task.analysis, null, 2)}
                                                </div>
                                            </details>
                                        )}

                                        <div className="flex items-center justify-between pt-2 mt-auto border-t border-white/5">
                                            <span className="text-[10px] uppercase font-bold text-purple-300/60 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10 group-hover:bg-purple-500/10 group-hover:text-purple-300 transition-colors">
                                                Meta do Dia
                                            </span>
                                            <ArrowRight size={14} className="text-purple-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
