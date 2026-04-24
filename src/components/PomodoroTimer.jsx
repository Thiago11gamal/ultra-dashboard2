import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, Lock, Unlock, AlertCircle, Zap } from 'lucide-react';
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
                saved.activeTaskId === activeSubject.taskId) {
                return saved;
            }
        } catch (_) { }
        return null;
    });

    const getSavedState = (key, defaultValue) => {
        if (savedState && savedState[key] !== undefined) return savedState[key];
        return defaultValue;
    };

    // Estados Globais (Zustand)
    const mode = useAppStore(state => state.appState?.pomodoro?.mode || 'work');
    const sessions = useAppStore(state => state.appState?.pomodoro?.sessions || 1);
    const targetCycles = useAppStore(state => state.appState?.pomodoro?.targetCycles || 1);
    const setTargetCycles = useAppStore(state => state.setPomodoroTargetCycles);
    const completedCycles = useAppStore(state => state.appState?.pomodoro?.completedCycles || 0);
    const accumulatedMinutes = useAppStore(state => state.appState?.pomodoro?.accumulatedMinutes || 0);
    const setAccumulatedMinutes = useAppStore(state => state.setPomodoroAccumulatedMinutes);
    const completePomodoroPhase = useAppStore(state => state.completePomodoroPhase);
    const rewindPomodoroPhase = useAppStore(state => state.rewindPomodoroPhase);

    // Estados Locais
    const initialTime = mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (safeSettings.pomodoroBreak || 5) * 60;
    const [timeLeft, setTimeLeft] = useState(() => getSavedState('timeLeft', initialTime));
    const [isRunning, setIsRunning] = useState(() => getSavedState('isRunning', false));
    const [speed, setSpeed] = useState(1);

    // Refs de Controle e Performance
    const stateRefs = useRef({
        mode,
        timeLeft,
        isRunning,
        sessions,
        targetCycles,
        completedCycles,
        accumulatedMinutes
    });

    // CORREÇÃO 1: Remoção do timeLeft da dependência de sincronização para evitar saltos no tempo
    useEffect(() => {
        stateRefs.current = { 
            ...stateRefs.current, // Mantém o timeLeft intacto sob o controlo exclusivo do motor de animação
            mode, isRunning, sessions, targetCycles, completedCycles, accumulatedMinutes 
        };
    }, [mode, isRunning, sessions, targetCycles, completedCycles, accumulatedMinutes]);

    const speedRef = useRef(1);
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

    // 🎯 BROADCAST CHANNEL (Sincronização Multi-Aba com Proteção)
    useEffect(() => {
        let channel = null;
        try {
            channel = new BroadcastChannel('pomodoro_sync');
            channel.onmessage = (event) => {
                if (event.data?.type === 'START_SESSION' && event.data?.tabId !== window.name) {
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;
                }
            };
        } catch (e) {
            console.warn('[Pomodoro] BroadcastChannel not supported or failed:', e);
        }
        return () => {
            try { channel?.close(); } catch (_) { }
        };
    }, []);

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'pomodoroState' && e.newValue) {
                try {
                    const newState = JSON.parse(e.newValue);
                    if (newState && newState.activeTaskId === activeSubject?.taskId) {
                        stateRefs.current.timeLeft = newState.timeLeft ?? stateRefs.current.timeLeft;
                        stateRefs.current.isRunning = newState.isRunning ?? false;
                        if (!newState.isRunning) setIsRunning(false);
                    }
                } catch (err) {
                    console.error('[Pomodoro] Failed to parse storage sync:', err);
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [activeSubject?.taskId]);

    useEffect(() => {
        try { alarmAudioRef.current = new Audio('/sounds/alarm.wav'); } catch (_) { }
    }, []);

    const savePomodoroState = useCallback((overrides = {}) => {
        if (!activeSubject?.taskId) return;
        try {
            const current = stateRefs.current;
            const stateToSave = {
                activeTaskId: activeSubject.taskId,
                mode: current.mode,
                timeLeft: current.timeLeft,
                isRunning: current.isRunning,
                sessions: current.sessions,
                completedCycles: current.completedCycles,
                accumulatedMinutes: current.accumulatedMinutes,
                savedAt: Date.now(),
                ...overrides
            };
            localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
        } catch (e) {
            console.error('[Pomodoro] Critical: Failed to save state to localStorage:', e);
        }
    }, [activeSubject]);

    // PROTEÇÃO: Salva o estado ao desmontar o componente para evitar perda de tempo
    useEffect(() => {
        return () => {
            if (stateRefs.current.isRunning) {
                savePomodoroState({ isRunning: false });
            }
        };
    }, [savePomodoroState]);

    // 🎯 TRANSIÇÃO DE SESSÃO COM PREVENÇÃO DE VAZAMENTO DE DADOS
    const transitionSession = useCallback((completedMode, source = 'natural') => {
        if (isTransitioningRef.current) return;
        isTransitioningRef.current = true;

        setIsRunning(false);
        stateRefs.current.isRunning = false;

        const isManual = source !== 'natural';

        if (source === 'natural' && safeSettings.soundEnabled) {
            try { alarmAudioRef.current?.play().catch(() => { }); } catch (_) { }
        }

        // CORREÇÃO 2: Capturar o tempo exato ANTES do Zustand zerar tudo no completePomodoroPhase
        const currentSessions = stateRefs.current.sessions;
        const currentTarget = stateRefs.current.targetCycles;
        const isEndingCycle = currentSessions >= currentTarget && stateRefs.current.mode === 'work';
        
        // Se a sessão de trabalho terminou naturalmente, calculamos os minutos finais a gravar
        const sessionMinutes = (completedMode === 'work' && !isManual) ? (safeSettings.pomodoroWork || 25) : 0;
        const finalMinutes = stateRefs.current.accumulatedMinutes + sessionMinutes;

        // Grava o tempo fisicamente no histórico caso o ciclo esteja a terminar
        if (isEndingCycle && onUpdateStudyTime && activeSubject) {
            onUpdateStudyTime(activeSubject.categoryId, finalMinutes, activeSubject.taskId);
        }

        completePomodoroPhase(isManual);

        setTimeout(() => {
            // CORREÇÃO 3: Dispara o Callback de Ciclo Completo (que avança a Fila Neural)
            if (isEndingCycle && onFullCycleComplete) {
                onFullCycleComplete(finalMinutes);
            }

            const newState = useAppStore.getState().appState.pomodoro;
            const resetTime = newState.mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;
            
            setTimeLeft(resetTime);
            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = newState.mode;

            if (clockRef.current) {
                const mins = Math.floor(resetTime / 60);
                const secs = resetTime % 60;
                clockRef.current.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
            if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);

            savePomodoroState({ isRunning: false, timeLeft: resetTime, mode: newState.mode });
            
            try {
                const channel = new BroadcastChannel('pomodoro_sync');
                channel.postMessage({ type: isManual ? 'PHASE_SKIP' : 'PHASE_COMPLETE', toMode: newState.mode, tabId: window.name });
                channel.close();
            } catch(_) {}

            isTransitioningRef.current = false;
        }, 50);
    }, [safeSettings, completePomodoroPhase, savePomodoroState, onUpdateStudyTime, activeSubject, onFullCycleComplete]);

    // 🎯 MOTOR DE ANIMAÇÃO (60FPS com Shielding)
    useEffect(() => {
        let rafId;
        let lastTickTime = performance.now();
        let stallCounter = 0;

        const tick = (now) => {
            const deltaMs = now - lastTickTime;
            lastTickTime = now;

            // Stall Detection: Se o delta for insano (> 1s) ou o componente parou de responder
            if (deltaMs > 1000) {
                console.warn('[Pomodoro] Engine stall detected. Resynchronizing...');
                rafId = requestAnimationFrame(tick);
                return;
            }

            if (stateRefs.current.isRunning && stateRefs.current.timeLeft > 0) {
                const currentTotalTime = stateRefs.current.mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (safeSettings.pomodoroBreak || 5) * 60;
                const circumference = 2 * Math.PI * 110;
                
                // Cálculo de precisão nanométrica
                const deltaSeconds = (deltaMs / 1000) * (speedRef.current || 1);
                const newTime = Math.max(0, stateRefs.current.timeLeft - deltaSeconds);
                stateRefs.current.timeLeft = newTime;

                const fraction = newTime / (currentTotalTime || 1);
                const displaySecond = Math.ceil(newTime);

                // Batching visual updates
                if (clockRef.current) {
                    const mins = Math.floor(displaySecond / 60);
                    const secs = displaySecond % 60;
                    const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                    if (clockRef.current.textContent !== timeString) {
                        clockRef.current.textContent = timeString;
                    }
                }

                if (svgCircleRef.current) {
                    svgCircleRef.current.style.strokeDashoffset = circumference * fraction;
                }

                const s = stateRefs.current.sessions;
                if (stateRefs.current.mode === 'work') {
                    const el = document.getElementById(`work-fill-${s}`);
                    if (el) el.style.width = `${Math.min(100, (1 - fraction) * 100)}%`;
                } else {
                    const ball = document.getElementById(`break-ball-${s}`);
                    if (ball) ball.style.height = `${Math.min(100, (1 - fraction) * 100)}%`;
                }

                if (newTime <= 0) {
                    transitionSession(stateRefs.current.mode, 'natural');
                } else {
                    rafId = requestAnimationFrame(tick);
                }
            } else {
                // Se estiver pausado, mantém o loop vivo mas leve
                rafId = requestAnimationFrame(tick);
            }
        };
        rafId = requestAnimationFrame(tick);
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [safeSettings, transitionSession]);

    // 🎯 UTILITÁRIOS BLINDADOS
    const reset = () => {
        if (isTransitioningRef.current) return;
        if (alarmAudioRef.current) { try { alarmAudioRef.current.pause(); alarmAudioRef.current.currentTime = 0; } catch(_) {} }
        showToast('A retroceder fase...', 'info');

        const s = sessions;
        if (mode === 'work') {
            const el = document.getElementById(`work-fill-${s}`);
            if (el) el.style.width = '0%';
        } else {
            const ball = document.getElementById(`break-ball-${s}`);
            if (ball) ball.style.height = '0%';
        }

        rewindPomodoroPhase();

        setTimeout(() => {
            const newState = useAppStore.getState().appState.pomodoro;
            const resetTime = newState.mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;
            setIsRunning(false);
            setTimeLeft(resetTime);
            stateRefs.current.isRunning = false;
            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = newState.mode;

            if (clockRef.current) clockRef.current.textContent = formatTime(resetTime);
            if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);

            savePomodoroState({ isRunning: false, timeLeft: resetTime, mode: newState.mode });
            try {
                const channel = new BroadcastChannel('pomodoro_sync');
                channel.postMessage({ type: 'PHASE_REWIND', toMode: newState.mode, tabId: window.name });
                channel.close();
            } catch(_) {}
        }, 0);
    };

    const skip = () => {
        if (isTransitioningRef.current) return;
        if (alarmAudioRef.current) { try { alarmAudioRef.current.pause(); alarmAudioRef.current.currentTime = 0; } catch(_) {} }
        showToast('Fase ignorada', 'success');

        const s = sessions;
        if (mode === 'work') {
            const el = document.getElementById(`work-fill-${s}`);
            if (el) el.style.width = '100%';
        } else {
            const ball = document.getElementById(`break-ball-${s}`);
            if (ball) ball.style.height = '100%';
        }

        transitionSession(mode, 'skip');
        // CORREÇÃO 4: Removido o savePomodoroState manual duplicado para evitar colisão na gravação
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
            showToast(`Parcial: ${finalMinutes} min.`, 'success');
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
                                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[#d9c5b2] flex items-center justify-center text-[#2d1a12] shadow-sm">
                                    <div className="text-xl font-black">b</div>
                                </div>
                                <div className="flex flex-col text-left flex-1 min-w-0">
                                    <h2 className="text-3xl font-black text-[#2d1a12] tracking-tight truncate">{activeSubject.task}</h2>
                                    <span className="text-[10px] font-black text-[#8b5e3c] uppercase tracking-[0.2em] truncate">MATÉRIA: {activeSubject.category}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setIsLayoutLocked(!isLayoutLocked); }} className="absolute right-8 text-[#2d1a12]/40 hover:text-[#2d1a12] cursor-pointer">
                                    {isLayoutLocked ? <Lock size={20} /> : <Unlock size={20} />}
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
                                    <span className="text-[10px] font-black text-red-500/60 uppercase">Protocolo Inativo</span>
                                    <h2 className="text-sm font-black text-red-500 uppercase tracking-widest">Selecione uma missão neural</h2>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div
                    style={{ backgroundImage: 'url(/wood-texture.png)', backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)' }}
                    className="w-full border-[6px] border-[#3f2e26] pt-12 pb-20 px-10 rounded-xl relative overflow-hidden flex flex-col items-center bg-[#2a1f1a]"
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

                        <div className="flex flex-col items-center justify-center">
                            <button
                                onClick={() => {
                                    if (mode === 'work' && !activeSubject) return;
                                    const next = !isRunning;
                                    stateRefs.current.isRunning = next;
                                    setIsRunning(next);
                                    if (next) {
                                        try {
                                            const channel = new BroadcastChannel('pomodoro_sync');
                                            channel.postMessage({ type: 'START_SESSION', tabId: window.name });
                                            channel.close();
                                        } catch(_) {}
                                    }
                                }}
                                className={`w-36 h-36 rounded-full flex items-center justify-center border-4 transition-colors ${isRunning ? 'bg-stone-100 text-black border-white' : 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_40px_rgba(34,197,94,0.3)]'}`}
                            >
                                {isRunning ? <Pause size={64} /> : <Play size={64} className="ml-2" />}
                            </button>
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
                                <div className="flex items-center gap-3 bg-white/10 p-1 rounded-lg">
                                    <button onClick={skip} className="px-3 py-1.5 rounded-md bg-white/10 text-[#2d1a12] text-[10px] font-black hover:bg-white/20 transition-all uppercase tracking-widest">Pular</button>
                                    <div className="w-px h-3 bg-[#2d1a12]/20" />
                                    <div className="flex items-center gap-1 px-1">
                                        <button onClick={() => {
                                            const current = stateRefs.current;
                                            const newTarget = Math.max(current.completedCycles < 1 ? 1 : current.completedCycles, current.targetCycles - 1);
                                            setTargetCycles(newTarget);
                                        }} disabled={!activeSubject || targetCycles <= 1} className="w-6 h-6 rounded bg-white/10 text-[#2d1a12] font-bold text-xs">-</button>
                                        <button onClick={() => setTargetCycles(targetCycles + 1)} disabled={!activeSubject} className="w-6 h-6 rounded bg-white/10 text-[#2d1a12] font-bold text-xs">+</button>
                                    </div>
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
                                                className="h-full bg-blue-500 will-change-[width]"
                                                style={{ 
                                                    width: (i < sessions - 1 || (i === sessions - 1 && mode === 'break')) ? '100%' : 
                                                           (i === sessions - 1 && mode === 'work') ? `${(1 - timeLeft / totalTime) * 100}%` : '0%',
                                                    transition: isRunning ? 'none' : 'width 0.3s ease'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {i < (targetCycles || 1) - 1 && (
                                        <div className="relative w-6 h-6 rounded-full bg-[#2d1a12]/10 border-2 border-[#2d1a12]/20 overflow-hidden shrink-0">
                                            <div
                                                id={`break-ball-${i + 1}`}
                                                className="absolute bottom-0 w-full bg-emerald-500 will-change-[height]"
                                                style={{ 
                                                    height: (i < sessions - 1) ? '100%' : 
                                                            (sessions === i + 1 && mode === 'break') ? `${(1 - timeLeft / totalTime) * 100}%` : '0%',
                                                    transition: isRunning ? 'none' : 'height 0.3s ease'
                                                }}
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
