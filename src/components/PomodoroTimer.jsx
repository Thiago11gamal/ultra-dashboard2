import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Lock, Unlock, Activity, AlertCircle, Brain, Zap, CheckCircle2 } from 'lucide-react';
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
    const sessions = Number(useAppStore(state => state.appState.contests[state.appState.activeId]?.settings?.sessions || 1));
    const setSessions = useAppStore(state => state.setPomodoroSessions);
    const targetCycles = useAppStore(state => state.appState.pomodoro.targetCycles);
    const setTargetCycles = useAppStore(state => state.setPomodoroTargetCycles);
    const completedCycles = useAppStore(state => state.appState.contests[state.appState.activeId]?.settings?.completedCycles || 0);
    const setCompletedCycles = useAppStore(state => state.setPomodoroCompletedCycles);
    const accumulatedMinutes = useAppStore(state => state.appState.pomodoro.accumulatedMinutes || 0);
    const setAccumulatedMinutes = useAppStore(state => state.setPomodoroAccumulatedMinutes);

    // FIX: Sanitize corrupted sessions state (e.g., the '1004' bug)
    useEffect(() => {
        if (sessions > 20 || sessions < 1 || isNaN(sessions)) {
            setSessions(1);
        }
    }, [sessions, setSessions]);

    const [sessionHistory, setSessionHistory] = useState(() => getSavedState('sessionHistory', []));

    const timerRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const skipTimeoutRef = useRef(null); // Ref para limpar o timeout de skip
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
        const initFromStorage = () => {
            if (!savedState) return;
            try {
                const parsed = savedState;
                if (activeSubject && parsed.sessionInstanceId !== activeSubject.sessionInstanceId) return;

                const now = Date.now();
                const msSinceSave = now - (parsed.savedAt || 0);
                if (msSinceSave > 24 * 60 * 60 * 1000) return;

                if (parsed.isRunning && parsed.savedAt) {
                    const elapsedSeconds = Math.floor(msSinceSave / 1000);
                    if (elapsedSeconds > 0) {
                        if (parsed.timeLeft - elapsedSeconds < -300) {
                            localStorage.removeItem('pomodoroState');
                            return;
                        }
                        timerRef.current = setTimeout(() => {
                            const newTime = parsed.timeLeft - elapsedSeconds;
                            if (newTime <= 0) {
                                setTimeLeft(0);
                                setIsRunning(false);
                                setMode(parsed.mode);
                                setTimeout(() => {
                                    transitionSession(parsed.mode, 'natural', 0);
                                }, 100);
                                return;
                            }
                            setTimeLeft(newTime);
                            setIsRunning(true);
                        }, 0);
                    }
                }
            } catch (err) {
                console.error("Resume logic error", err);
            }
        };

        initFromStorage();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
        };
    }, [activeSubject, savedState, transitionSession]);

    const [isLayoutLocked, setIsLayoutLocked] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [showWarning, setShowWarning] = useState(false);
    const showToast = useToast();

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

    const transitionSession = useCallback((completedMode, source = 'natural', forcedTimeLeft = null) => {
        if (source === 'skip') {
            if (isSkippingRef.current) return;
            isSkippingRef.current = true;
            if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
            skipTimeoutRef.current = setTimeout(() => { isSkippingRef.current = false; }, 500);
        }

        const isNatural = source === 'natural';
        const completedDuration = completedMode === 'work' ? safeSettings.pomodoroWork : safeSettings.pomodoroBreak;
        const newHistoryItem = { type: completedMode, duration: completedDuration };

        setSessionHistory(prev => [...prev, newHistoryItem]);

        if (completedMode === 'work') {
            onSessionComplete?.();

            let sessionMinutes = 0;
            if (isNatural) {
                sessionMinutes = safeSettings.pomodoroWork;
            } else {
                const effectiveTimeLeft = forcedTimeLeft !== null ? forcedTimeLeft : timeLeftRef.current;
                const actualElapsedSeconds = (safeSettings.pomodoroWork * 60) - effectiveTimeLeft;
                sessionMinutes = Math.floor(Math.max(0, actualElapsedSeconds) / 60);
            }

            const newAccumulated = accumulatedMinutes + sessionMinutes;
            setAccumulatedMinutes(newAccumulated);

            const sVal = Number(sessions);
            const tVal = Number(targetCycles);

            if (sVal >= tVal && tVal > 0) {
                setIsRunning(false);

                try {
                    if (activeSubject && onUpdateStudyTime && newAccumulated > 0) {
                        onUpdateStudyTime(activeSubject.categoryId, newAccumulated, activeSubject.taskId);
                    }

                    if (isNatural) {
                        if (safeSettings.soundEnabled && alarmAudioRef.current) {
                            try {
                                alarmAudioRef.current.currentTime = 0;
                                alarmAudioRef.current.play().catch(() => { });
                            } catch (e) { }
                        }
                        sendNotification('🏆 Missão Cumprida!', `Série de ${tVal} ciclos finalizada. ${newAccumulated} minutos salvos com sucesso!`);
                    }

                    setAccumulatedMinutes(0);

                    // IMPORTANTE: onFullCycleComplete deve ser o último para permitir que o timer limpe seu estado
                    onFullCycleComplete?.(newAccumulated);

                    setSessions(1);
                    setCompletedCycles(0);

                    // Não salvamos o estado de "parado" se vamos pular pro próximo, 
                    // para evitar que o overwrite do Pomodoro.jsx seja anulado.
                    // Mas limpamos por segurança.
                    localStorage.removeItem('pomodoroState');
                } catch (err) {
                    console.error("Erro na transição final:", err);
                    onExit?.();
                }
                return;
            }

            setMode('break');
            const breakTime = (safeSettings.pomodoroBreak || 5) * 60;
            setTimeLeft(breakTime);
            setIsRunning(false);

            savePomodoroState({
                mode: 'break',
                timeLeft: breakTime,
                isRunning: false
            });

            if (isNatural) {
                if (safeSettings.soundEnabled) {
                    try {
                        if (alarmAudioRef.current) {
                            alarmAudioRef.current.currentTime = 0;
                            const playPromise = alarmAudioRef.current.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(() => { });
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
                                playPromise.catch(() => { });
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
                setIsRunning(false);
                try {
                    if (activeSubject && onUpdateStudyTime && accumulatedMinutes > 0) {
                        onUpdateStudyTime(activeSubject.categoryId, accumulatedMinutes, activeSubject.taskId);
                    }

                    if (isNatural) {
                        if (safeSettings.soundEnabled && alarmAudioRef.current) {
                            try {
                                alarmAudioRef.current.currentTime = 0;
                                alarmAudioRef.current.play().catch(() => { });
                            } catch (e) { }
                        }
                        sendNotification('🏆 Missão Cumprida!', `Série de ${tVal} ciclos finalizada. ${accumulatedMinutes} minutos salvos com sucesso!`);
                    }

                    setAccumulatedMinutes(0);

                    onFullCycleComplete?.(accumulatedMinutes);
                    setSessions(1);
                    setCompletedCycles(0);
                    localStorage.removeItem('pomodoroState');
                } catch (err) {
                    console.error("Erro na transição final (skip):", err);
                    onExit?.();
                }
                return;
            }

            setMode('work');
            const newSessions = sessions + 1;
            setSessions(newSessions);
            const workTime = (safeSettings.pomodoroWork || 25) * 60;
            setTimeLeft(workTime);
            setIsRunning(false);
            savePomodoroState({
                mode: 'work',
                timeLeft: workTime,
                isRunning: false,
                sessions: newSessions,
                completedCycles: newCompletedCycles
            });
        }
    }, [safeSettings, sessions, setSessions, onSessionComplete, activeSubject, onUpdateStudyTime, completedCycles, setCompletedCycles, targetCycles, onFullCycleComplete, savePomodoroState, sendNotification]);

    const handleTimerComplete = useCallback(() => {
        setIsRunning(false);
        transitionSession(mode, 'natural', 0);
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
            const circumference = 2 * Math.PI * 110;

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

                // Sincronização do Círculo
                if (svgCircleRef.current) {
                    svgCircleRef.current.style.strokeDashoffset = circumference * fraction;
                }

                // Sincronização das Barras Azuis (Foco)
                const activeWorkFill = document.getElementById(`work-fill-${sessions}`);
                if (activeWorkFill) {
                    if (mode === 'work') {
                        activeWorkFill.style.width = `${(1 - fraction) * 100}%`;
                    } else {
                        activeWorkFill.style.width = '100%';
                    }
                }

                // Sincronização da Bolinha Verde (Descanso)
                const activeBreakBall = document.getElementById(`break-ball-${sessions}`);
                const activeBreakWave = document.getElementById(`break-wave-${sessions}`);
                if (activeBreakBall && mode === 'break') {
                    const fillHeight = (1 - fraction) * 100;
                    activeBreakBall.style.height = `${fillHeight}%`;
                    if (activeBreakWave) {
                        // The top position of the wave should move from bottom (100%) to top (0%)
                        // But since it's a large circle, we offset it
                        activeBreakWave.style.top = `${100 - fillHeight - 150}%`;
                    }
                }

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

    const handleManualExit = () => {
        // Se o utilizador sair a meio, salvamos o tempo que ele já acumulou nas sessões anteriores
        if (accumulatedMinutes > 0 && activeSubject && onUpdateStudyTime) {
            onUpdateStudyTime(activeSubject.categoryId, accumulatedMinutes, activeSubject.taskId);
            setAccumulatedMinutes(0);
            showToast(`Salvamento parcial: ${accumulatedMinutes} minutos registados.`, 'success');
        }

        // Limpar o cache de estado do pomodoro para não tentar "retomar" numa matéria vazia
        localStorage.removeItem('pomodoroState');

        onExit();
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
        const cat = categories.find(c => c.id === activeSubject.categoryId);
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
                                className="relative flex items-center gap-6 w-full bg-[#b08e6b] border-2 border-[#94785a] rounded-xl p-8 transition-all duration-500 shadow-xl group overflow-hidden"
                            >
                                <div className="w-16 h-16 rounded-full bg-white border-2 border-[#d9c5b2] flex items-center justify-center text-[#2d1a12] shadow-sm group-hover:scale-105 transition-transform duration-500 flex-shrink-0">
                                    <div className="text-2xl font-black">b</div>
                                </div>
                                <div className="flex flex-col text-left flex-1 min-w-0 relative z-10">
                                    <h2 className="text-4xl font-black text-[#2d1a12] tracking-tight mt-1 truncate">
                                        {activeSubject.task}
                                    </h2>
                                    <span className="text-[12px] font-black text-[#8b5e3c] uppercase tracking-[0.2em] mt-1 truncate">
                                        MATÉRIA: {activeSubject.category}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsLayoutLocked(!isLayoutLocked);
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-[#2d1a12]/40 hover:text-[#2d1a12] transition-colors z-[1100] cursor-pointer"
                                >
                                    {isLayoutLocked ? <Lock size={24} /> : <Unlock size={24} />}
                                </button>
                            </motion.div>
                        ) : mode === 'break' ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative flex items-center justify-center gap-4 w-full bg-emerald-900/40 backdrop-blur-3xl border border-emerald-500/30 rounded-xl py-6 shadow-[0_20px_50px_rgba(16,185,129,0.1)] group"
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
                                onClick={handleManualExit}
                                className="w-full bg-red-950/20 backdrop-blur-3xl border border-dashed border-red-500/30 rounded-xl py-4 flex flex-row items-center justify-center gap-4 cursor-pointer hover:bg-red-900/40 hover:border-red-500/50 transition-all group shadow-2xl"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-all">
                                    <AlertCircle size={20} />
                                </div>
                                <div className="flex flex-col items-start text-left">
                                    <span className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.2em] transition-colors">Inicialização Necessária</span>
                                    <h2 className="text-sm font-black text-red-500 mt-0.5">SELECIONE UM VETOR DE ESTUDO</h2>
                                </div>
                            </motion.div>
                        )}
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
                    className={`w-full border-[6px] border-[#3f2e26] transition-all duration-500 ease-out pt-12 pb-10 px-10 rounded-xl relative overflow-hidden flex flex-col items-center justify-start shadow-[inset_0_10px_60px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.5)]
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
                                    <div className={`px-5 py-2.5 rounded-xl border border-white/5 backdrop-blur-3xl flex items-center gap-3 bg-gradient-to-br from-black/90 to-black/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.4)]`}>
                                        <div className="relative">
                                            <Icon size={16} className="text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500/40">SINAL: PRIORIDADE</span>
                                            <span className="text-xs font-black tracking-widest text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">{label}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {activeSubject && retention && (
                            <div className="absolute top-6 right-6">
                                <div className={`px-4 py-2 rounded-xl border border-white/5 backdrop-blur-3xl bg-gradient-to-br from-black/90 to-black/70 flex items-center gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.4)]`}>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500/40">CORE: NEURAL</span>
                                        <span className={`text-xs font-black tracking-widest text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]`}>{retention.val}%</span>
                                    </div>
                                    <div className={`w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400`}>
                                        <Brain size={16} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-6 mb-12 z-30">
                            <span className={`text-[9px] font-black uppercase tracking-[0.4em] transition-opacity ${mode === 'work' ? 'text-white' : 'text-white/40'}`}>FOCO</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                            <span className={`text-[9px] font-black uppercase tracking-[0.4em] transition-opacity ${mode === 'break' ? 'text-white' : 'text-white/40'}`}>PAUSA</span>
                        </div>


                        <div className={`relative mt-12 mb-8 transition-all duration-500 rounded-full ${mode === 'work' && timeLeft <= 10 ? 'animate-pulse shadow-[0_0_80px_rgba(239,68,68,0.4)]' : ''}`}>
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/[0.02] to-transparent blur-2xl" />
                            <svg className="w-64 h-64 transform -rotate-90 relative z-10">
                                <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor={mode === 'work' ? '#3b82f6' : '#22c55e'} />
                                        <stop offset="100%" stopColor={mode === 'work' ? '#2563eb' : '#10b981'} />
                                    </linearGradient>
                                    <filter id="glow">
                                        <feGaussianBlur stdDeviation="4" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>
                                <motion.circle
                                    ref={svgCircleRef}
                                    cx="128" cy="128" r="110" fill="none"
                                    stroke="url(#timerGradient)"
                                    strokeWidth="14"
                                    strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 110}
                                    style={{ strokeDashoffset: isRunning ? undefined : (2 * Math.PI * 110) * (timeLeft / (totalTime || 1)) }}
                                    className="drop-shadow-sm"
                                />
                            </svg>

                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                <span ref={clockRef} className="text-7xl font-black tracking-tight text-white drop-shadow-2xl">
                                    {formatTime(timeLeft)}
                                </span>

                                <div className={`mt-2 flex flex-col items-center`}>
                                    <span className={`text-[11px] font-black uppercase tracking-[0.4em] text-white`}>
                                        {isRunning ? (mode === 'work' ? 'PROTOCOL Foco' : 'Recuperação') : 'SESSÃO PAUSADA'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={`flex items-end gap-12 z-10 mt-6 ${!activeSubject ? 'opacity-30 pointer-events-none' : ''}`}>
                            <div className="flex flex-col items-center gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={reset}
                                    className="w-16 h-16 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/5 text-white flex items-center justify-center transition-all shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] group active:shadow-inner"
                                >
                                    <RotateCcw size={24} className="group-hover:rotate-[-45deg] transition-transform duration-500" />
                                </motion.button>
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">REINICIAR</span>
                            </div>

                            <div className="flex flex-col items-center gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        if (mode === 'work' && !activeSubject) {
                                            setShowWarning(true);
                                            setTimeout(() => setShowWarning(false), 3000);
                                            return;
                                        }
                                        setIsRunning(!isRunning);
                                    }}
                                    className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-[0_20px_40px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.2)] border-4 ${isRunning ? 'bg-gradient-to-b from-stone-50 to-stone-200 text-black border-white' : 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white border-emerald-300 shadow-[0_0_40px_rgba(34,197,94,0.2)]'}`}
                                >
                                    {isRunning ? <Pause size={56} fill="currentColor" /> : <Play size={56} fill="currentColor" className="ml-2" />}
                                </motion.button>
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{isRunning ? 'PAUSAR' : 'CONTINUAR'}</span>
                            </div>

                            <div className="flex flex-col items-center gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={skip}
                                    className="w-16 h-16 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/5 text-white flex items-center justify-center transition-all shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] group active:shadow-inner"
                                >
                                    <SkipForward size={24} className="group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">PULAR</span>
                            </div>
                        </div>

                        {/* Speed Telemetry Controls */}
                        {activeSubject && (
                            <div className="absolute bottom-10 right-10 flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/10 shadow-2xl z-[100]">
                                {[1, 10, 100].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setSpeed(s)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-black transition-all duration-500 ${speed === s
                                            ? 'bg-white text-black'
                                            : 'text-white/40 hover:text-white'
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
                    className="w-full px-10 md:px-14 py-8 md:py-10 rounded-xl relative overflow-hidden bg-[#b08e6b] border-2 border-[#94785a] shadow-xl group/bottom"
                >
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[9px] font-black text-[#2d1a12]/60 uppercase tracking-[0.3em] ml-2">PROGRESSO DOS CICLOS</h3>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setTargetCycles(Math.max(completedCycles < 1 ? 1 : completedCycles, targetCycles - 1))}
                                        disabled={!activeSubject || targetCycles <= Math.max(completedCycles < 1 ? 1 : completedCycles, 1)}
                                        className="w-8 h-8 rounded-lg bg-white/10 border border-[#2d1a12]/20 text-[#2d1a12] hover:bg-white/20 transition-all flex items-center justify-center font-bold"
                                    >
                                        -
                                    </button>
                                    <button
                                        onClick={() => setTargetCycles(targetCycles + 1)}
                                        disabled={!activeSubject}
                                        className="w-8 h-8 rounded-lg bg-white/10 border border-[#2d1a12]/20 text-[#2d1a12] hover:bg-white/20 transition-all flex items-center justify-center font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-[#2d1a12] tabular-nums tracking-tighter">{sessions}</span>
                                    <span className="text-sm font-black text-[#2d1a12]/40">/ {targetCycles || 1}</span>
                                </div>
                            </div>
                        </div>

                        {/* Barra Segmentada de Progresso */}
                        <div className="flex items-center gap-4 w-full">
                            {Array.from({ length: targetCycles || 1 }).map((_, i) => (
                                <React.Fragment key={i}>
                                    {/* Barra de Trabalho (Azul) */}
                                    <div className="flex-1 relative group/work">
                                        <div className="work-segment-bar bg-[#2d1a12]/10">
                                            <div
                                                id={`work-fill-${i + 1}`}
                                                className="work-segment-fill"
                                                style={{
                                                    width: (i < sessions - 1 || (i === sessions - 1 && mode === 'break'))
                                                        ? '100%'
                                                        : (sessions === i + 1 && mode === 'work'
                                                            ? (isRunning ? undefined : `${(1 - timeLeft / (totalTime || 1)) * 100}%`)
                                                            : '0%')
                                                }}
                                            />
                                            {/* Icone de Check se completo */}
                                            {((i < sessions - 1) || (i === sessions - 1 && mode === 'break')) && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <CheckCircle2 size={8} className="text-white/80" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[7px] font-black text-[#2d1a12]/40 opacity-0 group-hover/work:opacity-100 transition-opacity">CICLO {i + 1}</span>
                                    </div>

                                    {/* Bolinha de Descanso (Verde) */}
                                    {i < (targetCycles || 1) - 1 && (
                                        <div className="relative w-6 h-6 rounded-full bg-[#2d1a12]/10 border-2 border-[#2d1a12]/20 overflow-hidden shadow-inner flex items-center justify-center liquid-container group/ball flex-shrink-0">
                                            <div
                                                id={`break-ball-${i + 1}`}
                                                className="absolute bottom-0 left-0 right-0 bg-emerald-500/80 transition-all duration-300"
                                                style={{
                                                    height: (i < sessions - 1)
                                                        ? '100%'
                                                        : (sessions === i + 1 && mode === 'break'
                                                            ? `${(1 - timeLeft / (totalTime || 1)) * 100}%`
                                                            : '0%')
                                                }}
                                            >
                                                <div
                                                    id={`break-wave-${i + 1}`}
                                                    className="liquid-wave"
                                                    style={{
                                                        transform: (i < sessions - 1)
                                                            ? 'translateY(-150%)'
                                                            : (sessions === i + 1 && mode === 'break'
                                                                ? `translateY(${100 - (1 - timeLeft / (totalTime || 1)) * 100 - 150}%)`
                                                                : 'translateY(100%)')
                                                    }}
                                                />
                                            </div>
                                            {mode === 'break' && sessions === i + 1 && (
                                                <div className="relative z-10 w-2 h-2 rounded-full bg-white/40 animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                            )}

                                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#2d1a12] text-[#b08e6b] text-[6px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover/ball:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                PAUSA 5'
                                            </div>
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
}
