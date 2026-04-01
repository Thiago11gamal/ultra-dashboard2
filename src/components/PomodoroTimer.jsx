import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Lock, Unlock, Activity, AlertCircle, Settings } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
// Update component signature to accept onExit and defaultTargetCycles
export default function PomodoroTimer({ settings = {}, onSessionComplete, activeSubject, onFullCycleComplete, categories = [], onUpdateStudyTime, onExit, defaultTargetCycles = 1 }) {

    // --- STATE PERSISTENCE INITIALIZATION ---

    // Safe Settings with Defaults
    const safeSettings = useMemo(() => ({
        pomodoroWork: settings?.pomodoroWork || 25,
        pomodoroBreak: settings?.pomodoroBreak || 5,
        soundEnabled: settings?.soundEnabled ?? true,
        ...settings
    }), [settings]);

    // Load saved state ONLY if it matches the current task
    const savedState = useMemo(() => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = JSON.parse(localStorage.getItem('pomodoroState'));
            // If we have a saved task ID and it matches the current one AND the session instance matches
            // This ensures that clicking "Play" (which generates a new sessionInstanceId) always starts fresh
            // while preserving state during re-renders or accidental closes if we persist activeSubject later
            if (saved &&
                activeSubject?.taskId &&
                saved.activeTaskId === activeSubject.taskId &&
                saved.sessionInstanceId === activeSubject.sessionInstanceId) {
                return saved;
            }
        } catch (error) {
            console.error('Error loading pomodoro state:', error);
        }
        return null;
    }, [activeSubject]);

    const getSavedState = (key, defaultValue) => {
        if (savedState && savedState[key] !== undefined) {
            return savedState[key];
        }
        return defaultValue;
    };

    const [mode, setMode] = useState(() => getSavedState('mode', 'work'));
    // Default time depends on mode if not saved
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

    // --- TIMER REFS FOR CLEANUP & PERSISTENCE ---
    const timerRef = useRef(null);
    const innerTimerRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const isSkippingRef = useRef(false);

    // --- VISUAL DOM REFS (rAF drives these directly — no React re-render needed) ---
    const clockRef = useRef(null);
    const svgCircleRef = useRef(null);
    const bottomBarRef = useRef(null);
    const sphereRef = useRef(null);

    useEffect(() => {
        if (savedState) {
            try {
                const parsed = savedState;

                // CRITICAL FIX: Only resume if the saved session matches the current valid session instance
                // This prevents old/stale sessions from zeroing out a new timer
                if (activeSubject && parsed.sessionInstanceId !== activeSubject.sessionInstanceId) {
                    return;
                }

                // Staleness Check: If saved more than 24 hours ago, ignore it completely
                const now = Date.now();
                const msSinceSave = now - (parsed.savedAt || 0);
                if (msSinceSave > 24 * 60 * 60 * 1000) {
                    return;
                }

                if (parsed.isRunning && parsed.savedAt) {
                    // Timer was running, calculate elapsed time
                    const elapsedSeconds = Math.floor(msSinceSave / 1000);

                    if (elapsedSeconds > 0) {
                        // If too much time passed (more than the timer itself), just reset to clean slate
                        // meaningful limit: if we exceeded the timer by > 5 minutes, force reset
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
                            // FIX Bug 12: force effect to restart and pick up new timeLeft as initialTimeLeft
                            setIsRunning(false);
                            innerTimerRef.current = setTimeout(() => setIsRunning(true), 0);
                        }, 0);
                    }
                } else {
                    // Cleanup old state if meaningful
                    if (msSinceSave > 12 * 60 * 60 * 1000) {
                        localStorage.removeItem('pomodoroState');
                    }
                }
                // eslint-disable-next-line no-unused-vars
            } catch (err) {
                console.error("Resume logic error");
            }
        }
        return () => {
            clearTimeout(timerRef.current);
            clearTimeout(innerTimerRef.current);
        };
    }, [activeSubject, safeSettings, savedState]); // Added savedState dependency

    const [isLayoutLocked, setIsLayoutLocked] = useState(true);
    const [speed, setSpeed] = useState(1); // Dev speed toggles added back per user request
    const [showWarning, setShowWarning] = useState(false);


    // Initialize targetCycles from prop if store is initial (optional, but good for first mount)
    useEffect(() => {
        if (targetCycles === 1 && defaultTargetCycles !== 1) {
            setTargetCycles(defaultTargetCycles);
        }
    }, [defaultTargetCycles, targetCycles, setTargetCycles]);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Send browser notification
    const sendNotification = (title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: '🍅',
                    tag: 'pomodoro-timer'
                });
            } catch {
                // Ignore notification errors
            }
        }
    };

    // Persistent Position
    const [uiPosition, setUiPosition] = useState(() => {
        const saved = localStorage.getItem('pomodoroPosition');
        return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    });

    const handleDragEnd = (event, info) => {
        const newPos = {
            x: uiPosition.x + info.offset.x,
            y: uiPosition.y + info.offset.y
        };
        setUiPosition(newPos);
        try {
            localStorage.setItem('pomodoroPosition', JSON.stringify(newPos));
        } catch { /* ignore storage errors */ }
    };

    // --- ROBUST STATE SAVING (DEBOUNCED & MANUAL) ---
    // Centralized save function to avoid race conditions and stale data
    const savePomodoroState = useCallback((overrides = {}) => {
        const stateToSave = {
            mode,
            timeLeft,
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
        } catch (err) {
            // Silently handle quota errors
        }
    }, [mode, timeLeft, isRunning, sessions, completedCycles, targetCycles, sessionHistory, activeSubject]);


    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            savePomodoroState();
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [savePomodoroState]);


    // Timer complete handler - declared first to be available for useEffect
    const transitionSession = useCallback((completedMode, source = 'natural') => {
        // Prevent double-fires
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

            // Track Study Time
            if (activeSubject && onUpdateStudyTime) {
                onUpdateStudyTime(activeSubject.categoryId, safeSettings.pomodoroWork, activeSubject.taskId);
            }

            // Switch to break
            setMode('break');
            const breakTime = (safeSettings.pomodoroBreak || 5) * 60;
            setTimeLeft(breakTime);
            setIsRunning(false);

            // IMMEDIATE SAVE
            savePomodoroState({
                mode: 'break',
                timeLeft: breakTime,
                isRunning: false,
                sessions: newSessions
            });

            // Sound & Notification only if natural
            if (isNatural) {
                if (safeSettings.soundEnabled) {
                    try {
                        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleBoAAHjE56dfDgABaL3wq2kbAQBVtfyyRAAWYr3upm8dBQBRs/21bBwGBV687K5wIA0AWLn2sXIfDgBese+3eScSAGK48bN7JxQAaLbut3onFQBxt/SzdiURAHS48bR9Jw8Ab7f1uH4nDwBzt');
                        audio.play().catch(() => { });
                    } catch { }
                }
                sendNotification('⏰ Pomodoro Finalizado!', 'Hora de fazer uma pausa! Você merece descansar.');
            }
        } else {
            // Break finished
            const newCompletedCycles = completedCycles + 1;
            setCompletedCycles(newCompletedCycles);

            if (isNatural) {
                if (safeSettings.soundEnabled) {
                    try {
                        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleBoAAHjE56dfDgABaL3wq2kbAQBVtfyyRAAWYr3upm8dBQBRs/21bBwGBV687K5wIA0AWLn2sXIfDgBese+3eScSAGK48bN7JxQAaLbut3onFQBxt/SzdiURAHS48bR9Jw8Ab7f1uH4nDwBzt');
                        audio.play().catch(() => { });
                    } catch { }
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

    // --- ROBUST TIMER LOGIC ---
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

                // Usa o ref de velocidade e atualiza o tempo restante de forma independente do render do React
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
                    setTimeLeft(current); // Sincroniza estado lógico a ~1fps
                }

                if (current > 0) {
                    rafId = requestAnimationFrame(tick);
                }
            };

            rafId = requestAnimationFrame(tick);
        }
        return () => cancelAnimationFrame(rafId);
    }, [isRunning, mode, safeSettings.pomodoroWork, safeSettings.pomodoroBreak]);


    // Monitor TimeLeft for completion (Separated to avoid re-triggering the loop)
    const isHandlingCompleteRef = React.useRef(false);
    useEffect(() => {
        if (timeLeft <= 0 && isRunning && !isHandlingCompleteRef.current) {
            isHandlingCompleteRef.current = true;
            setTimeout(() => {
                handleTimerComplete();
                // O state isRunning vai virar false, mas resetamos o ref para a próxima sessão
                isHandlingCompleteRef.current = false;
            }, 0);
        }
    }, [timeLeft, isRunning, handleTimerComplete]);

    const reset = () => {
        setIsRunning(false);
        const resetTime = mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;
        setTimeLeft(resetTime);
        // Force save immediately to clean state using helper
        savePomodoroState({
            timeLeft: resetTime,
            isRunning: false
        });
    };

    /**
     * onSessionComplete(): chamado sempre SEM argumentos ao fim de cada sessão work
     * (tanto por conclusão natural quanto por Skip). O registro de tempo de estudo
     * é feito exclusivamente via onUpdateStudyTime — nunca via onSessionComplete.
     */
    const skip = () => {
        setIsRunning(false);
        transitionSession(mode, 'skip');
    };

    // Format time as MM:SS
    const formatTime = (seconds) => {
        // Use Math.ceil to show "00:01" until strictly 0
        const secsInt = Math.ceil(seconds);
        const mins = Math.floor(secsInt / 60);
        const secs = secsInt % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const totalTime = mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;

    // 🔒 LOCKED – DO NOT MODIFY THIS BLOCK
    // The smooth float-based progress is intentional. A previous attempt to use Math.ceil()
    // here to "sync" the bar with the clock broke the visual behavior. DO NOT change this.
    // Reverted 2026-03-10.
    const rawProgress = ((totalTime - timeLeft) / totalTime) * 100;
    const progress = (timeLeft >= totalTime || timeLeft <= 0) ? (timeLeft <= 0 ? 100 : 0) : Math.max(0, Math.min(100, rawProgress));

    const retention = useMemo(() => {
        if (!activeSubject) return null;
        const cat = categories.find(c => c.name === activeSubject.category);
        if (!cat || !cat.lastStudiedAt) return { val: 100, label: 'Novo', color: 'text-emerald-400', border: 'border-emerald-500' };

        const last = new Date(cat.lastStudiedAt).getTime();
        
        // FIX: Prevenir cálculo com data corrompida (NaN)
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

    // Layout Variants - Soft / Academic
    // Note: containerClass was previously defined here but is unused

    // Dynamic Colors based on State - Memoized
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
        <motion.div
            drag={!isLayoutLocked}
            dragMomentum={false}
            animate={uiPosition}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.01 }}
            className={`w-full max-w-3xl mx-auto space-y-6 relative font-sans flex flex-col items-center z-50 ${!isLayoutLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {/* 1. TOP BAR: Modern Clean Header */}
            <div className="relative flex items-center justify-center py-2 w-full px-4">
                <div className="flex-1 flex justify-center bg-transparent">
                    {activeSubject ? (
                        <motion.div
                            initial={{ y: -5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            style={{
                                backgroundImage: 'url(/header-wood.png)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                            className={`relative flex items-center gap-3 w-full border border-white/20 rounded-3xl pl-8 pr-12 py-5 transition-all duration-500 shadow-lg max-w-full`}
                        >
                            {/* Icon Box */}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-sm transition-colors duration-500 bg-[#ead9ce] text-[#5c3d2e] border border-[#c4a48a] shrink-0`}>
                                {activeSubject.category ? activeSubject.category[0] : '📚'}
                            </div>

                            {/* Text Info */}
                            <div className="flex flex-col text-left justify-center flex-1 min-w-0 pr-2">
                                <span className="text-xl font-bold text-white tracking-normal truncate">
                                    {activeSubject.task}
                                </span>
                                <span className={`text-sm font-medium mt-1 transition-colors duration-500 text-stone-200 truncate`}>
                                    {activeSubject.category}
                                </span>
                            </div>


                        </motion.div>
                    ) : mode === 'break' ? (
                        <motion.div
                            initial={{ y: -5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className={`relative flex items-center justify-center gap-3 w-full border border-emerald-500/30 rounded-3xl py-5 transition-all duration-500 shadow-lg max-w-full bg-emerald-900/40`}
                        >
                            <span className="text-xl font-bold text-emerald-400 tracking-normal text-center drop-shadow-md">
                                Relaxando ☕
                            </span>
                        </motion.div>
                    ) : (
                        <motion.div
                            animate={showWarning ? {
                                scale: [1, 1.15, 1],
                                borderColor: ['#ef4444', '#ffffff', '#ef4444'],
                                backgroundColor: ['#991b1b', '#ef4444', '#991b1b'],
                                boxShadow: [
                                    '0 0 20px rgba(239, 68, 68, 0.4)',
                                    '0 0 60px rgba(239, 68, 68, 0.9)',
                                    '0 0 20px rgba(239, 68, 68, 0.4)'
                                ]
                            } : {}}
                            transition={{ duration: 0.4, repeat: showWarning ? Infinity : 0, ease: "easeInOut" }}
                            onClick={onExit}
                            className={`flex items-center gap-4 text-white text-base font-black uppercase tracking-widest border-4 border-dashed border-red-500 px-12 py-6 rounded-2xl bg-red-900/80 cursor-pointer hover:scale-105 transition-all shadow-2xl relative z-10 overflow-hidden group`}
                        >
                            {/* Inner Glow Pulse */}
                            {showWarning && (
                                <motion.div
                                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                                    transition={{ duration: 0.4, repeat: Infinity }}
                                    className="absolute inset-0 bg-white"
                                />
                            )}
                            <AlertCircle className={showWarning ? "text-white animate-bounce shrink-0" : "text-stone-500 shrink-0"} size={32} />
                            <span className="relative z-10 drop-shadow-md">Selecionar um assunto para começar</span>
                        </motion.div>
                    )}
                </div>

                {/* Lock & Reset Controls */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">


                    {!isLayoutLocked && (
                        <button
                            onClick={() => {
                                try {
                                    localStorage.setItem('pomodoroPosition', JSON.stringify({ x: 0, y: 0 }));
                                } catch { /* ignore storage errors */ }
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

            {/* 2. MAIN COCKPIT - Wood Visual */}
            <motion.div
                style={{
                    backgroundImage: 'url(/wood-texture.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)'
                }}
                animate={showWarning ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                whileDrag={{ scale: 1.01 }}
                className={`w-full border-4 border-[#3f2e26] transition-all duration-500 ease-out p-6 rounded-[2rem] relative overflow-hidden flex flex-col items-center justify-center shadow-2xl
                    ${!isLayoutLocked ? 'ring-2 ring-stone-600' : ''}
                    ${showWarning ? 'ring-4 ring-red-600 shadow-[0_0_50px_rgba(220,38,38,0.3)]' : ''}`}
            >
                <div className="relative z-10 w-full flex flex-col items-center">
                    {/* Subject Level Indicator - Left Side */}
                    {(() => {
                        if (!activeSubject) return null;
                        const priority = activeSubject.priority || 'medium';
                        let label = 'MÉDIA';
                        let levelColor = "text-stone-950 bg-amber-400 border-amber-500 shadow-lg shadow-black/40";
                        if (priority === 'high') { label = 'ALTA'; levelColor = "text-white bg-red-600 border-red-700 shadow-lg shadow-black/40"; }
                        else if (priority === 'low') { label = 'BAIXA'; levelColor = "text-white bg-emerald-600 border-emerald-700 shadow-lg shadow-black/40"; }
                        return (
                            <div className="absolute top-6 left-6 flex flex-col items-center gap-1">
                                <div className={`px-3 py-2 rounded-lg border flex flex-col items-center justify-center ${levelColor}`}>
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Prioridade</span>
                                    <span className="text-sm font-bold">{label}</span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Ebbinghaus Retention Indicator - Right Side */}
                    {activeSubject && retention && (
                        <div className="absolute top-6 right-6 flex flex-col items-center gap-1">
                            <div className={`px-3 py-2 rounded-lg border flex flex-col items-center justify-center bg-[#1c1917] ${retention.border} shadow-lg shadow-black/40`}>
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 text-slate-400">Retenção</span>
                                <span className={`text-sm font-bold ${retention.color}`}>{retention.val}%</span>
                            </div>
                        </div>
                    )}

                    {/* Mode Toggles - Soft Tabs */}
                    <div className={`flex items-center gap-1 mb-8 bg-[#1c1917] p-2 rounded-full border border-stone-800 ${!activeSubject ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button
                            onClick={() => { setMode('work'); setTimeLeft(safeSettings.pomodoroWork * 60); setIsRunning(false); }}
                            disabled={!activeSubject}
                            className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 ${mode === 'work' ? 'bg-[#292524] text-emerald-400 shadow-sm border border-stone-700' : 'text-stone-500 hover:text-stone-300'}`}
                        >
                            Foco
                        </button>
                        <button
                            onClick={() => { setMode('break'); setTimeLeft(safeSettings.pomodoroBreak * 60); setIsRunning(false); }}
                            disabled={!activeSubject}
                            className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 ${mode === 'break' ? 'bg-[#292524] text-emerald-400 border border-stone-700' : 'text-stone-500 hover:text-stone-300'}`}
                        >
                            Pausa
                        </button>
                    </div>

                    {/* THE TIMER - Compact */}
                    <div className={`relative mb-6 transition-all duration-500 rounded-full ${mode === 'work' && timeLeft <= 10 ? 'animate-pulse shadow-[0_0_70px_rgba(255,0,0,1)] ring-2 ring-[#ff0000]' : ''}`}>
                        <svg className="w-56 h-56 transform -rotate-90">
                            {/* Track */}
                            <circle cx="112" cy="112" r="100" fill="none" stroke="#44403c" strokeWidth="10" strokeLinecap="round" />

                            {/* Progress – 🔒 LOCKED: rAF drives strokeDashoffset directly, NO CSS transition */}
                            <circle
                                ref={svgCircleRef}
                                cx="112" cy="112" r="100" fill="none"
                                stroke="currentColor"
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 100}
                                // BUG FIX: Pass undefined instead of {} to prevent React from wiping out the inline
                                // strokeDashoffset set by the 60fps requestAnimationFrame loop.
                                style={isRunning ? undefined : { strokeDashoffset: 2 * Math.PI * 100 * (1 - progress / 100) }}
                                className={`${mode === 'work' ? 'text-stone-200' : 'text-stone-400'}`}
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {/* 🔒 LOCKED: ref allows rAF to update text directly — no React re-render */}
                            <span ref={clockRef} className={`text-5xl font-bold tracking-tighter transition-colors duration-500 text-stone-200`}>
                                {formatTime(timeLeft)}
                            </span>

                            <div className={`mt-3 flex items-center gap-2 px-3 py-1 rounded-full ${theme.bg} border border-stone-700 transition-colors duration-500`}>
                                <div className={`w-2 h-2 rounded-full ${isRunning
                                    ? (mode === 'work' && timeLeft <= 10 ? 'animate-pulse bg-[#ff0000] shadow-[0_0_15px_rgba(255,0,0,1)]' : 'animate-pulse bg-stone-200')
                                    : 'bg-stone-600'}`}></div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isRunning ? 'text-emerald-500' : 'text-stone-400'}`}>
                                    {isRunning ? (mode === 'work' ? 'Focando' : 'Pausa') : 'Pausado'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Controls - Compact Buttons */}
                    <div className={`flex items-center gap-4 z-10 ${!activeSubject ? 'opacity-30 pointer-events-none' : ''}`}>
                        {/* RESET */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={reset}
                            disabled={!activeSubject}
                            className="w-12 h-12 rounded-xl bg-[#1c1917] border border-stone-600 text-stone-100 hover:bg-[#3f2e26] hover:text-white flex items-center justify-center transition-all duration-300 shadow-lg shadow-black/50"
                            title="Reiniciar Timer"
                        >
                            <RotateCcw size={20} strokeWidth={3} className="text-amber-400 group-hover:text-amber-300 transition-colors" />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                if (mode === 'work' && !activeSubject) {
                                    setShowWarning(true);
                                    setTimeout(() => setShowWarning(false), 3000);
                                    return;
                                }
                                setIsRunning(!isRunning);
                            }}
                            disabled={!activeSubject}
                            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${theme.button}`}
                        >
                            {isRunning
                                ? <Pause size={36} fill="currentColor" className="text-emerald-400 opacity-100" />
                                : <Play size={36} fill="currentColor" className="ml-1 text-emerald-400 opacity-100" />}
                        </motion.button>

                        {/* SKIP */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={skip}
                            disabled={!activeSubject}
                            className="w-12 h-12 rounded-xl bg-[#1c1917] border border-stone-600 text-stone-100 hover:bg-[#3f2e26] hover:text-white flex items-center justify-center transition-all duration-300 shadow-lg shadow-black/50"
                            title="Pular Etapa"
                        >
                            <SkipForward size={20} strokeWidth={3} className="text-amber-400 group-hover:text-amber-300 transition-colors" />
                        </motion.button>
                    </div>

                    {/* Dev Speed Toggle */}
                    {activeSubject && (
                        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-[#1c1917] p-1.5 rounded-xl border border-stone-800 shadow-lg z-20">
                            {[1, 10, 100].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSpeed(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${speed === s
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'text-stone-500 hover:text-stone-300 hover:bg-[#292524]'
                                        }`}
                                >
                                    {s}x
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            </motion.div>

            {/* 3. FOOTER: Wood Visual */}
            <motion.div
                style={{
                    backgroundImage: 'url(/header-wood.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
                className={`w-full px-8 sm:px-12 pt-6 pb-8 rounded-2xl relative overflow-hidden border border-white/20
                    ${!isLayoutLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme.bg} border border-stone-700 text-stone-200 transition-colors duration-500`}>
                            <Activity size={18} />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wide">Seu Progresso</h3>
                            <span className="text-xs font-bold text-stone-200 mt-0.5">
                                Constância é a chave
                            </span>
                        </div>
                    </div>
                    <div className={`flex items-center gap-4 ${!activeSubject ? 'opacity-30 pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTargetCycles(Math.max(1, targetCycles - 1))}
                                disabled={!activeSubject}
                                className="px-2 py-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[10px] font-bold uppercase transition-colors"
                                title="Remover Ciclo"
                            >
                                -1 Ciclo
                            </button>
                            <button
                                onClick={() => setTargetCycles(targetCycles + 1)}
                                disabled={!activeSubject}
                                className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[10px] font-bold uppercase transition-colors"
                                title="Adicionar Ciclo"
                            >
                                +1 Ciclo
                            </button>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-bold text-stone-200 tabular-nums">
                                {completedCycles}<span className="text-stone-400 mx-1">/</span>{targetCycles}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-stone-200 tracking-wider">Ciclos</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 h-8 w-full">
                    {Array.from({ length: targetCycles }).map((_, i) => {
                        // Simplified logic:
                        // - Each bar represents one work+break cycle
                        // - sessions = number of COMPLETED work sessions
                        // - During work: current bar fills from 0-100%
                        // - During break: work bar stays at 100%, break sphere fills

                        let workProgress = 0;
                        let breakProgress = 0;

                        // Work Progress Logic
                        // Only show progress if timer has actually been started (isRunning or progress > 0 AND time has passed)
                        if (i < sessions) {
                            workProgress = 100;
                        } else if (i === sessions && mode === 'work') {
                            // Only show progress if timer has actually been modified or started
                            const workTotalTime = safeSettings.pomodoroWork * 60;
                            // If we just finished a break, sessions increments, but timeLeft might still be from previous state
                            // So we check if timeLeft is strictly less than workTotalTime to show fill
                            const hasTimePassed = timeLeft < workTotalTime;
                            workProgress = (isRunning || hasTimePassed) ? progress : 0;
                        }

                        // Break Progress Logic
                        if (i < sessions) {
                            if (i === sessions - 1 && mode === 'break') {
                                // Currently doing the break for this completed work session
                                breakProgress = progress;
                            } else {
                                // Break is already done (or skipped)
                                breakProgress = 100;
                            }
                        }

                        // Warning state: < 10 seconds remaining in work mode
                        const isWarning = i === sessions && mode === 'work' && timeLeft <= 10;

                        return (
                            <React.Fragment key={i}>
                                {/* Work Segment - Blue Bar */}
                                <div className="flex-1 h-3 relative shrink-0">
                                    <div className="absolute inset-0 bg-[#292524] rounded-full overflow-hidden">
                                        <div
                                            // 🔒 LOCKED: ref only on active segment — rAF drives width at 60fps, no CSS transition
                                            ref={i === sessions && mode === 'work' ? bottomBarRef : null}
                                            className={`h-full rounded-full ${workProgress > 0
                                                ? 'bg-sky-400'
                                                : 'bg-transparent'
                                                }`}
                                            // BUG FIX: Use 'undefined' instead of '{}' so React completely ignores style difffing, 
                                            // protecting the physical DOM mutation made by the rAF loop when a re-render fires.
                                            style={i === sessions && mode === 'work' && isRunning ? undefined : { width: `${workProgress}%` }}
                                        ></div>
                                    </div>
                                    {/* Border on top */}
                                    <div className="absolute inset-0 border border-stone-800 rounded-full pointer-events-none" />
                                    {/* Outer Glow */}
                                    {workProgress > 0 && (
                                        <div
                                            className={`absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300 ${isWarning ? 'shadow-[0_0_15px_rgba(255,80,80,0.8)] animate-pulse' : 'shadow-[0_0_8px_rgba(56,189,248,0.5)]'}`}
                                            style={{ opacity: workProgress / 100 }}
                                        />
                                    )}
                                </div>

                                {/* Break Indicator - Green Sphere */}
                                <div className="w-6 h-6 relative shrink-0">
                                    <div className="absolute inset-0 bg-[#292524] rounded-full overflow-hidden flex items-end">
                                        <div
                                            // 🔒 LOCKED: ref only on active break segment — rAF drives height at 60fps, no CSS transition
                                            ref={i === sessions - 1 && mode === 'break' ? sphereRef : null}
                                            className="w-full bg-emerald-500"
                                            // BUG FIX: Protected style diffing.
                                            style={i === sessions - 1 && mode === 'break' && isRunning ? undefined : { height: `${breakProgress}%` }}
                                        ></div>
                                    </div>
                                    {/* Border on top to hide any jagged rendering and clipping from overflow-hidden */}
                                    <div className="absolute inset-0 border border-stone-800 rounded-full pointer-events-none" />
                                    {/* Outer Glow perfectly outside the mask */}
                                    {breakProgress > 0 && (
                                        <div
                                            className="absolute inset-0 rounded-full pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-opacity duration-300"
                                            style={{ opacity: breakProgress / 100 }}
                                        />
                                    )}
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Spacer to guarantee padding is applied correctly despite absolute calculations or outer clipping */}
                <div className="h-6 w-full"></div>

            </motion.div>
        </motion.div >
    );
}
