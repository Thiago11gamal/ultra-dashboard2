import React from 'react';
import { BrainCircuit, Zap, Target } from 'lucide-react';

export default function AICoachWidget({ suggestion, onGenerateGoals, loading }) {
    if (!suggestion) return null;

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 border border-violet-500/30 p-6 mb-8 group">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left: Logic / Brain */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-violet-500/20 border border-violet-500/50 flex items-center justify-center text-violet-300 shadow-[0_0_15px_-5px_#8b5cf6]">
                        <BrainCircuit size={32} className="animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-widest text-violet-300">AI Study Coach</span>
                            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-[10px] text-violet-200 border border-violet-500/30">Beta</span>
                        </div>
                        {!suggestion.urgency?.details?.hasData ? (
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
                            <>
                                <h3 className="text-xl font-bold text-white mb-0.5">
                                    Foco Sugerido: <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300 underline decoration-amber-500/50 underline-offset-4">{suggestion.name}</span>
                                </h3>
                                <p className="text-sm text-slate-400 flex items-center gap-2">
                                    <Target size={14} />
                                    Média: {suggestion.urgency?.details?.averageScore?.toFixed(0)}% • {suggestion.urgency?.details?.daysSinceLastStudy || 0} dias desde último estudo
                                </p>
                            </>
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
        </div>
    );
}
