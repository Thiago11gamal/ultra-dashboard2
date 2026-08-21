import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

const formatTime = (seconds) => {
    const secsInt = Math.ceil(Math.max(0, seconds));
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;

    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const SESSION_SCOPED_TYPES = [
    'START_SESSION',
    'PAUSE_SESSION',
    'TIMER_RESET',
    'PHASE_SKIP',
    'PHASE_COMPLETE',
    'PHASE_REWIND',
    'TARGET_CYCLES_CHANGE'
];

const MAX_TARGET_CYCLES = 20;

export function usePomodoroSync({
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
}) {
    const syncPomodoroState = useAppStore(state => state.syncPomodoroState);

    useEffect(() => {
        if (!syncChannel) return;

        let isMounted = true;

        const handleMessage = (event) => {
            if (!isMounted) return;
            const data = event.data;
            // ✅ FIX: Validar estrutura da mensagem antes de processar
            if (!data || typeof data !== 'object' || !data.type) return;

            const {
                type,
                tabId,
                taskId,
                sessionInstanceId,
                timeLeft: incomingTime,
                speed: incomingSpeed,
                targetCycles: incomingTarget
            } = data;

            if (tabId === STABLE_TAB_ID) return;

            // ✅ FIX: Validar que o tipo é conhecido
            const KNOWN_TYPES = [
                'START_SESSION', 'PAUSE_SESSION', 'TIMER_RESET',
                'PHASE_SKIP', 'PHASE_COMPLETE', 'PHASE_REWIND',
                'TARGET_CYCLES_CHANGE', 'SPEED_CHANGE', 'TOGGLE_MUTE'
            ];
            if (!KNOWN_TYPES.includes(type)) return;

            if (SESSION_SCOPED_TYPES.includes(type)) {
                const currentTaskId = activeSubjectRef.current?.taskId ?? null;
                const currentSessionId = activeSubjectRef.current?.sessionInstanceId ?? null;

                if (
                    taskId != null &&
                    currentTaskId != null &&
                    taskId !== currentTaskId
                ) {
                    return;
                }

                if (
                    sessionInstanceId != null &&
                    currentSessionId != null &&
                    sessionInstanceId !== currentSessionId
                ) {
                    return;
                }
            }

            switch (type) {
                case 'START_SESSION': {
                    setIsRunning(true);
                    stateRefs.current.isRunning = true;

                    if (Number.isFinite(incomingTime) && incomingTime >= 0) {
                        stateRefs.current.timeLeft = incomingTime;
                        setTimeLeft(incomingTime);
                    }

                    showToast('Protocolo ativo em outra aba 🖥️', 'info');
                    break;
                }

                case 'PAUSE_SESSION': {
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;

                    if (Number.isFinite(incomingTime) && incomingTime >= 0) {
                        setTimeLeft(incomingTime);
                        stateRefs.current.timeLeft = incomingTime;
                    }
                    break;
                }

                case 'SPEED_CHANGE': {
                    const parsedSpeed = Number(incomingSpeed);

                    if ([1, 10, 100].includes(parsedSpeed)) {
                        setSpeed(parsedSpeed);
                        speedRef.current = parsedSpeed;
                    }
                    break;
                }

                case 'TARGET_CYCLES_CHANGE': {
                    if (Number.isFinite(incomingTarget)) {
                        const currentCompleted =
                            useAppStore.getState().appState?.pomodoro?.completedCycles || 0;

                        const safeTarget = Math.min(
                            MAX_TARGET_CYCLES,
                            Math.max(
                                Math.max(1, currentCompleted),
                                Math.round(Number(incomingTarget))
                            )
                        );

                        syncPomodoroState({ targetCycles: safeTarget });
                    }
                    break;
                }

                case 'TIMER_RESET':
                case 'PHASE_SKIP':
                case 'PHASE_COMPLETE':
                case 'PHASE_REWIND': {
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;

                    try {
                        const saved = JSON.parse(localStorage.getItem('pomodoroState')) || {};

                        const targetMode =
                            data.toMode !== undefined
                                ? data.toMode
                                : saved.mode;

                        const targetTime =
                            data.timeLeft !== undefined
                                ? data.timeLeft
                                : saved.timeLeft;

                        const savedTaskMatches =
                            saved &&
                            activeSubjectRef.current?.taskId &&
                            saved.activeTaskId === activeSubjectRef.current.taskId;

                        if (targetMode !== undefined || savedTaskMatches) {
                            const newSessions = data.sessions !== undefined ? data.sessions : saved.sessions;
                            const newCompleted = data.completedCycles !== undefined ? data.completedCycles : saved.completedCycles;
                            const newAccum = data.accumulatedMinutes !== undefined ? data.accumulatedMinutes : saved.accumulatedMinutes;
                            const newTarget = data.targetCycles !== undefined ? data.targetCycles : saved.targetCycles;

                            syncPomodoroState({
                                mode: targetMode,
                                sessions: newSessions,
                                completedCycles: newCompleted,
                                accumulatedMinutes: newAccum,
                                targetCycles: newTarget
                            });

                            if (Number.isFinite(targetTime) && targetTime >= 0) {
                                setTimeLeft(targetTime);
                                stateRefs.current.timeLeft = targetTime;
                            }

                            if (targetMode !== undefined) {
                                stateRefs.current.mode = targetMode;
                            }
                            if (newSessions !== undefined) {
                                stateRefs.current.sessions = newSessions;
                            }
                            if (newCompleted !== undefined) {
                                stateRefs.current.completedCycles = newCompleted;
                            }
                            if (newAccum !== undefined) {
                                stateRefs.current.accumulatedMinutes = newAccum;
                            }
                            if (newTarget !== undefined) {
                                stateRefs.current.targetCycles = newTarget;
                            }

                            if (clockRef.current && Number.isFinite(targetTime)) {
                                clockRef.current.textContent = formatTime(targetTime);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to sync state from localStorage:', error);
                    }

                    break;
                }

                case 'TOGGLE_MUTE': {
                    const muted = Boolean(data.isMuted);

                    setIsMuted(muted);
                    isMutedRef.current = muted;
                    break;
                }

                default:
                    break;
            }
        };

        syncChannel.addEventListener('message', handleMessage);

        return () => {
            isMounted = false;
            syncChannel.removeEventListener('message', handleMessage);
            try {
                syncChannel.close();
            } catch (e) {
                console.warn('[usePomodoroSync] Erro ao fechar BroadcastChannel:', e);
            }
        };
    }, [
        syncChannel,
        showToast,
        syncPomodoroState,
        STABLE_TAB_ID,
        setIsRunning,
        stateRefs,
        setTimeLeft,
        setSpeed,
        speedRef,
        activeSubjectRef,
        clockRef,
        setIsMuted,
        isMutedRef
    ]);
}
