import { useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';

/**
 * useIdleLogout Hook
 * Logs out the user after a specified period of inactivity.
 * 
 * @param {Function} logout - The logout function to call.
 * @param {number} timeoutMs - Inactivity timeout in milliseconds.
 */
export default function useIdleLogout(logout, timeoutMs = 20 * 60 * 1000) {
    const timerRef = useRef(null);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            logger.log('[IdleLogout] Inatividade detectada. Deslogando...');
            logout();
        }, timeoutMs);
    }, [logout, timeoutMs]);

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

        // Initial set
        resetTimer();

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            // Cleanup on unmount
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [resetTimer]);
}
