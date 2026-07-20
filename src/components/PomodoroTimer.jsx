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
import { Play, Pause, RotateCcw, Lock, Unlock, AlertCircle, Zap, SkipForward, VolumeX, Volume2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { motion as Motion } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { usePomodoroSync } from '../hooks/usePomodoroSync';
import { PomodoroProgress } from './pomodoro/PomodoroProgress';
import { PomodoroControls } from './pomodoro/PomodoroControls';
import { PomodoroHeader } from './pomodoro/PomodoroHeader';
import { PomodoroClock } from './pomodoro/PomodoroClock';

// 🛠️ [UTIL] Utilitários fora do componente para evitar recriação e melhorar performance
// 🛡️ [FIX-TABID] window.name é "" por padrão em todas as abas, fazendo com que
// "tabId === window.name" bloqueie TODAS as mensagens recebidas de outras abas.
// Usamos um ID único por sessão de módulo para distinguir abas corretamente.
const STABLE_TAB_ID = `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

// M5/M6 FIX: Função pura extraída para nível de módulo — evita recriação a cada render
// e remove o risco de closure obsoleta na dep de useMemo.
function toPositiveMinutes(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(240, Math.max(1, Math.round(n)));
}

function PomodoroTimer({ settings = {}, activeSubject, onFullCycleComplete, onUpdateStudyTime, onExit, isLayoutLocked, onSessionComplete }) {
 
    const safeSettings = useMemo(() => Object.freeze({
        ...settings,
        pomodoroWork: toPositiveMinutes(settings?.pomodoroWork, 25),
        pomodoroBreak: toPositiveMinutes(settings?.pomodoroBreak, 5),
        pomodoroLongBreak: toPositiveMinutes(settings?.pomodoroLongBreak, 15),
        soundEnabled: settings?.soundEnabled ?? true
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
        } catch (error) {
            console.error('Failed to parse pomodoroState:', error);
        }
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
    const completePomodoroPhase = useAppStore(state => state.completePomodoroPhase);
    const rewindPomodoroPhase = useAppStore(state => state.rewindPomodoroPhase);

    // Estados Locais
    const initialTime = mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (mode === 'long_break' ? (safeSettings.pomodoroLongBreak || 15) * 60 : (safeSettings.pomodoroBreak || 5) * 60);
    const [timeLeft, setTimeLeft] = useState(() => getSavedState('timeLeft', initialTime));
    const [isRunning, setIsRunning] = useState(() => getSavedState('isRunning', false));
    const [speed, setSpeed] = useState(() => getSavedState('speed', 1));
    const [isMuted, setIsMuted] = useState(() => {
        try {
            return localStorage.getItem('pomodoro_muted') === 'true';
        } catch { return false; }
    });
    const isMutedRef = useRef(isMuted); // NOVA REF

    const toggleMute = () => {
        setIsMuted(prev => {
            const newVal = !prev;
            isMutedRef.current = newVal; // Atualiza a Ref síncronamente
            try { 
                localStorage.setItem('pomodoro_muted', String(newVal)); 
                syncChannel?.postMessage({ type: 'TOGGLE_MUTE', isMuted: newVal, tabId: STABLE_TAB_ID });
            } catch (error) {
                console.error('Failed to set pomodoro_muted:', error);
            }
            return newVal;
        });
    };

    // Referência antiga de onIsRunningChange removida para evitar overhead desnecessário

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

    // 🛡️ [SHIELD-REF] Sincronização Imediata: Atualizamos as refs via Effect
    // Isso garante que skips/pauses disparados por eventos (que ocorrem após o render) usem valores 100% atuais.
    useEffect(() => {
        stateRefs.current = {
            ...stateRefs.current,
            mode, isRunning, sessions, targetCycles, completedCycles, accumulatedMinutes
        };
        // CORREÇÃO: Removido o bloco "if (!isRunning) { stateRefs.current.timeLeft = timeLeft; }".
        // A Ref (stateRefs) é a fonte de verdade absoluta e de alta precisão. O React State (timeLeft)
        // é visual e desfasado, JAMAIS deve sobrescrever a Ref sob o risco de Time Leaks.
    }, [mode, isRunning, sessions, targetCycles, completedCycles, accumulatedMinutes]);


    const [syncChannel] = useState(() => typeof window !== 'undefined' ? new BroadcastChannel('pomodoro_sync') : null);
    // BUG-6 FIX: Cleanup do BroadcastChannel no criador (ownership correto)
    useEffect(() => {
        return () => {
            try { syncChannel?.close(); } catch { /* já fechado */ }
        };
    }, [syncChannel]);
    const speedRef = useRef(1);
    useEffect(() => {
        speedRef.current = speed;
        // Broadcast speed change to other tabs
        try {
            syncChannel?.postMessage({
                type: 'SPEED_CHANGE',
                speed,
                tabId: STABLE_TAB_ID
            });
        } catch (error) {
            console.error('Failed to post SPEED_CHANGE message:', error);
        }
    }, [speed, syncChannel]);


    const transitionTimeoutRef = useRef(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    // BUG-10 FIX: Ref para evitar closure stale no guard do transitionSession
    const isTransitioningRef = useRef(false);
    const clockRef = useRef(null);
    const svgCircleRef = useRef(null);
    const alarmAudioRef = useRef(null);
    const workFillsRef = useRef([]);
    const breakBallsRef = useRef([]);

    useEffect(() => {
        return () => {
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
                transitionTimeoutRef.current = null;
            }
            setIsTransitioning(false);
        };
    }, []);
    const showToast = useToast();

    // 🟢 CÓDIGO NOVO 1: Controlo de Montagem para evitar Race Conditions
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // 🛡️ [FIX-MEMORYLEAK] Trunca explicitamente os arrays de referências para evitar acúmulo de nós mortos
    useEffect(() => {
        if (workFillsRef.current) {
            workFillsRef.current = workFillsRef.current.slice(0, targetCycles || 1);
        }
        if (breakBallsRef.current) {
            breakBallsRef.current = breakBallsRef.current.slice(0, (targetCycles || 1) - 1);
        }
    }, [targetCycles]);

    // 🛡️ [FIX-STALE-SUBJECT] Ref para evitar closure stale do activeSubject no handler do BroadcastChannel
    const activeSubjectRef = useRef(activeSubject);
    useEffect(() => { activeSubjectRef.current = activeSubject; }, [activeSubject]);

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
        // Se a tarefa mudou, injetamos imediatamente os minutos pendentes da tarefa antiga
        if (prev.subject && activeSubject?.taskId !== prev.subject.taskId) {
            let lostMinutes = prev.accum;
            if (prev.mode === 'work') {
                const totalWorkSeconds = safeSettings.pomodoroWork * 60;
                // CORREÇÃO: Prevenir a aniquilação do histórico do utilizador com NaN Posioning
                const safePrevTime = Number.isFinite(Number(prev.time)) ? Number(prev.time) : totalWorkSeconds;
                lostMinutes += Number((Math.max(0, totalWorkSeconds - safePrevTime) / 60).toFixed(2));
            }
            if (lostMinutes > 0 && !Number.isNaN(lostMinutes)) {
                safeOnUpdateStudyTime(prev.subject.categoryId, lostMinutes, prev.subject.taskId);
            }
        }
        // 🛡️ [FIX-SHIELD-07] Usa stateRefs.current.timeLeft (sempre atual no RAF loop)
        // em vez de timeLeft (React state), que pode ficar centenas de segundos atrasado
        // enquanto o timer está rodando, causando cálculo errado de minutos perdidos.
        prevTaskStateRef.current = { subject: activeSubject, accum: accumulatedMinutes, time: stateRefs.current.timeLeft, mode };
    }, [activeSubject, accumulatedMinutes, mode, safeSettings.pomodoroWork, safeOnUpdateStudyTime]);

    // 🛡️ [SHIELD-04] Sincronização de Estado Local com o Store
    // Garante que o cronómetro reseta quando mudamos de tarefa ou modo via Sidebar/Store
    useEffect(() => {
        if (!isTransitioning) {
            const newTotalTime = mode === 'work' ? (safeSettings.pomodoroWork || 25) * 60 : (mode === 'long_break' ? (safeSettings.pomodoroLongBreak || 15) * 60 : (safeSettings.pomodoroBreak || 5) * 60);

            // Só resetamos se não estiver a correr ou se a tarefa mudou completamente
            const taskChanged = activeSubject?.taskId !== stateRefs.current.lastTaskId;
            if (!stateRefs.current.isRunning || taskChanged) {
                // 🛡️ [FIX-SET-STATE] Direct state update inside effect is safe; removed setTimeout to prevent
                // orphaned state updates if the component unmounts before the 0ms timer fires.
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
    }, [activeSubject?.taskId, mode, safeSettings, isTransitioning]);



    // 🛡️ [SHIELD-SYNC-DOM] Sincronização Forçada do DOM (B-14 FIX)
    // Garante que as barras tenham o tamanho correto ao carregar ou trocar de fase, 
    // mesmo que o cronómetro esteja parado (loop RAF inativo).
    React.useLayoutEffect(() => {
        if (!isMountedRef.current) return;

        // O LayoutEffect repara a IU para o momento zero de uma nova fase.
        // O requestAnimationFrame (no outro hook) lidará com as interpolações da barra de 100% a 0%.
        const currentMode = mode;
        const currentSessions = sessions;

        // Sincroniza as barras de trabalho (bottom)
        workFillsRef.current.forEach((el, i) => {
            if (!el) return;
            if (i < currentSessions - 1 || (i === currentSessions - 1 && currentMode !== 'work')) {
                el.style.width = '100%';
            } else if (i === currentSessions - 1 && currentMode === 'work') {
                el.style.width = '0%';
            } else {
                el.style.width = '0%';
            }
        });

        // Sincroniza as bolas de pausa (bottom)
        breakBallsRef.current.forEach((el, i) => {
            if (!el) return;
            if (i < currentSessions - 1) {
                el.style.height = '100%';
            } else if (i === currentSessions - 1 && (currentMode === 'break' || currentMode === 'long_break')) {
                el.style.height = '0%';
            } else {
                el.style.height = '0%';
            }
        });

        // 🛡️ [FIX-CIRCLE-SYNC] Sincroniza também a barra circular do relógio
        if (svgCircleRef.current) {
            svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);
        }
    }, [mode, sessions, targetCycles, safeSettings.pomodoroWork, safeSettings.pomodoroBreak, safeSettings.pomodoroLongBreak]);

    const [uiPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroPosition');
            return saved !== null ? JSON.parse(saved) : { x: 0, y: 0 };
        } catch (error) {
            console.warn('[Shield] Failed to load UI position:', error);
            return { x: 0, y: 0 };
        }
    });

    // 🛡️ [SHIELD-04] Persistência de UI
    useEffect(() => {
        try { localStorage.setItem('pomodoroLayoutLocked', JSON.stringify(isLayoutLocked)); } catch (error) {
            console.error('Failed to save pomodoroLayoutLocked:', error);
        }
    }, [isLayoutLocked]);

    useEffect(() => {
        try { localStorage.setItem('pomodoroPosition', JSON.stringify(uiPosition)); } catch (error) {
            console.error('Failed to save pomodoroPosition:', error);
        }
    }, [uiPosition]);


    // Sincronização Multi-Aba Robusta (Protocolo V2) delegada para o Hook Customizado
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

    // Fallback de segurança: O storage event é opcional quando o BroadcastChannel está ativo, 
    // mas pode ser útil se o utilizador abrir o dashboard num navegador muito antigo.
    // No entanto, para evitar duplicação de eventos, mantemos apenas o canal principal.

    // B-05 FIX: Cleanup do áudio para evitar memory leak
    useEffect(() => {
        try { alarmAudioRef.current = new Audio('/sounds/alarm.wav'); } catch (error) {
            console.error('Failed to load alarm audio:', error);
        }
        return () => {
            if (alarmAudioRef.current) {
                try {
                    alarmAudioRef.current.pause();
                    alarmAudioRef.current.src = '';
                } catch (error) {
                    console.error('Failed to cleanup alarm audio:', error);
                }
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

    const transitionSession = useCallback((completedMode, source = 'natural') => {
        // BUG-10 FIX: Usar ref para guard — imune a closure stale
        if (isTransitioningRef.current) return;
        isTransitioningRef.current = true;
        setIsTransitioning(true);

        setIsRunning(false);
        stateRefs.current.isRunning = false;

        const isManual = source !== 'natural';

        // Em transitionSession, mude de `!isMuted` para `!isMutedRef.current`
        if (source === 'natural' && safeSettings.soundEnabled && !isMutedRef.current) {
            try { 
                const playPromise = alarmAudioRef.current?.play();
                if (playPromise !== undefined) {
                    playPromise.catch((error) => {
                        console.warn('[Audio] O navegador bloqueou o alarme (Autoplay Policy):', error);
                    });
                }
            } catch (error) {
                console.error('Critical failure playing alarm:', error);
            }
        }

        const currentSessions = stateRefs.current.sessions;
        const currentTarget = stateRefs.current.targetCycles;
        // 🛡️ [FIX-SKIP-TIME] Separamos "última sessão de trabalho" de "conclusão natural":
        // o tempo deve ser salvo em ambos os casos (natural + skip), mas a callback de ciclo
        // completo (que auto-completa tarefa e avança queue neural) só dispara no natural.
        const isLastWorkSession = currentSessions >= currentTarget && stateRefs.current.mode === 'work';
        const isEndingCycle = isLastWorkSession && (source === 'natural' || source === 'skip');

        let sessionMinutes = 0;
        if (completedMode === 'work') {
            if (!isManual) {
                sessionMinutes = Number((safeSettings.pomodoroWork || 25).toFixed(2));
            } else if (source === 'skip') {
                // Regra UX: ao pular o último bloco de foco, conta o ciclo completo para avançar a fila.
                if (isLastWorkSession) {
                    sessionMinutes = Number((safeSettings.pomodoroWork || 25).toFixed(2));
                } else {
                    const totalWorkSeconds = safeSettings.pomodoroWork * 60;
                    sessionMinutes = Number((Math.max(0, totalWorkSeconds - stateRefs.current.timeLeft) / 60).toFixed(2));
                }
            }
        }

        // BUG-3 FIX: Ler accumulatedMinutes ANTES de chamar completePomodoroPhase,
        // pois o slice pode zerar o valor durante a transição (ex: targetCycles===1).
        const safeSessionMinutes = Number.isFinite(sessionMinutes) ? sessionMinutes : 0;
        const currentAccumulated = Number.isFinite(stateRefs.current.accumulatedMinutes) ? stateRefs.current.accumulatedMinutes : 0;
        // BUG-4 FIX: Só acumula minutos anteriores se estamos finalizando um bloco de trabalho.
        // Em skip de pausa, currentAccumulated contém minutos já reportados — não re-somar.
        const finalMinutes = completedMode === 'work'
            ? Number((currentAccumulated + safeSessionMinutes).toFixed(2))
            : 0;

        const targetSubject = activeSubjectRef.current;

        if (isLastWorkSession && targetSubject) {
            safeOnUpdateStudyTime(targetSubject.categoryId, finalMinutes, targetSubject.taskId);
        }

        transitionTimeoutRef.current = setTimeout(() => {
            // 🟢 CÓDIGO NOVO 3: Proteção contra desmontagem súbita (Race Condition Fix)
            if (!isMountedRef.current || !clockRef.current) {
                setIsTransitioning(false);
                transitionTimeoutRef.current = null;
                return; // Aborta a atualização visual se o componente já não existe
            }

            // Passamos os minutos trabalhados para o Store persistir
            completePomodoroPhase(isManual, sessionMinutes);

            if (typeof onSessionComplete === 'function') onSessionComplete();

            const newState = useAppStore.getState().appState.pomodoro;
            const resetTime = newState.mode === 'work' ? safeSettings.pomodoroWork * 60 : (newState.mode === 'long_break' ? safeSettings.pomodoroLongBreak * 60 : safeSettings.pomodoroBreak * 60);

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
                syncChannel?.postMessage({ type: isManual ? 'PHASE_SKIP' : 'PHASE_COMPLETE', toMode: newState.mode, tabId: STABLE_TAB_ID });
            } catch (error) {
                console.error('Failed to post PHASE message:', error);
            }

            setIsTransitioning(false);
            isTransitioningRef.current = false;

            if (isEndingCycle) {
                // B-08 FIX: Passar flag de conclusão natural
                safeOnFullCycleComplete(finalMinutes, source === 'natural');
            }
        }, 50);
    }, [safeSettings, completePomodoroPhase, savePomodoroState, safeOnUpdateStudyTime, safeOnFullCycleComplete, onSessionComplete, syncChannel]);

    // Motor de Animação Blindado e Otimizado (Resiliente a Abas em Segundo Plano)
    // O loop só roda quando isRunning é true, poupando CPU/GPU significativamente.
    // Usa âncora absoluta e alterna para setTimeout quando a aba está oculta para evitar congelamento.
    useEffect(() => {
        if (!isRunning) return;

        let rafId;
        let timeoutId;
        const startTime = performance.now();
        const startLeft = stateRefs.current.timeLeft;

        const tick = () => {
            const now = performance.now();
            // Cálculo de tempo decorrido com base na âncora absoluta, imune a congelamentos de rAF
            const elapsedSeconds = ((now - startTime) / 1000) * (speedRef.current || 1);
            const oldTime = stateRefs.current.timeLeft;
            const newTime = Math.max(0, startLeft - elapsedSeconds);
            stateRefs.current.timeLeft = newTime;

            const currentTotalTime = stateRefs.current.mode === 'work'
                ? (safeSettings.pomodoroWork || 25) * 60
                : stateRefs.current.mode === 'long_break'
                    ? (safeSettings.pomodoroLongBreak || 15) * 60
                    : (safeSettings.pomodoroBreak || 5) * 60;

            const fraction = newTime / (currentTotalTime || 1);
            const displaySecond = Math.ceil(newTime);
 
            // 🛡️ [SHIELD-DESYNC-FIX] Sincroniza o estado do React apenas na mudança de segundo inteiro
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

            if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE * fraction;

            const s = stateRefs.current.sessions;
            if (stateRefs.current.mode === 'work') {
                const workEl = workFillsRef.current[s - 1];
                if (workEl) workEl.style.width = `${Math.max(0, Math.min(100, (1 - fraction) * 100))}%`;
            } else {
                const breakEl = breakBallsRef.current[s - 1];
                if (breakEl) breakEl.style.height = `${Math.max(0, Math.min(100, (1 - fraction) * 100))}%`;
            }

            if (newTime <= 0) {
                transitionSession(stateRefs.current.mode, 'natural');
            } else {
                if (document.hidden) {
                    // Quando a aba está oculta, agenda via setTimeout para evitar suspensão
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

        // Inicia a execução do loop
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
    // BUG-7 FIX CORRECTION: 'speed' MUST be in the dependencies.
    // If the speed changes, we must reset the time anchor (startTime),
    // otherwise the total elapsed time will be multiplied by the new speed, causing huge time jumps.
    }, [isRunning, safeSettings, transitionSession, speed]);

    const reset = () => {
        if (isTransitioningRef.current) return;
        if (alarmAudioRef.current) { try { alarmAudioRef.current.pause(); alarmAudioRef.current.currentTime = 0; } catch (error) {
            console.error('Failed to reset alarm audio:', error);
        } }

        const currentMode = stateRefs.current.mode;
        const currentSessions = stateRefs.current.sessions;
        const currentTimeLeft = stateRefs.current.timeLeft;
        const currentTotalTime = currentMode === 'work' ? safeSettings.pomodoroWork * 60 : (currentMode === 'long_break' ? safeSettings.pomodoroLongBreak * 60 : safeSettings.pomodoroBreak * 60);

        // SE O TEMPO JÁ ESTIVER CHEIO: Volta de fase
        if (currentTimeLeft >= currentTotalTime - 0.5) {
            showToast('Voltando fase...', 'info');

            // Retrocesso no estado global
            rewindPomodoroPhase();

            const newState = useAppStore.getState().appState.pomodoro;
            const resetTime = newState.mode === 'work' ? safeSettings.pomodoroWork * 60 : (newState.mode === 'long_break' ? safeSettings.pomodoroLongBreak * 60 : safeSettings.pomodoroBreak * 60);

            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = newState.mode;
            stateRefs.current.isRunning = false;

            setIsRunning(false);
            setTimeLeft(resetTime);

            // Limpeza visual de todas as fases futuras para garantir sincronia
            workFillsRef.current.forEach((el, i) => {
                if (el) el.style.width = (i < newState.sessions - 1 || (i === newState.sessions - 1 && (newState.mode === 'break' || newState.mode === 'long_break'))) ? '100%' : '0%';
            });
            breakBallsRef.current.forEach((el, i) => {
                if (el) el.style.height = (i < newState.sessions - 1) ? '100%' : '0%';
            });

            if (clockRef.current) clockRef.current.textContent = formatTime(resetTime);
            if (svgCircleRef.current) svgCircleRef.current.style.strokeDashoffset = (2 * Math.PI * 110);

            savePomodoroState({ isRunning: false, timeLeft: resetTime, mode: newState.mode });
            try { syncChannel?.postMessage({ type: 'PHASE_REWIND', toMode: newState.mode, tabId: STABLE_TAB_ID }); } catch (error) {
                console.error('Failed to post PHASE_REWIND message:', error);
            }

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
            try { syncChannel?.postMessage({ type: 'TIMER_RESET', tabId: STABLE_TAB_ID }); } catch (error) {
                console.error('Failed to post TIMER_RESET message:', error);
            }
        }
    };

    const skip = () => {
        if (isTransitioningRef.current) return;
        if (alarmAudioRef.current) { try { alarmAudioRef.current.pause(); alarmAudioRef.current.currentTime = 0; } catch (error) {
            console.error('Failed to reset alarm audio on skip:', error);
        } }

        // B-10 FIX: Usar refs para evitar estado "stale" do React durante skip
        const s = stateRefs.current.sessions;
        const currentMode = stateRefs.current.mode;

        if (currentMode === 'work') {
            if (workFillsRef.current[s - 1]) workFillsRef.current[s - 1].style.width = '100%';
        } else {
            const breakEl = breakBallsRef.current[s - 1];
            if (breakEl) breakEl.style.height = '100%';
        }

        transitionSession(currentMode, 'skip');
    };

    const togglePlay = useCallback(() => {
        if (!activeSubject) return;

        if (alarmAudioRef.current && alarmAudioRef.current.paused && alarmAudioRef.current.currentTime === 0) {
            alarmAudioRef.current.volume = 0;
            alarmAudioRef.current.play().then(() => {
                alarmAudioRef.current?.pause();
                if (alarmAudioRef.current) {
                    alarmAudioRef.current.currentTime = 0;
                    alarmAudioRef.current.volume = 1;
                }
            }).catch(err => console.debug('Audio play skipped:', err));
        }

        const next = !isRunning;
        stateRefs.current.isRunning = next;
        setIsRunning(next);

        if (!next) {
            setTimeLeft(stateRefs.current.timeLeft);
        }

        try {
            syncChannel?.postMessage({
                type: next ? 'START_SESSION' : 'PAUSE_SESSION',
                timeLeft: stateRefs.current.timeLeft,
                tabId: STABLE_TAB_ID
            });
        } catch (error) {
            console.error('Failed to post session status message:', error);
        }
    }, [activeSubject, isRunning, syncChannel]);

    const handleManualExit = () => {
        // Botão vermelho (estado inativo): apenas voltar ao Dashboard, sem processamento extra.
        safeOnExit({ forceDashboard: true, source: 'dashboard' });
    };

    const totalTime = mode === 'work' ? safeSettings.pomodoroWork * 60 : (mode === 'long_break' ? safeSettings.pomodoroLongBreak * 60 : safeSettings.pomodoroBreak * 60);
    const isProtocolInactive = !activeSubject;

    return (
        <div className="w-full relative min-h-[80vh] flex flex-col items-center">
            <div
                className={`w-full max-w-none lg:max-w-[min(95vw,600px)] space-y-12 relative flex flex-col items-center mx-auto ${!isLayoutLocked ? 'z-[90]' : 'z-50'}`}
            >
                <div className="relative flex items-center justify-center py-2 w-full px-4">
                    <PomodoroHeader 
                        mode={mode} 
                        activeSubject={activeSubject} 
                        onManualExit={handleManualExit} 
                    />
                </div>

                <div className="w-full flex justify-end px-4 -mb-8 relative z-50">
                     <button 
                        onClick={toggleMute}
                        className="p-3 bg-slate-900/40 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl backdrop-blur-md group"
                        title={isMuted ? "Ativar Áudio" : "Mudar para Silencioso"}
                    >
                        {isMuted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} className="text-emerald-400" />}
                    </button>
                </div>

                <div
                    style={{ backgroundImage: 'url(/wood-texture.png)', backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)' }}
                    className="w-full border-y-[6px] border-x-0 sm:border-[6px] border-[#3f2e26] pt-32 pb-16 px-4 sm:px-10 rounded-3xl sm:rounded-3xl relative overflow-hidden flex flex-col items-center bg-[#2a1f1a] shadow-2xl z-10"
                >
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
                    />

                    <PomodoroControls
                        isProtocolInactive={isProtocolInactive}
                        isRunning={isRunning}
                        onReset={reset}
                        onTogglePlay={togglePlay}
                        onSkip={skip}
                    />

                    {/* Botão de Abandono Crítico */}
                    {!isProtocolInactive && (
                        <div className="w-full max-w-xs mt-8 pt-4 border-t border-white/5">
                            <button
                                onClick={() => {
                                    if (window.confirm("Deseja realmente abandonar a sessão? O progresso não salvo será perdido.")) {
                                        handleManualExit();
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-3 p-3 bg-red-950/20 hover:bg-red-900/40 border border-red-500/20 rounded-2xl transition-all text-xs font-bold text-red-400 group"
                            >
                                <RotateCcw size={14} className="text-red-500 group-hover:rotate-[-90deg] transition-transform" />
                                ABORTAR SESSÃO
                            </button>
                        </div>
                    )}
                </div>

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
