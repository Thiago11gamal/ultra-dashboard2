import React, { useId, useMemo, useState, useEffect, useRef } from 'react';
import { formatTime, calculateETA, SPEED_OPTIONS, POMODORO_PRESETS } from '../../utils/pomodoroHelpers';
import { useLivePomodoroTimeLeft } from '../../utils/pomodoroLiveStore';
import { Maximize2, Minimize2, Volume2, VolumeX, Bell, BellOff, SlidersHorizontal, Zap, Check, X } from 'lucide-react';

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
        statusActive: 'Foco'
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

export const PomodoroClock = React.memo(function PomodoroClock({
    speed,
    setSpeed,
    isProtocolInactive,
    mode,
    isRunning,
    timeLeft,
    totalTime,
    safeSettings,
    svgCircleRef,
    clockRef,
    isFullscreen,
    toggleFullscreen,
    isMuted,
    toggleMute,
    isNotifEnabled,
    toggleNotifications,
    onSelectPreset,
    activePresetId,
    onAdjustTime,
    autoAdvance = false,
    onToggleAutoAdvance,
    onSaveCustomSettings,
    onTestSound
}) {
    const rawId = useId();
    const gradientId = `timerGradient_${rawId.replace(/:/g, '')}`;
    const [showConfig, setShowConfig] = useState(false);
    const [draftWork, setDraftWork] = useState(() => String(safeSettings?.pomodoroWork || 25));
    const [draftBreak, setDraftBreak] = useState(() => String(safeSettings?.pomodoroBreak || 5));
    const [draftLongBreak, setDraftLongBreak] = useState(() => String(safeSettings?.pomodoroLongBreak || 15));
    const [draftLongBreakAfter, setDraftLongBreakAfter] = useState(() => String(safeSettings?.longBreakAfter || 4));
    const configPopoverRef = useRef(null);

    const openConfig = () => {
        if (!showConfig) {
            setDraftWork(String(safeSettings?.pomodoroWork || 25));
            setDraftBreak(String(safeSettings?.pomodoroBreak || 5));
            setDraftLongBreak(String(safeSettings?.pomodoroLongBreak || 15));
            setDraftLongBreakAfter(String(safeSettings?.longBreakAfter || 4));
        }
        setShowConfig(prev => !prev);
    };

    useEffect(() => {
        if (!showConfig) return undefined;
        const onClickOutside = (e) => {
            if (configPopoverRef.current && !configPopoverRef.current.contains(e.target)) {
                setShowConfig(false);
            }
        };
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                setShowConfig(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        window.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('mousedown', onClickOutside);
            window.removeEventListener('keydown', onKey, true);
        };
    }, [showConfig]);

    const handleSubmitCustomSettings = (e) => {
        e.preventDefault();
        if (typeof onSaveCustomSettings !== 'function') return;
        const ok = onSaveCustomSettings({
            work: Number(draftWork),
            breakMin: Number(draftBreak),
            longBreak: Number(draftLongBreak),
            longBreakAfter: Number(draftLongBreakAfter)
        });
        if (ok !== false) {
            setShowConfig(false);
        }
    };

    const currentTheme = useMemo(() => {
        return CLOCK_THEMES[mode] || CLOCK_THEMES.work;
    }, [mode]);

    const liveTimeLeft = useLivePomodoroTimeLeft(timeLeft, isRunning);

    const etaString = useMemo(() => {
        if (!isRunning || !Number.isFinite(liveTimeLeft) || liveTimeLeft <= 0) return null;
        return calculateETA(liveTimeLeft, speed);
    }, [isRunning, liveTimeLeft, speed]);

    const statusLabel = useMemo(() => {
        if (isRunning) {
            if (etaString) {
                if (mode === 'work') return `FOCO • ATÉ ${etaString}`;
                if (mode === 'long_break') return `PAUSA LONGA • ATÉ ${etaString}`;
                return `PAUSA • ATÉ ${etaString}`;
            }
            return currentTheme.statusActive;
        }
        if (isProtocolInactive) {
            return 'AGUARDANDO INÍCIO';
        }
        if (totalTime && liveTimeLeft >= totalTime) {
            return (mode === 'break' || mode === 'long_break') ? 'INTERVALO PRONTO' : 'PRONTO PARA FOCO';
        }
        return `PAUSADO • ${formatTime(liveTimeLeft)}`;
    }, [isRunning, etaString, mode, currentTheme.statusActive, isProtocolInactive, totalTime, liveTimeLeft]);

    return (
        <div className="w-full flex flex-col items-center select-none">
            {/* Barra superior de controles do relógio */}
            <div className="w-full flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 relative z-30">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className={`text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${mode === 'work' ? 'text-blue-300 font-extrabold drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-white/40'}`}>
                        FOCO
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <span className={`text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${mode !== 'work' ? (mode === 'long_break' ? 'text-violet-300 font-extrabold drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'text-emerald-300 font-extrabold drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]') : 'text-white/40'}`}>
                        PAUSA
                    </span>
                </div>

                <div className="flex items-center flex-wrap gap-1 sm:gap-2">
                    {/* Seletor de Presets Rápidos */}
                    {typeof onSelectPreset === 'function' && (
                        <div className="flex items-center gap-0.5 sm:gap-1 bg-black/60 p-0.5 rounded-lg border border-[#3f2e26]/80 shadow-inner backdrop-blur-md" title={isRunning ? "Pause o cronômetro para alterar a cadência" : "Cadência de Foco / Pausa"}>
                            {POMODORO_PRESETS.map(preset => {
                                const isCurrent = activePresetId === preset.id ||
                                    (Number(safeSettings?.pomodoroWork) === preset.work && Number(safeSettings?.pomodoroBreak) === preset.break);
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => onSelectPreset(preset)}
                                        aria-label={`Preset ${preset.name} ${preset.label}`}
                                        className={`px-1.5 sm:px-2 h-6 sm:h-7 rounded-md text-[9px] sm:text-[10px] font-black transition-all duration-200 active:scale-95 ${
                                            isCurrent
                                                ? 'bg-[#b08e6b] text-[#2d1a12] shadow-sm font-black scale-[1.02]'
                                                : isRunning
                                                    ? 'text-white/30 cursor-not-allowed'
                                                    : 'text-white/50 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                            {activePresetId === 'custom' && (
                                <span
                                    className="px-1.5 sm:px-2 h-6 sm:h-7 rounded-md text-[9px] sm:text-[10px] font-black bg-[#b08e6b] text-[#2d1a12] shadow-sm flex items-center justify-center"
                                    title="Cadência personalizada nas Configurações"
                                >
                                    {safeSettings?.pomodoroWork || 25}/{safeSettings?.pomodoroBreak || 5}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Ajuste Rápido de Tempo (-1m / +1m / +5m) */}
                    {!isProtocolInactive && typeof onAdjustTime === 'function' && (
                        <div className="flex items-center gap-0.5 bg-black/60 p-0.5 rounded-lg border border-[#3f2e26]/80 shadow-inner backdrop-blur-md" title="Ajustar tempo do bloco atual">
                            <button
                                type="button"
                                onClick={() => onAdjustTime(-60)}
                                disabled={Number(liveTimeLeft) <= 60}
                                aria-label="Remover 1 minuto"
                                title="Remover 1 minuto do bloco atual"
                                className="px-1.5 h-6 sm:h-7 rounded-md text-[9px] sm:text-[10px] font-black text-rose-300/90 hover:text-white hover:bg-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                            >
                                -1m
                            </button>
                            <button
                                type="button"
                                onClick={() => onAdjustTime(60)}
                                aria-label="Adicionar 1 minuto"
                                title="Adicionar +1 minuto ao bloco atual"
                                className="px-1.5 h-6 sm:h-7 rounded-md text-[9px] sm:text-[10px] font-black text-emerald-300/90 hover:text-white hover:bg-emerald-500/20 transition-all active:scale-95"
                            >
                                +1m
                            </button>
                            <button
                                type="button"
                                onClick={() => onAdjustTime(300)}
                                aria-label="Adicionar 5 minutos"
                                title="Adicionar +5 minutos ao bloco atual"
                                className="px-1.5 h-6 sm:h-7 rounded-md text-[9px] sm:text-[10px] font-black text-emerald-300/90 hover:text-white hover:bg-emerald-500/20 transition-all active:scale-95"
                            >
                                +5m
                            </button>
                        </div>
                    )}

                    {/* Seletor de Velocidade (Com indicação de Turbo / Teste) */}
                    <div className="flex gap-1 bg-black/60 p-0.5 rounded-lg border border-[#3f2e26]/80 shadow-inner backdrop-blur-md">
                        {SPEED_OPTIONS.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSpeed(s)}
                                aria-label={`Velocidade ${s}x`}
                                title={s > 1 ? `Modo Turbo ${s}x (Teste)` : "Velocidade Real (1x)"}
                                className={`px-2 sm:px-2.5 h-6 sm:h-7 rounded-md text-[11px] font-black transition-all duration-200 active:scale-95 ${speed === s ? 'bg-[#b08e6b] text-[#2d1a12] shadow-sm font-black scale-[1.02]' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                            >
                                {s}X
                            </button>
                        ))}
                    </div>

                    {/* Configurações Rápidas do Cronômetro (Tempos personalizados & Auto-avanço) */}
                    {(typeof onSaveCustomSettings === 'function' || typeof onToggleAutoAdvance === 'function') && (
                        <div className="relative" ref={configPopoverRef}>
                            <button
                                type="button"
                                onClick={openConfig}
                                aria-label="Configurações do cronômetro"
                                aria-expanded={showConfig}
                                className={`relative p-1 h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center border active:scale-90 rounded-lg transition-all shadow-sm backdrop-blur-md ${
                                    showConfig
                                        ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                                        : 'bg-black/40 border-white/10 text-slate-300 hover:text-white hover:border-white/20'
                                }`}
                                title="Personalizar tempos e auto-avanço"
                            >
                                <SlidersHorizontal size={13} />
                                {autoAdvance && (
                                    <span
                                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black"
                                        title="Auto-avanço ativo"
                                    />
                                )}
                            </button>

                            {showConfig && (
                                <div
                                    className="absolute right-0 top-9 z-50 w-64 sm:w-72 rounded-2xl bg-[#0b1020]/98 border border-white/15 shadow-2xl backdrop-blur-xl p-3.5 text-left"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">
                                            Ajustes do Cronômetro
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowConfig(false)}
                                            aria-label="Fechar ajustes"
                                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>

                                    {typeof onSaveCustomSettings === 'function' && (
                                        <form onSubmit={handleSubmitCustomSettings} className="space-y-2.5">
                                            <div className="grid grid-cols-2 gap-2">
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Foco (min)</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={240}
                                                        disabled={isRunning}
                                                        value={draftWork}
                                                        onChange={(e) => setDraftWork(e.target.value)}
                                                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-400 disabled:opacity-40"
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Pausa (min)</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={120}
                                                        disabled={isRunning}
                                                        value={draftBreak}
                                                        onChange={(e) => setDraftBreak(e.target.value)}
                                                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-400 disabled:opacity-40"
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Pausa Longa</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={180}
                                                        disabled={isRunning}
                                                        value={draftLongBreak}
                                                        onChange={(e) => setDraftLongBreak(e.target.value)}
                                                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-400 disabled:opacity-40"
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Longa a cada</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        disabled={isRunning}
                                                        value={draftLongBreakAfter}
                                                        onChange={(e) => setDraftLongBreakAfter(e.target.value)}
                                                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-400 disabled:opacity-40"
                                                    />
                                                </label>
                                            </div>
                                            {isRunning && (
                                                <p className="text-[9.5px] text-amber-300/80 font-medium">
                                                    Pause o cronômetro para alterar os tempos.
                                                </p>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={isRunning}
                                                className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <Check size={12} />
                                                <span>Aplicar Tempos</span>
                                            </button>
                                        </form>
                                    )}

                                    <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2">
                                        {typeof onToggleAutoAdvance === 'function' && (
                                            <button
                                                type="button"
                                                onClick={onToggleAutoAdvance}
                                                role="switch"
                                                aria-checked={autoAdvance}
                                                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-colors"
                                            >
                                                <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-200">
                                                    <Zap size={12} className={autoAdvance ? 'text-emerald-400' : 'text-slate-500'} />
                                                    <span>Auto-avançar fases</span>
                                                </span>
                                                <span className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${autoAdvance ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'}`}>
                                                    <span className="w-3 h-3 rounded-full bg-white shadow-sm" />
                                                </span>
                                            </button>
                                        )}

                                        {typeof onTestSound === 'function' && (
                                            <button
                                                type="button"
                                                onClick={onTestSound}
                                                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] font-bold text-slate-300 hover:text-white transition-colors"
                                            >
                                                <Volume2 size={12} className="text-emerald-400" />
                                                <span>Testar Alarme Sonoro</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Botão Notificações do Navegador */}
                    {typeof toggleNotifications === 'function' && (
                        <button
                            type="button"
                            onClick={toggleNotifications}
                            className={`p-1 h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center border active:scale-90 rounded-lg transition-all shadow-sm backdrop-blur-md ${
                                isNotifEnabled
                                    ? 'bg-indigo-600/60 border-indigo-400 text-indigo-200 hover:bg-indigo-600'
                                    : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                            }`}
                            title={isNotifEnabled ? "Notificações do navegador ativas" : "Ativar notificações na área de trabalho"}
                        >
                            {isNotifEnabled ? <Bell size={13} className="text-amber-300" /> : <BellOff size={13} />}
                        </button>
                    )}

                    {/* Botão Tela Cheia (Zen Mode) */}
                    {typeof toggleFullscreen === 'function' && (
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="p-1 h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center bg-black/40 border border-white/10 hover:border-white/20 active:scale-90 rounded-lg text-slate-300 hover:text-white transition-all shadow-sm backdrop-blur-md"
                            title={isFullscreen ? "Sair da tela cheia (F)" : "Modo Zen / Tela cheia (F)"}
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
                            title={isMuted ? "Ativar som (M)" : "Silenciar alarme (M)"}
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
                    </defs>

                    {/* Trilho de sulco de profundidade */}
                    <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="16" />

                    {/* Trilho base sutil translúcido */}
                    <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />

                    {/* Gauge de precisão interno (marcas de cronômetro de alta precisão) */}
                    <circle cx="128" cy="128" r="97" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeDasharray="2 6" />

                    {/* Anel de progresso ativo com movimento fluido sem filtro feGaussianBlur por frame */}
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
                        aria-label={`Tempo restante: ${formatTime(liveTimeLeft)}`}
                    >
                        {formatTime(liveTimeLeft)}
                    </span>

                    {/* Badge fluida de status com indicador respiratório e previsão em tempo real */}
                    <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border border-white/10 shadow-sm backdrop-blur-sm transition-all duration-300">
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
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.16em] sm:tracking-[0.18em] text-white/90 drop-shadow text-center max-w-[130px] sm:max-w-[155px] truncate px-0.5">
                            {statusLabel}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default PomodoroClock;
