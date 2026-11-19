import { useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';
import { useAppStore } from '../store/useAppStore';

/**
 * useIdleLogout Hook
 * Logs out the user after a specified period of inactivity.
 * 
 * @param {Function} logout - The logout function to call.
 * @param {number} timeoutMs - Inactivity timeout in milliseconds.
 */
export default function useIdleLogout(logout, timeoutMs = 60 * 60 * 1000, enabled = true) {
    const safeTimeout = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0 ? Number(timeoutMs) : 60 * 60 * 1000;
    const timerRef = useRef(null);
    const logoutRef = useRef(logout);
    const lastActivityRef = useRef(0);

    // LEAK-06 FIX: Keep logout function updated in a ref to avoid resetTimer dependency
    useEffect(() => {
        logoutRef.current = logout;
    }, [logout]);

    const resetTimerRef = useRef(null);

    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // G-14 FIX: Reduzir throttle para 500ms para não perder atividade
    // legítima em timeouts curtos.
    const THROTTLE_MS = 500;

    const resetTimer = useCallback((force = false, customTimeoutMs = null, activityTimestamp = null) => {
        if (!enabled) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            return;
        }
        const now = Date.now();
        const isForced = force === true;
        // Skip if called within throttle window (mousemove fires 60-120x/sec), unless forced
        if (!isForced && now - lastActivityRef.current < THROTTLE_MS) return;
        const effectiveActivityTime = (Number.isFinite(Number(activityTimestamp)) && Number(activityTimestamp) > 0)
            ? Number(activityTimestamp)
            : now;
        lastActivityRef.current = effectiveActivityTime;
        if (customTimeoutMs == null) {
            try {
                localStorage.setItem('ultra-last-activity', effectiveActivityTime.toString());
            } catch (e) {
                console.debug('[IdleLogout] localStorage.setItem failed:', e.message);
            }
        }

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        const nextDelay = (Number.isFinite(Number(customTimeoutMs)) && Number(customTimeoutMs) > 0)
            ? Number(customTimeoutMs)
            : safeTimeout;
        timerRef.current = setTimeout(() => {
            if (!isMounted.current || !enabled) return;
            try {
                const stored = localStorage.getItem('ultra-last-activity');
                if (stored) {
                    const storedTime = parseInt(stored, 10);
                    if (Number.isFinite(storedTime) && storedTime > lastActivityRef.current) {
                        const remaining = safeTimeout - (Date.now() - storedTime);
                        if (remaining > 0) {
                            lastActivityRef.current = storedTime;
                            if (typeof resetTimerRef.current === 'function') resetTimerRef.current(true, remaining, storedTime);
                            return;
                        }
                    }
                }
            } catch { /* ignore */ }
            try {
                const pomodoroActive = useAppStore.getState()?.appState?.pomodoro?.activeSubject;
                if (pomodoroActive) {
                    logger.log('[IdleLogout] Pomodoro ativo — adiando logout.');
                    if (typeof resetTimerRef.current === 'function') resetTimerRef.current(true);
                    return;
                }
            } catch { /* se falhar, prossegue com logout */ }
            if (!isMounted.current || !enabled) return;
            logger.log('[IdleLogout] Inatividade detectada. Deslogando...');
            if (typeof logoutRef.current === 'function') logoutRef.current();
        }, nextDelay);
    }, [safeTimeout, enabled]);

    useEffect(() => {
        resetTimerRef.current = resetTimer;
    }, [resetTimer]);

    useEffect(() => {
        if (!enabled) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            return undefined;
        }
        // BUG-25 FIX: Removed unused effectiveTimeout variable

        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // FIX: Initialize lastActivity on mount (not during render to preserve purity)
        if (!lastActivityRef.current) lastActivityRef.current = Date.now();

        // Initial set - force scheduling the initial timer on mount
        resetTimer(true);

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // ✅ FIX: Computar tempo real ao voltar do background cruzando com localStorage
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                let lastAct = lastActivityRef.current || Date.now();
                try {
                    const stored = localStorage.getItem('ultra-last-activity');
                    if (stored) {
                        const storedTime = parseInt(stored, 10);
                        // ✅ FIX: Validar que o valor é um número finito
                        if (Number.isFinite(storedTime) && storedTime > 0 && storedTime > lastAct) {
                            lastAct = storedTime;
                        }
                    }
                } catch (e) {
                    console.debug('[IdleLogout] localStorage.getItem failed:', e.message);
                }

                const elapsed = Date.now() - lastAct;
                if (elapsed >= safeTimeout) {
                    try {
                        const pomodoroActive = useAppStore.getState()?.appState?.pomodoro?.activeSubject;
                        if (pomodoroActive) {
                            logger.log('[IdleLogout] Pomodoro ativo ao retornar à aba — adiando logout.');
                            lastActivityRef.current = Date.now();
                            resetTimer(true);
                            return;
                        }
                    } catch { /* se falhar, prossegue com logout */ }
                    logger.log('[IdleLogout] Aba voltou ao foco e o tempo estava expirado. Deslogando...');
                    if (typeof logoutRef.current === 'function') logoutRef.current();
                } else {
                    lastActivityRef.current = lastAct; // Sync ref with storage
                    resetTimer(true);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            // Cleanup on unmount
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [resetTimer, safeTimeout, enabled]);
}

