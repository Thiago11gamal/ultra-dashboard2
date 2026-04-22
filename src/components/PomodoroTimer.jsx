import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Lock, Unlock, Activity, AlertCircle, Brain, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'framer-motion';

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
        } catch {
            // Storage read ignored
        }
        return null;
    });

    const getSavedState = (key, defaultValue) => {
        if (savedState && savedState[key] !== undefined) {
            return savedState[key];
        }
        return defaultValue;
    };

    const [mode, setMode] = useState(() => getSavedState('mode', 'work'));
    const defaultTime = useMemo(() => 
        mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (safeSettings.pomodoroBreak || 5) * 60,
    [mode, safeSettings.pomodoroWork, safeSettings.pomodoroBreak]);
    const [timeLeft, setTimeLeft] = useState(() => getSavedState('timeLeft', defaultTime));
    const [isRunning, setIsRunning] = useState(() => getSavedState('isRunning', false));
    const sessions = useAppStore(state => state.appState.pomodoro.sessions);
    const setSessions = useAppStore(state => state.setPomodoroSessions);
    const targetCycles = useAppStore(state => state.appState.pomodoro.targetCycles);
    const setTargetCycles = useAppStore(state => state.setPomodoroTargetCycles);
    const completedCycles = useAppStore(state => state.appState.pomodoro.completedCycles);
    const setCompletedCycles = useAppStore(state => state.setPomodoroCompletedCycles);

    const [sessionHistory, setSessionHistory] = useState(() => getSavedState('sessionHistory', []));

    const timerRef = useRef(null);
    const innerTimerRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const isSkippingRef = useRef(false);

    const clockRef = useRef(null);
    const svgCircleRef = useRef(null);
    const bottomBarRef = useRef(null);
    const sphereRef = useRef(null);
    const [uiPosition, setUiPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroPosition');
            return saved ? JSON.parse(saved) : { x: 0, y: 0 };
        } catch { return { x: 0, y: 0 }; }
    });

    // BUG 3 FIX: Persistent Audio Ref to bypass Autoplay Policies
    const alarmAudioRef = useRef(null);
    useEffect(() => {
        try {
            alarmAudioRef.current = new Audio('/sounds/alarm.wav');
        } catch {
            // Audio initialization failed or not supported in this environment
        }
    }, []);

    useEffect(() => {
        if (savedState) {
            try {
                const parsed = savedState;

                if (activeSubject && parsed.sessionInstanceId !== activeSubject.sessionInstanceId) {
                    return;
                }

                const now = Date.now();
                const msSinceSave = now - (parsed.savedAt || 0);
                if (msSinceSave > 24 * 60 * 60 * 1000) {
                    return;
                }

                if (parsed.isRunning && parsed.savedAt) {
                    const elapsedSeconds = Math.floor(msSinceSave / 1000);

                    if (elapsedSeconds > 0) {
                        if (parsed.timeLeft - elapsedSeconds < -300) {
                            localStorage.removeItem('pomodoroState');
                            setTimeout(() => {
                                setMode('work');
                                setTimeLeft((safeSettings.pomodoroWork || 25) * 60);
                                setIsRunning(false);
                            }, 0);
                            return;
                        }

                        timerRef.current = setTimeout(() => {
                            setTimeLeft(prev => {
                                const newTime = prev - elapsedSeconds;
                                return newTime > 0 ? newTime : 0;
                            });
                            setIsRunning(true);
                        }, 0);
                    }
                } else {
                    if (msSinceSave > 12 * 60 * 60 * 1000) {
                        localStorage.removeItem('pomodoroState');
                    }
                }
            } catch (err) {
                console.error("Resume logic error", err);
            }
        }
        return () => {
            clearTimeout(timerRef.current);
            clearTimeout(innerTimerRef.current);
        };
    }, [activeSubject, safeSettings, savedState]);

    const [isLayoutLocked, setIsLayoutLocked] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        if (targetCycles === 1 && defaultTargetCycles !== 1) {
            setTargetCycles(defaultTargetCycles);
        }
    }, [defaultTargetCycles, targetCycles, setTargetCycles]);

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const sendNotification = useCallback((title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: '🍅',
                    tag: 'pomodoro-timer'
                });
            } catch {
                // Notification ignored
            }
        }
    }, []);

    const containerRef = useRef(null);

    // O uiPosition foi movido pro início pra evitar order de hook
    
    // B-10 & B-11 FIX: Viewport-aware safety reset
    // Resets widget position if it gets "lost" off-screen (e.g. window resize)
    useEffect(() => {
        const checkPos = () => {
            if (uiPosition.x !== 0 || uiPosition.y !== 0) {
                // If it's significantly off-screen, bring it back to center (0,0 relative)
                const threshold = 100;
                if (Math.abs(uiPosition.x) > window.innerWidth / 2 + threshold || 
                    Math.abs(uiPosition.y) > window.innerHeight / 2 + threshold) {
                    setUiPosition({ x: 0, y: 0 });
                    localStorage.removeItem('pomodoroPosition');
                }
            }
        };
        window.addEventListener('resize', checkPos);
        return () => window.removeEventListener('resize', checkPos);
    }, [uiPosition]);

    const handleDragEnd = (event, info) => {
        const newPos = {
            x: uiPosition.x + info.offset.x,
            y: uiPosition.y + info.offset.y
        };
        setUiPosition(newPos);
        try {
            localStorage.setItem('pomodoroPosition', JSON.stringify(newPos));
        } catch {
            // Storage interaction failed
        }
    };

    const savePomodoroState = useCallback((overrides = {}) => {
        const stateToSave = {
            mode,
            timeLeft: timeLeftRef.current,
            isRunning,
            sessions,
            completedCycles,
            targetCycles,
            sessionHistory,
            savedAt: Date.now(),
            activeTaskId: activeSubject?.taskId,
            sessionInstanceId: activeSubject?.sessionInstanceId,
            ...overrides
        };

        try {
            localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
        } catch {
            // Quota error ignored
        }
    }, [mode, isRunning, sessions, completedCycles, targetCycles, sessionHistory, activeSubject]);

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            savePomodoroState();
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [savePomodoroState]);

    const transitionSession = useCallback((completedMode, source = 'natural') => {
        if (source === 'skip') {
            if (isSkippingRef.current) return;
            isSkippingRef.current = true;
            setTimeout(() => { isSkippingRef.current = false; }, 500);
        }

        const isNatural = source === 'natural';
        const completedDuration = completedMode === 'work' ? safeSettings.pomodoroWork : safeSettings.pomodoroBreak;
        const newHistoryItem = { type: completedMode, duration: completedDuration };

        setSessionHistory(prev => [...prev, newHistoryItem]);

        if (completedMode === 'work') {
            const newSessions = sessions + 1;
            setSessions(newSessions);
            onSessionComplete?.();

            if (activeSubject && onUpdateStudyTime) {
                if (isNatural) {
                    // BUG FIX: Se completou naturalmente, garante a glória total em vez de sofrer cortes 
                    // de arredondamento por milissegundos devidos a "browser throttling".
                    onUpdateStudyTime(activeSubject.categoryId, safeSettings.pomodoroWork, activeSubject.taskId);
                } else {
                    const actualElapsedSeconds = (safeSettings.pomodoroWork * 60) - timeLeftRef.current;
                    const actualElapsedMinutes = Math.floor(Math.max(0, actualElapsedSeconds) / 60);
                    if (actualElapsedMinutes > 0) {
                        onUpdateStudyTime(activeSubject.categoryId, actualElapsedMinutes, activeSubject.taskId);
                    }
                }
            }

            setMode('break');
            const breakTime = (safeSettings.pomodoroBreak || 5) * 60;
            setTimeLeft(breakTime);
            setIsRunning(false);

            savePomodoroState({
                mode: 'break',
                timeLeft: breakTime,
                isRunning: false,
                sessions: newSessions
            });

            if (isNatural) {
                if (safeSettings.soundEnabled) {
                    try {
                        if (alarmAudioRef.current) {
                            alarmAudioRef.current.currentTime = 0;
                            const playPromise = alarmAudioRef.current.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(() => {});
                            }
                        }
                    } catch {
                        // Audio playback error
                    }
                }
                sendNotification('⏰ Pomodoro Finalizado!', 'Hora de fazer uma pausa! Você merece descansar.');
            }
        } else {
            const newCompletedCycles = completedCycles + 1;
            setCompletedCycles(newCompletedCycles);

            if (isNatural) {
                if (safeSettings.soundEnabled) {
                    try {
                        if (alarmAudioRef.current) {
                            alarmAudioRef.current.currentTime = 0;
                            const playPromise = alarmAudioRef.current.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(() => {});
                            }
                        }
                    } catch {
                        // Audio playback error
                    }
                }
                sendNotification('☕ Pausa Finalizada!', 'Pronto para voltar a estudar? Vamos lá!');
            }

            const sVal = Number(sessions);
            const tVal = Number(targetCycles);

            if (sVal >= tVal && tVal > 0) {
                onFullCycleComplete?.();
                setIsRunning(false);
                savePomodoroState({
                    isRunning: false,
                    sessions: 0,
                    completedCycles: 0,
                    activeTaskId: null,
                    sessionInstanceId: null
                });
                return;
            }

            setMode('work');
            const workTime = (safeSettings.pomodoroWork || 25) * 60;
            setTimeLeft(workTime);
            setIsRunning(false);
            savePomodoroState({
                mode: 'work',
                timeLeft: workTime,
                isRunning: false,
                completedCycles: newCompletedCycles
            });
        }
    }, [safeSettings, sessions, setSessions, onSessionComplete, activeSubject, onUpdateStudyTime, completedCycles, setCompletedCycles, targetCycles, onFullCycleComplete, savePomodoroState, sendNotification]);

    const handleTimerComplete = useCallback(() => {
        transitionSession(mode, 'natural');
    }, [transitionSession, mode]);

    const speedRef = useRef(speed);
    useEffect(() => { speedRef.current = speed; }, [speed]);

    const timeLeftRef = useRef(timeLeft);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    // CORREÇÃO: Usar Screen Wake Lock API em vez do hack de mousemove
    const wakeLockRef = useRef(null);
    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && isRunning) {
                try {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                } catch (err) {
                    console.debug('Wake Lock falhou:', err);
                }
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLockRef.current) {
                try {
                    await wakeLockRef.current.release();
                    wakeLockRef.current = null;
                } catch (err) {
                    console.debug('Release Wake Lock falhou:', err);
                }
            }
        };

        if (isRunning) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        // Lidar com visibilidade da página (Wake lock cai se a aba ficar oculta)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isRunning) {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            releaseWakeLock();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isRunning]);

    useEffect(() => {
        let rafId;
        let lastTickTime = performance.now();

        if (isRunning && timeLeftRef.current > 0) {
            const currentTotalTime = mode === 'work'
                ? safeSettings.pomodoroWork * 60
                : safeSettings.pomodoroBreak * 60;
            const circumference = 2 * Math.PI * 100;

            let lastDisplayedSecond = Math.ceil(timeLeftRef.current);

            const tick = (now) => {
                const deltaMs = now - lastTickTime;
                lastTickTime = now;

                timeLeftRef.current = Math.max(0, timeLeftRef.current - (deltaMs / 1000) * speedRef.current);
                const current = timeLeftRef.current;
                
                const fraction = current / currentTotalTime;
                const displaySecond = Math.ceil(current);

                if (clockRef.current && displaySecond !== lastDisplayedSecond) {
                    const mins = Math.floor(displaySecond / 60);
                    const secs = displaySecond % 60;
                    clockRef.current.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                }

                if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = circumference * fraction;
                if (bottomBarRef.current && mode === 'work') bottomBarRef.current.style.width = `${(1 - fraction) * 100}%`;
                if (sphereRef.current && mode === 'break') sphereRef.current.style.height = `${(1 - fraction) * 100}%`;

                if (displaySecond !== lastDisplayedSecond || current <= 0) {
                    lastDisplayedSecond = displaySecond;
                    setTimeLeft(current); 
                }

                if (current > 0) {
                    rafId = requestAnimationFrame(tick);
                }
            };

            rafId = requestAnimationFrame(tick);
        }
        return () => cancelAnimationFrame(rafId);
    }, [isRunning, mode, safeSettings.pomodoroWork, safeSettings.pomodoroBreak]);

    const isHandlingCompleteRef = React.useRef(false);
    useEffect(() => {
        if (timeLeft <= 0 && isRunning && !isHandlingCompleteRef.current) {
            isHandlingCompleteRef.current = true;
            setTimeout(() => {
                handleTimerComplete();
                isHandlingCompleteRef.current = false;
            }, 0);
        }
    }, [timeLeft, isRunning, handleTimerComplete]);

    const reset = () => {
        setIsRunning(false);
        const resetTime = mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;
        setTimeLeft(resetTime);
        savePomodoroState({
            timeLeft: resetTime,
            isRunning: false
        });
    };

    const skip = () => {
        setIsRunning(false);
        transitionSession(mode, 'skip');
    };

    const formatTime = (seconds) => {
        const safeSecs = Math.max(0, seconds);
        const secsInt = Math.ceil(safeSecs);
        const mins = Math.floor(secsInt / 60);
        const secs = secsInt % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const totalTime = mode === 'work' ? Math.max(1, safeSettings.pomodoroWork * 60) : Math.max(1, safeSettings.pomodoroBreak * 60);

    const rawProgress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    const progress = (timeLeft >= totalTime || timeLeft <= 0) ? (timeLeft <= 0 ? 100 : 0) : Math.max(0, Math.min(100, rawProgress || 0));

    const retention = useMemo(() => {
        if (!activeSubject) return null;
        const cat = categories.find(c => c.name === activeSubject.category);
        if (!cat || !cat.lastStudiedAt) return { val: 100, label: 'Novo', color: 'text-emerald-400', border: 'border-emerald-500' };

        const last = new Date(cat.lastStudiedAt).getTime();
        
        if (isNaN(last)) return { val: 100, label: 'Novo', color: 'text-emerald-400', border: 'border-emerald-500' };

        const now = new Date().getTime();
        const diffHours = Math.max(0, now - last) / (1000 * 60 * 60);
        const days = diffHours / 24;
        const val = Math.max(0, Math.round(100 * Math.exp(-days / 7)));

        if (val >= 80) return { val, label: 'Ótimo', color: 'text-emerald-400', border: 'border-emerald-500/30' };
        if (val >= 60) return { val, label: 'Bom', color: 'text-green-400', border: 'border-green-500/30' };
        if (val >= 40) return { val, label: 'Atenção', color: 'text-yellow-400', border: 'border-yellow-500/30' };
        if (val >= 20) return { val, label: 'Crítico', color: 'text-orange-400', border: 'border-orange-500/30' };
        return { val, label: 'Urgente!', color: 'text-red-400', border: 'border-red-500/30' };
    }, [activeSubject, categories]);

    const theme = useMemo(() => {
        if (completedCycles >= targetCycles) return {
            primary: 'text-stone-200',
            secondary: 'text-stone-400',
            bg: 'bg-[#1c1917]',
            border: 'border-stone-700',
            iconBg: 'bg-[#292524] border border-stone-700 text-stone-200',
            button: 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700',
            progress: 'bg-stone-500'
        };
        if (mode === 'break') return {
            primary: 'text-stone-200',
            secondary: 'text-stone-400',
            bg: 'bg-[#1c1917]',
            border: 'border-zinc-700',
            iconBg: 'bg-[#292524] border border-zinc-700 text-stone-200',
            button: 'bg-zinc-900 text-stone-200 hover:bg-zinc-800 border border-zinc-700',
            progress: 'bg-zinc-600'
        };
        return {
            primary: 'text-stone-100',
            secondary: 'text-stone-400',
            bg: 'bg-[#292524]',
            border: 'border-stone-700',
            iconBg: 'bg-[#1c1917] border border-stone-700 text-stone-200',
            button: 'bg-[#1c1917] text-stone-200 hover:bg-black border border-stone-700',
            progress: 'bg-stone-200'
        };
    }, [mode, completedCycles, targetCycles]);

    return (
        <div ref={containerRef} className="w-full relative min-h-[80vh] flex flex-col items-center">
            <motion.div
                drag={!isLayoutLocked}
                dragMomentum={true}
                dragElastic={0.1}
                animate={uiPosition}
                onDragEnd={handleDragEnd}
                whileDrag={{ scale: 1.01, zIndex: 1000 }}
                className={`w-full max-w-3xl space-y-6 relative font-sans flex flex-col items-center ${!isLayoutLocked ? 'cursor-grab active:cursor-grabbing z-[1000]' : 'z-50'}`}
            >
                {/* Drag Handle - Apenas visível quando desbloqueado */}
                {!isLayoutLocked && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl bg-indigo-600/90 text-white shadow-2xl backdrop-blur-md border border-indigo-400/50"
                    >
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Modo Movimentação Livre</span>
                    </motion.div>
                )}

                <div className="relative flex items-center justify-center py-2 w-full px-4">
                    <div className="flex-1 flex justify-center bg-transparent">
                        {activeSubject ? (
                            <motion.div
                                initial={{ y: -5, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="relative flex items-center gap-6 w-full bg-gradient-to-br from-[#f5eadd] to-[#d9c5b2] border-4 border-[#b38b6d] rounded-[2.5rem] p-6 transition-all duration-500 shadow-[inset_0_2px_10px_rgba(255,255,255,0.5),0_15px_40px_rgba(0,0,0,0.3)] group overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-40 pointer-events-none" />
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                <div className="w-16 h-16 rounded-2xl bg-black/5 border border-[#3a261c]/20 flex items-center justify-center text-[#3a261c] shadow-[inset_0_2px_5px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-transform duration-500">
                                    <div className="text-2xl font-black">{activeSubject.category ? activeSubject.category[0] : '📚'}</div>
                                </div>
                                <div className="flex flex-col text-left flex-1 min-w-0 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#d97706] animate-pulse shadow-[0_0_8px_#d97706]" />
                                        <span className="text-[10px] font-black text-[#8b5e3c] uppercase tracking-[0.4em]">Protocolo Ativo</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-[#2d1a12] tracking-tight mt-1 truncate drop-shadow-sm">
                                        {activeSubject.task}
                                    </h2>
                                    <span className="text-[11px] font-black text-[#8b5e3c]/60 uppercase tracking-[0.2em] mt-0.5 truncate">
                                        Vetor: {activeSubject.category}
                                    </span>
                                </div>
                            </motion.div>
                        ) : mode === 'break' ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative flex items-center justify-center gap-4 w-full bg-emerald-900/40 backdrop-blur-3xl border border-emerald-500/30 rounded-[2.5rem] py-6 shadow-[0_20px_50px_rgba(16,185,129,0.1)] group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <Zap size={24} className="animate-pulse" />
                                </div>
                                <span className="text-xl font-black text-emerald-400 tracking-widest uppercase flex items-center gap-2">
                                    Recuperação Neural <span className="text-2xl">☕</span>
                                </span>
                            </motion.div>
                        ) : (
                            <motion.div
                                animate={showWarning ? {
                                    scale: [1, 1.02, 1],
                                    borderColor: ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 0.2)'],
                                    backgroundColor: ['rgba(153, 27, 27, 0.2)', 'rgba(153, 27, 27, 0.4)', 'rgba(153, 27, 27, 0.2)']
                                } : {}}
                                transition={{ duration: 0.4, repeat: showWarning ? Infinity : 0 }}
                                onClick={onExit}
                                className="w-full bg-black/40 backdrop-blur-3xl border-2 border-dashed border-white/10 rounded-[2.5rem] py-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-black/60 hover:border-white/30 transition-all group shadow-2xl"
                            >
                                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-white group-hover:scale-110 transition-all">
                                    <AlertCircle size={32} />
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] group-hover:text-indigo-400 transition-colors">Inicialização Necessária</span>
                                    <h2 className="text-lg font-black text-white mt-1">SELECIONE UM VETOR DE ESTUDO</h2>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {!isLayoutLocked && (
                            <button
                                onClick={() => {
                                    setUiPosition({ x: 0, y: 0 });
                                    try {
                                        localStorage.setItem('pomodoroPosition', JSON.stringify({ x: 0, y: 0 }));
                                    } catch {
                                        // Storage interaction failed
                                    }
                                }}
                                className="p-3 rounded-xl bg-stone-800 text-stone-300 border border-stone-700 hover:text-white hover:bg-stone-700 transition-all shadow-lg flex items-center gap-2"
                                title="Resetar Posição"
                            >
                                <RotateCcw size={14} />
                                <span className="text-[10px] font-bold uppercase">Resetar</span>
                            </button>
                        )}
                        <button
                            onClick={() => setIsLayoutLocked(!isLayoutLocked)}
                            className={`p-3 rounded-xl transition-all duration-300 ${isLayoutLocked
                                ? 'text-stone-600 hover:text-stone-400'
                                : 'bg-[#292524] text-stone-200 border border-stone-700'
                                }`}
                        >
                            {isLayoutLocked ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                    </div>
                </div>

                <div
                    style={{
                        backgroundColor: '#2a1f1a',
                        backgroundImage: 'url(/wood-texture.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)'
                    }}
                    className={`w-full border-4 border-[#3f2e26] transition-all duration-500 ease-out p-6 rounded-[2rem] relative overflow-hidden flex flex-col items-center justify-center shadow-2xl
                        ${!isLayoutLocked ? 'ring-2 ring-indigo-500/50' : ''}
                        ${showWarning ? 'ring-4 ring-red-600 shadow-[0_0_50px_rgba(220,38,38,0.3)]' : ''}`}
                >
                    <div className="relative z-10 w-full flex flex-col items-center">
                        {(() => {
                            if (!activeSubject) return null;
                            const priority = activeSubject.priority || 'medium';
                            let label = 'MÉDIA';
                            let levelColor = "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]";
                            let Icon = Activity;
                            if (priority === 'high') { 
                                label = 'ALTA'; 
                                levelColor = "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]";
                                Icon = AlertCircle;
                            } else if (priority === 'low') { 
                                label = 'BAIXA'; 
                                levelColor = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                            }
                            return (
                                <div className="absolute top-6 left-6">
                                    <div className={`px-5 py-2.5 rounded-2xl border-2 backdrop-blur-xl flex items-center gap-3 bg-black/40 ${levelColor.split(' ').filter(c => !c.startsWith('bg-')).join(' ')} shadow-[0_10px_30px_rgba(0,0,0,0.3)]`}>
                                        <div className="relative">
                                            <Icon size={14} className="animate-pulse" />
                                            <div className="absolute inset-0 blur-sm opacity-50"><Icon size={14} /></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">Prioridade</span>
                                            <span className="text-xs font-black tracking-widest">{label}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {activeSubject && retention && (
                            <div className="absolute top-6 right-6">
                                <div className={`px-4 py-2 rounded-2xl border backdrop-blur-md bg-black/40 flex items-center gap-3 ${retention.border} shadow-2xl`}>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 text-slate-400">Saúde Neural</span>
                                        <span className={`text-xs font-black tracking-widest ${retention.color}`}>{retention.val}%</span>
                                    </div>
                                    <div className={`w-8 h-8 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center ${retention.color}`}>
                                        <Brain size={14} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={`flex items-center gap-1 mb-10 bg-black/40 p-1.5 rounded-2xl border border-white/10 ${!activeSubject ? 'opacity-30 pointer-events-none' : ''}`}>
                            <button
                                onClick={() => { setMode('work'); setTimeLeft(safeSettings.pomodoroWork * 60); setIsRunning(false); }}
                                className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-500 ${mode === 'work' ? 'bg-white/10 text-white shadow-xl border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Foco
                            </button>
                            <button
                                onClick={() => { setMode('break'); setTimeLeft(safeSettings.pomodoroBreak * 60); setIsRunning(false); }}
                                className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-500 ${mode === 'break' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Pausa
                            </button>
                        </div>

                        <div className={`relative mb-8 transition-all duration-500 rounded-full ${mode === 'work' && timeLeft <= 10 ? 'animate-pulse shadow-[0_0_80px_rgba(239,68,68,0.4)]' : ''}`}>
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/[0.02] to-transparent blur-2xl" />
                            <svg className="w-64 h-64 transform -rotate-90 relative z-10">
                                <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor={mode === 'work' ? '#f8fafc' : '#34d399'} />
                                        <stop offset="100%" stopColor={mode === 'work' ? '#94a3b8' : '#059669'} />
                                    </linearGradient>
                                </defs>
                                <motion.circle
                                    ref={svgCircleRef}
                                    cx="128" cy="128" r="110" fill="none"
                                    stroke="url(#timerGradient)"
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 110}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 110 }}
                                    animate={{ strokeDashoffset: 2 * Math.PI * 110 * (1 - progress / 100) }}
                                    className="drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                />
                            </svg>

                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                <span ref={clockRef} className="text-6xl font-black tracking-tighter text-white drop-shadow-2xl">
                                    {formatTime(timeLeft)}
                                </span>

                                <div className={`mt-4 flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md`}>
                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isRunning
                                        ? (mode === 'work' && timeLeft <= 10 ? 'animate-pulse text-red-500 bg-red-500' : 'animate-pulse text-emerald-400 bg-emerald-400')
                                        : 'text-slate-600 bg-slate-600'}`}></div>
                                    <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${isRunning ? 'text-white' : 'text-slate-500'}`}>
                                        {isRunning ? (mode === 'work' ? 'Protocolo Foco' : 'Recuperação') : 'Sessão Pausada'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={`flex items-center gap-10 z-10 mt-6 ${!activeSubject ? 'opacity-30 pointer-events-none' : ''}`}>
                            <motion.button
                                whileHover={{ scale: 1.15, rotate: -15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={reset}
                                className="w-18 h-18 md:w-20 md:h-20 rounded-3xl bg-black/60 backdrop-blur-2xl border border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 flex items-center justify-center transition-all shadow-[0_15px_40px_rgba(0,0,0,0.4)] group"
                                title="Reiniciar Sistema"
                            >
                                <RotateCcw size={28} className="group-hover:rotate-[-90deg] transition-transform duration-700" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: isRunning ? '0 0 50px rgba(239,68,68,0.2)' : '0 0 60px rgba(255,255,255,0.15)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    if (mode === 'work' && !activeSubject) {
                                        setShowWarning(true);
                                        setTimeout(() => setShowWarning(false), 3000);
                                        return;
                                    }
                                    setIsRunning(!isRunning);
                                }}
                                className={`w-32 h-32 md:w-36 md:h-36 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,255,255,0.2)] border-4 ${isRunning ? 'bg-gradient-to-br from-white to-slate-200 text-black border-white' : 'bg-black/60 backdrop-blur-3xl text-white border-white/20 hover:border-white hover:bg-black/40'}`}
                            >
                                {isRunning ? <Pause size={56} strokeWidth={3} fill="currentColor" /> : <Play size={56} strokeWidth={3} fill="currentColor" className="ml-2" />}
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.15, rotate: 15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={skip}
                                className="w-18 h-18 md:w-20 md:h-20 rounded-3xl bg-black/60 backdrop-blur-2xl border border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 flex items-center justify-center transition-all shadow-[0_15px_40px_rgba(0,0,0,0.4)] group"
                                title="Pular Ciclo"
                            >
                                <SkipForward size={28} className="group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                        </div>

                        {/* Speed Telemetry Controls */}
                        {activeSubject && (
                            <div className="absolute bottom-8 right-8 flex items-center gap-2 bg-black/90 backdrop-blur-3xl p-2 rounded-2xl border-2 border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.6),inset_0_0_15px_rgba(255,255,255,0.05)] z-[100] group/speed">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-white/10 border border-white/10 backdrop-blur-md opacity-0 group-hover/speed:opacity-100 transition-opacity">
                                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Warp Speed</span>
                                </div>
                                {[1, 10, 100].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setSpeed(s)}
                                        className={`px-5 py-2.5 rounded-xl text-[11px] font-black font-mono transition-all duration-500 border-2 ${speed === s
                                            ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.5)] scale-105'
                                            : 'bg-white/5 text-slate-500 border-transparent hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        {s}X
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div
                    className="w-full px-10 pt-8 pb-10 rounded-[2.5rem] relative overflow-hidden bg-gradient-to-br from-[#f2e6d9] to-[#e6d5c3] border-4 border-[#c4a48a] shadow-xl group/bottom"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-40 pointer-events-none" />
                    {/* Subtle Wood Grain Pattern Overlay */}
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/wood-pattern.png")' }} />

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#5c3d2e]/15 border-2 border-[#5c3d2e]/30 flex items-center justify-center text-[#3a261c] shadow-[inset_0_2px_5px_rgba(0,0,0,0.1)]">
                                <Zap size={20} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-xs font-black text-[#8b5e3c]/60 uppercase tracking-[0.3em]">Progressão de Ciclos</h3>
                                <span className="text-sm font-bold text-[#3a261c] mt-1">Eficiência Operacional</span>
                            </div>
                        </div>
                        <div className={`flex items-center gap-6 ${!activeSubject ? 'opacity-30 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setTargetCycles(Math.max(completedCycles < 1 ? 1 : completedCycles, targetCycles - 1))}
                                    disabled={!activeSubject || targetCycles <= Math.max(completedCycles < 1 ? 1 : completedCycles, 1)}
                                    className="w-8 h-8 rounded-lg bg-[#5c3d2e]/5 border border-[#5c3d2e]/10 text-[#5c3d2e] hover:bg-[#5c3d2e]/10 transition-all flex items-center justify-center"
                                >
                                    -
                                </button>
                                <button
                                    onClick={() => setTargetCycles(targetCycles + 1)}
                                    disabled={!activeSubject}
                                    className="w-8 h-8 rounded-lg bg-[#5c3d2e]/5 border border-[#5c3d2e]/10 text-[#5c3d2e] hover:bg-[#5c3d2e]/10 transition-all flex items-center justify-center"
                                >
                                    +
                                </button>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-[#2d1a12] tabular-nums tracking-tighter drop-shadow-sm">{completedCycles}</span>
                                    <span className="text-sm font-black text-[#8b5e3c]/40">/ {targetCycles}</span>
                                </div>
                                <span className="text-[10px] font-black uppercase text-[#8b5e3c] tracking-[0.3em]">Módulos</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 h-4 w-full relative z-10">
                        {Array.from({ length: targetCycles }).map((_, i) => {
                            let workProgress = 0;
                            let breakProgress = 0;

                            if (i < sessions) {
                                workProgress = 100;
                            } else if (i === sessions && mode === 'work') {
                                workProgress = progress;
                            }

                            if (i < sessions) {
                                if (i === sessions - 1 && mode === 'break') {
                                    breakProgress = progress;
                                } else {
                                    breakProgress = 100;
                                }
                            }

                            return (
                                <React.Fragment key={i}>
                                    <div className="flex-1 h-full relative group/cell">
                                        <div className="absolute inset-0 bg-white/[0.03] rounded-sm overflow-hidden border border-white/[0.05]">
                                            <motion.div
                                                className={`h-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.5)]`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${workProgress}%` }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>
                                        {/* Break indicator dot */}
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                                            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${breakProgress > 0 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] scale-125' : 'bg-white/10'}`} />
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
