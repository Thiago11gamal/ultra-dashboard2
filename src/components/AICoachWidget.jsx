import React, { useState } from 'react';
import { BrainCircuit, Zap, Target, HelpCircle, TrendingDown, Clock, Activity, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';

export default function AICoachWidget({ suggestion, onGenerateGoals, loading }) {
    const [showWhy, setShowWhy] = useState(false);

    if (!suggestion) return null;

    const topic = suggestion.weakestTopic;
    const urgency = (suggestion && suggestion.urgency && suggestion.urgency.details) ? suggestion.urgency.details : { hasData: false };

    return (
        <div className="relative group mb-10 w-full animate-fade-in-down">
            {/* Outer Glow & Border Frame */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-purple-500/10 to-amber-500/20 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>

            <div className="relative rounded-xl bg-slate-950/80 border border-slate-800/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-purple-600/5 blur-[80px] rounded-full pointer-events-none" />

                {/* Header Section */}
                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 pb-8 border-b border-white/5">
                    {/* Title / Identity */}
                    <div className="flex items-center gap-5">
                        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 flex items-center justify-center shrink-0 overflow-hidden group/icon">
                            <div className="absolute inset-0 bg-amber-500/10 group-hover/icon:animate-pulse"></div>
                            <BrainCircuit size={26} className="text-amber-400 relative z-10" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Activity size={12} className="text-amber-500 animate-pulse" />
                                <span className="text-[10px] font-black text-amber-500/90 uppercase tracking-[0.2em]">
                                    Inteligência Ativa
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">AI Coach <span className="text-slate-500 font-light">Analysis</span></h2>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={onGenerateGoals}
                        disabled={loading}
                        className="group/btn relative w-full xl:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black text-sm hover:from-amber-500 hover:to-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                        {loading ? <Sparkles size={18} className="animate-spin text-slate-900" /> : <Zap size={18} className="text-slate-900 fill-slate-900" />}
                        <span className="relative z-10 tracking-widest">{loading ? 'PROCESSANDO...' : 'RECALCULAR ROTAS'}</span>
                    </button>
                </div>

                {/* Content Section */}
                {!urgency.hasData ? (
                    <div className="relative z-10 p-8 rounded-xl bg-slate-900/50 border border-slate-700/50 flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center ring-4 ring-slate-800/50">
                            <Activity size={28} className="text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Aguardando Dados</h3>
                            <p className="text-slate-400">Complete simulados para que a inteligência artificial possa mapear seus pontos fracos e gerar metas otimizadas.</p>
                        </div>
                    </div>
                ) : (
                    <div className="relative z-10">
                        {/* Main Analysis Card */}
                        <div className="relative rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-amber-500/10 hover:border-amber-500/30 transition-all duration-300 p-6 md:p-10 shadow-xl overflow-hidden group/card">
                            {/* Watermark Icon */}
                            <Target size={240} className="absolute -right-10 -bottom-10 text-amber-500/5 rotate-12 group-hover/card:scale-110 transition-transform duration-700 pointer-events-none" />

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                                {/* Left Side: Title & Topic */}
                                <div className="lg:col-span-7 flex flex-col items-start">
                                    <div className="flex flex-wrap items-center gap-3 mb-4">
                                        <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-[0.15em] border border-amber-500/20">
                                            {urgency.humanReadable?.Status || "Prioridade Crítica"}
                                        </span>
                                        {urgency.crunchMultiplier > 1 && (
                                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.15em] animate-pulse">
                                                <AlertCircle size={12} />
                                                Reta Final x{urgency.crunchMultiplier}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-slate-400 tracking-tight leading-[1.1] mb-6 drop-shadow-sm">
                                        {suggestion.name}
                                    </h3>

                                    <div className="flex items-center gap-3 bg-black/30 px-5 py-3 rounded-xl border border-white/5 backdrop-blur-md">
                                        <Target size={18} className="text-amber-500" />
                                        <div>
                                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-0.5">Foco Direcionado no Assunto</span>
                                            <span className="text-sm font-bold text-white">{topic ? topic.name : "Foco Geral"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Recommendation & Stats Toggle */}
                                <div className="lg:col-span-5 flex flex-col lg:items-end w-full space-y-6">
                                    {suggestion.urgency?.recommendation && (
                                        <div className="bg-amber-500/5 border-l-4 border-amber-500 p-5 rounded-r-xl w-full">
                                            <p className="text-slate-300 font-medium leading-relaxed text-sm md:text-base">
                                                "{suggestion.urgency.recommendation}"
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setShowWhy(!showWhy)}
                                        className="w-full lg:w-auto flex items-center justify-center lg:justify-end gap-2 text-xs font-black text-amber-500/70 hover:text-amber-400 transition-colors uppercase tracking-[0.2em] py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 group/metric"
                                    >
                                        <BrainCircuit size={16} />
                                        Ver Matriz Neural
                                        <ChevronRight size={16} className={`transition-transform duration-300 ${showWhy ? 'rotate-90' : 'group-hover/metric:translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Neural Matrix Details (Stats) */}
                        {showWhy && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 animate-fade-in-down">
                                {Object.entries(urgency.humanReadable || {}).map(([label, value]) => (
                                    <div key={label} className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 hover:border-amber-500/30 hover:bg-slate-800/80 transition-all duration-300 group/stat flex flex-col">
                                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 group-hover/stat:text-amber-500/70 transition-colors line-clamp-1">{label}</span>
                                        <span className="text-xl font-black text-white tracking-tight mt-auto">{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
