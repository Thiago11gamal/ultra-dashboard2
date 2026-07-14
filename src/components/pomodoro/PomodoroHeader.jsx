import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Zap, AlertCircle } from 'lucide-react';

export function PomodoroHeader({ mode, activeSubject, onManualExit }) {
    return (
        <div className="flex-1 flex justify-center bg-transparent">
            {mode === 'break' || mode === 'long_break' ? (
                <Motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative flex items-center justify-center gap-4 w-full rounded-2xl py-5 border ${mode === 'long_break' ? 'bg-violet-900/30 border-violet-500/40' : 'bg-emerald-900/30 border-emerald-500/40'}`}
                >
                    <Zap size={20} className={`${mode === 'long_break' ? 'text-violet-400' : 'text-emerald-400'}`} />
                    <span className={`text-lg font-black ${mode === 'long_break' ? 'text-violet-400' : 'text-emerald-400'} tracking-widest uppercase`}>
                        {mode === 'long_break' ? 'Pausa Longa' : 'Recuperação Neural'}
                    </span>
                </Motion.div>
            ) : !activeSubject ? (
                <div onClick={onManualExit} className="w-full bg-red-950/20 border border-dashed border-red-500/30 rounded-2xl py-4 flex items-center justify-center gap-4 cursor-pointer hover:bg-red-900/40 transition-all">
                    <AlertCircle size={20} className="text-red-500" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-red-500/70 uppercase tracking-widest">Protocolo Inativo</span>
                        <span className="text-xs font-bold text-red-500">Selecione uma missão neural</span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
