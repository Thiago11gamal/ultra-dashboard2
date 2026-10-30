import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Zap, AlertCircle, Target, Sparkles, BookOpen } from 'lucide-react';

export function PomodoroHeader({
    mode,
    activeSubject,
    onStartRecommended,
    recommendedTask,
    onStartFreeFocus
}) {
    if (!activeSubject) {
        return (
            <div className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                        <Target size={14} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black text-slate-200 tracking-tight truncate">
                            Nenhuma meta ativa no momento
                        </p>
                        <p className="text-[10px] text-indigo-300/80 font-medium truncate">
                            Selecione uma missão para orientar seu tempo
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                    {recommendedTask && typeof onStartRecommended === 'function' && (
                        <button
                            type="button"
                            onClick={() => onStartRecommended(recommendedTask)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 border border-indigo-400/30"
                            title={`Iniciar recomendado: ${recommendedTask.title || recommendedTask.text}`}
                        >
                            <Sparkles size={12} className="text-amber-300" />
                            <span>Alvo IA</span>
                        </button>
                    )}
                    {typeof onStartFreeFocus === 'function' && (
                        <button
                            type="button"
                            onClick={onStartFreeFocus}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                            title="Iniciar estudo livre em Geral"
                        >
                            <BookOpen size={12} />
                            <span>Foco Livre</span>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (typeof activeSubject !== 'object' || !activeSubject.taskId) {
        return (
            <div className="w-full bg-red-950/30 border border-dashed border-red-500/40 rounded-2xl py-2 px-4 flex items-center justify-center gap-2 shadow-sm">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-red-300 truncate">
                    Erro ao carregar missão. Selecione novamente.
                </span>
            </div>
        );
    }

    if (mode === 'break' || mode === 'long_break') {
        return (
            <Motion.div
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                role="status"
                aria-live="polite"
                className={`flex items-center justify-center gap-2.5 w-full rounded-2xl py-2 px-4 border shadow-md ${
                    mode === 'long_break'
                        ? 'bg-violet-900/50 border-violet-500/60 text-violet-100'
                        : 'bg-emerald-900/50 border-emerald-500/60 text-emerald-100'
                }`}
            >
                <Zap size={16} className={mode === 'long_break' ? 'text-violet-300' : 'text-emerald-300'} />
                <span className="text-xs font-black tracking-[0.2em] uppercase">
                    {mode === 'long_break' ? 'Pausa Longa Ativa — Descanse profundamente' : 'Recuperação Neural — Respire e beba água'}
                </span>
            </Motion.div>
        );
    }

    return null;
}

export default PomodoroHeader;
