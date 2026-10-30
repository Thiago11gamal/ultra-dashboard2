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
import { playPomodoroAlarm, unlockAudio } from '../utils/audioAlert';
import { formatTime, toPositiveMinutes, SPEED_OPTIONS, POMODORO_PRESETS } from '../utils/pomodoroHelpers';
import { sendPomodoroNotification, requestNotificationPermission } from '../utils/browserNotifications';
import { PomodoroProgress } from './pomodoro/PomodoroProgress';
import { PomodoroControls } from './pomodoro/PomodoroControls';
import { PomodoroHeader } from './pomodoro/PomodoroHeader';
import { PomodoroClock } from './pomodoro/PomodoroClock';
import ConfirmModal from './ConfirmModal';

const STABLE_TAB_ID = `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const CIRCUMFERENCE = 2 * Math.PI * 110;

class PomodoroErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Critical Pomodoro Failure:', error, errorInfo);
    }
    handleReset = () => {
        try {
            localStorage.removeItem('pomodoroState');
            localStorage.removeItem('pomodoro-endsAt');
            localStorage.removeItem('pomodoro_muted');
            sessionStorage.removeItem('pomodoroState');
        } catch { /* ignore */ }
        try {
            const setPomodoroActiveSubject = useAppStore.getState().setPomodoroActiveSubject;
            if (typeof setPomodoroActiveSubject === 'function') setPomodoroActiveSubject(null);
            const resetProgress = useAppStore.getState().resetPomodoroProgress;
            if (typeof resetProgress === 'function') resetProgress();
        } catch { /* ignore */ }
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };
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
                    {this.state.error && (
                        <p className="text-[11px] font-mono text-red-400/80 bg-red-950/40 p-2 rounded max-w-md break-words">
                            {this.state.error?.message || String(this.state.error)}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={this.handleReset}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg transition-all uppercase text-xs tracking-widest cursor-pointer"
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
    _categories = [],
    onFullCycleComplete,
    onUpdateStudyTime,
    onExit,
    onSessionComplete,
    onTimerStateChange,
    recommendedTask,
    onStartRecommended,
    onStartFreeFocus
}) {
    const showToast = useToast();
    const isProtocolInactive = !activeSubject?.taskId;
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
    const setPomodoroRunning = useAppStore(state => state.setPomodoroRunning);
    const updatePomodoroSettings = useAppStore(state => state.updatePomodoroSettings);

    const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [savedState, setSavedState] = useState(() => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = JSON.parse(localStorage.getItem('pomodoroState'));
            if (!saved || typeof saved !== 'object') return null;
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
                        setSavedState(prev => {
                            if (prev && prev.timeLeft === saved.timeLeft && prev.mode === saved.mode && prev.activeTaskId === saved.activeTaskId) {
                                return prev;
                            }
                            return { ...saved, isRunning: false };
                        });
                    } else {
                        setSavedState(prev => prev === null ? null : null);
                    }
                } catch {
                    setSavedState(prev => prev === null ? null : null);
                }
            } else {
                setSavedState(prev => prev === null ? null : null);
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
    const endsAtRef = useRef(null);
    const speedRef = useRef(speed);
    const handoffRef = useRef(false);
    const timeRef = useRef(timeLeft);
    const handlePhaseEndRef = useRef(null);
    const flushedSecondsInPhaseRef = useRef(Number(savedState?.flushedSeconds || 0));

    const [isNotifEnabled, setIsNotifEnabled] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            const saved = localStorage.getItem('pomodoro_notifications_enabled');
            if (saved !== null) return saved === 'true';
            return typeof Notification !== 'undefined' && Notification.permission === 'granted';
        } catch {
            return false;
        }
    });

    const toggleNotifications = async () => {
        if (isNotifEnabled) {
            setIsNotifEnabled(false);
            try { localStorage.setItem('pomodoro_notifications_enabled', 'false'); } catch { /* ignore */ }
            showToast('Notificações de mesa desativadas', 'info');
        } else {
            const perm = await requestNotificationPermission();
            if (perm === 'granted') {
                setIsNotifEnabled(true);
                try { localStorage.setItem('pomodoro_notifications_enabled', 'true'); } catch { /* ignore */ }
                showToast('Notificações do navegador ativadas! 🔔', 'success');
                sendPomodoroNotification('Ultra Pomodoro Conectado! 🔔', {
                    body: 'Você receberá avisos quando seus ciclos de foco e pausa terminarem.'
                });
            } else if (perm === 'denied') {
                showToast('Permissão de notificações bloqueada no seu navegador.', 'warning');
                setIsNotifEnabled(false);
            } else {
                showToast('Notificações não suportadas neste ambiente.', 'warning');
            }
        }
    };

    // C-07 FIX: stateRefs deve ser definido ANTES de commitTimeLeft.
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

    const commitTimeLeft = useCallback((value) => {
        const safe = Math.max(0, Number(value) || 0);
        timeRef.current = safe;
        if (stateRefs.current) {
            stateRefs.current.timeLeft = safe;
        }
        setTimeLeft(safe);
    }, []);

    const [activePresetId, setActivePresetId] = useState(() => {
        const w = safeSettings.pomodoroWork;
        const b = safeSettings.pomodoroBreak;
        const match = POMODORO_PRESETS.find(p => p.work === w && p.break === b);
        return match ? match.id : 'custom';
    });

    const handleSelectPreset = useCallback((preset) => {
        if (isRunning) {
            showToast('Pause o cronômetro para alterar a cadência.', 'warning');
            return;
        }

        setActivePresetId(preset.id);
        if (typeof updatePomodoroSettings === 'function') {
            updatePomodoroSettings({
                pomodoroWork: preset.work,
                pomodoroBreak: preset.break,
                pomodoroLongBreak: preset.longBreak
            });
        }

        const newSeconds = mode === 'work'
            ? preset.work * 60
            : mode === 'long_break'
                ? preset.longBreak * 60
                : preset.break * 60;

        commitTimeLeft(newSeconds);
        if (clockRef.current) {
            clockRef.current.textContent = formatTime(newSeconds);
        }
        if (svgCircleRef.current?.style) {
            svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
        }

        showToast(`Cadência alterada para ${preset.name} (${preset.label}) ⏱️`, 'info');
    }, [isRunning, mode, updatePomodoroSettings, commitTimeLeft, showToast]);

    useEffect(() => {
        timeRef.current = timeLeft;
        if (stateRefs.current) {
            stateRefs.current.timeLeft = timeLeft;
        }
    }, [timeLeft]);

    useEffect(() => {
        if (typeof onTimerStateChange === 'function') {
            const currentTotal = mode === 'work'
                ? (safeSettings.pomodoroWork || 25) * 60
                : mode === 'long_break'
                    ? (safeSettings.pomodoroLongBreak || 15) * 60
                    : (safeSettings.pomodoroBreak || 5) * 60;
            onTimerStateChange({
                isRunning,
                timeLeft,
                totalTime: currentTotal,
                mode,
                sessions,
                targetCycles,
                completedCycles
            });
        }
    }, [
        isRunning,
        timeLeft,
        mode,
        sessions,
        targetCycles,
        completedCycles,
        safeSettings.pomodoroWork,
        safeSettings.pomodoroBreak,
        safeSettings.pomodoroLongBreak,
        onTimerStateChange
    ]);

    // ✅ RESTORE DE SESSÃO APÓS RELOAD (COM ESCOPO DE TAREFA E SESSÃO)
    useEffect(() => {
        if (!activeSubject?.taskId) return;

        try {
            const rawEndsAt = localStorage.getItem('pomodoro-endsAt');
            if (!rawEndsAt) return;
            let endsAt = null;
            let endsAtTaskId = null;
            let endsAtSessionId = null;

            try {
                const parsed = JSON.parse(rawEndsAt);
                if (parsed && typeof parsed === 'object') {
                    endsAt = Number(parsed.endsAt);
                    endsAtTaskId = parsed.taskId || null;
                    endsAtSessionId = parsed.sessionInstanceId || null;
                } else {
                    endsAt = Number(rawEndsAt);
                }
            } catch {
                endsAt = Number(rawEndsAt);
            }

            if (!Number.isFinite(endsAt) || endsAt <= 0) {
                try { localStorage.removeItem('pomodoro-endsAt'); } catch { /* ignore */ }
                return;
            }

            if (endsAtTaskId && endsAtTaskId !== activeSubject.taskId) {
                try { localStorage.removeItem('pomodoro-endsAt'); } catch { /* ignore */ }
                return;
            }
            if (endsAtSessionId && endsAtSessionId !== activeSubject.sessionInstanceId) {
                try { localStorage.removeItem('pomodoro-endsAt'); } catch { /* ignore */ }
                return;
            }

            const currentSpeed = speedRef.current || 1;
            const now = Date.now();
            if (endsAt > now) {
                endsAtRef.current = endsAt;
                const remaining = Math.max(0, Math.round(((endsAt - now) * currentSpeed) / 1000));
                commitTimeLeft(remaining);
                if (stateRefs.current) {
                    stateRefs.current.isRunning = true;
                }
                setIsRunning(true);
                if (typeof setPomodoroRunning === 'function') {
                    setPomodoroRunning(true);
                }
            } else {
                endsAtRef.current = null;
                try { localStorage.removeItem('pomodoro-endsAt'); } catch { /* ignore */ }
                commitTimeLeft(0);
                handlePhaseEndRef.current?.();
            }
        } catch (err) {
            console.warn('[PomodoroTimer] Falha ao restaurar endsAt:', err);
        }
    }, [activeSubject?.taskId, activeSubject?.sessionInstanceId, setPomodoroRunning, commitTimeLeft]);

    const [syncChannel] = useState(() => {
        try {
            if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
                return new window.BroadcastChannel('pomodoro_sync');
            }
        } catch (e) {
            console.warn('[PomodoroTimer] BroadcastChannel indisponível:', e);
        }
        return null;
    });

    useEffect(() => {
        return () => {
            try {
                syncChannel?.close?.();
            } catch { /* ignore */ }
        };
    }, [syncChannel]);

    const activeSubjectRef = useRef(activeSubject);
    useEffect(() => {
        activeSubjectRef.current = activeSubject;
    }, [activeSubject]);

    const postSync = useCallback((payload) => {
        try {
            if (!syncChannel || typeof syncChannel.postMessage !== 'function') return;
            if (!payload || typeof payload !== 'object' || !payload.type) return;
            syncChannel.postMessage({
                ...payload,
                tabId: STABLE_TAB_ID,
                taskId: activeSubjectRef.current?.taskId || null,
                sessionInstanceId: activeSubjectRef.current?.sessionInstanceId || null
            });
        } catch (error) {
            console.warn('[PomodoroSync] Failed to post message:', error);
        }
    }, [syncChannel]);

    useEffect(() => {
        if (speedRef.current !== speed) {
            speedRef.current = speed;
            if (isRunning && endsAtRef.current) {
                const currentLeft = Number(stateRefs.current?.timeLeft ?? timeLeft) || 0;
                endsAtRef.current = Date.now() + (currentLeft * 1000) / (speed || 1);
                try {
                    localStorage.setItem('pomodoro-endsAt', JSON.stringify({
                        endsAt: endsAtRef.current,
                        taskId: activeSubjectRef.current?.taskId || null,
                        sessionInstanceId: activeSubjectRef.current?.sessionInstanceId || null
                    }));
                } catch { /* ignore */ }
            }
            postSync({
                type: 'SPEED_CHANGE',
                speed
            });
        }
    }, [speed, isRunning, postSync, timeLeft]);

    const transitionTimeoutRef = useRef(null);
    const completionTimeoutRef = useRef(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const isTransitioningRef = useRef(false);
    const transitionRetriesRef = useRef(0);

    const clockRef = useRef(null);
    const svgCircleRef = useRef(null);
    const workFillsRef = useRef([]);
    const breakBallsRef = useRef([]);

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
    const transitionLockRef = useRef(0);
    const hasFlushedRef = useRef(false);

    const flushPendingStudyTime = useCallback((subjectOverride = null) => {
        // C-08 FIX: hasFlushedRef já protege, mas também verificar se
        // estamos em transição para evitar flush duplo.
        if (hasFlushedRef.current || isTransitioningRef.current) return;
        const subjectSnapshot = subjectOverride || activeSubjectRef.current;
        if (!subjectSnapshot) return;

        const current = stateRefs.current;
        let minutes = 0;

        if (current.mode === 'work') {
            const liveState = useAppStore.getState();
            const activeId = liveState?.appState?.activeId;
            const liveSettings = liveState?.appState?.contests?.[activeId]?.settings || liveState?.settings || {};
            const livePomodoroWork = Math.max(1, Number(liveSettings.pomodoroWork || safeSettings.pomodoroWork || 25));
            const totalWorkSeconds = livePomodoroWork * 60;
            const rawPrev = Number(timeRef.current ?? current.timeLeft);
            const safePrevTime = Number.isFinite(rawPrev) && rawPrev >= 0
                ? rawPrev
                : totalWorkSeconds;
            const totalElapsedSec = Math.max(0, totalWorkSeconds - safePrevTime);
            const unflushedSec = Math.max(0, totalElapsedSec - (flushedSecondsInPhaseRef.current || 0));
            minutes = unflushedSec / 60;
        }

        minutes = Number.isFinite(minutes) ? Number(minutes.toFixed(2)) : 0;

        if (minutes >= 0.25 && Number.isFinite(minutes)) {
            hasFlushedRef.current = true;
            flushedSecondsInPhaseRef.current = (flushedSecondsInPhaseRef.current || 0) + (minutes * 60);
            safeOnUpdateStudyTime(
                subjectSnapshot.categoryId,
                minutes,
                subjectSnapshot.taskId,
                subjectSnapshot.task || subjectSnapshot.title || subjectSnapshot.name || ''
            );
            if (typeof onSessionComplete === 'function') {
                onSessionComplete();
            }
        }

        const totalWorkSeconds = (Number(safeSettings.pomodoroWork) || 25) * 60;
        timeRef.current = totalWorkSeconds;
        stateRefs.current.timeLeft = totalWorkSeconds;
        prevTaskStateRef.current = {
            subject: null,
            accum: 0,
            time: totalWorkSeconds,
            mode: 'work'
        };

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
    }, [safeSettings, safeOnUpdateStudyTime, onSessionComplete]);

    useEffect(() => {
        const prev = prevTaskStateRef.current;
        if (prev.subject && activeSubject?.taskId !== prev.subject.taskId) {
            let lostMinutes = 0;
            if (prev.mode === 'work') {
                const totalWorkSeconds = safeSettings.pomodoroWork * 60;
                const currentLeft = Number(timeRef.current ?? stateRefs.current.timeLeft);
                const safePrevTime = Number.isFinite(currentLeft) && currentLeft >= 0
                    ? currentLeft
                    : totalWorkSeconds;
                lostMinutes = Number(
                    (Math.max(0, totalWorkSeconds - safePrevTime) / 60).toFixed(2)
                );
            }
            if (lostMinutes >= 0.25 && !Number.isNaN(lostMinutes)) {
                safeOnUpdateStudyTime(
                    prev.subject.categoryId,
                    lostMinutes,
                    prev.subject.taskId,
                    prev.subject.task || prev.subject.title || prev.subject.name || ''
                );
                if (typeof onSessionComplete === 'function') {
                    onSessionComplete();
                }
            }
        }
        prevTaskStateRef.current = {
            subject: activeSubject,
            accum: accumulatedMinutes,
            time: timeRef.current ?? stateRefs.current.timeLeft,
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
                // eslint-disable-next-line react-hooks/set-state-in-effect
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
            } else if (!stateRefs.current.isRunning && !isRunning) {
                stateRefs.current.lastTaskId = activeSubject?.taskId;
                const prevTotal = stateRefs.current.lastTotalTime;
                if (prevTotal !== undefined && prevTotal !== newTotalTime && stateRefs.current.timeLeft === prevTotal) {
                    setTimeLeft(newTotalTime);
                    stateRefs.current.timeLeft = newTotalTime;
                    if (clockRef.current) {
                        const mins = Math.floor(newTotalTime / 60);
                        const secs = newTotalTime % 60;
                        clockRef.current.textContent =
                            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                    }
                }
                stateRefs.current.lastTotalTime = newTotalTime;
            }
        }
    }, [
        activeSubject?.taskId,
        mode,
        safeSettings.pomodoroWork,
        safeSettings.pomodoroBreak,
        safeSettings.pomodoroLongBreak,
        isTransitioning,
        isRunning
    ]);

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

        if (Array.isArray(workFillsRef.current)) {
            workFillsRef.current.forEach((el, i) => {
                if (!el || !el.style) return;
                if (
                    i < currentSessions - 1 ||
                    (i === currentSessions - 1 && currentMode !== 'work')
                ) {
                    el.style.width = '100%';
                } else if (i === currentSessions - 1 && currentMode === 'work') {
                    if (!isRunning) el.style.width = currentPercent;
                } else {
                    el.style.width = '0%';
                }
            });
        }

        if (Array.isArray(breakBallsRef.current)) {
            breakBallsRef.current.forEach((el, i) => {
                if (!el || !el.style) return;
                if (i < currentSessions - 1) {
                    el.style.height = '100%';
                } else if (i === currentSessions - 1 && currentMode !== 'work') {
                    if (!isRunning) el.style.height = currentPercent;
                } else {
                    el.style.height = '0%';
                }
            });
        }

        if (!isRunning && svgCircleRef.current?.style) {
            svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE * fraction;
        }
    }, [
        mode,
        sessions,
        targetCycles,
        timeLeft,
        isRunning,
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
        isMutedRef,
        endsAtRef
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
                targetCycles: current.targetCycles,
                completedCycles: current.completedCycles,
                accumulatedMinutes: current.accumulatedMinutes,
                flushedSeconds: flushedSecondsInPhaseRef.current || 0,
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
            if (handoffRef.current) {
                handoffRef.current = false;
                return;
            }

            // C-08 FIX: Verificar se já houve flush E se não estamos
            // em transição de fase (que faz seu próprio flush).
            if (hasFlushedRef.current || isTransitioningRef.current) return;
            const currentSub = activeSubjectRef.current;
            if (currentSub && stateRefs.current.mode === 'work') {
                const totalWorkSeconds = (safeSettings.pomodoroWork || 25) * 60;
                const currentTime = Number(timeRef.current ?? stateRefs.current.timeLeft);
                const totalElapsedSec = Math.max(0, totalWorkSeconds - currentTime);
                const unflushedSec = Math.max(0, totalElapsedSec - (flushedSecondsInPhaseRef.current || 0));
                const elapsedMins = Number((unflushedSec / 60).toFixed(2));
                if (elapsedMins >= 0.25) {
                    hasFlushedRef.current = true;
                    flushedSecondsInPhaseRef.current = (flushedSecondsInPhaseRef.current || 0) + (elapsedMins * 60);
                    safeOnUpdateStudyTime(
                        currentSub.categoryId,
                        elapsedMins,
                        currentSub.taskId,
                        currentSub.task || currentSub.title || currentSub.name || ''
                    );
                    if (typeof onSessionComplete === 'function') {
                        onSessionComplete();
                    }
                }
            }
            savePomodoroState({
                isRunning: false,
                timeLeft: stateRefs.current.timeLeft,
                flushedSeconds: flushedSecondsInPhaseRef.current || 0
            });
            setPomodoroRunning(false);
            endsAtRef.current = null;
            try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
        };
    }, [savePomodoroState, safeSettings, safeOnUpdateStudyTime, onSessionComplete, setPomodoroRunning]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            savePomodoroState({ isRunning: false, timeLeft: stateRefs.current.timeLeft });
            setPomodoroRunning(false);
            try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [savePomodoroState, setPomodoroRunning]);

    const transitionSession = useCallback((completedMode, source = 'natural') => {
        if (isTransitioningRef.current) return;

        if (source === 'natural') {
            const now = Date.now();
            if (transitionLockRef.current && now - transitionLockRef.current < 2000) {
                return;
            }
            transitionLockRef.current = now;
            try {
                const lockKey = `pomodoro_transition_lock_${activeSubjectRef.current?.taskId || 'global'}`;
                const lastTransition = Number(localStorage.getItem(lockKey) || 0);
                if (now - lastTransition < 2000) {
                    return;
                }
                localStorage.setItem(lockKey, now.toString());
            } catch {
                // se storage falhar, segue apenas com lock em memória
            }
        }

        isTransitioningRef.current = true;
        hasFlushedRef.current = false;
        setIsTransitioning(true);
        setIsRunning(false);
        stateRefs.current.isRunning = false;
        setPomodoroRunning(false);
        endsAtRef.current = null;
        try { localStorage.removeItem('pomodoro-endsAt'); } catch {}

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
            const totalWorkSeconds = safeSettings.pomodoroWork * 60;
            if (!isManual) {
                const unflushedSec = Math.max(0, totalWorkSeconds - (flushedSecondsInPhaseRef.current || 0));
                sessionMinutes = Number((unflushedSec / 60).toFixed(2));
            } else if (source === 'skip') {
                const currentLeft = Number(stateRefs.current.timeLeft) || 0;
                const totalElapsedSec = Math.max(0, totalWorkSeconds - currentLeft);
                const unflushedSec = Math.max(0, totalElapsedSec - (flushedSecondsInPhaseRef.current || 0));
                sessionMinutes = Number((unflushedSec / 60).toFixed(2));
            }
            flushedSecondsInPhaseRef.current = 0;
        } else {
            flushedSecondsInPhaseRef.current = 0;
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
                targetSubject.taskId,
                targetSubject.task || targetSubject.title || targetSubject.name || ''
            );
            hasFlushedRef.current = true;
            savedMinutes = sessionMinutes;
        }

        const actualSeriesMinutes = Number(
            ((stateRefs.current.accumulatedMinutes || 0) + sessionMinutes).toFixed(1)
        );

        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
        }

        transitionTimeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current) {
                return;
            }

            const manualMinutes =
                completedMode === 'work' && isManual
                    ? Number(sessionMinutes.toFixed(2))
                    : 0;

            completePomodoroPhase(isManual, manualMinutes);

            if (typeof onSessionComplete === 'function') {
                onSessionComplete();
            }

            const storePomodoro = useAppStore.getState().appState?.pomodoro;
            const newState = storePomodoro || {
                mode: 'work',
                sessions: 1,
                targetCycles: 1,
                completedCycles: 0,
                accumulatedMinutes: 0
            };
            const currentNewMode = newState.mode || 'work';
            const resetTime =
                currentNewMode === 'work'
                    ? (safeSettings.pomodoroWork || 25) * 60
                    : currentNewMode === 'long_break'
                        ? (safeSettings.pomodoroLongBreak || 15) * 60
                        : (safeSettings.pomodoroBreak || 5) * 60;

            commitTimeLeft(resetTime);
            stateRefs.current.mode = currentNewMode;
            stateRefs.current.sessions = newState.sessions || 1;
            stateRefs.current.completedCycles = newState.completedCycles || 0;
            stateRefs.current.accumulatedMinutes = newState.accumulatedMinutes || 0;

            if (clockRef.current) {
                const mins = Math.floor(resetTime / 60);
                const secs = resetTime % 60;
                clockRef.current.textContent =
                    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }

            if (svgCircleRef.current?.style) {
                svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
            }

            savePomodoroState({
                isRunning: false,
                timeLeft: resetTime,
                mode: newState.mode,
                sessions: newState.sessions,
                targetCycles: newState.targetCycles,
                completedCycles: newState.completedCycles,
                accumulatedMinutes: newState.accumulatedMinutes
            });

            postSync({
                type: isManual ? 'PHASE_SKIP' : 'PHASE_COMPLETE',
                toMode: newState.mode,
                sessions: newState.sessions,
                targetCycles: newState.targetCycles,
                completedCycles: newState.completedCycles,
                accumulatedMinutes: newState.accumulatedMinutes,
                timeLeft: resetTime
            });

            setIsTransitioning(false);
            isTransitioningRef.current = false;
            transitionTimeoutRef.current = null;

            // Disparar Notificação Nativa do Sistema / Navegador
            if (isNotifEnabled) {
                if (completedMode === 'work') {
                    const nextBreakMin = (newState.mode === 'long_break' ? safeSettings.pomodoroLongBreak : safeSettings.pomodoroBreak) || 5;
                    sendPomodoroNotification('Tempo de Foco Concluído! 🏆', {
                        body: `Excelente trabalho! Descanse por ${nextBreakMin} minutos para recuperar a energia mental.`
                    });
                } else if (completedMode === 'break' || completedMode === 'long_break') {
                    const nextWorkMin = safeSettings.pomodoroWork || 25;
                    sendPomodoroNotification('Pausa Finalizada! ⚡', {
                        body: `Sua recuperação foi concluída. Pronto para o próximo bloco de ${nextWorkMin} minutos?`
                    });
                }
            }

            if (isEndingCycle) {
                const liveSettings = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId]?.settings || safeSettings;
                const workMins = Number(liveSettings?.pomodoroWork) || 25;
                const seriesTotalMinutes = source === 'natural'
                    ? (currentTarget * workMins)
                    : Math.round(actualSeriesMinutes);
                safeOnFullCycleComplete(
                    seriesTotalMinutes,
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
        postSync,
        setPomodoroRunning,
        commitTimeLeft
    ]);

    const handlePhaseEnd = useCallback(() => {
        endsAtRef.current = null;
        try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
        if (!isTransitioningRef.current) {
            transitionRetriesRef.current = 0;
            transitionSession(stateRefs.current.mode, 'natural');
        } else {
            transitionRetriesRef.current++;
            if (transitionRetriesRef.current > 15) {
                console.warn('[Pomodoro] Transição travada — forçando reset.');
                isTransitioningRef.current = false;
                transitionRetriesRef.current = 0;
                transitionSession(stateRefs.current.mode, 'natural');
            }
        }
    }, [transitionSession]);
    handlePhaseEndRef.current = handlePhaseEnd;

    // ✅ TIMER SEM DRIFT (Sobrevive a abas em background e reload)
    useEffect(() => {
        if (!isRunning || !endsAtRef.current) return;
        const id = setInterval(() => {
            const currentSpeed = speedRef.current || 1;
            const next = Math.max(0, Math.round(((endsAtRef.current - Date.now()) * currentSpeed) / 1000));
            stateRefs.current.timeLeft = next;
            timeRef.current = next;
            setTimeLeft(next);
            if (next <= 0) {
                clearInterval(id);
                handlePhaseEnd();
            }
        }, 250); // Tick curto para precisão e background survival
        return () => clearInterval(id);
    }, [isRunning, handlePhaseEnd]);

    // ✅ ANIMAÇÃO 60FPS/120FPS ULTRA-FLUIDA DO MOSTRADOR CIRCULAR E PROGRESSO
    useEffect(() => {
        if (!isRunning || !endsAtRef.current) {
            if (svgCircleRef.current?.style) {
                svgCircleRef.current.style.transition = 'stroke-dashoffset 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
            }
            return;
        }

        if (svgCircleRef.current?.style) {
            svgCircleRef.current.style.transition = 'none';
        }

        let animFrameId = null;
        const currentMode = mode;
        const currentSessions = sessions;
        const currentTotalTime = currentMode === 'work'
            ? (safeSettings.pomodoroWork || 25) * 60
            : currentMode === 'long_break'
                ? (safeSettings.pomodoroLongBreak || 15) * 60
                : (safeSettings.pomodoroBreak || 5) * 60;

        const updateFluidRing = () => {
            if (!endsAtRef.current || !isMountedRef.current) return;

            const currentSpeed = speedRef.current || 1;
            const now = Date.now();
            const msRemaining = Math.max(0, (endsAtRef.current - now) * currentSpeed);
            const fracSeconds = msRemaining / 1000;
            const fraction = Math.max(0, Math.min(1, fracSeconds / (currentTotalTime || 1)));

            // 1. Atualização contínua do anel SVG a 60/120fps sem degraus
            if (svgCircleRef.current?.style) {
                svgCircleRef.current.style.strokeDashoffset = `${CIRCUMFERENCE * fraction}px`;
            }

            // 2. Sincronização em milissegundos dos dígitos numéricos
            const wholeSec = Math.ceil(fracSeconds);
            if (clockRef.current && clockRef.current.__lastSec !== wholeSec) {
                clockRef.current.__lastSec = wholeSec;
                clockRef.current.textContent = formatTime(wholeSec);
            }

            // 3. Atualização fluida do indicador de ciclo ativo
            const currentPercent = `${Math.max(0, Math.min(100, (1 - fraction) * 100))}%`;
            if (currentMode === 'work') {
                const fillEl = workFillsRef.current?.[currentSessions - 1];
                if (fillEl?.style) {
                    fillEl.style.width = currentPercent;
                }
            } else {
                const breakEl = breakBallsRef.current?.[currentSessions - 1];
                if (breakEl?.style) {
                    breakEl.style.height = currentPercent;
                }
            }

            animFrameId = requestAnimationFrame(updateFluidRing);
        };

        animFrameId = requestAnimationFrame(updateFluidRing);

        return () => {
            if (animFrameId) {
                cancelAnimationFrame(animFrameId);
            }
        };
    }, [
        isRunning,
        mode,
        sessions,
        safeSettings.pomodoroWork,
        safeSettings.pomodoroBreak,
        safeSettings.pomodoroLongBreak
    ]);

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
            const storePomodoro = useAppStore.getState().appState?.pomodoro;
            const newState = storePomodoro || {
                mode: 'work',
                sessions: 1,
                targetCycles: 1,
                completedCycles: 0,
                accumulatedMinutes: 0
            };
            const currentNewMode = newState.mode || 'work';
            const resetTime =
                currentNewMode === 'work'
                    ? (safeSettings.pomodoroWork || 25) * 60
                    : currentNewMode === 'long_break'
                        ? (safeSettings.pomodoroLongBreak || 15) * 60
                        : (safeSettings.pomodoroBreak || 5) * 60;

            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = currentNewMode;
            stateRefs.current.sessions = newState.sessions || 1;
            stateRefs.current.completedCycles = newState.completedCycles || 0;
            stateRefs.current.accumulatedMinutes = newState.accumulatedMinutes || 0;
            stateRefs.current.isRunning = false;
            setIsRunning(false);
            setPomodoroRunning(false);
            endsAtRef.current = null;
            try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
            setTimeLeft(resetTime);

            if (Array.isArray(workFillsRef.current)) {
                workFillsRef.current.forEach((el, i) => {
                    if (el && el.style) {
                        el.style.width =
                            i < (newState.sessions || 1) - 1 ||
                            (i === (newState.sessions || 1) - 1 &&
                                (currentNewMode === 'break' || currentNewMode === 'long_break'))
                                ? '100%'
                                : '0%';
                    }
                });
            }

            if (Array.isArray(breakBallsRef.current)) {
                breakBallsRef.current.forEach((el, i) => {
                    if (el && el.style) {
                        el.style.height = i < (newState.sessions || 1) - 1 ? '100%' : '0%';
                    }
                });
            }

            if (clockRef.current) {
                clockRef.current.textContent = formatTime(resetTime);
            }
            if (svgCircleRef.current?.style) {
                svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
            }

            savePomodoroState({
                isRunning: false,
                timeLeft: resetTime,
                mode: currentNewMode,
                sessions: newState.sessions || 1,
                completedCycles: newState.completedCycles || 0,
                accumulatedMinutes: newState.accumulatedMinutes || 0
            });

            postSync({
                type: 'PHASE_REWIND',
                toMode: currentNewMode,
                sessions: newState.sessions || 1,
                completedCycles: newState.completedCycles || 0,
                accumulatedMinutes: newState.accumulatedMinutes || 0,
                timeLeft: resetTime
            });
        } else {
            showToast('Cronômetro reiniciado', 'info');

            if (currentMode === 'work') {
                if (workFillsRef.current?.[currentSessions - 1]?.style) {
                    workFillsRef.current[currentSessions - 1].style.width = '0%';
                }
            } else {
                if (breakBallsRef.current?.[currentSessions - 1]?.style) {
                    breakBallsRef.current[currentSessions - 1].style.height = '0%';
                }
            }

            stateRefs.current.timeLeft = currentTotalTime;
            stateRefs.current.isRunning = false;
            setIsRunning(false);
            setPomodoroRunning(false);
            endsAtRef.current = null;
            try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
            setTimeLeft(currentTotalTime);

            if (clockRef.current) {
                clockRef.current.textContent = formatTime(currentTotalTime);
            }
            if (svgCircleRef.current?.style) {
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
            if (workFillsRef.current?.[s - 1]?.style) {
                workFillsRef.current[s - 1].style.width = '100%';
            }
        } else {
            const breakEl = breakBallsRef.current?.[s - 1];
            if (breakEl?.style) {
                breakEl.style.height = '100%';
            }
        }

        transitionSession(currentMode, 'skip');
    };

    // ✅ FUNÇÕES DE CONTROLE ATUALIZADAS
    const startTimer = useCallback(() => {
        unlockAudio();
        const currentLeft = stateRefs.current.timeLeft > 0 ? stateRefs.current.timeLeft : timeLeft;

        if (currentLeft <= 0) {
            handlePhaseEnd();
            return;
        }

        hasFlushedRef.current = false;
        const currentSpeed = speedRef.current || 1;
        endsAtRef.current = Date.now() + (currentLeft * 1000) / currentSpeed;
        try {
            localStorage.setItem('pomodoro-endsAt', JSON.stringify({
                endsAt: endsAtRef.current,
                taskId: activeSubjectRef.current?.taskId || null,
                sessionInstanceId: activeSubjectRef.current?.sessionInstanceId || null
            }));
        } catch {}
        stateRefs.current.isRunning = true;
        setIsRunning(true);
        setPomodoroRunning(true);
        savePomodoroState({ isRunning: true, timeLeft: currentLeft });
        postSync({
            type: 'START_SESSION',
            timeLeft: currentLeft,
            endsAt: endsAtRef.current,
            speed: currentSpeed
        });
    }, [timeLeft, postSync, savePomodoroState, setPomodoroRunning, handlePhaseEnd]);

    const pauseTimer = useCallback(() => {
        const currentSpeed = speedRef.current || 1;
        const remaining = endsAtRef.current
            ? Math.max(0, Math.round(((endsAtRef.current - Date.now()) * currentSpeed) / 1000))
            : stateRefs.current.timeLeft;
        endsAtRef.current = null;
        try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
        commitTimeLeft(remaining);
        stateRefs.current.isRunning = false;
        setIsRunning(false);
        setPomodoroRunning(false);
        savePomodoroState({ isRunning: false, timeLeft: remaining });
        postSync({
            type: 'PAUSE_SESSION',
            timeLeft: remaining
        });
    }, [postSync, savePomodoroState, setPomodoroRunning, commitTimeLeft]);

    const togglePlay = useCallback(() => {
        if (!activeSubject) {
            if (recommendedTask && typeof onStartRecommended === 'function') {
                onStartRecommended(recommendedTask);
                showToast(`Iniciando alvo recomendado pela IA: "${recommendedTask.title || recommendedTask.text}" ⚡`, 'info');
                return;
            }

            if (typeof onStartFreeFocus === 'function') {
                onStartFreeFocus();
                return;
            }

            const defaultSubject = {
                categoryId: 'geral',
                category: 'Geral',
                taskId: `estudo_livre_${Date.now()}`,
                task: 'Estudo Livre / Foco Aberto',
                priority: 'medium',
                source: 'pomodoro',
                sessionInstanceId: Date.now().toString()
            };

            const currentSpeed = speedRef.current || 1;
            const currentLeft = (safeSettings.pomodoroWork || 25) * 60;
            const endsAt = Date.now() + (currentLeft * 1000) / currentSpeed;

            handoffRef.current = true;

            useAppStore.getState().setPomodoroActiveSubject(defaultSubject);
            useAppStore.getState().setPomodoroRunning(true);

            try {
                localStorage.setItem(
                    'pomodoro-endsAt',
                    JSON.stringify({
                        endsAt,
                        taskId: defaultSubject.taskId,
                        sessionInstanceId: defaultSubject.sessionInstanceId
                    })
                );

                localStorage.setItem(
                    'pomodoroState',
                    JSON.stringify({
                        activeTaskId: defaultSubject.taskId,
                        sessionInstanceId: defaultSubject.sessionInstanceId,
                        mode: 'work',
                        timeLeft: currentLeft,
                        isRunning: true,
                        sessions: 1,
                        targetCycles: Math.max(1, Number(targetCycles) || 1),
                        completedCycles: 0,
                        accumulatedMinutes: 0,
                        speed: currentSpeed,
                        savedAt: Date.now()
                    })
                );
            } catch {}

            try {
                syncChannel?.postMessage?.({
                    type: 'START_SESSION',
                    tabId: STABLE_TAB_ID,
                    taskId: defaultSubject.taskId,
                    sessionInstanceId: defaultSubject.sessionInstanceId,
                    timeLeft: currentLeft,
                    endsAt,
                    speed: currentSpeed
                });
            } catch {}

            showToast('Iniciando sessão de Foco Livre ⏱️', 'info');
            return;
        }

        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }, [
        activeSubject,
        isRunning,
        pauseTimer,
        startTimer,
        showToast,
        safeSettings.pomodoroWork,
        targetCycles,
        syncChannel,
        recommendedTask,
        onStartRecommended,
        onStartFreeFocus
    ]);

    const togglePlayRef = useRef(togglePlay);
    const skipRef = useRef(skip);
    const resetRef = useRef(reset);
    const toggleMuteRef = useRef(toggleMute);
    const toggleFullscreenRef = useRef(toggleFullscreen);
    const isProtocolInactiveRef = useRef(isProtocolInactive);

    useEffect(() => {
        togglePlayRef.current = togglePlay;
        skipRef.current = skip;
        resetRef.current = reset;
        toggleMuteRef.current = toggleMute;
        toggleFullscreenRef.current = toggleFullscreen;
        isProtocolInactiveRef.current = isProtocolInactive;
    });

    // ✅ ATALHOS DE TECLADO GLOBAIS (Espaço: Play/Pause, S: Skip, R: Reset, M: Mute, F: Fullscreen)
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                togglePlayRef.current?.();
            } else if (e.code === 'KeyS' && !isProtocolInactiveRef.current) {
                e.preventDefault();
                skipRef.current?.();
            } else if (e.code === 'KeyR' && !isProtocolInactiveRef.current) {
                e.preventDefault();
                resetRef.current?.();
            } else if (e.code === 'KeyM') {
                e.preventDefault();
                toggleMuteRef.current?.();
            } else if (e.code === 'KeyF') {
                e.preventDefault();
                toggleFullscreenRef.current?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleManualExit = useCallback((options = {}) => {
        endsAtRef.current = null;
        try { localStorage.removeItem('pomodoro-endsAt'); } catch { /* ignore */ }
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
        safeOnExit({ forceDashboard: false, source: activeSubjectRef.current?.source || 'pomodoro' });
    }, [flushPendingStudyTime, safeOnExit]);

    const totalTime =
        mode === 'work'
            ? safeSettings.pomodoroWork * 60
            : mode === 'long_break'
                ? safeSettings.pomodoroLongBreak * 60
                : safeSettings.pomodoroBreak * 60;

    useEffect(() => {
        if (!isRunning) {
            document.title = 'Pomodoro | Ultra Dashboard';
            return;
        }

        const updateDocTitle = () => {
            const currentT = Number(timeRef.current ?? stateRefs.current.timeLeft);
            document.title = `${formatTime(currentT)} - Pomodoro`;
        };

        updateDocTitle();
        const id = setInterval(updateDocTitle, 1000);
        return () => {
            clearInterval(id);
            document.title = 'Pomodoro | Ultra Dashboard';
        };
    }, [isRunning]);

    return (
        <div className={`w-full relative flex flex-col items-center gap-1 ${isFullscreen ? 'fixed inset-0 z-[9999] bg-[#0a0f1e] p-4 overflow-y-auto' : ''}`}>
            {/* Header com status de recuperação/pausa ou alerta (apenas se ativo) */}
            {(mode === 'break' || mode === 'long_break' || isProtocolInactive) && (
                <div className="w-full">
                    <PomodoroHeader
                        mode={mode}
                        activeSubject={activeSubject}
                        onManualExit={handleManualExit}
                        onStartRecommended={onStartRecommended}
                        recommendedTask={recommendedTask}
                        onStartFreeFocus={onStartFreeFocus}
                    />
                </div>
            )}

            {/* Container Principal do Relógio de Madeira (Perfeitamente Enquadrado) */}
            <div
                style={{
                    backgroundColor: '#b08e6b',
                    backgroundImage: 'url(/wood-texture.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)'
                }}
                className="w-full border-[3px] sm:border-4 border-[#3f2e26] p-3 sm:p-4 rounded-2xl sm:rounded-3xl relative overflow-hidden flex flex-col items-center bg-[#2a1f1a] shadow-2xl"
            >

                {/* Mostrador SVG, Toolbar e Indicadores */}
                <PomodoroClock
                    speed={speed}
                    setSpeed={setSpeed}
                    isProtocolInactive={isProtocolInactive}
                    mode={mode}
                    isRunning={isRunning}
                    timeLeft={timeLeft}
                    totalTime={totalTime}
                    safeSettings={safeSettings}
                    svgCircleRef={svgCircleRef}
                    clockRef={clockRef}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                    isMuted={isMuted}
                    toggleMute={toggleMute}
                    isNotifEnabled={isNotifEnabled}
                    toggleNotifications={toggleNotifications}
                    onSelectPreset={handleSelectPreset}
                    activePresetId={activePresetId}
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
                    <div className="w-full max-w-xs mt-1 pt-1.5 mb-0.5 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowAbandonConfirm(true)}
                            className="w-full flex items-center justify-center gap-1.5 py-1 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 rounded-lg transition-all text-[9px] font-bold text-red-300 group shadow-md"
                        >
                            <RotateCcw
                                size={11}
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
