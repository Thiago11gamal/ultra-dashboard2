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
        <div className="flex items-center justify-center gap-5 sm:gap-8 z-10 mt-3 sm:mt-4 w-full max-w-md px-4">
            {/* Botão Voltar/Reiniciar */}
            <div className="flex flex-col items-center gap-1.5">
                <button 
                    type="button" 
                    onClick={onReset} 
                    disabled={isProtocolInactive} 
                    aria-label="Reiniciar cronômetro"
                    title="Reiniciar"
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/10 text-white flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:from-stone-700 hover:to-stone-800 active:scale-95 transition-all"
                >
                    <RotateCcw size={22} className="sm:w-6 sm:h-6" />
                </button>
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">VOLTAR</span>
            </div>

            {/* Botão Play / Pause */}
            <div className="flex flex-col items-center justify-center">
                <button
                    type="button"
                    onClick={onTogglePlay}
                    disabled={isProtocolInactive}
                    aria-label={isRunning ? 'Pausar' : 'Iniciar'}
                    aria-pressed={isRunning}
                    title={isRunning ? 'Pausar' : 'Iniciar'}
                    className={`w-28 h-28 sm:w-34 sm:h-34 rounded-full flex items-center justify-center border-4 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-2xl ${isRunning ? 'bg-stone-100 text-black border-white hover:bg-stone-200' : 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_35px_rgba(34,197,94,0.4)] hover:bg-emerald-400'}`}
                >
                    {isRunning ? <Pause size={42} className="sm:w-12 sm:h-12" /> : <Play size={42} className="sm:w-12 sm:h-12 ml-1.5" />}
                </button>
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest mt-1.5">
                    {isRunning ? 'PAUSAR' : 'INICIAR'}
                </span>
            </div>

            {/* Botão Pular */}
            <div className="flex flex-col items-center gap-1.5">
                <button 
                    type="button" 
                    onClick={onSkip} 
                    disabled={isProtocolInactive} 
                    aria-label="Pular fase"
                    title="Pular"
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/10 text-white flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:from-stone-700 hover:to-stone-800"
                >
                    <SkipForward size={22} className="sm:w-6 sm:h-6" />
                </button>
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">PULAR</span>
            </div>
        </div>
    );
}

export default PomodoroControls;
