import React, { useId, useMemo } from 'react';
import { formatTime, SPEED_OPTIONS } from '../../utils/pomodoroHelpers';
import { Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';

const CLOCK_THEMES = {
    work: {
        gradientStops: [
            { offset: '0%', color: '#60a5fa' },
            { offset: '65%', color: '#2563eb' },
            { offset: '100%', color: '#1d4ed8' }
        ],
        auraClass: 'bg-blue-500/15 shadow-[0_0_50px_rgba(37,99,235,0.3)]',
        pulsePingClass: 'bg-blue-400',
        pulseDotClass: 'bg-blue-500',
        statusActive: 'PROTOCOL Foco'
    },
    long_break: {
        gradientStops: [
            { offset: '0%', color: '#c084fc' },
            { offset: '65%', color: '#9333ea' },
            { offset: '100%', color: '#7e22ce' }
        ],
        auraClass: 'bg-purple-500/15 shadow-[0_0_50px_rgba(147,51,234,0.3)]',
        pulsePingClass: 'bg-purple-400',
        pulseDotClass: 'bg-purple-500',
        statusActive: 'Pausa Longa'
    },
    break: {
        gradientStops: [
            { offset: '0%', color: '#4ade80' },
            { offset: '65%', color: '#10b981' },
            { offset: '100%', color: '#059669' }
        ],
        auraClass: 'bg-emerald-500/15 shadow-[0_0_50px_rgba(16,185,129,0.3)]',
        pulsePingClass: 'bg-emerald-400',
        pulseDotClass: 'bg-emerald-500',
        statusActive: 'Recuperação'
    }
};

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
    const rawId = useId();
    const gradientId = `timerGradient_${rawId.replace(/:/g, '')}`;

    const currentTheme = useMemo(() => {
        return CLOCK_THEMES[mode] || CLOCK_THEMES.work;
    }, [mode]);

    return (
        <div className="w-full flex flex-col items-center select-none">
            {/* Barra superior de controles do relógio */}
            <div className="w-full flex items-center justify-between gap-2 mb-1 sm:mb-1.5 relative z-30">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className={`text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${mode === 'work' ? 'text-blue-300 font-extrabold drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-white/40'}`}>
                        FOCO
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <span className={`text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${mode !== 'work' ? (mode === 'long_break' ? 'text-violet-300 font-extrabold drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'text-emerald-300 font-extrabold drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]') : 'text-white/40'}`}>
                        PAUSA
                    </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Seletor de Velocidade */}
                    <div className="flex gap-1 bg-black/60 p-0.5 rounded-lg border border-[#3f2e26]/80 shadow-inner backdrop-blur-md">
                        {SPEED_OPTIONS.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSpeed(s)}
                                aria-label={`Velocidade ${s}x`}
                                className={`px-2 sm:px-2.5 h-6 sm:h-7 rounded-md text-[11px] font-black transition-all duration-200 active:scale-95 ${speed === s ? 'bg-[#b08e6b] text-[#2d1a12] shadow-sm font-black scale-[1.02]' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
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
                            className="p-1 h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center bg-black/40 border border-white/10 hover:border-white/20 active:scale-90 rounded-lg text-slate-300 hover:text-white transition-all shadow-sm backdrop-blur-md"
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
                            className="p-1 h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center bg-black/40 border border-white/10 hover:border-white/20 active:scale-90 rounded-lg text-slate-300 hover:text-white transition-all shadow-sm backdrop-blur-md"
                            title={isMuted ? "Ativar som" : "Silenciar alarme"}
                        >
                            {isMuted ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} className="text-emerald-400" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Mostrador SVG Circular com Dígitos de Destaque e Efeito Fluido */}
            <div className="relative my-0 rounded-full flex items-center justify-center group">
                {/* Aura respiratória de iluminação dinâmica quando em execução */}
                <div
                    className={`absolute inset-2 rounded-full transition-all duration-700 pointer-events-none ${
                        isRunning ? `${currentTheme.auraClass} animate-pulse` : 'bg-black/20 shadow-inner'
                    }`}
                />

                <svg viewBox="0 0 256 256" className="w-[min(50vw,12rem)] h-[min(50vw,12rem)] sm:w-44 sm:h-44 lg:w-[195px] lg:h-[195px] transform -rotate-90 relative z-10 overflow-visible">
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                            {currentTheme.gradientStops.map((stop, idx) => (
                                <stop key={idx} offset={stop.offset} stopColor={stop.color} />
                            ))}
                        </linearGradient>
                        <filter id={`${gradientId}_glow`} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3.5" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Trilho de sulco de profundidade */}
                    <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="16" />

                    {/* Trilho base sutil translúcido */}
                    <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />

                    {/* Gauge de precisão interno (marcas de cronômetro de alta precisão) */}
                    <circle cx="128" cy="128" r="97" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeDasharray="2 6" />

                    {/* Anel de progresso ativo com movimento fluido e acabamento luminoso */}
                    <circle
                        ref={svgCircleRef}
                        cx="128"
                        cy="128"
                        r="110"
                        fill="none"
                        stroke={`url(#${gradientId})`}
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 110}
                        strokeDashoffset={2 * Math.PI * 110}
                        filter={`url(#${gradientId}_glow)`}
                        style={{
                            transition: isRunning ? 'none' : 'stroke-dashoffset 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    />
                </svg>

                {/* Placa central com vidro acetinado escuro para contraste de leitura */}
                <div className="absolute w-[138px] h-[138px] sm:w-[152px] sm:h-[152px] lg:w-[160px] lg:h-[160px] rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)] pointer-events-none z-10" />

                {/* Conteúdo textual central do cronômetro */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                    <span 
                        ref={clockRef} 
                        className={`text-3xl sm:text-4xl lg:text-[3.25rem] font-black tracking-tight text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)] leading-none tabular-nums transition-transform duration-300 ${isRunning ? 'scale-[1.02]' : 'scale-100'}`}
                        role="timer"
                        aria-live="off"
                        aria-atomic="true"
                        aria-label={`Tempo restante: ${formatTime(timeLeft)}`}
                    >
                        {formatTime(timeLeft)}
                    </span>

                    {/* Badge fluida de status com indicador respiratório */}
                    <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full bg-black/50 border border-white/10 shadow-sm backdrop-blur-sm transition-all duration-300">
                        {isRunning ? (
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentTheme.pulsePingClass}`} />
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${currentTheme.pulseDotClass}`} />
                            </span>
                        ) : (
                            <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                                isProtocolInactive ? 'bg-white/30' : 'bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                            }`} />
                        )}
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.22em] text-white/90 drop-shadow text-center">
                            {isRunning
                                ? currentTheme.statusActive
                                : (isProtocolInactive
                                    ? 'AGUARDANDO PROTOCOLO'
                                    : (totalTime && timeLeft >= totalTime ? 'PRONTO PARA FOCO' : 'SESSÃO PAUSADA'))}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PomodoroClock;
