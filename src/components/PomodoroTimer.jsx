import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Lock, Unlock, Activity, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars


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
                saved.activeTaskId === activeSubject?.taskId &&
                saved.sessionInstanceId === activeSubject?.sessionInstanceId) {
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
    const defaultTime = mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (safeSettings.pomodoroBreak || 5) * 60;
    const [timeLeft, setTimeLeft] = useState(() => getSavedState('timeLeft', defaultTime));
    const [isRunning, setIsRunning] = useState(() => getSavedState('isRunning', false));
    const [sessions, setSessions] = useState(() => getSavedState('sessions', 0));
    const [completedCycles, setCompletedCycles] = useState(() => getSavedState('completedCycles', 0));
    const [targetCycles, setTargetCycles] = useState(() => {
        // Only load saved target cycles if we are legitimately resuming the same active session instance.
        // Otherwise, always reset to the default requested by the parent (now 1)
        if (savedState && savedState.activeTaskId === activeSubject?.taskId && savedState.sessionInstanceId === activeSubject?.sessionInstanceId) {
            return savedState.targetCycles !== undefined ? savedState.targetCycles : defaultTargetCycles;
        }
        return defaultTargetCycles;
    });
    const [sessionHistory, setSessionHistory] = useState(() => getSavedState('sessionHistory', []));

    // --- RESUME LOGIC (Back from Background/Refresh) ---
    useEffect(() => {
        const saved = localStorage.getItem('pomodoroState');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);

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
                                setSessions(0);
                                setIsRunning(false);
                            }, 0);
                            return;
                        }

                        setTimeout(() => {
                            setTimeLeft(prev => {
                                const newTime = prev - elapsedSeconds;
                                return newTime > 0 ? newTime : 0;
                            });
                        }, 0);
                    }
                } else {
                    // Timer was NOT running - rely on default initialization (which is fresh)
                    // unless we are specifically in a "paused" state of the SAME session?
                    // For now, if it wasn't running, we assume we don't need to "catch up" time.
                    // But if it was the SAME session, we might want to restore the EXACT time left?
                    // The 'useState' initialization already tried to load 'timeLeft' from 'savedState' (which checks IDs).
                    // So this Effect is mostly for "Elapsed Time Correction" when coming back to a RUNNING timer.

                    // If IDs match (checked above) and it was paused, useState likely already handled it.
                    // If IDs don't match, we returned early.

                    // Cleanup old state if meaningful
                    if (msSinceSave > 12 * 60 * 60 * 1000) {
                        localStorage.removeItem('pomodoroState');
                    }
                }
            } catch (err) {
                console.error("Resume logic error", err);
            }
        }
    }, [activeSubject, safeSettings]); // Added dependencies

    const [isLayoutLocked, setIsLayoutLocked] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [showWarning, setShowWarning] = useState(false);


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
        localStorage.setItem('pomodoroPosition', JSON.stringify(newPos));
    };

    // --- ROBUST STATE SAVING ---
    // Save state frequently (on every tick basically) or on major state changes
    useEffect(() => {
        const stateToSave = {
            mode,
            timeLeft,
            isRunning,
            sessions,
            completedCycles,
            targetCycles,
            sessionHistory,
            savedAt: Date.now(), // Timestamp is crucial for Resume Logic
            activeTaskId: activeSubject?.taskId, // Bind state to specific task
            sessionInstanceId: activeSubject?.sessionInstanceId // Bind to specific click instance
        };
        localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
    }, [mode, timeLeft, isRunning, sessions, completedCycles, targetCycles, sessionHistory, activeSubject]);


    // Timer complete handler - declared first to be available for useEffect
    const handleTimerComplete = useCallback(() => {
        // Timer complete
        const completedDuration = mode === 'work' ? safeSettings.pomodoroWork : safeSettings.pomodoroBreak;
        const newHistoryItem = { type: mode, duration: completedDuration };

        setSessionHistory(prev => [...prev, newHistoryItem]);

        if (mode === 'work') {
            const newSessions = sessions + 1;
            setSessions(newSessions);
            onSessionComplete?.();

            // Track Study Time
            if (activeSubject && onUpdateStudyTime) {
                onUpdateStudyTime(activeSubject.categoryId, safeSettings.pomodoroWork, activeSubject.taskId);
            }

            // At the end of a work session, ALWAYS offer a break (even if it's the last one)
            // The user requested that the 5-minute break shouldn't be skipped.

            // Switch to break
            setMode('break');
            const breakTime = safeSettings.pomodoroBreak * 60;
            setTimeLeft(breakTime);
            // Explicitly sync to localStorage for immediate state consistency
            localStorage.setItem('pomodoroState', JSON.stringify({
                ...JSON.parse(localStorage.getItem('pomodoroState') || '{}'),
                mode: 'break',
                timeLeft: breakTime,
                isRunning: false
            }));
            setIsRunning(false); // Pause here so they can manually start the break
        } else {
            // Break finished
            const newCompletedCycles = completedCycles + 1;
            setCompletedCycles(newCompletedCycles);

            // Check for Task Completion NOW (after the break)
            if (sessions >= targetCycles) {
                onFullCycleComplete?.();
                setIsRunning(false);
                return;
            }

            setMode('work');
            const workTime = safeSettings.pomodoroWork * 60;
            setTimeLeft(workTime);
            setIsRunning(false);
            // Explicitly sync to localStorage
            localStorage.setItem('pomodoroState', JSON.stringify({
                ...JSON.parse(localStorage.getItem('pomodoroState') || '{}'),
                mode: 'work',
                timeLeft: workTime,
                isRunning: false
            }));
        }

        setIsRunning(false);

        // Sound & Notification
        if (safeSettings.soundEnabled) {
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleBoAAHjE56dfDgABaL3wq2kbAQBVtfyyRAAWYr3upm8dBQBRs/21bBwGBV687K5wIA0AWLn2sXIfDgBese+3eScSAGK48bN7JxQAaLbut3onFQBxt/SzdiURAHS48bR9Jw8Ab7f1uH4nDwBzt');
                audio.play().catch(() => { });
            } catch {
                // Silent fail for audio playback
            }
        }

        if (mode === 'work') {
            sendNotification('⏰ Pomodoro Finalizado!', 'Hora de fazer uma pausa! Você merece descansar.');
        } else {
            sendNotification('☕ Pausa Finalizada!', 'Pronto para voltar a estudar? Vamos lá!');
        }
    }, [mode, sessions, targetCycles, completedCycles, activeSubject, safeSettings, onSessionComplete, onFullCycleComplete, onUpdateStudyTime]);

    // --- ROBUST TIMER LOGIC ---
    // Use a single, drift-proof effect based on start time delta.


    // FINAL ROBUST TIMER EFFECT
    useEffect(() => {
        let interval;
        if (isRunning && timeLeft > 0) {
            const startTime = Date.now(); // When this effect started/resumed
            const initialTimeLeft = timeLeft;

            interval = setInterval(() => {
                const now = Date.now();
                const totalElapsed = (now - startTime) / 1000; // Seconds elapsed since effect start

                // Calculate what timeLeft SHOULD be right now
                const expectedTimeLeft = initialTimeLeft - (totalElapsed * speed);

                // Update state
                setTimeLeft(() => {
                    if (expectedTimeLeft <= 0) return 0;
                    return expectedTimeLeft;
                });

            }, 1000 / speed); // Tick rate matching speed
        }
        return () => clearInterval(interval);
    }, [isRunning, speed]); // If isRunning toggles, we reset start time. If speed changes, reset.


    // Monitor TimeLeft for completion (Separated to avoid re-triggering the loop)
    useEffect(() => {
        if (timeLeft <= 0 && isRunning) { // Changed to <= 0 for float safety
            setTimeout(() => handleTimerComplete(), 0);
        }
    }, [timeLeft, isRunning, handleTimerComplete]);

    const reset = () => {
        setIsRunning(false);
        const resetTime = mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;
        setTimeLeft(resetTime);
        // Force save immediately to clean state
        localStorage.setItem('pomodoroState', JSON.stringify({
            mode, timeLeft: resetTime, isRunning: false, sessions, completedCycles, targetCycles, sessionHistory, savedAt: Date.now()
        }));
    };

    const skip = () => {
        setIsRunning(false);
        if (mode === 'work') {
            // Treat skip as completion of work session
            const newSessions = sessions + 1;
            setSessions(newSessions);
            onSessionComplete?.();

            // Track Study Time
            if (activeSubject && onUpdateStudyTime) {
                onUpdateStudyTime(activeSubject.categoryId, safeSettings.pomodoroWork, activeSubject.taskId);
            }

            // ALWAYS offer the final break
            setMode('break');
            setTimeLeft(safeSettings.pomodoroBreak * 60);

            // Persist state for break
            localStorage.setItem('pomodoroState', JSON.stringify({
                mode: 'break', timeLeft: safeSettings.pomodoroBreak * 60,
                isRunning: false, sessions: newSessions, completedCycles,
                targetCycles, sessionHistory,
                savedAt: Date.now(),
                activeTaskId: activeSubject?.taskId,
                sessionInstanceId: activeSubject?.sessionInstanceId
            }));

        } else {
            // Treat skip as completion of break
            const newCompletedCycles = completedCycles + 1;
            setCompletedCycles(newCompletedCycles);

            if (sessions >= targetCycles) {
                onFullCycleComplete?.();
                // Persist completed state
                localStorage.setItem('pomodoroState', JSON.stringify({
                    mode: 'work', timeLeft: safeSettings.pomodoroWork * 60,
                    isRunning: false, sessions: 0, completedCycles: 0,
                    targetCycles, sessionHistory: [],
                    savedAt: Date.now(),
                    activeTaskId: null,
                    sessionInstanceId: null
                }));
                return;
            }

            setMode('work');
            setTimeLeft(safeSettings.pomodoroWork * 60);
        }
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
    // Progress is 0 if timer hasn't started or is at exactly totalTime
    // Use a small epsilon to avoid floating point issues where 1500 - 1500.000001 might cause a blip
    const rawProgress = ((totalTime - timeLeft) / totalTime) * 100;
    const progress = (timeLeft >= totalTime || timeLeft <= 0) ? (timeLeft <= 0 ? 100 : 0) : Math.max(0, Math.min(100, rawProgress));

    // Ebbinghaus Forgetting Curve Calculation - Memoized (only recalc when activeSubject/categories change)
    const retention = useMemo(() => {
        if (!activeSubject) return null;
        const cat = categories.find(c => c.name === activeSubject.category);
        if (!cat || !cat.lastStudiedAt) return { val: 100, label: 'Novo', color: 'text-emerald-400', border: 'border-emerald-500' };

        const last = new Date(cat.lastStudiedAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - last) / (1000 * 60 * 60);
        const days = diffHours / 24;
        const val = Math.round(100 * Math.exp(-days / 3));

        if (val >= 90) return { val, label: 'Memória Fresca', color: 'text-emerald-400', border: 'border-emerald-500' };
        if (val >= 60) return { val, label: 'Risco Médio', color: 'text-yellow-400', border: 'border-yellow-500' };
        return { val, label: 'Crítico', color: 'text-red-500', border: 'border-red-500' };
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
            className={`max-w-3xl mx-auto space-y-6 relative font-sans flex flex-col items-center ${!isLayoutLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {/* 1. TOP BAR: Modern Clean Header */}
            <div className="relative flex items-center justify-center py-2 w-full">
                <div className="flex-1 flex justify-center px-12 bg-transparent">
                    {activeSubject ? (
                        <motion.div
                            initial={{ y: -5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            style={{
                                backgroundImage: 'url(/header-wood.png)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                            className={`relative flex items-center gap-3 w-full border border-white/20 rounded-3xl pl-8 pr-36 py-5 transition-all duration-500 shadow-lg max-w-full`}
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
                            className={`flex items-center gap-4 text-white text-base font-black uppercase tracking-widest border-4 border-dashed border-red-500 px-12 py-6 rounded-2xl bg-red-900/80 cursor-pointer hover:scale-105 transition-all shadow-2xl relative z-20 overflow-hidden group`}
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
                                setUiPosition({ x: 0, y: 0 });
                                localStorage.setItem('pomodoroPosition', JSON.stringify({ x: 0, y: 0 }));
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
                    backgroundPosition: 'center'
                }}
                animate={showWarning ? {
                    x: [-2, 2, -2, 2, 0],
                    rotate: [-0.5, 0.5, -0.5, 0.5, 0]
                } : {}}
                transition={showWarning ? { duration: 0.2, repeat: Infinity } : {}}
                whileDrag={{ scale: 1.01 }}
                className={`w-full border-4 border-[#3f2e26] transition-all duration-500 ease-out p-8 rounded-[2rem] relative overflow-hidden flex flex-col items-center justify-center shadow-2xl
                    ${!isLayoutLocked ? 'ring-2 ring-stone-600' : ''}
                    ${showWarning ? 'ring-4 ring-red-600 shadow-[0_0_50px_rgba(220,38,38,0.3)]' : ''}`}
            >
                <div className="relative z-10 w-full flex flex-col items-center">
                    {/* Subject Level Indicator - Left Side */}
                    {activeSubject && (() => {
                        // Mirror the Dashboard "Level" (which is actually Priority)
                        // No calculation, just display what is on the task
                        const priority = activeSubject.priority || 'medium';

                        let label = 'MÉDIA';
                        let levelColor = "text-stone-950 bg-amber-400 border-amber-500 shadow-lg shadow-black/40";

                        if (priority === 'high') {
                            label = 'ALTA';
                            levelColor = "text-white bg-red-600 border-red-700 shadow-lg shadow-black/40";
                        } else if (priority === 'medium') {
                            label = 'MÉDIA';
                            levelColor = "text-stone-950 bg-amber-400 border-amber-500 shadow-lg shadow-black/40";
                        } else if (priority === 'low') {
                            label = 'BAIXA';
                            levelColor = "text-white bg-emerald-600 border-emerald-700 shadow-lg shadow-black/40";
                        }

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
                    <div className="flex items-center gap-1 mb-8 bg-[#1c1917] p-2 rounded-full border border-stone-800">
                        <button
                            onClick={() => { setMode('work'); setTimeLeft(safeSettings.pomodoroWork * 60); setIsRunning(false); }}
                            className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 ${mode === 'work' ? 'bg-[#292524] text-emerald-400 shadow-sm border border-stone-700' : 'text-stone-500 hover:text-stone-300'}`}
                        >
                            Foco
                        </button>
                        <button
                            onClick={() => { setMode('break'); setTimeLeft(safeSettings.pomodoroBreak * 60); setIsRunning(false); }}
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

                            {/* Progress */}
                            <circle
                                cx="112" cy="112" r="100" fill="none"
                                stroke="currentColor"
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 100}
                                strokeDashoffset={2 * Math.PI * 100 * (1 - progress / 100)}
                                className={`${mode === 'work' ? 'text-stone-200' : 'text-stone-400'}`}
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-5xl font-bold tracking-tighter transition-colors duration-500 text-stone-200`}>
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
                    <div className="flex items-center gap-4 z-10">
                        {/* RESET */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={reset}
                            className="w-12 h-12 rounded-xl bg-[#292524] border border-stone-700 text-stone-200 hover:bg-[#44403c] flex items-center justify-center transition-colors duration-300"
                            title="Reiniciar Timer"
                        >
                            <RotateCcw size={18} strokeWidth={2.5} />
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
                            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${theme.button}`}
                        >
                            {isRunning
                                ? <Pause size={32} fill="currentColor" className="opacity-90" />
                                : <Play size={32} fill="currentColor" className="ml-1 opacity-90" />}
                        </motion.button>

                        {/* SKIP */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={skip}
                            className="w-12 h-12 rounded-xl bg-[#292524] border border-stone-700 text-stone-200 hover:bg-[#44403c] flex items-center justify-center transition-colors duration-300"
                            title="Pular Etapa"
                        >
                            <SkipForward size={18} strokeWidth={2.5} />
                        </motion.button>
                    </div>

                    {/* Speed Toggle */}
                    <div className="absolute top-24 right-6 flex flex-col gap-2">
                        <button
                            onClick={() => setSpeed(speed === 10 ? 1 : 10)}
                            className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors ${speed === 10 ? 'bg-amber-100 text-amber-600' : 'bg-[#292524] text-stone-400 hover:bg-[#44403c] border border-stone-700'}`}
                        >
                            10x
                        </button>
                        <button
                            onClick={() => setSpeed(speed === 100 ? 1 : 100)}
                            className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors ${speed === 100 ? 'bg-rose-100 text-rose-600' : 'bg-[#292524] text-stone-400 hover:bg-[#44403c] border border-stone-700'}`}
                        >
                            100x
                        </button>
                    </div>

                </div>
            </motion.div>

            {/* 3. FOOTER: Wood Visual */}
            <motion.div
                style={{
                    backgroundImage: 'url(/header-wood.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
                className={`w-full px-12 py-8 rounded-2xl relative overflow-hidden border border-white/20
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
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTargetCycles(prev => Math.max(1, prev - 1))}
                                className="px-2 py-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[10px] font-bold uppercase transition-colors"
                                title="Remover Ciclo"
                            >
                                -1 Ciclo
                            </button>
                            <button
                                onClick={() => setTargetCycles(prev => prev + 1)}
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
                                            className={`h-full rounded-full transition-all duration-300 ${workProgress > 0
                                                ? isWarning
                                                    ? 'bg-sky-400'
                                                    : 'bg-sky-400'
                                                : 'bg-transparent'
                                                }`}
                                            style={{ width: `${workProgress}%` }}
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
                                            className="w-full bg-emerald-500 transition-all duration-300"
                                            style={{ height: `${breakProgress}%` }}
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

            </motion.div>
        </motion.div >
    );
}
