import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Zap, AlertCircle } from 'lucide-react';

export function PomodoroHeader({ mode, activeSubject }) {
    if (mode === 'break' || mode === 'long_break') {
        return (
            <Motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="status"
                aria-live="polite"
                className={`flex items-center justify-center gap-2.5 w-full rounded-2xl py-2.5 px-4 border shadow-md ${mode === 'long_break' ? 'bg-violet-900/40 border-violet-500/50 text-violet-200' : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-200'}`}
            >
                <Zap size={17} className={mode === 'long_break' ? 'text-violet-400' : 'text-emerald-400'} />
                <span className="text-xs sm:text-sm font-black tracking-widest uppercase">
                    {mode === 'long_break' ? 'Pausa Longa Ativa' : 'Recuperação Neural'}
                </span>
            </Motion.div>
        );
    }

    if (!activeSubject) {
        return (
            <div className="w-full bg-red-950/20 border border-dashed border-red-500/30 rounded-2xl py-2 px-4 flex items-center justify-center gap-2 shadow-sm">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-red-400 truncate">Selecione uma missão no painel para focar</span>
            </div>
        );
    }

    return null;
}

export default PomodoroHeader;
