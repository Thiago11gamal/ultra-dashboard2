import React from 'react';
import { formatTime } from '../../utils/pomodoroHelpers';
import { Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';

export function PomodoroClock({
    speed,
    setSpeed,
    isProtocolInactive,
    mode,
    isRunning,
    timeLeft,
    totalTime,
    svgCircleRef,
    clockRef,
    isFullscreen,
    toggleFullscreen,
    isMuted,
    toggleMute
}) {
    return (
        <div className="w-full flex flex-col items-center">
            {/* Barra superior de controles do relógio */}
            <div className="w-full flex items-center justify-between gap-2 mb-1 sm:mb-1.5 relative z-30">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className={`text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] transition-colors ${mode === 'work' ? 'text-blue-300 font-extrabold drop-shadow' : 'text-white/40'}`}>
                        FOCO
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <span className={`text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] transition-colors ${mode !== 'work' ? (mode === 'long_break' ? 'text-violet-300 font-extrabold drop-shadow' : 'text-emerald-300 font-extrabold drop-shadow') : 'text-white/40'}`}>
                        PAUSA
                    </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Seletor de Velocidade */}
                    <div className="flex gap-1 bg-black/60 p-0.5 rounded-lg border border-[#3f2e26]/80 shadow-inner backdrop-blur-md">
                        {[1, 10, 100].map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSpeed(s)}
                                aria-label={`Velocidade ${s}x`}
                                className={`px-2 sm:px-2.5 h-6 sm:h-7 rounded-md text-[11px] font-black transition-all ${speed === s ? 'bg-[#b08e6b] text-[#2d1a12] shadow-sm font-black' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                            >
                                {s}X
                            </button>
                        ))}
                    </div>

                    {/* Botão Tela Cheia */}
                    {typeof toggleFullscreen === 'function' && (
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="p-1 h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center bg-black/40 border border-white/10 hover:border-white/20 rounded-lg text-slate-300 hover:text-white transition-all shadow-sm backdrop-blur-md"
                            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                        >
                            {isFullscreen ? <Minimize2 size={13} className="text-indigo-300" /> : <Maximize2 size={13} />}
                        </button>
                    )}

                    {/* Botão Mudo */}
                    {typeof toggleMute === 'function' && (
                        <button
                            type="button"
                            onClick={toggleMute}
                            className="p-1 h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center bg-black/40 border border-white/10 hover:border-white/20 rounded-lg text-slate-300 hover:text-white transition-all shadow-sm backdrop-blur-md"
                            title={isMuted ? "Ativar som" : "Silenciar alarme"}
                        >
                            {isMuted ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} className="text-emerald-400" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Mostrador SVG Circular com Dígitos de Destaque */}
            <div className="relative my-0 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 256 256" className="w-[min(50vw,12rem)] h-[min(50vw,12rem)] sm:w-44 sm:h-44 lg:w-[190px] lg:h-[190px] transform -rotate-90 relative z-10">
                    <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" strokeLinecap="round" />
                    <defs>
                        <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={mode === 'work' ? '#3b82f6' : (mode === 'long_break' ? '#a855f7' : '#22c55e')} />
                            <stop offset="100%" stopColor={mode === 'work' ? '#2563eb' : (mode === 'long_break' ? '#9333ea' : '#10b981')} />
                        </linearGradient>
                    </defs>
                    <circle
                        ref={svgCircleRef}
                        cx="128" cy="128" r="110" fill="none"
                        stroke="url(#timerGradient)"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 110}
                        strokeDashoffset={2 * Math.PI * 110}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <span 
                        ref={clockRef} 
                        className="text-3xl sm:text-4xl lg:text-[3.25rem] font-black tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-none tabular-nums"
                        role="timer"
                        aria-live="polite"
                        aria-label={`Tempo restante: ${formatTime(timeLeft)}`}
                    >
                        {formatTime(timeLeft)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/90 drop-shadow mt-1 text-center px-2">
                        {isRunning
                            ? (mode === 'work' ? 'PROTOCOL Foco' : (mode === 'long_break' ? 'Pausa Longa' : 'Recuperação'))
                            : (isProtocolInactive
                                ? 'AGUARDANDO PROTOCOLO'
                                : (totalTime && timeLeft >= totalTime ? 'PRONTO PARA FOCO' : 'SESSÃO PAUSADA'))}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default PomodoroClock;
