import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatTime, SPEED_OPTIONS, MAX_TARGET_CYCLES } from '../utils/pomodoroHelpers';

const SESSION_SCOPED_TYPES = [
    'START_SESSION',
    'PAUSE_SESSION',
    'TIMER_RESET',
    'PHASE_SKIP',
    'PHASE_COMPLETE',
    'PHASE_REWIND',
    'TARGET_CYCLES_CHANGE'
];

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
    isMutedRef,
    endsAtRef
}) {
    const syncPomodoroState = useAppStore(state => state.syncPomodoroState);

    useEffect(() => {
        if (!syncChannel || typeof syncChannel.addEventListener !== 'function') return;

        let isMounted = true;

        const handleMessage = (event) => {
            if (!isMounted) return;
            const data = event.data;
            // Validar estrutura da mensagem antes de processar
            if (!data || typeof data !== 'object' || !data.type) return;
            const KNOWN_TYPES = [
                'START_SESSION', 'PAUSE_SESSION', 'TIMER_RESET',
                'PHASE_SKIP', 'PHASE_COMPLETE', 'PHASE_REWIND',
                'TARGET_CYCLES_CHANGE', 'SPEED_CHANGE', 'TOGGLE_MUTE'
            ];
            if (!KNOWN_TYPES.includes(data.type)) return;

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

            if (SESSION_SCOPED_TYPES.includes(type)) {
                const currentTaskId = activeSubjectRef.current?.taskId ?? null;
                const currentSessionId = activeSubjectRef.current?.sessionInstanceId ?? null;

                // Se a mensagem tem taskId E nós temos taskId, devem bater
                if (taskId != null && currentTaskId != null && taskId !== currentTaskId) {
                    return;
                }
                // Se a mensagem tem sessionInstanceId E nós temos, devem bater
                if (sessionInstanceId != null && currentSessionId != null && sessionInstanceId !== currentSessionId) {
                    return;
                }
                // Se a mensagem tem sessionInstanceId mas nós NÃO temos sessão ativa, ignorar
                // EXCETO para START_SESSION, que notifica a aba que o protocolo foi ativado
                if (type !== 'START_SESSION' && sessionInstanceId != null && currentSessionId == null) {
                    return;
                }
            }

            switch (type) {
                case 'START_SESSION': {
                    if (data.speed && SPEED_OPTIONS.includes(Number(data.speed))) {
                        const s = Number(data.speed);
                        setSpeed(s);
                        if (speedRef) speedRef.current = s;
                    }

                    setIsRunning(true);
                    stateRefs.current.isRunning = true;
                    syncPomodoroState({ isRunning: true });

                    if (Number.isFinite(incomingTime) && incomingTime >= 0 && incomingTime <= 24 * 3600) {
                        stateRefs.current.timeLeft = incomingTime;
                        setTimeLeft(incomingTime);
                    }

                    const incomingEndsAt = Number(data.endsAt);
                    if (endsAtRef) {
                        if (Number.isFinite(incomingEndsAt) && incomingEndsAt > Date.now()) {
                            endsAtRef.current = incomingEndsAt;
                        } else if (Number.isFinite(incomingTime) && incomingTime > 0 && incomingTime <= 24 * 3600) {
                            const currentSpeed = speedRef?.current || 1;
                            endsAtRef.current = Date.now() + (incomingTime * 1000) / currentSpeed;
                        }
                        try {
                            if (endsAtRef.current) {
                                localStorage.setItem('pomodoro-endsAt', JSON.stringify({
                                    endsAt: endsAtRef.current,
                                    taskId: activeSubjectRef.current?.taskId || null,
                                    sessionInstanceId: activeSubjectRef.current?.sessionInstanceId || null
                                }));
                            }
                        } catch { /* ignore */ }
                    }

                    showToast('Protocolo ativo em outra aba 🖥️', 'info');
                    break;
                }

                case 'PAUSE_SESSION': {
                    if (endsAtRef) endsAtRef.current = null;
                    try { localStorage.removeItem('pomodoro-endsAt'); } catch { /* ignore */ }
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;
                    syncPomodoroState({ isRunning: false });

                    if (Number.isFinite(incomingTime) && incomingTime >= 0 && incomingTime <= 24 * 3600) {
                        setTimeLeft(incomingTime);
                        stateRefs.current.timeLeft = incomingTime;
                    }
                    break;
                }

                case 'SPEED_CHANGE': {
                    const parsedSpeed = Number(incomingSpeed);

                    if (SPEED_OPTIONS.includes(parsedSpeed)) {
                        setSpeed(parsedSpeed);
                        if (speedRef) speedRef.current = parsedSpeed;

                        if (stateRefs.current?.isRunning) {
                            const currentLeft = Number(stateRefs.current?.timeLeft) || 0;
                            if (endsAtRef) {
                                endsAtRef.current = Date.now() + (currentLeft * 1000) / parsedSpeed;
                                try {
                                    localStorage.setItem('pomodoro-endsAt', JSON.stringify({
                                        endsAt: endsAtRef.current,
                                        taskId: activeSubjectRef.current?.taskId || null,
                                        sessionInstanceId: activeSubjectRef.current?.sessionInstanceId || null
                                    }));
                                } catch { /* ignore */ }
                            }
                        }
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
                    if (endsAtRef) endsAtRef.current = null;
                    try { localStorage.removeItem('pomodoro-endsAt'); } catch { /* ignore */ }
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;

                    try {
                        const raw = localStorage.getItem('pomodoroState');
                        if (!raw) break;
                        const saved = JSON.parse(raw);
                        if (!saved || typeof saved !== 'object') break;

                        const currentTaskId = activeSubjectRef.current?.taskId ?? null;
                        const currentSessionId = activeSubjectRef.current?.sessionInstanceId ?? null;

                        if (
                            saved?.activeTaskId &&
                            currentTaskId &&
                            saved.activeTaskId !== currentTaskId
                        ) {
                            break;
                        }

                        if (
                            saved?.sessionInstanceId &&
                            currentSessionId &&
                            saved.sessionInstanceId !== currentSessionId
                        ) {
                            break;
                        }

                        const targetMode =
                            data.toMode !== undefined && typeof data.toMode === 'string'
                                ? data.toMode
                                : (typeof saved.mode === 'string' ? saved.mode : undefined);

                        const targetTime =
                            data.timeLeft !== undefined && Number.isFinite(data.timeLeft)
                                ? data.timeLeft
                                : (Number.isFinite(saved.timeLeft) ? saved.timeLeft : undefined);

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
                                targetCycles: newTarget,
                                isRunning: false
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
                    if (!isMounted) break;
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
            try {
                syncChannel?.removeEventListener?.('message', handleMessage);
            } catch { /* ignore */ }
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
        isMutedRef,
        endsAtRef
    ]);
}
