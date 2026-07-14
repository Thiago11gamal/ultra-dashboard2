import React from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

export function PomodoroControls({
    isProtocolInactive,
    isRunning,
    onReset,
    onTogglePlay,
    onSkip
}) {
    return (
        <div className="flex flex-wrap sm:grid sm:grid-cols-3 items-center justify-center gap-4 z-10 mt-10 w-full max-w-2xl px-6">
            <div className="flex flex-col items-center gap-3">
                <button onClick={onReset} disabled={isProtocolInactive} className="w-16 h-16 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/5 text-white flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
                    <RotateCcw size={24} />
                </button>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">VOLTAR</span>
            </div>

            <div className="flex flex-col items-center justify-center">
                <button
                    onClick={onTogglePlay}
                    disabled={isProtocolInactive}
                    className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center border-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isRunning ? 'bg-stone-100 text-black border-white' : 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_40px_rgba(34,197,94,0.3)]'}`}
                >
                    {isRunning ? <Pause size={48} className="sm:size-64" /> : <Play size={48} className="sm:size-64 ml-2" />}
                </button>
            </div>

            <div className="flex flex-col items-center gap-3">
                <button onClick={onSkip} disabled={isProtocolInactive} className="w-16 h-16 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/5 text-white flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                    <SkipForward size={24} />
                </button>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">PULAR</span>
            </div>
        </div>
    );
}
