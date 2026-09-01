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
                className={`flex items-center justify-center gap-2 w-full rounded-xl py-1.5 px-3 border shadow-sm ${mode === 'long_break' ? 'bg-violet-900/30 border-violet-500/40 text-violet-300' : 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300'}`}
            >
                <Zap size={14} className={mode === 'long_break' ? 'text-violet-400' : 'text-emerald-400'} />
                <span className="text-xs font-black tracking-widest uppercase">
                    {mode === 'long_break' ? 'Pausa Longa Ativa' : 'Recuperação Neural'}
                </span>
            </Motion.div>
        );
    }

    if (!activeSubject) {
        return (
            <div className="w-full bg-red-950/20 border border-dashed border-red-500/30 rounded-xl py-1.5 px-3 flex items-center justify-center gap-2 shadow-sm">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span className="text-xs font-bold text-red-400 truncate">Selecione uma missão no painel para focar</span>
            </div>
        );
    }

    return null;
}

export default PomodoroHeader;
