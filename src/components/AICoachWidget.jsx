import React, { useState } from 'react';
import { BrainCircuit, Zap, Target, HelpCircle, TrendingDown, Clock, Activity, Sparkles, ChevronRight } from 'lucide-react';

export default function AICoachWidget({ suggestion, onGenerateGoals, loading }) {
    const [showWhy, setShowWhy] = useState(false);

    if (!suggestion) return null;

    const topic = suggestion.weakestTopic;
    const urgency = suggestion.urgency?.details || {};

    return (
        <div className="relative group mb-8">
            <div className="relative rounded-sm bg-slate-950/40 border border-white/10 p-8 shadow-2xl backdrop-blur-xl overflow-hidden">
                {/* Subtle high-end gradient accent - Dark Yellow/Amber */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-yellow-600/10 blur-[60px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-6 mb-8">
                    <div className="relative w-full md:w-1/2 flex items-center gap-6 p-6 rounded-sm bg-black/40 border border-white/10 shadow-inner backdrop-blur-md">
                        <div className="absolute inset-0 bg-amber-500/5 blur-xl rounded-sm"></div>
                        <BrainCircuit size={40} className="relative z-10 text-amber-300 shrink-0" />

                        <div className="relative z-10">
                            {/* Duplicate 'AI Coach' removed. Using the subtitle as the primary label. */}
                            <h2 className="text-xl font-black text-white/90 tracking-[0.2em] uppercase">
                                Análise em Tempo Real
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-1.5 h-1.5 rounded-sm bg-amber-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">
                                    Inteligência Ativa
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onGenerateGoals}
                        disabled={loading}
                        className="group/btn relative px-8 py-4 rounded-sm bg-amber-500/10 text-amber-200 font-black text-sm hover:bg-amber-500/20 transition-all shadow-lg backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                        {loading ? <Sparkles size={18} className="animate-spin text-amber-400" /> : <Zap size={18} className="fill-amber-400 text-amber-400" />}
                        <span className="relative z-10">{loading ? 'PROCESSANDO...' : 'GERAR META DO DIA'}</span>
                    </button>
                </div>

                {!urgency.hasData ? (
                    <div className="p-8 rounded-sm bg-white/5 border border-white/5 flex items-center gap-6 backdrop-blur-md">
                        <div className="p-4 rounded-full bg-slate-800/50 text-slate-400 ring-1 ring-white/10">
                            <Activity size={32} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg mb-1">Aguardando Dados</h3>
                            <p className="text-slate-400 text-sm">Realize simulados para ativar a inteligência neural.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="relative p-8 rounded-sm bg-white/5 border border-white/5 backdrop-blur-md overflow-hidden group/card hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors duration-500">
                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover/card:opacity-[0.07] transition-opacity duration-500">
                                <Target size={200} className="text-white" />
                            </div>

                            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-2 py-0.5 rounded-sm bg-amber-500/20 text-amber-200 text-[10px] font-bold uppercase tracking-widest border border-amber-500/20 backdrop-blur-sm">
                                            Prioridade Máxima
                                        </span>
                                    </div>
                                    <h3 className="text-5xl font-black text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
                                        {suggestion.name}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="inline-flex items-center px-4 py-2 rounded-sm bg-white/5 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-wide backdrop-blur-md hover:bg-white/10 transition-colors">
                                            <Target size={14} className="mr-2 text-amber-400" />
                                            {topic ? topic.name : "Foco Geral"}
                                        </span>
                                        {urgency.crunchMultiplier > 1 && (
                                            <span className="inline-flex items-center px-4 py-2 rounded-sm bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-bold uppercase tracking-wide backdrop-blur-md animate-pulse">
                                                <Clock size={14} className="mr-2" />
                                                Reta Final x{urgency.crunchMultiplier}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-start md:items-end gap-4">
                                    {(suggestion.urgency?.recommendation || urgency.recommendation) && (
                                        <div className="text-right max-w-md">
                                            <p className="text-xl text-amber-100/90 font-medium leading-relaxed drop-shadow-md italic">
                                                {suggestion.urgency?.recommendation}
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setShowWhy(!showWhy)}
                                        className="group/metric flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-amber-300 transition-colors uppercase tracking-widest mt-2 py-2 px-4 rounded-sm hover:bg-white/5 border border-white/5 backdrop-blur-sm"
                                    >
                                        VER ANÁLISE TÉCNICA
                                        <ChevronRight size={14} className={`transition-transform duration-300 ${showWhy ? 'rotate-90' : 'group-hover/metric:translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {showWhy && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 animate-fade-in-down pt-2">
                                {Object.entries(urgency.humanReadable || {}).map(([label, value]) => (
                                    <div key={label} className="p-4 rounded-sm bg-white/5 border border-white/5 hover:bg-amber-500/10 hover:border-amber-500/20 transition-colors backdrop-blur-md group/stat">
                                        <div className="flex items-center gap-2 mb-2 text-slate-500 group-hover/stat:text-amber-300 transition-colors">
                                            <span className="text-[10px] uppercase font-bold tracking-widest">{label}</span>
                                        </div>
                                        <div className="text-lg font-mono font-bold text-white tracking-tight">
                                            {value}
                                        </div>
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
