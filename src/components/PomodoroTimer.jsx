/**
 * ============================================================================
 * 🛡️ ULTRA-DASHBOARD: CORE POMODORO ENGINE - DO NOT MODIFY 🛡️
 * ============================================================================
 * @ai-warning 
 * THIS FILE CONTAINS A HIGHLY OPTIMIZED, HYBRID STATE MACHINE. 
 * IT MIXES REACT STATE WITH DIRECT DOM MANIPULATION (via Refs) FOR MAXIMUM 
 * PERFORMANCE IN THE requestAnimationFrame LOOP.
 * 
 * CRITICAL RULES FOR FUTURE MODIFICATIONS:
 * 1. NEVER remove or alter `stateRefs.current`. It is required to prevent stale 
 *    closures during rapid UI interactions (Skip/Reset).
 * 2. NEVER change the direct DOM mutations (el.style.width / el.style.height) 
 *    in the animation loop or the `reset` function. React virtual DOM is 
 *    intentionally bypassed for performance.
 * 3. The `reset` function forces a complete DOM sweep (width=0%/100%) to 
 *    prevent the React Virtual DOM from desyncing with the real DOM.
 * ============================================================================
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, Lock, Unlock, AlertCircle, Zap, SkipForward } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'framer-motion';
import { useToast } from '../hooks/useToast';

// 🛠️ [UTIL] Utilitários fora do componente para evitar recriação e melhorar performance
const formatTime = (seconds) => {
    const secsInt = Math.ceil(Math.max(0, seconds));
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const CIRCUMFERENCE = 2 * Math.PI * 110;

// 🛡️ [SHIELD-01] PomodoroErrorBoundary: Impede que erros internos derrubem o Dashboard
class PomodoroErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error, errorInfo) {
        console.error("Critical Pomodoro Failure:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full p-8 bg-red-950/20 border border-red-500/30 rounded-xl flex flex-col items-center gap-4 text-center">
                    <AlertCircle className="text-red-500" size={48} />
                    <h2 className="text-xl font-black text-red-500 uppercase tracking-widest">Protocolo de Emergência Ativado</h2>
                    <p className="text-sm text-red-200/60 max-w-md">O motor do cronómetro encontrou uma instabilidade crítica. Os seus dados foram preservados.</p>
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

function PomodoroTimer({ settings = {}, onSessionComplete, activeSubject, onFullCycleComplete, categories = [], onUpdateStudyTime, onExit, isLayoutLocked, onToggleLock, defaultTargetCycles = 1 }) {

    const safeSettings = useMemo(() => Object.freeze({
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
                saved.activeTaskId === activeSubject.taskId) {
                return saved;
            }
        } catch (_) { }
        return null;
    });

    const getSavedState = (key, defaultValue) => {
        if (savedState && savedState[key] !== undefined) return savedState[key];
        return defaultValue;
    };

    // Estados Globais (Zustand)
    const mode = useAppStore(state => state.appState?.pomodoro?.mode || 'work');
    const sessions = useAppStore(state => state.appState?.pomodoro?.sessions || 1);
    const targetCycles = useAppStore(state => state.appState?.pomodoro?.targetCycles || 1);
    const setTargetCycles = useAppStore(state => state.setPomodoroTargetCycles);
    const completedCycles = useAppStore(state => state.appState?.pomodoro?.completedCycles || 0);
    const accumulatedMinutes = useAppStore(state => state.appState?.pomodoro?.accumulatedMinutes || 0);
    const setAccumulatedMinutes = useAppStore(state => state.setPomodoroAccumulatedMinutes);
    const completePomodoroPhase = useAppStore(state => state.completePomodoroPhase);
    const rewindPomodoroPhase = useAppStore(state => state.rewindPomodoroPhase);
    const syncPomodoroState = useAppStore(state => state.syncPomodoroState);

    // Estados Locais
    const initialTime = mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (safeSettings.pomodoroBreak || 5) * 60;
    const [timeLeft, setTimeLeft] = useState(() => getSavedState('timeLeft', initialTime));
    const [isRunning, setIsRunning] = useState(() => getSavedState('isRunning', false));
    const [speed, setSpeed] = useState(1);

    // Refs de Controle e Performance
    const stateRefs = useRef({
        mode,
        timeLeft,
        isRunning,
        sessions,
        targetCycles,
        completedCycles,
        accumulatedMinutes
    });

    // 🛡️ [SHIELD-REF] Sincronização Imediata: Atualizamos as refs no corpo da renderização
    // Isso garante que skips/pauses disparados logo após um render usem valores 100% atuais.
    // BUG-04 FIX: Include timeLeft in body-sync to prevent stale refs during pauses
    stateRefs.current = {
        ...stateRefs.current,
        mode, timeLeft, isRunning, sessions, targetCycles, completedCycles, accumulatedMinutes
    };

    const speedRef = useRef(1);
    useEffect(() => {
        speedRef.current = speed;
        // Broadcast speed change to other tabs
        try {
            syncChannelRef.current?.postMessage({
                type: 'SPEED_CHANGE',
                speed,
                tabId: window.name
            });
        } catch (_) { }
    }, [speed]);

    const transitionTimeoutRef = useRef(null);
    const isTransitioningRef = useRef(false);
    const clockRef = useRef(null);
    const svgCircleRef = useRef(null);
    const alarmAudioRef = useRef(null);
    const syncChannelRef = useRef(null);
    const workFillsRef = useRef([]);
    const breakBallsRef = useRef([]);
    const showToast = useToast();

    // 🟢 CÓDIGO NOVO 1: Controlo de Montagem para evitar Race Conditions
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // 🛡️ [SHIELD-02] Prop Safety Wrappers
    const safeOnUpdateStudyTime = useCallback((...args) => {
        if (typeof onUpdateStudyTime === 'function' && isMountedRef.current) {
            try { onUpdateStudyTime(...args); } catch (e) { console.error('[Shield] Callback Error (onUpdateStudyTime):', e); }
        }
    }, [onUpdateStudyTime]);

    const safeOnFullCycleComplete = useCallback((...args) => {
        if (typeof onFullCycleComplete === 'function' && isMountedRef.current) {
            try { onFullCycleComplete(...args); } catch (e) { console.error('[Shield] Callback Error (onFullCycleComplete):', e); }
        }
    }, [onFullCycleComplete]);

    const safeOnExit = useCallback((...args) => {
        if (typeof onExit === 'function' && isMountedRef.current) {
            try { onExit(...args); } catch (e) { console.error('[Shield] Callback Error (onExit):', e); }
        }
    }, [onExit]);

    // 🛡️ [SHIELD-07] Prevenção de Fuga de Tempo (Time Leak) ao trocar de Tarefa
    const prevTaskStateRef = useRef({ subject: activeSubject, accum: 0, time: initialTime, mode: mode });

    useEffect(() => {
        const prev = prevTaskStateRef.current;
        // Se a tarefa mudou, injetamos imediatamente os minutos pendentes da tarefa antiga no banco de dados
        if (prev.subject && activeSubject?.taskId !== prev.subject.taskId) {
            let lostMinutes = prev.accum;
            if (prev.mode === 'work') {
                const totalWorkSeconds = safeSettings.pomodoroWork * 60;
                lostMinutes += Math.round(Math.max(0, totalWorkSeconds - prev.time) / 60);
            }
            if (lostMinutes > 0) {
                safeOnUpdateStudyTime(prev.subject.categoryId, lostMinutes, prev.subject.taskId);
            }
        }
        prevTaskStateRef.current = { subject: activeSubject, accum: accumulatedMinutes, time: timeLeft, mode };
    }, [activeSubject, accumulatedMinutes, timeLeft, mode, safeSettings.pomodoroWork, safeOnUpdateStudyTime]);

    // 🛡️ [SHIELD-04] Sincronização de Estado Local com o Store
    // Garante que o cronómetro reseta quando mudamos de tarefa ou modo via Sidebar/Store
    useEffect(() => {
        if (!isTransitioningRef.current) {
            const newTotalTime = mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (safeSettings.pomodoroBreak || 5) * 60;

            // Só resetamos se não estiver a correr ou se a tarefa mudou completamente
            const taskChanged = activeSubject?.taskId !== stateRefs.current.lastTaskId;
            if (!stateRefs.current.isRunning || taskChanged) {
                setTimeLeft(newTotalTime);
                stateRefs.current.timeLeft = newTotalTime;
                stateRefs.current.lastTaskId = activeSubject?.taskId;

                if (clockRef.current) {
                    const mins = Math.floor(newTotalTime / 60);
                    const secs = newTotalTime % 60;
                    clockRef.current.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                }
                if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);
            }
        }
    }, [activeSubject?.taskId, mode, safeSettings.pomodoroWork, safeSettings.pomodoroBreak]);


    // 🟢 CÓDIGO NOVO 2: Garbage Collector Manual para as Refs dos Ciclos (B-09 FIX)
    useEffect(() => {
        if (workFillsRef.current.length > targetCycles) {
            for (let i = targetCycles; i < workFillsRef.current.length; i++) {
                workFillsRef.current[i] = null; // Nulifica para liberar memória
            }
            workFillsRef.current = workFillsRef.current.slice(0, targetCycles);
        }
        if (breakBallsRef.current.length > targetCycles) {
            for (let i = targetCycles; i < breakBallsRef.current.length; i++) {
                breakBallsRef.current[i] = null;
            }
            breakBallsRef.current = breakBallsRef.current.slice(0, targetCycles);
        }
    }, [targetCycles]);

    const [uiPosition, setUiPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroPosition');
            return saved !== null ? JSON.parse(saved) : { x: 0, y: 0 };
        } catch (_) {
            console.warn('[Shield] Failed to load UI position');
            return { x: 0, y: 0 };
        }
    });

    // 🛡️ [SHIELD-04] Persistência de UI
    useEffect(() => {
        try { localStorage.setItem('pomodoroLayoutLocked', JSON.stringify(isLayoutLocked)); } catch (_) { }
    }, [isLayoutLocked]);

    useEffect(() => {
        try { localStorage.setItem('pomodoroPosition', JSON.stringify(uiPosition)); } catch (_) { }
    }, [uiPosition]);


    // Sincronização Multi-Aba Robusta (Protocolo V2)
    useEffect(() => {
        try {
            syncChannelRef.current = new BroadcastChannel('pomodoro_sync');
            syncChannelRef.current.onmessage = (event) => {
                const { type, tabId, toMode, timeLeft: incomingTime, speed: incomingSpeed, targetCycles: incomingTarget, sessions: incomingSessions } = event.data || {};

                // Ignorar mensagens da própria aba ou se o tabId não coincidir (se estivéssemos a filtrar por isso)
                if (tabId === window.name) return;

                switch (type) {
                    case 'START_SESSION':
                        setIsRunning(true);
                        stateRefs.current.isRunning = true;
                        if (incomingTime !== undefined) {
                            setTimeLeft(incomingTime);
                            stateRefs.current.timeLeft = incomingTime;
                        }
                        showToast('Protocolo ativo em outra aba 🖥️', 'info');
                        break;

                    case 'PAUSE_SESSION':
                        setIsRunning(false);
                        stateRefs.current.isRunning = false;
                        if (incomingTime !== undefined) {
                            setTimeLeft(incomingTime);
                            stateRefs.current.timeLeft = incomingTime;
                        }
                        break;

                    case 'SPEED_CHANGE':
                        if (incomingSpeed !== undefined) {
                            setSpeed(incomingSpeed);
                            speedRef.current = incomingSpeed;
                        }
                        break;

                    case 'TARGET_CYCLES_CHANGE':
                        if (incomingTarget !== undefined) {
                            syncPomodoroState({ targetCycles: incomingTarget });
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
                            if (saved && saved.activeTaskId === activeSubject?.taskId) {
                                // Atualizamos o Store local com os dados vindos da outra aba
                                syncPomodoroState({
                                    mode: saved.mode,
                                    sessions: saved.sessions,
                                    completedCycles: saved.completedCycles,
                                    accumulatedMinutes: saved.accumulatedMinutes,
                                    targetCycles: saved.targetCycles
                                });

                                // Atualizamos as Refs e o Estado Local do Timer
                                if (saved.timeLeft !== undefined) {
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
                        } catch (_) { }
                        break;
                }
            };
        } catch (e) {
            console.warn('[Pomodoro] BroadcastChannel not supported:', e);
        }
        return () => {
            try { syncChannelRef.current?.close(); } catch (_) { }
        };
    }, [showToast, syncPomodoroState]);

    // Fallback de segurança: O storage event é opcional quando o BroadcastChannel está ativo, 
    // mas pode ser útil se o utilizador abrir o dashboard num navegador muito antigo.
    // No entanto, para evitar duplicação de eventos, mantemos apenas o canal principal.

    // B-05 FIX: Cleanup do áudio para evitar memory leak
    useEffect(() => {
        try { alarmAudioRef.current = new Audio('/sounds/alarm.wav'); } catch (_) { }
        return () => {
            if (alarmAudioRef.current) {
                try {
                    alarmAudioRef.current.pause();
                    alarmAudioRef.current.src = '';
                } catch (_) { }
                alarmAudioRef.current = null;
            }
        };
    }, []);

    const savePomodoroState = useCallback((overrides = {}) => {
        if (!activeSubject?.taskId) return;
        try {
            const current = stateRefs.current;
            const stateToSave = {
                activeTaskId: activeSubject.taskId,
                mode: current.mode,
                timeLeft: current.timeLeft,
                isRunning: current.isRunning,
                sessions: current.sessions,
                // B-03 FIX: Salvar targetCycles para não resetar no reload
                targetCycles: current.targetCycles,
                completedCycles: current.completedCycles,
                accumulatedMinutes: current.accumulatedMinutes,
                savedAt: Date.now(),
                ...overrides
            };
            localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
        } catch (e) { }
    }, [activeSubject]);

    useEffect(() => {
        return () => {
            if (stateRefs.current.isRunning) {
                savePomodoroState({ isRunning: false });
            }
        };
    }, [savePomodoroState]);

    const transitionSession = useCallback((completedMode, source = 'natural') => {
        if (isTransitioningRef.current) return;
        isTransitioningRef.current = true;

        setIsRunning(false);
        stateRefs.current.isRunning = false;

        const isManual = source !== 'natural';

        if (source === 'natural' && safeSettings.soundEnabled) {
            try { alarmAudioRef.current?.play().catch(() => { }); } catch (_) { }
        }

        const currentSessions = stateRefs.current.sessions;
        const currentTarget = stateRefs.current.targetCycles;
        const isEndingCycle = source === 'natural' && currentSessions >= currentTarget && stateRefs.current.mode === 'work';

        let sessionMinutes = 0;
        if (completedMode === 'work') {
            if (!isManual) {
                sessionMinutes = (safeSettings.pomodoroWork || 25);
            } else if (source === 'skip') {
                // BUG-08 FIX: Use Math.round directly instead of confusing +0.5 bias with floor
                const totalWorkSeconds = safeSettings.pomodoroWork * 60;
                sessionMinutes = Math.round(Math.max(0, totalWorkSeconds - stateRefs.current.timeLeft) / 60);
            }
        }

        const finalMinutes = stateRefs.current.accumulatedMinutes + sessionMinutes;

        if (isEndingCycle && activeSubject) {
            safeOnUpdateStudyTime(activeSubject.categoryId, finalMinutes, activeSubject.taskId);
        }

        setTimeout(() => {
            // 🟢 CÓDIGO NOVO 3: Proteção contra desmontagem súbita (Race Condition Fix)
            if (!isMountedRef.current || !clockRef.current) {
                isTransitioningRef.current = false;
                return; // Aborta a atualização visual se o componente já não existe
            }

            // Passamos os minutos trabalhados para o Store persistir
            completePomodoroPhase(isManual, sessionMinutes);

            const newState = useAppStore.getState().appState.pomodoro;
            const resetTime = newState.mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;

            setTimeLeft(resetTime);
            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = newState.mode;

            if (clockRef.current) {
                const mins = Math.floor(resetTime / 60);
                const secs = resetTime % 60;
                clockRef.current.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
            if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);

            savePomodoroState({ isRunning: false, timeLeft: resetTime, mode: newState.mode });

            try {
                syncChannelRef.current?.postMessage({ type: isManual ? 'PHASE_SKIP' : 'PHASE_COMPLETE', toMode: newState.mode, tabId: window.name });
            } catch (_) { }

            isTransitioningRef.current = false;
            
            if (isEndingCycle) {
                // B-08 FIX: Passar flag de conclusão natural
                safeOnFullCycleComplete(finalMinutes, source === 'natural');
            }
        }, 50);
    }, [safeSettings, completePomodoroPhase, savePomodoroState, safeOnUpdateStudyTime, activeSubject, safeOnFullCycleComplete]);

    // Motor de Animação Blindado e Otimizado
    // O loop só roda quando isRunning é true, poupando CPU/GPU significativamente.
    useEffect(() => {
        if (!isRunning) return;

        let rafId;
        let lastTickTime = performance.now();

        const tick = (now) => {
            const deltaMs = now - lastTickTime;
            lastTickTime = now;

            if (stateRefs.current.isRunning && stateRefs.current.timeLeft > 0) {
                const currentTotalTime = stateRefs.current.mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (safeSettings.pomodoroBreak || 5) * 60;

                const deltaSeconds = (deltaMs / 1000) * (speedRef.current || 1);
                const newTime = Math.max(0, stateRefs.current.timeLeft - deltaSeconds);
                stateRefs.current.timeLeft = newTime;

                const fraction = newTime / (currentTotalTime || 1);
                const displaySecond = Math.ceil(newTime);

                if (clockRef.current) {
                    const mins = Math.floor(displaySecond / 60);
                    const secs = displaySecond % 60;
                    const timeString = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
                    if (clockRef.current.textContent !== timeString) {
                        clockRef.current.textContent = timeString;
                    }
                }

                if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE * fraction;

                const s = stateRefs.current.sessions;
                // BUG-13 FIX: Guard both refs — breakBallsRef[last] doesn't exist for the final cycle
                if (stateRefs.current.mode === 'work') {
                    const workEl = workFillsRef.current[s - 1];
                    if (workEl) workEl.style.width = `${Math.min(100, (1 - fraction) * 100)}%`;
                } else {
                    const breakEl = breakBallsRef.current[s - 1];
                    if (breakEl) breakEl.style.height = `${Math.min(100, (1 - fraction) * 100)}%`;
                }

                if (newTime <= 0) {
                    transitionSession(stateRefs.current.mode, 'natural');
                } else {
                    rafId = requestAnimationFrame(tick);
                }
            }
        };
        rafId = requestAnimationFrame(tick);
        return () => { if (rafId) cancelAnimationFrame(rafId); };
    }, [isRunning, safeSettings, transitionSession]);

    const reset = () => {
        if (isTransitioningRef.current) return;
        if (alarmAudioRef.current) { try { alarmAudioRef.current.pause(); alarmAudioRef.current.currentTime = 0; } catch (_) { } }

        const currentMode = stateRefs.current.mode;
        const currentSessions = stateRefs.current.sessions;
        const currentTimeLeft = stateRefs.current.timeLeft;
        const currentTotalTime = currentMode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;

        // SE O TEMPO JÁ ESTIVER CHEIO: Volta de fase
        if (currentTimeLeft >= currentTotalTime - 0.5) {
            showToast('Voltando fase...', 'info');

            // Retrocesso no estado global
            rewindPomodoroPhase();

            const newState = useAppStore.getState().appState.pomodoro;
            const resetTime = newState.mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;

            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = newState.mode;
            stateRefs.current.isRunning = false;

            setIsRunning(false);
            setTimeLeft(resetTime);

            // Limpeza visual de todas as fases futuras para garantir sincronia
            workFillsRef.current.forEach((el, i) => {
                if (el) el.style.width = (i < newState.sessions - 1 || (i === newState.sessions - 1 && newState.mode === 'break')) ? '100%' : '0%';
            });
            breakBallsRef.current.forEach((el, i) => {
                if (el) el.style.height = (i < newState.sessions - 1) ? '100%' : '0%';
            });

            if (clockRef.current) clockRef.current.textContent = formatTime(resetTime);
            if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);

            savePomodoroState({ isRunning: false, timeLeft: resetTime, mode: newState.mode });
            try { syncChannelRef.current?.postMessage({ type: 'PHASE_REWIND', toMode: newState.mode, tabId: window.name }); } catch (_) { }

        } else {
            // SE O TEMPO ESTAVA CORRENDO: Apenas reinicia o tempo da sessão atual!
            showToast('Cronômetro reiniciado', 'info');

            // Limpeza visual imediata apenas da fase atual
            if (currentMode === 'work') {
                if (workFillsRef.current[currentSessions - 1]) workFillsRef.current[currentSessions - 1].style.width = '0%';
            } else {
                if (breakBallsRef.current[currentSessions - 1]) breakBallsRef.current[currentSessions - 1].style.height = '0%';
            }

            stateRefs.current.timeLeft = currentTotalTime;
            stateRefs.current.isRunning = false;

            setIsRunning(false);
            setTimeLeft(currentTotalTime);

            if (clockRef.current) clockRef.current.textContent = formatTime(currentTotalTime);
            if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);

            savePomodoroState({ isRunning: false, timeLeft: currentTotalTime });
            try { syncChannelRef.current?.postMessage({ type: 'TIMER_RESET', tabId: window.name }); } catch (_) { }
        }
    };

    const skip = () => {
        if (isTransitioningRef.current) return;
        if (alarmAudioRef.current) { try { alarmAudioRef.current.pause(); alarmAudioRef.current.currentTime = 0; } catch (_) { } }
        
        // B-10 FIX: Usar refs para evitar estado "stale" do React durante skip
        const s = stateRefs.current.sessions;
        const currentMode = stateRefs.current.mode;

        if (currentMode === 'work') {
            if (workFillsRef.current[s - 1]) workFillsRef.current[s - 1].style.width = '100%';
        } else {
            if (breakBallsRef.current[s - 1]) breakBallsRef.current[s - 1].style.height = '100%';
        }

        transitionSession(currentMode, 'skip');
    };

    const handleManualExit = () => {
        const current = stateRefs.current;
        let finalMinutes = current.accumulatedMinutes;
        if (current.mode === 'work') {
            const totalWorkSeconds = safeSettings.pomodoroWork * 60;
            finalMinutes += Math.round(Math.max(0, totalWorkSeconds - current.timeLeft) / 60);
        }
        if (finalMinutes > 0 && activeSubject) {
            safeOnUpdateStudyTime(activeSubject.categoryId, finalMinutes, activeSubject.taskId);
        }
        setAccumulatedMinutes(0);
        safeOnExit();
        // B-11 FIX: Remover localStorage por último para evitar race condition na persistência
        setTimeout(() => {
            try { localStorage.removeItem('pomodoroState'); } catch (_) { }
        }, 100);
    };

    const totalTime = mode === 'work' ? safeSettings.pomodoroWork * 60 : safeSettings.pomodoroBreak * 60;

    return (
        <div className="w-full relative min-h-[80vh] flex flex-col items-center">
            <div
                className={`w-full max-w-[min(95vw,600px)] space-y-12 relative flex flex-col items-center mx-auto ${!isLayoutLocked ? 'z-[90]' : 'z-50'}`}
            >
                <div className="relative flex items-center justify-center py-2 w-full px-4">
                    <div className="flex-1 flex justify-center bg-transparent">
                        {mode === 'break' ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative flex items-center justify-center gap-4 w-full bg-emerald-900/40 border border-emerald-500/30 rounded-xl py-6 shadow-[0_20px_50px_rgba(16,185,129,0.1)]"
                            >
                                <Zap size={24} className="text-emerald-400 animate-pulse" />
                                <span className="text-xl font-black text-emerald-400 tracking-widest uppercase">Recuperação Neural ☕</span>
                            </motion.div>
                        ) : !activeSubject ? (
                            <div onClick={handleManualExit} className="w-full bg-red-950/20 border border-dashed border-red-500/30 rounded-xl py-4 flex items-center justify-center gap-4 cursor-pointer hover:bg-red-900/40">
                                <AlertCircle size={20} className="text-red-500" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-red-500/60 uppercase">Protocolo Inativo</span>
                                    <h2 className="text-sm font-black text-red-500 uppercase tracking-widest">Selecione uma missão neural</h2>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                <div
                    style={{ backgroundImage: 'url(/wood-texture.png)', backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)' }}
                    className="w-full border-[6px] border-[#3f2e26] pt-24 pb-16 px-6 sm:px-10 rounded-2xl relative overflow-hidden flex flex-col items-center bg-[#2a1f1a] shadow-2xl z-10"
                >
                    <div className="absolute top-4 right-6 z-[60]">
                        <div className="flex bg-[#1a1411] p-1.5 rounded-xl border border-[#3f2e26] shadow-2xl backdrop-blur-md">
                            {[1, 10, 100].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSpeed(s)}
                                    className={`w-12 h-9 rounded-lg text-[11px] font-black transition-all ${speed === s ? 'bg-[#b08e6b] text-[#2d1a12] shadow-[0_0_15px_rgba(176,142,107,0.4)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                >
                                    {s}X
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-6 mb-12 z-30">
                        <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${mode === 'work' ? 'text-white' : 'text-white/40'}`}>FOCO</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${mode === 'break' ? 'text-white' : 'text-white/40'}`}>PAUSA</span>
                    </div>

                    <div className="relative mt-12 mb-8 rounded-full">
                        <svg className="w-64 h-64 transform -rotate-90 relative z-10">
                            <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" strokeLinecap="round" />
                            <defs>
                                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={mode === 'work' ? '#3b82f6' : '#22c55e'} />
                                    <stop offset="100%" stopColor={mode === 'work' ? '#2563eb' : '#10b981'} />
                                </linearGradient>
                            </defs>
                            <circle
                                ref={svgCircleRef}
                                cx="128" cy="128" r="110" fill="none"
                                stroke="url(#timerGradient)"
                                strokeWidth="14"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 110}
                                style={{ strokeDashoffset: isRunning ? undefined : (2 * Math.PI * 110) * (timeLeft / (totalTime || 1)) }}
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <span ref={clockRef} className="text-7xl font-black tracking-tight text-white drop-shadow-2xl">{formatTime(timeLeft)}</span>
                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white mt-2">
                                {isRunning ? (mode === 'work' ? 'PROTOCOL Foco' : 'Recuperação') : 'SESSÃO PAUSADA'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap sm:grid sm:grid-cols-3 items-center justify-center gap-4 z-10 mt-10 w-full max-w-2xl px-6">
                        <div className="flex flex-col items-center gap-3">
                            <button onClick={reset} className="w-16 h-16 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/5 text-white flex items-center justify-center shadow-lg"><RotateCcw size={24} /></button>
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">VOLTAR</span>
                        </div>

                        <div className="flex flex-col items-center justify-center">
                            <button
                                onClick={() => {
                                    if (mode === 'work' && !activeSubject) return;

                                    if (alarmAudioRef.current && alarmAudioRef.current.paused && alarmAudioRef.current.currentTime === 0) {
                                        alarmAudioRef.current.volume = 0;
                                        alarmAudioRef.current.play().then(() => {
                                            alarmAudioRef.current.pause();
                                            alarmAudioRef.current.currentTime = 0;
                                            alarmAudioRef.current.volume = 1;
                                        }).catch(() => { });
                                    }

                                    const next = !isRunning;
                                    stateRefs.current.isRunning = next;
                                    setIsRunning(next);
                                    try {
                                        syncChannelRef.current?.postMessage({
                                            type: next ? 'START_SESSION' : 'PAUSE_SESSION',
                                            timeLeft: stateRefs.current.timeLeft,
                                            tabId: window.name
                                        });
                                    } catch (_) { }
                                }}
                                className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center border-4 transition-colors ${isRunning ? 'bg-stone-100 text-black border-white' : 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_40px_rgba(34,197,94,0.3)]'}`}
                            >
                                {isRunning ? <Pause size={48} className="sm:size-64" /> : <Play size={48} className="sm:size-64 ml-2" />}
                            </button>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <button onClick={skip} className="w-16 h-16 rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/5 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"><SkipForward size={24} /></button>
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">PULAR</span>
                        </div>
                    </div>
                </div>

                <div className="w-full px-10 py-8 rounded-xl bg-[#b08e6b] border-2 border-[#94785a] shadow-xl">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[9px] font-black text-[#2d1a12]/60 uppercase tracking-[0.3em]">PROGRESSO DOS CICLOS</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3 bg-white/10 p-1 rounded-lg">
                                    <div className="flex items-center gap-1 px-1">
                                        <button onClick={() => {
                                            const current = stateRefs.current;
                                            const newTarget = Math.max(current.completedCycles < 1 ? 1 : current.completedCycles, current.targetCycles - 1);
                                            setTargetCycles(newTarget);
                                            try { syncChannelRef.current?.postMessage({ type: 'TARGET_CYCLES_CHANGE', targetCycles: newTarget, tabId: window.name }); } catch (_) { }
                                        }} disabled={!activeSubject || targetCycles <= 1} className="w-6 h-6 rounded bg-white/10 text-[#2d1a12] font-bold text-xs">-</button>
                                        <button onClick={() => {
                                            const newTarget = targetCycles + 1;
                                            setTargetCycles(newTarget);
                                            try { syncChannelRef.current?.postMessage({ type: 'TARGET_CYCLES_CHANGE', targetCycles: newTarget, tabId: window.name }); } catch (_) { }
                                        }} disabled={!activeSubject} className="w-6 h-6 rounded bg-white/10 text-[#2d1a12] font-bold text-xs">+</button>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-[#2d1a12] tabular-nums">{completedCycles}</span>
                                    <span className="text-sm font-black text-[#2d1a12]/40">/ {targetCycles}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-1 items-center gap-1.5 h-16 px-4">
                            {Array.from({ length: targetCycles || 1 }).map((_, i) => (
                                <React.Fragment key={i}>
                                    <div className="flex-1 relative">
                                        <div className="bg-[#2d1a12]/10 h-3 rounded-full overflow-hidden">
                                            <div
                                                ref={el => workFillsRef.current[i] = el}
                                                className="h-full bg-blue-500 will-change-[width]"
                                                style={{
                                                    width: (i < sessions - 1 || (i === sessions - 1 && mode === 'break')) ? '100%' :
                                                        (i === sessions - 1 && mode === 'work') ?
                                                            (isTransitioningRef.current ? '100%' : `${(1 - Math.max(0, timeLeft) / (totalTime || 1)) * 100}%`)
                                                            : '0%',
                                                    transition: isRunning ? 'none' : 'width 0.3s ease'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {i < (targetCycles || 1) - 1 && (
                                        <div className="relative w-6 h-6 rounded-full bg-[#2d1a12]/10 border-2 border-[#2d1a12]/20 overflow-hidden shrink-0">
                                            <div
                                                ref={el => breakBallsRef.current[i] = el}
                                                className="absolute bottom-0 w-full bg-emerald-500 will-change-[height]"
                                                style={{
                                                    height: (i < sessions - 1) ? '100%' :
                                                        (sessions === i + 1 && mode === 'break') ?
                                                            (isTransitioningRef.current ? '100%' : `${(1 - Math.max(0, timeLeft) / (totalTime || 1)) * 100}%`)
                                                            : '0%',
                                                    transition: isRunning ? 'none' : 'height 0.3s ease'
                                                }}
                                            />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 🛡️ [SHIELD-06] Final Blindagem Auditada
export default function ProtectedPomodoro(props) {
    return (
        <PomodoroErrorBoundary>
            <PomodoroTimer {...props} />
        </PomodoroErrorBoundary>
    );
}
