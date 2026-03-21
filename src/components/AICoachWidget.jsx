import React, { useState } from 'react';
import { BrainCircuit, Zap, Target, HelpCircle, TrendingDown, Clock, Activity, Sparkles, ChevronRight, AlertCircle, Cpu, Database } from 'lucide-react';

export default function AICoachWidget({ suggestion, onGenerateGoals, loading }) {
    const [showWhy, setShowWhy] = useState(false);

    if (!suggestion) return null;

    const topic = suggestion.weakestTopic;
    const urgency = (suggestion && suggestion.urgency && suggestion.urgency.details) ? suggestion.urgency.details : { hasData: false };

    return (
        <div className="relative group mb-10 w-full animate-fade-in-down">
            {/* Outer Glow & Border Frame - Reduced intensity and switched to purple base */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/10 via-purple-600/5 to-purple-500/10 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

            <div className="relative rounded-xl bg-slate-900/90 border border-white/5 p-6 md:p-8 shadow-2xl backdrop-blur-xl overflow-hidden">
                {/* Decorative Background Elements - Minimized */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 blur-[80px] rounded-full pointer-events-none" />

                {/* Header Section */}
                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 pb-8 border-b border-white/5">
                    {/* Title / Identity */}
                    <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden group/icon">
                            <div className="absolute inset-0 bg-purple-500/5 group-hover/icon:animate-pulse"></div>
                            <Cpu size={22} className="text-purple-400 relative z-10" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <Activity size={10} className="text-purple-400 animate-pulse" />
                                <span className="text-[9px] font-black text-purple-400/90 uppercase tracking-widest">
                                    Inteligência Ativa
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight">AI Coach <span className="text-slate-500 font-bold">Analysis</span></h2>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                {!urgency.hasData ? (
                    <div className="relative z-10 p-8 md:p-12 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-white/5 flex flex-col md:flex-row items-center justify-start gap-6 text-center md:text-left overflow-hidden group/wait">
                        <div className="absolute inset-0 bg-purple-500/5 group-hover/wait:bg-purple-500/10 transition-colors duration-700"></div>
                        <div className="relative w-20 h-20 rounded-2xl bg-slate-800/80 flex items-center justify-center border border-purple-500/20 ring-4 ring-purple-500/10 shadow-xl shadow-purple-900/20 group-hover/wait:scale-105 transition-transform duration-500 shrink-0">
                            <Database size={32} className="text-purple-400 animate-pulse" />
                        </div>
                        <div className="relative">
                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Análise Pendente</h3>
                            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                                Complete simulados para que a inteligência artificial possa traçar seu perfil de desempenho e gerar metas otimizadas.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="relative z-10">
                        {/* Main Analysis Card */}
                        <div className="relative rounded-2xl bg-slate-950/40 border border-white/5 p-6 md:p-8 shadow-inner overflow-hidden group/card">
                            {/* Watermark Icon */}
                            <Target size={180} className="absolute -right-10 -bottom-10 text-white/5 rotate-12 group-hover/card:scale-110 transition-transform duration-700 pointer-events-none" />

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
                                {/* Left Side: Title & Topic */}
                                <div className="lg:col-span-7 flex flex-col items-start">
                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                        <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[9px] font-black uppercase tracking-widest border border-white/10">
                                            {urgency.humanReadable?.Status || "Prioridade"}
                                        </span>
                                        {urgency.crunchMultiplier > 1 && (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                                <AlertCircle size={10} />
                                                Reta Final x{urgency.crunchMultiplier}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-[1.1] mb-5">
                                        {suggestion.name}
                                    </h3>

                                    <div className="flex items-center gap-3 bg-purple-900/20 px-4 py-2.5 rounded-xl border border-purple-500/20">
                                        <Target size={16} className="text-purple-400" />
                                        <div>
                                            <span className="text-[9px] text-purple-300/70 uppercase font-black tracking-widest block mb-0.5">Foco Direcionado no Assunto</span>
                                            <span className="text-sm font-bold text-white">{topic ? topic.name : "Foco Geral"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Recommendation & Stats Toggle */}
                                <div className="lg:col-span-5 flex flex-col lg:items-end w-full space-y-4">
                                    {suggestion.urgency?.recommendation && (
                                        <div className="bg-slate-800/50 border-l-2 border-purple-500 p-4 rounded-r-xl w-full">
                                            <p className="text-slate-300 font-medium leading-relaxed text-sm">
                                                "{suggestion.urgency.recommendation}"
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setShowWhy(!showWhy)}
                                        className="w-full lg:w-auto flex items-center justify-center lg:justify-end gap-2 text-[10px] font-black text-slate-400 hover:text-white transition-colors uppercase tracking-widest py-2 px-4 rounded-lg hover:bg-white/5"
                                    >
                                        <BrainCircuit size={14} />
                                        Ver Matriz Neural
                                        <ChevronRight size={14} className={`transition-transform duration-300 ${showWhy ? 'rotate-90' : 'group-hover/metric:translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Neural Matrix Details (Stats) */}
                        {showWhy && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4 animate-fade-in-down">
                                {Object.entries(urgency.humanReadable || {}).map(([label, value]) => (
                                    <div key={label} className="p-3 rounded-xl bg-slate-900/50 border border-white/5">
                                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1 block line-clamp-1">{label}</span>
                                        <span className="text-lg font-black text-white tracking-tight block">{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Action Button - Prominent Bottom Position */}
                <div className="mt-8 pt-6 border-t border-white/5">
                    <button
                        onClick={onGenerateGoals}
                        disabled={loading}
                        className="group/btn relative w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-200 font-black text-sm transition-all shadow-xl shadow-purple-900/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                        {loading ? <Sparkles size={20} className="animate-spin text-slate-200" /> : <Zap size={20} className="text-slate-200 fill-slate-200" />}
                        <span className="relative z-10 tracking-widest uppercase">{loading ? 'ALGORITMO PROCESSANDO...' : 'RECALCULAR PLANO INTELIGENTE'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
