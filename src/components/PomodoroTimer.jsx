/**
 * ============================================================================
 * POMODORO TIMER - VERSÃO CORRIGIDA E MELHORADA
 * ============================================================================
 * Correções aplicadas:
 * - Restore de sessão pausada após reload
 * - Flush correto de minutos ao abortar em qualquer fase
 * - Skip não concede minutos completos sem estudo
 * - Sincronização multi-aba com taskId/sessionInstanceId
 * - Uso de resetPomodoroProgress em vez de mutação insegura
 * - Integração com FocusPanel ao lado do relógio
 * - Mais informações e status no painel ativo
 * ============================================================================
 */
import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef
} from 'react';
import {
    Play,
    Pause,
    RotateCcw,
    AlertCircle,
    VolumeX,
    Volume2,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { usePomodoroSync } from '../hooks/usePomodoroSync';
import { playPomodoroAlarm } from '../utils/audioAlert';
import { PomodoroProgress } from './pomodoro/PomodoroProgress';
import { PomodoroControls } from './pomodoro/PomodoroControls';
import { PomodoroHeader } from './pomodoro/PomodoroHeader';
import { PomodoroClock } from './pomodoro/PomodoroClock';
import ConfirmModal from './ConfirmModal';

const STABLE_TAB_ID = `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const SPEED_OPTIONS = [1, 10, 100];

const formatTime = (seconds) => {
    const safe = Number(seconds);
    if (!Number.isFinite(safe) || safe < 0) return '00:00';
    const secsInt = Math.ceil(safe);
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const CIRCUMFERENCE = 2 * Math.PI * 110;

function toPositiveMinutes(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
        return fallback;
    }
    return Math.min(240, Math.max(1, Math.round(n)));
}

class PomodoroErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Critical Pomodoro Failure:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full p-8 bg-red-950/20 border border-red-500/30 rounded-xl flex flex-col items-center gap-4 text-center">
                    <AlertCircle className="text-red-500" size={48} />
                    <h2 className="text-xl font-black text-red-500 uppercase tracking-widest">
                        Protocolo de Emergência Ativado
                    </h2>
                    <p className="text-sm text-red-200/60 max-w-md">
                        O motor do cronômetro encontrou uma instabilidade crítica.
                        Seus dados foram preservados.
                    </p>
                    <button
                        onClick={() => {
                            localStorage.removeItem('pomodoroState');
                            window.location.reload();
                        }}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg transition-all uppercase text-xs tracking-widest"
                    >
                        Reiniciar Motor Neural
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function PomodoroTimer({
    settings = {},
    activeSubject,
    onFullCycleComplete,
    onUpdateStudyTime,
    onExit,
    isLayoutLocked,
    onSessionComplete
}) {
    const safeSettings = useMemo(() => Object.freeze({
        ...settings,
        pomodoroWork: toPositiveMinutes(settings?.pomodoroWork, 25),
        pomodoroBreak: toPositiveMinutes(settings?.pomodoroBreak, 5),
        pomodoroLongBreak: toPositiveMinutes(settings?.pomodoroLongBreak, 15),
        soundEnabled: settings?.soundEnabled ?? true
    }), [settings]);

    const mode = useAppStore(state => state.appState?.pomodoro?.mode || 'work');
    const sessions = useAppStore(state => state.appState?.pomodoro?.sessions || 1);
    const targetCycles = useAppStore(state => {
        const raw = state.appState?.pomodoro?.targetCycles;
        return Number.isFinite(raw) && raw > 0 ? raw : 1;
    });
    const completedCycles = useAppStore(state => {
        const raw = state.appState?.pomodoro?.completedCycles;
        const target = state.appState?.pomodoro?.targetCycles || 1;
        return Number.isFinite(raw) ? Math.min(Math.max(0, raw), target) : 0;
    });
    const accumulatedMinutes = useAppStore(state => state.appState?.pomodoro?.accumulatedMinutes || 0);
    const setTargetCycles = useAppStore(state => state.setPomodoroTargetCycles);
    const completePomodoroPhase = useAppStore(state => state.completePomodoroPhase);
    const rewindPomodoroPhase = useAppStore(state => state.rewindPomodoroPhase);

    const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [savedState, setSavedState] = useState(() => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = JSON.parse(localStorage.getItem('pomodoroState'));
            const matchesTask =
                activeSubject?.taskId &&
                saved?.activeTaskId === activeSubject.taskId;
            const matchesMode =
                saved?.mode === mode;
            const matchesSession =
                !activeSubject?.sessionInstanceId ||
                saved?.sessionInstanceId === activeSubject.sessionInstanceId;
            if (saved && matchesTask && matchesMode && matchesSession) {
                return {
                    ...saved,
                    isRunning: false
                };
            }
        } catch (error) {
            console.error('Failed to parse pomodoroState:', error);
        }
        return null;
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeSubject?.taskId) {
                try {
                    const saved = JSON.parse(localStorage.getItem('pomodoroState'));
                    const matchesTask = saved?.activeTaskId === activeSubject.taskId;
                    const matchesMode = saved?.mode === mode;
                    const matchesSession = !activeSubject.sessionInstanceId || 
                        saved?.sessionInstanceId === activeSubject.sessionInstanceId;
                    if (saved && matchesTask && matchesMode && matchesSession &&
                        Number.isFinite(saved.timeLeft) && saved.timeLeft > 0) {
                        setSavedState({ ...saved, isRunning: false });
                    } else {
                        setSavedState(null);
                    }
                } catch {
                    setSavedState(null);
                }
            } else {
                setSavedState(null);
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [activeSubject?.taskId, activeSubject?.sessionInstanceId, mode]);

    const getSavedState = (key, defaultValue) => {
        if (savedState && savedState[key] !== undefined) {
            return savedState[key];
        }
        return defaultValue;
    };

    const initialTime = mode === 'work'
        ? safeSettings.pomodoroWork * 60
        : mode === 'long_break'
            ? safeSettings.pomodoroLongBreak * 60
            : safeSettings.pomodoroBreak * 60;

    const [timeLeft, setTimeLeft] = useState(() => {
        const saved = getSavedState('timeLeft', initialTime);
        const t = Number(saved);
        return Number.isFinite(t) && t > 0
            ? t
            : Number.isFinite(initialTime)
                ? initialTime
                : 25 * 60;
    });

    const [isRunning, setIsRunning] = useState(() => {
        return Boolean(getSavedState('isRunning', false));
    });

    const [speed, setSpeed] = useState(() => {
        const parsed = Number(getSavedState('speed', 1));
        return SPEED_OPTIONS.includes(parsed) ? parsed : 1;
    });

    const [isMuted, setIsMuted] = useState(() => {
        try {
            return localStorage.getItem('pomodoro_muted') === 'true';
        } catch {
            return false;
        }
    });

    const isMutedRef = useRef(isMuted);
    const stateRefs = useRef({
        mode,
        timeLeft,
        isRunning,
        sessions,
        targetCycles,
        completedCycles,
        accumulatedMinutes,
        lastTaskId: activeSubject?.taskId
    });

    const timeRef = useRef(timeLeft);

    const [syncChannel] = useState(() => {
        return typeof window !== 'undefined'
            ? new BroadcastChannel('pomodoro_sync')
            : null;
    });

    const activeSubjectRef = useRef(activeSubject);
    useEffect(() => {
        activeSubjectRef.current = activeSubject;
    }, [activeSubject]);

    const postSync = useCallback((payload) => {
        try {
            if (!payload || typeof payload !== 'object' || !payload.type) return;
            syncChannel?.postMessage({
                ...payload,
                tabId: STABLE_TAB_ID,
                taskId: activeSubjectRef.current?.taskId || null,
                sessionInstanceId: activeSubjectRef.current?.sessionInstanceId || null
            });
        } catch (error) {
            console.warn('[PomodoroSync] Failed to post message:', error);
        }
    }, [syncChannel]);

    const speedRef = useRef(speed);
    useEffect(() => {
        if (speedRef.current !== speed) {
            speedRef.current = speed;
            postSync({
                type: 'SPEED_CHANGE',
                speed
            });
        }
    }, [speed, postSync]);

    const transitionTimeoutRef = useRef(null);
    const completionTimeoutRef = useRef(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const isTransitioningRef = useRef(false);

    const clockRef = useRef(null);
    const svgCircleRef = useRef(null);
    const workFillsRef = useRef([]);
    const breakBallsRef = useRef([]);

    useEffect(() => {
        return () => {
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
                transitionTimeoutRef.current = null;
            }
            setIsTransitioning(false);
            isTransitioningRef.current = false;
        };
    }, []);

    const showToast = useToast();
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
                transitionTimeoutRef.current = null;
            }
            if (completionTimeoutRef.current) {
                clearTimeout(completionTimeoutRef.current);
                completionTimeoutRef.current = null;
            }
            setIsTransitioning(false);
            isTransitioningRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (workFillsRef.current) {
            workFillsRef.current = workFillsRef.current.slice(0, targetCycles || 1);
        }
        if (breakBallsRef.current) {
            breakBallsRef.current = breakBallsRef.current.slice(
                0,
                (targetCycles || 1) - 1
            );
        }
    }, [targetCycles]);

    const toggleMute = () => {
        const newVal = !isMutedRef.current;
        isMutedRef.current = newVal;
        setIsMuted(newVal);
        try {
            localStorage.setItem('pomodoro_muted', String(newVal));
        } catch (error) {
            console.error('Failed to set pomodoro_muted:', error);
        }
        postSync({ type: 'TOGGLE_MUTE', isMuted: newVal });
    };

    const toggleFullscreen = () => {
        setIsFullscreen(prev => !prev);
    };

    const safeOnUpdateStudyTime = useCallback((...args) => {
        if (typeof onUpdateStudyTime === 'function' && isMountedRef.current) {
            try {
                onUpdateStudyTime(...args);
            } catch (error) {
                console.error('[Shield] Callback Error (onUpdateStudyTime):', error);
            }
        }
    }, [onUpdateStudyTime]);

    const safeOnFullCycleComplete = useCallback((...args) => {
        if (typeof onFullCycleComplete === 'function' && isMountedRef.current) {
            try {
                onFullCycleComplete(...args);
            } catch (error) {
                console.error('[Shield] Callback Error (onFullCycleComplete):', error);
            }
        }
    }, [onFullCycleComplete]);

    const safeOnExit = useCallback((...args) => {
        if (typeof onExit === 'function' && isMountedRef.current) {
            try {
                onExit(...args);
            } catch (error) {
                console.error('[Shield] Callback Error (onExit):', error);
            }
        }
    }, [onExit]);

    const prevTaskStateRef = useRef({
        subject: activeSubject,
        accum: 0,
        time: initialTime,
        mode
    });

    const flushPendingStudyTime = useCallback((subjectOverride = null) => {
        const subjectSnapshot = subjectOverride || activeSubjectRef.current;
        if (!subjectSnapshot) return;

        const current = stateRefs.current;
        let minutes = Number(current.accumulatedMinutes);
        if (!Number.isFinite(minutes) || minutes <= 0) minutes = 0;

        if (current.mode === 'work') {
            const liveState = useAppStore.getState();
            const liveSettings = liveState?.appState?.settings || liveState?.settings || {};
            const livePomodoroWork = Math.max(1, Number(liveSettings.pomodoroWork || safeSettings.pomodoroWork || 25));
            const totalWorkSeconds = livePomodoroWork * 60;
            const rawPrev = Number(current.timeLeft);
            const safePrevTime = Number.isFinite(rawPrev) && rawPrev >= 0
                ? rawPrev
                : totalWorkSeconds;
            minutes += Math.max(0, totalWorkSeconds - safePrevTime) / 60;
        }

        minutes = Number.isFinite(minutes) ? Number(minutes.toFixed(2)) : 0;

        if (minutes > 0 && Number.isFinite(minutes)) {
            safeOnUpdateStudyTime(
                subjectSnapshot.categoryId,
                minutes,
                subjectSnapshot.taskId
            );
            if (typeof onSessionComplete === 'function') {
                onSessionComplete();
            }
            prevTaskStateRef.current.accum = 0;
            try {
                const resetProgress = useAppStore.getState().resetPomodoroProgress;
                if (typeof resetProgress === 'function') {
                    resetProgress();
                } else {
                    useAppStore.setState((state) => ({
                        appState: {
                            ...state.appState,
                            pomodoro: {
                                ...state.appState?.pomodoro,
                                accumulatedMinutes: 0
                            }
                        }
                    }));
                }
            } catch (error) {
                console.error('[PomodoroTimer] Failed to reset accumulatedMinutes:', error);
            }
        }
    }, [safeSettings, safeOnUpdateStudyTime, onSessionComplete]);

    useEffect(() => {
        const prev = prevTaskStateRef.current;
        if (prev.subject && activeSubject?.taskId !== prev.subject.taskId) {
            let lostMinutes = prev.accum;
            if (prev.mode === 'work') {
                const totalWorkSeconds = safeSettings.pomodoroWork * 60;
                const safePrevTime = Number.isFinite(Number(prev.time))
                    ? Number(prev.time)
                    : totalWorkSeconds;
                lostMinutes += Number(
                    (Math.max(0, totalWorkSeconds - safePrevTime) / 60).toFixed(2)
                );
            }
            if (lostMinutes > 0 && !Number.isNaN(lostMinutes)) {
                safeOnUpdateStudyTime(
                    prev.subject.categoryId,
                    lostMinutes,
                    prev.subject.taskId
                );
                if (typeof onSessionComplete === 'function') {
                    onSessionComplete();
                }
            }
        }
        prevTaskStateRef.current = {
            subject: activeSubject,
            accum: accumulatedMinutes,
            time: stateRefs.current.timeLeft,
            mode
        };
    }, [
        activeSubject,
        accumulatedMinutes,
        mode,
        safeSettings.pomodoroWork,
        safeOnUpdateStudyTime,
        onSessionComplete
    ]);

    useEffect(() => {
        stateRefs.current = {
            ...stateRefs.current,
            mode,
            isRunning,
            sessions,
            targetCycles,
            completedCycles,
            accumulatedMinutes
        };
    }, [
        mode,
        isRunning,
        sessions,
        targetCycles,
        completedCycles,
        accumulatedMinutes
    ]);

    const didInitialSyncRef = useRef(false);

    useEffect(() => {
        if (!didInitialSyncRef.current) {
            didInitialSyncRef.current = true;
            stateRefs.current.lastTaskId = activeSubject?.taskId;
            if (
                savedState &&
                savedState.mode === mode &&
                Number.isFinite(savedState.timeLeft) &&
                savedState.timeLeft > 0
            ) {
                const restoredTime = Math.max(0, Number(savedState.timeLeft));
                setTimeLeft(restoredTime);
                stateRefs.current.timeLeft = restoredTime;
                if (clockRef.current) {
                    clockRef.current.textContent = formatTime(restoredTime);
                }
                if (svgCircleRef.current) {
                    const currentTotalTime = mode === 'work'
                        ? safeSettings.pomodoroWork * 60
                        : mode === 'long_break'
                            ? safeSettings.pomodoroLongBreak * 60
                            : safeSettings.pomodoroBreak * 60;
                    const fraction = Math.max(
                        0,
                        Math.min(1, restoredTime / currentTotalTime)
                    );
                    svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE * fraction;
                }
                return;
            }
        }

        if (!isTransitioning) {
            const newTotalTime = mode === 'work'
                ? safeSettings.pomodoroWork * 60
                : mode === 'long_break'
                    ? safeSettings.pomodoroLongBreak * 60
                    : safeSettings.pomodoroBreak * 60;
            const taskChanged = activeSubject?.taskId !== stateRefs.current.lastTaskId;

            if (taskChanged && stateRefs.current.lastTaskId !== undefined) {
                if (stateRefs.current.isRunning) {
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;
                }
                try {
                    const resetProgress = useAppStore.getState().resetPomodoroProgress;
                    if (typeof resetProgress === 'function') {
                        resetProgress();
                    } else {
                        useAppStore.setState((state) => ({
                            appState: {
                                ...state.appState,
                                pomodoro: {
                                    ...state.appState?.pomodoro,
                                    accumulatedMinutes: 0,
                                    completedCycles: 0
                                }
                            }
                        }));
                    }
                } catch (error) {
                    console.error('[PomodoroTimer] Failed to reset progress:', error);
                }
            }

            setTimeLeft(newTotalTime);
            stateRefs.current.timeLeft = newTotalTime;
            stateRefs.current.lastTaskId = activeSubject?.taskId;

            if (clockRef.current) {
                const mins = Math.floor(newTotalTime / 60);
                const secs = newTotalTime % 60;
                clockRef.current.textContent =
                    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }

            if (svgCircleRef.current) {
                svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
            }
        }
    }, [activeSubject?.taskId, mode, safeSettings, isTransitioning, savedState]);

    React.useLayoutEffect(() => {
        if (!isMountedRef.current) return;

        const currentMode = mode;
        const currentSessions = sessions;
        const currentTotalTime = currentMode === 'work'
            ? (safeSettings.pomodoroWork || 25) * 60
            : currentMode === 'long_break'
                ? (safeSettings.pomodoroLongBreak || 15) * 60
                : (safeSettings.pomodoroBreak || 5) * 60;
        const fraction = Math.max(0, Math.min(1, timeLeft / (currentTotalTime || 1)));
        const currentPercent = `${Math.max(0, Math.min(100, (1 - fraction) * 100))}%`;

        workFillsRef.current.forEach((el, i) => {
            if (!el) return;
            if (
                i < currentSessions - 1 ||
                (i === currentSessions - 1 && currentMode !== 'work')
            ) {
                el.style.width = '100%';
            } else if (i === currentSessions - 1 && currentMode === 'work') {
                el.style.width = currentPercent;
            } else {
                el.style.width = '0%';
            }
        });

        breakBallsRef.current.forEach((el, i) => {
            if (!el) return;
            if (i < currentSessions - 1) {
                el.style.height = '100%';
            } else if (i === currentSessions - 1 && currentMode !== 'work') {
                el.style.height = currentPercent;
            } else {
                el.style.height = '0%';
            }
        });

        if (svgCircleRef.current) {
            svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE * fraction;
        }
    }, [
        mode,
        sessions,
        targetCycles,
        timeLeft,
        safeSettings.pomodoroWork,
        safeSettings.pomodoroBreak,
        safeSettings.pomodoroLongBreak
    ]);

    usePomodoroSync({
        syncChannel,
        STABLE_TAB_ID,
        setIsRunning,
        stateRefs,
        setTimeLeft,
        showToast,
        setSpeed,
        speedRef,
        activeSubjectRef,
        clockRef,
        setIsMuted,
        isMutedRef
    });

    const savePomodoroState = useCallback((overrides = {}) => {
        if (!activeSubject?.taskId) return;
        try {
            const current = stateRefs.current;
            const stateToSave = {
                activeTaskId: activeSubject.taskId,
                sessionInstanceId: activeSubject.sessionInstanceId || null,
                mode: current.mode,
                timeLeft: current.timeLeft,
                isRunning: current.isRunning,
                sessions: current.sessions,
                targetCycles: current.completedCycles,
                accumulatedMinutes: current.accumulatedMinutes,
                speed: speedRef.current,
                savedAt: Date.now(),
                ...overrides
            };
            localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
        } catch (error) {
            console.error('Failed to save pomodoroState:', error);
        }
    }, [activeSubject]);

    useEffect(() => {
        return () => {
            if (stateRefs.current.isRunning) {
                savePomodoroState({ isRunning: false });
            }
        };
    }, [savePomodoroState]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            if (stateRefs.current.isRunning) {
                savePomodoroState({ isRunning: false });
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [savePomodoroState]);

    const transitionSession = useCallback((completedMode, source = 'natural') => {
        if (isTransitioningRef.current) return;

        if (source === 'natural') {
            const lockKey = `pomodoro_transition_lock_${activeSubjectRef.current?.taskId || 'global'}`;
            const now = Date.now();
            const lastTransition = Number(localStorage.getItem(lockKey) || 0);
            if (now - lastTransition < 2000) {
                return;
            }
            localStorage.setItem(lockKey, now.toString());
        }

        isTransitioningRef.current = true;
        setIsTransitioning(true);
        setIsRunning(false);
        stateRefs.current.isRunning = false;

        const isManual = source !== 'natural';

        if (
            source === 'natural' &&
            safeSettings.soundEnabled &&
            !isMutedRef.current
        ) {
            playPomodoroAlarm();
        }

        const currentSessions = stateRefs.current.sessions;
        const currentTarget = stateRefs.current.targetCycles;
        const isLastWorkSession =
            currentSessions >= currentTarget &&
            stateRefs.current.mode === 'work';
        const isEndingCycle =
            isLastWorkSession &&
            (source === 'natural' || source === 'skip');

        let sessionMinutes = 0;
        if (completedMode === 'work') {
            if (!isManual) {
                sessionMinutes = Number(safeSettings.pomodoroWork.toFixed(2));
            } else if (source === 'skip') {
                const totalWorkSeconds = safeSettings.pomodoroWork * 60;
                sessionMinutes = Number(
                    (
                        Math.max(
                            0,
                            totalWorkSeconds - stateRefs.current.timeLeft
                        ) / 60
                    ).toFixed(2)
                );
            }
        }

        const targetSubject = activeSubjectRef.current;
        let savedMinutes = 0;

        if (targetSubject && completedMode === 'work' && sessionMinutes > 0) {
            if (!Number.isFinite(sessionMinutes) || sessionMinutes <= 0) {
                sessionMinutes = 0;
            }
            safeOnUpdateStudyTime(
                targetSubject.categoryId,
                sessionMinutes,
                targetSubject.taskId
            );
            savedMinutes = sessionMinutes;
        }

        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
        }

        transitionTimeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current) {
                return;
            }
            if (!clockRef.current) {
                setIsTransitioning(false);
                isTransitioningRef.current = false;
                transitionTimeoutRef.current = null;
                return;
            }

            completePomodoroPhase(isManual, 0);

            if (typeof onSessionComplete === 'function') {
                onSessionComplete();
            }

            const newState = useAppStore.getState().appState.pomodoro;
            const resetTime =
                newState.mode === 'work'
                    ? safeSettings.pomodoroWork * 60
                    : newState.mode === 'long_break'
                        ? safeSettings.pomodoroLongBreak * 60
                        : safeSettings.pomodoroBreak * 60;

            setTimeLeft(resetTime);
            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = newState.mode;
            stateRefs.current.sessions = newState.sessions;
            stateRefs.current.completedCycles = newState.completedCycles;
            stateRefs.current.accumulatedMinutes = newState.accumulatedMinutes;

            if (clockRef.current) {
                const mins = Math.floor(resetTime / 60);
                const secs = resetTime % 60;
                clockRef.current.textContent =
                    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }

            if (svgCircleRef.current) {
                svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
            }

            savePomodoroState({
                isRunning: false,
                timeLeft: resetTime,
                mode: newState.mode,
                sessions: newState.sessions,
                completedCycles: newState.completedCycles,
                accumulatedMinutes: newState.accumulatedMinutes
            });

            postSync({
                type: isManual ? 'PHASE_SKIP' : 'PHASE_COMPLETE',
                toMode: newState.mode,
                sessions: newState.sessions,
                completedCycles: newState.completedCycles,
                accumulatedMinutes: newState.accumulatedMinutes,
                timeLeft: resetTime
            });

            setIsTransitioning(false);
            isTransitioningRef.current = false;
            transitionTimeoutRef.current = null;

            if (isEndingCycle) {
                safeOnFullCycleComplete(
                    Number.isFinite(savedMinutes) ? savedMinutes : 0,
                    source === 'natural'
                );
            }
        }, 50);
    }, [
        safeSettings,
        completePomodoroPhase,
        savePomodoroState,
        safeOnUpdateStudyTime,
        safeOnFullCycleComplete,
        onSessionComplete,
        postSync
    ]);

    useEffect(() => {
        if (!isRunning) return;

        let rafId;
        let timeoutId;
        const startTime = performance.now();
        const startLeft = stateRefs.current.timeLeft;

        const tick = () => {
            const now = performance.now();
            const elapsedSeconds = ((now - startTime) / 1000) * (speedRef.current || 1);
            const oldTime = stateRefs.current.timeLeft;
            const newTime = Math.max(0, startLeft - elapsedSeconds);
            stateRefs.current.timeLeft = newTime;
            timeRef.current = newTime;

            const currentTotalTime =
                stateRefs.current.mode === 'work'
                    ? (safeSettings.pomodoroWork || 25) * 60
                    : stateRefs.current.mode === 'long_break'
                        ? (safeSettings.pomodoroLongBreak || 15) * 60
                        : (safeSettings.pomodoroBreak || 5) * 60;
            const fraction = newTime / (currentTotalTime || 1);
            const displaySecond = Math.ceil(newTime);

            if (Math.floor(oldTime) !== Math.floor(newTime)) {
                setTimeLeft(newTime);
            }

            if (clockRef.current) {
                const mins = Math.floor(displaySecond / 60);
                const secs = displaySecond % 60;
                const timeString = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
                if (clockRef.current.textContent !== timeString) {
                    clockRef.current.textContent = timeString;
                }
            }

            if (svgCircleRef.current) {
                svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE * fraction;
            }

            const s = stateRefs.current.sessions;
            if (stateRefs.current.mode === 'work') {
                const workEl = workFillsRef.current[s - 1];
                if (workEl) {
                    workEl.style.width = `${Math.max(0, Math.min(100, (1 - fraction) * 100))}%`;
                }
            } else {
                const breakEl = breakBallsRef.current[s - 1];
                if (breakEl) {
                    breakEl.style.height = `${Math.max(0, Math.min(100, (1 - fraction) * 100))}%`;
                }
            }

            if (newTime <= 0) {
                if (!isTransitioningRef.current) {
                    transitionSession(stateRefs.current.mode, 'natural');
                } else {
                    timeoutId = setTimeout(tick, 200);
                }
            } else {
                if (document.hidden) {
                    timeoutId = setTimeout(tick, 1000 / (speedRef.current || 1));
                } else {
                    rafId = requestAnimationFrame(tick);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (rafId) cancelAnimationFrame(rafId);
                timeoutId = setTimeout(tick, 1000 / (speedRef.current || 1));
            } else {
                if (timeoutId) clearTimeout(timeoutId);
                rafId = requestAnimationFrame(tick);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (document.hidden) {
            timeoutId = setTimeout(tick, 1000 / (speedRef.current || 1));
        } else {
            rafId = requestAnimationFrame(tick);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (rafId) cancelAnimationFrame(rafId);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isRunning, safeSettings, transitionSession, speed]);

    const reset = () => {
        if (!isMountedRef.current) return;
        if (isTransitioningRef.current) return;

        const currentMode = stateRefs.current.mode;
        const currentSessions = stateRefs.current.sessions;
        const currentTimeLeft = stateRefs.current.timeLeft;
        const currentTotalTime =
            currentMode === 'work'
                ? safeSettings.pomodoroWork * 60
                : currentMode === 'long_break'
                    ? safeSettings.pomodoroLongBreak * 60
                    : safeSettings.pomodoroBreak * 60;

        if (currentTimeLeft >= currentTotalTime - 0.5) {
            showToast('Voltando fase...', 'info');
            rewindPomodoroPhase();
            const newState = useAppStore.getState().appState.pomodoro;
            const resetTime =
                newState.mode === 'work'
                    ? safeSettings.pomodoroWork * 60
                    : newState.mode === 'long_break'
                        ? safeSettings.pomodoroLongBreak * 60
                        : safeSettings.pomodoroBreak * 60;

            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = newState.mode;
            stateRefs.current.sessions = newState.sessions;
            stateRefs.current.completedCycles = newState.completedCycles;
            stateRefs.current.accumulatedMinutes = newState.accumulatedMinutes;
            stateRefs.current.isRunning = false;
            setIsRunning(false);
            setTimeLeft(resetTime);

            workFillsRef.current.forEach((el, i) => {
                if (el) {
                    el.style.width =
                        i < newState.sessions - 1 ||
                        (i === newState.sessions - 1 &&
                            (newState.mode === 'break' || newState.mode === 'long_break'))
                            ? '100%'
                            : '0%';
                }
            });

            breakBallsRef.current.forEach((el, i) => {
                if (el) {
                    el.style.height = i < newState.sessions - 1 ? '100%' : '0%';
                }
            });

            if (clockRef.current) {
                clockRef.current.textContent = formatTime(resetTime);
            }
            if (svgCircleRef.current) {
                svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
            }

            savePomodoroState({
                isRunning: false,
                timeLeft: resetTime,
                mode: newState.mode,
                sessions: newState.sessions,
                completedCycles: newState.completedCycles,
                accumulatedMinutes: newState.accumulatedMinutes
            });

            postSync({
                type: 'PHASE_REWIND',
                toMode: newState.mode,
                sessions: newState.sessions,
                completedCycles: newState.completedCycles,
                accumulatedMinutes: newState.accumulatedMinutes,
                timeLeft: resetTime
            });
        } else {
            showToast('Cronômetro reiniciado', 'info');

            if (currentMode === 'work') {
                if (workFillsRef.current[currentSessions - 1]) {
                    workFillsRef.current[currentSessions - 1].style.width = '0%';
                }
            } else {
                if (breakBallsRef.current[currentSessions - 1]) {
                    breakBallsRef.current[currentSessions - 1].style.height = '0%';
                }
            }

            stateRefs.current.timeLeft = currentTotalTime;
            stateRefs.current.isRunning = false;
            setIsRunning(false);
            setTimeLeft(currentTotalTime);

            if (clockRef.current) {
                clockRef.current.textContent = formatTime(currentTotalTime);
            }
            if (svgCircleRef.current) {
                svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
            }

            savePomodoroState({ isRunning: false, timeLeft: currentTotalTime });
            postSync({
                type: 'TIMER_RESET',
                timeLeft: currentTotalTime
            });
        }
    };

    const skip = () => {
        if (isTransitioningRef.current) return;

        const s = stateRefs.current.sessions;
        const currentMode = stateRefs.current.mode;

        if (currentMode === 'work') {
            if (workFillsRef.current[s - 1]) {
                workFillsRef.current[s - 1].style.width = '100%';
            }
        } else {
            const breakEl = breakBallsRef.current[s - 1];
            if (breakEl) {
                breakEl.style.height = '100%';
            }
        }

        transitionSession(currentMode, 'skip');
    };

    const togglePlay = useCallback(() => {
        if (!activeSubject) {
            showToast('Selecione uma tarefa no painel ao lado para iniciar.', 'warning');
            return;
        }
        const next = !isRunning;
        stateRefs.current.isRunning = next;
        setIsRunning(next);
        if (!next) {
            setTimeLeft(stateRefs.current.timeLeft);
        }
        postSync({
            type: next ? 'START_SESSION' : 'PAUSE_SESSION',
            timeLeft: stateRefs.current.timeLeft
        });
    }, [activeSubject, isRunning, postSync, showToast]);

    const handleManualExit = useCallback((options = {}) => {
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = null;
        }
        setIsTransitioning(false);
        isTransitioningRef.current = false;

        const subjectSnapshot = options._subjectSnapshot || activeSubjectRef.current;
        if (subjectSnapshot) {
            flushPendingStudyTime(subjectSnapshot);
        }
        safeOnExit({ forceDashboard: true, source: 'dashboard' });
    }, [flushPendingStudyTime, safeOnExit]);

    const totalTime =
        mode === 'work'
            ? safeSettings.pomodoroWork * 60
            : mode === 'long_break'
                ? safeSettings.pomodoroLongBreak * 60
                : safeSettings.pomodoroBreak * 60;

    const isProtocolInactive = !activeSubject;

    return (
        <div className={`w-full relative flex flex-col items-center gap-1 ${isFullscreen ? 'fixed inset-0 z-[9999] bg-[#0a0f1e] p-4 overflow-y-auto' : ''}`}>
            {/* Header com status de recuperação/pausa ou alerta (apenas se ativo) */}
            {(mode === 'break' || mode === 'long_break' || isProtocolInactive) && (
                <div className="w-full">
                    <PomodoroHeader
                        mode={mode}
                        activeSubject={activeSubject}
                        onManualExit={handleManualExit}
                    />
                </div>
            )}

            {/* Container Principal do Relógio de Madeira (Perfeitamente Enquadrado) */}
            <div
                style={{
                    backgroundImage: 'url(/wood-texture.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)'
                }}
                className="w-full border-4 sm:border-[5px] border-[#3f2e26] p-4 sm:p-5 sm:pt-4 rounded-3xl relative overflow-hidden flex flex-col items-center bg-[#2a1f1a] shadow-2xl"
            >
                {/* Mostrador SVG, Toolbar e Indicadores */}
                <PomodoroClock
                    speed={speed}
                    setSpeed={setSpeed}
                    isProtocolInactive={isProtocolInactive}
                    mode={mode}
                    isRunning={isRunning}
                    timeLeft={timeLeft}
                    safeSettings={safeSettings}
                    svgCircleRef={svgCircleRef}
                    clockRef={clockRef}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                    isMuted={isMuted}
                    toggleMute={toggleMute}
                />

                {/* Controles Principais (Voltar / Play-Pause / Pular) */}
                <PomodoroControls
                    isProtocolInactive={isProtocolInactive}
                    isRunning={isRunning}
                    onReset={reset}
                    onTogglePlay={togglePlay}
                    onSkip={skip}
                />

                {/* Botão de Abortar Sessão */}
                {!isProtocolInactive && (
                    <div className="w-full max-w-xs mt-2 pt-2 mb-2 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowAbandonConfirm(true)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 rounded-xl transition-all text-[10px] font-bold text-red-300 group shadow-md"
                        >
                            <RotateCcw
                                size={12}
                                className="text-red-400 group-hover:rotate-[-90deg] transition-transform"
                            />
                            ABORTAR SESSÃO
                        </button>
                    </div>
                )}
            </div>

            {/* Barra de Progresso dos Ciclos */}
            <PomodoroProgress
                targetCycles={targetCycles}
                completedCycles={completedCycles}
                sessions={sessions}
                setTargetCycles={setTargetCycles}
                syncChannel={syncChannel}
                STABLE_TAB_ID={STABLE_TAB_ID}
                activeSubject={activeSubject}
                workFillsRef={workFillsRef}
                breakBallsRef={breakBallsRef}
                mode={mode}
                timeLeft={timeLeft}
                totalTime={totalTime}
            />

            <ConfirmModal
                isOpen={showAbandonConfirm}
                onClose={() => setShowAbandonConfirm(false)}
                onConfirm={() => {
                    setShowAbandonConfirm(false);
                    handleManualExit();
                }}
                title="Abortar Sessão"
                message="Deseja realmente abandonar a sessão? O progresso salvo de estudo será mantido e o ciclo atual encerrado."
                confirmText="Abortar Sessão"
                type="danger"
            />
        </div>
    );
}

export default function ProtectedPomodoro(props) {
    return (
        <PomodoroErrorBoundary>
            <PomodoroTimer {...props} />
        </PomodoroErrorBoundary>
    );
}
