import React, { useState } from 'react';
import { Sparkles, Zap, BrainCircuit, ChevronDown, Download, Loader2, Compass, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AICoachWidget from './AICoachWidget';
import AICoachPlanner from './AICoachPlanner';
import { useAppStore } from '../store/useAppStore';
import { exportComponentAsPDF } from '../utils/pdfExport';

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
    const displayMeta = topicPart ? actionPart : (actionPart !== "Revisão Geral" ? actionPart : "Foco em exercícios e revisão");

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.08, ease: "easeOut" } }}
            className="group relative flex flex-col p-5 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-purple-500/20 hover:bg-slate-800/60 transition-all duration-300 shadow-sm overflow-hidden"
        >
            {/* Header: Subject Badge */}
            <div className="relative z-10 flex justify-between items-start mb-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-800 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-purple-300 transition-colors">
                    {subjectPart}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Zap size={14} className="text-purple-400 fill-purple-400" />
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 mb-4">
                <h3 className="text-lg font-bold text-white leading-snug mb-1.5 group-hover:text-purple-100 transition-colors">
                    {displayAssunto}
                </h3>
                <p className="text-xs font-medium text-slate-400 group-hover:text-slate-300 leading-relaxed line-clamp-2 transition-colors">
                    {displayMeta}
                </p>
            </div>


            {/* Footer / Analysis Toggle */}
            <div
                className={`relative z-10 mt-auto pt-3 border-t border-white/5 flex items-center justify-between ${task.analysis ? 'cursor-pointer group/footer' : ''}`}
                onClick={() => task.analysis && setIsExpanded(!isExpanded)}
            >
                {task.analysis ? (
                    <button
                        className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500 group-hover/footer:text-slate-300 transition-colors py-2"
                    >
                        <BrainCircuit size={12} className="group-hover/footer:text-purple-400 transition-colors" />
                        <span>Insight do Coach</span>
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
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 space-y-2">
                            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                {task.analysis.reason}
                            </p>

                            {task.analysis.metrics && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {Object.entries(task.analysis.metrics).map(([key, value]) => (
                                        <div key={key} className="bg-slate-900 p-2 rounded flex items-center gap-2 border border-white/5">
                                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{key}</span>
                                            <span className="text-[10px] font-mono text-slate-300 font-bold">{value}</span>
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
    const [isExporting, setIsExporting] = useState(false);
    const [viewMode, setViewMode] = useState('planner');
    
    // CORREÇÃO: Capturar o state de forma reativa no início do componente
    const coachPlanner = useAppStore(state => state.appState.coachPlanner) || {};

    const handleExport = async () => {
        setIsExporting(true);
        await exportComponentAsPDF('ai-coach-container', 'Plano_Execucao_AICoach.pdf', 'portrait');
        setIsExporting(false);
    };

    return (
        <div id="ai-coach-container" className="space-y-8 animate-fade-in pb-20 max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-12 xl:px-16 pt-4">
            {/* 1. Header & Navigation */}
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 pt-6 pb-6 border-b border-white/5">
                <div className="flex-1 md:text-left">
                    <h1 className="text-xl font-black text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-sm">
                            <Sparkles size={16} className="text-purple-400" />
                        </div>
                        Executive Coach
                        <span className="text-[10px] text-purple-400 uppercase tracking-widest font-bold bg-purple-500/10 px-2 py-1 rounded ml-2">Beta</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="no-print flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 text-xs font-bold transition-all border border-purple-500/30 disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        <span className="hidden sm:inline">{isExporting ? 'Progresso...' : 'Salvar Plano'}</span>
                        <span className="sm:hidden">PDF</span>
                    </button>
                    <div className="text-right hidden md:block border-l border-white/10 pl-4">
                        <span className="block text-2xl font-black text-white leading-none">{coachPlan ? coachPlan.length : 0}</span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Metas Ativas</span>
                    </div>
                </div>
            </div>

            {/* 2. Main Layout Stack */}
            <div className="flex flex-col gap-10">
                {/* Top Section: Widget */}
                <div className="w-full">
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

                {/* Bottom Section: The Plan */}
                <div className="w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-6">
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center pr-4 border-r border-white/10">
                                Execução
                            </h2>
                            {coachPlan && coachPlan.length > 0 && (
                                <div className="flex items-center gap-1 bg-slate-950/50 p-1.5 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setViewMode('planner')}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'planner' ? 'bg-purple-500/20 text-purple-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Planner
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-purple-500/20 text-purple-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Lista
                                    </button>
                                </div>
                            )}
                        </div>
                        {coachPlan && coachPlan.length > 0 && (
                            <button
                                onClick={onClearHistory}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-800"
                            >
                                <Trash2 size={12} />
                                Limpar Lista
                            </button>
                        )}
                    </div>

                    {(!coachPlan || coachPlan.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-2xl border border-white/5 bg-slate-900/20">
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                                <Compass size={24} className="text-slate-500" />
                            </div>
                            <div>
                                <p className="text-base font-bold text-slate-300">Nenhum plano ativo</p>
                                <p className="text-xs text-slate-500 mt-1 max-w-[250px] mx-auto">Solicite uma análise para gerar metas personalizadas de estudo.</p>
                            </div>
                        </div>
                    ) : viewMode === 'planner' ? (
                        <AICoachPlanner coachPlan={coachPlan} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                                // BUG-5 FIX: Filtrar metas usando o estado reativo
                                const allAssignedIds = new Set();
                                Object.values(coachPlanner).forEach(dayTasks => {
                                    (dayTasks || []).forEach(t => t?.id && allAssignedIds.add(t.id));
                                });
                                return coachPlan
                                    .filter(task => !allAssignedIds.has(task.id))
                                    .map((task, idx) => (
                                        <AICoachCard key={task.id || idx} task={task} idx={idx} />
                                    ));
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
