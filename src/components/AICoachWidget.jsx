import React, { useState } from 'react';
import { BrainCircuit, Zap, Target, HelpCircle, TrendingDown, Clock, Activity } from 'lucide-react';

export default function AICoachWidget({ suggestion, onGenerateGoals, loading }) {
    const [showWhy, setShowWhy] = useState(false);

    if (!suggestion) return null;

    const topic = suggestion.weakestTopic;
    const urgency = suggestion.urgency?.details || {};

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 border border-violet-500/30 p-6 mb-8 group">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 flex flex-col items-stretch gap-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Left: Logic / Brain */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-violet-500/20 border border-violet-500/50 flex items-center justify-center text-violet-300 shadow-[0_0_15px_-5px_#8b5cf6]">
                            <BrainCircuit size={32} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-widest text-violet-300">AI Study Coach</span>
                                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-[10px] text-violet-200 border border-violet-500/30">Análise de Dados</span>
                            </div>
                            {!urgency.hasData ? (
                                <>
                                    <h3 className="text-xl font-bold text-white mb-0.5">
                                        Aguardando Dados de Performance
                                    </h3>
                                    <p className="text-sm text-slate-400 flex items-center gap-2">
                                        <Target size={14} />
                                        Faça seu primeiro simulado para receber sugestões personalizadas
                                    </p>
                                </>
                            ) : (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold text-white">
                                            Matéria: <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-100">{suggestion.name}</span>
                                        </h3>
                                        <button
                                            onClick={() => setShowWhy(!showWhy)}
                                            className="p-1 rounded-full hover:bg-white/10 text-violet-300 transition-colors"
                                            title="Por que essa sugestão?"
                                        >
                                            <HelpCircle size={18} />
                                        </button>
                                        {urgency.crunchMultiplier > 1 && (
                                            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-[10px] text-red-200 border border-red-500/30 animate-pulse">
                                                🔥 Reta Final x{urgency.crunchMultiplier}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 shrink-0">
                                            <span className="text-[10px] font-black text-amber-300 uppercase">Assunto</span>
                                        </div>
                                        <p className="text-lg font-bold text-slate-200 truncate">
                                            {topic ? topic.name : "Revisão Geral / Diagnóstico"}
                                        </p>
                                    </div>
                                    {/* Dynamic Recommendation */}
                                    {(suggestion.urgency?.recommendation || urgency.recommendation) && (
                                        <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                                            <Zap size={12} className="text-violet-400" />
                                            <span className="text-xs text-violet-200">{suggestion.urgency?.recommendation || urgency.recommendation}</span>
                                        </div>
                                    )}
                                    {!urgency.hasSimulados && (
                                        <div className="flex items-center gap-1.5 mt-1 opacity-60">
                                            <Target size={10} className="text-amber-400" />
                                            <span className="text-[10px] text-slate-400 italic">Sugestão baseada em recência (sem simulados)</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Action */}
                    <button
                        onClick={onGenerateGoals}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-violet-900 font-bold hover:bg-violet-50 transition-all shadow-[0_0_20px_-5px_rgba(139,92,246,0.5)] transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    >
                        <Zap size={20} className={`fill-violet-900 ${loading ? 'animate-spin' : 'group-hover/btn:animate-bounce'}`} />
                        {loading ? 'Gerando Plano...' : 'Gerar Meta do Dia'}
                    </button>
                </div>

                {/* Explainability Panel */}
                {showWhy && (
                    <div className="mt-2 p-4 rounded-xl bg-black/40 border border-violet-500/20 animate-fade-in-down">
                        <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                            <HelpCircle size={14} className="text-violet-400" />
                            <h4 className="text-xs font-bold text-violet-200 uppercase tracking-wider">Por que estamos sugerindo isso?</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {Object.entries(urgency.humanReadable || {}).map(([label, value]) => (
                                <div key={label} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                                    <div className="shrink-0">
                                        {label === "Média" && <TrendingDown className="text-red-400" size={16} />}
                                        {label === "Recência" && <Clock className="text-blue-400" size={16} />}
                                        {label === "Instabilidade" && <Activity className="text-purple-400" size={16} />}
                                        {label === "Peso da Matéria" && <Target className="text-amber-400" size={16} />}
                                        {label === "Status" && <Zap className="text-green-400" size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                        <span className="block text-[9px] uppercase text-slate-500 font-bold truncate">{label}</span>
                                        <span className="text-xs font-mono font-bold text-white">{value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-[11px] text-slate-400 leading-relaxed italic">
                            O motor de IA detectou que esta combinação de <span className="text-violet-300">baixa performance</span>, <span className="text-violet-300">tempo sem revisar</span> e <span className="text-violet-300">peso da matéria</span> representa o maior risco para sua aprovação.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
