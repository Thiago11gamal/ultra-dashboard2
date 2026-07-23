import { useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';

/**
 * useIdleLogout Hook
 * Logs out the user after a specified period of inactivity.
 * 
 * @param {Function} logout - The logout function to call.
 * @param {number} timeoutMs - Inactivity timeout in milliseconds.
 */
export default function useIdleLogout(logout, timeoutMs = 60 * 60 * 1000) {
    const timerRef = useRef(null);
    const logoutRef = useRef(logout);
    const lastActivityRef = useRef(0);

    // LEAK-06 FIX: Keep logout function updated in a ref to avoid resetTimer dependency
    useEffect(() => {
        logoutRef.current = logout;
    }, [logout]);

    const resetTimer = useCallback(() => {
        const now = Date.now();
        lastActivityRef.current = now;
        try {
            localStorage.setItem('ultra-last-activity', now.toString());
        } catch (e) {
            console.debug('[IdleLogout] localStorage.setItem failed:', e.message);
        }
        
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            logger.log('[IdleLogout] Inatividade detectada. Deslogando...');
            if (logoutRef.current) logoutRef.current();
        }, timeoutMs);
    }, [timeoutMs]);

    useEffect(() => {
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

        // Initial set
        resetTimer();

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
                        if (storedTime > lastAct) lastAct = storedTime;
                    }
                } catch (e) {
                    console.debug('[IdleLogout] localStorage.getItem failed:', e.message);
                }

                const elapsed = Date.now() - lastAct;
                if (elapsed >= timeoutMs) {
                    logger.log('[IdleLogout] Aba voltou ao foco e o tempo estava expirado. Deslogando...');
                    if (logoutRef.current) logoutRef.current();
                } else {
                    lastActivityRef.current = lastAct; // Sync ref with storage
                    resetTimer();
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
    }, [resetTimer, timeoutMs]);
}
