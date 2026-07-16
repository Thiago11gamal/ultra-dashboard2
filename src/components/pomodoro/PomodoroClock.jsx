import React from 'react';

const formatTime = (seconds) => {
    const secsInt = Math.ceil(Math.max(0, seconds));
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export function PomodoroClock({
    speed,
    setSpeed,
    isProtocolInactive,
    mode,
    isRunning,
    timeLeft,
    safeSettings,
    svgCircleRef,
    clockRef
}) {
    return (
        <>
            <div className="absolute top-4 right-6 z-[60]">
                <div className="flex bg-[#1a1411] p-1 rounded-2xl border border-[#3f2e26]/80 shadow-inner backdrop-blur-md">
                    {[1, 10, 100].map(s => (
                        <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            disabled={isProtocolInactive}
                            className={`px-3 h-8 rounded-xl text-[11px] font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed ${speed === s ? 'bg-[#b08e6b] text-[#2d1a12] shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                        >
                            {s}X
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4 mb-10 z-30 opacity-60">
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-white">FOCO</span>
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-white">PAUSA</span>
            </div>

            {/* BUG-11 FIX: Adicionado viewBox para escalar corretamente em mobile */}
            <div className="relative mt-12 mb-8 rounded-full">
                <svg viewBox="0 0 256 256" className="w-[min(74vw,16rem)] h-[min(74vw,16rem)] sm:w-64 sm:h-64 transform -rotate-90 relative z-10">
                    <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" strokeLinecap="round" />
                    <defs>
                        <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={mode === 'work' ? '#3b82f6' : (mode === 'long_break' ? '#a855f7' : '#22c55e')} />
                            <stop offset="100%" stopColor={mode === 'work' ? '#2563eb' : (mode === 'long_break' ? '#9333ea' : '#10b981')} />
                        </linearGradient>
                    </defs>
                    {/* BUG-1 FIX: Fórmula corrigida — offset = CIRCUMFERENCE * fracção restante.
                       Quando timeLeft === totalTime, offset = CIRCUMFERENCE (anel vazio = nada avançado).
                       Quando timeLeft === 0, offset = 0 (anel cheio = tudo completado). */}
                    <circle
                        ref={svgCircleRef}
                        cx="128" cy="128" r="110" fill="none"
                        stroke="url(#timerGradient)"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 110}
                        style={{ strokeDashoffset: isRunning ? undefined : (2 * Math.PI * 110) * (timeLeft / ((mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (mode === 'long_break' ? (safeSettings.pomodoroLongBreak || 15) * 60 : (safeSettings.pomodoroBreak || 5) * 60)) || 1)) }}
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <span ref={clockRef} className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white drop-shadow-2xl leading-none tabular-nums">{formatTime(timeLeft)}</span>
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] sm:tracking-[0.4em] text-white mt-2 text-center px-2">
                        {isRunning ? (mode === 'work' ? 'PROTOCOL Foco' : (mode === 'long_break' ? 'Pausa Longa' : 'Recuperação')) : 'SESSÃO PAUSADA'}
                    </span>
                </div>
            </div>
        </>
    );
}
