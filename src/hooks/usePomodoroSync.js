import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

const formatTime = (seconds) => {
    const secsInt = Math.ceil(Math.max(0, seconds));
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

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

    // BUG-6 FIX: Removido syncChannel.close() daqui. A responsabilidade de fechar
    // o canal pertence a quem o criou (PomodoroTimer), evitando double-close
    // em cenários de remontagem.

    useEffect(() => {
        if (!syncChannel) return;

        const handleMessage = (event) => {
            const { type, tabId, timeLeft: incomingTime, speed: incomingSpeed, targetCycles: incomingTarget } = event.data || {};

            // Ignorar mensagens da própria aba
            if (tabId === STABLE_TAB_ID) return;

            switch (type) {
                case 'START_SESSION':
                    setIsRunning(true);
                    stateRefs.current.isRunning = true;
                    if (Number.isFinite(incomingTime) && incomingTime >= 0) {
                        // A ref é a fonte de verdade para o RAF loop
                        stateRefs.current.timeLeft = incomingTime;
                        // O React state é apenas para renderização visual
                        setTimeLeft(incomingTime);
                    }
                    showToast('Protocolo ativo em outra aba 🖥️', 'info');
                    break;

                case 'PAUSE_SESSION':
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;
                    if (Number.isFinite(incomingTime) && incomingTime >= 0) {
                        setTimeLeft(incomingTime);
                        stateRefs.current.timeLeft = incomingTime;
                    }
                    break;

                case 'SPEED_CHANGE':
                    if ([1, 10, 100].includes(Number(incomingSpeed))) {
                        setSpeed(Number(incomingSpeed));
                        speedRef.current = Number(incomingSpeed);
                    }
                    break;

                case 'TARGET_CYCLES_CHANGE':
                    if (Number.isFinite(incomingTarget)) {
                        // Pega o estado real atômico no momento em que recebe a msg
                        const currentCompleted = useAppStore.getState().appState?.pomodoro?.completedCycles || 0;
                        syncPomodoroState({ targetCycles: Math.max(Math.max(1, currentCompleted), Math.round(incomingTarget)) });
                    }
                    break;

                case 'TIMER_RESET':
                case 'PHASE_SKIP':
                case 'PHASE_COMPLETE':
                case 'PHASE_REWIND':
                    // Reset/Troca de fase forçada por outra aba
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;

                    // Sincronização Atómica: Carregamos o estado mais recente do Store/LocalStorage
                    // O Store já deve ter sido atualizado pela outra aba (se estiver no mesmo domínio/storage)
                    // mas forçamos a atualização local para garantir consistência visual.
                    try {
                        const saved = JSON.parse(localStorage.getItem('pomodoroState'));
                        if (saved && saved.activeTaskId === activeSubjectRef.current?.taskId) {
                            // Atualizamos o Store local com os dados vindos da outra aba
                            syncPomodoroState({
                                mode: saved.mode,
                                sessions: saved.sessions,
                                completedCycles: saved.completedCycles,
                                accumulatedMinutes: saved.accumulatedMinutes,
                                targetCycles: saved.targetCycles
                            });

                            // Atualizamos as Refs e o Estado Local do Timer
                            if (Number.isFinite(saved.timeLeft) && saved.timeLeft >= 0) {
                                setTimeLeft(saved.timeLeft);
                                stateRefs.current.timeLeft = saved.timeLeft;
                            }
                            if (saved.mode !== undefined) {
                                stateRefs.current.mode = saved.mode;
                            }

                            // Feedback visual instantâneo no relógio
                            if (clockRef.current) {
                                clockRef.current.textContent = formatTime(saved.timeLeft);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to sync state from localStorage:', error);
                    }
                    break;

                case 'TOGGLE_MUTE':
                    setIsMuted(event.data.isMuted);
                    isMutedRef.current = event.data.isMuted;
                    break;
            }
        };

        syncChannel.addEventListener('message', handleMessage);

        return () => {
            syncChannel.removeEventListener('message', handleMessage);
        };
    }, [syncChannel, showToast, syncPomodoroState, STABLE_TAB_ID, setIsRunning, stateRefs, setTimeLeft, setSpeed, speedRef, activeSubjectRef, clockRef, setIsMuted, isMutedRef]);
}
