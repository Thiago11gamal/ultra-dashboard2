import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Zap, AlertCircle } from 'lucide-react';

export function PomodoroHeader({ mode, activeSubject }) {
    if (mode === 'break' || mode === 'long_break') {
        return (
            <Motion.div
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                role="status"
                aria-live="polite"
                className={`flex items-center justify-center gap-2.5 w-full rounded-2xl py-2.5 px-4 border shadow-md ${mode === 'long_break' ? 'bg-violet-900/50 border-violet-500/60 text-violet-100' : 'bg-emerald-900/50 border-emerald-500/60 text-emerald-100'}`}
            >
                <Zap size={18} className={mode === 'long_break' ? 'text-violet-300' : 'text-emerald-300'} />
                <span className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase">
                    {mode === 'long_break' ? 'Pausa Longa Ativa' : 'Recuperação Neural'}
                </span>
            </Motion.div>
        );
    }

    if (!activeSubject) {
        return (
            <div className="w-full bg-red-950/30 border border-dashed border-red-500/40 rounded-2xl py-2 px-4 flex items-center justify-center gap-2 shadow-sm">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-red-300 truncate">Selecione uma missão no painel para focar</span>
            </div>
        );
    }

    return null;
}

export default PomodoroHeader;
