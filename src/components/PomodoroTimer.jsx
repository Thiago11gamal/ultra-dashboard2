import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, Lock, Unlock, Activity, AlertCircle, Brain, Zap, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'framer-motion';
import { useToast } from '../hooks/useToast';

export default function PomodoroTimer({ settings = {}, onSessionComplete, activeSubject, onFullCycleComplete, categories = [], onUpdateStudyTime, onExit, defaultTargetCycles = 1 }) {

    const safeSettings = useMemo(() => ({
        pomodoroWork: settings?.pomodoroWork || 25,
        pomodoroBreak: settings?.pomodoroBreak || 5,
        soundEnabled: settings?.soundEnabled ?? true,
        ...settings
    }), [settings]);

    const [savedState] = useState(() => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = JSON.parse(localStorage.getItem('pomodoroState'));
            if (saved &&
                activeSubject?.taskId &&
                saved.activeTaskId === activeSubject.taskId &&
                saved.sessionInstanceId === activeSubject.sessionInstanceId) {
                return saved;
            }
        } catch (_) { }
        return null;
    });

    const getSavedState = (key, defaultValue) => {
        if (savedState && savedState[key] !== undefined) return savedState[key];
        return defaultValue;
    };

    // Estados Locais
    const [mode, setMode] = useState(() => getSavedState('mode', 'work'));
    const defaultTime = useMemo(() =>
        mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (safeSettings.pomodoroBreak || 5) * 60,
        [mode, safeSettings.pomodoroWork, safeSettings.pomodoroBreak]);
    const [timeLeft, setTimeLeft] = useState(() => getSavedState('timeLeft', defaultTime));
    const [isRunning, setIsRunning] = useState(() => getSavedState('isRunning', false));

    // Estados Globais (Zustand)
    const sessions = useAppStore(state => state.appState?.pomodoro?.sessions || 1);
    const setSessions = useAppStore(state => state.setPomodoroSessions);

    const targetCycles = useAppStore(state => state.appState?.pomodoro?.targetCycles || 1);
    const setTargetCycles = useAppStore(state => state.setPomodoroTargetCycles);

    const completedCycles = useAppStore(state => state.appState?.pomodoro?.completedCycles || 0);
    const setCompletedCycles = useAppStore(state => state.setPomodoroCompletedCycles);

    const accumulatedMinutes = useAppStore(state => state.appState?.pomodoro?.accumulatedMinutes || 0);
    const setAccumulatedMinutes = useAppStore(state => state.setPomodoroAccumulatedMinutes);

    // Sincronização Absoluta por Refs (Evita renderizações desnecessárias e loops)
    const stateRefs = useRef({
        mode,
        timeLeft,
        isRunning,
        sessions,
        targetCycles,
        completedCycles,
        accumulatedMinutes
    });

    useEffect(() => {
        stateRefs.current = { mode, timeLeft, isRunning, sessions, targetCycles, completedCycles, accumulatedMinutes };
    }, [mode, timeLeft, isRunning, sessions, targetCycles, completedCycles, accumulatedMinutes]);

    const speedRef = useRef(1);
    const [speed, setSpeed] = useState(1);
    useEffect(() => { speedRef.current = speed; }, [speed]);

    const isTransitioningRef = useRef(false);
    const clockRef = useRef(null);
    const svgCircleRef = useRef(null);
    const alarmAudioRef = useRef(null);
    const showToast = useToast();

    const [isLayoutLocked, setIsLayoutLocked] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroLayoutLocked');
            return saved !== null ? JSON.parse(saved) : true;
        } catch (_) { return true; }
    });

    const [uiPosition, setUiPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroPosition');
            return saved !== null ? JSON.parse(saved) : { x: 0, y: 0 };
        } catch (_) { return { x: 0, y: 0 }; }
    });

    useEffect(() => {
        try { alarmAudioRef.current = new Audio('/sounds/alarm.wav'); } catch (_) { }
    }, []);

    const sendNotification = useCallback((title, body) => {
        if (!("Notification" in window)) return;
        if (Notification.permission === "granted") {
            new Notification(title, { body, icon: '/favicon.ico' });
        }
    }, []);

    // 1. O CORAÇÃO DO SISTEMA - TRANSIÇÃO BLINDADA
    const transitionSession = useCallback((completedMode, source = 'natural') => {
        if (isTransitioningRef.current) return;
        isTransitioningRef.current = true;

        const current = stateRefs.current;
        const isNatural = source === 'natural';
        
        // Bloqueia temporizador
        setIsRunning(false);

        if (completedMode === 'work') {
            onSessionComplete?.();

            const elapsedSeconds = (safeSettings.pomodoroWork * 60) - (isNatural ? 0 : current.timeLeft);
            const sessionMinutes = Math.floor(Math.max(0, elapsedSeconds) / 60);
            const newAccumulated = current.accumulatedMinutes + sessionMinutes;

            setAccumulatedMinutes(newAccumulated);

            // Valida se atingiu o fim
            if (current.sessions >= current.targetCycles && current.targetCycles > 0) {
                if (activeSubject && onUpdateStudyTime && newAccumulated > 0) {
                    onUpdateStudyTime(activeSubject.categoryId, newAccumulated, activeSubject.taskId);
                }

                if (isNatural) {
                    try { alarmAudioRef.current?.play().catch(() => {}); } catch (_) {}
                    sendNotification('🏆 Missão Cumprida!', `Série finalizada. ${newAccumulated} minutos registados.`);
                }

                setAccumulatedMinutes(0);
                setSessions(1);
                setCompletedCycles(0);
                setMode('work');
                setTimeLeft(safeSettings.pomodoroWork * 60);
                
                onFullCycleComplete?.(newAccumulated);
                localStorage.removeItem('pomodoroState');
                setTimeout(() => { isTransitioningRef.current = false; }, 500);
                return;
            }

            // Vai para a Pausa
            const breakTime = safeSettings.pomodoroBreak * 60;
            setMode('break');
            setTimeLeft(breakTime);
            
            if (isNatural) {
                try { alarmAudioRef.current?.play().catch(() => {}); } catch (_) {}
                sendNotification('⏰ Pomodoro Finalizado!', 'Iniciando fase de descanso.');
            }
            
        } else {
            // Volta para o Foco
            const newCompletedCycles = current.completedCycles + 1;
            setCompletedCycles(newCompletedCycles);

            if (current.sessions >= current.targetCycles && current.targetCycles > 0) {
                if (activeSubject && onUpdateStudyTime && current.accumulatedMinutes > 0) {
                    onUpdateStudyTime(activeSubject.categoryId, current.accumulatedMinutes, activeSubject.taskId);
                }

                if (isNatural) {
                    try { alarmAudioRef.current?.play().catch(() => {}); } catch (_) {}
                    sendNotification('🏆 Missão Cumprida!', `Série finalizada.`);
                }

                setAccumulatedMinutes(0);
                setSessions(1);
                setCompletedCycles(0);
                setMode('work');
                setTimeLeft(safeSettings.pomodoroWork * 60);
                
                onFullCycleComplete?.(current.accumulatedMinutes);
                localStorage.removeItem('pomodoroState');
                setTimeout(() => { isTransitioningRef.current = false; }, 500);
                return;
            }

            const newSessions = current.sessions + 1;
            setSessions(newSessions);
            setMode('work');
            setTimeLeft(safeSettings.pomodoroWork * 60);

            if (isNatural) {
                try { alarmAudioRef.current?.play().catch(() => {}); } catch (_) {}
                sendNotification('☕ Pausa Finalizada!', 'Retornando ao foco.');
            }
        }

        setTimeout(() => { isTransitioningRef.current = false; }, 500);
    }, [safeSettings, onSessionComplete, activeSubject, onUpdateStudyTime, onFullCycleComplete, setAccumulatedMinutes, setSessions, setCompletedCycles, sendNotification]);


    // 2. CONTROLO MANUAL DO OBJETIVO (Resolve o Loop do Botão de Menos)
    const handleDecreaseCycles = () => {
        if (!activeSubject) return;
        const current = stateRefs.current;
        const newTarget = Math.max(current.completedCycles < 1 ? 1 : current.completedCycles, current.targetCycles - 1);
        setTargetCycles(newTarget);

        // A verificação é feita apenas no momento do clique (imperativo)
        if (current.mode === 'break' && current.sessions >= newTarget) {
            transitionSession('break', 'forced');
        }
    };

    // 3. MOTOR DE ANIMAÇÃO OTIMIZADO
    const handleTimerCompleteRef = useRef(() => transitionSession(stateRefs.current.mode, 'natural'));
    useEffect(() => { handleTimerCompleteRef.current = () => transitionSession(stateRefs.current.mode, 'natural'); }, [transitionSession, mode]);

    useEffect(() => {
        let rafId;
        let lastTickTime = performance.now();

        if (isRunning && timeLeft > 0) {
            const currentTotalTime = mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;
            const circumference = 2 * Math.PI * 110;
            let lastDisplayedSecond = Math.ceil(timeLeft);

            const tick = (now) => {
                const deltaMs = now - lastTickTime;
                lastTickTime = now;

                const currentRef = stateRefs.current;
                const newTime = Math.max(0, currentRef.timeLeft - (deltaMs / 1000) * speedRef.current);
                currentRef.timeLeft = newTime; // Atualiza a ref sem renderizar

                const fraction = newTime / (currentTotalTime || 1);
                const displaySecond = Math.ceil(newTime);

                // Manipulação direta do DOM para performance máxima
                if (clockRef.current && displaySecond !== lastDisplayedSecond) {
                    const mins = Math.floor(displaySecond / 60);
                    const secs = displaySecond % 60;
                    clockRef.current.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                }

                if (svgCircleRef.current) {
                    svgCircleRef.current.style.strokeDashoffset = circumference * fraction;
                }

                const s = currentRef.sessions;
                if (mode === 'work') {
                    const el = document.getElementById(`work-fill-${s}`);
                    if (el) el.style.width = `${(1 - fraction) * 100}%`;
                } else if (mode === 'break') {
                    const ball = document.getElementById(`break-ball-${s}`);
                    const wave = document.getElementById(`break-wave-${s}`);
                    const fillHeight = (1 - fraction) * 100;
                    if (ball) ball.style.height = `${fillHeight}%`;
                    if (wave) wave.style.top = `${100 - fillHeight - 150}%`;
                }

                if (displaySecond !== lastDisplayedSecond || newTime <= 0) {
                    lastDisplayedSecond = displaySecond;
                    setTimeLeft(newTime); // Sincroniza estado para botões

                    if (newTime <= 0) {
                        cancelAnimationFrame(rafId);
                        handleTimerCompleteRef.current();
                        return;
                    }
                }
                rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
        }
        return () => cancelAnimationFrame(rafId);
    }, [isRunning, mode, safeSettings]);

    // Funções Utilitárias
    const reset = () => {
        if (isTransitioningRef.current) return;
        const current = stateRefs.current;
        const resetTime = current.mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;
        
        // Sincronização imediata para evitar race conditions
        stateRefs.current.isRunning = false;
        stateRefs.current.timeLeft = resetTime;
        
        setIsRunning(false);
        setTimeLeft(resetTime);
        showToast('Fase reiniciada', 'info');

        if (clockRef.current) {
            const mins = Math.floor(resetTime / 60);
            const secs = resetTime % 60;
            clockRef.current.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);
    };

    const handleManualExit = () => {
        const current = stateRefs.current;
        let finalMinutes = current.accumulatedMinutes;
        
        if (current.mode === 'work') {
            const totalWorkSeconds = safeSettings.pomodoroWork * 60;
            finalMinutes += Math.floor(Math.max(0, totalWorkSeconds - current.timeLeft) / 60);
        }

        if (finalMinutes > 0 && activeSubject && onUpdateStudyTime) {
            onUpdateStudyTime(activeSubject.categoryId, finalMinutes, activeSubject.taskId);
            showToast(`Salvamento parcial: ${finalMinutes} minutos.`, 'success');
        }
        
        setAccumulatedMinutes(0);
        localStorage.removeItem('pomodoroState');
        onExit();
    };

    const formatTime = (seconds) => {
        const secsInt = Math.ceil(Math.max(0, seconds));
        return `${Math.floor(secsInt / 60).toString().padStart(2, '0')}:${(secsInt % 60).toString().padStart(2, '0')}`;
    };

    const totalTime = mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;

    return (
        <div className="w-full relative min-h-[80vh] flex flex-col items-center">
            <motion.div
                drag={!isLayoutLocked}
                dragMomentum={true}
                animate={uiPosition}
                onDragEnd={(_, info) => setUiPosition({ x: uiPosition.x + info.offset.x, y: uiPosition.y + info.offset.y })}
                className={`w-full max-w-3xl space-y-6 relative flex flex-col items-center ${!isLayoutLocked ? 'cursor-grab z-[1000]' : 'z-50'}`}
            >
                <div className="relative flex items-center justify-center py-2 w-full px-4">
                    <div className="flex-1 flex justify-center bg-transparent">
                        {activeSubject ? (
                            <motion.div
                                initial={{ y: -5, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="relative flex items-center gap-6 w-full bg-[#b08e6b] border-2 border-[#94785a] rounded-xl p-8 shadow-xl overflow-hidden group"
                            >
                                <div className="w-16 h-16 rounded-full bg-white border-2 border-[#d9c5b2] flex items-center justify-center text-[#2d1a12] shadow-sm">
                                    <div className="text-2xl font-black">b</div>
                                </div>
                                <div className="flex flex-col text-left flex-1 min-w-0">
                                    <h2 className="text-4xl font-black text-[#2d1a12] tracking-tight truncate">{activeSubject.task}</h2>
                                    <span className="text-[12px] font-black text-[#8b5e3c] uppercase tracking-[0.2em] truncate">MATÉRIA: {activeSubject.category}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setIsLayoutLocked(!isLayoutLocked); }} className="absolute right-8 text-[#2d1a12]/40 hover:text-[#2d1a12] cursor-pointer">
                                    {isLayoutLocked ? <Lock size={24} /> : <Unlock size={24} />}
                                </button>
                            </motion.div>
                        ) : mode === 'break' ? (
                            <div className="relative flex items-center justify-center gap-4 w-full bg-emerald-900/40 border border-emerald-500/30 rounded-xl py-6 shadow-[0_20px_50px_rgba(16,185,129,0.1)]">
                                <Zap size={24} className="text-emerald-400 animate-pulse" />
                                <span className="text-xl font-black text-emerald-400 tracking-widest uppercase">Recuperação Neural ☕</span>
                            </div>
                        ) : (
                            <div onClick={handleManualExit} className="w-full bg-red-950/20 border border-dashed border-red-500/30 rounded-xl py-4 flex items-center justify-center gap-4 cursor-pointer hover:bg-red-900/40">
                                <AlertCircle size={20} className="text-red-500" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-red-500/60 uppercase">Inicialização Necessária</span>
                                    <h2 className="text-sm font-black text-red-500">SELECIONE UM VETOR DE ESTUDO</h2>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div
                    style={{ backgroundImage: 'url(/wood-texture.png)', backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)' }}
                    className="w-full border-[6px] border-[#3f2e26] pt-12 pb-10 px-10 rounded-xl relative overflow-hidden flex flex-col items-center bg-[#2a1f1a]"
                >
                    <div className="flex items-center gap-6 mb-12 z-30">
                        <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${mode === 'work' ? 'text-white' : 'text-white/40'}`}>FOCO</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${mode === 'break' ? 'text-white' : 'text-white/40'}`}>PAUSA</span>
                    </div>

                    <div className="relative mt-12 mb-8 rounded-full">
                        <svg className="w-64 h-64 transform -rotate-90 relative z-10">
                            <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" strokeLinecap="round" />
                            <defs>
                                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={mode === 'work' ? '#3b82f6' : '#22c55e'} />
                                    <stop offset="100%" stopColor={mode === 'work' ? '#2563eb' : '#10b981'} />
                                </linearGradient>
                            </defs>
                            <circle
                                ref={svgCircleRef}
                                cx="128" cy="128" r="110" fill="none"
                                stroke="url(#timerGradient)"
                                strokeWidth="14"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 110}
                                style={{ strokeDashoffset: isRunning ? undefined : (2 * Math.PI * 110) * (timeLeft / (totalTime || 1)) }}
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <span ref={clockRef} className="text-7xl font-black tracking-tight text-white drop-shadow-2xl">{formatTime(timeLeft)}</span>
                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white mt-2">
                                {isRunning ? (mode === 'work' ? 'PROTOCOL Foco' : 'Recuperação') : 'SESSÃO PAUSADA'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 items-center justify-center gap-4 z-10 mt-10 w-full max-w-2xl px-6">
                        <div className="flex flex-col items-center gap-3">
                            <button onClick={reset} className="w-16 h-16 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/5 text-white flex items-center justify-center shadow-lg"><RotateCcw size={24} /></button>
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">REINICIAR</span>
                        </div>

                        <div className="flex flex-col items-center gap-4 scale-110">
                            <button
                                onClick={() => {
                                    if (mode === 'work' && !activeSubject) return;
                                    setIsRunning(!isRunning);
                                }}
                                className={`w-32 h-32 rounded-full flex items-center justify-center border-4 transition-colors ${isRunning ? 'bg-stone-100 text-black border-white' : 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_40px_rgba(34,197,94,0.3)]'}`}
                            >
                                {isRunning ? <Pause size={56} /> : <Play size={56} className="ml-2" />}
                            </button>
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{isRunning ? 'PAUSAR' : 'INICIAR'}</span>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <div className="flex bg-black/30 p-2 rounded-2xl border border-white/5">
                                {[1, 10, 100].map(s => (
                                    <button key={s} onClick={() => setSpeed(s)} className={`w-10 h-8 rounded-lg text-[10px] font-black ${speed === s ? 'bg-white text-black' : 'text-white/40'}`}>{s}X</button>
                                ))}
                            </div>
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">VELOCIDADE</span>
                        </div>
                    </div>
                </div>

                <div className="w-full px-10 py-8 rounded-xl bg-[#b08e6b] border-2 border-[#94785a] shadow-xl">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[9px] font-black text-[#2d1a12]/60 uppercase tracking-[0.3em]">PROGRESSO DOS CICLOS</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <button onClick={handleDecreaseCycles} disabled={!activeSubject || targetCycles <= 1} className="w-8 h-8 rounded-lg bg-white/10 text-[#2d1a12] font-bold">-</button>
                                    <button onClick={() => setTargetCycles(targetCycles + 1)} disabled={!activeSubject} className="w-8 h-8 rounded-lg bg-white/10 text-[#2d1a12] font-bold">+</button>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-[#2d1a12] tabular-nums">{completedCycles}</span>
                                    <span className="text-sm font-black text-[#2d1a12]/40">/ {targetCycles}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-1 items-center gap-1.5 h-16 px-4">
                            {Array.from({ length: targetCycles || 1 }).map((_, i) => (
                                <React.Fragment key={i}>
                                    <div className="flex-1 relative">
                                        <div className="bg-[#2d1a12]/10 h-3 rounded-full overflow-hidden">
                                            <div
                                                id={`work-fill-${i + 1}`}
                                                className="h-full bg-blue-500 transition-all duration-300"
                                                style={{ width: (i < sessions - 1 || (i === sessions - 1 && mode === 'break')) ? '100%' : '0%' }}
                                            />
                                        </div>
                                    </div>
                                    {i < (targetCycles || 1) - 1 && (
                                        <div className="relative w-6 h-6 rounded-full bg-[#2d1a12]/10 border-2 border-[#2d1a12]/20 overflow-hidden shrink-0">
                                            <div
                                                id={`break-ball-${i + 1}`}
                                                className="absolute bottom-0 w-full bg-emerald-500 transition-all duration-300"
                                                style={{ height: (i < sessions - 1) ? '100%' : (sessions === i + 1 && mode === 'break' ? `${(1 - timeLeft / totalTime) * 100}%` : '0%') }}
                                            />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
