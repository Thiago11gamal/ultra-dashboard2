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
        } catch (_) {
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

    // ZUSTAND STATES
    const sessions = useAppStore(state => state.appState.pomodoro.sessions || 1);
    const setSessions = useAppStore(state => state.setPomodoroSessions);

    const targetCycles = useAppStore(state => state.appState.pomodoro.targetCycles);
    const setTargetCycles = useAppStore(state => state.setPomodoroTargetCycles);

    const completedCycles = useAppStore(state => state.appState.pomodoro.completedCycles || 0);
    const setCompletedCycles = useAppStore(state => state.setPomodoroCompletedCycles);

    const accumulatedMinutes = useAppStore(state => state.appState.pomodoro.accumulatedMinutes || 0);
    const setAccumulatedMinutes = useAppStore(state => state.setPomodoroAccumulatedMinutes);

    // SYNCHRONOUS REFS (Para cliques ultra-rápidos à prova de falhas)
    const sessionsRef = useRef(sessions);
    useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

    const targetCyclesRef = useRef(targetCycles);
    useEffect(() => { targetCyclesRef.current = targetCycles; }, [targetCycles]);

    const completedCyclesRef = useRef(completedCycles);
    useEffect(() => { completedCyclesRef.current = completedCycles; }, [completedCycles]);

    const accumulatedMinutesRef = useRef(accumulatedMinutes);
    useEffect(() => { accumulatedMinutesRef.current = accumulatedMinutes; }, [accumulatedMinutes]);

    const [isLayoutLocked, setIsLayoutLocked] = useState(() => {
        if (typeof window === 'undefined') return true;
        try {
            const saved = localStorage.getItem('pomodoroLayoutLocked');
            return saved ? JSON.parse(saved) : true;
        } catch (_) { return true; }
    });

    const toggleLayoutLock = (e) => {
        e.stopPropagation();
        const newState = !isLayoutLocked;
        setIsLayoutLocked(newState);
        try {
            localStorage.setItem('pomodoroLayoutLocked', JSON.stringify(newState));
        } catch (_) { }
    };

    const [speed, setSpeed] = useState(1);
    const [showWarning, setShowWarning] = useState(false);
    const showToast = useToast();

    useEffect(() => {
        if (sessions > 20 || sessions < 1 || isNaN(sessions)) {
            setSessions(1);
        }
    }, [sessions, setSessions]);

    const [sessionHistory, setSessionHistory] = useState(() => getSavedState('sessionHistory', []));

    const saveTimeoutRef = useRef(null);
    const resumeTransitionTimeoutRef = useRef(null);
    const transitionUnlockTimeoutRef = useRef(null);
    const isTransitioningRef = useRef(false);

    const clockRef = useRef(null);
    const svgCircleRef = useRef(null);
    const bottomBarRef = useRef(null);


    const timeLeftRef = useRef(timeLeft);

    const modeRef = useRef(mode);
    useEffect(() => { modeRef.current = mode; }, [mode]);

    const speedRef = useRef(speed || 1);
    useEffect(() => { speedRef.current = speed; }, [speed]);

    useEffect(() => {
        if (!isRunning) {
            timeLeftRef.current = timeLeft;
        }
    }, [timeLeft, isRunning]);

    const [uiPosition, setUiPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroPosition');
            return saved ? JSON.parse(saved) : { x: 0, y: 0 };
        } catch (_) { return { x: 0, y: 0 }; }
    });

    const alarmAudioRef = useRef(null);
    useEffect(() => {
        try {
            alarmAudioRef.current = new Audio('/sounds/alarm.wav');
        } catch (_) { }

        return () => {
            if (alarmAudioRef.current) {
                try {
                    alarmAudioRef.current.pause();
                    alarmAudioRef.current.src = '';
                    alarmAudioRef.current.load();
                } catch (_) { }
                alarmAudioRef.current = null;
            }
        };
    }, []);

    const sendNotification = useCallback((title, body) => {
        if (!("Notification" in window)) return;
        if (Notification.permission === "granted") {
            new Notification(title, { body, icon: '/favicon.ico' });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification(title, { body, icon: '/favicon.ico' });
                }
            });
        }
    }, []);

    const savePomodoroState = useCallback((overrides = {}) => {
        if (typeof window === 'undefined') return;
        try {
            const stateToSave = {
                mode: modeRef.current,
                timeLeft: timeLeftRef.current,
                isRunning: isRunning,
                savedAt: Date.now(),
                activeTaskId: activeSubject?.taskId,
                sessionInstanceId: activeSubject?.sessionInstanceId,
                sessionHistory,
                sessions: sessionsRef.current,
                completedCycles: completedCyclesRef.current,
                accumulatedMinutes: accumulatedMinutesRef.current,
                ...overrides
            };
            localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
        } catch (err) {
            console.debug('Pomodoro state save failed', err);
        }
    }, [isRunning, activeSubject, sessionHistory]);

    // CORE LOGIC: Totalmente síncrona usando Refs para permitir cliques ultra-rápidos
    const transitionSession = useCallback((completedMode, source = 'natural', forcedTimeLeft = null) => {
        if (source === 'natural') {
            if (isTransitioningRef.current) return;
            isTransitioningRef.current = true;
        }

        const currentSessions = sessionsRef.current;
        const currentTargetCycles = targetCyclesRef.current || 1;
        const currentCompletedCycles = completedCyclesRef.current;
        const currentAccumulated = accumulatedMinutesRef.current;

        const isNatural = source === 'natural';
        const completedDuration = completedMode === 'work' ? safeSettings.pomodoroWork : safeSettings.pomodoroBreak;

        setSessionHistory(prev => [...prev, { type: completedMode, duration: completedDuration }]);

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

            const newAccumulated = currentAccumulated + sessionMinutes;
            accumulatedMinutesRef.current = newAccumulated; // Síncrono
            setAccumulatedMinutes(newAccumulated);

            if (currentSessions >= currentTargetCycles && currentTargetCycles > 0) {
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
                        sendNotification('🏆 Missão Cumprida!', `Série de ${currentTargetCycles} ciclos finalizada. ${newAccumulated} minutos salvos com sucesso!`);
                    }

                    // Reset de Refs síncronos
                    accumulatedMinutesRef.current = 0;
                    sessionsRef.current = 1;
                    completedCyclesRef.current = 0;
                    modeRef.current = 'work';

                    setAccumulatedMinutes(0);
                    onFullCycleComplete?.(newAccumulated);
                    setSessions(1);
                    setCompletedCycles(0);
                    localStorage.removeItem('pomodoroState');
                } catch (err) {
                    console.error("Erro na transição final:", err);
                    onExit?.();
                }
                if (source === 'natural') isTransitioningRef.current = false;
                return;
            }

            modeRef.current = 'break';
            setMode('break');
            const breakTime = (safeSettings.pomodoroBreak || 5) * 60;
            setTimeLeft(breakTime);
            timeLeftRef.current = breakTime;
            setIsRunning(false);

            savePomodoroState({
                mode: 'break',
                timeLeft: breakTime,
                isRunning: false,
                accumulatedMinutes: newAccumulated
            });

            if (isNatural) {
                if (safeSettings.soundEnabled && alarmAudioRef.current) {
                    try {
                        alarmAudioRef.current.currentTime = 0;
                        alarmAudioRef.current.play().catch(() => { });
                    } catch (_) { }
                }
                sendNotification('⏰ Pomodoro Finalizado!', 'Hora de fazer uma pausa! Você merece descansar.');
            }
        } else {
            const newCompletedCycles = currentCompletedCycles + 1;
            completedCyclesRef.current = newCompletedCycles; // Síncrono
            setCompletedCycles(newCompletedCycles);

            const isTerminalBreak = currentSessions >= currentTargetCycles && currentTargetCycles > 0;
            if (isNatural) {
                if (!isTerminalBreak && safeSettings.soundEnabled && alarmAudioRef.current) {
                    try {
                        alarmAudioRef.current.currentTime = 0;
                        alarmAudioRef.current.play().catch(() => { });
                    } catch (_) { }
                }
                sendNotification('☕ Pausa Finalizada!', 'Pronto para voltar a estudar? Vamos lá!');
            }

            if (currentSessions >= currentTargetCycles && currentTargetCycles > 0) {
                setIsRunning(false);
                try {
                    if (activeSubject && onUpdateStudyTime && currentAccumulated > 0) {
                        onUpdateStudyTime(activeSubject.categoryId, currentAccumulated, activeSubject.taskId);
                    }

                    if (isNatural) {
                        if (safeSettings.soundEnabled && alarmAudioRef.current) {
                            try {
                                alarmAudioRef.current.currentTime = 0;
                                alarmAudioRef.current.play().catch(() => { });
                            } catch (e) { }
                        }
                        sendNotification('🏆 Missão Cumprida!', `Série de ${currentTargetCycles} ciclos finalizada. ${currentAccumulated} minutos salvos com sucesso!`);
                    }

                    // Reset de Refs síncronos
                    accumulatedMinutesRef.current = 0;
                    sessionsRef.current = 1;
                    completedCyclesRef.current = 0;
                    modeRef.current = 'work';

                    setAccumulatedMinutes(0);
                    onFullCycleComplete?.(currentAccumulated);
                    setSessions(1);
                    setCompletedCycles(0);
                    localStorage.removeItem('pomodoroState');
                } catch (err) {
                    console.error("Erro na transição final:", err);
                    onExit?.();
                }
                if (source === 'natural') isTransitioningRef.current = false;
                return;
            }

            modeRef.current = 'work';
            setMode('work');
            const newSessions = currentSessions + 1;
            sessionsRef.current = newSessions; // Síncrono
            setSessions(newSessions);
            const workTime = (safeSettings.pomodoroWork || 25) * 60;
            setTimeLeft(workTime);
            timeLeftRef.current = workTime;
            setIsRunning(false);

            savePomodoroState({
                mode: 'work',
                timeLeft: workTime,
                isRunning: false,
                sessions: newSessions,
                completedCycles: newCompletedCycles
            });
        }

        if (source === 'natural') {
            if (transitionUnlockTimeoutRef.current) clearTimeout(transitionUnlockTimeoutRef.current);
            transitionUnlockTimeoutRef.current = setTimeout(() => {
                isTransitioningRef.current = false;
            }, 100);
        }
    }, [safeSettings, setSessions, onSessionComplete, activeSubject, onUpdateStudyTime, setCompletedCycles, onFullCycleComplete, savePomodoroState, sendNotification, setAccumulatedMinutes, onExit]);

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
                        if (parsed.timeLeft - elapsedSeconds < -1800) {
                            localStorage.removeItem('pomodoroState');
                            return;
                        }

                        setTimeout(() => {
                            const newTime = parsed.timeLeft - elapsedSeconds;
                            if (newTime <= 0) {
                                setTimeLeft(0);
                                setIsRunning(false);
                                setMode(parsed.mode);
                                if (msSinceSave < 30 * 60 * 1000) {
                                    if (resumeTransitionTimeoutRef.current) clearTimeout(resumeTransitionTimeoutRef.current);
                                    resumeTransitionTimeoutRef.current = setTimeout(() => {
                                        transitionSession(parsed.mode, 'natural', 0);
                                    }, 100);
                                }
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
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (resumeTransitionTimeoutRef.current) clearTimeout(resumeTransitionTimeoutRef.current);
            if (transitionUnlockTimeoutRef.current) clearTimeout(transitionUnlockTimeoutRef.current);
        };
    }, [activeSubject, savedState, transitionSession]);


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

    const containerRef = useRef(null);

    useEffect(() => {
        const checkPos = () => {
            if (uiPosition.x !== 0 || uiPosition.y !== 0) {
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
        } catch (_) { }
    };

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            savePomodoroState();
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [savePomodoroState]);

    const handleTimerComplete = useCallback(() => {
        setIsRunning(false);
        transitionSession(modeRef.current, 'natural', 0);
    }, [transitionSession]);

    const wakeLockRef = useRef(null);
    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && isRunning) {
                if (wakeLockRef.current) return;
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

            const cachedClock = clockRef.current;
            const cachedCircle = svgCircleRef.current;
            const cachedWorkFill = document.getElementById(`work-fill-${sessions}`);
            const cachedBreakBall = document.getElementById(`break-ball-${sessions}`);
            const cachedBreakWave = document.getElementById(`break-wave-${sessions}`);

            const tick = (now) => {
                const deltaMs = now - lastTickTime;
                lastTickTime = now;

                timeLeftRef.current = Math.max(0, timeLeftRef.current - (deltaMs / 1000) * speedRef.current);
                const current = timeLeftRef.current;

                const fraction = current / (currentTotalTime || 1);
                const displaySecond = Math.ceil(current);

                if (cachedClock && displaySecond !== lastDisplayedSecond) {
                    const mins = Math.floor(displaySecond / 60);
                    const secs = displaySecond % 60;
                    cachedClock.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                }

                if (cachedCircle) {
                    cachedCircle.style.strokeDashoffset = circumference * fraction;
                }

                if (cachedWorkFill && mode === 'work') {
                    cachedWorkFill.style.width = `${(1 - fraction) * 100}%`;
                }

                if (cachedBreakBall && mode === 'break') {
                    const fillHeight = (1 - fraction) * 100;
                    cachedBreakBall.style.height = `${fillHeight}%`;
                    if (cachedBreakWave) {
                        cachedBreakWave.style.top = `${100 - fillHeight - 150}%`;
                    }
                }

                if (displaySecond !== lastDisplayedSecond || current <= 0) {
                    lastDisplayedSecond = displaySecond;
                    setTimeLeft(current);

                    if (current <= 0) {
                        cancelAnimationFrame(rafId);
                        handleTimerComplete();
                        return;
                    }
                }

                rafId = requestAnimationFrame(tick);
            };

            rafId = requestAnimationFrame(tick);
        }
        return () => cancelAnimationFrame(rafId);
    }, [isRunning, mode, safeSettings.pomodoroWork, safeSettings.pomodoroBreak, sessions, handleTimerComplete]);

    const reset = () => {
        if (isTransitioningRef.current) return;
        isTransitioningRef.current = true;

        const currentMode = modeRef.current;
        const currentSessions = sessionsRef.current;
        const currentCompletedCycles = completedCyclesRef.current;
        const currentAccumulated = accumulatedMinutesRef.current;

        const currentTotalTime = currentMode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (safeSettings.pomodoroBreak || 5) * 60;
        const elapsed = currentTotalTime - timeLeftRef.current;

        const shouldRewindSequentially = elapsed <= 5;

        let newMode = currentMode;
        let newSessions = currentSessions;
        let newCompletedCycles = currentCompletedCycles;
        let newAccumulatedMinutes = currentAccumulated;

        if (shouldRewindSequentially) {
            if (currentMode === 'break') {
                newMode = 'work';
                newAccumulatedMinutes = Math.max(0, currentAccumulated - (safeSettings.pomodoroWork || 25));
                showToast('Retornando ao início do Foco', 'info');
            } else {
                if (currentSessions > 1) {
                    newMode = 'break';
                    newSessions = currentSessions - 1;
                    newCompletedCycles = Math.max(0, currentCompletedCycles - 1);
                    showToast(`Retornando à Pausa do Ciclo ${newSessions}`, 'info');
                } else {
                    newMode = 'work';
                    newSessions = 1;
                    newCompletedCycles = 0;
                    newAccumulatedMinutes = 0;
                    showToast('Reiniciando Ciclo 1', 'info');
                }
            }
        } else {
            showToast('Reiniciando fase atual', 'info');
        }

        const resetTime = newMode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (safeSettings.pomodoroBreak || 5) * 60;

        setIsRunning(false);

        modeRef.current = newMode;
        sessionsRef.current = newSessions;
        completedCyclesRef.current = newCompletedCycles;
        accumulatedMinutesRef.current = newAccumulatedMinutes;

        setMode(newMode);
        setTimeLeft(resetTime);
        timeLeftRef.current = resetTime;

        setSessions(newSessions);
        setCompletedCycles(newCompletedCycles);
        setAccumulatedMinutes(newAccumulatedMinutes);

        if (clockRef.current) {
            const mins = Math.floor(resetTime / 60);
            const secs = resetTime % 60;
            clockRef.current.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }

        if (svgCircleRef.current) {
            svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);
        }

        savePomodoroState({
            mode: newMode,
            timeLeft: resetTime,
            isRunning: false,
            sessions: newSessions,
            completedCycles: newCompletedCycles,
            accumulatedMinutes: newAccumulatedMinutes
        });

        const target = targetCyclesRef.current || 4;
        for (let i = 1; i <= target; i++) {
            const fill = document.getElementById(`work-fill-${i}`);
            if (fill) {
                if (i < newSessions) fill.style.width = '100%';
                else if (i === newSessions && newMode === 'break') fill.style.width = '100%';
                else fill.style.width = '0%';
            }

            const ball = document.getElementById(`break-ball-${i}`);
            if (ball) ball.style.height = i < newSessions ? '100%' : '0%';
        }

        if (transitionUnlockTimeoutRef.current) clearTimeout(transitionUnlockTimeoutRef.current);
        transitionUnlockTimeoutRef.current = setTimeout(() => {
            isTransitioningRef.current = false;
        }, 150);
    };



    const handleManualExit = () => {
        const finalMinutes = accumulatedMinutesRef.current;
        if (finalMinutes > 0 && activeSubject && onUpdateStudyTime) {
            onUpdateStudyTime(activeSubject.categoryId, finalMinutes, activeSubject.taskId);
            accumulatedMinutesRef.current = 0;
            setAccumulatedMinutes(0);
            showToast(`Salvamento parcial: ${finalMinutes} minutos registados.`, 'success');
        }

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
                                    onClick={toggleLayoutLock}
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
                            let iconColor = 'text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]';
                            let labelColor = 'text-amber-500/40';
                            let valueColor = 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]';
                            let Icon = Activity;
                            if (priority === 'high') {
                                label = 'ALTA';
                                iconColor = 'text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]';
                                labelColor = 'text-red-500/40';
                                valueColor = 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]';
                                Icon = AlertCircle;
                            } else if (priority === 'low') {
                                label = 'BAIXA';
                                iconColor = 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]';
                                labelColor = 'text-emerald-500/40';
                                valueColor = 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]';
                            }
                            return (
                                <div className="absolute top-6 left-6">
                                    <div className={`px-5 py-2.5 rounded-xl border border-white/5 backdrop-blur-3xl flex items-center gap-3 bg-gradient-to-br from-black/90 to-black/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.4)]`}>
                                        <div className="relative">
                                            <Icon size={16} className={iconColor} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${labelColor}`}>SINAL: PRIORIDADE</span>
                                            <span className={`text-xs font-black tracking-widest ${valueColor}`}>{label}</span>
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

                        <div className={`grid grid-cols-3 items-center justify-center gap-4 z-10 mt-10 w-full max-w-2xl px-6 ${!activeSubject ? 'opacity-30 pointer-events-none' : ''}`}>
                            {/* RESET AREA */}
                            <div className="flex flex-col items-center gap-3 order-1">
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

                            {/* MAIN CONTROL AREA */}
                            <div className="flex flex-col items-center gap-4 order-2 scale-110">
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

                                        if (!isRunning && alarmAudioRef.current) {
                                            const audio = alarmAudioRef.current;
                                            audio.muted = true;
                                            audio.play().then(() => {
                                                audio.pause();
                                                audio.muted = false;
                                            }).catch(() => { });
                                        }
                                    }}
                                    className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-[0_20px_40px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.2)] border-4 ${isRunning ? 'bg-gradient-to-b from-stone-50 to-stone-200 text-black border-white' : 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white border-emerald-300 shadow-[0_0_40px_rgba(34,197,94,0.2)]'}`}
                                >
                                    {isRunning ? <Pause size={56} fill="currentColor" /> : <Play size={56} fill="currentColor" className="ml-2" />}
                                </motion.button>
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] drop-shadow-md">{isRunning ? 'PAUSAR PROTOCOLO' : 'INICIAR SESSÃO'}</span>
                            </div>

                            {/* SPEED AREA (BALANCING RESET) */}
                            <div className="flex flex-col items-center gap-3 order-3">
                                <div className="flex flex-col items-center bg-black/30 backdrop-blur-md p-2 rounded-2xl border border-white/5 shadow-inner">
                                    <div className="flex items-center gap-1">
                                        {[1, 10, 100].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setSpeed(s)}
                                                className={`w-10 h-8 rounded-lg text-[10px] font-black transition-all duration-500 flex items-center justify-center ${speed === s
                                                    ? 'bg-white text-black shadow-lg scale-110'
                                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                {s}X
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">VELOCIDADE</span>
                            </div>
                        </div>
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
                                    <span className="text-3xl font-black text-[#2d1a12] tabular-nums tracking-tighter">{completedCycles}</span>
                                    <span className="text-sm font-black text-[#2d1a12]/40">/ {targetCycles || 1}</span>
                                </div>
                            </div>
                        </div>

                        <div
                            key={`segments-${sessions}-${mode}`}
                            className="flex flex-1 items-center gap-1.5 h-16 px-4"
                        >
                            {Array.from({ length: targetCycles || 1 }).map((_, i) => (
                                <React.Fragment key={i}>
                                    <div className="flex-1 relative group/work">
                                        <div className="work-segment-bar bg-[#2d1a12]/10">
                                            <div
                                                id={`work-fill-${i + 1}`}
                                                className="work-segment-fill"
                                                style={{
                                                    width: (i < sessions - 1 || (i === sessions - 1 && mode === 'break'))
                                                        ? '100%'
                                                        : '0%'
                                                }}
                                            />
                                            {((i < sessions - 1) || (i === sessions - 1 && mode === 'break')) && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <CheckCircle2 size={8} className="text-white/80" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[7px] font-black text-[#2d1a12]/40 opacity-0 group-hover/work:opacity-100 transition-opacity">CICLO {i + 1}</span>
                                    </div>

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
                                                        top: (i < sessions - 1)
                                                            ? '-150%'
                                                            : '100%'
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
                        </div >
                    </div >
                </div >
            </motion.div >
        </div >
    );
}
