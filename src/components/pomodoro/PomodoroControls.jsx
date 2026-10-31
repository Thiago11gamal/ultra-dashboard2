import React from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

export const PomodoroControls = React.memo(function PomodoroControls({
    isProtocolInactive,
    isRunning,
    onReset,
    onTogglePlay,
    onSkip
}) {
    return (
        <div className="flex items-center justify-center gap-3.5 sm:gap-5 z-10 mt-1 sm:mt-1.5 w-full max-w-sm px-4 select-none">
            {/* Botão Voltar/Reiniciar */}
            <div className="flex flex-col items-center gap-0.5">
                <button 
                    type="button" 
                    onClick={onReset} 
                    disabled={isProtocolInactive} 
                    aria-label="Reiniciar cronômetro (R)"
                    title="Reiniciar etapa (Atalho: R)"
                    className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/10 text-white flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:from-stone-700 hover:to-stone-800 active:scale-95 transition-all duration-200"
                >
                    <RotateCcw size={15} />
                </button>
                <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">VOLTAR</span>
            </div>

            {/* Botão Play / Pause */}
            <div className="flex flex-col items-center justify-center">
                <button
                    type="button"
                    onClick={onTogglePlay}
                    aria-label={isRunning ? 'Pausar (Espaço)' : 'Iniciar (Espaço)'}
                    aria-pressed={isRunning}
                    title={isRunning ? 'Pausar (Atalho: Espaço)' : (isProtocolInactive ? 'Iniciar Estudo Livre (Atalho: Espaço)' : 'Iniciar (Atalho: Espaço)')}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 active:scale-95 shadow-2xl relative ${
                        isRunning 
                            ? 'bg-stone-100 text-black border-white hover:bg-stone-200 shadow-[0_0_20px_rgba(255,255,255,0.35)]' 
                            : 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:bg-emerald-400 hover:shadow-[0_0_25px_rgba(34,197,94,0.6)]'
                    }`}
                >
                    {isRunning ? <Pause size={24} className="sm:w-6 sm:h-6 transition-transform" /> : <Play size={24} className="sm:w-6 sm:h-6 ml-0.5 transition-transform" />}
                </button>
                <span className="text-[8px] font-black text-white/50 uppercase tracking-widest mt-0.5">
                    {isRunning ? 'PAUSAR' : 'INICIAR'}
                </span>
            </div>

            {/* Botão Pular */}
            <div className="flex flex-col items-center gap-0.5">
                <button 
                    type="button" 
                    onClick={onSkip} 
                    disabled={isProtocolInactive} 
                    aria-label="Pular fase (S)"
                    title="Pular para próxima fase (Atalho: S)"
                    className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/10 text-white flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:from-stone-700 hover:to-stone-800"
                >
                    <SkipForward size={15} />
                </button>
                <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">PULAR</span>
            </div>
        </div>
    );
});

export default PomodoroControls;
